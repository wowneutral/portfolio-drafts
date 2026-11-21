// Shared between the page, the stage and the debate set piece.
export const BG = '#d6d5cf';

/** The pointer across the whole window, -1 to 1, so the tilt answers the paragraph too. */
export const ptr = { x: 0, y: 0 };
if (typeof window !== 'undefined') window.addEventListener('pointermove', (e) => { ptr.x = (e.clientX / window.innerWidth) * 2 - 1; ptr.y = -((e.clientY / window.innerHeight) * 2 - 1); }, { passive: true });
