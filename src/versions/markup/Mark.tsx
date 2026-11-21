// The pen. Wraps rough-notation's annotate() lifecycle (MIT, Preet Shihn): attach, draw once on show, redraw without animation on resize. React owns the svg here.
import { useEffect, useRef, type ReactNode } from 'react';
import { arrow, draw, newSeed, type Kind, type R } from './pen';
import { isPhone, still } from '@/lib/utils';

const PHONE: Partial<Record<Kind, Kind>> = { bracket: 'underline', tick: 'underline' };

/** Calls show() once when the element crosses into the reading area; calls redraw() on resize. */
function useArrival(el: React.RefObject<Element | null>, show: (animate: boolean) => void) {
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    let shown = false;
    let t = 0;
    const go = (animate: boolean) => { shown = true; show(animate); };
    let io: IntersectionObserver | null = null;
    if (still) requestAnimationFrame(() => go(false));
    else {
      io = new IntersectionObserver((es) => {
        if (es.some((e) => e.isIntersecting) && !shown) { go(true); io?.disconnect(); }
      }, { rootMargin: '0px 0px -22% 0px' });
      io.observe(node);
    }
    const again = () => { window.clearTimeout(t); t = window.setTimeout(() => { if (shown) show(false); }, 220); };
    const ro = new ResizeObserver(again);
    ro.observe(node);
    window.addEventListener('resize', again, { passive: true });
    document.fonts?.ready.then(again);
    return () => { io?.disconnect(); ro.disconnect(); window.removeEventListener('resize', again); window.clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function clear(svg: SVGSVGElement) { while (svg.lastChild) svg.removeChild(svg.lastChild); }

type MarkProps = {
  kind: Kind; children: ReactNode; delay?: number; duration?: number; pad?: number;
  /** Bump to have the pen mark it again. */
  redraw?: number; gutter?: number; thick?: number; className?: string;
};

export function Mark({ kind, children, delay = 0, duration, pad, redraw = 0, gutter = 30, thick, className }: MarkProps) {
  const wrap = useRef<HTMLSpanElement>(null);
  const target = useRef<HTMLSpanElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const seed = useRef(newSeed());
  const shown = useRef(false);

  const render = (animate: boolean, d = delay) => {
    const s = svg.current, t = target.current, w = wrap.current;
    if (!s || !t || !w) return;
    clear(s);
    const sb = s.getBoundingClientRect();
    const rects: R[] = Array.from(t.getClientRects()).filter((r) => r.width > 1).map((r) => ({ x: r.left - sb.left, y: r.top - sb.top, w: r.width, h: r.height }));
    if (!rects.length) return;
    const col = w.closest('[data-col]');
    const gx = col ? col.getBoundingClientRect().left - sb.left - gutter : rects[0].x - gutter;
    const k = isPhone() ? PHONE[kind] ?? kind : kind;
    draw(s, rects, k, { seed: seed.current, animate: animate && !still, delay: d, duration, pad, gx, thick });
    shown.current = true;
  };

  useArrival(wrap, (a) => render(a));
  useEffect(() => {
    if (redraw && shown.current) { seed.current = newSeed(); render(true, 0); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redraw]);

  return (
    <span ref={wrap} className={'mu-mk' + (kind === 'highlight' ? ' mu-mk-under' : '') + (className ? ' ' + className : '')}>
      <span ref={target}>{children}</span>
      <svg ref={svg} className="mu-pen" aria-hidden="true" focusable="false" />
    </span>
  );
}

/** The long arrow of the record: from the circled lines out into the margin (desktop), or a short arrow down (phone). */
export function PenArrow({ from, to, delay = 1700 }: { from: React.RefObject<HTMLElement | null>; to: React.RefObject<HTMLElement | null>; delay?: number }) {
  const svg = useRef<SVGSVGElement>(null);
  const seed = useRef(newSeed());
  const render = (animate: boolean) => {
    const s = svg.current, f = from.current, t = to.current;
    if (!s || !f || !t) return;
    clear(s);
    const sb = s.getBoundingClientRect();
    const a = f.getBoundingClientRect();
    const b = t.getBoundingClientRect();
    let pts: [number, number][];
    if (isPhone()) {
      const x = a.left - sb.left + 18;
      const y0 = a.bottom - sb.top + 14;
      const y1 = b.top - sb.top - 14;
      pts = [[x, y0], [x + 5, (y0 + y1) / 2], [x + 2, y1]];
    } else {
      const marks = Array.from(f.querySelectorAll('.mu-mk > span:first-child')).map((e) => e.getBoundingClientRect());
      const right = marks.length ? Math.max(...marks.map((m) => m.right)) : a.right;
      const top = marks.length ? Math.min(...marks.map((m) => m.top)) : a.top;
      const bot = marks.length ? Math.max(...marks.map((m) => m.bottom)) : a.bottom;
      const x0 = right - sb.left + 34;
      const y0 = (top + bot) / 2 - sb.top;
      const x1 = b.left - sb.left - 22;
      const y1 = b.top - sb.top + Math.min(44, b.height * 0.12);
      const dx = x1 - x0;
      const dy = y1 - y0;
      pts = [[x0, y0], [x0 + dx * 0.55, y0 + dy * 0.04], [x0 + dx * 0.78, y0 + dy * 0.6], [x1, y1]];
    }
    arrow(s, pts, { seed: seed.current, animate: animate && !still, delay: animate ? delay : 0 });
  };
  useArrival(from, render);
  return <svg ref={svg} className="mu-pen mu-arrow" aria-hidden="true" focusable="false" />;
}
