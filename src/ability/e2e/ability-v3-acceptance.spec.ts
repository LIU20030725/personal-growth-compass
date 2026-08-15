import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const STORAGE_KEY = 'dice-life.ability.v1';
const EVIDENCE = 'src/ability/docs/evidence/2026-08-14-v4-implementation-smoke/screenshots';
const stamp = '2026-08-12T00:00:00.000Z';

type BrowserProblem = { kind: 'console' | 'pageerror'; text: string };

function watchBrowserProblems(page: Page): BrowserProblem[] {
  const problems: BrowserProblem[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      const location = message.location();
      problems.push({ kind: 'console', text: `${message.type()}: ${message.text()}${location.url ? ` @ ${location.url}` : ''}` });
    }
  });
  page.on('pageerror', (error) => problems.push({ kind: 'pageerror', text: error.message }));
  return problems;
}

async function openEmpty(page: Page): Promise<void> {
  await page.goto('/ability', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('region', { name: '能力属性模块' })).toBeVisible();
}

async function seed(page: Page, state: unknown): Promise<void> {
  await page.goto('/ability', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ key, value }) => {
    window.localStorage.clear();
    window.localStorage.setItem(key, JSON.stringify(value));
  }, { key: STORAGE_KEY, value: state });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('region', { name: '能力属性模块' })).toBeVisible();
}

