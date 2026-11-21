// Draft 75, The rungs. His name stands on a ladder of his own three words; climb it, throw it away.
// Built on React Bits FallingText (DavidHDev/react-bits, MIT + Commons Clause): its matter-js DOM bodies, walls and drag, in heap.ts.
import { useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/newsreader/opsz.css';
import './rungs.css';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, STATS, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { Heap, useClimb, type Bit } from './Heap';

const src = (p: string) => import.meta.env.BASE_URL + p;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
type Paper = (typeof RESEARCH)[0] & { keywords: string[]; epigraph: { text: string; source: string }; ladders: { who: string; when: string; where: string }[]; pages: number };
const paper = RESEARCH[0] as Paper;
const wess = RESEARCH[1];
const ext = (href: string) => (href.startsWith('mailto:') ? {} : { target: '_blank', rel: 'noreferrer' });

const HEADS = [
  ['about', 'About'],
  ['debate', 'Debate'],
  ['research', 'Research'],
  ['work', 'Work'],
  ['today', 'Today'],
  ['github', 'Live from GitHub'],
  ['now', 'Now'],
  ['record', 'Record'],
  ['off', 'Off the record'],
  ['contact', 'Contact'],
] as const;
const NAV = HEADS.filter(([id]) => ['debate', 'research', 'work', 'today', 'contact'].includes(id));

function Rung({ id, children }: { id: string; children: string }) {
  return (
    <h2 className="rg-h" id={id + '-h'}>
      <span>{children}</span>
    </h2>
  );
}

/* The first screen: the name on a ladder of three words. */
function Hero() {
  const stage = useRef<HTMLElement>(null);
  const ladder = useRef<HTMLDivElement>(null);
  const after = useRef<HTMLParagraphElement>(null);
  const words = [...PERSON.short].reverse(); // bottom first: Builder., Researcher., Debater.
  const c = useClimb(words.length, stage, ladder, after);
  return (
    <header className="rg-hero" ref={stage}>
      <nav className="rg-nav" aria-label="Sections">
        {NAV.map(([id, label]) => (
          <a key={id} href={'#' + id}>{label === 'Live from GitHub' ? 'GitHub' : label}</a>
        ))}
      </nav>
      <h1 className="rg-name">
        <span>{PERSON.first}</span> <span>{PERSON.last}</span>
      </h1>
      <div className="rg-hero-row">
        <div className="rg-ladder rg-ladder--hero" ref={ladder} data-thrown={c.thrown ? '' : undefined} aria-hidden={c.thrown ? true : undefined}>
          <span className="rg-rail rg-rail--l" data-piece="rg-bit--rail" />
          <span className="rg-rail rg-rail--r" data-piece="rg-bit--rail" />
          <ol className="rg-rungs" aria-label="A ladder of three words, climb from the bottom">
            {words.map((w, i) => (
              <li key={w}>
                <button
                  type="button"
                  className="rg-rung"
                  data-piece="rg-bit--rung rg-bit--hero"
                  aria-pressed={i < c.step}
                  disabled={i > c.step || c.thrown}
                  onClick={() => c.stand(i)}
                >
                  <span className="rg-word">{w}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
        <div className="rg-hero-side">
          <p className="rg-line">{PERSON.line}</p>
          {c.thrown ? (
            <p className="rg-after" ref={after} tabIndex={-1}>
              <span>You needed it to get up here.</span>
              <span>Now you do not.</span>
            </p>
          ) : c.top ? (
            <button type="button" className="rg-throw" onClick={c.throwIt}>Throw it away</button>
          ) : (
            <p className="rg-cue">Climb it, then throw it away.</p>
          )}
        </div>
      </div>
      <Heap bits={c.bits} className="rg-heap--hero" />
    </header>
  );
}

/* Research: the three ladders of the paper, climbed and thrown; the paper is what stands. */
function Research() {
  const stage = useRef<HTMLDivElement>(null);
  const ladder = useRef<HTMLDivElement>(null);
  const after = useRef<HTMLParagraphElement>(null);
  const c = useClimb(paper.ladders.length, stage, ladder, after);
  return (
    <section className="rg-sec rg-research" id="research" aria-labelledby="research-h">
      <Rung id="research">Research</Rung>
      <div className="rg-research-stage" ref={stage}>
      <div className="rg-research-grid">
        <div className="rg-research-climb">
          <div className="rg-research-cue">
            {c.thrown ? (
              <p className="rg-after rg-after--small" ref={after} tabIndex={-1}>
                <span>You needed it to get up here.</span>
                <span>Now you do not.</span>
              </p>
            ) : c.top ? (
              <button type="button" className="rg-throw" onClick={c.throwIt}>Throw it away</button>
            ) : (
              <p className="rg-cue">One image, three ladders. Climb them.</p>
            )}
          </div>
          <div className="rg-ladder rg-ladder--tall" ref={ladder} data-thrown={c.thrown ? '' : undefined} aria-hidden={c.thrown ? true : undefined}>
            <span className="rg-rail rg-rail--l" data-piece="rg-bit--rail" />
            <span className="rg-rail rg-rail--r" data-piece="rg-bit--rail" />
            <ol className="rg-rungs" aria-label="The three ladders the paper traces, oldest at the bottom">
              {paper.ladders.map((l, i) => (
                <li key={l.who}>
                  <button
                    type="button"
                    className="rg-rung rg-rung--tall"
                    data-piece="rg-bit--rung rg-bit--tall"
                    aria-pressed={i < c.step}
                    disabled={i > c.step || c.thrown}
                    onClick={() => c.stand(i)}
                  >
                    <span className="rg-who">{l.who}</span>
                    <span className="rg-where">{l.when}, {l.where}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <article className="rg-paper">
          <p className="rg-meta">{paper.status}, {paper.pages} pages</p>
          <h3 className="rg-paper-title">{paper.title}</h3>
          <blockquote className="rg-epi">
            <p>{paper.epigraph.text}</p>
            <cite>{paper.epigraph.source}</cite>
          </blockquote>
          <p className="rg-abstract">{paper.abstract}</p>
          <p className="rg-keys"><span className="sr-only-x">Keywords: </span>{paper.keywords.join(' / ')}</p>
          <ul className="rg-paper-links">
            {paper.links.map((l) => (
              <li key={l.label}><a href={l.href} {...ext(l.href)}>{l.label}</a></li>
            ))}
          </ul>
          <p className="rg-doi">DOI {paper.doi}</p>
        </article>
      </div>
      <Heap bits={c.bits} className="rg-heap--research" />
      </div>
      <div className="rg-wess">
        <h3>{wess.title}</h3>
        <p className="rg-meta">{wess.status}</p>
        <p>{wess.abstract}</p>
      </div>
    </section>
  );
}

/* Today: the newest note is the top rung; earlier notes are the rungs beneath. */
function Today() {
  const { notes, loaded } = useNotes();
  const [open, setOpen] = useState<string | null>(null);
  const [latest, ...earlier] = notes;
  return (
    <section className="rg-sec" id="today" aria-labelledby="today-h">
      <Rung id="today">Today</Rung>
      <div className="rg-notes">
        {latest ? (
          <article className="rg-note-top">
            <p className="rg-note-date"><time dateTime={latest.date}>{formatDate(latest.date)}</time></p>
            {latest.body.map((p, i) => <p key={i} className="rg-note-body">{p}</p>)}
          </article>
        ) : (
          <div className="rg-note-top" role="status">
            <p className="rg-note-date">{loaded ? 'No note yet' : 'Today'}</p>
            <p className="rg-note-body">{loaded ? 'The daily note will stand here once it is posted.' : 'Fetching the latest note.'}</p>
          </div>
        )}
        {earlier.length > 0 && (
          <ol className="rg-note-list" aria-label="Earlier notes">
            {earlier.map((n) => {
              const on = open === n.date;
              return (
                <li key={n.date} className={on ? 'is-open' : ''}>
                  <button type="button" aria-expanded={on} onClick={() => setOpen(on ? null : n.date)}>
                    <time dateTime={n.date}>{formatDate(n.date)}</time>
                    <span className="rg-note-peek">{on ? 'Close' : n.body[0]}</span>
                  </button>
                  {on && <div className="rg-note-open">{n.body.map((p, i) => <p key={i}>{p}</p>)}</div>}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

function GitHubLive() {
  const gh = useGitHub();
  const commits = gh.activity.slice(0, 6);
  return (
    <section className="rg-sec" id="github" aria-labelledby="github-h">
      <Rung id="github">Live from GitHub</Rung>
      <div className={'rg-gh' + (commits.length ? '' : ' rg-gh--still')}>
        {commits.length > 0 && (
          <div>
            <h3 className="rg-sub">Latest commits</h3>
            <ol className="rg-commits">
              {commits.map((a, i) => (
                <li key={i}>
                  <a href={a.href} target="_blank" rel="noreferrer">
                    <span className="rg-commit-msg">{a.message}</span>
                    <span className="rg-commit-meta">{a.repo}, {ago(a.at)}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        )}
        <div>
          <h3 className="rg-sub">{gh.live ? 'Recently pushed' : 'Repositories'}</h3>
          <ul className="rg-repos">
            {gh.repos.slice(0, 6).map((r) => (
              <li key={r.name}>
                <a href={r.href} target="_blank" rel="noreferrer">
                  <span className="rg-repo-name">{r.name}</span>
                  {r.description && <span className="rg-repo-desc">{r.description}</span>}
                  {r.language && <span className="rg-repo-lang">{r.language}{r.pushedAt ? `, pushed ${ago(r.pushedAt)}` : ''}</span>}
                </a>
              </li>
            ))}
          </ul>
          <p className="rg-gh-all"><a href={GITHUB.href} target="_blank" rel="noreferrer">{host(GITHUB.href)}</a></p>
        </div>
      </div>
    </section>
  );
}

/* The close: every heading you climbed past, already fallen, under the contact links. */
function Contact() {
  const band = useRef<HTMLDivElement>(null);
  const [go, setGo] = useState(false);
  useEffect(() => {
    const el = band.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setGo(true); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const bits: Bit[] = useMemo(
    () => (go ? HEADS.filter(([id]) => id !== 'contact').map(([id, label]) => ({ key: id, html: `<span>${label}</span>`, cls: 'rg-bit--head' })) : []),
    [go],
  );
  return (
    <section className="rg-sec rg-contact" id="contact" aria-labelledby="contact-h">
      <Rung id="contact">Contact</Rung>
      <p className="rg-close-line">Everything you climbed to get here.</p>
      <ul className="rg-links">
        {LINKS.map((l) => (
          <li key={l.label}>
            <span className="rg-link-label">{l.label}</span>
            {l.href ? <a href={l.href} {...ext(l.href)}>{l.value}</a> : <span className="rg-link-plain">{l.value}</span>}
          </li>
        ))}
      </ul>
      <div className="rg-band" ref={band}>
        <Heap bits={bits} className="rg-heap--close" spawn="above" />
      </div>
    </section>
  );
}

export default function RungsPage() {
  useVersion('rungs');
  return (
    <div className="v-rungs">
      <a className="skip-x" href="#main">Skip to content</a>
      <Hero />
      <main id="main">
        <section className="rg-sec" id="about" aria-labelledby="about-h">
          <Rung id="about">About</Rung>
          <div className="rg-about">
            {PERSON.about.map((p, i) => <p key={i}>{p}</p>)}
            <p className="rg-aside">{PERSON.aside}</p>
          </div>
        </section>

        <section className="rg-sec" id="debate" aria-labelledby="debate-h">
          <Rung id="debate">Debate</Rung>
          <ol className="rg-wins" aria-label="Championships">
            {[...DEBATE.wins].reverse().map((w) => (
              <li key={w.where} className="rg-win">
                <span className="rg-win-title">{w.title}</span>
                <span className="rg-win-detail">
                  <span className="rg-win-event">{w.event}</span>
                  <span>{w.where}, {w.when}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="rg-team">
            <div className="rg-team-main">
              <h3 className="rg-team-name">{DEBATE.team.name}</h3>
              <p className="rg-meta">{DEBATE.team.role}</p>
              <p>{DEBATE.team.line}</p>
              <p>{DEBATE.team.record}</p>
              <p><a href={DEBATE.team.href} target="_blank" rel="noreferrer">{host(DEBATE.team.href)}</a></p>
            </div>
            <div className="rg-next">
              <h3 className="rg-sub">Up next</h3>
              <ul>
                {DEBATE.next.map((n) => (
                  <li key={n.where}><span className="rg-next-where">{n.where}</span><span>{n.event}</span></li>
                ))}
              </ul>
              <p className="rg-status">{NOW.status}</p>
            </div>
          </div>
        </section>

        <Research />

        <section className="rg-sec" id="work" aria-labelledby="work-h">
          <Rung id="work">Work</Rung>
          <ol className="rg-work">
            {WORK.map((w) => (
              <li key={w.slug} className="rg-panel">
                <img src={src(w.img)} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={750} />
                <div className="rg-panel-text">
                  <p className="rg-meta">{w.kind}</p>
                  <h3>{w.name}</h3>
                  <p>{w.line}</p>
                  <p className="rg-stack">{w.stack}</p>
                  {w.href ? <p><a href={w.href} target="_blank" rel="noreferrer">{host(w.href)}</a></p> : <p className="rg-stack">No public link</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <Today />
        <GitHubLive />

        <section className="rg-sec" id="now" aria-labelledby="now-h">
          <Rung id="now">Now</Rung>
          <div className="rg-now">
            <div>
              <h3>{NOW.reading.title}</h3>
              <p>{NOW.reading.body}</p>
              <ul className="rg-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <h3>{NOW.club.title}</h3>
              <p>{NOW.club.body}</p>
            </div>
          </div>
        </section>

        <section className="rg-sec" id="record" aria-labelledby="record-h">
          <Rung id="record">Record</Rung>
          <ul className="rg-stats">
            {STATS.map((s) => <li key={s.label}><span className="rg-stat-n">{s.to}{s.suffix}</span><span>{s.label}</span></li>)}
          </ul>
          <div className="rg-record">
            <ol className="rg-honors">
              {HONORS.map((h) => <li key={h.what}><span className="rg-honor-what">{h.what}</span><span className="rg-honor-detail">{h.detail}</span></li>)}
            </ol>
            <ul className="rg-awards">
              {AWARDS.map((a) => (
                <li key={a.site}>
                  <a href={a.href} target="_blank" rel="noreferrer">
                    <img src={src(a.img)} alt={`Certificate, ${a.site}`} loading="lazy" />
                    <span className="rg-award-site">{a.site}</span>
                    <span className="rg-award-note">{a.note}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="rg-sec" id="off" aria-labelledby="off-h">
          <Rung id="off">Off the record</Rung>
          <div className="rg-off">
            <div><h3 className="rg-sub">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="rg-sub">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="rg-sub">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="rg-sub">Courses</h3><ul>{COURSES.map((x) => <li key={x.title}><span className="rg-course">{x.provider}, {x.title}</span> {x.note}</li>)}</ul></div>
          </div>
        </section>

        <Contact />
      </main>
      <footer className="rg-foot">
        <p>Draft 75 of the portfolio. Not the live site.</p>
        <p>Falling type built on FallingText from React Bits by David Haz, with matter-js. Set in Archivo and Newsreader.</p>
      </footer>
    </div>
  );
}
