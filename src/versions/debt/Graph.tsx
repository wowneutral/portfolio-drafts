// Remixed from pmndrs/examples "bezier-curves-and-nodes" (MIT): an orthographic canvas of draggable nodes joined by QuadraticBezierLine cables that bend live as you drag.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { QuadraticBezierLine } from '@react-three/drei';
import { still } from '@/lib/utils';

export type GNode = {
  id: string;
  fx: number; fy: number;        // home, as a fraction of the field (centre of the word)
  px?: number; py?: number;      // home on a phone
  pin?: boolean;                 // an anchor point with no word
  href?: string;                 // renders a link instead of a button
  cls?: string;
  hint?: string;
  children?: ReactNode;
};

type Body = {
  id: string; pin: boolean;
  bx: number; by: number;        // where CSS puts it (fraction of field, unclamped)
  hx: number; hy: number;        // home, clamped inside the field
  x: number; y: number; vx: number; vy: number;
  w: number; h: number;
  drag: boolean; tx: number; ty: number;
  held: boolean; kx: number; ky: number;
  el: HTMLElement | null;
};
type Edge = { a: Body; b: Body; rest: number; mx: number; my: number; vx: number; vy: number; seeded: boolean };

const K = 110;                               // soft home spring
const C = 2 * Math.sqrt(K) * (still ? 1 : 0.62); // a little overshoot, none when reduced
const KD = 700, CD = 2 * Math.sqrt(KD) * 0.92;   // the hand: stiff, heavy follow
const KM = 70, CM = 2 * Math.sqrt(KM) * (still ? 1 : 0.5);
const KP = 46;                               // how hard an over-stretched thread tugs the other end

