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

/** His things. Each id matches a link or button in the page. */
export const THINGS = ['plato', 'github', 'watch', 'mitez', 'armillary', 'skeptical', 'notepad', 'paper', 'tea'] as const;
export type ThingId = (typeof THINGS)[number];
export const PRINTS = ['lastseen', 'lastsearch', 'spread', 'rogue', 'jarvis', 'drafts'] as const;
export type Spot = { x: number; z: number; ry: number; y?: number };
/** Rough size of each thing (w, h, d) in metres: the scanned models are scaled to the height here. */
export const SIZES: Record<ThingId, [number, number, number]> = {
  skeptical: [0.79, 1.51, 0.5], plato: [1.03, 1.8, 1.0], armillary: [1.5, 1.84, 1.1], github: [1.42, 1.22, 1.42],
  watch: [0.93, 1.3, 1.38], tea: [1.27, 0.6, 1.3], mitez: [1.98, 1.27, 0.46], notepad: [1.24, 0.11, 1.62], paper: [1.14, 0.17, 1.57],
};
/** The felt pad the paper things lie on, so their white faces part from the white sweep. */
export const PAD_H = 0.03;

export const NAME_CAP = 1.6, NAME_DEPTH = 0.48;
export const TILE = { s: 0.32, h: 0.09, pitch: 0.42, per: 5 };

