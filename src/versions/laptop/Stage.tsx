// Laptop model, hinge, float and contact shadow from pmndrs/examples floating-laptop (MIT, Paul Henschel); remixed for draft 39.
// Changes: react-spring swapped for maath damping plus a weighted hinge spring, the `city` preset for built Lightformers,
// the baked screen image for his own screenshots painted into a canvas texture, a graphite body and a plain black bezel.
import * as THREE from 'three';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, useGLTF } from '@react-three/drei';
import { easing } from 'maath';
import { S, W, H, paint, type Mode } from './screen';

const BASE = import.meta.env.BASE_URL;
const MODEL = BASE + 'laptop/mac-draco.glb';
const DRACO = BASE + 'laptop/draco/';
const OPEN = -0.425, SHUT = 1.575;

type Props = { only?: 'og' | 'work'; small?: boolean };

function Laptop({ only }: Props) {
  const group = useRef<THREE.Group>(null!);
  const lid = useRef<THREE.Group>(null!);
  const { nodes, materials } = useGLTF(MODEL, DRACO) as unknown as { nodes: Record<string, THREE.Mesh>; materials: Record<string, THREE.MeshStandardMaterial> };

  // Graphite body, matte black bezel and keys: no brand colour, no logo.
  const mat = useMemo(() => {
    const body = materials.aluminium.clone();
    body.color.set('#8a898e'); body.metalness = 1; body.roughness = 0.3; body.envMapIntensity = 1.35;
    const pad = materials.trackpad.clone();
    pad.color.set('#5d5c61'); pad.roughness = 0.42;
    const bezel = new THREE.MeshStandardMaterial({ color: '#050505', roughness: 0.42, metalness: 0 });
    const keys = materials.keys.clone(); keys.color.set('#0b0b0b');
    return { body, pad, bezel, keys };
  }, [materials]);

  // The display: a canvas we paint, never the model's baked image.
  const screen = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const tex = new THREE.CanvasTexture(canvas);
    tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    // Glass over a lit panel: the image is emitted, and the softbox still reflects off it.
    const material = new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#ffffff', emissiveMap: tex, roughness: 0.16, metalness: 0, envMapIntensity: 0.5, toneMapped: false });
    return { ctx: canvas.getContext('2d')!, tex, material, key: '' };
  }, []);
  useEffect(() => () => { screen.tex.dispose(); screen.material.dispose(); }, [screen]);

  const hinge = useRef({ x: 0.55, v: 0, ready: false, bump: 0 });
  useEffect(() => { const t = setTimeout(() => { hinge.current.ready = true; }, 650); return () => clearTimeout(t); }, []);
  useEffect(() => () => { document.body.style.cursor = ''; }, []);

  useFrame((state, dt) => {
    dt = Math.min(dt, 0.1);
    const t = state.clock.elapsedTime;
    // What the display shows.
    let mode: Mode = S.mode, p = S.p;
    if (only === 'og') { mode = 'og'; p = 0; }
    if (only === 'work') mode = WORK_DARK(S.work) ? 'dark' : 'work';
    const key = `${mode}|${S.work}|${p.toFixed(3)}|${S.data}`;
    if (key !== screen.key) { screen.key = key; paint(screen.ctx, mode, S.work, p); screen.tex.needsUpdate = true; }

    // The lid: a weighted spring, a little overshoot when it opens.
    const shut = only === 'og' ? S.flip && S.mode === 'og' : S.shut !== S.flip;
    const h = hinge.current;
    if (h.ready) {
      const k = S.slow && shut ? 9 : 34, c = S.slow && shut ? 6 : 6.4;
      h.v += ((shut ? SHUT : OPEN) - h.x) * k * dt - h.v * c * dt;
      h.x += h.v * dt;
      // The lid meets the base: it stops there, bounces a touch, and the whole machine dips.
      if (h.x > SHUT) { if (h.v > 0.6) h.bump = Math.min(0.35, h.v * 0.05); h.x = SHUT; h.v = -h.v * 0.22; }
    }
    h.bump = Math.max(0, h.bump - dt * 0.9);
    lid.current.rotation.x = h.x;

    // Float while open; settle flat and low when shut. Lean a little toward the pointer.
    const open = h.x < 1.2;
    const g = group.current;
    easing.damp(g.rotation, 'x', open ? Math.cos(t / 10) / 10 + 0.25 - state.pointer.y * 0.06 : 0.42, 0.35, dt);
    easing.damp(g.rotation, 'y', open ? Math.sin(t / 10) / 4 + state.pointer.x * 0.16 : 0, 0.35, dt);
    easing.damp(g.rotation, 'z', open ? Math.sin(t / 10) / 10 : 0, 0.35, dt);
    easing.damp(g.position, 'y', (open ? (-2 + Math.sin(t)) / 3 : -3.4) - h.bump, 0.3, dt);
  });

  return (
    <group
      rotation={[0, Math.PI, 0]}
      onClick={(e) => { e.stopPropagation(); S.flip = !S.flip; }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = ''; }}
    >
      <group ref={group} dispose={null}>
        <group ref={lid} rotation-x={0.55} position={[0, -0.04, 0.41]}>
          <group position={[0, 2.96, -0.13]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh material={mat.body} geometry={nodes['Cube008'].geometry} />
            <mesh material={mat.bezel} geometry={nodes['Cube008_1'].geometry} />
            <mesh material={screen.material} geometry={nodes['Cube008_2'].geometry} />
          </group>
        </group>
        <mesh material={mat.keys} geometry={nodes.keyboard.geometry} position={[1.79, 0, 3.45]} />
        <group position={[0, -0.1, 3.39]}>
          <mesh material={mat.body} geometry={nodes['Cube002'].geometry} />
          <mesh material={mat.pad} geometry={nodes['Cube002_1'].geometry} />
        </group>
        <mesh material={mat.bezel} geometry={nodes.touchbar.geometry} position={[0, -0.03, 1.2]} />
      </group>
    </group>
  );
}

