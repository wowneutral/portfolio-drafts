// Remixed from pmndrs/examples "stage-presets-gltfjsx" (MIT): one object presented with <Center top>
// on AccumulativeShadows + RandomizedLight under a long lens. Cars swapped for his things on a plinth.
import { memo, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { AccumulativeShadows, Center, Environment, Lightformer, RandomizedLight, RoundedBox, useGLTF, useTexture } from '@react-three/drei';
import { WORK, AWARDS, RESEARCH } from '@/content';
import { NAMES, stage, type Ex } from './store';

const BASE = import.meta.env.BASE_URL;
const PW = 1.5, PD = 1.5, TOP = 1.6, SINK = 1.5, ACC = 40;
const SANS = '"Instrument Sans Variable", "Instrument Sans", sans-serif';
const SERIF = '"Bodoni Moda Variable", "Bodoni Moda", serif';
const INK = '#1a1917';
const URL: Partial<Record<Ex, string>> = {
  apple: BASE + 'plinth/apple.glb', watch: BASE + 'plinth/watch.glb', tea: BASE + 'plinth/teacup.glb', sphere: BASE + 'plinth/armillary.glb',
};
const WORK_IMG = WORK.map((w) => BASE + w.img);
const CERT_IMG = AWARDS.map((a) => BASE + a.img);

const topClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TOP);
const floorClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const busy = { until: 0 };
const wake = (ms = 1200) => { busy.until = Math.max(busy.until, performance.now() + ms); };

function clipAll(root: THREE.Object3D, fix?: (m: THREE.Mesh, mat: THREE.MeshStandardMaterial) => THREE.Material | void) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = true; m.receiveShadow = true;
    const old = m.material as THREE.MeshStandardMaterial;
    const mat = ((fix && fix(m, old)) || old.clone()) as THREE.Material;
    mat.clippingPlanes = [topClip]; mat.clipShadows = true;
    m.material = mat;
  });
}

/** A loaded scan, materials cloned and clipped at the plinth top, scaled to a measured size. */
function useScan(url: string, size: number, axis: 'y' | 'x', fix?: Parameters<typeof clipAll>[1]) {
  const { scene } = useGLTF(url) as unknown as { scene: THREE.Group };
  return useMemo(() => {
    const root = scene.clone(true);
    clipAll(root, fix);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const ext = axis === 'y' ? box.max.y - box.min.y : box.max.x - box.min.x;
    root.scale.setScalar(size / Math.max(1e-4, ext));
    return root;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, size, axis]);
}

function Ready({ id, onReady }: { id: Ex; onReady: (id: Ex) => void }) {
  useLayoutEffect(() => { onReady(id); }, [id, onReady]);
  return null;
}

function Apple() {
  const g = useScan(URL.apple!, 0.56, 'y', (_m, mat) => { const c = mat.clone(); c.envMapIntensity = 0.9; return c; });
  return <Center top><primitive object={g} rotation={[0, 0.5, 0]} /></Center>;
}

function Watch({ phone }: { phone: boolean }) {
  const g = useScan(URL.watch!, 0.92, 'x', (m, mat) => {
    const n = mat.name;
    if (n === 'Backplate Khronos' || n === 'Clasp DGG') return new THREE.MeshStandardMaterial({ color: '#c3c2c6', metalness: 1, roughness: 0.32 });
    if (n === 'Watch Face') {
      const tex = new THREE.TextureLoader().load(BASE + 'plinth/face.webp', () => wake());
      tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.channel = mat.map?.channel ?? 0;
      const c = mat.clone(); c.map = tex; return c;
    }
    if (n === 'Glass Face') { m.castShadow = false; return new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.04, transparent: true, opacity: phone ? 0.1 : 0.16, clearcoat: 1, depthWrite: false }); }
    if (n === 'Bezel Frame Gold') return new THREE.MeshPhysicalMaterial({ color: '#f4f2ee', roughness: 0.36, clearcoat: 0.55, clearcoatRoughness: 0.22, aoMap: mat.aoMap });
    if (n === 'Band Carbon Fiber Gold') { const c = mat.clone(); c.color.setRGB(0.87, 0.87, 0.87); c.metalness = 0; c.roughness = 0.42; return c; }
    if (n === 'Band Plastic Gold') return new THREE.MeshStandardMaterial({ color: '#e9e7e2', roughness: 0.5 });
    if (n === 'Hand Color Gold' || n === 'Hand Color') return new THREE.MeshStandardMaterial({ color: '#b2382a', roughness: 0.35 });
  });
  return <Center top><group rotation={[0.5, -0.5, 0]}><primitive object={g} /></group></Center>;
}

