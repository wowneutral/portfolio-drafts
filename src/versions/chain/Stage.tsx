// The scene: a warm grey paper sweep, a row of satin ivory tiles, one orange one, a long lens walking beside them.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, N8AO } from '@react-three/postprocessing';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { scroll } from '@/lib/scroll';
import { clamp, damp, lerp, smooth } from '@/lib/utils';
import { CHAMP, FAN, LAST_STOP, N, PT, PW, STOPS, T, chain, fOf, pushFrom, stepRow } from './chain';

const SWEEP = '#d7d2c7';
type Pose = { pos: THREE.Vector3; tgt: THREE.Vector3; fov: number };

function poseOf(k: number, phone: boolean): Pose {
  const ids = STOPS[k];
  if (k === 0) {
    const t = T[0];
    return phone
      ? { pos: new THREE.Vector3(1.1, 0.7, 3.6), tgt: new THREE.Vector3(-1.1, 0.95, -6), fov: 36 }
      : { pos: new THREE.Vector3(t.x + 0.95, 0.5, t.z + 3.5), tgt: new THREE.Vector3(-1.3, 0.85, -6), fov: 27 };
  }
  if (!ids.length) {
    // The end: above the last stretch, every word lying face up.
    const last = T.filter((t) => !t.small).slice(-8);
    const zc = last.reduce((a, t) => a + t.z - t.h * 0.5, 0) / last.length, xc = last[0].x;
    return phone
      ? { pos: new THREE.Vector3(xc + 3.6, 12.5, zc + 7.5), tgt: new THREE.Vector3(xc, 0, zc - 0.6), fov: 40 }
      : { pos: new THREE.Vector3(xc + 4.6, 11.5, zc + 8.5), tgt: new THREE.Vector3(xc - 0.2, 0, zc - 0.5), fov: 34 };
  }
  if (ids === CHAMP) {
    // The two titles, seen square on, leaning into each other.
    const t = T[CHAMP[0]], z = t.z;
    return phone
      ? { pos: new THREE.Vector3(1.6, 2.4, z + 9.5), tgt: new THREE.Vector3(0, 1.2, z - 0.8), fov: 36 }
      : { pos: new THREE.Vector3(1.4, 1.7, z + 8.2), tgt: new THREE.Vector3(-0.1, 1.15, z - 0.8), fov: 29 };
  }
  if (ids[0] === FAN[0]) {
    // The fan, from above and in front, so the ripple reads.
    let x = 0, z = 0; for (const i of ids) { x += T[i].x; z += T[i].z; } x /= ids.length; z /= ids.length;
    return phone
      ? { pos: new THREE.Vector3(x + 1.0, 2.6, z + 3.4), tgt: new THREE.Vector3(x - 0.2, 0.1, z - 0.4), fov: 36 }
      : { pos: new THREE.Vector3(x + 0.9, 1.8, z + 3.0), tgt: new THREE.Vector3(x - 0.3, 0.15, z - 0.3), fov: 29 };
  }
  if (ids.length === 1 && T[ids[0]].today) {
    // Today, lying face up: the date reads from above.
    const t = T[ids[0]];
    return phone
      ? { pos: new THREE.Vector3(t.x + 2.2, 5.2, t.z + 2.6), tgt: new THREE.Vector3(t.x, 0.1, t.z - 1.2), fov: 38 }
      : { pos: new THREE.Vector3(t.x + 2.0, 4.1, t.z + 2.2), tgt: new THREE.Vector3(t.x - 0.1, 0.2, t.z - 1.2), fov: 32 };
  }
  let x = 0, z = 0, H = 0;
  for (const i of ids) { x += T[i].x; z += T[i].z; H = Math.max(H, T[i].h); }
  x /= ids.length; z /= ids.length;
  let spread = 0;
  for (const i of ids) spread = Math.max(spread, Math.hypot(T[i].x - x, T[i].z - z));
  H = Math.max(H, spread * 1.25);
  return phone
    ? { pos: new THREE.Vector3(x + 1.6 * H, 1.1 * H, z + 3.3 * H), tgt: new THREE.Vector3(x - 0.15 * H, 0.45 * H, z - 0.8 * H), fov: 36 }
    : { pos: new THREE.Vector3(x + 1.85 * H, 0.78 * H, z + 3.1 * H), tgt: new THREE.Vector3(x - 0.2 * H, 0.42 * H, z - 0.7 * H), fov: 29 };
}

