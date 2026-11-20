// The reading point. One fixed spot in its own band; words land on it one at a time,
// each aligned on its recognition letter (red). Speed follows scroll velocity, clamped.
import { forwardRef, useEffect, useImperativeHandle, useRef, type RefObject } from 'react';
import { gsap, scroll } from '@/lib/scroll';
import { clamp, still } from '@/lib/utils';

export type Tok = string | { w: string; hold: number };
export type BandHandle = { play: (t?: Tok[], wpm?: number, own?: boolean) => void };

/** Pause state shared by every band: press and hold, or Space to toggle. */
export const ctrl = { held: false, toggled: false };
const paused = () => ctrl.held || ctrl.toggled;

const word = (t: Tok) => (typeof t === 'string' ? t : t.w);
export const toks = (s: string): Tok[] => s.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
export const lead = (s: string) => (s.match(/^.+?[.?!](?=\s|$)/)?.[0] ?? s);

/** Spritz-style optimal recognition point, skipping leading quotes and brackets. */
export function orp(w: string) {
  const skip = w.match(/^[^\p{L}\p{N}]*/u)?.[0].length ?? 0;
  const n = w.replace(/[^\p{L}\p{N}]/gu, '').length;
  const k = n <= 1 ? 0 : n <= 5 ? 1 : n <= 9 ? 2 : n <= 13 ? 3 : 4;
  return Math.min(w.length - 1, skip + k);
}

/** Set-down text whose words the band can underline as it reads them. */
export function Words({ text, from = 0 }: { text: string; from?: number }) {
  const w = text.replace(/\s+/g, ' ').trim().split(' ');
  return <>{w.map((x, k) => <span key={k}><span className="sp-w" data-i={from + k}>{x}</span>{k < w.length - 1 ? ' ' : ''}</span>)}</>;
}

/** A set-down word in the display face with its recognition letter marked. */
export function Orp({ w }: { w: string }) {
  const i = orp(w);
  return <>{w.slice(0, i)}<span className="sp-o">{w[i]}</span>{w.slice(i + 1)}</>;
}

type Props = { track?: RefObject<HTMLElement | null>; tokens: Tok[]; wpm?: number; size?: 'xl' | 'l' | 'm'; auto?: 'view' | 'load'; delay?: number; rest?: string; onDone?: () => void };

