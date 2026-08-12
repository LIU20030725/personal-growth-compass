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

  it('renders scalable CSS anatomy without a system emoji glyph', () => {
    const { container } = render(<><EmotionIcon moodId="excited" /><span>after</span></>);
    const face = container.querySelector('.emotion-face');
    expect(face).toHaveAttribute('data-mood-group', 'uplifted');
    expect(face).toHaveAttribute('aria-hidden', 'true');
    expect(face).toHaveTextContent('');
    expect(face?.querySelectorAll('.emotion-face__eye')).toHaveLength(2);
    expect(face?.querySelector('.emotion-face__spark')).toBeInTheDocument();
    expect(screen.getByText('after')).toBeInTheDocument();
  });

  it('falls back to calm while retaining the requested size', () => {
    const { container } = render(<EmotionIcon moodId="legacy-unknown" size="large" />);
    expect(container.querySelector('.emotion-face--large')).toHaveClass('emotion-face--calm');
  });
});
