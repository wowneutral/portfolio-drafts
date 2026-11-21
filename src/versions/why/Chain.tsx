// Remixed from the React Bits Stepper (/home/claude/lab/rb/src/ts-default/Components/Stepper, MIT + Commons Clause): its spring, animated viewport height, directional slide, indicators and Back control.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react';
import { scrollToY } from '@/lib/scroll';

// The Stepper's own spring and settle curves, kept exactly.
const SPRING =
  'linear(0, 0.0603, 0.2033, 0.3821, 0.5633, 0.7258, 0.8584, 0.9574, 1.0242, 1.0634, 1.0809, 1.0828, 1.0747, 1.0613, 1.046, 1.0313, 1.0186, 1.0085, 1.0012, 0.9965, 0.994, 0.9931, 0.9933, 0.9941, 0.9953, 0.9966, 0.9978, 0.9988, 1)';
const ease = () =>
  typeof CSS !== 'undefined' && CSS.supports?.('transition-timing-function', 'linear(0, 1)') ? SPRING : 'cubic-bezier(0.22, 1, 0.36, 1)';
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const depthVar = (d: number) => ({ '--d': Math.min(d, 3) }) as CSSProperties;

type Answer = { text: string; ask: string };

type Props = {
  id: string;
  claim: ReactNode;
  answers: Answer[];
  end?: ReactNode;
  depth: number;
  setDepth: (n: number) => void;
  size: 'hero' | 'body';
  whyRef?: Ref<HTMLButtonElement>;
  level: 2 | 3;
};

