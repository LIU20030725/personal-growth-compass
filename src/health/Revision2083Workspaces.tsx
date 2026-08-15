import { useEffect, useState, type CSSProperties } from "react";
import {
  Apple,
  Bell,
  Clock3,
  Dumbbell,
  GlassWater,
  Moon,
  Plus,
  Search,
  Settings2,
  Utensils,
  X,
} from "lucide-react";
import type { useHealthSystem } from "./useHealthSystem";
import type {
  BodyCircumferenceKey,
  ExerciseMode,
  FoodCatalogItem,
  MealRecord,
} from "./types";

type HealthSystem = ReturnType<typeof useHealthSystem>;
type Status = (message: string) => void;

const circumferenceLabels: Record<BodyCircumferenceKey, string> = {
  neck: "颈围",
  arm: "臂围",
  chest: "胸围",
  waist: "腰围",
  hips: "臀围",
  thigh: "大腿围",
  calf: "小腿围",
};

export function BodyWorkspace({ health, onStatus }: { health: HealthSystem; onStatus: Status }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [metric, setMetric] = useState<"weight" | "bodyFat" | BodyCircumferenceKey>("weight");
  const [value, setValue] = useState("");
  const latest = health.bodyRecords[0];
  const c = latest?.circumferencesMm ?? {};
  const chestWaist = c.chest && c.waist ? c.chest / c.waist : undefined;
  const waistHip = c.waist && c.hips ? c.waist / c.hips : undefined;
  const save = () => {
    const number = Number(value);
    const ok = health.addBodyRecord(
      metric === "weight"
        ? { weightKg: number }
        : metric === "bodyFat"
          ? { bodyFatPercent: number }
          : { circumferencesCm: { [metric]: number } },
    );
    if (ok) {
      setValue("");
      setPickerOpen(false);
      onStatus("身体数据已保存");
    }
  };
  return (
    <section className="health-workspace health-body-workspace" aria-labelledby="body-workspace-title">
      <div className="health-workspace-heading">
        <div><span className="health-section-kicker">身体变化</span><h2 id="body-workspace-title">围度与核心指标</h2></div>
        <button className="health-primary-action" onClick={() => setPickerOpen(true)}><Plus size={18} /> 添加身体数据</button>
      </div>
      <div className="health-body-overview">
        <div className="health-body-map" aria-label="身体围度记录示意图">
          <svg viewBox="0 0 180 360" role="img" aria-labelledby="body-map-title">
            <title id="body-map-title">颈、臂、胸、腰、臀、大腿和小腿围度位置</title>
            <circle cx="90" cy="38" r="24" />
            <path d="M64 70 Q90 58 116 70 L130 155 Q125 196 116 220 L112 330 M68 330 L64 220 Q55 196 50 155 Z" />
            <path d="M53 83 L25 180 M127 83 L155 180" />
            {[{ y: 70, k: "neck" }, { y: 100, k: "chest" }, { y: 145, k: "waist" }, { y: 178, k: "hips" }, { y: 230, k: "thigh" }, { y: 295, k: "calf" }].map(({ y, k }) => (
              <g key={k}><line x1="47" y1={y} x2="133" y2={y} /><circle cx="142" cy={y} r="4" /></g>
            ))}
            <line x1="28" y1="120" x2="55" y2="120" /><circle cx="22" cy="120" r="4" />
          </svg>
          <p>同一位置、相近时间测量，更便于观察自己的记录变化。</p>
        </div>
        <div className="health-circumference-grid">
          {(Object.keys(circumferenceLabels) as BodyCircumferenceKey[]).map((key) => (
            <button key={key} onClick={() => { setMetric(key); setPickerOpen(true); }}>
              <span>{circumferenceLabels[key]}</span>
              <strong>{c[key] ? `${(c[key]! / 10).toFixed(1)} cm` : "添加"}</strong>
            </button>
          ))}
        </div>
        <div className="health-core-metrics">
          <Metric label="体重" value={latest?.weightGrams ? `当前值 ${(latest.weightGrams / 1000).toFixed(1)} kg` : "暂无"} />
          <Metric label="体脂率" value={latest?.bodyFatBasisPoints !== undefined ? `${(latest.bodyFatBasisPoints / 100).toFixed(1)}%` : "暂无"} />
          <Metric label="BMI" value={latest?.bmiHundredths ? (latest.bmiHundredths / 100).toFixed(2) : "需身高与体重"} />
          <Metric label="胸腰比" value={chestWaist?.toFixed(2) ?? "需胸围与腰围"} />
          <Metric label="腰臀比" value={waistHip?.toFixed(2) ?? "需腰围与臀围"} />
        </div>
      </div>
      {pickerOpen && (
        <div className="health-dialog-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setPickerOpen(false)}>
          <div className="health-dialog health-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="body-picker-title">
            <div className="health-dialog-header"><div><span className="health-section-kicker">选择要记录的数据</span><h2 id="body-picker-title">添加身体数据</h2></div><button aria-label="关闭" onClick={() => setPickerOpen(false)}><X /></button></div>
            <div className="health-metric-picker">
              <button className={metric === "weight" ? "is-selected" : ""} onClick={() => setMetric("weight")}>体重</button>
              <button className={metric === "bodyFat" ? "is-selected" : ""} onClick={() => setMetric("bodyFat")}>体脂率</button>
              {(Object.keys(circumferenceLabels) as BodyCircumferenceKey[]).map((key) => <button className={metric === key ? "is-selected" : ""} key={key} onClick={() => setMetric(key)}>{circumferenceLabels[key]}</button>)}
            </div>
            <label>{metric === "weight" ? "体重（kg）" : metric === "bodyFat" ? "体脂率（%）" : `${circumferenceLabels[metric]}（cm）`}<input autoFocus type="number" inputMode="decimal" step="0.1" value={value} onChange={(e) => setValue(e.target.value)} /></label>
            <div className="health-dialog-footer"><button onClick={() => setPickerOpen(false)}>取消</button><button className="health-save-action" disabled={!value} onClick={save}>保存记录</button></div>
          </div>
        </div>
      )}
    </section>
  );
}

