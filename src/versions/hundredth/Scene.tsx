// Remixed from edoardolunardi/infinite-canvas (Codrops "Infinite Canvas", MIT): chunked space, drag velocity and decay, drift, keyboard flight, depth fade.
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { WORK } from '@/content';
import {
  CHUNK_OFFSETS, CHUNK_SIZE, DEPTH_FADE_END, DEPTH_FADE_START, FRAME_H, INITIAL_CAMERA_Z, KEYBOARD_SPEED, MAX_VELOCITY, PAPER,
  PER_CHUNK, PROJECTS, PROJECT_DIST, PROJECT_W, RENDER_DISTANCE, VELOCITY_DECAY, VELOCITY_LERP, chunkPlanes, loadDrafts, loadTexture,
  type DraftItem, type Drafts,
} from './space';

const BASE = import.meta.env.BASE_URL;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ss = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export type Mode = 'open' | 'work' | 'close';
export type Hover = { item: DraftItem; team: boolean } | null;
export type Input = { keys: Set<string>; vx: number; vy: number; mx: number; my: number; dragging: boolean };
export type SceneProps = {
  mode: Mode; phone: boolean; track?: RefObject<HTMLElement | null>; area?: RefObject<HTMLElement | null>;
  caption?: RefObject<HTMLParagraphElement | null>; onHover?: (h: Hover) => void; onPick?: (h: NonNullable<Hover>) => void;
  onFilled?: () => void; onReady?: () => void;
};

// One material for every print: a flat photo with a thin paper border, fading into the paper with depth.
const VERT = /* glsl */ `
attribute vec4 aRect;
uniform vec3 uCam; uniform float uNear, uFar, uGrid0, uGrid1;
varying vec2 vUv; varying vec4 vRect; varying float vFade;
void main() {
  vUv = uv; vRect = aRect;
  vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vec3 d = abs(world.xyz - uCam);
  float grid = 1.0 - smoothstep(uGrid0, uGrid1, max(d.x, max(d.y, d.z)));
  float depth = 1.0 - smoothstep(uNear, uFar, d.z);
  vFade = min(grid, depth * depth);
  gl_Position = projectionMatrix * viewMatrix * world;
}`;
const FRAG = /* glsl */ `
uniform sampler2D uTex; uniform vec3 uPaper; uniform float uReveal, uDim, uBorder, uAspect;
varying vec2 vUv; varying vec4 vRect; varying float vFade;
void main() {
  vec2 b = vec2(uBorder / uAspect, uBorder);
  vec2 inner = (vUv - b) / (1.0 - 2.0 * b);
  vec3 col = vec3(0.976, 0.972, 0.962);
  if (inner.x > 0.0 && inner.x < 1.0 && inner.y > 0.0 && inner.y < 1.0) col = texture2D(uTex, vRect.xy + inner * vRect.zw).rgb;
  vec2 e = min(vUv, 1.0 - vUv) / fwidth(vUv);
  col = mix(col, vec3(0.78, 0.77, 0.74), 1.0 - smoothstep(0.5, 1.5, min(e.x, e.y)));
  gl_FragColor = vec4(mix(uPaper, col, vFade * uReveal * uDim), 1.0);
}`;
// The empty frame: a vermilion hairline round paper, filled once at the end.
const FRAME_FRAG = /* glsl */ `
uniform sampler2D uTex; uniform vec3 uPaper; uniform float uFill, uReveal;
varying vec2 vUv;
void main() {
  vec2 e = min(vUv, 1.0 - vUv) / fwidth(vUv);
  vec3 inside = vec3(0.962, 0.958, 0.948);
  vec2 iu = (vUv - 0.03) / 0.94;
  if (uFill > 0.0 && iu.x > 0.0 && iu.x < 1.0 && iu.y > 0.0 && iu.y < 1.0) inside = mix(inside, texture2D(uTex, iu).rgb, uFill);
  vec3 col = mix(inside, vec3(0.831, 0.216, 0.110), 1.0 - smoothstep(0.6, 1.8, min(e.x, e.y)));
  gl_FragColor = vec4(mix(uPaper, col, uReveal), 1.0);
}`;
const FRAME_VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const PLANE = new THREE.PlaneGeometry(1, 1);

