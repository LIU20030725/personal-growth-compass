import { getDependencyKind, getPrimaryChildren, getPrimaryParent, validateAbilityState } from './abilityGraph';
import { normalizeResourceUrl, resourceDomain } from './abilityResources';
import type {
  AbilityState,
  LearningPhase,
  ParallelGroup,
  ResourceType,
  SkillNode,
  SkillOutcome,
  SkillTree
} from './types';

export type SkillResourceInput = {
  url: string;
  title: string;
  type: ResourceType;
  note: string;
};

function valid(next: AbilityState): AbilityState {
  validateAbilityState(next);
  return next;
}

function treeById(state: AbilityState, treeId: string): SkillTree {
  const tree = state.trees.find((item) => item.id === treeId);
  if (!tree) throw new Error('技能树不存在');
  return tree;
}

function nodeById(state: AbilityState, nodeId: string): SkillNode {
  const node = state.nodes.find((item) => item.id === nodeId);
  if (!node) throw new Error('技能节点不存在');
  return node;
}

function touchTree(state: AbilityState, treeId: string, now: string): AbilityState {
  return {
    ...state,
    trees: state.trees.map((tree) => tree.id === treeId ? { ...tree, updatedAt: now } : tree)
  };
}

export function updateTree(
  state: AbilityState,
  treeId: string,
  patch: Partial<Pick<SkillTree, 'name' | 'description' | 'role'>>,
  now: string
): AbilityState {
  treeById(state, treeId);
  const name = patch.name?.trim();
  if (patch.name !== undefined && !name) throw new Error('技能树名称不能为空');
  return valid({
    ...state,
    trees: state.trees.map((tree) => tree.id === treeId ? {
      ...tree,
      ...patch,
      name: name ?? tree.name,
      description: patch.description?.trim() ?? tree.description,
      updatedAt: now
    } : tree)
  });
}

export function archiveTree(state: AbilityState, treeId: string, now: string): AbilityState {
  treeById(state, treeId);
  return valid({
    ...state,
    trees: state.trees.map((tree) => tree.id === treeId
      ? { ...tree, status: 'archived', focusedRank: null, updatedAt: now }
      : tree),
    lastVisitedTreeId: state.lastVisitedTreeId === treeId ? null : state.lastVisitedTreeId
  });
}

export function restoreTree(state: AbilityState, treeId: string, now: string): AbilityState {
  treeById(state, treeId);
  return valid({
    ...state,
    trees: state.trees.map((tree) => tree.id === treeId ? { ...tree, status: 'active', updatedAt: now } : tree)
  });
}

export function reorderFocusedTrees(
  state: AbilityState,
  orderedTreeIds: string[],
  now: string
): AbilityState {
  if (new Set(orderedTreeIds).size !== orderedTreeIds.length) throw new Error('重点技能排序不能重复');
  for (const id of orderedTreeIds) {
    if (treeById(state, id).status !== 'active') throw new Error('归档技能树不能设为重点');
  }
  const ranks = new Map(orderedTreeIds.map((id, index) => [id, index + 1]));
  return valid({
    ...state,
    trees: state.trees.map((tree) => ({
      ...tree,
      focusedRank: ranks.get(tree.id) ?? null,
      updatedAt: ranks.has(tree.id) || tree.focusedRank !== null ? now : tree.updatedAt
    }))
  });
}

export function addPhase(
  state: AbilityState,
  input: Pick<LearningPhase, 'skillTreeId' | 'name' | 'description'> & Partial<Pick<LearningPhase, 'estimatedDuration' | 'plannedStartOn' | 'plannedEndOn'>>,
  id: string,
  now: string
): AbilityState {
  treeById(state, input.skillTreeId);
  if (!input.name.trim()) throw new Error('阶段名称不能为空');
  const order = Math.max(-1, ...state.phases.filter((phase) => phase.skillTreeId === input.skillTreeId).map((phase) => phase.order)) + 1;
  return valid(touchTree({
    ...state,
    phases: [...state.phases, { ...input, id, name: input.name.trim(), description: input.description.trim(), estimatedDuration: input.estimatedDuration?.trim() ?? '', requiredNodePolicy: 'all_required', order }]
  }, input.skillTreeId, now));
}

