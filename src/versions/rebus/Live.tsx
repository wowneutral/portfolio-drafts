// Remixed from pmndrs/examples "view-tracking" (MIT): one fixed canvas behind the page, drei <View> windows set inline between the words, each with its own camera and lights.
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { View, PerspectiveCamera, Environment, Lightformer, ContactShadows, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { Ctl, Kind } from './ctl';

const BASE = import.meta.env.BASE_URL;
const PAPER = '#efece4';
export const URLS: Record<Exclude<Kind, 'stopped'>, string> = {
  watch: BASE + 'rebus/watch.glb',
  plato: BASE + 'rebus/plato.glb',
  apple: BASE + 'rebus/apple.glb',
  tea: BASE + 'rebus/teacup.glb',
  armillary: BASE + 'rebus/armillary.glb',
};
// Only the first object is fetched straight away; every other one waits until its line comes near.
useGLTF.preload(URLS.watch);

/** The one fixed canvas. Events come from the page root, the way the base example does it. */
export function Port({ root }: { root: HTMLElement }) {
  return (
    <Canvas
      className="rebus-canvas"
      eventSource={root}
      eventPrefix="client"
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true }}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', touchAction: 'pan-y' }}
    >
      <View.Port />
    </Canvas>
  );
}

/** A window in the line: its own camera, its own studio light, the page's paper as its background. */
export function LiveView({ kind, ctl, onReady }: { kind: Kind; ctl: Ctl; onReady: () => void }) {
  return (
    <View as="span" className="view">
      <color attach="background" args={[PAPER]} />
      <PerspectiveCamera makeDefault fov={CAM[kind][3]} position={[0, CAM[kind][1], CAM[kind][2]]} rotation={[-Math.atan2(CAM[kind][1], CAM[kind][2]), 0, 0]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[3.5, 6, 4]} intensity={2.2} color="#fff5e8" />
      <directionalLight position={[-5, 2.5, -4]} intensity={1.1} color="#e9eefc" />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={3.2} color="#fff6ea" position={[-6, 3, 5]} rotation-y={Math.PI / 4} scale={[3, 6, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#eef2ff" position={[6, 2, -2]} rotation-y={-Math.PI / 2} scale={[2.5, 6, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#f6f2ea" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[8, 8, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#f3efe6" position={[0, 1, 9]} rotation-y={Math.PI} scale={[12, 3, 1]} />
      </Environment>
      <Suspense fallback={null}>
        <Thing kind={kind} ctl={ctl} onReady={onReady} />
      </Suspense>
    </View>
  );
}

/** Camera per object: [unused, height, distance, fov], always aimed at the window's centre. */
const CAM: Record<Kind, [number, number, number, number]> = {
  watch: [0, 1.3, 8.6, 24], stopped: [0, 1.3, 8.6, 24], plato: [0, 1.1, 9.6, 26], apple: [0, 1.6, 8.6, 24], tea: [0, 2.2, 8.4, 24], armillary: [0, 1.2, 8.6, 24],
};
/** Height of each object in the window, in scene units (the window shows about 3.4 units of height). */
const H: Record<Kind, number> = { watch: 3.0, stopped: 3.0, plato: 3.6, apple: 2.35, tea: 2.0, armillary: 3.25 };
/** Turn each scan to face the camera. */
const FACE: Record<Kind, number> = { watch: 0, stopped: 0, plato: 0, apple: 0.6, tea: -0.5, armillary: 0.3 };

function prepWatch(scene: THREE.Group) {
  if (scene.userData.prepped) return;
  scene.userData.prepped = true;
  // Material fixes from draft 62 (the watch): the third-party marks overpainted, the face repainted.
  const steel = new THREE.MeshStandardMaterial({ color: '#c3c2c6', metalness: 1, roughness: 0.3 });
  const tex = new THREE.TextureLoader().load(BASE + 'rebus/face.webp');
  tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mat = m.material as THREE.MeshStandardMaterial, n = mat.name;
    if (n === 'Bezel Frame Gold') m.material = new THREE.MeshPhysicalMaterial({ color: '#f4f2ee', roughness: 0.36, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.22, aoMap: mat.aoMap, aoMapIntensity: 1 });
    else if (n === 'Band Carbon Fiber Gold') { const c = mat.clone(); c.color.setRGB(0.87, 0.87, 0.87); c.metalness = 0; c.roughness = 0.42; m.material = c; }
    else if (n === 'Hand Color Gold') m.material = new THREE.MeshStandardMaterial({ color: '#a3242b', roughness: 0.35, metalness: 0 });
    else if (n === 'Backplate Khronos' || n === 'Clasp DGG') m.material = steel;
    else if (n === 'Watch Face') { const c = mat.clone(); tex.channel = mat.map?.channel ?? 0; c.map = tex; m.material = c; }
    else if (n === 'Glass Face') m.material = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.04, transparent: true, opacity: 0.12, clearcoat: 1, depthWrite: false });
  });
}

