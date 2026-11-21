// Shared, mutable state between the page and the stage. Never drives React renders.
export type StopName = 'open' | 'about' | 'debate' | 'work' | 'research' | 'today' | 'record' | 'contact';

export const st = {
  stop: 'open' as StopName,
  /** 0: paint rests and the pointer wipes it. 1: the photograph rests and the pointer lays paint. */
  swap: 0,
  /** At Contact the strokes stay where they are. */
  keep: false,
  /** Where the apple sits on screen, as fractions of the viewport (phone: follows the open window). */
  cx: 0.28,
  cy: 0.5,
  phone: false,
  /** Queued pointer segments in screen uv: [ax, ay, bx, by]. */
  segs: [] as number[][],
  lastPaint: -10,
  /** Request one stroke across the apple, by itself. */
  autoAt: -1,
  /** For rendering the stills: -1 normal, 0 all paint, 1 all photograph. */
  force: -1,
  ready: false,
};

export function queueSeg(ax: number, ay: number, bx: number, by: number) {
  if (st.segs.length > 24) st.segs.shift();
  st.segs.push([ax, ay, bx, by]);
}
