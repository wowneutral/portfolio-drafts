// Draft 63: the bust. Plato, from Armaan's own scan, stands dithered in a black room and turns away:
// from the pointer, and a little further with every section, until at Contact he faces the wall.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/hanken-grotesk/wght.css';
import './bust.css';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { PLAN, stage } from './stage';

const Scene = lazy(() => import('./Scene'));
const BASE = import.meta.env.BASE_URL;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const TAG = DISLIKES.find((d) => d.startsWith('Plato')) ?? DISLIKES[1];

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const INDEX = [
  ['about', 'About'], ['debate', 'Debate'], ['research', 'Research'], ['work', 'Work'],
  ['today', 'Today'], ['github', 'GitHub'], ['record', 'Record'], ['contact', 'Contact'],
] as const;

export default function Bust() {
  useVersion('bust');
  const root = useRef<HTMLDivElement>(null);
  const room = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const flat = still || !webgl;
  const [lit, setLit] = useState(false);
  const { notes, loaded } = useNotes();
  const gh = useGitHub();

  // Where each section starts, so the scene knows how far he has turned.
  useEffect(() => {
    const el = root.current; if (!el || flat) return;
    const measure = () => {
      const vh = window.innerHeight, sy = window.scrollY;
      const keys = Object.entries(PLAN).map(([id, k]) => {
        const s = el.querySelector<HTMLElement>(`#${id}`);
        const top = s ? s.getBoundingClientRect().top + sy : 0;
        return { ...k, y: id === 'top' ? 0 : Math.max(0, top - vh * 0.55) };
      });
      const max = document.documentElement.scrollHeight - vh;
      keys[keys.length - 1].y = Math.min(keys[keys.length - 1].y, max - 2);
      keys.sort((a, b) => a.y - b.y);
      stage.keys = keys;
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    window.addEventListener('resize', measure);
    document.fonts.ready.then(measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [flat]);

  // The pointer, measured against the room: x is -1 at its left edge and 1 at its right.
  useEffect(() => {
    if (flat) return;
    const move = (e: PointerEvent) => {
      const r = room.current?.getBoundingClientRect(); if (!r) return;
      stage.px = Math.max(-1.6, Math.min(1.6, ((e.clientX - r.left) / r.width) * 2 - 1));
      stage.py = Math.max(-1, Math.min(1, -(((e.clientY - r.top) / r.height) * 2 - 1)));
    };
    const down = (e: PointerEvent) => {
      move(e);
      const r = room.current?.getBoundingClientRect();
      if (r && e.clientX > r.left && e.clientY < r.bottom) stage.kick = 0.75;
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', down, { passive: true });
    stage.onLoad = () => setLit(true);
    if (stage.loaded) setLit(true);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', down); stage.onLoad = null; };
  }, [flat]);

  const [latest, ...earlier] = notes;
  const paper = RESEARCH[0] as (typeof RESEARCH)[0] & Required<Pick<(typeof RESEARCH)[0], 'epigraph' | 'keywords' | 'ladders' | 'pages'>>, wess = RESEARCH[1];

  return (
    <div className={`v-bust${flat ? ' is-flat' : ''}${lit ? ' is-lit' : ''}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>

      <div className="room" ref={room} aria-hidden="true">
        {flat ? (
          <div className="still">
            <img src={`${BASE}bust/still.png`} alt="" width={780} height={900} />
            <p className="tag still-tag">{TAG}.</p>
          </div>
        ) : (
          <>
            <Suspense fallback={null}><Scene /></Suspense>
            <p className="tag live-tag">{TAG}.</p>
          </>
        )}
      </div>

      <main id="main" className="col">
        <header className="sec hero" id="top">
          <h1 className="name">Armaan<br />Seth</h1>
          <p className="line">{PERSON.line}</p>
          <nav className="index" aria-label="Sections">
            <ul>{INDEX.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}</ul>
          </nav>
        </header>

        <section className="sec about" id="about" aria-labelledby="h-about">
          <h2 id="h-about" className="h">About</h2>
          {PERSON.about.map((p) => <p key={p.slice(0, 16)} className="body">{p}</p>)}
          <p className="body soft">{PERSON.aside}</p>
        </section>

        <section className="sec debate" id="debate" aria-labelledby="h-debate">
          <h2 id="h-debate" className="h">Debate</h2>
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
            <h3 className="tname">{DEBATE.team.name}</h3>
            <p className="role">{DEBATE.team.role}</p>
            <p className="body">{DEBATE.team.line}</p>
            <p className="body soft">{DEBATE.team.record}</p>
            <p><A className="go" href={DEBATE.team.href}>{host(DEBATE.team.href)}</A></p>
          </div>
          <div className="next">
            <h3 className="sub">Up next</h3>
            <ul>{DEBATE.next.map((n) => <li key={n.where}><span className="nw">{n.where}</span> <span className="soft">{n.event}</span></li>)}</ul>
          </div>
        </section>

        <section className="sec research" id="research" aria-labelledby="h-research">
          <h2 id="h-research" className="h">Research</h2>
          <h3 className="ptitle">{paper.title}</h3>
          <p className="status soft">{paper.status}, {paper.pages} pages</p>
          <blockquote className="epi">
            <p>{paper.epigraph.text}</p>
            <footer>{paper.epigraph.source}</footer>
          </blockquote>
          <p className="body lede">{paper.abstract}</p>
          <ul className="keys" aria-label="Keywords">{paper.keywords.map((k) => <li key={k}>{k}</li>)}</ul>
          <div className="ladders">
            <h4 className="sub">The three ladders</h4>
            <ol>
              {paper.ladders.map((l) => (
                <li key={l.who}><span className="who">{l.who}</span><span className="soft">{l.when}. {l.where}</span></li>
              ))}
            </ol>
          </div>
          <ul className="plinks">{paper.links.map((l) => <li key={l.label}><A href={l.href}>{l.label}</A></li>)}</ul>
          <p className="doi soft">DOI {paper.doi}</p>
          <div className="wess">
            <h3 className="tname">{wess.short}</h3>
            <p className="soft">{wess.title}. {wess.status}.</p>
            <p className="body">{wess.abstract}</p>
          </div>
        </section>

        <section className="sec work" id="work" aria-labelledby="h-work">
          <h2 id="h-work" className="h">Work</h2>
          <ol className="prints">
            {WORK.map((w, i) => (
              <li key={w.slug} className={i % 2 ? 'r' : 'l'}>
                <figure>
                  {w.href ? (
                    <a className="frame" href={w.href} rel="noopener" tabIndex={-1} aria-hidden="true">
                      <img src={BASE + w.img} alt="" width={1200} height={700} loading="lazy" />
                    </a>
                  ) : (
                    <span className="frame"><img src={BASE + w.img} alt="" width={1200} height={700} loading="lazy" /></span>
                  )}
                  <figcaption>
                    <h3 className="wname">{w.name}</h3>
                    <p className="kind">{w.kind}</p>
                    <p className="body">{w.line}</p>
                    <p className="stack soft">{w.stack}</p>
                    {w.href && <p><A className="go" href={w.href}>{host(w.href)}</A></p>}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ol>
        </section>

        <section className="sec today" id="today" aria-labelledby="h-today">
          <h2 id="h-today" className="h">Today</h2>
          {!loaded ? (
            <p className="note-date soft">Fetching today's note</p>
          ) : latest ? (
            <article className="note">
              <p className="note-date"><time dateTime={latest.date}>{formatDate(latest.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></p>
              {latest.body.map((p, i) => <p key={i} className="note-body">{p}</p>)}
            </article>
          ) : (
            <p className="note-body">{NOW.status}</p>
          )}
          {earlier.length > 0 && (
            <details className="earlier">
              <summary>Earlier notes <span className="soft">{earlier.length}</span></summary>
              <ol>
                {earlier.map((n) => (
                  <li key={n.date}>
                    <p className="note-date soft"><time dateTime={n.date}>{formatDate(n.date)}</time></p>
                    {n.body.map((p, i) => <p key={i} className="body">{p}</p>)}
                  </li>
                ))}
              </ol>
            </details>
          )}
        </section>

        <section className="sec github" id="github" aria-labelledby="h-gh">
          <h2 id="h-gh" className="h">Live from GitHub</h2>
          <p className="soft">{gh.live ? 'Straight from GitHub, as of this visit.' : 'What he keeps on GitHub.'}</p>
          {gh.activity.length > 0 && (
            <ol className="commits" aria-label="Recent commits">
              {gh.activity.slice(0, 6).map((a, i) => (
                <li key={i}>
                  <A href={a.href}>{a.message || 'Commit'}</A>
                  <span className="soft">{a.repo}, {ago(a.at)}</span>
                </li>
              ))}
            </ol>
          )}
          <ol className="repos" aria-label="Repositories">
            {gh.repos.slice(0, 6).map((r) => (
              <li key={r.name}>
                <A className="rname" href={r.href}>{r.name}</A>
                {r.description && <p className="body">{r.description}</p>}
                <p className="soft">{[r.language, r.pushedAt ? `pushed ${ago(r.pushedAt)}` : null].filter(Boolean).join(', ')}</p>
              </li>
            ))}
          </ol>
          <p><A className="go" href={GITHUB.href}>{host(GITHUB.href)}</A></p>
        </section>

        <section className="sec now" id="now" aria-labelledby="h-now">
          <h2 id="h-now" className="h">Now</h2>
          <p className="nowline">{NOW.status}</p>
          <div className="pair">
            <div>
              <h3 className="sub">{NOW.reading.title}</h3>
              <p className="body">{NOW.reading.body}</p>
              <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <h3 className="sub">{NOW.club.title}</h3>
              <p className="body">{NOW.club.body}</p>
            </div>
          </div>
        </section>

        <section className="sec record" id="record" aria-labelledby="h-record">
          <h2 id="h-record" className="h">Record</h2>
          <ol className="honors">
            {HONORS.map((h) => <li key={h.what}><span className="what">{h.what}</span><span className="soft">{h.detail}</span></li>)}
          </ol>
          <ul className="certs">
            {AWARDS.map((a) => (
              <li key={a.site}>
                <A href={a.href}>
                  <img src={BASE + a.img} alt={`Certificate: ${a.site}, ${a.note}`} width={720} height={1018} loading="lazy" />
                  <span className="cert-name">{a.site}</span>
                  <span className="soft">{a.note}</span>
                </A>
              </li>
            ))}
          </ul>
        </section>

        <section className="sec off" id="off" aria-labelledby="h-off">
          <h2 id="h-off" className="h">Off the record</h2>
          <div className="lists">
            <div><h3 className="sub">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="sub">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="sub">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="sub">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}>{c.provider} {c.title}<span className="soft">. {c.note}</span></li>)}</ul></div>
          </div>
        </section>

        <section className="sec contact" id="contact" aria-labelledby="h-contact">
          <h2 id="h-contact" className="h">Contact</h2>
          <ul className="links">
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="soft">{l.label}</span>
                {l.href ? <A href={l.href}>{l.value}</A> : <span className="plain">{l.value}</span>}
              </li>
            ))}
          </ul>
          <p className="close">{PERSON.short.join(' ')}</p>
        </section>

        <footer className="foot">
          <p>Draft 63 of the portfolio. Not the live site.</p>
          <p className="soft">“Plato / Platon” by rjordanb2026 on Sketchfab, CC BY 4.0. Staging after pmndrs, The Three Graces (MIT). Type: Bodoni Moda and Hanken Grotesk.</p>
        </footer>
      </main>
    </div>
  );
}
