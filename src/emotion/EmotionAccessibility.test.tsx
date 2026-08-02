import { render } from '@testing-library/react';
import axe from 'axe-core';
import { beforeEach, describe, expect, it } from 'vitest';
import { EmotionModule } from './EmotionModule';

describe('EmotionModule accessibility gate', () => {
  beforeEach(() => window.localStorage.clear());

  it('没有 serious 或 critical 级别的 axe 问题', async () => {
    const { container } = render(<main id="main-content"><EmotionModule /></main>);
    const results = await axe.run(container, {
      rules: {
        // jsdom does not lay out pixels; browser verification covers contrast separately.
        'color-contrast': { enabled: false }
      }
    });
    const blocking = results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical');
    expect(blocking.map(({ id, impact, help }) => ({ id, impact, help }))).toEqual([]);
  });
});
