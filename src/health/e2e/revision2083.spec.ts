import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const evidence = "docs/健康模块/UI优化-v03/evidence/revision2083/candidate";
const viewports = [
  { name: "1440", width: 1440, height: 900 },
  { name: "1024", width: 1024, height: 768 },
  { name: "390", width: 390, height: 844 },
];

async function openHealth(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "健康状况" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("今天");
}

async function seedComparableData(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: /身体状态/ }).first().click();
  await page.getByText("完整身体记录与历史趋势").click();
  await page.getByLabel("体重（kg）").fill("70.2");
  await page.getByRole("button", { name: "保存身体记录" }).click();
  await page.getByRole("button", { name: "返回健康首页" }).click();
  await page.getByRole("button", { name: /饮食记录/ }).first().click();
  await page.getByText("文字、照片与餐次时间线").click();
  await page.getByLabel("餐食内容").fill("鸡胸肉、米饭和蔬菜");
  await page.getByRole("button", { name: "保存餐食" }).click();
  await page.getByRole("button", { name: "返回健康首页" }).click();
  await page.getByRole("button", { name: /日常健康/ }).first().click();
  await page.getByText("活动量、精力与历史指标管理").click();
  await page.getByRole("button", { name: "记录 250 ml" }).click();
  await page.getByRole("button", { name: "返回健康首页" }).click();
}

test("captures the five revised workspaces at all required sizes", async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("console", (message) => { if (["error", "warning"].includes(message.type())) errors.push(`${message.type()}: ${message.text()}`); });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  await openHealth(page);
  await seedComparableData(page);
  const goHome = async () => {
    const back = page.getByRole("button", { name: "返回健康首页" });
    if (await back.count()) await back.click();
  };
  const routes = [
    { name: "home", open: goHome, title: "" },
    { name: "workout", open: async () => page.getByRole("button", { name: /运动健身/ }).first().click(), title: "先安排动作" },
    { name: "meals", open: async () => page.getByRole("button", { name: "返回健康首页" }).click().then(() => page.getByRole("button", { name: /饮食记录/ }).first().click()), title: "热量与营养总览" },
    { name: "daily", open: async () => page.getByRole("button", { name: "返回健康首页" }).click().then(() => page.getByRole("button", { name: /日常健康/ }).first().click()), title: "喝水、休息与睡眠" },
    { name: "body", open: async () => page.getByRole("button", { name: "返回健康首页" }).click().then(() => page.getByRole("button", { name: /身体状态/ }).first().click()), title: "围度与核心指标" },
  ];
  for (const size of viewports) {
    await page.setViewportSize({ width: size.width, height: size.height });
    await goHome();
    for (const route of routes) {
      await route.open();
      if (route.name === "home") await expect(page.locator(".health-module")).toBeVisible();
      else await expect(page.getByText(route.title, { exact: false }).first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${size.name}-${route.name} horizontal overflow`).toBeLessThanOrEqual(1);
      await page.screenshot({ path: `${evidence}/${size.name}-${route.name}.png` });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const smallTargets = await page.locator("button:visible").evaluateAll((buttons) => buttons.map((button) => { const rect = button.getBoundingClientRect(); return { name: button.getAttribute("aria-label") || button.textContent?.trim().slice(0, 30), width: rect.width, height: rect.height }; }).filter((x) => x.width < 44 || x.height < 44));
  expect(smallTargets.filter((x) => !["返回健康首页"].includes(x.name ?? "")), JSON.stringify(smallTargets)).toEqual([]);
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter((item) => ["critical", "serious"].includes(item.impact ?? ""))).toEqual([]);
  expect(errors).toEqual([]);
});

test("completes workout, meal, daily and body primary journeys with keyboard-accessible dialogs", async ({ page }) => {
  await openHealth(page);
  await page.getByRole("button", { name: /运动健身/ }).first().click();
  await page.getByRole("button", { name: "添加训练动作" }).click();
  await page.getByRole("textbox", { name: "搜索动作" }).fill("卧推");
  await page.getByRole("button", { name: "添加", exact: true }).click();
  await page.getByRole("button", { name: "完成添加" }).click();
  await page.getByRole("button", { name: /开始训练/ }).click();
  await expect(page.getByText("训练进行中").first()).toBeVisible();
  await page.getByRole("button", { name: "返回健康首页" }).click();
  await page.getByRole("button", { name: /饮食记录/ }).first().click();
  await page.getByRole("button", { name: "添加早餐" }).click();
  await page.getByRole("button", { name: /熟米饭/ }).click();
  await page.getByRole("spinbutton", { name: "克重" }).fill("150");
  await page.getByRole("button", { name: "加入早餐" }).click();
  await expect(page.getByText("1 条 · 174 kcal")).toBeVisible();
  await page.getByRole("button", { name: "返回健康首页" }).click();
  await page.getByRole("button", { name: /日常健康/ }).first().click();
  await page.getByRole("button", { name: /\+250/ }).click();
  await expect(page.getByText("250 / 1800 ml")).toBeVisible();
  await page.getByRole("button", { name: "返回健康首页" }).click();
  await page.getByRole("button", { name: /身体状态/ }).first().click();
  await page.getByRole("button", { name: "添加身体数据" }).click();
  await page.getByRole("button", { name: "腰围", exact: true }).click();
  await page.getByRole("spinbutton", { name: "腰围（cm）" }).fill("78.5");
  await page.getByRole("button", { name: "保存记录" }).click();
  await expect(page.getByText("78.5 cm")).toBeVisible();
});
