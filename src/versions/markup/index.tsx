// Draft 73, The markup. Base: rough-notation (MIT, github.com/rough-stuff/rough-notation) remixed in pen.ts and Mark.tsx, with roughjs for the margin marks.
import { useRef, useState, type ReactNode } from 'react';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource/carlito/400.css';
import '@fontsource/carlito/700.css';
import './markup.css';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, STATS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { Mark, PenArrow } from './Mark';

const BASE = import.meta.env.BASE_URL;
/** The first few words of a note, for the list of earlier ones. */
const clip = (t: string) => { const w = t.split(' '); return w.length > 9 ? w.slice(0, 9).join(' ') + '\u2026' : t; };
const host = (href: string) => href.replace(/^https?:\/\//, '').replace(/\/$/, '');

/** Split a line of his copy round one phrase, so the pen can mark that phrase and nothing else is retyped. */
function around(text: string, phrase: string, mark: (p: string) => ReactNode) {
  const i = text.indexOf(phrase);
  if (i < 0) return text;
  return <>{text.slice(0, i)}{mark(phrase)}{text.slice(i + phrase.length)}</>;
}

const NAV = [
  ['about', 'About'], ['record', 'Record'], ['research', 'Research'], ['work', 'Work'], ['today', 'Today'], ['contact', 'Contact'],
] as const;

function Sec({ id, title, children, side, className }: { id: string; title: string; children: ReactNode; side?: ReactNode; className?: string }) {
  return (
    <section id={id} className={'mu-sec' + (className ? ' ' + className : '')} aria-labelledby={id + '-h'}>
      <div className="mu-main" data-col>
        <h2 id={id + '-h'} className="mu-h2">{title}</h2>
        {children}
      </div>
      {side && <div className="mu-side">{side}</div>}
    </section>
  );
}

function Today() {
  const { notes, loaded } = useNotes();
  const [pick, setPick] = useState(0);
  const note = notes[pick];
  return (
    <Sec
      id="today" title="Today"
      side={
        <>
          <h3 className="mu-label">Earlier notes</h3>
          {loaded && notes.length > 1 ? (
            <ol className="mu-earlier">
              {notes.map((n, i) => (
                <li key={n.date}>
                  <button type="button" aria-pressed={i === pick} onClick={() => setPick(i)}>
                    <span className="mu-earlier-d">{formatDate(n.date, { day: 'numeric', month: 'short' })}</span>
                    <span className="mu-earlier-t">{clip(n.body[0])}</span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mu-quiet">{loaded ? 'Only one note so far.' : 'Earlier notes are on their way.'}</p>
          )}
        </>
      }
    >
      {note ? (
        <article className="mu-note" aria-live="polite">
          <p className="mu-note-date">
            <Mark kind="highlight" key={note.date}><mark><time dateTime={note.date}>{formatDate(note.date)}</time></mark></Mark>
            {pick === 0 ? <span className="mu-quiet-in">The latest note</span> : <button type="button" className="mu-back" onClick={() => setPick(0)}>Back to the latest</button>}
          </p>
          {note.body.map((p, i) => <p key={i} className="mu-note-p">{p}</p>)}
        </article>
      ) : (
        <article className="mu-note">
          <p className="mu-note-date"><span className="mu-quiet-in">{loaded ? 'No note today yet' : 'Opening today’s note'}</span></p>
          <p className="mu-note-p">{loaded ? 'Check back tomorrow.' : NOW.status}</p>
        </article>
      )}
    </Sec>
  );
}

function Live() {
  const { repos, activity, live } = useGitHub();
  const commits = activity.slice(0, 6);
  const repoList = (
    <ul className="mu-repos">
      {repos.slice(0, 6).map((r, i) => (
        <li key={r.name}>
          <a href={r.href} className="mu-repo-n">{!commits.length && i === 0 ? <Mark kind="underline" pad={3}>{r.name}</Mark> : r.name}</a>
          {r.description && <span className="mu-repo-d">{r.description}</span>}
          {r.language && <span className="mu-repo-l">{r.language}</span>}
        </li>
      ))}
    </ul>
  );
  return (
    <Sec
      id="github" title="Live from GitHub"
      side={
        commits.length ? (
          <>
            <h3 className="mu-label">Repositories</h3>
            {repoList}
            <p><a className="mu-link" href={GITHUB.href}>{host(GITHUB.href)}</a></p>
          </>
        ) : (
          <>
            <p className="mu-side-note">His repositories. When GitHub answers, the latest commits are listed here as they land.</p>
            <p><a className="mu-link" href={GITHUB.href}>{host(GITHUB.href)}</a></p>
          </>
        )
      }
    >
      {commits.length ? (
        <ol className="mu-commits">
          {commits.map((c, i) => (
            <li key={c.href + i}>
              <a href={c.href} className="mu-commit-m">{i === 0 ? <Mark kind="underline" pad={3}>{c.message}</Mark> : c.message}</a>
              <span className="mu-commit-r">{c.repo}, {ago(c.at)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mu-repos-big">{repoList}</div>
      )}
      <p className="mu-sr-live sr-only-x">{live ? 'Live data from GitHub.' : 'Saved list of repositories.'}</p>
    </Sec>
  );
}

export default function Markup() {
  useVersion('markup');
  const honors = useRef<HTMLOListElement>(null);
  const champs = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number[]>(() => WORK.map(() => 0));
  const bump = (i: number) => setHover((h) => h.map((v, j) => (j === i ? v + 1 : v)));
  const paper = RESEARCH[0];
  const prayer = RESEARCH[1];
  const team = DEBATE.team;
  const email = LINKS[0];

  return (
    <div className="v-markup" id="top">
      <a className="skip-x" href="#main">Skip to the page</a>
      <header className="mu-top">
        <a href="#top" className="mu-top-name">Armaan Seth</a>
        <nav aria-label="Sections">
          <ul>{NAV.map(([id, label]) => <li key={id}><a href={'#' + id}>{label}</a></li>)}</ul>
        </nav>
      </header>

      <main id="main">
        <section className="mu-sec mu-open" aria-labelledby="mu-name">
          <div className="mu-main" data-col>
            <h1 id="mu-name" className="mu-name">{PERSON.first}<br />{PERSON.last}</h1>
            <p className="mu-line">
              {around(PERSON.line, 'head coach of Skeptical', (p) => <Mark kind="double" delay={650} duration={900} pad={4} thick={3}><strong>{p}</strong></Mark>)}
            </p>
          </div>
          <div className="mu-side mu-open-side">
            <p>{PERSON.home}</p>
            <p>Age {PERSON.age}</p>
            <p>{PERSON.short.join(' ')}</p>
          </div>
        </section>

        <Sec id="about" title="About" side={<p className="mu-side-note">{PERSON.aside}</p>}>
          <p className="mu-body">
            {around(PERSON.about[0], 'an LD round is really an argument about ethics with a timer running', (p) => <Mark kind="bracket"><strong>{p}</strong></Mark>)}
          </p>
          <p className="mu-body">{PERSON.about[1]}</p>
        </Sec>

        <section id="record" className="mu-sec mu-record" aria-labelledby="record-h">
          <PenArrow from={honors} to={champs} />
          <div className="mu-main" data-col>
            <h2 id="record-h" className="mu-h2">The record</h2>
            <ol className="mu-honors" ref={honors}>
              {HONORS.map((h, i) => (
                <li key={h.what}>
                  <span className="mu-honor-w">
                    {i < 2 ? <Mark kind="circle" delay={i * 900} duration={850} pad={9}><strong>{h.what}</strong></Mark> : h.what}
                  </span>
                  <span className="mu-honor-d">{h.detail}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="mu-side">
            <div className="mu-champs" ref={champs}>
              {DEBATE.wins.map((w) => (
                <div className="mu-champ" key={w.where}>
                  <p className="mu-champ-t">{w.title}</p>
                  <p className="mu-champ-e">{w.event}</p>
                  <p className="mu-champ-w">{w.where}, {w.when}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mu-sec mu-awards" aria-label="Awards and numbers">
          <div className="mu-main" data-col>
            <div className="mu-certs">
              {AWARDS.map((a) => (
                <figure key={a.site} className="mu-cert">
                  <a href={a.href}>
                    <img src={BASE + a.img} alt={`Certificate: ${a.site}, ${a.note}`} width={720} height={1018} loading="lazy" />
                  </a>
                  <figcaption><strong>{a.site}</strong> {a.note}</figcaption>
                </figure>
              ))}
            </div>
          </div>
          <div className="mu-side">
            <ul className="mu-stats">
              {STATS.map((s) => <li key={s.label}><span className="mu-stat-n">{s.to}{s.suffix}</span> {s.label}</li>)}
            </ul>
          </div>
        </section>

        <Sec
          id="skeptical" title="Skeptical"
          side={
            <>
              <h3 className="mu-label">Up next</h3>
              <ul className="mu-next">
                {DEBATE.next.map((n) => <li key={n.where}><span className="mu-next-w">{n.where}</span><span className="mu-next-e">{n.event}</span></li>)}
              </ul>
              <p className="mu-side-note">{NOW.status}</p>
            </>
          }
        >
          <p className="mu-role"><Mark kind="underline" pad={4}><strong>{team.role}</strong></Mark></p>
          <p className="mu-body mu-big">{team.line}</p>
          <p className="mu-body">{team.record}</p>
          <p className="mu-links"><a className="mu-link" href={team.href}>{host(team.href)}</a> <a className="mu-link" href={team.github}>The site&rsquo;s source</a></p>
        </Sec>

        <Sec
          id="research" title="Research"
          side={
            <>
              <h3 className="mu-label">Keywords</h3>
              <ul className="mu-keys">{(paper.keywords ?? []).map((k) => <li key={k}>{k}</li>)}</ul>
              {paper.epigraph && (
                <blockquote className="mu-epi">
                  <p>{paper.epigraph.text}</p>
                  <footer>{paper.epigraph.source}</footer>
                </blockquote>
              )}
            </>
          }
        >
          <p className="mu-meta">{paper.status}, {paper.pages} pages</p>
          <h3 className="mu-paper"><Mark kind="box" pad={16} duration={1100}><strong>{paper.title}</strong></Mark></h3>
          <p className="mu-body mu-big">{paper.abstract}</p>
          <p className="mu-doi">DOI <a href={paper.links[0].href}><Mark kind="underline" pad={3} delay={300}>{paper.doi}</Mark></a></p>
          <ul className="mu-paper-links">
            {paper.links.slice(1).map((l) => <li key={l.label}><a className="mu-link" href={l.href}>{l.label}</a></li>)}
          </ul>
          <div className="mu-prayer">
            <h3 className="mu-h3">{prayer.title}</h3>
            <p className="mu-meta">{prayer.status}</p>
            <p className="mu-body">{prayer.abstract}</p>
          </div>
        </Sec>

        <section id="work" className="mu-sec mu-work" aria-labelledby="work-h">
          <div className="mu-main" data-col><h2 id="work-h" className="mu-h2">Work</h2></div>
          {WORK.map((w, i) => (
            <figure key={w.slug} className="mu-fig" data-col onPointerEnter={() => bump(i)} onFocus={() => bump(i)}>
              <div className="mu-fig-img">
                {w.href ? (
                  <a href={w.href} tabIndex={-1} aria-hidden="true"><img src={BASE + w.img} alt="" width={1200} height={700} loading="lazy" /></a>
                ) : (
                  <img src={BASE + w.img} alt={`Screenshot of ${w.name}`} width={1200} height={700} loading="lazy" />
                )}
              </div>
              <figcaption className="mu-fig-cap">
                <span className="mu-fig-n">Figure {i + 1}</span>
                <h3 className="mu-fig-t"><Mark kind="tick" redraw={hover[i]} gutter={-40}>{w.name}</Mark></h3>
                <span className="mu-fig-k">{w.kind}</span>
                <span className="mu-fig-l">{w.line}</span>
                <span className="mu-fig-s">{w.stack}</span>
                {w.href ? <a className="mu-link" href={w.href}>{host(w.href)}</a> : <span className="mu-fig-s">No public link</span>}
              </figcaption>
            </figure>
          ))}
        </section>

        <Today />
        <Live />

        <Sec id="now" title="Now" side={<><h3 className="mu-label">{NOW.club.title}</h3><p className="mu-side-note">{NOW.club.body}</p></>}>
          <h3 className="mu-h3">{NOW.reading.title}</h3>
          <p className="mu-body mu-big">{NOW.reading.body}</p>
          <ul className="mu-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
        </Sec>

        <Sec
          id="off" title="Off the record"
          side={
            <>
              <h3 className="mu-label">Favourites</h3>
              <ul className="mu-plain">{FAVOURITES.map((f) => <li key={f}>{f}</li>)}</ul>
              <h3 className="mu-label">Courses</h3>
              <ul className="mu-plain">{COURSES.map((c) => <li key={c.title}><strong>{c.provider}, {c.title}.</strong> {c.note}</li>)}</ul>
            </>
          }
        >
          <div className="mu-two">
            <div>
              <h3 className="mu-label">Likes</h3>
              <ul className="mu-plain">{LIKES.map((l) => <li key={l}>{l}</li>)}</ul>
            </div>
            <div>
              <h3 className="mu-label">Dislikes</h3>
              <ul className="mu-plain">
                {DISLIKES.map((d) => (
                  <li key={d}>
                    {around(d, 'Plato', (p) => <Mark kind="strike" thick={2.6}><s>{p}<span className="sr-only-x"> (struck)</span></s></Mark>)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Sec>

        <section id="contact" className="mu-sec mu-contact" aria-labelledby="contact-h">
          <div className="mu-main" data-col>
            <h2 id="contact-h" className="mu-h2">Contact</h2>
            <p className="mu-mail">
              <a href={email.href}>
                <Mark kind="tick" delay={1150} gutter={124}><Mark kind="circle" pad={14} duration={1000}>{email.value}</Mark></Mark>
              </a>
            </p>
            <ul className="mu-contacts">
              {LINKS.slice(1).map((l) => (
                <li key={l.label}>
                  <span className="mu-c-l">{l.label}</span>
                  {l.href ? <a className="mu-link" href={l.href}>{l.value}</a> : <span>{l.value}</span>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="mu-foot">
        <p>Draft 73 of the portfolio. Not the live site.</p>
        <p>Marks drawn with rough-notation and roughjs by Preet Shihn, MIT licence. Set in Newsreader and Carlito.</p>
        <p><a className="mu-link" href="#top">Back to the top</a></p>
      </footer>
    </div>
  );
}
