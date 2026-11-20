// The pen. One SVG laid over a sheet: every link between two claims becomes one seeded,
// hand-drawn blue stroke (roughjs). Across the sheet the arrows run through the gutters
// between columns, or drop into a lane along the foot of the sheet when they skip columns;
// down a phone they run in the left margin. An arrow draws itself the first time its
// start comes into view, and redraws when its claim is pressed.
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import rough from 'roughjs';
import { gsap } from '@/lib/scroll';
import { still } from '@/lib/utils';

export type Link = { from: string; to: string };
type Drawn = { from: string; to: string; shaft: string[]; head: string[]; len: number };

const gen = rough.generator();
const PEN = '#1c46c9';
const hash = (s: string) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return (h % 2147483646) + 1; };

function at(el: Element, base: DOMRect) {
  const box = (el.closest('[data-box]') ?? el).getBoundingClientRect();
  const first = el.getClientRects()[0] ?? box;
  const col = el.closest('[data-col]');
  return {
    l: box.left - base.left, r: box.right - base.left, t: box.top - base.top,
    y: first.top - base.top + Math.min(first.height, 40) / 2,
    col: col ? Number((col as HTMLElement).dataset.col) : 0,
  };
}

/** Rounded orthogonal route, as an SVG path string. */
function route(pts: [number, number][], r = 26) {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1], [x, y] = pts[i], [nx, ny] = pts[i + 1];
    const a = Math.min(r, Math.hypot(x - px, y - py) / 2), b = Math.min(r, Math.hypot(nx - x, ny - y) / 2);
    const ux = Math.sign(x - px), uy = Math.sign(y - py), vx = Math.sign(nx - x), vy = Math.sign(ny - y);
    d += ` L${x - ux * a},${y - uy * a} Q${x},${y} ${x + vx * b},${y + vy * b}`;
  }
  const [ex, ey] = pts[pts.length - 1];
  return d + ` L${ex},${ey}`;
}

