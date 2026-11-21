// Work as the book's plates. Desktop: the captions scroll by in the left column while one tipped-in plate
// on the right is turned for each project. Phone: the plates are a row of pages you swipe through.
import { useEffect, useRef, useState } from 'react';
import { WORK } from '@/content';

const BASE = import.meta.env.BASE_URL;

export default function Plates() {
  const [act, setAct] = useState(0);
  const list = useRef<HTMLOListElement>(null);

  // Desktop: the caption crossing the middle of the screen chooses the plate.
  useEffect(() => {
    const items = [...list.current!.children] as HTMLElement[];
    const io = new IntersectionObserver((es) => {
      if (window.innerWidth <= 820) return;
      for (const e of es) if (e.isIntersecting) setAct(+(e.target as HTMLElement).dataset.i!);
    }, { rootMargin: '-50% 0px -50% 0px' });
    items.forEach((el) => io.observe(el));
    // Phone: the page that is most in view of the swipe row.
    const track = list.current!;
    const onScroll = () => {
      if (window.innerWidth > 820) return;
      const w = items[0].getBoundingClientRect().width + 14;
      setAct(Math.max(0, Math.min(items.length - 1, Math.round(track.scrollLeft / w))));
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => { io.disconnect(); track.removeEventListener('scroll', onScroll); };
  }, []);

  const go = (i: number) => {
    const track = list.current!, el = track.children[i] as HTMLElement;
    track.scrollTo({ left: el.offsetLeft - track.offsetLeft - 16, behavior: 'smooth' });
  };

  return (
    <section className="work" id="work" aria-labelledby="work-h">
      <header className="work-head">
        <h2 id="work-h" className="sec">Work</h2>
        <p className="work-sub">The plates</p>
      </header>
      <div className="plates">
        <ol className="plate-list" ref={list} data-allow-overflow>
          {WORK.map((w, i) => (
            <li key={w.slug} className={i === act ? 'pl on' : 'pl'} data-i={i} aria-labelledby={`w-${w.slug}`}>
              <div className="pl-img"><img src={BASE + w.img} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={660} /></div>
              <p className="pl-n"><span>Plate</span> {w.n}</p>
              <h3 id={`w-${w.slug}`}>{w.name}</h3>
              <p className="pl-kind">{w.kind}</p>
              <p className="pl-line">{w.line}</p>
              <p className="pl-stack">{w.stack}</p>
              {w.href ? <a className="go" href={w.href} rel="noopener">{w.href.replace(/^https:\/\//, '').replace(/\/$/, '')}</a> : <p className="plate-private">No public link</p>}
            </li>
          ))}
        </ol>
        <div className="plate-stage" aria-hidden="true">
          <div className="ps-frame">
            {WORK.map((w, i) => (
              <figure key={w.slug} className={i === act ? 'ps on' : i < act ? 'ps past' : 'ps'}>
                <img src={BASE + w.img} alt="" loading={i < 2 ? 'eager' : 'lazy'} width={1200} height={660} />
              </figure>
            ))}
          </div>
          <p className="ps-cap"><span className="ps-n">Plate {WORK[act].n}</span>{WORK[act].name}<span className="ps-folio">{13 + act}</span></p>
        </div>
      </div>
      <div className="pl-pages" role="group" aria-label="Plates">
        {WORK.map((w, i) => (
          <button key={w.slug} type="button" className={i === act ? 'on' : undefined} aria-current={i === act ? 'true' : undefined} aria-label={`Plate ${w.n}, ${w.name}`} onClick={() => go(i)}>{w.n}</button>
        ))}
      </div>
    </section>
  );
}
