import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function openEmptyAbilityModule(page: Page): Promise<void> {
  await page.goto('/ability', { waitUntil: 'domcontentloaded', timeout: 15_000 });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('region', { name: '能力属性模块' })).toBeVisible();
}

async function createStarterTree(page: Page): Promise<void> {
  await page.getByRole('button', { name: '创建第一棵技能树' }).click();
  await page.getByRole('textbox', { name: '技能树名称' }).fill('自媒体创作');
  await page.getByRole('textbox', { name: '技能说明' }).fill('从内容定位到稳定增长');
  await page.getByRole('button', { name: '保存技能树' }).click();

  await page.getByRole('button', { name: '添加下一阶段' }).click();
  await page.getByRole('textbox', { name: '阶段名称' }).fill('定位与基本功');
  await page.getByRole('button', { name: '保存阶段' }).click();

  await page.getByRole('button', { name: '在 定位与基本功 添加第一个节点' }).click();
  await page.getByRole('textbox', { name: '节点名称' }).fill('内容定位');
  await page.getByRole('button', { name: '保存节点' }).click();
  await expect(page.getByRole('group', { name: '内容定位 可开始', exact: true })).toBeVisible();
}

async function expectPrimaryEdgesReady(page: Page, count: number): Promise<void> {
  const paths = page.locator('.ability-edge-primary .react-flow__edge-path');
  const fitView = page.getByRole('button', { name: 'Fit View' });
  await expect.poll(async () => {
    if (await paths.count() !== count) await fitView.click();
    return paths.count();
  }, { timeout: 10_000 }).toBe(count);
  await expect.poll(async () => paths.evaluateAll((items) => items.every((item) => (item.getAttribute('d') ?? '').length > 0))).toBe(true);
}

test.beforeEach(async ({ page }) => {
  await openEmptyAbilityModule(page);
});

test('同一节点的 3、5 个分支和多层分支共享对齐母线', async ({ page }) => {
  await createStarterTree(page);
  await page.getByRole('group', { name: '内容定位 可开始', exact: true }).click();

  const addChild = page.getByRole('button', { name: '为 内容定位 添加子节点' });
  await addChild.click();
  await addChild.click();
  await addChild.click();

  const children = page.getByRole('group', { name: '新技能 可开始', exact: true });
  await expect(children).toHaveCount(3);
  await page.getByRole('button', { name: 'Fit View' }).click();
  await expectPrimaryEdgesReady(page, 3);

  await children.first().click();
  await page.getByRole('button', { name: '删除分支 新技能' }).click();
  await expect(children).toHaveCount(2);
  await page.getByRole('status').getByRole('button', { name: '撤销' }).click();
  await expect(children).toHaveCount(3);
  const restoredPrimaryDependencies = await page.evaluate(() => {
    const ability = JSON.parse(window.localStorage.getItem('dice-life.ability.v1') ?? '{}') as { dependencies?: Array<{ kind: string }> };
    return ability.dependencies?.filter((edge) => edge.kind === 'primary').length ?? 0;
  });
  expect(restoredPrimaryDependencies).toBe(3);
  await page.getByRole('group', { name: '内容定位 可开始', exact: true }).click();
  await page.getByRole('button', { name: 'Fit View' }).click();
  await expectPrimaryEdgesReady(page, 3);

  const rootBranchPaths = await page.locator('.ability-edge-primary .react-flow__edge-path').evaluateAll((paths) => paths.map((path) => path.getAttribute('d') ?? ''));
  const rootBranchXs = rootBranchPaths.flatMap((path) => [...path.matchAll(/Q ([\d.]+) /g)].map((match) => match[1]));
  expect(new Set(rootBranchXs).size).toBe(1);

  const viewport = page.locator('.react-flow__viewport');
  const beforeZoom = await viewport.getAttribute('style');
  await page.getByRole('button', { name: 'Zoom Out' }).click();
  await expect.poll(() => viewport.getAttribute('style')).not.toBe(beforeZoom);

  await page.getByRole('button', { name: 'Fit View' }).click();
  const canvas = page.getByRole('group', { name: '自媒体创作交互画布', exact: true });
  await expect(canvas).toHaveScreenshot('aligned-3-branches.png', { animations: 'disabled', maxDiffPixels: 100 });

  await page.getByRole('group', { name: '内容定位 可开始', exact: true }).click();
  await addChild.click();
  await addChild.click();
  await expect(children).toHaveCount(5);
  await page.getByRole('button', { name: 'Fit View' }).click();
  await expectPrimaryEdgesReady(page, 5);
  await expect(canvas).toHaveScreenshot('aligned-5-branches.png', { animations: 'disabled', maxDiffPixels: 100 });

  await children.first().dblclick();
  const rename = page.getByRole('textbox', { name: '编辑节点名称' });
  await rename.fill('手动拖拽分支');
  await rename.press('Enter');
  const movedChild = page.getByRole('group', { name: '手动拖拽分支 可开始', exact: true });
  await movedChild.click();
  const addGrandchild = page.getByRole('button', { name: '为 手动拖拽分支 添加子节点' });
  await addGrandchild.click();
  await addGrandchild.click();
  await expect(children).toHaveCount(6);
  await page.getByRole('button', { name: 'Fit View' }).click();
  await expectPrimaryEdgesReady(page, 7);
  await expect(canvas).toHaveScreenshot('aligned-multi-level.png', { animations: 'disabled', maxDiffPixels: 100 });
});

