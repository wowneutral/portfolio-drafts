// Remixed from fancy's DragElements (github.com/danielpetho/fancy, MIT): motion drag with elastic constraints, momentum and bring-to-front.
import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useSpring, useTransform, useVelocity, type PanInfo } from 'motion/react';
import { AWARDS, WORK } from '@/content';
import { still } from '@/lib/utils';
import { scrollToId } from '@/lib/scroll';

type P = { id: string; name: string; img: string; ratio: number; cert?: boolean };
const RATIO: Record<string, number> = { mitez: 660, skeptical: 660, lastseen: 670, lastsearch: 692, spread: 660, rogue: 662, jarvis: 852, drafts: 766 };
export const PRINTS: P[] = [
  ...WORK.map((w) => ({ id: 'work-' + w.slug, name: w.name, img: w.img, ratio: RATIO[w.slug] / 1200 })),
  ...AWARDS.map((a, i) => ({ id: 'award-' + i, name: a.site, img: a.img, ratio: 1018 / 720, cert: true })),
];
// Order of PRINTS: mitez, skeptical, lastseen, lastsearch, spread, rogue, jarvis, drafts, cert A Living World, cert Make It Easy.
type Spot = [left: number, top: number, rot: number];
const WIDE: Spot[] = [
  [37, 9, -2.5], [1.5, 6, -4], [57, 2.5, 3.5], [77.8, 57, 4], [4, 56, 2.5],
  [24, 61, -5], [42.5, 51, 2], [77.5, 7, -3], [21, 1, 3], [61, 42, -3.5],
];
const WIDE_NEAT: Spot[] = [
  [0, 3, 0], [20.4, 3, 0], [40.8, 3, 0], [61.2, 3, 0], [0, 54, 0],
  [20.4, 54, 0], [40.8, 54, 0], [61.2, 54, 0], [82.5, 2, 0], [82.5, 51, 0],
];
// Phone: five scattered (Skeptical, MITEZ, the drafts, both certificates), five squared in one stack.
const STACK: Spot = [50, 77.5, 0];
const s = (k: number): Spot => [STACK[0] - k * 0.7, STACK[1] - k * 0.5, still ? 0 : (k % 2 ? 1.2 : -1) * (4 - k) * 0.5];
const NARROW: Spot[] = [
  [4, 27, 3], [0, 1, -4], s(0), s(1), s(2),
  s(3), s(4), [0, 53, 2], [58, 0, 3], [58, 39, -3],
];
const NARROW_NEAT: Spot[] = [
  [0, 27, 0], [0, 1, 0], s(0), s(1), s(2),
  s(3), s(4), [0, 53, 0], [56, 1, 0], [56, 39, 0],
];
const narrowMq = () => window.matchMedia('(max-width: 700px)').matches;

export type DeskRef = { reset: () => void };

export const Desk = forwardRef<DeskRef>(function Desk(_, ref) {
  const field = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLElement | null)[]>([]);
  const [narrow, setNarrow] = useState(narrowMq);
  const [order, setOrder] = useState<number[]>(() => PRINTS.map((_, i) => i));
  const [covered, setCovered] = useState<boolean[]>(() => PRINTS.map(() => false));
  const [resetKey, setResetKey] = useState(0);
  const orderRef = useRef(order);
  orderRef.current = order;
  const spots = narrow ? (still ? NARROW_NEAT : NARROW) : still ? WIDE_NEAT : WIDE;

  // A caption is hidden while any print above it lies across its text.
  const recheck = useCallback(() => {
    const ord = orderRef.current;
    const next = PRINTS.map((_, i) => {
      const cap = els.current[i]?.querySelector('.dk-cap-t');
      if (!cap) return false;
      const c = cap.getBoundingClientRect();
      return ord.slice(ord.indexOf(i) + 1).some((j) => {
        const r = els.current[j]?.getBoundingClientRect();
        return !!r && r.left < c.right - 2 && r.right > c.left + 2 && r.top < c.bottom - 2 && r.bottom > c.top + 2;
      });
    });
    setCovered((prev) => (prev.every((v, i) => v === next[i]) ? prev : next));
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 700px)');
    const on = () => { setNarrow(mq.matches); setOrder(PRINTS.map((_, i) => i)); setResetKey((k) => k + 1); };
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  useEffect(() => {
    const t = [setTimeout(recheck, still ? 300 : 1900), setTimeout(recheck, 3200)];
    window.addEventListener('resize', recheck);
    return () => { t.forEach(clearTimeout); window.removeEventListener('resize', recheck); };
  }, [recheck, narrow, resetKey, order]);

  const front = useCallback((i: number) => {
    setOrder((prev) => (prev[prev.length - 1] === i ? prev : [...prev.filter((k) => k !== i), i]));
  }, []);

  useImperativeHandle(ref, () => ({
    reset: () => { setOrder(PRINTS.map((_, i) => i)); setResetKey((k) => k + 1); },
  }), []);

  return (
    <div ref={field} className="dk-field" data-narrow={narrow ? '' : undefined}>
      <ul className="dk-prints" aria-label="Prints on the desk">
        {PRINTS.map((p, i) => (
          <Print
            key={p.id}
            p={p}
            i={i}
            spot={spots[i]}
            z={order.indexOf(i) + 1}
            covered={covered[i]}
            field={field}
            resetKey={resetKey}
            setEl={(el) => { els.current[i] = el; }}
            onFront={() => front(i)}
            onSettle={() => setTimeout(recheck, 60)}
          />
        ))}
      </ul>
    </div>
  );
});

