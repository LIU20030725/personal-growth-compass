import { describe, expect, it } from 'vitest';
import { inferResourceType, normalizeResourceUrl, resourceDomain } from './abilityResources';

describe('ability learning resources', () => {
  it('normalizes safe URL details without stripping business query parameters', () => {
    expect(normalizeResourceUrl('HTTPS://Example.COM/guide/?chapter=2&utm_source=feed#intro'))
      .toBe('https://example.com/guide?chapter=2');
    expect(resourceDomain('https://www.bilibili.com/video/BV1')).toBe('bilibili.com');
  });

  it('rejects non-web protocols and infers obvious video resources', () => {
    expect(() => normalizeResourceUrl('file:///tmp/guide.pdf')).toThrow('仅支持 HTTP / HTTPS 链接');
    expect(() => normalizeResourceUrl('javascript:alert(1)')).toThrow('仅支持 HTTP / HTTPS 链接');
    expect(() => normalizeResourceUrl('data:text/html,hello')).toThrow('仅支持 HTTP / HTTPS 链接');
    expect(() => normalizeResourceUrl('not a url')).toThrow('请输入有效的学习资源链接');
    expect(inferResourceType('https://www.youtube.com/watch?v=1')).toBe('video');
    expect(inferResourceType('https://example.com/guide')).toBe('article');
  });
});
