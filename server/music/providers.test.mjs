import { describe, expect, it, vi } from 'vitest';
import { createMusicResolver } from './resolver.mjs';

describe('music provider adapters', () => {
  it('maps a QQ fixture without exposing an audio URL', async () => {
    const fixture = { code: 0, data: [{ name: '晴天', singer: [{ name: '周杰伦' }], album: { mid: '000MkMni19ClKG' } }] };
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(fixture), { status: 200 })));
    const resolve = createMusicResolver({ fetcher });
    await expect(resolve('https://y.qq.com/n/ryqq/songDetail/0039MnYb0qxYhV')).resolves.toEqual({
      provider: 'qq', title: '晴天', artist: '周杰伦',
      coverUrl: 'https://y.gtimg.cn/music/photo_new/T002R500x500M000000MkMni19ClKG.jpg',
      sourceUrl: 'https://y.qq.com/n/ryqq/songDetail/0039MnYb0qxYhV'
    });
    expect(fetcher.mock.calls[0][0]).toBe('https://c.y.qq.com/v8/fcg-bin/fcg_play_single_song.fcg?songmid=0039MnYb0qxYhV&format=json');
    expect(JSON.stringify(await resolve('https://y.qq.com/n/ryqq/songDetail/0039MnYb0qxYhV'))).not.toMatch(/audio|playback|media_mid/);
  });

  it('reports metadata not found for a valid empty fixture', async () => {
    const resolve = createMusicResolver({ fetcher: vi.fn().mockResolvedValue(new Response('{"songs":[]}', { status: 200 })) });
    await expect(resolve('https://music.163.com/song?id=1')).rejects.toMatchObject({ code: 'METADATA_NOT_FOUND' });
  });

  it('drops a cover URL outside the NetEase image host allowlist', async () => {
    const fixture = { songs: [{ name: '安全歌曲', artists: [], album: { picUrl: 'https://tracker.evil.test/pixel' } }] };
    const resolve = createMusicResolver({ fetcher: vi.fn().mockResolvedValue(new Response(JSON.stringify(fixture), { status: 200 })) });
    await expect(resolve('https://music.163.com/song?id=1')).resolves.toMatchObject({ coverUrl: '' });
  });

  it('normalizes missing optional fields and rejects invalid required fields', async () => {
    const noOptional = { songs: [{ name: '纯音乐', artists: [{ name: null }, { name: '艺术家' }], album: {} }] };
    const resolve = createMusicResolver({ fetcher: vi.fn().mockResolvedValue(new Response(JSON.stringify(noOptional), { status: 200, headers: { 'content-type': 'application/json' } })) });
    await expect(resolve('https://music.163.com/song?id=1')).resolves.toMatchObject({ title: '纯音乐', artist: '艺术家', coverUrl: '' });

    const invalid = { songs: [{ name: { nested: true }, artists: 'bad', album: {} }] };
    const invalidResolve = createMusicResolver({ fetcher: vi.fn().mockResolvedValue(new Response(JSON.stringify(invalid), { status: 200, headers: { 'content-type': 'application/json' } })) });
    await expect(invalidResolve('https://music.163.com/song?id=1')).rejects.toMatchObject({ code: 'UPSTREAM_UNAVAILABLE' });
  });

  it('bounds Unicode metadata lengths without splitting surrogate pairs', async () => {
    const fixture = { code: 0, data: [{ name: `🎵${'歌'.repeat(500)}`, singer: [{ name: '艺'.repeat(1500) }], album: {} }] };
    const resolve = createMusicResolver({ fetcher: vi.fn().mockResolvedValue(new Response(JSON.stringify(fixture), { status: 200, headers: { 'content-type': 'application/json' } })) });
    const result = await resolve('https://y.qq.com/n/ryqq/songDetail/0039MnYb0qxYhV');
    expect([...result.title].length).toBeLessThanOrEqual(300);
    expect([...result.artist].length).toBeLessThanOrEqual(1000);
    expect(result.title.startsWith('🎵')).toBe(true);
  });
});
