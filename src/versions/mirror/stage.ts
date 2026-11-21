// Shared state between the page and the scenes, plus the picture strips that run inside the letters.
import { WORK } from '@/content';

const BASE = import.meta.env.BASE_URL;

/** Mutable, read inside useFrame. The page writes; the scenes read. */
export const stage = {
  work: 0, // the project the Work section is on
  end: false, // the closing scene is in view
  paused: false, // the pointer is on the letters
};

const load = (src: string) => new Promise<HTMLImageElement>((ok) => {
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => ok(img);
  img.onerror = () => ok(img);
  img.src = src;
});

/** Draw an image to cover a box, anchored near its top (where a site's first screen is). */
function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, top = 0.08) {
  if (!img.naturalWidth) { ctx.fillStyle = '#1b1a18'; ctx.fillRect(x, y, w, h); return; }
  // Many of his sites are dark: lift those so the letters still read as letters.
  const l = luma(img);
  // Very bright pages go a touch down, so the letters read as a picture and not as blank white.
  ctx.filter = l < 0.3 ? `brightness(${(1 + (0.3 - l) * 3.2).toFixed(2)}) contrast(1.08)` : l > 0.75 ? 'brightness(0.84) contrast(1.12)' : 'none';
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / s, sh = h / s;
  const sx = (img.naturalWidth - sw) / 2;
  const sy = Math.min(img.naturalHeight - sh, Math.max(0, (img.naturalHeight - sh) * top));
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.filter = 'none';
}

/** Mean brightness of an image, 0 to 1. */
function luma(img: HTMLImageElement) {
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, 16, 16);
  const d = ctx.getImageData(0, 0, 16, 16).data;
  let s = 0;
  for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  return s / (d.length / 4) / 255;
}

/** A slight darkening so the letterforms hold over bright pages. */
function shade(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, a: number) {
  ctx.fillStyle = `rgba(6,6,8,${a})`;
  ctx.fillRect(x, y, w, h);
}

export const CELL = { w: 512, h: 288 };
export const REEL = { w: 1200, h: 220 };

let strip: Promise<HTMLCanvasElement> | null = null;
/** The eight screenshots side by side, one long strip (4096 by 288). */
export function getStrip() {
  strip ??= Promise.all(WORK.map((w) => load(BASE + w.img))).then((imgs) => {
    const c = document.createElement('canvas');
    c.width = CELL.w * imgs.length; c.height = CELL.h;
    const ctx = c.getContext('2d')!;
    imgs.forEach((img, i) => {
      cover(ctx, img, i * CELL.w, 0, CELL.w, CELL.h);
      shade(ctx, i * CELL.w, 0, CELL.w, CELL.h, 0.1);
      // A dark seam between pages, so each reads as its own picture.
      ctx.fillStyle = '#060608'; ctx.fillRect(i * CELL.w, 0, 6, CELL.h);
    });
    return c;
  });
  return strip;
}

let reel: Promise<HTMLCanvasElement> | null = null;
/** The eight projects stacked top to bottom, each cell wide enough to fill the whole name. */
export function getReel() {
  reel ??= Promise.all(WORK.map((w) => load(BASE + w.img))).then((imgs) => {
    const c = document.createElement('canvas');
    c.width = REEL.w; c.height = REEL.h * imgs.length;
    const ctx = c.getContext('2d')!;
    // Each project twice across the name: its top on the left, further down the page on the right.
    const half = REEL.w / 2;
    imgs.forEach((img, i) => {
      const y = i * REEL.h;
      cover(ctx, img, 0, y, half, REEL.h, 0.05);
      cover(ctx, img, half, y, half, REEL.h, 0.85);
      shade(ctx, 0, y, REEL.w, REEL.h, 0.06);
      ctx.fillStyle = '#060608'; ctx.fillRect(half - 3, y, 6, REEL.h);
    });
    return c;
  });
  return reel;
}

let og: Promise<HTMLCanvasElement> | null = null;
/** The live site's own picture, for the closing scene. */
export function getOg() {
  og ??= load(BASE + 'og.jpg').then((img) => {
    const c = document.createElement('canvas');
    c.width = REEL.w; c.height = Math.round(REEL.w / 4.2);
    const ctx = c.getContext('2d')!;
    cover(ctx, img, 0, 0, c.width, c.height, 0.4);
    shade(ctx, 0, 0, c.width, c.height, 0.06);
    return c;
  });
  return og;
}