export function updatePhase(
  state: AbilityState,
  phaseId: string,
  patch: Pick<LearningPhase, 'name' | 'description' | 'estimatedDuration' | 'plannedStartOn' | 'plannedEndOn'>,
  now: string
): AbilityState {
  const phase = state.phases.find((item) => item.id === phaseId);
  if (!phase) throw new Error('学习阶段不存在');
  if (!patch.name.trim()) throw new Error('阶段名称不能为空');
  return valid(touchTree({
    ...state,
    phases: state.phases.map((item) => item.id === phaseId
      ? { ...item, name: patch.name.trim(), description: patch.description.trim(), estimatedDuration: patch.estimatedDuration.trim(), plannedStartOn: patch.plannedStartOn || undefined, plannedEndOn: patch.plannedEndOn || undefined }
      : item)
  }, phase.skillTreeId, now));
}

export function reorderPhases(state: AbilityState, treeId: string, orderedPhaseIds: string[], now: string): AbilityState {
  const existing = state.phases.filter((phase) => phase.skillTreeId === treeId).map((phase) => phase.id).sort();
  if (new Set(orderedPhaseIds).size !== orderedPhaseIds.length || [...orderedPhaseIds].sort().join('|') !== existing.join('|')) {
    throw new Error('阶段排序必须包含该技能树全部阶段');
  }
  const orders = new Map(orderedPhaseIds.map((id, index) => [id, index]));
  return valid(touchTree({
    ...state,
    phases: state.phases.map((phase) => phase.skillTreeId === treeId
      ? { ...phase, order: orders.get(phase.id) as number }
      : phase)
  }, treeId, now));
}

export function addNode(
  state: AbilityState,
  input: Omit<SkillNode, 'id' | 'createdAt' | 'updatedAt' | 'archivedAt' | 'requiredForPhase'> & Partial<Pick<SkillNode, 'requiredForPhase'>>,
  id: string,
  now: string
): AbilityState {
  if (!input.name.trim()) throw new Error('技能节点名称不能为空');
  const phase = state.phases.find((item) => item.id === input.phaseId);
  if (!phase || phase.skillTreeId !== input.skillTreeId) throw new Error('技能节点阶段引用无效');
  const node: SkillNode = {
    ...input,
    id,
    name: input.name.trim(),
    description: input.description.trim(),
    requiredForPhase: input.requiredForPhase ?? true,
    masteryNote: input.masteryNote.trim(),
    archivedAt: null,
    createdAt: now,
    updatedAt: now
  };
  return valid(touchTree({ ...state, nodes: [...state.nodes, node] }, input.skillTreeId, now));
}

export function addChildNode(
  state: AbilityState,
  parentNodeId: string,
  nodeId: string,
  edgeId: string,
  now: string,
  name = '新技能'
): AbilityState {
  const parent = nodeById(state, parentNodeId);
  const withNode = addNode(state, {
    skillTreeId: parent.skillTreeId,
    phaseId: parent.phaseId,
    name,
    description: '',
    progress: 'available',
    masteryNote: ''
  }, nodeId, now);
  return valid({
    ...withNode,
    dependencies: [...withNode.dependencies, {
      id: edgeId,
      skillTreeId: parent.skillTreeId,
      prerequisiteNodeId: parent.id,
      dependentNodeId: nodeId,
      kind: 'primary'
    }]
  });
}

export function addAuxiliaryDependency(
  state: AbilityState,
  fromNodeId: string,
  toNodeId: string,
  edgeId: string
): AbilityState {
  const from = nodeById(state, fromNodeId);
  const to = nodeById(state, toNodeId);
  return valid({
    ...state,
    dependencies: [...state.dependencies, {
      id: edgeId,
      skillTreeId: to.skillTreeId,
      prerequisiteNodeId: from.id,
      dependentNodeId: to.id,
      kind: 'auxiliary'
    }]
  });
}

export function reparentNode(
  state: AbilityState,
  nodeId: string,
  parentNodeId: string,
  edgeId: string
): AbilityState {
  const node = nodeById(state, nodeId);
  const parent = nodeById(state, parentNodeId);
  const dependencies = state.dependencies.filter(
    (edge) => !(edge.dependentNodeId === nodeId && getDependencyKind(state, edge) === 'primary')
  );
  return valid({
    ...state,
    dependencies: [...dependencies, {
      id: edgeId,
      skillTreeId: node.skillTreeId,
      prerequisiteNodeId: parent.id,
      dependentNodeId: node.id,
      kind: 'primary'
    }]
  });
}

