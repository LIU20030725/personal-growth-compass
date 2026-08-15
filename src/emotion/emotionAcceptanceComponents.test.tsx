import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EmotionModule } from './EmotionModule';
import { EmotionAudioPlayer } from './components/EmotionAudioPlayer';
import { EmotionCreateMenu } from './components/EmotionCreateMenu';
import { EmotionImportantDayComposer } from './components/EmotionImportantDayComposer';
import { EmotionMusicCard } from './components/EmotionMusicCard';

describe('0811 emotion component acceptance', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('offers both create actions, traps Tab and closes with Escape', () => {
    const onRecord = vi.fn();
    const onImportantDay = vi.fn();
    const onClose = vi.fn();
    render(<EmotionCreateMenu onRecord={onRecord} onImportantDay={onImportantDay} onClose={onClose} />);

    expect(screen.getByRole('button', { name: '记录此刻' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '记录此刻' }));
    fireEvent.click(screen.getByRole('button', { name: '添加重要日' }));
    expect(onRecord).toHaveBeenCalledOnce();
    expect(onImportantDay).toHaveBeenCalledOnce();

    const last = screen.getByRole('button', { name: '添加重要日' });
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('button', { name: '关闭添加菜单' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('supports cancel and submits reminder and yearly-repeat fields', () => {
    const onSave = vi.fn().mockReturnValue(true);
    const onClose = vi.fn();
    const view = render(<EmotionImportantDayComposer onSave={onSave} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: '关闭重要日' }));
    expect(onClose).toHaveBeenCalledOnce();
    view.unmount();

    render(<EmotionImportantDayComposer onSave={onSave} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText('重要日名称'), { target: { value: '出发旅行' } });
    fireEvent.change(screen.getByLabelText('日期'), { target: { value: '2026-12-31' } });
    fireEvent.change(screen.getByLabelText('提前提醒'), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('checkbox', { name: '每年重复' }));
    fireEvent.change(screen.getByLabelText('备注'), { target: { value: '带上相机' } });
    fireEvent.click(screen.getByRole('button', { name: '保存重要日' }));

    expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({
      title: '出发旅行', dateKey: '2026-12-31', remindDaysBefore: 30, repeat: 'yearly', note: '带上相机'
    }));
  });

  it('keeps play, pause, ended and media-error state synchronized', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    const view = render(<><EmotionAudioPlayer src="blob:first" label="第一条语音" /><EmotionAudioPlayer src="blob:second" label="第二条语音" /></>);
    const audio = view.container.querySelectorAll('audio');

    fireEvent.click(screen.getByRole('button', { name: '播放第一条语音' }));
    expect(await screen.findByRole('button', { name: '暂停第一条语音' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '播放第二条语音' })).toBeInTheDocument();
    fireEvent.ended(audio[0]);
    expect(screen.getByRole('button', { name: '播放第一条语音' })).toBeInTheDocument();
    fireEvent.error(audio[1]);
    expect(await screen.findByRole('status')).toHaveTextContent('暂时无法播放这段声音');
  });

  it('does not render dangerous navigation from invalid music state', () => {
    render(<EmotionMusicCard music={{
      id: 'unsafe', provider: 'other', title: '危险链接', artist: '',
      sourceUrl: 'javascript:alert(1)', playbackUrl: '', isFavorite: false
    }} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('链接不可用')).toBeInTheDocument();
  });

  it('selects an activity icon, saves it and restores a fresh library filter after navigation', async () => {
    render(<EmotionModule />);
    fireEvent.click(screen.getByRole('button', { name: '记录此刻' }));
    const dialog = screen.getByRole('dialog', { name: '记录此刻感受' });
    fireEvent.click(within(dialog).getByRole('button', { name: '平稳' }));
    fireEvent.click(within(dialog).getByRole('radio', { name: '平静' }));
    fireEvent.click(within(dialog).getByRole('button', { name: '日常生活' }));
    const travel = within(dialog).getByRole('checkbox', { name: '旅行' });
    expect(travel.querySelector('svg')).not.toBeNull();
    fireEvent.click(travel);
    expect(travel).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(within(dialog).getByRole('button', { name: '保存这一刻' }));
    expect((await screen.findAllByText('旅行')).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '内容库' }));
    const favorites = screen.getByRole('button', { name: '只看收藏' });
    fireEvent.click(favorites);
    expect(favorites).toHaveAttribute('aria-pressed', 'true');
    const navigation = screen.getByRole('navigation', { name: '情绪模块导航' });
    fireEvent.click(within(navigation).getByRole('button', { name: '日记' }));
    fireEvent.click(within(navigation).getByRole('button', { name: '内容库' }));
    expect(screen.getByRole('button', { name: '只看收藏' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('does not reserve reminder space when no reminder is active', () => {
    render(<EmotionModule />);
    expect(screen.queryByRole('complementary', { name: '临近的重要日' })).not.toBeInTheDocument();
  });
});
