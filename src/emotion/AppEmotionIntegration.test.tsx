import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';

describe('Dice Life emotion navigation', () => {
  beforeEach(() => localStorage.clear());

  it('从侧栏进入真实情绪模块而不是通用占位页', () => {
    render(<App />);
    const sidebar = screen.getByRole('complementary', { name: '角色与模块导航' });
    fireEvent.click(within(sidebar).getByRole('button', { name: /情绪状态/ }));
    expect(screen.getByRole('heading', { name: '我的心情' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '记录感受' })).toBeInTheDocument();
    expect(screen.queryByText('压力来源')).not.toBeInTheDocument();
  });

  it('opens the emotion composer directly from Today quick record', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '记录此刻' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /记录情绪/ }));
    expect(screen.getByRole('dialog', { name: '记录此刻感受' })).toBeInTheDocument();
  });
});
