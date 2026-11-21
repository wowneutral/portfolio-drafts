// The back cover. The book opened on the first mark; it ends by closing the quote: the title once more,
// and the closing mark (Newsreader's own glyph, as on the first page) dropping onto the last word.
import { useEffect, useRef } from 'react';
import { PERSON, RESEARCH, LINKS } from '@/content';
import { gsap } from '@/lib/scroll';
import { still } from '@/lib/utils';
import GLYPHS from './quotes.json';

const PAPER = RESEARCH[0];
const words = PAPER.short.split(' ');

export default function Closing() {
  const mark = useRef<SVGSVGElement>(null);
  const line = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (still) return;
    const m = mark.current!;
    gsap.set(m, { yPercent: -340, rotate: -120, opacity: 0 });
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      gsap.timeline()
        .to(m, { opacity: 1, duration: 0.15 })
        .to(m, { yPercent: 0, duration: 0.75, ease: 'power3.in' }, 0)
        .to(m, { rotate: -24, duration: 0.75, ease: 'power2.in' }, 0)
        .to(m, { rotate: 0, duration: 1.1, ease: 'elastic.out(1, 0.45)' }, 0.75);
    }, { threshold: 0.6 });
    io.observe(line.current!);
    return () => io.disconnect();
  }, []);

  const knock = () => {
    if (still) return;
    gsap.fromTo(mark.current, { rotate: 0 }, { rotate: 360, duration: 1.4, ease: 'elastic.out(1, 0.5)', overwrite: true });
  };

  return (
    <section className="backcover" id="contact" aria-labelledby="contact-h">
      <div className="bc-inner">
        <h2 id="contact-h" className="sec">Contact</h2>
        <ul className="contact">
          {LINKS.map((l) => (
            <li key={l.label}>
              <span className="ct-l">{l.label}</span>
              {l.href ? <a className="ct-v" href={l.href} rel={l.href.startsWith('http') ? 'noopener' : undefined}>{l.value}</a> : <span className="ct-v">{l.value}</span>}
            </li>
          ))}
        </ul>
      </div>
      <div className="end">
        <p className="end-title" ref={line} lang="en">
          <span className="end-first">{words.slice(0, -1).join(' ')}</span>{' '}
          <span className="end-last">{words[words.length - 1]}<button type="button" className="end-mark" aria-label="Knock the closing quotation mark" onClick={knock}>
            <svg ref={mark} viewBox="457 -684 326.5 253" aria-hidden="true" focusable="false"><path d={GLYPHS.glyphs[1].d} /></svg>
          </button></span>
        </p>
        <div className="end-foot">
          <p className="end-by">{PERSON.short.join(' ')} {PERSON.name}.</p>
          <a className="go" href="#title">Back to the first page</a>
        </div>
      </div>
    </section>
  );
}
