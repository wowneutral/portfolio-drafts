// Built on pmndrs/examples "rapier-physics" (MIT): the same Rapier world set-up (Physics inside
// Suspense, RigidBody with cuboid colliders, impulses on click, bodies left to sleep), with the sky,
// clouds and cup gone. Here the bodies are his honours, extruded from Anton, stacked into a tower
// on a paper sweep lit like a product photograph; the sweep profile comes from the letters draft.
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { CuboidCollider, Physics, RigidBody, useRapier, type RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { HONORS } from '@/content';
import { scroll } from '@/lib/scroll';
import { clamp, damp, lerp, smooth } from '@/lib/utils';
import { bar, word, paint, DEPTH, GAP, HALF, LEAD } from './geo';
import { stage } from './stage';

const PAPER = '#dddcd7';
const N = HONORS.length;
export const STOPS = ['hero', 'about', 'debate', 'research', 'w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'today', 'github', 'now', 'record', 'off', 'contact'] as const;

/* ───────── the plan: where each bar stands, and the camera's stops ───────── */

const rnd = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
type Home = { p: THREE.Vector3; q: THREE.Quaternion };

// Honour 0 is the top of the tower; honour 9 (the Wessobrunn translation) is its base.
const LEVEL = (h: number) => N - 1 - h;
const HOMES: Home[] = HONORS.map((_, h) => {
  const L = LEVEL(h);
  const y = HALF + L * (2 * HALF + GAP);
  return {
    p: new THREE.Vector3((rnd(h) - 0.5) * 0.36, y, (rnd(h + 9) - 0.5) * 0.3),
    q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (rnd(h + 3) - 0.5) * 0.07, 0)),
  };
});
const TOP = HOMES[0].p.y + HALF;
const CX = 15; // the commit tower

type Shot = { t: [number, number, number]; az: number; el: number; d: number };
const S = (t: [number, number, number], az: number, el: number, d: number): Shot => ({ t, az, el, d });
const SHOTS: Record<(typeof STOPS)[number], Shot> = {
  hero: S([0, TOP * 0.5, 0], -12, 7, 74),
  about: S([0, TOP * 0.56, 0], 26, 12, 74),
  // Close and low on the two red bars, looking up.
  debate: S([0, TOP - 2.6, 0], -16, -13, 44),
  // Down at the base, on the Wessobrunn bar.
  research: S([0, 2.4, 0], 20, 3, 40),
  // The work walks round the tower and down it.
  w0: S([0, TOP * 0.8, 0], -58, 10, 68),
  w1: S([0, TOP * 0.72, 0], -40, 8, 66),
  w2: S([0, TOP * 0.64, 0], -22, 6, 64),
  w3: S([0, TOP * 0.56, 0], -6, 5, 64),
  w4: S([0, TOP * 0.48, 0], 10, 5, 64),
  w5: S([0, TOP * 0.4, 0], 26, 6, 64),
  w6: S([0, TOP * 0.32, 0], 42, 8, 66),
  w7: S([0, TOP * 0.24, 0], 58, 10, 68),
  today: S([0, TOP * 0.5, 0], 38, 16, 92),
  github: S([CX * 0.62, TOP * 0.36, 0], -10, 7, 80),
  now: S([0, TOP * 0.6, 0], -34, 20, 78),
  record: S([0, TOP * 0.5, 0], 0, 4, 76),
  off: S([CX * 0.3, TOP * 0.45, 0], 22, 26, 86),
  // The close: high above both towers, looking down.
  contact: S([CX * 0.4, TOP * 0.28, 0], -6, 56, 92),
};
const SHOT_LIST = STOPS.map((s) => SHOTS[s]);
const DEG = Math.PI / 180;

