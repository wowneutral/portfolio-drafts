// Draft 76, The admit. The parenthesis move is remixed from Codrops' InlineLayoutSwitch (MIT,
// github.com/codrops/InlineLayoutSwitch): its GSAP Flip of inline pieces out of a large sentence and
// back, with power4.inOut timing. Here the pieces are the words of Wittgenstein's parenthesis, and they
// land in the margin instead of a carousel. The base's .oh line masks are not used.
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import '@fontsource-variable/eb-garamond/wght.css';
import '@fontsource-variable/eb-garamond/wght-italic.css';
import './admit.css';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AWARDS, CHAPTERS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, STATS, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { still } from '@/lib/utils';

gsap.registerPlugin(Flip, ScrollTrigger);

const src = (p: string) => import.meta.env.BASE_URL + p;
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; ladders: { who: string; when: string; where: string }[]; epigraph: { text: string; source: string }; pages: number; doi: string };
const wess = RESEARCH[1];
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/\/$/, '');

// The epigraph, cut at its parenthesis.
const EPI = paper.epigraph.text;
const P0 = EPI.indexOf('(');
const P1 = EPI.indexOf(')') + 1;
const HEAD = EPI.slice(0, P0).trimEnd();
const PAREN = EPI.slice(P0, P1);
const TAIL = EPI.slice(P1);
const WORDS = PAREN.split(' ');
// The words of the parenthesis that make the title: "not ... in Mauthner's sense".
const KEEP = new Set(WORDS.map((w, k) => (/^(not|in|Mauthner’s|sense\)?)$/.test(w) ? k : -1)).filter((k) => k >= 0));
const DEBT = paper.abstract.slice(paper.abstract.indexOf('Wittgenstein owes'));

const firstSentence = (s: string) => (s.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? s).trim();
const rest = (s: string) => s.slice(firstSentence(s).length).trim();

const KEY = 'admit:lifted';

function Words({ id }: { id: string }) {
  return (
    <>
      {WORDS.map((w, k) => {
        const m = w.match(/^(\(?)(.*?)(\)?)$/)!;
        return (
          <Fragment key={k}>
            {k > 0 && ' '}
            <span className={'ad-w' + (KEEP.has(k) ? ' is-keep' : '')} data-flip-id={`${id}-w${k}`}>
              {m[1] && <span className="ad-pm">{m[1]}</span>}{m[2]}{m[3] && <span className="ad-pm">{m[3]}</span>}
            </span>
          </Fragment>
        );
      })}
    </>
  );
}

