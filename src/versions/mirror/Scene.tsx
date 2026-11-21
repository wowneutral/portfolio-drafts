// Remixed from pmndrs/examples "ground-reflections-and-video-textures" (MIT): drei Text filled with a moving texture, blurred MeshReflectorMaterial floor, fog, pointer-led camera.
import * as THREE from 'three';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { MeshReflectorMaterial, Text, useTexture } from '@react-three/drei';
import anton from '@fontsource/anton/files/anton-latin-400-normal.woff?url';
import surfaceTex1 from './SurfaceImperfections003_1K_var1.jpg';
import surfaceTex2 from './SurfaceImperfections003_1K_Normal.jpg';
import { WORK } from '@/content';
import { scroll } from '@/lib/scroll';
import { clamp } from '@/lib/utils';
import { getOg, getReel, getStrip, REEL } from './stage';
import { stage } from './stage';

export type Mode = 'hero' | 'work' | 'end';
type Props = { mode: Mode; phone: boolean; active: boolean; onHover?: (i: number) => void; onPick?: (i: number) => void };

const CAM_Z = 14, TEXT_Z = -2, FOV = 15;
const N = WORK.length;

export default function Scene({ mode, phone, active, onHover, onPick }: Props) {
  return (
    <Canvas
      gl={{ alpha: false, antialias: true, powerPreference: 'high-performance' }}
      dpr={phone ? [1, 1.5] : [1, 1.6]}
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 3, mode === 'hero' ? 100 : 18], fov: FOV }}
    >
      <color attach="background" args={['#08080a']} />
      <fog attach="fog" args={['#08080a', 15, 21]} />
      <Suspense fallback={null}>
        <group position={[0, -1, 0]}>
          <Name mode={mode} phone={phone} onHover={onHover} onPick={onPick} />
          <Ground phone={phone} />
        </group>
        <ambientLight intensity={0.5 * Math.PI} />
        <spotLight position={[0, 10, 0]} intensity={0.3 * Math.PI} decay={0} />
        <directionalLight position={[-50, 0, -40]} intensity={0.7 * Math.PI} />
      </Suspense>
    </Canvas>
  );
}

function useCanvasTexture(get: () => Promise<HTMLCanvasElement>, wrapX: boolean) {
  const [tex, set] = useState<THREE.CanvasTexture | null>(null);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    let live = true, made: THREE.CanvasTexture | null = null;
    get().then((c) => {
      if (!live) return;
      made = new THREE.CanvasTexture(c);
      made.colorSpace = THREE.SRGBColorSpace;
      made.wrapS = wrapX ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
      made.wrapT = THREE.ClampToEdgeWrapping;
      made.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
      made.generateMipmaps = true;
      if (wrapX && get === getStrip) made.offset.x = 0.8; // open on the drafts, the richest page
      made.minFilter = THREE.LinearMipmapLinearFilter;
      set(made);
    });
    return () => { live = false; made?.dispose(); };
  }, [get, wrapX, gl]);
  return tex;
}