/** A chain of reasons. Each press of Why? adds one answer, one level down and in. */
export default function Chain({ id, claim, answers, end, depth, setDepth, size, whyRef, level }: Props) {
  const H = level === 2 ? 'h2' : 'h3';
  const total = answers.length + (end ? 1 : 0);
  const [view, setView] = useState({ depth, prev: null as number | null, n: 0 });
  if (view.depth !== depth) setView({ depth, prev: view.depth, n: view.n + 1 });
  const rendered = view.prev !== null && view.prev > depth ? view.prev : depth;

  const viewRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  const rows = useRef<(HTMLElement | null)[]>([]);
  const height = useRef(0);

  useLayoutEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    height.current = el.offsetHeight;
    const ro = new ResizeObserver(() => { height.current = el.offsetHeight; });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (view.n === 0 || view.prev === null) return;
    const el = viewRef.current;
    if (!el) return;
    const n = view.n;
    const done = () => setView((s) => (s.n === n ? { ...s, prev: null } : s));
    const cut = reduced();
    el.getAnimations().forEach((a) => a.cancel());
    const spring = ease();
    const step = parseFloat(getComputedStyle(el).getPropertyValue('--step-px')) || 40;

    if (depth > view.prev) {
      const row = rows.current[depth];
      if (!cut) {
        const from = height.current, to = el.offsetHeight;
        if (Math.abs(from - to) > 0.5) el.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration: 560, easing: spring });
        if (row) {
          // one level down and in: from where the reason above stands, to its own step
          const dx = Math.min(depth, 3) > Math.min(depth - 1, 3) ? -step : 0;
          row.animate([{ transform: `translate(${dx}px, -28px)` }, { transform: 'none' }], { duration: 560, easing: spring });
          row.animate([{ opacity: 0 }, { opacity: 0, offset: 0.25 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' });
        }
      }
      row?.focus({ preventScroll: true });
      const foot = footRef.current?.getBoundingClientRect();
      const bottom = Math.max(foot?.bottom ?? 0, row ? row.getBoundingClientRect().top + (row.offsetHeight || 0) : 0);
      if (bottom > innerHeight * 0.9) scrollToY(scrollY + bottom - innerHeight * 0.72, cut);
      done();
      return;
    }

    // going back: the deeper reasons fold up into the one above, the viewport closes after them
    const first = rows.current[depth + 1];
    const to = first ? first.offsetTop : el.offsetHeight;
    const leaving = rows.current.slice(depth + 1, rendered + 1).filter(Boolean) as HTMLElement[];
    if (cut || !leaving.length) { done(); return; }
    for (const r of leaving) {
      r.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'cubic-bezier(0.2, 0, 0.4, 1)', fill: 'forwards' });
      r.animate([{ transform: 'none' }, { transform: `translate(${-step}px, -28px)` }], { duration: 220, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' });
    }
    const shut = el.animate([{ height: `${el.offsetHeight}px` }, { height: `${to}px` }], { duration: 420, easing: spring, fill: 'forwards' });
    shut.onfinish = () => { done(); requestAnimationFrame(() => el.getAnimations().forEach((a) => a.cancel())); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.n]);

  // when the leaving rows are gone, clear their fill animations
  useEffect(() => {
    if (view.prev === null) rows.current.forEach((r) => r?.getAnimations().forEach((a) => a.cancel()));
  }, [view.prev]);

  const mark = (i: number) => (
    <button
      type="button"
      className="mk"
      aria-label={i === 0 ? 'Back to the first claim' : i > answers.length ? 'Back to where the reasons run out' : `Back to reason ${i}`}
      aria-current={i === depth ? 'step' : undefined}
      disabled={i === depth || i > depth}
      onClick={() => setDepth(i)}
    >
      <span className="mk-line" aria-hidden="true" />
    </button>
  );

  const ask = depth < answers.length ? answers[depth].ask : 'Why?';
  const atEnd = depth >= total;

  return (
    <div className={`ch ch-${size}`} data-depth={depth}>
      <div className="ch-strip" role="group" aria-label="How deep you are">
        {Array.from({ length: rendered + 1 }, (_, i) => (
          <button
            key={i}
            type="button"
            className="sm"
            data-on={i === depth ? '' : undefined}
            data-gone={i > depth ? '' : undefined}
            style={depthVar(i)}
            aria-label={i === 0 ? 'Back to the first claim' : i > answers.length ? 'Back to where the reasons run out' : `Back to reason ${i}`}
            aria-current={i === depth ? 'step' : undefined}
            disabled={i >= depth}
            onClick={() => setDepth(i)}
          >
            <span aria-hidden="true" />
          </button>
        ))}
      </div>
      <div className="ch-view" ref={viewRef}>
        <div className="ch-row ch-claim" style={depthVar(0)} data-on={depth === 0 ? '' : undefined} ref={(e) => { rows.current[0] = e; }}>
          {mark(0)}
          <div className="ch-body">{claim}</div>
        </div>
        {Array.from({ length: rendered }, (_, k) => {
          const i = k + 1;
          const gone = i > depth;
          const isEnd = i > answers.length;
          const hid = `${id}-r${i}`;
          return (
            <section
              key={i}
              className={`ch-row${isEnd ? ' ch-end' : ''}`}
              style={depthVar(i)}
              data-on={i === depth ? '' : undefined}
              data-gone={gone ? '' : undefined}
              aria-hidden={gone ? true : undefined}
              aria-labelledby={hid}
              tabIndex={-1}
              ref={(e) => { rows.current[i] = e; }}
            >
              {mark(i)}
              <div className="ch-body">
                <p className="ch-ask" aria-hidden="true">{isEnd ? 'Why?' : answers[i - 1].ask}</p>
                {isEnd ? (
                  <>
                    <H id={hid} className="sr-only-x">Where the reasons run out</H>
                    {end}
                  </>
                ) : (
                  <>
                    <H id={hid} className="sr-only-x">Reason {i}</H>
                    <p className="ch-a">{answers[i - 1].text}</p>
                  </>
                )}
              </div>
            </section>
          );
        })}
      </div>
      <div className="ch-foot" ref={footRef} style={depthVar(Math.min(depth + 1, 3))} data-end={atEnd ? '' : undefined}>
        <button type="button" className="why" ref={whyRef} hidden={atEnd} onClick={() => setDepth(depth + 1)}>
          {ask}
        </button>
        <button type="button" className="back" hidden={depth === 0} onClick={() => setDepth(depth - 1)}>
          Back
        </button>
      </div>
      {size === 'hero' && (
        <div className="ch-ghost" aria-hidden="true">
          {Array.from({ length: Math.max(0, total - depth) }, (_, k) => <span key={depth + 1 + k} style={depthVar(depth + 1 + k)} />)}
        </div>
      )}
    </div>
  );
}
