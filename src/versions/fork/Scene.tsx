// The row of tuning forks on a pale steel sweep, lit like a product shot. Scroll dollies the long lens
// from pair to pair; a strike bends the prongs with a decaying vertex sine.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { scroll } from '@/lib/scroll';
import { clamp, damp, smooth } from '@/lib/utils';
import { S, strikeForks, strikeStation, unlock, type Fork, type Station } from './plan';

const SWEEP = '#e2e5e7';
const W = 0.074, G = 0.1, RO = G / 2 + W, RI = G / 2, STEM = 0.34, BASE_H = 0.2, BASE_D = 0.5;

function uGeo(L: number) {
  const s = new THREE.Shape();
  s.moveTo(-RO, L);
  s.lineTo(-RO, 0);
  s.absarc(0, 0, RO, Math.PI, Math.PI * 2, false);
  s.lineTo(RO, L);
  s.lineTo(RI, L);
  s.lineTo(RI, 0);
  s.absarc(0, 0, RI, Math.PI * 2, Math.PI, true);
  s.lineTo(-RI, L);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.026, bevelSize: 0.022, bevelSegments: 6, curveSegments: 28, steps: 1 });
  g.translate(0, 0, -0.015);
  g.computeVertexNormals();
  return g;
}

type U = { uBend: { value: number }; uLen: { value: number } };
function steel(u: U) {
  const m = new THREE.MeshPhysicalMaterial({ color: '#dfe3e6', metalness: 1, roughness: 0.16, envMapIntensity: 1.5, clearcoat: 0.4, clearcoatRoughness: 0.08 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uBend = u.uBend; sh.uniforms.uLen = u.uLen;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uBend;\nuniform float uLen;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat hh = clamp(position.y / uLen, 0.0, 1.0);\ntransformed.x += sign(position.x) * uBend * hh * hh;');
  };
  m.customProgramCacheKey = () => 'fork-steel-bend';
  return m;
}

function labelTex(text: string) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const draw = () => {
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, 256, 128);
    g.fillStyle = '#a9b1b6';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `400 ${/^\d+$/.test(text) ? 68 : 92}px "EB Garamond Variable", Georgia, serif`;
    g.fillText(text, 128, 60);
    t.needsUpdate = true;
  };
  draw();
  document.fonts?.load('400 92px "EB Garamond Variable"', text).then(draw).catch(() => {});
  return t;
}

const baseMat = new THREE.MeshPhysicalMaterial({ color: '#131517', roughness: 0.62, metalness: 0.05, clearcoat: 0.25, clearcoatRoughness: 0.5 });
const stemMat = new THREE.MeshPhysicalMaterial({ color: '#cfd4d8', metalness: 1, roughness: 0.18, envMapIntensity: 1.3 });
const stemGeo = new THREE.CylinderGeometry(0.026, 0.03, STEM, 20);
const footGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.03, 24);

function cursor(e: ThreeEvent<PointerEvent>, on: boolean) {
  e.stopPropagation();
  document.body.style.cursor = on ? 'pointer' : '';
}

function ForkMesh({ f, i, geo }: { f: Fork; i: number; geo: THREE.ExtrudeGeometry }) {
  const u = useMemo<U>(() => ({ uBend: { value: 0 }, uLen: { value: f.len } }), [f.len]);
  const mat = useMemo(() => steel(u), [u]);
  useEffect(() => () => mat.dispose(), [mat]);
  const w = 52 + (f.freq % 37);
  useFrame(() => {
    const h = S.hits[i];
    if (!h) { u.uBend.value = 0; return; }
    const dt = S.now() - h.at;
    if (dt > 4.5) { u.uBend.value = 0; return; }
    u.uBend.value = h.amp * 0.05 * Math.exp(-1.1 * dt) * Math.sin(w * dt);
  });
  const hit = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation(); unlock();
    const st = S.stations[f.station];
    if (st.kind === 'row') strikeForks([i]); else strikeStation(f.station, { fork: i });
  };
  // brushing past a fork makes it shiver a little, silently
  const brush = (e: ThreeEvent<PointerEvent>) => {
    cursor(e, true);
    const h = S.hits[i];
    if (!h || S.now() - h.at > 1.6) S.hits[i] = { at: S.now(), amp: 0.2 };
  };
  return (
    <group position={[f.x, BASE_H, f.z]} scale={f.scale}>
      <mesh geometry={footGeo} material={stemMat} position={[0, 0.015, 0]} castShadow />
      <mesh geometry={stemGeo} material={stemMat} position={[0, STEM / 2, 0]} castShadow onClick={hit} onPointerOver={(e) => cursor(e, true)} onPointerOut={(e) => cursor(e, false)} />
      <mesh geometry={geo} material={mat} position={[0, STEM + RO, 0]} castShadow onClick={hit} onPointerOver={brush} onPointerOut={(e) => cursor(e, false)} />
    </group>
  );
}

