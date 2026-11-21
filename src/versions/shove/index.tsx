// Draft 51: the shove. ARMAAN SETH. as heavy glossy letters in a dark studio (after Lusion's connectors,
// pmndrs/examples, MIT): shove them with the pointer and each one is pulled back to its own place in the name.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource/gloock/400.css';
import '@fontsource-variable/hanken-grotesk/wght.css';
import './shove.css';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, STATS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { ArrowUpRight } from 'lucide-react';
import GLYPHS from './glyphs.json';
import { makeCtrl, type Ctrl, type Mode } from './Scene';

const Studio = lazy(() => import('./Scene'));
const BASE = import.meta.env.BASE_URL;

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const Dot = () => <span className="dot" aria-hidden="true">.</span>;
const ext = (href: string) => (href.startsWith('http') ? { rel: 'noopener' } : {});

/** The name as flat Gloock outlines, for no WebGL or reduced motion. */
function FlatName({ small }: { small?: boolean }) {
  let pen = 0;
  const parts = 'ARMAAN SETH.'.split('').map((ch, i) => {
    if (ch === ' ') { pen += 300; return null; }
    const g = GLYPHS.glyphs.find((x) => x.ch === ch)!;
    const el = <path key={i} className={ch === '.' ? 'blue' : undefined} d={g.d} transform={`translate(${pen - g.x} 0)`} />;
    pen += g.advance + 50;
    return el;
  });
  return <svg className={small ? 'flatname small' : 'flatname'} viewBox={`-30 -800 ${pen + 10} 830`} aria-hidden="true" focusable="false">{parts}</svg>;
}

/** One studio canvas. It mounts once it is near the screen, and stops drawing when it leaves. */
function Stage({ mode, chars, phone, ctrl, label, mountAt = '200px' }: { mode: Mode; chars: string[]; phone: boolean; ctrl: Ctrl; label: string; mountAt?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const node = el.current; if (!node) return;
    const io = new IntersectionObserver(([e]) => {
      ctrl.seen = e.isIntersecting;
      if (e.isIntersecting) { setMounted(true); ctrl.wake(); } else ctrl.sleep();
    }, { rootMargin: mountAt, threshold: mode === 'end' ? 0.5 : 0 });
    io.observe(node);
    return () => io.disconnect();
  }, [ctrl, mode, mountAt]);
  useEffect(() => {
    const node = el.current; if (!node) return;
    let down = { x: 0, y: 0, t: 0 };
    const set = (e: PointerEvent) => {
      const r = node.getBoundingClientRect();
      ctrl.ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ctrl.ptr.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      ctrl.ptr.on = true; ctrl.ptr.t = performance.now();
      if (ctrl.seen) ctrl.wake();
    };
    const move = (e: PointerEvent) => { if (e.pointerType !== 'touch' || e.buttons) set(e); };
    const dn = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; if (e.pointerType !== 'touch') set(e); };
    const up = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < 8 && performance.now() - down.t < 450) ctrl.scatter();
      if (e.pointerType === 'touch') ctrl.ptr.on = false;
    };
    const leave = () => { ctrl.ptr.on = false; };
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerdown', dn);
    node.addEventListener('pointerup', up);
    node.addEventListener('pointerleave', leave);
    node.addEventListener('pointercancel', leave);
    return () => {
      node.removeEventListener('pointermove', move); node.removeEventListener('pointerdown', dn);
      node.removeEventListener('pointerup', up); node.removeEventListener('pointerleave', leave); node.removeEventListener('pointercancel', leave);
    };
  }, [ctrl]);
  return (
    <div className={`stage stage-${mode}`} ref={el}>
      <div className="canvas" role="img" aria-label={label}>
        {mounted && <Suspense fallback={null}><Studio mode={mode} chars={chars} phone={phone} ctrl={ctrl} /></Suspense>}
      </div>
    </div>
  );
}