function place(sh: Shot, out: { pos: THREE.Vector3; look: THREE.Vector3 }, far: number) {
  const d = sh.d * far, az = sh.az * DEG, el = sh.el * DEG;
  out.look.set(...sh.t);
  out.pos.set(sh.t[0] + Math.sin(az) * Math.cos(el) * d, sh.t[1] + Math.sin(el) * d, sh.t[2] + Math.cos(az) * Math.cos(el) * d);
}

/* ───────── the sweep ───────── */

function Sweep() {
  const geometry = useMemo(() => {
    // Floor, a quarter circle, wall: a profile in z,y swept along x (from the letters draft).
    const zf = -10, R = 16, prof: [number, number][] = [[300, 0], [zf, 0]];
    for (let i = 1; i <= 24; i++) { const a = (i / 24) * Math.PI / 2; prof.push([zf - R * Math.sin(a), R - R * Math.cos(a)]); }
    prof.push([zf - R, 300]);
    const pos: number[] = [], idx: number[] = [];
    prof.forEach(([z, y]) => { for (const x of [-500, 500]) pos.push(x, y, z); });
    for (let i = 0; i < prof.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color="#d3d2cc" roughness={1} envMapIntensity={0.25} />
    </mesh>
  );
}

/* ───────── the honours tower ───────── */

type Mode = 'home' | 'loose' | 'back';
type Bar = { mode: Mode; s: number; v: number; phase: 0 | 1; delay: number; from: Home; wp: THREE.Vector3; to: Home };

const DYNAMIC = 0, KINEMATIC = 2;
const tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3();

function Tower({ mats }: { mats: { ink: THREE.Material; red: THREE.Material } }) {
  const geos = useMemo(() => HONORS.map((_, i) => { const b = bar(i); paint(b.geometry, i < 2 ? '#b3241a' : '#111111', i < 2 ? '#6e140e' : '#3a3935'); return b; }), []);
  useEffect(() => () => geos.forEach((g) => g.geometry.dispose()), [geos]);
  const bodies = useRef<(RapierRigidBody | null)[]>([]);
  const state = useRef<Bar[]>(HONORS.map((_, h) => ({ mode: 'home', s: 0, v: 0, phase: 0, delay: 0, from: { p: HOMES[h].p.clone(), q: HOMES[h].q.clone() }, wp: new THREE.Vector3(), to: HOMES[h] })));
  const run = useRef({ backAt: 0, t: performance.now() / 1000, busy: false, hit: -1 });
  const { gl } = useThree();

  const knock = (h: number) => {
    const r = run.current;
    if (r.busy) return;
    r.busy = true; r.hit = h; r.backAt = r.t + (h === N - 1 ? 2.4 : 1.5);
    for (let j = 0; j <= h; j++) {
      const b = bodies.current[j]; if (!b) continue;
      b.setBodyType(DYNAMIC, true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true); b.setAngvel({ x: 0, y: 0, z: 0 }, true);
      state.current[j].mode = 'loose';
    }
    const b = bodies.current[h];
    if (b) {
      // Out to the left, a little toward the lens, with a turn: the shove has weight.
      const base = h === N - 1;
      b.setLinvel({ x: base ? -13 : -16, y: 2.5, z: base ? 6 : 4 }, true);
      b.setAngvel({ x: 0.4, y: (rnd(r.t) - 0.5) * 4, z: 1.1 }, true);
    }
    stage.invalidate?.();
  };

  useFrame((_, dtRaw) => {
    const r = run.current;
    r.t = performance.now() / 1000;
    while (stage.cmds.length) knock(stage.cmds.shift()!);
    if (!r.busy) return;
    stage.invalidate?.();
    const S = state.current;
    if (r.t >= r.backAt && S.some((x) => x.mode === 'loose')) {
      // Everything that moved goes kinematic and flies home on a spring.
      // The bars above go first, the knocked one slides back in last; after a collapse, bottom up.
      const moved = S.map((x, j) => (x.mode === 'loose' ? j : -1)).filter((j) => j >= 0);
      const order = r.hit === N - 1 ? [...moved].sort((a, b) => b - a) : [...moved.filter((j) => j !== r.hit).sort((a, b) => b - a), r.hit];
      order.forEach((j, k) => {
        const b = bodies.current[j]; if (!b) return;
        const x = S[j], t = b.translation(), q = b.rotation();
        b.setBodyType(KINEMATIC, true);
        x.mode = 'back'; x.s = 0; x.v = 0; x.phase = 0; x.delay = r.t + k * (r.hit === N - 1 ? 0.2 : 0.14);
        x.from = { p: new THREE.Vector3(t.x, t.y, t.z), q: new THREE.Quaternion(q.x, q.y, q.z, q.w) };
        const slide = j === r.hit && r.hit !== N - 1;
        x.wp.set(t.x, HOMES[j].p.y + (slide ? 0 : 0.6), slide ? HOMES[j].p.z : t.z);
      });
    }
    let all = true;
    for (let j = 0; j < N; j++) {
      const x = S[j], b = bodies.current[j];
      if (x.mode === 'loose') { all = false; continue; }
      if (x.mode !== 'back' || !b) continue;
      all = false;
      if (r.t < x.delay) continue;
      // A damped spring on the path parameter: the first leg is critically damped, the last one overshoots and settles.
      // Integrated in small fixed steps, so it keeps real time even when frames are slow.
      const k = x.phase === 0 ? 70 : 110, c = x.phase === 0 ? 2 * Math.sqrt(70) : 13;
      for (let left = Math.min(dtRaw, 0.25); left > 1e-6; left -= 1 / 120) {
        const h = Math.min(1 / 120, left);
        x.v += (k * (1 - x.s) - c * x.v) * h; x.s += x.v * h;
      }
      const a = x.phase === 0 ? x.from.p : x.wp, z = x.phase === 0 ? x.wp : HOMES[j].p;
      tmpV.lerpVectors(a, z, x.s);
      if (x.phase === 0) tmpQ.slerpQuaternions(x.from.q, HOMES[j].q, clamp(x.s)); else tmpQ.copy(HOMES[j].q);
      b.setNextKinematicTranslation(tmpV); b.setNextKinematicRotation(tmpQ);
      if (x.phase === 0 && x.s > 0.985) { x.phase = 1; x.s = 0; x.v = 0; }
      else if (x.phase === 1 && Math.abs(1 - x.s) < 0.002 && Math.abs(x.v) < 0.02) {
        b.setNextKinematicTranslation(HOMES[j].p); b.setNextKinematicRotation(HOMES[j].q);
        x.mode = 'home';
      }
    }
    if (all) r.busy = false;
  });

  const onClick = (h: number) => (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (e.delta > 10) return; knock(h); };
  const over = (on: boolean) => () => { gl.domElement.style.cursor = on ? 'pointer' : ''; };

  return (
    <>
      {HONORS.map((_, h) => (
        <RigidBody key={h} ref={(b) => { bodies.current[h] = b; }} type="kinematicPosition" colliders={false}
          position={HOMES[h].p.toArray()} quaternion={HOMES[h].q.toArray() as [number, number, number, number]}
          friction={0.7} restitution={0} linearDamping={0.15} angularDamping={0.4} canSleep>
          <CuboidCollider args={[geos[h].w[0] / 2, 0.5, DEPTH / 2]} position={[0, 0.5 + LEAD / 2, 0]} />
          <CuboidCollider args={[geos[h].w[1] / 2, 0.5, DEPTH / 2]} position={[0, -0.5 - LEAD / 2, 0]} />
          <mesh geometry={geos[h].geometry} material={h < 2 ? mats.red : mats.ink} castShadow receiveShadow
            onClick={onClick(h)} onPointerOver={over(true)} onPointerOut={over(false)} />
        </RigidBody>
      ))}
    </>
  );
}

/* ───────── the commit tower: one bar of heavy type per recent commit, naming its repo ───────── */

function Commits({ ink }: { ink: THREE.Material }) {
  const [bits, setBits] = useState<string[]>(stage.bits);
  const start = useRef(0);
  const gi = STOPS.indexOf('github');
  const geos = useMemo(() => {
    const cache = new Map<string, ReturnType<typeof word>>();
    return bits.slice(0, 30).map((n) => {
      if (!cache.has(n)) { const g = word(n, 1.25, 0.9); paint(g.geometry, '#111111', '#3a3935'); cache.set(n, g); }
      return cache.get(n)!;
    });
  }, [bits]);
  useEffect(() => () => new Set(geos).forEach((g) => g.geometry.dispose()), [geos]);
  const homes = useMemo(() => { let y = 0; return geos.map((g) => { const c = y + g.size.y / 2; y += g.size.y + 0.1; return c; }); }, [geos]);
  const bodies = useRef<(RapierRigidBody | null)[]>([]);
  const done = useRef(false);
  useFrame(() => {
    if (stage.bits.join('') !== bits.join('')) { setBits(stage.bits); start.current = 0; done.current = false; return; }
    // The commit tower builds itself the first time the camera comes near it: one letter at a time, dropped and settling.
    if (!start.current && stage.f > gi - 1.2) start.current = performance.now() / 1000;
    if (!start.current || done.current) return;
    const now = performance.now() / 1000 - start.current;
    let busy = false;
    geos.forEach((_, i) => {
      const b = bodies.current[i]; if (!b) return;
      const t = now - i * 0.26, H0 = 6, g = 60, fall = Math.sqrt((2 * H0) / g);
      let y: number;
      if (t <= 0) { y = homes[i] + 400; busy = true; }
      else if (t < fall) { y = homes[i] + H0 - 0.5 * g * t * t; busy = true; }
      else { const u = t - fall; y = homes[i] + 0.35 * Math.exp(-7 * u) * Math.abs(Math.sin(u * 16)); if (u < 1) busy = true; }
      b.setNextKinematicTranslation({ x: CX + (rnd(i + 40) - 0.5) * 0.5, y, z: 0 });
    });
    if (busy) stage.invalidate?.(); else done.current = true;
  });
  return (
    <>
      {geos.map((g, i) => (
        <RigidBody key={bits.join('') + i} ref={(b) => { bodies.current[i] = b; }} type="kinematicPosition" colliders={false}
          position={[CX, homes[i] + 400, 0]} rotation={[0, (rnd(i + 60) - 0.5) * 0.08, 0]}>
          <CuboidCollider args={[g.size.x / 2, g.size.y / 2, g.size.z / 2]} />
          <mesh geometry={g.geometry} material={ink} castShadow receiveShadow />
        </RigidBody>
      ))}
    </>
  );
}

/* ───────── camera, and when to draw ───────── */

function Rig() {
  const { camera, size } = useThree();
  const a = useMemo(() => ({ pos: new THREE.Vector3(), look: new THREE.Vector3() }), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const { world } = useRapier();
  const boot = useRef(0);
  useFrame((_, dt) => {
    const vh = window.innerHeight, y = scroll.y, tops = stage.tops;
    // Hold on each stop while its section is read; travel while the next one comes up the screen.
    let f = 0;
    const lo = stage.phone ? 0.98 : 0.82, hi = stage.phone ? 0.5 : 0.32;
    for (let i = 0; i < tops.length - 1; i++) {
      const s0 = tops[i + 1] - vh * lo, s1 = tops[i + 1] - vh * hi;
      if (y >= s1) f = i + 1; else { if (y > s0) f = i + smooth((y - s0) / (s1 - s0)); break; }
    }
    stage.raw = f;
    stage.f = boot.current === 0 ? f : damp(stage.f, f, 3.2, Math.min(dt, 0.25));
    boot.current++;
    const i = Math.min(Math.floor(stage.f), SHOT_LIST.length - 1), t = stage.f - i;
    const far = !stage.phone && size.width / size.height < 0.8 ? 1.15 : 1;
    // Interpolate as an orbit (azimuth, elevation, distance), so the camera walks round rather than cutting through.
    const A = SHOT_LIST[i], B = SHOT_LIST[Math.min(i + 1, SHOT_LIST.length - 1)];
    const sh = S([lerp(A.t[0], B.t[0], t), lerp(A.t[1], B.t[1], t), lerp(A.t[2], B.t[2], t)], lerp(A.az, B.az, t), lerp(A.el, B.el, t), lerp(A.d, B.d, t));
    place(sh, a, far);
    camera.position.copy(a.pos); look.copy(a.look); camera.lookAt(look);
    let awake = Math.abs(stage.f - stage.raw) > 0.0005 || boot.current < 90;
    if (!awake) world.bodies.forEach((body) => { if (body.isDynamic() && !body.isSleeping()) awake = true; });
    if (awake) stage.invalidate?.();
  });
  return null;
}

/* ───────── the photograph ───────── */

export default function Scene({ phone }: { phone: boolean }) {
  const mats = useMemo(() => ({
    ink: new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.45, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.26, envMapIntensity: 0.9 }),
    red: new THREE.MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.45, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.26, envMapIntensity: 0.8 }),
  }), []);
  useEffect(() => () => { mats.ink.dispose(); mats.red.dispose(); }, [mats]);
  return (
    <Canvas
      frameloop="demand" dpr={[1, 1.6]} shadows={{ type: THREE.PCFShadowMap }}
      camera={{ fov: 20, near: 1, far: 600, position: [0, 12, 84] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl, invalidate }) => { gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1.0; stage.invalidate = () => invalidate(); }}
      style={{ touchAction: 'pan-y' }}
    >
      <color attach="background" args={[PAPER]} />
      <fog attach="fog" args={[PAPER, 160, 420]} />
      <hemisphereLight args={['#ffffff', '#cfcdc6', 0.75]} />
      {/* The key: a big softbox high on the left. */}
      <directionalLight position={[-22, 40, 28]} intensity={2.3} castShadow shadow-mapSize={[phone ? 1024 : 2048, phone ? 1024 : 2048]}
        shadow-camera-left={-30} shadow-camera-right={30} shadow-camera-top={34} shadow-camera-bottom={-8} shadow-camera-near={10} shadow-camera-far={120}
        shadow-bias={-0.0004} shadow-normalBias={0.03} shadow-radius={6} />
      {/* The rim, from behind on the right. */}
      <directionalLight position={[24, 20, -30]} intensity={1.6} color="#f3f4ff" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3.2} color="#ffffff" position={[-18, 22, 18]} scale={[24, 14, 1]} target={[0, 10, 0]} />
        <Lightformer form="rect" intensity={2.2} color="#f6f7ff" position={[22, 14, -16]} scale={[4, 26, 1]} target={[0, 10, 0]} />
        <Lightformer form="rect" intensity={0.9} color="#ffffff" position={[0, 6, 40]} scale={[40, 6, 1]} target={[0, 8, 0]} />
        <Lightformer form="rect" intensity={0.5} color="#e9e7e1" position={[0, -4, 0]} rotation-x={-Math.PI / 2} scale={[80, 80, 1]} />
      </Environment>
      <Sweep />
      <Suspense fallback={null}>
        <Physics gravity={[0, -36, 0]} colliders={false}>
          <CuboidCollider args={[200, 1, 200]} position={[0, -1, 0]} friction={0.9} />
          {/* A wall at the column's side of the room keeps every bar in the photograph. */}
          <CuboidCollider args={[1, 60, 200]} position={[-34, 30, 0]} />
          <Tower mats={mats} />
          <Commits ink={mats.ink} />
          <Rig />
        </Physics>
      </Suspense>
    </Canvas>
  );
}
