// The studio, the zero-gravity rapier world, the kinematic pointer ball and the three materials are after
// Lusion's connectors example (pmndrs/examples, lusion-connectors, MIT). The connectors became Gloock letters
// that spring back to their own slot in his name.
import * as THREE from 'three';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei';
import { BallCollider, CuboidCollider, Physics, RigidBody, useBeforePhysicsStep, type RapierRigidBody } from '@react-three/rapier';
import { EffectComposer, N8AO } from '@react-three/postprocessing';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { layout, letter, solid } from './geo';

export type Mode = 'name' | 'clump' | 'end';
export type Ctrl = {
  ptr: { x: number; y: number; on: boolean; t: number };
  wake: () => void;
  sleep: () => void;
  scatter: () => void;
  shove: (ch: string) => void;
  seen: boolean;
};
export const makeCtrl = (): Ctrl => ({ ptr: { x: 0, y: 0, on: false, t: 0 }, wake() {}, sleep() {}, scatter() {}, shove() {}, seen: true });

// Lusion's palette, narrowed to his: gloss black, satin white, gloss white, and the one blue.
const MATS = [
  { color: '#5b5d66', roughness: 0.14 },
  { color: '#f2f0ea', roughness: 0.7 },
  { color: '#f2f0ea', roughness: 0.1 },
  { color: '#4d6bff', roughness: 0.12 },
  { color: '#4d6bff', roughness: 0.65 },
];
// A R M A A N  S E T H .   (blue on R, the second A, T and the full stop)
const NAME_MATS = [0, 3, 1, 2, 4, 1, 1, 0, 3, 2, 3];
const CLUMP_MATS = [0, 1, 3, 2, 0, 1, 2, 4];

const FOV = 17.5, TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const r = THREE.MathUtils.randFloatSpread;
const geoCache = new Map<string, THREE.BufferGeometry>();
function geo(ch: string, cap: number, low: boolean) {
  const key = ch + cap + (low ? 'l' : 'h');
  let g = geoCache.get(key);
  if (!g) { const o = letter(ch, cap, low ? 4 : 7); g = toCreasedNormals(solid(o, cap * 0.46, cap * 0.016, low ? 2 : 3), 0.6); geoCache.set(key, g); }
  return g;
}

type Piece = { ch: string; cap: number; slot: THREE.Vector3; start: THREE.Vector3; rot: THREE.Euler; half: [number, number, number]; mat: number };

function plan(mode: Mode, chars: string[], phone: boolean, aspect: number) {
  const pieces: Piece[] = [];
  if (mode === 'clump') {
    const n = chars.length;
    const cap = n <= 6 ? 1.9 : n <= 12 ? 1.25 : 0.9;
    chars.forEach((ch, i) => {
      const o = letter(ch, cap, 2);
      const v = new THREE.Vector3(r(6), r(5), r(2));
      pieces.push({ ch, cap, slot: new THREE.Vector3(), start: v, rot: new THREE.Euler(r(6), r(6), r(6)), half: [o.w / 2, o.h / 2, cap * 0.23], mat: CLUMP_MATS[i % CLUMP_MATS.length] });
    });
    return { pieces, z: 22 };
  }
  const lines = mode === 'end' && !phone ? ['ARMAAN SETH.'] : ['ARMAAN', 'SETH.'];
  const lay = lines.map((l) => layout(l, 0.07));
  const width = Math.max(...lay.map((l) => l.width));
  const lead = 1.42, height = 1 + lead * (lines.length - 1);
  const fill = mode === 'end' ? (phone ? 0.5 : 0.6) : phone ? 0.86 : 0.8;
  const z = Math.max(width / fill / (2 * TAN * aspect), (height + (mode === 'end' ? 1.3 : 0.9)) / (2 * TAN));
  const vw = 2 * z * TAN * aspect, vh = 2 * z * TAN;
  let k = 0;
  lay.forEach((l, li) => {
    const y0 = height / 2 - 0.5 - li * lead;
    l.slots.forEach((s) => {
      const slot = new THREE.Vector3(s.x, y0 + s.y - 0.5 + (mode === 'name' ? 0.04 : 0), 0);
      const start = mode === 'end'
        ? new THREE.Vector3(Math.sign(s.x || 1) * (vw / 2 - 0.7), r(vh * 0.6), r(0.6))
        : new THREE.Vector3(s.x * 1.25 + r(1.5), slot.y + r(vh * 0.5), r(1));
      pieces.push({ ch: s.ch, cap: 1, slot, start, rot: new THREE.Euler(r(3), r(3), r(3)), half: [s.w / 2 + 0.01, s.h / 2 + 0.01, 0.23], mat: NAME_MATS[k++ % NAME_MATS.length] });
    });
  });
  return { pieces, z, vw, vh };
}

