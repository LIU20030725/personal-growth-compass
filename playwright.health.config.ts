import { defineConfig } from "@playwright/test";

const port = Number(process.env.HEALTH_E2E_PORT ?? "4193");
export default defineConfig({
  testDir: "./src/health/e2e",
  testMatch: "revision2083.spec.ts",
  outputDir: "./test-results/health-revision2083",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    channel: "chrome",
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