export function insertParentNode(
  state: AbilityState,
  nodeId: string,
  parentNodeId: string,
  inboundEdgeId: string,
  childEdgeId: string,
  now: string,
  name = '新父级'
): AbilityState {
  const node = nodeById(state, nodeId);
  const previousParent = getPrimaryParent(state, nodeId);
  const withParent = addNode(state, {
    skillTreeId: node.skillTreeId,
    phaseId: node.phaseId,
    name,
    description: '',
    progress: 'available',
    masteryNote: ''
  }, parentNodeId, now);
  const dependencies = withParent.dependencies.filter(
    (edge) => !(edge.dependentNodeId === nodeId && getDependencyKind(withParent, edge) === 'primary')
  );
  if (previousParent) dependencies.push({
    id: inboundEdgeId,
    skillTreeId: node.skillTreeId,
    prerequisiteNodeId: previousParent.id,
    dependentNodeId: parentNodeId,
    kind: 'primary'
  });
  dependencies.push({
    id: childEdgeId,
    skillTreeId: node.skillTreeId,
    prerequisiteNodeId: parentNodeId,
    dependentNodeId: nodeId,
    kind: 'primary'
  });
  return valid({ ...withParent, dependencies });
}

export function archiveNodeBranch(state: AbilityState, nodeId: string, now: string): AbilityState {
  const node = nodeById(state, nodeId);
  const archivedIds = new Set<string>();
  const visit = (id: string): void => {
    if (archivedIds.has(id)) return;
    archivedIds.add(id);
    getPrimaryChildren(state, id).forEach((child) => visit(child.id));
  };
  visit(nodeId);
  return valid(touchTree({
    ...state,
    nodes: state.nodes.map((item) => archivedIds.has(item.id)
      ? { ...item, archivedAt: now, updatedAt: now }
      : item)
  }, node.skillTreeId, now));
}

export function createParallelContinuation(
  state: AbilityState,
  nodeIds: string[],
  continuationNodeId: string,
  edgeId: string,
  groupId: string,
  now: string,
  name = '下一步'
): AbilityState {
  if (nodeIds.length < 2 || new Set(nodeIds).size !== nodeIds.length) throw new Error('请选择至少两个不同的并行节点');
  const members = nodeIds.map((id) => nodeById(state, id));
  const parent = getPrimaryParent(state, members[0].id);
  if (!parent || members.some((member) => getPrimaryParent(state, member.id)?.id !== parent.id)) {
    throw new Error('只有同一父级下的节点可以汇合');
  }
  const withNode = addNode(state, {
    skillTreeId: parent.skillTreeId,
    phaseId: members[0].phaseId,
    name,
    description: '',
    progress: 'available',
    masteryNote: ''
  }, continuationNodeId, now);
  return valid({
    ...withNode,
    dependencies: [...withNode.dependencies, {
      id: edgeId,
      skillTreeId: parent.skillTreeId,
      prerequisiteNodeId: parent.id,
      dependentNodeId: continuationNodeId,
      kind: 'primary'
    }],
    parallelGroups: [...withNode.parallelGroups, {
      id: groupId,
      skillTreeId: parent.skillTreeId,
      phaseId: members[0].phaseId,
      name: '可并行',
      nodeIds,
      parentNodeId: parent.id,
      continuationNodeId
    }]
  });
}

export function updateNode(
  state: AbilityState,
  nodeId: string,
  patch: Pick<SkillNode, 'name' | 'description' | 'phaseId'>,
  now: string
): AbilityState {
  const node = nodeById(state, nodeId);
  const phase = state.phases.find((item) => item.id === patch.phaseId);
  if (!phase || phase.skillTreeId !== node.skillTreeId) throw new Error('技能节点阶段引用无效');
  if (!patch.name.trim()) throw new Error('技能节点名称不能为空');
  return valid(touchTree({
    ...state,
    nodes: state.nodes.map((item) => item.id === nodeId
      ? { ...item, ...patch, name: patch.name.trim(), description: patch.description.trim(), updatedAt: now }
      : item),
    parallelGroups: state.parallelGroups.map((group) => group.nodeIds.includes(nodeId) && group.phaseId !== patch.phaseId
      ? { ...group, nodeIds: group.nodeIds.filter((id) => id !== nodeId) }
      : group)
  }, node.skillTreeId, now));
}

