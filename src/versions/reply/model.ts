// Bubble model, remixed from chenglou/pretext pages/demos/bubbles.model.ts (MIT): shrink-wrapped widths
// and DOM-free heights, extended from one-text bubbles to bubbles made of rows (text, images, fitted words).
import { clearCache, layout, prepare, walkLineRanges, type PreparedText } from './pretext/layout';

const SANS = '"Instrument Sans Variable", system-ui, sans-serif';
const SERIF = '"Newsreader Variable", Georgia, serif';

export type FontKey = 'hero' | 'body' | 'strong' | 'meta' | 'serif' | 'serifI' | 'title' | 'champSub' | 'ask' | 'quote' | 'note';
export type Face = { font: string; lh: number };
export type Fonts = Record<FontKey, Face>;

export function fontsFor(phone: boolean, big = false): Fonts {
  const f = (w: string, px: number, lh: number, fam = SANS): Face => ({ font: `${w} ${px}px ${fam}`, lh });
  if (phone)
    return {
      hero: f('600', 42, 46), body: f('400', 17, 25), strong: f('600', 17, 25), meta: f('400', 16, 22),
      serif: f('400', 18, 27, SERIF), serifI: f('italic 400', 18, 27, SERIF), title: f('500', 23, 28, SERIF),
      champSub: f('600', 20, 25), ask: f('500', 20, 26), quote: f('italic 400', big ? 27 : 18, big ? 33 : 27, SERIF), note: f('400', big ? 22 : 18, big ? 31 : 27, SERIF),
    };
  if (big)
    return {
      hero: f('600', 76, 80), body: f('400', 20, 30), strong: f('600', 20, 30), meta: f('400', 16, 23),
      serif: f('400', 22, 33, SERIF), serifI: f('italic 400', 22, 33, SERIF), title: f('500', 34, 40, SERIF),
      champSub: f('600', 34, 40), ask: f('500', 30, 36), quote: f('italic 400', 46, 54, SERIF), note: f('400', 30, 40, SERIF),
    };
  return {
    hero: f('600', 72, 76), body: f('400', 18, 27), strong: f('600', 18, 27), meta: f('400', 16, 23),
    serif: f('400', 20, 30, SERIF), serifI: f('italic 400', 20, 30, SERIF), title: f('500', 26, 32, SERIF),
    champSub: f('600', 28, 34), ask: f('500', 26, 32), quote: f('italic 400', 20, 30, SERIF), note: f('400', 20, 30, SERIF),
  };
}

export type Row =
  | { k: 't'; f: FontKey; s: string; href?: string; gap?: number }
  | { k: 'img'; src: string; ratio: number; alt: string; href?: string }
  | { k: 'fit'; s: string };
export type Side = 'you' | 'him';
export type Bubble = { side: Side; rows: Row[]; width?: 'tight' | 'max' | 'full' | number; tone?: 'quiet' | 'hero'; heading?: boolean };

export type LaidRow =
  | { k: 't'; face: Face; s: string; href?: string; h: number; mt: number }
  | { k: 'img'; src: string; alt: string; href?: string; h: number; w: number }
  | { k: 'fit'; face: Face; s: string; h: number; mt: number };
export type Laid = { side: Side; w: number; h: number; px: number; py: number; rows: LaidRow[]; tone?: Bubble['tone']; heading?: boolean };

export type Geo = { max: number; full: number; phone: boolean };

const cache = new Map<string, PreparedText>();
const prep = (s: string, font: string) => {
  const key = font + '|' + s;
  let p = cache.get(key);
  if (!p) { p = prepare(s, font); cache.set(key, p); }
  return p;
};

/** Once the real fonts are in, forget every measurement made with fallbacks. */
export function resetMeasure() { clearCache(); cache.clear(); }

// From the demo: the narrowest width that keeps the same line count as the max width.
function tightWidth(p: PreparedText, maxWidth: number, lh: number) {
  const lines = layout(p, maxWidth, lh).lineCount;
  let lo = 1, hi = Math.max(1, Math.ceil(maxWidth));
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (layout(p, mid, lh).lineCount <= lines) hi = mid; else lo = mid + 1;
  }
  let widest = 0;
  walkLineRanges(p, lo, (line) => { if (line.width > widest) widest = line.width; });
  return Math.ceil(widest);
}

const ROW_GAP = 4;

export function lay(b: Bubble, g: Geo, F: Fonts): Laid {
  const hero = b.tone === 'hero';
  const px = hero ? (g.phone ? 18 : 24) : g.phone ? 14 : 18;
  const py = hero ? (g.phone ? 10 : 14) : g.phone ? 10 : 12;
  const width = b.width ?? 'tight';
  const max = typeof width === 'number' ? width : width === 'full' ? g.full : g.max;
  let cw = max - px * 2;
  if (width === 'tight') {
    let w = 0;
    for (const r of b.rows) if (r.k === 't') w = Math.max(w, tightWidth(prep(r.s, F[r.f].font), cw, F[r.f].lh));
    cw = Math.min(cw, w + 1);
  }
  const bw = cw + px * 2;
  let h = py * 2;
  const rows: LaidRow[] = [];
  let first = true;
  for (const r of b.rows) {
    if (r.k === 'img') {
      const ih = Math.round(bw * r.ratio);
      rows.push({ k: 'img', src: r.src, alt: r.alt, href: r.href, h: ih, w: bw });
      h += ih;
      continue;
    }
    const mt = first ? 0 : r.k === 't' && r.gap != null ? r.gap : ROW_GAP;
    first = false;
    if (r.k === 'fit') {
      // A word set to fill the bubble: measured at 100px, then scaled to the content width.
      const base = prep(r.s, `700 100px ${SANS}`);
      let nat = 0;
      walkLineRanges(base, 100000, (l) => { nat = Math.max(nat, l.width); });
      const px2 = Math.max(24, Math.floor((100 * cw) / Math.max(1, nat) * 0.985));
      const face = { font: `700 ${px2}px ${SANS}`, lh: Math.round(px2 * 1.06) };
      rows.push({ k: 'fit', face, s: r.s, h: face.lh, mt });
      h += mt + face.lh;
      continue;
    }
    const face = F[r.f];
    const rh = layout(prep(r.s, face.font), cw, face.lh).lineCount * face.lh;
    rows.push({ k: 't', face, s: r.s, href: r.href, h: rh, mt });
    h += mt + rh;
  }
  return { side: b.side, w: bw, h, px, py, rows, tone: b.tone, heading: b.heading };
}

/** Gap above an item, from the item before it: tight within one speaker, open between speakers. */
export const gapBetween = (a: Side | 'stamp' | 'say' | undefined, b: Side | 'stamp' | 'say', phone: boolean) =>
  a === undefined ? 0 : a === b && (a === 'him' || a === 'you') ? (phone ? 5 : 6) : phone ? 16 : 22;
