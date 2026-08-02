import { ArrowLeft, Heart, Pencil, Trash2 } from 'lucide-react';
import { activityById, moodById } from '../emotionConfig';
import type { EmotionEntry } from '../types';
import { EmotionIcon } from './EmotionIcon';
import { EmotionMediaGrid } from './EmotionMediaGrid';

export function EmotionEntryDetail({ entry, getBlob, onBack, onEdit, onDelete, onFavorite, onAttachmentFavorite }: {
  entry: EmotionEntry;
  getBlob: (id: string) => Promise<Blob | null>;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onFavorite: () => void;
  onAttachmentFavorite: (id: string) => void;
}) {
  const mood = moodById.get(entry.moodId);
  return <div className="emotion-view"><header className="emotion-detail-header"><button type="button" className="emotion-icon-button" aria-label="返回" onClick={onBack}><ArrowLeft /></button><div><span>MOMENT DETAIL</span><h1>这一刻的记录</h1></div><div className="emotion-detail-actions"><button type="button" aria-label="编辑记录" onClick={onEdit}><Pencil /></button><button type="button" aria-label={entry.isFavorite ? '取消收藏' : '收藏记录'} onClick={onFavorite}><Heart fill={entry.isFavorite ? 'currentColor' : 'none'} /></button><button type="button" aria-label="删除记录" onClick={onDelete}><Trash2 /></button></div></header>
    <article className="emotion-detail-card"><div className="emotion-detail-card__mood"><EmotionIcon moodId={entry.moodId} size="large" /><div><span>{new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(entry.createdAt))}</span><h2>{mood?.label}</h2></div></div>{entry.activityIds.length > 0 && <div className="emotion-detail-activities">{entry.activityIds.map((id) => <span key={id}>{activityById.get(id)?.label}</span>)}</div>}{entry.note && <p className="emotion-detail-note">{entry.note}</p>}<EmotionMediaGrid attachments={entry.attachments} getBlob={getBlob} onFavorite={onAttachmentFavorite} /></article>
  </div>;
}
