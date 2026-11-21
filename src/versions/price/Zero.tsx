// Adapted from React Bits ScrubField (MIT + Commons Clause), /home/claude/lab/rb/src/ts-default/Micro/ScrubField.
// Kept: drag-to-scrub with sensitivity, the log rubber band past the limits, the springy return,
// keyboard stepping, the label. Changed: min and max are both 0, so every scrub is pure rubber;
// the drag is vertical; the figure is display size; the delta, dirty and fill chips are gone.
import { useEffect, useId, useRef } from 'react';
import { animate, useMotionValue, useMotionValueEvent, type AnimationPlaybackControls } from 'motion/react';
import { still } from '@/lib/utils';

const REACH = 9; // rubber reach, in figure units (the base used a share of max - min; here that span is 0)
const SENS = 5; // px of drag per unit (the base's sensitivity)
const CAP = 99;
const RETURN = { type: 'spring' as const, duration: 0.62, bounce: 0.42 };

const bend = (raw: number) => Math.sign(raw) * REACH * Math.log1p(Math.abs(raw) / REACH);
const unbend = (over: number) => Math.sign(over) * REACH * Math.expm1(Math.abs(over) / REACH);

type Props = { label: string; note?: string; className?: string };

export default function Zero({ label, note, className = '' }: Props) {
  const id = useId();
  const display = useMotionValue(0);
  const fieldRef = useRef<HTMLDivElement>(null);
  const figRef = useRef<HTMLSpanElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const handleRef = useRef<HTMLSpanElement>(null);
  const drag = useRef<{ id: number; y: number; raw: number; moved: boolean } | null>(null);
  const keyRaw = useRef(0);
  const timer = useRef<number>(0);
  const anim = useRef<AnimationPlaybackControls | null>(null);
  const reduce = still;

  const paint = (d: number) => {
    const n = Math.max(0, Math.min(CAP, Math.round(d)));
    if (numRef.current && numRef.current.textContent !== String(n)) numRef.current.textContent = String(n);
    if (fieldRef.current) fieldRef.current.dataset.over = n > 0 ? 'true' : 'false';
    if (reduce || !figRef.current) return;
    // Up: taller and thinner (volume kept, like rubber). Below 0 on the overshoot: squat.
    const sy = d >= 0 ? 1 + 0.46 * (1 - Math.exp(-d / 11)) : Math.max(0.82, 1 + d / 30);
    const sx = 1 / Math.sqrt(sy);
    figRef.current.style.transform = `scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
    if (handleRef.current) {
      const h = figRef.current.offsetHeight;
      const lift = (sy - 1) * h;
      handleRef.current.style.transform = `translateY(${(-lift).toFixed(1)}px)`;
    }
  };
  useMotionValueEvent(display, 'change', paint);

  const release = () => {
    anim.current?.stop();
    if (reduce) { display.jump(0); paint(0); return; }
    anim.current = animate(display, 0, RETURN);
  };

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current || e.button !== 0) return;
    if (e.pointerType !== 'touch') e.preventDefault();
    anim.current?.stop();
    window.clearTimeout(timer.current);
    drag.current = { id: e.pointerId, y: e.clientY, raw: unbend(display.get()), moved: false };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* fine */ }
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = drag.current;
    if (!g || e.pointerId !== g.id) return;
    if (!g.moved) {
      if (Math.abs(e.clientY - g.y) < 3) return;
      g.moved = true;
      fieldRef.current?.setAttribute('data-dragging', 'true');
      document.documentElement.style.cursor = 'ns-resize';
    }
    const raw = g.raw + (g.y - e.clientY) / SENS;
    display.set(bend(raw));
  };
  const end = () => {
    if (!drag.current) return;
    drag.current = null;
    fieldRef.current?.setAttribute('data-dragging', 'false');
    document.documentElement.style.cursor = '';
    release();
  };

  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = { ArrowUp: 6, ArrowRight: 6, PageUp: 24, End: 60, ArrowDown: -3, ArrowLeft: -3, PageDown: -6, Home: 0 };
    const s = step[e.key];
    if (s === undefined) return;
    e.preventDefault();
    window.clearTimeout(timer.current);
    anim.current?.stop();
    keyRaw.current = s === 0 ? 0 : keyRaw.current + s * (e.shiftKey ? 4 : 1);
    const target = bend(keyRaw.current);
    if (reduce) display.jump(target);
    else anim.current = animate(display, target, { type: 'spring', duration: 0.25, bounce: 0 });
    timer.current = window.setTimeout(() => { keyRaw.current = 0; release(); }, reduce ? 420 : 300);
  };

  useEffect(() => () => { window.clearTimeout(timer.current); anim.current?.stop(); document.documentElement.style.cursor = ''; }, []);

  return (
    <div className={`pz ${className}`}>
      <div
        ref={fieldRef}
        className="pz-field"
        role="slider"
        tabIndex={0}
        aria-labelledby={id}
        aria-valuenow={0}
        aria-valuemin={0}
        aria-valuemax={0}
        aria-valuetext="0, free"
        data-dragging="false"
        data-over="false"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        onKeyDown={onKey}
      >
        <span ref={handleRef} className="pz-handle" aria-hidden="true" />
        <span ref={figRef} className="pz-fig" aria-hidden="true"><span ref={numRef}>0</span></span>
      </div>
      <p className="pz-label" id={id}>{label}</p>
      {note && <p className="pz-note">{note}</p>}
    </div>
  );
}
