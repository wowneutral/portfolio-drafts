// The balance as numbers. One beam (a damped spring driven by what has landed in
// each pan), the stones and their flights. The 3D scene reads this every frame;
// React only hears about it when the list of stones changes.
import { useSyncExternalStore } from 'react';

export type Sec = 'open' | 'about' | 'debate' | 'research' | 'work' | 'github' | 'today' | 'now' | 'record' | 'off' | 'contact';
export type Tone = 'white' | 'black' | 'green';
export type Place = 'floor' | 'L' | 'R' | 'gone';
type V3 = [number, number, number];

export type Stone = {
  id: string; word: string; tone: Tone; r: number; mass: number;
  kind: 'free' | 'sec' | 'counter' | 'pebble' | 'wait';
  place: Place; home: V3; p: V3; v: V3; landed: boolean; delay: number; seed: number; vis: number; held: boolean;
};

// Geometry of the balance, shared with the scene.
export const PY = 2.95; // pivot height
export const L = 1.85; // half beam
export const HANG = 1.42; // beam end to pan floor
export const PAN_R = 0.74;
export const MAX = 0.3; // the furthest the beam may tip

export const sim = {
  theta: 0, omega: 0, t: 0, lastLand: -9, hold: false,
  stones: [] as Stone[],
};

// A tiny store (section, work selection, and a version for the stone list).
type St = { sec: Sec; ver: number; work: number };
let state: St = { sec: 'open', ver: 0, work: 0 };
const subs = new Set<() => void>();
function useStore<T>(pick: (s: St) => T): T {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => pick(state));
}
export const useB = Object.assign(useStore, {
  getState: () => state,
  setState: (p: Partial<St> | ((s: St) => Partial<St>)) => {
    const next = { ...state, ...(typeof p === 'function' ? p(state) : p) };
    if (next.sec === state.sec && next.ver === state.ver && next.work === state.work) return;
    state = next; subs.forEach((f) => f());
  },
});
const bump = () => useB.setState((s) => ({ ver: s.ver + 1 }));

let uid = 0;
const FREE = ['Aff', 'Neg', 'Yes', 'No'];
const FREE_X = [-2.2, -0.74, 0.74, 2.2];

function mk(word: string, tone: Tone, r: number, mass: number, kind: Stone['kind'], place: Place, delay = 0, home: V3 = [0, 0, 0]): Stone {
  const start: V3 = place === 'floor' ? [...home] : [place === 'L' ? -L : L, PY + 5.5 + delay * 2, 0];
  return { id: 's' + uid++, word, tone, r, mass, kind, place, home, p: start, v: [0, 0, 0], landed: false, delay, seed: uid % 5, vis: place === 'floor' ? 1 : 0, held: false };
}

export function initFree() {
  if (sim.stones.some((s) => s.kind === 'free')) return;
  FREE.forEach((w, i) => sim.stones.push(mk(w, 'white', 0.34, 1, 'free', 'floor', 0, [FREE_X[i], 0.34 * 0.58, 1.6])));
  bump();
}

/** Where a beam end is for a given tilt (theta > 0: left side down). */
export function endOf(side: 'L' | 'R', th = sim.theta): [number, number] {
  const c = Math.cos(th), s = Math.sin(th);
  return side === 'L' ? [-L * c, PY - L * s] : [L * c, PY + L * s];
}

/** Where a stone sits in its pan: big ones stack into a cairn, small ones ring the rim. */
export function slotOf(st: Stone): V3 {
  const side = st.place as 'L' | 'R';
  const [ex, ey] = endOf(side);
  const floorY = ey - HANG + 0.07;
  const inPan = sim.stones.filter((s) => s.place === side && s.vis > 0);
  if (st.r >= 0.2) {
    let y = floorY, x = 0;
    for (const s of inPan) {
      if (s.r < 0.2) continue;
      if (s === st) return [ex + x, y + s.r * 0.58, 0.05];
      y += s.r * 0.58 * 1.86; x += (s.seed % 2 ? 0.05 : -0.05);
    }
    return [ex, y + st.r * 0.58, 0.05];
  }
  const small = inPan.filter((s) => s.r < 0.2);
  const k = Math.max(0, small.indexOf(st));
  const ring = k < 8 ? 0.42 : 0.2;
  const a = (k % 8) * (Math.PI / 4) + (k >= 8 ? 0.4 : 0.15);
  return [ex + Math.cos(a) * ring, floorY + st.r * 0.58 + (k >= 8 ? 0.12 : 0), Math.sin(a) * ring * 0.8];
}

const massOn = (side: 'L' | 'R') => sim.stones.reduce((m, s) => m + (s.place === side && s.landed ? s.mass : 0), 0);
const flying = () => sim.stones.some((s) => (s.place === 'L' || s.place === 'R') && !s.landed);

/** Put a stone in a pan (it falls in from where it is). */
export function drop(st: Stone, side: 'L' | 'R') {
  st.place = side; st.landed = false; st.delay = 0; st.vis = 1;
  const top = slotOf(st)[1] + 1.1;
  st.v = [0, st.p[1] < top ? Math.sqrt(2 * 24 * (top - st.p[1])) : 0, 0];
  bump();
}

export function toFloor(st: Stone) {
  st.place = 'floor'; st.landed = false; st.v = [0, 3, 0];
  bump();
}

