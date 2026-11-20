// The first screen: his name, set where the hash says, with today's note in the space it leaves.
import { useLayoutEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { PERSON } from '@/content';
import { formatDate } from '@/lib/notes';
import type { Note } from '@/lib/notes';
import { still } from '@/lib/utils';
import { PLACES, RATIO_NAMES } from './deck';

const GRID_NAMES = { a: 'ruled', b: 'halves', c: 'offset' } as const;
const LEAD_NAMES = { debate: 'Debate', work: 'Work', research: 'Research', log: 'The log' } as const;
import type { Band, Layout, Slot } from './deck';

export type Step = { seed: string; label: string; href?: string; message?: string; repo?: string; at?: string; date?: string };

const col = (s: Slot): CSSProperties => ({ gridColumn: `${s.c} / span ${s.s}` });
type Rect = { cx: number; cy: number; long: number; v: boolean; seed: string };

export function Hero({ lay, vertical, em, step, idx, total, go, note, loaded, probe }: {
  lay: Layout; vertical: boolean; em: { one: number; two: number }; step: Step; idx: number; total: number;
  go: (d: number) => void; note: Note | undefined; loaded: boolean; probe: boolean;
}) {
  const place = PLACES[lay.place];
  const nm = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLElement>(null);
  const last = useRef<Rect | null>(null);

  // The one text motion on the page: the name glides from where the last layout put it.
  useLayoutEffect(() => {
    const el = nm.current, h = hero.current;
    if (!el || !h) return;
    el.getAnimations().forEach((a) => a.cancel());
    const hr = h.getBoundingClientRect(), r = el.getBoundingClientRect();
    const now: Rect = { cx: r.left - hr.left + r.width / 2, cy: r.top - hr.top + r.height / 2, long: Math.max(r.width, r.height), v: vertical, seed: lay.seed };
    const prev = last.current;
    last.current = now;
    if (probe || !prev || prev.seed === now.seed || still) return;
    const rot = prev.v === now.v ? 0 : now.v ? 90 : -90;
    const s = prev.long / now.long;
    el.animate(
      [{ transform: `translate(${prev.cx - now.cx}px, ${prev.cy - now.cy}px) rotate(${rot}deg) scale(${s})` }, { transform: 'none' }],
      { duration: 1150, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', delay: 120, fill: 'backwards' },
    );
  }, [lay.seed, vertical, em.one, probe]);

  const two = place.lines === 2 && !vertical;
  const name = (
    <div key="n" ref={nm} className={'hx-nm' + (vertical ? ' is-v' : '')} style={vertical ? undefined : { ...col(place.name), gridRow: '1' }}>
      <h1 className={'hx-name' + (two ? ' two' : '')} style={{ '--em': two ? em.two : em.one, '--cap': two ? '26svh' : '30svh' } as CSSProperties}>
        <span className="hx-w">{PERSON.first}</span>{two ? null : ' '}<span className="hx-w">{PERSON.last}</span>
      </h1>
    </div>
  );

  // In the vertical set the line takes whichever band the note and colophon leave free.
  const lineBand: Band = vertical ? (['b', 'm', 't'] as Band[]).find((b) => b !== place.note.band && b !== place.colo.band) ?? 'b' : place.name.band;
  const lineSlot: Slot = vertical ? { band: lineBand, c: 1, s: 6 } : { band: lineBand, c: place.name.c, s: Math.min(place.name.s, 6) };

  const items: Record<Band, ReactNode[]> = { t: [], m: [], b: [] };
  if (!vertical) items[place.name.band].push(name);
  items[lineSlot.band].push(<p key="l" className="hx-line" style={{ ...col(lineSlot), gridRow: vertical ? '1' : '2' }}>{PERSON.line}</p>);
  items[place.note.band].push(
    <div key="t" className="hx-note" style={{ ...col(place.note), gridRow: place.note.band === place.name.band && !vertical ? '1 / span 2' : '1' }}>
      {note ? (
        <>
          <h2 className="hx-date"><time dateTime={note.date}>{formatDate(note.date)}</time></h2>
          {note.body.map((p, i) => <p key={i}>{p}</p>)}
          <a className="lk hx-more" href="#notebook">Earlier notes</a>
        </>
      ) : (
        <>
          <h2 className="hx-date">Today</h2>
          <p className="mute">{loaded ? 'No note yet today.' : 'Fetching today’s note.'}</p>
        </>
      )}
    </div>,
  );
  items[place.colo.band].push(
    <div key="c" className="hx-colo" style={{ ...col(place.colo), gridRow: place.colo.band === place.name.band && !vertical ? '1 / span 2' : '1' }}>
      <p className="hx-set">
        Set from{' '}
        {step.href ? (
          <a className="sha" href={step.href} target="_blank" rel="noreferrer" aria-label={`commit ${step.seed}`}>{step.seed}</a>
        ) : step.label === 'forced' ? (
          <span className="sha">{step.seed}</span>
        ) : (
          step.label
        )}
        .
      </p>
      <p className="hx-spec mute">{RATIO_NAMES[lay.ratio]} scale, {GRID_NAMES[lay.grid]} grid, {LEAD_NAMES[lay.lead]} first.</p>
      {step.message ? <p className="hx-msg">{step.message}<span className="mute">, {step.repo}</span></p> : null}
      <div className="hx-step">
        <button type="button" className="arw" onClick={() => go(1)} disabled={idx >= total - 1} aria-label="Set the page from the commit before">
          <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <span className="hx-count" aria-live="polite">{idx === 0 ? 'Latest' : `${idx} back`}<span className="mute"> of {total}</span></span>
        <button type="button" className="arw" onClick={() => go(-1)} disabled={idx === 0} aria-label="Set the page from the commit after">
          <ArrowRight size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    </div>,
  );

  return (
    <header ref={hero} className={'hx' + (vertical ? ' hx-v' : '')} data-band={place.name.band}>
      <div className="hx-cols" aria-hidden="true">{Array.from({ length: 12 }, (_, k) => <i key={k} className={k + 1 >= place.name.c && k + 1 < place.name.c + place.name.s && !vertical ? 'on' : undefined} />)}</div>
      {vertical ? name : null}
      {(['t', 'm', 'b'] as Band[]).map((b) => (
        <div key={b} className={`hx-band hx-${b}`}>{items[b]}</div>
      ))}
    </header>
  );
}
