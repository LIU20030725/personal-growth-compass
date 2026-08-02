import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function openEmptyAbilityModule(page: Page): Promise<void> {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/ability', { waitUntil: 'domcontentloaded', timeout: 15_000 });
  await expect(page.getByRole('region', { name: '能力属性模块' })).toBeVisible();
}

async function createStarterTree(page: Page): Promise<void> {
  await page.getByRole('button', { name: '创建第一棵技能树' }).click();
  await page.getByRole('textbox', { name: '技能树名称' }).fill('自媒体创作');
  await page.getByRole('textbox', { name: '技能说明' }).fill('从内容定位到稳定增长');
  await page.getByRole('button', { name: '保存技能树' }).click();

  await page.getByRole('button', { name: '添加阶段' }).click();
  await page.getByRole('textbox', { name: '阶段名称' }).fill('定位与基本功');
  await page.getByRole('button', { name: '保存阶段' }).click();

  await page.getByRole('button', { name: '添加技能节点' }).click();
  await page.getByRole('textbox', { name: '节点名称' }).fill('内容定位');
  await page.getByRole('button', { name: '保存节点' }).click();
  await expect(page.getByRole('group', { name: '内容定位 可开始', exact: true })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await openEmptyAbilityModule(page);
});

test('同一节点可连续创建并行分支，并支持删除撤回与缩放', async ({ page }) => {
  await createStarterTree(page);
  await page.getByRole('group', { name: '内容定位 可开始', exact: true }).click();

  const addChild = page.getByRole('button', { name: '为 内容定位 添加子节点' });
  await addChild.click();
  await addChild.click();
  await addChild.click();

  const children = page.getByRole('group', { name: '新技能 可开始', exact: true });
  await expect(children).toHaveCount(3);
  await expect(page.locator('.react-flow__edge')).toHaveCount(3);

  await children.first().click();
  await page.getByRole('button', { name: '删除分支 新技能' }).click();
  await expect(children).toHaveCount(2);
  await page.getByRole('status').getByRole('button', { name: '撤销' }).click();
  await expect(children).toHaveCount(3);
  await expect(page.locator('.react-flow__edge')).toHaveCount(3);

  const viewport = page.locator('.react-flow__viewport');
  const beforeZoom = await viewport.getAttribute('style');
  await page.getByRole('button', { name: 'Zoom Out' }).click();
  await expect.poll(() => viewport.getAttribute('style')).not.toBe(beforeZoom);

  await page.getByRole('button', { name: 'Fit View' }).click();
  await expect(page.getByRole('group', { name: '自媒体创作交互画布', exact: true })).toHaveScreenshot('parallel-branches.png', {
    animations: 'disabled'
  });
});

test('键盘快捷键只在画布聚焦时生效，弹窗会困住并恢复焦点', async ({ page }) => {
  await createStarterTree(page);
  const node = page.getByRole('group', { name: '内容定位 可开始', exact: true });
  const createTree = page.getByRole('button', { name: '新建技能树' }).first();

  await createTree.focus();
  await page.keyboard.press('Delete');
  await page.keyboard.press('Tab');
  await expect(node).toHaveCount(1);

  const canvas = page.getByRole('group', { name: '自媒体创作交互画布', exact: true });
  await node.click();
  await canvas.focus();
  await page.keyboard.press('Control+Enter');
  await expect(page.getByRole('group', { name: '新技能 可开始', exact: true })).toHaveCount(1);

  await createTree.click();
  const dialog = page.getByRole('dialog', { name: '创建技能树' });
  await expect(dialog.getByRole('textbox', { name: '技能树名称' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(createTree).toBeFocused();
});

test('390px 手机视口默认提供可操作的线性技能路线', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '创建第一棵技能树' }).click();
  await page.getByRole('textbox', { name: '技能树名称' }).fill('移动学习');
  await page.getByRole('button', { name: '保存技能树' }).click();
  await page.getByRole('button', { name: '添加阶段' }).click();
  await page.getByRole('textbox', { name: '阶段名称' }).fill('基础阶段');
  await page.getByRole('button', { name: '保存阶段' }).click();
  await page.getByRole('button', { name: '添加技能节点' }).click();
  await page.getByRole('textbox', { name: '节点名称' }).fill('移动端可读节点');
  await page.getByRole('button', { name: '保存节点' }).click();

  await page.evaluate(() => {
    const key = 'dice-life.ability.v1';
    const state = JSON.parse(window.localStorage.getItem(key) ?? '{}') as { nodes: Array<Record<string, unknown>> };
    const template = state.nodes[0];
    for (let index = 2; index <= 40; index += 1) {
      state.nodes.push({
        ...template,
        id: `mobile-node-${index}`,
        name: `移动端技能 ${index}`,
        createdAt: `2026-08-02T00:00:${String(index).padStart(2, '0')}.000Z`,
        updatedAt: `2026-08-02T00:00:${String(index).padStart(2, '0')}.000Z`
      });
    }
    window.localStorage.setItem(key, JSON.stringify(state));
  });
  await page.getByRole('button', { name: /财富状况/ }).click();
  await page.getByRole('button', { name: /能力属性/ }).click();
  await expect(page.getByRole('region', { name: '能力属性模块' })).toBeVisible();

  const route = page.getByRole('region', { name: '移动学习线性技能路线' });
  await expect(route).toBeVisible();
  await expect(route.getByRole('button')).toHaveCount(40);
  await route.getByRole('button', { name: /移动端技能 40.*可开始/ }).click();
  await expect(page.getByRole('complementary', { name: '技能节点详情' }).getByRole('heading', { name: '移动端技能 40' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('@a11y 能力模块没有 critical/serious 级自动可访问性问题', async ({ page }, testInfo) => {
  await createStarterTree(page);
  const moduleResults = await new AxeBuilder({ page })
    .include('[aria-label="能力属性模块"]')
    .analyze();

  await testInfo.attach('axe-module-results', {
    body: JSON.stringify(moduleResults, null, 2),
    contentType: 'application/json'
  });

  await page.getByRole('button', { name: '新建技能树' }).first().click();
  const dialogResults = await new AxeBuilder({ page }).analyze();
  await testInfo.attach('axe-dialog-results', {
    body: JSON.stringify(dialogResults, null, 2),
    contentType: 'application/json'
  });

  const violations = [...moduleResults.violations, ...dialogResults.violations];
  const releaseBlocking = violations.filter((violation) => violation.impact === 'critical' || violation.impact === 'serious');
  expect(releaseBlocking, violations.map((item) => `${item.impact}: ${item.id}`).join('\n')).toEqual([]);
});
