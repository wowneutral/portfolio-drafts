// Draft 49, The desk. Prints of everything he built and both design awards lie on a warm grey desk under his name.
// The drag is remixed from fancy's DragElements (MIT); the rest of the site is large sheets laid on the same desk.
import { useRef, useState } from 'react';
import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import './desk.css';
import { ArrowUpRight } from 'lucide-react';
import { AWARDS, CHAPTERS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { coarse } from '@/lib/utils';
import { scrollToY } from '@/lib/scroll';
import { Desk, type DeskRef } from './Desk';

const src = (p: string) => import.meta.env.BASE_URL + p;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; epigraph: { text: string; source: string }; pages: number; ladders: { who: string; when: string; where: string }[] };
const wess = RESEARCH[1];
const debateCh = CHAPTERS.find((c) => c.id === 'debate')!;
const NAV = [['today', 'Today'], ['debate', 'Debate'], ['research', 'Research'], ['work', 'Work'], ['github', 'GitHub'], ['record', 'Record'], ['contact', 'Contact']] as const;

const Out = ({ href, children, className = 'dk-link' }: { href: string; children: React.ReactNode; className?: string }) => (
  <a className={className} href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">
    <span>{children}</span>
    <ArrowUpRight aria-hidden="true" className="dk-arrow" size={18} strokeWidth={2} />
  </a>
);

