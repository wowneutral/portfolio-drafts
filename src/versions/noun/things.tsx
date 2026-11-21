// The things the nouns point at. Remixed from pmndrs/examples dbismut-furniture (MIT): each one stands
// in its own scene, lit by one key and a rim, on a floor that only keeps its shadow.
import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import { easing } from 'maath';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { RESEARCH, PERSON, WORK } from '@/content';
import WORDS from './words.json';

const BASE = import.meta.env.BASE_URL;
export type ThingId =
  | 'fbk' | 'wildcat' | 'q' | 'paper' | 'github' | 'today' | 'tea' | 'plato' | 'none' | 'self'
  | `print:${(typeof WORK)[number]['slug']}`;

export type Live = { count: number; countLabel: string; noteDate: string; noteLine: string };

// ---- materials -------------------------------------------------------------------------
const lacquer = () => new THREE.MeshPhysicalMaterial({ color: '#121211', roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.14, envMapIntensity: 0.45 });
const redLacquer = () => new THREE.MeshPhysicalMaterial({ color: '#c8321e', roughness: 0.36, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 0.85 });
const paperEdge = () => new THREE.MeshStandardMaterial({ color: '#efede6', roughness: 0.92 });

// ---- extruded type ----------------------------------------------------------------------
type Word = keyof typeof WORDS;
const shapeCache = new Map<string, THREE.Shape[]>();
function shapes(word: Word): THREE.Shape[] {
  if (!shapeCache.has(word)) {
    // Flip y in 2D, before extruding, so the faces keep their winding.
    const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path transform="scale(1,-1)" d="${WORDS[word].d}"/></svg>`);
    shapeCache.set(word, data.paths.flatMap((p) => SVGLoader.createShapes(p)));
  }
  return shapeCache.get(word)!;
}
/** A word as a solid, `cap` high, standing with its baseline at y = 0, centred in x. */
function solidWord(word: Word, cap: number, depth: number) {
  const k = cap / 700; // Schibsted Grotesk caps are about 700 units at 1000 per em
  const bevel = Math.min(0.03, cap * 0.05);
  const g = new THREE.ExtrudeGeometry(shapes(word), { depth: depth - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelOffset: -bevel * 0.8, bevelSegments: 3, curveSegments: 6 });
  g.scale(k, k, 1);
  g.computeBoundingBox();
  const b = g.boundingBox!;
  g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -depth / 2);
  g.computeVertexNormals();
  return { g, w: b.max.x - b.min.x, h: b.max.y - b.min.y };
}

/** CHAMPION over the event's name, three lines set to one width like a poster, cast as one block of type. */
export function Champion({ lines, width = 2.9 }: { lines: [Word, Word]; width?: number }) {
  const parts = useMemo(() => {
    const mat = lacquer();
    const cap = (w: Word) => (width / WORDS[w].w) * 700;
    const top = solidWord('CHAMPION', cap('CHAMPION'), 0.4);
    const a = solidWord(lines[0], cap(lines[0]), 0.34);
    const b = solidWord(lines[1], cap(lines[1]), 0.34);
    const gap = width * 0.035;
    return { mat, rows: [{ ...b, y: 0, z: 0.12 }, { ...a, y: b.h + gap, z: 0.06 }, { ...top, y: b.h + a.h + gap * 2, z: 0 }] };
  }, [lines, width]);
  useEffect(() => () => { parts.mat.dispose(); parts.rows.forEach((r) => r.g.dispose()); }, [parts]);
  return (
    <group>
      {parts.rows.map((r, i) => <mesh key={i} geometry={r.g} material={parts.mat} position={[0, r.y, r.z]} castShadow receiveShadow />)}
    </group>
  );
}

/** The Skeptical question mark: the Anton glyph from the letters draft, in red lacquer. */
export function Question() {
  const { g, mat } = useMemo(() => {
    const q = WORDS['?'];
    const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path transform="scale(1,-1)" d="${q.d}"/></svg>`);
    const sh = data.paths.flatMap((p) => SVGLoader.createShapes(p));
    const g = new THREE.ExtrudeGeometry(sh, { depth: 260, bevelEnabled: true, bevelThickness: 26, bevelSize: 22, bevelOffset: -22, bevelSegments: 4, curveSegments: 10 });
    const k = 2.3 / 860;
    g.scale(k, k, k);
    g.computeBoundingBox();
    const b = g.boundingBox!;
    g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
    g.computeVertexNormals();
    return { g, mat: redLacquer() };
  }, []);
  useEffect(() => () => { g.dispose(); mat.dispose(); }, [g, mat]);
  return <mesh geometry={g} material={mat} rotation={[0, -0.32, 0]} castShadow receiveShadow />;
}

