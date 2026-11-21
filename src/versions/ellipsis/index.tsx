// Draft 96, The ellipsis. Built on chenglou/pretext's ellipsis demo (MIT): every block is cut to one measured
// line ending in a blue ellipsis, and grows to its measured full height when pressed. He dislikes being told
// to keep it short; the page argues with that, and the last button opens everything at once.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as RPE } from 'react';
import '@fontsource-variable/schibsted-grotesk/index.css';
import '@fontsource-variable/newsreader/index.css';
import './ellipsis.css';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { formatDate, useNotes } from '@/lib/notes';
import { still } from '@/lib/utils';
import { Cut, EnvCtx, counts, duration, setAll, useAll, useOpen } from './Cut';
import { faces, resetMeasure } from './model';
import { play, snapshot, type Snap } from './flip';

const BASE = import.meta.env.BASE_URL;
const PAPER = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; epigraph: { text: string; source: string }; ladders: { who: string; when: string; where: string }[]; pages: number };
const WESSO = RESEARCH[1]!;
// Where each sliver cuts its screenshot, as a fraction of its height.
const FOCUS: Record<string, number> = { mitez: 0.5, skeptical: 0.42, lastseen: 0.5, lastsearch: 0.38, spread: 0.13, rogue: 0.6, jarvis: 0.5, drafts: 0.2 };
const DIMS: Record<string, [number, number]> = {
  mitez: [1200, 660], skeptical: [1200, 660], lastseen: [1200, 670], lastsearch: [1200, 692],
  spread: [1200, 660], rogue: [1200, 662], jarvis: [1200, 852], drafts: [1200, 766],
};

/** A list as one run-on sentence: the cut is the point. */
const run = (items: readonly string[]) => items.map((s) => s.replace(/\.$/, '')).join('; ') + '.';

function usePhone() {
  const q = '(max-width: 759px)';
  const [p, setP] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setP(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return p;
}

/** Pretext reads canvas metrics, so it waits for the faces the CSS paints. */
function useFontsReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    const F = [...Object.values(faces(false)), ...Object.values(faces(true))];
    const all = [...new Set(F.flatMap((f) => [f.font, f.dots, f.less]))];
    const t = window.setTimeout(() => { if (live) setReady(true); }, 2500);
    Promise.all(all.map((f) => document.fonts.load(f).catch(() => null)))
      .then(() => document.fonts.ready)
      .then(() => { if (!live) return; resetMeasure(); setReady(true); });
    return () => { live = false; window.clearTimeout(t); };
  }, []);
  return ready;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** One project: its line and its screenshot sliver open together. */
