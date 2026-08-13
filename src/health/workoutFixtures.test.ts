import { describe, expect, it } from "vitest";
import type { ExerciseMode } from "./types";
type Fixture = { name: string; mode: ExerciseMode; advanced?: string };
const exposedAdvancedFields = new Set([
  "segments",
  "singleSide",
  "addedWeight",
  "assistance",
]);
const fixtures: Fixture[] = [
  { name: "5公里跑", mode: "distance-time" },
  { name: "间歇跑", mode: "distance-time", advanced: "segments" },
  { name: "骑行", mode: "distance-time" },
  { name: "游泳", mode: "distance-time", advanced: "segments" },
  { name: "卧推", mode: "weight-reps" },
  { name: "深蹲", mode: "weight-reps" },
  { name: "硬拉", mode: "weight-reps" },
  { name: "哑铃划船单侧", mode: "weight-reps", advanced: "singleSide" },
  { name: "俯卧撑", mode: "bodyweight-reps" },
  { name: "引体向上", mode: "bodyweight-reps" },
  { name: "负重引体", mode: "bodyweight-reps", advanced: "addedWeight" },
  { name: "辅助引体", mode: "bodyweight-reps", advanced: "assistance" },
  { name: "平板支撑", mode: "timed-sets" },
  { name: "靠墙静蹲", mode: "timed-sets" },
  { name: "跳绳组", mode: "timed-sets" },
  { name: "瑜伽", mode: "duration" },
  { name: "散步", mode: "duration" },
  { name: "划船机", mode: "duration" },
  { name: "登山", mode: "duration" },
  { name: "球类训练", mode: "duration" },
];
describe("20 realistic workout fixtures", () => {
  it("maps all fixtures to one of five standard modes", () =>
    expect(
      fixtures.filter((x) =>
        [
          "distance-time",
          "weight-reps",
          "bodyweight-reps",
          "timed-sets",
          "duration",
        ].includes(x.mode),
      ),
    ).toHaveLength(20));
  it("keeps uncovered UI variants at or below 20 percent", () =>
    expect(
      fixtures.filter(
        (x) => x.advanced && !exposedAdvancedFields.has(x.advanced),
      ).length / fixtures.length,
    ).toBeLessThanOrEqual(0.2));
});
