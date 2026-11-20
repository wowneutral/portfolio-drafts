// The chain: every tile, where it stands, when it falls, and what it leans on.
// All of it is plain data and pure functions so the scrubbed story stays deterministic and reversible.
import { clamp } from '@/lib/utils';
import { WORK } from '@/content';

export const PW = 0.5, PT = 0.15;
const GAP = 0.58;

export type Tile = {
  word: string; x: number; z: number; h: number; yaw: number;
  /** Tiles this one knocks into. Always higher indices. */
  next: number[];
  /** Scroll position (in stops) at which it starts to go; Infinity never. */
  fs: number;
  /** Furthest it may fall on its own (the champions lean into each other). */
  max: number;
  orange?: boolean; today?: boolean; small?: boolean;
};

export const T: Tile[] = [];
const add = (t: Partial<Tile> & { word: string; h: number }) => {
  T.push({ x: 0, z: 0, yaw: 0, next: [], fs: Infinity, max: Math.PI / 2, ...t });
  return T.length - 1;
};
/** Place a tile straight behind tile p, close enough to be hit. */
const behind = (p: number, t: Partial<Tile> & { word: string; h: number }, link = true) => {
  const a = T[p];
  const z = a.z - GAP * a.h - PT * t.h;
  const i = add({ x: a.x, z, ...t });
  if (link) a.next.push(i);
  return i;
};
const fallAt = (stop: number, order = 0) => stop - 0.72 + 0.17 * order;

// The opening and the About: debate pulled him into philosophy, then building.
export const FIRST = add({ word: 'Armaan', h: 0.55, fs: fallAt(1, 0), orange: true });
const iDebate = behind(FIRST, { word: 'Debate', h: 0.68, fs: fallAt(1, 1) });
const iPhil = behind(iDebate, { word: 'Philosophy', h: 0.8, fs: fallAt(1, 2) });
const iBuild = behind(iPhil, { word: 'Building', h: 0.92, fs: fallAt(2, 0) });
// Skeptical, where the row splits: compete and coach.
const iSkep = behind(iBuild, { word: 'Skeptical', h: 1.05, fs: fallAt(3, 0) });
const zs = T[iSkep].z - GAP * 1.05 - PT * 1.18;
const iComp = add({ word: 'Compete', h: 1.18, x: -0.34, z: zs, yaw: 0.7, fs: fallAt(3, 1.2) });
const iCoach = add({ word: 'Coach', h: 1.18, x: 0.34, z: zs, yaw: -0.7, fs: fallAt(3, 1.2) });
T[iSkep].next.push(iComp, iCoach);
// The two championships: the tallest tiles, falling into each other.
export const CHAMP = [
  add({ word: 'Champion', h: 2.3, x: -0.7, z: zs - 0.92, yaw: -0.55, fs: fallAt(4, 0), max: 0.5 }),
  add({ word: 'Champion', h: 2.3, x: 0.7, z: zs - 0.92, yaw: 0.55, fs: fallAt(4, 0), max: 0.5 }),
];
T[iComp].next.push(CHAMP[0]); T[iCoach].next.push(CHAMP[1]);
// Up next: two tiles still standing beyond them.
export const NEXT = [
  add({ word: 'Isidore Newman', h: 1.45, x: -2.0, z: zs - 1.7, yaw: 0.25 }),
  add({ word: 'DSDS1', h: 1.45, x: -3.05, z: zs - 2.4, yaw: 0.25 }),
];
// Research, then the eight things he built.
const iRes = add({ word: 'Research', h: 1.25, x: 1.1, z: zs - 5.6, fs: fallAt(6) });
export const WORKS: number[] = [];
let prev = iRes;
WORK.forEach((w, k) => { prev = behind(prev, { word: w.name, h: 1.3 + 0.07 * k, fs: fallAt(7 + k) }); WORKS.push(prev); });
const iLastWork = prev;
// The GitHub fan sits beside the row: up to twelve small tiles on an arc. Only the first `fan.n` show.
export const FAN: number[] = [];
export const FAN_MAX = 12;
{
  const a = T[iLastWork];
  const R = 1.3, cx = a.x + 2.9, cz = a.z + 1.4, step = 0.34, phi0 = -2.2;
  for (let k = 0; k < FAN_MAX; k++) {
    const phi = phi0 + k * step;
    const i = add({ word: '', h: 0.56, small: true, x: cx + R * Math.cos(phi), z: cz + R * Math.sin(phi), yaw: Math.PI - phi, fs: fallAt(15, 0) + 0.035 * k });
    if (k > 0) T[FAN[k - 1]].next.push(i);
    FAN.push(i);
  }
}
const iNow = behind(iLastWork, { word: 'Now', h: 1.85, fs: fallAt(16) });
const iRec = behind(iNow, { word: 'Record', h: 1.95, fs: fallAt(17) });
export const TODAY = behind(iRec, { word: 'Today', h: 2.2, today: true });
export const N = T.length;

