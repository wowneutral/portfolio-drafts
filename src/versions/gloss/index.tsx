// Draft 10, The gloss. His page set like an early manuscript leaf (he translated the Wessobrunn Prayer):
// flat vellum, iron-gall ink, red rubrics and red initials that draw themselves stroke by stroke, and
// between the lines, small interlinear glosses taken from content.ts. Glosses near the pointer swell and
// redden by distance; hover, focus or tap raises one fully. Daily notes are leaves you turn back through.
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import '@fontsource-variable/eb-garamond/wght.css';
import '@fontsource-variable/eb-garamond/wght-italic.css';
import '@fontsource/old-standard-tt/400.css';
import './gloss.css';
import { AWARDS, CHAPTERS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, STATS, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { scrollToId } from '@/lib/scroll';
import { clamp, coarse, still } from '@/lib/utils';

const src = (p: string) => import.meta.env.BASE_URL + p;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; pages: number; ladders: { who: string; when: string; where: string }[]; epigraph: { text: string; source: string } };
const wess = RESEARCH[1];

/** A word with its interlinear gloss above it (real ruby markup). */
function G({ g, children, tab = true, big }: { g: ReactNode; children: ReactNode; tab?: boolean; big?: boolean }) {
  return (
    <span className={big ? 'gl gl-big' : 'gl'} tabIndex={tab ? 0 : undefined}>
      <ruby><span className="gw">{children}</span><rt><span className="gt">{g}</span></rt></ruby>
    </span>
  );
}

/** A link whose label is written as its gloss. */
function GA({ href, g, children }: { href: string; g: ReactNode; children: ReactNode }) {
  return (
    <a className="gl gl-a" href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
      <ruby><span className="gw">{children}</span><rt><span className="gt">{g}</span></rt></ruby>
    </a>
  );
}

/** Set a string with glosses over the first occurrence of each needle. */
function glossify(text: string, pairs: [string, string][]) {
  const out: ReactNode[] = [];
  let rest = text, left = pairs.slice(), k = 0;
  for (;;) {
    let at = -1, bi = -1;
    left.forEach(([n], i) => { const a = rest.indexOf(n); if (a >= 0 && (at < 0 || a < at)) { at = a; bi = i; } });
    if (bi < 0) break;
    const [n, g] = left[bi];
    out.push(rest.slice(0, at), <G key={k++} g={g}>{n}</G>);
    rest = rest.slice(at + n.length);
    left = left.filter((_, i) => i !== bi);
  }
  out.push(rest);
  return out;
}