/** The sentence with its parenthesis that lifts into the margin and back. */
function Epigraph({ id, persist, top }: { id: string; persist?: boolean; top?: boolean }) {
  const [lifted, setLifted] = useState(() => {
    if (!persist) return false;
    try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; }
  });
  const state = useRef<Flip.FlipState | null>(null);
  const moved = useRef(false);
  const busy = useRef(false);
  const drag = useRef<{ x: number; y: number; done: boolean } | null>(null);

  const toggle = () => {
    if (busy.current) return;
    if (!still) state.current = Flip.getState(`[data-flip-id^="${id}-"]`, { props: 'color' });
    moved.current = true;
    setLifted((v) => !v);
  };

  useLayoutEffect(() => {
    if (persist) { try { sessionStorage.setItem(KEY, lifted ? '1' : '0'); } catch { /* storage off */ } }
    if (moved.current) {
      moved.current = false;
      document.querySelector<HTMLElement>(`[data-paren="${id}"]`)?.focus({ preventScroll: true });
    }
    const st = state.current;
    state.current = null;
    if (!st) return;
    busy.current = true;
    Flip.from(st, {
      targets: `[data-flip-id^="${id}-"]`,
      duration: 1.2,
      ease: 'power4.inOut',
      scale: true,
      props: 'color',
      stagger: lifted ? -0.05 : 0.05,
      onComplete: () => { busy.current = false; },
    });
  }, [lifted, id, persist]);

  const keys = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
  };
  // A mouse can also drag the parenthesis out: past 36px it goes on its own.
  const down = (e: React.PointerEvent) => { if (e.pointerType === 'mouse') drag.current = { x: e.clientX, y: e.clientY, done: false }; };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.done || e.buttons !== 1) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 36) { d.done = true; toggle(); }
  };
  const click = () => {
    if (drag.current?.done) { drag.current = null; return; }
    drag.current = null;
    toggle();
  };

  // Where the parenthesis sits in the whole sentence, so the margin can catch it at the same height
  // and the sentence keeps its height: the words then travel sideways, never across the line above.
  const rowRef = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<{ top: number; h: number } | null>(null);
  useLayoutEffect(() => {
    if (lifted) return;
    const row = rowRef.current;
    if (!row) return;
    const measure = () => {
      const p = row.querySelector<HTMLElement>('.ad-epi p');
      const w0 = row.querySelector<HTMLElement>(`[data-flip-id="${id}-w0"]`);
      if (!p || !w0) return;
      setGeo({ top: Math.round(w0.getBoundingClientRect().top - row.getBoundingClientRect().top), h: p.offsetHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [lifted, id]);

  const hint = id + '-hint';
  return (
    <div ref={rowRef} className={'ad-row ad-epirow' + (lifted ? ' is-lifted' : '') + (lifted && geo ? ' has-geo' : '')}
      style={lifted && geo ? ({ '--lift-top': geo.top + 'px' } as React.CSSProperties) : undefined}>
      <figure className="ad-main ad-epifig">
        <blockquote className="ad-epi" cite="https://doi.org/10.5281/zenodo.23652238">
          <p style={lifted && geo ? { minHeight: geo.h } : undefined}>
            {HEAD}
            {!lifted && (
              <>
                {' '}
                <span
                  role="button" tabIndex={0} aria-pressed="false" aria-describedby={hint}
                  className="ad-paren" data-paren={id}
                  onClick={click} onKeyDown={keys} onPointerDown={down} onPointerMove={move}
                >
                  <Words id={id} />
                </span>
              </>
            )}
            <span className="ad-tail" data-flip-id={`${id}-tail`}>{TAIL}</span>
          </p>
        </blockquote>
        <figcaption className="ad-src">{paper.epigraph.source}</figcaption>
        <p className="ad-hint" id={hint}>{lifted ? 'Press it again to put it back.' : top ? 'Take the parenthesis out.' : 'The parenthesis, back in its sentence.'}</p>
      </figure>
      <div className={'ad-m ad-lift' + (lifted ? ' has' : '')}>
        {lifted && (
          <>
            <button type="button" aria-pressed="true" aria-describedby={hint} className="ad-paren ad-paren-m" data-paren={id} onClick={toggle}>
              <Words id={id} />
            </button>
            <p className="ad-mnote">Lifted out, it is the title of his paper. From its abstract:</p>
            <p className="ad-debt">{DEBT}</p>
            {top && <a className="ad-mlink" href="#research">Read the paper</a>}
          </>
        )}
      </div>
    </div>
  );
}

/** One section: a margin label as its heading, the main column, and the margin. */
function Sec({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <section id={id} className="ad-sec" aria-labelledby={id + '-h'}>
      <h2 id={id + '-h'} className="ad-label">{label}</h2>
      {children}
    </section>
  );
}

function Row({ children, m, className = '', lab }: { children: ReactNode; m?: ReactNode; className?: string; lab?: boolean }) {
  return (
    <div className={'ad-row ' + className}>
      <div className="ad-main">{children}</div>
      <div className={'ad-m' + (m ? ' has' : '') + (lab ? ' is-lab' : '')}>{m}</div>
    </div>
  );
}

function Research() {
  // The three names in the abstract, each tied to the ladder the paper traces through it.
  const names = ['Sextus Empiricus', 'Fritz Mauthner', 'the Tractatus'];
  const [on, setOn] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [tops, setTops] = useState<number[] | null>(null);
  const [s1, s2] = [firstSentence(paper.abstract), rest(paper.abstract)];

  const parts: ReactNode[] = [];
  let cut = s2;
  names.forEach((n, k) => {
    const i = cut.indexOf(n);
    parts.push(cut.slice(0, i));
    parts.push(
      <button key={n} type="button" className={'ad-name' + (on === k ? ' is-on' : '')} data-g={k}
        aria-describedby={`ad-g${k}`}
        onPointerEnter={() => setOn(k)} onPointerLeave={() => setOn(null)} onFocus={() => setOn(k)} onBlur={() => setOn(null)}
        onClick={() => setOn(on === k ? null : k)}>
        {n}<sup aria-hidden="true">{k + 1}</sup>
      </button>,
    );
    cut = cut.slice(i + n.length);
  });
  parts.push(cut);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const place = () => {
      if (window.innerWidth <= 820) { setTops(null); return; }
      const base = el.getBoundingClientRect().top;
      let floor = 0;
      const t: number[] = [];
      el.querySelectorAll<HTMLElement>('[data-g]').forEach((b, k) => {
        const y = Math.max(floor, b.getBoundingClientRect().top - base + 6);
        t.push(y);
        const g = el.querySelector<HTMLElement>(`#ad-g${k}`);
        floor = y + (g?.offsetHeight ?? 110) + 22;
      });
      const ol = el.querySelector<HTMLElement>('.ad-glosses');
      if (ol) ol.style.minHeight = floor + 'px';
      setTops(t);
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    document.fonts?.ready.then(place);
    return () => ro.disconnect();
  }, []);

  return (
    <Sec id="research" label="Research">
      <Row className="ad-titlerow" m={<><p className="ad-mlabel">{paper.status}</p><p>{paper.pages} pages</p><p>DOI {paper.doi}</p></>}>
        <h3 className="ad-ptitle">
          {(() => {
            const t = paper.title; const i = t.indexOf(paper.short);
            return <>{t.slice(0, i)}<span className="ad-red">{paper.short}</span>{t.slice(i + paper.short.length)}</>;
          })()}
        </h3>
      </Row>
      <div className="ad-row ad-abs" ref={box}>
        <div className="ad-main">
          <p className="ad-abstract">{s1} {parts}</p>
        </div>
        <ol className={'ad-m has ad-glosses' + (tops ? ' is-set' : '')} aria-label="The three ladders">
          {paper.ladders.map((l, k) => (
            <li key={l.who} id={`ad-g${k}`} className={'ad-gloss' + (on === k ? ' is-on' : '') + (on !== null && on !== k ? ' is-off' : '')}
              style={tops ? { top: tops[k] } : undefined}>
              <span className="ad-gn" aria-hidden="true">{k + 1}</span>
              <span className="ad-gwho">{l.who}</span>
              <span>{l.when}</span>
              <span className="ad-gwhere">{l.where}</span>
            </li>
          ))}
        </ol>
      </div>
      <Row lab m={<p className="ad-mlabel">Keywords</p>}>
        <p className="ad-keys">{paper.keywords.join(', ')}</p>
      </Row>
      <Row lab m={<p className="ad-mlabel">Read it</p>}>
        <ul className="ad-plinks">
          {paper.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}
        </ul>
      </Row>
      <Row className="ad-wess" m={<><p className="ad-mlabel">{wess.status}</p><p>Old High German</p></>}>
        <h3 className="ad-h3">{wess.title}</h3>
        <p className="ad-body">{wess.abstract}</p>
      </Row>
    </Sec>
  );
}

function Work() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (still || !root.current) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.ad-fig img').forEach((img) => {
        gsap.fromTo(img, { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    }, root);
    return () => ctx.revert();
  }, []);
  const b = CHAPTERS[4].body;
  return (
    <Sec id="work" label="Building">
      <Row className="ad-open" m={<p>Pictures link to the live sites.</p>}>
        <p className="ad-big">{firstSentence(b)}</p>
        <p className="ad-body">{rest(b)}</p>
      </Row>
      <div ref={root}>
        {WORK.map((w, k) => {
          const img = <img src={src(w.img)} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={700} />;
          return (
            <article key={w.slug} className={'ad-row ad-work' + (k % 2 ? ' is-alt' : '')} aria-labelledby={`ad-w-${w.slug}`}>
              <div className="ad-main">
                <p className="ad-wline"><strong id={`ad-w-${w.slug}`} className="ad-wname">{w.name}.</strong> {w.line}</p>
                <figure className="ad-fig">
                  {w.href ? <a href={w.href} tabIndex={-1} aria-hidden="true">{img}</a> : img}
                </figure>
              </div>
              <div className="ad-m has">
                <p className="ad-mlabel">{w.kind}</p>
                <p>{w.stack}</p>
                {w.href ? <a href={w.href}>{host(w.href)}</a> : <p className="ad-dim">Runs locally, so no link.</p>}
              </div>
            </article>
          );
        })}
      </div>
    </Sec>
  );
}

