// The second half of the pile: the work dropped as prints onto a table, the record hung up tag by tag,
// and one last tag at the end that swings on its string with the scroll.
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { AWARDS, HONORS, LINKS, STATS, WORK } from '@/content';
import { scroll } from '@/lib/scroll';
import { clamp, still } from '@/lib/utils';

const src = (p: string) => import.meta.env.BASE_URL + p;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const split = (what: string) => {
  const i = what.indexOf(', ');
  return i < 0 ? [what, ''] : [what.slice(0, i), what.slice(i + 2)];
};

const Out = ({ href, children, className = 'pl-link' }: { href: string; children: React.ReactNode; className?: string }) => (
  <a className={className} href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">
    {children}
    <ArrowUpRight aria-hidden="true" className="pl-arrow" size={18} strokeWidth={2.25} />
  </a>
);

// Where each print comes to rest on the table: offset x, offset y (percent of the print), tilt in degrees.
const LAND: [number, number, number][] = [
  [-5, -6, -4], [6, 4, 3.5], [-7, 7, -2], [5, -7, 5.5], [-3, 2, 2.5], [8, -1, -5], [-6, -3, 1.5], [2, 3, -1],
];
const SWAY = [-1.6, 1.4, -1.2, 1.8, -2, 1.1, -1.4, 2];

/* ---------- Work: every screenshot is a print, dropped onto the table as its project comes up ---------- */
export function WorkPile() {
  const list = useRef<HTMLOListElement>(null);
  const [on, setOn] = useState(0);

  useEffect(() => {
    const ol = list.current;
    if (!ol) return;
    const items = [...ol.querySelectorAll<HTMLElement>(':scope > li')];
    const phone = () => window.matchMedia('(max-width: 760px)').matches;
    let io: IntersectionObserver | null = null;
    const wire = () => {
      io?.disconnect();
      // Desktop: a band across the middle of the screen picks the project. Phone: the card centred in the swipe row.
      io = phone()
        ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setOn(+(e.target as HTMLElement).dataset.i!); }), { root: ol, threshold: 0.6 })
        : new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setOn(+(e.target as HTMLElement).dataset.i!); }), { rootMargin: '-48% 0px -48% 0px' });
      items.forEach((li) => io!.observe(li));
    };
    wire();
    const mq = window.matchMedia('(max-width: 760px)');
    mq.addEventListener('change', wire);
    return () => { io?.disconnect(); mq.removeEventListener('change', wire); };
  }, []);

  return (
    <div className="pl-desk">
      <div className="pl-table" aria-hidden="true">
        {WORK.map((w, i) => (
          <div
            key={w.slug}
            className={'pl-print' + (i <= on ? ' is-down' : '') + (i === on ? ' is-top' : '')}
            style={{ ['--x' as string]: LAND[i][0] + '%', ['--y' as string]: LAND[i][1] + '%', ['--r' as string]: LAND[i][2] + 'deg', zIndex: i + 1 }}
          >
            <img src={src(w.img)} alt="" loading="lazy" width={1200} height={750} />
          </div>
        ))}
      </div>
      <p className="pl-swipe">Swipe through the work.</p>
      <ol className="pl-works" ref={list} data-allow-overflow="">
        {WORK.map((w, i) => (
          <li key={w.slug} data-i={i} className={'pl-wk' + (i === on ? ' is-on' : '')} style={{ ['--r' as string]: SWAY[i] + 'deg' }}>
            <figure className="pl-wk-print">
              <img src={src(w.img)} alt={`Screenshot of ${w.name}`} loading="lazy" width={1200} height={750} />
            </figure>
            <div className="pl-wk-text">
              <p className="pl-wk-kind">{w.kind}</p>
              <h3 className="pl-wk-name"><span className="pl-hole" />{w.name}</h3>
              <p className="pl-row-line">{w.line}</p>
              <p className="pl-meta">{w.stack}</p>
              {w.href ? <Out href={w.href}>{host(w.href)}</Out> : <p className="pl-meta pl-nolink">No public link.</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------- Record: the pile, picked up and hung on a rail in order ---------- */
const HANG = [-1, 1.1, -1.2, 0.9, -0.8, 1.2, -1.1, 0.8, -0.9, 1];

export function HungRecord() {
  return (
    <>
      <ol className="pl-hang">
        {HONORS.map((h, i) => {
          const [head, rest] = split(h.what);
          return (
            <li key={h.what} className={h.what.startsWith('Champion') ? 'is-red' : ''}>
              <div className="pl-htag" style={{ ['--t' as string]: HANG[i] + 'deg' }}>
                <span className="pl-hole" />
                <span className="pl-ht-head">{head}</span>
                {rest && <span className="pl-ht-rest">{rest}</span>}
                <span className="pl-ht-det">{h.detail}</span>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="pl-rec-foot">
        <ul className="pl-certs">
          {AWARDS.map((a, i) => (
            <li key={a.site} style={{ ['--t' as string]: (i ? 1.4 : -1.2) + 'deg' }}>
              <a href={a.href} target="_blank" rel="noreferrer">
                <span className="pl-cert-print"><img src={src(a.img)} alt={`WD Awards certificate for ${a.site}`} loading="lazy" width={800} height={1130} /></span>
                <span className="pl-cert-site">{a.site}</span>
                <span className="pl-meta">{a.note}</span>
              </a>
            </li>
          ))}
        </ul>
        <ul className="pl-stats">
          {STATS.map((s) => <li key={s.label}><span className="pl-stat-n">{s.to}{s.suffix}</span><span className="pl-stat-l">{s.label}</span></li>)}
        </ul>
      </div>
    </>
  );
}

/* ---------- The end: one last tag on a string, his address on it, swinging with the scroll ---------- */
export function LastTag({ onBack }: { onBack: () => void }) {
  const tag = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = tag.current;
    if (!el || still) return;
    let raf = 0, a = 0, va = 0, last = performance.now(), seen = false;
    const io = new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
    });
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      // A jump (a link, a keyboard End) is not a swing: ignore it.
      const v = Math.abs(scroll.v) > 7 ? 0 : scroll.v;
      const target = clamp(v * 1.1, -2.4, 2.4);
      va += (-(a - target) * 60 - va * 7) * dt;
      a += va * dt;
      el.style.transform = `rotate(${a.toFixed(3)}deg)`;
      if (!seen && Math.abs(a) < 0.01 && Math.abs(va) < 0.01) { raf = 0; el.style.transform = ''; return; }
      raf = requestAnimationFrame(tick);
    };
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, []);

  const mail = LINKS[0];
  return (
    <section id="contact" className="pl-end" aria-labelledby="contact-h">
      <div className="pl-end-rail" aria-hidden="true" />
      <div className="pl-bigtag" ref={tag}>
        <span className="pl-hole" />
        <h2 id="contact-h" className="pl-bt-h">Write to him</h2>
        <a className="pl-mail" href={mail.href!}>{mail.value}</a>
        <ul className="pl-links">
          {LINKS.slice(1).map((l) => (
            <li key={l.label}>
              <span className="pl-l-label">{l.label}</span>
              {l.href ? <Out href={l.href}>{l.value}</Out> : <span className="pl-l-val">{l.value}</span>}
            </li>
          ))}
        </ul>
      </div>
      <button type="button" className="pl-btn pl-back" onClick={onBack}>{still ? 'Back to the top' : 'Back to the pile'}</button>
    </section>
  );
}
