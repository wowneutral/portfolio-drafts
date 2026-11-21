// Remixed from pmndrs/examples "scrollcontrols-and-lens-refraction" (MIT, Paul Henschel): the lens model, its FBO portal and MeshTransmissionMaterial; drei ScrollControls replaced by the shared scroll store so the page scrolls normally.
import * as THREE from 'three';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber';
import { useFBO, useGLTF, Text, Image, MeshTransmissionMaterial, Environment, Lightformer, useTexture } from '@react-three/drei';
import { easing } from 'maath';
import { scroll } from '@/lib/scroll';
import { clamp } from '@/lib/utils';

const BASE = import.meta.env.BASE_URL;
const FONT = BASE + 'lens/familjen-500.woff';
const MODEL = BASE + 'lens/lens.glb';
const PAPER = '#e9e8e4';
const INK = '#111111';
const TAN = Math.tan((7.5 * Math.PI) / 180); // half of the example's 15 degree lens
const CAM = 20;
const ZT = 12; // the type's depth, as in the example
const ZL = 15; // the lens's depth

export type Block = { text: string; size: 'huge' | 'body' };
/** A screenshot at its own depth. Desktop: in the margin, so that block `block` at fraction `f` of its height
 *  sits at screen height `y` (0 to 1) when the picture is at `y` too. Phone: in a gap opened after `block`. */
export type Pic = { url: string; aspect: number; block: number; f: number; y: number; x: number; w: number; z: number };
export type Pointer = { x: number; y: number; mode: 'idle' | 'mouse' | 'touch' | 'rest'; down: boolean };

type Props = {
  blocks: Block[];
  pics: Pic[];
  phone: boolean;
  host: React.RefObject<HTMLElement | null>;
  pointer: Pointer;
  active: boolean;
  onLayout: (px: number) => void;
};

/** Units per CSS pixel at a given depth. */
const upp = (z: number, vh: number) => (2 * (CAM - z) * TAN) / vh;

type Layout = { tops: number[]; bottom: number; huge: number; body: number; pad: number; col: number; pics: { oa: number; y: number; x: number; w: number; z: number }[] };

function plan(blocks: Block[], heights: number[], pics: Pic[], vw: number, vh: number, phone: boolean): Layout {
  const huge = phone ? vw * 0.128 : Math.min(vw * 0.094, vh * 0.17);
  const body = phone ? vw * 0.082 : Math.min(vw * 0.05, vh * 0.088);
  const pad = phone ? 18 : vw * 0.045;
  const col = phone ? vw - pad * 2 : vw * 0.56;
  const tops: number[] = [];
  const out: Layout['pics'] = [];
  let y = phone ? vh * 0.05 : vh * 0.07;
  blocks.forEach((b, i) => {
    tops.push(y);
    y += heights[i] ?? 0;
    const next = blocks[i + 1];
    let gap = next ? (next.size === 'huge' || b.size === 'huge' ? huge * 0.75 : body * 0.9) : 0;
    if (phone) {
      pics.forEach((p) => {
        if (p.block !== i) return;
        const w = vw - pad * 2, h = w / p.aspect, m = body * 1.1;
        const centre = y + m + h / 2;
        out.push({ oa: centre - vh / 2, y: 0.5, x: 0, w, z: 11.9 });
        gap = Math.max(gap, m * 2 + h);
      });
    }
    y += gap;
  });
  if (!phone) {
    pics.forEach((p) => {
      const anchor = tops[p.block] + (heights[p.block] ?? 0) * p.f;
      out.push({ oa: Math.max(0, anchor - p.y * vh), y: anchor - Math.max(0, anchor - p.y * vh) > 0 ? (anchor - Math.max(0, anchor - p.y * vh)) / vh : p.y, x: (p.x - 0.5) * vw, w: p.w * vw, z: p.z });
    });
  }
  return { tops, bottom: y, huge, body, pad, col, pics: out };
}

