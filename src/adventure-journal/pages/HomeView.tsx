import { Hammer, Mail, Sparkles } from 'lucide-react';
import { PermanentHomeScene } from '../assets/home/v0.1.0/PermanentHomeScene';
import type { InvestmentProgress } from '../domain/types';

const ITEM_COPY: Record<string, { title: string; description: string }> = {
  'home-field-desk': { title: '田野书桌', description: '在晨光里复盘、写信，也规划下一次出发。' },
  'home-memory-shelf': { title: '记忆陈列架', description: '把旅途中带回来的发现留在每天都能看见的地方。' }
};

type HomeViewProps = {
  investments: InvestmentProgress[];
  reducedMotion: boolean;
  hasWindValleyDiscovery: boolean;
  onInvest(target: InvestmentProgress): void;
};

function HomeItemCard({ item, onInvest }: { item: InvestmentProgress; onInvest(target: InvestmentProgress): void }) {
  const copy = ITEM_COPY[item.targetId] ?? { title: item.targetId, description: '' };
  const complete = item.status === 'unlocked';
  const percent = Math.round((item.invested / item.price) * 100);

  return (
    <article className={`home-project-card ${complete ? 'is-complete' : ''}`}>
      <div className="home-project-icon" aria-hidden="true">{complete ? <Sparkles size={19} /> : <Hammer size={19} />}</div>
      <div className="home-project-copy">
        <span>{complete ? 'PERMANENT MEMORY' : 'BUILDABLE CORNER'}</span>
        <h3>{copy.title}</h3>
        <p>{copy.description}</p>
      </div>
      <div className="home-project-progress">
        <div className="journal-progress-track" role="progressbar" aria-label={`${copy.title}建设进度`}
          aria-valuemin={0} aria-valuemax={item.price} aria-valuenow={item.invested}>
          <span style={{ width: `${percent}%` }} />
        </div>
        <span>{item.invested}/{item.price}</span>
      </div>
      {complete ? <div className="journal-complete-label">{copy.title}已建成</div> : (
        <button className="journal-build-button" type="button" onClick={() => onInvest(item)}>建造{copy.title}</button>
      )}
    </article>
  );
}

export function HomeView({ investments, reducedMotion, hasWindValleyDiscovery, onInvest }: HomeViewProps) {
  const completed = investments.filter((item) => item.status === 'unlocked').length;
  return (
    <section className="journal-view home-view" id="journal-home-panel" role="tabpanel" aria-label="永久之家" aria-labelledby="journal-home-tab">
      <div className="journal-world-shell home-world-shell">
        <div className="journal-world-heading">
          <div><span>PERMANENT HOME · BASE CAMP</span><h2>风铃小院</h2></div>
          <div className="journal-weather"><span aria-hidden="true">⌂</span> 今日安稳 · {completed}/2 建成</div>
        </div>
        <div className="journal-scene-frame home-scene-frame">
          <PermanentHomeScene reducedMotion={reducedMotion} investments={investments} onSelect={onInvest} />
          <div className="home-scene-note"><strong>欢迎回家</strong><span>旅途获得的记忆，会在这里慢慢长成生活。</span></div>
        </div>
      </div>
      <aside className="home-project-panel" aria-label="家园建造项目">
        <header><span>HOME PROJECTS</span><h2>让院子慢慢长大</h2></header>
        {investments.map((item) => <HomeItemCard key={item.targetId} item={item} onInvest={onInvest} />)}
        {hasWindValleyDiscovery ? (
          <article className="home-discovery-card">
            <span aria-hidden="true">♬</span>
            <div><small>JOURNEY DISCOVERY</small><h3>山谷风铃</h3><p>从风过山谷带回的第一件纪念物。微风经过院子时，它会轻轻响起。</p></div>
          </article>
        ) : null}
        <div className="journal-mail-teaser"><Mail size={21} aria-hidden="true" /><div><strong>远方来信</strong><span>下一次更新</span></div><p>未来的旅人会把你的成长片段写成信，投进门口的蓝色邮箱。</p></div>
      </aside>
    </section>
  );
}
