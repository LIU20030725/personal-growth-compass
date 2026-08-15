import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'ability-v5-visual-reality.visual.ts',
  outputDir: '../../../test-results/ability-visual-reality',
  reporter: [['list']],
  fullyParallel: false,
  timeout: 90_000,
  retries: 0,
  use: {
    ...devices['Desktop Chrome'],
    channel: 'chrome',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    trace: 'retain-on-failure'
  },
  workers: 1
});
