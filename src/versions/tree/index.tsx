import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './tree.css';
import { useState } from 'react';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import {
  PERSON, CHAPTERS, DEBATE, RESEARCH, WORK, HONORS, AWARDS, STATS, NOW, COURSES, LIKES, DISLIKES, FAVOURITES, LINKS, GITHUB,
} from '@/content';
import Tree, { ROLE_IDS } from './Tree';
import { Fan, Bough } from './Fan';

const BASE = import.meta.env.BASE_URL;
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { epigraph: { text: string; source: string }; ladders: { who: string; when: string; where: string }[]; keywords: string[]; pages: number };
const wess = RESEARCH[1];

function Today() {
  const { notes, loaded } = useNotes();
  const [open, setOpen] = useState(-1);
  const latest = notes[0];
  const earlier = notes.slice(1, 7);
  const label = latest ? formatDate(latest.date) : loaded ? 'today' : ' ';
  return (
    <section id="today" className="sec sec-today" aria-labelledby="today-h">
      <Bough extra={label} title="Today" id="today" />
      <div className="today-note">
        {latest ? (
          latest.body.map((p, i) => <p key={i}>{p}</p>)
        ) : loaded ? (
          <p>{NOW.status}</p>
        ) : (
          <p className="is-wait" aria-busy="true"><span className="sr-only-x">Loading the latest note</span></p>
        )}
      </div>
      {earlier.length > 0 && (
        <div className="today-earlier">
          <Fan
            node={<span className="lab">earlier</span>}
            lit={open >= 0 ? [open] : []}
            kids={earlier.map((n, i) => (
              <button type="button" className="leafbtn" aria-expanded={open === i} aria-controls="today-open" onClick={() => setOpen(open === i ? -1 : i)}>
                {formatDate(n.date, { day: 'numeric', month: 'long' })}
              </button>
            ))}
          />
          <div id="today-open" className="today-open" aria-live="polite">
            {open >= 0 && earlier[open] && (
              <div className="today-open-in" key={open}>
                <p className="lab">{formatDate(earlier[open].date)}</p>
                {earlier[open].body.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Debate() {
  return (
    <section id="debate" className="sec" aria-labelledby="debate-h">
      <Bough role={2} title="debater" id="debate" />
      <p className="sub">{CHAPTERS[1].title}</p>
      <Fan
        className="fan-wins"
        lit={[0, 1]}
        tall={90}
        kids={DEBATE.wins.map((w) => (
          <div className="win">
            <p className="win-title">{w.title}</p>
            <p className="win-event">{w.event}</p>
            <p className="win-where">{w.where}, {w.when}</p>
          </div>
        ))}
      />
      <p className="debate-body">{CHAPTERS[1].body}</p>
      <Fan
        className="fan-next"
        node={<span className="lab">up next</span>}
        dashed={[0, 1]}
        kids={DEBATE.next.map((n) => (
          <div className="next">
            <p className="next-where">{n.where}</p>
            <p className="next-event">{n.event}</p>
          </div>
        ))}
      />
    </section>
  );
}

function Skeptical() {
  const t = DEBATE.team;
  return (
    <section id="skeptical" className="sec" aria-labelledby="skeptical-h">
      <Bough role={1} title="head coach of Skeptical" id="skeptical" />
      <div className="team">
        <p className="team-name">{t.name}</p>
        <p className="team-role">{t.role}</p>
      </div>
      <Fan
        className="fan-team"
        kids={[
          <div className="team-leaf"><span className="lab">the team</span><p>{t.line}</p></div>,
          <div className="team-leaf"><span className="lab">the record</span><p>{t.record}</p></div>,
        ]}
      />
      <p className="team-go"><a className="ink-link" href={t.href}>skeptical.pages.dev</a></p>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="sec" aria-labelledby="about-h">
      <Bough extra="in his words" title="About" id="about" />
      <div className="col about">
        {PERSON.about.map((p, i) => <p key={i}>{p}</p>)}
        <p className="aside">{PERSON.aside}</p>
      </div>
    </section>
  );
}

function Mitez() {
  const c = CHAPTERS[0];
  return (
    <section id="mitez" className="sec" aria-labelledby="mitez-h">
      <Bough role={0} title="Founder of MITEZ" id="mitez" />
      <div className="col mitez">
        <p className="big">{c.body}</p>
        <p><a className="ink-link" href="https://mitez.org">mitez.org</a></p>
      </div>
    </section>
  );
}

function Research() {
  return (
    <section id="research" className="sec" aria-labelledby="research-h">
      <Bough role={3} title="researcher" id="research" />
      <Fan
        className="fan-papers"
        lit={[0]}
        kids={[
          <a className="leafbtn is-paper" href="#paper">{paper.short}</a>,
          <a className="leafbtn" href="#wessobrunn">{wess.short}</a>,
        ]}
      />
      <article id="paper" className="paper">
        <p className="lab">{paper.status}, {paper.pages} pages</p>
        <h3 className="paper-title">{paper.title}</h3>
        <blockquote className="paper-epi">
          <p>{paper.epigraph.text}</p>
          <cite>{paper.epigraph.source}</cite>
        </blockquote>
        <p className="paper-abs">{paper.abstract}</p>
        <Fan
          className="fan-ladders"
          node={<span className="lab">three ladders</span>}
          kids={paper.ladders.map((l) => (
            <div className="ladder"><p className="ladder-who">{l.who}</p><p className="ladder-when">{l.when}</p><p className="ladder-where">{l.where}</p></div>
          ))}
        />
        <Fan
          className="fan-kw"
          node={<span className="lab">keywords</span>}
          kids={paper.keywords.map((k) => <span className="kw">{k}</span>)}
        />
        <Fan
          className="fan-links"
          node={<span className="lab">read it</span>}
          lit={[0, 1, 2, 3]}
          kids={paper.links.map((l) => <a className="leafbtn" href={l.href}>{l.label}</a>)}
        />
        <p className="doi lab">DOI {paper.doi}</p>
      </article>
      <article id="wessobrunn" className="wess col">
        <p className="lab">{wess.status}</p>
        <h3 className="wess-title">{wess.title}</h3>
        <p>{wess.abstract}</p>
      </article>
    </section>
  );
}

function Work() {
  const [at, setAt] = useState(1);
  const w = WORK[at];
  return (
    <section id="work" className="sec" aria-labelledby="work-h">
      <Bough role={4} title="developer" id="work" />
      <Fan
        className="fan-work"
        node={<span className="lab">the work</span>}
        lit={[at]}
        kids={WORK.map((x, i) => (
          <button type="button" className="leafbtn" aria-pressed={i === at} aria-controls="work-open" onClick={() => setAt(i)} onFocus={() => setAt(i)}>
            {x.name}
          </button>
        ))}
      />
      <div id="work-open" className="work-open" aria-live="polite">
        <figure className="work-img" key={w.slug}>
          <img src={BASE + w.img} alt={`${w.name}, a screenshot`} width={1200} height={750} loading="lazy" />
        </figure>
        <div className="work-text">
          <p className="lab">{w.kind}</p>
          <h3 className="work-name">{w.name}</h3>
          <p>{w.line}</p>
          <p className="work-stack">{w.stack}</p>
          {w.href ? <a className="ink-link" href={w.href}>{w.href.replace(/^https:\/\//, '').replace(/\/$/, '')}</a> : <p className="work-none">No public link.</p>}
        </div>
      </div>
    </section>
  );
}

function GitHub() {
  const { repos, activity, commitsThisMonth, live } = useGitHub();
  const shown = repos.slice(0, 5);
  const leaves = activity.slice(0, 12);
  const [read, setRead] = useState(-1);
  const r = read >= 0 ? leaves[read] : undefined;
  return (
    <section id="github" className="sec" aria-labelledby="github-h">
      <Bough role={4} title="Live from GitHub" id="github" />
      <Fan
        className="fan-repos"
        kids={shown.map((repo) => {
          const mine = leaves.map((a, i) => ({ a, i })).filter(({ a }) => a.repo === repo.name);
          return (
            <div className="repo">
              <a className="repo-name" href={repo.href}>{repo.name}</a>
              {repo.language && <span className="lab">{repo.language}</span>}
              {repo.description && <p className="repo-desc">{repo.description}</p>}
              {mine.length > 0 && (
                <ul className="ticks" aria-label={`Recent commits to ${repo.name}`}>
                  {mine.map(({ a, i }) => (
                    <li key={i}>
                      <a href={a.href} className={'tick' + (read === i ? ' is-on' : '')} onPointerEnter={() => setRead(i)} onFocus={() => setRead(i)} aria-label={`${a.message}, ${ago(a.at)}`}>
                        <span aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      />
      {leaves.length > 0 ? (
        <>
          <p className="readout" aria-hidden="true">{r ? <><span>{r.message}</span> <span className="lab">{r.repo}, {ago(r.at)}</span></> : <span className="lab">each mark is a commit</span>}</p>
          <ol className="commits col">
            {leaves.map((a, i) => (
              <li key={i}>
                <a href={a.href} onPointerEnter={() => setRead(i)}><span className="c-msg">{a.message}</span><span className="lab">{a.repo}, {ago(a.at)}</span></a>
              </li>
            ))}
          </ol>
        </>
      ) : null}
      <p className="gh-foot">
        <a className="ink-link" href={GITHUB.href}>github.com/{GITHUB.user}</a>
        {live && commitsThisMonth !== null && <span className="lab">{commitsThisMonth} commits this month</span>}
      </p>
    </section>
  );
}

function Now() {
  return (
    <section id="now" className="sec" aria-labelledby="now-h">
      <Bough extra="now" title="Now" id="now" />
      <Fan
        className="fan-now"
        kids={[
          <div className="now-leaf"><p className="now-t">{NOW.reading.title}</p><p>{NOW.reading.body}</p><ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul></div>,
          <div className="now-leaf"><p className="now-t">{NOW.club.title}</p><p>{NOW.club.body}</p></div>,
          <div className="now-leaf"><p className="now-t">Status</p><p>{NOW.status}</p></div>,
        ]}
      />
    </section>
  );
}

function Record() {
  return (
    <section id="record" className="sec" aria-labelledby="record-h">
      <Bough extra="record" title="The record" id="record" />
      <Fan
        className="fan-stats"
        kids={STATS.map((s) => <div className="stat"><p className="stat-n">{s.to}{s.suffix}</p><p className="stat-l">{s.label}</p></div>)}
      />
      <ol className="honors">
        {HONORS.map((h) => (
          <li key={h.what}><span className="h-what">{h.what}</span><span className="lab">{h.detail}</span></li>
        ))}
      </ol>
      <Fan
        className="fan-awards"
        node={<span className="lab">WD Awards</span>}
        kids={AWARDS.map((a) => (
          <a className="award" href={a.href}>
            <img src={BASE + a.img} alt={`Certificate for ${a.site}`} loading="lazy" width={600} height={850} />
            <span className="award-site">{a.site}</span>
            <span className="lab">{a.note}</span>
          </a>
        ))}
      />
    </section>
  );
}

function Off() {
  const lists: [string, readonly string[]][] = [
    ['likes', LIKES],
    ['dislikes', DISLIKES],
    ['favourites', FAVOURITES],
    ['courses', COURSES.map((c) => `${c.provider} ${c.title}: ${c.note}`)],
  ];
  return (
    <section id="off" className="sec" aria-labelledby="off-h">
      <Bough extra="off the record" title="Off the record" id="off" />
      <Fan
        className="fan-off"
        kids={lists.map(([k, xs]) => (
          <div className="off-leaf"><span className="lab">{k}</span><ul>{xs.map((x) => <li key={x}>{x}</li>)}</ul></div>
        ))}
      />
    </section>
  );
}

function End() {
  const words = ['Founder of MITEZ', 'head coach of Skeptical', 'debater', 'researcher', 'developer'];
  return (
    <section id="contact" className="sec sec-end" aria-labelledby="contact-h">
      <h2 id="contact-h" className="sr-only-x">Contact</h2>
      <p className="end-line">
        {words.map((w, i) => (
          <span key={w}><a href={'#' + ROLE_IDS[i]}>{w}</a>{i < 4 ? ', ' : '.'} </span>
        ))}
      </p>
      <Fan
        className="fan-links-end"
        node={<span className="lab">write to him</span>}
        lit={[0, 1, 2, 3, 4, 5]}
        kids={[
          LINKS.slice(0, 2),
          LINKS.slice(2, 4),
          LINKS.slice(4, 7),
        ].map((group) => (
          <ul className="links">
            {group.map((l) => (
              <li key={l.label}>
                <span className="lab">{l.label}</span>
                {l.href ? <a href={l.href}>{l.value}</a> : <span className="l-val">{l.value}</span>}
              </li>
            ))}
          </ul>
        ))}
      />
      <footer className="foot">
        <p>Draft 15 of the portfolio. Not the live site.</p>
        <p className="lab">Set in Newsreader and IBM Plex Mono.</p>
      </footer>
    </section>
  );
}

export default function TreePage() {
  useVersion('tree');
  const [lit, setLit] = useState(2);
  return (
    <div className="v-tree">
      <a className="skip-x" href="#main">Skip to content</a>
      <main id="main">
        <section className="hero" aria-labelledby="name-h">
          <h1 id="name-h" className="name">{PERSON.name}</h1>
          <p className="sr-only-x">{PERSON.line}</p>
          <Tree lit={lit} setLit={setLit} />
          <p className="hint">Pull a branch. Press a word to follow it.</p>
        </section>
        <Today />
        <Debate />
        <Skeptical />
        <About />
        <Research />
        <Work />
        <GitHub />
        <Mitez />
        <Now />
        <Record />
        <Off />
        <End />
      </main>
    </div>
  );
}