function Lens({ children, pointer, phone }: { children: React.ReactNode; pointer: Pointer; phone: boolean }) {
  const ref = useRef<THREE.Mesh>(null!);
  const shade = useRef<THREE.Mesh>(null!);
  // The lens's own soft shadow on the paper, drawn into the page so the glass refracts it too.
  const shadowMap = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    // A bright caustic where the glass gathers the light, ringed by its shadow.
    r.addColorStop(0, 'rgba(255,255,252,0.55)'); r.addColorStop(0.3, 'rgba(255,255,252,0.18)'); r.addColorStop(0.5, 'rgba(17,17,17,0.04)');
    r.addColorStop(0.72, 'rgba(17,17,17,0.15)'); r.addColorStop(0.86, 'rgba(17,17,17,0.06)'); r.addColorStop(1, 'rgba(17,17,17,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  const { nodes } = useGLTF(MODEL, BASE + 'lens/draco/') as unknown as { nodes: { Cylinder: THREE.Mesh } };
  const geo = nodes.Cylinder.geometry;
  const r0 = useMemo(() => { geo.computeBoundingBox(); const b = geo.boundingBox!; return Math.max(b.max.x - b.min.x, b.max.z - b.min.z) / 2; }, [geo]);
  const buffer = useFBO();
  const viewport = useThree((s) => s.viewport);
  const [scene] = useState(() => new THREE.Scene());
  const last = useRef(new THREE.Vector2());
  const t0 = useRef(0);
  useFrame((state, delta) => {
    const { width: vw, height: vh } = state.size;
    const H = (CAM - ZL) * TAN * 2, W = H * (vw / vh);
    t0.current += delta;
    let tx = pointer.x, ty = pointer.y;
    if (pointer.mode === 'idle') {
      // Before anyone moves it, the lens drifts slowly along the line, as if reading.
      const t = t0.current;
      tx = Math.sin(t * 0.32) * (phone ? 0.35 : 0.55);
      ty = (phone ? 0.42 : 0.5) + Math.sin(t * 0.21) * 0.08;
    } else if (pointer.mode === 'rest') { tx = 0; ty = 0; }
    const m = ref.current;
    easing.damp3(m.position, [(tx * W) / 2, (ty * H) / 2, ZL], pointer.mode === 'idle' ? 0.6 : 0.16, delta);
    // A little weight: the glass leans into the way it is moving.
    const vx = (m.position.x - last.current.x) / Math.max(delta, 1e-3), vy = (m.position.y - last.current.y) / Math.max(delta, 1e-3);
    last.current.set(m.position.x, m.position.y);
    easing.damp(m.rotation, 'z', clamp(-vx * 0.08, -0.25, 0.25), 0.25, delta);
    easing.damp(m.rotation, 'x', Math.PI / 2 + clamp(-vy * 0.08, -0.25, 0.25), 0.25, delta);
    const diam = phone ? vw * 0.6 : Math.min(vh * 0.44, vw * 0.3);
    const target = ((diam / 2) * (H / vh)) / r0 * (pointer.down ? 1.22 : 1);
    easing.damp3(m.scale, [target, target, target], 0.18, delta);
    // Shadow: same screen point one step behind the type, nudged down and right, away from the light.
    const k = (CAM - 11.9) / (CAM - ZL), sh = shade.current, lift = pointer.down ? 1.35 : 1;
    sh.position.set(m.position.x * k + 0.06 * lift, m.position.y * k - 0.085 * lift, 11.9);
    const sr = m.scale.x * r0 * k * 2.3;
    sh.scale.set(sr, sr, 1);
    state.gl.setRenderTarget(buffer);
    state.gl.setClearColor(PAPER);
    state.gl.render(scene, state.camera);
    state.gl.setRenderTarget(null);
  });
  return (
    <>
      {createPortal(<>
        {children}
        <mesh ref={shade} renderOrder={1}>
          <planeGeometry />
          <meshBasicMaterial map={shadowMap} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      </>, scene)}
      <mesh scale={[viewport.width, viewport.height, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={buffer.texture} toneMapped={false} />
      </mesh>
      <mesh ref={ref} scale={0.25} rotation-x={Math.PI / 2} position={[0, 0.3, ZL]} geometry={geo}>
        <MeshTransmissionMaterial buffer={buffer.texture} ior={1.25} thickness={0.55} anisotropy={0.08} chromaticAberration={0.008} distortion={0} roughness={0} backside={false} />
      </mesh>
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 4, 4]} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[-5, -1, 2]} rotation-y={Math.PI / 2} scale={[6, 1, 1]} />
      </Environment>
    </>
  );
}

