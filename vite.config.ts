import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { emotionMusicResolverPlugin } from './server/music/vitePlugin.mjs';

export default defineConfig({
  plugins: [react(), emotionMusicResolverPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    watch: {
      ignored: [
        '**/canvas/**',
        '**/docs/docs_bak/**',
        '**/exports/**',
        '**/habitica/**',
        '**/历史版本/**',
        '**/资料/**'
      ]
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    globals: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.worktrees/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/canvas/**',
      '**/docs/docs_bak/**',
      '**/exports/**',
      '**/habitica/**',
      '**/历史版本/**',
      '**/资料/**'
    ]
  }
});
