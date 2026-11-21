// After XFadeMaterial in pmndrs/examples dbismut-furniture (MIT). The base mixes the two targets evenly;
// here the incoming thing eats through the old one in soft-edged noise, and the warm grey shows through
// wherever neither target drew anything, so the canvas edge disappears into the page.
import * as THREE from 'three';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { easing } from 'maath';
import { still } from '@/lib/utils';

const vert = /* glsl */ `varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const frag = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D t0;
  uniform sampler2D t1;
  uniform float mixv;
  uniform vec3 bg;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  void main() {
    vec4 a = texture2D(t0, vUv);
    vec4 b = texture2D(t1, vUv);
    float n = noise(vUv * 7.0) * 0.62 + noise(vUv * 23.0) * 0.38;
    float m = mixv * 1.24 - 0.12;
    float k = smoothstep(n - 0.05, n + 0.05, m);
    vec4 t = mix(a, b, k);
    vec3 obj = t.rgb;
    #ifdef TONE_MAPPING
      obj = toneMapping(obj);
    #endif
    vec3 c = bg * (1.0 - t.a) + obj;
    gl_FragColor = linearToOutputTexel(vec4(c, 1.0));
  }`;

export function XFade({ t0, t1, shown, bg }: { t0: THREE.Texture; t1: THREE.Texture; shown: number; bg: string }) {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { t0: { value: t0 }, t1: { value: t1 }, mixv: { value: shown }, bg: { value: new THREE.Color(bg) } },
    vertexShader: vert, fragmentShader: frag, depthTest: false, depthWrite: false,
  }), [t0, t1, bg]); // eslint-disable-line react-hooks/exhaustive-deps
  const v = useRef({ m: shown });
  useFrame((_, dt) => {
    if (still) v.current.m = shown; else easing.damp(v.current, 'm', shown, 0.32, dt);
    mat.uniforms.mixv.value = v.current.m;
  });
  return <primitive object={mat} attach="material" />;
}
