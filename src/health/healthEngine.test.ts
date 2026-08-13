import { describe, expect, it } from "vitest";
import {
  calculateBmiHundredths,
  calculateSleepMinutes,
  centimetersToFeetInches,
  deriveDistanceSummary,
  deriveBodyTrend,
  deriveWorkoutSummary,
  formatReviewPrompt,
  feetInchesToCentimeters,
  gramsToKilograms,
  kilogramsToGrams,
  poundsToGrams,
  validateActivity,
  validateSleepMinutes,
  validateWaterMl,
} from "./healthEngine";

describe("health engine", () => {
  it("calculates BMI from integer base units and leaves missing height unresolved", () => {
    expect(calculateBmiHundredths(70_000, 1_750)).toBe(2286);
    expect(calculateBmiHundredths(70_000, undefined)).toBeUndefined();
    expect(calculateBmiHundredths(0, 1_750)).toBeUndefined();
    expect(calculateBmiHundredths(-1, 1_750)).toBeUndefined();
    expect(calculateBmiHundredths(Infinity, 1_750)).toBeUndefined();
  });

  it("round-trips kg/lb and cm/ft-in within display precision", () => {
    expect(gramsToKilograms(poundsToGrams(154.324))).toBeCloseTo(70, 2);
    for (const cm of [50, 175.3, 250]) {
      const parts = centimetersToFeetInches(cm);
      expect(feetInchesToCentimeters(parts.feet, parts.inches)).toBeCloseTo(
        cm,
        6,
      );
    }
  });

  it("normalizes display units into integer grams", () => {
    expect(kilogramsToGrams(72.35)).toBe(72_350);
    expect(poundsToGrams(160)).toBe(72_575);
  });

  it("calculates cross-midnight sleep duration", () => {
    expect(
      calculateSleepMinutes(
        "2026-08-14T23:30:00+08:00",
        "2026-08-15T07:00:00+08:00",
      ),
    ).toBe(450);
  });

  it("validates neutral daily boundaries and derives distance pace", () => {
    expect(() => validateSleepMinutes(0)).toThrow();
    expect(validateSleepMinutes(1000)).toMatch(/复核/);
    expect(() => validateWaterMl(5001)).toThrow();
    expect(() => validateActivity(200001, "steps")).toThrow();
    expect(deriveDistanceSummary(5000, 1500)).toEqual({
      paceSecondsPerKm: 300,
      speedKph: 12,
    });
  });

  it("does not claim a trend with one record or sparse coverage", () => {
    expect(
      deriveBodyTrend(
        [{ measuredAt: "2026-08-01T08:00:00Z", weightGrams: 70_000 }],
        30,
      ),
    ).toMatchObject({ comparable: false });
    expect(
      deriveBodyTrend(
        [
          { measuredAt: "2026-08-01T08:00:00Z", weightGrams: 70_000 },
          { measuredAt: "2026-08-30T08:00:00Z", weightGrams: 69_000 },
        ],
        30,
      ),
    ).toMatchObject({ comparable: false });
  });

  it("uses fixed non-medical prompt templates with evidence ids", () => {
    expect(
      formatReviewPrompt({
        kind: "insufficient",
        count: 2,
        needed: 2,
        recordIds: ["a", "b"],
      }),
    ).toEqual({
      text: "已有 2 条同类记录。再记录 2 次，会更容易看出自己的变化。",
      evidenceIds: ["a", "b"],
    });
  });

  it("describes workout records without equating volume with health", () => {
    expect(
      deriveWorkoutSummary({
        mode: "weight-reps",
        sets: [
          { weightGrams: 50_000, reps: 10 },
          { weightGrams: 50_000, reps: 8 },
        ],
      }),
    ).toMatchObject({
      totalReps: 18,
      volumeGrams: 900_000,
      bestSet: { weightGrams: 50_000, reps: 10 },
    });
  });
});
