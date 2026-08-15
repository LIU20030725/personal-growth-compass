export type ISODateTime = string;
export type RecordStatus = "active" | "deleted";
export type DailyMetric = "sleep" | "water" | "activity" | "energy";
export type ExerciseMode =
  | "distance-time"
  | "weight-reps"
  | "bodyweight-reps"
  | "timed-sets"
  | "duration";

export interface HeightEntry {
  id: string;
  heightMm: number;
  effectiveAt: ISODateTime;
  createdAt: ISODateTime;
}
export interface BodyRecord {
  id: string;
  measuredAt: ISODateTime;
  weightGrams?: number;
  bodyFatBasisPoints?: number;
  bodyFatMethod?: string;
  heightMmSnapshot?: number;
  bmiHundredths?: number;
  circumferencesMm?: Partial<Record<BodyCircumferenceKey, number>>;
  note?: string;
  status: RecordStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  deletedAt?: ISODateTime;
}
export type BodyCircumferenceKey =
  | "neck"
  | "arm"
  | "chest"
  | "waist"
  | "hips"
  | "thigh"
  | "calf";
export interface MealFoodItem {
  id: string;
  name: string;
  grams: number;
  calories: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
}
export interface FoodCatalogItem {
  id: string;
  name: string;
  kind: "public" | "mine" | "recipe";
  caloriesPer100g: number;
  proteinPer100g?: number;
  carbsPer100g?: number;
  fatPer100g?: number;
  createdAt: ISODateTime;
}
export interface MealRecord {
  id: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | "other";
  eatenAt: ISODateTime;
  description?: string;
  mediaIds: string[];
  satiety?: "low" | "comfortable" | "full" | "very-full";
  note?: string;
  foods?: MealFoodItem[];
  status: RecordStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  deletedAt?: ISODateTime;
}
export type DailyPayload =
  | {
      kind: "sleep";
      startAt?: ISODateTime;
      endAt?: ISODateTime;
      durationMinutes: number;
      quality?: 1 | 2 | 3 | 4 | 5;
    }
  | { kind: "water"; milliliters: number }
  | { kind: "steps"; count: number }
  | { kind: "activity-minutes"; minutes: number }
  | { kind: "sedentary-break"; durationMinutes: number }
  | { kind: "energy"; level: 1 | 2 | 3 | 4 | 5 };
export interface DailyHealthRecord {
  id: string;
  occurredAt: ISODateTime;
  payload: DailyPayload;
  note?: string;
  status: RecordStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  deletedAt?: ISODateTime;
}
export interface ExerciseDefinition {
  id: string;
  name: string;
  mode: ExerciseMode;
  displayUnit: string;
  defaultRestSeconds?: number;
  archivedAt?: ISODateTime;
  createdAt: ISODateTime;
  category?: "warmup" | "strength" | "cardio" | "mobility" | "stretch";
}
export interface WorkoutSet {
  id: string;
  order: number;
  weightGrams?: number;
  reps?: number;
  durationSeconds?: number;
  setType?: "warmup" | "working" | "drop";
  side?: "left" | "right" | "both";
  addedWeightGrams?: number;
  assistanceWeightGrams?: number;
  targetRestSeconds?: number;
  actualRestSeconds?: number;
  completedAt?: ISODateTime;
}
export interface WorkoutEntry {
  id: string;
  exerciseDefinitionId: string;
  order: number;
  distanceMeters?: number;
  durationSeconds?: number;
  segments?: Array<{
    id: string;
    order: number;
    distanceMeters: number;
    durationSeconds: number;
  }>;
  sets?: WorkoutSet[];
  note?: string;
}
export interface WorkoutSession {
  id: string;
  startedAt: ISODateTime;
  endedAt?: ISODateTime;
  state: "draft" | "completed" | "discarded" | "deleted";
  source: "live" | "quick-entry" | "copied";
  entries: WorkoutEntry[];
  note?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  deletedAt?: ISODateTime;
}
export interface HealthRevision {
  id: string;
  entityType: "profile-height" | "body" | "meal" | "daily" | "workout";
  entityId: string;
  before: unknown;
  after: unknown;
  reason?: string;
  revisedAt: ISODateTime;
}
export interface HealthPreferences {
  enabledDailyMetrics: DailyMetric[];
  activityMode: "steps" | "activity-minutes";
  weightUnit: "kg" | "lb";
  heightUnit: "cm" | "ft-in";
  distanceUnit: "km" | "mi";
  waterQuickAmountsMl: number[];
  reducedMotion: boolean;
  dailyCalorieTarget?: number;
  basalMetabolismKcal?: number;
  activityExpenditureKcal?: number;
  fatLossDeficitKcal?: number;
  waterGoalMl?: number;
  waterReminderTimes?: string[];
  sedentaryReminderMinutes?: number;
  sedentaryReminderEnabled?: boolean;
}
export interface HealthState {
  schemaVersion: 1;
  heightHistory: HeightEntry[];
  bodyRecords: BodyRecord[];
  mealRecords: MealRecord[];
  dailyRecords: DailyHealthRecord[];
  exerciseDefinitions: ExerciseDefinition[];
  workoutSessions: WorkoutSession[];
  foodCatalog?: FoodCatalogItem[];
  revisions: HealthRevision[];
  preferences: HealthPreferences;
  meta: {
    createdAt: ISODateTime;
    updatedAt: ISODateTime;
    lastExportedAt?: ISODateTime;
  };
}

export const emptyHealthState = (
  now = new Date().toISOString(),
): HealthState => ({
  schemaVersion: 1,
  heightHistory: [],
  bodyRecords: [],
  mealRecords: [],
  dailyRecords: [],
  exerciseDefinitions: [],
  workoutSessions: [],
  revisions: [],
  preferences: {
    enabledDailyMetrics: ["sleep", "water", "activity"],
    activityMode: "steps",
    weightUnit: "kg",
    heightUnit: "cm",
    distanceUnit: "km",
    waterQuickAmountsMl: [250, 350, 500],
    reducedMotion: false,
    dailyCalorieTarget: 2000,
    basalMetabolismKcal: 1500,
    activityExpenditureKcal: 350,
    fatLossDeficitKcal: 300,
    waterGoalMl: 1800,
    waterReminderTimes: ["09:00", "14:00", "18:00"],
    sedentaryReminderMinutes: 60,
    sedentaryReminderEnabled: false,
  },
  foodCatalog: [],
  meta: { createdAt: now, updatedAt: now },
});
