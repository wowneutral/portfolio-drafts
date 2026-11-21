// What the page tells the stage, read inside useFrame (never React state per frame).
export const S = {
  /** Which window is open: 0 Debater, 1 Researcher, 2 Builder, -1 none. */
  open: -1,
  /** How far through each room the visitor has read, 0 to 1. Kept after leaving, so each window holds its last view. */
  t: [0, 0, 0],
  /** The project in the Builder panel nearest the middle of the screen. */
  work: 0,
  /** The card under the pointer or keyboard focus. */
  hover: -1,
  /** The cards stand in a straight row at the end. */
  end: false,
  /** The element the middle card is fitted to when no window is open. */
  fit: null as HTMLElement | null,
  /** Width of the solid reading panel, in CSS pixels (desktop). */
  panel: 0,
  phone: false,
  px: 0,
  py: 0,
};

export const ROOMS = ['debater', 'researcher', 'builder'] as const;
export const FACES = ['#e3cfae', '#e7e4dc', '#d1d0c8'] as const;
