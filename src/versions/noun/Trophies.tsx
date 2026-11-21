// The debate set piece: both championships side by side on the warm floor, lit like trophies. Same room and
// key light as the stage (after pmndrs/examples dbismut-furniture, MIT), one scene, turning with the pointer.
import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { easing } from 'maath';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { still } from '@/lib/utils';
import { Champion } from './things';
import { BG, ptr } from './ptr';

function Podium({ phone }: { phone: boolean }) {
  const { gl, scene, camera, size } = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.035).texture; pm.dispose();
    scene.environment = env; scene.environmentIntensity = 0.75; scene.background = new THREE.Color(BG);
    return () => env.dispose();
  }, [gl, scene]);
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const a = size.width / size.height, f = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const d = Math.max(3.2 / (2 * f), (phone ? 6.6 : 8.2) / (2 * f * a));
    cam.position.set(0, 0.9 + d * 0.24, d); cam.lookAt(0, 0.62, 0); cam.updateProjectionMatrix();
  }, [camera, size, phone]);
  const a = useRef<THREE.Group>(null!), b = useRef<THREE.Group>(null!);
  const key = useRef<THREE.DirectionalLight>(null!);
  useEffect(() => { key.current.target.position.set(0, 0.8, 0); key.current.target.updateMatrixWorld(); }, []);
  const gap = phone ? 1.55 : 1.85;
  useFrame((_, dt) => {
    const k = still ? 0 : 1;
    easing.damp(a.current.rotation, 'y', 0.22 + ptr.x * 0.14 * k, 0.4, dt);
    easing.damp(b.current.rotation, 'y', -0.22 + ptr.x * 0.14 * k, 0.4, dt);
  });
  const floor = useMemo(() => new THREE.PlaneGeometry(40, 40), []);
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight ref={key} position={[-4, 7, 5]} intensity={2.7} color="#fff6ea" castShadow
        shadow-mapSize={phone ? [1024, 1024] : [2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02}
        shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={4} shadow-camera-bottom={-2} shadow-camera-near={1} shadow-camera-far={18} />
      <directionalLight position={[3, 3.5, -5]} intensity={1.7} color="#eef1ff" />
      <mesh geometry={floor} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><shadowMaterial transparent opacity={0.3} /></mesh>
      <group ref={a} position={[-gap, 0, 0]}><group><Champion lines={['FLORIDA', 'BLUE KEY']} width={2.6} /></group></group>
      <group ref={b} position={[gap, 0, 0]}><group><Champion lines={['WILDCAT', 'CLASSIC']} width={2.6} /></group></group>
    </>
  );
}

function Pause({ on }: { on: boolean }) {
  const set = useThree((s) => s.setFrameloop);
  useEffect(() => { set(on ? 'never' : 'always'); }, [on, set]);
  return null;
}

export default function Trophies({ phone, paused }: { phone: boolean; paused: boolean }) {
  return (
    <Canvas
      gl={{ antialias: true, alpha: false }}
      dpr={phone ? [1, 1.5] : [1, 1.6]}
      shadows={{ type: THREE.PCFShadowMap }}
      camera={{ fov: 24, near: 0.5, far: 60 }}
      style={{ touchAction: 'pan-y' }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }}
    >
      <Pause on={paused} />
      <Podium phone={phone} />
    </Canvas>
  );
}
