// Adapted from React Bits DodgeField (/home/claude/lab/rb/src/ts-default/Micro/DodgeField, MIT + Commons Clause): flee with falloff, spring return, patience and onRelent, remade as a pair of word-buttons that relent when the pointer goes still.
import { useCallback, useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform, type MotionValue } from 'motion/react';
import { scrollToId } from '@/lib/scroll';
import { still as reduced } from '@/lib/utils';

export type Word = { label: string; sub: string; target: string; name: string };

const COUNT_LINE = 0.55;
const DEAD_ZONE = 6;
const INSET = 10;
const STILL_MS = 1500;
const TOUCH_STILL_MS = 1600;
const PATIENCE = 4;
const RADIUS = 300;
const REACH = 230;
const FALLOFF = 2;
const FLEE = { type: 'spring' as const, duration: 0.34, bounce: 0 };
const HOME = { type: 'spring' as const, duration: 1.1, bounce: 0.22 };

type M = { x: MotionValue<number>; y: MotionValue<number>; bearing: { x: number; y: number }; room: { x: number; y: number }; armed: boolean; stepped: boolean; skip: boolean };

function Mover({ m, word, setRef, fieldRef, onTouch, onClick }: {
  m: M; word: Word;
  setRef: (el: HTMLDivElement | null) => void; fieldRef: (el: HTMLDivElement | null) => void;
  onTouch: (e: React.PointerEvent) => void; onClick: () => void;
}) {
  const rotate = useTransform(m.x, (v) => Math.max(-6, Math.min(6, v * 0.035)));
  return (
    <div className="hp-field" ref={fieldRef}>
      <motion.div className="hp-mover" ref={setRef} style={{ x: m.x, y: m.y, rotate }}>
        <button type="button" className="hp-word" onPointerDown={onTouch} onClick={onClick} aria-describedby={`hp-${word.name}`}>
          {word.label}
        </button>
        <p className="hp-sub" id={`hp-${word.name}`}>{word.sub}</p>
      </motion.div>
    </div>
  );
}

