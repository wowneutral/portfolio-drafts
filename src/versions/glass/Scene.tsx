// The glass itself. The page under it is drawn again, only where the glass is, into an
// offscreen picture (the same fonts at the same boxes, the same screenshots); the glass
// shader looks through that picture with magnification, bent edges and a slight colour split.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import MARKS from '@/lib/marks.json';
import { G } from './engine';
import b400 from '@fontsource/bodoni-moda/files/bodoni-moda-latin-400-normal.woff?url';
import b400i from '@fontsource/bodoni-moda/files/bodoni-moda-latin-400-italic.woff?url';
import b700 from '@fontsource/bodoni-moda/files/bodoni-moda-latin-700-normal.woff?url';
import b900 from '@fontsource/bodoni-moda/files/bodoni-moda-latin-900-normal.woff?url';
import b900i from '@fontsource/bodoni-moda/files/bodoni-moda-latin-900-italic.woff?url';
import s400 from '@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-400-normal.woff?url';
import s500 from '@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-500-normal.woff?url';
import s700 from '@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-700-normal.woff?url';

const PAPER = new THREE.Color('#e8e9e6');
const FONTS = { b: { n: [[400, b400], [700, b700], [900, b900]], i: [[400, b400i], [900, b900i]] }, s: { n: [[400, s400], [500, s500], [700, s700]], i: [[400, s400]] } } as const;
function fontFor(cs: CSSStyleDeclaration) {
  const fam = cs.fontFamily.includes('Bodoni') ? FONTS.b : FONTS.s;
  const list = cs.fontStyle === 'italic' ? fam.i : fam.n, w = parseInt(cs.fontWeight) || 400;
  let best: readonly [number, string] = list[0];
  for (const f of list) if (Math.abs(f[0] - w) < Math.abs(best[0] - w)) best = f;
  return best[1];
}

type Item = { id: number; el: HTMLElement; img?: string; text?: string; font?: string; size?: number; lh?: number; ls?: number; color?: string; wrap?: boolean; padX?: number };

/** Every block of text and every picture on the page, as it would be drawn under the glass. */
function collect(root: HTMLElement): Item[] {
  const out: Item[] = [], taken = new Set<HTMLElement>();
  let id = 0;
  const under = (el: HTMLElement) => { for (let p = el.parentElement; p && p !== root; p = p.parentElement) if (taken.has(p)) return true; return false; };
  root.querySelectorAll<HTMLElement>('img').forEach((im) => { const src = (im as HTMLImageElement).currentSrc || (im as HTMLImageElement).src; if (src) out.push({ id: id++, el: im, img: src }); });
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    if (!n.textContent?.trim()) continue;
    let el = n.parentElement!;
    if (el.closest('.sr-only-x,[data-nogl],button.handle')) continue;
    while (el !== root && getComputedStyle(el).display === 'inline' && el.parentElement) el = el.parentElement;
    if (taken.has(el) || under(el)) continue;
    taken.add(el);
    const cs = getComputedStyle(el), size = parseFloat(cs.fontSize);
    let text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (cs.textTransform === 'uppercase') text = text.toUpperCase();
    const lh = cs.lineHeight === 'normal' ? 1.2 : parseFloat(cs.lineHeight) / size;
    out.push({ id: id++, el, text, font: fontFor(cs), size, lh, ls: (parseFloat(cs.letterSpacing) || 0) / size, color: cs.color, wrap: cs.whiteSpace !== 'nowrap', padX: (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0) });
  }
  return out;
}

const texCache = new Map<string, THREE.Texture>();
function tex(src: string) {
  let t = texCache.get(src);
  if (!t) { t = new THREE.TextureLoader().load(src); t.colorSpace = THREE.SRGBColorSpace; texCache.set(src, t); }
  return t;
}

