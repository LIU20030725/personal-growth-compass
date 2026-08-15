import { fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import { TodayOverview } from './TodayOverview';
import { emptyTodayOverviewModel } from './todayOverviewModel';

async function expectNoBlocking(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false } },
  });
  expect(
    results.violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => violation.id),
  ).toEqual([]);
}

describe('TodayOverview accessibility gate', () => {
  it('has no serious or critical axe violations in the page and quick menu', async () => {
    const { container } = render(
      <TodayOverview
        model={emptyTodayOverviewModel}
        onOpenModule={vi.fn()}
        onQuickAction={vi.fn()}
        onCompleteTask={vi.fn()}
      />,
    );

    await expectNoBlocking(container);
    fireEvent.click(screen.getByRole('button', { name: '记录此刻' }));
    await expectNoBlocking(container);
  });
});
