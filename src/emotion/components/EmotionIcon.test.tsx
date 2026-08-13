import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { moodGroups, moodPresets } from '../emotionConfig';
import { EmotionIcon } from './EmotionIcon';

describe('EmotionIcon v1.3 atlas', () => {
  it('keeps all 18 confirmed moods in the four semantic groups', () => {
    expect(moodPresets).toHaveLength(18);
    expect(new Set(moodPresets.map((mood) => mood.id)).size).toBe(18);
    expect(moodGroups.map((group) => group.label)).toEqual(['愉悦', '平稳', '低能量', '高压力']);
    expect(moodPresets.filter((mood) => mood.group === 'uplifted')).toHaveLength(4);
    expect(moodPresets.filter((mood) => mood.group === 'steady')).toHaveLength(4);
    expect(moodPresets.filter((mood) => mood.group === 'low-energy')).toHaveLength(5);
    expect(moodPresets.filter((mood) => mood.group === 'high-pressure')).toHaveLength(5);
  });

  it('renders scalable vector anatomy without a system emoji glyph', () => {
    const { container } = render(<><EmotionIcon moodId="excited" /><span>after</span></>);
    const face = container.querySelector('.emotion-face');
    expect(face).toHaveAttribute('data-mood-group', 'uplifted');
    expect(face).toHaveAttribute('aria-hidden', 'true');
    expect(face).toHaveTextContent('');
    expect(face?.querySelector('svg[data-reference-face="excited"]')).toBeInTheDocument();
    expect(face?.querySelector('[data-decoration="excited"]')).toBeInTheDocument();
    expect(screen.getByText('after')).toBeInTheDocument();
  });

  it('renders the reference atlas as one dedicated SVG face per mood', () => {
    const { container } = render(<>{moodPresets.map((mood) => <EmotionIcon key={mood.id} moodId={mood.id} />)}</>);
    expect(container.querySelectorAll('svg[data-reference-face]')).toHaveLength(18);
    for (const mood of moodPresets) {
      expect(container.querySelector(`[data-reference-face="${mood.id}"]`)).toBeInTheDocument();
    }
  });

  it('matches the reference decorations instead of reusing generic marks', () => {
    const decorated = ['excited', 'grateful', 'relaxed', 'clear', 'tired', 'lonely', 'sad', 'anxious', 'stressed', 'angry', 'confused', 'overwhelmed'];
    const { container } = render(<>{decorated.map((moodId) => <EmotionIcon key={moodId} moodId={moodId} />)}</>);
    for (const moodId of decorated) {
      expect(container.querySelector(`[data-reference-face="${moodId}"] [data-decoration="${moodId}"]`)).toBeInTheDocument();
    }
  });

  it('keeps line-art eyes, brows and mouths unfilled like the reference', () => {
    const { container } = render(<><EmotionIcon moodId="happy" /><EmotionIcon moodId="stressed" /><EmotionIcon moodId="focused" /></>);
    expect(container.querySelector('[data-reference-face="happy"] .emotion-face__eye path')).toHaveAttribute('fill', 'none');
    expect(container.querySelector('[data-reference-face="stressed"] .emotion-face__eye path')).toHaveAttribute('fill', 'none');
    expect(container.querySelector('[data-reference-face="focused"] .emotion-face__brow path')).toHaveAttribute('fill', 'none');
    expect(container.querySelector('[data-reference-face="focused"] .emotion-face__mouth')).toHaveAttribute('fill', 'none');
  });

  it('falls back to calm while retaining the requested size', () => {
    const { container } = render(<EmotionIcon moodId="legacy-unknown" size="large" />);
    expect(container.querySelector('.emotion-face--large')).toHaveClass('emotion-face--calm');
  });
});