export class Sim {
  bodies = new Map<string, Body>();
  edges: Edge[] = [];
  W = 1; H = 1;
  raf = 0;
  last = 0;
  visible = true;
  onFrame: (() => void) | null = null;
  constructor(nodes: GNode[], edges: [string, string][]) {
    for (const n of nodes) this.bodies.set(n.id, { id: n.id, pin: !!n.pin, bx: 0, by: 0, hx: 0, hy: 0, x: 0, y: 0, vx: 0, vy: 0, w: 0, h: 0, drag: false, tx: 0, ty: 0, held: false, kx: 0, ky: 0, el: null });
    this.edges = edges.map(([a, b]) => ({ a: this.bodies.get(a)!, b: this.bodies.get(b)!, rest: 1, mx: 0, my: 0, vx: 0, vy: 0, seeded: false }));
  }
  layout(field: HTMLElement, nodes: GNode[], phone: boolean, first: boolean, openFrom?: string) {
    this.W = field.clientWidth; this.H = field.clientHeight;
    for (const n of nodes) {
      const b = this.bodies.get(n.id)!;
      const fx = phone && n.px !== undefined ? n.px : n.fx;
      const fy = phone && n.py !== undefined ? n.py : n.fy;
      b.w = b.el ? b.el.offsetWidth : 0; b.h = b.el ? b.el.offsetHeight : 0;
      b.bx = fx * this.W; b.by = fy * this.H;
      b.hx = this.clampX(b, b.bx); b.hy = this.clampY(b, b.by);
      b.x = b.hx; b.y = b.hy; b.vx = b.vy = 0; b.held = false; b.drag = false;
    }
    for (const e of this.edges) { e.rest = Math.hypot(e.a.hx - e.b.hx, e.a.hy - e.b.hy); e.seeded = false; }
    const root = openFrom ? this.bodies.get(openFrom) : null;
    if (first && root && !still) for (const b of this.bodies.values()) if (b !== root && !b.pin) { b.x = b.hx + (root.hx - b.hx) * 0.42; b.y = b.hy + (root.hy - b.hy) * 0.42; }
    for (const e of this.edges) this.seedMid(e);
    this.paint();
    this.wake();
  }
  clampX(b: Body, x: number) { if (b.pin) return x; const m = b.w / 2 + 4; return Math.min(this.W - m, Math.max(m, x)); }
  clampY(b: Body, y: number) { if (b.pin) return y; const m = b.h / 2 + 4; return Math.min(this.H - m, Math.max(m, y)); }
  midTarget(e: Edge) {
    const d = Math.hypot(e.a.x - e.b.x, e.a.y - e.b.y);
    const slack = Math.max(0, e.rest * 1.04 + 24 - d);
    const sag = 2 * (5 + slack * 0.4); // control point offset that gives this sag at the middle
    return [(e.a.x + e.b.x) / 2, (e.a.y + e.b.y) / 2 + sag];
  }
  /** Where a thread meets a word: the edge of its box, along the thread's own direction. */
  tip(b: Body, tx: number, ty: number) {
    if (b.pin) return [b.x, b.y];
    const dx = tx - b.x, dy = ty - b.y, hw = b.w / 2 - 4, hh = b.h / 2;
    const t = Math.min(hw / (Math.abs(dx) || 1e-6), hh / (Math.abs(dy) || 1e-6));
    return t >= 1 ? [b.x, b.y] : [b.x + dx * t, b.y + dy * t];
  }
  ends(e: Edge) {
    const [ax, ay] = this.tip(e.a, e.b.x, e.b.y), [bx, by] = this.tip(e.b, e.a.x, e.a.y);
    return [ax, ay, bx, by, e.mx, e.my];
  }
  seedMid(e: Edge) { const [x, y] = this.midTarget(e); e.mx = x; e.my = y; e.vx = e.vy = 0; e.seeded = true; }
  wake() { if (!this.raf && this.visible) { this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); } }
  stop() { cancelAnimationFrame(this.raf); this.raf = 0; }
  tick = (t: number) => {
    this.raf = 0;
    const dt = Math.min(1 / 30, Math.max(0.001, (t - this.last) / 1000));
    this.last = t;
    const awake = this.step(dt / 2) | this.step(dt / 2);
    this.paint();
    if (awake) this.raf = requestAnimationFrame(this.tick);
  };
  step(dt: number) {
    let awake = 0;
    const fx = new Map<Body, [number, number]>();
    for (const e of this.edges) {
      const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y, d = Math.hypot(dx, dy) || 1;
      const limit = e.rest * 1.2 + 50;
      if (d > limit) {
        const f = KP * (d - limit), ux = dx / d, uy = dy / d;
        const fa = fx.get(e.a) ?? [0, 0], fb = fx.get(e.b) ?? [0, 0];
        fa[0] += f * ux; fa[1] += f * uy; fb[0] -= f * ux; fb[1] -= f * uy;
        fx.set(e.a, fa); fx.set(e.b, fb);
      }
    }
    for (const b of this.bodies.values()) {
      if (b.pin) continue;
      let ax: number, ay: number;
      if (b.drag) { ax = KD * (b.tx - b.x) - CD * b.vx; ay = KD * (b.ty - b.y) - CD * b.vy; }
      else {
        const gx = b.held ? b.kx : b.hx, gy = b.held ? b.ky : b.hy;
        const f = b.held ? [0, 0] : fx.get(b) ?? [0, 0];
        ax = K * (gx - b.x) - C * b.vx + f[0]; ay = K * (gy - b.y) - C * b.vy + f[1];
      }
      b.vx += ax * dt; b.vy += ay * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      const cx = this.clampX(b, b.x), cy = this.clampY(b, b.y);
      if (cx !== b.x) { b.x = cx; b.vx *= -0.2; }
      if (cy !== b.y) { b.y = cy; b.vy *= -0.2; }
      const gx = b.drag ? b.tx : b.held ? b.kx : b.hx, gy = b.drag ? b.ty : b.held ? b.ky : b.hy;
      if (b.drag || Math.abs(b.vx) + Math.abs(b.vy) > 1.5 || Math.abs(gx - b.x) + Math.abs(gy - b.y) > 0.4) awake = 1;
      else { b.x = this.clampX(b, gx); b.y = this.clampY(b, gy); b.vx = b.vy = 0; }
    }
    for (const e of this.edges) {
      const [tx, ty] = this.midTarget(e);
      e.vx += (KM * (tx - e.mx) - CM * e.vx) * dt; e.vy += (KM * (ty - e.my) - CM * e.vy) * dt;
      e.mx += e.vx * dt; e.my += e.vy * dt;
      if (Math.abs(e.vx) + Math.abs(e.vy) > 1 || Math.abs(tx - e.mx) + Math.abs(ty - e.my) > 0.4) awake = 1;
    }
    return awake;
  }
  paint() {
    for (const b of this.bodies.values()) if (b.el && !b.pin) b.el.style.transform = `translate3d(${(b.x - b.bx).toFixed(2)}px, ${(b.y - b.by).toFixed(2)}px, 0)`;
    this.onFrame?.();
  }
}

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
const WEBGL = typeof window !== 'undefined' && hasWebGL();
const RED = '#c0392b';

