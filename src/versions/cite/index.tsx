// Draft 60, The cite. His page opens on one line, the way a debater would cite him at the top of a card.
// A teal frame (remixed from React Bits TrueFocus, see Frame.tsx) rests on one part at a time; every part
// is a link into that part of his life. The page below is that cite expanded, in order.
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource-variable/hanken-grotesk/wght.css';
import './cite.css';
import { AWARDS, CHAPTERS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, STATS, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/scroll';
import { still } from '@/lib/utils';
import { Frame } from './Frame';

const src = (p: string) => import.meta.env.BASE_URL + p;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; ladders: { who: string; when: string; where: string }[]; epigraph: { text: string; source: string }; doi: string };
const wess = RESEARCH[1];
const chapter = (id: string) => CHAPTERS.find((c) => c.id === id)!.body;

// ---------- The cite, built only from content.ts ----------
const roles = PERSON.line.replace(/\.$/, '').split(', ');
roles[0] = roles[0][0].toLowerCase() + roles[0].slice(1);
const ROLE_TO: Record<string, string> = { 0: 'mitez', 1: 'skeptical', 2: 'debate', 3: 'research', 4: 'work' };
const statusLead = paper.status.slice(0, paper.status.lastIndexOf(', ') + 2);
const statusYear = paper.status.slice(paper.status.lastIndexOf(', ') + 2);

type Link = { t: string; href: string; k?: boolean; ext?: boolean };
type Piece = string | Link | { nowrap: Piece[] };
const CITE: Piece[] = [
  // Each part carries its own trailing mark, so the closing brackets sit in clear space after it.
  { t: 'Seth 26.', href: '#about', k: true },
  ` ${PERSON.name}, `,
  ...roles.flatMap((r, i): Piece[] => [{ t: r + (i < roles.length - 1 ? ',' : '.'), href: '#' + ROLE_TO[i] }, ' ']),
  { t: paper.title + '.', href: '#research' },
  ` ${statusLead}`,
  { nowrap: [`${statusYear}. `, { t: 'doi:' + paper.doi, href: paper.links[0].href, ext: true }] },
];

