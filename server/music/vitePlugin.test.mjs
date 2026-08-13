import { describe, expect, it } from 'vitest';
import { emotionMusicResolverPlugin } from './vitePlugin.mjs';

describe('music resolver Vite plugin', () => {
  it('mounts the same API middleware in development and production preview', () => {
    const plugin = emotionMusicResolverPlugin();
    expect(plugin.configureServer).toBeTypeOf('function');
    expect(plugin.configurePreviewServer).toBeTypeOf('function');
  });
});
