// A line of metal sorts on proof paper. The sorts spill, then hop into the
// composing line one at a time (kinematic), reading backwards. Pick one up
// and throw it (Rapier, dynamic); dropped near its slot, or left alone for a
// while, it hops home. The page reads the line's state through onMask and
// prints it, right-reading, beside the scene.
import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { Physics, useRapier } from '@react-three/rapier';
import * as THREE from 'three';
import { clamp, damp, smooth } from '@/lib/utils';
import { BODY, HIGH, sortGeo } from './geo';

const STEP = 1 / 60;
type World = ReturnType<typeof useRapier>['world'];
type Body = ReturnType<World['createRigidBody']>;
type Mode = 'loose' | 'fly' | 'set' | 'held';
type Actor = {
  i: number; ch: string; g: THREE.Group; body: Body; mode: Mode; kin: boolean;
  home: THREE.Vector3; t: number; wait: number; dur: number; arc: number; rest: number;
  fp: THREE.Vector3; fq: THREE.Quaternion; hx: number;
};

export type Props = { lines: string[]; go: boolean; reset: number; onMask: (m: boolean[]) => void; onFail?: () => void; spin?: number; empty?: boolean; active?: boolean; poke?: { i: number; n: number } };

let seed = 3;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

function layout(lines: string[]) {
  const items: { ch: string; x: number; z: number; w: number }[] = [];
  const n = lines.length, pitch = BODY + 0.012;
  let W = 0;
  lines.forEach((line, li) => {
    const ws = line.split('').map((c) => sortGeo(c).w);
    const total = ws.reduce((a, b) => a + b, 0) + (ws.length - 1) * 0.008;
    W = Math.max(W, total);
    let pen = -total / 2;
    const z = (li - (n - 1) / 2) * pitch;
    line.split('').forEach((c, k) => { items.push({ ch: c, x: pen + ws[k] / 2, z, w: ws[k] }); pen += ws[k] + 0.008; });
  });
  const back = -(n * pitch) / 2, front = (n * pitch) / 2;
  return { items, W, back, front, scatter: [front + 0.3, front + 1.35] as [number, number] };
}

