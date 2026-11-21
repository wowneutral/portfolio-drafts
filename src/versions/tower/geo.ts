// Outlines to solids. Glyph outlines from Anton (written by test/glyphs.mjs), parsed with
// three's SVGLoader and extruded with a soft bevel, the way the letters draft cut its capitals.
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import GLYPHS from './glyphs.json';

export const CAP = GLYPHS.cap;      // Anton cap height at 1000 units per em
export const K = 1 / CAP;           // font units to world units: a capital is one unit tall
export const DEPTH = 0.95;          // how thick a bar of type is
export const LEAD = 0.1;            // between the two lines of one bar
export const HALF = (2 + LEAD) / 2; // half the height of a bar
export const GAP = 0.24;            // between bars

const loader = new SVGLoader();
function shapesOf(d: string): THREE.Shape[] {
  const data = loader.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`);
  return data.paths.flatMap((p) => SVGLoader.createShapes(p));
}

/** Extrude a path in font units (y down, baseline at 0) into a solid one unit per capital, baseline at y = 0, centred in z. */
function extrude(d: string, dx: number, depth: number): THREE.BufferGeometry {
  const b = 22, s = 16; // bevel, in font units
  const g = new THREE.ExtrudeGeometry(shapesOf(d), {
    depth: depth / K - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: s, bevelOffset: -s, bevelSegments: 2, curveSegments: 6,
  });
  g.translate(dx, 0, 0);
  // Flip y up; flipping z as well keeps the faces turned the right way out.
  g.scale(K, -K, -K);
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  g.translate(0, 0, -(bb.min.z + bb.max.z) / 2);
  return g;
}

export type Line = { t: string; w: number; d: string };
export const LINES = GLYPHS.lines as Line[];
export const NAME = GLYPHS.name as { w: number; d: string }[];

export type BarGeo = { geometry: THREE.BufferGeometry; w: [number, number]; width: number };

/** Paint the faces that look at the lens one colour and the sides and bevels another, so the letterforms stay crisp at an angle. */
export function paint(g: THREE.BufferGeometry, front: string, side: string) {
  const n = g.getAttribute('normal'), f = new THREE.Color(front), sd = new THREE.Color(side), c = new THREE.Color();
  const col = new Float32Array(n.count * 3);
  for (let i = 0; i < n.count; i++) {
    const t = THREE.MathUtils.smoothstep(Math.abs(n.getZ(i)), 0.55, 0.97);
    c.copy(sd).lerp(f, t); col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/** One honour as one solid: its two lines, each centred, merged into a single geometry. Local y runs from -HALF to +HALF. */
export function bar(i: number): BarGeo {
  const a = LINES[i * 2], b = LINES[i * 2 + 1];
  const g1 = extrude(a.d, -a.w / 2, DEPTH); g1.translate(0, LEAD / 2, 0);
  const g2 = extrude(b.d, -b.w / 2, DEPTH); g2.translate(0, -1 - LEAD / 2, 0);
  for (const g of [g1, g2]) { g.deleteAttribute('uv'); g.clearGroups(); }
  const geometry = mergeGeometries([g1, g2])!;
  g1.dispose(); g2.dispose();
  return { geometry, w: [a.w * K, b.w * K], width: Math.max(a.w, b.w) * K };
}

/** A repo's name as one solid bar of capitals, centred, `cap` units tall. */
export function word(name: string, cap: number, depth: number): { geometry: THREE.BufferGeometry; size: THREE.Vector3 } {
  const abc = GLYPHS.abc as Record<string, { d: string; x: number; adv: number }>;
  const parts: THREE.BufferGeometry[] = [];
  let pen = 0;
  for (const ch of name.toUpperCase()) {
    const gl = abc[ch];
    if (!gl) { pen += 260; continue; }
    if (gl.d) parts.push(extrude(gl.d, pen - gl.x, depth / cap));
    pen += gl.adv + 18;
  }
  for (const g of parts) { g.deleteAttribute('uv'); g.clearGroups(); }
  const g = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  g.scale(cap, cap, cap);
  g.computeBoundingBox();
  const bb = g.boundingBox!, c = new THREE.Vector3(), size = new THREE.Vector3();
  bb.getCenter(c); bb.getSize(size);
  g.translate(-c.x, -c.y, -c.z);
  return { geometry: g, size };
}
