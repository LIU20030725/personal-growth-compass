import { MusicResolverError, fetchWithTimeout, parseCanonicalSong, parsePublicUrl } from './security.mjs';
import { neteaseAdapter } from './providers/netease.mjs';
import { qqAdapter } from './providers/qq.mjs';

const adapters = new Map([['netease', neteaseAdapter], ['qq', qqAdapter]]);

async function resolveShortLink(link, fetcher) {
  let current = link.url;
  for (let count = 0; count < 3; count += 1) {
    const response = await fetchWithTimeout(fetcher, current.toString(), { method: 'HEAD' });
    if (response.status < 300 || response.status >= 400) throw new MusicResolverError('UNSUPPORTED_LINK', '短链接没有指向支持的歌曲页面');
    const location = response.headers.get('location');
    if (!location) throw new MusicResolverError('UNSUPPORTED_LINK', '短链接缺少跳转地址');
    const next = new URL(location, current);
    parsePublicUrl(next.toString());
    const parsed = parseCanonicalSong(next.toString());
    if (parsed.provider !== 'netease-short') return parsed;
    current = next;
  }
  throw new MusicResolverError('UNSUPPORTED_LINK', '短链接跳转次数过多');
}

export function createMusicResolver({ fetcher = globalThis.fetch } = {}) {
  if (typeof fetcher !== 'function') throw new Error('A fetch implementation is required');
  return async function resolveMusic(value) {
    let link = parseCanonicalSong(value);
    if (link.provider === 'netease-short') link = await resolveShortLink(link, fetcher);
    const adapter = adapters.get(link.provider);
    if (!adapter) throw new MusicResolverError('UNSUPPORTED_LINK', '暂不支持该音乐平台');
    return adapter.resolve(link, fetcher);
  };
}

export const resolveMusic = createMusicResolver();

