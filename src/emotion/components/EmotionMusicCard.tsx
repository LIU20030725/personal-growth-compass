import { ExternalLink, Music2 } from 'lucide-react';
import type { EmotionMusicReference } from '../types';
import { EmotionAudioPlayer } from './EmotionAudioPlayer';
import { isSafeHttpUrl } from '../emotionSafety';

const providerLabels = { netease: '网易云音乐', qq: 'QQ 音乐', other: '原平台' } as const;

export function EmotionMusicCard({ music }: { music: EmotionMusicReference }) {
  const provider = providerLabels[music.provider];
  const playable = isSafeHttpUrl(music.playbackUrl);
  const source = isSafeHttpUrl(music.sourceUrl);
  return <article className="emotion-music-card">
    <span className="emotion-music-card__cover" aria-hidden="true"><Music2 /></span>
    <div className="emotion-music-card__copy">
      <strong>{music.title}</strong>
      <span>{music.artist ? `${music.artist} · ` : ''}{provider}</span>
    </div>
    {playable
      ? <EmotionAudioPlayer src={music.playbackUrl} label={music.title} />
      : source
        ? <a href={music.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`去${provider}听${music.title}`}><ExternalLink />去听这首歌</a>
        : <span className="emotion-music-card__unavailable">链接暂时不可用</span>}
  </article>;
}
