// Draft 26: the arch. A white plaster arch holds the page up. Pull the keystone
// and it comes down; put it back and every stone springs home. The scroll walks
// the camera from stone to stone, and under the arch.
import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/newsreader/opsz.css';
import './arch.css';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, STATS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { gsap } from '@/lib/scroll';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { KEY, R1, R2, STONES, runOf } from './geo';
import { resetStore, store, type ArchState } from './store';

const Scene = lazy(() => import('./Scene'));
const BASE = import.meta.env.BASE_URL;

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const ext = (href: string) => (href.startsWith('http') ? { rel: 'noopener' } : {});

/**
 * A section heading that sags into a shallow curve while the keystone is out
 * and springs straight when it goes back. Each letter is lowered by a parabola
 * across its own line, never more than about two percent of the line's width.
 */
function Sag({ children, id, className }: { children: string; id?: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const measure = () => {
      const chars = Array.from(el.querySelectorAll<HTMLElement>('.ch'));
      const lines = new Map<number, HTMLElement[]>();
      for (const c of chars) { const t = Math.round(c.offsetTop / 4); (lines.get(t) ?? lines.set(t, []).get(t)!).push(c); }
      for (const row of lines.values()) {
        const x0 = row[0].offsetLeft, last = row[row.length - 1], x1 = last.offsetLeft + last.offsetWidth, w = Math.max(1, x1 - x0);
        const amp = 0.02 * Math.max(w, 0.6 * el.clientWidth);
        for (const c of row) { const u = (c.offsetLeft + c.offsetWidth / 2 - x0) / w; c.style.setProperty('--d', `${((1 - (2 * u - 1) ** 2) * amp).toFixed(2)}px`); }
      }
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [children]);
  const words = children.split(' ');
  return (
    <h2 ref={ref} id={id} className={'sag ' + (className ?? '')}>
      <span className="sr-only-x">{children}</span>
      <span aria-hidden="true">
        {words.map((w, i) => (
          <span className="wd" key={i}>
            {w.split('').map((c, k) => <span className="ch" key={k}>{c}</span>)}
            {i < words.length - 1 ? <span className="ch sp">{' '}</span> : null}
          </span>
        ))}
      </span>
    </h2>
  );
}

/** The still elevation drawing, for no WebGL or reduced motion. */
function Elevation() {
  const k = 40, cx = 200, gy = 196;
  const P = (r: number, a: number) => `${(cx + r * k * Math.cos(a)).toFixed(1)} ${(gy - r * k * Math.sin(a)).toFixed(1)}`;
  return (
    <svg className="elev" viewBox="0 0 400 214" role="img" aria-label="Elevation drawing of a plaster arch of thirteen stones, the keystone cut with his name">
      <line x1="0" x2="400" y1={gy} y2={gy} className="gl" />
      {STONES.map((s) => {
        const g = s.i === 0 || s.i === STONES.length - 1 ? 0 : 0.006;
        const a0 = s.a0 - (s.i === 0 ? 0 : g), a1 = s.a1 + (s.i === STONES.length - 1 ? 0 : g);
        const d = `M${P(R2, a0)} A${R2 * k} ${R2 * k} 0 0 1 ${P(R2, a1)} L${P(R1, a1)} A${R1 * k} ${R1 * k} 0 0 0 ${P(R1, a0)} Z`;
        const mx = cx + 3.8 * k * Math.cos(s.am), my = gy - 3.8 * k * Math.sin(s.am);
        const run = runOf(s);
        const rot = run === 'x' ? -(s.am - Math.PI / 2) * 180 / Math.PI : run === '+y' ? -s.am * 180 / Math.PI : -(s.am - Math.PI) * 180 / Math.PI;
        return (
          <g key={s.i}>
            <path d={d} className={s.i === KEY ? 'ks' : 'vs'} />
            <text x={mx} y={my} transform={`rotate(${rot.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)})`} className="cut" aria-hidden="true">
              {s.word.includes('|') ? s.word.split('|').map((l, n) => <tspan key={n} x={mx} dy={n ? 7 : -1.5}>{l}</tspan>) : s.word}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Arch() {
  useVersion('arch');
  const root = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  const flat = still || !webgl;
  const [state, setState] = useState<ArchState>('standing');
  const { notes, loaded } = useNotes();
  const gh = useGitHub();
  const [latest, ...earlier] = notes;
  const works = useMemo(() => WORK.map((w) => w.name.toUpperCase().replace('ONE HUNDRED ', 'ONE HUNDRED|')), []);
  const next = useMemo(() => DEBATE.next.map((n) => n.where.toUpperCase().replace(' ', '|')), []);

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  useEffect(() => { store.date = latest ? `${formatDate(latest.date, { day: 'numeric' })}|${formatDate(latest.date, { month: 'long' }).toUpperCase()}|${latest.date.slice(0, 4)}` : ''; }, [latest]);
  useEffect(() => { store.commits = gh.activity.length ? gh.activity.length : 9; }, [gh]);

  // The keystone's state reaches the page: the button's words, and the headings' sag.
  useEffect(() => {
    resetStore();
    const el = root.current;
    const on = (s: ArchState) => {
      setState(s);
      if (!el) return;
      if (s === 'out') gsap.to(el, { '--sag': 1, duration: 0.8, ease: 'power2.out', overwrite: true });
      if (s === 'standing') gsap.to(el, { '--sag': 0, duration: 1.3, ease: 'elastic.out(1, 0.28)', overwrite: true });
    };
    store.listeners.add(on);
    return () => { store.listeners.delete(on); };
  }, []);

  // Where each section sits, so the camera knows which stone to look at.
  useEffect(() => {
    const el = root.current; if (!el || flat) return;
    const measure = () => {
      const sy = window.scrollY;
      store.anchors = Array.from(el.querySelectorAll<HTMLElement>('[data-stop]')).map((s) => {
        const r = s.getBoundingClientRect();
        return { a: r.top + sy, b: r.bottom + sy, stop: s.dataset.stop! };
      });
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    window.addEventListener('resize', measure);
    const t = setTimeout(measure, 1200);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); clearTimeout(t); };
  }, [phone, flat]);

  // Enter puts the keystone back from anywhere on the page.
  useEffect(() => {
    if (flat) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || store.state !== 'out') return;
      if ((e.target as Element)?.closest?.('a,button,summary,input,textarea')) return;
      store.cmds.push('back');
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [flat]);

  const toggle = () => { store.cmds.push(store.state === 'standing' ? 'pull' : 'back'); };
  const label = state === 'standing' ? 'Pull the keystone.' : state === 'out' ? 'Put it back.' : 'Setting the stones';

  const Win = ({ w, k }: { w: (typeof DEBATE.wins)[number]; k: number }) => (
    <article className="win" data-stop={'win' + k}>
      {!flat && <div className="win-window" aria-hidden="true" />}
      <div className="field">
        <p className="win-title">{w.title}</p>
        <p className="win-event">{w.event}</p>
        <p className="win-meta">{w.where}<span aria-hidden="true"> · </span><span className="sr-only-x">, </span>{w.when}</p>
      </div>
    </article>
  );

  return (
    <div ref={root} className={'v-arch' + (flat ? ' is-flat' : '')} data-state={state}>
      <a className="skip-x" href="#main">Skip to content</a>
      {!flat && (
        <div className="stage" aria-hidden="true">
          <Suspense fallback={null}><Scene phone={phone} works={works} next={next} /></Suspense>
        </div>
      )}
      {!flat && !phone && state === 'out' && (
        <button type="button" className="back-fixed" onClick={toggle}>{label}</button>
      )}

      <main id="main">
        <section className="sec open" data-stop="open" aria-labelledby="name">
          <div className="win-window" aria-hidden="true" />
          <div className="field">
            <h1 id="name"><span>{PERSON.first}</span> <span>{PERSON.last}</span></h1>
            <p className="line">{PERSON.line}</p>
            {flat ? <Elevation /> : (
              <div className="pull">
                <button type="button" className="pull-btn" onClick={toggle} disabled={state === 'return'} aria-live="polite">{label}</button>
                <p className="pull-note">{phone ? 'Or tap the rose stone.' : 'Or drag the rose stone out.'}</p>
              </div>
            )}
          </div>
        </section>

        <section className="sec today" data-stop="today" aria-labelledby="h-today">
          <div className="win-window" aria-hidden="true" />
          <div className="field">
            <Sag id="h-today">Today</Sag>
            {latest ? (
              <>
                <p className="date"><time dateTime={latest.date}>{formatDate(latest.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></p>
                <div className="note">{latest.body.map((p, i) => <p key={i}>{p}</p>)}</div>
                {earlier.length > 0 && (
                  <div className="earlier">
                    <h3>Earlier notes</h3>
                    <ul>
                      {earlier.map((n) => (
                        <li key={n.date}>
                          <details>
                            <summary><time dateTime={n.date}>{formatDate(n.date)}</time><span className="peek">{n.body[0]}</span></summary>
                            <div className="more">{n.body.map((p, i) => <p key={i}>{p}</p>)}</div>
                          </details>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="date">{loaded ? 'No note yet today' : 'Opening the notebook'}</p>
                <div className="note"><p>{NOW.status}</p></div>
              </>
            )}
          </div>
        </section>

        <section className="sec about" data-stop="about" aria-labelledby="h-about">
          <div className="win-window" aria-hidden="true" />
          <div className="field">
            <Sag id="h-about">About</Sag>
            <p className="short">{PERSON.short.join(' ')}</p>
            {PERSON.about.map((p, i) => <p key={i} className="body">{p}</p>)}
            <p className="aside">{PERSON.aside}</p>
          </div>
        </section>

        <section className="sec debate" aria-labelledby="h-debate">
          <div className="field field-head">
            <Sag id="h-debate">The springers</Sag>
            <p className="body">The two lowest stones carry everything above them. These are cut CHAMPION.</p>
          </div>
          {DEBATE.wins.map((w, k) => <Win key={k} w={w} k={k} />)}
        </section>

        <section className="sec team" data-stop="team" aria-labelledby="h-team">
          <div className="win-window" aria-hidden="true" />
          <div className="field">
            <Sag id="h-team">Skeptical</Sag>
            <p className="role">{DEBATE.team.role}</p>
            <p className="body">{DEBATE.team.line}</p>
            <p className="record-line">{DEBATE.team.record}</p>
            <a className="go" href={DEBATE.team.href} {...ext(DEBATE.team.href)}>skeptical.pages.dev</a>
          </div>
        </section>

        <section className="sec next" data-stop="next" aria-labelledby="h-next">
          <div className="win-window" aria-hidden="true" />
          <div className="field">
            <Sag id="h-next">Up next</Sag>
            <p className="body">Two stones waiting beside the arch.</p>
            <ol className="nextlist">
              {DEBATE.next.map((n) => <li key={n.where}><span className="nw">{n.where}</span><span className="ne">{n.event}</span></li>)}
            </ol>
          </div>
        </section>

        <section className="sec research" data-stop="research" aria-labelledby="h-research">
          <div className="win-window" aria-hidden="true" />
          <div className="field">
            <Sag id="h-research">Research</Sag>
            <p className="status">{RESEARCH[0].status}</p>
            <h3 className="paper">{RESEARCH[0].title}</h3>
            <p className="body">{RESEARCH[0].abstract}</p>
            <ul className="kw" aria-label="Keywords">{(RESEARCH[0].keywords ?? []).map((k) => <li key={k}>{k}</li>)}</ul>
            <ul className="plinks">{RESEARCH[0].links.map((l) => <li key={l.label}><a href={l.href} {...ext(l.href)}>{l.label}</a></li>)}</ul>
            <div className="wesso">
              <h3>{RESEARCH[1].title}</h3>
              <p>{RESEARCH[1].abstract}</p>
              <p className="status">{RESEARCH[1].status}</p>
            </div>
          </div>
        </section>

        <section className="sec work" aria-labelledby="h-work">
          <div className="field field-head">
            <Sag id="h-work">Work, cut under the arch</Sag>
            <p className="body">What he has built, one project under each stone.</p>
          </div>
          {WORK.map((w, k) => (
            <article className="project" key={w.slug} data-stop={'work' + k} aria-labelledby={'w-' + w.slug}>
              {!flat && <div className="win-window" aria-hidden="true" />}
              <div className="field">
                <img src={BASE + w.img} alt={`Screenshot of ${w.name}`} loading="lazy" width={1200} height={750} />
                <div className="pmeta">
                  <h3 id={'w-' + w.slug}>{w.name}</h3>
                  <p className="kind">{w.kind}</p>
                </div>
                <p className="body">{w.line}</p>
                <p className="stack">{w.stack}</p>
                {w.href ? <a className="go" href={w.href} {...ext(w.href)}>Open {w.name}</a> : <p className="nolink">No public link.</p>}
              </div>
            </article>
          ))}
        </section>

        <section className="sec github" data-stop="github" aria-labelledby="h-gh">
          <div className="win-window" aria-hidden="true" />
          <div className="field">
            <Sag id="h-gh">Live from GitHub</Sag>
            <p className="body">{gh.activity.length ? `A second arch goes up beside the first, one stone for each recent commit: ${Math.min(9, gh.activity.length)} of nine.` : 'A second arch beside the first, one stone for each project he keeps in the open.'}</p>
            {gh.activity.length > 0 && (
              <ol className="commits">
                {gh.activity.slice(0, 8).map((a, i) => (
                  <li key={i}><a href={a.href} {...ext(a.href)}><span className="msg">{a.message}</span><span className="cm">{a.repo}, {ago(a.at)}</span></a></li>
                ))}
              </ol>
            )}
            <ul className="repos">
              {gh.repos.slice(0, 6).map((r) => (
                <li key={r.name}><a href={r.href} {...ext(r.href)}><span className="rn">{r.name}</span>{r.description && <span className="rd">{r.description}</span>}{r.language && <span className="rl">{r.language}</span>}</a></li>
              ))}
            </ul>
            <a className="go" href={GITHUB.href} {...ext(GITHUB.href)}>github.com/{GITHUB.user}</a>
          </div>
        </section>

        <section className="sec now" data-stop="now" aria-labelledby="h-now">
          <div className="win-window" aria-hidden="true" />
          <div className="field">
            <Sag id="h-now">Now</Sag>
            <p className="status-now">{NOW.status}</p>
            <h3>{NOW.reading.title}</h3>
            <p className="body">{NOW.reading.body}</p>
            <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            <h3>{NOW.club.title}</h3>
            <p className="body">{NOW.club.body}</p>
          </div>
        </section>

        <section className="sec record" data-stop="record" aria-labelledby="h-record">
          <div className="win-window" aria-hidden="true" />
          <div className="field">
            <Sag id="h-record">Record</Sag>
            <ul className="stats">{STATS.map((s) => <li key={s.label}><span className="sn">{s.to}{s.suffix}</span><span className="sl">{s.label}</span></li>)}</ul>
            <ol className="honors">{HONORS.map((h) => <li key={h.what}><span className="hw">{h.what}</span><span className="hd">{h.detail}</span></li>)}</ol>
            <div className="awards">
              {AWARDS.map((a) => (
                <a key={a.site} href={a.href} {...ext(a.href)}>
                  <img src={BASE + a.img} alt={`Certificate: ${a.site}, ${a.note}`} loading="lazy" width={600} height={850} />
                  <span>{a.site}</span><span className="an">{a.note}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="sec off" data-stop="off" aria-labelledby="h-off">
          <div className="win-window" aria-hidden="true" />
          <div className="field">
            <Sag id="h-off">Off the record</Sag>
            <div className="offgrid">
              <div><h3>Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3>Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3>Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider} {c.title}</b> {c.note}</li>)}</ul></div>
            </div>
          </div>
        </section>

        <section className="sec contact" data-stop="contact" aria-labelledby="h-contact">
          <div className="win-window" aria-hidden="true" />
          <div className="field">
            <Sag id="h-contact">Contact</Sag>
            <ul className="links">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <span className="ll">{l.label}</span>
                  {l.href ? <a href={l.href} {...ext(l.href)}>{l.value}</a> : <span className="lv">{l.value}</span>}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="sec end" data-stop="end" aria-label="Ending">
          <div className="win-window" aria-hidden="true" />
          <div className="field">
            <p className="closing">No stone stands by itself.</p>
            {!flat && <button type="button" className="pull-btn" onClick={toggle} disabled={state === 'return'}>{label}</button>}
            <footer>
              <p>Draft 26 of the portfolio. Not the live site.</p>
              <p>Set in Archivo and Newsreader.</p>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
