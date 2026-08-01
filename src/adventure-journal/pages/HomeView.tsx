import { Hammer, Mail } from 'lucide-react';
import { PermanentHomeScene } from '../assets/home/v0.1.0/PermanentHomeScene';
import type { InvestmentProgress } from '../domain/types';

const ITEM_COPY: Record<string, { title: string; description: string }> = {
  'home-field-desk': { title: '田野书桌', description: '一张适合复盘、写信和规划下一次出发的木桌。' },
  'home-memory-shelf': { title: '记忆陈列架', description: '收藏旅途中带回的纪念物，也保存认真生活的证据。' }
};

type HomeViewProps = {
  investments: InvestmentProgress[];
  reducedMotion: boolean;
  onInvest(target: InvestmentProgress): void;
};

function HomeItemCard({ item, index, onInvest }: {
  item: InvestmentProgress;
  index: number;
  onInvest(target: InvestmentProgress): void;
}) {
  const copy = ITEM_COPY[item.targetId] ?? { title: item.targetId, description: '' };
  const complete = item.status === 'unlocked';
  const percent = Math.round((item.invested / item.price) * 100);
  return (
    <article className={'journal-investment-card'}>
      <header>
        <div><span className={'journal-card-index'}>HOME ITEM · {String(index + 1).padStart(2, '0')}</span><h3>{copy.title}</h3></div>
        <span className={'journal-price-tag'}>{item.price} 骰子</span>
      </header>
      <p>{copy.description}</p>
      <div className={'journal-progress-track'} role={'progressbar'} aria-label={copy.title + '建设进度'}
        aria-valuemin={0} aria-valuemax={item.price} aria-valuenow={item.invested}>
        <span style={{ width: percent + '%' }} />
      </div>
      <div className={'journal-progress-meta'}>
        <strong>{item.invested} / {item.price}</strong>
        <span>{complete ? '永久保留' : '还需 ' + (item.price - item.invested) + ' 枚'}</span>
      </div>
      {complete ? <div className={'journal-complete-label'}>{copy.title}已建成</div> : (
        <button className={'journal-build-button'} type={'button'} onClick={() => onInvest(item)}>
          <Hammer size={17} aria-hidden={true} /> 建造{copy.title}
        </button>
      )}
    </article>
  );
}

export function HomeView({ investments, reducedMotion, onInvest }: HomeViewProps) {
  const unlockedItemIds = investments.filter((item) => item.status === 'unlocked').map((item) => item.targetId);
  return (
    <section className={'journal-view'} id={'journal-home-panel'} role={'tabpanel'} aria-label={'永久之家'}>
      <div className={'journal-scene-card journal-home-scene-card'}>
        <div className={'journal-scene-copy'}>
          <span>PERMANENT HOME · BASE CAMP</span>
          <h2>永久之家</h2>
          <p>旅途会向前，家会一直保留。建成的物件不会因为章节更新而消失。</p>
        </div>
        <div className={'journal-scene-frame'}>
          <PermanentHomeScene reducedMotion={reducedMotion} unlockedItemIds={unlockedItemIds} />
        </div>
        <div className={'journal-scene-caption'} aria-hidden={true}>
          <span>HOME SINCE 2026</span><span>BASE CAMP / 001</span><span>SAFE & PERMANENT</span>
        </div>
      </div>
      <div className={'journal-home-grid'}>
        {investments.map((item, index) => (
          <HomeItemCard key={item.targetId} item={item} index={index} onInvest={onInvest} />
        ))}
        <aside className={'journal-mail-teaser'} aria-label={'远方来信预告'}>
          <Mail size={24} aria-hidden={true} />
          <div><strong>远方来信</strong><span>COMING IN V0.3.0</span></div>
          <p>未来的旅人会把你的成长片段写成信，投进门口的红色邮箱。</p>
        </aside>
      </div>
    </section>
  );
}
