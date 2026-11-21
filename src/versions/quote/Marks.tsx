// Remixed from pmndrs/examples "canvas-text" (MIT): enormous DOM text with a pointer-transparent canvas sharing its event source, two shadow-casting solids that answer the pointer.
// Here the boxes are Newsreader's own curly quotation marks, extruded and bevelled; glyph path parsing after the letters draft's geo.ts.
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import GLYPHS from './quotes.json';

export type Slot = { x: number; y: number; w: number }; // centre and width in px, relative to the container
export type Rig = {
  slots: [Slot, Slot] | null;
  knock: [number, number];   // count of knocks per mark; the scene compares with its own copy
  hot: [boolean, boolean];
  wake: () => void;
  visible: boolean;
};

export function makeRig(): Rig {
  return { slots: null, knock: [0, 0], hot: [false, false], wake: () => {}, visible: true };
}

/** One glyph path (y down, font units) as flat shapes with y up. */
function shapesOf(d: string) {
  const out: THREE.Shape[] = [];
  let cur: THREE.Shape | null = null;
  const re = /([MLQCZ])([^MLQCZ]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    const n = (m[2].match(/-?\d*\.?\d+/g) ?? []).map(Number);
    if (m[1] === 'M') { if (cur) out.push(cur); cur = new THREE.Shape(); cur.moveTo(n[0], -n[1]); }
    else if (m[1] === 'L' && cur) cur.lineTo(n[0], -n[1]);
    else if (m[1] === 'Q' && cur) cur.quadraticCurveTo(n[0], -n[1], n[2], -n[3]);
    else if (m[1] === 'C' && cur) cur.bezierCurveTo(n[0], -n[1], n[2], -n[3], n[4], -n[5]);
    else if (m[1] === 'Z' && cur) { out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  return out;
}

/** A bevelled solid one unit wide, centred, front face toward +z. */
function markGeometry(ch: string) {
  const g = GLYPHS.glyphs.find((x) => x.ch === ch)!;
  const geo = new THREE.ExtrudeGeometry(shapesOf(g.d), {
    depth: 70, curveSegments: 14, bevelEnabled: true, bevelThickness: 16, bevelSize: 10, bevelOffset: 0, bevelSegments: 6,
  });
  geo.computeBoundingBox();
  const b = geo.boundingBox!;
  geo.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -(b.min.z + b.max.z) / 2);
  const k = 1 / (b.max.x - b.min.x);
  geo.scale(k, k, k);
  geo.computeVertexNormals();
  return geo;
}

/** Height over width of a mark, for laying out its button and its fallback. */
export const ASPECT = 251 / 326;

type Body = { off: number; offV: number; spin: number; spinV: number; target: number; lift: number; rx: number; ry: number; seen: number };

function Scene({ rig, still, enter }: { rig: Rig; still: boolean; enter: boolean }) {
  const { size, viewport, invalidate, camera } = useThree();
  const geos = useMemo(() => [markGeometry('“'), markGeometry('”')], []);
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#2a3fb0', roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.2 }), []);
  const meshes = useRef<(THREE.Mesh | null)[]>([null, null]);
  const bodies = useRef<Body[]>([0, 1].map((i) => ({ off: still || !enter ? 0 : (i ? 1 : -1), offV: 0, spin: 0, spinV: 0, target: 0, lift: 0, rx: 0, ry: 0, seen: 0 })));
  const born = useRef(performance.now());
  const key = useRef<THREE.SpotLight>(null);

  useEffect(() => { rig.wake = () => invalidate(); invalidate(); return () => { rig.wake = () => {}; }; }, [rig, invalidate]);
  useEffect(() => () => { geos.forEach((g) => g.dispose()); mat.dispose(); }, [geos, mat]);

  useFrame((state, dtRaw) => {
    const s = rig.slots;
    if (!s) return;
    const dt = Math.min(dtRaw, 1 / 30);
    const f = viewport.width / size.width;
    const halfW = viewport.width / 2;
    let moving = false;
    const age = (performance.now() - born.current) / 1000;
    if (key.current) {
      // One lamp above the page and a little toward the reader: shadows fall down and outward, into the margins.
      key.current.position.set(viewport.width * 0.08, viewport.height * 1.1, viewport.height * 2.3);
      key.current.target.position.set(0, -viewport.height * 0.1, 0);
      key.current.target.updateMatrixWorld();
    }
    for (let i = 0; i < 2; i++) {
      const m = meshes.current[i], b = bodies.current[i], slot = s[i];
      if (!m) continue;
      const w = slot.w * f;
      // Pull the lifted solid back along the view ray so it lands exactly on its slot on the page.
      const zr = (12 - w * 0.3) / 12;
      const x = (slot.x - size.width / 2) * f * zr, y = -(slot.y - size.height / 2) * f * zr;
      // Entrance: from beyond the page edge into the margin, on a spring with a little overshoot.
      if (!still && age > 0.25 + i * 0.12) {
        const a = -70 * b.off - 11 * b.offV;
        b.offV += a * dt; b.off += b.offV * dt;
      }
      // Knock: one full turn, sprung, settling back face on.
      if (rig.knock[i] !== b.seen) { b.seen = rig.knock[i]; if (still) { b.target = 0; } else { b.target += Math.PI * 2; b.spinV += 9; } }
      if (!still) {
        const a = -38 * (b.spin - b.target) - 5.2 * b.spinV;
        b.spinV += a * dt; b.spin += b.spinV * dt;
      }
      // Lean toward the pointer, a few degrees at most.
      const px = (state.pointer.x * halfW - x), py = (state.pointer.y * viewport.height / 2 - y);
      const near = still ? 0 : 1;
      const tx = THREE.MathUtils.clamp(-py / viewport.height, -0.5, 0.5) * 0.55 * near;
      const ty = THREE.MathUtils.clamp(px / viewport.width, -0.5, 0.5) * 0.75 * near;
      const k = 1 - Math.exp(-6 * dt);
      b.rx += (tx - b.rx) * k; b.ry += (ty - b.ry) * k;
      b.lift += ((rig.hot[i] ? 1 : 0) - b.lift) * (1 - Math.exp(-10 * dt));
      const edge = (halfW + w) * (i ? 1 : -1) - x;
      m.position.set(x + b.off * Math.abs(edge) * (i ? 1 : -1) * 1, y, w * (0.3 + 0.16 * b.lift) + Math.abs(Math.sin(b.spin / 2)) * w * 0.35);
      m.rotation.set(b.rx, b.ry + b.spin, b.off * 0.9 * (i ? 1 : -1));
      m.scale.setScalar(w * (1 + 0.05 * b.lift));
      if (Math.abs(b.off) > 1e-4 || Math.abs(b.offV) > 1e-4 || Math.abs(b.spin - b.target) > 1e-4 || Math.abs(b.spinV) > 1e-4 || Math.abs(b.rx - tx) > 1e-4 || Math.abs(b.ry - ty) > 1e-4 || Math.abs(b.lift - (rig.hot[i] ? 1 : 0)) > 1e-3) moving = true;
      if (Math.abs(b.spin - b.target) < 1e-4 && Math.abs(b.spinV) < 1e-4 && b.target !== 0) { b.target = 0; b.spin = 0; }
    }
    void camera;
    if ((moving || age < 1.6) && rig.visible) invalidate();
  });

  return (
    <>
      <ambientLight intensity={0.55} />
      <spotLight ref={key} angle={0.9} penumbra={0.9} intensity={85} decay={1.2} castShadow shadow-mapSize={[1024, 1024]} shadow-radius={9} shadow-bias={-0.0004} shadow-normalBias={0.01} />
      <directionalLight position={[-6, 2, 3]} intensity={0.6} />
      {[0, 1].map((i) => (
        <mesh key={i} ref={(el) => { meshes.current[i] = el; }} geometry={geos[i]} material={mat} castShadow />
      ))}
      <mesh receiveShadow scale={[viewport.width * 1.2, viewport.height * 1.2, 1]}>
        <planeGeometry />
        <shadowMaterial transparent opacity={0.17} color="#2b2418" />
      </mesh>
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 5, 4]} scale={[10, 3, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.6} position={[-6, 0, 3]} scale={[2, 8, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.2} position={[6, -1, 2]} scale={[2, 8, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={0.8} color="#f1efe9" position={[0, -4, 6]} scale={[12, 2, 1]} target={[0, 0, 0]} />
      </Environment>
    </>
  );
}

export default function Marks({ rig, source, still, enter }: { rig: Rig; source: React.RefObject<HTMLElement>; still: boolean; enter: boolean }) {
  return (
    <Canvas
      className="marks-canvas"
      shadows={{ type: THREE.PCFShadowMap }}
      frameloop="demand"
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.NeutralToneMapping }}
      camera={{ position: [0, 0, 12], fov: 18, near: 0.1, far: 60 }}
      style={{ pointerEvents: 'none' }}
      // As in the example: the canvas and the text share one event source, so the marks can follow a pointer that is over the words.
      eventSource={source as React.RefObject<HTMLElement>}
      eventPrefix="offset"
    >
      <Scene rig={rig} still={still} enter={enter} />
    </Canvas>
  );
}
