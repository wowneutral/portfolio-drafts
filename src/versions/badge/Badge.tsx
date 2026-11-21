// One tournament badge: the Lanyard scene (WebGL) with a real DOM button over the card,
// or a flat printed card pair when there is no WebGL or motion is reduced.
import { useEffect, useRef, useState } from 'react';
import Lanyard, { type LanyardHandle, type Painter } from './Lanyard';

export type Print = {
  kicker: string;
  first: string;
  last: string;
  role: string;
  sub: string;
  back: { head: string; lines: { big?: string; strong?: string; text?: string }[] };
};

type Props = {
  print: Print;
  front: Painter;
  back: Painter;
  strap: string;
  flat: boolean;
  size: number;
  strapLength: number;
  side: 1 | -1;
  /** Turn to the back by itself once, this many ms after mounting. */
  autoFlip?: number;
  intro?: boolean;
};

export function FlatFace({ print, back }: { print: Print; back?: boolean }) {
  if (back) {
    return (
      <div className="fb-card fb-back" aria-hidden="true">
        <p className="fb-head">{print.back.head}</p>
        {print.back.lines.map((l, i) => (
          <div className="fb-line" key={i}>
            {l.big && <p className="fb-big">{l.big}</p>}
            {l.strong && <p className="fb-strong">{l.strong}</p>}
            {l.text && <p className="fb-text">{l.text}</p>}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="fb-card" aria-hidden="true">
      <p className="fb-head">{print.kicker}</p>
      <p className="fb-name">{print.first}<br />{print.last}</p>
      <div className="fb-role">
        <p className="fb-role-word">{print.role}</p>
        <p className="fb-role-sub">{print.sub}</p>
      </div>
    </div>
  );
}

function spoken(print: Print) {
  const back = print.back.lines.map((l) => [l.big, l.strong, l.text].filter(Boolean).join(', ')).join('. ');
  return `${print.first} ${print.last}, ${print.role}, ${print.sub}. On the back: ${print.back.head}. ${back}.`;
}

export default function Badge({ print, front, back, strap, flat, size, strapLength, side, autoFlip, intro = true }: Props) {
  const handle = useRef<LanyardHandle | null>(null);
  const [turned, setTurned] = useState(false);

  useEffect(() => {
    if (flat || autoFlip == null) return;
    const t = window.setTimeout(() => handle.current?.flip(), autoFlip);
    return () => window.clearTimeout(t);
  }, [flat, autoFlip]);

  if (flat) {
    return (
      <div className="fb-pair">
        <p className="sr-only sr-only-x">{spoken(print)}</p>
        <FlatFace print={print} />
        <FlatFace print={print} back />
      </div>
    );
  }

  const top = (0.12 + (0.42 - 0.12) * strapLength) * 100;
  return (
    <div className="hang">
      <Lanyard
        paintFront={front}
        paintBack={back}
        handle={handle}
        onTurn={setTurned}
        strapColor={strap}
        size={size}
        strapLength={strapLength}
        side={side}
        intro={intro}
        cornerRadius={0.22}
        finish="glossy"
        metal="silver"
        damping={0.42}
        elasticity={0.45}
      />
      <button
        type="button"
        className="hang-key"
        style={{ top: `${top}%`, height: `${size * 100}%` }}
        aria-pressed={turned}
        onClick={() => handle.current?.flip()}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            handle.current?.nudge(e.key === 'ArrowLeft' ? -2.6 : 2.6);
          }
        }}
      >
        <span className="sr-only sr-only-x">{spoken(print)} Flip badge.</span>
      </button>
    </div>
  );
}
