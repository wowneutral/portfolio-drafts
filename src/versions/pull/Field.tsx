// Remixed from Fancy's cursor-attractor-and-gravity (danielpetho/fancy, MIT): matter-js DOM bodies, zero gravity, a cursor field.
// Here there are two sets in one world: LIKES are drawn to the pointer, DISLIKES are pushed away from it,
// every tag springs back to a home beside the name, and the name block is a static body nothing can cover.
import { useEffect, useRef } from 'react';
import Matter from 'matter-js';
import { DISLIKES, LIKES, PERSON } from '@/content';
import { still } from '@/lib/utils';

const { Bodies, Body, Engine, Events, Composite, Sleeping } = Matter;

type Tag = { el: HTMLElement; body: Matter.Body; like: boolean; home: { x: number; y: number }; w: number; h: number };

export type FieldApi = { flick: () => void };

export default function Field({ api }: { api?: React.MutableRefObject<FieldApi | null> }) {
  const root = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const tagRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const field = root.current!;
    const nameEl = nameRef.current!;
    let engine: Matter.Engine | null = null;
    let tags: Tag[] = [];
    let raf = 0;
    let running = false;
    let visible = true;
    let last = 0;
    const pointer = { x: 0, y: 0, on: false };
    let lastW = 0, bw = 0, bh = 0;

    const draw = () => {
      for (const t of tags) {
        const { x, y } = t.body.position;
        t.el.style.transform = `translate3d(${(x - t.w / 2).toFixed(1)}px, ${(y - t.h / 2).toFixed(1)}px, 0) rotate(${t.body.angle.toFixed(3)}rad)`;
      }
    };

    const build = () => {
      if (engine) { Composite.clear(engine.world, false); Engine.clear(engine); }
      const W = field.clientWidth;
      const H = field.clientHeight;
      lastW = W; bw = W; bh = H;
      const phone = W < 700;
      engine = Engine.create({ enableSleeping: true });
      engine.gravity.x = 0;
      engine.gravity.y = 0;
      const fr = field.getBoundingClientRect();
      const nr = nameEl.getBoundingClientRect();
      const pad = phone ? 8 : 16;
      const nx = nr.left - fr.left + nr.width / 2;
      const ny = nr.top - fr.top + nr.height / 2;
      // One static body per line of the name block, so tags can tuck in beside the shorter lines.
      const name = [...nameEl.querySelectorAll('.p-h1 span, .p-line')].map((el) => {
        const r = el.getBoundingClientRect();
        return Bodies.rectangle(r.left - fr.left + r.width / 2, r.top - fr.top + r.height / 2, r.width + pad * 2, r.height + pad * 1.2, { isStatic: true, chamfer: { radius: 12 } });
      });
      const T = 200;
      const walls = [
        Bodies.rectangle(W / 2, -T / 2, W + 2 * T, T, { isStatic: true }),
        Bodies.rectangle(W / 2, H + T / 2, W + 2 * T, T, { isStatic: true }),
        Bodies.rectangle(-T / 2, H / 2, T, H + 2 * T, { isStatic: true }),
        Bodies.rectangle(W + T / 2, H / 2, T, H + 2 * T, { isStatic: true }),
      ];
      // Keep the bottom-left corner clear for the draft switcher.
      const dock = Bodies.rectangle(110, H - 36, 240, 92, { isStatic: true });
      Composite.add(engine.world, [...name, dock, ...walls]);

      // First guesses: likes on a ring hugging the name, dislikes out at the edges.
      const els = tagRefs.current.filter(Boolean) as HTMLSpanElement[];
      const likes = els.filter((e) => e.dataset.like === '1');
      const dislikes = els.filter((e) => e.dataset.like !== '1');
      const gap = phone ? 6 : 10;
      const guess = new Map<HTMLElement, { x: number; y: number }>();
      likes.forEach((el, i) => {
        const a = -Math.PI / 2 + 0.35 + (i / likes.length) * Math.PI * 2;
        const rx = Math.min(nr.width / 2 + el.offsetWidth / 2 + (phone ? 4 : 28), W / 2 - el.offsetWidth / 2 - 24);
        const ry = nr.height / 2 + el.offsetHeight / 2 + (phone ? 18 : 30);
        guess.set(el, { x: nx + Math.cos(a) * rx, y: ny + Math.sin(a) * ry });
      });
      const inset = phone ? 10 : 34;
      const corners = [[0, 0], [1, 1], [1, 0], [0, 1]];
      dislikes.forEach((el, i) => {
        const [cx, cy] = corners[i % 4];
        const w = el.offsetWidth, h = el.offsetHeight;
        guess.set(el, { x: cx ? W - inset - w / 2 : inset + w / 2, y: cy ? H - (cx ? inset : 130) - h / 2 : inset + h / 2 });
      });

      // A home must never sit under the name: move any guess that lands on a line of it to just above or below the block.
      const lines = name.map((b) => b.bounds);
      const clear = (x: number, y: number, w: number, h: number) => {
        for (let k = 0; k < 4; k++) {
          const hit = lines.find((r) => x + w / 2 + gap > r.min.x && x - w / 2 - gap < r.max.x && y + h / 2 + gap > r.min.y && y - h / 2 - gap < r.max.y);
          if (!hit) break;
          const up = nr.top - fr.top - pad - h / 2 - gap, down = nr.bottom - fr.top + pad + h / 2 + gap;
          y = Math.abs(y - up) <= Math.abs(y - down) && up > h / 2 ? up : down;
        }
        return y;
      };
      tags = els.map((el) => {
        const w = el.offsetWidth, h = el.offsetHeight;
        const g = guess.get(el)!;
        const x = Math.min(W - w / 2 - 4, Math.max(w / 2 + 4, g.x));
        const y = Math.min(H - h / 2 - 4, Math.max(h / 2 + 4, clear(x, g.y, w, h)));
        const body = Bodies.rectangle(x, y, w + gap * 2, h + gap * 2, {
          chamfer: { radius: 6 }, frictionAir: 0.075, friction: 0.05, restitution: 0.25, density: 0.0012,
        });
        return { el, body, like: el.dataset.like === '1', home: { x, y }, w, h };
      });
      Composite.add(engine.world, tags.map((t) => t.body));

      // Settle once, silently, so every tag starts from a home where nothing overlaps.
      for (let i = 0; i < 260; i++) {
        for (const t of tags) {
          Body.applyForce(t.body, t.body.position, { x: (t.home.x - t.body.position.x) * 0.000006 * t.body.mass, y: (t.home.y - t.body.position.y) * 0.000006 * t.body.mass });
          Body.setAngle(t.body, 0);
          Body.setAngularVelocity(t.body, 0);
        }
        Engine.update(engine, 1000 / 60);
      }
      for (const t of tags) { t.home = { x: t.body.position.x, y: t.body.position.y }; Body.setVelocity(t.body, { x: 0, y: 0 }); }

      const R = Math.hypot(W, H);
      const Rd = phone ? 260 : 420;
      Events.on(engine, 'beforeUpdate', () => {
        // With a pointer in the field the home springs go slack, so the pull wins; without one they bring everything back.
        const k = pointer.on ? 0.0000016 : 0.000012;
        for (const t of tags) {
          const b = t.body;
          if (b.isSleeping) continue;
          const m = b.mass;
          let fx = (t.home.x - b.position.x) * k * m;
          let fy = (t.home.y - b.position.y) * k * m;
          if (pointer.on) {
            const dx = pointer.x - b.position.x, dy = pointer.y - b.position.y;
            const d = Math.hypot(dx, dy) || 1;
            if (t.like) {
              const s = 0.0052 * (0.45 + 0.55 * (1 - d / R)) * Math.min(1, d / 60) * m;
              fx += (dx / d) * s; fy += (dy / d) * s;
            } else if (d < Rd) {
              const q = 1 - d / Rd;
              const s = 0.024 * q * q * m;
              fx -= (dx / d) * s; fy -= (dy / d) * s;
            }
          }
          Body.applyForce(b, b.position, { x: fx, y: fy });
          // Keep the type near level: a soft spring on the angle, so a knock tilts a tag and it rights itself.
          Body.setAngularVelocity(b, b.angularVelocity * 0.88 - b.angle * 0.02);
        }
      });
      draw();
    };

    const wakeAll = () => { for (const t of tags) Sleeping.set(t.body, false); };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!engine) return;
      const steps = last ? Math.min(3, Math.max(1, Math.round((now - last) / (1000 / 60)))) : 1;
      last = now;
      for (let s = 0; s < steps; s++) Engine.update(engine, 1000 / 60);
      // Nothing leaves the field, however hard it is knocked.
      for (const t of tags) {
        const b = t.body, hw = t.w / 2 + 2, hh = t.h / 2 + 2;
        const x = Math.min(bw - hw, Math.max(hw, b.position.x)), y = Math.min(bh - hh, Math.max(hh, b.position.y));
        if (x !== b.position.x || y !== b.position.y) { Body.setPosition(b, { x, y }); Body.setVelocity(b, { x: b.velocity.x * -0.3, y: b.velocity.y * -0.3 }); }
      }
      draw();
    };
    const start = () => { if (running || still) return; running = true; last = 0; raf = requestAnimationFrame(loop); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    const setPointer = (cx: number, cy: number) => {
      const r = field.getBoundingClientRect();
      const x = cx - r.left, y = cy - r.top;
      const inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
      if (inside !== pointer.on || inside) wakeAll();
      pointer.on = inside; pointer.x = x; pointer.y = y;
    };
    const release = () => { if (pointer.on) { pointer.on = false; wakeAll(); } };
    const onMove = (e: PointerEvent) => { if (e.pointerType === 'mouse' || e.pointerType === 'pen') setPointer(e.clientX, e.clientY); };
    const onTouch = (e: TouchEvent) => { const t = e.touches[0]; if (t) setPointer(t.clientX, t.clientY); };
    const onDown = (e: PointerEvent) => {
      const r = field.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (x < 0 || y < 0 || x > r.width || y > r.height) return;
      kick(x, y, 1);
    };
    // A knock: likes leap toward the point, dislikes scatter from it.
    const kick = (x: number, y: number, power: number) => {
      wakeAll();
      for (const t of tags) {
        const b = t.body;
        const dx = x - b.position.x, dy = y - b.position.y;
        const d = Math.hypot(dx, dy) || 1;
        const s = (t.like ? 18 : -26) * power * Math.max(0.25, 1 - d / 900);
        Body.setVelocity(b, { x: b.velocity.x + (dx / d) * s, y: b.velocity.y + (dy / d) * s });
        Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.08 * power);
      }
    };
    if (api) api.current = { flick: () => { const r = field.getBoundingClientRect(); kick(r.width / 2, r.height / 2, 1.4); } };

    build();
    field.dataset.ready = '1';
    let io: IntersectionObserver | null = null;
    if (!still) {
      io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); else { stop(); release(); } }, { threshold: 0 });
      io.observe(field);
      window.addEventListener('pointermove', onMove, { passive: true });
      field.addEventListener('pointerdown', onDown);
      window.addEventListener('touchstart', onTouch, { passive: true });
      window.addEventListener('touchmove', onTouch, { passive: true });
      window.addEventListener('touchend', release, { passive: true });
      window.addEventListener('touchcancel', release, { passive: true });
      document.documentElement.addEventListener('mouseleave', release);
    }
    let rt = 0;
    const onResize = () => {
      clearTimeout(rt);
      rt = window.setTimeout(() => { if (Math.abs(field.clientWidth - lastW) > 2) build(); }, 250);
    };
    window.addEventListener('resize', onResize);
    document.fonts?.ready.then(() => build());

    return () => {
      stop(); io?.disconnect(); clearTimeout(rt);
      window.removeEventListener('pointermove', onMove);
      field.removeEventListener('pointerdown', onDown);
      window.removeEventListener('touchstart', onTouch);
      window.removeEventListener('touchmove', onTouch);
      window.removeEventListener('touchend', release);
      window.removeEventListener('touchcancel', release);
      document.documentElement.removeEventListener('mouseleave', release);
      window.removeEventListener('resize', onResize);
      if (engine) { Composite.clear(engine.world, false); Engine.clear(engine); }
      if (api) api.current = null;
    };
  }, [api]);

  const n = LIKES.length;
  return (
    <div className="p-field" ref={root}>
      <div className="p-name" ref={nameRef}>
        <h1 className="p-h1"><span>{PERSON.first}</span> <span>{PERSON.last}</span></h1>
        <p className="p-line">{PERSON.line}</p>
      </div>
      <div className="p-tags" aria-hidden="true">
        {LIKES.map((t, k) => <span key={t} ref={(el) => { tagRefs.current[k] = el; }} className="p-tag is-like" data-like="1">{t}</span>)}
        {DISLIKES.map((t, k) => <span key={t} ref={(el) => { tagRefs.current[n + k] = el; }} className="p-tag is-dislike">{t}</span>)}
      </div>
    </div>
  );
}
