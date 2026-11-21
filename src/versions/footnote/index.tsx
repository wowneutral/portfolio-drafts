// Draft 72, The footnote. Built on tufte-css (github.com/edwardtufte/tufte-css, MIT): one short sentence about him,
// and everything else in its notes. Pressing a red number brings its note level with its line in the margin.
import { useEffect, useRef, useState } from 'react';
import '@fontsource-variable/eb-garamond/wght.css';
import '@fontsource-variable/eb-garamond/wght-italic.css';
import './footnote.css';
import { AWARDS, CHAPTERS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, STATS, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { gsap, useGSAP } from '@/lib/scroll';
import { still } from '@/lib/utils';
import { Sentence, type NoteDef } from './Sentence';

const src = (p: string) => import.meta.env.BASE_URL + p;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; ladders: { who: string; when: string; where: string }[]; epigraph: { text: string; source: string }; doi: string; pages: number };
const wess = RESEARCH[1];
const chapter = (id: string) => CHAPTERS.find((c) => c.id === id)!;
const first = (s: string) => s.slice(0, s.indexOf('.') + 1);
const lead = (s: string, n: number) => { const w = s.split(' '); return [w.slice(0, n).join(' '), ' ' + w.slice(n).join(' ')]; };

const HERO_NOTES: NoteDef[] = [
  { n: 1, label: 'About', to: '#note-1', body: <>Age {PERSON.age}, {PERSON.home}.</> },
  { n: 2, label: 'Debate', to: '#note-2', body: <>{chapter('debate').title}, at {DEBATE.wins[0].where} and {DEBATE.wins[1].where}.</> },
  { n: 3, label: 'Research', to: '#note-3', body: <><i>{paper.short}</i>. {paper.status}.</> },
  { n: 4, label: 'Work', to: '#note-4', body: <>{chapter('builds').body}</> },
  { n: 5, label: 'MITEZ', to: '#note-5', body: <>{first(chapter('mitez').body)}</> },
  { n: 6, label: 'Skeptical', to: '#note-6', body: <>{first(DEBATE.team.line)}</> },
  { n: 7, label: 'Everything else', to: '#note-7', body: <>His words, from his own list of dislikes. So the rest is notes.</> },
];

function NoteHead({ n, title }: { n: number; title: string }) {
  return (
    <div className="note-head">
      <a className="note-num" href={`#hero-ref-${n}`} aria-label={`Note ${n}: back to the sentence`}>{n}</a>
      <h2>{title}</h2>
    </div>
  );
}

type W = (typeof WORK)[number];
function WorkRow({ w }: { w: W }) {
  const img = <img src={src(w.img)} alt={`${w.name}, a screenshot`} width={1200} height={w.slug === 'jarvis' ? 852 : 680} loading="lazy" decoding="async" />;
  return (
    <div className="col row work-row">
      <figure className="marginnote work-fig">
        {w.href ? <a href={w.href} tabIndex={-1} aria-hidden="true">{img}</a> : img}
      </figure>
      <h3>{w.name}</h3>
      <span className="kind">{w.kind}</span>
      <p>{w.line}</p>
      <p className="stack"><span className="sc">Built with</span> {w.stack}</p>
      {w.href ? <a className="go" href={w.href}>{host(w.href)}</a> : <p className="stack"><i>Runs on his own machine; no public link.</i></p>}
    </div>
  );
}

