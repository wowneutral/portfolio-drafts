// Draft 61: the playground. Built on draft 2 (the letters: src/versions/letters/index.tsx). ARMAAN SETH. stands
// on a paper sweep among the real things he has made. Push anything and it falls and gets back up; click it
// and it goes where it says. The scroll walks the camera from thing to thing.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource/anton/400.css';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import './playground.css';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, STATS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { gsap, scrollToId } from '@/lib/scroll';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { AppleStill, FlatDesk } from './FlatDesk';
import { makePlan, PRINTS, STOPS } from './plan';
import { resetStage, stage } from './stage';

const Stage = lazy(() => import('./Stage'));
const BASE = import.meta.env.BASE_URL;
const READ = (phone: boolean) => (phone ? 0.74 : 0.5);

const A = ({ href, className, children, label }: { href: string; className?: string; children: React.ReactNode; label?: string }) => {
  const ext = href.startsWith('http');
  return <a className={className} href={href} aria-label={label} target={ext ? '_blank' : undefined} rel={ext ? 'noopener' : undefined}>{children}</a>;
};

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** The links laid over each thing in the scene: what it is, where it goes. */
const THING_LINKS: { id: string; href?: string; tag: string; label: string; ext?: boolean }[] = [
  { id: 'mitez', href: WORK[0].href, ext: true, tag: 'MITEZ, mitez.org, opens in a new tab', label: 'MITEZ, mitez.org, opens in a new tab' },
  { id: 'github', href: GITHUB.href, ext: true, tag: 'GitHub, github.com/wowneutral, opens in a new tab', label: 'GitHub, github.com/wowneutral, opens in a new tab' },
  { id: 'notepad', href: '#today', tag: 'Today’s note, read it in Today', label: 'Today’s note: go to Today' },
  { id: 'paper', href: '#research', tag: 'The paper, read it in Research', label: 'The paper, Not in Mauthner’s Sense: go to Research' },
  { id: 'envelope', href: LINKS[0].href, tag: 'Email, founder@mitez.org', label: 'Email Armaan at founder@mitez.org' },
  { id: 'plaque0', href: '#debate', tag: `Champion, ${DEBATE.wins[0].where}, see Debate`, label: `Champion, ${DEBATE.wins[0].event}, ${DEBATE.wins[0].where}: go to Debate` },
  { id: 'plaque1', href: '#debate', tag: `Champion, ${DEBATE.wins[1].where}, see Debate`, label: `Champion, ${DEBATE.wins[1].event}, ${DEBATE.wins[1].where}: go to Debate` },
  { id: 'skeptical', tag: 'Skeptical, drop an apple', label: 'The Skeptical question mark: drop an apple' },
  // The framed prints behind the name.
  ...WORK.filter((w) => (PRINTS as readonly string[]).includes(w.slug)).map((w) => w.href
    ? { id: 'print:' + w.slug, href: w.href, ext: true, tag: `${w.name}, ${w.href.replace(/^https:\/\//, '').replace(/\/$/, '')}, opens in a new tab`, label: `${w.name}, opens in a new tab` }
    : { id: 'print:' + w.slug, href: '#work', tag: `${w.name}, read about it in Work`, label: `${w.name}: go to Work` }),
];

