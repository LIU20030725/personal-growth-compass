import type { ResourceType } from './types';

const TRACKING_PARAMETERS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid'
]);

function webUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('请输入有效的学习资源链接');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('仅支持 HTTP / HTTPS 链接');
  }
  return url;
}

export function normalizeResourceUrl(value: string): string {
  const url = webUrl(value);
  url.hostname = url.hostname.toLowerCase();
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMETERS.has(key.toLowerCase())) url.searchParams.delete(key);
  }
  if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString().replace(/\/$/, '');
}

export function resourceDomain(value: string): string {
  return webUrl(value).hostname.toLowerCase().replace(/^www\./, '');
}

export function inferResourceType(value: string): ResourceType {
  const url = webUrl(value);
  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();
  if (/youtube|youtu\.be|bilibili|vimeo|douyin/.test(host)) return 'video';
  if (/\.pdf$|docs?\.|notion|feishu|yuque/.test(`${host}${path}`)) return 'document';
  if (/course|learn|class|academy/.test(`${host}${path}`)) return 'course';
  if (/github|gitlab|tool/.test(`${host}${path}`)) return 'tool';
  return 'article';
}
