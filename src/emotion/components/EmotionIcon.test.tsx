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

  it('renders the original reference pixels without a system emoji glyph', () => {
    const { container } = render(<><EmotionIcon moodId="excited" /><span>after</span></>);
    const face = container.querySelector('.emotion-face');
    expect(face).toHaveAttribute('data-mood-group', 'uplifted');
    expect(face).toHaveAttribute('aria-hidden', 'true');
    expect(face).toHaveTextContent('');
    expect(face?.querySelector('svg[data-reference-face="excited"] image')).toBeInTheDocument();
    expect(face?.querySelector('path, circle, ellipse, rect, line, polygon')).not.toBeInTheDocument();
    expect(screen.getByText('after')).toBeInTheDocument();
  });

  it('crops one untouched region from the supplied atlas for every mood', () => {
    const { container } = render(<>{moodPresets.map((mood) => <EmotionIcon key={mood.id} moodId={mood.id} />)}</>);
    expect(container.querySelectorAll('svg[data-reference-face]')).toHaveLength(18);
    for (const mood of moodPresets) {
      expect(container.querySelector(`[data-reference-face="${mood.id}"]`)).toBeInTheDocument();
    }
  });

  it('uses the supplied reference atlas directly and never reconstructs the artwork', () => {
    const { container } = render(<>{moodPresets.map((mood) => <EmotionIcon key={mood.id} moodId={mood.id} />)}</>);
    const images = container.querySelectorAll('svg[data-reference-face] image');
    expect(images).toHaveLength(18);
    expect(new Set(Array.from(images, (image) => image.getAttribute('href'))).size).toBe(1);
    expect(container.querySelector('path, circle, ellipse, rect, line, polygon')).not.toBeInTheDocument();
  });

  it('falls back to calm while retaining the requested size', () => {
    const { container } = render(<EmotionIcon moodId="legacy-unknown" size="large" />);
    expect(container.querySelector('.emotion-face--large')).toHaveClass('emotion-face--calm');
  });
});
