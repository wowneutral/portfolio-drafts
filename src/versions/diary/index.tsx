// Draft 88, The diary. Built on Nodlik/StPageFlip (MIT), copied into ./pageflip: his daily notes as a
// notebook lying open on the desk. Every page is real DOM; the words move only with the turning paper.
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource-variable/instrument-sans/wght.css';
import './diary.css';
import { AWARDS, CHAPTERS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, STATS, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago, type GitHubData } from '@/lib/github';
import { useNotes, formatDate, type Note } from '@/lib/notes';
import { still } from '@/lib/utils';
import { PageFlip } from './pageflip/PageFlip';

const src = (p: string) => import.meta.env.BASE_URL + p;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; epigraph: { text: string; source: string }; ladders: { who: string; when: string; where: string }[] };
const wess = RESEARCH[1];
const debateCh = CHAPTERS.find((c) => c.id === 'debate')!;
const todayISO = () => new Date().toISOString().slice(0, 10);

type Size = { land: boolean; pw: number; ph: number; vw: number };
function measure(): Size {
  const W = window.innerWidth, H = window.innerHeight;
  let ph = Math.min(H - 170, 700), pw = Math.round(ph * 0.7);
  if (2 * pw + 150 > W) { pw = Math.floor((W - 150) / 2); ph = Math.round(pw / 0.7); }
  if (W >= 1000 && pw >= 380 && ph >= 540) return { land: true, pw, ph, vw: W };
  pw = Math.min(W - 32, 480); ph = Math.round(pw / 0.68);
  if (W > 600 && ph > H - 170) { ph = Math.max(560, H - 170); pw = Math.round(ph * 0.68); }
  return { land: false, pw, ph, vw: W };
}

type PageDef = { key: string; run: string; hard?: boolean; cls?: string; body: ReactNode };
type Tab = { label: string; page: number };

export default function DiaryPage() {
  useVersion('diary');
  const { notes, loaded } = useNotes();
  const gh = useGitHub();
  const [size, setSize] = useState<Size | null>(null);

  useLayoutEffect(() => {
    setSize(measure());
    let t = 0;
    const on = () => {
      clearTimeout(t);
      t = window.setTimeout(() => setSize((s) => {
        const n = measure();
        return s && s.land === n.land && Math.abs(s.pw - n.pw) < 24 && Math.abs(s.ph - n.ph) < 24 ? s : n;
      }), 250);
    };
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('resize', on); clearTimeout(t); };
  }, []);

  return (
    <div className="v-diary">
      <a className="skip-x" href="#main">Skip to the notebook</a>
      <main id="main" className="dy-desk">
        {size && loaded ? (
          <Book key={`${size.land}-${size.pw}-${size.ph}-${notes.length}`} size={size} notes={notes} gh={gh} />
        ) : (
          <div className="dy-wait" style={size ? { width: size.land ? size.pw : size.pw, height: size.ph } : undefined} aria-hidden="true" />
        )}
      </main>
      <footer className="dy-foot">
        <p>Draft 88 of the portfolio. Not the live site.</p>
        <p>Page turning by StPageFlip (Nodlik, MIT). Set in Newsreader and Instrument Sans.</p>
      </footer>
    </div>
  );
}

