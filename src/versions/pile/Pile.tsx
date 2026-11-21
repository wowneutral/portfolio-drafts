// Adapted from fancy's Gravity (danielpetho/fancy, components/physics/gravity.tsx, MIT): a matter-js world of DOM bodies with walls, drag and throw, synced to transforms each frame.
// Changes: the bodies are his ten HONORS as heavy tags, dropped one by one with the two Champion tags last;
// the drag is our own pointer constraint started on a tag (so a touch anywhere else still scrolls the page);
// the world sleeps once the heap rests and stops ticking when the first screen is off screen.
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import Matter from 'matter-js';
import { HONORS } from '@/content';
import { still } from '@/lib/utils';

const { Engine, Bodies, Body, Composite, Constraint, Sleeping } = Matter;

type Honor = (typeof HONORS)[number];
const split = (what: string) => {
  const i = what.indexOf(', ');
  return i < 0 ? [what, ''] : [what.slice(0, i), what.slice(i + 2)];
};
const isChamp = (h: Honor) => h.what.startsWith('Champion');
// Dropped in this order: the eight others first, then Open, then Novice on the very top.
const ORDER = [2, 3, 4, 5, 6, 7, 8, 9, 1, 0];
// Fixed tilts for the still heap so it looks dropped, not typeset.
const TILT = [-3, 4, -2, 6, -5, 2, -4, 3, -1.5, 2.5];

export function Tag({ h, style }: { h: Honor; style?: React.CSSProperties }) {
  const [head, rest] = split(h.what);
  return (
    <div className={'pl-tag' + (isChamp(h) ? ' is-red' : '')} style={style}>
      <span className="pl-hole" />
      <span className="pl-tag-head">{head}</span>
      {rest && <span className="pl-tag-rest">{rest}</span>}
      <span className="pl-tag-det">{h.detail}</span>
    </div>
  );
}

export type PileRef = { drop: () => void };

type World = {
  engine: Matter.Engine;
  bodies: (Matter.Body | null)[];
  drag: { c: Matter.Constraint; id: number; i: number } | null;
  timers: number[];
  W: number;
  H: number;
};

