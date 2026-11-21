// Draft 53: the mirror. ARMAAN SETH in huge letters on a dark mirror floor; inside the letters run the sites he built.
// The scene is remixed from pmndrs/examples "ground-reflections-and-video-textures" (MIT); see Scene.tsx.
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import '@fontsource/anton/400.css';
import '@fontsource-variable/hanken-grotesk/index.css';
import './mirror.css';
import { PERSON, CHAPTERS, DEBATE, RESEARCH, WORK, HONORS, AWARDS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { scrollToY } from '@/lib/scroll';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { stage } from './stage';
import type { Mode } from './Scene';

const Scene = lazy(() => import('./Scene'));
const BASE = import.meta.env.BASE_URL;
const STEP_VH = 0.75; // scroll per project in the Work reel, in viewport heights

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const Ext = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

/** Mounts a scene only near the viewport, and renders it only while it is on screen. */
function Stage({ mode, phone, className, onHover, onPick }: { mode: Mode; phone: boolean; className: string; onHover?: (i: number) => void; onPick?: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(mode === 'hero');
  const [on, setOn] = useState(mode === 'hero');
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const a = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: '80% 0px' });
    const b = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin: '0px' });
    a.observe(el); b.observe(el);
    return () => { a.disconnect(); b.disconnect(); };
  }, []);
  return (
    <div className={`stage ${className}`} ref={ref} aria-hidden="true">
      {near && <Suspense fallback={null}><Scene key={phone ? 'p' : 'd'} mode={mode} phone={phone} active={on} onHover={onHover} onPick={onPick} /></Suspense>}
    </div>
  );
}

/** Without WebGL, or with reduced motion: the name as type, with one still page showing through it. */
function FlatName({ as: Tag = 'p', text, img, className = '' }: { as?: 'h1' | 'h3' | 'p'; text: string; img: string; className?: string }) {
  return <Tag className={`clip ${className}`} style={{ backgroundImage: `linear-gradient(rgba(236,235,231,0.24), rgba(236,235,231,0.24)), url(${BASE + img})` }}>{text}</Tag>;
}