// ---- prints and cards ------------------------------------------------------------------
/** A thick card standing on a lean: `face` on the front, paper on the edges. */
function Lean({ w, h, d = 0.07, face, back = '#e9e6dd', edge, lean = 0.13, yaw = -0.28 }: { w: number; h: number; d?: number; face: THREE.Material; back?: string; edge?: THREE.Material; lean?: number; yaw?: number }) {
  const mats = useMemo(() => {
    const e = edge ?? paperEdge();
    const b = new THREE.MeshStandardMaterial({ color: back, roughness: 0.9 });
    return { list: [e, e, e, e, face, b], own: [b, ...(edge ? [] : [e])] };
  }, [face, back, edge]);
  useEffect(() => () => mats.own.forEach((m) => m.dispose()), [mats]);
  // Pivot on the bottom back edge so the lean rests on the floor.
  return (
    <group rotation={[0, yaw, 0]} position={[0, 0, 0.2]}>
      <group rotation={[-lean, 0, 0]}>
        <mesh position={[0, h / 2, -d / 2]} material={mats.list} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
        </mesh>
      </group>
    </group>
  );
}

export function Print({ slug }: { slug: string }) {
  const item = WORK.find((x) => x.slug === slug)!;
  const tex = useTexture(BASE + item.img);
  const face = useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    return new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.3, envMapIntensity: 0.5 });
  }, [tex]);
  useEffect(() => () => face.dispose(), [face]);
  const img = tex.image as { width: number; height: number };
  const w = 2.7, h = (w * img.height) / img.width;
  return <Lean w={w} h={h} d={0.08} face={face} />;
}

/** A canvas texture, drawn once the fonts are ready. */
function useCanvas(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, deps: unknown[]) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }, [w, h]);
  useEffect(() => {
    let live = true;
    const go = () => { if (!live) return; const g = (tex.image as HTMLCanvasElement).getContext('2d')!; g.clearRect(0, 0, w, h); draw(g); tex.needsUpdate = true; };
    go(); document.fonts.ready.then(go);
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number, lines = 6) {
  const words = text.split(' '); let line = '', n = 0;
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > max && line) { g.fillText(n === lines - 1 ? line + '…' : line, x, y); y += lh; line = w; if (++n >= lines) return; } else line = t;
  }
  if (line) g.fillText(line, x, y);
}

const F = (wt: number, px: number) => `${wt} ${px}px "Schibsted Grotesk", sans-serif`;

