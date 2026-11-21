// Remixed from React Bits SplitFlapText (MIT + Commons Clause), /home/claude/lab/rb/src/ts-default/TextAnimations/SplitFlapText.
// Kept: the tile with a top and bottom half on a hinge, the front and back flaps, the shading on the falling flap, the stagger across a row.
// Changed: flipsPerChar 1 means each tile flips once, straight from its old character to its new one; per-tile accent colour; no glare, no bevel.
import { useEffect, useRef, useState } from 'react';

type Tile = { current: string; next: string; ca: boolean; na: boolean; flipping: boolean; tick: number };
type Plan = { index: number; from: string; to: string; fa: boolean; ta: boolean; start: number; phase: 0 | 1 | 2 };

const pad = (s: string, w: number) => String(s ?? '').toUpperCase().slice(0, w).padEnd(w, ' ');
const make = (s: string, acc: boolean[]): Tile[] => s.split('').map((c, i) => ({ current: c, next: c, ca: !!acc[i], na: !!acc[i], flipping: false, tick: 0 }));

export function useReduced() {
  const q = '(prefers-reduced-motion: reduce)';
  const [r, set] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q);
    const on = () => set(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return r;
}

export type FlapProps = {
  /** What the tiles should read. Changing it flips every tile that differs, once. */
  value: string;
  width: number;
  /** Tiles from this index on (to `accentTo`) are set in the accent colour. */
  accentFrom?: number;
  accentTo?: number;
  /** ms before the first tile of this group starts. */
  delay?: number;
  stagger?: number;
  flipMs?: number;
  flipsPerChar?: 1;
  className?: string;
  /** Set the value without flipping (used for a board's resting state). */
  still?: boolean;
};

export function Flap({ value, width, accentFrom = -1, accentTo = -1, delay = 0, stagger = 26, flipMs = 170, className = '', still = false }: FlapProps) {
  const reduced = useReduced();
  const target = pad(value, width);
  const acc = Array.from({ length: width }, (_, i) => accentFrom >= 0 && i >= accentFrom && i < accentTo && target[i] !== ' ');
  const accKey = acc.map((a) => (a ? 1 : 0)).join('');
  const shown = useRef<{ s: string; a: boolean[] }>({ s: ' '.repeat(width), a: [] });
  const [tiles, setTiles] = useState<Tile[]>(() => make(' '.repeat(width), []));
  const raf = useRef(0);

  useEffect(() => {
    const from = shown.current;
    shown.current = { s: target, a: acc };
    cancelAnimationFrame(raf.current);
    const plans: Plan[] = [];
    if (!reduced && !still) {
      for (let i = 0; i < width; i++) {
        if (from.s[i] === target[i] && !!from.a[i] === acc[i]) continue;
        plans.push({ index: i, from: from.s[i] ?? ' ', to: target[i], fa: !!from.a[i], ta: acc[i], start: delay + i * stagger, phase: 0 });
      }
    }
    if (!plans.length) { setTiles(make(target, acc)); return; }
    setTiles(make(from.s.padEnd(width, ' ').slice(0, width), from.a));
    const t0 = performance.now();
    const tick = (now: number) => {
      const el = now - t0;
      const ups: Plan[] = [];
      let running = false;
      for (const p of plans) {
        const local = el - p.start;
        if (local < 0) { running = true; continue; }
        if (local < flipMs) { running = true; if (p.phase === 0) { p.phase = 1; ups.push(p); } }
        else if (p.phase !== 2) { p.phase = 2; ups.push(p); }
      }
      if (ups.length) {
        setTiles((prev) => {
          const n = [...prev];
          for (const p of ups) {
            const t = n[p.index]; if (!t) continue;
            n[p.index] = p.phase === 1
              ? { current: p.from, next: p.to, ca: p.fa, na: p.ta, flipping: true, tick: t.tick + 1 }
              : { current: p.to, next: p.to, ca: p.ta, na: p.ta, flipping: false, tick: t.tick + 1 };
          }
          return n;
        });
      }
      if (running) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, accKey, reduced, width]);

  const g = (c: string) => (c === ' ' ? ' ' : c);
  return (
    <span className={`flap ${className}`} aria-hidden="true" style={{ ['--flip' as string]: `${flipMs}ms` }}>
      {tiles.map((t, i) => (
        <span className={`flap__tile${t.flipping ? ' is-flipping' : ''}`} key={i}>
          <span className="flap__half flap__half--top"><span className={`flap__char${(t.flipping ? t.na : t.ca) ? ' is-acc' : ''}`}>{g(t.flipping ? t.next : t.current)}</span></span>
          <span className="flap__half flap__half--bottom"><span className={`flap__char${t.ca ? ' is-acc' : ''}`}>{g(t.current)}</span></span>
          {t.flipping && (
            <>
              <span className="flap__shade flap__shade--top" key={`st${t.tick}`} />
              <span className="flap__shade flap__shade--bottom" key={`sb${t.tick}`} />
              <span className="flap__flap flap__flap--front" key={`f${t.tick}`}><span className={`flap__char${t.ca ? ' is-acc' : ''}`}>{g(t.current)}</span></span>
              <span className="flap__flap flap__flap--back" key={`b${t.tick}`}><span className={`flap__char${t.na ? ' is-acc' : ''}`}>{g(t.next)}</span></span>
            </>
          )}
        </span>
      ))}
    </span>
  );
}
