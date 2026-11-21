// Draft 42: the ribbon. His eight builds on a turning ring of curved cards, wrapped by a ribbon printed with his line.
// The ring and band are remixed from pmndrs/examples cards-with-border-radius (by cydstumpel.nl, MIT); see Ring.tsx.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/archivo/wdth.css';
import './ribbon.css';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { scrollToId } from '@/lib/scroll';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { ring } from './store';

const Ring = lazy(() => import('./Ring'));
const BASE = import.meta.env.BASE_URL;

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const Out = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

/** The ribbon laid flat: a still printed band. Decorative; the same words are set in the page as real text. */
function Band({ items, tilt = -1.6 }: { items: readonly string[]; tilt?: number }) {
  const run = Array.from({ length: 6 }, (_, k) => items.map((t, j) => (
    <span key={`${k}-${j}`}><b>{t}</b><i /></span>
  )));
  return (
    <div className="band-wrap" aria-hidden="true">
      <div className="band" style={{ transform: `rotate(${tilt}deg)` }}><div className="band-print">{run}</div></div>
    </div>
  );
}

const SECTIONS = [
  { id: 'work', label: 'Work' },
  { id: 'debate', label: 'Debate' },
  { id: 'research', label: 'Research' },
  { id: 'today', label: 'Today' },
  { id: 'contact', label: 'Contact' },
];

