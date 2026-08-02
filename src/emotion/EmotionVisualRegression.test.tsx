import { render, screen } from '@testing-library/react';
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

  it('renders a complete garden empty-state illustration and a geometry-aware dock', () => {
    const { container } = render(<EmotionModule />);
    expect(screen.getByRole('img', { name: '等待心情发芽的小花园' })).toBeInTheDocument();
    expect(container.querySelector('.emotion-dock')).toBeInTheDocument();
    expect(container.querySelector('.emotion-dock')).toContainElement(screen.getByRole('navigation', { name: '情绪模块导航' }));
    expect(container.querySelector('.emotion-dock')).toContainElement(screen.getByRole('button', { name: '记录感受' }));
  });
});
