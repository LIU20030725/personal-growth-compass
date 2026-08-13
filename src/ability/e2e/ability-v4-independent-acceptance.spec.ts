import { expect, test, type Page } from '@playwright/test';

const STORAGE_KEY = 'dice-life.ability.v1';
const CANVAS_KEY = 'dice-life.ability-canvas.v1';
const EVIDENCE = 'src/ability/docs/evidence/2026-08-14-v4-independent-acceptance/screenshots';
const stamp = '2026-08-14T00:00:00.000Z';

type BrowserProblem = { kind: 'console' | 'pageerror' | 'requestfailed'; text: string };

function watchProblems(page: Page): BrowserProblem[] {
  const problems: BrowserProblem[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') problems.push({ kind: 'console', text: `${message.type()}: ${message.text()}` });
  });
  page.on('pageerror', (error) => problems.push({ kind: 'pageerror', text: error.message }));
  page.on('requestfailed', (request) => problems.push({ kind: 'requestfailed', text: `${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}` }));
  return problems;
}

async function seed(page: Page, state: unknown, canvas?: unknown): Promise<void> {
  await page.goto('/ability', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ stateValue, canvasValue }) => {
    window.localStorage.clear();
    window.localStorage.setItem('dice-life.ability.v1', JSON.stringify(stateValue));
    if (canvasValue) window.localStorage.setItem('dice-life.ability-canvas.v1', JSON.stringify(canvasValue));
  }, { stateValue: state, canvasValue: canvas });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('region', { name: '能力属性模块' })).toBeVisible();
}

function v2HistoricalState() {
  return {
    schemaVersion: 2,
    trees: [{ id: 'history-tree', name: '历史能力路线', description: 'V2 往返兼容', role: 'main', status: 'active', focusedRank: 1, createdAt: stamp, updatedAt: stamp }],
    phases: [
      { id: 'history-base', skillTreeId: 'history-tree', name: '基础阶段', description: '', estimatedDuration: '2 周', requiredNodePolicy: 'all_required', order: 0 },
      { id: 'history-practice', skillTreeId: 'history-tree', name: '实践阶段', description: '', estimatedDuration: '4 周', requiredNodePolicy: 'all_required', order: 1 }
    ],
    nodes: [
      { id: 'history-root', skillTreeId: 'history-tree', phaseId: 'history-base', name: '旧版基础', description: '', progress: 'mastered', requiredForPhase: true, masteryNote: '旧掌握说明', archivedAt: null, createdAt: stamp, updatedAt: stamp },
      { id: 'history-a', skillTreeId: 'history-tree', phaseId: 'history-practice', name: '候选甲', description: '', progress: 'in_progress', requiredForPhase: true, masteryNote: '', archivedAt: null, createdAt: `${stamp}-01`, updatedAt: stamp },
      { id: 'history-b', skillTreeId: 'history-tree', phaseId: 'history-practice', name: '候选乙', description: '', progress: 'available', requiredForPhase: false, masteryNote: '', archivedAt: null, createdAt: `${stamp}-02`, updatedAt: stamp }
    ],
    dependencies: [
      { id: 'history-edge-a', skillTreeId: 'history-tree', prerequisiteNodeId: 'history-root', dependentNodeId: 'history-a', kind: 'primary' },
      { id: 'history-edge-b', skillTreeId: 'history-tree', prerequisiteNodeId: 'history-root', dependentNodeId: 'history-b', kind: 'primary' }
    ],
    parallelGroups: [{ id: 'history-parallel', skillTreeId: 'history-tree', phaseId: 'history-practice', name: '并行候选', nodeIds: ['history-a', 'history-b'], parentNodeId: 'history-root' }],
    masteryCriteria: [{ id: 'history-criterion', skillNodeId: 'history-a', description: '完成历史项目', satisfied: false, source: 'manual' }],
    taskLinks: [{ id: 'history-task', skillNodeId: 'history-root', taskId: 'legacy-task' }],
    outcomes: [{ id: 'history-outcome', skillTreeId: 'history-tree', skillNodeId: 'history-root', title: '旧成果', description: '', occurredOn: '2026-08-01', showOnTree: true, createdAt: stamp, updatedAt: stamp }],
    resources: [{ id: 'history-resource', url: 'https://example.com/history', normalizedUrl: 'https://example.com/history', title: '历史资料', type: 'article', sourceDomain: 'example.com', note: '', source: 'manual', createdAt: stamp, updatedAt: stamp }],
    resourceLinks: [{ id: 'history-resource-link', skillNodeId: 'history-root', resourceId: 'history-resource', createdAt: stamp }],
    lastVisitedTreeId: 'history-tree'
  };
}

