const DIRECT_HOSTS = new Set(['music.163.com', 'y.qq.com', 'c.y.qq.com']);
import { isIP } from 'node:net';

export class MusicResolverError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'MusicResolverError';
    this.code = code;
    this.status = status;
  }
}

export function parsePublicUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) throw new MusicResolverError('UNSUPPORTED_LINK', '音乐链接无效或过长');
  let url;
  try { url = new URL(value); } catch { throw new MusicResolverError('UNSUPPORTED_LINK', '音乐链接格式无效'); }
  if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.username || url.password || url.port) {
    throw new MusicResolverError('UNSUPPORTED_LINK', '音乐链接包含不安全的地址信息');
  }
  const host = url.hostname.toLowerCase();
  if (!DIRECT_HOSTS.has(host)) {
    throw new MusicResolverError('UNSUPPORTED_LINK', '目前仅支持网易云音乐和 QQ 音乐歌曲链接');
  }
  return url;
}

export function parseCanonicalSong(value) {
  const url = parsePublicUrl(value);
  const host = url.hostname.toLowerCase();
  if (host === 'music.163.com') {
    const pathId = url.pathname.match(/^\/(?:m\/)?song\/(\d+)\/?$/)?.[1];
    const id = pathId || (/^\/(?:m\/)?song$/.test(url.pathname) ? url.searchParams.get('id') : '');
    if (!id || !/^\d{1,20}$/.test(id)) throw new MusicResolverError('UNSUPPORTED_LINK', '这不是可识别的网易云单曲链接');
    return { provider: 'netease', id, sourceUrl: url.toString() };
  }
  const pathMid = url.pathname.match(/\/songDetail\/([A-Za-z0-9]{6,32})\/?$/)?.[1];
  const queryMid = host === 'c.y.qq.com' ? url.searchParams.get('songmid') : '';
  const id = pathMid || queryMid;
  if (!id || !/^[A-Za-z0-9]{6,32}$/.test(id)) throw new MusicResolverError('UNSUPPORTED_LINK', '这不是可识别的 QQ 音乐单曲链接');
  return { provider: 'qq', id, sourceUrl: url.toString() };
}

export function isPublicAddress(address) {
  const value = String(address).toLowerCase().split('%')[0];
  if (value.startsWith('::ffff:')) return isPublicAddress(value.slice(7));
  const kind = isIP(value);
  if (kind === 4) {
    const parts = value.split('.').map(Number);
    const [a, b] = parts;
    return !(a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) || a >= 224);
  }
  if (kind === 6) return !(value === '::' || value === '::1' || value.startsWith('fc') || value.startsWith('fd') || /^fe[89ab]/.test(value));
  return false;
}

export async function readBoundedJson(response, maxBytes = 512 * 1024, { timeoutMs = 4000 } = {}) {
  if (!response.ok) throw new MusicResolverError('UPSTREAM_UNAVAILABLE', '音乐平台暂时无法访问', 502);
  const mime = String(response.headers.get('content-type') || '').toLowerCase();
  if (!mime.includes('application/json') && !mime.includes('text/plain')) throw new MusicResolverError('UPSTREAM_UNAVAILABLE', '音乐平台返回了非 JSON 数据', 502);
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new MusicResolverError('UPSTREAM_UNAVAILABLE', '音乐平台返回的数据过大', 502);
  const chunks = [];
  let received = 0;
  if (!response.body) throw new MusicResolverError('UPSTREAM_UNAVAILABLE', '音乐平台没有返回数据', 502);
  const reader = response.body.getReader();
  const timeoutToken = Symbol('timeout');
  const deadline = new Promise((resolve) => setTimeout(() => resolve(timeoutToken), timeoutMs));
  try {
    while (true) {
      const next = await Promise.race([reader.read(), deadline]);
      if (next === timeoutToken) { await reader.cancel(); throw new MusicResolverError('UPSTREAM_TIMEOUT', '音乐平台响应超时，请稍后重试', 504); }
      const { done, value } = next;
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) { await reader.cancel(); throw new MusicResolverError('UPSTREAM_UNAVAILABLE', '音乐平台返回的数据过大', 502); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch {
    throw new MusicResolverError('UPSTREAM_UNAVAILABLE', '音乐平台返回了无法识别的数据', 502);
  }
}

export function normalizePublicText(value, maxLength, { required = false } = {}) {
  if (typeof value !== 'string') {
    if (required) throw new MusicResolverError('UPSTREAM_UNAVAILABLE', '音乐平台返回的字段格式异常', 502);
    return '';
  }
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (required && !normalized) throw new MusicResolverError('METADATA_NOT_FOUND', '没有找到歌曲标题', 404);
  return [...normalized].slice(0, maxLength).join('');
}

export async function fetchWithTimeout(fetcher, url, options = {}, timeoutMs = 4000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetcher(url, { ...options, signal: controller.signal, redirect: 'manual' });
  } catch (error) {
    if (error?.name === 'AbortError') throw new MusicResolverError('UPSTREAM_TIMEOUT', '音乐平台响应超时，请稍后重试', 504);
    throw new MusicResolverError('UPSTREAM_UNAVAILABLE', '暂时无法连接音乐平台', 502);
  } finally { clearTimeout(timeout); }
}
