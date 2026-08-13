import type { ReactElement, ReactNode } from 'react';

export interface FaceArtworkProps { id: string }
type FaceArtwork = (props: FaceArtworkProps) => ReactElement;

const ink = '#26332f';
const rose = '#ef8f83';

function Gradient({ id, light, base, edge }: { id: string; light: string; base: string; edge: string }) {
  return <defs><radialGradient id={id} cx="31%" cy="22%" r="78%"><stop offset="0" stopColor={light} /><stop offset="58%" stopColor={base} /><stop offset="100%" stopColor={edge} /></radialGradient></defs>;
}

function Canvas({ mood, children }: { mood: string; children: ReactNode }) {
  return <svg data-reference-face={mood} data-testid={`emotion-face-${mood}`} viewBox="0 0 120 120" fill="none" focusable="false" aria-hidden="true">{children}</svg>;
}

function HappyFace({ id }: FaceArtworkProps) {
  const g = `${id}-fill`;
  return <Canvas mood="happy"><Gradient id={g} light="#fff0bc" base="#ffda7e" edge="#f4cb69" /><circle cx="56" cy="57" r="42" fill={`url(#${g})`} /><path d="M35 52c2-7 12-7 14 0M64 52c2-7 12-7 14 0" stroke={ink} strokeWidth="3.5" strokeLinecap="round" /><circle cx="29" cy="67" r="6" fill={rose} opacity=".85" /><circle cx="83" cy="67" r="6" fill={rose} opacity=".85" /><path d="M44 67h24c-1 13-7 18-12 18s-11-5-12-18Z" fill={ink} /><path d="M48 78c5-4 11-4 16 0-2 4-5 6-8 6s-6-2-8-6Z" fill="#f18d82" /></Canvas>;
}

function ExcitedFace({ id }: FaceArtworkProps) {
  const g = `${id}-fill`;
  return <Canvas mood="excited"><Gradient id={g} light="#fff1b9" base="#ffdc82" edge="#f2c965" /><circle cx="55" cy="59" r="42" fill={`url(#${g})`} /><path d="m38 43 2.4 6.4 6.6 2.4-6.6 2.4L38 61l-2.4-6.8-6.6-2.4 6.6-2.4L38 43Zm34 0 2.4 6.4 6.6 2.4-6.6 2.4L72 61l-2.4-6.8-6.6-2.4 6.6-2.4L72 43Z" fill="#9c7018" /><path d="M43 68h24c-1 12-6 17-12 17s-11-5-12-17Z" fill={ink} /><path d="M48 79c4-3 10-3 14 0-2 3-4 4-7 4s-5-1-7-4Z" fill="#f18d82" /><path d="m102 11 3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8Z" fill="#d7990d" /></Canvas>;
}

function GratefulFace({ id }: FaceArtworkProps) {
  const g = `${id}-fill`;
  return <Canvas mood="grateful"><Gradient id={g} light="#fff1bd" base="#ffdb81" edge="#f4cb6c" /><circle cx="53" cy="58" r="42" fill={`url(#${g})`} /><path d="M30 52c3 8 13 8 16 0M61 52c3 8 13 8 16 0M45 70c5 7 12 7 17 0" stroke={ink} strokeWidth="3.3" strokeLinecap="round" /><circle cx="27" cy="65" r="6" fill={rose} opacity=".8" /><circle cx="79" cy="65" r="6" fill={rose} opacity=".8" /><path d="M91 20c-7-9-18 1 0 15 18-14 7-24 0-15Z" fill="#ef7370" /></Canvas>;
}

function SatisfiedFace({ id }: FaceArtworkProps) {
  const g = `${id}-fill`;
  return <Canvas mood="satisfied"><Gradient id={g} light="#ffefb5" base="#ffda79" edge="#f2c865" /><circle cx="56" cy="58" r="42" fill={`url(#${g})`} /><path d="M32 49h17M64 49h17" stroke={ink} strokeWidth="3.5" strokeLinecap="round" /><circle cx="42" cy="53" r="3.6" fill={ink} /><circle cx="71" cy="53" r="3.6" fill={ink} /><path d="M47 69c5 7 12 7 17 0" stroke={ink} strokeWidth="3.2" strokeLinecap="round" /></Canvas>;
}

