// Draft 41: the lens. His own words, set huge, under a heavy glass lens that
// follows the pointer. The lens scene is remixed from pmndrs/examples
// "scrollcontrols-and-lens-refraction" (see Stage.tsx).
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/familjen-grotesk/index.css';
import './lens.css';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB, CHAPTERS } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import type { Block, Pic, Pointer } from './Stage';

const Stage = lazy(() => import('./Stage'));
const BASE = import.meta.env.BASE_URL;

/** Split a paragraph after its first sentence, so the opening line can be set larger. */
function first(p: string): [string, string] {
  const m = p.match(/^(.+?[.?])\s+(.*)$/);
  return m ? [m[1], m[2]] : [p, ''];
}
const [a1, a1rest] = first(PERSON.about[0]);
const [a2, a2rest] = first(PERSON.about[1]);
const ABOUT: Block[] = [
  { text: a1, size: 'huge' },
  { text: a1rest, size: 'body' },
  { text: a2, size: 'huge' },
  { text: a2rest, size: 'body' },
];
const paper = RESEARCH[0];
const [r1, r1rest] = first(paper.abstract);
const ABSTRACT: Block[] = [
  { text: r1, size: 'huge' },
  { text: r1rest, size: 'body' },
];
const work = (slug: string) => WORK.find((w) => w.slug === slug)!;
// Three of his screenshots at different depths, the way the example hangs its photographs.
const PICS_ABOUT_WIDE: Pic[] = [
  { url: BASE + work('skeptical').img, aspect: 1.5, block: 1, f: 0.2, y: 0.6, x: 0.78, w: 0.3, z: 8.5 },
  { url: BASE + work('lastseen').img, aspect: 0.74, block: 1, f: 1, y: 0.62, x: 0.84, w: 0.15, z: 3.5 },
  { url: BASE + work('drafts').img, aspect: 1.2, block: 3, f: 0.55, y: 0.5, x: 0.78, w: 0.27, z: 6 },
];
const PICS_ABOUT: Pic[] = [
  { url: BASE + work('skeptical').img, aspect: 1.5, block: 1, f: 0, y: 0.5, x: 0, w: 1, z: 10.7 },
  { url: BASE + work('drafts').img, aspect: 1.2, block: 3, f: 0, y: 0.5, x: 0, w: 1, z: 10.7 },
];
const host = (href: string) => href.replace(/^https?:\/\//, '').replace(/\/$/, '');

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const Out = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

/** One lens stage: the WebGL type with the glass over it, and the same words as real text. */
function LensStage({ blocks, pics, phone, gl, label }: { blocks: Block[]; pics: Pic[]; phone: boolean; gl: boolean; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const glass = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [active, setActive] = useState(false);
  const [pointer] = useState<Pointer>(() => ({ x: 0, y: 0.3, mode: 'idle', down: false }));
  const ready = gl && height !== null;
  const onLayout = useCallback((px: number) => setHeight(Math.round(px)), []);

  useEffect(() => {
    if (!gl || !ref.current) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: '120px 0px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [gl]);

  useEffect(() => {
    const el = ref.current;
    if (!gl || !el) return;
    let rest = 0;
    const at = (e: PointerEvent) => {
      const r = glass.current!.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') { pointer.mode = 'mouse'; at(e); }
      else if (pointer.down) { pointer.mode = 'touch'; at(e); }
    };
    const down = (e: PointerEvent) => {
      pointer.down = true; clearTimeout(rest);
      if (e.pointerType !== 'mouse') pointer.mode = 'touch';
      at(e);
    };
    const up = (e: PointerEvent) => {
      pointer.down = false;
      if (e.pointerType !== 'mouse') { clearTimeout(rest); rest = window.setTimeout(() => { pointer.mode = 'rest'; }, 1400); }
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => { clearTimeout(rest); el.removeEventListener('pointermove', move); el.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
  }, [gl, pointer]);

  return (
    <div className={'stage' + (ready ? ' is-ready' : '')} ref={ref} style={ready ? { height } : undefined}>
      {gl && (
        <div className="glass" ref={glass} aria-hidden="true" data-gl>
          <Suspense fallback={null}>
            <Stage blocks={blocks} pics={pics} phone={phone} host={ref} pointer={pointer} active={active || !ready} onLayout={onLayout} />
          </Suspense>
        </div>
      )}
      <div className={ready ? 'sr-only-x' : 'flat'} aria-label={label} role="group">
        {blocks.map((b, i) => <p key={i} className={b.size}>{b.text}</p>)}
      </div>
    </div>
  );
}

function Today() {
  const { notes, loaded } = useNotes();
  const [pick, setPick] = useState(0);
  const note = notes[pick];
  return (
    <section id="today" className="sec today" aria-labelledby="today-h">
      <div className="sec-head">
        <h2 id="today-h">Today</h2>
        <p className="sub">His daily note.</p>
      </div>
      <div className="today-body" aria-live="polite">
        {!loaded && <p className="note-wait">Opening today’s note</p>}
        {loaded && !note && <p className="note-wait">No note posted yet. Check back tomorrow.</p>}
        {note && (
          <article className="note">
            <p className="note-date"><time dateTime={note.date}>{formatDate(note.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time>{pick === 0 ? <span className="note-new">Latest</span> : null}</p>
            {note.body.map((p, i) => <p key={i} className="note-text">{p}</p>)}
          </article>
        )}
        {notes.length > 1 && (
          <div className="notes">
            <h3>Every note</h3>
            <ol>
              {notes.map((n, i) => (
                <li key={n.date}>
                  <button type="button" aria-pressed={i === pick} onClick={() => setPick(i)}>
                    <time dateTime={n.date}>{formatDate(n.date, { day: 'numeric', month: 'short', year: 'numeric' })}</time>
                    <span>{n.body[0]}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}

function GitHubLive() {
  const gh = useGitHub();
  const commits = gh.activity.slice(0, 6);
  return (
    <section id="github" className="sec github" aria-labelledby="gh-h">
      <div className="sec-head">
        <h2 id="gh-h">Live from GitHub</h2>
        <p className="sub"><Out href={GITHUB.href}>github.com/{GITHUB.user}</Out></p>
      </div>
      <div className={'gh' + (commits.length ? ' has-commits' : '')}>
        {commits.length > 0 && (
          <div className="commits">
            <h3>Latest commits</h3>
            <ol>
              {commits.map((c, i) => (
                <li key={c.href + i}>
                  <a href={c.href} rel="noopener"><span className="c-msg">{c.message}</span></a>
                  <span className="c-meta">{c.repo}, {ago(c.at)}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        <div className="repos">
          <h3>{gh.live ? 'Recently pushed' : 'Repositories'}</h3>
          <ol>
            {gh.repos.slice(0, commits.length ? 6 : 8).map((r) => (
              <li key={r.name}>
                <a href={r.href} rel="noopener" className="r-name">{r.name}</a>
                {r.description && <p className="r-desc">{r.description}</p>}
                <p className="r-meta">{[r.language, r.pushedAt ? 'pushed ' + ago(r.pushedAt) : null].filter(Boolean).join(', ')}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

export default function Lens() {
  useVersion('lens');
  const [phone, setPhone] = useState(isPhone);
  const [gl] = useState(() => !still && hasWebGL());
  useEffect(() => {
    let t = 0;
    const on = () => { clearTimeout(t); t = window.setTimeout(() => setPhone(isPhone()), 150); };
    window.addEventListener('resize', on);
    return () => { clearTimeout(t); window.removeEventListener('resize', on); };
  }, []);
  const debate = CHAPTERS.find((c) => c.id === 'debate')!;
  const wess = RESEARCH[1];

  return (
    <div className="v-lens">
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="top">
        <div className="top-id">
          <h1>{PERSON.name}</h1>
          <p>{PERSON.line}</p>
        </div>
        <nav aria-label="Sections">
          <a href="#debate">Debate</a>
          <a href="#today">Today</a>
          <a href="#work">Work</a>
          <a href="#research">Research</a>
          <a href="#github">GitHub</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <main id="main">
        <section id="about" aria-labelledby="about-h" className="about">
          <h2 id="about-h" className="sr-only-x">About</h2>
          <LensStage blocks={ABOUT} pics={phone ? PICS_ABOUT : PICS_ABOUT_WIDE} phone={phone} gl={gl} label="About, in his words" key={phone ? 'p' : 'd'} />
          <p className="aside">{PERSON.aside}</p>
        </section>

        <section id="debate" className="sec debate" aria-labelledby="debate-h">
          <div className="sec-head">
            <h2 id="debate-h">{debate.title}</h2>
            <p className="sub">Lincoln Douglas, 2026</p>
          </div>
          <ol className="wins">
            {DEBATE.wins.map((w) => (
              <li key={w.where}>
                <p className="win-big"><span>{w.title},</span> {w.event}</p>
                <p className="win-at">{w.where}<br />{w.when}</p>
              </li>
            ))}
          </ol>
          <div className="team">
            <div className="team-name">
              <h3>{DEBATE.team.name}</h3>
              <p>{DEBATE.team.role}</p>
            </div>
            <div className="team-body">
              <p>{DEBATE.team.line}</p>
              <p>{DEBATE.team.record}</p>
              <p><Out href={DEBATE.team.href} className="go">{host(DEBATE.team.href)}</Out></p>
            </div>
          </div>
          <div className="next">
            <h3>Up next</h3>
            <ul>
              {DEBATE.next.map((n) => <li key={n.where}><span>{n.where}</span><span>{n.event}</span></li>)}
            </ul>
          </div>
        </section>

        <Today />

        <section id="work" className="sec work" aria-labelledby="work-h">
          <div className="sec-head">
            <h2 id="work-h">Things he built</h2>
            <p className="sub">Eight projects, each a screenshot.</p>
          </div>
          <ol className="works">
            {WORK.map((w, i) => {
              const img = <img src={BASE + w.img} alt={`${w.name}, screenshot`} loading="lazy" width={1200} height={660} />;
              return (
                <li key={w.slug} className={'w' + (i % 2 ? ' is-right' : '')}>
                  <figure className="w-pic">{w.href ? <a href={w.href} rel="noopener" tabIndex={-1} aria-hidden="true">{img}</a> : img}</figure>
                  <div className="w-text">
                    <h3>{w.name}</h3>
                    <p className="w-kind">{w.kind}</p>
                    <p className="w-line">{w.line}</p>
                    <p className="w-stack">{w.stack}</p>
                    {w.href && <p><Out href={w.href} className="go">{host(w.href)}</Out></p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section id="research" className="sec research" aria-labelledby="research-h">
          <div className="sec-head">
            <h2 id="research-h">{paper.title}</h2>
            <p className="sub">{paper.status}, {paper.pages} pages</p>
          </div>
          <LensStage blocks={ABSTRACT} pics={[]} phone={phone} gl={gl} label="Abstract" key={phone ? 'p' : 'd'} />
          <div className="paper-meta">
            <div>
              <h3>Keywords</h3>
              <ul className="keys">{(paper.keywords ?? []).map((k) => <li key={k}>{k}</li>)}</ul>
            </div>
            <div>
              <h3>Read it</h3>
              <ul className="plinks">{paper.links.map((l) => <li key={l.href}><Out href={l.href} className="go">{l.label}</Out></li>)}</ul>
            </div>
          </div>
          <div className="wess">
            <h3>{wess.title}</h3>
            <p>{wess.abstract}</p>
            <p className="sub">{wess.status}</p>
          </div>
        </section>

        <GitHubLive />

        <section id="now" className="sec now" aria-labelledby="now-h">
          <div className="sec-head">
            <h2 id="now-h">Now</h2>
            <p className="sub">{NOW.status}</p>
          </div>
          <div className="now-grid">
            <div>
              <h3>{NOW.reading.title}</h3>
              <p>{NOW.reading.body}</p>
              <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <h3>{NOW.club.title}</h3>
              <p>{NOW.club.body}</p>
            </div>
          </div>
        </section>

        <section id="record" className="sec record" aria-labelledby="record-h">
          <div className="sec-head">
            <h2 id="record-h">Record</h2>
          </div>
          <div className="rec-grid">
            <ol className="honors">
              {HONORS.map((h) => <li key={h.what}><span>{h.what}</span><span>{h.detail}</span></li>)}
            </ol>
            <div className="awards">
              {AWARDS.map((a) => (
                <a key={a.site} href={a.href} rel="noopener" className="award">
                  <img src={BASE + a.img} alt={`Certificate for ${a.site}`} loading="lazy" width={600} height={850} />
                  <span className="a-site">{a.site}</span>
                  <span className="a-note">{a.note}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="sec off" aria-labelledby="off-h">
          <div className="sec-head">
            <h2 id="off-h">Off the record</h2>
          </div>
          <div className="off-grid">
            <div><h3>Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider} {c.title}</b> {c.note}</li>)}</ul></div>
          </div>
        </section>

        <section id="contact" className="sec contact" aria-labelledby="contact-h">
          <h2 id="contact-h">Write to him.</h2>
          <ul className="links">
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="l-label">{l.label}</span>
                {l.href ? <Out href={l.href} className="l-value">{l.value}</Out> : <span className="l-value">{l.value}</span>}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="foot">
        <p>Draft 41 of the portfolio. Not the live site.</p>
        <p>Lens model and refraction scene from the pmndrs examples, ScrollControls and Lens Refraction by Paul Henschel, MIT. Type: Familjen Grotesk.</p>
      </footer>
    </div>
  );
}
