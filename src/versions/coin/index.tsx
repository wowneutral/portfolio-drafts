// Draft 35, The coin. A heavy steel coin, AFF on one face and NEG on the other. Toss it: heads, the page
// leads with what he builds; tails, it turns dark and leads with what he questions. Same facts, other side.
import { Suspense, lazy, useCallback, useEffect, useState, type ReactNode } from 'react';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import './coin.css';
import { AWARDS, CHAPTERS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { scrollToY } from '@/lib/scroll';
import { coarse, still } from '@/lib/utils';
import { C, type Face } from './state';

const CoinScene = lazy(() => import('./Coin'));
const src = (p: string) => import.meta.env.BASE_URL + p;
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { epigraph: { text: string; source: string }; keywords: string[]; ladders: { who: string; when: string; where: string }[] };
const wess = RESEARCH[1];
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const PAPER = { aff: '#f3f1ec', neg: '#111111' };
const KEY = 'coin:face';

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
function firstFace(): Face {
  const q = new URLSearchParams(location.search).get('face');
  if (q === 'aff' || q === 'neg') return q;
  try { const s = sessionStorage.getItem(KEY); if (s === 'aff' || s === 'neg') return s; } catch { /* storage off */ }
  return 'aff';
}

type Sec = { id: string; label: string };
const AFF: Sec[] = [
  { id: 'today', label: 'Today' }, { id: 'team', label: 'Skeptical' }, { id: 'work', label: 'Work' }, { id: 'github', label: 'GitHub' },
  { id: 'about', label: 'About' }, { id: 'research', label: 'Research' }, { id: 'now', label: 'Now' }, { id: 'record', label: 'Record' },
  { id: 'off', label: 'Off the record' }, { id: 'contact', label: 'Contact' },
];
const NEG: Sec[] = [
  { id: 'research', label: 'Research' }, { id: 'today', label: 'Today' }, { id: 'now', label: 'Now' }, { id: 'about', label: 'About' },
  { id: 'team', label: 'Skeptical' }, { id: 'record', label: 'Record' }, { id: 'github', label: 'GitHub' }, { id: 'work', label: 'Work' },
  { id: 'off', label: 'Off the record' }, { id: 'contact', label: 'Contact' },
];

/** The coin drawn flat, for reduced motion and for browsers without WebGL. */
function FlatCoin({ face }: { face: Face }) {
  return (
    <svg className="cn-flat" viewBox="0 0 400 300" role="img" aria-label={`A steel coin lying ${face.toUpperCase()} side up`}>
      <ellipse cx="206" cy="182" rx="150" ry="58" fill="#000" opacity={face === 'neg' ? 0.5 : 0.14} />
      <ellipse cx="200" cy="168" rx="148" ry="62" fill="#8f9297" />
      <ellipse cx="200" cy="154" rx="148" ry="62" fill="#c6c8cc" />
      <ellipse cx="200" cy="154" rx="128" ry="52" fill="none" stroke="#a7a9ae" strokeWidth="5" />
      <text x="200" y="171" textAnchor="middle" fontFamily="Archivo Variable, sans-serif" fontWeight="900" fontSize="58" fill="#6f7277" transform="matrix(1 0 -0.0 0.62 0 63)">{face.toUpperCase()}</text>
    </svg>
  );
}

function Head({ id, title, side }: { id: string; title: ReactNode; side?: ReactNode }) {
  return (
    <header className="cn-head">
      <h2 id={id + '-h'}>{title}</h2>
      {side && <p className="cn-side">{side}</p>}
    </header>
  );
}

function Wins() {
  const d = CHAPTERS.find((c) => c.id === 'debate')!;
  return (
    <section className="cn-wins" id="debate" aria-labelledby="debate-h">
      <header className="cn-wins-top">
        <h2 id="debate-h" className="cn-wins-h">{d.title}</h2>
        <p className="cn-side">The same on either side of the coin.</p>
      </header>
      <div className="cn-wins-row">
        {DEBATE.wins.map((w) => (
          <article key={w.where} className="cn-win">
            <p className="cn-win-t">{w.title}</p>
            <p className="cn-win-e">{w.event}</p>
            <p className="cn-win-w">{w.where}<span>{w.when}</span></p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Team() {
  const t = DEBATE.team;
  return (
    <section className="cn-sec cn-team" id="team" aria-labelledby="team-h">
      <Head id="team" title={t.name} side={t.role} />
      <div className="cn-team-grid">
        <div>
          <p className="cn-lede">{t.line}</p>
          <p className="cn-body">{t.record}</p>
          <a className="cn-link" href={t.href}>{host(t.href)}</a>
        </div>
        <div className="cn-next">
          <h3>Up next</h3>
          <ul>
            {DEBATE.next.map((n) => (
              <li key={n.where}><span className="cn-next-w">{n.where}</span><span className="cn-next-e">{n.event}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Today() {
  const { notes, loaded } = useNotes();
  const [latest, ...rest] = notes;
  return (
    <section className="cn-sec cn-today" id="today" aria-labelledby="today-h">
      <Head id="today" title="Today" side={latest ? <time dateTime={latest.date}>{formatDate(latest.date)}</time> : loaded ? 'Daily note' : 'Opening the notebook'} />
      {latest ? (
        <div className="cn-note">
          {latest.body.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      ) : (
        <div className="cn-note cn-note-wait"><p>{loaded ? 'No note posted yet. Check back tomorrow.' : 'The latest note is on its way.'}</p></div>
      )}
      {rest.length > 0 && (
        <div className="cn-earlier">
          <h3>Earlier</h3>
          {rest.slice(0, 12).map((n) => (
            <details key={n.date}>
              <summary><time dateTime={n.date}>{formatDate(n.date)}</time><span>{n.body[0]}</span></summary>
              {n.body.map((p, i) => <p key={i}>{p}</p>)}
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

function Work({ face }: { face: Face }) {
  return (
    <section className={`cn-sec cn-work cn-work-${face}`} id="work" aria-labelledby="work-h">
      <Head id="work" title={face === 'aff' ? 'Built' : 'The work, as evidence'} side={`${WORK.length} projects`} />
      <ol className="cn-work-list">
        {WORK.map((w) => (
          <li key={w.slug} className="cn-piece">
            <figure className="cn-shot">
              {w.href ? (
                <a href={w.href} tabIndex={-1} aria-hidden="true"><img src={src(w.img)} alt="" width={1200} height={680} loading="lazy" /></a>
              ) : (
                <img src={src(w.img)} alt="" width={1200} height={680} loading="lazy" />
              )}
            </figure>
            <div className="cn-piece-t">
              <h3>{w.name}</h3>
              <p className="cn-cite">{w.kind}<span aria-hidden="true"> / </span>{w.stack}</p>
              <p className="cn-body">{w.line}</p>
              {w.href ? <a className="cn-link" href={w.href}>{host(w.href)}</a> : <p className="cn-cite">No public link</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function GitHub() {
  const gh = useGitHub();
  return (
    <section className="cn-sec cn-gh" id="github" aria-labelledby="github-h">
      <Head id="github" title="Live from GitHub" side={gh.commitsThisMonth != null ? `${gh.commitsThisMonth} commits this month` : `@${GITHUB.user}`} />
      {gh.activity.length > 0 && (
        <ol className="cn-commits" aria-label="Recent commits">
          {gh.activity.slice(0, 6).map((a, i) => (
            <li key={a.href + i}>
              <a href={a.href}><span className="cn-commit-m">{a.message}</span></a>
              <span className="cn-cite">{a.repo}<span aria-hidden="true"> / </span>{ago(a.at)}</span>
            </li>
          ))}
        </ol>
      )}
      <ul className="cn-repos" aria-label="Repositories">
        {gh.repos.slice(0, 8).map((r) => (
          <li key={r.name}>
            <a href={r.href}>{r.name}</a>
            {r.description && <p>{r.description}</p>}
            {r.language && <span className="cn-cite">{r.language}{r.pushedAt ? `, pushed ${ago(r.pushedAt)}` : ''}</span>}
          </li>
        ))}
      </ul>
      <a className="cn-link" href={GITHUB.href}>{host(GITHUB.href)}</a>
    </section>
  );
}

function About() {
  return (
    <section className="cn-sec cn-about" id="about" aria-labelledby="about-h">
      <Head id="about" title="About" side={PERSON.home} />
      <div className="cn-about-cols">
        {PERSON.about.map((p, i) => <p key={i} className="cn-lede">{p}</p>)}
      </div>
      <p className="cn-body cn-aside">{PERSON.aside}</p>
    </section>
  );
}

function Research({ face }: { face: Face }) {
  const ep = (
    <blockquote className={`cn-epi cn-epi-${face}`}>
      <p>{paper.epigraph.text}</p>
      <footer>{paper.epigraph.source}</footer>
    </blockquote>
  );
  return (
    <section className={`cn-sec cn-res cn-res-${face}`} id="research" aria-labelledby="research-h">
      <Head id="research" title="Research" side={paper.status} />
      {face === 'neg' && ep}
      <div className="cn-paper">
        <h3>{paper.title}</h3>
        <p className="cn-lede">{paper.abstract}</p>
        <ul className="cn-kw" aria-label="Keywords">
          {paper.keywords.map((k) => <li key={k}>{k}</li>)}
        </ul>
        <ul className="cn-plinks">
          {paper.links.map((l) => <li key={l.label}><a href={l.href}>{l.label}</a></li>)}
        </ul>
        <p className="cn-cite">DOI {paper.doi}, {paper.pages} pages</p>
      </div>
      <ol className="cn-ladders" aria-label="The three ladders the paper traces">
        {paper.ladders.map((l) => (
          <li key={l.who}><span className="cn-lw">{l.who}</span><span className="cn-cite">{l.when}</span><span className="cn-body">{l.where}</span></li>
        ))}
      </ol>
      {face === 'aff' && ep}
      <div className="cn-wess">
        <h3>{wess.title}</h3>
        <p className="cn-body">{wess.abstract}</p>
        <p className="cn-cite">{wess.status}</p>
      </div>
    </section>
  );
}

function Now() {
  return (
    <section className="cn-sec cn-now" id="now" aria-labelledby="now-h">
      <Head id="now" title="Now" side={NOW.status} />
      <div className="cn-now-grid">
        <div>
          <h3>{NOW.reading.title}</h3>
          <p className="cn-body">{NOW.reading.body}</p>
          <ul className="cn-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
        <div>
          <h3>{NOW.club.title}</h3>
          <p className="cn-body">{NOW.club.body}</p>
        </div>
      </div>
    </section>
  );
}

function Record() {
  return (
    <section className="cn-sec cn-rec" id="record" aria-labelledby="record-h">
      <Head id="record" title="Record" side={`${HONORS.length} honours`} />
      <div className="cn-rec-grid">
        <ol className="cn-honors">
          {HONORS.map((h) => <li key={h.what}><span>{h.what}</span><span className="cn-cite">{h.detail}</span></li>)}
        </ol>
        <div className="cn-certs">
          {AWARDS.map((a) => (
            <a key={a.site} href={a.href} className="cn-cert">
              <img src={src(a.img)} alt={`Certificate: ${a.site}, ${a.note}`} width={720} height={1018} loading="lazy" />
              <span>{a.site}</span>
              <span className="cn-cite">{a.note}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function Off() {
  const cols: [string, readonly string[]][] = [['Likes', LIKES], ['Dislikes', DISLIKES], ['Favourites', FAVOURITES]];
  return (
    <section className="cn-sec cn-off" id="off" aria-labelledby="off-h">
      <Head id="off" title="Off the record" />
      <div className="cn-off-grid">
        {cols.map(([t, l]) => (
          <div key={t}><h3>{t}</h3><ul>{l.map((x) => <li key={x}>{x}</li>)}</ul></div>
        ))}
        <div>
          <h3>Courses</h3>
          <ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider} {c.title}</strong>. {c.note}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section className="cn-sec cn-contact" id="contact" aria-labelledby="contact-h">
      <Head id="contact" title="Contact" />
      <ul className="cn-links">
        {LINKS.map((l) => (
          <li key={l.label}>
            <span className="cn-cite">{l.label}</span>
            {l.href ? <a href={l.href}>{l.value}</a> : <span className="cn-lv">{l.value}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Coin() {
  useVersion('coin');
  const [face, setFace] = useState<Face>(firstFace);
  const [turns, setTurns] = useState(firstFace() === 'neg' ? 1 : 0);
  const [gl] = useState(() => !still && hasWebGL() && !/flat/.test(location.search));
  const [said, setSaid] = useState('');
  const [tossing, setTossing] = useState(false);

  useEffect(() => {
    try { sessionStorage.setItem(KEY, face); } catch { /* storage off */ }
    document.documentElement.style.background = PAPER[face];
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', PAPER[face]);
  }, [face]);

  const land = useCallback((f: Face) => {
    setTossing(false);
    setTurns((t) => {
      const cur = t % 2 === 0 ? 'aff' : 'neg';
      return t + (cur === f ? 2 : 1);
    });
    setFace(f);
    setSaid(f === 'aff' ? 'The coin landed AFF.' : 'The coin landed NEG.');
  }, []);

  const pick = (f: Face) => { if (f !== face) land(f); };
  const toss = useCallback(() => {
    if (!C.toss || C.busy) return;
    setTossing(true); setSaid('');
    C.toss(1);
  }, []);

  // Space tosses while the opening is on screen.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || !gl) return;
      const a = document.activeElement as HTMLElement | null;
      if (a && a !== document.body && !a.classList.contains('cn-toss')) return;
      if (window.scrollY > window.innerHeight * 0.7) return;
      e.preventDefault(); toss();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [gl, toss]);

  useEffect(() => {
    const t = setInterval(() => setTossing(C.busy), 400);
    return () => clearInterval(t);
  }, []);

  const again = () => {
    scrollToY(0);
    if (gl) setTimeout(toss, 900);
    else pick(face === 'aff' ? 'neg' : 'aff');
  };

  const order = face === 'aff' ? AFF : NEG;
  const block: Record<string, ReactNode> = {
    today: <Today />, team: <Team />, work: <Work face={face} />, github: <GitHub />, about: <About />,
    research: <Research face={face} />, now: <Now />, record: <Record />, off: <Off />, contact: <Contact />,
  };

  return (
    <div className="v-coin" data-face={face}>
      <a className="skip-x" href="#main">Skip to content</a>
      <main id="main">
        <section className="cn-open" aria-labelledby="name-h">
          <div className="cn-id">
            <h1 id="name-h">
              <span className="cn-name">{PERSON.first}<br />{PERSON.last}</span>
              <span className="cn-word" aria-hidden="true">
                <span className="cn-word-card" style={{ transform: `rotateX(${turns * 180}deg)` }}>
                  <span className="cn-word-a">AFF</span>
                  <span className="cn-word-n">NEG</span>
                </span>
              </span>
            </h1>
            <p className="cn-line">{PERSON.line}</p>
            <div className="cn-act">
              {gl ? (
                <>
                  <button type="button" className="cn-toss" onClick={toss} disabled={tossing}>{tossing ? 'In the air' : 'Toss the coin'}</button>
                  <p className="cn-hint">{coarse ? 'Tap the coin to toss it.' : 'Flick it up, tap it, or press Space.'}</p>
                </>
              ) : (
                <div className="cn-pick" role="group" aria-label="Choose a side">
                  <button type="button" aria-pressed={face === 'aff'} onClick={() => pick('aff')}>Aff</button>
                  <button type="button" aria-pressed={face === 'neg'} onClick={() => pick('neg')}>Neg</button>
                </div>
              )}
            </div>
            <nav className="cn-nav" aria-label="Sections">
              <a href="#debate">Debate</a>
              {order.map((s) => <a key={s.id} href={'#' + s.id}>{s.label}</a>)}
            </nav>
          </div>
          <div className="cn-stage">
            {gl ? (
              <Suspense fallback={<FlatCoin face={face} />}>
                <CoinScene face={face} onLand={land} />
              </Suspense>
            ) : (
              <FlatCoin face={face} />
            )}
          </div>
          <p className="sr-only-x" aria-live="polite">{said}</p>
        </section>

        <Wins />
        {order.map((s) => <div key={s.id} className="cn-slot">{block[s.id]}</div>)}

        <section className="cn-end" aria-labelledby="end-h">
          <h2 id="end-h" className="cn-end-h">Now argue the other side.</h2>
          <button type="button" className="cn-toss cn-toss-big" onClick={again}>{gl ? 'Toss again' : face === 'aff' ? 'Turn to Neg' : 'Turn to Aff'}</button>
        </section>
      </main>
      <footer className="cn-foot">
        <p>Draft 35 of the portfolio. Not the live site.</p>
        <p>{PERSON.name}, {PERSON.home}</p>
      </footer>
    </div>
  );
}
