// The set: one level per section, stacked straight down. Each level is a white ramp rising left to right,
// a flat foot at the left with a curb, and a trapdoor under the place the stone rests. Scroll to the next
// section and the trapdoor slides away: the stone drops to the foot of the level below.

export const H = 7; // vertical distance between levels
export const X0 = -7; // the curb's inner face
export const TRAP = 1.45; // trapdoor length, from the curb
export const X1 = -4.4; // where the ramp starts
export const R = 0.72; // the stone
export const THICK = 0.78;
export const DEPTH = 3.0;
export const GAP = 0.98; // a notch

export type LevelKind = 'hero' | 'today' | 'plain' | 'debate' | 'github' | 'end';
export type Level = { kind: LevelKind; y: number; ang: number; len: number; notches: number[]; top: boolean; beyond: boolean };

const ANGLES = [13, 12, 14.5, 12.5, 13.5, 15, 12, 14];

export function makeLevels(kinds: LevelKind[]): Level[] {
  return kinds.map((kind, i) => ({
    kind,
    y: -i * H,
    ang: ((kind === 'debate' ? 13 : kind === 'hero' ? 18.5 : kind === 'end' ? 0 : ANGLES[i % ANGLES.length]) * Math.PI) / 180,
    len: kind === 'end' ? 8 : kind === 'hero' ? 9.4 : 8.8,
    notches: kind === 'debate' ? [0.36, 0.7] : [],
    top: kind === 'today',
    beyond: kind === 'debate',
  }));
}

/** A point on a level's slope line, s along the ramp from its foot. */
export function onSlope(l: Level, s: number) {
  return { x: X1 + Math.cos(l.ang) * s, y: l.y + Math.sin(l.ang) * s };
}

/** Which level a height belongs to. */
export const levelOf = (y: number) => Math.floor((4 - y) / H);

/** Where the stone sits in a notch (centre x on the slope). */
export function notchAt(l: Level, i: number) {
  const s = l.notches[i] * l.len + GAP / 2;
  return onSlope(l, s);
}

/** Shared, mutable: the page writes, the scene reads (and the other way round for `held`). */
export const S = {
  push: false,
  drag: false,
  ptr: { x: 0, y: 0 }, // NDC inside the scene
  screen: { x: -999, y: -999, r: 0 }, // the stone on screen, px inside the scene
  touched: false,
  todayUp: false,
  held: -1,
  onHeld: (_i: number) => {},
  place: null as null | ((level: number, where: 'foot' | 'top' | number) => void),
};

/** What the camera frames on a level: left, right in world x. */
export function frameOf(l: Level) {
  const e = onSlope(l, l.len);
  return { left: X0 - 0.6, right: e.x + (l.top ? 2.5 : 0.5) };
}
