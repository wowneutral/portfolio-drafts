// The site: a warm concrete sweep, pale cast pieces lit like an architect's
// model. Scroll lowers one piece per section onto the gate (and lifts it away
// again going back up); the four call words bring the visitor's own pieces in
// on an invisible track and hand them to Rapier, so a second one stacks.
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { Physics, useRapier } from '@react-three/rapier';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { clamp, damp, lerp, smooth } from '@/lib/utils';
import { castTexture, concreteTexture } from './draw';
import { S, SHOTS, SITE, SIZE, STOPS, YARD, coursePieces, dayPieces, stopIndex, type Kind, type PieceDef } from './plan';

const SWEEP = '#d8d5ce';
const CONCRETE = '#d9d4ca';
const COBALT = '#2547a8';
const STEP = 1 / 60;
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

type Mats = { concrete: THREE.MeshStandardMaterial; cobalt: THREE.MeshStandardMaterial; tex: THREE.Texture };

function useMats(): Mats {
  const m = useMemo(() => {
    const tex = concreteTexture();
    const concrete = new THREE.MeshStandardMaterial({ color: CONCRETE, map: tex, bumpMap: tex, bumpScale: 0.6, roughness: 0.9, metalness: 0, envMapIntensity: 0.55 });
    const cobalt = new THREE.MeshStandardMaterial({ color: COBALT, map: tex, bumpMap: tex, bumpScale: 0.6, roughness: 0.82, envMapIntensity: 0.5 });
    return { concrete, cobalt, tex };
  }, []);
  useEffect(() => () => { m.concrete.dispose(); m.cobalt.dispose(); m.tex.dispose(); }, [m]);
  return m;
}

const geoCache = new Map<string, THREE.BufferGeometry>();
function boxGeo(w: number, h: number, d: number) {
  const key = `${w}:${h}:${d}`;
  let g = geoCache.get(key);
  if (!g) { g = new RoundedBoxGeometry(w, h, d, 3, Math.min(0.035, Math.min(w, h, d) * 0.22)); geoCache.set(key, g); }
  return g;
}

/** A piece: the cast body plus, when it carries a word, the debossed front face. */
function makePiece(size: [number, number, number], mat: THREE.Material, word?: string) {
  const [w, h, d] = size;
  const group = new THREE.Group();
  const body = new THREE.Mesh(boxGeo(w, h, d), mat); body.castShadow = body.receiveShadow = true; group.add(body);
  let face: THREE.Mesh | null = null;
  if (word) {
    const pw = w - 0.06, ph = h - 0.06;
    // On a tall face the word runs up it, so it can be cast large.
    const up = ph > pw * 2.2;
    const tex = up ? castTexture(word, ph, pw) : castTexture(word, pw, ph);
    const fm = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false });
    face = new THREE.Mesh(up ? new THREE.PlaneGeometry(ph, pw) : new THREE.PlaneGeometry(pw, ph), fm);
    if (up) face.rotation.z = Math.PI / 2;
    face.position.z = d / 2 + 0.0015; face.receiveShadow = true;
    group.add(face);
  }
  const dispose = () => { if (face) { (face.material as THREE.MeshStandardMaterial).map?.dispose(); (face.material as THREE.Material).dispose(); face.geometry.dispose(); } };
  return { group, body, dispose };
}

/* ───────── the scripted build ───────── */

type Placed = { def: PieceDef; group: THREE.Group; k: number; land: number; landed: boolean; home: THREE.Vector3; from: THREE.Vector3; sign: number; fwd: number; dispose: () => void };

