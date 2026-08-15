import { describe, expect, it } from 'vitest';
import {
  deriveAbilitySummary,
  deriveEmotionSummary,
  deriveHealthSummary,
  deriveTaskSummary,
} from './todayOverviewModel';

describe('today overview model', () => {
  const now = new Date('2026-08-15T09:00:00+08:00');

  it('uses the latest local-today emotion entry', () => {
    expect(deriveEmotionSummary([
      { id: 'old', createdAt: '2026-08-14T20:00:00+08:00', moodId: 'calm' },
      { id: 'new', createdAt: '2026-08-15T08:00:00+08:00', moodId: 'happy' },
    ], now)).toMatchObject({ hasRecord: true, moodId: 'happy' });
  });

  it('selects the last visited active tree and its next node', () => {
    expect(deriveAbilitySummary({
      trees: [{ id: 'tree', name: '产品设计', status: 'active' }],
      nodes: [{ id: 'node', skillTreeId: 'tree', name: '完成信息架构', progress: 'available', archivedAt: null }],
      lastVisitedTreeId: 'tree',
    })).toMatchObject({ treeId: 'tree', treeName: '产品设计', nextNodeName: '完成信息架构' });
  });

  it('summarizes today health records without medical scoring', () => {
    expect(deriveHealthSummary({ todayWaterMl: 500, mealCount: 1, workoutCount: 0, dailyCount: 1 }))
      .toMatchObject({ hasRecord: true, primary: '饮水 500 ml', recordCount: 2 });
  });

  it('returns no more than three active today tasks and counts completion', () => {
    const tasks = ['整理案例', '散步', '阅读', '复盘'].map((title, index) => ({
      id: String(index + 1),
      title,
      completionStandard: `完成${title}`,
      status: 'active' as const,
      startDate: '2026-08-01',
      endDate: null,
      cadence: 'daily' as const,
      targetCount: 1,
      isMaintenance: true,
    }));

    const summary = deriveTaskSummary({
      tasks,
      completions: [{ taskId: '1', completedAt: '2026-08-15T08:10:00+08:00', periodKey: '2026-08-15' }],
    }, now);

    expect(summary.items).toHaveLength(3);
    expect(summary).toMatchObject({ completedCount: 1, totalCount: 4 });
    expect(summary.items.map((item) => item.title)).toEqual(['散步', '阅读', '复盘']);
  });

  it('ignores tasks outside their active dates', () => {
    const summary = deriveTaskSummary({
      tasks: [
        { id: 'future', title: '未来任务', completionStandard: '以后再做', status: 'active', startDate: '2026-08-16', endDate: null, cadence: 'daily', targetCount: 1, isMaintenance: true },
        { id: 'expired', title: '过期任务', completionStandard: '已经结束', status: 'active', startDate: '2026-08-01', endDate: '2026-08-14', cadence: 'daily', targetCount: 1, isMaintenance: true },
      ],
      completions: [],
    }, now);

    expect(summary).toMatchObject({ completedCount: 0, totalCount: 0, items: [] });
  });
});
