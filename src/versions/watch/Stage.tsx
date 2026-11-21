// Remixed from pmndrs/examples "bouncy-watch" (MIT): PresentationControls with snap, the narrow spotlight with ContactShadows, the Html label on the glass.
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useGLTF, PresentationControls, Environment, Lightformer, ContactShadows } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { clamp, damp, lerp } from '@/lib/utils';
import { chrono, elapsed, fmt, film, start, toggle } from './clock';

const BASE = import.meta.env.BASE_URL;
const MODEL = BASE + 'watch/watch.glb';

type V3 = [number, number, number];
type View = { p: V3; t: V3; fov: number; flip: number; sx: number; sy: number };
// One held view per section. The watch lies face up at the origin, 12 o'clock toward -z, the crown toward +x.
const VIEWS: Record<string, View> = {
  open: { p: [0.5, 8.3, 4.9], t: [0, -0.85, 0.25], fov: 25, flip: 0, sx: 0, sy: 0.045 },
  crown: { p: [6.4, 5.2, 5.6], t: [0, -0.6, 0], fov: 24, flip: 0, sx: -0.02, sy: 0.04 },
  side: { p: [8.8, 1.2, 1.6], t: [0, -0.9, 0], fov: 23, flip: 0, sx: 0, sy: 0.04 },
  back: { p: [9.6, -1.2, 2.6], t: [0, -0.8, 0], fov: 25, flip: 0, sx: 0, sy: 0 },
  macro: { p: [0, 3.5, 1.15], t: [0, 0, 0.02], fov: 26, flip: 0, sx: 0, sy: 0 },
  corner: { p: [0.4, 19, 11], t: [0, -0.6, 0], fov: 25, flip: 0, sx: 0.34, sy: 0.3 },
  face: { p: [0, 10, 2.2], t: [0, -0.2, 0], fov: 23, flip: 0, sx: 0, sy: 0.05 },
  bezel: { p: [-6.6, 2.4, 6.2], t: [0, -0.7, 0], fov: 22, flip: 0, sx: 0, sy: 0.04 },
  band: { p: [-7.6, 2.2, 3.4], t: [0, -1.0, 0], fov: 24, flip: 0, sx: 0, sy: 0.04 },
  top: { p: [0, 12.5, 2.0], t: [0, -0.2, 0], fov: 21, flip: 0, sx: 0, sy: 0 },
  low: { p: [2.6, 3.0, 9.4], t: [0, -0.9, 0], fov: 24, flip: 0, sx: 0, sy: 0 },
};

/* The minute hand is baked into the same mesh as the hour hand (posed at 10:10). Split them about the hub by angle. */
const HUB = { x: -0.161, z: -0.295 };
const MIN_AT = (50.3 * Math.PI) / 180, HOUR_AT = (-54.9 * Math.PI) / 180;
function splitHands(node: THREE.Object3D) {
  const meshes: THREE.Mesh[] = [];
  node.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
  const hour = new THREE.Group(), minute = new THREE.Group();
  const holder = meshes[0]?.parent ?? node;
  hour.position.set(HUB.x, 0, HUB.z); minute.position.set(HUB.x, -0.16, HUB.z);
  holder.add(hour, minute);
  const axis = (a: number) => { const d = Math.abs(((a % Math.PI) + Math.PI) % Math.PI); return d; };
  const near = (a: number, b: number) => { const d = Math.abs(axis(a) - axis(b)); return Math.min(d, Math.PI - d); };
  for (const m of meshes) {
    const g = m.geometry, pos = g.attributes.position, nor = g.attributes.normal, idx = g.index;
    const tri = idx ? idx.count / 3 : pos.count / 3;
    const out = { h: { p: [] as number[], n: [] as number[] }, m: { p: [] as number[], n: [] as number[] } };
    for (let t = 0; t < tri; t++) {
      const v = [0, 1, 2].map((k) => (idx ? idx.getX(t * 3 + k) : t * 3 + k));
      let cx = 0, cz = 0;
      for (const i of v) { cx += pos.getX(i) / 3; cz += pos.getZ(i) / 3; }
      const x = cx - HUB.x, z = cz - HUB.z, r = Math.hypot(x, z), a = Math.atan2(x, z);
      const k = r < 0.18 || near(a, MIN_AT) < near(a, HOUR_AT) ? out.m : out.h;
      for (const i of v) {
        k.p.push(pos.getX(i) - HUB.x, pos.getY(i), pos.getZ(i) - HUB.z);
        if (nor) k.n.push(nor.getX(i), nor.getY(i), nor.getZ(i));
      }
    }
    for (const [key, grp] of [['h', hour], ['m', minute]] as const) {
      const d = out[key]; if (!d.p.length) continue;
      const ng = new THREE.BufferGeometry();
      ng.setAttribute('position', new THREE.Float32BufferAttribute(d.p, 3));
      if (d.n.length) ng.setAttribute('normal', new THREE.Float32BufferAttribute(d.n, 3)); else ng.computeVertexNormals();
      const mesh = new THREE.Mesh(ng, m.material); mesh.castShadow = true;
      // keep the original mesh transform relative to its holder
      mesh.position.copy(m.position); mesh.quaternion.copy(m.quaternion); mesh.scale.copy(m.scale);
      grp.add(mesh);
    }
    m.visible = false;
  }
  return { hour, minute };
}

