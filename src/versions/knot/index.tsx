// Draft 23, The knot. Each part of the page is tied in a heavy cotton rope knot: pull the orange
// end and the knot slides undone and the rope lies straight, the rule under that section.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import '@fontsource-variable/bricolage-grotesque/wdth.css';
import '@fontsource-variable/newsreader/opsz.css';
import './knot.css';
import { AWARDS, CHAPTERS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { still } from '@/lib/utils';
import { Rope, hasWebGL, glyph, KNOT_NAME, type Kind, type Spec } from './rope';

const src = (p: string) => import.meta.env.BASE_URL + p;
const paper = RESEARCH[0];
const wess = RESEARCH[1];
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const DAYS: Kind[] = ['eight', 'overhand', 'overhandL', 'eight', 'overhand', 'overhandL', 'eight'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

let GL: boolean | null = null;
const useGL = () => { if (GL === null) GL = !still && hasWebGL() && !/flat/.test(location.search); return GL; };

type BandProps = {
  spec: Spec;
  className?: string;
  label: string;
  /** Pull it out when the band comes into view ('view'), when the page scrolls ('scroll'), or never. */
  auto?: 'view' | 'scroll';
  onP?: (p: number) => void;
  hot?: number;
  children?: ReactNode;
  ropeRef?: (r: Rope | null) => void;
};

/** One rope band: a canvas the shared renderer draws into, a drag surface, and a keyboard handle on the end. */
function Band({ spec, className, label, auto, onP, hot = -1, children, ropeRef }: BandProps) {
  const gl = useGL();
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const handle = useRef<HTMLButtonElement>(null);
  const rope = useRef<Rope | null>(null);
  const [tied, setTied] = useState(true);

  useEffect(() => {
    if (!gl || !box.current || !cv.current) return;
    const r = new Rope(box.current, cv.current, spec);
    rope.current = r;
    ropeRef?.(r);
    let was = true;
    r.onP = (p) => { onP?.(p); const t = p < 0.5; if (t !== was) { was = t; setTied(t); } };
    r.onEnd = (x, y) => { const h = handle.current; if (h) { h.style.left = `${Math.max(30, Math.min(x, box.current!.clientWidth - 30))}px`; h.style.top = `${y}px`; } };
    let io: IntersectionObserver | null = null;
    const onScroll = () => { if (!r.touched && window.scrollY > window.innerHeight * 0.3) r.pull(1, true); };
    if (auto === 'view') {
      io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !r.touched) setTimeout(() => { if (!r.touched) r.pull(1, true); }, 380); }, { rootMargin: '0px 0px -38% 0px' });
      io.observe(box.current);
    }
    if (auto === 'scroll') window.addEventListener('scroll', onScroll, { passive: true });
    const move = (e: PointerEvent) => r.move(e.clientX);
    const up = () => r.up();
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      io?.disconnect(); window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      r.dispose(); rope.current = null; ropeRef?.(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl]);

  useEffect(() => { rope.current?.highlight(hot); }, [hot]);

  if (!gl) return <div className={`kn-band kn-flat ${className ?? ''}`}><span className="kn-rule" aria-hidden="true" />{children}</div>;
  return (
    <div ref={box} className={`kn-band ${className ?? ''}`} onPointerDown={(e) => { if (e.button === 0 && spec.size !== 'cord') rope.current?.down(e.clientX); }}
      onPointerEnter={(e) => { const r = rope.current; if (r && e.pointerType === 'mouse' && spec.size !== 'cord' && !r.drag && r.target === 0) r.nudge(0.05); }}
      onPointerLeave={() => { const r = rope.current; if (r && !r.drag && r.target > 0 && r.target < 0.1) r.nudge(0); }}>
      <canvas ref={cv} aria-hidden="true" />
      {spec.size !== 'cord' && <button ref={handle} type="button" className="kn-end" aria-label={tied ? `Pull the loose end: ${label}` : `Tie it again: ${label}`}
        onClick={() => { const r = rope.current; if (r) r.pull(r.p > 0.5 ? 0 : 1); }} onPointerDown={(e) => e.stopPropagation()} />}
      {children}
    </div>
  );
}

