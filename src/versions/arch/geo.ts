// The arch: thirteen voussoirs on a semicircle, the keystone wider than the
// rest. One world unit is a metre; the arch stands with its centre on the floor.
import * as THREE from 'three';

export const R1 = 3.0;   // intrados
export const R2 = 4.6;   // extrados
export const RM = (R1 + R2) / 2;
export const D = 1.5;    // depth of the arch, front to back
export const N = 13;
export const KEY = 6;
const GAP = 0.0045;      // half a joint, in radians

// The word cut into each stone's face, left springer to right springer.
export const WORDS = ['CHAMPION', 'ABOUT', 'COACH', 'RESEARCH', 'WORK', 'NOW', 'ARMAAN|SETH', 'TODAY', 'CODE', 'RECORD', 'ASIDE', 'CONTACT', 'CHAMPION'];

const WEIGHT = WORDS.map((_, i) => (i === KEY ? 1.55 : i === 0 || i === N - 1 ? 1.12 : 1));
const TOTAL = WEIGHT.reduce((a, b) => a + b, 0);

export type Stone = { i: number; a0: number; a1: number; am: number; h: number; word: string };

/** Angles of each stone, measured from +x, left (pi) to right (0). */
export const STONES: Stone[] = (() => {
  const out: Stone[] = [];
  let a = Math.PI;
  for (let i = 0; i < N; i++) {
    const span = (WEIGHT[i] / TOTAL) * Math.PI;
    const a0 = a, a1 = a - span;
    out.push({ i, a0, a1, am: (a0 + a1) / 2, h: span / 2, word: WORDS[i] });
    a = a1;
  }
  return out;
})();

/** World position and z rotation of a stone at rest. */
export function home(s: Stone, r = RM, cx = 0) {
  return { x: cx + r * Math.cos(s.am), y: r * Math.sin(s.am), rz: s.am - Math.PI / 2 };
}

/** The stone's outline in its own frame: radial direction up, centred on the middle radius. */
export function outline(h: number, r1: number, r2: number, groundL = false, groundR = false, seg = 10): THREE.Vector2[] {
  const rm = (r1 + r2) / 2;
  const lo = Math.PI / 2 - h + (groundR ? 0 : GAP), hi = Math.PI / 2 + h - (groundL ? 0 : GAP);
  const pts: THREE.Vector2[] = [];
  for (let k = 0; k <= seg; k++) { const p = lo + ((hi - lo) * k) / seg; pts.push(new THREE.Vector2(r2 * Math.cos(p), r2 * Math.sin(p) - rm)); }
  for (let k = seg; k >= 0; k--) { const p = lo + ((hi - lo) * k) / seg; pts.push(new THREE.Vector2(r1 * Math.cos(p), r1 * Math.sin(p) - rm)); }
  return pts;
}

export function stoneGeometry(pts: THREE.Vector2[], depth: number, bevel = 0.045) {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), {
    depth: depth - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 3, curveSegments: 1,
  });
  g.translate(0, 0, -depth / 2 + bevel);
  g.computeVertexNormals();
  return g;
}

/** Points of a convex hull for the collider (the sector is near enough convex). */
export function hullPoints(pts: THREE.Vector2[], depth: number) {
  const thin = pts.filter((_, k) => k % 2 === 0 || k === pts.length - 1);
  const arr = new Float32Array(thin.length * 6);
  thin.forEach((p, k) => arr.set([p.x, p.y, depth / 2 - 0.01, p.x, p.y, -depth / 2 + 0.01], k * 6));
  return arr;
}

/* ───────── cut lettering ───────── */

const FONT = '"Archivo Variable", "Archivo", sans-serif';
export const PX = 256; // canvas pixels per metre on a face texture

/**
 * A face texture for a stone: plaster ground with the word cut in. `dir` is
 * the direction the text runs in the stone's own frame. The texture maps the
 * square [-S, S] of the stone's frame.
 */
export function faceTexture(text: string, dir: 'x' | '+y' | '-y', box: { w: number; h: number }, opts: { S?: number; ground?: string; deep?: string; lip?: string; alpha?: boolean; weight?: number } = {}) {
  const S = opts.S ?? 1.1;
  const size = 1024, k = size / (2 * S);
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d')!;
  if (!opts.alpha) { g.fillStyle = opts.ground ?? '#ffffff'; g.fillRect(0, 0, size, size); }
  g.translate(size / 2, size / 2);
  if (dir === '+y') g.rotate(-Math.PI / 2);
  if (dir === '-y') g.rotate(Math.PI / 2);
  const lines = text.split('|');
  const W = (dir === 'x' ? box.w : box.h) * k * 0.8, Hh = (dir === 'x' ? box.h : box.w) * k * 0.62;
  const set = (px: number) => { g.font = `${opts.weight ?? 760} ${px}px ${FONT}`; try { (g as unknown as { fontStretch: string }).fontStretch = 'expanded'; } catch { /* older canvas */ } (g as unknown as { letterSpacing: string }).letterSpacing = `${px * 0.08}px`; };
  let px = Hh / lines.length / 1.05;
  set(px);
  // measureText can ignore the expanded stretch; allow for it so nothing runs off the stone.
  const widest = Math.max(...lines.map((l) => g.measureText(l).width * 1.22 + px * 0.08 * l.length));
  if (widest > W) { px *= W / widest; set(px); }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const lh = px * 1.1, y0 = -((lines.length - 1) * lh) / 2;
  const off = Math.max(1.5, px * 0.045);
  lines.forEach((l, n) => {
    const y = y0 + n * lh;
    // A V-cut read from the key light: the far wall dark, the near wall catches light.
    g.fillStyle = opts.lip ?? '#d6d0c6'; g.fillText(l, off, y + off);
    g.fillStyle = opts.deep ?? '#8f877c'; g.fillText(l, 0, y);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.repeat.set(1 / (2 * S), 1 / (2 * S));
  t.offset.set(0.5, 0.5);
  return t;
}

/** Which way a stone's word runs, so it reads left to right and as level as it can. */
export function runOf(s: Stone): 'x' | '+y' | '-y' {
  if (Math.abs(Math.sin(s.am)) > 0.83) return 'x';
  return Math.cos(s.am) > 0 ? '+y' : '-y';
}

/** A plain fine-grain texture for the plaster's tooth. */
export function grain(size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d')!;
  const im = g.createImageData(size, size);
  let s = 11; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < size * size; i++) { const v = 128 + (rnd() - 0.5) * 46; im.data.set([v, v, v, 255], i * 4); }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3);
  return t;
}
