import { Clock3 } from 'lucide-react';
import { moodById } from '../emotionConfig';
import type { EmotionEntry } from '../types';
import { EmotionIcon } from './EmotionIcon';

export function EmotionStatusCard({ entry, onOpen }: { entry: EmotionEntry; onOpen: () => void }) {
  const mood = moodById.get(entry.moodId);
  return <button className="emotion-status-card" type="button" onClick={onOpen}>
    <div><span className="emotion-eyebrow"><Clock3 /> TODAY STATUS</span><h2>现在的我，{mood?.label}</h2><p>{entry.note || '这一刻已经被轻轻收好。'}</p></div>
    <EmotionIcon moodId={entry.moodId} size="large" />
  </button>;
}