function Sorts({ lines, go, reset, onMask, spin = 0, empty = false, poke }: Omit<Props, 'active'>) {
  const { world, rapier: R } = useRapier();
  const { camera, gl, size } = useThree();
  const L = useMemo(() => layout(lines), [lines]);
  const mats = useMemo(() => ({
    lead: new THREE.MeshPhysicalMaterial({ color: '#b4b7bb', metalness: 0.95, roughness: 0.34, envMapIntensity: 1.35 }),
    nick: new THREE.MeshStandardMaterial({ color: '#2c2e31', metalness: 0.8, roughness: 0.5 }),
    ink: new THREE.MeshPhysicalMaterial({ color: '#2a4aa8', metalness: 0.05, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.2, envMapIntensity: 0.9 }),
  }), []);
  const root = useMemo(() => new THREE.Group(), []);
  const st = useRef({ acc: 0, started: false, mask: [] as boolean[], dirty: false, held: null as Actor | null, hv: new THREE.Vector3(), target: new THREE.Vector3(), lastReset: reset, sway: { x: 0, y: 0, tx: 0, ty: 0 } }).current;

  const actors = useMemo(() => {
    seed = 3 + lines.join('').length;
    const [z0, z1] = L.scatter;
    const list: Actor[] = L.items.map((it, i) => {
      const G = sortGeo(it.ch);
      const g = new THREE.Group();
      const b = new THREE.Mesh(G.body, mats.lead); b.castShadow = b.receiveShadow = true; b.userData.i = i; g.add(b);
      if (G.nick) { const k = new THREE.Mesh(G.nick, mats.nick); g.add(k); }
      if (G.face) { const f = new THREE.Mesh(G.face, [mats.ink, mats.lead]); f.castShadow = true; f.userData.i = i; g.add(f); }
      root.add(g);
      const x = (rnd() - 0.5) * (L.W + 0.4), z = z0 + rnd() * (z1 - z0);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 6.3, rnd() * 6.3, rnd() * 6.3));
      const body = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(x, 0.55 + rnd() * 0.7, z).setRotation(q).setLinearDamping(0.15).setAngularDamping(0.4).setCcdEnabled(true));
      world.createCollider(R.ColliderDesc.cuboid(G.w / 2, G.h / 2, BODY / 2).setDensity(11).setFriction(0.6).setRestitution(0.12), body);
      return { i, ch: it.ch, g, body, mode: 'loose' as Mode, kin: false, home: new THREE.Vector3(it.x, G.h / 2, it.z), t: 0, wait: 0, dur: 0.5, arc: 1, rest: 0, fp: new THREE.Vector3(), fq: new THREE.Quaternion(), hx: G.w / 2 };
    });
    const fixed = world.createRigidBody(R.RigidBodyDesc.fixed());
    const wall = (hx: number, hy: number, hz: number, x: number, y: number, z: number) => world.createCollider(R.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z).setFriction(0.7), fixed);
    const cx = L.W / 2 + 1.6, zb = L.back - 1, zf = z1 + 1.2;
    wall(40, 1, 40, 0, -1, 0); wall(0.3, 6, 20, -cx, 6, 0); wall(0.3, 6, 20, cx, 6, 0); wall(20, 6, 0.3, 0, 6, zb); wall(20, 6, 0.3, 0, 6, zf);
    st.mask = list.map(() => !empty); st.dirty = true;
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, R, L]);

  useEffect(() => { world.timestep = STEP; world.gravity = { x: 0, y: -18, z: 0 }; }, [world]);
  useEffect(() => () => { mats.lead.dispose(); mats.ink.dispose(); mats.nick.dispose(); }, [mats]);

  const setKin = (a: Actor) => { if (!a.kin) { a.body.setBodyType(R.RigidBodyType.KinematicPositionBased, true); a.kin = true; } };
  const setDyn = (a: Actor) => { if (a.kin) { a.body.setBodyType(R.RigidBodyType.Dynamic, true); a.kin = false; } };
  const mark = (a: Actor, on: boolean) => { if (st.mask[a.i] !== on) { st.mask[a.i] = on; st.dirty = true; } };
  const fly = (a: Actor, wait = 0, dur = 0.48) => {
    setKin(a);
    const t = a.body.translation(), r = a.body.rotation();
    a.fp.set(t.x, t.y, t.z); a.fq.set(r.x, r.y, r.z, r.w);
    a.mode = 'fly'; a.t = 0; a.wait = wait; a.dur = dur; a.arc = 0.7 + Math.min(1.2, a.fp.distanceTo(a.home) * 0.25);
  };
  const knock = (a: Actor) => {
    setDyn(a); a.mode = 'loose'; a.rest = 0; mark(a, false);
    a.body.applyImpulse({ x: (rnd() - 0.5) * 6, y: 9, z: 6 + rnd() * 3 }, true);
    a.body.applyTorqueImpulse({ x: 2 + rnd() * 2, y: (rnd() - 0.5) * 2, z: (rnd() - 0.5) * 3 }, true);
  };

  // A reset from the page: everything not in the line goes home.
  useEffect(() => {
    if (reset === st.lastReset) return;
    st.lastReset = reset;
    let k = 0;
    for (const a of actors) if (a.mode === 'loose' || a.mode === 'held') { if (st.held === a) st.held = null; fly(a, k++ * 0.08); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset]);

  useEffect(() => {
    if (!import.meta.env.DEV || !empty) return;
    (window as unknown as { __sorts: unknown }).__sorts = (i: number) => {
      const r = gl.domElement.getBoundingClientRect(), v = actors[i].g.position.clone().setY(actors[i].g.position.y + 0.3).project(camera);
      return [r.left + ((v.x + 1) / 2) * r.width, r.top + ((1 - v.y) / 2) * r.height];
    };
  }, [actors, camera, gl, empty]);

  // A printed letter was pressed: its sort jumps out of the stick, or a loose one goes home.
  useEffect(() => {
    if (!poke || !st.started) return;
    const a = actors[poke.i];
    if (!a) return;
    if (a.mode === 'set') knock(a); else if (a.mode === 'loose') fly(a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poke]);

  /* the pointer */
  useEffect(() => {
    const el = gl.domElement;
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.25);
    const meshes = () => root.children.flatMap((g) => g.children);
    const at = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
    };
    const pick = (e: PointerEvent) => { at(e); const h = ray.intersectObjects(meshes(), false)[0]; return h ? actors[h.object.userData.i as number] : null; };
    let down: { a: Actor; x: number; y: number; touch: boolean; t: number } | null = null;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const a = pick(e);
      if (!a || a.mode === 'fly') return;
      down = { a, x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch', t: performance.now() };
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (e.pointerType !== 'touch') { st.sway.tx = (e.clientX - r.left) / r.width - 0.5; st.sway.ty = (e.clientY - r.top) / r.height - 0.5; }
      if (down && !down.touch && !st.held && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) {
        const a = down.a; st.held = a; a.mode = 'held'; setKin(a); mark(a, false); st.hv.set(0, 0, 0);
        el.style.cursor = 'grabbing';
      }
      if (st.held) { at(e); ray.ray.intersectPlane(plane, st.target); }
      else if (e.pointerType !== 'touch' && e.target === el) el.style.cursor = pick(e) ? 'grab' : '';
    };
    const onUp = (e: PointerEvent) => {
      const d = down; down = null;
      if (st.held) {
        const a = st.held; st.held = null; setDyn(a); a.mode = 'loose'; a.rest = 0;
        const v = st.hv.clampLength(0, 7);
        a.body.setLinvel({ x: v.x, y: Math.max(v.y, 0), z: v.z }, true);
        a.body.setAngvel({ x: (rnd() - 0.5) * 8, y: (rnd() - 0.5) * 4, z: (rnd() - 0.5) * 8 }, true);
        el.style.cursor = 'grab';
        return;
      }
      if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 10 && performance.now() - d.t < 700) {
        if (d.a.mode === 'set') knock(d.a); else if (d.a.mode === 'loose') fly(d.a);
      }
    };
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => { el.removeEventListener('pointerdown', onDown); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, camera, actors]);

  /* the camera: a long lens, high over the stick, a touch off axis */
  const tgt = useMemo(() => new THREE.Vector3(), []);
  const frame = useMemo(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const el = (56 * Math.PI) / 180, az = ((-9 + spin) * Math.PI) / 180;
    const vf = (cam.fov * Math.PI) / 180, aspect = size.width / Math.max(1, size.height);
    const hf = 2 * Math.atan(Math.tan(vf / 2) * aspect);
    const depth = L.scatter[1] - L.back + 0.4;
    const dW = (L.W * 1.1 + 0.9) / 2 / Math.tan(hf / 2);
    const dH = ((depth * Math.sin(el) + HIGH * Math.cos(el)) / 2) / Math.tan(vf / 2);
    const d = Math.max(dW, dH) * 0.92;
    const t = new THREE.Vector3(0, 0.35, (L.back + L.scatter[1]) / 2 + 0.1);
    return { t, d, el, az };
  }, [camera, size.width, size.height, L, spin]);

  const tq = useMemo(() => new THREE.Quaternion(), []), tv = useMemo(() => new THREE.Vector3(), []);
  const control = (dt: number) => {
    for (const a of actors) {
      if (a.mode === 'fly') {
        a.t += dt;
        const e = clamp((a.t - a.wait) / a.dur);
        if (a.t < a.wait) continue;
        const k = smooth(e);
        tv.lerpVectors(a.fp, a.home, k); tv.y += a.arc * Math.sin(Math.PI * e);
        // Lands with a small settle: a dip and back, the click into the stick.
        if (e >= 1) { const s = a.t - a.wait - a.dur; tv.y = a.home.y - 0.035 * Math.exp(-16 * s) * Math.abs(Math.sin(30 * s)); }
        tq.copy(a.fq).slerp(new THREE.Quaternion(), Math.min(1, e * 1.35));
        a.body.setNextKinematicTranslation(tv); a.body.setNextKinematicRotation(tq);
        if (e >= 1) mark(a, true);
        if (a.t - a.wait > a.dur + 0.28) { a.mode = 'set'; a.body.setNextKinematicTranslation(a.home); }
      } else if (a.mode === 'held') {
        tv.copy(a.body.translation() as THREE.Vector3);
        const nx = damp(tv.x, st.target.x, 14, dt), nz = damp(tv.z, st.target.z, 14, dt), ny = damp(tv.y, 1.25, 10, dt);
        st.hv.set((nx - tv.x) / dt, (ny - tv.y) / dt, (nz - tv.z) / dt);
        tq.setFromEuler(new THREE.Euler(clamp(st.hv.z * 0.05, -0.5, 0.5), 0, clamp(-st.hv.x * 0.05, -0.5, 0.5)));
        a.body.setNextKinematicTranslation({ x: nx, y: ny, z: nz }); a.body.setNextKinematicRotation(tq);
      } else if (a.mode === 'loose') {
        const lv = a.body.linvel(), av = a.body.angvel(), p = a.body.translation();
        if (Math.hypot(lv.x, lv.y, lv.z) < 0.25 && Math.hypot(av.x, av.y, av.z) < 0.5) a.rest += dt; else a.rest = 0;
        if (!st.started) continue;
        const near = Math.hypot(p.x - a.home.x, p.z - a.home.z) < 0.95;
        if (p.y < -1 || (a.rest > 0.3 && near) || a.rest > 3.5) fly(a);
      }
    }
  };

  useFrame((_, dtRaw) => {
    if (go && !st.started) {
      st.started = true;
      actors.forEach((a, i) => fly(a, 0.15 + i * 0.13, 0.46));
    }
    st.acc += Math.min(dtRaw, 0.1);
    let n = 0;
    while (st.acc >= STEP && n < 6) { control(STEP); world.step(); st.acc -= STEP; n++; }
    if (n === 6) st.acc = 0;
    for (const a of actors) { const t = a.body.translation(), r = a.body.rotation(); a.g.position.set(t.x, t.y, t.z); a.g.quaternion.set(r.x, r.y, r.z, r.w); }
    if (st.dirty) { st.dirty = false; onMask([...st.mask]); }
    const s = st.sway; s.x = damp(s.x, s.tx, 2.5, dtRaw); s.y = damp(s.y, s.ty, 2.5, dtRaw);
    const az = frame.az + s.x * 0.06, el = frame.el - s.y * 0.035;
    camera.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(frame.d).add(frame.t);
    tgt.copy(frame.t); camera.lookAt(tgt);
  });

  return <primitive object={root} />;
}

