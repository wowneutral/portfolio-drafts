// Draft 86, The shred. Paints a sheet onto a canvas with the page's own fonts, so the strips
// carry exactly the type the visitor saw on the sheet (the React Bits Shredder snapshots the DOM
// through an SVG foreignObject, which cannot load webfonts; this replaces that step).

export const SERIF = '"Newsreader Variable", Georgia, serif';
export const DISPLAY = '"Oswald Variable", "Arial Narrow", sans-serif';
export const INK = '#121212';
export const SHEET = '#fcfcfa';
export const COBALT = '#2b4fd8';

export type Spec = {
  id: string;
  label: string;
  big: string;
  display?: boolean;
  lines?: string[];
  foot: string;
  /** Full text for screen readers. */
  text: string;
};

export type Laid = { W: number; H: number; draw: (ctx: CanvasRenderingContext2D) => void };

const wrap = (ctx: CanvasRenderingContext2D, text: string, max: number) => {
  const words = text.split(' ');
  const out: string[] = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > max && line) {
      out.push(line);
      line = w;
    } else line = t;
  }
  if (line) out.push(line);
  return out;
};

const scratch = () => document.createElement('canvas').getContext('2d')!;

/** Lays a sheet out at width W and returns its height and a painter. `s` scales the type. */
export function lay(spec: Spec, W: number, s: number): Laid {
  const ctx = scratch();
  const pad = Math.round(Math.max(20, 34 * s));
  const inner = W - pad * 2;
  const labelSize = Math.max(12, Math.round(14 * s));
  const bigSize = Math.round((spec.display ? 46 : 44) * s);
  const bigLH = Math.round(bigSize * (spec.display ? 1.02 : 1.14));
  const bigFont = spec.display ? `600 ${bigSize}px ${DISPLAY}` : `400 ${bigSize}px ${SERIF}`;
  ctx.font = bigFont;
  const big = wrap(ctx, spec.display ? spec.big.toUpperCase() : spec.big, inner);
  const lineSize = Math.max(16, Math.round(23 * s));
  const lineLH = Math.round(lineSize * 1.3);
  ctx.font = `400 ${lineSize}px ${SERIF}`;
  const lines = (spec.lines ?? []).map((l, i) => {
    ctx.font = `${i === 1 ? 'italic ' : ''}400 ${lineSize}px ${SERIF}`;
    return wrap(ctx, l, inner);
  });
  const footSize = Math.max(12, Math.round(13 * s));
  let y = pad + labelSize + Math.round(22 * s);
  const bigTop = y;
  y += big.length * bigLH;
  const linesTop = y + Math.round(16 * s);
  y = linesTop + lines.reduce((a, l) => a + l.length * lineLH + Math.round(6 * s), 0);
  const H = Math.ceil(y + Math.round(26 * s) + footSize + pad);
  const draw = (c: CanvasRenderingContext2D) => {
    c.fillStyle = SHEET;
    c.fillRect(0, 0, W, H);
    c.fillStyle = INK;
    c.textBaseline = 'alphabetic';
    c.font = `500 ${labelSize}px ${DISPLAY}`;
    c.letterSpacing = `${(labelSize * 0.14).toFixed(1)}px`;
    c.fillText(spec.label.toUpperCase(), pad, pad + labelSize);
    c.letterSpacing = spec.display ? `${(bigSize * 0.01).toFixed(1)}px` : `${(-bigSize * 0.012).toFixed(1)}px`;
    c.font = bigFont;
    big.forEach((l, i) => c.fillText(l, pad, bigTop + bigSize * 0.86 + i * bigLH));
    c.letterSpacing = '0px';
    let ly = linesTop;
    lines.forEach((ls, i) => {
      c.font = `${i === 1 ? 'italic ' : ''}400 ${lineSize}px ${SERIF}`;
      ls.forEach((l) => {
        c.fillText(l, pad, ly + lineSize * 0.9);
        ly += lineLH;
      });
      ly += Math.round(6 * s);
    });
    c.font = `500 ${footSize}px ${DISPLAY}`;
    c.letterSpacing = `${(footSize * 0.12).toFixed(1)}px`;
    c.fillStyle = '#4a4a46';
    c.fillText(spec.foot.toUpperCase(), pad, H - pad);
    c.letterSpacing = '0px';
  };
  return { W, H, draw };
}

/** Renders a laid sheet into a canvas at the given pixel scale. */
export function texture(l: Laid, scale: number) {
  const tex = document.createElement('canvas');
  tex.width = Math.ceil(l.W * scale);
  tex.height = Math.ceil(l.H * scale);
  const ctx = tex.getContext('2d')!;
  ctx.scale(scale, scale);
  l.draw(ctx);
  return tex;
}

let fontsReady: Promise<unknown> | null = null;
export const fonts = () =>
  (fontsReady ??= Promise.all([
    document.fonts.load(`400 40px ${SERIF}`),
    document.fonts.load(`italic 400 20px ${SERIF}`),
    document.fonts.load(`600 40px ${DISPLAY}`),
    document.fonts.load(`500 14px ${DISPLAY}`),
  ]).catch(() => null));
