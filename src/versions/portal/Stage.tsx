// Remixed from pmndrs/examples "enter-portals" (src/App.tsx, MIT): three golden-ratio portal cards, MeshPortalMaterial blend, maath easing, camera rig.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentRef, ReactNode } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, MeshPortalMaterial, Text } from '@react-three/drei';
import { easing, geometry } from 'maath';
import { DEBATE, PERSON, RESEARCH, WORK } from '@/content';
import { clamp, lerp, smooth } from '@/lib/utils';
import fontMedium from '@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-500-normal.woff?url';
import fontBold from '@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-700-normal.woff?url';
import CHAMP from './champion.json';
import { noiseTexture, sweepGeometry, wordSolid } from './geo';
import { FACES, S } from './store';

const INK = '#151515', RED = '#d2401f';
const H = 1.61803398875;
const FAN = [0.5, 0, -0.5];
const FLOOR = -0.62;
const cards: THREE.Group[] = [];

/* ───────── the three windows ───────── */

function Frame({ i, word, n, children }: { i: number; word: string; n: string; children: ReactNode }) {
  const group = useRef<THREE.Group>(null!);
  const portal = useRef<ComponentRef<typeof MeshPortalMaterial>>(null!);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const num = useRef<any>(null);
  const plane = useMemo(() => new geometry.RoundedPlaneGeometry(1, H, 0.1), []);
  useEffect(() => { cards[i] = group.current; }, [i]);
  useFrame((_, dt) => {
    const g = group.current;
    const lift = S.hover === i && S.open < 0 ? 1 : 0;
    const fan = S.end || S.phone ? 0 : FAN[i];
    easing.damp(g.rotation, 'y', fan * (1 - 0.55 * lift), 0.3, dt);
    easing.damp(g.position, 'z', lift * 0.16, 0.25, dt);
    easing.damp(g.position, 'y', lift * 0.05, 0.25, dt);
    easing.damp(portal.current, 'blend', S.open === i ? 1 : 0, 0.2, dt);
    const hot = S.open === i || lift > 0;
    if (num.current && num.current.color !== (hot ? RED : INK)) { num.current.color = hot ? RED : INK; num.current.sync?.(); }
  });
  return (
    <group ref={group} position={[(i - 1) * 1.15, 0, 0]}>
      <Text font={fontMedium} fontSize={0.135} letterSpacing={-0.035} anchorY="top" anchorX="left" position={[-0.4, 0.72, 0.01]} color={INK} material-toneMapped={false}>
        {word}
      </Text>
      <Text ref={num} font={fontMedium} fontSize={0.09} anchorX="right" anchorY="bottom" position={[0.4, -0.73, 0.01]} color={INK} material-toneMapped={false}>
        {n}
      </Text>
      <mesh geometry={plane}>
        <MeshPortalMaterial ref={portal} side={THREE.DoubleSide} blur={0} resolution={512}>
          <color attach="background" args={[FACES[i]]} />
          <Shift i={i}>{children}</Shift>
        </MeshPortalMaterial>
      </mesh>
    </group>
  );
}

/* ───────── shared set dressing: one key, one rim, a sweep ───────── */

function Studio({ color, env }: { color: string; env?: boolean }) {
  const sweep = useMemo(() => sweepGeometry(9, 3, -5.2, 1.6, 6), []);
  const tooth = useMemo(() => noiseTexture(128, (g, rnd, s) => {
    const im = g.createImageData(s, s);
    for (let i = 0; i < s * s; i++) { const v = 128 + (rnd() - 0.5) * 40; im.data.set([v, v, v, 255], i * 4); }
    g.putImageData(im, 0, 0);
  }, 6), []);
  return (
    <>
      <hemisphereLight args={['#fffaf0', '#8a8478', 0.9]} />
      <directionalLight position={[2.6, 4.2, 1.8]} intensity={2.4} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.02}
        shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-4} shadow-camera-near={0.5} shadow-camera-far={16} />
      <directionalLight position={[-3, 1.6, -5]} intensity={1.3} color="#fff4e6" />
      <mesh geometry={sweep} position={[0, FLOOR, 0]} receiveShadow>
        <meshStandardMaterial color={color} roughness={0.95} bumpMap={tooth} bumpScale={0.15} />
      </mesh>
      {env && (
        <Environment resolution={128} frames={1}>
          <Lightformer intensity={2.2} position={[0, 4, 2]} scale={[6, 1.4, 1]} rotation-x={Math.PI / 2} />
          <Lightformer intensity={1.4} position={[-4, 1, 1]} scale={[3, 2, 1]} rotation-y={Math.PI / 2} />
          <Lightformer intensity={0.8} position={[4, 1, -2]} scale={[2, 3, 1]} rotation-y={-Math.PI / 2} />
        </Environment>
      )}
    </>
  );
}

