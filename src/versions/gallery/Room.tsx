// Remixed from pmndrs/examples "image-gallery" (MIT, github.com/pmndrs/examples): reflective floor, framed images, click-to-walk camera with maath easing.
// Changed for him: his twelve works on a U of walls, hash routing instead of wouter, Lightformers instead of the city preset, a wall label that slides out on arrival.
import * as THREE from 'three';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, Image, Lightformer, MeshReflectorMaterial, Text, useCursor } from '@react-three/drei';
import { easing } from 'maath';
import { DEBATE } from '@/content';
import labelFont from '@fontsource/bodoni-moda/files/bodoni-moda-latin-500-normal.woff?url';
import { ITEMS, type Item } from './data';

const BASE = import.meta.env.BASE_URL;
const FOV = 55;
const ACCENT = '#f0b323';
const MAT = '#e9e5dc';

type Place = { pos: [number, number, number]; rot: number; iw: number; ih: number; W: number; H: number };

/** Fit a picture of a given aspect inside a box, then size the frame around it the way the example does (picture 85% by 90% of the frame). */
function fit(aspect: number, bw: number, bh: number) {
  let iw = bw, ih = bw / aspect;
  if (ih > bh) { ih = bh; iw = bh * aspect; }
  return { iw, ih, W: iw / 0.85, H: ih / 0.9 };
}

/** Back wall: certificate, plate, plate, certificate. Two wings, each four works hung two over two, angled toward the visitor. */
function layout(): Place[] {
  const out: Place[] = [];
  const plate = fit(0.72, 3, 2.3);
  const cert = fit(720 / 1018, 2, 1.5);
  const px = plate.W / 2 + 0.3;
  const cx = px + plate.W / 2 + 0.56 + cert.W / 2;
  const back: Record<number, Place> = {
    4: { pos: [-cx, 1.3, -0.86], rot: 0.22, ...cert },
    5: { pos: [-px, 1.42, -1], rot: 0, ...plate },
    6: { pos: [px, 1.42, -1], rot: 0, ...plate },
    7: { pos: [cx, 1.3, -0.86], rot: -0.22, ...cert },
  };
  const edge = cx + cert.W / 2;
  const wing = 0.82;
  const col = (side: -1 | 1, d: number, y: number, aspect: number): Place => {
    const f = fit(aspect, 1.5, 0.86);
    const dir = new THREE.Vector3(side * Math.cos(wing), 0, Math.sin(wing));
    const p = new THREE.Vector3(side * (edge + 0.3), y, -0.7).addScaledVector(dir, d);
    return { pos: [p.x, p.y, p.z], rot: -side * wing, ...f };
  };
  const dIn = 0.3 + 0.88, dOut = dIn + 1.76 + 0.58;
  ITEMS.forEach((it, i) => {
    if (back[i]) out[i] = back[i];
    else if (i < 4) out[i] = col(-1, i < 2 ? dOut : dIn, i % 2 === 0 ? 1.86 : 0.78, it.aspect);
    else out[i] = col(1, i < 10 ? dIn : dOut, i % 2 === 0 ? 1.86 : 0.78, it.aspect);
  });
  return out;
}

/** The championship plate: cream card, black Bodoni, three lines. */
function usePlate(i: number) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 720; c.height = 1000;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);
  useEffect(() => {
    const w = DEBATE.wins[i];
    const draw = () => {
      const c = tex.image as HTMLCanvasElement;
      const g = c.getContext('2d')!;
      g.fillStyle = '#ece7dc'; g.fillRect(0, 0, 720, 1000);
      g.fillStyle = '#121214'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.font = '700 150px "Bodoni Moda Variable", serif';
      g.fillText(w.title, 360, 470, 640);
      g.fillRect(320, 545, 80, 3);
      g.font = '500 46px "Bodoni Moda Variable", serif';
      g.fillText(w.event, 360, 650, 640);
      g.font = 'italic 500 46px "Bodoni Moda Variable", serif';
      g.fillText(`${w.where}, ${w.when}`, 360, 720, 640);
      tex.needsUpdate = true;
    };
    draw();
    Promise.all([
      document.fonts.load('700 150px "Bodoni Moda Variable"'),
      document.fonts.load('italic 500 46px "Bodoni Moda Variable"'),
    ]).then(draw, draw);
  }, [i, tex]);
  return tex;
}

