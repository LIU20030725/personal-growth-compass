import { describe, expect, it, vi } from 'vitest';
import { createMusicHttpHandler } from './http.mjs';

describe('music resolver HTTP contract', () => {
  it('returns the normalized success envelope', async () => {
    const handler = createMusicHttpHandler({ resolve: vi.fn().mockResolvedValue({ provider: 'netease', title: '歌', artist: '歌手', coverUrl: '', sourceUrl: 'https://music.163.com/song?id=1' }) });
    const response = await handler({ method: 'POST', headers: { 'content-type': 'application/json' }, body: { url: 'https://music.163.com/song?id=1' }, clientId: 'test' });
    expect(response).toEqual({ status: 200, headers: expect.any(Object), body: { ok: true, music: expect.objectContaining({ title: '歌' }) } });
  });

  it('rejects oversized payloads and rate limits by client', async () => {
    const resolve = vi.fn().mockResolvedValue({});
    const handler = createMusicHttpHandler({ resolve, limit: 2, windowMs: 60_000 });
    const headers = { 'content-type': 'application/json' };
    expect((await handler({ method: 'POST', headers, body: { url: 'x'.repeat(9000) }, clientId: 'a' })).status).toBe(413);
    expect((await handler({ method: 'POST', headers, body: { url: 'https://music.163.com/song?id=1' }, clientId: 'b' })).status).toBe(200);
    expect((await handler({ method: 'POST', headers, body: { url: 'https://music.163.com/song?id=1' }, clientId: 'b' })).status).toBe(200);
    const blocked = await handler({ method: 'POST', headers, body: { url: 'https://music.163.com/song?id=1' }, clientId: 'b' });
    expect(blocked).toMatchObject({ status: 429, body: { ok: false, error: { code: 'RATE_LIMITED' } } });
  });

  it('requires JSON and keeps its error response free of internals', async () => {
    const handler = createMusicHttpHandler({ resolve: vi.fn(() => { throw new Error('secret upstream http://10.0.0.1 token=abc'); }) });
    expect(await handler({ method: 'GET', headers: {}, body: '', clientId: 'a' })).toMatchObject({ status: 405 });
    expect(await handler({ method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}', clientId: 'a' })).toMatchObject({ status: 415 });
    const failed = await handler({ method: 'POST', headers: { 'content-type': 'application/json' }, body: { url: 'https://music.163.com/song?id=1' }, clientId: 'a' });
    expect(failed.status).toBe(502);
    expect(JSON.stringify(failed)).not.toMatch(/10\.0\.0\.1|token=abc|stack/);
    expect(failed.headers).toMatchObject({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    expect(failed.headers).not.toHaveProperty('access-control-allow-origin');
  });

  it('resets at the window boundary and bounds limiter memory', async () => {
    let now = 0;
    const handler = createMusicHttpHandler({ resolve: vi.fn().mockResolvedValue({}), limit: 1, windowMs: 1000, maxClients: 2, clock: () => now });
    const request = (clientId) => handler({ method: 'POST', headers: { 'content-type': 'application/json' }, body: { url: 'https://music.163.com/song?id=1' }, clientId });
    expect((await request('a')).status).toBe(200);
    expect((await request('a')).status).toBe(429);
    now = 1000;
    expect((await request('a')).status).toBe(200);
    await request('b'); await request('c');
    now = 2000;
    expect((await request('a')).status).toBe(200);
  });
});
