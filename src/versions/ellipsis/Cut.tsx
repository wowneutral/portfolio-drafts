// The cut block, after chenglou/pretext's ellipsis demo (MIT): the closed and the open paragraph are both laid
// out by Pretext at the block's width before any click, the box moves between the two known heights, and the two
// layers cross over (closed fades, open arrives) while the page below slides down to make room.
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useId } from 'react';
import { create } from 'zustand';
import { ELLIPSIS, LESS_LABEL, layoutCut, faces, type FaceName, type Face } from './model';
import { play, snapshot, type Snap } from './flip';

/** The page-wide "Don't keep it short." switch. `tick` bumps on every press so every block hears it. */
export const useAll = create<{ all: boolean; tick: number }>(() => ({ all: false, tick: 0 }));
export function setAll(all: boolean) { useAll.setState((s) => ({ all, tick: s.tick + 1 })); }

/** Lines each block gives back when opened, for the closing count. */
export const counts = new Map<string, { closed: number; open: number }>();

type Env = { ready: boolean; phone: boolean; still: boolean; F: Record<FaceName, Face> };
export const EnvCtx = createContext<Env>({ ready: false, phone: false, still: false, F: faces(false) });

/** Open state that also follows the page-wide switch. */
export function useOpen(): [boolean, (v: boolean) => void] {
  const [open, setOpen] = useState(false);
  const tick = useAll((s) => s.tick);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setOpen(useAll.getState().all);
  }, [tick]);
  return [open, setOpen];
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.floor(el.clientWidth)));
    ro.observe(el);
    setW(Math.floor(el.clientWidth));
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export function duration(delta: number, still: boolean) {
  return still ? 0 : Math.round(Math.min(950, 340 + Math.abs(delta) * 0.45));
}

type Props = {
  text: string | readonly string[];
  face: FaceName;
  lines?: number;
  cutAt?: string;
  className?: string;
  /** Controlled: Work opens the line and the screenshot together. */
  open?: boolean;
  onToggle?: (v: boolean) => void;
  /** Controlled: bumps when the parent toggles by hand, so this block animates its layers in the parent's time. */
  animKey?: number;
  dur?: number;
  as?: 'div' | 'p';
};