export default function Playground() {
  useVersion('playground');
  const root = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  const flat = still || !webgl;
  const [live, setLive] = useState(false);
  const [apple, setApple] = useState<'none' | 'falling' | 'gone'>(flat ? 'gone' : 'none');
  const plan = useMemo(() => makePlan(phone), [phone]);
  const { notes, loaded } = useNotes();
  const gh = useGitHub();

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  const [latest, ...earlier] = notes;
  const day = latest ? formatDate(latest.date, { day: 'numeric', month: 'short' }).toUpperCase() : '';
  const counting = gh.live && gh.commitsThisMonth != null && gh.activity.length > 0;
  const ghN = String(counting ? gh.commitsThisMonth : gh.repos.length);
  const ghLabel = counting ? 'commits this month' : gh.live ? 'recent repos' : 'repos';

  // What the things print on themselves: today's note, the live number, one tile per commit.
  useEffect(() => {
    stage.print = {
      note: { day, year: latest?.date.slice(0, 4) ?? '', lines: latest?.body.join(' ') ?? '', loaded },
      gh: { n: ghN, label: ghLabel },
      tiles: gh.activity.length ? gh.activity.map((a) => a.repo[0] ?? '') : gh.repos.map((r) => r.name[0] ?? ''),
    };
    stage.printV++; stage.wake = Math.max(stage.wake, 10);
  }, [day, latest, loaded, ghN, ghLabel, gh]);

  // The opening: the flat desk first, then (fonts ready) the scene takes over and everything drops into place.
  useEffect(() => {
    if (flat) return;
    resetStage();
    stage.onApple = (s) => setApple(s);
    let alive = true;
    const go = () => { if (alive && !stage.go) { stage.go = true; stage.wake = Math.max(stage.wake, 90); setTimeout(() => alive && setLive(true), 120); } };
    const t0 = setTimeout(go, 1600);
    document.fonts.ready.then(() => setTimeout(go, 250));
    return () => { alive = false; clearTimeout(t0); stage.onApple = null; };
  }, [phone, flat]);

  // Measure where each section sits, so the camera knows when to hold and when to travel (from the letters draft).
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
  }, [phone, flat]);

  // The pointer shows a hand over a letter that can be pushed.
  useEffect(() => {
    const el = root.current; if (!el || flat) return;
    let over = false;
    const tick = () => { if (stage.over !== over) { over = stage.over; el.classList.toggle('can-push', over); } };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [flat]);

  // Type a letter of the name to knock it over.
  useEffect(() => {
    if (flat) return;
    const key = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const ch = e.key.toUpperCase();
      if (/^[A-Z.]$/.test(ch)) stage.cmds.push({ type: 'key', ch });
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [flat]);

  const open = (id: string, href: string | undefined, e: React.MouseEvent) => {
    if (stage.dragged) { stage.dragged = false; e.preventDefault(); return; }
    stage.cmds.push({ type: 'poke', id }); stage.wake = Math.max(stage.wake, 30);
    if (href?.startsWith('#')) { e.preventDefault(); const to = href.slice(1); setTimeout(() => scrollToId(to), id === 'notepad' || id === 'paper' ? 380 : 120); }
  };
  const hover = (id: string | null) => { stage.hover = id; stage.wake = Math.max(stage.wake, 30); const t = THING_LINKS.find((x) => x.id === id); if (t && stage.tag) stage.tag.textContent = t.tag; };

  const [w1, w2] = DEBATE.wins;
  const paper = RESEARCH[0], wess = RESEARCH[1];
  const doi = paper.links[0];

  return (
    <div className={`v-playground${live ? ' is-live' : ''}${phone ? ' is-phone' : ''}${flat ? ' is-flat' : ''}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      {!flat && (
        <div className="stage">
          <div className="gl" aria-hidden="true"><Suspense fallback={null}><Stage key={phone ? 'p' : 'd'} plan={plan} /></Suspense></div>
          <nav className="things" aria-label="His things on the desk">
            {THING_LINKS.map((t) => {
              const common = {
                'data-thing': t.id, className: 'thing', 'aria-label': t.label,
                ref: (el: HTMLElement | null) => { if (el) stage.links.set(t.id, el); else stage.links.delete(t.id); },
                onPointerEnter: () => hover(t.id), onPointerLeave: () => hover(null), onFocus: () => hover(t.id), onBlur: () => hover(null),
              };
              return t.href
                ? <a key={t.id} {...common} href={t.href} target={t.ext ? '_blank' : undefined} rel={t.ext ? 'noopener' : undefined} onClick={(e) => open(t.id, t.href, e)} />
                : <button key={t.id} {...common} type="button" onClick={(e) => open(t.id, undefined, e)} />;
            })}
          </nav>
          <p className="tag" aria-hidden="true" ref={(el) => { stage.tag = el; }} />
        </div>
      )}

      <main id="main">
        <section className="stop hero" data-stop="hero" id="top">
          <h1 className="sr-only-x">{PERSON.name}</h1>
          <div className="loader" aria-hidden={!flat || undefined}>
            <FlatDesk links={flat} day={day} ghN={ghN} ghLabel={ghLabel} />
          </div>
          <div className="under" data-nopush>
            <p className="line">{PERSON.line}</p>
            {!flat && <p className="hint">{phone ? 'Tap anything to go there.' : 'Push anything. Click it to go there.'}</p>}
          </div>
        </section>

        <section className="stop" data-stop="about" id="about" aria-labelledby="h-about">
          <div className="col" data-body data-nopush>
            <h2 id="h-about" className="big">{PERSON.short.map((s) => <span key={s}>{s}</span>)}</h2>
            {PERSON.about.map((p) => <p key={p.slice(0, 20)} className="body">{p}</p>)}
            <p className="aside">{PERSON.aside}</p>
          </div>
        </section>

        <section className="stop" data-stop="debate" id="debate" aria-labelledby="h-debate">
          <div className="col wide" data-body data-nopush>
            <h2 id="h-debate" className="label">Debate</h2>
            <ol className="wins">
              {[w1, w2].map((w) => (
                <li key={w.where}>
                  <p className="champ">{w.title}</p>
                  <p className="event">{w.event}</p>
                  <p className="where"><b>{w.where}</b> {w.when}</p>
                </li>
              ))}
            </ol>
            <div className="next">
              <h3 className="label">Up next</h3>
              <ul>{DEBATE.next.map((n) => <li key={n.where}><b>{n.where}</b><span>{n.event}</span></li>)}</ul>
            </div>
          </div>
        </section>

        <section className="stop" data-stop="skeptical" id="skeptical" aria-labelledby="h-skeptical">
          <div className="col" data-body data-nopush>
            <p className="role">{DEBATE.team.role}</p>
            <h2 id="h-skeptical" className="tname">{DEBATE.team.name}<span className="qm" aria-hidden="true">?</span></h2>
            <p className="body">{DEBATE.team.line}</p>
            <p className="body soft">{DEBATE.team.record}</p>
            <A className="go" href={DEBATE.team.href}>skeptical.pages.dev</A>
            <div className="apple" aria-live="polite">
              {flat && <AppleStill />}
              {apple === 'gone' && (
                <div className="lines">
                  <p>You saw an apple fall. Can you show it was ever there?</p>
                  <p>A skeptic does not say it wasn{'’'}t. A skeptic holds back from saying either.</p>
                  <p className="pair"><A className="go" href={DEBATE.team.href}>Skeptical</A><A className="go" href={doi.href}>The paper</A></p>
                </div>
              )}
              {!flat && apple !== 'gone' && (
                <button type="button" className="drop" onClick={() => { stage.cmds.push({ type: 'poke', id: 'skeptical' }); stage.wake = 30; }} disabled={apple === 'falling'}>
                  {apple === 'falling' ? 'Watch the paper' : 'Drop an apple'}
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="stop" data-stop="research" id="research" aria-labelledby="h-research">
          <div className="col" data-body data-nopush>
            <p className="role">{paper.status}{'pages' in paper ? `, ${paper.pages} pages` : ''}</p>
            <h2 id="h-research" className="ptitle">{paper.title}</h2>
            <p className="body lead">{paper.abstract}</p>
            <ul className="keys" aria-label="Keywords">{(paper.keywords ?? []).map((k) => <li key={k}>{k}</li>)}</ul>
            <ul className="plinks">{paper.links.map((l) => <li key={l.label}><A className="go" href={l.href}>{l.label}</A></li>)}</ul>
            <div className="wess">
              <p className="role">{wess.status}</p>
              <h3>{wess.title}</h3>
              <p className="body">{wess.abstract}</p>
            </div>
          </div>
        </section>

        <section className="stop" data-stop="work" id="work" aria-labelledby="h-work">
          <div className="col wide" data-body data-nopush>
            <h2 id="h-work" className="big">Things I made</h2>
            <ol className="prints">
              {WORK.map((w) => (
                <li key={w.slug} className="print">
                  <figure><img src={BASE + w.img} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={750} /></figure>
                  <div className="cap">
                    <p className="label">{w.kind}</p>
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
            <h2 id="h-today" className="label">Today</h2>
            {latest ? (
              <article className="note">
                <p className="ndate"><time dateTime={latest.date}>{formatDate(latest.date)}</time></p>
                {latest.body.map((b) => <p key={b.slice(0, 24)} className="nbody">{b}</p>)}
              </article>
            ) : (
              <article className="note is-wait">
                <p className="ndate">{loaded ? 'Nothing yet today' : 'Today'}</p>
                <p className="nbody">{loaded ? 'The next note goes on the pad first, then here.' : 'Opening the notepad.'}</p>
              </article>
            )}
            {earlier.length > 0 && (
              <details className="earlier">
                <summary>Earlier notes <span>{earlier.length}</span></summary>
                <ol>{earlier.map((n) => <li key={n.date}><time dateTime={n.date}>{formatDate(n.date)}</time>{n.body.map((b) => <p key={b.slice(0, 24)}>{b}</p>)}</li>)}</ol>
              </details>
            )}
          </div>
        </section>

        <section className="stop" data-stop="github" id="github" aria-labelledby="h-github">
          <div className="col" data-body data-nopush>
            <h2 id="h-github" className="label">Live from GitHub</h2>
            <p className="ghnum"><b>{ghN}</b><span>{ghLabel}</span></p>
            {gh.activity.length > 0 && (
              <ol className="commits">
                {gh.activity.slice(0, 8).map((c) => (
                  <li key={c.href}><a href={c.href} target="_blank" rel="noopener"><span className="msg">{c.message}</span><span className="meta"><b>{c.repo}</b> {ago(c.at)}</span></a></li>
                ))}
              </ol>
            )}
            <ol className="repos">
              {gh.repos.slice(0, 6).map((r) => (
                <li key={r.name}><a href={r.href} target="_blank" rel="noopener"><span className="ini" aria-hidden="true">{r.name[0]}</span><span className="rn">{r.name}</span><span className="rd">{r.description ?? ''}</span>{r.language && <span className="rl">{r.language}</span>}</a></li>
              ))}
            </ol>
            <A className="go" href={GITHUB.href}>github.com/{GITHUB.user}</A>
          </div>
        </section>

        <section className="stop" data-stop="now" id="now" aria-labelledby="h-now">
          <div className="col" data-body data-nopush>
            <h2 id="h-now" className="big">{NOW.reading.title}</h2>
            <p className="body lead">{NOW.reading.body}</p>
            <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            <div className="club">
              <h3>{NOW.club.title}</h3>
              <p className="body">{NOW.club.body}</p>
            </div>
            <p className="status-line">{NOW.status}</p>
            <div className="offrec">
              <h3 className="label">Off the record</h3>
              <div className="lists">
                <div><h4>Likes</h4><ul>{LIKES.map((l) => <li key={l}>{l}</li>)}</ul></div>
                <div><h4>Dislikes</h4><ul>{DISLIKES.map((l) => <li key={l}>{l}</li>)}</ul></div>
                <div><h4>Favourites</h4><ul>{FAVOURITES.map((l) => <li key={l}>{l}</li>)}</ul></div>
                <div><h4>Courses</h4><ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider} {c.title}</b> {c.note}</li>)}</ul></div>
              </div>
            </div>
          </div>
        </section>

        <section className="stop" data-stop="record" id="record" aria-labelledby="h-record">
          <div className="col" data-body data-nopush>
            <h2 id="h-record" className="big">Record</h2>
            <ul className="stats">{STATS.map((s) => <li key={s.label}><b>{s.to}{s.suffix}</b><span>{s.label}</span></li>)}</ul>
            <ol className="honors">{HONORS.map((h) => <li key={h.what}><span className="hw">{h.what}</span><span className="hd">{h.detail}</span></li>)}</ol>
            <ul className="certs">
              {AWARDS.map((a) => (
                <li key={a.site}><a href={a.href} target="_blank" rel="noopener"><img src={BASE + a.img} alt={`Certificate: ${a.site}`} loading="lazy" width={720} height={1018} /><span><b>{a.site}</b>{a.note}</span></a></li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="stop end" data-stop="end" id="contact">
        <div className="foot" data-body data-nopush>
          <h2 className="big">Write to me</h2>
          <ul className="links">
            {LINKS.map((l) => <li key={l.label}><span className="label">{l.label}</span>{l.href ? <A href={l.href}>{l.value}</A> : <span className="val">{l.value}</span>}</li>)}
          </ul>
          <div className="colo">
            <small>Draft 61 of the portfolio. Not the live site.</small>
            <small>Built on draft 2, the letters, with the light and the push after the pmndrs examples (MIT). GitHub mark from primer/octicons (MIT).</small>
          </div>
        </div>
      </footer>
    </div>
  );
}
