// What the page tells the 3D mark each frame (no React state per frame).
export const mark = {
  /** -1..1: where the seam has slid to, as a share of its full travel. */
  lean: 0,
  /** Standing on a floor in the page (true) or floating in the channel. */
  land: false,
  /** A knock to apply on the next frame, signed. */
  kick: 0,
  /** Target scale (phone: 0 when no slot is on screen). */
  show: 1,
  /** Snap the scale to zero so it pops in at a new slot. */
  pop: false,
};
