// Remixed from pmndrs/examples "cards" (MIT, github.com/pmndrs/examples): the ring of rounded cards in arcs, the lift and scale of the hovered card, the Billboard name and preview above it, and the camera that drifts with the pointer.
import * as THREE from 'three';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Billboard, Text, useTexture } from '@react-three/drei';
import { easing, geometry } from 'maath';
import font from '@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-700-normal.woff?url';
import fontReg from '@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-500-normal.woff?url';
import { WORK } from '@/content';
import { scroll } from '@/lib/scroll';
import { clamp, coarse, smooth } from '@/lib/utils';
import NAMES from './names.json';
import { lift, marks } from './stage';

const BASE = import.meta.env.BASE_URL;
const DRAFTS = WORK[7].href as string;
const SHIPPED = WORK[1];
const INK = '#141414';
const R = 5.25;
const GAP = 3;

type Draft = { slug: string; n: number; name: string; kind: string };
const ALL = NAMES as Draft[];

// Arcs by kind, as the base example groups its seasons. The first twelve drafts carried one-off kinds.
const ARCS = (() => {
  const early = ALL.map((d, i) => ({ d, i })).filter((x) => x.d.n <= 12);
  const rest = ['3D centrepiece', 'Big type', 'Debate-native', 'Play with it'].map((k) => ({ label: k, items: ALL.map((d, i) => ({ d, i })).filter((x) => x.d.n > 12 && x.d.kind === k) }));
  const arcs = [{ label: 'The first twelve', items: early }, ...rest];
  const used = new Set(arcs.flatMap((a) => a.items.map((x) => x.i)));
  const left = ALL.map((d, i) => ({ d, i })).filter((x) => !used.has(x.i));
  if (left.length) arcs[1].items.push(...left);
  return arcs;
})();
const SLOTS = ALL.length + ARCS.length * GAP;
const STEP = (Math.PI * 2) / SLOTS;
const YS = [0.35, 0, -0.3, 0.15, -0.1];

// Ring placement of every card (instance order = atlas order = names.json order).
const PLACE = (() => {
  const out: { a: number; y: number; arc: number }[] = new Array(ALL.length);
  let slot = 0;
  ARCS.forEach((arc, ai) => {
    arc.items.forEach((x) => { out[x.i] = { a: slot * STEP, y: YS[ai % YS.length], arc: ai }; slot++; });
    slot += GAP;
  });
  return out;
})();
const LABELS = (() => {
  let slot = 0;
  return ARCS.map((arc, ai) => { const mid = (slot + arc.items.length / 2) * STEP; slot += arc.items.length + GAP; return { label: arc.label, a: mid, y: YS[ai % YS.length] }; });
})();

const vert = /* glsl */ `
  attribute vec2 aOff;
  varying vec2 vUv;
  varying float vShade;
  void main() {
    vUv = aOff + (vec2(0.006, 0.01) + uv * vec2(0.988, 0.98)) * 0.1;
    mat4 m = modelMatrix * instanceMatrix;
    vec3 n = normalize(mat3(m) * vec3(0.0, 0.0, 1.0));
    // one key light from above left, front
    vec3 L = normalize(vec3(-0.5, 0.8, 0.6));
    vShade = 0.8 + 0.2 * abs(dot(n, L));
    gl_Position = projectionMatrix * viewMatrix * m * vec4(position, 1.0);
  }`;
const frag = /* glsl */ `
  uniform sampler2D map;
  varying vec2 vUv;
  varying float vShade;
  void main() {
    vec4 c = texture2D(map, vUv);
    gl_FragColor = vec4(c.rgb * vShade, 1.0);
    #include <colorspace_fragment>
  }`;
