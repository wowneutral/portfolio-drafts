// Remixed from pmndrs/examples "inter-epoxy-resin" (MIT): Text3D in MeshTransmissionMaterial, Lightformer studio, cross grid, accumulative shadows.
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Center, Text3D, Instance, Instances, Environment, Lightformer,
  RandomizedLight, AccumulativeShadows, MeshTransmissionMaterial, type FontData,
} from '@react-three/drei';
import fontGlyphs from './inter.json';
import { turn } from './turn';
import type { Day } from './calendar';

const ACCENT = '#d4501c';
const PAPER = '#ecebee';
const HALF = new THREE.Color(PAPER).lerp(new THREE.Color(ACCENT), 0.4).getStyle();
const ISO_POLAR = Math.PI / 3;
const ISO_AZ = Math.atan2(10, 20);
// Calendar: 20 weeks by 7 days, 2 units a cell, aligned to the example's crosses.
// It is set so this week ends under the last letter of the name; older weeks run off to the left.
const X0 = -26, Z0 = -8;
const TARGET = new THREE.Vector3(0, -1, -1);

type Props = { mode: 'hero' | 'top'; phone: boolean; days: Day[]; hot: string | null; picked: string | null; onPick: (key: string) => void; live: boolean };

export default function Scene({ live, ...p }: Props) {
  return (
    <Canvas
      shadows
      orthographic
      frameloop={live ? 'always' : 'never'}
      dpr={[1, p.phone ? 1.5 : 1.6]}
      camera={{ position: [10, 20, 20], zoom: 40, near: 0.1, far: 200 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ touchAction: 'pan-y' }}
      aria-hidden="true"
    >
      <color attach="background" args={[PAPER]} />
      <World {...p} />
    </Canvas>
  );
}

function World({ mode, phone, days, hot, picked, onPick }: Omit<Props, 'live'>) {
  const soft = useRef<THREE.Group>(null);
  const ptr = useRef({ x: 0, y: 0 });
  const { size } = useThree();

  useFrame((state, dt) => {
    const cam = state.camera as THREE.OrthographicCamera;
    const k = Math.min(1, dt * 3.2);
    ptr.current.x += (state.pointer.x - ptr.current.x) * k;
    ptr.current.y += (state.pointer.y - ptr.current.y) * k;
    const raw = mode === 'top' ? 1 : turn.p;
    const t = raw * raw * (3 - 2 * raw);
    const wob = 1 - t * 0.85;
    const pol = THREE.MathUtils.lerp(ISO_POLAR, 0.02, t) + ptr.current.y * 0.05 * wob;
    const az = THREE.MathUtils.lerp(ISO_AZ, 0, t) + ptr.current.x * 0.07 * wob;
    const r = 34;
    const tx = TARGET.x - (phone ? 1.6 * (1 - t) : 0);
    cam.position.set(
      tx + r * Math.sin(pol) * Math.sin(az),
      TARGET.y + r * Math.cos(pol),
      TARGET.z + r * Math.sin(pol) * Math.cos(az),
    );
    cam.lookAt(tx, TARGET.y, TARGET.z);
    // Fit: the name across the frame at three quarters, the whole calendar from above.
    const nameW = phone ? 18 : 29, nameD = phone ? 9 : 4.5;
    const zIso = Math.min(size.width * (phone ? 0.72 : 0.8) / (nameW * 0.9 + nameD * 0.45), size.height * 0.62 / (nameD * 0.5 + 3));
    const zTop = Math.min(size.width * 0.92 / 34, size.height * 0.9 / 16);
    const z = THREE.MathUtils.lerp(zIso, zTop, t);
    if (Math.abs(cam.zoom - z) > 1e-3) { cam.zoom = z; cam.updateProjectionMatrix(); }
    if (soft.current) soft.current.position.x += (ptr.current.x * 9 - soft.current.position.x) * k;
  });

  return (
    <>
      <Name phone={phone} lite={phone || mode === 'top'} />
      <Grid />
      <Cells days={days} hot={hot} picked={picked} onPick={onPick} />
      {/* The environment is just shapes emitting light, as in the example; the long softbox follows the pointer. */}
      <Environment resolution={32} frames={Infinity}>
        <group rotation={[-Math.PI / 4, -0.3, 0]}>
          <group ref={soft}>
            <Lightformer intensity={20} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={[10, 10, 1]} />
          </group>
          <Lightformer intensity={2} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={[10, 2, 1]} />
          <Lightformer intensity={2} rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={[10, 2, 1]} />
          <Lightformer intensity={2} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={[20, 2, 1]} />
          <Lightformer type="ring" intensity={2} rotation-y={Math.PI / 2} position={[-0.1, -1, -5]} scale={10} />
        </group>
      </Environment>
      <AccumulativeShadows temporal frames={phone ? 30 : 60} color="#35333f" colorBlend={2.5} toneMapped alphaTest={0.9} opacity={1} scale={50} position={[0, -1.01, 0]}>
        <RandomizedLight amount={4} radius={10} ambient={0.5} intensity={Math.PI} position={[0, 10, -10]} size={15} mapSize={phone ? 512 : 1024} bias={0.0001} />
      </AccumulativeShadows>
    </>
  );
}

