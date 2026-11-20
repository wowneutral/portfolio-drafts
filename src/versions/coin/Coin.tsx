// The one object: a heavy matte steel coin, AFF on one face and NEG on the other, on a plain ground.
// Rapier does the toss; the page only listens for which face ends up on top.
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { CuboidCollider, CylinderCollider, Physics, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { clamp } from '@/lib/utils';

import { C, type Face } from './state';

const R = 1, T = 0.11, BEV = 0.05;
const G = 26;

function faceTexture(word: string, tone = false) {
  const s = 1024, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d')!;
  const m = s / 2;
  g.fillStyle = tone ? '#ffffff' : '#808080'; g.fillRect(0, 0, s, s);
  // bead-blasted grain
  for (let i = 0; i < (tone ? 0 : 9000); i++) {
    const v = Math.random() > 0.5 ? 255 : 0;
    g.fillStyle = `rgba(${v},${v},${v},${0.04 + Math.random() * 0.05})`;
    g.fillRect(Math.random() * s, Math.random() * s, 1.6, 1.6);
  }
  g.filter = 'blur(3px)';
  // raised rim, a fine line inside it
  g.strokeStyle = tone ? '#ffffff' : '#d8d8d8'; g.lineWidth = 34; g.beginPath(); g.arc(m, m, m - 30, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = tone ? '#b0b0b0' : '#505050'; g.lineWidth = 7; g.beginPath(); g.arc(m, m, m - 82, 0, Math.PI * 2); g.stroke();
  // the word, struck into the face
  g.fillStyle = tone ? '#8a8a8a' : '#1c1c1c';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 300px "Archivo Variable", "Archivo", sans-serif';
  g.save(); g.translate(m, m + 14); g.scale(0.86, 1); g.fillText(word, 0, 0); g.restore();
  // a short rule under it
  g.fillRect(m - 70, m + 150, 140, 12);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  if (tone) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function capGeometry() {
  const g = new THREE.CircleGeometry(R - BEV, 128);
  return g;
}

function bodyGeometry() {
  // bevel ring + reeded edge, turned on a lathe
  const p = [
    new THREE.Vector2(R - BEV - 0.001, T),
    new THREE.Vector2(R - 0.016, T - 0.006),
    new THREE.Vector2(R - 0.002, T - 0.028),
    new THREE.Vector2(R, T - 0.04),
    new THREE.Vector2(R, -T + 0.04),
    new THREE.Vector2(R - 0.002, -T + 0.028),
    new THREE.Vector2(R - 0.016, -T + 0.006),
    new THREE.Vector2(R - BEV - 0.001, -T),
  ];
  const geo = new THREE.LatheGeometry(p, 480);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (Math.abs(y) > T - 0.039) continue;
    const a = Math.atan2(x, z);
    const r = R - 0.014 * (0.5 + 0.5 * Math.cos(a * 120));
    const k = r / Math.hypot(x, z);
    pos.setXYZ(i, x * k, y, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

function CoinBody({ face, onLand, phone }: { face: Face; onLand: (f: Face) => void; phone: boolean }) {
  const [face0] = useState(face);
  const body = useRef<RapierRigidBody>(null);
  const st = useRef({ tossing: false, calm: 0, t: 0, nudges: 0 }).current;
  const parts = useMemo(() => {
    const steel = { color: '#cfd1d4', metalness: 1, roughness: 0.5, clearcoat: 0.1, clearcoatRoughness: 0.6 };
    const aff = faceTexture('AFF'), neg = faceTexture('NEG'), affT = faceTexture('AFF', true), negT = faceTexture('NEG', true);
    return {
      body: bodyGeometry(),
      cap: capGeometry(),
      edge: new THREE.MeshPhysicalMaterial({ ...steel, roughness: 0.34 }),
      aff: new THREE.MeshPhysicalMaterial({ ...steel, map: affT, bumpMap: aff, bumpScale: 3 }),
      neg: new THREE.MeshPhysicalMaterial({ ...steel, map: negT, bumpMap: neg, bumpScale: 3 }),
      tex: [aff, neg, affT, negT],
    };
  }, []);
  useEffect(() => () => {
    parts.body.dispose(); parts.cap.dispose(); parts.edge.dispose(); parts.aff.dispose(); parts.neg.dispose(); parts.tex.forEach((t) => t.dispose());
  }, [parts]);

  useEffect(() => {
    C.toss = (power = 1) => {
      const b = body.current; if (!b) return;
      const p = clamp(power, 0.7, 1.35);
      const sign = Math.random() > 0.5 ? 1 : -1;
      b.wakeUp();
      const pos = b.translation();
      b.setTranslation({ x: pos.x * 0.5, y: Math.max(pos.y, 0.4), z: pos.z * 0.5 }, true);
      b.setLinvel({ x: (Math.random() - 0.5) * 0.6 - pos.x * 1.1, y: 7.6 * p, z: (Math.random() - 0.5) * 0.4 - pos.z * 1.1 }, true);
      b.setAngvel({ x: sign * (16 + Math.random() * 11) * p, y: (Math.random() - 0.5) * 3, z: (Math.random() - 0.5) * 2 }, true);
      st.tossing = true; st.calm = 0; st.t = 0; st.nudges = 0; C.busy = true;
    };
    return () => { C.toss = null; };
  }, [st]);

  const up = useMemo(() => new THREE.Vector3(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  useFrame((_, dt) => {
    const b = body.current; if (!b || !st.tossing) return;
    st.t += dt;
    const v = b.linvel(), w = b.angvel();
    const lv = Math.hypot(v.x, v.y, v.z), av = Math.hypot(w.x, w.y, w.z);
    // a soft fence just inside the frame: a coin rolling off on its edge is eased back
    const p = b.translation(), far = Math.hypot(p.x, p.z * 1.6);
    if (far > 2.1) b.applyImpulse({ x: -p.x * 0.012 * b.mass(), y: 0, z: -p.z * 0.02 * b.mass() }, true);
    // after a few seconds, let friction win: no endless rolling
    if (st.t > 3.2) { b.setAngularDamping(3); b.setLinearDamping(2); }
    if (st.t > 0.5 && ((lv < 0.08 && av < 0.15) || b.isSleeping())) st.calm += dt; else st.calm = 0;
    if (st.calm > 0.25) {
      const r = b.rotation(); q.set(r.x, r.y, r.z, r.w);
      up.set(0, 1, 0).applyQuaternion(q);
      if (Math.abs(up.y) < 0.6 && st.nudges++ < 4) { // came to rest on its edge: a small nudge
        b.applyTorqueImpulse({ x: 0.04 * Math.sign(up.z || 1), y: 0, z: 0.04 }, true);
        st.calm = 0; return;
      }
      st.tossing = false; C.busy = false;
      b.setAngularDamping(0.25); b.setLinearDamping(0.1);
      onLand(up.y > 0 ? 'aff' : 'neg');
    }
  });

  return (
    <RigidBody ref={body} colliders={false} position={[0, T + 0.02, 0]} rotation={[face0 === 'neg' ? Math.PI : 0, 0, 0]} angularDamping={0.25} linearDamping={0.1} ccd>
      <CylinderCollider args={[T, R]} density={8} friction={0.7} restitution={0.32} />
      <mesh geometry={parts.body} material={parts.edge} castShadow receiveShadow />
      <mesh geometry={parts.cap} material={parts.aff} position={[0, T, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow={!phone} />
      <mesh geometry={parts.cap} material={parts.neg} position={[0, -T, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow={!phone} />
    </RigidBody>
  );
}

function Ground({ dark }: { dark: boolean }) {
  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[20, 0.5, 20]} position={[0, -0.5, 0]} friction={0.8} restitution={0.25} />
      </RigidBody>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <shadowMaterial transparent opacity={dark ? 0.62 : 0.2} color={dark ? '#000000' : '#2a2620'} />
      </mesh>
    </>
  );
}

function Rig() {
  const { camera, size } = useThree();
  const ptr = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const m = (e: PointerEvent) => { ptr.current.x = e.clientX / innerWidth - 0.5; ptr.current.y = e.clientY / innerHeight - 0.5; };
    window.addEventListener('pointermove', m);
    return () => window.removeEventListener('pointermove', m);
  }, []);
  const narrow = size.width < size.height * 1.05;
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 2.5);
    const tx = ptr.current.x * 0.7, ty = (narrow ? 5.3 : 6.2) - ptr.current.y * 0.4;
    camera.position.x += (tx - camera.position.x) * k;
    camera.position.y += (ty - camera.position.y) * k;
    camera.position.z = narrow ? 6.4 : 7.8;
    camera.lookAt(0, 0.75, 0);
  });
  return null;
}

export default function CoinScene({ face, onLand }: { face: Face; onLand: (f: Face) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(true);
  const [fonts, setFonts] = useState(false);
  useEffect(() => {
    let on = true;
    const done = () => { if (on) setFonts(true); };
    document.fonts.load('900 300px "Archivo Variable"').then(done, done);
    const t = setTimeout(done, 2500);
    return () => { on = false; clearTimeout(t); };
  }, []);
  const phone = typeof window !== 'undefined' && window.innerWidth < 700;
  const key = useMemo(() => {
    const l = new THREE.DirectionalLight('#fffaf2', 2.4);
    l.position.set(-3.5, 9, 3.5);
    l.castShadow = true;
    l.shadow.mapSize.set(phone ? 1024 : 2048, phone ? 1024 : 2048);
    l.shadow.bias = -0.0004; l.shadow.normalBias = 0.02; l.shadow.radius = 6;
    const c = l.shadow.camera; c.left = -5; c.right = 5; c.top = 5; c.bottom = -5; c.near = 1; c.far = 30;
    return l;
  }, [phone]);
  useEffect(() => () => { key.shadow.map?.dispose(); }, [key]);

  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setVis(e.isIntersecting), { rootMargin: '120px' });
    io.observe(el);
    // flick: press and drag upward, let go; a press without a drag is a plain toss
    let y0 = 0, t0 = 0, down = false;
    const pd = (e: PointerEvent) => { down = true; y0 = e.clientY; t0 = performance.now(); el.dataset.held = '1'; };
    const pu = (e: PointerEvent) => {
      if (!down) return; down = false; el.dataset.held = '';
      if (C.busy) return;
      const dy = y0 - e.clientY, dt = Math.max(16, performance.now() - t0);
      const power = dy > 12 ? 0.75 + (dy / dt) * 0.35 : 1;
      C.toss?.(power);
    };
    const pc = () => { down = false; el.dataset.held = ''; };
    el.addEventListener('pointerdown', pd);
    window.addEventListener('pointerup', pu);
    el.addEventListener('pointercancel', pc);
    return () => { io.disconnect(); el.removeEventListener('pointerdown', pd); window.removeEventListener('pointerup', pu); el.removeEventListener('pointercancel', pc); };
  }, []);

  const dark = face === 'neg';
  return (
    <div className="cn-gl" ref={wrap} aria-hidden="true">
      <Canvas
        frameloop={vis ? 'always' : 'never'}
        shadows={{ type: THREE.PCFShadowMap }} dpr={[1, phone ? 1.5 : 1.8]}
        camera={{ fov: 24, near: 1, far: 60, position: [0, 6.2, 7.8] }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1.05; gl.setClearColor(0x000000, 0); }}
        style={{ touchAction: 'pan-y' }}
      >
        <hemisphereLight args={['#ffffff', dark ? '#2a2a2a' : '#d6d1c6', 0.5]} />
        <primitive object={key} />
        <primitive object={key.target} />
        <directionalLight position={[5, 3, -4]} intensity={1.3} color="#e9eeff" />
        <Environment resolution={256} frames={1}>
          <color attach="background" args={['#77746d']} />
          <Lightformer form="rect" intensity={4} color="#fffdf8" position={[-3, 8, 3]} rotation-x={Math.PI / 2} scale={[10, 3, 1]} />
          <Lightformer form="rect" intensity={3} color="#fff7ee" position={[-9, 3, 4]} rotation-y={Math.PI / 2.4} scale={[2, 8, 1]} />
          <Lightformer form="rect" intensity={2.4} color="#eef1ff" position={[9, 4, -2]} rotation-y={-Math.PI / 2} scale={[2, 8, 1]} />
          <Lightformer form="rect" intensity={1.1} color="#f1ece2" position={[0, 2, 12]} rotation-y={Math.PI} scale={[18, 4, 1]} />
          <Lightformer form="rect" intensity={0.5} color="#d9d4ca" position={[0, -3, 0]} rotation-x={-Math.PI / 2} scale={[40, 40, 1]} />
        </Environment>
        <Rig />
        <Suspense fallback={null}>
          <Physics gravity={[0, -G, 0]} timeStep={1 / 60}>
            <Ground dark={dark} />
            {fonts && <CoinBody face={face} onLand={onLand} phone={phone} />}
          </Physics>
        </Suspense>
      </Canvas>
    </div>
  );
}
