// The one object: a tall hourglass on a bone sweep. Clear blown bulbs, matte black caps, three posts.
// Sand is a heap per bulb (a lathe rebuilt each frame from the volume it holds) plus an instanced
// stream through the neck. Scroll turns it once per section; the visitor can turn it by hand.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { scroll } from '@/lib/scroll';
import { clamp, damp, lerp, smooth } from '@/lib/utils';
import { S } from './state';

const BONE = '#eee9df';
const SAND = '#e2d3b5';
const PLUM = '#6b2a5e';
const LIT = '#b0478f';

// Glass profile: s is distance from the neck along the axis (0 neck, 1 cap), r the inner radius.
const RMAX = 0.58, RN = 0.035, WALL = 0.03;
const rad = (s: number) => {
  s = clamp(s);
  if (s < 0.6) return RN + (RMAX - RN) * Math.pow(Math.sin((Math.PI / 2) * (s / 0.6)), 0.78);
  const u = (s - 0.6) / 0.4;
  return RMAX * (1 - 0.3 * u * u);
};
const CAP_R = 0.76, CAP_H = 0.13, POST_R = 0.68;
const HX = CAP_R, HY = 1 + CAP_H;

// Volume from the neck, tabulated.
const NV = 400;
const cum = new Float32Array(NV + 1);
for (let i = 1; i <= NV; i++) { const s = (i - 0.5) / NV; cum[i] = cum[i - 1] + Math.PI * rad(s) ** 2 / NV; }
const VB = cum[NV];
const VS = 0.7 * VB;
/** Where stripe i of n sits, as a fraction of the sand volume counted from the bottom. */
export const stripeAt = (i: number, n: number) => 0.05 + 0.88 * (i + 0.5) / Math.max(1, n);

// Points spread evenly through one bulb's inside (local, y > 0). Sorting them by height under the
// current "up" gives the level a given volume of sand reaches: a heap that always lies flat under
// gravity, on its side too, without a physics engine.
const NP = 2400;
const BULB_PTS = (() => {
  const out = new Float32Array(NP * 3);
  let k = 0, seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  while (k < NP) {
    const x = (rnd() * 2 - 1) * RMAX, z = (rnd() * 2 - 1) * RMAX, y = rnd();
    if (Math.hypot(x, z) < rad(y) * 0.985) { out[k * 3] = x; out[k * 3 + 1] = y; out[k * 3 + 2] = z; k++; }
  }
  return out;
})();
const VFILL = VS / VB;