class Guard extends Component<{ onFail?: () => void; children: ReactNode }, { bad: boolean }> {
  state = { bad: false };
  static getDerivedStateFromError() { return { bad: true }; }
  componentDidCatch() { this.props.onFail?.(); }
  render() { return this.state.bad ? null : this.props.children; }
}

export default function Case(props: Props) {
  return (
    <Guard onFail={props.onFail}>
      <Canvas
        frameloop={props.active === false ? 'never' : 'always'}
        shadows={{ type: THREE.PCFShadowMap }} dpr={[1, 1.6]} camera={{ fov: 19, near: 0.1, far: 200, position: [0, 8, 10] }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1.05; gl.setClearColor(0x000000, 0); gl.domElement.addEventListener('webglcontextlost', () => props.onFail?.()); }}
        style={{ touchAction: 'pan-y' }}
      >
        <hemisphereLight args={['#ffffff', '#cfc8bb', 0.75]} />
        <directionalLight
          position={[-4.5, 9, 3.5]} intensity={2.6} color="#fff8ee" castShadow
          shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.02} shadow-radius={5}
          shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-camera-near={1} shadow-camera-far={30}
        />
        <directionalLight position={[6, 4, -8]} intensity={1.8} color="#e6ecff" />
        <Environment resolution={256} frames={1}>
          <color attach="background" args={['#45423d']} />
          <Lightformer form="rect" intensity={4.2} color="#fffaf0" position={[-3, 8, 3]} rotation-x={Math.PI / 2} scale={[12, 6, 1]} />
          <Lightformer form="rect" intensity={2.2} color="#ffffff" position={[8, 3, 2]} rotation-y={-Math.PI / 2} scale={[2, 8, 1]} />
          <Lightformer form="rect" intensity={1.6} color="#eef2ff" position={[-8, 3, -3]} rotation-y={Math.PI / 2} scale={[2, 8, 1]} />
          <Lightformer form="rect" intensity={1.2} color="#fff6ea" position={[0, 3, 10]} rotation-y={Math.PI} scale={[16, 4, 1]} />
        </Environment>
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[60, 60]} />
          <shadowMaterial transparent opacity={0.2} color="#2b2116" />
        </mesh>
        <ContactShadows position={[0, 0.002, 0.6]} scale={[16, 10]} resolution={512} blur={2.4} far={1.4} opacity={0.5} color="#231b12" />
        <Suspense fallback={null}>
          <Physics paused>
            <Sorts poke={props.poke} lines={props.lines} go={props.go} reset={props.reset} onMask={props.onMask} spin={props.spin} empty={props.empty} />
          </Physics>
        </Suspense>
      </Canvas>
    </Guard>
  );
}
