// A heap from any string: rasterise the word in Anton, cut the filled cells into
// rectangles, and stand each rectangle somewhere along the ray from one light
// position to where it belongs on the wall. From that one point the shadows meet.
import * as THREE from 'three';

export const rng = (seed: number) => {
  let s = (seed >>> 0) || 7;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
};
export const hash = (str: string) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};

type Rect = { x: number; y: number; w: number; h: number };

/** Filled cells of the word, `rows` cells to a capital. */
function raster(lines: string[], rows: number) {
  const px = rows / 0.86;
  const gap = Math.round(rows * 0.32);
  const c = document.createElement('canvas');
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.font = `400 ${px}px Anton`;
  const w = Math.ceil(Math.max(...lines.map((l) => g.measureText(l).width))) + 4;
  const h = lines.length * rows + (lines.length - 1) * gap + 4;
  c.width = w; c.height = h;
  g.font = `400 ${px}px Anton`;
  g.fillStyle = '#000';
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  lines.forEach((l, i) => g.fillText(l, w / 2, 2 + rows + i * (rows + gap)));
  const a = g.getImageData(0, 0, w, h).data;
  const on = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) on[i] = a[i * 4 + 3] > 120 ? 1 : 0;
  // trim to the inked box
  let x0 = w, x1 = 0, y0 = h, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (on[y * w + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { on, w, h, x0, x1, y0, y1 };
}

/** Greedy cover of the filled cells by rectangles (sticks and slabs). */
function rects(on: Uint8Array, w: number, h: number): Rect[] {
  const used = new Uint8Array(w * h);
  const free = (x: number, y: number) => x < w && y < h && on[y * w + x] && !used[y * w + x];
  const out: Rect[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!free(x, y)) continue;
    // across first
    let aw = 0; while (free(x + aw, y)) aw++;
    let ah = 1; while (Array.from({ length: aw }, (_, i) => free(x + i, y + ah)).every(Boolean)) ah++;
    // down first
    let bh = 0; while (free(x, y + bh)) bh++;
    let bw = 1; while (Array.from({ length: bh }, (_, i) => free(x + bw, y + i)).every(Boolean)) bw++;
    const r = aw * ah >= bw * bh ? { x, y, w: aw, h: ah } : { x, y, w: bw, h: bh };
    for (let j = r.y; j < r.y + r.h; j++) for (let i = r.x; i < r.x + r.w; i++) used[j * w + i] = 1;
    out.push(r);
  }
  return out;
}

export type Built = {
  mats: THREE.Matrix4[];
  /** where each piece sits, for the drop-in */
  centers: THREE.Vector3[];
  box: THREE.Box3;
  wordW: number; wordH: number;
};

/**
 * The heap for `lines`, cast by a light at `L` onto the wall plane z = 0, the word
 * centred at (0, cy) and fitted inside maxW by maxH metres.
 */
export function build(lines: string[], rows: number, L: THREE.Vector3, cy: number, maxW: number, maxH: number, seed: number): Built {
  const R = raster(lines, rows);
  const gw = R.x1 - R.x0 + 1, gh = R.y1 - R.y0 + 1;
  const k = Math.min(maxW / gw, maxH / gh);
  const rand = rng(seed);
  const mats: THREE.Matrix4[] = [];
  const centers: THREE.Vector3[] = [];
  const box = new THREE.Box3();
  const P = new THREE.Vector3(), dir = new THREE.Vector3(), X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), C = new THREE.Vector3();
  const e = k * 0.18;
  for (const r of rects(R.on, R.w, R.h)) {
    const cx = (r.x + r.w / 2 - R.x0 - gw / 2) * k;
    const cyy = cy + (gh / 2 - (r.y + r.h / 2 - R.y0)) * k;
    P.set(cx, cyy, 0);
    const f = 0.3 + rand() * 0.24;
    const dist = P.distanceTo(L);
    const depth = 0.05 + rand() * 0.11 + Math.min(r.w, r.h) * k * f * 0.6;
    const d = depth / dist;
    dir.subVectors(P, L).normalize();
    X.set((r.w * k + e * 2) * f, 0, 0);
    Y.set(0, (r.h * k + e * 2) * f, 0);
    Z.copy(dir).multiplyScalar(-depth);
    C.copy(L).lerp(P, f + d / 2);
    const m = new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(C);
    mats.push(m);
    centers.push(C.clone());
    box.expandByPoint(C.clone().addScaledVector(X, 0.5).addScaledVector(Y, 0.5));
    box.expandByPoint(C.clone().addScaledVector(X, -0.5).addScaledVector(Y, -0.5));
  }
  return { mats, centers, box, wordW: gw * k, wordH: gh * k };
}

/** Break a long word over two lines of roughly equal length. */
export function split(word: string, max: number): string[] {
  if (word.length <= max || !word.includes(' ')) return [word];
  const parts = word.split(' ');
  let best = [word], score = Infinity;
  for (let i = 1; i < parts.length; i++) {
    const a = parts.slice(0, i).join(' '), b = parts.slice(i).join(' ');
    const s = Math.max(a.length, b.length);
    if (s < score) { score = s; best = [a, b]; }
  }
  return best;
}
