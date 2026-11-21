// From the Skeptical head draft (lab/app/src/versions/head/DitherEffect.ts): the 1-bit Bayer pass, minus the pointer trail.
// Everything with depth is cut to two tones through an ordered 8x8 Bayer matrix in screen pixels; the background passes through.
import { Effect, EffectAttribute } from 'postprocessing';
import { Uniform } from 'three';

const FRAG = /* glsl */ `
uniform float uCell;
float bayer2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
#define bayer4(a) (bayer2(0.5 * (a)) * 0.25 + bayer2(a))
#define bayer8(a) (bayer4(0.5 * (a)) * 0.25 + bayer2(a))
void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  // Ink is #0a0a0b through the exact sRGB curve (its linear toe), so the room meets the page's black with no seam.
  vec3 ink = vec3(0.003035, 0.003035, 0.003347), paper = pow(vec3(233.0, 229.0, 220.0) / 255.0, vec3(2.2));
  if (depth > 0.99999) { outputColor = vec4(ink, 1.0); return; }
  float lum = pow(clamp(dot(inputColor.rgb, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0), 1.0 / 2.2);
  lum = smoothstep(0.05, 0.97, lum);
  float th = bayer8(floor(uv * resolution / uCell));
  float on = step(th + 0.004, lum);
  outputColor = vec4(mix(ink, paper, on), 1.0);
}`;

export class DitherEffect extends Effect {
  constructor() {
    super('DitherEffect', FRAG, {
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, Uniform>([['uCell', new Uniform(2)]]),
    });
  }
}
