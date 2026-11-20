// The floor plan: where each letter of ARMAAN SETH. stands, where the date
// numerals and the commit letters land, and the ten camera positions the
// scroll moves between. One row on a wide screen, two rows on a phone.
import { DEPTH, letter, type Outline } from './geo';

export const NAME = 'ARMAAN SETH.';
export const STOPS = ['hero', 'about', 'debate', 'research', 'work', 'today', 'github', 'now', 'record', 'end'] as const;
export type StopName = (typeof STOPS)[number];
export const stopIndex = (n: StopName) => STOPS.indexOf(n);

export type V3 = [number, number, number];
export type Frame = { x0: number; x1: number; y0: number; y1: number };
/** A camera position as a photographer would say it: what it looks at, from where (az, el in degrees), how much must fit (w by h metres), the lens, and where on screen. */
export type Shot = { at: V3; az: number; el: number; w: number; h: number; fov: number; frame: Frame; up?: V3 };
export type Via = { p: V3; t: V3 };
export type Home = { ch: string; o: Outline; x: number; y: number; z: number };

export const NUM = { cap: 1.55, depth: 0.5 };
export const BIT = { cap: 0.5, depth: 0.2, pitch: 0.52, row: 0.78, per: 6 };

export type Plan = {
  phone: boolean;
  letters: Home[];
  /** Where the two date numerals stand (their left edge) and the first commit letter. */
  nums: { x: number; z: number };
  bits: { x: number; z: number };
  cx: number; x0: number; x1: number;
  shots: Record<StopName, Shot>;
  vias: Partial<Record<string, Via[]>>;
};

const TRACK = 0.12, SPACE = 0.7;

function row(text: string, x0: number, z: number, out: Home[]): number {
  let pen = x0;
  for (const ch of text) {
    if (ch === ' ') { pen += SPACE; continue; }
    const o = letter(ch);
    out.push({ ch, o, x: pen + o.adv / 2, y: o.h / 2, z });
    pen += o.adv + (ch === 'H' ? 0.04 : TRACK);
  }
  return pen - TRACK;
}
const width = (t: string) => t.split('').reduce((s, ch) => s + (ch === ' ' ? SPACE : letter(ch).adv + TRACK), 0) - TRACK;

