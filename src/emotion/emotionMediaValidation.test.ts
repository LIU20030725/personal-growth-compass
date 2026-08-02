import { describe, expect, it } from 'vitest';
import { validateMediaCandidate } from './emotionMediaValidation';

describe('validateMediaCandidate', () => {
  it('拒绝浏览器不能播放的视频格式', () => {
    expect(validateMediaCandidate({
      kind: 'video', size: 1024, mimeType: 'video/x-unknown', durationMs: 30_000, existingCount: 0, playable: false
    })).toBe('当前浏览器无法播放这种视频格式');
  });

  it('拒绝超过 3 分钟的视频', () => {
    expect(validateMediaCandidate({
      kind: 'video', size: 1024, mimeType: 'video/mp4', durationMs: 180_001, existingCount: 0, playable: true
    })).toBe('视频时长不能超过 3 分钟');
  });

  it('拒绝超过 10 分钟的语音并接受边界内媒体', () => {
    expect(validateMediaCandidate({
      kind: 'audio', size: 1024, mimeType: 'audio/webm', durationMs: 600_001, existingCount: 0, playable: true
    })).toBe('语音时长不能超过 10 分钟');
    expect(validateMediaCandidate({
      kind: 'video', size: 1024, mimeType: 'video/mp4', durationMs: 180_000, existingCount: 0, playable: true
    })).toBeNull();
  });
});

