import { describe, expect, it } from "vitest";
import { emptyHealthState } from "./types";
import {
  checksum,
  createHealthBundle,
  createHealthStorage,
  exportHealthState,
  HEALTH_BACKUP_KEY,
  HEALTH_STORAGE_KEY,
  importHealthBundle,
  importHealthState,
} from "./healthStorage";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    data,
  };
}

describe("health storage", () => {
  it("round-trips advanced workout fields without normalization loss", () => {
    const state = emptyHealthState("2026-08-14T00:00:00Z");
    state.exerciseDefinitions.push({
      id: "exercise",
      name: "辅助引体",
      mode: "bodyweight-reps",
      displayUnit: "次",
      createdAt: "2026-08-14T00:00:00Z",
    });
    state.workoutSessions.push({
      id: "draft",
      startedAt: "2026-08-14T00:00:00Z",
      state: "draft",
      source: "copied",
      entries: [
        {
          id: "entry",
          exerciseDefinitionId: "exercise",
          order: 0,
          segments: [
            {
              id: "segment",
              order: 0,
              distanceMeters: 400,
              durationSeconds: 90,
            },
          ],
          sets: [
            {
              id: "set",
              order: 0,
              reps: 8,
              setType: "working",
              side: "left",
              addedWeightGrams: 5000,
              assistanceWeightGrams: 15000,
            },
          ],
        },
      ],
      createdAt: "2026-08-14T00:00:00Z",
      updatedAt: "2026-08-14T00:00:00Z",
    });
    const imported = importHealthState(exportHealthState(state));
    expect(imported.workoutSessions[0].entries[0].segments).toHaveLength(1);
    expect(imported.workoutSessions[0].entries[0].sets?.[0]).toMatchObject({
      setType: "working",
      side: "left",
      addedWeightGrams: 5000,
      assistanceWeightGrams: 15000,
    });
  });
  it("loads a safe empty state when nothing exists", () =>
    expect(
      createHealthStorage(memoryStorage(), () => "2026-08-14T00:00:00Z").load()
        .bodyRecords,
    ).toEqual([]));

  it("saves current state and keeps the previous valid value as backup", () => {
    const storage = memoryStorage();
    const adapter = createHealthStorage(storage);
    adapter.save(emptyHealthState("2026-08-01T00:00:00Z"));
    const next = emptyHealthState("2026-08-02T00:00:00Z");
    adapter.save(next);
    expect(storage.getItem(HEALTH_STORAGE_KEY)).toContain("2026-08-02");
    expect(storage.getItem(HEALTH_BACKUP_KEY)).toContain("2026-08-01");
  });

  it("recovers the backup when current data is corrupt", () => {
    const backup = exportHealthState(emptyHealthState("2026-08-01T00:00:00Z"));
    const storage = memoryStorage({
      [HEALTH_STORAGE_KEY]: "{bad",
      [HEALTH_BACKUP_KEY]: backup,
    });
    expect(createHealthStorage(storage).load().meta.createdAt).toBe(
      "2026-08-01T00:00:00Z",
    );
  });

  it("rejects damaged imports without returning a replacement state", () =>
    expect(() => importHealthState('{"schemaVersion":1}')).toThrow(
      "导入文件不完整",
    ));

  it("rejects tampered checksums, duplicate IDs and orphan media", () => {
    const state = emptyHealthState("2026-08-14T00:00:00Z");
    const envelope = JSON.parse(exportHealthState(state));
    envelope.state.meta.updatedAt = "changed";
    expect(() => importHealthState(JSON.stringify(envelope))).toThrow(
      /校验失败/,
    );
    const duplicate = {
      ...state,
      bodyRecords: [
        {
          id: "same",
          measuredAt: "2026-08-14T00:00:00Z",
          status: "active",
          createdAt: "x",
          updatedAt: "x",
        },
        {
          id: "same",
          measuredAt: "2026-08-14T00:00:00Z",
          status: "active",
          createdAt: "x",
          updatedAt: "x",
        },
      ],
    };
    expect(() =>
      importHealthState(
        JSON.stringify({
          format: "dice-life-health",
          version: 1,
          checksum: checksum(duplicate),
          state: duplicate,
        }),
      ),
    ).toThrow(/重复 ID/);
    const bundle = createHealthBundle(
      state,
      [
        {
          id: "orphan",
          type: "image/webp",
          dataUrl: "data:image/webp;base64,YQ==",
        },
      ],
      "2026-08-14T00:00:00Z",
    );
    expect(() => importHealthBundle(JSON.stringify(bundle))).toThrow(
      /孤儿媒体/,
    );
  });
});
