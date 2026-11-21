// Remixed from pmndrs/examples dbismut-furniture (MIT): two render targets, one thing in each, a screen quad
// that cross-fades between them (here through a noise dissolve), and a slight tilt toward the pointer.
// react-spring is swapped for maath damping; the stage sits beside the paragraph instead of behind it.
import * as THREE from 'three';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber';
import { ScreenQuad, useFBO } from '@react-three/drei';
import { easing } from 'maath';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Thing, type Live, type ThingId } from './things';
import { XFade } from './xfade';
import { still } from '@/lib/utils';
import { BG, ptr } from './ptr';

export { BG, ptr };

/** One shared, locally built studio environment (no CDN). */
function useEnv() {
  const gl = useThree((s) => s.gl);
  const env = useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const t = pm.fromScene(new RoomEnvironment(), 0.035).texture;
    pm.dispose();
    return t;
  }, [gl]);
  useEffect(() => () => env.dispose(), [env]);
  return env;
}

/** The room every thing stands in: floor that only keeps shadows, a key light from high left, a rim from behind. */
function Room({ env, children, phone }: { env: THREE.Texture; children: React.ReactNode; phone: boolean }) {
  const scene = useThree((s) => s.scene);
  useEffect(() => { scene.environment = env; scene.environmentIntensity = 0.75; }, [scene, env]);
  const key = useRef<THREE.DirectionalLight>(null!);
  useEffect(() => { key.current.target.position.set(0, 0.8, 0); key.current.target.updateMatrixWorld(); }, []);
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight ref={key} position={[-3.5, 6.5, 4.5]} intensity={2.6} color="#fff6ea" castShadow
        shadow-mapSize={phone ? [1024, 1024] : [2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02} shadow-radius={6}
        shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={4} shadow-camera-bottom={-2} shadow-camera-near={1} shadow-camera-far={16} />
      <directionalLight position={[2.5, 3.5, -5]} intensity={1.6} color="#eef1ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <shadowMaterial transparent opacity={0.3} />
      </mesh>
      {children}
    </>
  );
}

/** A thing, tilting a few degrees toward the pointer and settling as it arrives. */
function Holder({ id, live, active }: { id: ThingId; live: Live; active: boolean }) {
  const ref = useRef<THREE.Group>(null!);
  const pointer = ptr;
  useFrame((_, dt) => {
    const g = ref.current; if (!g) return;
    // As in the base: the shown thing turns in, the leaving one turns on past.
    const y = active ? (still ? 0 : pointer.x) * 0.16 : 0.34;
    easing.damp(g.rotation, 'y', y, 0.35, dt);
    easing.damp(g.rotation, 'x', active ? -(still ? 0 : pointer.y) * 0.04 : 0, 0.35, dt);
    const s = active ? 1 : 0.86;
    easing.damp3(g.scale, [s, s, s], 0.35, dt);
  });
  return <group ref={ref} scale={0.86} rotation={[0, -0.34, 0]}><Suspense fallback={null}><Thing id={id} live={live} /></Suspense></group>;
}

function Slot({ target, id, live, active, cam, env, phone }: { target: THREE.WebGLRenderTarget; id: ThingId; live: Live; active: boolean; cam: THREE.Camera; env: THREE.Texture; phone: boolean }) {
  const scene = useMemo(() => new THREE.Scene(), []);
  useFrame((state) => {
    state.gl.setRenderTarget(target);
    state.gl.setClearColor(0x000000, 0);
    state.gl.clear();
    state.gl.render(scene, cam);
    state.gl.setRenderTarget(null);
  }, 0);
  return createPortal(<Room env={env} phone={phone}><Holder key={id} id={id} live={live} active={active} /></Room>, scene);
}

function Pair({ want, live, phone }: { want: ThingId; live: Live; phone: boolean }) {
  const env = useEnv();
  // Which thing sits in which target, and which target is shown (the base's bookkeeping, as state).
  const [st, setSt] = useState<{ slots: [ThingId, ThingId]; shown: number }>({ slots: [want, 'none'], shown: 0 });
  useEffect(() => {
    setSt((s) => {
      const at = s.slots.indexOf(want);
      if (at > -1) return at === s.shown ? s : { ...s, shown: at };
      const hide = s.shown === 0 ? 1 : 0;
      const slots: [ThingId, ThingId] = [...s.slots] as [ThingId, ThingId];
      slots[hide] = want;
      return { slots, shown: hide };
    });
  }, [want]);
  const { slots, shown } = st;

  const t0 = useFBO({ stencilBuffer: false, samples: phone ? 0 : 4 });
  const t1 = useFBO({ stencilBuffer: false, samples: phone ? 0 : 4 });
  const size = useThree((s) => s.size);
  const cam = useMemo(() => new THREE.PerspectiveCamera(24, 1, 0.5, 40), []);
  useEffect(() => {
    const a = size.width / size.height;
    cam.aspect = a;
    const f = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const d = Math.max(3.0 / (2 * f), 4.0 / (2 * f * a));
    cam.position.set(0, 1.0 + d * 0.17, d);
    cam.lookAt(0, 0.95, 0);
    cam.updateProjectionMatrix();
  }, [size, cam]);

  // Draw the quad to the screen after both targets are filled.
  useFrame((state) => { state.gl.setRenderTarget(null); state.gl.render(state.scene, state.camera); }, 1);

  return (
    <>
      <ScreenQuad>
        <XFade t0={t0.texture} t1={t1.texture} shown={shown} bg={BG} />
      </ScreenQuad>
      <Slot target={t0} id={slots[0]} live={live} active={shown === 0} cam={cam} env={env} phone={phone} />
      <Slot target={t1} id={slots[1]} live={live} active={shown === 1} cam={cam} env={env} phone={phone} />
    </>
  );
}

/** Pause the loop while the stage is out of sight. */
function Pause({ on }: { on: boolean }) {
  const set = useThree((s) => s.setFrameloop);
  useEffect(() => { set(on ? 'never' : 'always'); }, [on, set]);
  return null;
}

export default function Stage({ want, live, phone, paused }: { want: ThingId; live: Live; phone: boolean; paused: boolean }) {
  return (
    <Canvas
      gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
      dpr={phone ? [1, 1.5] : [1, 1.6]}
      shadows={{ type: THREE.PCFShadowMap }}
      style={{ touchAction: 'pan-y' }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }}
      eventPrefix="client"
    >
      <Pause on={paused} />
      <Pair want={want} live={live} phone={phone} />
    </Canvas>
  );
}
