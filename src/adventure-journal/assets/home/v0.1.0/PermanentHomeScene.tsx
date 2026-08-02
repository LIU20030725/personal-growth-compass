import type { InvestmentProgress } from '../../../domain/types';
import { getProgressStage } from '../../../domain/adventureEngine';
import permanentHomePixel from '../v1.1.0/permanent-home-pixel.webp';

type PermanentHomeSceneProps = {
  reducedMotion: boolean;
  investments: InvestmentProgress[];
  onSelect?(target: InvestmentProgress): void;
};

const LABELS: Record<string, string> = {
  'home-field-desk': '田野书桌',
  'home-memory-shelf': '记忆陈列架'
};

export function PermanentHomeScene({ reducedMotion, investments, onSelect }: PermanentHomeSceneProps) {
  return (
    <div
      className={`journal-pixel-world journal-home-world ${reducedMotion ? 'is-reduced-motion' : ''}`}
    >
      <img
        className={`home-world-art ${reducedMotion ? 'is-reduced-motion' : ''}`}
        src={permanentHomePixel}
        alt="永久家园像素场景"
      />
      <div className="home-sun-wash" aria-hidden="true" />
      <div className="home-chimney-smoke" aria-hidden="true"><span /><span /><span /></div>
      {investments.map((item) => {
        const stage = getProgressStage(item.invested, item.price);
        const percent = Math.round((item.invested / item.price) * 100);
        const className = `home-build-site ${item.targetId} build-stage-${stage}`;
        const content = <>
          <span className="build-site-foundation" aria-hidden="true" />
          <span className="build-site-crates" aria-hidden="true" />
          <span className="build-site-furniture" aria-hidden="true" />
          <span className="build-site-label" aria-hidden="true">{percent}%</span>
        </>;

        if (stage === 4) {
          return <div
            className={className}
            data-testid={item.targetId}
            data-build-stage={stage}
            key={item.targetId}
            aria-label={`${LABELS[item.targetId] ?? item.targetId}，已建成`}
          >
            {content}
          </div>;
        }

        return <button
          className={`${className} is-interactive`}
          data-testid={item.targetId}
          data-build-stage={stage}
          key={item.targetId}
          type="button"
          aria-label={`建造${LABELS[item.targetId] ?? item.targetId}，当前 ${percent}%`}
          onClick={() => onSelect?.(item)}
        >
          {content}
        </button>;
      })}
      <div className="home-resident" aria-hidden="true">
        <span className="resident-head" />
        <span className="resident-body" />
        <span className="resident-leg left" />
        <span className="resident-leg right" />
      </div>
      <div className="home-butterfly" aria-hidden="true">✦</div>
    </div>
  );
}
