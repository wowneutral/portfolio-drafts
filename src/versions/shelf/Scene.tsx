// The shelf: heavy cloth volumes on a painted ledge against warm paper, lit from
// above and to the left like a product photograph. Every volume is a small
// damped spring: it tips forward on its bottom front edge when its section is
// open, and leans on its neighbour when the row is pushed, then stands back up.
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, RoundedBox, Text } from '@react-three/drei';
import fontUrl from '@fontsource/bodoni-moda/files/bodoni-moda-latin-600-normal.woff?url';
import { still, coarse } from '@/lib/utils';
import { st, shelfLength, type Book } from './books';

const CLOTH: Record<string, { c: string; r: number; stamp: string; deep: string }> = {
  green: { c: '#22503f', r: 0.86, stamp: '#d8d1bd', deep: '#0f261d' },
  black: { c: '#1d1c1a', r: 0.8, stamp: '#e9e2cf', deep: '#050505' },
  card: { c: '#d3c7af', r: 0.92, stamp: '#2a2620', deep: '#a99d86' },
  paint: { c: '#d2cab9', r: 0.7, stamp: '#1f1c18', deep: '#b3aa97' },
  board: { c: '#2b2925', r: 0.78, stamp: '#1d1b17', deep: '#121110' },
};

/** A fine woven bump, for the cloth. */
function weave() {
  const s = 128, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d')!;
  g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
  let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < s; i += 2) {
    g.fillStyle = `rgba(255,255,255,${0.12 + rnd() * 0.2})`; g.fillRect(0, i, s, 1);
    g.fillStyle = `rgba(0,0,0,${0.1 + rnd() * 0.2})`; g.fillRect(i, 0, 1, s);
  }
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? 255 : 0},${rnd() > 0.5 ? 255 : 0},${rnd() > 0.5 ? 255 : 0},0.08)`; g.fillRect(rnd() * s, rnd() * s, 1 + rnd() * 3, 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 9); t.anisotropy = 4;
  return t;
}

type Spring = { a: number; v: number };
const step = (s: Spring, to: number, k: number, c: number, dt: number) => {
  if (still) { s.a = to; s.v = 0; return; }
  // Sub-step, so a slow frame never makes the springs lag behind the clock.
  for (let n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n; n > 0; n--) { s.v += (k * (to - s.a) - c * s.v) * h; s.a += s.v * h; }
};

function Volume({ b, i, n, bump, onPick, sheetDate }: { b: Book; i: number; n: number; bump: THREE.Texture; onPick: (b: Book) => void; sheetDate: string }) {
  const lean = useRef<THREE.Group>(null!);
  const inner = useRef<THREE.Group>(null!);
  const tipG = useRef<THREE.Group>(null!);
  const flats = useRef<THREE.Group>(null!);
  const sheet = useRef<THREE.Group>(null!);
  const sp = useRef({ tip: { a: 0, v: 0 }, lean: { a: 0, v: 0 }, slide: { a: 0, v: 0 }, sheet: { a: 0, v: 0 } });
  const cl = CLOTH[b.cloth];
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: cl.c, roughness: cl.r, bumpMap: b.cloth === 'paint' ? null : bump, bumpScale: 1.4 }), [cl, bump, b.cloth]);
  const board = useMemo(() => new THREE.MeshStandardMaterial({ color: cl.c, roughness: cl.r, bumpMap: bump, bumpScale: 1 }), [cl, bump]);
  const blackMat = useMemo(() => new THREE.MeshStandardMaterial({ color: CLOTH.black.c, roughness: 0.8, bumpMap: bump, bumpScale: 1.2 }), [bump]);
  const pages = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ece3cf', roughness: 0.95 }), []);
  const { w, h, d } = b;
  const word = b.label.toUpperCase();
  const fs = b.across ? 0.085 : Math.min(w * 0.34, 0.17, (h * 0.6) / (word.length * 0.86));

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.25);
    const s = sp.current;
    const on = b.repo ? st.repo === b.repo && st.active.includes('github') : st.active.includes(b.id);
    const tip = on ? (b.across ? 0.22 : 0.4) : st.hover === i ? 0.09 : (b.repo && st.active.includes('github') ? 0.04 : 0);
    step(s.tip, tip, 70, 10, dt);
    // The push: a wave from the end that was pushed, each volume a beat after the last.
    const j = st.push.dir > 0 ? i : n - 1 - i;
    const t = st.now - st.push.t0 - j * 0.05;
    const leanTo = t > 0 && t < 1.1 + (n - j) * 0.03 ? -st.push.dir * (j === n - 1 ? 0.12 : 0.19) : 0;
    step(s.lean, leanTo, 95, 8.5, dt);
    const a = s.lean.a;
    // Lean about the bottom corner on the side it falls toward.
    const px = a < 0 ? w / 2 : -w / 2;
    lean.current.position.x = b.x + px;
    lean.current.rotation.z = a;
    inner.current.position.x = -px;
    tipG.current.rotation.x = s.tip.a;
    tipG.current.position.z = s.tip.a * 1.25;
    if (flats.current) { step(s.slide, st.active.includes('next') ? 0.42 : 0, 60, 11, dt); flats.current.position.z = s.slide.a; }
    if (sheet.current) { step(s.sheet, st.sheet ? 0.62 : 0, 60, 9, dt); sheet.current.position.y = h - 0.36 + s.sheet.a; }
  });

  const over = (e: { stopPropagation: () => void }) => { e.stopPropagation(); st.hover = i; document.body.style.cursor = 'pointer'; };
  const out = () => { if (st.hover === i) st.hover = -1; document.body.style.cursor = ''; };

  return (
    <group ref={lean}>
      <group ref={inner}>
        {/* the pivot is the bottom front edge */}
        <group position={[0, 0, d / 2]}>
          <group ref={tipG}>
            <group position={[0, 0, -d / 2]} onClick={(e) => { e.stopPropagation(); onPick(b); }} onPointerOver={over} onPointerOut={out}>
              {b.cloth === 'paint' || b.cloth === 'board' ? (
                <RoundedBox args={[w, h, d]} radius={b.cloth === 'board' ? 0.03 : 0.025} smoothness={3} position={[0, h / 2, 0]} castShadow receiveShadow material={mat} />
              ) : (
                <>
                  <mesh position={[-w / 2 + 0.018, h / 2, -0.03]} castShadow receiveShadow material={board}><boxGeometry args={[0.036, h, d - 0.06]} /></mesh>
                  <mesh position={[w / 2 - 0.018, h / 2, -0.03]} castShadow receiveShadow material={board}><boxGeometry args={[0.036, h, d - 0.06]} /></mesh>
                  <mesh position={[0, h / 2 - 0.01, -0.05]} castShadow receiveShadow material={pages}><boxGeometry args={[w - 0.06, h - 0.07, d - 0.14]} /></mesh>
                  <RoundedBox args={[w, h, 0.16]} radius={Math.min(0.07, w / 2 - 0.004)} smoothness={4} position={[0, h / 2, d / 2 - 0.08]} castShadow receiveShadow material={mat} />
                  {b.cloth !== 'card' && [0.16, h - 0.16].map((y) => (
                    <mesh key={y} position={[0, y, d / 2 + 0.003]} material={mat}><boxGeometry args={[w * 0.92, 0.026, 0.012]} /></mesh>
                  ))}
                </>
              )}
              {b.cloth === 'board' && (
                <mesh position={[0, h * 0.56, d / 2 + 0.002]}><planeGeometry args={[w * 0.72, h * 0.56]} /><meshStandardMaterial color="#e7e0cf" roughness={0.95} /></mesh>
              )}
              {/* blind stamped: a pale impression with a dark lip under it */}
              {b.across ? (
                <>
                  <Text font={fontUrl} fontSize={fs} maxWidth={w * 0.8} textAlign="center" lineHeight={1.15} letterSpacing={0.1} anchorX="center" anchorY="middle" color={cl.stamp} position={[0, h * 0.52, d / 2 + 0.004]}>{word}</Text>
                </>
              ) : (
                <group position={[0, h * (b.foot ? 0.6 : 0.56), d / 2 + 0.004]} rotation={[0, 0, -Math.PI / 2]}>
                  <Text font={fontUrl} fontSize={b.repo ? Math.min(w * 0.42, 0.075) : fs} letterSpacing={b.repo ? 0.02 : 0.14} anchorX="center" anchorY="middle" color={cl.deep} position={[0.006, -0.006, -0.001]}>{b.repo ? b.label : word}</Text>
                  <Text font={fontUrl} fontSize={b.repo ? Math.min(w * 0.42, 0.075) : fs} letterSpacing={b.repo ? 0.02 : 0.14} anchorX="center" anchorY="middle" color={b.repo ? '#1d1b17' : cl.stamp}>{b.repo ? b.label : word}</Text>
                </group>
              )}
              {b.foot && (
                <group position={[0, h * 0.2, d / 2 + 0.004]} rotation={[0, 0, -Math.PI / 2]}>
                  <Text font={fontUrl} fontSize={0.072} letterSpacing={0.08} anchorX="center" anchorY="middle" color={cl.stamp}>{b.foot.toUpperCase()}</Text>
                </group>
              )}
              {b.id === 'skeptical' && (
                <group ref={flats}>
                  {[{ y: 0.1, c: 'black', t: 'Isidore Newman', r: 0.02 }, { y: 0.31, c: 'green', t: 'DSDS1', r: -0.035 }].map((f) => (
                    <group key={f.t} position={[0.17, h + f.y, -0.02]} rotation={[0, f.r, 0]}>
                      <RoundedBox args={[1.12, 0.2, 1.3]} radius={0.04} smoothness={3} castShadow receiveShadow material={f.c === 'black' ? blackMat : mat} />
                      <Text font={fontUrl} fontSize={0.075} letterSpacing={0.12} anchorX="center" anchorY="middle" color={CLOTH[f.c].stamp} position={[0, 0, 0.652]}>{f.t.toUpperCase()}</Text>
                    </group>
                  ))}
                </group>
              )}
              {b.id === 'today' && (
                <group ref={sheet} position={[0.03, h - 0.36, d / 2 - 0.24]} rotation={[-0.05, 0, 0.06]}>
                  <mesh castShadow><boxGeometry args={[0.42, 0.72, 0.006]} /><meshStandardMaterial color="#f8f5ee" roughness={0.9} /></mesh>
                  <Text font={fontUrl} fontSize={0.07} anchorX="center" anchorY="middle" color="#1f1c18" position={[0, 0.25, 0.004]} maxWidth={0.38} textAlign="center" lineHeight={1}>{sheetDate}</Text>
                </group>
              )}
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

function Rig({ L }: { L: number }) {
  const { camera, size } = useThree();
  // The authored opening: a moment after the shelf appears, the row leans once and stands back up.
  const opened = useRef(false);
  const key = useRef<THREE.DirectionalLight>(null!);
  const fx = useRef(-1);
  const tgt = useMemo(() => new THREE.Object3D(), []);
  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 30);
    st.now = state.clock.elapsedTime;
    if (!opened.current && !still && st.now > 1.4) { opened.current = true; if (window.scrollY < 40) st.push = { t0: st.now, dir: 1 }; }
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const V0 = aspect < 1.4 ? 3.9 : 3.75;
    let V = V0 / Math.max(0.35, 1 - st.stuck);
    const fit = (L + 3.4) / aspect;
    V = V + (Math.max(V, fit) - V) * st.pull;
    const half = (V * aspect) / 2;
    let f = Math.min(Math.max(st.focus, half - 1.1), L - half + 1.1);
    if (half * 2 > L + 1) f = L / 2;
    f = f + (L / 2 - f) * st.pull;
    if (fx.current < -0.5 || still) fx.current = f; else fx.current += (f - fx.current) * (1 - Math.exp(-dt * 3.2));
    const D = 19;
    const cy = 1.22 + (V - V0) / 2;
    cam.fov = (2 * Math.atan(V / 2 / D) * 180) / Math.PI;
    cam.position.set(fx.current + 1.1, cy + 4.4, D);
    cam.lookAt(fx.current, cy, 0);
    cam.updateProjectionMatrix();
    key.current.position.set(fx.current - 6, 10, 8);
    tgt.position.set(fx.current, 0.6, 0);
    key.current.target = tgt;
    const sc = key.current.shadow.camera;
    const r = Math.max(7, half + 2);
    if (sc.right !== r) { sc.left = -r; sc.right = r; sc.top = 7; sc.bottom = -4; sc.updateProjectionMatrix(); }
  });
  return (
    <>
      <primitive object={tgt} />
      <directionalLight ref={key} intensity={2.9} color="#fff6e8" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02} />
      <directionalLight position={[14, 5, -6]} intensity={0.7} color="#eef0ff" />
      <hemisphereLight args={['#fffaf0', '#cfc6b4', 0.75]} />
    </>
  );
}

export default function Scene({ books, onPick, sheetDate }: { books: Book[]; onPick: (b: Book) => void; sheetDate: string }) {
  const bump = useMemo(weave, []);
  const L = shelfLength(books);
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }} dpr={[1, coarse ? 1.4 : 1.6]} camera={{ fov: 12, near: 1, far: 80, position: [4, 4, 19] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }} style={{ touchAction: 'pan-y' }}
      onPointerMissed={() => { st.hover = -1; }}
    >
      <color attach="background" args={['#ebe7de']} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.4} color="#fff8ec" position={[-4, 8, 6]} rotation-x={Math.PI / 2} scale={[16, 5, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#f4efe4" position={[0, 3, 14]} rotation-y={Math.PI} scale={[30, 6, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#e9e2d4" position={[10, 3, 2]} rotation-y={-Math.PI / 2} scale={[4, 8, 1]} />
      </Environment>
      <Rig L={L} />
      {/* the painted ledge and the paper wall */}
      <mesh position={[L / 2, -0.09, 0.08]} receiveShadow castShadow>
        <boxGeometry args={[L + 9, 0.18, 2.1]} />
        <meshStandardMaterial color="#d6cebe" roughness={0.62} />
      </mesh>
      <mesh position={[L / 2, 2, -0.99]}>
        <planeGeometry args={[L + 80, 40]} />
        <meshBasicMaterial color="#ebe7de" toneMapped={false} />
      </mesh>
      <mesh position={[L / 2, 2, -0.98]} receiveShadow>
        <planeGeometry args={[L + 80, 40]} />
        <shadowMaterial color="#3b3326" opacity={0.2} />
      </mesh>
      {books.map((b, i) => <Volume key={b.id + (b.repo ?? '') + i} b={b} i={i} n={books.length} bump={bump} onPick={onPick} sheetDate={sheetDate} />)}
    </Canvas>
  );
}
