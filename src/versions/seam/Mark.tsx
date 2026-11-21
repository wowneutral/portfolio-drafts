// After pmndrs/examples "landing-page" (MIT): its camera, three spotlights, slow sway and contact shadow, with the boot swapped for the Skeptical question mark.
import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import GLYPH from './mark.json';
import { mark } from './store';
import { FLOOR, HEIGHT } from './geom';

// Outline to solid, after the letters draft (src/versions/letters/geo.ts).
type P2 = { x: number; y: number };
function shapes(d: string, k: number): { shapes: THREE.Shape[]; w: number; h: number } {
  const subs: P2[][] = [];
  let cur: THREE.Path | null = null;
  const close = () => {
    if (!cur) return;
    const raw = cur.getPoints(10);
    const pts = raw.filter((p, i) => i === 0 || p.distanceTo(raw[i - 1]) > 1e-5).map((p) => ({ x: p.x, y: p.y }));
    if (pts.length > 2) subs.push(pts);
    cur = null;
  };
  const re = /([MLQCZ])([^MLQCZ]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    const n = (m[2].match(/-?\d*\.?\d+/g) ?? []).map(Number);
    if (m[1] === 'M') { close(); cur = new THREE.Path(); cur.moveTo(n[0] * k, -n[1] * k); }
    else if (m[1] === 'L' && cur) cur.lineTo(n[0] * k, -n[1] * k);
    else if (m[1] === 'Q' && cur) cur.quadraticCurveTo(n[0] * k, -n[1] * k, n[2] * k, -n[3] * k);
    else if (m[1] === 'C' && cur) cur.bezierCurveTo(n[0] * k, -n[1] * k, n[2] * k, -n[3] * k, n[4] * k, -n[5] * k);
    else if (m[1] === 'Z') close();
  }
  close();
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const s of subs) for (const p of s) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  const cx = (x0 + x1) / 2;
  // Origin at the foot of the dot, so the mark stands and tips on it.
  return {
    shapes: subs.map((s) => new THREE.Shape(s.map((p) => new THREE.Vector2(p.x - cx, p.y - y0)))),
    w: x1 - x0, h: y1 - y0,
  };
}


function Question() {
  const geo = useMemo(() => {
    const o = shapes(GLYPH.glyphs[0].d, 1 / 1000);
    const depth = 0.24, bevel = 0.05;
    const g = new THREE.ExtrudeGeometry(o.shapes, {
      depth: depth - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelOffset: -bevel * 0.8, bevelSegments: 6, curveSegments: 1,
    });
    g.translate(0, bevel * 0.2, -depth / 2 + bevel);
    g.computeVertexNormals();
    const s = HEIGHT / o.h;
    g.scale(s, s, s);
    return g;
  }, []);
  const lift = useRef<THREE.Group>(null!);
  const pivot = useRef<THREE.Group>(null!);
  const sway = useRef<THREE.Group>(null!);
  const st = useRef({ y: 0.2, vy: 0, a: 0, va: 0, sc: 1, vs: 0 });

  useFrame((state, raw) => {
    const dt = Math.min(raw, 1 / 30);
    const t = state.clock.getElapsedTime();
    const s = st.current;
    // Lift: floats above the floor like the boot, or drops and bounces when it lands.
    if (mark.land) {
      s.vy -= 3.4 * dt; s.y += s.vy * dt;
      if (s.y < 0) { s.y = 0; s.vy = Math.abs(s.vy) > 0.08 ? -s.vy * 0.34 : 0; }
    } else {
      const target = 0.16 + (1 + Math.sin(t / 2)) * 0.025;
      s.vy += ((target - s.y) * 26 - s.vy * 8) * dt; s.y += s.vy * dt;
    }
    // Knocks: a weighted spring around the dot, held to the channel.
    if (mark.kick) { s.va += mark.kick * 8.5; mark.kick = 0; }
    s.va += (-s.a * 34 - s.va * 2.6) * dt; s.a += s.va * dt;
    if (Math.abs(s.a) > 0.3) { s.a = Math.sign(s.a) * 0.3; s.va = -s.va * 0.3; }
    // Scale pops in when the mark moves to a new slot on a phone.
    s.vs += ((mark.show - s.sc) * 120 - s.vs * 11) * dt; s.sc += s.vs * dt;
    if (mark.pop) { s.sc = 0; s.vs = 0; mark.pop = false; }
    lift.current.position.y = s.y; shade.lift = s.y; shade.scale = s.sc;
    lift.current.scale.setScalar(Math.max(0.0001, s.sc));
    pivot.current.rotation.z = s.a - mark.lean * 0.12;
    const calm = mark.land ? 0.45 : 1;
    sway.current.rotation.set(0.08 + (Math.cos(t / 4.5) / 12) * calm, (Math.sin(t / 4) / 2.6) * calm, 0);
  });

  return (
    <group ref={lift}>
      <group ref={pivot}>
        <group ref={sway}>
          <mesh geometry={geo} castShadow receiveShadow>
            <meshPhysicalMaterial color="#c8321e" roughness={0.42} metalness={0} clearcoat={0.35} clearcoatRoughness={0.42} sheen={0.4} sheenRoughness={0.6} sheenColor="#ff9c86" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// The base bakes a contact shadow under the boot; here it is baked once into a soft texture
// and fades as the mark lifts off its floor.
const shade = { lift: 0, scale: 1 };
function Shadow() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(0,0,0,0.85)'); r.addColorStop(0.35, 'rgba(0,0,0,0.45)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);
  const ref = useRef<THREE.Mesh>(null!);
  const mat = useRef<THREE.MeshBasicMaterial>(null!);
  useFrame(() => {
    const k = Math.min(1, shade.lift / 0.25);
    ref.current.scale.set((0.34 + k * 0.12) * shade.scale, (0.3 + k * 0.1) * shade.scale, 1);
    mat.current.opacity = 0.95 - k * 0.55;
  });
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} position={[0, 0.001, 0]} renderOrder={-1}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial ref={mat} map={tex} color="#000000" transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

export default function Mark({ low }: { low: boolean }) {
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, low ? 1.5 : 2]}
      camera={{ position: [0, 0, 1.1], fov: 50 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      style={{ pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <ambientLight intensity={0.45 * Math.PI} />
      <spotLight position={[1, 6, 1.5]} angle={0.2} penumbra={1} intensity={2.5 * Math.PI} decay={0} castShadow shadow-mapSize={[1024, 1024]} />
      <spotLight position={[-5, 5, -1.5]} angle={0.03} penumbra={1} intensity={4 * Math.PI} decay={0} />
      <spotLight position={[5, 5, -5]} angle={0.3} penumbra={1} intensity={4 * Math.PI} decay={0} color="#ffffc0" />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#fff8ee" position={[-2, 2, 3]} scale={[3, 1.2, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#ffffff" position={[3, 1, 1]} rotation-y={-Math.PI / 2.5} scale={[1, 3, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#ece8df" position={[0, -3, 1]} rotation-x={Math.PI / 2} scale={[6, 6, 1]} />
      </Environment>
      <group position={[0, FLOOR, 0]}>
        <Question />
        <Shadow />
      </group>
    </Canvas>
  );
}
