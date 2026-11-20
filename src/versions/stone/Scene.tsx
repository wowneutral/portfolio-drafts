// The one scene: a stack of white ramps, a terracotta stone, and (on the GitHub landing) a pebble per commit.
// Rapier does the weight; the page only says which landing you are reading.
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { BallCollider, CuboidCollider, Physics, RigidBody, useBeforePhysicsStep, type RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { scroll } from '@/lib/scroll';
import { clamp, damp, smooth } from '@/lib/utils';
import { DEPTH, GAP, R, S, THICK, TRAP, X0, X1, frameOf, levelOf, notchAt, onSlope, type Level } from './plan';

const G = 18;
const CHALK = '#ecebe7';

type Box = { cx: number; cy: number; hx: number; hy: number; ang: number };

function partsOf(l: Level): Box[] {
  const out: Box[] = [];
  const c = Math.cos(l.ang), s = Math.sin(l.ang);
  // curb, foot plate (the trapdoor is separate)
  out.push({ cx: X0 - 0.2, cy: l.y + (0.75 - THICK) / 2, hx: 0.2, hy: (0.75 + THICK) / 2, ang: 0 });
  out.push({ cx: (X0 + TRAP + X1) / 2, cy: l.y - THICK / 2, hx: (X1 - X0 - TRAP) / 2, hy: THICK / 2, ang: 0 });
  const total = l.len + (l.beyond ? 10 : 0);
  const cuts: [number, number][] = [];
  let a = 0;
  for (const n of l.notches) { cuts.push([a, n * l.len]); a = n * l.len + GAP; }
  cuts.push([a, total]);
  for (const [from, to] of cuts) {
    const p = onSlope(l, from), half = (to - from) / 2;
    out.push({ cx: p.x + c * half + s * THICK / 2, cy: p.y + s * half - c * THICK / 2, hx: half, hy: THICK / 2, ang: l.ang });
  }
  const e = onSlope(l, l.len);
  if (l.top) {
    out.push({ cx: e.x + 1.05, cy: e.y - THICK / 2, hx: 1.05, hy: THICK / 2, ang: 0 });
    out.push({ cx: e.x + 2.25, cy: e.y + 0.1, hx: 0.15, hy: 0.6, ang: 0 });
  } else if (!l.beyond) {
    out.push({ cx: e.x + 0.12, cy: e.y + 0.05, hx: 0.16, hy: 0.55, ang: 0 });
  }
  return out;
}

function noiseTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const v = Math.random() > 0.5 ? 255 : 0;
    g.fillStyle = `rgba(${v},${v},${v},${0.05 + Math.random() * 0.08})`;
    g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, 0.6 + Math.random() * 2.4, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1);
  return t;
}

function useMats() {
  return useMemo(() => {
    const grain = noiseTexture();
    return {
      slab: new THREE.MeshPhysicalMaterial({ color: '#f3f3f2', roughness: 0.58, clearcoat: 0.15, clearcoatRoughness: 0.6 }),
      stone: new THREE.MeshPhysicalMaterial({ color: '#b54a2a', roughness: 0.52, roughnessMap: grain, bumpMap: grain, bumpScale: 1.2, clearcoat: 0.5, clearcoatRoughness: 0.38 }),
      pebble: new THREE.MeshPhysicalMaterial({ color: '#a9472b', roughness: 0.5, bumpMap: grain, bumpScale: 0.8, clearcoat: 0.35, clearcoatRoughness: 0.4 }),
      grain,
    };
  }, []);
}

