// The watch, draft 62. Stage remixed from pmndrs/examples "bouncy-watch" (MIT); the model is the Khronos ChronographWatch.
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import './watch.css';
import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { gsap } from '@/lib/scroll';
import { isPhone, still } from '@/lib/utils';
import { PERSON, CHAPTERS, DEBATE, RESEARCH, WORK, HONORS, AWARDS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { chrono, elapsed, film, fmt, getMode, subscribe, toggle } from './clock';
import Dial from './Dial';

const Stage = lazy(() => import('./Stage'));
const BASE = import.meta.env.BASE_URL;

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const ext = (href: string) => (href.startsWith('http') ? { rel: 'noopener' } : {});
const host = (href: string) => href.replace(/^https:\/\//, '').replace(/\/$/, '');

// His own words, lifted from the About paragraphs.
const SAID = (() => { const m = PERSON.about[0].match(/an LD round is really[^.]*/); const t = m ? m[0] : PERSON.about[0]; return t[0].toUpperCase() + t.slice(1) + '.'; })();
const [BUILD, MITEZ_LINE] = (() => { const p = PERSON.about[1]; const i = p.indexOf('MITEZ is'); return i > 0 ? [p.slice(0, i).trim(), p.slice(i)] : [p, '']; })();
const [MITEZ_LEAD, MITEZ_TIME] = (() => { const i = MITEZ_LINE.indexOf(': '); return i > 0 ? [MITEZ_LINE.slice(0, i + 1), MITEZ_LINE.slice(i + 2)] : [MITEZ_LINE, '']; })();
const TIME_LINE = MITEZ_TIME ? MITEZ_TIME[0].toUpperCase() + MITEZ_TIME.slice(1) : '';

const BUILDS = (CHAPTERS.find((c) => c.id === 'builds')?.body ?? '').split('. ')[0].replace(/\.?$/, '.');

const NAV = [
  { id: 'about', label: 'About', owns: ['top', 'about', 'mitez'] },
  { id: 'debate', label: 'Debate', owns: ['debate'] },
  { id: 'research', label: 'Research', owns: ['research'] },
  { id: 'work', label: 'Work', owns: ['work'] },
  { id: 'today', label: 'Today', owns: ['today', 'github'] },
  { id: 'record', label: 'Record', owns: ['record', 'off'] },
  { id: 'contact', label: 'Contact', owns: ['contact'] },
];

function Readout() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let last = '';
    const tick = () => { const t = fmt(elapsed()); if (t !== last && ref.current) { ref.current.textContent = t; last = t; } };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);
  return <span ref={ref} className="w-elapsed">0:00.0</span>;
}

function Start({ flat }: { flat: boolean }) {
  const mode = useSyncExternalStore(subscribe, getMode, getMode);
  const running = mode === 'run';
  return (
    <div className="w-run">
      <button type="button" className="w-start" aria-pressed={running} onClick={toggle} data-on={running || undefined}>
        <span className="w-start-dot" aria-hidden="true" />
        {running ? 'Stop' : mode === 'held' ? 'Start again' : 'Start'}
      </button>
      <p className="w-read" role="timer" aria-label="Chronograph"><Readout /></p>
      <p className="w-hint">{flat ? 'The chronograph runs here while the watch rests.' : 'Drag the watch to turn it. The pusher on its side works too.'}</p>
    </div>
  );
}

