// The watch with no WebGL, or for reduced motion: a flat dial, hands set to the moment the page loaded.
import { useState } from 'react';

export default function Dial({ placeholder = false }: { placeholder?: boolean }) {
  const [t] = useState(() => new Date());
  const h = ((t.getHours() % 12) + t.getMinutes() / 60) * 30, m = (t.getMinutes() + t.getSeconds() / 60) * 6, s = t.getSeconds() * 6;
  const ticks = Array.from({ length: 60 }, (_, i) => i);
  return (
    <svg className={placeholder ? 'w-dial w-dial-wait' : 'w-dial'} viewBox="-110 -110 220 220" {...(placeholder ? { 'aria-hidden': true } : { role: 'img', 'aria-label': `A watch face showing ${t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` })}>
      <circle r="104" className="w-dial-case" />
      <circle r="92" className="w-dial-face" />
      {ticks.map((i) => (
        <line key={i} x1="0" y1={i % 5 ? -86 : -78} x2="0" y2="-90" transform={`rotate(${i * 6})`} className={i % 5 ? 'w-dial-min' : 'w-dial-hr'} />
      ))}
      <line x1="0" y1="10" x2="0" y2="-48" transform={`rotate(${h})`} className="w-dial-h" />
      <line x1="0" y1="12" x2="0" y2="-72" transform={`rotate(${m})`} className="w-dial-m" />
      <line x1="0" y1="18" x2="0" y2="-84" transform={`rotate(${s})`} className="w-dial-s" />
      <circle r="4" className="w-dial-hub" />
    </svg>
  );
}
