import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./src/health/e2e/baseline",
  fullyParallel: false,
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:4194", channel: "chrome", locale: "zh-CN", timezoneId: "Asia/Shanghai", viewport: { width: 1440, height: 900 } },
});
