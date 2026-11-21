// Remixed from pmndrs/examples "raycast-cycling" (MIT): the spiral of thin sheets climbing like stairs, its lights and shadowed floor, per-sheet hover and click, CycleRaycast.
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { CycleRaycast } from '@react-three/drei';
import { gsap } from '@/lib/scroll';
import { PAGES, printPage } from './paper';
import { COUNT, S, pageOf, type Cam } from './store';

const SW = 2.4, SH = 3.4, ST = 0.022; // a sheet: A-series proportions, paper thin
const STEP = 0.42, FLOOR = -0.6;
const GREEN = new THREE.Color('#1d6b52');
const UP = new THREE.Vector3(0, 1, 0);

// The example's spiral, kept: x = 2 - sin(i/5) * 5, z = 2 - cos(i/5) * 5, one step up per sheet.
const stairPos = (i: number) => new THREE.Vector3(2 - Math.sin(i / 5) * 5, i * STEP, 2 - Math.cos(i / 5) * 5);
const flatQuat = (yaw: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, yaw));
const stairYaw = (i: number) => -1.1 + (i - (COUNT - 1)) * 0.11;
const STAIR = Array.from({ length: COUNT }, (_, i) => ({ p: stairPos(i), q: flatQuat(stairYaw(i)), out: new THREE.Vector3(-Math.sin(i / 5), 0, -Math.cos(i / 5)) }));
const jitter = (i: number) => Math.sin(i * 12.9898) * 0.5;
const STACK = Array.from({ length: COUNT }, (_, i) => ({ p: new THREE.Vector3(0.9 + jitter(i) * 0.05, FLOOR + ST / 2 + 0.002 + i * (ST + 0.004), 1.4 + jitter(i + 7) * 0.05), q: flatQuat(-0.75 + jitter(i + 3) * 0.07) }));

const dir = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).normalize();
const MID = new THREE.Vector3(-0.6, 2.7, 1.9);
const PRESET: Record<Cam, { t: THREE.Vector3; d: THREE.Vector3; r: number }> = {
  hero: { t: MID, d: dir(-10, 10, 5), r: 33 },
  about: { t: STAIR[3].p.clone().add(new THREE.Vector3(0, 0.6, 0)), d: dir(-10, 8, 7), r: 13 },
  today: { t: STAIR[6].p.clone().add(new THREE.Vector3(0, 0.6, 0)), d: dir(-11, 9, 2), r: 13 },
  now: { t: STAIR[10].p.clone().add(new THREE.Vector3(0, 0.6, 0)), d: dir(-8, 11, 8), r: 12 },
  research: { t: STAIR[14].p.clone().add(new THREE.Vector3(-0.6, 1.6, -0.6)), d: dir(-7, 3.2, 8), r: 21 },
  github: { t: STAIR[10].p.clone(), d: dir(5, 12, 7), r: 21 },
  record: { t: MID.clone().add(new THREE.Vector3(0, -1, 0)), d: dir(-2, 16, 5), r: 24 },
  contact: { t: STACK[0].p.clone().add(new THREE.Vector3(0, 0.3, 0)), d: dir(-8, 12, 7), r: 13 },
};

// The research set piece: the three ladders stand in a row at the top of the stair, the epigraph faces you.
const RESEARCH = (() => {
  const pr = PRESET.research;
  const o = new THREE.PerspectiveCamera(); // a camera looks down -z, so a sheet with its turn faces it
  o.position.copy(pr.t).addScaledVector(pr.d, pr.r);
  o.lookAt(pr.t);
  const q = o.quaternion.clone();
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q), up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
  const m = new Map<number, { p: THREE.Vector3; q: THREE.Quaternion }>();
  [10, 9, 8].forEach((i, k) => {
    const p = pr.t.clone().addScaledVector(right, (k - 1) * 2.7).addScaledVector(up, 1.35).addScaledVector(pr.d, -1.5);
    m.set(i, { p, q: q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(UP, (k - 1) * -0.22)) });
  });
  const ep = pr.t.clone().addScaledVector(up, -1.75).addScaledVector(pr.d, 3.2);
  m.set(11, { p: ep, q: q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.12)) });
  return m;
})();

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

type Body = { p: THREE.Vector3; v: THREE.Vector3; q: THREE.Quaternion };

