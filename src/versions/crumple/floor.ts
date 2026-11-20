// The floor: shared state between the page and the scene, the crumple field, and the printed sheets.
import * as THREE from 'three';
import { createNoise2D, createNoise3D } from 'simplex-noise';

export const SWEEP = '#dcdedd';
export const INK = '#121314';
export const BLUE = '#2c4a6e';
export const PAPER = '#f7f7f4';

export type Sheet = {
  id: string;
  sec: number;              // which section's ball it is
  x: number; z: number; yaw: number;
  w: number; h: number; r: number;
  pristine?: boolean;       // arrives flat, no creases (the two championships)
  fresh?: boolean;          // arrives flat but is ordinary paper (today's note)
  locked?: boolean;         // will not open (up next)
  auto?: boolean;           // opens itself when its section arrives
  main?: boolean;           // the section's own sheet (keyboard target)
  layer: number;            // tiny height offset so flat sheets do not fight
  print: (g: CanvasRenderingContext2D, W: number, H: number) => void;
  img?: string;             // a picture printed on it
  tap?: () => void;         // what opening it means to the page
};

export type Live = {
  t: number; v: number; target: number; touched: boolean;
  shown: boolean; y: number; vy: number; spin: number; glide: number; landedAt: number;
  gu: number; gv: number; dirty: boolean; hover?: boolean;
};

/** The one mutable store both halves read. */
export const S = {
  active: 0,
  frac: 0,
  live: new Map<string, Live>(),
  sheets: [] as Sheet[],
  heroOpen: (_o: boolean) => {},
  lit: (_i: number) => {},
  note: (_i: number) => {},
  toggle: null as null | (() => void),
};

export function liveOf(id: string): Live {
  let l = S.live.get(id);
  if (!l) {
    l = { t: 0, v: 0, target: 0, touched: false, shown: false, y: 4, vy: 0, spin: 0, glide: 0, landedAt: -1, gu: 0, gv: 1, dirty: true };
    S.live.set(id, l);
  }
  return l;
}

/** Open (or close) a sheet from the page. */
export function setOpen(id: string, open: boolean) {
  const l = liveOf(id);
  l.target = open ? 1 : 0; l.touched = true;
}

// ---------------------------------------------------------------- the crumple field

