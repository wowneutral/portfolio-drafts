// A line of display type with a taut red string drawn through it at mid x-height.
// The string is physical: grab it and it bends under the pointer (clamped so it never
// reaches the next line of type), let go and it rings down on a damped spring.
// Enter or Space on the focused heading plucks it. Reduced motion leaves it still.
import { createElement, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as RPE } from 'react';
import { clamp, still } from '@/lib/utils';

type Line = { x0: number; x1: number; y: number };
type Str = Line & { A: number; V: number; B: number; VB: number; g: number; held: boolean; t: number; moved: boolean };

const N = 64;
const K1 = (2 * Math.PI * 4.6) ** 2;
const C1 = 2 * 0.075 * 2 * Math.PI * 4.6;
const K2 = (2 * Math.PI * 8.4) ** 2;
const C2 = 2 * 0.11 * 2 * Math.PI * 8.4;
/** Mid x-height inside the content box of Gloock (ascent .975, descent .225, x-height .508). */
const MIDX = (0.975 - 0.254) / 1.2;
const UNDER = (0.975 + 0.13) / 1.2;

/** A plucked string, Karplus-Strong, made on demand. Only a deliberate pull or Enter sounds; a passing mouse is silent. */
let ac: AudioContext | null = null;
function twang(len: number, force: number) {
  try {
    ac ??= new AudioContext();
    if (ac.state === 'suspended') ac.resume();
    const sr = ac.sampleRate;
    const f = Math.min(620, Math.max(82, 104 * (1000 / Math.max(120, len))));
    const n = Math.round(sr / f), total = Math.round(sr * 1.6);
    const buf = ac.createBuffer(1, total, sr), out = buf.getChannelData(0);
    const ring = new Float32Array(n);
    for (let i = 0; i < n; i++) ring[i] = Math.random() * 2 - 1;
    for (let i = 0; i < total; i++) { const k = i % n; out[i] = ring[k]; ring[k] = 0.4985 * (ring[k] + ring[(k + 1) % n]); }
    const src = ac.createBufferSource(); src.buffer = buf;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    const g = ac.createGain(); g.gain.value = 0.05 + 0.16 * Math.min(1, force);
    src.connect(lp).connect(g).connect(ac.destination);
    src.start();
  } catch { /* no audio: the line still moves */ }
}

function shape(u: number, g: number, held: boolean, t: number) {
  const tri = u < g ? u / g : (1 - u) / (1 - g);
  const soft = 0.72 * tri + 0.28 * Math.sin(Math.PI * u);
  const norm = 0.72 + 0.28 * Math.sin(Math.PI * g);
  const pulled = soft / norm;
  if (held) return pulled;
  const m = Math.exp(-t * 7);
  return m * pulled + (1 - m) * Math.sin(Math.PI * u);
}

