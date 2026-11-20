// The rope. One shared offscreen three.js renderer draws every rope band into its own 2D canvas,
// and only while that rope is moving. Each knot is an authored point path (a closed parametric
// trefoil or figure-eight knot cut open at its lowest lobe, with tails led out to the sides);
// untying is kinematic: the path slides from knotted to straight, starting at the pulled end.
import * as THREE from 'three';
import { clamp, smooth } from '@/lib/utils';

export type Kind = 'overhand' | 'overhandL' | 'eight';
type V = THREE.Vector3;

// Closed knots in the plane (x right, y up) with height z in [-1, 1]. Both are cut at their lowest
// lobe tip, (0, -3), where the strand runs in +x. t0 is that parameter.
const FORMS: Record<Kind, { f: (t: number) => [number, number, number]; t0: number }> = {
  overhand: { f: (t) => [Math.sin(t) + 2 * Math.sin(2 * t), Math.cos(t) - 2 * Math.cos(2 * t), -Math.sin(3 * t)], t0: Math.PI },
  overhandL: { f: (t) => [Math.sin(t) + 2 * Math.sin(2 * t), Math.cos(t) - 2 * Math.cos(2 * t), Math.sin(3 * t)], t0: Math.PI },
  // Figure-eight knot, rotated a quarter turn so its outer point sits at the bottom moving +x.
  eight: {
    f: (t) => { const r = 2 + Math.cos(2 * t); const x = r * Math.cos(3 * t), y = r * Math.sin(3 * t); return [y, -x, Math.sin(4 * t)]; },
    t0: 0,
  },
};
export const KNOT_NAME: Record<Kind, string> = { overhand: 'Overhand', overhandL: 'Overhand, left', eight: 'Figure-eight' };

/** Control points of one opened knot whose tails meet the tail line at lineZ, centred on x. */
function knotPoints(kind: Kind, x: number, lineZ: number, s: number, R: number) {
  const { f, t0 } = FORMS[kind];
  const lift = (2.3 * R) / (1.6 * s); // enough height that strands clear each other at crossings
  const cz = lineZ - 3.6 * s; // knot centre (screen up is -Z)
  const P = (px: number, py: number, pz: number) => new THREE.Vector3(x + px * s, R + (pz + 1) * s * lift, cz - py * s);
  const d = 0.42, n = 72, core: V[] = [];
  for (let i = 0; i <= n; i++) { const t = t0 + d + ((Math.PI * 2 - 2 * d) * i) / n; const [a, b, c] = f(t); core.push(P(a, b, c)); }
  const a = core[0], b = core[core.length - 1];
  // The tails cross once under the knot (left tail over, right tail under), then lie flat on the line.
  const inL = [new THREE.Vector3(x - 2.4 * s, R, lineZ), new THREE.Vector3(a.x - 1.0 * s, R + (a.y - R) * 0.6, a.z + 0.55 * s)];
  const outR = [new THREE.Vector3(b.x + 1.0 * s, R + (b.y - R) * 0.5, b.z + 0.55 * s), new THREE.Vector3(x + 2.4 * s, R, lineZ)];
  return [...inL, ...core, ...outR];
}

function resample(pts: V[], N: number) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const sp = curve.getSpacedPoints(N - 1);
  const out = new Float32Array(N * 3);
  sp.forEach((p, i) => { out[i * 3] = p.x; out[i * 3 + 1] = p.y; out[i * 3 + 2] = p.z; });
  return { arr: out, len: curve.getLength() };
}

export type Spec = {
  knots: Kind[];
  mode?: 'end' | 'all';
  size: 'big' | 'mid' | 'small' | 'cord';
  /** Where the straight rope lies, as a fraction of the visible depth from the top. */
  line?: number;
  /** The end leaves the band on the right once straight. */
  off?: boolean;
};

type Layout = { K: Float32Array; S: Float32Array; W: number; D: number; zc: number; R: number; s: number; len: number; knotU: number[]; pullPx: number };

const TH = (58 * Math.PI) / 180; // camera elevation
const FOV = 20;