const tmp = new THREE.Vector3(), q = new THREE.Quaternion(), ax = new THREE.Vector3();

function World({ mode, chars, phone, ctrl, low }: { mode: Mode; chars: string[]; phone: boolean; ctrl: Ctrl; low: boolean }) {
  const { size, camera, setFrameloop, invalidate } = useThree();
  const aspect = size.width / Math.max(1, size.height);
  const P = useMemo(() => plan(mode, chars, phone, aspect), [mode, chars.join(''), phone, Math.round(aspect * 20)]); // eslint-disable-line react-hooks/exhaustive-deps
  const vw = 2 * P.z * TAN * aspect, vh = 2 * P.z * TAN;
  const bodies = useRef<(RapierRigidBody | null)[]>([]);
  const ball = useRef<RapierRigidBody>(null);
  const st = useRef({ ball: new THREE.Vector3(0, 0, 8), quiet: 0, t: 0, moving: true }).current;

  useEffect(() => {
    camera.position.set(0, 0, P.z);
    (camera as THREE.PerspectiveCamera).far = P.z + 12;
    camera.updateProjectionMatrix();
  }, [camera, P.z]);

  useEffect(() => {
    ctrl.wake = () => { st.quiet = 0; setFrameloop('always'); invalidate(); };
    ctrl.sleep = () => setFrameloop('never');
    ctrl.scatter = () => {
      for (const b of bodies.current) {
        if (!b) continue;
        const p = b.translation();
        tmp.set(p.x, p.y, 0).normalize().multiplyScalar(mode === 'clump' ? 12 : 13).add(new THREE.Vector3(r(5), r(5) + 3, r(6)));
        b.setLinvel(tmp, true); b.setAngvel({ x: r(16), y: r(16), z: r(12) }, true);
      }
      ctrl.wake();
    };
    ctrl.shove = (ch) => {
      let hit = false;
      P.pieces.forEach((pc, i) => {
        const b = bodies.current[i];
        if (!b || pc.ch !== ch) return;
        hit = true;
        b.setLinvel({ x: r(7), y: 9 + Math.random() * 4, z: 3 + Math.random() * 2 }, true);
        b.setAngvel({ x: r(14) + 9, y: r(10), z: r(10) }, true);
      });
      if (hit) ctrl.wake();
    };
    ctrl.wake();
  }, [ctrl, P, mode, setFrameloop, invalidate, st]);

  // Springs run inside every physics step, so they keep pace with the solver at any frame rate.
  useBeforePhysicsStep(() => {
    const dt = 1 / 60;
    // Every letter is pulled to its slot and turned back square.
    const K = mode === 'clump' ? 5 : 9, KR = mode === 'clump' ? 2.5 : 7;
    let moving = false;
    P.pieces.forEach((pc, i) => {
      const b = bodies.current[i];
      if (!b) return;
      const t = b.translation(), v = b.linvel(), w = b.angvel();
      const ex = pc.slot.x - t.x, ey = pc.slot.y - t.y, ez = pc.slot.z - t.z;
      const rq = b.rotation();
      q.set(-rq.x, -rq.y, -rq.z, rq.w);
      if (q.w < 0) q.set(-q.x, -q.y, -q.z, -q.w);
      const ang = 2 * Math.acos(Math.min(1, q.w));
      const lin = Math.hypot(ex, ey, ez), speed = Math.hypot(v.x, v.y, v.z) + Math.hypot(w.x, w.y, w.z);
      const rest = mode === 'clump' ? b.isSleeping() : lin < 0.004 && ang < 0.006 && speed < 0.03;
      if (rest) return;
      moving = true;
      b.setLinvel({ x: v.x + K * ex * dt, y: v.y + K * ey * dt, z: v.z + K * ez * dt }, mode !== 'clump');
      if (ang > 1e-4) {
        const s = Math.sqrt(Math.max(1e-8, 1 - q.w * q.w));
        ax.set(q.x / s, q.y / s, q.z / s).multiplyScalar(ang * KR * dt);
        b.setAngvel({ x: w.x + ax.x, y: w.y + ax.y, z: w.z + ax.z }, mode !== 'clump');
      }
    });
    st.moving = moving;
  });

  useFrame((_, delta) => {
    const dt = Math.min(1 / 30, delta);
    st.t += dt;
    const now = performance.now();
    // The pointer ball (Lusion's kinematic sphere). It follows the pointer at a capped speed,
    // and lifts out of the word once the pointer rests, so the name can pull itself together.
    const p = ctrl.ptr;
    const live = p.on && now - p.t < 900;
    const tx = live ? (p.x * vw) / 2 : st.ball.x, ty = live ? (p.y * vh) / 2 : st.ball.y, tz = live ? 0 : 8;
    tmp.set(tx - st.ball.x, ty - st.ball.y, tz - st.ball.z);
    const max = 32 * Math.min(0.1, delta); // the ball's speed cap, in units a second
    if (tmp.length() > max) tmp.setLength(max);
    st.ball.add(tmp);
    ball.current?.setNextKinematicTranslation(st.ball);

    const moving = live || st.t < 1 || st.moving;
    // Nothing to draw: stop the loop until the pointer, a key or a click wakes it.
    st.quiet = moving ? 0 : st.quiet + dt;
    if (st.quiet > 0.6) setFrameloop('never');
  });

  const T = 1;
  return (
    <>
      <RigidBody type="kinematicPosition" colliders={false} ref={ball} position={[0, 0, 8]}>
        <BallCollider args={[mode === 'clump' ? 1 : mode === 'end' ? 0.6 : 0.7]} />
      </RigidBody>
      {/* The walls: letters stay inside the frame and never reach the text below it. */}
      {mode !== 'clump' && (
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[T, vh, 3]} position={[-vw / 2 - T, 0, 0]} />
          <CuboidCollider args={[T, vh, 3]} position={[vw / 2 + T, 0, 0]} />
          <CuboidCollider args={[vw, T, 3]} position={[0, vh / 2 + T, 0]} />
          <CuboidCollider args={[vw, T, 3]} position={[0, -vh / 2 + 0.1 - T, 0]} />
          <CuboidCollider args={[vw, vh, T]} position={[0, 0, -1.4 - T]} />
          <CuboidCollider args={[vw, vh, T]} position={[0, 0, 1.4 + T]} />
        </RigidBody>
      )}
      {P.pieces.map((pc, i) => (
        <RigidBody
          key={`${pc.ch}${i}${P.z}`}
          ref={(b) => { bodies.current[i] = b; }}
          position={pc.start.toArray()}
          rotation={pc.rot.toArray().slice(0, 3) as [number, number, number]}
          linearDamping={4}
          angularDamping={mode === 'clump' ? 1 : 3}
          friction={0.1}
          colliders={false}
          canSleep
        >
          <CuboidCollider args={pc.half} />
          <mesh castShadow receiveShadow geometry={geo(pc.ch, pc.cap, low)}>
            <meshStandardMaterial metalness={0.2} {...MATS[pc.mat]} />
          </mesh>
        </RigidBody>
      ))}
    </>
  );
}

