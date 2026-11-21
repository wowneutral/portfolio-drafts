// Base: after src/versions/letters/plan.ts (draft 2). The floor plan of the desk:
// where each letter of ARMAAN SETH. stands, where each of his real things sits,
// and the camera positions the scroll walks between. A row on a wide screen,
// a tighter two-row arrangement on a phone.
import { letter, type Outline } from './geo';

export const NAME = 'ARMAAN SETH.';
export const STOPS = ['hero', 'about', 'debate', 'skeptical', 'research', 'work', 'today', 'github', 'now', 'record', 'end'] as const;
export type StopName = (typeof STOPS)[number];
export const stopIndex = (n: StopName) => STOPS.indexOf(n);

export type V3 = [number, number, number];
export type Frame = { x0: number; x1: number; y0: number; y1: number };
/** A camera position as a photographer would say it: what it looks at, from where (az, el in degrees), how much must fit (w by h metres), the lens, and where on screen. */
export type Shot = { at: V3; az: number; el: number; w: number; h: number; fov: number; frame: Frame; up?: V3 };
export type Via = { p: V3; t: V3 };
export type Home = { ch: string; o: Outline; x: number; y: number; z: number };

/** His things. Each id matches a link in the page. */
export const THINGS = ['mitez', 'github', 'notepad', 'paper', 'envelope', 'plaque0', 'plaque1', 'skeptical'] as const;
export type ThingId = (typeof THINGS)[number];
export const PRINTS = ['lastseen', 'lastsearch', 'spread', 'rogue', 'jarvis', 'drafts'] as const;
export type Spot = { x: number; z: number; ry: number };

export const NAME_CAP = 1.6, NAME_DEPTH = 0.48;
export const TILE = { s: 0.32, h: 0.09, pitch: 0.42, per: 5 };

export type Plan = {
  phone: boolean;
  letters: Home[];
  spots: Record<ThingId, Spot>;
  prints: Spot[];
  /** The first commit tile; rows run toward the camera. */
  tiles: { x: number; z: number };
  x0: number; x1: number; z0: number; z1: number;
  shots: Record<StopName, Shot>;
  vias: Partial<Record<string, Via[]>>;
};

const TRACK = 0.1, SPACE = 0.56;
const deg = (d: number) => (d * Math.PI) / 180;

function row(text: string, x0: number, z: number, out: Home[]): number {
  let pen = x0;
  for (const ch of text) {
    if (ch === ' ') { pen += SPACE; continue; }
    const o = letter(ch, NAME_CAP);
    out.push({ ch, o, x: pen + o.adv / 2, y: o.h / 2, z });
    pen += o.adv + (ch === 'H' ? 0.04 : TRACK);
  }
  return pen - TRACK;
}
const width = (t: string) => t.split('').reduce((s, ch) => s + (ch === ' ' ? SPACE : letter(ch, NAME_CAP).adv + TRACK), 0) - TRACK;

