import { ABILITY_STORAGE_KEY, LEGACY_ABILITY_STORAGE_KEYS } from './abilityConfig';
import { validateAbilityState } from './abilityGraph';
import type { StorageLike } from '../lib/storage';
import type { AbilityState, NodeProgress, SkillTree } from './types';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function records(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function migrateSchemaV1(value: UnknownRecord): AbilityState {
  return {
    ...(value as unknown as Omit<AbilityState, 'schemaVersion' | 'phases' | 'nodes' | 'resources' | 'resourceLinks'>),
    schemaVersion: 2,
    phases: records(value.phases).map((phase) => ({
      ...(phase as unknown as AbilityState['phases'][number]),
      estimatedDuration: '',
      requiredNodePolicy: 'all_required'
    })),
    nodes: records(value.nodes).map((node) => ({
      ...(node as unknown as AbilityState['nodes'][number]),
      requiredForPhase: true
    })),
    resources: [],
    resourceLinks: []
  };
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const ids = new Set<string>();
  return items.filter((item) => {
    if (!item.id || ids.has(item.id)) return false;
    ids.add(item.id);
    return true;
  });
}

function repairAbilityState(value: UnknownRecord): AbilityState {
  const source = value.schemaVersion === 1 ? migrateSchemaV1(value) : {
    ...value,
    schemaVersion: 2,
    resources: records(value.resources),
    resourceLinks: records(value.resourceLinks)
  } as unknown as AbilityState;
  const trees = uniqueById(records(source.trees) as unknown as AbilityState['trees']);
  const treeIds = new Set(trees.map((tree) => tree.id));
  const phases = uniqueById((records(source.phases) as unknown as AbilityState['phases'])
    .filter((phase) => treeIds.has(phase.skillTreeId))
    .map((phase) => ({
      ...phase,
      estimatedDuration: text(phase.estimatedDuration),
      requiredNodePolicy: 'all_required' as const,
      order: numberValue(phase.order)
    })));
  const phaseById = new Map(phases.map((phase) => [phase.id, phase]));
  const nodes = uniqueById((records(source.nodes) as unknown as AbilityState['nodes'])
    .filter((node) => phaseById.get(node.phaseId)?.skillTreeId === node.skillTreeId)
    .map((node) => ({ ...node, requiredForPhase: node.requiredForPhase !== false })));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const edgeIds = new Set<string>();
  const edgePairs = new Set<string>();
  const dependencies: AbilityState['dependencies'] = [];
  const hasPath = (from: string, to: string): boolean => {
    const seen = new Set<string>();
    const queue = [from];
    while (queue.length) {
      const current = queue.shift() as string;
      if (current === to) return true;
      if (seen.has(current)) continue;
      seen.add(current);
      dependencies.filter((edge) => edge.prerequisiteNodeId === current).forEach((edge) => queue.push(edge.dependentNodeId));
    }
    return false;
  };
  for (const edge of records(source.dependencies) as unknown as AbilityState['dependencies']) {
    const prerequisite = nodeById.get(edge.prerequisiteNodeId);
    const dependent = nodeById.get(edge.dependentNodeId);
    const pair = `${edge.prerequisiteNodeId}:${edge.dependentNodeId}`;
    if (!edge.id || edgeIds.has(edge.id) || edgePairs.has(pair) || !prerequisite || !dependent || prerequisite.id === dependent.id) continue;
    if (prerequisite.skillTreeId !== dependent.skillTreeId || edge.skillTreeId !== dependent.skillTreeId) continue;
    if (hasPath(edge.dependentNodeId, edge.prerequisiteNodeId)) continue;
    edgeIds.add(edge.id);
    edgePairs.add(pair);
    dependencies.push(edge);
  }

  const groupedNodeIds = new Set<string>();
  const parallelGroups = uniqueById((records(source.parallelGroups) as unknown as AbilityState['parallelGroups'])
    .filter((group) => treeIds.has(group.skillTreeId) && phaseById.get(group.phaseId)?.skillTreeId === group.skillTreeId)
    .map((group) => {
      const nodeIds = (Array.isArray(group.nodeIds) ? group.nodeIds : []).filter((nodeId): nodeId is string => {
        if (typeof nodeId !== 'string' || groupedNodeIds.has(`${group.skillTreeId}:${nodeId}`)) return false;
        const node = nodeById.get(nodeId);
        if (!node || node.skillTreeId !== group.skillTreeId) return false;
        groupedNodeIds.add(`${group.skillTreeId}:${nodeId}`);
        return true;
      });
      return {
        ...group,
        nodeIds,
        parentNodeId: group.parentNodeId && nodeById.get(group.parentNodeId)?.skillTreeId === group.skillTreeId ? group.parentNodeId : undefined,
        continuationNodeId: group.continuationNodeId && nodeById.get(group.continuationNodeId)?.skillTreeId === group.skillTreeId ? group.continuationNodeId : undefined
      };
    }));
  const masteryCriteria = uniqueById((records(source.masteryCriteria) as unknown as AbilityState['masteryCriteria'])
    .filter((criterion) => nodeById.has(criterion.skillNodeId)));
  const taskLinks = uniqueById((records(source.taskLinks) as unknown as AbilityState['taskLinks'])
    .filter((link) => nodeById.has(link.skillNodeId)));
  const outcomes = uniqueById((records(source.outcomes) as unknown as AbilityState['outcomes'])
    .filter((outcome) => treeIds.has(outcome.skillTreeId) && (!outcome.skillNodeId || nodeById.get(outcome.skillNodeId)?.skillTreeId === outcome.skillTreeId)));
  const normalizedUrls = new Set<string>();
  const resources = uniqueById((records(source.resources) as unknown as AbilityState['resources'])
    .filter((resource) => {
      if (!resource.normalizedUrl || normalizedUrls.has(resource.normalizedUrl)) return false;
      normalizedUrls.add(resource.normalizedUrl);
      return true;
    }));
  const resourceIds = new Set(resources.map((resource) => resource.id));
  const resourceLinkPairs = new Set<string>();
  const resourceLinks = uniqueById((records(source.resourceLinks) as unknown as AbilityState['resourceLinks'])
    .filter((link) => {
      const pair = `${link.skillNodeId}:${link.resourceId}`;
      if (!nodeById.has(link.skillNodeId) || !resourceIds.has(link.resourceId) || resourceLinkPairs.has(pair)) return false;
      resourceLinkPairs.add(pair);
      return true;
    }));

  return {
    schemaVersion: 2,
    trees,
    phases,
    nodes,
    dependencies,
    parallelGroups,
    masteryCriteria,
    taskLinks,
    outcomes,
    resources,
    resourceLinks,
    lastVisitedTreeId: typeof source.lastVisitedTreeId === 'string' && treeIds.has(source.lastVisitedTreeId) ? source.lastVisitedTreeId : null
  };
}

function parseAbilityState(value: unknown): AbilityState {
  if (!isRecord(value) || (value.schemaVersion !== 1 && value.schemaVersion !== 2)) throw new Error('不支持的能力数据版本');
  const state = repairAbilityState(value);
  validateAbilityState(state);
  return state;
}

export function createInitialAbilityState(): AbilityState {
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

function legacyProgress(level: number, maxLevel: number): NodeProgress {
  if (maxLevel > 0 && level >= maxLevel) return 'mastered';
  return level > 0 ? 'in_progress' : 'available';
}

export function migrateLegacyAbilityStore(value: unknown, now: string): AbilityState {
  if (!isRecord(value)) throw new Error('旧能力数据结构无效');
  const state = createInitialAbilityState();
  const career = isRecord(value.career) ? value.career : {};
  const side = isRecord(value.side) ? value.side : {};
  const careerSkills = records(career.skills);
  const learning = records(side.learning);
  const achievements = records(side.achievements);

  let careerTree: SkillTree | null = null;
  if (careerSkills.length) {
    careerTree = {
      id: 'legacy-tree-career',
      name: '职业技能',
      description: '从旧版职业技能数据迁移',
      role: 'main',
      status: 'active',
      focusedRank: 1,
      createdAt: now,
      updatedAt: now
    };
    state.trees.push(careerTree);
    state.phases.push({ id: 'legacy-phase-career', skillTreeId: careerTree.id, name: '职业技能', description: '', estimatedDuration: '', requiredNodePolicy: 'all_required', order: 0 });
    const nodeIdByLegacyId = new Map<string, string>();
    careerSkills.forEach((skill, index) => {
      const legacyId = text(skill.id, `career-${index + 1}`);
      const nodeId = `legacy-node-career-${legacyId}`;
      nodeIdByLegacyId.set(legacyId, nodeId);
      state.nodes.push({
        id: nodeId,
        skillTreeId: careerTree?.id as string,
        phaseId: 'legacy-phase-career',
        name: text(skill.name, `职业技能 ${index + 1}`),
        description: '',
        progress: legacyProgress(numberValue(skill.level), numberValue(skill.maxLevel, 10)),
        requiredForPhase: true,
        masteryNote: '',
        archivedAt: null,
        createdAt: now,
        updatedAt: now
      });
    });
    const edgeKeys = new Set<string>();
    const addEdge = (fromLegacyId: string, toLegacyId: string): void => {
      const from = nodeIdByLegacyId.get(fromLegacyId);
      const to = nodeIdByLegacyId.get(toLegacyId);
      if (!from || !to || from === to) return;
      const key = `${from}:${to}`;
      if (edgeKeys.has(key)) return;
      edgeKeys.add(key);
      state.dependencies.push({
        id: `legacy-edge-${edgeKeys.size}`,
        skillTreeId: careerTree?.id as string,
        prerequisiteNodeId: from,
        dependentNodeId: to
      });
    };
    careerSkills.forEach((skill, index) => {
      const legacyId = text(skill.id, `career-${index + 1}`);
      const parent = text(skill.parent);
      if (parent) addEdge(parent, legacyId);
      for (const child of Array.isArray(skill.children) ? skill.children : []) {
        if (typeof child === 'string') addEdge(legacyId, child);
      }
    });
  }

  let sideTree: SkillTree | null = null;
  if (learning.length || achievements.length) {
    sideTree = {
      id: 'legacy-tree-side',
      name: '副业学习',
      description: '从旧版学习与成果数据迁移',
      role: 'side',
      status: 'active',
      focusedRank: careerTree ? 2 : 1,
      createdAt: now,
      updatedAt: now
    };
    state.trees.push(sideTree);
    state.phases.push({ id: 'legacy-phase-side', skillTreeId: sideTree.id, name: '学习实践', description: '', estimatedDuration: '', requiredNodePolicy: 'all_required', order: 0 });
    learning.forEach((item, index) => {
      const progress = Math.max(0, numberValue(item.progress));
      state.nodes.push({
        id: `legacy-node-learning-${text(item.id, String(index + 1))}`,
        skillTreeId: sideTree?.id as string,
        phaseId: 'legacy-phase-side',
        name: text(item.title, `学习项目 ${index + 1}`),
        description: text(item.link),
        progress: progress >= 1 ? 'mastered' : progress > 0 ? 'in_progress' : 'available',
        requiredForPhase: true,
        masteryNote: '',
        archivedAt: null,
        createdAt: now,
        updatedAt: now
      });
    });
    achievements.forEach((item, index) => {
      const history = records(item.history).sort((a, b) => text(a.date).localeCompare(text(b.date)));
      const latest = history[history.length - 1];
      if (!latest) return;
      state.outcomes.push({
        id: `legacy-outcome-${text(item.id, String(index + 1))}`,
        skillTreeId: sideTree?.id as string,
        skillNodeId: null,
        title: `${text(item.platform, '平台')} · ${text(item.metric, '成果')} ${String(latest.value ?? '')}`.trim(),
        description: '从旧版副业成果记录迁移',
        occurredOn: text(latest.date, now.slice(0, 10)),
        showOnTree: false,
        createdAt: now,
        updatedAt: now
      });
    });
  }

  state.lastVisitedTreeId = state.trees[0]?.id ?? null;
  validateAbilityState(state);
  return state;
}

function backUpCorrupt(storage: StorageLike, key: string, raw: string): void {
  try {
    storage.setItem(`${key}.corrupt.${Date.now()}`, raw);
  } catch {
    // The original key remains available when even the recovery write is unavailable.
  }
}

export function loadAbilityState(storage: StorageLike): AbilityState {
  const raw = storage.getItem(ABILITY_STORAGE_KEY);
  if (raw) {
    try {
      const state = parseAbilityState(JSON.parse(raw));
      const repairedRaw = JSON.stringify(state);
      if (repairedRaw !== raw) {
        try { storage.setItem(ABILITY_STORAGE_KEY, repairedRaw); } catch { /* Keep the in-memory recovery when persistence is unavailable. */ }
      }
      return state;
    } catch {
      backUpCorrupt(storage, ABILITY_STORAGE_KEY, raw);
      storage.removeItem(ABILITY_STORAGE_KEY);
      return createInitialAbilityState();
    }
  }

  for (const legacyKey of LEGACY_ABILITY_STORAGE_KEYS) {
    const legacyRaw = storage.getItem(legacyKey);
    if (!legacyRaw) continue;
    try {
      const migrated = migrateLegacyAbilityStore(JSON.parse(legacyRaw), new Date().toISOString());
      saveAbilityState(storage, migrated);
      return migrated;
    } catch {
      backUpCorrupt(storage, legacyKey, legacyRaw);
      return createInitialAbilityState();
    }
  }
  return createInitialAbilityState();
}

export function saveAbilityState(storage: StorageLike, state: AbilityState): void {
  validateAbilityState(state);
  try {
    storage.setItem(ABILITY_STORAGE_KEY, JSON.stringify(state));
  } catch {
    throw new Error('能力数据保存失败，原数据仍然保留');
  }
}
