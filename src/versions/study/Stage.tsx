// Remixed from pmndrs/examples "kuwahara" (MIT): the olive ground, the Poly Haven apple on its contact shadow, the long lens and the Kuwahara oil pass. Here the pass is masked by a brush the pointer paints.
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, useGLTF } from '@react-three/drei';
import { st, queueSeg, type StopName } from './store';

const APPLE = import.meta.env.BASE_URL + 'study/apple.glb';
const TABLE = '#5b6b52';

type Pose = { pos: [number, number, number]; tgt: [number, number, number]; fov: number; cx: number };
// One held angle per section, the way a painter walks round a table.
const POSES: Record<StopName, Pose> = {
  open: { pos: [0, 0.085, 0.36], tgt: [0, 0.04, 0], fov: 30, cx: 0.28 },
  about: { pos: [0.17, 0.03, 0.19], tgt: [0, 0.045, 0], fov: 30, cx: 0.27 },
  debate: { pos: [0.04, 0.36, 0.1], tgt: [0, 0.03, 0], fov: 30, cx: 0.28 },
  work: { pos: [-0.2, 0.75, 2.1], tgt: [0, 0.04, 0], fov: 20, cx: 0.105 },
  research: { pos: [-0.27, 0.09, 0.2], tgt: [0, 0.042, 0], fov: 28, cx: 0.28 },
  today: { pos: [0, 0.05, 0.3], tgt: [0, 0.04, 0], fov: 30, cx: 0.28 },
  record: { pos: [0.24, 0.17, 0.25], tgt: [0, 0.035, 0], fov: 28, cx: 0.28 },
  contact: { pos: [0, 0.46, 0.002], tgt: [0, 0.03, 0], fov: 30, cx: 0.28 },
};

const QUAD_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const NOISE = /* glsl */ `
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
`;

// The brush: last frame's mask, thinned by time, plus soft rag strokes along the pointer's path.
const MASK_FRAG = /* glsl */ `
  uniform sampler2D prev; uniform float decay; uniform float aspect; uniform float radius;
  uniform vec4 segs[8]; uniform int count;
  varying vec2 vUv;
  ${NOISE}
  float seg(vec2 p, vec2 a, vec2 b){ vec2 pa = p-a, ba = b-a; float h = clamp(dot(pa,ba)/max(dot(ba,ba),1e-6), 0.0, 1.0); return length(pa - ba*h); }
  void main(){
    float m = max(texture2D(prev, vUv).r - decay, 0.0);
    vec2 p = vec2(vUv.x * aspect, vUv.y);
    float add = 0.0;
    for (int i = 0; i < 8; i++) {
      if (i >= count) break;
      vec4 s = segs[i];
      float d = seg(p, vec2(s.x*aspect, s.y), vec2(s.z*aspect, s.w));
      add = max(add, smoothstep(radius, radius*0.25, d));
    }
    // Bristle streaks: the rag drags unevenly.
    float bristle = 0.55 + 0.45 * vnoise(p * vec2(26.0, 90.0));
    m = clamp(max(m, add * (0.55 + 0.6 * bristle)), 0.0, 1.0);
    gl_FragColor = vec4(m, m, m, 1.0);
  }
`;

