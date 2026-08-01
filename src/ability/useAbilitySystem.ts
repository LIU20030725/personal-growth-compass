import { useCallback, useRef, useState } from 'react';
import { applyDraft, type IdFactory } from './abilityDrafts';
import * as engine from './abilityEngine';
import { loadAbilityState, saveAbilityState } from './abilityStorage';
import type { StorageLike } from '../lib/storage';
import type {
  LearningPhase,
  ParallelGroup,
  SkillNode,
  SkillOutcome,
  SkillTree,
  SkillTreeDraft
} from './types';

type Options = {
  storage?: StorageLike;
  now?: () => string;
  idFactory?: IdFactory;
};

const browserStorage = (): StorageLike => window.localStorage;

function defaultIdFactory(kind: string): string {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${kind}-${suffix}`;
}

export function useAbilitySystem(options: Options = {}) {
  const storageRef = useRef(options.storage ?? browserStorage());
  const nowRef = useRef(options.now ?? (() => new Date().toISOString()));
  const idFactoryRef = useRef(options.idFactory ?? defaultIdFactory);
  const [state, setState] = useState(() => loadAbilityState(storageRef.current));
  const stateRef = useRef(state);
  const [persistenceError, setPersistenceError] = useState('');

  const commit = useCallback((transform: (current: typeof state) => typeof state): void => {
    try {
      const next = transform(stateRef.current);
      saveAbilityState(storageRef.current, next);
      stateRef.current = next;
      setState(next);
      setPersistenceError('');
    } catch (error) {
      setPersistenceError(error instanceof Error ? error.message : '能力数据保存失败');
    }
  }, []);

  const nextId = useCallback((kind: string) => idFactoryRef.current(kind), []);
  const currentTime = useCallback(() => nowRef.current(), []);

  return {
    state,
    persistenceError,
    clearPersistenceError: () => setPersistenceError(''),
    applyTreeDraft: (draft: SkillTreeDraft) => commit((current) => applyDraft(current, draft, nextId, currentTime())),
    updateTree: (treeId: string, patch: Partial<Pick<SkillTree, 'name' | 'description' | 'role'>>) =>
      commit((current) => engine.updateTree(current, treeId, patch, currentTime())),
    archiveTree: (treeId: string) => commit((current) => engine.archiveTree(current, treeId, currentTime())),
    restoreTree: (treeId: string) => commit((current) => engine.restoreTree(current, treeId, currentTime())),
    reorderFocusedTrees: (treeIds: string[]) => commit((current) => engine.reorderFocusedTrees(current, treeIds, currentTime())),
    addPhase: (input: Pick<LearningPhase, 'skillTreeId' | 'name' | 'description'>) => {
      const id = nextId('phase');
      commit((current) => engine.addPhase(current, input, id, currentTime()));
      return id;
    },
    updatePhase: (phaseId: string, patch: Pick<LearningPhase, 'name' | 'description'>) =>
      commit((current) => engine.updatePhase(current, phaseId, patch, currentTime())),
    reorderPhases: (treeId: string, phaseIds: string[]) =>
      commit((current) => engine.reorderPhases(current, treeId, phaseIds, currentTime())),
    addNode: (
      input: Omit<SkillNode, 'id' | 'createdAt' | 'updatedAt' | 'archivedAt'>,
      prerequisiteNodeIds: string[] = []
    ) => {
      const nodeId = nextId('node');
      const edgeIds = prerequisiteNodeIds.map(() => nextId('edge'));
      commit((current) => engine.replaceNodeDependencies(
        engine.addNode(current, input, nodeId, currentTime()),
        nodeId,
        prerequisiteNodeIds,
        edgeIds
      ));
      return nodeId;
    },
    updateNode: (nodeId: string, patch: Pick<SkillNode, 'name' | 'description' | 'phaseId'>) =>
      commit((current) => engine.updateNode(current, nodeId, patch, currentTime())),
    archiveNode: (nodeId: string) => commit((current) => engine.archiveNode(current, nodeId, currentTime())),
    restoreNode: (nodeId: string) => commit((current) => engine.restoreNode(current, nodeId, currentTime())),
    removeEmptyNode: (nodeId: string) => commit((current) => engine.removeEmptyNode(current, nodeId)),
    replaceNodeDependencies: (nodeId: string, prerequisiteNodeIds: string[]) =>
      commit((current) => engine.replaceNodeDependencies(current, nodeId, prerequisiteNodeIds, prerequisiteNodeIds.map(() => nextId('edge')))),
    upsertParallelGroup: (group: Omit<ParallelGroup, 'id'> & { id?: string }) =>
      commit((current) => engine.upsertParallelGroup(current, { ...group, id: group.id ?? nextId('group') })),
    removeParallelGroup: (groupId: string) => commit((current) => engine.removeParallelGroup(current, groupId)),
    addCriterion: (nodeId: string, description: string) =>
      commit((current) => engine.addCriterion(current, nodeId, description, nextId('criterion'))),
    updateCriterion: (criterionId: string, description: string) =>
      commit((current) => engine.updateCriterion(current, criterionId, description)),
    toggleCriterion: (criterionId: string) => commit((current) => engine.toggleCriterion(current, criterionId)),
    removeCriterion: (criterionId: string) => commit((current) => engine.removeCriterion(current, criterionId)),
    startNode: (nodeId: string) => commit((current) => engine.startNode(current, nodeId, currentTime())),
    masterNode: (nodeId: string, masteryNote: string) =>
      commit((current) => engine.masterNode(current, nodeId, masteryNote, currentTime())),
    demoteNode: (nodeId: string) => commit((current) => engine.demoteNode(current, nodeId, currentTime())),
    linkTask: (nodeId: string, taskId: string) =>
      commit((current) => engine.linkTask(current, nodeId, taskId, nextId('task-link'))),
    unlinkTask: (linkId: string) => commit((current) => engine.unlinkTask(current, linkId)),
    addOutcome: (input: Omit<SkillOutcome, 'id' | 'createdAt' | 'updatedAt'>) =>
      commit((current) => engine.addOutcome(current, input, nextId('outcome'), currentTime())),
    updateOutcome: (outcomeId: string, patch: Pick<SkillOutcome, 'title' | 'description' | 'occurredOn' | 'skillNodeId'>) =>
      commit((current) => engine.updateOutcome(current, outcomeId, patch, currentTime())),
    setOutcomeTreeVisibility: (outcomeId: string, showOnTree: boolean) =>
      commit((current) => engine.setOutcomeTreeVisibility(current, outcomeId, showOnTree, currentTime())),
    removeOutcome: (outcomeId: string) => commit((current) => engine.removeOutcome(current, outcomeId)),
    visitTree: (treeId: string) => commit((current) => engine.visitTree(current, treeId))
  };
}