function Base({ st, k, b, onRow }: { st: Station; k: number; b: Station['bases'][number]; onRow: () => void }) {
  const geo = useMemo(() => new RoundedBoxGeometry(b.w, BASE_H, BASE_D, 4, 0.035), [b.w]);
  const tex = useMemo(() => (b.label ? labelTex(b.label) : null), [b.label]);
  useEffect(() => () => { geo.dispose(); tex?.dispose(); }, [geo, tex]);
  const hit = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation(); unlock();
    if (st.kind === 'row') onRow(); else strikeStation(k);
  };
  return (
    <group position={[st.x + b.x, BASE_H / 2, st.z]}>
      <mesh geometry={geo} material={baseMat} castShadow receiveShadow onClick={hit} onPointerOver={(e) => cursor(e, true)} onPointerOut={(e) => cursor(e, false)} />
      {tex && (
        <mesh position={[0, -0.005, BASE_D / 2 + 0.002]}>
          <planeGeometry args={[0.36, 0.18]} />
          <meshBasicMaterial map={tex} transparent toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

// Per kind: camera distance, height, look height, look x offset.
const CAM: Record<Station['kind'], [number, number, number, number]> = {
  pair: [9.4, 1.55, 1.0, 0.25], one: [8.6, 1.45, 0.95, 0.2], two: [12.2, 1.7, 0.95, 0.15], row: [7.6, 1.25, 0.55, 0.55], end: [9.4, 1.55, 1.0, 0.25],
};

function Rig({ onRow }: { onRow: () => void }) {
  const { camera, size } = useThree();
  const key = useMemo(() => new THREE.DirectionalLight('#ffffff', 2.4), []);
  const st = useRef({ secs: [] as { top: number; h: number }[], secT: 0, k: -1, pend: -1, pendAt: 0, x: 0, z: 0, d: 9.4, h: 1.55, ly: 1, lx: 0.25, init: false, end: 0 }).current;
  const phone = size.width < 700;
  useEffect(() => {
    key.castShadow = true;
    const n = phone ? 1024 : 2048;
    key.shadow.mapSize.set(n, n); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 6;
    const c = key.shadow.camera; c.left = -5; c.right = 5; c.top = 5; c.bottom = -5; c.near = 1; c.far = 30; c.updateProjectionMatrix();
  }, [key, phone]);
  const look = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20);
    const stations = S.stations;
    if (!stations.length) return;
    st.secT -= dt;
    if (st.secT <= 0 || !st.secs.length) {
      st.secs = [...document.querySelectorAll<HTMLElement>('.v-fork [data-st]')].map((el) => { const r = el.getBoundingClientRect(); return { top: r.top + window.scrollY, h: Math.max(1, r.height) }; });
      st.secT = 0.8;
    }
    const ref = scroll.y + window.innerHeight * (phone ? 0.62 : 0.5);
    let k = 0;
    for (let i = 0; i < st.secs.length; i++) if (st.secs[i].top <= ref) k = i;
    k = Math.min(k, stations.length - 1);
    const sec = st.secs[k];
    const f = sec ? clamp((ref - sec.top) / sec.h) : 0;
    const e = k < stations.length - 1 ? smooth(clamp((f - 0.78) / 0.22)) : 0;
    const A = stations[k], B = stations[Math.min(k + 1, stations.length - 1)];
    const ca = CAM[A.kind], cb = CAM[B.kind];
    const tx = A.x + (B.x - A.x) * e, tz = A.z + (B.z - A.z) * e;
    // the ending: the last pair, then the lens pulls back to show the whole row behind it
    const docEnd = document.documentElement.scrollHeight - window.innerHeight;
    const endT = A.kind === 'end' ? smooth(clamp((scroll.y - (docEnd - window.innerHeight * 0.9)) / (window.innerHeight * 0.9))) : 0;
    const want = { d: ca[0] + (cb[0] - ca[0]) * e, h: ca[1] + (cb[1] - ca[1]) * e, ly: ca[2] + (cb[2] - ca[2]) * e, lx: ca[3] + (cb[3] - ca[3]) * e };
    if (!st.init) { Object.assign(st, { x: tx, z: tz, ...want, init: true }); }
    const r = 2.6;
    st.x = damp(st.x, tx, r, dt); st.z = damp(st.z, tz, r, dt);
    st.d = damp(st.d, want.d, r, dt); st.h = damp(st.h, want.h, r, dt); st.ly = damp(st.ly, want.ly, r, dt); st.lx = damp(st.lx, want.lx, r, dt);
    const sway = Math.sin(state.clock.elapsedTime * 0.21) * 0.06;
    st.end = damp(st.end, endT, 2.2, dt);
    const q = smooth(st.end), L = stations[stations.length - 1];
    camera.position.set(
      (st.x - 0.5 - st.d * 0.06 + sway) * (1 - q) + (L.x - 5) * q,
      st.h * (1 - q) + 3 * q,
      (st.z + st.d) * (1 - q) + (L.z + 20) * q,
    );
    look.set((st.x + st.lx) * (1 - q) + (L.x - 3.5) * q, st.ly * (1 - q) + 0.9 * q, st.z * (1 - q) + (L.z + 4) * q);
    camera.lookAt(look);
    const pc = camera as THREE.PerspectiveCamera;
    const fov = 18 + q * 10;
    if (Math.abs(pc.fov - fov) > 0.01) { pc.fov = fov; pc.updateProjectionMatrix(); }
    const kx = st.x * (1 - q) + (L.x - 4) * q, kz = st.z * (1 - q) + (L.z + 5) * q;
    key.position.set(kx - 3.2, 7.5, kz + 4.5);
    key.target.position.set(kx, 0, kz);
    key.target.updateMatrixWorld();
    key.shadow.camera.left = -5 - q * 6; key.shadow.camera.right = 5 + q * 6; key.shadow.camera.top = 5 + q * 6; key.shadow.camera.bottom = -5 - q * 6; key.shadow.camera.updateProjectionMatrix();

    // arriving at a pair strikes it softly (silent until the visitor has tapped once)
    if (k !== st.k) {
      // the opening: the first pair is struck once, softly, as the page arrives
      st.pend = k; st.pendAt = state.clock.elapsedTime + (st.k >= 0 ? 0.7 : 1.6);
      st.k = k;
      S.cur = k;
    }
    if (st.pend >= 0 && state.clock.elapsedTime > st.pendAt) {
      if (st.pend === st.k && stations[st.pend].kind !== 'row') strikeStation(st.pend, { soft: true });
      st.pend = -1;
    }
  });
  return (
    <>
      <primitive object={key} />
      <primitive object={key.target} />
      <Row onRow={onRow} center={() => st.k} />
    </>
  );
}

