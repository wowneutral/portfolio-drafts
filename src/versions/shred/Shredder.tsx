// Adapted from React Bits Micro/Shredder (MIT + Commons Clause, reactbits.dev): its drag-into-the-slit feed, tug, bite, sliver painting and curl, reworked so strips settle in a tray instead of fading.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { COBALT, fonts, lay, texture, type Laid, type Spec } from './paper';

const FOLLOW = 30;
const SETTLE = 16;
const TUG = 2.4;
const TUG_DECAY = 0.14;
const OVER = 48;
const SLIVER = 2;
const SLIT = 3;
const DEG = Math.PI / 180;
const GAP = 3;
const DROP = 56;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const ease = (from: number, to: number, dt: number, tau: number) => from + (to - from) * (1 - Math.exp(-dt / tau));
const smooth = (t: number) => {
  const u = clamp(t, 0, 1);
  return u * u * (3 - 2 * u);
};
const pick = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const side = () => (Math.random() < 0.5 ? -1 : 1);
const reduced = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const spring = (p: number, v: number, target: number, dt: number, omega: number): [number, number] => {
  const offset = p - target;
  const term = v + omega * offset;
  const decay = Math.exp(-omega * dt);
  return [target + (offset + term * dt) * decay, (v - omega * term * dt) * decay];
};

/** One cut sheet: its texture and how its strips lie when reassembled. Shared with the closing tray. */
export type Cut = { id: string; tex: HTMLCanvasElement; ts: number; W: number; H: number; strips: { x: number; w: number; dy: number; th: number; curl: number }[] };

type Strip = {
  cut: Cut;
  sheet: number;
  i: number;
  phase: 'attached' | 'free' | 'rest';
  curl: number;
  amp: number;
  freq: number;
  wave: number;
  rA: number;
  th: number;
  ax: number;
  ay: number;
  vx: number;
  vy: number;
  hang: number;
  tear: number;
  pts: number[];
};

type Feed = { sheet: number; el: HTMLElement; W: number; H: number; rx: number; ry: number; tx: number; tilt: number; lift: number; v: number; age: number; done: boolean };
type Drag = { sheet: number; el: HTMLElement; rx: number; ry: number; vx: number; vy: number; tx: number; ty: number; gx: number; gy: number; px: number; py: number; ox: number; oy: number; moved: boolean; tilt: number; lift: number; phase: 'drag' | 'carry' | 'return'; id: number | null };

const shape = (st: Strip, len: number, time: number) => {
  const pts = st.pts;
  pts.length = 0;
  let x = st.ax;
  let y = st.ay;
  const steps = Math.ceil(len / SLIVER);
  const swing = (3 + 9 * st.rA) * st.tear;
  const pace = time * (1.6 + st.rA * 2.2) + st.rA * 6.2832;
  for (let j = 0; j <= steps; j += 1) {
    const d = Math.min(j * SLIVER, len);
    const a = st.th + st.curl * d + st.amp * Math.sin(d * st.freq + st.wave);
    const flutter = swing * Math.sin(d * 0.045 + pace);
    pts.push(x + flutter * Math.cos(a), y - flutter * Math.sin(a), a);
    const h = Math.min(SLIVER, len - d);
    x += Math.sin(a) * h;
    y += Math.cos(a) * h;
  }
};

const paintStrip = (ctx: CanvasRenderingContext2D, st: Strip, len: number, dpr: number, edge: boolean) => {
  const { tex, ts, H } = st.cut;
  const s = st.cut.strips[st.i];
  const pts = st.pts;
  const half = s.w / 2;
  const v0 = H - len;
  for (let j = 0; j + 3 < pts.length; j += 3) {
    const d = (j / 3) * SLIVER;
    const h = Math.min(SLIVER, len - d);
    if (h <= 0) break;
    const ca = Math.cos(pts[j + 2]);
    const sa = Math.sin(pts[j + 2]);
    ctx.setTransform(dpr * ca, -dpr * sa, dpr * sa, dpr * ca, dpr * (pts[j] + OVER), dpr * pts[j + 1]);
    ctx.drawImage(tex, s.x * ts, (v0 + d) * ts, s.w * ts, h * ts, -half, 0, s.w, h + 0.4);
    if (edge) {
      ctx.fillStyle = COBALT;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(-half, 0, 1, h + 0.4);
      ctx.fillRect(half - 1, 0, 1, h + 0.4);
      ctx.globalAlpha = 1;
    }
  }
};

