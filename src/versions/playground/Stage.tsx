// Base: src/versions/letters/Stage.tsx (draft 2: paper sweep, product lighting, knock-and-get-up physics),
// with the studio light rig after pmndrs/examples bestservedbold-christmas-baubles and the pointer shove and
// spring-home feel after pmndrs/examples lusion-connectors (both MIT). ARMAAN SETH. stands on the paper; around
// it sit his real things, each a Rapier body that a push knocks over and a damped spring stands back up.
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { Physics, useRapier } from '@react-three/rapier';
import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader.js';
import { gsap, scroll } from '@/lib/scroll';
import { clamp, damp, lerp, smooth } from '@/lib/utils';
import { DEBATE, PERSON, RESEARCH, WORK } from '@/content';
import { hulls, letter, MARK_GITHUB, noiseTexture, solid } from './geo';
import { NAME_CAP, NAME_DEPTH, PRINTS, STOPS, THINGS, TILE, stopIndex, type Plan, type Shot, type ThingId } from './plan';
import { stage } from './stage';
import * as T from './textures';

const PAPER = '#e7e2d6';
const BASE = import.meta.env.BASE_URL;
const STEP = 1 / 60, GRAV = 16.5, FALL = 34;
const SOLID = 0xffffffff, GHOST = 0x00020000;

type Ctx = ReturnType<typeof useRapier>;
type World = Ctx['world'];
type RAPIER = Ctx['rapier'];
type Body = ReturnType<World['createRigidBody']>;
type Collider = ReturnType<World['createCollider']>;
type Desc = ReturnType<RAPIER['ColliderDesc']['cuboid']>;
type Kind = 'name' | 'thing' | 'print' | 'tile' | 'apple';
type Mode = 'away' | 'drop' | 'home' | 'loose' | 'rise' | 'fall';
type Pose = { p: THREE.Vector3; q: THREE.Quaternion };
type Actor = {
  kind: Kind; ch: string; i: number; id?: ThingId; key?: string; obj: THREE.Object3D; body: Body; kin: boolean; cols: Collider[];
  home: Pose; half: THREE.Vector3; mode: Mode; drop: number;
  t: number; wait: number; landed: boolean; thud: number; rock: number;
  from: Pose; to: Pose; axis: THREE.Vector3; angle: number; u: number; du: number; lift: number;
  looseT: number; restT: number; pushedAt: number; swipedAt: number; hov: number; poke: number;
  pp: THREE.Vector3; pq: THREE.Quaternion; cp: THREE.Vector3; cq: THREE.Quaternion;
  hinge?: { obj: THREE.Object3D; axis: 'x' | 'z'; sign: number; rest: number };
  seen: boolean;
};

const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const X = v3(1, 0, 0);
const qy = (a: number) => new THREE.Quaternion().setFromAxisAngle(v3(0, 1, 0), a);
const qx = (a: number) => new THREE.Quaternion().setFromAxisAngle(X, a);

/* ───────── materials ───────── */

function makeMaterials() {
  // Orange peel: the slight waviness of sprayed lacquer (from the letters draft).
  const peel = noiseTexture(256, (g, rnd, s) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 1500; i++) {
      const x = rnd() * s, y = rnd() * s, r = 3 + rnd() * 9, c = rnd() < 0.5 ? 255 : 0;
      for (const [ox, oy] of [[0, 0], [s, 0], [-s, 0], [0, s], [0, -s]]) {
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        gr.addColorStop(0, `rgba(${c},${c},${c},0.09)`); gr.addColorStop(1, `rgba(${c},${c},${c},0)`);
        g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      }
    }
  }, 2.2);
  const tooth = noiseTexture(256, (g, rnd, s) => {
    const im = g.createImageData(s, s);
    for (let i = 0; i < s * s; i++) { const v = 128 + (rnd() - 0.5) * 70; im.data.set([v, v, v, 255], i * 4); }
    g.putImageData(im, 0, 0);
  }, 1);
  // Brushed grain for the anodised block and the brass.
  const brush = noiseTexture(256, (g, rnd, s) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) { const y = rnd() * s, c = rnd() < 0.5 ? 255 : 0; g.fillStyle = `rgba(${c},${c},${c},0.06)`; g.fillRect(0, y, s, 1); }
  }, 2);
  const ink = new THREE.MeshPhysicalMaterial({ color: '#13110d', roughness: 0.5, clearcoat: 1, clearcoatRoughness: 0.1, bumpMap: peel, bumpScale: 0.5, envMapIntensity: 0.9 });
  const red = new THREE.MeshPhysicalMaterial({ color: '#c8321e', roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.07, bumpMap: peel, bumpScale: 0.4, envMapIntensity: 0.85 });
  const anod = new THREE.MeshPhysicalMaterial({ color: '#18181a', metalness: 0.65, roughness: 0.42, bumpMap: brush, bumpScale: 0.25, envMapIntensity: 1.0 });
  const brass = new THREE.MeshPhysicalMaterial({ color: '#c79f55', metalness: 1, roughness: 0.3, clearcoat: 0.4, clearcoatRoughness: 0.2, bumpMap: brush, bumpScale: 0.2, envMapIntensity: 1.25 });
  const sheet = new THREE.MeshStandardMaterial({ color: '#f6f3ea', roughness: 0.92, envMapIntensity: 0.6 });
  const white = new THREE.MeshPhysicalMaterial({ color: '#f4f1ea', roughness: 0.35, clearcoat: 0.5, envMapIntensity: 0.8 });
  const enamel = new THREE.MeshStandardMaterial({ color: '#f2f0ea', roughness: 0.4, envMapIntensity: 0.7 });
  const kraft = new THREE.MeshStandardMaterial({ color: '#8f7d5f', roughness: 0.95, bumpMap: tooth, bumpScale: 0.4 });
  const night = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  night.mapping = THREE.EquirectangularReflectionMapping; night.needsUpdate = true;
  const paper = new THREE.MeshStandardMaterial({ color: '#efeadd', roughness: 1, bumpMap: tooth, bumpScale: 0.35, envMap: night, envMapIntensity: 0 });
  return { ink, red, anod, brass, sheet, white, enamel, kraft, paper, textures: [peel, tooth, brush, night] as THREE.Texture[] };
}
type Mats = ReturnType<typeof makeMaterials>;

/* ───────── the paper sweep (from the letters draft) ───────── */

function Sweep({ zf, material }: { zf: number; material: THREE.Material }) {
  const geometry = useMemo(() => {
    const R = 7, prof: [number, number][] = [[400, 0], [zf, 0]];
    for (let i = 1; i <= 18; i++) { const a = (i / 18) * Math.PI / 2; prof.push([zf - R * Math.sin(a), R - R * Math.cos(a)]); }
    prof.push([zf - R, 300]);
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    let s = 0;
    prof.forEach(([z, y], i) => {
      if (i) s += Math.hypot(z - prof[i - 1][0], y - prof[i - 1][1]);
      for (const x of [-700, 700]) { pos.push(x, y, z); uv.push(x / 3, s / 3); }
    });
    for (let i = 0; i < prof.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }, [zf]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={material} receiveShadow layers={1} />;
}

/* ───────── his things ───────── */

type Built = { obj: THREE.Group; cols: Desc[]; half: THREE.Vector3; hinge?: Actor['hinge']; density?: number };
type Kit = { R: RAPIER; M: Mats; own: (d: { dispose: () => void }) => void; low: boolean; wake: () => void };

const shadowed = (m: THREE.Mesh) => { m.castShadow = m.receiveShadow = true; return m; };
const cub = (k: Kit, hx: number, hy: number, hz: number, x = 0, y = 0, z = 0, q?: THREE.Quaternion) => {
  const d = k.R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z);
  if (q) d.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
  return d;
};
function image(k: Kit, src: string, aspect: number, crop?: { x: number; y: number; w: number; h: number }) {
  const t = new THREE.TextureLoader().load(BASE + src, (tx) => {
    const im = tx.image as HTMLImageElement, ia = im.width / im.height;
    if (crop) { tx.repeat.set(crop.w, crop.h); tx.offset.set(crop.x, crop.y); }
    else if (ia > aspect) { tx.repeat.set(aspect / ia, 1); tx.offset.set((1 - aspect / ia) / 2, 0); }
    else { tx.repeat.set(1, ia / aspect); tx.offset.set(0, 1 - ia / aspect); }
    tx.needsUpdate = true; k.wake();
  });
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; k.own(t);
  return t;
}

/** A board standing in a slotted base, leaning back: the MITEZ card and every framed print. */
function leaning(k: Kit, w: number, h: number, face: THREE.Material, framed: boolean, label?: string): Built {
  const lean = 0.16, baseH = 0.09, baseD = 0.4, th = framed ? 0.06 : 0.05;
  const H = baseH + h * Math.cos(lean), y0 = -H / 2;
  const g = new THREE.Group();
  const base = shadowed(new THREE.Mesh(new RoundedBoxGeometry(w + 0.08, baseH, baseD, 2, 0.02), k.M.ink)); base.position.y = y0 + baseH / 2; g.add(base);
  const board = new THREE.Group(); board.position.set(0, y0 + baseH * 0.6, 0.03); board.rotation.x = -lean; g.add(board);
  if (framed) {
    const fr = shadowed(new THREE.Mesh(new RoundedBoxGeometry(w, h, th, 2, 0.012), k.M.ink)); fr.position.y = h / 2; board.add(fr);
    // The back of a framed print: kraft paper.
    const kb = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.06, h - 0.06), k.M.kraft); kb.rotation.y = Math.PI; kb.position.set(0, h / 2, -th / 2 - 0.002); board.add(kb); k.own(kb.geometry);
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.1, h - 0.1), k.M.enamel); mat.position.set(0, h / 2, th / 2 + 0.002); board.add(mat);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.26, h - 0.26), face); pic.position.set(0, h / 2, th / 2 + 0.004); board.add(pic);
    [fr.geometry, mat.geometry, pic.geometry].forEach(k.own);
  } else {
    const geo = new THREE.BoxGeometry(w, h, th);
    const card = shadowed(new THREE.Mesh(geo, [k.M.white, k.M.white, k.M.white, k.M.white, face, k.M.white])); card.position.y = h / 2; board.add(card);
    k.own(geo);
  }
  k.own(base.geometry);
  if (label) {
    const pw = w + 0.04, ph = baseH * 0.72, t = T.placard(label, pw / ph);
    const pm = new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), pm); pl.position.set(0, y0 + baseH / 2, baseD / 2 + 0.002); g.add(pl);
    [t, pm, pl.geometry].forEach(k.own);
  }
  const bq = qx(-lean), mid = v3(0, h / 2, 0).applyQuaternion(bq).add(board.position);
  return {
    obj: g, half: v3(w / 2 + 0.04, H / 2, baseD / 2),
    cols: [cub(k, w / 2 + 0.04, baseH / 2, baseD / 2, 0, y0 + baseH / 2, 0), cub(k, w / 2, h / 2, th / 2, mid.x, mid.y, mid.z, bq)],
  };
}