function easeOutBack(u: number) { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); }
const wrap = (a: number) => { let d = a % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d; };

type Rig = { s: number; seconds: THREE.Object3D | null; hour: THREE.Group | null; minute: THREE.Group | null; low: number };

/** The small time label pinned beside the glass: a DOM element placed on a point of the watch every frame. */
const tag: { el: HTMLDivElement | null } = { el: null };
const ANCHOR = new THREE.Vector3(1.9, 0.06, 0.1);
const tmp = new THREE.Vector3(), upV = new THREE.Vector3(), q = new THREE.Quaternion();

function Watch({ phone, still }: { phone: boolean; still: boolean }) {
  const { scene } = useGLTF(MODEL) as unknown as { scene: THREE.Group };
  const { size } = useThree();
  const turn = useRef<THREE.Group>(null);
  const shown = useRef({ sec: 0, text: '' });
  const { camera } = useThree();

  const rig = useMemo(() => {
    // Built once per loaded scene (StrictMode runs memos twice; the split must not run twice).
    if (scene.userData.rig) return scene.userData.rig as Rig;
    const steel = new THREE.MeshStandardMaterial({ color: '#c3c2c6', metalness: 1, roughness: 0.3, name: 'steel' });
    const tex = new THREE.TextureLoader().load(BASE + 'watch/face.webp');
    tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    let bezel: THREE.Mesh | null = null, seconds: THREE.Object3D | null = null, hours: THREE.Object3D | null = null;
    scene.traverse((o) => {
      if (o.name === 'Hand_Seconds') seconds = o;
      if (o.name === 'Hand_Hours') hours = o;
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true; m.receiveShadow = true;
      const mat = m.material as THREE.MeshStandardMaterial;
      const n = mat.name;
      if (n === 'Bezel Frame Gold') {
        bezel = m;
        const w = new THREE.MeshPhysicalMaterial({ color: '#f4f2ee', roughness: 0.36, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.22, aoMap: mat.aoMap, aoMapIntensity: 1 });
        m.material = w;
      } else if (n === 'Band Carbon Fiber Gold') {
        const c = mat.clone(); c.color.setRGB(0.87, 0.87, 0.87); c.metalness = 0; c.roughness = 0.42; m.material = c;
      } else if (n === 'Hand Color Gold') {
        const c = new THREE.MeshStandardMaterial({ color: '#d23a22', roughness: 0.35, metalness: 0 }); m.material = c;
      } else if (n === 'Backplate Khronos' || n === 'Clasp DGG') {
        // Both carry third-party marks: overpainted with plain brushed steel.
        m.material = steel;
      } else if (n === 'Watch Face') {
        const c = mat.clone(); tex.channel = mat.map?.channel ?? 0; c.map = tex; m.material = c;
      } else if (n === 'Glass Face') {
        m.castShadow = false; m.receiveShadow = false;
        if (phone || still) m.material = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.04, transparent: true, opacity: 0.14, clearcoat: 1, depthWrite: false });
        else { const g = mat as THREE.MeshPhysicalMaterial; g.roughness = 0; g.thickness = 0.05; }
      }
    });
    const split = hours ? splitHands(hours) : null;
    // Normalise: the case 2 units across, the dial centre at the origin, face up.
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(bezel ?? scene);
    const s = 2 / Math.max(0.001, box.max.x - box.min.x);
    const all = new THREE.Box3().setFromObject(scene);
    const r: Rig = { s, seconds: seconds as THREE.Object3D | null, hour: split?.hour ?? null, minute: split?.minute ?? null, low: (all.min.z - 0.8) * s };
    scene.userData.rig = r;
    return r;
  }, [scene, phone, still]);

  useFrame((_, dt) => {
    dt = Math.min(dt, 0.25);
    const now = new Date(), ms = now.getMilliseconds(), s = now.getSeconds(), m = now.getMinutes(), h = now.getHours();
    // Hours and minutes keep the visitor's time; the seconds hand ticks, runs the chronograph, or rests at twelve.
    if (rig.hour) rig.hour.rotation.y = (((h % 12) + m / 60 + s / 3600) * 30 * Math.PI) / 180 - HOUR_AT;
    if (rig.minute) rig.minute.rotation.y = ((m + s / 60 + ms / 60000) * 6 * Math.PI) / 180 - MIN_AT;
    if (!still && film.id === 'debate' && !chrono.auto) { chrono.auto = true; start(); }
    const rest = film.id === 'contact';
    let target: number;
    if (rest) target = 0;
    else if (chrono.mode === 'run') target = (Math.floor((elapsed() / 1000) * 8) / 8) * 6;
    else if (chrono.mode === 'held') target = (chrono.held / 1000) * 6;
    else target = (s - 1 + (still ? 1 : easeOutBack(clamp(ms / 130)))) * 6;
    target = ((target % 360) + 360) % 360;
    const cur = shown.current.sec;
    if (still) shown.current.sec = target;
    else if (rest) { const d = (((target - cur) % 360) + 360) % 360; shown.current.sec = d < 0.05 || d > 359.95 ? target : cur + Math.min(d, d * (1 - Math.exp(-2.4 * dt)) + 12 * dt); }
    else { const d = wrap(target - cur); shown.current.sec = Math.abs(d) < 8 ? target : cur + d * (1 - Math.exp(-9 * dt)); }
    shown.current.sec = ((shown.current.sec % 360) + 360) % 360;
    if (rig.seconds) rig.seconds.rotation.y = (shown.current.sec * Math.PI) / 180;

    if (turn.current) {
      const A = VIEWS[film.a] ?? VIEWS.open, B = VIEWS[film.b] ?? VIEWS.open;
      const f = lerp(A.flip, B.flip, film.k) * Math.PI;
      turn.current.rotation.z = still ? f : damp(turn.current.rotation.z, f, 3, dt);
    }
    const el = tag.el;
    if (el && turn.current) {
      const t = chrono.mode === 'time' || film.id === 'contact' ? now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : fmt(elapsed());
      if (t !== shown.current.text) { el.textContent = t; shown.current.text = t; }
      turn.current.getWorldQuaternion(q);
      upV.set(0, 1, 0).applyQuaternion(q);
      const face = upV.dot(tmp.copy(camera.position).normalize());
      turn.current.localToWorld(tmp.copy(ANCHOR)).project(camera);
      const x = ((tmp.x + 1) / 2) * size.width, y = ((1 - tmp.y) / 2) * size.height;
      const inside = x > 24 && x < size.width - 90 && y > 24 && y < size.height - 24;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(0, -50%)`;
      el.style.opacity = String(inside && film.a !== 'macro' && film.b !== 'macro' ? clamp((face - 0.3) * 3) : 0);
    }
  });

  useEffect(() => { document.querySelector('.v-watch')?.setAttribute('data-ready', ''); }, []);

  const onPush = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    if (e.object.name.startsWith('Button')) { e.stopPropagation(); toggle(); }
  };
  const onOver = (e: ThreeEvent<PointerEvent>) => { document.body.style.cursor = e.object.name.startsWith('Button') ? 'pointer' : ''; };

  return (
    <>
      <group ref={turn}>
        <group rotation-x={-Math.PI / 2} scale={rig.s} position={[0, -0.8 * rig.s, 0]}>
          <primitive object={scene} onClick={onPush} onPointerMove={onOver} onPointerOut={() => { document.body.style.cursor = ''; }} />
        </group>
      </group>
      <ContactShadows position={[0, rig.low - 0.06, 0]} opacity={0.72} scale={11} blur={2.8} far={5} resolution={phone ? 256 : 512} color="#05070a" />
    </>
  );
}

function Film({ phone, still }: { phone: boolean; still: boolean }) {
  const { camera, size } = useThree();
  const look = useRef(new THREE.Vector3(...VIEWS.open.t));
  const off = useRef({ x: 0, y: 0 });
  const first = useRef(true);
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.25);
    const A = VIEWS[film.a] ?? VIEWS.open, B = VIEWS[film.b] ?? VIEWS.open, k = film.k;
    const pick = (v: View) => (phone && v === VIEWS.corner ? { ...VIEWS.face, p: [0, 12, 2.6] as V3, sx: 0.24, sy: 0.04 } : v);
    const a = pick(A), b = pick(B);
    const p = new THREE.Vector3(lerp(a.p[0], b.p[0], k), lerp(a.p[1], b.p[1], k), lerp(a.p[2], b.p[2], k));
    const t = new THREE.Vector3(lerp(a.t[0], b.t[0], k), lerp(a.t[1], b.t[1], k), lerp(a.t[2], b.t[2], k));
    const zoom = phone ? 1.12 : 1;
    p.sub(t).multiplyScalar(zoom).add(t);
    const fov = lerp(a.fov, b.fov, k), sx = lerp(a.sx, b.sx, k), sy = lerp(a.sy, b.sy, k);
    const cam = camera as THREE.PerspectiveCamera;
    const snap = still || first.current;
    first.current = false;
    const L = 3.2;
    cam.position.set(snap ? p.x : damp(cam.position.x, p.x, L, dt), snap ? p.y : damp(cam.position.y, p.y, L, dt), snap ? p.z : damp(cam.position.z, p.z, L, dt));
    look.current.set(snap ? t.x : damp(look.current.x, t.x, L, dt), snap ? t.y : damp(look.current.y, t.y, L, dt), snap ? t.z : damp(look.current.z, t.z, L, dt));
    cam.lookAt(look.current);
    off.current.x = snap ? sx : damp(off.current.x, sx, L, dt);
    off.current.y = snap ? sy : damp(off.current.y, sy, L, dt);
    cam.fov = snap ? fov : damp(cam.fov, fov, L, dt);
    cam.setViewOffset(size.width, size.height, -off.current.x * size.width, -off.current.y * size.height, size.width, size.height);
    cam.updateProjectionMatrix();
  });
  return null;
}

function Lights({ phone }: { phone: boolean }) {
  return (
    <>
      <ambientLight intensity={0.18} />
      <spotLight position={[10, 10, 10]} intensity={Math.PI * 1.1} decay={0} angle={0.15} penumbra={1} castShadow shadow-mapSize={phone ? 1024 : 2048} shadow-bias={-0.0004} />
      <directionalLight position={[-6, 2.5, -7]} intensity={1.1} color="#a8bcff" />
      <Environment resolution={256} frames={1}>
        {/* one softbox key, one cool rim, a low fill */}
        <Lightformer form="rect" intensity={2.4} position={[2, 7, 3]} rotation={[-Math.PI / 2.4, 0, 0]} scale={[7, 4, 1]} />
        <Lightformer form="rect" intensity={1.8} color="#b6c8ff" position={[-7, 2, -5]} rotation={[0, Math.PI / 3.2, 0]} scale={[2.2, 8, 1]} />
        <Lightformer form="rect" intensity={0.5} position={[7, 1, 1]} rotation={[0, -Math.PI / 2, 0]} scale={[3, 5, 1]} />
      </Environment>
    </>
  );
}

export default function Stage({ phone, still }: { phone: boolean; still: boolean }) {
  useEffect(() => () => { document.body.style.cursor = ''; }, []);
  return (
    <>
    <div className="w-glass" aria-hidden="true" ref={(el) => { tag.el = el; }} />
    <Canvas
      className="w-canvas"
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, phone ? 1.5 : 1.6]}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: VIEWS.open.p, fov: VIEWS.open.fov, near: 0.1, far: 60 }}
      onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); gl.toneMappingExposure = 1.05; }}
    >
      <Lights phone={phone} />
      <Film phone={phone} still={still} />
      <Suspense fallback={null}>
        <PresentationControls global snap speed={1.4} rotation={[0, 0, 0]} polar={phone ? [0, 0] : [-0.5, 0.5]} azimuth={[-Math.PI / 1.6, Math.PI / 1.6]} damping={0.3}>
          <Watch phone={phone} still={still} />
        </PresentationControls>
      </Suspense>
    </Canvas>
    </>
  );
}

useGLTF.preload(MODEL);