/** One face: the word cut into the slab, running up it like a spine. */
function faceTex(word: string, orange: boolean, small: boolean) {
  const W = small ? 128 : 256, H = Math.round(W * 0.92 / (PW * 0.86));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  if (word) {
    g.translate(W / 2, H / 2); g.rotate(-Math.PI / 2);
    let size = W * 0.6;
    const font = (s: number) => `${small ? 600 : 500} ${s}px "Bodoni Moda Variable", Didot, serif`;
    g.font = font(size);
    const fit = H * 0.82;
    const m = g.measureText(word).width;
    if (m > fit) { size *= fit / m; g.font = font(size); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    // The cut: a lit lower lip, then the dark of the groove.
    g.fillStyle = orange ? 'rgba(255,214,190,0.55)' : 'rgba(255,255,250,0.85)';
    g.fillText(word, 0, size * 0.035);
    g.fillStyle = orange ? '#2a0e04' : '#1a1714';
    g.fillText(word, 0, 0);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}

function Tiles({ words }: { words: string[] }) {
  const outer = useRef<(THREE.Group | null)[]>([]);
  const inner = useRef<(THREE.Group | null)[]>([]);
  const { gl } = useThree();
  const geo = useMemo(() => { const g = new RoundedBoxGeometry(PW, 1, PT, 4, 0.03); g.translate(0, 0.5, PT / 2); return g; }, []);
  const plane = useMemo(() => new THREE.PlaneGeometry(PW * 0.86, 0.92).translate(0, 0.5, PT + 0.0015), []);
  const ivory = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#ece4d4', roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.32, sheen: 0.5, sheenColor: new THREE.Color('#fff7e8'), sheenRoughness: 0.5 }), []);
  const orange = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#c9461a', roughness: 0.34, clearcoat: 0.8, clearcoatRoughness: 0.18 }), []);
  const faces = useMemo(() => words.map((w, i) => new THREE.MeshStandardMaterial({
    map: faceTex(w, !!T[i].orange, !!T[i].small), transparent: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2,
  })), [words]);
  useEffect(() => () => faces.forEach((m) => { m.map?.dispose(); m.dispose(); }), [faces]);
  useEffect(() => () => { gl.domElement.style.cursor = ''; }, [gl]);

  useFrame(() => {
    for (let i = 0; i < N; i++) {
      const g = inner.current[i]; if (g) g.rotation.x = -chain.angles[i];
      const o = outer.current[i];
      if (o && T[i].small) o.visible = FAN.indexOf(i) < chain.fanN;
    }
    const h = chain.hover;
    gl.domElement.style.cursor = h >= 0 && !T[h].small && (chain.angles[h] < 0.08 || T[h].today) ? 'pointer' : '';
  });

  return (
    <>
      {T.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} rotation-y={t.yaw} ref={(el) => { outer.current[i] = el; }}>
          <group ref={(el) => { inner.current[i] = el; }}>
            <group scale={t.h}>
              <mesh geometry={geo} material={t.orange ? orange : ivory} castShadow receiveShadow
                onPointerOver={(e) => { e.stopPropagation(); chain.hover = i; }}
                onPointerOut={() => { if (chain.hover === i) chain.hover = -1; }}
                onClick={(e) => { e.stopPropagation(); pushFrom(i); }} />
              {words[i] && <mesh geometry={plane} material={faces[i]} />}
            </group>
          </group>
        </group>
      ))}
    </>
  );
}