export function makePlan(phone: boolean): Plan {
  const letters: Home[] = [];
  if (!phone) {
    const w = width(NAME), x0 = -w / 2, x1 = row(NAME, x0, 0, letters);
    const L = (i: number) => letters[i];
    const spots: Record<ThingId, Spot> = {
      mitez: { x: -4.95, z: 2.60, ry: deg(9) },
      github: { x: -3.15, z: 2.55, ry: deg(-14) },
      notepad: { x: -1.65, z: 3.05, ry: deg(-7) },
      paper: { x: -0.5, z: 2.85, ry: deg(6) },
      envelope: { x: 0.72, z: 3.20, ry: deg(-9) },
      plaque0: { x: 1.9, z: 2.55, ry: deg(-8) },
      plaque1: { x: 2.8, z: 2.65, ry: deg(-14) },
      skeptical: { x: 3.95, z: 2.40, ry: deg(-18) },
    };
    const prints = [-5.6, -3.4, -1.15, 1.1, 3.35, 5.6].map((x, i) => ({ x, z: -2.5 - (i % 2) * 0.35, ry: Math.PI + deg(i % 2 ? 4 : -4) }));
    const tiles = { x: spots.github.x - 0.85, z: 3.65 };
    const R: Frame = { x0: 0.47, x1: 0.985, y0: 0.07, y1: 0.95 };
    const P = (id: ThingId): V3 => [spots[id].x, 0, spots[id].z];
    const pm = (spots.plaque0.x + spots.plaque1.x) / 2;
    const shots: Record<StopName, Shot> = {
      hero: { at: [-0.1, 0.6, 1.6], az: -5, el: 20, w: w + 0.5, h: 3.9, fov: 15, frame: { x0: 0.03, x1: 0.97, y0: 0.07, y1: 0.71 } },
      // MITEZ, on its lean: the thing he built for other people.
      about: { at: [P('mitez')[0] + 0.1, 0.45, P('mitez')[2]], az: -24, el: 13, w: 2.3, h: 1.5, fov: 28, frame: R },
      // Down on the floor in front of the two brass plaques: the name looms behind them.
      debate: { at: [pm, 0.62, 2.35], az: 12, el: -3, w: 2.3, h: 1.55, fov: 42, frame: R },
      skeptical: { at: [P('skeptical')[0] + 0.25, 0.7, P('skeptical')[2] + 0.35], az: -22, el: 10, w: 2.7, h: 2.1, fov: 30, frame: R },
      // From above, so the cover can be read.
      research: { at: [P('paper')[0], 0.1, P('paper')[2]], az: 4, el: 64, w: 1.4, h: 1.5, fov: 30, frame: R },
      // Round the back of the name: a row of framed prints facing the other way.
      work: { at: [-3.4, 0.75, -2.8], az: 180, el: 9, w: 5.6, h: 2.1, fov: 26, frame: R },
      today: { at: [P('notepad')[0], 0.08, P('notepad')[2] + 0.05], az: -4, el: 70, w: 1.25, h: 1.5, fov: 28, frame: R },
      github: { at: [P('github')[0] - 0.05, 0.42, P('github')[2] + 0.75], az: -20, el: 30, w: 2.5, h: 2.5, fov: 30, frame: R },
      now: { at: [L(6).x, 0.85, 0], az: 34, el: 5, w: 2.6, h: 2.2, fov: 30, frame: R },
      record: { at: [pm, 0.5, 2.35], az: -38, el: 28, w: 2.6, h: 1.9, fov: 28, frame: R },
      // The ending: straight down on the whole desk, everything home.
      end: { at: [0, 0.2, 1.4], az: -6, el: 56, w: w + 2.0, h: 6.6, fov: 22, frame: { x0: 0.03, x1: 0.97, y0: 0.02, y1: 0.44 } },
    };
    const vias: Plan['vias'] = {
      // Up and over the name to its back.
      'research>work': [{ p: [0, 7, 5], t: [-1, 1, 1] }, { p: [-1, 8, -7], t: [-2, 1, -2] }],
      // Round the far end and out to the front again.
      'work>today': [{ p: [9.5, 3.5, -6], t: [6, 1, -1] }, { p: [8.5, 3, 5], t: [1, 0.5, 2.4] }],
    };
    return { phone, letters, spots, prints, tiles, x0, x1, z0: -4, z1: 6, shots, vias };
  }

  // Phone: ARMAAN behind, SETH. in front, his things in two tight rows before them.
  const back = -3.9;
  const wa = width('ARMAAN'), ws = width('SETH.');
  row('ARMAAN', -wa / 2, back, letters);
  const x1 = row('SETH.', wa / 2 - ws, 0, letters);
  const x0 = -wa / 2;
  const L = (i: number) => letters[i];
  const spots: Record<ThingId, Spot> = {
    github: { x: -2.45, z: -0.1, ry: deg(-12) },
    mitez: { x: -2.3, z: 2.0, ry: deg(10) },
    notepad: { x: -0.75, z: 2.25, ry: deg(-6) },
    paper: { x: 0.4, z: 2.1, ry: deg(7) },
    skeptical: { x: 2.3, z: 1.85, ry: deg(-16) },
    plaque0: { x: -2.1, z: 3.8, ry: deg(-6) },
    plaque1: { x: -1.2, z: 3.9, ry: deg(-12) },
    envelope: { x: 0.35, z: 3.85, ry: deg(-9) },
  };
  const prints = [-2.3, 0, 2.3].flatMap((x, i) => [{ x, z: back - 2.4, ry: Math.PI + deg(i % 2 ? 4 : -4) }, { x: x + 1.3, z: back - 4.2, ry: Math.PI + deg(i % 2 ? -4 : 4) }]);
  const tiles = { x: 1.2, z: 3.45 };
  const W: Frame = { x0: 0.03, x1: 0.97, y0: 0.06, y1: 0.95 };
  const P = (id: ThingId): V3 => [spots[id].x, 0, spots[id].z];
  const pm = (spots.plaque0.x + spots.plaque1.x) / 2;
  const shots: Record<StopName, Shot> = {
    hero: { at: [0, 0.5, 0.2], az: -4, el: 34, w: wa + 0.8, h: 6.8, fov: 24, frame: { x0: 0.03, x1: 0.97, y0: 0.05, y1: 0.96 } },
    about: { at: [P('mitez')[0], 0.45, P('mitez')[2]], az: -20, el: 18, w: 2.2, h: 1.6, fov: 32, frame: W },
    debate: { at: [pm, 0.6, 4.15], az: 10, el: -2, w: 2.2, h: 1.6, fov: 44, frame: W },
    skeptical: { at: [P('skeptical')[0], 0.78, P('skeptical')[2]], az: -24, el: 8, w: 1.9, h: 2.0, fov: 34, frame: W },
    research: { at: [P('paper')[0], 0.1, P('paper')[2]], az: 4, el: 62, w: 1.4, h: 1.5, fov: 34, frame: W },
    work: { at: [0.6, 0.7, back - 3.3], az: 180, el: 11, w: 5.4, h: 2.6, fov: 30, frame: W },
    today: { at: [P('notepad')[0], 0.08, P('notepad')[2]], az: -6, el: 58, w: 1.4, h: 1.5, fov: 34, frame: W },
    github: { at: [P('github')[0], 0.42, P('github')[2] + 0.6], az: -18, el: 30, w: 2.4, h: 2.4, fov: 34, frame: W },
    now: { at: [L(6).x, 1.0, 0], az: 32, el: 8, w: 3.0, h: 2.6, fov: 36, frame: W },
    record: { at: [pm, 0.5, 4.15], az: -34, el: 26, w: 2.6, h: 2.0, fov: 32, frame: W },
    end: { at: [0, 0.2, -0.2], az: -6, el: 60, w: wa + 1.4, h: 7.6, fov: 26, frame: W },
  };
  const vias: Plan['vias'] = {
    'research>work': [{ p: [0, 8, 6], t: [0, 1, 0] }, { p: [0, 9, back - 9], t: [0, 1, back - 3] }],
    'work>today': [{ p: [-7, 4, back - 4], t: [-3, 1, back] }, { p: [-6, 3, 5], t: [-1, 0.5, 2.4] }],
  };
  return { phone, letters, spots, prints, tiles, x0, x1: Math.max(x1, wa / 2), z0: back - 5.5, z1: 6, shots, vias };
}