/** Camera stops, in page order. Each looks at a few tiles. */
export const STOPS: number[][] = [
  [FIRST], [iDebate, iPhil], [iBuild], [iSkep, iComp, iCoach], CHAMP, NEXT, [iRes],
  ...WORKS.map((i) => [i]), FAN.slice(0, 4), [iNow], [iRec], [iRec, TODAY], [TODAY], [],
];
export const LAST_STOP = STOPS.length - 1;

/** Direction a tile falls in, on the floor. */
const dir = (t: Tile) => [-Math.sin(t.yaw), -Math.cos(t.yaw)] as const;

/** The furthest tile i can lean while tile j stands at angle phi: its top must stay on our side of j. */
function contact(i: number, j: number, phi: number) {
  const a = T[i], b = T[j];
  const [dx, dz] = dir(a);
  const D = (b.x - a.x) * dx + (b.z - a.z) * dz;
  const s = (D * Math.cos(phi) - PT * b.h * 0.5) / a.h;
  if (s >= 1) return Math.PI / 2;
  return Math.min(Math.PI / 2, phi + Math.asin(clamp(s, -1, 1)));
}

/** How far the scroll asks tile i to fall at stop position f. */
export function scrollRaw(i: number, f: number) {
  const t = T[i];
  if (!Number.isFinite(t.fs)) return 0;
  const q = clamp((f - t.fs) / 0.38);
  return t.max * q * q;
}

// The push: a timed chain from one tile through everything it touches, then the row stands again.
export type Chain = { t0: number; start: Map<number, number>; lift: number };
const dur = (i: number) => 0.36 * Math.sqrt(T[i].h / 0.55);
export function planChain(k: number, t0: number): Chain {
  const start = new Map<number, number>([[k, 0]]);
  const queue = [k];
  let end = 0;
  while (queue.length) {
    const i = queue.shift()!;
    const s = start.get(i)!;
    end = Math.max(end, s + dur(i));
    for (const j of T[i].next) if (!start.has(j)) { start.set(j, s + dur(i) * 0.62); queue.push(j); }
  }
  return { t0, start, lift: end + 2.6 };
}
export function chainRaw(c: Chain, i: number, now: number) {
  const s = c.start.get(i);
  if (s === undefined) return 0;
  const tt = now - c.t0;
  if (tt < s) return 0;
  const q = clamp((tt - s) / dur(i));
  let a = T[i].max * q * q;
  // They stand again, the far end first.
  const r = c.lift + (c.start.size - [...c.start.keys()].indexOf(i)) * 0.09;
  if (tt > r) a *= 1 - clamp((tt - r) / 0.5);
  return a;
}
export const chainOver = (c: Chain, now: number) => now - c.t0 > c.lift + c.start.size * 0.09 + 1.2;

/** Shared between page and scene; never read by React render. */
export const chain = {
  keys: [[0, 0], [1, 1]] as [number, number][],
  f: 0, now: 0,
  push: null as Chain | null,
  hover: -1,
  todayDown: false,
  fanN: 4,
  angles: new Array(N).fill(0) as number[],
  vel: new Array(N).fill(0) as number[],
};

export function fOf(y: number) {
  const k = chain.keys;
  if (y <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (y <= k[i][0]) { const [y0, f0] = k[i - 1], [y1, f1] = k[i]; return f0 + (f1 - f0) * ((y - y0) / Math.max(1, y1 - y0)); }
  }
  return k[k.length - 1][1];
}

export function pushFrom(i: number) {
  if (T[i].today) { chain.todayDown = true; window.dispatchEvent(new Event('chain:today')); return; }
  if (chain.push || T[i].small) return;
  if (chain.angles[i] > 0.1) return;
  chain.push = planChain(i, chain.now);
}

/** One frame of the row: springs toward what scroll and push ask, then each tile can lean only as far as the next lets it. */
export function stepRow(dt: number) {
  const { angles: A, vel: V } = chain;
  if (chain.push && chainOver(chain.push, chain.now)) chain.push = null;
  for (let i = 0; i < N; i++) {
    const t = T[i];
    let raw = scrollRaw(i, chain.f);
    if (chain.push) raw = Math.max(raw, chainRaw(chain.push, i, chain.now));
    if (t.today) raw = chain.todayDown ? Math.PI / 2 : 0;
    if (chain.hover === i && A[i] < 0.06) raw = Math.max(raw, 0.07);
    if (t.small && FAN.indexOf(i) >= chain.fanN) raw = 0;
    V[i] += (raw - A[i]) * 95 * dt;
    V[i] *= Math.exp(-10 * dt);
    A[i] += V[i] * dt;
  }
  for (let i = N - 1; i >= 0; i--) {
    let cap = T[i].max;
    for (const j of T[i].next) if (!(T[j].small && FAN.indexOf(j) >= chain.fanN)) cap = Math.min(cap, contact(i, j, A[j]));
    if (A[i] > cap) { A[i] = cap; if (V[i] > 0) V[i] = -V[i] * 0.22; }
    if (A[i] < 0) { A[i] = 0; if (V[i] < 0) V[i] = -V[i] * 0.15; }
  }
}

if (import.meta.env.DEV) (window as unknown as { __chain: unknown }).__chain = chain;
