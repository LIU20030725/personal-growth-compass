import { Clock3 } from 'lucide-react';
import { moodById } from '../emotionConfig';
import type { EmotionEntry } from '../types';
import { EmotionIcon } from './EmotionIcon';

export function EmotionStatusCard({ entry, onOpen }: { entry: EmotionEntry; onOpen: () => void }) {
  const mood = moodById.get(entry.moodId);
  return <button className="emotion-status-card" type="button" onClick={onOpen}>
    <div><span className="emotion-eyebrow"><Clock3 /> TODAY STATUS</span><h2>现在的我，{mood?.label}</h2><p>{entry.note || '这一刻已经被轻轻收好。'}</p></div>
    <span className="emotion-status-card__art" aria-hidden="true"><span className="emotion-status-card__leaf" /><EmotionIcon moodId={entry.moodId} size="large" /><span className="emotion-status-card__dot" /></span>
  </button>;
}
