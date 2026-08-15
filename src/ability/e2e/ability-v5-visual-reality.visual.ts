import { expect, test, type Page } from '@playwright/test';
import { abilityVisualRealityState } from './abilityVisualRealityFixture';

const runtimeEnvironment = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env;
const baselineUrl = runtimeEnvironment?.ABILITY_BASELINE_URL ?? 'http://127.0.0.1:43146';
const v5Url = runtimeEnvironment?.ABILITY_V5_URL ?? 'http://127.0.0.1:43145';
const evidenceRoot = 'src/ability/docs/evidence/2026-08-15-ui-v5-visible-reality';

function watchBrowserProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') problems.push(`console:${message.type()}:${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror:${error.message}`));
  page.on('requestfailed', (request) => problems.push(`requestfailed:${request.url()}:${request.failure()?.errorText ?? 'unknown'}`));
  return problems;
}

async function seedAt(page: Page, origin: string): Promise<void> {
  await page.goto(`${origin}/ability`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((state) => {
    window.localStorage.clear();
    window.localStorage.setItem('dice-life.ability.v1', JSON.stringify(state));
  }, abilityVisualRealityState());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('region', { name: '能力属性模块' })).toBeVisible();
}

async function captureViewportPair(
  page: Page,
  width: number,
  height: number,
  name: string,
  firstScreenMetrics: Array<Record<string, unknown>>
): Promise<void> {
  await page.setViewportSize({ width, height });
  for (const target of [
    { label: 'before-origin-main', origin: baselineUrl },
    { label: 'after-v5', origin: v5Url }
  ]) {
    await seedAt(page, target.origin);
    await page.evaluate(() => window.scrollTo(0, 0));
    if (width === 1024) {
      const node = page.getByText('叙事型长视频脚本', { exact: true }).first();
      await node.click();
      await expect(page.getByRole('complementary', { name: '技能节点详情' })).toBeVisible();
    }
    if (width === 390) {
      const node = page.getByTestId('linear-skill-node').filter({ hasText: '叙事型长视频脚本' });
      await node.click();
      await expect(page.getByRole('complementary', { name: '技能节点详情' })).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: `${evidenceRoot}/paired/${target.label}-${name}.png`, animations: 'disabled' });
    if (width === 1440) {
      firstScreenMetrics.push(await page.evaluate((label) => {
        const visibleNodes = [...document.querySelectorAll<HTMLElement>('.react-flow__node-skill')].filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
        }).length;
        const canvas = document.querySelector<HTMLElement>('.ability-flow-shell');
        const heading = document.querySelector<HTMLElement>('.ability-command-header h1, .ability-hero h1');
        return {
          label,
          heading: heading?.textContent?.trim() ?? '',
          visibleNodes,
          canvasTop: Math.round(canvas?.getBoundingClientRect().top ?? -1),
          viewportHeight: window.innerHeight
        };
      }, target.label));
    }
  }
}

test('用同一真实数据生成三档 origin/main 与 V5 成对证据', async ({ page }, testInfo) => {
  const problems = watchBrowserProblems(page);
  const firstScreenMetrics: Array<Record<string, unknown>> = [];
  await captureViewportPair(page, 1440, 900, '1440-first-screen', firstScreenMetrics);
  await captureViewportPair(page, 1024, 768, '1024-detail-open', firstScreenMetrics);
  await captureViewportPair(page, 390, 844, '390-linear-detail', firstScreenMetrics);
  await testInfo.attach('first-screen-metrics', { body: JSON.stringify(firstScreenMetrics, null, 2), contentType: 'application/json' });
  await testInfo.attach('browser-problems', { body: JSON.stringify(problems, null, 2), contentType: 'application/json' });
  const baseline = firstScreenMetrics.find((entry) => entry.label === 'before-origin-main');
  const candidate = firstScreenMetrics.find((entry) => entry.label === 'after-v5');
  expect(baseline?.heading).toBe('能力技能树');
  expect(baseline?.visibleNodes).toBe(0);
  expect(Number(baseline?.canvasTop)).toBeGreaterThanOrEqual(800);
  expect(candidate?.heading).toBe('个人品牌内容增长系统');
  expect(Number(candidate?.visibleNodes)).toBeGreaterThanOrEqual(12);
  expect(Number(candidate?.canvasTop)).toBeLessThanOrEqual(450);
  expect(problems).toEqual([]);
});

