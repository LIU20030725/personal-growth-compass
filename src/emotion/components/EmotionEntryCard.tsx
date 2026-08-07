import { Heart, Image, Mic, Video } from 'lucide-react';
import { activityById, moodById } from '../emotionConfig';
import type { EmotionEntry } from '../types';
import { EmotionIcon } from './EmotionIcon';

interface EmotionEntryCardProps {
  entry: EmotionEntry;
  onOpen: () => void;
  onFavorite?: () => void;
}

export function EmotionEntryCard({ entry, onOpen, onFavorite }: EmotionEntryCardProps) {
  const mood = moodById.get(entry.moodId);
  const time = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(new Date(entry.createdAt));
  const imageCount = entry.attachments.filter((item) => item.kind === 'image').length;
  const videoCount = entry.attachments.filter((item) => item.kind === 'video').length;
  const audioCount = entry.attachments.filter((item) => item.kind === 'audio').length;
  return (
    <article className="emotion-entry-card">
      <button type="button" className="emotion-entry-card__main" onClick={onOpen}>
        <EmotionIcon moodId={entry.moodId} size="large" />
        <div className="emotion-entry-card__content">
          <div className="emotion-entry-card__title"><strong>{mood?.label}</strong><time>{time}</time></div>
          {entry.activityIds.length > 0 && <div className="emotion-entry-card__activities">{entry.activityIds.map((id) => <span key={id}>{activityById.get(id)?.label}</span>)}</div>}
          {entry.note && <p>{entry.note}</p>}
          {(imageCount + videoCount + audioCount > 0) && <div className="emotion-entry-card__media">
            {imageCount > 0 && <span><Image />{imageCount}</span>}
            {videoCount > 0 && <span><Video />{videoCount}</span>}
            {audioCount > 0 && <span><Mic />{audioCount}</span>}
          </div>}
        </div>
      </button>
      {onFavorite && <button type="button" className={`emotion-favorite-button${entry.isFavorite ? ' is-active' : ''}`} aria-label={entry.isFavorite ? '取消收藏' : '收藏记录'} onClick={onFavorite}><Heart fill={entry.isFavorite ? 'currentColor' : 'none'} /></button>}
    </article>
  );
}

