// Draft 32, The hourglass. A tall glass of pale sand stands beside the page and turns over once per
// section; the sand that has run is how far into the section you are. Debate lays it on its side,
// the one place time is held. His commits settle in the bottom as plum stripes.
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/hanken-grotesk';
import { ArrowUpRight } from 'lucide-react';
import './hourglass.css';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, STATS, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { still } from '@/lib/utils';
import Pour from './Pour';
import { S } from './state';

const Scene = lazy(() => import('./Scene'));
const src = (p: string) => import.meta.env.BASE_URL + p;
const paper = RESEARCH[0];
const wess = RESEARCH[1];
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const sixty = STATS[0];

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** Without WebGL or with reduced motion: the glass drawn still, mid-pour. */
function Still() {
  return (
    <svg className="hg-still" viewBox="0 0 300 460" role="img" aria-label="An hourglass of pale sand, mid-pour">
      <ellipse cx="150" cy="436" rx="104" ry="9" fill="#2a2118" opacity="0.14" />
      <rect x="54" y="38" width="192" height="20" rx="4" fill="#141312" />
      <rect x="54" y="408" width="192" height="20" rx="4" fill="#141312" />
      {[66, 150, 234].map((x) => <rect key={x} x={x - 2.5} y="58" width="5" height="350" fill="#141312" opacity={x === 150 ? 0.35 : 1} />)}
      <path d="M150 233 C 150 214, 216 196, 218 136 C 220 92, 196 62, 150 60 C 104 62, 80 92, 82 136 C 84 196, 150 214, 150 233 C 150 252, 84 270, 82 330 C 80 374, 104 404, 150 406 C 196 404, 220 374, 218 330 C 216 270, 150 252, 150 233 Z" fill="#f6f3ec" stroke="#8d877d" strokeWidth="1.5" />
      <path d="M150 230 C 150 220, 178 206, 196 178 L 150 196 L 104 178 C 122 206, 150 220, 150 230 Z" fill="#e2d3b5" />
      <path d="M150 236 L 150 352" stroke="#d8c7a5" strokeWidth="1.6" />
      <path d="M86 352 L 150 330 L 214 352 C 216 378, 196 404, 150 405 C 104 404, 84 378, 86 352 Z" fill="#e2d3b5" />
      <path d="M93 382 C 120 386, 180 386, 207 382 M88 366 C 120 370, 180 370, 212 366" stroke="#6b2a5e" strokeWidth="3" fill="none" />
      <path d="M96 92 C 88 110, 88 150, 98 180" stroke="#ffffff" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

function Out({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return <a className={className ?? 'hg-link'} href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">{children}<ArrowUpRight aria-hidden="true" className="hg-arrow" /></a>;
}

export default function Hourglass() {
  useVersion('hourglass');
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const [gl] = useState(() => !still && hasWebGL() && !/flat/.test(location.search));
  const [lit, setLit] = useState(-1);
  const drag = useRef<{ x: number; y: number; id: number; moved: boolean } | null>(null);
  const latest = notes[0];
  const commits = gh.activity.slice(0, 12);
  const byCommit = commits.length > 0;
  const nStripes = byCommit ? commits.length : gh.repos.length;

  useEffect(() => { S.stripes = nStripes; }, [nStripes]);
  useEffect(() => { S.onStripe = (i) => { S.active = i; setLit(i); }; return () => { S.onStripe = () => {}; }; }, []);
  useEffect(() => {
    if (!latest) return;
    const hrs = (Date.now() - new Date(latest.date + 'T12:00:00').getTime()) / 3.6e6;
    S.todayTop = Math.min(1, Math.max(0.06, 1 - hrs / 24));
  }, [latest]);
  useEffect(() => () => { S.user = S.userTo = 0; S.free = true; S.active = -1; }, []);

  const light = (i: number) => { S.active = i; setLit(i); };
  const turn = () => { S.userTo += Math.PI; S.user = S.userTo; };

  const down = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) {
      if (e.pointerType === 'mouse') { const i = S.pick(e.clientX, e.clientY); (e.currentTarget as HTMLElement).style.cursor = i >= 0 ? 'pointer' : ''; if (i >= 0 && i !== S.active) light(i); }
      return;
    }
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(dy)) { d.moved = true; S.dragging = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }
    if (d.moved) S.user = S.userTo - (dx / (e.currentTarget as HTMLElement).clientWidth) * Math.PI * 1.6;
  };
  const up = (e: React.PointerEvent) => {
    const d = drag.current; drag.current = null;
    if (!d) return;
    if (d.moved) { S.dragging = false; S.userTo = Math.round(S.user / Math.PI) * Math.PI; S.user = S.userTo; return; }
    if (e.type === 'pointercancel') return;
    const i = S.pick(e.clientX, e.clientY);
    if (i >= 0) light(i); else turn();
  };

  return (
    <div className={`v-hourglass${gl ? '' : ' is-still'}`}>
      <a className="skip-x" href="#main">Skip to content</a>
      <div className="hg-wrap">
        <div className="hg-stage">
          {gl ? (
            <div className="hg-gl" aria-hidden="true" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
              <Suspense fallback={<Still />}><Scene /></Suspense>
            </div>
          ) : <Still />}
        </div>

        <main id="main" className="hg-copy">
          <section className="hg-sec hg-hero" data-turn="hero">
            <h1 className="hg-name"><span>{PERSON.first}</span> <span>{PERSON.last}</span></h1>
            <p className="hg-line">{PERSON.line}</p>
            <p className="hg-short">{PERSON.short.join(' ')}</p>
            {gl && (
              <p className="hg-hint">
                <span>Drag the glass to turn it over.</span>
                <button type="button" className="hg-turn" onClick={turn}>Turn it over</button>
              </p>
            )}
          </section>

          <section className="hg-sec hg-about" data-turn="about" aria-labelledby="h-about">
            <h2 id="h-about" className="hg-h">About</h2>
            <Pour text={`${sixty.to}${sixty.suffix}`} label={sixty.label} moving={gl} />
            <div className="hg-prose">
              {PERSON.about.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <p className="hg-aside">{PERSON.aside}</p>
          </section>

          <section className="hg-sec hg-debate" data-turn="debate" aria-labelledby="h-debate">
            <h2 id="h-debate" className="hg-h">Debate</h2>
            {DEBATE.wins.map((w) => (
              <article key={w.where} className="hg-win">
                <p className="hg-win-title">{w.title}</p>
                <p className="hg-win-event">{w.event}</p>
                <p className="hg-win-where">{w.where}, {w.when}</p>
              </article>
            ))}
            <div className="hg-team">
              <h3 className="hg-team-name">{DEBATE.team.name}</h3>
              <p className="hg-team-role">{DEBATE.team.role}</p>
              <p className="hg-team-line">{DEBATE.team.line}</p>
              <p className="hg-team-record">{DEBATE.team.record}</p>
              <Out href={DEBATE.team.href}>{host(DEBATE.team.href)}</Out>
            </div>
            <div className="hg-next">
              <h3 className="hg-k">Up next</h3>
              <ul>
                {DEBATE.next.map((n) => <li key={n.where}><span className="hg-next-where">{n.where}</span><span className="hg-next-event">{n.event}</span></li>)}
              </ul>
            </div>
          </section>

          <section className="hg-sec hg-today" data-turn="today" aria-labelledby="h-today">
            <h2 id="h-today" className="hg-h">Today</h2>
            {!loaded ? (
              <p className="hg-note-wait">The note is on its way.</p>
            ) : latest ? (
              <>
                <article className="hg-note">
                  <p className="hg-note-date"><time dateTime={latest.date}>{formatDate(latest.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></p>
                  {latest.body.map((p, i) => <p key={i} className="hg-note-body">{p}</p>)}
                </article>
                {notes.length > 1 && (
                  <div className="hg-earlier">
                    <h3 className="hg-k">Earlier</h3>
                    {notes.slice(1).map((n) => (
                      <details key={n.date} className="hg-old">
                        <summary><time dateTime={n.date}>{formatDate(n.date)}</time><span className="hg-old-peek">{n.body[0]}</span></summary>
                        {n.body.map((p, i) => <p key={i}>{p}</p>)}
                      </details>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="hg-note-body">{NOW.status}</p>
            )}
          </section>

          <section className="hg-sec hg-research" data-turn="research" aria-labelledby="h-research">
            <h2 id="h-research" className="hg-h">Research</h2>
            <h3 className="hg-paper">{paper.title}</h3>
            <p className="hg-paper-status">{paper.status}, {paper.pages} pages</p>
            <p className="hg-abstract">{paper.abstract}</p>
            <ul className="hg-keys" aria-label="Keywords">
              {(paper.keywords ?? []).map((k) => <li key={k}>{k}</li>)}
            </ul>
            <ul className="hg-plinks">
              {paper.links.map((l) => <li key={l.label}><Out href={l.href}>{l.label}</Out></li>)}
            </ul>
            <div className="hg-wess">
              <h3 className="hg-wess-title">{wess.title}</h3>
              <p className="hg-wess-status">{wess.status}</p>
              <p>{wess.abstract}</p>
            </div>
          </section>

          {WORK.map((w, i) => (
            <section key={w.slug} className="hg-sec hg-work" data-turn="work" aria-labelledby={`h-w-${w.slug}`}>
              {i === 0 && <h2 className="hg-h hg-work-h">Work</h2>}
              <figure className="hg-shot">
                <img src={src(w.img)} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={750} />
              </figure>
              <div className="hg-work-text">
                <p className="hg-work-n">{w.n} of {String(WORK.length).padStart(2, '0')}</p>
                <h3 id={`h-w-${w.slug}`} className="hg-work-name">{w.name}</h3>
                <p className="hg-work-kind">{w.kind}</p>
                <p className="hg-work-line">{w.line}</p>
                <p className="hg-work-stack">{w.stack}</p>
                {w.href && <Out href={w.href}>{host(w.href)}</Out>}
              </div>
            </section>
          ))}

          <section className="hg-sec hg-gh" data-turn="github" aria-labelledby="h-gh">
            <h2 id="h-gh" className="hg-h">Live from GitHub</h2>
            <p className="hg-gh-lede">{byCommit ? 'Each plum stripe in the glass is one commit.' : 'Each plum stripe in the glass is one repository.'}</p>
            {byCommit && (
              <ol className="hg-commits">
                {commits.map((c, i) => (
                  <li key={c.href + i} className={lit === i ? 'is-lit' : ''}>
                    <a href={c.href} target="_blank" rel="noreferrer" onPointerEnter={() => light(i)} onFocus={() => light(i)}>
                      <span className="hg-c-msg">{c.message}</span>
                      <span className="hg-c-meta">{c.repo}, {ago(c.at)}</span>
                    </a>
                  </li>
                ))}
              </ol>
            )}
            <h3 className="hg-k">Repositories</h3>
            <ul className="hg-repos">
              {gh.repos.slice(0, 8).map((r, i) => (
                <li key={r.name} className={!byCommit && lit === i ? 'is-lit' : ''}>
                  <a href={r.href} target="_blank" rel="noreferrer" onPointerEnter={() => { if (!byCommit) light(i); }} onFocus={() => { if (!byCommit) light(i); }}>
                    <span className="hg-r-name">{r.name}</span>
                    {r.description && <span className="hg-r-desc">{r.description}</span>}
                    {r.language && <span className="hg-r-lang">{r.language}</span>}
                  </a>
                </li>
              ))}
            </ul>
            <Out href={GITHUB.href}>{host(GITHUB.href)}</Out>
          </section>

          <section className="hg-sec hg-now" data-turn="now" aria-labelledby="h-now">
            <h2 id="h-now" className="hg-h">Now</h2>
            <p className="hg-status">{NOW.status}</p>
            <div className="hg-now-two">
              <div>
                <h3 className="hg-now-t">{NOW.reading.title}</h3>
                <p>{NOW.reading.body}</p>
                <ul className="hg-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
              <div>
                <h3 className="hg-now-t">{NOW.club.title}</h3>
                <p>{NOW.club.body}</p>
              </div>
            </div>
          </section>

          <section className="hg-sec hg-record" data-turn="record" aria-labelledby="h-record">
            <h2 id="h-record" className="hg-h">Record</h2>
            <ul className="hg-stats">
              {STATS.map((s) => <li key={s.label}><span className="hg-stat-n">{s.to}{s.suffix}</span><span className="hg-stat-l">{s.label}</span></li>)}
            </ul>
            <ol className="hg-honors">
              {HONORS.map((h) => <li key={h.what}><span>{h.what}</span><span className="hg-honor-d">{h.detail}</span></li>)}
            </ol>
            <div className="hg-awards">
              {AWARDS.map((a) => (
                <a key={a.site} className="hg-award" href={a.href} target="_blank" rel="noreferrer">
                  <img src={src(a.img)} alt={`WD Awards certificate for ${a.site}`} loading="lazy" width={600} height={850} />
                  <span className="hg-award-site">{a.site}</span>
                  <span className="hg-award-note">{a.note}</span>
                </a>
              ))}
            </div>
          </section>

          <section className="hg-sec hg-off" data-turn="off" aria-labelledby="h-off">
            <h2 id="h-off" className="hg-h">Off the record</h2>
            <div className="hg-off-grid">
              <div><h3 className="hg-k">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="hg-k">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="hg-k">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="hg-k">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider}, {c.title}.</strong> {c.note}</li>)}</ul></div>
            </div>
          </section>

          <section className="hg-sec hg-contact" data-turn="contact" aria-labelledby="h-contact">
            <h2 id="h-contact" className="hg-h">Contact</h2>
            <ul className="hg-links">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <span className="hg-l-label">{l.label}</span>
                  {l.href ? <Out href={l.href} className="hg-l-val">{l.value}</Out> : <span className="hg-l-val">{l.value}</span>}
                </li>
              ))}
            </ul>
            <p className="hg-thanks">Thanks for the time.</p>
            <footer className="hg-foot">
              <p>Draft 32 of the portfolio. Not the live site.</p>
              <p>Set in Bodoni Moda and Hanken Grotesk.</p>
            </footer>
          </section>
        </main>
      </div>
    </div>
  );
}
