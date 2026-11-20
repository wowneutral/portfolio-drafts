// Draft 5: the chain. His About is a chain reaction ("it took over ... that pulled me into philosophy,
// which pulled me into research"), so the page is one: a row of ivory tiles on a paper sweep, each part
// of his life knocking over the next as you scroll. Push the orange one to start it by hand.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/instrument-sans/index.css';
import './chain.css';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { ago, useGitHub } from '@/lib/github';
import { formatDate, useNotes } from '@/lib/notes';
import { scrollToY } from '@/lib/scroll';
import { useRise } from '@/lib/motion';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { FIRST, FAN_MAX, STOPS, T, chain, pushFrom } from './chain';

const Stage = lazy(() => import('./Stage'));
const BASE = import.meta.env.BASE_URL;
const PAPER = RESEARCH[0], WESSO = RESEARCH[1];

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** Without WebGL or with reduced motion: the row drawn flat, face on, in three courses. */
function Elevation() {
  const tiles = T.filter((t) => !t.small);
  const rows = [tiles.slice(0, 8), tiles.slice(8, 16), tiles.slice(16)];
  const k = 104, gap = 18;
  let y = 0, wide = 0;
  const out: React.ReactNode[] = [];
  rows.forEach((r, ri) => {
    const H = Math.max(...r.map((t) => t.h)) * k;
    let x = 0;
    r.forEach((t, j) => {
      const w = t.h * 0.5 * k, h = t.h * k;
      const fs = Math.min(w * 0.55, (h * 0.8) / Math.max(4, t.word.length * 0.52));
      out.push(
        <g key={`${ri}-${j}`} transform={`translate(${x} ${y + H - h})`}>
          <rect width={w} height={h} rx={w * 0.08} className={t.orange ? 'or' : undefined} />
          <text transform={`translate(${w / 2} ${h / 2}) rotate(-90)`} fontSize={fs}>{t.today ? 'Today' : t.word}</text>
        </g>,
      );
      x += w + gap;
    });
    wide = Math.max(wide, x);
    y += H + 36;
  });
  return (
    <svg className="elev" viewBox={`-4 -4 ${wide + 8} ${y}`} role="img" aria-label="The row of tiles, one for each part of the story, from the small orange one to Today.">
      {out}
    </svg>
  );
}

function Label({ children, id }: { children: React.ReactNode; id?: string }) {
  const inner = <><span className="mark" aria-hidden="true" />{children}</>;
  return id ? <h2 className="label" id={id}>{inner}</h2> : <p className="label">{inner}</p>;
}