test('阶段拖拽吸附网格，刷新后保持，并可复位和撤销', async ({ page }) => {
  await createStarterTree(page);
  const phase = page.getByRole('group', { name: '阶段 定位与基本功' });
  const box = await phase.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move((box?.x ?? 0) + 40, (box?.y ?? 0) + 30);
  await page.mouse.down();
  await page.mouse.move((box?.x ?? 0) + 91, (box?.y ?? 0) + 73, { steps: 6 });
  await page.mouse.up();

  const saved = await page.evaluate(() => {
    const ability = JSON.parse(window.localStorage.getItem('dice-life.ability.v1') ?? '{}') as { lastVisitedTreeId: string };
    const canvasStore = JSON.parse(window.localStorage.getItem('dice-life.ability-canvas.v1') ?? '{}') as { trees: Record<string, { phasePositions: Record<string, { x: number; y: number }> }> };
    return canvasStore.trees[ability.lastVisitedTreeId].phasePositions;
  });
  expect(Object.keys(saved)).toHaveLength(1);
  const savedPosition = Object.values(saved)[0] as { x: number; y: number };
  expect(Math.abs(savedPosition.x % 16)).toBe(0);
  expect(Math.abs(savedPosition.y % 16)).toBe(0);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('region', { name: '能力属性模块' })).toBeVisible();
  const persisted = await page.evaluate(() => {
    const ability = JSON.parse(window.localStorage.getItem('dice-life.ability.v1') ?? '{}') as { lastVisitedTreeId: string };
    const canvasStore = JSON.parse(window.localStorage.getItem('dice-life.ability-canvas.v1') ?? '{}') as { trees: Record<string, { phasePositions: Record<string, { x: number; y: number }> }> };
    return canvasStore.trees[ability.lastVisitedTreeId].phasePositions;
  });
  expect(persisted).toEqual(saved);

  await page.getByRole('button', { name: '重新自动布局' }).click();
  const phasePositionsAfterReset = await page.evaluate(() => {
    const ability = JSON.parse(window.localStorage.getItem('dice-life.ability.v1') ?? '{}') as { lastVisitedTreeId: string };
    const canvasStore = JSON.parse(window.localStorage.getItem('dice-life.ability-canvas.v1') ?? '{}') as { trees: Record<string, { phasePositions: Record<string, { x: number; y: number }> }> };
    return canvasStore.trees[ability.lastVisitedTreeId].phasePositions;
  });
  expect(phasePositionsAfterReset).toEqual({});

  await page.getByRole('button', { name: '撤销' }).click();
  const restored = await page.evaluate(() => {
    const ability = JSON.parse(window.localStorage.getItem('dice-life.ability.v1') ?? '{}') as { lastVisitedTreeId: string };
    const canvasStore = JSON.parse(window.localStorage.getItem('dice-life.ability-canvas.v1') ?? '{}') as { trees: Record<string, { phasePositions: Record<string, { x: number; y: number }> }> };
    return canvasStore.trees[ability.lastVisitedTreeId].phasePositions;
  });
  expect(restored).toEqual(saved);
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
  await createStarterTree(page);

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
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('region', { name: '能力属性模块' })).toBeVisible();

  const route = page.getByRole('region', { name: '自媒体创作线性技能路线' });
  await expect(route).toBeVisible();
  await expect(route.getByTestId('linear-skill-node')).toHaveCount(40);
  const openingNode = route.getByRole('button', { name: /移动端技能 40.*可开始/ });
  await openingNode.click();
  const detail = page.getByRole('complementary', { name: '技能节点详情' });
  await expect(detail.getByRole('heading', { name: '移动端技能 40' })).toBeVisible();
  const undersizedTargets = await detail.locator('button, a, input, select, textarea').evaluateAll((elements) => elements
    .filter((element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.visibility !== 'hidden' && style.display !== 'none' && (box.width < 44 || box.height < 44);
    })
    .map((element) => ({ label: element.getAttribute('aria-label') ?? element.textContent?.trim(), width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })));
  expect(undersizedTargets).toEqual([]);
  await detail.getByRole('button', { name: '关闭技能详情' }).click();
  await expect(openingNode).toBeFocused();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('阶段列与节点资源在浏览和线性视图间保持同一份数据', async ({ page }) => {
  await createStarterTree(page);
  await expect(page.getByRole('group', { name: '阶段 定位与基本功' })).toBeVisible();
  const node = page.getByRole('group', { name: '内容定位 可开始', exact: true });
  await node.click();
  const detail = page.getByRole('complementary', { name: '技能节点详情' });
  await detail.getByRole('button', { name: '收藏资源' }).click();
  await detail.getByRole('textbox', { name: '资源链接' }).fill('https://example.com/content-guide');
  await detail.getByRole('textbox', { name: '资源标题' }).fill('内容定位指南');
  await detail.getByRole('button', { name: '保存资源' }).click();
  await expect(detail.getByRole('link', { name: '内容定位指南' })).toBeVisible();

  await detail.getByRole('button', { name: '关闭技能详情' }).click();
  await expect(detail).toBeHidden();
  await node.click();
  await expect(detail).toBeVisible();
  await page.locator('.react-flow__pane').click({ position: { x: 12, y: 12 } });
  await expect(detail).toBeHidden();
  await page.getByRole('button', { name: '切换到线性路线' }).click();
  await expect(page.getByTestId('ability-linear-route')).toBeVisible();
  const persistedResources = await page.evaluate(() => JSON.parse(window.localStorage.getItem('dice-life.ability.v1') ?? '{}').resources);
  expect(persistedResources).toHaveLength(1);
  expect(persistedResources[0].title).toBe('内容定位指南');
});

