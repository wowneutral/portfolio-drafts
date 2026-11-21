// Remixed from pmndrs/examples "the-three-graces" (MIT): black fog, a hard spot that follows the pointer, SoftShadows, a damped turn and an Html tag pinned to the sculpture.
// Changed: the graces are Plato (his scan), the turn is inverted so he turns away, scroll adds a planned turn, the annotation became one projected DOM tag, and a 1-bit dither pass sits over the render.
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { SoftShadows, useGLTF } from '@react-three/drei';
import { EffectComposer } from '@react-three/postprocessing';
import { easing } from 'maath';
import * as THREE from 'three';
import { scroll } from '@/lib/scroll';
import { DitherEffect } from './Dither';
import { sample, stage } from './stage';

const URL_ = `${import.meta.env.BASE_URL}bust/plato.glb`;
const H = 2.6; // bust height in world units, kept under about 55 percent of the frame
const MIN_YAW = 0.8; // never turns back further than three-quarters

// Light positions for the three phases: key from the front (follows the pointer), rim, from behind.
const FRONT = new THREE.Vector3(), RIM = new THREE.Vector3(-3.4, 4.2, -4.4), BACK = new THREE.Vector3(0.4, 5.2, -6.2);
const tmp = new THREE.Vector3(), pin = new THREE.Vector3();

function Bust() {
  const { scene } = useGLTF(URL_) as unknown as { scene: THREE.Group };
  const group = useRef<THREE.Group>(null!);
  // The museum tag is real DOM type (crisp, never dithered), pinned to the base the way the graces' Html annotations were:
  // projected to the screen each frame and turned in CSS 3D with the marble.
  const tag = useRef<HTMLElement | null>(null);
  const { size, camera } = useThree();
  useEffect(() => { tag.current = document.querySelector<HTMLElement>('.v-bust .live-tag'); }, []);

  const { model, front, base, half } = useMemo(() => {
    const model = scene;
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true; m.receiveShadow = true;
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.envMapIntensity = 0; mat.side = THREE.FrontSide;
      }
    });
    model.position.set(0, 0, 0); model.scale.setScalar(1); model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const k = H / (box.max.y - box.min.y);
    const c = box.getCenter(new THREE.Vector3());
    model.scale.setScalar(k);
    model.position.set(-c.x * k, -c.y * k, -c.z * k);
    const half = ((box.max.x - box.min.x) * k) / 2;
    // The base's front face sits at about 0.69 of the model's forward depth (measured from the scan).
    const front = ((box.max.z - c.z) * k) * 0.7;
    return { model, front, base: -H / 2, half };
  }, [scene]);

  useEffect(() => { stage.loaded = true; stage.onLoad?.(); }, []);


  useFrame((_, delta) => {
    const s = sample(scroll.y);
    // A press on the room makes him turn further away, then settle back.
    easing.damp(stage, 'kick', 0, 1.1, delta);
    const yaw = Math.max(MIN_YAW, s.yaw + stage.px * (Math.PI / 10) * (s.light < 1.5 ? 1 : 0.3) + stage.kick);
    // Damped exactly as the graces were (1.5), only inverted: the pointer pushes him away.
    easing.dampE(group.current.rotation, [stage.py * 0.035, yaw, 0], 1.5, delta);
    const r = group.current.rotation.y;
    const show = THREE.MathUtils.clamp((Math.cos(r) + 0.1) / 0.35, 0, 1) * (stage.capture || (window.innerWidth <= 820 && scroll.y > 8) ? 0 : 1);
    const el = tag.current;
    if (el) {
      el.style.opacity = show.toFixed(3); el.style.visibility = show < 0.02 ? 'hidden' : 'visible';
      if (show > 0) {
        pin.set(half * 0.3, base + 0.16, front).applyMatrix4(group.current.matrixWorld).project(camera);
        const x = ((pin.x + 1) / 2) * size.width, y = ((1 - pin.y) / 2) * size.height, k = Math.min(1, size.height / 820);
        el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-50%) perspective(700px) rotateY(${r.toFixed(4)}rad) scale(${k.toFixed(3)})`;
      }
    }
  });

  return (
    <group ref={group}>
      <primitive object={model} />
    </group>
  );
}

function Lights() {
  const light = useRef<THREE.SpotLight>(null!);
  const fill = useRef<THREE.PointLight>(null!);
  useFrame((_, delta) => {
    const s = sample(scroll.y);
    FRONT.set(3.2 + stage.px * 4, 4.6 + stage.py * 1.4, 6);
    const l = s.light;
    if (l <= 1) tmp.lerpVectors(FRONT, RIM, l); else tmp.lerpVectors(RIM, BACK, l - 1);
    // The key follows the pointer quickly, as in the base (0.2); the swing round behind him is slower.
    easing.damp3(light.current.position, tmp, l > 0.05 ? 0.6 : 0.2, delta);
    light.current.target.position.set(0, 0.5, 0);
    light.current.target.updateMatrixWorld();
    easing.damp(light.current, 'intensity', l > 1.5 ? 22 : 9.5, 0.8, delta);
    easing.damp(fill.current, 'intensity', l > 1.5 ? 0 : 0.25, 0.8, delta);
  });
  return (
    <>
      <spotLight ref={light} position={[3, 3.4, 6.5]} angle={0.3} penumbra={0.6} decay={0} intensity={9.5} castShadow shadow-mapSize={1024} shadow-bias={-0.0004} shadow-normalBias={0.02} />
      <pointLight ref={fill} position={[-6, -2, 4]} intensity={0.25} decay={0} />
    </>
  );
}

function Dither() {
  const effect = useMemo(() => new DitherEffect(), []);
  useFrame(() => { effect.uniforms.get('uCell')!.value = sample(scroll.y).cell; });
  return <primitive object={effect} dispose={null} />;
}

export default function Scene() {
  return (
    <Canvas
      dpr={1}
      shadows={{ type: THREE.PCFShadowMap }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0.35, 9], fov: 30, near: 0.1, far: 40 }}
      onCreated={({ camera }) => camera.lookAt(0, 0.05, 0)}
      style={{ touchAction: 'pan-y' }}
    >
      <color attach="background" args={['#0a0a0b']} />
      <fog attach="fog" args={['#0a0a0b', 8.5, 13.5]} />
      <SoftShadows size={18} samples={8} focus={0.6} />
      <Lights />
      <Suspense fallback={null}>
        <Bust />
      </Suspense>
      <mesh rotation-x={-Math.PI / 2} position={[0, -H / 2, 0]} receiveShadow>
        <circleGeometry args={[6.5, 96]} />
        <meshStandardMaterial color="#202020" roughness={1} />
      </mesh>
      <EffectComposer multisampling={0}>
        <Dither />
      </EffectComposer>
    </Canvas>
  );
}
useGLTF.preload(URL_);
