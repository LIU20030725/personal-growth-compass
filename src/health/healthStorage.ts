import { emptyHealthState, type HealthState } from "./types";

export const HEALTH_STORAGE_KEY = "dice-life.health-system.v1";
export const HEALTH_BACKUP_KEY = "dice-life.health-system.v1.backup";
export const HEALTH_CORRUPT_PREFIX = "dice-life.health-system.corrupt";
export const MAX_IMPORT_BYTES = 25 * 1024 * 1024;
export const MAX_MEDIA_FILES = 150;
type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type Envelope = {
  format: "dice-life-health";
  version: 1;
  exportedAt: string;
  checksum: string;
  state: HealthState;
};
export type HealthBackupBundle = {
  format: "dice-life-health-bundle";
  version: 1;
  exportedAt: string;
  manifest: { recordCount: number; mediaCount: number; checksum: string };
  state: HealthState;
  media: Array<{ id: string; type: string; dataUrl: string }>;
};

const dangerousKeys = new Set(["__proto__", "prototype", "constructor"]);
function assertSafeTree(value: unknown, seen = new Set<unknown>()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    if (dangerousKeys.has(key)) throw new Error("导入文件包含不安全字段");
    assertSafeTree(child, seen);
  }
}
function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  return `{${Object.keys(value as object)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`,
    )
    .join(",")}}`;
}
export function checksum(value: unknown) {
  let hash = 2166136261;
  const input = stable(value);
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
function parse(raw: string) {
  if (new Blob([raw]).size > MAX_IMPORT_BYTES)
    throw new Error("导入文件超过 25 MB 上限");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("导入文件无法解析");
  }
  assertSafeTree(value);
  return value;
}
function isState(value: unknown): value is HealthState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.schemaVersion === 1 &&
    Array.isArray(v.heightHistory) &&
    Array.isArray(v.bodyRecords) &&
    Array.isArray(v.mealRecords) &&
    Array.isArray(v.dailyRecords) &&
    Array.isArray(v.exerciseDefinitions) &&
    Array.isArray(v.workoutSessions) &&
    Array.isArray(v.revisions) &&
    !!v.preferences &&
    !!v.meta
  );
}
function ids(state: HealthState) {
  return [
    ...state.heightHistory,
    ...state.bodyRecords,
    ...state.mealRecords,
    ...state.dailyRecords,
    ...state.exerciseDefinitions,
    ...state.workoutSessions,
    ...state.revisions,
  ].map((item) => item.id);
}
function validateState(state: HealthState) {
  for (const collection of [
    state.heightHistory,
    state.bodyRecords,
    state.mealRecords,
    state.dailyRecords,
    state.exerciseDefinitions,
    state.workoutSessions,
    state.revisions,
  ]) {
    const collectionIds = collection.map((item) => item.id);
    if (new Set(collectionIds).size !== collectionIds.length)
      throw new Error("导入数据包含重复 ID");
  }
  const exerciseIds = new Set(state.exerciseDefinitions.map((x) => x.id));
  for (const workout of state.workoutSessions)
    for (const entry of workout.entries)
      if (!exerciseIds.has(entry.exerciseDefinitionId))
        throw new Error("训练记录引用了不存在的项目");
}
export function exportHealthState(state: HealthState) {
  const payload = {
    format: "dice-life-health" as const,
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    state,
  };
  return JSON.stringify({ ...payload, checksum: checksum(payload.state) });
}
export function importHealthState(raw: string): HealthState {
  const value = parse(raw) as Partial<Envelope> & Partial<HealthState>;
  const state = value.format === "dice-life-health" ? value.state : value;
  if (!isState(state)) throw new Error("导入文件不完整或版本不受支持");
  if (value.format === "dice-life-health" && value.checksum !== checksum(state))
    throw new Error("导入文件校验失败");
  validateState(state);
  return state;
}
export function createHealthBundle(
  state: HealthState,
  media: Array<{ id: string; type: string; dataUrl: string }>,
  exportedAt: string,
): HealthBackupBundle {
  const core = JSON.parse(JSON.stringify({ state, media })) as {
    state: HealthState;
    media: Array<{ id: string; type: string; dataUrl: string }>;
  };
  return {
    format: "dice-life-health-bundle",
    version: 1,
    exportedAt,
    manifest: {
      recordCount: ids(core.state).length,
      mediaCount: core.media.length,
      checksum: checksum(core),
    },
    ...core,
  };
}
export function importHealthBundle(raw: string): HealthBackupBundle {
  const bundle = parse(raw) as Partial<HealthBackupBundle>;
  if (
    bundle.format !== "dice-life-health-bundle" ||
    bundle.version !== 1 ||
    !isState(bundle.state) ||
    !Array.isArray(bundle.media) ||
    !bundle.manifest
  )
    throw new Error("导入文件不完整或版本不受支持");
  if (bundle.media.length > MAX_MEDIA_FILES)
    throw new Error(`媒体文件不能超过 ${MAX_MEDIA_FILES} 个`);
  if (
    !bundle.media.every(
      (item) =>
        item &&
        typeof item.id === "string" &&
        /^[\w.-]{1,128}$/.test(item.id) &&
        ["image/jpeg", "image/png", "image/webp"].includes(item.type) &&
        typeof item.dataUrl === "string" &&
        item.dataUrl.startsWith(`data:${item.type};base64,`),
    )
  )
    throw new Error("导入媒体格式不受支持");
  validateState(bundle.state);
  const mediaIds = bundle.media.map((x) => x.id);
  if (new Set(mediaIds).size !== mediaIds.length)
    throw new Error("导入媒体包含重复 ID");
  const referenced = new Set(
    bundle.state.mealRecords.flatMap((x) => x.mediaIds),
  );
  if (
    mediaIds.some((id) => !referenced.has(id)) ||
    [...referenced].some((id) => !mediaIds.includes(id))
  )
    throw new Error("导入包包含孤儿媒体或缺失照片");
  if (
    bundle.manifest.mediaCount !== bundle.media.length ||
    bundle.manifest.recordCount !== ids(bundle.state).length ||
    bundle.manifest.checksum !==
      checksum({ state: bundle.state, media: bundle.media })
  )
    throw new Error("导入文件校验失败");
  return bundle as HealthBackupBundle;
}
export function previewHealthBundle(raw: string) {
  const bundle = importHealthBundle(raw);
  return {
    bundle,
    summary: {
      records: bundle.manifest.recordCount,
      media: bundle.manifest.mediaCount,
      updatedAt: bundle.state.meta.updatedAt,
    },
  };
}
export function createHealthStorage(
  storage: StorageLike,
  now = () => new Date().toISOString(),
) {
  return {
    load(): HealthState {
      const current = storage.getItem(HEALTH_STORAGE_KEY);
      if (!current) return emptyHealthState(now());
      try {
        return importHealthState(current);
      } catch {
        try {
          storage.setItem(`${HEALTH_CORRUPT_PREFIX}.${Date.now()}`, current);
        } catch {}
        const backup = storage.getItem(HEALTH_BACKUP_KEY);
        if (backup)
          try {
            return importHealthState(backup);
          } catch {}
        return emptyHealthState(now());
      }
    },
    save(state: HealthState) {
      validateState(state);
      const next = exportHealthState(state);
      const current = storage.getItem(HEALTH_STORAGE_KEY);
      if (current)
        try {
          importHealthState(current);
          storage.setItem(HEALTH_BACKUP_KEY, current);
        } catch {}
      try {
        storage.setItem(HEALTH_STORAGE_KEY, next);
      } catch (error) {
        if (current)
          try {
            storage.setItem(HEALTH_STORAGE_KEY, current);
          } catch {}
        throw new Error(
          error instanceof Error
            ? `本地空间不足，原数据已保留：${error.message}`
            : "本地空间不足，原数据已保留",
        );
      }
    },
  };
}
export const getBrowserHealthStorage = () =>
  createHealthStorage(window.localStorage);
