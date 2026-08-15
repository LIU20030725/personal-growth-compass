import { moodById } from '../emotion/emotionConfig';

export type EmotionOverviewSummary = {
  hasRecord: boolean;
  moodId: string | null;
  primary: string;
  secondary: string;
};

export type AbilityOverviewSummary = {
  treeId: string | null;
  treeName: string;
  nextNodeName: string | null;
  primary: string;
  secondary: string;
};

export type HealthOverviewSummary = {
  hasRecord: boolean;
  primary: string;
  secondary: string;
  recordCount: number;
};

export type TodayTaskItem = {
  id: string;
  title: string;
  completed: boolean;
  completionStandard: string;
};

export type TaskOverviewSummary = {
  totalCount: number;
  completedCount: number;
  items: TodayTaskItem[];
  primary: string;
  secondary: string;
};

export type TodayOverviewModel = {
  emotion: EmotionOverviewSummary;
  ability: AbilityOverviewSummary;
  health: HealthOverviewSummary;
  tasks: TaskOverviewSummary;
};

type EmotionEntryInput = { id: string; createdAt: string; moodId: string };
type AbilityInput = {
  trees: Array<{ id: string; name: string; status: string }>;
  nodes: Array<{ id: string; skillTreeId: string; name: string; progress: string; archivedAt: string | null }>;
  lastVisitedTreeId: string | null;
};
type HealthInput = { todayWaterMl: number; mealCount: number; workoutCount: number; dailyCount: number };
type TaskInput = {
  tasks: Array<{
    id: string;
    title: string;
    completionStandard: string;
    status: string;
    startDate: string;
    endDate: string | null;
    cadence: string;
    targetCount: number;
    isMaintenance: boolean;
  }>;
  completions: Array<{ taskId: string; completedAt: string; periodKey: string }>;
};

export function localDateKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function deriveEmotionSummary(entries: EmotionEntryInput[], now = new Date()): EmotionOverviewSummary {
  const today = localDateKey(now);
  const latest = entries
    .filter((entry) => localDateKey(entry.createdAt) === today)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  if (!latest) {
    return { hasRecord: false, moodId: null, primary: '暂无记录', secondary: '记录此刻' };
  }

  const mood = moodById.get(latest.moodId);
  return {
    hasRecord: true,
    moodId: latest.moodId,
    primary: mood?.label ?? '已记录此刻',
    secondary: '看看今天的情绪',
  };
}

export function deriveAbilitySummary(state: AbilityInput): AbilityOverviewSummary {
  const activeTrees = state.trees.filter((tree) => tree.status === 'active');
  const tree = activeTrees.find((item) => item.id === state.lastVisitedTreeId) ?? activeTrees[0];
  if (!tree) {
    return {
      treeId: null,
      treeName: '',
      nextNodeName: null,
      primary: '暂无技能跟进',
      secondary: '查看能力',
    };
  }

  const candidates = state.nodes
    .filter((node) => node.skillTreeId === tree.id && node.archivedAt === null && node.progress !== 'mastered')
    .sort((a, b) => Number(b.progress === 'in_progress') - Number(a.progress === 'in_progress'));
  const next = candidates[0];
  return {
    treeId: tree.id,
    treeName: tree.name,
    nextNodeName: next?.name ?? null,
    primary: tree.name,
    secondary: next ? `下一步：${next.name}` : '暂无待推进节点',
  };
}

export function deriveHealthSummary(input: HealthInput): HealthOverviewSummary {
  const recordCount = input.mealCount + input.workoutCount + input.dailyCount;
  if (recordCount === 0) {
    return { hasRecord: false, primary: '暂无记录', secondary: '记录健康', recordCount };
  }

  const primary = input.todayWaterMl > 0
    ? `饮水 ${input.todayWaterMl} ml`
    : input.mealCount > 0
      ? `${input.mealCount} 餐饮食记录`
      : input.workoutCount > 0
        ? `${input.workoutCount} 次训练`
        : `${input.dailyCount} 条日常记录`;
  return { hasRecord: true, primary, secondary: `今天已有 ${recordCount} 条记录`, recordCount };
}

export function deriveTaskSummary(input: TaskInput, now = new Date()): TaskOverviewSummary {
  const today = localDateKey(now);
  const activeTasks = input.tasks.filter((task) =>
    task.status === 'active' && task.startDate <= today && (task.endDate === null || task.endDate >= today),
  );
  const completedToday = new Set(
    input.completions
      .filter((completion) => localDateKey(completion.completedAt) === today)
      .map((completion) => completion.taskId),
  );
  const allItems = activeTasks.map((task) => ({
    id: task.id,
    title: task.title,
    completionStandard: task.completionStandard,
    completed: completedToday.has(task.id),
  }));
  const completedCount = allItems.filter((item) => item.completed).length;
  const items = [...allItems]
    .sort((a, b) => Number(a.completed) - Number(b.completed))
    .slice(0, 3);

  return {
    totalCount: allItems.length,
    completedCount,
    items,
    primary: allItems.length ? `${completedCount}/${allItems.length} 已完成` : '未设置计划',
    secondary: allItems.length ? '查看今日任务' : '添加计划',
  };
}

export const emptyTodayOverviewModel: TodayOverviewModel = {
  emotion: deriveEmotionSummary([]),
  ability: deriveAbilitySummary({ trees: [], nodes: [], lastVisitedTreeId: null }),
  health: deriveHealthSummary({ todayWaterMl: 0, mealCount: 0, workoutCount: 0, dailyCount: 0 }),
  tasks: deriveTaskSummary({ tasks: [], completions: [] }),
};