function Site({ days, bits, mats }: { days: string[]; bits: string[]; mats: Mats }) {
  const root = useMemo(() => new THREE.Group(), []);
  const pieces = useRef<Placed[]>([]);
  const clock = useRef(0);

  const defs = useMemo(() => [...SITE, ...dayPieces(days), ...coursePieces(bits)], [days, bits]);
  useEffect(() => {
    const list = defs.map((def, i): Placed => {
      const p = makePiece(def.size, mats.concrete, def.word);
      p.group.visible = false; root.add(p.group);
      const home = v3(...def.pos);
      const sign = i % 2 ? 1 : -1;
      return { def, group: p.group, k: 0, land: -9, landed: false, home, from: home.clone().add(v3(1.4 * sign, 6.5, -0.6)), sign, fwd: 0, dispose: p.dispose };
    });
    pieces.current = list;
    return () => { list.forEach((p) => { root.remove(p.group); p.dispose(); }); };
  }, [defs, mats, root]);

  const tmpE = useMemo(() => new THREE.Euler(), []);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    clock.current += dt;
    const y = window.scrollY + window.innerHeight * 0.55;
    let active = 0;
    S.tops.forEach((t, i) => { if (t <= y) active = i; });
    let work = 0;
    S.workTops.forEach((t, i) => { if (t <= y) work = i; });
    const DUR = 1.25;
    for (const p of pieces.current) {
      const on = active >= stopIndex(p.def.stop);
      const max = DUR + (p.def.delay ?? 0);
      p.k = clamp(p.k + (on ? dt : -dt * 1.5), 0, max);
      const u = clamp((p.k - (p.def.delay ?? 0)) / DUR);
      const g = p.group;
      g.visible = u > 0;
      if (!g.visible) { p.landed = false; continue; }
      if (u >= 1 && !p.landed) { p.landed = true; p.land = clock.current; S.shake = Math.min(0.05, S.shake + (p.def.size[1] > 1 ? 0.03 : 0.012)); }
      if (u < 1) p.landed = false;
      // The track: across early, down late, swinging on the way.
      const across = easeOut(clamp(u * 1.35));
      const down = smooth(u);
      g.position.set(lerp(p.from.x, p.home.x, across), lerp(p.from.y, p.home.y, down), lerp(p.from.z, p.home.z, across));
      let rz = 0.14 * p.sign * Math.sin(u * Math.PI * 3) * Math.pow(1 - u, 1.3);
      let rx = p.def.rx ?? 0;
      if (p.landed) {
        const s = clock.current - p.land;
        rx += 0.022 * Math.exp(-6 * s) * Math.sin(17 * s);
        rz += 0.012 * p.sign * Math.exp(-6 * s) * Math.sin(15 * s);
        g.position.y += 0.025 * Math.exp(-9 * s) * Math.abs(Math.sin(19 * s));
      }
      if (p.def.work !== undefined) {
        p.fwd = damp(p.fwd, p.def.work === work && active === stopIndex('work') ? 1 : 0, 6, dt);
        g.position.z += p.fwd * 0.42; g.position.y += p.fwd * 0.03;
        rx = lerp(rx, 0, p.fwd);
      }
      tmpE.set(rx, p.def.ry ?? 0, rz);
      g.quaternion.setFromEuler(tmpE);
    }
  });
  return <primitive object={root} />;
}

/* ───────── the visitor's pieces ───────── */

type Body = ReturnType<ReturnType<typeof useRapier>['world']['createRigidBody']>;
type Called = { kind: Kind; group: THREE.Group; body: Body; t: number; from: THREE.Vector3; to: THREE.Vector3; mode: 'carry' | 'free'; sign: number; dispose: () => void };

