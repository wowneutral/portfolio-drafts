// Remixed from pmndrs/examples "monitors" (MIT, src/Computers.tsx): Screen, ScreenText, ScreenInteractive and Leds,
// re-dressed as paper screens carrying his live commits, repos, note and name. No green, no spinning box.
import * as THREE from 'three';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFrame, type ThreeElements } from '@react-three/fiber';
import { useGLTF, RenderTexture, OrthographicCamera, Text, useCursor, useTexture, type PositionMesh } from '@react-three/drei';
import { easing } from 'maath';
import { WORK, PERSON, LINKS } from '@/content';
import { formatDate } from '@/lib/notes';
import { MODEL, DRACO, type GLTFResult, type NodeName, type Instance } from './Heap';
import { stage, useStore, type Entry } from './stage';
import bold from '@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-800-normal.woff?url';
import medium from '@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-500-normal.woff?url';

export const PAPER = '#efe9dc';
export const INK = '#161513';
export const ORANGE = '#ff6a3d';
const BASE = import.meta.env.BASE_URL;
const EMAIL = LINKS[0].value;

// Each panel only uses a small box of its texture's UV space; we stretch our texture over that box
// so the whole render target lands on the glass (the example wasted most of it).
const UV: Partial<Record<NodeName, [number, number, number, number]>> = {
  Object_207: [0.045, 0.494, 0.281, 0.67],
  Object_219: [0.045, 0.494, 0.281, 0.67],
  Object_210: [0.37, 0.789, 0.614, 0.961],
  Object_222: [0.37, 0.789, 0.614, 0.961],
  Object_213: [0.047, 0.793, 0.28, 0.957],
  Object_216: [0.376, 0.488, 0.611, 0.664],
  Object_225: [0.376, 0.488, 0.611, 0.664],
  Object_228: [0.376, 0.488, 0.611, 0.664],
  Object_231: [0.376, 0.488, 0.611, 0.664],
};
const ASPECT = 1.367; // the glass, width over height
const W = 12.8;
const H = W / ASPECT;
const L = -W / 2 + 0.75; // left margin inside the glass

function fitUV(tex: THREE.Texture, box: [number, number, number, number], crop = 1) {
  const [u0, v0, u1, v1] = box;
  const ru = crop / (u1 - u0);
  const rv = 1 / (v1 - v0);
  tex.repeat.set(ru, rv);
  tex.offset.set((1 - crop) / 2 - u0 * ru, -v0 * rv);
}

const Sync = createContext<() => void>(() => {});
const useLite = () => useContext(Lite);
export const Lite = createContext(false);

/** drei Text with his face, ink by default, that tells its screen when it has laid out. */
function T({ weight = 'medium', text, ...props }: { weight?: 'bold' | 'medium'; text: string } & Omit<React.ComponentProps<typeof Text>, 'children'>) {
  const onSync = useContext(Sync);
  return <Text font={weight === 'bold' ? bold : medium} color={INK} anchorX="left" anchorY="top" onSync={onSync} {...props}>{text}</Text>;
}

