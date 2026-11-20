// The one object: a tall, heavy-bottomed glass of sparkling water on a white sweep, lit like a product shot.
// Every stream of bubbles is a commit (or, offline, a repo). The camera sinks with the page and rises again.
import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { scroll } from '@/lib/scroll';
import { clamp, damp, lerp, smooth } from '@/lib/utils';
import { F, G, nucleus, type Stream } from './store';

const PAGE = '#eef2f0';
const SEG = 96;

// the inner wall radius at height y (the glass flares a little toward the rim)
const wallR = (y: number) => lerp(G.rIn, G.rTop, clamp((y - (G.base + 0.2)) / (G.h - 0.02 - G.base - 0.2)));

function glassGeometry() {
  const p: [number, number][] = [
    [0, 0], [0.88, 0], [0.95, 0.012], [0.985, 0.06], [1.0, 0.16],
    [G.rTop + 0.075, G.h - 0.03], [G.rTop + 0.068, G.h - 0.005], [G.rTop + 0.04, G.h + 0.008], [G.rTop + 0.012, G.h], [G.rTop, G.h - 0.02],
    [G.rIn, G.base + 0.2], [0.89, G.base + 0.09], [0.84, G.base + 0.03], [0.6, G.base + 0.005], [0, G.base],
  ];
  return new THREE.LatheGeometry(p.map(([x, y]) => new THREE.Vector2(x, y)), SEG);
}

function waterGeometry() {
  const L = G.level, w = wallR(L) - 0.006;
  const p: [number, number][] = [
    [0, G.base + 0.004], [0.6, G.base + 0.009], [0.835, G.base + 0.034], [0.884, G.base + 0.094], [G.rIn - 0.006, G.base + 0.2],
    [w, L + 0.036], [w - 0.018, L + 0.013], [w - 0.055, L + 0.004], [w - 0.13, L], [0.55, L], [0.3, L], [0.12, L], [0, L],
  ];
  const top = 5; // profile index where the surface (and the meniscus) begins
  const geo = new THREE.LatheGeometry(p.map(([x, y]) => new THREE.Vector2(x, y)), SEG);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const rest = Float32Array.from(pos.array as Float32Array);
  const isTop: number[] = [];
  for (let i = 0; i <= SEG; i++) for (let j = top; j < p.length; j++) isTop.push(i * p.length + j);
  return { geo, rest, isTop };
}

