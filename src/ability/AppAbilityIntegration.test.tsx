import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { createInitialAbilityState, saveAbilityState } from './abilityStorage';
import type { AbilityState } from './types';

const stamp = '2026-08-02T00:00:00.000Z';

function seeded(): AbilityState {
  return {
    ...createInitialAbilityState(),
    trees: [
      { id: 'react', name: 'React 全栈', description: '', role: 'main', status: 'active', focusedRank: 1, createdAt: stamp, updatedAt: stamp },
      { id: 'writing', name: '写作', description: '', role: 'side', status: 'active', focusedRank: 2, createdAt: stamp, updatedAt: stamp }
    ],
    phases: [
      { id: 'react-phase', skillTreeId: 'react', name: '基础', description: '', order: 0 },
      { id: 'write-phase', skillTreeId: 'writing', name: '基础', description: '', order: 0 }
    ],
    nodes: [
      { id: 'react-node', skillTreeId: 'react', phaseId: 'react-phase', name: '组件设计', description: '', progress: 'available', masteryNote: '', archivedAt: null, createdAt: stamp, updatedAt: stamp },
      { id: 'write-node', skillTreeId: 'writing', phaseId: 'write-phase', name: '文章结构', description: '', progress: 'available', masteryNote: '', archivedAt: null, createdAt: stamp, updatedAt: stamp }
    ],
    lastVisitedTreeId: 'react'
  };
}

describe('Dice Life ability navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('opens the real ability module from the sidebar and returns to finance', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /能力属性/ }));
    expect(screen.getByRole('heading', { name: '能力技能树' })).toBeInTheDocument();
    expect(screen.queryByText('模块正在构建中')).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/ability');
    fireEvent.click(screen.getByRole('button', { name: /财富状况/ }));
    expect(screen.getByRole('heading', { name: '净资产' })).toBeInTheDocument();
  });

  it('opens a direct tree URL and updates the path when switching trees', () => {
    saveAbilityState(localStorage, seeded());
    window.history.replaceState({}, '', '/ability/trees/react');
    render(<App />);
    expect(screen.getByRole('tree', { name: 'React 全栈技能树' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '打开技能树 写作' }));
    expect(screen.getByRole('tree', { name: '写作技能树' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/ability/trees/writing');
  });

  it('falls back from an unknown tree URL with a visible notice', () => {
    saveAbilityState(localStorage, seeded());
    window.history.replaceState({}, '', '/ability/trees/missing');
    render(<App />);
    expect(screen.getByRole('tree', { name: 'React 全栈技能树' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('技能树不存在，已返回能力首页');
    expect(window.location.pathname).toBe('/ability/trees/react');
  });
});
