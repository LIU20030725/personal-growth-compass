import type { CSSProperties } from 'react';
import { moodById } from '../emotionConfig';

interface EmotionIconProps {
  moodId: string;
  size?: 'small' | 'medium' | 'large';
  selected?: boolean;
}

export function EmotionIcon({ moodId, size = 'medium', selected = false }: EmotionIconProps) {
  const mood = moodById.get(moodId) ?? moodById.get('calm')!;
  return (
    <span
      className={`emotion-face emotion-face--${size} emotion-face--${mood.face}${selected ? ' is-selected' : ''}`}
      style={{ '--face-color': mood.color } as CSSProperties}
      aria-hidden="true"
    >
      <span className="emotion-face__eye emotion-face__eye--left" />
      <span className="emotion-face__eye emotion-face__eye--right" />
      <span className="emotion-face__mouth" />
      {mood.face === 'spark' && <span className="emotion-face__spark">✦</span>}
    </span>
  );
}