function Row({ onRow, center }: { onRow: () => void; center: () => number }) {
  const stations = S.stations, forks = S.forks;
  const geos = useMemo(() => {
    const m = new Map<number, THREE.ExtrudeGeometry>();
    for (const f of forks) if (!m.has(f.len)) m.set(f.len, uGeo(f.len));
    return m;
  }, [forks]);
  useEffect(() => () => geos.forEach((g) => g.dispose()), [geos]);
  const groups = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    const c = Math.max(0, center());
    const all = c >= stations.length - 1;
    groups.current.forEach((g, k) => { if (g) g.visible = all || (k >= c && k <= c + 4); });
  });
  return (
    <>
      {stations.map((st, k) => (
        <group key={k} ref={(g) => { groups.current[k] = g; }}>
          {st.bases.map((b, j) => <Base key={j} st={st} k={k} b={b} onRow={onRow} />)}
          {st.forks.map((i) => <ForkMesh key={i} f={forks[i]} i={i} geo={geos.get(forks[i].len)!} />)}
        </group>
      ))}
    </>
  );
}

function Floor() {
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[20, 0, -30]}>
        <planeGeometry args={[400, 400]} />
        <meshBasicMaterial color={SWEEP} toneMapped={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[20, 0.001, -30]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <shadowMaterial opacity={0.2} color="#2a3136" />
      </mesh>
    </>
  );
}

export default function Scene({ onRow, rowKey }: { onRow: () => void; rowKey: string }) {
  return (
    <Canvas
      className="fk-gl"
      data-gl
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, 1.6]}
      camera={{ fov: 18, near: 0.5, far: 120, position: [0, 1.6, 10] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ touchAction: 'pan-y' }}
      onPointerMissed={() => { document.body.style.cursor = ''; }}
    >
      <color attach="background" args={[SWEEP]} />
      <fog attach="fog" args={[SWEEP, 16, 46]} />
      <ambientLight intensity={0.35} />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#98a1a7']} />
        <Lightformer form="rect" intensity={3.2} position={[0, 6, 1]} rotation-x={Math.PI / 2} scale={[16, 1.8, 1]} />
        <Lightformer form="rect" intensity={3.4} position={[-4, 1.6, 6]} rotation-y={-Math.PI / 5} scale={[1.4, 9, 1]} />
        <Lightformer form="rect" intensity={0.5} color="#3a4045" position={[2.5, 1.5, 7]} rotation-y={Math.PI} scale={[2, 9, 1]} />
        <Lightformer form="rect" intensity={1.1} position={[5, 1.4, 4]} rotation-y={Math.PI / 3} scale={[0.6, 7, 1]} />
        <Lightformer form="rect" intensity={4} position={[0, 2.5, -7]} scale={[12, 2.4, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#dfe6ea" position={[0, -3, 3]} rotation-x={-Math.PI / 2} scale={[12, 6, 1]} />
      </Environment>
      <Floor />
      <Rig key={rowKey} onRow={onRow} />
    </Canvas>
  );
}
