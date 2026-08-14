import { defineConfig, devices } from '@playwright/test';

const e2ePort = Number(process.env.ABILITY_E2E_PORT ?? '4187');
const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: './src/ability/e2e',
  outputDir: './test-results/ability',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/ability', open: 'never' }]],
  use: {
    baseURL: e2eBaseUrl,
    channel: 'chrome',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [{ name: 'desktop-chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${e2ePort} --strictPort`,
    url: `${e2eBaseUrl}/ability`,
    reuseExistingServer: false,
    timeout: 120_000
  }
});
