// Shared, non-React state between the page and the ring: section marks in page
// pixels (measured on resize) and the card that the pointer, a tap or keyboard focus lifts.
export const marks = { heroEnd: 800, workStart: 4000, workEnd: 6000, foldStart: 9000, foldEnd: 10000, colRight: 0, phone: false };
export const lift = { focus: -1, wave: -1e9 };
/** Riffle the ring once, like a thumb running round a deck. */
export const riffle = () => { lift.wave = performance.now(); };
