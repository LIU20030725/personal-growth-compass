import { ArrowUpRight, Binoculars, MapPin } from 'lucide-react';
import { SunnyTrailScene } from '../assets/maps/v0.1.0/SunnyTrailScene';
import type { InvestmentProgress } from '../domain/types';

type JourneyViewProps = {
  route: InvestmentProgress;
  reducedMotion: boolean;
  arrived: boolean;
  onInvest(route: InvestmentProgress): void;
  onDepart(): void;
  onGoHome(): void;
};

const MILESTONES = ['刚刚启程', '看见远山', '走入溪谷', '木桥在望', '抵达山谷'];

export function JourneyView({ route, reducedMotion, arrived, onInvest, onDepart, onGoHome }: JourneyViewProps) {
  const percent = Math.round((route.invested / route.price) * 100);
  const stage = percent >= 100 ? 4 : percent >= 75 ? 3 : percent >= 50 ? 2 : percent >= 25 ? 1 : 0;

  return (
    <section className="journal-view journey-view" id="journal-journey-panel" role="tabpanel" aria-label="旅途" aria-labelledby="journal-journey-tab">
      <div className="journal-world-shell">
        <div className="journal-world-heading">
          <div>
            <span>CHAPTER 01 · SUNNY TRAIL</span>
            <h2>晴日林径</h2>
          </div>
          <div className="journal-weather"><span aria-hidden="true">☀</span> 微风 · 24℃</div>
        </div>
        <div className="journal-scene-frame journey-scene-frame">
          <SunnyTrailScene reducedMotion={reducedMotion} progress={percent} />
          <div className="journey-scene-hud">
            <div className="journey-location-chip"><MapPin size={15} aria-hidden="true" /><span>当前旅程</span><strong>{MILESTONES[stage]}</strong></div>
            <div className="journey-distance-chip"><Binoculars size={15} aria-hidden="true" /><strong>{percent}%</strong><span>前往风过山谷</span></div>
          </div>
          {arrived ? (
            <div className="journey-arrival-card">
              <span>CHAPTER COMPLETE</span>
              <h2>抵达风过山谷</h2>
              <p>新发现：山谷风铃</p>
              <button type="button" onClick={onGoHome}>带着发现回家</button>
            </div>
          ) : null}
        </div>
        <div className="journey-route-dock">
          <div className="journey-route-copy">
            <span>NEXT DESTINATION · 02</span>
            <h3>通往风过山谷</h3>
            <p>{route.status === 'ready' ? '木桥已经完成，下一段旅途正在风里等你。' : `还需 ${route.price - route.invested} 枚成长骰子修好山谷木桥。`}</p>
          </div>
          <div className="journey-route-action">
            <div className="journal-progress-track" role="progressbar" aria-label="通往风过山谷建设进度"
              aria-valuemin={0} aria-valuemax={route.price} aria-valuenow={route.invested}
              aria-valuetext={`${route.invested} / ${route.price}`}>
              <span style={{ width: `${percent}%` }} />
            </div>
            <div className="journal-progress-meta"><strong>{route.invested} / {route.price}</strong><span>{MILESTONES[stage]}</span></div>
            <button className="journal-build-button" type="button"
              disabled={arrived}
              onClick={() => route.status === 'ready' ? onDepart() : onInvest(route)}>
              {arrived ? '已经抵达风过山谷' : route.status === 'ready' ? '启程前往风过山谷' : '投入通往风过山谷'}
              <ArrowUpRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
