import { moodById } from '../emotionConfig';
import { artworkByMoodId } from './EmotionFaceArtwork';

interface EmotionIconProps {
  moodId: string;
  size?: 'small' | 'medium' | 'large';
  selected?: boolean;
}

export function EmotionIcon({ moodId, size = 'medium' }: EmotionIconProps) {
  const mood = moodById.get(moodId) ?? moodById.get('calm')!;
  const Artwork = artworkByMoodId[mood.id] ?? artworkByMoodId.calm;

  return (
    <span
      className={`emotion-face emotion-face--vector emotion-face--${size} emotion-face--${mood.id}`}
      data-mood-group={mood.group}
      aria-hidden="true"
    >
      <Artwork id={`emotion-${mood.id}`} />
    </span>
  );
}
