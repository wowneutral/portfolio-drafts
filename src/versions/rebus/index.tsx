// The rebus, draft 90. Remixed from pmndrs/examples "view-tracking" (MIT): big DOM type with live 3D windows set inline between the words.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import '@fontsource-variable/familjen-grotesk/wght.css';
import './rebus.css';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { makeCtl, type Kind } from './ctl';

const BASE = import.meta.env.BASE_URL;
const LiveView = lazy(() => import('./Live').then((m) => ({ default: m.LiveView })));
const Port = lazy(() => import('./Live').then((m) => ({ default: m.Port })));

function hasWebGL() {
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const STILL: Record<Kind, string> = { watch: 'watch', stopped: 'stopped', plato: 'plato', apple: 'apple', tea: 'tea', armillary: 'armillary' };

/** A gap in the sentence. Something real stands in it. */
function Gap({ kind, label, live }: { kind: Kind; label: string; live: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const ctl = useMemo(() => makeCtl(still || !live), [live]);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);
  const [present, setPresent] = useState(true);
  const drag = useRef({ x: 0, t: 0, moved: 0, id: -1 });
  const onReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !live) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect(); } }, { rootMargin: '90% 0px 90% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [live]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !live || still) return;
    let timer = 0;
    // Each object acts once, when its sentence reaches the middle of the screen.
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || ctl.act) return;
      ctl.act = 1;
      if (kind === 'apple') timer = window.setTimeout(() => { ctl.present = false; setPresent(false); }, 1500);
      io.disconnect();
    }, { rootMargin: '-38% 0px -38% 0px' });
    io.observe(el);
    return () => { io.disconnect(); clearTimeout(timer); };
  }, [ctl, kind, live]);

  const handlers = live && !still ? {
    onPointerDown: (e: React.PointerEvent) => { drag.current = { x: e.clientX, t: performance.now(), moved: 0, id: e.pointerId }; ctl.drag = true; ctl.vel = 0; },
    onPointerMove: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); ctl.hx = ((e.clientX - r.left) / r.width) * 2 - 1; }
      if (!ctl.drag || e.pointerId !== drag.current.id) return;
      const dx = e.clientX - drag.current.x, now = performance.now(), dt = Math.max(1, now - drag.current.t);
      drag.current.moved += Math.abs(dx);
      if (drag.current.moved > 4 && e.pointerType === 'mouse') (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      ctl.yaw += dx * 0.011; ctl.vel = (dx * 0.011 * 1000) / dt;
      drag.current.x = e.clientX; drag.current.t = now;
    },
    onPointerUp: () => { ctl.drag = false; },
    onPointerLeave: () => { ctl.hx = 0; },
    onPointerCancel: () => { ctl.drag = false; },
    onLostPointerCapture: () => { ctl.drag = false; },
  } : {};

  const inner = (
    <>
      <img className="still" src={`${BASE}rebus/stills/${STILL[kind]}.webp`} alt="" draggable={false} decoding="async" />
      {live && near && (
        <Suspense fallback={null}>
          <LiveView kind={kind} ctl={ctl} onReady={onReady} />
        </Suspense>
      )}
    </>
  );
  const common = { className: `gap gap-${kind}`, 'data-ready': ready ? '' : undefined, 'data-gone': present ? undefined : '', ...handlers };

  if (kind === 'apple') {
    return (
      <button
        ref={ref as React.RefObject<HTMLButtonElement>}
        type="button"
        {...common}
        aria-pressed={!present}
        aria-label={present ? 'An apple. Press to take it away.' : 'Where the apple was. Press to put it back.'}
        onClick={() => { if (drag.current.moved > 8) return; const p = !present; ctl.present = p; setPresent(p); }}
      >
        {inner}
      </button>
    );
  }
  return <span ref={ref as React.RefObject<HTMLSpanElement>} role="img" aria-label={label} {...common}>{inner}</span>;
}

/** The last word and its object never part company at a line break. */
const Tail = ({ children }: { children: ReactNode }) => <span className="tail">{children}</span>;

