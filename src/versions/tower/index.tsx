// Draft 93: the tower. His record as a tower of heavy black type on a grey paper sweep, the two
// championships on top in red. Knock a line out and the tower rebuilds itself; the scroll walks
// the camera round and down it, one stop per section, while the copy sits still in its own column.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource/anton/400.css';
import '@fontsource-variable/schibsted-grotesk';
import './tower.css';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, STATS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { gsap, scroll } from '@/lib/scroll';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { LINES, CAP, NAME } from './geo';
import { stage } from './stage';

const Scene = lazy(() => import('./Scene'));
const BASE = import.meta.env.BASE_URL;
const STOP_IDS = ['hero', 'about', 'debate', 'research', 'w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'today', 'github', 'now', 'record', 'off', 'contact'];

const A = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** The tower drawn flat: the ten honours as stacked black type, the top two in red. */
function FlatTower() {
  const W = Math.max(...LINES.slice(0, 20).map((l) => l.w));
  const lead = 0.1 * CAP, gap = 0.24 * CAP;
  let y = CAP;
  const rows = HONORS.map((_, h) => {
    const a = LINES[h * 2], b = LINES[h * 2 + 1];
    const y1 = y, y2 = y + CAP + lead;
    y = y2 + CAP + gap;
    return (
      <g key={h} className={h < 2 ? 'red' : undefined}>
        <path d={a.d} transform={`translate(${(W - a.w) / 2} ${y1})`} />
        <path d={b.d} transform={`translate(${(W - b.w) / 2} ${y2})`} />
      </g>
    );
  });
  return (
    <svg className="flat-tower" viewBox={`-40 -20 ${W + 80} ${y + 40}`} role="img" aria-label="His record as a tower of type, the two championships on top">
      {rows}
    </svg>
  );
}

/** His name in Anton, drawn from the same outlines as the bars, so the two lines can sit tight. */
function NameType() {
  const [a, b] = NAME;
  const W = Math.max(a.w, b.w), lh = CAP * 1.1;
  return (
    <svg viewBox={`0 ${-CAP - 6} ${W} ${lh + CAP + 12}`} aria-hidden="true" focusable="false">
      <path d={a.d} />
      <path d={b.d} transform={`translate(0 ${lh})`} />
    </svg>
  );
}

export default function Tower() {
  useVersion('tower');
  const root = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  const flat = still || !webgl;
  const { notes, loaded } = useNotes();
  const gh = useGitHub();
  stage.phone = phone;

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // The commit tower: one initial per recent commit, or per repo while GitHub is quiet.
  useEffect(() => {
    const src = gh.activity.length ? gh.activity.map((a) => a.repo) : gh.repos.map((r) => r.name);
    stage.bits = src.slice(0, 30);
    stage.invalidate?.();
  }, [gh]);

  // Measure where each stop starts, so the camera knows when to hold and when to travel.
  useEffect(() => {
    const el = root.current; if (!el || flat) return;
    const measure = () => {
      const sy = window.scrollY;
      stage.tops = STOP_IDS.map((id) => {
        const s = el.querySelector<HTMLElement>(`[data-stop="${id}"]`);
        return s ? s.getBoundingClientRect().top + sy : 0;
      });
      stage.invalidate?.();
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    document.fonts.ready.then(measure);
    const t = setTimeout(measure, 1200);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, [flat, phone]);

  // Scrolling wakes the canvas (it only draws while something moves).
  useEffect(() => {
    if (flat) return;
    let last = -1;
    const tick = () => { if (scroll.y !== last) { last = scroll.y; stage.invalidate?.(); } };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [flat]);

  // 1 to 9 knock the bars from the top; 0 knocks the base.
  useEffect(() => {
    if (flat) return;
    const key = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (/^[0-9]$/.test(e.key)) knock(e.key === '0' ? 9 : Number(e.key) - 1);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [flat]);

  const knock = (h: number) => { stage.cmds.push(h); stage.invalidate?.(); };

  const [latest, ...earlier] = notes;
  const paper = RESEARCH[0], wess = RESEARCH[1];

  return (
    <div className={`v-tower${phone ? ' is-phone' : ''}${flat ? ' is-flat' : ''}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>

      <div className="pane" aria-hidden={flat ? undefined : 'true'}>
        {flat ? <FlatTower /> : <Suspense fallback={<FlatTower />}><Scene phone={phone} /></Suspense>}
      </div>

      <main id="main" className="col">
        <header className="sec hero" data-stop="hero">
          <h1 className="name"><span className="sr-only-x">{PERSON.name}</span><NameType /></h1>
          <p className="line">{PERSON.line}</p>
          {!flat && <p className="hint">{phone ? 'Tap a line to knock it out.' : 'Knock a line out. Or press 1 to 0.'}</p>}
        </header>

        <section className="sec" data-stop="about" aria-labelledby="h-about">
          <h2 id="h-about" className="h2">{PERSON.short.join(' ')}</h2>
          {PERSON.about.map((p) => <p key={p.slice(0, 20)} className="body">{p}</p>)}
          <p className="body soft">{PERSON.aside}</p>
        </section>

        <section className="sec debate" data-stop="debate" id="debate" aria-labelledby="h-debate">
          <h2 id="h-debate" className="h2">Debate</h2>
          <ol className="wins">
            {DEBATE.wins.map((w) => (
              <li key={w.where}>
                <p className="champ">{w.title}</p>
                <p className="event">{w.event}</p>
                <p className="where">{w.where}, {w.when}</p>
              </li>
            ))}
          </ol>
          <div className="team">
            <p className="label">{DEBATE.team.role}</p>
            <h3 className="h3">{DEBATE.team.name}</h3>
            <p className="body">{DEBATE.team.line}</p>
            <p className="body soft">{DEBATE.team.record}</p>
            <A className="go" href={DEBATE.team.href}>skeptical.pages.dev</A>
          </div>
          <div className="next">
            <h3 className="label">Up next</h3>
            <ul>{DEBATE.next.map((n) => <li key={n.where}><b>{n.where}</b> <span>{n.event}</span></li>)}</ul>
          </div>
        </section>

        <section className="sec" data-stop="research" id="research" aria-labelledby="h-research">
          <p className="label">{paper.status}{'pages' in paper ? `, ${paper.pages} pages` : ''}</p>
          <h2 id="h-research" className="ptitle">{paper.title}</h2>
          <p className="body lead">{paper.abstract}</p>
          <p className="keys"><span className="label">Keywords</span> {paper.keywords?.join(', ')}</p>
          <ul className="plinks">{paper.links.map((l) => <li key={l.label}><A className="go" href={l.href}>{l.label}</A></li>)}</ul>
          <div className="wess">
            <p className="label">{wess.status}</p>
            <h3 className="h3 small">{wess.title}</h3>
            <p className="body">{wess.abstract}</p>
          </div>
        </section>

        <section className="work" id="work" aria-labelledby="h-work">
          <h2 id="h-work" className="h2 worktitle">Work</h2>
          <ol className="prints">
            {WORK.map((w, i) => (
              <li key={w.slug} className="sec print" data-stop={`w${i}`}>
                <img src={BASE + w.img} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={750} />
                <p className="label">{w.kind}</p>
                <h3 className="h3">{w.name}</h3>
                <p className="body">{w.line}</p>
                <p className="stack">{w.stack}</p>
                {w.href ? <A className="go" href={w.href}>Open {w.name}</A> : <p className="stack">No public link</p>}
              </li>
            ))}
          </ol>
        </section>

        <section className="sec today" data-stop="today" id="today" aria-labelledby="h-today">
          <h2 id="h-today" className="h2">Today</h2>
          {latest ? (
            <article className="note">
              <p className="ndate"><time dateTime={latest.date}>{formatDate(latest.date)}</time></p>
              {latest.body.map((b) => <p key={b.slice(0, 24)} className="nbody">{b}</p>)}
            </article>
          ) : (
            <article className="note">
              <p className="ndate">{loaded ? 'Nothing posted yet today' : 'Today'}</p>
              <p className="nbody soft">{loaded ? 'The daily note goes up here.' : 'Opening the notebook.'}</p>
            </article>
          )}
          {earlier.length > 0 && (
            <details className="earlier">
              <summary>Earlier notes <span>{earlier.length}</span></summary>
              <ol>{earlier.map((n) => <li key={n.date}><time dateTime={n.date}>{formatDate(n.date)}</time>{n.body.map((b) => <p key={b.slice(0, 24)}>{b}</p>)}</li>)}</ol>
            </details>
          )}
        </section>

        <section className="sec" data-stop="github" id="github" aria-labelledby="h-github">
          <h2 id="h-github" className="h2">Live from GitHub</h2>
          <p className="body soft">{flat ? 'What he has been building lately.' : gh.activity.length ? 'Each commit stacks its repo, in heavy type, on the second tower.' : 'Each repo stands, in heavy type, in the second tower.'}</p>
          {gh.activity.length > 0 && (
            <ol className="commits">
              {gh.activity.slice(0, 8).map((c) => (
                <li key={c.href}><a href={c.href} rel="noopener"><span className="msg">{c.message}</span><span className="meta">{c.repo}, {ago(c.at)}</span></a></li>
              ))}
            </ol>
          )}
          <ol className="repos">
            {gh.repos.slice(0, 6).map((r) => (
              <li key={r.name}><a href={r.href} rel="noopener"><span className="rn">{r.name}</span><span className="rd">{r.description ?? ''}</span>{r.language && <span className="rl">{r.language}</span>}</a></li>
            ))}
          </ol>
          <A className="go" href={GITHUB.href}>github.com/{GITHUB.user}</A>
        </section>

        <section className="sec" data-stop="now" id="now" aria-labelledby="h-now">
          <h2 id="h-now" className="h2">Now</h2>
          <h3 className="h3 small">{NOW.reading.title}</h3>
          <p className="body">{NOW.reading.body}</p>
          <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
          <h3 className="h3 small">{NOW.club.title}</h3>
          <p className="body">{NOW.club.body}</p>
          <p className="status">{NOW.status}</p>
        </section>

        <section className="sec" data-stop="record" id="record" aria-labelledby="h-record">
          <h2 id="h-record" className="h2">Record</h2>
          <ul className="stats">{STATS.map((s) => <li key={s.label}><b>{s.to}{s.suffix}</b> {s.label}</li>)}</ul>
          {!flat && <p id="knock-help" hidden>Knocks this line out of the tower.</p>}
          <ol className="honors">
            {HONORS.map((h, i) => (
              <li key={h.what} className={i < 2 ? 'top' : undefined}>
                {flat ? (
                  <span className="hrow"><span className="hw">{h.what}</span><span className="hd">{h.detail}</span></span>
                ) : (
                  <button type="button" className="hrow" aria-describedby="knock-help" onClick={() => knock(i)}>
                    <span className="hw">{h.what}</span><span className="hd">{h.detail}</span>
                    <span className="hk" aria-hidden="true">{i === 9 ? 0 : i + 1}</span>
                  </button>
                )}
              </li>
            ))}
          </ol>
          <ul className="certs">
            {AWARDS.map((a) => (
              <li key={a.site}><a href={a.href} rel="noopener"><img src={BASE + a.img} alt={`Certificate for ${a.site}`} loading="lazy" width={600} height={850} /><span className="cs">{a.site}</span><span className="cn">{a.note}</span></a></li>
            ))}
          </ul>
        </section>

        <section className="sec off" data-stop="off" aria-labelledby="h-off">
          <h2 id="h-off" className="h2">Off the record</h2>
          <div className="lists">
            <div><h3 className="label">Likes</h3><ul>{LIKES.map((l) => <li key={l}>{l}</li>)}</ul></div>
            <div><h3 className="label">Dislikes</h3><ul>{DISLIKES.map((l) => <li key={l}>{l}</li>)}</ul></div>
            <div><h3 className="label">Favourites</h3><ul>{FAVOURITES.map((l) => <li key={l}>{l}</li>)}</ul></div>
            <div><h3 className="label">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider} {c.title}</b>. {c.note}</li>)}</ul></div>
          </div>
        </section>

        <footer className="sec end" data-stop="contact" id="contact" aria-labelledby="h-contact">
          <h2 id="h-contact" className="h2">Contact</h2>
          {!flat && (
            <p className="body soft">
              <button type="button" className="fell" onClick={() => knock(9)}>Knock out the base</button> and watch it all come down and stand again.
            </p>
          )}
          <ul className="links">
            {LINKS.map((l) => <li key={l.label}><span className="label">{l.label}</span>{l.href ? <A href={l.href}>{l.value}</A> : <span className="val">{l.value}</span>}</li>)}
          </ul>
          <p className="colophon">Draft 93 of the portfolio. Not the live site.</p>
          <p className="colophon">Physics after the pmndrs rapier-physics example (MIT). Type set in Anton and Schibsted Grotesk.</p>
        </footer>
      </main>
    </div>
  );
}
