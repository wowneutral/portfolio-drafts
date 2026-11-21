// Adapted from chenglou/pretext pages/demos/ellipsis.model.ts (MIT): a paragraph clamped to N lines with the
// ellipsis at a word boundary, and the open paragraph with its closing link after the last line, every height
// known before anything is painted. Here the font, line height and links are per block instead of fixed.
import {
  clearCache,
  layout,
  layoutNextLine,
  layoutNextLineRange,
  layoutWithLines,
  measureNaturalWidth,
  prepare,
  prepareWithSegments,
  type LayoutCursor,
  type PreparedTextWithSegments,
} from './pretext/layout';

export const ELLIPSIS = '…';
export const LESS_LABEL = 'keep it short';
export const SANS = '"Schibsted Grotesk Variable"';
export const SERIF = '"Newsreader Variable"';

export type FaceName = 'display' | 'lede' | 'body' | 'note';
export type Face = { name: FaceName; px: number; lh: number; font: string; dots: string; less: string; lessPx: number; pad: number };

function mk(name: FaceName, px: number, lh: number, family: string, weight: number, dotScale = 1): Face {
  const lessPx = Math.max(16, Math.round(px * 0.6));
  return {
    name, px, lh,
    font: `${weight} ${px}px ${family}`,
    dots: `700 ${Math.round(px * dotScale)}px ${SANS}`,
    less: `600 ${lessPx}px ${SANS}`,
    lessPx,
    pad: Math.round(px * 0.12),
  };
}

export function faces(phone: boolean): Record<FaceName, Face> {
  return {
    display: phone ? mk('display', 28, 36, SANS, 500, 1.25) : mk('display', 50, 60, SANS, 500, 1.3),
    lede: phone ? mk('lede', 20, 29, SANS, 400) : mk('lede', 24, 34, SANS, 400),
    body: phone ? mk('body', 18, 28, SERIF, 400) : mk('body', 21, 32, SERIF, 400),
    note: phone ? mk('note', 18, 27, SERIF, 400) : mk('note', 18, 28, SERIF, 400),
  };
}

const START: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
const FIT_TOLERANCE = 1 / 64;

const preparedCache = new Map<string, PreparedTextWithSegments>();
const widthCache = new Map<string, number>();

function prep(text: string, font: string): PreparedTextWithSegments {
  const k = font + '\u0000' + text;
  let p = preparedCache.get(k);
  if (!p) { p = prepareWithSegments(text, font); preparedCache.set(k, p); }
  return p;
}
function measure(text: string, font: string): number {
  const k = font + '\u0000' + text;
  let w = widthCache.get(k);
  if (w === undefined) { w = measureNaturalWidth(prepare(text, font)); widthCache.set(k, w); }
  return w;
}
/** Fonts changed (they finished loading): every width measured before is stale. */
export function resetMeasure() { preparedCache.clear(); widthCache.clear(); clearCache(); }

function trimEndSpace(text: string): string { return text.endsWith(' ') ? text.slice(0, -1) : text; }

// The start of the line at `start` that fits in `room`, taken in pieces from Pretext's line stream (see the demo).
function fillLine(prepared: PreparedTextWithSegments, start: LayoutCursor, room: number, space: number): string {
  let text = '';
  let cursor = start;
  let x = 0;
  for (;;) {
    const piece = layoutNextLine(prepared, room - x, cursor);
    if (piece === null || piece.width > room - x + FIT_TOLERANCE) return text;
    x += piece.width;
    if (piece.text.endsWith(' ')) {
      if (x + space > room) return text + piece.text.slice(0, -1);
      x += space;
    }
    text += piece.text;
    cursor = piece.end;
  }
}

