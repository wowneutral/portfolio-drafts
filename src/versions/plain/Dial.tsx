// Adapted from React Bits ElasticSlider (reactbits.dev, MIT + Commons Clause): its spring model, rubber-band overshoot past the ends, track stretch and keyboard stepping, cut down to one five-step horizontal dial.
import { useEffect, useLayoutEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react';

const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const rubber = (d: number, limit: number) => (limit > 0 ? 2 * (1 / (1 + Math.exp(-d / limit)) - 0.5) * limit : 0);
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const MAX = 4;
const STRETCH = 34;
const BOUNCE = 0.55;

type Props = { value: number; names: string[]; onChange: (v: number) => void; label: string };

export function Dial({ value, names, onChange, label }: Props) {
  const hitRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const m = useRef({ p: value / MAX, vp: 0, target: value / MAX, s: 0, vs: 0, side: 1, held: false, a: 0, va: 0, goal: 0, length: 1, dragging: false, hovered: false, focused: false, raf: 0, last: 0 });
  const drag = useRef<{ id: number } | null>(null);
  const cur = useRef(value);
  const cb = useRef(onChange);
  cb.current = onChange;

  const paint = () => {
    const s = m.current, track = trackRef.current, range = rangeRef.current;
    if (!track || !range) return;
    const length = Math.max(1, s.length);
    const along = 1 + s.s / length;
    const across = 1 - 0.22 * clamp(s.s / STRETCH, -1, 1) + 0.5 * s.a;
    const atEnd = s.side > 0;
    track.style.transformOrigin = atEnd ? '0% 50%' : '100% 50%';
    track.style.transform = `scale(${along.toFixed(4)}, ${across.toFixed(4)})`;
    const p = clamp(s.p, 0, 1);
    range.style.transform = `scaleX(${p.toFixed(4)})`;
    const pos = atEnd ? p * length * along : length - (1 - p) * length * along;
    if (thumbRef.current) thumbRef.current.style.transform = `translate3d(${pos.toFixed(2)}px, 0, 0) scale(${(1 + 0.18 * s.a).toFixed(3)})`;
  };

  const frame = (now: number) => {
    const s = m.current;
    s.raf = 0;
    const elapsed = clamp((now - s.last) / 1000, 0, 1 / 20);
    s.last = now;
    if (reduced()) {
      s.p = s.target; s.vp = 0; if (!s.held) { s.s = 0; s.vs = 0; } s.a = s.goal; s.va = 0;
    } else {
      const steps = Math.max(1, Math.ceil(elapsed / (1 / 240)));
      const dt = elapsed / steps;
      const fo = TAU / (s.dragging ? 0.09 : 0.3), fz = s.dragging ? 1 : 0.62;
      const so = TAU / 0.42, sz = 1 - 0.9 * BOUNCE;
      const ao = TAU / 0.32;
      for (let i = 0; i < steps; i++) {
        s.vp += (-fo * fo * (s.p - s.target) - 2 * fz * fo * s.vp) * dt; s.p += s.vp * dt;
        if (!s.held) { s.vs += (-so * so * s.s - 2 * sz * so * s.vs) * dt; s.s += s.vs * dt; }
        s.va += (-ao * ao * (s.a - s.goal) - 2 * 0.9 * ao * s.va) * dt; s.a += s.va * dt;
      }
    }
    const settled = Math.abs(s.p - s.target) < 0.0004 && Math.abs(s.vp) < 0.002 && (s.held || (Math.abs(s.s) < 0.05 && Math.abs(s.vs) < 0.5)) && Math.abs(s.a - s.goal) < 0.002 && Math.abs(s.va) < 0.005;
    if (settled) { s.p = s.target; s.vp = 0; s.a = s.goal; s.va = 0; if (!s.held) { s.s = 0; s.vs = 0; } }
    paint();
    if (!settled || s.dragging) s.raf = requestAnimationFrame(frame);
  };
  const kick = () => { const s = m.current; if (s.raf) return; s.last = performance.now(); s.raf = requestAnimationFrame(frame); };
  const goal = () => { const s = m.current; s.goal = s.hovered || s.dragging || s.focused ? 1 : 0; kick(); };
  const bump = (side: number) => { const s = m.current; if (s.held || Math.abs(s.vs) > 40 || Math.abs(s.s) > 2) return; s.side = side; s.vs = STRETCH * 5.5; kick(); };
  const commit = (next: number) => { m.current.target = next / MAX; kick(); if (next === cur.current) return; cur.current = next; cb.current(next); };

  useLayoutEffect(() => { cur.current = value; if (!m.current.dragging) m.current.target = value / MAX; kick(); }, [value]);
  useLayoutEffect(() => {
    const hit = hitRef.current; if (!hit) return;
    const measure = () => { m.current.length = hit.clientWidth; paint(); };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(hit);
    return () => ro.disconnect();
  }, []);
  useEffect(() => () => cancelAnimationFrame(m.current.raf), []);

  const along = (e: PointerEvent) => { const r = hitRef.current!.getBoundingClientRect(); return e.clientX - r.left; };
  const follow = (e: PointerEvent) => {
    const s = m.current, length = Math.max(1, s.length);
    const f = along(e) / length;
    const over = f < 0 ? -f * length : f > 1 ? (f - 1) * length : 0;
    if (over > 0) { s.held = true; s.side = f < 0 ? -1 : 1; s.s = rubber(over, STRETCH); s.vs = 0; }
    else if (s.held) s.held = false;
    commit(Math.round(clamp(f, 0, 1) * MAX));
  };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId };
    m.current.dragging = true; goal(); follow(e);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => { if (drag.current?.id === e.pointerId) follow(e); };
  const up = () => { if (!drag.current) return; drag.current = null; const s = m.current; s.dragging = false; s.held = false; goal(); };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const now = cur.current;
    const map: Record<string, number> = { ArrowRight: now + 1, ArrowUp: now + 1, ArrowLeft: now - 1, ArrowDown: now - 1, PageUp: now + 1, PageDown: now - 1, Home: 0, End: MAX };
    if (!(e.key in map)) return;
    e.preventDefault();
    const want = map[e.key], next = clamp(want, 0, MAX);
    if (next === now) { if (want !== now) bump(want > now ? 1 : -1); return; }
    commit(next);
  };

  return (
    <div className="pl-dial" onPointerEnter={() => { m.current.hovered = true; goal(); }} onPointerLeave={() => { m.current.hovered = false; goal(); }}>
      <span className="pl-dial-l" aria-hidden="true">{label}</span>
      <div
        ref={hitRef} className="pl-dial-hit" role="slider" tabIndex={0}
        aria-label={label} aria-valuemin={0} aria-valuemax={MAX} aria-valuenow={value} aria-valuetext={names[value]} aria-orientation="horizontal"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up} onKeyDown={key}
        onFocus={(e) => { m.current.focused = e.currentTarget.matches(':focus-visible'); goal(); }}
        onBlur={() => { m.current.focused = false; goal(); }}
      >
        <div className="pl-dial-track" ref={trackRef}>
          <div className="pl-dial-range" ref={rangeRef} />
          {[1, 2, 3].map((t) => <span key={t} className="pl-dial-tick" style={{ left: `${(t / MAX) * 100}%` }} />)}
        </div>
        <span className="pl-dial-thumb" ref={thumbRef} />
      </div>
      <span className="pl-dial-v" aria-hidden="true">{names[value]}</span>
    </div>
  );
}
