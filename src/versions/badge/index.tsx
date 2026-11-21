// Draft 80: the badge. Two tournament badges with his name, Competitor and Coach, hang on
// lanyards (React Bits Lanyard, remixed). The page below is printed like the badges.
import { useEffect, useRef, useState } from 'react';
import '@fontsource/anton/400.css';
import '@fontsource-variable/hanken-grotesk';
import './badge.css';
import {
  PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB, CHAPTERS,
} from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import Badge, { type Print } from './Badge';
import { coachBack, coachFront, competitorBack, competitorFront, nextBack } from './faces';

const BASE = import.meta.env.BASE_URL;
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; epigraph: { text: string; source: string }; pages: number };
const wess = RESEARCH[1];
const debate = CHAPTERS.find((c) => c.id === 'debate')!;

const COMPETITOR: Print = {
  kicker: 'Debater', first: PERSON.first, last: PERSON.last, role: 'Competitor', sub: 'Lincoln-Douglas',
  back: { head: 'Lincoln-Douglas, 2026', lines: DEBATE.wins.map((w) => ({ big: w.title, strong: w.event, text: `${w.where}, ${w.when}` })) },
};
const COACH: Print = {
  kicker: 'Skeptical', first: PERSON.first, last: PERSON.last, role: 'Coach', sub: `${DEBATE.team.name}, ${DEBATE.team.role.toLowerCase()}`,
  back: { head: DEBATE.team.role, lines: [{ big: DEBATE.team.name, text: DEBATE.team.record }] },
};
const COACH_NEXT: Print = {
  ...COACH,
  back: { head: DEBATE.team.name, lines: [{ big: 'Up next' }, ...DEBATE.next.map((n) => ({ strong: n.where, text: n.event }))] },
};

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** True once the element has come near the viewport (never goes back). */
function useArrived<T extends Element>(margin = '0px 0px -25% 0px') {
  const ref = useRef<T>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || on) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [on, margin]);
  return [ref, on] as const;
}

const Ext = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
  <a className={className ?? 'ln'} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

type RackProps = { flat: boolean; ready: boolean; phone: boolean; big?: boolean; low?: boolean; flipFirst?: number; flipSecond?: number; second?: Print; secondBack?: typeof coachBack; label: string; middle?: React.ReactNode; intro?: boolean };

function Rack({ flat, ready, phone, big, low, flipFirst, flipSecond, second = COACH, secondBack = coachBack, label, middle, intro = true }: RackProps) {
  const size = phone ? 0.52 : big ? 0.47 : low ? 0.62 : 0.64;
  const strap = phone ? 0.3 : low ? 0.42 : big ? 0.2 : 0.28;
  const show = flat || ready;
  return (
    <div className={`rack${big ? ' rack-big' : ''}${low ? ' rack-low' : ''}${flat ? ' rack-flat' : ''}`} role={middle ? undefined : 'group'} aria-label={middle ? undefined : label}>
      <div className="slot slot-a">{show && <Badge print={COMPETITOR} front={competitorFront} back={competitorBack} strap="#141414" flat={flat} size={size} strapLength={strap} side={-1} autoFlip={flipFirst} intro={intro} />}</div>
      {middle}
      <div className="slot slot-b">{show && <Badge print={second} front={coachFront} back={secondBack} strap="#c8321e" flat={flat} size={size} strapLength={strap} side={1} autoFlip={flipSecond} intro={intro} />}</div>
    </div>
  );
}

