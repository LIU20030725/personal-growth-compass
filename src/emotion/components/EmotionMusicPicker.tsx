import { ExternalLink, Music2, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { parseMusicShare, type ParsedMusicShare } from '../emotionMusicLink';
import type { EmotionMusicReference } from '../types';

const providerLabels = { netease: '网易云音乐', qq: 'QQ 音乐', other: '音乐网页' } as const;

export function EmotionMusicPicker({ initialText = '', onConfirm, onCancel }: {
  initialText?: string;
  onConfirm: (music: EmotionMusicReference) => void;
  onCancel: () => void;
}) {
  const [input, setInput] = useState(initialText);
  const [result, setResult] = useState<ParsedMusicShare | null>(null);
  const [error, setError] = useState('');

  function identify() {
    const parsed = parseMusicShare(input);
    if (!parsed) {
      setResult(null);
      setError('请粘贴有效的 http 或 https 音乐链接');
      return;
    }
    setResult(parsed);
    setError('');
  }

  function confirm() {
    if (!result) return;
    onConfirm({
      id: `music-${Date.now()}`,
      provider: result.provider,
      title: result.title,
      artist: result.artist,
      sourceUrl: result.sourceUrl,
      playbackUrl: '',
      isFavorite: true
    });
  }

  return <section className="emotion-music-picker" aria-labelledby="emotion-music-picker-title" onKeyDown={(event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    onCancel();
  }}>
    <div className="emotion-music-picker__heading">
      <span aria-hidden="true"><Music2 /></span>
      <div><h4 id="emotion-music-picker-title">收藏此刻的歌</h4><p>粘贴分享内容，歌曲信息会尽量自动识别</p></div>
    </div>
    <div className="emotion-music-picker__input-row">
      <label htmlFor="emotion-music-share">音乐分享链接</label>
      <div><input id="emotion-music-share" value={input} autoFocus placeholder="粘贴网易云、QQ 音乐或其他音乐网页链接" onChange={(event) => { setInput(event.target.value); setError(''); setResult(null); }} />
        <button type="button" onClick={identify}>识别音乐</button></div>
    </div>
    {error && <p className="emotion-music-picker__error" role="alert">{error}</p>}
    {result && <article className="emotion-music-picker__preview">
      <span aria-hidden="true"><Music2 /></span>
      <div><strong>{result.title}</strong><span>{result.artist ? `${result.artist} · ` : ''}{providerLabels[result.provider]}</span>
        {result.confidence === 'link-only' && <p>暂时没有读到歌曲信息，仍可保存并前往原网页。</p>}</div>
      <a href={result.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label="预览音乐网页"><ExternalLink /></a>
    </article>}
    <div className="emotion-music-picker__actions">
      <button type="button" className="emotion-music-picker__cancel" onClick={onCancel}>取消音乐收藏</button>
      {result && <button type="button" className="emotion-music-picker__confirm" onClick={confirm}>
        {result.confidence === 'identified' ? '添加到这一刻' : '直接保存链接'}
      </button>}
      {result && <button type="button" className="emotion-music-picker__retry" onClick={() => { setResult(null); setInput(''); }}><RotateCcw />重新粘贴</button>}
    </div>
  </section>;
}
