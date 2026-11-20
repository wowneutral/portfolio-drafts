// Draft 38: the gallery. A dark room where his two championships, his two design awards and the
// eight things he built hang as framed works; click one and the camera walks up to it.
// The room is remixed from pmndrs/examples "image-gallery" (MIT); see Room.tsx.
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/wght.css';
import '@fontsource-variable/bodoni-moda/wght-italic.css';
import '@fontsource-variable/instrument-sans/wght.css';
import './gallery.css';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { ago, useGitHub } from '@/lib/github';
import { formatDate, useNotes } from '@/lib/notes';
import { scrollToId } from '@/lib/scroll';
import { coarse, isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { fromHash, ITEMS, type Item } from './data';

const Room = lazy(() => import('./Room'));
const BASE = import.meta.env.BASE_URL;
const PAPER = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; epigraph: { text: string; source: string }; pages: number };

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const Ext = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

/** The championship as a DOM plate, for the flat hang. */
function FlatPlate({ i }: { i: number }) {
  const w = DEBATE.wins[i];
  return (
    <span className="fplate">
      <span className="fplate-t">{w.title}</span>
      <span className="fplate-e">{w.event}</span>
      <span className="fplate-w">{w.where}, {w.when}</span>
    </span>
  );
}

/** What the panel says about one frame. */
function Label({ item }: { item: Item }) {
  if (item.kind === 'work') {
    const w = WORK[item.idx];
    return (
      <>
        <p className="lb-kind">{w.kind}</p>
        <p className="lb-line">{w.line}</p>
        <p className="lb-stack">{w.stack}</p>
        {w.href
          ? <Ext className="lb-go" href={w.href}>Open {w.name}</Ext>
          : <p className="lb-stack">No public link.</p>}
      </>
    );
  }
  if (item.kind === 'award') {
    const a = AWARDS[item.idx];
    return (
      <>
        <p className="lb-kind">WD Awards</p>
        <p className="lb-line">{a.note}</p>
        <Ext className="lb-go" href={a.href}>See it on WD Awards</Ext>
      </>
    );
  }
  const w = DEBATE.wins[item.idx];
  const other = DEBATE.wins[1 - item.idx];
  return (
    <>
      <p className="lb-kind">{w.event}</p>
      <p className="lb-line">{w.where}, {w.when}. Also {other.title.toLowerCase()} in {other.event} at {other.where}.</p>
      <p className="lb-sub">{DEBATE.team.name}, {DEBATE.team.role.toLowerCase()}</p>
      <p className="lb-small">{DEBATE.team.line}</p>
      <p className="lb-small">{DEBATE.team.record}</p>
      <p className="lb-sub">Up next</p>
      <ul className="lb-next">
        {DEBATE.next.map((n) => <li key={n.where}>{n.event}, {n.where}</li>)}
      </ul>
      <Ext className="lb-go" href={DEBATE.team.href}>Visit Skeptical</Ext>
    </>
  );
}