export const Pile = forwardRef<PileRef>(function Pile(_, ref) {
  const box = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLDivElement | null)[]>([]);
  const world = useRef<World | null>(null);
  const visible = useRef(true);
  const [live, setLive] = useState(!still);

  const sync = useCallback(() => {
    const w = world.current;
    if (!w) return;
    w.bodies.forEach((b, i) => {
      const el = els.current[i];
      if (!el || !b) return;
      el.style.transform = `translate3d(${b.position.x - el.offsetWidth / 2}px, ${b.position.y - el.offsetHeight / 2}px, 0) rotate(${b.angle}rad)`;
    });
  }, []);

  const teardown = useCallback(() => {
    const w = world.current;
    if (!w) return;
    w.timers.forEach(clearTimeout);
    Composite.clear(w.engine.world, false);
    Engine.clear(w.engine);
    world.current = null;
  }, []);

  const build = useCallback(() => {
    teardown();
    const el = box.current;
    if (!el) return;
    const W = el.clientWidth, H = el.clientHeight;
    const engine = Engine.create({ enableSleeping: true });
    engine.gravity.y = 1;
    const T = 200;
    const wall = { isStatic: true, friction: 0.9, restitution: 0.05 };
    Composite.add(engine.world, [
      Bodies.rectangle(W / 2, H + T / 2, W + T * 2, T, wall), // floor
      Bodies.rectangle(-T / 2, H / 2 - H, T, H * 4, wall), // left
      Bodies.rectangle(W + T / 2, H / 2 - H, T, H * 4, wall), // right
      Bodies.rectangle(W / 2, -H * 2.5 - T / 2, W + T * 2, T, wall), // ceiling, far above the box
    ]);
    const w: World = { engine, bodies: HONORS.map(() => null), drag: null, timers: [], W, H };
    world.current = w;
    // Park every tag above the box (clipped) until it drops.
    els.current.forEach((t) => { if (t) t.style.transform = 'translate3d(0,-200vh,0)'; });
    const phone = W < 700;
    const gap = phone ? 210 : 240;
    ORDER.forEach((i, k) => {
      w.timers.push(window.setTimeout(() => {
        const t = els.current[i];
        if (!t || world.current !== w) return;
        const tw = t.offsetWidth, th = t.offsetHeight;
        const champ = isChamp(HONORS[i]);
        // Champions drop near the middle so they settle on top of the heap.
        const span = Math.max(0, W - tw - 24);
        const x = champ ? W / 2 + (i === 0 ? -1 : 1) * Math.min(W * 0.16, span / 2) * 0.6 : tw / 2 + 12 + Math.random() * span;
        const b = Bodies.rectangle(x, -th / 2 - 20, tw, th, {
          chamfer: { radius: Math.min(6, th / 6) },
          angle: (Math.random() - 0.5) * (champ ? 0.25 : 0.7),
          density: champ ? 0.004 : 0.003,
          friction: champ ? 0.8 : 0.55,
          frictionStatic: 0.9,
          frictionAir: 0.012,
          restitution: 0.14,
          sleepThreshold: 50,
        });
        Body.setVelocity(b, { x: (Math.random() - 0.5) * 2, y: phone ? 6 : 9 });
        Body.setAngularVelocity(b, (Math.random() - 0.5) * (champ ? 0.02 : 0.06));
        w.bodies[i] = b;
        Composite.add(engine.world, b);
      }, 260 + k * gap));
    });
  }, [teardown]);

  useImperativeHandle(ref, () => ({
    drop: () => { if (world.current) build(); },
  }), [build]);

  useEffect(() => {
    if (!live) return;
    let raf = 0, lastW = 0, rt = 0, alive = true;
    const start = () => {
      try { build(); lastW = box.current?.clientWidth ?? 0; } catch { setLive(false); }
    };
    (document.fonts?.ready ?? Promise.resolve()).then(() => { if (alive) start(); });
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const w = world.current;
      if (!w || !visible.current) return;
      Engine.update(w.engine, 1000 / 60);
      // Anything thrown out of the world comes back from the top.
      w.bodies.forEach((b) => {
        if (!b) return;
        if (b.position.y > w.H + 300 || b.position.x < -300 || b.position.x > w.W + 300) {
          Body.setPosition(b, { x: w.W / 2, y: -200 });
          Body.setVelocity(b, { x: 0, y: 0 });
        }
      });
      sync();
    };
    raf = requestAnimationFrame(tick);
    const io = new IntersectionObserver(([e]) => { visible.current = e.isIntersecting; }, { threshold: 0 });
    if (box.current) io.observe(box.current);
    const onResize = () => {
      clearTimeout(rt);
      rt = window.setTimeout(() => {
        const nw = box.current?.clientWidth ?? 0;
        if (Math.abs(nw - lastW) > 40) { lastW = nw; build(); }
      }, 350);
    };
    window.addEventListener('resize', onResize);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      clearTimeout(rt);
      io.disconnect();
      window.removeEventListener('resize', onResize);
      teardown();
    };
  }, [live, build, sync, teardown]);

  const local = (e: RPointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (i: number) => (e: RPointerEvent<HTMLDivElement>) => {
    const w = world.current, b = w?.bodies[i];
    if (!w || !b || w.drag) return;
    const p = local(e);
    Sleeping.set(b, false);
    const c = Constraint.create({
      pointA: p,
      bodyB: b,
      pointB: { x: p.x - b.position.x, y: p.y - b.position.y },
      stiffness: 0.2,
      damping: 0.08,
      length: 0,
    });
    Composite.add(w.engine.world, c);
    w.drag = { c, id: e.pointerId, i };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.classList.add('is-held');
  };
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    const d = world.current?.drag;
    if (!d || d.id !== e.pointerId) return;
    d.c.pointA = local(e);
    if (d.c.bodyB) Sleeping.set(d.c.bodyB, false);
  };
  const up = (e: RPointerEvent<HTMLDivElement>) => {
    const w = world.current, d = w?.drag;
    if (!w || !d || d.id !== e.pointerId) return;
    Composite.remove(w.engine.world, d.c);
    const b = d.c.bodyB!;
    const v = b.velocity, s = Math.hypot(v.x, v.y), max = 38;
    if (s > max) Body.setVelocity(b, { x: (v.x / s) * max, y: (v.y / s) * max });
    w.drag = null;
    e.currentTarget.classList.remove('is-held');
  };

  if (!live) {
    return (
      <div className="pl-box is-still" aria-hidden="true">
        <div className="pl-heap">
          {ORDER.map((i) => <Tag key={i} h={HONORS[i]} style={{ transform: `rotate(${TILT[i]}deg)` }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="pl-box" ref={box} aria-hidden="true">
      {HONORS.map((h, i) => (
        <div
          key={h.what}
          className="pl-body"
          ref={(n) => { els.current[i] = n; }}
          onPointerDown={down(i)}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onLostPointerCapture={up}
        >
          <Tag h={h} />
        </div>
      ))}
    </div>
  );
});