function pressureState() {
  const phases = Array.from({ length: 20 }, (_, index) => ({
    id: `phase-${index}`,
    skillTreeId: 'pressure-tree',
    name: `阶段 ${index + 1}`,
    description: '',
    estimatedDuration: '1 周',
    requiredNodePolicy: 'all_required',
    order: index
  }));
  const nodes = Array.from({ length: 200 }, (_, index) => ({
    id: `node-${index}`,
    skillTreeId: 'pressure-tree',
    phaseId: `phase-${Math.floor(index / 10)}`,
    name: `压力节点 ${index + 1}`,
    description: '',
    progress: index === 0 ? 'in_progress' : 'available',
    requiredForPhase: true,
    masteryNote: '',
    archivedAt: null,
    createdAt: `${stamp}-${String(index).padStart(3, '0')}`,
    updatedAt: stamp
  }));
  const dependencies = Array.from({ length: 20 }, (_, phaseIndex) => Array.from({ length: 9 }, (_, offset) => {
    const index = phaseIndex * 10 + offset;
    return { id: `edge-${index}`, skillTreeId: 'pressure-tree', prerequisiteNodeId: `node-${index}`, dependentNodeId: `node-${index + 1}`, kind: 'primary' };
  })).flat();
  return {
    schemaVersion: 2,
    trees: [{ id: 'pressure-tree', name: '200 节点压力路线', description: '20 阶段性能验收', role: 'main', status: 'active', focusedRank: 1, createdAt: stamp, updatedAt: stamp }],
    phases, nodes, dependencies,
    parallelGroups: [], masteryCriteria: [], taskLinks: [], outcomes: [], resources: [], resourceLinks: [],
    lastVisitedTreeId: 'pressure-tree'
  };
}

test('V2 历史数据、缺失阶段坐标、下一步轮换和焦点回归保持兼容', async ({ page }) => {
  const problems = watchProblems(page);
  const historical = v2HistoricalState();
  const legacyCanvasPreferences = {
    trees: {
      'history-tree': {
        positions: { 'history-root': { x: 96, y: 144 } },
        collapsedNodeIds: [],
        viewport: { x: 0, y: 0, zoom: 1 }
      }
    }
  };
  await seed(page, historical, legacyCanvasPreferences);

  await expect(page.getByRole('button', { name: '下一步 · 2' })).toBeVisible();
  await page.getByRole('button', { name: '下一步 · 2' }).click();
  const detail = page.getByRole('complementary', { name: '技能节点详情' });
  await expect(detail.getByRole('heading', { name: '候选甲' })).toBeVisible();
  const openingNode = page.getByRole('group', { name: '候选甲 成长中', exact: true });
  await detail.getByRole('button', { name: '关闭技能详情' }).click();
  await expect(openingNode).toBeFocused();
  await page.getByRole('button', { name: '下一步 · 2' }).click();
  await expect(detail.getByRole('heading', { name: '候选乙' })).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  const roundTrip = await page.evaluate(({ abilityKey, canvasKey }) => ({
    ability: JSON.parse(window.localStorage.getItem(abilityKey) ?? '{}'),
    canvas: JSON.parse(window.localStorage.getItem(canvasKey) ?? '{}')
  }), { abilityKey: STORAGE_KEY, canvasKey: CANVAS_KEY });
  expect(roundTrip.ability).toEqual(historical);
  expect(roundTrip.canvas.trees['history-tree'].phasePositions ?? {}).toEqual({});
  expect(roundTrip.ability.taskLinks).toEqual(historical.taskLinks);
  expect(roundTrip.ability.nodes[0].masteryNote).toBe('旧掌握说明');
  expect(problems).toEqual([]);
});

