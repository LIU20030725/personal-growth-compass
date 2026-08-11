import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EmotionAudioPlayer } from './EmotionAudioPlayer';

describe('EmotionAudioPlayer', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uses the central round button to play and pause audio', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    render(<EmotionAudioPlayer src="blob:voice" label="晚间语音" durationMs={25_000} />);

    fireEvent.click(screen.getByRole('button', { name: '播放晚间语音' }));
    expect(play).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: '暂停晚间语音' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '暂停晚间语音' }));
    expect(pause).toHaveBeenCalledTimes(1);
  });

  it('shows a readable error when playback is rejected', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('blocked'));
    render(<EmotionAudioPlayer src="blob:voice" label="晨间语音" durationMs={5_000} />);

    fireEvent.click(screen.getByRole('button', { name: '播放晨间语音' }));

    expect(await screen.findByText('暂时无法播放这段声音')).toBeInTheDocument();
  });
});