function Plate({ i, w, h }: { i: number; w: number; h: number }) {
  const tex = usePlate(i);
  return (
    <mesh raycast={() => null} position={[0, 0, 0.05]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

type Shared = { active: number; peek: number; pick: (i: number | null) => void; arrived: React.MutableRefObject<boolean> };

function Frame({ item, place, i, active, peek, pick, arrived }: { item: Item; place: Place; i: number } & Shared) {
  const mat = useRef<THREE.MeshBasicMaterial>(null!);
  const pic = useRef<THREE.Group>(null!);
  const img = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial & { zoom: number }>>(null);
  const label = useRef<THREE.Group>(null!);
  const [hovered, hover] = useState(false);
  const isActive = active === i;
  useCursor(hovered);
  const lit = hovered || peek === i;
  const { W, H, iw, ih } = place;
  const tucked = W / 2 - 0.54;
  const out = W / 2 + 0.07;
  const rnd = (i * 0.618) % 1;
  useFrame((state, dt) => {
    if (img.current) img.current.material.zoom = 1.04 + Math.sin(rnd * 100 + state.clock.elapsedTime / 3) * 0.03;
    const s = !isActive && lit ? 0.95 : 1;
    easing.damp3(pic.current.scale, [s, s, 1], 0.1, dt);
    easing.dampC(mat.current.color, isActive || lit ? ACCENT : MAT, 0.12, dt);
    const show = isActive && arrived.current;
    easing.damp(label.current.position, 'x', show ? out : tucked, show ? 0.28 : 0.12, dt);
    label.current.visible = label.current.position.x > tucked + 0.004;
  });
  return (
    <group position={place.pos} rotation={[0, place.rot, 0]} name={item.id}>
      <mesh
        name={item.id}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); hover(true); }}
        onPointerOut={() => hover(false)}
        onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); pick(isActive ? null : i); }}
      >
        <boxGeometry args={[W, H, 0.05]} />
        <meshStandardMaterial color="#141416" metalness={0.5} roughness={0.5} envMapIntensity={2} />
      </mesh>
      <mesh raycast={() => null} position={[0, 0, 0.012]}>
        <boxGeometry args={[W * 0.9, H * 0.93, 0.04]} />
        <meshBasicMaterial ref={mat} color={MAT} toneMapped={false} />
      </mesh>
      <group ref={pic}>
        {item.img
          ? <Image ref={img} raycast={() => null} url={BASE + item.img} scale={[iw, ih]} position={[0, 0, 0.05]} toneMapped={false} />
          : <Plate i={item.idx} w={iw} h={ih} />}
      </group>
      {/* The wall label: tucked behind the frame, it slides out past the right edge when the visitor arrives. Duplicated in the DOM panel. */}
      <group ref={label} position={[tucked, H / 2 - 0.02, -0.04]} visible={false}>
        <Text font={labelFont} fontSize={0.05} color={ACCENT} anchorX="left" anchorY="top" letterSpacing={0.04}>{item.n}</Text>
        <Text font={labelFont} fontSize={0.055} color="#eeebe4" anchorX="left" anchorY="top" maxWidth={0.44} lineHeight={1.15} position={[0, -0.09, 0]}>
          {item.name}
        </Text>
      </group>
    </group>
  );
}

