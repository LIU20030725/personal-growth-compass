import { describe, expect, it } from 'vitest';
import { detectMusicProvider, extractSafeMusicUrl, parseMusicShare } from './emotionMusicLink';

describe('emotion music share link parser', () => {
  it('extracts the first safe http link and rejects dangerous or malformed input', () => {
    expect(extractSafeMusicUrl('分享歌曲 https://music.163.com/song?id=123 复制打开')).toBe('https://music.163.com/song?id=123');
    expect(extractSafeMusicUrl('javascript:alert(1)')).toBe('');
    expect(extractSafeMusicUrl('data:text/html,bad')).toBe('');
    expect(extractSafeMusicUrl('not a url')).toBe('');
  });

  it('detects NetEase, QQ Music and other safe music pages', () => {
    expect(detectMusicProvider('https://music.163.com/song?id=123')).toBe('netease');
    expect(detectMusicProvider('https://y.qq.com/n/ryqq/songDetail/abc')).toBe('qq');
    expect(detectMusicProvider('https://example.com/music/abc')).toBe('other');
  });

  it('recovers title and artist from common share text without requiring them', () => {
    expect(parseMusicShare('分享单曲：晴天 - 周杰伦 https://music.163.com/song?id=186016')).toMatchObject({
      provider: 'netease', title: '晴天', artist: '周杰伦', confidence: 'identified'
    });
    expect(parseMusicShare('QQ音乐《起风了》- 买辣椒也用券 https://y.qq.com/n/ryqq/songDetail/001')).toMatchObject({
      provider: 'qq', title: '起风了', artist: '买辣椒也用券', confidence: 'identified'
    });
  });

  it('uses a platform fallback title when metadata cannot be recovered', () => {
    expect(parseMusicShare('https://music.163.com/song?id=123')).toMatchObject({ title: '网易云音乐收藏', artist: '', confidence: 'link-only' });
    expect(parseMusicShare('https://example.com/music/abc')).toMatchObject({ title: '音乐网页收藏', artist: '', confidence: 'link-only' });
    expect(parseMusicShare('javascript:alert(1)')).toBeNull();
  });
});