function visualState(nodeCount = 10) {
  const phases = [
    { id: 'phase-1', skillTreeId: 'tree', name: '建立基础', description: '形成稳定基本功', estimatedDuration: '2 周', requiredNodePolicy: 'all_required', order: 0 },
    { id: 'phase-2', skillTreeId: 'tree', name: '并行实践', description: '同时探索五条实践分支', estimatedDuration: '4 周', requiredNodePolicy: 'all_required', order: 1 },
    { id: 'phase-3', skillTreeId: 'tree', name: '发布复盘', description: '等待补充技能节点', estimatedDuration: '1 周', requiredNodePolicy: 'all_required', order: 2 }
  ];
  const names = ['学习地图', '内容策划', '脚本表达', '拍摄构图', '剪辑节奏', '发布运营', '数据复盘', '作品集', '商业合作', '长期系统'];
  const nodes = Array.from({ length: nodeCount }, (_, index) => ({
    id: `node-${index}`,
    skillTreeId: 'tree',
    phaseId: index === 0 ? 'phase-1' : 'phase-2',
    name: names[index] ?? `压力技能 ${index + 1}`,
    description: '',
    progress: index === 0 ? 'mastered' : index === 1 ? 'in_progress' : 'available',
    requiredForPhase: index % 4 !== 0,
    masteryNote: index === 0 ? '旧版说明仍保留' : '',
    archivedAt: null,
    createdAt: `${stamp}-${String(index).padStart(2, '0')}`,
    updatedAt: stamp
  }));
  const dependencies = nodeCount === 10 ? [
    ...Array.from({ length: 5 }, (_, index) => ({ id: `edge-root-${index + 1}`, skillTreeId: 'tree', prerequisiteNodeId: 'node-0', dependentNodeId: `node-${index + 1}`, kind: 'primary' })),
    { id: 'edge-deep-1', skillTreeId: 'tree', prerequisiteNodeId: 'node-1', dependentNodeId: 'node-6', kind: 'primary' },
    { id: 'edge-deep-2', skillTreeId: 'tree', prerequisiteNodeId: 'node-6', dependentNodeId: 'node-7', kind: 'primary' },
    { id: 'edge-deep-3', skillTreeId: 'tree', prerequisiteNodeId: 'node-7', dependentNodeId: 'node-8', kind: 'primary' },
    { id: 'edge-deep-4', skillTreeId: 'tree', prerequisiteNodeId: 'node-8', dependentNodeId: 'node-9', kind: 'primary' }
  ] : Array.from({ length: nodeCount - 1 }, (_, index) => ({ id: `edge-${index}`, skillTreeId: 'tree', prerequisiteNodeId: `node-${index}`, dependentNodeId: `node-${index + 1}`, kind: 'primary' }));
  const resources = Array.from({ length: 4 }, (_, index) => ({
    id: `resource-${index}`,
    url: `https://example.com/guide-${index + 1}`,
    normalizedUrl: `https://example.com/guide-${index + 1}`,
    title: `精选学习资料 ${index + 1}`,
    type: index === 0 ? 'video' : 'article',
    sourceDomain: 'example.com',
    note: index === 0 ? '优先完成配套练习' : '',
    source: 'manual',
    createdAt: stamp,
    updatedAt: stamp
  }));
  return {
    schemaVersion: 2,
    trees: [{ id: 'tree', name: nodeCount > 10 ? '40 节点压力路线' : '自媒体创作系统', description: '从定位到发布与复盘', role: 'main', status: 'active', focusedRank: 1, createdAt: stamp, updatedAt: stamp }],
    phases,
    nodes,
    dependencies,
    parallelGroups: nodeCount === 10 ? [{ id: 'parallel', skillTreeId: 'tree', phaseId: 'phase-2', name: '五条并行实践', nodeIds: ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'], parentNodeId: 'node-0' }] : [],
    masteryCriteria: [{ id: 'criterion', skillNodeId: 'node-1', description: '完成一个公开作品', satisfied: false, source: 'manual' }],
    taskLinks: [{ id: 'legacy-task', skillNodeId: 'node-0', taskId: 'task-old' }],
    outcomes: [{ id: 'outcome', skillTreeId: 'tree', skillNodeId: 'node-1', title: '第一条视频上线', description: '', occurredOn: '2026-08-11', showOnTree: true, createdAt: stamp, updatedAt: stamp }],
    resources,
    resourceLinks: resources.map((resource, index) => ({ id: `resource-link-${index}`, skillNodeId: 'node-1', resourceId: resource.id, createdAt: stamp })),
    lastVisitedTreeId: 'tree'
  };
}

test('A：全新数据完成结构、成长、证据、资源与视图闭环且无浏览器异常', async ({ page }) => {
  const problems = watchBrowserProblems(page);
  await openEmpty(page);

  await page.getByRole('button', { name: '创建第一棵技能树' }).click();
  await page.getByRole('textbox', { name: '技能树名称' }).fill('独立产品设计');
  await page.getByRole('button', { name: '保存技能树' }).click();
  await page.getByRole('button', { name: '添加阶段' }).click();
  await page.getByRole('textbox', { name: '阶段名称' }).fill('需求与原型');
  await page.getByRole('button', { name: '保存阶段' }).click();
  await page.getByRole('button', { name: '在 需求与原型 添加第一个节点' }).click();
  await page.getByRole('textbox', { name: '节点名称' }).fill('定义核心问题');
  await page.getByRole('button', { name: '保存节点' }).click();

  const root = page.getByRole('group', { name: '定义核心问题 可开始', exact: true });
  await root.click();
  const addChild = page.getByRole('button', { name: '为 定义核心问题 添加子节点' });
  await addChild.click();
  await addChild.click();
  await addChild.click();
  await expect(page.getByRole('group', { name: '新技能 可开始', exact: true })).toHaveCount(3);
  await page.getByRole('button', { name: '更多画布工具' }).click();
  await expect(page.getByRole('menuitem', { name: '添加下一阶段' })).toBeVisible();
  await page.keyboard.press('Escape');

  await root.click();
  const detail = page.getByRole('complementary', { name: '技能节点详情' });
  await detail.getByRole('button', { name: '开始学习' }).click();
  await expect(detail.getByRole('button', { name: '确认已掌握' })).toBeDisabled();
  await detail.getByRole('textbox', { name: '新增掌握标准' }).fill('输出一页问题定义');
  await detail.getByRole('button', { name: '添加掌握标准' }).click();
  await detail.getByRole('checkbox', { name: '输出一页问题定义' }).check();
  await detail.getByRole('button', { name: '确认已掌握' }).click();

  await detail.getByRole('button', { name: '记录成果' }).click();
  await page.getByRole('textbox', { name: '成果名称' }).fill('问题定义评审通过');
  await page.getByRole('button', { name: '保存成果' }).click();
  const outcomeState = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? '{}'), STORAGE_KEY);
  expect(outcomeState.outcomes).toHaveLength(1);
  expect(outcomeState.outcomes[0].skillNodeId).toBe(outcomeState.nodes.find((node: { name: string }) => node.name === '定义核心问题').id);

  await detail.getByRole('button', { name: '收藏资源' }).click();
  await detail.getByRole('textbox', { name: '资源链接' }).fill('https://example.com/product?utm_source=test');
  await detail.getByRole('textbox', { name: '资源标题' }).fill('产品问题定义指南');
  await detail.getByRole('button', { name: '保存资源' }).click();
  await detail.getByRole('button', { name: '关闭技能详情' }).click();

  const child = page.getByRole('group', { name: '新技能 可开始', exact: true }).first();
  await child.click();
  await detail.getByRole('button', { name: '收藏资源' }).click();
  await detail.getByRole('textbox', { name: '资源链接' }).fill('https://EXAMPLE.com/product');
  await detail.getByRole('textbox', { name: '资源标题' }).fill('重复链接');
  await detail.getByRole('button', { name: '保存资源' }).click();
  const resourceState = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? '{}'), STORAGE_KEY);
  expect(resourceState.resources).toHaveLength(1);
  expect(resourceState.resourceLinks).toHaveLength(2);

  await detail.getByRole('button', { name: '关闭技能详情' }).click();
  await page.getByRole('button', { name: '切换到线性路线' }).click();
  await page.getByRole('button', { name: /定义核心问题 已掌握/ }).click();
  await expect(detail.getByRole('heading', { name: '定义核心问题' })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  const persisted = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? '{}'), STORAGE_KEY);
  expect(persisted.nodes.find((node: { name: string }) => node.name === '定义核心问题').progress).toBe('mastered');
  expect(persisted.resources).toHaveLength(1);
  expect(problems).toEqual([]);
});