/* ───────── Debater: two CHAMPION lines, heavy black lacquer on sand ───────── */

const LINES = [
  { x: -0.04, z: -1.6, ry: 0.05 },
  { x: 1.75, z: -3.0, ry: -0.18 },
];

function Debater() {
  const { geo, ink } = useMemo(() => {
    const peel = noiseTexture(256, (g, rnd, s) => {
      g.fillStyle = '#808080'; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 1200; i++) {
        const x = rnd() * s, y = rnd() * s, r = 3 + rnd() * 9, c = rnd() < 0.5 ? 255 : 0;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `rgba(${c},${c},${c},0.09)`); gr.addColorStop(1, `rgba(${c},${c},${c},0)`);
        g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }, 2.2);
    return {
      geo: wordSolid(CHAMP.glyphs, 859.38, 0.28, 0.13, 0.011),
      ink: new THREE.MeshPhysicalMaterial({ color: '#13110d', roughness: 0.48, clearcoat: 1, clearcoatRoughness: 0.12, bumpMap: peel, bumpScale: 0.4, envMapIntensity: 1 }),
    };
  }, []);
  return (
    <>
      <Studio color={FACES[0]} env />
      {DEBATE.wins.map((w, k) => (
        <group key={w.where} position={[LINES[k].x, FLOOR, LINES[k].z]} rotation-y={LINES[k].ry}>
          <mesh geometry={geo} material={ink} castShadow receiveShadow />
          <Text font={fontBold} fontSize={0.05} anchorX="center" anchorY="top" position={[0, 0.002, 0.2]} rotation-x={-Math.PI / 2} color={INK} lineHeight={1.25} textAlign="center">
            {`${w.event}\n${w.where}, ${w.when}`}
          </Text>
        </group>
      ))}
    </>
  );
}

/* ───────── Researcher: fifteen sheets that fan open as the abstract is read ───────── */

const SW = 0.46, SH = 0.65;

function Researcher() {
  const paper = RESEARCH[0] as Required<(typeof RESEARCH)[0]>;
  const N = paper.pages;
  const sheets = useRef<THREE.Group[]>([]);
  const mats = useMemo(() => {
    const tooth = noiseTexture(128, (g, rnd, s) => {
      const im = g.createImageData(s, s);
      for (let i = 0; i < s * s; i++) { const v = 128 + (rnd() - 0.5) * 50; im.data.set([v, v, v, 255], i * 4); }
      g.putImageData(im, 0, 0);
    }, 3);
    return {
      sheet: new THREE.MeshStandardMaterial({ color: '#f8f7f2', roughness: 0.92, bumpMap: tooth, bumpScale: 0.2 }),
      box: new THREE.BoxGeometry(SW, SH, 0.0026),
    };
  }, []);
  const jitter = useMemo(() => Array.from({ length: N }, (_, k) => [Math.sin(k * 12.9) * 0.01, Math.cos(k * 7.1) * 0.004]), [N]);
  useFrame((_, dt) => {
    const t = smooth(clamp(S.t[1] * 1.3));
    sheets.current.forEach((g, k) => {
      if (!g) return;
      easing.damp(g.rotation, 'y', jitter[k][0] - t * (k / (N - 1)) * 1.1, 0.35, dt);
    });
  });
  return (
    <>
      <Studio color={FACES[1]} />
      <group position={[-0.24, FLOOR, -1.85]} rotation-x={-0.1} rotation-y={0.12}>
        {jitter.map((j, k) => (
          <group key={k} ref={(el) => { if (el) sheets.current[k] = el; }} position={[j[1], 0.001, k * 0.0034]}>
            <mesh geometry={mats.box} material={mats.sheet} position={[SW / 2, SH / 2, 0]} castShadow receiveShadow />
            {k === N - 1 && (
              <group position={[SW / 2, SH / 2, 0.0016]}>
                <Text font={fontBold} fontSize={0.03} maxWidth={0.36} lineHeight={1.18} anchorX="left" anchorY="top" position={[-0.19, 0.27, 0]} color={INK}>
                  {paper.title}
                </Text>
                <Text font={fontMedium} fontSize={0.0155} maxWidth={0.36} lineHeight={1.5} anchorX="left" anchorY="top" position={[-0.19, 0.1, 0]} color="#3a3833">
                  {paper.abstract}
                </Text>
                <Text font={fontMedium} fontSize={0.013} anchorX="left" anchorY="bottom" position={[-0.19, -0.29, 0]} color="#3a3833">
                  {`doi ${paper.doi}`}
                </Text>
              </group>
            )}
          </group>
        ))}
      </group>
    </>
  );
}

