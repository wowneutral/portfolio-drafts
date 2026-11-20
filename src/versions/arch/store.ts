// What the page and the scene tell each other: plain mutable state, read every frame.
export type ArchState = 'standing' | 'out' | 'return';

type Listener = (s: ArchState) => void;

export const store = {
  state: 'standing' as ArchState,
  /** Commands from the page: pull the keystone, put it back. */
  cmds: [] as ('pull' | 'back')[],
  /** Section anchors, measured from the page: [top, bottom] in document px, and the camera stop each one asks for. */
  anchors: [] as { a: number; b: number; stop: string }[],
  /** The stop the camera is nearest to, for the scene's own cues (the small arch builds when you reach it). */
  current: '',
  /** Recent commits make stones in the small arch; null until GitHub answers or fails. */
  commits: 9,
  /** Latest note's date, cut under the keystone. */
  date: '',
  dirty: 8,
  shake: 0,
  listeners: new Set<Listener>(),
  set(s: ArchState) {
    if (store.state === s) return;
    store.state = s;
    store.listeners.forEach((f) => f(s));
  },
};

export function resetStore() {
  store.state = 'standing'; store.cmds = []; store.anchors = []; store.current = ''; store.dirty = 8; store.shake = 0;
}
