type PermanentHomeSceneProps = {
  reducedMotion: boolean;
  unlockedItemIds: string[];
};

export function PermanentHomeScene({ reducedMotion, unlockedItemIds }: PermanentHomeSceneProps) {
  const deskUnlocked = unlockedItemIds.includes('home-field-desk');
  const shelfUnlocked = unlockedItemIds.includes('home-memory-shelf');

  return (
    <svg
      className={`journal-pixel-scene ${reducedMotion ? 'is-reduced-motion' : ''}`}
      viewBox="0 0 960 520"
      role="img"
      aria-label="永久家园像素场景"
      shapeRendering="crispEdges"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="960" height="520" fill="#a8dfe1" />
      <circle cx="770" cy="96" r="46" fill="#ffe995" />
      <path d="M0 286 L170 176 L312 286 Z M220 286 L430 144 L626 286 Z M540 286 L746 168 L960 286 Z" fill="#83ad81" />
      <rect y="274" width="960" height="246" fill="#86ad6d" />
      <g aria-hidden="true">
        <rect x="254" y="224" width="388" height="224" fill="#f0dca9" stroke="#191c1d" strokeWidth="6" />
        <path d="M218 232 L448 102 L680 232 Z" fill="#9f6948" stroke="#191c1d" strokeWidth="6" />
        <rect x="410" y="326" width="88" height="122" fill="#5b4c32" stroke="#191c1d" strokeWidth="5" />
        <rect x="300" y="286" width="72" height="64" fill="#ffd86b" stroke="#191c1d" strokeWidth="5" />
        <rect x="532" y="286" width="72" height="64" fill="#ffd86b" stroke="#191c1d" strokeWidth="5" />
        <rect x="420" y="164" width="58" height="48" fill="#83ced5" stroke="#191c1d" strokeWidth="5" />
      </g>
      <g className="journal-mailbox" transform="translate(706 326)" aria-hidden="true">
        <rect x="32" y="58" width="10" height="100" fill="#5b4c32" />
        <rect x="0" y="24" width="78" height="58" rx="6" fill="#c86446" stroke="#191c1d" strokeWidth="5" />
        <path d="M14 24 C14 -2 62 -2 64 24" fill="#c86446" stroke="#191c1d" strokeWidth="5" />
        <rect x="64" y="14" width="8" height="42" fill="#705d00" />
        <rect x="66" y="12" width="32" height="20" fill="#ffd700" stroke="#191c1d" strokeWidth="4" />
      </g>
      <g aria-hidden="true">
        <rect x="110" y="290" width="24" height="144" fill="#5b4c32" />
        <circle cx="122" cy="256" r="72" fill="#568966" />
        <circle cx="72" cy="288" r="46" fill="#5f985c" />
        <circle cx="172" cy="286" r="48" fill="#5f985c" />
      </g>
      {deskUnlocked ? (
        <g data-testid="home-field-desk" transform="translate(176 406)">
          <rect width="120" height="18" fill="#5b4c32" stroke="#191c1d" strokeWidth="4" />
          <rect x="12" y="18" width="12" height="60" fill="#5b4c32" />
          <rect x="94" y="18" width="12" height="60" fill="#5b4c32" />
          <rect x="46" y="-28" width="34" height="28" fill="#fffdf2" stroke="#191c1d" strokeWidth="3" />
        </g>
      ) : (
        <rect x="176" y="406" width="120" height="78" fill="none" stroke="#fffdf2" strokeWidth="4" strokeDasharray="10 8" opacity="0.8" />
      )}
      {shelfUnlocked ? (
        <g data-testid="home-memory-shelf" transform="translate(650 404)">
          <rect width="74" height="84" fill="#5b4c32" stroke="#191c1d" strokeWidth="4" />
          <rect x="8" y="12" width="58" height="8" fill="#e0c488" />
          <rect x="8" y="42" width="58" height="8" fill="#e0c488" />
          <rect x="14" y="22" width="10" height="20" fill="#2f8290" />
          <rect x="30" y="26" width="12" height="16" fill="#c86446" />
        </g>
      ) : (
        <rect x="650" y="404" width="74" height="84" fill="none" stroke="#fffdf2" strokeWidth="4" strokeDasharray="10 8" opacity="0.8" />
      )}
      <g className="journal-viewfinder" fill="none" stroke="#fffdf2" strokeWidth="3" opacity="0.9" aria-hidden="true">
        <path d="M24 62 V24 H62 M898 24 H936 V62 M24 458 V496 H62 M898 496 H936 V458" />
      </g>
    </svg>
  );
}