test('重新生成三档 V4 验收截图并核对溢出、详情与移动路线', async ({ page }) => {
  const problems = watchProblems(page);
  const historical = v2HistoricalState();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/ability', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: '创建第一棵技能树' })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${EVIDENCE}/00-1440-empty.png`, animations: 'disabled' });

  await seed(page, historical);
  await page.locator('.ability-tree-stage').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${EVIDENCE}/01-1440-parallel-candidates.png`, animations: 'disabled' });

  const phase = page.getByRole('group', { name: '阶段 实践阶段' });
  const box = await phase.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move((box?.x ?? 0) + 48, (box?.y ?? 0) + 32);
  await page.mouse.down();
  await page.mouse.move((box?.x ?? 0) + 112, (box?.y ?? 0) + 80, { steps: 5 });
  await page.mouse.up();
  await page.screenshot({ path: `${EVIDENCE}/02-1440-stage-dragged.png`, animations: 'disabled' });

  await page.getByRole('group', { name: '候选甲 成长中', exact: true }).click();
  await page.screenshot({ path: `${EVIDENCE}/03-1440-detail-open.png`, animations: 'disabled' });

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: '切换到线性路线' }).click();
  await page.getByRole('region', { name: '历史能力路线线性技能路线' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${EVIDENCE}/04-1024-linear-route.png`, animations: 'disabled' });

  // A 720 CSS-pixel viewport represents the reflow pressure of 200% zoom on 1440px desktop.
  await page.setViewportSize({ width: 720, height: 450 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: '下一步 · 2' })).toBeVisible();
  await expect(page.getByRole('button', { name: '切换到线性路线' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  const route = page.getByRole('region', { name: '历史能力路线线性技能路线' });
  await expect(route).toBeVisible();
  await route.getByRole('button', { name: /候选甲 成长中/ }).click();
  await page.screenshot({ path: `${EVIDENCE}/05-390-mobile-detail.png`, animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(problems).toEqual([]);
});

test('20 阶段 200 节点的加载、下一步、阶段拖动与撤销无长任务或异常', async ({ page }, testInfo) => {
  const problems = watchProblems(page);
  await page.addInitScript(() => {
    (window as typeof window & { __abilityLongTasks?: number[] }).__abilityLongTasks = [];
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        (window as typeof window & { __abilityLongTasks?: number[] }).__abilityLongTasks?.push(...list.getEntries().map((entry) => entry.duration));
      });
      try { observer.observe({ entryTypes: ['longtask'] }); } catch { /* not supported */ }
    }
  });
  const startedAt = Date.now();
  await seed(page, pressureState());
  const readyMs = Date.now() - startedAt;
  await expect(page.locator('.react-flow__node-skill')).toHaveCount(200);

  const nextStartedAt = Date.now();
  await page.getByRole('button', { name: '下一步 · 20' }).click();
  await expect(page.getByRole('complementary', { name: '技能节点详情' }).getByRole('heading', { name: '压力节点 1' })).toBeVisible();
  const nextMs = Date.now() - nextStartedAt;
  await page.getByRole('complementary', { name: '技能节点详情' }).getByRole('button', { name: '关闭技能详情' }).click();

  const phase = page.getByRole('group', { name: '阶段 阶段 1', exact: true });
  const box = await phase.boundingBox();
  expect(box).not.toBeNull();
  const dragStartedAt = Date.now();
  await page.mouse.move((box?.x ?? 0) + 40, (box?.y ?? 0) + 28);
  await page.mouse.down();
  await page.mouse.move((box?.x ?? 0) + 80, (box?.y ?? 0) + 60, { steps: 4 });
  await page.mouse.up();
  await page.getByRole('button', { name: '撤销' }).click();
  const dragUndoMs = Date.now() - dragStartedAt;
  const longTasks = await page.evaluate(() => (window as typeof window & { __abilityLongTasks?: number[] }).__abilityLongTasks ?? []);

  const metrics = { readyMs, nextMs, dragUndoMs, longTaskCount: longTasks.length, longestLongTaskMs: Math.max(0, ...longTasks) };
  await testInfo.attach('v4-200-node-performance', { body: JSON.stringify(metrics, null, 2), contentType: 'application/json' });
  expect(readyMs).toBeLessThan(10_000);
  expect(nextMs).toBeLessThan(2_000);
  expect(dragUndoMs).toBeLessThan(3_000);
  expect(problems).toEqual([]);
});
