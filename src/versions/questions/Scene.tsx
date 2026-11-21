// After pmndrs/examples "bestservedbold-christmas-baubles" (MIT): a rapier cloud pulled toward a centre, a kinematic pointer ball that shoves it, N8AO and ACES studio light from the same HDR. Baubles swapped for Anton question marks.
import * as THREE from 'three';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { BallCollider, ConvexHullCollider, CuboidCollider, Physics, RigidBody, interactionGroups, type RapierRigidBody } from '@react-three/rapier';
import { markSolid } from './geo';

const HDR = import.meta.env.BASE_URL + 'questions/studio.hdr';
export type Rect = { x: number; y: number; w: number; h: number };
export type Band = {
  /** Text blocks the marks must stay off, in px relative to the canvas. */
  walls: Rect[];
  /** Where the cloud gathers, in px relative to the canvas. */
  centre: { x: number; y: number };
  /** 0..1: how many marks have dropped out (the hero thins as it scrolls away). */
  thin: number;
  /** Bumped to pour the marks in from the top (the ending). */
  pour: number;
  /** Pointer in px relative to the canvas, or null when it is elsewhere. */
  pointer: { x: number; y: number } | null;
  visible: boolean;
  /** Wakes the loop when something changes; set by the scene. */
  wake: () => void;
};
export const makeBand = (): Band => ({ walls: [], centre: { x: 0, y: 0 }, thin: 0, pour: 0, pointer: null, visible: false, wake: () => {} });

const SOLID = markSolid(0.4, 0.035);
const satin = new THREE.MeshPhysicalMaterial({ color: '#c8321e', roughness: 0.34, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.18, envMapIntensity: 0.55 });
const MARKS = 0, WALLS = 1, SLAB = 2;
const live = interactionGroups(MARKS, [MARKS, WALLS, SLAB]);
const loose = interactionGroups(MARKS, [MARKS]);

/** px on the canvas to world units on the z = 0 plane. */
function useMap() {
  const { size, viewport, camera } = useThree();
  const vp = viewport.getCurrentViewport(camera, [0, 0, 0]);
  return useMemo(() => ({
    vw: vp.width, vh: vp.height, k: vp.width / size.width,
    x: (px: number) => (px / size.width - 0.5) * vp.width,
    y: (py: number) => (0.5 - py / size.height) * vp.height,
  }), [vp.width, vp.height, size.width, size.height]);
}

