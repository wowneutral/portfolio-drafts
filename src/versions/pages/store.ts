// What the page and the scene share. Mutable on purpose: read inside useFrame, never in React state.
export type Cam = 'hero' | 'about' | 'today' | 'now' | 'research' | 'github' | 'record' | 'contact';

export const S = {
  cam: 'hero' as Cam,
  fold: 0, // 0 = the stair, 1 = one flat stack (scrubbed by the Contact section)
  intro: 1, // the stack unfolds into the stair on arrival
  hover: -1, // sheet index under the pointer or the folio row
  focus: -1, // sheet index with keyboard focus
  open: -1, // sheet index in the reading position
  cx: 0, // where the stair's centre sits on screen, in px
  cy: 0,
  fit: 1, // multiplier on camera distance (phones stand further back)
  phone: false,
  visible: true,
  still: false,
  pick: null as null | ((i: number) => void),
  point: null as null | ((i: number) => void),
};

export const COUNT = 15;
/** Sheet index (0 at the floor) to page number (1 at the top). */
export const pageOf = (i: number) => COUNT - i;
export const sheetOf = (n: number) => COUNT - n;
