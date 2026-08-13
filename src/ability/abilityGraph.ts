import type {
  AbilityState,
  DependencyEdge,
  LearningPhase,
  NodeDisplayState,
  SkillNode,
  SkillTree
} from './types';

function assertUniqueIds(items: Array<{ id: string }>, label: string): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (!item.id || seen.has(item.id)) throw new Error(`${label} ID 必须唯一`);
    seen.add(item.id);
  }
}

function requireTree(state: AbilityState, treeId: string): SkillTree {
  const tree = state.trees.find((item) => item.id === treeId);
  if (!tree) throw new Error('技能树引用不存在');
  return tree;
}

function requireNode(state: AbilityState, nodeId: string): SkillNode {
  const node = state.nodes.find((item) => item.id === nodeId);
  if (!node) throw new Error('技能节点引用不存在');
  return node;
}

export function getPrerequisiteNodes(state: AbilityState, nodeId: string): SkillNode[] {
  const ids = state.dependencies
    .filter((edge) => edge.dependentNodeId === nodeId)
    .map((edge) => edge.prerequisiteNodeId);
  return ids.map((id) => requireNode(state, id));
}

export function getDependencyKind(
  state: AbilityState,
  edge: DependencyEdge
): 'primary' | 'auxiliary' {
  if (edge.kind) return edge.kind;
  const firstInbound = state.dependencies.find((item) => item.dependentNodeId === edge.dependentNodeId);
  return firstInbound?.id === edge.id ? 'primary' : 'auxiliary';
}

export function getPrimaryParent(state: AbilityState, nodeId: string): SkillNode | null {
  const edge = state.dependencies.find(
    (item) => item.dependentNodeId === nodeId && getDependencyKind(state, item) === 'primary'
  );
  return edge ? requireNode(state, edge.prerequisiteNodeId) : null;
}

export function getPrimaryChildren(state: AbilityState, nodeId: string): SkillNode[] {
  return state.dependencies
    .filter((edge) => edge.prerequisiteNodeId === nodeId && getDependencyKind(state, edge) === 'primary')
    .map((edge) => requireNode(state, edge.dependentNodeId));
}

export function getNodeDisplayState(node: SkillNode, state: AbilityState): NodeDisplayState {
  void state;
  return node.progress;
}

export function getNextActionCandidates(state: AbilityState, treeId: string): SkillNode[] {
  const phaseOrder = new Map(
    state.phases.filter((phase) => phase.skillTreeId === treeId).map((phase) => [phase.id, phase.order])
  );
  return state.nodes
    .filter((node) => node.skillTreeId === treeId && !node.archivedAt && node.progress !== 'mastered')
    .filter((node) => state.dependencies
      .filter((edge) => edge.dependentNodeId === node.id && getDependencyKind(state, edge) === 'primary')
      .every((edge) => requireNode(state, edge.prerequisiteNodeId).progress === 'mastered'))
    .sort((a, b) =>
      Number(b.progress === 'in_progress') - Number(a.progress === 'in_progress') ||
      (phaseOrder.get(a.phaseId) ?? 0) - (phaseOrder.get(b.phaseId) ?? 0) ||
      a.createdAt.localeCompare(b.createdAt) ||
      a.id.localeCompare(b.id)
    );
}

export type NextActionEmptyReason = 'empty_tree' | 'all_mastered' | 'prerequisites_blocked';

export function getNextActionEmptyReason(
  state: AbilityState,
  treeId: string
): NextActionEmptyReason | null {
  const nodes = state.nodes.filter((node) => node.skillTreeId === treeId && !node.archivedAt);
  if (nodes.length === 0) return 'empty_tree';
  if (nodes.every((node) => node.progress === 'mastered')) return 'all_mastered';
  return getNextActionCandidates(state, treeId).length === 0 ? 'prerequisites_blocked' : null;
}

export function hasPrerequisiteWarning(node: SkillNode, state: AbilityState): boolean {
  return node.progress !== 'available' &&
    getPrerequisiteNodes(state, node.id).some((item) => item.progress !== 'mastered');
}