function buildThing(id: ThingId, k: Kit): Built {
  const { M } = k;
  switch (id) {
    case 'github': {
      const s = 1.12, h = 0.98;
      const g = new THREE.Group();
      const geo = new RoundedBoxGeometry(s, h, s, 5, 0.09);
      g.add(shadowed(new THREE.Mesh(geo, M.anod)));
      // The mark, inlaid on the top in raised white.
      const shapes = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="${MARK_GITHUB}"/></svg>`).paths.flatMap((p) => SVGLoader.createShapes(p));
      const mg = new THREE.ExtrudeGeometry(shapes, { depth: 0.6, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.08, bevelSegments: 2, curveSegments: 10 });
      const sc = 0.66 / 16;
      mg.translate(-8, -8, 0); mg.scale(sc, -sc, -sc * 0.5); mg.rotateX(Math.PI / 2); mg.rotateY(Math.PI);
      const mark = shadowed(new THREE.Mesh(mg, M.white)); mark.position.y = h / 2 - 0.006; g.add(mark);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(s * 0.86, s * 0.86), new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.55, metalness: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      face.position.set(0, -0.02, s / 2 + 0.002); face.name = 'engraving'; g.add(face);
      [geo, mg, face.geometry, face.material as THREE.Material].forEach(k.own);
      return { obj: g, half: v3(s / 2, h / 2, s / 2), cols: [cub(k, s / 2, h / 2, s / 2)], density: 1.4 };
    }
    case 'mitez': {
      const face = new THREE.MeshStandardMaterial({ map: image(k, WORK[0].img, 1.92, { x: 0.02, y: 0, w: 0.6, h: 0.55 }), roughness: 0.5 });
      k.own(face);
      return leaning(k, 1.42, 0.74, face, false, WORK[0].name);
    }
    case 'paper': {
      const w = 0.76, h = 0.15, d = 1.06;
      const g = new THREE.Group();
      const ed = T.edges(); ed.repeat.set(1, 0.6); k.own(ed);
      const side = new THREE.MeshStandardMaterial({ map: ed, roughness: 0.95 }); k.own(side);
      const geo = new THREE.BoxGeometry(w, h - 0.012, d);
      const stack = shadowed(new THREE.Mesh(geo, [side, side, M.sheet, M.sheet, side, M.sheet])); stack.position.y = -0.006; g.add(stack);
      const p = RESEARCH[0];
      const ct = T.cover({ short: p.short, status: p.status, pages: ('pages' in p ? p.pages : 0) ?? 0, doi: ('doi' in p ? p.doi : '') ?? '', name: PERSON.name }); k.own(ct);
      const cm = new THREE.MeshStandardMaterial({ map: ct, roughness: 0.85 }); k.own(cm);
      const hinge = new THREE.Group(); hinge.position.set(-w / 2, h / 2 - 0.012, 0); g.add(hinge);
      const cg = new THREE.BoxGeometry(w + 0.01, 0.01, d + 0.01);
      const cov = shadowed(new THREE.Mesh(cg, [M.sheet, M.sheet, cm, M.sheet, M.sheet, M.sheet])); cov.position.set(w / 2, 0.005, 0); hinge.add(cov);
      [geo, cg].forEach(k.own);
      return { obj: g, half: v3(w / 2, h / 2, d / 2), cols: [cub(k, w / 2, h / 2, d / 2)], hinge: { obj: hinge, axis: 'z', sign: 1, rest: 0 }, density: 0.8 };
    }
    case 'notepad': {
      const w = 0.86, h = 0.1, d = 1.14;
      const g = new THREE.Group();
      const ed = T.edges(); ed.repeat.set(1, 0.4); k.own(ed);
      const side = new THREE.MeshStandardMaterial({ map: ed, roughness: 0.95 }); k.own(side);
      const geo = new THREE.BoxGeometry(w, h, d - 0.06);
      const pad = shadowed(new THREE.Mesh(geo, [side, side, M.sheet, M.sheet, side, side])); pad.position.set(0, -0.01, 0.03); g.add(pad);
      const bg = new RoundedBoxGeometry(w + 0.03, h + 0.02, 0.08, 2, 0.015);
      const bind = shadowed(new THREE.Mesh(bg, M.ink)); bind.position.set(0, 0, -d / 2 + 0.04); g.add(bind);
      const hinge = new THREE.Group(); hinge.position.set(0, h / 2 - 0.004, -d / 2 + 0.08); g.add(hinge);
      const sg = new THREE.PlaneGeometry(w - 0.02, d - 0.1); sg.rotateX(-Math.PI / 2); sg.translate(0, 0.002, (d - 0.1) / 2);
      const sm = new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide }); k.own(sm);
      const top = new THREE.Mesh(sg, sm); top.receiveShadow = true; top.castShadow = true; top.name = 'note'; hinge.add(top);
      [geo, bg, sg].forEach(k.own);
      return { obj: g, half: v3(w / 2 + 0.015, h / 2 + 0.01, d / 2), cols: [cub(k, w / 2 + 0.015, h / 2 + 0.01, d / 2)], hinge: { obj: hinge, axis: 'x', sign: -1, rest: 0 }, density: 0.8 };
    }
    case 'envelope': {
      const w = 1.1, h = 0.035, d = 0.7;
      const g = new THREE.Group();
      const ft = T.envelope({ name: PERSON.name, to: 'founder@mitez.org' }), bt = T.flap(); k.own(ft); k.own(bt);
      const front = new THREE.MeshStandardMaterial({ map: ft, roughness: 0.9 }), back = new THREE.MeshStandardMaterial({ map: bt, roughness: 0.9 }), edge = new THREE.MeshStandardMaterial({ color: '#e8dcbc', roughness: 0.9 });
      [front, back, edge].forEach(k.own);
      const geo = new RoundedBoxGeometry(w, h, d, 2, 0.008);
      // RoundedBox has no face groups: one cream body, the printed face on top.
      g.add(shadowed(new THREE.Mesh(geo, edge)));
      const fg = new THREE.PlaneGeometry(w - 0.02, d - 0.02); fg.rotateX(-Math.PI / 2);
      const f = new THREE.Mesh(fg, front); f.position.y = h / 2 + 0.001; f.receiveShadow = true; g.add(f);
      const bg2 = fg.clone(); bg2.rotateX(Math.PI);
      const b = new THREE.Mesh(bg2, back); b.position.y = -h / 2 - 0.001; g.add(b);
      [geo, fg, bg2].forEach(k.own);
      return { obj: g, half: v3(w / 2, h / 2, d / 2), cols: [cub(k, w / 2, h / 2, d / 2)], density: 0.6 };
    }
    case 'plaque0': case 'plaque1': {
      const win = DEBATE.wins[id === 'plaque0' ? 0 : 1];
      const pw = 0.72, ph = 0.4, pd = 0.5, bw = 0.64, bh = 0.64, bt = 0.05, lean = 0.12;
      const H = ph + bh * Math.cos(lean), y0 = -H / 2;
      const g = new THREE.Group();
      const pg = new RoundedBoxGeometry(pw, ph, pd, 3, 0.03);
      const plinth = shadowed(new THREE.Mesh(pg, M.ink)); plinth.position.y = y0 + ph / 2; g.add(plinth);
      const tx = T.plaque(win); k.own(tx);
      const fm = M.brass.clone(); fm.map = tx; fm.bumpMap = null; k.own(fm);
      const plate = new THREE.Group(); plate.position.set(0, y0 + ph - 0.01, 0.06); plate.rotation.x = -lean; g.add(plate);
      const bgeo = new THREE.BoxGeometry(bw, bh, bt);
      const brass = shadowed(new THREE.Mesh(bgeo, [M.brass, M.brass, M.brass, M.brass, fm, M.brass])); brass.position.y = bh / 2; plate.add(brass);
      [pg, bgeo].forEach(k.own);
      const bq = qx(-lean), mid = v3(0, bh / 2, 0).applyQuaternion(bq).add(plate.position);
      return { obj: g, half: v3(pw / 2, H / 2, pd / 2), cols: [cub(k, pw / 2, ph / 2, pd / 2, 0, y0 + ph / 2, 0), cub(k, bw / 2, bh / 2, bt / 2, mid.x, mid.y, mid.z, bq)], density: 1.6 };
    }
    case 'skeptical': default: {
      const o = letter('?', 1.5, k.low ? 4 : 7);
      const geo = toCreasedNormals(solid(o, 0.5, 0.034, k.low ? 2 : 4), 0.7); k.own(geo);
      const g = new THREE.Group(); g.add(shadowed(new THREE.Mesh(geo, M.red)));
      const cols: Desc[] = [];
      for (const h of hulls(o, 0.5)) { const d = k.R.ColliderDesc.convexHull(h); if (d) cols.push(d as unknown as Desc); }
      cols.push(cub(k, o.w / 2, 0.03, 0.25 - 0.004, 0, -o.h / 2 + 0.03, 0));
      return { obj: g, half: v3(o.w / 2, o.h / 2, 0.25), cols, density: 1 };
    }
  }
}

/** A real-looking apple, turned on a lathe: red into yellow, a dimple, a stem. */
function buildApple(k: Kit) {
  const r = 0.21;
  const pts = [[0, 0.07], [0.14, 0.035], [0.32, 0.0], [0.52, 0.045], [0.7, 0.17], [0.82, 0.35], [0.86, 0.53], [0.82, 0.71], [0.7, 0.86], [0.52, 0.96], [0.32, 0.985], [0.17, 0.95], [0.07, 0.87], [0, 0.83]].map(([x, y]) => new THREE.Vector2(x, y));
  const curve = new THREE.SplineCurve(pts);
  const prof = curve.getPoints(48).map((p) => new THREE.Vector2(Math.max(0, p.x) * r * 1.16, p.y * r * 2));
  prof[0].x = 0; prof[prof.length - 1].x = 0;
  const geo = new THREE.LatheGeometry(prof, 64);
  geo.translate(0, -r, 0);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  const red = new THREE.Color('#a8121a'), deep = new THREE.Color('#6e0b12'), gold = new THREE.Color('#d9a23c'), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), a = Math.atan2(z, x), h = (y + r) / (2 * r);
    const blush = smooth(clamp(0.5 + 0.5 * Math.cos(a - 0.6) * 1.4 - 0.2));
    const streak = 0.5 + 0.5 * Math.sin(a * 23 + Math.sin(a * 7) * 2);
    c.copy(gold).lerp(red, clamp(blush * 0.85 + streak * 0.25 * blush + h * 0.1));
    c.lerp(deep, clamp((1 - h) * 0.35 * blush));
    if (h > 0.86) c.lerp(new THREE.Color('#7a6a2a'), clamp((h - 0.86) * 4) * 0.5);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const skin = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.25, sheen: 0.2, envMapIntensity: 0.9 });
  const sg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([v3(0, r * 0.62, 0), v3(0.005, r * 0.95, 0), v3(0.03, r * 1.22, 0.01)]), 8, 0.012, 6);
  const stem = new THREE.MeshStandardMaterial({ color: '#4a3520', roughness: 0.8 });
  const g = new THREE.Group();
  g.add(shadowed(new THREE.Mesh(geo, skin)), shadowed(new THREE.Mesh(sg, stem)));
  [geo, skin, sg, stem].forEach(k.own);
  return { obj: g, r };
}

/* ───────── the set ───────── */

function TheSet({ plan, M, low }: { plan: Plan; M: Mats; low: boolean }) {
  const { world, rapier: R } = useRapier();
  const { camera, gl, scene, invalidate } = useThree();
  const envSet = useRef(false);
  const root = useMemo(() => new THREE.Group(), []);
  const actors = useRef<Actor[]>([]).current;
  const disposables = useRef<{ dispose: () => void }[]>([]).current;
  const sim = useRef({
    now: 0, acc: 0, started: false, opening: true, quiet: 0, printV: -1, frame: 0, shadowHold: 0, appleSeen: false, printsMade: false,
    jobs: [] as { at: number; run: () => void }[],
    ptr: { x: -1, y: -1, t: 0, vx: 0, vy: 0, down: false, travel: 0, downAt: 0, moved: false, touch: false, run: 0 },
  }).current;
  const room = useRef<Body | null>(null);
  const kit: Kit = useMemo(() => ({ R, M, low, own: (d) => disposables.push(d), wake: () => { stage.wake = Math.max(stage.wake, 6); stage.dirty = Math.max(stage.dirty, 2); invalidate(); } }), [R, M, low, disposables, invalidate]);

  const makeActor = (kind: Kind, i: number, obj: THREE.Object3D, cols: Desc[], half: THREE.Vector3, home: Pose, density = 1, ch = ''): Actor => {
    obj.visible = false;
    if (kind !== 'tile') root.add(obj);
    obj.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = (o as THREE.Mesh).castShadow || false; });
    const body = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(home.p.x, home.p.y + 6, home.p.z).setLinearDamping(0.06).setAngularDamping(0.3));
    const a: Actor = {
      kind, ch, i, obj, body, kin: true, cols: [], home: { p: home.p.clone(), q: home.q.clone() }, half, mode: 'away', drop: 6,
      t: 0, wait: 0, landed: false, thud: 0.012, rock: 0.04, from: { p: v3(), q: new THREE.Quaternion() }, to: { p: v3(), q: new THREE.Quaternion() },
      axis: v3(1), angle: 0, u: 0, du: 0, lift: 0.4, looseT: 0, restT: 0, pushedAt: -9, swipedAt: -9, hov: 0, poke: -9,
      pp: home.p.clone(), pq: home.q.clone(), cp: home.p.clone(), cq: home.q.clone(), seen: true,
    };
    for (const d of cols) a.cols.push(world.createCollider(d.setDensity(density).setFriction(0.72).setRestitution(0.06).setCollisionGroups(GHOST), body));
    body.setEnabled(false);
    actors.push(a);
    return a;
  };

  // The name, his things, the prints and the tile pool, built once.
  const cast0 = useMemo(() => {
    const name = plan.letters.map((L, i) => {
      const o = letter(L.ch, NAME_CAP, low ? 4 : 7);
      const g = toCreasedNormals(solid(o, NAME_DEPTH, 0.032, low ? 2 : 4), 0.7); disposables.push(g);
      const mesh = shadowed(new THREE.Mesh(g, L.ch === '.' ? M.red : M.ink));
      const cols: Desc[] = [];
      for (const h of hulls(o, NAME_DEPTH)) { const d = R.ColliderDesc.convexHull(h); if (d) cols.push(d as unknown as Desc); }
      cols.push(R.ColliderDesc.cuboid(o.w / 2, 0.03, NAME_DEPTH / 2 - 0.004).setTranslation(0, -o.h / 2 + 0.03, 0));
      return makeActor('name', i, mesh, cols, v3(o.w / 2, o.h / 2, NAME_DEPTH / 2), { p: v3(L.x, L.y, L.z), q: new THREE.Quaternion() }, 1, L.ch);
    });
    const things = THINGS.map((id, i) => {
      const b = buildThing(id, kit), s = plan.spots[id];
      const a = makeActor('thing', i, b.obj, b.cols, b.half, { p: v3(s.x, b.half.y, s.z), q: qy(s.ry) }, b.density ?? 1);
      a.id = id; a.key = id; a.hinge = b.hinge; a.drop = 3.2;
      return a;
    });
    const prints = PRINTS.map((slug, i) => {
      const w = WORK.find((x) => x.slug === slug)!;
      const face = new THREE.MeshStandardMaterial({ map: image(kit, w.img, 1.6), roughness: 0.6 }); disposables.push(face);
      const b = leaning(kit, 1.62, 1.08, face, true, w.name), s = plan.prints[i];
      const a = makeActor('print', i, b.obj, b.cols, b.half, { p: v3(s.x, b.half.y, s.z), q: qy(s.ry) }, 1);
      a.drop = 3.2; a.ch = slug; a.key = 'print:' + slug;
      return a;
    });
    // Commit tiles: drawn as instances, one body each.
    const tg = new RoundedBoxGeometry(TILE.s, TILE.h, TILE.s, 2, 0.022); disposables.push(tg);
    const tileMesh = new THREE.InstancedMesh(tg, M.ink, 30); tileMesh.castShadow = tileMesh.receiveShadow = true; tileMesh.count = 0; tileMesh.frustumCulled = false; root.add(tileMesh);
    const tiles = Array.from({ length: 30 }, (_, i) => {
      const col = i % TILE.per, rowN = Math.floor(i / TILE.per);
      const home = { p: v3(plan.tiles.x + col * TILE.pitch + (rowN % 2) * 0.08, TILE.h / 2, plan.tiles.z + rowN * TILE.pitch), q: qy(((i * 37) % 11 - 5) * 0.03) };
      const a = makeActor('tile', i, new THREE.Object3D(), [R.ColliderDesc.cuboid(TILE.s / 2, TILE.h / 2, TILE.s / 2) as Desc], v3(TILE.s / 2, TILE.h / 2, TILE.s / 2), home, 1.3);
      a.drop = 4; a.thud = 0.004; a.rock = 0.05;
      return a;
    });
    // The apple: one body, reused for every fall.
    const ap = buildApple(kit);
    const sk = plan.spots.skeptical;
    const apple = makeActor('apple', 0, ap.obj, [R.ColliderDesc.ball(ap.r) as unknown as Desc], v3(ap.r, ap.r, ap.r), { p: v3(sk.x - 0.9, ap.r, sk.z + 0.9), q: new THREE.Quaternion() }, 0.9);
    for (const c of apple.cols) { c.setRestitution(0.32); c.setFriction(0.9); }
    const rb = world.createRigidBody(R.RigidBodyDesc.fixed());
    const wall = (hx: number, hy: number, hz: number, x: number, y: number, z: number) => world.createCollider(R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z).setFriction(0.78).setRestitution(0.04), rb);
    const cx = (plan.x0 + plan.x1) / 2, cz = (plan.z0 + plan.z1) / 2, hx = (plan.x1 - plan.x0) / 2 + 4, hz = (plan.z1 - plan.z0) / 2 + 3;
    wall(120, 5, 120, 0, -5, 0); wall(1, 20, hz + 2, cx - hx, 20, cz); wall(1, 20, hz + 2, cx + hx, 20, cz); wall(hx + 2, 20, 1, cx, 20, cz + hz); wall(hx + 2, 20, 1, cx, 20, cz - hz);
    room.current = rb;
    return { name, things, prints, tiles, tileMesh, apple, bounds: { cx, cz, hx, hz } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, world, R, M]);
  const { name: word, things, prints, tiles, tileMesh, apple, bounds } = cast0;
  const linked = useMemo(() => [...things, ...prints], [things, prints]);
  const tileTops = useRef(new Map<string, THREE.InstancedMesh>()).current;
  const tileChars = useRef<string[]>([]).current;
  const topGeo = useMemo(() => { const g = new THREE.PlaneGeometry(TILE.s * 0.8, TILE.s * 0.8); g.rotateX(-Math.PI / 2); return g; }, []);

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __pg: unknown }).__pg = { stage, sim, actors };
    stage.wake = Math.max(stage.wake, 60); stage.dirty = 4;
    world.timestep = STEP; world.gravity = { x: 0, y: -GRAV, z: 0 };
    return () => { disposables.forEach((d) => d.dispose()); topGeo.dispose(); tileTops.forEach((m) => { (m.material as THREE.MeshStandardMaterial).map?.dispose(); (m.material as THREE.Material).dispose(); }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world]);

  const tmpQ = useMemo(() => new THREE.Quaternion(), []), tmpQ2 = useMemo(() => new THREE.Quaternion(), []);
  const tmpV = useMemo(() => v3(), []), tmpV2 = useMemo(() => v3(), []), tmpM = useMemo(() => new THREE.Matrix4(), []);
  const ray = useMemo(() => new THREE.Raycaster(), []);

  const api = useMemo(() => {
    const solidify = (a: Actor, yes: boolean) => { for (const c of a.cols) c.setCollisionGroups(yes ? SOLID : GHOST); };
    const setKin = (a: Actor) => { if (!a.kin) { a.body.setBodyType(R.RigidBodyType.KinematicPositionBased, true); a.kin = true; } solidify(a, false); };
    const setDyn = (a: Actor) => { if (a.kin) { a.body.setBodyType(R.RigidBodyType.Dynamic, true); a.kin = false; } solidify(a, true); };
    const read = (a: Actor, out: Pose) => { const t = a.body.translation(), r = a.body.rotation(); out.p.set(t.x, t.y, t.z); out.q.set(r.x, r.y, r.z, r.w); return out; };
    const clearance = (a: Actor, q: THREE.Quaternion) => { const e = tmpM.makeRotationFromQuaternion(q).elements; return Math.abs(e[1]) * a.half.x + Math.abs(e[5]) * a.half.y + Math.abs(e[9]) * a.half.z; };
    const tilt = (q: { x: number; y: number; z: number; w: number }, home: THREE.Quaternion) => { tmpQ2.set(q.x, q.y, q.z, q.w); return tmpQ2.angleTo(home); };
    const settle = (a: Actor) => {
      a.mode = 'home'; setDyn(a);
      a.body.setTranslation(a.home.p, false); a.body.setRotation(a.home.q, false);
      a.body.setLinvel({ x: 0, y: 0, z: 0 }, false); a.body.setAngvel({ x: 0, y: 0, z: 0 }, false);
      a.body.sleep();
    };
    const startDrop = (a: Actor) => {
      a.mode = 'drop'; a.t = 0; a.landed = false;
      a.body.setEnabled(true); setKin(a);
      tmpV.copy(a.home.p).setY(a.home.p.y + a.drop);
      a.body.setTranslation(tmpV, true); a.body.setRotation(a.home.q, true);
      a.cp.copy(tmpV); a.pp.copy(tmpV); a.cq.copy(a.home.q); a.pq.copy(a.home.q);
    };
    const putAway = (a: Actor) => { setKin(a); a.mode = 'away'; a.obj.visible = false; a.body.setEnabled(false); };
    const startRise = (a: Actor) => {
      setKin(a); read(a, a.from); a.to.p.copy(a.home.p); a.to.q.copy(a.home.q);
      tmpQ.copy(a.to.q).invert(); tmpQ2.copy(a.from.q).multiply(tmpQ);
      if (tmpQ2.w < 0) tmpQ2.set(-tmpQ2.x, -tmpQ2.y, -tmpQ2.z, -tmpQ2.w);
      a.angle = 2 * Math.acos(clamp(tmpQ2.w, -1, 1));
      const s = Math.sqrt(Math.max(1e-9, 1 - tmpQ2.w * tmpQ2.w));
      a.axis.set(tmpQ2.x / s, tmpQ2.y / s, tmpQ2.z / s);
      if (a.angle < 1e-4) a.axis.set(1, 0, 0);
      a.u = 0; a.du = 0; a.t = 0; a.mode = 'rise';
      a.lift = 0.6 * Math.min(1, a.angle / 1.2) * (a.half.y / 1) + 0.07 * Math.min(4, a.from.p.distanceTo(a.to.p));
    };
    const shove = (a: Actor, point: THREE.Vector3, dir: THREE.Vector3, strength: number): boolean => {
      if (a.mode === 'away' || a.mode === 'drop' || a.kind === 'apple') return false;
      setDyn(a);
      const m = a.body.mass() * strength;
      a.body.applyImpulseAtPoint({ x: dir.x * m, y: dir.y * m, z: dir.z * m }, point, true);
      a.mode = 'loose'; a.looseT = 0; a.restT = 0; a.pushedAt = sim.now;
      return true;
    };
    const topple = (a: Actor, dx: number, dz: number, strength = 2.1) => {
      if (a.mode !== 'home' && a.mode !== 'rise') return;
      read(a, a.from);
      tmpV.copy(a.from.p).add(tmpV2.set(0, a.half.y * 0.75, dz < 0 ? a.half.z : -a.half.z));
      shove(a, tmpV, tmpV2.set(dx, 0, dz).normalize(), strength);
    };
    /** The apple: from above the frame, onto the paper in front of the question mark. */
    const dropApple = () => {
      const a = apple;
      a.body.setEnabled(true); setDyn(a);
      const sk = plan.spots.skeptical, j = (sim.now * 7.3) % 1;
      a.body.setTranslation({ x: sk.x + 0.3 + j * 0.35, y: 4.6, z: sk.z + 0.7 + j * 0.3 }, true);
      a.body.setRotation(qx(0.3 + j), true);
      a.body.setLinvel({ x: -0.1, y: -1, z: 0.15 }, true); a.body.setAngvel({ x: 0.8, y: 0.2, z: -0.6 }, true);
      const t = a.body.translation(); a.cp.set(t.x, t.y, t.z); a.pp.copy(a.cp);
      a.obj.visible = true; a.mode = 'fall'; a.t = 0; a.landed = false; a.restT = 0;
      stage.apple = 'falling'; stage.onApple?.('falling');
    };
    return { setKin, setDyn, read, clearance, tilt, settle, startDrop, startRise, shove, topple, putAway, dropApple };
  }, [R, sim, tmpM, tmpQ, tmpQ2, tmpV, tmpV2, apple, plan]);

  /* ── the pointer ── */
  const cast = (cx: number, cy: number): { a: Actor; point: THREE.Vector3 } | null => {
    const r = gl.domElement.getBoundingClientRect();
    if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return null;
    ray.setFromCamera(new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    const hit = world.castRay(new R.Ray({ x: o.x, y: o.y, z: o.z }, { x: d.x, y: d.y, z: d.z }), 400, true, undefined, undefined, undefined, room.current ?? undefined);
    if (!hit) return null;
    const body = hit.collider.parent();
    const a = body ? actors.find((x) => x.body.handle === body.handle) : undefined;
    if (!a) return null;
    const toi = (hit as unknown as { timeOfImpact?: number; toi?: number }).timeOfImpact ?? (hit as unknown as { toi: number }).toi;
    return { a, point: v3().copy(o).addScaledVector(d, toi) };
  };
  /** The first A, pushed: it falls into the R, and the push runs down the name. */
  const domino = (from: number) => {
    word.forEach((a, i) => { if (i >= from) sim.jobs.push({ at: sim.now + (i - from) * 0.12, run: () => api.topple(a, 1, -0.35, i === from ? 2.6 : 2.2) }); });
  };

  useEffect(() => {
    const p = sim.ptr;
    // Links laid over the things are part of the scene: the pointer still pushes through them.
    const blocked = (e: Event) => { const t = e.target as Element | null; return !!t?.closest?.('[data-nopush]') || (!!t?.closest?.('a, button, input, summary') && !t?.closest?.('[data-thing]')); };
    const move = (e: PointerEvent) => {
      const now = performance.now(), dt = Math.max(4, now - p.t);
      if (p.x >= 0 && now - p.t < 120) { p.vx = lerp(p.vx, ((e.clientX - p.x) / dt) * 1000, 0.5); p.vy = lerp(p.vy, ((e.clientY - p.y) / dt) * 1000, 0.5); } else { p.vx = p.vy = 0; }
      const step = Math.hypot(e.clientX - p.x, e.clientY - p.y);
      if (p.down) p.travel += step;
      p.x = e.clientX; p.y = e.clientY; p.t = now; p.moved = true; p.touch = e.pointerType === 'touch';
      const speed = Math.hypot(p.vx, p.vy);
      p.run += step;
      if (speed < 650 || p.run < 14 || sim.opening || p.touch || blocked(e)) return;
      p.run = 0;
      const hit = cast(p.x, p.y);
      if (!hit || sim.now - hit.a.swipedAt < 0.3) return;
      hit.a.swipedAt = sim.now;
      const right = tmpV.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
      const fwd = camera.getWorldDirection(tmpV2).setY(0).normalize();
      const dir = right.multiplyScalar((p.vx / speed) * 0.7).addScaledVector(fwd, 0.75 - (p.vy / speed) * 0.5).normalize();
      hit.point.y = Math.max(hit.point.y, hit.a.cp.y + hit.a.half.y * 0.45);
      api.shove(hit.a, hit.point, dir.clone(), clamp(speed / 900, 1, 1.6) * (hit.a.kind === 'name' ? 1.7 : 1.4));
    };
    const down = (e: PointerEvent) => { if (e.button !== 0 || blocked(e)) return; p.down = true; p.travel = 0; p.downAt = e.timeStamp; p.x = e.clientX; p.y = e.clientY; p.t = performance.now(); p.touch = e.pointerType === 'touch'; p.vx = p.vy = 0; };
    const up = (e: PointerEvent) => {
      if (!p.down) return; p.down = false;
      stage.dragged = p.travel > 10;
      if (p.travel > 10 || e.timeStamp - p.downAt > 900 || blocked(e) || sim.opening) return;
      if ((e.target as Element | null)?.closest?.('[data-thing]')) return; // the link opens it
      const hit = cast(e.clientX, e.clientY);
      if (!hit || hit.a.kind === 'thing') return;
      if (hit.a.kind === 'name' && hit.a.i === 0 && hit.a.mode === 'home') { domino(0); return; }
      const dir = ray.ray.direction.clone(); dir.y *= 0.12;
      if (dir.lengthSq() < 0.05) return;
      api.shove(hit.a, hit.point, dir.normalize(), 2.3);
    };
    const cancel = () => { p.down = false; };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    window.addEventListener('pointercancel', cancel, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  /* ── what the page prints on the things ── */
  const reprint = () => {
    sim.printV = stage.printV;
    const pr = stage.print;
    const gh = things.find((a) => a.id === 'github')!, np = things.find((a) => a.id === 'notepad')!;
    const face = gh.obj.getObjectByName('engraving') as THREE.Mesh, fm = face.material as THREE.MeshStandardMaterial;
    fm.map?.dispose(); fm.map = pr.gh.n ? T.engraving(pr.gh.n, pr.gh.label) : null; fm.visible = !!pr.gh.n; fm.needsUpdate = true;
    const top = np.obj.getObjectByName('note') as THREE.Mesh, nm = top.material as THREE.MeshStandardMaterial;
    nm.map?.dispose(); nm.map = T.noteSheet(pr.note); nm.needsUpdate = true;
    // Tiles: one per recent commit, clamped to thirty.
    const want = pr.tiles.slice(0, 30).map((c) => (/[a-z0-9]/i.test(c) ? c.toUpperCase() : '·'));
    tiles.forEach((a, i) => {
      if (i < want.length) {
        tileChars[i] = want[i];
        if (a.mode === 'away' && !sim.opening) { a.wait = 0.3 + i * 0.06; api.startDrop(a); }
      } else if (a.mode !== 'away') api.putAway(a);
    });
    tileChars.length = want.length;
    for (const ch of new Set(want)) if (!tileTops.has(ch)) {
      const m = new THREE.InstancedMesh(topGeo, new THREE.MeshStandardMaterial({ map: T.initial(ch), transparent: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }), 30);
      m.count = 0; m.frustumCulled = false; root.add(m); tileTops.set(ch, m);
    }
    stage.dirty = 3; stage.wake = Math.max(stage.wake, 10);
  };

  /* ── one fixed step of everything scripted (from the letters draft) ── */
  const control = (dt: number) => {
    for (const a of actors) {
      switch (a.mode) {
        case 'drop': {
          a.t += dt;
          const tau = a.t - a.wait;
          if (tau < 0) break;
          a.obj.visible = true;
          const fall = Math.sqrt((2 * a.drop) / FALL);
          let y = 0, rx = 0;
          if (tau < fall) y = a.drop - 0.5 * FALL * tau * tau;
          else {
            const s = tau - fall;
            if (!a.landed) { a.landed = true; stage.shake = Math.min(0.09, stage.shake + a.thud); stage.dirty = 3; }
            y = 0.1 * Math.exp(-7.5 * s) * Math.abs(Math.sin(11 * s)); rx = a.rock * Math.exp(-4.4 * s) * Math.sin(12.5 * s);
            if (s > 1.1) { api.settle(a); break; }
          }
          tmpQ.setFromAxisAngle(X, rx); tmpQ2.copy(a.home.q).multiply(tmpQ);
          tmpV.copy(a.home.p); tmpV.y = Math.max(a.home.p.y + y, api.clearance(a, tmpQ2) + 0.001);
          a.body.setNextKinematicTranslation(tmpV); a.body.setNextKinematicRotation(tmpQ2);
          break;
        }
        case 'home': {
          if (a.body.isSleeping()) break;
          const t = a.body.translation();
          if (Math.hypot(t.x - a.home.p.x, t.y - a.home.p.y, t.z - a.home.p.z) > 0.03 || api.tilt(a.body.rotation(), a.home.q) > 0.03) { a.mode = 'loose'; a.looseT = 0; a.restT = 0; a.pushedAt = sim.now; }
          break;
        }
        case 'loose': {
          a.looseT += dt;
          const lv = a.body.linvel(), av = a.body.angvel(), sp = Math.hypot(lv.x, lv.y, lv.z);
          if (sp < 0.35 && Math.hypot(av.x, av.y, av.z) < 0.7) a.restT += dt; else a.restT = 0;
          if (sp > 11) a.body.setLinvel({ x: (lv.x / sp) * 11, y: (lv.y / sp) * 11, z: (lv.z / sp) * 11 }, true);
          const t = a.body.translation();
          const lost = t.y < -2 || Math.abs(t.x - bounds.cx) > bounds.hx - 0.3 || Math.abs(t.z - bounds.cz) > bounds.hz - 0.3;
          if (lost || (sim.now - a.pushedAt > 0.8 && ((a.restT > 0.45 && a.looseT > 1.2) || a.looseT > 4))) api.startRise(a);
          break;
        }
        case 'rise': {
          a.t += dt;
          const k = 62, c = 9.4;
          a.du += (k * (1 - a.u) - c * a.du) * dt; a.u += a.du * dt;
          const done = a.t > 0.35 && Math.abs(1 - a.u) < 0.003 && Math.abs(a.du) < 0.04;
          const e = clamp(a.u);
          tmpQ.setFromAxisAngle(a.axis, a.angle * (1 - a.u)); tmpQ2.copy(tmpQ).multiply(a.to.q);
          tmpV.lerpVectors(a.from.p, a.to.p, smooth(e));
          tmpV.y += a.lift * Math.sin(Math.PI * e);
          tmpV.y = Math.max(tmpV.y, api.clearance(a, tmpQ2) + 0.001);
          a.body.setNextKinematicTranslation(tmpV); a.body.setNextKinematicRotation(tmpQ2);
          if (done) api.settle(a);
          break;
        }
        case 'fall': {
          // The apple: falls, lands with weight, rolls, rests a second, and is simply gone.
          a.t += dt;
          const lv = a.body.linvel(), t = a.body.translation();
          if (!a.landed && t.y < 0.3) { a.landed = true; stage.shake = Math.min(0.09, stage.shake + 0.014); }
          if (a.landed && Math.hypot(lv.x, lv.y, lv.z) < 0.25) a.restT += dt; else a.restT = Math.max(0, a.restT - dt * 0.5);
          if ((a.restT > 1.0 && a.t > 1.4) || a.t > 6 || t.y < -2) {
            api.putAway(a);
            sim.shadowHold = 0.7; stage.apple = 'gone'; stage.onApple?.('gone');
          }
          break;
        }
        default: break;
      }
    }
  };

  /* ── where the links lie over the things ── */
  const corners = useMemo(() => Array.from({ length: 8 }, () => v3()), []);
  const place = () => {
    const r = gl.domElement.getBoundingClientRect();
    if (!r.width) return;
    const check = sim.frame % 6 === 0;
    for (const a of linked) {
      const el = a.key ? stage.links.get(a.key) : undefined;
      if (!el) continue;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, behind = false;
      let n = 0;
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
        const c = corners[n++].set(sx * a.half.x, sy * a.half.y, sz * a.half.z).applyQuaternion(a.obj.quaternion).add(a.obj.position);
        c.project(camera);
        if (c.z > 1) behind = true;
        const px = (c.x * 0.5 + 0.5) * r.width, py = (-c.y * 0.5 + 0.5) * r.height;
        x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      }
      if (check) {
        // Hidden behind something else (a letter, from behind the name)?
        tmpV.copy(a.obj.position); const o = camera.position, d = tmpV2.copy(tmpV).sub(o), dist = d.length(); d.normalize();
        const hit = world.castRay(new R.Ray({ x: o.x, y: o.y, z: o.z }, { x: d.x, y: d.y, z: d.z }), dist, true, undefined, undefined, undefined, room.current ?? undefined);
        const body = hit?.collider.parent();
        a.seen = !body || body.handle === a.body.handle || actors.some((b) => b.body.handle === body.handle && (b.kind === 'tile' || b.kind === 'apple'));
      }
      x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(r.width, x1); y1 = Math.min(r.height, y1);
      const w = x1 - x0, h = y1 - y0;
      const show = a.obj.visible && !behind && a.seen && w > 18 && h > 14 && x1 > 0 && y1 > 0 && x0 < r.width && y0 < r.height && w < r.width * 0.9;
      el.style.visibility = show || el === document.activeElement ? 'visible' : 'hidden';
      if (show) { el.style.transform = `translate(${x0.toFixed(1)}px, ${y0.toFixed(1)}px)`; el.style.width = `${w.toFixed(1)}px`; el.style.height = `${h.toFixed(1)}px`; }
      if (stage.hover === a.key && stage.tag) {
        stage.tag.style.transform = `translate(${((x0 + x1) / 2).toFixed(1)}px, ${(y0 - 10).toFixed(1)}px) translate(-50%, -100%)`;
        stage.tag.dataset.on = show ? '1' : '';
      }
    }
    if (!stage.hover && stage.tag) stage.tag.dataset.on = '';
  };

  /* ── the frame ── */
  useFrame((_, dtRaw) => {
    sim.frame++;
    const dt = sim.quiet >= 4 ? STEP : Math.min(dtRaw, 1);
    if (!sim.started || sim.opening) stage.wake = Math.max(stage.wake, 10);
    if (!envSet.current) {
      const env = scene.environment;
      if (env) { envSet.current = true; for (const m of [M.ink, M.red, M.anod, M.brass, M.white, M.enamel, M.sheet]) { m.envMap = env; m.needsUpdate = true; } }
    }
    if (sim.printV !== stage.printV && stage.go) reprint();
    if (!sim.started && stage.go) {
      sim.started = true;
      word.forEach((a, i) => { a.body.setEnabled(true); a.drop = 6; a.wait = 0.05 + i * 0.075 + (a.ch === '.' ? 0.2 : 0); a.rock = (i % 2 ? 1 : -1) * (0.035 + (i % 3) * 0.012); a.thud = a.ch === '.' ? 0.02 : 0.014; api.startDrop(a); });
      things.forEach((a, i) => { a.body.setEnabled(true); a.wait = 0.75 + i * 0.07; a.rock = (i % 2 ? 1 : -1) * 0.03; a.thud = 0.008; api.startDrop(a); });
      tiles.forEach((a, i) => { if (i < tileChars.length) { a.body.setEnabled(true); a.wait = 1.3 + i * 0.06; api.startDrop(a); } });
    }
    if (sim.opening && sim.started && word.every((a) => a.mode === 'home') && things.every((a) => a.mode === 'home')) { sim.opening = false; stage.opened = true; stage.onOpened?.(); }

    // The gallery behind the name is set up as the camera comes round to it.
    // They are packed away again once the camera has gone back to the front, so the last look at the desk is clean.
    const wf = stage.f - stopIndex('work');
    if (!sim.opening && !sim.printsMade && wf > -0.85 && wf < 0.9) { sim.printsMade = true; prints.forEach((a, i) => { a.body.setEnabled(true); a.wait = i * 0.09; a.thud = 0.006; a.rock = 0.03; api.startDrop(a); }); }
    if (sim.printsMade && (wf > 1.4 || wf < -1.4) && prints.every((a) => a.mode === 'home')) { sim.printsMade = false; prints.forEach((a) => api.putAway(a)); stage.dirty = 3; }
    // The first time the camera arrives at the question mark, an apple falls by itself.
    if (!sim.opening && !sim.appleSeen && Math.abs(stage.f - stopIndex('skeptical')) < 0.08) { sim.appleSeen = true; api.dropApple(); }

    while (stage.cmds.length) {
      const c = stage.cmds.shift()!;
      if (sim.opening) continue;
      if (c.type === 'key') {
        let n = 0;
        for (const a of word) if (a.ch === c.ch) sim.jobs.push({ at: sim.now + 0.09 * n++, run: () => api.topple(a, (a.i % 3) - 1 ? 0.25 : -0.25, -1, 2.2) });
      } else if (c.id === 'skeptical') api.dropApple();
      else { const a = linked.find((x) => x.key === c.id); if (a) a.poke = sim.now; }
    }

    const p = sim.ptr;
    if (p.moved && p.x >= 0 && !sim.opening) { p.moved = false; const h = !p.touch ? cast(p.x, p.y) : null; stage.over = !!h && h.a.kind === 'name'; }

    let busy = sim.jobs.length > 0;
    if (!busy) for (const a of actors) { if (a.mode === 'drop' || a.mode === 'loose' || a.mode === 'rise' || a.mode === 'fall' || (a.mode === 'home' && !a.body.isSleeping())) { busy = true; break; } }
    sim.quiet = busy ? 0 : sim.quiet + 1;
    if (sim.quiet < 6 || stage.shake > 0.0005) { stage.wake = Math.max(stage.wake, 6); if (sim.shadowHold <= 0) stage.dirty = 3; }
    if (sim.shadowHold > 0) { sim.shadowHold -= dt; stage.wake = Math.max(stage.wake, 3); if (sim.shadowHold <= 0) stage.dirty = 3; else stage.dirty = 0; }
    if (sim.started && sim.quiet < 4) {
      sim.acc += dt; let n = 0;
      while (sim.acc >= STEP && n < 60) {
        sim.now += STEP;
        for (let i = sim.jobs.length - 1; i >= 0; i--) if (sim.jobs[i].at <= sim.now) sim.jobs.splice(i, 1)[0].run();
        control(STEP);
        for (const a of actors) { a.pp.copy(a.cp); a.pq.copy(a.cq); }
        world.step();
        for (const a of actors) { if (a.mode === 'away') continue; const t = a.body.translation(), r = a.body.rotation(); a.cp.set(t.x, t.y, t.z); a.cq.set(r.x, r.y, r.z, r.w); }
        sim.acc -= STEP; n++;
      }
      if (n === 60) sim.acc = 0;
    } else { sim.acc = 0; sim.now += dt; }
    const alpha = clamp(sim.acc / STEP);
    let hovering = false;
    for (const a of actors) {
      if (!a.obj.visible) continue;
      a.obj.position.lerpVectors(a.pp, a.cp, alpha); a.obj.quaternion.slerpQuaternions(a.pq, a.cq, alpha);
      if (a.kind === 'thing' || a.kind === 'print') {
        // Hover or focus raises it a little; a click nods it.
        const want = stage.hover === a.key && (a.mode === 'home' || a.mode === 'rise') ? 1 : 0;
        a.hov = Math.abs(a.hov - want) < 0.002 ? want : damp(a.hov, want, 9, dt);
        const pk = sim.now - a.poke, nod = pk < 0.9 ? Math.sin(Math.min(1, pk / 0.9) * Math.PI) : 0;
        if (a.hov !== want || nod) hovering = true;
        a.obj.position.y += a.hov * 0.07 + nod * 0.05;
        if (a.hinge) a.hinge.obj.rotation[a.hinge.axis] = a.hinge.sign * (a.hov * 0.11 + nod * 0.3);
      }
    }
    if (hovering) { stage.wake = Math.max(stage.wake, 3); stage.dirty = Math.max(stage.dirty, 1); }
    // Commit tiles: instance matrices from their bodies.
    let n = 0; const counts = new Map<string, number>();
    tiles.forEach((a, i) => {
      if (!a.obj.visible) return;
      a.obj.updateMatrix(); tileMesh.setMatrixAt(n++, a.obj.matrix);
      const ch = tileChars[i]; const top = ch ? tileTops.get(ch) : undefined;
      if (top) { const k = counts.get(ch) ?? 0; tmpM.makeTranslation(0, TILE.h / 2 + 0.002, 0).premultiply(a.obj.matrix); top.setMatrixAt(k, tmpM); counts.set(ch, k + 1); }
    });
    tileMesh.count = n; tileMesh.instanceMatrix.needsUpdate = true;
    tileTops.forEach((m, ch) => { m.count = counts.get(ch) ?? 0; m.instanceMatrix.needsUpdate = true; });
    place();
    stage.shake = damp(stage.shake, 0, 9, dt);
  });

  return <primitive object={root} />;
}

/* ───────── the camera (from the letters draft, plus the walk along the prints) ───────── */

type CamPose = { p: THREE.Vector3; t: THREE.Vector3; up: THREE.Vector3; fov: number; sx: number; sy: number };
function poseOf(s: Shot, aspect: number, out: CamPose, pan = 0): CamPose {
  const az = (s.az * Math.PI) / 180, el = (s.el * Math.PI) / 180;
  const tanV = Math.tan((s.fov * Math.PI) / 360), tanH = tanV * aspect;
  const fw = s.frame.x1 - s.frame.x0, fh = s.frame.y1 - s.frame.y0;
  const d = Math.max(s.h / (2 * tanV * fh), s.w / (2 * tanH * fw));
  out.t.set(s.at[0] + pan, s.at[1], s.at[2]);
  out.p.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(d).add(out.t);
  out.p.y = Math.max(out.p.y, 0.09);
  if (s.up) out.up.set(s.up[0], s.up[1], s.up[2]); else out.up.set(0, 1, 0);
  out.fov = s.fov; out.sx = (s.frame.x0 + s.frame.x1) / 2 - 0.5; out.sy = (s.frame.y0 + s.frame.y1) / 2 - 0.5;
  return out;
}
const blank = (): CamPose => ({ p: v3(), t: v3(), up: v3(0, 1, 0), fov: 20, sx: 0, sy: 0 });

function Rig({ plan }: { plan: Plan }) {
  const { camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const A = useMemo(blank, []), B = useMemo(blank, []), tmp = useMemo(() => v3(), []), tmp2 = useMemo(() => v3(), []);
  const sway = useRef({ x: 0, y: 0, tx: 0, ty: 0, pan: 0 });
  const curves = useRef(new Map<string, { p: THREE.CatmullRomCurve3; t: THREE.CatmullRomCurve3 }>());
  useEffect(() => { cam.layers.enable(1); cam.near = 0.04; cam.far = 500; }, [cam]);
  useEffect(() => { curves.current.clear(); }, [size.width, size.height, plan]);
  useEffect(() => {
    const move = (e: PointerEvent) => { if (e.pointerType === 'touch') return; sway.current.tx = e.clientX / window.innerWidth - 0.5; sway.current.ty = e.clientY / window.innerHeight - 0.5; };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);
  const moving = useRef(false);
  const W = stopIndex('work');
  const span = plan.phone ? 0 : plan.prints[plan.prints.length - 1].x - plan.prints[0].x - 4.4;
  useFrame((state, dtRaw) => {
    const dt = moving.current ? Math.min(dtRaw, 0.25) : 1 / 60;
    const stops = stage.stops; let raw = 0, pan = 0;
    if (stops.length) {
      const c = scroll.y + window.innerHeight / 2;
      raw = stops.length - 1;
      for (let i = 0; i < stops.length; i++) {
        if (c <= stops[i].b) { raw = c >= stops[i].a || i === 0 ? i : i - 1 + smooth(clamp((c - stops[i - 1].b) / Math.max(1, stops[i].a - stops[i - 1].b))); break; }
      }
      const w = stops[W]; if (w) pan = smooth(clamp((c - w.a) / Math.max(1, w.b - w.a)));
    }
    stage.raw = raw;
    stage.f = Math.abs(raw - stage.f) < 0.0004 ? raw : damp(stage.f, raw, 6, dt);
    const s = sway.current; s.pan = Math.abs(pan - s.pan) < 0.0004 ? pan : damp(s.pan, pan, 6, dt);
    const f = clamp(stage.f, 0, STOPS.length - 1), i = Math.min(STOPS.length - 2, Math.floor(f)), t = f - i;
    const aspect = size.width / size.height;
    poseOf(plan.shots[STOPS[i]], aspect, A, i === W ? s.pan * span : 0); poseOf(plan.shots[STOPS[i + 1]], aspect, B, i + 1 === W ? s.pan * span : 0);
    const key = `${STOPS[i]}>${STOPS[i + 1]}`, via = plan.vias[key];
    if (via && t > 0 && t < 1) {
      let cv = curves.current.get(key);
      if (!cv || key === 'work>today') {
        cv = {
          p: new THREE.CatmullRomCurve3([A.p.clone(), ...via.map((v) => v3(...v.p)), B.p.clone()], false, 'centripetal'),
          t: new THREE.CatmullRomCurve3([A.t.clone(), ...via.map((v) => v3(...v.t)), B.t.clone()], false, 'centripetal'),
        };
        curves.current.set(key, cv);
      }
      cv.p.getPoint(t, cam.position); cv.t.getPoint(t, tmp);
    } else { cam.position.lerpVectors(A.p, B.p, t); tmp.lerpVectors(A.t, B.t, t); }
    cam.up.lerpVectors(A.up, B.up, t).normalize();
    s.x = damp(s.x, s.tx, 3, dt); s.y = damp(s.y, s.ty, 3, dt);
    moving.current = Math.abs(raw - stage.f) > 0.0004 || Math.abs(pan - s.pan) > 0.0004 || Math.abs(s.x - s.tx) + Math.abs(s.y - s.ty) > 0.002 || stage.shake > 0.0005;
    if (moving.current) stage.wake = Math.max(stage.wake, 6);
    const reach = cam.position.distanceTo(tmp);
    tmp2.setFromMatrixColumn(cam.matrixWorld, 0); cam.position.addScaledVector(tmp2, s.x * reach * 0.02);
    cam.position.y += -s.y * reach * 0.011 + (stage.shake > 0.0005 ? Math.sin(state.clock.elapsedTime * 71) * stage.shake * reach * 0.012 : 0);
    cam.position.y = Math.max(cam.position.y, 0.07);
    cam.lookAt(tmp);
    cam.fov = lerp(A.fov, B.fov, t);
    const sx = lerp(A.sx, B.sx, t), sy = lerp(A.sy, B.sy, t);
    cam.setViewOffset(size.width, size.height, -sx * size.width, -sy * size.height, size.width, size.height);
  }, -1);
  return null;
}

/* ───────── light (the letters' key and rim, with the baubles' studio spot from above) ───────── */

function Key({ cx, low }: { cx: number; low: boolean }) {
  const light = useMemo(() => {
    const l = new THREE.DirectionalLight('#fffaf2', 1.85);
    l.position.set(cx - 9, 13, -6.5); l.target.position.set(cx, 0, 0);
    l.castShadow = true; l.shadow.mapSize.set(low ? 1024 : 2048, low ? 1024 : 2048);
    l.shadow.bias = -0.0004; l.shadow.normalBias = 0.035; l.shadow.radius = low ? 3 : 5;
    const c = l.shadow.camera; c.left = -17; c.right = 17; c.top = 14; c.bottom = -14; c.near = 2; c.far = 60; c.updateProjectionMatrix();
    return l;
  }, [cx, low]);
  useEffect(() => () => { light.shadow.map?.dispose(); }, [light]);
  return <><primitive object={light} /><primitive object={light.target} /></>;
}

/** Soft dark where things meet the paper (after drei's ContactShadows), redrawn only when something moved. */
function Contact({ x, z, w, h, res, far, blur, opacity, color }: { x: number; z: number; w: number; h: number; res: number; far: number; blur: number; opacity: number; color: string }) {
  const { gl, scene } = useThree();
  const K = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(res, res), targetBlur = new THREE.WebGLRenderTarget(res, res);
    target.texture.generateMipmaps = targetBlur.texture.generateMipmaps = false;
    const plane = new THREE.PlaneGeometry(w, h).rotateX(Math.PI / 2);
    const blurPlane = new THREE.Mesh(plane); blurPlane.visible = false;
    const depth = new THREE.MeshDepthMaterial(); depth.depthTest = depth.depthWrite = false;
    depth.onBeforeCompile = (shader) => {
      shader.uniforms.ucolor = { value: new THREE.Color(color) };
      shader.fragmentShader = shader.fragmentShader.replace('void main() {', 'uniform vec3 ucolor;\nvoid main() {')
        .replace('vec4( vec3( 1.0 - fragCoordZ ), opacity );', 'vec4( ucolor * fragCoordZ * 2.0, ( 1.0 - fragCoordZ ) * 1.0 );');
    };
    const hb = new THREE.ShaderMaterial(HorizontalBlurShader), vb = new THREE.ShaderMaterial(VerticalBlurShader);
    hb.depthTest = vb.depthTest = false;
    const cam = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0, far);
    const show = new THREE.MeshBasicMaterial({ transparent: true, map: target.texture, opacity, depthWrite: false });
    const mesh = new THREE.Mesh(plane, show); mesh.scale.set(1, -1, 1); mesh.rotation.x = -Math.PI / 2;
    const group = new THREE.Group(); group.rotation.x = Math.PI / 2; group.position.set(x, 0.006, z); group.add(mesh, cam, blurPlane);
    return { target, targetBlur, plane, blurPlane, depth, hb, vb, cam, show, group };
  }, [x, z, w, h, res, far, opacity, color]);
  useEffect(() => () => { K.target.dispose(); K.targetBlur.dispose(); K.plane.dispose(); K.depth.dispose(); K.hb.dispose(); K.vb.dispose(); K.show.dispose(); }, [K]);
  useFrame(() => {
    if (stage.dirty <= 0) return;
    stage.dirty--;
    gl.shadowMap.needsUpdate = true;
    const bg = scene.background, om = scene.overrideMaterial;
    K.group.visible = false; scene.background = null; scene.overrideMaterial = K.depth;
    gl.setRenderTarget(K.target); gl.render(scene, K.cam);
    scene.overrideMaterial = om;
    const pass = (b: number) => {
      K.blurPlane.visible = true;
      K.blurPlane.material = K.hb; K.hb.uniforms.tDiffuse.value = K.target.texture; K.hb.uniforms.h.value = b / 256;
      gl.setRenderTarget(K.targetBlur); gl.render(K.blurPlane, K.cam);
      K.blurPlane.material = K.vb; K.vb.uniforms.tDiffuse.value = K.targetBlur.texture; K.vb.uniforms.v.value = b / 256;
      gl.setRenderTarget(K.target); gl.render(K.blurPlane, K.cam);
      K.blurPlane.visible = false;
    };
    K.group.visible = true; pass(blur); pass(blur * 0.4);
    gl.setRenderTarget(null); scene.background = bg;
  });
  return <primitive object={K.group} />;
}

/** Frames are drawn only while something is happening, and never while the stage is off screen. */
function Pump() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let last = -1;
    const poke = () => { stage.wake = Math.max(stage.wake, 45); };
    const tick = () => {
      if (scroll.y !== last) { last = scroll.y; stage.wake = Math.max(stage.wake, 30); }
      if (stage.cmds.length || !stage.opened) stage.wake = Math.max(stage.wake, 10);
      if (stage.wake > 0 && !document.hidden) { stage.wake--; invalidate(); }
    };
    stage.wake = Math.max(stage.wake, 180); stage.dirty = 4;
    gsap.ticker.add(tick);
    const evs = ['pointermove', 'pointerdown', 'pointerup', 'keydown', 'resize', 'focusin'] as const;
    evs.forEach((e) => window.addEventListener(e, poke, { passive: true }));
    return () => { gsap.ticker.remove(tick); evs.forEach((e) => window.removeEventListener(e, poke)); };
  }, [invalidate]);
  return null;
}

export default function Stage({ plan }: { plan: Plan }) {
  const M = useMemo(makeMaterials, []);
  useEffect(() => () => { [M.ink, M.red, M.anod, M.brass, M.sheet, M.white, M.enamel, M.kraft, M.paper].forEach((m) => m.dispose()); M.textures.forEach((t) => t.dispose()); }, [M]);
  const low = plan.phone;
  const cx = (plan.x0 + plan.x1) / 2, cz = (plan.z0 + plan.z1) / 2;
  return (
    <Canvas
      frameloop="demand" shadows={{ type: THREE.PCFShadowMap }} dpr={[1, low ? 1.5 : 1.6]} camera={{ fov: 15, near: 0.04, far: 500, position: [0, 3, 40] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1.02; gl.shadowMap.autoUpdate = false; gl.shadowMap.needsUpdate = true; }}
      style={{ touchAction: 'pan-y', pointerEvents: 'none' }}
    >
      <color attach="background" args={[PAPER]} />
      <fog attach="fog" args={[PAPER, 70, 300]} />
      <hemisphereLight args={['#ffffff', '#e4e0d6', 0.9]} />
      <Key cx={cx} low={low} />
      <directionalLight position={[cx + 6, 7, 14]} intensity={2.2} color="#fbfaff" />
      {/* A cool rim from behind. */}
      <directionalLight position={[cx + 4, 6, -14]} intensity={1.1} color="#dfe8ff" />
      {/* The studio spot from above, soft-edged (after the baubles rig). */}
      <spotLight position={[cx + 3, 16, 9]} angle={0.5} penumbra={1} intensity={0.9 * Math.PI} decay={0} color="#fff8ee" />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#3f3b34']} />
        <Lightformer form="rect" intensity={3.4} color="#fffaf0" position={[-6, 9, 3]} rotation-x={Math.PI / 2} scale={[16, 6, 1]} />
        <Lightformer form="rect" intensity={2.0} color="#fffaf0" position={[4, 9, 7]} rotation-x={Math.PI / 2} scale={[14, 3, 1]} />
        <Lightformer form="rect" intensity={4.2} color="#fff6ea" position={[-12, 4, 6]} rotation-y={Math.PI / 2.4} scale={[2.6, 9, 1]} />
        <Lightformer form="rect" intensity={2.6} color="#eef2ff" position={[12, 4, -2]} rotation-y={-Math.PI / 2} scale={[2.6, 9, 1]} />
        <Lightformer form="rect" intensity={1.1} color="#f6f2ea" position={[0, 4, 16]} rotation-y={Math.PI} scale={[22, 5, 1]} />
        <Lightformer form="rect" intensity={0.85} color="#efe9dc" position={[0, -2.5, 0]} rotation-x={-Math.PI / 2} scale={[60, 60, 1]} />
      </Environment>
      <Sweep zf={plan.z0 - 4} material={M.paper} />
      <Suspense fallback={null}>
        <Physics paused gravity={[0, -GRAV, 0]}>
          <TheSet plan={plan} M={M} low={low} />
        </Physics>
      </Suspense>
      <Contact x={cx} z={cz} w={(plan.x1 - plan.x0) + 6} h={(plan.z1 - plan.z0) + 3} res={low ? 512 : 1024} far={2.6} blur={low ? 1.5 : 2.1} opacity={0.62} color="#231b12" />
      <Rig plan={plan} />
      <Pump />
    </Canvas>
  );
}
