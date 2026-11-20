// Draft 14, The glass: a heavy glass question mark on a pale printed page. It follows you
// down from heading to heading and lands like a paperweight; pick it up and it is a loupe.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource/bodoni-moda/400.css';
import '@fontsource/bodoni-moda/400-italic.css';
import '@fontsource/bodoni-moda/700.css';
import '@fontsource/bodoni-moda/900.css';
import '@fontsource/bodoni-moda/900-italic.css';
import '@fontsource/schibsted-grotesk/400.css';
import '@fontsource/schibsted-grotesk/500.css';
import '@fontsource/schibsted-grotesk/700.css';
import './glass.css';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { gsap } from '@/lib/scroll';
import { still } from '@/lib/utils';
import MARKS from '@/lib/marks.json';
import { G, drag, step, throwGlass, placeAt, toggleLift } from './engine';

const GlassScene = lazy(() => import('./Scene'));
const ext = { rel: 'noopener', target: '_blank' } as const;
const img = (p: string) => import.meta.env.BASE_URL + p;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/\/$/, '');

/** The outline of the mark, drawn flat: the no-WebGL glass, and the place it returns to at the end. */
function Outline({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="-540 -800 1080 1600" aria-hidden="true" focusable="false">
      <path d={MARKS.roman.d} />
    </svg>
  );
}

