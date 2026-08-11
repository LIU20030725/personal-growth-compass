import { ExternalLink, Music2 } from 'lucide-react';
import type { EmotionMusicReference } from '../types';
import { EmotionAudioPlayer } from './EmotionAudioPlayer';

const providerLabels = { netease: '网易云音乐', qq: 'QQ 音乐', other: '原平台' } as const;

export function EmotionMusicCard({ music }: { music: EmotionMusicReference }) {
  const provider = providerLabels[music.provider];
  return <article className="emotion-music-card">
    <span className="emotion-music-card__cover" aria-hidden="true"><Music2 /></span>
    <div className="emotion-music-card__copy">
      <strong>{music.title}</strong>
      <span>{music.artist || '未填写歌手'} · {provider}</span>
    </div>
    {music.playbackUrl
      ? <EmotionAudioPlayer src={music.playbackUrl} label={music.title} />
      : <a href={music.sourceUrl} target="_blank" rel="noreferrer" aria-label={`去${provider}收听${music.title}`}><ExternalLink />去平台收听</a>}
  </article>;
}
