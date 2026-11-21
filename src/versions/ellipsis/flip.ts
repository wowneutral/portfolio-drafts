// FLIP for a block whose height changes (the brief: animate by transform, never by height). The layout changes
// once; everything after the block slides from where it was to where it now is (transform), and the block itself is
// revealed or hidden from the bottom by an animated clip in step with it. Easing as chenglou/pretext's demo: a fast
// exponential settle.
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
export type Snap = { el: HTMLElement; top: number }[];

/** Before the change: where everything after `block` sits now. Reads only. */
export function snapshot(block: HTMLElement): Snap {
  const stop = block.closest('.v-ellipsis');
  const out: Snap = [];
  let n: Element | null = block;
  while (n && n !== stop) {
    for (let s = n.nextElementSibling; s; s = s.nextElementSibling) if (s instanceof HTMLElement) out.push({ el: s, top: s.getBoundingClientRect().top });
    n = n.parentElement;
  }
  return out;
}

/**
 * After the change is committed (in a layout effect, before paint). `d` is the new height minus the old: opening,
 * the clip starts `d` short and opens to the block's edge; closing (d < 0), the block still paints its old height
 * below its new edge and the clip closes onto that edge.
 */
export function play(block: HTMLElement, snap: Snap, d: number, dur: number) {
  const moves = snap.map(({ el, top }) => ({ el, dy: top - el.getBoundingClientRect().top })).filter((m) => Math.abs(m.dy) > 0.5);
  const s = '-40px';
  block.style.transition = 'none';
  block.style.clipPath = `inset(-12px ${s} ${d}px ${s})`;
  for (const m of moves) { m.el.style.transition = 'none'; m.el.style.transform = `translate3d(0, ${m.dy}px, 0)`; }
  void block.offsetHeight;
  const tr = `${dur}ms ${EASE}`;
  block.style.transition = `clip-path ${tr}`;
  block.style.clipPath = `inset(-12px ${s} 0px ${s})`;
  for (const m of moves) { m.el.style.transition = `transform ${tr}`; m.el.style.transform = 'translate3d(0, 0, 0)'; }
  window.setTimeout(() => {
    block.style.transition = '';
    block.style.clipPath = '';
    for (const m of moves) { m.el.style.transition = ''; m.el.style.transform = ''; }
  }, dur + 30);
}