function layout(spec: Spec, A: number, N: number): Layout {
  const cord = spec.size === 'cord';
  const s = cord ? 0.36 : 1;
  const R = cord ? 0.1 : spec.size === 'small' ? 0.42 : 0.34;
  const kh = 7.4 * s, kw = 7 * s * spec.knots.length;
  let W: number;
  if (cord) W = Math.max(spec.knots.length * 3.2 * s * 1.7, 16, kh * A * Math.sin(TH) * 1.18);
  else if (spec.size === 'small') W = Math.max(kh * A * Math.sin(TH) * 1.05, kw * 2);
  else W = Math.max(kw * (spec.knots.length > 1 ? 1.35 : spec.size === 'big' ? 1.5 : 2.0), kh * A * Math.sin(TH) * (spec.size === 'big' ? 1.12 : 1.22));
  const D = W / A / Math.sin(TH);
  const zc = 0;
  const lineK = cord ? zc + 0.62 * 3.6 * s : zc + 3.25 * s;
  const lineS = cord ? lineK : zc - D / 2 + D * (spec.line ?? 0.5);
  // Knots evenly placed along the band.
  const xs = spec.knots.map((_, i) => (spec.knots.length === 1 ? (cord ? 0 : -0.06 * W) : -W * 0.5 + (W * (i + 0.5)) / spec.knots.length * (cord ? 1 : 0.62) + (cord ? 0 : W * 0.19)));
  const pts: V[] = [new THREE.Vector3(xs[0] - W * 0.9, R, lineK)];
  const knotStarts: number[] = [];
  spec.knots.forEach((k, i) => { knotStarts.push(pts.length); pts.push(...knotPoints(k, xs[i], lineK, s, R)); });
  // The loose end: lies a little curled, inside the band unless this rope is a cord.
  const last = xs[xs.length - 1];
  const tipX = cord ? W * 0.9 : Math.min(last + 4.2 * s + W * 0.08, W * 0.4);
  if (!cord) pts.push(new THREE.Vector3((last + 2.4 * s + tipX) / 2, R, lineK + 0.35 * s));
  pts.push(new THREE.Vector3(tipX, R, lineK + (cord ? 0 : 0.1 * s)));
  const { arr: K, len } = resample(pts, N);
  // Where each knot sits along the rope (fraction of length), for highlighting.
  const knotU = xs.map((x) => { let best = 0, bd = 1e9; for (let i = 0; i < N; i++) { const dd = Math.abs(K[i * 3] - x) + Math.abs(K[i * 3 + 2] - (lineK - 3.6 * s)); if (dd < bd) { bd = dd; best = i; } } return best / (N - 1); });
  const endX = spec.off ? W * 0.62 : W * 0.455;
  const S = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { S[i * 3] = endX - len + (len * i) / (N - 1); S[i * 3 + 1] = R; S[i * 3 + 2] = lineS; }
  return { K, S, W, D, zc, R, s, len, knotU, pullPx: endX - tipX };
}

// ---------------------------------------------------------------- shared renderer
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene, camera: THREE.PerspectiveCamera, key: THREE.DirectionalLight, floor: THREE.Mesh;
let material: THREE.MeshPhysicalMaterial;
const ropes = new Set<Rope>();
let raf = 0;

function boot() {
  if (renderer) return renderer;
  const canvas = document.createElement('canvas');
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0x000000, 0);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 400);
  scene.add(new THREE.HemisphereLight(0xfff8ee, 0xd8ccb4, 1.7), new THREE.AmbientLight(0xfff4e6, 0.35));
  key = new THREE.DirectionalLight(0xfff3e2, 3.0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 1024);
  key.shadow.radius = 4;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xffffff, 0.9);
  rim.position.set(6, 5, -14);
  scene.add(rim);
  floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ color: 0x3a2c18, opacity: 0.26 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  material = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.86, metalness: 0, sheen: 0.7, sheenRoughness: 0.75, sheenColor: new THREE.Color(0xfff8ee) });
  return renderer;
}

function loop() {
  raf = requestAnimationFrame(loop);
  const now = performance.now();
  for (const r of ropes) r.tick(now);
}

