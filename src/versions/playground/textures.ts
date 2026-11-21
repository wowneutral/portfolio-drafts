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

/** A brass plaque: engraving drawn dark on white, multiplied by the brass. */
export function plaque(o: { title: string; event: string; where: string; when: string }) {
  const W = 1024, H = 1024;
  const { c, g } = canvas(W, H);
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#6a5230'; g.lineWidth = 6; g.strokeRect(54, 54, W - 108, H - 108);
  g.lineWidth = 2; g.strokeRect(74, 74, W - 148, H - 148);
  g.fillStyle = '#4e3a1e'; g.textAlign = 'center';
  g.font = `400 190px ${ANTON}`; g.fillText(o.title.toUpperCase(), W / 2, 380);
  g.font = `600 64px ${SERIF}`;
  wrap(g, o.event, W - 220, 2).forEach((l, i) => g.fillText(l, W / 2, 530 + i * 76));
  g.font = `400 84px ${ANTON}`; g.fillText(o.where.toUpperCase(), W / 2, 770);
  g.font = `600 56px ${SERIF}`; g.fillText(o.when, W / 2, 870);
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

/** The envelope's face: who it goes to. */
export function envelope(o: { name: string; to: string }) {
  const W = 1024, H = 652;
  const { c, g } = canvas(W, H);
  g.fillStyle = '#efe5cc'; g.fillRect(0, 0, W, H); grain(g, W, H, 0.06);
  g.fillStyle = '#14110d'; g.font = `italic 500 64px ${SERIF}`;
  g.fillText(o.name, 420, 380); g.font = `500 50px ${SERIF}`; g.fillText(o.to, 420, 450);
  g.fillStyle = 'rgba(20,17,13,0.6)'; g.fillRect(420, 476, 440, 2);
  return tex(c);
}
/** The back of the envelope: the flap. */
export function flap() {
  const W = 1024, H = 652;
  const { c, g } = canvas(W, H);
  g.fillStyle = '#ece1c5'; g.fillRect(0, 0, W, H); grain(g, W, H, 0.06);
  g.fillStyle = 'rgba(120,95,50,0.12)';
  g.beginPath(); g.moveTo(0, 0); g.lineTo(W / 2, H * 0.56); g.lineTo(W, 0); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(90,70,40,0.35)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(W / 2, H * 0.56); g.lineTo(W, 0); g.stroke();
  g.beginPath(); g.moveTo(0, H); g.lineTo(W * 0.42, H * 0.47); g.moveTo(W, H); g.lineTo(W * 0.58, H * 0.47); g.stroke();
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