test('证明连接点按需显示，以及阶段框扩张与撤销收缩', async ({ page }, testInfo) => {
  const problems = watchBrowserProblems(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedAt(page, v5Url);

  const branchPort = page.getByRole('button', { name: '为 用户画像与内容定位 添加子节点' });
  const branchIcon = branchPort.locator('svg');
  await expect(branchIcon).toHaveCSS('opacity', '0');
  await page.screenshot({ path: `${evidenceRoot}/interaction/01-port-at-rest.png`, animations: 'disabled' });
  await branchPort.hover();
  await expect(branchIcon).toHaveCSS('opacity', '1');
  await page.screenshot({ path: `${evidenceRoot}/interaction/02-port-hover-plus.png`, animations: 'disabled' });

  const phase = page.getByRole('group', { name: '阶段 定位与内容基础' });
  const node = page.getByRole('group', { name: '建立 30 条真实选题库 可开始', exact: true });
  await page.getByRole('button', { name: 'Fit View' }).click();
  const phaseBefore = await phase.boundingBox();
  const nodeBefore = await node.boundingBox();
  const phaseWorldWidthBefore = await phase.evaluate((element) => Number.parseFloat(getComputedStyle(element).width));
  expect(phaseBefore).not.toBeNull();
  expect(nodeBefore).not.toBeNull();
  await page.screenshot({ path: `${evidenceRoot}/interaction/03-stage-before-drag.png`, animations: 'disabled' });

  await page.mouse.move((nodeBefore?.x ?? 0) + (nodeBefore?.width ?? 0) / 2, (nodeBefore?.y ?? 0) + 14);
  await page.mouse.down();
  await page.mouse.move((phaseBefore?.x ?? 0) + (phaseBefore?.width ?? 0) + 150, (nodeBefore?.y ?? 0) + 14, { steps: 12 });
  await page.mouse.up();
  await expect.poll(() => phase.evaluate((element) => Number.parseFloat(getComputedStyle(element).width))).toBeGreaterThan(phaseWorldWidthBefore);
  const phaseWorldWidthExpanded = await phase.evaluate((element) => Number.parseFloat(getComputedStyle(element).width));
  await page.getByRole('button', { name: 'Fit View' }).click();
  const phaseExpanded = await phase.boundingBox();
  await page.screenshot({ path: `${evidenceRoot}/interaction/04-stage-expanded.png`, animations: 'disabled' });

  await page.getByRole('button', { name: '撤销' }).click();
  await expect.poll(() => phase.evaluate((element) => Number.parseFloat(getComputedStyle(element).width))).toBeLessThan(phaseWorldWidthExpanded);
  const phaseWorldWidthRestored = await phase.evaluate((element) => Number.parseFloat(getComputedStyle(element).width));
  await page.getByRole('button', { name: 'Fit View' }).click();
  const phaseRestored = await phase.boundingBox();
  await page.screenshot({ path: `${evidenceRoot}/interaction/05-stage-restored.png`, animations: 'disabled' });

  await testInfo.attach('stage-geometry', {
    body: JSON.stringify({
      screen: { before: phaseBefore, expanded: phaseExpanded, restored: phaseRestored },
      worldWidth: { before: phaseWorldWidthBefore, expanded: phaseWorldWidthExpanded, restored: phaseWorldWidthRestored }
    }, null, 2),
    contentType: 'application/json'
  });
  await testInfo.attach('browser-problems', { body: JSON.stringify(problems, null, 2), contentType: 'application/json' });
  expect(problems).toEqual([]);
});
