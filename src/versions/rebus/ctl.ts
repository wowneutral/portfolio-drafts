export type Kind = 'watch' | 'stopped' | 'plato' | 'apple' | 'tea' | 'armillary';

/** Mutable per-window state, read by the scene every frame (never React state per frame). */
export type Ctl = {
  yaw: number; vel: number; drag: boolean;
  /** Set once, the first time the window's sentence reaches the middle of the screen. */
  act: number;
  t: number; theta: number; omega: number; settled: boolean;
  present: boolean; still: boolean;
  /** Pointer over the window, -1 to 1 across it; the object turns a little toward it. */
  hx: number; look: number;
};

export const makeCtl = (still: boolean): Ctl => ({ yaw: 0, vel: 0, drag: false, act: 0, t: 0, theta: 0, omega: 0.5, settled: false, present: true, still, hx: 0, look: 0 });
