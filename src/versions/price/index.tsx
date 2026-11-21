// Draft 84: the price. A price list where every price is 0, each labelled with his own words for why.
// The three green figures (MITEZ, Skeptical, the paper) are scrubbable: drag one up and it stretches
// like rubber, let go and it snaps back to 0. Built on React Bits ScrubField (see Zero.tsx).
// The ending is the one cost he names: the visitor's own time on the page.
import { useEffect, useState, type ReactNode } from 'react';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import './price.css';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { useVersion } from '@/lib/version';
import Zero from './Zero';

const BASE = import.meta.env.BASE_URL;
const PAPER = RESEARCH[0];
const WESSO = RESEARCH[1];
const EPI = PAPER.epigraph!;
const KEYWORDS = PAPER.keywords ?? [];
const MITEZ = WORK[0];
const T = DEBATE.team;
const ABOUT2 = PERSON.about[1];
const RAW = ABOUT2.slice(ABOUT2.indexOf('mentorship costs'));
const SENTENCE = RAW.charAt(0).toUpperCase() + RAW.slice(1);
const TEAM_LINE = T.line.split('. ')[0] + '.';
const TEAM_REST = T.line.slice(TEAM_LINE.length).trim();
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/\/$/, '');

const NAV = [['debate', 'Debate'], ['research', 'Research'], ['work', 'Work'], ['today', 'Today'], ['github', 'GitHub'], ['contact', 'Contact']] as const;

