// Draft 100. The space is remixed from edoardolunardi/infinite-canvas (Codrops "Infinite Canvas", MIT); see Scene.tsx and space.ts.
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import '@fontsource-variable/bricolage-grotesque/index.css';
import '@fontsource-variable/newsreader/index.css';
import '@fontsource-variable/newsreader/wght-italic.css';
import './hundredth.css';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { caption, loadDrafts, SKEPTICAL_DRAFTS, type Drafts, type Sheet } from './space';
import type { Hover } from './Scene';

const Scene = lazy(() => import('./Scene'));
const BASE = import.meta.env.BASE_URL;
const DRAFTS_LINE = WORK[7].line;

function hasWebGL() {
  if (typeof document === 'undefined') return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

function useDrafts() {
  const [d, set] = useState<Drafts | null>(null);
  useEffect(() => { let live = true; loadDrafts().then((x) => live && set(x)).catch(() => {}); return () => { live = false; }; }, []);
  return d;
}

/** One print from an atlas, as CSS: for the contact sheet and the phone strips. */
function Cell({ sheet, i }: { sheet: Sheet; i: number }) {
  const it = sheet.items[i % sheet.items.length];
  const c = it.cell % sheet.cols, r = Math.floor(it.cell / sheet.cols);
  return (
    <span className="cell" style={{
      backgroundImage: `url(${BASE}hundredth/${sheet.file})`,
      backgroundSize: `${(sheet.w / 320) * 100}% ${(sheet.h / 200) * 100}%`,
      backgroundPosition: `${(c / Math.max(1, sheet.w / 320 - 1)) * 100}% ${(r / Math.max(1, sheet.h / 200 - 1)) * 100}%`,
    }} />
  );
}

/** No WebGL or reduced motion: the space becomes a still contact sheet with the empty frame in the middle. */
function ContactSheet({ drafts, phone }: { drafts: Drafts | null; phone: boolean }) {
  const cols = phone ? 4 : 9, rows = phone ? 5 : 5, mid = Math.floor((cols * rows) / 2);
  if (!drafts) return <div className="sheet" aria-hidden="true" />;
  return (
    <div className="sheet" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: cols * rows }, (_, i) => i === mid
        ? <span key={i} className="cell empty" />
        : <Cell key={i} sheet={i % 2 && !phone ? drafts.skeptical : drafts.portfolio} i={i * 7} />)}
    </div>
  );
}

function Strip({ drafts, seed }: { drafts: Drafts | null; seed: number }) {
  if (!drafts) return <div className="strip" aria-hidden="true" />;
  return <div className="strip" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <Cell key={i} sheet={(seed + i) % 2 ? drafts.skeptical : drafts.portfolio} i={seed * 11 + i * 5} />)}</div>;
}

