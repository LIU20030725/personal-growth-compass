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
  it('renders a recognized cover without changing the navigation behavior', () => {
    render(<EmotionMusicCard music={{ ...base, coverUrl: 'https://p1.music.126.net/cover.jpg' }} />);
    expect(screen.getByRole('img', { name: `${base.title} 封面` })).toHaveAttribute('src', 'https://p1.music.126.net/cover.jpg');
  });

  it('opens the original platform in a safe new tab when no browser-playable URL exists', () => {
    render(<EmotionMusicCard music={base} />);

    expect(screen.getByText('晴天')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: '去网易云音乐听晴天' });
    expect(link).toHaveAttribute('href', base.sourceUrl);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(link).toHaveTextContent('去听这首歌');
  });

  it('renders an in-app player when a playback URL exists', () => {
    render(<EmotionMusicCard music={{ ...base, playbackUrl: 'https://cdn.example.com/song.mp3' }} />);

    expect(screen.getByRole('button', { name: '播放晴天' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /收听晴天/ })).not.toBeInTheDocument();
  });

  it('never renders a dangerous navigation target', () => {
    render(<EmotionMusicCard music={{ ...base, sourceUrl: 'javascript:alert(1)' }} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('链接不可用')).toBeInTheDocument();
  });
});