const host = (href: string) => href.replace(/^https?:\/\//, '').replace(/\/$/, '');
const firstSentence = (p: string) => { const m = p.match(/^(.+?[.!?])\s+(.*)$/); return m ? [m[1], m[2]] : [p, '']; };

export default function Rebus() {
  useVersion('rebus');
  const [live] = useState(() => hasWebGL() && !still);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const paper = RESEARCH[0], wesso = RESEARCH[1];
  const keys = paper.keywords ?? [];

  const open = PERSON.about[0].split('. ')[1];
  const openWords = open.split(' ');
  const [platoA, platoB] = [DISLIKES[1].split('. ')[0] + '.', DISLIKES[1].split('. ').slice(1).join('. ')];
  const skep = LIKES[2], tea = FAVOURITES[3];
  const mail = LINKS[0];
  const otherLinks = LINKS.slice(1);
  const latest = notes[0];
  const [lead, rest] = latest ? firstSentence(latest.body[0]) : ['', ''];

  return (
    <div className="v-rebus" ref={setRoot}>
      <a className="skip-x" href="#main">Skip to content</a>
      {live && root && (
        <div aria-hidden="true">
          <Suspense fallback={null}>
            <Port root={root} />
          </Suspense>
        </div>
      )}

      <header className="top">
        <div className="who">
          <h1>{PERSON.name}</h1>
          <p>{PERSON.line}</p>
        </div>
        <nav aria-label="Sections">
          <a href="#today">Today</a>
          <a href="#debate">Debate</a>
          <a href="#research">Research</a>
          <a href="#work">Work</a>
          <a href="#github">GitHub</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <main id="main">
        <section className="opening" aria-label="Opening">
          <p className="say say-open">
            {openWords.slice(0, -1).join(' ')}{' '}
            <Tail>{openWords[openWords.length - 1]} <Gap kind="watch" label="A wristwatch, its seconds hand running" live={live} /></Tail>
          </p>
        </section>

        <section className="about band" aria-labelledby="about-h">
          <h2 id="about-h" className="label">About</h2>
          <div className="cols">
            <p>{PERSON.about[0]}</p>
            <p>{PERSON.about[1]}</p>
            <p className="aside">{PERSON.aside}</p>
          </div>
        </section>

        <section id="today" className="today band" aria-labelledby="today-h">
          <h2 id="today-h" className="label">Today</h2>
          <div className="today-body" aria-live="polite">
            {!loaded && <p className="note-date">Opening today’s note</p>}
            {loaded && !latest && <p className="note-date">No note posted yet. Check back tomorrow.</p>}
            {latest && (
              <article>
                <p className="note-date"><time dateTime={latest.date}>{formatDate(latest.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></p>
                <p className="say say-note">{lead}</p>
                {(rest || latest.body.length > 1) && (
                  <div className="note-rest">
                    {rest && <p>{rest}</p>}
                    {latest.body.slice(1).map((p, i) => <p key={i}>{p}</p>)}
                  </div>
                )}
              </article>
            )}
            {notes.length > 1 && (
              <details className="earlier">
                <summary>Earlier notes <span>{notes.length - 1}</span></summary>
                <ol>
                  {notes.slice(1).map((n) => (
                    <li key={n.date}>
                      <time dateTime={n.date}>{formatDate(n.date)}</time>
                      <div>{n.body.map((p, i) => <p key={i}>{p}</p>)}</div>
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </div>
        </section>

        <section id="debate" className="debate band" aria-labelledby="debate-h">
          <h2 id="debate-h" className="label">Debate</h2>
          <div className="wins">
            {DEBATE.wins.map((w) => (
              <p className="say say-win" key={w.where}>
                {w.title}. {w.event}, <span className="where">{w.where}, {w.when}.</span>
              </p>
            ))}
          </div>
          <div className="team">
            <div className="team-name">
              <p className="role">{DEBATE.team.role}</p>
              <h3><a href={DEBATE.team.href}>{DEBATE.team.name}</a></h3>
            </div>
            <div className="team-text">
              <p>{DEBATE.team.line}</p>
              <p>{DEBATE.team.record}</p>
              <p><a className="go" href={DEBATE.team.href}>{host(DEBATE.team.href)}</a></p>
            </div>
          </div>
          <div className="next">
            <h3>Up next</h3>
            <ul>
              {DEBATE.next.map((n) => <li key={n.where}><span>{n.event}</span> <span className="at">at {n.where}</span></li>)}
            </ul>
            <p className="status">{NOW.status}</p>
          </div>
        </section>

        <section className="plato" aria-label="A dislike">
          <p className="say say-plato">
            <Tail>{platoA} <Gap kind="plato" label="A marble bust of Plato, tipped over" live={live} /></Tail>{' '}
            {platoB}
          </p>
        </section>

        <section id="research" className="research band" aria-labelledby="research-h">
          <p className="say say-mid">
            {skep.split(' ').slice(0, -1).join(' ')}{' '}
            <Tail>{skep.split(' ').slice(-1)} <Gap kind="apple" label="An apple" live={live} /></Tail>
          </p>
          <h2 id="research-h" className="label">Research</h2>
          <div className="paper">
            <p className="paper-status">{paper.status}</p>
            <h3 className="paper-title">{paper.title}</h3>
            <p className="abstract">{paper.abstract}</p>
            <p className="keys">{keys.map((k, i) => <span key={k}>{k}{i < keys.length - 1 ? <span aria-hidden="true" className="sep"> / </span> : null}</span>)}</p>
            <ul className="paper-links">
              {paper.links.map((l) => <li key={l.label}><a href={l.href}>{l.label}</a></li>)}
            </ul>
          </div>
          <div className="wesso">
            <h3>{wesso.title}</h3>
            <p>{wesso.abstract}</p>
            <p className="paper-status">{wesso.status}</p>
          </div>
        </section>

        <section id="work" className="work band" aria-labelledby="work-h">
          <h2 id="work-h" className="label">Work</h2>
          <ul className="shots">
            {WORK.map((w) => (
              <li key={w.slug}>
                <figure>
                  {w.href ? (
                    <a href={w.href} className="pic" tabIndex={-1} aria-hidden="true"><img src={BASE + w.img} alt="" loading="lazy" width={1200} height={750} /></a>
                  ) : (
                    <span className="pic"><img src={BASE + w.img} alt="" loading="lazy" width={1200} height={750} /></span>
                  )}
                  <figcaption>
                    <h3>{w.href ? <a href={w.href}>{w.name}</a> : w.name}</h3>
                    <p className="kind">{w.kind}</p>
                    <p className="line">{w.line}</p>
                    <p className="stack">{w.stack}</p>
                    {w.href ? <a className="go" href={w.href}>{host(w.href)}</a> : <span className="go off">No public link</span>}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </section>

        <section id="github" className="github band" aria-labelledby="github-h">
          <h2 id="github-h" className="label">Live from GitHub</h2>
          <div className="gh">
            {gh.activity.length > 0 ? (
              <>
                <p className="run">
                  {gh.activity.map((a, i) => (
                    <span key={a.href + i}>
                      <a href={a.href}>{a.message}</a> <span className="meta">{a.repo}, {ago(a.at)}</span>
                      {i < gh.activity.length - 1 ? <span aria-hidden="true" className="sep"> / </span> : null}{' '}
                    </span>
                  ))}
                </p>
                <ul className="repos">
                  {gh.repos.slice(0, 8).map((r) => (
                    <li key={r.name}><a href={r.href}>{r.name}</a> <span>{r.description}</span> <span className="meta">{r.language}</span></li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="run">
                {gh.repos.slice(0, 8).map((r, i) => (
                  <span key={r.name}>
                    <a href={r.href}>{r.name}</a> <span>{r.description}</span> <span className="meta">{r.language}</span>
                    {i < Math.min(8, gh.repos.length) - 1 ? <span aria-hidden="true" className="sep"> / </span> : null}{' '}
                  </span>
                ))}
              </p>
            )}
            <p><a className="go" href={GITHUB.href}>{host(GITHUB.href)}</a></p>
          </div>
        </section>

        <section className="now band" aria-labelledby="now-h">
          <h2 id="now-h" className="label">Now</h2>
          <div className="now-body">
            <h3>{NOW.reading.title}</h3>
            <p className="shelves">{NOW.reading.shelves.map((s, i) => <span key={s}>{s}{i < NOW.reading.shelves.length - 1 ? ', ' : '.'}</span>)}</p>
            <p>{NOW.reading.body}</p>
            <h3>{NOW.club.title}</h3>
            <p><a className="go" href="#club">The last sentence on this page</a></p>
          </div>
        </section>

        <section className="record band" aria-labelledby="record-h">
          <h2 id="record-h" className="label">Record</h2>
          <ol className="honors">
            {HONORS.map((h, i) => <li key={h.what}>{h.what}, <span className="soft">{h.detail}</span>{i < HONORS.length - 1 ? <span aria-hidden="true" className="sep"> / </span> : '.'}</li>)}
          </ol>
          <div className="certs">
            {AWARDS.map((a) => (
              <a key={a.site} href={a.href} className="cert">
                <img src={BASE + a.img} alt={`Certificate: ${a.site}, ${a.note}`} loading="lazy" />
                <span className="cert-name">{a.site}</span>
                <span className="meta">{a.note}</span>
              </a>
            ))}
          </div>
        </section>

        <section className="off band" aria-labelledby="off-h">
          <p className="say say-mid">
            {tea.split(' ').slice(0, -1).join(' ')}{' '}
            <Tail>{tea.split(' ').slice(-1)} <Gap kind="tea" label="A porcelain teacup" live={live} /></Tail>
          </p>
          <h2 id="off-h" className="label">Off the record</h2>
          <div className="lists">
            <div><h3>Likes</h3><p>{LIKES.join('; ')}.</p></div>
            <div><h3>Dislikes</h3><p>{DISLIKES.join('; ')}.</p></div>
            <div><h3>Favourites</h3><p>{FAVOURITES.map((f) => f.replace(/\.$/, '')).join('; ')}.</p></div>
            <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><span>{c.provider}, {c.title}</span> <span className="meta">{c.note}</span></li>)}</ul></div>
          </div>
        </section>

        <section id="club" className="club" aria-label={NOW.club.title}>
          <p className="say say-club">
            {NOW.club.body.split(' ').slice(0, -1).join(' ')}{' '}
            <Tail>{NOW.club.body.split(' ').slice(-1)} <Gap kind="armillary" label="A brass armillary sphere from 1771, turning" live={live} /></Tail>
          </p>
        </section>

        <section id="contact" className="contact band" aria-labelledby="contact-h">
          <h2 id="contact-h" className="label">Contact</h2>
          <ul className="links">
            {otherLinks.map((l) => (
              <li key={l.label}>
                <span className="meta">{l.label}</span>
                {l.href ? <a href={l.href}>{l.value}</a> : <span>{l.value}</span>}
              </li>
            ))}
          </ul>
          <p className="say say-mail">
            <Tail><a href={mail.href}>{mail.value}</a> <Gap kind="stopped" label="The wristwatch again, stopped" live={live} /></Tail>
          </p>
        </section>
      </main>

      <footer className="foot">
        <p>Draft 90 of the portfolio. Not the live site.</p>
        <p>Built on the pmndrs/examples view-tracking example (MIT). Set in Familjen Grotesk.</p>
        <p>Apple: “food_apple_01” from Poly Haven, CC0.</p>
        <p>Plato: “Plato / Platon” by rjordanb2026 on Sketchfab, CC BY 4.0.</p>
        <p>Armillary sphere: “Armillary sphere (1771)” by Franciszek Słupski, Jagiellonian University Museum Collegium Maius, Kraków; digitised by the Regional Digitalisation Lab, Małopolska Institute of Culture (“Virtual Museums of Małopolska”), CC BY 4.0.</p>
        <p>Chronograph watch: KhronosGroup glTF-Sample-Assets ChronographWatch, from “Chronograph Watch Mudmaster” by graphiccompressor, CC BY 4.0. Teacup: KhronosGroup DiffuseTransmissionTeacup, CC0.</p>
      </footer>
    </div>
  );
}
