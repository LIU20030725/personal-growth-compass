import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Plus, X } from 'lucide-react';
import { NODE_STATE_LABELS } from '../abilityConfig';
import type { MasteryCriterion, NodeDisplayState, SkillNode, SkillOutcome, SkillResource, SkillResourceLink } from '../types';
import type { SkillResourceInput } from '../abilityEngine';
import { AbilityResourceSection } from './AbilityResourceSection';

type Props = {
  node: SkillNode | null;
  editMode: boolean;
  displayState: NodeDisplayState | null;
  prerequisiteWarning: boolean;
  criteria: MasteryCriterion[];
  resources: SkillResource[];
  resourceLinks: SkillResourceLink[];
  outcomes: SkillOutcome[];
  onClose: () => void;
  onStart: () => void;
  onAddCriterion: (description: string) => void;
  onToggleCriterion: (criterionId: string) => void;
  onConfirmMastery: () => void;
  onDemote: () => void;
  onAddResource: (input: SkillResourceInput) => void;
  onLinkResource: (resourceId: string) => void;
  onUpdateResource: (resourceId: string, patch: { title: string; note: string }) => void;
  onUnlinkResource: (linkId: string) => void;
  onDeleteResource: (resourceId: string) => void;
  onRequestOutcome: () => void;
  onToggleOutcomeVisibility: (outcomeId: string, visible: boolean) => void;
  onEdit: () => void;
  onArchive: () => void;
};

export function AbilityNodePanel(props: Props) {
  const [criterionText, setCriterionText] = useState('');
  if (!props.node || !props.displayState) {
    return <aside className="ability-node-panel ability-node-empty" aria-label="技能节点详情"><span>SELECT A SKILL</span><h2>选择一个技能节点</h2><p>查看掌握标准、学习资源和真实成果。</p></aside>;
  }
  const node = props.node;
  const allSatisfied = props.criteria.length > 0 && props.criteria.every((criterion) => criterion.satisfied);
  const canMaster = allSatisfied || props.outcomes.length > 0;
  const masteryGuidance = props.criteria.length === 0 && props.outcomes.length === 0
    ? '请先添加掌握标准或记录一项成果'
    : '请先完成全部掌握标准，或记录一项真实成果';

  return <aside className="ability-node-panel" aria-label="技能节点详情">
    <header><div><small>Skill Detail</small><h2>{node.name}</h2></div><div className="ability-node-panel-heading-actions"><span className={`ability-state-badge state-${props.displayState}`}>{NODE_STATE_LABELS[props.displayState]}</span><button type="button" aria-label="关闭技能详情" onClick={props.onClose}><X size={16} /></button></div></header>
    {props.editMode ? <div className="ability-node-admin"><button type="button" onClick={props.onEdit}>编辑技能节点</button><button type="button" onClick={props.onArchive}>归档技能节点</button></div> : null}
    <p>{node.description || '还没有填写技能说明。'}</p>
    {props.prerequisiteWarning ? <div className="ability-warning"><AlertTriangle size={17} />前置条件发生变化，已有进度和记录仍被保留。</div> : null}

    <section className="ability-detail-section"><div className="ability-detail-heading"><h3>掌握标准</h3><span>{props.criteria.filter((item) => item.satisfied).length}/{props.criteria.length}</span></div>
      {props.criteria.length ? <ul className="ability-criteria-list">{props.criteria.map((criterion) => <li key={criterion.id}><label><input type="checkbox" aria-label={criterion.description} checked={criterion.satisfied} onChange={() => props.onToggleCriterion(criterion.id)} /><span>{criterion.description}</span></label></li>)}</ul> : <p className="ability-muted">由你定义什么才算真正掌握。</p>}
      <div className="ability-inline-form"><input aria-label="新增掌握标准" value={criterionText} onChange={(event) => setCriterionText(event.target.value)} placeholder="例如：独立完成一个可访问网站" /><button type="button" aria-label="添加掌握标准" onClick={() => { if (!criterionText.trim()) return; props.onAddCriterion(criterionText); setCriterionText(''); }}><Plus size={16} /></button></div>
      {allSatisfied && node.progress !== 'mastered' ? <p className="ability-ready"><CheckCircle2 size={16} />标准已满足，仍需你确认掌握</p> : null}
      {props.displayState === 'available' ? <button className="ability-primary ability-wide" type="button" onClick={props.onStart}>开始学习</button> : null}
      {node.progress === 'in_progress' ? <div className="ability-mastery-confirm">
        {!canMaster ? <p className="ability-mastery-guidance">{masteryGuidance}</p> : null}
        <button className="ability-primary ability-wide" type="button" disabled={!canMaster} onClick={props.onConfirmMastery}>确认已掌握</button>
      </div> : null}
      {node.progress === 'mastered' ? <button className="ability-secondary ability-wide" type="button" onClick={props.onDemote}>退回成长中</button> : null}
    </section>

    <AbilityResourceSection nodeId={node.id} resources={props.resources} resourceLinks={props.resourceLinks} onAdd={props.onAddResource} onLink={props.onLinkResource} onUpdate={props.onUpdateResource} onUnlink={props.onUnlinkResource} onDelete={props.onDeleteResource} />

    <section className="ability-detail-section"><div className="ability-detail-heading"><h3>真实成果</h3><button type="button" onClick={props.onRequestOutcome}><Plus size={15} />记录成果</button></div>
      {props.outcomes.length ? <ul className="ability-outcome-list">{props.outcomes.map((outcome) => <li key={outcome.id}><div><strong>{outcome.title}</strong><small>{outcome.occurredOn}</small><p>{outcome.description}</p></div><label className="ability-check"><input type="checkbox" checked={outcome.showOnTree} onChange={(event) => props.onToggleOutcomeVisibility(outcome.id, event.target.checked)} />树上展示</label></li>)}</ul> : <p className="ability-muted">成果由你手动记录，先保持简单。</p>}
    </section>
  </aside>;
}
