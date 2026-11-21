// Draft 43: the search. A white studio with one big search field that already has his
// name typed in it. Type a section's word and the pale word behind sinks into the
// floor while that section's own title stands up; Enter takes you there.
// Studio scene remixed from pmndrs/examples html-input-fields (MIT).
import { lazy, Suspense, useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import '@fontsource-variable/hanken-grotesk/wght.css';
import './search.css';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { ago, useGitHub } from '@/lib/github';
import { formatDate, useNotes } from '@/lib/notes';
import { scrollToId, scrollToY } from '@/lib/scroll';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { FIRST, NAME_TYPED, SUGGEST, find, type Hit } from './words';

const Studio = lazy(() => import('./Studio'));
const BASE = import.meta.env.BASE_URL;
const NONE = 'Nothing here by that name.';
const HINT = 'Type a word, or pick one.';

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const ext = (href: string) => (href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {});
const host = (href: string) => href.replace(/^https?:\/\//, '').replace(/\/$/, '');

/** The search behaviour, shared by the studio field, the flat field and the one at the end. */
function useSearch(initial: string, initialHit: Hit | null) {
  const [value, setValue] = useState(initial);
  const [hit, setHit] = useState<Hit | null>(initialHit);
  const [miss, setMiss] = useState(false);
  const change = useCallback((v: string) => {
    setValue(v);
    const h = find(v);
    if (h) { setHit(h); setMiss(false); } else setMiss(v.trim().length >= 2);
  }, []);
  const go = useCallback((h: Hit | null, el?: HTMLInputElement | null) => {
    if (!h) { setMiss(true); return; }
    if (isPhone()) el?.blur();
    scrollToId(h.id);
  }, []);
  const pick = useCallback((h: Hit) => { setValue(h.word); setHit(h); setMiss(false); scrollToId(h.id); }, []);
  return { value, change, hit, miss, go, pick };
}

/** The same field drawn flat in the page: for no WebGL, reduced motion, and the ending. */
function FlatField({ s, word, labelId, describedBy, id }: { s: ReturnType<typeof useSearch>; word: string; labelId: string; describedBy: string; id: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [words, setWords] = useState([{ w: word, k: 0 }]);
  useEffect(() => {
    setWords((prev) => (prev[prev.length - 1].w === word ? prev : [...prev.slice(-1), { w: word, k: prev[prev.length - 1].k + 1 }]));
  }, [word]);
  return (
    <div className="flat">
      <div className="flat-word" aria-hidden="true">
        {words.map((x, i) => (
          <span key={x.k} data-w={x.w.replace('\n', ' ')} className={i === words.length - 1 ? (x.k ? 'up' : '') : 'down'} onAnimationEnd={() => { if (i < words.length - 1) setWords((p) => p.slice(-1)); }}>
          </span>
        ))}
      </div>
      <div className="flat-field">
        <input
          ref={ref}
          id={id}
          type="search"
          enterKeyHint="go"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={28}
          placeholder="search again"
          aria-labelledby={labelId}
          aria-describedby={describedBy}
          value={s.value}
          onChange={(e) => s.change(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); s.go(find(s.value), ref.current); } }}
        />
      </div>
    </div>
  );
}

/** The words you can look for. Whatever you have typed so far is marked in each word it starts. */
function Suggestions({ onPick, current, typed }: { onPick: (h: Hit) => void; current: Hit | null; typed: string }) {
  const q = typed.trim().toLowerCase();
  return (
    <ul className="sugg">
      {SUGGEST.map((h) => {
        const n = q && h.word.startsWith(q) ? q.length : 0;
        return (
          <li key={h.id}>
            <button type="button" className={current?.id === h.id ? 'on' : undefined} onClick={() => onPick(h)}>
              {n ? <><mark>{h.word.slice(0, n)}</mark>{h.word.slice(n)}</> : h.word}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Each section is headed by the word that finds it; pressing it goes back up to the field with that word typed. */
let back: (w: string) => void = () => {};
function Head({ word, title, id }: { word: string; title: React.ReactNode; id: string }) {
  return (
    <header className="sh">
      <button type="button" className="q" aria-label={`${word}, back to the search field`} onClick={() => back(word)}>{word}<i aria-hidden="true" /></button>
      <h2 id={id}>{title}</h2>
    </header>
  );
}

export default function Search() {
  useVersion('search');
  const [webgl] = useState(hasWebGL);
  const flat = still || !webgl;
  const [phone, setPhone] = useState(isPhone);
  const top = useSearch(NAME_TYPED, FIRST);
  const end = useSearch('', null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uid = useId().replace(/:/g, '');
  const [heroH, setHeroH] = useState(() => window.innerHeight);
  const { notes, loaded } = useNotes();
  const gh = useGitHub();
  const [noteI, setNoteI] = useState(0);

  // A phone keyboard resizes the viewport: only re-measure the studio when the field is not in use.
  useEffect(() => {
    let w = window.innerWidth;
    const on = () => {
      setPhone(isPhone());
      const focused = document.activeElement?.tagName === 'INPUT';
      if (!focused && (window.innerWidth !== w || !isPhone())) { w = window.innerWidth; setHeroH(window.innerHeight); }
    };
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // On a desktop the caret is already in the field. Never on a phone: the keyboard must not open by itself.
  useEffect(() => {
    if (isPhone() || matchMedia('(pointer: coarse)').matches) return;
    const t = setTimeout(() => { const el = inputRef.current ?? document.getElementById('q'); (el as HTMLInputElement | null)?.focus({ preventScroll: true }); }, 1400);
    return () => clearTimeout(t);
  }, []);

  back = (w: string) => {
    top.change(w);
    scrollToY(0);
    if (!isPhone()) setTimeout(() => (inputRef.current ?? (document.getElementById('q') as HTMLInputElement | null))?.focus({ preventScroll: true }), 1200);
  };

  // Stop drawing the studio once it has scrolled away.
  const heroRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(true);
  useEffect(() => {
    const el = heroRef.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: '80px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); top.go(find(top.value), inputRef.current); }
  };

  const latest = notes[noteI] ?? notes[0];
  const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { epigraph: { text: string; source: string }; keywords: string[] }, wess = RESEARCH[1];
  const word = (top.hit ?? FIRST).big;

  return (
    <div className="v-search">
      <a className="skip-x" href="#main">Skip to content</a>

      <section ref={heroRef} className="hero" style={{ height: heroH }} aria-labelledby="name">
        <h1 id="name" className="name">{PERSON.name}</h1>
        <label id={`${uid}-l`} htmlFor="q" className="sr-only-x">Search this page</label>
        <div className="stage">
          {flat ? (
            <FlatField s={top} word={word.replace('\n', ' ')} labelId={`${uid}-l`} describedBy={`${uid}-s`} id="q" />
          ) : (
            <Suspense fallback={null}>
              <Studio
                value={top.value}
                setValue={top.change}
                onKey={onKey}
                word={phone && top.hit?.bigPhone ? top.hit.bigPhone : word}
                phone={phone}
                active={active}
                inputRef={inputRef}
                labelId={`${uid}-l`}
                describedBy={`${uid}-s`}
              />
            </Suspense>
          )}
        </div>
        <div className="under">
          <p id={`${uid}-s`} className={top.miss ? 'hint miss' : 'hint'} aria-live="polite">{top.miss ? NONE : top.hit && top.value !== NAME_TYPED ? `Press Enter to go to ${top.hit.word}.` : HINT}</p>
          <Suggestions onPick={top.pick} current={top.miss ? null : top.hit} typed={top.value} />
          <p className="line">{PERSON.line}</p>
        </div>
      </section>

      <main id="main">
        {/* About */}
        <section className="sec about" aria-labelledby="about">
          <Head word="armaan seth" title="About" id="about" />
          <div className="about-grid">
            <p className="short">
              {PERSON.short.map((w) => <span key={w}>{w} </span>)}
            </p>
            <div className="prose">
              {PERSON.about.map((p) => <p key={p.slice(0, 20)}>{p}</p>)}
              <p className="aside">{PERSON.aside}</p>
            </div>
          </div>
        </section>

        {/* Debate */}
        <section className="sec debate" aria-labelledby="debate">
          <Head word="debate" title="Two titles this fall" id="debate" />
          <ol className="wins">
            {DEBATE.wins.map((w) => (
              <li key={w.where}>
                <p className="win-where">{w.where}</p>
                <p className="win-what"><strong>{w.title}</strong>, {w.event}, {w.when}</p>
              </li>
            ))}
          </ol>
          <div className="team">
            <div className="team-name">
              <h3>{DEBATE.team.name}</h3>
              <p className="role">{DEBATE.team.role}</p>
            </div>
            <div className="team-body">
              <p className="team-line">{DEBATE.team.line}</p>
              <p className="team-record">{DEBATE.team.record}</p>
              <a className="go" href={DEBATE.team.href} {...ext(DEBATE.team.href)}>{host(DEBATE.team.href)}</a>
            </div>
          </div>
          <div className="next">
            <h3>Up next</h3>
            <ul>
              {DEBATE.next.map((n) => (
                <li key={n.where}><span className="next-where">{n.where}</span><span className="next-event">{n.event}</span></li>
              ))}
            </ul>
          </div>
        </section>

        {/* Research */}
        <section className="sec research" aria-labelledby="research">
          <Head word="research" title={paper.title} id="research" />
          <div className="paper">
            <figure className="epi">
              <blockquote>{paper.epigraph.text}</blockquote>
              <figcaption>{paper.epigraph.source}</figcaption>
            </figure>
            <div className="paper-body">
              <p className="status">{paper.status}, {paper.pages} pages</p>
              <p className="abstract">{paper.abstract}</p>
              <ul className="kw" aria-label="Keywords">{paper.keywords.map((k) => <li key={k}>{k}</li>)}</ul>
              <ul className="plinks">
                {paper.links.map((l) => <li key={l.label}><a href={l.href} {...ext(l.href)}>{l.label}</a></li>)}
              </ul>
            </div>
          </div>
          <div className="wess">
            <h3>{wess.title}</h3>
            <p>{wess.abstract}</p>
            <p className="status">{wess.status}</p>
          </div>
        </section>

        {/* Work */}
        <section className="sec work" aria-labelledby="work">
          <Head word="work" title="Shipped" id="work" />
          <ul className="shots">
            {WORK.map((w) => (
              <li key={w.slug} className="shot">
                <div className="plate">
                  <img src={BASE + w.img} alt={`${w.name}, screenshot`} loading="lazy" decoding="async" width={1200} height={700} />
                </div>
                <div className="cap">
                  <h3>{w.name}</h3>
                  <p className="kind">{w.kind}</p>
                  <p className="wline">{w.line}</p>
                  <p className="stack">{w.stack}</p>
                  {w.href ? <a className="go" href={w.href} {...ext(w.href)}>{host(w.href)}</a> : <p className="nolink">No public link</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* GitHub */}
        <section className="sec gh" aria-labelledby="github">
          <Head word="github" title="Live from GitHub" id="github" />
          {gh.commitsThisMonth ? <p className="gh-count"><strong>{gh.commitsThisMonth}</strong> commits pushed this month.</p> : null}
          <div className={gh.activity.length ? 'gh-grid' : 'gh-grid solo'}>
            {gh.activity.length > 0 && (
              <div className="commits">
                <h3>Latest commits</h3>
                <ol>
                  {gh.activity.slice(0, 7).map((a) => (
                    <li key={a.href}>
                      <a href={a.href} {...ext(a.href)}>{a.message}</a>
                      <span className="meta">{a.repo}, {ago(a.at)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <div className="repos">
              <h3>Repositories</h3>
              <ul>
                {gh.repos.slice(0, 8).map((r) => (
                  <li key={r.name}>
                    <a href={r.href} {...ext(r.href)}>{r.name}</a>
                    {r.description && <p>{r.description}</p>}
                    <span className="meta">{[r.language, r.pushedAt ? `pushed ${ago(r.pushedAt)}` : null].filter(Boolean).join(', ')}</span>
                  </li>
                ))}
              </ul>
              <a className="go" href={GITHUB.href} {...ext(GITHUB.href)}>{host(GITHUB.href)}</a>
            </div>
          </div>
        </section>

        {/* Today */}
        <section className="sec today" aria-labelledby="today">
          <Head word="today" title="Today" id="today" />
          {!loaded ? (
            <p className="note-wait">Finding today’s note.</p>
          ) : !latest ? (
            <p className="note-wait">No note posted yet. Check back tomorrow.</p>
          ) : (
            <div className="today-grid">
              <article className="note" aria-live="polite">
                <p className="note-date"><time dateTime={latest.date}>{formatDate(latest.date)}</time>{noteI === 0 ? <span className="fresh"> latest</span> : null}</p>
                {latest.body.map((p, i) => <p key={i} className="note-body">{p}</p>)}
              </article>
              {notes.length > 1 && (
                <nav className="earlier" aria-label="Earlier notes">
                  <h3>Earlier</h3>
                  <ul>
                    {notes.map((n, i) => (
                      <li key={n.date}>
                        <button type="button" aria-pressed={i === noteI} onClick={() => setNoteI(i)}>
                          <time dateTime={n.date}>{formatDate(n.date, { day: 'numeric', month: 'short', year: 'numeric' })}</time>
                          <span>{n.body[0].length > 64 ? n.body[0].slice(0, 62).replace(/\s+\S*$/, '') + '…' : n.body[0]}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}
            </div>
          )}
        </section>

        {/* Now */}
        <section className="sec reading" aria-labelledby="reading">
          <Head word="reading" title={NOW.reading.title} id="reading" />
          <div className="now-grid">
            <div>
              <p className="lede">{NOW.reading.body}</p>
              <ul className="shelves">
                {NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
            <div className="club">
              <h3>{NOW.club.title}</h3>
              <p>{NOW.club.body}</p>
              <p className="nowstatus">{NOW.status}</p>
            </div>
          </div>
        </section>

        {/* Record */}
        <section className="sec record" aria-labelledby="record">
          <Head word="record" title="Record" id="record" />
          <div className="rec-grid">
            <ol className="honors">
              {HONORS.map((h) => <li key={h.what}><span className="what">{h.what}</span><span className="detail">{h.detail}</span></li>)}
            </ol>
            <ul className="awards">
              {AWARDS.map((a) => (
                <li key={a.site}>
                  <a href={a.href} {...ext(a.href)}>
                    <span className="cert"><img src={BASE + a.img} alt={`Certificate for ${a.site}`} loading="lazy" width={720} height={1018} /></span>
                    <span className="aname">{a.site}</span>
                    <span className="anote">{a.note}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Off the record */}
        <section className="sec off" aria-labelledby="off">
          <Head word="off the record" title="Off the record" id="off" />
          <div className="off-grid">
            <div><h3>Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider}, {c.title}.</strong> {c.note}</li>)}</ul></div>
          </div>
        </section>

        {/* Contact */}
        <section className="sec contact" aria-labelledby="contact">
          <Head word="contact" title="Contact" id="contact" />
          <ul className="links">
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="lab">{l.label}</span>
                {l.href ? <a href={l.href} {...ext(l.href)}>{l.value}</a> : <span className="val">{l.value}</span>}
              </li>
            ))}
          </ul>
        </section>

        {/* The ending: the field again, empty, waiting. */}
        <section className="sec end" aria-label="Search again">
          <label id={`${uid}-e`} htmlFor="q2" className="sr-only-x">Search this page again</label>
          <FlatField s={end} word={end.hit ? end.hit.big.replace('\n', ' ') : PERSON.short[2]} labelId={`${uid}-e`} describedBy={`${uid}-es`} id="q2" />
          <p id={`${uid}-es`} className={end.miss ? 'hint miss' : 'hint'} aria-live="polite">{end.miss ? NONE : end.hit ? `Press Enter to go to ${end.hit.word}.` : 'Looking for something else?'}</p>
          <Suggestions onPick={end.pick} current={end.miss ? null : end.hit} typed={end.value} />
        </section>
      </main>

      <footer className="foot">
        <p>Draft 43 of the portfolio. Not the live site.</p>
        <p>The studio field is remixed from the pmndrs html-input-fields example (MIT).</p>
      </footer>
    </div>
  );
}