function assertAcyclic(state: AbilityState, treeId: string): void {
  const treeNodeIds = new Set(state.nodes.filter((node) => node.skillTreeId === treeId).map((node) => node.id));
  const nextByNode = new Map<string, string[]>();
  for (const id of treeNodeIds) nextByNode.set(id, []);
  for (const edge of state.dependencies.filter((item) => item.skillTreeId === treeId)) {
    nextByNode.get(edge.prerequisiteNodeId)?.push(edge.dependentNodeId);
  }
  const colors = new Map<string, 'visiting' | 'done'>();
  const visit = (id: string): void => {
    if (colors.get(id) === 'visiting') throw new Error('技能树不能包含循环依赖');
    if (colors.get(id) === 'done') return;
    colors.set(id, 'visiting');
    for (const nextId of nextByNode.get(id) ?? []) visit(nextId);
    colors.set(id, 'done');
  };
  for (const id of treeNodeIds) visit(id);
}

export function validateAbilityState(state: AbilityState): void {
  if (state.schemaVersion !== 2) throw new Error('不支持的能力数据版本');
  assertUniqueIds(state.trees, '技能树');
  assertUniqueIds(state.phases, '学习阶段');
  assertUniqueIds(state.nodes, '技能节点');
  assertUniqueIds(state.dependencies, '依赖关系');
  assertUniqueIds(state.parallelGroups, '并行分组');
  assertUniqueIds(state.masteryCriteria, '掌握标准');
  assertUniqueIds(state.taskLinks, '任务链接');
  assertUniqueIds(state.outcomes, '成果');
  assertUniqueIds(state.resources, '学习资源');
  assertUniqueIds(state.resourceLinks, '资源关联');

  for (const phase of state.phases) requireTree(state, phase.skillTreeId);
  for (const node of state.nodes) {
    requireTree(state, node.skillTreeId);
    const phase = state.phases.find((item) => item.id === node.phaseId);
    if (!phase || phase.skillTreeId !== node.skillTreeId) throw new Error('技能节点阶段引用无效');
  }

  const edgeKeys = new Set<string>();
  for (const edge of state.dependencies) {
    const prerequisite = requireNode(state, edge.prerequisiteNodeId);
    const dependent = requireNode(state, edge.dependentNodeId);
    if (prerequisite.id === dependent.id) throw new Error('技能节点不能依赖自身');
    if (prerequisite.skillTreeId !== dependent.skillTreeId || edge.skillTreeId !== dependent.skillTreeId) {
      throw new Error('依赖关系不能跨技能树');
    }
    const key = `${edge.prerequisiteNodeId}:${edge.dependentNodeId}`;
    if (edgeKeys.has(key)) throw new Error('不能重复添加相同依赖');
    edgeKeys.add(key);
  }

  for (const node of state.nodes) {
    const primaryParents = state.dependencies.filter(
      (edge) => edge.dependentNodeId === node.id && getDependencyKind(state, edge) === 'primary'
    );
    if (primaryParents.length > 1) throw new Error('技能节点只能有一个主父级');
  }

  const groupedNodes = new Set<string>();
  for (const group of state.parallelGroups) {
    requireTree(state, group.skillTreeId);
    const phase = state.phases.find((item) => item.id === group.phaseId);
    if (!phase || phase.skillTreeId !== group.skillTreeId) throw new Error('并行分组阶段引用无效');
    for (const nodeId of group.nodeIds) {
      const node = requireNode(state, nodeId);
      if (node.skillTreeId !== group.skillTreeId) {
        throw new Error('并行节点必须属于同一技能树');
      }
      const membershipKey = `${group.skillTreeId}:${nodeId}`;
      if (groupedNodes.has(membershipKey)) throw new Error('节点只能属于一个并行分组');
      groupedNodes.add(membershipKey);
    }
    if (group.parentNodeId) requireNode(state, group.parentNodeId);
    if (group.continuationNodeId) requireNode(state, group.continuationNodeId);
  }

  for (const criterion of state.masteryCriteria) requireNode(state, criterion.skillNodeId);
  for (const link of state.taskLinks) requireNode(state, link.skillNodeId);
  for (const outcome of state.outcomes) {
    requireTree(state, outcome.skillTreeId);
    if (outcome.skillNodeId) {
      const node = requireNode(state, outcome.skillNodeId);
      if (node.skillTreeId !== outcome.skillTreeId) throw new Error('成果关联节点必须属于同一技能树');
    }
  }
  const normalizedUrls = new Set<string>();
  for (const resource of state.resources) {
    if (!resource.normalizedUrl || normalizedUrls.has(resource.normalizedUrl)) throw new Error('学习资源 URL 必须唯一');
    normalizedUrls.add(resource.normalizedUrl);
  }
  const resourceLinkKeys = new Set<string>();
  for (const link of state.resourceLinks) {
    requireNode(state, link.skillNodeId);
    if (!state.resources.some((resource) => resource.id === link.resourceId)) throw new Error('资源关联引用了不存在的学习资源');
    const key = `${link.skillNodeId}:${link.resourceId}`;
    if (resourceLinkKeys.has(key)) throw new Error('同一节点不能重复关联资源');
    resourceLinkKeys.add(key);
  }
  if (state.lastVisitedTreeId && !state.trees.some((tree) => tree.id === state.lastVisitedTreeId)) {
    throw new Error('最近访问技能树不存在');
  }
  for (const tree of state.trees) assertAcyclic(state, tree.id);
}

