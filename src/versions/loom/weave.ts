// The loom's weave engine. Deterministic: the same commits and repos always weave the same cloth.
// Warp: one stripe of ends per repository, told apart by value and thickness only (one accent).
// Weft: a few shots per commit; the commit's hash picks the structure (plain, twill or float).
// Indigo is the one dyed weft: the championships band and one stripe per daily note.
import type { Activity, Repo } from '@/lib/github';

export type Struct = 0 | 1 | 2; // plain, twill, float
export type Shot = { s: Struct; len: number; tone: number };
export type Warp = { tone: number; thick: number };
export type Mark = { y0: number; y1: number; kind: 'indigo' | 'note' | 'rule' | 'group'; shot?: number; big?: boolean };
export type Mask = { rows: number; cols: number; on: Uint8Array };

export const INDIGO = '#2e3f8f';
const WARP = ['#221d19', '#4b4138', '#6e6152', '#352e28'];
const WEFT = ['#ece4d4', '#e2d8c5', '#f2ebdd'];
const RULE = '#221d19';
const GAP = '#b3a68f';

export function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const shotOf = (bits: number): Shot => ({ s: ([0, 1, 1, 2, 2] as Struct[])[bits % 5], len: 2 + ((bits >>> 4) % 4), tone: (bits >>> 8) % 3 });

/** One shot per commit, from its sha. With no live commits, five per repository, from its name. */
export function shotsFrom(activity: Activity[], repos: Repo[]): Shot[] {
  if (activity.length) return activity.map((a) => {
    const sha = a.href.match(/commit\/([0-9a-f]{8,})/)?.[1];
    return shotOf(sha ? parseInt(sha.slice(0, 8), 16) : hash(a.repo + a.message));
  });
  return repos.flatMap((r) => [0, 1, 2, 3, 4].map((k) => shotOf(hash(r.name + ':' + k))));
}

/** The warp: each repository a stripe of 3 to 8 ends, repeating across the band. */
export function warpsFrom(repos: Repo[], ends: number): Warp[] {
  const stripes = repos.map((r, i) => { const b = hash(r.name); return { n: 3 + (b % 6), tone: i % 4, thick: [0.9, 0.74, 0.82][(b >>> 3) % 3] }; });
  const out: Warp[] = [];
  for (let k = 0; out.length < ends; k++) {
    const st = stripes[k % stripes.length];
    for (let j = 0; j < st.n && out.length < ends; j++) out.push({ tone: st.tone, thick: st.thick });
  }
  return out;
}

const warpUp = (s: Struct, e: number, p: number) => (s === 0 ? (e + p) % 2 === 0 : s === 1 ? (e + p) % 4 === 0 : (e * 3 + p) % 8 === 0);

// Lettering: rasterise the words at 4x, average down to one cell per thread crossing, threshold.
export function textMask(lines: string[], cols: number, maxCap: number, family: string, tight = false): Mask {
  const S = 4;
  const c = document.createElement('canvas').getContext('2d')!;
  const font = (px: number) => `800 ${px}px "${family}"`;
  c.font = font(100);
  (c as unknown as { letterSpacing: string }).letterSpacing = '5px';
  const capRef = c.measureText('H').actualBoundingBoxAscent || 70;
  const widest = Math.max(...lines.map((l) => c.measureText(l).width));
  const cap = tight ? Math.max(9, maxCap) : Math.max(9, Math.min(maxCap, Math.floor(((cols - 4) / widest) * capRef)));
  const px = (cap / capRef) * 100;
  if (tight) cols = Math.ceil((widest * px) / 100) + 4;
  const lead = Math.round(cap * 0.42);
  const rows = lines.length * cap + (lines.length - 1) * lead;
  const cv = document.createElement('canvas');
  cv.width = cols * S; cv.height = rows * S;
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  g.font = font(px * S);
  (g as unknown as { letterSpacing: string }).letterSpacing = `${5 * (px / 100) * S}px`;
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#000';
  lines.forEach((l, i) => {
    const w = g.measureText(l).width;
    g.fillText(l, Math.round((cv.width - w) / 2), (i * (cap + lead) + cap) * S);
  });
  const data = g.getImageData(0, 0, cv.width, cv.height).data;
  const on = new Uint8Array(rows * cols);
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    let a = 0;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) a += data[((r * S + y) * cv.width + k * S + x) * 4 + 3];
    on[r * cols + k] = a / (S * S * 255) > 0.46 ? 1 : 0;
  }
  return { rows, cols, on };
}

