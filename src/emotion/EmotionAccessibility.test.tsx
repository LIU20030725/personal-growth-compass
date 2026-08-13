import { fireEvent, render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { beforeEach, describe, expect, it } from 'vitest';
import { EmotionModule } from './EmotionModule';
import { EMOTION_STORAGE_KEY } from './emotionStorage';

async function expectNoBlockingAxe(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: {
      // jsdom does not lay out pixels; real-browser responsive verification covers contrast separately.
      'color-contrast': { enabled: false }
    }
  });
  const blocking = results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical');
  expect(blocking.map(({ id, impact, help }) => ({ id, impact, help }))).toEqual([]);
}

describe('EmotionModule accessibility gate', () => {
  beforeEach(() => window.localStorage.clear());

  it('没有 serious 或 critical 级别的 axe 问题', async () => {
    const { container } = render(<main id="main-content"><EmotionModule /></main>);
    await expectNoBlockingAxe(container);
  });

  it('内容库、日历和创建菜单均无 serious 或 critical 问题', async () => {
    const { container } = render(<main id="main-content"><EmotionModule /></main>);
    const navigation = screen.getByRole('navigation', { name: '情绪模块导航' });
    fireEvent.click(within(navigation).getByRole('button', { name: '内容库' }));
    await expectNoBlockingAxe(container);
    fireEvent.click(within(navigation).getByRole('button', { name: '心情日历' }));
    await expectNoBlockingAxe(container);
    fireEvent.click(screen.getByRole('button', { name: '记录感受' }));
    await expectNoBlockingAxe(container);
  });

  it('有数据的日记与详情均无 serious 或 critical 问题', async () => {
    window.localStorage.setItem(EMOTION_STORAGE_KEY, JSON.stringify({
      schemaVersion: 2,
      entries: [{
        id: 'entry-a11y', createdAt: '2026-08-12T08:00:00.000Z', updatedAt: '2026-08-12T08:00:00.000Z',
        moodId: 'calm', activityIds: ['reading'], note: '无障碍详情记录', attachments: [], music: [], isFavorite: false
      }],
      importantDays: []
    }));
    const { container } = render(<main id="main-content"><EmotionModule /></main>);
    await expectNoBlockingAxe(container);
    fireEvent.click(container.querySelector('.emotion-entry-card__main') as HTMLButtonElement);
    await expectNoBlockingAxe(container);
  });
});