type PrintProps = {
  p: P; i: number; spot: Spot; z: number; covered: boolean; field: React.RefObject<HTMLDivElement | null>; resetKey: number;
  setEl: (el: HTMLElement | null) => void; onFront: () => void; onSettle: () => void;
};

function Print({ p, i, spot, z, covered, field, resetKey, setEl, onFront, onSettle }: PrintProps) {
  const me = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const tilt = useMotionValue(spot[2]);
  // The swing: horizontal speed leans the print (and its caption) like a sheet pulled by one corner.
  const vx = useVelocity(x);
  const lean = useTransform(vx, [-1000, 0, 1000], [-10, 0, 10], { clamp: true });
  const swing = useSpring(lean, { stiffness: 170, damping: 13, mass: 1 });
  const rotate = useTransform(() => tilt.get() + (still ? 0 : swing.get()));
  const [lifted, setLifted] = useState(false);

  // The opening: all ten start squared in one pile at the middle of the desk and are dealt out to their places.
  useLayoutEffect(() => {
    // The list fills the field; on mount the field ref is not attached yet, so measure the list instead.
    const li = me.current?.parentElement;
    const f = li?.parentElement;
    if (still || !li || !f) {
      x.set(0); y.set(0); tilt.set(spot[2]);
      return;
    }
    x.set(f.clientWidth / 2 - (li.offsetLeft + li.offsetWidth / 2));
    y.set(f.clientHeight * 0.46 - (li.offsetTop + li.offsetHeight / 2));
    tilt.set((i % 3) - 1);
    const o = { type: 'spring' as const, stiffness: 70, damping: 14, mass: 1.1 };
    const t = setTimeout(() => {
      animate(x, 0, o); animate(y, 0, o); animate(tilt, spot[2], { ...o, stiffness: 60 });
    }, 150 + (PRINTS.length - 1 - i) * 55);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, spot[0], spot[1], spot[2]]);

  const settle = () => {
    // Put down: the print squares itself, so its caption lies flat.
    animate(tilt, 0, still ? { duration: 0 } : { type: 'spring', stiffness: 170, damping: 15 });
    onSettle();
  };
  const open = () => scrollToId(p.id, -32);

  const nudge = (dx: number, dy: number) => {
    const f = field.current?.getBoundingClientRect();
    const r = me.current?.getBoundingClientRect();
    if (!f || !r) return;
    const cx = Math.max(f.left - r.left, Math.min(f.right - r.right, dx));
    const cy = Math.max(f.top - r.top, Math.min(f.bottom - r.bottom, dy));
    const o = still ? { duration: 0 } : { type: 'spring' as const, stiffness: 320, damping: 26 };
    animate(x, x.get() + cx, o); animate(y, y.get() + cy, o);
    onFront(); settle();
  };
  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 72 : 24;
    const m: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const d = m[e.key];
    if (!d) return;
    e.preventDefault();
    nudge(d[0], d[1]);
  };

  return (
    <li className="dk-slot" style={{ left: spot[0] + '%', top: spot[1] + '%', zIndex: z }}>
      <motion.button
        ref={(el) => { me.current = el; setEl(el); }}
        type="button"
        aria-label={'Open ' + p.name + (p.cert ? ', WD Awards certificate' : '')}
        className={'dk-print' + (p.cert ? ' is-cert' : '')}
        data-lifted={lifted ? '' : undefined}
        data-covered={covered ? '' : undefined}
        style={{ x, y, rotate }}
        drag
        dragConstraints={field}
        dragElastic={0.16}
        dragMomentum={!still}
        dragTransition={{ bounceStiffness: 200, bounceDamping: 30, power: 0.32, timeConstant: 320 }}
        dragPropagation={false}
        whileDrag={still ? undefined : { scale: 1.035 }}
        onPointerDown={onFront}
        onDragStart={() => { onFront(); setLifted(true); }}
        onDragEnd={(_e: PointerEvent, _i: PanInfo) => { setLifted(false); settle(); }}
        onDragTransitionEnd={onSettle}
        onTap={(e: PointerEvent) => { if (e.pointerType === 'touch' || e.pointerType === 'pen') open(); }}
        onDoubleClick={open}
        onClick={(e) => { if (e.detail === 0) open(); }}
        onKeyDown={onKey}
      >
        <img src={import.meta.env.BASE_URL + p.img} alt="" draggable={false} style={{ aspectRatio: String(1 / p.ratio) }} />
        <span className="dk-cap"><span className="dk-cap-t">{p.name}</span></span>
      </motion.button>
    </li>
  );
}
