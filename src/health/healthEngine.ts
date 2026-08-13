export function calculateBmiHundredths(weightGrams?: number, heightMm?: number) {
  if (!weightGrams || !heightMm) return undefined;
  return Math.round((weightGrams / 1000) / ((heightMm / 1000) ** 2) * 100);
}
export const kilogramsToGrams = (value: number) => Math.round(value * 1000);
export const poundsToGrams = (value: number) => Math.round(value * 453.59237);
export const gramsToKilograms = (value: number) => value / 1000;
export function calculateSleepMinutes(start: string, end: string) { return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000); }
export function deriveBodyTrend(records: Array<{ measuredAt: string; weightGrams?: number }>, days: number) {
  const values = records.filter((item) => item.weightGrams !== undefined).sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  if (values.length < 2) return { comparable: false, count: values.length };
  const last = values[values.length - 1];
  const span = Math.max(1, (new Date(last.measuredAt).getTime() - new Date(values[0].measuredAt).getTime()) / 86_400_000 + 1);
  const coverage = values.length / Math.min(days, span);
  if (coverage < .5) return { comparable: false, count: values.length, coverage };
  return { comparable: true, count: values.length, coverage, changeGrams: last.weightGrams! - values[0].weightGrams! };
}
export function formatReviewPrompt(input: { kind: 'insufficient'; count: number; needed: number; recordIds: string[] }) {
  return { text: `已有 ${input.count} 条同类记录。再记录 ${input.needed} 次，会更容易看出自己的变化。`, evidenceIds: input.recordIds };
}
export function deriveWorkoutSummary(input: { mode: string; sets?: Array<{ weightGrams?: number; reps?: number; durationSeconds?: number }> }) {
  const sets = input.sets ?? [];
  const totalReps = sets.reduce((sum, set) => sum + (set.reps ?? 0), 0);
  const volumeGrams = sets.reduce((sum, set) => sum + (set.weightGrams ?? 0) * (set.reps ?? 0), 0);
  const bestSet = [...sets].filter(s => s.weightGrams && s.reps).sort((a, b) => (b.weightGrams! - a.weightGrams!) || (b.reps! - a.reps!))[0];
  return { totalReps, volumeGrams, bestSet, totalDurationSeconds: sets.reduce((sum, set) => sum + (set.durationSeconds ?? 0), 0) };
}
