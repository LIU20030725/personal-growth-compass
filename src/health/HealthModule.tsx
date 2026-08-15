import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Apple,
  ArrowRight,
  ChevronLeft,
  Clock3,
  Dumbbell,
  GlassWater,
  HeartPulse,
  Moon,
  Plus,
  Scale,
  ShieldCheck,
  Utensils,
  Waves,
  X,
} from "lucide-react";
import { useHealthSystem } from "./useHealthSystem";
import { deriveBodyTrend } from "./healthEngine";
import type { BodyRecord, ExerciseMode, MealRecord } from "./types";
import type { WorkoutSession, WorkoutSet } from "./types";
import "./healthModule.css";
import { useRestTimer } from "./useRestTimer";
import {
  BodyWorkspace,
  DailyWorkspace,
  MealsWorkspace,
  WorkoutWorkspace,
} from "./Revision2083Workspaces";
import type { IntentProps } from "../today/todayIntent";

type View = "home" | "body" | "meals" | "daily" | "workouts" | "data";
const cards: Array<{
  id: Exclude<View, "home" | "data">;
  title: string;
  subtitle: string;
  icon: typeof Scale;
}> = [
  { id: "body", title: "身体状态", subtitle: "体重、体脂与 BMI", icon: Scale },
  {
    id: "meals",
    title: "饮食记录",
    subtitle: "餐次、文字与饱腹感",
    icon: Utensils,
  },
  { id: "daily", title: "日常健康", subtitle: "睡眠、饮水与活动", icon: Moon },
  {
    id: "workouts",
    title: "运动健身",
    subtitle: "有氧、力量与训练历史",
    icon: Dumbbell,
  },
];

