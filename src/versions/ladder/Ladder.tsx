// The ladder: one SVG the height of the page. Rails in a reserved column, a rung per
// [data-rung] anchor, a notch per [data-notch] commit, a hanger per [data-hang] print.
// Rungs are buttons: they dip under the pointer or focus, and pressing one climbs there.
// At the top the rails can be pushed, dragged or flicked, and the visible stretch falls (matter.js).
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import Matter from 'matter-js';
import { gsap, ScrollTrigger, scrollToId } from '@/lib/scroll';
import { clamp, still } from '@/lib/utils';

type Rung = { id: string; label: string; kind: string; y: number };
type Hang = { a: number; b: number; y: number; s1: number; s2: number; top: number };
type Geo = { w: number; h: number; L: number; R: number; rungs: Rung[]; notches: number[]; hangs: Hang[]; wide: { x: number; y: number }[]; topY: number; minors: number[] };

const THICK: Record<string, number> = { double: 8, wide: 4, note: 2.5, small: 2.5, top: 4, rung: 3.5 };

export function Ladder({ page, stamp }: { page: RefObject<HTMLDivElement | null>; stamp: string }) {
  const [geo, setGeo] = useState<Geo | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const hover = useRef(-1);
  const flick = useRef({ x: 0, t: 0, vx: 0, x0: 0, down: false });
  const thrown = useRef(false);

  // Measure every anchor relative to the page.
  useLayoutEffect(() => {
    const el = page.current;
    if (!el) return;
    const measure = () => {
      const base = el.getBoundingClientRect();
      const rb = el.querySelector<HTMLElement>('.lad-railbox')!.getBoundingClientRect();
      const L = Math.round(rb.left - base.left) + 0.5, R = Math.round(rb.right - base.left) - 0.5;
      const rungs: Rung[] = [...el.querySelectorAll<HTMLElement>('[data-rung]')].map((a) => {
        const r = a.getBoundingClientRect();
        return { id: a.dataset.go || a.closest('[id]')?.id || '', label: a.dataset.rung || '', kind: a.dataset.kind || 'rung', y: Math.round(r.top - base.top + Math.min(r.height, 72) / 2) + 0.5 };
      });
      const notches = [...el.querySelectorAll<HTMLElement>('[data-notch]')].map((a) => { const r = a.getBoundingClientRect(); return Math.round(r.top - base.top + Math.min(r.height, 40) / 2); });
      const hangs = [...el.querySelectorAll<HTMLElement>('[data-hang]')].map((a) => {
        const img = a.querySelector('.lad-img')!.getBoundingClientRect();
        const y = Math.round(a.getBoundingClientRect().top - base.top) + 0.5;
        const s1 = img.left - base.left + img.width * 0.3, s2 = img.left - base.left + img.width * 0.7;
        return { a: Math.min(s1, L), b: Math.max(s2, L), y, s1, s2, top: img.top - base.top };
      });
      const wide = [...el.querySelectorAll<HTMLElement>('[data-wide]')].map((a) => { const r = a.getBoundingClientRect(); return { x: r.left - base.left, y: Math.round(r.top - base.top + r.height / 2) + 0.5 }; });
      const top = rungs.find((r) => r.kind === 'top');
      const topY = top ? top.y : el.scrollHeight;
      const step = innerWidth <= 820 ? 34 : 64;
      const minors: number[] = [];
      for (let y = topY - step; y > 0; y -= step) if (!rungs.some((r) => Math.abs(r.y - y) < step * 0.5) && !hangs.some((h) => Math.abs(h.y - y) < 6)) minors.push(Math.round(y) + 0.5);
      setGeo({ w: el.clientWidth, h: el.scrollHeight, L, R, rungs, notches, hangs, wide, topY, minors });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [page, stamp]);

  // Springs: the rung you stand on is thick, the next one lifts as you near it, a hovered one dips.
  useEffect(() => {
    if (!geo || !svg.current) return;
    const gs = [...svg.current.querySelectorAll<SVGGElement>('.lad-r')];
    const bs = [...box.current!.querySelectorAll<HTMLElement>('.lad-go:not(.lad-throw)')];
    const st = gs.map(() => ({ o: 0, v: 0 }));
    let cur = -2;
    const tick = (_t: number, dms: number) => {
      const dt = Math.min(0.05, dms / 1000);
      const top = page.current!.getBoundingClientRect().top;
      const stand = -top + innerHeight * 0.5;
      let c = -1;
      geo.rungs.forEach((r, i) => { if (r.y <= stand) c = i; });
      if (c !== cur) { gs.forEach((g, i) => g.classList.toggle('is-on', i === c)); bs.forEach((g, i) => g.classList.toggle('is-on', i === c)); cur = c; }
      geo.rungs.forEach((r, i) => {
        const near = i === c + 1 ? clamp(1 - (r.y - stand) / (innerHeight * 0.55)) : 0;
        const target = (hover.current === i ? 9 : 0) - near * 7;
        const s = st[i];
        if (still) s.o = target;
        else { s.v += ((target - s.o) * 260 - s.v * 15) * dt; s.o += s.v * dt; }
        gs[i].setAttribute('transform', `translate(0 ${s.o.toFixed(2)})`);
      });
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [geo, page]);

  // Throw it away, and put it back when the visitor climbs down again.
  const sim = useRef<(() => void) | null>(null);
  const restore = () => {
    if (!thrown.current) return;
    thrown.current = false;
    sim.current?.();
    box.current?.classList.remove('is-thrown');
    lean(0);
    flick.current = { x: 0, x0: 0, t: 0, vx: 0, down: false };
  };
  useEffect(() => {
    if (!geo) return;
    const st = ScrollTrigger.create({ trigger: '#top', start: 'top bottom', onLeaveBack: restore });
    return () => st.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo]);

  const lean = (a: number) => {
    const el = svg.current, g = geo;
    if (!el || !g) return 0;
    const d = a < 0 ? -1 : 1;
    const fx = (g.L + g.R) / 2 - d * (g.R - g.L) / 2;
    el.style.transformOrigin = `${fx}px ${g.topY}px`;
    el.style.transform = a ? `rotate(${a}rad)` : '';
    const prev = Number(el.dataset.lean || 0);
    el.dataset.lean = String(a);
    return prev;
  };

  const throwIt = () => {
    if (!geo || thrown.current) return;
    thrown.current = true;
    const b = box.current!;
    if (still) { b.classList.add('is-thrown'); return; }
    const top = page.current!.getBoundingClientRect().top;
    const yA = Math.max(0, top), yB = Math.min(innerHeight, top + geo.topY);
    if (yB - yA < 40) { b.classList.add('is-thrown'); return; }
    // Phase one: a rigid rod tipping about its foot (exact pendulum, g in px/s^2).
    // Phase two: released into matter.js with the velocity it had, and it drops away.
    const { Engine, Bodies, Body, Composite } = Matter;
    const G = 2600;
    const engine = Engine.create({ gravity: { x: 0, y: G / 1000 } });
    const len = yB - yA, cx = (geo.L + geo.R) / 2, span = geo.R - geo.L;
    const pieces: { x: number; y: number; w: number; h: number }[] = [{ x: geo.L, y: (yA + yB) / 2, w: 3, h: len }, { x: geo.R, y: (yA + yB) / 2, w: 3, h: len }];
    geo.rungs.forEach((r) => { const y = r.y + top; if (y > yA + 2 && y < yB - 1) pieces.push({ x: cx, y, w: span, h: THICK[r.kind] ?? 3 }); });
    geo.minors.forEach((m) => { const y = m + top; if (y > yA + 2 && y < yB - 1) pieces.push({ x: cx, y, w: span, h: 2 }); });
    const push = flick.current.vx || (flick.current.x - flick.current.x0) / 200;
    const dir = push < 0 ? -1 : 1;
    const foot = { x: cx - dir * span / 2, y: yB };
    let th = lean(0), om = dir * clamp(0.7 + Math.abs(push) * 0.9, 0.7, 3.2);
    if (Math.sign(th) !== dir) th = 0;
    let body: Matter.Body | null = null;
    const cv = canvas.current!, dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    const ctx = cv.getContext('2d')!;
    let alive = true;
    const tick = (_t: number, dms: number) => {
      if (!alive) return;
      const dt = Math.min(0.033, dms / 1000);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.fillStyle = '#a8650f';
      if (!body) {
        om += (3 * G / (2 * len)) * Math.sin(th) * dt;
        th += om * dt;
        ctx.save(); ctx.translate(foot.x, foot.y); ctx.rotate(th); ctx.translate(-foot.x, -foot.y);
        for (const p of pieces) ctx.fillRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h);
        ctx.restore();
        if (Math.abs(th) > 0.62) {
          body = Body.create({ parts: pieces.map((p) => Bodies.rectangle(p.x, p.y, p.w, p.h)), frictionAir: 0.002 });
          const c0 = { x: body.position.x - foot.x, y: body.position.y - foot.y };
          Body.setAngle(body, th);
          Body.setPosition(body, { x: foot.x + c0.x * Math.cos(th) - c0.y * Math.sin(th), y: foot.y + c0.x * Math.sin(th) + c0.y * Math.cos(th) });
          const r = { x: body.position.x - foot.x, y: body.position.y - foot.y };
          Body.setVelocity(body, { x: -om * r.y / 60, y: om * r.x / 60 });
          Body.setAngularVelocity(body, om / 60);
          Composite.add(engine.world, body);
        }
        return;
      }
      for (let k = 0, n = Math.ceil((dt * 1000) / 16.6); k < n; k++) Engine.update(engine, (dt * 1000) / n);
      for (const p of body.parts.slice(1)) { ctx.beginPath(); p.vertices.forEach((v, i) => (i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y))); ctx.closePath(); ctx.fill(); }
      if (body.bounds.min.y > innerHeight + 40) stop();
    };
    const stop = () => { alive = false; gsap.ticker.remove(tick); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); Engine.clear(engine); sim.current = null; };
    sim.current = stop;
    gsap.ticker.add(tick);
    requestAnimationFrame(() => b.classList.add('is-thrown'));
  };

  return (
    <div className="lad-ladder" ref={box}>
      <canvas className="lad-fall" ref={canvas} aria-hidden="true" />
      {geo && (
        <>
          <svg ref={svg} className="lad-svg" width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`} aria-hidden="true">
            <line className="lad-rail" x1={geo.L} x2={geo.L} y1={0} y2={geo.topY} />
            <line className="lad-rail" x1={geo.R} x2={geo.R} y1={0} y2={geo.topY} />
            {geo.minors.map((y) => <line key={y} className="lad-minor" x1={geo.L} x2={geo.R} y1={y} y2={y} />)}
            {geo.wide.map((w) => <line key={w.y} className="lad-wide" x1={w.x} x2={geo.L} y1={w.y} y2={w.y} />)}
            {geo.hangs.map((h) => (
              <g key={h.y} className="lad-hang">
                <line x1={(h.s1 + h.s2) / 2} x2={geo.L} y1={h.y} y2={h.y} />
                <polyline points={`${h.s1},${h.top} ${(h.s1 + h.s2) / 2},${h.y} ${h.s2},${h.top}`} />
                <circle cx={(h.s1 + h.s2) / 2} cy={h.y} r={3} />
              </g>
            ))}
            {geo.notches.map((y, i) => (
              <g key={i} className="lad-notch">
                <line x1={geo.L - 9} x2={geo.L} y1={y + 0.5} y2={y + 0.5} />
                <line x1={geo.R} x2={geo.R + 9} y1={y + 0.5} y2={y + 0.5} />
              </g>
            ))}
            {geo.rungs.map((r) => (
              <g key={r.label + r.y} className={`lad-r k-${r.kind}`}>
                <line x1={geo.L} x2={geo.R} y1={r.y} y2={r.y} />
              </g>
            ))}
          </svg>
          <nav className="lad-nav" aria-label="Rungs of the ladder">
            {geo.rungs.map((r, i) => (
              r.kind === 'top' ? (
                <button
                  key="top" type="button" className="lad-go lad-throw"
                  style={{ top: Math.max(0, r.y - 380), left: Math.max(0, geo.L - 22), height: Math.min(r.y, 380) + 30, width: geo.R - geo.L + 44 }}
                  onPointerDown={(e) => { flick.current = { x: e.clientX, x0: e.clientX, t: performance.now(), vx: 0, down: true }; }}
                  onPointerMove={(e) => {
                    const f = flick.current;
                    if (!f.down) return;
                    const t = performance.now();
                    f.vx = (e.clientX - f.x) / Math.max(8, t - f.t); f.x = e.clientX; f.t = t;
                    if (!still) lean(clamp((e.clientX - f.x0) * 0.0012, -0.09, 0.09));
                  }}
                  onPointerUp={() => { flick.current.down = false; }}
                  onPointerCancel={() => { flick.current.down = false; lean(0); }}
                  onPointerEnter={(e) => { if (e.pointerType === 'mouse' && !still && !thrown.current) lean(0.018); }}
                  onPointerLeave={() => { if (flick.current.down) { flick.current.down = false; throwIt(); } else if (!thrown.current) lean(0); }}
                  onClick={throwIt} aria-label={r.label}
                >
                  <span className="lad-lab lad-lab-throw" aria-hidden="true">{r.label}</span>
                </button>
              ) : (
                <button
                  key={r.label + r.y} type="button" className={`lad-go k-${r.kind}`}
                  style={{ top: r.y - 22, left: Math.max(0, geo.L - 10) }}
                  onPointerEnter={() => { hover.current = i; }} onPointerLeave={() => { hover.current = -1; }}
                  onFocus={() => { hover.current = i; }} onBlur={() => { hover.current = -1; }}
                  onClick={() => scrollToId(r.id, -Math.round(innerHeight * 0.3))} aria-label={`Climb to ${r.label}`}
                >
                  <span className="lad-lab" aria-hidden="true">{r.label}</span>
                </button>
              )
            ))}
          </nav>
        </>
      )}
    </div>
  );
}
