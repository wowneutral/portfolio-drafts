// Disc faces for the sphere (Sphere.tsx, after React Bits InfiniteMenu): each one painted on a canvas cell at
// atlas resolution, in the page's two faces, ivory stock with near-black type and one amber dot.
export const SANS = '"Schibsted Grotesk Variable", "Schibsted Grotesk", sans-serif';
export const MONO = '"JetBrains Mono Variable", "JetBrains Mono", monospace';
const IVORY = '#ecebe6';
const INK = '#121212';
const SOFT = '#4a4843';
const AMBER = '#f0a43c';
const NIGHT = '#101011';

const images = new Map<string, Promise<HTMLImageElement>>();
const image = (src: string) => {
  let p = images.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
    images.set(src, p);
  }
  return p;
};

function fit(ctx: CanvasRenderingContext2D, text: string, weight: number, family: string, max: number, width: number) {
  let size = max;
  ctx.font = `${weight} ${size}px ${family}`;
  const w = ctx.measureText(text).width;
  if (w > width) size = Math.max(8, size * (width / w));
  ctx.font = `${weight} ${size}px ${family}`;
  return size;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, lines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width <= width || !line) line = test;
    else {
      out.push(line);
      line = words[i];
      if (out.length === lines) { line = ''; out[lines - 1] = clip(ctx, out[lines - 1] + ' ' + words.slice(i).join(' '), width); break; }
    }
  }
  if (line) out.push(line);
  return out.slice(0, lines).map((l) => clip(ctx, l, width));
}

function clip(ctx: CanvasRenderingContext2D, text: string, width: number) {
  if (ctx.measureText(text).width <= width) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > width) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}

function stock(ctx: CanvasRenderingContext2D, S: number) {
  ctx.fillStyle = IVORY;
  ctx.fillRect(0, 0, S, S);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
}

function dotRow(ctx: CanvasRenderingContext2D, S: number, y: number, text: string, size: number) {
  ctx.font = `500 ${size}px ${MONO}`;
  const w = ctx.measureText(text).width;
  const r = size * 0.36;
  const gap = size * 0.55;
  const left = S / 2 - (w + r * 2 + gap) / 2;
  ctx.fillStyle = AMBER;
  ctx.beginPath();
  ctx.arc(left + r, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.fillText(text, left + r * 2 + gap, y);
  ctx.textAlign = 'center';
}

export function repoFace(o: { name: string; language: string | null; note: string | null; when: string | null }) {
  return (ctx: CanvasRenderingContext2D, S: number) => {
    stock(ctx, S);
    ctx.fillStyle = SOFT;
    ctx.font = `500 ${S * 0.04}px ${MONO}`;
    ctx.fillText('wowneutral /', S / 2, S * 0.27);
    ctx.fillStyle = INK;
    fit(ctx, o.name, 800, SANS, S * 0.15, S * 0.74);
    ctx.fillText(o.name, S / 2, S * 0.41);
    if (o.language) dotRow(ctx, S, S * 0.53, o.language, S * 0.044);
    ctx.fillStyle = '#c4c2ba';
    ctx.fillRect(S * 0.36, S * 0.6, S * 0.28, Math.max(1, S * 0.003));
    if (o.note) {
      ctx.fillStyle = INK;
      ctx.font = `500 ${S * 0.043}px ${SANS}`;
      wrap(ctx, o.note, S * 0.62, 2).forEach((l, i) => ctx.fillText(l, S / 2, S * (0.665 + i * 0.056)));
    }
    if (o.when) {
      ctx.fillStyle = SOFT;
      ctx.font = `500 ${S * 0.036}px ${MONO}`;
      ctx.fillText(o.when, S / 2, S * 0.8);
    }
  };
}

export function workFace(o: { src: string; name: string; kind: string; focus?: [number, number, number] }) {
  return async (ctx: CanvasRenderingContext2D, S: number) => {
    ctx.fillStyle = NIGHT;
    ctx.fillRect(0, 0, S, S);
    const img = await image(o.src);
    // Mostly white screenshots are cropped in close on the part that carries content.
    const [fx, fy, z] = o.focus ?? [0.5, 0.33, 1];
    const scale = Math.max(S / img.naturalWidth, (S * 0.66) / img.naturalHeight) * z;
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    const x = Math.min(0, Math.max(S - w, S / 2 - fx * w));
    const y = Math.min(0, Math.max(S * 0.66 - h, S * 0.33 - fy * h));
    ctx.drawImage(img, x, y, w, h);
    // A solid band for the name: the type never sits on the screenshot.
    ctx.fillStyle = NIGHT;
    ctx.fillRect(0, S * 0.64, S, S * 0.36);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = IVORY;
    fit(ctx, o.name, 800, SANS, S * 0.092, S * 0.6);
    ctx.fillText(o.name, S / 2, S * 0.745);
    ctx.fillStyle = '#b9b7b0';
    ctx.font = `500 ${S * 0.036}px ${MONO}`;
    ctx.fillText(o.kind, S / 2, S * 0.83);
  };
}

export function todayFace(o: { day: string; month: string; latest: string | null }) {
  return (ctx: CanvasRenderingContext2D, S: number) => {
    stock(ctx, S);
    ctx.fillStyle = SOFT;
    ctx.font = `500 ${S * 0.044}px ${MONO}`;
    ctx.fillText('Today', S / 2, S * 0.25);
    ctx.fillStyle = INK;
    ctx.font = `800 ${S * 0.29}px ${SANS}`;
    ctx.fillText(o.day, S / 2, S * 0.45);
    fit(ctx, o.month, 700, SANS, S * 0.07, S * 0.66);
    ctx.fillText(o.month, S / 2, S * 0.63);
    if (o.latest) dotRow(ctx, S, S * 0.75, o.latest, S * 0.036);
  };
}

export function paperFace(o: { title: string; status: string; doi: string }) {
  return (ctx: CanvasRenderingContext2D, S: number) => {
    stock(ctx, S);
    ctx.fillStyle = SOFT;
    ctx.font = `500 ${S * 0.04}px ${MONO}`;
    ctx.fillText(o.status, S / 2, S * 0.26);
    ctx.fillStyle = INK;
    ctx.font = `800 ${S * 0.088}px ${SANS}`;
    wrap(ctx, o.title, S * 0.7, 3).forEach((l, i) => ctx.fillText(l, S / 2, S * (0.4 + i * 0.1)));
    dotRow(ctx, S, S * 0.7, 'DOI', S * 0.036);
    ctx.fillStyle = SOFT;
    ctx.font = `500 ${S * 0.034}px ${MONO}`;
    ctx.fillText(o.doi, S / 2, S * 0.76);
  };
}

export function contactFace(o: { github: string; email: string }) {
  return (ctx: CanvasRenderingContext2D, S: number) => {
    stock(ctx, S);
    ctx.fillStyle = SOFT;
    ctx.font = `500 ${S * 0.044}px ${MONO}`;
    ctx.fillText('Contact', S / 2, S * 0.3);
    ctx.fillStyle = INK;
    fit(ctx, o.github, 800, SANS, S * 0.09, S * 0.76);
    ctx.fillText(o.github, S / 2, S * 0.46);
    dotRow(ctx, S, S * 0.6, o.email, S * 0.04);
  };
}
