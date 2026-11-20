// The paperweight's body: where the glass is, how fast it moves, and where it wants to rest.
// Runs on GSAP's ticker (the same clock as the smooth scroll), drives the DOM handle,
// and the WebGL scene reads the same numbers every frame.
import { clamp, damp, still } from '@/lib/utils';

export const ASPECT = 982 / 1540; // width over height of the roman question mark outline

export const drag = { x: 0, y: 0 };
export type Mode = 'follow' | 'placed' | 'parked';
export const G = {
  x: -400, y: -400, vx: 0, vy: 0,
  H: 260, W: 166,
  lift: 1, tilt: 0, kick: 0,
  mode: (still ? 'parked' : 'follow') as Mode,
  placedX: 0, placedDocY: 0,
  dragging: false, ready: false, phone: false, hover: false,
  rest: null as HTMLElement | null,
  scale: 1, keep: 1,
};

/** Where the glass sits on a rest element: data-rx / data-ry are fractions of its box. */
function restPoint(el: HTMLElement, vw: number) {
  const r = el.getBoundingClientRect();
  const rx = parseFloat(el.dataset.rx ?? '1'), ry = parseFloat(el.dataset.ry ?? '0.5');
  let x = r.left + r.width * rx, y = r.top + r.height * ry;
  if (G.phone && !el.dataset.free) x = vw - G.W * 0.5 - 8;
  x = clamp(x, G.W * 0.5 + 8, vw - G.W * 0.5 - 8);
  return { x, y };
}

function parkPoint(vw: number, vh: number) {
  return { x: vw - G.W * 0.5 * 0.62 - 18, y: vh - G.H * 0.5 * 0.62 - 22 };
}

let landed = true, travel = 0;
function thud(el: HTMLElement | null) {
  G.kick = 1;
  if (!el || still) return;
  el.classList.remove('thud'); void el.offsetWidth; el.classList.add('thud');
}

/** One step of the simulation. */
export function step(dt: number, root: HTMLElement) {
  dt = Math.min(dt, 1 / 30);
  const vw = window.innerWidth, vh = window.innerHeight;
  G.phone = vw <= 760;
  G.H = G.phone ? Math.min(150, vh * 0.2) : Math.min(270, Math.max(190, vh * 0.32));
  G.W = G.H * ASPECT;
  if (!G.ready) return;

  // Choose the target.
  let tx = G.x, ty = G.y, spring = true;
  const want = G.mode === 'parked' ? 0.62 : G.mode === 'follow' && G.rest ? parseFloat(G.rest.dataset.s ?? '1') : G.keep;
  G.scale = damp(G.scale, G.phone ? Math.min(want, 1.15) : want, still ? 1000 : 6, dt);
  if (G.mode === 'placed') {
    tx = G.placedX; ty = G.placedDocY - window.scrollY;
    if (ty < -vh * 0.9 || ty > vh * 1.9) G.mode = 'follow';
  }
  if (G.mode === 'follow') {
    const rests = Array.from(root.querySelectorAll<HTMLElement>('[data-rest]')).filter((el) => !(G.phone && el.dataset.desk !== undefined));
    let cur = rests[0] ?? null;
    for (const el of rests) { const t = el.getBoundingClientRect().top; if (t < vh * 0.62) cur = el; }
    if (cur !== G.rest) { G.rest = cur; landed = false; travel = 0; }
    if (cur) ({ x: tx, y: ty } = restPoint(cur, vw));
  }
  if (G.mode === 'parked') ({ x: tx, y: ty } = parkPoint(vw, vh));

  if (G.dragging) {
    spring = false;
    const nx = damp(G.x, drag.x, still ? 1000 : 20, dt), ny = damp(G.y, drag.y, still ? 1000 : 20, dt);
    G.vx = damp(G.vx, (nx - G.x) / dt, 18, dt); G.vy = damp(G.vy, (ny - G.y) / dt, 18, dt);
    G.x = nx; G.y = ny;
    G.lift = damp(G.lift, 1, 14, dt);
  } else if (still) {
    G.x = tx; G.y = ty; G.vx = G.vy = 0; G.lift = 0;
    spring = false;
  } else if (G.mode === 'placed' && (Math.abs(G.vx) > 30 || Math.abs(G.vy) > 30) && skidding) {
    // A throw: it skids on the paper and slows, bouncing softly off the edges.
    spring = false;
    G.x += G.vx * dt; G.y += G.vy * dt;
    const f = Math.exp(-3.4 * dt); G.vx *= f; G.vy *= f;
    const mx = G.W * 0.5 + 6, my = G.H * 0.5 + 6;
    if (G.x < mx) { G.x = mx; G.vx = Math.abs(G.vx) * 0.45; } if (G.x > vw - mx) { G.x = vw - mx; G.vx = -Math.abs(G.vx) * 0.45; }
    if (G.y < my) { G.y = my; G.vy = Math.abs(G.vy) * 0.45; } if (G.y > vh - my) { G.y = vh - my; G.vy = -Math.abs(G.vy) * 0.45; }
    G.placedX = G.x; G.placedDocY = G.y + window.scrollY;
    G.lift = damp(G.lift, 0.25, 6, dt);
    if (Math.hypot(G.vx, G.vy) < 40) { skidding = false; thud(null); }
  }
  if (spring) {
    // An underdamped spring: it overshoots a touch and settles, like something heavy set down.
    const k = 70, c = 11.5;
    const ax = k * (tx - G.x) - c * G.vx, ay = k * (ty - G.y) - c * G.vy;
    G.vx += ax * dt; G.vy += ay * dt;
    G.x += G.vx * dt; G.y += G.vy * dt;
    const d = Math.hypot(tx - G.x, ty - G.y), sp = Math.hypot(G.vx, G.vy);
    travel = Math.max(travel, d);
    G.lift = damp(G.lift, Math.max(clamp(d / 160), G.hover ? 0.35 : 0), 7, dt);
    if (!landed && d < 3 && sp < 40) { landed = true; if (travel > 40) thud(G.mode === 'follow' ? G.rest : null); }
  }
  G.tilt = damp(G.tilt, clamp(G.vx / 1800, -0.6, 0.6), 9, dt);
  G.kick = damp(G.kick, 0, 7, dt);
}

let skidding = false;
export function throwGlass(vx: number, vy: number) {
  if (G.mode === 'follow') G.keep = G.scale > 1 ? G.scale : 1; else if (G.mode === 'parked') G.keep = 1;
  G.mode = 'placed';
  G.vx = clamp(vx, -2600, 2600); G.vy = clamp(vy, -2600, 2600);
  G.placedX = G.x; G.placedDocY = G.y + window.scrollY;
  skidding = !still && Math.hypot(G.vx, G.vy) > 120;
  if (!skidding) { G.vx = G.vy = 0; landed = false; travel = 50; }
}
export function placeAt(x: number, y: number) {
  if (G.mode === 'parked') G.keep = 1;
  G.mode = 'placed'; skidding = false;
  G.placedX = clamp(x, G.W * 0.5, window.innerWidth - G.W * 0.5);
  G.placedDocY = clamp(y, G.H * 0.5, window.innerHeight - G.H * 0.5) + window.scrollY;
  landed = false; travel = 50;
}
export function toggleLift() {
  G.mode = G.mode === 'parked' && !still ? 'follow' : 'parked';
  G.rest = null; landed = false; travel = 50;
}
