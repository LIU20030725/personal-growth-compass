import { describe, expect, it } from 'vitest';
import { applyDraft, validateSkillTreeDraft } from './abilityDrafts';
import type { AbilityState, SkillTreeDraft } from './types';

function emptyState(): AbilityState {
  return {
    schemaVersion: 2,
    trees: [],
    phases: [],
    nodes: [],
    dependencies: [],
    parallelGroups: [],
    masteryCriteria: [],
    taskLinks: [],
    outcomes: [],
    resources: [],
    resourceLinks: [],
    lastVisitedTreeId: null
  };
}

function validDraft(): SkillTreeDraft {
  return {
    tree: { name: '前端开发', description: '从基础到上线', role: 'main', status: 'active', focusedRank: 1 },
    phases: [
      { draftId: 'phase-base', name: '基础', description: '', order: 0 },
      { draftId: 'phase-project', name: '项目', description: '', order: 1 }
    ],
    nodes: [
      { draftId: 'html', phaseDraftId: 'phase-base', name: 'HTML', description: '', progress: 'available', masteryNote: '' },
      { draftId: 'css', phaseDraftId: 'phase-base', name: 'CSS', description: '', progress: 'available', masteryNote: '' },
      { draftId: 'site', phaseDraftId: 'phase-project', name: '个人网站', description: '', progress: 'available', masteryNote: '' }
    ],
    dependencies: [
      { draftId: 'edge-html-site', prerequisiteNodeDraftId: 'html', dependentNodeDraftId: 'site' }
    ],
    parallelGroups: [
      { draftId: 'group-base', phaseDraftId: 'phase-base', name: '网页基础', nodeDraftIds: ['html', 'css'] }
    ],
    masteryCriteria: [
      { draftId: 'criterion-html', nodeDraftId: 'html', description: '完成语义化页面', satisfied: false, source: 'manual' },
      { draftId: 'criterion-site', nodeDraftId: 'site', description: '网站公开可访问', satisfied: false, source: 'manual' }
    ]
  };
}

function idFactory() {
  let index = 0;
  return (kind: string) => `${kind}-${++index}`;
}

describe('ability drafts', () => {
  it('applies a complete draft and replaces local references with formal ids', () => {
    const result = applyDraft(emptyState(), validDraft(), idFactory(), '2026-08-02T00:00:00.000Z');
    expect(result.trees).toHaveLength(1);
    expect(result.phases).toHaveLength(2);
    expect(result.nodes).toHaveLength(3);
    expect(result.masteryCriteria.every((item) => item.source === 'manual')).toBe(true);
    const html = result.nodes.find((node) => node.name === 'HTML');
    const site = result.nodes.find((node) => node.name === '个人网站');
    expect(result.dependencies[0]).toMatchObject({
      prerequisiteNodeId: html?.id,
      dependentNodeId: site?.id
    });
    expect(result.lastVisitedTreeId).toBe(result.trees[0].id);
  });

  it('rejects duplicate local ids and missing references', () => {
    const duplicate = validDraft();
    duplicate.nodes[1] = { ...duplicate.nodes[1], draftId: 'html' };
    expect(() => validateSkillTreeDraft(duplicate)).toThrow('草案节点 ID 必须唯一');

    const missingPhase = validDraft();
    missingPhase.nodes[0] = { ...missingPhase.nodes[0], phaseDraftId: 'missing' };
    expect(() => validateSkillTreeDraft(missingPhase)).toThrow('草案节点引用了不存在的阶段');

    const missingSuggestedNode = validDraft();
    missingSuggestedNode.suggestedTasks = [{ draftId: 'task', nodeDraftId: 'missing', title: '练习', completionStandard: '完成' }];
    expect(() => validateSkillTreeDraft(missingSuggestedNode)).toThrow('建议任务引用了不存在的节点');
  });

  it('rejects cyclic dependencies and cross-phase parallel groups', () => {
    const cycle = validDraft();
    cycle.dependencies.push({ draftId: 'edge-site-html', prerequisiteNodeDraftId: 'site', dependentNodeDraftId: 'html' });
    expect(() => validateSkillTreeDraft(cycle)).toThrow('技能树不能包含循环依赖');

    const badGroup = validDraft();
    badGroup.parallelGroups[0].nodeDraftIds.push('site');
    expect(() => validateSkillTreeDraft(badGroup)).toThrow('并行节点必须属于同一阶段');
  });

  it('does not mutate the original state when applying an invalid draft', () => {
    const state = emptyState();
    const before = structuredClone(state);
    const invalid = validDraft();
    invalid.dependencies.push({ draftId: 'self', prerequisiteNodeDraftId: 'html', dependentNodeDraftId: 'html' });
    expect(() => applyDraft(state, invalid, idFactory(), '2026-08-02T00:00:00.000Z')).toThrow();
    expect(state).toEqual(before);
  });
});