function CalmFace({ id }: FaceArtworkProps) {
  const g = `${id}-fill`;
  return <Canvas mood="calm"><Gradient id={g} light="#d8f1e8" base="#aedbcd" edge="#9bcfbe" /><circle cx="56" cy="58" r="42" fill={`url(#${g})`} /><circle cx="39" cy="55" r="4.7" fill={ink} /><circle cx="73" cy="55" r="4.7" fill={ink} /><path d="M45 70c5 7 12 7 17 0" stroke={ink} strokeWidth="3.2" strokeLinecap="round" /></Canvas>;
}

function RelaxedFace({ id }: FaceArtworkProps) {
  const g = `${id}-fill`;
  return <Canvas mood="relaxed"><Gradient id={g} light="#d9f2ea" base="#acd9cb" edge="#98ccbc" /><circle cx="51" cy="58" r="42" fill={`url(#${g})`} /><path d="M27 53c3 7 13 7 16 0M58 53c3 7 13 7 16 0M43 69c4 5 10 5 14 0" stroke={ink} strokeWidth="3.2" strokeLinecap="round" /><path d="M82 65c7-8 15-2 12 5 9-2 13 7 6 12-4 3-8 1-10-2-4 7-14 2-11-5-9 1-10-8 3-10Z" fill="#fff" stroke="#8bc8ed" strokeWidth="1.5" /><path d="M75 69c7 4 11 3 15 0" stroke="#8bc8ed" strokeWidth="1.5" strokeLinecap="round" /></Canvas>;
}

function FocusedFace({ id }: FaceArtworkProps) {
  const g = `${id}-fill`;
  return <Canvas mood="focused"><Gradient id={g} light="#d9f1e9" base="#add9cc" edge="#99cbbb" /><circle cx="56" cy="58" r="42" fill={`url(#${g})`} /><path d="M31 43h17M64 43h17" stroke={ink} strokeWidth="3.2" strokeLinecap="round" /><circle cx="40" cy="55" r="4.7" fill={ink} /><circle cx="72" cy="55" r="4.7" fill={ink} /><path d="M48 72h16" stroke={ink} strokeWidth="3.2" strokeLinecap="round" /></Canvas>;
}

function ClearFace({ id }: FaceArtworkProps) {
  const g = `${id}-fill`;
  return <Canvas mood="clear"><Gradient id={g} light="#dff1ff" base="#a9d4f2" edge="#92c6e9" /><circle cx="54" cy="59" r="42" fill={`url(#${g})`} /><circle cx="38" cy="54" r="8" fill="#fff" stroke={ink} strokeWidth="2.5" /><circle cx="70" cy="54" r="8" fill="#fff" stroke={ink} strokeWidth="2.5" /><circle cx="38" cy="54" r="3.2" fill={ink} /><circle cx="70" cy="54" r="3.2" fill={ink} /><path d="M47 73h14" stroke={ink} strokeWidth="3" strokeLinecap="round" /><path d="M99 18 96 37" stroke="#2d94dc" strokeWidth="5" strokeLinecap="round" /><circle cx="94" cy="47" r="3" fill="#2d94dc" /></Canvas>;
}

function TiredFace({ id }: FaceArtworkProps) {
  const g = `${id}-fill`;
  return <Canvas mood="tired"><Gradient id={g} light="#eeeaff" base="#c9bfe9" edge="#b9acdF" /><circle cx="52" cy="62" r="39" fill={`url(#${g})`} /><path d="m29 50 14-4M61 46l14 4" stroke={ink} strokeWidth="3" strokeLinecap="round" /><path d="M29 56c4 5 10 5 14 0M61 56c4 5 10 5 14 0" stroke={ink} strokeWidth="2.7" strokeLinecap="round" /><ellipse cx="52" cy="73" rx="8" ry="10" fill="#715b72" stroke={ink} strokeWidth="2.5" /><circle cx="88" cy="28" r="6" fill="#9587d2" /><circle cx="99" cy="14" r="4" fill="#9587d2" /></Canvas>;
}

