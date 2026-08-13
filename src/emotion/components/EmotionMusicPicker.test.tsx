import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmotionMusicPicker } from './EmotionMusicPicker';

describe('EmotionMusicPicker', () => {
  it('uses the offline share text immediately without calling the service', async () => {
    const onConfirm = vi.fn();
    const resolveMetadata = vi.fn();
    render(<EmotionMusicPicker onConfirm={onConfirm} onCancel={vi.fn()} resolveMetadata={resolveMetadata} />);
    fireEvent.change(screen.getByLabelText('音乐分享链接'), { target: { value: '分享单曲：晴天 - 周杰伦 https://music.163.com/song?id=1' } });
    fireEvent.click(screen.getByRole('button', { name: '识别音乐' }));
    expect(await screen.findByText('晴天')).toBeInTheDocument();
    expect(resolveMetadata).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '添加到这一刻' }));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ provider: 'netease', title: '晴天', artist: '周杰伦', coverUrl: '', playbackUrl: '' }));
  });

  it('shows loading then renders remotely identified title, artist and cover', async () => {
    let finish!: (value: any) => void;
    const resolveMetadata = vi.fn().mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<EmotionMusicPicker onConfirm={vi.fn()} onCancel={vi.fn()} resolveMetadata={resolveMetadata} />);
    fireEvent.change(screen.getByLabelText('音乐分享链接'), { target: { value: 'https://music.163.com/song?id=1495784933' } });
    fireEvent.click(screen.getByRole('button', { name: '识别音乐' }));
    expect(screen.getByRole('button', { name: '正在识别' })).toBeDisabled();
    finish({ provider: 'netease', title: 'EVERYTHING', artist: 'Way Ched / BIBI', coverUrl: 'https://p1.music.126.net/cover.jpg', sourceUrl: 'https://music.163.com/song?id=1495784933' });
    expect(await screen.findByText('EVERYTHING')).toBeInTheDocument();
    expect(screen.getByText(/Way Ched \/ BIBI/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'EVERYTHING 封面' })).toHaveAttribute('src', 'https://p1.music.126.net/cover.jpg');
  });

  it('explains remote failure and allows only the safe link to be saved', async () => {
    const onConfirm = vi.fn();
    const resolveMetadata = vi.fn().mockRejectedValue(Object.assign(new Error('音乐平台响应超时，请稍后重试'), { code: 'UPSTREAM_TIMEOUT' }));
    render(<EmotionMusicPicker onConfirm={onConfirm} onCancel={vi.fn()} resolveMetadata={resolveMetadata} />);
    fireEvent.change(screen.getByLabelText('音乐分享链接'), { target: { value: 'https://music.163.com/song?id=1' } });
    fireEvent.click(screen.getByRole('button', { name: '识别音乐' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('音乐平台响应超时，请稍后重试');
    fireEvent.click(screen.getByRole('button', { name: '仅保存链接' }));
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ title: '网易云音乐收藏', sourceUrl: 'https://music.163.com/song?id=1', coverUrl: '' }));
  });

  it('keeps generic safe music pages as an offline link-only fallback and supports cancel', async () => {
    const onCancel = vi.fn();
    render(<EmotionMusicPicker onConfirm={vi.fn()} onCancel={onCancel} resolveMetadata={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('音乐分享链接'), { target: { value: 'https://example.com/music/1' } });
    fireEvent.click(screen.getByRole('button', { name: '识别音乐' }));
    expect(await screen.findByText('音乐网页收藏')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '仅保存链接' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '取消音乐收藏' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('ignores an obsolete request after the pasted link changes', async () => {
    let finish!: (value: any) => void;
    const resolveMetadata = vi.fn().mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<EmotionMusicPicker onConfirm={vi.fn()} onCancel={vi.fn()} resolveMetadata={resolveMetadata} />);
    const input = screen.getByLabelText('音乐分享链接');
    fireEvent.change(input, { target: { value: 'https://music.163.com/song?id=1' } });
    fireEvent.click(screen.getByRole('button', { name: '识别音乐' }));
    fireEvent.change(input, { target: { value: 'https://music.163.com/song?id=2' } });
    finish({ provider: 'netease', title: '旧结果', artist: '', coverUrl: '', sourceUrl: 'https://music.163.com/song?id=1' });
    await waitFor(() => expect(screen.queryByText('旧结果')).not.toBeInTheDocument());
  });

  it('aborts an in-flight request when the link changes and when the picker unmounts', async () => {
    const signals: AbortSignal[] = [];
    const resolveMetadata = vi.fn((_url: string, signal?: AbortSignal) => {
      if (signal) signals.push(signal);
      return new Promise(() => undefined);
    });
    const view = render(<EmotionMusicPicker onConfirm={vi.fn()} onCancel={vi.fn()} resolveMetadata={resolveMetadata} />);
    const input = screen.getByLabelText('音乐分享链接');
    fireEvent.change(input, { target: { value: 'https://music.163.com/song?id=1' } });
    fireEvent.click(screen.getByRole('button', { name: '识别音乐' }));
    fireEvent.change(input, { target: { value: 'https://music.163.com/song?id=2' } });
    expect(signals[0]?.aborted).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '识别音乐' }));
    view.unmount();
    expect(signals[1]?.aborted).toBe(true);
  });
});
