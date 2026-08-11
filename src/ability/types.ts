export type SkillRole = 'main' | 'side' | 'exploring';
export type SkillTreeStatus = 'active' | 'archived';
export type NodeProgress = 'available' | 'in_progress' | 'mastered';
export type NodeDisplayState = NodeProgress;
export type TreeNodeFilter = 'all' | 'next' | 'mastered' | 'current_phase' | NodeDisplayState;
export type CriterionSource = 'manual' | 'ai';
export type ResourceType = 'video' | 'article' | 'document' | 'course' | 'tool' | 'other';
export type ResourceSource = 'manual' | 'ai';

export type SkillTree = {
  id: string;
  name: string;
  description: string;
  role: SkillRole;
  status: SkillTreeStatus;
  focusedRank: number | null;
  createdAt: string;
  updatedAt: string;
};

export type LearningPhase = {
  id: string;
  skillTreeId: string;
  name: string;
  description: string;
  estimatedDuration: string;
  plannedStartOn?: string;
  plannedEndOn?: string;
  requiredNodePolicy: 'all_required';
  order: number;
};

export type SkillNode = {
  id: string;
  skillTreeId: string;
  phaseId: string;
  name: string;
  description: string;
  progress: NodeProgress;
  requiredForPhase: boolean;
  masteryNote: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SkillResource = {
  id: string;
  url: string;
  normalizedUrl: string;
  title: string;
  type: ResourceType;
  sourceDomain: string;
  note: string;
  source: ResourceSource;
  aiReason?: string;
  aiApplicableNode?: string;
  aiDifficulty?: string;
  aiConfidence?: number;
  createdAt: string;
  updatedAt: string;
};

export type SkillResourceLink = {
  id: string;
  skillNodeId: string;
  resourceId: string;
  createdAt: string;
};

export type DependencyEdge = {
  id: string;
  skillTreeId: string;
  prerequisiteNodeId: string;
  dependentNodeId: string;
  kind?: 'primary' | 'auxiliary';
};

export type ParallelGroup = {
  id: string;
  skillTreeId: string;
  phaseId: string;
  name: string;
  nodeIds: string[];
  parentNodeId?: string;
  continuationNodeId?: string;
};

export type MasteryCriterion = {
  id: string;
  skillNodeId: string;
  description: string;
  satisfied: boolean;
  source: CriterionSource;
};

export type SkillTaskLink = {
  id: string;
  skillNodeId: string;
  taskId: string;
};

export type SkillOutcome = {
  id: string;
  skillTreeId: string;
  skillNodeId: string | null;
  title: string;
  description: string;
  occurredOn: string;
  showOnTree: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AbilityState = {
  schemaVersion: 2;
  trees: SkillTree[];
  phases: LearningPhase[];
  nodes: SkillNode[];
  dependencies: DependencyEdge[];
  parallelGroups: ParallelGroup[];
  masteryCriteria: MasteryCriterion[];
  taskLinks: SkillTaskLink[];
  outcomes: SkillOutcome[];
  resources: SkillResource[];
  resourceLinks: SkillResourceLink[];
  lastVisitedTreeId: string | null;
};

export type DraftPhase = {
  draftId: string;
  name: string;
  description: string;
  order: number;
};

export type DraftNode = {
  draftId: string;
  phaseDraftId: string;
  name: string;
  description: string;
  progress: NodeProgress;
  masteryNote: string;
};

export type DraftDependency = {
  draftId: string;
  prerequisiteNodeDraftId: string;
  dependentNodeDraftId: string;
};

export type DraftParallelGroup = {
  draftId: string;
  phaseDraftId: string;
  name: string;
  nodeDraftIds: string[];
};

export type DraftMasteryCriterion = {
  draftId: string;
  nodeDraftId: string;
  description: string;
  satisfied: boolean;
  source: CriterionSource;
};

export type DraftSuggestedTask = {
  draftId: string;
  nodeDraftId: string;
  title: string;
  completionStandard: string;
};

export type SkillTreeDraft = {
  tree: Pick<SkillTree, 'name' | 'description' | 'role' | 'status' | 'focusedRank'>;
  phases: DraftPhase[];
  nodes: DraftNode[];
  dependencies: DraftDependency[];
  parallelGroups: DraftParallelGroup[];
  masteryCriteria: DraftMasteryCriterion[];
  suggestedTasks?: DraftSuggestedTask[];
};

export type SkillTreeDraftPatch = {
  skillTreeId: string;
  phases: DraftPhase[];
  nodes: DraftNode[];
  dependencies: DraftDependency[];
  parallelGroups: DraftParallelGroup[];
  masteryCriteria: DraftMasteryCriterion[];
};

export type AbilityPlanInput = {
  skillName: string;
  context: string;
  constraints: string[];
};

export type AbilityExpandInput = {
  skillTreeId: string;
  goal: string;
  existingState: AbilityState;
};

export interface AbilityPlanner {
  plan(input: AbilityPlanInput): Promise<SkillTreeDraft>;
  expand(input: AbilityExpandInput): Promise<SkillTreeDraftPatch>;
}
