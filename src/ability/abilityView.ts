import { getCurrentPhase } from './abilityGraph';
import type {
  AbilityState,
  DependencyEdge,
  ParallelGroup,
  SkillNode,
  SkillOutcome,
  TreeNodeFilter
} from './types';

export type AbilityVisibleGraph = {
  nodes: SkillNode[];
  dependencies: DependencyEdge[];
  parallelGroups: ParallelGroup[];
  outcomes: SkillOutcome[];
  visibleNodeIds: Set<string>;
  selectedNodeId: string | null;
};

function matchesFilter(
  node: SkillNode,
  filter: TreeNodeFilter,
  currentPhaseId: string | undefined
): boolean {
  if (filter === 'all') return true;
  if (filter === 'mastered') return node.progress === 'mastered';
  if (filter === 'next') {
    return node.progress === 'in_progress' || (node.phaseId === currentPhaseId && node.progress !== 'mastered');
  }
  return node.progress === 'mastered';
}

export function buildAbilityVisibleGraph(
  state: AbilityState,
  treeId: string,
  filter: TreeNodeFilter,
  selectedNodeId: string | null = null
): AbilityVisibleGraph {
  const currentPhaseId = getCurrentPhase(state, treeId)?.id;
  const nodes = state.nodes.filter(
    (node) => node.skillTreeId === treeId && !node.archivedAt && matchesFilter(node, filter, currentPhaseId)
  );
  const visibleNodeIds = new Set(nodes.map((node) => node.id));
  const parallelGroups = state.parallelGroups
    .filter((group) => group.skillTreeId === treeId)
    .map((group) => ({ ...group, nodeIds: group.nodeIds.filter((nodeId) => visibleNodeIds.has(nodeId)) }))
    .filter((group) => group.nodeIds.length >= 2);

  return {
    nodes,
    visibleNodeIds,
    dependencies: state.dependencies.filter(
      (edge) => edge.skillTreeId === treeId && visibleNodeIds.has(edge.prerequisiteNodeId) && visibleNodeIds.has(edge.dependentNodeId)
    ),
    parallelGroups,
    outcomes: state.outcomes.filter(
      (outcome) => outcome.skillTreeId === treeId && outcome.showOnTree && Boolean(outcome.skillNodeId && visibleNodeIds.has(outcome.skillNodeId))
    ),
    selectedNodeId: selectedNodeId && visibleNodeIds.has(selectedNodeId) ? selectedNodeId : null
  };
}
