// Draft 82, The flyer. He is starting a philosophy club, so the page is a wall of his flyers, each with
// tear-off tabs that are real links. The tab physics are remixed from React Bits TearTicket (see Tab.tsx).
import { useCallback, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import '@fontsource/anton/400.css';
import '@fontsource-variable/schibsted-grotesk/wght.css';
import '@fontsource-variable/schibsted-grotesk/wght-italic.css';
import './flyer.css';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { still } from '@/lib/utils';
import { Jolt, Tab, linesFor, taken } from './Tab';

const src = (p: string) => import.meta.env.BASE_URL + p;
type Ladder = { who: string; when: string; where: string };
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; ladders: Ladder[]; epigraph: { text: string; source: string }; doi: string; pages: number };
const wess = RESEARCH[1];
const team = DEBATE.team;
const NAV = [
  ['about', 'About'], ['today', 'Today'], ['work', 'Work'], ['research', 'Research'],
  ['github', 'GitHub'], ['record', 'Record'], ['contact', 'Contact'],
] as const;

type TabSpec = { href: string; lines?: string[] };
type Tone = 'white' | 'ink' | 'red';

/** One flyer stuck to the wall: flat paper, a tiny angle, and a row of tear-off tabs along its foot. */
function Flyer({ tone = 'white', tilt = 0, tabs = [], className = '', tabW, children, style }: {
  tone?: Tone; tilt?: number; tabs?: TabSpec[]; className?: string; tabW?: number; children: ReactNode; style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const spring = useRef({ y: 0, v: 0, raf: 0, last: 0 });
  const jolt = useCallback((k: number) => {
    if (still) return;
    const s = spring.current;
    s.v += 70 * k;
    if (s.raf) return;
    s.last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.034, (now - s.last) / 1000);
      s.last = now;
      s.v += (-520 * s.y - 26 * s.v) * dt;
      s.y += s.v * dt;
      if (ref.current) ref.current.style.translate = `0 ${s.y.toFixed(2)}px`;
      if (Math.abs(s.y) < 0.02 && Math.abs(s.v) < 0.3) {
        s.y = 0; s.v = 0; s.raf = 0;
        if (ref.current) ref.current.style.translate = '';
        return;
      }
      s.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);
  }, []);
  return (
    <Jolt.Provider value={jolt}>
      <div ref={ref} className={`fl-flyer is-${tone} ${className}`} style={{ '--tilt': `${tilt}deg`, ...style } as CSSProperties}>
        <div className="fl-body">{children}</div>
        {tabs.length > 0 && (
          <div className="fl-tabs" style={tabW ? ({ '--tab-w': `${tabW}px` } as CSSProperties) : undefined}>
            {tabs.map((t, i) => <Tab key={i} href={t.href} lines={t.lines ?? linesFor(t.href)} seed={i + 3} />)}
          </div>
        )}
      </div>
    </Jolt.Provider>
  );
}

