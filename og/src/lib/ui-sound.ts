// Interface sound, by delegation.
//
// Two listeners on the document rather than handlers on every control: the
// buttons and links on this site are created in half a dozen places, and
// delegation means anything added later is covered without being told.
//
// Only [data-sfx] elements and links — headings, cards and body copy stay
// silent. Sound on everything is what makes a site rattle.

import { hover, click } from "./sound";

const SELECTOR = "[data-sfx], .loader-btn, .project, .door-links a, .journey-chapter a";

export function attachUiSound() {
  const onOver = (e: PointerEvent) => {
    const t = e.target as Element | null;
    const el = t?.closest?.(SELECTOR);
    if (!el) return;
    // pointerover fires again for every child inside the control; ignoring
    // moves that stay within the same element is what stops one hover
    // making three sounds.
    if (el.contains(e.relatedTarget as Node)) return;
    hover();
  };
  const onClick = (e: MouseEvent) => {
    if ((e.target as Element | null)?.closest?.(SELECTOR)) click();
  };
  document.addEventListener("pointerover", onOver, { passive: true });
  document.addEventListener("click", onClick, { passive: true });
  return () => {
    document.removeEventListener("pointerover", onOver);
    document.removeEventListener("click", onClick);
  };
}