function printMaterial(tex: THREE.Texture | null, aspect: number, dim: number, near: number, far: number) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    uniforms: {
      uTex: { value: tex }, uPaper: { value: new THREE.Vector3(...PAPER) }, uReveal: { value: 0 }, uDim: { value: dim },
      uBorder: { value: 0.045 }, uAspect: { value: aspect }, uCam: { value: new THREE.Vector3() },
      uNear: { value: near }, uFar: { value: far }, uGrid0: { value: CHUNK_SIZE * RENDER_DISTANCE }, uGrid1: { value: CHUNK_SIZE * (RENDER_DISTANCE + 1) },
    },
  });
}

type Sheet = { mesh: THREE.InstancedMesh; mat: THREE.ShaderMaterial; slots: number[]; team: boolean; items: DraftItem[]; rects: Float32Array };

function Space({ mode, phone, track, area, caption, onHover, onPick, onFilled, onReady, drafts }: SceneProps & { drafts: Drafts }) {
  const { camera, invalidate, size } = useThree();
  const work = mode === 'work';
  const near = work ? 50 : DEPTH_FADE_START, far = work ? 210 : DEPTH_FADE_END;
  const dim = work ? 0.62 : 1;

  // One instanced mesh per atlas, with per-instance UV rects.
  const sheets = useMemo<Sheet[]>(() => {
    const list = phone ? [drafts.portfolio] : [drafts.portfolio, drafts.skeptical];
    const cap = CHUNK_OFFSETS.length * PER_CHUNK;
    return list.map((s, k) => {
      const mat = printMaterial(null, 1.6, dim, near, far);
      const geo = PLANE.clone();
      const rects = new Float32Array(cap * 4);
      geo.setAttribute('aRect', new THREE.InstancedBufferAttribute(rects, 4));
      const mesh = new THREE.InstancedMesh(geo, mat, cap);
      mesh.count = 0; mesh.frustumCulled = false;
      return { mesh, mat, slots: [], team: k === 1, items: s.items, rects };
    });
  }, [drafts, phone, dim, near, far]);

  // Progressive load: the atlases decode after the page is readable, then the space fades in.
  const reveal = useRef({ v: 0, to: 0 });
  useEffect(() => {
    let live = true;
    const list = phone ? [drafts.portfolio] : [drafts.portfolio, drafts.skeptical];
    list.forEach((s, k) => loadTexture(`${BASE}hundredth/${s.file}`).then((t) => {
      if (!live) return;
      sheets[k].mat.uniforms.uTex.value = t;
      reveal.current.to = 1; onReady?.(); invalidate();
    }).catch(() => {}));
    return () => { live = false; };
  }, [sheets, drafts, phone, invalidate, onReady]);

  // The eight screenshots, at full resolution, only in the work flight.
  const projects = useMemo(() => !work ? [] : WORK.map((w, i) => {
    const mat = printMaterial(null, 1.6, 1, 1e4, 2e4);
    mat.uniforms.uBorder.value = 0.02; mat.uniforms.uGrid0.value = 1e4; mat.uniforms.uGrid1.value = 2e4;
    const geo = PLANE.clone();
    geo.setAttribute('aRect', new THREE.InstancedBufferAttribute(new Float32Array([0, 0, 1, 1]), 4));
    const mesh = new THREE.InstancedMesh(geo, mat, 1);
    mesh.frustumCulled = false;
    const p = PROJECTS[i];
    mesh.setMatrixAt(0, new THREE.Matrix4().compose(p, new THREE.Quaternion(), new THREE.Vector3(PROJECT_W, PROJECT_W / 1.6, 1)));
    loadTexture(BASE + w.img).then((t) => {
      const img = t.image as HTMLImageElement, a = img.width / img.height;
      mat.uniforms.uTex.value = t; mat.uniforms.uAspect.value = a; mat.uniforms.uReveal.value = 1;
      mesh.setMatrixAt(0, new THREE.Matrix4().compose(p, new THREE.Quaternion(), new THREE.Vector3(PROJECT_W, PROJECT_W / a, 1)));
      mesh.instanceMatrix.needsUpdate = true; invalidate();
    }).catch(() => {});
    return mesh;
  }), [work, invalidate]);

  // The empty frame at the origin.
  const frame = useMemo(() => {
    const mat = new THREE.ShaderMaterial({ vertexShader: FRAME_VERT, fragmentShader: FRAME_FRAG, uniforms: { uTex: { value: null }, uPaper: { value: new THREE.Vector3(...PAPER) }, uFill: { value: 0 }, uReveal: { value: 1 } } });
    const mesh = new THREE.Mesh(PLANE, mat);
    mesh.scale.set(FRAME_H * 1.6, FRAME_H, 1);
    return mesh;
  }, []);
  const fill = useRef({ v: 0, on: false, told: false });
  useEffect(() => {
    if (mode !== 'close') return;
    loadTexture(`${BASE}hundredth/self.jpg`).then((t) => { frame.material.uniforms.uTex.value = t; }).catch(() => {});
  }, [mode, frame]);

  // Chunks follow the camera: rebuild the instance buffers whenever it enters a new chunk.
  const chunkKey = useRef('');
  const m4 = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const v3 = useMemo(() => new THREE.Vector3(), []);
  const s3 = useMemo(() => new THREE.Vector3(), []);
  const rebuild = (cx: number, cy: number, cz: number) => {
    for (const s of sheets) { s.mesh.count = 0; s.slots.length = 0; }
    for (const o of CHUNK_OFFSETS) {
      for (const p of chunkPlanes(cx + o.dx, cy + o.dy, cz + o.dz)) {
        const k = sheets.length === 1 ? 0 : p.pick % 2;
        const s = sheets[k];
        const pickIdx = Math.floor(p.pick / 2) % s.items.length;
        const item = s.items[pickIdx];
        const sheet = k === 0 ? drafts.portfolio : drafts.skeptical;
        const i = s.mesh.count++;
        m4.compose(v3.set(p.x, p.y, p.z), q, s3.set(p.h * 1.6, p.h, 1));
        s.mesh.setMatrixAt(i, m4);
        const c = item.cell % sheet.cols, r = Math.floor(item.cell / sheet.cols);
        const cw = 320 / sheet.w, ch = 200 / sheet.h, px = 1.5 / sheet.w, py = 1.5 / sheet.h;
        s.rects.set([c * cw + px, 1 - (r + 1) * ch + py, cw - 2 * px, ch - 2 * py], i * 4);
        s.slots[i] = pickIdx;
      }
    }
    for (const s of sheets) {
      s.mesh.instanceMatrix.needsUpdate = true;
      (s.mesh.geometry.getAttribute('aRect') as THREE.InstancedBufferAttribute).needsUpdate = true;
      s.mesh.computeBoundingSphere();
    }
  };

  const st = useRef({ vel: new THREE.Vector3(), tv: new THREE.Vector3(), base: new THREE.Vector3(0, 0, INITIAL_CAMERA_Z), drift: new THREE.Vector2(), hover: null as null | { k: number; i: number }, snap: true });
  useEffect(() => { camera.position.set(0, 0, INITIAL_CAMERA_Z); st.current.base.set(0, 0, INITIAL_CAMERA_Z); st.current.snap = true; chunkKey.current = ''; invalidate(); }, [camera, invalidate, mode]);

  // Scroll moves the camera in the work and close modes; keep frames coming only while it is on screen.
  useEffect(() => {
    if (mode === 'open') return;
    const on = () => invalidate();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); };
  }, [mode, invalidate]);

  // Drag to fly (pointer and touch; the page keeps vertical touch scrolling), arrows and WASD while the band has focus. No wheel: the wheel scrolls the page.
  const input = useMemo<Input>(() => ({ keys: new Set(), vx: 0, vy: 0, mx: 0, my: 0, dragging: false }), []);
  useEffect(() => {
    const el = area?.current;
    if (mode !== 'open' || !el) return;
    let lx = 0, ly = 0, id = -1;
    const KEYS = new Set(['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
    const down = (e: PointerEvent) => { input.dragging = true; id = e.pointerId; lx = e.clientX; ly = e.clientY; el.style.cursor = 'grabbing'; };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      input.mx = ((e.clientX - r.left) / r.width) * 2 - 1; input.my = -((e.clientY - r.top) / r.height) * 2 + 1;
      if (input.dragging && e.pointerId === id) { input.vx -= (e.clientX - lx) * 0.025; input.vy += (e.clientY - ly) * 0.025; lx = e.clientX; ly = e.clientY; }
      invalidate();
    };
    const up = () => { input.dragging = false; id = -1; el.style.cursor = ''; invalidate(); };
    const leave = () => { input.mx = input.my = 0; invalidate(); };
    const kd = (e: KeyboardEvent) => { const k = e.key.toLowerCase(); if (!KEYS.has(k) || e.metaKey || e.ctrlKey || e.altKey) return; e.preventDefault(); input.keys.add(k); invalidate(); };
    const ku = (e: KeyboardEvent) => { input.keys.delete(e.key.toLowerCase()); invalidate(); };
    const blur = () => { input.keys.clear(); };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('keydown', kd);
    el.addEventListener('keyup', ku);
    el.addEventListener('blur', blur);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      el.removeEventListener('pointerleave', leave);
      el.removeEventListener('keydown', kd);
      el.removeEventListener('keyup', ku);
      el.removeEventListener('blur', blur);
    };
  }, [mode, area, input, invalidate]);

  const tmp = useMemo(() => new THREE.Vector3(), []);
  const tmp2 = useMemo(() => new THREE.Vector2(), []);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    const s = st.current;
    let busy = false;
    const vh = window.innerHeight;

    if (mode === 'open') {
      const k = input.keys;
      if (k.has('w') || k.has('arrowup')) s.tv.z -= KEYBOARD_SPEED;
      if (k.has('s') || k.has('arrowdown')) s.tv.z += KEYBOARD_SPEED;
      if (k.has('a') || k.has('arrowleft')) s.tv.x -= KEYBOARD_SPEED;
      if (k.has('d') || k.has('arrowright')) s.tv.x += KEYBOARD_SPEED;
      if (k.has('e')) s.tv.y += KEYBOARD_SPEED;
      if (k.has('q')) s.tv.y -= KEYBOARD_SPEED;
      s.tv.x += input.vx; s.tv.y += input.vy; input.vx = input.vy = 0;
      s.tv.clampScalar(-MAX_VELOCITY, MAX_VELOCITY);
      s.vel.lerp(s.tv, VELOCITY_LERP);
      s.base.add(s.vel);
      s.tv.multiplyScalar(VELOCITY_DECAY);
      // The base's slow drift: the camera leans toward the pointer.
      if (!input.dragging && !phone) s.drift.lerp(tmp2.set(input.mx * 6, input.my * 4), 0.06);
      camera.position.set(s.base.x + s.drift.x, s.base.y + s.drift.y, s.base.z);
      busy = s.vel.lengthSq() > 1e-6 || k.size > 0 || (!phone && !input.dragging && (Math.abs(s.drift.x - input.mx * 6) > 0.01 || Math.abs(s.drift.y - input.my * 4) > 0.01));
    } else if (track?.current) {
      const r = track.current.getBoundingClientRect();
      if (mode === 'work') {
        // One measured stop per project: hold while its plate is centred, travel between.
        const t = clamp(-r.top / Math.max(1, r.height - vh)) * (PROJECTS.length - 1);
        const i = Math.min(PROJECTS.length - 2, Math.floor(t)), f = ss(0.28, 0.72, t - i);
        const a = PROJECTS[i], b = PROJECTS[i + 1];
        target.set(lerp(a.x, b.x, f), lerp(a.y, b.y, f) + Math.sin(Math.PI * f) * 10, lerp(a.z, b.z, f) + PROJECT_DIST);
      } else {
        // The ending: from deep in the space back to the origin and the empty frame.
        const p = clamp((vh - r.top) / (vh * 0.82));
        const e = 1 - Math.pow(1 - p, 3);
        target.set(lerp(70, 0, e), lerp(34, 0, e), lerp(980, INITIAL_CAMERA_Z, e));
        if (p > 0.97 && !fill.current.on) fill.current.on = true;
      }
      const k = s.snap ? 1 : 1 - Math.exp(-6 * Math.min(dt, 0.1));
      s.snap = false;
      camera.position.lerp(target, k);
      busy = camera.position.distanceToSquared(target) > 0.01;
    }

    if (mode === 'close') {
      const fl = fill.current;
      if (fl.on && fl.v < 1) { fl.v = Math.min(1, fl.v + dt / 1.4); busy = true; }
      if (fl.on && !fl.told) { fl.told = true; onFilled?.(); }
      frame.material.uniforms.uFill.value = fl.v * fl.v * (3 - 2 * fl.v);
    }

    const cx = Math.floor(camera.position.x / CHUNK_SIZE), cy = Math.floor(camera.position.y / CHUNK_SIZE), cz = Math.floor(camera.position.z / CHUNK_SIZE);
    const key = `${cx},${cy},${cz}`;
    if (key !== chunkKey.current) { chunkKey.current = key; rebuild(cx, cy, cz); }

    const rv = reveal.current;
    if (rv.v < rv.to) { rv.v = Math.min(1, rv.v + dt / 0.9); busy = true; }
    for (const sh of sheets) { sh.mat.uniforms.uReveal.value = rv.v; sh.mat.uniforms.uCam.value.copy(camera.position); }

    // The caption follows its frame, below it.
    if (s.hover && caption?.current) {
      if (s.hover.k < 0) { v3.copy(frame.position); s3.copy(frame.scale); }
      else { sheets[s.hover.k].mesh.getMatrixAt(s.hover.i, m4); m4.decompose(v3, q, s3); }
      tmp.set(v3.x, v3.y - s3.y / 2, v3.z).project(camera);
      caption.current.style.transform = `translate(${((tmp.x + 1) / 2) * size.width}px, ${((1 - tmp.y) / 2) * size.height + 10}px) translateX(-50%)`;
    }
    if (busy) invalidate();
  });

  const over = (k: number) => (e: ThreeEvent<PointerEvent>) => {
    if (mode !== 'open' || e.instanceId === undefined) return;
    e.stopPropagation();
    const sh = sheets[k];
    const h = st.current.hover;
    if (h && h.k === k && h.i === e.instanceId) return;
    st.current.hover = { k, i: e.instanceId };
    onHover?.({ item: sh.items[sh.slots[e.instanceId]], team: sh.team });
    invalidate();
  };
  const overFrame = (e: ThreeEvent<PointerEvent>) => {
    if (mode !== 'open') return;
    e.stopPropagation();
    if (st.current.hover?.k === -1) return;
    st.current.hover = { k: -1, i: 0 };
    onHover?.({ item: { slug: 'hundredth', n: 100, name: 'This page', cell: -1 }, team: false });
    invalidate();
  };
  const out = () => { if (st.current.hover) { st.current.hover = null; onHover?.(null); } };
  const click = (k: number) => (e: ThreeEvent<MouseEvent>) => {
    if (mode !== 'open' || e.instanceId === undefined || e.delta > 6) return;
    const sh = sheets[k];
    onPick?.({ item: sh.items[sh.slots[e.instanceId]], team: sh.team });
  };

  return (
    <>
      <primitive object={frame} onPointerMove={overFrame} onPointerOut={out} />
      {sheets.map((s, k) => (
        <primitive key={k} object={s.mesh} onPointerMove={over(k)} onPointerOut={out} onClick={click(k)} />
      ))}
      {projects.map((m, i) => <primitive key={i} object={m} />)}
    </>
  );
}

export default function Scene(props: SceneProps) {
  const [drafts, setDrafts] = useState<Drafts | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(true);
  useEffect(() => { let live = true; loadDrafts().then((d) => live && setDrafts(d)).catch(() => {}); return () => { live = false; }; }, []);
  // Stop rendering entirely when the band is off screen.
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin: '120px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={wrap} className="gl" data-gl>
      <Canvas
        frameloop={on ? 'demand' : 'never'}
        dpr={[1, props.phone ? 1.25 : 1.6]}
        flat
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, INITIAL_CAMERA_Z], fov: props.mode === 'work' ? 42 : 50, near: 1, far: 600 }}
        style={{ touchAction: 'pan-y' }}
      >
        {drafts && <Space {...props} drafts={drafts} />}
      </Canvas>
    </div>
  );
}
