// Draft 34, The fork. Polished tuning forks in pairs on a pale steel sweep. A vowel is two resonances:
// strike a pair at a vowel's first two formants and together they hum it. One pair per section.
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource-variable/eb-garamond';
import '@fontsource-variable/eb-garamond/wght-italic.css';
import '@fontsource-variable/hanken-grotesk';
import './fork.css';
import { Volume2, VolumeX, ArrowUpRight } from 'lucide-react';
import { AWARDS, CHAPTERS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { still } from '@/lib/utils';
import { S, makeRow, strikeForks, strikeStation, unlock, loadTone } from './plan';
import Still from './Still';

const Scene = lazy(() => import('./Scene'));
const src = (p: string) => import.meta.env.BASE_URL + p;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const paper = RESEARCH[0];
const wess = RESEARCH[1];
const debateTitle = CHAPTERS.find((c) => c.id === 'debate')!.title;

const WORK_V = ['ɪ', 'æ', 'ɑ', 'ɔ', 'ʊ', 'ʌ', 'ə', 'ø'];
const SPECS: (string | string[])[] = ['a', 'today', 'e', ['i', 'u'], 'ɛ', 'o', ...WORK_V, 'row', 'ɜ', 'y', 'œ', 'a'];
const AT = { hero: 0, today: 1, about: 2, debate: 3, team: 4, research: 5, work: 6, gh: 14, now: 15, record: 16, off: 17, end: 18 };

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

// The one text motion: the struck pair's heading trembles sideways, 1 to 2px, decaying over about a second.
const TREMOR = Array.from({ length: 46 }, (_, i) => { const t = (i / 45) * 1.1; return { transform: `translateX(${(1.8 * Math.exp(-3.4 * t) * Math.sin(2 * Math.PI * 9 * t)).toFixed(2)}px)` }; });

function Strike({ k, v, label }: { k: number; v: string; label?: string }) {
  return (
    <button type="button" className="fk-v" data-strike={k} aria-label={label ?? `Strike the ${v} pair`} onClick={() => { unlock(); strikeStation(k); }}>
      <span aria-hidden="true">{v}</span>
    </button>
  );
}

function Out({ href, children }: { href: string; children: React.ReactNode }) {
  return <a className="fk-a" href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">{children}<ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.6} /></a>;
}

export default function Fork() {
  useVersion('fork');
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const [gl] = useState(() => !still && hasWebGL() && !/flat/.test(location.search));
  const [sound, setSound] = useState(true);
  const [playing, setPlaying] = useState(-1);
  const day = new Date().getDate();
  const commits = gh.activity.slice(0, 10);
  const rowNames = commits.length ? commits.map((c) => c.repo) : gh.repos.slice(0, 8).map((r) => r.name);
  const rowKey = rowNames.join('|');
  const row = useMemo(() => makeRow(SPECS, day, rowNames), [rowKey, day]); // eslint-disable-line react-hooks/exhaustive-deps
  S.stations = row.stations; S.forks = row.forks;
  const timers = useRef<number[]>([]);
  const h1 = useRef<HTMLHeadingElement>(null);
  const hDebate = useRef<HTMLHeadingElement>(null);

  useEffect(() => { S.hits = []; }, [rowKey]);
  useEffect(() => {
    S.onStrike = (k, loud) => {
      const btn = document.querySelector<HTMLElement>(`.v-fork [data-strike="${k}"]`);
      if (btn) { btn.classList.remove('is-ringing'); void btn.offsetWidth; btn.classList.add('is-ringing'); window.setTimeout(() => btn.classList.remove('is-ringing'), loud ? 3200 : 2400); }
      if (still) return;
      const el = k === AT.hero ? h1.current : k === AT.debate ? hDebate.current : null;
      el?.animate(TREMOR, { duration: 1100, easing: 'linear' });
    };
    const warm = () => { void loadTone(); };
    window.addEventListener('pointerdown', warm, { once: true });
    return () => { S.onStrike = () => {}; window.removeEventListener('pointerdown', warm); timers.current.forEach(clearTimeout); };
  }, []);
  useEffect(() => { S.sound = sound; }, [sound]);

  const playWeek = useCallback(() => {
    unlock();
    timers.current.forEach(clearTimeout); timers.current = [];
    const st = S.stations[AT.gh];
    st.forks.forEach((fi, j) => {
      timers.current.push(window.setTimeout(() => { strikeForks([fi]); setPlaying(j); }, j * 340));
    });
    timers.current.push(window.setTimeout(() => setPlaying(-1), st.forks.length * 340 + 900));
  }, []);

  const strikeFork = (which: 0 | 1) => {
    unlock();
    const st = S.stations[S.cur]; if (!st) return;
    if (st.kind === 'row') { playWeek(); return; }
    const i = st.forks[which] ?? st.forks[0];
    strikeStation(S.cur, { fork: i });
  };

  const latest = notes[0];
  const earlier = notes.slice(1, 12);

  return (
    <div className={`v-fork${gl ? '' : ' is-still'}`}>
      <a className="skip-x" href="#main">Skip to content</a>
      <div className="fk-wrap">
        <aside className="fk-scene" aria-label="The row of tuning forks">
          {gl ? <Suspense fallback={<Still />}><Scene onRow={playWeek} rowKey={rowKey} /></Suspense> : <Still />}
          <div className="fk-tools">
            {gl && (
              <span className="fk-keys">
                <button type="button" className="fk-key sr-only focus:not-sr-only" onClick={() => strikeFork(0)}>Strike the tall fork</button>
                <button type="button" className="fk-key sr-only focus:not-sr-only" onClick={() => strikeFork(1)}>Strike the short fork</button>
              </span>
            )}
            <button type="button" className="fk-sound" aria-label="Sound" aria-pressed={sound} onClick={() => { setSound((s) => !s); }}>
              {sound ? <Volume2 aria-hidden="true" size={18} strokeWidth={1.6} /> : <VolumeX aria-hidden="true" size={18} strokeWidth={1.6} />}
              <span className="fk-sound-t" aria-hidden="true">Sound</span>
            </button>
          </div>
        </aside>

        <main id="main" className="fk-copy">
          <section className="fk-sec fk-hero" data-st={AT.hero} aria-label="Armaan Seth">
            <h1 ref={h1} className="fk-name">{PERSON.first}<br />{PERSON.last}</h1>
            <p className="fk-line">{PERSON.line}</p>
            <p className="fk-cue"><Strike k={AT.hero} v="a" /> <span>Strike a pair.</span></p>
          </section>

          <section className="fk-sec fk-today" data-st={AT.today} id="today" aria-labelledby="h-today">
            <div className="fk-hrow"><span className="fk-day" aria-hidden="true">{day}</span><h2 id="h-today" className="fk-h">Today</h2></div>
            {latest ? (
              <article className="fk-note">
                <p className="fk-date"><time dateTime={latest.date}>{formatDate(latest.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></p>
                {latest.body.map((p, i) => <p key={i} className="fk-note-p">{p}</p>)}
              </article>
            ) : (
              <article className="fk-note">
                <p className="fk-date">{loaded ? 'The notebook is open' : 'Fetching the latest note'}</p>
                <p className="fk-note-p">{loaded ? NOW.status : 'One moment while today’s note comes in.'}</p>
              </article>
            )}
            {earlier.length > 0 && (
              <div className="fk-earlier">
                <h3 className="fk-k">Earlier notes</h3>
                <ul>
                  {earlier.map((n) => (
                    <li key={n.date}>
                      <details>
                        <summary><time dateTime={n.date}>{formatDate(n.date)}</time><span className="fk-peek">{n.body[0]}</span></summary>
                        {n.body.map((p, i) => <p key={i}>{p}</p>)}
                      </details>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="fk-sec" data-st={AT.about} aria-labelledby="h-about">
            <div className="fk-hrow"><Strike k={AT.about} v="e" /><h2 id="h-about" className="fk-h">About</h2></div>
            {PERSON.about.map((p, i) => <p key={i} className="fk-p">{p}</p>)}
            <p className="fk-aside">{PERSON.aside}</p>
          </section>

          <section className="fk-sec fk-debate" data-st={AT.debate} id="debate" aria-labelledby="h-debate">
            <div className="fk-hrow"><Strike k={AT.debate} v="i u" label="Strike i u, both pairs at once" /><h2 id="h-debate" ref={hDebate} className="fk-h">{debateTitle}</h2></div>
            <ol className="fk-wins">
              {DEBATE.wins.map((w) => (
                <li key={w.where}>
                  <p className="fk-champ">{w.title}</p>
                  <p className="fk-event">{w.event}</p>
                  <p className="fk-where">{w.where}, {w.when}</p>
                </li>
              ))}
            </ol>
            <div className="fk-next">
              <h3 className="fk-k">Up next</h3>
              <ul>{DEBATE.next.map((n) => <li key={n.where}><span>{n.event}</span><span>{n.where}</span></li>)}</ul>
            </div>
          </section>

          <section className="fk-sec" data-st={AT.team} id="skeptical" aria-label="Skeptical, the team">
            <div className="fk-hrow"><Strike k={AT.team} v="ɛ" /><h2 id="h-team" className="fk-h">{DEBATE.team.name}</h2></div>
            <p className="fk-role">{DEBATE.team.role}</p>
            <p className="fk-p">{DEBATE.team.line}</p>
            <p className="fk-p fk-record">{DEBATE.team.record}</p>
            <p><Out href={DEBATE.team.href}>{host(DEBATE.team.href)}</Out></p>
          </section>

          <section className="fk-sec fk-research" data-st={AT.research} id="research" aria-labelledby="h-research">
            <div className="fk-hrow"><Strike k={AT.research} v="o" /><h2 id="h-research" className="fk-h fk-paper">{paper.title}</h2></div>
            <p className="fk-meta">{paper.status}{paper.pages ? `, ${paper.pages} pages` : ""}</p>
            <p className="fk-p">{paper.abstract}</p>
            <ul className="fk-keywords" aria-label="Keywords">{(paper.keywords ?? []).map((k) => <li key={k}>{k}</li>)}</ul>
            <ul className="fk-links">{paper.links.map((l) => <li key={l.label}><Out href={l.href}>{l.label}</Out></li>)}</ul>
            <div className="fk-wess">
              <h3 className="fk-h3">{wess.title}</h3>
              <p className="fk-meta">{wess.status}</p>
              <p className="fk-p">{wess.abstract}</p>
            </div>
          </section>

          {WORK.map((w, j) => (
            <section key={w.slug} className="fk-sec fk-work" data-st={AT.work + j} aria-labelledby={`h-${w.slug}`}>
              <div className="fk-hrow"><Strike k={AT.work + j} v={WORK_V[j]} /><h2 id={`h-${w.slug}`} className="fk-h">{w.name}</h2></div>
              <p className="fk-meta">{w.kind}</p>
              <figure className="fk-shot"><img src={src(w.img)} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={680} /></figure>
              <p className="fk-p">{w.line}</p>
              <p className="fk-stack">{w.stack}</p>
              {w.href && <p><Out href={w.href}>{host(w.href)}</Out></p>}
            </section>
          ))}

          <section className="fk-sec fk-gh" data-st={AT.gh} id="github" aria-labelledby="h-gh">
            <div className="fk-hrow"><h2 id="h-gh" className="fk-h">Live from GitHub</h2></div>
            <p className="fk-p">{commits.length ? 'One small fork per commit, tuned by the repo it went to.' : 'One small fork per repository, each tuned by its name.'}</p>
            <p><button type="button" className="fk-play" onClick={playWeek}>{commits.length ? 'Play the week' : 'Play the repos'}</button></p>
            {commits.length > 0 && (
              <ol className="fk-commits">
                {commits.map((c, j) => (
                  <li key={c.href} className={playing === j ? 'is-on' : ''}>
                    <a href={c.href} target="_blank" rel="noreferrer">{c.message}</a>
                    <span>{c.repo}, {ago(c.at)}</span>
                  </li>
                ))}
              </ol>
            )}
            <h3 className="fk-k">Repositories</h3>
            <ul className="fk-repos">
              {gh.repos.slice(0, 8).map((r, j) => (
                <li key={r.name} className={!commits.length && playing === j ? 'is-on' : ''}>
                  <a href={r.href} target="_blank" rel="noreferrer">{r.name}</a>
                  {r.description && <span className="fk-rd">{r.description}</span>}
                  {r.language && <span className="fk-rl">{r.language}</span>}
                </li>
              ))}
            </ul>
            <p><Out href={GITHUB.href}>{host(GITHUB.href)}</Out></p>
          </section>

          <section className="fk-sec" data-st={AT.now} id="now" aria-labelledby="h-now">
            <div className="fk-hrow"><Strike k={AT.now} v="ɜ" /><h2 id="h-now" className="fk-h">Now</h2></div>
            <p className="fk-status">{NOW.status}</p>
            <div className="fk-two">
              <div>
                <h3 className="fk-h3">{NOW.reading.title}</h3>
                <p className="fk-p">{NOW.reading.body}</p>
                <ul className="fk-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
              <div>
                <h3 className="fk-h3">{NOW.club.title}</h3>
                <p className="fk-p">{NOW.club.body}</p>
              </div>
            </div>
          </section>

          <section className="fk-sec" data-st={AT.record} id="record" aria-labelledby="h-record">
            <div className="fk-hrow"><Strike k={AT.record} v="y" /><h2 id="h-record" className="fk-h">Record</h2></div>
            <ul className="fk-honors">{HONORS.map((h) => <li key={h.what}><span>{h.what}</span><span>{h.detail}</span></li>)}</ul>
            <ul className="fk-awards">
              {AWARDS.map((a) => (
                <li key={a.site}>
                  <a href={a.href} target="_blank" rel="noreferrer">
                    <img src={src(a.img)} alt={`Certificate for ${a.site}`} loading="lazy" width={720} height={1018} />
                    <span className="fk-aw">{a.site}</span>
                    <span className="fk-awn">{a.note}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="fk-sec fk-off" data-st={AT.off} id="off" aria-labelledby="h-off">
            <div className="fk-hrow"><Strike k={AT.off} v="œ" /><h2 id="h-off" className="fk-h">Off the record</h2></div>
            <div className="fk-cols">
              <div><h3 className="fk-k">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="fk-k">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="fk-k">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="fk-k">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider}, {c.title}.</strong> {c.note}</li>)}</ul></div>
            </div>
          </section>

          <section className="fk-sec fk-end" data-st={AT.end} id="contact" aria-labelledby="h-contact">
            <div className="fk-hrow"><Strike k={AT.end} v="a" /><h2 id="h-contact" className="fk-h">Contact</h2></div>
            <ul className="fk-contact">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <span className="fk-cl">{l.label}</span>
                  {l.href ? <a href={l.href} target={l.href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">{l.value}</a> : <span>{l.value}</span>}
                </li>
              ))}
            </ul>
            <footer className="fk-foot">
              <p>Draft 34 of the portfolio. Not the live site.</p>
              <p>The row ends on the vowel it began with.</p>
            </footer>
          </section>
        </main>
      </div>
    </div>
  );
}
