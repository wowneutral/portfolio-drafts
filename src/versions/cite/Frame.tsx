// Remixed from React Bits TrueFocus (MIT + Commons Clause, /home/claude/lab/rb/src/ts-default/TextAnimations/TrueFocus): its four corner brackets and spring, manual mode, blur 0.
import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import { motion, useReducedMotion, type Transition } from 'motion/react';

type Pt = { x: number; y: number };
type Box = { tl: Pt; tr: Pt; bl: Pt; br: Pt; cs: number; bw: number };
type Corner = 'tl' | 'tr' | 'bl' | 'br';
const CORNERS: Corner[] = ['tl', 'tr', 'bl', 'br'];

/**
 * Where the four corners go for one target. A part that wraps over lines gets its
 * opening corners on the first line fragment and its closing corners on the last,
 * so the brackets mark where the part starts and ends and never sit on a letter.
 */
function measure(el: HTMLElement, host: HTMLElement): Box | null {
  const c = host.getBoundingClientRect();
  const rs = Array.from(el.getClientRects()).filter((r) => r.width > 0.5 && r.height > 0.5);
  if (!rs.length) return null;
  const fs = parseFloat(getComputedStyle(el).fontSize) || 16;
  const gx = Math.max(6, fs * 0.19);
  const gy = Math.max(3, fs * 0.02);
  const cs = Math.min(24, Math.max(9, fs * 0.3));
  const bw = fs > 34 ? 3 : 2;
  const top0 = rs[0].top, topN = rs[rs.length - 1].top;
  const first = rs.filter((r) => Math.abs(r.top - top0) < 3);
  const last = rs.filter((r) => Math.abs(r.top - topN) < 3);
  // Trim the font's empty ascender space so the brackets hug the letters.
  const t = (r: DOMRect) => r.top - c.top + r.height * 0.1;
  const b = (r: DOMRect) => r.bottom - c.top - r.height * 0.04;
  const fl = Math.min(...first.map((r) => r.left)) - c.left;
  const fr = Math.max(...first.map((r) => r.right)) - c.left;
  const ll = Math.min(...last.map((r) => r.left)) - c.left;
  const lr = Math.max(...last.map((r) => r.right)) - c.left;
  const ft = t(first[0]);
  const lb = b(last[0]);
  return {
    tl: { x: fl - gx, y: ft - gy },
    tr: { x: fr + gx - cs, y: ft - gy },
    bl: { x: ll - gx, y: lb + gy - cs },
    br: { x: lr + gx - cs, y: lb + gy - cs },
    cs, bw,
  };
}

/** The corner brackets. `host` is the positioned box they live in; `target` the element they frame. */
export function Frame({ host, target }: { host: RefObject<HTMLElement | null>; target: HTMLElement | null }) {
  const [box, setBox] = useState<Box | null>(null);
  const reduce = useReducedMotion();
  const read = useCallback(() => {
    if (!host.current || !target) return setBox(null);
    setBox(measure(target, host.current));
  }, [host, target]);

  useLayoutEffect(read, [read]);
  useEffect(() => {
    const h = host.current;
    if (!h || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(h);
    document.fonts?.ready.then(read);
    window.addEventListener('resize', read);
    return () => { ro.disconnect(); window.removeEventListener('resize', read); };
  }, [host, read]);

  if (!box) return null;
  // TrueFocus's own spring: easing 'spring', bounce 0.38. Reduced motion: the frame jumps.
  const transition: Transition = reduce ? { duration: 0 } : { type: 'spring', visualDuration: 0.5, bounce: 0.38 };
  return (
    <span className="frame" aria-hidden="true">
      {CORNERS.map((k) => (
        <motion.span
          key={k}
          className={`corner corner-${k}`}
          style={{ width: box.cs, height: box.cs, borderWidth: box.bw }}
          initial={{ x: box[k].x, y: box[k].y, opacity: 0 }}
          animate={{ x: box[k].x, y: box[k].y, opacity: 1 }}
          transition={transition}
        />
      ))}
    </span>
  );
}