function BoredFace({ id }: FaceArtworkProps) {
  const g = `${id}-fill`;
  return <Canvas mood="bored"><Gradient id={g} light="#eeeaff" base="#c9bee8" edge="#b9addd" /><circle cx="56" cy="61" r="39" fill={`url(#${g})`} /><ellipse cx="40" cy="55" rx="8" ry="6" fill="#fff" /><ellipse cx="72" cy="55" rx="8" ry="6" fill="#fff" /><circle cx="36" cy="55" r="3.8" fill={ink} /><circle cx="68" cy="55" r="3.8" fill={ink} /><path d="M48 73h17" stroke={ink} strokeWidth="3" strokeLinecap="round" /></Canvas>;
}

function DownFace({ id }: FaceArtworkProps) {
  const g = `${id}-fill`;
  return <Canvas mood="down"><Gradient id={g} light="#eeeaff" base="#c8bde7" edge="#b7aadc" /><circle cx="56" cy="61" r="39" fill={`url(#${g})`} /><path d="m30 50 13-5M69 45l13 5" stroke={ink} strokeWidth="3" strokeLinecap="round" /><circle cx="39" cy="57" r="4" fill={ink} /><circle cx="73" cy="57" r="4" fill={ink} /><path d="M45 77c5-8 14-8 20 0" stroke={ink} strokeWidth="3" strokeLinecap="round" /></Canvas>;
}

function LonelyFace({ id }: FaceArtworkProps) {
  const g = `${id}-fill`;
  return <Canvas mood="lonely"><Gradient id={g} light="#eeeaff" base="#c9bee8" edge="#b8abdd" /><circle cx="52" cy="61" r="39" fill={`url(#${g})`} /><ellipse cx="37" cy="55" rx="8" ry="6" fill="#fff" /><ellipse cx="68" cy="55" rx="8" ry="6" fill="#fff" /><circle cx="41" cy="55" r="3.7" fill={ink} /><circle cx="72" cy="55" r="3.7" fill={ink} /><path d="M45 74h15" stroke={ink} strokeWidth="3" strokeLinecap="round" /><circle cx="99" cy="56" r="6" fill="#9b8bd3" /></Canvas>;
}

function SadFace({ id }: FaceArtworkProps) {
  const g = `${id}-fill`;
  return <Canvas mood="sad"><Gradient id={g} light="#eeeaff" base="#c8bde7" edge="#b7aadd" /><circle cx="55" cy="61" r="39" fill={`url(#${g})`} /><path d="m30 49 13-5M67 44l13 5" stroke={ink} strokeWidth="3" strokeLinecap="round" /><circle cx="39" cy="56" r="4" fill={ink} /><circle cx="71" cy="56" r="4" fill={ink} /><path d="M44 78c5-9 15-9 21 0" stroke={ink} strokeWidth="3" strokeLinecap="round" /><path d="M33 62c-8 12 8 14 3 0ZM75 62c-8 12 8 14 3 0Z" fill="#63b8ea" /></Canvas>;
}