export default function HoldPair({ words, held, onHold }: { words: [Word, Word]; held: boolean; onHold: () => void }) {
  const a = { x: useMotionValue(0), y: useMotionValue(0) };
  const b = { x: useMotionValue(0), y: useMotionValue(0) };
  const ms = useRef<M[]>([
    { ...a, bearing: { x: 1, y: 0 }, room: { x: 0, y: 0 }, armed: true, stepped: false, skip: false },
    { ...b, bearing: { x: 1, y: 0 }, room: { x: 0, y: 0 }, armed: true, stepped: false, skip: false },
  ]);
  const fields = useRef<(HTMLDivElement | null)[]>([null, null]);
  const movers = useRef<(HTMLDivElement | null)[]>([null, null]);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const raf = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dodges = useRef(0);
  const [fine, setFine] = useState(true);
  const live = useRef({ held, onHold });
  live.current = { held: held || reduced, onHold };

  // Each word gets its own reserved field: measure how far it may travel inside it.
  useEffect(() => {
    const measure = () => ms.current.forEach((m, i) => {
      const f = fields.current[i], v = movers.current[i];
      if (!f || !v) return;
      m.room = { x: Math.max(0, (f.clientWidth - v.offsetWidth) / 2 - INSET), y: Math.max(0, (f.clientHeight - v.offsetHeight) / 2 - INSET) };
    });
    measure();
    const ro = new ResizeObserver(measure);
    [...fields.current, ...movers.current].forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
  }, []);

  const relent = useCallback(() => {
    if (live.current.held) return;
    live.current.held = true;
    live.current.onHold();
    ms.current.forEach((m) => { animate(m.x, 0, HOME); animate(m.y, 0, HOME); });
  }, []);

  const frame = useCallback(() => {
    raf.current = 0;
    const p = pointer.current;
    ms.current.forEach((m, i) => {
      const f = fields.current[i];
      if (!f) return;
      const H = live.current.held;
      const r = f.getBoundingClientRect();
      const dx = p ? p.x - (r.left + r.width / 2) : Infinity;
      const dy = p ? p.y - (r.top + r.height / 2) : Infinity;
      const d = Math.hypot(dx, dy);
      const inside = d <= RADIUS;
      if (!H) {
        if (d < RADIUS * COUNT_LINE) {
          if (m.armed) { m.armed = false; dodges.current += 1; if (dodges.current >= PATIENCE) relent(); }
        } else if (d > RADIUS) m.armed = true;
      }
      if (Number.isFinite(d) && d > DEAD_ZONE) m.bearing = { x: dx / d, y: dy / d };
      const flee = inside && !live.current.held ? (1 - d / RADIUS) ** FALLOFF : 0;
      const tx = Math.max(-m.room.x, Math.min(m.room.x, -m.bearing.x * flee * REACH));
      const ty = Math.max(-m.room.y, Math.min(m.room.y, -m.bearing.y * flee * REACH));
      const cfg = flee > 0 ? FLEE : HOME;
      if (Math.abs(m.x.get() - tx) > 0.5) animate(m.x, tx, cfg);
      if (Math.abs(m.y.get() - ty) > 0.5) animate(m.y, ty, cfg);
    });
  }, [relent]);

  useEffect(() => {
    const q = window.matchMedia('(hover: hover) and (pointer: fine)');
    setFine(q.matches);
    if (!q.matches || reduced || held) return undefined;
    const tick = () => { if (!raf.current) raf.current = requestAnimationFrame(frame); };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      pointer.current = { x: e.clientX, y: e.clientY };
      tick();
      // Stop reaching for a breath and the pair comes home, if you ever reached at all.
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const moved = ms.current.some((m) => Math.abs(m.x.get()) + Math.abs(m.y.get()) > 6);
        if (moved || dodges.current > 0) relent();
      }, STILL_MS);
    };
    const onLeave = () => { pointer.current = null; tick(); };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', tick, { passive: true, capture: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', tick, { capture: true });
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      cancelAnimationFrame(raf.current); raf.current = 0;
      clearTimeout(timer.current);
    };
  }, [frame, relent, held]);

  // Touch: a tap makes the word step aside once; a still finger, or a breath without touching, brings them home.
  useEffect(() => {
    if (fine || reduced || held) return undefined;
    const arm = () => {
      clearTimeout(timer.current);
      if (ms.current.some((m) => m.stepped)) timer.current = setTimeout(relent, TOUCH_STILL_MS);
    };
    window.addEventListener('touchstart', arm, { passive: true });
    window.addEventListener('touchmove', arm, { passive: true });
    return () => { window.removeEventListener('touchstart', arm); window.removeEventListener('touchmove', arm); clearTimeout(timer.current); };
  }, [fine, held, relent]);

  const touch = (i: number) => (e: React.PointerEvent) => {
    const m = ms.current[i];
    if (e.pointerType !== 'touch' || live.current.held || m.stepped) return;
    m.stepped = true; m.skip = true;
    const v = movers.current[i]!.getBoundingClientRect();
    const dx = e.clientX - (v.left + v.width / 2);
    const side = m.room.x >= m.room.y ? -(Math.sign(dx) || 1) : 0;
    animate(m.x, side * m.room.x, { type: 'spring', duration: 0.5, bounce: 0 });
    if (!side) animate(m.y, -(Math.sign(e.clientY - (v.top + v.height / 2)) || 1) * m.room.y, { type: 'spring', duration: 0.5, bounce: 0 });
    clearTimeout(timer.current);
    timer.current = setTimeout(relent, TOUCH_STILL_MS);
  };
  const click = (i: number) => () => {
    const m = ms.current[i];
    if (m.skip) { m.skip = false; return; }
    scrollToId(words[i].target);
  };

  return (
    <div className="hp" data-held={held || reduced ? '' : undefined}>
      {words.map((w, i) => (
        <Mover key={w.label} m={ms.current[i]} word={w}
          setRef={(el) => { movers.current[i] = el; }} fieldRef={(el) => { fields.current[i] = el; }}
          onTouch={touch(i)} onClick={click(i)} />
      ))}
    </div>
  );
}
