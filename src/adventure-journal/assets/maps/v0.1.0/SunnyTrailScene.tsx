export function SunnyTrailScene({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <svg
      className={`journal-pixel-scene ${reducedMotion ? 'is-reduced-motion' : ''}`}
      viewBox="0 0 960 520"
      role="img"
      aria-label="晴日林径像素旅途场景"
      shapeRendering="crispEdges"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="960" height="520" fill="#83ced5" />
      <circle cx="790" cy="88" r="42" fill="#ffd86b" />
      <g className="journal-cloud cloud-one" fill="#edf7ec">
        <rect x="92" y="76" width="126" height="28" />
        <rect x="118" y="58" width="64" height="22" />
      </g>
      <g className="journal-cloud cloud-two" fill="#edf7ec">
        <rect x="610" y="126" width="116" height="24" />
        <rect x="638" y="108" width="58" height="20" />
      </g>
      <g aria-hidden="true">
        <path d="M0 242 L120 130 L238 244 Z" fill="#83ad81" />
        <path d="M138 246 L328 102 L470 246 Z" fill="#739a78" />
        <path d="M350 246 L550 142 L720 246 Z" fill="#83ad81" />
        <path d="M610 246 L812 110 L960 244 L960 282 L610 282 Z" fill="#739a78" />
      </g>
      <rect y="232" width="960" height="120" fill="#568966" />
      <g fill="#3f7555" aria-hidden="true">
        {Array.from({ length: 15 }, (_, index) => (
          <path key={index} d={`M${index * 72 - 20} 300 l34 -86 l34 86 z`} />
        ))}
      </g>
      <rect y="322" width="960" height="198" fill="#86ad6d" />
      <path d="M420 520 C420 454 458 406 514 358 C544 332 565 310 580 288 L692 288 C664 326 626 354 592 384 C528 440 512 480 512 520 Z" fill="#e0c488" />
      <path d="M446 520 C446 456 480 414 532 370" fill="none" stroke="#c3a66b" strokeWidth="8" />
      <g className="journal-grass" fill="#5f985c" aria-hidden="true">
        <path d="M42 470 l8 -34 l8 34 l14 -26 l-6 38 z" />
        <path d="M220 438 l8 -30 l8 30 l12 -22 l-4 34 z" />
        <path d="M770 466 l8 -38 l9 38 l16 -28 l-8 42 z" />
        <path d="M884 410 l8 -30 l8 30 l12 -22 l-4 34 z" />
      </g>
      <g aria-hidden="true">
        <rect x="162" y="354" width="10" height="78" fill="#5b4c32" />
        <rect x="132" y="350" width="72" height="34" fill="#f0dca9" stroke="#191c1d" strokeWidth="4" />
        <text x="168" y="372" textAnchor="middle" fontSize="13" fontWeight="800" fill="#191c1d">NORTH</text>
      </g>
      <g className="journal-walker" transform="translate(498 344)" aria-hidden="true">
        <rect x="13" y="0" width="22" height="22" fill="#d9a36f" />
        <rect x="10" y="0" width="28" height="8" fill="#33281f" />
        <rect x="8" y="22" width="34" height="38" fill="#2f8290" />
        <rect x="0" y="26" width="12" height="32" fill="#c86446" />
        <rect x="10" y="60" width="12" height="30" fill="#4c4332" />
        <rect x="28" y="60" width="12" height="30" fill="#4c4332" />
      </g>
      <g className="journal-foreground" aria-hidden="true">
        <path d="M0 520 V410 C46 392 72 430 112 420 C148 410 166 448 210 440 V520 Z" fill="#4f8658" />
        <path d="M960 520 V392 C910 382 894 424 850 412 C814 402 792 446 746 438 V520 Z" fill="#4f8658" />
      </g>
      <g className="journal-viewfinder" fill="none" stroke="#fffdf2" strokeWidth="3" opacity="0.9" aria-hidden="true">
        <path d="M24 62 V24 H62 M898 24 H936 V62 M24 458 V496 H62 M898 496 H936 V458" />
      </g>
    </svg>
  );
}