/** One monitor out of the model, with a scene rendered into its glass. */
function Screen({ frame, panel, order, bg = PAPER, live = false, big = false, kick = 0, onClick, children, ...props }: {
  frame: NodeName; panel: NodeName; order: number; bg?: string; live?: boolean; big?: boolean; kick?: number; onClick?: () => void; children: ReactNode;
} & Omit<ThreeElements['group'], 'children' | 'onClick'>) {
  const { nodes, materials } = useGLTF(MODEL, DRACO) as unknown as GLTFResult;
  const lite = useLite();
  const mat = useRef<THREE.MeshBasicMaterial>(null!);
  const lum = useRef(1);
  // Static screens stop re-rendering their texture a few frames after their text has laid out.
  const [settled, setSettled] = useState(false);
  const left = useRef(12);
  const onSync = useMemo(() => () => { left.current = 12; setSettled(false); }, []);
  const [hovered, hover] = useState(false);
  useCursor(hovered && !!onClick);
  // A tap on the lit screen nudges the whole monitor back, like pressing an old set.
  const body = useRef<THREE.Group>(null!);
  const jolt = useRef(0);
  useEffect(() => { if (kick > 0) jolt.current = 1; }, [kick]);
  useFrame((_, dt) => {
    if (jolt.current > 0.001) {
      easing.damp(jolt, 'current', 0, 0.12, dt);
      body.current.position.z = -0.09 * Math.sin(jolt.current * Math.PI);
      body.current.rotation.x = -0.035 * Math.sin(jolt.current * Math.PI);
    }
    const m = mat.current;
    if (m?.map && !m.userData.fit) { fitUV(m.map, UV[panel]!); m.userData.fit = true; }
    if (!settled && --left.current <= 0) setSettled(true);
    // The closing: at Contact the screens go dark one by one; the central one (order < 0) stays.
    const off = stage.stop === 'contact' && order >= 0 && performance.now() / 1000 - stage.stopAt > 0.3 + order * 0.32;
    if (off) lum.current = Math.max(0.004, lum.current - dt * 9);
    else easing.damp(lum, 'current', 1, 0.2, dt);
    m?.color.setScalar(lum.current);
  });
  const res = lite ? 512 : big ? 1024 : 768;
  return (
    <group {...props}>
      <group ref={body}>
      <mesh castShadow receiveShadow geometry={nodes[frame].geometry} material={materials.Texture} />
      <mesh
        geometry={nodes[panel].geometry}
        onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
        onPointerOver={() => hover(true)}
        onPointerOut={() => hover(false)}
      >
        <meshBasicMaterial ref={mat} toneMapped={false}>
          <RenderTexture width={res} height={Math.round(res / ASPECT)} attach="map" anisotropy={8} frames={live || !settled ? Infinity : 0}>
            <OrthographicCamera makeDefault manual left={-W / 2} right={W / 2} top={H / 2} bottom={-H / 2} position={[0, 0, 10]} />
            <color attach="background" args={[bg]} />
            <Sync.Provider value={onSync}>{children}</Sync.Provider>
          </RenderTexture>
        </meshBasicMaterial>
      </mesh>
      </group>
    </group>
  );
}

/** A piece of his name, the way the example broke "Poimandres." across screens. */
function Word({ text, size }: { text: string; size: number }) {
  return <T weight="bold" text={text} fontSize={size} letterSpacing={-0.045} anchorX="center" anchorY="middle" position={[0, -0.2, 0]} />;
}

/** A label and a message, top left, like a page of a notebook. */
function Card({ label, message, size = 1 }: { label: string; message: string; size?: number }) {
  return (
    <group position={[L, H / 2 - 0.8, 0]}>
      <T text={label} fontSize={0.56} color="#5c574e" maxWidth={W - 1.5} />
      <T weight="bold" text={message} fontSize={size} lineHeight={1.08} letterSpacing={-0.02} maxWidth={W - 1.5} position={[0, -1.05, 0]} />
    </group>
  );
}

// Rough height of an entry on the glass, so the list can scroll exactly one entry per click.
const SIZE = 1.3;
const LINE = SIZE * 1.06;
const PER_LINE = 15;
const heightOf = (e: Entry) => 1.2 + Math.ceil(e.message.length / PER_LINE) * LINE + 1.1;
const clip = (m: string) => (m.length > 80 ? m.slice(0, 78).replace(/\s+\S*$/, '') + '...' : m);

/** The lit screen. Its list of commits moves up one entry per click, like a page scrolled a line. */
function Central() {
  const entries = useStore((s) => s.entries);
  const idx = useStore((s) => s.idx);
  const list = useRef<THREE.Group>(null!);
  const mail = useRef<THREE.Group>(null!);
  const n = entries.length;
  const top = (k: number) => { let y = 0; for (let j = 0; j < k; j++) y += heightOf(entries[j % n]); return y; };
  const goal = n ? H / 2 - 0.8 + top(idx) : 0;
  useFrame((_, dt) => {
    easing.damp(list.current.position, 'y', goal, 0.24, dt);
    const close = stage.stop === 'contact';
    list.current.visible = !close;
    mail.current.visible = close;
  });
  const slots = n ? [idx - 1, idx, idx + 1, idx + 2, idx + 3].filter((k) => k >= 0) : [];
  return (
    <>
      <group ref={list} position={[L, H / 2 - 0.8, 0]}>
        {slots.map((k) => {
          const e = entries[k % n];
          return (
            <group key={k} position={[0, -top(k), 0]}>
              <T text={e.label} fontSize={0.66} color="#3b1a0f" maxWidth={W - 1.5} />
              <T weight="bold" text={clip(e.message)} fontSize={SIZE} lineHeight={1.06} letterSpacing={-0.02} maxWidth={W - 1.5} position={[0, -1.15, 0]} />
            </group>
          );
        })}
      </group>
      {/* the top margin of the glass, so the entry that left does not peek back in */}
      <mesh position={[0, H / 2 - 0.3, 1]}>
        <planeGeometry args={[W, 0.6]} />
        <meshBasicMaterial color={ORANGE} toneMapped={false} />
      </mesh>
      <group ref={mail} visible={false} position={[0, 0.9, 0]}>
        <T text="Write to" fontSize={0.7} color="#3b1a0f" anchorX="center" />
        <T weight="bold" text={EMAIL} fontSize={1.42} letterSpacing={-0.03} anchorX="center" position={[0, -1.1, 0]} />
      </group>
    </>
  );
}

