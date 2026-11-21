// Draft 39: what the laptop's display shows. One shared mutable store (read in
// useFrame, never React state per frame) and a 2D canvas painter for each state.
import { WORK } from '@/content';

export type Mode = 'og' | 'work' | 'dark' | 'paper' | 'commits' | 'date' | 'shelves';

export const S = {
  mode: 'og' as Mode,
  work: 0,
  p: 0, // how far the current screenshot has scrolled inside the display, 0 to 1
  shut: false, // the section asks for the lid closed
  flip: false, // the visitor clicked: invert whatever the section asks for
  slow: false, // the ending: close slowly
  over: false,
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
export function preload() { img('og.jpg'); WORK.forEach((w) => img(w.img)); }

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

export function paint(c: CanvasRenderingContext2D, mode: Mode, work: number, p: number) {
  c.textBaseline = 'alphabetic';
  if (mode === 'og') return shot(c, 'og.jpg', 0, 1, 0.5);
  if (mode === 'work') return shot(c, WORK[work]?.img ?? 'og.jpg', p, 1.16, 0.1);
  if (mode === 'dark') { c.fillStyle = '#040404'; c.fillRect(0, 0, W, H); return; }
  if (mode === 'paper') {
    c.fillStyle = PAPER; c.fillRect(0, 0, W, H);
    c.fillStyle = OX;
    const size = fit(c, S.paper[0], 800, 150, W - 160);
    c.fillText(S.paper[0], 80, 330);
    c.fillStyle = INK;
    fit(c, S.paper[1], 500, 46, W - 160);
    c.fillText(S.paper[1], 84, 330 + size * 0.2 + 70);
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