/** A screenshot that gets shoved away from the pointer and springs back. */
function Shot({ src, alt, w, h }: { src: string; alt: string; w: number; h: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    if (still || e.pointerType === 'touch') return;
    const el = ref.current!, r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--rx', `${(y * 7).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${(-x * 9).toFixed(2)}deg`);
    el.style.setProperty('--tx', `${(-x * 14).toFixed(1)}px`);
    el.style.setProperty('--ty', `${(-y * 10).toFixed(1)}px`);
  };
  const leave = () => { const el = ref.current!; ['--rx', '--ry', '--tx', '--ty'].forEach((p) => el.style.removeProperty(p)); };
  return (
    <div className="shot" onPointerMove={move} onPointerLeave={leave}>
      <div className="plate" ref={ref}><img src={src} alt={alt} loading="lazy" decoding="async" width={w} height={h} /></div>
    </div>
  );
}

const SIZES: Record<string, [number, number]> = { drafts: [1200, 766], jarvis: [1200, 852], lastsearch: [1200, 692], lastseen: [1200, 670], mitez: [1200, 660], rogue: [1200, 662], skeptical: [1200, 660], spread: [1200, 660] };

export default function Shove() {
  useVersion('shove');
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  const flat = still || !webgl;
  const { notes, loaded } = useNotes();
  const gh = useGitHub();
  const hero = useMemo(makeCtrl, []), clump = useMemo(makeCtrl, []), end = useMemo(makeCtrl, []);

  useEffect(() => {
    let w = window.innerWidth;
    const on = () => { if ((w <= 820) !== (window.innerWidth <= 820)) setPhone(isPhone()); w = window.innerWidth; };
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // Type a letter of his name and that letter gets shoved.
  useEffect(() => {
    if (flat) return;
    const key = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const ch = e.key.toUpperCase();
      if (!/^[A-Z.]$/.test(ch)) return;
      for (const c of [hero, clump, end]) if (c.seen) c.shove(ch);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [flat, hero, clump, end]);

  const initials = useMemo(() => {
    const src = gh.activity.length ? gh.activity.slice(0, 24).map((a) => a.repo) : gh.repos.map((r) => r.name);
    return src.map((s) => (s[0] ?? '.').toUpperCase()).map((c) => (/^[A-Z]$/.test(c) ? c : '.'));
  }, [gh]);

  const [latest, ...earlier] = notes;
  const paper = RESEARCH[0], wess = RESEARCH[1];

  return (
    <div className={`v-shove${phone ? ' is-phone' : ''}${flat ? ' is-flat' : ''}`}>
      <a className="skip-x" href="#main">Skip to content</a>

      <header className="top" id="top">
        <a className="mark" href="#top">Armaan Seth<Dot /></a>
        <nav aria-label="Sections">
          <ul>
            <li><a href="#debate">Debate</a></li>
            <li><a href="#work">Work</a></li>
            <li className="wide-only"><a href="#research">Research</a></li>
            <li className="wide-only"><a href="#github">GitHub</a></li>
            <li><a href="#today">Today</a></li>
            <li className="wide-only"><a href="#contact">Contact</a></li>
          </ul>
        </nav>
      </header>

      <main id="main">
        <section className="hero" aria-labelledby="h-name">
          <h1 id="h-name" className="sr-only-x">{PERSON.name}</h1>
          {flat ? (
            <div className="stage stage-flat"><FlatName /></div>
          ) : (
            <Stage mode="name" chars={[]} phone={phone} ctrl={hero} mountAt="0px"
              label="His name, Armaan Seth, as eleven heavy glossy letters in a dark studio. Move the pointer through them to shove them apart; they pull themselves back into the name. Click to scatter them, or type a letter of the name to knock that letter loose." />
          )}
          <div className="band">
            <p className="line">{PERSON.line}</p>
            {!flat && <p className="hint">{phone ? 'Drag across the letters. Tap to scatter.' : 'Shove the letters. Click to scatter, or type one.'}</p>}
          </div>
        </section>

        <section className="sec debate" id="debate" aria-labelledby="h-debate">
          <h2 id="h-debate" className="head">Debate<Dot /></h2>
          <ol className="wins">
            {DEBATE.wins.map((w) => (
              <li key={w.where}>
                <p className="place">{w.where}<Dot /></p>
                <p className="what"><b>{w.title}</b><span>{w.event}</span><span>{w.when}</span></p>
              </li>
            ))}
          </ol>
          <div className="team">
            <div className="team-name">
              <p className="role">{DEBATE.team.role}</p>
              <h3>{DEBATE.team.name}<Dot /></h3>
              <a className="go" href={DEBATE.team.href} rel="noopener">skeptical.pages.dev</a>
            </div>
            <div className="team-body">
              <p className="lead">{DEBATE.team.line}</p>
              <p>{DEBATE.team.record}</p>
            </div>
          </div>
          <div className="next">
            <h3>Up next</h3>
            <ul>{DEBATE.next.map((n) => <li key={n.where}><b>{n.where}</b><span>{n.event}</span></li>)}</ul>
          </div>
        </section>

        <section className="sec about" id="about" aria-labelledby="h-about">
          <h2 id="h-about" className="head short">{PERSON.short.map((s) => <span key={s}>{s.replace('.', '')}<Dot /></span>)}</h2>
          <div className="about-body">
            {PERSON.about.map((p) => <p key={p.slice(0, 20)}>{p}</p>)}
            <p className="aside">{PERSON.aside}</p>
          </div>
        </section>

        <section className="sec work" id="work" aria-labelledby="h-work">
          <h2 id="h-work" className="head">Work<Dot /></h2>
          <ol className="works">
            {WORK.map((w) => (
              <li key={w.slug} className="piece">
                <Shot src={BASE + w.img} alt={`${w.name}, a screenshot`} w={SIZES[w.slug][0]} h={SIZES[w.slug][1]} />
                <div className="cap">
                  <p className="kind">{w.kind}</p>
                  <h3>{w.name}</h3>
                  <p className="wline">{w.line}</p>
                  <p className="stack">{w.stack}</p>
                  {w.href ? <a className="go" href={w.href} rel="noopener">Open {w.name}</a> : <p className="stack nolink">No public link</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="sec research" id="research" aria-labelledby="h-research">
          <h2 id="h-research" className="head">Research<Dot /></h2>
          <p className="status">{paper.status}{'pages' in paper ? `, ${paper.pages} pages` : ''}</p>
          <h3 className="ptitle">{paper.title}</h3>
          <div className="paper">
            <p className="abstract">{paper.abstract}</p>
            <div className="paper-side">
              <h4>Keywords</h4>
              <ul className="keys">{paper.keywords?.map((k) => <li key={k}>{k}</li>)}</ul>
              <h4>Read it</h4>
              <ul className="plinks">{paper.links.map((l) => <li key={l.label}><a href={l.href} rel="noopener">{l.label}<ArrowUpRight aria-hidden="true" size={22} strokeWidth={1.5} /></a></li>)}</ul>
            </div>
          </div>
          <div className="wess">
            <p className="status">{wess.status}</p>
            <h3>{wess.title}</h3>
            <p>{wess.abstract}</p>
          </div>
        </section>

        <section className="sec github" id="github" aria-labelledby="h-github">
          <h2 id="h-github" className="head">Live from GitHub<Dot /></h2>
          <div className="gh">
            {flat ? (
              <div className="stage stage-flatclump" aria-hidden="true">{initials.map((c, i) => <span key={i} className={`m${i % 4}`}>{c}</span>)}</div>
            ) : (
              <Stage mode="clump" chars={initials} phone={phone} ctrl={clump}
                label={gh.activity.length ? `A clump of ${initials.length} small glossy letters, one for each recent commit, named by the first letter of its repository. Move the pointer through it to shove it.` : 'A small clump of glossy letters, the initials of his repositories. Move the pointer through it to shove it.'} />
            )}
            <div className="gh-list">
              {gh.activity.length > 0 ? (
                <>
                  <h3>Latest commits</h3>
                  <ol className="commits">
                    {gh.activity.slice(0, 8).map((c) => (
                      <li key={c.href}><a href={c.href} rel="noopener"><span className="msg">{c.message}</span><span className="meta"><b>{c.repo}</b> {ago(c.at)}</span></a></li>
                    ))}
                  </ol>
                </>
              ) : (
                <p className="gh-note">One letter per repository. Each new commit adds one.</p>
              )}
              <h3>Repositories</h3>
              <ol className="repos">
                {gh.repos.slice(0, 6).map((r) => (
                  <li key={r.name}><a href={r.href} rel="noopener"><b>{r.name}</b>{r.description && <span>{r.description}</span>}{r.language && <i>{r.language}</i>}</a></li>
                ))}
              </ol>
              <a className="go" href={GITHUB.href} rel="noopener">github.com/{GITHUB.user}</a>
            </div>
          </div>
        </section>

        <section className="today" id="today" aria-labelledby="h-today">
          <div className="sec">
            <h2 id="h-today" className="head">Today<Dot /></h2>
            {latest ? (
              <article className="note">
                <p className="ndate"><time dateTime={latest.date}>{formatDate(latest.date)}</time></p>
                <div className="nbody">{latest.body.map((b) => <p key={b.slice(0, 24)}>{b}</p>)}</div>
              </article>
            ) : (
              <article className="note is-wait">
                <p className="ndate">{loaded ? 'No note yet' : 'Today'}</p>
                <div className="nbody"><p>{loaded ? 'The next note lands here.' : 'Fetching the latest note.'}</p></div>
              </article>
            )}
            {earlier.length > 0 && (
              <details className="earlier">
                <summary>Earlier notes <span>{earlier.length}</span></summary>
                <ol>{earlier.map((n) => <li key={n.date}><time dateTime={n.date}>{formatDate(n.date)}</time><div>{n.body.map((b) => <p key={b.slice(0, 24)}>{b}</p>)}</div></li>)}</ol>
              </details>
            )}
          </div>
        </section>

        <section className="sec now" id="now" aria-labelledby="h-now">
          <h2 id="h-now" className="head">Now<Dot /></h2>
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
          <p className="status-line">{NOW.status}</p>
        </section>

        <section className="sec record" id="record" aria-labelledby="h-record">
          <h2 id="h-record" className="head">Record<Dot /></h2>
          <ul className="stats">{STATS.map((s) => <li key={s.label}><b>{s.to}<span className="plus">{s.suffix}</span></b><span>{s.label}</span></li>)}</ul>
          <div className="record-grid">
            <ol className="honors">{HONORS.map((h) => <li key={h.what}><span>{h.what}</span><i>{h.detail}</i></li>)}</ol>
            <ul className="certs">
              {AWARDS.map((a) => (
                <li key={a.site}><a href={a.href} rel="noopener"><img src={BASE + a.img} alt={`WD Awards certificate for ${a.site}`} loading="lazy" decoding="async" width={720} height={1018} /><span><b>{a.site}</b>{a.note}</span></a></li>
              ))}
            </ul>
          </div>
        </section>

        <section className="sec off" id="off" aria-labelledby="h-off">
          <h2 id="h-off" className="head small">Off the record<Dot /></h2>
          <div className="off-grid">
            <div><h3>Likes</h3><ul>{LIKES.map((l) => <li key={l}>{l}</li>)}</ul></div>
            <div><h3>Dislikes</h3><ul>{DISLIKES.map((l) => <li key={l}>{l}</li>)}</ul></div>
            <div><h3>Favourites</h3><ul>{FAVOURITES.map((l) => <li key={l}>{l}</li>)}</ul></div>
            <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider} {c.title}</b> {c.note}</li>)}</ul></div>
          </div>
        </section>
      </main>

      <footer className="end" id="contact" aria-labelledby="h-contact">
        <div className="sec">
          <h2 id="h-contact" className="head">Contact<Dot /></h2>
          <ul className="links">
            {LINKS.map((l) => (
              <li key={l.label}><span className="lab">{l.label}</span>{l.href ? <a href={l.href} {...ext(l.href)}>{l.value}</a> : <span className="val">{l.value}</span>}</li>
            ))}
          </ul>
        </div>
        {flat ? (
          <div className="stage stage-flat stage-endflat"><FlatName small /></div>
        ) : (
          <Stage mode="end" chars={[]} phone={phone} ctrl={end} mountAt="0px" label="His name once more, small: the letters come in from the edges and lock into the word." />
        )}
        <p className="colophon">Draft 51 of the portfolio. Not the live site. Physics and studio light after Lusion's connectors example (pmndrs, MIT). Set in Gloock and Hanken Grotesk.</p>
      </footer>
    </div>
  );
}
