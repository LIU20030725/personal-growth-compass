import { getProgressStage } from '../../../domain/adventureEngine';
import travelerWalk from '../../shared/v1.1.0/traveler-walk.webp';
import sunnyTrailPixel from '../v1.1.0/sunny-trail-pixel.webp';

type SunnyTrailSceneProps = {
  reducedMotion: boolean;
  progress?: number;
};

export function SunnyTrailScene({ reducedMotion, progress = 0 }: SunnyTrailSceneProps) {
  const stage = getProgressStage(progress, 100);

  return (
    <div
      className={`journal-pixel-world journal-journey-world stage-${stage} ${reducedMotion ? 'is-reduced-motion' : ''}`}
      data-testid="journey-pixel-world"
      data-progress-stage={stage}
      role="img"
      aria-label="晴日林径像素旅途场景"
    >
      <img className="journey-backdrop" data-testid="journey-backdrop" src={sunnyTrailPixel} alt="" aria-hidden="true" />
      <div className="journey-light" aria-hidden="true" />
      <div className="journey-milestone" aria-hidden="true">
        <span className="journey-bridge-post post-left" />
        <span className="journey-bridge-deck" />
        <span className="journey-bridge-post post-right" />
      </div>
      <div className="journey-walker" data-testid="journey-walker" data-frame-count="4" aria-hidden="true">
        <img src={travelerWalk} alt="" />
      </div>
      <div className="journey-foreground" aria-hidden="true">
        <span /><span /><span /><span /><span /><span />
      </div>
    </div>
  );
}
