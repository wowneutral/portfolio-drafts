// Metal sorts: a lead body with its letter raised on top, mirrored, as a
// printer's piece of type. Bodoni Moda Black outlines from glyphs.mjs.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import GLYPHS from './glyphs.json';

export const CAP = 765;          // Bodoni Moda's cap height, per 1000 units
export const FACE = 0.6;         // cap height on the face, metres of the scene
export const BODY = 0.96;        // the body, front to back
export const HIGH = 0.9;         // type high
export const RELIEF = 0.075;     // how far the letter stands up
const K = FACE / CAP;

type P2 = { x: number; y: number };
const area = (p: P2[]) => { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i].x * q.y - q.x * p[i].y; } return a / 2; };
const inside = (pt: P2, poly: P2[]) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
};

/** The glyph's outline, mirrored left to right, centred on its advance, baseline at y = 0. */
function shapes(ch: string): { list: THREE.Shape[]; adv: number } | null {
  const g = GLYPHS.glyphs.find((x) => x.ch === ch);
  if (!g) return null;
  const half = g.advance / 2;
  const X = (v: number) => -(v - g.x - half) * K, Y = (v: number) => -v * K;
  const subs: P2[][] = [];
  let cur: THREE.Path | null = null;
  const close = () => {
    if (!cur) return;
    const raw = cur.getPoints(5);
    const pts = raw.filter((p, i) => i === 0 || p.distanceTo(raw[i - 1]) > 1e-5).map((p) => ({ x: p.x, y: p.y }));
    if (pts.length > 2 && Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) < 1e-5) pts.pop();
    if (pts.length > 2) subs.push(pts);
    cur = null;
  };
  const re = /([MLQCZ])([^MLQCZ]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(g.d))) {
    const n = (m[2].match(/-?\d*\.?\d+/g) ?? []).map(Number);
    if (m[1] === 'M') { close(); cur = new THREE.Path(); cur.moveTo(X(n[0]), Y(n[1])); }
    else if (m[1] === 'L' && cur) cur.lineTo(X(n[0]), Y(n[1]));
    else if (m[1] === 'Q' && cur) cur.quadraticCurveTo(X(n[0]), Y(n[1]), X(n[2]), Y(n[3]));
    else if (m[1] === 'C' && cur) cur.bezierCurveTo(X(n[0]), Y(n[1]), X(n[2]), Y(n[3]), X(n[4]), Y(n[5]));
    else if (m[1] === 'Z') close();
  }
  close();
  const order = subs.map((s) => ({ s, a: Math.abs(area(s)) })).sort((a, b) => b.a - a.a);
  const solids: { pts: P2[]; holes: P2[][] }[] = [];
  for (const o of order) {
    const host = solids.find((S) => inside(o.s[0], S.pts) && !S.holes.some((h) => inside(o.s[0], h)));
    if (host) host.holes.push(o.s); else solids.push({ pts: o.s, holes: [] });
  }
  const v2 = (p: P2[]) => p.map((q) => new THREE.Vector2(q.x, q.y));
  const list = solids.map((S) => { const sh = new THREE.Shape(v2(S.pts)); sh.holes = S.holes.map((h) => new THREE.Path(v2(h))); return sh; });
  return { list, adv: g.advance * K };
}

export type SortGeo = { body: THREE.BufferGeometry; face: THREE.BufferGeometry | null; nick: THREE.BufferGeometry | null; w: number; h: number };
const cache = new Map<string, SortGeo>();

/** One sort. Spaces are blank quads, cast lower than type high so they never print. */
export function sortGeo(ch: string): SortGeo {
  const hit = cache.get(ch);
  if (hit) return hit;
  let out: SortGeo;
  if (ch === ' ') {
    const w = 0.34, h = HIGH * 0.72;
    out = { body: new RoundedBoxGeometry(w, h, BODY, 2, 0.03), face: null, nick: null, w, h };
  } else {
    const s = shapes(ch)!;
    const w = Math.max(0.26, s.adv + 0.05);
    const body = new RoundedBoxGeometry(w, HIGH, BODY, 3, 0.035);
    // The nick: the groove on the front of every sort, so the compositor sets it the right way up.
    const nick = new THREE.BoxGeometry(w - 0.02, 0.045, 0.02); nick.translate(0, -HIGH * 0.18, BODY / 2 - 0.004);
    const face = new THREE.ExtrudeGeometry(s.list, { depth: RELIEF, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.005, bevelOffset: -0.002, bevelSegments: 1, curveSegments: 4 });
    // Shape y runs to the back of the sort; the relief stands up from the top.
    face.rotateX(-Math.PI / 2);
    face.translate(0, HIGH / 2 - 0.004, FACE / 2 - 0.02);
    face.computeVertexNormals();
    out = { body, face, nick, w, h: HIGH };
  }
  cache.set(ch, out);
  return out;
}

/** The characters the sorts can be cast in; anything else becomes a space. */
export function castable(s: string) {
  return s.toUpperCase().replace(/'/g, '’').split('').map((c) => (GLYPHS.glyphs.some((g) => g.ch === c) ? c : ' ')).join('');
}
