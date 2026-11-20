// The little bit of state the page and the glass share, outside React so the scene never re-renders per frame.
export type Stream = { repo: string; x: number; z: number; rate: number };

export const F = {
  /** repo whose streams are lit (from a row, or from the pointer over the glass) */
  lit: '' as string,
  /** which championship stream is held lit from the page (-1 none) */
  win: -1,
  /** bursts waiting to be released */
  bursts: 0,
  /** keyboard slosh impulses */
  nudge: 0,
  /** called by the scene when the pointer picks a stream */
  onLit: (_repo: string) => {},
};

// Glass dimensions, shared by the scene and the still drawing.
export const G = {
  base: 0.62, // top of the heavy glass base
  rIn: 0.9, // inner radius at the base
  rTop: 0.98, // inner radius at the rim
  h: 3.7, // overall height
  level: 3.12, // water line (full pour)
};

export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

/** Where a repo's bubbles are born on the base: the same place every visit. */
export function nucleus(repo: string) {
  const a = hash(repo) * Math.PI * 2;
  const r = 0.18 + hash(repo + '/r') * 0.5;
  return { x: Math.cos(a) * r, z: Math.sin(a) * r };
}
