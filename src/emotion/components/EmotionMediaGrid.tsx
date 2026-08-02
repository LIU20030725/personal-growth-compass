import { useEffect, useState } from 'react';
import { FileAudio, Film, Heart } from 'lucide-react';
import type { EmotionAttachment } from '../types';

function EmotionMediaPreview({ attachment, getBlob }: { attachment: EmotionAttachment; getBlob: (id: string) => Promise<Blob | null> }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let active = true;
    let nextUrl = '';
    getBlob(attachment.id).then((blob) => {
      if (active && blob) { nextUrl = URL.createObjectURL(blob); setUrl(nextUrl); }
    });
    return () => { active = false; if (nextUrl) URL.revokeObjectURL(nextUrl); };
  }, [attachment.id, getBlob]);
  if (!url) return <div className="emotion-media-placeholder">{attachment.kind === 'audio' ? <FileAudio /> : <Film />}</div>;
  if (attachment.kind === 'image') return <img src={url} alt={attachment.fileName || '情绪记录图片'} />;
  if (attachment.kind === 'video') return <video src={url} controls preload="metadata" />;
  return <audio src={url} controls />;
}

export function EmotionMediaGrid({ attachments, getBlob, onFavorite }: {
  attachments: EmotionAttachment[];
  getBlob: (id: string) => Promise<Blob | null>;
  onFavorite?: (id: string) => void;
}) {
  if (!attachments.length) return null;
  return <div className="emotion-media-grid">
    {attachments.map((attachment) => <div className={`emotion-media-item emotion-media-item--${attachment.kind}`} key={attachment.id}>
      <EmotionMediaPreview attachment={attachment} getBlob={getBlob} />
      {onFavorite && <button type="button" aria-label={attachment.isFavorite ? '取消收藏内容' : '收藏内容'} onClick={() => onFavorite(attachment.id)}><Heart fill={attachment.isFavorite ? 'currentColor' : 'none'} /></button>}
    </div>)}
  </div>;
}