const publicFoods: FoodCatalogItem[] = [
  { id: "public-rice", name: "熟米饭", kind: "public", caloriesPer100g: 116, proteinPer100g: 2.6, carbsPer100g: 25.9, fatPer100g: 0.3, createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "public-egg", name: "鸡蛋", kind: "public", caloriesPer100g: 144, proteinPer100g: 13.3, carbsPer100g: 2.8, fatPer100g: 8.8, createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "public-chicken", name: "鸡胸肉", kind: "public", caloriesPer100g: 133, proteinPer100g: 24.6, carbsPer100g: 2.5, fatPer100g: 2.2, createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "public-milk", name: "全脂牛奶", kind: "public", caloriesPer100g: 65, proteinPer100g: 3.3, carbsPer100g: 4.9, fatPer100g: 3.6, createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "public-banana", name: "香蕉", kind: "public", caloriesPer100g: 93, proteinPer100g: 1.4, carbsPer100g: 22, fatPer100g: 0.2, createdAt: "2026-01-01T00:00:00.000Z" },
];
const mealLabels: Record<Exclude<MealRecord["mealType"], "other">, string> = { breakfast: "早餐", lunch: "午餐", dinner: "晚餐", snack: "加餐" };

export function MealsWorkspace({ health, onStatus }: { health: HealthSystem; onStatus: Status }) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [mealType, setMealType] = useState<Exclude<MealRecord["mealType"], "other">>("breakfast");
  const [tab, setTab] = useState<FoodCatalogItem["kind"]>("public");
  const [query, setQuery] = useState("");
  const [grams, setGrams] = useState("100");
  const [selected, setSelected] = useState<FoodCatalogItem>();
  const [customName, setCustomName] = useState("");
  const [customCalories, setCustomCalories] = useState("");
  const todayMeals = health.meals.filter((meal) => new Date(meal.eatenAt).toDateString() === new Date().toDateString());
  const totals = todayMeals.flatMap((meal) => meal.foods ?? []).reduce((sum, food) => ({ calories: sum.calories + food.calories, protein: sum.protein + (food.proteinGrams ?? 0), carbs: sum.carbs + (food.carbsGrams ?? 0), fat: sum.fat + (food.fatGrams ?? 0) }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  const target = health.preferences.dailyCalorieTarget ?? 2000;
  const remaining = Math.max(0, target - totals.calories);
  const foods = [...publicFoods, ...(health.state.foodCatalog ?? [])].filter((food) => food.kind === tab && food.name.toLowerCase().includes(query.trim().toLowerCase()));
  const open = (type: typeof mealType) => { setMealType(type); setLibraryOpen(true); setSelected(undefined); };
  const addSelected = () => {
    if (!selected) return;
    const amount = Number(grams);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 5000) return;
    const ratio = amount / 100;
    const ok = health.addMeal({ mealType, description: selected.name, foods: [{ id: `${selected.id}-${Date.now()}`, name: selected.name, grams: amount, calories: Math.round(selected.caloriesPer100g * ratio), proteinGrams: selected.proteinPer100g === undefined ? undefined : selected.proteinPer100g * ratio, carbsGrams: selected.carbsPer100g === undefined ? undefined : selected.carbsPer100g * ratio, fatGrams: selected.fatPer100g === undefined ? undefined : selected.fatPer100g * ratio }] });
    if (ok) { setLibraryOpen(false); onStatus(`${mealLabels[mealType]}已记录`); }
  };
  const createCustom = (kind: "mine" | "recipe") => {
    const id = health.addFoodCatalogItem({ name: customName, kind, caloriesPer100g: Number(customCalories) });
    if (id) { setCustomName(""); setCustomCalories(""); setTab(kind); onStatus(kind === "recipe" ? "食谱已保存" : "自定义食物已保存"); }
  };
  return (
    <section className="health-workspace health-meals-workspace" aria-labelledby="meal-workspace-title">
      <div className="health-workspace-heading"><div><span className="health-section-kicker">今日饮食</span><h2 id="meal-workspace-title">热量与营养总览</h2></div><button className="health-primary-action" onClick={() => open("snack")}><Plus size={18} /> 添加食物</button></div>
      <div className="health-nutrition-overview">
        <div className="health-calorie-ring" style={{ "--progress": `${Math.min(100, (totals.calories / target) * 100)}%` } as CSSProperties}><div><span>还可摄入</span><strong>{remaining}</strong><small>kcal</small></div></div>
        <div className="health-macro-panel">
          <strong>三大营养素</strong>
          <Macro label="蛋白质" value={totals.protein} target={120} />
          <Macro label="碳水" value={totals.carbs} target={240} />
          <Macro label="脂肪" value={totals.fat} target={65} />
        </div>
        <div className="health-energy-ledger">
          <Metric label="基础代谢" value={`${health.preferences.basalMetabolismKcal ?? 1500} kcal`} />
          <Metric label="活动消耗" value={`+${health.preferences.activityExpenditureKcal ?? 350} kcal`} />
          <Metric label="饮食摄入" value={`${totals.calories} kcal`} />
          <Metric label="减脂目标缺口" value={`${health.preferences.fatLossDeficitKcal ?? 300} kcal`} />
          <p>以上为用户设置与记录汇总，不代表精确代谢或营养建议。</p>
        </div>
      </div>
      <div className="health-meal-sections">
        {(Object.keys(mealLabels) as Array<keyof typeof mealLabels>).map((type) => {
          const records = todayMeals.filter((meal) => meal.mealType === type);
          const calories = records.flatMap((meal) => meal.foods ?? []).reduce((sum, food) => sum + food.calories, 0);
          return <article key={type}><div><Utensils size={18} /><span><strong>{mealLabels[type]}</strong><small>{records.length ? `${records.length} 条 · ${calories} kcal` : "还没有记录"}</small></span></div><button aria-label={`添加${mealLabels[type]}`} onClick={() => open(type)}><Plus /></button></article>;
        })}
      </div>
      {libraryOpen && (
        <div className="health-dialog-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setLibraryOpen(false)}>
          <div className="health-dialog health-library-dialog" role="dialog" aria-modal="true" aria-labelledby="food-library-title">
            <div className="health-dialog-header"><div><span className="health-section-kicker">添加到{mealLabels[mealType]}</span><h2 id="food-library-title">食物库</h2></div><button aria-label="关闭食物库" onClick={() => setLibraryOpen(false)}><X /></button></div>
            <div className="health-library-tabs" role="tablist">{(["public", "mine", "recipe"] as const).map((kind) => <button role="tab" aria-selected={tab === kind} className={tab === kind ? "is-selected" : ""} key={kind} onClick={() => { setTab(kind); setSelected(undefined); }}>{kind === "public" ? "公共食物" : kind === "mine" ? "我的食物" : "我的食谱"}</button>)}</div>
            <label className="health-search-field"><Search size={18} /><input aria-label="搜索食物" placeholder="搜索食物或食谱" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
            <div className="health-library-scroll" aria-label="食物搜索结果">{foods.map((food) => <button className={selected?.id === food.id ? "is-selected" : ""} key={food.id} onClick={() => setSelected(food)}><Apple size={20} /><span><strong>{food.name}</strong><small>{food.caloriesPer100g} kcal / 100g</small></span></button>)}{!foods.length && <p className="health-empty-inline">没有匹配项，可以在下方创建。</p>}</div>
            {tab !== "public" && <details className="health-progressive"><summary>{tab === "mine" ? "创建我的食物" : "创建我的食谱"}</summary><div className="health-custom-food"><label>名称<input value={customName} onChange={(e) => setCustomName(e.target.value)} /></label><label>每 100 克热量（kcal）<input type="number" inputMode="decimal" value={customCalories} onChange={(e) => setCustomCalories(e.target.value)} /></label><button onClick={() => createCustom(tab)}>保存到{tab === "mine" ? "我的食物" : "我的食谱"}</button></div></details>}
            {selected && <div className="health-library-selection"><div><strong>{selected.name}</strong><span>按克重计算本次记录</span></div><label>克重<input type="number" inputMode="decimal" min="1" max="5000" value={grams} onChange={(e) => setGrams(e.target.value)} /></label><strong>{Math.round(selected.caloriesPer100g * Number(grams || 0) / 100)} kcal</strong></div>}
            <div className="health-dialog-footer"><button onClick={() => setLibraryOpen(false)}>取消</button><button className="health-save-action" disabled={!selected || !Number(grams)} onClick={addSelected}>加入{mealLabels[mealType]}</button></div>
          </div>
        </div>
      )}
    </section>
  );
}