function GitHubNote() {
  const gh = useGitHub();
  const commits = gh.activity.slice(0, 6);
  return (
    <div className="col row gh">
      <div className="marginnote">
        {commits.length ? (
          <>
            <span className="label">Latest commits</span>
            {commits.map((c, i) => (
              <span className="commit" key={i} style={{ display: 'block', marginTop: '.7rem' }}>
                <span className="sc">{c.repo}</span>
                <a className="msg" href={c.href}>{c.message}</a>
                <span className="when">{ago(c.at)}</span>
              </span>
            ))}
          </>
        ) : (
          <>
            <span className="label">From GitHub</span>
            His public repositories. The full list lives at <a href={GITHUB.href}>{host(GITHUB.href)}</a>.
          </>
        )}
      </div>
      <h3>Live from GitHub</h3>
      <ol className="plain repos">
        {gh.repos.slice(0, 8).map((r) => (
          <li key={r.name}>
            <a href={r.href}>{r.name}</a>
            <span>{r.description}{r.language && <span className="lang"> {r.language}{r.pushedAt ? `, pushed ${ago(r.pushedAt)}` : ''}</span>}</span>
          </li>
        ))}
      </ol>
      <p><a href={GITHUB.href}>All of it on GitHub</a></p>
    </div>
  );
}