// The first `maxLines` lines at `width`; when text is left over, the last line leaves `tail` free for the
// ellipsis, breaking where the browser would, and only cutting back to an earlier word when the tail needs it.
function clampLines(prepared: PreparedTextWithSegments, width: number, maxLines: number, tail: number, space: number): { lines: string[]; truncated: boolean } {
  const lines: string[] = [];
  let cursor = START;
  let lastStart = START;
  let lastWidth = 0;
  for (let i = 0; i < maxLines; i++) {
    const line = layoutNextLine(prepared, width, cursor);
    if (line === null) return { lines, truncated: false };
    lines.push(line.text);
    lastStart = cursor;
    lastWidth = line.width;
    cursor = line.end;
  }
  if (layoutNextLineRange(prepared, width, cursor) === null) return { lines, truncated: false };
  const last = lines.length - 1;
  let cut = lastWidth + tail <= width ? trimEndSpace(lines[last]!) : fillLine(prepared, lastStart, width - tail, space);
  // Never end inside a word: fillLine may break one when a single word is wider than the room.
  const full = lines[last]!;
  if (cut.length < full.length && !/\s$/.test(cut) && !/\s/.test(full[cut.length] ?? ' ')) {
    const sp = cut.lastIndexOf(' ');
    if (sp > 0) cut = cut.slice(0, sp);
  }
  lines[last] = cut.replace(/[\s,;:.]+$/, '');
  return { lines, truncated: true };
}

export type CutLayout = {
  closed: string[];      // the closed lines; the ellipsis follows the last
  truncated: boolean;    // false: the text fits, nothing to open
  open: string[][];      // every line of every paragraph
  lessOwnLine: boolean;  // the closing link takes a line of its own
  closedH: number;
  openH: number;
  gap: number;           // between paragraphs
  lineCount: number;     // open lines, for the closing count
};

export function layoutCut(paras: readonly string[], face: Face, width: number, maxLines: number, cutAt?: string): CutLayout {
  const { lh, font } = face;
  const gap = Math.round(lh * 0.55);
  const space = measure(' ', font);
  const tail = measure('...', face.dots) + face.pad + 2;
  const lessW = space + measure(LESS_LABEL, face.less) + face.pad * 2 + 4;

  const open: string[][] = paras.map((p) => layoutWithLines(prep(p, font), width, lh).lines.map((l) => l.text));
  let closed: string[];
  let truncated: boolean;
  if (cutAt) {
    // A cut placed on purpose: the prefix in as many lines as it needs, with room left for the ellipsis.
    const pre = prep(cutAt, font);
    const n = layout(pre, width - tail, lh).lineCount;
    closed = clampLines(pre, width, n, tail, space).lines;
    closed[closed.length - 1] = trimEndSpace(closed[closed.length - 1]!).replace(/[\s,;:.]+$/, '');
    truncated = true;
  } else {
    const c = clampLines(prep(paras[0]!, font), width, maxLines, tail, space);
    closed = c.lines;
    truncated = c.truncated || paras.length > 1;
    // Never cut inside a name: "Lincoln… Douglas" backs off to the word before "Lincoln".
    const para = paras[0]!;
    for (let k = 0; c.truncated && k < 4; k++) {
      const last = closed[closed.length - 1]!;
      const before = closed.slice(0, -1).join('');
      const rest = para.slice(before.length + last.length).replace(/^[,;:.\s]+/, '');
      const next = rest.split(/\s/)[0] ?? '';
      const words = last.trimEnd().split(' ');
      const lw = words[words.length - 1] ?? '';
      if (words.length < 2 || !/^[A-Z]/.test(lw) || !/^[A-Z]/.test(next)) break;
      closed[closed.length - 1] = words.slice(0, -1).join(' ').replace(/[\s,;:.]+$/, '');
    }
  }
  const lastPara = open[open.length - 1]!;
  const lastLine = lastPara[lastPara.length - 1] ?? '';
  const lessOwnLine = truncated && measure(lastLine, font) + lessW > width;
  const lineCount = open.reduce((a, l) => a + l.length, 0);
  const openH = truncated ? lineCount * lh + (open.length - 1) * gap + (lessOwnLine ? lh : 0) : lineCount * lh;
  return { closed, truncated, open, lessOwnLine, closedH: closed.length * lh, openH, gap, lineCount };
}
