import { describe, expect, it, vi } from 'vitest';
import { resolveMusicMetadata } from './emotionMusicResolverClient';

describe('music resolver client', () => {
  it('returns normalized music metadata from the resolver API', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, music: {
      provider: 'netease', title: 'EVERYTHING', artist: 'Way Ched / BIBI', coverUrl: 'https://p1.music.126.net/cover.jpg', sourceUrl: 'https://music.163.com/song?id=1'
    } }), { status: 200, headers: { 'content-type': 'application/json' } }));
    await expect(resolveMusicMetadata('https://music.163.com/song?id=1', { fetcher })).resolves.toMatchObject({ title: 'EVERYTHING' });
    expect(fetcher).toHaveBeenCalledWith('/api/music/resolve', expect.objectContaining({ method: 'POST' }));
  });

  it('surfaces a safe failure message from the API', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, error: { code: 'METADATA_NOT_FOUND', message: '没有找到歌曲信息' } }), { status: 404 }));
    await expect(resolveMusicMetadata('https://music.163.com/song?id=1', { fetcher })).rejects.toMatchObject({ code: 'METADATA_NOT_FOUND', message: '没有找到歌曲信息' });
  });

  it('turns network failure into an actionable service error', async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    await expect(resolveMusicMetadata('https://music.163.com/song?id=1', { fetcher })).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
  });

  it('rejects dangerous or malformed metadata returned by the service', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, music: {
      provider: 'netease', title: '', artist: 123, coverUrl: 'javascript:alert(1)', sourceUrl: 'https://evil.test/song'
    } }), { status: 200 }));
    await expect(resolveMusicMetadata('https://music.163.com/song?id=1', { fetcher })).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
});