function Yard({ mats }: { mats: Mats }) {
  const { world, rapier: R } = useRapier();
  const root = useMemo(() => new THREE.Group(), []);
  const list = useRef<Called[]>([]);
  const acc = useRef(0);

  useEffect(() => {
    world.timestep = STEP; world.gravity = { x: 0, y: -14, z: 0 };
    const ground = world.createRigidBody(R.RigidBodyDesc.fixed());
    world.createCollider(R.ColliderDesc.cuboid(80, 0.5, 80).setTranslation(0, -0.5, 0).setFriction(0.9), ground);
    return () => { list.current.forEach((c) => c.dispose()); list.current = []; };
  }, [world, R]);

  const tmpQ = useMemo(() => new THREE.Quaternion(), []), tmpE = useMemo(() => new THREE.Euler(), []);

  const call = (kind: Kind) => {
    const [w, h, d] = SIZE[kind];
    const [x, z] = YARD[kind];
    // Stack on whatever already stands on this spot.
    let top = 0;
    for (const c of list.current) {
      const t = c.mode === 'free' ? c.body.translation() : c.to;
      if (Math.abs(t.x - x) < 1 && Math.abs(t.z - z) < 1) {
        const [, ch] = SIZE[c.kind];
        top = Math.max(top, t.y + ch / 2);
      }
    }
    const sign = list.current.length % 2 ? 1 : -1;
    const to = v3(x + (top ? sign * 0.05 : 0), top + h / 2 + 0.04, z);
    const from = to.clone().add(v3(4.5, 7, -2));
    const p = makePiece([w, h, d], mats.cobalt);
    p.group.position.copy(from); root.add(p.group);
    const body = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(from.x, from.y, from.z).setAngularDamping(0.4).setLinearDamping(0.05));
    world.createCollider(R.ColliderDesc.cuboid(w / 2, h / 2, d / 2).setDensity(2.4).setFriction(0.85).setRestitution(0.02), body);
    // The last called piece is cobalt; earlier ones go back to concrete.
    for (const c of list.current) (c.group.children[0] as THREE.Mesh).material = mats.concrete;
    const item: Called = {
      kind, group: p.group, body, t: 0, from, to, mode: 'carry', sign,
      dispose: () => { root.remove(p.group); p.dispose(); if (world.getRigidBody(body.handle)) world.removeRigidBody(body); },
    };
    list.current.push(item);
    if (list.current.length > 12) list.current.shift()!.dispose();
    S.peek = 3.6;
  };

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    while (S.calls.length) call(S.calls.shift()!);
    acc.current += dt;
    let n = 0;
    while (acc.current >= STEP && n < 6) {
      for (const c of list.current) {
        if (c.mode !== 'carry') continue;
        c.t += STEP;
        const u = clamp(c.t / 1.3);
        const across = easeOut(clamp(u * 1.3)), down = smooth(u);
        const x = lerp(c.from.x, c.to.x, across), z = lerp(c.from.z, c.to.z, across), y = lerp(c.from.y, c.to.y, down);
        tmpE.set(0, c.sign * 0.05 * (1 - u), 0.16 * c.sign * Math.sin(u * Math.PI * 3) * Math.pow(1 - u, 1.3));
        tmpQ.setFromEuler(tmpE);
        c.body.setNextKinematicTranslation({ x, y, z });
        c.body.setNextKinematicRotation(tmpQ);
        if (u >= 1) {
          c.mode = 'free';
          c.body.setBodyType(R.RigidBodyType.Dynamic, true);
          c.body.setLinvel({ x: 0, y: -0.8, z: 0 }, true);
          S.shake = Math.min(0.06, S.shake + (c.kind === 'block' ? 0.02 : 0.035));
          S.onLand?.(c.kind);
        }
      }
      world.step();
      acc.current -= STEP; n++;
    }
    if (n === 6) acc.current = 0;
    for (const c of list.current) {
      const t = c.body.translation(), r = c.body.rotation();
      c.group.position.set(t.x, t.y, t.z); c.group.quaternion.set(r.x, r.y, r.z, r.w);
      if (t.y < -5) { c.body.setTranslation({ x: c.to.x, y: 3, z: c.to.z }, true); c.body.setLinvel({ x: 0, y: 0, z: 0 }, true); }
    }
  });
  return <primitive object={root} />;
}

/* ───────── the sweep ───────── */

