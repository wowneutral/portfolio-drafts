// Packing and spring re-pack adapted from React Bits Masonry (MIT + Commons Clause), lab/rb/src/ts-default/Components/Masonry.
// Kept: its measured shortest-column packing with spans, and its damped spring (duration 0.6, bounce 0.15) that slides every
// card to its new place when the items or the width change, plus the hover lift. Changed: image tiles became measured text
// cards, there is no entrance at all (animateFrom none, no blur), a hovered work card makes the wall lean away from it,
// and its drag to reorder is kept for the pinned cards only.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react';
import { coarse, still } from '@/lib/utils';

export type Brick = { id: string; span: number; node: ReactNode; cls?: string; lean?: boolean; drag?: boolean };

type Grid = { count: number; size: number };
type Tile = { id: string; x: number; y: number; w: number; h: number };
type Spring = { x: number; y: number; vx: number; vy: number; tx: number; ty: number; w: number; h: number; held?: boolean };
type Drag = { id: string; pointerId: number; sx: number; sy: number; ox: number; oy: number; active: boolean };

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const DURATION = 0.6;
const BOUNCE = 0.15;

const gridOf = (width: number, columnWidth: number, gap: number): Grid => {
  const count = Math.max(1, Math.min(4, Math.floor((width + gap) / (columnWidth + gap))));
  return { count, size: Math.max(1, (width - gap * (count - 1)) / count) };
};

/** The base's placement: the run of columns whose tallest top is lowest. A span of 9 is a full-width row break. */
function layoutOf(list: Brick[], width: number, columnWidth: number, gap: number, hs: Record<string, number>) {
  const grid = gridOf(width, columnWidth, gap);
  const heights = new Array(grid.count).fill(0);
  const tiles: Tile[] = list.map((b) => {
    const span = Math.min(grid.count, Math.max(1, b.span));
    let column = 0;
    let top = Infinity;
    for (let start = 0; start <= grid.count - span; start++) {
      let y = 0;
      for (let k = start; k < start + span; k++) y = Math.max(y, heights[k]);
      if (y < top - 0.5) { top = y; column = start; }
    }
    const w = grid.size * span + gap * (span - 1);
    const h = hs[b.id] ?? 320;
    for (let k = column; k < column + span; k++) heights[k] = top + h + gap;
    return { id: b.id, x: Math.round(column * (grid.size + gap)), y: Math.round(top), w, h };
  });
  return { tiles, height: Math.max(0, Math.max(...heights) - gap), count: grid.count };
}

