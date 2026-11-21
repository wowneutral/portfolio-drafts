// The heap layer and the climb state. Pieces are aria-hidden copies of the ladder; physics from React Bits FallingText (MIT + Commons Clause), see heap.ts.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { drop, rest, type Start } from './heap';

export type Bit = { key: string; html: string; cls: string; w?: number; h?: number; start?: Start };

const reducedNow = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A layer that fills its positioned parent. When it gets bits it drops them (or lays them still). */
export function Heap({ bits, className = '', spawn }: { bits: Bit[]; className?: string; spawn?: 'above' }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const stage = ref.current;
    if (!stage || !bits.length) return;
    const els = [...stage.querySelectorAll<HTMLElement>('[data-bit]')];
    if (reducedNow()) { rest(stage, els); stage.dataset.asleep = ''; return; }
    const W = stage.clientWidth;
    return drop(stage, els, (i, w, h) => bits[i].start ?? {
      cx: clampX(W * (0.12 + 0.76 * ((i * 0.618 + 0.21) % 1)), w, W),
      cy: -h - 40 - i * (h * 0.9),
      a: ((i % 3) - 1) * 0.12,
    }, spawn === 'above' ? { stagger: 0.09, scatter: 0.3 } : { stagger: 0.035, scatter: 0.55 });
  }, [bits, spawn]);
  return (
    <div ref={ref} className={'rg-heap ' + className} aria-hidden="true">
      {bits.map((b) => (
        <span
          key={b.key}
          data-bit=""
          className={'rg-bit ' + b.cls}
          style={b.w ? { width: b.w, height: b.h } : undefined}
          dangerouslySetInnerHTML={{ __html: b.html }}
        />
      ))}
    </div>
  );
}

const clampX = (x: number, w: number, W: number) => Math.min(W - w / 2 - 8, Math.max(w / 2 + 8, x));

/** Climb a ladder of n rungs in order, then throw it: measures the ladder's pieces into bits for <Heap>. */
export function useClimb(n: number, stage: RefObject<HTMLElement | null>, ladder: RefObject<HTMLElement | null>, after: RefObject<HTMLElement | null>) {
  const [step, setStep] = useState(0);
  const [bits, setBits] = useState<Bit[]>([]);
  const thrown = bits.length > 0;
  const stand = useCallback((i: number) => setStep((s) => (i === s ? s + 1 : s)), []);
  const throwIt = useCallback(() => {
    const st = stage.current;
    const ld = ladder.current;
    if (!st || !ld) return;
    const o = st.getBoundingClientRect();
    const els = [...ld.querySelectorAll<HTMLElement>('[data-piece]')];
    const rungs = els.filter((el) => !el.dataset.piece?.includes('rail'));
    const W = st.clientWidth;
    const out: Bit[] = els.map((el, i) => {
      const r = el.getBoundingClientRect();
      const k = rungs.indexOf(el);
      // Rungs are aimed at evenly spaced spots on the floor, bottom rung nearest, top rung furthest.
      const tx = k < 0 ? undefined : Math.min(W - r.width / 2 - 12, Math.max(r.width / 2 + 12, ((k + 0.5) / rungs.length) * W));
      return {
        key: 'p' + i,
        html: el.innerHTML,
        cls: el.dataset.piece || '',
        w: r.width,
        h: r.height,
        start: { cx: r.left - o.left + r.width / 2, cy: r.top - o.top + r.height / 2, a: 0, tx },
      };
    });
    setBits(out);
  }, [stage, ladder]);
  useEffect(() => { if (thrown) after.current?.focus({ preventScroll: true }); }, [thrown, after]);
  return { step, stand, top: step >= n, thrown, throwIt, bits };
}
