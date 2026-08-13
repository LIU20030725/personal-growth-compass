import { describe, expect, it, vi } from 'vitest';
import { createMusicResolver } from './resolver.mjs';

const neteaseFixture = {
  songs: [{ name: 'EVERYTHING', artists: [{ name: 'Way Ched' }, { name: 'BIBI' }], album: { picUrl: 'https://p1.music.126.net/cover.jpg' } }]
};

describe('music metadata resolver security boundary', () => {
  it('uses a fixed NetEase metadata endpoint and returns normalized public metadata', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(neteaseFixture), { status: 200 }));
    const resolve = createMusicResolver({ fetcher });
    await expect(resolve('https://music.163.com/song?id=1495784933&uct2=opaque')).resolves.toEqual({
      provider: 'netease', title: 'EVERYTHING', artist: 'Way Ched / BIBI',
      coverUrl: 'https://p1.music.126.net/cover.jpg', sourceUrl: 'https://music.163.com/song?id=1495784933&uct2=opaque'
    });
    expect(fetcher).toHaveBeenCalledWith(
      'https://music.163.com/api/song/detail/?id=1495784933&ids=%5B1495784933%5D',
      expect.objectContaining({ redirect: 'manual' })
    );
  });

  it.each([
    'javascript:alert(1)',
    'data:text/plain,hello',
    'http://127.0.0.1/song?id=1',
    'https://music.163.com.evil.test/song?id=1',
    'https://user:pass@music.163.com/song?id=1',
    'https://music.163.com:8443/song?id=1',
    'https://music.163.com/playlist?id=1',
    'https://music.163.com/song?id=not-a-number'
  ])('rejects an unsafe or unsupported input without fetching: %s', async (url) => {
    const fetcher = vi.fn();
    const resolve = createMusicResolver({ fetcher });
    await expect(resolve(url)).rejects.toMatchObject({ code: 'UNSUPPORTED_LINK' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects oversized upstream responses', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('x'.repeat(600 * 1024), { status: 200 }));
    const resolve = createMusicResolver({ fetcher });
    await expect(resolve('https://music.163.com/song?id=1')).rejects.toMatchObject({ code: 'UPSTREAM_UNAVAILABLE' });
  });
});

