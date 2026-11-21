// Scene after pmndrs/examples html-input-fields (MIT): the white studio with soft shadows, a real HTML input placed in the scene, and a huge soft word behind it. Bunny, eggs and WaterPass dropped; the light is built from Lightformers.
import * as THREE from 'three';
import { memo, useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AccumulativeShadows, Environment, Html, Lightformer, RandomizedLight, RoundedBox, Text } from '@react-three/drei';
import { ControlledInput } from './ControlledInput';

const FONT = import.meta.env.BASE_URL + 'search/hanken-500.woff';
const INK = '#1a1a19', COBALT = '#2347c4', PALE = '#cbcbc7', BG = '#f4f4f2';
// The field: a thick white slab standing on the floor. 1 world unit is 40 css px for drei Html transform.
const FW = 5.6, FH = 1.15, FD = 0.5, FZ = 1.5;
const TARGET = new THREE.Vector3(0, 0.6, 0);
const EYE = new THREE.Vector3(0, 2.2, 13);
// On a tall phone the camera climbs, so the word stands clear above the field instead of behind it.
const EYE_PHONE = new THREE.Vector3(0, 2.6, 13);
const WORD_Z = -14;

type TextMesh = THREE.Mesh & { textRenderInfo?: { blockBounds: number[]; caretPositions: Float32Array | null }; clipRect: number[] | null };

export type StudioProps = {
  value: string;
  setValue: (v: string) => void;
  onKey: (e: KeyboardEvent<HTMLInputElement>) => void;
  word: string;
  phone: boolean;
  active?: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  labelId: string;
  describedBy: string;
};

