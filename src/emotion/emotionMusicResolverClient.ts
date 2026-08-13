import type { EmotionMusicProvider } from './types';

export interface ResolvedMusicMetadata {
  provider: Exclude<EmotionMusicProvider, 'other'>;
  title: string;
  artist: string;
  coverUrl: string;
  sourceUrl: string;
}

export class MusicResolverClientError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'MusicResolverClientError';
  }
}

function isAllowedCover(value: unknown, provider: ResolvedMusicMetadata['provider']) {
  if (value === '') return true;
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    return provider === 'netease'
      ? url.hostname === 'music.126.net' || url.hostname.endsWith('.music.126.net')
      : url.hostname === 'y.gtimg.cn';
  } catch { return false; }
}

function isValidMetadata(value: unknown, requestedUrl: string): value is ResolvedMusicMetadata {
  if (!value || typeof value !== 'object') return false;
  const music = value as Record<string, unknown>;
  return (music.provider === 'netease' || music.provider === 'qq') &&
    typeof music.title === 'string' && music.title.trim().length > 0 && music.title.length <= 300 &&
    typeof music.artist === 'string' && music.artist.length <= 1000 &&
    typeof music.sourceUrl === 'string' && music.sourceUrl === requestedUrl &&
    isAllowedCover(music.coverUrl, music.provider);
}

export async function resolveMusicMetadata(sourceUrl: string, { fetcher = fetch, signal }: { fetcher?: typeof fetch; signal?: AbortSignal } = {}) {
  let response: Response;
  try {
    response = await fetcher('/api/music/resolve', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: sourceUrl }), signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new MusicResolverClientError('SERVICE_UNAVAILABLE', '音乐识别服务暂时无法连接，仍可仅保存链接');
  }
  let payload: unknown;
  try { payload = await response.json(); } catch {
    throw new MusicResolverClientError('SERVICE_UNAVAILABLE', '音乐识别服务返回异常，仍可仅保存链接');
  }
  const data = payload as { ok?: boolean; music?: ResolvedMusicMetadata; error?: { code?: string; message?: string } };
  if (!response.ok || !data.ok || !data.music) {
    throw new MusicResolverClientError(data.error?.code || 'SERVICE_UNAVAILABLE', data.error?.message || '暂时没有识别到歌曲信息，仍可仅保存链接');
  }
  if (!isValidMetadata(data.music, sourceUrl)) throw new MusicResolverClientError('INVALID_RESPONSE', '音乐识别结果异常，仍可仅保存链接');
  return data.music;
}

