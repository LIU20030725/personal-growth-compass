import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../../App';

describe('Dice Life adventure journal navigation', () => {
  beforeEach(() => localStorage.clear());

  it('opens the complete adventure journal from the top navigation', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '冒险日志' }));

    expect(screen.getByRole('heading', { name: '冒险日志' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /旅途/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '晴日林径像素旅途场景' })).toBeInTheDocument();
    expect(screen.queryByText('模块正在构建中')).not.toBeInTheDocument();
  });
});