/** The hidden picture of the page: only what is near the glass is drawn. */
function Backdrop({ root, objs }: { root: HTMLElement; objs: React.MutableRefObject<Map<number, THREE.Object3D>> }) {
  const [all, setAll] = useState<Item[]>([]);
  const [near, setNear] = useState<number[]>([]);
  useEffect(() => {
    let t = 0;
    const read = () => { clearTimeout(t); t = window.setTimeout(() => setAll(collect(root)), 250); };
    read(); document.fonts.ready.then(read);
    const mo = new MutationObserver(read); mo.observe(root, { childList: true, subtree: true, characterData: true });
    window.addEventListener('resize', read);
    return () => { mo.disconnect(); window.removeEventListener('resize', read); clearTimeout(t); };
  }, [root]);
  const last = useRef(0), key = useRef('');
  useFrame((state) => {
    const now = state.clock.elapsedTime;
    if (now - last.current < 0.2) return;
    last.current = now;
    const vh = window.innerHeight, ids: number[] = [];
    for (const it of all) { const r = it.el.getBoundingClientRect(); if (r.bottom > -vh * 0.4 && r.top < vh * 1.4) ids.push(it.id); }
    const k = ids.join(',');
    if (k !== key.current) { key.current = k; setNear(ids); }
  });
  const show = new Set(near);
  return (
    <>
      {all.filter((it) => show.has(it.id)).map((it) => it.img ? (
        <mesh key={`i${it.id}`} ref={(o) => { if (o) objs.current.set(it.id, o); else objs.current.delete(it.id); }} userData={{ el: it.el, img: true }}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={tex(it.img)} toneMapped={false} />
        </mesh>
      ) : (
        <Text key={`t${it.id}-${it.text}-${it.size}`} ref={(o: THREE.Object3D | null) => { if (o) { o.userData = { el: it.el }; objs.current.set(it.id, o); } else objs.current.delete(it.id); }}
          font={it.font} fontSize={it.size} lineHeight={it.lh} letterSpacing={it.ls} color={it.color} anchorX="left" anchorY="top"
          maxWidth={it.wrap ? Math.max(10, it.el.clientWidth - (it.padX ?? 0) + 1.5) : undefined} whiteSpace={it.wrap ? 'normal' : 'nowrap'} sdfGlyphSize={it.size! > 60 ? 128 : 64} material-toneMapped={false}>
          {it.text}
        </Text>
      ))}
    </>
  );
}

/** The mark's soft shadow on the paper, with a little light gathered inside it where the glass focuses the sun. */
function makeShadow() {
  const pad = 0.45, w = 982 * (1 + pad * 2), h = 1540 * (1 + pad * 0.9);
  const c = document.createElement('canvas'); c.width = 384; c.height = Math.round(384 * h / w);
  const g = c.getContext('2d')!, s = c.width / w, p = new Path2D(MARKS.roman.d);
  g.setTransform(s, 0, 0, s, c.width / 2, c.height / 2);
  g.filter = 'blur(9px)'; g.fillStyle = 'rgba(15,17,18,0.34)'; g.fill(p);
  g.globalCompositeOperation = 'source-atop';
  g.setTransform(s * 0.82, 0, 0, s * 0.82, c.width / 2 - 14, c.height / 2 - 10);
  g.filter = 'blur(7px)'; g.fillStyle = 'rgba(248,250,246,0.4)'; g.fill(p);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return { t, w, h };
}

