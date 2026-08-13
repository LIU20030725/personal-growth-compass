import { useEffect, useState } from "react";
import {
  Activity,
  Apple,
  ChevronLeft,
  Dumbbell,
  HeartPulse,
  Moon,
  Plus,
  Scale,
  Utensils,
  Waves,
} from "lucide-react";
import { useHealthSystem } from "./useHealthSystem";
import { deriveBodyTrend } from "./healthEngine";
import type { ExerciseMode, MealRecord } from "./types";
import "./healthModule.css";

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

export function HealthModule() {
  const health = useHealthSystem();
  const [view, setView] = useState<View>("home");
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
  const [sleepQuality, setSleepQuality] = useState("");
  const [energy, setEnergy] = useState("");
  const [selectedExercise, setSelectedExercise] = useState("");
  const [workoutDistance, setWorkoutDistance] = useState("");
  const [workoutMinutes, setWorkoutMinutes] = useState("");
  const [restSeconds, setRestSeconds] = useState(0);
  const [importText, setImportText] = useState("");
  const [mealPhotos, setMealPhotos] = useState<File[]>([]);
  useEffect(() => {
    if (restSeconds <= 0) return;
    const timer = window.setInterval(
      () => setRestSeconds((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [restSeconds]);
  const latest = health.bodyRecords[0];
  const bodyTrend = deriveBodyTrend(health.bodyRecords, 30);
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
      ? "健康状况"
      : view === "data"
        ? "数据与隐私"
        : cards.find((c) => c.id === view)!.title;
  return (
    <section className="health-module" aria-labelledby="health-title">
      <header className="health-hero">
        {view !== "home" && (
          <button className="health-back" onClick={() => setView("home")}>
            <ChevronLeft size={18} />
            返回健康首页
          </button>
        )}
        <div className="health-eyebrow">
          <HeartPulse size={16} /> HEALTH JOURNAL
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
          <div className="health-today">
            <div>
              <span>今日状态</span>
              <strong>
                {health.todayWaterMl
                  ? `饮水 ${health.todayWaterMl} ml`
                  : "等待你的第一条记录"}
              </strong>
              <p>
                {health.meals.length} 条餐食 · {health.workouts.length} 次训练
              </p>
            </div>
            <button onClick={() => setView("daily")}>
              <Plus size={18} />
              快速记录
            </button>
          </div>
          <div className="health-card-grid">
            {cards.map(({ id, title, subtitle, icon: Icon }) => (
              <button
                key={id}
                className="health-entry-card"
                onClick={() => setView(id)}
              >
                <Icon />
                <span>
                  <strong>{title}</strong>
                  <small>{subtitle}</small>
                </span>
                <b>进入</b>
              </button>
            ))}
          </div>
          <aside className="health-review">
            <Waves />
            <div>
              <strong>周 / 月记录趋势</strong>
              <p>
                近 7 天 {recentCount(7)} 条 · 近 30 天 {recentCount(30)} 条。
                {health.bodyRecords.length + health.daily.length < 2
                  ? "再留下几条同类记录后，才会描述可比较的变化。"
                  : "你的健康档案正在形成，可进入各模块查看同类数据变化。"}
              </p>
            </div>
          </aside>
          <button className="health-data-link" onClick={() => setView("data")}>
            数据导出、导入与垃圾箱
          </button>
        </>
      )}
      {view === "body" && (
        <div className="health-two-column">
          <form
            className="health-panel"
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
                  latest?.bmiHundredths
                    ? (latest.bmiHundredths / 100).toFixed(2)
                    : "保存后自动计算"
                }
              />
            </label>
            <button type="submit">保存身体记录</button>
          </form>
          <div className="health-panel">
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
                    onClick={() => {
                      const next = window.prompt(
                        "更正体重（kg）",
                        r.weightGrams ? String(r.weightGrams / 1000) : "",
                      );
                      if (next)
                        health.reviseBodyRecord(r.id, {
                          weightKg: Number(next),
                        });
                    }}
                  >
                    更正
                  </button>
                  <button onClick={() => health.softDelete("body", r.id)}>
                    移到垃圾箱
                  </button>
                  <time>{r.measuredAt.slice(0, 10)}</time>
                </article>
              ))
            ) : (
              <Empty text="还没有身体记录。只有一条时展示当前值，不判断趋势。" />
            )}
          </div>
        </div>
      )}
      {view === "meals" && (
        <div className="health-two-column">
          <form
            className="health-panel"
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
          <div className="health-panel">
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
                  <time>{m.eatenAt.slice(0, 16).replace("T", " ")}</time>
                </article>
              ))
            ) : (
              <Empty text="可以只用文字、只用照片或两者一起记录。" />
            )}
          </div>
        </div>
      )}
      {view === "daily" && (
        <div className="health-two-column">
          <div className="health-panel">
            <h2>今日快速记录</h2>
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
            <label>
              今日步数
              <input
                aria-label="今日步数"
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
            {health.preferences.enabledDailyMetrics.includes("energy") && (
              <>
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
              </>
            )}
            <p className="health-hint">
              没有记录不等于 0，也不会显示未达标警报。
            </p>
            <strong>今天已有 {health.daily.length} 条日常记录</strong>
          </div>
          <div className="health-panel">
            <h2>启用的指标</h2>
            {(["sleep", "water", "activity", "energy"] as const).map((m) => (
              <label className="health-row" key={m}>
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
      )}
      {view === "workouts" && (
        <div className="health-two-column">
          <form
            className="health-panel"
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
          <div className="health-panel">
            <h2>我的训练项目</h2>
            {health.workouts.length > 0 && (
              <button onClick={() => health.copyLastWorkout()}>
                复制上次训练为草稿
              </button>
            )}
            {health.exercises.length ? (
              health.exercises.map((x) => (
                <article className="health-row" key={x.id}>
                  <Dumbbell size={18} />
                  <strong>{x.name}</strong>
                  <button onClick={() => setSelectedExercise(x.id)}>
                    记录
                  </button>
                </article>
              ))
            ) : (
              <Empty text="创建项目后可逐组记录，并复用上一次的数据。" />
            )}
            {selectedExercise && (
              <WorkoutRecorder
                key={selectedExercise}
                definition={
                  health.exercises.find((x) => x.id === selectedExercise)!
                }
                distance={workoutDistance}
                minutes={workoutMinutes}
                restSeconds={restSeconds}
                onDistance={setWorkoutDistance}
                onMinutes={setWorkoutMinutes}
                onRest={setRestSeconds}
                onSave={(sets) => {
                  health.saveQuickWorkout({
                    exerciseDefinitionId: selectedExercise,
                    distanceMeters: workoutDistance
                      ? Number(workoutDistance) * 1000
                      : undefined,
                    durationSeconds: workoutMinutes
                      ? Number(workoutMinutes) * 60
                      : undefined,
                    sets,
                  });
                  setWorkoutDistance("");
                  setWorkoutMinutes("");
                }}
              />
            )}
            <strong>已完成 {health.workouts.length} 次训练</strong>
          </div>
        </div>
      )}
      {view === "data" && (
        <div className="health-two-column">
          <div className="health-panel">
            <h2>导出与恢复</h2>
            <p>
              健康数据保存在当前浏览器。请定期导出并保存到自己的设备。备份包含结构化记录与本地餐食照片。
            </p>
            <button
              onClick={async () => downloadBackup(await health.exportBundle())}
            >
              导出完整健康备份
            </button>
            <label>
              导入备份内容
              <textarea
                aria-label="导入备份内容"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
            </label>
            <button onClick={() => health.importBundle(importText)}>
              校验并导入
            </button>
          </div>
          <div className="health-panel">
            <h2>垃圾箱</h2>
            {health.deleted.body.map((x) => (
              <article className="health-row" key={x.id}>
                <strong>身体记录 {x.measuredAt.slice(0, 10)}</strong>
                <button onClick={() => health.restore("body", x.id)}>
                  恢复
                </button>
              </article>
            ))}
            {health.deleted.meals.map((x) => (
              <article className="health-row" key={x.id}>
                <strong>{x.description}</strong>
                <button onClick={() => health.restore("meal", x.id)}>
                  恢复
                </button>
              </article>
            ))}
            {!health.deleted.body.length && !health.deleted.meals.length && (
              <Empty text="垃圾箱为空。删除的记录会先保留在这里。" />
            )}
          </div>
        </div>
      )}
      <footer className="health-boundary">
        本模块用于个人记录与复盘，不提供诊断、治疗或医疗风险判断。明显不适请联系专业人员。
      </footer>
    </section>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="health-empty">{text}</div>;
}
function WorkoutRecorder({
  definition,
  distance,
  minutes,
  restSeconds,
  onDistance,
  onMinutes,
  onRest,
  onSave,
}: {
  definition: { mode: ExerciseMode; defaultRestSeconds?: number };
  distance: string;
  minutes: string;
  restSeconds: number;
  onDistance: (v: string) => void;
  onMinutes: (v: string) => void;
  onRest: (v: number) => void;
  onSave: (
    sets?: Array<{
      weightKg?: number;
      reps?: number;
      durationSeconds?: number;
    }>,
  ) => void;
}) {
  const [sets, setSets] = useState([{ weight: "", reps: "", minutes: "" }]);
  const grouped =
    definition.mode === "weight-reps" ||
    definition.mode === "bodyweight-reps" ||
    definition.mode === "timed-sets";
  const update = (
    index: number,
    key: "weight" | "reps" | "minutes",
    value: string,
  ) =>
    setSets((current) =>
      current.map((set, i) => (i === index ? { ...set, [key]: value } : set)),
    );
  return (
    <>
      <h2>本次训练</h2>
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
          </div>
        ))}
      {grouped && (
        <button
          onClick={() =>
            setSets((current) => [
              ...current,
              { weight: "", reps: "", minutes: "" },
            ])
          }
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
        <button onClick={() => onRest(definition.defaultRestSeconds ?? 90)}>
          {restSeconds ? `休息 ${restSeconds} 秒` : "完成本组并开始休息"}
        </button>
      )}
      <button
        onClick={() =>
          onSave(
            grouped
              ? sets.map((set) => ({
                  weightKg: set.weight ? Number(set.weight) : undefined,
                  reps: set.reps ? Number(set.reps) : undefined,
                  durationSeconds: set.minutes
                    ? Number(set.minutes) * 60
                    : undefined,
                }))
              : undefined,
          )
        }
      >
        保存本次训练
      </button>
    </>
  );
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