/** The base example's cables, now one red thread and its faint shadow on the paper. */
function GLThreads({ sim }: { sim: Sim }) {
  const lines = useRef<any[]>([]);
  const shadows = useRef<any[]>([]);
  const { invalidate } = useThree();
  useEffect(() => {
    const prev = sim.onFrame;
    const own = () => { prev?.(); invalidate(); };
    sim.onFrame = own;
    invalidate();
    return () => { if (sim.onFrame === own) sim.onFrame = prev; };
  }, [sim, invalidate]);
  useFrame(() => {
    const W = sim.W / 2, H = sim.H / 2;
    sim.edges.forEach((e, i) => {
      const [ax, ay, bx, by, mx, my] = sim.ends(e);
      const s: [number, number, number] = [ax - W, H - ay, 0], t: [number, number, number] = [bx - W, H - by, 0], m: [number, number, number] = [mx - W, H - my, 0];
      lines.current[i]?.setPoints(s, t, m);
      shadows.current[i]?.setPoints([s[0] + 2, s[1] - 4, -1], [t[0] + 2, t[1] - 4, -1], [m[0] + 3, m[1] - 7, -1]);
    });
  });
  return (
    <>
      {sim.edges.map((_, i) => (
        <group key={i}>
          <QuadraticBezierLine ref={(el: any) => { shadows.current[i] = el; }} start={[0, 0, -1]} end={[1, 0, -1]} color="#171612" lineWidth={2.6} transparent opacity={0.1} {...({ segments: 40 } as object)} />
          <QuadraticBezierLine ref={(el: any) => { lines.current[i] = el; }} start={[0, 0, 0]} end={[1, 0, 0]} color={RED} lineWidth={2.1} {...({ segments: 40 } as object)} />
        </group>
      ))}
    </>
  );
}

/** The same threads in SVG, for no WebGL and for the moment before the canvas is up. */
function SVGThreads({ sim }: { sim: Sim }) {
  const g = useRef<SVGGElement>(null);
  useEffect(() => {
    const prev = sim.onFrame;
    const own = () => {
      prev?.();
      const kids = g.current?.children;
      if (!kids) return;
      sim.edges.forEach((e, i) => {
        const [ax, ay, bx, by, mx, my] = sim.ends(e);
        kids[i * 2]?.setAttribute('d', `M${ax + 2} ${ay + 4}Q${mx + 3} ${my + 7} ${bx + 2} ${by + 4}`);
        kids[i * 2 + 1]?.setAttribute('d', `M${ax} ${ay}Q${mx} ${my} ${bx} ${by}`);
      });
    };
    sim.onFrame = own;
    own();
    return () => { if (sim.onFrame === own) sim.onFrame = prev; };
  }, [sim]);
  return (
    <svg className="threads-svg" aria-hidden="true">
      <g ref={g}>
        {sim.edges.map((_, i) => [
          <path key={'s' + i} d="M0 0" stroke="#171612" strokeOpacity={0.1} strokeWidth={2.6} fill="none" />,
          <path key={'t' + i} d="M0 0" stroke={RED} strokeWidth={2.1} fill="none" strokeLinecap="round" />,
        ])}
      </g>
    </svg>
  );
}

