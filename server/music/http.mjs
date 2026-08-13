import { MusicResolverError } from './security.mjs';
import { resolveMusic as defaultResolve } from './resolver.mjs';

const jsonHeaders = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };

export function createMusicHttpHandler({ resolve = defaultResolve, limit = 20, windowMs = 60_000, maxClients = 10_000, clock = () => Date.now() } = {}) {
  const clients = new Map();
  return async function handle({ method, headers = {}, body, clientId = 'unknown' }) {
    if (method !== 'POST') return { status: 405, headers: { ...jsonHeaders, allow: 'POST' }, body: { ok: false, error: { code: 'INVALID_REQUEST', message: '仅支持 POST 请求' } } };
    const contentType = String(headers['content-type'] || headers['Content-Type'] || '').split(';')[0].trim().toLowerCase();
    if (contentType !== 'application/json') return { status: 415, headers: jsonHeaders, body: { ok: false, error: { code: 'INVALID_REQUEST', message: '请求必须使用 application/json' } } };
    const rawSize = typeof body === 'string' ? body.length : JSON.stringify(body ?? {}).length;
    if (rawSize > 8192) return { status: 413, headers: jsonHeaders, body: { ok: false, error: { code: 'INVALID_REQUEST', message: '请求内容过大' } } };
    let payload;
    try { payload = typeof body === 'string' ? JSON.parse(body) : body; } catch {
      return { status: 400, headers: jsonHeaders, body: { ok: false, error: { code: 'INVALID_REQUEST', message: '请求内容不是有效 JSON' } } };
    }
    if (!payload || typeof payload.url !== 'string') return { status: 400, headers: jsonHeaders, body: { ok: false, error: { code: 'INVALID_REQUEST', message: '缺少音乐链接' } } };

    const now = clock();
    const previous = clients.get(clientId);
    const bucket = !previous || now - previous.startedAt >= windowMs ? { startedAt: now, count: 0 } : previous;
    bucket.count += 1;
    clients.set(clientId, bucket);
    if (clients.size > maxClients) {
      for (const [key, value] of clients) {
        if (now - value.startedAt >= windowMs || clients.size > maxClients) clients.delete(key);
        if (clients.size <= maxClients) break;
      }
    }
    if (bucket.count > limit) return { status: 429, headers: { ...jsonHeaders, 'retry-after': String(Math.ceil(windowMs / 1000)) }, body: { ok: false, error: { code: 'RATE_LIMITED', message: '识别次数过多，请稍后再试' } } };

    try {
      return { status: 200, headers: jsonHeaders, body: { ok: true, music: await resolve(payload.url) } };
    } catch (error) {
      const safe = error instanceof MusicResolverError ? error : new MusicResolverError('UPSTREAM_UNAVAILABLE', '音乐识别服务暂时不可用', 502);
      return { status: safe.status, headers: jsonHeaders, body: { ok: false, error: { code: safe.code, message: safe.message } } };
    }
  };
}

export const musicHttpHandler = createMusicHttpHandler();