function Today() {
  const note = useStore((s) => s.note);
  if (!note) return <Card label="Today" message={PERSON.short.join(' ')} size={1.3} />;
  return (
    <group position={[L, H / 2 - 0.75, 0]}>
      <T text="Today" fontSize={0.5} color="#5c574e" />
      <T weight="bold" text={formatDate(note.date)} fontSize={0.95} letterSpacing={-0.02} position={[0, -0.75, 0]} />
      <T text={note.text} fontSize={0.56} lineHeight={1.32} maxWidth={W - 1.5} position={[0, -2.15, 0]} />
    </group>
  );
}

/** The nine monitors of the original heap, each given a job. */
export function HeapScreens() {
  const entries = useStore((s) => s.entries);
  const repos = useStore((s) => s.repos);
  const push = useStore((s) => s.push);
  const idx = useStore((s) => s.idx);
  const e1 = entries[1 % Math.max(entries.length, 1)];
  const e2 = entries[2 % Math.max(entries.length, 1)];
  return (
    <>
      <Screen frame="Object_206" panel="Object_207" order={-1} bg={ORANGE} live big kick={idx} onClick={push} position={[0.27, 1.53, -2.61]}>
        <Central />
      </Screen>
      <Screen frame="Object_212" panel="Object_213" order={0} position={[-2.73, 0.63, -0.52]} rotation={[0, 1.09, 0]}>
        <Word text="AR" size={6.2} />
      </Screen>
      <Screen frame="Object_209" panel="Object_210" order={3} position={[-1.43, 2.5, -1.8]} rotation={[0, 1, 0]}>
        <Word text="MAAN" size={3.85} />
      </Screen>
      <Screen frame="Object_215" panel="Object_216" order={5} position={[1.84, 0.38, -1.77]} rotation={[0, -Math.PI / 9, 0]}>
        <Word text="SE" size={6.2} />
      </Screen>
      <Screen frame="Object_218" panel="Object_219" order={7} position={[3.11, 2.15, -0.18]} rotation={[0, -0.79, 0]} scale={0.81}>
        <Word text="TH" size={6.2} />
      </Screen>
      <Screen frame="Object_221" panel="Object_222" order={1} position={[-3.42, 3.06, 1.3]} rotation={[0, 1.22, 0]} scale={0.9}>
        <group position={[L, H / 2 - 0.8, 0]}>
          <T text="Repos" fontSize={0.56} color="#5c574e" />
          {repos.slice(0, 4).map((r, i) => (
            <T key={r} weight="bold" text={r} fontSize={1.02} letterSpacing={-0.02} position={[0, -1.15 - i * 1.45, 0]} />
          ))}
        </group>
      </Screen>
      <Screen frame="Object_224" panel="Object_225" order={2} position={[-3.9, 4.29, -2.64]} rotation={[0, 0.54, 0]}>
        {e1 ? <Card label={e1.label} message={e1.message} /> : <Word text="AR" size={6} />}
      </Screen>
      <Screen frame="Object_227" panel="Object_228" order={4} big position={[0.96, 4.28, -4.2]} rotation={[0, -0.65, 0]}>
        <Today />
      </Screen>
      <Screen frame="Object_230" panel="Object_231" order={6} position={[4.68, 4.29, -1.56]} rotation={[0, -Math.PI / 3, 0]}>
        {e2 ? <Card label={e2.label} message={e2.message} /> : <Word text="SETH" size={3.6} />}
      </Screen>
    </>
  );
}

