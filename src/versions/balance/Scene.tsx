// The photograph: a matte white ceramic balance on one slim black pivot, on a
// cool grey sweep, long lens, soft key from the upper left and a cool rim.
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, RoundedBox, Text } from '@react-three/drei';
import { createNoise3D } from 'simplex-noise';
import fontUrl from '@fontsource/bodoni-moda/files/bodoni-moda-latin-500-normal.woff?url';
import { HANG, L, PAN_R, PY, drop, endOf, sim, step, tap, toFloor, useB, type Sec, type Stone } from './sim';
import { isPhone } from '@/lib/utils';

const BG = '#dfe3e2';

// Camera framing per section: a slow walk around the balance as the page goes by.
const YAW: Record<Sec, number> = { open: -0.16, about: -0.05, debate: 0.12, research: -0.1, work: 0.06, github: -0.04, today: 0.1, now: -0.12, record: 0.04, off: -0.08, contact: -0.16 };
const LIFT: Record<Sec, number> = { open: 0.0, about: 0.25, debate: 0.15, research: 0.4, work: 0.1, github: 0.5, today: 0.3, now: 0.2, record: 0.35, off: 0.15, contact: 0.0 };

function sweepGeo() {
  // profile in (z, y): floor, a quarter round, then the wall
  const prof: [number, number][] = [];
  for (let i = 0; i <= 6; i++) prof.push([16 - i * 3, 0]);
  for (let i = 1; i <= 16; i++) { const a = (i / 16) * Math.PI / 2; prof.push([-2 - 6 * Math.sin(a), 6 - 6 * Math.cos(a)]); }
  prof.push([-8, 24]);
  const W = 60, xs = 2;
  const pos: number[] = [], idx: number[] = [];
  prof.forEach(([z, y]) => { for (let j = 0; j < xs; j++) pos.push(-W / 2 + (j * W) / (xs - 1), y, z); });
  for (let i = 0; i < prof.length - 1; i++) { const a = i * xs, b = (i + 1) * xs; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const noise = createNoise3D(() => 0.37);
const stoneGeos = [0, 1, 2, 3, 4].map((seed) => {
  const g = new THREE.SphereGeometry(1, 48, 32);
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = 1 + 0.045 * noise(v.x * 1.3 + seed * 3, v.y * 1.3, v.z * 1.3) + 0.05 * Math.cos(v.x * 1.6 + seed);
    v.multiplyScalar(n);
    p.setXYZ(i, v.x * (1 + seed * 0.03), v.y * 0.58, v.z * 0.74);
  }
  g.computeVertexNormals();
  return g;
});

function dishGeo() {
  const pts = [
    new THREE.Vector2(0, 0), new THREE.Vector2(PAN_R * 0.75, 0), new THREE.Vector2(PAN_R * 0.95, 0.03),
    new THREE.Vector2(PAN_R, 0.1), new THREE.Vector2(PAN_R + 0.02, 0.13), new THREE.Vector2(PAN_R - 0.015, 0.135),
    new THREE.Vector2(PAN_R * 0.93, 0.07), new THREE.Vector2(PAN_R * 0.72, 0.045), new THREE.Vector2(0, 0.045),
  ];
  return new THREE.LatheGeometry(pts, 96);
}

const TONES = {
  white: { color: '#f1f1ee', ink: '#5d6567', rough: 0.5 },
  black: { color: '#1d2022', ink: '#a9b1b2', rough: 0.42 },
  green: { color: '#1d6b47', ink: '#e4efe8', rough: 0.4 },
};

function StoneMesh({ st, phone }: { st: Stone; phone: boolean }) {
  const g = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  const { camera, size } = useThree();
  const t = TONES[st.tone];
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.4), []);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const canMove = st.kind === 'free';

  useFrame((_, dt) => {
    if (!g.current) return;
    g.current.position.set(st.p[0], st.p[1], st.p[2]);
    const s = st.r * (st.vis < 1 ? 1 - Math.pow(1 - st.vis, 3) : 1) * (hover && canMove ? 1.05 : 1);
    g.current.scale.setScalar(Math.max(0.0001, s));
    g.current.visible = st.vis > 0.01;
    const tilt = st.place === 'L' || st.place === 'R' ? 0 : st.landed ? 0 : st.v[1] * 0.02;
    g.current.rotation.z = THREE.MathUtils.damp(g.current.rotation.z, (st.seed - 2) * 0.06 + tilt, 8, dt);
  });

  const down = (e: ThreeEvent<PointerEvent>) => {
    if (!canMove) return;
    e.stopPropagation();
    if (e.pointerType === 'touch') { drag.current = { x: e.clientX, y: e.clientY, moved: false }; return; }
    (e.target as Element)?.setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, moved: false };
  };
  const move = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current;
    if (!d || e.pointerType === 'touch' || sim.hold) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) { d.moved = true; st.held = true; }
    if (!d.moved) return;
    const rect = (e.nativeEvent.target as HTMLElement).getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / size.width) * 2 - 1, -((e.clientY - rect.top) / size.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(plane, hit)) { st.p[0] = THREE.MathUtils.clamp(hit.x, -3.4, 3.4); st.p[1] = THREE.MathUtils.clamp(hit.y, 0.2, 5); st.p[2] = 0.4; }
  };
  const up = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    e.stopPropagation();
    if (!d.moved) { tap(st.id); return; }
    st.held = false;
    const [lx] = endOf('L'), [rx] = endOf('R');
    const near = Math.abs(st.p[0] - lx) < Math.abs(st.p[0] - rx) ? 'L' : 'R';
    const px = near === 'L' ? lx : rx;
    if (Math.abs(st.p[0] - px) < 1.1 && st.p[1] > 0.9) drop(st, near);
    else toFloor(st);
  };

  const fs = Math.min(0.62, 2.5 / Math.max(2, st.word.length)) * (phone ? 1.08 : 1);
  return (
    <group ref={g}>
      <mesh
        geometry={stoneGeos[st.seed]} castShadow
        onPointerDown={down} onPointerMove={move} onPointerUp={up}
        onPointerOver={() => { if (canMove) { setHover(true); document.body.style.cursor = 'grab'; } }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = ''; }}
      >
        <meshPhysicalMaterial color={t.color} roughness={t.rough} clearcoat={0.35} clearcoatRoughness={0.35} />
      </mesh>
      {st.word && (
        <Text font={fontUrl} position={[0, 0.02, 0.8]} fontSize={fs} letterSpacing={0.02} anchorX="center" anchorY="middle" color={t.ink} maxWidth={1.7} textAlign="center" lineHeight={0.95}>
          {st.word}
        </Text>
      )}
    </group>
  );
}