function Today() {
  const { notes, loaded } = useNotes();
  const [pick, setPick] = useState(0);
  const note = notes[Math.min(pick, Math.max(0, notes.length - 1))];
  return (
    <section id="today" className="fl-sec fl-today" aria-labelledby="today-h">
      <Flyer tone="white" tilt={-0.5} className="fl-note">
        <h2 id="today-h" className="fl-kick">Today</h2>
        {note ? (
          <>
            <p className="fl-date">{formatDate(note.date)}</p>
            <div className="fl-note-body">{note.body.map((p, i) => <p key={i}>{p}</p>)}</div>
          </>
        ) : (
          <>
            <p className="fl-date">{loaded ? 'No note up yet' : 'Pinning up'}</p>
            <p className="fl-note-body"><span>{loaded ? 'Check back tomorrow.' : 'The latest note is on its way.'}</span></p>
          </>
        )}
      </Flyer>
      {notes.length > 1 && (
        <div className="fl-notes" role="group" aria-label="Earlier notes">
          {notes.slice(0, 12).map((n, i) => (
            <button key={n.date} type="button" className="fl-mini" aria-pressed={i === pick} onClick={() => setPick(i)} style={{ '--tilt': `${[0.8, -0.6, 0.4, -0.9][i % 4]}deg` } as CSSProperties}>
              <span className="fl-mini-d">{formatDate(n.date, { day: 'numeric', month: 'short' })}</span>
              <span className="fl-mini-b">{n.body[0]}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function GitHub() {
  const { repos, activity, live } = useGitHub();
  const list = repos.slice(0, 6);
  return (
    <section id="github" className="fl-sec" aria-labelledby="gh-h">
      <Flyer tone="ink" tilt={0.4} className="fl-gh" tabs={[{ href: GITHUB.href }, ...list.slice(0, 5).map((r) => ({ href: r.href, lines: ['github.com', r.name] }))]}>
        <div className="fl-gh-head">
          <h2 id="gh-h" className="fl-big">Live from GitHub</h2>
          <p className="fl-gh-who">{live ? 'Pushed lately, by wowneutral' : 'Repositories by wowneutral'}</p>
        </div>
        {activity.length > 0 && (
          <ol className="fl-commits">
            {activity.slice(0, 6).map((a, i) => (
              <li key={i}>
                <a href={a.href} target="_blank" rel="noopener noreferrer">
                  <span className="fl-c-msg">{a.message}</span>
                  <span className="fl-c-meta">{a.repo}, {ago(a.at)}</span>
                </a>
              </li>
            ))}
          </ol>
        )}
        <ul className="fl-repos">
          {list.map((r) => (
            <li key={r.name}>
              <a href={r.href} target="_blank" rel="noopener noreferrer">
                <span className="fl-r-name">{r.name}</span>
                {r.description && <span className="fl-r-desc">{r.description}</span>}
                <span className="fl-r-lang">{[r.language, r.pushedAt ? ago(r.pushedAt) : ''].filter(Boolean).join(', ')}</span>
              </a>
            </li>
          ))}
        </ul>
      </Flyer>
    </section>
  );
}

/** The tabs taken on this visit, lying where they fell under the last flyer. */
function Floor() {
  const list = useSyncExternalStore(taken.sub, taken.get, taken.get);
  if (!list.length) return <p className="fl-take fl-take-end">Take a tab.</p>;
  return (
    <div className="fl-floor" aria-hidden="true">
      {list.map((l, i) => (
        <span key={i} className="fl-slip" style={{ '--tilt': `${[1.6, -1.2, 0.7, -1.8, 1.1, -0.5][i % 6]}deg` } as CSSProperties}>
          {l.map((x, j) => <span key={j}>{x}</span>)}
        </span>
      ))}
    </div>
  );
}

export default function Page() {
  useVersion('flyer');
  const discord = LINKS.find((l) => !l.href);
  return (
    <div className="v-flyer">
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="fl-top">
        <h1 className="fl-name">{PERSON.name}</h1>
        <div className="fl-line">
          <div className="fl-line-l">
            <p>{PERSON.line}</p>
            <p className="fl-take">Take a tab.</p>
          </div>
          <nav className="fl-nav" aria-label="Sections">
            {NAV.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
          </nav>
        </div>
      </header>

      <main id="main">
        <div className="fl-hero">
          <Flyer tone="red" tilt={-1.2} className="fl-champ">
            <h2 className="fl-champ-h">Champion</h2>
            <ul className="fl-wins">
              {DEBATE.wins.map((w) => (
                <li key={w.where}><span className="fl-w-ev">{w.event}</span><span className="fl-w-at">{w.where}</span></li>
              ))}
            </ul>
            <p className="fl-champ-y">{DEBATE.wins[0].when}</p>
          </Flyer>
          <Flyer tone="white" tilt={0.9} className="fl-team" tabs={[{ href: team.href }, { href: team.href }, { href: team.href }]}>
            <h2 className="fl-team-h">{team.name}</h2>
            <p className="fl-role">{team.role}</p>
            <p>{team.line}</p>
          </Flyer>
          <Flyer tone="ink" tilt={-0.6} className="fl-club" tabs={[{ href: LINKS[0].href! }, { href: LINKS[0].href! }, { href: LINKS[0].href! }]}>
            <h2 className="fl-club-h">{NOW.club.title}</h2>
            <p>{NOW.club.body}</p>
          </Flyer>
        </div>

        <section id="about" className="fl-sec" aria-labelledby="about-h">
          <Flyer tone="white" tilt={0.5} className="fl-about" tabs={[{ href: 'https://mitez.org' }]} tabW={150}>
            <h2 id="about-h" className="fl-big">About</h2>
            <div className="fl-cols">
              {PERSON.about.map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <p className="fl-aside">{PERSON.aside}</p>
          </Flyer>
        </section>

        <section id="debate" className="fl-sec" aria-labelledby="debate-h">
          <Flyer tone="ink" tilt={-0.7} className="fl-debate" tabs={[{ href: team.href }, { href: team.github, lines: ['github.com', 'skeptical'] }]} tabW={170}>
            <h2 id="debate-h" className="fl-kick">Up next</h2>
            <ul className="fl-next">
              {DEBATE.next.map((n) => (
                <li key={n.where}><span className="fl-n-at">{n.where}</span><span className="fl-n-ev">{n.event}</span></li>
              ))}
            </ul>
            <div className="fl-debate-team">
              <p className="fl-role">{team.name}, {team.role.toLowerCase()}</p>
              <p>{team.record}</p>
            </div>
          </Flyer>
        </section>

        <Today />

        <section id="work" className="fl-sec" aria-labelledby="work-h">
          <h2 id="work-h" className="fl-wall-h">Work</h2>
          <div className="fl-work">
            {WORK.map((w, i) => (
              <Flyer key={w.slug} tone={i % 3 === 1 ? 'ink' : 'white'} tilt={[-0.8, 0.6, -0.4, 0.9, 0.5, -0.7, 0.3, -0.5][i]} className="fl-proj" tabs={w.href ? [{ href: w.href }] : []} tabW={180}>
                <img src={src(w.img)} alt={`${w.name}, screenshot`} loading="lazy" width={1200} height={750} />
                <h3 className="fl-p-name">{w.name}</h3>
                <p className="fl-p-kind">{w.kind}</p>
                <p>{w.line}</p>
                <p className="fl-p-stack">{w.stack}</p>
              </Flyer>
            ))}
          </div>
        </section>

        <section id="research" className="fl-sec fl-research" aria-labelledby="paper-h">
          <Flyer tone="white" tilt={-0.4} className="fl-paper" tabs={paper.links.map((l) => ({ href: l.href, lines: [l.label, new URL(l.href).hostname] }))}>
            <p className="fl-p-status">{paper.status}, {paper.pages} pages</p>
            <h2 id="paper-h" className="fl-paper-h">{paper.title}</h2>
            <blockquote className="fl-epi">
              <p>{paper.epigraph.text}</p>
              <cite>{paper.epigraph.source}</cite>
            </blockquote>
            <p className="fl-abstract">{paper.abstract}</p>
            <ol className="fl-ladder" aria-label="The three ladders">
              {[...paper.ladders].reverse().map((l) => (
                <li key={l.who}><span className="fl-l-who">{l.who}</span><span className="fl-l-at">{l.when}. {l.where}</span></li>
              ))}
            </ol>
            <p className="fl-keys"><span className="fl-role">Keywords</span> {paper.keywords.join(', ')}</p>
            <p className="fl-doi">DOI {paper.doi}</p>
          </Flyer>
          <Flyer tone="ink" tilt={1.1} className="fl-wess">
            <h3 className="fl-wess-h">{wess.short}</h3>
            <p className="fl-role">{wess.status}</p>
            <p>{wess.abstract}</p>
          </Flyer>
        </section>

        <GitHub />

        <section id="now" className="fl-sec" aria-labelledby="now-h">
          <Flyer tone="white" tilt={0.6} className="fl-now">
            <h2 id="now-h" className="fl-kick">{NOW.reading.title}</h2>
            <p className="fl-shelves">{NOW.reading.shelves.join('\n')}</p>
            <p>{NOW.reading.body}</p>
            <p className="fl-status">{NOW.status}</p>
          </Flyer>
        </section>

        <section id="record" className="fl-sec fl-record" aria-labelledby="record-h">
          <Flyer tone="white" tilt={-0.5} className="fl-honors">
            <h2 id="record-h" className="fl-big">Record</h2>
            <ol className="fl-hon">
              {HONORS.map((h) => <li key={h.what}><span className="fl-h-what">{h.what}</span><span className="fl-h-det">{h.detail}</span></li>)}
            </ol>
          </Flyer>
          <div className="fl-certs">
            {AWARDS.map((a, i) => (
              <Flyer key={a.site} tone="white" tilt={i ? 0.9 : -0.7} className="fl-cert" tabs={[{ href: a.href, lines: ['wdawards', '.com'] }]} tabW={120}>
                <a className="fl-cert-img" href={a.href} target="_blank" rel="noopener noreferrer">
                  <img src={src(a.img)} alt={`Certificate: ${a.site}, ${a.note}`} loading="lazy" width={800} height={1130} />
                </a>
                <h3 className="fl-cert-h">{a.site}</h3>
                <p>{a.note}</p>
              </Flyer>
            ))}
          </div>
        </section>

        <section id="off" className="fl-sec" aria-labelledby="off-h">
          <Flyer tone="white" tilt={0.4} className="fl-off">
            <h2 id="off-h" className="fl-kick">Off the record</h2>
            <div className="fl-off-cols">
              <div><h3>Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3>Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3>Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider} {c.title}</strong> {c.note}</li>)}</ul></div>
            </div>
          </Flyer>
        </section>

        <section id="contact" className="fl-sec fl-end" aria-labelledby="contact-h">
          <Flyer tone="ink" className="fl-last" tabs={LINKS.filter((l) => l.href).map((l) => ({ href: l.href!, lines: [l.label, ...linesFor(l.href!)] }))}>
            <h2 id="contact-h" className="fl-last-h">{NOW.club.title}</h2>
            <p className="fl-last-b">{NOW.club.body}</p>
            {discord && <p className="fl-discord"><span className="fl-role">{discord.label}</span> {discord.value}</p>}
          </Flyer>
          <Floor />
        </section>
      </main>

      <footer className="fl-foot">
        <p>Draft 82 of the portfolio. Not the live site.</p>
        <p>Tear-off tabs remixed from React Bits TearTicket. Set in Anton and Schibsted Grotesk.</p>
      </footer>
    </div>
  );
}
