// Draft 11: the shelf. One long shelf of cloth-bound volumes, one for each part
// of his life. The page reads below the shelf; as you scroll, the camera dollies
// along the row and each section's volume tips out. Push an end one and they lean.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/index.css';
import '@fontsource-variable/hanken-grotesk/index.css';
import './shelf.css';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, STATS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { useVersion } from '@/lib/version';
import { gsap, scrollToId } from '@/lib/scroll';
import { clamp, still } from '@/lib/utils';
import { layout, pushRow, st, type Book } from './books';

const Scene = lazy(() => import('./Scene'));
const BASE = import.meta.env.BASE_URL;
const PAPER = RESEARCH[0] as (typeof RESEARCH)[0] & { epigraph: { text: string; source: string }; keywords: string[]; pages: number; doi: string };
const PRAYER = RESEARCH[1];
const ext = (href: string) => (href.startsWith('http') ? { target: '_blank', rel: 'noopener' } : {});

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const readOffset = () => -Math.round((window.innerWidth < 760 ? 0.4 : 0.38) * window.innerHeight + 28);
const go = (id: string) => scrollToId(id, readOffset());

/** Ties the page to the shelf: which volume is open, where the camera looks, how far the band has risen. */
function useShelfTicker(books: Book[]) {
  useEffect(() => {
    const xOf = (ids: string[]) => {
      const hit = books.filter((b) => ids.includes(b.id));
      return hit.length ? hit.reduce((s, b) => s + b.x, 0) / hit.length : 0;
    };
    const expand = (id: string) => (id === 'now' ? ['now-0', 'now', 'now-2'] : id === 'next' ? ['next', 'skeptical'] : [id]);
    const tick = () => {
      const band = document.querySelector('.v-shelf .band') as HTMLElement | null;
      const vh = window.innerHeight;
      const br = band?.getBoundingClientRect();
      st.stuck = br ? clamp(-br.top / br.height, 0, 0.6) : 0;
      const line = (br ? br.bottom : 0) + (vh - (br ? br.bottom : 0)) * 0.3;
      const els = Array.from(document.querySelectorAll<HTMLElement>('.v-shelf [data-book]'));
      let i = -1;
      const tops = els.map((e) => e.getBoundingClientRect().top);
      for (let k = 0; k < els.length; k++) if (tops[k] <= line) i = k;
      const id = (k: number) => els[k].dataset.book!;
      if (i < 0) { st.active = []; st.focus = xOf(['about']); }
      else {
        st.active = expand(id(i));
        const x0 = xOf(expand(id(i)));
        if (i < els.length - 1) {
          const f = clamp((line - tops[i]) / Math.max(1, tops[i + 1] - tops[i]));
          const e = f < 0.55 ? 0 : (f - 0.55) / 0.45;
          st.focus = x0 + (xOf(expand(id(i + 1))) - x0) * e * e * (3 - 2 * e);
        } else st.focus = x0;
      }
      const end = document.getElementById('end');
      if (end) { const r = end.getBoundingClientRect(); st.pull = clamp((line - r.top) / (r.height * 0.55)); if (st.pull > 0) st.active = []; }
    };
    gsap.ticker.add(tick);
    tick();
    return () => gsap.ticker.remove(tick);
  }, [books]);
}

