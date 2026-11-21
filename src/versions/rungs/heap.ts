// Physics adapted from React Bits FallingText (DavidHDev/react-bits, MIT + Commons Clause): its matter-js world of DOM bodies, walls, mouse-constraint dragging, cursor push and sleeping, with restore removed so the heap stays.
import Matter from 'matter-js';

const STEP = 1000 / 120;
const WALL = 400;

export type Start = { cx: number; cy: number; a: number; tx?: number };

type Piece = { el: HTMLElement; body: Matter.Body; w: number; h: number; px: number; py: number; pa: number; at: number; released: boolean; pushed?: number; tx?: number };

const put = (el: HTMLElement, w: number, h: number, cx: number, cy: number, a: number) => {
  el.style.transform = `translate3d(${(cx - w / 2).toFixed(2)}px, ${(cy - h / 2).toFixed(2)}px, 0) rotate(${a.toFixed(4)}rad)`;
};

/** A composed still heap for reduced motion: pieces lie along the floor in layers, nearly level. */
export function rest(stage: HTMLElement, els: HTMLElement[]) {
  const W = stage.clientWidth;
  const H = stage.clientHeight;
  const gap = Math.max(10, W * 0.012);
  let floor = H;
  let x = gap * 2;
  let layerTop = H;
  const order = els.map((el, i) => ({ el, i, w: el.offsetWidth, h: el.offsetHeight })).sort((p, q) => Math.max(q.w, q.h) - Math.max(p.w, p.h));
  order.forEach((p, k) => {
    const tall = p.h > p.w;
    const vw = tall ? p.h : p.w;
    const vh = tall ? p.w : p.h;
    if (x + vw > W - gap) {
      floor = layerTop + vh * 0.12;
      x = gap * 2 + (k % 2) * gap * 3;
    }
    const tilt = tall ? (k % 2 ? 1 : -1) * (Math.PI / 2 - 0.012) : (k % 2 ? 1 : -1) * 0.028;
    const cy = floor - vh / 2 - 1;
    put(p.el, p.w, p.h, x + vw / 2, cy, tilt);
    layerTop = Math.min(layerTop, cy - vh / 2);
    x += vw + gap;
  });
}

