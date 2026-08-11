import { Pause, Play } from 'lucide-react';
import { useRef, useState } from 'react';

function formatDuration(milliseconds: number) {
  const seconds = Number.isFinite(milliseconds) ? Math.max(0, Math.round(milliseconds / 1000)) : 0;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function EmotionAudioPlayer({ src, label, durationMs = 0 }: {
  src: string;
  label: string;
  durationMs?: number | null;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState('');
  const totalMs = durationMs || ((audioRef.current?.duration ?? 0) * 1000);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    setError('');
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
      setError('暂时无法播放这段声音');
    }
  }

  return <div className="emotion-audio-player">
    <audio
      ref={audioRef}
      src={src}
      preload="metadata"
      onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
      onEnded={() => { setPlaying(false); setCurrentTime(0); }}
      onError={() => { setPlaying(false); setError('暂时无法播放这段声音'); }}
    />
    <button type="button" className="emotion-audio-player__button" aria-label={`${playing ? '暂停' : '播放'}${label}`} onClick={() => void toggle()}>
      {playing ? <Pause /> : <Play />}
    </button>
    <div className="emotion-audio-player__meta">
      <strong>{label}</strong>
      <span>{formatDuration(currentTime * 1000)} / {formatDuration(totalMs)}</span>
    </div>
    {error && <span className="emotion-audio-player__error" role="status">{error}</span>}
  </div>;
}
