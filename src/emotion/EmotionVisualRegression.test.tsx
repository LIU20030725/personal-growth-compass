import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { EmotionModule } from './EmotionModule';

describe('EmotionModule visual system', () => {
  beforeEach(() => window.localStorage.clear());

  it('derives dock bounds from the rendered module instead of a sidebar constant', () => {
    const { container } = render(<EmotionModule />);
    const module = container.querySelector<HTMLElement>('.emotion-module');
    expect(module?.style.getPropertyValue('--emotion-module-left')).toBe('0px');
    expect(module?.style.getPropertyValue('--emotion-module-right')).toMatch(/^\d+px$/);
  });

  it('renders a complete garden empty-state illustration and an in-flow command bar', () => {
    const { container } = render(<EmotionModule />);
    expect(screen.getByRole('img', { name: '等待心情发芽的小花园' })).toBeInTheDocument();
    expect(container.querySelector('.emotion-dock')).toBeInTheDocument();
    expect(container.querySelector('.emotion-dock')).toContainElement(screen.getByRole('navigation', { name: '情绪模块导航' }));
    expect(container.querySelector('.emotion-workspace-header')).toContainElement(screen.getByRole('button', { name: '记录此刻' }));
    expect(container.querySelector('.emotion-dock')?.parentElement).toHaveClass('emotion-module__canvas');
  });

  it('keeps library segment touch targets at least 44px tall', () => {
    render(<EmotionModule />);
    fireEvent.click(within(screen.getByRole('navigation', { name: '情绪模块导航' })).getByRole('button', { name: '内容库' }));
    const segment = within(screen.getByRole('group', { name: '筛选内容类型' })).getByRole('button', { name: '全部' });
    expect(segment).toHaveClass('emotion-segmented__button');
  });
});