function Today() {
  const { notes, loaded } = useNotes();
  const [open, setOpen] = useState(false);
  const y0 = useRef<number | null>(null);
  const latest = notes[0];
  useEffect(() => { st.sheet = open; }, [open]);
  useEffect(() => () => { st.sheet = false; }, []);
  return (
    <section id="today" data-book="today" className="today" aria-labelledby="today-h">
      <h2 id="today-h" className="sec-h">Today</h2>
      {!loaded ? (
        <div className="sheet is-wait"><p className="sheet-date">Fetching the sheet</p><p className="sheet-body">The note for today is on its way from the shelf.</p></div>
      ) : !latest ? (
        <div className="sheet"><p className="sheet-date">No sheet yet</p><p className="sheet-body">Nothing tucked in today. Check back tomorrow.</p></div>
      ) : (
        <div
          className={'sheet' + (open ? ' is-open' : '')}
          onPointerDown={(e) => { if (!open) y0.current = e.clientY; }}
          onPointerMove={(e) => {
            if (y0.current === null) return;
            const dy = Math.min(0, e.clientY - y0.current);
            const el = e.currentTarget as HTMLElement;
            el.classList.add('is-drag'); el.style.setProperty('--lift', Math.max(dy, -60) + 'px');
            if (dy < -48) { y0.current = null; el.classList.remove('is-drag'); el.style.removeProperty('--lift'); setOpen(true); }
          }}
          onPointerUp={(e) => { y0.current = null; const el = e.currentTarget as HTMLElement; el.classList.remove('is-drag'); el.style.removeProperty('--lift'); }}
          onPointerCancel={(e) => { y0.current = null; const el = e.currentTarget as HTMLElement; el.classList.remove('is-drag'); el.style.removeProperty('--lift'); }}
        >
          <p className="sheet-tab"><time dateTime={latest.date}>{formatDate(latest.date)}</time></p>
          <div className="sheet-body" id="today-body">
            {(open ? latest.body : latest.body.slice(0, 1)).map((p, i) => <p key={i}>{p}</p>)}
          </div>
          {latest.body.length > 1 || !open ? (
            <button type="button" className="sheet-btn" aria-expanded={open} aria-controls="today-body" onClick={() => setOpen((o) => !o)}>
              {open ? 'Tuck it back in' : 'Draw the sheet out'}
            </button>
          ) : null}
        </div>
      )}
      {notes.length > 1 && (
        <div className="slips">
          <h3 className="slips-h">Earlier slips</h3>
          <ol>
            {notes.slice(1, 12).map((n) => (
              <li key={n.date}><time dateTime={n.date}>{formatDate(n.date, { day: 'numeric', month: 'short' })}</time><p>{n.body.join(' ')}</p></li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function GitHub({ repo, setRepo }: { repo: string; setRepo: (r: string) => void }) {
  const gh = useGitHub();
  const repos = gh.repos.slice(0, 6);
  return (
    <section id="github" data-book="github" className="github" aria-labelledby="gh-h">
      <h2 id="gh-h" className="sec-h">Live from GitHub</h2>
      <p className="gh-line">
        {gh.live && gh.commitsThisMonth !== null ? `${gh.commitsThisMonth} commits this month, as the notebooks on the end of the shelf.` : 'The notebooks on the end of the shelf, one for each repository.'}
      </p>
      <ol className="nbs">
        {repos.map((r) => {
          const commits = gh.activity.filter((a) => a.repo === r.name);
          const isOpen = repo === r.name && commits.length > 0;
          return (
            <li key={r.name} className={'nb' + (isOpen ? ' is-open' : '')}>
              <div className="nb-head">
                <h3 className="nb-name">{r.name}</h3>
                <p className="nb-meta">{[r.language, r.pushedAt ? 'pushed ' + ago(r.pushedAt) : null].filter(Boolean).join(', ')}</p>
              </div>
              {r.description && <p className="nb-desc">{r.description}</p>}
              <p className="nb-acts">
                {commits.length > 0 && (
                  <button type="button" className="nb-btn" aria-expanded={isOpen} onClick={() => setRepo(isOpen ? '' : r.name)}>
                    {isOpen ? 'Close the notebook' : `Open it: ${commits.length} recent ${commits.length === 1 ? 'commit' : 'commits'}`}
                  </button>
                )}
                <a href={r.href} {...ext(r.href)}>The repository</a>
              </p>
              {isOpen && (
                <ul className="commits">
                  {commits.map((c, i) => (
                    <li key={i}><a href={c.href} {...ext(c.href)}>{c.message}</a><span>{ago(c.at)}</span></li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      <p className="gh-all"><a href={GITHUB.href} {...ext(GITHUB.href)}>Everything on GitHub, as {GITHUB.user}</a></p>
    </section>
  );
}

export default function Shelf() {
  useVersion('shelf', { anchorOffset: readOffset() });
  const gh = useGitHub();
  const { notes } = useNotes();
  const [webgl] = useState(hasWebGL);
  const [repo, setRepoState] = useState('');
  const drag = useRef<{ x: number; y: number } | null>(null);
  const books = useMemo(() => layout(gh.repos, gh.activity), [gh.repos, gh.activity]);
  useShelfTicker(books);
  const setRepo = (r: string) => { st.repo = r; setRepoState(r); };
  useEffect(() => {
    // Open the busiest notebook by default, so the live block reads as live.
    if (!repo && gh.activity.length) setRepo(gh.activity[0].repo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gh.activity]);
  const sheetDate = notes[0] ? formatDate(notes[0].date, { day: 'numeric', month: 'short' }) : '';

  const onPick = (b: Book) => {
    if (b.repo) { setRepo(b.repo); go('github'); return; }
    if (b.id === 'about') pushRow(1);
    if (b.id === 'contact') pushRow(-1);
    go(b.id.startsWith('now') ? 'now' : b.id);
  };

  return (
    <div className="v-shelf">
      <a className="skip-x" href="#main">Skip to the reading</a>
      <header className="top">
        <h1 className="name">{PERSON.name}</h1>
        <div className="top-r">
          <p className="line">{PERSON.line}</p>
          <p className="hint">
            {webgl ? <>Press a spine to open it, drag along the row, or <button type="button" className="push" onClick={() => pushRow(1)}>push the row</button>.</> : 'One volume for each part of it, below.'}
          </p>
        </div>
      </header>

      {webgl && (
        <div
          className="band" aria-hidden="true" data-gl
          onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY }; }}
          onPointerUp={(e) => {
            const d = drag.current; drag.current = null;
            if (d && Math.abs(e.clientX - d.x) > 60 && Math.abs(e.clientY - d.y) < 50) pushRow(e.clientX > d.x ? 1 : -1);
          }}
        >
          <Suspense fallback={null}><Scene books={books} onPick={onPick} sheetDate={sheetDate} /></Suspense>
        </div>
      )}

      <main id="main" className="read">
        <nav className="spines" aria-label="Volumes">
          <ol>
            {[['about', 'About'], ['debate', 'Debate'], ['research', 'Research'], ['work', 'Work'], ['today', 'Today'], ['now', 'Now'], ['record', 'Record'], ['github', 'GitHub'], ['contact', 'Contact']].map(([id, t]) => (
              <li key={id}><a href={'#' + id}>{t}</a></li>
            ))}
          </ol>
        </nav>

        <section id="about" data-book="about" className="about" aria-labelledby="about-h">
          <h2 id="about-h" className="sec-h">About</h2>
          <div className="about-body">
            {PERSON.about.map((p, i) => <p key={i} className={i === 0 ? 'lede' : ''}>{p}</p>)}
            <p className="aside">{PERSON.aside}</p>
          </div>
        </section>

        <section id="debate" className="debate" aria-labelledby="debate-h">
          <h2 id="debate-h" className="sec-h">Debate</h2>
          <div className="wins">
            {DEBATE.wins.map((w, i) => (
              <article key={w.where} id={i === 0 ? 'fbk' : 'wildcat'} data-book={i === 0 ? 'fbk' : 'wildcat'} className="win">
                <p className="win-t">{w.title}</p>
                <p className="win-e">{w.event}</p>
                <p className="win-w">{w.where}</p>
                <p className="win-y">{w.when}</p>
              </article>
            ))}
          </div>
          <div id="next" data-book="next" className="next">
            <h3 className="next-h">Up next</h3>
            <ol>
              {DEBATE.next.map((n) => <li key={n.where}><span className="next-w">{n.where}</span><span className="next-e">{n.event}</span></li>)}
            </ol>
          </div>
          <article id="skeptical" data-book="skeptical" className="team">
            <h3 className="team-n">{DEBATE.team.name}</h3>
            <p className="team-r">{DEBATE.team.role}</p>
            <p className="team-l">{DEBATE.team.line}</p>
            <p className="team-rec">{DEBATE.team.record}</p>
            <p className="team-go"><a href={DEBATE.team.href} {...ext(DEBATE.team.href)}>skeptical.pages.dev</a></p>
          </article>
        </section>

        <section id="research" data-book="research" className="research" aria-labelledby="research-h">
          <h2 id="research-h" className="sec-h">Research</h2>
          <div className="title-page">
            <p className="tp-status">{PAPER.status}, {PAPER.pages} pages</p>
            <h3 className="tp-title">{PAPER.title}</h3>
            <p className="tp-by">{PERSON.name}</p>
            <blockquote className="tp-epi"><p>{PAPER.epigraph.text}</p><footer>{PAPER.epigraph.source}</footer></blockquote>
            <p className="tp-abs">{PAPER.abstract}</p>
            <p className="tp-kw"><span className="tp-kwh">Keywords</span> {PAPER.keywords.join(', ')}</p>
            <ul className="tp-links">
              {PAPER.links.map((l) => <li key={l.label}><a href={l.href} {...ext(l.href)}>{l.label}</a></li>)}
            </ul>
            <p className="tp-doi">DOI {PAPER.doi}</p>
          </div>
          <article id="wessobrunn" data-book="wessobrunn" className="prayer">
            <h3 className="pr-t">{PRAYER.title}</h3>
            <p className="pr-s">{PRAYER.status}</p>
            <p className="pr-a">{PRAYER.abstract}</p>
          </article>
        </section>

        <section id="work" className="work" aria-labelledby="work-h">
          <h2 id="work-h" className="sec-h">Work</h2>
          {WORK.map((p, i) => (
            <article key={p.slug} id={'w-' + p.slug} data-book={'w-' + p.slug} className={'plate' + (i % 2 ? ' is-r' : '')}>
              <figure className="plate-img">
                <img src={BASE + p.img} alt={`The ${p.name} site`} loading={i < 2 ? 'eager' : 'lazy'} width={1200} height={750} />
              </figure>
              <div className="plate-txt">
                <p className="plate-k">{p.kind}</p>
                <h3 className="plate-n">{p.name}</h3>
                <p className="plate-l">{p.line}</p>
                <p className="plate-s">{p.stack}</p>
                {p.href ? <p className="plate-go"><a href={p.href} {...ext(p.href)}>Open {p.name}</a></p> : <p className="plate-go is-off">No public link</p>}
              </div>
            </article>
          ))}
        </section>

        <Today />

        <section id="now" data-book="now" className="now" aria-labelledby="now-h">
          <h2 id="now-h" className="sec-h">Now</h2>
          <div className="now-grid">
            <div className="now-read">
              <h3 className="now-t">{NOW.reading.title}</h3>
              <p>{NOW.reading.body}</p>
              <ul className="ends">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div className="now-club">
              <h3 className="now-t">{NOW.club.title}</h3>
              <p>{NOW.club.body}</p>
              <p className="now-status">{NOW.status}</p>
            </div>
          </div>
        </section>

        <section id="record" data-book="record" className="record" aria-labelledby="record-h">
          <h2 id="record-h" className="sec-h">Record</h2>
          <ol className="contents">
            {HONORS.map((h) => <li key={h.what}><span className="c-what">{h.what}</span><span className="c-dots" aria-hidden="true" /><span className="c-det">{h.detail}</span></li>)}
          </ol>
          <ul className="stats">
            {STATS.map((s) => <li key={s.label}><span className="st-n">{s.to}{s.suffix}</span><span className="st-l">{s.label}</span></li>)}
          </ul>
          <div className="awards">
            {AWARDS.map((a) => (
              <a key={a.site} className="award" href={a.href} {...ext(a.href)}>
                <img src={BASE + a.img} alt={`WD Awards certificate for ${a.site}`} loading="lazy" width={600} height={850} />
                <span className="aw-s">{a.site}</span>
                <span className="aw-n">{a.note}</span>
              </a>
            ))}
          </div>
        </section>

        <section id="off" data-book="off" className="off" aria-labelledby="off-h">
          <h2 id="off-h" className="sec-h">Off the record</h2>
          <div className="off-grid">
            <div><h3>Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider} {c.title}</b> {c.note}</li>)}</ul></div>
          </div>
        </section>

        <GitHub repo={repo} setRepo={setRepo} />

        <section id="contact" data-book="contact" className="contact" aria-labelledby="contact-h">
          <h2 id="contact-h" className="sec-h">Contact</h2>
          <dl className="colophon">
            {LINKS.map((l) => (
              <div key={l.label}><dt>{l.label}</dt><dd>{l.href ? <a href={l.href} {...ext(l.href)}>{l.value}</a> : l.value}</dd></div>
            ))}
          </dl>
        </section>

        <section id="end" className="end" aria-label="The whole shelf">
          <p className="end-w">{PERSON.short.map((s) => <span key={s}>{s}</span>)}</p>
          {webgl && !still && <p className="end-p"><button type="button" className="push" onClick={() => pushRow(-1)}>Push the end one</button></p>}
        </section>
      </main>
      <footer className="foot">
        <p>Draft 11 of the portfolio. Not the live site.</p>
        <p>Set in Bodoni Moda and Hanken Grotesk.</p>
      </footer>
    </div>
  );
}