export default function Chain() {
  useVersion('chain');
  const root = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(isPhone);
  const [gl] = useState(hasWebGL);
  const play = gl && !still;
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const [sel, setSel] = useState(0);
  const [open, setOpen] = useState(!play);
  useRise(root);

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // The fan: one small tile per commit, or per repo when GitHub is out of reach.
  const fanWords = useMemo(() => (gh.activity.length ? gh.activity.map((a) => a.repo) : gh.repos.map((r) => r.name)).slice(0, FAN_MAX), [gh]);
  useEffect(() => { chain.fanN = fanWords.length; }, [fanWords]);
  const latest = notes[0];
  const todayWord = latest ? formatDate(latest.date, { day: 'numeric', month: 'long' }) : 'Today';

  // Measure the stops, so the camera stands beside each section's tiles while that section is read.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const measure = () => {
      const vh = window.innerHeight, sy = window.scrollY;
      const keys: [number, number][] = [[0, 0]];
      for (let k = 1; k < STOPS.length; k++) {
        const n = el.querySelector<HTMLElement>(`[data-stop="${k}"]`); if (!n) continue;
        const r = n.getBoundingClientRect(); const top = r.top + sy;
        const a = top - vh * 0.18, b = Math.max(a + 1, top + r.height - vh * 0.82);
        keys.push([a, k], [b, k]);
      }
      const maxY = document.documentElement.scrollHeight - vh;
      keys.push([maxY + 2, STOPS.length - 1]);
      keys.sort((p, q) => p[0] - q[0]);
      for (let i = 1; i < keys.length; i++) { if (keys[i][0] <= keys[i - 1][0]) keys[i][0] = keys[i - 1][0] + 1; if (keys[i][1] < keys[i - 1][1]) keys[i][1] = keys[i - 1][1]; }
      // The last stop is reached at the very bottom.
      const last = keys.findIndex((p) => p[1] === STOPS.length - 1);
      if (last > 0) keys[last][0] = Math.min(keys[last][0], maxY);
      chain.keys = keys;
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    document.fonts.ready.then(measure);
    const tm = setTimeout(measure, 1200);
    return () => { ro.disconnect(); clearTimeout(tm); };
  }, [phone]);

  // Space pushes the first tile while the opening is on screen.
  useEffect(() => {
    if (!play) return;
    const on = (e: KeyboardEvent) => {
      if (e.key !== ' ' || window.scrollY > window.innerHeight * 0.4) return;
      const tg = e.target as HTMLElement;
      if (tg && /^(INPUT|TEXTAREA|BUTTON|A)$/.test(tg.tagName)) return;
      e.preventDefault(); pushFrom(FIRST);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [play]);

  // Today: the last tile stands until you reach it (or push it); then the note comes up.
  const todayRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!play) return;
    const onPush = () => setOpen(true);
    window.addEventListener('chain:today', onPush);
    const el = todayRef.current;
    const io = el ? new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { chain.todayDown = true; setOpen(true); } }, { threshold: 0.45 }) : null;
    if (el && io) io.observe(el);
    return () => { window.removeEventListener('chain:today', onPush); io?.disconnect(); };
  }, [play]);
  useEffect(() => () => { chain.todayDown = false; chain.push = null; }, []);

  // Work images tip into place as their tile falls.
  useEffect(() => {
    const el = root.current; if (!el || !play) return;
    const figs = el.querySelectorAll<HTMLElement>('.shot');
    figs.forEach((f) => f.classList.add('arm'));
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in'); }), { threshold: 0.25 });
    figs.forEach((f) => io.observe(f));
    return () => io.disconnect();
  }, [play]);

  const note = notes[sel] ?? latest;
  const pushToday = () => { chain.todayDown = true; setOpen(true); };

  return (
    <div className={`v-chain${phone ? ' is-phone' : ''}${play ? '' : ' flat'}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <div className="stage" aria-hidden="true">
        {play ? <Suspense fallback={null}><Stage key={phone ? 'p' : 'd'} phone={phone} fanWords={fanWords} todayWord={todayWord} /></Suspense> : <Elevation />}
      </div>

      <main id="main" className="col">
        <section className="stop hero" data-stop="0" aria-labelledby="name">
          <h1 id="name"><span>{PERSON.first}</span> <span>{PERSON.last}</span></h1>
          <p className="line">{PERSON.line}</p>
          {play && (
            <button type="button" className="push" onClick={() => pushFrom(FIRST)}>
              <span className="tip" aria-hidden="true" />Push the first one
            </button>
          )}
          {play && <p className="hint">Then scroll. Each thing knocks over the next.</p>}
        </section>

        <section className="stop about" data-stop="1" aria-label="About">
          <Label>Debate, then philosophy</Label>
          <p className="say" data-rise>{PERSON.about[0]}</p>
        </section>

        <section className="stop about" data-stop="2" aria-label="Building">
          <Label>Building</Label>
          <p className="say" data-rise>{PERSON.about[1]}</p>
          <p className="aside" data-rise>{PERSON.aside}</p>
        </section>

        <section className="stop team" data-stop="3" id="debate" aria-label="Debate team">
          <Label>{DEBATE.team.role}</Label>
          <h2 id="team" className="big">{DEBATE.team.name}</h2>
          <p className="lead">{DEBATE.team.line}</p>
          <p className="rec">{DEBATE.team.record}</p>
          <A className="go" href={DEBATE.team.href}>skeptical.pages.dev</A>
        </section>

        <section className="stop champs" data-stop="4" aria-labelledby="wins">
          <Label id="wins">Two titles this fall</Label>
          <ol className="wins">
            {DEBATE.wins.map((w) => (
              <li key={w.where}>
                <p className="title">{w.title}</p>
                <p className="event">{w.event}</p>
                <p className="where">{w.where}, {w.when}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="stop next" data-stop="5" aria-labelledby="upnext">
          <Label>Still standing</Label>
          <h2 id="upnext" className="mid">Up next</h2>
          <ul className="nexts">
            {DEBATE.next.map((n) => <li key={n.where}><span className="w">{n.where}</span><span className="e">{n.event}</span></li>)}
          </ul>
        </section>

        <section className="stop research" data-stop="6" id="research" aria-labelledby="paper">
          <Label>Research, {PAPER.status}</Label>
          <h2 id="paper" className="ptitle">{PAPER.title}</h2>
          <p className="abs">{PAPER.abstract}</p>
          <ul className="keys" aria-label="Keywords">{(PAPER.keywords ?? []).map((k) => <li key={k}>{k}</li>)}</ul>
          <ul className="plinks">{PAPER.links.map((l) => <li key={l.label}><A href={l.href}>{l.label}</A></li>)}</ul>
          <div className="wesso">
            <h3>{WESSO.title}</h3>
            <p className="st">{WESSO.status}</p>
            <p>{WESSO.abstract}</p>
          </div>
        </section>

        {WORK.map((w, k) => (
          <section key={w.slug} className="stop work" data-stop={7 + k} id={k === 0 ? 'work' : undefined} aria-labelledby={`w-${w.slug}`}>
            <Label>{w.n} of 08, {w.kind}</Label>
            <figure className="shot"><img src={BASE + w.img} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={660} /></figure>
            <h2 id={`w-${w.slug}`} className="wname">{w.href ? <A href={w.href}>{w.name}</A> : w.name}</h2>
            <p className="wline">{w.line}</p>
            <p className="stack">{w.stack}</p>
          </section>
        ))}

        <section className="stop gh" data-stop="15" aria-labelledby="ghh">
          <Label>Live from GitHub</Label>
          <h2 id="ghh" className="mid"><A href={GITHUB.href}>github.com/{GITHUB.user}</A></h2>
          {gh.activity.length > 0 && (
            <ol className="commits">
              {gh.activity.slice(0, 8).map((a) => (
                <li key={a.href}><a href={a.href} rel="noopener"><span className="msg">{a.message}</span><span className="meta">{a.repo}, {ago(a.at)}</span></a></li>
              ))}
            </ol>
          )}
          <ul className="repos">
            {gh.repos.slice(0, 8).map((r) => (
              <li key={r.name}>
                <a href={r.href} rel="noopener">
                  <span className="rn">{r.name}</span>
                  {r.description && <span className="rd">{r.description}</span>}
                  <span className="rl">{[r.language, r.pushedAt ? `pushed ${ago(r.pushedAt)}` : ''].filter(Boolean).join(', ')}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="stop now" data-stop="16" aria-labelledby="nowh">
          <Label>Now</Label>
          <h2 id="nowh" className="mid">{NOW.reading.title}</h2>
          <p className="lead">{NOW.reading.body}</p>
          <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
          <h3 className="sub">{NOW.club.title}</h3>
          <p>{NOW.club.body}</p>
          <p className="status">{NOW.status}</p>
        </section>

        <section className="stop record" data-stop="17" aria-labelledby="rech">
          <Label id="rech">The record</Label>
          <ol className="honors">{HONORS.map((h) => <li key={h.what}><span className="hw">{h.what}</span><span className="hd">{h.detail}</span></li>)}</ol>
          <div className="awards">
            {AWARDS.map((a) => (
              <a key={a.site} href={a.href} rel="noopener" className="cert">
                <img src={BASE + a.img} alt={`Certificate, ${a.site}`} loading="lazy" width={720} height={1018} />
                <span className="cs">{a.site}</span><span className="cn">{a.note}</span>
              </a>
            ))}
          </div>
        </section>

        <section className="stop else" data-stop="18" aria-labelledby="offh">
          <Label id="offh">Off the record</Label>
          <div className="off">
            <div><h3>Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider}, {c.title}.</b> {c.note}</li>)}</ul></div>
          </div>
          <h3 className="sub" id="contact">Write to him</h3>
          <ul className="links">
            {LINKS.map((l) => <li key={l.label}><span className="ll">{l.label}</span>{l.href ? <A href={l.href}>{l.value}</A> : <span className="lv">{l.value}</span>}</li>)}
          </ul>
        </section>

        <section className={`stop today${open ? ' open' : ''}`} data-stop="19" id="today" ref={todayRef} aria-labelledby="todayh">
          <Label>Today, the last tile</Label>
          <h2 id="todayh" className="date">{latest ? formatDate(latest.date) : 'Today'}</h2>
          {play && !open && latest && <button type="button" className="push" onClick={pushToday}><span className="tip" aria-hidden="true" />Push it</button>}
          {!loaded && <p className="wait">The note is on its way.</p>}
          {loaded && !latest && <p className="wait">No note yet. Check back tomorrow.</p>}
          {note && (
            <article className="note" aria-live="polite">
              {note !== latest && <p className="when">{formatDate(note.date)}</p>}
              {note.body.map((p, i) => <p key={i}>{p}</p>)}
            </article>
          )}
          {notes.length > 1 && (
            <div className="earlier">
              <p className="eh">Earlier notes</p>
              <ul>
                {notes.map((n, i) => (
                  <li key={n.date}>
                    <button type="button" className={i === sel ? 'on' : undefined} aria-pressed={i === sel} onClick={() => { setSel(i); setOpen(true); }}>
                      <span>{formatDate(n.date, { day: 'numeric', month: 'short' })}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <footer className="stop end" data-stop="20">
          <p className="fin">That is the chain so far.</p>
          {play && <button type="button" className="push" onClick={() => scrollToY(0)}><span className="tip up" aria-hidden="true" />Stand them back up</button>}
          <p className="small">Draft 5 of the portfolio. Not the live site.</p>
        </footer>
      </main>
    </div>
  );
}
