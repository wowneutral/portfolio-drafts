// Shared between the page (DOM) and the scene. Mutated, never rendered from.
export const S = {
  /** half turns the visitor has added by hand (multiples of PI once released) */
  user: 0,
  userTo: 0,
  dragging: false,
  /** the user has turned it since the last section change: sand runs by gravity */
  free: true,
  /** fraction of the day left since the latest note (0..1) */
  todayTop: 0.5,
  stripes: 4,
  active: -1,
  onStripe: (_i: number) => {},
  /** set by the scene: pick a stripe at a client point, -1 if none */
  pick: (_x: number, _y: number) => -1,
};