function Slab({ b, mat }: { b: Box; mat: THREE.Material }) {
  const geo = useMemo(() => new RoundedBoxGeometry(b.hx * 2, b.hy * 2, DEPTH, 3, 0.07), [b.hx, b.hy]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={mat} position={[b.cx, b.cy, 0]} rotation={[0, 0, b.ang]} castShadow receiveShadow />;
}

function LevelSet({ l, mat }: { l: Level; mat: THREE.Material }) {
  const parts = useMemo(() => partsOf(l), [l]);
  return (
    <RigidBody type="fixed" colliders={false}>
      {parts.map((b, i) => (
        <group key={i}>
          <CuboidCollider args={[b.hx, b.hy, DEPTH / 2]} position={[b.cx, b.cy, 0]} rotation={[0, 0, b.ang]} friction={1} restitution={0.2} />
          <Slab b={b} mat={mat} />
        </group>
      ))}
    </RigidBody>
  );
}

const trapGeo = new RoundedBoxGeometry(TRAP - 0.03, THICK, DEPTH, 3, 0.07);

function Set({ levels, pebbles }: { levels: Level[]; pebbles: number[] }) {
  const M = useMats();
  const stone = useRef<RapierRigidBody>(null);
  const traps = useRef<(RapierRigidBody | null)[]>([]);
  const { camera, size, gl } = useThree();
  const key = useMemo(() => new THREE.DirectionalLight('#fffdf9', 2.9), []);
  const st = useRef({
    t: 0, active: -1, rest: 0, prevVy: 0, shake: 0, cand: -1, candT: 0, camY: levels[0].y + 1.6,
    trap: levels.map(() => ({ until: 0, z: 0 })), camX: 0, camW: 7,
    secs: [] as { top: number; h: number }[], secT: 0,
  }).current;
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const gh = levels.findIndex((l) => l.kind === 'github');
  const phone = size.width < 700 || window.innerWidth <= 820;

  useEffect(() => {
    key.castShadow = true;
    const n = phone ? 1024 : 2048;
    key.shadow.mapSize.set(n, n); key.shadow.bias = -0.0005; key.shadow.normalBias = 0.04; key.shadow.radius = 4;
    const c = key.shadow.camera; c.left = -13; c.right = 13; c.top = 12; c.bottom = -12; c.near = 1; c.far = 60; c.updateProjectionMatrix();
    return () => { key.shadow.map?.dispose(); M.grain.dispose(); M.slab.dispose(); M.stone.dispose(); M.pebble.dispose(); };
  }, [key, M, phone]);

  // Placing the stone (also used by the page: the two wins put it in their notch).
  useEffect(() => {
    S.place = (k, where) => {
      const b = stone.current; if (!b) return;
      const l = levels[clamp(k, 0, levels.length - 1)];
      let x = X0 + R + 0.12, y = l.y + 2.4;
      if (where === 'top') { const e = onSlope(l, l.len); x = e.x + 1.15; y = e.y + 2.2; }
      else if (typeof where === 'number') { const p = notchAt(l, where); x = p.x; y = p.y + 0.62; }
      b.setTranslation({ x, y, z: 0 }, true); b.setLinvel({ x: 0, y: typeof where === 'number' ? 0 : -1.5, z: 0 }, true); b.setAngvel({ x: 0, y: 0, z: 0 }, true);
    };
    return () => { S.place = null; };
  }, [levels]);

  const measure = () => {
    st.secs = [...document.querySelectorAll<HTMLElement>('.v-stone [data-level]')].map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top + window.scrollY, h: Math.max(1, r.height) };
    });
  };

  useBeforePhysicsStep(() => {
    const b = stone.current; if (!b) return;
    const p = b.translation(), v = b.linvel(), m = b.mass();
    const k = clamp(levelOf(p.y), 0, levels.length - 1), l = levels[k];
    const dx = Math.cos(l.ang), dy = Math.sin(l.ang);
    const along = v.x * dx + v.y * dy;
    b.resetForces(true);
    let F = 0;
    const auto = !S.touched && st.active === 0 && st.t > 2.4 && st.t < 4.3;
    if (S.drag) {
      ray.setFromCamera(new THREE.Vector2(S.ptr.x, S.ptr.y), camera);
      if (ray.ray.intersectPlane(plane, tmp)) {
        const want = (tmp.x - p.x) * dx + (tmp.y - p.y) * dy;
        F = clamp(want * 3 * m * G, -1.1 * m * G, 1.1 * m * G) - 6 * m * along;
      }
    } else if (S.push || auto) {
      F = (auto ? 0.62 : 0.8) * m * G - 6 * m * Math.max(0, along);
    }
    if (F) b.addForce({ x: F * dx, y: F * dy, z: 0 }, true);
    // trapdoors
    st.trap.forEach((tr, i) => {
      const want = st.t < tr.until ? -(DEPTH + 0.4) : 0;
      if (Math.abs(tr.z - want) < 0.001) return;
      tr.z += (want - tr.z) * (want < tr.z ? 0.28 : 0.12);
      if (Math.abs(tr.z - want) < 0.01) tr.z = want;
      traps.current[i]?.setNextKinematicTranslation({ x: X0 + TRAP / 2, y: levels[i].y - THICK / 2, z: tr.z });
    });
  });

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20);
    st.t += dt;
    st.secT -= dt;
    if (st.secT <= 0 || !st.secs.length) { measure(); st.secT = 1; }
    const b = stone.current;

    // Which landing is being read, and where between two landings the camera is.
    const ref = phone ? window.innerHeight * 0.58 : window.innerHeight * 0.5;
    const y = scroll.y + ref;
    let k = 0;
    for (let i = 0; i < st.secs.length; i++) if (st.secs[i].top <= y) k = i;
    k = Math.min(k, levels.length - 1);
    const sec = st.secs[k];
    const f = sec ? clamp((y - sec.top) / sec.h) : 0;
    const e = k < levels.length - 1 ? smooth(clamp((f - 0.8) / 0.2)) : 0;
    const ty = levels[k].y + (levels[Math.min(k + 1, levels.length - 1)].y - levels[k].y) * e + (phone ? 2.1 : 1.4);
    st.camY = damp(st.camY, ty, 3.2, dt);
    const fa = frameOf(levels[k]), fb = frameOf(levels[Math.min(k + 1, levels.length - 1)]);
    const left = fa.left + (fb.left - fa.left) * e, right = fa.right + (fb.right - fa.right) * e;
    if (st.t < 0.1) { st.camX = (left + right) / 2; st.camW = (right - left) / 2; }
    st.camX = damp(st.camX, (left + right) / 2, 3.2, dt);
    st.camW = damp(st.camW, (right - left) / 2 + 0.3, 3.2, dt);
    const CX = st.camX;

    if (b) {
      const p = b.translation(), v = b.linvel();
      const sl = levelOf(p.y);
      if (k !== st.active) {
        const first = st.active < 0;
        st.active = k;
        if (!first) {
          if (levels[k].kind === 'today' && S.todayUp) S.place?.(k, 'top');
          else if (k === sl + 1 && p.x < X0 + TRAP + 0.2) st.trap[sl].until = st.t + 1.2;
          else if (k !== sl) S.place?.(k, 'foot');
        }
      }
      const speed = Math.hypot(v.x, v.y);
      if (sl !== st.active && speed < 0.5) st.rest += dt; else st.rest = 0;
      if (st.rest > 1.1 || p.y < levels[levels.length - 1].y - 25) { st.rest = 0; S.place?.(st.active, 'foot'); }
      // a landing you can feel
      if (st.prevVy < -6 && v.y > -1.5) st.shake = Math.min(0.32, -st.prevVy * 0.022);
      st.prevVy = v.y;
      // the notches
      const l = levels[clamp(sl, 0, levels.length - 1)];
      let cand = -1;
      if (l.notches.length && speed < 0.3) l.notches.forEach((_, i) => { if (Math.abs(p.x - notchAt(l, i).x) < 0.4) cand = i; });
      if (cand === st.cand) st.candT += dt; else { st.cand = cand; st.candT = 0; }
      if (st.candT > 0.25 && cand !== S.held) { S.held = cand; S.onHeld(cand); }
      // where the stone is on screen, for the pointer
      tmp.set(p.x, p.y, p.z).project(camera);
      const cam = camera as THREE.PerspectiveCamera;
      const dist = camera.position.distanceTo(tmp.set(p.x, p.y, p.z));
      S.screen.x = (tmp.set(p.x, p.y, p.z).project(camera).x * 0.5 + 0.5) * size.width;
      S.screen.y = (-tmp.y * 0.5 + 0.5) * size.height;
      S.screen.r = (R / (dist * Math.tan((cam.fov * Math.PI) / 360))) * (size.height / 2);
    }

    // camera: a long lens, a little above and to the right, framing one landing
    st.shake = damp(st.shake, 0, 7, dt);
    const cam = camera as THREE.PerspectiveCamera;
    const D = 62, halfW = st.camW, halfH = 4.2;
    const a = size.width / Math.max(1, size.height);
    const fov = (2 * Math.atan(Math.max(halfW / a, halfH) / D) * 180) / Math.PI;
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    const sh = st.shake * Math.sin(st.t * 60);
    cam.position.set(CX + 9, st.camY + 7 + sh * 0.4, D);
    cam.lookAt(CX, st.camY + sh * 0.15, 0);
    key.position.set(CX - 9, st.camY + 13, 14);
    key.target.position.set(CX, st.camY - 1.5, 0);
    key.target.updateMatrixWorld();
    void gl;
  });

  const pebs = useMemo(() => {
    if (gh < 0) return [];
    const l = levels[gh];
    const from = X0 + TRAP + 0.4, to = X1 + 3.4, n = pebbles.length;
    return pebbles.map((r, i) => {
      const x = n === 1 ? (from + to) / 2 : from + ((to - from) * i) / (n - 1);
      const yS = x > X1 ? onSlope(l, (x - X1) / Math.cos(l.ang)).y : l.y;
      return { r, x, y: yS + r + 0.06, z: ((i * 0.618) % 1 - 0.5) * 1.3 };
    });
  }, [levels, pebbles, gh]);

  const sphere = useMemo(() => new THREE.SphereGeometry(1, 48, 32), []);

  return (
    <>
      <primitive object={key} />
      <primitive object={key.target} />
      {levels.map((l, i) => <LevelSet key={i} l={l} mat={M.slab} />)}
      {levels.map((l, i) => (
        <RigidBody key={'t' + i} ref={(r) => { traps.current[i] = r; }} type="kinematicPosition" colliders={false} position={[X0 + TRAP / 2, l.y - THICK / 2, 0]}>
          <CuboidCollider args={[TRAP / 2 - 0.015, THICK / 2, DEPTH / 2]} friction={1} restitution={0.2} />
          <mesh geometry={trapGeo} material={M.slab} castShadow receiveShadow />
        </RigidBody>
      ))}
      <RigidBody ref={stone} colliders={false} position={[X0 + R + 0.12, levels[0].y + 3.2, 0]} enabledTranslations={[true, true, false]} enabledRotations={[false, false, true]} linearDamping={0.04} angularDamping={0.45} ccd canSleep={false}>
        <BallCollider args={[R]} density={2.6} friction={1} restitution={0.28} />
        <mesh geometry={sphere} scale={R} material={M.stone} castShadow receiveShadow />
      </RigidBody>
      {pebs.map((q, i) => (
        <RigidBody key={`p${pebbles.length}-${i}`} colliders={false} position={[q.x, q.y, q.z]} enabledTranslations={[true, true, false]} linearDamping={0.15} angularDamping={1.6}>
          <BallCollider args={[q.r]} density={1.4} friction={0.9} restitution={0.25} />
          <mesh geometry={sphere} scale={q.r} material={M.pebble} castShadow receiveShadow />
        </RigidBody>
      ))}
    </>
  );
}

