// What the page and the scene tell each other. Plain mutable state read every frame.
export type Cmd = { type: 'key'; ch: string };

export const stage = {
  go: false,
  opened: false,
  onOpened: null as null | (() => void),
  /** Where the scroll is among the stops, raw and with the camera's weight on it. */
  raw: 0,
  f: 0,
  stops: [] as { a: number; b: number }[],
  /** Where on screen the reading line sits (fraction of the window height). */
  read: 0.5,
  cmds: [] as Cmd[],
  /** The day of the latest note, as two characters, and one letter per recent commit. */
  day: '',
  bits: [] as string[],
  shake: 0,
  over: false,
  wake: 0,
  dirty: 0,
};

export function resetStage() {
  stage.go = false; stage.opened = false; stage.raw = 0; stage.f = 0; stage.stops = [];
  stage.cmds = []; stage.shake = 0; stage.over = false; stage.wake = 180; stage.dirty = 4;
}