function Today() {
  const { notes, loaded } = useNotes();
  const [latest, ...earlier] = notes;
  return (
    <section className="today" id="today" aria-labelledby="today-h">
      <div className="today-head">
        <h2 id="today-h" className="h2">Today</h2>
        <p className="lede">His daily note, newest first.</p>
      </div>
      {latest ? (
        <article className="note">
          <p className="note-date"><time dateTime={latest.date}>{formatDate(latest.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></p>
          <div className="note-body">{latest.body.map((p, i) => <p key={i}>{p}</p>)}</div>
        </article>
      ) : (
        <article className="note">
          <p className="note-date">{loaded ? 'No note yet' : 'Today'}</p>
          <div className="note-body"><p>{loaded ? 'The first note goes here as soon as he writes it.' : 'Fetching the latest note.'}</p></div>
        </article>
      )}
      {earlier.length > 0 && (
        <details className="earlier">
          <summary><span>Earlier notes</span><span className="count">{earlier.length}</span></summary>
          <ol>
            {earlier.map((n) => (
              <li key={n.date}>
                <time dateTime={n.date}>{formatDate(n.date)}</time>
                <div>{n.body.map((p, i) => <p key={i}>{p}</p>)}</div>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}

function GitHubLive() {
  const gh = useGitHub();
  const has = gh.activity.length > 0;
  return (
    <section className="gh" id="github" aria-labelledby="gh-h">
      <h2 id="gh-h" className="h2">Live from GitHub</h2>
      <div className="gh-grid">
        <div className="gh-figure">
          {gh.commitsThisMonth !== null ? (
            <>
              <p className="big-n">{gh.commitsThisMonth}</p>
              <p className="gh-cap">commits pushed this month</p>
            </>
          ) : (
            <>
              <p className="big-n">{gh.repos.length}</p>
              <p className="gh-cap">repositories he is working in</p>
            </>
          )}
          <a className="ln" href={GITHUB.href}>github.com/{GITHUB.user}</a>
        </div>
        <div className="gh-lists">
          {has && (
            <div>
              <h3 className="h3">Recent commits</h3>
              <ol className="commits">
                {gh.activity.slice(0, 6).map((a, i) => (
                  <li key={i}><a href={a.href}><span className="msg">{a.message}</span><span className="meta">{a.repo}, {ago(a.at)}</span></a></li>
                ))}
              </ol>
            </div>
          )}
          <div>
            <h3 className="h3">Repositories</h3>
            <ul className="repos">
              {gh.repos.slice(0, 6).map((r) => (
                <li key={r.name}><a href={r.href}><span className="rn">{r.name}</span><span className="rd">{r.description ?? ''}</span>{r.language && <span className="meta">{r.language}{r.pushedAt ? `, pushed ${ago(r.pushedAt)}` : ''}</span>}</a></li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function WorkPlate({ w }: { w: (typeof WORK)[number] }) {
  return (
    <>
      <p className="kind">{w.kind}</p>
      <h3 className="wname">{w.name}</h3>
      <p className="wline">{w.line}</p>
      <p className="stack">{w.stack}</p>
      {w.href ? <a className="ln" href={w.href}>Open {w.name}</a> : <p className="stack">No public link</p>}
    </>
  );
}

export default function Hundredth() {
  useVersion('hundredth');
  const navigate = useNavigate();
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  const flat = still || !webgl;
  const drafts = useDrafts();
  const band = useRef<HTMLDivElement>(null);
  const cap = useRef<HTMLParagraphElement>(null);
  const workTrack = useRef<HTMLDivElement>(null);
  const closeBand = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<Hover>(null);
  const [filled, setFilled] = useState(flat);

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  const pick = useCallback((h: NonNullable<Hover>) => {
    if (h.team) window.open(SKEPTICAL_DRAFTS, '_blank', 'noopener');
    else navigate(`/${h.item.slug}`);
  }, [navigate]);
  const onFilled = useCallback(() => setFilled(true), []);

  return (
    <div className="v-hundredth">
      <a className="skip-x" href="#main">Skip to the portfolio</a>

      <header className="opening">
        <div className={`band${hover && hover.item.cell >= 0 ? ' is-pointing' : ''}`} ref={band} tabIndex={flat ? -1 : 0} role="region" aria-label="The space of drafts" aria-describedby="space-help">
          {flat ? <ContactSheet drafts={drafts} phone={phone} /> : (
            <Suspense fallback={null}>
              <Scene mode="open" phone={phone} area={band} caption={cap} onHover={setHover} onPick={pick} />
            </Suspense>
          )}
          <p className={`cap${hover ? ' is-on' : ''}`} ref={cap} aria-hidden="true">{hover ? caption(hover.item, hover.team) : ''}</p>
          <p id="space-help" className="sr-only-x sr-only">Prints of every earlier draft of this site and of his team’s site, floating in space. With focus here, the arrow keys or W, A, S and D fly through it. The list of drafts that follows links to each one.</p>
        </div>

        <div className="plate">
          <nav className="topnav" aria-label="Sections">
            <a href="#debate">Debate</a><a href="#work">Work</a><a href="#today">Today</a><a href="#research">Research</a><a href="#contact">Contact</a>
          </nav>
          <h1 className="name">{PERSON.name}</h1>
          <div className="plate-side">
            <p className="line">{PERSON.line}</p>
            <p className="draft-n">Draft 100 of the portfolio.</p>
            <p className="hint">{flat ? 'Prints of earlier drafts of this site and of his team’s site.' : phone ? 'Swipe sideways to fly. Scroll for the portfolio.' : 'Drag to fly. Scroll for the portfolio.'}</p>
          </div>
        </div>

        {drafts && (
          <nav className="sr-only-x sr-only" aria-label="Every draft">
            <h2>Every draft</h2>
            <ul>
              {drafts.portfolio.items.map((it) => <li key={'p' + it.slug}><Link to={`/${it.slug}`}>{caption(it, false)}</Link></li>)}
              {drafts.skeptical.items.map((it) => <li key={'s' + it.slug}><a href={SKEPTICAL_DRAFTS}>{caption(it, true)}</a></li>)}
            </ul>
          </nav>
        )}
      </header>

      <main id="main">
        <section className="what" aria-label="What the prints are">
          <p>The prints above are drafts of this site and of his team’s site. How he works, in his words:</p>
          <blockquote>{DRAFTS_LINE}</blockquote>
        </section>

        <section className="about" aria-labelledby="about-h">
          <h2 id="about-h" className="h2">About</h2>
          <div className="about-body">
            {PERSON.about.map((p, i) => <p key={i} className={i === 0 ? 'first' : ''}>{p}</p>)}
            <p className="aside">{PERSON.aside}</p>
          </div>
        </section>

        <section className="debate" id="debate" aria-labelledby="debate-h">
          <h2 id="debate-h" className="h2">Debate</h2>
          <ol className="wins">
            {DEBATE.wins.map((w, i) => (
              <li key={i} className="win">
                <p className="champ">{w.title}</p>
                <p className="ev">{w.event}, {w.where}, {w.when}</p>
              </li>
            ))}
          </ol>
          <div className="team">
            <div>
              <p className="role">{DEBATE.team.role}</p>
              <h3 className="team-name">{DEBATE.team.name}</h3>
            </div>
            <div className="team-body">
              <p>{DEBATE.team.line}</p>
              <p className="record">{DEBATE.team.record}</p>
              <a className="ln" href={DEBATE.team.href}>skeptical.pages.dev</a>
            </div>
          </div>
          <div className="next">
            <h3 className="h3">Up next</h3>
            <ul>{DEBATE.next.map((n, i) => <li key={i}><span className="where">{n.where}</span><span>{n.event}</span></li>)}</ul>
          </div>
        </section>

        <Today />

        <section className="research" id="research" aria-labelledby="paper-h">
          <h2 className="h2">Research</h2>
          <h3 id="paper-h" className="paper-title">{RESEARCH[0].title}</h3>
          <div className="paper-grid">
            <div>
              <p className="status">{RESEARCH[0].status}{RESEARCH[0].pages ? `, ${RESEARCH[0].pages} pages` : ''}</p>
              <p className="abstract">{RESEARCH[0].abstract}</p>
              <p className="keywords"><span className="kw-l">Keywords</span> {(RESEARCH[0].keywords ?? []).join(', ')}</p>
            </div>
            <ul className="paper-links">
              {RESEARCH[0].links.map((l) => <li key={l.label}><a href={l.href}>{l.label}</a></li>)}
            </ul>
          </div>
          <div className="wess">
            <h3 className="h3">{RESEARCH[1].title}</h3>
            <p className="status">{RESEARCH[1].status}</p>
            <p>{RESEARCH[1].abstract}</p>
          </div>
        </section>

        <section className="work" id="work" aria-labelledby="work-h">
          {flat || phone ? (
            <>
              <h2 id="work-h" className="h2 work-h-flat">Work</h2>
              <ol className="work-seq">
                {WORK.map((w, i) => (
                  <li key={w.slug}>
                    {!flat && <Strip drafts={drafts} seed={i} />}
                    <img src={BASE + w.img} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={700} />
                    <div className="wplate"><WorkPlate w={w} /></div>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <div className="flight" ref={workTrack}>
              <div className="flight-stage">
                <Suspense fallback={null}><Scene mode="work" phone={false} track={workTrack} /></Suspense>
              </div>
              <ol className="flight-plates">
                {WORK.map((w, i) => (
                  <li key={w.slug} className="fplate">
                    {i === 0 && <h2 id="work-h" className="h2">Work</h2>}
                    <WorkPlate w={w} />
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>

        <GitHubLive />

        <section className="now" aria-labelledby="now-h">
          <h2 id="now-h" className="h2">Now</h2>
          <p className="status-line">{NOW.status}</p>
          <div className="now-grid">
            <div>
              <h3 className="h3">{NOW.reading.title}</h3>
              <p>{NOW.reading.body}</p>
              <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <h3 className="h3">{NOW.club.title}</h3>
              <p>{NOW.club.body}</p>
            </div>
          </div>
        </section>

        <section className="record" aria-labelledby="record-h">
          <h2 id="record-h" className="h2">Record</h2>
          <div className="record-grid">
            <ol className="honors">{HONORS.map((h) => <li key={h.what}><span className="hw">{h.what}</span><span className="hd">{h.detail}</span></li>)}</ol>
            <div className="awards">
              {AWARDS.map((a) => (
                <a key={a.site} href={a.href} className="award">
                  <img src={BASE + a.img} alt={`Certificate: ${a.site}, ${a.note}`} loading="lazy" width={600} height={850} />
                  <span className="aw-site">{a.site}</span>
                  <span className="aw-note">{a.note}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="off" aria-labelledby="off-h">
          <h2 id="off-h" className="h2">Off the record</h2>
          <div className="off-grid">
            <div><h3 className="h3">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="h3">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="h3">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="h3">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider}, {c.title}.</strong> {c.note}</li>)}</ul></div>
          </div>
        </section>

        <section className="closing" id="contact" aria-labelledby="contact-h">
          <div className="close-band" ref={closeBand}>
            {flat ? (
              <div className="still-frame"><img src={`${BASE}hundredth/self.jpg`} alt="This page, the hundredth draft" width={1280} height={800} /></div>
            ) : (
              <Suspense fallback={null}><Scene mode="close" phone={phone} track={closeBand} onFilled={onFilled} /></Suspense>
            )}
          </div>
          <p className={`close-cap${filled ? ' is-filled' : ''}`}>The hundredth draft</p>
          <h2 id="contact-h" className="h2 contact-h">Contact</h2>
          <ul className="links">
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="ll">{l.label}</span>
                {l.href ? <a href={l.href}>{l.value}</a> : <span className="lv">{l.value}</span>}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="foot">
        <p>Draft 100 of the portfolio. Not the live site.</p>
        <p>The space is built on Infinite Canvas by Edoardo Lunardi, a Codrops tutorial, MIT licence. Set in Bricolage Grotesque and Newsreader.</p>
      </footer>
    </div>
  );
}
