// Remixed from fancy's text-along-path (danielpetho/fancy, MIT): an SVG <textPath> whose startOffset is
// driven by motion's useScroll. Changed here: the text is fitted to the path's exact length (textLength),
// a second copy runs one length behind so a closed contour loops with no seam, and drag/hover add to the scroll.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MotionValue } from 'motion/react';
import { still } from '@/lib/utils';

export type Seg = { text: string; hot?: boolean };
type Piece = { text: string; hot: boolean };

let canvas: CanvasRenderingContext2D | null = null;
const FONT = '"Instrument Sans Variable", "Instrument Sans", sans-serif';
function width(s: string, weight: number, track: number) {
  if (!canvas) canvas = document.createElement('canvas').getContext('2d');
  if (!canvas) return s.length * 55;
  canvas.font = `${weight} 100px ${FONT}`;
  return canvas.measureText(s).width + s.length * track * 100;
}

/** Fill a path of length `len` (user units) with segments at `size`, starting from segment `from`. */
export function fit(segs: Seg[], len: number, size: number, from = 0, weight = 600, track = 0.02): Piece[] {
  if (!segs.length || len <= 0) return [];
  const k = size / 100;
  const out: Piece[] = [];
  let used = 0;
  for (let i = 0; i < 400; i++) {
    const s = segs[(from + i) % segs.length];
    const unit = s.text + '   ';
    const w = width(unit, weight, track) * k;
    if (used + w <= len) { out.push({ text: unit, hot: !!s.hot }); used += w; continue; }
    // last piece: as many characters as still fit, cut at a space when there is one
    let cut = '';
    for (const ch of unit) { if (used + width(cut + ch, weight, track) * k > len) break; cut += ch; }
    const sp = cut.lastIndexOf(' ');
    if (sp > 6) cut = cut.slice(0, sp);
    if (cut.trim()) out.push({ text: cut.trimEnd() + ' · ', hot: !!s.hot });
    break;
  }
  return out;
}

export type Drive = {
  /** scroll progress from motion's useScroll */
  progress: MotionValue<number>;
  /** user units of travel over the whole progress range */
  travel: number;
  /** extra offset, read every frame (drag, hover, intro) */
  extra?: { current: number };
};

/** Runs while the svg is on screen; sets startOffset on every registered loop. */
export function useThread(svg: React.RefObject<SVGSVGElement | null>, drive: Drive, rest = 0.35) {
  const loops = useRef<{ a: SVGTextPathElement; b: SVGTextPathElement; len: number; phase: number }[]>([]);
  useEffect(() => {
    const el = svg.current; if (!el) return;
    let raf = 0, on = false, last = NaN;
    const tick = () => {
      raf = on ? requestAnimationFrame(tick) : 0;
      const p = still ? rest : drive.progress.get();
      const shift = p * drive.travel + (still ? 0 : drive.extra?.current ?? 0);
      if (Math.abs(shift - last) < 0.05) return;
      last = shift;
      for (const l of loops.current) {
        if (!l.len) continue;
        const o = (((shift + l.phase) % l.len) + l.len) % l.len;
        l.a.setAttribute('startOffset', o.toFixed(1));
        l.b.setAttribute('startOffset', (o - l.len).toFixed(1));
      }
    };
    const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on && !raf) { last = NaN; raf = requestAnimationFrame(tick); } });
    io.observe(el);
    const kick = () => { last = NaN; if (!raf) tick(); };
    el.addEventListener('thread:refit', kick);
    return () => { io.disconnect(); cancelAnimationFrame(raf); el.removeEventListener('thread:refit', kick); };
  }, [svg, drive, rest]);
  return loops;
}

/** One closed path with its text running round it twice (the second copy hides the seam). */
export function Loop({ id, d, segs, size, from = 0, phase = 0, loops, refit }: {
  id: string; d: string; segs: Seg[]; size: number; from?: number; phase?: number;
  loops: React.RefObject<{ a: SVGTextPathElement; b: SVGTextPathElement; len: number; phase: number }[]>;
  refit?: unknown;
}) {
  const path = useRef<SVGPathElement>(null);
  const a = useRef<SVGTextPathElement>(null);
  const b = useRef<SVGTextPathElement>(null);
  const [fill, setFill] = useState<{ len: number; pieces: Piece[] }>({ len: 0, pieces: [] });
  const key = segs.map((s) => s.text).join('|');

  useLayoutEffect(() => {
    let alive = true;
    const run = () => {
      if (!alive || !path.current) return;
      const len = path.current.getTotalLength();
      setFill({ len, pieces: fit(segs, len, size, from) });
    };
    run();
    document.fonts?.ready.then(run).catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, key, size, from, refit]);

  useEffect(() => {
    if (!a.current || !b.current) return;
    const entry = { a: a.current, b: b.current, len: fill.len, phase };
    loops.current.push(entry);
    a.current.closest('svg')?.dispatchEvent(new Event('thread:refit'));
    return () => { loops.current.splice(loops.current.indexOf(entry), 1); };
  }, [fill, phase, loops]);

  const body = fill.pieces.map((p, i) => <tspan key={i} className={p.hot ? 'hot' : undefined}>{p.text}</tspan>);
  const tl = fill.len ? fill.len.toFixed(1) : undefined;
  return (
    <g>
      <path ref={path} id={id} d={d} fill="none" stroke="none" />
      <text fontSize={size}>
        <textPath ref={a} href={`#${id}`} startOffset="0" textLength={tl} lengthAdjust="spacing">{body}</textPath>
      </text>
      <text fontSize={size}>
        <textPath ref={b} href={`#${id}`} startOffset={tl ? -fill.len : 0} textLength={tl} lengthAdjust="spacing">{body}</textPath>
      </text>
    </g>
  );
}

/** A rounded rectangle path, clockwise on screen (text rises outward), starting top left. */
export function roundRect(x: number, y: number, w: number, h: number, r: number) {
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}
