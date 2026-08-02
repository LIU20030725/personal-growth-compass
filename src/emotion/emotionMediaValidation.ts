import type { EmotionAttachmentKind } from './types';

export const MEDIA_LIMITS = {
  imageBytes: 8 * 1024 * 1024,
  videoBytes: 80 * 1024 * 1024,
  audioBytes: 20 * 1024 * 1024,
  videoDurationMs: 3 * 60 * 1000,
  audioDurationMs: 10 * 60 * 1000
} as const;

interface MediaCandidate {
  kind: EmotionAttachmentKind;
  size: number;
  mimeType: string;
  durationMs: number | null;
  existingCount: number;
  playable: boolean;
}

export function validateMediaCandidate(candidate: MediaCandidate): string | null {
  if (candidate.kind === 'image') {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(candidate.mimeType)) return '图片需为 JPG、PNG 或 WebP';
    if (candidate.size > MEDIA_LIMITS.imageBytes) return '单张图片不能超过 8MB';
    if (candidate.existingCount >= 9) return '最多添加 9 张图片';
    return null;
  }
  if (!candidate.playable) return candidate.kind === 'video'
    ? '当前浏览器无法播放这种视频格式'
    : '当前浏览器无法播放这种语音格式';
  if (candidate.kind === 'video') {
    if (candidate.existingCount >= 1) return '视频最多添加 1 个';
    if (candidate.size > MEDIA_LIMITS.videoBytes) return '视频不能超过 80MB';
    if (candidate.durationMs === null) return '无法读取视频时长，请换一个视频后重试';
    if (candidate.durationMs > MEDIA_LIMITS.videoDurationMs) return '视频时长不能超过 3 分钟';
    return null;
  }
  if (candidate.existingCount >= 1) return '语音最多添加 1 条';
  if (candidate.size > MEDIA_LIMITS.audioBytes) return '语音不能超过 20MB';
  if (candidate.durationMs === null) return '无法读取语音时长，请重新录制';
  if (candidate.durationMs > MEDIA_LIMITS.audioDurationMs) return '语音时长不能超过 10 分钟';
  return null;
}

export function canBrowserPlay(kind: 'video' | 'audio', mimeType: string): boolean {
  if (!mimeType) return false;
  const element = document.createElement(kind);
  return element.canPlayType(mimeType) !== '';
}

export function probeMediaDuration(blob: Blob, kind: 'video' | 'audio'): Promise<number> {
  return new Promise((resolve, reject) => {
    const element = document.createElement(kind);
    const url = URL.createObjectURL(blob);
    const cleanup = () => {
      element.removeAttribute('src');
      element.load();
      URL.revokeObjectURL(url);
    };
    element.preload = 'metadata';
    element.onloadedmetadata = () => {
      const durationMs = Math.round(element.duration * 1000);
      cleanup();
      if (Number.isFinite(durationMs) && durationMs >= 0) resolve(durationMs);
      else reject(new Error(`无法读取${kind === 'video' ? '视频' : '语音'}时长`));
    };
    element.onerror = () => {
      cleanup();
      reject(new Error(`无法读取${kind === 'video' ? '视频' : '语音'}时长`));
    };
    element.src = url;
  });
}