function Project({ p, phone }: { p: (typeof WORK)[number]; phone: boolean }) {
  const [open, setOpen] = useOpen();
  const [frameRef, fw] = useWidth<HTMLSpanElement>();
  const liRef = useRef<HTMLLIElement>(null);
  const [iw, ih] = DIMS[p.slug] ?? [1200, 700];
  const sliver = phone ? 44 : 62;
  const full = fw ? Math.round((fw * ih) / iw) : 400;
  // A pointer moving along a closed sliver scrubs the slot down the screenshot, like looking through a letterbox.
  const [peek, setPeek] = useState<number | null>(null);
  const focus = peek ?? FOCUS[p.slug] ?? 0.4;
  const shift = open ? 0 : -Math.max(0, Math.min(full - sliver, Math.round(full * focus - sliver / 2)));
  const dur = duration(full - sliver, still);
  // By hand, the row FLIPs: the layout changes once, the rows below slide, the row's clip opens or closes.
  const [closing, setClosing] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const flip = useRef<{ snap: Snap; h: number } | null>(null);
  const toggle = (v: boolean) => {
    setPeek(null);
    if (!still && liRef.current) { flip.current = { snap: snapshot(liRef.current), h: liRef.current.offsetHeight }; setAnimKey((k) => k + 1); setClosing(!v); }
    setOpen(v);
  };
  useLayoutEffect(() => {
    const li = liRef.current;
    const f = flip.current;
    flip.current = null;
    if (!li || !f) { setClosing(false); return; }
    play(li, f.snap, li.offsetHeight - f.h, dur);
    const t = window.setTimeout(() => setClosing(false), dur + 40);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const onMove = (e: RPE<HTMLButtonElement>) => {
    if (open || still || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    setPeek(Math.min(0.97, Math.max(0.03, (e.clientX - r.left) / r.width)));
  };
  const h = open || closing ? full : sliver;
  const mb = !open && closing ? sliver - full : 0;
  const imgDur = peek !== null && !open ? 380 : dur;
  const name = p.href ? <a className="pname" href={p.href} target="_blank" rel="noreferrer">{p.name}</a> : <span className="pname">{p.name}</span>;
  return (
    <li ref={liRef} className="proj" data-open={open ? '' : undefined}>
      <div className="proj-text">
        <h3 className="proj-h">{name}<span className="pkind">{p.kind}</span></h3>
        <Cut face="lede" text={[p.line, `Built with ${p.stack}.`]} open={open} onToggle={toggle} animKey={animKey} dur={dur} />
      </div>
      <button type="button" className="sliver" aria-expanded={open} aria-label={`${open ? 'Close' : 'Open'} the ${p.name} screenshot`} onClick={() => toggle(!open)} onPointerMove={onMove} onPointerLeave={() => setPeek(null)}>
        <span ref={frameRef} className="frame" style={{ height: h, marginBottom: mb }}>
          <img
            src={BASE + p.img}
            alt={`Screenshot of ${p.name}`}
            width={iw}
            height={ih}
            loading="lazy"
            decoding="async"
            style={{ transform: `translate3d(0, ${shift}px, 0)`, transitionDuration: `${imgDur}ms` }}
          />
        </span>
        <span className="sdots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>
      </button>
    </li>
  );
}

function Today() {
  const { notes, loaded } = useNotes();
  const [latest, ...earlier] = notes;
  return (
    <section id="today" className="sec today" aria-labelledby="today-h">
      <div className="sec-head">
        <h2 id="today-h">Today</h2>
        <p className="sec-say">His daily note. The newest one is never cut.</p>
      </div>
      {latest ? (
        <article className="note-now">
          <time className="note-date" dateTime={latest.date}>{formatDate(latest.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time>
          <div className="note-body">{latest.body.map((b, i) => <p key={i}>{b}</p>)}</div>
        </article>
      ) : (
        <article className="note-now" aria-busy={!loaded}>
          <p className="note-date">{loaded ? 'No note posted yet' : 'Fetching the latest note'}</p>
          <div className="note-body"><p>{loaded ? 'The next one lands here first.' : '\u2026'}</p></div>
        </article>
      )}
      {earlier.length > 0 && (
        <div className="earlier">
          <h3 className="earlier-h">Earlier</h3>
          <ol>
            {earlier.map((n) => (
              <li key={n.date}>
                <time dateTime={n.date}>{formatDate(n.date, { day: 'numeric', month: 'short' })}</time>
                <Cut face="note" text={n.body} />
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function GitHubLive() {
  const { repos, activity, live } = useGitHub();
  return (
    <section id="github" className="sec github" aria-labelledby="gh-h">
      <div className="sec-head">
        <h2 id="gh-h">Live from GitHub</h2>
        <p className="sec-say">{live ? 'Read from GitHub as the page loads.' : 'What he keeps pushing to.'}</p>
      </div>
      <div className={activity.length ? 'gh-cols' : 'gh-cols solo'}>
        {activity.length > 0 && (
          <ol className="commits" aria-label="Recent commits">
            {activity.slice(0, 7).map((a, i) => (
              <li key={a.href + i}>
                <a href={a.href} target="_blank" rel="noreferrer" className="cmsg">{a.message}</a>
                <span className="cmeta">{a.repo}, {ago(a.at)}</span>
              </li>
            ))}
          </ol>
        )}
        <ul className="repos" aria-label="Repositories">
          {repos.slice(0, 6).map((r) => (
            <li key={r.name}>
              <p className="rhead"><a href={r.href} target="_blank" rel="noreferrer" className="rname">{r.name}</a>{r.language && <span className="rlang">{r.language}</span>}</p>
              {r.description && <Cut face="body" text={r.description} />}
            </li>
          ))}
        </ul>
      </div>
      <a className="gh-all" href={GITHUB.href} target="_blank" rel="noreferrer">github.com/{GITHUB.user}</a>
    </section>
  );
}

function Ending() {
  const all = useAll((s) => s.all);
  const [tally, setTally] = useState<{ n: number; lines: number } | null>(null);
  const press = () => {
    let n = 0, lines = 0;
    counts.forEach((c) => { n++; lines += c.open - c.closed; });
    setTally({ n, lines });
    setAll(true);
  };
  return (
    <section className="end" aria-label="The last ellipsis">
      {!all ? (
        <button type="button" className="all" onClick={press}>
          Don’t keep it short<span className="all-dot">.</span>
        </button>
      ) : (
        <div className="all-done" aria-live="polite">
          <p className="all-said">Nothing is short any more.</p>
          {tally && <p className="all-tally">{tally.n} cuts opened. {tally.lines} lines came back.</p>}
          <button type="button" className="undo" onClick={() => setAll(false)}>Cut it all back</button>
        </div>
      )}
    </section>
  );
}

export default function Ellipsis() {
  useVersion('ellipsis');
  const ready = useFontsReady();
  const phone = usePhone();
  const env = useMemo(() => ({ ready, phone, still, F: faces(phone) }), [ready, phone]);
  const honors = HONORS.map((h) => `${h.what}, ${h.detail}.`).join(' ');

  return (
    <EnvCtx.Provider value={env}>
      <div className="v-ellipsis">
        <a className="skip-x" href="#main">Skip to content</a>
        <header className="top">
          <a className="top-name" href="#main">Armaan Seth</a>
          <nav aria-label="Sections">
            <a href="#debate">Debate</a>
            <a href="#research">Research</a>
            <a href="#work">Work</a>
            <a href="#github">GitHub</a>
            <a href="#today">Today</a>
            <a href="#contact">Contact</a>
          </nav>
        </header>

        <main id="main">
          <section className="hero" aria-labelledby="name">
            <p className="dislike">Dislikes: {DISLIKES[3]}.</p>
            <h1 id="name" className="name"><span>{PERSON.first}</span> <span>{PERSON.last}</span></h1>
            <p className="role">{PERSON.line}</p>
            <section className="about" aria-label="About">
              <Cut face="display" text={PERSON.about} as="p" />
              <p className="hint">Press any blue ellipsis to keep going.</p>
            </section>
            <Cut face="body" text={PERSON.aside} className="aside" />
          </section>

          <section id="debate" className="sec debate" aria-labelledby="debate-h">
            <div className="sec-head">
              <h2 id="debate-h">Debate</h2>
              <p className="sec-say">Two wins. Nothing to cut.</p>
            </div>
            <ul className="wins">
              {DEBATE.wins.map((w) => (
                <li key={w.where} className="win">
                  <p className="champ">{w.title}<span className="stop">.</span></p>
                  <p className="wev">{w.event}</p>
                  <p className="wwh">{w.where}, {w.when}</p>
                </li>
              ))}
            </ul>
            <div className="team">
              <div className="team-l">
                <p className="team-role">{DEBATE.team.role}</p>
                <h3 className="team-name"><a href={DEBATE.team.href} target="_blank" rel="noreferrer">{DEBATE.team.name}</a></h3>
              </div>
              <div className="team-r">
                <p className="team-line">{DEBATE.team.line}</p>
                <Cut face="lede" text={DEBATE.team.record} className="team-rec" />
                <a className="arrow-link" href={DEBATE.team.href} target="_blank" rel="noreferrer">skeptical.pages.dev</a>
              </div>
            </div>
            <div className="next">
              <h3 className="next-h">Up next</h3>
              <ul>
                {DEBATE.next.map((n) => <li key={n.where}><span className="next-w">{n.where}</span><span className="next-e">{n.event}</span></li>)}
              </ul>
            </div>
          </section>

          <section id="research" className="sec research" aria-labelledby="research-h">
            <div className="sec-head">
              <h2 id="research-h">Research</h2>
              <p className="sec-say">{PAPER.status}, {PAPER.pages} pages.</p>
            </div>
            <article className="paper">
              <h3 className="ptitle">{PAPER.title}</h3>
              <div className="pcols">
                <div className="pmain">
                  <Cut face="lede" text={PAPER.abstract} cutAt="How can a skeptic argue that language fails" className="abstract" />
                  <p className="kw"><span className="kw-h">Keywords.</span> {PAPER.keywords.join(', ')}.</p>
                  <ul className="plinks">
                    {PAPER.links.map((l) => <li key={l.label}><a href={l.href} target="_blank" rel="noreferrer">{l.label}</a></li>)}
                  </ul>
                </div>
                <div className="pside">
                  <blockquote className="epi">
                    <p>{PAPER.epigraph.text}</p>
                    <footer>{PAPER.epigraph.source}</footer>
                  </blockquote>
                  <ol className="ladders" aria-label="The ladder, three times">
                    {PAPER.ladders.map((l) => (
                      <li key={l.who}><span className="lwho">{l.who}</span><span className="lwhen">{l.when}</span><span className="lwhere">{l.where}</span></li>
                    ))}
                  </ol>
                </div>
              </div>
            </article>
            <article className="wesso">
              <h3 className="wtitle">{WESSO.title}</h3>
              <p className="wstatus">{WESSO.status}</p>
              <Cut face="body" text={WESSO.abstract} />
            </article>
          </section>

          <section id="work" className="sec work" aria-labelledby="work-h">
            <div className="sec-head">
              <h2 id="work-h">Work</h2>
              <p className="sec-say">Eight things he built, each cut to a sliver.</p>
            </div>
            <ol className="band">
              {WORK.map((p) => <Project key={p.slug} p={p} phone={phone} />)}
            </ol>
          </section>

          <Today />
          <GitHubLive />

          <section id="now" className="sec now" aria-labelledby="now-h">
            <div className="sec-head">
              <h2 id="now-h">Now</h2>
            </div>
            <div className="now-grid">
              <div className="reading">
                <h3 className="now-h">{NOW.reading.title}</h3>
                <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
                <Cut face="body" text={NOW.reading.body} />
              </div>
              <div className="club">
                <h3 className="now-h">{NOW.club.title}</h3>
                <Cut face="body" text={NOW.club.body} />
                <h3 className="now-h status-h">Status</h3>
                <Cut face="body" text={NOW.status} />
              </div>
            </div>
          </section>

          <section id="record" className="sec record" aria-labelledby="record-h">
            <div className="sec-head">
              <h2 id="record-h">Record</h2>
              <p className="sec-say">The record keeps going.</p>
            </div>
            <Cut face="lede" text={honors} lines={2} className="honors" />
            <ul className="certs">
              {AWARDS.map((a) => (
                <li key={a.site}>
                  <a href={a.href} target="_blank" rel="noreferrer">
                    <img src={BASE + a.img} alt={`Certificate, ${a.site}`} width={720} height={1018} loading="lazy" decoding="async" />
                    <span className="cert-site">{a.site}</span>
                    <span className="cert-note">{a.note}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section id="off" className="sec off" aria-labelledby="off-h">
            <div className="sec-head">
              <h2 id="off-h">Off the record</h2>
            </div>
            <dl className="offl">
              <div><dt>Likes</dt><dd><Cut face="body" text={run(LIKES)} /></dd></div>
              <div><dt>Dislikes</dt><dd><Cut face="body" text={run(DISLIKES)} /></dd></div>
              <div><dt>Favourites</dt><dd><Cut face="body" text={run(FAVOURITES)} /></dd></div>
              <div><dt>Courses</dt><dd><Cut face="body" text={run(COURSES.map((c) => `${c.provider} ${c.title}: ${c.note}`))} /></dd></div>
            </dl>
          </section>

          <Ending />

          <section id="contact" className="sec contact" aria-labelledby="contact-h">
            <h2 id="contact-h">Contact</h2>
            <ul className="links">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <span className="l-lab">{l.label}</span>
                  {l.href ? <a href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{l.value}</a> : <span className="l-val">{l.value}</span>}
                </li>
              ))}
            </ul>
          </section>
        </main>

        <footer className="foot">
          <p>Draft 96 of the portfolio. Not the live site.</p>
          <p>Every line here is measured and cut with Pretext, by Cheng Lou and contributors, MIT licence.</p>
        </footer>
      </div>
    </EnvCtx.Provider>
  );
}
