// The paper's one image, set as type: three rungs, climbed from Sextus up to the Tractatus.
// Once you are past the top, the rails and rungs are thrown away; the words you climbed stay where they are.
import { useRef } from 'react';
import { RESEARCH } from '@/content';
import { gsap, useGSAP } from '@/lib/scroll';
import { still } from '@/lib/utils';

const LADDERS = RESEARCH[0].ladders!;

export default function Ladder() {
  const fig = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (still) return;
    gsap.fromTo(frame.current, { rotate: 0, xPercent: 0, yPercent: 0, opacity: 1 }, {
      rotate: 16, xPercent: 18, yPercent: 26, opacity: 0, ease: 'power2.in',
      scrollTrigger: { trigger: fig.current, start: 'bottom 62%', end: 'bottom 8%', scrub: 0.6 },
    });
  }, { scope: fig });

  return (
    <figure className="ladder" ref={fig}>
      <figcaption className="sub">The three ladders</figcaption>
      <div className="ld-body">
        <div className="ld-frame" ref={frame} aria-hidden="true">
          <span className="ld-rail" /><span className="ld-rail r" />
          {LADDERS.map((l) => <span className="ld-rung" key={l.who} />)}
        </div>
        <ol className="ld-rungs">
          {LADDERS.map((l) => (
            <li key={l.who}>
              <p className="ld-when">{l.when.startsWith('about ') ? <><span className="ld-about">about</span> {l.when.slice(6)}</> : l.when}</p>
              <div className="ld-text">
                <p className="ld-who">{l.who}</p>
                <p className="ld-where">{l.where}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </figure>
  );
}