function Cloud({ band, count, scales, pourMode }: { band: Band; count: number; scales: number[]; pourMode: boolean }) {
  const map = useMap();
  const bodies = useRef<(RapierRigidBody | null)[]>([]);
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const setLoop = useThree((s) => s.setFrameloop);
  const get = useThree((s) => s.get);
  const setFrameloop = (m: 'always' | 'demand' | 'never') => { if (get().frameloop !== m) setLoop(m); };
  const invalidate = useThree((s) => s.invalidate);
  const tmp = useMemo(() => ({ z: new THREE.Vector3(), v: new THREE.Vector3(), m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3(), p: new THREE.Vector3() }), []);
  const order = useMemo(() => [...Array(count).keys()].sort(() => Math.random() - 0.5), [count]);
  const loosed = useRef<boolean[]>([]);
  const quiet = useRef(0);
  const poured = useRef(0);
  const marks = useMemo(() => [...Array(count)].map((_, i) => {
    const s = scales[i % scales.length];
    const r = THREE.MathUtils.randFloatSpread;
    const pos: [number, number, number] = pourMode ? [r(map.vw * 0.9), map.vh * 0.5 + 4 + Math.random() * 30, r(0.6)] : [r(map.vw), -map.vh * 0.5 - 3 - Math.random() * 14, r(0.6)];
    const hull = SOLID.hull.map((v) => v * s);
    return { s, pos, hull, rot: [r(0.5), r(0.5), r(1.6)] as [number, number, number] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [count]);

  useEffect(() => {
    band.wake = () => { if (band.visible) { quiet.current = 0; setFrameloop('always'); invalidate(); } };
    return () => { band.wake = () => {}; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [band, invalidate]);

  useFrame((_, dt) => {
    if (!band.visible) { setFrameloop('never'); return; }
    dt = Math.min(0.05, dt);
    const cx = map.x(band.centre.x), cy = map.y(band.centre.y);
    const asleep = pourMode && band.pour === 0;
    if (pourMode && band.pour !== poured.current) {
      poured.current = band.pour;
      bodies.current.forEach((b, i) => {
        if (!b) return;
        b.setTranslation({ x: THREE.MathUtils.randFloatSpread(map.vw * 0.9), y: map.vh * 0.5 + 2 + i * 0.9 + Math.random() * 2, z: THREE.MathUtils.randFloatSpread(0.6) }, true);
        b.setLinvel({ x: 0, y: -6 - Math.random() * 4, z: 0 }, true);
      });
    }
    const drop = Math.round(band.thin * count * 0.85);
    let energy = 0;
    for (let i = 0; i < count; i++) {
      const b = bodies.current[i];
      if (!b) continue;
      const t = b.translation(), mass = b.mass();
      const isLoose = order.indexOf(i) < drop;
      if (isLoose !== !!loosed.current[i]) {
        loosed.current[i] = isLoose;
        for (let c = 0; c < b.numColliders(); c++) b.collider(c).setCollisionGroups(isLoose ? loose : live);
        b.wakeUp();
      }
      if (asleep) { mesh.current.setMatrixAt(i, tmp.m.makeScale(0, 0, 0)); continue; }
      if (isLoose) {
        if (t.y > -map.vh * 0.5 - 6) b.applyImpulse({ x: 0, y: -26 * mass * dt, z: 0 }, true);
        else b.sleep();
      } else {
        // The example's pull: toward the centre, three times harder vertically.
        tmp.v.set(t.x - cx, t.y - cy, t.z).normalize();
        b.applyImpulse({ x: -12 * tmp.v.x * mass * dt, y: -30 * tmp.v.y * mass * dt, z: -12 * tmp.v.z * mass * dt }, true);
        // Turn back toward the camera, slowly, so each one reads as a question mark.
        const r = b.rotation();
        tmp.q.set(r.x, r.y, r.z, r.w); tmp.z.set(0, 0, 1).applyQuaternion(tmp.q);
        // One turned away shows a mirrored mark: give it a slow half turn about its upright.
        const away = tmp.z.z < 0 ? -tmp.z.z * 2.5 : 0;
        b.applyTorqueImpulse({ x: tmp.z.y * 3 * mass * dt, y: (-tmp.z.x * 3 + away) * mass * dt, z: 0 }, true);
        const lv = b.linvel();
        energy += lv.x * lv.x + lv.y * lv.y + lv.z * lv.z;
      }
      const q = b.rotation();
      tmp.p.set(t.x, t.y, t.z); tmp.q.set(q.x, q.y, q.z, q.w); tmp.s.setScalar(marks[i].s);
      mesh.current.setMatrixAt(i, tmp.m.compose(tmp.p, tmp.q, tmp.s));
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    // Stop the loop once the cloud has settled and nobody is pushing it.
    if (!band.pointer && (energy / count < 0.004 || asleep)) quiet.current++; else quiet.current = 0;
    if (quiet.current > 90) setFrameloop('demand');
  });

  return (
    <>
      {marks.map((m, i) => (
        <RigidBody key={i} ref={(r) => { bodies.current[i] = r; }} colliders={false} position={m.pos} rotation={m.rot} linearDamping={0.75} angularDamping={1.1} friction={0.2} canSleep={false}>
          <ConvexHullCollider args={[m.hull]} collisionGroups={live} density={1} />
        </RigidBody>
      ))}
      <instancedMesh ref={mesh} args={[SOLID.geo, satin, count]} castShadow receiveShadow frustumCulled={false} />
    </>
  );
}

function Pointer({ band, r }: { band: Band; r: number }) {
  const ref = useRef<RapierRigidBody>(null);
  const map = useMap();
  const v = useMemo(() => new THREE.Vector3(100, 100, 0), []);
  useFrame(() => {
    const p = band.pointer;
    if (p) v.lerp({ x: map.x(p.x), y: map.y(p.y), z: 0 }, 0.2); else v.set(100, 100, 0);
    ref.current?.setNextKinematicTranslation(v);
  });
  return (
    <RigidBody ref={ref} position={[100, 100, 0]} type="kinematicPosition" colliders={false}>
      <BallCollider args={[r]} collisionGroups={interactionGroups(WALLS, [MARKS])} />
    </RigidBody>
  );
}

/** Invisible boxes over every text block in the band, and two panes that keep the cloud in a shallow slab. */
function Walls({ band }: { band: Band }) {
  const map = useMap();
  const m = 0.45;
  return (
    <RigidBody type="fixed" colliders={false}>
      {band.walls.map((w, i) => (
        <CuboidCollider key={i} collisionGroups={interactionGroups(WALLS, [MARKS])} position={[map.x(w.x + w.w / 2), map.y(w.y + w.h / 2), 0]} args={[(w.w * map.k) / 2 + m, (w.h * map.k) / 2 + m, 6]} />
      ))}
      <CuboidCollider collisionGroups={interactionGroups(SLAB, [MARKS])} position={[0, 0, -1.4]} args={[200, 200, 0.5]} />
      <CuboidCollider collisionGroups={interactionGroups(SLAB, [MARKS])} position={[0, 0, 1.4]} args={[200, 200, 0.5]} />
    </RigidBody>
  );
}

function Studio({ ao }: { ao: boolean }) {
  return (
    <>
      <ambientLight intensity={0.45} />
      <spotLight position={[20, 20, 25]} intensity={Math.PI * 1.5} decay={0} penumbra={1} angle={0.2} castShadow shadow-mapSize={[512, 512]} />
      <directionalLight position={[0, 5, -4]} intensity={1.8 * Math.PI} />
      <directionalLight position={[0, -15, 0]} intensity={0.6 * Math.PI} color="#ffd8cc" />
      <Suspense fallback={null}><Environment files={HDR} /></Suspense>
      <EffectComposer enableNormalPass={false} multisampling={0}>
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        {ao ? <N8AO color="#5a1208" aoRadius={2} distanceFalloff={2.5} intensity={1} halfRes quality="performance" /> : <></>}
      </EffectComposer>
    </>
  );
}

/** A canvas band of marks: the hero cloud, or the ending's pour. */
export default function Marks({ band, count, phone, pour = false, lite = false }: { band: Band; count: number; phone: boolean; pour?: boolean; lite?: boolean }) {
  return (
    <Canvas
      className="q-canvas"
      frameloop="always"
      shadows={phone || lite ? false : { type: THREE.PCFShadowMap }}
      dpr={lite ? 1 : [1, phone ? 1.4 : 1.6]}
      gl={{ alpha: true, stencil: false, antialias: false, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 20], fov: 32.5, near: 1, far: 100 }}
      onCreated={(s) => { s.gl.toneMappingExposure = 0.95; s.gl.setClearColor(0x000000, 0); }}
      aria-hidden="true"
    >
      <Studio ao={!phone && !lite} />
      <Suspense fallback={null}>
        <Physics gravity={[0, 0, 0]} timeStep={1 / 60}>
          <Pointer band={band} r={phone ? 1.3 : 2} />
          <Walls band={band} />
          <Cloud band={band} count={count} pourMode={pour} scales={phone ? [1.1, 1.4, 1.4, 1.75] : [1.9, 2.4, 2.4, 3.0]} />
        </Physics>
      </Suspense>
    </Canvas>
  );
}

/**
 * The paper's last mark: it hangs over the empty slot at the end of the question,
 * drops in, bounces, rocks on its dot and settles. No physics engine: a fall and a damped rock.
 */
export function LastMark({ slot, fire }: { slot: { x: number; base: number; fs: number } | null; fire: number }) {
  return (
    <Canvas className="q-canvas" frameloop="demand" dpr={[1, 1.6]} gl={{ alpha: true, stencil: false, antialias: true }} camera={{ position: [0, 0, 60], fov: 11, near: 1, far: 200 }} onCreated={(s) => { s.gl.toneMappingExposure = 1.05; s.gl.setClearColor(0x000000, 0); s.gl.toneMapping = THREE.ACESFilmicToneMapping; }} aria-hidden="true">
      <ambientLight intensity={0.5} />
      <spotLight position={[20, 20, 25]} intensity={Math.PI * 1.5} decay={0} penumbra={1} angle={0.25} />
      <directionalLight position={[0, 5, -4]} intensity={1.8 * Math.PI} />
      <directionalLight position={[0, -15, 0]} intensity={0.6 * Math.PI} color="#ffd8cc" />
      <Suspense fallback={null}><Environment files={HDR} /></Suspense>
      {slot ? <Faller slot={slot} fire={fire} /> : null}
    </Canvas>
  );
}

function Faller({ slot, fire }: { slot: { x: number; base: number; fs: number }; fire: number }) {
  const map = useMap();
  const ref = useRef<THREE.Mesh>(null!);
  const invalidate = useThree((s) => s.invalidate);
  const st = useRef({ y: 0, v: 0, th: 0, w: 0, phase: 'hang' as 'hang' | 'fall' | 'rock' | 'still', fired: 0, t: 0 });
  const h = slot.fs * (867.19 / 1000) * map.k;         // the glyph's height in world units
  const restY = map.y(slot.base) + h / 2;
  const x = map.x(slot.x + slot.fs * 0.25);
  const top = map.vh / 2 + h;                           // just above the band
  useEffect(() => { if (fire !== st.current.fired) { st.current = { y: top, v: 0, th: 0.5, w: -0.6, phase: 'fall', fired: fire, t: 0 }; invalidate(); } }, [fire, top, invalidate]);
  useFrame((_, dt) => {
    dt = Math.min(0.033, dt);
    const s = st.current;
    if (s.phase === 'hang') { s.y = top + h; }
    if (s.phase === 'fall') {
      s.v -= 70 * h * dt; s.y += s.v * dt;
      s.th += s.w * dt; s.th *= 0.985;
      if (s.y <= restY) {
        s.y = restY;
        if (Math.abs(s.v) > h * 2.2) { s.w = s.v * 0.05 / h - s.th * 4; s.v = -s.v * 0.22; }
        else { s.v = 0; s.phase = 'rock'; s.w += 1.1; }
      }
    }
    if (s.phase === 'rock') {
      // A damped rock about the bottom of the dot.
      s.y = restY;
      const a = -38 * s.th - 3.4 * s.w;
      s.w += a * dt; s.th += s.w * dt;
      if (Math.abs(s.th) < 0.0015 && Math.abs(s.w) < 0.01) { s.th = 0; s.w = 0; s.phase = 'still'; }
    }
    const piv = SOLID.pivot, sc = h;
    const px = x + piv.x * sc, py = s.y + piv.y * sc;
    const ox = -piv.x * sc, oy = -piv.y * sc;
    const c = Math.cos(s.th), sn = Math.sin(s.th);
    ref.current.position.set(px + ox * c - oy * sn, py + ox * sn + oy * c, 0);
    ref.current.rotation.set(0, 0, s.th);
    ref.current.scale.setScalar(sc);
    ref.current.visible = s.phase !== 'hang';
    if (s.phase !== 'still' && s.phase !== 'hang') invalidate();
  });
  return <mesh ref={ref} geometry={SOLID.geo} material={satin} />;
}
