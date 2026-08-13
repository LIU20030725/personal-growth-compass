import { ExternalLink, LoaderCircle, Music2, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { parseMusicShare, type ParsedMusicShare } from '../emotionMusicLink';
import { resolveMusicMetadata, type ResolvedMusicMetadata } from '../emotionMusicResolverClient';
import type { EmotionMusicReference } from '../types';

const providerLabels = { netease: '网易云音乐', qq: 'QQ 音乐', other: '音乐网页' } as const;
type PickerResult = ParsedMusicShare & { coverUrl: string };

export function EmotionMusicPicker({ initialText = '', onConfirm, onCancel, resolveMetadata = resolveMusicMetadata }: {
  initialText?: string;
  onConfirm: (music: EmotionMusicReference) => void;
  onCancel: () => void;
  resolveMetadata?: (sourceUrl: string, signal?: AbortSignal) => Promise<ResolvedMusicMetadata>;
}) {
  const [input, setInput] = useState(initialText);
  const [result, setResult] = useState<PickerResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => () => activeRequest.current?.abort(), []);

  async function identify() {
    const parsed = parseMusicShare(input);
    if (!parsed) { setResult(null); setError('请粘贴有效的 http 或 https 音乐链接'); return; }
    if (parsed.confidence === 'identified' || parsed.provider === 'other') {
      setResult({ ...parsed, coverUrl: '' }); setError(''); return;
    }
    const currentRequest = ++requestId.current;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true); setResult(null); setError('');
    try {
      const remote = await resolveMetadata(parsed.sourceUrl, controller.signal);
      if (currentRequest !== requestId.current) return;
      setResult({ ...remote, confidence: 'identified' });
    } catch (reason) {
      if (currentRequest !== requestId.current) return;
      setResult({ ...parsed, coverUrl: '' });
      setError(reason instanceof Error ? reason.message : '暂时没有识别到歌曲信息，仍可仅保存链接');
    } finally {
      if (currentRequest === requestId.current) { setLoading(false); activeRequest.current = null; }
    }
  }

  function confirm() {
    if (!result) return;
    onConfirm({ id: `music-${Date.now()}`, provider: result.provider, title: result.title, artist: result.artist,
      coverUrl: result.coverUrl, sourceUrl: result.sourceUrl, playbackUrl: '', isFavorite: true });
  }

  function changeInput(value: string) {
    requestId.current += 1; activeRequest.current?.abort(); activeRequest.current = null;
    setInput(value); setError(''); setResult(null); setLoading(false);
  }

  return <section className="emotion-music-picker" aria-labelledby="emotion-music-picker-title" onKeyDown={(event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault(); event.stopPropagation(); requestId.current += 1; onCancel();
  }}>
    <div className="emotion-music-picker__heading">
      <span aria-hidden="true"><Music2 /></span>
      <div><h4 id="emotion-music-picker-title">收藏此刻的歌</h4><p>粘贴网易云或 QQ 音乐链接，自动读取公开歌曲信息</p></div>
    </div>
    <div className="emotion-music-picker__input-row">
      <label htmlFor="emotion-music-share">音乐分享链接</label>
      <div><input id="emotion-music-share" value={input} autoFocus placeholder="粘贴网易云、QQ 音乐链接或完整分享文案" disabled={loading} onChange={(event) => changeInput(event.target.value)} />
        <button type="button" disabled={loading} onClick={identify}>{loading ? <><LoaderCircle className="emotion-music-picker__spinner" />正在识别</> : '识别音乐'}</button></div>
    </div>
    <div className="emotion-music-picker__status" aria-live="polite">{loading ? '正在从音乐平台读取公开歌曲信息' : ''}</div>
    {error && <p className="emotion-music-picker__error" role="alert">{error}</p>}
    {result && <article className="emotion-music-picker__preview">
      {result.coverUrl ? <img src={result.coverUrl} alt={`${result.title} 封面`} referrerPolicy="no-referrer" /> : <span aria-hidden="true"><Music2 /></span>}
      <div><strong>{result.title}</strong><span>{result.artist ? `${result.artist} · ` : ''}{providerLabels[result.provider]}</span>
        {result.confidence === 'link-only' && !error && <p>分享链接已确认，但没有读取到歌曲资料。</p>}</div>
      <a href={result.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label="预览音乐网页"><ExternalLink /></a>
    </article>}
    <div className="emotion-music-picker__actions">
      <button type="button" className="emotion-music-picker__cancel" onClick={onCancel}>取消音乐收藏</button>
      {result && <button type="button" className="emotion-music-picker__confirm" onClick={confirm}>{result.confidence === 'identified' ? '添加到这一刻' : '仅保存链接'}</button>}
      {result && <button type="button" className="emotion-music-picker__retry" onClick={() => changeInput('')}><RotateCcw />重新粘贴</button>}
    </div>
  </section>;
}
