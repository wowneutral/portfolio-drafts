// Remixed from edoardolunardi/infinite-canvas (Codrops "Infinite Canvas", MIT): constants, chunk offsets, seeded chunk planes.
import * as THREE from 'three';

export const CHUNK_SIZE = 100;
export const RENDER_DISTANCE = 2;
export const CHUNK_FADE_MARGIN = 1;
export const PER_CHUNK = 3; // the base used 5; fewer frames keeps the space calm
export const MAX_VELOCITY = 3.2;
export const DEPTH_FADE_START = 150;
export const DEPTH_FADE_END = 290;
export const KEYBOARD_SPEED = 0.18;
export const VELOCITY_LERP = 0.16;
export const VELOCITY_DECAY = 0.9;
export const INITIAL_CAMERA_Z = 50;

export const PAPER = [238 / 255, 237 / 255, 233 / 255] as const;

export const CHUNK_OFFSETS = (() => {
  const max = RENDER_DISTANCE + CHUNK_FADE_MARGIN;
  const out: { dx: number; dy: number; dz: number }[] = [];
  for (let dx = -max; dx <= max; dx++) for (let dy = -max; dy <= max; dy++) for (let dz = -max; dz <= max; dz++) out.push({ dx, dy, dz });
  return out;
})();

export const seededRandom = (seed: number) => { const x = Math.sin(seed * 9999) * 10000; return x - Math.floor(x); };
export const hashString = (str: string) => { let h = 0; for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0; return Math.abs(h); };

// The eight projects hang deep in the same space, one stop each.
export const FRAME_H = 15; // the empty frame at the origin, 16:10
export const PROJECTS = Array.from({ length: 8 }, (_, i) => new THREE.Vector3(i % 2 ? 12 : -12, ((i % 3) - 1) * 9, -320 - i * 170));
export const PROJECT_W = 24;
export const PROJECT_DIST = 36;

/** Keep the origin frame and every project stop clear of drafts. */
function blocked(x: number, y: number, z: number) {
  if (Math.abs(x) < 36 && Math.abs(y) < 25 && z > -150 && z < 80) return true;
  for (const p of PROJECTS) if (Math.abs(x - p.x) < 26 && Math.abs(y - p.y) < 20 && z > p.z - 34 && z < p.z + PROJECT_DIST + 12) return true;
  return false;
}

export type Plane = { x: number; y: number; z: number; h: number; pick: number };
const cache = new Map<string, Plane[]>();

export function chunkPlanes(cx: number, cy: number, cz: number): Plane[] {
  const key = `${cx},${cy},${cz}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const seed = hashString(key), out: Plane[] = [];
  for (let i = 0; i < PER_CHUNK; i++) {
    const s = seed + i * 1000, r = (n: number) => seededRandom(s + n);
    const x = cx * CHUNK_SIZE + r(0) * CHUNK_SIZE, y = cy * CHUNK_SIZE + r(1) * CHUNK_SIZE, z = cz * CHUNK_SIZE + r(2) * CHUNK_SIZE;
    if (blocked(x, y, z)) continue;
    out.push({ x, y, z, h: 11 + r(4) * 6, pick: Math.floor(r(5) * 1_000_000) });
  }
  cache.set(key, out);
  if (cache.size > 1200) cache.delete(cache.keys().next().value as string);
  return out;
}

export type DraftItem = { slug: string; n: number; name: string; cell: number };
export type Sheet = { file: string; cols: number; rows: number; w: number; h: number; items: DraftItem[] };
export type Drafts = { portfolio: Sheet; skeptical: Sheet };

const BASE = import.meta.env.BASE_URL;
let draftsP: Promise<Drafts> | null = null;
export const loadDrafts = () => (draftsP ??= fetch(`${BASE}hundredth/drafts.json`).then((r) => r.json() as Promise<Drafts>));

const loader = new THREE.TextureLoader();
const texP = new Map<string, Promise<THREE.Texture>>();
export function loadTexture(url: string) {
  let p = texP.get(url);
  if (!p) {
    p = new Promise((res, rej) => loader.load(url, (t) => {
      t.colorSpace = THREE.NoColorSpace; // the shaders write raw sRGB, no conversion
      t.anisotropy = 8;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      res(t);
    }, undefined, rej));
    texP.set(url, p);
  }
  return p;
}

export const SKEPTICAL_DRAFTS = 'https://wowneutral.github.io/skeptical-draft2/';
export const caption = (it: DraftItem, team: boolean) => `${it.name}, ${team ? 'Skeptical draft' : 'draft'} ${it.n}`;