test('下一步显示候选数并轮换打开并行节点详情', async ({ page }) => {
  await createStarterTree(page);
  const root = page.getByRole('group', { name: '内容定位 可开始', exact: true });
  await root.click();
  const addChild = page.getByRole('button', { name: '为 内容定位 添加子节点' });
  await addChild.click();
  await addChild.click();
  await addChild.click();
  await page.evaluate(() => {
    const key = 'dice-life.ability.v1';
    const state = JSON.parse(window.localStorage.getItem(key) ?? '{}') as { nodes: Array<{ name: string; progress: string; createdAt: string }> };
    const rootNode = state.nodes.find((node) => node.name === '内容定位');
    if (rootNode) rootNode.progress = 'mastered';
    const candidates = state.nodes.filter((node) => node.name === '新技能').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    candidates.forEach((node, index) => { node.name = `候选${String.fromCharCode(65 + index)}`; });
    window.localStorage.setItem(key, JSON.stringify(state));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });

  const next = page.getByRole('button', { name: '下一步 · 3' });
  await expect(next).toBeVisible();
  await next.click();
  const detail = page.getByRole('complementary', { name: '技能节点详情' });
  await expect(detail.getByRole('heading', { name: '候选A' })).toBeVisible();
  await detail.getByRole('button', { name: '关闭技能详情' }).click();
  await next.click();
  await expect(detail.getByRole('heading', { name: '候选B' })).toBeVisible();
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
