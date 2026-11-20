// The glass as a still drawing: for no WebGL, reduced motion, and the moment before the scene loads.
const STREAMS = [150, 178, 214, 236, 262];

export default function Still({ slice }: { slice: 0 | 1 | 2 }) {
  const pulp = slice === 1 ? '#9cc23a' : '#f4d84a', rind = slice === 1 ? '#3f6b12' : '#e2b812';
  return (
    <svg className="fz-still" viewBox="0 0 400 640" role="img" aria-label={`A tall glass of sparkling water${slice === 1 ? ' with a slice of lime' : slice === 2 ? ' with a slice of lemon' : ''}, bubbles rising in streams from the base`}>
      <ellipse cx="206" cy="603" rx="128" ry="11" fill="#0f1615" opacity="0.08" />
      <ellipse cx="248" cy="606" rx="80" ry="8" fill="#ffffff" opacity="0.9" />
      {/* glass body */}
      <path d="M116 598 Q106 598 105 586 L94 70 L306 70 L295 586 Q294 598 284 598 Z" fill="#f6faf8" stroke="#9fb1ab" strokeWidth="1.5" />
      {/* water */}
      <path d="M100 178 Q103 186 114 186 L286 186 Q297 186 300 178 L293 514 L107 514 Z" fill="#e2eee9" />
      <path d="M100 178 Q103 186 114 186 L286 186 Q297 186 300 178" fill="none" stroke="#8ea49d" strokeWidth="1.2" />
      {/* heavy base */}
      <path d="M107 514 L293 514 Q296 520 295 586 Q294 598 284 598 L116 598 Q106 598 105 586 Q104 520 107 514 Z" fill="#d6e3de" />
      <path d="M118 520 L282 520" stroke="#ffffff" strokeWidth="3" opacity="0.8" />
      {/* the rim light */}
      <path d="M112 80 L121 580" stroke="#ffffff" strokeWidth="6" opacity="0.85" strokeLinecap="round" />
      <path d="M288 80 L281 580" stroke="#ffffff" strokeWidth="2" opacity="0.7" strokeLinecap="round" />
      <path d="M94 70 L306 70" stroke="#9fb1ab" strokeWidth="2" />
      {/* streams */}
      {STREAMS.map((x, i) => (
        <g key={x} fill="none" stroke={i === 1 || i === 3 ? '#5c8a12' : '#4b625c'} strokeWidth="1.1">
          {Array.from({ length: 11 }, (_, k) => {
            const y = 506 - k * 29 - (i % 2) * 12;
            return y > 196 ? <circle key={k} cx={x + Math.sin(k * 1.3 + i) * 2.5} cy={y} r={1.6 + k * 0.22} /> : null;
          })}
        </g>
      ))}
      {slice > 0 && (
        <g transform="translate(232 170) rotate(-18)">
          <ellipse rx="56" ry="22" fill={rind} />
          <ellipse rx="51" ry="19" fill="#f5f8e8" />
          <ellipse rx="46" ry="16.5" fill={pulp} />
          {Array.from({ length: 10 }, (_, k) => {
            const a = (k / 10) * Math.PI * 2;
            return <line key={k} x1="0" y1="0" x2={Math.cos(a) * 46} y2={Math.sin(a) * 16.5} stroke="#f5f8e8" strokeWidth="1.4" />;
          })}
        </g>
      )}
    </svg>
  );
}