/* ───────── Builder: eight thick prints on stone, one steps forward per project ───────── */

const R = 2.7, STEP = 0.2;
const printAt = (k: number) => { const a = (k - 3.5) * STEP; return { a, x: Math.sin(a) * R, z: 0.4 - Math.cos(a) * R }; };

function Builder() {
  const prints = useRef<THREE.Group[]>([]);
  const parts = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const edge = new THREE.MeshStandardMaterial({ color: '#f3f1ea', roughness: 0.85 });
    return WORK.map((w) => {
      const tex = loader.load(import.meta.env.BASE_URL + w.img);
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 });
      const ratio = w.slug === 'jarvis' ? 852 / 1200 : w.slug === 'drafts' ? 766 / 1200 : 0.56;
      const W = 0.6, Hh = W * ratio;
      return { geo: new THREE.BoxGeometry(W, Hh, 0.026), mats: [edge, edge, edge, edge, face, edge], h: Hh };
    });
  }, []);
  useFrame((_, dt) => {
    prints.current.forEach((g, k) => {
      if (!g) return;
      const on = S.work === k ? 1 : 0;
      const p = printAt(k);
      easing.damp(g.position, 'x', p.x - on * 0.55 * Math.sin(p.a), 0.3, dt);
      easing.damp(g.position, 'z', p.z + on * 0.55 * Math.cos(p.a), 0.3, dt);
      easing.damp(g.position, 'y', FLOOR + parts[k].h / 2 + 0.004 + on * 0.06, 0.3, dt);
      easing.damp(g.rotation, 'x', on ? 0 : -0.1, 0.3, dt);
    });
  });
  return (
    <>
      <Studio color={FACES[2]} />
      {parts.map((p, k) => {
        const a = printAt(k);
        return (
          <group key={k} ref={(el) => { if (el) prints.current[k] = el; }} position={[a.x, FLOOR + p.h / 2, a.z]} rotation={[-0.1, -a.a, 0]} rotation-order="YXZ">
            <mesh geometry={p.geo} material={p.mats} castShadow receiveShadow />
          </group>
        );
      })}
    </>
  );
}

/* ───────── the rig: fitted to the DOM in the hall, walked by scroll in the rooms ───────── */


const SHIFT = [0.9, 0, 1.25];
/** Each world slides sideways with its card's turn, so a turned window still looks at its centre piece. */
function Shift({ i, children }: { i: number; children: ReactNode }) {
  const g = useRef<THREE.Group>(null!);
  useFrame(() => { if (cards[i]) g.current.position.x = cards[i].rotation.y * SHIFT[i]; });
  return <group ref={g}>{children}</group>;
}

