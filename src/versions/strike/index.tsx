// Draft 19: the strike. His paper asks how a skeptic can argue that language fails when the
// argument has to be made in language. One answer is to say a word and cross it out at once,
// so it is both said and withdrawn. Every heading here is set in Gloock and struck through with
// one taut red string you can pull; the body text stays clean. Only his name and his two
// championships are never struck, and time strikes everything else: old notes, old commits.
import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import '@fontsource/gloock/400.css';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import './strike.css';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { ago, useGitHub } from '@/lib/github';
import { formatDate, useNotes } from '@/lib/notes';
import { still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { Strike } from './Strike';

const BASE = import.meta.env.BASE_URL;
const PAPER = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; epigraph: { text: string; source: string }; ladders: { who: string; when: string; where: string }[]; pages: number };
const WESSO = RESEARCH[1];

const Out = ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
  <a className={className ?? 'lk'} href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">
    {children}
  </a>
);

/**
 * The epigraph, scrubbed by scroll. First a red strike runs through the parenthetical, the way every
 * heading here is struck; then it lifts off the words and comes back as two drawn brackets: the one
 * place on the page where the line bends into a bracket, kept but set aside.
 */
function Epigraph() {
  const text = PAPER.epigraph.text;
  const a = text.indexOf('('), b = text.indexOf(')');
  const sec = useRef<HTMLElement>(null);
  const box = useRef<HTMLQuoteElement>(null);
  const open = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  const close = useRef<HTMLSpanElement>(null);
  const [geo, setGeo] = useState<{ br: { x: number; y: number; h: number; w: number; dir: 1 | -1 }[]; rows: { x0: number; x1: number; y: number }[] }>({ br: [], rows: [] });
  useLayoutEffect(() => {
    const m = () => {
      const q = box.current?.getBoundingClientRect();
      if (!q || !open.current || !close.current || !inner.current) return;
      const br = [open.current, close.current].map((el, i) => {
        const r = el.getBoundingClientRect();
        return { x: r.left - q.left, y: r.top - q.top, h: r.height, w: r.width, dir: (i ? -1 : 1) as 1 | -1 };
      });
      const rows: { x0: number; x1: number; y: number }[] = [];
      for (const r of inner.current.getClientRects()) {
        if (r.width < 4) continue;
        rows.push({ x0: r.left - q.left - 6, x1: r.right - q.left + 6, y: r.top - q.top + r.height * 0.6 });
      }
      setGeo({ br, rows });
    };
    m();
    const ro = new ResizeObserver(m);
    if (box.current) ro.observe(box.current);
    document.fonts?.ready.then(m).catch(() => {});
    return () => ro.disconnect();
  }, []);
  useLayoutEffect(() => {
    const el = sec.current, q = box.current;
    if (!el || !q) return;
    if (still) { q.style.setProperty('--p', '1'); return; }
    let id = 0;
    const loop = () => {
      const r = el.getBoundingClientRect();
      const span = Math.max(1, r.height - innerHeight);
      const p = Math.min(1, Math.max(0, (-r.top + innerHeight * 0.35) / span));
      q.style.setProperty('--p', p.toFixed(4));
      id = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => { cancelAnimationFrame(id); if (e.isIntersecting) id = requestAnimationFrame(loop); });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(id); };
  }, []);
  return (
    <section ref={sec} className="epi" aria-label="The line the paper is named after">
      <div className="epi-pin">
        <figure>
          <blockquote ref={box} className="epi-q">
            <p>
              {text.slice(0, a)}
              <span className="paren" ref={open}>(</span>
              <span className="paren-in" ref={inner}>{text.slice(a + 1, b)}</span>
              <span className="paren" ref={close}>)</span>
              {text.slice(b + 1)}
            </p>
            <svg className="epi-svg" aria-hidden="true" width="100%" height="100%">
              {geo.rows.map((r, i) => (
                <path key={'s' + i} className="epi-strike" pathLength={1} d={`M${r.x0} ${r.y}L${r.x1} ${r.y}`} />
              ))}
              {geo.br.map((r, i) => {
                const top = r.y + r.h * 0.1, bot = r.y + r.h * 0.95;
                const outer = r.dir > 0 ? r.x + r.w * 0.85 : r.x + r.w * 0.15;
                const inn = r.dir > 0 ? r.x + r.w * 0.0 : r.x + r.w * 1.0;
                return <path key={'b' + i} className="epi-br" pathLength={1} d={`M${outer} ${top} C${inn} ${top + (bot - top) * 0.2} ${inn} ${top + (bot - top) * 0.8} ${outer} ${bot}`} />;
              })}
            </svg>
          </blockquote>
          <figcaption>{PAPER.epigraph.source}</figcaption>
        </figure>
      </div>
    </section>
  );
}

