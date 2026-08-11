import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { EmotionModule } from './EmotionModule';

describe('EmotionModule', () => {
  beforeEach(() => window.localStorage.clear());

  it('以日记为首页并可切换内容库与心情日历', () => {
    render(<EmotionModule />);
    expect(screen.getByRole('heading', { name: '我的心情' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '内容库' }));
    expect(screen.getByRole('heading', { name: '我的收藏库' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '心情日历' }));
    expect(screen.getByRole('heading', { name: '心情日历' })).toBeInTheDocument();
  });

  it('完成情绪、活动和文字记录后同步进入日记与内容库', async () => {
    render(<EmotionModule />);
    fireEvent.click(screen.getByRole('button', { name: '记录感受' }));
    fireEvent.click(screen.getByRole('button', { name: '记录此刻' }));
    const dialog = screen.getByRole('dialog', { name: '记录此刻感受' });
    fireEvent.click(within(dialog).getByRole('radio', { name: '平静' }));
    fireEvent.click(within(dialog).getByRole('checkbox', { name: '阅读' }));
    fireEvent.change(within(dialog).getByLabelText('文字日记'), { target: { value: '在窗边读完了一章。' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '保存这一刻' }));

    expect((await screen.findAllByText('在窗边读完了一章。')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: '内容库' }));
    expect(screen.getByText('在窗边读完了一章。')).toBeInTheDocument();
  });

  it('日历日期可进入当天全部记录', async () => {
    render(<EmotionModule />);
    fireEvent.click(screen.getByRole('button', { name: '记录感受' }));
    fireEvent.click(screen.getByRole('button', { name: '记录此刻' }));
    fireEvent.click(screen.getByRole('radio', { name: '开心' }));
    fireEvent.click(screen.getByRole('button', { name: '保存这一刻' }));
    await screen.findByRole('heading', { name: '现在的我，开心' });
    fireEvent.click(screen.getByRole('button', { name: '心情日历' }));
    fireEvent.click(screen.getByRole('button', { name: /1 条记录/ }));
    expect(await screen.findByRole('heading', { name: /的记录/ })).toBeInTheDocument();
  });

  it('关闭编辑器后把焦点还给打开它的按钮', async () => {
    render(<EmotionModule />);
    const trigger = screen.getByRole('button', { name: '记录感受' });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: '记录此刻' }));
    expect(screen.getByRole('button', { name: '关闭记录' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(await screen.findByRole('button', { name: '记录感受' })).toHaveFocus();
  });

  it('offers an upward creation menu and saves an important day', async () => {
    render(<EmotionModule />);
    const trigger = screen.getByRole('button', { name: '记录感受' });
    fireEvent.click(trigger);

    expect(screen.getByRole('dialog', { name: '选择要添加的内容' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '添加重要日' }));
    const dialog = screen.getByRole('dialog', { name: '添加重要日' });
    fireEvent.change(within(dialog).getByLabelText('重要日名称'), { target: { value: '出发旅行' } });
    fireEvent.change(within(dialog).getByLabelText('日期'), { target: { value: '2026-08-13' } });
    fireEvent.change(within(dialog).getByLabelText('提前提醒'), { target: { value: '30' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '保存重要日' }));

    expect(await screen.findByRole('complementary', { name: '临近的重要日' })).toHaveTextContent('出发旅行');
  });
});
