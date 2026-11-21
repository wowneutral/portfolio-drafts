// Outline parsing and bevelled extrusion, copied from the letters draft (src/versions/letters/geo.ts), trimmed to what the portal needs.
import * as THREE from 'three';

type P2 = { x: number; y: number };

/** A path's subpaths as sampled polygons (y flipped to point up), scaled by k. */
function subpaths(d: string, k: number, quality: number): P2[][] {
  const out: P2[][] = [];
  let cur: THREE.Path | null = null;
  const X = (v: number) => v * k, Y = (v: number) => -v * k;
  const re = /([MLQCZ])([^MLQCZ]*)/g;
  let m: RegExpExecArray | null;
  const close = () => {
    if (!cur) return;
    const raw = cur.getPoints(quality);
    const pts = raw.filter((p, i) => i === 0 || p.distanceTo(raw[i - 1]) > 1e-5).map((p) => ({ x: p.x, y: p.y }));
    const a = pts[0], b = pts[pts.length - 1];
    if (pts.length > 2 && Math.hypot(a.x - b.x, a.y - b.y) < 1e-5) pts.pop();
    if (pts.length > 2) out.push(pts);
    cur = null;
  };
  while ((m = re.exec(d))) {
    const n = (m[2].match(/-?\d*\.?\d+/g) ?? []).map(Number);
    if (m[1] === 'M') { close(); cur = new THREE.Path(); cur.moveTo(X(n[0]), Y(n[1])); }
    else if (m[1] === 'L' && cur) cur.lineTo(X(n[0]), Y(n[1]));
    else if (m[1] === 'Q' && cur) cur.quadraticCurveTo(X(n[0]), Y(n[1]), X(n[2]), Y(n[3]));
    else if (m[1] === 'C' && cur) cur.bezierCurveTo(X(n[0]), Y(n[1]), X(n[2]), Y(n[3]), X(n[4]), Y(n[5]));
    else if (m[1] === 'Z') close();
  }
  close();
  return out;
}

const area = (p: P2[]) => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i].x * q.y - q.x * p[i].y; } return a / 2; };
const inside = (pt: P2, poly: P2[]) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
};

/**
 * A word from glyphs.mjs output as one bevelled solid, `cap` units tall,
 * centred on x, standing with its baseline at y = 0 and its back at z = 0.
 */
export function wordSolid(glyphs: { d: string }[], capUnits: number, cap: number, depth: number, bevel: number): THREE.ExtrudeGeometry {
  const k = cap / capUnits;
  const subs = glyphs.flatMap((g) => subpaths(g.d, k, 6));
  const order = subs.map((s) => ({ s, a: Math.abs(area(s)) })).sort((a, b) => b.a - a.a);
  const solids: { pts: P2[]; holes: P2[][] }[] = [];
  for (const o of order) {
    const host = solids.find((S) => inside(o.s[0], S.pts) && !S.holes.some((h) => inside(o.s[0], h)));
    if (host) host.holes.push(o.s); else solids.push({ pts: o.s, holes: [] });
  }
  const v2 = (p: P2[]) => p.map((q) => new THREE.Vector2(q.x, q.y));
  const shapes = solids.map((S) => { const sh = new THREE.Shape(v2(S.pts)); sh.holes = S.holes.map((h) => new THREE.Path(v2(h))); return sh; });
  const g = new THREE.ExtrudeGeometry(shapes, {
    depth: depth - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 3, curveSegments: 1,
  });
  g.computeBoundingBox();
  const b = g.boundingBox!;
  g.translate(-(b.min.x + b.max.x) / 2, 0, -b.min.z);
  g.computeVertexNormals();
  return g;
}

/** A small tiling noise texture (after the letters draft): orange peel on lacquer, tooth on paper. */
export function noiseTexture(size: number, draw: (g: CanvasRenderingContext2D, rnd: () => number, size: number) => void, repeat = 1): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d')!;
  let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  draw(g, rnd, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 4;
  return t;
}

/** A photo-studio sweep (after the letters draft): a floor that curves up into a wall. */
export function sweepGeometry(halfW: number, zFront: number, zBack: number, R: number, height: number): THREE.BufferGeometry {
  const prof: [number, number][] = [[zFront, 0], [zBack + R, 0]];
  for (let i = 1; i <= 18; i++) { const a = (i / 18) * Math.PI / 2; prof.push([zBack + R - R * Math.sin(a), R - R * Math.cos(a)]); }
  prof.push([zBack, height]);
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  let s = 0;
  prof.forEach(([z, y], i) => {
    if (i) s += Math.hypot(z - prof[i - 1][0], y - prof[i - 1][1]);
    for (const x of [-halfW, halfW]) { pos.push(x, y, z); uv.push(x, s); }
  });
  for (let i = 0; i < prof.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
