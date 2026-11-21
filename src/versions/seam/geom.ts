// Sizes shared by the page and the 3D mark (kept apart so the page does not load three.js early).
/** The mark is HEIGHT world units tall and stands on a floor at FLOOR, seen by a 50 degree camera at 1.1. */
export const HEIGHT = 0.5;
export const FLOOR = -0.34;
export const VIEW_H = 2 * 1.1 * Math.tan((25 * Math.PI) / 180);
