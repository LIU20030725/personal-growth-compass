import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmotionMusicCard } from './EmotionMusicCard';

const base = {
  id: 'song-1',
  provider: 'netease' as const,
  title: '晴天',
  artist: '周杰伦',
  sourceUrl: 'https://music.163.com/song?id=1',
  playbackUrl: '',
  isFavorite: true
};

describe('EmotionMusicCard', () => {
  it('falls back to the original platform when no browser-playable URL exists', () => {
    render(<EmotionMusicCard music={base} />);

    expect(screen.getByText('晴天')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '去网易云音乐收听晴天' })).toHaveAttribute('href', base.sourceUrl);
  });

  it('renders an in-app player when a playback URL exists', () => {
    render(<EmotionMusicCard music={{ ...base, playbackUrl: 'https://cdn.example.com/song.mp3' }} />);

    expect(screen.getByRole('button', { name: '播放晴天' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /收听晴天/ })).not.toBeInTheDocument();
  });
});
