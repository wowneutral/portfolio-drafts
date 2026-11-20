// The first screen: a stack of day leaves, one per note. Pull the top leaf down and it tears
// along the perforation, swings toward you and falls; the day before is underneath, in its own colour.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPE } from 'react';
import { PERSON, NOW } from '@/content';
import { formatDate, type Note } from '@/lib/notes';
import { ago, type Activity } from '@/lib/github';
import { gsap } from '@/lib/scroll';
import { still, clamp } from '@/lib/utils';
import { colorOf, dayName, todayISO } from './days';

type Leaf = { kind: 'note'; note: Note; i: number } | { kind: 'wait' } | { kind: 'none' } | { kind: 'end' };

const FALL = { y: () => window.innerHeight * 1.15, rotationX: 62, rotationZ: 9 };

export function Tear({ notes, loaded, activity }: { notes: Note[]; loaded: boolean; activity: Activity[] }) {
  const today = todayISO();
  const leaves: Leaf[] = !loaded ? [{ kind: 'wait' }] : notes.length ? [...notes.map((note, i) => ({ kind: 'note' as const, note, i })), { kind: 'end' }] : [{ kind: 'none' }];
  const noteCount = notes.length;
  const [torn, setTorn] = useState(0);
  const [peek, setPeek] = useState(false);
  const busy = useRef(false);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const putBack = useRef(false);
  const drag = useRef<{ x: number; y: number; t: number; dy: number; dx: number; v: number } | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const live = useRef<HTMLParagraphElement>(null);

  const top = refs.current[torn];
  const canTear = torn < leaves.length - 1;
  const canBack = torn > 0;
  const colorAt = (k: number) => {
    const l = leaves[k];
    if (!l || l.kind === 'end') return 'var(--paper)';
    return colorOf(l.kind === 'note' ? l.note.date : today);
  };

  useEffect(() => { if (torn > leaves.length - 1) setTorn(Math.max(0, leaves.length - 1)); }, [leaves.length, torn]);

  // A leaf put back drops in from above and settles with a small overshoot.
  useLayoutEffect(() => {
    if (!putBack.current) return;
    putBack.current = false;
    const el = refs.current[torn];
    if (!el) return;
    if (still) { gsap.set(el, { clearProps: 'transform,filter' }); busy.current = false; return; }
    gsap.fromTo(el, { y: -window.innerHeight * 0.5, rotationX: -24, rotationZ: -4, transformPerspective: 1500, transformOrigin: '50% 0%', filter: 'brightness(0.85)' },
      { y: 0, rotationX: 0, rotationZ: 0, filter: 'brightness(1)', duration: 0.85, ease: 'back.out(1.5)', onComplete: () => { busy.current = false; setPeek(false); } });
  }, [torn]);

  // The opening: today's leaf drops onto the pad and settles.
  useLayoutEffect(() => {
    const el = refs.current[0];
    if (!loaded || still || !el) return;
    gsap.fromTo(el, { y: -70, rotationX: -16, transformPerspective: 1500, transformOrigin: '50% 0%' }, { y: 0, rotationX: 0, duration: 1.1, ease: 'back.out(1.7)', delay: 0.1, clearProps: 'transform' });
  }, [loaded]);

  const say = (t: string) => { if (live.current) live.current.textContent = t; };

  const tear = useCallback((dx = 0) => {
    if (busy.current || !canTear) return;
    const el = refs.current[torn];
    busy.current = true;
    setPeek(true);
    const done = () => {
      busy.current = false;
      setTorn((t) => t + 1);
      setPeek(false);
      const next = leaves[torn + 1];
      say(next?.kind === 'note' ? `Showing the note from ${formatDate(next.note.date)}` : 'That was the earliest note.');
    };
    if (still || !el) { done(); return; }
    gsap.to(el, {
      y: FALL.y(), rotationX: FALL.rotationX, rotationZ: (dx >= 0 ? 1 : -1) * FALL.rotationZ + dx * 0.02, x: dx * 0.6,
      transformPerspective: 1500, transformOrigin: '50% 0%', filter: 'brightness(0.72)',
      duration: 0.8, ease: 'power2.in', onComplete: () => { gsap.set(el, { clearProps: 'transform,filter' }); done(); },
    });
  }, [canTear, torn, leaves]);

  const back = useCallback(() => {
    if (busy.current || !canBack) return;
    busy.current = true;
    putBack.current = !still;
    setPeek(true);
    setTorn((t) => t - 1);
    if (still) { busy.current = false; setPeek(false); }
    const prev = leaves[torn - 1];
    say(prev?.kind === 'note' ? `Showing the note from ${formatDate(prev.note.date)}` : '');
  }, [canBack, torn, leaves]);

  // Drag: mouse anywhere on the leaf, touch on the pull strip (so the page still scrolls on phones).
  const onDown = (e: RPE<HTMLDivElement>, fromStrip: boolean) => {
    if (busy.current || !canTear) return;
    if (!fromStrip && e.pointerType !== 'mouse') return;
    if ((e.target as HTMLElement).closest('a,button')) return;
    drag.current = { x: e.clientX, y: e.clientY, t: performance.now(), dy: 0, dx: 0, v: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setPeek(true);
    if (top) gsap.killTweensOf(top);
  };
  const onMove = (e: RPE<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || !top) return;
    const now = performance.now();
    const dy = Math.max(0, e.clientY - d.y);
    d.v = (dy - d.dy) / Math.max(1, now - d.t);
    d.t = now; d.dy = dy; d.dx = e.clientX - d.x;
    // The leaf resists, then gives: the swing grows fast at first and flattens out.
    const k = 1 - Math.exp(-dy / 260);
    gsap.to(top, { y: dy * 0.42, rotationX: k * 34, rotationZ: clamp(d.dx / 40, -6, 6) * k, x: d.dx * 0.18, filter: `brightness(${1 - k * 0.18})`, transformPerspective: 1500, transformOrigin: '50% 0%', duration: 0.25, ease: 'power3.out', overwrite: true });
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d || !top) return;
    if (d.dy > 150 || d.v > 0.9) tear(d.dx);
    else gsap.to(top, { y: 0, x: 0, rotationX: 0, rotationZ: 0, filter: 'brightness(1)', duration: 1.1, ease: 'elastic.out(1, 0.45)', overwrite: true, onComplete: () => setPeek(false) });
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' && canTear) { e.preventDefault(); tear(); }
    if (e.key === 'ArrowUp' && canBack) { e.preventDefault(); back(); }
  };

  const endTop = leaves[torn]?.kind === 'end';
  const pos = Math.min(torn + 1, Math.max(1, noteCount));

  return (
    <section className="dl-today" id="today" aria-labelledby="today-h" ref={stage}>
      <header className={'dl-band' + (endTop ? ' is-end' : '')} style={{ background: colorAt(torn) }}>
        <h1 className="dl-name">{PERSON.name}</h1>
        <p className="dl-line">{PERSON.line}</p>
      </header>
      <h2 id="today-h" className="sr-only-x">Today</h2>
      <div className="dl-stack" role="group" tabIndex={0} onKeyDown={onKey} aria-label="Daily notes. Arrow down tears off a leaf, arrow up puts one back.">
        {leaves.map((l, k) => {
          const isTop = k === torn;
          const under = k === torn + 1;
          if (!isTop && !under) return null;
          return (
            <div
              key={l.kind === 'note' ? l.note.date : l.kind}
              ref={(el) => { refs.current[k] = el; }}
              className={'dl-sheet' + (isTop ? ' is-top' : ' is-under') + (l.kind === 'end' ? ' is-end' : '')}
              style={{ background: colorAt(k), visibility: isTop || peek ? 'visible' : 'hidden', zIndex: leaves.length - k }}
              aria-hidden={!isTop}
              onPointerDown={isTop ? (e) => onDown(e, false) : undefined}
              onPointerMove={isTop ? onMove : undefined}
              onPointerUp={isTop ? onUp : undefined}
              onPointerCancel={isTop ? onUp : undefined}
            >
              <div className="dl-perf" aria-hidden="true" />
              <LeafBody leaf={l} today={today} activity={activity} count={noteCount} />
            </div>
          );
        })}
      </div>
      <div className={'dl-foot' + (endTop ? ' is-end' : '')} style={{ background: colorAt(torn) }}>
        <div className="dl-edge" aria-hidden="true">
          {Array.from({ length: Math.max(0, leaves.length - torn - 1) }, (_, j) => (
            <i key={j} style={{ background: colorAt(torn + 1 + j), top: j * 4 }} />
          ))}
        </div>
        <div
          className="dl-pull"
          onPointerDown={(e) => onDown(e, true)}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <p className="dl-hint">{canTear ? 'Pull the leaf down to tear it off.' : 'Every note so far.'}</p>
        </div>
        <div className="dl-ctl">
          <button type="button" onClick={() => tear()} disabled={!canTear}>Tear off</button>
          <button type="button" onClick={back} disabled={!canBack}>Put back</button>
          {noteCount > 0 && <p className="dl-count">Leaf {pos} of {noteCount}</p>}
        </div>
      </div>
      <p className="sr-only-x" aria-live="polite" ref={live} />
    </section>
  );
}

