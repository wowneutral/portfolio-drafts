// Shared, mutable state between the page and the ring. Read inside useFrame; never a React render per frame.
export const ring = {
  span: 1, // px of scroll over which the ring makes one full turn
  spin: 0, // radians added by dragging or swiping
  hover: -1, // card under the pointer
  focus: -1, // card whose DOM link has focus or hover
  bring: -1, // card to turn to the front (set by a focused link)
  front: 0, // card nearest the viewer
  dragged: false,
  onFront: null as null | ((i: number) => void),
  onPick: null as null | ((i: number) => void),
};