function Today() {
  const { notes, loaded } = useNotes();
  const [open, setOpen] = useState<string | null>(null);
  const [latest, ...earlier] = notes;
  const list = earlier.length > 0 && (
    <>
      <p className="ad-mlabel ad-earlier">Earlier notes</p>
      <ul className="ad-notes">
        {earlier.map((n) => (
          <li key={n.date}>
            <button type="button" aria-expanded={open === n.date} aria-controls={`ad-n-${n.date}`} onClick={() => setOpen(open === n.date ? null : n.date)}>
              <time dateTime={n.date}>{formatDate(n.date)}</time>
              <span aria-hidden="true">{open === n.date ? 'close' : 'open'}</span>
            </button>
            <div id={`ad-n-${n.date}`} className="ad-nbody" hidden={open !== n.date}>
              {n.body.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
  return (
    <Sec id="today" label="Today">
      {latest ? (
        <Row className="ad-open" m={<><p className="ad-date"><time dateTime={latest.date}>{formatDate(latest.date)}</time></p><p className="ad-dim">His daily note, newest first.</p>{list}</>}>
          <p className="ad-big">{latest.body[0]}</p>
          {latest.body.slice(1).map((p, i) => <p key={i} className="ad-body">{p}</p>)}
        </Row>
      ) : (
        <Row className="ad-open" m={<p className="ad-dim">{loaded ? 'Notes appear here.' : 'Fetching the note.'}</p>}>
          <p className="ad-big">{loaded ? 'No note today yet. Check back tomorrow.' : 'Today’s note is on its way.'}</p>
        </Row>
      )}
    </Sec>
  );
}

function GitHub() {
  const { repos, activity, live } = useGitHub();
  const line = PERSON.about[1].split('. ').find((s) => s.startsWith('Most of it'))!.replace(/\.?$/, '.');
  const commits = activity.slice(0, 6);
  return (
    <Sec id="github" label="Live from GitHub">
      <Row className="ad-open" m={commits.length ? (
        <ul className="ad-commits" aria-label="Recent commits">
          {commits.map((c) => (
            <li key={c.href}><a href={c.href}>{c.message}</a><span className="ad-dim">{c.repo}, {ago(c.at)}</span></li>
          ))}
        </ul>
      ) : (
        <>
          <p className="ad-mlabel">Where it lives</p>
          <p>His repositories, listed below.</p>
          <a href={GITHUB.href}>{host(GITHUB.href)}</a>
        </>
      )}>
        <p className="ad-big">{line}</p>
      </Row>
      <Row m={<a href={GITHUB.href}>All of it on GitHub</a>}>
        <ul className="ad-repos" aria-label="Repositories">
          {repos.slice(0, 8).map((r) => (
            <li key={r.name}>
              <a href={r.href}><span className="ad-rname">{r.name}</span></a>
              <span className="ad-rdesc">{r.description ?? 'No description yet.'}</span>
              <span className="ad-dim">{[r.language, r.pushedAt && live ? 'pushed ' + ago(r.pushedAt) : null].filter(Boolean).join(', ')}</span>
            </li>
          ))}
        </ul>
      </Row>
    </Sec>
  );
}

export default function Admit() {
  useVersion('admit');
  const debate = CHAPTERS[1].body;
  const first = firstSentence(debate);
  const [winA, winB] = [first.slice(0, first.indexOf(', and ') + 1), first.slice(first.indexOf(', and ') + 2)];
  const about0 = PERSON.about[0];
  const coach = CHAPTERS[2].body;

  return (
    <div className="v-admit">
      <a className="skip-x" href="#main">Skip to content</a>
      <div className="ad-rule" aria-hidden="true" />
      <header className="ad-row ad-top">
        <div className="ad-main ad-who">
          <h1 className="ad-name1">{PERSON.name}</h1>
          <p className="ad-line">{PERSON.line}</p>
        </div>
        <nav className="ad-m has ad-nav" aria-label="Sections">
          <ul>
            {[['debate', 'Debate'], ['research', 'Research'], ['work', 'Building'], ['today', 'Today'], ['github', 'GitHub'], ['contact', 'Contact']].map(([h, l]) => (
              <li key={h}><a href={'#' + h}>{l}</a></li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main">
        <section className="ad-hero" aria-label="Epigraph">
          <Epigraph id="top" persist top />
        </section>

        <Sec id="about" label="About">
          <Row className="ad-open" m={<>{PERSON.short.map((s) => <p key={s} className="ad-mword">{s}</p>)}</>}>
            <p className="ad-big">{firstSentence(about0)}</p>
            <p className="ad-body">{rest(about0)}</p>
            <p className="ad-body">{PERSON.about[1]}</p>
          </Row>
          <Row lab m={<p className="ad-mlabel">Also</p>}>
            <p className="ad-body ad-aside">{PERSON.aside.replace(/^Also:\s*/, '')}</p>
          </Row>
        </Sec>

        <Sec id="debate" label="Debate">
          {[winA, winB].map((s, k) => {
            const w = DEBATE.wins[k];
            return (
              <Row key={k} className="ad-win" m={<><p className="ad-mlabel">{w.title}, {w.when}</p><p>{w.event}</p><p>{w.where}</p></>}>
                <p className="ad-champ">{s}</p>
              </Row>
            );
          })}
          <Row m={
            <>
              <p className="ad-mlabel">Up next</p>
              <ul className="ad-next">{DEBATE.next.map((n) => <li key={n.where}><span>{n.where}</span><span className="ad-dim">{n.event}</span></li>)}</ul>
            </>
          }>
            <p className="ad-body ad-lead">{rest(debate)}</p>
          </Row>
          <Row className="ad-open ad-coach" m={
            <>
              <p className="ad-mlabel">{DEBATE.team.role}</p>
              <p>{DEBATE.team.name}</p>
              <a href={DEBATE.team.href}>{host(DEBATE.team.href)}</a>
            </>
          }>
            <p className="ad-big">{firstSentence(coach)} {rest(coach)}</p>
            <p className="ad-body">{DEBATE.team.line}</p>
            <p className="ad-body">{DEBATE.team.record}</p>
          </Row>
        </Sec>

        <Research />
        <Work />
        <Today />
        <GitHub />

        <Sec id="now" label="Now">
          <Row className="ad-open" m={<><p className="ad-mlabel">On the shelves</p>{NOW.reading.shelves.map((s) => <p key={s}>{s}</p>)}</>}>
            <p className="ad-big">{NOW.status}</p>
          </Row>
          <Row lab m={<p className="ad-mlabel">In the works</p>}>
            <h3 className="ad-h3">{NOW.reading.title}</h3>
            <p className="ad-body">{NOW.reading.body}</p>
            <h3 className="ad-h3">{NOW.club.title}</h3>
            <p className="ad-body">{NOW.club.body}</p>
          </Row>
        </Sec>

        <Sec id="record" label="Record">
          <Row className="ad-open" m={<ul className="ad-stats">{STATS.map((s) => <li key={s.label}><span className="ad-num">{s.to}{s.suffix}</span><span>{s.label}</span></li>)}</ul>}>
            <p className="ad-honors">
              {HONORS.map((h, k) => (
                <Fragment key={h.what}>
                  {k > 0 && <span className="ad-pil" aria-hidden="true"> ¶ </span>}
                  <span className="ad-hon">{h.what} <span className="ad-hd">({h.detail})</span>.</span>{' '}
                </Fragment>
              ))}
            </p>
          </Row>
          <Row m={<>{AWARDS.map((a) => <p key={a.site}><span className="ad-mlabel">{a.site}</span><br />{a.note}</p>)}</>}>
            <ul className="ad-awards">
              {AWARDS.map((a) => (
                <li key={a.site}>
                  <a href={a.href}>
                    <img src={src(a.img)} alt={`Certificate, ${a.site}, ${a.note}`} loading="lazy" width={720} height={1018} />
                    <span>{a.site}</span>
                  </a>
                </li>
              ))}
            </ul>
          </Row>
        </Sec>

        <Sec id="off" label="Off the record">
          <Row m={<>
            <p className="ad-mlabel">Courses</p>
            {COURSES.map((c) => <p key={c.title}>{c.provider}, {c.title}. <span className="ad-dim">{c.note}</span></p>)}
          </>}>
            <dl className="ad-off">
              {([['Likes', LIKES], ['Dislikes', DISLIKES], ['Favourites', FAVOURITES]] as const).map(([t, list]) => (
                <div key={t}><dt>{t}</dt><dd>{list.join('; ')}.</dd></div>
              ))}
            </dl>
          </Row>
        </Sec>

        <section id="contact" className="ad-sec ad-end" aria-labelledby="contact-h">
          <h2 id="contact-h" className="ad-label">Contact</h2>
          <Epigraph id="end" />
          <ul className="ad-links">
            {LINKS.map((l) => (
              <li key={l.label} className="ad-row">
                <div className="ad-main">{l.href ? <a href={l.href}>{l.value}</a> : <span>{l.value}</span>}</div>
                <div className="ad-m has"><span>{l.label}</span></div>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="ad-row ad-foot">
        <div className="ad-main"><p>Draft 76 of the portfolio. Not the live site.</p></div>
        <div className="ad-m has"><p>The moving parenthesis follows Codrops’ Inline Layout Switch, MIT licence.</p></div>
      </footer>
    </div>
  );
}