export function HealthModule({ intent, onIntentConsumed }: IntentProps<'health.quick-record'> = {}) {
  const health = useHealthSystem();
  const moduleRef = useRef<HTMLElement>(null);
  const [view, setView] = useState<View>("home");
  const [quickOpen, setQuickOpen] = useState(false);
  const [dailySettingsOpen, setDailySettingsOpen] = useState(false);
  const [bodyCorrection, setBodyCorrection] = useState<BodyRecord>();
  const [confirmation, setConfirmation] = useState<
    | { kind: "archive"; exerciseId: string; name: string }
    | { kind: "import" }
  >();
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [fat, setFat] = useState("");
  const [fatMethod, setFatMethod] = useState("");
  const [meal, setMeal] = useState("");
  const [mealType, setMealType] = useState<MealRecord["mealType"]>("breakfast");
  const [satiety, setSatiety] = useState<MealRecord["satiety"]>();
  const [exercise, setExercise] = useState("");
  const [mode, setMode] = useState<ExerciseMode>("weight-reps");
  const [sleepHours, setSleepHours] = useState("");
  const [steps, setSteps] = useState("");
  const [customWater, setCustomWater] = useState("");
  const [sleepQuality, setSleepQuality] = useState("");
  const [energy, setEnergy] = useState("");
  const [selectedExercise, setSelectedExercise] = useState("");
  const [workoutDistance, setWorkoutDistance] = useState("");
  const [workoutMinutes, setWorkoutMinutes] = useState("");
  const [editingWorkoutId, setEditingWorkoutId] = useState<string>();
  const [workoutSeed, setWorkoutSeed] = useState<WorkoutSession>();
  const restTimer = useRestTimer();
  const [importText, setImportText] = useState("");
  const [importPreview, setImportPreview] = useState<{
    records: number;
    media: number;
    updatedAt: string;
  }>();
  const [status, setStatus] = useState("");
  const [mealPhotos, setMealPhotos] = useState<File[]>([]);
  useEffect(() => {
    if (intent?.type !== 'health.quick-record') return;
    setQuickOpen(true);
    onIntentConsumed?.();
  }, [intent?.id]);
  const latest = health.bodyRecords[0];
  const todayMealCount = health.meals.filter((record) => isLocalToday(record.eatenAt)).length;
  const todayWorkoutCount = health.workouts.filter((record) => isLocalToday(record.startedAt)).length;
  const todayDailyCount = health.daily.filter((record) => isLocalToday(record.occurredAt)).length;
  const bmiPreview = calculateBmiPreview(
    height ? Number(height) : latest?.heightMmSnapshot ? latest.heightMmSnapshot / 10 : undefined,
    weight ? Number(weight) : undefined,
  );
  const bodyTrend = deriveBodyTrend(health.bodyRecords, 30);
  const selectedDefinition = health.exercises.find((item) => item.id === selectedExercise);
  useEffect(() => {
    moduleRef.current?.scrollIntoView?.({ block: "start" });
  }, [view]);
  const recentCount = (days: number) => {
    const cutoff = Date.now() - days * 86_400_000;
    return [
      ...health.bodyRecords,
      ...health.meals,
      ...health.daily,
      ...health.workouts,
    ].filter(
      (record) =>
        new Date(
          "measuredAt" in record
            ? record.measuredAt
            : "eatenAt" in record
              ? record.eatenAt
              : "occurredAt" in record
                ? record.occurredAt
                : record.startedAt,
        ).getTime() >= cutoff,
    ).length;
  };
  const title =
    view === "home"
      ? "今天，记录一点真实变化"
      : view === "data"
        ? "数据与隐私"
        : cards.find((c) => c.id === view)!.title;
  return (
    <section
      ref={moduleRef}
      className={`health-module health-view-${view}`}
      aria-labelledby="health-title"
    >
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
      <header className="health-hero">
        {view !== "home" && (
          <button className="health-back" onClick={() => setView("home")}>
            <ChevronLeft size={18} />
            返回健康首页
          </button>
        )}
        <div className="health-eyebrow">
          <HeartPulse size={16} /> 健康记录 · 本地保存
        </div>
        <h1 id="health-title">{title}</h1>
        <p>
          {view === "home"
            ? "随便从一项开始。少填也有价值，没有填写不代表失败。"
            : "记录你真实发生的变化，不做医疗诊断或风险判断。"}
        </p>
      </header>
      {health.error && (
        <p role="alert" className="health-error">
          {health.error}
        </p>
      )}
      {view === "home" && (
        <>
          <div className="health-command-grid">
            <section className="health-today" aria-labelledby="today-overview">
              <div className="health-today-copy">
                <span id="today-overview">今日概览</span>
                <strong>
                  {todayDailyCount + todayMealCount + todayWorkoutCount > 0
                    ? "今天的记录正在慢慢形成"
                    : "先记下一件已经发生的小事"}
                </strong>
                <p>不用补齐所有项目，真实留下一个数据就有价值。</p>
              </div>
              <div className="health-today-metrics" aria-label="今日记录摘要">
                <div>
                  <GlassWater aria-hidden="true" />
                  <span>饮水</span>
                  <strong>{health.todayWaterMl ? `${health.todayWaterMl} ml` : "未记录"}</strong>
                </div>
                <div>
                  <Utensils aria-hidden="true" />
                  <span>餐食</span>
                  <strong>{todayMealCount ? `${todayMealCount} 餐` : "未记录"}</strong>
                </div>
                <div>
                  <Dumbbell aria-hidden="true" />
                  <span>训练</span>
                  <strong>{todayWorkoutCount ? `${todayWorkoutCount} 次` : "未记录"}</strong>
                </div>
              </div>
              <button className="health-primary-action" onClick={() => setQuickOpen(true)}>
                <Plus size={18} aria-hidden="true" />
                一键记录
              </button>
            </section>
            <aside className="health-next-card">
              <span className="health-section-kicker">
                {health.draftWorkout ? "继续上次" : "最近状态"}
              </span>
              <strong>
                {health.draftWorkout
                  ? "有一份未完成的训练"
                  : latest?.weightGrams
                    ? `最近体重 ${(latest.weightGrams / 1000).toFixed(1)} kg`
                    : "还没有身体记录"}
              </strong>
              <p>
                {health.draftWorkout
                  ? "草稿已保存在本地，可以回到训练页继续。"
                  : latest
                    ? "进入身体状态查看原始记录与变化。"
                    : "体重、体脂和 BMI 会按记录时间保留。"}
              </p>
              <button onClick={() => setView(health.draftWorkout ? "workouts" : "body")}>
                {health.draftWorkout ? "继续训练" : latest ? "查看身体趋势" : "添加首条身体记录"}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </aside>
          </div>
          <section className="health-quick-section" aria-labelledby="quick-entrances">
            <div className="health-section-heading">
              <div>
                <span className="health-section-kicker">全部记录</span>
                <h2 id="quick-entrances">按内容进入</h2>
              </div>
              <p>查看历史、趋势，或补充更完整的数据。</p>
            </div>
            <div className="health-card-grid">
            {cards.map(({ id, title, subtitle, icon: Icon }) => (
              <button
                key={id}
                className="health-entry-card"
                onClick={() => setView(id)}
                aria-label={`${title}，${subtitle}`}
              >
                <span className="health-entry-icon"><Icon aria-hidden="true" /></span>
                <span>
                  <strong>{title}</strong>
                  <small>{subtitle}</small>
                </span>
                <ArrowRight className="health-entry-arrow" aria-hidden="true" />
              </button>
            ))}
            </div>
          </section>
          <div className="health-home-lower">
            <aside className="health-review">
              <Waves aria-hidden="true" />
              <div>
                <span className="health-section-kicker">回看变化</span>
                <strong>周 / 月记录回看</strong>
                <p>
                  近 7 天 {recentCount(7)} 条 · 近 30 天 {recentCount(30)} 条。
                  {health.bodyRecords.length + health.daily.length < 2
                    ? "再留下几条同类记录后，才会描述可比较的变化。"
                    : "你的健康档案正在形成，可进入各模块查看同类数据变化。"}
                </p>
              </div>
            </aside>
            <aside className="health-management-card">
              <ShieldCheck aria-hidden="true" />
              <div>
                <span className="health-section-kicker">本地优先</span>
                <strong>历史与数据管理</strong>
                <p>导出、导入、垃圾箱与恢复。</p>
                <button onClick={() => setView("data")}>数据与隐私</button>
              </div>
            </aside>
          </div>
          {quickOpen && (
            <QuickRecordDialog
              onClose={() => setQuickOpen(false)}
              onSelect={(nextView) => {
                setQuickOpen(false);
                setView(nextView);
              }}
            />
          )}
        </>
      )}
      {view === "body" && (
        <BodyWorkspace health={health} onStatus={setStatus} />
      )}
      {view === "body" && (
        <details className="health-support-details">
          <summary>完整身体记录与历史趋势</summary>
        <div className="health-two-column">
          <form
            className="health-panel health-record-form"
            onSubmit={(e) => {
              e.preventDefault();
              const saved = health.addBodyRecord({
                heightCm: height ? Number(height) : undefined,
                weightKg: weight ? Number(weight) : undefined,
                bodyFatPercent: fat ? Number(fat) : undefined,
                bodyFatMethod: fatMethod,
              });
              if (saved) {
                setWeight("");
                setFat("");
              }
            }}
          >
            <h2>新增身体记录</h2>
            <label>
              身高（cm）
              <input
                type="number"
                step="0.1"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </label>
            <label>
              体重（kg）
              <input
                aria-label="体重（kg）"
                type="number"
                step="0.01"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </label>
            <label>
              体脂率（%）
              <input
                type="number"
                step="0.1"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
              />
            </label>
            <label>
              体脂测量方式（可选）
              <input
                value={fatMethod}
                onChange={(e) => setFatMethod(e.target.value)}
                placeholder="例如：同一台体脂秤"
              />
            </label>
            <label>
              BMI（自动计算）
              <input
                aria-label="BMI（自动计算）"
                disabled
                value={
                  bmiPreview === undefined
                    ? "填写身高与体重后预览"
                    : bmiPreview.toFixed(2)
                }
              />
            </label>
            <button type="submit">保存身体记录</button>
          </form>
          <div className="health-panel health-history-panel">
            <h2>历史与趋势</h2>
            <p className="health-trend" aria-live="polite">
              {bodyTrend.comparable
                ? `近 30 天可比记录 ${bodyTrend.count} 条，体重变化 ${bodyTrend.changeGrams! >= 0 ? "+" : ""}${(bodyTrend.changeGrams! / 1000).toFixed(2)} kg。仅描述记录变化，不代表健康判断。`
                : `当前有 ${bodyTrend.count} 条可比体重记录；至少需要 2 条且覆盖足够日期后才描述趋势。`}
            </p>
            {health.bodyRecords.length ? (
              health.bodyRecords.map((r) => (
                <article className="health-row" key={r.id}>
                  <strong>
                    {r.weightGrams
                      ? `${r.weightGrams / 1000} kg`
                      : "未记录体重"}
                  </strong>
                  <span>
                    {r.bmiHundredths
                      ? `BMI ${(r.bmiHundredths / 100).toFixed(2)}`
                      : "BMI 暂未计算"}
                    {r.bodyFatMethod ? ` · ${r.bodyFatMethod}` : ""}
                  </span>
                  <button
                    onClick={() => setBodyCorrection(r)}
                  >
                    更正
                  </button>
                  <button onClick={() => health.softDelete("body", r.id)}>
                    移到垃圾箱
                  </button>
                  <time>{formatLocalDate(r.measuredAt)}</time>
                </article>
              ))
            ) : (
              <Empty text="还没有身体记录。只有一条时展示当前值，不判断趋势。" />
            )}
          </div>
        </div>
        </details>
      )}
      {view === "meals" && (
        <MealsWorkspace health={health} onStatus={setStatus} />
      )}
      {view === "meals" && (
        <details className="health-support-details">
          <summary>文字、照片与餐次时间线</summary>
        <div className="health-two-column">
          <form
            className="health-panel health-record-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await health.addMealWithPhotos({
                mealType,
                description: meal,
                photos: mealPhotos,
                satiety,
              });
              if (ok) {
                setMeal("");
                setMealPhotos([]);
                setSatiety(undefined);
              }
            }}
          >
            <h2>记下一餐</h2>
            <label>
              餐次
              <select
                value={mealType}
                onChange={(e) =>
                  setMealType(e.target.value as MealRecord["mealType"])
                }
              >
                <option value="breakfast">早餐</option>
                <option value="lunch">午餐</option>
                <option value="dinner">晚餐</option>
                <option value="snack">加餐</option>
              </select>
            </label>
            <label>
              餐食内容
              <textarea
                aria-label="餐食内容"
                value={meal}
                onChange={(e) => setMeal(e.target.value)}
                placeholder="例如：鸡蛋、面包和一杯牛奶"
              />
            </label>
            <label>
              主观饱腹感
              <select
                aria-label="主观饱腹感"
                value={satiety ?? ""}
                onChange={(e) =>
                  setSatiety(
                    (e.target.value || undefined) as MealRecord["satiety"],
                  )
                }
              >
                <option value="">不选择</option>
                <option value="low">偏少</option>
                <option value="comfortable">刚好</option>
                <option value="full">偏饱</option>
                <option value="very-full">很撑</option>
              </select>
            </label>
            <label>
              本地照片（最多 3 张）
              <input
                aria-label="餐食照片"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) =>
                  setMealPhotos(Array.from(e.target.files ?? []).slice(0, 3))
                }
              />
            </label>
            <p className="health-hint">
              <Apple size={16} />
              V1 不估算热量和营养，照片只保存在本机。
            </p>
            <button type="submit">保存餐食</button>
          </form>
          <div className="health-panel health-history-panel">
            <h2>餐次时间线</h2>
            {health.meals.length ? (
              health.meals.map((m) => (
                <article className="health-row" key={m.id}>
                  <strong>{m.description || "照片记录"}</strong>
                  <span>
                    {m.mediaIds.length
                      ? `${m.mediaIds.length} 张照片`
                      : m.satiety
                        ? `饱腹：${m.satiety}`
                        : m.mealType}
                  </span>
                  {m.mediaIds.length > 0 && (
                    <div className="health-photo-grid">
                      {m.mediaIds.map((id) => (
                        <MealPhoto key={id} id={id} load={health.getMedia} />
                      ))}
                    </div>
                  )}
                  <time>{formatLocalDateTime(m.eatenAt)}</time>
                  <button
                    onClick={() => {
                      health.softDelete("meal", m.id);
                      setStatus("餐食已移到垃圾箱，可在数据与隐私中恢复");
                    }}
                  >
                    移到垃圾箱
                  </button>
                </article>
              ))
            ) : (
              <Empty text="可以只用文字、只用照片或两者一起记录。" />
            )}
          </div>
        </div>
        </details>
      )}
      {view === "daily" && (
        <DailyWorkspace health={health} onStatus={setStatus} />
      )}
      {view === "daily" && (
        <details className="health-support-details">
          <summary>活动量、精力与历史指标管理</summary>
        <div className="health-two-column health-daily-layout">
          <div className="health-panel health-daily-recorder">
            <h2>今日快速记录</h2>
            {health.preferences.enabledDailyMetrics.includes("water") && (
              <section className="health-daily-metric-card" aria-labelledby="daily-water-title">
                <span className="health-section-kicker" id="daily-water-title">饮水</span>
                <div className="water-actions">
                  {health.preferences.waterQuickAmountsMl.map((n) => (
                    <button key={n} onClick={() => health.addWater(n)}>
                      记录 {n} ml
                    </button>
                  ))}
                </div>
                <strong className="health-total">
                  今日饮水 {health.todayWaterMl} ml
                </strong>
                <label>
                  自定义饮水（ml）
                  <input
                    aria-label="自定义饮水（ml）"
                    type="number"
                    inputMode="numeric"
                    value={customWater}
                    onChange={(e) => setCustomWater(e.target.value)}
                  />
                </label>
                <button
                  onClick={() => {
                    if (customWater && health.addWater(Number(customWater)))
                      setCustomWater("");
                  }}
                >
                  保存自定义饮水
                </button>
              </section>
            )}
            {health.preferences.enabledDailyMetrics.includes("sleep") && (
              <section className="health-daily-metric-card" aria-labelledby="daily-sleep-title">
                <span className="health-section-kicker" id="daily-sleep-title">睡眠</span>
                <label>
                  睡眠时长（小时）
                  <input
                    aria-label="睡眠时长（小时）"
                    type="number"
                    step="0.1"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(e.target.value)}
                  />
                </label>
                <label>
                  睡眠质量（可选）
                  <select
                    aria-label="睡眠质量（可选）"
                    value={sleepQuality}
                    onChange={(e) => setSleepQuality(e.target.value)}
                  >
                    <option value="">不选择</option>
                    <option value="1">很差</option>
                    <option value="2">较差</option>
                    <option value="3">一般</option>
                    <option value="4">较好</option>
                    <option value="5">很好</option>
                  </select>
                </label>
                <button
                  onClick={() => {
                    if (sleepHours) {
                      health.addSleep({
                        durationMinutes: Math.round(Number(sleepHours) * 60),
                        quality: sleepQuality
                          ? (Number(sleepQuality) as 1 | 2 | 3 | 4 | 5)
                          : undefined,
                      });
                      setSleepHours("");
                      setSleepQuality("");
                    }
                  }}
                >
                  保存睡眠
                </button>
              </section>
            )}
            {health.preferences.enabledDailyMetrics.includes("activity") && (
              <section className="health-daily-metric-card" aria-labelledby="daily-activity-title">
                <span className="health-section-kicker" id="daily-activity-title">活动</span>
                <label>
                  活动记录方式
                  <select
                    value={health.preferences.activityMode}
                    onChange={(e) =>
                      health.setActivityMode(
                        e.target.value as "steps" | "activity-minutes",
                      )
                    }
                  >
                    <option value="steps">步数</option>
                    <option value="activity-minutes">活动分钟</option>
                  </select>
                </label>
                <label>
                  {health.preferences.activityMode === "steps"
                    ? "今日步数"
                    : "活动分钟"}
                  <input
                    aria-label={
                      health.preferences.activityMode === "steps"
                        ? "今日步数"
                        : "活动分钟"
                    }
                    type="number"
                    value={steps}
                    onChange={(e) => setSteps(e.target.value)}
                  />
                </label>
                <button
                  onClick={() => {
                    if (steps) {
                      health.addActivity(Number(steps));
                      setSteps("");
                    }
                  }}
                >
                  保存活动
                </button>
              </section>
            )}
            {health.preferences.enabledDailyMetrics.includes("energy") && (
              <section className="health-daily-metric-card" aria-labelledby="daily-energy-title">
                <span className="health-section-kicker" id="daily-energy-title">精力</span>
                <label>
                  主观精力（1–5）
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={energy}
                    onChange={(e) => setEnergy(e.target.value)}
                  />
                </label>
                <button
                  onClick={() => {
                    if (energy) {
                      health.addEnergy(Number(energy) as 1 | 2 | 3 | 4 | 5);
                      setEnergy("");
                    }
                  }}
                >
                  保存精力
                </button>
              </section>
            )}
            <p className="health-hint">
              没有记录不等于 0，也不会显示未达标警报。
            </p>
            <strong>今天已有 {todayDailyCount} 条日常记录</strong>
          </div>
          <div className="health-panel health-settings-panel">
            <div className="health-panel-heading">
              <div><span className="health-section-kicker">低频设置</span><h2>管理日常指标</h2></div>
              <button className="health-secondary-action" aria-expanded={dailySettingsOpen} onClick={() => setDailySettingsOpen((open) => !open)}>
                {dailySettingsOpen ? "收起设置" : "管理指标"}
              </button>
            </div>
            <p>关闭指标只会隐藏快捷入口，已经保存的历史仍会保留。</p>
            {dailySettingsOpen && (["sleep", "water", "activity", "energy"] as const).map((m) => (
                <label className="health-row health-metric-toggle" key={m}>
                  <input
                    type="checkbox"
                    checked={health.preferences.enabledDailyMetrics.includes(m)}
                    onChange={() => health.toggleMetric(m)}
                  />
                  <strong>
                    {
                      (
                        {
                          sleep: "睡眠",
                          water: "饮水",
                          activity: "活动",
                          energy: "精力",
                        } as const
                      )[m]
                    }
                  </strong>
                  <span>显示此指标</span>
                </label>
              ))}
          </div>
        </div>
        </details>
      )}
      {view === "workouts" && (
        <WorkoutWorkspace health={health} onSelectExercise={setSelectedExercise} onStatus={setStatus} />
      )}
      {view === "workouts" && (
        <details className="health-support-details" open={Boolean(selectedExercise)}>
          <summary>逐组记录、休息计时与训练历史</summary>
        <div className="health-two-column health-workout-layout">
          <form
            className="health-panel health-setup-panel"
            onSubmit={(e) => {
              e.preventDefault();
              if (exercise.trim()) {
                const id = health.addExercise({
                  name: exercise,
                  mode,
                  displayUnit:
                    mode === "weight-reps"
                      ? "kg"
                      : mode === "distance-time"
                        ? "km"
                        : "次",
                  defaultRestSeconds: 90,
                });
                setSelectedExercise(id);
                setExercise("");
              }
            }}
          >
            <h2>自定义训练项目</h2>
            <label>
              训练项目名称
              <input
                aria-label="训练项目名称"
                value={exercise}
                onChange={(e) => setExercise(e.target.value)}
                placeholder="例如：卧推、5 公里跑步"
              />
            </label>
            <label>
              记录模式
              <select
                aria-label="记录模式"
                value={mode}
                onChange={(e) => setMode(e.target.value as ExerciseMode)}
              >
                <option value="distance-time">距离计时</option>
                <option value="weight-reps">重量次数</option>
                <option value="bodyweight-reps">自重次数</option>
                <option value="timed-sets">定时组数</option>
                <option value="duration">时长训练</option>
              </select>
            </label>
            <button type="submit">创建训练项目</button>
          </form>
          <div className="health-panel health-training-workspace">
            <div className="health-panel-heading">
              <div>
                <span className="health-section-kicker">{selectedDefinition ? "正在记录" : "准备训练"}</span>
                <h2>{selectedDefinition ? selectedDefinition.name : "我的训练项目"}</h2>
              </div>
              {selectedDefinition && <span className="health-current-badge">训练进行中</span>}
            </div>
            <ol className="health-workout-steps" aria-label="训练记录步骤">
              <li className={!selectedDefinition ? "is-current" : "is-done"}>选择项目</li>
              <li className={selectedDefinition ? "is-current" : ""}>逐组记录</li>
              <li>结束摘要</li>
            </ol>
            {restTimer.seconds > 0 && (
              <div className="health-trend" aria-live="polite">
                <strong>休息 {restTimer.seconds} 秒</strong>
                <div className="water-actions">
                  {restTimer.running && (
                    <button onClick={restTimer.pause}>暂停</button>
                  )}
                  {restTimer.paused && (
                    <button onClick={restTimer.resume}>继续</button>
                  )}
                  <button onClick={() => restTimer.extend(30)}>
                    延长 30 秒
                  </button>
                  <button onClick={restTimer.skip}>跳过</button>
                </div>
              </div>
            )}
            {health.workouts.length > 0 && (
              <button onClick={() => health.copyLastWorkout()}>
                复制上次训练为草稿
              </button>
            )}
            {health.draftWorkout && (
              <div className="health-trend">
                <strong>有一份未完成训练草稿</strong>
                <div className="water-actions">
                  <button
                    onClick={() => {
                      setWorkoutSeed(health.draftWorkout);
                      setSelectedExercise(
                        health.draftWorkout!.entries[0]?.exerciseDefinitionId ??
                          "",
                      );
                    }}
                  >
                    恢复草稿
                  </button>
                  <button
                    onClick={() => {
                      health.discardDraftWorkout();
                      setStatus("训练草稿已放弃");
                    }}
                  >
                    放弃草稿
                  </button>
                </div>
              </div>
            )}
            {health.exercises.length ? (
              <div className="health-exercise-list" aria-label="训练项目列表">{health.exercises.map((x) => (
                <article className="health-row" key={x.id}>
                  <Dumbbell size={18} />
                  <strong>{x.name}</strong>
                  <button onClick={() => setSelectedExercise(x.id)}>
                    {selectedExercise === x.id ? "继续记录" : "开始记录"}
                  </button>
                  <button
                    onClick={() =>
                      setConfirmation({
                        kind: "archive",
                        exerciseId: x.id,
                        name: x.name,
                      })
                    }
                  >
                    归档
                  </button>
                </article>
              ))}</div>
            ) : (
              <Empty text="创建项目后可逐组记录，并复用上一次的数据。" />
            )}
            {selectedExercise && (
              <WorkoutRecorder
                key={`${selectedExercise}-${editingWorkoutId ?? workoutSeed?.id ?? "new"}`}
                definition={health.exercises.find(
                  (x) => x.id === selectedExercise,
                )!}
                initialEntry={workoutSeed?.entries[0]}
                distance={workoutDistance}
                minutes={workoutMinutes}
                restTimer={restTimer}
                onDistance={setWorkoutDistance}
                onMinutes={setWorkoutMinutes}
                onSave={(entry) => {
                  const copiedDraftId =
                    workoutSeed?.state === "draft" ? workoutSeed.id : undefined;
                  health.saveQuickWorkout(
                    {
                      exerciseDefinitionId: selectedExercise,
                      ...entry,
                    },
                    editingWorkoutId,
                  );
                  if (copiedDraftId) health.completeDraftWorkout(copiedDraftId);
                  setWorkoutDistance("");
                  setWorkoutMinutes("");
                  setEditingWorkoutId(undefined);
                  setWorkoutSeed(undefined);
                  setSelectedExercise("");
                }}
                saveLabel={editingWorkoutId ? "保存训练修改" : "保存本次训练"}
              />
            )}
            {health.workouts.map((session) => {
              const entry = session.entries[0];
              const definition = health.state.exerciseDefinitions.find(
                (x) => x.id === entry?.exerciseDefinitionId,
              );
              return (
                <article className="health-workout-summary" key={session.id}>
                  <strong>{definition?.name ?? "训练记录"}</strong>
                  <span>{formatWorkoutEntry(entry)}</span>
                  <button
                    onClick={() => {
                      setEditingWorkoutId(session.id);
                      setWorkoutSeed(session);
                      setSelectedExercise(entry.exerciseDefinitionId);
                    }}
                  >
                    编辑训练
                  </button>
                </article>
              );
            })}
            <strong>已完成 {health.workouts.length} 次训练</strong>
          </div>
        </div>
        </details>
      )}
      {view === "data" && (
        <div className="health-two-column">
          <div className="health-panel">
            <h2>导出与恢复</h2>
            <p>
              健康数据保存在当前浏览器。V1 导出单文件 JSON
              bundle，包含结构数据、媒体编码、清单与校验和。
            </p>
            <button
              onClick={async () => downloadBackup(await health.exportBundle())}
            >
              导出完整健康备份
            </button>
            <label className="health-file-picker">
              选择健康备份文件
              <input
                aria-label="选择健康备份文件"
                type="file"
                accept=".json,application/json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setImportPreview(undefined);
                  try {
                    const content = await file.text();
                    setImportText(content);
                    setStatus(`已选择 ${file.name}，请先预检备份`);
                  } catch {
                    setImportText("");
                    setStatus("无法读取该文件，当前数据未改变");
                  }
                }}
              />
              <span>{importText ? "文件已读取，等待预检" : "仅支持本应用导出的 JSON bundle"}</span>
            </label>
            <button
              disabled={!importText}
              onClick={() => setImportPreview(health.previewBundle(importText))}
            >
              预检备份
            </button>
            {importPreview && (
              <div className="health-trend">
                <strong>预检通过</strong>
                <p>
                  {importPreview.records} 条结构记录 · {importPreview.media}{" "}
                  个媒体文件
                </p>
                <p>
                  V1
                  不做逐条合并；确认后整体替换。导入失败会回滚，当前数据不会被静默覆盖。ZIP
                  与 updatedAt 分叉合并延后到 V1.1。
                </p>
                <button
                  onClick={() => setConfirmation({ kind: "import" })}
                >
                  确认替换并导入
                </button>
              </div>
            )}
          </div>
          <div className="health-panel">
            <h2>垃圾箱</h2>
            {health.deleted.body.map((x) => (
              <article className="health-row" key={x.id}>
                <strong>身体记录 {formatLocalDate(x.measuredAt)}</strong>
                <button onClick={() => health.restore("body", x.id)}>
                  恢复
                </button>
                <PermanentDeleteButton
                  onDelete={() => health.permanentlyDelete("body", x.id)}
                />
              </article>
            ))}
            {health.deleted.meals.map((x) => (
              <article className="health-row" key={x.id}>
                <strong>{x.description}</strong>
                <button onClick={() => health.restore("meal", x.id)}>
                  恢复
                </button>
                <PermanentDeleteButton
                  onDelete={() => health.permanentlyDelete("meal", x.id)}
                />
              </article>
            ))}
            {health.deleted.daily.map((x) => (
              <article className="health-row" key={x.id}>
                <strong>日常记录 {formatLocalDate(x.occurredAt)}</strong>
                <button onClick={() => health.restore("daily", x.id)}>
                  恢复
                </button>
                <PermanentDeleteButton
                  onDelete={() => health.permanentlyDelete("daily", x.id)}
                />
              </article>
            ))}
            {health.deleted.workouts.map((x) => (
              <article className="health-row" key={x.id}>
                <strong>训练记录 {formatLocalDate(x.startedAt)}</strong>
                <button onClick={() => health.restore("workout", x.id)}>
                  恢复
                </button>
                <PermanentDeleteButton
                  onDelete={() => health.permanentlyDelete("workout", x.id)}
                />
              </article>
            ))}
            {!health.deleted.body.length &&
              !health.deleted.meals.length &&
              !health.deleted.daily.length &&
              !health.deleted.workouts.length && (
                <Empty text="垃圾箱为空。删除的记录会先保留在这里。" />
              )}
          </div>
        </div>
      )}
      {bodyCorrection && (
        <BodyCorrectionDialog
          record={bodyCorrection}
          onClose={() => setBodyCorrection(undefined)}
          onSave={(weightKg, reason) => {
            const saved = health.reviseBodyRecord(bodyCorrection.id, {
              weightKg,
              reason,
            });
            if (saved) {
              setBodyCorrection(undefined);
              setStatus("身体记录已更正，原始版本仍保留在修订链中");
            }
          }}
        />
      )}
      {confirmation && (
        <ConfirmActionDialog
          title={confirmation.kind === "archive" ? "归档训练项目" : "整体替换健康数据"}
          description={
            confirmation.kind === "archive"
              ? `归档“${confirmation.name}”后，项目会从可记录列表隐藏，已有训练历史仍然保留。`
              : `将使用已通过预检的备份整体替换当前健康数据。导入失败会回滚，当前数据不会被静默覆盖。`
          }
          confirmLabel={confirmation.kind === "archive" ? "确认归档" : "确认替换并导入"}
          onClose={() => setConfirmation(undefined)}
          onConfirm={async () => {
            if (confirmation.kind === "archive") {
              health.archiveExercise(confirmation.exerciseId);
              if (selectedExercise === confirmation.exerciseId) setSelectedExercise("");
              setStatus("训练项目已归档，历史记录仍保留");
            } else {
              const ok = await health.importBundle(importText);
              setStatus(ok ? "备份导入完成" : "导入失败，原数据已保留");
            }
            setConfirmation(undefined);
          }}
        />
      )}
      <footer className="health-boundary">
        本模块用于个人记录与复盘，不提供诊断、治疗或医疗风险判断。明显不适请联系专业人员。
      </footer>
    </section>
  );
}