/** Drops DOM pieces under gravity inside `stage`. Each piece starts at `start(i, w, h)`. Returns a cleanup. */
export function drop(stage: HTMLElement, els: HTMLElement[], start: (i: number, w: number, h: number) => Start, o: { stagger?: number; scatter?: number } = {}) {
  const engine = Matter.Engine.create({ enableSleeping: true, positionIterations: 10, velocityIterations: 8 });
  engine.gravity.y = 1.4;
  const W = () => stage.clientWidth;
  const H = () => stage.clientHeight;
  const walls = [
    Matter.Bodies.rectangle(0, 0, 10000, WALL, { isStatic: true, friction: 0.8 }),
    Matter.Bodies.rectangle(0, 0, WALL, 10000, { isStatic: true, friction: 0.3 }),
    Matter.Bodies.rectangle(0, 0, WALL, 10000, { isStatic: true, friction: 0.3 }),
    Matter.Bodies.rectangle(0, 0, 10000, WALL, { isStatic: true, friction: 0.3 }),
  ];
  const placeWalls = () => {
    const [floor, left, right, ceiling] = walls;
    Matter.Body.setPosition(floor, { x: W() / 2, y: H() + WALL / 2 });
    Matter.Body.setPosition(left, { x: -WALL / 2, y: H() / 2 });
    Matter.Body.setPosition(right, { x: W() + WALL / 2, y: H() / 2 });
    Matter.Body.setPosition(ceiling, { x: W() / 2, y: -1600 - WALL / 2 });
  };
  const pieces: Piece[] = els.map((el, i) => {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const s = start(i, w, h);
    const body = Matter.Bodies.rectangle(s.cx, s.cy, Math.max(2, w - 1), Math.max(2, h - 1), {
      chamfer: { radius: Math.min(3, w / 2 - 1, h / 2 - 1) },
      restitution: 0.12,
      friction: 0.5,
      frictionStatic: 0.9,
      frictionAir: 0.014,
      density: 0.0016,
      slop: 0.02,
      angle: s.a,
    });
    Matter.Body.setStatic(body, true);
    put(el, w, h, s.cx, s.cy, s.a);
    return { el, body, w, h, px: s.cx, py: s.cy, pa: s.a, at: i * (o.stagger ?? 0.04), released: false, tx: s.tx };
  });
  Matter.Composite.add(engine.world, [...walls, ...pieces.map((p) => p.body)]);
  placeWalls();

  let raf = 0;
  let last = 0;
  let clock = 0;
  let acc = 0;
  let visible = true;
  let drag: { c: Matter.Constraint; id: number } | null = null;
  const ptr = { x: 0, y: 0, vx: 0, vy: 0, t: 0 };

  const release = (p: Piece) => {
    p.released = true;
    Matter.Body.setStatic(p.body, false);
    Matter.Sleeping.set(p.body, false);
    const k = o.scatter ?? 0.5;
    const tall = p.h > p.w * 2;
    // A piece with a target x is thrown toward it, so the heap spreads along the floor instead of piling up.
    const b = p.body.position;
    const t = Math.sqrt((2 * Math.max(60, H() - b.y - p.h / 2)) / 0.0014);
    const vx = p.tx === undefined ? (Math.random() - 0.5) * 5 * k : ((p.tx - b.x) / t) * 16.67 * 1.15 + (Math.random() - 0.5) * 1.2;
    Matter.Body.setVelocity(p.body, { x: vx, y: -Math.random() * 2 * k });
    Matter.Body.setAngularVelocity(p.body, (tall ? (p.body.position.x < W() / 2 ? 1 : -1) * 0.035 : 0) + (Math.random() - 0.5) * 0.08 * k);
  };

  const frame = (now: number) => {
    raf = 0;
    if (!visible) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60);
    last = now;
    clock += dt;
    for (const p of pieces) if (!p.released && clock >= p.at) release(p);
    acc += dt * 1000;
    while (acc >= STEP) {
      for (const p of pieces) { p.px = p.body.position.x; p.py = p.body.position.y; p.pa = p.body.angle; }
      Matter.Engine.update(engine, STEP);
      acc -= STEP;
    }
    const al = acc / STEP;
    for (const p of pieces) {
      const b = p.body;
      put(p.el, p.w, p.h, p.px + (b.position.x - p.px) * al, p.py + (b.position.y - p.py) * al, p.pa + (b.angle - p.pa) * al);
    }
    const asleep = pieces.every((p) => p.released && p.body.isSleeping);
    if (asleep && !drag) { stage.dataset.asleep = ''; return; }
    raf = requestAnimationFrame(frame);
  };
  const wake = () => {
    delete stage.dataset.asleep;
    if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); }
  };

  const local = (e: PointerEvent) => {
    const r = stage.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const pt = local(e);
    const hit = Matter.Query.point(pieces.filter((p) => p.released).map((p) => p.body), pt)[0];
    if (!hit) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    Matter.Sleeping.set(hit, false);
    const c = Matter.Constraint.create({ pointA: pt, bodyB: hit, pointB: { x: pt.x - hit.position.x, y: pt.y - hit.position.y }, stiffness: 0.2, damping: 0.08, length: 0 });
    Matter.Composite.add(engine.world, c);
    drag = { c, id: e.pointerId };
    stage.dataset.dragging = '';
    wake();
  };
  const onMove = (e: PointerEvent) => {
    const pt = local(e);
    const now = performance.now();
    const dt = Math.max(1, now - ptr.t);
    if (ptr.t && dt < 120) {
      const bl = Math.min(1, dt / 40);
      ptr.vx += ((pt.x - ptr.x) / dt - ptr.vx) * bl;
      ptr.vy += ((pt.y - ptr.y) / dt - ptr.vy) * bl;
    } else { ptr.vx = 0; ptr.vy = 0; }
    ptr.x = pt.x; ptr.y = pt.y; ptr.t = now;
    if (drag && e.pointerId === drag.id) { drag.c.pointA = pt; return; }
    const speed = Math.hypot(ptr.vx, ptr.vy);
    if (speed < 0.35) return;
    let touched = false;
    for (const p of pieces) {
      if (!p.released) continue;
      const b = p.body;
      const reach = Math.max(p.w, p.h) / 2 + 18;
      const d = Math.hypot(b.position.x - pt.x, b.position.y - pt.y);
      if (d > reach || now - (p.pushed || 0) < 60) continue;
      p.pushed = now;
      const kick = Math.min(14, speed * 0.4 * (1 - (d / reach) ** 2) * 16);
      Matter.Sleeping.set(b, false);
      Matter.Body.setVelocity(b, { x: b.velocity.x + (ptr.vx / speed) * kick, y: b.velocity.y + (ptr.vy / speed) * kick - kick * 0.7 });
      touched = true;
    }
    if (touched) wake();
  };
  const onUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    Matter.Composite.remove(engine.world, drag.c);
    drag = null;
    delete stage.dataset.dragging;
  };

  const io = new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible) wake(); });
  io.observe(stage);
  const ro = new ResizeObserver(() => { placeWalls(); pieces.forEach((p) => Matter.Sleeping.set(p.body, false)); wake(); });
  ro.observe(stage);
  stage.addEventListener('pointerdown', onDown);
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerup', onUp);
  stage.addEventListener('pointercancel', onUp);
  wake();

  return () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    ro.disconnect();
    stage.removeEventListener('pointerdown', onDown);
    stage.removeEventListener('pointermove', onMove);
    stage.removeEventListener('pointerup', onUp);
    stage.removeEventListener('pointercancel', onUp);
    Matter.Composite.clear(engine.world, false);
    Matter.Engine.clear(engine);
  };
}