const track = (el: HTMLElement | null, p: number) => { if (el) el.style.setProperty('--trk', `${(-0.02 + 0.05 * p).toFixed(4)}em`); };

function Today() {
  const { notes, loaded } = useNotes();
  const [open, setOpen] = useState<string | null>(null);
  const day = new Date().getDay();
  const kind = DAYS[day];
  const latest = notes[0];
  const earlier = notes.slice(1, 9);
  return (
    <section className="kn-sec kn-today" id="today" aria-labelledby="today-h">
      <header className="kn-head">
        <h2 id="today-h">Today</h2>
        <p className="kn-tag">{DAY_NAMES[day]}: {KNOT_NAME[kind].toLowerCase()}</p>
      </header>
      <Band spec={{ knots: [kind], size: 'mid' }} label="today" auto="view" />
      <div className="kn-today-body">
        {latest ? (
          <article className="kn-note">
            <time dateTime={latest.date}>{formatDate(latest.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time>
            {latest.body.map((p, i) => <p key={i}>{p}</p>)}
          </article>
        ) : (
          <article className="kn-note" aria-busy={!loaded}>
            <p>{NOW.status}</p>
          </article>
        )}
        <div className="kn-earlier">
          <h3>Earlier</h3>
          {earlier.length ? (
            <ul>
              {earlier.map((n) => {
                const on = open === n.date;
                return (
                  <li key={n.date} className={on ? 'on' : ''}>
                    <button type="button" aria-expanded={on} onClick={() => setOpen(on ? null : n.date)}>
                      <svg viewBox="0 0 48 36" aria-hidden="true"><path d={glyph(DAYS[new Date(n.date + 'T12:00:00').getDay()], on)} /></svg>
                      <span>{formatDate(n.date)}</span>
                    </button>
                    {on && <div className="kn-earlier-body">{n.body.map((p, i) => <p key={i}>{p}</p>)}</div>}
                  </li>
                );
              })}
            </ul>
          ) : <p className="kn-quiet">{NOW.status}</p>}
        </div>
      </div>
    </section>
  );
}

function GitHubCord() {
  const gh = useGitHub();
  const [hot, setHot] = useState(-1);
  const rows = gh.activity.length ? gh.activity.slice(0, 10) : [];
  const items = rows.length ? rows.map((a) => a.message) : gh.repos.slice(0, 8).map((r) => r.name);
  const n = items.length;
  const knots = items.map((_, i): Kind => (i % 2 ? 'overhandL' : 'overhand'));
  return (
    <section className="kn-sec kn-gh" id="github" aria-labelledby="gh-h">
      <header className="kn-head">
        <h2 id="gh-h">Live from GitHub</h2>
        <p className="kn-tag">{rows.length ? `${n} recent commits, one knot each` : `${n} repositories, one knot each`}</p>
      </header>
      <div className="kn-cordwrap" onPointerLeave={() => setHot(-1)}>
        <Band key={n + (rows.length ? 'c' : 'r')} spec={{ knots, size: 'cord' }} label="GitHub" hot={hot} className="kn-cord">
          <div className="kn-cordhits">
            {items.map((m, i) => (
              <button key={i} type="button" style={{ '--x': `${(i + 0.5) / n}` } as CSSProperties} aria-label={m}
                onPointerEnter={() => setHot(i)} onFocus={() => setHot(i)} onBlur={() => setHot(-1)} onClick={() => setHot(i)} />
            ))}
          </div>
        </Band>
      </div>
      <div className="kn-gh-body">
        {rows.length > 0 && (
          <ol className="kn-commits">
            {rows.map((a, i) => (
              <li key={a.href} className={hot === i ? 'on' : ''} onPointerEnter={() => setHot(i)}>
                <a href={a.href}><span className="kn-msg">{a.message}</span><span className="kn-meta">{a.repo}, {ago(a.at)}</span></a>
              </li>
            ))}
          </ol>
        )}
        <ul className="kn-repos">
          {gh.repos.slice(0, 8).map((r, i) => (
            <li key={r.name} className={!rows.length && hot === i ? 'on' : ''} onPointerEnter={() => { if (!rows.length) setHot(i); }}>
              <a href={r.href}><span className="kn-msg">{r.name}</span>{r.description && <span className="kn-desc">{r.description}</span>}{r.language && <span className="kn-meta">{r.language}</span>}</a>
            </li>
          ))}
        </ul>
        <p className="kn-more"><a href={GITHUB.href}>{host(GITHUB.href)}</a></p>
      </div>
    </section>
  );
}

export default function Knot() {
  useVersion('knot');
  const gl = useGL();
  const nameRef = useRef<HTMLHeadingElement>(null);
  const debRef = useRef<HTMLHeadingElement>(null);

  return (
    <div className={`v-knot ${gl ? '' : 'is-flat'}`}>
      <a className="skip-x" href="#main">Skip to content</a>
      <main id="main">
        <section className="kn-hero" aria-labelledby="name">
          <div className="kn-hero-copy">
            <h1 id="name" ref={nameRef} className="kn-name">{PERSON.name}</h1>
            <p className="kn-line">{PERSON.line}</p>
          </div>
          <Band spec={{ knots: ['eight'], size: 'big', line: 0.06 }} className="kn-hero-band" label="the figure-eight" auto="scroll"
            onP={(p) => track(nameRef.current, p)} />
          <p className="kn-hint" aria-hidden={!gl}>{gl ? 'Drag the orange end to untie it.' : PERSON.short.join(' ')}</p>
        </section>

        <section className="kn-sec kn-about" id="about" aria-labelledby="about-h">
          <h2 id="about-h" className="sr-only-x">About</h2>
          <p className="kn-lede">{PERSON.about[0]}</p>
          <div className="kn-about-side">
            <p>{PERSON.about[1]}</p>
            <p className="kn-aside">{PERSON.aside}</p>
          </div>
        </section>

        <Today />

        <section className="kn-sec kn-debate" id="debate" aria-labelledby="debate-h">
          <header className="kn-head">
            <h2 id="debate-h" ref={debRef} className="kn-track">{CHAPTERS[1].title}</h2>
            <p className="kn-tag">Two overhands, one rope</p>
          </header>
          <div className="kn-wins">
            {DEBATE.wins.map((w) => (
              <div key={w.where} className="kn-win">
                <p className="kn-win-t">{w.title}</p>
                <p className="kn-win-e">{w.event}</p>
                <p className="kn-win-w">{w.where}, {w.when}</p>
              </div>
            ))}
            <Band spec={{ knots: ['overhand', 'overhandL'], size: 'mid', mode: 'all', off: true, line: 0.5 }} label="both championships" auto="view" onP={(p) => track(debRef.current, p)} className="kn-debate-band" />
          </div>
          <div className="kn-debate-foot">
            <div className="kn-team">
              <p className="kn-role">{DEBATE.team.role}</p>
              <h3><a href={DEBATE.team.href}>{DEBATE.team.name}</a></h3>
              <p>{DEBATE.team.line}</p>
              <p className="kn-quiet">{DEBATE.team.record}</p>
            </div>
            <div className="kn-next">
              <h3>Up next</h3>
              <ul>{DEBATE.next.map((n) => <li key={n.where}><span>{n.where}</span> {n.event}</li>)}</ul>
            </div>
          </div>
        </section>

        <section className="kn-sec kn-research" id="research" aria-labelledby="research-h">
          <header className="kn-head">
            <h2 id="research-h">Research</h2>
            <p className="kn-tag">{paper.status}</p>
          </header>
          <Band spec={{ knots: ['overhandL'], size: 'mid' }} label="research" auto="view" />
          <div className="kn-paper">
            <h3 className="kn-title">{paper.title}</h3>
            <blockquote className="kn-epi"><p>{paper.epigraph!.text}</p><cite>{paper.epigraph!.source}</cite></blockquote>
            <p className="kn-abs">{paper.abstract}</p>
            <ul className="kn-keys">{paper.keywords!.map((k) => <li key={k}>{k}</li>)}</ul>
            <ul className="kn-links">{paper.links.map((l) => <li key={l.label}><a href={l.href}>{l.label}</a></li>)}</ul>
            <p className="kn-doi">DOI {paper.doi}</p>
          </div>
          <div className="kn-wess">
            <h3>{wess.title}</h3>
            <p>{wess.abstract}</p>
            <p className="kn-quiet">{wess.status}</p>
          </div>
        </section>

        <section className="kn-sec kn-work" id="work" aria-labelledby="work-h">
          <header className="kn-head">
            <h2 id="work-h">Work</h2>
            <p className="kn-tag">{CHAPTERS[4].body}</p>
          </header>
          {WORK.map((w, i) => (
            <div key={w.slug} className="kn-proj-wrap">
              {i > 0 && <Band spec={{ knots: [i % 3 === 0 ? 'eight' : i % 2 ? 'overhand' : 'overhandL'], size: 'small' }} className="kn-sep" label={`between ${WORK[i - 1].name} and ${w.name}`} />}
              <article className={`kn-proj ${i % 2 ? 'flip' : ''}`}>
                <figure>
                  {w.href ? <a href={w.href} tabIndex={-1} aria-hidden="true"><img src={src(w.img)} alt="" loading="lazy" width={1200} height={750} /></a> : <img src={src(w.img)} alt="" loading="lazy" width={1200} height={750} />}
                </figure>
                <div className="kn-proj-copy">
                  <p className="kn-kind">{w.kind}</p>
                  <h3>{w.href ? <a href={w.href}>{w.name}</a> : w.name}</h3>
                  <p>{w.line}</p>
                  <p className="kn-stack">{w.stack}</p>
                  {w.href && <p className="kn-visit"><a href={w.href}>{host(w.href)}</a></p>}
                </div>
              </article>
            </div>
          ))}
        </section>

        <GitHubCord />

        <section className="kn-sec kn-now" id="now" aria-labelledby="now-h">
          <header className="kn-head"><h2 id="now-h">Now</h2></header>
          <p className="kn-status">{NOW.status}</p>
          <div className="kn-now-cols">
            <div>
              <h3>{NOW.reading.title}</h3>
              <p>{NOW.reading.body}</p>
              <ul className="kn-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <h3>{NOW.club.title}</h3>
              <p>{NOW.club.body}</p>
            </div>
          </div>
        </section>

        <section className="kn-sec kn-record" id="record" aria-labelledby="record-h">
          <header className="kn-head"><h2 id="record-h">Record</h2></header>
          <Band spec={{ knots: ['eight'], size: 'mid' }} label="the record" auto="view" />
          <div className="kn-record-body">
            <ol className="kn-honors">{HONORS.map((h) => <li key={h.what}><span>{h.what}</span><span className="kn-quiet">{h.detail}</span></li>)}</ol>
            <div className="kn-awards">
              {AWARDS.map((a) => (
                <a key={a.site} href={a.href} className="kn-award">
                  <img src={src(a.img)} alt={`Certificate: ${a.site}`} loading="lazy" width={600} height={850} />
                  <span>{a.site}</span><span className="kn-quiet">{a.note}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="kn-sec kn-off" id="off" aria-labelledby="off-h">
          <header className="kn-head"><h2 id="off-h">Off the record</h2></header>
          <div className="kn-off-cols">
            <div><h3>Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider} {c.title}</strong> {c.note}</li>)}</ul></div>
          </div>
        </section>

        <section className="kn-sec kn-contact" id="contact" aria-labelledby="contact-h">
          <header className="kn-head"><h2 id="contact-h">Contact</h2></header>
          <Band spec={{ knots: ['overhand'], size: 'mid', line: 0.5, off: true }} label="contact" auto="view" />
          <ul className="kn-links-big">
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="kn-quiet">{l.label}</span>
                {l.href ? <a href={l.href}>{l.value}</a> : <span>{l.value}</span>}
              </li>
            ))}
          </ul>
        </section>
      </main>
      <footer className="kn-foot">
        <p>Draft 23 of the portfolio. Not the live site.</p>
        <p className="kn-quiet">Set in Bricolage Grotesque and Newsreader.</p>
      </footer>
    </div>
  );
}
