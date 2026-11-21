// Remixed from React Bits TearTicket (Micro/TearTicket, MIT + Commons Clause): its perforation, rough torn edge,
// fibres, stretch and resistance, hinge physics, gravity drop and onTear, turned into one tear-off tab of a flyer.
import { createContext, useContext, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { still } from '@/lib/utils';

type Pt = { x: number; y: number };
type Bridge = { mid: number };
type Phase = 'idle' | 'held' | 'free' | 'drop' | 'return';

const GRAVITY = 2400;
const TEAR_ANGLE = 0.42;
const STRETCH = 18;
const RESISTANCE = 0.5;
const HOLE = 4.6;
const PITCH = 12;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const noise = (seed: number) => {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const f = (n: number) => n.toFixed(2);

/** Every tab taken on this visit, newest last: they collect on the floor at the foot of the page. */
const pile: string[][] = [];
const subs = new Set<() => void>();
export const taken = {
  get: () => pileSnap,
  sub: (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; },
};
let pileSnap: string[][] = [];

/** The flyer a tab hangs from: it jolts when a fibre snaps (TearTicket's body recoil). */
export const Jolt = createContext<(k: number) => void>(() => {});

/** Tab outline: straight cut sides and bottom, a rough top edge broken by half holes. */
function geometry(W: number, H: number, seed: number) {
  const r = HOLE / 2;
  const n = Math.max(2, Math.round(W / PITCH));
  const step = W / n;
  const rand = noise(seed * 7919 + Math.round(W));
  const holes: number[] = [];
  for (let i = 0; i < n; i += 1) holes.push(step * (i + 0.5));
  const bridges: Bridge[] = [];
  let d = `M0,${f(rand() * 1.4)}`;
  let x = 0;
  holes.forEach((cx) => {
    const a = cx - r;
    bridges.push({ mid: (x + a) / 2 });
    const k = Math.max(1, Math.round((a - x) / 2.4));
    for (let j = 1; j < k; j += 1) d += `L${f(x + ((a - x) * j) / k)},${f(rand() * 1.6)}`;
    d += `L${f(a)},0A${r},${r} 0 0 0 ${f(cx + r)},0`;
    x = cx + r;
  });
  bridges.push({ mid: (x + W) / 2 });
  d += `L${f(W)},${f(rand() * 1.4)}L${f(W)},${f(H)}L0,${f(H)}Z`;
  return { d, holes, bridges };
}

export type TabProps = { href: string; lines: string[]; seed?: number };

export function Tab({ href, lines, seed = 1 }: TabProps) {
  const jolt = useContext(Jolt);
  const slotRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef<HTMLAnchorElement>(null);
  const fibreRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [busy, setBusy] = useState(false);
  const geo = useMemo(() => (size.w ? geometry(size.w, size.h, seed) : null), [size.w, size.h, seed]);
  const external = /^https?:/.test(href);
  const s = useRef({
    raf: 0, last: 0, phase: 'idle' as Phase, id: -1 as number, auto: false, open: false, moved: false,
    sign: 1, hinge: { x: 0, y: 0 } as Pt, grab: { x: 0, y: 0 } as Pt, start: { x: 0, y: 0 } as Pt, point: { x: 0, y: 0 } as Pt,
    a0: 0, theta: 0, thetaV: 0, sx: 0, sy: 0, vx: 0, vy: 0, spin: 0, pvx: 0, pvy: 0, pt: 0, fade: 1, age: 0, pull: 0,
    snapped: [] as boolean[], snapAt: [] as number[],
  });

  useLayoutEffect(() => {
    const el = slotRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => { ro.disconnect(); cancelAnimationFrame(s.current.raf); };
  }, []);

  const paint = (now: number) => {
    const st = s.current;
    const tab = tabRef.current;
    if (!tab || !geo) return false;
    const rot = st.theta * st.sign;
    const stretch = st.phase === 'held' ? 1 + clamp(st.pull / 900, 0, 0.05) : 1;
    tab.style.transformOrigin = `${st.hinge.x}px ${st.hinge.y}px`;
    tab.style.transform = st.phase === 'idle' ? '' : `translate(${f(st.sx)}px, ${f(st.sy)}px) rotate(${(rot * 180 / Math.PI).toFixed(3)}deg) scaleY(${stretch.toFixed(4)})`;
    tab.style.opacity = st.fade.toFixed(3);
    const paths = fibreRef.current?.children;
    let live = false;
    if (paths) {
      const cos = Math.cos(rot), sin = Math.sin(rot);
      geo.bridges.forEach((b, i) => {
        const p = paths[i] as SVGPathElement | undefined;
        if (!p) return;
        const dx = b.mid - st.hinge.x;
        const tx = st.hinge.x + dx * cos + st.sx;
        const ty = st.hinge.y + dx * sin + st.sy;
        const gap = Math.hypot(tx - b.mid, ty);
        if (st.phase === 'idle' || gap < 0.4) { p.style.opacity = '0'; return; }
        if (!st.snapped[i]) {
          const k = clamp(gap / STRETCH, 0, 1);
          p.setAttribute('d', `M${f(b.mid)},0Q${f((b.mid + tx) / 2)},${f(ty / 2 + gap * 0.18)} ${f(tx)},${f(ty)}`);
          p.style.strokeWidth = (2.6 - 1.8 * k).toFixed(2);
          p.style.opacity = '1';
          return;
        }
        const t = (now - st.snapAt[i]) / 170;
        if (t >= 1) { p.style.opacity = '0'; return; }
        live = true;
        const left = (1 - t) * (1 - t);
        p.setAttribute('d', `M${f(b.mid)},0L${f(b.mid + (tx - b.mid) * 0.3 * left)},${f(ty * 0.3 * left)}`);
        p.style.strokeWidth = '1';
        p.style.opacity = left.toFixed(2);
      });
    }
    return live;
  };

  const finish = () => {
    const st = s.current;
    st.phase = 'idle';
    Object.assign(st, { theta: 0, thetaV: 0, sx: 0, sy: 0, fade: 1, age: 0, pull: 0 });
    st.snapped = [];
    st.snapAt = [];
    paint(performance.now());
    setBusy(false);
    if (st.open) {
      st.open = false;
      pile.push(lines);
      pileSnap = pile.slice(-14);
      subs.forEach((fn) => fn());
      if (external) window.open(href, '_blank', 'noopener');
      else window.location.href = href;
    }
  };

  const step = (now: number) => {
    const st = s.current;
    const dt = clamp((now - st.last) / 1000, 0.001, 0.034);
    st.last = now;
    if (!geo) return;
    if (st.phase === 'held') {
      if (st.auto) { st.point.y += 900 * dt; st.point.x += 260 * dt * -st.sign; }
      const count = geo.bridges.length;
      let intact = 0;
      for (let i = 0; i < count; i += 1) if (!st.snapped[i]) intact += 1;
      const follow = 0.92 * (1 - RESISTANCE * (intact / count));
      const a = Math.atan2(st.point.y - st.hinge.y, st.point.x - st.hinge.x);
      const want = clamp(wrap(a - st.a0) * st.sign * follow, 0, TEAR_ANGLE + 0.1);
      st.theta += (want - st.theta) * (1 - Math.exp(-dt / 0.035));
      st.pull = Math.max(0, st.point.y - st.start.y);
      const away = clamp(st.pull * 0.05, -2, 5);
      const side = clamp((st.point.x - st.start.x) * 0.04, -3, 3);
      st.sx += (side - st.sx) * (1 - Math.exp(-dt / 0.05));
      st.sy += (away - st.sy) * (1 - Math.exp(-dt / 0.05));
      const slack = Math.hypot(st.sx, st.sy);
      let left = 0;
      geo.bridges.forEach((b, i) => {
        if (st.snapped[i]) return;
        const d = Math.abs(b.mid - st.hinge.x);
        if (2 * d * Math.sin(st.theta / 2) + slack > STRETCH || st.theta >= TEAR_ANGLE) {
          st.snapped[i] = true;
          st.snapAt[i] = now;
          jolt(5 / count);
        } else left += 1;
      });
      if (left === 0) {
        st.phase = 'free';
        jolt(1.2);
        if (st.auto) release(0, 0);
      }
    } else if (st.phase === 'free') {
      const cos = Math.cos(st.theta * st.sign), sin = Math.sin(st.theta * st.sign);
      const gx = st.grab.x - st.hinge.x, gy = st.grab.y - st.hinge.y;
      const wx = st.point.x - st.hinge.x - (gx * cos - gy * sin);
      const wy = st.point.y - st.hinge.y - (gx * sin + gy * cos);
      st.sx += (wx - st.sx) * (1 - Math.exp(-dt / 0.045));
      st.sy += (wy - st.sy) * (1 - Math.exp(-dt / 0.045));
      const hang = TEAR_ANGLE * 0.8 + clamp(st.pvx * 0.0009 * st.sign, -0.3, 0.3);
      st.theta += (hang - st.theta) * (1 - Math.exp(-dt / 0.12));
    } else if (st.phase === 'drop') {
      st.age += dt;
      st.vy += GRAVITY * dt;
      st.sx += st.vx * dt;
      st.sy += st.vy * dt;
      st.theta += st.spin * dt;
      if (st.age > 0.18) st.fade = clamp(1 - (st.age - 0.18) / 0.4, 0, 1);
      if (st.fade <= 0) { finish(); return; }
    } else if (st.phase === 'return') {
      st.thetaV += (-300 * st.theta - 24 * st.thetaV) * dt;
      st.theta += st.thetaV * dt;
      st.sx += (0 - st.sx) * (1 - Math.exp(-dt / 0.07));
      st.sy += (0 - st.sy) * (1 - Math.exp(-dt / 0.07));
      if (Math.abs(st.theta) < 0.001 && Math.abs(st.thetaV) < 0.02 && Math.hypot(st.sx, st.sy) < 0.06) { finish(); return; }
    }
    const fibres = paint(now);
    if (st.phase !== 'idle' || fibres) st.raf = requestAnimationFrame(step);
    else st.raf = 0;
  };

  const run = () => {
    const st = s.current;
    if (st.raf) return;
    st.last = performance.now();
    st.raf = requestAnimationFrame(step);
  };

  const local = (cx: number, cy: number): Pt => {
    const r = slotRef.current!.getBoundingClientRect();
    return { x: cx - r.left, y: cy - r.top };
  };

  const grab = (p: Pt) => {
    const st = s.current;
    if (st.theta < 0.01) {
      const right = p.x < size.w / 2;
      st.hinge = { x: right ? size.w : 0, y: 0 };
      st.sign = right ? -1 : 1;
      st.snapped = [];
      st.snapAt = [];
    }
    st.start = p;
    st.point = { ...p };
    st.grab = { ...p };
    st.pt = performance.now();
    st.pvx = 0;
    st.pvy = 0;
    st.a0 = Math.atan2(p.y - st.hinge.y, p.x - st.hinge.x) - (st.theta * st.sign) / 0.92;
    st.phase = 'held';
    st.thetaV = 0;
    setBusy(true);
    run();
  };

  function release(vx: number, vy: number) {
    const st = s.current;
    if (st.phase === 'free') {
      st.vx = clamp(vx, -1400, 1400);
      st.vy = clamp(vy, -1400, 1100);
      st.spin = clamp(st.vx * 0.004, -6, 6) + 1.6 * st.sign;
      st.age = 0;
      st.phase = 'drop';
      st.open = true;
    } else if (st.phase === 'held') {
      st.phase = 'return';
    }
    run();
  }

  const reduce = () => still;

  const onDown = (e: PointerEvent<HTMLAnchorElement>) => {
    const st = s.current;
    if (reduce() || e.button !== 0 || e.pointerType === 'touch' || st.phase === 'drop' || st.auto) return;
    st.id = e.pointerId;
    st.moved = false;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* fine */ }
    grab(local(e.clientX, e.clientY));
  };
  const onMove = (e: PointerEvent<HTMLAnchorElement>) => {
    const st = s.current;
    if (st.id !== e.pointerId) return;
    const p = local(e.clientX, e.clientY);
    const now = performance.now();
    const dt = Math.max(0.004, (now - st.pt) / 1000);
    st.pvx += ((p.x - st.point.x) / dt - st.pvx) * 0.35;
    st.pvy += ((p.y - st.point.y) / dt - st.pvy) * 0.35;
    st.pt = now;
    st.point = p;
    if (Math.hypot(p.x - st.start.x, p.y - st.start.y) > 5) st.moved = true;
  };
  const onUp = (e: PointerEvent<HTMLAnchorElement>) => {
    const st = s.current;
    if (st.id !== e.pointerId) return;
    st.id = -1;
    const quiet = performance.now() - st.pt > 80;
    release(quiet ? 0 : st.pvx, quiet ? 0 : st.pvy);
  };
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const st = s.current;
    // Keyboard (detail 0), modified clicks and reduced motion: a plain link.
    if (e.detail === 0 || reduce() || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    if (st.moved || st.phase === 'drop' || st.phase === 'free') { st.moved = false; return; }
    // A plain click or tap: play the tear, then open.
    st.auto = true;
    if (st.phase === 'return' || st.phase === 'held') st.phase = 'idle';
    const r = slotRef.current!.getBoundingClientRect();
    const p = { x: e.clientX ? e.clientX - r.left : r.width * 0.3, y: e.clientY ? e.clientY - r.top : r.height * 0.7 };
    grab(p);
    const done = () => { st.auto = false; };
    setTimeout(done, 1400);
  };

  return (
    <div ref={slotRef} className="fl-slot" data-busy={busy ? '' : undefined}>
      <div className="fl-tab fl-under" aria-hidden="true" style={geo ? { clipPath: `path('${geo.d}')` } : undefined}>
        {lines.map((l, i) => <span key={i}>{l}</span>)}
      </div>
      <svg ref={fibreRef} className="fl-fibres" aria-hidden="true">
        {geo?.bridges.map((_, i) => <path key={i} />)}
      </svg>
      <a
        ref={tabRef}
        className="fl-tab"
        href={href}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        style={geo ? { clipPath: `path('${geo.d}')` } : undefined}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClick={onClick}
      >
        {lines.map((l, i) => <span key={i}>{l}</span>)}
      </a>
      <svg className="fl-holes" aria-hidden="true">
        {geo?.holes.map((cx, i) => <circle key={i} cx={cx} cy={0} r={HOLE / 2} />)}
      </svg>
    </div>
  );
}

/** Label lines for a link: the hostname (or address), broken where a tab can take it. */
export function linesFor(href: string): string[] {
  if (href.startsWith('mailto:')) {
    const [u, d] = href.slice(7).split('@');
    const dot = u.indexOf('.');
    return u.length > 12 && dot > 0 ? [u.slice(0, dot + 1), u.slice(dot + 1), '@' + d] : [u, '@' + d];
  }
  const url = new URL(href);
  const host = url.hostname.replace(/^www\./, '');
  const path = url.pathname.replace(/\/$/, '');
  if (host === 'github.com') return ['github.com', path.slice(1)];
  const dot = host.indexOf('.');
  if (host.length > 12 && dot > 0) return [host.slice(0, dot), host.slice(dot)];
  return [host];
}