/** The paper: fifteen bound sheets, the title on the cover. */
export function Paper() {
  const p = RESEARCH[0];
  const cover = useCanvas(1024, 1448, (g) => {
    g.fillStyle = '#f6f4ee'; g.fillRect(0, 0, 1024, 1448);
    g.fillStyle = '#151514';
    g.font = F(800, 96); wrap(g, p.short + '.', 92, 300, 840, 104, 4);
    g.font = F(400, 34); g.fillStyle = '#3c3b37';
    wrap(g, 'Wittgenstein, Mauthner, and the Pyrrhonian Critique of Language', 92, 620, 800, 46, 3);
    g.font = F(600, 34); g.fillStyle = '#151514'; g.fillText(PERSON.name, 92, 1240);
    g.font = F(400, 28); g.fillStyle = '#3c3b37'; g.fillText('doi ' + p.doi, 92, 1290);
    g.fillStyle = '#c8321e'; g.fillRect(92, 150, 64, 10);
  }, []);
  const parts = useMemo(() => {
    const face = new THREE.MeshStandardMaterial({ map: cover, roughness: 0.85 });
    const sheet = new THREE.MeshStandardMaterial({ color: '#f3f1ea', roughness: 0.9 });
    const tape = new THREE.MeshPhysicalMaterial({ color: '#1a1a19', roughness: 0.55, clearcoat: 0.3 });
    return { face, sheet, tape };
  }, [cover]);
  useEffect(() => () => { parts.face.dispose(); parts.sheet.dispose(); parts.tape.dispose(); }, [parts]);
  const W = 1.62, H = 2.29, T = 0.011;
  const sheets = useMemo(() => Array.from({ length: 15 }, (_, i) => ({ dx: Math.sin(i * 7.1) * 0.008, dy: Math.cos(i * 3.3) * 0.006, r: Math.sin(i * 1.7) * 0.004 })), []);
  return (
    <group rotation={[0, -0.34, 0]} position={[0, 0, 0.1]}>
      <group rotation={[-0.16, 0, 0]}>
        {sheets.map((s, i) => (
          <mesh key={i} position={[s.dx, H / 2 + s.dy + 0.003, -(i + 0.5) * T]} rotation={[0, 0, s.r]} material={i === 0 ? [parts.sheet, parts.sheet, parts.sheet, parts.sheet, parts.face, parts.sheet] : parts.sheet} castShadow receiveShadow>
            <boxGeometry args={[W, H, T * 0.8]} />
          </mesh>
        ))}
        <mesh position={[-W / 2 + 0.04, H / 2, -15 * T / 2]} material={parts.tape} castShadow>
          <boxGeometry args={[0.1, H + 0.004, 15 * T + 0.012]} />
        </mesh>
      </group>
    </group>
  );
}

// The GitHub mark, from primer/octicons (MIT), 16 unit box.
const MARK = 'M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z';