export default function Studio({ mode, chars, phone, ctrl }: { mode: Mode; chars: string[]; phone: boolean; ctrl: Ctrl }) {
  const low = phone;
  // Ambient occlusion goes first if the device cannot keep up.
  const [fx, setFx] = useState(true);
  return (
    <Canvas
      frameloop="always"
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, phone ? 1.5 : 1.75]}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 30], fov: FOV, near: 1, far: 60 }}
    >
      <color attach="background" args={['#131419']} />
      <ambientLight intensity={0.4 * Math.PI} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={Math.PI} decay={0} castShadow />
      <Physics gravity={[0, 0, 0]}>
        <World mode={mode} chars={chars} phone={phone} ctrl={ctrl} low={low} />
      </Physics>
      <PerformanceMonitor onDecline={() => setFx(false)} />
      {fx && (
        <EffectComposer multisampling={low ? 0 : 4}>
          <N8AO distanceFalloff={1} aoRadius={0.8} intensity={3} />
        </EffectComposer>
      )}
      <Environment resolution={256}>
        <group rotation={[-Math.PI / 3, 0, 1]}>
          <Lightformer form="circle" intensity={4} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={2} />
          <Lightformer form="circle" intensity={2} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={2} />
          <Lightformer form="circle" intensity={2} rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={2} />
          <Lightformer form="circle" intensity={2} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={8} />
        </group>
        {/* A soft box behind the camera, so the gloss black faces catch a sheen and the name reads. */}
        <Lightformer form="rect" intensity={0.7} position={[0, 3, 12]} rotation-x={Math.PI - 0.25} scale={[14, 4, 1]} />
      </Environment>
    </Canvas>
  );
}
