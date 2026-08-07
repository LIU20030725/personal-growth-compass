export type GrowthDimension = 'wealth' | 'ability' | 'health';
export type TaskDimension = GrowthDimension | 'recovery';
export type RecordStatus = 'active' | 'completed' | 'archived';
export type TaskCadence = 'daily' | 'weekly' | 'monthly';
export type VerificationType = 'reflection' | 'metric' | 'module-data' | 'link';
export type ChestTier = 'bronze' | 'silver' | 'gold';

export type LongTermGoal = {
  id: string;
  dimension: GrowthDimension;
  title: string;
  meaning: string;
  startDate: string;
  targetDate: string;
  progressPercent: number;
  status: RecordStatus;
  createdAt: string;
  completedAt: string | null;
  archivedAt: string | null;
  completionReflection: string;
  completionEvidenceLink: string;
};

export type GoalProgressEntry = {
  id: string;
  goalId: string;
  progressPercent: number;
  note: string;
  outcome: string;
  createdAt: string;
};

export type ShortTask = {
  id: string;
  goalId: string | null;
  dimension: TaskDimension;
  title: string;
  completionStandard: string;
  cadence: TaskCadence;
  targetCount: number;
  estimatedMinutesPerOccurrence: number | null;
  startDate: string;
  endDate: string | null;
  verificationType: VerificationType;
  isMaintenance: boolean;
  rewardEligible: boolean;
  status: RecordStatus;
  createdAt: string;
  completedAt: string | null;
  archivedAt: string | null;
};

export type TaskCompletion = {
  id: string;
  taskId: string;
  periodKey: string;
  sequenceInPeriod: number;
  completedAt: string;
  reflection: string;
  metricValue: number | null;
  evidenceLink: string;
  rewardGranted: boolean;
  diceTransactionId: string | null;
};

export type DiceTransactionType = 'task-reward' | 'weekly-bonus' | 'goal-reward' | 'adventure-spend';

export type DiceTransaction = {
  id: string;
  type: DiceTransactionType;
  amount: number;
  sourceId: string;
  dimension: GrowthDimension | 'mixed';
  ruleVersion: string;
  createdAt: string;
  balanceAfter: number;
  targetType?: 'route' | 'home-item' | 'gear';
  targetId?: string;
};

export type AdventureSpendInput = {
  transactionId: string;
  operationId: string;
  targetType: 'route' | 'home-item' | 'gear';
  targetId: string;
  amount: number;
  createdAt: string;
};

export type WeeklyReview = {
  id: string;
  weekKey: string;
  eligibleTaskCount: number;
  completionCount: number;
  completionRate: number;
  evidenceCoverageRate: number;
  qualifyingStreakWeeks: number;
  bonusDice: number;
  awardedDice: number;
  reviewedCompletionIds: string[];
  settlementCount: number;
  lastSettledAt: string | null;
  transactionIds: string[];
};

export type WeeklyReviewPreview = Omit<WeeklyReview, 'id' | 'settlementCount' | 'lastSettledAt' | 'transactionIds' | 'reviewedCompletionIds'> & {
  claimableDice: number;
  newCompletionIds: string[];
};

export type AdventureProgress = { chapter: number; position: number; unlockedChapter: number };

export type TaskSystemState = {
  schemaVersion: 2;
  goals: LongTermGoal[];
  goalProgressEntries: GoalProgressEntry[];
  tasks: ShortTask[];
  completions: TaskCompletion[];
  diceTransactions: DiceTransaction[];
  weeklyReviews: WeeklyReview[];
  adventure: AdventureProgress;
};

export type GoalDraft = Omit<LongTermGoal, 'id' | 'status' | 'createdAt' | 'completedAt' | 'archivedAt' | 'completionReflection' | 'completionEvidenceLink' | 'progressPercent'>;
export type TaskDraft = Omit<ShortTask, 'id' | 'rewardEligible' | 'status' | 'createdAt' | 'completedAt' | 'archivedAt'>;
export type CompletionDraft = Pick<TaskCompletion, 'taskId' | 'completedAt' | 'reflection' | 'metricValue' | 'evidenceLink'>;