export function Graph({ nodes, edges, phone, className, label, openFrom }: { nodes: GNode[]; edges: [string, string][]; phone: boolean; className: string; label: string; openFrom?: string }) {
  const field = useRef<HTMLDivElement>(null);
  const [sim] = useState(() => new Sim(nodes, edges));
  const [near, setNear] = useState(false);
  const [glUp, setGlUp] = useState(false);
  const first = useRef(true);

  useLayoutEffect(() => {
    const f = field.current!;
    const run = () => { sim.layout(f, nodes, phone, first.current, openFrom); first.current = false; };
    run();
    const ro = new ResizeObserver(() => { if (Math.abs(f.clientWidth - sim.W) > 1 || Math.abs(f.clientHeight - sim.H) > 1) run(); });
    ro.observe(f);
    document.fonts?.ready.then(() => { if (f.isConnected) sim.layout(f, nodes, phone, false); });
    return () => { ro.disconnect(); sim.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim, phone]);

  useEffect(() => {
    const io = new IntersectionObserver(([en]) => {
      sim.visible = en.isIntersecting;
      if (en.isIntersecting) { setNear(true); sim.wake(); } else sim.stop();
    }, { rootMargin: '300px 0px' });
    io.observe(field.current!);
    return () => io.disconnect();
  }, [sim]);

  const down = useRef({ id: '', sx: 0, sy: 0, ox: 0, oy: 0, moved: false, suppress: '' });
  const local = (e: { clientX: number; clientY: number }) => { const r = field.current!.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

  const handlers = (n: GNode) => {
    const b = sim.bodies.get(n.id)!;
    return {
      ref: (el: HTMLElement | null) => { b.el = el; },
      onPointerDown: (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        const [x, y] = local(e);
        down.current = { id: n.id, sx: x, sy: y, ox: x - b.x, oy: y - b.y, moved: false, suppress: '' };
        b.drag = true; b.held = false; b.tx = b.x; b.ty = b.y;
        field.current!.dataset.dragging = n.id;
        sim.wake();
      },
      onPointerMove: (e: React.PointerEvent) => {
        if (!b.drag) return;
        const [x, y] = local(e);
        const d = down.current;
        if (Math.hypot(x - d.sx, y - d.sy) > 5) d.moved = true;
        b.tx = x - d.ox; b.ty = y - d.oy;
        sim.wake();
      },
      onPointerUp: () => {
        if (!b.drag) return;
        b.drag = false;
        if (down.current.moved) down.current.suppress = n.id;
        delete field.current!.dataset.dragging;
        sim.wake();
      },
      onPointerCancel: () => { b.drag = false; delete field.current!.dataset.dragging; sim.wake(); },
      onClick: (e: React.MouseEvent) => {
        if (down.current.suppress === n.id) { e.preventDefault(); down.current.suppress = ''; return; }
        if (!n.href) { b.vy -= still ? 0 : 320; b.vx += still ? 0 : (Math.random() - 0.5) * 120; sim.wake(); }
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        const step = e.shiftKey ? 72 : 28;
        const map: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
        if (map[e.key]) {
          e.preventDefault();
          if (!b.held) { b.held = true; b.kx = b.x; b.ky = b.y; }
          b.kx = sim.clampX(b, b.kx + map[e.key][0]); b.ky = sim.clampY(b, b.ky + map[e.key][1]);
          sim.wake();
        } else if (e.key === 'Escape' && b.held) { b.held = false; sim.wake(); }
      },
      onBlur: () => { if (b.held) { b.held = false; sim.wake(); } },
    };
  };

  const hintId = `${className}-hint`;
  return (
    <div className={`field ${className}`} ref={field} role="group" aria-label={label}>
      {WEBGL && near ? (
        <Canvas className="threads-gl" orthographic flat frameloop="demand" dpr={[1, 2]} camera={{ zoom: 1, position: [0, 0, 100], near: 0.1, far: 1000 }} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} gl={{ alpha: true, antialias: true }} onCreated={() => setTimeout(() => setGlUp(true), 120)} aria-hidden="true">
          <GLThreads sim={sim} />
        </Canvas>
      ) : null}
      {!glUp ? <SVGThreads sim={sim} /> : null}
      <span id={hintId} className="sr-only-x">Drag it, or use the arrow keys. Escape sends it home.</span>
      {nodes.map((n) => {
        const fx = phone && n.px !== undefined ? n.px : n.fx;
        const fy = phone && n.py !== undefined ? n.py : n.fy;
        const style = { left: `${fx * 100}%`, top: `${fy * 100}%` };
        if (n.pin) return <span key={n.id} className="pin" aria-hidden="true" style={style} ref={(el) => { sim.bodies.get(n.id)!.el = el; }} />;
        const h = handlers(n);
        if (n.href) return <a key={n.id} href={n.href} className={`node ${n.cls ?? ''}`} style={style} aria-describedby={hintId} draggable={false} {...h}>{n.children}</a>;
        return <button key={n.id} type="button" className={`node ${n.cls ?? ''}`} style={style} aria-describedby={hintId} {...h}>{n.children}</button>;
      })}
    </div>
  );
}