export function DailyWorkspace({ health, onStatus }: { health: HealthSystem; onStatus: Status }) {
  const [settings, setSettings] = useState<"water" | "sedentary" | "sleep">();
  const [water, setWater] = useState("");
  const [sleep, setSleep] = useState("");
  const [quality, setQuality] = useState("3");
  const [breakMinutes, setBreakMinutes] = useState("5");
  const waterGoal = health.preferences.waterGoalMl ?? 1800;
  return (
    <section className="health-workspace" aria-labelledby="daily-workspace-title">
      <div className="health-workspace-heading"><div><span className="health-section-kicker">日常必备</span><h2 id="daily-workspace-title">喝水、休息与睡眠</h2></div><p>只设置你愿意长期记录的项目</p></div>
      <div className="health-essential-grid">
        <article><div className="health-essential-icon"><GlassWater /></div><div className="health-essential-copy"><span>喝水</span><strong>{health.todayWaterMl} / {waterGoal} ml</strong><div className="health-mini-progress"><i style={{ width: `${Math.min(100, health.todayWaterMl / waterGoal * 100)}%` }} /></div></div><div className="health-quick-buttons">{health.preferences.waterQuickAmountsMl.map((amount) => <button key={amount} onClick={() => { health.addWater(amount); onStatus(`已记录 ${amount} ml 饮水`); }}>+{amount}</button>)}</div><button className="health-icon-button" aria-label="设置饮水目标和提醒" onClick={() => setSettings("water")}><Settings2 /></button></article>
        <article><div className="health-essential-icon"><Clock3 /></div><div className="health-essential-copy"><span>休息 / 久坐</span><strong>{health.preferences.sedentaryReminderEnabled ? `${health.preferences.sedentaryReminderMinutes ?? 60} 分钟提醒` : "提醒未开启"}</strong><small>活动记录只描述发生过的休息</small></div><div className="health-inline-record"><input aria-label="本次活动分钟" type="number" inputMode="numeric" value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} /><button onClick={() => { if (health.addSedentaryBreak(Number(breakMinutes))) onStatus("休息活动已记录"); }}>记录活动</button></div><button className="health-icon-button" aria-label="设置久坐提醒" onClick={() => setSettings("sedentary")}><Bell /></button></article>
        <article><div className="health-essential-icon"><Moon /></div><div className="health-essential-copy"><span>睡眠</span><strong>{sleep ? `${sleep} 小时` : "记录昨晚睡眠"}</strong><small>可选睡眠状态，不做健康判断</small></div><div className="health-sleep-entry"><label>时长<input type="number" inputMode="decimal" step="0.1" value={sleep} onChange={(e) => setSleep(e.target.value)} /></label><label>状态<select value={quality} onChange={(e) => setQuality(e.target.value)}><option value="1">很差</option><option value="2">较差</option><option value="3">一般</option><option value="4">较好</option><option value="5">很好</option></select></label><button onClick={() => { if (sleep && health.addSleep({ durationMinutes: Math.round(Number(sleep) * 60), quality: Number(quality) as 1 | 2 | 3 | 4 | 5 })) { setSleep(""); onStatus("睡眠已记录"); } }}>保存</button></div></article>
      </div>
      {settings && <div className="health-dialog-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setSettings(undefined)}><div className="health-dialog health-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="daily-settings-title"><div className="health-dialog-header"><h2 id="daily-settings-title">{settings === "water" ? "饮水目标与提醒" : settings === "sedentary" ? "久坐提醒" : "睡眠设置"}</h2><button aria-label="关闭设置" onClick={() => setSettings(undefined)}><X /></button></div>{settings === "water" ? <><label>每日饮水目标（ml）<input type="number" defaultValue={waterGoal} onBlur={(e) => health.updatePreferences({ waterGoalMl: Number(e.target.value) })} /></label><label>提醒时间（用逗号分隔）<input defaultValue={(health.preferences.waterReminderTimes ?? []).join(", ")} onBlur={(e) => health.updatePreferences({ waterReminderTimes: e.target.value.split(/[,，]/).map((x) => x.trim()).filter(Boolean) })} /></label></> : <><label className="health-switch-row"><input type="checkbox" checked={health.preferences.sedentaryReminderEnabled ?? false} onChange={(e) => health.updatePreferences({ sedentaryReminderEnabled: e.target.checked })} />开启久坐活动提醒</label><label>久坐多久提醒（分钟）<input type="number" defaultValue={health.preferences.sedentaryReminderMinutes ?? 60} onBlur={(e) => health.updatePreferences({ sedentaryReminderMinutes: Number(e.target.value) })} /></label></>}<p className="health-hint">V1 保存提醒计划，不申请系统通知权限；页面内会清晰展示当前设置。</p><div className="health-dialog-footer"><button className="health-save-action" onClick={() => setSettings(undefined)}>完成</button></div></div></div>}
    </section>
  );
}

