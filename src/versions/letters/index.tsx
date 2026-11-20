// Draft 2: the letters. ARMAAN SETH. stands on a paper sweep as heavy black
// letters. Push one and it falls; it gets back up. The scroll walks the camera
// along the name, one letter per section.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource/anton/400.css';
import '@fontsource-variable/archivo/wdth.css';
import './letters.css';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, STATS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { useRise } from '@/lib/motion';
import { gsap } from '@/lib/scroll';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import GLYPHS from './glyphs.json';
import { makePlan, NAME, STOPS } from './plan';
import { resetStage, stage } from './stage';

const Stage = lazy(() => import('./Stage'));
const BASE = import.meta.env.BASE_URL;
const READ = (phone: boolean) => (phone ? 0.74 : 0.5);

const A = ({ href, className, children, label }: { href: string; className?: string; children: React.ReactNode; label?: string }) => (
  <a className={className} href={href} aria-label={label} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** The name as flat type, for no WebGL or reduced motion. */
function FlatWord() {
  let pen = 0;
  const parts = NAME.split('').map((ch, i) => {
    if (ch === ' ') { pen += 330; return null; }
    const g = GLYPHS.glyphs.find((x) => x.ch === ch)!;
    const el = <path key={i} className={ch === '.' ? 'dot' : undefined} d={g.d} transform={`translate(${pen - g.x} 0)`} />;
    pen += g.advance + 56;
    return el;
  });
  return <svg className="flatword" viewBox={`-20 -900 ${pen + 20} 940`} role="img" aria-label="Armaan Seth">{parts}</svg>;
}

/** In the still page, each section keeps its letter beside it, flat. */
function Glyph({ chars }: { chars: string }) {
  let pen = 0;
  const parts = chars.toUpperCase().split('').map((ch, i) => {
    const g = GLYPHS.glyphs.find((x) => x.ch === ch);
    if (!g) return null;
    const el = <path key={i} d={g.d} transform={`translate(${pen - g.x} 0)`} />;
    pen += g.advance + 40;
    return el;
  });
  return <svg className="glyph" viewBox={`-10 -880 ${Math.max(pen, 300)} 900`} aria-hidden="true" focusable="false">{parts}</svg>;
}

function Kicker({ n, children, id }: { n: number; children: React.ReactNode; id?: string }) {
  const inner = <><span>{String(n).padStart(2, '0')}</span>{children}</>;
  return id ? <h2 className="kick" id={id}>{inner}</h2> : <p className="kick">{inner}</p>;
}

export default function Letters() {
  useVersion('letters');
  const root = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  const flat = still || !webgl;
  const [opened, setOpened] = useState(flat);
  const plan = useMemo(() => makePlan(phone), [phone]);
  const { notes, loaded } = useNotes();
  const gh = useGitHub();
  useRise(root);

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // What the scene drops on the paper when the live sections arrive.
  useEffect(() => { stage.day = notes[0]?.date.slice(8, 10) ?? ''; }, [notes]);
  useEffect(() => {
    stage.bits = gh.activity.length ? gh.activity.map((a) => a.repo[0] ?? '') : gh.repos.map((r) => r.name[0] ?? '');
  }, [gh]);

  // The opening: wait for the fonts, then the letters come down, then the words.
  useEffect(() => {
    if (flat) return;
    resetStage();
    stage.onOpened = () => setOpened(true);
    let live = true;
    const go = () => { if (live) { stage.go = true; stage.wake = Math.max(stage.wake, 90); } };
    const t0 = setTimeout(go, 1500);
    document.fonts.ready.then(() => setTimeout(go, 300));
    const t1 = setTimeout(() => setOpened(true), 7000);
    return () => { live = false; clearTimeout(t0); clearTimeout(t1); stage.onOpened = null; };
  }, [phone, flat]);

  // Measure where each section sits, so the camera knows when to hold and when to travel.
  useEffect(() => {
    const el = root.current; if (!el || flat) return;
    const measure = () => {
      const vh = window.innerHeight, sy = window.scrollY, ph = isPhone(), read = READ(ph);
      stage.read = read;
      const max = Math.max(1, document.documentElement.scrollHeight - vh);
      const list = STOPS.map((name, i) => {
        const s = el.querySelector<HTMLElement>(`[data-stop="${name}"]`);
        if (!s) return { a: 0, b: 0 };
        const r = s.getBoundingClientRect(), top = r.top + sy;
        const body = s.querySelector<HTMLElement>('[data-body]')?.getBoundingClientRect() ?? r;
        const mid = body.top + sy + body.height / 2, half = Math.max(0, (body.height - vh * (ph ? 0.35 : 0.7)) / 2) + vh * 0.08;
        let a = mid - half, b = mid + half;
        if (i === 0) { a = 0; b = Math.max(vh * read + vh * 0.05, Math.min(b, top + r.height - vh * 0.35)); }
        if (i === STOPS.length - 1) { a = Math.min(a, max + vh * read - vh * 0.05); b = max + vh; }
        return { a, b };
      });
      for (let i = 0; i < list.length - 1; i++) if (list[i].b > list[i + 1].a - 40) { const m = (list[i].b + list[i + 1].a) / 2; list[i].b = m - 20; list[i + 1].a = m + 20; }
      stage.stops = list.map((s) => ({ a: s.a - vh * read + vh * 0.5, b: s.b - vh * read + vh * 0.5 }));
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(el);
    window.addEventListener('resize', measure);
    document.fonts.ready.then(measure);
    const t = setTimeout(measure, 900);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); clearTimeout(t); };
  }, [phone, opened, flat]);

  // The pointer shows when it is over something that can be pushed.
  useEffect(() => {
    const el = root.current; if (!el || flat) return;
    let over = false;
    const tick = () => { if (stage.over !== over) { over = stage.over; el.classList.toggle('can-push', over); } };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [flat]);

  // Type a letter of the name (or a numeral of the date) to knock it over.
  useEffect(() => {
    if (flat) return;
    const key = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const ch = e.key.toUpperCase();
      if (/^[A-Z0-9.]$/.test(ch)) stage.cmds.push({ type: 'key', ch });
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [flat]);

  const [latest, ...earlier] = notes;
  const [w1, w2] = DEBATE.wins;
  const paper = RESEARCH[0], wess = RESEARCH[1];

  return (
    <div className={`v-letters${opened ? ' is-open' : ''}${phone ? ' is-phone' : ''}${flat ? ' is-flat' : ''}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      {!flat && <div className="stage" aria-hidden="true"><Suspense fallback={null}><Stage key={phone ? 'p' : 'd'} plan={plan} /></Suspense></div>}

      <main id="main">
        <section className="stop hero" data-stop="hero" id="top">
          <h1 className="sr-only-x">{PERSON.name}</h1>
          {flat && <FlatWord />}
          <div className="under" data-nopush>
            <p className="line">{PERSON.line}</p>
            {!flat && <p className="hint">{phone ? 'Tap a letter.' : 'Push a letter, or type one.'}</p>}
          </div>
        </section>

        <section className="stop" data-stop="about" id="about" aria-labelledby="h-about">
          <div className="col" data-body data-nopush>
            <Kicker n={1}>About</Kicker>
            <h2 id="h-about" className="big">{PERSON.short.map((s) => <span key={s}>{s}</span>)}</h2>
            {PERSON.about.map((p) => <p key={p.slice(0, 20)} className="body" data-rise>{p}</p>)}
            <p className="aside" data-rise>{PERSON.aside}</p>
          </div>
          {flat && <Glyph chars={'A'} />}
        </section>

        <section className="stop" data-stop="debate" id="debate" aria-labelledby="h-debate">
          <div className="col wide" data-body data-nopush>
            <Kicker n={2} id="h-debate">Debate</Kicker>
            <ol className="wins">
              {[w1, w2].map((w) => (
                <li key={w.where}>
                  <p className="champ">{w.title}</p>
                  <p className="event">{w.event}</p>
                  <p className="where"><b>{w.where}</b> {w.when}</p>
                </li>
              ))}
            </ol>
            <div className="team" data-rise>
              <p className="role">{DEBATE.team.role}</p>
              <h3 className="tname">{DEBATE.team.name}</h3>
              <p className="body">{DEBATE.team.line}</p>
              <p className="body soft">{DEBATE.team.record}</p>
              <A className="go" href={DEBATE.team.href}>skeptical.pages.dev</A>
            </div>
            <div className="next" data-rise>
              <p className="label">Up next</p>
              <ul>{DEBATE.next.map((n) => <li key={n.where}><b>{n.where}</b><span>{n.event}</span></li>)}</ul>
            </div>
          </div>
          {flat && <Glyph chars={'R'} />}
        </section>

        <section className="stop" data-stop="research" id="research" aria-labelledby="h-research">
          <div className="col" data-body data-nopush>
            <Kicker n={3}>Research</Kicker>
            <p className="status">{paper.status}{'pages' in paper ? `, ${paper.pages} pages` : ''}</p>
            <h2 id="h-research" className="ptitle">{paper.title}</h2>
            <p className="body lead" data-rise>{paper.abstract}</p>
            <ul className="keys" aria-label="Keywords">{(paper.keywords ?? []).map((k) => <li key={k}>{k}</li>)}</ul>
            <ul className="plinks">{paper.links.map((l) => <li key={l.label}><A className="go" href={l.href}>{l.label}</A></li>)}</ul>
            <div className="wess" data-rise>
              <p className="label">{wess.status}</p>
              <h3>{wess.title}</h3>
              <p className="body">{wess.abstract}</p>
            </div>
          </div>
          {flat && <Glyph chars={'A'} />}
        </section>

        <section className="stop" data-stop="work" id="work" aria-labelledby="h-work">
          <div className="col wide" data-body data-nopush>
            <Kicker n={4}>Work</Kicker>
            <h2 id="h-work" className="big">Things I made</h2>
            <ol className="prints">
              {WORK.map((w) => (
                <li key={w.slug} className="print">
                  <figure>
                    <img src={BASE + w.img} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={750} />
                  </figure>
                  <div className="cap">
                    <p className="label"><span>{w.n}</span>{w.kind}</p>
                    <h3>{w.name}</h3>
                    <p className="body">{w.line}</p>
                    <p className="stack">{w.stack}</p>
                    {w.href ? <A className="go" href={w.href}>Open {w.name}</A> : <p className="stack nolink">No public link</p>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="stop" data-stop="today" id="today" aria-labelledby="h-today">
          <div className="col" data-body data-nopush>
            <Kicker n={5} id="h-today">Today</Kicker>
            {latest ? (
              <article className="note">
                <p className="ndate"><time dateTime={latest.date}>{formatDate(latest.date)}</time></p>
                {latest.body.map((b) => <p key={b.slice(0, 24)} className="nbody">{b}</p>)}
              </article>
            ) : (
              <article className="note is-wait"><p className="ndate">{loaded ? 'No note yet' : 'Fetching today'}</p><p className="nbody">{loaded ? 'The next one lands here.' : 'One moment.'}</p></article>
            )}
            {earlier.length > 0 && (
              <details className="earlier">
                <summary>Earlier notes <span>{earlier.length}</span></summary>
                <ol>{earlier.map((n) => <li key={n.date}><time dateTime={n.date}>{formatDate(n.date)}</time>{n.body.map((b) => <p key={b.slice(0, 24)}>{b}</p>)}</li>)}</ol>
              </details>
            )}
          </div>
          {flat && <Glyph chars={latest?.date.slice(8, 10) ?? 'T'} />}
        </section>

        <section className="stop" data-stop="github" id="github" aria-labelledby="h-github">
          <div className="col" data-body data-nopush>
            <Kicker n={6}>Live from GitHub</Kicker>
            <h2 id="h-github" className="big">{gh.activity.length ? 'Shipped lately' : 'On the bench'}</h2>
            {gh.activity.length > 0 && (
              <ol className="commits">
                {gh.activity.slice(0, 8).map((c) => (
                  <li key={c.href}><a href={c.href} rel="noopener"><span className="msg">{c.message}</span><span className="meta"><b>{c.repo}</b> {ago(c.at)}</span></a></li>
                ))}
              </ol>
            )}
            <ol className="repos">
              {gh.repos.slice(0, 6).map((r) => (
                <li key={r.name}><a href={r.href} rel="noopener"><span className="ini" aria-hidden="true">{r.name[0]}</span><span className="rn">{r.name}</span><span className="rd">{r.description ?? ''}</span>{r.language && <span className="rl">{r.language}</span>}</a></li>
              ))}
            </ol>
            <A className="go" href={GITHUB.href}>github.com/{GITHUB.user}</A>
          </div>
          {flat && <Glyph chars={gh.repos[0]?.name[0] ?? 'G'} />}
        </section>

        <section className="stop" data-stop="now" id="now" aria-labelledby="h-now">
          <div className="col" data-body data-nopush>
            <Kicker n={7}>Now</Kicker>
            <h2 id="h-now" className="big">{NOW.reading.title}</h2>
            <p className="body lead" data-rise>{NOW.reading.body}</p>
            <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            <div className="club" data-rise>
              <h3>{NOW.club.title}</h3>
              <p className="body">{NOW.club.body}</p>
            </div>
            <p className="status-line" data-rise>{NOW.status}</p>
            <div className="offrec">
              <p className="label">Off the record</p>
              <div className="lists">
                <div><h3>Likes</h3><ul>{LIKES.map((l) => <li key={l}>{l}</li>)}</ul></div>
                <div><h3>Dislikes</h3><ul>{DISLIKES.map((l) => <li key={l}>{l}</li>)}</ul></div>
                <div><h3>Favourites</h3><ul>{FAVOURITES.map((l) => <li key={l}>{l}</li>)}</ul></div>
                <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider} {c.title}</b> {c.note}</li>)}</ul></div>
              </div>
            </div>
          </div>
          {flat && <Glyph chars={'S'} />}
        </section>

        <section className="stop" data-stop="record" id="record" aria-labelledby="h-record">
          <div className="col" data-body data-nopush>
            <Kicker n={8} id="h-record">Record</Kicker>
            <ul className="stats">{STATS.map((s) => <li key={s.label}><b>{s.to}{s.suffix}</b><span>{s.label}</span></li>)}</ul>
            <ol className="honors">{HONORS.map((h) => <li key={h.what}><span className="hw">{h.what}</span><span className="hd">{h.detail}</span></li>)}</ol>
            <ul className="certs">
              {AWARDS.map((a) => (
                <li key={a.site}><a href={a.href} rel="noopener"><img src={BASE + a.img} alt={`Certificate: ${a.site}`} loading="lazy" width={600} height={850} /><span><b>{a.site}</b>{a.note}</span></a></li>
              ))}
            </ul>
          </div>
          {flat && <Glyph chars={'T'} />}
        </section>
      </main>

      <footer className="stop end" data-stop="end" id="contact">
        <div className="foot" data-body data-nopush>
          <Kicker n={9}>Contact</Kicker>
          <ul className="links">
            {LINKS.map((l) => <li key={l.label}><span className="label">{l.label}</span>{l.href ? <A href={l.href}>{l.value}</A> : <span className="val">{l.value}</span>}</li>)}
          </ul>
          <small>Draft 2 of the portfolio. Not the live site.</small>
        </div>
      </footer>
    </div>
  );
}
