import { describe, expect, it, vi } from 'vitest';
import { createMusicHttpHandler } from './http.mjs';

describe('music resolver HTTP contract', () => {
  it('returns the normalized success envelope', async () => {
    const handler = createMusicHttpHandler({ resolve: vi.fn().mockResolvedValue({ provider: 'netease', title: '歌', artist: '歌手', coverUrl: '', sourceUrl: 'https://music.163.com/song?id=1' }) });
    const response = await handler({ method: 'POST', body: { url: 'https://music.163.com/song?id=1' }, clientId: 'test' });
    expect(response).toEqual({ status: 200, headers: expect.any(Object), body: { ok: true, music: expect.objectContaining({ title: '歌' }) } });
  });

  it('rejects oversized payloads and rate limits by client', async () => {
    const resolve = vi.fn().mockResolvedValue({});
    const handler = createMusicHttpHandler({ resolve, limit: 2, windowMs: 60_000 });
    expect((await handler({ method: 'POST', body: { url: 'x'.repeat(9000) }, clientId: 'a' })).status).toBe(413);
    expect((await handler({ method: 'POST', body: { url: 'https://music.163.com/song?id=1' }, clientId: 'b' })).status).toBe(200);
    expect((await handler({ method: 'POST', body: { url: 'https://music.163.com/song?id=1' }, clientId: 'b' })).status).toBe(200);
    const blocked = await handler({ method: 'POST', body: { url: 'https://music.163.com/song?id=1' }, clientId: 'b' });
    expect(blocked).toMatchObject({ status: 429, body: { ok: false, error: { code: 'RATE_LIMITED' } } });
  });
});