export function assertDependencyAllowed(
  state: AbilityState,
  edge: Omit<DependencyEdge, 'id'>
): void {
  validateAbilityState({
    ...state,
    dependencies: [...state.dependencies, { ...edge, id: '__candidate_dependency__' }]
  });
}

export function getTransitiveDependents(state: AbilityState, nodeId: string): string[] {
  requireNode(state, nodeId);
  const result: string[] = [];
  const seen = new Set<string>([nodeId]);
  const queue = [nodeId];
  while (queue.length) {
    const current = queue.shift() as string;
    const nextIds = state.dependencies
      .filter((edge) => edge.prerequisiteNodeId === current)
      .map((edge) => edge.dependentNodeId)
      .sort();
    for (const nextId of nextIds) {
      if (seen.has(nextId)) continue;
      seen.add(nextId);
      result.push(nextId);
      queue.push(nextId);
    }
  }
  return result;
}

export function getTreeProgress(state: AbilityState, treeId: string): {
  total: number;
  mastered: number;
  inProgress: number;
  percent: number;
} {
  const nodes = state.nodes.filter((node) => node.skillTreeId === treeId && !node.archivedAt);
  const mastered = nodes.filter((node) => node.progress === 'mastered').length;
  const inProgress = nodes.filter((node) => node.progress === 'in_progress').length;
  return {
    total: nodes.length,
    mastered,
    inProgress,
    percent: nodes.length ? Math.round((mastered / nodes.length) * 100) : 0
  };
}

export function getPhaseProgress(state: AbilityState, phaseId: string): {
  mastered: number;
  required: number;
  complete: boolean;
} {
  const requiredNodes = state.nodes.filter(
    (node) => node.phaseId === phaseId && node.requiredForPhase && !node.archivedAt
  );
  const mastered = requiredNodes.filter((node) => node.progress === 'mastered').length;
  return {
    mastered,
    required: requiredNodes.length,
    complete: mastered === requiredNodes.length
  };
}

export function getCurrentPhase(state: AbilityState, treeId: string): LearningPhase | null {
  const phases = state.phases
    .filter((phase) => phase.skillTreeId === treeId)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  return phases.find((phase) => !getPhaseProgress(state, phase.id).complete) ?? phases[phases.length - 1] ?? null;
}

export function selectDefaultTree(state: AbilityState): SkillTree | null {
  const activeTrees = state.trees.filter((tree) => tree.status === 'active');
  const visitedFocused = activeTrees.find(
    (tree) => tree.id === state.lastVisitedTreeId && tree.focusedRank !== null
  );
  if (visitedFocused) return visitedFocused;
  const focused = activeTrees
    .filter((tree) => tree.focusedRank !== null)
    .sort((a, b) => (a.focusedRank as number) - (b.focusedRank as number) || a.id.localeCompare(b.id));
  if (focused.length) return focused[0];
  return activeTrees.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id))[0] ?? null;
}
