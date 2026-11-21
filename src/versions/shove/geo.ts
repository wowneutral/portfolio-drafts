// Glyph outlines to bevelled solids, adapted from the letters draft geometry (src/versions/letters/geo.ts), set in Gloock.
import * as THREE from 'three';
import GLYPHS from './glyphs.json';

export const CAP = 765; // Gloock cap height at 1000 units per em

type P2 = { x: number; y: number };
export type Outline = { shapes: THREE.Shape[]; w: number; h: number; adv: number; cx: number; cy: number };

/** A path's subpaths as sampled polygons (y flipped to point up), scaled by k. */
function subpaths(d: string, dx: number, k: number, quality: number): P2[][] {
  const out: THREE.Path[] = [];
  let cur: THREE.Path | null = null;
  const X = (v: number) => (v - dx) * k, Y = (v: number) => -v * k;
  const re = /([MLQCZ])([^MLQCZ]*)/g;
  let m: RegExpExecArray | null;
  const close = () => { if (cur) { out.push(cur); cur = null; } };
  while ((m = re.exec(d))) {
    const n = (m[2].match(/-?\d*\.?\d+/g) ?? []).map(Number);
    if (m[1] === 'M') { close(); cur = new THREE.Path(); cur.moveTo(X(n[0]), Y(n[1])); }
    else if (m[1] === 'L' && cur) cur.lineTo(X(n[0]), Y(n[1]));
    else if (m[1] === 'Q' && cur) cur.quadraticCurveTo(X(n[0]), Y(n[1]), X(n[2]), Y(n[3]));
    else if (m[1] === 'C' && cur) cur.bezierCurveTo(X(n[0]), Y(n[1]), X(n[2]), Y(n[3]), X(n[4]), Y(n[5]));
    else if (m[1] === 'Z') close();
  }
  close();
  return out.map((p) => {
    const raw = p.getPoints(quality);
    const pts = raw.filter((q, i) => i === 0 || q.distanceTo(raw[i - 1]) > 1e-5).map((q) => ({ x: q.x, y: q.y }));
    const a = pts[0], b = pts[pts.length - 1];
    if (pts.length > 2 && Math.hypot(a.x - b.x, a.y - b.y) < 1e-5) pts.pop();
    return pts;
  }).filter((p) => p.length > 2);
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

export const glyph = (ch: string) => GLYPHS.glyphs.find((g) => g.ch === ch);

/** One Gloock character, `cap` units tall, centred on its own box. cx, cy: where that box sits from the pen on the baseline. */
export function letter(ch: string, cap: number, quality = 6): Outline {
  const g = glyph(ch) ?? glyph('.')!;
  const k = cap / CAP;
  const subs = subpaths(g.d, g.x, k, quality);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const s of subs) for (const p of s) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  for (const s of subs) for (const p of s) { p.x -= cx; p.y -= cy; }
  const order = subs.map((s) => ({ s, a: Math.abs(area(s)) })).sort((a, b) => b.a - a.a);
  const solids: { pts: P2[]; holes: P2[][] }[] = [];
  for (const o of order) {
    const host = solids.find((S) => inside(o.s[0], S.pts) && !S.holes.some((h) => inside(o.s[0], h)));
    if (host) host.holes.push(o.s); else solids.push({ pts: o.s, holes: [] });
  }
  const v2 = (p: P2[]) => p.map((q) => new THREE.Vector2(q.x, q.y));
  const shapes = solids.map((S) => { const sh = new THREE.Shape(v2(S.pts)); sh.holes = S.holes.map((h) => new THREE.Path(v2(h))); return sh; });
  return { shapes, w: x1 - x0, h: y1 - y0, adv: g.advance * k, cx, cy };
}

/** A solid letter: extruded, softly bevelled, centred on its own box. */
export function solid(o: Outline, depth: number, bevel: number, segments = 3): THREE.ExtrudeGeometry {
  const g = new THREE.ExtrudeGeometry(o.shapes, {
    depth: depth - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: segments, curveSegments: 1,
  });
  g.translate(0, 0, -depth / 2 + bevel);
  g.computeVertexNormals();
  return g;
}

/** Where each character of a line sits, centred on x = 0 (cap = 1 unit). */
export function layout(text: string, tracking = 0.05) {
  const k = 1 / CAP;
  let pen = 0;
  const out: { ch: string; x: number; y: number; w: number; h: number }[] = [];
  for (const ch of text) {
    if (ch === ' ') { pen += 300 * k; continue; }
    const o = letter(ch, 1, 2);
    out.push({ ch, x: pen + o.cx, y: o.cy, w: o.w, h: o.h });
    pen += o.adv + tracking;
  }
  const width = pen - tracking;
  for (const p of out) p.x -= width / 2;
  return { slots: out, width };
}
