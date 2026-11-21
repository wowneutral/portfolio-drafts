// Draft 94: the questions. Heavy red question marks, Skeptical's sign, drift around his
// name (after the pmndrs bestservedbold example, see Scene.tsx). They thin as you scroll,
// the last one drops into the paper's question, and the ending calls them all back.
import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import '@fontsource/anton/400.css';
import '@fontsource-variable/schibsted-grotesk/index.css';
import './questions.css';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { still, isPhone, clamp } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { PATH } from './geo';
import NAME from './name.json';
import { makeBand, type Band } from './Scene';

const Marks = lazy(() => import('./Scene'));
const LastMark = lazy(() => import('./Scene').then((m) => ({ default: m.LastMark })));
const BASE = import.meta.env.BASE_URL;
const PAPER = RESEARCH[0];
const WESSO = RESEARCH[1];
// The paper's question is the first sentence of its abstract; its mark is the one that falls in.
const QUESTION = PAPER.abstract.slice(0, PAPER.abstract.indexOf('?'));
const REST = PAPER.abstract.slice(PAPER.abstract.indexOf('?') + 1).trim();
const Q_HEAD = QUESTION.slice(0, QUESTION.lastIndexOf(' ') + 1);
const Q_LAST = QUESTION.slice(QUESTION.lastIndexOf(' ') + 1);
const EMAIL = LINKS[0];

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
/** A software renderer (no GPU): keep the marks but drop the AO, shadows and resolution. */
function isSoft() {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return /swiftshader|llvmpipe|software/i.test(String(ext ? gl!.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ''));
  } catch { return false; }
}
const SOFT = isSoft();

const ext = (href: string) => (href.startsWith('http') ? { rel: 'noopener' } : {});
const host = (href: string) => href.replace(/^https?:\/\//, '').replace(/\/$/, '');

/** A word of the name as Anton outlines, so the display type sets exactly to its caps with no line box spilling over its neighbours. */
function Word({ text }: { text: string }) {
  let pen = 0;
  const parts = text.toUpperCase().split('').map((ch, i) => {
    const g = NAME.glyphs.find((x) => x.ch === ch)!;
    const el = <path key={i} d={g.d} transform={`translate(${pen - g.x} 0)`} />;
    pen += g.advance;
    return el;
  });
  return <svg className="q-word" viewBox={`0 -862 ${pen} 864`} aria-hidden="true" focusable="false">{parts}</svg>;
}

/** A flat question mark (the same Anton outline as the 3D ones). */
function Mark({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 -880 500 892" aria-hidden="true" focusable="false"><path d={PATH} /></svg>
  );
}

// Where the flat marks sit when there is no WebGL or motion is reduced (percent of the band, size in vw, tilt).
const STILL_HERO = [
  [9, 30, 5, -14], [23, 38, 8, 10], [37, 22, 4, 24], [49, 30, 10, -6], [63, 22, 5, 18], [74, 36, 7, -20], [88, 26, 4, 12],
] as const;
const STILL_END = [[30, 14, 4, 24], [46, 8, 5, -12], [62, 16, 6, 16], [78, 6, 4, -22], [90, 22, 7, 10], [5, 62, 4, -16], [92, 60, 5, 20]] as const;

/** Track one band: when it is on screen, where the pointer is over it, and what to keep the marks off. */
function useBand(ref: React.RefObject<HTMLElement | null>, opts: { centre: (r: DOMRect, phone: boolean) => { x: number; y: number }; thin?: boolean }) {
  const band = useMemo<Band>(makeBand, []);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect(), ph = isPhone();
      band.walls = [...el.querySelectorAll<HTMLElement>('[data-wall]')].map((w) => { const b = w.getBoundingClientRect(); return { x: b.left - r.left, y: b.top - r.top, w: b.width, h: b.height }; });
      band.centre = opts.centre(r, ph);
      band.wake();
    };
    const io = new IntersectionObserver(([e]) => { band.visible = e.isIntersecting; if (e.isIntersecting) { setNear(true); band.wake(); } }, { rootMargin: '0px' });
    const pre = new IntersectionObserver(([e]) => { if (e.isIntersecting) setNear(true); }, { rootMargin: '60% 0px' });
    io.observe(el); pre.observe(el);
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      band.pointer = inside ? { x: e.clientX - r.left, y: e.clientY - r.top } : null;
      if (inside) band.wake();
    };
    const leave = () => { band.pointer = null; };
    const up = (e: PointerEvent) => { if (e.pointerType !== 'mouse') band.pointer = null; };
    const scrolled = () => {
      if (!opts.thin) return;
      const t = clamp(window.scrollY / (el.offsetHeight * 0.85), 0, 1);
      if (Math.abs(t - band.thin) > 0.01) { band.thin = t; band.wake(); }
    };
    measure(); scrolled();
    const t = setTimeout(measure, 900);
    document.fonts.ready.then(measure);
    window.addEventListener('resize', measure);
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    window.addEventListener('pointerup', up, { passive: true });
    window.addEventListener('pointercancel', up, { passive: true });
    window.addEventListener('scroll', scrolled, { passive: true });
    return () => { io.disconnect(); pre.disconnect(); clearTimeout(t); window.removeEventListener('resize', measure); window.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); window.removeEventListener('scroll', scrolled); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [band]);
  return { band, near };
}