function Sheets() {
  const { camera, gl, invalidate } = useThree();
  const [tex, setTex] = useState<THREE.CanvasTexture[] | null>(null);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const rims = useRef<(THREE.Mesh | null)[]>([]);
  const bodies = useMemo<Body[]>(() => STAIR.map((s, i) => ({ p: STACK[i].p.clone(), v: new THREE.Vector3(), q: STACK[i].q.clone() })), []);
  const side = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ecebe6', roughness: 1 }), []);
  const research = useRef(0);
  const calm = useRef(0);
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), q: new THREE.Quaternion(), f: new THREE.Vector3(), r: new THREE.Vector3(), a: new THREE.Vector3() }), []);

  // Print the pages once the two faces have loaded, so the canvas uses them.
  useEffect(() => {
    let live = true;
    Promise.all([
      document.fonts.load('italic 600 40px "Playfair Display Variable"'),
      document.fonts.load('400 40px "Playfair Display Variable"'),
      document.fonts.load('500 40px "Instrument Sans Variable"'),
    ]).catch(() => null).then(() => {
      if (!live) return;
      const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
      setTex(Array.from({ length: COUNT }, (_, i) => {
        const t = new THREE.CanvasTexture(printPage(PAGES[pageOf(i) - 1]));
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = aniso;
        return t;
      }));
      invalidate();
    });
    return () => { live = false; };
  }, [gl, invalidate]);

  const mats = useMemo(() => Array.from({ length: COUNT }, (_, i) => {
    const top = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, map: tex?.[i] ?? null });
    return [side, side, side, side, top, side];
  }), [tex, side]);

  useFrame((state, dt) => {
    dt = Math.min(dt, 1 / 30);
    const still = S.still;
    research.current = still ? (S.cam === 'research' ? 1 : 0) : THREE.MathUtils.damp(research.current, S.cam === 'research' ? 1 : 0, 3, dt);
    const rs = smooth(research.current);
    const F = Math.max(S.fold, S.intro) * (COUNT + 5);
    const cam = state.camera;
    cam.getWorldDirection(tmp.f);
    tmp.r.set(1, 0, 0).applyQuaternion(cam.quaternion);
    let motion = 0;
    for (let i = 0; i < COUNT; i++) {
      const b = bodies[i], st = STAIR[i];
      const k = smooth(clamp((F - i) / 5));
      const lifted = S.hover === i || S.focus === i;
      // the stair, or the sheet slid out toward you
      tmp.p.copy(st.p);
      tmp.q.copy(st.q);
      if (lifted && S.open !== i) tmp.p.addScaledVector(st.out, 0.75).add(tmp.a.set(0, 0.28, 0));
      const rp = RESEARCH.get(i);
      if (rp && rs > 0) { tmp.p.lerp(rp.p, rs); tmp.q.slerp(rp.q, rs); }
      if (k > 0) {
        tmp.p.lerp(STACK[i].p, k).add(tmp.a.set(0, Math.sin(k * Math.PI) * 0.9, 0));
        tmp.q.slerp(STACK[i].q, k);
      }
      if (S.open === i) {
        const d = S.phone ? 12.5 : 11;
        tmp.p.copy(cam.position).addScaledVector(tmp.f, d).addScaledVector(tmp.r, S.phone ? 0 : -0.85);
        tmp.q.copy(cam.quaternion);
      }
      if (still) { b.p.copy(tmp.p); b.q.copy(tmp.q); b.v.set(0, 0, 0); }
      else {
        // a spring with a little overshoot, so a page has weight
        tmp.a.subVectors(tmp.p, b.p).multiplyScalar(95 * dt);
        b.v.add(tmp.a).multiplyScalar(Math.exp(-13 * dt));
        b.p.addScaledVector(b.v, dt);
        b.q.slerp(tmp.q, 1 - Math.exp(-9 * dt));
        motion += b.v.lengthSq() + (1 - Math.abs(b.q.dot(tmp.q)));
      }
      const m = meshes.current[i];
      if (m) { m.position.copy(b.p); m.quaternion.copy(b.q); }
      const rim = rims.current[i];
      if (rim) rim.visible = lifted || S.open === i;
    }
    // Live shadows while pages move; bake them once everything has settled.
    if (motion < 1e-5) calm.current++; else calm.current = 0;
    const sm = gl.shadowMap;
    if (calm.current > 20) { if (sm.autoUpdate) { sm.autoUpdate = false; sm.needsUpdate = true; } }
    else sm.autoUpdate = true;
    void camera;
  });

  // For the test driver: where a sheet sits on screen.
  useEffect(() => {
    (window as unknown as { __pgAt: (i: number) => number[] }).__pgAt = (i) => {
      const m = meshes.current[i]; if (!m) return [0, 0];
      const v = m.getWorldPosition(new THREE.Vector3()).project(camera);
      return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight];
    };
  }, [camera]);

  const over = (i: number) => (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); S.hover = i; S.point?.(i); gl.domElement.style.cursor = 'pointer'; };
  const out = (i: number) => () => { if (S.hover === i) { S.hover = -1; S.point?.(-1); } gl.domElement.style.cursor = ''; };
  const click = (i: number) => (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); S.pick?.(S.open === i ? -1 : i); };

  return (
    <>
      {STAIR.map((_, i) => (
        <mesh key={i} name={'page-' + pageOf(i)} ref={(m) => { meshes.current[i] = m; }} material={mats[i]} castShadow receiveShadow
          onPointerOver={over(i)} onPointerOut={out(i)} onClick={click(i)}>
          <boxGeometry args={[SW, SH, ST]} />
          <mesh ref={(m) => { rims.current[i] = m; }} position={[0, 0, -ST / 2 - 0.004]} visible={false}>
            <planeGeometry args={[SW + 0.09, SH + 0.09]} />
            <meshBasicMaterial color={GREEN} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        </mesh>
      ))}
    </>
  );
}

