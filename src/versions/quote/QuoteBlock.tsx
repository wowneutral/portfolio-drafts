// The container that pairs DOM text with the two 3D marks (after pmndrs/examples canvas-text, MIT): measures the first and last letters and puts a mark in the margin beside each.
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import GLYPHS from './quotes.json';
import { ASPECT, makeRig, type Slot } from './Marks';

const Marks = lazy(() => import('./Marks'));

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
export const WEBGL = typeof window !== 'undefined' && hasWebGL();

/** The box of the first or last visible character inside el. */
function charBox(el: Element, last: boolean): DOMRect | null {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) { const t = walker.currentNode as Text; if (t.data.trim()) nodes.push(t); }
  const t = last ? nodes[nodes.length - 1] : nodes[0];
  if (!t) return null;
  const s = t.data;
  let i = last ? s.length - 1 : 0;
  while (s[i] === ' ' || s[i] === '\n') i += last ? -1 : 1;
  const r = document.createRange();
  r.setStart(t, i); r.setEnd(t, i + 1);
  return r.getBoundingClientRect();
}

const NAMES = ['opening', 'closing'];

export default function QuoteBlock({ className, textSel, still, enter, children }: {
  className: string; textSel: string; still: boolean; enter: boolean; children: React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [rig] = useState(makeRig);
  const [slots, setSlots] = useState<[Slot, Slot] | null>(null);
  const [on, setOn] = useState(false);
  const [, bump] = useState(0);

  useLayoutEffect(() => {
    const el = box.current!;
    const measure = () => {
      const text = el.querySelector(textSel);
      if (!text) return;
      const c = el.getBoundingClientRect();
      const F = charBox(text, false), L = charBox(text, true);
      if (!F || !L) return;
      const em = parseFloat(getComputedStyle(text).fontSize);
      const side = c.width > 760;
      let s: [Slot, Slot];
      if (side) {
        const w = em * 0.56, gap = em * 0.13;
        s = [
          { x: F.left - c.left - gap - w / 2, y: F.top - c.top + F.height * 0.32, w },
          { x: L.right - c.left + gap + w / 2, y: L.top - c.top + L.height * 0.32, w },
        ];
      } else {
        const w = Math.min(em * 0.62, 92), h = w * ASPECT, gap = Math.max(10, em * 0.12);
        s = [
          { x: F.left - c.left + w / 2, y: F.top - c.top - gap - h / 2, w },
          { x: L.right - c.left - w / 2, y: L.bottom - c.top + gap + h / 2, w },
        ];
      }
      rig.slots = s;
      setSlots(s);
      rig.wake();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    document.fonts?.ready.then(measure);
    const io = new IntersectionObserver(([e]) => { rig.visible = e.isIntersecting; if (e.isIntersecting) { setOn(true); rig.wake(); } }, { rootMargin: '120px' });
    io.observe(el);
    return () => { ro.disconnect(); io.disconnect(); };
  }, [rig, textSel]);

  // Wake the scene when the pointer moves over the block, so the marks can lean.
  useEffect(() => {
    const el = box.current!;
    const move = () => rig.wake();
    el.addEventListener('pointermove', move, { passive: true });
    return () => el.removeEventListener('pointermove', move);
  }, [rig]);

  const knock = (i: number) => { rig.knock[i] += 1; rig.wake(); bump((n) => n + 1); };
  const hot = (i: number, v: boolean) => { rig.hot[i] = v; rig.wake(); };

  return (
    <div ref={box} className={className}>
      {children}
      {WEBGL && on && (
        <div className="marks-layer" aria-hidden="true">
          <Suspense fallback={null}><Marks rig={rig} source={box as React.RefObject<HTMLElement>} still={still} enter={enter} /></Suspense>
        </div>
      )}
      {!WEBGL && slots && slots.map((s, i) => {
        const g = GLYPHS.glyphs[i];
        const x0 = i ? 457 : 44.5, w0 = 326.5;
        return (
          <svg key={i} className="mark-flat" aria-hidden="true" focusable="false" viewBox={`${x0} -684 ${w0} 253`}
            style={{ left: s.x - s.w / 2, top: s.y - (s.w * ASPECT) / 2, width: s.w }}>
            <path d={g.d} />
          </svg>
        );
      })}
      {WEBGL && !still && slots && slots.map((s, i) => {
        const h = Math.max(48, s.w * ASPECT * 1.3), w = Math.max(48, s.w * 1.15);
        return (
          <button key={i} type="button" className="mark-hit" aria-label={`Knock the ${NAMES[i]} quotation mark`}
            style={{ left: s.x - w / 2, top: s.y - h / 2, width: w, height: h }}
            onClick={() => knock(i)}
            onPointerEnter={() => hot(i, true)} onPointerLeave={() => hot(i, false)}
            onFocus={() => hot(i, true)} onBlur={() => hot(i, false)} />
        );
      })}
    </div>
  );
}