function Thing({ kind, ctl, onReady }: { kind: Kind; ctl: Ctl; onReady: () => void }) {
  const gltf = useGLTF(kind === 'stopped' ? URLS.watch : URLS[kind]) as unknown as { scene: THREE.Group };
  const spin = useRef<THREE.Group>(null);
  const tip = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Group>(null);
  // Plato's contact shadow is redrawn once he is down.
  const [down, setDown] = useState(false);

  const rig = useMemo(() => {
    if (kind === 'watch' || kind === 'stopped') prepWatch(gltf.scene);
    const obj = gltf.scene.clone(true);
    const holder = new THREE.Group();
    holder.add(obj);
    holder.rotation.y = FACE[kind];
    if (kind === 'watch' || kind === 'stopped') holder.rotation.y = -0.42;
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(holder);
    const size = box.getSize(new THREE.Vector3());
    const s = H[kind] / size.y;
    holder.scale.setScalar(s);
    holder.updateMatrixWorld(true);
    box.setFromObject(holder);
    const c = box.getCenter(new THREE.Vector3());
    holder.position.set(-c.x, -box.min.y, -c.z);
    const wrap = new THREE.Group();
    wrap.add(holder);
    wrap.updateMatrixWorld(true);
    box.setFromObject(wrap);
    const seconds = obj.getObjectByName('Hand_Seconds') ?? null;
    return { wrap, seconds, w: box.max.x - box.min.x, maxX: box.max.x, h: box.max.y - box.min.y };
  }, [gltf.scene, kind]);

  useEffect(() => { const id = requestAnimationFrame(() => requestAnimationFrame(onReady)); return () => cancelAnimationFrame(id); }, [onReady]);

  const floor = kind === 'plato' ? -1.95 : -H[kind] * 0.5 - 0.08;
  // Plato stands left of centre and tips over the right edge of his base, so lying down he still fits the window.
  const pivot = kind === 'plato' ? -rig.h * 0.42 + rig.w / 2 : 0;
  const back = kind === 'plato' ? -rig.w / 2 : 0;

  useFrame((_, dt) => {
    dt = Math.min(dt, 1 / 20);
    // Drag to turn, with inertia. Everything eases back to face you, except the armillary, which turns slowly by itself.
    if (!ctl.drag) {
      ctl.vel *= Math.exp(-2.8 * dt);
      if (kind === 'armillary') { if (!ctl.still) ctl.vel += (0.16 - ctl.vel) * (1 - Math.exp(-0.7 * dt)); }
      else if (Math.abs(ctl.vel) < 0.4) ctl.yaw *= Math.exp(-1.6 * dt);
      ctl.yaw += ctl.vel * dt;
    }
    if (kind === 'plato' && ctl.theta > 0.02) { ctl.yaw *= Math.exp(-8 * dt); ctl.vel = 0; }
    if (kind === 'tea' && ctl.act > 0 && ctl.t < 1 && !ctl.still) ctl.t = Math.min(1, ctl.t + dt / 2.6);
    if (spin.current) {
      const u = 1 - Math.pow(1 - ctl.t, 3);
      ctl.look += ((kind === 'plato' && ctl.theta > 0.02 ? 0 : ctl.hx * 0.42) - ctl.look) * (1 - Math.exp(-4 * dt));
      spin.current.rotation.y = ctl.yaw + ctl.look + (kind === 'tea' ? u * Math.PI * 2 : 0);
    }
    // The watch runs: the seconds hand ticks with the visitor's clock. The last one is stopped at twelve.
    if (rig.seconds) {
      if (kind === 'stopped' || ctl.still) rig.seconds.rotation.y = 0;
      else { const now = new Date(); const sec = now.getSeconds() - 1 + Math.min(1, now.getMilliseconds() / 140); rig.seconds.rotation.y = (sec * 6 * Math.PI) / 180; }
    }
    // Plato tips about his base edge: gravity takes over, he hits the floor, bounces once, settles, and stays down.
    if (kind === 'plato' && tip.current) {
      if (ctl.still) { ctl.theta = Math.PI / 2; if (!down) setDown(true); }
      else if (ctl.act > 0 && !ctl.settled) {
        ctl.omega += 10.5 * Math.sin(Math.max(ctl.theta, 0.05)) * dt;
        ctl.theta += ctl.omega * dt;
        if (ctl.theta >= Math.PI / 2) {
          ctl.theta = Math.PI / 2;
          if (Math.abs(ctl.omega) < 0.6) { ctl.settled = true; ctl.omega = 0; setDown(true); }
          else ctl.omega = -ctl.omega * 0.22;
        }
      }
      tip.current.rotation.z = -ctl.theta;
    }
    // The apple is there, or it is not. No puff, no fade.
    if (kind === 'apple') {
      if (spin.current) spin.current.visible = ctl.present;
      if (shadow.current) shadow.current.visible = ctl.present;
    }
  });

  return (
    <group position={[0, floor, 0]}>
      <group position={[pivot, 0, 0]}>
        <group ref={tip}>
          <group position={[back, 0, 0]}>
            <group ref={spin}>
              <primitive object={rig.wrap} />
            </group>
          </group>
        </group>
      </group>
      <group ref={shadow}>
        <ContactShadows key={down ? 'down' : 'up'} position={[kind === 'plato' ? 0.6 : 0, 0.002, 0]} opacity={0.6} scale={kind === 'plato' ? 10 : 6.5} blur={2.4} far={kind === 'plato' ? 3.2 : 2.4} resolution={256} color="#2a2118" frames={kind === 'plato' ? 2 : 60} />
      </group>
    </group>
  );
}