function Rig({ phone }: { phone: boolean }) {
  const { camera, scene } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const P = useMemo(() => STOPS.map((_, k) => poseOf(k, phone)), [phone]);
  const key = useRef<THREE.DirectionalLight>(null);
  const st = useRef({ f: 0, t0: -1 });
  const v = useMemo(() => ({ pos: new THREE.Vector3(), tgt: new THREE.Vector3(), d: new THREE.Vector3() }), []);

  useFrame((state, dtRaw) => {
    // Real time, so a slow machine sees the same story, only in fewer frames.
    const dt = Math.min(dtRaw, 0.25);
    const S = st.current, time = state.clock.elapsedTime;
    if (S.t0 < 0) S.t0 = time;
    chain.now = time;
    S.f = damp(S.f, fOf(scroll.y), 6, dt);
    chain.f = S.f;
    // Physics in small steps, so the bounces stay put on slow machines.
    const n = Math.min(40, Math.ceil(dt / (1 / 120)));
    for (let s = 0; s < n; s++) stepRow(dt / n);

    const f = clamp(S.f, 0, LAST_STOP);
    const i = Math.min(Math.floor(f), LAST_STOP - 1);
    const s = smooth(clamp(f - i));
    const A = P[i], B = P[i + 1];
    v.pos.lerpVectors(A.pos, B.pos, s);
    v.tgt.lerpVectors(A.tgt, B.tgt, s);
    // The opening: the lens eases in while the key comes up.
    const intro = smooth(clamp((time - S.t0) / 2.6));
    v.d.copy(v.pos).sub(v.tgt).multiplyScalar((1 - intro) * 0.35);
    cam.position.copy(v.pos).add(v.d);
    cam.lookAt(v.tgt);
    cam.fov = lerp(A.fov, B.fov, s);
    cam.updateProjectionMatrix();

    const dist = cam.position.distanceTo(v.tgt);
    const fog = scene.fog as THREE.Fog;
    fog.near = dist * 1.05; fog.far = dist * 3.4;

    const k = key.current;
    if (k) {
      const sc = Math.max(1, dist / 4);
      k.position.set(v.tgt.x - 3.2 * sc, v.tgt.y + 6 * sc, v.tgt.z + 4.2 * sc);
      k.target.position.copy(v.tgt); k.target.updateMatrixWorld();
      const c = k.shadow.camera; const e = 3.6 * sc;
      if (c.right !== e) { c.left = -e; c.right = e; c.top = e; c.bottom = -e; c.far = 30 * sc; c.updateProjectionMatrix(); }
      k.intensity = 2.6 * (0.3 + 0.7 * intro);
    }
  });

  const sm = phone ? 1024 : 2048;
  return (
    <>
      <directionalLight ref={key} color="#fff3e2" intensity={2.6} castShadow shadow-mapSize={[sm, sm]} shadow-bias={-0.0004} shadow-normalBias={0.025} />
      <directionalLight position={[6, 5, -14]} color="#f6f1ea" intensity={1.1} />
      <hemisphereLight args={['#f4efe6', '#9c958a', 0.7]} />
    </>
  );
}

function Sweep() {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, -20]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#cfc9bd" roughness={0.95} />
    </mesh>
  );
}

export default function Stage({ phone, fanWords, todayWord }: { phone: boolean; fanWords: string[]; todayWord: string }) {
  const [fonts, setFonts] = useState(false);
  useEffect(() => {
    let live = true;
    Promise.all([document.fonts.load('500 64px "Bodoni Moda Variable"'), document.fonts.load('600 64px "Bodoni Moda Variable"')])
      .catch(() => null).then(() => { if (live) setFonts(true); });
    return () => { live = false; };
  }, []);
  const words = useMemo(() => T.map((t, i) => {
    if (t.small) { const k = FAN.indexOf(i); return fanWords[k] ?? ''; }
    if (t.today) return todayWord;
    return t.word;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [fanWords.join('|'), todayWord, fonts]);

  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }} dpr={[1, phone ? 1.4 : 1.6]}
      camera={{ fov: 28, near: 0.05, far: 200, position: [1.2, 0.5, 3] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl, scene }) => { gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1.0; scene.fog = new THREE.Fog(SWEEP, 8, 30); }}
      onPointerMissed={() => { chain.hover = -1; }}
    >
      <color attach="background" args={[SWEEP]} />
      <Environment resolution={128} frames={1} environmentIntensity={0.55}>
        <Lightformer form="rect" intensity={2.6} color="#fff5e6" position={[-5, 5, 8]} rotation-y={-0.6} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#ffffff" position={[6, 6, -4]} rotation-y={Math.PI / 2} scale={[4, 12, 1]} />
        <Lightformer form="rect" intensity={1} color="#f2ece2" position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={[30, 30, 1]} />
      </Environment>
      <Rig phone={phone} />
      {fonts && <Tiles words={words} />}
      <Sweep />
      {!phone && (
        <EffectComposer multisampling={4}>
          <N8AO aoRadius={0.6} intensity={2} distanceFalloff={0.8} halfRes color="#3a342c" />
        </EffectComposer>
      )}
    </Canvas>
  );
}