export const Band = forwardRef<BandHandle, Props>(function Band({ track, tokens, wpm = 300, size = 'l', auto = 'view', delay = 0, rest, onDone }, ref) {
  const band = useRef<HTMLDivElement>(null);
  const wEl = useRef<HTMLSpanElement>(null);
  const lEl = useRef<HTMLSpanElement>(null);
  const oEl = useRef<HTMLSpanElement>(null);
  const rEl = useRef<HTMLSpanElement>(null);
  const st = useRef({ toks: tokens, i: 0, acc: 0, wait: 0, mode: 'idle' as 'idle' | 'play' | 'done', base: wpm, fs: 0, own: true });
  const done = useRef(onDone);
  done.current = onDone;

  const show = (t: Tok) => {
    const w = word(t), b = band.current, el = wEl.current;
    if (!b || !el || !lEl.current || !oEl.current || !rEl.current) return;
    const i = orp(w);
    lEl.current.textContent = w.slice(0, i);
    oEl.current.textContent = w[i] ?? '';
    rEl.current.textContent = w.slice(i + 1);
    const s = st.current;
    el.style.fontSize = '';
    s.fs = parseFloat(getComputedStyle(el).fontSize) || 100;
    const measure = () => {
      const a = el.getBoundingClientRect(), o = oEl.current!.getBoundingClientRect();
      const c = o.left - a.left + o.width / 2;
      return { c, left: c, right: a.width - c };
    };
    let m = measure();
    const half = b.clientWidth / 2 - Math.max(16, b.clientWidth * 0.05);
    const k = Math.min(1, half / Math.max(1, m.left, m.right));
    if (k < 1) { el.style.fontSize = `${Math.floor(s.fs * k)}px`; m = measure(); }
    el.style.transform = `translate(${-m.c}px, -50%)`;
  };

  // The same word in the set-down text below is underlined as it passes the point.
  const mark = (i: number) => {
    const root = track?.current;
    if (!root) return;
    root.querySelector('.sp-w.is-on')?.classList.remove('is-on');
    if (i >= 0 && st.current.own) root.querySelector(`.sp-w[data-i="${i}"]`)?.classList.add('is-on');
  };

  const finish = () => {
    const s = st.current;
    if (s.mode === 'done') return;
    s.mode = 'done';
    s.i = s.toks.length - 1;
    mark(-1);
    show(s.toks[s.i]);
    band.current?.setAttribute('data-state', 'done');
    done.current?.();
  };

  const start = (t?: Tok[], base?: number, own = false) => {
    const s = st.current;
    if (t) { s.toks = t; s.own = own; mark(-1); }
    if (base) s.base = base;
    if (still || !s.toks.length) { show(rest ?? s.toks[s.toks.length - 1] ?? ''); return; }
    s.i = 0; s.acc = 0; s.mode = 'play';
    band.current?.setAttribute('data-state', 'play');
    show(s.toks[0]);
    mark(0);
  };

  useImperativeHandle(ref, () => ({ play: (t, base, own) => { st.current.wait = 0; start(t, base, own); } }));

  // New tokens (notes and GitHub load later) replace the queue until it has played.
  useEffect(() => {
    const s = st.current;
    if (s.mode === 'idle' || still) { s.toks = tokens; show(still ? rest ?? word(tokens[tokens.length - 1] ?? '') : tokens[0] ?? ''); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens]);

  useEffect(() => {
    const s = st.current;
    const fit = () => show(s.mode === 'idle' ? (still ? rest ?? s.toks[s.toks.length - 1] : s.toks[0]) : s.toks[s.i]);
    document.fonts?.ready.then(fit);
    window.addEventListener('resize', fit);
    if (still) return () => window.removeEventListener('resize', fit);

    if (auto === 'load') { s.wait = delay; start(); }
    const io = new IntersectionObserver(([e]) => {
      if (auto === 'view' && s.mode === 'idle' && e.intersectionRatio >= 0.55) start();
      // Scrolling past skips the spread: the band settles on its last word.
      if (!e.isIntersecting && e.boundingClientRect.top < 0 && s.mode !== 'done') finish();
    }, { threshold: [0, 0.55] });
    if (band.current) io.observe(band.current);

    const tick = (_t: number, dms: number) => {
      if (s.mode !== 'play') return;
      if (s.wait > 0) { s.wait -= dms; return; }
      if (paused()) return;
      s.acc += dms;
      const rate = clamp(s.base + Math.abs(scroll.v) * 280, 60, 600);
      const t = s.toks[s.i];
      const w = word(t);
      let need = 60000 / rate;
      if (typeof t !== 'string') need = t.hold * (s.base / rate);
      else if (/[.?!]["”’)]*$/.test(w)) need *= 2.1;
      else if (/[,;:]["”’)]*$/.test(w)) need *= 1.45;
      else if (w.length > 8) need *= 1.25;
      if (s.acc < need) return;
      s.acc = 0;
      if (s.i >= s.toks.length - 1) { finish(); return; }
      s.i++;
      show(s.toks[s.i]);
      mark(s.i);
    };
    gsap.ticker.add(tick);
    return () => { gsap.ticker.remove(tick); io.disconnect(); window.removeEventListener('resize', fit); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`sp-band sp-${size}`} ref={band} aria-hidden="true" data-state="idle">
      <i className="sp-ret" />
      <span className="sp-word" ref={wEl}><span ref={lEl} /><span className="sp-o" ref={oEl} /><span ref={rEl} /></span>
    </div>
  );
});
