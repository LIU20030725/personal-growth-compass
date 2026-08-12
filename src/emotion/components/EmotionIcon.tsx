import type { CSSProperties } from 'react';
import { moodById } from '../emotionConfig';

interface EmotionIconProps {
  moodId: string;
  size?: 'small' | 'medium' | 'large';
  selected?: boolean;
}

export function EmotionIcon({ moodId, size = 'medium', selected = false }: EmotionIconProps) {
  const mood = moodById.get(moodId) ?? moodById.get('calm')!;
  const marks = ['excited', 'grateful', 'tired', 'down', 'lonely', 'anxious', 'stressed', 'angry', 'confused', 'sad', 'overwhelmed'] as const;
  return (
    <span
      className={`emotion-face emotion-face--${size} emotion-face--${mood.face} emotion-face--${mood.id}${selected ? ' is-selected' : ''}`}
      style={{ '--face-color': mood.color } as CSSProperties}
      data-mood-group={mood.group}
      aria-hidden="true"
    >
      <span className="emotion-face__brow emotion-face__brow--left" />
      <span className="emotion-face__brow emotion-face__brow--right" />
      <span className="emotion-face__eye emotion-face__eye--left" />
      <span className="emotion-face__eye emotion-face__eye--right" />
      <span className="emotion-face__mouth" />
      <span className="emotion-face__cheek emotion-face__cheek--left" />
      <span className="emotion-face__cheek emotion-face__cheek--right" />
      {marks.includes(mood.id as typeof marks[number]) && <span className={`emotion-face__mark emotion-face__mark--${mood.id}`} />}
      {mood.face === 'spark' && <span className="emotion-face__spark" />}
    </span>
  );
}