type ImageMesh = THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial & { zoom: number; grayscale: number }>;

function Content({ blocks, pics, phone, host, onLayout }: Omit<Props, 'pointer' | 'active'>) {
  const size = useThree((s) => s.size);
  const [heights, setHeights] = useState<number[]>([]);
  const group = useRef<THREE.Group>(null!);
  const picRefs = useRef<(ImageMesh | null)[]>([]);
  const top = useRef(0);
  const frame = useRef(0);
  const vw = size.width, vh = size.height;
  const u = upp(ZT, vh);
  const synced = heights.filter((h) => h > 0).length === blocks.length;
  const L = useMemo(() => plan(blocks, heights, pics, vw, vh, phone), [blocks, heights, pics, vw, vh, phone]);
  const stageH = Math.max(vh * 1.05, L.bottom + vh * (phone ? 0.1 : 0.1));
  const textures = useTexture(pics.map((p) => p.url));
  useMemo(() => textures.forEach((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; }), [textures]);

  useEffect(() => { if (synced) onLayout(stageH); }, [synced, stageH, onLayout]);

  useFrame(() => {
    const el = host.current;
    if (el && frame.current++ % 20 === 0) top.current = el.getBoundingClientRect().top + window.scrollY;
    const o = clamp(scroll.y - top.current, 0, Math.max(0, stageH - vh));
    group.current.position.y = o * u;
    picRefs.current.forEach((m, i) => {
      const P = L.pics[i];
      if (!m || !P) return;
      const uz = upp(P.z, vh);
      // How far the picture sits from the middle of the screen: grey and slightly zoomed at the edges, true colour in the middle.
      const sy = (P.y - 0.5) * vh - (o - P.oa) * (u / uz);
      const rel = clamp(Math.abs(sy) / (vh * 0.55));
      m.material.grayscale = rel * 0.85;
      m.material.zoom = 1 + rel * 0.14;
    });
  });

  const X0 = (-vw / 2 + L.pad) * u;
  return (
    <group ref={group}>
      {blocks.map((b, i) => (
        <Text
          key={i}
          renderOrder={2}
          font={FONT}
          color={INK}
          anchorX="left"
          anchorY="top"
          fontSize={(b.size === 'huge' ? L.huge : L.body) * u}
          maxWidth={(b.size === 'huge' ? vw - L.pad * 2 : L.col) * u}
          lineHeight={b.size === 'huge' ? 0.98 : 1.1}
          letterSpacing={b.size === 'huge' ? -0.035 : -0.018}
          position={[X0, (vh / 2 - L.tops[i]) * u, ZT]}
          onSync={(t: { textRenderInfo?: { blockBounds: number[] } }) => {
            const bb = t.textRenderInfo?.blockBounds; if (!bb) return;
            const h = (bb[3] - bb[1]) / u;
            setHeights((prev) => { if (Math.abs((prev[i] ?? 0) - h) < 0.5) return prev; const n = prev.slice(); n[i] = h; return n; });
          }}
        >
          {b.text}
        </Text>
      ))}
      {synced && pics.map((p, i) => {
        const P = L.pics[i];
        if (!P) return null;
        const uz = upp(P.z, vh);
        const w = P.w * uz, h = w / p.aspect;
        return (
          <Image
            key={p.url}
            ref={(m: unknown) => { picRefs.current[i] = m as ImageMesh | null; }}
            texture={textures[i]}
            scale={[w, h] as unknown as [number, number]}
            position={[P.x * uz, -P.oa * u + (0.5 - P.y) * vh * uz, P.z]}
            grayscale={0.85}
          />
        );
      })}
    </group>
  );
}

export default function Stage(props: Props) {
  const { pointer, phone, active } = props;
  return (
    <Canvas
      flat
      frameloop={active ? 'always' : 'never'}
      dpr={phone ? [1, 1.25] : [1, 1.6]}
      camera={{ position: [0, 0, CAM], fov: 15 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      style={{ touchAction: 'pan-y' }}
      onCreated={({ gl }) => gl.setClearColor(PAPER)}
    >
      <Suspense fallback={null}>
        <Lens pointer={pointer} phone={phone}>
          <Content {...props} />
        </Lens>
      </Suspense>
    </Canvas>
  );
}
