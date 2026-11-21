// What the page and the scene tell each other: plain mutable state, read every frame, never a React render.
export const stage = {
  /** Page Y of the top of each camera stop (measured by the page). */
  tops: [] as number[],
  /** Where the camera is among the stops: raw from the scroll, and with weight on it. */
  raw: 0,
  f: 0,
  /** Honour indexes the page asks the scene to knock (0 is the top bar). */
  cmds: [] as number[],
  /** One initial per recent commit (or per repo when GitHub is quiet). */
  bits: [] as string[],
  phone: false,
  /** Set by the canvas: draw another frame. */
  invalidate: null as null | (() => void),
};
export const wake = () => stage.invalidate?.();
