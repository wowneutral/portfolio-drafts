// One stretch of the band, beside one section. The stretches abut, so the cloth runs unbroken down the page.
import { createContext, useContext, useEffect, useRef, useState, type RefObject, type KeyboardEvent } from 'react';
import { gsap } from '@/lib/scroll';
import { still } from '@/lib/utils';
import { paintCloth, paintWarp, textMask, turn, warpsFrom, type Mark, type Shot } from './weave';
import type { Repo } from '@/lib/github';

export const Loom = createContext<{ shots: Shot[]; repos: Repo[] }>({ shots: [], repos: [] });
const FAMILY = 'Big Shoulders Display Variable';

// The fell: the page line above which the cloth is woven. It only ever moves down.
const segs = new Set<{ cell: HTMLElement; wrap: HTMLElement; reed: HTMLElement; last: number }>();
const fell = { y: 0, intro: true };
let ticking = false;
function tick() {
  if (!fell.intro) {
    const vh = window.innerHeight; const left = document.documentElement.scrollHeight - vh - window.scrollY;
    fell.y = Math.max(fell.y, window.scrollY + vh * (0.84 + 0.16 * Math.max(0, 1 - left / (vh * 0.5))));
  }
  for (const s of segs) {
    const r = s.cell.getBoundingClientRect();
    const top = r.top + window.scrollY;
    const show = Math.max(0, Math.min(r.height, fell.y - top));
    const v = Math.round(r.height - show);
    if (v !== s.last) {
      s.last = v; s.wrap.style.clipPath = v <= 0 ? 'none' : `inset(0 0 ${v}px 0)`;
      s.reed.style.opacity = show > 0 && v > 0 ? '1' : '0';
      s.reed.style.transform = `translateY(${show}px)`;
    }
  }
}
export function startLoom() {
  if (still) { fell.y = 1e9; fell.intro = false; tick(); return () => {}; }
  fell.y = 0; fell.intro = true;
  if (!ticking) { gsap.ticker.add(tick); ticking = true; }
  const tw = gsap.to(fell, { y: () => window.scrollY + window.innerHeight * 0.84, duration: 2.6, delay: 0.35, ease: 'power2.inOut', onComplete: () => { fell.intro = false; } });
  return () => { tw.kill(); gsap.ticker.remove(tick); ticking = false; };
}

type Pickable = { onPick: (i: number) => void; selected: number };
type Measured = Mark & { i?: number; label?: string; word?: string };

export function Band({ word, sec, start, end, pick, dep }: { word: string[]; sec: RefObject<HTMLElement | null>; start?: boolean; end?: boolean; pick?: Pickable; dep?: unknown }) {
  const { shots, repos } = useContext(Loom);
  const cell = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const cloth = useRef<HTMLCanvasElement>(null);
  const warp = useRef<HTMLCanvasElement>(null);
  const reed = useRef<HTMLDivElement>(null);
  const [marks, setMarks] = useState<Measured[]>([]);
  const st = useRef({ visible: false, dirty: true, key: '' });
  const btns = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const c = cell.current!, w = wrap.current!, s = sec.current!;
    const seg = { cell: c, wrap: w, reed: reed.current!, last: -1 };
    segs.add(seg);
    if (still) w.style.clipPath = 'none';

    const measure = () => {
      const top = s.getBoundingClientRect().top;
      const m: Measured[] = [...s.querySelectorAll<HTMLElement>('[data-weave]')].map((el) => {
        const r = el.getBoundingClientRect();
        return { y0: Math.round(r.top - top), y1: Math.round(r.bottom - top), kind: el.dataset.weave as Mark['kind'], shot: el.dataset.shot ? +el.dataset.shot : undefined, i: el.dataset.i ? +el.dataset.i : undefined, label: el.dataset.label, word: el.dataset.word, big: 'big' in el.dataset };
      });
      return m;
    };
    const draw = () => {
      const w2 = c.clientWidth, h = c.clientHeight;
      if (!w2 || !h) return;
      const m = measure();
      const key = JSON.stringify([w2, h, m, shots.length, repos.length, Math.round(c.getBoundingClientRect().top + window.scrollY)]);
      setMarks((old) => (JSON.stringify(old) === JSON.stringify(m) ? old : m));
      if (!st.current.visible) { st.current.dirty = true; return; }
      if (key === st.current.key) return;
      st.current.key = key; st.current.dirty = false;
      const narrow = w2 < 160;
      const P = narrow ? 4 : 6;
      const ends = Math.floor(w2 / P);
      const warps = warpsFrom(repos, ends);
      const mask = narrow ? turn(textMask([word.join(' ')], 0, ends - 4, FAMILY, true)) : textMask(word, ends, word.length > 1 ? 30 : 22, FAMILY);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const top = c.getBoundingClientRect().top + window.scrollY;
      const endAt = end ? h - (narrow ? 90 : 150) : undefined;
      const headings = [{ mask, r0: narrow ? 20 : start ? 88 : 44, c0: Math.floor((ends - mask.cols) / 2) }];
      if (!narrow) for (const x of m) if (x.word) {
        const wm = textMask(x.word.split('|'), ends, 14, FAMILY);
        headings.push({ mask: wm, r0: x.y0 + 12, c0: Math.floor((ends - wm.cols) / 2) });
      }
      paintCloth(cloth.current!, { w: w2, h, pitch: P, top, warps, shots, marks: m, start, end: endAt, headings }, dpr);
      paintWarp(warp.current!, w2, endAt ?? h, P, warps, dpr);
      warp.current!.style.height = (endAt ?? h) + 'px';
    };
    const io = new IntersectionObserver(([e]) => { st.current.visible = e.isIntersecting; if (e.isIntersecting && st.current.dirty) draw(); }, { rootMargin: '120% 0px' });
    io.observe(c);
    let raf = 0;
    const later = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };
    const ro = new ResizeObserver(later);
    ro.observe(s);
    window.addEventListener('load', later);
    document.fonts.ready.then(later);
    later();
    return () => { segs.delete(seg); io.disconnect(); ro.disconnect(); window.removeEventListener('load', later); cancelAnimationFrame(raf); };
  }, [sec, shots, repos, word, start, end, dep]);

  const picks = pick ? marks.filter((m) => m.i !== undefined) : [];
  const key = (e: KeyboardEvent, k: number) => {
    const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    btns.current[(k + d + picks.length) % picks.length]?.focus();
  };

  return (
    <div className="lm-band" ref={cell}>
      <canvas className="lm-warp" ref={warp} aria-hidden="true" />
      <div className="lm-cloth" ref={wrap} aria-hidden="true"><canvas ref={cloth} /></div>
      <div className="lm-reed" ref={reed} aria-hidden="true" />
      {picks.map((m, k) => (
        <button
          key={k}
          ref={(b) => { btns.current[k] = b; }}
          type="button"
          className="lm-pick"
          style={{ top: m.y0, height: Math.max(20, m.y1 - m.y0) }}
          aria-label={m.label}
          aria-pressed={pick!.selected === m.i}
          onPointerEnter={(e) => { if (e.pointerType === 'mouse') pick!.onPick(m.i!); }}
          onFocus={() => pick!.onPick(m.i!)}
          onClick={() => pick!.onPick(m.i!)}
          onKeyDown={(e) => key(e, k)}
        />
      ))}
    </div>
  );
}