// Kuwahara, copied from @react-three/postprocessing's KuwaharaEffect (anisotropic, sector based), run at half resolution
// on gamma-lifted colour so its variance weights behave as they do after tone mapping.
const KUWA_FRAG = /* glsl */ `
  uniform sampler2D inputBuffer; uniform vec2 texelSize; uniform float radius; uniform int sectorCount; uniform float aspect;
  varying vec2 vUv;
  ${NOISE}
  vec3 src(vec2 uv){ return sqrt(max(texture2D(inputBuffer, uv).rgb, 0.0) / (1.0 + max(texture2D(inputBuffer, uv).rgb, 0.0))); }
  float luma(vec2 uv){ return dot(src(uv), vec3(0.299, 0.587, 0.114)); }
  vec3 structureTensor(vec2 uv){
    vec2 d = texelSize * max(1.0, radius * 0.5);
    float tl = luma(uv + vec2(-d.x, d.y)); float tc = luma(uv + vec2(0.0, d.y)); float tr = luma(uv + d);
    float ml = luma(uv - vec2(d.x, 0.0)); float mr = luma(uv + vec2(d.x, 0.0));
    float bl = luma(uv - d); float bc = luma(uv - vec2(0.0, d.y)); float br = luma(uv + vec2(d.x, -d.y));
    float gx = (tr + 2.0*mr + br) - (tl + 2.0*ml + bl);
    float gy = (tl + 2.0*tc + tr) - (bl + 2.0*bc + br);
    return vec3(gx*gx, gy*gy, gx*gy);
  }
  void main(){
    vec2 uv = vUv;
    vec3 stt = structureTensor(uv);
    float diff = stt.x - stt.y;
    float root = sqrt(diff*diff + 4.0*stt.z*stt.z);
    float anisotropy = root / (stt.x + stt.y + 1e-7);
    float phi = 0.5 * atan(2.0*stt.z, diff + 1e-7);
    float c = cos(phi), s = sin(phi);
    mat2 transform = mat2(c, s, -s, c) * mat2(1.0/(1.0+anisotropy), 0.0, 0.0, 1.0+anisotropy);
    int count = clamp(sectorCount, 2, 8);
    float sectorAngle = 6.28318531 / float(count);
    vec3 center = src(uv);
    vec3 colorSum = vec3(0.0); float weightSum = 0.0;
    for (int i = 0; i < 8; i++) {
      if (i >= count) break;
      vec3 sum = center; vec3 sumSq = center*center; float n = 1.0;
      for (float r = 1.0; r <= 8.0; r += 1.0) {
        if (r > radius) break;
        for (int k = 0; k < 3; k++) {
          float a = (float(i) + (float(k) + 0.5) / 3.0) * sectorAngle;
          vec2 offset = transform * (vec2(cos(a), sin(a)) * r) * texelSize;
          vec3 col = src(uv + offset);
          sum += col; sumSq += col*col; n += 1.0;
        }
      }
      vec3 mean = sum / n;
      vec3 variance = abs(sumSq / n - mean*mean);
      float weight = 1.0 / (1.0 + pow(255.0 * sqrt(variance.r + variance.g + variance.b), 4.0));
      colorSum += mean * weight; weightSum += weight;
    }
    vec3 g = colorSum / weightSum;
    // brush marks: streaks laid along the form (the tensor's direction), loose and diagonal where the ground is flat
    float ang = mix(0.75, phi + 1.5708, clamp(anisotropy * 3.0, 0.0, 1.0));
    vec2 q = vec2(uv.x * aspect, uv.y);
    q = mat2(cos(ang), sin(ang), -sin(ang), cos(ang)) * q;
    float marks = vnoise(q * vec2(34.0, 150.0)) * 0.65 + vnoise(q * vec2(9.0, 38.0)) * 0.35;
    g *= 1.0 + (marks - 0.5) * 0.11;
    // back to the linear scale the composite expects
    vec3 l = g*g; l = l / max(1.0 - l, 1e-3);
    gl_FragColor = vec4(l, 1.0);
  }
`;