export default function Wall({ items, columnWidth = 236, gap = 16, label }: { items: Brick[]; columnWidth?: number; gap?: number; label: string }) {
  const rootRef = useRef<HTMLOListElement>(null);
  const nodes = useRef(new Map<string, HTMLLIElement>());
  const springs = useRef(new Map<string, Spring>());
  const engine = useRef({ raf: 0, last: 0 });
  const lean = useRef<string | null>(null);
  const born = useRef(performance.now());
  const [width, setWidth] = useState(0);
  const [hs, setHs] = useState<Record<string, number>>({});
  const [order, setOrder] = useState<string[] | null>(null);
  const drag = useRef<Drag | null>(null);

  // The base's drag to reorder, kept to the pinned cards: the dated cards stay in time order.
  const ordered = useMemo(() => {
    if (!order) return items;
    const rank = new Map(order.map((id, i) => [id, i]));
    const movable = items.filter((b) => b.drag).sort((a, b) => (rank.get(a.id) ?? 1e3) - (rank.get(b.id) ?? 1e3));
    let k = 0;
    return items.map((b) => (b.drag ? movable[k++] : b));
  }, [items, order]);
  const layout = useMemo(() => (width ? layoutOf(ordered, width, columnWidth, gap, hs) : null), [ordered, width, columnWidth, gap, hs]);
  const live = useRef({ ordered, width, hs });
  live.current = { ordered, width, hs };

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(root);
    setWidth(Math.round(root.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);

  // Text cards measure themselves: read every card's height after each render, and again whenever one reflows.
  const measure = () => {
    let changed: Record<string, number> | null = null;
    nodes.current.forEach((node, id) => {
      const h = node.offsetHeight;
      if (h && Math.abs((hs[id] ?? -1) - h) > 0.5) (changed ??= { ...hs })[id] = h;
    });
    if (changed) setHs(changed);
  };
  const measureRef = useRef(measure);
  measureRef.current = measure;
  useLayoutEffect(() => measureRef.current());
  useEffect(() => {
    const ro = new ResizeObserver(() => measureRef.current());
    nodes.current.forEach((n) => ro.observe(n));
    return () => ro.disconnect();
  }, [items, width]);

  const paint = (id: string, s: Spring) => {
    const node = nodes.current.get(id);
    if (node) node.style.transform = `translate3d(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px, 0)`;
  };

  // Where the wall leans: every card is pushed away from the hovered one, less the further it is.
  const offset = (id: string, s: Spring) => {
    const hid = lean.current;
    if (!hid || hid === id) return [0, 0];
    const h = springs.current.get(hid);
    if (!h) return [0, 0];
    const dx = s.tx + s.w / 2 - (h.tx + h.w / 2);
    const dy = s.ty + s.h / 2 - (h.ty + h.h / 2);
    const d = Math.hypot(dx, dy) || 1;
    const push = 22 * Math.exp(-d / 460);
    return [(dx / d) * push, (dy / d) * push];
  };

  const frame = (now: number) => {
    const st = engine.current;
    st.raf = 0;
    const elapsed = clamp((now - st.last) / 1000, 0, 1 / 20);
    st.last = now;
    const omega = (Math.PI * 2) / DURATION;
    const zeta = clamp(1 - BOUNCE, 0.1, 1);
    const steps = Math.max(1, Math.ceil(elapsed / (1 / 240)));
    const dt = elapsed / steps;
    let active = false;
    springs.current.forEach((s, id) => {
      if (s.held) { paint(id, s); return; }
      const [ox, oy] = offset(id, s);
      const tx = s.tx + ox;
      const ty = s.ty + oy;
      for (let i = 0; i < steps; i++) {
        s.vx += (-omega * omega * (s.x - tx) - 2 * zeta * omega * s.vx) * dt;
        s.vy += (-omega * omega * (s.y - ty) - 2 * zeta * omega * s.vy) * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
      }
      if (Math.abs(s.x - tx) < 0.05 && Math.abs(s.y - ty) < 0.05 && Math.abs(s.vx) + Math.abs(s.vy) < 0.05) {
        s.x = tx; s.y = ty; s.vx = s.vy = 0;
      } else active = true;
      paint(id, s);
    });
    if (active) st.raf = requestAnimationFrame(frame);
  };
  const kick = () => {
    const st = engine.current;
    if (st.raf) return;
    st.last = performance.now();
    st.raf = requestAnimationFrame(frame);
  };

  useLayoutEffect(() => {
    if (!layout) return;
    // Snap, do not slide, while the page is still settling its fonts, for reduced motion, and for cards never measured.
    const settling = performance.now() - born.current < 900;
    const live = new Set(layout.tiles.map((t) => t.id));
    springs.current.forEach((_, id) => { if (!live.has(id)) springs.current.delete(id); });
    layout.tiles.forEach((t) => {
      let s = springs.current.get(t.id);
      const snap = !s || still || settling || !(t.id in hs);
      if (!s) { s = { x: t.x, y: t.y, vx: 0, vy: 0, tx: t.x, ty: t.y, w: t.w, h: t.h }; springs.current.set(t.id, s); }
      s.tx = t.x; s.ty = t.y; s.w = t.w; s.h = t.h;
      if (snap && !s.held) { s.x = t.x; s.y = t.y; s.vx = s.vy = 0; }
      paint(t.id, s);
    });
    if (rootRef.current) rootRef.current.style.height = `${layout.height}px`;
    kick();
  });

  useEffect(() => () => cancelAnimationFrame(engine.current.raf), []);

  const move = (e: PointerEvent) => {
    const d = drag.current;
    const root = rootRef.current;
    if (!d || !root || e.pointerId !== d.pointerId) return;
    const s = springs.current.get(d.id);
    if (!s) return;
    if (!d.active) {
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return;
      d.active = true;
      s.held = true;
      s.vx = s.vy = 0;
      lean.current = null;
      nodes.current.get(d.id)?.setAttribute('data-held', '');
      root.setAttribute('data-dragging', '');
      window.getSelection()?.removeAllRanges();
    }
    const r = root.getBoundingClientRect();
    s.x = e.clientX - r.left - d.ox;
    s.y = e.clientY - r.top - d.oy;
    paint(d.id, s);
    kick();
    // Which pinned slot is nearest: lay the wall out with the card in each place and compare centres (as the base does).
    const { ordered: list, width: w, hs: h } = live.current;
    const cx = s.x + s.w / 2;
    const cy = s.y + s.h / 2;
    const movable = list.filter((b) => b.drag).map((b) => b.id);
    const others = movable.filter((id) => id !== d.id);
    const here = movable.indexOf(d.id);
    let best = here;
    let near = Infinity;
    let cur = Infinity;
    for (let k = 0; k <= others.length; k++) {
      const ids = [...others];
      ids.splice(k, 0, d.id);
      const byId = new Map(list.map((b) => [b.id, b]));
      let j = 0;
      const trial = list.map((b) => (b.drag ? byId.get(ids[j++])! : b));
      const t = layoutOf(trial, w, columnWidth, gap, h).tiles.find((x) => x.id === d.id)!;
      const dist = Math.hypot(t.x + t.w / 2 - cx, t.y + t.h / 2 - cy);
      if (k === here) cur = dist;
      if (dist < near) { near = dist; best = k; }
    }
    if (best === here || near > cur * 0.8 - 6) return;
    const ids = [...others];
    ids.splice(best, 0, d.id);
    setOrder(ids);
  };
  const up = () => {
    const d = drag.current;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    drag.current = null;
    if (!d?.active) return;
    const s = springs.current.get(d.id);
    if (s) s.held = false;
    nodes.current.get(d.id)?.removeAttribute('data-held');
    rootRef.current?.removeAttribute('data-dragging');
    kick();
  };
  const down = (e: ReactPointerEvent<HTMLLIElement>, b: Brick) => {
    if (!b.drag || still || e.pointerType !== 'mouse' || e.button !== 0) return;
    if ((e.target as HTMLElement).closest('a, button, img')) return;
    const root = rootRef.current;
    const s = springs.current.get(b.id);
    if (!root || !s) return;
    const r = root.getBoundingClientRect();
    drag.current = { id: b.id, pointerId: e.pointerId, sx: e.clientX, sy: e.clientY, ox: e.clientX - r.left - s.x, oy: e.clientY - r.top - s.y, active: false };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };
  useEffect(() => () => up(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const enter = (b: Brick) => { if (b.lean && !coarse && !still && !drag.current?.active) { lean.current = b.id; kick(); } };
  const leave = (b: Brick) => { if (lean.current === b.id) { lean.current = null; kick(); } };

  const wOf = new Map(layout?.tiles.map((t) => [t.id, t.w]) ?? []);
  return (
    <ol ref={rootRef} className="wall" aria-label={label} data-cols={layout?.count ?? 0}>
      {ordered.map((b) => (
        <li
          key={b.id}
          ref={(n) => { if (n) nodes.current.set(b.id, n); else nodes.current.delete(b.id); }}
          className={'brick' + (b.cls ? ' ' + b.cls : '') + (b.drag && !still ? ' can-drag' : '')}
          onPointerDown={(e) => down(e, b)}
          style={{ width: wOf.get(b.id) ?? '100%' }}
          onPointerEnter={() => enter(b)}
          onPointerLeave={() => leave(b)}
        >
          {b.node}
        </li>
      ))}
    </ol>
  );
}