export default function Questions() {
  useVersion('questions');
  const [webgl] = useState(hasWebGL);
  const flat = still || !webgl;
  const [phone, setPhone] = useState(isPhone);
  useEffect(() => { const on = () => setPhone(isPhone()); window.addEventListener('resize', on); return () => window.removeEventListener('resize', on); }, []);

  const hero = useRef<HTMLElement>(null);
  const end = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLSpanElement>(null);
  const top = useBand(hero, { centre: (r, ph) => ({ x: r.width / 2, y: r.height * (ph ? 0.36 : 0.45) }), thin: true });
  const last = useBand(end, {
    centre: (r) => { const e = end.current?.querySelector('.q-email')?.getBoundingClientRect(); return e ? { x: e.left - r.left + e.width / 2, y: e.top - r.top + e.height / 2 } : { x: r.width / 2, y: r.height / 2 }; },
  });
  const [poured, setPoured] = useState(0);
  const pour = () => { last.band.pour += 1; setPoured(last.band.pour); last.band.wake(); };

  // The last mark: where the slot is, and when to drop it.
  const [slot, setSlot] = useState<{ x: number; base: number; fs: number } | null>(null);
  const [fire, setFire] = useState(0);
  const [stageNear, setStageNear] = useState(false);
  useLayoutEffect(() => {
    if (flat) return;
    const el = stage.current, s = slotRef.current; if (!el || !s) return;
    const measure = () => {
      const r = el.getBoundingClientRect(), b = s.getBoundingClientRect();
      const base = s.querySelector('i')!.getBoundingClientRect().top;
      setSlot({ x: b.left - r.left, base: base - r.top, fs: parseFloat(getComputedStyle(s).fontSize) });
    };
    measure();
    document.fonts.ready.then(measure);
    window.addEventListener('resize', measure);
    const pre = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStageNear(true); }, { rootMargin: '80% 0px' });
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setFire((f) => (f === 0 ? 1 : f)); }, { threshold: 0.6 });
    pre.observe(el); io.observe(el);
    return () => { window.removeEventListener('resize', measure); pre.disconnect(); io.disconnect(); };
  }, [flat]);

  const { notes, loaded } = useNotes();
  const gh = useGitHub();
  const [latest, ...earlier] = notes;
  const [openNotes, setOpenNotes] = useState(false);
  const commits = gh.activity.slice(0, 8);

  return (
    <div className={'v-questions' + (flat ? ' is-flat' : '')}>
      <a className="skip-x" href="#main">Skip to content</a>

      <header ref={hero} className="q-hero">
        <nav className="q-nav" aria-label="Sections" data-wall>
          {[['debate', 'Debate'], ['research', 'Research'], ['work', 'Work'], ['github', 'GitHub'], ['today', 'Today'], ['contact', 'Contact']].map(([id, label]) => <a key={id} href={'#' + id}>{label}</a>)}
        </nav>
        <p className="q-line" data-wall>{PERSON.line}</p>
        <p className="q-role" data-wall>{DEBATE.team.role} of {DEBATE.team.name}</p>
        <h1 className="q-name"><span className="sr-only-x">{PERSON.name}</span><Word text={PERSON.first} /><Word text={PERSON.last} /></h1>
        <p className="q-short" data-wall>{PERSON.short.join(' ')}</p>
        {flat ? null : <p className="q-hint" data-wall>{phone ? 'Drag through the marks' : 'Push the marks'}</p>}
        {flat ? (
          <div className="q-still" aria-hidden="true">{STILL_HERO.map(([x, y, s, r], i) => <Mark key={i} style={{ left: x + '%', top: y + '%', width: s + 'vw', transform: `rotate(${r}deg)` }} />)}</div>
        ) : top.near ? (
          <Suspense fallback={null}><Marks band={top.band} count={phone ? 18 : 28} phone={phone} lite={SOFT} /></Suspense>
        ) : null}
      </header>

      <main id="main">
        <section id="debate" className="q-debate" aria-labelledby="debate-h">
          <h2 id="debate-h" className="q-h2">Debate</h2>
          <ol className="q-wins">
            {DEBATE.wins.map((w) => (
              <li key={w.where}>
                <span className="q-champ">{w.title}</span>
                <span className="q-win">
                  <strong>{w.event}</strong>
                  <span>{w.where}</span>
                  <span>{w.when}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="q-team">
            <div>
              <h3 className="q-h3">{DEBATE.team.name}</h3>
              <p className="q-role2">{DEBATE.team.role}</p>
              <p className="q-lede">{DEBATE.team.line}</p>
              <p>{DEBATE.team.record}</p>
              <a className="q-link" href={DEBATE.team.href} {...ext(DEBATE.team.href)}>{host(DEBATE.team.href)}</a>
            </div>
            <div>
              <h3 className="q-h3">Up next</h3>
              <ul className="q-next">
                {DEBATE.next.map((n) => <li key={n.where}><strong>{n.where}</strong><span>{n.event}</span></li>)}
              </ul>
            </div>
          </div>
        </section>

        <section id="today" className="q-today" aria-labelledby="today-h">
          <div className="q-today-in">
            <h2 id="today-h" className="q-h2">Today</h2>
            {latest ? (
              <article className="q-note">
                <p className="q-date"><time dateTime={latest.date}>{formatDate(latest.date)}</time></p>
                <div className="q-note-body">{latest.body.map((p, i) => <p key={i}>{p}</p>)}</div>
              </article>
            ) : (
              <article className="q-note">
                <p className="q-date">{loaded ? 'No note yet' : 'Today'}</p>
                <div className="q-note-body"><p>{loaded ? 'The daily note lands here. Check back tomorrow.' : 'Fetching the latest note.'}</p></div>
              </article>
            )}
            {earlier.length > 0 && (
              <details className="q-earlier" onToggle={(e) => setOpenNotes((e.target as HTMLDetailsElement).open)}>
                <summary>Earlier notes <span>{earlier.length}</span></summary>
                {openNotes && <ol>
                  {earlier.map((n) => (
                    <li key={n.date}><time dateTime={n.date}>{formatDate(n.date)}</time><div>{n.body.map((p, i) => <p key={i}>{p}</p>)}</div></li>
                  ))}
                </ol>}
              </details>
            )}
          </div>
        </section>

        <section id="about" className="q-about" aria-labelledby="about-h">
          <h2 id="about-h" className="q-h2">About</h2>
          <div className="q-about-body">
            {PERSON.about.map((p, i) => <p key={i}>{p}</p>)}
            <p className="q-aside">{PERSON.aside}</p>
          </div>
        </section>

        <section id="research" className="q-research" aria-labelledby="research-h">
          <h2 id="research-h" className="q-h2">Research</h2>
          <div ref={stage} className="q-stage" onClick={() => !flat && setFire((f) => f + 1)}>
            <p className="q-question">
              {Q_HEAD}<span className="q-last">{Q_LAST}<span ref={slotRef} className="q-slot">?<i /></span></span>
            </p>
            {!flat && stageNear ? <Suspense fallback={null}><LastMark slot={slot} fire={fire} /></Suspense> : null}
          </div>
          <div className="q-paper">
            <div className="q-paper-main">
              <h3 className="q-title">{PAPER.title}</h3>
              <p className="q-status">{PAPER.status}</p>
              <p className="q-abstract">{QUESTION}? {REST}</p>
              <ul className="q-keys" aria-label="Keywords">{(PAPER.keywords ?? []).map((k) => <li key={k}>{k}</li>)}</ul>
            </div>
            <ul className="q-plinks">
              {PAPER.links.map((l) => <li key={l.label}><a className="q-link" href={l.href} {...ext(l.href)}>{l.label}</a></li>)}
            </ul>
          </div>
          <div className="q-wesso">
            <h3 className="q-h3">{WESSO.title}</h3>
            <p>{WESSO.abstract}</p>
            <p className="q-status">{WESSO.status}</p>
          </div>
        </section>

        <section id="work" className="q-work" aria-labelledby="work-h">
          <h2 id="work-h" className="q-h2">Work</h2>
          <ol className="q-works">
            {WORK.map((w) => {
              const img = <img src={BASE + w.img} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={660} />;
              return (
                <li key={w.slug} className="q-workrow">
                  <figure className="q-shot">{w.href ? <a href={w.href} {...ext(w.href)} tabIndex={-1} aria-hidden="true">{img}</a> : img}</figure>
                  <div className="q-wtext">
                    <h3 className="q-wname">{w.name}</h3>
                    <p className="q-kind">{w.kind}</p>
                    <p>{w.line}</p>
                    <p className="q-stack">{w.stack}</p>
                    {w.href ? <a className="q-link" href={w.href} {...ext(w.href)}>{host(w.href)}</a> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section id="github" className="q-gh" aria-labelledby="gh-h">
          <h2 id="gh-h" className="q-h2">Live from GitHub</h2>
          <div className="q-tally" aria-hidden="true">
            {(commits.length ? commits : gh.repos.slice(0, 8)).map((_, i) => <Mark key={i} className="q-tick" />)}
          </div>
          <p className="q-tally-label">{commits.length ? `${commits.length} recent commits, one mark each` : `${gh.repos.length} repositories, one mark each`}</p>
          <div className={'q-gh-cols' + (commits.length ? '' : ' is-repos-only')}>
            {commits.length > 0 && (
              <ol className="q-commits">
                {commits.map((c, i) => (
                  <li key={i}><a href={c.href} {...ext(c.href)}>{c.message}</a><span>{c.repo}, {ago(c.at)}</span></li>
                ))}
              </ol>
            )}
            <ul className="q-repos">
              {gh.repos.slice(0, 6).map((r) => (
                <li key={r.name}><a href={r.href} {...ext(r.href)}>{r.name}</a>{r.description ? <p>{r.description}</p> : null}{r.language ? <span>{r.language}</span> : null}</li>
              ))}
            </ul>
          </div>
          <a className="q-link" href={GITHUB.href} {...ext(GITHUB.href)}>{host(GITHUB.href)}</a>
        </section>

        <section id="now" className="q-now" aria-labelledby="now-h">
          <h2 id="now-h" className="q-h2">Now</h2>
          <p className="q-status-big">{NOW.status}</p>
          <div className="q-now-cols">
            <div>
              <h3 className="q-h3">{NOW.reading.title}</h3>
              <p>{NOW.reading.body}</p>
              <ul className="q-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <h3 className="q-h3">{NOW.club.title}</h3>
              <p>{NOW.club.body}</p>
            </div>
          </div>
        </section>

        <section id="record" className="q-record" aria-labelledby="record-h">
          <h2 id="record-h" className="q-h2">Record</h2>
          <ol className="q-honors">
            {HONORS.map((h) => <li key={h.what}><span>{h.what}</span><span>{h.detail}</span></li>)}
          </ol>
          <ul className="q-awards">
            {AWARDS.map((a) => (
              <li key={a.site}>
                <a href={a.href} {...ext(a.href)}>
                  <img src={BASE + a.img} alt={`Certificate: ${a.site}, ${a.note}`} loading="lazy" />
                  <span className="q-aw">{a.site}</span>
                  <span className="q-awn">{a.note}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="q-off" aria-labelledby="off-h">
          <h2 id="off-h" className="q-h2">Off the record</h2>
          <div className="q-off-cols">
            <div><h3 className="q-h4">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="q-h4">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="q-h4">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="q-h4">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider} {c.title}</strong> {c.note}</li>)}</ul></div>
          </div>
        </section>

        <section id="contact" ref={end} className={'q-end' + (poured ? ' is-poured' : '')} aria-labelledby="contact-h" onClick={(e) => { if (!flat && !(e.target as HTMLElement).closest('a,button')) pour(); }}>
          <h2 id="contact-h" className="q-h2" data-wall>Contact</h2>
          <a className="q-email" href={EMAIL.href!} data-wall>{EMAIL.value}</a>
          <ul className="q-links" data-wall>
            {LINKS.slice(1).map((l) => <li key={l.label}><span>{l.label}</span>{l.href ? <a href={l.href} {...ext(l.href)}>{l.value}</a> : <span className="q-plain">{l.value}</span>}</li>)}
          </ul>
          {flat ? (
            <div className="q-still" aria-hidden="true">{STILL_END.map(([x, y, s, r], i) => <Mark key={i} style={{ left: x + '%', top: y + '%', width: s + 'vw', transform: `rotate(${r}deg)` }} />)}</div>
          ) : (
            <>
              <button type="button" className="q-call" data-wall onClick={pour}>{poured ? 'Again' : 'Call the marks back'}</button>
              {last.near ? <Suspense fallback={null}><Marks band={last.band} count={phone ? 18 : 32} phone={phone} lite={SOFT} pour /></Suspense> : null}
            </>
          )}
        </section>
      </main>

      <footer className="q-foot">
        <p>Draft 94 of the portfolio. Not the live site.</p>
        <p>The marks are Anton question marks in a rapier cloud, after the pmndrs example by bestservedbold (MIT), lit by that example's studio HDR.</p>
      </footer>
    </div>
  );
}
