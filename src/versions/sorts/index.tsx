// Draft 17: the sorts. His name, his titles, the paper and the day are set by
// hand from metal type on proof paper, and each line prints, right-reading,
// in blue beside the backwards sorts. Everything else is pulled from the same
// press: headings arrive inked.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/index.css';
import '@fontsource-variable/instrument-sans/index.css';
import './sorts.css';
import { PERSON, CHAPTERS, DEBATE, RESEARCH, WORK, HONORS, AWARDS, STATS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { cn, isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { castable } from './geo';

const Case = lazy(() => import('./Case'));
const BASE = import.meta.env.BASE_URL;
const PAPER = RESEARCH[0] as (typeof RESEARCH)[0] & { epigraph: { text: string; source: string }; ladders: { who: string; when: string; where: string }[]; keywords: string[]; pages: number }, WESSO = RESEARCH[1];
const debate = CHAPTERS.find((c) => c.id === 'debate')!;
const builds = CHAPTERS.find((c) => c.id === 'builds')!;

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
const FLAT = still || !hasWebGL();

const Ext = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

/** A right-reading impression of a set line. Letters whose sort is out of the stick do not print. */
function Print({ lines, mask, off = 0, as: Tag = 'p', className, sr, onPress }: { lines: string[]; mask: boolean[] | null; off?: number; as?: 'h1' | 'p' | 'div'; className?: string; sr: string; onPress?: (k: number) => void }) {
  let k = off;
  return (
    <Tag className={cn('print', className)}>
      <span className="sr-only-x">{sr}</span>
      <span aria-hidden="true" className="print-lines">
        {lines.map((line, li) => (
          <span className="print-line" key={li}>
            {line.split('').map((c, i) => {
              const on = !mask || mask[k] !== false, at = k; k++;
              return c === ' ' ? <span key={i} className="sp"> </span> : <span key={i} className={on ? 'ch on' : 'ch gap'} onClick={onPress ? () => onPress(at) : undefined}>{c}</span>;
            })}
          </span>
        ))}
      </span>
    </Tag>
  );
}

/** One composing stick: a scene that mounts near the viewport and sets its line when it is in view. */
function useStick(lines: string[], empty = false) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [seen, setSeen] = useState(false);
  const [go, setGo] = useState(false);
  // The opening starts unprinted and inks in as each sort lands; the set-pieces start printed.
  const [mask, setMask] = useState<boolean[] | null>(() => (empty && !FLAT ? lines.join('').split('').map(() => false) : null));
  const late = useRef(false), whole = useRef(false);
  const [isSet, setSet] = useState(!empty);
  const onMask = useCallback((m: boolean[]) => {
    if (m.every(Boolean)) { whole.current = true; setSet(true); }
    else if (late.current && !whole.current) return; // a slow machine: keep the full print until the line is set
    setMask(m);
  }, []);
  useEffect(() => {
    if (!empty) return;
    const t = setTimeout(() => { late.current = true; if (!whole.current) setMask(null); }, 9000);
    return () => clearTimeout(t);
  }, [empty]);
  const [reset, setReset] = useState(0);
  const [poke, setPoke] = useState<{ i: number; n: number } | undefined>();
  const [failed, setFailed] = useState(FLAT);
  useEffect(() => {
    const el = ref.current;
    if (!el || failed) return;
    const a = new IntersectionObserver(([e]) => { setNear(e.isIntersecting); if (e.isIntersecting) setSeen(true); }, { rootMargin: '70% 0px' });
    const b = new IntersectionObserver(([e]) => { if (e.isIntersecting) setGo(true); }, { threshold: 0.4 });
    a.observe(el); b.observe(el);
    return () => { a.disconnect(); b.disconnect(); };
  }, [failed]);
  const onFail = useCallback(() => { setFailed(true); setMask(null); }, []);
  const missing = isSet && mask ? mask.some((m, i) => !m && lines.join('')[i] !== ' ') : false;
  const scene = (spin = 0) => (
    <div className="stage" ref={ref} aria-hidden="true">
      {seen && !failed && (
        <Suspense fallback={null}>
          <Case key={lines.join('|')} poke={poke} active={near} lines={lines} go={go} reset={reset} onMask={onMask} onFail={onFail} spin={spin} empty={empty} />
        </Suspense>
      )}
    </div>
  );
  const press = failed ? undefined : (i: number) => setPoke((p) => ({ i, n: (p?.n ?? 0) + 1 }));
  return { scene, mask: failed ? null : mask, missing, live: !failed, press, again: () => setReset((r) => r + 1) };
}

/** Headings pulled from the press: a short inked arrival when they enter the view. */
function usePress(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el || still) return;
    el.classList.add('js');
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    el.querySelectorAll('[data-press], [data-beats]').forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [root]);
}