function AnxiousFace({ id }: FaceArtworkProps) {
  const g = `${id}-fill`;
  return <Canvas mood="anxious"><Gradient id={g} light="#ffd5ce" base="#f6aaa0" edge="#ed9389" /><circle cx="52" cy="62" r="39" fill={`url(#${g})`} /><path d="m29 47 13-6M63 41l13 6" stroke={ink} strokeWidth="3" strokeLinecap="round" /><circle cx="38" cy="56" r="8" fill="#fff" stroke={ink} strokeWidth="2.3" /><circle cx="68" cy="56" r="8" fill="#fff" stroke={ink} strokeWidth="2.3" /><circle cx="38" cy="56" r="3" fill={ink} /><circle cx="68" cy="56" r="3" fill={ink} /><path d="m39 76 4-4 5 5 5-5 5 5 5-5 4 4" stroke={ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><path d="M89 25c-13 18 11 21 6 0Z" fill="#62b6e5" /></Canvas>;
}

function StressedFace({ id }: FaceArtworkProps) {
  const g = `${id}-fill`;
  return <Canvas mood="stressed"><Gradient id={g} light="#ffe0d4" base="#f8b5a0" edge="#efa087" /><circle cx="54" cy="62" r="39" fill={`url(#${g})`} /><path d="m31 52 13 6-13 6M77 52l-13 6 13 6" stroke={ink} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /><rect x="42" y="74" width="24" height="12" rx="1" fill="#fff" stroke={ink} strokeWidth="2.7" /><path d="M91 19v18M101 24v18" stroke={ink} strokeWidth="3" strokeLinecap="round" /></Canvas>;
}

function AngryFace({ id }: FaceArtworkProps) {
  const g = `${id}-fill`;
  return <Canvas mood="angry"><Gradient id={g} light="#ffb3aa" base="#f37068" edge="#e75a54" /><circle cx="56" cy="62" r="39" fill={`url(#${g})`} /><path d="m30 42 15 8M82 42l-15 8" stroke={ink} strokeWidth="4" strokeLinecap="round" /><circle cx="40" cy="56" r="4.5" fill={ink} /><circle cx="72" cy="56" r="4.5" fill={ink} /><path d="M44 80c6-10 17-10 24 0" stroke={ink} strokeWidth="3.2" strokeLinecap="round" /><path d="M21 31c-14-8-16 9-5 9-10 7 3 15 11 7M91 31c14-8 16 9 5 9 10 7-3 15-11 7" stroke="#8a918e" strokeWidth="2" strokeLinecap="round" /></Canvas>;
}

function ConfusedFace({ id }: FaceArtworkProps) {
  const g = `${id}-fill`;
  return <Canvas mood="confused"><Gradient id={g} light="#ffd7e1" base="#f3a0b5" edge="#e889a6" /><circle cx="52" cy="63" r="39" fill={`url(#${g})`} /><ellipse cx="38" cy="55" rx="8" ry="6" fill="#fff" /><ellipse cx="68" cy="55" rx="8" ry="6" fill="#fff" /><circle cx="42" cy="55" r="3.8" fill={ink} /><circle cx="72" cy="55" r="3.8" fill={ink} /><path d="M42 78c6-8 15-8 21 0" stroke={ink} strokeWidth="3" strokeLinecap="round" /><path d="M88 24c2-10 20-9 20 2 0 7-9 7-9 13" stroke={ink} strokeWidth="3" strokeLinecap="round" /><circle cx="98" cy="48" r="2.5" fill={ink} /></Canvas>;
}

function OverwhelmedFace({ id }: FaceArtworkProps) {
  const g = `${id}-fill`;
  return <Canvas mood="overwhelmed"><Gradient id={g} light="#f3d4e6" base="#d99bbb" edge="#ca84ac" /><circle cx="54" cy="63" r="39" fill={`url(#${g})`} /><path d="m31 53 13 7-13 7M77 53l-13 7 13 7" stroke={ink} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /><rect x="39" y="75" width="30" height="12" rx="5" fill="#fff" stroke={ink} strokeWidth="2.7" /><path d="M45 76v10M51 76v10M57 76v10M63 76v10" stroke={ink} strokeWidth="1.7" /><path d="M91 27h9V17M105 32h10M94 42l-8 8" stroke={ink} strokeWidth="3" strokeLinecap="round" /></Canvas>;
}

export const artworkByMoodId: Record<string, FaceArtwork> = {
  happy: HappyFace, excited: ExcitedFace, grateful: GratefulFace, satisfied: SatisfiedFace,
  calm: CalmFace, relaxed: RelaxedFace, focused: FocusedFace, clear: ClearFace,
  tired: TiredFace, bored: BoredFace, down: DownFace, lonely: LonelyFace, sad: SadFace,
  anxious: AnxiousFace, stressed: StressedFace, angry: AngryFace, confused: ConfusedFace, overwhelmed: OverwhelmedFace,
};
