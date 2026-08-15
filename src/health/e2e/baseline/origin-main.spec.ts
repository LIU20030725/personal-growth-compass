import { expect, test } from "@playwright/test";
const evidence = "docs/健康模块/UI优化-v03/evidence/revision2083/origin-main";
const viewports = [{ name: "1440", width: 1440, height: 900 }, { name: "1024", width: 1024, height: 768 }, { name: "390", width: 390, height: 844 }];

test("captures origin main with the same realistic local-data starting state", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await page.getByRole("button", { name: "健康状况" }).click();
  const back = () => page.getByRole("button", { name: "返回健康首页" });
  const goHome = async () => { if (await back().count()) await back().click(); };
  await page.getByRole("button", { name: /身体状态/ }).first().click();
  await page.getByLabel("体重（kg）").fill("70.2");
  await page.getByRole("button", { name: "保存身体记录" }).click();
  await back().click();
  await page.getByRole("button", { name: /饮食记录/ }).first().click();
  await page.getByLabel("餐食内容").fill("鸡胸肉、米饭和蔬菜");
  await page.getByRole("button", { name: "保存餐食" }).click();
  await back().click();
  await page.getByRole("button", { name: /日常健康/ }).first().click();
  await page.getByRole("button", { name: "记录 250 ml" }).click();
  await back().click();
  const routes = [
    { name: "home", open: goHome },
    { name: "workout", open: async () => page.getByRole("button", { name: /运动健身/ }).first().click() },
    { name: "meals", open: async () => { await back().click(); await page.getByRole("button", { name: /饮食记录/ }).first().click(); } },
    { name: "daily", open: async () => { await back().click(); await page.getByRole("button", { name: /日常健康/ }).first().click(); } },
    { name: "body", open: async () => { await back().click(); await page.getByRole("button", { name: /身体状态/ }).first().click(); } },
  ];
  for (const size of viewports) {
    await page.setViewportSize({ width: size.width, height: size.height });
    await goHome();
    for (const route of routes) {
      await route.open();
      await expect(page.locator(".health-module")).toBeVisible();
      await page.screenshot({ path: `${evidence}/${size.name}-${route.name}.png` });
    }
  }
});
