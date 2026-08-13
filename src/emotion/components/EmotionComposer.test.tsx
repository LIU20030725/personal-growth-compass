import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmotionComposer } from './EmotionComposer';

class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = [];
  mimeType = 'audio/webm';
  state = 'inactive';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  stop = vi.fn(() => {
    if (this.state === 'inactive') return;
    this.state = 'inactive';
    this.onstop?.();
  });
  start = vi.fn(() => { this.state = 'recording'; });
  constructor(public stream: MediaStream) { FakeMediaRecorder.instances.push(this); }
}

describe('EmotionComposer media lifecycle', () => {
  const trackStop = vi.fn();
  const stream = { getTracks: () => [{ stop: trackStop }] } as unknown as MediaStream;

  beforeEach(() => {
    FakeMediaRecorder.instances = [];
    trackStop.mockClear();
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
  });

  afterEach(() => { vi.unstubAllGlobals(); });

  it('keeps the selected state on the mood button rather than the artwork', () => {
    render(<EmotionComposer onClose={vi.fn()} onSave={vi.fn()} />);
    const calm = screen.getByRole('radio', { name: '平静' });
    fireEvent.click(calm);
    expect(calm).toHaveAttribute('aria-checked', 'true');
    expect(calm).toHaveClass('is-selected');
    expect(calm.querySelector('.emotion-face')).not.toHaveClass('is-selected');
    expect(calm.querySelector('svg[data-reference-face="calm"]')).not.toHaveClass('is-selected');
  });

  it('录音中关闭编辑器会停止 recorder 与全部 tracks', async () => {
    const onClose = vi.fn();
    render(<EmotionComposer onClose={onClose} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '语音' }));
    await screen.findByRole('button', { name: '结束录音' });
    fireEvent.click(screen.getByRole('button', { name: '关闭记录' }));

    expect(FakeMediaRecorder.instances[0].stop).toHaveBeenCalledOnce();
    expect(trackStop).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('组件卸载会停止仍在录制的 recorder 与 tracks', async () => {
    const view = render(<EmotionComposer onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '语音' }));
    await screen.findByRole('button', { name: '结束录音' });
    view.unmount();

    expect(FakeMediaRecorder.instances[0].stop).toHaveBeenCalledOnce();
    expect(trackStop).toHaveBeenCalledOnce();
  });

  it('保存中禁止关闭编辑器', async () => {
    let resolveSave!: (value: string) => void;
    const save = new Promise<string>((resolve) => { resolveSave = resolve; });
    render(<EmotionComposer onClose={vi.fn()} onSave={() => save} />);
    fireEvent.click(screen.getByRole('radio', { name: '平静' }));
    fireEvent.click(screen.getByRole('button', { name: '保存这一刻' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '关闭记录' })).toBeDisabled());
    await act(async () => resolveSave('entry'));
  });

  it('初始化焦点、Tab 圈定与 Escape 均遵循模态对话框行为', () => {
    const onClose = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<EmotionComposer onClose={onClose} onSave={vi.fn()} />);
    const closeButton = screen.getByRole('button', { name: '关闭记录' });
    const saveButton = screen.getByRole('button', { name: '保存这一刻' });
    expect(closeButton).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(saveButton).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(closeButton).toHaveFocus();

    fireEvent.click(screen.getByRole('radio', { name: '平静' }));
    const note = screen.getByLabelText('文字日记');
    note.focus();
    fireEvent.change(note, { target: { value: '保持输入焦点' } });
    expect(note).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(confirm).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('编辑时可预览并移除现有附件', async () => {
    const onSave = vi.fn().mockResolvedValue('entry');
    render(<EmotionComposer
      initial={{
        moodId: 'calm', activityIds: [], note: '', attachments: [{
          id: 'photo-1', kind: 'image', fileName: '旅行.webp', mimeType: 'image/webp', size: 12,
          durationMs: null, width: null, height: null, isFavorite: false
        }]
      }}
      getBlob={vi.fn().mockResolvedValue(new Blob(['photo'], { type: 'image/webp' }))}
      onClose={vi.fn()}
      onSave={onSave}
    />);
    expect(screen.getByText('旅行.webp')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '移除 旅行.webp' }));
    expect(screen.queryByText('旅行.webp')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '保存这一刻' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ attachments: [] }), []));
  });

  it('为每个活动提供可辨识的图标', () => {
    render(<EmotionComposer onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByRole('checkbox', { name: '旅行' }).querySelector('svg')).not.toBeNull();
  });
});