// The work wall: eight monitors stacked 3, 3, 2, each showing one of his screenshots.
const WALL: [number, number][] = [[-1.62, 0], [0, 0], [1.62, 0], [-1.62, 1.24], [0, 1.24], [1.62, 1.24], [-0.81, 2.48], [0.81, 2.48]];
const WOBBLE = [0.05, -0.03, 0.07, -0.06, 0.02, -0.05, 0.08, -0.04];

function WallScreen({ i, tex, ...props }: { i: number; tex: THREE.Texture } & ThreeElements['group']) {
  const { nodes, materials } = useGLTF(MODEL, DRACO) as unknown as GLTFResult;
  const mat = useRef<THREE.MeshBasicMaterial>(null!);
  const lum = useRef(1);
  const setHover = useStore((s) => s.setHover);
  const setWork = useStore((s) => s.setWork);
  const [over, setOver] = useState(false);
  useCursor(over);
  useMemo(() => {
    const img = tex.image as { width: number; height: number } | undefined;
    tex.colorSpace = THREE.SRGBColorSpace;
    fitUV(tex, UV.Object_210!, img ? Math.min(1, ASPECT / (img.width / img.height)) : 0.78);
    tex.needsUpdate = true;
  }, [tex]);
  useFrame((_, dt) => {
    const { work, hover } = useStore.getState();
    const lit = hover === null ? work === i : hover === i;
    const off = stage.stop === 'contact' && performance.now() / 1000 - stage.stopAt > 0.3 + (8 + i) * 0.2;
    const goal = off ? 0.004 : stage.stop !== 'work' ? 0.8 : lit ? 1 : 0.13;
    easing.damp(lum, 'current', goal, off ? 0.08 : 0.18, dt);
    mat.current.color.setScalar(lum.current);
  });
  return (
    <group {...props}>
      <mesh castShadow receiveShadow geometry={nodes.Object_209.geometry} material={materials.Texture} />
      <mesh
        geometry={nodes.Object_210.geometry}
        onPointerOver={(e) => { e.stopPropagation(); setOver(true); setHover(i); }}
        onPointerOut={() => { setOver(false); setHover(null); }}
        onClick={(e) => { e.stopPropagation(); setWork(i); }}
      >
        <meshBasicMaterial ref={mat} map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function Wall(props: ThreeElements['group']) {
  const urls = useMemo(() => WORK.map((w) => BASE + w.img), []);
  const texs = useTexture(urls);
  return (
    <group {...props}>
      {WORK.map((w, i) => (
        <WallScreen key={w.slug} i={i} tex={texs[i]} position={[WALL[i][0], WALL[i][1], 0]} rotation={[0, WOBBLE[i], 0]} />
      ))}
    </group>
  );
}

/** The example's blinking LEDs, warm instead of green. */
export function Leds({ instances }: { instances: Instance }) {
  const ref = useRef<THREE.Group>(null!);
  const { nodes } = useGLTF(MODEL, DRACO) as unknown as GLTFResult;
  useMemo(() => {
    nodes.Sphere.material = new THREE.MeshBasicMaterial();
    (nodes.Sphere.material as THREE.MeshBasicMaterial).toneMapped = false;
  }, [nodes]);
  useFrame((state) => {
    (ref.current.children as unknown as PositionMesh[]).forEach((instance) => {
      const rand = Math.abs(2 + instance.position.x);
      const t = Math.round((1 + Math.sin(rand * 10000 + state.clock.elapsedTime * rand)) / 2);
      instance.color.setRGB(t * 1.2, t * 0.5, t * 0.28);
    });
  });
  const at: [number, number, number][] = [[-0.41, 1.1, -2.21], [0.59, 1.32, -2.22], [1.77, 1.91, -1.17], [2.44, 1.1, -0.79], [4.87, 3.8, -0.1], [1.93, 3.8, -3.69], [-2.35, 3.8, -3.48], [-4.71, 4.59, -1.81], [-3.03, 2.85, 1.19], [-1.21, 1.73, -1.49]];
  return (
    <group ref={ref}>
      {at.map((p, i) => <instances.Sphere key={i} position={p} scale={0.005} color={[1, 0.5, 0.3]} />)}
    </group>
  );
}