function Tea({ phone }: { phone: boolean }) {
  const g = useScan(URL.tea!, 1.05, 'x', (_m, old) => new THREE.MeshPhysicalMaterial({
    color: '#fbf8f2', roughness: 0.24, clearcoat: 0.8, clearcoatRoughness: 0.1, normalMap: old.normalMap, aoMap: old.aoMap,
    transmission: phone ? 0 : 0.18, thickness: 0.3, attenuationColor: new THREE.Color('#f0c48c'), attenuationDistance: 0.6, ior: 1.5,
  }));
  return <Center top><primitive object={g} rotation={[0, 0.7, 0]} /></Center>;
}

function Sphere({ phone }: { phone: boolean }) {
  const g = useScan(URL.sphere!, 1.2, 'y', (_m, mat) => {
    if (mat.name === 'glass' && phone) return new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.05, transparent: true, opacity: 0.2, depthWrite: false });
  });
  return <Center top><primitive object={g} rotation={[0, -0.4, 0]} /></Center>;
}

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, lh: number, max: number) {
  const words = text.split(' '); let line = '', n = 0;
  for (const word of words) {
    const t = line ? line + ' ' + word : word;
    if (g.measureText(t).width > w && line) { g.fillText(line, x, y + n * lh); n++; line = word; if (n >= max) return; } else line = t;
  }
  if (line && n < max) g.fillText(line, x, y + n * lh);
}

const paperMat = (color = '#f7f5ef') => new THREE.MeshStandardMaterial({ color, roughness: 0.92, clippingPlanes: [topClip], clipShadows: true });

/** His paper: fifteen sheets standing as one bound stack, leaning back, the title on the cover. */
function Paper() {
  const p = RESEARCH[0];
  const pages = p.pages ?? 15;
  const parts = useMemo(() => {
    const cover = canvasTex(800, 1100, (g) => {
      g.fillStyle = '#f8f6f0'; g.fillRect(0, 0, 800, 1100);
      g.fillStyle = '#b2382a'; g.fillRect(96, 120, 54, 7);
      g.font = `600 30px ${SANS}`; g.fillStyle = '#3d3a34';
      g.fillText('ARMAAN SETH', 96, 186);
      g.fillStyle = INK; g.font = `italic 600 82px ${SERIF}`;
      wrap(g, p.short, 96, 330, 640, 92, 4);
      g.fillStyle = '#4a463f'; g.font = `400 28px ${SANS}`;
      wrap(g, (p.keywords ?? []).join(', '), 96, 720, 600, 40, 4);
      g.font = `600 28px ${SANS}`; g.fillText(p.status.toUpperCase(), 96, 1000);
    });
    const face = new THREE.MeshStandardMaterial({ map: cover, roughness: 0.86, clippingPlanes: [topClip], clipShadows: true });
    return { face, sheet: paperMat('#f4f2ec'), tape: paperMat('#26241f') };
  }, [p]);
  useEffect(() => () => { parts.face.map?.dispose(); parts.face.dispose(); parts.sheet.dispose(); parts.tape.dispose(); }, [parts]);
  const W = 0.86, H = 1.18, T = 0.0075, LEAN = -0.13;
  const jit = (i: number, k: number) => Math.sin(i * 12.9898 + k * 78.233) * 0.5;
  return (
    <group rotation={[0, -0.22, 0]} position={[0, 0, 0.12]}>
      <group rotation={[LEAN, 0, 0]}>
        {Array.from({ length: pages }, (_, i) => (
          <mesh key={i} position={[jit(i, 1) * 0.008, H / 2 + Math.abs(jit(i, 2)) * 0.006, -i * T]} rotation={[0, 0, jit(i, 3) * 0.006]}
            material={i === 0 ? [parts.sheet, parts.sheet, parts.sheet, parts.sheet, parts.face, parts.sheet] : parts.sheet} castShadow receiveShadow>
            <boxGeometry args={[W, H, T]} />
          </mesh>
        ))}
        <mesh position={[-W / 2 + 0.035, H / 2, (-(pages - 1) * T) / 2]} material={parts.tape} castShadow>
          <boxGeometry args={[0.08, H + 0.004, pages * T + 0.006]} />
        </mesh>
      </group>
    </group>
  );
}