function Name({ phone, lite }: { phone: boolean; lite: boolean }) {
  const font = fontGlyphs as unknown as FontData;
  return (
    <Center scale={[0.8, 1, 1]} front rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, TARGET.z]}>
      <Text3D
        castShadow
        bevelEnabled
        font={font}
        scale={5}
        letterSpacing={-0.03}
        lineHeight={0.78}
        height={0.25}
        bevelSize={0.01}
        bevelSegments={phone ? 4 : 8}
        curveSegments={phone ? 24 : 48}
        bevelThickness={0.01}
      >
        {phone ? 'armaan\nseth' : 'armaan seth'}
        <MeshTransmissionMaterial
          backside={!lite}
          backsideThickness={0.3}
          samples={lite ? 4 : 6}
          resolution={lite ? 256 : 512}
          transmission={1}
          clearcoat={1}
          clearcoatRoughness={0}
          attenuationColor="#f1d6bd"
          attenuationDistance={5.5}
          thickness={0.3}
          chromaticAberration={0.04}
          anisotropy={0.3}
          roughness={0}
          distortion={0.5}
          distortionScale={0.1}
          temporalDistortion={0}
          ior={1.5}
          color="#fff3e6"
        />
      </Text3D>
    </Center>
  );
}

// The example's grid of crosses and hairlines, in this page's greys.
function Grid({ number = 23, lineWidth = 0.026, height = 0.5 }) {
  return (
    <Instances position={[0, -1.02, 0]} limit={number * number * 2}>
      <planeGeometry args={[lineWidth, height]} />
      <meshBasicMaterial color="#8d8a97" toneMapped={false} />
      {Array.from({ length: number }, (_, y) =>
        Array.from({ length: number }, (_, x) => (
          <group key={x + ':' + y} position={[x * 2 - Math.floor(number / 2) * 2, -0.01, y * 2 - Math.floor(number / 2) * 2]}>
            <Instance rotation={[-Math.PI / 2, 0, 0]} />
            <Instance rotation={[-Math.PI / 2, 0, Math.PI / 2]} />
          </group>
        )),
      )}
      <gridHelper args={[100, 100, '#c4c2ca', '#c4c2ca']} position={[0, -0.01, 0]} />
    </Instances>
  );
}

function Cells({ days, hot, picked, onPick }: { days: Day[]; hot: string | null; picked: string | null; onPick: (k: string) => void }) {
  return <>{days.map((d) => <Cell key={d.key} day={d} up={hot === d.key || picked === d.key} onPick={onPick} />)}</>;
}

function Cell({ day, up, onPick }: { day: Day; up: boolean; onPick: (k: string) => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const v = useRef(0);
  const color = useMemo(() => (day.commits.length >= 2 ? ACCENT : HALF), [day.commits.length]);
  const x = X0 + day.col * 2 + 1, z = Z0 + day.row * 2 + 1;
  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    // A spring with a little overshoot, so a picked day lifts like a tile pressed from below.
    const goal = up ? -0.62 : -1.04;
    v.current += ((goal - m.position.y) * 140 - v.current * 14) * Math.min(dt, 1 / 30);
    m.position.y += v.current * Math.min(dt, 1 / 30);
  });
  return (
    <mesh
      ref={ref}
      position={[x, -1.04, z]}
      onClick={(e) => { e.stopPropagation(); onPick(day.key); }}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = ''; }}
    >
      <boxGeometry args={[1.84, 0.05, 1.84]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}