const WORK_DARK = (i: number) => i === 6;

export default function Stage({ only, small }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(true);
  // Stop drawing while the stage is off screen or hidden under a band.
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin: '80px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={wrap} className="canvas-wrap">
      <Canvas
        frameloop={on ? 'always' : 'never'}
        dpr={[1, small ? 1.5 : 1.75]}
        camera={{ position: [0, 0, -29.5], fov: 30 }}
        gl={{ antialias: true, alpha: true }}
        style={{ touchAction: 'pan-y' }}
      >
        <ambientLight intensity={0.12} />
        {/* One large softbox key, upper left of camera, and a warm rim from behind. */}
        <directionalLight position={[9, 12, -14]} intensity={1.6} color="#fff7ef" />
        <directionalLight position={[-8, 5, 12]} intensity={2.4} color="#ffe2d4" />
        <Suspense fallback={null}>
          <Laptop only={only} />
          <Environment resolution={256} frames={1}>
            <Lightformer form="rect" intensity={6} position={[8, 9, -12]} scale={[16, 9]} target={[0, 0, 0]} />
            <Lightformer form="rect" intensity={1.4} position={[-6, 10, 4]} scale={[20, 4]} target={[0, 0, 0]} />
            <Lightformer form="rect" intensity={4} position={[-10, 3, 10]} scale={[3, 14]} target={[0, 0, 0]} color="#ffe6da" />
            <Lightformer form="rect" intensity={0.9} position={[0, -9, 0]} rotation-x={Math.PI / 2} scale={[40, 40]} color="#7a2b2b" />
          </Environment>
        </Suspense>
        <ContactShadows position={[0, -4.6, 0]} opacity={0.55} scale={24} blur={2.4} far={5} resolution={small ? 256 : 512} color="#2a0808" />
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL, DRACO);