function mulberry(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export type Field = { seg: number; ball: Float32Array; crease: Float32Array; uv: Float32Array; index: Uint32Array; n: number };

const fields = new Map<string, Field>();

/** One precomputed crumple per (resolution, variant): the ball shape and the creases the flat sheet keeps. */
export function fieldOf(seg: number, variant: number): Field {
  const key = seg + ':' + variant;
  const hit = fields.get(key); if (hit) return hit;
  const rand = mulberry(1013 + variant * 7919);
  const n3 = createNoise3D(rand), n2 = createNoise2D(rand);
  const lines = Array.from({ length: 9 }, () => {
    const a = rand() * Math.PI;
    return { nx: Math.cos(a), ny: Math.sin(a), c: (rand() * 2 - 1) * 0.85, k: (rand() > 0.5 ? 1 : -1) * (0.5 + rand() * 0.7) };
  });
  const unit = () => { const a = rand() * Math.PI * 2, z = rand() * 2 - 1, r = Math.sqrt(1 - z * z); return { x: r * Math.cos(a), y: z, z: r * Math.sin(a) }; };
  const planes = Array.from({ length: 17 }, () => ({ ...unit(), o: 0.76 + rand() * 0.16 }));
  const valleys = Array.from({ length: 7 }, () => ({ ...unit(), a: 0.08 + rand() * 0.08 }));
  const n = (seg + 1) * (seg + 1);
  const ball = new Float32Array(n * 3), crease = new Float32Array(n), uv = new Float32Array(n * 2);
  let lo = Infinity;
  for (let j = 0; j <= seg; j++) for (let i = 0; i <= seg; i++) {
    const k = j * (seg + 1) + i;
    const u = (i / seg) * 2 - 1, v = (j / seg) * 2 - 1;
    // octahedral fold of the square onto a sphere: the middle of the page ends up on top
    let x = u, z = v; const y = 1 - Math.abs(u) - Math.abs(v);
    if (y < 0) { x = (1 - Math.abs(v)) * Math.sign(u || 1); z = (1 - Math.abs(u)) * Math.sign(v || 1); }
    const len = Math.hypot(x, y, z) || 1;
    const dx = x / len, dy = y / len, dz = z / len;
    // straight creases: a sum of folded planes, plus a little crumple noise
    let h = 0;
    for (const L of lines) h += L.k * Math.abs(u * L.nx + v * L.ny - L.c);
    h = h * 0.042 + 0.01 * (1 - Math.abs(n2(u * 3.1, v * 3.1)));
    // the ball: a convex shell of flat facets with sharp edges, cut by a few V-shaped valley folds
    let d = 9;
    for (const P of planes) d = Math.min(d, P.o / Math.max(0.25, dx * P.x + dy * P.y + dz * P.z));
    d = Math.min(d, 1.08);
    for (const M of valleys) d -= M.a * Math.max(0, 1 - Math.abs(dx * M.x + dy * M.y + dz * M.z) * 7);
    d += h * 0.5 + 0.02 * n3(dx * 6, dy * 6, dz * 6);
    ball[k * 3] = dx * d; ball[k * 3 + 1] = dy * d; ball[k * 3 + 2] = dz * d;
    crease[k] = h; lo = Math.min(lo, h);
    uv[k * 2] = i / seg; uv[k * 2 + 1] = 1 - j / seg;
  }
  for (let k = 0; k < n; k++) crease[k] -= lo;
  const index = new Uint32Array(seg * seg * 6);
  let p = 0;
  for (let j = 0; j < seg; j++) for (let i = 0; i < seg; i++) {
    const a = j * (seg + 1) + i, b = a + 1, c = a + seg + 1, d = c + 1;
    index[p++] = a; index[p++] = c; index[p++] = b;
    index[p++] = b; index[p++] = c; index[p++] = d;
  }
  const f = { seg, ball, crease, uv, index, n };
  fields.set(key, f);
  return f;
}

export function sheetGeometry(f: Field) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(f.n * 3), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(f.n * 3), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(f.uv, 2));
  g.setIndex(new THREE.BufferAttribute(f.index, 1));
  return g;
}

const sm = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** Write the sheet's shape at openness t (0 ball, 1 flat). The grabbed edge leads, the far corner follows. */
export function shape(g: THREE.BufferGeometry, f: Field, s: Sheet, l: Live) {
  const pos = g.attributes.position.array as Float32Array;
  const seg = f.seg;
  const keep = s.pristine || s.fresh ? 0 : 1;
  const t = Math.min(1, Math.max(0, l.t));
  const flap = Math.max(-0.3, Math.min(0.3, l.v * 0.05));
  const R = s.r, cy = R * 0.86;
  const lift = Math.max(s.w, s.h) * 0.05;
  for (let j = 0; j <= seg; j++) for (let i = 0; i <= seg; i++) {
    const k = j * (seg + 1) + i;
    const u = (i / seg) * 2 - 1, v = (j / seg) * 2 - 1;
    const dist = Math.hypot(u - l.gu, v - l.gv) / 2.83;
    const tv = sm(t * 1.55 - dist * 0.55);
    const fx = u * s.w * 0.5, fz = v * s.h * 0.5;
    const fy = 0.004 + s.layer + f.crease[k] * keep * Math.min(s.w, s.h) * 0.75 * (0.6 + 0.4 * tv);
    const bx = f.ball[k * 3] * R, by = cy + f.ball[k * 3 + 1] * R * 0.88, bz = f.ball[k * 3 + 2] * R;
    const bulge = Math.sin(Math.PI * tv) * lift * (1 - dist) + flap * tv * (1 - tv) * 4 * lift * (0.4 + dist);
    pos[k * 3] = bx + (fx - bx) * tv;
    pos[k * 3 + 1] = Math.max(0.003, by + (fy - by) * tv + bulge);
    pos[k * 3 + 2] = bz + (fz - bz) * tv;
  }
  g.attributes.position.needsUpdate = true;
  g.computeVertexNormals();
  g.computeBoundingSphere();
}

