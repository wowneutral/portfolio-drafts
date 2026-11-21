// Remixed from pmndrs/examples "monitors" (MIT, src/App.tsx): the dark room, the blurred reflective floor,
// the spot from above, the orange spill, baked shadows, depth of field and the pointer camera rig.
// Changed: no bunny, bloom only above 0.9, a camera that travels between clusters as the page scrolls.
import * as THREE from 'three';
import { Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshReflectorMaterial, BakeShadows } from '@react-three/drei';
import { EffectComposer, Bloom, DepthOfField } from '@react-three/postprocessing';
import type { DepthOfFieldEffect } from 'postprocessing';
import { easing } from 'maath';
import { useRef } from 'react';
import { Instances, Computers } from './Heap';
import { Lite, Wall, ORANGE } from './Screens';
import { stage, type Stop } from './stage';

type V3 = [number, number, number];
// Where the camera stands and what it looks at, per section. World units; the heap is centred on the origin.
const POSES: Record<Stop, { at: V3; look: V3; focus?: V3; sway: number }> = {
  hero: { at: [-0.75, 0.4, 4.1], look: [0.15, 0.1, -0.7], focus: [0.13, 0.07, -1.2], sway: 0.8 },
  github: { at: [0.6, 0.22, 2.4], look: [0.38, -0.05, -1.0], focus: [0.13, 0.07, -1.2], sway: 0.3 },
  today: { at: [0.36, 1.47, -1.02], look: [0.47, 1.45, -2.01], sway: 0.06 },
  about: { at: [0.1, 0.6, 2.1], look: [-1.1, 0.15, -0.6], focus: [-0.9, 0.2, -0.6], sway: 0.3 },
  work: { at: [3.15, 0.15, 3.35], look: [6.2, -0.05, 2.2], sway: 0.25 },
  record: { at: [1.2, 1.2, 1.7], look: [2.0, 1.05, -0.8], focus: [2.1, 1.2, -0.7], sway: 0.3 },
  now: { at: [-0.7, -0.72, 2.3], look: [0.0, -0.45, -1.0], focus: [0.4, -0.4, -0.9], sway: 0.3 },
  contact: { at: [-0.35, 0.3, 2.6], look: [0.13, 0.1, -1.2], focus: [0.13, 0.07, -1.2], sway: 0.35 },
};

const look = new THREE.Vector3();
const focus = new THREE.Vector3(0.13, 0.07, -1.2);
const goal = new THREE.Vector3();

function CameraRig({ dof, lite }: { dof: React.RefObject<DepthOfFieldEffect | null>; lite: boolean }) {
  const first = useRef(true);
  useFrame((state, delta) => {
    const p = POSES[stage.stop];
    const s = p.sway;
    // On a phone the band is wide and short: step in on the wide views so the lit screen still reads.
    const k = lite && (stage.stop === 'hero' || stage.stop === 'contact') ? 0.74 : 1;
    goal.set(p.look[0] + (p.at[0] - p.look[0]) * k + stage.px * 0.9 * s, p.look[1] + (p.at[1] - p.look[1]) * k + stage.py * 0.35 * s, p.look[2] + (p.at[2] - p.look[2]) * k);
    if (first.current) { state.camera.position.copy(goal); look.set(...p.look); first.current = false; }
    easing.damp3(state.camera.position, goal, 0.55, delta);
    easing.damp3(look, p.look, 0.45, delta);
    easing.damp3(focus, p.focus ?? p.look, 0.4, delta);
    state.camera.lookAt(look);
    if (dof.current) dof.current.target = focus;
  });
  return null;
}

function Room({ lite }: { lite: boolean }) {
  const dof = useRef<DepthOfFieldEffect>(null);
  return (
    <>
      <color attach="background" args={['#0b0b0c']} />
      <hemisphereLight intensity={0.22} groundColor="black" />
      <spotLight decay={0} position={[10, 20, 10]} angle={0.12} penumbra={1} intensity={1.1} castShadow shadow-mapSize={1024} />
      <group position={[0, -1, 0]}>
        <Suspense fallback={null}>
          <Instances>
            <Computers scale={0.5} lite={lite} />
          </Instances>
        </Suspense>
        <Suspense fallback={null}>
          <group scale={0.5}>
            <Wall position={[12.4, 0, 4.4]} rotation={[0, -1.22, 0]} />
          </group>
        </Suspense>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[50, 50]} />
          <MeshReflectorMaterial
            blur={[300, 30]}
            resolution={lite ? 512 : 1024}
            mixBlur={1}
            mixStrength={120}
            roughness={1}
            depthScale={1.2}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#1b1a19"
            metalness={0.8}
          />
        </mesh>
        <pointLight distance={1.5} intensity={1} position={[-0.15, 0.7, 0]} color={ORANGE} />
        <pointLight distance={4} intensity={1.6} decay={1.5} position={[5.1, 1.6, 3.4]} color="#efe9dc" />
      </group>
      {lite ? (
        <EffectComposer>
          <Bloom luminanceThreshold={0.9} mipmapBlur luminanceSmoothing={0} intensity={0.6} />
        </EffectComposer>
      ) : (
        <EffectComposer>
          <Bloom luminanceThreshold={0.9} mipmapBlur luminanceSmoothing={0} intensity={0.6} />
          <DepthOfField ref={dof} focusRange={2.4} bokehScale={5} height={700} />
        </EffectComposer>
      )}
      <CameraRig dof={dof} lite={lite} />
      <BakeShadows />
    </>
  );
}

export default function Scene({ lite, paused }: { lite: boolean; paused: boolean }) {
  const camera = useMemo(() => ({ position: [-0.75, 0.4, 4.1] as V3, fov: 45, near: 0.1, far: 40 }), []);
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, lite ? 1.5 : 1.6]}
      frameloop={paused ? 'never' : 'always'}
      camera={camera}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
    >
      <Lite.Provider value={lite}>
        <Room lite={lite} />
      </Lite.Provider>
    </Canvas>
  );
}
