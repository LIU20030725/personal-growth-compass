import { ExternalLink, Music2 } from 'lucide-react';
import type { EmotionMusicReference } from '../types';
import { EmotionAudioPlayer } from './EmotionAudioPlayer';
import { isSafeHttpUrl } from '../emotionSafety';

const providerLabels = { netease: '网易云音乐', qq: 'QQ 音乐', other: '原平台' } as const;

function safeCover(provider: EmotionMusicReference['provider'], value?: string) {
  if (!value) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return '';
    if (provider === 'netease' && (url.hostname === 'music.126.net' || url.hostname.endsWith('.music.126.net'))) return url.toString();
    if (provider === 'qq' && url.hostname === 'y.gtimg.cn') return url.toString();
  } catch { /* stable placeholder */ }
  return '';
}

export function EmotionMusicCard({ music }: { music: EmotionMusicReference }) {
  const provider = providerLabels[music.provider];
  const playable = isSafeHttpUrl(music.playbackUrl);
  const source = isSafeHttpUrl(music.sourceUrl);
  const cover = safeCover(music.provider, music.coverUrl);
  return <article className="emotion-music-card">
    {cover
      ? <img className="emotion-music-card__cover" src={cover} alt={`${music.title} 封面`} referrerPolicy="no-referrer" />
      : <span className="emotion-music-card__cover" data-testid="music-cover-placeholder" aria-hidden="true"><Music2 /></span>}
    <div className="emotion-music-card__copy">
      <strong>{music.title}</strong>
      <span>{music.artist ? `${music.artist} · ` : ''}{provider}</span>
    </div>
    {playable
      ? <EmotionAudioPlayer src={music.playbackUrl} label={music.title} />
      : source
        ? <a href={music.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`去${provider}听${music.title}`}><ExternalLink />去听这首歌</a>
        : <span className="emotion-music-card__unavailable">链接不可用</span>}
  </article>;
}