export type Plan = {
  phone: boolean;
  letters: Home[];
  spots: Record<ThingId, Spot>;
  pad: { x: number; z: number; w: number; d: number; ry: number };
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
    // The name at the back, the question mark standing just after it. In front, on two depths, his things:
    // Plato and the armillary sphere as bookends, the block, the watch, the MITEZ card, then the paper things
    // on a dark felt pad and the tea. Composed for the opening camera, like a product photograph.
    const w = width(NAME), x0 = -w / 2 - 0.35, x1 = row(NAME, x0, 0, letters);
    const L = (i: number) => letters[i];
    const spots: Record<ThingId, Spot> = {
      skeptical: { x: x1 + 0.82, z: 0.55, ry: deg(-21) },
      plato: { x: x0 - 1.0, z: 1.1, ry: deg(22) },
      github: { x: -4.0, z: 3.15, ry: deg(-16) },
      watch: { x: -1.85, z: 3.40, ry: deg(-24) },
      mitez: { x: 0.45, z: 3.10, ry: deg(-7) },
      armillary: { x: 3.55, z: 3.55, ry: deg(-30) },
      notepad: { x: -2.55, z: 5.30, ry: deg(-9), y: PAD_H },
      paper: { x: -0.65, z: 5.25, ry: deg(7), y: PAD_H },
      tea: { x: 3.0, z: 5.45, ry: deg(30) },
    };
    const pad = { x: -1.6, z: 5.27, w: 4.1, d: 2.25, ry: deg(-1.5) };
    const prints = [-5.6, -3.4, -1.15, 1.1, 3.35, 5.6].map((x, i) => ({ x, z: -2.5 - (i % 2) * 0.35, ry: Math.PI + deg(i % 2 ? 4 : -4) }));
    const tiles = { x: -6.95, z: 2.55 };
    const R: Frame = { x0: 0.47, x1: 0.985, y0: 0.07, y1: 0.95 };
    const P = (id: ThingId): V3 => [spots[id].x, 0, spots[id].z];
    const shots: Record<StopName, Shot> = {
      hero: { at: [-0.4, 0.4, 2.95], az: -3, el: 33, w: 15.2, h: 6.6, fov: 22, frame: { x0: 0.02, x1: 0.98, y0: 0.04, y1: 0.74 } },
      // MITEZ, on its lean: the thing he built for other people.
      about: { at: [P('mitez')[0] + 0.1, 0.5, P('mitez')[2]], az: -16, el: 24, w: 2.4, h: 1.7, fov: 28, frame: R },
      // Down on the floor in front of the watch: an argument with a timer running, the name looming behind.
      debate: { at: [P('watch')[0], 0.5, P('watch')[2]], az: -38, el: 6, w: 2.0, h: 1.5, fov: 36, frame: R },
      skeptical: { at: [P('skeptical')[0] - 0.4, 0.7, P('skeptical')[2] + 0.7], az: -24, el: 12, w: 3.0, h: 2.2, fov: 30, frame: R },
      // From above, so the cover can be read.
      research: { at: [P('paper')[0], 0.1, P('paper')[2]], az: 4, el: 64, w: 1.4, h: 1.6, fov: 30, frame: R },
      // Round the back of the name: a row of framed prints facing the other way.
      work: { at: [-3.4, 0.75, -2.8], az: 180, el: 9, w: 5.6, h: 2.1, fov: 26, frame: R },
      today: { at: [P('notepad')[0], 0.08, P('notepad')[2] + 0.05], az: -4, el: 70, w: 1.3, h: 1.6, fov: 28, frame: R },
      github: { at: [P('github')[0] - 0.4, 0.45, P('github')[2] + 0.4], az: -20, el: 26, w: 3.0, h: 2.4, fov: 30, frame: R },
      // The armillary sphere: the club and the reading.
      now: { at: [P('armillary')[0], 0.7, P('armillary')[2]], az: 36, el: 10, w: 2.2, h: 1.9, fov: 30, frame: R },
      // Plato, at the end of the name; the tea in the foreground of the way back.
      record: { at: [P('plato')[0] + 0.15, 0.65, P('plato')[2]], az: 30, el: 16, w: 2.0, h: 1.8, fov: 30, frame: R },
      // The ending: straight down on the whole desk, everything home.
      end: { at: [-0.3, 0.2, 1.8], az: -6, el: 56, w: 15.6, h: 7.2, fov: 22, frame: { x0: 0.03, x1: 0.97, y0: 0.02, y1: 0.44 } },
    };
    const vias: Plan['vias'] = {
      // Up and over the name to its back.
      'research>work': [{ p: [0, 7, 5], t: [-1, 1, 1] }, { p: [-1, 8, -7], t: [-2, 1, -2] }],
      // Round the far end and out to the front again.
      'work>today': [{ p: [9.5, 3.5, -6], t: [6, 1, -1] }, { p: [8.5, 3, 5], t: [1, 0.5, 2.4] }],
    };
    return { phone, letters, spots, pad, prints, tiles, x0: x0 - 1.6, x1: x1 + 1.3, z0: -4, z1: 6.6, shots, vias };
  }

  // Phone: ARMAAN behind, SETH.? in front, his things in two tight rows before them.
  const back = -3.2;
  const wa = width('ARMAAN'), ws = width('SETH.');
  row('ARMAAN', -wa / 2, back, letters);
  const sx = wa / 2 - ws - 0.75, x1 = row('SETH.', sx, 0, letters);
  const x0 = -wa / 2;
  const L = (i: number) => letters[i];
  const spots: Record<ThingId, Spot> = {
    skeptical: { x: x1 + 0.75, z: 0.3, ry: deg(-14) },
    plato: { x: sx - 0.75, z: 0.35, ry: deg(20) },
    github: { x: -2.45, z: 2.40, ry: deg(-14) },
    watch: { x: -0.7, z: 2.60, ry: deg(-22) },
    mitez: { x: 1.2, z: 2.35, ry: deg(-6) },
    armillary: { x: 3.1, z: 2.20, ry: deg(-28) },
    notepad: { x: -2.1, z: 4.40, ry: deg(-8), y: PAD_H },
    paper: { x: -0.45, z: 4.35, ry: deg(7), y: PAD_H },
    tea: { x: 1.45, z: 4.40, ry: deg(30) },
  };
  const pad = { x: -1.3, z: 4.37, w: 3.85, d: 2.2, ry: deg(-1.5) };
  const prints = [-2.3, 0, 2.3].flatMap((x, i) => [{ x, z: back - 2.4, ry: Math.PI + deg(i % 2 ? 4 : -4) }, { x: x + 1.3, z: back - 4.2, ry: Math.PI + deg(i % 2 ? -4 : 4) }]);
  const tiles = { x: 2.45, z: 3.95 };
  const W: Frame = { x0: 0.03, x1: 0.97, y0: 0.06, y1: 0.95 };
  const P = (id: ThingId): V3 => [spots[id].x, 0, spots[id].z];
  const shots: Record<StopName, Shot> = {
    hero: { at: [0.3, 0.4, 1.4], az: -4, el: 34, w: 8.0, h: 8.4, fov: 24, frame: { x0: 0.02, x1: 0.98, y0: 0.03, y1: 0.97 } },
    about: { at: [P('mitez')[0], 0.5, P('mitez')[2]], az: -16, el: 16, w: 2.2, h: 1.7, fov: 32, frame: W },
    debate: { at: [P('watch')[0], 0.55, P('watch')[2] + 0.1], az: 12, el: 4, w: 2.0, h: 1.6, fov: 42, frame: W },
    // From above the armillary sphere, which stands in front of it here.
    skeptical: { at: [P('skeptical')[0] - 0.2, 0.75, P('skeptical')[2] + 0.7], az: 20, el: 32, w: 2.4, h: 2.4, fov: 34, frame: W },
    research: { at: [P('paper')[0], 0.1, P('paper')[2]], az: 4, el: 62, w: 1.4, h: 1.6, fov: 34, frame: W },
    work: { at: [0.6, 0.7, back - 3.3], az: 180, el: 11, w: 5.4, h: 2.6, fov: 30, frame: W },
    today: { at: [P('notepad')[0], 0.08, P('notepad')[2]], az: -6, el: 58, w: 1.4, h: 1.6, fov: 34, frame: W },
    github: { at: [P('github')[0], 0.45, P('github')[2] + 0.5], az: -18, el: 26, w: 2.6, h: 2.4, fov: 34, frame: W },
    now: { at: [P('armillary')[0], 0.7, P('armillary')[2]], az: 26, el: 8, w: 2.0, h: 2.0, fov: 34, frame: W },
    record: { at: [P('plato')[0], 0.65, P('plato')[2]], az: 30, el: 10, w: 2.0, h: 2.0, fov: 34, frame: W },
    end: { at: [0.2, 0.2, 0.6], az: -6, el: 60, w: 7.8, h: 9.0, fov: 26, frame: W },
  };
  const vias: Plan['vias'] = {
    'research>work': [{ p: [0, 8, 6], t: [0, 1, 0] }, { p: [0, 9, back - 9], t: [0, 1, back - 3] }],
    'work>today': [{ p: [-7, 4, back - 4], t: [-3, 1, back] }, { p: [-6, 3, 5], t: [-1, 0.5, 2.4] }],
  };
  void L;
  return { phone, letters, spots, pad, prints, tiles, x0: Math.min(x0, sx - 1.3), x1: Math.max(x1 + 1.3, wa / 2 + 0.6), z0: back - 5.5, z1: 6, shots, vias };
}
