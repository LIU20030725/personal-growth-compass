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

function parseAbilityState(value: unknown): AbilityState {
  if (!isRecord(value) || value.schemaVersion !== 1) throw new Error('不支持的能力数据版本');
  const requiredArrays = ['trees', 'phases', 'nodes', 'dependencies', 'parallelGroups', 'masteryCriteria', 'taskLinks', 'outcomes'];
  if (requiredArrays.some((key) => !Array.isArray(value[key]))) throw new Error('能力数据结构不完整');
  const state = value as unknown as AbilityState;
  validateAbilityState(state);
  return state;
}

export function createInitialAbilityState(): AbilityState {
  return {
    schemaVersion: 1,
    trees: [],
    phases: [],
    nodes: [],
    dependencies: [],
    parallelGroups: [],
    masteryCriteria: [],
    taskLinks: [],
    outcomes: [],
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
    state.phases.push({ id: 'legacy-phase-career', skillTreeId: careerTree.id, name: '职业技能', description: '', order: 0 });
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
    state.phases.push({ id: 'legacy-phase-side', skillTreeId: sideTree.id, name: '学习实践', description: '', order: 0 });
    learning.forEach((item, index) => {
      const progress = Math.max(0, numberValue(item.progress));
      state.nodes.push({
        id: `legacy-node-learning-${text(item.id, String(index + 1))}`,
        skillTreeId: sideTree?.id as string,
        phaseId: 'legacy-phase-side',
        name: text(item.title, `学习项目 ${index + 1}`),
        description: text(item.link),
        progress: progress >= 1 ? 'mastered' : progress > 0 ? 'in_progress' : 'available',
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
      return parseAbilityState(JSON.parse(raw));
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