function Today() {
  const { notes, loaded } = useNotes();
  const [latest, ...earlier] = notes;
  return (
    <section id="today" data-view="face" className="w-sec w-today" aria-labelledby="h-today">
      <h2 id="h-today" className="w-h2">Today</h2>
      {latest ? (
        <article className="w-note">
          <p className="w-date"><time dateTime={latest.date}>{formatDate(latest.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></p>
          {latest.body.map((p, i) => <p key={i} className="w-note-body">{p}</p>)}
        </article>
      ) : (
        <article className="w-note" aria-busy={!loaded}>
          <p className="w-date">{loaded ? 'Right now' : 'The note for today is on its way'}</p>
          <p className="w-note-body">{NOW.status}</p>
        </article>
      )}
      {earlier.length > 0 && (
        <details className="w-earlier">
          <summary>Earlier notes <span aria-hidden="true">{earlier.length}</span></summary>
          <ol>
            {earlier.map((n) => (
              <li key={n.date}>
                <p className="w-date"><time dateTime={n.date}>{formatDate(n.date)}</time></p>
                {n.body.map((p, i) => <p key={i}>{p}</p>)}
              </li>
            ))}
          </ol>
        </details>
      )}
      <div className="w-now">
        <h3 className="w-h3">Now</h3>
        <div className="w-now-item">
          <p className="w-now-t">{NOW.reading.title}</p>
          <p>{NOW.reading.body}</p>
          <ul className="w-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
        <div className="w-now-item">
          <p className="w-now-t">{NOW.club.title}</p>
          <p>{NOW.club.body}</p>
        </div>
        <p className="w-status">{NOW.status}</p>
      </div>
    </section>
  );
}

function GitHub() {
  const { repos, activity, live } = useGitHub();
  return (
    <section id="github" data-view="low" className="w-sec w-gh" aria-labelledby="h-gh">
      <h2 id="h-gh" className="w-h2">Live from GitHub</h2>
      <p className="w-lede">What he is building, as it lands. <a href={GITHUB.href} {...ext(GITHUB.href)}>github.com/{GITHUB.user}</a></p>
      {activity.length > 0 && (
        <>
          <h3 className="w-h3">Latest commits</h3>
          <ol className="w-log">
            {activity.slice(0, 6).map((c, i) => (
              <li key={c.href + i}>
                <span className="w-log-at">{ago(c.at)}</span>
                <a className="w-log-msg" href={c.href} {...ext(c.href)}>{c.message}</a>
                <span className="w-log-repo">{c.repo}</span>
              </li>
            ))}
          </ol>
        </>
      )}
      <h3 className="w-h3">{live ? 'Recently pushed' : 'Repositories'}</h3>
      <ol className="w-repos">
        {repos.slice(0, 6).map((r) => (
          <li key={r.name}>
            <a href={r.href} {...ext(r.href)}>{r.name}</a>
            {r.description && <p>{r.description}</p>}
            <span className="w-repo-meta">{[r.language, r.pushedAt ? ago(r.pushedAt) : null].filter(Boolean).join(', ')}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function Watch() {
  useVersion('watch');
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  const flat = still || !webgl;
  const [active, setActive] = useState('about');
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onR = () => setPhone(isPhone());
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  // The film: which section holds the line, and how far the camera is into the next view.
  useEffect(() => {
    let secs: { id: string; view: string; top: number }[] = [];
    const measure = () => { secs = [...document.querySelectorAll<HTMLElement>('.v-watch [data-view]')].map((el) => ({ id: el.id, view: el.dataset.view!, top: el.getBoundingClientRect().top + window.scrollY })); };
    measure();
    const iv = window.setInterval(measure, 1200);
    window.addEventListener('resize', measure);
    let lastId = '';
    const tick = () => {
      if (!secs.length) return;
      const vh = window.innerHeight, line = window.scrollY + vh * (isPhone() ? 0.62 : 0.45), lead = vh * 0.6;
      let i = 0;
      while (i + 1 < secs.length && secs[i + 1].top <= line) i++;
      const cur = secs[i], prev = secs[i - 1], next = secs[i + 1];
      if (prev && prev.view === 'corner' && line - cur.top < vh * 0.5) { film.a = 'corner'; film.b = cur.view; film.k = smoothK((line - cur.top) / (vh * 0.5)); }
      else if (next && cur.view !== 'corner') { film.a = cur.view; film.b = next.view; film.k = smoothK((line - (next.top - lead)) / lead); }
      else { film.a = film.b = cur.view; film.k = 0; }
      film.id = cur.id; chrono.section = cur.id;
      if (cur.id !== lastId) {
        lastId = cur.id;
        root.current?.setAttribute('data-sec', cur.id);
        const n = NAV.find((x) => x.owns.includes(cur.id));
        setActive(n ? n.id : '');
      }
    };
    gsap.ticker.add(tick);
    tick();
    return () => { gsap.ticker.remove(tick); window.clearInterval(iv); window.removeEventListener('resize', measure); };
  }, []);

  const paper = RESEARCH[0];
  const wess = RESEARCH[1];
  const mitez = CHAPTERS.find((c) => c.id === 'mitez')!;

  return (
    <div className="v-watch" ref={root} data-sec="top" data-flat={flat || undefined}>
      <a className="skip-x" href="#main">Skip to content</a>

      <aside className="w-stage" aria-label="The watch">
        {flat ? <Dial /> : (
          <>
            <Dial placeholder />
            <Suspense fallback={null}>
              <Stage phone={phone} still={still} />
            </Suspense>
          </>
        )}
        <div className="w-vig" aria-hidden="true" />
      </aside>

      <nav className="w-nav" aria-label="Sections">
        <ol>
          {NAV.map((n) => (
            <li key={n.id}><a href={`#${n.id}`} aria-current={active === n.id ? 'location' : undefined}>{n.label}</a></li>
          ))}
        </ol>
      </nav>

      <main id="main" className="w-col">
        <header id="top" data-view="open" className="w-sec w-open">
          <h1 className="w-name"><span>{PERSON.first}</span> <span>{PERSON.last}</span></h1>
          <p className="w-line">{PERSON.line}</p>
          <blockquote className="w-said"><p>{SAID}</p></blockquote>
          <Start flat={flat} />
        </header>

        <section id="about" data-view="crown" className="w-sec" aria-labelledby="h-about">
          <h2 id="h-about" className="w-h2">About</h2>
          <p className="w-big">{PERSON.about[0]}</p>
          <p className="w-aside">{PERSON.aside}</p>
        </section>

        <section id="mitez" data-view="side" className="w-sec w-mitez" aria-labelledby="h-mitez">
          <h2 id="h-mitez" className="w-h2">Building, and MITEZ</h2>
          <p>{BUILD}</p>
          <p>{MITEZ_LEAD}</p>
          <p className="w-time">{TIME_LINE}</p>
          <p className="w-mitez-body">{mitez.body} <a href={WORK[0].href} {...ext(WORK[0].href)}>mitez.org</a></p>
        </section>

        <section id="debate" data-view="macro" className="w-sec w-debate" aria-labelledby="h-debate">
          <h2 id="h-debate" className="w-h2">Debate</h2>
          {DEBATE.wins.map((w) => (
            <article key={w.where} className="w-win">
              <p className="w-win-t">{w.title}</p>
              <h3 className="w-win-e">{w.event}</h3>
              <p className="w-win-w">{w.where}, {w.when}</p>
            </article>
          ))}
          <article className="w-team">
            <p className="w-role">{DEBATE.team.role}</p>
            <h3 className="w-team-n">{DEBATE.team.name}</h3>
            <p>{DEBATE.team.line}</p>
            <p className="w-record-line">{DEBATE.team.record}</p>
            <p><a href={DEBATE.team.href} {...ext(DEBATE.team.href)}>{host(DEBATE.team.href)}</a></p>
          </article>
          <div className="w-next">
            <h3 className="w-h3">Up next</h3>
            <ul>
              {DEBATE.next.map((n) => <li key={n.where}><span>{n.event}</span> <span className="w-at">{n.where}</span></li>)}
            </ul>
          </div>
        </section>

        <section id="research" data-view="back" className="w-sec w-research" aria-labelledby="h-research">
          <h2 id="h-research" className="w-h2">Research</h2>
          <p className="w-status-l">{paper.status}</p>
          <h3 className="w-paper">{paper.title}</h3>
          <p className="w-abs">{paper.abstract}</p>
          {'keywords' in paper && paper.keywords && (
            <p className="w-keys"><span className="sr-only-x">Keywords: </span>{paper.keywords.join(' / ')}</p>
          )}
          <ul className="w-links">
            {paper.links.map((l) => <li key={l.label}><a href={l.href} {...ext(l.href)}>{l.label}</a></li>)}
          </ul>
          {'epigraph' in paper && paper.epigraph && (
            <figure className="w-epi">
              <blockquote><p>{paper.epigraph.text}</p></blockquote>
              <figcaption>{paper.epigraph.source}</figcaption>
            </figure>
          )}
          <div className="w-wess">
            <h3 className="w-h3">{wess.title}</h3>
            <p className="w-status-l">{wess.status}</p>
            <p>{wess.abstract}</p>
          </div>
        </section>

        <section id="work" data-view="corner" className="w-sec w-work" aria-labelledby="h-work">
          <div className="w-work-head">
            <h2 id="h-work" className="w-h2">Work</h2>
            <p className="w-big">{BUILDS}</p>
          </div>
          <ul className="w-prints">
            {WORK.map((w) => (
              <li key={w.slug} className="w-print">
                <figure>
                  <div className="w-print-img"><img style={w.slug === 'mitez' ? { objectPosition: '50% 50%' } : undefined} src={BASE + w.img} alt={`${w.name}, screenshot`} loading="lazy" decoding="async" width={1200} height={720} /></div>
                  <figcaption>
                    <h3 className="w-print-n">{w.name}</h3>
                    <p className="w-print-k">{w.kind}</p>
                    <p>{w.line}</p>
                    <p className="w-print-s">{w.stack}</p>
                    {w.href && <p className="w-print-a"><a href={w.href} {...ext(w.href)}>{host(w.href)}</a></p>}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </section>

        <Today />
        <GitHub />

        <section id="record" data-view="bezel" className="w-sec w-record" aria-labelledby="h-record">
          <h2 id="h-record" className="w-h2">Record</h2>
          <ol className="w-honors">
            {HONORS.map((h) => <li key={h.what}><span>{h.what}</span> <span className="w-at">{h.detail}</span></li>)}
          </ol>
          <ul className="w-awards">
            {AWARDS.map((a) => (
              <li key={a.site}>
                <a href={a.href} {...ext(a.href)}>
                  <img src={BASE + a.img} alt={`Certificate: ${a.site}`} loading="lazy" decoding="async" width={720} height={1018} />
                  <span className="w-award-n">{a.site}</span>
                  <span className="w-at">{a.note}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section id="off" data-view="band" className="w-sec w-off" aria-labelledby="h-off">
          <h2 id="h-off" className="w-h2">Off the record</h2>
          <div className="w-off-grid">
            <div><h3 className="w-h3">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="w-h3">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="w-h3">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="w-h3">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><span>{c.provider}, {c.title}.</span> <span className="w-at">{c.note}</span></li>)}</ul></div>
          </div>
        </section>

        <section id="contact" data-view="top" className="w-sec w-contact" aria-labelledby="h-contact">
          <h2 id="h-contact" className="w-end">Time.</h2>
          <ul className="w-contacts">
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="w-at">{l.label}</span>
                {l.href ? <a href={l.href} {...ext(l.href)}>{l.value}</a> : <span>{l.value}</span>}
              </li>
            ))}
          </ul>
        </section>

        <footer className="w-foot">
          <p>Draft 62 of the portfolio. Not the live site.</p>
          <p>Watch: “Chronograph Watch Mudmaster” by graphiccompressor, CC BY 4.0, optimised by the Khronos Group glTF Sample Assets. Staging after the pmndrs bouncy watch example, MIT.</p>
        </footer>
      </main>
    </div>
  );
}

function smoothK(t: number) { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); }
