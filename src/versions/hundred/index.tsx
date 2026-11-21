// Draft 69: the hundred. The ring of the hundred drafts of the Skeptical site
// (remixed from pmndrs/examples "cards", MIT) turns once from the top of the page
// to the bottom; his eight shipped projects stand in front of it, and at the end
// the hundred fold into the one that shipped.
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import '@fontsource/schibsted-grotesk/500.css';
import '@fontsource/schibsted-grotesk/700.css';
import '@fontsource/schibsted-grotesk/900.css';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import './hundred.css';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, STATS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { gsap } from '@/lib/scroll';
import { clamp, isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import NAMES from './names.json';
import { lift, marks, riffle } from './stage';

const Ring = lazy(() => import('./Ring'));
const BASE = import.meta.env.BASE_URL;
const DRAFTS = WORK[7];
const ALLD = NAMES as { slug: string; n: number; name: string; kind: string }[];

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const Ext = ({ href, className, children, label }: { href: string; className?: string; children: React.ReactNode; label?: string }) => (
  <a className={className} href={href} aria-label={label} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

/** The still contact sheet of the hundred: one atlas, a hundred cells. */
function Sheet() {
  return (
    <div className="sheet" aria-hidden="true">
      {ALLD.map((d, i) => (
        <span key={d.slug} style={{ backgroundImage: `url(${BASE}hundred/atlas.webp)`, backgroundPosition: `${((i % 10) / 9) * 100}% ${(Math.floor(i / 10) / 9) * 100}%` }} />
      ))}
    </div>
  );
}

export default function Hundred() {
  useVersion('hundred');
  const root = useRef<HTMLDivElement>(null);
  const work = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const contact = useRef<HTMLElement>(null);
  const col = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const flat = still || !webgl;
  const [phone, setPhone] = useState(isPhone);
  const [src, setSrc] = useState<HTMLElement | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const { notes, loaded } = useNotes();
  const [noteAt, setNoteAt] = useState(0);
  const gh = useGitHub();
  const onActive = useCallback((i: number | null) => setActive(i), []);

  useEffect(() => { setSrc(root.current); }, []);

  // Measure the sections the ring keys off.
  useEffect(() => {
    const measure = () => {
      const ph = isPhone();
      setPhone(ph);
      marks.phone = ph;
      const y = (el: Element | null) => (el ? el.getBoundingClientRect().top + window.scrollY : 0);
      const H = window.innerHeight;
      const max = document.documentElement.scrollHeight - H;
      marks.heroEnd = H;
      if (work.current) { marks.workStart = y(work.current); marks.workEnd = marks.workStart + work.current.offsetHeight - H; }
      if (contact.current) { const c = y(contact.current); marks.foldEnd = Math.min(max - 10, c - H * 0.15); marks.foldStart = Math.min(marks.foldEnd - 200, c - H * 0.95); }
      marks.colRight = col.current ? col.current.getBoundingClientRect().right : 0;
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (root.current) ro.observe(root.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  // Work: the eight come in from the right and turn to face you, in a row in front of the hundred.
  useEffect(() => {
    if (flat) return;
    const tick = () => {
      const t = track.current; if (!t) return;
      const cards = t.children as HTMLCollectionOf<HTMLElement>;
      if (isPhone()) { t.style.transform = ''; for (const c of cards) c.style.transform = ''; return; }
      const W = window.innerWidth;
      const span = Math.max(1, marks.workEnd - marks.workStart);
      const w = clamp((window.scrollY - marks.workStart) / span);
      const end = W - t.scrollWidth - W * 0.05;
      const x = (1 - w) * W * 0.5 + w * end;
      t.style.transform = `translate3d(${x}px,0,0)`;
      for (let i = 0; i < cards.length; i++) {
        const c = cards[i];
        const cx = x + c.offsetLeft + c.offsetWidth / 2;
        const r = clamp((cx - W * 0.7) / (W * 0.35));
        c.style.transform = `rotateY(${-68 * r * r}deg) translateZ(${-120 * r}px)`;
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [flat]);

  const note = notes[Math.min(noteAt, Math.max(0, notes.length - 1))];
  const behind = 'skeptical-draft2';
  const act = active !== null && active >= 0 ? ALLD[active] : null;

  return (
    <div className={`v-hundred${flat ? ' is-flat' : ''}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      {!flat && src && (
        <div className="ring" aria-hidden="true">
          <Suspense fallback={null}><Ring onActive={onActive} source={src} /></Suspense>
        </div>
      )}

      <header className="hero">
        <div className="hero-top">
          <h1>Armaan Seth</h1>
          <p className="hero-line">{PERSON.line}</p>
          <nav className="toc" aria-label="Sections">
            <a href="#debate">Debate</a><a href="#research">Research</a><a href="#work">Work</a><a href="#today">Today</a><a href="#contact">Contact</a>
          </nav>
        </div>
        {flat && <Sheet />}
        <div className="hero-foot">
          <p className="hero-work">{DRAFTS.line}</p>
          <p className="hero-hint">
            {flat ? 'The hundred drafts of his debate team’s site.' : phone ? 'Tap a draft to lift it, tap again to open the hundred.' : 'Point at a draft to lift it. Click to open the hundred.'}
          </p>
          <p className="sr-only-x live" aria-live="polite">{act ? `${act.name}, draft ${act.n}` : ''}</p>
        </div>
        <nav className="keys" aria-label="The hundred drafts">
          <ul>
            {ALLD.map((d, i) => (
              <li key={d.slug}>
                <a href={DRAFTS.href ?? '#'} target="_blank" rel="noopener" onFocus={() => (lift.focus = i)} onBlur={() => (lift.focus = -1)}>
                  {d.name}, draft {d.n} of the Skeptical site
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main">
        <div className="col" ref={col}>
          <section className="debate" id="debate" aria-labelledby="h-debate">
            <h2 id="h-debate" className="sec">Debate</h2>
            <ol className="wins">
              {DEBATE.wins.map((w) => (
                <li key={w.where}>
                  <p className="win-title">{w.title}</p>
                  <p className="win-event">{w.event}</p>
                  <p className="win-where">{w.where}, {w.when}</p>
                </li>
              ))}
            </ol>
            <div className="next">
              <h3>Up next</h3>
              <ul>{DEBATE.next.map((n) => <li key={n.where}><span>{n.where}</span> {n.event}</li>)}</ul>
            </div>
            <div className="team">
              <h3 className="team-name">{DEBATE.team.name}</h3>
              <p className="team-role">{DEBATE.team.role}</p>
              <p>{DEBATE.team.line}</p>
              <p className="team-record">{DEBATE.team.record}</p>
              <Ext className="go" href={DEBATE.team.href}>skeptical.pages.dev</Ext>
            </div>
          </section>

          <section className="about" aria-labelledby="h-about">
            <h2 id="h-about" className="sec">About</h2>
            {PERSON.about.map((p) => <p key={p.slice(0, 20)} className="lede">{p}</p>)}
            <p className="aside">{PERSON.aside}</p>
            <ul className="stats">{STATS.map((s) => <li key={s.label}><b>{s.to}{s.suffix}</b> {s.label}</li>)}</ul>
          </section>

          <section className="research" id="research" aria-labelledby="h-research">
            <h2 id="h-research" className="sec">Research</h2>
            <p className="r-status">{RESEARCH[0].status}, {RESEARCH[0].pages} pages</p>
            <h3 className="r-title">{RESEARCH[0].title}</h3>
            <p className="lede">{RESEARCH[0].abstract}</p>
            <p className="keywords"><span>Keywords</span> {(RESEARCH[0].keywords ?? []).join(', ')}</p>
            <ul className="r-links">{RESEARCH[0].links.map((l) => <li key={l.label}><Ext href={l.href}>{l.label}</Ext></li>)}</ul>
            <div className="wess">
              <h3>{RESEARCH[1].title}</h3>
              <p>{RESEARCH[1].abstract}</p>
              <p className="r-status">{RESEARCH[1].status}</p>
            </div>
          </section>
        </div>

        <section className="work" id="work" ref={work} aria-labelledby="h-work">
          <div className="work-stage">
            <div className="work-head" data-solid>
              <h2 id="h-work" className="sec">Work</h2>
              <p>Eight that shipped, standing in front of the hundred drafts.</p>
            </div>
            <div className="track" ref={track}>
              {WORK.map((w) => (
                <article key={w.slug} className="proj" data-solid>
                  <img src={BASE + w.img} alt={`${w.name}, screenshot`} loading="lazy" width={1200} height={660} />
                  <div className="proj-text">
                    <p className="proj-kind">{w.n} {w.kind}</p>
                    <h3>{w.name}</h3>
                    <p className="proj-line">{w.line}</p>
                    <p className="proj-stack">{w.stack}</p>
                    {w.href ? <Ext className="go" href={w.href}>{w.href.replace(/^https:\/\//, '').replace(/\/$/, '')}</Ext> : <p className="go none">No public link</p>}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="col">
          <section className="today" id="today" aria-labelledby="h-today">
            <h2 id="h-today" className="sec">Today</h2>
            {!loaded ? (
              <p className="note-wait">Opening today’s note.</p>
            ) : !note ? (
              <p className="note-body">No note yet today. Check back tomorrow.</p>
            ) : (
              <article className="note">
                <p className="note-date"><time dateTime={note.date}>{formatDate(note.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></p>
                {note.body.map((b) => <p key={b.slice(0, 24)} className="note-body">{b}</p>)}
              </article>
            )}
            {notes.length > 1 && (
              <div className="earlier">
                <h3>Earlier notes</h3>
                <ul>
                  {notes.map((n, i) => (
                    <li key={n.date}>
                      <button type="button" aria-pressed={i === noteAt} onClick={() => setNoteAt(i)}>{formatDate(n.date)}</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="gh" aria-labelledby="h-gh">
            <h2 id="h-gh" className="sec">Live from GitHub</h2>
            {gh.activity.length > 0 && (
              <ol className="commits">
                {gh.activity.slice(0, 6).map((a) => (
                  <li key={a.href}>
                    <a href={a.href} target="_blank" rel="noopener"><span className="c-msg">{a.message}</span> <span className="c-meta">{a.repo}, {ago(a.at)}</span></a>
                  </li>
                ))}
              </ol>
            )}
            <ul className="repos">
              {gh.repos.slice(0, 6).map((r) => (
                <li key={r.name} className={r.name === behind ? 'is-behind' : undefined}>
                  <a href={r.href} target="_blank" rel="noopener" onMouseEnter={r.name === behind ? riffle : undefined} onFocus={r.name === behind ? riffle : undefined}>
                    <span className="r-name">{r.name}</span>
                    {r.description && <span className="r-desc">{r.description}</span>}
                    <span className="r-meta">{r.language ?? 'Repository'}{r.pushedAt ? `, pushed ${ago(r.pushedAt)}` : ''}{r.name === behind ? '. The repo behind the ring.' : ''}</span>
                  </a>
                </li>
              ))}
            </ul>
            <Ext className="go" href={GITHUB.href}>github.com/{GITHUB.user}</Ext>
          </section>

          <section className="now" aria-labelledby="h-now">
            <h2 id="h-now" className="sec">Now</h2>
            <p className="now-status">{NOW.status}</p>
            <div className="now-two">
              <div>
                <h3>{NOW.reading.title}</h3>
                <p>{NOW.reading.body}</p>
                <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
              <div>
                <h3>{NOW.club.title}</h3>
                <p>{NOW.club.body}</p>
              </div>
            </div>
          </section>

          <section className="record" aria-labelledby="h-record">
            <h2 id="h-record" className="sec">Record</h2>
            <ol className="honors">{HONORS.map((h) => <li key={h.what}><span>{h.what}</span> <span className="h-d">{h.detail}</span></li>)}</ol>
            <div className="awards">
              {AWARDS.map((a) => (
                <Ext key={a.site} href={a.href} className="award">
                  <img src={BASE + a.img} alt={`Certificate, ${a.site}`} loading="lazy" width={720} height={1018} />
                  <span className="a-site">{a.site}</span>
                  <span className="a-note">{a.note}</span>
                </Ext>
              ))}
            </div>
          </section>

          <section className="off" aria-labelledby="h-off">
            <h2 id="h-off" className="sec">Off the record</h2>
            <div className="off-grid">
              <div><h3>Likes</h3><ul>{LIKES.map((l) => <li key={l}>{l}</li>)}</ul></div>
              <div><h3>Dislikes</h3><ul>{DISLIKES.map((l) => <li key={l}>{l}</li>)}</ul></div>
              <div><h3>Favourites</h3><ul>{FAVOURITES.map((l) => <li key={l}>{l}</li>)}</ul></div>
              <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}>{c.provider}, {c.title}. {c.note}</li>)}</ul></div>
            </div>
          </section>

          <section className="contact" id="contact" ref={contact} aria-labelledby="h-contact">
            <h2 id="h-contact" className="sec">The one worth shipping</h2>
            <p className="lede">A hundred drafts, folded into one. On top: <Ext href={WORK[1].href}>Skeptical, as it shipped</Ext>.</p>
            <ul className="links">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <span className="l-label">{l.label}</span>
                  {l.href ? <Ext href={l.href}>{l.value}</Ext> : <span className="l-val">{l.value}</span>}
                </li>
              ))}
            </ul>
          </section>
          {flat && (
            <figure className="shipped-flat">
              <img src={BASE + WORK[1].img} alt="Skeptical, the site as it shipped" loading="lazy" width={1200} height={660} />
            </figure>
          )}
        </div>
      </main>

      <footer className="foot">
        <p>Draft 69 of the portfolio. Not the live site.</p>
        <p>The ring is remixed from the pmndrs cards example (MIT). The hundred thumbnails are his drafts of the Skeptical site.</p>
      </footer>
    </div>
  );
}