function Sweep() {
  const geometry = useMemo(() => {
    const R = 6, zf = -6, prof: [number, number][] = [[60, 0], [zf, 0]];
    for (let i = 1; i <= 16; i++) { const a = (i / 16) * Math.PI / 2; prof.push([zf - R * Math.sin(a), R - R * Math.cos(a)]); }
    prof.push([zf - R, 60]);
    const pos: number[] = [], idx: number[] = [];
    prof.forEach(([z, y]) => { for (const x of [-80, 80]) pos.push(x, y, z); });
    for (let i = 0; i < prof.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color={SWEEP} roughness={1} envMapIntensity={0.2} />
    </mesh>
  );
}

/* ───────── camera ───────── */

function Rig() {
  const { camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const st = useRef({ f: 0, init: false, sx: 0, sy: 0, tx: 0, ty: 0, peek: 0, t: 0 });
  const pos = useMemo(() => v3(), []), tgt = useMemo(() => v3(), []), a = useMemo(() => v3(), []), b = useMemo(() => v3(), []);
  useEffect(() => {
    const move = (e: PointerEvent) => { if (e.pointerType === 'touch') return; st.current.tx = e.clientX / window.innerWidth - 0.5; st.current.ty = e.clientY / window.innerHeight - 0.5; };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);
  const place = (i: number, outP: THREE.Vector3, outT: THREE.Vector3) => {
    const s = SHOTS[STOPS[i]];
    const fov = cam.fov * Math.PI / 180, aspect = size.width / size.height;
    const d = Math.max((s.w / 2) / (Math.tan(fov / 2) * aspect), (s.w * 0.42) / Math.tan(fov / 2));
    const az = s.az * Math.PI / 180, el = s.el * Math.PI / 180;
    outT.set(...s.t);
    outP.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(d).add(outT);
  };
  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1), s = st.current;
    s.t += dt;
    const y = window.scrollY + window.innerHeight * 0.55;
    let raw = 0;
    S.tops.forEach((t, i) => { if (t <= y) raw = i; });
    s.f = s.init ? damp(s.f, raw, 2.4, dt) : raw; s.init = true;
    S.peek = Math.max(0, S.peek - dt);
    s.peek = damp(s.peek, S.peek > 0 && raw > 0 ? 1 : 0, 2.6, dt);
    const i = Math.min(STOPS.length - 2, Math.floor(s.f)), t = smooth(s.f - i);
    place(i, a, tgt); place(i + 1, b, pos);
    a.lerp(b, t); tgt.lerp(pos, t);
    if (s.peek > 0.001) { place(0, b, pos); a.lerp(b, smooth(s.peek)); tgt.lerp(pos, smooth(s.peek)); }
    s.sx = damp(s.sx, s.tx, 2.5, dt); s.sy = damp(s.sy, s.ty, 2.5, dt);
    const reach = a.distanceTo(tgt);
    cam.position.copy(a);
    cam.position.x += s.sx * reach * 0.03;
    cam.position.y += -s.sy * reach * 0.015;
    S.shake = damp(S.shake, 0, 7, dt);
    if (S.shake > 0.0005) cam.position.y += Math.sin(state.clock.elapsedTime * 63) * S.shake * reach * 0.01;
    cam.lookAt(tgt);
  }, -1);
  return null;
}

function Key({ low }: { low: boolean }) {
  const light = useMemo(() => {
    const l = new THREE.DirectionalLight('#fff9f2', 2.3);
    l.position.set(-6.5, 12, 8); l.target.position.set(1.5, 0, 0);
    l.castShadow = true; l.shadow.mapSize.set(low ? 1024 : 2048, low ? 1024 : 2048);
    l.shadow.bias = -0.0004; l.shadow.normalBias = 0.03; l.shadow.radius = 4;
    const c = l.shadow.camera; c.left = -13; c.right = 13; c.top = 9; c.bottom = -9; c.near = 2; c.far = 40; c.updateProjectionMatrix();
    return l;
  }, [low]);
  useEffect(() => () => { light.shadow.map?.dispose(); }, [light]);
  return <><primitive object={light} /><primitive object={light.target} /></>;
}

export default function Scene({ days, bits, low }: { days: string[]; bits: string[]; low: boolean }) {
  const mats = useMats();
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }} dpr={[1, low ? 1.5 : 1.6]} camera={{ fov: 22, near: 0.1, far: 300, position: [8, 3, 20] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1.0; }}
      style={{ touchAction: 'pan-y', pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <color attach="background" args={[SWEEP]} />
      <fog attach="fog" args={[SWEEP, 40, 120]} />
      <hemisphereLight args={['#f7f7f5', '#b9b5ad', 0.75]} />
      <Key low={low} />
      <directionalLight position={[9, 5, 10]} intensity={0.55} color="#f4f1ea" />
      <directionalLight position={[6, 7, -12]} intensity={1.0} color="#dce6ff" />
      <Environment resolution={128} frames={1}>
        <color attach="background" args={['#4a463f']} />
        <Lightformer form="rect" intensity={3} color="#fff6ea" position={[-6, 9, 5]} rotation-x={Math.PI / 2} scale={[14, 6, 1]} />
        <Lightformer form="rect" intensity={2.2} color="#eef2ff" position={[10, 4, -4]} rotation-y={-Math.PI / 2} scale={[3, 8, 1]} />
        <Lightformer form="rect" intensity={1.1} color="#f4efe6" position={[0, 3, 14]} rotation-y={Math.PI} scale={[20, 5, 1]} />
      </Environment>
      <Sweep />
      <Site days={days} bits={bits} mats={mats} />
      <Suspense fallback={null}>
        <Physics paused>
          <Yard mats={mats} />
        </Physics>
      </Suspense>
      <ContactShadows position={[1.5, 0.004, 0]} scale={[26, 12]} resolution={low ? 256 : 512} far={2.2} blur={2.4} opacity={0.6} color="#2a2219" />
      <Rig />
    </Canvas>
  );
}