function BodyCorrectionDialog({
  record,
  onClose,
  onSave,
}: {
  record: BodyRecord;
  onClose: () => void;
  onSave: (weightKg: number, reason?: string) => void;
}) {
  const [nextWeight, setNextWeight] = useState(
    record.weightGrams ? String(record.weightGrams / 1000) : "",
  );
  const [reason, setReason] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [onClose]);

  return (
    <div className="health-dialog-backdrop">
      <form
        className="health-dialog health-dialog-form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="body-correction-title"
        onSubmit={(event) => {
          event.preventDefault();
          if (nextWeight) onSave(Number(nextWeight), reason || undefined);
        }}
      >
        <div className="health-dialog-header">
          <div>
            <span className="health-section-kicker">保留原始版本</span>
            <h2 id="body-correction-title">更正身体记录</h2>
          </div>
          <button type="button" className="health-icon-button" onClick={onClose} aria-label="关闭更正">
            <X aria-hidden="true" />
          </button>
        </div>
        <p>原体重：{record.weightGrams ? `${record.weightGrams / 1000} kg` : "未记录"}。保存后会生成可追踪的修订版本。</p>
        <label>
          更正后的体重（kg）
          <input ref={inputRef} aria-label="更正后的体重（kg）" type="number" step="0.01" value={nextWeight} onChange={(event) => setNextWeight(event.target.value)} />
        </label>
        <label>
          更正原因（可选）
          <textarea aria-label="更正原因（可选）" value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
        <div className="health-dialog-footer">
          <button type="button" onClick={onClose}>取消</button>
          <button type="submit">保存更正</button>
        </div>
      </form>
    </div>
  );
}