function LeafBody({ leaf, today, activity, count }: { leaf: Leaf; today: string; activity: Activity[]; count: number }) {
  if (leaf.kind === 'end') {
    return (
      <div className="dl-note">
        <div className="dl-big" aria-hidden="true">{count}</div>
        <div className="dl-field">
          <p className="dl-when">The bottom of the pad</p>
          <p className="dl-text">That is every note so far. Put them back and start from today.</p>
        </div>
      </div>
    );
  }
  const iso = leaf.kind === 'note' ? leaf.note.date : today;
  const day = +iso.slice(8, 10);
  const commits = leaf.kind === 'note' ? activity.filter((a) => a.at.slice(0, 10) === iso).slice(0, 3) : [];
  const tag = leaf.kind !== 'note' ? '' : iso === today ? 'Today' : leaf.i === 0 ? 'Latest note' : 'An earlier note';
  return (
    <div className="dl-note">
      <div className="dl-big" aria-hidden="true">{day}</div>
      <div className="dl-field">
        <p className="dl-when"><span>{dayName(iso)}</span> <span>{formatDate(iso, { month: 'long', year: 'numeric' })}</span></p>
        {leaf.kind === 'note' && (
          <>
            <p className="dl-tag">{tag}, {formatDate(iso)}</p>
            <div className="dl-text">{leaf.note.body.map((p, j) => <p key={j}>{p}</p>)}</div>
            {commits.length > 0 && (
              <ul className="dl-day-commits" aria-label="Commits that day">
                {commits.map((c) => (
                  <li key={c.href}><a href={c.href}><span>{c.message}</span> <span className="dl-sm">{c.repo}, {ago(c.at)}</span></a></li>
                ))}
              </ul>
            )}
          </>
        )}
        {leaf.kind === 'wait' && <p className="dl-text dl-wait">Fetching today’s note.</p>}
        {leaf.kind === 'none' && (
          <>
            <p className="dl-tag">No note posted yet</p>
            <p className="dl-text">{NOW.status}</p>
          </>
        )}
      </div>
    </div>
  );
}
