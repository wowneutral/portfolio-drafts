// A long line: two half-lines across the caesura, tied by the letters they share.
// The heading is a button: point at a red letter, focus it or tap it, and its partner
// lights across the gap while a fine red line bridges the channel between them.
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { gsap, useGSAP } from '@/lib/scroll';
import { still } from '@/lib/utils';

type Level = 'h1' | 'h2' | 'h3';
type Props = {
  a: string;
  b: string;
  /** Pairs of character indices: [index in a, index in b]. Empty means no red at all. */
  pairs?: [number, number][];
  as?: Level;
  id?: string;
  size?: 'name' | 'champ' | 'h2' | 'h3';
  /** The brief's one text motion: halves start apart and close in toward the gap. */
  close?: 'load' | 'scroll';
};

function Half({ text, marks, side, lit }: { text: string; marks: number[]; side: 'a' | 'b'; lit: number | 'all' | null }) {
  const out: React.ReactNode[] = [];
  let buf = '';
  [...text].forEach((ch, i) => {
    const k = marks.indexOf(i);
    if (k < 0) { buf += ch; return; }
    if (buf) { out.push(buf); buf = ''; }
    const on = lit === 'all' || lit === k;
    out.push(<span key={i} className={'st' + (on ? ' on' : '')} data-k={k} data-side={side}>{ch}</span>);
  });
  if (buf) out.push(buf);
  return <span className={'half half-' + side}>{out}</span>;
}

export function Long({ a, b, pairs = [[0, 0]], as: Tag = 'h2', id, size = 'h2', close }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState<number | 'all' | null>(null);
  const [pinned, setPinned] = useState(false);
  const [paths, setPaths] = useState<string[]>([]);
  const [box, setBox] = useState({ w: 1, h: 1 });
  const red = pairs.length > 0;
  const shown: number | 'all' | null = pinned ? 'all' : lit;

  useLayoutEffect(() => {
    const el = root.current;
    if (!el || shown === null || !red) { setPaths([]); return; }
    const r = el.getBoundingClientRect();
    setBox({ w: r.width, h: r.height });
    const ks = shown === 'all' ? pairs.map((_, i) => i) : [shown];
    setPaths(ks.map((k) => {
      const sa = el.querySelector(`.st[data-k="${k}"][data-side="a"]`)?.getBoundingClientRect();
      const sb = el.querySelector(`.st[data-k="${k}"][data-side="b"]`)?.getBoundingClientRect();
      if (!sa || !sb) return '';
      const ax = sa.left + sa.width / 2 - r.left, bx = sb.left + sb.width / 2 - r.left;
      if (sb.top >= sa.bottom - 2) {
        // stacked (phone): from under the top letter down to above the bottom one
        const y1 = sa.bottom - r.top - sa.height * 0.12, y2 = sb.top - r.top + sb.height * 0.2;
        const bend = Math.min(60, (y2 - y1) * 0.5);
        return `M${ax},${y1} C${ax},${y1 + bend} ${bx},${y2 - bend} ${bx},${y2}`;
      }
      const y = Math.max(sa.bottom, sb.bottom) - r.top - sa.height * 0.12;
      const dip = Math.min(22, (bx - ax) * 0.06);
      return `M${ax},${y} C${ax},${y + dip} ${bx},${y + dip} ${bx},${y}`;
    }).filter(Boolean));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);

  useGSAP(() => {
    if (!close || still || !root.current) return;
    const el = root.current;
    const ha = el.querySelector('.half-a'), hb = el.querySelector('.half-b');
    const stacked = window.matchMedia('(max-width: 760px)').matches;
    const from = (s: number) => (stacked ? { y: s * -18 } : { x: s * -Math.min(110, window.innerWidth * 0.07) });
    if (close === 'load') {
      gsap.fromTo(ha, from(1), { x: 0, y: 0, duration: 1.8, ease: 'expo.out', delay: 0.25 });
      gsap.fromTo(hb, from(-1), { x: 0, y: 0, duration: 1.8, ease: 'expo.out', delay: 0.25 });
      return;
    }
    el.classList.add('unripe');
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el, start: 'top bottom', end: 'center 58%', scrub: 0.6,
        onUpdate: (st) => el.classList.toggle('unripe', st.progress < 0.92),
      },
    });
    tl.fromTo(ha, from(1), { x: 0, y: 0, ease: 'none' }, 0).fromTo(hb, from(-1), { x: 0, y: 0, ease: 'none' }, 0);
  }, { scope: root });

  const over = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const t = (e.target as HTMLElement).closest('.st') as HTMLElement | null;
    setLit(t ? Number(t.dataset.k) : null);
  };

  const inner = (
    <>
      <Half text={a} side="a" marks={pairs.map((p) => p[0])} lit={shown} />
      <span className="gap" aria-hidden="true" />
      <Half text={b} side="b" marks={pairs.map((p) => p[1])} lit={shown} />
      {red ? (
        <svg className="bridge" aria-hidden="true" width={box.w} height={box.h} viewBox={`0 0 ${box.w} ${box.h}`} style={{ '--n': paths.length } as CSSProperties}>
          {paths.map((d, i) => <path key={d + i} d={d} pathLength={1} />)}
        </svg>
      ) : null}
    </>
  );

  return (
    <Tag id={id} className={`long long-${size}`}>
      {red ? (
        <button
          type="button"
          ref={root as unknown as React.Ref<HTMLButtonElement>}
          aria-pressed={pinned}
          className={'long-in' + (shown !== null ? ' is-lit' : '')}
          onPointerMove={over}
          onPointerLeave={() => setLit(null)}
          onFocus={() => setLit('all')}
          onBlur={() => { setLit(null); setPinned(false); }}
          onClick={() => setPinned((p) => !p)}
        >{inner}</button>
      ) : (
        <div ref={root} className="long-in">{inner}</div>
      )}
    </Tag>
  );
}

/** A plain pair across the gap: left half right-aligned to the channel, right half left-aligned. */
export function Pair({ a, b, className, as: Tag = 'div' }: { a: React.ReactNode; b: React.ReactNode; className?: string; as?: 'div' | 'li' }) {
  return (
    <Tag className={'pair' + (className ? ' ' + className : '')}>
      <div className="pa">{a}</div>
      <span className="pgap" aria-hidden="true" />
      <div className="pb">{b}</div>
    </Tag>
  );
}
