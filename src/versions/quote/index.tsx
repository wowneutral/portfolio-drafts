// Draft 40: the quote. The title of his paper fills the page; its two quotation marks are
// heavy ultramarine solids cut from Newsreader's own glyphs (3D after pmndrs/examples canvas-text, MIT).
// The rest of the site reads as a book: one column, wide margins, page numbers.
import { useState } from 'react';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource-variable/hanken-grotesk/index.css';
import './quote.css';
import { PERSON, DEBATE, RESEARCH, HONORS, AWARDS, STATS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import QuoteBlock, { WEBGL } from './QuoteBlock';
import Plates from './Plates';
import Ladder from './Ladder';
import Closing from './Closing';

const BASE = import.meta.env.BASE_URL;
const PAPER = RESEARCH[0];
const PRAYER = RESEARCH[1];
const words = PAPER.short.split(' ');

const Ext = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

const CONTENTS = [
  { id: 'debate', label: 'Debate', page: 4 },
  { id: 'today', label: 'Today', page: 7 },
  { id: 'research', label: 'Research', page: 9 },
  { id: 'work', label: 'Work', page: 13 },
  { id: 'github', label: 'Live from GitHub', page: 21 },
  { id: 'now', label: 'Now', page: 23 },
  { id: 'record', label: 'Record', page: 25 },
  { id: 'off', label: 'Off the record', page: 27 },
  { id: 'contact', label: 'Contact', page: 29 },
];

const clip = (t: string, n = 96) => (t.length <= n ? t : t.slice(0, t.lastIndexOf(' ', n)).replace(/[,;:.]$/, '') + '\u2026');

const Folio = ({ n }: { n: number }) => <p className="folio" aria-hidden="true">{n}</p>;

function Today() {
  const { notes, loaded } = useNotes();
  const [pick, setPick] = useState(0);
  const note = notes[pick];
  return (
    <section className="page today" id="today" aria-labelledby="today-h">
      <h2 id="today-h" className="sec">Today</h2>
      {!loaded && (
        <div className="pull pull-wait" aria-busy="true">
          <p className="pull-date">Opening today&rsquo;s note</p>
          <p className="pull-body">{NOW.status}</p>
        </div>
      )}
      {loaded && note && (
        <figure className="pull" aria-live="polite">
          <p className="pull-date"><time dateTime={note.date}>{formatDate(note.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></p>
          <blockquote className="pull-body">
            {note.body.map((p, i) => (
              <p key={i}>{i === 0 && <span className="qm" aria-hidden="true">&ldquo;</span>}{p}{i === note.body.length - 1 && <span className="qm" aria-hidden="true">&rdquo;</span>}</p>
            ))}
          </blockquote>
          <figcaption>Armaan, in his daily note</figcaption>
        </figure>
      )}
      {loaded && !notes.length && (
        <div className="pull">
          <p className="pull-date">Right now</p>
          <p className="pull-body">{NOW.status}</p>
        </div>
      )}
      {notes.length > 1 && (
        <div className="earlier">
          <h3 className="sub">Every note</h3>
          <ol className="notes-list">
            {notes.map((n, i) => (
              <li key={n.date}>
                <button type="button" className={i === pick ? 'on' : undefined} aria-pressed={i === pick} onClick={() => setPick(i)}>
                  <span className="nl-date">{formatDate(n.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span className="nl-text">{clip(n.body[0])}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
      <Folio n={7} />
    </section>
  );
}

function GitHubPage() {
  const gh = useGitHub();
  return (
    <section className="page github" id="github" aria-labelledby="gh-h">
      <h2 id="gh-h" className="sec">Live from GitHub</h2>
      <p className="lede">What he keeps in the open, read live from <Ext href={GITHUB.href}>github.com/{GITHUB.user}</Ext>.</p>
      {gh.activity.length > 0 && (
        <>
          <h3 className="sub">Latest commits{gh.commitsThisMonth ? `, ${gh.commitsThisMonth} this month` : ''}</h3>
          <table className="set commits">
            <thead><tr><th scope="col">Commit</th><th scope="col">Repository</th><th scope="col">When</th></tr></thead>
            <tbody>
              {gh.activity.slice(0, 8).map((a, i) => (
                <tr key={i}>
                  <td><Ext href={a.href}>{a.message || 'Commit'}</Ext></td>
                  <td>{a.repo}</td>
                  <td className="num">{ago(a.at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <h3 className="sub">Repositories</h3>
      <table className="set repos">
        <thead><tr><th scope="col">Name</th><th scope="col">What it is</th><th scope="col">Language</th></tr></thead>
        <tbody>
          {gh.repos.slice(0, 8).map((r) => (
            <tr key={r.name}>
              <td><Ext href={r.href}>{r.name}</Ext></td>
              <td>{r.description ?? ''}</td>
              <td className="lang">{r.language ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="more"><Ext className="go" href={GITHUB.href}>Everything on GitHub</Ext></p>
      <Folio n={21} />
    </section>
  );
}

export default function Quote() {
  useVersion('quote');

  return (
    <div className="v-quote">
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="runhead">
        <a href="#contents" className="rh-home">Contents</a>
        <nav aria-label="Sections">
          <ul>
            {CONTENTS.filter((c) => ['debate', 'research', 'work', 'today', 'contact'].includes(c.id)).map((c) => (
              <li key={c.id}><a href={`#${c.id}`}>{c.label}</a></li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main">
        {/* Title page */}
        <section className="titlepage" id="title" aria-labelledby="name">
          <QuoteBlock className="title-block" textSel=".title-text" still={still} enter>
            <p className="title-text" lang="en">
              <span className="tl">{words.slice(0, -1).join(' ')}</span>{' '}
              <span className="tl">{words[words.length - 1]}</span>
            </p>
          </QuoteBlock>
          <div className="byline">
            <p className="by">A paper by</p>
            <h1 id="name">{PERSON.name}</h1>
            <p className="line">{PERSON.line}</p>
          </div>
          {WEBGL && !still && <p className="hint">The marks can be knocked.</p>}
        </section>

        {/* Contents and preface */}
        <section className="spread front" id="contents" aria-labelledby="contents-h">
          <div className="leaf">
            <h2 id="contents-h" className="sec">Contents</h2>
            <ol className="toc">
              {CONTENTS.map((c) => (
                <li key={c.id}><a href={`#${c.id}`}><span className="toc-l">{c.label}</span><span className="dots" aria-hidden="true" /><span className="toc-n">{c.page}</span></a></li>
              ))}
            </ol>
            <Folio n={2} />
          </div>
          <div className="gutter" aria-hidden="true" />
          <div className="leaf">
            <h2 className="sec">Preface</h2>
            <div className="prose">
              {PERSON.about.map((p, i) => <p key={i} className={i === 0 ? 'dropcap' : undefined}>{p}</p>)}
              <p className="aside">{PERSON.aside}</p>
            </div>
            <Folio n={3} />
          </div>
        </section>

        {/* Debate: the two championships, one per page */}
        <section className="debate" id="debate" aria-labelledby="debate-h">
          <h2 id="debate-h" className="sec sec-center">Debate</h2>
          <div className="spread wins">
            {DEBATE.wins.map((w, i) => (
              <div className="leaf win" key={w.where}>
                <p className="win-title">{w.title}</p>
                <p className="win-event">{w.event}</p>
                <p className="win-where">{w.where}, {w.when}</p>
                <Folio n={4 + i} />
              </div>
            )).flatMap((el, i) => (i === 0 ? [el, <div className="gutter" aria-hidden="true" key="g" />] : [el]))}
          </div>
          <div className="page team">
            <h3 className="team-name">{DEBATE.team.name}</h3>
            <p className="team-role">{DEBATE.team.role}</p>
            <div className="prose">
              <p>{DEBATE.team.line}</p>
              <p>{DEBATE.team.record}</p>
            </div>
            <p className="more"><Ext className="go" href={DEBATE.team.href}>skeptical.pages.dev</Ext></p>
            <h3 className="sub">Up next</h3>
            <ul className="next">
              {DEBATE.next.map((n) => <li key={n.where}><span className="nx-where">{n.where}</span><span className="nx-event">{n.event}</span></li>)}
            </ul>
            <Folio n={6} />
          </div>
        </section>

        <Today />

        {/* Research */}
        <section className="page research" id="research" aria-labelledby="research-h">
          <h2 id="research-h" className="sec">Research</h2>
          <p className="paper-status">{PAPER.status}, {PAPER.pages} pages</p>
          <h3 className="paper-title">{PAPER.title}</h3>
          <div className="prose">
            <p className="abstract">{PAPER.abstract}</p>
          </div>
          <p className="keywords"><span className="kw-h">Keywords</span> {PAPER.keywords!.join(' · ')}</p>
          <Ladder />
          <ul className="paper-links">
            {PAPER.links.map((l) => <li key={l.label}><Ext className="go" href={l.href}>{l.label}</Ext></li>)}
          </ul>
          <Folio n={9} />
        </section>

        <section className="epigraph" aria-label="Where the title comes from">
          <QuoteBlock className="epi-block" textSel=".epi-text" still={still} enter={false}>
            <p className="epi-text">{PAPER.epigraph!.text}</p>
          </QuoteBlock>
          <p className="epi-source">{PAPER.epigraph!.source}</p>
        </section>

        <section className="page prayer" aria-labelledby="prayer-h">
          <h3 id="prayer-h" className="paper-title small">{PRAYER.title}</h3>
          <p className="paper-status">{PRAYER.status}</p>
          <div className="prose"><p>{PRAYER.abstract}</p></div>
          <Folio n={12} />
        </section>

        <Plates />

        <GitHubPage />

        {/* Now */}
        <section className="page now" id="now" aria-labelledby="now-h">
          <h2 id="now-h" className="sec">Now</h2>
          <p className="status">{NOW.status}</p>
          <div className="now-two">
            <div>
              <h3 className="sub">{NOW.reading.title}</h3>
              <p>{NOW.reading.body}</p>
              <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <h3 className="sub">{NOW.club.title}</h3>
              <p>{NOW.club.body}</p>
            </div>
          </div>
          <Folio n={23} />
        </section>

        {/* Record */}
        <section className="page record" id="record" aria-labelledby="record-h">
          <h2 id="record-h" className="sec">Record</h2>
          <ul className="index">
            {HONORS.map((h) => <li key={h.what}><span className="ix-what">{h.what}</span><span className="dots" aria-hidden="true" /><span className="ix-detail">{h.detail}</span></li>)}
          </ul>
          <ul className="stats">
            {STATS.map((s) => <li key={s.label}><span className="st-n">{s.to}{s.suffix}</span><span className="st-l">{s.label}</span></li>)}
          </ul>
          <div className="certs">
            {AWARDS.map((a) => (
              <a key={a.site} className="cert" href={a.href} rel="noopener">
                <img src={BASE + a.img} alt={`WD Awards certificate for ${a.site}`} loading="lazy" width={720} height={1018} />
                <span className="cert-site">{a.site}</span>
                <span className="cert-note">{a.note}</span>
              </a>
            ))}
          </div>
          <Folio n={25} />
        </section>

        {/* Off the record */}
        <section className="page off" id="off" aria-labelledby="off-h">
          <h2 id="off-h" className="sec">Off the record</h2>
          <div className="appendix">
            <div><h3 className="sub">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="sub">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="sub">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="sub">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider}, {c.title}.</strong> {c.note}</li>)}</ul></div>
          </div>
          <Folio n={27} />
        </section>

        <Closing />
      </main>

      <footer className="colophon">
        <p>Draft 40 of the portfolio. Not the live site.</p>
        <p>Set in Newsreader and Hanken Grotesk. The marks are cut from Newsreader&rsquo;s own quotation glyphs; 3D after the pmndrs canvas-text example (MIT).</p>
      </footer>
    </div>
  );
}
