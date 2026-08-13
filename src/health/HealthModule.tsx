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
import { useRestTimer } from "./useRestTimer";

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
  const [customWater, setCustomWater] = useState("");
  const [sleepQuality, setSleepQuality] = useState("");
  const [energy, setEnergy] = useState("");
  const [selectedExercise, setSelectedExercise] = useState("");
  const [workoutDistance, setWorkoutDistance] = useState("");
  const [workoutMinutes, setWorkoutMinutes] = useState("");
  const restTimer = useRestTimer();
  const [importText, setImportText] = useState("");
  const [importPreview, setImportPreview] = useState<{
    records: number;
    media: number;
    updatedAt: string;
  }>();
  const [status, setStatus] = useState("");
  const [mealPhotos, setMealPhotos] = useState<File[]>([]);
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
                      if (next) {
                        const reason =
                          window.prompt("更正原因（可选）", "") ?? undefined;
                        health.reviseBodyRecord(r.id, {
                          weightKg: Number(next),
                          reason,
                        });
                      }
                    }}
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
      )}
      {view === "daily" && (
        <div className="health-two-column">
          <div className="health-panel">
            <h2>今日快速记录</h2>
            {health.preferences.enabledDailyMetrics.includes("water") && (
              <>
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
              </>
            )}
            {health.preferences.enabledDailyMetrics.includes("sleep") && (
              <>
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
              </>
            )}
            {health.preferences.enabledDailyMetrics.includes("activity") && (
              <>
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
              </>
            )}
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
                    onClick={() =>
                      setSelectedExercise(
                        health.draftWorkout!.entries[0]?.exerciseDefinitionId ??
                          "",
                      )
                    }
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
              health.exercises.map((x) => (
                <article className="health-row" key={x.id}>
                  <Dumbbell size={18} />
                  <strong>{x.name}</strong>
                  <button onClick={() => setSelectedExercise(x.id)}>
                    记录
                  </button>
                  <button
                    onClick={() => {
                      if (
                        window.confirm("归档项目后历史训练仍会保留，确定继续？")
                      ) {
                        health.archiveExercise(x.id);
                        if (selectedExercise === x.id) setSelectedExercise("");
                        setStatus("训练项目已归档，历史记录仍保留");
                      }
                    }}
                  >
                    归档
                  </button>
                </article>
              ))
            ) : (
              <Empty text="创建项目后可逐组记录，并复用上一次的数据。" />
            )}
            {selectedExercise && (
              <WorkoutRecorder
                key={selectedExercise}
                definition={health.exercises.find(
                  (x) => x.id === selectedExercise,
                )!}
                distance={workoutDistance}
                minutes={workoutMinutes}
                restTimer={restTimer}
                onDistance={setWorkoutDistance}
                onMinutes={setWorkoutMinutes}
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
                onChange={(e) => {
                  setImportText(e.target.value);
                  setImportPreview(undefined);
                }}
              />
            </label>
            <button
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
                <p>将替换当前健康数据，原数据保留在上次有效快照中。</p>
                <button
                  onClick={async () => {
                    if (window.confirm("确认用此备份替换当前健康数据？")) {
                      const ok = await health.importBundle(importText);
                      setStatus(ok ? "备份导入完成" : "导入失败，原数据已保留");
                    }
                  }}
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
      <footer className="health-boundary">
        本模块用于个人记录与复盘，不提供诊断、治疗或医疗风险判断。明显不适请联系专业人员。
      </footer>
    </section>
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
  return (
    <button
      onClick={async () => {
        if (window.confirm("永久删除后无法恢复，确定继续？")) await onDelete();
      }}
    >
      永久删除
    </button>
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
  distance,
  minutes,
  restTimer,
  onDistance,
  onMinutes,
  onSave,
}: {
  definition: { mode: ExerciseMode; defaultRestSeconds?: number };
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