/** Paper slips, one per recent commit, standing in a file; each pokes up behind the last so its repo shows. */
function Slips({ slips }: { slips: { repo: string; text: string }[] }) {
  const list = slips.slice(0, 6);
  const key = list.map((s) => s.repo + s.text).join('|');
  const mats = useMemo(() => list.map((s, i) => {
    const t = canvasTex(1024, 420, (g) => {
      g.fillStyle = i % 2 ? '#f6f4ee' : '#fbfaf6'; g.fillRect(0, 0, 1024, 420);
      g.fillStyle = i === 0 ? '#b2382a' : '#8c877d'; g.beginPath(); g.arc(62, 58, 10, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#3d3a34'; g.font = `600 36px ${SANS}`; g.fillText(s.repo.toUpperCase(), 90, 71);
      g.fillStyle = INK; g.font = `500 60px ${SANS}`; wrap(g, s.text, 54, 170, 920, 72, 3);
    });
    const face = new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, clippingPlanes: [topClip], clipShadows: true });
    const edge = paperMat('#efede6');
    return [edge, edge, edge, edge, face, edge];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [key]);
  useEffect(() => () => mats.forEach((m) => { (m[4] as THREE.MeshStandardMaterial).map?.dispose(); m[4].dispose(); m[0].dispose(); }), [mats]);
  const W = 1.3, H = (W * 420) / 1024, T = 0.006;
  return (
    <group rotation={[0, -0.16, 0]} position={[0, 0, 0.18]}>
      {list.map((_, i) => (
        <group key={i} position={[Math.sin(i * 7.7) * 0.025, 0, -i * 0.07]} rotation={[-0.14, Math.sin(i * 3.1 + 1) * 0.05, 0]}>
          <mesh position={[0, H / 2 + i * 0.085, 0]} material={mats[i]} castShadow receiveShadow>
            <boxGeometry args={[W, H, T]} />
          </mesh>
          {/* each slip stands on a short paper fold so the raised ones are carried, not floating */}
          {i > 0 && <mesh position={[0, (i * 0.085) / 2, -0.004]} material={mats[i][0]} castShadow><boxGeometry args={[W * 0.98, i * 0.085 + 0.002, T]} /></mesh>}
        </group>
      ))}
    </group>
  );
}

/** Thick prints standing in a stack; the front one lifts over the top and drops in at the back. */
function Prints({ urls, top, width, which }: { urls: string[]; top: number; width: number; which: 'prints' | 'certs' }) {
  const maps = useTexture(urls) as THREE.Texture[];
  const n = urls.length, GAP = 0.06, T = 0.035, LEAN = -0.09;
  const mats = useMemo(() => {
    const edge = new THREE.MeshStandardMaterial({ color: '#f4f2ec', roughness: 0.8, clippingPlanes: [topClip], clipShadows: true });
    return maps.map((m) => {
      m.colorSpace = THREE.SRGBColorSpace; m.anisotropy = 8;
      const face = new THREE.MeshStandardMaterial({ map: m, roughness: 0.55, clippingPlanes: [topClip], clipShadows: true });
      return [edge, edge, edge, edge, face, edge];
    });
  }, [maps]);
  const sizes = useMemo(() => maps.map((m) => { const img = m.image as { width: number; height: number }; return width * (img.height / img.width); }), [maps, width]);
  const maxH = Math.max(...sizes);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const st = useRef(urls.map((_, i) => ({ slot: (i - top + n) % n, z: -((i - top + n) % n) * GAP, y: 0, u: 1, from: 0, to: 0 })));
  const hover = useRef(0);
  const [over, setOver] = useState(false);
  useEffect(() => {
    st.current.forEach((s, i) => {
      const slot = (i - top + n) % n;
      if (slot > s.slot) { s.u = 0; s.from = s.z; s.to = -slot * GAP; }
      s.slot = slot;
    });
    wake(1600);
  }, [top, n]);
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.1);
    hover.current = THREE.MathUtils.damp(hover.current, over ? 1 : 0, 10, dt);
    st.current.forEach((s, i) => {
      const g = refs.current[i]; if (!g) return;
      const target = -s.slot * GAP;
      if (s.u < 1) {
        s.u = Math.min(1, s.u + dt / 0.95);
        const e = s.u < 0.5 ? 4 * s.u ** 3 : 1 - (-2 * s.u + 2) ** 3 / 2;
        s.z = THREE.MathUtils.lerp(s.from, s.to, e);
        s.y = Math.sin(Math.PI * Math.min(1, s.u * 1.08)) * (maxH * 1.08);
      } else {
        s.z = THREE.MathUtils.damp(s.z, target, 7, dt);
        s.y = THREE.MathUtils.damp(s.y, s.slot === 0 ? hover.current * 0.05 : 0, 9, dt);
      }
      g.position.set(0, Math.max(0, s.y), s.z + (n - 1) * GAP * 0.5);
    });
  });
  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); stage.onPrint?.(which); };
  return (
    <group rotation={[0, 0.06, 0]}
      onClick={click}
      onPointerOver={(e) => { e.stopPropagation(); setOver(true); document.body.style.cursor = 'pointer'; wake(); }}
      onPointerOut={() => { setOver(false); document.body.style.cursor = ''; wake(); }}>
      {urls.map((u, i) => (
        <group key={u} ref={(el) => { refs.current[i] = el; }}>
          <mesh rotation={[LEAN, 0, 0]} position={[0, sizes[i] / 2 * Math.cos(LEAN), sizes[i] / 2 * Math.sin(LEAN)]} material={mats[i]} castShadow receiveShadow>
            <boxGeometry args={[width, sizes[i], T]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function useFonts() {
  const [ok, set] = useState(false);
  useEffect(() => {
    let live = true;
    Promise.all([document.fonts.load(`600 40px ${SANS}`), document.fonts.load(`italic 500 40px ${SERIF}`)]).catch(() => {}).finally(() => { if (live) set(true); });
    return () => { live = false; };
  }, []);
  return ok;
}

/** The exhibit's name, cut into the plinth's front face. */
function Engraving({ text, fonts, mref }: { text: string; fonts: boolean; mref: React.RefObject<THREE.Mesh | null> }) {
  const mat = useMemo(() => {
    const t = canvasTex(2048, 360, (g) => {
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const size = text.length > 12 ? 132 : 168;
      g.font = `600 ${size}px ${SANS}`;
      (g as unknown as { letterSpacing: string }).letterSpacing = `${Math.round(size * 0.22)}px`;
      g.fillStyle = 'rgba(255,255,255,0.95)'; g.fillText(text, 1024 + 4, 184 + 4);
      g.fillStyle = 'rgba(60,55,45,0.55)'; g.fillText(text, 1024 - 2, 184 - 3);
      g.fillStyle = '#b9b3a7'; g.fillText(text, 1024, 184);
    });
    return new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.95, clippingPlanes: [floorClip], depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, fonts]);
  useEffect(() => () => { mat.map?.dispose(); mat.dispose(); }, [mat]);
  return (
    <mesh ref={mref} position={[0, TOP - 0.38, PD / 2 + 0.002]} material={mat}>
      <planeGeometry args={[PW * 0.94, (PW * 0.94 * 360) / 2048]} />
    </mesh>
  );
}

function Plinth() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#fbfaf6', roughness: 0.86, metalness: 0 }), []);
  const ref = useRef<THREE.Mesh>(null);
  // The plinth casts onto the floor once (accumulated at mount), then stops, so it never greys its own top.
  useEffect(() => { const t = setTimeout(() => { if (ref.current) ref.current.castShadow = false; }, 0); return () => clearTimeout(t); }, []);
  return (
    <RoundedBox ref={ref} args={[PW, TOP, PD]} radius={0.018} smoothness={4} position={[0, TOP / 2, 0]} material={mat} castShadow receiveShadow />
  );
}

type Props = { phone: boolean; work: number; cert: number; slips: { repo: string; text: string }[]; fixed?: Ex };

function Show({ phone, work, cert, slips, fixed }: Props) {
  const [shown, setShown] = useState<Ex>(fixed ?? stage.want);
  const fonts = useFonts();
  const lift = useRef<THREE.Group>(null!);
  const text = useRef<THREE.Mesh>(null);
  const acc = useRef<{ reset: () => void; count: number } | null>(null);
  const m = useRef({ cur: fixed ?? stage.want, phase: 'up' as 'idle' | 'down' | 'wait' | 'up', k: fixed ? 1 : 0, t: fixed ? 1 : 0, ready: '' as string });
  const invalidate = useThree((s) => s.invalidate);
  const onReady = useMemo(() => (id: Ex) => { m.current.ready = id; wake(); }, []);

  // Fetch the scans of the sections that are near, so a swap never waits long.
  useEffect(() => {
    const id = setInterval(() => { stage.near.forEach((e) => { const u = URL[e]; if (u) useGLTF.preload(u); }); }, 500);
    return () => clearInterval(id);
  }, []);

  // Render on demand: while something moves, while shadows accumulate, or when the visitor asked for another exhibit.
  useEffect(() => {
    let id = 0;
    const loop = () => {
      const s = m.current;
      if (performance.now() < busy.until || s.phase !== 'idle' || (!fixed && stage.want !== s.cur) || (acc.current && acc.current.count < ACC)) invalidate();
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [invalidate, fixed]);

  useFrame((_, dt) => {
    dt = Math.min(dt, 0.1);
    const s = m.current;
    if (s.phase === 'idle' && !fixed && stage.want !== s.cur) { s.phase = 'down'; s.t = 0; }
    if (s.phase === 'down') {
      s.t = Math.min(1, s.t + dt / 0.6);
      s.k = 1 - s.t * s.t * s.t;
      if (s.t >= 1) { s.k = 0; const prev = s.cur; s.cur = stage.want; if (s.cur !== prev) s.ready = ''; s.phase = 'wait'; setShown(s.cur); acc.current?.reset(); }
    } else if (s.phase === 'wait') {
      if (s.ready === s.cur) { s.phase = 'up'; s.t = 0; }
    } else if (s.phase === 'up') {
      if (s.ready === s.cur || fixed) {
        s.t = Math.min(1, s.t + dt / 0.9);
        const c1 = 1.25, c3 = c1 + 1, x = s.t - 1;
        s.k = 1 + c3 * x * x * x + c1 * x * x; // ease out back: a little settle on arrival
        if (s.t >= 1) { s.k = 1; s.phase = 'idle'; acc.current?.reset(); wake(400); }
      }
    }
    lift.current.position.y = -(1 - s.k) * SINK;
    if (text.current) text.current.position.y = TOP - 0.38 - (1 - Math.min(1, s.k)) * (TOP - 0.1);
  });

  const exhibit = (() => {
    switch (shown) {
      case 'apple': return <Apple />;
      case 'watch': return <Watch phone={phone} />;
      case 'tea': return <Tea phone={phone} />;
      case 'sphere': return <Sphere phone={phone} />;
      case 'paper': return <Paper />;
      case 'slips': return <Slips slips={slips} />;
      case 'prints': return <Prints urls={WORK_IMG} top={work} width={1.42} which="prints" />;
      case 'certs': return <Prints urls={CERT_IMG} top={cert} width={0.8} which="certs" />;
      default: return null;
    }
  })();

  return (
    <>
      <Plinth />
      <Engraving text={NAMES[shown]} fonts={fonts} mref={text} />
      <group position={[0, TOP, 0]}>
        <group ref={lift}>
          <Suspense fallback={null}>
            {exhibit}
            <Ready id={shown} onReady={onReady} />
          </Suspense>
        </group>
      </group>
      {/* Contact shadows on the plinth top: re-accumulated after every exchange. */}
      <AccumulativeShadows ref={acc as never} temporal frames={ACC} scale={PW - 0.01} position={[0, TOP + 0.002, 0]} color="#3b352c" colorBlend={1.4} opacity={0.9} alphaTest={0.6} resolution={512}>
        <RandomizedLight amount={4} radius={2.4} ambient={0.5} intensity={1.1} position={[1.6, 4.6, 3.4]} bias={0.001} size={3} mapSize={512} />
      </AccumulativeShadows>
    </>
  );
}

/** The floor: the plinth's own soft shadow, accumulated once and never again (memo: no re-render). */
const Floor = memo(function Floor() {
  return (
    <AccumulativeShadows frames={30} blend={30} temporal={false} scale={10} position={[0, 0.001, 0]} color="#5b5346" colorBlend={1.6} opacity={0.8} alphaTest={0.7} resolution={512}>
      <RandomizedLight amount={4} radius={3} ambient={0.5} intensity={1} position={[2, 5, 5]} bias={0.001} mapSize={512} />
    </AccumulativeShadows>
  );
});

function Aim() {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => { camera.lookAt(0, 1.68, 0); camera.updateProjectionMatrix(); }, [camera]);
  return null;
}

export default function Stage(props: Props) {
  const { phone } = props;
  return (
    <Canvas
      frameloop="demand" shadows={{ type: THREE.PCFShadowMap }} dpr={[1, phone ? 1.5 : 1.6]}
      camera={{ fov: phone ? 22 : 21, near: 0.5, far: 60, position: [3.4, 4.6, 9.6] }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: !!props.fixed }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1.0; gl.localClippingEnabled = true; gl.setClearColor(0x000000, 0); }}
      style={{ touchAction: 'pan-y' }}
    >
      <Aim />
      <ambientLight intensity={0.18} color="#fff8ee" />
      <directionalLight position={[4, 7, 3]} intensity={1.8} color="#fffaf2" />
      <directionalLight position={[-4, 3, -5]} intensity={0.7} color="#eef1ff" />
      <Show {...props} />
      <Floor />
      {/* Light built from Lightformers instead of a CDN preset. */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3} color="#fffaf0" position={[-5, 8, 3]} rotation-x={Math.PI / 2} scale={[14, 6, 1]} />
        <Lightformer form="rect" intensity={2} color="#fffaf0" position={[4, 8, 6]} rotation-x={Math.PI / 2} scale={[12, 3, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#fff6ea" position={[-10, 3, 6]} rotation-y={Math.PI / 2.4} scale={[2.6, 8, 1]} />
        <Lightformer form="rect" intensity={2.2} color="#eef2ff" position={[10, 3, -2]} rotation-y={-Math.PI / 2} scale={[2.6, 8, 1]} />
        <Lightformer form="rect" intensity={0.7} color="#f6f2ea" position={[6, 3, 14]} rotation-y={Math.PI} scale={[12, 5, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#efe9dc" position={[0, -2, 0]} rotation-x={-Math.PI / 2} scale={[50, 50, 1]} />
      </Environment>
    </Canvas>
  );
}