function Rig({ places, active, phone, arrived }: { places: Place[]; active: number; phone: boolean; arrived: React.MutableRefObject<boolean> }) {
  const { size, camera } = useThree();
  const p = useMemo(() => new THREE.Vector3(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const aspect = size.width / Math.max(1, size.height);
  // Where the camera stands to see the room: back off until every frame (or, on a phone, the back wall) fits.
  const home = useMemo(() => {
    const cam = new THREE.PerspectiveCamera(FOV, aspect, 0.1, 100);
    const pts: THREE.Vector3[] = [];
    places.forEach((pl, i) => {
      if (phone ? i < 5 || i > 6 : i < 2 || i > 9) return;
      const m = new THREE.Matrix4().compose(new THREE.Vector3(...pl.pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, pl.rot, 0)), new THREE.Vector3(1, 1, 1));
      for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pts.push(new THREE.Vector3((x * pl.W) / 2, (y * pl.H) / 2, 0).applyMatrix4(m));
    });
    const y = 1.3;
    for (let z = 1; z < 30; z += 0.05) {
      cam.position.set(0, y, z); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      if (pts.every((v) => { const s = v.clone().project(cam); return Math.abs(s.x) < (phone ? 0.92 : 1.0) && Math.abs(s.y) < 0.86 && s.z < 1; })) return new THREE.Vector3(0, y, z);
    }
    return new THREE.Vector3(0, y, 12);
  }, [places, aspect, phone]);
  useEffect(() => {
    const pl = places[active];
    if (!pl) { p.copy(home); q.identity(); return; }
    const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const extra = phone ? 0.5 : 0.62;
    const dist = Math.max(((pl.W + extra) * 1.08) / 2 / (t * aspect), (pl.H * 1.28) / 2 / t);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...pl.pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, pl.rot, 0)), new THREE.Vector3(1, 1, 1));
    p.set(extra / 2 - 0.04, 0, dist).applyMatrix4(m);
    q.setFromEuler(new THREE.Euler(0, pl.rot, 0));
  }, [active, places, home, phone, aspect, p, q]);
  const first = useRef(true);
  const tp = useMemo(() => new THREE.Vector3(), []);
  const tq = useMemo(() => new THREE.Quaternion(), []);
  const te = useMemo(() => new THREE.Euler(), []);
  useFrame((state, dt) => {
    if (first.current) { state.camera.position.copy(home).add(new THREE.Vector3(0, 0.25, 1.6)); first.current = false; }
    // In the overview the room answers the pointer: a small lean to look down either wing.
    const lean = active < 0 && !phone ? state.pointer.x : 0;
    tp.copy(p); tp.x += lean * 0.45; tp.y += active < 0 && !phone ? state.pointer.y * 0.12 : 0;
    tq.setFromEuler(te.set(0, -lean * 0.1, 0)).premultiply(q);
    easing.damp3(state.camera.position, tp, 0.4, dt);
    easing.dampQ(state.camera.quaternion, tq, 0.4, dt);
    arrived.current = active >= 0 && state.camera.position.distanceTo(p) < 0.06;
  });
  void camera;
  return null;
}

export default function Room({ active, peek, pick, phone, running }: { active: number; peek: number; pick: (i: number | null) => void; phone: boolean; running: boolean }) {
  const places = useMemo(layout, []);
  const arrived = useRef(false);
  return (
    <Canvas
      frameloop={running ? 'always' : 'never'}
      dpr={[1, phone ? 1.5 : 1.75]}
      camera={{ fov: FOV, position: [0, 1.4, 9], near: 0.1, far: 60 }}
      gl={{ antialias: true }}
      onPointerMissed={() => pick(null)}
      aria-hidden="true"
    >
      <color attach="background" args={['#121214']} />
      <fog attach="fog" args={['#121214', 7, 24]} />
      <Suspense fallback={null}>
        <group>
          {ITEMS.map((it, i) => <Frame key={it.id} item={it} place={places[i]} i={i} active={active} peek={peek} pick={pick} arrived={arrived} />)}
        </group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[50, 50]} />
          <MeshReflectorMaterial
            blur={[300, 100]}
            resolution={phone ? 512 : 1024}
            mixBlur={1}
            mixStrength={60}
            roughness={1}
            depthScale={1.2}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#08080a"
            metalness={0.5}
          />
        </mesh>
        {/* One cool light from above, two faint side strips: built here instead of the example's city preset. */}
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={2.4} color="#e4ebff" position={[0, 7, 1]} rotation-x={Math.PI / 2} scale={[12, 5, 1]} />
          <Lightformer form="rect" intensity={0.7} color="#f4efe6" position={[-8, 2, 3]} rotation-y={Math.PI / 2} scale={[3, 6, 1]} />
          <Lightformer form="rect" intensity={0.5} color="#f4efe6" position={[8, 2, 3]} rotation-y={-Math.PI / 2} scale={[3, 6, 1]} />
        </Environment>
      </Suspense>
      <Rig places={places} active={active} phone={phone} arrived={arrived} />
    </Canvas>
  );
}