export function archiveNode(state: AbilityState, nodeId: string, now: string): AbilityState {
  const node = nodeById(state, nodeId);
  return valid(touchTree({
    ...state,
    nodes: state.nodes.map((item) => item.id === nodeId ? { ...item, archivedAt: now, updatedAt: now } : item),
    dependencies: state.dependencies.filter((edge) => edge.dependentNodeId !== nodeId),
    parallelGroups: state.parallelGroups.map((group) => ({ ...group, nodeIds: group.nodeIds.filter((id) => id !== nodeId) }))
  }, node.skillTreeId, now));
}

export function restoreNode(state: AbilityState, nodeId: string, now: string): AbilityState {
  const node = nodeById(state, nodeId);
  return valid(touchTree({
    ...state,
    nodes: state.nodes.map((item) => item.id === nodeId ? { ...item, archivedAt: null, updatedAt: now } : item)
  }, node.skillTreeId, now));
}

export function getNodeRemovalMode(state: AbilityState, nodeId: string): 'delete' | 'archive' {
  nodeById(state, nodeId);
  const hasRelations = state.dependencies.some((edge) => edge.prerequisiteNodeId === nodeId || edge.dependentNodeId === nodeId) ||
    state.taskLinks.some((link) => link.skillNodeId === nodeId) ||
    state.masteryCriteria.some((criterion) => criterion.skillNodeId === nodeId) ||
    state.resourceLinks.some((link) => link.skillNodeId === nodeId) ||
    state.outcomes.some((outcome) => outcome.skillNodeId === nodeId);
  return hasRelations ? 'archive' : 'delete';
}

export function removeEmptyNode(state: AbilityState, nodeId: string): AbilityState {
  const node = nodeById(state, nodeId);
  if (getNodeRemovalMode(state, nodeId) !== 'delete') throw new Error('有关联记录的节点只能归档');
  return valid({
    ...state,
    nodes: state.nodes.filter((item) => item.id !== nodeId),
    parallelGroups: state.parallelGroups.map((group) => ({ ...group, nodeIds: group.nodeIds.filter((id) => id !== node.id) }))
  });
}

export function replaceNodeDependencies(
  state: AbilityState,
  nodeId: string,
  prerequisiteNodeIds: string[],
  ids: string[]
): AbilityState {
  const node = nodeById(state, nodeId);
  if (new Set(prerequisiteNodeIds).size !== prerequisiteNodeIds.length) throw new Error('不能重复添加相同依赖');
  if (ids.length !== prerequisiteNodeIds.length) throw new Error('依赖关系 ID 数量不匹配');
  const next: AbilityState = {
    ...state,
    dependencies: [
      ...state.dependencies.filter((edge) => edge.dependentNodeId !== nodeId),
      ...prerequisiteNodeIds.map((prerequisiteNodeId, index) => ({
        id: ids[index],
        skillTreeId: node.skillTreeId,
        prerequisiteNodeId,
        dependentNodeId: nodeId
      }))
    ]
  };
  return valid(next);
}

export function upsertParallelGroup(state: AbilityState, group: ParallelGroup): AbilityState {
  const exists = state.parallelGroups.some((item) => item.id === group.id);
  return valid({
    ...state,
    parallelGroups: exists
      ? state.parallelGroups.map((item) => item.id === group.id ? { ...group, name: group.name.trim() } : item)
      : [...state.parallelGroups, { ...group, name: group.name.trim() }]
  });
}

export function removeParallelGroup(state: AbilityState, groupId: string): AbilityState {
  return valid({ ...state, parallelGroups: state.parallelGroups.filter((group) => group.id !== groupId) });
}

export function addCriterion(state: AbilityState, nodeId: string, description: string, id: string): AbilityState {
  nodeById(state, nodeId);
  if (!description.trim()) throw new Error('掌握标准不能为空');
  return valid({
    ...state,
    masteryCriteria: [...state.masteryCriteria, { id, skillNodeId: nodeId, description: description.trim(), satisfied: false, source: 'manual' }]
  });
}

