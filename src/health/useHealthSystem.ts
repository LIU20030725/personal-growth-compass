import { useMemo, useState } from "react";
import { calculateBmiHundredths, kilogramsToGrams } from "./healthEngine";
import { getBrowserHealthStorage } from "./healthStorage";
import {
  exportHealthState,
  importHealthBundle,
  importHealthState,
} from "./healthStorage";
import {
  createIndexedDbHealthMediaStore,
  type HealthMediaStore,
} from "./healthMediaStore";
import type {
  DailyMetric,
  ExerciseMode,
  HealthState,
  MealRecord,
  RecordStatus,
  WorkoutSession,
} from "./types";

type HealthStorage = ReturnType<typeof getBrowserHealthStorage>;
type Options = {
  storage?: HealthStorage;
  mediaStore?: HealthMediaStore;
  now?: () => string;
  idFactory?: () => string;
};
const makeId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export function useHealthSystem(options: Options = {}) {
  const storage = useMemo(
    () => options.storage ?? getBrowserHealthStorage(),
    [options.storage],
  );
  const mediaStore = useMemo(
    () => options.mediaStore ?? createIndexedDbHealthMediaStore(),
    [options.mediaStore],
  );
  const now = options.now ?? (() => new Date().toISOString());
  const idFactory = options.idFactory ?? makeId;
  const [state, setState] = useState<HealthState>(() => storage.load());
  const [error, setError] = useState("");
  const [draftWorkout, setDraftWorkout] = useState<WorkoutSession>();
  const commit = (next: HealthState) => {
    storage.save(next);
    setState(next);
  };
  const mutate = (fn: (s: HealthState) => HealthState) => {
    try {
      setError("");
      commit(fn(state));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
      return false;
    }
  };
  const height = [...state.heightHistory].sort((a, b) =>
    b.effectiveAt.localeCompare(a.effectiveAt),
  )[0];

  const setHeight = (centimeters: number) =>
    mutate((s) => {
      if (
        !Number.isFinite(centimeters) ||
        centimeters < 50 ||
        centimeters > 250
      )
        throw new Error("请填写 50–250 cm 之间的身高");
      return {
        ...s,
        heightHistory: [
          ...s.heightHistory,
          {
            id: idFactory(),
            heightMm: Math.round(centimeters * 10),
            effectiveAt: now(),
            createdAt: now(),
          },
        ],
        meta: { ...s.meta, updatedAt: now() },
      };
    });
  const addBodyRecord = (input: {
    heightCm?: number;
    weightKg?: number;
    bodyFatPercent?: number;
    bodyFatMethod?: string;
    note?: string;
  }) =>
    mutate((s) => {
      if (
        input.heightCm === undefined &&
        input.weightKg === undefined &&
        input.bodyFatPercent === undefined
      )
        throw new Error("请至少填写身高、体重或体脂率中的一项");
      if (
        input.heightCm !== undefined &&
        (!Number.isFinite(input.heightCm) ||
          input.heightCm < 50 ||
          input.heightCm > 250)
      )
        throw new Error("请填写 50–250 cm 之间的身高");
      if (
        input.weightKg !== undefined &&
        (!Number.isFinite(input.weightKg) ||
          input.weightKg < 20 ||
          input.weightKg > 500)
      )
        throw new Error("请填写 20–500 kg 之间的体重");
      if (
        input.bodyFatPercent !== undefined &&
        (!Number.isFinite(input.bodyFatPercent) ||
          input.bodyFatPercent < 0 ||
          input.bodyFatPercent > 100)
      )
        throw new Error("请填写 0–100% 之间的体脂率");
      const weightGrams =
        input.weightKg === undefined
          ? undefined
          : kilogramsToGrams(input.weightKg);
      const heightMmSnapshot =
        input.heightCm === undefined
          ? height?.heightMm
          : Math.round(input.heightCm * 10);
      const timestamp = now();
      const heightHistory =
        input.heightCm === undefined
          ? s.heightHistory
          : [
              ...s.heightHistory,
              {
                id: idFactory(),
                heightMm: heightMmSnapshot!,
                effectiveAt: timestamp,
                createdAt: timestamp,
              },
            ];
      return {
        ...s,
        heightHistory,
        bodyRecords: [
          {
            id: idFactory(),
            measuredAt: timestamp,
            weightGrams,
            bodyFatBasisPoints:
              input.bodyFatPercent === undefined
                ? undefined
                : Math.round(input.bodyFatPercent * 100),
            bodyFatMethod: input.bodyFatMethod?.trim() || undefined,
            heightMmSnapshot,
            bmiHundredths: calculateBmiHundredths(
              weightGrams,
              heightMmSnapshot,
            ),
            note: input.note,
            status: "active",
            createdAt: timestamp,
            updatedAt: timestamp,
          },
          ...s.bodyRecords,
        ],
        meta: { ...s.meta, updatedAt: timestamp },
      };
    });
  const reviseBodyRecord = (
    id: string,
    input: { weightKg?: number; bodyFatPercent?: number },
  ) =>
    mutate((s) => {
      const before = s.bodyRecords.find((r) => r.id === id);
      if (!before) return s;
      const timestamp = now();
      const after = {
        ...before,
        weightGrams:
          input.weightKg === undefined
            ? before.weightGrams
            : kilogramsToGrams(input.weightKg),
        bodyFatBasisPoints:
          input.bodyFatPercent === undefined
            ? before.bodyFatBasisPoints
            : Math.round(input.bodyFatPercent * 100),
        updatedAt: timestamp,
      };
      after.bmiHundredths = calculateBmiHundredths(
        after.weightGrams,
        after.heightMmSnapshot,
      );
      return {
        ...s,
        bodyRecords: s.bodyRecords.map((r) => (r.id === id ? after : r)),
        revisions: [
          ...s.revisions,
          {
            id: idFactory(),
            entityType: "body",
            entityId: id,
            before,
            after,
            revisedAt: timestamp,
          },
        ],
        meta: { ...s.meta, updatedAt: timestamp },
      };
    });
  const addWater = (milliliters: number) =>
    mutate((s) => {
      const t = now();
      return {
        ...s,
        dailyRecords: [
          {
            id: idFactory(),
            occurredAt: t,
            payload: { kind: "water", milliliters },
            status: "active",
            createdAt: t,
            updatedAt: t,
          },
          ...s.dailyRecords,
        ],
        meta: { ...s.meta, updatedAt: t },
      };
    });
  const addActivity = (count: number) =>
    mutate((s) => {
      const t = now();
      return {
        ...s,
        dailyRecords: [
          {
            id: idFactory(),
            occurredAt: t,
            payload:
              s.preferences.activityMode === "steps"
                ? { kind: "steps", count }
                : { kind: "activity-minutes", minutes: count },
            status: "active",
            createdAt: t,
            updatedAt: t,
          },
          ...s.dailyRecords,
        ],
      };
    });
  const addEnergy = (level: 1 | 2 | 3 | 4 | 5) =>
    mutate((s) => {
      const t = now();
      return {
        ...s,
        dailyRecords: [
          {
            id: idFactory(),
            occurredAt: t,
            payload: { kind: "energy", level },
            status: "active",
            createdAt: t,
            updatedAt: t,
          },
          ...s.dailyRecords,
        ],
      };
    });
  const toggleMetric = (metric: DailyMetric) =>
    mutate((s) => ({
      ...s,
      preferences: {
        ...s.preferences,
        enabledDailyMetrics: s.preferences.enabledDailyMetrics.includes(metric)
          ? s.preferences.enabledDailyMetrics.filter((x) => x !== metric)
          : [...s.preferences.enabledDailyMetrics, metric],
      },
    }));
  const addSleep = (input: {
    startAt?: string;
    endAt?: string;
    durationMinutes: number;
    quality?: 1 | 2 | 3 | 4 | 5;
  }) =>
    mutate((s) => {
      const t = now();
      return {
        ...s,
        dailyRecords: [
          {
            id: idFactory(),
            occurredAt: input.endAt ?? t,
            payload: { kind: "sleep", ...input },
            status: "active",
            createdAt: t,
            updatedAt: t,
          },
          ...s.dailyRecords,
        ],
      };
    });
  const addMeal = (input: {
    mealType: MealRecord["mealType"];
    description?: string;
    mediaIds?: string[];
    satiety?: MealRecord["satiety"];
    note?: string;
  }) =>
    mutate((s) => {
      if (!input.description?.trim() && !input.mediaIds?.length)
        throw new Error("请填写餐食内容或添加照片");
      if ((input.mediaIds?.length ?? 0) > 3)
        throw new Error("每餐最多保存 3 张照片");
      const t = now();
      return {
        ...s,
        mealRecords: [
          {
            id: idFactory(),
            eatenAt: t,
            description: input.description?.trim(),
            mealType: input.mealType,
            mediaIds: input.mediaIds ?? [],
            satiety: input.satiety,
            note: input.note,
            status: "active",
            createdAt: t,
            updatedAt: t,
          },
          ...s.mealRecords,
        ],
      };
    });
  const addMealWithPhotos = async (input: {
    mealType: MealRecord["mealType"];
    description?: string;
    photos: Blob[];
    satiety?: MealRecord["satiety"];
  }) => {
    if (input.photos.length > 3) {
      setError("每餐最多保存 3 张照片");
      return false;
    }
    const ids = input.photos.map(() => idFactory());
    const written: string[] = [];
    try {
      for (let i = 0; i < input.photos.length; i++) {
        await mediaStore.put(ids[i], input.photos[i]);
        written.push(ids[i]);
      }
      const saved = addMeal({ ...input, mediaIds: ids });
      if (!saved) throw new Error("餐食保存失败");
      return true;
    } catch (e) {
      await Promise.all(
        written.map((id) => mediaStore.remove(id).catch(() => undefined)),
      );
      setError(e instanceof Error ? e.message : "照片保存失败");
      return false;
    }
  };
  const addExercise = (input: {
    name: string;
    mode: ExerciseMode;
    displayUnit: string;
    defaultRestSeconds?: number;
  }) => {
    const id = idFactory();
    mutate((s) => ({
      ...s,
      exerciseDefinitions: [
        ...s.exerciseDefinitions,
        {
          id,
          name: input.name.trim(),
          mode: input.mode,
          displayUnit: input.displayUnit,
          defaultRestSeconds: input.defaultRestSeconds,
          createdAt: now(),
        },
      ],
    }));
    return id;
  };
  const saveQuickWorkout = (input: {
    exerciseDefinitionId: string;
    sets?: Array<{
      weightKg?: number;
      reps?: number;
      durationSeconds?: number;
    }>;
    distanceMeters?: number;
    durationSeconds?: number;
  }) =>
    mutate((s) => {
      const t = now();
      return {
        ...s,
        workoutSessions: [
          {
            id: idFactory(),
            startedAt: t,
            endedAt: t,
            state: "completed",
            source: "quick-entry",
            entries: [
              {
                id: idFactory(),
                exerciseDefinitionId: input.exerciseDefinitionId,
                order: 0,
                distanceMeters: input.distanceMeters,
                durationSeconds: input.durationSeconds,
                sets: input.sets?.map((set, i) => ({
                  id: idFactory(),
                  order: i,
                  weightGrams:
                    set.weightKg === undefined
                      ? undefined
                      : kilogramsToGrams(set.weightKg),
                  reps: set.reps,
                  durationSeconds: set.durationSeconds,
                  completedAt: t,
                })),
              },
            ],
            createdAt: t,
            updatedAt: t,
          },
          ...s.workoutSessions,
        ],
      };
    });
  const copyLastWorkout = () => {
    const last = state.workoutSessions.find((w) => w.state === "completed");
    if (!last) return false;
    const t = now();
    setDraftWorkout({
      ...last,
      id: idFactory(),
      startedAt: t,
      endedAt: undefined,
      state: "draft",
      source: "copied",
      createdAt: t,
      updatedAt: t,
      entries: last.entries.map((e) => ({
        ...e,
        id: idFactory(),
        sets: e.sets?.map((set) => ({
          ...set,
          id: idFactory(),
          completedAt: undefined,
          actualRestSeconds: undefined,
        })),
      })),
    });
    return true;
  };
  const exportData = () => exportHealthState(state);
  const exportBundle = async () =>
    JSON.stringify({
      format: "dice-life-health-bundle",
      version: 1,
      exportedAt: now(),
      state,
      media: await Promise.all(
        (await mediaStore.exportAll()).map(async (item) => ({
          id: item.id,
          type: item.type,
          dataUrl: await blobToDataUrl(item.blob),
        })),
      ),
    });
  const importData = (raw: string) => {
    try {
      const next = importHealthState(raw);
      commit(next);
      setError("");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "导入失败");
      return false;
    }
  };
  const importBundle = async (raw: string) => {
    const written: string[] = [];
    try {
      const bundle = importHealthBundle(raw);
      for (const item of bundle.media) {
        await mediaStore.put(item.id, dataUrlToBlob(item.dataUrl, item.type));
        written.push(item.id);
      }
      commit(bundle.state);
      setError("");
      return true;
    } catch (e) {
      await Promise.all(
        written.map((id) => mediaStore.remove(id).catch(() => undefined)),
      );
      setError(e instanceof Error ? e.message : "导入失败");
      return false;
    }
  };
  const changeStatus = (
    kind: "body" | "meal" | "daily" | "workout",
    id: string,
    status: RecordStatus,
  ) =>
    mutate((s) => {
      const deletedAt = status === "deleted" ? now() : undefined;
      const patch = <
        T extends {
          id: string;
          status?: RecordStatus;
          state?: string;
          deletedAt?: string;
        },
      >(
        items: T[],
      ) =>
        items.map((x) =>
          x.id === id
            ? {
                ...x,
                ...(kind === "workout"
                  ? { state: status === "deleted" ? "deleted" : "completed" }
                  : { status }),
                deletedAt,
              }
            : x,
        );
      return {
        ...s,
        bodyRecords: kind === "body" ? patch(s.bodyRecords) : s.bodyRecords,
        mealRecords: kind === "meal" ? patch(s.mealRecords) : s.mealRecords,
        dailyRecords: kind === "daily" ? patch(s.dailyRecords) : s.dailyRecords,
        workoutSessions:
          kind === "workout" ? patch(s.workoutSessions) : s.workoutSessions,
      };
    });

  const today = now().slice(0, 10);
  return {
    state,
    error,
    draftWorkout,
    clearError: () => setError(""),
    height: height?.heightMm,
    bodyRecords: state.bodyRecords.filter((r) => r.status === "active"),
    meals: state.mealRecords.filter((r) => r.status === "active"),
    daily: state.dailyRecords.filter((r) => r.status === "active"),
    workouts: state.workoutSessions.filter((r) => r.state === "completed"),
    deleted: {
      body: state.bodyRecords.filter((r) => r.status === "deleted"),
      meals: state.mealRecords.filter((r) => r.status === "deleted"),
      daily: state.dailyRecords.filter((r) => r.status === "deleted"),
      workouts: state.workoutSessions.filter((r) => r.state === "deleted"),
    },
    exercises: state.exerciseDefinitions,
    revisions: state.revisions,
    preferences: state.preferences,
    todayWaterMl: state.dailyRecords
      .filter(
        (r) =>
          r.status === "active" &&
          r.occurredAt.slice(0, 10) === today &&
          r.payload.kind === "water",
      )
      .reduce(
        (n, r) => n + (r.payload.kind === "water" ? r.payload.milliliters : 0),
        0,
      ),
    setHeight,
    addBodyRecord,
    reviseBodyRecord,
    addWater,
    addSleep,
    addActivity,
    addEnergy,
    toggleMetric,
    addMeal,
    addMealWithPhotos,
    addExercise,
    saveQuickWorkout,
    copyLastWorkout,
    exportData,
    exportBundle,
    importData,
    importBundle,
    softDelete: (kind: "body" | "meal" | "daily" | "workout", id: string) =>
      changeStatus(kind, id, "deleted"),
    restore: (kind: "body" | "meal" | "daily" | "workout", id: string) =>
      changeStatus(kind, id, "active"),
  };
}
function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
function dataUrlToBlob(dataUrl: string, type: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}
