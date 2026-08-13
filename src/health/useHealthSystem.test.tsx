import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createHealthStorage } from "./healthStorage";
import { createMemoryHealthMediaStore } from "./healthMediaStore";
import { useHealthSystem } from "./useHealthSystem";

const memory = () => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
};

describe("useHealthSystem", () => {
  it("deduplicates the same rapid body submission", () => {
    const { result } = renderHook(() =>
      useHealthSystem({
        storage: createHealthStorage(memory()),
        now: () => "2026-08-14T08:00:00Z",
      }),
    );
    act(() => {
      result.current.addBodyRecord({ weightKg: 70 });
      result.current.addBodyRecord({ weightKg: 70 });
    });
    expect(result.current.bodyRecords).toHaveLength(1);
  });
  it("does not lose rapid sequential records from the same render", () => {
    const { result } = renderHook(() =>
      useHealthSystem({
        storage: createHealthStorage(memory()),
        now: () => "2026-08-14T08:00:00Z",
      }),
    );
    act(() => {
      result.current.addWater(250);
      result.current.addWater(350);
    });
    expect(result.current.todayWaterMl).toBe(600);
    expect(result.current.daily).toHaveLength(2);
  });
  it("creates body records with immutable BMI snapshots and revisions", () => {
    const { result } = renderHook(() =>
      useHealthSystem({
        storage: createHealthStorage(memory()),
        now: () => "2026-08-14T08:00:00Z",
        idFactory: (() => {
          let i = 0;
          return () => `id-${++i}`;
        })(),
      }),
    );
    act(() => result.current.setHeight(175));
    act(() =>
      result.current.addBodyRecord({ weightKg: 70, bodyFatPercent: 18 }),
    );
    expect(result.current.bodyRecords[0]).toMatchObject({
      weightGrams: 70000,
      bmiHundredths: 2286,
      heightMmSnapshot: 1750,
    });
    act(() =>
      result.current.reviseBodyRecord(result.current.bodyRecords[0].id, {
        weightKg: 69,
      }),
    );
    expect(result.current.revisions).toHaveLength(1);
  });

  it("rejects implausible body inputs before they can pollute trends", () => {
    const { result } = renderHook(() =>
      useHealthSystem({
        storage: createHealthStorage(memory()),
        now: () => "2026-08-14T08:00:00Z",
      }),
    );
    act(() =>
      result.current.addBodyRecord({ weightKg: -1, bodyFatPercent: 120 }),
    );
    expect(result.current.bodyRecords).toHaveLength(0);
    expect(result.current.error).toMatch(/20–500 kg/);
    act(() => result.current.addBodyRecord({ heightCm: 12, weightKg: 70 }));
    expect(result.current.bodyRecords).toHaveLength(0);
    expect(result.current.state.heightHistory).toHaveLength(0);
    expect(result.current.error).toMatch(/50–250 cm/);
  });

  it("records daily water and meals, then soft-deletes and restores them", () => {
    const { result } = renderHook(() =>
      useHealthSystem({
        storage: createHealthStorage(memory()),
        now: () => "2026-08-14T08:00:00Z",
        idFactory: (() => {
          let i = 0;
          return () => `id-${++i}`;
        })(),
      }),
    );
    act(() => result.current.addWater(350));
    act(() =>
      result.current.addMeal({
        mealType: "breakfast",
        description: "鸡蛋和面包",
        satiety: "comfortable",
      }),
    );
    expect(result.current.todayWaterMl).toBe(350);
    const meal = result.current.meals[0];
    act(() => result.current.softDelete("meal", meal.id));
    expect(result.current.meals).toHaveLength(0);
    act(() => result.current.restore("meal", meal.id));
    expect(result.current.meals).toHaveLength(1);
  });

  it("creates an exercise and completes a structured workout session", () => {
    const { result } = renderHook(() =>
      useHealthSystem({
        storage: createHealthStorage(memory()),
        now: () => "2026-08-14T08:00:00Z",
        idFactory: (() => {
          let i = 0;
          return () => `id-${++i}`;
        })(),
      }),
    );
    let exerciseId = "";
    act(() => {
      exerciseId = result.current.addExercise({
        name: "卧推",
        mode: "weight-reps",
        displayUnit: "kg",
        defaultRestSeconds: 90,
      });
    });
    act(() =>
      result.current.saveQuickWorkout({
        exerciseDefinitionId: exerciseId,
        sets: [
          { weightKg: 50, reps: 10 },
          { weightKg: 50, reps: 8 },
        ],
      }),
    );
    expect(result.current.workouts[0].entries[0].sets).toHaveLength(2);
  });

  it("records optional activity and energy and can disable an unneeded metric", () => {
    const { result } = renderHook(() =>
      useHealthSystem({
        storage: createHealthStorage(memory()),
        now: () => "2026-08-14T08:00:00Z",
      }),
    );
    act(() => result.current.addActivity(6200));
    act(() => result.current.addEnergy(4));
    act(() => result.current.toggleMetric("water"));
    expect(result.current.daily.map((r) => r.payload.kind)).toEqual(
      expect.arrayContaining(["steps", "energy"]),
    );
    expect(result.current.preferences.enabledDailyMetrics).not.toContain(
      "water",
    );
  });

  it("copies the last workout as a draft with incomplete sets", () => {
    const { result } = renderHook(() =>
      useHealthSystem({
        storage: createHealthStorage(memory()),
        now: () => "2026-08-14T08:00:00Z",
      }),
    );
    let id = "";
    act(() => {
      id = result.current.addExercise({
        name: "卧推",
        mode: "weight-reps",
        displayUnit: "kg",
      });
    });
    act(() =>
      result.current.saveQuickWorkout({
        exerciseDefinitionId: id,
        sets: [{ weightKg: 50, reps: 10 }],
      }),
    );
    act(() => result.current.copyLastWorkout());
    expect(result.current.draftWorkout?.entries[0].sets?.[0]).toMatchObject({
      weightGrams: 50000,
      reps: 10,
      completedAt: undefined,
    });
  });

  it("exports a versioned envelope and rejects invalid imports without mutation", () => {
    const { result } = renderHook(() =>
      useHealthSystem({
        storage: createHealthStorage(memory()),
        now: () => "2026-08-14T08:00:00Z",
      }),
    );
    const before = result.current.state;
    expect(result.current.exportData()).toContain("dice-life-health");
    act(() => {
      expect(result.current.importData("{bad")).toBe(false);
    });
    expect(result.current.state).toEqual(before);
  });

  it("exports local meal photos in the bundle and rolls back media after a failed import", async () => {
    const mediaStore = createMemoryHealthMediaStore();
    const storage = createHealthStorage(memory());
    const { result } = renderHook(() =>
      useHealthSystem({
        storage,
        mediaStore,
        now: () => "2026-08-14T08:00:00Z",
        idFactory: (() => {
          let i = 0;
          return () => `photo-${++i}`;
        })(),
      }),
    );
    await act(async () => {
      await result.current.addMealWithPhotos({
        mealType: "lunch",
        description: "本地照片",
        photos: [new Blob(["image"], { type: "image/webp" })],
      });
    });
    const exported = JSON.parse(await result.current.exportBundle());
    expect(exported.media).toEqual([
      expect.objectContaining({
        id: "photo-1",
        type: "image/webp",
        dataUrl: expect.stringMatching(/^data:image\/webp;base64,/),
      }),
    ]);

    let replaceCalls = 0;
    const failingMedia = {
      put: async () => {},
      get: async () => undefined,
      remove: async () => {},
      exportAll: async () => [],
      replaceAll: async () => {
        replaceCalls++;
        if (replaceCalls === 1) throw new Error("容量不足");
      },
      removeOrphans: async () => 0,
    };
    const second = renderHook(() =>
      useHealthSystem({
        storage: createHealthStorage(memory()),
        mediaStore: failingMedia,
        now: () => "2026-08-14T08:00:00Z",
      }),
    );
    let ok = false;
    await act(async () => {
      ok = await second.result.current.importBundle(JSON.stringify(exported));
    });
    expect(ok).toBe(false);
    expect(second.result.current.error).toBe("容量不足");
    expect(replaceCalls).toBe(2);
    expect(second.result.current.state.mealRecords).toHaveLength(0);
  });
});
