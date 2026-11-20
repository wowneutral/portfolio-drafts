// Draft 8: the balance. A matte white ceramic balance on a grey sweep. Drop a
// weight in either pan and an equal one answers it, so it always comes back
// level. Each section weighs two things. Only Debate stays down.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/index.css';
import '@fontsource-variable/instrument-sans/index.css';
import './balance.css';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { coarse, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { alternate, drop, initFree, resetSim, sim, tap, useB, weigh, type Sec } from './sim';

const Scene = lazy(() => import('./Scene'));
const BASE = import.meta.env.BASE_URL;
const PAPER = RESEARCH[0];
const PRAYER = RESEARCH[1];
const ENGRAVE: Record<string, string> = { drafts: 'Drafts', lastseen: 'Last Seen', lastsearch: 'Last Search' };

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const ext = (href: string) => (href.startsWith('http') ? { rel: 'noopener' } : {});

/** The section's two things, either side of a little beam (tipped only in Debate). */
function Weigh({ l, r, tipped }: { l: string; r: string; tipped?: boolean }) {
  return (
    <p className={'weigh' + (tipped ? ' tipped' : '')}>
      <span className="wl">{l}</span>
      <svg viewBox="0 0 120 28" aria-hidden="true" focusable="false">
        <g className="bm"><line x1="8" y1="10" x2="112" y2="10" /><circle cx="8" cy="10" r="3.2" /><circle cx="112" cy="10" r="3.2" /></g>
        <path d="M60 10 L54 26 H66 Z" />
      </svg>
      <span className="wr">{r}</span>
    </p>
  );
}

/** The still balance, for no WebGL and reduced motion. */
function Still() {
  return (
    <svg className="still" viewBox="0 0 600 520" role="img" aria-label="A white beam balance, level, on a grey floor">
      <ellipse cx="300" cy="470" rx="90" ry="10" fill="#b9c0bf" />
      <ellipse cx="128" cy="470" rx="80" ry="8" fill="#c7cdcc" />
      <ellipse cx="472" cy="470" rx="80" ry="8" fill="#c7cdcc" />
      <rect x="296" y="150" width="8" height="318" fill="#141718" />
      <rect x="244" y="460" width="112" height="10" rx="3" fill="#141718" />
      <rect x="110" y="138" width="380" height="22" rx="10" fill="#f3f3f0" stroke="#c9cfce" />
      <circle cx="300" cy="149" r="7" fill="#141718" />
      {[128, 472].map((x) => (
        <g key={x}>
          <rect x={x - 3} y="149" width="5" height="190" fill="#141718" />
          <path d={`M${x - 82} 336 Q${x} 372 ${x + 82} 336 Z`} fill="#f3f3f0" stroke="#c9cfce" />
        </g>
      ))}
      <ellipse cx="128" cy="322" rx="40" ry="20" fill="#f1f1ee" stroke="#c9cfce" />
      <ellipse cx="472" cy="322" rx="40" ry="20" fill="#1d2022" />
    </svg>
  );
}

export default function Balance() {
  useVersion('balance');
  const [webgl] = useState(hasWebGL);
  const flat = still || !webgl;
  const sec = useB((s) => s.sec);
  const work = useB((s) => s.work);
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const root = useRef<HTMLDivElement>(null);
  const touched = useRef(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  // which section is being read
  useEffect(() => {
    const els = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-sec]') ?? []);
    const io = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) useB.setState({ sec: e.target.getAttribute('data-sec') as Sec });
    }, { rootMargin: '-45% 0px -50% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => { resetSim(); initFree(); return () => { resetSim(); useB.setState({ sec: 'open', work: 0 }); }; }, []);

  // weigh the section's two things whenever the section or its data changes
  const ghKey = gh.activity.length ? 'a' + gh.activity.length : 'r' + gh.repos.length;
  useEffect(() => {
    if (flat) return;
    const one = (word: string, mass = 1) => ({ word, mass });
    const peb = (tone: 'black' | 'white') => ({ word: '', tone, r: 0.17, mass: 0.25 });
    const earlier = notes.slice(1, 13);
    switch (sec) {
      case 'open': weigh(sec, { L: [], R: [] }); break;
      case 'contact': {
        // the end: every loose weight goes in, two and two, and it is still level
        weigh(sec, { L: [], R: [] });
        (['Aff', 'Neg', 'Yes', 'No'] as const).forEach((w, i) => {
          const s = sim.stones.find((x) => x.kind === 'free' && x.word === w);
          if (s) { drop(s, i % 2 ? 'R' : 'L'); s.delay = 0.3 + i * 0.4; }
        });
        break;
      }
      case 'about': weigh(sec, { L: [one('Arguing')], R: [one('Building')] }); break;
      case 'debate': weigh(sec, { L: [{ word: 'Novice', tone: 'green', mass: 1.5 }, { word: 'Open', tone: 'green', mass: 1.5 }], R: [], wait: ['Newman', 'DSDS1'] }); break;
      case 'research': weigh(sec, { L: [one('Mauthner')], R: [one('Wessobrunn')] }); break;
      case 'work': { const w = WORK[work]; weigh(sec, { L: [one(ENGRAVE[w.slug] ?? w.name)], R: [{ word: 'But', tone: 'black', mass: 1 }] }); break; }
      case 'github': { const n = gh.activity.length ? gh.activity.length : gh.repos.length; weigh(sec, alternate(Array.from({ length: Math.min(n, 12) }, () => peb('black')))); break; }
      case 'today': weigh(sec, loaded && notes.length ? { L: [{ word: formatDate(notes[0].date, { day: 'numeric', month: 'short' }), mass: Math.max(0.25, earlier.length * 0.25) }], R: earlier.map(() => peb('black')) } : { L: [], R: [] }); break;
      case 'now': weigh(sec, { L: [one('Reading')], R: [one('Club')] }); break;
      case 'record': weigh(sec, { L: [one('Honors')], R: [one('Awards')] }); break;
      case 'off': weigh(sec, { L: [one('Likes')], R: [one('Dislikes')] }); break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sec, work, ghKey, loaded, notes.length, flat]);

  // the opening shows its own idea once: one weight goes in, one answers it
  useEffect(() => {
    if (flat) return;
    const id = setTimeout(() => {
      if (touched.current || useB.getState().sec !== 'open') return;
      const a = sim.stones.find((s) => s.kind === 'free' && s.place === 'floor');
      if (a) tap(a.id);
    }, 2600);
    return () => clearTimeout(id);
  }, [flat]);

  const free = ['Aff', 'Neg', 'Yes', 'No'];
  const send = (w: string) => {
    touched.current = true;
    const s = sim.stones.find((x) => x.kind === 'free' && x.word === w);
    if (s) tap(s.id);
  };

  const w = WORK[work];
  const latest = notes[0];

  return (
    <div className={'v-balance' + (flat ? ' is-flat' : '')} ref={root} onPointerDown={() => { touched.current = true; }}>
      <a className="skip-x" href="#main">Skip to the page</a>
      <div className="stage" aria-hidden={flat ? undefined : 'true'}>
        {flat ? <Still /> : <Suspense fallback={null}><Scene /></Suspense>}
      </div>

      <main id="main" className="copy">
        <section className="sec open" data-sec="open" aria-labelledby="top">
          <h1 id="top">Armaan<br />Seth</h1>
          <p className="line">{PERSON.line}</p>
          {!flat && (
            <>
              <p className="hint">{coarse ? 'Tap a weight.' : 'Drop a weight in either pan.'} It comes back level.</p>
              <div className="keys">
                {free.map((f) => <button key={f} type="button" className="key" aria-label={`Weigh ${f}`} onClick={() => send(f)}><span className="kt">Weigh {f}</span></button>)}
              </div>
            </>
          )}
        </section>

        <section className="sec about" data-sec="about" aria-labelledby="h-about">
          <h2 id="h-about">Two halves</h2>
          <Weigh l="Arguing" r="Building" />
          <div className="pair">
            {PERSON.about.map((p, i) => <p key={i} className="body">{p}</p>)}
          </div>
          <p className="aside">{PERSON.aside}</p>
        </section>

        <section className="sec debate" data-sec="debate" aria-labelledby="h-debate">
          <h2 id="h-debate">Decided.</h2>
          <Weigh l="Two titles" r="Nothing against" tipped />
          <ol className="wins">
            {DEBATE.wins.map((x) => (
              <li key={x.where}>
                <p className="champ">{x.title}, {x.when}</p>
                <p className="where">{x.where}</p>
                <p className="ev">{x.event}</p>
              </li>
            ))}
          </ol>
          <div className="team">
            <h3>{DEBATE.team.name}</h3>
            <p className="role">{DEBATE.team.role}</p>
            <p className="body">{DEBATE.team.line}</p>
            <p className="body rec">{DEBATE.team.record}</p>
            <a className="go" href={DEBATE.team.href} {...ext(DEBATE.team.href)}>skeptical.pages.dev</a>
          </div>
          <div className="next">
            <h3>Up next</h3>
            <p className="note">Still on the floor, waiting to be weighed.</p>
            <ul>
              {DEBATE.next.map((n) => <li key={n.where}><span className="nw">{n.where}</span><span className="ne">{n.event}</span></li>)}
            </ul>
          </div>
        </section>

        <section className="sec research" data-sec="research" aria-labelledby="h-research">
          <h2 id="h-research">Research</h2>
          <Weigh l="The paper" r="The translation" />
          <article className="paper">
            <p className="status">{PAPER.status}, {PAPER.pages} pages</p>
            <h3>{PAPER.title}</h3>
            <p className="body">{PAPER.abstract}</p>
            <ul className="kw" aria-label="Keywords">{(PAPER.keywords ?? []).map((k) => <li key={k}>{k}</li>)}</ul>
            <ul className="links">{PAPER.links.map((l) => <li key={l.label}><a href={l.href} {...ext(l.href)}>{l.label}</a></li>)}</ul>
          </article>
          <article className="prayer">
            <h3>{PRAYER.short}</h3>
            <p className="status">{PRAYER.status}</p>
            <p className="body">{PRAYER.abstract}</p>
          </article>
        </section>

        <section className="sec work" data-sec="work" aria-labelledby="h-work">
          <h2 id="h-work">Work</h2>
          <Weigh l="What I made" r="But" />
          <ul className="names">
            {WORK.map((x, i) => (
              <li key={x.slug}>
                <button type="button" aria-pressed={i === work} onClick={() => useB.setState({ work: i })}>
                  <span className="wn">{x.name}</span><span className="wk">{x.kind}</span>
                </button>
              </li>
            ))}
          </ul>
          <figure className="shot" key={w.slug}>
            <img src={BASE + w.img} alt={`${w.name}, a screenshot`} width={1200} height={750} loading="lazy" />
            <figcaption>
              <p className="wkind">{w.kind}</p>
              <p className="wname">{w.name}</p>
              <p className="body">{w.line}</p>
              <p className="stack">{w.stack}</p>
              {w.href ? <a className="go" href={w.href} {...ext(w.href)}>Visit {w.name}</a> : <p className="stack">No public link.</p>}
            </figcaption>
          </figure>
        </section>

        <section className="sec github" data-sec="github" aria-labelledby="h-gh">
          <h2 id="h-gh">Live from GitHub</h2>
          <Weigh l={gh.activity.length ? 'Each commit' : 'Each repo'} r="Answered" />
          {gh.activity.length > 0 && (
            <ol className="commits">
              {gh.activity.slice(0, 8).map((a, i) => (
                <li key={a.href + i}>
                  <a href={a.href} {...ext(a.href)}>{a.message || 'Commit'}</a>
                  <span>{a.repo}, {ago(a.at)}</span>
                </li>
              ))}
            </ol>
          )}
          <ul className="repos">
            {gh.repos.slice(0, 6).map((r) => (
              <li key={r.name}>
                <a href={r.href} {...ext(r.href)}>{r.name}</a>
                {r.description && <p>{r.description}</p>}
                {r.language && <span>{r.language}{r.pushedAt ? `, pushed ${ago(r.pushedAt)}` : ''}</span>}
              </li>
            ))}
          </ul>
          <a className="go" href={GITHUB.href} {...ext(GITHUB.href)}>github.com/{GITHUB.user}</a>
        </section>

        <section className="sec today" data-sec="today" aria-labelledby="h-today">
          <h2 id="h-today">Today</h2>
          <Weigh l="The latest note" r="Every note before it" />
          {latest ? (
            <article className="latest">
              <p className="date"><time dateTime={latest.date}>{formatDate(latest.date)}</time></p>
              {latest.body.map((p, i) => <p key={i} className="big">{p}</p>)}
            </article>
          ) : (
            <p className="big quiet">{loaded ? 'No note yet. Check back tomorrow.' : 'The note is on its way.'}</p>
          )}
          {notes.length > 1 && (
            <ol className="earlier">
              {notes.slice(1).map((n) => (
                <li key={n.date}>
                  <button type="button" aria-expanded={!!open[n.date]} onClick={() => setOpen((o) => ({ ...o, [n.date]: !o[n.date] }))}>
                    <time dateTime={n.date}>{formatDate(n.date)}</time><span aria-hidden="true">{open[n.date] ? 'Close' : 'Read'}</span>
                  </button>
                  {open[n.date] && <div className="eb">{n.body.map((p, i) => <p key={i} className="body">{p}</p>)}</div>}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="sec now" data-sec="now" aria-labelledby="h-now">
          <h2 id="h-now">Now</h2>
          <Weigh l="Reading" r="The club" />
          <div className="pair">
            <div>
              <h3>{NOW.reading.title}</h3>
              <p className="body">{NOW.reading.body}</p>
              <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <h3>{NOW.club.title}</h3>
              <p className="body">{NOW.club.body}</p>
            </div>
          </div>
          <p className="status-line">{NOW.status}</p>
        </section>

        <section className="sec record" data-sec="record" aria-labelledby="h-record">
          <h2 id="h-record">Record</h2>
          <Weigh l="Honors" r="Awards" />
          <ol className="honors">
            {HONORS.map((h) => <li key={h.what}><span className="hw">{h.what}</span><span className="hd">{h.detail}</span></li>)}
          </ol>
          <ul className="awards">
            {AWARDS.map((a) => (
              <li key={a.site}>
                <a href={a.href} {...ext(a.href)}>
                  <img src={BASE + a.img} alt={`Certificate for ${a.site}`} width={600} height={850} loading="lazy" />
                  <span className="as">{a.site}</span>
                  <span className="an">{a.note}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="sec off" data-sec="off" aria-labelledby="h-off">
          <h2 id="h-off">Off the record</h2>
          <Weigh l="Likes" r="Dislikes" />
          <div className="quad">
            <div><h3>Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider} {c.title}</b> {c.note}</li>)}</ul></div>
          </div>
        </section>

        <section className="sec contact" data-sec="contact" aria-labelledby="h-contact">
          <h2 id="h-contact">Level again.</h2>
          <Weigh l="Your move" r="My reply" />
          <ul className="contacts">
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="cl">{l.label}</span>
                {l.href ? <a href={l.href} {...ext(l.href)}>{l.value}</a> : <span className="cv">{l.value}</span>}
              </li>
            ))}
          </ul>
          <footer className="foot">
            <p>Draft 8 of the portfolio. Not the live site.</p>
            <p>{PERSON.name}, {PERSON.home}.</p>
          </footer>
        </section>
      </main>
    </div>
  );
}
