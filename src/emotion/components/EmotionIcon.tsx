import { moodById } from '../emotionConfig';
import referenceMoodAtlas from '../assets/reference-mood-atlas.png';

interface EmotionIconProps {
  moodId: string;
  size?: 'small' | 'medium' | 'large';
  selected?: boolean;
}

interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

const referenceCrops: Record<string, CropRegion> = {
  happy: { x: 174, y: 25, width: 116, height: 112 },
  excited: { x: 366, y: 25, width: 130, height: 112 },
  grateful: { x: 560, y: 25, width: 132, height: 112 },
  satisfied: { x: 756, y: 25, width: 116, height: 112 },
  calm: { x: 174, y: 191, width: 116, height: 112 },
  relaxed: { x: 366, y: 191, width: 132, height: 112 },
  focused: { x: 560, y: 191, width: 116, height: 112 },
  clear: { x: 756, y: 191, width: 132, height: 112 },
  tired: { x: 164, y: 360, width: 132, height: 106 },
  bored: { x: 326, y: 360, width: 122, height: 106 },
  down: { x: 487, y: 360, width: 122, height: 106 },
  lonely: { x: 647, y: 360, width: 134, height: 106 },
  sad: { x: 806, y: 360, width: 122, height: 106 },
  anxious: { x: 164, y: 518, width: 130, height: 96 },
  stressed: { x: 325, y: 518, width: 126, height: 96 },
  angry: { x: 474, y: 518, width: 148, height: 96 },
  confused: { x: 646, y: 518, width: 134, height: 96 },
  overwhelmed: { x: 805, y: 518, width: 134, height: 96 }
};

export function EmotionIcon({ moodId, size = 'medium', selected = false }: EmotionIconProps) {
  const mood = moodById.get(moodId) ?? moodById.get('calm')!;
  const crop = referenceCrops[mood.id] ?? referenceCrops.calm;

  return (
    <span
      className={`emotion-face emotion-face--reference emotion-face--${size} emotion-face--${mood.id}${selected ? ' is-selected' : ''}`}
      data-mood-group={mood.group}
      aria-hidden="true"
    >
      <svg
        data-reference-face={mood.id}
        viewBox={`${crop.x} ${crop.y} ${crop.width} ${crop.height}`}
        preserveAspectRatio="xMidYMid meet"
        focusable="false"
      >
        <image href={referenceMoodAtlas} x="0" y="0" width="1027" height="686" />
      </svg>
    </span>
  );
}