function sliceTexture(kind: 1 | 2) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d')!;
  const rind = kind === 1 ? '#3f6b12' : '#e2b812', pith = kind === 1 ? '#e9f2cf' : '#fbf4d2', pulp = kind === 1 ? '#9cc23a' : '#f4d84a';
  g.fillStyle = rind; g.beginPath(); g.arc(256, 256, 256, 0, Math.PI * 2); g.fill();
  g.fillStyle = pith; g.beginPath(); g.arc(256, 256, 236, 0, Math.PI * 2); g.fill();
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 + 0.03, a1 = ((i + 1) / n) * Math.PI * 2 - 0.03;
    g.fillStyle = pulp;
    g.beginPath(); g.moveTo(256 + Math.cos((a0 + a1) / 2) * 18, 256 + Math.sin((a0 + a1) / 2) * 18);
    g.arc(256, 256, 214, a0, a1); g.closePath(); g.fill();
    // a little juice-cell texture
    for (let k = 0; k < 40; k++) {
      const a = a0 + Math.random() * (a1 - a0), r = 40 + Math.random() * 160;
      g.fillStyle = `rgba(255,255,255,${0.08 + Math.random() * 0.14})`;
      g.beginPath(); g.ellipse(256 + Math.cos(a) * r, 256 + Math.sin(a) * r, 3, 9, a, 0, Math.PI * 2); g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function causticTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d')!;
  g.filter = 'blur(10px)';
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 16;
  g.beginPath(); g.ellipse(250, 128, 170, 70, 0, Math.PI * 0.85, Math.PI * 2.15); g.stroke();
  g.filter = 'blur(26px)';
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.beginPath(); g.ellipse(300, 132, 110, 40, 0, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const bubbleVert = /* glsl */ `
attribute float aHi;
varying float vHi; varying vec3 vN; varying vec3 vV;
void main() {
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelViewMatrix) * mat3(instanceMatrix) * normal);
  vV = normalize(-mv.xyz);
  vHi = aHi;
  gl_Position = projectionMatrix * mv;
}`;
const bubbleFrag = /* glsl */ `
uniform vec3 uRim; uniform vec3 uLit;
varying float vHi; varying vec3 vN; varying vec3 vV;
void main() {
  vec3 n = normalize(vN);
  float f = 1.0 - clamp(dot(n, normalize(vV)), 0.0, 1.0);
  float edge = pow(f, 2.4);
  float spec = pow(max(dot(n, normalize(vec3(-0.45, 0.75, 0.55))), 0.0), 70.0);
  vec3 rim = mix(uRim, uLit, vHi);
  vec3 col = mix(rim, vec3(1.0), clamp(spec * 1.4, 0.0, 1.0));
  float a = clamp(edge * 0.8 + spec + 0.05, 0.0, 1.0);
  a = mix(a, max(a, 0.62), vHi);
  gl_FragColor = vec4(col, a);
}`;

type Props = { streams: Stream[]; fresh: number; crown: number; slice: 0 | 1 | 2; phone: boolean };

// The two championship streams: the steadiest in the glass, born at the centre of the base.
const WINS: Stream[] = [
  { repo: '#win0', x: -0.3, z: 0.12, rate: 3.2 },
  { repo: '#win1', x: 0.28, z: -0.06, rate: 3.2 },
];

function Glass({ streams, fresh, crown, slice, phone }: Props) {
  const { camera, size } = useThree();
  const group = useRef<THREE.Group>(null);
  const sliceRef = useRef<THREE.Mesh>(null);
  const waterRef = useRef<THREE.Mesh>(null);
  const bubbles = useRef<THREE.InstancedMesh>(null);
  const glassGeo = useMemo(glassGeometry, []);
  const water = useMemo(waterGeometry, []);
  const N = phone ? 200 : 640;
  const all = useMemo(() => [...streams, ...WINS], [streams]);
  const tex = useMemo(() => (slice ? sliceTexture(slice) : null), [slice]);
  const caustic = useMemo(causticTexture, []);

  const st = useRef({
    t: 0, fill: 0, out: false, tilt: 0, tv: 0, slosh: 0, sv: 0, prevTv: 0, sx: 0, sxv: 0,
    acc: [] as number[], base: 0,
    camLy: 1.95, camHf: 4.9, camEl: 0.3, secs: [] as { c: number; pose: number[] }[], secT: 0,
    sx2d: [] as number[],
  }).current;
  const pool = useMemo(() => ({
    on: new Uint8Array(N), x: new Float32Array(N), y: new Float32Array(N), z: new Float32Array(N),
    vy: new Float32Array(N), r: new Float32Array(N), s: new Int16Array(N), ph: new Float32Array(N), x0: new Float32Array(N),
  }), [N]);
  const hi = useMemo(() => new THREE.InstancedBufferAttribute(new Float32Array(N), 1), [N]);
  const sphere = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 14, 10);
    g.setAttribute('aHi', hi);
    return g;
  }, [hi]);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: bubbleVert, fragmentShader: bubbleFrag, transparent: true, depthWrite: false,
    uniforms: { uRim: { value: new THREE.Color('#2f4842') }, uLit: { value: new THREE.Color('#5c8a12') } },
  }), []);
  const m4 = useMemo(() => new THREE.Matrix4(), []);
  const v3 = useMemo(() => new THREE.Vector3(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const one = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => () => { glassGeo.dispose(); water.geo.dispose(); sphere.dispose(); mat.dispose(); tex?.dispose(); caustic.dispose(); }, [glassGeo, water, sphere, mat, tex, caustic]);

  const spawn = (s: number, burst = false) => {
    for (let i = crown; i < N; i++) {
      if (pool.on[i]) continue;
      const S = s >= 0 ? all[s] : null;
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * 0.78;
      pool.on[i] = 1;
      pool.x0[i] = S ? S.x + (Math.random() - 0.5) * 0.012 : Math.cos(a) * rr;
      pool.z[i] = S ? S.z + (Math.random() - 0.5) * 0.012 : Math.sin(a) * rr;
      pool.x[i] = pool.x0[i];
      pool.y[i] = G.base + 0.02;
      pool.vy[i] = burst ? 0.35 + Math.random() * 0.5 : 0.05;
      pool.r[i] = S && S.repo.startsWith('#') ? 0.016 : 0.013 + Math.random() * (burst ? 0.022 : 0.015);
      pool.s[i] = s;
      pool.ph[i] = Math.random() * 6.28;
      return;
    }
  };

  const measure = () => {
    st.secs = [...document.querySelectorAll<HTMLElement>('.v-fizz [data-pose]')].map((el) => {
      const r = el.getBoundingClientRect();
      const p = el.dataset.pose!;
      const d = Number(p);
      const pose = p === 'hero' ? [1.88, 4.25, 0.3] : p === 'out' ? [1.75, 6.2, 0.36] : [lerp(G.level - 0.15, 0.85, d), 2.6, 0.12];
      return { c: r.top + window.scrollY + Math.min(r.height, window.innerHeight) / 2, pose };
    });
  };

  // pointer: tap for a burst, drag to slosh, hover to light a stream
  useEffect(() => {
    const el = (document.querySelector('.v-fizz .fz-band') as HTMLElement) ?? null;
    if (!el) return;
    let down: { x: number; y: number; t: number; id: number } | null = null;
    let lastX = 0;
    const pick = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      let best = -1, bd = 26;
      st.sx2d.forEach((sx, i) => { const d = Math.abs(sx - x); if (d < bd) { bd = d; best = i; } });
      const repo = best >= 0 ? all[best].repo : '';
      const want = repo.startsWith('#') ? '' : repo;
      if (want !== F.lit) { F.lit = want; F.onLit(want); }
    };
    const pd = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }; lastX = e.clientX; };
    const pm = (e: PointerEvent) => {
      if (down && e.pointerId === down.id) {
        const dx = e.clientX - lastX; lastX = e.clientX;
        if (Math.abs(e.clientX - down.x) > 6) { st.tv += dx * 0.012; st.sxv += dx * 0.004; el.dataset.drag = '1'; }
      } else if (e.pointerType === 'mouse') pick(e);
    };
    const pu = (e: PointerEvent) => {
      if (down && performance.now() - down.t < 320 && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 8) { F.bursts++; pick(e); }
      down = null; el.dataset.drag = '';
    };
    const pl = () => { if (F.lit && !down) { F.lit = ''; F.onLit(''); } };
    el.addEventListener('pointerdown', pd); el.addEventListener('pointermove', pm);
    el.addEventListener('pointerup', pu); el.addEventListener('pointercancel', pu); el.addEventListener('pointerleave', pl);
    return () => {
      el.removeEventListener('pointerdown', pd); el.removeEventListener('pointermove', pm);
      el.removeEventListener('pointerup', pu); el.removeEventListener('pointercancel', pu); el.removeEventListener('pointerleave', pl);
    };
  }, [all, st]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20);
    st.t += dt;

    // camera: interpolate between the poses of the sections around the middle of the reading area
    st.secT -= dt;
    if (st.secT <= 0 || !st.secs.length) { measure(); st.secT = 0.8; }
    const ref = scroll.y + (phone ? window.innerHeight * 0.68 : window.innerHeight * 0.5);
    const S = st.secs;
    let pose = S[0]?.pose ?? [1.95, 4.9, 0.3];
    for (let i = 0; i < S.length; i++) {
      if (ref < S[i].c) {
        if (i === 0) pose = S[0].pose;
        else { const f = smooth(clamp((ref - S[i - 1].c) / (S[i].c - S[i - 1].c))); pose = S[i - 1].pose.map((v, k) => lerp(v, S[i].pose[k], f)); }
        break;
      }
      pose = S[i].pose;
    }
    st.camLy = damp(st.camLy, pose[0], 2.4, dt);
    st.camHf = damp(st.camHf, pose[1], 2.4, dt);
    st.camEl = damp(st.camEl, pose[2], 2.4, dt);
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const fitH = Math.max(st.camHf, (phone ? 2.6 : 2.5) / aspect);
    const dist = fitH / 2 / Math.tan((cam.fov * Math.PI) / 360);
    cam.position.set(Math.sin(st.t * 0.05) * 0.15, st.camLy + dist * st.camEl, dist);
    cam.lookAt(0, st.camLy, 0);
    const atBase = clamp(1 - (st.camLy - 0.9) / 0.6);
    // stepping out of the glass at the end: one last burst, once
    if (st.camHf > 5.9 && !st.out) { st.out = true; F.bursts++; }

    // the glass: a drag tips it on its base; a spring brings it back with a little overshoot
    const prev = st.tv;
    st.tv += (-st.tilt * 70 - st.tv * 7.5) * dt + F.nudge * 0.9;
    st.sxv += (-st.sx * 40 - st.sxv * 8) * dt;
    F.nudge = 0;
    st.tv = clamp(st.tv, -3, 3);
    st.tilt = clamp(st.tilt + st.tv * dt, -0.2, 0.2);
    st.sx = clamp(st.sx + st.sxv * dt, -0.4, 0.4);
    const angAcc = (st.tv - prev) / Math.max(dt, 1e-3);
    // the water lags behind and sloshes
    st.sv += (-st.slosh * 34 - st.sv * 1.9) * dt - clamp(angAcc, -40, 40) * 0.02;
    st.slosh = clamp(st.slosh + st.sv * dt, -0.3, 0.3);
    const g = group.current;
    if (g) { g.rotation.z = st.tilt; g.position.x = st.sx; }

    // the lathe seam sits on the right silhouette (both meshes are turned a quarter), where it cannot be seen
    // water surface: level in the world (so tilted against the glass), sloshing, rippled by the fizz
    const pos = water.geo.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const slope = Math.tan(st.slosh - st.tilt);
    const amp = 0.004 + 0.004 * fresh;
    for (const i of water.isTop) {
      const x = water.rest[i * 3], z = water.rest[i * 3 + 2], y = water.rest[i * 3 + 1];
      const r = Math.hypot(x, z);
      arr[i * 3 + 1] = y + slope * z * 0.9 + Math.sin(r * 14 - st.t * 5) * amp * (1 - r); // turned a quarter: local z is world x
    }
    pos.needsUpdate = true;
    water.geo.computeVertexNormals();
    // the pour: on arrival the glass fills from empty, fizzing hard, then settles
    st.fill = Math.min(1, st.fill + dt / 1.9);
    const fe = 1 - Math.pow(1 - st.fill, 3);
    const lvl = G.base + (G.level - G.base) * Math.max(0.02, fe);
    const wm = waterRef.current;
    if (wm) { const k = (lvl - G.base) / (G.level - G.base); wm.scale.y = k; wm.position.y = G.base * (1 - k); }
    const surf = (x: number) => lvl + slope * x * 0.9;
    if (st.fill < 1) for (let k = 0; k < (phone ? 2 : 4); k++) spawn(-1, true);

    // bursts
    while (F.bursts > 0) { F.bursts--; for (let k = 0; k < (phone ? 50 : 110); k++) spawn(-1, true); st.tv += (Math.random() - 0.5) * 0.4; }

    // streams
    const life = 0.55 + 0.45 * fresh;
    all.forEach((s, i) => {
      st.acc[i] = (st.acc[i] ?? Math.random()) + s.rate * life * dt;
      while (st.acc[i] >= 1) { st.acc[i] -= 1; spawn(i); }
    });

    // move, light and draw
    const mesh = bubbles.current;
    if (mesh) {
      let n = 0;
      for (let i = 0; i < N; i++) {
        let x: number, y: number, z: number, r: number, h = 0;
        if (i < crown) {
          if (fe < 0.97) continue;
          // the crown: bubbles clinging to the meniscus of a fresh pour
          const a = (i / Math.max(1, crown)) * Math.PI * 2 * 1.618 + st.t * 0.02;
          const rr = wallR(G.level) - 0.03 - ((i * 0.37) % 1) * (i % 3 === 0 ? 0.6 : 0.12);
          x = Math.cos(a) * rr; z = Math.sin(a) * rr;
          y = surf(x) + 0.01 + Math.sin(st.t * 1.3 + i) * 0.003;
          r = 0.012 + ((i * 0.61) % 1) * 0.016;
        } else {
          if (!pool.on[i]) continue;
          pool.vy[i] = Math.min(pool.vy[i] + 1.1 * dt, 0.95);
          pool.y[i] += pool.vy[i] * dt;
          pool.r[i] *= 1 + 0.05 * dt;
          pool.x[i] = pool.x0[i] + Math.sin(st.t * 7 + pool.ph[i]) * 0.006 * (pool.y[i] - G.base);
          if (pool.y[i] > surf(pool.x[i]) - pool.r[i]) { pool.on[i] = 0; continue; }
          x = pool.x[i]; y = pool.y[i]; z = pool.z[i]; r = pool.r[i];
          const s = pool.s[i];
          if (s >= 0) {
            const repo = all[s].repo;
            if (repo.startsWith('#')) h = Math.max(F.win === (repo === '#win0' ? 0 : 1) ? 1 : 0, atBase);
            else if (F.lit && repo === F.lit) h = 1;
          }
        }
        const rs = h > 0 ? r * (1 + 0.45 * h) : r;
        m4.compose(v3.set(x, y, z), q, one.set(rs, rs, rs));
        mesh.setMatrixAt(n, m4);
        hi.setX(n, h);
        n++;
      }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
      hi.needsUpdate = true;
    }

    // where each stream is on screen, for the pointer
    if (g) {
      g.updateMatrixWorld();
      st.sx2d = all.map((s) => {
        v3.set(s.x, G.base, s.z).applyMatrix4(g.matrixWorld).project(camera);
        return (v3.x * 0.5 + 0.5) * size.width;
      });
    }

    // the slice bobs on the surface
    const sl = sliceRef.current;
    if (sl) {
      sl.position.y = surf(0.27) + 0.005 + Math.sin(st.t * 1.4) * 0.008;
      sl.rotation.x = 1.15 + Math.sin(st.t * 0.9) * 0.03 + st.slosh * 0.6;
    }
  });

  return (
    <>
      <group ref={group}>
        <mesh geometry={glassGeo} renderOrder={3} rotation-y={Math.PI / 2}>
          <meshPhysicalMaterial
            transmission={1} thickness={0.35} roughness={0.02} ior={1.5} color="#fbfefd" attenuationColor="#d3e8df" attenuationDistance={1.6}
            clearcoat={1} clearcoatRoughness={0.04} specularIntensity={1} envMapIntensity={1.25} depthWrite={false}
          />
        </mesh>
        <mesh ref={waterRef} geometry={water.geo} renderOrder={1} rotation-y={Math.PI / 2}>
          <meshPhysicalMaterial
            transparent opacity={0.24} color="#d9ebe3" roughness={0.06} metalness={0} clearcoat={0.3} clearcoatRoughness={0.1}
            depthWrite={false} envMapIntensity={0.7} specularIntensity={1}
          />
        </mesh>
        {tex && (
          <mesh ref={sliceRef} position={[0.27, G.level, 0.2]} rotation={[1.15, 0.2, 0.3]} renderOrder={2}>
            <cylinderGeometry args={[0.42, 0.42, 0.055, 64]} />
            <meshPhysicalMaterial attach="material-0" color={slice === 1 ? '#3f6b12' : '#e2b812'} roughness={0.55} clearcoat={0.4} />
            <meshPhysicalMaterial attach="material-1" map={tex} roughness={0.4} clearcoat={0.5} />
            <meshPhysicalMaterial attach="material-2" map={tex} roughness={0.4} clearcoat={0.5} />
          </mesh>
        )}
        <instancedMesh ref={bubbles} args={[sphere, mat, N]} frustumCulled={false} renderOrder={2} />
      </group>
      <mesh rotation-x={-Math.PI / 2} position={[0.85, 0.003, -0.55]} scale={[3.4, 1.7, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={caustic} transparent opacity={0.45} depthWrite={false} toneMapped={false} color={slice === 1 ? '#f6ffe8' : slice === 2 ? '#fffbe8' : '#ffffff'} />
      </mesh>
    </>
  );
}

export default function Scene(props: Props & { run: boolean }) {
  return (
    <div className="fz-gl" aria-hidden="true">
      <Canvas
        frameloop={props.run ? 'always' : 'never'}
        dpr={[1, props.phone ? 1.5 : 1.6]} camera={{ fov: 22, near: 0.5, far: 80, position: [0, 3, 14] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.NeutralToneMapping; gl.toneMappingExposure = 1.0; }}
        style={{ touchAction: 'pan-y' }}
      >
        <color attach="background" args={[PAGE]} />
        <hemisphereLight args={['#ffffff', '#d5dcd8', 0.6]} />
        <Environment resolution={256} frames={1}>
          <color attach="background" args={['#262b2a']} />
          {/* the big softbox, overhead and to the left */}
          <Lightformer form="rect" intensity={4} color="#ffffff" position={[-5, 8, 4]} rotation-x={Math.PI / 2.4} scale={[10, 6, 1]} />
          {/* two tall strips: the rim lights that draw the glass edges */}
          <Lightformer form="rect" intensity={5} color="#ffffff" position={[-7, 2, -2]} rotation-y={Math.PI / 2.6} scale={[1.2, 10, 1]} />
          <Lightformer form="rect" intensity={3.5} color="#f4fbff" position={[7, 2, -3]} rotation-y={-Math.PI / 2.6} scale={[0.8, 10, 1]} />
          {/* a low white card in front for the base */}
          <Lightformer form="rect" intensity={1.4} color="#ffffff" position={[0, 0.5, 9]} rotation-y={Math.PI} scale={[12, 2, 1]} />
          {/* the sweep itself, bouncing white up from below */}
          <Lightformer form="rect" intensity={1.1} color="#eef2f0" position={[0, -2, 0]} rotation-x={-Math.PI / 2} scale={[30, 30, 1]} />
        </Environment>
        <ContactShadows position={[0, 0.001, 0]} scale={5} resolution={props.phone ? 256 : 512} far={1.6} blur={2.6} frames={8} opacity={0.42} color="#1f2b28" />
        <Glass {...props} />
      </Canvas>
    </div>
  );
}