test('B：V1 复杂历史树无损迁移并保留旧任务与掌握说明但不暴露旧入口', async ({ page }) => {
  const problems = watchBrowserProblems(page);
  const v1 = {
    schemaVersion: 1,
    trees: [{ id: 'legacy-tree', name: '历史编程能力', description: '复杂迁移样本', role: 'main', status: 'active', focusedRank: 1, createdAt: stamp, updatedAt: stamp }],
    phases: [
      { id: 'legacy-base', skillTreeId: 'legacy-tree', name: '基础', description: '', order: 0 },
      { id: 'legacy-project', skillTreeId: 'legacy-tree', name: '项目', description: '', order: 1 }
    ],
    nodes: [
      { id: 'legacy-root', skillTreeId: 'legacy-tree', phaseId: 'legacy-base', name: 'JavaScript', description: '', progress: 'mastered', masteryNote: '已完成旧版手写判断', archivedAt: null, createdAt: stamp, updatedAt: stamp },
      { id: 'legacy-a', skillTreeId: 'legacy-tree', phaseId: 'legacy-project', name: 'React', description: '', progress: 'in_progress', masteryNote: '', archivedAt: null, createdAt: stamp, updatedAt: stamp },
      { id: 'legacy-b', skillTreeId: 'legacy-tree', phaseId: 'legacy-project', name: 'Node.js', description: '', progress: 'available', masteryNote: '', archivedAt: null, createdAt: stamp, updatedAt: stamp }
    ],
    dependencies: [
      { id: 'legacy-edge-a', skillTreeId: 'legacy-tree', prerequisiteNodeId: 'legacy-root', dependentNodeId: 'legacy-a', kind: 'primary' },
      { id: 'legacy-edge-b', skillTreeId: 'legacy-tree', prerequisiteNodeId: 'legacy-root', dependentNodeId: 'legacy-b', kind: 'primary' }
    ],
    parallelGroups: [{ id: 'legacy-parallel', skillTreeId: 'legacy-tree', phaseId: 'legacy-project', name: '并行实践', nodeIds: ['legacy-a', 'legacy-b'], parentNodeId: 'legacy-root' }],
    masteryCriteria: [],
    taskLinks: [{ id: 'legacy-task-link', skillNodeId: 'legacy-root', taskId: 'old-task' }],
    outcomes: [{ id: 'legacy-outcome', skillTreeId: 'legacy-tree', skillNodeId: 'legacy-root', title: '旧网站上线', description: '', occurredOn: '2026-08-01', showOnTree: true, createdAt: stamp, updatedAt: stamp }],
    lastVisitedTreeId: 'legacy-tree'
  };
  await seed(page, v1);
  await expect(page.getByRole('group', { name: 'JavaScript 已掌握', exact: true })).toBeVisible();
  const migrated = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? '{}'), STORAGE_KEY);
  expect(migrated.schemaVersion).toBe(2);
  expect(migrated.nodes).toHaveLength(3);
  expect(migrated.dependencies).toHaveLength(2);
  expect(migrated.parallelGroups).toHaveLength(1);
  expect(migrated.taskLinks).toEqual(v1.taskLinks);
  expect(migrated.nodes.find((node: { id: string }) => node.id === 'legacy-root').masteryNote).toBe('已完成旧版手写判断');
  expect(migrated.nodes.every((node: { requiredForPhase: boolean }) => node.requiredForPhase)).toBe(true);
  expect(migrated.phases.every((phase: { estimatedDuration: string }) => phase.estimatedDuration === '')).toBe(true);
  expect(migrated.resources).toEqual([]);
  expect(migrated.resourceLinks).toEqual([]);

  await page.getByRole('group', { name: 'JavaScript 已掌握', exact: true }).click();
  const detail = page.getByRole('complementary', { name: '技能节点详情' });
  await expect(detail.getByText('关联任务')).toHaveCount(0);
  await expect(detail.getByLabel('掌握判断依据')).toHaveCount(0);
  await page.reload({ waitUntil: 'domcontentloaded' });
  const second = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? '{}'), STORAGE_KEY);
  expect(second).toEqual(migrated);
  expect(problems).toEqual([]);
});

