// The building site: where each piece is set, which section calls it, and
// where the camera stands for each section. One unit is a metre.
import GLYPHS from './glyphs.json';

export const STOPS = ['hero', 'about', 'win0', 'win1', 'team', 'next', 'research', 'work', 'github', 'today', 'now', 'record', 'off', 'contact'] as const;
export type Stop = (typeof STOPS)[number];
export const stopIndex = (s: Stop) => STOPS.indexOf(s);

export type Kind = 'block' | 'pillar' | 'slab' | 'beam';
export const KINDS: Kind[] = ['block', 'pillar', 'slab', 'beam'];
export const KEYS: Record<string, Kind> = { b: 'block', p: 'pillar', s: 'slab', e: 'beam' };
export const SIZE: Record<Kind, [number, number, number]> = {
  block: [0.9, 0.9, 0.9], pillar: [0.55, 2.4, 0.55], slab: [2.0, 0.26, 1.2], beam: [3.0, 0.5, 0.55],
};
/** Where the visitor's pieces are set down, in the empty ground right of the site. */
export const YARD: Record<Kind, [number, number]> = { block: [6.1, 1.35], pillar: [6.75, -0.7], slab: [8.4, 1.8], beam: [9.1, -0.3] };

export type V3 = [number, number, number];
export type PieceDef = { id: string; size: V3; pos: V3; ry?: number; rx?: number; word?: string; stop: Stop; delay?: number; work?: number };

const TOP = 2.4 + 0.55 + 0.3; // pillar, beam, slab
export const SITE: PieceDef[] = [
  { id: 'about', size: [0.9, 0.9, 0.9], pos: [-2.45, 0.45, 0.55], ry: 0.06, word: 'ABOUT', stop: 'about' },
  { id: 'pL', size: [0.55, 2.4, 0.55], pos: [-1.15, 1.2, 0], word: 'CHAMPION', stop: 'win0' },
  { id: 'pR', size: [0.55, 2.4, 0.55], pos: [1.15, 1.2, 0], word: 'CHAMPION', stop: 'win1' },
  { id: 'beam', size: [3.2, 0.55, 0.6], pos: [0, 2.675, 0], word: 'SKEPTICAL', stop: 'team' },
  { id: 'next0', size: [0.8, 0.42, 0.52], pos: [-2.75, 0.21, 2.05], ry: 0.32, stop: 'next' },
  { id: 'next1', size: [0.8, 0.42, 0.52], pos: [-1.65, 0.21, 2.35], ry: -0.22, stop: 'next', delay: 0.3 },
  { id: 'research', size: [3.9, 0.3, 1.3], pos: [0, 3.1, 0.05], word: 'RESEARCH', stop: 'research' },
  ...Array.from({ length: 8 }, (_, i): PieceDef => ({
    id: 'w' + i, size: [0.52, 0.84, 0.07], pos: [-7.0 + i * 0.62, 0.42, -1.55], rx: -0.1, word: String(i + 1).padStart(2, '0'), stop: 'work', delay: i * 0.14, work: i,
  })),
  { id: 'now', size: [0.72, 0.72, 0.72], pos: [2.35, 0.36, 0.95], ry: -0.08, word: 'NOW', stop: 'now' },
  { id: 'record', size: [1.25, 0.5, 0.62], pos: [-2.45, 1.15, 0.55], ry: 0.02, word: 'RECORD', stop: 'record' },
  { id: 'off', size: [0.62, 0.46, 0.56], pos: [2.38, 0.95, 0.95], ry: 0.12, word: 'OFF', stop: 'off' },
  { id: 'contact', size: [2.7, 0.24, 0.95], pos: [0, 0.12, 0.95], word: 'CONTACT', stop: 'contact' },
];

