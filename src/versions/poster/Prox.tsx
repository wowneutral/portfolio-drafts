// Remixed from fancy (danielpetho/fancy, MIT): components/text/variable-font-cursor-proximity.tsx. Same per-letter font-variation interpolation by distance, with a gaussian falloff, a damped follow and touch.
import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { still } from '@/lib/utils';

export type Axes = { wght: number; wdth: number };

/** One poster row: letters as inline-block spans, word boxes kept whole. The row is aria-hidden; the readable text sits beside it. */
export function Row({ text, className, cap }: { text: string; className?: string; cap: number }) {
  const words = text.split(' ');
  return (
    <span className={'po-row ' + (className ?? '')} data-cap={cap} aria-hidden="true">
      <span className="po-in">
        {words.map((w, i) => (
          <span className="po-word" key={i}>
            {w.split('').map((ch, j) => <span className="po-l" key={j}>{ch}</span>)}
            {i < words.length - 1 && <span className="po-l po-sp">{' '}</span>}
          </span>
        ))}
      </span>
    </span>
  );
}

const fine = () => typeof matchMedia !== 'undefined' && matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Rest and peak axes: light and narrow at rest under a mouse, a confident middle weight on touch and with reduced motion. */
function axes(): { REST: Axes; PEAK: Axes } {
  const mid = { wght: 560, wdth: 90 };
  if (still) return { REST: mid, PEAK: mid };
  return fine() ? { REST: { wght: 360, wdth: 80 }, PEAK: { wght: 900, wdth: 125 } } : { REST: mid, PEAK: { wght: 840, wdth: 108 } };
}

/**
 * Drives every .po-l inside `area`. Rest and peak axes come from the device: light and narrow at rest under a mouse,
 * a confident middle weight on touch. Rows are fitted to their width, measured with room for the widening.
 */
