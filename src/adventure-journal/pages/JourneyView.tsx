import { ArrowUpRight, MapPin, Route as RouteIcon } from 'lucide-react';
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

export function JourneyView({ route, reducedMotion, arrived, onInvest, onDepart, onGoHome }: JourneyViewProps) {
  const percent = Math.min(100, Math.max(0, Math.round((route.invested / route.price) * 100)));
  const hasArrived = arrived || route.status === 'unlocked';
  const currentLocation = hasArrived ? '风过山谷' : '晴日林径';
  const routeTitle = hasArrived ? '旅途已完成' : '通往风过山谷';
  const routeLabel = hasArrived ? '路线完成' : route.status === 'ready' ? '道路已备妥' : '下一站';
  const routeDescription = hasArrived
    ? '山谷风铃已经收进行囊，这段旅途完整抵达。'
    : route.status === 'ready'
      ? '木桥已经完成，下一段旅途正在风里等你。'
      : `还需 ${route.price - route.invested} 枚成长骰子修好山谷木桥。`;
  const actionLabel = hasArrived
    ? '已抵达风过山谷'
    : route.status === 'ready'
      ? '启程前往风过山谷'
      : '投入通往风过山谷';

  return (
    <section className={`journal-view journey-view ${reducedMotion ? 'is-reduced-motion' : ''}`} id="journal-journey-panel" role="tabpanel" aria-label="旅途" aria-labelledby="journal-journey-tab">
      <div className="journal-world-shell">
        <div className="journal-world-heading">
          <div>
            <span>{hasArrived ? '第二章' : '第一章'}</span>
            <h2>{currentLocation}</h2>
          </div>
          <p>{hasArrived ? '风铃轻响，新的旅途从山谷继续。' : '微风穿过林间，下一站是风过山谷。'}</p>
        </div>
        <div className="journal-scene-frame journey-scene-frame">
          <SunnyTrailScene reducedMotion={reducedMotion} progress={percent} />
          <div className="journey-scene-hud">
            <div className="journey-location-chip" aria-label={`当前位置：${currentLocation}`}>
              <MapPin size={17} aria-hidden="true" /><span>当前位置</span><strong>{currentLocation}</strong>
            </div>
            <div className="journey-distance-chip" aria-label={`路线进度：${percent}%`}>
              <RouteIcon size={17} aria-hidden="true" /><span>路线进度</span><strong>{percent}%</strong>
            </div>
          </div>
          {hasArrived ? (
            <div className="journey-arrival-card">
              <span>旅途抵达</span>
              <h2>抵达风过山谷</h2>
              <p>新发现：山谷风铃</p>
              <button type="button" onClick={onGoHome}>带着发现回家</button>
            </div>
          ) : null}
        </div>
        <div className="journey-route-dock">
          <div className="journey-route-copy">
            <span>{routeLabel}</span>
            <h3>{routeTitle}</h3>
            <p>{routeDescription}</p>
          </div>
          <div className="journey-route-action">
            <div className="journal-progress-track" role="progressbar" aria-label="通往风过山谷建设进度"
              aria-valuemin={0} aria-valuemax={route.price} aria-valuenow={route.invested}
              aria-valuetext={`${route.invested} / ${route.price}`}>
              <span style={{ width: `${percent}%` }} />
            </div>
            <div className="journal-progress-meta"><strong>{route.invested} / {route.price}</strong></div>
            <button className="journal-build-button" type="button"
              disabled={hasArrived}
              onClick={() => route.status === 'ready' ? onDepart() : onInvest(route)}>
              {actionLabel}
              <ArrowUpRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