test('重新生成桌面、窄屏、资源、线性、移动详情与 40 节点视觉证据', async ({ page }, testInfo) => {
  const problems = watchBrowserProblems(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  const threeBranch = visualState();
  threeBranch.nodes = threeBranch.nodes.slice(0, 4);
  threeBranch.dependencies = threeBranch.dependencies.slice(0, 3);
  threeBranch.parallelGroups[0].nodeIds = ['node-1', 'node-2', 'node-3'];
  threeBranch.resources = [];
  threeBranch.resourceLinks = [];
  threeBranch.masteryCriteria = [];
  threeBranch.outcomes = [];
  await seed(page, threeBranch);
  await page.getByRole('button', { name: 'Fit View' }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${EVIDENCE}/00-1440-three-branch.png`, animations: 'disabled' });

  await seed(page, visualState());
  await page.getByRole('button', { name: 'Fit View' }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${EVIDENCE}/01-1440-five-branch-multilevel.png`, animations: 'disabled' });

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.getByRole('button', { name: 'Fit View' }).click();
  await page.screenshot({ path: `${EVIDENCE}/02-1024-stage-columns-empty-stage.png`, animations: 'disabled' });

  await page.getByRole('group', { name: '内容策划 成长中', exact: true }).click();
  await page.getByRole('complementary', { name: '技能节点详情' }).getByRole('button', { name: '查看全部' }).click();
  await page.screenshot({ path: `${EVIDENCE}/03-1024-resource-expanded.png`, animations: 'disabled' });

  await page.getByRole('complementary', { name: '技能节点详情' }).getByRole('button', { name: '关闭技能详情' }).click();
  await page.getByRole('button', { name: '切换到线性路线' }).click();
  await page.screenshot({ path: `${EVIDENCE}/04-1024-linear-route.png`, animations: 'disabled' });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /内容策划 成长中/ }).click();
  await page.screenshot({ path: `${EVIDENCE}/05-390-bottom-detail.png`, animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  const startedAt = Date.now();
  await seed(page, visualState(40));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  const route = page.getByRole('region', { name: '40 节点压力路线线性技能路线' });
  await expect(route.getByTestId('linear-skill-node')).toHaveCount(40);
  const readyMs = Date.now() - startedAt;
  expect(readyMs).toBeLessThan(8_000);
  await testInfo.attach('40-node-performance', { body: JSON.stringify({ readyMs, budgetMs: 8_000, nodeCount: 40 }), contentType: 'application/json' });
  await route.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${EVIDENCE}/06-390-40-node-pressure.png`, animations: 'disabled' });
  expect(problems).toEqual([]);
});

test('@a11y V4 画布、线性、资源和移动详情 serious/critical 为零', async ({ page }, testInfo) => {
  await seed(page, visualState());
  const scans: Array<{ name: string; violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'] }> = [];
  const scan = async (name: string) => {
    const result = await new AxeBuilder({ page }).include('[aria-label="能力属性模块"]').analyze();
    scans.push({ name, violations: result.violations });
  };

  await scan('canvas-browse');
  await scan('canvas-direct-manipulation');
  await page.getByRole('button', { name: '切换到线性路线' }).click();
  await scan('linear');
  await page.getByRole('button', { name: /内容策划 成长中/ }).click();
  await page.getByRole('complementary', { name: '技能节点详情' }).getByRole('button', { name: '收藏资源' }).click();
  await scan('resource-form');
  await page.setViewportSize({ width: 390, height: 844 });
  await scan('mobile-detail');

  await testInfo.attach('axe-v3-matrix', { body: JSON.stringify(scans, null, 2), contentType: 'application/json' });
  const blocking = scans.flatMap((entry) => entry.violations.map((violation) => ({ scan: entry.name, ...violation })))
    .filter((violation) => violation.impact === 'critical' || violation.impact === 'serious');
  expect(blocking, blocking.map((item) => `${item.scan}: ${item.impact}: ${item.id}`).join('\n')).toEqual([]);
});
