// Remixed from pmndrs/examples "horizontal-tiles" (MIT): tall image slices that widen and regain colour under the pointer, eased with maath.
import * as THREE from 'three';
import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { easing } from 'maath';
import { WORK } from '@/content';
import { FOCAL, useTiles } from './store';

const BASE = import.meta.env.BASE_URL;
const N = WORK.length;

// drei's Image shader, cut down: cover-crop around a focal point, grayscale, and a tint.
const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const fragmentShader = /* glsl */ `
uniform sampler2D map; uniform vec2 scale; uniform vec2 bounds; uniform vec2 focal; uniform float gray; uniform vec3 tint;
varying vec2 vUv;
void main() {
  float rs = scale.x / scale.y; float ri = bounds.x / bounds.y;
  vec2 fit = rs < ri ? vec2(bounds.x * scale.y / bounds.y, scale.y) : vec2(scale.x, bounds.y * scale.x / bounds.x);
  vec2 k = scale / fit;
  vec2 uv = vUv * k + (1.0 - k) * vec2(focal.x, 1.0 - focal.y);
  vec4 c = texture2D(map, uv);
  float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
  gl_FragColor = vec4(mix(c.rgb, vec3(l), gray) * tint, 1.0);
  #include <colorspace_fragment>
}`;

const WHITE = new THREE.Color('white');
const DIM = new THREE.Color('#8c8c8c');

function Slices({ onJump }: { onJump: (i: number) => void }) {
  const textures = useTexture(WORK.map((w) => BASE + w.img));
  const { width, height } = useThree((s) => s.viewport);
  const group = useRef<THREE.Group>(null!);
  const meshes = useRef<THREE.Mesh[]>([]);
  const born = useRef(-1);
  const geo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const mats = useMemo(
    () =>
      textures.map((t, i) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        const img = t.image as { width: number; height: number };
        const [fx, fy] = FOCAL[WORK[i].slug];
        return new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader,
          toneMapped: false,
          uniforms: {
            map: { value: t },
            scale: { value: new THREE.Vector2(1, 1) },
            bounds: { value: new THREE.Vector2(img.width, img.height) },
            focal: { value: new THREE.Vector2(fx, fy) },
            gray: { value: 1 },
            tint: { value: DIM.clone() },
          },
        });
      }),
    [textures],
  );

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (born.current < 0) born.current = t;
    const age = t - born.current;
    const { active, hover } = useTiles.getState();
    const open = hover ?? active;
    const gap = width * 0.011;
    const W = Math.min(width * 0.46, height * 1.55);
    const w = (width * 0.94 - W - (N - 1) * gap) / (N - 1);
    let total = -gap;
    meshes.current.forEach((m, i) => {
      if (!m) return;
      const isOpen = i === open;
      // Slices rise into place one after another on load, the strip's only intro.
      const up = Math.min(1, Math.max(0, (age - 0.15 - i * 0.07) / 0.5));
      const d = Math.abs(i - open);
      const h = height * (isOpen ? 0.99 : 0.8 + 0.07 * Math.max(0, 1 - d / 2.5)) * (0.04 + 0.96 * up);
      easing.damp(m.scale, 'x', isOpen ? W : w, 0.18, dt);
      easing.damp(m.scale, 'y', h, 0.15, dt);
      const u = (m.material as THREE.ShaderMaterial).uniforms;
      u.scale.value.set(m.scale.x, m.scale.y);
      easing.damp(u.gray, 'value', isOpen ? 0 : 1, 0.15, dt);
      easing.dampC(u.tint.value, isOpen ? WHITE : DIM, hover === i ? 0.1 : 0.2, dt);
      total += m.scale.x + gap;
    });
    let x = -total / 2;
    let openX = 0;
    meshes.current.forEach((m, i) => {
      if (!m) return;
      m.position.x = x + m.scale.x / 2;
      if (i === open) openX = m.position.x;
      x += m.scale.x + gap;
    });
    // The strip leans a little toward the open slice, so scrolling reads as moving sideways.
    easing.damp(group.current.position, 'x', -openX * 0.16, 0.35, dt);
  });

  return (
    <group ref={group}>
      {mats.map((mat, i) => (
        <mesh
          key={i}
          ref={(m) => { if (m) meshes.current[i] = m; }}
          geometry={geo}
          material={mat}
          scale={[0.01, 0.01, 1]}
          onPointerOver={(e) => { e.stopPropagation(); useTiles.getState().setHover(i); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { if (useTiles.getState().hover === i) useTiles.getState().setHover(null); document.body.style.cursor = ''; }}
          onClick={(e) => { e.stopPropagation(); onJump(i); }}
        />
      ))}
    </group>
  );
}

export default function Strip({ running, onJump }: { running: boolean; onJump: (i: number) => void }) {
  return (
    <Canvas
      flat
      dpr={[1, 1.6]}
      frameloop={running ? 'always' : 'never'}
      camera={{ position: [0, 0, 10], fov: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ touchAction: 'pan-y' }}
      onPointerLeave={() => { useTiles.getState().setHover(null); document.body.style.cursor = ''; }}
    >
      <Suspense fallback={null}>
        <Slices onJump={onJump} />
      </Suspense>
    </Canvas>
  );
}