export default function Mirror() {
  useVersion('mirror');
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  const flat = still || !webgl;
  const reel = !flat && !phone; // the pinned Work set piece
  const [hover, setHover] = useState(-1);
  const [step, setStep] = useState(0);
  const workRef = useRef<HTMLElement>(null);
  const endRef = useRef<HTMLElement>(null);
  const { notes, loaded } = useNotes();
  const gh = useGitHub();

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // Work: which project the reel is on, from how far the pinned section has scrolled.
  useEffect(() => {
    if (!reel) return;
    let last = -1, raf = 0;
    const read = () => {
      raf = 0;
      const el = workRef.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight);
      const i = Math.max(0, Math.min(WORK.length - 1, Math.floor((-r.top / span) * WORK.length)));
      if (i !== last) { last = i; stage.work = i; setStep(i); }
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    window.addEventListener('scroll', on, { passive: true });
    return () => { window.removeEventListener('scroll', on); cancelAnimationFrame(raf); };
  }, [reel]);

  // The closing scene: the live site slides into the letters once Contact is mostly in view.
  useEffect(() => {
    const el = endRef.current; if (!el || flat) return;
    stage.end = false;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) stage.end = true; }, { threshold: 0.45 });
    io.observe(el);
    return () => io.disconnect();
  }, [flat]);

  const goStep = useCallback((i: number) => {
    const el = workRef.current; if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - window.innerHeight;
    scrollToY(top + ((i + 0.5) / WORK.length) * span);
  }, []);

  const open = useCallback((i: number) => {
    const w = WORK[i];
    if (!w) return;
    if (phone) { setHover(i); return; } // on a phone a tap names it; the named link below opens it
    if (w.href) window.open(w.href, '_blank', 'noopener');
  }, [phone]);

  const [latest, ...earlier] = notes;
  const [paper, wess] = RESEARCH;
  const shown = WORK[hover];
  const built = CHAPTERS.find((c) => c.id === 'builds')!;

  return (
    <div className={`v-mirror${phone ? ' is-phone' : ''}${flat ? ' is-flat' : ''}`}>
      <a className="skip-x" href="#main">Skip to content</a>

      <header className="hero" id="top">
        {flat ? (
          <div className="flatstage">
            <FlatName as="h1" text={PERSON.name} img={WORK[7].img} className="flatname" />
          </div>
        ) : (
          <>
            <h1 className="sr-only-x">{PERSON.name}</h1>
            <Stage mode="hero" phone={phone} className="hero-stage" onHover={setHover} onPick={open} />
          </>
        )}
        <div className="band">
          <p className="line">{PERSON.line}</p>
          <div className="slot">
            {flat ? (
              <p className="hint">His name, filled with the sites he built.</p>
            ) : shown ? (
              <p className="named">
                <span className="nk">{shown.kind}</span>
                {shown.href ? <Ext className="nn" href={shown.href}>{shown.name}</Ext> : <span className="nn">{shown.name}</span>}
              </p>
            ) : (
              <p className="hint">{phone ? 'Tap a letter to see whose site it is.' : 'Point at a letter to see whose site it is.'}</p>
            )}
          </div>
          <nav className="toc" aria-label="Sections">
            <ul>
              {[['debate', 'Debate'], ['work', 'Work'], ['research', 'Research'], ['today', 'Today'], ['github', 'GitHub'], ['contact', 'Contact']].map(([id, l]) => (
                <li key={id}><a href={`#${id}`}>{l}</a></li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="debate" id="debate" aria-labelledby="h-debate">
          <div className="wrap">
            <h2 id="h-debate" className="sec">Debate</h2>
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
              <div className="tmain">
                <p className="role">{DEBATE.team.role}</p>
                <h3 className="tname">{DEBATE.team.name}</h3>
                <p className="body">{DEBATE.team.line}</p>
                <p className="body dim">{DEBATE.team.record}</p>
                <Ext className="go" href={DEBATE.team.href}>skeptical.pages.dev</Ext>
              </div>
              <div className="next">
                <h3 className="small">Up next</h3>
                <ul>{DEBATE.next.map((n) => <li key={n.where}><b>{n.where}</b><span>{n.event}</span></li>)}</ul>
              </div>
            </div>
          </div>
        </section>

        <section className="about" id="about" aria-labelledby="h-about">
          <div className="wrap">
            <h2 id="h-about" className="short">{PERSON.short.join(' ')}</h2>
            <div className="paras">
              {PERSON.about.map((p) => <p key={p.slice(0, 16)} className="body">{p}</p>)}
            </div>
            <p className="aside">{PERSON.aside}</p>
          </div>
        </section>

        {reel ? (
          <section className="work is-reel" id="work" aria-labelledby="h-work" ref={workRef} style={{ height: `${100 + WORK.length * STEP_VH * 100}svh` }}>
            <div className="pin">
              <Stage mode="work" phone={phone} className="work-stage" onPick={(i) => { const w = WORK[i]; if (w?.href) window.open(w.href, '_blank', 'noopener'); }} />
              <div className="wband" data-gl>
                <div className="wside">
                  <h2 id="h-work" className="sec">Work</h2>
                  <ol className="steps">
                    {WORK.map((w, i) => (
                      <li key={w.slug}>
                        <button type="button" className={i === step ? 'is-on' : ''} aria-current={i === step ? 'step' : undefined} onClick={() => goStep(i)}>
                          <span className="sn">{w.n}</span>{w.name}
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="wcards">
                  {WORK.map((w, i) => (
                    <article key={w.slug} className={`proj${i === step ? ' is-on' : ''}`} aria-hidden={i !== step}>
                      <p className="pk">{w.kind}</p>
                      <h3 className="pn">{w.name}</h3>
                      <p className="body">{w.line}</p>
                      <p className="stack">{w.stack}</p>
                      {w.href ? <Ext className="go" href={w.href}>Open {w.name}</Ext> : <p className="stack">No public link</p>}
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="work is-list" id="work" aria-labelledby="h-work">
            <div className="wrap">
              <h2 id="h-work" className="sec">Work</h2>
              <ol className="plates">
                {WORK.map((w) => (
                  <li key={w.slug} className="plate">
                    <FlatName as="h3" text={w.name} img={w.img} className="pname" />
                    <figure className="shot"><img src={BASE + w.img} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={700} /></figure>
                    <div className="pcopy">
                      <p className="pk">{w.n} {w.kind}</p>
                      <p className="body">{w.line}</p>
                      <p className="stack">{w.stack}</p>
                      {w.href ? <Ext className="go" href={w.href}>Open {w.name}</Ext> : <p className="stack">No public link</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        <section className="research" id="research" aria-labelledby="h-research">
          <div className="wrap">
            <h2 className="sec">Research</h2>
            <blockquote className="epi">
              <p>{paper.epigraph?.text}</p>
              <footer>{paper.epigraph?.source}</footer>
            </blockquote>
            <div className="paper">
              <p className="pstat">{paper.status}{paper.pages ? `, ${paper.pages} pages` : ''}</p>
              <h3 id="h-research" className="ptitle">{paper.title}</h3>
              <p className="body lead">{paper.abstract}</p>
              <ul className="keys" aria-label="Keywords">{paper.keywords?.map((k) => <li key={k}>{k}</li>)}</ul>
              <ol className="ladders" aria-label="The three ladders the paper follows">
                {paper.ladders?.map((l) => <li key={l.who}><b>{l.who}</b><span>{l.when}</span><span>{l.where}</span></li>)}
              </ol>
              <ul className="plinks">{paper.links.map((l) => <li key={l.label}><Ext className="go" href={l.href}>{l.label}</Ext></li>)}</ul>
            </div>
            <div className="wess">
              <p className="pstat">{wess.status}</p>
              <h3>{wess.title}</h3>
              <p className="body">{wess.abstract}</p>
            </div>
          </div>
        </section>

        <section className="today" id="today" aria-labelledby="h-today">
          <div className="wrap">
            <h2 id="h-today" className="sec">Today</h2>
            {latest ? (
              <article className="note">
                <p className="ndate"><time dateTime={latest.date}>{formatDate(latest.date)}</time></p>
                <div className="ntext">{latest.body.map((b) => <p key={b.slice(0, 24)}>{b}</p>)}</div>
              </article>
            ) : (
              <article className="note is-wait">
                <p className="ndate">{loaded ? 'Quiet today' : 'Today'}</p>
                <div className="ntext"><p>{loaded ? 'No note yet. The next one lands here.' : 'Fetching the latest note.'}</p></div>
              </article>
            )}
            {earlier.length > 0 && (
              <details className="earlier">
                <summary>Earlier notes <span>{earlier.length}</span></summary>
                <ol>{earlier.map((n) => <li key={n.date}><time dateTime={n.date}>{formatDate(n.date)}</time><div>{n.body.map((b) => <p key={b.slice(0, 24)}>{b}</p>)}</div></li>)}</ol>
              </details>
            )}
          </div>
        </section>

        <section className="github" id="github" aria-labelledby="h-github">
          <div className="wrap">
            <div className="ghhead">
              <h2 id="h-github" className="sec">Live from GitHub</h2>
              <Ext className="go" href={GITHUB.href}>github.com/{GITHUB.user}</Ext>
            </div>
            {gh.activity.length > 0 && (
              <ol className="commits" aria-label="Recent commits">
                {gh.activity.slice(0, 6).map((c) => (
                  <li key={c.href}><a href={c.href} rel="noopener"><span className="msg">{c.message}</span><span className="meta"><b>{c.repo}</b> {ago(c.at)}</span></a></li>
                ))}
              </ol>
            )}
            <ol className="repos" aria-label="Repositories">
              {gh.repos.slice(0, 6).map((r) => (
                <li key={r.name}>
                  <a href={r.href} rel="noopener">
                    <span className="rn">{r.name}</span>
                    <span className="rd">{r.description ?? 'No description yet.'}</span>
                    <span className="rl">{[r.language, r.pushedAt ? `pushed ${ago(r.pushedAt)}` : ''].filter(Boolean).join(', ')}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="now" id="now" aria-labelledby="h-now">
          <div className="wrap">
            <h2 className="sec">Now</h2>
            <div className="nowgrid">
              <div className="reading">
                <h3 id="h-now" className="big">{NOW.reading.title}</h3>
                <p className="body">{NOW.reading.body}</p>
                <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
              <div className="club">
                <h3 className="small">{NOW.club.title}</h3>
                <p className="body">{NOW.club.body}</p>
                <p className="status">{NOW.status}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="record" id="record" aria-labelledby="h-record">
          <div className="wrap">
            <h2 id="h-record" className="sec">Record</h2>
            <div className="recgrid">
              <ol className="honors">{HONORS.map((h) => <li key={h.what}><span className="hw">{h.what}</span><span className="hd">{h.detail}</span></li>)}</ol>
              <ul className="certs">
                {AWARDS.map((a) => (
                  <li key={a.site}>
                    <a href={a.href} rel="noopener">
                      <span className="cs">{a.site}</span>
                      <span className="cn">{a.note}</span>
                      <img src={BASE + a.img} alt={`Certificate for ${a.site}`} loading="lazy" width={720} height={1018} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="offrec" aria-labelledby="h-off">
          <div className="wrap">
            <h2 id="h-off" className="sec">Off the record</h2>
            <div className="lists">
              <div><h3 className="small">Likes</h3><ul>{LIKES.map((l) => <li key={l}>{l}</li>)}</ul></div>
              <div><h3 className="small">Dislikes</h3><ul>{DISLIKES.map((l) => <li key={l}>{l}</li>)}</ul></div>
              <div><h3 className="small">Favourites</h3><ul>{FAVOURITES.map((l) => <li key={l}>{l}</li>)}</ul></div>
              <div><h3 className="small">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider} {c.title}</b> {c.note}</li>)}</ul></div>
            </div>
          </div>
        </section>
      </main>

      <footer className="end" id="contact" ref={endRef} aria-labelledby="h-contact">
        {flat ? (
          <div className="flatstage is-end"><FlatName text={PERSON.name} img="og.jpg" className="flatname" /></div>
        ) : (
          <Stage mode="end" phone={phone} className="end-stage" />
        )}
        <div className="wrap">
          <p className="built">{built.body}</p>
          <h2 id="h-contact" className="sec">Contact</h2>
          <ul className="links">
            {LINKS.map((l) => (
              <li key={l.label}><span className="ll">{l.label}</span>{l.href ? <Ext href={l.href}>{l.value}</Ext> : <span className="lv">{l.value}</span>}</li>
            ))}
          </ul>
          <div className="colophon">
            <p>Draft 53 of the portfolio. Not the live site.</p>
            <p>Scene built on the pmndrs ground reflections example. Floor textures from ambientCG. Set in Anton and Hanken Grotesk.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