function Name({ mode, phone, onHover, onPick }: { mode: Mode; phone: boolean; onHover?: (i: number) => void; onPick?: (i: number) => void }) {
  const getter = mode === 'hero' ? getStrip : mode === 'work' ? getReel : getOg;
  const tex = useCanvasTexture(getter, mode !== 'work');
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const group = useRef<THREE.Group>(null);
  const [box, setBox] = useState<{ w: number; h: number; cap: number } | null>(null);
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const hover = useRef(-1);
  const aim = useMemo(() => new THREE.Vector3(), []);
  const motion = useRef({ speed: 1, oy: 0.5, ox: -0.55, vx: 0, glow: mode === 'end' ? 0.04 : 1, ready: false });
  const label = phone ? 'ARMAAN\nSETH' : 'ARMAAN SETH';

  // Fit the name to the width of the frame at the letters' depth.
  const visW = 2 * (CAM_Z - TEXT_Z) * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * (size.width / Math.max(1, size.height));
  const scale = box ? (visW * (phone ? 0.9 : 0.88)) / box.w : 1;
  const aspect = box ? box.w / box.h : 5;

  // How much of the texture the name shows at once.
  useEffect(() => {
    if (!tex) return;
    if (mode === 'hero') {
      // Each page keeps its own proportions: one 16:9 cell spans the block height.
      tex.repeat.set(aspect / (16 / 9) / N, 1);
    } else if (mode === 'work') {
      const r = Math.min(1 / N, (REEL.w / aspect) / (REEL.h * N));
      tex.repeat.set(1, r);
    } else {
      const ca = 4.2;
      tex.repeat.set(1, Math.min(1, ca / aspect));
      tex.offset.y = (1 - tex.repeat.y) / 2;
    }
  }, [tex, aspect, mode]);

  const pick = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    if (!tex || !box) return -1;
    if (mode === 'work') return stage.work;
    if (mode !== 'hero') return -1;
    const p = e.object.worldToLocal(e.point.clone());
    const u = clamp((p.x + box.w / 2) / box.w);
    const t = tex.offset.x + u * tex.repeat.x;
    return Math.floor((((t % 1) + 1) % 1) * N) % N;
  };

  const setCursor = (on: boolean) => { gl.domElement.style.cursor = on ? 'pointer' : ''; };

  useFrame((state, dt) => {
    const m = motion.current;
    const k = 1 - Math.pow(0.95, dt * 60);
    // Camera: the example's pointer drift, held low along the floor as the page scrolls.
    const vh = window.innerHeight || 1;
    const sp = mode === 'hero' ? clamp(scroll.y / vh) : 0;
    const baseY = mode === 'hero' ? 2.6 - 1.5 * sp : mode === 'work' ? 1.9 : 2.3;
    const ax = phone ? 0.8 : 2.2;
    state.camera.position.lerp(aim.set(state.pointer.x * ax, baseY + state.pointer.y * 0.9, CAM_Z - sp * 1.5), k);
    const capY = box ? box.cap * scale : 1;
    state.camera.lookAt(0, -1 + capY * (phone ? 0.5 : mode === 'hero' ? 0.42 : 0.56), TEXT_Z);

    if (!tex || !mat.current) return;
    if (mode === 'hero') {
      // One direction, slow; it settles to a stop while the pointer rests on a letter.
      m.speed += ((stage.paused ? 0 : 1) - m.speed) * Math.min(1, dt * 4);
      tex.offset.x = (tex.offset.x + dt * 0.0105 * m.speed) % 1;
    } else if (mode === 'work') {
      const i = stage.work;
      const target = 1 - (i + 0.5) / N - tex.repeat.y / 2;
      m.oy += (target - m.oy) * Math.min(1, dt * 3.2);
      tex.offset.y = m.oy;
      const want = WORK[i]?.href ? 1 : 0.035; // JARVIS: the letters go dark
      m.glow += (want - m.glow) * Math.min(1, dt * 3);
    } else {
      // The closing picture slides in once and settles with a little weight.
      const want = stage.end ? 0 : -0.55;
      const f = -170 * (m.ox - want) - 22 * m.vx;
      m.vx += f * Math.min(dt, 1 / 30);
      m.ox += m.vx * Math.min(dt, 1 / 30);
      tex.offset.x = m.ox;
      m.glow += ((stage.end ? 1 : 0.04) - m.glow) * Math.min(1, dt * 1.6);
    }
    mat.current.color.setScalar(mode === 'hero' ? 1 : m.glow);
  });

  return (
    <group ref={group} position={[0, 0, TEXT_Z]} scale={scale}>
      {/* A thin unlit rim behind the letters, so the shapes hold over dark pages. */}
      <Text font={anton} fontSize={1} letterSpacing={0.01} lineHeight={0.98} textAlign="center" anchorX="center" anchorY="bottom-baseline" position={[0, 0, -0.012]} fillOpacity={0} outlineWidth="1.6%" outlineColor="#8a867d">
        {label}
      </Text>
      <Text
        font={anton}
        fontSize={1}
        letterSpacing={0.01}
        lineHeight={0.98}
        textAlign="center"
        anchorX="center"
        anchorY="bottom-baseline"
        onSync={(t: any) => {
          const b = t.textRenderInfo?.blockBounds as number[] | undefined;
          const cap = (t.textRenderInfo?.capHeight as number | undefined) ?? 0.75;
          if (b && (!box || Math.abs(box.w - (b[2] - b[0])) > 1e-4)) setBox({ w: b[2] - b[0], h: b[3] - b[1], cap: phone ? cap + 0.98 : cap });
        }}
        onPointerMove={(e) => {
          if (mode === 'end') return;
          e.stopPropagation();
          const i = pick(e);
          stage.paused = mode === 'hero';
          setCursor(!!WORK[i]?.href);
          if (i !== hover.current) { hover.current = i; onHover?.(i); }
        }}
        onPointerOut={() => {
          stage.paused = false; setCursor(false);
          if (mode === 'hero') { hover.current = -1; onHover?.(-1); }
        }}
        onClick={(e) => {
          if (mode === 'end') return;
          const i = pick(e);
          if (i >= 0) onPick?.(i);
        }}
      >
        {label}
        <meshBasicMaterial key={tex ? tex.uuid : 'none'} ref={mat} toneMapped={false} map={tex ?? undefined} color={tex ? '#ffffff' : '#141414'} />
      </Text>
    </group>
  );
}

function Ground({ phone }: { phone: boolean }) {
  const [floor, normal] = useTexture([surfaceTex1, surfaceTex2]);
  useMemo(() => {
    for (const t of [floor, normal]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.4, 2.4); }
  }, [floor, normal]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
      <planeGeometry args={[24, 24]} />
      <MeshReflectorMaterial
        blur={[400, 100]}
        resolution={phone ? 256 : 512}
        mirror={0.5}
        mixBlur={6}
        mixStrength={1.5}
        color="#a0a0a0"
        metalness={0.4}
        roughnessMap={floor}
        normalMap={normal}
        normalScale={[2, 2]}
      />
    </mesh>
  );
}
