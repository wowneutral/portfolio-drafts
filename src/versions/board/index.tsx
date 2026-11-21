// Draft 56, The board. A split-flap results board of his tournaments on a warm wall; tiles remixed from React Bits SplitFlapText (MIT + Commons Clause).
// Two boards and one header of tiles, no more: results (which returns at Contact as the closing), commits, and the date of the daily note.
import { useEffect, useRef, useState, type KeyboardEvent as RKeyboardEvent, type ReactNode } from 'react';
import '@fontsource-variable/big-shoulders-display';
import '@fontsource-variable/hanken-grotesk';
import './flap.css';
import './board.css';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago, type GitHubData } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/scroll';
import { Flap, useReduced } from './Flap';

const src = (p: string) => import.meta.env.BASE_URL + p;
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; ladders: { who: string; when: string; where: string }[]; epigraph: { text: string; source: string } };
const wess = RESEARCH[1];
const NAV = [['results', 'Results'], ['work', 'Work'], ['paper', 'Paper'], ['live', 'Live'], ['today', 'Today'], ['contact', 'Contact']] as const;

/* ---------- the results board ---------- */
const A = 16; // tournament
const B = 19; // event (10) + blank + result (8)
const fit = (s: string, w: number) => s.toUpperCase().slice(0, w).padEnd(w, ' ');
const short = (event: string) => event.replace('Lincoln-Douglas', 'LD');
const division = (event: string) => event.split(' ')[0];

type Face = { a: string; b: string; acc?: boolean };
type Result = { key: string; front: Face; back: Face; say: string; turn: string };

const RESULTS: Result[] = [
  ...DEBATE.wins.map((w) => ({
    key: w.where,
    front: { a: w.where, b: fit(short(w.event), 10) + ' ' + w.title, acc: true },
    back: { a: 'Lincoln-Douglas', b: fit(division(w.event), 10) + ' ' + w.when },
    say: `${w.title}, ${w.event}, ${w.where}, ${w.when}.`,
    turn: 'Show the year',
  })),
  ...DEBATE.next.map((n) => ({
    key: n.where,
    front: { a: n.where, b: fit(short(n.event), 10) + ' UP NEXT' },
    back: { a: 'Lincoln-Douglas', b: fit(division(n.event), 10) + ' UP NEXT' },
    say: `Up next: ${n.event}, ${n.where}.`,
    turn: 'Show the full event',
  })),
];

const pick = (label: string) => LINKS.find((l) => l.label === label)!;
const CONTACT = [
  { a: 'Email', b: pick('Email').value, href: pick('Email').href!, say: `Email ${pick('Email').value}` },
  { a: 'GitHub', b: GITHUB.user, href: GITHUB.href, say: `GitHub, ${pick('GitHub').value}` },
  { a: 'Skeptical', b: pick('Debate team').value, href: pick('Debate team').href!, say: `Skeptical, ${pick('Debate team').value}` },
  { a: 'MITEZ', b: pick('The nonprofit').value, href: pick('The nonprofit').href!, say: `MITEZ, ${pick('The nonprofit').value}` },
];

function Cells({ face, row, still }: { face: Face; row: number; still?: boolean }) {
  const d = row < 0 ? 0 : 200 + row * 110;
  return (
    <span className="bd-cells">
      <span className="bd-seg bd-seg--a"><Flap value={face.a} width={A} delay={d} stagger={20} still={still} /></span>
      <span className="bd-gut" aria-hidden="true"><span className="flap__tile" /></span>
      <span className="bd-seg bd-seg--b"><Flap value={face.b} width={B} delay={d + 17 * 20} stagger={20} accentFrom={face.acc ? 11 : -1} accentTo={B} still={still} /></span>
    </span>
  );
}