type WorkoutPhase = "warmup" | "training" | "stretch";
const exerciseLibrary: Array<{ name: string; mode: ExerciseMode; category: "warmup" | "strength" | "cardio" | "mobility" | "stretch" }> = [
  { name: "动态开合跳", mode: "timed-sets", category: "warmup" }, { name: "髋关节环绕", mode: "timed-sets", category: "warmup" }, { name: "卧推", mode: "weight-reps", category: "strength" }, { name: "深蹲", mode: "weight-reps", category: "strength" }, { name: "俯卧撑", mode: "bodyweight-reps", category: "strength" }, { name: "5 公里跑步", mode: "distance-time", category: "cardio" }, { name: "平板支撑", mode: "timed-sets", category: "strength" }, { name: "全身拉伸", mode: "duration", category: "stretch" }, { name: "腘绳肌拉伸", mode: "timed-sets", category: "stretch" },
];

export function WorkoutWorkspace({ health, onSelectExercise, onStatus }: { health: HealthSystem; onSelectExercise: (id: string) => void; onStatus: Status }) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [phase, setPhase] = useState<WorkoutPhase>("training");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("全部");
  const [plan, setPlan] = useState<Record<WorkoutPhase, string[]>>({ warmup: [], training: [], stretch: [] });
  const [startedAt, setStartedAt] = useState<number>();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => { if (!startedAt) return; const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)); tick(); const id = window.setInterval(tick, 1000); return () => window.clearInterval(id); }, [startedAt]);
  const formatted = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const categories = ["全部", "热身", "力量", "有氧", "拉伸"];
  const visible = exerciseLibrary.filter((item) => (filter === "全部" || ({ warmup: "热身", strength: "力量", cardio: "有氧", stretch: "拉伸", mobility: "热身" } as Record<string, string>)[item.category] === filter) && item.name.includes(query.trim()));
  const add = (item: typeof exerciseLibrary[number]) => {
    let definition = health.exercises.find((x) => x.name === item.name);
    let id = definition?.id;
    if (!id) id = health.addExercise({ name: item.name, mode: item.mode, displayUnit: item.mode === "weight-reps" ? "kg" : item.mode === "distance-time" ? "km" : item.mode === "duration" ? "分钟" : "次", defaultRestSeconds: 90, category: item.category === "warmup" || item.category === "stretch" ? item.category : item.category as "strength" | "cardio" | "mobility" });
    setPlan((current) => current[phase].includes(id!) ? current : { ...current, [phase]: [...current[phase], id!] });
    onStatus(`${item.name}已加入${phase === "warmup" ? "练前热身" : phase === "training" ? "训练动作" : "练后拉伸"}`);
  };
  const start = () => { const first = plan.training[0] ?? plan.warmup[0] ?? plan.stretch[0]; if (!first) return; setStartedAt(Date.now()); onSelectExercise(first); onStatus("训练计时已开始"); };
  const phaseLabels: Record<WorkoutPhase, string> = { warmup: "练前热身", training: "训练动作", stretch: "练后拉伸" };
  const phaseAddLabels: Record<WorkoutPhase, string> = { warmup: "添加练前热身动作", training: "添加训练动作", stretch: "添加练后拉伸动作" };
  return <section className="health-workspace health-workout-workspace" aria-labelledby="workout-workspace-title">
    <div className="health-workout-clock"><span>{startedAt ? "训练进行中" : "准备开始"}</span><strong aria-live="off">{formatted}</strong><small>{plan.warmup.length + plan.training.length + plan.stretch.length} 个动作</small></div>
    <div className="health-workspace-heading"><div><span className="health-section-kicker">本次训练</span><h2 id="workout-workspace-title">先安排动作，再开始计时</h2></div>{startedAt ? <button className="health-secondary-action" onClick={() => { setStartedAt(undefined); setElapsed(0); onStatus("训练计时已停止，可继续完成记录"); }}>停止计时</button> : <button className="health-primary-action" disabled={!Object.values(plan).flat().length} onClick={start}><Clock3 size={18} /> 开始训练</button>}</div>
    <div className="health-phase-list">{(Object.keys(phaseLabels) as WorkoutPhase[]).map((key) => <section key={key}><div className="health-phase-heading"><div><strong>{phaseLabels[key]}</strong><span>{plan[key].length} 个动作</span></div><button aria-label={phaseAddLabels[key]} onClick={() => { setPhase(key); setLibraryOpen(true); }}><Plus /></button></div>{plan[key].length ? <div className="health-planned-exercises">{plan[key].map((id, index) => { const exercise = health.exercises.find((x) => x.id === id); return <button key={id} onClick={() => onSelectExercise(id)}><span>{index + 1}</span><strong>{exercise?.name ?? "训练动作"}</strong><small>{exercise?.mode === "weight-reps" ? "重量 × 次数" : exercise?.mode === "distance-time" ? "距离计时" : exercise?.mode === "duration" ? "时长训练" : "逐组记录"}</small></button>; })}</div> : <button className="health-add-phase" onClick={() => { setPhase(key); setLibraryOpen(true); }}><Plus /> 从动作库添加</button>}</section>)}</div>
    <div className="health-preserved-tools"><Dumbbell /><div><strong>逐组记录、休息计时和历史仍在下方</strong><span>选中计划里的动作后，可继续使用五种记录模式和高级字段。</span></div></div>
    {libraryOpen && <div className="health-dialog-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setLibraryOpen(false)}><div className="health-dialog health-library-dialog" role="dialog" aria-modal="true" aria-labelledby="exercise-library-title"><div className="health-dialog-header"><div><span className="health-section-kicker">添加到{phaseLabels[phase]}</span><h2 id="exercise-library-title">动作库</h2></div><button aria-label="关闭动作库" onClick={() => setLibraryOpen(false)}><X /></button></div><label className="health-search-field"><Search size={18} /><input autoFocus aria-label="搜索动作" placeholder="搜索动作" value={query} onChange={(e) => setQuery(e.target.value)} /></label><div className="health-filter-scroll" aria-label="动作分类筛选">{categories.map((category) => <button className={filter === category ? "is-selected" : ""} key={category} onClick={() => setFilter(category)}>{category}</button>)}</div><div className="health-exercise-library" aria-label="动作搜索结果">{visible.map((item) => <article key={item.name}><div className="health-exercise-art"><Dumbbell /></div><strong>{item.name}</strong><small>{item.mode === "weight-reps" ? "重量次数" : item.mode === "distance-time" ? "距离计时" : item.mode === "duration" ? "时长训练" : "定时/次数"}</small><button onClick={() => add(item)}>添加</button></article>)}</div><details className="health-progressive"><summary>创建自定义训练项目</summary><p>下方原有训练项目创建器仍可使用，并完整支持五种记录模式。</p></details><div className="health-dialog-footer"><button className="health-save-action" onClick={() => setLibraryOpen(false)}>完成添加</button></div></div></div>}
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="health-metric"><span>{label}</span><strong>{value}</strong></div>; }
function Macro({ label, value, target }: { label: string; value: number; target: number }) { return <div className="health-macro"><div><span>{label}</span><strong>{value.toFixed(0)} / {target} g</strong></div><div><i style={{ width: `${Math.min(100, value / target * 100)}%` }} /></div></div>; }
