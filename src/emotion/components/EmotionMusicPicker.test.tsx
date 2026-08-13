import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmotionMusicPicker } from './EmotionMusicPicker';

describe('EmotionMusicPicker', () => {
  it('accepts one share text and returns an identified music reference', () => {
    const onConfirm = vi.fn();
    render(<EmotionMusicPicker onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('音乐分享链接'), { target: { value: '分享单曲：晴天 - 周杰伦 https://music.163.com/song?id=1' } });
    fireEvent.click(screen.getByRole('button', { name: '识别音乐' }));
    expect(screen.getByText('晴天')).toBeInTheDocument();
    expect(screen.getByText(/周杰伦/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '添加到这一刻' }));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'netease', title: '晴天', artist: '周杰伦', sourceUrl: 'https://music.163.com/song?id=1', playbackUrl: ''
    }));
  });

  it('allows a safe link to be saved when metadata is unavailable', () => {
    const onConfirm = vi.fn();
    render(<EmotionMusicPicker onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('音乐分享链接'), { target: { value: 'https://example.com/music/1' } });
    fireEvent.click(screen.getByRole('button', { name: '识别音乐' }));
    expect(screen.getByText('暂时没有读到歌曲信息，仍可保存并前往原网页。')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '直接保存链接' }));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: '音乐网页收藏', sourceUrl: 'https://example.com/music/1' }));
  });

  it('shows a local error for dangerous input and supports cancel', () => {
    const onCancel = vi.fn();
    render(<EmotionMusicPicker onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.change(screen.getByLabelText('音乐分享链接'), { target: { value: 'javascript:alert(1)' } });
    fireEvent.click(screen.getByRole('button', { name: '识别音乐' }));
    expect(screen.getByRole('alert')).toHaveTextContent('请粘贴有效的 http 或 https 音乐链接');
    fireEvent.click(screen.getByRole('button', { name: '取消音乐收藏' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
