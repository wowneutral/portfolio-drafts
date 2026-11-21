// Remixed from rough-notation 0.5.1 by Preet Shihn (MIT, github.com/rough-stuff/rough-notation): its renderAnnotation shapes, options and draw-on-show dash animation, now one red pen, plus margin marks (bracket, tick, arrow) drawn with roughjs (MIT).
import { line, rectangle, ellipse, linearPath, curve } from 'roughjs/bin/renderer';
import { randomSeed } from 'roughjs/bin/math';
import type { OpSet, ResolvedOptions } from 'roughjs/bin/core';

export const PEN = '#d22d1e';
export const WASH = '#f4cdc5';
export const newSeed = randomSeed;

export type Kind = 'underline' | 'double' | 'box' | 'circle' | 'highlight' | 'strike' | 'bracket' | 'tick';
export type R = { x: number; y: number; w: number; h: number };
type Pt = [number, number];

const SVG_NS = 'http://www.w3.org/2000/svg';

// rough-notation's getOptions, unchanged apart from the colour and the two fields roughjs 4.6 added.
function options(seed: number, roughness = 1.5, multi = false): ResolvedOptions {
  return {
    maxRandomnessOffset: 2, roughness, bowing: 1, stroke: PEN, strokeWidth: 1.5,
    curveTightness: 0, curveFitting: 0.95, curveStepCount: 9, fillStyle: 'hachure', fillWeight: -1,
    hachureAngle: -41, hachureGap: -1, dashOffset: -1, dashGap: -1, zigzagOffset: -1,
    combineNestedSvgPaths: false, disableMultiStroke: !multi, disableMultiStrokeFill: false,
    preserveVertices: false, fillShapeRoughnessGain: 0.8, seed,
  } as ResolvedOptions;
}

export function union(rs: R[]): R {
  const x = Math.min(...rs.map((r) => r.x));
  const y = Math.min(...rs.map((r) => r.y));
  const x2 = Math.max(...rs.map((r) => r.x + r.w));
  const y2 = Math.max(...rs.map((r) => r.y + r.h));
  return { x, y, w: x2 - x, h: y2 - y };
}

function opsToPath(set: OpSet[]): string[] {
  const paths: string[] = [];
  for (const drawing of set) {
    let path = '';
    for (const item of drawing.ops) {
      const d = item.data;
      if (item.op === 'move') { if (path.trim()) paths.push(path.trim()); path = `M${d[0]} ${d[1]} `; }
      else if (item.op === 'bcurveTo') path += `C${d[0]} ${d[1]}, ${d[2]} ${d[3]}, ${d[4]} ${d[5]} `;
      else if (item.op === 'lineTo') path += `L${d[0]} ${d[1]} `;
    }
    if (path.trim()) paths.push(path.trim());
  }
  return paths;
}

type Paint = { animate: boolean; delay: number; duration: number; width: number; color?: string };

/** rough-notation's draw-on-show: each stroke's dash runs out in turn, its share of the time set by its length. Returns when it ends. */
function paint(svg: SVGSVGElement, sets: OpSet[], p: Paint) {
  const els: SVGPathElement[] = [];
  const lengths: number[] = [];
  let total = 0;
  for (const d of opsToPath(sets)) {
    const el = document.createElementNS(SVG_NS, 'path');
    el.setAttribute('d', d);
    el.setAttribute('fill', 'none');
    el.setAttribute('stroke', p.color ?? PEN);
    el.setAttribute('stroke-width', String(p.width));
    el.setAttribute('stroke-linecap', 'round');
    el.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(el);
    els.push(el);
    if (p.animate) { const l = el.getTotalLength(); lengths.push(l); total += l; }
  }
  if (!p.animate) return p.delay;
  let at = p.delay;
  els.forEach((el, i) => {
    const dur = total ? p.duration * (lengths[i] / total) : 0;
    el.style.strokeDasharray = `${lengths[i]}`;
    el.style.strokeDashoffset = `${lengths[i]}`;
    el.style.animation = `mu-dash ${dur}ms cubic-bezier(.5,.1,.25,1) ${at}ms forwards`;
    at += dur;
  });
  return at;
}