function Today() {
  const { notes, loaded } = useNotes();
  const [open, setOpen] = useState<string | null>(null);
  const latest = notes[0];
  const rest = notes.slice(1);
  return (
    <section className="sec today" id="today" aria-labelledby="today-h">
      <h2 className="h2" id="today-h">Today</h2>
      <article className="card note-card" aria-live="polite">
        {latest ? (
          <>
            <p className="note-date"><time dateTime={latest.date}>{formatDate(latest.date)}</time></p>
            {latest.body.map((p, i) => <p className="note-body" key={i}>{p}</p>)}
          </>
        ) : (
          <>
            <p className="note-date">{loaded ? 'No note yet' : 'The latest note'}</p>
            <p className="note-body note-wait">{loaded ? 'Nothing posted yet. Check back tomorrow.' : 'Loading today’s note.'}</p>
          </>
        )}
      </article>
      {rest.length > 0 && (
        <>
          <h3 className="h3 earlier-h">Earlier notes</h3>
          <ul className="stack">
            {rest.map((n) => {
              const isOpen = open === n.date;
              return (
                <li key={n.date} className={`card stack-card${isOpen ? ' is-open' : ''}`}>
                  <button type="button" className="stack-key" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : n.date)}>
                    <time dateTime={n.date}>{formatDate(n.date)}</time>
                    <span className="stack-mark" aria-hidden="true">{isOpen ? 'Close' : 'Read'}</span>
                  </button>
                  {isOpen && <div className="stack-body">{n.body.map((p, i) => <p key={i}>{p}</p>)}</div>}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

function GitHubSheet() {
  const gh = useGitHub();
  const repos = gh.repos.length ? gh.repos : GITHUB.repos;
  return (
    <article className="card sheet" aria-labelledby="gh-h">
      <h2 className="h2 sheet-h" id="gh-h">Live from GitHub</h2>
      <p className="sheet-sub">
        {gh.live && gh.commitsThisMonth != null ? `${gh.commitsThisMonth} commits this month, ` : 'What he is building, '}
        <Ext href={GITHUB.href}>github.com/{GITHUB.user}</Ext>
      </p>
      {gh.activity.length > 0 && (
        <>
          <h3 className="sheet-cap">Recent commits</h3>
          <ol className="rows">
            {gh.activity.slice(0, 6).map((a, i) => (
              <li className="row" key={i}>
                <a className="row-main" href={a.href} rel="noopener">{a.message}</a>
                <span className="row-meta">{a.repo}, {ago(a.at)}</span>
              </li>
            ))}
          </ol>
        </>
      )}
      <h3 className="sheet-cap">Repositories</h3>
      <ol className="rows">
        {repos.slice(0, 6).map((r) => (
          <li className="row" key={r.name}>
            <a className="row-main" href={r.href} rel="noopener">{r.name}</a>
            <span className="row-meta">{[r.description, r.language].filter(Boolean).join(' ')}</span>
          </li>
        ))}
      </ol>
    </article>
  );
}

export default function BadgePage() {
  useVersion('badge');
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  const flat = still || !webgl;
  const [ready, setReady] = useState(false);
  const [debRef, debOn] = useArrived<HTMLDivElement>();
  const [endRef, endOn] = useArrived<HTMLDivElement>('0px 0px -15% 0px');

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    let live = true;
    Promise.all([
      document.fonts.load('400 100px Anton'),
      document.fonts.load('600 60px "Hanken Grotesk Variable"'),
      document.fonts.load('500 60px "Hanken Grotesk Variable"'),
    ]).catch(() => null).then(() => document.fonts.ready).then(() => { if (live) setReady(true); });
    return () => { live = false; window.removeEventListener('resize', on); };
  }, []);

  return (
    <div className="v-badge">
      <a className="skip-x" href="#main">Skip to content</a>
      <main id="main">
        <header className="hero">
          <Rack flat={flat} ready={ready} phone={phone} label="Two badges: Competitor and Coach" />
          <div className="hero-copy">
            <h1 className="name">{PERSON.first} {PERSON.last}<span className="stop">.</span></h1>
            <div className="hero-side">
              <p className="lede">{PERSON.line}</p>
              <p className="hint">{flat ? 'Front and back, side by side.' : 'Grab a badge. Flip it over.'}</p>
              <nav aria-label="Sections" className="toc">
                <a href="#debate">Debate</a><a href="#research">Research</a><a href="#work">Work</a><a href="#today">Today</a><a href="#contact">Contact</a>
              </nav>
            </div>
          </div>
        </header>

        <section className="sec about" aria-labelledby="about-h">
          <article className="card about-card">
            <h2 className="h2" id="about-h">About</h2>
            <div className="about-cols">
              {PERSON.about.map((p, i) => <p className="body" key={i}>{p}</p>)}
            </div>
            <p className="aside">{PERSON.aside}</p>
          </article>
        </section>

        <section className="debate" id="debate" aria-labelledby="debate-h">
          <div className="deb-rack" ref={debRef}>
            <Rack flat={flat} ready={ready && debOn} phone={phone} big intro={false} flipFirst={1200} label="The badges again"
              middle={
                <div className="deb-mid">
                  <h2 className="h2" id="debate-h">{debate.title}</h2>
                  <ol className="wins">
                    {DEBATE.wins.map((w) => (
                      <li className="win" key={w.where}>
                        <p className="win-t">{w.title}</p>
                        <p className="win-e">{w.event}</p>
                        <p className="win-w">{w.where}, {w.when}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              }
            />
          </div>
          <div className="deb-row">
            <p className="body deb-body">{debate.body}</p>
            <article className="card team">
              <h3 className="h3">{DEBATE.team.name}</h3>
              <p className="team-role">{DEBATE.team.role}</p>
              <p className="body">{DEBATE.team.line}</p>
              <p className="body">{DEBATE.team.record}</p>
              <p><Ext href={DEBATE.team.href}>skeptical.pages.dev</Ext></p>
            </article>
            <div className="next">
              <h3 className="h3">Up next</h3>
              <ul>
                {DEBATE.next.map((n) => <li key={n.where}><span className="next-w">{n.where}</span><span className="next-e">{n.event}</span></li>)}
              </ul>
            </div>
          </div>
        </section>

        <section className="sec research" id="research" aria-labelledby="research-h">
          <h2 className="h2" id="research-h">Research</h2>
          <div className="res-wall">
            <article className="card paper">
              <p className="paper-status">{paper.status}, {paper.pages} pages</p>
              <h3 className="paper-title">{paper.title}</h3>
              <p className="body">{paper.abstract}</p>
              <h4 className="cap">Keywords</h4>
              <p className="keys">{paper.keywords.join(' / ')}</p>
              <h4 className="cap">Read it</h4>
              <ul className="paper-links">
                {paper.links.map((l) => <li key={l.label}><Ext href={l.href}>{l.label}</Ext></li>)}
              </ul>
            </article>
            <div className="res-side">
              <blockquote className="card epi">
                <p>{paper.epigraph.text}</p>
                <footer>{paper.epigraph.source}</footer>
              </blockquote>
              <article className="card wess">
                <p className="paper-status">{wess.status}</p>
                <h3 className="h3">{wess.title}</h3>
                <p className="body">{wess.abstract}</p>
              </article>
            </div>
          </div>
        </section>

        <section className="sec work" id="work" aria-labelledby="work-h">
          <h2 className="h2" id="work-h">Work</h2>
          <ul className="pins">
            {WORK.map((w, i) => (
              <li className={`card pin pin-${i}`} key={w.slug}>
                <img src={BASE + w.img} alt={`${w.name}, screenshot`} loading="lazy" width={1200} height={750} />
                <p className="pin-kind">{w.kind}</p>
                <h3 className="h3 pin-name">{w.name}</h3>
                <p className="pin-line">{w.line}</p>
                <p className="pin-stack">{w.stack}</p>
                {w.href ? <Ext href={w.href} className="ln pin-link">Visit {w.name}</Ext> : <p className="pin-stack pin-nolink">No public link</p>}
              </li>
            ))}
          </ul>
        </section>

        <div className="sec duo">
          <Today />
          <section className="gh" aria-label="GitHub"><GitHubSheet /></section>
        </div>

        <section className="sec now" aria-labelledby="now-h">
          <h2 className="h2" id="now-h">Now</h2>
          <div className="now-wall">
            <article className="card now-card">
              <h3 className="h3">{NOW.reading.title}</h3>
              <p className="body">{NOW.reading.body}</p>
              <ul className="shelf">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </article>
            <article className="card now-card now-b">
              <h3 className="h3">{NOW.club.title}</h3>
              <p className="body">{NOW.club.body}</p>
            </article>
            <p className="status">{NOW.status}</p>
          </div>
        </section>

        <section className="sec record" aria-labelledby="record-h">
          <h2 className="h2" id="record-h">Record</h2>
          <div className="rec-wall">
            <article className="card sheet honors">
              <ol className="rows">
                {HONORS.map((h) => (
                  <li className="row" key={h.what}><span className="row-main">{h.what}</span><span className="row-meta">{h.detail}</span></li>
                ))}
              </ol>
            </article>
            <ul className="certs">
              {AWARDS.map((a, i) => (
                <li className={`card cert cert-${i}`} key={a.site}>
                  <a href={a.href} rel="noopener" className="cert-a">
                    <img src={BASE + a.img} alt={`Certificate: ${a.site}`} loading="lazy" width={600} height={850} />
                    <span className="cert-site">{a.site}</span>
                    <span className="cert-note">{a.note}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="sec off" aria-labelledby="off-h">
          <h2 className="h2" id="off-h">Off the record</h2>
          <div className="card off-card">
            {([['Likes', LIKES], ['Dislikes', DISLIKES], ['Favourites', FAVOURITES]] as const).map(([t, list]) => (
              <div key={t}><h3 className="cap">{t}</h3><ul className="plain">{list.map((x) => <li key={x}>{x}</li>)}</ul></div>
            ))}
            <div><h3 className="cap">Courses</h3><ul className="plain">{COURSES.map((c) => <li key={c.title}>{c.provider}, {c.title}: {c.note}</li>)}</ul></div>
          </div>
        </section>

        <section className="end" id="contact" aria-labelledby="contact-h">
          <div className="end-rack" ref={endRef}>
            <Rack flat={flat} ready={ready && endOn} phone={phone} low flipSecond={1900} second={COACH_NEXT} secondBack={nextBack} label="The badges, coach turned to up next" />
          </div>
          <div className="end-col">
            <h2 className="h2" id="contact-h">Contact</h2>
            <ul className="links">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <span className="cap">{l.label}</span>
                  {l.href ? <Ext href={l.href} className="ln big-ln">{l.value}</Ext> : <span className="big-ln">{l.value}</span>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <footer className="foot">
        <p>Draft 80 of the portfolio. Not the live site.</p>
        <p>Badges built on Lanyard from React Bits (MIT and Commons Clause). Type: Anton and Hanken Grotesk.</p>
      </footer>
    </div>
  );
}
