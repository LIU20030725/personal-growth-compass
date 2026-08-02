import { Cloud, Leaf, Sparkles, Sprout } from 'lucide-react';

export function EmotionGardenIllustration({ compact = false }: { compact?: boolean }) {
  return <div
    className={`emotion-garden-illustration${compact ? ' emotion-garden-illustration--compact' : ''}`}
    role="img"
    aria-label="等待心情发芽的小花园"
  >
    <span className="emotion-garden-illustration__sun" />
    <Cloud className="emotion-garden-illustration__cloud" aria-hidden="true" />
    <span className="emotion-garden-illustration__hill emotion-garden-illustration__hill--back" />
    <span className="emotion-garden-illustration__hill emotion-garden-illustration__hill--front" />
    <Sprout className="emotion-garden-illustration__sprout" aria-hidden="true" />
    <Leaf className="emotion-garden-illustration__leaf" aria-hidden="true" />
    <Sparkles className="emotion-garden-illustration__sparkles" aria-hidden="true" />
  </div>;
}