const CREAM = new THREE.Color(0xf6efe2), MADDER = new THREE.Color(0xb9471b);

export class Rope {
  spec: Spec;
  band: HTMLElement;
  out: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  N: number; M: number;
  L!: Layout;
  geo = new THREE.BufferGeometry();
  mesh: THREE.Mesh;
  p = 0; v = 0; target = 0; k = 90; c = 11;
  drag: null | { x0: number; p0: number; t: number; lastX: number; vx: number } = null;
  dirty = true; visible = false; touched = false;
  hot = -1;
  onP: (p: number) => void = () => {};
  onEnd: (x: number, y: number) => void = () => {};
  last = 0;
  w = 0; h = 0;
  io: IntersectionObserver; ro: ResizeObserver;
  pos: Float32Array;

  constructor(band: HTMLElement, out: HTMLCanvasElement, spec: Spec) {
    boot();
    this.spec = spec; this.band = band; this.out = out;
    this.ctx = out.getContext('2d')!;
    const phone = window.innerWidth < 700;
    this.N = spec.size === 'cord' ? Math.max(360, spec.knots.length * 80) : spec.size === 'small' ? 240 : phone ? 300 : 420;
    this.M = phone ? 12 : 16;
    this.pos = new Float32Array(this.N * this.M * 3);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.N * this.M * 3), 3));
    const idx: number[] = [];
    for (let i = 0; i < this.N - 1; i++) for (let j = 0; j < this.M; j++) {
      const a = i * this.M + j, b = i * this.M + ((j + 1) % this.M), c = a + this.M, d = b + this.M;
      idx.push(a, c, b, b, c, d);
    }
    this.geo.setIndex(idx);
    this.mesh = new THREE.Mesh(this.geo, material);
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(band);
    this.io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; if (this.visible) this.dirty = true; }, { rootMargin: '200px 0px' });
    this.io.observe(band);
    ropes.add(this);
    if (!raf) raf = requestAnimationFrame(loop);
    this.resize();
  }

  resize() {
    const r = this.band.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (!w || !h || (w === this.w && h === this.h)) return;
    this.w = w; this.h = h; this.out.width = w; this.out.height = h;
    this.L = layout(this.spec, r.width / r.height, this.N);
    this.paint();
    this.dirty = true;
  }

  paint() {
    if (!this.L) return;
    const col = this.geo.getAttribute('color') as THREE.BufferAttribute;
    const c = new THREE.Color();
    for (let i = 0; i < this.N; i++) {
      const u = i / (this.N - 1);
      let hot = false;
      if (this.hot >= 0 && this.L) hot = Math.abs(u - this.L.knotU[this.hot]) < 0.022;
      const dip = this.spec.size !== 'cord' && u > 0.955;
      c.copy(dip || hot ? MADDER : CREAM);
      const tw = u * this.L.len * ((Math.PI * 2) / (this.L.R * 9));
      for (let j = 0; j < this.M; j++) {
        const g = 0.8 + 0.2 * Math.sqrt(Math.abs(Math.cos(1.5 * ((j / this.M) * Math.PI * 2 - tw))));
        col.setXYZ(i * this.M + j, c.r * g, c.g * g, c.b * g);
      }
    }
    col.needsUpdate = true;
    this.dirty = true;
  }

  highlight(i: number) { this.hot = i; this.paint(); }

  /** Pull to 1 (straight) or 0 (tied) on a spring. */
  pull(to: number, soft = false) { this.touched = true; this.target = to; this.k = soft ? 16 : 90; this.c = soft ? 7.6 : 11; this.dirty = true; }

  /** A small tug toward the pointer that does not count as the visitor pulling it. */
  nudge(to: number) { this.target = to; this.k = 60; this.c = 7; this.dirty = true; }

  down(x: number) { this.touched = true; this.drag = { x0: x, p0: this.p, t: performance.now(), lastX: x, vx: 0 }; }
  move(x: number) {
    const d = this.drag; if (!d) return;
    const now = performance.now(), dt = Math.max(1, now - d.t);
    d.vx = d.vx * 0.6 + ((x - d.lastX) / dt) * 0.4; d.lastX = x; d.t = now;
    const px = (this.L.pullPx / this.L.W) * (this.w / Math.min(window.devicePixelRatio || 1, 1.6));
    this.p = clamp(d.p0 + (x - d.x0) / Math.max(px, 120), -0.08, 1.04);
    this.v = 0; this.dirty = true;
  }
  up() {
    const d = this.drag; if (!d) return;
    this.drag = null;
    const flick = d.vx > 0.9, back = d.vx < -0.9;
    this.pull(flick ? 1 : back ? 0 : this.p > 0.55 ? 1 : 0);
  }

  tick(now: number) {
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000); this.last = now;
    if (!this.drag) {
      const a = this.k * (this.target - this.p) - this.c * this.v;
      this.v += a * dt; this.p += this.v * dt;
      if (Math.abs(this.target - this.p) < 0.0005 && Math.abs(this.v) < 0.002) { if (this.p !== this.target) this.dirty = true; this.p = this.target; this.v = 0; } else this.dirty = true;
    }
    if (!this.dirty || !this.visible || !this.L) return;
    this.dirty = false;
    this.onP(clamp(this.p));
    this.build();
    this.render();
  }

  build() {
    const { K, S, R, s, W } = this.L, N = this.N, M = this.M, p = this.p, mode = this.spec.mode ?? 'end';
    const pts: number[] = new Array(N * 3);
    // Knot centre for loosening: the mean of the knotted path.
    let cx = 0, cz = 0; for (let i = 0; i < N; i++) { cx += K[i * 3]; cz += K[i * 3 + 2]; } cx /= N; cz /= N;
    const loose = 1 + 0.42 * p;
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const w = mode === 'all' ? smooth(clamp((Math.abs(u - 0.5) * 2 - (1 - 1.4 * p)) / 0.4)) : smooth(clamp((u - (1 - 1.4 * p)) / 0.4));
      let kx = cx + (K[i * 3] - cx) * loose, ky = R + (K[i * 3 + 1] - R) * (1 - 0.55 * clamp(p)), kz = cz + (K[i * 3 + 2] - cz) * loose;
      if (p < 0) { kx = cx + (K[i * 3] - cx) * (1 + p * 0.5); kz = cz + (K[i * 3 + 2] - cz) * (1 + p * 0.5); }
      pts[i * 3] = kx + (S[i * 3] - kx) * w;
      pts[i * 3 + 1] = ky + (S[i * 3 + 1] - ky) * w + Math.sin(Math.PI * w) * s * 0.9 * (1 - Math.abs(2 * clamp(p) - 1));
      pts[i * 3 + 2] = kz + (S[i * 3 + 2] - kz) * w;
    }
    // Parallel-transport frames, then a three-lobed cross-section twisting with the material.
    const T = new THREE.Vector3(), Nn = new THREE.Vector3(), B = new THREE.Vector3(), tmp = new THREE.Vector3();
    const P = (i: number) => tmp.set(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2]);
    const pos = this.pos;
    const lay = (Math.PI * 2) / (R * 9);
    const len = this.L.len;
    for (let i = 0; i < N; i++) {
      const a = Math.max(0, i - 1), b = Math.min(N - 1, i + 1);
      const ax = pts[a * 3], ay = pts[a * 3 + 1], az = pts[a * 3 + 2];
      const nt = new THREE.Vector3(pts[b * 3] - ax, pts[b * 3 + 1] - ay, pts[b * 3 + 2] - az).normalize();
      if (i === 0) { T.copy(nt); Nn.set(0, 1, 0); if (Math.abs(T.dot(Nn)) > 0.9) Nn.set(0, 0, 1); Nn.sub(tmp.copy(T).multiplyScalar(T.dot(Nn))).normalize(); }
      else { Nn.sub(tmp.copy(nt).multiplyScalar(nt.dot(Nn))).normalize(); T.copy(nt); }
      B.crossVectors(T, Nn);
      const cap = i < 4 ? Math.sqrt(1 - (1 - i / 4) ** 2) * 0.9 + 0.1 * (i / 4) : i > N - 5 ? Math.sqrt(1 - (1 - (N - 1 - i) / 4) ** 2) * 0.9 + 0.1 * ((N - 1 - i) / 4) : 1;
      const tw = (i / (N - 1)) * len * lay;
      const cxp = pts[i * 3], cyp = pts[i * 3 + 1], czp = pts[i * 3 + 2];
      for (let j = 0; j < M; j++) {
        const ph = (j / M) * Math.PI * 2;
        const r = R * cap * (0.74 + 0.26 * Math.sqrt(Math.abs(Math.cos(1.5 * (ph - tw)))));
        const c = Math.cos(ph) * r, sn = Math.sin(ph) * r;
        const o = (i * M + j) * 3;
        pos[o] = cxp + Nn.x * c + B.x * sn; pos[o + 1] = cyp + Nn.y * c + B.y * sn; pos[o + 2] = czp + Nn.z * c + B.z * sn;
      }
    }
    (this.geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    this.geo.computeVertexNormals();
    // Screen position of the loose end, for the keyboard handle.
    const e = new THREE.Vector3(pts[(N - 3) * 3], pts[(N - 3) * 3 + 1], pts[(N - 3) * 3 + 2]);
    this.place(W);
    e.project(camera);
    const cw = this.w / Math.min(window.devicePixelRatio || 1, 1.6), ch = this.h / Math.min(window.devicePixelRatio || 1, 1.6);
    this.onEnd(((e.x + 1) / 2) * cw, ((1 - e.y) / 2) * ch);
  }

  place(W: number) {
    const A = this.w / this.h;
    camera.aspect = A; camera.fov = FOV;
    const dist = W / 2 / (Math.tan(((FOV / 2) * Math.PI) / 180) * A);
    camera.position.set(0, Math.sin(TH) * dist, this.L.zc + Math.cos(TH) * dist);
    camera.lookAt(0, 0, this.L.zc);
    camera.updateProjectionMatrix();
  }

  render() {
    const r = boot();
    const { W, D, zc } = this.L;
    this.place(W);
    // One drawing buffer, grown only when a band is bigger than any before; each band uses its corner.
    const cv = r.domElement;
    if (cv.width < this.w || cv.height < this.h) r.setSize(Math.max(cv.width, this.w), Math.max(cv.height, this.h), false);
    const H = cv.height;
    r.setViewport(0, H - this.h, this.w, this.h);
    r.setScissor(0, H - this.h, this.w, this.h);
    r.setScissorTest(true);
    key.position.set(-W * 0.12, 18, zc + 7);
    key.target.position.set(0, 0, zc);
    const sc = key.shadow.camera as THREE.OrthographicCamera;
    sc.left = -W * 1.1; sc.right = W * 1.1; sc.top = D * 1.3; sc.bottom = -D * 1.3; sc.near = 0.5; sc.far = 80;
    sc.updateProjectionMatrix();
    floor.scale.set(W * 2, D * 3, 1); floor.position.set(0, 0, zc);
    scene.add(this.mesh);
    r.render(scene, camera);
    scene.remove(this.mesh);
    this.ctx.clearRect(0, 0, this.w, this.h);
    this.ctx.drawImage(r.domElement, 0, 0, this.w, this.h, 0, 0, this.w, this.h);
  }

  dispose() {
    this.io.disconnect(); this.ro.disconnect(); ropes.delete(this); this.geo.dispose();
    if (!ropes.size && raf) { cancelAnimationFrame(raf); raf = 0; }
  }
}

export function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** A flat drawing of a knot (or the same length straight) for small glyphs. */
export function glyph(kind: Kind, straight = false) {
  if (straight) return 'M2 20 L46 20';
  const { f, t0 } = FORMS[kind];
  const pts: string[] = [];
  const d = 0.42;
  for (let i = 0; i <= 40; i++) { const t = t0 + d + ((Math.PI * 2 - 2 * d) * i) / 40; const [a, b] = f(t); pts.push(`${(24 + a * 4.6).toFixed(1)} ${(14 - b * 3.6).toFixed(1)}`); }
  return `M2 30 C10 30 18 30 ${pts[0]} L${pts.join(' L')} C30 30 38 30 46 30`;
}