function Panel({ active, pick, step, setPeek }: { active: number; pick: (i: number | null) => void; step: (d: number) => void; setPeek: (i: number) => void }) {
  const head = useRef<HTMLHeadingElement>(null);
  const last = useRef(-1);
  const list = useRef<HTMLOListElement>(null);
  const moved = useRef(false);
  useEffect(() => {
    if (!moved.current) { moved.current = true; last.current = active; return; }
    if (active >= 0) head.current?.focus({ preventScroll: true });
    else if (last.current >= 0) (list.current?.querySelectorAll('button')[last.current] as HTMLButtonElement | undefined)?.focus({ preventScroll: true });
    last.current = active;
  }, [active]);
  const item = ITEMS[active];
  return (
    <aside className="panel" aria-label="Wall label" data-lenis-prevent>
      {item ? (
        <div className="lb" key={item.id}>
          <div className="lb-bar">
            <button type="button" className="pbtn" onClick={() => pick(null)}>All twelve</button>
            <span className="lb-steps">
              <button type="button" className="pbtn" onClick={() => step(-1)} aria-label="Previous work">Prev</button>
              <button type="button" className="pbtn" onClick={() => step(1)} aria-label="Next work">Next</button>
            </span>
          </div>
          <p className="lb-n">{item.n} of 12</p>
          <h2 className="lb-name" ref={head} tabIndex={-1}>{item.kind === 'win' ? DEBATE.wins[item.idx].title : item.name}</h2>
          <Label item={item} />
        </div>
      ) : (
        <div className="guide">
          <h2 className="guide-h">Twelve works</h2>
          <p className="guide-p">{coarse ? 'Tap a frame or a name to walk up to it. Swipe the room to step.' : 'Choose a frame to walk up to it. Arrow keys step, Escape steps back.'}</p>
          <ol className="guide-list" ref={list}>
            {ITEMS.map((it, i) => (
              <li key={it.id}>
                <button type="button" onClick={() => { setPeek(-1); pick(i); }} onPointerEnter={() => setPeek(i)} onPointerLeave={() => setPeek(-1)} onFocus={() => setPeek(i)} onBlur={() => setPeek(-1)}>
                  <span className="gl-n">{it.n}</span>
                  <span className="gl-name">{it.name}</span>
                  <span className="gl-kind">{it.kind === 'work' ? WORK[it.idx].kind : it.kind === 'award' ? 'Design award' : 'Lincoln-Douglas'}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </aside>
  );
}

function Today() {
  const { notes, loaded } = useNotes();
  const [open, setOpen] = useState(0);
  const note = notes[open];
  return (
    <section className="wall today" id="today" aria-labelledby="today-h">
      <h2 id="today-h" className="wt">Today</h2>
      {note ? (
        <div className="today-grid">
          <p className="today-date">
            <span className="td-day">{formatDate(note.date, { day: 'numeric' })}</span>
            <span className="td-rest">{formatDate(note.date, { month: 'long', year: 'numeric' })}</span>
          </p>
          <div className="today-body">
            {note.body.map((p, i) => <p key={i}>{p}</p>)}
            {open > 0 && <button type="button" className="tbtn" onClick={() => setOpen(0)}>Back to the latest note</button>}
          </div>
          {notes.length > 1 && (
            <div className="today-earlier">
              <h3 className="te-h">Earlier notes</h3>
              <ul>
                {notes.map((n, i) => (
                  <li key={n.date}>
                    <button type="button" aria-pressed={i === open} onClick={() => setOpen(i)}>
                      <span className="te-d">{formatDate(n.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span className="te-x">{n.body[0]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="today-grid">
          <p className="today-date"><span className="td-day">{loaded ? 'Soon' : 'Today'}</span></p>
          <div className="today-body"><p>{loaded ? 'No note on the wall yet. Check back tomorrow.' : 'Bringing in today’s note.'}</p></div>
        </div>
      )}
    </section>
  );
}

function GitHubWall() {
  const gh = useGitHub();
  return (
    <section className="wall gh" id="github" aria-labelledby="gh-h">
      <div className="gh-side">
        <h2 id="gh-h" className="wt">Live from GitHub</h2>
        <p className="gh-state">{gh.live ? 'Read from GitHub as you opened this page.' : 'The repositories he keeps in the open.'}</p>
        {gh.commitsThisMonth !== null && <p className="gh-count"><span>{gh.commitsThisMonth}</span> commits this month</p>}
        <Ext className="lb-go" href={GITHUB.href}>github.com/{GITHUB.user}</Ext>
      </div>
      <div className="gh-label">
        {gh.activity.length > 0 && (
          <>
            <h3 className="gh-h3">Recent commits</h3>
            <ol className="gh-commits">
              {gh.activity.slice(0, 7).map((a) => (
                <li key={a.href}>
                  <a href={a.href} rel="noopener"><span className="gc-m">{a.message}</span></a>
                  <span className="gc-meta">{a.repo}, {ago(a.at)}</span>
                </li>
              ))}
            </ol>
          </>
        )}
        <h3 className="gh-h3">Repositories</h3>
        <ul className="gh-repos">
          {gh.repos.slice(0, 6).map((r) => (
            <li key={r.name}>
              <a href={r.href} rel="noopener" className="gr-name">{r.name}</a>
              {r.description && <span className="gr-d">{r.description}</span>}
              {r.language && <span className="gr-l">{r.language}</span>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function Gallery() {
  useVersion('gallery');
  const [webgl] = useState(hasWebGL);
  const flat = still || !webgl;
  const [phone, setPhone] = useState(isPhone);
  const [active, setActive] = useState(() => ITEMS.findIndex((x) => x.id === fromHash(location.hash)));
  const [running, setRunning] = useState(true);
  const [peek, setPeek] = useState(-1);
  const room = useRef<HTMLElement>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const on = () => setPhone(isPhone());
    const hash = () => setActive(ITEMS.findIndex((x) => x.id === fromHash(location.hash)));
    window.addEventListener('resize', on);
    window.addEventListener('hashchange', hash);
    return () => { window.removeEventListener('resize', on); window.removeEventListener('hashchange', hash); };
  }, []);

  const pick = useCallback((i: number | null) => {
    const next = i === null ? -1 : i;
    if (next === activeRef.current) return;
    if (next < 0) history.pushState(null, '', location.pathname + location.search);
    else history.pushState(null, '', '#/' + ITEMS[next].id);
    setActive(next);
  }, []);
  const step = useCallback((d: number) => {
    const a = activeRef.current;
    pick(a < 0 ? (d > 0 ? 0 : ITEMS.length - 1) : (a + d + ITEMS.length) % ITEMS.length);
  }, [pick]);

  // Back and forward walk the room too.
  useEffect(() => {
    const pop = () => setActive(ITEMS.findIndex((x) => x.id === fromHash(location.hash)));
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);

  // Arrow keys and Escape, while the room is on screen.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input,textarea,select,[contenteditable]')) return;
      const r = room.current?.getBoundingClientRect();
      if (!r || r.bottom < innerHeight * 0.4) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      else if (e.key === 'Escape' && activeRef.current >= 0) pick(null);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [pick, step]);

  // Stop drawing the room when it is scrolled away.
  useEffect(() => {
    const el = room.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // A horizontal swipe on the room steps frame to frame (phones).
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);
  const down = (e: React.PointerEvent) => { swipe.current = { x: e.clientX, y: e.clientY }; dragged.current = false; };
  const up = (e: React.PointerEvent) => {
    const s = swipe.current; swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    dragged.current = Math.hypot(dx, dy) > 8;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) step(dx < 0 ? 1 : -1);
  };
  // A click in the room that ends a drag is not a choice.
  const roomPick = useCallback((i: number | null) => { if (!dragged.current) pick(i); }, [pick]);

  const walkTo = (i: number) => { scrollToId('room'); pick(i); };

  return (
    <div className="v-gallery">
      <a className="skip-x" href="#main">Skip to content</a>
      <main id="main">
        <section className="room" id="room" ref={room} aria-labelledby="name-h">
          <header className="room-head">
            <div className="title-wall">
              <h1 id="name-h">{PERSON.name}</h1>
              <p className="pline">{PERSON.line}</p>
            </div>
            <nav className="rnav" aria-label="Sections">
              <a href="#debate" onClick={(e) => { e.preventDefault(); scrollToId('debate'); }}>Debate</a>
              <a href="#checklist" onClick={(e) => { e.preventDefault(); scrollToId('checklist'); }}>Work</a>
              <a href="#today" onClick={(e) => { e.preventDefault(); scrollToId('today'); }}>Today</a>
              <a href="#research" onClick={(e) => { e.preventDefault(); scrollToId('research'); }}>Research</a>
              <a href="#github" onClick={(e) => { e.preventDefault(); scrollToId('github'); }}>GitHub</a>
              <a href="#contact" onClick={(e) => { e.preventDefault(); scrollToId('contact'); }}>Contact</a>
            </nav>
          </header>
          <div className="stage" onPointerDown={down} onPointerUp={up}>
            {flat ? (
              <ul className="hang" aria-label="The twelve works">
                {ITEMS.map((it, i) => (
                  <li key={it.id} className={it.kind === 'work' ? 'h-work' : 'h-tall'}>
                    <button type="button" aria-pressed={i === active} onClick={() => pick(i === active ? null : i)}>
                      {it.img ? <img src={BASE + it.img} alt={it.name} loading="lazy" /> : <FlatPlate i={it.idx} />}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <Suspense fallback={null}>
                <Room active={active} peek={peek} pick={roomPick} phone={phone} running={running} />
              </Suspense>
            )}
          </div>
          <Panel active={active} pick={pick} step={step} setPeek={setPeek} />
        </section>

        <section className="wall debate" id="debate" aria-labelledby="debate-h">
          <h2 id="debate-h" className="wt">Two titles this fall</h2>
          <div className="wins">
            {DEBATE.wins.map((w, i) => (
              <article className="win" key={w.where}>
                <h3 className="win-t">{w.title}</h3>
                <p className="win-e">{w.event}</p>
                <p className="win-w">{w.where}, {w.when}</p>
                <button type="button" className="tbtn" onClick={() => walkTo(5 + i)}>See the plate</button>
              </article>
            ))}
          </div>
          <div className="team">
            <div className="team-main">
              <h3 className="team-n">{DEBATE.team.name}</h3>
              <p className="team-r">{DEBATE.team.role}</p>
              <p className="team-l">{DEBATE.team.line}</p>
              <p className="team-rec">{DEBATE.team.record}</p>
              <Ext className="lb-go" href={DEBATE.team.href}>skeptical.pages.dev</Ext>
            </div>
            <div className="next">
              <h3 className="next-h">Up next</h3>
              <ul>
                {DEBATE.next.map((n) => (
                  <li key={n.where}><span className="nx-w">{n.where}</span><span className="nx-e">{n.event}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="wall checklist" id="checklist" aria-labelledby="check-h">
          <h2 id="check-h" className="wt">The checklist</h2>
          <p className="wl-lede">The eight works on the wall, with where to find them.</p>
          <ol className="cl">
            {WORK.map((w) => {
              const i = ITEMS.findIndex((x) => x.id === 'work/' + w.slug);
              return (
                <li className="cl-row" key={w.slug}>
                  <img className="cl-img" src={BASE + w.img} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={660} />
                  <div className="cl-id">
                    <span className="cl-n">{ITEMS[i].n}</span>
                    <h3 className="cl-name">{w.name}</h3>
                    <p className="cl-kind">{w.kind}</p>
                  </div>
                  <p className="cl-line">{w.line}</p>
                  <div className="cl-meta">
                    <p className="cl-stack">{w.stack}</p>
                    {w.href ? <Ext className="cl-go" href={w.href}>Open the site</Ext> : <p className="cl-stack">No public link</p>}
                    <button type="button" className="tbtn" onClick={() => walkTo(i)}>Find it on the wall</button>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <Today />

        <section className="wall about" id="about" aria-labelledby="about-h">
          <h2 id="about-h" className="wt">About</h2>
          <div className="about-cols">
            <p className="about-lead">{PERSON.about[0]}</p>
            <div>
              <p>{PERSON.about[1]}</p>
              <p className="about-aside">{PERSON.aside}</p>
            </div>
          </div>
        </section>

        <section className="wall research" id="research" aria-labelledby="res-h">
          <p className="res-status">{PAPER.status}, {PAPER.pages} pages</p>
          <h2 id="res-h" className="res-t">{PAPER.title}</h2>
          <div className="res-grid">
            <div>
              <p className="res-abs">{PAPER.abstract}</p>
              <p className="res-kw"><span>Keywords</span> {PAPER.keywords.join(', ')}</p>
            </div>
            <div className="res-side">
              <ul className="res-links">
                {PAPER.links.map((l) => <li key={l.label}><Ext href={l.href}>{l.label}</Ext></li>)}
              </ul>
              <blockquote className="res-epi">
                <p>{PAPER.epigraph.text}</p>
                <cite>{PAPER.epigraph.source}</cite>
              </blockquote>
            </div>
          </div>
          <article className="wesso">
            <h3>{RESEARCH[1].title}</h3>
            <p className="res-status">{RESEARCH[1].status}</p>
            <p>{RESEARCH[1].abstract}</p>
          </article>
        </section>

        <GitHubWall />

        <section className="wall now" id="now" aria-labelledby="now-h">
          <h2 id="now-h" className="wt">Now</h2>
          <p className="now-status">{NOW.status}</p>
          <div className="now-grid">
            <div>
              <h3 className="now-t">{NOW.reading.title}</h3>
              <p>{NOW.reading.body}</p>
              <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <h3 className="now-t">{NOW.club.title}</h3>
              <p>{NOW.club.body}</p>
            </div>
          </div>
        </section>

        <section className="wall record" id="record" aria-labelledby="rec-h">
          <h2 id="rec-h" className="wt">Record</h2>
          <div className="rec-grid">
            <ol className="honors">
              {HONORS.map((h) => <li key={h.what}><span className="h-what">{h.what}</span><span className="h-det">{h.detail}</span></li>)}
            </ol>
            <div className="certs">
              {AWARDS.map((a) => (
                <a className="cert" key={a.site} href={a.href} rel="noopener">
                  <img src={BASE + a.img} alt={`WD Awards certificate for ${a.site}`} loading="lazy" width={720} height={1018} />
                  <span className="cert-s">{a.site}</span>
                  <span className="cert-n">{a.note}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="wall off" id="off" aria-labelledby="off-h">
          <h2 id="off-h" className="wt">Off the record</h2>
          <div className="off-grid">
            <div><h3>Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider}, {c.title}.</strong> {c.note}</li>)}</ul></div>
          </div>
        </section>

        <section className="wall contact" id="contact" aria-labelledby="contact-h">
          <h2 id="contact-h" className="wt">Contact</h2>
          <ul className="links">
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="lk-l">{l.label}</span>
                {l.href ? <Ext className="lk-v" href={l.href}>{l.value}</Ext> : <span className="lk-v">{l.value}</span>}
              </li>
            ))}
          </ul>
        </section>
      </main>
      <footer className="foot">
        <p>Draft 38 of the portfolio. Not the live site.</p>
        <p>The room is built on the image gallery example from pmndrs (MIT).</p>
        <a href="#room" onClick={(e) => { e.preventDefault(); scrollToId('room'); }}>Back to the room</a>
      </footer>
    </div>
  );
}
