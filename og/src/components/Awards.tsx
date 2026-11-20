// The two WD Awards certificates under the record.
//
// When the record scrolls in they are dealt onto the page one after the
// other, overshoot a little, and settle at a slight angle, like paper pinned
// to a wall. A band of light crosses each one once it lands. On a mouse or
// trackpad, a certificate straightens, lifts, and tilts toward the pointer,
// and the light follows it. With reduced motion they simply sit there.

import { useRef, type CSSProperties, type PointerEvent } from "react";
import { AWARDS } from "../content";

type Award = (typeof AWARDS)[number];

const calm = () =>
  typeof matchMedia === "undefined" ||
  matchMedia("(prefers-reduced-motion: reduce)").matches ||
  !matchMedia("(hover: hover) and (pointer: fine)").matches;

function Card({ a, i }: { a: Award; i: number }) {
  const ref = useRef<HTMLAnchorElement>(null);

  const move = (e: PointerEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el || calm()) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    el.style.setProperty("--ry", `${((x - 0.5) * 16).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${((0.5 - y) * 12).toFixed(2)}deg`);
    el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
  };

  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.removeProperty("--rx");
    el.style.removeProperty("--ry");
    el.style.removeProperty("--mx");
  };

  return (
    <a
      ref={ref}
      className="award"
      style={{ "--i": i } as CSSProperties}
      href={a.href}
      target="_blank"
      rel="noreferrer"
      onPointerMove={move}
      onPointerLeave={leave}
      data-sfx
    >
      <span className="award-card">
        <img
          src={a.img}
          alt={`WD Awards Favourite Web Design certificate for ${a.site}, September 17, 2026`}
          width={720}
          height={1018}
          loading="lazy"
          decoding="async"
        />
      </span>
      <span className="award-site">{a.site}</span>
      <span className="award-note">{a.note}</span>
    </a>
  );
}

export default function Awards() {
  return (
    <div className="awards" data-reveal>
      {AWARDS.map((a, i) => (
        <Card key={a.site} a={a} i={i} />
      ))}
    </div>
  );
}
