import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { LearningPhase, SkillNode, SkillOutcome, SkillRole } from '../types';

function DialogFrame({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const returnFocusRef = useRef<HTMLElement | null>(document.activeElement instanceof HTMLElement ? document.activeElement : null);

  useEffect(() => {
    const backdrop = dialogRef.current?.parentElement;
    const background = [...document.body.children].filter((element) => element !== backdrop) as HTMLElement[];
    const previousInert = background.map((element) => element.hasAttribute('inert'));
    background.forEach((element) => { element.inert = true; element.setAttribute('inert', ''); });
    const initial = dialogRef.current?.querySelector<HTMLElement>('[data-dialog-initial], input:not([disabled]), textarea:not([disabled]), select:not([disabled])');
    initial?.focus();
    return () => {
      background.forEach((element, index) => {
        element.inert = previousInert[index];
        if (!previousInert[index]) element.removeAttribute('inert');
      });
      const returnTarget = returnFocusRef.current;
      window.setTimeout(() => returnTarget?.focus(), 0);
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])') ?? [])];
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  return createPortal(
    <div className="ability-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="ability-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={handleKeyDown}>
        <header><div><small>Manual Builder</small><h2 id={titleId}>{title}</h2></div><button type="button" aria-label={`关闭${title}`} onClick={onClose}><X size={20} /></button></header>
        {children}
      </section>
    </div>,
    document.body
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="ability-field"><span>{label}</span>{children}</label>;
}

export function TreeFormDialog({ onClose, onSave, initial }: {
  onClose: () => void;
  onSave: (value: { name: string; description: string; role: SkillRole; focused: boolean }) => void;
  initial?: { name: string; description: string; role: SkillRole; focused: boolean };
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [role, setRole] = useState<SkillRole>(initial?.role ?? 'main');
  const [focused, setFocused] = useState(initial?.focused ?? true);
  const [error, setError] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return setError('请输入技能树名称');
    onSave({ name: name.trim(), description: description.trim(), role, focused });
  };
  return <DialogFrame title={initial ? '编辑技能树' : '创建技能树'} onClose={onClose}><form onSubmit={submit}>
    <Field label="技能树名称"><input data-dialog-initial aria-label="技能树名称" value={name} onChange={(event) => setName(event.target.value)} /></Field>
    <Field label="技能说明"><textarea aria-label="技能说明" value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
    <Field label="技能角色"><select aria-label="技能角色" value={role} onChange={(event) => setRole(event.target.value as SkillRole)}><option value="main">主技能</option><option value="side">副技能</option><option value="exploring">探索技能</option></select></Field>
    <label className="ability-check"><input type="checkbox" checked={focused} onChange={(event) => setFocused(event.target.checked)} /> 设为重点技能</label>
    {error ? <p className="ability-form-error">{error}</p> : null}
    <footer><button type="button" onClick={onClose}>取消</button><button className="ability-primary" type="submit">保存技能树</button></footer>
  </form></DialogFrame>;
}

export function PhaseFormDialog({ onClose, onSave, onDelete, deleteDisabledReason, initial }: {
  onClose: () => void;
  onSave: (value: Pick<LearningPhase, 'name' | 'description' | 'estimatedDuration' | 'plannedStartOn' | 'plannedEndOn'>) => void;
  onDelete?: () => void;
  deleteDisabledReason?: string;
  initial?: Pick<LearningPhase, 'name' | 'description' | 'estimatedDuration' | 'plannedStartOn' | 'plannedEndOn'>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [estimatedDuration, setEstimatedDuration] = useState(initial?.estimatedDuration ?? '');
  const [plannedStartOn, setPlannedStartOn] = useState(initial?.plannedStartOn ?? '');
  const [plannedEndOn, setPlannedEndOn] = useState(initial?.plannedEndOn ?? '');
  return <DialogFrame title={initial ? '编辑学习阶段' : '添加学习阶段'} onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); if (name.trim()) onSave({ name: name.trim(), description: description.trim(), estimatedDuration: estimatedDuration.trim(), plannedStartOn: plannedStartOn || undefined, plannedEndOn: plannedEndOn || undefined }); }}>
    <Field label="阶段名称"><input data-dialog-initial aria-label="阶段名称" value={name} onChange={(event) => setName(event.target.value)} /></Field>
    <Field label="阶段目标"><textarea aria-label="阶段目标" value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
    <Field label="预计时长"><input aria-label="阶段预计时长" value={estimatedDuration} onChange={(event) => setEstimatedDuration(event.target.value)} placeholder="例如：4 周" /></Field>
    <div className="ability-field-row"><Field label="计划开始"><input aria-label="阶段计划开始" type="date" value={plannedStartOn} onChange={(event) => setPlannedStartOn(event.target.value)} /></Field><Field label="计划结束"><input aria-label="阶段计划结束" type="date" value={plannedEndOn} onChange={(event) => setPlannedEndOn(event.target.value)} /></Field></div>
    {onDelete && deleteDisabledReason ? <p className="ability-form-hint">{deleteDisabledReason}</p> : null}
    <footer>{onDelete ? <button className="ability-danger" type="button" disabled={Boolean(deleteDisabledReason)} onClick={() => { if (window.confirm('确定删除这个空阶段吗？')) onDelete(); }}>删除阶段</button> : null}<span className="ability-dialog-footer-spacer" /><button type="button" onClick={onClose}>取消</button><button className="ability-primary" type="submit" disabled={!name.trim()}>保存阶段</button></footer>
  </form></DialogFrame>;
}

export function NodeFormDialog({ phases, nodes, onClose, onSave, initial, defaultPhaseId }: {
  phases: LearningPhase[];
  nodes: SkillNode[];
  onClose: () => void;
  onSave: (value: { name: string; description: string; phaseId: string; prerequisiteNodeIds: string[]; requiredForPhase: boolean }) => void;
  initial?: { nodeId: string; name: string; description: string; phaseId: string; prerequisiteNodeIds: string[]; requiredForPhase: boolean };
  defaultPhaseId?: string;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [phaseId, setPhaseId] = useState(initial?.phaseId ?? defaultPhaseId ?? phases[0]?.id ?? '');
  const [requiredForPhase, setRequiredForPhase] = useState(initial?.requiredForPhase ?? true);
  const [prerequisites, setPrerequisites] = useState<string[]>(initial?.prerequisiteNodeIds ?? []);
  const candidates = nodes.filter((node) => !node.archivedAt && node.id !== initial?.nodeId);
  const toggle = (id: string) => setPrerequisites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  return <DialogFrame title={initial ? '编辑技能节点' : '添加技能节点'} onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); if (name.trim() && phaseId) onSave({ name: name.trim(), description: description.trim(), phaseId, prerequisiteNodeIds: prerequisites, requiredForPhase }); }}>
    <Field label="节点名称"><input data-dialog-initial aria-label="节点名称" value={name} onChange={(event) => setName(event.target.value)} /></Field>
    <Field label="节点说明"><textarea aria-label="节点说明" value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
    <Field label="所属阶段"><select aria-label="所属阶段" value={phaseId} onChange={(event) => setPhaseId(event.target.value)}>{phases.map((phase) => <option value={phase.id} key={phase.id}>{phase.name}</option>)}</select></Field>
    <label className="ability-check"><input type="checkbox" checked={requiredForPhase} onChange={(event) => setRequiredForPhase(event.target.checked)} />作为阶段必修节点</label>
    <fieldset><legend>前置技能（可多选）</legend>{candidates.length ? candidates.map((node) => <label className="ability-check" key={node.id}><input type="checkbox" checked={prerequisites.includes(node.id)} onChange={() => toggle(node.id)} />{node.name}</label>) : <p>这是第一个技能节点，无需选择前置技能。</p>}</fieldset>
    <footer><button type="button" onClick={onClose}>取消</button><button className="ability-primary" type="submit" disabled={!name.trim() || !phaseId}>保存节点</button></footer>
  </form></DialogFrame>;
}

