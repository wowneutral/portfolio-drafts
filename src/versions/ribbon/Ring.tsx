// Remixed from pmndrs/examples cards-with-border-radius (src/App.tsx, by cydstumpel.nl, MIT): the ring, the bent cards, the banner.
import * as THREE from 'three';
import { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree, type ThreeElements, type ThreeEvent } from '@react-three/fiber';
import { Image } from '@react-three/drei';
import { easing } from 'maath';
import { WORK, PERSON } from '@/content';
import { scroll } from '@/lib/scroll';
import { clamp } from '@/lib/utils';
import './util';
import type { MeshSineMaterial } from './util';
import { ring } from './store';

const BASE = import.meta.env.BASE_URL;
const COUNT = WORK.length;
const RADIUS = 1.4;
const CARD: [number, number] = [1.06, 0.68];
const BAND_R = 1.6;
const TAU = Math.PI * 2;

export default function Ring({ phone, live }: { phone: boolean; live: boolean }) {
  return (
    <Canvas
      camera={{ position: [0, 1.5, 10], fov: 15 }}
      dpr={[1, phone ? 1.5 : 1.6]}
      frameloop={live ? 'always' : 'never'}
      gl={{ alpha: true, antialias: true }}
      style={{ touchAction: 'pan-y' }}
    >
      <Suspense fallback={null}>
        <Rig rotation={[0, 0, 0.15]} phone={phone}>
          <Carousel />
        </Rig>
        <Banner position={[0, -0.15, 0]} />
      </Suspense>
    </Canvas>
  );
}

function Rig({ phone, ...props }: ThreeElements['group'] & { phone: boolean }) {
  const ref = useRef<THREE.Group>(null!);
  const drift = useRef(0);
  // The opening: the ring arrives a third of a turn early and settles into place on the damping.
  useLayoutEffect(() => { ref.current.rotation.y = 2.2; }, []);
  const size = useThree((s) => s.size);
  // Pull the camera back until the whole ring fits the canvas width.
  const aspect = size.width / Math.max(1, size.height);
  const tan = 2 * Math.tan((15 * Math.PI) / 360);
  // Wide enough that the ring fills about seventy percent of the width, tall enough that it never clips.
  const dist = Math.max(phone ? 2.05 / tan : 1.95 / tan, (phone ? 3.7 : 4.9) / (tan * aspect));
  useFrame((state, delta) => {
    if (ring.focus < 0 && ring.hover < 0) drift.current += delta * 0.045;
    const p = clamp(scroll.y / Math.max(1, ring.span));
    let target = -p * TAU - ring.spin - drift.current;
    // A focused link turns its card to the front, the short way round.
    if (ring.bring >= 0) {
      const want = -(ring.bring / COUNT) * TAU;
      const d = Math.atan2(Math.sin(want - target), Math.cos(want - target));
      ring.spin -= d; target += d; ring.bring = -1;
    }
    easing.damp(ref.current.rotation, 'y', target, 0.3, delta);
    state.events.update?.(); // raycast every frame, so a card turning under a still pointer still lifts
    const px = phone ? 0 : state.pointer.x, py = phone ? 0 : state.pointer.y;
    easing.damp3(state.camera.position, [-px * dist * 0.12, py * dist * 0.06 + dist * (phone ? 0.27 : 0.15), dist], 0.3, delta);
    state.camera.lookAt(0, 0, 0);
  });
  return <group ref={ref} {...props} />;
}

function Carousel() {
  return WORK.map((w, i) => (
    <Card
      key={w.slug}
      i={i}
      url={BASE + w.img}
      position={[Math.sin((i / COUNT) * TAU) * RADIUS, 0, Math.cos((i / COUNT) * TAU) * RADIUS]}
      rotation={[0, Math.PI + (i / COUNT) * TAU, 0]}
    />
  ));
}

const v = new THREE.Vector3();
let frontZ = -Infinity, frontI = 0, seen = 0;