// ---------------------------------------------------------------- printing

export const DISPLAY = '"Archivo Variable", "Archivo", sans-serif';

export function fit(g: CanvasRenderingContext2D, text: string, maxW: number, size: number, weight = 800) {
  let s = size;
  for (;;) {
    g.font = `${weight} ${s}px ${DISPLAY}`;
    (g as CanvasRenderingContext2D & { fontStretch?: string }).fontStretch = 'semi-expanded';
    if (g.measureText(text).width <= maxW || s < 10) return s;
    s -= 2;
  }
}

export function paper(g: CanvasRenderingContext2D, W: number, H: number) {
  g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
  const rand = mulberry(W * 7 + H);
  for (let i = 0; i < 900; i++) {
    const v = rand() > 0.5 ? 255 : 120;
    g.fillStyle = `rgba(${v},${v},${v},${0.03 + rand() * 0.04})`;
    g.fillRect(rand() * W, rand() * H, 1 + rand() * 2, 1 + rand() * 2);
  }
}

/** The usual print: a big heading set top left, a hairline, a small line under it. */
export function printHeading(lines: string[], small?: string, ink = INK) {
  return (g: CanvasRenderingContext2D, W: number, H: number) => {
    paper(g, W, H);
    const m = W * 0.1;
    let y = H * 0.12;
    g.fillStyle = ink; g.textBaseline = 'top';
    const size = Math.min(...lines.map((l) => fit(g, l, W - m * 2, W * 0.22)));
    for (const l of lines) { fit(g, l, W - m * 2, size); g.fillText(l, m, y); y += size * 0.98; }
    y += H * 0.03;
    g.fillRect(m, y, W - m * 2, Math.max(1, W * 0.004));
    if (small) {
      y += H * 0.035;
      g.font = `500 ${Math.round(W * 0.042)}px ${DISPLAY}`;
      wrap(g, small, m, y, W - m * 2, W * 0.056);
    }
  };
}

export function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines = 6) {
  const words = text.split(' ');
  let line = '', n = 0;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, y); y += lh; line = w; n++;
      if (n >= maxLines) return y;
    } else line = test;
  }
  if (line) { g.fillText(line, x, y); y += lh; }
  return y;
}

/** A sheet's texture: printed once the fonts are in, reprinted when its picture arrives. */
export function textureOf(s: Sheet, W: number) {
  const H = Math.round((W * s.h) / s.w);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  let img: HTMLImageElement | null = null;
  const draw = () => {
    s.print(g, W, H);
    if (img && img.complete && img.naturalWidth) {
      const m = W * 0.1, iw = W - m * 2, ih = Math.min(H * 0.5, (iw * img.naturalHeight) / img.naturalWidth);
      const y = H - m - ih;
      g.drawImage(img, 0, 0, img.naturalWidth, (img.naturalWidth * ih) / iw, m, y, iw, ih);
      g.strokeStyle = 'rgba(18,19,20,0.35)'; g.lineWidth = 1; g.strokeRect(m + 0.5, y + 0.5, iw - 1, ih - 1);
    }
    tex.needsUpdate = true;
  };
  draw();
  document.fonts?.ready.then(draw).catch(() => {});
  document.fonts?.load(`800 40px ${DISPLAY}`).then(draw).catch(() => {});
  if (s.img) { img = new Image(); img.onload = draw; img.src = import.meta.env.BASE_URL + s.img; }
  return tex;
}
