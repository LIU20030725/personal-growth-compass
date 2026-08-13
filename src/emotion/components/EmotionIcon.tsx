import type { ReactNode } from 'react';
import { moodById } from '../emotionConfig';

interface EmotionIconProps {
  moodId: string;
  size?: 'small' | 'medium' | 'large';
  selected?: boolean;
}

const ink = '#26332f';
const cheek = '#ef8f83';

function Eyes({ kind = 'dot' }: { kind?: 'dot' | 'closed' | 'half' | 'wide' | 'side-left' | 'side-right' | 'squeezed' | 'star' }) {
  if (kind === 'closed') return <g className="emotion-face__eye"><path fill="none" d="M25 42q7 8 14 0M61 42q7 8 14 0" /></g>;
  if (kind === 'half') return <g className="emotion-face__eye"><path fill="none" d="M25 40h14M61 40h14" /><circle cx="34" cy="43" r="3.3" /><circle cx="66" cy="43" r="3.3" /></g>;
  if (kind === 'wide') return <g className="emotion-face__eye"><circle className="eye-white" cx="33" cy="42" r="8" /><circle className="eye-white" cx="67" cy="42" r="8" /><circle cx="33" cy="42" r="3.5" /><circle cx="67" cy="42" r="3.5" /></g>;
  if (kind === 'side-left') return <g className="emotion-face__eye"><ellipse className="eye-white" cx="33" cy="42" rx="8" ry="6" /><ellipse className="eye-white" cx="67" cy="42" rx="8" ry="6" /><circle cx="29" cy="42" r="3.5" /><circle cx="63" cy="42" r="3.5" /></g>;
  if (kind === 'side-right') return <g className="emotion-face__eye"><ellipse className="eye-white" cx="33" cy="42" rx="8" ry="6" /><ellipse className="eye-white" cx="67" cy="42" rx="8" ry="6" /><circle cx="37" cy="42" r="3.5" /><circle cx="71" cy="42" r="3.5" /></g>;
  if (kind === 'squeezed') return <g className="emotion-face__eye"><path fill="none" d="m24 39 12 6-12 6M76 39l-12 6 12 6" /></g>;
  if (kind === 'star') return <g className="emotion-face__eye emotion-face__eye--star"><path d="m32 31 3 8 8 3-8 3-3 8-3-8-8-3 8-3zM68 31l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" /></g>;
  return <g className="emotion-face__eye"><circle cx="33" cy="42" r="4.5" /><circle cx="67" cy="42" r="4.5" /></g>;
}

function Brows({ kind = 'none' }: { kind?: 'none' | 'flat' | 'sad' | 'angry' }) {
  if (kind === 'flat') return <g className="emotion-face__brow"><path fill="none" d="M25 31h16M59 31h16" /></g>;
  if (kind === 'sad') return <g className="emotion-face__brow"><path fill="none" d="m24 34 14-5M62 29l14 5" /></g>;
  if (kind === 'angry') return <g className="emotion-face__brow"><path fill="none" d="m24 29 15 7M61 36l15-7" /></g>;
  return null;
}

function Mouth({ kind = 'smile' }: { kind?: 'smile' | 'open' | 'flat' | 'sad' | 'o' | 'teeth' | 'box' | 'wave' }) {
  if (kind === 'open') return <g className="emotion-face__mouth emotion-face__mouth--open"><path d="M37 57h26c0 15-7 21-13 21s-13-6-13-21Z" /><path className="emotion-face__tongue" d="M42 73q8-7 16 0" /></g>;
  if (kind === 'flat') return <path fill="none" className="emotion-face__mouth" d="M42 65h16" />;
  if (kind === 'sad') return <path fill="none" className="emotion-face__mouth" d="M39 70q11-13 22 0" />;
  if (kind === 'o') return <ellipse className="emotion-face__mouth" cx="50" cy="65" rx="9" ry="11" />;
  if (kind === 'teeth') return <g className="emotion-face__mouth"><rect className="mouth-white" x="35" y="59" width="30" height="13" rx="5" /><path d="M41 60v11M47 60v11M53 60v11M59 60v11" /></g>;
  if (kind === 'box') return <rect className="emotion-face__mouth mouth-white" x="38" y="59" width="24" height="13" rx="1" />;
  if (kind === 'wave') return <path className="emotion-face__mouth" d="m35 67 5-4 5 5 5-5 5 5 5-5 5 4" />;
  return <path fill="none" className="emotion-face__mouth" d="M39 59q11 14 22 0" />;
}

function Blush() {
  return <g className="emotion-face__cheek"><circle cx="20" cy="57" r="7" /><circle cx="80" cy="57" r="7" /></g>;
}