/** One small slab per daily note, stacked on top of the gate; the latest on top. */
export function dayPieces(days: string[]): PieceDef[] {
  const list = days.slice(0, 4).reverse();
  return list.map((d, j) => ({
    id: 'day' + j + d, size: [0.82, 0.24, 0.6], pos: [0.05 * (j % 2 ? 1 : -1), TOP + 0.12 + j * 0.245, 0.1], ry: (j % 2 ? 0.07 : -0.05) * (j + 1) * 0.6,
    word: d, stop: 'today', delay: j * 0.3,
  }));
}

/** One small block per recent commit (or per repo), laid in courses beside the gate. */
export const PER = 6;
export function coursePieces(bits: string[]): PieceDef[] {
  return bits.slice(0, 30).map((ch, i) => ({
    id: 'c' + i + ch, size: [0.32, 0.24, 0.3], pos: [1.95 + (i % PER) * 0.355, 0.12 + Math.floor(i / PER) * 0.243, -1.15],
    word: /[A-Z0-9]/.test(ch) ? ch : undefined, stop: 'github', delay: i * 0.07,
  }));
}

export type Shot = { t: V3; w: number; az: number; el: number };
export const SHOTS: Record<Stop, Shot> = {
  hero: { t: [7.55, 0.95, 0.55], w: 6.4, az: -14, el: 8 },
  about: { t: [-1.6, 0.9, 0.5], w: 7, az: -16, el: 8 },
  win0: { t: [-0.75, 1.3, 0.2], w: 5.8, az: -12, el: 7 },
  win1: { t: [0.45, 1.3, 0.2], w: 5.8, az: -9, el: 7 },
  team: { t: [0, 1.75, 0.2], w: 6.2, az: -12, el: 8 },
  next: { t: [-1.3, 0.85, 1.2], w: 6.6, az: -18, el: 10 },
  research: { t: [0, 2.0, 0.2], w: 6.8, az: -14, el: 9 },
  work: { t: [-4.75, 0.5, -1.3], w: 5.6, az: -8, el: 9 },
  github: { t: [2.9, 0.45, -1.15], w: 3.6, az: 42, el: 20 },
  today: { t: [0, 2.95, 0.2], w: 4.8, az: -12, el: 11 },
  now: { t: [1.5, 1.15, 0.4], w: 6.4, az: -18, el: 9 },
  record: { t: [-1.6, 1.25, 0.4], w: 6.4, az: -14, el: 9 },
  off: { t: [1.6, 1.1, 0.4], w: 6, az: -24, el: 10 },
  contact: { t: [0.3, 1.75, 0], w: 9.8, az: 0, el: 4 },
};

/* ───────── glyph outlines (Schibsted Grotesk 800), for cast faces, the call row and the drawing ───────── */

type G = { ch: string; d: string; x: number; advance: number };
const byCh = new Map((GLYPHS.glyphs as G[]).map((g) => [g.ch, g]));
export const CAP = 715; // measured below on first use
export type Run = { parts: { d: string; dx: number }[]; width: number; top: number; bottom: number };

const runs = new Map<string, Run>();
/** A word as outline paths (y down, baseline 0, 1000 units per em) with its ink box. */
export function glyphRun(text: string, track = 30): Run {
  const key = text + ':' + track;
  const hit = runs.get(key); if (hit) return hit;
  let pen = 0, top = 0, bottom = 0;
  const parts: Run['parts'] = [];
  for (const ch of text.toUpperCase()) {
    const g = byCh.get(ch);
    if (!g) { pen += 260; continue; }
    const nums = (g.d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
    for (let i = 1; i < nums.length; i += 2) { top = Math.min(top, nums[i]); bottom = Math.max(bottom, nums[i]); }
    parts.push({ d: g.d, dx: pen - g.x });
    pen += g.advance + track;
  }
  const r = { parts, width: Math.max(1, pen - track), top, bottom };
  runs.set(key, r);
  return r;
}

/** The shared state between the page and the scene; read every frame. */
export const S = {
  tops: [] as number[],
  workTops: [] as number[],
  calls: [] as Kind[],
  onLand: null as null | ((k: Kind) => void),
  peek: 0,
  shake: 0,
};