export function Arrows({ root, links, mode, stamp, hot }: { root: RefObject<HTMLElement | null>; links: Link[]; mode: 'x' | 'y'; stamp: string; hot: { id: string; n: number } | null }) {
  const [paths, setPaths] = useState<{ w: number; h: number; list: Drawn[] }>({ w: 0, h: 0, list: [] });
  const svg = useRef<SVGSVGElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const measure = () => {
      const base = el.getBoundingClientRect();
      const W = el.scrollWidth, H = el.offsetHeight;
      const list: Drawn[] = [];
      let lane = 0;
      const lanesByTarget = new Map<string, number>();
      for (const k of links) {
        const a = el.querySelector(`[data-c="${k.from}"]`), b = el.querySelector(`[data-c="${k.to}"]`);
        if (!a || !b) continue;
        const A = at(a, base), B = at(b, base);
        const seed = hash(k.from + '>' + k.to);
        let d: string; let ex: number, ey: number; let len: number;
        if (mode === 'x') {
          const g = B.l - A.r, pad = Math.min(14, g * 0.18);
          const sx = A.r + pad, tx = B.l - pad - 2;
          ex = tx; ey = B.y;
          if (B.col - A.col <= 1 && tx - sx > 24) {
            const dx = tx - sx;
            d = `M${sx},${A.y} C${sx + dx * 0.8},${A.y} ${sx + dx * 0.62},${ey} ${tx},${ey}`;
            len = dx + Math.abs(ey - A.y);
          } else {
            const ly = H - 30 - lane++ * 13;
            const gx1 = A.r + 34, gx2 = B.l - 36;
            d = route([[sx, A.y], [gx1, A.y], [gx1, ly], [gx2, ly], [gx2, ey], [tx, ey]]);
            len = (ly - A.y) + (gx2 - gx1) + (ly - ey);
          }
        } else {
          const n = lanesByTarget.get(k.from) ?? lanesByTarget.size;
          lanesByTarget.set(k.from, n);
          const lx = 12 + (n % 4) * 5;
          const sx = A.l - 8, tx = B.l - 10;
          ex = tx; ey = B.y;
          d = route([[sx, A.y], [lx, A.y], [lx, ey], [tx, ey]], 14);
          len = Math.abs(ey - A.y) + 60;
        }
        const o = { seed, stroke: PEN, strokeWidth: 2.3, roughness: 0.9, bowing: 0.6, disableMultiStroke: true, preserveVertices: true };
        const shaft = gen.toPaths(gen.path(d, o)).map((p) => p.d);
        const head = gen.toPaths(gen.linearPath([[ex - 13, ey - 8], [ex + 1, ey], [ex - 13, ey + 8]], { ...o, roughness: 0.6 })).map((p) => p.d);
        list.push({ from: k.from, to: k.to, shaft, head, len });
      }
      setPaths({ w: W, h: H, list });
    };
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    document.fonts?.ready.then(measure);
    const t = setTimeout(measure, 900);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, [root, links, mode, stamp]);

  // Draw each arrow the first time its start is on screen.
  useEffect(() => {
    const s = svg.current;
    if (!s) return;
    const groups = () => Array.from(s.querySelectorAll<SVGGElement>('g[data-a]:not(.is-on)'));
    if (still) { groups().forEach((g) => g.classList.add('is-on')); return; }
    const tick = () => {
      const r = s.getBoundingClientRect();
      for (const g of groups()) {
        const x = r.left + Number(g.dataset.x), y = r.top + Number(g.dataset.y);
        if (x < innerWidth * 0.94 && x > -innerWidth && y < innerHeight * 0.9 && y > -innerHeight) g.classList.add('is-on');
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [paths, hot]);

  return (
    <svg ref={svg} className="fl-pen" width={paths.w} height={paths.h} viewBox={`0 0 ${paths.w || 1} ${paths.h || 1}`} aria-hidden="true" data-hot={hot ? '' : undefined}>
      {paths.list.map((p, i) => {
        const m = /^M\s*([-\d.]+)[ ,]([-\d.]+)/.exec(p.shaft[0] ?? '');
        const isHot = hot?.id === p.from;
        const dur = Math.min(1.5, 0.45 + p.len / 1400);
        return (
          <g key={`${i}-${isHot ? hot!.n : 0}`} data-a="" data-from={p.from} data-x={m?.[1] ?? 0} data-y={m?.[2] ?? 0} className={isHot ? 'is-hot' : undefined} style={{ ['--d' as string]: `${dur}s` }}>
            {p.shaft.map((d, k) => <path key={k} d={d} pathLength={1} className="fl-shaft" />)}
            {p.head.map((d, k) => <path key={k} d={d} pathLength={1} className="fl-tip" />)}
          </g>
        );
      })}
    </svg>
  );
}

/** A rough loop, box or dashed box drawn around its parent, the way a judge marks a flow. */
export function Mark({ kind, seed, pad = 18 }: { kind: 'loop' | 'box' | 'dash'; seed: number; pad?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const [s, setS] = useState({ w: 0, h: 0, d: [] as string[] });
  const [on, setOn] = useState(still);
  useEffect(() => {
    const el = ref.current;
    if (!el || still) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { rootMargin: '0px -12% -12% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useLayoutEffect(() => {
    const p = ref.current?.parentElement;
    if (!p) return;
    const go = () => {
      const w = p.offsetWidth + pad * 2, h = p.offsetHeight + pad * 2;
      const o = { seed, stroke: PEN, strokeWidth: kind === 'loop' ? 2.6 : 1.8, roughness: kind === 'loop' ? 1.4 : 0.8, bowing: 1.2 };
      let dr;
      if (kind === 'loop') dr = gen.ellipse(w / 2, h / 2, w - 8, h - 8, { ...o, curveStepCount: 14 });
      else dr = gen.rectangle(5, 5, w - 10, h - 10, { ...o, disableMultiStroke: kind === 'dash' });
      setS({ w, h, d: gen.toPaths(dr).map((x) => x.d) });
    };
    go();
    const ro = new ResizeObserver(go);
    ro.observe(p);
    return () => ro.disconnect();
  }, [kind, seed, pad]);
  return (
    <svg ref={ref} className={`fl-mark is-${kind}${on ? ' is-on' : ''}`} width={s.w} height={s.h} style={{ left: -pad, top: -pad }} aria-hidden="true">
      {s.d.map((d, k) => <path key={k} d={d} pathLength={1} />)}
    </svg>
  );
}
