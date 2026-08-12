import type { EmotionMusicProvider } from './types';
import { isSafeHttpUrl } from './emotionSafety';

export interface ParsedMusicShare {
  sourceUrl: string;
  provider: EmotionMusicProvider;
  title: string;
  artist: string;
  confidence: 'identified' | 'link-only';
}

const trailingSharePunctuation = /[，。！？；：、）】》〉」』”’.,!?;:)\]}]+$/;

export function extractSafeMusicUrl(input: string) {
  const candidates = input.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
  for (const candidate of candidates) {
    const normalized = candidate.replace(trailingSharePunctuation, '');
    if (isSafeHttpUrl(normalized)) return normalized;
  }
  const trimmed = input.trim();
  return isSafeHttpUrl(trimmed) ? trimmed : '';
}

export function detectMusicProvider(sourceUrl: string): EmotionMusicProvider {
  try {
    const hostname = new URL(sourceUrl).hostname.toLowerCase();
    if (hostname === 'music.163.com' || hostname.endsWith('.music.163.com') || hostname === '163cn.tv') return 'netease';
    if (hostname === 'y.qq.com' || hostname.endsWith('.y.qq.com') || hostname === 'c.y.qq.com') return 'qq';
  } catch {
    return 'other';
  }
  return 'other';
}

function cleanMetadata(value: string) {
  return value.trim().replace(/^[《「『“‘]|[》」』”’]$/g, '').trim();
}

function parseMetadata(input: string, sourceUrl: string) {
  const text = input.replace(sourceUrl, ' ').replace(/\s+/g, ' ').trim();
  const bracketed = text.match(/[《「『“](.+?)[》」』”]\s*[-—–·]\s*(.+)$/);
  if (bracketed) return { title: cleanMetadata(bracketed[1]), artist: cleanMetadata(bracketed[2]) };
  const prefixed = text.replace(/^(?:分享单曲|分享歌曲|QQ音乐|网易云音乐)\s*[：:]?\s*/i, '');
  const separated = prefixed.match(/^(.+?)\s+[-—–]\s+(.+)$/);
  if (separated) return { title: cleanMetadata(separated[1]), artist: cleanMetadata(separated[2]) };
  return { title: '', artist: '' };
}

export function parseMusicShare(input: string): ParsedMusicShare | null {
  const sourceUrl = extractSafeMusicUrl(input);
  if (!sourceUrl) return null;
  const provider = detectMusicProvider(sourceUrl);
  const metadata = parseMetadata(input, sourceUrl);
  const fallbackTitle = provider === 'netease' ? '网易云音乐收藏' : provider === 'qq' ? 'QQ 音乐收藏' : '音乐网页收藏';
  return {
    sourceUrl,
    provider,
    title: metadata.title || fallbackTitle,
    artist: metadata.artist,
    confidence: metadata.title ? 'identified' : 'link-only'
  };
}
