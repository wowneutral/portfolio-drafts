// Everything printed on his things, drawn at 2x on canvases in the page's own two faces (Anton, Newsreader),
// after document.fonts.ready. Original to this draft.
import * as THREE from 'three';

const ANTON = "'Anton', Impact, sans-serif";
const SERIF = "'Newsreader Variable', Georgia, serif";

function canvas(w: number, h: number) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return { c, g: c.getContext('2d')! };
}
function tex(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
/** Wrap text into lines no wider than w; returns at most max lines, the last with an ellipsis if cut. */
function wrap(g: CanvasRenderingContext2D, text: string, w: number, max: number) {
  const words = text.split(/\s+/); const out: string[] = []; let cur = '';
  for (const word of words) {
    const next = cur ? cur + ' ' + word : word;
    if (g.measureText(next).width > w && cur) { out.push(cur); cur = word; if (out.length === max) break; } else cur = next;
  }
  if (out.length < max && cur) out.push(cur);
  const used = out.join(' ').split(/\s+/).length;
  if (used < words.length && out.length) {
    let last = out[out.length - 1];
    while (g.measureText(last + '...').width > w && last.includes(' ')) last = last.slice(0, last.lastIndexOf(' '));
    out[out.length - 1] = last + '...';
  }
  return out;
}
function grain(g: CanvasRenderingContext2D, w: number, h: number, a: number) {
  let s = 11; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < (w * h) / 90; i++) { g.fillStyle = `rgba(60,50,30,${rnd() * a})`; g.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
}

/** The notepad's top sheet: today's date and the opening of the note. */
export function noteSheet(note: { day: string; year: string; lines: string; loaded: boolean }) {
  const W = 1024, H = 1386;
  const { c, g } = canvas(W, H);
  g.fillStyle = '#f8f5ec'; g.fillRect(0, 0, W, H); grain(g, W, H, 0.05);
  g.strokeStyle = 'rgba(40,60,90,0.16)'; g.lineWidth = 2;
  for (let y = 430; y < H - 40; y += 74) { g.beginPath(); g.moveTo(60, y); g.lineTo(W - 60, y); g.stroke(); }
  g.fillStyle = '#14110d';
  if (note.day) {
    g.font = `400 200px ${ANTON}`; g.fillText(note.day, 80, 300);
    g.font = `500 44px ${SERIF}`; g.fillStyle = '#4a443a'; g.fillText(note.year + ', today', 86, 372);
    g.fillStyle = '#14110d'; g.font = `600 56px ${SERIF}`;
    wrap(g, note.lines, W - 160, 12).forEach((l, i) => g.fillText(l, 82, 486 + i * 74));
  } else {
    g.font = `400 200px ${ANTON}`; g.fillText('TODAY', 80, 300);
    g.fillStyle = '#4a443a'; g.font = `italic 500 52px ${SERIF}`;
    g.fillText(note.loaded ? 'No note yet. The next one lands here.' : 'Fetching today’s note.', 86, 486);
  }
  return tex(c);
}

/** The paper's cover. */
export function cover(o: { short: string; status: string; pages: number; doi: string; name: string }) {
  const W = 1024, H = 1448;
  const { c, g } = canvas(W, H);
  g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, W, H); grain(g, W, H, 0.035);
  g.fillStyle = '#14110d'; g.textAlign = 'center';
  g.font = `600 40px ${SERIF}`; g.fillText(o.name.toUpperCase().split('').join(' '), W / 2, 220);
  g.fillRect(W / 2 - 60, 290, 120, 3);
  g.font = `italic 500 112px ${SERIF}`;
  const t = o.short.replace(/[“”]/g, '');
  wrap(g, t, W - 200, 4).forEach((l, i) => g.fillText(l, W / 2, 520 + i * 128));
  g.font = `500 42px ${SERIF}`; g.fillStyle = '#4a443a';
  g.fillText(`${o.status}, ${o.pages} pages`, W / 2, 1040);
  g.font = `500 34px ${SERIF}`; g.fillText('doi ' + o.doi, W / 2, 1330);
  return tex(c);
}

/** The engraved number on the GitHub block's face, on a clear ground. */
export function engraving(n: string, label: string) {
  const W = 1024, H = 1024;
  const { c, g } = canvas(W, H);
  g.textAlign = 'center';
  g.font = `400 ${n.length > 2 ? 400 : 520}px ${ANTON}`;
  // Inset: a dark lip above, a lit lip below, the cut face between.
  g.fillStyle = 'rgba(0,0,0,0.9)'; g.fillText(n, W / 2 - 3, 640 - 5);
  g.fillStyle = 'rgba(255,255,255,0.26)'; g.fillText(n, W / 2 + 2, 640 + 5);
  g.fillStyle = '#2c2b29'; g.fillText(n, W / 2, 640);
  g.font = `400 78px ${ANTON}`; g.fillStyle = '#b9b4aa';
  g.fillText(label.toUpperCase().split('').join(' '), W / 2, 830);
  return tex(c);
}

/** One commit tile's printed initial. */
export function initial(ch: string) {
  const { c, g } = canvas(256, 256);
  g.fillStyle = '#f2efe6'; g.textAlign = 'center'; g.font = `400 190px ${ANTON}`;
  g.fillText(ch.toUpperCase(), 128, 206);
  return tex(c);
}

/** The MITEZ card's face. Its screenshot is only the white click-to-enter page, so the card carries its
 * placard instead: the name set large and spaced like the site's own footer, with what it is and where it lives. */
export function mitezFace(o: { name: string; kind: string; host: string }) {
  const W = 1536, H = 960;
  const { c, g } = canvas(W, H);
  g.fillStyle = '#f2f1ee'; g.fillRect(0, 0, W, H); grain(g, W, H, 0.03);
  g.fillStyle = '#14110d'; g.textAlign = 'center';
  g.font = `400 330px ${ANTON}`;
  g.fillText(o.name.toUpperCase().split('').join('\u2009'), W / 2, 560);
  g.fillRect(120, 690, W - 240, 4);
  g.textAlign = 'left'; g.font = `400 64px ${ANTON}`;
  g.fillText(o.kind.toUpperCase().split('').join('\u200a'), 120, 800);
  g.textAlign = 'right'; g.font = `600 60px ${SERIF}`;
  g.fillText(o.host, W - 120, 800);
  return tex(c);
}

/** Sheet edges for the sides of the paper and the pad. */
export function edges() {
  const { c, g } = canvas(64, 256);
  g.fillStyle = '#f4f0e6'; g.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 8) { g.fillStyle = `rgba(90,80,60,${0.1 + ((y * 7) % 5) * 0.03})`; g.fillRect(0, y, 64, 2); }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** A placard on the front of a stand: the name, small, in white. */
export function placard(text: string, aspect: number) {
  const H = 96, W = Math.round(H * aspect);
  const { c, g } = canvas(W, H);
  g.fillStyle = '#efeadd'; g.font = `400 58px ${ANTON}`; g.textBaseline = 'middle';
  g.fillText(text.toUpperCase().split('').join('\u200a'), 28, H / 2 + 3);
  return tex(c);
}