function pathOf(s: Str) {
  if (Math.abs(s.A) < 0.02 && Math.abs(s.B) < 0.02 && !s.held) return `M${s.x0.toFixed(1)} ${s.y.toFixed(1)}L${s.x1.toFixed(1)} ${s.y.toFixed(1)}`;
  let d = '';
  for (let j = 0; j <= N; j++) {
    const u = j / N;
    const x = s.x0 + (s.x1 - s.x0) * u;
    const y = s.y + s.A * shape(u, s.g, s.held, s.t) + s.B * Math.sin(2 * Math.PI * u);
    d += (j ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
  }
  return d;
}

type Props = {
  as?: 'h1' | 'h2' | 'h3' | 'p';
  id?: string;
  className?: string;
  children: string;
  /** Stroke width in px. */
  w?: number;
  /** 'x' crosses the line out; 'under' sets the string beneath it like a signature. */
  at?: 'x' | 'under';
  /** Seconds before the line draws itself in. */
  delay?: number;
};

export function Strike({ as = 'h2', id, className, children, w = 3, at = 'x', delay = 0 }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const txt = useRef<HTMLSpanElement>(null);
  const paths = useRef<(SVGPathElement | null)[]>([]);
  const S = useRef<Str[]>([]);
  const fs = useRef(40);
  const raf = useRef(0);
  const last = useRef(0);
  const [lines, setLines] = useState<Line[]>([]);
  const [on, setOn] = useState(still);

  useLayoutEffect(() => {
    const el = wrap.current, t = txt.current;
    if (!el || !t) return;
    const measure = () => {
      const wr = el.getBoundingClientRect();
      const r = document.createRange();
      r.selectNodeContents(t);
      const rows: DOMRect[] = [];
      for (const b of r.getClientRects()) {
        if (b.width < 2) continue;
        const same = rows.find((q) => Math.abs(q.top - b.top) < 6);
        if (same) { const L = Math.min(same.left, b.left), R = Math.max(same.right, b.right); rows[rows.indexOf(same)] = new DOMRect(L, same.top, R - L, same.height); }
        else rows.push(b);
      }
      const size = parseFloat(getComputedStyle(t).fontSize) || 40;
      fs.current = size;
      const over = size * 0.05;
      const k = at === 'under' ? UNDER : MIDX;
      const next = rows.map((b) => ({ x0: b.left - wr.left - over, x1: b.right - wr.left + over, y: b.top - wr.top + b.height * k }));
      S.current = next.map((l, i) => ({ ...l, A: S.current[i]?.A ?? 0, V: 0, B: 0, VB: 0, g: 0.5, held: false, t: 9, moved: false }));
      setLines(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [children, at]);

  useEffect(() => {
    if (still) return;
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setOn(true); io.disconnect(); } }, { rootMargin: '0px 0px -12% 0px' });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf.current); };
  }, []);

  const max = () => fs.current * 0.4;

  const tick = (now: number) => {
    const dt = Math.min(1 / 30, (now - last.current) / 1000 || 1 / 60);
    last.current = now;
    let live = false;
    S.current.forEach((s, i) => {
      if (!s.held) {
        for (let k = 0; k < 3; k++) {
          const h = dt / 3;
          s.V += (-K1 * s.A - C1 * s.V) * h; s.A += s.V * h;
          s.VB += (-K2 * s.B - C2 * s.VB) * h; s.B += s.VB * h;
        }
        s.t += dt;
        if (Math.abs(s.A) < 0.05 && Math.abs(s.V) < 0.5 && Math.abs(s.B) < 0.05 && Math.abs(s.VB) < 0.5) { s.A = s.V = s.B = s.VB = 0; }
        else live = true;
      } else live = true;
      paths.current[i]?.setAttribute('d', pathOf(s));
    });
    raf.current = live ? requestAnimationFrame(tick) : 0;
  };
  const run = () => { if (!raf.current) { last.current = performance.now(); raf.current = requestAnimationFrame(tick); } };

  const local = (e: RPE) => {
    const r = wrap.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const grabbed = useRef<Str | null>(null);
  const down = (e: RPE<HTMLButtonElement>) => {
    if (still || !S.current.length) return;
    const p = local(e);
    let s = S.current[0];
    for (const q of S.current) if (Math.abs(q.y - p.y) < Math.abs(s.y - p.y)) s = q;
    s.held = true; s.moved = false; s.V = 0; s.B = 0; s.VB = 0;
    s.g = clamp((p.x - s.x0) / (s.x1 - s.x0), 0.06, 0.94);
    s.A = max() * Math.tanh((p.y - s.y) / max());
    grabbed.current = s;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* fine */ }
    run();
  };
  const prev = useRef<{ x: number; y: number } | null>(null);
  /** A mouse sweeping across a line without pressing strums it, softly, in the direction of travel. */
  const strum = (p: { x: number; y: number }) => {
    const q = prev.current;
    prev.current = p;
    if (!q || still) return;
    const m = max();
    for (const s of S.current) {
      if (s.held || p.x < s.x0 || p.x > s.x1) continue;
      if ((q.y - s.y) * (p.y - s.y) >= 0) continue;
      const kick = Math.min(m * 0.42, Math.abs(p.y - q.y) * 0.5 + m * 0.12) * Math.sign(p.y - q.y);
      if (Math.abs(s.A) > Math.abs(kick)) continue;
      s.g = clamp((p.x - s.x0) / (s.x1 - s.x0), 0.08, 0.92);
      s.A = kick; s.V = 0; s.t = 0; s.B = kick * 0.3 * (0.5 - s.g) * 2; s.VB = 0;
      run();
    }
  };
  const move = (e: RPE<HTMLButtonElement>) => {
    const s = grabbed.current;
    if (!s) { if (e.pointerType === 'mouse') strum(local(e)); return; }
    const p = local(e);
    const m = max();
    s.A = m * Math.tanh((p.y - s.y) / m);
    s.g = clamp((p.x - s.x0) / (s.x1 - s.x0), 0.06, 0.94);
    if (Math.abs(p.y - s.y) > 4) s.moved = true;
  };
  const up = () => {
    const s = grabbed.current;
    if (!s) return;
    grabbed.current = null;
    s.held = false; s.t = 0;
    if (!s.moved || Math.abs(s.A) < max() * 0.15) s.A = (s.A >= 0 ? 1 : -1) * max() * 0.55;
    s.B = s.A * 0.3 * (0.5 - s.g) * 2;
    twang(s.x1 - s.x0, Math.abs(s.A) / max());
    run();
  };
  const pluck = () => {
    if (still) return;
    S.current.forEach((s, i) => { s.held = false; s.t = 0; s.g = 0.35 + 0.3 * ((i * 0.37) % 1); s.A = max() * 0.6 * (i % 2 ? -1 : 1); s.V = 0; s.B = s.A * 0.25; s.VB = 0; });
    if (S.current[0]) twang(S.current[0].x1 - S.current[0].x0, 0.6);
    run();
  };

  const label = children.replace(/[.“”"]/g, '').trim();
  return (
    <div ref={wrap} className={`st ${className ?? ''} ${on ? 'st-on' : ''}`} style={{ ['--d' as string]: delay + 's', ['--sw' as string]: w + 'px' }}>
      {createElement(as, { id, className: 'st-h' }, <span ref={txt} className="st-t">{children}</span>)}
      <svg className="st-svg" aria-hidden="true" width="100%" height="100%">
        {lines.map((l, i) => (
          <path
            key={i}
            ref={(p) => { paths.current[i] = p; }}
            d={`M${l.x0.toFixed(1)} ${l.y.toFixed(1)}L${l.x1.toFixed(1)} ${l.y.toFixed(1)}`}
            pathLength={1}
            style={{ transitionDelay: `calc(var(--d) + ${i * 0.14}s)` }}
          />
        ))}
      </svg>
      {!still && (
        <button
          type="button"
          className="st-hit"
          aria-label={`Pluck the red line through ${label}`}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onPointerLeave={() => { prev.current = null; }}
          onClick={(e) => { if (e.detail === 0) pluck(); }}
        >
          {lines.map((l, i) => (
            <span key={i} className="st-strip" style={{ left: l.x0, width: l.x1 - l.x0, top: l.y - 24 }} />
          ))}
        </button>
      )}
    </div>
  );
}