function Decoration({ moodId }: { moodId: string }) {
  const common = { 'data-decoration': moodId };
  switch (moodId) {
    case 'excited': return <path {...common} className="decoration decoration--gold" d="m88 8 3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />;
    case 'grateful': return <path {...common} className="decoration decoration--heart" d="M84 15c-7-10-18 0 0 14 18-14 7-24 0-14Z" />;
    case 'relaxed': return <g {...common} className="decoration decoration--breath"><path d="M76 53c8-8 15-2 12 4 9-2 12 8 5 12-4 3-8 1-10-2-4 6-13 1-10-5-8 1-9-8 3-9Z" /><path d="M70 56q8 5 13 1" /></g>;
    case 'clear': return <g {...common} className="decoration decoration--blue"><path d="M88 10 85 28" /><circle cx="84" cy="37" r="2.5" /></g>;
    case 'tired': return <g {...common} className="decoration decoration--purple"><circle cx="82" cy="20" r="5" /><circle cx="91" cy="9" r="3" /></g>;
    case 'lonely': return <g {...common} className="decoration decoration--purple"><circle cx="86" cy="48" r="5" /></g>;
    case 'sad': return <g {...common} className="decoration decoration--blue decoration--tears"><path d="M27 50c-8 11 8 13 3 0ZM70 50c-8 11 8 13 3 0Z" /></g>;
    case 'anxious': return <path {...common} className="decoration decoration--blue" d="M83 24c-12 17 10 20 5 0Z" />;
    case 'stressed': return <g {...common} className="decoration"><path d="M80 8v15M89 12v15" /></g>;
    case 'angry': return <g {...common} className="decoration decoration--steam"><path d="M18 20c-13-8-14 8-4 8-9 7 3 14 10 6M82 20c13-8 14 8 4 8 9 7-3 14-10 6" /></g>;
    case 'confused': return <g {...common} className="decoration"><path d="M78 17c3-9 20-7 18 3-1 6-9 5-9 11" /><circle cx="86" cy="39" r="2" /></g>;
    case 'overwhelmed': return <g {...common} className="decoration"><path d="M79 12h8V4M91 15h8M82 22l-7 7" /></g>;
    default: return null;
  }
}

function FaceFeatures({ moodId }: { moodId: string }): ReactNode {
  switch (moodId) {
    case 'happy': return <><Eyes kind="closed" /><Mouth kind="open" /><Blush /></>;
    case 'excited': return <><Eyes kind="star" /><Mouth kind="open" /><Decoration moodId={moodId} /></>;
    case 'grateful': return <><Eyes kind="closed" /><Mouth /><Blush /><Decoration moodId={moodId} /></>;
    case 'satisfied': return <><Eyes kind="half" /><Mouth /></>;
    case 'calm': return <><Eyes /><Mouth /></>;
    case 'relaxed': return <><Eyes kind="closed" /><Mouth /><Decoration moodId={moodId} /></>;
    case 'focused': return <><Brows kind="flat" /><Eyes /><Mouth kind="flat" /></>;
    case 'clear': return <><Eyes kind="wide" /><Mouth kind="flat" /><Decoration moodId={moodId} /></>;
    case 'tired': return <><Brows kind="sad" /><Eyes kind="half" /><Mouth kind="o" /><Decoration moodId={moodId} /></>;
    case 'bored': return <><Eyes kind="side-left" /><Mouth kind="flat" /></>;
    case 'down': return <><Brows kind="sad" /><Eyes kind="side-left" /><Mouth kind="sad" /></>;
    case 'lonely': return <><Eyes kind="side-right" /><Mouth kind="flat" /><Decoration moodId={moodId} /></>;
    case 'sad': return <><Brows kind="sad" /><Eyes /><Mouth kind="sad" /><Decoration moodId={moodId} /></>;
    case 'anxious': return <><Brows kind="sad" /><Eyes kind="wide" /><Mouth kind="wave" /><Decoration moodId={moodId} /></>;
    case 'stressed': return <><Eyes kind="squeezed" /><Mouth kind="box" /><Decoration moodId={moodId} /></>;
    case 'angry': return <><Brows kind="angry" /><Eyes /><Mouth kind="sad" /><Decoration moodId={moodId} /></>;
    case 'confused': return <><Eyes kind="side-right" /><Mouth kind="sad" /><Decoration moodId={moodId} /></>;
    case 'overwhelmed': return <><Eyes kind="squeezed" /><Mouth kind="teeth" /><Decoration moodId={moodId} /></>;
    default: return <><Eyes /><Mouth /></>;
  }
}

export function EmotionIcon({ moodId, size = 'medium', selected = false }: EmotionIconProps) {
  const mood = moodById.get(moodId) ?? moodById.get('calm')!;
  const gradientId = `emotion-gradient-${mood.id}`;
  return (
    <span className={`emotion-face emotion-face--svg emotion-face--${size} emotion-face--${mood.id}${selected ? ' is-selected' : ''}`} data-mood-group={mood.group} aria-hidden="true">
      <svg data-reference-face={mood.id} viewBox="-6 -6 112 112" focusable="false">
        <defs><radialGradient id={gradientId} cx="30%" cy="24%" r="78%"><stop offset="0" stopColor="#fff" stopOpacity=".58" /><stop offset=".46" stopColor={mood.color} /><stop offset="1" stopColor={mood.color} stopOpacity=".94" /></radialGradient></defs>
        <circle className="emotion-face__base" cx="50" cy="50" r="43" fill={`url(#${gradientId})`} />
        <g className="emotion-face__features" fill={ink} stroke={ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <FaceFeatures moodId={mood.id} />
        </g>
      </svg>
    </span>
  );
}
