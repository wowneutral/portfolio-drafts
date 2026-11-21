// Draft 39: what the laptop's display shows. One shared mutable store (read in
// useFrame, never React state per frame) and a 2D canvas painter for each state.
import { WORK, HONORS, AWARDS, RESEARCH } from '@/content';

export type Mode = 'og' | 'work' | 'dark' | 'paper' | 'commits' | 'date' | 'shelves' | 'honor' | 'certs';

export const S = {
  mode: 'og' as Mode,
  work: 0,
  p: 0, // how far the current screenshot has scrolled inside the display, 0 to 1
  shut: false, // the section asks for the lid closed
  flip: false, // the visitor clicked: invert whatever the section asks for
  slow: false, // the ending: close slowly
  over: false,
  i: 0, // which honour the record is on
  close: 0, // the ending: how far the scroll has shut the lid, 0 to 1
  data: 0, // bumps when images or live text arrive
  lines: [] as { big: string; small: string }[], // commits or repo names for the GitHub screen
  day: '',
  month: '',
  paper: ['', ''] as [string, string],
  shelves: [] as string[],
};

const BASE = import.meta.env.BASE_URL;
const imgs = new Map<string, HTMLImageElement>();
function img(src: string) {
  let el = imgs.get(src);
  if (!el) {
    el = new Image();
    el.decoding = 'async';
    el.onload = () => { S.data++; };
    el.src = BASE + src;
    imgs.set(src, el);
  }
  return el;
}
export function preload() { img('og.jpg'); WORK.forEach((w) => img(w.img)); AWARDS.forEach((a) => img(a.img)); }

export const W = 1280, H = 800;
const FONT = "'Bricolage Grotesque Variable', 'Helvetica Neue', Arial, sans-serif";
const PAPER = '#f4efe6', OX = '#7a2b2b', INK = '#0c0b0b';

/** A screenshot set into the display at a zoom, its page scrolled by p. */
function shot(c: CanvasRenderingContext2D, src: string, p: number, zoom: number, ax = 0.35) {
  const el = img(src);
  c.fillStyle = INK; c.fillRect(0, 0, W, H);
  if (!el.complete || !el.naturalWidth) return;
  const s = Math.max(W / el.naturalWidth, H / el.naturalHeight) * zoom;
  const w = el.naturalWidth * s, h = el.naturalHeight * s;
  const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  c.drawImage(el, -(w - W) * ax, -(h - H) * e, w, h);
}

function fit(c: CanvasRenderingContext2D, text: string, weight: number, max: number, width: number) {
  let size = max;
  c.font = `${weight} ${size}px ${FONT}`;
  while (size > 18 && c.measureText(text).width > width) { size -= 4; c.font = `${weight} ${size}px ${FONT}`; }
  return size;
}

/** Wrap text into lines no wider than width at the current font. */
function wrap(c: CanvasRenderingContext2D, text: string, width: number) {
  const out: string[] = []; let line = '';
  for (const w of text.split(' ')) {
    const t = line ? line + ' ' + w : w;
    if (line && c.measureText(t).width > width) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line);
  return out;
}

/** The paper, typeset as one tall page that scrolls inside the display. Built once fonts are in. */
let page: { el: HTMLCanvasElement; at: number } | null = null;
function paperPage() {
  if (page && page.at === S.data) return page.el;
  const r = RESEARCH[0];
  const el = page?.el ?? document.createElement('canvas');
  el.width = W; el.height = 3000;
  const c = el.getContext('2d')!;
  c.textBaseline = 'alphabetic';
  c.fillStyle = PAPER; c.fillRect(0, 0, W, el.height);
  const L = 120, R = W - 240;
  let y = 150;
  const put = (text: string, font: string, color: string, lh: number, width = R) => {
    c.font = font; c.fillStyle = color;
    for (const l of wrap(c, text, width)) { y += lh; c.fillText(l, L, y); }
  };
  const rule = (gap: number) => { y += gap; c.fillStyle = OX; c.fillRect(L, y, R, 4); y += gap * 0.4; };
  put(`${r.status}, ${r.pages} pages`, `600 34px ${FONT}`, OX, 40);
  y += 40;
  put(r.short, `800 150px ${FONT}`, OX, 138);
  y += 30;
  put(S.paper[1], `560 48px ${FONT}`, INK, 60);
  rule(70);
  put(r.epigraph!.text, `600 56px ${FONT}`, INK, 70, R - 60);
  put(r.epigraph!.source, `500 32px ${FONT}`, OX, 60);
  rule(70);
  for (const l of r.ladders!) {
    y += 40;
    put(l.who, `800 96px ${FONT}`, OX, 100);
    put(`${l.when}. ${l.where}`, `500 34px ${FONT}`, INK, 46);
  }
  rule(70);
  put(r.abstract, `500 40px ${FONT}`, INK, 56);
  y += 30;
  put(r.keywords!.join(' / '), `650 32px ${FONT}`, OX, 46);
  put(`DOI ${r.doi}`, `650 32px ${FONT}`, OX, 46);
  y += 180;
  // Trim the page to what was set, so the scroll ends on the last line.
  const h = Math.max(H, Math.ceil(y));
  const out = document.createElement('canvas'); out.width = W; out.height = h;
  out.getContext('2d')!.drawImage(el, 0, 0);
  page = { el: out, at: S.data };
  return out;
}