// The composite: where the brush has been, the clean render; elsewhere, the paint. swap flips which one rests.
const COMP_FRAG = /* glsl */ `
  uniform sampler2D clean; uniform sampler2D paint; uniform sampler2D mask; uniform float swap; uniform float force; uniform float aspect; uniform vec2 px;
  varying vec2 vUv;
  ${NOISE}
  void main(){
    float m = texture2D(mask, vUv).r;
    float n = vnoise(vec2(vUv.x*aspect, vUv.y) * 70.0) * 0.6 + vnoise(vec2(vUv.x*aspect, vUv.y) * 9.0) * 0.4;
    float w = smoothstep(0.18, 0.75, m + (n - 0.5) * 0.35);
    float photo = force >= 0.0 ? force : abs(swap - w);
    // impasto: light the paint's own relief so the strokes read as oil, not blur
    vec3 p0 = texture2D(paint, vUv).rgb;
    float l0 = dot(p0 / (1.0 + p0), vec3(0.299, 0.587, 0.114));
    vec3 pxx = texture2D(paint, vUv + vec2(px.x, 0.0)).rgb, pyy = texture2D(paint, vUv + vec2(0.0, px.y)).rgb;
    float lx = dot(pxx / (1.0 + pxx), vec3(0.299, 0.587, 0.114)), ly = dot(pyy / (1.0 + pyy), vec3(0.299, 0.587, 0.114));
    vec3 nrm = normalize(vec3((l0 - lx) * 16.0, (l0 - ly) * 16.0, 1.0));
    float relief = dot(nrm, normalize(vec3(-0.45, 0.55, 0.7))) - 0.7;
    float weave = vnoise(vUv * vec2(aspect, 1.0) * 420.0) - 0.5;
    vec3 painted = p0 * (1.0 + relief * 0.7 + weave * 0.04);
    vec3 col = mix(painted, texture2D(clean, vUv).rgb, photo);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function Apple() {
  const { scene } = useGLTF(APPLE, false, false);
  return <primitive object={scene} rotation-y={0.8} />;
}

function Painter() {
  const { gl, scene, camera, size, viewport } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const r = useMemo(() => {
    const mk = (w: number, h: number, o: Partial<THREE.RenderTargetOptions> = {}) =>
      new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false, ...o });
    const maskA = mk(512, 512), maskB = mk(512, 512);
    const sceneRT = mk(2, 2, { depthBuffer: true, samples: 4 });
    const halfRT = mk(2, 2);
    const qs = new THREE.Scene();
    const qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    quad.frustumCulled = false;
    qs.add(quad);
    const segs = Array.from({ length: 8 }, () => new THREE.Vector4());
    const mask = new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: MASK_FRAG, uniforms: { prev: { value: null }, decay: { value: 0 }, aspect: { value: 1 }, radius: { value: 0.07 }, segs: { value: segs }, count: { value: 0 } }, depthTest: false, depthWrite: false, toneMapped: false });
    const kuwa = new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: KUWA_FRAG, uniforms: { inputBuffer: { value: null }, texelSize: { value: new THREE.Vector2() }, radius: { value: 8 }, sectorCount: { value: 5 }, aspect: { value: 1 } }, depthTest: false, depthWrite: false, toneMapped: false });
    const comp = new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: COMP_FRAG, uniforms: { clean: { value: null }, paint: { value: null }, mask: { value: null }, swap: { value: 0 }, force: { value: -1 }, aspect: { value: 1 }, px: { value: new THREE.Vector2() } }, depthTest: false, depthWrite: false });
    // start with an empty mask
    const prev = gl.getRenderTarget();
    const cc = gl.getClearColor(new THREE.Color()), ca = gl.getClearAlpha();
    gl.setRenderTarget(maskA); gl.setClearColor(0x000000, 1); gl.clear(); gl.setRenderTarget(maskB); gl.clear(); gl.setRenderTarget(prev);
    gl.setClearColor(cc, ca);
    return { maskA, maskB, sceneRT, halfRT, qs, qc, quad, segs, mask, kuwa, comp, cur: maskA, nxt: maskB, w: 0, h: 0 };
  }, [gl]);

  useEffect(() => () => {
    [r.maskA, r.maskB, r.sceneRT, r.halfRT].forEach((t) => t.dispose());
    [r.mask, r.kuwa, r.comp].forEach((m) => m.dispose());
  }, [r]);

  const k = useRef({ pos: new THREE.Vector3(...POSES.open.pos), tgt: new THREE.Vector3(...POSES.open.tgt), fov: 30, cx: 0.28, cy: 0.5, swap: 0, idle: 0, frames: 0, auto: -1, last: 'open' as StopName, v: new THREE.Vector3() });

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const t = state.clock.elapsedTime;
    const s = k.current;
    const pose = POSES[st.stop];
    const W = size.width, H = size.height;
    const phone = st.phone;
    const tp = new THREE.Vector3(...pose.pos);
    if (phone) tp.sub(new THREE.Vector3(...pose.tgt)).multiplyScalar(st.stop === 'work' ? 0.55 : 1.9).add(new THREE.Vector3(...pose.tgt));
    const before = s.pos.x + s.pos.y + s.pos.z + s.cx + s.cy + s.swap + s.fov;
    const lam = 2.4;
    s.pos.x += (tp.x - s.pos.x) * (1 - Math.exp(-lam * dt));
    s.pos.y += (tp.y - s.pos.y) * (1 - Math.exp(-lam * dt));
    s.pos.z += (tp.z - s.pos.z) * (1 - Math.exp(-lam * dt));
    s.tgt.lerp(new THREE.Vector3(...pose.tgt), 1 - Math.exp(-lam * dt));
    s.fov += (pose.fov - s.fov) * (1 - Math.exp(-lam * dt));
    const cxT = phone ? 0.5 : pose.cx;
    s.cx += (cxT - s.cx) * (1 - Math.exp(-lam * dt));
    s.cy = phone ? st.cy : s.cy + (0.5 - s.cy) * (1 - Math.exp(-lam * dt));
    s.swap += (st.swap - s.swap) * (1 - Math.exp(-3 * dt));
    const moved = Math.abs(before - (s.pos.x + s.pos.y + s.pos.z + s.cx + s.cy + s.swap + s.fov)) > 1e-6;

    cam.position.copy(s.pos);
    cam.fov = s.fov;
    cam.up.set(0, 1, 0);
    cam.lookAt(s.tgt);
    cam.setViewOffset(W, H, (0.5 - s.cx) * W, (0.5 - s.cy) * H, W, H);
    cam.updateProjectionMatrix();

    // A stroke across the apple by itself when a section arrives.
    if (st.stop !== s.last) { s.last = st.stop; if (st.autoAt >= 0) s.auto = t + 0.5; }
    if (st.autoAt === -2) { st.autoAt = -1; s.auto = t; }
    if (s.auto > 0 && t >= s.auto) {
      const p = (t - s.auto) / 0.95;
      const c = s.v.set(0, 0.04, 0).project(cam);
      const ax = c.x * 0.5 + 0.5, ay = c.y * 0.5 + 0.5;
      const span = (phone ? 0.34 : 0.16) * (H / W);
      const e = (x: number) => 1 - Math.pow(1 - Math.min(1, x), 3);
      const p0 = e(Math.max(0, p - 0.05)), p1 = e(p);
      const X = (q: number) => ax + (q - 0.5) * span * 2.2;
      const Y = (q: number) => ay + 0.06 * Math.sin(q * Math.PI * 1.3) - 0.03;
      queueSeg(X(p0), Y(p0), X(p1), Y(p1));
      st.lastPaint = t;
      if (p >= 1) s.auto = -1;
    }

    const segs = st.segs.splice(0, 8);
    if (segs.length) st.lastPaint = t;
    const dpr = gl.getPixelRatio();
    const w = Math.max(2, Math.floor(W * dpr)), h = Math.max(2, Math.floor(H * dpr));
    const resized = w !== r.w || h !== r.h;
    if (resized) { r.w = w; r.h = h; r.sceneRT.setSize(w, h); r.halfRT.setSize(Math.ceil(w / 2), Math.ceil(h / 2)); }

    const painting = t - st.lastPaint < 3.2 || st.keep && segs.length > 0;
    if (!moved && !painting && !resized && t > 8 && st.force < 0) return;
    s.frames++;

    // 1. the brush
    r.segs.forEach((v, i) => { const g = segs[i]; if (g) v.set(g[0], g[1], g[2], g[3]); });
    r.mask.uniforms.prev.value = r.cur.texture;
    r.mask.uniforms.decay.value = st.keep ? 0 : dt * 0.42;
    r.mask.uniforms.aspect.value = W / H;
    r.mask.uniforms.radius.value = phone ? 0.06 : 0.075;
    r.mask.uniforms.count.value = segs.length;
    r.quad.material = r.mask;
    gl.setRenderTarget(r.nxt); gl.render(r.qs, r.qc);
    [r.cur, r.nxt] = [r.nxt, r.cur];

    // 2. the still life, clean
    gl.setRenderTarget(r.sceneRT); gl.render(scene, cam);

    // 3. the oil pass, half resolution
    r.kuwa.uniforms.inputBuffer.value = r.sceneRT.texture;
    const ts = phone ? 1.15 : 1.9;
    r.kuwa.uniforms.texelSize.value.set(ts / r.halfRT.width, ts / r.halfRT.height);
    r.kuwa.uniforms.aspect.value = W / H;
    r.quad.material = r.kuwa;
    gl.setRenderTarget(r.halfRT); gl.render(r.qs, r.qc);

    // 4. paint and photograph, mixed by the brush
    r.comp.uniforms.clean.value = r.sceneRT.texture;
    r.comp.uniforms.paint.value = r.halfRT.texture;
    r.comp.uniforms.mask.value = r.cur.texture;
    r.comp.uniforms.swap.value = s.swap;
    r.comp.uniforms.force.value = st.force;
    r.comp.uniforms.aspect.value = W / H;
    r.comp.uniforms.px.value.set(1 / r.halfRT.width, 1 / r.halfRT.height);
    r.quad.material = r.comp;
    gl.setRenderTarget(null); gl.render(r.qs, r.qc);
    if (!st.ready) { st.ready = true; document.documentElement.dataset.studyReady = '1'; if (st.autoAt !== -1) s.auto = t + 1.4; }
  }, 1);

  void viewport;
  return null;
}

function Pointer() {
  const { gl } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    let last: [number, number] | null = null;
    let start: [number, number] | null = null;
    let sideways = false;
    const uv = (e: PointerEvent): [number, number] => [e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight];
    const move = (e: PointerEvent) => {
      const p = uv(e);
      if (e.pointerType !== 'mouse') {
        if (!start) return;
        if (!sideways) {
          const dx = Math.abs(e.clientX - start[0]), dy = Math.abs(e.clientY - start[1]);
          if (dx > 8 && dx > dy * 1.2) sideways = true; else return;
        }
      }
      if (last) queueSeg(last[0], last[1], p[0], p[1]);
      last = p;
    };
    const down = (e: PointerEvent) => { start = [e.clientX, e.clientY]; sideways = false; last = e.pointerType === 'mouse' ? last : uv(e); };
    const up = () => { start = null; sideways = false; last = null; };
    const leave = (e: PointerEvent) => { if (e.pointerType === 'mouse') last = null; };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('pointerleave', leave);
    };
  }, [gl]);
  return null;
}

export default function Stage() {
  return (
    <Canvas
      className="canvas"
      dpr={[1, 1.5]}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{ position: POSES.open.pos, fov: 30, near: 0.01, far: 10 }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; }}
    >
      <color attach="background" args={[TABLE]} />
      <ambientLight intensity={0.45 * Math.PI} />
      <directionalLight position={[-0.5, 1, 0.6]} intensity={Math.PI} />
      <Suspense fallback={null}>
        <Environment resolution={256} background={false}>
          {/* a big north window, a softer rim behind, a warm bounce from the table */}
          <Lightformer form="rect" intensity={3.2} position={[-1.6, 1.8, 1.4]} scale={[2.2, 1.6, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={1.4} position={[1.8, 0.9, -1.4]} scale={[1.2, 2, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={0.6} color="#c9d4b8" position={[0, -1.2, 0]} rotation-x={Math.PI / 2} scale={[4, 4, 1]} />
          <Lightformer form="circle" intensity={2} position={[0.6, 2.2, 1.2]} scale={0.6} target={[0, 0, 0]} />
        </Environment>
        <Apple />
        <ContactShadows opacity={0.55} scale={1.5} blur={1} far={0.2} frames={60} />
      </Suspense>
      <Painter />
      <Pointer />
    </Canvas>
  );
}

useGLTF.preload(APPLE, false, false);
(window as unknown as { __study: typeof st }).__study = st;