export function updateCriterion(state: AbilityState, criterionId: string, description: string): AbilityState {
  if (!description.trim()) throw new Error('掌握标准不能为空');
  if (!state.masteryCriteria.some((item) => item.id === criterionId)) throw new Error('掌握标准不存在');
  return valid({
    ...state,
    masteryCriteria: state.masteryCriteria.map((item) => item.id === criterionId ? { ...item, description: description.trim() } : item)
  });
}

export function toggleCriterion(state: AbilityState, criterionId: string): AbilityState {
  if (!state.masteryCriteria.some((item) => item.id === criterionId)) throw new Error('掌握标准不存在');
  return valid({
    ...state,
    masteryCriteria: state.masteryCriteria.map((item) => item.id === criterionId ? { ...item, satisfied: !item.satisfied } : item)
  });
}

export function removeCriterion(state: AbilityState, criterionId: string): AbilityState {
  return valid({ ...state, masteryCriteria: state.masteryCriteria.filter((item) => item.id !== criterionId) });
}

export function startNode(state: AbilityState, nodeId: string, now: string): AbilityState {
  const node = nodeById(state, nodeId);
  if (node.archivedAt) throw new Error('归档节点不能开始');
  return valid(touchTree({
    ...state,
    nodes: state.nodes.map((item) => item.id === nodeId ? { ...item, progress: 'in_progress', updatedAt: now } : item)
  }, node.skillTreeId, now));
}

export function masterNode(state: AbilityState, nodeId: string, masteryNote: string, now: string): AbilityState {
  const node = nodeById(state, nodeId);
  const criteria = state.masteryCriteria.filter((item) => item.skillNodeId === nodeId);
  const hasOutcome = state.outcomes.some((item) => item.skillNodeId === nodeId);
  if (criteria.length === 0 && !hasOutcome) {
    throw new Error('请先添加掌握标准或记录一项成果');
  }
  if (criteria.some((item) => !item.satisfied) && !hasOutcome) {
    throw new Error('请先完成全部掌握标准，或记录一项真实成果');
  }
  return valid(touchTree({
    ...state,
    nodes: state.nodes.map((item) => item.id === nodeId
      ? { ...item, progress: 'mastered', masteryNote: item.masteryNote, updatedAt: now }
      : item)
  }, node.skillTreeId, now));
}

export function demoteNode(state: AbilityState, nodeId: string, now: string): AbilityState {
  const node = nodeById(state, nodeId);
  return valid(touchTree({
    ...state,
    nodes: state.nodes.map((item) => item.id === nodeId ? { ...item, progress: 'in_progress', updatedAt: now } : item)
  }, node.skillTreeId, now));
}

export function linkTask(state: AbilityState, nodeId: string, taskId: string, id: string): AbilityState {
  nodeById(state, nodeId);
  if (state.taskLinks.some((link) => link.skillNodeId === nodeId && link.taskId === taskId)) throw new Error('该任务已经关联');
  return valid({ ...state, taskLinks: [...state.taskLinks, { id, skillNodeId: nodeId, taskId }] });
}

export function unlinkTask(state: AbilityState, linkId: string): AbilityState {
  return valid({ ...state, taskLinks: state.taskLinks.filter((link) => link.id !== linkId) });
}

export function linkExistingResource(
  state: AbilityState,
  nodeId: string,
  resourceId: string,
  linkId: string,
  now: string
): AbilityState {
  nodeById(state, nodeId);
  if (!state.resources.some((resource) => resource.id === resourceId)) throw new Error('学习资源不存在');
  if (state.resourceLinks.some((link) => link.skillNodeId === nodeId && link.resourceId === resourceId)) {
    throw new Error('该资源已经关联当前节点');
  }
  return valid({
    ...state,
    resourceLinks: [...state.resourceLinks, { id: linkId, skillNodeId: nodeId, resourceId, createdAt: now }]
  });
}

