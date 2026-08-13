import { MusicResolverError, parseCanonicalSong } from './security.mjs';
import { neteaseAdapter } from './providers/netease.mjs';
import { qqAdapter } from './providers/qq.mjs';

const adapters = new Map([['netease', neteaseAdapter], ['qq', qqAdapter]]);

export function createMusicResolver({ fetcher = globalThis.fetch } = {}) {
  if (typeof fetcher !== 'function') throw new Error('A fetch implementation is required');
  return async function resolveMusic(value) {
    const link = parseCanonicalSong(value);
    const adapter = adapters.get(link.provider);
    if (!adapter) throw new MusicResolverError('UNSUPPORTED_LINK', '暂不支持该音乐平台');
    return adapter.resolve(link, fetcher);
  };
}

export const resolveMusic = createMusicResolver();
