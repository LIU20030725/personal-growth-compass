import { useMemo, useRef, useState } from "react";
import {
  calculateBmiHundredths,
  kilogramsToGrams,
  localDateKey,
  validateActivity,
  validateSleepMinutes,
  validateWaterMl,
  validateWorkoutInput,
} from "./healthEngine";
import { getBrowserHealthStorage } from "./healthStorage";
import {
  exportHealthState,
  createHealthBundle,
  importHealthBundle,
  importHealthState,
  previewHealthBundle,
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
  const stateRef = useRef(state);
  const recentSubmissions = useRef(new Map<string, number>());
  const [error, setError] = useState("");
  const [draftWorkout, setDraftWorkout] = useState<WorkoutSession | undefined>(
    () => state.workoutSessions.find((w) => w.state === "draft"),
  );
  const commit = (next: HealthState) => {
    storage.save(next);
    stateRef.current = next;
    setState(next);
  };
  const mutate = (fn: (s: HealthState) => HealthState) => {
    try {
      setError("");
      commit(fn(stateRef.current));
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
  }) => {
    const submissionKey = JSON.stringify(input);
    const timestampMs = Date.now();
    if (timestampMs - (recentSubmissions.current.get(submissionKey) ?? 0) < 800)
      return false;
    const saved = mutate((s) => {
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
    if (saved) recentSubmissions.current.set(submissionKey, timestampMs);
    return saved;
  };
  const reviseBodyRecord = (
    id: string,
    input: { weightKg?: number; bodyFatPercent?: number; reason?: string },
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
            reason: input.reason?.trim() || undefined,
            revisedAt: timestamp,
          },
        ],
        meta: { ...s.meta, updatedAt: timestamp },
      };
    });
  const addWater = (milliliters: number) =>
    mutate((s) => {
      validateWaterMl(milliliters);
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
      validateActivity(count, s.preferences.activityMode);
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
      if (!Number.isInteger(level) || level < 1 || level > 5)
        throw new Error("精力需在 1–5 之间");
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
  const setActivityMode = (mode: "steps" | "activity-minutes") =>
    mutate((s) => ({
      ...s,
      preferences: { ...s.preferences, activityMode: mode },
      meta: { ...s.meta, updatedAt: now() },
    }));
  const addSleep = (input: {
    startAt?: string;
    endAt?: string;
    durationMinutes: number;
    quality?: 1 | 2 | 3 | 4 | 5;
  }) =>
    mutate((s) => {
      validateSleepMinutes(input.durationMinutes);
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
      if ((input.description?.length ?? 0) > 500)
        throw new Error("餐食内容最多 500 字");
      if ((input.note?.length ?? 0) > 300) throw new Error("备注最多 300 字");
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
    if (
      input.photos.some(
        (photo) =>
          !["image/jpeg", "image/png", "image/webp"].includes(photo.type),
      )
    ) {
      setError("照片仅支持 JPG、PNG 或 WebP");
      return false;
    }
    if (input.photos.some((photo) => photo.size > 8 * 1024 * 1024)) {
      setError("单张照片不能超过 8 MB");
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
      validateWorkoutInput(input);
      if (
        !s.exerciseDefinitions.some(
          (x) => x.id === input.exerciseDefinitionId && !x.archivedAt,
        )
      )
        throw new Error("训练项目不存在或已归档");
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
    const last = stateRef.current.workoutSessions.find(
      (w) => w.state === "completed",
    );
    if (!last) return false;
    const t = now();
    const draft = {
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
    } as WorkoutSession;
    mutate((s) => ({
      ...s,
      workoutSessions: [draft, ...s.workoutSessions],
      meta: { ...s.meta, updatedAt: t },
    }));
    setDraftWorkout(draft);
    return true;
  };
  const discardDraftWorkout = () => {
    if (!draftWorkout) return false;
    const id = draftWorkout.id;
    const ok = mutate((s) => ({
      ...s,
      workoutSessions: s.workoutSessions.map((w) =>
        w.id === id
          ? { ...w, state: "discarded" as const, updatedAt: now() }
          : w,
      ),
    }));
    if (ok) setDraftWorkout(undefined);
    return ok;
  };
  const exportData = () => exportHealthState(stateRef.current);
  const exportBundle = async () =>
    JSON.stringify(
      createHealthBundle(
        stateRef.current,
        await Promise.all(
          (await mediaStore.exportAll()).map(async (item) => ({
            id: item.id,
            type: item.type,
            dataUrl: await blobToDataUrl(item.blob),
          })),
        ),
        now(),
      ),
    );
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
    try {
      const bundle = importHealthBundle(raw);
      const previous = await mediaStore.exportAll();
      try {
        await mediaStore.replaceAll(
          bundle.media.map((item) => ({
            id: item.id,
            blob: dataUrlToBlob(item.dataUrl, item.type),
          })),
        );
        commit(bundle.state);
      } catch (error) {
        await mediaStore.replaceAll(
          previous.map((item) => ({ id: item.id, blob: item.blob })),
        );
        throw error;
      }
      setError("");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "导入失败");
      return false;
    }
  };
  const previewBundle = (raw: string) => {
    try {
      const result = previewHealthBundle(raw);
      setError("");
      return result.summary;
    } catch (e) {
      setError(e instanceof Error ? e.message : "导入预检失败");
      return undefined;
    }
  };
  const permanentlyDeleteMeal = async (id: string) => {
    const meal = stateRef.current.mealRecords.find(
      (x) => x.id === id && x.status === "deleted",
    );
    if (!meal) {
      setError("只能永久删除垃圾箱中的餐食");
      return false;
    }
    try {
      for (const mediaId of meal.mediaIds) await mediaStore.remove(mediaId);
      const ok = mutate((s) => ({
        ...s,
        mealRecords: s.mealRecords.filter((x) => x.id !== id),
      }));
      await mediaStore.removeOrphans(
        new Set(stateRef.current.mealRecords.flatMap((x) => x.mediaIds)),
      );
      return ok;
    } catch (e) {
      setError(e instanceof Error ? e.message : "永久删除失败");
      return false;
    }
  };
  const archiveExercise = (id: string) =>
    mutate((s) => ({
      ...s,
      exerciseDefinitions: s.exerciseDefinitions.map((x) =>
        x.id === id ? { ...x, archivedAt: now() } : x,
      ),
    }));
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

  const today = localDateKey(now());
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
          localDateKey(r.occurredAt) === today &&
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
    setActivityMode,
    addMeal,
    addMealWithPhotos,
    addExercise,
    saveQuickWorkout,
    copyLastWorkout,
    discardDraftWorkout,
    archiveExercise,
    exportData,
    exportBundle,
    importData,
    importBundle,
    previewBundle,
    permanentlyDeleteMeal,
    getMedia: (id: string) => mediaStore.get(id),
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
