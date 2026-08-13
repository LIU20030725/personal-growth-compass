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

export async function resolveMusicMetadata(sourceUrl: string, { fetcher = fetch }: { fetcher?: typeof fetch } = {}) {
  let response: Response;
  try {
    response = await fetcher('/api/music/resolve', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: sourceUrl }) });
  } catch {
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
  return data.music;
}