/** Up and down arrows move between the rows of a board. */
function arrows(e: RKeyboardEvent<HTMLOListElement>) {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  const rows = [...e.currentTarget.querySelectorAll<HTMLElement>('.bd-row')];
  const i = rows.indexOf(document.activeElement as HTMLElement);
  if (i < 0) return;
  e.preventDefault();
  rows[(i + (e.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length].focus();
}

function Heads() {
  return (
    <div className="bd-heads" aria-hidden="true">
      <span style={{ width: `calc(${A} * (var(--cw) + var(--tg)))` }}>Tournament</span>
      <span style={{ width: `calc(${11} * (var(--cw) + var(--tg)))`, marginLeft: 'calc(var(--cw) + var(--tg))' }}>Event</span>
      <span>Result</span>
    </div>
  );
}

function Results() {
  const [on, setOn] = useState(false);
  const [turned, setTurned] = useState<boolean[]>(() => RESULTS.map(() => false));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 300);
    const u = setTimeout(() => setReady(true), 2000);
    return () => { clearTimeout(t); clearTimeout(u); };
  }, []);
  const blank: Face = { a: '', b: '' };
  return (
    <div className="bd-board">
      <Heads />
      <ol className="bd-rows" onKeyDown={arrows}>
        {RESULTS.map((r, i) => (
          <li key={r.key}>
            <button type="button" className="bd-row" aria-pressed={turned[i]} onClick={() => setTurned((t) => t.map((x, j) => (j === i ? !x : x)))}>
              <span className="sr-only-x">{r.say} {r.turn}.</span>
              <Cells face={!on ? blank : turned[i] ? r.back : r.front} row={ready ? -1 : i} />
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Flip once when the element first comes into view (or straight away with reduced motion). */
function useSeen<T extends HTMLElement>(threshold = 0.35) {
  const ref = useRef<T>(null);
  const reduced = useReduced();
  const [seen, set] = useState(false);
  useEffect(() => {
    if (reduced) { set(true); return; }
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { set(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [reduced, threshold]);
  return [ref, seen] as const;
}

function Closing() {
  const [ref, seen] = useSeen<HTMLDivElement>(0.5);
  return (
    <div className="bd-board bd-board--end" ref={ref}>
      <ol className="bd-rows" onKeyDown={arrows}>
        {CONTACT.map((c, i) => (
          <li key={c.a}>
            <a className="bd-row" href={c.href}>
              <span className="sr-only-x">{c.say}</span>
              <Cells face={seen ? { a: c.a, b: c.b } : RESULTS[i].front} row={i} still={!seen} />
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------- commits board ---------- */
function tiny(iso: string) {
  const m = (Date.now() - new Date(iso).getTime()) / 60000;
  if (!Number.isFinite(m)) return '';
  if (m < 60) return 'NOW';
  if (m < 1440) return Math.round(m / 60) + 'H';
  if (m < 10080) return Math.round(m / 1440) + 'D';
  if (m < 43200) return Math.round(m / 10080) + 'W';
  return Math.min(99, Math.round(m / 43200)) + 'MO';
}

function CommitBoard({ gh }: { gh: GitHubData }) {
  const [ref, seen] = useSeen<HTMLDivElement>(0.3);
  const live = gh.activity.length > 0;
  const rows = live
    ? gh.activity.slice(0, 5).map((c) => ({ k: c.href, a: fit(c.repo, 12) + tiny(c.at).padStart(4, ' '), b: c.message, href: c.href, say: `${c.repo}: ${c.message}, ${ago(c.at)}` }))
    : gh.repos.slice(0, 4).map((r) => ({ k: r.href, a: r.name, b: r.language ?? '', href: r.href, say: `${r.name}${r.language ? ', ' + r.language : ''}` }));
  return (
    <div className="bd-board bd-board--gh" ref={ref}>
      <ol className="bd-rows" onKeyDown={arrows}>
        {rows.map((r, i) => (
          <li key={r.k}>
            <a className="bd-row" href={r.href}>
              <span className="sr-only-x">{r.say}</span>
              <span className="bd-cells">
                <span className="bd-seg bd-seg--a"><Flap value={seen ? r.a : ''} width={16} delay={i * 120} stagger={22} /></span>
                <span className="bd-gut" aria-hidden="true"><span className="flap__tile" /></span>
                <span className="bd-seg bd-seg--b"><Flap value={seen ? r.b : ''} width={16} delay={i * 120 + 17 * 22} stagger={22} /></span>
              </span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------- today header ---------- */
function TodayTiles({ iso }: { iso: string | null }) {
  const [ref, seen] = useSeen<HTMLDivElement>(0.4);
  const v = iso ? formatDate(iso, { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '') : '';
  return (
    <div className="bd-date" ref={ref}>
      <Flap value={seen ? v : ''} width={11} delay={80} stagger={40} flipMs={200} />
    </div>
  );
}

/* ---------- work: each screenshot is set like a tile, its lower half dropping onto the hinge ---------- */
function Shot({ img, name }: { img: string; name: string }) {
  return (
    <div className="bd-shot">
      <div className="bd-shot__top"><img src={src(img)} alt={`${name}, screenshot`} loading="lazy" decoding="async" /></div>
      <div className="bd-shot__bot" aria-hidden="true"><img src={src(img)} alt="" loading="lazy" decoding="async" /><span className="bd-shot__shade" /></div>
    </div>
  );
}

function Section({ id, title, children, className = '' }: { id: string; title: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`bd-sec ${className}`} aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="bd-h2">{title}</h2>
      {children}
    </section>
  );
}

export default function Board() {
  useVersion('board');
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReduced();
  const latest = notes[0];

  useGSAP(() => {
    if (reduced) return;
    gsap.utils.toArray<HTMLElement>('.bd-shot').forEach((el) => {
      const bot = el.querySelector('.bd-shot__bot');
      const shade = el.querySelector('.bd-shot__shade');
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 92%', end: 'top 38%', scrub: 0.5 } });
      tl.fromTo(bot, { rotateX: 92 }, { rotateX: 0, ease: 'back.out(1.5)', duration: 1 }, 0)
        .fromTo(shade, { opacity: 0.85 }, { opacity: 0, ease: 'power2.out', duration: 1 }, 0);
    });
    ScrollTrigger.refresh();
  }, { scope: root, dependencies: [reduced] });

  return (
    <div className="v-board" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="bd-top">
        <a className="bd-mark" href="#main">A. Seth</a>
        <nav aria-label="Sections">
          <ul>{NAV.map(([id, l]) => <li key={id}><a href={`#${id}`}>{l}</a></li>)}</ul>
        </nav>
      </header>

      <main id="main">
        <section className="bd-open" aria-labelledby="name-h">
          <div className="bd-title">
            <h1 id="name-h">{PERSON.name}</h1>
            <p className="bd-line">{PERSON.line}</p>
          </div>
          <Results />
          <p className="bd-hint">Press a row to turn it over.</p>
        </section>

        <section id="results" className="bd-sec bd-debate" aria-labelledby="results-h">
          <h2 id="results-h" className="sr-only-x">Debate</h2>
          <div className="bd-wins">
            {DEBATE.wins.map((w) => (
              <p className="bd-win" key={w.where}>
                <span className="bd-win__t">{w.title}</span>
                <span className="bd-win__d">{w.event}, {w.where}, {w.when}.</span>
              </p>
            ))}
          </div>
          <div className="bd-next">
            <h3>Up next</h3>
            <ul>{DEBATE.next.map((n) => <li key={n.where}><strong>{n.where}</strong><span>{n.event}</span></li>)}</ul>
          </div>
          <div className="bd-team">
            <p className="bd-role">{DEBATE.team.role}</p>
            <h3 className="bd-team__n">{DEBATE.team.name}</h3>
            <p className="bd-team__l">{DEBATE.team.line}</p>
            <p className="bd-team__r">{DEBATE.team.record}</p>
            <a className="bd-link" href={DEBATE.team.href}>skeptical.pages.dev</a>
          </div>
        </section>

        <Section id="about" title="About" className="bd-about">
          <div className="bd-about__body">
            <p className="bd-lede">{PERSON.about[0]}</p>
            <p>{PERSON.about[1]}</p>
            <p className="bd-aside">{PERSON.aside}</p>
          </div>
        </Section>

        <Section id="work" title="Work" className="bd-work">
          <ol className="bd-worklist">
            {WORK.map((w, i) => (
              <li className={`bd-wk${i % 2 ? ' is-r' : ''}`} key={w.slug}>
                <Shot img={w.img} name={w.name} />
                <div className="bd-wk__text">
                  <p className="bd-wk__kind">{w.kind}</p>
                  <h3 className="bd-wk__n">{w.name}</h3>
                  <p className="bd-wk__line">{w.line}</p>
                  <p className="bd-wk__stack">{w.stack}</p>
                  {w.href ? <a className="bd-link" href={w.href}>Open {w.name}</a> : <p className="bd-wk__nolink">No public link</p>}
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="paper" title="The paper" className="bd-paper">
          <div className="bd-paper__grid">
            <div>
              <p className="bd-paper__s">{paper.status}, {paper.pages} pages</p>
              <h3 className="bd-paper__t">{paper.title}</h3>
              <blockquote className="bd-epi"><p>{paper.epigraph.text}</p><footer>{paper.epigraph.source}</footer></blockquote>
            </div>
            <div>
              <p className="bd-abs">{paper.abstract}</p>
              <p className="bd-keys"><span className="bd-keys__l">Keywords</span> {paper.keywords.join(', ')}</p>
              <ul className="bd-plinks">{paper.links.map((l) => <li key={l.href}><a className="bd-link" href={l.href}>{l.label}</a></li>)}</ul>
              <h4 className="bd-ladders__h">Three ladders</h4>
              <ol className="bd-ladders">
                {paper.ladders.map((l) => <li key={l.who}><strong>{l.who}</strong><span>{l.when}</span><span>{l.where}</span></li>)}
              </ol>
            </div>
          </div>
          <div className="bd-wess">
            <h3>{wess.title}</h3>
            <p>{wess.abstract}</p>
            <p className="bd-wess__s">{wess.status}</p>
          </div>
        </Section>

        <Section id="live" title="Live from GitHub" className="bd-gh">
          <div className="bd-gh__grid">
            <CommitBoard gh={gh} />
            <div className="bd-gh__list">
              {gh.activity.length > 0 && (
                <div>
                  <h3>Latest commits</h3>
                  <ol className="bd-commits">
                    {gh.activity.slice(0, 5).map((c) => (
                      <li key={c.href}><a href={c.href}>{c.message}</a><span>{c.repo}, {ago(c.at)}</span></li>
                    ))}
                  </ol>
                </div>
              )}
              <div>
                <h3>Repositories</h3>
                <ul className="bd-repos">
                  {gh.repos.slice(0, 6).map((r) => (
                    <li key={r.href}><a href={r.href}>{r.name}</a>{r.description && <span>{r.description}</span>}{r.language && <em>{r.language}</em>}</li>
                  ))}
                </ul>
                <a className="bd-link" href={GITHUB.href}>All of it on github.com/{GITHUB.user}</a>
              </div>
            </div>
          </div>
        </Section>

        <section id="today" className="bd-sec bd-today" aria-labelledby="today-h">
          <div className="bd-today__head">
            <h2 id="today-h" className="bd-h2">Today</h2>
            <TodayTiles iso={latest?.date ?? null} />
          </div>
          {latest ? (
            <article className="bd-note">
              <p className="bd-note__d"><time dateTime={latest.date}>{formatDate(latest.date)}</time></p>
              {latest.body.map((p, i) => <p className="bd-note__p" key={i}>{p}</p>)}
            </article>
          ) : (
            <p className="bd-note__p bd-note__p--wait">{loaded ? NOW.status : 'Fetching the latest note.'}</p>
          )}
          {notes.length > 1 && (
            <details className="bd-earlier">
              <summary>Earlier notes ({notes.length - 1})</summary>
              <ol>
                {notes.slice(1).map((n) => (
                  <li key={n.date}><time dateTime={n.date}>{formatDate(n.date)}</time>{n.body.map((p, i) => <p key={i}>{p}</p>)}</li>
                ))}
              </ol>
            </details>
          )}
        </section>

        <Section id="now" title="Now" className="bd-now">
          <div className="bd-now__grid">
            <div>
              <h3>{NOW.reading.title}</h3>
              <p>{NOW.reading.body}</p>
              <ul className="bd-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <h3>{NOW.club.title}</h3>
              <p>{NOW.club.body}</p>
            </div>
            <div>
              <h3>Status</h3>
              <p>{NOW.status}</p>
            </div>
          </div>
        </Section>

        <Section id="record" title="Record" className="bd-record">
          <div className="bd-record__grid">
            <ol className="bd-honors">
              {HONORS.map((h) => <li key={h.what}><span>{h.what}</span><span>{h.detail}</span></li>)}
            </ol>
            <div className="bd-awards">
              {AWARDS.map((a) => (
                <a key={a.href} href={a.href} className="bd-award">
                  <img src={src(a.img)} alt={`Certificate for ${a.site}`} loading="lazy" decoding="async" />
                  <span><strong>{a.site}</strong>{a.note}</span>
                </a>
              ))}
            </div>
          </div>
        </Section>

        <Section id="off" title="Off the record" className="bd-off">
          <div className="bd-off__grid">
            <div><h3>Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider}, {c.title}</strong> {c.note}</li>)}</ul></div>
          </div>
        </Section>

        <section id="contact" className="bd-sec bd-contact" aria-labelledby="contact-h">
          <h2 id="contact-h" className="bd-h2">Contact</h2>
          <Closing />
          <ul className="bd-links">
            {LINKS.map((l) => (
              <li key={l.label}><span>{l.label}</span>{l.href ? <a href={l.href}>{l.value}</a> : <span className="bd-links__v">{l.value}</span>}</li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="bd-foot">
        <p>Draft 56 of the portfolio. Not the live site.</p>
        <p>Tiles remixed from React Bits SplitFlapText. Set in Big Shoulders Display and Hanken Grotesk.</p>
      </footer>
    </div>
  );
}