function Today() {
  const { notes, loaded } = useNotes();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [latest, ...earlier] = notes;
  return (
    <section className="sec today" id="today" aria-labelledby="today-h">
      <Strike id="today-h">Today</Strike>
      <div className="today-grid">
        <article className="note-now" aria-live="polite">
          {!loaded && <p className="note-wait">Opening the notebook</p>}
          {loaded && latest && (
            <>
              <p className="note-date"><time dateTime={latest.date}>{formatDate(latest.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></p>
              {latest.body.map((p, i) => <p className="note-body" key={i}>{p}</p>)}
            </>
          )}
          {loaded && !latest && (
            <>
              <p className="note-date">No note yet today</p>
              <p className="note-body">{NOW.status}</p>
            </>
          )}
        </article>
        {earlier.length > 0 && (
          <div className="note-old">
            <p className="side-label">Said before, and taken back</p>
            <ol>
              {earlier.map((n) => {
                const o = !!open[n.date];
                return (
                  <li key={n.date}>
                    <button type="button" className={`old ${o ? 'open' : ''}`} aria-expanded={o} onClick={() => setOpen((s) => ({ ...s, [n.date]: !s[n.date] }))}>
                      <time dateTime={n.date}>{formatDate(n.date)}</time>
                      <span className="old-body">{n.body.join(' ')}</span>
                      <span className="old-act">{o ? 'Strike it again' : 'Read it clean'}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}

function GitHubLive() {
  const { repos, activity, commitsThisMonth, live } = useGitHub();
  const [first, ...rest] = activity;
  return (
    <section className="sec gh" id="github" aria-labelledby="gh-h">
      <Strike id="gh-h">From GitHub</Strike>
      {first ? (
        <div className="gh-now">
          <p className="side-label">Latest commit{live ? ', live' : ''}</p>
          <a className="gh-first" href={first.href} target="_blank" rel="noreferrer">
            <span className="gh-msg">{first.message}</span>
            <span className="gh-meta">{first.repo}, {ago(first.at)}</span>
          </a>
          {rest.length > 0 && (
            <ol className="gh-old">
              {rest.slice(0, 7).map((c, i) => (
                <li key={i}>
                  <a href={c.href} target="_blank" rel="noreferrer">
                    <span className="gh-old-msg">{c.message}</span>
                    <span className="gh-meta">{c.repo}, {ago(c.at)}</span>
                  </a>
                </li>
              ))}
            </ol>
          )}
          {commitsThisMonth != null && <p className="gh-count">{commitsThisMonth} commits pushed this month.</p>}
        </div>
      ) : (
        <p className="gh-lede">Where the building happens, in public. Every one of these is open to read.</p>
      )}
      <ul className="repos">
        {repos.slice(0, 8).map((r) => (
          <li key={r.name}>
            <a href={r.href} target="_blank" rel="noreferrer">
              <span className="repo-name">{r.name}</span>
              {r.description && <span className="repo-desc">{r.description}</span>}
              <span className="repo-meta">{[r.language, r.pushedAt ? 'pushed ' + ago(r.pushedAt) : null].filter(Boolean).join(', ')}</span>
            </a>
          </li>
        ))}
      </ul>
      <p className="gh-all"><Out href={GITHUB.href}>All of it at github.com/{GITHUB.user}</Out></p>
    </section>
  );
}

export default function StrikePage() {
  useVersion('strike');
  return (
    <div className="v-strike">
      <a className="skip-x" href="#main">Skip to content</a>
      <main id="main">
        <header className="hero">
          <h1 className="name">{PERSON.name}</h1>
          <div className="said">
            {PERSON.short.map((w, i) => (
              <Strike key={w} as="p" className="big" w={4} delay={0.5 + i * 0.28}>{w}</Strike>
            ))}
          </div>
          <div className="hero-foot">
            <p className="hero-line">{PERSON.line}</p>
            <p className="hint">{still ? 'Said, and crossed out.' : 'Pull a red line.'}</p>
          </div>
        </header>

        <Today />

        <section className="sec about" id="about" aria-labelledby="about-h">
          <Strike id="about-h">About</Strike>
          <div className="about-cols">
            {PERSON.about.map((p, i) => <p key={i} className={i ? '' : 'lead'}>{p}</p>)}
            <p className="aside">{PERSON.aside}</p>
          </div>
        </section>

        <section className="sec debate" id="debate" aria-labelledby="debate-h">
          <Strike id="debate-h">Debate</Strike>
          <p className="win-lede">Two things on this page are never crossed out.</p>
          <ol className="wins">
            {DEBATE.wins.map((w) => (
              <li key={w.where} className="win">
                <p className="win-title">{w.title}, {w.when}</p>
                <h3 className="win-where">{w.where}</h3>
                <p className="win-event">{w.event}</p>
              </li>
            ))}
          </ol>
          <div className="team">
            <div className="team-head">
              <Strike as="h3" className="mid">{DEBATE.team.name}</Strike>
              <p className="team-role">{DEBATE.team.role}</p>
            </div>
            <div className="team-body">
              <p className="lead">{DEBATE.team.line}</p>
              <p>{DEBATE.team.record}</p>
              <p className="links"><Out href={DEBATE.team.href}>skeptical.pages.dev</Out></p>
            </div>
          </div>
          <div className="next">
            <Strike as="h3" className="small" w={2}>Up next</Strike>
            <ul>
              {DEBATE.next.map((n) => (
                <li key={n.where}><span className="next-where">{n.where}</span><span className="next-ev">{n.event}</span></li>
              ))}
            </ul>
          </div>
        </section>

        <Epigraph />

        <section className="sec research" id="research" aria-labelledby="research-h">
          <Strike id="research-h">Research</Strike>
          <article className="paper">
            <Strike as="h3" className="mid paper-title" w={3}>{PAPER.title}</Strike>
            <div className="paper-cols">
              <div>
                <p className="lead">{PAPER.abstract}</p>
                <p className="kw"><span className="kw-l">Keywords</span> {PAPER.keywords.join(', ')}</p>
              </div>
              <div className="paper-side">
                <p className="paper-status">{PAPER.status}, {PAPER.pages} pages</p>
                <ol className="ladders">
                  {PAPER.ladders.map((l) => (
                    <li key={l.who}><span className="lad-who">{l.who}</span><span className="lad-where">{l.where}, {l.when}</span></li>
                  ))}
                </ol>
                <ul className="paper-links">
                  {PAPER.links.map((l) => <li key={l.label}><Out href={l.href}>{l.label}</Out></li>)}
                </ul>
              </div>
            </div>
          </article>
          <article className="wesso">
            <Strike as="h3" className="small" w={2}>{WESSO.title}</Strike>
            <p>{WESSO.abstract}</p>
            <p className="paper-status">{WESSO.status}</p>
          </article>
        </section>

        <section className="sec work" id="work" aria-labelledby="work-h">
          <Strike id="work-h">Work</Strike>
          <ol className="works">
            {WORK.map((it, i) => (
              <li key={it.slug} className={`wk ${i % 2 ? 'r' : 'l'}`}>
                <Strike as="h3" className="wk-name">{it.name}</Strike>
                <figure className="wk-img">
                  {it.href ? (
                    <a href={it.href} target="_blank" rel="noreferrer" tabIndex={-1} aria-hidden="true">
                      <img src={BASE + it.img} alt="" width={1200} height={680} loading="lazy" />
                    </a>
                  ) : (
                    <img src={BASE + it.img} alt={`${it.name}, a screenshot`} width={1200} height={680} loading="lazy" />
                  )}
                </figure>
                <div className="wk-meta">
                  <p className="wk-kind">{it.kind}</p>
                  <p className="wk-line">{it.line}</p>
                  <p className="wk-stack">{it.stack}</p>
                  {it.href ? <p><Out href={it.href}>Open {it.name}</Out></p> : <p className="wk-none">No public link</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <GitHubLive />

        <section className="sec now" id="now" aria-labelledby="now-h">
          <Strike id="now-h">Now</Strike>
          <p className="status">{NOW.status}</p>
          <div className="now-cols">
            <div>
              <Strike as="h3" className="small" w={2}>{NOW.reading.title}</Strike>
              <p>{NOW.reading.body}</p>
              <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <Strike as="h3" className="small" w={2}>{NOW.club.title}</Strike>
              <p>{NOW.club.body}</p>
            </div>
          </div>
        </section>

        <section className="sec record" id="record" aria-labelledby="record-h">
          <Strike id="record-h">Record</Strike>
          <div className="rec-grid">
            <ol className="ledger">
              {HONORS.map((h) => (
                <li key={h.what}><span className="led-what">{h.what}</span><span className="led-d">{h.detail}</span></li>
              ))}
            </ol>
            <ul className="certs">
              {AWARDS.map((a) => (
                <li key={a.site}>
                  <a href={a.href} target="_blank" rel="noreferrer">
                    <img src={BASE + a.img} alt={`The certificate for ${a.site}`} width={720} height={1018} loading="lazy" />
                    <span className="cert-site">{a.site}</span>
                    <span className="cert-note">{a.note}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="sec off" id="off" aria-labelledby="off-h">
          <Strike id="off-h">Off the record</Strike>
          <div className="off-cols">
            <div>
              <Strike as="h3" className="small" w={2}>Likes</Strike>
              <ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
            <div>
              <Strike as="h3" className="small" w={2}>Dislikes</Strike>
              <ul className="struck">{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
            <div>
              <Strike as="h3" className="small" w={2}>Favourites</Strike>
              <ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
            <div>
              <Strike as="h3" className="small" w={2}>Courses</Strike>
              <ul>{COURSES.map((c) => <li key={c.title}><span className="c-t">{c.provider} {c.title}</span> {c.note}</li>)}</ul>
            </div>
          </div>
        </section>

        <section className="sec contact" id="contact" aria-labelledby="contact-h">
          <Strike id="contact-h">Contact</Strike>
          <ul className="links-list">
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="ll-l">{l.label}</span>
                {l.href ? <Out href={l.href} className="ll-v">{l.value}</Out> : <span className="ll-v plain">{l.value}</span>}
              </li>
            ))}
          </ul>
        </section>

        <section className="sign" aria-label="Signature">
          <Strike as="p" className="sign-name" at="under" w={3}>{PERSON.name}</Strike>
          <p className="sign-line">{PERSON.short.join(' ')}</p>
        </section>
      </main>
      <footer className="foot">
        <p>Draft 19 of the portfolio. Not the live site.</p>
        <p>Set in Gloock and Newsreader.</p>
        <p><a className="lk" href="#main">Back to the top</a></p>
      </footer>
    </div>
  );
}