const Ext = ({ href, className, children }: { href: string; className?: string; children: ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

/** One line of the price list: the item, a dotted leader, and what it costs. */
function Row({ item, price, href, green }: { item: ReactNode; price: ReactNode; href?: string; green?: boolean }) {
  const body = (
    <>
      <span className="pl-item">{item}</span>
      <span className="pl-lead" aria-hidden="true" />
      <span className={'pl-price' + (green ? ' is-zero' : '')}>{price}</span>
    </>
  );
  return <li className="pl-row">{href ? <Ext className="pl-link" href={href}>{body}</Ext> : <div className="pl-link">{body}</div>}</li>;
}

function useClock() {
  const [s, set] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    const id = window.setInterval(() => set(Math.floor((performance.now() - t0) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);
  return s;
}

function Today() {
  const { notes, loaded } = useNotes();
  const [i, setI] = useState(0);
  const n = notes[Math.min(i, notes.length - 1)];
  return (
    <section id="today" className="sec s-today" aria-labelledby="h-today">
      <header className="sec-head">
        <h2 id="h-today">Today</h2>
        <p className="sec-sub">His daily note.</p>
      </header>
      <div className="today">
        {n ? (
          <article className="note" aria-live="polite">
            <p className="note-date"><time dateTime={n.date}>{formatDate(n.date)}</time>{i === 0 && <span className="note-latest"> Latest</span>}</p>
            {n.body.map((p, k) => <p key={k} className="note-body">{p}</p>)}
          </article>
        ) : (
          <article className="note">
            <p className="note-date">{loaded ? 'Right now' : 'Today'}</p>
            <p className="note-body">{NOW.status}</p>
          </article>
        )}
        {notes.length > 1 && (
          <nav className="note-pages" aria-label="Earlier notes">
            <h3 className="note-pages-h">Every note</h3>
            <ul>
              {notes.map((x, k) => (
                <li key={x.date}>
                  <button type="button" className="note-day" aria-pressed={k === i} onClick={() => setI(k)}>
                    <span>{formatDate(x.date, { day: 'numeric', month: 'long' })}</span>
                    <span className="note-day-y">{x.date.slice(0, 4)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </section>
  );
}

function GitHubLive() {
  const gh = useGitHub();
  const commits = gh.activity.slice(0, 6);
  return (
    <section id="github" className="sec s-gh" aria-labelledby="h-gh">
      <header className="sec-head">
        <h2 id="h-gh">Live from GitHub</h2>
        <p className="sec-sub">His code sits in public.</p>
      </header>
      <div className="gh">
        {commits.length > 0 && (
          <div className="gh-col">
            <h3 className="gh-h">Latest commits</h3>
            <ol className="gh-commits">
              {commits.map((c, k) => (
                <li key={c.href + k}>
                  <Ext className="gh-commit" href={c.href}>
                    <span className="gh-msg">{c.message}</span>
                    <span className="gh-meta">{c.repo}, {ago(c.at)}</span>
                  </Ext>
                </li>
              ))}
            </ol>
          </div>
        )}
        <div className="gh-col gh-repos">
          <h3 className="gh-h">Repositories</h3>
          <ul className="pl">
            {gh.repos.slice(0, 8).map((r) => (
              <Row key={r.name} href={r.href} price="Public" item={<><span className="gh-name">{r.name}</span>{r.description && <span className="gh-desc">{r.description}</span>}{r.language && <span className="gh-lang">{r.language}</span>}</>} />
            ))}
          </ul>
          <p className="gh-all"><Ext href={GITHUB.href}>Everything on {host(GITHUB.href)}</Ext></p>
        </div>
      </div>
    </section>
  );
}

export default function Price() {
  useVersion('price');
  const secs = useClock();
  const mm = Math.floor(secs / 60), ss = secs % 60;
  const clock = `${mm}:${String(ss).padStart(2, '0')}`;

  return (
    <div className="v-price">
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="top">
        <p className="top-mark">Price list</p>
        <nav className="top-nav" aria-label="Sections">
          <ul>{NAV.map(([id, l]) => <li key={id}><a href={'#' + id}>{l}</a></li>)}</ul>
        </nav>
      </header>

      <main id="main">
        {/* The opening */}
        <section className="hero" aria-labelledby="h-name">
          <div className="hero-text">
            <h1 id="h-name" className="hero-name">{PERSON.name}</h1>
            <p className="hero-line">{PERSON.line}</p>
            <blockquote className="hero-quote"><p>{SENTENCE}</p></blockquote>
          </div>
          <div className="hero-fig">
            <Zero className="pz--hero" label={`${MITEZ.name}. Price to the student.`} note="Try to put a price on it." />
          </div>
        </section>

        {/* About */}
        <section id="about" className="sec s-about" aria-labelledby="h-about">
          <header className="sec-head">
            <h2 id="h-about">About</h2>
          </header>
          <div className="about">
            {PERSON.about.map((p, k) => <p key={k} className="about-p">{p}</p>)}
            <p className="about-aside">{PERSON.aside}</p>
          </div>
        </section>

        {/* Debate: the free team, then the two things that were won */}
        <section id="debate" className="band" aria-labelledby="h-debate">
          <div className="band-in">
            <header className="sec-head">
              <h2 id="h-debate">Debate</h2>
              <p className="sec-sub">One thing he gives away, two things he won.</p>
            </header>
            <div className="team">
              <div className="team-fig">
                <Zero className="pz--mid" label={`${T.name}. ${TEAM_LINE}`} />
              </div>
              <div className="team-text">
                <h3 className="team-name">{T.name}</h3>
                <p className="team-role">{T.role}</p>
                <p className="team-line">{TEAM_REST}</p>
                <p className="team-record">{T.record}</p>
                <p className="team-go"><Ext href={T.href}>{host(T.href)}</Ext></p>
              </div>
            </div>

            <h3 className="wins-h">Not free. Won.</h3>
            <ol className="wins">
              {DEBATE.wins.map((w) => (
                <li key={w.where} className="win">
                  <p className="win-title">{w.title}</p>
                  <div className="win-what">
                    <p className="win-event">{w.event}</p>
                    <p className="win-where">{w.where}, {w.when}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="next">
              <h3 className="next-h">Up next</h3>
              <ul className="pl pl-dark">
                {DEBATE.next.map((x) => <Row key={x.where} item={<span className="next-event">{x.event}</span>} price={x.where} />)}
              </ul>
            </div>
          </div>
        </section>

        {/* Research */}
        <section id="research" className="sec s-research" aria-labelledby="h-research">
          <header className="sec-head">
            <h2 id="h-research">Research</h2>
          </header>
          <div className="paper">
            <div className="paper-text">
              <h3 className="paper-title">{PAPER.title}</h3>
              <blockquote className="paper-epi">
                <p>{EPI.text}</p>
                <footer>{EPI.source}</footer>
              </blockquote>
              <p className="paper-abs">{PAPER.abstract}</p>
              <p className="paper-kw"><span className="sr-only-x">Keywords: </span>{KEYWORDS.join(' / ')}</p>
            </div>
            <div className="paper-fig">
              <Zero className="pz--mid" label={`${PAPER.short}. ${PAPER.status}.`} />
            </div>
          </div>
          <ul className="pl pl-big" aria-label="Where to read it">
            {PAPER.links.map((l) => <Row key={l.label} href={l.href} item={l.label} price="0" green />)}
          </ul>
          <div className="wesso">
            <h3 className="wesso-title">{WESSO.title}</h3>
            <p className="wesso-status">{WESSO.status}</p>
            <p className="wesso-abs">{WESSO.abstract}</p>
          </div>
        </section>

        {/* Work */}
        <section id="work" className="sec s-work" aria-labelledby="h-work">
          <header className="sec-head">
            <h2 id="h-work">Work</h2>
            <p className="sec-sub">Eight things he built because he wanted them to exist.</p>
          </header>
          <ul className="work">
            {WORK.map((w) => {
              const inner = (
                <>
                  <span className="work-img"><img src={BASE + w.img} alt={`${w.name}, screenshot`} loading="lazy" decoding="async" width={1200} height={700} /></span>
                  <span className="work-head"><span className="work-name">{w.name}</span><span className="work-kind">{w.kind}</span></span>
                </>
              );
              return (
                <li key={w.slug} className="work-item">
                  {w.href ? <Ext className="work-a" href={w.href}>{inner}</Ext> : <div className="work-a">{inner}</div>}
                  <p className="work-line">{w.line}</p>
                  <p className="work-stack">{w.stack}</p>
                  {w.href && <p className="work-go"><Ext href={w.href}>{host(w.href)}</Ext></p>}
                </li>
              );
            })}
          </ul>
        </section>

        <Today />
        <GitHubLive />

        {/* Now */}
        <section id="now" className="sec s-now" aria-labelledby="h-now">
          <header className="sec-head"><h2 id="h-now">Now</h2></header>
          <div className="now">
            <div className="now-item">
              <h3>{NOW.reading.title}</h3>
              <p>{NOW.reading.body}</p>
              <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div className="now-item">
              <h3>{NOW.club.title}</h3>
              <p>{NOW.club.body}</p>
            </div>
            <p className="now-status">{NOW.status}</p>
          </div>
        </section>

        {/* Record */}
        <section id="record" className="sec s-record" aria-labelledby="h-record">
          <header className="sec-head"><h2 id="h-record">Record</h2></header>
          <div className="record">
            <ul className="pl pl-record">
              {HONORS.map((h) => <Row key={h.what} item={h.what} price={h.detail} />)}
            </ul>
            <ul className="certs">
              {AWARDS.map((a) => (
                <li key={a.site}>
                  <Ext className="cert" href={a.href}>
                    <img src={BASE + a.img} alt={`Certificate, ${a.site}`} loading="lazy" decoding="async" width={720} height={1018} />
                    <span className="cert-site">{a.site}</span>
                    <span className="cert-note">{a.note}</span>
                  </Ext>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Off the record */}
        <section id="off" className="sec s-off" aria-labelledby="h-off">
          <header className="sec-head"><h2 id="h-off">Off the record</h2></header>
          <div className="off">
            <div><h3>Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider} {c.title}</strong> {c.note}</li>)}</ul></div>
          </div>
        </section>

        {/* The ending: the one cost he names */}
        <section id="contact" className="end" aria-labelledby="h-contact">
          <div className="end-cost" aria-live="off">
            <p className="end-fig"><time dateTime={`PT${mm}M${ss}S`}>{clock}</time></p>
            <p className="end-label">What this page cost you.</p>
          </div>
          <h2 id="h-contact" className="end-h">Contact</h2>
          <ul className="pl pl-contact">
            {LINKS.map((l) => <Row key={l.label} href={l.href ?? undefined} item={l.label} price={l.value} />)}
          </ul>
        </section>
      </main>

      <footer className="foot">
        <p>Draft 84 of the portfolio. Not the live site.</p>
        <p>The scrubbable figures are adapted from the ScrubField component in React Bits.</p>
        <p><a href={BASE}>All drafts</a></p>
      </footer>
    </div>
  );
}