export function addOrLinkResource(
  state: AbilityState,
  nodeId: string,
  input: SkillResourceInput,
  resourceId: string,
  linkId: string,
  now: string
): AbilityState {
  nodeById(state, nodeId);
  const title = input.title.trim();
  if (!title) throw new Error('学习资源标题不能为空');
  const normalizedUrl = normalizeResourceUrl(input.url);
  const existing = state.resources.find((resource) => resource.normalizedUrl === normalizedUrl);
  if (existing) return linkExistingResource(state, nodeId, existing.id, linkId, now);
  const next = {
    ...state,
    resources: [...state.resources, {
      id: resourceId,
      url: input.url.trim(),
      normalizedUrl,
      title,
      type: input.type,
      sourceDomain: resourceDomain(input.url),
      note: input.note.trim(),
      source: 'manual' as const,
      createdAt: now,
      updatedAt: now
    }]
  };
  return linkExistingResource(next, nodeId, resourceId, linkId, now);
}

export function updateResource(
  state: AbilityState,
  resourceId: string,
  patch: { title: string; note: string },
  now: string
): AbilityState {
  if (!state.resources.some((resource) => resource.id === resourceId)) throw new Error('学习资源不存在');
  if (!patch.title.trim()) throw new Error('学习资源标题不能为空');
  return valid({
    ...state,
    resources: state.resources.map((resource) => resource.id === resourceId
      ? { ...resource, title: patch.title.trim(), note: patch.note.trim(), updatedAt: now }
      : resource)
  });
}

export function unlinkResource(state: AbilityState, linkId: string): AbilityState {
  return valid({ ...state, resourceLinks: state.resourceLinks.filter((link) => link.id !== linkId) });
}

export function deleteResource(state: AbilityState, resourceId: string): AbilityState {
  if (!state.resources.some((resource) => resource.id === resourceId)) throw new Error('学习资源不存在');
  if (state.resourceLinks.some((link) => link.resourceId === resourceId)) {
    throw new Error('学习资源仍关联技能节点');
  }
  return valid({ ...state, resources: state.resources.filter((resource) => resource.id !== resourceId) });
}

export function addOutcome(
  state: AbilityState,
  input: Omit<SkillOutcome, 'id' | 'createdAt' | 'updatedAt'>,
  id: string,
  now: string
): AbilityState {
  if (!input.title.trim() || !input.occurredOn) throw new Error('成果名称和日期不能为空');
  const outcome: SkillOutcome = {
    ...input,
    id,
    title: input.title.trim(),
    description: input.description.trim(),
    createdAt: now,
    updatedAt: now
  };
  return valid(touchTree({ ...state, outcomes: [...state.outcomes, outcome] }, input.skillTreeId, now));
}

export function updateOutcome(
  state: AbilityState,
  outcomeId: string,
  patch: Pick<SkillOutcome, 'title' | 'description' | 'occurredOn' | 'skillNodeId'>,
  now: string
): AbilityState {
  const outcome = state.outcomes.find((item) => item.id === outcomeId);
  if (!outcome) throw new Error('成果不存在');
  if (!patch.title.trim() || !patch.occurredOn) throw new Error('成果名称和日期不能为空');
  return valid(touchTree({
    ...state,
    outcomes: state.outcomes.map((item) => item.id === outcomeId
      ? { ...item, ...patch, title: patch.title.trim(), description: patch.description.trim(), updatedAt: now }
      : item)
  }, outcome.skillTreeId, now));
}

export function setOutcomeTreeVisibility(state: AbilityState, outcomeId: string, showOnTree: boolean, now: string): AbilityState {
  const outcome = state.outcomes.find((item) => item.id === outcomeId);
  if (!outcome) throw new Error('成果不存在');
  return valid(touchTree({
    ...state,
    outcomes: state.outcomes.map((item) => item.id === outcomeId ? { ...item, showOnTree, updatedAt: now } : item)
  }, outcome.skillTreeId, now));
}

export function removeOutcome(state: AbilityState, outcomeId: string): AbilityState {
  return valid({ ...state, outcomes: state.outcomes.filter((item) => item.id !== outcomeId) });
}

export function visitTree(state: AbilityState, treeId: string): AbilityState {
  const tree = treeById(state, treeId);
  if (tree.status === 'archived') throw new Error('归档技能树不能作为当前技能树');
  return valid({ ...state, lastVisitedTreeId: treeId });
}