export default function DeskPage() {
  useVersion('desk');
  const desk = useRef<DeskRef>(null);
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const [pick, setPick] = useState<string | null>(null);
  const top = notes.find((n) => n.date === pick) ?? notes[0];
  const under = notes.filter((n) => n !== top).slice(0, 6);
  const commits = gh.activity.slice(0, 6);

  return (
    <div className="v-desk">
      <a className="skip-x" href="#main">Skip to content</a>

      <header className="dk-hero">
        <div className="dk-band">
          <h1 className="dk-name">{PERSON.name}</h1>
          <div className="dk-side">
            <p className="dk-line">{PERSON.line}</p>
            <nav aria-label="Sections">
              <ul className="dk-nav">
                {NAV.map(([id, label]) => <li key={id}><a href={'#' + id}>{label}</a></li>)}
              </ul>
            </nav>
          </div>
        </div>
        <p className="dk-hint">{coarse ? 'Drag the prints. Tap one to open it.' : 'Drag the prints around. Double-click one to open it.'}</p>
        <Desk ref={desk} />
      </header>

      <main id="main">
        <section className="dk-about" aria-labelledby="about-h">
          <h2 id="about-h" className="dk-short">{PERSON.short.map((w) => <span key={w}>{w}</span>)}</h2>
          <div className="dk-about-copy">
            <p className="dk-lead">{PERSON.about[0]}</p>
            <p>{PERSON.about[1]}</p>
            <p className="dk-aside">{PERSON.aside}</p>
          </div>
        </section>

        {/* Today: the latest note is the sheet on top; earlier ones are tucked beneath, edges showing. */}
        <section id="today" className="dk-today" aria-labelledby="today-h">
          <div className="dk-today-head">
            <h2 id="today-h" className="dk-h2">Today</h2>
            <p className="dk-sub">His daily note, on top of the pile.</p>
          </div>
          <div className="dk-pile">
            <article className="dk-sheet dk-note" aria-live="polite">
              {top ? (
                <>
                  <p className="dk-note-date">
                    <time dateTime={top.date}>
                      <span className="dk-note-day">{formatDate(top.date, { day: 'numeric', month: 'long' })}</span>
                      <span className="dk-mono dk-note-year">{formatDate(top.date, { weekday: 'long', year: 'numeric' })}</span>
                    </time>
                  </p>
                  <div className="dk-note-body">{top.body.map((b) => <p key={b.slice(0, 24)}>{b}</p>)}</div>
                </>
              ) : (
                <>
                  <p className="dk-note-date"><span className="dk-note-day">{loaded ? 'No note yet' : 'Today'}</span></p>
                  <div className="dk-note-body"><p>{NOW.status}</p></div>
                </>
              )}
            </article>
            {under.length > 0 && (
              <ul className="dk-tucked" aria-label="Earlier notes">
                {under.map((n, i) => (
                  <li key={n.date} style={{ ['--i' as string]: i }}>
                    <button type="button" className="dk-tab" onClick={() => setPick(n.date)}>
                      <span className="dk-tab-t">{formatDate(n.date)}</span>
                      <span className="dk-tab-p" aria-hidden="true">{n.body[0]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Debate: one big sheet, two wins at display size. */}
        <section id="debate" className="dk-debate" aria-labelledby="debate-h">
          <div className="dk-sheet dk-big">
            <div className="dk-big-head">
              <h2 id="debate-h" className="dk-h2">{debateCh.title}</h2>
              <p className="dk-big-lede">{debateCh.body}</p>
            </div>
            <ol className="dk-wins">
              {DEBATE.wins.map((w) => (
                <li key={w.where} className="dk-win">
                  <p className="dk-win-t">{w.title}</p>
                  <p className="dk-win-e">{w.event}</p>
                  <p className="dk-mono dk-win-w">{w.where}, {w.when}</p>
                </li>
              ))}
            </ol>
            <div className="dk-team">
              <div>
                <h3 className="dk-team-n">{DEBATE.team.name}</h3>
                <p className="dk-mono dk-team-r">{DEBATE.team.role}</p>
              </div>
              <div className="dk-team-copy">
                <p>{DEBATE.team.line}</p>
                <p>{DEBATE.team.record}</p>
                <Out href={DEBATE.team.href}>{host(DEBATE.team.href)}</Out>
              </div>
            </div>
          </div>
          <aside className="dk-sheet dk-next" aria-labelledby="next-h">
            <h3 id="next-h" className="dk-h3">Up next</h3>
            <ul>
              {DEBATE.next.map((n) => (
                <li key={n.where}><span className="dk-next-w">{n.where}</span><span className="dk-mono dk-next-e">{n.event}</span></li>
              ))}
            </ul>
          </aside>
        </section>

        {/* Research: a sheet set like the paper's first page, the translation on a narrow sheet beside it. */}
        <section id="research" className="dk-research" aria-labelledby="research-h">
          <article className="dk-sheet dk-paper">
            <p className="dk-mono dk-paper-s">{paper.status}. {paper.pages} pages. DOI {paper.doi}</p>
            <h2 id="research-h" className="dk-paper-t">{paper.title}</h2>
            <p className="dk-paper-by">{PERSON.name}</p>
            <blockquote className="dk-epi">
              <p>{paper.epigraph.text}</p>
              <footer className="dk-mono">{paper.epigraph.source}</footer>
            </blockquote>
            <h3 className="dk-h3">Abstract</h3>
            <p className="dk-abs">{paper.abstract}</p>
            <h3 className="dk-h3">Keywords</h3>
            <p className="dk-kw">{paper.keywords.join(', ')}</p>
            <h3 className="dk-h3">Three ladders</h3>
            <ol className="dk-ladders">
              {paper.ladders.map((l) => (
                <li key={l.who}><span className="dk-lad-w">{l.who}</span><span className="dk-mono">{l.when}</span><span className="dk-lad-p">{l.where}</span></li>
              ))}
            </ol>
            <ul className="dk-paper-links" aria-label="Where the paper lives">
              {paper.links.map((l) => <li key={l.label}><Out href={l.href}>{l.label}</Out></li>)}
            </ul>
          </article>
          <article className="dk-sheet dk-wess" aria-labelledby="wess-h">
            <p className="dk-mono dk-paper-s">{wess.status}</p>
            <h3 id="wess-h" className="dk-wess-t">{wess.title}</h3>
            <p>{wess.abstract}</p>
          </article>
        </section>

        {/* Work: each print again, large, with its story straight beside it on the desk. */}
        <section id="work" className="dk-work" aria-labelledby="work-h">
          <div className="dk-work-head">
            <h2 id="work-h" className="dk-h2">Built</h2>
            <p className="dk-sub">{CHAPTERS.find((c) => c.id === 'builds')!.body}</p>
          </div>
          {WORK.map((w, i) => (
            <article key={w.slug} id={'work-' + w.slug} className={'dk-proj' + (i % 3 === 2 ? ' is-wide' : i % 3 === 1 ? ' is-r' : '')} aria-labelledby={'w-' + w.slug}>
              <figure className="dk-big-print" style={{ ['--r' as string]: (i % 2 ? 1.3 : -1.1) + 'deg' }}>
                <img src={src(w.img)} alt={`Screenshot of ${w.name}`} loading="lazy" width={1200} height={700} />
              </figure>
              <div className="dk-proj-copy">
                <p className="dk-mono dk-proj-k">{w.kind}</p>
                <h3 id={'w-' + w.slug} className="dk-proj-n">{w.name}</h3>
                <p>{w.line}</p>
                <p className="dk-mono dk-proj-s">{w.stack}</p>
                {w.href && <Out href={w.href}>{host(w.href)}</Out>}
              </div>
            </article>
          ))}
        </section>

        {/* GitHub as a long printout; Now on a small sheet beside it. */}
        <section className="dk-live" aria-label="GitHub and now">
          <article id="github" className="dk-sheet dk-print-out" aria-labelledby="gh-h">
            <div className="dk-po-head">
              <h2 id="gh-h" className="dk-h2">Live from GitHub</h2>
              <Out href={GITHUB.href}>{host(GITHUB.href)}</Out>
            </div>
            {commits.length > 0 && (
              <>
                <h3 className="dk-h3">Latest commits</h3>
                <ol className="dk-commits">
                  {commits.map((c) => (
                    <li key={c.href}>
                      <a href={c.href} target="_blank" rel="noreferrer" className="dk-commit">
                        <span className="dk-c-m">{c.message}</span>
                        <span className="dk-mono dk-c-r">{c.repo}</span>
                        <span className="dk-mono dk-c-a">{ago(c.at)}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </>
            )}
            <h3 className="dk-h3">Repositories</h3>
            <ul className="dk-repos">
              {gh.repos.slice(0, 8).map((r) => (
                <li key={r.name}>
                  <a href={r.href} target="_blank" rel="noreferrer" className="dk-repo">
                    <span className="dk-mono dk-repo-n">{r.name}</span>
                    {r.description && <span className="dk-repo-d">{r.description}</span>}
                    {r.language && <span className="dk-mono dk-repo-l">{r.language}</span>}
                  </a>
                </li>
              ))}
            </ul>
          </article>
          <aside className="dk-sheet dk-now" aria-labelledby="now-h">
            <h2 id="now-h" className="dk-h3">Now</h2>
            <p className="dk-now-status">{NOW.status}</p>
            <h3 className="dk-now-t">{NOW.reading.title}</h3>
            <p>{NOW.reading.body}</p>
            <ul className="dk-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            <h3 className="dk-now-t">{NOW.club.title}</h3>
            <p>{NOW.club.body}</p>
          </aside>
        </section>

        {/* Record: the honours on one sheet, the two certificates laid beside it. */}
        <section id="record" className="dk-record" aria-labelledby="record-h">
          <div className="dk-sheet dk-honours">
            <h2 id="record-h" className="dk-h2">Record</h2>
            <ol>
              {HONORS.map((h) => (
                <li key={h.what}><span className="dk-hon-w">{h.what}</span><span className="dk-mono dk-hon-d">{h.detail}</span></li>
              ))}
            </ol>
          </div>
          <ul className="dk-certs" aria-label="Design awards">
            {AWARDS.map((a, i) => (
              <li key={a.site} id={'award-' + i} style={{ ['--r' as string]: (i ? 2.2 : -2.6) + 'deg' }}>
                <a href={a.href} target="_blank" rel="noreferrer" className="dk-cert">
                  <img src={src(a.img)} alt={`WD Awards certificate for ${a.site}`} loading="lazy" width={720} height={1018} />
                  <span className="dk-cert-cap">
                    <span className="dk-mono dk-cert-n">{a.site}</span>
                    <span className="dk-cert-note">{a.note}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="dk-off" aria-labelledby="off-h">
          <h2 id="off-h" className="dk-h2">Off the record</h2>
          <div className="dk-off-cols">
            <div><h3 className="dk-h3">Likes</h3><ul>{LIKES.map((l) => <li key={l}>{l}</li>)}</ul></div>
            <div><h3 className="dk-h3">Dislikes</h3><ul>{DISLIKES.map((l) => <li key={l}>{l}</li>)}</ul></div>
            <div><h3 className="dk-h3">Favourites</h3><ul>{FAVOURITES.map((l) => <li key={l}>{l}</li>)}</ul></div>
            <div><h3 className="dk-h3">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><span className="dk-course">{c.provider}, {c.title}</span> <span className="dk-course-n">{c.note}</span></li>)}</ul></div>
          </div>
        </section>

        <section id="contact" className="dk-contact" aria-labelledby="contact-h">
          <h2 id="contact-h" className="dk-h2">Write to him</h2>
          <ul className="dk-links">
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="dk-mono dk-l-k">{l.label}</span>
                {l.href ? <Out href={l.href} className="dk-link dk-l-v">{l.value}</Out> : <span className="dk-l-v dk-l-plain">{l.value}</span>}
              </li>
            ))}
          </ul>
        </section>

        <div className="dk-end">
          <p className="dk-end-t">That is everything on the desk.</p>
          <button type="button" className="dk-again" onClick={() => { scrollToY(0); setTimeout(() => desk.current?.reset(), 650); }}>
            Put the prints back and start again
          </button>
        </div>
      </main>

      <footer className="dk-foot">
        <p>Draft 49 of the portfolio. Not the live site.</p>
        <p>The desk drag is built on DragElements from fancy, MIT licence.</p>
      </footer>
    </div>
  );
}
