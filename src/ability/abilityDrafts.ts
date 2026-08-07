import { validateAbilityState } from './abilityGraph';
import type {
  AbilityState,
  DraftDependency,
  SkillTreeDraft
} from './types';

export type IdFactory = (kind: string) => string;

function assertDraftIds(items: Array<{ draftId: string }>, label: string): void {
  const ids = new Set<string>();
  for (const item of items) {
    if (!item.draftId || ids.has(item.draftId)) throw new Error(`${label} ID 必须唯一`);
    ids.add(item.draftId);
  }
}

function assertDraftAcyclic(nodeIds: string[], dependencies: DraftDependency[]): void {
  const outgoing = new Map(nodeIds.map((id) => [id, [] as string[]]));
  for (const edge of dependencies) outgoing.get(edge.prerequisiteNodeDraftId)?.push(edge.dependentNodeDraftId);
  const colors = new Map<string, 'visiting' | 'done'>();
  const visit = (id: string): void => {
    if (colors.get(id) === 'visiting') throw new Error('技能树不能包含循环依赖');
    if (colors.get(id) === 'done') return;
    colors.set(id, 'visiting');
    for (const nextId of outgoing.get(id) ?? []) visit(nextId);
    colors.set(id, 'done');
  };
  for (const id of nodeIds) visit(id);
}

export function validateSkillTreeDraft(draft: SkillTreeDraft): void {
  if (!draft.tree.name.trim()) throw new Error('技能树名称不能为空');
  assertDraftIds(draft.phases, '草案阶段');
  assertDraftIds(draft.nodes, '草案节点');
  assertDraftIds(draft.dependencies, '草案依赖');
  assertDraftIds(draft.parallelGroups, '草案并行分组');
  assertDraftIds(draft.masteryCriteria, '草案掌握标准');
  assertDraftIds(draft.suggestedTasks ?? [], '建议任务');

  const phaseIds = new Set(draft.phases.map((phase) => phase.draftId));
  const nodes = new Map(draft.nodes.map((node) => [node.draftId, node]));
  for (const phase of draft.phases) {
    if (!phase.name.trim()) throw new Error('阶段名称不能为空');
  }
  for (const node of draft.nodes) {
    if (!node.name.trim()) throw new Error('节点名称不能为空');
    if (!phaseIds.has(node.phaseDraftId)) throw new Error('草案节点引用了不存在的阶段');
  }

  const edgeKeys = new Set<string>();
  for (const edge of draft.dependencies) {
    if (!nodes.has(edge.prerequisiteNodeDraftId) || !nodes.has(edge.dependentNodeDraftId)) {
      throw new Error('草案依赖引用了不存在的节点');
    }
    if (edge.prerequisiteNodeDraftId === edge.dependentNodeDraftId) throw new Error('技能节点不能依赖自身');
    const key = `${edge.prerequisiteNodeDraftId}:${edge.dependentNodeDraftId}`;
    if (edgeKeys.has(key)) throw new Error('不能重复添加相同依赖');
    edgeKeys.add(key);
  }

  const groupedNodes = new Set<string>();
  for (const group of draft.parallelGroups) {
    if (!phaseIds.has(group.phaseDraftId)) throw new Error('并行分组引用了不存在的阶段');
    for (const nodeId of group.nodeDraftIds) {
      const node = nodes.get(nodeId);
      if (!node || node.phaseDraftId !== group.phaseDraftId) throw new Error('并行节点必须属于同一阶段');
      if (groupedNodes.has(nodeId)) throw new Error('节点在同一阶段只能属于一个并行分组');
      groupedNodes.add(nodeId);
    }
  }
  for (const criterion of draft.masteryCriteria) {
    if (!nodes.has(criterion.nodeDraftId)) throw new Error('掌握标准引用了不存在的节点');
    if (!criterion.description.trim()) throw new Error('掌握标准不能为空');
  }
  for (const task of draft.suggestedTasks ?? []) {
    if (!nodes.has(task.nodeDraftId)) throw new Error('建议任务引用了不存在的节点');
    if (!task.title.trim() || !task.completionStandard.trim()) throw new Error('建议任务内容不能为空');
  }
  assertDraftAcyclic([...nodes.keys()], draft.dependencies);
}

export function applyDraft(
  state: AbilityState,
  draft: SkillTreeDraft,
  idFactory: IdFactory,
  now: string
): AbilityState {
  validateSkillTreeDraft(draft);
  const treeId = idFactory('tree');
  const phaseIds = new Map(draft.phases.map((phase) => [phase.draftId, idFactory('phase')]));
  const nodeIds = new Map(draft.nodes.map((node) => [node.draftId, idFactory('node')]));

  const tree = {
    id: treeId,
    ...draft.tree,
    name: draft.tree.name.trim(),
    description: draft.tree.description.trim(),
    createdAt: now,
    updatedAt: now
  };
  const phases = draft.phases.map((phase) => ({
    id: phaseIds.get(phase.draftId) as string,
    skillTreeId: treeId,
    name: phase.name.trim(),
    description: phase.description.trim(),
    order: phase.order
  }));
  const nodes = draft.nodes.map((node) => ({
    id: nodeIds.get(node.draftId) as string,
    skillTreeId: treeId,
    phaseId: phaseIds.get(node.phaseDraftId) as string,
    name: node.name.trim(),
    description: node.description.trim(),
    progress: node.progress,
    masteryNote: node.masteryNote.trim(),
    archivedAt: null,
    createdAt: now,
    updatedAt: now
  }));
  const dependencies = draft.dependencies.map((edge) => ({
    id: idFactory('edge'),
    skillTreeId: treeId,
    prerequisiteNodeId: nodeIds.get(edge.prerequisiteNodeDraftId) as string,
    dependentNodeId: nodeIds.get(edge.dependentNodeDraftId) as string
  }));
  const parallelGroups = draft.parallelGroups.map((group) => ({
    id: idFactory('group'),
    skillTreeId: treeId,
    phaseId: phaseIds.get(group.phaseDraftId) as string,
    name: group.name.trim(),
    nodeIds: group.nodeDraftIds.map((id) => nodeIds.get(id) as string)
  }));
  const masteryCriteria = draft.masteryCriteria.map((criterion) => ({
    id: idFactory('criterion'),
    skillNodeId: nodeIds.get(criterion.nodeDraftId) as string,
    description: criterion.description.trim(),
    satisfied: criterion.satisfied,
    source: criterion.source
  }));
  const next: AbilityState = {
    ...state,
    trees: [...state.trees, tree],
    phases: [...state.phases, ...phases],
    nodes: [...state.nodes, ...nodes],
    dependencies: [...state.dependencies, ...dependencies],
    parallelGroups: [...state.parallelGroups, ...parallelGroups],
    masteryCriteria: [...state.masteryCriteria, ...masteryCriteria],
    lastVisitedTreeId: treeId
  };
  validateAbilityState(next);
  return next;
}