function ConfirmActionDialog({
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [onClose]);
  const titleId = `confirm-${confirmLabel}`;
  return (
    <div className="health-dialog-backdrop">
      <div className="health-dialog health-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="health-dialog-header">
          <div>
            <span className="health-section-kicker">请确认影响</span>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button type="button" className="health-icon-button" onClick={onClose} aria-label={`关闭${title}`}>
            <X aria-hidden="true" />
          </button>
        </div>
        <p>{description}</p>
        <div className="health-dialog-footer">
          <button ref={cancelRef} type="button" onClick={onClose}>取消</button>
          <button type="button" className="health-danger-action" onClick={() => void onConfirm()}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function QuickRecordDialog({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (view: Exclude<View, "home" | "data">) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [onClose]);

  const actions: Array<{
    label: string;
    detail: string;
    view: Exclude<View, "home" | "data">;
    icon: typeof Scale;
  }> = [
    { label: "记录饮水", detail: "快捷杯量或自定义毫升", view: "daily", icon: GlassWater },
    { label: "记录睡眠", detail: "时长与可选质量", view: "daily", icon: Moon },
    { label: "记录餐食", detail: "文字、照片与饱腹感", view: "meals", icon: Apple },
    { label: "记录身体", detail: "体重、体脂与身高", view: "body", icon: Scale },
    { label: "开始训练", detail: "继续项目或逐组记录", view: "workouts", icon: Dumbbell },
  ];

  return (
    <div className="health-dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div
        className="health-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-record-title"
        ref={dialogRef}
      >
        <div className="health-dialog-header">
          <div>
            <span className="health-section-kicker">只选一项就好</span>
            <h2 id="quick-record-title">一键记录</h2>
          </div>
          <button ref={closeRef} className="health-icon-button" onClick={onClose} aria-label="关闭一键记录">
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="health-dialog-actions">
          {actions.map(({ label, detail, view, icon: Icon }) => (
            <button key={label} aria-label={label} onClick={() => onSelect(view)}>
              <span className="health-entry-icon"><Icon aria-hidden="true" /></span>
              <span><strong>{label}</strong><small>{detail}</small></span>
            </button>
          ))}
        </div>
        <p className="health-dialog-note"><Clock3 aria-hidden="true" /> 常用记录通常只需几十秒。</p>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="health-empty">{text}</div>;
}
function formatLocalDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
function formatLocalDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
function PermanentDeleteButton({
  onDelete,
}: {
  onDelete: () => Promise<boolean>;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <button onClick={() => setConfirming(true)}>永久删除</button>
      {confirming && (
        <ConfirmActionDialog
          title="永久删除记录"
          description="永久删除后无法恢复。其他仍在垃圾箱中的记录不会受影响。"
          confirmLabel="确认永久删除"
          onClose={() => setConfirming(false)}
          onConfirm={async () => {
            await onDelete();
            setConfirming(false);
          }}
        />
      )}
    </>
  );
}
function MealPhoto({
  id,
  load,
}: {
  id: string;
  load: (id: string) => Promise<Blob | undefined>;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    let objectUrl = "";
    load(id).then((blob) => {
      if (blob && active) {
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      }
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, load]);
  return url ? (
    <img className="health-meal-photo" src={url} alt="本地餐食照片" />
  ) : (
    <span className="health-photo-placeholder">照片读取中</span>
  );
}
function WorkoutRecorder({
  definition,
  initialEntry,
  distance,
  minutes,
  restTimer,
  onDistance,
  onMinutes,
  onSave,
  saveLabel,
}: {
  definition: { name: string; mode: ExerciseMode; defaultRestSeconds?: number };
  initialEntry?: WorkoutSession["entries"][number];
  distance: string;
  minutes: string;
  restTimer: {
    seconds: number;
    running: boolean;
    paused: boolean;
    start: (value: number) => void;
    pause: () => void;
    resume: () => void;
    extend: (value?: number) => void;
    skip: () => void;
  };
  onDistance: (v: string) => void;
  onMinutes: (v: string) => void;
  onSave: (entry: {
    sets?: Array<{
      weightKg?: number;
      reps?: number;
      durationSeconds?: number;
      setType?: WorkoutSet["setType"];
      side?: WorkoutSet["side"];
      addedWeightKg?: number;
      assistanceWeightKg?: number;
    }>;
    segments?: Array<{ distanceMeters: number; durationSeconds: number }>;
    distanceMeters?: number;
    durationSeconds?: number;
  }) => void;
  saveLabel: string;
}) {
  const toSet = (set?: WorkoutSet) => ({
    weight:
      set?.weightGrams === undefined ? "" : String(set.weightGrams / 1000),
    reps: set?.reps === undefined ? "" : String(set.reps),
    minutes:
      set?.durationSeconds === undefined
        ? ""
        : String(set.durationSeconds / 60),
    setType: set?.setType ?? "working",
    side: set?.side ?? "both",
    addedWeight:
      set?.addedWeightGrams === undefined
        ? ""
        : String(set.addedWeightGrams / 1000),
    assistanceWeight:
      set?.assistanceWeightGrams === undefined
        ? ""
        : String(set.assistanceWeightGrams / 1000),
  });
  const [sets, setSets] = useState(
    initialEntry?.sets?.length ? initialEntry.sets.map(toSet) : [toSet()],
  );
  const [segments, setSegments] = useState(
    initialEntry?.segments?.length
      ? initialEntry.segments.map((segment) => ({
          distance: String(segment.distanceMeters / 1000),
          minutes: String(segment.durationSeconds / 60),
        }))
      : [{ distance: "", minutes: "" }],
  );
  const [advanced, setAdvanced] = useState(
    Boolean(
      initialEntry?.segments?.length ||
      initialEntry?.sets?.some(
        (set) =>
          set.setType ||
          set.side ||
          set.addedWeightGrams !== undefined ||
          set.assistanceWeightGrams !== undefined,
      ),
    ),
  );
  const grouped =
    definition.mode === "weight-reps" ||
    definition.mode === "bodyweight-reps" ||
    definition.mode === "timed-sets";
  const update = (
    index: number,
    key:
      | "weight"
      | "reps"
      | "minutes"
      | "setType"
      | "side"
      | "addedWeight"
      | "assistanceWeight",
    value: string,
  ) =>
    setSets((current) =>
      current.map((set, i) => (i === index ? { ...set, [key]: value } : set)),
    );
  return (
    <>
      <div className="health-recorder-heading">
        <span className="health-section-kicker">当前动作</span>
        <h3>本次训练 · {definition.name}</h3>
        <p>按实际完成情况逐组填写；进阶字段默认收起。</p>
      </div>
      {definition.mode === "distance-time" && (
        <>
          <label>
            距离（km）
            <input
              type="number"
              value={distance}
              onChange={(e) => onDistance(e.target.value)}
            />
          </label>
          <label>
            用时（分钟）
            <input
              type="number"
              value={minutes}
              onChange={(e) => onMinutes(e.target.value)}
            />
          </label>
        </>
      )}
      {definition.mode !== "duration" && (
        <button
          className="health-progressive-action"
          onClick={() => setAdvanced((value) => !value)}
        >
          {advanced ? "收起进阶记录" : "展开进阶记录"}
        </button>
      )}
      {advanced && definition.mode === "distance-time" && (
        <div className="health-advanced-fields">
          <strong>分段记录</strong>
          {segments.map((segment, index) => (
            <div className="health-set" key={index}>
              <label>
                第 {index + 1} 段距离（km）
                <input
                  aria-label={`第 ${index + 1} 段距离（km）`}
                  type="number"
                  value={segment.distance}
                  onChange={(e) =>
                    setSegments((items) =>
                      items.map((item, i) =>
                        i === index
                          ? { ...item, distance: e.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </label>
              <label>
                第 {index + 1} 段用时（分钟）
                <input
                  aria-label={`第 ${index + 1} 段用时（分钟）`}
                  type="number"
                  value={segment.minutes}
                  onChange={(e) =>
                    setSegments((items) =>
                      items.map((item, i) =>
                        i === index
                          ? { ...item, minutes: e.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </label>
            </div>
          ))}
          <button
            onClick={() =>
              setSegments((items) => [...items, { distance: "", minutes: "" }])
            }
          >
            添加分段
          </button>
        </div>
      )}
      {grouped &&
        sets.map((set, index) => (
          <div className="health-set" key={index}>
            <strong>第 {index + 1} 组</strong>
            {definition.mode === "weight-reps" && (
              <label>
                重量（kg）
                <input
                  aria-label={`第 ${index + 1} 组重量（kg）`}
                  type="number"
                  value={set.weight}
                  onChange={(e) => update(index, "weight", e.target.value)}
                />
              </label>
            )}
            {definition.mode !== "timed-sets" && (
              <label>
                次数
                <input
                  aria-label={`第 ${index + 1} 组次数`}
                  type="number"
                  value={set.reps}
                  onChange={(e) => update(index, "reps", e.target.value)}
                />
              </label>
            )}
            {definition.mode === "timed-sets" && (
              <label>
                时长（分钟）
                <input
                  aria-label={`第 ${index + 1} 组时长（分钟）`}
                  type="number"
                  value={set.minutes}
                  onChange={(e) => update(index, "minutes", e.target.value)}
                />
              </label>
            )}
            {advanced && definition.mode === "weight-reps" && (
              <label>
                组类型
                <select
                  aria-label={`第 ${index + 1} 组类型`}
                  value={set.setType}
                  onChange={(e) => update(index, "setType", e.target.value)}
                >
                  <option value="warmup">热身组</option>
                  <option value="working">正式组</option>
                  <option value="drop">递减组</option>
                </select>
              </label>
            )}
            {advanced && (
              <label>
                侧别
                <select
                  aria-label={`第 ${index + 1} 组侧别`}
                  value={set.side}
                  onChange={(e) => update(index, "side", e.target.value)}
                >
                  <option value="both">双侧</option>
                  <option value="left">左侧</option>
                  <option value="right">右侧</option>
                </select>
              </label>
            )}
            {advanced && definition.mode === "bodyweight-reps" && (
              <>
                <label>
                  额外负重（kg）
                  <input
                    aria-label={`第 ${index + 1} 组额外负重（kg）`}
                    type="number"
                    value={set.addedWeight}
                    onChange={(e) =>
                      update(index, "addedWeight", e.target.value)
                    }
                  />
                </label>
                <label>
                  辅助重量（kg）
                  <input
                    aria-label={`第 ${index + 1} 组辅助重量（kg）`}
                    type="number"
                    value={set.assistanceWeight}
                    onChange={(e) =>
                      update(index, "assistanceWeight", e.target.value)
                    }
                  />
                </label>
              </>
            )}
          </div>
        ))}
      {grouped && (
        <button
          className="health-add-set-action"
          onClick={() => setSets((current) => [...current, toSet()])}
        >
          添加一组
        </button>
      )}
      {definition.mode === "duration" && (
        <label>
          时长（分钟）
          <input
            type="number"
            value={minutes}
            onChange={(e) => onMinutes(e.target.value)}
          />
        </label>
      )}
      {grouped && (
        <div className="water-actions" aria-live="polite">
          <button
            onClick={() => restTimer.start(definition.defaultRestSeconds ?? 90)}
          >
            {restTimer.seconds
              ? `休息 ${restTimer.seconds} 秒`
              : "完成本组并开始休息"}
          </button>
          {restTimer.running && <button onClick={restTimer.pause}>暂停</button>}
          {restTimer.paused && <button onClick={restTimer.resume}>继续</button>}
          {restTimer.seconds > 0 && (
            <>
              <button onClick={() => restTimer.extend(30)}>延长 30 秒</button>
              <button onClick={restTimer.skip}>跳过</button>
            </>
          )}
        </div>
      )}
      <button
        className="health-save-action"
        onClick={() =>
          onSave({
            distanceMeters: distance ? Number(distance) * 1000 : undefined,
            durationSeconds: minutes ? Number(minutes) * 60 : undefined,
            segments:
              advanced && definition.mode === "distance-time"
                ? segments
                    .filter((segment) => segment.distance && segment.minutes)
                    .map((segment) => ({
                      distanceMeters: Number(segment.distance) * 1000,
                      durationSeconds: Number(segment.minutes) * 60,
                    }))
                : undefined,
            sets: grouped
              ? sets.map((set) => ({
                  weightKg: set.weight ? Number(set.weight) : undefined,
                  reps: set.reps ? Number(set.reps) : undefined,
                  durationSeconds: set.minutes
                    ? Number(set.minutes) * 60
                    : undefined,
                  setType:
                    advanced && definition.mode === "weight-reps"
                      ? (set.setType as WorkoutSet["setType"])
                      : undefined,
                  side: advanced ? (set.side as WorkoutSet["side"]) : undefined,
                  addedWeightKg: set.addedWeight
                    ? Number(set.addedWeight)
                    : undefined,
                  assistanceWeightKg: set.assistanceWeight
                    ? Number(set.assistanceWeight)
                    : undefined,
                }))
              : undefined,
          })
        }
      >
        {saveLabel}
      </button>
    </>
  );
}
function formatWorkoutEntry(entry?: WorkoutSession["entries"][number]) {
  if (!entry) return "暂无摘要";
  if (entry.segments?.length) return `${entry.segments.length} 个分段`;
  const sets = entry.sets ?? [];
  if (!sets.length)
    return entry.durationSeconds
      ? `${entry.durationSeconds / 60} 分钟`
      : "已记录";
  const first = sets[0];
  const labels = [
    first.setType === "warmup"
      ? "热身组"
      : first.setType === "drop"
        ? "递减组"
        : first.setType === "working"
          ? "正式组"
          : undefined,
    first.side === "left"
      ? "左侧"
      : first.side === "right"
        ? "右侧"
        : first.side === "both"
          ? "双侧"
          : undefined,
    first.addedWeightGrams !== undefined
      ? `额外 ${first.addedWeightGrams / 1000} kg`
      : undefined,
    first.assistanceWeightGrams !== undefined
      ? `辅助 ${first.assistanceWeightGrams / 1000} kg`
      : undefined,
  ].filter(Boolean);
  return `${sets.length} 组${labels.length ? ` · ${labels.join(" · ")}` : ""}`;
}
function downloadBackup(content: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "dice-life-health-backup.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

function isLocalToday(value: string, now = new Date()) {
  const date = new Date(value);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function calculateBmiPreview(heightCm?: number, weightKg?: number) {
  if (!heightCm || !weightKg || !Number.isFinite(heightCm) || !Number.isFinite(weightKg)) {
    return undefined;
  }
  const meters = heightCm / 100;
  if (meters <= 0 || weightKg <= 0) return undefined;
  return weightKg / (meters * meters);
}