/** A tap on a stone: from the floor it goes to the lighter side; from a pan it goes home. */
export function tap(id: string) {
  const st = sim.stones.find((s) => s.id === id);
  if (!st || st.kind !== 'free') return;
  if (sim.hold) { st.v[1] = 3; return; } // the one place it will not be weighed again
  if (st.place === 'floor') {
    const l = massOn('L') + pend('L'), r = massOn('R') + pend('R');
    drop(st, l < r ? 'L' : r < l ? 'R' : Math.random() < 0.5 ? 'L' : 'R');
  } else if (st.place === 'L' || st.place === 'R') toFloor(st);
}
const pend = (side: 'L' | 'R') => sim.stones.reduce((m, s) => m + (s.place === side && !s.landed ? s.mass : 0), 0);

/** Clear the pans and weigh this section's two things. */
export function weigh(sec: Sec, load: { L: { word: string; tone?: Tone; r?: number; mass?: number }[]; R: { word: string; tone?: Tone; r?: number; mass?: number }[]; wait?: string[] }) {
  for (const s of sim.stones) {
    if (s.kind === 'free') { if (s.place === 'L' || s.place === 'R') toFloor(s); continue; }
    if (s.place !== 'gone') { s.place = 'gone'; s.landed = false; }
  }
  sim.hold = sec === 'debate';
  let d = 0.25;
  for (const side of ['L', 'R'] as const) {
    load[side].forEach((w, i) => {
      const small = (w.r ?? 0.36) < 0.2;
      sim.stones.push(mk(w.word, w.tone ?? 'white', w.r ?? 0.36, w.mass ?? 1, small ? 'pebble' : 'sec', side, d + i * (small ? 0.45 : 0.32)));
    });
    d += sec === 'github' || sec === 'today' ? 0.22 : 0.5;
  }
  (load.wait ?? []).forEach((w, i) => sim.stones.push(mk(w, 'white', 0.36, 1, 'wait', 'floor', 0, [i ? 1.45 : -1.45, 0.36 * 0.58, 1.6])));
  bump();
}

/** Interleave a list so the pans fill alternately (the GitHub pebbles). */
export function alternate<T>(items: T[]) {
  const L: T[] = [], R: T[] = [];
  items.forEach((x, i) => (i % 2 ? R : L).push(x));
  return { L, R };
}

/** One frame. */
export function step(dt: number) {
  sim.t += dt;
  const t = sim.t;
  let changed = false;

  // The balancer: whatever lands, an equal weight answers it (except in Debate).
  if (!sim.hold && !flying() && t - sim.lastLand > 0.75) {
    const l = massOn('L'), r = massOn('R'), diff = Math.abs(l - r);
    if (diff > 0.04) {
      const heavy = l > r ? 'L' : 'R', light = l > r ? 'R' : 'L';
      const extra = sim.stones.filter((s) => s.kind === 'counter' && s.place === heavy);
      if (extra.length) { for (const s of extra) s.place = 'gone'; changed = true; }
      else {
        const big = diff >= 0.6;
        const st = mk(big ? 'But' : '', 'black', big ? Math.min(0.36, 0.3 * Math.cbrt(diff)) : 0.17, diff, 'counter', light, 0);
        st.p = [light === 'L' ? -L : L, PY + 4.5, 0];
        sim.stones.push(st); changed = true;
      }
      sim.lastLand = t;
    }
  }

  // The beam: a spring toward the tilt the weights ask for, underdamped so it overshoots.
  const target = Math.max(-MAX, Math.min(MAX, 0.12 * (massOn('L') - massOn('R'))));
  sim.omega += (26 * (target - sim.theta) - 3.1 * sim.omega) * dt;
  sim.theta += sim.omega * dt;

  for (const s of sim.stones) {
    if (s.held) continue;
    if (s.delay > 0) { s.delay -= dt; continue; }
    if (s.place === 'gone') {
      s.vis = Math.max(0, s.vis - dt * 2.4);
      s.p[1] += dt * 3; continue;
    }
    const want = s.kind === 'free' && sim.hold && s.place === 'floor' ? 0 : 1;
    s.vis = want ? Math.min(1, s.vis + dt * 3) : Math.max(0, s.vis - dt * 3);
    const tgt = s.place === 'floor' ? s.home : slotOf(s);
    if (s.landed) { s.p[0] = tgt[0]; s.p[1] = tgt[1]; s.p[2] = tgt[2]; continue; }
    if (s.place === 'floor') {
      // spring home with a hop
      for (let k = 0; k < 3; k++) { s.v[k] += (34 * (tgt[k] - s.p[k]) - 7 * s.v[k]) * dt; s.p[k] += s.v[k] * dt; }
      if (Math.abs(s.p[1] - tgt[1]) < 0.004 && Math.abs(s.v[1]) < 0.05 && Math.abs(s.p[0] - tgt[0]) < 0.01) { s.landed = true; }
      continue;
    }
    // falling into a pan: gravity in y, quick steer in x and z
    s.v[1] -= 24 * dt;
    s.p[1] += s.v[1] * dt;
    s.p[0] += (tgt[0] - s.p[0]) * Math.min(1, dt * 5);
    s.p[2] += (tgt[2] - s.p[2]) * Math.min(1, dt * 5);
    if (s.v[1] <= 0 && s.p[1] <= tgt[1]) {
      s.landed = true; s.v = [0, 0, 0];
      sim.omega += (s.place === 'L' ? 1 : -1) * Math.min(1.6, 0.55 + s.mass * 0.5);
      sim.lastLand = t;
    }
  }

  // forget stones that have left
  const before = sim.stones.length;
  sim.stones = sim.stones.filter((s) => !(s.place === 'gone' && s.vis <= 0));
  if (changed || sim.stones.length !== before) bump();
}

export function resetSim() {
  sim.theta = 0; sim.omega = 0; sim.t = 0; sim.lastLand = -9; sim.hold = false; sim.stones = [];
}