function inside(i: number, t: number, pos: THREE.Vector3, look: THREE.Vector3) {
  if (i === 0) {
    const a = smooth(clamp(t * 2.2)), b = smooth(clamp(t * 2 - 0.9));
    pos.set(lerp(lerp(0, -0.04, a), 1.95, b), lerp(lerp(0.12, -0.4, a), -0.42, b), lerp(lerp(0.9, 0.0, a), -1.35, b));
    look.set(lerp(lerp(0, -0.04, a), 1.75, b), lerp(lerp(-0.42, -0.5, a), -0.5, b), lerp(-1.6, -3.0, b));
  } else if (i === 1) {
    const a = smooth(clamp(t * 1.3));
    pos.set(lerp(0, -0.55, a), lerp(0.1, -0.08, a), lerp(0.9, -0.75, a));
    look.set(lerp(0, 0.05, a), lerp(-0.28, -0.3, a), -1.8);
  } else {
    const p = printAt(S.work);
    const ca = Math.cos(p.a), sa = Math.sin(p.a);
    look.set(p.x - sa * 0.55, FLOOR + 0.2, p.z + ca * 0.55);
    pos.set(look.x - sa * 1.5, -0.3, look.z + ca * 1.5);
  }
}

function Rig() {
  const { camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const v = useMemo(() => ({ pos: new THREE.Vector3(0, 0, 5), look: new THREE.Vector3(0, 0, 0), tp: new THREE.Vector3(), tl: new THREE.Vector3(), lp: new THREE.Vector3(), ll: new THREE.Vector3(), off: { x: 0, y: 0 } }), []);
  useFrame((_, dt) => {
    const vw = size.width, vh = size.height;
    if (S.open >= 0 && cards[S.open]) {
      inside(S.open, S.t[S.open], v.lp, v.ll);
      const sx = cards[S.open].rotation.y * SHIFT[S.open];
      v.lp.x += sx; v.ll.x += sx;
      if (S.phone) v.lp.sub(v.ll).multiplyScalar(1.7).add(v.ll);
      cards[S.open].localToWorld(v.tp.copy(v.lp));
      cards[S.open].localToWorld(v.tl.copy(v.ll));
    } else {
      const r = S.fit?.getBoundingClientRect();
      const hpx = r && r.height > 10 ? r.height : vh * 0.55;
      const tn = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
      const d = (H * vh) / (2 * tn * hpx);
      const wpp = (2 * d * tn) / vh;
      const cx = r ? r.left + r.width / 2 : vw / 2, cy = r ? r.top + r.height / 2 : vh / 2;
      const x = -(cx - vw / 2) * wpp + (S.phone ? 0 : S.px * 0.06), y = (cy - vh / 2) * wpp + (S.phone ? 0 : S.py * 0.04);
      v.tp.set(x, y, d);
      v.tl.set(x, y, 0);
    }
    const snap = S.open < 0 && Math.abs(v.pos.z - v.tp.z) < 0.02;
    easing.damp3(v.pos, v.tp, snap ? 0.06 : 0.38, dt);
    easing.damp3(v.look, v.tl, snap ? 0.06 : 0.38, dt);
    cam.position.copy(v.pos);
    cam.lookAt(v.look);
    const ox = S.open >= 0 && !S.phone ? -S.panel / 2 : 0;
    const oy = S.open >= 0 && S.phone ? vh * 0.24 : 0;
    easing.damp(v.off, 'x', ox, 0.3, dt);
    easing.damp(v.off, 'y', oy, 0.3, dt);
    easing.damp(cam, 'fov', S.open >= 0 ? (S.phone ? 58 : 50) : 32, 0.3, dt);
    cam.setViewOffset(vw, vh, v.off.x, v.off.y, vw, vh);
    cam.updateProjectionMatrix();
  });
  return null;
}

export default function Stage({ live }: { live: boolean }) {
  const [phone] = useState(() => S.phone);
  return (
    <Canvas
      camera={{ fov: 32, position: [0, 0, 5], near: 0.05, far: 60 }}
      dpr={phone ? [1, 1.4] : [1, 1.6]}
      shadows={{ type: THREE.PCFShadowMap }}
      frameloop={live ? 'always' : 'never'}
      gl={{ antialias: true }}
      style={{ pointerEvents: 'none' }}
    >
      <color attach="background" args={['#efeeea']} />
      <Frame i={0} word={PERSON.short[0]} n="01"><Debater /></Frame>
      <Frame i={1} word={PERSON.short[1]} n="02"><Researcher /></Frame>
      <Frame i={2} word={PERSON.short[2]} n="03"><Builder /></Frame>
      <Rig />
    </Canvas>
  );
}
