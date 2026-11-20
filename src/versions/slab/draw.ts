// Canvas textures for the concrete: a faint aggregate for every face, and the
// debossed word cast into a front face (drawn from the glyph outlines, lit
// from the upper left like the scene's key).
import * as THREE from 'three';
import { glyphRun } from './plan';

let seed = 11;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

export function concreteTexture(): THREE.CanvasTexture {
  const s = 512, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d')!;
  const im = g.createImageData(s, s);
  for (let i = 0; i < s * s; i++) { const v = 236 + (rnd() - 0.5) * 22; im.data.set([v, v, v, 255], i * 4); }
  g.putImageData(im, 0, 0);
  // Cloudy cement: soft broad patches.
  for (let i = 0; i < 90; i++) {
    const x = rnd() * s, y = rnd() * s, r = 30 + rnd() * 90, v = rnd() < 0.5 ? 0 : 255;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${v},${v},${v},0.05)`); gr.addColorStop(1, `rgba(${v},${v},${v},0)`);
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Fine aggregate and the odd pore.
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * s, y = rnd() * s, r = 0.5 + rnd() * 1.6, v = rnd() < 0.55 ? 150 + rnd() * 50 : 250;
    g.fillStyle = `rgb(${v},${v - 2},${v - 6})`; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 70; i++) {
    const x = rnd() * s, y = rnd() * s, r = 1 + rnd() * 2.2;
    g.fillStyle = 'rgba(90,86,80,0.55)'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/** A transparent face carrying `word` sunk into it, for a plane pw by ph metres. */
export function castTexture(word: string, pw: number, ph: number): THREE.CanvasTexture {
  const k = Math.min(420, 1400 / pw);
  const W = Math.max(64, Math.round(pw * k)), H = Math.max(32, Math.round(ph * k));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  const run = glyphRun(word, 60);
  const gh = run.bottom - run.top;
  const sc = Math.min((H * 0.56) / gh, (W * 0.84) / run.width);
  const path = new Path2D();
  const m = new DOMMatrix().translate((W - run.width * sc) / 2, (H - gh * sc) / 2 - run.top * sc).scale(sc);
  for (const p of run.parts) path.addPath(new Path2D(p.d), m.translate(p.dx, 0));
  const e = Math.max(1.5, sc * 34); // depth of the cut, in pixels
  g.save();
  g.clip(path);
  g.fillStyle = '#a9a398'; g.fillRect(0, 0, W, H);
  // Upper and left walls of the cut throw shade on its floor.
  g.save(); g.translate(e, e * 1.2);
  g.fillStyle = 'rgba(58,54,48,0.62)';
  const frame = new Path2D(); frame.rect(-e * 2, -e * 2, W + e * 4, H + e * 4); frame.addPath(path);
  g.fill(frame, 'evenodd');
  g.restore();
  // Lower and right walls catch the key.
  g.save(); g.translate(-e * 0.6, -e * 0.7);
  g.fillStyle = 'rgba(246,243,236,0.7)';
  g.fill(frame, 'evenodd');
  g.restore();
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