/** A matte black block, the mark raised on its face, the live count printed under it. */
export function GitHubBlock({ live }: { live: Live }) {
  const print = useCanvas(1024, 1024, (g) => {
    g.fillStyle = '#161615'; g.fillRect(0, 0, 1024, 1024);
    g.fillStyle = '#e9e7e0'; g.textAlign = 'center';
    g.font = F(800, 210); g.fillText(String(live.count), 512, 800);
    g.font = F(600, 44); g.fillStyle = '#b9b7ae'; g.fillText(live.countLabel, 512, 880);
  }, [live.count, live.countLabel]);
  const parts = useMemo(() => {
    const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path transform="translate(-8,8) scale(1,-1)" d="${MARK}"/></svg>`);
    const mg = new THREE.ExtrudeGeometry(data.paths.flatMap((p) => SVGLoader.createShapes(p)), { depth: 1.2, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.12, bevelOffset: -0.12, bevelSegments: 3, curveSegments: 12 });
    mg.scale(0.06, 0.06, 0.06); mg.computeVertexNormals();
    const face = new THREE.MeshStandardMaterial({ map: print, roughness: 0.82 });
    const body = new THREE.MeshStandardMaterial({ color: '#161615', roughness: 0.8 });
    const mark = new THREE.MeshPhysicalMaterial({ color: '#0d0d0c', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 });
    return { mg, face, body, mark };
  }, [print]);
  useEffect(() => () => { Object.values(parts).forEach((p) => (p as { dispose(): void }).dispose()); }, [parts]);
  const S = 2.0, D = 0.42;
  return (
    <group rotation={[0, -0.3, 0]}>
      <mesh position={[0, S / 2, 0]} material={[parts.body, parts.body, parts.body, parts.body, parts.face, parts.body]} castShadow receiveShadow>
        <boxGeometry args={[S, S, D]} />
      </mesh>
      <mesh geometry={parts.mg} material={parts.mark} position={[0, S * 0.64, D / 2]} castShadow />
    </group>
  );
}

/** Today: a card printed with the latest note's date and first line. */
export function TodayCard({ live }: { live: Live }) {
  const tex = useCanvas(1024, 1300, (g) => {
    g.fillStyle = '#f7f5ef'; g.fillRect(0, 0, 1024, 1300);
    g.fillStyle = '#c8321e'; g.fillRect(84, 110, 64, 10);
    g.fillStyle = '#151514'; g.font = F(800, 92); wrap(g, live.noteDate || 'Today', 84, 260, 860, 100, 2);
    g.fillStyle = '#2b2a27'; g.font = F(400, 46); wrap(g, live.noteLine, 84, 520, 850, 64, 9);
  }, [live.noteDate, live.noteLine]);
  const face = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.88 }), [tex]);
  useEffect(() => () => face.dispose(), [face]);
  return <Lean w={1.8} h={2.28} d={0.05} face={face} lean={0.15} yaw={-0.22} />;
}

/** One of the scanned or sampled models, scaled to a height, its feet on the floor. */
function useModel(url: string, height: number, fix: (m: THREE.Mesh) => void) {
  const { scene } = useGLTF(url) as unknown as { scene: THREE.Group };
  return useMemo(() => {
    const root = scene.clone(true);
    root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; fix(m); } });
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root), c = box.getCenter(new THREE.Vector3());
    const k = height / (box.max.y - box.min.y);
    const g = new THREE.Group(); root.scale.setScalar(k); root.position.set(-c.x * k, -box.min.y * k, -c.z * k); g.add(root);
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, height]);
}

/** The Khronos teacup. three r187 ignores KHR_materials_diffuse_transmission, so: thin porcelain by hand. */
export function Tea() {
  const g = useModel(BASE + 'noun/teacup.glb', 1.15, (m) => {
    const old = m.material as THREE.MeshStandardMaterial;
    m.material = new THREE.MeshPhysicalMaterial({
      color: '#fbf8f2', roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.08, normalMap: old.normalMap, aoMap: old.aoMap,
      transmission: 0.25, thickness: 0.35, attenuationColor: new THREE.Color('#f0c48c'), attenuationDistance: 0.5, ior: 1.5, envMapIntensity: 0.9,
    });
  });
  return <primitive object={g} scale={1.25} rotation={[0, 0.6, 0]} />;
}

/** Plato, seen from behind. */
export function Plato() {
  const g = useModel(BASE + 'noun/plato.glb', 2.35, (m) => { const mt = m.material as THREE.MeshStandardMaterial; mt.envMapIntensity = 0.55; });
  return <primitive object={g} rotation={[0, Math.PI + 0.35, 0]} />;
}

/** No object: only a soft shadow on the floor, where one would stand. */
export function Shadow() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d')!;
    const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, 'rgba(0,0,0,0.42)'); r.addColorStop(0.5, 'rgba(0,0,0,0.16)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  const ref = useRef<THREE.MeshBasicMaterial>(null!);
  useFrame((_, dt) => { if (ref.current) easing.damp(ref.current, 'opacity', 1, 0.6, dt); });
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0.3]} scale={[1.9, 0.9, 1]}>
      <planeGeometry args={[2, 2]} />
      <meshBasicMaterial ref={ref} map={tex} transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

export function Thing({ id, live }: { id: ThingId; live: Live }) {
  switch (id) {
    case 'fbk': return <Champion lines={['FLORIDA', 'BLUE KEY']} width={2.6} />;
    case 'wildcat': return <Champion lines={['WILDCAT', 'CLASSIC']} width={2.6} />;
    case 'q': return <Question />;
    case 'paper': return <Paper />;
    case 'github': return <GitHubBlock live={live} />;
    case 'today': return <TodayCard live={live} />;
    case 'tea': return <Tea />;
    case 'plato': return <Plato />;
    case 'self': return <Shadow />;
    case 'none': return null;
    default: return <Print slug={id.slice(6)} />;
  }
}