export function useProximity(area: RefObject<HTMLElement | null>, deps: unknown[]) {
  const pointer = useRef({ x: -1e5, y: -1e5, real: false, seen: 0 });

  // Fit each row: font size so that the row at rest, plus the widening the radius can cause, fits its box.
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    let raf = 0;
    const { REST, PEAK } = axes();
    el.style.setProperty('--w0', String(REST.wght));
    el.style.setProperty('--d0', String(REST.wdth));
    el.style.setProperty('--w1', String(PEAK.wght));
    el.style.setProperty('--d1', String(PEAK.wdth));
    const fit = () => {
      const rows = [...el.querySelectorAll<HTMLElement>('.po-row')];
      const vh = innerHeight;
      // measure at 100px, once at rest and once with every letter at its peak
      rows.forEach((r) => { r.style.fontSize = '100px'; });
      el.classList.add('po-measure-rest');
      const rest = rows.map((r) => (r.firstElementChild as HTMLElement).offsetWidth);
      el.classList.remove('po-measure-rest');
      el.classList.add('po-measure-peak');
      const peak = rows.map((r) => (r.firstElementChild as HTMLElement).offsetWidth);
      el.classList.remove('po-measure-peak');
      rows.forEach((r, i) => {
        const box = r.getBoundingClientRect().width;
        const cap = (+(r.dataset.cap ?? 10) / 100) * vh;
        // Fit at rest with a little room; the guard in the loop absorbs the rest of the widening.
        const s = box / (rest[i] + 0.1 * (peak[i] - rest[i]));
        r.style.fontSize = Math.max(18, Math.min(cap, s * 100 * 0.995)) + 'px';
      });
    };
    const run = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); };
    fit();
    document.fonts?.ready.then(run);
    const ro = new ResizeObserver(run);
    ro.observe(el);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    const el = area.current;
    if (!el || still) return;
    const p = pointer.current;
    const { REST, PEAK } = axes();

    const onMove = (e: MouseEvent) => { p.x = e.clientX; p.y = e.clientY; p.real = true; };
    const onTouch = (e: TouchEvent) => { const t = e.touches[0]; if (t) { p.x = t.clientX; p.y = t.clientY; p.real = true; } };
    const onEnd = () => { p.x = -1e5; p.y = -1e5; p.real = true; };
    addEventListener('mousemove', onMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onEnd);
    addEventListener('touchstart', onTouch, { passive: true });
    addEventListener('touchmove', onTouch, { passive: true });
    addEventListener('touchend', onEnd, { passive: true });
    addEventListener('touchcancel', onEnd, { passive: true });

    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(el);

    const letters = [...el.querySelectorAll<HTMLElement>('.po-l')];
    // A guard so a widening row never runs past its box: it shrinks a touch, as one piece, instead.
    const rows = [...el.querySelectorAll<HTMLElement>('.po-row')].map((r) => ({ r, inner: r.firstElementChild as HTMLElement, s: 1 }));
    const t = new Float32Array(letters.length);
    const shown = new Float32Array(letters.length).fill(-1);
    const cx = new Float32Array(letters.length), cy = new Float32Array(letters.length);
    const start = performance.now();
    let last = start, raf = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!visible) return;
      const box = el.getBoundingClientRect();
      // The authored opening: until the visitor moves, a pointer glides in and rests on the first Champion.
      let px = p.x, py = p.y;
      if (!p.real) {
        const first = el.querySelector<HTMLElement>('.po-champ .po-in');
        if (first) {
          const fr = first.getBoundingClientRect();
          const u = Math.min(1, (now - start) / 1700), e = 1 - Math.pow(1 - u, 3);
          px = fr.left + fr.width * (-0.2 + 0.78 * e);
          py = fr.top + fr.height * (0.3 + 0.62 * e);
        }
      }
      const inside = px >= box.left && px <= box.right && py >= box.top && py <= box.bottom;
      const R = radiusFor(innerWidth), s2 = 2 * Math.pow(R / 2, 2);
      let busy = inside;
      for (let i = 0; i < letters.length; i++) if (Math.abs(t[i]) > 0.002) { busy = true; break; }
      if (!busy) return;
      for (let i = 0; i < letters.length; i++) {
        const r = letters[i].getBoundingClientRect();
        cx[i] = r.left + r.width / 2; cy[i] = r.top + r.height / 2;
      }
      for (const row of rows) {
        const want = Math.min(1, row.r.clientWidth / Math.max(1, row.inner.offsetWidth));
        if (Math.abs(want - row.s) < 0.002) continue;
        row.s = want < row.s ? want : row.s + (want - row.s) * 0.2;
        row.inner.style.transform = row.s > 0.999 ? '' : `scale(${row.s.toFixed(4)})`;
      }
      const k = 1 - Math.exp(-dt * (inside ? 10 : 4.5));
      for (let i = 0; i < letters.length; i++) {
        let target = 0;
        if (inside) {
          const dx = px - cx[i], dy = (py - cy[i]) * 1.15, d2 = dx * dx + dy * dy;
          target = d2 > R * R * 4 ? 0 : Math.exp(-d2 / s2);
        }
        t[i] += (target - t[i]) * k;
        if (Math.abs(t[i] - shown[i]) < 0.004) continue;
        shown[i] = t[i];
        const w = REST.wght + (PEAK.wght - REST.wght) * t[i];
        const d = REST.wdth + (PEAK.wdth - REST.wdth) * t[i];
        letters[i].style.fontVariationSettings = `'wght' ${w.toFixed(0)}, 'wdth' ${d.toFixed(1)}`;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf); io.disconnect();
      removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onEnd);
      removeEventListener('touchstart', onTouch);
      removeEventListener('touchmove', onTouch);
      removeEventListener('touchend', onEnd);
      removeEventListener('touchcancel', onEnd);
      letters.forEach((l) => { l.style.fontVariationSettings = ''; });
      rows.forEach((row) => { row.inner.style.transform = ''; });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** The reach of the pointer, in pixels. */
export function radiusFor(w: number) { return Math.max(100, Math.min(230, w * 0.135)); }
