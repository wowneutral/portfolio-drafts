// Outline-to-solid code copied from the letters draft (src/versions/letters/geo.ts), cut down to one glyph: Anton's question mark.
import * as THREE from 'three';
import MARK from './mark.json';

type P2 = { x: number; y: number };
const G = MARK.glyphs[0];
/** The glyph's box in font units (y down): used to line the 3D mark up with a typed one. */
export const BOX = { x0: 23.44, x1: 477.54, top: 867.19, adv: G.advance };
export const PATH = G.d;

function subpaths(d: string, k: number, quality: number): P2[][] {
  const out: P2[][] = [];
  let cur: THREE.Path | null = null;
  const X = (v: number) => v * k, Y = (v: number) => -v * k;
  const re = /([MLQCZ])([^MLQCZ]*)/g;
  let m: RegExpExecArray | null;
  const close = () => { if (cur) { const raw = cur.getPoints(quality); const pts = raw.filter((p, i) => i === 0 || p.distanceTo(raw[i - 1]) > 1e-5).map((p) => ({ x: p.x, y: p.y })); const a = pts[0], b = pts[pts.length - 1]; if (pts.length > 2 && Math.hypot(a.x - b.x, a.y - b.y) < 1e-5) pts.pop(); if (pts.length > 2) out.push(pts); cur = null; } };
  while ((m = re.exec(d))) {
    const n = (m[2].match(/-?\d*\.?\d+/g) ?? []).map(Number);
    if (m[1] === 'M') { close(); cur = new THREE.Path(); cur.moveTo(X(n[0]), Y(n[1])); }
    else if (m[1] === 'L' && cur) cur.lineTo(X(n[0]), Y(n[1]));
    else if (m[1] === 'Q' && cur) cur.quadraticCurveTo(X(n[0]), Y(n[1]), X(n[2]), Y(n[3]));
    else if (m[1] === 'Z') close();
  }
  close();
  return out;
}

/**
 * The mark, one unit tall, centred on its box, `depth` thick with a soft bevel.
 * Also returns the hull points (front and back rings) for a convex collider, and
 * the pivot under the dot, where it rocks when it lands.
 */
export function markSolid(depth = 0.3, bevel = 0.03) {
  const k = 1 / BOX.top;
  const rings = subpaths(PATH, k, 8);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const r of rings) for (const p of r) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  for (const r of rings) for (const p of r) { p.x -= cx; p.y -= cy; }
  const shapes = rings.map((r) => new THREE.Shape(r.map((p) => new THREE.Vector2(p.x, p.y))));
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: depth - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 4, curveSegments: 6 });
  geo.translate(0, 0, -depth / 2 + bevel);
  geo.computeVertexNormals();
  const hull: number[] = [];
  for (const r of rings) r.forEach((p, i) => { if (i % 3 === 0) hull.push(p.x, p.y, depth / 2, p.x, p.y, -depth / 2); });
  // The dot is the smaller ring; the mark rocks on the middle of its base.
  const dot = rings.reduce((a, b) => (a.length < b.length ? a : b));
  const dx = dot.reduce((s, p) => s + p.x, 0) / dot.length;
  return { geo, hull: new Float32Array(hull), w: x1 - x0, pivot: new THREE.Vector2(dx, -0.5) };
}
