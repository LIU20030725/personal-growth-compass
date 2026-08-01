import { ArrowUpRight } from 'lucide-react';
import { SunnyTrailScene } from '../assets/maps/v0.1.0/SunnyTrailScene';
import type { InvestmentProgress } from '../domain/types';

type JourneyViewProps = {
  route: InvestmentProgress;
  reducedMotion: boolean;
  onInvest(route: InvestmentProgress): void;
};

export function JourneyView({ route, reducedMotion, onInvest }: JourneyViewProps) {
  const percent = Math.round((route.invested / route.price) * 100);
  return (
    <section className={'journal-view'} id={'journal-journey-panel'} role={'tabpanel'} aria-label={'旅途'}>
      <div className={'journal-scene-card'}>
        <div className={'journal-scene-copy'}>
          <span>CHAPTER 01 · CURRENT LOCATION</span>
          <h2>晴日林径</h2>
          <p>把真实生活里的每一次完成，铺成通往下一片风景的路。</p>
        </div>
        <div className={'journal-scene-frame'}>
          <SunnyTrailScene reducedMotion={reducedMotion} />
        </div>
        <div className={'journal-scene-caption'} aria-hidden={true}>
          <span>35.6812° N</span><span>SUNNY TRAIL / 001</span><span>ALT. 184 M</span>
        </div>
      </div>
      <article className={'journal-investment-card journal-route-card'}>
        <header>
          <div><span className={'journal-card-index'}>NEXT DESTINATION · 02</span><h3>通往风过山谷</h3></div>
          <span className={'journal-price-tag'}>固定价格 {route.price}</span>
        </header>
        <p>山谷入口需要一座结实的木桥。投入可以分多次进行，价格不会临时上涨。</p>
        <div className={'journal-progress-track'} role={'progressbar'} aria-label={'通往风过山谷建设进度'}
          aria-valuemin={0} aria-valuemax={route.price} aria-valuenow={route.invested}
          aria-valuetext={route.invested + ' / ' + route.price}>
          <span style={{ width: percent + '%' }} />
        </div>
        <div className={'journal-progress-meta'}>
          <strong>{route.invested} / {route.price}</strong>
          <span>{route.status === 'ready' ? '桥梁已就绪，等待启程' : '完成 ' + percent + '%'}</span>
        </div>
        <button className={'journal-build-button'} type={'button'}
          disabled={route.status === 'ready' || route.status === 'unlocked'} onClick={() => onInvest(route)}>
          {route.status === 'ready' ? '路线已准备好' : '投入通往风过山谷'}
          <ArrowUpRight size={18} aria-hidden={true} />
        </button>
      </article>
    </section>
  );
}