export function Cut({ text, face, lines = 1, cutAt, className, open: openProp, onToggle, animKey = 0, dur: durProp, as = 'div' }: Props) {
  const env = useContext(EnvCtx);
  const F = env.F[face];
  const key = typeof text === 'string' ? text : text.join('\u0001');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const paras = useMemo(() => (typeof text === 'string' ? [text] : [...text]), [key]);
  const [own, setOwn] = useOpen();
  const open = openProp ?? own;
  const animate = useRef(false);
  const snap = useRef<Snap | null>(null);
  const set = (v: boolean) => {
    if (onToggle) { onToggle(v); return; }
    animate.current = true;
    if (wrapRef.current && !env.still) snap.current = snapshot(wrapRef.current);
    setOwn(v);
  };
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const id = useId();
  const openRef = useRef<HTMLDivElement>(null);
  const closedRef = useRef<HTMLButtonElement>(null);
  const lessRef = useRef<HTMLButtonElement>(null);
  const focusAfter = useRef<'less' | 'closed' | null>(null);

  const L = useMemo(
    () => (env.ready && width > 40 ? layoutCut(paras, F, width, lines, cutAt) : null),
    [env.ready, width, paras, F, lines, cutAt],
  );

  // moving: both layers painted while the block changes; closing, the box keeps painting its open height under a
  // negative margin, so the layout is already short while the clip closes onto it.
  const [moving, setMoving] = useState(false);
  const was = useRef(open);
  const lastKey = useRef(animKey);
  const dur = durProp ?? (L ? duration(L.openH - L.closedH, env.still) : 0);
  useLayoutEffect(() => {
    if (was.current === open) return;
    was.current = open;
    const byHand = animate.current || animKey !== lastKey.current;
    animate.current = false;
    lastKey.current = animKey;
    if (!dur || !byHand || !L) { setMoving(false); snap.current = null; return; }
    setMoving(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useLayoutEffect(() => {
    if (!moving) return;
    if (snap.current && wrapRef.current && L) {
      play(wrapRef.current, snap.current, open ? L.openH - L.closedH : L.closedH - L.openH, dur);
      snap.current = null;
    }
    const t = window.setTimeout(() => setMoving(false), dur + 40);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moving]);

  useEffect(() => {
    if (!L || !L.truncated) { counts.delete(id); return; }
    counts.set(id, { closed: L.closed.length, open: L.lineCount });
    return () => { counts.delete(id); };
  }, [L, id]);

  // The open text stays in the DOM while closed: hidden="until-found", so find in page reaches it and opens it.
  const rested = !open && !moving;
  useLayoutEffect(() => {
    const el = openRef.current;
    if (!el) return;
    if (rested) el.setAttribute('hidden', 'until-found');
    else el.removeAttribute('hidden');
  }, [rested, L]);
  useEffect(() => {
    const el = openRef.current;
    if (!el) return;
    const on = () => set(true);
    el.addEventListener('beforematch', on);
    return () => el.removeEventListener('beforematch', on);
  });

  useEffect(() => {
    if (!focusAfter.current) return;
    const el = focusAfter.current === 'less' ? lessRef.current : closedRef.current;
    focusAfter.current = null;
    el?.focus({ preventScroll: true });
  }, [open]);

  const Tag = as;
  const fontStyle = { font: F.font, lineHeight: `${F.lh}px` };
  const cls = `cut cut-${face}${className ? ' ' + className : ''}`;

  if (!L) {
    // Before the fonts are measured: the same text, clamped by the browser, so the first frame is already right.
    return (
      <div ref={wrapRef} className={cls}>
        <Tag className="cut-plain" style={{ ...fontStyle, WebkitLineClamp: lines }}>{paras.join(' ')}</Tag>
      </div>
    );
  }

  if (!L.truncated) {
    return (
      <div ref={wrapRef} className={cls}>
        <Tag className="cut-whole" style={fontStyle}>
          {L.open[0]!.map((t, i) => <span className="ln" key={i}>{t}</span>)}
        </Tag>
      </div>
    );
  }

  const h = open || moving ? L.openH : L.closedH;
  const mb = !open && moving ? L.closedH - L.openH : 0;
  const t = `${dur}ms`;
  const lastP = L.open.length - 1;
  return (
    <div ref={wrapRef} className={cls} data-open={open ? '' : undefined}>
      <div className="cut-box" style={{ height: h, marginBottom: mb }}>
        <button
          ref={closedRef}
          type="button"
          className="cut-closed"
          aria-expanded={open}
          aria-controls={id}
          aria-label={`${L.closed.join(' ').replace(/\s+/g, ' ')}${ELLIPSIS} read the rest`}
          inert={open}
          style={{ ...fontStyle, opacity: open ? 0 : 1, visibility: open && !moving ? 'hidden' : 'visible', transitionDuration: `${Math.round(dur * 0.4)}ms` }}
          onClick={() => { focusAfter.current = 'less'; set(true); }}
        >
          {L.closed.map((s, i) => (
            <span className="ln" key={i}>
              {s}
              {i === L.closed.length - 1 && (
                <span className="dots" aria-hidden="true" style={{ font: F.dots, lineHeight: 0, marginLeft: F.pad }}>
                  <i>.</i><i>.</i><i>.</i>
                </span>
              )}
            </span>
          ))}
        </button>
        <div
          ref={openRef}
          id={id}
          className="cut-open"
          data-slot="accordion-content"
          inert={!open}
          style={{ ...fontStyle, opacity: open ? 1 : 0, transitionDuration: t }}
        >
          {L.open.map((p, pi) => (
            <Tag className="para" key={pi} style={{ marginBottom: pi < lastP ? L.gap : 0 }}>
              {p.map((s, i) => (
                <span className="ln" key={i}>
                  {s}
                  {pi === lastP && i === p.length - 1 && !L.lessOwnLine && (
                    <button ref={lessRef} type="button" className="less" style={{ font: F.less, marginLeft: F.pad }} onClick={() => { focusAfter.current = 'closed'; set(false); }}>
                      {LESS_LABEL}
                    </button>
                  )}
                </span>
              ))}
              {pi === lastP && L.lessOwnLine && (
                <span className="ln">
                  <button ref={lessRef} type="button" className="less" style={{ font: F.less }} onClick={() => { focusAfter.current = 'closed'; set(false); }}>
                    {LESS_LABEL}
                  </button>
                </span>
              )}
            </Tag>
          ))}
        </div>
      </div>
    </div>
  );
}