const ceramic = <meshPhysicalMaterial color="#f3f3f0" roughness={0.42} clearcoat={0.5} clearcoatRoughness={0.28} />;
const ink = <meshStandardMaterial color="#141718" roughness={0.35} metalness={0.4} />;

function Pan({ side }: { side: 'L' | 'R' }) {
  const g = useRef<THREE.Group>(null);
  const dish = useMemo(dishGeo, []);
  useFrame(() => {
    const [x, y] = endOf(side);
    g.current?.position.set(x, y, 0);
    // the pan swings a little against the beam's motion
    if (g.current) g.current.rotation.z = THREE.MathUtils.clamp(-sim.omega * 0.035, -0.06, 0.06);
  });
  return (
    <group ref={g}>
      {/* one slim rod leans back from the beam end to the back of the rim */}
      <mesh position={[0, -HANG / 2 + 0.07, -PAN_R * 0.45]} rotation-x={Math.atan2(PAN_R * 0.9, HANG - 0.14)} castShadow>
        <cylinderGeometry args={[0.02, 0.02, Math.hypot(PAN_R * 0.9, HANG - 0.14), 16]} />{ink}
      </mesh>
      <mesh position={[0, 0, 0]}><sphereGeometry args={[0.065, 24, 16]} />{ink}</mesh>
      <mesh geometry={dish} position={[0, -HANG + 0.02, 0]} castShadow receiveShadow>{ceramic}</mesh>
    </group>
  );
}

// a soft dark pool on the sweep under each pan, tighter and darker as the pan comes down
const blob = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(30,36,38,0.55)'); g.addColorStop(0.45, 'rgba(30,36,38,0.22)'); g.addColorStop(1, 'rgba(30,36,38,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();
function PanShadow({ side }: { side: 'L' | 'R' }) {
  const m = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const [x, y] = endOf(side);
    const h = y - HANG;
    if (!m.current) return;
    m.current.position.set(x + 0.25, 0.006, 0.15);
    m.current.scale.setScalar(1.9 + h * 0.35);
    (m.current.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.clamp(1.25 - h * 0.35, 0.3, 1);
  });
  return (
    <mesh ref={m} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[1, 0.62]} />
      <meshBasicMaterial map={blob} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function Beam() {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    // fixed substeps, so a slow frame still moves the world at the right speed
    const d = Math.min(dt, 0.25), n = Math.ceil(d / (1 / 60));
    for (let i = 0; i < n; i++) step(d / n);
    if (g.current) g.current.rotation.z = sim.theta;
  });
  return (
    <group ref={g} position={[0, PY, 0]}>
      <RoundedBox args={[L * 2 + 0.2, 0.2, 0.26]} radius={0.08} smoothness={5} castShadow>{ceramic}</RoundedBox>
      <mesh position={[0, 0, 0.135]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.06, 0.06, 0.03, 32]} />{ink}</mesh>
    </group>
  );
}

