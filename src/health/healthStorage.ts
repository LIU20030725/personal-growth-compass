import { emptyHealthState, type HealthState } from './types';

export const HEALTH_STORAGE_KEY = 'dice-life.health-system.v1';
export const HEALTH_BACKUP_KEY = 'dice-life.health-system.v1.backup';
export const HEALTH_CORRUPT_PREFIX = 'dice-life.health-system.corrupt';
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function isState(value: unknown): value is HealthState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return v.schemaVersion === 1 && Array.isArray(v.heightHistory) && Array.isArray(v.bodyRecords) &&
    Array.isArray(v.mealRecords) && Array.isArray(v.dailyRecords) && Array.isArray(v.exerciseDefinitions) &&
    Array.isArray(v.workoutSessions) && Array.isArray(v.revisions) && !!v.preferences && !!v.meta;
}
export function exportHealthState(state: HealthState) { return JSON.stringify({ format: 'dice-life-health', version: 1, exportedAt: new Date().toISOString(), state }); }
export function importHealthState(raw: string): HealthState {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('导入文件无法解析'); }
  const obj = value as Record<string, unknown>;
  const state = obj?.format === 'dice-life-health' ? obj.state : value;
  if (!isState(state)) throw new Error('导入文件不完整');
  return state;
}
export type HealthBackupBundle={format:'dice-life-health-bundle';version:1;exportedAt:string;state:HealthState;media:Array<{id:string;type:string;dataUrl:string}>};
export function importHealthBundle(raw:string):HealthBackupBundle{
  let value:unknown;try{value=JSON.parse(raw)}catch{throw new Error('导入文件无法解析')}
  const bundle=value as Partial<HealthBackupBundle>;
  if(bundle.format!=='dice-life-health-bundle'||bundle.version!==1||!isState(bundle.state)||!Array.isArray(bundle.media))throw new Error('导入文件不完整');
  if(!bundle.media.every(item=>item&&typeof item.id==='string'&&typeof item.type==='string'&&typeof item.dataUrl==='string'))throw new Error('导入媒体不完整');
  return bundle as HealthBackupBundle;
}
export function createHealthStorage(storage: StorageLike, now = () => new Date().toISOString()) {
  return {
    load(): HealthState {
      const current = storage.getItem(HEALTH_STORAGE_KEY);
      if (!current) return emptyHealthState(now());
      try { return importHealthState(current); } catch {
        try { storage.setItem(`${HEALTH_CORRUPT_PREFIX}.${Date.now()}`, current); } catch { /* best effort */ }
        const backup = storage.getItem(HEALTH_BACKUP_KEY);
        if (backup) try { return importHealthState(backup); } catch { /* fall through */ }
        return emptyHealthState(now());
      }
    },
    save(state: HealthState) {
      if (!isState(state)) throw new Error('健康数据不合法');
      const current = storage.getItem(HEALTH_STORAGE_KEY);
      if (current) { try { importHealthState(current); storage.setItem(HEALTH_BACKUP_KEY, current); } catch { /* never promote corrupt current */ } }
      storage.setItem(HEALTH_STORAGE_KEY, exportHealthState(state));
    }
  };
}
export const getBrowserHealthStorage = () => createHealthStorage(window.localStorage);