function Today() {
  const { notes, loaded } = useNotes();
  const [sel, setSel] = useState(0);
  const cur = notes[sel];
  return (
    <div className="col row today">
      {notes.length > 1 && (
        <div className="marginnote">
          <span className="label">Every note so far</span>
          <ul className="days">
            {notes.slice(0, 12).map((x, i) => (
              <li key={x.date}>
                <button type="button" aria-pressed={i === sel} onClick={() => setSel(i)}>{formatDate(x.date)}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <h3>Today</h3>
      {cur ? (
        <>
          <time className="today-date" dateTime={cur.date}>{formatDate(cur.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time>
          <div className="today-body" aria-live="polite">{cur.body.map((p, i) => <p key={i}>{p}</p>)}</div>
        </>
      ) : (
        <>
          <span className="today-date">{loaded ? 'Status' : 'Today'}</span>
          <div className="today-body"><p>{NOW.status}</p></div>
        </>
      )}
    </div>
  );
}

export default function Footnote() {
  useVersion('footnote');
  const root = useRef<HTMLDivElement>(null);
  const [read, setRead] = useState<Set<number>>(() => new Set());
  const mark = (n: number) => setRead((s) => (s.has(n) ? s : new Set(s).add(n)));

  // Following a "note" link anywhere also counts as opening it.
  useEffect(() => {
    const on = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.('a[href^="#note-"]');
      if (a) mark(+a.getAttribute('href')!.slice(6));
    };
    document.addEventListener('click', on, true);
    return () => document.removeEventListener('click', on, true);
  }, []);

  // Note 2 breaks out: its rules open from the width of the column to the width of the page.
  useGSAP(() => {
    if (still) return;
    gsap.fromTo('.v-footnote .breakout .rule', { scaleX: 0.48 }, {
      scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: '.v-footnote .breakout', start: 'top 92%', end: 'top 30%', scrub: 0.6 },
    });
  }, { scope: root });

  const [ab0, ab0rest] = lead(PERSON.about[0], 4);
  const [rd0, rd0rest] = lead(NOW.reading.body, 1);
  const opened = [...read].filter((n) => n <= 7).length;

  const NOTE8: NoteDef = {
    n: 8, label: 'Contact', to: '',
    body: (
      <>
        <span className="contact" style={{ display: 'block' }}>
          {LINKS.map((l) => (
            <span key={l.label} style={{ display: 'block' }}>
              <span className="k">{l.label}</span>
              {l.href ? <a href={l.href}>{l.value}</a> : <span>{l.value}</span>}
            </span>
          ))}
        </span>
        <span style={{ display: 'block' }}>Draft 72 of the portfolio. Not the live site.</span>
        <span className="colophon" style={{ display: 'block' }}>Set in EB Garamond on tufte-css, by Dave Liepmann and contributors, MIT licence.</span>
      </>
    ),
  };

  return (
    <div className="v-footnote" ref={root}>
      <a className="skip-x" href="#main">Skip to the notes</a>
      <main id="main">
        <section className="hero" aria-labelledby="fn-h1">
          <div className="page head">
            <h1 id="fn-h1">{PERSON.name}</h1>
            <p className="subtitle">{PERSON.line}</p>
            <Sentence id="hero" notes={HERO_NOTES} onOpen={mark} />
          </div>
        </section>

        <section id="note-1" className="note" aria-labelledby="h-1">
          <div className="page">
            <div className="note-head">
              <a className="note-num" href="#hero-ref-1" aria-label="Note 1: back to the sentence">1</a>
              <h2 id="h-1">About</h2>
            </div>
            <p>
              <span className="marginnote"><span className="label">Aside</span>{PERSON.aside}</span>
              <span className="newthought">{ab0}</span>{ab0rest}
            </p>
            <p>{PERSON.about[1]}</p>
          </div>
        </section>

        <section id="note-2" className="note" aria-labelledby="h-2">
          <div className="page">
            <div className="note-head">
              <a className="note-num" href="#hero-ref-2" aria-label="Note 2: back to the sentence">2</a>
              <h2 id="h-2">Debate</h2>
            </div>
            <p>
              {chapter('debate').body}
              <span className="marginnote">Too big for a footnote, so they leave the column.</span>
            </p>
          </div>
          <div className="breakout">
            <span className="rule t" aria-hidden="true" />
            <ol className="wins">
              {DEBATE.wins.map((w) => (
                <li className="win" key={w.where}>
                  <p className="title">{w.title}</p>
                  <p className="what">
                    <span className="event">{w.event}</span>
                    <span className="where">{w.where}</span>
                    <span className="when">{w.when}</span>
                  </p>
                </li>
              ))}
            </ol>
            <span className="rule b" aria-hidden="true" />
          </div>
          <div className="page">
            <h3>Up next</h3>
            <div className="col row">
              <p className="marginnote">His team, Skeptical, is <a href="#note-6">note 6</a>.</p>
              <ul className="plain">
                {DEBATE.next.map((x) => <li key={x.where}><span className="sc">{x.event}</span>, <i>{x.where}</i></li>)}
              </ul>
            </div>
          </div>
        </section>

        <section id="note-3" className="note" aria-labelledby="h-3">
          <div className="page">
            <div className="note-head">
              <a className="note-num" href="#hero-ref-3" aria-label="Note 3: back to the sentence">3</a>
              <h2 id="h-3">Research</h2>
            </div>
            <div className="epigraph">
              <blockquote>
                <p>{paper.epigraph.text}</p>
                <footer><cite>{paper.epigraph.source}</cite></footer>
              </blockquote>
            </div>
            <h3 className="paper-title">{paper.title}</h3>
            <p>
              <span className="marginnote"><span className="label">{paper.status}</span>{paper.pages} pages. DOI {paper.doi}.</span>
              {paper.abstract}
            </p>
            <div className="col row">
              <div className="marginnote">
                <span className="label">The three ladders</span>
                {paper.ladders.map((l) => (
                  <span key={l.who} style={{ display: 'block', marginTop: '.55rem' }}><i>{l.who}</i>, {l.when}. {l.where}.</span>
                ))}
              </div>
              <p className="keywords">{paper.keywords.join(', ')}</p>
              <p className="links">{paper.links.map((l) => <a key={l.label} href={l.href}>{l.label}</a>)}</p>
            </div>
            <h3>{wess.title}</h3>
            <p>
              <span className="marginnote"><span className="label">{wess.status}</span>Old High German, into English.</span>
              {wess.abstract}
            </p>
          </div>
        </section>

        <section id="note-4" className="note" aria-labelledby="h-4">
          <div className="page">
            <div className="note-head">
              <a className="note-num" href="#hero-ref-4" aria-label="Note 4: back to the sentence">4</a>
              <h2 id="h-4">Work</h2>
            </div>
            <p><span className="newthought">{chapter('builds').title}.</span> {chapter('builds').body} MITEZ and Skeptical have their own notes, <a href="#note-5">5</a> and <a href="#note-6">6</a>.</p>
            <GitHubNote />
            {WORK.filter((w) => w.slug !== 'mitez' && w.slug !== 'skeptical').map((w) => <WorkRow key={w.slug} w={w} />)}
          </div>
        </section>

        <section id="note-5" className="note" aria-labelledby="h-5">
          <div className="page">
            <div className="note-head">
              <a className="note-num" href="#hero-ref-5" aria-label="Note 5: back to the sentence">5</a>
              <h2 id="h-5">MITEZ</h2>
            </div>
            <p>
              <span className="marginnote"><span className="label">{STATS[0].label}</span><span className="big-n">{STATS[0].to}{STATS[0].suffix}</span></span>
              <span className="newthought">{chapter('mitez').label}.</span> {chapter('mitez').body}
            </p>
            <WorkRow w={WORK[0]} />
          </div>
        </section>

        <section id="note-6" className="note" aria-labelledby="h-6">
          <div className="page">
            <div className="note-head">
              <a className="note-num" href="#hero-ref-6" aria-label="Note 6: back to the sentence">6</a>
              <h2 id="h-6">Skeptical</h2>
            </div>
            <p>
              <span className="marginnote"><span className="label">The record</span>{DEBATE.team.record}</span>
              <span className="newthought">{DEBATE.team.role}.</span> {chapter('coach').body}
            </p>
            <p>{DEBATE.team.line}</p>
            <p className="links"><a href={DEBATE.team.href}>{host(DEBATE.team.href)}</a><a href={DEBATE.team.github}>The code, on GitHub</a></p>
            <WorkRow w={WORK[1]} />
          </div>
        </section>

        <section id="note-7" className="note" aria-labelledby="h-7">
          <div className="page">
            <div className="note-head">
              <a className="note-num" href="#hero-ref-7" aria-label="Note 7: back to the sentence">7</a>
              <h2 id="h-7">Everything else</h2>
            </div>
            <Today />

            <h3>Now</h3>
            <p>
              <span className="marginnote"><span className="label">The shelves</span>{NOW.reading.shelves.map((s) => <span key={s} style={{ display: 'block' }}>{s}</span>)}</span>
              <span className="newthought">{NOW.reading.title}.</span> <span className="newthought">{rd0}</span>{rd0rest}
            </p>
            <p><span className="newthought">{NOW.club.title}.</span> {NOW.club.body}</p>
            <p>{NOW.status}</p>

            <h3>Record</h3>
            <div className="col row">
              <div className="marginnote">
                {STATS.map((s) => <span key={s.label} style={{ display: 'block', marginBottom: '.5rem' }}><span className="big-n">{s.to}{s.suffix}</span> {s.label}</span>)}
              </div>
              <ul className="plain honors">
                {HONORS.map((h) => <li key={h.what}><span>{h.what}</span><span className="d">{h.detail}</span></li>)}
              </ul>
              <div className="certs">
                {AWARDS.map((a) => (
                  <figure key={a.site}>
                    <a href={a.href}><img src={src(a.img)} alt={`Certificate: ${a.site}`} width={720} height={1018} loading="lazy" decoding="async" /></a>
                    <figcaption><i>{a.site}</i>. {a.note}.</figcaption>
                  </figure>
                ))}
              </div>
            </div>

            <h3>Off the record</h3>
            <div className="col off">
              <div><h4>Likes</h4><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h4>Dislikes</h4><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h4>Favourites</h4><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h4>Courses</h4><ul>{COURSES.map((c) => <li key={c.title}><i>{c.title}</i>, {c.provider}. {c.note}</li>)}</ul></div>
            </div>
          </div>
        </section>
      </main>

      <footer className="end">
        <div className="page">
          <p className="tally">
            {opened === 0
              ? 'The notes you open are circled here. All seven are still above.'
              : opened === 7
                ? 'You opened all seven notes. Every number is circled.'
                : `You opened ${opened} of the seven notes; those numbers are circled.`}
          </p>
          <Sentence id="end" notes={[NOTE8]} read={read} end tail={{ lead: ' That was the short ', w: 'version.', n: 8 }} />
        </div>
      </footer>
    </div>
  );
}