export default function RibbonPage() {
  useVersion('ribbon');
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  const flat = still || !webgl;
  const [front, setFront] = useState(0);
  const [lift, setLift] = useState(-1);
  const [live, setLive] = useState(true);
  const [fontsOk, setFontsOk] = useState(false);
  const [pick, setPick] = useState(0);
  const hero = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const { notes, loaded } = useNotes();
  const gh = useGitHub();

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // The ribbon is printed in Archivo: wait for it (briefly) before drawing the band.
  useEffect(() => {
    if (flat) return;
    let done = false;
    const go = () => { if (!done) { done = true; setFontsOk(true); } };
    document.fonts.load('800 88px "Archivo Variable"').then(go, go);
    const t = setTimeout(go, 1200);
    return () => clearTimeout(t);
  }, [flat]);

  // The ring talks back: which card is in front, and what happens when one is picked.
  useEffect(() => {
    ring.onFront = setFront;
    ring.onPick = (i) => scrollToId(`w-${WORK[i].slug}`);
    return () => { ring.onFront = null; ring.onPick = null; ring.hover = ring.focus = -1; };
  }, []);

  // One full turn over the pinned stretch of the opening; stop drawing once it is off screen.
  useEffect(() => {
    const el = hero.current; if (!el || flat) return;
    const measure = () => { ring.span = Math.max(1, el.offsetHeight - window.innerHeight); };
    measure();
    window.addEventListener('resize', measure);
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { rootMargin: '80px' });
    io.observe(el);
    return () => { window.removeEventListener('resize', measure); io.disconnect(); };
  }, [flat, phone]);

  // A horizontal drag or swipe turns the ring; a vertical one still scrolls the page.
  useEffect(() => {
    const el = stage.current; if (!el || flat) return;
    let x0 = 0, x = 0, down = false, moved = 0;
    const dn = (e: PointerEvent) => { down = true; x0 = x = e.clientX; moved = 0; ring.dragged = false; };
    const mv = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - x; x = e.clientX; moved = Math.abs(x - x0);
      ring.spin -= dx * (phone ? 0.012 : 0.006);
      if (moved > 8) ring.dragged = true;
    };
    const up = () => { down = false; setTimeout(() => { ring.dragged = false; }, 0); };
    el.addEventListener('pointerdown', dn);
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => { el.removeEventListener('pointerdown', dn); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, [flat, phone]);

  const focusCard = (i: number) => { ring.focus = i; ring.bring = i; setLift(i); };
  const blurCard = () => { ring.focus = -1; setLift(-1); };
  const shown = WORK[lift >= 0 ? lift : front];
  const [w1, w2] = DEBATE.wins;
  const paper = RESEARCH[0], wess = RESEARCH[1];
  const note = notes[Math.min(pick, Math.max(0, notes.length - 1))];
  const winsPrint = DEBATE.wins.map((w) => `${w.title}, ${w.event}, ${w.where}`);

  return (
    <div className={`v-ribbon${flat ? ' is-flat' : ''}${phone ? ' is-phone' : ''}`}>
      <a className="skip-x" href="#main">Skip to content</a>

      <header className="hero" ref={hero} id="top">
        <div className="hero-stage">
          <div className="hero-top">
            <h1 className="name"><span>{PERSON.first}</span> <span>{PERSON.last}</span></h1>
            <div className="hero-side">
              <p className="hero-line">{PERSON.line}</p>
              <nav aria-label="Sections" className="topnav">
                {SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`}>{s.label}</a>)}
              </nav>
            </div>
          </div>

          {flat ? (
            <div className="still">
              <Band items={[PERSON.line]} tilt={-1.2} />
            </div>
          ) : (
            <div className="loop" ref={stage} aria-hidden="true">
              {fontsOk && <Suspense fallback={null}><Ring phone={phone} live={live} /></Suspense>}
            </div>
          )}

          <div className="hero-foot">
            {!flat && (
              <p className="caption" aria-hidden="true">
                <span className="cap-kind">{shown.kind}</span>
                <span className="cap-name">{shown.name}</span>
              </p>
            )}
            <ul className={`index${flat ? ' is-row' : ''}`} aria-label="The eight projects">
              {WORK.map((w, i) => (
                <li key={w.slug}>
                  <a
                    href={`#w-${w.slug}`}
                    className={!flat && (lift === i || (lift < 0 && front === i)) ? 'is-on' : undefined}
                    onFocus={() => focusCard(i)} onBlur={blurCard}
                    onMouseEnter={() => focusCard(i)} onMouseLeave={blurCard}
                  >
                    {flat && <img src={BASE + w.img} alt="" width={1200} height={760} />}
                    <span>{w.name}</span>
                  </a>
                </li>
              ))}
            </ul>
            {!flat && <p className="hint">{phone ? 'Swipe to turn. Tap a card.' : 'Scroll or drag to turn. Pick a card.'}</p>}
          </div>
        </div>
      </header>

      <main id="main">
        <section className="about" aria-labelledby="h-about">
          <h2 id="h-about" className="short">{PERSON.short.map((s) => <span key={s}>{s}</span>)}</h2>
          <div className="about-body">
            {PERSON.about.map((p) => <p key={p.slice(0, 20)} className="lead">{p}</p>)}
            <p className="aside">{PERSON.aside}</p>
          </div>
        </section>

        <section className="work" id="work" aria-labelledby="h-work">
          <h2 id="h-work" className="sec">Work</h2>
          <ol className="projects">
            {WORK.map((w, i) => (
              <li key={w.slug} id={`w-${w.slug}`} className={`project${i % 2 ? ' is-flip' : ''}`}>
                <figure className="shot">
                  <img src={BASE + w.img} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={760} />
                </figure>
                <div className="proj-text">
                  <p className="kind">{w.kind}</p>
                  <h3 className="pname">{w.name}</h3>
                  <p className="pline">{w.line}</p>
                  <p className="stack">{w.stack}</p>
                  {w.href ? <Out className="go" href={w.href}>Open {w.name}</Out> : <p className="stack nolink">No public link.</p>}
                  <a className="back" href="#top">Back to the ring</a>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="debate" id="debate" aria-labelledby="h-debate">
          <Band items={winsPrint} tilt={-2} />
          <h2 id="h-debate" className="sec">Debate</h2>
          <ol className="wins">
            {[w1, w2].map((w) => (
              <li key={w.where}>
                <p className="champ">{w.title}</p>
                <p className="event">{w.event}</p>
                <p className="where">{w.where}, {w.when}</p>
              </li>
            ))}
          </ol>
          <div className="team-row">
            <div className="team">
              <p className="kind">{DEBATE.team.role}</p>
              <h3 className="tname">{DEBATE.team.name}</h3>
              <p className="lead">{DEBATE.team.line}</p>
              <p>{DEBATE.team.record}</p>
              <Out className="go" href={DEBATE.team.href}>skeptical.pages.dev</Out>
            </div>
            <div className="next">
              <h3 className="mini">Up next</h3>
              <ul>{DEBATE.next.map((n) => <li key={n.where}><b>{n.where}</b><span>{n.event}</span></li>)}</ul>
            </div>
          </div>
        </section>

        <section className="research" id="research" aria-labelledby="h-research">
          <h2 id="h-research" className="sec">Research</h2>
          {paper.epigraph && (
            <figure className="epi">
              <blockquote><p>{paper.epigraph.text}</p></blockquote>
              <figcaption className="meta">{paper.epigraph.source}</figcaption>
            </figure>
          )}
          <article className="paper">
            <p className="kind">{paper.status}{'pages' in paper ? `, ${paper.pages} pages` : ''}</p>
            <h3 className="ptitle">{paper.title}</h3>
            <div className="paper-cols">
              <div>
                <p className="lead">{paper.abstract}</p>
                <ul className="keys" aria-label="Keywords">{(paper.keywords ?? []).map((k) => <li key={k}>{k}</li>)}</ul>
              </div>
              <div>
                {paper.ladders && (
                  <>
                    <h4 className="mini">Three ladders</h4>
                    <ol className="ladders">
                      {paper.ladders?.map((l) => <li key={l.who}><b>{l.who}</b><span>{l.when}</span><span>{l.where}</span></li>)}
                    </ol>
                  </>
                )}
                <ul className="plinks">{paper.links.map((l) => <li key={l.label}><Out className="go" href={l.href}>{l.label}</Out></li>)}</ul>
              </div>
            </div>
          </article>
          <article className="wess">
            <p className="kind">{wess.status}</p>
            <h3 className="wtitle">{wess.title}</h3>
            <p>{wess.abstract}</p>
          </article>
        </section>

        <section className="today" id="today" aria-labelledby="h-today">
          <h2 id="h-today" className="sec">Today</h2>
          <div className="today-grid">
            {note ? (
              <article className="note">
                <p className="ndate"><time dateTime={note.date}>{formatDate(note.date)}</time>{pick === 0 && <span className="fresh">Latest</span>}</p>
                {note.body.map((b) => <p key={b.slice(0, 24)} className="nbody">{b}</p>)}
              </article>
            ) : (
              <article className="note is-wait">
                <p className="ndate">{loaded ? 'The notebook is open' : 'Opening the notebook'}</p>
                <p className="nbody">{loaded ? 'A new note lands here each day.' : 'One moment.'}</p>
              </article>
            )}
            <div className="earlier">
              <h3 className="mini">Every note</h3>
              <ol>
                {notes.map((n, i) => (
                  <li key={n.date}>
                    <button type="button" aria-pressed={pick === i} onClick={() => setPick(i)}>
                      <time dateTime={n.date}>{formatDate(n.date, { day: 'numeric', month: 'short' })}</time>
                      <span>{n.body[0]}</span>
                    </button>
                  </li>
                ))}
                {!notes.length && <li className="dim">{loaded ? 'Notes appear here, newest first.' : 'Loading notes.'}</li>}
              </ol>
            </div>
          </div>
        </section>

        <section className="github" id="github" aria-labelledby="h-github">
          <div className="gh-head">
            <h2 id="h-github" className="sec">Live from GitHub</h2>
            <Out className="go" href={GITHUB.href}>github.com/{GITHUB.user}</Out>
          </div>
          {gh.activity.length > 0 && (
            <div className="commits">
              <h3 className="mini">Latest commits</h3>
              <ol>
                {gh.activity.slice(0, 6).map((a) => (
                  <li key={a.href}>
                    <a href={a.href} rel="noopener"><span className="msg">{a.message}</span><span className="meta">{a.repo}</span><span className="meta">{ago(a.at)}</span></a>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className="repos">
            <h3 className="mini">{gh.live ? 'Recently pushed' : 'Repositories'}</h3>
            <ol>
              {gh.repos.slice(0, 8).map((r) => (
                <li key={r.name}>
                  <a href={r.href} rel="noopener">
                    <span className="rname">{r.name}</span>
                    <span className="rdesc">{r.description ?? 'No description yet.'}</span>
                    <span className="meta">{[r.language, r.pushedAt ? ago(r.pushedAt) : null].filter(Boolean).join(', ')}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="now" aria-labelledby="h-now">
          <h2 id="h-now" className="sec">Now</h2>
          <p className="status">{NOW.status}</p>
          <div className="now-cols">
            <div>
              <h3 className="mini">{NOW.reading.title}</h3>
              <p>{NOW.reading.body}</p>
              <ul className="keys">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <h3 className="mini">{NOW.club.title}</h3>
              <p>{NOW.club.body}</p>
            </div>
          </div>
        </section>

        <section className="record" aria-labelledby="h-record">
          <h2 id="h-record" className="sec">Record</h2>
          <div className="record-grid">
            <ol className="honors">
              {HONORS.map((h) => <li key={h.what}><span>{h.what}</span><span className="meta">{h.detail}</span></li>)}
            </ol>
            <ul className="awards">
              {AWARDS.map((a) => (
                <li key={a.site}>
                  <Out href={a.href} className="cert">
                    <img src={BASE + a.img} alt={`Certificate: ${a.site}, ${a.note}`} loading="lazy" width={720} height={1018} />
                    <span className="cert-name">{a.site}</span>
                    <span className="meta">{a.note}</span>
                  </Out>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="off" aria-labelledby="h-off">
          <h2 id="h-off" className="sec small">Off the record</h2>
          <div className="off-cols">
            <div><h3 className="mini">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="mini">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="mini">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="mini">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider} {c.title}</b> {c.note}</li>)}</ul></div>
          </div>
        </section>

        <section className="contact" id="contact" aria-labelledby="h-contact">
          <h2 id="h-contact" className="sec">Write to him</h2>
          <ul className="links">
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="meta">{l.label}</span>
                {l.href ? <Out href={l.href} className="big-link">{l.value}</Out> : <span className="big-link is-plain">{l.value}</span>}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="foot">
        <a className="go" href="#top">Back to the ring</a>
        <p>Draft 42 of the portfolio. Not the live site.</p>
        <p className="end-name" aria-hidden="true">{PERSON.name}</p>
        <p className="meta">Ring and ribbon remixed from the pmndrs cards with border radius example by Cyd Stumpel. Set in Archivo.</p>
      </footer>
    </div>
  );
}
