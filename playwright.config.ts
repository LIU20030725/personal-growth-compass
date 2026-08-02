import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/ability/e2e',
  outputDir: './test-results/ability',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/ability', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4187',
    channel: 'chrome',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [{ name: 'desktop-chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4187 --strictPort',
    url: 'http://127.0.0.1:4187/ability',
    reuseExistingServer: false,
    timeout: 120_000
  }
});