export function paint(c: CanvasRenderingContext2D, mode: Mode, work: number, p: number) {
  c.textBaseline = 'alphabetic';
  if (mode === 'og') return shot(c, 'og.jpg', 0, 1, 0.5);
  if (mode === 'work') return shot(c, WORK[work]?.img ?? 'og.jpg', p, 1.16, 0.1);
  if (mode === 'dark') { c.fillStyle = '#040404'; c.fillRect(0, 0, W, H); return; }
  if (mode === 'paper') {
    const el = paperPage();
    const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    c.drawImage(el, 0, -(el.height - H) * e);
    return;
  }
  if (mode === 'honor') {
    const h = HONORS[S.i] ?? HONORS[0];
    c.fillStyle = OX; c.fillRect(0, 0, W, H);
    c.fillStyle = PAPER;
    c.font = `700 40px ${FONT}`;
    c.fillText(`${String(S.i + 1).padStart(2, '0')} / ${HONORS.length}`, 90, 120);
    const big = S.i < 2 ? 150 : 118;
    c.font = `800 ${big}px ${FONT}`;
    let lines = wrap(c, h.what, W - 180);
    let size = big;
    while (lines.length > 4 && size > 60) { size -= 10; c.font = `800 ${size}px ${FONT}`; lines = wrap(c, h.what, W - 180); }
    const lh = size * 0.94;
    let y = H - 150 - (lines.length - 1) * lh;
    for (const l of lines) { c.fillText(l, 84, y); y += lh; }
    c.font = `560 44px ${FONT}`;
    c.fillText(h.detail, 90, H - 80);
    return;
  }
  if (mode === 'certs') {
    c.fillStyle = PAPER; c.fillRect(0, 0, W, H);
    const gap = 60, ch = H - 120, cw = ch * (720 / 1018);
    const x0 = (W - (cw * 2 + gap)) / 2;
    AWARDS.forEach((a, i) => {
      const el = img(a.img);
      if (!el.complete || !el.naturalWidth) return;
      c.fillStyle = 'rgba(60, 15, 15, 0.18)';
      c.fillRect(x0 + i * (cw + gap) + 10, 74, cw, ch);
      c.drawImage(el, x0 + i * (cw + gap), 60, cw, ch);
    });
    return;
  }
  if (mode === 'commits') {
    c.fillStyle = INK; c.fillRect(0, 0, W, H);
    const rows = S.lines.slice(0, 5);
    const step = (H - 140) / Math.max(rows.length, 1);
    rows.forEach((r, i) => {
      const y = 110 + i * step;
      c.fillStyle = PAPER;
      fit(c, r.big, 750, rows.length > 4 ? 64 : 96, W - 160);
      c.fillText(r.big, 80, y + step * 0.42);
      c.fillStyle = '#b9aea4';
      c.font = `500 30px ${FONT}`;
      c.fillText(r.small, 82, y + step * 0.42 + 44);
    });
    return;
  }
  if (mode === 'date') {
    c.fillStyle = OX; c.fillRect(0, 0, W, H);
    c.fillStyle = PAPER;
    c.font = `800 560px ${FONT}`;
    const m = c.measureText(S.day);
    c.fillText(S.day, (W - m.width) / 2, 560);
    fit(c, S.month, 650, 72, W - 200);
    const mm = c.measureText(S.month);
    c.fillText(S.month, (W - mm.width) / 2, 700);
    return;
  }
  if (mode === 'shelves') {
    c.fillStyle = PAPER; c.fillRect(0, 0, W, H);
    c.fillStyle = OX;
    S.shelves.forEach((s, i) => {
      fit(c, s, 800, 120, W - 160);
      c.fillText(s, 80, 250 + i * 200);
    });
  }
}
