import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Link2, Plus, Unlink } from 'lucide-react';
import { NODE_STATE_LABELS } from '../abilityConfig';
import type { MasteryCriterion, NodeDisplayState, SkillNode, SkillOutcome, SkillTaskLink } from '../types';
import type { ShortTask } from '../../tasks/types';

type Props = {
  node: SkillNode | null;
  displayState: NodeDisplayState | null;
  prerequisiteWarning: boolean;
  criteria: MasteryCriterion[];
  taskLinks: SkillTaskLink[];
  tasks: ShortTask[];
  outcomes: SkillOutcome[];
  onStart: () => void;
  onAddCriterion: (description: string) => void;
  onToggleCriterion: (criterionId: string) => void;
  onConfirmMastery: (note: string) => void;
  onDemote: () => void;
  onLinkTask: (taskId: string) => void;
  onUnlinkTask: (linkId: string) => void;
  onRequestOutcome: () => void;
  onToggleOutcomeVisibility: (outcomeId: string, visible: boolean) => void;
  onEdit: () => void;
  onArchive: () => void;
};

export function AbilityNodePanel(props: Props) {
  const [criterionText, setCriterionText] = useState('');
  const [masteryNote, setMasteryNote] = useState('');
  const [taskId, setTaskId] = useState('');
  const [masteryError, setMasteryError] = useState('');
  useEffect(() => {
    setMasteryNote('');
    setMasteryError('');
  }, [props.node?.id]);
  if (!props.node || !props.displayState) {
    return <aside className="ability-node-panel ability-node-empty" aria-label="技能节点详情"><span>SELECT A SKILL</span><h2>选择一个技能节点</h2><p>查看掌握标准、关联任务和真实成果。</p></aside>;
  }
  const node = props.node;
  const linkedTaskIds = new Set(props.taskLinks.map((link) => link.taskId));
  const linkedTasks = props.taskLinks.map((link) => ({ link, task: props.tasks.find((task) => task.id === link.taskId) })).filter((item) => item.task);
  const availableTasks = props.tasks.filter((task) => !linkedTaskIds.has(task.id));
  const allSatisfied = props.criteria.length > 0 && props.criteria.every((criterion) => criterion.satisfied);
  const needsEvidence = props.criteria.length === 0 || props.criteria.some((criterion) => !criterion.satisfied);

  return <aside className="ability-node-panel" aria-label="技能节点详情">
    <header><div><small>Skill Detail</small><h2>{node.name}</h2></div><span className={`ability-state-badge state-${props.displayState}`}>{NODE_STATE_LABELS[props.displayState]}</span></header>
    <div className="ability-node-admin"><button type="button" onClick={props.onEdit}>编辑技能节点</button><button type="button" onClick={props.onArchive}>归档技能节点</button></div>
    <p>{node.description || '还没有填写技能说明。'}</p>
    {props.prerequisiteWarning ? <div className="ability-warning"><AlertTriangle size={17} />前置条件发生变化，已有进度和记录仍被保留。</div> : null}

    <section className="ability-detail-section"><div className="ability-detail-heading"><h3>掌握标准</h3><span>{props.criteria.filter((item) => item.satisfied).length}/{props.criteria.length}</span></div>
      {props.criteria.length ? <ul className="ability-criteria-list">{props.criteria.map((criterion) => <li key={criterion.id}><label><input type="checkbox" aria-label={criterion.description} checked={criterion.satisfied} onChange={() => props.onToggleCriterion(criterion.id)} /><span>{criterion.description}</span></label></li>)}</ul> : <p className="ability-muted">由你定义什么才算真正掌握。</p>}
      <div className="ability-inline-form"><input aria-label="新增掌握标准" value={criterionText} onChange={(event) => setCriterionText(event.target.value)} placeholder="例如：独立完成一个可访问网站" /><button type="button" aria-label="添加掌握标准" onClick={() => { if (!criterionText.trim()) return; props.onAddCriterion(criterionText); setCriterionText(''); }}><Plus size={16} /></button></div>
      {allSatisfied && node.progress !== 'mastered' ? <p className="ability-ready"><CheckCircle2 size={16} />标准已满足，仍需你确认掌握</p> : null}
      {props.displayState === 'available' ? <button className="ability-primary ability-wide" type="button" onClick={props.onStart}>开始学习</button> : null}
      {node.progress !== 'mastered' ? <div className="ability-mastery-confirm">
        {needsEvidence ? <label><span>掌握判断依据</span><textarea aria-label="掌握判断依据" value={masteryNote} onChange={(event) => { setMasteryNote(event.target.value); setMasteryError(''); }} placeholder="说明你已具备这项能力的依据，也可以先补充标准或成果" /></label> : null}
        {masteryError ? <p className="ability-form-error" role="alert">{masteryError}</p> : null}
        <button className="ability-primary ability-wide" type="button" onClick={() => {
          if (props.criteria.length === 0 && props.outcomes.length === 0 && !masteryNote.trim()) {
            setMasteryError('请先完成掌握标准、记录成果，或填写判断依据');
            return;
          }
          if (props.criteria.some((criterion) => !criterion.satisfied) && props.outcomes.length === 0 && !masteryNote.trim()) {
            setMasteryError('请填写提前掌握说明');
            return;
          }
          try {
            props.onConfirmMastery(masteryNote);
            setMasteryError('');
          } catch (error) {
            setMasteryError(error instanceof Error ? error.message : '暂时无法确认掌握，请检查填写内容');
          }
        }}>确认已掌握</button>
      </div> : null}
      {node.progress === 'mastered' ? <button className="ability-secondary ability-wide" type="button" onClick={props.onDemote}>退回成长中</button> : null}
    </section>

    <section className="ability-detail-section"><div className="ability-detail-heading"><h3>关联任务</h3><Link2 size={17} /></div>
      {linkedTasks.length ? <ul className="ability-linked-list">{linkedTasks.map(({ link, task }) => <li key={link.id}><span>{task?.title}</span><button type="button" aria-label={`解除任务 ${task?.title}`} onClick={() => props.onUnlinkTask(link.id)}><Unlink size={15} /></button></li>)}</ul> : <p className="ability-muted">关联任务后，可在这里查看行动参考；任务完成不会自动掌握技能。</p>}
      <div className="ability-task-linker"><select aria-label="关联现有任务" value={taskId} onChange={(event) => setTaskId(event.target.value)}><option value="">选择任务</option>{availableTasks.map((task) => <option value={task.id} key={task.id}>可关联：{task.title}</option>)}</select><button type="button" disabled={!taskId} onClick={() => { if (!taskId) return; props.onLinkTask(taskId); setTaskId(''); }}>关联任务</button></div>
    </section>

    <section className="ability-detail-section"><div className="ability-detail-heading"><h3>真实成果</h3><button type="button" onClick={props.onRequestOutcome}><Plus size={15} />记录成果</button></div>
      {props.outcomes.length ? <ul className="ability-outcome-list">{props.outcomes.map((outcome) => <li key={outcome.id}><div><strong>{outcome.title}</strong><small>{outcome.occurredOn}</small><p>{outcome.description}</p></div><label className="ability-check"><input type="checkbox" checked={outcome.showOnTree} onChange={(event) => props.onToggleOutcomeVisibility(outcome.id, event.target.checked)} />树上展示</label></li>)}</ul> : <p className="ability-muted">成果由你手动记录，先保持简单。</p>}
    </section>
  </aside>;
}
