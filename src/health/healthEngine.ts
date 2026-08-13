export function calculateBmiHundredths(
  weightGrams?: number,
  heightMm?: number,
) {
  if (
    weightGrams === undefined ||
    heightMm === undefined ||
    !Number.isFinite(weightGrams) ||
    !Number.isFinite(heightMm) ||
    weightGrams <= 0 ||
    heightMm <= 0
  )
    return undefined;
  return Math.round((weightGrams / 1000 / (heightMm / 1000) ** 2) * 100);
}
export const kilogramsToGrams = (value: number) => Math.round(value * 1000);
export const poundsToGrams = (value: number) => Math.round(value * 453.59237);
export const gramsToKilograms = (value: number) => value / 1000;
export const centimetersToInches = (value: number) => value / 2.54;
export const inchesToCentimeters = (value: number) => value * 2.54;
export function centimetersToFeetInches(value: number) {
  const totalInches = centimetersToInches(value);
  const feet = Math.floor(totalInches / 12);
  return { feet, inches: totalInches - feet * 12 };
}
export const feetInchesToCentimeters = (feet: number, inches: number) =>
  inchesToCentimeters(feet * 12 + inches);
export function calculateSleepMinutes(start: string, end: string) {
  return Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 60000,
  );
}
export function deriveBodyTrend(
  records: Array<{ measuredAt: string; weightGrams?: number }>,
  days: number,
) {
  const sorted = records
    .filter(
      (item) =>
        item.weightGrams !== undefined && Number.isFinite(item.weightGrams),
    )
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  const newest = sorted[sorted.length - 1];
  if (!newest) return { comparable: false, count: 0 };
  const cutoff = new Date(
    new Date(newest.measuredAt).getTime() - (days - 1) * 86_400_000,
  ).getTime();
  const values = sorted.filter(
    (item) => new Date(item.measuredAt).getTime() >= cutoff,
  );
  if (values.length < 2) return { comparable: false, count: values.length };
  const last = values[values.length - 1];
  const span = Math.max(
    1,
    (new Date(last.measuredAt).getTime() -
      new Date(values[0].measuredAt).getTime()) /
      86_400_000 +
      1,
  );
  const coverage = values.length / Math.min(days, span);
  if (coverage < 0.5)
    return { comparable: false, count: values.length, coverage };
  return {
    comparable: true,
    count: values.length,
    coverage,
    changeGrams: last.weightGrams! - values[0].weightGrams!,
  };
}
export function localDateKey(iso: string, timeZone = "Asia/Shanghai") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}
export function validateSleepMinutes(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 1_440)
    throw new Error("睡眠时长需大于 0 且不超过 24 小时");
  return minutes > 960 ? "本次睡眠超过 16 小时，请复核记录。" : undefined;
}
export function validateWaterMl(value: number) {
  if (!Number.isFinite(value) || value <= 0 || value > 5_000)
    throw new Error("单次饮水需大于 0 且不超过 5000 ml");
}
export function validateActivity(
  value: number,
  mode: "steps" | "activity-minutes",
) {
  const max = mode === "steps" ? 200_000 : 1_440;
  if (!Number.isFinite(value) || value < 0 || value > max)
    throw new Error(
      mode === "steps"
        ? "步数需在 0–200000 之间"
        : "活动时长需在 0–1440 分钟之间",
    );
  return mode === "steps" && value > 100_000
    ? "本次步数较高，请复核记录。"
    : undefined;
}
export function validateWorkoutInput(input: {
  distanceMeters?: number;
  durationSeconds?: number;
  sets?: Array<{ weightKg?: number; reps?: number; durationSeconds?: number }>;
}) {
  if (
    input.distanceMeters !== undefined &&
    (!Number.isFinite(input.distanceMeters) || input.distanceMeters <= 0)
  )
    throw new Error("距离需大于 0");
  if (
    input.durationSeconds !== undefined &&
    (!Number.isFinite(input.durationSeconds) || input.durationSeconds <= 0)
  )
    throw new Error("时长需大于 0");
  for (const set of input.sets ?? []) {
    if (
      set.weightKg !== undefined &&
      (!Number.isFinite(set.weightKg) || set.weightKg < 0)
    )
      throw new Error("重量不能为负数");
    if (
      set.reps !== undefined &&
      (!Number.isInteger(set.reps) || set.reps <= 0)
    )
      throw new Error("次数需为正整数");
    if (
      set.durationSeconds !== undefined &&
      (!Number.isFinite(set.durationSeconds) || set.durationSeconds <= 0)
    )
      throw new Error("每组时长需大于 0");
  }
}
export function deriveDistanceSummary(
  distanceMeters: number,
  durationSeconds: number,
) {
  return {
    paceSecondsPerKm: durationSeconds / (distanceMeters / 1000),
    speedKph: distanceMeters / 1000 / (durationSeconds / 3600),
  };
}
export function formatReviewPrompt(input: {
  kind: "insufficient";
  count: number;
  needed: number;
  recordIds: string[];
}) {
  return {
    text: `已有 ${input.count} 条同类记录。再记录 ${input.needed} 次，会更容易看出自己的变化。`,
    evidenceIds: input.recordIds,
  };
}
export function deriveWorkoutSummary(input: {
  mode: string;
  sets?: Array<{
    weightGrams?: number;
    reps?: number;
    durationSeconds?: number;
  }>;
}) {
  const sets = input.sets ?? [];
  const totalReps = sets.reduce((sum, set) => sum + (set.reps ?? 0), 0);
  const volumeGrams = sets.reduce(
    (sum, set) => sum + (set.weightGrams ?? 0) * (set.reps ?? 0),
    0,
  );
  const bestSet = [...sets]
    .filter((s) => s.weightGrams && s.reps)
    .sort((a, b) => b.weightGrams! - a.weightGrams! || b.reps! - a.reps!)[0];
  return {
    totalReps,
    volumeGrams,
    bestSet,
    totalDurationSeconds: sets.reduce(
      (sum, set) => sum + (set.durationSeconds ?? 0),
      0,
    ),
  };
}