export function ParallelGroupDialog({ phases, nodes, onClose, onSave }: {
  phases: LearningPhase[];
  nodes: SkillNode[];
  onClose: () => void;
  onSave: (value: { phaseId: string; name: string; nodeIds: string[] }) => void;
}) {
  const [phaseId, setPhaseId] = useState(phases[0]?.id ?? '');
  const [name, setName] = useState('');
  const [nodeIds, setNodeIds] = useState<string[]>([]);
  const phaseNodes = nodes.filter((node) => node.phaseId === phaseId && !node.archivedAt);
  const toggle = (id: string) => setNodeIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  return <DialogFrame title="设置并行学习组" onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); if (phaseId && nodeIds.length) onSave({ phaseId, name: name.trim(), nodeIds }); }}>
    <Field label="所属阶段"><select data-dialog-initial aria-label="并行组所属阶段" value={phaseId} onChange={(event) => { setPhaseId(event.target.value); setNodeIds([]); }}>{phases.map((phase) => <option value={phase.id} key={phase.id}>{phase.name}</option>)}</select></Field>
    <Field label="分组名称"><input aria-label="并行组名称" value={name} onChange={(event) => setName(event.target.value)} /></Field>
    <fieldset><legend>可同时推进的节点</legend>{phaseNodes.map((node) => <label className="ability-check" key={node.id}><input type="checkbox" checked={nodeIds.includes(node.id)} onChange={() => toggle(node.id)} />{node.name}</label>)}</fieldset>
    <footer><button type="button" onClick={onClose}>取消</button><button className="ability-primary" type="submit" disabled={!nodeIds.length}>保存并行组</button></footer>
  </form></DialogFrame>;
}

export function OutcomeFormDialog({ nodeId, onClose, onSave }: {
  nodeId: string;
  onClose: () => void;
  onSave: (value: Pick<SkillOutcome, 'skillNodeId' | 'title' | 'description' | 'occurredOn' | 'showOnTree'>) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [occurredOn, setOccurredOn] = useState(new Date().toISOString().slice(0, 10));
  const [showOnTree, setShowOnTree] = useState(false);
  return <DialogFrame title="记录技能成果" onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); if (title.trim() && occurredOn) onSave({ title: title.trim(), description: description.trim(), occurredOn, skillNodeId: nodeId, showOnTree }); }}>
    <Field label="成果名称"><input data-dialog-initial aria-label="成果名称" value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
    <Field label="完成日期"><input aria-label="完成日期" type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} /></Field>
    <Field label="简短说明"><textarea aria-label="成果说明" value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
    <label className="ability-check"><input type="checkbox" checked={showOnTree} onChange={(event) => setShowOnTree(event.target.checked)} /> 作为重大成果展示在技能树上</label>
    <footer><button type="button" onClick={onClose}>取消</button><button className="ability-primary" type="submit" disabled={!title.trim() || !occurredOn}>保存成果</button></footer>
  </form></DialogFrame>;
}