function Backdrop() {
  // The wall behind the stack: only the shadows show, so it is exactly the page colour.
  return (
    <mesh position={[0, -60, -DEPTH / 2 - 0.9]} receiveShadow>
      <planeGeometry args={[400, 400]} />
      <shadowMaterial opacity={0.05} color="#3a2a20" />
    </mesh>
  );
}

export default function Scene({ levels, pebbles }: { levels: Level[]; pebbles: number[] }) {
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const local = (e: PointerEvent) => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height }; };
    const near = (q: { x: number; y: number }) => Math.hypot(q.x - S.screen.x, q.y - S.screen.y) < S.screen.r * 1.7 + 22;
    const down = (e: PointerEvent) => {
      const q = local(e);
      if (!near(q)) return;
      S.drag = true; S.touched = true;
      S.ptr.x = (q.x / q.w) * 2 - 1; S.ptr.y = -(q.y / q.h) * 2 + 1;
      el.setPointerCapture(e.pointerId);
      el.dataset.drag = '1';
    };
    const move = (e: PointerEvent) => {
      const q = local(e);
      S.ptr.x = (q.x / q.w) * 2 - 1; S.ptr.y = -(q.y / q.h) * 2 + 1;
      if (!S.drag) el.dataset.near = near(q) ? '1' : '';
    };
    const up = () => { S.drag = false; el.dataset.drag = ''; };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    return () => {
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); el.removeEventListener('lostpointercapture', up);
    };
  }, []);

  return (
    <div className="st-gl" ref={wrap}>
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }} dpr={[1, 1.6]} camera={{ fov: 14, near: 1, far: 300, position: [8, 8, 62] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1.0; }}
        style={{ touchAction: 'pan-y' }}
        aria-hidden="true"
      >
        <color attach="background" args={[CHALK]} />
        <fog attach="fog" args={[CHALK, 70, 120]} />
        <hemisphereLight args={['#ffffff', '#cfc8bc', 0.55]} />
        <directionalLight position={[14, 2, 30]} intensity={0.45} color="#f1f0ff" />
        <Environment resolution={256} frames={1}>
          <color attach="background" args={['#4a443c']} />
          <Lightformer form="rect" intensity={3.4} color="#fffdf8" position={[-4, 9, 4]} rotation-x={Math.PI / 2} scale={[16, 4, 1]} />
          <Lightformer form="rect" intensity={4} color="#fffaf4" position={[-12, 3, 6]} rotation-y={Math.PI / 2.4} scale={[3, 9, 1]} />
          <Lightformer form="rect" intensity={2.2} color="#eef1ff" position={[12, 4, 2]} rotation-y={-Math.PI / 2} scale={[3, 9, 1]} />
          <Lightformer form="rect" intensity={1.2} color="#f5f1ea" position={[0, 3, 16]} rotation-y={Math.PI} scale={[22, 5, 1]} />
          <Lightformer form="rect" intensity={0.9} color="#ece6da" position={[0, -3, 0]} rotation-x={-Math.PI / 2} scale={[50, 50, 1]} />
        </Environment>
        <Backdrop />
        <Suspense fallback={null}>
          <Physics gravity={[0, -G, 0]} timeStep={1 / 60}>
            <Set levels={levels} pebbles={pebbles} />
          </Physics>
        </Suspense>
      </Canvas>
    </div>
  );
}
