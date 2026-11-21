// The chronograph's state, shared by the column (the Start button, the readout) and the stage (the hands).
// Mutable and read per frame; the button subscribes to changes.
export type Mode = 'time' | 'run' | 'held';
export const chrono = { mode: 'time' as Mode, t0: 0, held: 0, auto: false, section: 'top' };
const subs = new Set<() => void>();
export const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const emit = () => subs.forEach((f) => f());
export const elapsed = () => (chrono.mode === 'run' ? performance.now() - chrono.t0 : chrono.mode === 'held' ? chrono.held : 0);
export function toggle() {
  if (chrono.mode === 'run') { chrono.held = performance.now() - chrono.t0; chrono.mode = 'held'; }
  else { chrono.t0 = performance.now(); chrono.mode = 'run'; }
  emit();
}
export function start() { if (chrono.mode !== 'run') toggle(); }
export const getMode = () => chrono.mode;
/** 0:07.4 style, for the readout and the label on the glass. */
export function fmt(ms: number) {
  const s = ms / 1000, m = Math.floor(s / 60), r = s - m * 60;
  return `${m}:${r < 10 ? '0' : ''}${r.toFixed(1)}`;
}

/** Where the camera film is: blending view a into view b by k, inside section `id`. Written by the page, read per frame by the stage. */
export const film = { a: 'open', b: 'open', k: 0, id: 'top' };
