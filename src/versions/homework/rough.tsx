// Base: roughjs 4.6.6 by Preet Shihn (MIT, github.com/rough-stuff/rough): its generator and sketchy primitives (hachured rectangles, lines, ellipses, linear paths), kept with low roughness and a fixed seed per mark, drawn here as a student's pencil and red pen on graph paper.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { RoughGenerator } from 'roughjs/bin/generator';
import type { Drawable, Options } from 'roughjs/bin/core';
import { still } from '@/lib/utils';

export const RED = '#c62f22';
export const PENCIL = '#5a5f66';
export const INK = '#151515';

const gen = new RoughGenerator();
export type Shape = { d: string; stroke: string; sw: number; fill?: string };

/** Low roughness, one stroke, fixed seed: steady marks that still look drawn by hand. */
export const pen = (seed: number, o: Options = {}): Options => ({ roughness: 0.8, bowing: 0.8, stroke: PENCIL, strokeWidth: 1.4, disableMultiStroke: true, seed, ...o });
export const hatch = (seed: number, o: Options = {}): Options => pen(seed, { fill: PENCIL, fillStyle: 'hachure', hachureGap: 5, hachureAngle: -50, fillWeight: 1.1, ...o });

export function flat(...ds: Drawable[]): Shape[] {
  const out: Shape[] = [];
  for (const d of ds) for (const p of gen.toPaths(d)) out.push(p.stroke === 'none' && p.fill && p.fill !== 'none' ? { d: p.d, stroke: 'none', sw: 0, fill: p.fill } : { d: p.d, stroke: p.stroke, sw: p.strokeWidth || 1 });
  return out;
}
export const g = gen;

/** A stable seed from a string, so a mark keeps its wobble between renders and changes it only when its data changes. */
export function seedOf(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) % 2147483646 + 1;
}

/** Width of an element, rounded so a resize redraws only when the size really changes. */
export function useWidth(ref: RefObject<HTMLElement | null>) {
  const [w, set] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => set(Math.max(0, Math.round(el.getBoundingClientRect().width / 2) * 2));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

/** Size of an element (for the red rings and boxes drawn round type). */
function useBox(ref: RefObject<HTMLElement | null>) {
  const [b, set] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => set({ w: Math.round(el.offsetWidth), h: Math.round(el.offsetHeight) });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return b;
}

/**
 * The pencil-in: every stroke of a drawing runs out once, the first time it is seen,
 * and again (with fresh seeds) when its data changes. Never on resize or scroll.
 */
export function useInk(ref: RefObject<Element | null>, ver: string) {
  const [phase, set] = useState<'wait' | 'go' | 'done'>(still ? 'done' : 'wait');
  const seen = useRef(false);
  const first = useRef(true);
  useEffect(() => {
    if (still) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !seen.current) { seen.current = true; set('go'); io.disconnect(); }
    }, { rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (still || !seen.current) return;
    set('wait');
    const id = requestAnimationFrame(() => requestAnimationFrame(() => set('go')));
    return () => cancelAnimationFrame(id);
  }, [ver]);
  useEffect(() => {
    if (phase !== 'go') return;
    const t = setTimeout(() => set('done'), 2400);
    return () => clearTimeout(t);
  }, [phase]);
  return phase === 'done' ? '' : 'ink-' + phase;
}

/** Paths of a drawing. Each stroke has pathLength 1 so the pencil-in can run it out. */
export function Paths({ shapes, step = 70 }: { shapes: Shape[]; step?: number }) {
  return (
    <>
      {shapes.map((s, i) => (
        s.fill
          ? <path key={i} d={s.d} fill={s.fill} className="hw-solid" style={{ '--d': i * step } as CSSProperties} />
          : <path key={i} d={s.d} stroke={s.stroke} strokeWidth={s.sw} fill="none" strokeLinecap="round" pathLength={1} style={{ '--d': i * step } as CSSProperties} />
      ))}
    </>
  );
}

/** A hand-ruled line the width of its container. */
export function Rule({ seed, color = PENCIL, weight = 1.2, className }: { seed: number; color?: string; weight?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const w = useWidth(ref);
  const ink = useInk(ref, String(seed));
  return (
    <div ref={ref} className={'hw-rule ' + (className ?? '')} aria-hidden="true">
      {w > 0 && (
        <svg width={w} height={8} viewBox={`0 0 ${w} 8`} className={ink}>
          <Paths shapes={flat(g.line(1, 4, w - 1, 4, pen(seed, { stroke: color, strokeWidth: weight, roughness: 0.6 })))} />
        </svg>
      )}
    </div>
  );
}

/** Red pen round a piece of type: a ring (twice round, for the titles), a box, or an underline. */
export function Mark({ children, seed, kind = 'ring', twice = false, pad = 10, className, as: Tag = 'span', delay = 0, color = RED }: {
  children: ReactNode; seed: number; kind?: 'ring' | 'box' | 'under'; twice?: boolean; pad?: number; className?: string; as?: 'span' | 'div'; delay?: number; color?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const { w, h } = useBox(ref);
  const ink = useInk(ref, String(seed));
  let shapes: Shape[] = [];
  const W = w + pad * 2, H = h + pad * 2;
  if (w > 0) {
    const o = pen(seed, { stroke: color, strokeWidth: color === RED ? 2 : 1.3, roughness: 0.9, disableMultiStroke: !twice });
    if (kind === 'ring') shapes = flat(g.ellipse(W / 2, H / 2, w + pad * 1.6, h + pad * 1.3, o));
    else if (kind === 'box') shapes = flat(g.rectangle(pad / 2, pad / 2, w + pad, h + pad, { ...o, roughness: 0.7 }));
    else shapes = flat(g.line(pad - 2, h + pad + 4, w + pad + 2, h + pad + 2, { ...o, roughness: 0.6, bowing: 1.6 }));
  }
  return (
    <Tag ref={ref as never} className={'hw-mark ' + (className ?? '')}>
      {children}
      {w > 0 && (
        <svg aria-hidden="true" className={'hw-mark-pen ' + ink} width={W} height={H + 6} viewBox={`0 0 ${W} ${H + 6}`} style={{ left: -pad, top: -pad, '--d0': delay } as CSSProperties}>
          <Paths shapes={shapes} step={260} />
        </svg>
      )}
    </Tag>
  );
}

/** A single red tick, for the margin. */
export function Tick({ seed, size = 56 }: { seed: number; size?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const ink = useInk(ref, String(seed));
  const s = size;
  const shapes = flat(g.linearPath([[s * 0.08, s * 0.55], [s * 0.38, s * 0.86], [s * 0.94, s * 0.1]], pen(seed, { stroke: RED, strokeWidth: 3, roughness: 0.7, bowing: 0.5 })));
  return (
    <span ref={ref} className="hw-tick" aria-hidden="true">
      <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} className={ink}><Paths shapes={shapes} /></svg>
    </span>
  );
}

/** A drawing laid over its parent box (frames, the T chart, the answer box), redrawn only when the box changes size. */
export function Over({ draw, seed, className }: { draw: (w: number, h: number) => Shape[]; seed: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { w, h } = useBox(ref);
  const ink = useInk(ref, seed);
  const cache = useRef(new Map<string, Shape[]>());
  const k = w + 'x' + h + seed;
  let shapes = cache.current.get(k);
  if (!shapes && w > 0) { shapes = draw(w, h); cache.current.set(k, shapes); }
  return (
    <div ref={ref} className={'hw-over ' + (className ?? '')} aria-hidden="true">
      {w > 0 && <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={ink}><Paths shapes={shapes ?? []} step={120} /></svg>}
    </div>
  );
}