const easeIn = (t: number) => t * t * t;
const backOut = (t: number) => { const c = 1.1; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

/** The huge pale word. When the target changes, the old one sinks through the floor and the new one stands up out of it. */
function Word({ target, phone }: { target: string; phone: boolean }) {
  const group = useRef<THREE.Group>(null!);
  const text = useRef<TextMesh>(null!);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  const [shown, setShown] = useState(target);
  const st = useRef({ phase: 'wait' as 'idle' | 'sink' | 'wait' | 'rise', t: 0, y: -40, from: 0, s: 1, h: 1, synced: false });

  const fit = () => {
    const info = text.current?.textRenderInfo; if (!info) return;
    const [x0, y0, x1, y1] = info.blockBounds;
    const w = x1 - x0, h = y1 - y0;
    const dist = camera.position.distanceTo(new THREE.Vector3(0, 2, WORD_Z));
    if (!Number.isFinite(w) || w <= 0) return;
    const visW = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (size.width / size.height);
    const s = Math.min((visW * (phone ? 1.0 : 0.82)) / w, (phone ? 6.6 : 4.1) / h);
    st.current.s = s; st.current.h = h * s;
  };

  useFrame((_, dt) => {
    const S = st.current, g = group.current; if (!g) return;
    dt = Math.min(dt, 1 / 20);
    if (S.phase === 'idle' && target !== shown) { S.phase = 'sink'; S.t = 0; S.from = S.y; }
    if (S.phase === 'rise' && target !== shown) { S.phase = 'sink'; S.t = 0; S.from = S.y; }
    if (S.phase === 'sink') {
      S.t = Math.min(1, S.t + dt / 0.42);
      S.y = S.from + (-S.h * 1.06 - S.from) * easeIn(S.t);
      if (S.t >= 1) { S.phase = 'wait'; S.synced = target === shown; setShown(target); }
    } else if (S.phase === 'wait') {
      if (S.synced) { fit(); S.phase = 'rise'; S.t = 0; S.y = -S.h * 1.06; }
    } else if (S.phase === 'rise') {
      S.t = Math.min(1, S.t + dt / 0.95);
      S.y = -S.h * 1.06 * (1 - backOut(S.t));
      if (S.t >= 1) { S.phase = 'idle'; S.y = 0; }
    }
    g.position.y = S.y;
    g.scale.setScalar(S.s);
    // Everything below the floor is cut away, so the word reads as going into it.
    if (text.current) text.current.clipRect = [-1e5, -S.y / S.s, 1e5, 1e5];
  });

  useEffect(() => { if (st.current.phase === 'idle') fit(); }, [size.width, size.height, phone]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <group ref={group} position={[0, -40, WORD_Z]}>
      <Text
        ref={text}
        font={FONT}
        fontSize={1}
        lineHeight={0.9}
        letterSpacing={-0.035}
        anchorX="center"
        anchorY="bottom"
        textAlign="center"
        onSync={() => { st.current.synced = true; if (st.current.phase === 'idle') fit(); }}
      >
        {shown}
        <meshBasicMaterial color={PALE} toneMapped={false} />
      </Text>
    </group>
  );
}

/** The field itself: a white slab, the typed text in ink, a cobalt caret, and the real input laid over its face. */
function Field({ value, setValue, onKey, inputRef, labelId, describedBy }: Omit<StudioProps, 'word' | 'phone' | 'active'>) {
  const typed = useRef<TextMesh>(null!);
  const typedGroup = useRef<THREE.Group>(null!);
  const caret = useRef<THREE.Mesh>(null!);
  const bar = useRef<THREE.Mesh>(null!);
  const [focused, setFocused] = useState(false);
  const blink = useRef(0);
  const inner = FW - 0.8;

  useEffect(() => { blink.current = 0; }, [value]);

  useFrame((_, dt) => {
    blink.current += dt;
    const info = typed.current?.textRenderInfo;
    const el = inputRef.current;
    let x = 0;
    if (info && value.length) {
      const [, , maxX] = info.blockBounds;
      const i = el && document.activeElement === el ? el.selectionStart ?? value.length : value.length;
      const cp = info.caretPositions;
      if (cp && i < value.length && cp[i * 4] !== undefined && !Number.isNaN(cp[i * 4])) x = cp[i * 4];
      else x = maxX + (value.length - value.trimEnd().length) * 0.13;
      const s = Math.min(1, inner / Math.max(0.01, maxX));
      typedGroup.current.scale.setScalar(s);
      x *= s;
    }
    if (caret.current) {
      caret.current.position.x = -FW / 2 + 0.4 + x + 0.02;
      caret.current.visible = blink.current < 0.6 || Math.floor((blink.current - 0.6) / 0.53) % 2 === 1;
    }
    if (bar.current) (bar.current.material as THREE.MeshBasicMaterial).color.set(focused ? COBALT : '#d6d6d2');
  });

  return (
    <group position={[0, 0, FZ]}>
      <RoundedBox args={[FW, FH, FD]} radius={0.16} smoothness={6} position={[0, FH / 2, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#ffffff" roughness={0.42} clearcoat={0.5} clearcoatRoughness={0.35} />
      </RoundedBox>
      <group position={[-FW / 2 + 0.4, FH / 2 + 0.02, FD / 2 + 0.004]}>
        <group ref={typedGroup}>
          <Text ref={typed} font={FONT} fontSize={0.5} anchorX="left" anchorY="middle" letterSpacing={-0.01}>
            {value || ' '}
            <meshBasicMaterial color={INK} toneMapped={false} />
          </Text>
        </group>
        {!value && (
          <Text font={FONT} fontSize={0.5} anchorX="left" anchorY="middle" position={[0.08, 0, 0]}>
            type a word
            <meshBasicMaterial color="#76766f" toneMapped={false} />
          </Text>
        )}
      </group>
      <mesh ref={caret} position={[0, FH / 2 + 0.02, FD / 2 + 0.006]}>
        <planeGeometry args={[0.045, 0.58]} />
        <meshBasicMaterial color={COBALT} toneMapped={false} />
      </mesh>
      <mesh ref={bar} position={[0, 0.2, FD / 2 + 0.005]}>
        <planeGeometry args={[FW - 0.8, 0.035]} />
        <meshBasicMaterial color="#d6d6d2" toneMapped={false} />
      </mesh>
      {/* The real input, transparent, over the face of the slab (as in the example). */}
      <Html transform position={[0, FH / 2, FD / 2 + 0.01]} zIndexRange={[2, 0]}>
        <ControlledInput
          ref={inputRef}
          className="field3d"
          id="q"
          type="search"
          enterKeyHint="go"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={28}
          aria-labelledby={labelId}
          aria-describedby={describedBy}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ width: FW * 40, height: FH * 40 }}
        />
      </Html>
    </group>
  );
}

/** Light from behind, as in the example, so the slab throws a long soft shadow toward the camera. Never re-renders. */
const Shadows = memo(function Shadows() {
  return (
    <AccumulativeShadows temporal frames={90} alphaTest={0.8} opacity={0.7} scale={30} color="#3a3a36" position={[0, 0.001, 0]}>
      <RandomizedLight amount={8} radius={5} ambient={0.55} intensity={Math.PI} position={[3, 6, -10]} />
    </AccumulativeShadows>
  );
});

/** The base example's rig: the camera leans toward the pointer, slowly. Pulled back on narrow screens so the field fits. */
function Rig({ phone }: { phone: boolean }) {
  const size = useThree((s) => s.size);
  const v = useRef(new THREE.Vector3());
  useFrame((state, dt) => {
    const aspect = size.width / size.height;
    const need = FW / 0.86 / (2 * Math.tan(THREE.MathUtils.degToRad(15)) * aspect);
    const m = Math.max(1, need / (EYE.z - FZ));
    const px = phone ? 0 : state.pointer.x, py = phone ? 0 : state.pointer.y;
    v.current.copy(phone ? EYE_PHONE : EYE).sub(TARGET).multiplyScalar(m).add(TARGET);
    v.current.x += px * 1.1 * m; v.current.y += py * 0.45 * m;
    state.camera.position.lerp(v.current, 1 - Math.exp(-2.2 * Math.min(dt, 0.05)));
    state.camera.lookAt(TARGET);
  });
  return null;
}

export default function Studio(props: StudioProps) {
  const { word, phone, active = true, ...field } = props;
  return (
    <Canvas
      className="studio-canvas"
      flat
      dpr={[1, phone ? 1.5 : 1.6]}
      shadows={{ type: THREE.PCFShadowMap }}
      camera={{ position: phone ? [0, 5.2, 30] : [EYE.x, EYE.y, EYE.z], fov: 30, near: 0.5, far: 160 }}
      gl={{ antialias: true }}
      eventPrefix="client"
      frameloop={active ? 'always' : 'never'}
    >
      <color attach="background" args={[BG]} />
      <ambientLight intensity={1.15} />
      <spotLight position={[8, 12, 10]} intensity={Math.PI * 0.9} decay={0} angle={0.5} penumbra={1} />
      <pointLight position={[-10, 2, -10]} intensity={Math.PI} decay={0} />
      <Word target={word} phone={phone} />
      <Field {...field} />
      <Shadows />
      <Environment resolution={256}>
        <group rotation={[-Math.PI / 3, 0, 0]}>
          <Lightformer form="rect" intensity={3} position={[0, 6, -6]} scale={[12, 4, 1]} />
          <Lightformer form="rect" intensity={1.5} rotation-y={Math.PI / 2} position={[-8, 1, 0]} scale={[30, 2, 1]} />
          <Lightformer form="rect" intensity={1.5} rotation-y={-Math.PI / 2} position={[8, 1, 0]} scale={[30, 2, 1]} />
          <Lightformer form="circle" intensity={4} position={[4, 4, 8]} scale={3} />
        </group>
      </Environment>
      <Rig phone={phone} />
    </Canvas>
  );
}
