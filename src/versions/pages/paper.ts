// Prints each of the fifteen pages of his paper onto a canvas, from content.ts only.
import { PERSON, RESEARCH } from '@/content';

const R0 = RESEARCH[0];
export const PAPER = { ...R0, pages: R0.pages!, keywords: R0.keywords!, epigraph: R0.epigraph!, ladders: R0.ladders!, doi: R0.doi! };
export const W = 1024, H = 1448;

export type Kind = 'title' | 'abstract' | 'keywords' | 'epigraph' | 'ladder' | 'links' | 'plain';
export type Page = { n: number; kind: Kind; label: string; ladder?: number };

/** Page n (1 to 15) of the paper. Only the pages with real content carry it. */
export const PAGES: Page[] = Array.from({ length: PAPER.pages }, (_, k): Page => {
  const n = k + 1;
  if (n === 1) return { n, kind: 'title', label: 'Title page' };
  if (n === 2) return { n, kind: 'abstract', label: 'Abstract' };
  if (n === 3) return { n, kind: 'keywords', label: 'Keywords' };
  if (n === 4) return { n, kind: 'epigraph', label: 'Epigraph' };
  if (n >= 5 && n <= 7) return { n, kind: 'ladder', label: PAPER.ladders[n - 5].who, ladder: n - 5 };
  if (n === 8) return { n, kind: 'links', label: 'Where to read it' };
  return { n, kind: 'plain', label: 'Page ' + n };
});

const INK = '#1a1a19', SOFT = '#55554f', GREEN = '#1d6b52';
const SERIF = '"Playfair Display Variable", "Playfair Display", Georgia, serif';
const SANS = '"Instrument Sans Variable", "Instrument Sans", system-ui, sans-serif';

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > max && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function lines(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number, align: CanvasTextAlign = 'left') {
  ctx.textAlign = align;
  const ls = wrap(ctx, text, max);
  ls.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
  return y + ls.length * lh;
}

export function printPage(p: Page): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fbfaf6';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = INK;
  ctx.textBaseline = 'alphabetic';
  const M = 112, CW = W - M * 2;

  // Running head and folio, as a printed paper has them.
  if (p.n > 1) {
    ctx.font = `500 26px ${SANS}`;
    ctx.fillStyle = SOFT;
    ctx.textAlign = 'left'; ctx.fillText(PAPER.short, M, 118);
    ctx.textAlign = 'right'; ctx.fillText(PERSON.name, W - M, 118);
    ctx.fillRect(M, 140, CW, 2);
  }
  ctx.fillStyle = INK;
  ctx.font = `italic 500 40px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.fillText(String(p.n), W / 2, H - 104);

  switch (p.kind) {
    case 'title': {
      ctx.font = `600 26px ${SANS}`;
      ctx.fillStyle = GREEN;
      ctx.textAlign = 'center';
      ctx.fillText(PAPER.status.toUpperCase(), W / 2, 250);
      ctx.fillStyle = INK;
      ctx.font = `italic 600 70px ${SERIF}`;
      let y = lines(ctx, PAPER.title, W / 2, 440, CW, 88, 'center');
      ctx.fillRect(W / 2 - 60, y + 30, 120, 3);
      ctx.font = `500 46px ${SANS}`;
      ctx.fillText(PERSON.name, W / 2, y + 140);
      ctx.font = `400 28px ${SANS}`;
      ctx.fillStyle = SOFT;
      ctx.fillText('doi ' + PAPER.doi, W / 2, H - 220);
      break;
    }
    case 'abstract': {
      ctx.font = `italic 600 64px ${SERIF}`;
      ctx.textAlign = 'left';
      ctx.fillText('Abstract', M, 300);
      ctx.font = `400 42px ${SERIF}`;
      lines(ctx, PAPER.abstract, M, 410, CW, 66);
      break;
    }
    case 'keywords': {
      ctx.font = `italic 600 64px ${SERIF}`;
      ctx.textAlign = 'left';
      ctx.fillText('Keywords', M, 300);
      ctx.font = `500 50px ${SANS}`;
      PAPER.keywords.forEach((k, i) => {
        ctx.fillText(k, M, 440 + i * 118);
        ctx.fillStyle = '#d9d8d2';
        ctx.fillRect(M, 470 + i * 118, CW, 2);
        ctx.fillStyle = INK;
      });
      break;
    }
    case 'epigraph': {
      ctx.font = `italic 500 62px ${SERIF}`;
      const y = lines(ctx, PAPER.epigraph.text, W / 2, 540, CW - 40, 86, 'center');
      ctx.font = `500 32px ${SANS}`;
      ctx.fillStyle = SOFT;
      ctx.textAlign = 'center';
      ctx.fillText(PAPER.epigraph.source, W / 2, y + 70);
      break;
    }
    case 'ladder': {
      const l = PAPER.ladders[p.ladder!];
      ctx.font = `500 30px ${SANS}`;
      ctx.fillStyle = GREEN;
      ctx.textAlign = 'left';
      ctx.fillText(l.when.toUpperCase(), M, 330);
      ctx.fillStyle = INK;
      ctx.font = `italic 600 92px ${SERIF}`;
      const y = lines(ctx, l.who, M, 470, CW, 108);
      ctx.fillRect(M, y + 10, 90, 3);
      ctx.font = `400 46px ${SERIF}`;
      lines(ctx, l.where, M, y + 110, CW, 66);
      break;
    }
    case 'links': {
      ctx.font = `italic 600 64px ${SERIF}`;
      ctx.textAlign = 'left';
      ctx.fillText('DOI', M, 300);
      ctx.font = `500 48px ${SANS}`;
      ctx.fillText(PAPER.doi, M, 390);
      ctx.fillRect(M, 450, CW, 2);
      ctx.font = `italic 500 60px ${SERIF}`;
      PAPER.links.forEach((l, i) => {
        ctx.fillStyle = i === 0 ? INK : INK;
        ctx.fillText(l.label, M, 590 + i * 120);
      });
      break;
    }
    default:
      break;
  }
  return c;
}