const pvert = /* glsl */ `
  uniform vec2 uOff; uniform float uZoom;
  varying vec2 vUv;
  void main() { vUv = uOff + (vec2(0.5) + (uv - 0.5) * vec2(0.988, 0.98) * uZoom) * 0.1; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const pfrag = /* glsl */ `
  uniform sampler2D map; uniform float uOpacity;
  varying vec2 vUv;
  void main() { gl_FragColor = vec4(texture2D(map, vUv).rgb, uOpacity);
    #include <colorspace_fragment>
  }`;

const offOf = (i: number) => new THREE.Vector2((i % 10) / 10, 1 - (Math.floor(i / 10) + 1) / 10);

/** Where the page is: 0..1 turn (the Work stretch removed, so the ring stops there), work and fold amounts. */
function phase() {
  const y = scroll.y;
  const span = Math.max(1, marks.workEnd - marks.workStart);
  const removed = clamp((y - marks.workStart) / span) * span;
  const total = Math.max(1, scroll.max - span);
  const turn = clamp((y - removed) / total);
  const intro = clamp(y / Math.max(1, marks.heroEnd * 0.8));
  const work = smooth(clamp((y - marks.workStart + 500) / 600)) * (1 - smooth(clamp((y - marks.workEnd + 100) / 600)));
  const fold = smooth(clamp((y - marks.foldStart) / Math.max(1, marks.foldEnd - marks.foldStart)));
  return { turn, intro, work, fold };
}

const tmpM = new THREE.Matrix4();
const qA = new THREE.Quaternion();
const qB = new THREE.Quaternion();
const eul = new THREE.Euler();
const vA = new THREE.Vector3();
const vB = new THREE.Vector3();
const sV = new THREE.Vector3();
const qY = new THREE.Quaternion();
const wp = new THREE.Vector3();
type LabelText = THREE.Mesh & { fillOpacity: number };
const UP = new THREE.Vector3(0, 1, 0);

function Scene({ onActive }: { onActive: (i: number | null) => void }) {
  const group = useRef<THREE.Group>(null!);
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const atlas = useTexture(BASE + 'hundred/atlas.webp');
  const shippedTex = useTexture(BASE + SHIPPED.img);
  const { gl, size, camera } = useThree();
  const [hovered, setHovered] = useState<number | null>(null);
  const [armed, setArmed] = useState<number | null>(null);
  const [focusIdx, setFocusIdx] = useState(-1);
  const idle = useRef(0);
  const lifts = useMemo(() => new Float32Array(ALL.length), []);
  const scales = useMemo(() => new Float32Array(ALL.length).fill(1), []);
  const shipped = useRef<THREE.Group>(null!);
  const shippedY = useRef(3);
  const ph = useRef(phase());
  const labels = useRef<(LabelText | null)[]>([]);
  useEffect(() => { const t = setTimeout(() => { if (scroll.y < 200) lift.wave = performance.now(); }, 900); return () => clearTimeout(t); }, []);

  useMemo(() => {
    atlas.colorSpace = THREE.SRGBColorSpace;
    atlas.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    shippedTex.colorSpace = THREE.SRGBColorSpace;
  }, [atlas, shippedTex, gl]);

  const geo = useMemo(() => {
    const g = new geometry.RoundedPlaneGeometry(1.618, 1, 0.075);
    const off = new Float32Array(ALL.length * 2);
    ALL.forEach((_, i) => { const o = offOf(i); off[i * 2] = o.x; off[i * 2 + 1] = o.y; });
    g.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 2));
    return g;
  }, []);
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: { map: { value: atlas } }, side: THREE.DoubleSide }), [atlas]);
  const prevMat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: pvert, fragmentShader: pfrag, uniforms: { map: { value: atlas }, uOff: { value: new THREE.Vector2() }, uZoom: { value: 0.8 }, uOpacity: { value: 0 } }, transparent: true, depthWrite: false }), [atlas]);
  const prevGeo = useMemo(() => new geometry.RoundedPlaneGeometry(1.618, 1, 0.06), []);
  const shipGeo = useMemo(() => new geometry.RoundedPlaneGeometry(1.818, 1, 0.07), []);
  const edgeGeo = useMemo(() => new geometry.RoundedPlaneGeometry(1.818 + 0.06, 1.06, 0.09), []);

  useEffect(() => {
    // keyboard focus from the hidden list of names
    const t = setInterval(() => setFocusIdx((f) => (f === lift.focus ? f : lift.focus)), 120);
    return () => clearInterval(t);
  }, []);

  const shown = focusIdx >= 0 ? focusIdx : coarse ? armed : hovered;
  useEffect(() => {
    onActive(shown);
    if (!coarse) document.body.style.cursor = shown !== null && shown >= 0 && focusIdx < 0 ? 'pointer' : '';
    return () => { document.body.style.cursor = ''; };
  }, [shown, onActive, focusIdx]);
  useEffect(() => {
    if (shown === null || shown < 0) return;
    prevMat.uniforms.uOff.value.copy(offOf(shown));
    prevMat.uniforms.uZoom.value = 0.8;
  }, [shown, prevMat]);

  const blocked = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const ne = e.nativeEvent as MouseEvent;
    const t = ne.target as HTMLElement | null;
    if (t && t.closest && t.closest('a,button,input,[data-solid]')) return true;
    if (!marks.phone && ph.current.intro > 0.5 && ne.clientX < marks.colRight) return true;
    return ph.current.fold > 0.4 || ph.current.work > 0.4;
  };

  useFrame((state, dt) => {
    const p = (ph.current = phase());
    const g = group.current;
    if (!coarse) state.events.update?.();
    idle.current += dt * 0.045 * (1 - p.work) * (1 - p.fold);
    const rotY = -p.turn * Math.PI * 2 - idle.current;
    g.rotation.y = rotY;

    // camera: three-quarter view at the top, tilting toward edge-on, then up again over the stack
    const phone = marks.phone;
    const camY = THREE.MathUtils.lerp(THREE.MathUtils.lerp(4.8, 1.6, smooth(clamp(p.turn * 1.25))), 8.5, p.fold);
    const camZ = THREE.MathUtils.lerp((phone ? 15 : 18.5 + p.intro * 4.5) + p.work * 3.5, phone ? 6.2 : 6, p.fold);
    const px = coarse ? 0 : state.pointer.x, py = coarse ? 0 : state.pointer.y;
    easing.damp3(camera.position, [-px * 1.4, py * 1 + camY + p.work * 1.2, camZ], 0.35, dt);
    camera.lookAt(0, p.fold * 0.4, 0);
    // desktop: slide the ring right of the paper column, up during Work
    if (!phone) {
      const shiftX = -size.width * 0.2 * p.intro * (1 - p.work);
      const shiftY = size.height * (0.06 * p.intro + 0.27 * p.work) * (1 - p.fold) - size.height * 0.02 * p.fold;
      (camera as THREE.PerspectiveCamera).setViewOffset(size.width, size.height, shiftX, shiftY, size.width, size.height);
    }

    const tw = (performance.now() - lift.wave) / 1000;
    // arc names: only the far side shows, above the ring; the near ones would sit on the cards
    labels.current.forEach((t) => {
      if (!t) return;
      t.getWorldPosition(wp);
      const o = clamp((-wp.z - 0.5) / 2.5) * (1 - p.work) * (1 - p.fold) * clamp((camera.position.y - 2.6) / 1.4);
      t.fillOpacity = o;
      t.visible = o > 0.02;
    });
    const act = shown !== null && shown >= 0 ? shown : -1;
    const actArc = act >= 0 ? PLACE[act].arc : -1;
    for (let i = 0; i < ALL.length; i++) {
      const pl = PLACE[i];
      const wd = tw * 0.9 - ((((pl.a + rotY) / (Math.PI * 2)) % 1) + 1) % 1;
      const wave = tw < 3 ? Math.exp(-wd * wd * 160) * 0.42 : 0;
      lifts[i] = THREE.MathUtils.damp(lifts[i], (i === act ? 0.32 : 0) + wave, 14, dt);
      scales[i] = THREE.MathUtils.damp(scales[i], i === act ? 1.4 : pl.arc === actArc ? 1.12 : 1, 7, dt);
      // ring pose
      vA.set(Math.sin(pl.a) * R, pl.y + lifts[i], Math.cos(pl.a) * R);
      qA.setFromEuler(eul.set(0, Math.PI / 2 + pl.a, 0));
      // stack pose: flat, facing the camera, counter-rotated so it sits square
      const k = smooth(clamp(p.fold * 1.6 - (i / ALL.length) * 0.6));
      if (k > 0) {
        vB.set(0, -0.6 + i * 0.008, 0);
        qB.setFromEuler(eul.set(-Math.PI / 2, 0, 0)).premultiply(qY.setFromAxisAngle(UP, -rotY));
        vA.lerp(vB, k);
        qA.setFromEuler(eul.set(0, Math.PI / 2 + pl.a, 0)).slerp(qB, k);
      }
      const s = THREE.MathUtils.lerp(scales[i], 2.1, k);
      sV.set(s, s, 1);
      tmpM.compose(vA, qA, sV);
      mesh.current.setMatrixAt(i, tmpM);
    }
    mesh.current.instanceMatrix.needsUpdate = true;

    // the shipped card drops onto the stack
    const on = p.fold > 0.82;
    shippedY.current = THREE.MathUtils.damp(shippedY.current, on ? 0 : 2.5, on ? 5 : 8, dt);
    const sg = shipped.current;
    sg.position.set(0, -0.6 + ALL.length * 0.008 + 0.03 + shippedY.current, 0);
    sg.rotation.set(0, -rotY, 0);
    const sOp = clamp(1 - shippedY.current / 2.5);
    sg.visible = sOp > 0.02;
    sg.scale.setScalar(2.1 * (0.9 + 0.1 * sOp));

    // preview of the pointed card, as in the base's ActiveCard
    prevMat.uniforms.uZoom.value = THREE.MathUtils.damp(prevMat.uniforms.uZoom.value, 1, 3, dt);
    prevMat.uniforms.uOpacity.value = THREE.MathUtils.damp(prevMat.uniforms.uOpacity.value, act >= 0 && p.fold < 0.3 && p.work < 0.3 ? 1 : 0, 6, dt);
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    if (e.instanceId === undefined || blocked(e)) return;
    e.stopPropagation();
    setHovered(e.instanceId);
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (e.instanceId === undefined || blocked(e)) return;
    e.stopPropagation();
    if (coarse && armed !== e.instanceId) { setArmed(e.instanceId); return; }
    window.open(DRAFTS, '_blank', 'noopener');
  };

  const act = shown !== null && shown >= 0 ? ALL[shown] : null;
  return (
    <group ref={group}>
      <instancedMesh
        ref={mesh}
        args={[geo, mat, ALL.length]}
        frustumCulled={false}
        onPointerMove={over}
        onPointerOut={() => setHovered(null)}
        onClick={click}
        onPointerMissed={() => coarse && setArmed(null)}
        onUpdate={(m) => { m.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R + 2); }}
      />
      {LABELS.map((l, i) => (
        <Billboard key={l.label} position={[Math.sin(l.a) * R * 1.12, l.y + 1.05, Math.cos(l.a) * R * 1.12]}>
          <Text ref={(t: unknown) => { labels.current[i] = t as LabelText; }} font={fontReg} fontSize={0.3} anchorX="center" color={INK} letterSpacing={0.01}>{l.label}</Text>
        </Billboard>
      ))}
      <ActiveName draft={act} mat={prevMat} geo={prevGeo} />
      <group ref={shipped} onClick={(e) => { const t = e.nativeEvent.target as HTMLElement | null; if (t?.closest?.('a,button')) return; e.stopPropagation(); window.open(SHIPPED.href, '_blank', 'noopener'); }}>
        <mesh geometry={edgeGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.004, 0]}>
          <meshBasicMaterial color="#2443d6" />
        </mesh>
        <mesh geometry={shipGeo} rotation={[-Math.PI / 2, 0, 0]}>
          <meshBasicMaterial map={shippedTex} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** The one text motion: the name of the pointed draft stands up on its billboard. */
function ActiveName({ draft, mat, geo }: { draft: Draft | null; mat: THREE.ShaderMaterial; geo: THREE.BufferGeometry }) {
  const hinge = useRef<THREE.Group>(null!);
  const vel = useRef(0);
  const key = draft?.slug ?? '';
  useEffect(() => { if (hinge.current) { hinge.current.rotation.x = -Math.PI / 2; vel.current = 0; } }, [key]);
  useFrame((_, dt) => {
    // a damped spring with a little overshoot, so the word stands up with weight
    const h = hinge.current; if (!h) return;
    const d = Math.min(dt, 1 / 30);
    vel.current += (0 - h.rotation.x) * 90 * d;
    vel.current *= Math.exp(-9 * d);
    h.rotation.x += vel.current * d;
  });
  return (
    <Billboard position={[0, 1.55, 0]}>
      <mesh geometry={geo} material={mat} scale={[2.2, 2.2, 1]} />
      {draft && (
        <group ref={hinge} position={[0, 1.36, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <Text font={font} fontSize={0.42} anchorX="center" anchorY="bottom" color={INK} letterSpacing={-0.02}>{draft.name}</Text>
          <Text font={fontReg} fontSize={0.17} anchorX="center" anchorY="top" position={[0, -0.06, 0]} color={INK}>{`Draft ${draft.n}, ${draft.kind}`}</Text>
        </group>
      )}
    </Billboard>
  );
}

export default function Ring({ onActive, source }: { onActive: (i: number | null) => void; source: HTMLElement }) {
  return (
    <Canvas
      flat
      dpr={[1, 1.6]}
      camera={{ position: [0, 4.6, 9.6], fov: 36 }}
      gl={{ antialias: true, alpha: false }}
      eventSource={source}
      eventPrefix="client"
      onCreated={({ gl }) => gl.setClearColor('#edebe6')}
      style={{ pointerEvents: 'none' }}
    >
      <Suspense fallback={null}>
        <Scene onActive={onActive} />
      </Suspense>
    </Canvas>
  );
}
