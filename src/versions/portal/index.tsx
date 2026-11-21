// Draft 66, The portal. The stage is remixed from pmndrs/examples "enter-portals" (MIT); see Stage.tsx.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { MouseEvent as RMouseEvent } from 'react';
import '@fontsource/anton/400.css';
import '@fontsource/schibsted-grotesk/400.css';
import '@fontsource/schibsted-grotesk/500.css';
import '@fontsource/schibsted-grotesk/700.css';
import {
  AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, STATS, WORK,
} from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { gsap, scrollToY } from '@/lib/scroll';
import { clamp, isPhone, still } from '@/lib/utils';
import { FACES, ROOMS, S } from './store';
import './portal.css';

const Stage = lazy(() => import('./Stage'));

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const STILL = (i: number) => `${import.meta.env.BASE_URL}portal/${ROOMS[i]}.jpg`;
const paper = RESEARCH[0] as Required<(typeof RESEARCH)[0]>, wesso = RESEARCH[1];

function roomTop(id: string) {
  const el = document.getElementById(id);
  return el ? el.getBoundingClientRect().top + window.scrollY : 0;
}

export default function Portal() {
  useVersion('portal');
  const [flat] = useState(() => still || !hasWebGL());
  const [phone, setPhone] = useState(() => isPhone());
  const [live, setLive] = useState(true);
  const mids = useRef<(HTMLElement | null)[]>([]);
  const rooms = useRef<(HTMLElement | null)[]>([]);
  const works = useRef<(HTMLElement | null)[]>([]);
  const end = useRef<HTMLElement | null>(null);
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const [pick, setPick] = useState(0);

  useEffect(() => {
    const onResize = () => { setPhone(isPhone()); S.phone = isPhone(); };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Scroll is the source of truth: which window is open, how far in, what the cards are fitted to.
  useEffect(() => {
    let lastOpen = -2, lastLive = true;
    const tick = () => {
      const vh = window.innerHeight, mid = vh * 0.5;
      let open = -1;
      rooms.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.top < mid && r.bottom > mid) open = i;
        if (r.top < vh && r.bottom > 0) S.t[i] = clamp((mid - r.top) / Math.max(1, r.height - vh * 0.5));
      });
      const panel = rooms.current[open]?.querySelector('.panel') as HTMLElement | null;
      S.panel = panel ? panel.getBoundingClientRect().width : S.panel;
      if (open === 2) {
        let w = 0;
        works.current.forEach((el, k) => { if (el && el.getBoundingClientRect().top < vh * 0.6) w = k; });
        S.work = w;
      }
      // Fit the cards to whichever placeholder sits nearest the middle of the screen.
      let best: HTMLElement | null = null, bd = Infinity, anyOn = false;
      for (const el of mids.current) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.bottom > -40 && r.top < vh + 40) anyOn = true;
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bd) { bd = d; best = el; }
      }
      S.fit = best;
      S.end = !!end.current && best === mids.current[mids.current.length - 1];
      S.open = open;
      const on = open >= 0 || anyOn;
      if (on !== lastLive) { lastLive = on; setLive(on); }
      if (open !== lastOpen) {
        if (lastOpen !== -2) {
          const want = open >= 0 ? '#' + ROOMS[open] : '';
          if (location.hash !== want && (open >= 0 || ROOMS.some((r) => location.hash === '#' + r))) history.replaceState(null, '', want || location.pathname + location.search);
        }
        lastOpen = open;
      }
    };
    gsap.ticker.add(tick);
    const onMove = (e: PointerEvent) => { S.px = e.clientX / window.innerWidth - 0.5; S.py = e.clientY / window.innerHeight - 0.5; };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => { gsap.ticker.remove(tick); window.removeEventListener('pointermove', onMove); };
  }, []);

  // The hash: arrive on #builder and you are in Builder; Back closes; Escape steps out to the cards.
  useEffect(() => {
    const go = () => {
      const id = location.hash.slice(1);
      if ((ROOMS as readonly string[]).includes(id)) scrollToY(roomTop(id));
      else if (!id) scrollToY(0);
    };
    const first = location.hash.slice(1);
    const t = (ROOMS as readonly string[]).includes(first) ? window.setTimeout(() => scrollToY(roomTop(first), true), 120) : 0;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || S.open < 0) return;
      const i = S.open;
      history.replaceState(null, '', location.pathname + location.search);
      scrollToY(0);
      (document.getElementById('card-' + ROOMS[i]) as HTMLElement | null)?.focus({ preventScroll: true });
    };
    window.addEventListener('popstate', go);
    window.addEventListener('keydown', onKey);
    return () => { window.clearTimeout(t); window.removeEventListener('popstate', go); window.removeEventListener('keydown', onKey); };
  }, []);

  const enter = (e: RMouseEvent<HTMLAnchorElement>, i: number) => {
    e.preventDefault();
    if (location.hash !== '#' + ROOMS[i]) history.pushState(null, '', '#' + ROOMS[i]);
    scrollToY(roomTop(ROOMS[i]));
  };
  const hover = (i: number) => () => { S.hover = i; };
  const unhover = () => { S.hover = -1; };

  const latest = notes[pick] ?? notes[0];
  const commits = gh.activity.slice(0, 6);

  const placeholders = (k: number, cls: string) => (
    <div className={cls} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="ghost" ref={i === 1 ? (el) => { mids.current[k] = el; } : undefined}>
          {flat && <FlatCard i={i} />}
        </div>
      ))}
    </div>
  );

  return (
    <div className={`v-portal${flat ? ' is-flat' : ''}`}>
      <a className="skip-x" href="#main">Skip to content</a>
      {!flat && (
        <div className="stage" aria-hidden="true">
          <Suspense fallback={null}><Stage key={phone ? 'p' : 'd'} live={live} /></Suspense>
        </div>
      )}

      <main id="main">
        <header className="hall">
          <div className="title">
            <h1>{PERSON.name}</h1>
            <p className="line">{PERSON.line}</p>
          </div>
          <nav className="cards" aria-label="Three windows">
            {PERSON.short.map((w, i) => (
              <a
                key={w} id={'card-' + ROOMS[i]} href={'#' + ROOMS[i]} className="card"
                style={{ ['--face' as string]: FACES[i] }}
                ref={i === 1 ? (el) => { mids.current[0] = el; } : undefined}
                onClick={(e) => enter(e, i)} onPointerEnter={hover(i)} onPointerLeave={unhover} onFocus={hover(i)} onBlur={unhover}
              >
                {flat ? <FlatCard i={i} /> : <span className="sr-only-x">{w} {String(i + 1).padStart(2, '0')}</span>}
              </a>
            ))}
          </nav>
          <p className="hint">Open a window, or scroll to walk through all three.</p>
        </header>

        {/* ───── 01 Debater ───── */}
        <section id="debater" className="room" ref={(el) => { rooms.current[0] = el; }} aria-labelledby="h-debater" style={{ ['--face' as string]: FACES[0] }}>
          <div className="panel">
            <p className="no">01</p>
            <h2 id="h-debater" className="word">{PERSON.short[0]}</h2>
            <ol className="wins">
              {DEBATE.wins.map((w) => (
                <li key={w.where}>
                  <span className="champ">{w.title}</span>
                  <span className="event">{w.event}</span>
                  <span className="where">{w.where}, {w.when}</span>
                </li>
              ))}
            </ol>
            <div className="team">
              <h3>{DEBATE.team.name}</h3>
              <p className="role">{DEBATE.team.role}</p>
              <p>{DEBATE.team.line}</p>
              <p className="record">{DEBATE.team.record}</p>
              <a className="go" href={DEBATE.team.href}>skeptical.pages.dev</a>
            </div>
            <div className="next">
              <h3>Up next</h3>
              <ul>
                {DEBATE.next.map((n) => <li key={n.where}><span>{n.where}</span><span>{n.event}</span></li>)}
              </ul>
            </div>
          </div>
          <RoomView i={0} flat={flat} />
        </section>

        {placeholders(1, 'gap')}

        {/* ───── 02 Researcher ───── */}
        <section id="researcher" className="room" ref={(el) => { rooms.current[1] = el; }} aria-labelledby="h-researcher" style={{ ['--face' as string]: FACES[1] }}>
          <div className="panel">
            <p className="no">02</p>
            <h2 id="h-researcher" className="word">{PERSON.short[1]}</h2>
            <h3 className="paper-title">{paper.title}</h3>
            <p className="status">{paper.status}, {paper.pages} pages</p>
            <blockquote className="epi">
              <p>{paper.epigraph.text}</p>
              <cite>{paper.epigraph.source}</cite>
            </blockquote>
            <p className="abstract">{paper.abstract}</p>
            <h4>Three ladders</h4>
            <ol className="ladders">
              {paper.ladders.map((l) => (
                <li key={l.who}><span className="who">{l.who}</span><span className="when">{l.when}</span><span className="src">{l.where}</span></li>
              ))}
            </ol>
            <h4>Keywords</h4>
            <p className="keys">{paper.keywords.join(', ')}</p>
            <ul className="plinks">
              {paper.links.map((l) => <li key={l.label}><a href={l.href}>{l.label}</a></li>)}
            </ul>
            <div className="wesso">
              <h3>{wesso.title}</h3>
              <p className="status">{wesso.status}</p>
              <p>{wesso.abstract}</p>
            </div>
          </div>
          <RoomView i={1} flat={flat} />
        </section>

        {placeholders(2, 'gap')}

        {/* ───── 03 Builder ───── */}
        <section id="builder" className="room" ref={(el) => { rooms.current[2] = el; }} aria-labelledby="h-builder" style={{ ['--face' as string]: FACES[2] }}>
          <div className="panel">
            <p className="no">03</p>
            <h2 id="h-builder" className="word">{PERSON.short[2]}</h2>
            <ol className="works">
              {WORK.map((w, k) => (
                <li key={w.slug} ref={(el) => { works.current[k] = el; }} className="work">
                  <img src={import.meta.env.BASE_URL + w.img} alt={`${w.name}, screenshot`} loading="lazy" width={1200} height={680} />
                  <div className="wrow"><span className="wn">{w.n}</span><h3>{w.name}</h3><span className="kind">{w.kind}</span></div>
                  <p>{w.line}</p>
                  <p className="stack">{w.stack}</p>
                  {w.href ? <a className="go" href={w.href}>Visit {w.name}</a> : <p className="go off">No public link</p>}
                </li>
              ))}
            </ol>
            <div className="gh">
              <h3>Live from GitHub</h3>
              {commits.length > 0 && (
                <>
                  <p className="ghsub">{gh.commitsThisMonth != null ? `${gh.commitsThisMonth} commits this month. The latest:` : 'The latest commits:'}</p>
                  <ol className="commits">
                    {commits.map((c) => (
                      <li key={c.href}><a href={c.href}><span className="msg">{c.message}</span><span className="meta">{c.repo}, {ago(c.at)}</span></a></li>
                    ))}
                  </ol>
                </>
              )}
              <p className="ghsub">Repositories</p>
              <ol className="repos">
                {gh.repos.slice(0, 6).map((r) => (
                  <li key={r.name}><a href={r.href}><span className="rn">{r.name}</span>{r.description && <span className="rd">{r.description}</span>}{r.language && <span className="rl">{r.language}</span>}</a></li>
                ))}
              </ol>
              <a className="go" href={GITHUB.href}>github.com/{GITHUB.user}</a>
            </div>
          </div>
          <RoomView i={2} flat={flat} />
        </section>

        {/* ───── the plain grey page ───── */}
        <div className="page">
          <section className="about" aria-labelledby="h-about">
            <h2 id="h-about">About</h2>
            <div className="cols">
              {PERSON.about.map((p) => <p key={p.slice(0, 20)}>{p}</p>)}
            </div>
            <p className="aside">{PERSON.aside}</p>
          </section>

          <section className="today" aria-labelledby="h-today">
            <h2 id="h-today">Today</h2>
            <div className="tgrid">
              <article className="note" aria-live="polite">
                {latest ? (
                  <>
                    <p className="date"><time dateTime={latest.date}>{formatDate(latest.date)}</time></p>
                    {latest.body.map((b, k) => <p key={k} className={k === 0 ? 'lead' : ''}>{b}</p>)}
                  </>
                ) : (
                  <>
                    <p className="date">{loaded ? 'No note yet' : 'Fetching the note'}</p>
                    <p className="lead">{loaded ? 'Check back tomorrow.' : 'One moment.'}</p>
                  </>
                )}
              </article>
              {notes.length > 1 && (
                <div className="earlier">
                  <h3>Earlier notes</h3>
                  <ol>
                    {notes.slice(0, 10).map((n, k) => (
                      <li key={n.date}>
                        <button type="button" aria-pressed={k === pick} onClick={() => setPick(k)}>
                          <span>{formatDate(n.date, { day: 'numeric', month: 'short' })}</span>
                          <span className="peek">{n.body[0]}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </section>

          <section className="now" aria-labelledby="h-now">
            <h2 id="h-now">Now</h2>
            <p className="status-line">{NOW.status}</p>
            <div className="ngrid">
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
            <h2 id="h-record">Record</h2>
            <ul className="stats">
              {STATS.map((s) => <li key={s.label}><span className="big">{s.to}{s.suffix}</span><span>{s.label}</span></li>)}
            </ul>
            <div className="rgrid">
              <ol className="honors">
                {HONORS.map((h) => <li key={h.what}><span>{h.what}</span><span className="d">{h.detail}</span></li>)}
              </ol>
              <div className="certs">
                {AWARDS.map((a) => (
                  <a key={a.site} href={a.href} className="cert">
                    <img src={import.meta.env.BASE_URL + a.img} alt={`Certificate, ${a.site}`} loading="lazy" width={720} height={1018} />
                    <span className="cs">{a.site}</span>
                    <span className="cn">{a.note}</span>
                  </a>
                ))}
              </div>
            </div>
          </section>

          <section className="off" aria-labelledby="h-off">
            <h2 id="h-off">Off the record</h2>
            <div className="ogrid">
              <div><h3>Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3>Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3>Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider}, {c.title}.</strong> {c.note}</li>)}</ul></div>
            </div>
          </section>
        </div>

        {/* ───── the close: the cards come back, square to you ───── */}
        <section className="end" id="contact" ref={end} aria-labelledby="h-contact">
          {placeholders(3, 'row')}
          <h2 id="h-contact">Write to me</h2>
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
        <p>Draft 66 of the portfolio. Not the live site.</p>
        <p>The three windows are remixed from the pmndrs enter-portals example (MIT). Set in Anton and Schibsted Grotesk.</p>
      </footer>
    </div>
  );
}

function FlatCard({ i }: { i: number }) {
  return (
    <span className="flat" style={{ ['--face' as string]: FACES[i] }}>
      <img src={STILL(i)} alt="" />
      <span className="fw">{PERSON.short[i]}</span>
      <span className="fn">{String(i + 1).padStart(2, '0')}</span>
    </span>
  );
}

function RoomView({ i, flat }: { i: number; flat: boolean }) {
  return (
    <div className="view" aria-hidden="true">
      {flat && <img src={STILL(i)} alt="" />}
    </div>
  );
}