export function makePlan(phone: boolean): Plan {
  const letters: Home[] = [];
  if (!phone) {
    const w = width(NAME), x0 = -w / 2, x1 = row(NAME, x0, 0, letters);
    const cx = 0;
    const L = (i: number) => letters[i];
    const nums = { x: x1 + 1.3, z: 1.1 };
    const bits = { x: x1 + 5.2, z: -0.4 };
    const R: Frame = { x0: 0.47, x1: 0.985, y0: 0.07, y1: 0.95 };
    const numW = 2 * 0.62 * NUM.cap;
    const shots: Record<StopName, Shot> = {
      hero: { at: [cx, 1.02, 0], az: -8, el: 6, w: w + 0.7, h: 2.5, fov: 15, frame: { x0: 0.05, x1: 0.95, y0: 0.18, y1: 0.7 } },
      // Close on the first A, from the left, the rest of the name running away.
      about: { at: [L(0).x + 0.9, 1.1, 0], az: -42, el: 5, w: 3.4, h: 2.6, fov: 30, frame: R },
      // Down on the floor in front of the R, looking up: the monument.
      debate: { at: [L(1).x + 0.15, 1.6, DEPTH / 2], az: 12, el: -18, w: 1.5, h: 3.0, fov: 50, frame: R },
      // Close on the second A: its counter is a window.
      research: { at: [L(3).x, 1.02, DEPTH / 2], az: 6, el: 2, w: 1.35, h: 1.9, fov: 30, frame: R },
      // Behind the name, looking back along it.
      work: { at: [cx + 1.2, 1.0, 0], az: 156, el: 9, w: 8.2, h: 3.0, fov: 26, frame: R },
      today: { at: [nums.x + numW / 2 - 0.6, 0.95, nums.z - 0.4], az: -24, el: 9, w: 4.3, h: 2.4, fov: 26, frame: R },
      github: { at: [bits.x + (BIT.per - 1) * BIT.pitch / 2, 0.25, bits.z - 1.1], az: -26, el: 26, w: 3.4, h: 2.6, fov: 30, frame: R },
      now: { at: [L(6).x, 1.05, 0], az: 34, el: 5, w: 3.1, h: 2.6, fov: 30, frame: R },
      record: { at: [L(8).x, 1.0, 0], az: -48, el: 14, w: 3.4, h: 2.7, fov: 26, frame: R },
      end: { at: [cx, 0.3, -0.3], az: -4, el: 58, w: w + 1.6, h: 4.2, fov: 20, frame: { x0: 0.04, x1: 0.96, y0: 0.04, y1: 0.52 } },
    };
    const vias: Plan['vias'] = {
      // Up and over the name to its back.
      'research>work': [{ p: [L(3).x + 1, 5.5, 4], t: [L(3).x, 1, 0] }, { p: [cx + 2, 8, -4], t: [cx, 1, 0] }],
      // Round the far end and out to the front again.
      'work>today': [{ p: [x1 + 5, 3.5, -6], t: [x1, 1, 0] }, { p: [x1 + 6.5, 2.5, 3], t: [nums.x, 1, nums.z] }],
    };
    return { phone, letters, nums, bits, cx, x0, x1, shots, vias };
  }

  // Phone: ARMAAN behind, SETH. in front, seen through a band at the top of the screen.
  const back = -3.9;
  const wa = width('ARMAAN'), ws = width('SETH.');
  row('ARMAAN', -wa / 2, back, letters);
  const x1 = row('SETH.', wa / 2 - ws, 0, letters);
  const x0 = -wa / 2, cx = 0;
  const L = (i: number) => letters[i];
  const nums = { x: x1 + 0.9, z: 1.3 };
  const bits = { x: -wa / 2 + 0.2, z: 2.4 };
  const W: Frame = { x0: 0.03, x1: 0.97, y0: 0.06, y1: 0.95 };
  const numW = 2 * 0.62 * NUM.cap;
  const shots: Record<StopName, Shot> = {
    hero: { at: [cx, 0.9, back / 2], az: -4, el: 33, w: wa + 0.6, h: 4.4, fov: 22, frame: { x0: 0.03, x1: 0.97, y0: 0.08, y1: 0.95 } },
    about: { at: [L(2).x, 1.0, back], az: -30, el: 34, w: 3.4, h: 2.8, fov: 36, frame: W },
    debate: { at: [L(1).x, 1.5, back + DEPTH / 2], az: 2, el: -14, w: 2.3, h: 3.2, fov: 50, frame: W },
    research: { at: [L(0).x, 1.02, back + DEPTH / 2], az: -8, el: 3, w: 1.6, h: 2.0, fov: 34, frame: W },
    work: { at: [cx, 1.0, back / 2], az: 160, el: 14, w: wa + 1, h: 4.5, fov: 30, frame: W },
    today: { at: [nums.x + numW / 2 - 0.7, 0.9, nums.z - 0.2], az: -20, el: 14, w: 3.8, h: 2.6, fov: 34, frame: W },
    github: { at: [bits.x + (BIT.per - 1) * BIT.pitch / 2, 0.2, bits.z + 0.3], az: -18, el: 34, w: 3.2, h: 2.4, fov: 36, frame: W },
    now: { at: [L(6).x, 1.0, 0], az: 32, el: 8, w: 3.0, h: 2.6, fov: 36, frame: W },
    record: { at: [L(8).x, 1.0, 0], az: -46, el: 16, w: 3.2, h: 2.7, fov: 32, frame: W },
    end: { at: [cx, 0.3, back / 2], az: -4, el: 60, w: wa + 1.4, h: 6.6, fov: 26, frame: W },
  };
  const vias: Plan['vias'] = {
    'research>work': [{ p: [L(0).x - 1, 5.5, back + 4], t: [L(0).x, 1, back] }, { p: [cx + 1, 9, back - 4], t: [cx, 1, back / 2] }],
    'work>today': [{ p: [x1 + 5, 3.5, back - 5], t: [x1, 1, 0] }, { p: [x1 + 5, 2.5, 4], t: [nums.x, 1, nums.z] }],
  };
  return { phone, letters, nums, bits, cx, x0, x1, shots, vias };
}