function Stand() {
  return (
    <group>
      <mesh position={[0, PY / 2, -0.02]} castShadow><cylinderGeometry args={[0.04, 0.05, PY, 24]} />{ink}</mesh>
      <mesh position={[0, PY + 0.02, -0.02]} rotation-z={Math.PI / 4}><boxGeometry args={[0.13, 0.13, 0.16]} />{ink}</mesh>
      <mesh position={[0, 0.025, -0.02]} castShadow receiveShadow><cylinderGeometry args={[0.5, 0.54, 0.05, 64]} />{ink}</mesh>
    </group>
  );
}

function Stones({ phone }: { phone: boolean }) {
  useB((s) => s.ver);
  return <>{sim.stones.map((s) => <StoneMesh key={s.id} st={s} phone={phone} />)}</>;
}

function Rig({ phone }: { phone: boolean }) {
  const { camera, size } = useThree();
  const cur = useRef({ yaw: YAW.open, lift: 0 });
  useFrame((_, dt) => {
    const sec = useB.getState().sec;
    const c = cur.current;
    c.yaw = THREE.MathUtils.damp(c.yaw, YAW[sec], 1.6, dt);
    c.lift = THREE.MathUtils.damp(c.lift, LIFT[sec], 1.6, dt);
    const cam = camera as THREE.PerspectiveCamera;
    const v = (cam.fov * Math.PI) / 180;
    const aspect = size.width / size.height;
    const needW = phone ? 6.3 : 6.0, needH = phone ? 4.5 : 4.7;
    const dist = Math.max(needH / (2 * Math.tan(v / 2)), needW / (2 * Math.tan(v / 2) * aspect));
    const look = new THREE.Vector3(0, phone ? 1.95 : 1.9, 0.3);
    const h = 1.1 + c.lift;
    cam.position.set(Math.sin(c.yaw) * dist, look.y + h, Math.cos(c.yaw) * dist);
    cam.lookAt(look);
  });
  return null;
}

export default function Scene() {
  const sweep = useMemo(sweepGeo, []);
  const phone = isPhone();
  return (
    <Canvas
      dpr={phone ? [1, 1.4] : [1, 1.6]}
      camera={{ fov: 18, near: 1, far: 120, position: [0, 4, 24] }}
      gl={{ antialias: true }}
      shadows={{ type: THREE.PCFShadowMap }}
      style={{ touchAction: 'pan-y' }}
      aria-hidden="true"
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 30, 70]} />
      <Rig phone={phone} />
      <ambientLight intensity={0.16} />
      <directionalLight
        position={[-6, 9, 6]} intensity={2.4} color="#fffaf2" castShadow
        shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.02} shadow-radius={6}
        shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-3} shadow-camera-near={2} shadow-camera-far={30}
      />
      <directionalLight position={[6, 5, -6]} intensity={1.1} color="#e8f0ff" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} color="#ffffff" position={[-5, 8, 4]} rotation-x={Math.PI / 2} scale={[12, 5, 1]} />
        <Lightformer form="rect" intensity={2.2} color="#f2f6ff" position={[9, 3, -2]} rotation-y={-Math.PI / 2} scale={[3, 8, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ffffff" position={[0, 3, 14]} rotation-y={Math.PI} scale={[20, 4, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#dfe3e2" position={[0, -2, 0]} rotation-x={-Math.PI / 2} scale={[50, 50, 1]} />
      </Environment>
      <mesh geometry={sweep} receiveShadow>
        <meshStandardMaterial color="#dce1e0" roughness={1} />
      </mesh>
      <ContactShadows position={[0, 0.003, 0]} scale={12} resolution={phone ? 384 : 768} far={3.4} blur={2.2} opacity={0.72} color="#2b3133" />
      <Stand />
      <Beam />
      <Pan side="L" />
      <Pan side="R" />
      <PanShadow side="L" />
      <PanShadow side="R" />
      <Stones phone={phone} />
    </Canvas>
  );
}
