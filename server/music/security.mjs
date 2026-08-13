const DIRECT_HOSTS = new Set(['music.163.com', 'y.qq.com', 'c.y.qq.com']);
const SHORT_HOSTS = new Set(['163cn.tv']);

export class MusicResolverError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'MusicResolverError';
    this.code = code;
    this.status = status;
  }
}

export function parsePublicUrl(value, { allowShort = true } = {}) {
  if (typeof value !== 'string' || value.length > 2048) throw new MusicResolverError('UNSUPPORTED_LINK', '音乐链接无效或过长');
  let url;
  try { url = new URL(value); } catch { throw new MusicResolverError('UNSUPPORTED_LINK', '音乐链接格式无效'); }
  if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.username || url.password || url.port) {
    throw new MusicResolverError('UNSUPPORTED_LINK', '音乐链接包含不安全的地址信息');
  }
  const host = url.hostname.toLowerCase();
  if (!DIRECT_HOSTS.has(host) && !(allowShort && SHORT_HOSTS.has(host))) {
    throw new MusicResolverError('UNSUPPORTED_LINK', '目前仅支持网易云音乐和 QQ 音乐歌曲链接');
  }
  return url;
}

export function parseCanonicalSong(value) {
  const url = parsePublicUrl(value);
  const host = url.hostname.toLowerCase();
  if (host === '163cn.tv') return { provider: 'netease-short', url };
  if (host === 'music.163.com') {
    const pathId = url.pathname.match(/^\/song\/(\d+)\/?$/)?.[1];
    const id = pathId || (url.pathname === '/song' ? url.searchParams.get('id') : '');
    if (!id || !/^\d{1,20}$/.test(id)) throw new MusicResolverError('UNSUPPORTED_LINK', '这不是可识别的网易云单曲链接');
    return { provider: 'netease', id, sourceUrl: url.toString() };
  }
  const pathMid = url.pathname.match(/\/songDetail\/([A-Za-z0-9]{6,32})\/?$/)?.[1];
  const queryMid = host === 'c.y.qq.com' ? url.searchParams.get('songmid') : '';
  const id = pathMid || queryMid;
  if (!id || !/^[A-Za-z0-9]{6,32}$/.test(id)) throw new MusicResolverError('UNSUPPORTED_LINK', '这不是可识别的 QQ 音乐单曲链接');
  return { provider: 'qq', id, sourceUrl: url.toString() };
}

export async function readBoundedJson(response, maxBytes = 512 * 1024) {
  if (!response.ok) throw new MusicResolverError('UPSTREAM_UNAVAILABLE', '音乐平台暂时无法访问', 502);
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new MusicResolverError('UPSTREAM_UNAVAILABLE', '音乐平台返回的数据过大', 502);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > maxBytes) throw new MusicResolverError('UPSTREAM_UNAVAILABLE', '音乐平台返回的数据过大', 502);
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch {
    throw new MusicResolverError('UPSTREAM_UNAVAILABLE', '音乐平台返回了无法识别的数据', 502);
  }
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

