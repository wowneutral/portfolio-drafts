// Draft 39: the laptop. A graphite laptop floats over a flat oxblood field with the
// site he built on its screen; as you scroll, the display shows each thing he has made.
// Laptop scene remixed from pmndrs/examples floating-laptop (MIT); see Stage.tsx.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bricolage-grotesque/opsz.css';
import './laptop.css';
import { PERSON, CHAPTERS, DEBATE, RESEARCH, WORK, HONORS, AWARDS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { gsap } from '@/lib/scroll';
import { clamp, isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { S, preload, type Mode } from './screen';

const Stage = lazy(() => import('./Stage'));
const BASE = import.meta.env.BASE_URL;
const host = (href: string) => href.replace(/^https?:\/\//, '').replace(/\/$/, '');

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

function Go({ href, children }: { href: string; children: React.ReactNode }) {
  return <a className="go" href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>;
}

/** The flat version of the display: his screenshot in a plain black bezel. */
function Bezel({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <figure className={`bezel${className ? ' ' + className : ''}`}>
      <img src={BASE + src} alt={alt} loading="lazy" width={1200} height={660} />
    </figure>
  );
}

export default function Laptop() {
  useVersion('laptop');
  const root = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  const flat = still || !webgl;
  const [shut, setShut] = useState(false);
  const [card, setCard] = useState(0);
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const [latest, ...earlier] = notes;
  const paper = RESEARCH[0], wess = RESEARCH[1];
  const sub = paper.title.split(': ').slice(1).join(': ');
  const commits = gh.activity.slice(0, 5);

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // Feed the display: the words it draws are the same words on the page.
  useEffect(() => {
    preload();
    S.paper = [paper.short, sub];
    S.shelves = [...NOW.reading.shelves];
    document.fonts?.ready.then(() => { S.data++; });
    return () => { S.mode = 'og'; S.flip = false; S.shut = false; S.slow = false; S.work = 0; S.p = 0; };
  }, [paper.short, sub]);
  useEffect(() => {
    S.lines = commits.length
      ? commits.map((a) => ({ big: a.message, small: `${a.repo}, ${ago(a.at)}` }))
      : gh.repos.slice(0, 4).map((r) => ({ big: r.name, small: r.description ?? '' }));
    S.data++;
  }, [gh, commits]);
  useEffect(() => {
    S.day = latest ? formatDate(latest.date, { day: 'numeric' }) : '';
    S.month = latest ? formatDate(latest.date, { month: 'long', year: 'numeric' }) : '';
    S.data++;
  }, [latest]);

  // Desktop: the section at the middle of the window decides what the display shows.
  useEffect(() => {
    const el = root.current; if (!el || flat || phone) return;
    let last = '';
    const tick = () => {
      const vh = window.innerHeight, mid = vh * 0.5;
      let lid = false, slow = false;
      el.querySelectorAll<HTMLElement>('[data-shut]').forEach((s) => {
        const r = s.getBoundingClientRect();
        if (r.top < vh * 0.82 && r.bottom > vh * 0.3) { lid = true; slow = s.dataset.shut === 'slow'; }
      });
      let at: HTMLElement | null = null, r: DOMRect | null = null;
      for (const s of el.querySelectorAll<HTMLElement>('[data-screen]')) {
        const b = s.getBoundingClientRect();
        if (b.top <= mid && b.bottom > mid) { at = s; r = b; break; }
      }
      const id = (at?.dataset.screen ?? '') + (at?.dataset.work ?? '') + (lid ? 'x' : '');
      if (id !== last) { if (last) S.flip = false; last = id; }
      S.shut = lid; S.slow = slow;
      if (at && r) {
        S.mode = at.dataset.screen as Mode;
        if (at.dataset.work) { S.work = +at.dataset.work; S.p = clamp((mid - r.top - r.height * 0.15) / (r.height * 0.7), 0, 1); }
      }
      const closed = S.shut !== S.flip;
      setShut((v) => (v === closed ? v : closed));
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [flat, phone]);

  // Phone: the screen follows the card that has snapped in, and scrolls its page once.
  useEffect(() => {
    if (flat || !phone) return;
    S.mode = 'work'; S.shut = false; S.work = card; S.p = 0;
    const tw = gsap.to(S, { p: 1, duration: 2.8, ease: 'none', delay: 0.35 });
    return () => { tw.kill(); };
  }, [card, phone, flat]);
  useEffect(() => {
    if (flat || !phone) return;
    const tick = () => setShut((v) => (v === S.flip ? v : S.flip));
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [flat, phone]);
  const onStrip = () => {
    const el = strip.current; if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const w = first ? first.offsetWidth + 14 : el.clientWidth;
    setCard(Math.max(0, Math.min(WORK.length - 1, Math.round(el.scrollLeft / w))));
  };
  const toggle = () => { S.flip = !S.flip; };

  const lidLabel = shut ? 'Open the lid' : 'Close the lid';

  return (
    <div className={`v-laptop${flat ? ' is-flat' : ''}${phone ? ' is-phone' : ''}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      {!flat && !phone && (
        <div className="stage" aria-hidden="true"><Suspense fallback={null}><Stage /></Suspense></div>
      )}

      <main id="main">
        <section className="hero" id="top" data-screen="og">
          {!flat && phone && <div className="pband" aria-hidden="true"><Suspense fallback={null}><Stage only="og" small /></Suspense></div>}
          <div className="col hero-copy">
            <h1 className="name">{PERSON.first}<br />{PERSON.last}</h1>
            <p className="line">{PERSON.line}</p>
            {!flat && <button type="button" className="lid" onClick={toggle}>{lidLabel}<span className="soft">, or {phone ? 'tap' : 'click'} the laptop</span></button>}
          </div>
          {flat && <Bezel src="og.jpg" alt="The live site: his name over a green forest." className="hero-shot" />}
        </section>

        <section className="col sec about" id="about" data-screen="og" aria-labelledby="h-about">
          <h2 id="h-about" className="h2">{PERSON.short.join(' ')}</h2>
          {PERSON.about.map((p) => <p key={p.slice(0, 16)} className="body">{p}</p>)}
          <p className="aside">{PERSON.aside}</p>
        </section>

        <section className="band debate" id="debate" data-shut="" aria-labelledby="h-debate">
          <div className="band-in">
            <h2 id="h-debate" className="band-h">{CHAPTERS[1].title}</h2>
            <ol className="wins">
              {DEBATE.wins.map((w) => (
                <li key={w.where}>
                  <p className="champ">{w.title}</p>
                  <p className="event">{w.event}</p>
                  <p className="where">{w.where}, {w.when}</p>
                </li>
              ))}
            </ol>
            <div className="team">
              <div>
                <p className="role">{DEBATE.team.role}</p>
                <h3 className="tname">{DEBATE.team.name}</h3>
              </div>
              <div className="team-copy">
                <p className="body">{DEBATE.team.line}</p>
                <p className="body">{DEBATE.team.record}</p>
                <Go href={DEBATE.team.href}>{host(DEBATE.team.href)}</Go>
              </div>
            </div>
            <div className="next">
              <h3 className="h3">Up next</h3>
              <ul>
                {DEBATE.next.map((n) => <li key={n.where}><b>{n.where}</b><span>{n.event}</span></li>)}
              </ul>
            </div>
          </div>
        </section>

        <section className="col sec research" id="research" data-screen="paper" aria-labelledby="h-research">
          <h2 id="h-research" className="h2">{CHAPTERS[3].title}</h2>
          <h3 className="paper-title">{paper.title}</h3>
          <p className="meta">{paper.status}, {paper.pages} pages</p>
          <p className="body lead">{paper.abstract}</p>
          <ul className="keys" aria-label="Keywords">{(paper.keywords ?? []).map((k) => <li key={k}>{k}</li>)}</ul>
          <ul className="links">{paper.links.map((l) => <li key={l.label}><Go href={l.href}>{l.label}</Go></li>)}</ul>
          <div className="wess">
            <h3 className="h3">{wess.title}</h3>
            <p className="meta">{wess.status}</p>
            <p className="body">{wess.abstract}</p>
          </div>
        </section>

        <section className="work" id="work" aria-labelledby="h-work">
          <div className="col sec work-intro" data-screen="og">
            <h2 id="h-work" className="h2">{CHAPTERS[4].title}</h2>
            <p className="body lead">{CHAPTERS[4].body}</p>
          </div>

          {phone && !flat ? (
            <div className="pwork">
              <div className="pband" aria-hidden="true"><Suspense fallback={null}><Stage only="work" small /></Suspense></div>
              <div className="strip" ref={strip} onScroll={onStrip}>
                {WORK.map((w, i) => (
                  <article key={w.slug} className={`card${i === card ? ' is-on' : ''}`} aria-labelledby={`w-${w.slug}`}>
                    <h3 id={`w-${w.slug}`} className="pname">{w.name}</h3>
                    <p className="body">{w.line}</p>
                    <p className="meta2"><span>{w.kind}</span><span>{w.stack}</span></p>
                    {w.href && <Go href={w.href}>{host(w.href)}</Go>}
                  </article>
                ))}
              </div>
              <p className="swipe">Swipe for the next one</p>
            </div>
          ) : (
            WORK.map((w, i) => {
              const dark = w.slug === 'jarvis';
              return (
                <article key={w.slug} className={`col proj${dark ? ' is-dark' : ''}`} data-screen={dark ? 'dark' : 'work'} data-work={i} aria-labelledby={`w-${w.slug}`}>
                  <div className="proj-in">
                    <h3 id={`w-${w.slug}`} className="pname">{w.name}</h3>
                    <p className={dark ? 'dline' : 'body lead'}>{w.line}</p>
                    <p className="meta2"><span>{w.kind}</span><span>{w.stack}</span></p>
                    {w.href && <Go href={w.href}>{host(w.href)}</Go>}
                  </div>
                  {flat && <Bezel src={w.img} alt={`Screenshot of ${w.name}.`} />}
                </article>
              );
            })
          )}
        </section>

        <section className="col sec gh" id="github" data-screen="commits" aria-labelledby="h-gh">
          <h2 id="h-gh" className="h2">Live from GitHub</h2>
          {commits.length > 0 && (
            <ol className="commits" aria-label="Latest commits">
              {commits.map((a) => (
                <li key={a.href}><a href={a.href} rel="noopener"><b>{a.message}</b><span>{a.repo}, {ago(a.at)}</span></a></li>
              ))}
            </ol>
          )}
          <ul className="repos" aria-label="Repositories">
            {gh.repos.slice(0, 6).map((r) => (
              <li key={r.name}>
                <a href={r.href} rel="noopener"><b>{r.name}</b><span>{r.description}</span>{r.language && <i>{r.language}</i>}</a>
              </li>
            ))}
          </ul>
          <Go href={GITHUB.href}>{host(GITHUB.href)}</Go>
        </section>

        <section className="col sec today" id="today" data-screen="date" aria-labelledby="h-today">
          <h2 id="h-today" className="h2">Today</h2>
          {latest ? (
            <article className="note">
              <p className="date"><time dateTime={latest.date}>{formatDate(latest.date)}</time></p>
              {latest.body.map((p) => <p key={p.slice(0, 16)} className="note-body">{p}</p>)}
            </article>
          ) : (
            <p className="note-body">{loaded ? 'No note yet. Check back tomorrow.' : 'Opening the notebook.'}</p>
          )}
          {earlier.length > 0 && (
            <ol className="earlier" aria-label="Earlier notes">
              {earlier.map((n) => (
                <li key={n.date}><time dateTime={n.date}>{formatDate(n.date, { day: 'numeric', month: 'short' })}</time><p>{n.body.join(' ')}</p></li>
              ))}
            </ol>
          )}
        </section>

        <section className="col sec now" id="now" data-screen="shelves" aria-labelledby="h-now">
          <h2 id="h-now" className="h2">Now</h2>
          <p className="status">{NOW.status}</p>
          <div className="nowpair">
            <div>
              <h3 className="h3">{NOW.reading.title}</h3>
              <p className="body">{NOW.reading.body}</p>
              <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <h3 className="h3">{NOW.club.title}</h3>
              <p className="body">{NOW.club.body}</p>
            </div>
          </div>
        </section>

        <section className="band record" id="record" data-shut="" aria-labelledby="h-record">
          <div className="band-in">
            <h2 id="h-record" className="band-h">Record</h2>
            <div className="rec-grid">
              <ol className="honors">
                {HONORS.map((h) => <li key={h.what}><b>{h.what}</b><span>{h.detail}</span></li>)}
              </ol>
              <ul className="certs">
                {AWARDS.map((a) => (
                  <li key={a.site}>
                    <a href={a.href} rel="noopener">
                      <img src={BASE + a.img} alt={`Certificate: ${a.site}, ${a.note}`} loading="lazy" width={600} height={848} />
                      <b>{a.site}</b><span>{a.note}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <h2 className="band-h small" id="h-off">Off the record</h2>
            <div className="off">
              <div><h3 className="h3">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="h3">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="h3">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="h3">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider}, {c.title}</b> {c.note}</li>)}</ul></div>
            </div>
          </div>
        </section>

        <section className="col sec contact" id="contact" data-screen="og" data-shut="slow" aria-labelledby="h-contact">
          <h2 id="h-contact" className="h2">Contact</h2>
          <ul className="contacts">
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="clabel">{l.label}</span>
                {l.href ? <a href={l.href} rel={l.href.startsWith('http') ? 'noopener' : undefined}>{l.value}</a> : <span className="cval">{l.value}</span>}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="foot">
        <p>Draft 39 of the portfolio. Not the live site.</p>
        <p>Laptop model and scene from the pmndrs floating-laptop example, MIT licence.</p>
      </footer>
    </div>
  );
}
