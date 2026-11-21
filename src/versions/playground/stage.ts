// Base: src/versions/letters/stage.ts (draft 2). What the page and the scene tell each other. Plain mutable state read every frame.

export type Cmd = { type: 'key'; ch: string } | { type: 'poke'; id: string };

/** What the page knows that the objects print on themselves. */
export type Print = {
  /** Newest note: its date as "20 NOV", the year, and its opening words. Empty date means no note yet. */
  note: { day: string; year: string; lines: string; loaded: boolean };
  /** The GitHub block's engraved number and what it counts. */
  gh: { n: string; label: string };
  /** One character per recent commit (or per repo, offline). */
  tiles: string[];
};

export const stage = {
  go: false,
  opened: false,
  onOpened: null as null | (() => void),
  raw: 0,
  f: 0,
  stops: [] as { a: number; b: number }[],
  /** Progress through the current hold (0 to 1), for the walk along the prints. */
  hold: 0,
  read: 0.5,
  cmds: [] as Cmd[],
  print: { note: { day: '', year: '', lines: '', loaded: false }, gh: { n: '', label: '' }, tiles: [] } as Print,
  /** Bumped whenever print changes, so the textures redraw. */
  printV: 0,
  /** The thing under the pointer or keyboard focus. */
  hover: null as string | null,
  /** The transparent links laid over each thing, moved every frame. */
  links: new Map<string, HTMLElement>(),
  tag: null as HTMLElement | null,
  /** The apple on the Skeptical stop: none yet, falling, or gone. */
  apple: 'none' as 'none' | 'falling' | 'gone',
  onApple: null as null | ((s: 'falling' | 'gone') => void),
  /** The last press travelled: a drag, so the link under it must not open. */
  dragged: false,
  shake: 0,
  over: false,
  wake: 0,
  dirty: 0,
};

export function resetStage() {
  stage.go = false; stage.opened = false; stage.raw = 0; stage.f = 0; stage.stops = []; stage.hold = 0;
  stage.cmds = []; stage.shake = 0; stage.over = false; stage.wake = 180; stage.dirty = 4; stage.hover = null;
}
