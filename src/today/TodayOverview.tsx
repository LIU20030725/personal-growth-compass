import {
  CalendarDays,
  Check,
  ChevronRight,
  Heart,
  Network,
  PenLine,
  Plus,
  Smile,
  Waves,
} from 'lucide-react';
import { EmotionIcon } from '../emotion/components/EmotionIcon';
import type { TodayOverviewModel } from './todayOverviewModel';
import './todayOverview.css';

export type TodayQuickAction = 'emotion.record' | 'health.quick-record' | 'tasks.create';
export type TodayModule = 'emotion' | 'ability' | 'body' | 'quests';

export type TodayOverviewProps = {
  model: TodayOverviewModel;
  onOpenModule(module: TodayModule, detail?: string | null): void;
  onQuickAction(action: TodayQuickAction): void;
  onCompleteTask(taskId: string): void;
};

type ModuleCardProps = {
  kind: 'emotion' | 'ability' | 'health';
  title: string;
  subtitle: string;
  primary: string;
  description: string;
  action: string;
  onClick(): void;
  moodId?: string | null;
};

function ModuleArtwork({ kind, moodId }: Pick<ModuleCardProps, 'kind' | 'moodId'>) {
  if (kind === 'emotion') {
    return (
      <div className="today-art today-art-emotion" aria-hidden="true">
        <span className="today-art-cloud" />
        <span className="today-art-sun" />
        <span className="today-art-hill"><span>♧</span><span>♧</span></span>
        {moodId && <EmotionIcon moodId={moodId} size="small" />}
      </div>
    );
  }
  if (kind === 'ability') {
    return (
      <div className="today-art today-art-ability" aria-hidden="true">
        <span className="today-book today-book-back" />
        <span className="today-book today-book-mid" />
        <span className="today-book today-book-front"><Network /></span>
      </div>
    );
  }
  return (
    <div className="today-art today-art-health" aria-hidden="true">
      <span className="today-bottle"><i /><i /><i /></span>
      <span className="today-apple"><i /></span>
    </div>
  );
}

function TodayModuleCard(props: ModuleCardProps) {
  const Icon = props.kind === 'emotion' ? Smile : props.kind === 'ability' ? Network : Heart;
  return (
    <article className={`today-module-card today-module-${props.kind}`}>
      <header>
        <span className="today-module-icon"><Icon aria-hidden="true" /></span>
        <span><strong>{props.title}</strong><small>{props.subtitle}</small></span>
        <button type="button" className="today-card-arrow" onClick={props.onClick} aria-label={`打开${props.title}`}>
          <ChevronRight aria-hidden="true" />
        </button>
      </header>
      <ModuleArtwork kind={props.kind} moodId={props.moodId} />
      <div className="today-module-copy">
        <h2>{props.primary}</h2>
        <p>{props.description}</p>
      </div>
      <button type="button" className="today-module-action" onClick={props.onClick}>{props.action}</button>
    </article>
  );
}

export function TodayOverview({ model, onOpenModule, onQuickAction, onCompleteTask }: TodayOverviewProps) {
  return (
    <section className="today-overview" aria-labelledby="today-overview-title">
      <header className="today-overview-header">
        <div>
          <h1 id="today-overview-title">今日总览</h1>
          <p>随便从一项开始。少填也有价值，没有填写不代表失败。</p>
        </div>
        <button className="today-record-now" type="button" aria-label="打开快捷记录" onClick={() => onQuickAction('emotion.record')}>
          <PenLine aria-hidden="true" />记录此刻
        </button>
      </header>

      <section className="today-status-strip" aria-label="今日状态">
        <button type="button" onClick={() => onOpenModule('emotion')}>
          <span className="today-status-icon"><Smile aria-hidden="true" /></span>
          <span><strong>情绪状态</strong><small>{model.emotion.primary}</small><em>{model.emotion.secondary}<ChevronRight /></em></span>
        </button>
        <button type="button" onClick={() => onOpenModule('ability', model.ability.treeId)}>
          <span className="today-status-icon"><Network aria-hidden="true" /></span>
          <span><strong>能力进展</strong><small>{model.ability.primary}</small><em>查看能力<ChevronRight /></em></span>
        </button>
        <button type="button" onClick={() => onOpenModule('body')}>
          <span className="today-status-icon"><Heart aria-hidden="true" /></span>
          <span><strong>身体健康</strong><small>{model.health.primary}</small><em>记录健康<ChevronRight /></em></span>
        </button>
        <button type="button" onClick={() => onOpenModule('quests')}>
          <span className="today-status-icon"><CalendarDays aria-hidden="true" /></span>
          <span><strong>今日计划</strong><small>{model.tasks.primary}</small><em>{model.tasks.secondary}<ChevronRight /></em></span>
        </button>
      </section>

      <section className="today-module-grid" aria-label="成长模块">
        <TodayModuleCard
          kind="emotion"
          title="情绪"
          subtitle="看见情绪，理解自己"
          primary={model.emotion.hasRecord ? model.emotion.primary : '还没有记录情绪'}
          description={model.emotion.hasRecord ? '这一刻已经被好好留下。' : '哪怕只选一个表情，也是一份完整记录。'}
          action="记录此刻"
          moodId={model.emotion.moodId}
          onClick={() => onQuickAction('emotion.record')}
        />
        <TodayModuleCard
          kind="ability"
          title="能力"
          subtitle="构建技能，持续进步"
          primary={model.ability.treeId ? model.ability.primary : '从一项真正想成长的技能开始'}
          description={model.ability.treeId ? model.ability.secondary : '先创建技能树，再逐步补充阶段、节点与资源。'}
          action="继续成长"
          onClick={() => onOpenModule('ability', model.ability.treeId)}
        />
        <TodayModuleCard
          kind="health"
          title="身体健康"
          subtitle="记录健康，积累能量"
          primary={model.health.hasRecord ? model.health.primary : '关注身体，从小事开始'}
          description={model.health.hasRecord ? model.health.secondary : '记录饮食、睡眠、运动与日常习惯。'}
          action="记录健康"
          onClick={() => onQuickAction('health.quick-record')}
        />
      </section>

      <section className="today-micro-actions" aria-label="今天的微行动">
        <header>
          <span className="today-micro-icon"><Waves aria-hidden="true" /></span>
          <span><strong>今天的微行动</strong><small>一个小小的行动，也能带来改变。</small></span>
          <button type="button" onClick={() => onQuickAction('tasks.create')}><Plus aria-hidden="true" />添加微行动</button>
        </header>
        {model.tasks.items.length === 0 ? (
          <div className="today-micro-empty"><strong>今天还没有微行动</strong><span>给今天留下一件愿意完成的小事。</span></div>
        ) : (
          <ul>
            {model.tasks.items.map((task) => (
              <li key={task.id} className={task.completed ? 'is-complete' : ''}>
                <span className="today-task-check" aria-hidden="true">{task.completed ? <Check /> : null}</span>
                <span><strong>{task.title}</strong><small>{task.completionStandard}</small></span>
                {task.completed
                  ? <em>今日已记录</em>
                  : <button type="button" aria-label={`记录完成：${task.title}`} onClick={() => onCompleteTask(task.id)}>记录完成</button>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