/** A red initial that draws itself: the frame rule, then the letter's outline, then its ink. */
function Initial({ ch, size = 'drop', redraw }: { ch: string; size?: 'drop' | 'big' | 'hero' | 'xl'; redraw?: unknown }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (still) { el.classList.add('on'); return; }
    el.classList.remove('on');
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { requestAnimationFrame(() => el.classList.add('on')); io.disconnect(); }
    }, { rootMargin: '0px 0px -12% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [redraw]);
  return (
    <svg ref={ref} className={`ini ini-${size}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <rect className="ini-f" x="1.5" y="1.5" width="97" height="97" pathLength={1} />
      <rect className="ini-f ini-f2" x="6" y="6" width="88" height="88" pathLength={1} />
      <text className="ini-t" x="50" y="83" textAnchor="middle">{ch}</text>
    </svg>
  );
}

/** A paragraph opened by a drawn initial. */
function Drop({ text, pairs = [], className = '', redraw }: { text: string; pairs?: [string, string][]; className?: string; redraw?: unknown }) {
  return (
    <p className={'dropp ' + className}>
      <Initial ch={text[0]} redraw={redraw} />
      <span className="sr-only-x">{text[0]}</span>{glossify(text.slice(1), pairs)}
    </p>
  );
}

function Today() {
  const { notes, loaded } = useNotes();
  const [i, setI] = useState(0);
  const [dir, setDir] = useState<'back' | 'fwd' | ''>('');
  const x0 = useRef<number | null>(null);
  const n = notes.length;
  const note = notes[Math.min(i, Math.max(0, n - 1))];
  const go = (to: number) => {
    if (to < 0 || to >= n || to === i) return;
    setDir(to > i ? 'back' : 'fwd');
    setI(to);
  };
  const body = note ? note.body : [NOW.status];
  const dateLine = note ? formatDate(note.date) : loaded ? 'Lately' : 'Today';
  return (
    <section className="leaf today" id="today" aria-labelledby="today-h">
      <h2 className="rub" id="today-h">Today</h2>
      <div className="tx">
        <p className="ph-date">{dateLine}</p>
        <div
          className={'sheet' + (dir ? ' turn-' + dir : '')}
          key={note?.date ?? 'none'}
          onPointerDown={(e) => { x0.current = e.clientX; }}
          onPointerUp={(e) => {
            if (x0.current === null) return;
            const dx = e.clientX - x0.current; x0.current = null;
            if (Math.abs(dx) > 60) go(dx < 0 ? i + 1 : i - 1);
          }}
          onPointerCancel={() => { x0.current = null; }}
        >
          {!loaded ? (
            <div className="sheet-wait" aria-label="Loading today's note" role="status">
              <span /><span /><span />
            </div>
          ) : (
            body.map((p, k) => k === 0
              ? <Drop key={k} text={p} className="note-p" redraw={note?.date} />
              : <p key={k} className="note-p">{p}</p>)
          )}
        </div>
        {n > 1 && (
          <div className="turn">
            <button type="button" className="turn-b" onClick={() => go(i + 1)} disabled={i >= n - 1}>
              <svg viewBox="0 0 28 12" aria-hidden="true"><path d="M27 6H2M7 1 2 6l5 5" /></svg>
              Earlier leaf
            </button>
            <span className="turn-n" aria-live="polite">Leaf {i + 1} of {n}</span>
            <button type="button" className="turn-b" onClick={() => go(i - 1)} disabled={i <= 0}>
              Later leaf
              <svg viewBox="0 0 28 12" aria-hidden="true"><path d="M1 6h25M21 1l5 5-5 5" /></svg>
            </button>
          </div>
        )}
      </div>
      <aside className="mg">
        <p className="mg-date">{dateLine}</p>
        {n > 1 && (
          <ol className="leaves" aria-label="Every leaf">
            {notes.map((nt, k) => (
              <li key={nt.date}>
                <button type="button" className={k === i ? 'lv on' : 'lv'} aria-current={k === i ? 'true' : undefined} onClick={() => go(k)}>
                  {formatDate(nt.date, { day: 'numeric', month: 'long' })}
                </button>
              </li>
            ))}
          </ol>
        )}
      </aside>
    </section>
  );
}

function GitHubMargin() {
  const gh = useGitHub();
  const commits = gh.activity.slice(0, 6);
  return (
    <aside className="mg gh" aria-labelledby="gh-h">
      <h3 className="mg-h" id="gh-h">Live from GitHub</h3>
      {commits.length > 0 && (
        <ol className="gh-list">
          {commits.map((c, k) => (
            <li key={k}><a className="mgl" href={c.href} target="_blank" rel="noreferrer">
              <span className="mgl-g">{c.repo}, {ago(c.at)}</span>
              <span className="mgl-w">{c.message}</span>
            </a></li>
          ))}
        </ol>
      )}
      {commits.length > 0 && <h3 className="mg-h mg-h2">Repositories</h3>}
      <ul className="gh-list">
        {gh.repos.slice(0, commits.length ? 5 : 6).map((r) => (
          <li key={r.name}><a className="mgl" href={r.href} target="_blank" rel="noreferrer">
            <span className="mgl-g">{r.description ?? r.language ?? 'A repository'}</span>
            <span className="mgl-w">{r.name}{r.language ? <span className="mgl-l">, {r.language}</span> : null}</span>
          </a></li>
        ))}
      </ul>
      <a className="mg-link" href={GITHUB.href} target="_blank" rel="noreferrer">github.com/{GITHUB.user}</a>
    </aside>
  );
}

function Work({ w, wide }: { w: (typeof WORK)[number]; wide?: boolean }) {
  return (
    <article className={wide ? 'opus wide' : 'opus'}>
      <figure className="mini">
        <img src={src(w.img)} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={660} />
      </figure>
      <div className="opus-tx">
        <h3 className="opus-h"><G g={w.kind}>{w.name}</G></h3>
        <p className="opus-l">{w.line}</p>
        <p className="opus-s">{w.stack}</p>
        {w.href
          ? <a className="lk" href={w.href} target="_blank" rel="noreferrer">{host(w.href)}</a>
          : <p className="opus-s">Private, no public link</p>}
      </div>
    </article>
  );
}

export default function GlossPage() {
  useVersion('gloss');
  const root = useRef<HTMLDivElement>(null);
  const { notes } = useNotes();
  const [bare, setBare] = useState(false);

  // Glosses near the pointer swell and redden by distance.
  useEffect(() => {
    if (coarse || still) return;
    let raf = 0, px = -1e4, py = -1e4;
    let lit = new Set<HTMLElement>();
    const tick = () => {
      raf = 0;
      const next = new Set<HTMLElement>();
      root.current?.querySelectorAll<HTMLElement>('.gl').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -40 || r.top > innerHeight + 40) return;
        const d = Math.hypot(px - clamp(px, r.left, r.right), py - clamp(py, r.top, r.bottom));
        const k = clamp(1 - d / 150);
        if (k > 0.01) { el.style.setProperty('--n', (k * k * (3 - 2 * k)).toFixed(3)); next.add(el); }
      });
      lit.forEach((el) => { if (!next.has(el)) el.style.setProperty('--n', '0'); });
      lit = next;
    };
    const ask = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const move = (e: PointerEvent) => { px = e.clientX; py = e.clientY; ask(); };
    const out = () => { px = py = -1e4; ask(); };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('scroll', ask, { passive: true });
    document.addEventListener('pointerleave', out);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('scroll', ask);
      document.removeEventListener('pointerleave', out);
      cancelAnimationFrame(raf);
    };
  }, []);

  const latest = notes[0];
  const team = DEBATE.team;
  const [w1, w2, ...rest] = WORK;

  return (
    <div className={bare ? 'v-gloss bare' : 'v-gloss'} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <main id="main">
        {/* The opening leaf */}
        <header className="leaf open">
          <p className="hint">{coarse ? 'Tap a word to raise its gloss.' : 'Point at a word to raise its gloss.'}</p>
          <div className="open-tx">
            <h1 className="name">
              <span className="sr-only-x">{PERSON.name}</span>
              <span className="name-v" aria-hidden="true">
                <Initial ch="A" size="hero" />
                <span className="name-lines">
                  <span className="name-l"><G g={`Age ${PERSON.age}`} tab={false} big>RMAAN</G></span>
                  <span className="name-l"><G g={PERSON.home} tab={false} big>SETH</G></span>
                </span>
              </span>
            </h1>
            <p className="open-line">
              {glossify(PERSON.line, [
                ['Founder of MITEZ', WORK[0].kind],
                ['head coach of Skeptical', WORK[1].kind],
                ['debater, researcher, developer', PERSON.short.join(' ')],
              ])}
            </p>
          </div>
          <aside className="open-mg">
            <a className="open-today" href="#today" onClick={(e) => { e.preventDefault(); scrollToId('today'); }}>
              <span className="mgl-g">Today's leaf</span>
              <span className="mgl-w">{latest ? formatDate(latest.date) : 'The daily note'}</span>
            </a>
          </aside>
        </header>

        {/* Debate: the largest initial on the page */}
        <section className="leaf debate" id="debate" aria-labelledby="debate-h">
          <h2 className="rub">Debate</h2>
          <div className="champ">
            <Initial ch="C" size="xl" />
            <p className="champ-tx" id="debate-h">
              <span className="sr-only-x">C</span>
              <span className="champ-w">hampion,</span>
              {DEBATE.wins.map((w, k) => (
                <span className="champ-ev" key={w.where}>
                  {k > 0 && <span className="champ-and">and </span>}
                  <G g={`${w.where}, ${w.when}`}>{w.event}</G>
                </span>
              ))}
            </p>
          </div>
          <div className="tx">
            <div className="team">
              <h3 className="team-h"><span className="gl gl-st" tabIndex={0}><span className="gst">{team.role}</span><span className="gw">{team.name}</span></span></h3>
              <p className="team-l">{team.line}</p>
              <p className="team-r">{team.record}</p>
              <p className="lks">
                <a className="lk" href={team.href} target="_blank" rel="noreferrer">{host(team.href)}</a>
                <a className="lk" href={team.github} target="_blank" rel="noreferrer">{host(team.github)}</a>
              </p>
            </div>
            <h3 className="sub-h">Up next</h3>
            <ul className="next">
              {DEBATE.next.map((x) => <li key={x.where}><G g={x.where}>{x.event}</G></li>)}
            </ul>
          </div>
          <aside className="mg">
            <p className="mg-note">{CHAPTERS[1].body}</p>
            <p className="mg-note">{CHAPTERS[2].body}</p>
          </aside>
        </section>

        <Today />

        <section className="leaf about" id="about" aria-labelledby="about-h">
          <h2 className="rub" id="about-h">About</h2>
          <div className="tx">
            <Drop text={PERSON.about[0]} pairs={[['Lincoln Douglas', 'LD'], ['research of my own', paper.short]]} />
            <p>{glossify(PERSON.about[1], [['an assistant that runs my desktop', 'JARVIS'], ['MITEZ', WORK[0].kind]])}</p>
          </div>
          <aside className="mg"><p className="mg-note">{PERSON.aside}</p></aside>
        </section>

        <section className="leaf research" id="research" aria-labelledby="research-h">
          <h2 className="rub">Research</h2>
          <div className="tx">
            <h3 className="paper-h" id="research-h">
              <span className="gl gl-st" tabIndex={0}><span className="gst">{paper.short}</span><span className="gw">{paper.title}</span></span>
            </h3>
            <Drop text={paper.abstract} className="abs" pairs={[
              ['skeptic', paper.keywords[1]],
              ['language fails', paper.keywords[0]],
              ['Sextus Empiricus', paper.ladders[0].when],
              ['Fritz Mauthner', paper.keywords[2]],
              ['Tractatus', paper.ladders[2].when],
            ]} />
            <p className="lks paper-lks">
              {paper.links.map((l) => <GA key={l.label} href={l.href} g={l.label}>{l.label === 'DOI' ? paper.doi : host(l.href).split('/')[0]}</GA>)}
            </p>
            <blockquote className="epi">
              <p>{paper.epigraph.text}</p>
              <cite>{paper.epigraph.source}</cite>
            </blockquote>
            <div className="wess">
              <h3 className="sub-h">Why this page is glossed</h3>
              <p className="wess-t"><G g={wess.status}>{wess.title}</G></p>
              <p>{wess.abstract}</p>
              <p className="wess-why">Old manuscripts were read with small words written between the lines. This page borrows the habit.</p>
              <button type="button" className="bare-b" aria-pressed={bare} onClick={() => setBare((b) => !b)}>
                {bare ? 'Write the glosses back in' : 'Read the page without its glosses'}
              </button>
            </div>
          </div>
          <aside className="mg">
            <p className="mg-note">{paper.status}, {paper.pages} pages</p>
            <h3 className="mg-h">Keywords</h3>
            <ul className="kw">{paper.keywords.map((k) => <li key={k}>{k}</li>)}</ul>
            <h3 className="mg-h">Three ladders</h3>
            <ul className="kw lad">{paper.ladders.map((l) => <li key={l.who}><span className="mgl-g">{l.when}</span>{l.who}</li>)}</ul>
          </aside>
        </section>

        <section className="leaf work" id="work" aria-labelledby="work-h">
          <h2 className="rub" id="work-h">Work</h2>
          <div className="tx">
            <Work w={w1} wide />
            <Work w={w2} wide />
            <div className="pairs">{rest.map((w) => <Work key={w.slug} w={w} />)}</div>
          </div>
          <GitHubMargin />
        </section>

        <section className="leaf now" id="now" aria-labelledby="now-h">
          <h2 className="rub" id="now-h">Now</h2>
          <div className="tx">
            <Drop text={NOW.status} className="now-st" pairs={[['Isidore Newman', DEBATE.next[0].event], ['DSDS1', DEBATE.next[1].event]]} />
            <div className="now-two">
              <div>
                <h3 className="sub-h">{NOW.reading.title}</h3>
                <p>{NOW.reading.body}</p>
              </div>
              <div>
                <h3 className="sub-h">{NOW.club.title}</h3>
                <p>{NOW.club.body}</p>
              </div>
            </div>
          </div>
          <aside className="mg">
            <h3 className="mg-h">On the shelf</h3>
            <ul className="kw">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
          </aside>
        </section>

        <section className="leaf record" id="record" aria-labelledby="record-h">
          <h2 className="rub" id="record-h">Record</h2>
          <div className="tx">
            <p className="litany">
              {HONORS.map((h) => (
                <Fragment key={h.what}>
                  <span className="pil" aria-hidden="true">¶</span>
                  <G g={h.detail}>{h.what}</G>{' '}
                </Fragment>
              ))}
            </p>
            <div className="certs">
              {AWARDS.map((a) => (
                <a className="cert" key={a.site} href={a.href} target="_blank" rel="noreferrer">
                  <span className="mini mini-c"><img src={src(a.img)} alt={`Certificate for ${a.site}`} loading="lazy" width={720} height={1018} /></span>
                  <span className="cert-g">{a.note}</span>
                  <span className="cert-w">{a.site}</span>
                </a>
              ))}
            </div>
          </div>
          <aside className="mg">
            {STATS.map((s) => (
              <p className="stat" key={s.label}><span className="stat-n">{s.to}{s.suffix}</span> {s.label}</p>
            ))}
          </aside>
        </section>

        <section className="leaf off" id="off" aria-labelledby="off-h">
          <h2 className="rub" id="off-h">Off the record</h2>
          <div className="tx off-grid">
            <div><h3 className="sub-h">Likes</h3><ul className="plain">{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="sub-h">Dislikes</h3><ul className="plain">{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="sub-h">Favourites</h3><ul className="plain">{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="sub-h">Courses</h3><ul className="plain">{COURSES.map((c) => <li key={c.title}><G g={c.provider}>{c.title}</G>, {c.note}</li>)}</ul></div>
          </div>
        </section>

        <section className="leaf contact" id="contact" aria-labelledby="contact-h">
          <h2 className="rub" id="contact-h">Write to him</h2>
          <ul className="tx links">
            {LINKS.map((l) => (
              <li key={l.label}>
                {l.href
                  ? <GA href={l.href} g={l.label}>{l.value}</GA>
                  : <G g={l.label}>{l.value}</G>}
              </li>
            ))}
          </ul>
        </section>

        <footer className="leaf explicit">
          <div className="tx">
            <p className="ex">
              <Initial ch="E" size="big" />
              <span className="sr-only-x">E</span><span className="ex-w">xplicit.</span>
            </p>
            <p className="colo">Draft 10 of the portfolio. Not the live site.</p>
            <p className="colo colo-s">Set in EB Garamond, with glosses in Old Standard TT.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