function Cite({ framed, className, lit }: { framed?: boolean; className?: string; lit?: boolean }) {
  const hostRef = useRef<HTMLParagraphElement>(null);
  const links = useRef<(HTMLAnchorElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [, force] = useState(0);
  useEffect(() => force(1), []);
  // The authored opening: the frame reads the cite once, part by part, then rests on the key.
  // TrueFocus's own sequential mode, run a single time; any pointer, touch or key stops it.
  useEffect(() => {
    if (!framed || still) return;
    const order = [1, 2, 3, 4, 5, 6, 7, 0];
    const timers: number[] = [];
    const stop = () => { timers.forEach(clearTimeout); off(); };
    const ev = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
    const off = () => ev.forEach((e) => window.removeEventListener(e, stop));
    ev.forEach((e) => window.addEventListener(e, stop, { passive: true }));
    order.forEach((k, j) => timers.push(window.setTimeout(() => { setActive(k); if (j === order.length - 1) off(); }, 1400 + j * 1050)));
    return stop;
  }, [framed]);
  let n = 0;
  const render = (p: Piece, key: number): ReactNode => {
    if (typeof p === 'string') return <Fragment key={key}>{p}</Fragment>;
    if ('nowrap' in p) return <span key={key} className="nowrap">{p.nowrap.map(render)}</span>;
    const i = n++;
    return (
      <a
        key={key}
        href={p.href}
        ref={(el) => { links.current[i] = el; }}
        className={`part${p.k ? ' part-k' : ''}${framed && i === active ? ' on' : ''}`}
        {...(p.ext ? { rel: 'noreferrer' } : {})}
        onPointerEnter={framed ? () => setActive(i) : undefined}
        onPointerDown={framed ? () => setActive(i) : undefined}
        onFocus={framed ? () => setActive(i) : undefined}
      >{p.t}</a>
    );
  };
  return (
    <p ref={hostRef} className={`cite${framed ? ' framed' : ''}${lit ? ' lit' : ''}${className ? ' ' + className : ''}`}>
      {CITE.map(render)}
      {framed && <Frame host={hostRef} target={links.current[active] ?? null} />}
    </p>
  );
}

// ---------- The three ladders: the set piece ----------
function Ladders() {
  const wrap = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const rungs = useRef<(HTMLParagraphElement | null)[]>([]);
  const [i, setI] = useState(0);
  const [seen, setSeen] = useState(false);
  useGSAP(() => {
    const st = ScrollTrigger.create({
      trigger: wrap.current, start: 'top 60%', end: 'bottom bottom',
      onToggle: (s) => setSeen(s.isActive),
      onUpdate: (s) => setI(Math.min(2, Math.floor(s.progress * 3.2))),
    });
    return () => st.kill();
  }, { scope: wrap });
  return (
    <div className="ladder" ref={wrap}>
      <div className="ladder-stage" ref={stage}>
        <div className="ladder-side">
          <Head id="research" sub={paper.status}>{roles[3]}</Head>
          <h3 className="paper-title">{paper.title}</h3>
          <p className="ladder-lede">One ladder, three hands. Scroll to climb it.</p>
        </div>
        <div className="rungs" ref={box}>
          {paper.ladders.map((l, k) => (
            <p key={l.who} ref={(el) => { rungs.current[k] = el; }} className={`rung rung-${k}${k === i ? ' on' : ''}`}>
              <span className="rung-who">{l.who}</span><span className="rung-when">, {l.when}.</span>
              <span className="rung-where">{l.where}.</span>
            </p>
          ))}
          {seen && <Frame host={box} target={rungs.current[i] ?? null} />}
        </div>
      </div>
    </div>
  );
}

function Head({ id, children, sub }: { id: string; children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="head">
      <h2 id={id + '-h'} className="head-part">{children}</h2>
      {sub ? <p className="head-sub">{sub}</p> : null}
    </header>
  );
}

function Out({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return <a className={`out${className ? ' ' + className : ''}`} href={href} rel="noreferrer">{children}<span className="out-arrow" aria-hidden="true">↗</span></a>;
}

export default function CitePage() {
  useVersion('cite');
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const [today, ...earlier] = notes;
  const root = useRef<HTMLDivElement>(null);

  // The screenshots settle into their frames as they pass (objects move, never text).
  useGSAP(() => {
    if (still) return;
    gsap.utils.toArray<HTMLElement>('.shot img').forEach((img) => {
      gsap.fromTo(img, { scale: 1.12, yPercent: -3 }, { scale: 1, yPercent: 3, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }, { scope: root });

  return (
    <div className="v-cite" ref={root}>
      <a className="skip-x" href="#main">Skip to the page</a>
      <main id="main">
        {/* ---------- The cite ---------- */}
        <section className="open" aria-labelledby="name">
          <div className="mast">
            <h1 id="name" className="mast-name">{PERSON.name}</h1>
            <p className="mast-short">{PERSON.short.join(' ')}</p>
          </div>
          <Cite framed className="cite-open" />
          <p className="open-hint">Every part of the cite opens that part of the page.</p>
        </section>

        {/* ---------- Today ---------- */}
        <section className="today wrap" id="today" aria-labelledby="today-h">
          <div className="today-card">
            <div className="today-date">
              <h2 id="today-h" className="today-label">Today</h2>
              <p className="today-when">{today ? <time dateTime={today.date}>{formatDate(today.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time> : loaded ? 'No note yet' : 'Loading the note'}</p>
            </div>
            <div className="today-body">
              {today ? today.body.map((p, k) => <p key={k}>{p}</p>) : <p className="today-wait">{loaded ? 'The daily note will appear here when he posts one.' : 'The latest note is on its way.'}</p>}
            </div>
            {earlier.length > 0 && (
              <details className="earlier">
                <summary><span>Earlier notes</span><span className="earlier-n">{earlier.length}</span></summary>
                <ol>
                  {earlier.map((nt) => (
                    <li key={nt.date}>
                      <time dateTime={nt.date}>{formatDate(nt.date)}</time>
                      <div>{nt.body.map((p, k) => <p key={k}>{p}</p>)}</div>
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </div>
        </section>

        {/* ---------- Seth 26: about ---------- */}
        <section className="about wrap" id="about" aria-labelledby="about-h">
          <Head id="about" sub={PERSON.name}>Seth 26.</Head>
          <div className="about-body">
            <p className="lead">{PERSON.about[0]}</p>
            <p>{PERSON.about[1]}</p>
            <p className="aside">{PERSON.aside}</p>
          </div>
        </section>

        {/* ---------- founder of MITEZ, head coach of Skeptical ---------- */}
        <div className="pair wrap">
          <section className="mitez" id="mitez" aria-labelledby="mitez-h">
            <Head id="mitez">{roles[0]}</Head>
            <p className="body-l">{chapter('mitez')}</p>
            <Out href="https://mitez.org">mitez.org</Out>
          </section>
          <section className="skeptical" id="skeptical" aria-labelledby="skeptical-h">
            <Head id="skeptical" sub={DEBATE.team.role}>{roles[1]}</Head>
            <p className="body-l">{DEBATE.team.line}</p>
            <p>{DEBATE.team.record}</p>
            <p className="links-row"><Out href={DEBATE.team.href}>{host(DEBATE.team.href)}</Out><Out href={DEBATE.team.github}>The source</Out></p>
          </section>
        </div>

        {/* ---------- debater ---------- */}
        <section className="debate wrap" id="debate" aria-labelledby="debate-h">
          <Head id="debate">{roles[2]}</Head>
          <div className="wins">
            {DEBATE.wins.map((w) => (
              <article className="win" key={w.where}>
                <h3 className="win-title">{w.title}</h3>
                <p className="win-event">{w.event}</p>
                <p className="win-where">{w.where}, {w.when}.</p>
              </article>
            ))}
          </div>
          <div className="debate-foot">
            <p className="body-l">{chapter('debate')}</p>
            <div className="next">
              <h3 className="small-h">Up next</h3>
              <ul>{DEBATE.next.map((x) => <li key={x.where}><span className="next-where">{x.where}</span><span className="next-event">{x.event}</span></li>)}</ul>
              <p className="status">{NOW.status}</p>
            </div>
          </div>
        </section>

        {/* ---------- researcher: the paper ---------- */}
        <section className="research" id="research" aria-labelledby="research-h">
          <Ladders />
          <div className="wrap paper">
            <blockquote className="epi">
              <p>{paper.epigraph.text}</p>
              <footer>{paper.epigraph.source}</footer>
            </blockquote>
            <div className="paper-grid">
              <div>
                <h4 className="small-h">Abstract</h4>
                <p className="abstract">{paper.abstract}</p>
              </div>
              <div>
                <h4 className="small-h">Keywords</h4>
                <ul className="keys">{paper.keywords.map((k) => <li key={k}>{k}</li>)}</ul>
                <h4 className="small-h">Where it lives</h4>
                <ul className="paper-links">{paper.links.map((l) => <li key={l.label}><Out href={l.href}>{l.label}</Out></li>)}</ul>
              </div>
            </div>
            <article className="wess">
              <h3 className="wess-title">{wess.title}</h3>
              <p className="wess-status">{wess.status}</p>
              <p>{wess.abstract}</p>
            </article>
          </div>
        </section>

        {/* ---------- developer: the work ---------- */}
        <section className="work wrap" id="work" aria-labelledby="work-h">
          <Head id="work">{roles[4]}</Head>
          <p className="body-l work-lede">{chapter('builds')}</p>
          <p className="cite work-index">
            {WORK.map((w, k) => <Fragment key={w.slug}><a className="part" href={'#w-' + w.slug}>{w.name}</a>{k < WORK.length - 1 ? '; ' : '.'} </Fragment>)}
          </p>
          <ol className="works">
            {WORK.map((w) => (
              <li className="item" key={w.slug} id={'w-' + w.slug}>
                <h3 className="item-cite"><span className="item-name">{w.name}</span><span className="item-kind">, {w.kind}.</span></h3>
                <figure className="shot">
                  <img src={src(w.img)} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={750} />
                </figure>
                <div className="item-text">
                  <p>{w.line}</p>
                  <p className="item-stack">{w.stack}</p>
                  {w.href ? <Out href={w.href}>{host(w.href)}</Out> : <p className="item-local">No public link.</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- Live from GitHub ---------- */}
        <section className="gh wrap" id="github" aria-labelledby="github-h">
          <Head id="github" sub={gh.live ? 'Live from GitHub' : 'From GitHub'}>Works in progress.</Head>
          <div className="gh-grid">
            {gh.activity.length > 0 && (
              <div className="gh-commits">
                <h3 className="small-h">Latest commits</h3>
                <ol>
                  {gh.activity.slice(0, 6).map((a) => (
                    <li key={a.href}>
                      <a href={a.href} rel="noreferrer"><span className="c-msg">{a.message}</span></a>
                      <span className="c-meta">{a.repo}, {ago(a.at)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <div className="gh-repos">
              <h3 className="small-h">Repositories</h3>
              <ol className="biblio">
                {gh.repos.slice(0, 8).map((r) => (
                  <li key={r.name}>
                    <a href={r.href} rel="noreferrer" className="b-name">{GITHUB.user}/{r.name}</a>
                    {r.language ? <span className="b-lang">. {r.language}</span> : null}
                    {r.description ? <span>. {r.description.replace(/\.$/, '')}.</span> : <span>.</span>}
                    {r.pushedAt ? <span className="b-when"> Pushed {ago(r.pushedAt)}.</span> : null}
                  </li>
                ))}
              </ol>
              <Out href={GITHUB.href} className="out-big">{host(GITHUB.href)}</Out>
            </div>
          </div>
        </section>

        {/* ---------- Now ---------- */}
        <section className="now wrap" id="now" aria-labelledby="now-h">
          <Head id="now">Now.</Head>
          <div className="now-grid">
            <article>
              <h3 className="now-h">{NOW.reading.title}</h3>
              <p>{NOW.reading.body}</p>
              <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </article>
            <article>
              <h3 className="now-h">{NOW.club.title}</h3>
              <p>{NOW.club.body}</p>
            </article>
            <article>
              <h3 className="now-h">Status</h3>
              <p>{NOW.status}</p>
            </article>
          </div>
        </section>

        {/* ---------- Record ---------- */}
        <section className="record wrap" id="record" aria-labelledby="record-h">
          <Head id="record">Record.</Head>
          <p className="stats">{STATS.map((s, k) => <Fragment key={s.label}><span className="stat"><b>{s.to}{s.suffix}</b> {/^[A-Z]{2}/.test(s.label) ? s.label : s.label[0].toLowerCase() + s.label.slice(1)}</span>{k < STATS.length - 1 ? '. ' : '.'}</Fragment>)}</p>
          <div className="record-grid">
            <ol className="honors">
              {HONORS.map((h) => <li key={h.what}><span className="h-what">{h.what}.</span> <span className="h-detail">{h.detail}.</span></li>)}
            </ol>
            <div className="awards">
              {AWARDS.map((a) => (
                <a key={a.site} className="award" href={a.href} rel="noreferrer">
                  <span className="award-img"><img src={src(a.img)} alt={`Certificate for ${a.site}`} loading="lazy" width={600} height={850} /></span>
                  <span className="award-site">{a.site}</span>
                  <span className="award-note">{a.note}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Off the record ---------- */}
        <section className="off wrap" id="off" aria-labelledby="off-h">
          <Head id="off">Off the record.</Head>
          <div className="off-grid">
            <div><h3 className="small-h">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="small-h">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="small-h">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="small-h">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider}, {c.title}.</b> {c.note}</li>)}</ul></div>
          </div>
        </section>

        {/* ---------- Contact: the cite, complete ---------- */}
        <section className="contact wrap" id="contact" aria-labelledby="contact-h">
          <Head id="contact">Contact.</Head>
          <ul className="contact-list">
            {LINKS.filter((l) => l.label !== 'Email').map((l) => (
              <li key={l.label}><span className="cl-label">{l.label}</span>{l.href ? <a href={l.href} rel="noreferrer">{l.value}</a> : <span className="cl-plain">{l.value}</span>}</li>
            ))}
          </ul>
          <div className="closing">
            <Cite lit className="cite-close" />
            <a className="mail" href={LINKS[0].href}>{LINKS[0].value}</a>
          </div>
        </section>
      </main>
      <footer className="foot wrap">
        <p>Draft 60 of the portfolio. Not the live site.</p>
        <p>The frame is remixed from TrueFocus by React Bits. Set in Newsreader and Hanken Grotesk.</p>
      </footer>
    </div>
  );
}
