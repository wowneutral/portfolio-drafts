// Draft 54: the screens. Built on pmndrs/examples "monitors" (MIT) and the "Old Computers" model by
// Rafael Rodrigues (CC-BY-4.0). A heap of old computers in a dark room; every screen shows something live of his.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource-variable/schibsted-grotesk/wght.css';
import './screens.css';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, STATS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { stage, useStore, type Entry, type Stop } from './stage';

const Scene = lazy(() => import('./Scene'));
const BASE = import.meta.env.BASE_URL;
const [PAPER, WESSO] = RESEARCH;

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

export default function Screens() {
  useVersion('screens');
  const [webgl] = useState(hasWebGL);
  const flat = still || !webgl;
  const [phone, setPhone] = useState(isPhone);
  const [paused, setPaused] = useState(false);
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const idx = useStore((s) => s.idx);
  const push = useStore((s) => s.push);
  const work = useStore((s) => s.work);
  const hover = useStore((s) => s.hover);
  const setWork = useStore((s) => s.setWork);
  const setHover = useStore((s) => s.setHover);

  // What the screens say: his commits when GitHub answers, otherwise his repos and what they are.
  const entries = useMemo<Entry[]>(() => (gh.activity.length
    ? gh.activity.map((a) => ({ label: `${a.repo}, ${ago(a.at)}`, message: a.message }))
    : gh.repos.slice(0, 6).map((r) => ({ label: r.language ? `${r.name}, ${r.language}` : r.name, message: r.description ?? r.name }))), [gh]);
  const latest = notes[0];
  useEffect(() => {
    useStore.setState({
      entries,
      repos: gh.repos.slice(0, 4).map((r) => r.name),
      note: latest ? { date: latest.date, text: latest.body.join(' ') } : null,
    });
  }, [entries, gh.repos, latest]);
  const current = entries.length ? entries[idx % entries.length] : null;

  useEffect(() => {
    const onResize = () => setPhone(isPhone());
    const onMove = (e: PointerEvent) => { stage.px = (e.clientX / innerWidth) * 2 - 1; stage.py = -((e.clientY / innerHeight) * 2 - 1); };
    let raf = 0;
    const measure = () => {
      raf = 0;
      const line = innerHeight * 0.5;
      let stop: Stop = 'hero';
      for (const el of document.querySelectorAll<HTMLElement>('[data-stop]')) if (el.getBoundingClientRect().top <= line) stop = el.dataset.stop as Stop;
      if (stop !== stage.stop) { stage.stop = stop; stage.stopAt = performance.now() / 1000; }
      const sceneH = document.querySelector('.v-screens .scene')?.getBoundingClientRect().height ?? innerHeight;
      let covered = false;
      for (const el of document.querySelectorAll<HTMLElement>('[data-band]')) { const r = el.getBoundingClientRect(); if (r.top <= 0 && r.bottom >= sceneH) covered = true; }
      setPaused(covered);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    addEventListener('resize', onResize);
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('scroll', onScroll, { passive: true });
    return () => { removeEventListener('resize', onResize); removeEventListener('pointermove', onMove); removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  const w = WORK[work];
  return (
    <div className={`v-screens${flat ? ' is-flat' : ''}`}>
      <a className="skip-x" href="#main">Skip to content</a>
      {!flat && (
        <div className="scene" aria-hidden="true">
          <Suspense fallback={null}><Scene lite={phone} paused={paused} /></Suspense>
        </div>
      )}
      <main id="main">
        <div className="col">
          <header className="hero" data-stop="hero">
            <p className="mast">Draft 54, the screens</p>
            <h1>Armaan<br />Seth</h1>
            <p className="line">{PERSON.line}</p>
            {current && (
              <div className="latest">
                <p className="small">{flat ? (gh.activity.length ? 'Latest commit' : 'From his repos') : `${gh.activity.length ? 'Latest commit, on' : 'On'} the orange screen. ${phone ? 'Tap' : 'Click'} it for the next.`}</p>
                <p className="msg" aria-live="polite">{current.message}</p>
                <p className="small">{current.label}</p>
                {entries.length > 1 && (
                  <button type="button" className="next" onClick={push}>
                    {gh.activity.length ? 'Next commit' : 'Next repo'}
                  </button>
                )}
              </div>
            )}
          </header>
        </div>

        <section className="band debate" data-band aria-labelledby="h-debate">
          <h2 id="h-debate" className="band-h">Debate</h2>
          <div className="wins">
            {DEBATE.wins.map((x) => (
              <div className="win" key={x.where}>
                <p className="champ">{x.title}</p>
                <p className="event">{x.event}</p>
                <p className="where">{x.where}, {x.when}</p>
              </div>
            ))}
          </div>
          <div className="team">
            <div className="team-main">
              <h3>{DEBATE.team.name}</h3>
              <p className="role">{DEBATE.team.role}</p>
              <p>{DEBATE.team.line}</p>
              <p>{DEBATE.team.record}</p>
              <A className="go" href={DEBATE.team.href}>skeptical.pages.dev</A>
            </div>
            <div className="next-up">
              <h3>Up next</h3>
              <ul>
                {DEBATE.next.map((x) => <li key={x.where}><span>{x.where}</span>{x.event}</li>)}
              </ul>
            </div>
          </div>
        </section>

        <div className="col">
          <section className="sec" data-stop="github" aria-labelledby="h-gh">
            <h2 id="h-gh">Live from GitHub</h2>
            {gh.activity.length > 0 && (<>
              <h3 className="sub">Recent commits</h3>
              <ol className="commits">
                {gh.activity.slice(0, 6).map((a, i) => (
                  <li key={a.href + i}>
                    <a href={a.href} rel="noopener">{a.message}</a>
                    <span>{a.repo}, {ago(a.at)}</span>
                  </li>
                ))}
              </ol>
            </>)}
            <h3 className="sub">Repos</h3>
            <ul className="repos">
              {gh.repos.slice(0, 6).map((r) => (
                <li key={r.name}>
                  <a href={r.href} rel="noopener">{r.name}</a>
                  {r.description && <p>{r.description}</p>}
                  <span>{[r.language, r.pushedAt && `pushed ${ago(r.pushedAt)}`].filter(Boolean).join(', ')}</span>
                </li>
              ))}
            </ul>
            <A className="go" href={GITHUB.href}>github.com/wowneutral</A>
          </section>

          <section className="sec today" data-stop="today" aria-labelledby="h-today">
            <h2 id="h-today">Today</h2>
            {latest ? (
              <article className="note">
                <p className="date"><time dateTime={latest.date}>{formatDate(latest.date)}</time></p>
                {latest.body.map((p, i) => <p key={i} className="body">{p}</p>)}
              </article>
            ) : (
              <p className="body">{loaded ? NOW.status : 'The note is loading.'}</p>
            )}
            {notes.length > 1 && (
              <details className="earlier">
                <summary>Earlier notes ({notes.length - 1})</summary>
                <ol>
                  {notes.slice(1).map((n) => (
                    <li key={n.date}>
                      <time dateTime={n.date}>{formatDate(n.date)}</time>
                      {n.body.map((p, i) => <p key={i}>{p}</p>)}
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </section>

          <section className="sec about" data-stop="about" aria-labelledby="h-about">
            <h2 id="h-about">About</h2>
            {PERSON.about.map((p, i) => <p key={i} className={i === 0 ? 'lead' : undefined}>{p}</p>)}
            <p className="aside">{PERSON.aside}</p>
          </section>

          <section className="sec work" data-stop="work" aria-labelledby="h-work">
            <div className="work-in">
            <h2 id="h-work">Work</h2>
            {flat ? (
              <ul className="flat-work">
                {WORK.map((x) => (
                  <li key={x.slug}>
                    <img src={BASE + x.img} alt={`${x.name}, a screenshot`} loading="lazy" width={1200} height={680} />
                    <h3>{x.name}</h3>
                    <p className="kind">{x.kind}</p>
                    <p>{x.line}</p>
                    <p className="stack">{x.stack}</p>
                    {x.href && <A className="go" href={x.href}>{x.href.replace(/^https:\/\//, '').replace(/\/$/, '')}</A>}
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <p className="hint">{phone ? 'Tap a name to open it.' : 'Point at a screen, or pick a name.'}</p>
                <ul className="index">
                  {WORK.map((x, i) => (
                    <li key={x.slug} className={(hover ?? work) === i ? 'is-lit' : undefined}>
                      <button type="button" aria-expanded={work === i} aria-controls={`w-${x.slug}`}
                        onClick={() => setWork(i)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                        onFocus={() => setHover(i)} onBlur={() => setHover(null)}>
                        <span className="nm">{x.name}</span><span className="kd">{x.kind}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <article className="entry" id={`w-${w.slug}`} aria-live="polite">
                  <h3>{w.name}</h3>
                  <p className="kind">{w.kind}</p>
                  <p>{w.line}</p>
                  <p className="stack">{w.stack}</p>
                  {w.href ? <A className="go" href={w.href}>{w.href.replace(/^https:\/\//, '').replace(/\/$/, '')}</A> : <p className="stack">No public link.</p>}
                </article>
              </>
            )}
            </div>
          </section>
        </div>

        <section className="band research" data-band aria-labelledby="h-research">
          <h2 id="h-research" className="band-h">Research</h2>
          <h3 className="title">{PAPER.title}</h3>
          <p className="status">{PAPER.status}, {PAPER.pages} pages, DOI {PAPER.doi}</p>
          <div className="paper-cols">
            <p className="abstract">{PAPER.abstract}</p>
            <div>
              <ul className="kw" aria-label="Keywords">{(PAPER.keywords ?? []).map((k) => <li key={k}>{k}</li>)}</ul>
              <ul className="plinks">{PAPER.links.map((l) => <li key={l.label}><A href={l.href}>{l.label}</A></li>)}</ul>
            </div>
          </div>
          <div className="wesso">
            <h3>{WESSO.title}</h3>
            <p className="status">{WESSO.status}</p>
            <p>{WESSO.abstract}</p>
          </div>
        </section>

        <div className="col">
          <section className="sec record" data-stop="record" aria-labelledby="h-record">
            <h2 id="h-record">Record</h2>
            <ul className="stats">{STATS.map((s) => <li key={s.label}><b>{s.to}{s.suffix}</b>{s.label}</li>)}</ul>
            <ol className="honors">{HONORS.map((h) => <li key={h.what}><span>{h.what}</span><span className="dt">{h.detail}</span></li>)}</ol>
            <ul className="awards">
              {AWARDS.map((a) => (
                <li key={a.site}>
                  <a href={a.href} rel="noopener">
                    <img src={BASE + a.img} alt={`Certificate: ${a.site}`} loading="lazy" width={720} height={1018} />
                    <span>{a.site}</span>
                  </a>
                  <p>{a.note}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="sec now" data-stop="now" aria-labelledby="h-now">
            <h2 id="h-now">Now</h2>
            <p className="status-line">{NOW.status}</p>
            <h3>{NOW.reading.title}</h3>
            <p>{NOW.reading.body}</p>
            <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            <h3>{NOW.club.title}</h3>
            <p>{NOW.club.body}</p>
          </section>

          <section className="sec off" data-stop="now" aria-labelledby="h-off">
            <h2 id="h-off">Off the record</h2>
            <div className="off-grid">
              <div><h3>Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3>Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3>Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}>{c.provider}, {c.title}. {c.note}</li>)}</ul></div>
            </div>
          </section>

          <section className="sec contact" data-stop="contact" aria-labelledby="h-contact">
            <h2 id="h-contact">Contact</h2>
            <A className="mail" href={LINKS[0].href!}>{LINKS[0].value}</A>
            <ul className="links">
              {LINKS.slice(1).map((l) => (
                <li key={l.label}><span>{l.label}</span>{l.href ? <A href={l.href}>{l.value}</A> : <b>{l.value}</b>}</li>
              ))}
            </ul>
            <footer className="foot">
              <p>Draft 54 of the portfolio. Not the live site.</p>
              <p>The heap is "Old Computers" by Rafael Rodrigues, CC-BY-4.0, set up as in the pmndrs monitors example (MIT). Type: Schibsted Grotesk.</p>
            </footer>
          </section>
        </div>
      </main>
    </div>
  );
}