export type DrawOpts = { seed: number; animate: boolean; delay: number; duration?: number; pad?: number; gx: number; thick?: number };

/** Draw one mark round the given line boxes (svg coordinates). gx is the x of the margin line for brackets and ticks. */
export function draw(svg: SVGSVGElement, rects: R[], kind: Kind, o: DrawOpts) {
  const pad = o.pad ?? 6;
  const dur = o.duration ?? 800;
  const w = o.thick ?? 2.2;
  const one = options(o.seed);
  const animate = o.animate;
  if (kind === 'highlight') {
    let at = o.delay;
    const share = dur / rects.reduce((s, r) => s + r.w, 0);
    for (const r of rects) {
      const y = r.y + r.h / 2;
      const set = [line(r.x - 3, y, r.x + r.w + 3, y, options(o.seed, 3)), line(r.x + r.w + 3, y + 1, r.x - 3, y + 1, options(o.seed, 3))];
      at = paint(svg, set, { animate, delay: at, duration: share * r.w, width: r.h * 0.9, color: WASH });
    }
    return at;
  }
  if (kind === 'underline' || kind === 'double' || kind === 'strike') {
    let at = o.delay;
    const share = dur / rects.reduce((s, r) => s + r.w, 0);
    for (const r of rects) {
      const y = kind === 'strike' ? r.y + r.h * 0.55 : r.y + r.h + pad;
      const set = [line(r.x, y, r.x + r.w, y, one)];
      if (kind === 'double') set.push(line(r.x + r.w - 4, y + 7, r.x + 6, y + 8, one));
      at = paint(svg, set, { animate, delay: at, duration: share * r.w, width: w });
    }
    return at;
  }
  const u = union(rects);
  if (kind === 'box') {
    const set = [rectangle(u.x - pad, u.y - pad, u.w + pad * 2, u.h + pad * 2, one), rectangle(u.x - pad, u.y - pad, u.w + pad * 2, u.h + pad * 2, one)];
    return paint(svg, set, { animate, delay: o.delay, duration: dur, width: w });
  }
  if (kind === 'circle') {
    const cw = u.w * 1.12 + pad * 2.4;
    const ch = u.h + pad * 2.4;
    const set = [ellipse(u.x + u.w / 2, u.y + u.h / 2, cw, ch, options(o.seed, 1.5, true))];
    return paint(svg, set, { animate, delay: o.delay, duration: dur, width: w });
  }
  if (kind === 'bracket') {
    const top = u.y - 4;
    const bot = u.y + u.h + 4;
    const set = [linearPath([[o.gx + 12, top], [o.gx, top + 2], [o.gx - 1, bot - 2], [o.gx + 12, bot]], false, one)];
    return paint(svg, set, { animate, delay: o.delay, duration: dur, width: w });
  }
  // tick: a coach's check mark in the margin, level with the first line
  const cy = rects[0].y + rects[0].h * 0.55;
  const x = o.gx;
  const set = [linearPath([[x - 12, cy - 2], [x - 4, cy + 8], [x + 14, cy - 16]], false, options(o.seed, 1.2))];
  return paint(svg, set, { animate, delay: o.delay, duration: dur * 0.55, width: w + 0.4 });
}

/** A long hand-drawn arrow through the given points, with its head at the last one. */
export function arrow(svg: SVGSVGElement, pts: Pt[], o: { seed: number; animate: boolean; delay: number; duration?: number }) {
  const dur = o.duration ?? 1100;
  const one = options(o.seed, 1.1);
  const at = paint(svg, [curve(pts, one)], { animate: o.animate, delay: o.delay, duration: dur, width: 2.2 });
  const [a, b] = [pts[pts.length - 2], pts[pts.length - 1]];
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const head = (t: number): Pt => [b[0] - 18 * Math.cos(ang + t), b[1] - 18 * Math.sin(ang + t)];
  const h1 = head(0.5);
  const h2 = head(-0.5);
  return paint(svg, [line(h1[0], h1[1], b[0], b[1], one), line(b[0], b[1], h2[0], h2[1], one)], { animate: o.animate, delay: at, duration: 260, width: 2.2 });
}
