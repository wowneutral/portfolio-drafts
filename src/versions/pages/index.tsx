// Draft 52: the pages. The fifteen pages of his paper stand fanned up like a flight of stairs
// (the stair is pmndrs/examples "raycast-cycling", MIT, remixed in Stage.tsx). Scroll climbs it;
// at the close the stair folds down into one flat stack.
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/playfair-display/wght.css';
import '@fontsource-variable/playfair-display/wght-italic.css';
import '@fontsource-variable/instrument-sans/wght.css';
import './pages.css';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { gsap } from '@/lib/scroll';
import { clamp, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { PAGES, PAPER } from './paper';
import { COUNT, S, pageOf, sheetOf, type Cam } from './store';

const Stage = lazy(() => import('./Stage'));
const BASE = import.meta.env.BASE_URL;
const WESSO = RESEARCH[1];
const clip = (t: string, n = 70) => (t.length <= n ? t : t.slice(0, t.lastIndexOf(' ', n)) + '…');

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const Ext = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

/** Every word printed on a sheet, set again in the page. */
function PageText({ n }: { n: number }) {
  const p = PAGES[n - 1];
  switch (p.kind) {
    case 'title': return <><p className="rd-t">{PAPER.title}</p><p>{PERSON.name}</p><p className="rd-s">{PAPER.status}</p></>;
    case 'abstract': return <p>{PAPER.abstract}</p>;
    case 'keywords': return <ul className="rd-l">{PAPER.keywords.map((k) => <li key={k}>{k}</li>)}</ul>;
    case 'epigraph': return <><p className="rd-t">{PAPER.epigraph.text}</p><p className="rd-s">{PAPER.epigraph.source}</p></>;
    case 'ladder': { const l = PAPER.ladders[p.ladder!]; return <><p className="rd-t">{l.who}</p><p>{l.when}</p><p className="rd-s">{l.where}</p></>; }
    case 'links': return <><p>DOI {PAPER.doi}</p><ul className="rd-l">{PAPER.links.map((l) => <li key={l.label}><Ext href={l.href}>{l.label}</Ext></li>)}</ul></>;
    default: return <p>{PAPER.short}, {PERSON.name}. Page {n} of {PAPER.pages}.</p>;
  }
}

/** A flat fan of pages for browsers without WebGL. */
function FlatFan() {
  return (
    <div className="pg-fan" aria-hidden="true">
      {Array.from({ length: 9 }, (_, k) => <span key={k} style={{ transform: `translate(${k * 14 - 60}px, ${60 - k * 16}px) rotate(${-26 + k * 4}deg)` }} />)}
      <span className="top" style={{ transform: 'translate(70px, -88px) rotate(10deg)' }}><em>{PAPER.short}</em><i>{PERSON.name}</i></span>
    </div>
  );
}

function Win({ cam }: { cam: Cam }) {
  return <div className="pg-win" data-window={cam} aria-hidden="true" />;
}

export default function Pages() {
  useVersion('pages');
  const root = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const [open, setOpen] = useState(-1);
  const [pointed, setPointed] = useState(-1);
  const [roving, setRoving] = useState(sheetOf(1));
  const folioRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { notes, loaded } = useNotes();
  const [noteIx, setNoteIx] = useState(0);
  const gh = useGitHub();

  const openY = useRef(0);
  const pick = useCallback((i: number) => { S.open = i; openY.current = window.scrollY; setOpen(i); }, []);

  // Wire the scene to the page.
  useEffect(() => {
    S.still = still;
    S.pick = pick;
    S.point = (i) => setPointed(i);
    S.open = -1; S.hover = -1; S.focus = -1; S.fold = 0;
    S.intro = still || !webgl ? 0 : 1;
    const tw = !still && webgl ? gsap.to(S, { intro: 0, duration: 1.9, delay: 0.5, ease: 'power2.inOut' }) : null;
    return () => { tw?.kill(); S.pick = null; S.point = null; };
  }, [pick, webgl]);

  // Where the stair sits and which step the camera is on, read from the layout every frame.
  useEffect(() => {
    const el = root.current; if (!el || !webgl) return;
    const tick = () => {
      const vw = innerWidth, vh = innerHeight, phone = vw <= 820;
      S.phone = phone;
      const wins = el.querySelectorAll<HTMLElement>('[data-window]');
      let vis = false, best = -1, cam: Cam | null = null, cy = vh / 2;
      if (phone) {
        S.cx = vw / 2; S.fit = 1.8;
        wins.forEach((w) => {
          const r = w.getBoundingClientRect();
          const seen = Math.min(r.bottom, vh) - Math.max(r.top, 0);
          if (seen > 0) vis = true;
          if (seen > best) { best = seen; cam = w.dataset.window as Cam; cy = r.top + r.height / 2; }
          if (w.dataset.window === 'contact') S.fold = clamp((vh * 0.92 - r.top) / (vh * 0.6));
          
        });
        S.cy = cy;
      } else {
        S.cx = vw * 0.46 + (vw * 0.54) / 2; S.cy = vh / 2; S.fit = 1;
        wins.forEach((w) => {
          const r = w.getBoundingClientRect();
          if (r.bottom > 0 && r.top < vh) vis = true;
          if (r.top <= vh * 0.55 && r.bottom > vh * 0.45) cam = w.dataset.window as Cam;
          if (w.dataset.window === 'contact') S.fold = clamp((vh * 0.9 - r.top) / (vh * 0.6));
        });
      }
      if (cam) S.cam = cam;
      // Scrolling on puts an open page back on the stair.
      if (S.open >= 0 && Math.abs(window.scrollY - openY.current) > vh * 0.5) pick(-1);
      S.visible = vis || S.open >= 0;
    };
    gsap.ticker.add(tick);
    tick();
    return () => gsap.ticker.remove(tick);
  }, [webgl, pick]);

  // Escape puts the page back.
  useEffect(() => {
    if (open < 0) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { pick(-1); folioRefs.current[open]?.focus(); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, pick]);

  const onFolioKey = (e: React.KeyboardEvent) => {
    const n = pageOf(roving);
    let to = n;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = n % COUNT + 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = n === 1 ? COUNT : n - 1;
    else if (e.key === 'Home') to = 1;
    else if (e.key === 'End') to = COUNT;
    else return;
    e.preventDefault();
    const i = sheetOf(to);
    setRoving(i);
    folioRefs.current[i]?.focus();
    if (S.open >= 0) pick(i);
  };

  const shown = pointed >= 0 ? pointed : open;
  const note = notes[noteIx] ?? notes[0];
  const latest = notes[0];

  return (
    <div className={'v-pages' + (webgl ? '' : ' is-flat')} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      {webgl && (
        <div className="pg-canvas" aria-hidden="true">
          <Suspense fallback={null}><Stage /></Suspense>
        </div>
      )}

      <main id="main">
        {/* Opening: the name beside the stair */}
        <section className="pg-sec pg-hero" aria-labelledby="pg-name">
          <div className="pg-col">
            <nav className="pg-nav" aria-label="Sections" data-allow-overflow>
              <a href="#about">About</a><a href="#today">Today</a><a href="#debate">Debate</a><a href="#research">Research</a><a href="#work">Work</a><a href="#github">GitHub</a><a href="#contact">Contact</a>
            </nav>
            <div className="pg-hero-in">
              <h1 id="pg-name"><em>{PERSON.first}</em> {PERSON.last}</h1>
              <p className="pg-line">{PERSON.line}</p>
              <p className="pg-hint">The stair is his paper, {PAPER.pages} pages of it.{webgl ? ' Point at a page to read it.' : ''}</p>
            </div>
          </div>
          <div className="pg-stagecell">
            <Win cam="hero" />
            {!webgl && <FlatFan />}
            {webgl && (
              <div className="pg-folios">
                <div role="toolbar" aria-label="Pages of the paper" aria-orientation="horizontal" onKeyDown={onFolioKey}>
                  {PAGES.map((p) => {
                    const i = sheetOf(p.n);
                    return (
                      <button key={p.n} type="button" ref={(b) => { folioRefs.current[i] = b; }} tabIndex={i === roving ? 0 : -1}
                        className={(shown === i ? 'on' : '') + (open === i ? ' open' : '')}
                        aria-label={`Page ${p.n}: ${p.label}`} aria-pressed={open === i}
                        onFocus={() => { S.focus = i; setRoving(i); setPointed(i); }}
                        onBlur={() => { S.focus = -1; setPointed(-1); }}
                        onPointerEnter={() => { S.hover = i; setPointed(i); }}
                        onPointerLeave={() => { S.hover = -1; setPointed(-1); }}
                        onClick={() => pick(open === i ? -1 : i)}>{p.n}</button>
                    );
                  })}
                </div>
                <p className="pg-cap" aria-live="polite">{shown >= 0 ? <><span>p. {pageOf(shown)}</span> {PAGES[pageOf(shown) - 1].label}</> : <span>Pages 1 to {PAPER.pages}</span>}</p>
              </div>
            )}
          </div>
        </section>

        {/* About */}
        <section className="pg-sec" id="about" aria-labelledby="h-about">
          <div className="pg-col">
            <h2 id="h-about">About</h2>
            {PERSON.about.map((p) => <p key={p.slice(0, 12)} className="pg-body">{p}</p>)}
            <p className="pg-aside">{PERSON.aside}</p>
          </div>
          <div className="pg-stagecell"><Win cam="about" /></div>
        </section>

        {/* Today */}
        <section className="pg-sec" id="today" aria-labelledby="h-today">
          <div className="pg-col">
            <h2 id="h-today">Today</h2>
            <article className="pg-leaf big" aria-live="polite">
              <header><span>{PERSON.name}</span><span>{note ? formatDate(note.date, { weekday: 'long' }) : 'Daily note'}</span></header>
              {note ? (
                <>
                  <p className="pg-leaf-date"><time dateTime={note.date}>{formatDate(note.date)}</time></p>
                  {note.body.map((b, k) => <p key={k} className="pg-leaf-body">{b}</p>)}
                </>
              ) : (
                <p className="pg-leaf-body quiet">{loaded ? 'The next page is still blank.' : 'Opening today’s page.'}</p>
              )}
              <footer>{note ? formatDate(note.date, { day: 'numeric', month: 'long' }) : ''}</footer>
            </article>
            {notes.length > 1 && (
              <>
                <h3 className="pg-h3">Earlier pages</h3>
                <ul className="pg-leaves">
                  {notes.slice(0, 9).map((n, k) => (
                    <li key={n.date}>
                      <button type="button" className={'pg-leaf small' + (k === noteIx ? ' on' : '')} aria-pressed={k === noteIx} onClick={() => setNoteIx(k)}>
                        <span className="d">{k === 0 ? 'Latest' : formatDate(n.date, { day: 'numeric', month: 'short' })}</span>
                        <span className="b">{clip(n.body[0])}</span>
                        <span className="f">{formatDate(n.date, { day: 'numeric' })}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {latest && noteIx !== 0 && <button type="button" className="pg-textbtn" onClick={() => setNoteIx(0)}>Back to the latest page</button>}
          </div>
          <div className="pg-stagecell"><Win cam="today" /></div>
        </section>

        {/* Debate, on its own band */}
        <section className="pg-band pg-debate" id="debate" aria-labelledby="h-debate">
          <h2 id="h-debate">Debate</h2>
          <div className="pg-wins">
            {DEBATE.wins.map((w) => (
              <div className="pg-win-title" key={w.where}>
                <p className="t">{w.title}</p>
                <p className="e">{w.event}</p>
                <p className="w">{w.where}, {w.when}</p>
              </div>
            ))}
          </div>
          <div className="pg-debate-low">
            <div className="pg-team">
              <h3>{DEBATE.team.name}</h3>
              <p className="role">{DEBATE.team.role}</p>
              <p className="pg-body">{DEBATE.team.line}</p>
              <p className="pg-body">{DEBATE.team.record}</p>
              <Ext className="pg-link" href={DEBATE.team.href}>skeptical.pages.dev</Ext>
            </div>
            <div className="pg-next">
              <h3>Up next</h3>
              <ul>{DEBATE.next.map((n) => <li key={n.where}><span className="w">{n.where}</span><span className="e">{n.event}</span></li>)}</ul>
            </div>
          </div>
        </section>

        {/* Now */}
        <section className="pg-sec" id="now" aria-labelledby="h-now">
          <div className="pg-col">
            <h2 id="h-now">Now</h2>
            <h3 className="pg-h3">{NOW.reading.title}</h3>
            <p className="pg-body">{NOW.reading.body}</p>
            <ul className="pg-spines" aria-label="Shelves">
              {NOW.reading.shelves.map((s) => <li key={s}><span>{s}</span></li>)}
            </ul>
            <h3 className="pg-h3">{NOW.club.title}</h3>
            <p className="pg-body">{NOW.club.body}</p>
            <p className="pg-status">{NOW.status}</p>
          </div>
          <div className="pg-stagecell"><Win cam="now" /></div>
        </section>

        {/* Research: the top of the stair */}
        <section className="pg-sec pg-research" id="research" aria-labelledby="h-research">
          <div className="pg-col">
            <h2 id="h-research">Research</h2>
            <p className="pg-status-line">{PAPER.status}</p>
            <h3 className="pg-title">{PAPER.title}</h3>
            <p className="pg-by">{PERSON.name}</p>
            <h4 className="pg-h4">Abstract</h4>
            <p className="pg-body big">{PAPER.abstract}</p>
            <h4 className="pg-h4">Keywords</h4>
            <ul className="pg-keys">{PAPER.keywords.map((k) => <li key={k}>{k}</li>)}</ul>
            <blockquote className="pg-epi">
              <p>{PAPER.epigraph.text}</p>
              <cite>{PAPER.epigraph.source}</cite>
            </blockquote>
            <h4 className="pg-h4">The three ladders</h4>
            <ol className="pg-ladders">
              {PAPER.ladders.map((l) => <li key={l.who}><span className="who">{l.who}</span><span className="when">{l.when}</span><span className="where">{l.where}</span></li>)}
            </ol>
            <h4 className="pg-h4">Read it</h4>
            <ul className="pg-links">
              {PAPER.links.map((l) => <li key={l.label}><Ext href={l.href}>{l.label}</Ext></li>)}
            </ul>
            <p className="pg-doi">DOI {PAPER.doi}</p>
            <article className="pg-wesso" aria-labelledby="h-wesso">
              <p className="s">{WESSO.status}</p>
              <h3 id="h-wesso">{WESSO.title}</h3>
              <p>{WESSO.abstract}</p>
            </article>
          </div>
          <div className="pg-stagecell"><Win cam="research" /></div>
        </section>

        {/* Work: open spreads */}
        <section className="pg-band pg-work" id="work" aria-labelledby="h-work">
          <h2 id="h-work">Work</h2>
          <div className="pg-spreads" data-allow-overflow>
            {Array.from({ length: Math.ceil(WORK.length / 2) }, (_, s) => (
              <div className="pg-spread" key={s}>
                {WORK.slice(s * 2, s * 2 + 2).map((w) => (
                  <article className="pg-wpage" key={w.slug} aria-labelledby={'w-' + w.slug}>
                    <img src={BASE + w.img} alt={`${w.name}: screenshot`} loading="lazy" width={1200} height={680} />
                    <p className="k">{w.kind}</p>
                    <h3 id={'w-' + w.slug}>{w.name}</h3>
                    <p className="l">{w.line}</p>
                    <p className="st">{w.stack}</p>
                    {w.href ? <Ext className="pg-link" href={w.href}>Visit {w.name}</Ext> : <p className="st">No public link</p>}
                    <span className="folio" aria-hidden="true">{w.n}</span>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* Live from GitHub: a contents page */}
        <section className="pg-sec" id="github" aria-labelledby="h-github">
          <div className="pg-col">
            <h2 id="h-github">Live from GitHub</h2>
            <div className="pg-leaf toc">
              <header><span>github.com/{GITHUB.user}</span><span>{gh.live ? 'Live' : 'Repositories'}</span></header>
              {gh.activity.length > 0 && (
                <>
                  <h3 className="pg-h4">Recent commits</h3>
                  <ol className="pg-commits">
                    {gh.activity.slice(0, 6).map((a) => (
                      <li key={a.href}><Ext href={a.href}>{a.message}</Ext><span>{a.repo}, {ago(a.at)}</span></li>
                    ))}
                  </ol>
                </>
              )}
              <h3 className="pg-h4">Contents</h3>
              <ol className="pg-repos">
                {gh.repos.slice(0, 8).map((r) => (
                  <li key={r.name}>
                    <Ext href={r.href}><span className="n">{r.name}</span><span className="dots" aria-hidden="true" /><span className="lang">{r.language ?? 'Code'}</span></Ext>
                    {r.description && <p>{r.description}</p>}
                  </li>
                ))}
              </ol>
              <Ext className="pg-link" href={GITHUB.href}>All of it on GitHub</Ext>
            </div>
          </div>
          <div className="pg-stagecell"><Win cam="github" /></div>
        </section>

        {/* Record */}
        <section className="pg-sec" id="record" aria-labelledby="h-record">
          <div className="pg-col">
            <h2 id="h-record">Record</h2>
            <ol className="pg-honors">
              {HONORS.map((h) => <li key={h.what}><span className="w">{h.what}</span><span className="d">{h.detail}</span></li>)}
            </ol>
            <div className="pg-plates">
              {AWARDS.map((a) => (
                <Ext key={a.site} className="pg-plate" href={a.href}>
                  <img src={BASE + a.img} alt={`Certificate: ${a.site}`} loading="lazy" width={720} height={1018} />
                  <span className="s">{a.site}</span>
                  <span className="n">{a.note}</span>
                </Ext>
              ))}
            </div>
          </div>
          <div className="pg-stagecell"><Win cam="record" /></div>
        </section>

        {/* Off the record */}
        <section className="pg-band pg-off" aria-labelledby="h-off">
          <h2 id="h-off">Off the record</h2>
          <div className="pg-off-cols">
            <div><h3>Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider}, {c.title}</b> {c.note}</li>)}</ul></div>
          </div>
        </section>

        {/* Contact: the stair comes down */}
        <section className="pg-sec pg-contact" id="contact" aria-labelledby="h-contact">
          <div className="pg-col">
            <h2 id="h-contact">Contact</h2>
            <p className="pg-hint">Climbed. Now the ladder comes down into one stack.</p>
            <ul className="pg-contacts">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <span className="lab">{l.label}</span>
                  {l.href ? <Ext href={l.href}>{l.value}</Ext> : <span className="val">{l.value}</span>}
                </li>
              ))}
            </ul>
          </div>
          <div className="pg-stagecell"><Win cam="contact" /></div>
        </section>
      </main>

      <footer className="pg-foot">
        <p>Draft 52 of the portfolio. Not the live site.</p>
        <p>The stair is built on the raycast-cycling example by Poimandres (pmndrs/examples, MIT).</p>
        <a href="#main">Back to the title page</a>
      </footer>

      {webgl && open >= 0 && (
        <aside className="pg-reader" aria-label={`Page ${pageOf(open)} of the paper`}>
          <p className="rd-h"><span>p. {pageOf(open)}</span> {PAGES[pageOf(open) - 1].label}</p>
          <div className="rd-b"><PageText n={pageOf(open)} /></div>
          <button type="button" className="pg-textbtn" onClick={() => { const i = open; pick(-1); folioRefs.current[i]?.focus(); }}>Put it back</button>
        </aside>
      )}
    </div>
  );
}