const NAME = ['ARMAAN', 'SETH'];
const CHAMP = ['CHAMPION', 'CHAMPION'];
const TITLE = ['NOT IN', 'MAUTHNER’S', 'SENSE'];

export default function Sorts() {
  useVersion('sorts');
  const root = useRef<HTMLDivElement>(null);
  usePress(root);
  const [phone, setPhone] = useState(isPhone);
  useEffect(() => { const on = () => setPhone(isPhone()); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on); }, []);
  const { notes, loaded } = useNotes();
  const gh = useGitHub();
  const [open, setOpen] = useState<string | null>(null);

  const latest = notes[0];
  const dayLine = useMemo(() => [castable(latest ? formatDate(latest.date, { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'TODAY')], [latest]);
  const repoName = gh.activity[0]?.repo ?? gh.repos[0]?.name ?? GITHUB.user;
  const repoLine = useMemo(() => [castable(repoName).slice(0, phone ? 10 : 18)], [repoName, phone]);

  const name = useStick(NAME, true);
  const champ = useStick(CHAMP);
  const title = useStick(TITLE);
  const day = useStick(dayLine);
  const repo = useStick(repoLine);

  return (
    <div className="v-sorts" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <svg className="defs" aria-hidden="true" focusable="false" width="0" height="0">
        <filter id="sorts-ink"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" /><feDisplacementMap in="SourceGraphic" scale="3.2" /></filter>
      </svg>

      <header className="open">
        {name.scene(4)}
        <div className="open-proof">
          <p className="kick">Draft 17, a proof</p>
          <Print as="h1" lines={NAME} mask={name.mask} onPress={name.press} sr={PERSON.name} className="name" />
          <p className="open-line">{PERSON.line}</p>
          {name.live && (
            <p className="hint">
              Pick up a letter. Drop it back in the line.
              {name.missing && <button type="button" className="again" onClick={name.again}>Set it again</button>}
            </p>
          )}
        </div>
      </header>

      <main id="main">
        <section className="about" aria-labelledby="h-about">
          <h2 className="label" id="h-about" data-press>About</h2>
          <p className="shorts" data-press>{PERSON.short.join(' ')}</p>
          <div className="about-cols">
            {PERSON.about.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <p className="aside">{PERSON.aside}</p>
        </section>

        <section className="debate" aria-labelledby="h-debate">
          <div className="sec-head">
            <p className="label">Debate</p>
            <h2 id="h-debate" className="big" data-press>{debate.title}</h2>
          </div>
          <div className="stick-row">
            {champ.scene(-6)}
            <div className="wins">
              {DEBATE.wins.map((w, i) => (
                <article className="win" key={w.where}>
                  <Print lines={[CHAMP[i]]} mask={champ.mask} onPress={champ.press} off={i * 8} sr={w.title} className="champ" />
                  <h3 className="where">{w.where}</h3>
                  <p className="event">{w.event}, {w.when}</p>
                </article>
              ))}
            </div>
          </div>
          <div className="team">
            <div className="team-name">
              <p className="label">{DEBATE.team.role}</p>
              <h3 data-press>{DEBATE.team.name}</h3>
            </div>
            <div className="team-body">
              <p className="lead">{DEBATE.team.line}</p>
              <p>{DEBATE.team.record}</p>
              <p className="links-row">
                <Ext className="go" href={DEBATE.team.href}>skeptical.pages.dev</Ext>
                <Ext className="go" href={DEBATE.team.github}>The code on GitHub</Ext>
              </p>
            </div>
          </div>
          <div className="next">
            <h3 className="label">Up next</h3>
            <ul>
              {DEBATE.next.map((n) => <li key={n.where}><span className="next-where">{n.where}</span><span className="next-event">{n.event}</span></li>)}
            </ul>
          </div>
        </section>

        <section className="research" aria-labelledby="h-research">
          <div className="sec-head">
            <p className="label">Research</p>
            <p className="status">{PAPER.status}, {PAPER.pages} pages</p>
          </div>
          <div className="stick-row title-row">
            {title.scene(7)}
            <Print lines={TITLE} mask={title.mask} onPress={title.press} sr={PAPER.short} className="short" />
          </div>
          <div className="paper">
            <h2 id="h-research" className="paper-title" data-press>{PAPER.title}</h2>
            <p className="abstract">{PAPER.abstract}</p>
            <blockquote className="epi"><p>{PAPER.epigraph.text}</p><cite>{PAPER.epigraph.source}</cite></blockquote>
            <ol className="ladders" aria-label="The three ladders">
              {PAPER.ladders.map((l) => <li key={l.who}><span className="who">{l.who}</span><span className="when">{l.when}</span><span className="pass">{l.where}</span></li>)}
            </ol>
            <p className="keys"><span className="label">Keywords</span> {PAPER.keywords.join(' · ')}</p>
            <ul className="read">
              {PAPER.links.map((l) => <li key={l.label}><Ext href={l.href}>{l.label}</Ext></li>)}
            </ul>
            <p className="doi">DOI {PAPER.doi}</p>
          </div>
          <div className="wesso">
            <h3 data-press>{WESSO.title}</h3>
            <p>{WESSO.abstract}</p>
            <p className="status">{WESSO.status}</p>
          </div>
        </section>

        <section className="work" aria-labelledby="h-work">
          <div className="sec-head">
            <p className="label">Work</p>
            <h2 id="h-work" className="big" data-press>{builds.title}</h2>
            <p className="sec-line">{builds.body}</p>
          </div>
          <ol className="proofs">
            {WORK.map((w, i) => (
              <li key={w.slug} className={cn('proof', i % 2 ? 'r' : 'l')}>
                <figure className="pull">
                  <img src={BASE + w.img} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={750} />
                </figure>
                <div className="proof-text">
                  <p className="num" aria-hidden="true">{w.n}</p>
                  <p className="label">{w.kind}</p>
                  <h3 data-press>{w.name}</h3>
                  <p>{w.line}</p>
                  <p className="stack">{w.stack}</p>
                  {w.href ? <Ext className="go" href={w.href}>Open {w.href.replace(/^https:\/\//, '').replace(/\/$/, '')}</Ext> : <p className="nolink">No public link</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="github" aria-labelledby="h-gh" data-beats>
          <div className="sec-head">
            <p className="label">Live from GitHub</p>
            <h2 id="h-gh" className="big" data-press>{gh.activity.length ? 'Latest pushes' : 'On the bench'}</h2>
          </div>
          <div className="stick-row small-row">
            {repo.scene(-4)}
            <div>
              <Print lines={repoLine} mask={repo.mask} onPress={repo.press} sr={repoName} className="repo-print" />
              <p className="sec-line">{gh.activity.length ? 'Set from the newest commit.' : 'Recently pushed repositories.'}</p>
            </div>
          </div>
          {gh.activity.length > 0 && (
            <ol className="commits">
              {gh.activity.slice(0, 8).map((c, i) => (
                <li key={c.href + i} className="beat" style={{ animationDelay: `${i * 140}ms` }}>
                  <a href={c.href} rel="noopener"><span className="msg">{c.message}</span><span className="meta">{c.repo}, {ago(c.at)}</span></a>
                </li>
              ))}
            </ol>
          )}
          <ul className="repos">
            {gh.repos.slice(0, 8).map((r, i) => (
              <li key={r.name} className="beat" style={{ animationDelay: `${i * 120}ms` }}>
                <a href={r.href} rel="noopener">
                  <span className="repo-name">{r.name}</span>
                  <span className="repo-desc">{r.description ?? 'No description yet.'}</span>
                  <span className="meta">{[r.language, r.pushedAt ? ago(r.pushedAt) : null].filter(Boolean).join(', ')}</span>
                </a>
              </li>
            ))}
          </ul>
          <Ext className="go" href={GITHUB.href}>github.com/{GITHUB.user}</Ext>
        </section>

        <section className="today" aria-labelledby="h-today">
          <div className="sec-head">
            <p className="label">Today</p>
            <p className="sec-line">A note, set fresh each day.</p>
          </div>
          <div className="stick-row">
            {day.scene(5)}
            <div>
              <Print lines={dayLine} mask={day.mask} onPress={day.press} sr={latest ? formatDate(latest.date) : 'Today'} className="day-print" />
              <h2 id="h-today" className="day-long">{latest ? formatDate(latest.date) : loaded ? 'No note yet today' : 'Setting today’s note'}</h2>
            </div>
          </div>
          <div className="note">
            {latest ? latest.body.map((p, i) => <p key={i}>{p}</p>) : <p className="muted">{loaded ? 'The next note goes up here.' : 'Inking the line.'}</p>}
          </div>
          {notes.length > 1 && (
            <div className="earlier">
              <h3 className="label">Earlier prints</h3>
              <ul>
                {notes.slice(1).map((n, i) => {
                  const isOpen = open === n.date;
                  return (
                    <li key={n.date} className={cn('sheet', isOpen && 'is-open')} style={{ ['--r' as string]: `${(i % 2 ? 0.5 : -0.4)}deg` }}>
                      <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : n.date)}>
                        <span className="sheet-date">{formatDate(n.date)}</span>
                        <span className="sheet-first">{isOpen ? 'Close' : n.body[0].split(' ').slice(0, 8).join(' ') + '…'}</span>
                      </button>
                      {isOpen && <div className="sheet-body">{n.body.map((p, k) => <p key={k}>{p}</p>)}</div>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        <section className="now" aria-labelledby="h-now">
          <div className="sec-head"><p className="label">Now</p><h2 id="h-now" className="big" data-press>{NOW.reading.title}</h2></div>
          <div className="now-grid">
            <div className="shelves">
              <p>{NOW.reading.body}</p>
              <ul>{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div className="club">
              <h3 data-press>{NOW.club.title}</h3>
              <p>{NOW.club.body}</p>
            </div>
            <p className="status-line">{NOW.status}</p>
          </div>
        </section>

        <section className="record" aria-labelledby="h-record">
          <div className="sec-head"><p className="label">Record</p><h2 id="h-record" className="big" data-press>The record</h2></div>
          <ul className="stats">
            {STATS.map((s) => <li key={s.label}><span className="stat-n">{s.to}{s.suffix}</span><span className="stat-l">{s.label}</span></li>)}
          </ul>
          <ol className="honors">
            {HONORS.map((h) => <li key={h.what}><span className="h-what">{h.what}</span><span className="dots" aria-hidden="true" /><span className="h-detail">{h.detail}</span></li>)}
          </ol>
          <div className="awards">
            {AWARDS.map((a) => (
              <a key={a.site} className="award" href={a.href} rel="noopener">
                <img src={BASE + a.img} alt={`Certificate: ${a.site}, ${a.note}`} loading="lazy" />
                <span className="award-site">{a.site}</span>
                <span className="meta">{a.note}</span>
              </a>
            ))}
          </div>
        </section>

        <section className="off" aria-labelledby="h-off">
          <h2 id="h-off" className="label">Off the record</h2>
          <div className="off-grid">
            <div><h3>Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider}, {c.title}.</strong> {c.note}</li>)}</ul></div>
          </div>
        </section>

        <section className="contact" aria-labelledby="h-contact">
          <h2 id="h-contact" className="big" data-press>Write to me</h2>
          <ul>
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="label">{l.label}</span>
                {l.href ? <Ext className="c-val" href={l.href}>{l.value}</Ext> : <span className="c-val">{l.value}</span>}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="colophon">
        <p className="mark" aria-hidden="true">?</p>
        <p>Set in Bodoni Moda and Instrument Sans. The sorts are cast from Bodoni Moda Black.</p>
        <p>Draft 17 of the portfolio. Not the live site.</p>
      </footer>
    </div>
  );
}