function Book({ size, notes, gh }: { size: Size; notes: Note[]; gh: GitHubData }) {
  const { land, pw, ph, vw } = size;
  const hostRef = useRef<HTMLDivElement>(null);
  const pfRef = useRef<PageFlip | null>(null);
  const focusNext = useRef(false);
  const [cur, setCur] = useState(still ? 1 : 0);
  const [fold, setFold] = useState(false);
  const [ready, setReady] = useState(false);
  const foldRef = useRef(false);
  foldRef.current = fold;

  const { pages, tabs, debateAt } = useMemo(() => buildPages(notes, gh, land), [notes, gh, land]);
  const count = pages.length;
  const last = count - 1;

  // Measure every page while it is still laid out, then hand the pages to StPageFlip.
  useEffect(() => {
    const el = hostRef.current!;
    let pf: PageFlip | null = null;
    let alive = true;
    let opener = 0;
    (document.fonts?.ready ?? Promise.resolve()).then(() => {
      if (!alive) return;
      const items = [...el.querySelectorAll<HTMLElement>(':scope > .dy-pg')];
      const tight: number[] = [];
      items.forEach((p, i) => {
        p.querySelectorAll<HTMLElement>('.dy-in').forEach((inner) => {
          if (inner.scrollHeight > inner.clientHeight + 1) { (inner.parentElement as HTMLElement).classList.add('is-tight'); tight.push(i); }
        });
      });
      (window as unknown as { __dyTight: number[] }).__dyTight = tight;
      el.classList.remove('is-pre');
      pf = new PageFlip(el, {
        width: pw, height: ph, size: 'fixed' as never, showCover: true, usePortrait: !land, autoSize: true,
        flippingTime: 900, maxShadowOpacity: 0.42, drawShadow: true, mobileScrollSupport: true,
        disableFlipByClick: true, showPageCorners: !still, useMouseEvents: !still, startPage: still ? 1 : 0,
      });
      pf.on('flip', (e) => {
        const n = e.data as number;
        setCur(n);
        if (focusNext.current) {
          focusNext.current = false;
          requestAnimationFrame(() => el.querySelector<HTMLElement>(`.dy-pg[data-pg="${n}"] .dy-h, .dy-pg[data-pg="${n + 1}"] .dy-h`)?.focus({ preventScroll: true }));
        }
      });
      pf.on('changeState', (e) => { if (e.data !== 'read' && foldRef.current) setFold(false); });
      pf.loadFromHTML(items);
      pfRef.current = pf;
      setReady(true);
      // The authored opening: the cover swings open onto today's page.
      if (!still) opener = window.setTimeout(() => pf?.flipNext(), 650);
    });
    return () => { alive = false; clearTimeout(opener); pf?.dispose(); pfRef.current = null; };
  }, [pw, ph, land]);

  const go = useCallback((n: number, viaKeys = true) => {
    const pf = pfRef.current; if (!pf) return;
    n = Math.max(0, Math.min(last, n));
    focusNext.current = viaKeys;
    setFold(false);
    const run = () => (still ? pf.turnToPage(n) : pf.flip(n));
    if (foldRef.current && !still) window.setTimeout(run, 420); else run();
  }, [last]);
  const step = useCallback((d: 1 | -1) => {
    const pf = pfRef.current; if (!pf) return;
    focusNext.current = true;
    const doIt = () => {
      if (still) { if (d > 0) pf.turnToNextPage(); else pf.turnToPrevPage(); }
      else if (d > 0) pf.flipNext(); else pf.flipPrev();
    };
    if (foldRef.current && !still) { setFold(false); window.setTimeout(doIt, 420); } else doIt();
  }, []);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.altKey || e.metaKey || e.ctrlKey || /input|textarea|select/i.test(t.tagName)) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [step]);

  // Which pages are in view, for the folio counter and the tabs.
  const shown = land ? (cur === 0 ? [0] : cur === last ? [last] : [cur, cur + 1]) : [cur];
  const active = [...tabs].reverse().find((t) => t.page <= shown[shown.length - 1] && cur > 0)?.label;
  const atBack = cur === last;
  const s = land && fold ? Math.min(1, (vw - 56) / (3 * pw)) : 1;
  const tx = !land ? 0 : fold ? -0.5 * pw * s : cur === 0 ? -pw / 2 : atBack ? pw / 2 : 0;
  const tabsAway = land && fold;

  const flapCtl = { fold, setFold: (v: boolean) => setFold(v) };
  const tabsRef = useRef<HTMLElement>(null);
  // On a phone the tab row scrolls sideways inside itself: keep the open section's tab in view.
  useEffect(() => {
    const row = tabsRef.current; if (land || !row) return;
    const b = row.querySelector<HTMLElement>('[aria-current="page"]'); if (!b) return;
    const left = b.offsetLeft - row.offsetLeft, right = left + b.offsetWidth;
    if (left < row.scrollLeft || right > row.scrollLeft + row.clientWidth) row.scrollTo({ left: Math.max(0, left - 24), behavior: still ? 'auto' : 'smooth' });
  }, [active, land]);

  return (
    <div className={`dy-stage ${land ? 'is-land' : 'is-port'}${fold ? ' is-fold' : ''}${atBack ? ' at-back' : ''}${cur === 0 ? ' at-cover' : ''}`}
      style={{ ['--pw' as string]: pw + 'px', ['--ph' as string]: ph + 'px' }}>
      <div className="dy-bookwrap" style={{ transform: `translateX(${tx}px) scale(${s})` }}>
        <nav ref={tabsRef} className={`dy-tabs${tabsAway ? ' is-away' : ''}`} aria-label="Sections of the notebook" aria-hidden={tabsAway || undefined} inert={tabsAway || undefined}>
          {tabs.map((t) => (
            <button key={t.label} type="button" className="dy-tab" aria-current={active === t.label ? 'page' : undefined} onClick={() => go(t.page)}>{t.label}</button>
          ))}
        </nav>
        <div className="dy-book" style={{ width: land ? pw * 2 : pw, height: ph }}>
          <div ref={hostRef} className="dy-host is-pre">
            {pages.map((p, i) => (
              <section key={p.key} className={`dy-pg${p.hard ? ' dy-hard' : ''}${p.cls ? ' ' + p.cls : ''}`} data-pg={i} data-density={p.hard ? 'hard' : 'soft'} aria-label={`Page ${i + 1}: ${p.run}`}>
                <div className="dy-in">
                  {!p.hard && <p className="dy-run" aria-hidden="true">{p.run}</p>}
                  <div className="dy-body">{i === debateAt + 1 ? <Gatefold {...flapCtl} /> : p.body}</div>
                  {!p.hard && <p className="dy-folio" aria-hidden="true">{i + 1}</p>}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
      <div className="dy-ctl">
        <button type="button" className="dy-step" onClick={() => step(-1)} disabled={!ready || cur === 0}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>Turn back
        </button>
        <p className="dy-count" role="status">{shown.length === 2 ? `Pages ${shown[0] + 1} and ${shown[1] + 1} of ${count}` : `Page ${shown[0] + 1} of ${count}`}</p>
        <button type="button" className="dy-step" onClick={() => step(1)} disabled={!ready || cur >= last}>
          Turn over<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
}

/* The fold-out: the Debate right page carries a third page on its own hinge. Folded, its outside
   shows Skeptical and Up next; unfolded, the two championships stand side by side. */
function Gatefold({ fold, setFold }: { fold: boolean; setFold: (v: boolean) => void }) {
  const [a, b] = DEBATE.wins;
  const t = DEBATE.team;
  return (
    <>
      <div className="dy-win" aria-hidden={!fold || undefined} inert={!fold || undefined}>
        <Win w={a} />
      </div>
      <div className="dy-flap">
        <div className="dy-face dy-face-in" aria-hidden={!fold || undefined} inert={!fold || undefined}>
          <div className="dy-in">
            <p className="dy-run" aria-hidden="true">The fold</p>
            <div className="dy-body">
              <Win w={b} />
              <button type="button" className="dy-act" onClick={() => setFold(false)}>Fold it back</button>
            </div>
          </div>
        </div>
        <div className="dy-face dy-face-out" aria-hidden={fold || undefined} inert={fold || undefined}>
          <div className="dy-in">
            <p className="dy-run" aria-hidden="true">Debate</p>
            <div className="dy-body">
              <h3 className="dy-h3">{t.name}</h3>
              <p className="dy-role">{t.role}</p>
              <p className="dy-p">{t.line}</p>
              <p className="dy-p dy-quiet">{t.record}</p>
              <p><a className="dy-a" href={t.href}>{host(t.href)}</a></p>
              <h4 className="dy-h4">Up next</h4>
              <ul className="dy-next">
                {DEBATE.next.map((n) => <li key={n.where}><span>{n.where}</span> {n.event}</li>)}
              </ul>
              <button type="button" className="dy-act" onClick={() => setFold(true)}>Unfold the two titles</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Win({ w }: { w: (typeof DEBATE.wins)[number] }) {
  return (
    <div className="dy-wincard">
      <p className="dy-champ">{w.title}</p>
      <p className="dy-where">{w.where}</p>
      <p className="dy-event">{w.event}</p>
      <p className="dy-when">{w.when}</p>
    </div>
  );
}

function H({ children }: { children: ReactNode }) {
  return <h2 className="dy-h" tabIndex={-1}>{children}</h2>;
}

function NotePage({ n, commits, first, prev }: { n: Note; commits: GitHubData['activity']; first?: boolean; prev?: Note }) {
  const mine = commits.filter((c) => c.at.slice(0, 10) === n.date).slice(0, 4);
  return (
    <article className={`dy-note${first ? ' is-first' : ''}`}>
      <h2 className="dy-h dy-date" tabIndex={-1}><time dateTime={n.date}>{formatDate(n.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></h2>
      {n.body.map((p, i) => <p key={i} className="dy-p dy-notep">{p}</p>)}
      {mine.length > 0 && (
        <aside className="dy-margin" aria-label="Pushed to GitHub that day">
          <p className="dy-mlabel">Pushed that day</p>
          <ul>{mine.map((c) => <li key={c.href}><a className="dy-a" href={c.href}><span>{c.repo}</span> {c.message}</a></li>)}</ul>
        </aside>
      )}
      {prev && <p className="dy-over">Overleaf: {formatDate(prev.date, { weekday: 'long', day: 'numeric', month: 'long' })}</p>}
    </article>
  );
}

function buildPages(notes: Note[], gh: GitHubData, land: boolean) {
  const pages: PageDef[] = [];
  const tabs: Tab[] = [];
  const add = (p: PageDef) => { pages.push(p); return pages.length - 1; };
  const tab = (label: string, page: number) => tabs.push({ label, page });

  // Front cover.
  add({ key: 'cover', run: 'Cover', hard: true, cls: 'dy-cover', body: (
    <div className="dy-coverin">
      <p className="dy-cname">{PERSON.first}<br />{PERSON.last}</p>
      <p className="dy-ctitle">Diary</p>
      <p className="dy-cshort">{PERSON.short.join(' ')}</p>
    </div>
  ) });

  // Today: his name on the left, the newest note on the right.
  tab('Today', add({ key: 'today', run: 'Today', body: (
    <div className="dy-today">
      <h1 className="dy-name">{PERSON.name}</h1>
      <p className="dy-line">{PERSON.line}</p>
      <div className="dy-todayfoot">
        <p className="dy-big">Today</p>
        <p className="dy-p dy-quiet">{NOW.status}</p>
        <p className="dy-hint">{land ? 'Turn the right-hand corner for the day before.' : 'Swipe the page for the day before.'}</p>
      </div>
    </div>
  ) }));
  if (notes.length === 0) {
    add({ key: 'note-empty', run: 'Today', body: (
      <article className="dy-note is-first">
        <h2 className="dy-h dy-date" tabIndex={-1}><time dateTime={todayISO()}>{formatDate(todayISO(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></h2>
        <p className="dy-p dy-notep">{NOW.status}</p>
      </article>
    ) });
  } else {
    notes.forEach((n, i) => add({ key: 'note-' + n.date, run: i === 0 ? 'Today' : 'Earlier', body: <NotePage n={n} commits={gh.activity} first={i === 0} prev={notes[i + 1]} /> }));
  }
  // Sections open on a left-hand page.
  if (pages.length % 2 === 0) add({ key: 'contents', run: 'Contents', body: <Contents /> });

  add({ key: 'about-1', run: 'About', body: (<><H>About</H><p className="dy-p dy-lead">{PERSON.about[0]}</p></>) });
  add({ key: 'about-2', run: 'About', body: (<><p className="dy-p dy-lead">{PERSON.about[1]}</p><p className="dy-p dy-aside">{PERSON.aside}</p></>) });

  const debateAt = add({ key: 'debate-1', run: 'Debate', body: (
    <div className="dy-debate">
      <H>Debate</H>
      <p className="dy-big2">{debateCh.title}</p>
      <p className="dy-p">{debateCh.body}</p>
    </div>
  ) });
  tab('Debate', debateAt);
  add({ key: 'debate-2', run: 'Debate', cls: 'dy-gate', body: null });

  tab('Research', add({ key: 'research-1', run: 'Research', body: (
    <>
      <H>Research</H>
      <p className="dy-ptitle">{paper.title}</p>
      <p className="dy-meta">{paper.status}, {paper.pages} pages</p>
      <blockquote className="dy-epi"><p>{paper.epigraph.text}</p><cite>{paper.epigraph.source}</cite></blockquote>
    </>
  ) }));
  add({ key: 'research-2', run: 'Research', body: (
    <>
      <h3 className="dy-h4">Abstract</h3>
      <p className="dy-p">{paper.abstract}</p>
      <p className="dy-keys">{paper.keywords.join(', ')}</p>
      <ul className="dy-links">{paper.links.map((l) => <li key={l.label}><a className="dy-a" href={l.href}>{l.label}</a></li>)}</ul>
    </>
  ) });
  add({ key: 'research-3', run: 'Research', body: (
    <>
      <h3 className="dy-h3">Three ladders</h3>
      <ol className="dy-ladders">{paper.ladders.map((l) => <li key={l.who}><p className="dy-who">{l.who}</p><p className="dy-meta">{l.when}. {l.where}</p></li>)}</ol>
    </>
  ) });
  add({ key: 'research-4', run: 'Research', body: (
    <>
      <h3 className="dy-h3">{wess.title}</h3>
      <p className="dy-meta">{wess.status}</p>
      <p className="dy-p">{wess.abstract}</p>
    </>
  ) });

  WORK.forEach((w, i) => {
    const at = add({ key: 'work-' + w.slug, run: 'Work', cls: 'dy-workpg', body: (
      <article className="dy-work">
        <figure className="dy-print"><img src={src(w.img)} alt={`${w.name}, screenshot`} width={1200} height={750} loading={i < 2 ? 'eager' : 'lazy'} decoding="async" /></figure>
        {i === 0 ? <h2 className="dy-h dy-wname" tabIndex={-1}>{w.name}</h2> : <h3 className="dy-wname">{w.name}</h3>}
        <p className="dy-meta">{w.kind}. {w.stack}</p>
        <p className="dy-p dy-wline">{w.line}</p>
        {w.href ? <p><a className="dy-a" href={w.href}>{host(w.href)}</a></p> : <p className="dy-meta">No public link</p>}
      </article>
    ) });
    if (i === 0) tab('Work', at);
  });

  const commits = gh.activity.slice(0, 5);
  tab('GitHub', add({ key: 'gh-1', run: 'Live from GitHub', body: (
    <>
      <H>Live from GitHub</H>
      <p className="dy-big2"><a className="dy-a dy-gha" href={GITHUB.href}>{host(GITHUB.href)}</a></p>
      {commits.length > 0 ? (
        <ul className="dy-commits">{commits.map((c) => <li key={c.href}><a className="dy-a" href={c.href}>{c.message}</a><span className="dy-meta">{c.repo}, {ago(c.at)}</span></li>)}</ul>
      ) : (
        <p className="dy-p dy-quiet">His code lives here. The repositories follow.</p>
      )}
    </>
  ) }));
  add({ key: 'gh-2', run: 'Live from GitHub', body: (
    <>
      <h3 className="dy-h4">Repositories</h3>
      <ul className="dy-repos">{gh.repos.slice(0, 5).map((r) => <li key={r.name}><a className="dy-a dy-rname" href={r.href}>{r.name}</a>{r.description && <span className="dy-rdesc">{r.description}</span>}{r.language && <span className="dy-meta">{r.language}</span>}</li>)}</ul>
    </>
  ) });

  tab('Now', add({ key: 'now-1', run: 'Now', body: (
    <>
      <H>Now</H>
      <p className="dy-big2">{NOW.reading.title}</p>
      <p className="dy-p">{NOW.reading.body}</p>
      <ul className="dy-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
    </>
  ) }));
  add({ key: 'now-2', run: 'Now', body: (
    <>
      <h3 className="dy-big2">{NOW.club.title}</h3>
      <p className="dy-p">{NOW.club.body}</p>
      <p className="dy-p dy-status">{NOW.status}</p>
    </>
  ) });

  tab('Record', add({ key: 'rec-1', run: 'Record', body: (
    <>
      <H>Record</H>
      <ul className="dy-honors">{HONORS.slice(0, 5).map((h) => <li key={h.what}><span>{h.what}</span><span className="dy-meta">{h.detail}</span></li>)}</ul>
    </>
  ) }));
  add({ key: 'rec-2', run: 'Record', body: (
    <ul className="dy-honors">{HONORS.slice(5).map((h) => <li key={h.what}><span>{h.what}</span><span className="dy-meta">{h.detail}</span></li>)}</ul>
  ) });
  add({ key: 'rec-3', run: 'Record', body: (
    <>
      <h3 className="dy-h4">Two certificates</h3>
      <div className="dy-certs">{AWARDS.map((a) => (
        <a key={a.site} className="dy-cert" href={a.href}>
          <img src={src(a.img)} alt={`Certificate, ${a.site}`} width={600} height={848} loading="lazy" decoding="async" />
          <span className="dy-cs">{a.site}</span><span className="dy-meta">{a.note}</span>
        </a>
      ))}</div>
    </>
  ) });
  add({ key: 'rec-4', run: 'Record', body: (
    <ul className="dy-stats">{STATS.map((s) => <li key={s.label}><span className="dy-num">{s.to}{s.suffix}</span><span>{s.label}</span></li>)}</ul>
  ) });

  add({ key: 'off-1', run: 'Off the record', body: (
    <>
      <H>Off the record</H>
      <h3 className="dy-h4">Likes</h3>
      <ul className="dy-list">{LIKES.map((l) => <li key={l}>{l}</li>)}</ul>
    </>
  ) });
  add({ key: 'off-2', run: 'Off the record', body: (
    <>
      <h3 className="dy-h4">Dislikes</h3>
      <ul className="dy-list">{DISLIKES.map((l) => <li key={l}>{l}</li>)}</ul>
      <h3 className="dy-h4">Favourites</h3>
      <ul className="dy-list">{FAVOURITES.map((l) => <li key={l}>{l}</li>)}</ul>
    </>
  ) });
  add({ key: 'off-3', run: 'Off the record', body: (
    <>
      <h3 className="dy-h4">Courses</h3>
      <ul className="dy-courses">{COURSES.map((c) => <li key={c.title}><span className="dy-ct">{c.title}</span><span className="dy-meta">{c.provider}. {c.note}</span></li>)}</ul>
    </>
  ) });
  add({ key: 'colophon', run: 'The end paper', body: (
    <div className="dy-colo">
      <p className="dy-big2">The last page.</p>
      <p className="dy-p dy-quiet">Turn it to close the notebook. His contact details are printed on the back.</p>
    </div>
  ) });

  tab('Contact', add({ key: 'back', run: 'Back cover', hard: true, cls: 'dy-cover dy-backc', body: (
    <div className="dy-backin">
      <H>Contact</H>
      <dl className="dy-contact">
        {LINKS.map((l) => (
          <Fragment key={l.label}>
            <dt>{l.label}</dt>
            <dd>{l.href ? <a className="dy-a" href={l.href}>{l.value}</a> : l.value}</dd>
          </Fragment>
        ))}
      </dl>
      <p className="dy-draft">Draft 88 of the portfolio. Not the live site.</p>
    </div>
  ) }));

  return { pages, tabs, debateAt };
}

function Contents() {
  return (
    <div className="dy-contents">
      <h2 className="dy-h" tabIndex={-1}>Contents</h2>
      <p className="dy-p dy-quiet">The daily pages end here. After them: about, debate, research, work, GitHub, now, the record, and contact on the back cover.</p>
    </div>
  );
}