/** The camera climbs one step per section, with weight; the view offset keeps the stair beside the copy. */
function Rig() {
  const pos = useRef(new THREE.Vector3().copy(PRESET.hero.t).addScaledVector(PRESET.hero.d, PRESET.hero.r));
  const tgt = useRef(PRESET.hero.t.clone());
  const goal = useMemo(() => ({ p: new THREE.Vector3(), t: new THREE.Vector3() }), []);
  useFrame((state, dt) => {
    dt = Math.min(dt, 1 / 30);
    const pr = PRESET[S.cam];
    goal.t.copy(pr.t);
    goal.p.copy(pr.t).addScaledVector(pr.d, pr.r * S.fit);
    if (S.still) { pos.current.copy(goal.p); tgt.current.copy(goal.t); }
    else {
      const l = 1 - Math.exp(-2.4 * dt);
      pos.current.lerp(goal.p, l);
      tgt.current.lerp(goal.t, l);
    }
    const cam = state.camera as THREE.PerspectiveCamera;
    cam.position.copy(pos.current);
    cam.lookAt(tgt.current);
    const { width: w, height: h } = state.size;
    cam.setViewOffset(w, h, w / 2 - S.cx, h / 2 - S.cy, w, h);
  });
  return null;
}

/** Render only while some part of the stair is on screen. */
function Pump() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const t = () => { if (S.visible) invalidate(); };
    gsap.ticker.add(t);
    return () => gsap.ticker.remove(t);
  }, [invalidate]);
  return null;
}

function Studio() {
  return (
    <>
      {/* Fill */}
      <ambientLight intensity={0.55 * Math.PI} />
      {/* Main */}
      <directionalLight position={[1, 12, -2]} intensity={Math.PI} castShadow
        shadow-mapSize={[1024, 1024]} shadow-camera-far={60} shadow-camera-left={-11} shadow-camera-right={11}
        shadow-camera-top={11} shadow-camera-bottom={-11} shadow-radius={5} shadow-bias={-0.0004} />
      {/* Front fill, so a page turned to face you reads */}
      <directionalLight position={[-8, 6, 12]} intensity={0.55 * Math.PI} />
      {/* Strip */}
      <directionalLight position={[-10, -10, 2]} intensity={2.2 * Math.PI} />
      {/* Ground */}
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, FLOOR, 0]}>
        <planeGeometry args={[80, 80]} />
        <shadowMaterial opacity={0.16} />
      </mesh>
    </>
  );
}

export default function Stage() {
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, 1.6]}
      frameloop="demand"
      flat
      gl={{ antialias: true, alpha: true }}
      camera={{ fov: 30, near: 0.5, far: 150, position: [-10, 10, 5] }}
      onPointerMissed={() => { if (S.open >= 0) S.pick?.(-1); }}
      style={{ touchAction: 'pan-y' }}
    >
      <Studio />
      <Sheets />
      <Rig />
      <Pump />
      {/* Cycles through overlapping sheets under the pointer (Tab), as in the example; never takes the wheel. */}
      <CycleRaycast scroll={false} preventDefault={false} onChanged={() => null} />
    </Canvas>
  );
}