const vert = /* glsl */ `
varying vec3 vN;
void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const frag = /* glsl */ `
uniform sampler2D uBack; uniform vec2 uRes; uniform vec2 uC; uniform float uMag;
varying vec3 vN;
vec3 studio(vec3 r){
  vec3 c = vec3(0.7);
  c = mix(c, vec3(0.035, 0.04, 0.045), smoothstep(0.0, -0.6, r.y) * 0.9);
  c = mix(c, vec3(1.08), smoothstep(0.4, 0.88, r.y) * smoothstep(0.9, 0.2, abs(r.x)));
  c = mix(c, vec3(0.95), smoothstep(0.6, 0.92, -r.x) * 0.8);
  return c;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  vec3 v = vec3(0.0, 0.0, 1.0);
  float f = clamp(n.z, 0.0, 1.0), edge = 1.0 - f;
  vec2 base = uC + (uv - uC) / uMag;
  vec2 off = -n.xy * (0.01 + 0.075 * edge) * vec2(uRes.y / uRes.x, 1.0);
  vec3 refr = vec3(texture2D(uBack, base + off * 0.84).r, texture2D(uBack, base + off).g, texture2D(uBack, base + off * 1.2).b);
  refr *= mix(vec3(0.985, 0.995, 0.99), vec3(0.6, 0.79, 0.77), smoothstep(0.1, 1.0, edge));
  refr *= mix(1.0, 0.42, smoothstep(0.5, 1.0, edge));
  float F = 0.04 + 0.96 * pow(edge, 5.0);
  vec3 col = mix(refr, studio(reflect(-v, n)), clamp(F, 0.0, 0.7));
  col *= mix(1.0, 0.3, smoothstep(0.86, 1.0, edge));
  vec3 H = normalize(normalize(vec3(-0.45, 0.65, 0.62)) + v);
  float nh = max(dot(n, H), 0.0);
  col += pow(nh, 160.0) * 1.1 + pow(nh, 22.0) * 0.05;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

function Glass({ root }: { root: HTMLElement }) {
  const { gl, size, camera } = useThree();
  const backScene = useMemo(() => { const s = new THREE.Scene(); s.background = PAPER; return s; }, []);
  const target = useMemo(() => new THREE.WebGLRenderTarget(4, 4, { samples: 0 }), []);
  const objs = useRef(new Map<number, THREE.Object3D>());
  const rig = useRef<THREE.Group>(null), sh = useRef<THREE.Mesh>(null);
  const shadow = useMemo(makeShadow, []);
  const { geo, cx, cy, gh } = useMemo(() => {
    const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${MARKS.roman.d}"/></svg>`);
    const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
    const g = new THREE.ExtrudeGeometry(shapes, { depth: 230, bevelEnabled: true, bevelThickness: 46, bevelSize: 24, bevelSegments: 8, curveSegments: 26 });
    g.computeBoundingBox();
    const b = g.boundingBox!;
    g.translate(0, 0, -(b.max.z + b.min.z) / 2);
    return { geo: g, cx: (b.max.x + b.min.x) / 2, cy: (b.max.y + b.min.y) / 2, gh: 1540 };
  }, []);
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: { uBack: { value: target.texture }, uRes: { value: new THREE.Vector2(1, 1) }, uC: { value: new THREE.Vector2(0.5, 0.5) }, uMag: { value: 1.32 } } }), [target]);
  const shMat = useMemo(() => new THREE.MeshBasicMaterial({ map: shadow.t, transparent: true, depthWrite: false, toneMapped: false }), [shadow]);
  useEffect(() => () => { target.dispose(); mat.dispose(); geo.dispose(); }, [target, mat, geo]);

  useFrame((state) => {
    const dpr = gl.getPixelRatio() * (G.phone ? 0.75 : 1);
    const w = Math.round(size.width * dpr), h = Math.round(size.height * dpr);
    if (target.width !== w || target.height !== h) target.setSize(w, h);
    const W = size.width, Hh = size.height, s = (G.H * G.scale * (1 + G.lift * 0.05)) / gh;
    const px = G.x - W / 2, py = Hh / 2 - G.y;
    if (rig.current) {
      rig.current.position.set(px, py, 200);
      rig.current.scale.setScalar(s);
      rig.current.rotation.set(-0.16 - G.kick * 0.12 + G.lift * 0.08, 0.3 + G.tilt * 0.9, -G.tilt * 0.35);
    }
    const lift = G.lift, off = G.H * (0.05 + 0.1 * lift);
    for (const m of [sh.current]) {
      if (!m) continue;
      m.position.set(px + off * 0.7, py - off, -100);
      m.scale.set(shadow.w * s * (1 + lift * 0.1), shadow.h * s * (1 + lift * 0.1), 1);
      m.rotation.z = -G.tilt * 0.35;
    }
    shMat.opacity = 1 - lift * 0.45;
    // Place the hidden page: only the boxes the glass could see are drawn.
    const k = G.scale * 1.1, bx0 = G.x - G.W * k, bx1 = G.x + G.W * k, by0 = G.y - G.H * k, by1 = G.y + G.H * k;
    objs.current.forEach((o) => {
      const el = o.userData.el as HTMLElement;
      if (!el?.isConnected) { o.visible = false; return; }
      const r = el.getBoundingClientRect();
      o.visible = r.right > bx0 && r.left < bx1 && r.bottom > by0 && r.top < by1;
      if (!o.visible) return;
      if (o.userData.img) { o.position.set(r.left + r.width / 2 - W / 2, Hh / 2 - r.top - r.height / 2, 0); o.scale.set(r.width, r.height, 1); }
      else {
        const cs = getComputedStyle(el);
        o.position.set(r.left + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth) - W / 2, Hh / 2 - r.top - parseFloat(cs.paddingTop) - parseFloat(cs.borderTopWidth), 0);
      }
    });
    mat.uniforms.uRes.value.set(w / (G.phone ? 0.75 : 1), h / (G.phone ? 0.75 : 1));
    mat.uniforms.uC.value.set(G.x / W, 1 - G.y / Hh);
    if (rig.current) rig.current.visible = G.ready;
    if (sh.current) sh.current.visible = G.ready;
    gl.setRenderTarget(target); gl.render(backScene, camera);
    gl.setRenderTarget(null);
    gl.setClearColor(0x000000, 0); gl.clear();
    gl.render(state.scene, camera);
  }, 1);

  return (
    <>
      {createPortal(<Backdrop root={root} objs={objs} />, backScene)}
      <mesh ref={sh} material={shMat}><planeGeometry args={[1, 1]} /></mesh>
      <group ref={rig} visible={false}>
        <group scale={[1, -1, 1]}>
          <mesh geometry={geo} material={mat} position={[-cx, -cy, 0]} />
        </group>
      </group>
    </>
  );
}

export default function GlassScene({ root }: { root: HTMLElement }) {
  return (
    <Canvas orthographic dpr={[1, 1.6]} camera={{ position: [0, 0, 1000], zoom: 1, near: 1, far: 4000 }} gl={{ antialias: true, alpha: true, premultipliedAlpha: true }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)} style={{ pointerEvents: 'none' }}>
      <Glass root={root} />
    </Canvas>
  );
}
