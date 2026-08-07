import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';

describe('Dice Life emotion navigation', () => {
  beforeEach(() => localStorage.clear());

  it('从侧栏进入真实情绪模块而不是通用占位页', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /情绪状态/ }));
    expect(screen.getByRole('heading', { name: '我的心情' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '记录感受' })).toBeInTheDocument();
    expect(screen.queryByText('压力来源')).not.toBeInTheDocument();
  });
});