function Card({ url, i, ...props }: { url: string; i: number } & Pick<ThreeElements['mesh'], 'position' | 'rotation'>) {
  const ref = useRef<THREE.Mesh>(null!);
  const over = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); ring.hover = i; document.body.style.cursor = 'pointer'; };
  const out = () => { if (ring.hover === i) ring.hover = -1; document.body.style.cursor = ''; };
  const click = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (!ring.dragged) ring.onPick?.(i); };
  // The cards face inward, so the example's photos were quietly mirrored; screenshots with words cannot be. Flip x (the bend is symmetric).
  useLayoutEffect(() => { ref.current.scale.x = -CARD[0]; }, []);
  useFrame((_, delta) => {
    const m = ref.current, mat = m.material as unknown as { radius: number; zoom: number; opacity: number; grayscale: number };
    const lifted = ring.hover === i || ring.focus === i;
    m.getWorldPosition(v);
    // Cards at the back sink into the stone, the way the example's fog did.
    const near = clamp((v.z + RADIUS) / (RADIUS * 2));
    const k = lifted ? 1.16 : 1;
    easing.damp3(m.scale, [-CARD[0] * k, CARD[1] * k, 1], 0.12, delta);
    easing.damp(mat, 'radius', lifted ? 0.22 : 0.1, 0.2, delta);
    easing.damp(mat, 'zoom', lifted ? 1 : 1.22, 0.2, delta);
    easing.damp(mat, 'opacity', lifted ? 1 : 0.1 + Math.pow(near, 1.6) * 0.9, 0.15, delta);
    easing.damp(mat, 'grayscale', lifted ? 0 : clamp(1 - near * 1.6), 0.2, delta);
    // Which card faces the viewer: the caption under the ring follows it.
    if (v.z > frontZ) { frontZ = v.z; frontI = i; }
    if (++seen >= COUNT) {
      if (frontI !== ring.front) { ring.front = frontI; ring.onFront?.(frontI); }
      frontZ = -Infinity; seen = 0;
    }
  });
  return (
    <Image
      ref={ref}
      url={url}
      transparent
      side={THREE.DoubleSide}
      scale={CARD}
      onPointerOver={over}
      onPointerOut={out}
      onClick={click}
      {...props}
    >
      <bentPlaneGeometry args={[0.1, 1, 1, 20, 20]} />
    </Image>
  );
}

/** His line, set in Archivo at condensed width, printed over and over on the band with a vermilion dot between. */
function useRibbonTexture() {
  return useMemo(() => {
    const h = 176;
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d')!;
    const text = PERSON.line.toUpperCase();
    const font = `800 ${Math.round(h * 0.5)}px "Archivo Variable", "Archivo", sans-serif`;
    const set = () => { (ctx as CanvasRenderingContext2D & { fontStretch?: string }).fontStretch = 'condensed'; ctx.font = font; ctx.letterSpacing = `${Math.round(h * 0.02)}px`; };
    set();
    const tw = ctx.measureText(text).width;
    const gap = h * 1.05;
    const w = Math.ceil(tw + gap);
    c.width = w; c.height = h;
    set();
    ctx.fillStyle = '#f7f5ef'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#161513'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, h * 0.54);
    ctx.fillStyle = '#d23c1e';
    ctx.beginPath(); ctx.arc(tw + gap / 2, h / 2, h * 0.09, 0, TAU); ctx.fill();
    // The edges of the band: two hairlines, printed.
    ctx.fillStyle = 'rgba(22,21,19,0.16)'; ctx.fillRect(0, 6, w, 2); ctx.fillRect(0, h - 8, w, 2);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 16;
    const circ = TAU * BAND_R;
    const repeats = Math.max(2, Math.round(circ / ((w / h) * 0.17)));
    const bandH = (circ / repeats) * (h / w);
    tex.repeat.set(repeats, 1);
    return { tex, bandH };
  }, []);
}

function Banner(props: ThreeElements['mesh']) {
  const ref = useRef<THREE.Mesh<THREE.BufferGeometry, MeshSineMaterial>>(null!);
  const { tex, bandH } = useRibbonTexture();
  const speed = useRef(0);
  useFrame((_, delta) => {
    const sv = Math.abs(scroll.v);
    // The print runs with your scroll and eases to rest when you stop.
    easing.damp(speed, 'current', Math.min(sv * 0.09, 0.5), 0.35, delta);
    ref.current.material.time.value += sv * delta * 2.2;
    tex.offset.x += delta * speed.current;
  });
  return (
    <mesh ref={ref} {...props}>
      <cylinderGeometry args={[BAND_R, BAND_R, bandH, 128, 16, true]} />
      <meshSineMaterial map={tex} side={THREE.DoubleSide} toneMapped={false} />
    </mesh>
  );
}
