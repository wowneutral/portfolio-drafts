// Draft 21: the slab. Four call words build his page. Press Block, Pillar,
// Slab or Beam and a heavy concrete piece is brought in and set down; scroll
// and the page raises its own small gate, one cast piece per section.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource-variable/schibsted-grotesk';
import '@fontsource-variable/newsreader';
import './slab.css';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, STATS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { KEYS, KINDS, S, SITE, SIZE, STOPS, YARD, coursePieces, dayPieces, glyphRun, type Kind, type PieceDef } from './plan';

const Scene = lazy(() => import('./Scene'));
const BASE = import.meta.env.BASE_URL;
const WORDS: Record<Kind, string> = { block: 'Block', pillar: 'Pillar', slab: 'Slab', beam: 'Beam' };

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const Ext = ({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

/** A word drawn from its glyph outlines, so it can sit in outline and then fill. */
function Outline({ text, dot }: { text: string; dot?: boolean }) {
  const r = glyphRun(text, 24);
  const w = r.width + (dot ? 200 : 0);
  return (
    <svg className="ol" viewBox={`-20 ${r.top - 20} ${w + 40} ${r.bottom - r.top + 40}`} aria-hidden="true" focusable="false">
      {r.parts.map((p, i) => <path key={i} d={p.d} transform={`translate(${p.dx} 0)`} />)}
      {dot && <rect x={r.width + 70} y={-128} width={128} height={128} />}
    </svg>
  );
}

/** The still elevation: the finished gate, drawn front on, for no WebGL or reduced motion. */
function Elevation({ days, bits, stacks }: { days: string[]; bits: string[]; stacks: Record<Kind, number> }) {
  const defs: PieceDef[] = [...SITE, ...dayPieces(days), ...coursePieces(bits)];
  const visitor: PieceDef[] = [];
  KINDS.forEach((k) => {
    for (let i = 0; i < stacks[k]; i++) {
      const [w, h, d] = SIZE[k];
      visitor.push({ id: k + i, size: [w, h, d], pos: [YARD[k][0], h / 2 + i * h, YARD[k][1]], stop: 'hero' });
    }
  });
  const all = [...defs.map((d) => ({ d, mine: false })), ...visitor.map((d) => ({ d, mine: true }))].sort((a, b) => a.d.pos[2] - b.d.pos[2]);
  const x0 = -7.6, x1 = visitor.length ? 10.9 : 4.3, top = 4.6;
  return (
    <svg className="elev" viewBox={`${x0} ${-top} ${x1 - x0} ${top + 0.5}`} role="img" aria-label="A drawing of the finished gate, front on">
      <line className="ground" x1={x0} y1={0} x2={x1} y2={0} />
      {all.map(({ d, mine }) => {
        const [w, h] = d.size, [x, y] = d.pos;
        const run = d.word ? glyphRun(d.word, 60) : null;
        let word = null;
        if (run) {
          const gh = run.bottom - run.top, sc = Math.min((h * 0.5) / gh, ((w - 0.06) * 0.84) / run.width);
          const ox = x - (run.width * sc) / 2, oy = -y + (gh * sc) / 2 - run.bottom * sc;
          word = <g className="cast" transform={`translate(${ox} ${oy}) scale(${sc})`}>{run.parts.map((p, i) => <path key={i} d={p.d} transform={`translate(${p.dx} 0)`} />)}</g>;
        }
        return (
          <g key={d.id} className={mine ? 'mine' : undefined}>
            <rect x={x - w / 2} y={-(y + h / 2)} width={w} height={h} rx={0.02} />
            {word}
          </g>
        );
      })}
    </svg>
  );
}

export default function Slab() {
  useVersion('slab');
  const root = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  const flat = still || !webgl;
  const { notes, loaded } = useNotes();
  const gh = useGitHub();
  const [filled, setFilled] = useState<Record<Kind, boolean>>({ block: false, pillar: false, slab: false, beam: false });
  const [last, setLast] = useState<Kind | null>(null);
  const [stacks, setStacks] = useState<Record<Kind, number>>({ block: 0, pillar: 0, slab: 0, beam: 0 });
  const [open, setOpen] = useState(0);

  const days = useMemo(() => notes.map((n) => n.date.slice(8, 10)), [notes]);
  const bits = useMemo(() => (gh.activity.length ? gh.activity.map((a) => (a.repo[0] ?? '').toUpperCase()) : gh.repos.map((r) => (r.name[0] ?? '').toUpperCase())), [gh]);

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // The word you call fills the moment its piece lands.
  useEffect(() => {
    S.onLand = (k) => { setFilled((f) => (f[k] ? f : { ...f, [k]: true })); setLast(k); };
    return () => { S.onLand = null; };
  }, []);

  // The opening: one call is made for you, the word everyone who knows will expect.
  useEffect(() => {
    if (flat) return;
    const t = setTimeout(() => { if (window.scrollY < 40) S.calls.push('slab'); }, 1400);
    return () => clearTimeout(t);
  }, [flat]);

  const call = (k: Kind) => {
    if (flat) { setStacks((s) => ({ ...s, [k]: Math.min(4, s[k] + 1) })); setFilled((f) => ({ ...f, [k]: true })); setLast(k); return; }
    S.calls.push(k);
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const k = KEYS[e.key.toLowerCase()];
      if (k) call(k);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flat]);

  // Where each section starts, so the scene knows which piece is due.
  useEffect(() => {
    const el = root.current; if (!el) return;
    const measure = () => {
      const sy = window.scrollY;
      S.tops = STOPS.map((s) => { const n = el.querySelector<HTMLElement>(`[data-stop="${s}"]`); return n ? n.getBoundingClientRect().top + sy : 1e9; });
      S.workTops = [...el.querySelectorAll<HTMLElement>('[data-work]')].map((n) => n.getBoundingClientRect().top + sy);
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    window.addEventListener('resize', measure);
    document.fonts.ready.then(measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [phone, notes, gh]);

  const latest = notes[0];
  const shown = notes[open] ?? latest;

  return (
    <div ref={root} className={`v-slab${flat ? ' is-flat' : ''}`}>
      <a className="skip-x" href="#main">Skip to the page</a>

      <aside className="site" aria-label="The building site">
        <div className="view">
          {flat ? <Elevation days={days} bits={bits} stacks={stacks} /> : (
            <Suspense fallback={null}><Scene days={days} bits={bits} low={phone} /></Suspense>
          )}
        </div>
        <div className="calls" role="group" aria-label="Call a piece">
          {KINDS.map((k) => (
            <button key={k} type="button" className={`call${filled[k] ? ' is-set' : ''}${last === k ? ' is-last' : ''}`} onClick={() => call(k)} aria-keyshortcuts={k === 'beam' ? 'E' : k[0].toUpperCase()}>
              <Outline text={WORDS[k]} dot />
              <span className="sr-only-x">{WORDS[k]}</span>
            </button>
          ))}
        </div>
      </aside>

      <main id="main" className="field">
        <header className="stop hero" data-stop="hero">
          <h1 className="name"><span>{PERSON.first}</span> <span>{PERSON.last}</span></h1>
          <p className="line">{PERSON.line}</p>
          <p className="hint">Call a word.</p>
          <div className="calls calls-phone" role="group" aria-label="Call a piece">
            {KINDS.map((k) => (
              <button key={k} type="button" className={`call${filled[k] ? ' is-set' : ''}${last === k ? ' is-last' : ''}`} onClick={() => call(k)}>
                <Outline text={WORDS[k]} dot />
                <span className="sr-only-x">{WORDS[k]}</span>
              </button>
            ))}
          </div>
        </header>

        <section className="stop about" data-stop="about" aria-labelledby="h-about">
          <h2 id="h-about" className="sec">About</h2>
          {PERSON.about.map((p, i) => <p key={i} className="body">{p}</p>)}
          <p className="aside">{PERSON.aside}</p>
        </section>

        <section className="stop debate" aria-labelledby="h-debate">
          <h2 id="h-debate" className="sec">Debate</h2>
          {DEBATE.wins.map((w, i) => (
            <article key={i} className="win" data-stop={i ? 'win1' : 'win0'}>
              <h3 className="champ">{w.title}</h3>
              <p className="event">{w.event}</p>
              <p className="where"><span>{w.where}</span><span>{w.when}</span></p>
            </article>
          ))}
          <article className="team" data-stop="team">
            <h3 className="teamname">{DEBATE.team.name}</h3>
            <p className="role">{DEBATE.team.role}</p>
            <p className="body">{DEBATE.team.line}</p>
            <p className="trecord">{DEBATE.team.record}</p>
            <Ext className="go" href={DEBATE.team.href}>skeptical.pages.dev</Ext>
          </article>
          <div className="next" data-stop="next">
            <h3 className="sub">Up next</h3>
            <ul>
              {DEBATE.next.map((n) => (
                <li key={n.where}><span className="nwhere">{n.where}</span><span className="nevent">{n.event}</span></li>
              ))}
            </ul>
          </div>
        </section>

        <section className="stop research" data-stop="research" aria-labelledby="h-research">
          <h2 id="h-research" className="sec">Research</h2>
          <article className="paper">
            <h3 className="ptitle">{RESEARCH[0].title}</h3>
            <p className="status">{RESEARCH[0].status}, {RESEARCH[0].pages} pages</p>
            <p className="body">{RESEARCH[0].abstract}</p>
            <ul className="keys">{(RESEARCH[0].keywords ?? []).map((k) => <li key={k}>{k}</li>)}</ul>
            <ul className="plinks">{RESEARCH[0].links.map((l) => <li key={l.label}><Ext className="go" href={l.href}>{l.label}</Ext></li>)}</ul>
          </article>
          <article className="paper short">
            <h3 className="ptitle small">{RESEARCH[1].title}</h3>
            <p className="status">{RESEARCH[1].status}</p>
            <p className="body">{RESEARCH[1].abstract}</p>
          </article>
        </section>

        <section className="stop work" data-stop="work" aria-labelledby="h-work">
          <h2 id="h-work" className="sec">Work</h2>
          {WORK.map((w) => (
            <article key={w.slug} className="proj" data-work={w.n}>
              <figure className="shot">
                {w.href ? (
                  <a href={w.href} rel="noopener" tabIndex={-1} aria-hidden="true"><img src={BASE + w.img} alt="" loading="lazy" width={1200} height={750} /></a>
                ) : <img src={BASE + w.img} alt="" loading="lazy" width={1200} height={750} />}
              </figure>
              <div className="pmeta">
                <span className="pn" aria-hidden="true">{w.n}</span>
                <h3 className="pname">{w.name}</h3>
                <p className="pkind">{w.kind}</p>
              </div>
              <p className="body">{w.line}</p>
              <p className="stack">{w.stack}</p>
              {w.href ? <Ext className="go" href={w.href}>{w.href.replace(/^https?:\/\//, '').replace(/\/$/, '')}</Ext> : <p className="nolink">No public link</p>}
            </article>
          ))}
        </section>

        <section className="stop github" data-stop="github" aria-labelledby="h-gh">
          <h2 id="h-gh" className="sec">Live from GitHub</h2>
          <p className="lead">{gh.activity.length ? 'One block in the course for every recent commit.' : 'One block in the course for every repository.'}</p>
          {gh.activity.length > 0 && (
            <ol className="commits">
              {gh.activity.slice(0, 8).map((a, i) => (
                <li key={a.href + i}>
                  <a href={a.href} rel="noopener" className="cmsg">{a.message}</a>
                  <span className="cmeta"><span>{a.repo}</span><span>{ago(a.at)}</span></span>
                </li>
              ))}
            </ol>
          )}
          <ul className="repos">
            {gh.repos.slice(0, 6).map((r) => (
              <li key={r.name}>
                <a href={r.href} rel="noopener" className="rname"><span className="rl" aria-hidden="true">{(r.name[0] ?? '').toUpperCase()}</span>{r.name}</a>
                {r.description && <p className="rdesc">{r.description}</p>}
                {r.language && <p className="rlang">{r.language}</p>}
              </li>
            ))}
          </ul>
          <Ext className="go" href={GITHUB.href}>github.com/{GITHUB.user}</Ext>
        </section>

        <section className="stop today" data-stop="today" aria-labelledby="h-today">
          <h2 id="h-today" className="sec">Today</h2>
          {!loaded ? (
            <p className="lead">Setting today’s slab.</p>
          ) : !latest ? (
            <p className="lead">No note on the gate yet. Check back tomorrow.</p>
          ) : (
            <>
              <article className="note" aria-live="polite">
                <p className="ndate"><time dateTime={shown.date}>{formatDate(shown.date)}</time>{open === 0 && <span className="newest">Latest</span>}</p>
                {shown.body.map((p, i) => <p key={i} className="nbody">{p}</p>)}
              </article>
              {notes.length > 1 && (
                <div className="earlier">
                  <h3 className="sub">Earlier slabs</h3>
                  <ul className="days">
                    {notes.slice(0, 12).map((n, i) => (
                      <li key={n.date}>
                        <button type="button" className={`day${open === i ? ' is-open' : ''}`} aria-pressed={open === i} onClick={() => setOpen(i)}>
                          <span className="dd">{formatDate(n.date, { day: 'numeric' })}</span>
                          <span className="dm">{formatDate(n.date, { month: 'short' })}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>

        <section className="stop now" data-stop="now" aria-labelledby="h-now">
          <h2 id="h-now" className="sec">Now</h2>
          <p className="status-line">{NOW.status}</p>
          <div className="nowgrid">
            <div>
              <h3 className="sub">{NOW.reading.title}</h3>
              <p className="body">{NOW.reading.body}</p>
              <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <h3 className="sub">{NOW.club.title}</h3>
              <p className="body">{NOW.club.body}</p>
            </div>
          </div>
        </section>

        <section className="stop record" data-stop="record" aria-labelledby="h-record">
          <h2 id="h-record" className="sec">Record</h2>
          <ul className="stats">
            {STATS.map((s) => <li key={s.label}><b>{s.to}{s.suffix}</b><span>{s.label}</span></li>)}
          </ul>
          <ol className="honors">
            {HONORS.map((h) => <li key={h.what}><span className="hw">{h.what}</span><span className="hd">{h.detail}</span></li>)}
          </ol>
          <ul className="awards">
            {AWARDS.map((a) => (
              <li key={a.site}>
                <a href={a.href} rel="noopener">
                  <img src={BASE + a.img} alt={`Certificate: ${a.site}`} loading="lazy" width={600} height={850} />
                  <span className="aname">{a.site}</span>
                  <span className="anote">{a.note}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="stop off" data-stop="off" aria-labelledby="h-off">
          <h2 id="h-off" className="sec">Off the record</h2>
          <div className="offgrid">
            <div><h3 className="sub">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="sub">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="sub">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="sub">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider}, {c.title}.</b> {c.note}</li>)}</ul></div>
          </div>
        </section>

        <section className="stop contact" data-stop="contact" aria-labelledby="h-contact">
          <h2 id="h-contact" className="sec">Contact</h2>
          <ul className="links">
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="ll">{l.label}</span>
                {l.href ? <Ext className="lv" href={l.href}>{l.value}</Ext> : <span className="lv">{l.value}</span>}
              </li>
            ))}
          </ul>
        </section>

        <footer className="foot">
          <p>Draft 21 of the portfolio. Not the live site.</p>
          <p>Type set in Schibsted Grotesk and Newsreader.</p>
        </footer>
      </main>
    </div>
  );
}