const lin = (hex: string) => { const c = new THREE.Color(hex); return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`; };

type SandU = {
  uUp: { value: THREE.Vector3 }; uC: { value: number }; uK: { value: number }; uR0: { value: number };
  uModel: { value: THREE.Matrix4 }; uLevels: { value: number[] }; uN: { value: number }; uActive: { value: number }; uStripeOn: { value: number };
};
function sandMaterial(grain: THREE.Texture) {
  const u: SandU = {
    uUp: { value: new THREE.Vector3(0, 1, 0) }, uC: { value: 0 }, uK: { value: 0 }, uR0: { value: 0.5 },
    uModel: { value: new THREE.Matrix4() }, uLevels: { value: new Array(16).fill(-99) }, uN: { value: 0 }, uActive: { value: -1 }, uStripeOn: { value: 0 },
  };
  const m = new THREE.MeshStandardMaterial({ color: SAND, roughness: 0.97, bumpMap: grain, bumpScale: 0.7, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vLocal;
uniform vec3 uUp; uniform float uC; uniform float uK; uniform float uR0; uniform mat4 uModel;
uniform float uLevels[16]; uniform int uN; uniform int uActive; uniform float uStripeOn;`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
float hh = dot(vLocal, uUp);
vec3 rv = vLocal - uUp * hh; float rho = length(rv);
float surf = uC + uK * max(0.0, 1.0 - rho / uR0);
if (hh > surf) discard;
vec3 sN = normalize(uUp + (rho < uR0 && rho > 1e-4 ? (uK / uR0) * (rv / rho) : vec3(0.0)));`)
      .replace('#include <color_fragment>', `#include <color_fragment>
if (uStripeOn > 0.5 && gl_FrontFacing) {
  for (int i = 0; i < 16; i++) {
    if (i >= uN) break;
    float w = i == uActive ? 0.017 : 0.0085;
    if (abs(hh - uLevels[i]) < w) diffuseColor.rgb = i == uActive ? ${lin(LIT)} : ${lin(PLUM)};
  }
}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
if (!gl_FrontFacing) normal = normalize((viewMatrix * uModel * vec4(sN, 0.0)).xyz);`);
  };
  return { m, u };
}

function grainTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d')!;
  x.fillStyle = '#808080'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 2200; i++) { const v = Math.random() > 0.5 ? 255 : 0; x.fillStyle = `rgba(${v},${v},${v},0.35)`; x.fillRect(Math.random() * 128, Math.random() * 128, 1, 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 14);
  return t;
}

function lathe(points: [number, number][], seg = 72) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), seg);
}

const NG = typeof window !== 'undefined' && window.innerWidth <= 820 ? 300 : 560;

function Glass() {
  const { camera, size, gl } = useThree();
  const pivot = useRef<THREE.Group>(null);
  const meshA = useRef<THREE.Mesh>(null);
  const meshB = useRef<THREE.Mesh>(null);
  const streamRef = useRef<THREE.Group>(null);
  const grains = useRef<THREE.InstancedMesh>(null);
  const core = useRef<THREE.Mesh>(null);

  const R = useMemo(() => {
    const grain = grainTexture();
    const sandA = sandMaterial(grain), sandB = sandMaterial(grain);
    const fall = new THREE.MeshStandardMaterial({ color: '#c4ab7e', roughness: 0.9 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transmission: 1, thickness: 0.12, roughness: 0.03, ior: 1.47, clearcoat: 1, clearcoatRoughness: 0.04, specularIntensity: 1, envMapIntensity: 1.25, attenuationColor: new THREE.Color('#e9f0ec'), attenuationDistance: 2.2 });
    const black = new THREE.MeshPhysicalMaterial({ color: '#141312', roughness: 0.62, clearcoat: 0.25, clearcoatRoughness: 0.5 });
    const outer: [number, number][] = [];
    for (let i = 0; i <= 140; i++) { const y = -1 + (2 * i) / 140; outer.push([rad(Math.abs(y)) + WALL, y]); }
    const glassGeo = lathe(outer, 80);
    // the inside of one bulb, closed at both ends; the shader keeps only what lies under the sand level
    const inner: [number, number][] = [[0, 0.004]];
    for (let i = 0; i <= 60; i++) { const y = 0.004 + (i / 60) * 0.992; inner.push([rad(y) * 0.985, y]); }
    inner.push([0, 0.996]);
    const bulbA = lathe(inner, 64);
    const bulbB = bulbA.clone(); bulbB.scale(1, -1, 1);
    { const ix = bulbB.index!.array as Uint16Array | Uint32Array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } bulbB.index!.needsUpdate = true; bulbB.computeVertexNormals(); }
    const b = 0.03, h = CAP_H;
    const capGeo = lathe([[0, -h / 2], [CAP_R - b, -h / 2], [CAP_R, -h / 2 + b], [CAP_R, h / 2 - b], [CAP_R - b, h / 2], [0, h / 2]], 64);
    const postGeo = new THREE.CylinderGeometry(0.022, 0.022, 2, 16);
    const grainGeo = new THREE.IcosahedronGeometry(0.0085, 0);
    const coreGeo = new THREE.CylinderGeometry(0.0055, 0.0055, 1, 6); coreGeo.translate(0, -0.5, 0);
    return { grain, sandA, sandB, fall, glass, black, glassGeo, bulbA, bulbB, capGeo, postGeo, grainGeo, coreGeo };
  }, []);
  useEffect(() => () => {
    [R.grain, R.sandA.m, R.sandB.m, R.fall, R.glass, R.black, R.glassGeo, R.bulbA, R.bulbB, R.capGeo, R.postGeo, R.grainGeo, R.coreGeo].forEach((x) => x.dispose());
  }, [R]);

  const st = useRef({
    th: 0, w: 0, a: 0.56, flow: 0, time: 0, n: 0, k: 0, kA: 0, kB: 0,
    lag: new THREE.Vector3(0, 1, 0),
    secs: [] as { top: number; h: number; kind: string }[], ang: [] as number[],
    dA: new Float32Array(NP), dB: new Float32Array(NP),
  }).current;
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(() => Array.from({ length: NG }, (_, i) => ({ h: (i * 0.6180339) % 1, x: (Math.sin(i * 12.9898) * 43758.5453) % 1, z: (Math.sin(i * 78.233) * 12543.21) % 1, v: (i * 0.7548776) % 1 })), []);

  // Picking a stripe: a ray into the striped (lower) bulb, read at the height it hits.
  useEffect(() => {
    S.pick = (cx, cy) => {
      const r = gl.domElement.getBoundingClientRect();
      if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return -1;
      const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const sets = [{ mesh: meshA.current, s: R.sandA }, { mesh: meshB.current, s: R.sandB }];
      for (const { mesh, s } of sets) {
        if (!mesh || s.u.uStripeOn.value < 0.5) continue;
        for (const hit of ray.intersectObject(mesh, false)) {
          const p = mesh.worldToLocal(hit.point.clone());
          const hh = p.dot(s.u.uUp.value);
          if (hh > s.u.uC.value) continue;
          let best = -1, bd = 0.035;
          for (let i = 0; i < s.u.uN.value; i++) { const d = Math.abs(s.u.uLevels.value[i] - hh); if (d < bd) { bd = d; best = i; } }
          return best;
        }
      }
      return -1;
    };
    return () => { S.pick = () => -1; };
  }, [camera, gl, ray, R]);

  const up = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 12);
    st.time += dt;
    // sections, measured now and then
    if (st.n++ % 24 === 0) {
      const els = document.querySelectorAll<HTMLElement>('[data-turn]');
      st.secs = [...els].map((e) => { const b = e.getBoundingClientRect(); return { top: b.top + window.scrollY, h: Math.max(1, b.height), kind: e.dataset.turn || '' }; });
      st.ang = [];
      st.secs.forEach((s, i) => {
        if (i === 0) { st.ang.push(0); return; }
        const prev = st.secs[i - 1].kind;
        st.ang.push(st.ang[i - 1] + (s.kind === 'debate' || prev === 'debate' ? Math.PI / 2 : Math.PI));
      });
    }
    const vh = window.innerHeight;
    const mid = scroll.y + vh * 0.5;
    let k = 0;
    for (let i = 0; i < st.secs.length; i++) if (st.secs[i].top <= mid) k = i;
    const sec = st.secs[k];
    const last = k === st.secs.length - 1;
    // the last section ends where the page does: the last grain lands on the last scroll
    const q = !sec ? 0 : last ? clamp((mid - sec.top) / Math.max(1, scroll.max + vh * 0.5 - sec.top)) : clamp((mid - sec.top) / sec.h);
    if (k !== st.k) {
      st.k = k;
      // a new section takes the glass back from the hand, to the nearest whole turn
      if (!S.dragging) { S.userTo = Math.round(S.userTo / (Math.PI * 2)) * Math.PI * 2; S.user = S.userTo; }
      S.free = k === 0;
    }
    // the turn happens across the boundary between two sections, done before the heading is read
    let thS = 0;
    if (st.ang.length && sec) {
      const into = mid - sec.top;
      if (k > 0 && into < vh * 0.14) thS = lerp(st.ang[k - 1], st.ang[k], 0.5 + 0.5 * smooth(clamp(into / (vh * 0.14))));
      else if (k < st.secs.length - 1 && st.secs[k + 1].top - mid < vh * 0.14) thS = lerp(st.ang[k], st.ang[k + 1], 0.5 * smooth(clamp(1 - (st.secs[k + 1].top - mid) / (vh * 0.14))));
      else thS = st.ang[k];
    }
    const target = thS + S.user;
    st.w += (70 * (target - st.th) - 12 * st.w) * dt;
    st.th += st.w * dt;
    const cos = Math.cos(st.th), sin = Math.sin(st.th);
    const gate = clamp((Math.abs(cos) - 0.4) / 0.4);

    // how much sand is in bulb A: by gravity when the hand has it, by scroll otherwise
    const handTurned = S.dragging || Math.abs(S.userTo) > 0.1;
    let inflow = 0;
    if (S.free || handTurned) {
      const rate = (gate / (k === 0 && !handTurned ? 26 : 12)) * dt;
      if (cos > 0) { const d = Math.min(st.a, rate); st.a -= d; inflow = d / dt; }
      else { const d = Math.min(1 - st.a, rate); st.a += d; inflow = d / dt; }
    } else if (sec && sec.kind !== 'debate') {
      const s0 = sec.kind === 'today' ? 1 - S.todayTop : sec.kind === 'github' ? 0.45 : 0;
      const lower = s0 + (1 - s0) * clamp((q - 0.16) / 0.72);
      const lowerIsB = Math.cos(st.ang[k] ?? 0) > 0;
      const aT = lowerIsB ? 1 - lower : lower;
      const prev = st.a;
      st.a = damp(st.a, aT, 4, dt);
      const moved = (cos > 0 ? prev - st.a : st.a - prev) / dt;
      inflow = Math.max(0, moved) * gate;
    }
    st.flow = damp(st.flow, clamp(inflow * 22) * gate, 9, dt);

    // the sand's own sense of "up" lags the glass a little, so a quick turn slumps
    up.set(sin, cos, 0);
    st.lag.lerp(up, 1 - Math.exp(-7 * dt)).normalize();
    const U = st.lag;
    const lowerA = cos < 0;
    st.kA = damp(st.kA, gate * (lowerA ? 0.2 * clamp((st.a) / 0.12) : st.flow > 0.05 ? -0.09 : 0), 3, dt);
    st.kB = damp(st.kB, gate * (!lowerA ? 0.2 * clamp((1 - st.a) / 0.12) : st.flow > 0.05 ? -0.09 : 0), 3, dt);
    const level = (frac: number, sign: number, d: Float32Array, s: ReturnType<typeof sandMaterial>, kk: number, lower: boolean, mesh: THREE.Mesh | null) => {
      for (let i = 0; i < NP; i++) d[i] = BULB_PTS[i * 3] * U.x + sign * BULB_PTS[i * 3 + 1] * U.y + BULB_PTS[i * 3 + 2] * U.z;
      d.sort();
      const at = (f: number) => d[Math.min(NP - 1, Math.max(0, Math.floor(f * VFILL * NP)))];
      const u = s.u;
      if (mesh) mesh.visible = frac > 0.004;
      u.uUp.value.copy(U); u.uC.value = at(frac); u.uK.value = kk; u.uR0.value = 0.42;
      if (pivot.current) u.uModel.value.copy(pivot.current.matrixWorld);
      u.uStripeOn.value = lower ? 1 : 0;
      const n = Math.min(16, S.stripes);
      u.uN.value = n; u.uActive.value = S.active;
      for (let i = 0; i < n; i++) u.uLevels.value[i] = at(frac * stripeAt(i, n));
      return u.uC.value + kk;
    };
    const topA = level(st.a, 1, st.dA, R.sandA, st.kA, lowerA, meshA.current);
    const topB = level(1 - st.a, -1, st.dB, R.sandB, st.kB, !lowerA, meshB.current);

    // the glass, lifted so a corner never goes through the floor
    const lift = HX * Math.abs(sin) + HY * Math.abs(cos);
    if (pivot.current) { pivot.current.position.y = lift; pivot.current.rotation.z = st.th; }

    // the stream, in world space: from the neck straight down to the heap below
    const lowerFrac = lowerA ? st.a : 1 - st.a;
    const surf = lowerA ? topA : topB;
    const fall = Math.max(0.02, lowerFrac > 0.004 ? -surf : HY * Math.abs(cos) - CAP_H);
    if (streamRef.current) streamRef.current.position.y = lift;
    if (core.current) { core.current.visible = st.flow > 0.3; core.current.scale.set(1, fall, 1); }
    const gm = grains.current;
    if (gm) {
      for (let i = 0; i < NG; i++) {
        const sd = seeds[i];
        const on = sd.v < st.flow;
        const t = (st.time * (1.1 + sd.v * 0.3) + sd.h) % 1;
        const spread = 0.004 + t * 0.007;
        dummy.position.set(sd.x * spread, -fall * t * t, sd.z * spread);
        dummy.scale.setScalar(on ? 0.6 + Math.abs(sd.x) * 0.8 : 0);
        dummy.updateMatrix();
        gm.setMatrixAt(i, dummy.matrix);
      }
      gm.instanceMatrix.needsUpdate = true;
    }

    // a long lens, framed so the glass fits on its side too
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const tan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const dist = Math.max(2.95 / (2 * tan), 2.9 / aspect / (2 * tan));
    cam.position.set(0.0, 1.4, dist);
    cam.lookAt(0, 1.16, 0);
  });

  return (
    <>
      <group ref={pivot}>
        <mesh geometry={R.glassGeo} material={R.glass} renderOrder={2} />
        <mesh ref={meshA} geometry={R.bulbA} material={R.sandA.m} />
        <mesh ref={meshB} geometry={R.bulbB} material={R.sandB.m} />
        <mesh geometry={R.capGeo} material={R.black} position={[0, 1 + CAP_H / 2, 0]} />
        <mesh geometry={R.capGeo} material={R.black} position={[0, -1 - CAP_H / 2, 0]} />
        {[30, 150, 270].map((d) => (
          <mesh key={d} geometry={R.postGeo} material={R.black} position={[Math.cos((d * Math.PI) / 180) * POST_R, 0, Math.sin((d * Math.PI) / 180) * POST_R]} />
        ))}
      </group>
      <group ref={streamRef}>
        <mesh ref={core} geometry={R.coreGeo} material={R.fall} />
        <instancedMesh ref={grains} args={[R.grainGeo, R.fall, NG]} frustumCulled={false} />
      </group>
    </>
  );
}

export default function Scene() {
  return (
    <Canvas
      className="hg-canvas"
      dpr={[1, 1.6]}
      gl={{ antialias: true }}
      camera={{ fov: 16, near: 0.5, far: 60, position: [0, 1.45, 12] }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1.02; }}
    >
      <color attach="background" args={[BONE]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[-3.5, 6, 4]} intensity={2.1} color="#fffaf2" />
      <directionalLight position={[3, 2.5, -4]} intensity={1.1} color="#ffffff" />
      <Environment resolution={256} frames={1}>
        {/* soft key, two rim strips behind, a dim front fill; the rest stays dark so the glass edges read on bone */}
        <Lightformer form="rect" intensity={3} color="#fffaf2" position={[-4, 5, 4]} rotation-y={Math.PI / 5} scale={[4, 6, 1]} />
        <Lightformer form="rect" intensity={6} color="#ffffff" position={[-2.2, 1, -4]} scale={[0.5, 8, 1]} />
        <Lightformer form="rect" intensity={6} color="#ffffff" position={[2.4, 1, -4]} scale={[0.4, 8, 1]} />
        <Lightformer form="rect" intensity={0.8} color={BONE} position={[0, 1, 8]} rotation-y={Math.PI} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={1.4} color={BONE} position={[0, -3, 0]} rotation-x={-Math.PI / 2} scale={[20, 20, 1]} />
      </Environment>
      <Glass />
      <ContactShadows position={[0, 0.001, 0]} scale={6} resolution={256} blur={2.4} far={2.6} opacity={0.42} color="#2a2118" />
    </Canvas>
  );
}