/** Turn a horizontal mask a quarter turn clockwise, so it reads top to bottom down a narrow band. */
export function turn(m: Mask): Mask {
  const on = new Uint8Array(m.rows * m.cols);
  // new rows = old cols, new cols = old rows
  for (let r = 0; r < m.cols; r++) for (let c = 0; c < m.rows; c++) on[r * m.rows + c] = m.on[(m.rows - 1 - c) * m.cols + r];
  return { rows: m.cols, cols: m.rows, on };
}

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (h: string, to: number, t: number) => `rgb(${rgb(h).map((v) => Math.round(v + (to - v) * t)).join(',')})`;
const triple = (h: string, hi = 0.28, lo = 0.3) => [h, mix(h, 255, hi), mix(h, 0, lo)] as const;

export type Cloth = {
  w: number; h: number; pitch: number; top: number;
  warps: Warp[]; shots: Shot[]; marks: Mark[];
  headings: { mask: Mask; r0: number; c0: number }[];
  start?: boolean; end?: number;
};

/** Paint the woven cloth: every visible thread segment a rounded strand with a highlight and a shade. */
export function paintCloth(cv: HTMLCanvasElement, o: Cloth, dpr: number) {
  const { w, h, pitch: P, top, warps, shots, marks } = o;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const ctx = cv.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const ends = warps.length;
  const ox = (w - ends * P) / 2;
  const clothH = o.end ?? h;
  const p0 = Math.floor(top / P), p1 = Math.ceil((top + clothH) / P);
  const rows = p1 - p0;

  // Expanded weft sequence: each commit's shot repeated len times.
  const seq: number[] = [];
  shots.forEach((s, i) => { for (let k = 0; k < s.len; k++) seq.push(i); });
  const L = Math.max(1, seq.length);
  const hs = o.headings.map((hd) => ({ ...hd, p: Math.floor((top + hd.r0) / P) }));

  const up = new Uint8Array(rows * ends);
  const rowCol: string[] = [];
  for (let r = 0; r < rows; r++) {
    const p = p0 + r;
    const yc = p * P - top + P / 2;
    let colour = WEFT[0]; let s: Struct = 2;
    const sh = shots[seq[((p % L) + L) % L]] ?? { s: 2, tone: 0 };
    s = sh.s; colour = WEFT[sh.tone];
    let rule = false;
    if (o.start && yc < P * 4) { colour = RULE; s = 2; rule = true; }
    for (const m of marks) {
      if (yc < m.y0 - P * 3 || yc >= m.y1) continue;
      if (m.kind === 'indigo') { colour = INDIGO; s = 1; }
      else if (m.kind === 'note') { if (yc < m.y0 + (m.big ? 7 : 3) * P) { colour = INDIGO; s = 2; } }
      else if (m.kind === 'rule') { if (yc >= m.y0 - P * 3 && yc < m.y0 - P) { colour = RULE; s = 2; rule = true; } }
      else if (m.kind === 'group') {
        const g = shots[m.shot ?? 0] ?? sh;
        if (yc < m.y0 + P) { colour = RULE; s = 2; rule = true; } else { colour = WEFT[g.tone]; s = g.s; }
      }
    }
    const hd = hs.find((x) => p >= x.p - 2 && p < x.p + x.mask.rows + 2);
    const hr = hd ? p - hd.p : -1;
    for (let e = 0; e < ends; e++) {
      let u = 0;
      if (hd) {
        const mk = hd.mask; const c = e - hd.c0;
        const lit = hr >= 0 && hr < mk.rows && c >= 0 && c < mk.cols && mk.on[hr * mk.cols + c] === 1;
        u = lit ? ((e * 2 + p) % 11 !== 0 ? 2 : 0) : (e + p * 3) % 16 === 0 ? 1 : 0;
        colour = WEFT[2];
      } else u = (rule ? (e + p) % 6 === 0 : warpUp(s, e, p)) ? 1 : 0;
      up[r * ends + e] = u;
    }
    rowCol.push(colour);
  }

  // Batch every strand by colour into a handful of paths.
  const paths = new Map<string, Path2D>();
  const path = (k: string) => { let p = paths.get(k); if (!p) { p = new Path2D(); paths.set(k, p); } return p; };
  const add = (k: string, x: number, y: number, ww: number, hh: number) => path(k).roundRect(x, y, ww, hh, Math.min(ww, hh) / 2);

  ctx.fillStyle = GAP;
  ctx.fillRect(ox, Math.max(0, p0 * P - top), ends * P, Math.min(clothH, rows * P));

  for (let r = 0; r < rows; r++) {
    const y = (p0 + r) * P - top;
    const jit = ((hash('j' + (p0 + r)) % 100) / 100 - 0.5) * P * 0.12;
    const col = rowCol[r];
    let e = 0;
    while (e < ends) {
      if (up[r * ends + e]) { e++; continue; }
      let f = e; while (f < ends && !up[r * ends + f]) f++;
      const x = ox + e * P - P * 0.06, ww = (f - e) * P + P * 0.12;
      const yy = y + P * 0.07 + jit, hh = P * 0.86;
      add(col, x, yy, ww, hh);
      if (ww > P * 1.2) add(col + 'h', x + P * 0.3, yy + hh * 0.18, ww - P * 0.6, hh * 0.24);
      add(col + 'l', x + P * 0.15, yy + hh * 0.72, ww - P * 0.3, hh * 0.2);
      e = f;
    }
  }
  for (let e = 0; e < ends; e++) {
    const wp = warps[e];
    let r = 0;
    while (r < rows) {
      const v = up[r * ends + e];
      if (!v) { r++; continue; }
      let f = r; while (f < rows && up[f * ends + e] === v) f++;
      const col = v === 2 ? WARP[0] : WARP[wp.tone];
      const tw = P * (v === 2 ? 0.94 : wp.thick); const x = ox + e * P + (P - tw) / 2;
      const y = (p0 + r) * P - top - P * 0.14, hh = (f - r) * P + P * 0.28;
      add(col, x, y, tw, hh);
      add(col + 'h', x + tw * 0.2, y + P * 0.2, tw * 0.22, hh - P * 0.4);
      add(col + 'l', x + tw * 0.72, y + P * 0.25, tw * 0.18, hh - P * 0.5);
      r = f;
    }
  }
  const all = [...new Set([...WEFT, INDIGO, RULE, ...WARP])];
  for (const c of all) {
    const [b, hi, lo] = c === INDIGO ? triple(c, 0.2, 0.35) : triple(c, c.startsWith('#e') || c.startsWith('#f') ? 0.55 : 0.22, c.startsWith('#e') || c.startsWith('#f') ? 0.16 : 0.4);
    for (const [k, fs] of [[c, b], [c + 'h', hi], [c + 'l', lo]] as const) {
      const p = paths.get(k); if (!p) continue; ctx.fillStyle = fs; ctx.fill(p);
    }
  }

  // The selvage: below the last pick the warp hangs loose, gathered into knotted bunches.
  if (o.end !== undefined) {
    const y0 = o.end; const fl = h - y0;
    ctx.lineCap = 'round';
    for (let e = 0; e < ends; e++) {
      const wp = warps[e]; const b = hash('f' + e);
      const len = fl * (0.55 + (b % 40) / 100);
      const bunch = Math.floor(e / 6); const cx = ox + (bunch * 6 + 3) * P;
      const x = ox + e * P + P / 2;
      ctx.strokeStyle = WARP[wp.tone]; ctx.lineWidth = P * wp.thick * 0.7;
      ctx.beginPath(); ctx.moveTo(x, y0 - 1);
      ctx.quadraticCurveTo(x, y0 + 10, cx + (x - cx) * 0.35, y0 + 16);
      ctx.quadraticCurveTo(cx + (x - cx) * 0.2 + ((b >> 6) % 7) - 3, y0 + len * 0.6, cx + (x - cx) * 0.5 + ((b >> 9) % 9) - 4, y0 + len);
      ctx.stroke();
    }
    for (let k = 0; k * 6 < ends; k++) {
      const cx = ox + (k * 6 + 3) * P;
      ctx.fillStyle = WARP[0]; ctx.beginPath(); ctx.ellipse(cx, y0 + 17, P * 1.3, P * 1.05, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
}

/** The bare warp below the fell line: straight threads under tension, nothing woven yet. */
export function paintWarp(cv: HTMLCanvasElement, w: number, h: number, P: number, warps: Warp[], dpr: number) {
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const ctx = cv.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const ox = (w - warps.length * P) / 2;
  warps.forEach((wp, e) => {
    const tw = P * wp.thick * 0.62; const x = ox + e * P + (P - tw) / 2;
    ctx.fillStyle = WARP[wp.tone]; ctx.fillRect(x, 0, tw, h);
    ctx.fillStyle = mix(WARP[wp.tone], 255, 0.22); ctx.fillRect(x + tw * 0.2, 0, tw * 0.25, h);
  });
}