function Today() {
  const { notes, loaded } = useNotes();
  const [open, setOpen] = useState<string | null>(null);
  const latest = notes[0];
  const today = new Date().toISOString().slice(0, 10);
  const date = latest?.date ?? today;
  return (
    <section className="sec today" id="today" aria-labelledby="h-today">
      <h2 className="h" id="h-today"><span className="hw">Today</span></h2>
      <div className="note">
        <p className="day-wrap">
          <time className="day" dateTime={date} data-rest="" data-rx="0.7" data-ry="0.52">{formatDate(date, { day: 'numeric' })}</time>
          <span className="month">{formatDate(date, { month: 'long', year: 'numeric' })}</span>
        </p>
        <div className="note-body" aria-live="polite">
          {latest ? latest.body.map((p) => <p key={p}>{p}</p>) : (
            <>
              <p>{loaded ? 'No note yet today. The last word on where things stand:' : 'Opening today’s page.'}</p>
              <p>{NOW.status}</p>
            </>
          )}
          <p className="stamp">{latest ? `Written ${formatDate(latest.date)}` : 'The daily note'}</p>
        </div>
      </div>
      {notes.length > 1 && (
        <div className="earlier">
          <h3 className="sub">Earlier</h3>
          <ol>
            {notes.slice(1).map((n) => {
              const on = open === n.date;
              return (
                <li key={n.date} className={on ? 'on' : ''}>
                  <button type="button" aria-expanded={on} onClick={() => setOpen(on ? null : n.date)}>
                    <time dateTime={n.date}>{formatDate(n.date)}</time>
                    <span className="peek">{n.body[0]}</span>
                  </button>
                  <div className="full" hidden={!on}>{n.body.map((p) => <p key={p}>{p}</p>)}</div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}

function GitHubLive() {
  const { repos, activity, commitsThisMonth, live } = useGitHub();
  return (
    <section className="sec gh" id="github" aria-labelledby="h-gh">
      <h2 className="h" id="h-gh"><span className="hw" data-rest="" data-rx="1.08">Live from GitHub</span></h2>
      <p className="gh-lead">
        {live && commitsThisMonth !== null ? `${commitsThisMonth} commits pushed this month, read straight from GitHub.` : 'What he is building in the open, repository by repository.'}{' '}
        <a href={GITHUB.href} {...ext}>{host(GITHUB.href)}</a>
      </p>
      <div className={`gh-cols${activity.length ? ' two' : ''}`}>
        {activity.length > 0 && (
          <div>
            <h3 className="sub">Latest commits</h3>
            <ol className="commits">
              {activity.slice(0, 8).map((a) => (
                <li key={a.href + a.message}>
                  <a href={a.href} {...ext}>
                    <span className="msg">{a.message}</span>
                    <span className="meta">{a.repo}, {ago(a.at)}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        )}
        <div>
          <h3 className="sub">Repositories</h3>
          <ol className="repos">
            {repos.slice(0, 8).map((r) => (
              <li key={r.name}>
                <a href={r.href} {...ext}>
                  <span className="rname">{r.name}</span>
                  {r.description && <span className="rdesc">{r.description}</span>}
                  <span className="meta">{[r.language, r.pushedAt ? `pushed ${ago(r.pushedAt)}` : null].filter(Boolean).join(', ')}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

export default function Glass() {
  useVersion('glass');
  const root = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLButtonElement>(null);
  const [gl] = useState(() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } });
  const [mainEl, setMainEl] = useState<HTMLElement | null>(null);

  // The paperweight's clock.
  useEffect(() => {
    const rootEl = root.current!;
    G.mode = still ? 'parked' : 'follow'; G.rest = null; G.lift = 1;
    step(0, rootEl);
    G.x = window.innerWidth * (still ? 0.9 : 0.62); G.y = still ? window.innerHeight * 0.85 : -G.H;
    const t0 = window.setTimeout(() => { G.ready = true; rootEl.classList.add('ready'); }, still ? 0 : 900);
    const tick = (_t: number, dms: number) => {
      step(dms / 1000, rootEl);
      const h = handle.current; if (!h) return;
      const s = G.scale;
      h.style.width = `${G.W * s}px`; h.style.height = `${G.H * s}px`;
      h.style.transform = `translate3d(${G.x - (G.W * s) / 2}px, ${G.y - (G.H * s) / 2}px, 0) rotate(${G.tilt * -20}deg)`;
    };
    gsap.ticker.add(tick);
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') toggleLift(); };
    window.addEventListener('keydown', key);
    return () => { gsap.ticker.remove(tick); window.removeEventListener('keydown', key); clearTimeout(t0); G.ready = false; };
  }, []);

  const down = useRef({ x: 0, y: 0, t: 0, ox: 0, oy: 0, moved: 0 });
  const onDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    down.current = { x: e.clientX, y: e.clientY, t: performance.now(), ox: G.x - e.clientX, oy: G.y - e.clientY, moved: 0 };
    drag.x = G.x; drag.y = G.y; G.dragging = true;
  };
  const onMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!G.dragging) return;
    const d = down.current;
    d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.x, e.clientY - d.y));
    drag.x = e.clientX + d.ox; drag.y = e.clientY + d.oy;
  };
  const onUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!G.dragging) return;
    G.dragging = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    e.currentTarget.blur();
    if (down.current.moved < 6) { toggleLift(); return; }
    throwGlass(G.vx, G.vy);
  };
  const onKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!k) return;
    e.preventDefault();
    const n = e.shiftKey ? 120 : 40;
    placeAt(G.x + k[0] * n, G.y + k[1] * n);
  };

  const [paper, wess] = RESEARCH;
  return (
    <div className={`v-glass${gl ? ' gl' : ''}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      {gl && mainEl && <div className="stage" aria-hidden="true"><Suspense fallback={null}><GlassScene root={mainEl} /></Suspense></div>}
      <button ref={handle} type="button" className="handle" aria-label="The glass. Drag it over anything to look closer, or use the arrow keys. Escape lifts it off."
        onPointerEnter={() => { G.hover = true; }} onPointerLeave={() => { G.hover = false; }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onKeyDown={onKey} onClick={(e) => { if (e.detail === 0) toggleLift(); }}>
        {!gl && <Outline className="flat" />}
      </button>

      <main id="main" ref={setMainEl}>
        <header className="hero" id="top">
          <h1 className="name">
            <span className="ln" data-rest="" data-rx="0.6" data-ry="0.5" data-s="1.5">{PERSON.name}</span>
          </h1>
          <p className="line">{PERSON.line}</p>
          <p className="hint" data-nogl="">Pick up the glass. Look again.</p>
        </header>

        <section className="sec debate" id="debate" aria-labelledby="h-debate">
          <h2 className="h" id="h-debate"><span className="hw" data-rest="" data-rx="1.12">Debate</span></h2>
          <ol className="wins">
            {DEBATE.wins.map((w, i) => (
              <li key={w.where} className="win">
                <p className="champ"><span {...(i === 0 ? { 'data-rest': '', 'data-rx': '0.8', 'data-ry': '1.04' } : {})}>{w.title}</span></p>
                <div className="win-d">
                  <p className="ev">{w.event}</p>
                  <p>{w.where}, {w.when}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="team">
            <div className="team-name">
              <h3><span className="hw" data-rest="" data-rx="1.12">{DEBATE.team.name}</span></h3>
              <p className="role">{DEBATE.team.role}</p>
            </div>
            <div className="team-body">
              <p className="big">{DEBATE.team.line}</p>
              <p>{DEBATE.team.record}</p>
              <p className="links"><a href={DEBATE.team.href} {...ext}>{host(DEBATE.team.href)}</a> <a href={DEBATE.team.github} {...ext}>The code on GitHub</a></p>
            </div>
          </div>
          <div className="next">
            <h3 className="sub">Up next</h3>
            <ul>{DEBATE.next.map((n) => <li key={n.where}><span className="where">{n.where}</span><span>{n.event}</span></li>)}</ul>
          </div>
        </section>

        <Today />

        <section className="sec about" id="about" aria-labelledby="h-about">
          <h2 className="h" id="h-about"><span className="hw" data-rest="" data-rx="1.12">About</span></h2>
          <div className="about-body">
            {PERSON.about.map((p) => <p key={p}>{p}</p>)}
            <p className="aside">{PERSON.aside}</p>
          </div>
        </section>

        <section className="sec research" id="research" aria-labelledby="h-research">
          <h2 className="h" id="h-research"><span className="hw" data-rest="" data-rx="1.1">Research</span></h2>
          <article className="paper">
            <p className="status">{paper.status}, {paper.pages} pages</p>
            <h3 className="title" data-rest="" data-rx="1.04" data-ry="0.5" data-desk="">{paper.title}</h3>
            <blockquote className="epi"><p>{paper.epigraph!.text}</p><cite>{paper.epigraph!.source}</cite></blockquote>
            <div className="paper-cols">
              <div>
                <h4 className="sub">Abstract</h4>
                <p className="abstract">{paper.abstract}</p>
                <h4 className="sub">Keywords</h4>
                <ul className="kw">{paper.keywords!.map((k) => <li key={k}>{k}</li>)}</ul>
              </div>
              <div>
                <h4 className="sub">Three ladders</h4>
                <ol className="ladders">
                  {paper.ladders!.map((l) => <li key={l.who}><span className="who">{l.who}</span><span>{l.when}</span><span className="dim">{l.where}</span></li>)}
                </ol>
                <h4 className="sub">Read it</h4>
                <ul className="read">{paper.links.map((l) => <li key={l.label}><a href={l.href} {...ext}>{l.label}</a></li>)}</ul>
                <p className="dim small">DOI {paper.doi}</p>
              </div>
            </div>
          </article>
          <article className="wess">
            <h3>{wess.title}</h3>
            <p className="status">{wess.status}</p>
            <p>{wess.abstract}</p>
          </article>
        </section>

        <section className="sec work" id="work" aria-labelledby="h-work">
          <h2 className="h" id="h-work"><span className="hw" data-rest="" data-rx="1.12">Work</span></h2>
          <ol className="works">
            {WORK.map((w) => (
              <li key={w.slug} className="wk">
                <figure data-rest="" data-rx="0.8" data-ry="0.34"><img src={img(w.img)} alt={`${w.name}, a screenshot`} width={1200} loading="lazy" decoding="async" /></figure>
                <div className="wk-t">
                  <p className="kind">{w.kind}</p>
                  <h3>{w.name}</h3>
                  <p>{w.line}</p>
                  <p className="dim">{w.stack}</p>
                  {w.href ? <p><a href={w.href} {...ext}>{host(w.href)}</a></p> : <p className="dim">Runs on his own machine, no public link.</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <GitHubLive />

        <section className="sec now" id="now" aria-labelledby="h-now">
          <h2 className="h" id="h-now"><span className="hw" data-rest="" data-rx="1.15">Now</span></h2>
          <div className="now-cols">
            <div>
              <h3>{NOW.reading.title}</h3>
              <p>{NOW.reading.body}</p>
              <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <h3>{NOW.club.title}</h3>
              <p>{NOW.club.body}</p>
            </div>
            <div>
              <h3>Status</h3>
              <p>{NOW.status}</p>
            </div>
          </div>
        </section>

        <section className="sec record" id="record" aria-labelledby="h-record">
          <h2 className="h" id="h-record"><span className="hw" data-rest="" data-rx="1.1">Record</span></h2>
          <div className="record-cols">
            <ol className="honors">{HONORS.map((h) => <li key={h.what}><span>{h.what}</span><span className="dim">{h.detail}</span></li>)}</ol>
            <div className="awards">
              {AWARDS.map((a) => (
                <a key={a.site} href={a.href} {...ext} className="award">
                  <img src={img(a.img)} alt={`Certificate, ${a.site}`} width={720} height={1018} loading="lazy" decoding="async" />
                  <span className="a-site">{a.site}</span>
                  <span className="dim">{a.note}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="sec off" id="off" aria-labelledby="h-off">
          <h2 className="h" id="h-off"><span className="hw" data-rest="" data-rx="1.06">Off the record</span></h2>
          <div className="off-cols">
            <div><h3 className="sub">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="sub">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="sub">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="sub">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider}, {c.title}.</b> {c.note}</li>)}</ul></div>
          </div>
        </section>

        <section className="sec contact" id="contact" aria-labelledby="h-contact">
          <h2 className="h" id="h-contact"><span className="hw" data-rest="" data-rx="1.12">Contact</span></h2>
          <ul className="links">
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="lab">{l.label}</span>
                {l.href ? <a href={l.href} {...(l.href.startsWith('http') ? ext : {})}>{l.value}</a> : <span className="val">{l.value}</span>}
              </li>
            ))}
          </ul>
        </section>

        <section className="end" aria-label="The end">
          <div className="slot" data-rest="" data-rx="0.5" data-ry="0.5" data-free=""><Outline /></div>
          <p className="short">{PERSON.short.join(' ')}</p>
        </section>
      </main>

      <footer className="foot">
        <p>Draft 14 of the portfolio. Not the live site.</p>
        <p className="dim">Set in Bodoni Moda and Schibsted Grotesk.</p>
      </footer>
    </div>
  );
}
