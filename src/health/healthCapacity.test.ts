import { describe, expect, it } from "vitest";
import {
  checksum,
  createHealthBundle,
  importHealthBundle,
} from "./healthStorage";
import { emptyHealthState, type DailyHealthRecord } from "./types";
describe("health capacity gate", () => {
  it("round-trips 1000 records and 50 controlled photos without orphans", () => {
    const state = emptyHealthState("2026-08-14T00:00:00Z");
    state.dailyRecords = Array.from(
      { length: 1000 },
      (_, i) =>
        ({
          id: `daily-${i}`,
          occurredAt: new Date(1786636800000 - i * 60000).toISOString(),
          payload: { kind: "water", milliliters: 250 },
          status: "active",
          createdAt: "2026-08-14T00:00:00Z",
          updatedAt: "2026-08-14T00:00:00Z",
        }) satisfies DailyHealthRecord,
    );
    state.mealRecords = Array.from({ length: 50 }, (_, i) => ({
      id: `meal-${i}`,
      mealType: "lunch",
      eatenAt: "2026-08-14T00:00:00Z",
      description: "受控照片",
      mediaIds: [`media-${i}`],
      status: "active",
      createdAt: "2026-08-14T00:00:00Z",
      updatedAt: "2026-08-14T00:00:00Z",
    }));
    const media = Array.from({ length: 50 }, (_, i) => ({
      id: `media-${i}`,
      type: "image/webp",
      dataUrl: "data:image/webp;base64,YQ==",
    }));
    const started = performance.now();
    const bundle = createHealthBundle(state, media, "2026-08-14T00:00:00Z");
    const restored = importHealthBundle(JSON.stringify(bundle));
    expect(restored.state.dailyRecords).toHaveLength(1000);
    expect(restored.media).toHaveLength(50);
    expect(restored.manifest.checksum).toBe(
      checksum({ state: restored.state, media: restored.media }),
    );
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
