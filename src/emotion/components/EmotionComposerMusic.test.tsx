import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmotionComposer } from './EmotionComposer';

describe('EmotionComposer quick music flow', () => {
  it('keeps music collapsed beside voice and saves one parsed link', async () => {
    const onSave = vi.fn().mockResolvedValue('entry');
    render(<EmotionComposer onClose={vi.fn()} onSave={onSave} />);
    expect(screen.getByRole('button', { name: '音乐' })).toBeInTheDocument();
    expect(screen.queryByLabelText('音乐分享链接')).not.toBeInTheDocument();
    const actions = screen.getByRole('button', { name: '音乐' }).parentElement;
    expect(actions).toHaveTextContent('语音');

    fireEvent.click(screen.getByRole('button', { name: '音乐' }));
    fireEvent.change(screen.getByLabelText('音乐分享链接'), { target: { value: '分享单曲：晴天 - 周杰伦 https://music.163.com/song?id=1' } });
    fireEvent.click(screen.getByRole('button', { name: '识别音乐' }));
    fireEvent.click(screen.getByRole('button', { name: '添加到这一刻' }));
    expect(screen.queryByLabelText('音乐分享链接')).not.toBeInTheDocument();
    expect(screen.getByText('晴天')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: '平静' }));
    fireEvent.click(screen.getByRole('button', { name: '保存这一刻' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      music: [expect.objectContaining({ title: '晴天', artist: '周杰伦', playbackUrl: '' })]
    }), []));
  });

  it('cancels the music panel without changing the rest of the draft', () => {
    render(<EmotionComposer onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole('radio', { name: '开心' }));
    fireEvent.change(screen.getByLabelText('文字日记'), { target: { value: '今天很好' } });
    fireEvent.click(screen.getByRole('button', { name: '音乐' }));
    fireEvent.click(screen.getByRole('button', { name: '取消音乐收藏' }));
    expect(screen.getByRole('radio', { name: '开心' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText('文字日记')).toHaveValue('今天很好');
  });

  it('focuses the share link and returns focus to the music button after Escape', async () => {
    render(<EmotionComposer onClose={vi.fn()} onSave={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: '音乐' });
    fireEvent.click(trigger);
    const input = screen.getByLabelText('音乐分享链接');
    expect(input).toHaveFocus();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByLabelText('音乐分享链接')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
