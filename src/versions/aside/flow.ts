// Text engine adapted from the snag draft (lab/app/src/versions/snag/flow.ts): a glyph's ink profile read from a canvas, per-line limits, live re-break.
// Here the one question mark becomes a pair of Bodoni Moda parentheses: body text breaks round their outer curves, the aside pours between them.
import marks from './marks.json';

export type Glyph = { d: string; w: number; h: number };
export const OPEN: Glyph = marks.open;
export const CLOSE: Glyph = marks.close;
export const RATIO = OPEN.w / OPEN.h; // glyph width per unit of height

const PR = 600;
const cache = new Map<Glyph, Float32Array>();
/** Per row of the glyph, the leftmost and rightmost ink, in glyph units (centred on 0). */
function profile(G: Glyph) {
  const hit = cache.get(G);
  if (hit) return hit;
  const ps = PR / G.h;
  const w = Math.ceil(G.w * ps) + 8;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = PR;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.translate(w / 2, PR / 2);
  g.scale(ps, ps);
  g.fill(new Path2D(G.d));
  const px = g.getImageData(0, 0, w, PR).data;
  const out = new Float32Array(PR * 2).fill(NaN);
  for (let r = 0; r < PR; r++) {
    let a = -1;
    let b = -1;
    for (let x = 0; x < w; x++) {
      if (px[(r * w + x) * 4 + 3] > 90) {
        if (a < 0) a = x;
        b = x;
      }
    }
    if (a >= 0) {
      out[r * 2] = (a - w / 2) / ps;
      out[r * 2 + 1] = (b + 1 - w / 2) / ps;
    }
  }
  cache.set(G, out);
  return out;
}

/** A parenthesis standing in the block: centre x, centre y, height s (local px). */
export type Paren = { x: number; y: number; s: number };

/** The ink of glyph G between y0 and y1, grown by m. Null when the rows are clear. */
export function ink(G: Glyph, M: Paren, y0: number, y1: number, m: number): [number, number] | null {
  const k = M.s / G.h;
  const top = M.y - M.s / 2;
  if (y1 + m < top || y0 - m > top + M.s) return null;
  const P = profile(G);
  const r0 = Math.max(0, Math.floor(((y0 - m - top) / M.s) * PR));
  const r1 = Math.min(PR - 1, Math.ceil(((y1 + m - top) / M.s) * PR));
  let a = Infinity;
  let b = -Infinity;
  for (let r = r0; r <= r1; r++) {
    const l = P[r * 2];
    if (l !== l) continue;
    if (l < a) a = l;
    const rr = P[r * 2 + 1];
    if (rr > b) b = rr;
  }
  if (a === Infinity) return null;
  return [M.x + a * k - m, M.x + b * k + m];
}

export type Style = { lh: number; sp: number; min: number; gap: number; just: boolean };
export type Tok = { el: HTMLElement; w: number; x: number; y: number; px: number; py: number; on: boolean; pon: boolean };
export type Para = { toks: Tok[]; st: Style };
export type Pair = { a: Paren; b: Paren };

type Seg = { a: number; b: number; side: 0 | 1 | 2 };
const SEG: Seg[] = [];

function outer(P: Pair, x0: number, x1: number, y0: number, y1: number, m: number) {
  SEG.length = 0;
  const inset = (y1 - y0) * 0.1;
  const l = ink(OPEN, P.a, y0 + inset, y1 - inset, m);
  const r = ink(CLOSE, P.b, y0 + inset, y1 - inset, m);
  if (!l && !r) {
    SEG.push({ a: x0, b: x1, side: 0 });
    return SEG;
  }
  const lo = l ? l[0] : r![0];
  const hi = r ? r[1] : l![1];
  if (lo > x0) SEG.push({ a: x0, b: Math.min(x1, lo), side: 1 });
  if (hi < x1) SEG.push({ a: Math.max(x0, hi), b: x1, side: 2 });
  return SEG;
}

function setLine(toks: Tok[], t: number, j: number, x: number, y: number, gap: number) {
  for (let k = t; k < j; k++) {
    const tk = toks[k];
    tk.x = x;
    tk.y = y;
    tk.on = true;
    x += tk.w + gap;
  }
}

/** Pour the body paragraphs down the block, line by line, round the outside of the pair. Returns the bottom. */
export function pour(paras: Para[], x0: number, x1: number, y: number, P: Pair, m: number): number {
  let guard = 0;
  paras.forEach((pa, pi) => {
    const { toks, st } = pa;
    if (pi > 0) y += st.gap;
    let t = 0;
    while (t < toks.length) {
      if (++guard > 3000) return;
      const segs = outer(P, x0, x1, y, y + st.lh, m);
      for (let si = 0; si < segs.length && t < toks.length; si++) {
        const s = segs[si];
        const W = s.b - s.a;
        let j = t;
        let w = 0;
        while (j < toks.length) {
          const add = (j > t ? st.sp : 0) + toks[j].w;
          if (w + add > W) break;
          w += add;
          j++;
        }
        let n = j - t;
        if (n < Math.min(st.min, toks.length - t)) {
          if (s.side === 0 && n === 0) {
            j = t + 1;
            n = 1;
            w = toks[t].w;
          } else continue;
        }
        const last = j === toks.length;
        const extra = W - w;
        let gap = st.sp;
        // justify, but let lines beside a curve or with too much air stay ragged
        if (st.just && !last && n > 1 && extra / (n - 1) < st.sp * 1.65) gap = st.sp + extra / (n - 1);
        setLine(toks, t, j, s.a, y, gap);
        t = j;
      }
      y += st.lh;
    }
  });
  return y;
}

/** Pour the aside between the inner curves, each line centred, the whole set centred in the pair. Words that do not fit are put away. */
export function pourAside(toks: Tok[], st: Style, P: Pair, m: number): boolean {
  const top = P.a.y - P.a.s / 2;
  const bot = P.a.y + P.a.s / 2;
  const run = (y0: number) => {
    let t = 0;
    let y = y0;
    let lastY = y0 - st.lh;
    while (t < toks.length && y + st.lh <= bot) {
      const l = ink(OPEN, P.a, y, y + st.lh, m);
      const r = ink(CLOSE, P.b, y, y + st.lh, m);
      const a = l ? l[1] : P.a.x;
      const b = r ? r[0] : P.b.x;
      const W = b - a;
      let j = t;
      let w = 0;
      while (j < toks.length) {
        const add = (j > t ? st.sp : 0) + toks[j].w;
        if (w + add > W) break;
        w += add;
        j++;
      }
      if (j > t) {
        setLine(toks, t, j, a + (W - w) / 2, y, st.sp);
        t = j;
        lastY = y;
      }
      y += st.lh;
    }
    for (let k = t; k < toks.length; k++) toks[k].on = false;
    return { fit: t === toks.length, used: lastY + st.lh - y0 };
  };
  const pad = P.a.s * 0.06;
  const first = run(top + pad);
  if (!first.fit) return false;
  const free = bot - pad - (top + pad) - first.used;
  if (free > 1) {
    const second = run(top + pad + free / 2);
    if (!second.fit) run(top + pad);
  }
  return true;
}
