// Adapted from fancy's CSSBox (danielpetho/fancy, MIT): a pure CSS 3D box with real DOM faces,
// motion springs on rotation and drag to turn with spring-back. Here one box is one thin slab.
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react';
import { coarse, still } from '@/lib/utils';

type FaceProps = { transform: string; className: string; style?: React.CSSProperties; children?: ReactNode };
const Face = ({ transform, className, style, children }: FaceProps) => (
  <div className={'lx-face ' + className} style={{ transform, ...style }}>{children}</div>
);

/** One slab: front is the printed face, the edges carry its thickness. Width w, height h, thickness t. */
export function Slab({ w, h, t, front, edge, className = '' }: { w: number; h: number; t: number; front?: ReactNode; edge?: ReactNode; className?: string }) {
  return (
    <div className={'lx-slab ' + className} style={{ width: w, height: h }}>
      <Face className="lx-f-front" transform={`translateZ(${t / 2}px)`} style={{ width: w, height: h }}>{front}</Face>
      <Face className="lx-f-back" transform={`rotateY(180deg) translateZ(${t / 2}px)`} style={{ width: w, height: h }} />
      <Face className="lx-f-right" transform={`rotateY(90deg) translateZ(${w / 2}px)`} style={{ width: t, height: h, left: (w - t) / 2 }} />
      <Face className="lx-f-left" transform={`rotateY(-90deg) translateZ(${w / 2}px)`} style={{ width: t, height: h, left: (w - t) / 2 }} />
      <Face className="lx-f-top" transform={`rotateX(90deg) translateZ(${h / 2}px)`} style={{ width: w, height: t, top: (h - t) / 2 }} />
      <Face className="lx-f-bottom" transform={`rotateX(-90deg) translateZ(${h / 2}px)`} style={{ width: w, height: t, top: (h - t) / 2 }}>{edge}</Face>
    </div>
  );
}

/** fancy's drag-to-turn, kept: the pointer turns the group, release springs it back to the drawing angle. */
export function useTurn(rx: number, ry: number, enabled = !coarse && !still) {
  const bx = useMotionValue(0);
  const by = useMotionValue(0);
  const sx = useSpring(bx, { stiffness: 100, damping: 14, mass: 0.9 });
  const sy = useSpring(by, { stiffness: 100, damping: 14, mass: 0.9 });
  const dragging = useRef(false);
  const moved = useRef(false);
  const start = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!enabled || e.button !== 0) return;
    dragging.current = true;
    moved.current = false;
    start.current = { x: e.clientX, y: e.clientY };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const move = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) moved.current = true;
      bx.set(Math.max(-26, Math.min(26, -dy / 3)));
      by.set(Math.max(-55, Math.min(55, dx / 2.4)));
    };
    const end = () => { if (!dragging.current) return; dragging.current = false; bx.set(0); by.set(0); setTimeout(() => { moved.current = false; }, 0); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end); };
  }, [enabled, bx, by]);

  const transform = useTransform([sx, sy] as MotionValue<number>[], ([x, y]: number[]) => `rotateX(${rx + x}deg) rotateY(${ry + y}deg)`);
  const timer = useRef(0);
  /** Arrow keys turn it too, then it springs back. */
  const nudge = useCallback((dx: number, dy: number) => {
    if (still) return;
    bx.set(dy); by.set(dx);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { bx.set(0); by.set(0); }, 650);
  }, [bx, by]);
  /** True right after a drag, so the release does not also count as a click. */
  const wasDrag = () => moved.current;
  return { transform, onPointerDown, wasDrag, enabled, nudge };
}
