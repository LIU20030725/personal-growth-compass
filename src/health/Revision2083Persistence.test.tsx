import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createHealthStorage } from "./healthStorage";
import { createMemoryHealthMediaStore } from "./healthMediaStore";
import { emptyHealthState } from "./types";
import { useHealthSystem } from "./useHealthSystem";

const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value), removeItem: (key: string) => void data.delete(key) };
};

describe("revision 2083 persistence compatibility", () => {
  it("persists circumference, food libraries, nutrition, targets and sedentary records across reload", () => {
    const backend = memory();
    const storage = createHealthStorage(backend);
    const mediaStore = createMemoryHealthMediaStore();
    const first = renderHook(() => useHealthSystem({ storage, mediaStore, now: () => "2026-08-15T08:00:00.000Z", idFactory: (() => { let id = 0; return () => `v03-${++id}`; })() }));
    act(() => {
      first.result.current.addBodyRecord({ circumferencesCm: { waist: 78.5, hips: 96 } });
      first.result.current.addFoodCatalogItem({ name: "燕麦碗", kind: "recipe", caloriesPer100g: 128 });
      first.result.current.addMeal({ mealType: "breakfast", foods: [{ id: "food-1", name: "熟米饭", grams: 150, calories: 174 }], description: "熟米饭" });
      first.result.current.updatePreferences({ waterGoalMl: 2000, waterReminderTimes: ["09:00", "15:00"], sedentaryReminderEnabled: true, sedentaryReminderMinutes: 50 });
      first.result.current.addSedentaryBreak(5);
    });
    first.unmount();
    const second = renderHook(() => useHealthSystem({ storage, mediaStore }));
    expect(second.result.current.bodyRecords[0].circumferencesMm).toMatchObject({ waist: 785, hips: 960 });
    expect(second.result.current.state.foodCatalog?.[0]).toMatchObject({ name: "燕麦碗", kind: "recipe" });
    expect(second.result.current.meals[0].foods?.[0]).toMatchObject({ grams: 150, calories: 174 });
    expect(second.result.current.preferences).toMatchObject({ waterGoalMl: 2000, sedentaryReminderEnabled: true, sedentaryReminderMinutes: 50 });
    expect(second.result.current.daily.some((record) => record.payload.kind === "sedentary-break")).toBe(true);
  });

  it("loads a pre-revision2083 schema-1 state without optional fields and saves it losslessly", () => {
    const backend = memory();
    const storage = createHealthStorage(backend);
    const legacy = emptyHealthState("2026-08-14T00:00:00.000Z");
    delete legacy.foodCatalog;
    delete legacy.preferences.waterGoalMl;
    delete legacy.preferences.sedentaryReminderMinutes;
    storage.save(legacy);
    const hook = renderHook(() => useHealthSystem({ storage, mediaStore: createMemoryHealthMediaStore() }));
    expect(hook.result.current.bodyRecords).toEqual([]);
    act(() => hook.result.current.updatePreferences({ waterGoalMl: 1800 }));
    expect(storage.load().preferences.waterGoalMl).toBe(1800);
    expect(storage.load().schemaVersion).toBe(1);
  });
});
