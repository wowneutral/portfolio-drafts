// The deck. Every composition here was set by hand; the hash only picks from it.
export type Band = 't' | 'm' | 'b';
export type Slot = { band: Band; c: number; s: number };
export type Place = { name: Slot; lines: 1 | 2; note: Slot; colo: Slot };

const P = (band: Band, c: number, s: number, lines: 1 | 2, note: [Band, number, number], colo: [Band, number, number]): Place => ({
  name: { band, c, s }, lines,
  note: { band: note[0], c: note[1], s: note[2] },
  colo: { band: colo[0], c: colo[1], s: colo[2] },
});

/** Sixteen placements of the name on a twelve column sheet, each with its own place for the note and the colophon. */
export const PLACES: Place[] = [
  P('t', 1, 12, 1, ['b', 8, 5], ['b', 1, 4]),
  P('t', 1, 7, 2, ['t', 9, 4], ['b', 1, 5]),
  P('t', 6, 7, 2, ['t', 1, 4], ['b', 9, 4]),
  P('t', 4, 9, 1, ['b', 1, 5], ['b', 9, 4]),
  P('m', 1, 12, 1, ['t', 8, 5], ['b', 1, 4]),
  P('m', 1, 8, 2, ['m', 9, 4], ['t', 1, 4]),
  P('m', 5, 8, 2, ['m', 1, 4], ['b', 9, 4]),
  P('m', 3, 10, 1, ['t', 1, 5], ['b', 9, 4]),
  P('b', 1, 12, 1, ['t', 8, 5], ['t', 1, 4]),
  P('b', 1, 7, 2, ['b', 9, 4], ['t', 1, 4]),
  P('b', 6, 7, 2, ['b', 1, 4], ['t', 9, 4]),
  P('b', 1, 9, 1, ['t', 1, 5], ['m', 10, 3]),
  P('t', 1, 10, 1, ['m', 7, 6], ['b', 1, 4]),
  P('m', 1, 10, 1, ['b', 7, 6], ['t', 9, 4]),
  P('b', 3, 10, 1, ['t', 1, 5], ['t', 9, 4]),
  P('t', 2, 11, 1, ['b', 6, 6], ['b', 1, 4]),
];

export const RATIOS = [1.25, 4 / 3, 1.5] as const;
export const RATIO_NAMES = ['major third', 'perfect fourth', 'perfect fifth'] as const;
export const GRIDS = ['a', 'b', 'c'] as const;
export type Lead = 'debate' | 'work' | 'research' | 'log';
export const LEADS: Lead[] = ['debate', 'work', 'research', 'log'];

export type Layout = { seed: string; place: number; v: boolean; ratio: number; grid: (typeof GRIDS)[number]; lead: Lead };

export function decode(seed: string): Layout {
  const n = parseInt(seed.slice(0, 7), 16) || 0;
  return {
    seed,
    place: n & 15,
    v: ((n >> 4) & 1) === 1,
    ratio: (n >> 5) % 3,
    grid: GRIDS[(n >> 8) % 3],
    lead: LEADS[(n >> 11) % 4],
  };
}

/** Seven hex characters from any string (FNV-1a), for days without a commit. */
export function fnv(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 7);
}

/** The sha's first seven characters, from a commit URL. */
export const shaOf = (href: string) => (href.split('/commit/')[1] ?? '').slice(0, 7).toLowerCase();