export type ShredderProps = {
  specs: Spec[];
  /** 'single': one sheet reassembled; 'ladder': each sheet in its own place (side by side when wide, stacked when narrow). */
  tray: 'single' | 'ladder';
  onShred?: (cut: Cut, index: number) => void;
  label: string;
  className?: string;
};

export default function Shredder({ specs, tray, onShred, label, className = '' }: ShredderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slitRef = useRef<HTMLDivElement>(null);
  const sheetEls = useRef<(HTMLElement | null)[]>([]);
  const [stageW, setStageW] = useState(0);
  const [ready, setReady] = useState(false);
  const [gone, setGone] = useState(0);
  const sim = useRef({ raf: 0, last: 0, t: 0, drag: null as Drag | null, feeds: [] as Feed[], strips: [] as Strip[], cuts: [] as (Cut | null)[], suppress: false, dpr: 1 });

  useLayoutEffect(() => {
    const root = rootRef.current!;
    const ro = new ResizeObserver(() => setStageW(root.offsetWidth));
    ro.observe(root);
    setStageW(root.offsetWidth);
    fonts().then(() => setReady(true));
    return () => ro.disconnect();
  }, []);

  // Layout, recomputed from the stage width.
  const narrow = stageW < 700;
  const row = tray === 'ladder' && stageW >= 860;
  const nSheets = specs.length;
  const W = tray === 'single' ? Math.min(stageW - (narrow ? 0 : 40), 780) : row ? Math.min(300, Math.floor((stageW - 60) / 3) - GAP * 6) : Math.min(stageW - 24, 520);
  const s = tray === 'single' ? clamp(W / 640, 0.72, 1.08) : row ? clamp(W / 300, 0.72, 0.86) : clamp(W / 420, 0.72, 0.9);
  const laid: Laid[] = ready && stageW > 0 ? specs.map((sp) => lay(sp, W, s)) : [];
  const Hmax = laid.reduce((a, l) => Math.max(a, l.H), 0);
  const stackH = Hmax + 40;
  const slotY = stackH;
  const exit = slotY + SLIT;
  const target = narrow ? 52 : 46;

  const geo = useRef({ stageW, W, slotY, exit, row, tray, laid, F: 0 });
  const cutW = (c: Cut) => c.W + GAP * (c.strips.length - 1);
  const origin = (k: number, c: Cut) => {
    const g = geo.current;
    if (g.tray === 'single') return { x: (g.stageW - cutW(c)) / 2, y: DROP };
    if (g.row) {
      const colW = cutW(c);
      const total = colW * nSheets + 28 * (nSheets - 1);
      return { x: (g.stageW - total) / 2 + k * (colW + 28), y: DROP };
    }
    let y = DROP;
    for (let j = 0; j < k; j += 1) y += (g.laid[j]?.H ?? c.H) + 16;
    return { x: (g.stageW - cutW(c)) / 2, y };
  };
  const F = (() => {
    if (!laid.length) return 0;
    if (tray === 'single' || row) return DROP + Hmax + 28;
    return DROP + laid.slice(0, Math.min(laid.length, gone + 1)).reduce((a, l) => a + l.H + 16, 0) + 12;
  })();
  geo.current = { stageW, W, slotY, exit, row, tray, laid, F };

  const restOf = (st: Strip) => {
    const o = origin(st.sheet, st.cut);
    const p = st.cut.strips[st.i];
    return { x: o.x + p.x + st.i * GAP + p.w / 2, y: o.y + p.dy, th: p.th, curl: p.curl };
  };

  const run = () => {
    const S = sim.current;
    if (S.raf) return;
    S.last = performance.now();
    S.raf = requestAnimationFrame(step);
  };

  const makeCut = (k: number): Cut | null => {
    const l = geo.current.laid[k];
    if (!l) return null;
    const ts = Math.min(2, window.devicePixelRatio || 1);
    const n = Math.max(1, Math.round(l.W / target));
    const sw = Math.floor(l.W / n);
    const strips = Array.from({ length: n }, (_, i) => ({
      x: i * sw,
      w: i === n - 1 ? l.W - sw * (n - 1) : sw,
      dy: pick(-3, 3),
      th: pick(-0.5, 0.5) * DEG,
      curl: side() * pick(0.002, 0.008) * DEG,
    }));
    return { id: specs[k].id, tex: texture(l, ts), ts, W: l.W, H: l.H, strips };
  };

  const stripsFor = (cut: Cut, k: number, phase: Strip['phase']) =>
    cut.strips.map((_, i): Strip => ({
      cut, sheet: k, i, phase,
      curl: side() * pick(0.35, 0.9) * DEG,
      amp: pick(1.5, 4) * DEG,
      freq: (Math.PI * 2) / pick(34, 60),
      wave: pick(0, Math.PI * 2),
      rA: Math.random(),
      th: 0, ax: 0, ay: 0, vx: 0, vy: 0, hang: 0, tear: 0, pts: [],
    }));

  const finish = (k: number, cut: Cut) => {
    setGone(k + 1);
    onShred?.(cut, k);
    requestAnimationFrame(() => {
      const next = sheetEls.current[k + 1];
      if (next) next.focus({ preventScroll: true });
      else rootRef.current?.focus({ preventScroll: true });
    });
  };

  const consumeNow = (k: number) => {
    const S = sim.current;
    const cut = makeCut(k);
    if (!cut) return;
    S.cuts[k] = cut;
    S.strips.push(...stripsFor(cut, k, 'rest'));
    finish(k, cut);
    run();
  };

  const grab = (d: Drag) => {
    const S = sim.current;
    S.drag = null;
    if (reduced()) {
      consumeNow(d.sheet);
      return;
    }
    const cut = makeCut(d.sheet);
    if (!cut) return;
    S.cuts[d.sheet] = cut;
    const g = geo.current;
    d.el.dataset.state = 'feed';
    S.feeds.push({ sheet: d.sheet, el: d.el, W: cut.W, H: cut.H, rx: d.rx, ry: d.ry, tx: (g.stageW - cut.W) / 2, tilt: d.tilt, lift: d.lift, v: 180 * TUG, age: 0, done: false });
    S.strips.push(...stripsFor(cut, d.sheet, 'attached'));
  };

  const restPos = (k: number) => {
    const g = geo.current;
    const l = g.laid[k];
    return { x: (g.stageW - (l?.W ?? 0)) / 2, y: g.slotY - (l?.H ?? 0) - 12 };
  };

  const begin = (k: number, phase: Drag['phase'], e: PointerEvent<HTMLElement> | null) => {
    const S = sim.current;
    const el = sheetEls.current[k];
    if (S.drag || !el || S.feeds.some((f) => f.sheet === k) || S.cuts[k]) return;
    const r = rootRef.current!.getBoundingClientRect();
    const p0 = restPos(k);
    const p = e ? { x: e.clientX - r.left, y: e.clientY - r.top } : p0;
    S.drag = { sheet: k, el, rx: p0.x, ry: p0.y, vx: 0, vy: 0, tx: p0.x, ty: p0.y, gx: p.x - p0.x, gy: p.y - p0.y, px: p.x, py: p.y, ox: p.x, oy: p.y, moved: false, tilt: 0, lift: 1, phase, id: e ? e.pointerId : null };
    el.dataset.state = 'drag';
    run();
  };

  const tick = (now: number) => {
    const S = sim.current;
    const g = geo.current;
    const canvas = canvasRef.current;
    if (!canvas || !rootRef.current) {
      S.raf = 0;
      return;
    }
    const dt = clamp((now - S.last) / 1000, 0, 0.05);
    S.last = now;
    S.t += dt;
    const d = S.drag;
    if (d) {
      const l = g.laid[d.sheet];
      const H = l?.H ?? 0;
      const lip = g.slotY;
      const ceiling = lip + 18 - H;
      const home = restPos(d.sheet);
      if (d.phase === 'drag') {
        d.tx = d.px - d.gx;
        d.ty = Math.min(d.py - d.gy, ceiling);
        if (!d.moved && Math.hypot(d.px - d.ox, d.py - d.oy) > 6) d.moved = true;
      } else if (d.phase === 'carry') {
        d.tx = home.x;
        d.ty = ceiling;
      } else {
        d.tx = home.x;
        d.ty = home.y;
      }
      const omega = d.phase === 'drag' ? FOLLOW : SETTLE;
      [d.rx, d.vx] = spring(d.rx, d.vx, d.tx, dt, omega);
      [d.ry, d.vy] = spring(d.ry, d.vy, d.ty, dt, omega);
      d.tilt = ease(d.tilt, d.phase === 'drag' ? clamp(d.vx * 0.012, -6, 6) : 0, dt, 0.09);
      d.lift = ease(d.lift, d.phase === 'return' ? 1 : 1.02, dt, 0.12);
      const over = d.ry + H - lip;
      if (d.phase !== 'return' && over >= 17.5) {
        grab(d);
      } else {
        d.el.style.transform = `translate(${d.rx - home.x}px, ${d.ry - home.y}px) rotate(${d.tilt}deg) scale(${d.lift})`;
        const settled = Math.abs(d.rx - d.tx) < 0.2 && Math.abs(d.ry - d.ty) < 0.2 && Math.abs(d.vy) < 2 && Math.abs(d.vx) < 2;
        if (d.phase === 'return' && settled && Math.abs(d.tilt) < 0.05) {
          d.el.style.transform = '';
          delete d.el.dataset.state;
          S.drag = null;
        }
      }
    }
    let pulling = false;
    for (let i = S.feeds.length - 1; i >= 0; i -= 1) {
      const f = S.feeds[i];
      const home = restPos(f.sheet);
      if (!f.done) {
        pulling = true;
        f.age += dt;
        f.v = 180 * (1 + (TUG - 1) * Math.exp(-f.age / TUG_DECAY));
        f.ry += f.v * dt;
        f.rx = ease(f.rx, f.tx, dt, 0.1);
        f.tilt = ease(f.tilt, 0, dt, 0.08);
        f.lift = ease(f.lift, 1, dt, 0.1);
        if (f.ry >= g.slotY) {
          f.done = true;
          f.el.style.visibility = 'hidden';
          const cut = S.cuts[f.sheet];
          if (cut) finish(f.sheet, cut);
        } else {
          const jitter = Math.sin(S.t * 150) * 0.5;
          f.el.style.transform = `translate(${f.rx - home.x + jitter}px, ${f.ry - home.y}px) rotate(${f.tilt}deg) scale(${f.lift})`;
        }
      } else {
        f.ry += f.v * dt;
      }
    }
    const ctx = canvas.getContext('2d')!;
    const dpr = S.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let moving = false;
    const resting: Strip[] = [];
    for (const st of S.strips) {
      const f = S.feeds.find((x) => x.sheet === st.sheet);
      const R = restOf(st);
      let len = st.cut.H;
      if (st.phase === 'attached' && f) {
        const top = f.ry - g.exit;
        st.hang = top + st.cut.H;
        moving = true;
        if (st.hang <= 0) continue;
        const p = st.cut.strips[st.i];
        st.ax = f.rx + p.x + p.w / 2;
        st.th = Math.sin(S.t * 6 + st.wave) * 0.03 * smooth(st.hang / 40);
        st.tear = 0;
        if (top >= 0) {
          st.phase = 'free';
          st.ay = top;
          st.vy = f.v * 0.6;
          st.vx = pick(-30, 30);
          st.tear = 1;
        } else {
          st.ay = 0;
          len = st.hang;
        }
      }
      if (st.phase === 'free') {
        moving = true;
        st.vy += 1500 * dt;
        st.ay += st.vy * dt;
        st.ax = ease(st.ax, R.x, dt, 0.28 + st.rA * 0.12);
        st.th = ease(st.th, R.th, dt, 0.3);
        st.curl = ease(st.curl, R.curl, dt, 0.22 + st.rA * 0.1);
        st.amp = ease(st.amp, 0.3 * DEG, dt, 0.3);
        st.tear = ease(st.tear, 0, dt, 0.35);
        if (st.ay >= R.y) {
          st.ay = R.y;
          st.vy = -st.vy * 0.22;
          if (Math.abs(st.vy) < 40 && Math.abs(st.ax - R.x) < 1.5 && Math.abs(st.curl - R.curl) < 0.02 * DEG) st.phase = 'rest';
        }
      }
      if (st.phase === 'rest') {
        st.ax = R.x;
        st.ay = R.y;
        st.th = R.th;
        st.curl = R.curl;
        st.amp = 0.3 * DEG;
        st.tear = 0;
        resting.push(st);
        continue;
      }
      shape(st, len, S.t);
      paintStrip(ctx, st, len, dpr, st.phase === 'free');
    }
    // Strips at rest: a soft contact shadow, then the paper.
    if (resting.length) {
      for (const st of resting) {
        shape(st, st.cut.H, S.t);
        const p = st.cut.strips[st.i];
        ctx.setTransform(dpr, 0, 0, dpr, dpr * OVER, 0);
        ctx.save();
        ctx.translate(st.ax, st.ay);
        ctx.rotate(-st.th);
        ctx.shadowColor = 'rgba(18,18,18,0.16)';
        ctx.shadowBlur = 8 * dpr;
        ctx.shadowOffsetY = 3 * dpr;
        ctx.fillStyle = '#fcfcfa';
        ctx.fillRect(-p.w / 2, 0, p.w, st.cut.H);
        ctx.restore();
      }
      for (const st of resting) paintStrip(ctx, st, st.cut.H, dpr, true);
    }
    const slit = slitRef.current;
    if (slit) slit.style.transform = pulling ? `translate(${Math.sin(S.t * 140) * 0.5}px, ${Math.cos(S.t * 97) * 0.35}px)` : '';
    if (S.drag || pulling || moving) S.raf = requestAnimationFrame(step);
    else S.raf = 0;
  };
  const step = (now: number) => {
    try {
      tick(now);
    } catch (err) {
      sim.current.raf = 0;
      throw err;
    }
  };

  // Size the canvas and repaint resting strips when the layout changes.
  useEffect(() => {
    const S = sim.current;
    const canvas = canvasRef.current;
    if (!canvas || !F) return;
    S.dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.ceil((stageW + OVER * 2) * S.dpr);
    canvas.height = Math.ceil(F * S.dpr);
    run();
  }, [stageW, F]);

  useEffect(() => () => cancelAnimationFrame(sim.current.raf), []);

  const onDown = (e: PointerEvent<HTMLElement>, k: number) => {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    begin(k, 'drag', e);
  };
  const onMove = (e: PointerEvent<HTMLElement>) => {
    const d = sim.current.drag;
    if (!d || d.id !== e.pointerId) return;
    const r = rootRef.current!.getBoundingClientRect();
    d.px = e.clientX - r.left;
    d.py = e.clientY - r.top;
  };
  const onUp = (e: PointerEvent<HTMLElement>) => {
    const S = sim.current;
    const d = S.drag;
    if (!d || d.id !== e.pointerId) return;
    d.id = null;
    d.phase = d.moved ? 'return' : 'carry';
    S.suppress = true;
    setTimeout(() => {
      S.suppress = false;
    }, 60);
    run();
  };
  const onClick = (k: number) => {
    const S = sim.current;
    if (S.suppress) {
      S.suppress = false;
      return;
    }
    if (reduced()) consumeNow(k);
    else begin(k, 'carry', null);
  };

  const left = laid.length ? specs.length - gone : 0;
  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className={`sh-stage ${className}`}
      style={{ '--stack': `${stackH}px`, '--fall': `${F}px`, height: laid.length ? stackH + SLIT + F : 360 } as CSSProperties}
    >
      <div className="sh-feedzone">
        {laid.map((l, k) => {
          if (k < gone) return null;
          const depth = k - gone;
          const top = depth === 0;
          const p = { x: (stageW - l.W) / 2, y: slotY - l.H - 12 };
          const st: CSSProperties = {
            left: p.x,
            top: p.y,
            width: l.W,
            height: l.H,
            zIndex: 20 - depth,
            translate: `${depth * 10}px ${-depth * 12}px`,
            rotate: `${depth * 1.4}deg`,
          };
          return top ? (
            <button
              key={specs[k].id}
              ref={(el) => {
                sheetEls.current[k] = el;
              }}
              type="button"
              className="sh-sheet"
              style={st}
              onPointerDown={(e) => onDown(e, k)}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onClick={() => onClick(k)}
              onDragStart={(e) => e.preventDefault()}
            >
              <SheetCanvas laid={l} />
              <span className="sr-only-x">{label}</span>
            </button>
          ) : (
            <div key={specs[k].id} className="sh-sheet is-under" style={st} aria-hidden="true">
              <SheetCanvas laid={l} />
            </div>
          );
        })}
      </div>
      <div ref={slitRef} className="sh-slit" style={{ top: slotY }} aria-hidden="true" />
      <div className="sh-tray" style={{ top: exit + DROP - 18, height: F - DROP + 8 }} aria-hidden="true" />
      <canvas ref={canvasRef} className="sh-canvas" style={{ top: exit, height: F, left: -OVER, width: `calc(100% + ${OVER * 2}px)` }} aria-hidden="true" />
      <span className="sr-only-x" role="status">{left === 0 && laid.length ? 'Shredded. The strips are in the tray.' : ''}</span>
    </div>
  );
}

function SheetCanvas({ laid }: { laid: Laid }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.ceil(laid.W * dpr);
    c.height = Math.ceil(laid.H * dpr);
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    laid.draw(ctx);
  }, [laid.W, laid.H, laid]);
  return <canvas ref={ref} aria-hidden="true" style={{ width: laid.W, height: laid.H, display: 'block' }} />;
}
