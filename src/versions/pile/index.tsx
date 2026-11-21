// Draft 45, The pile. His ten honours drop onto the first screen as heavy tags (fancy's Gravity, matter-js),
// the two championships red and twice the size, landing last on top. Pick them up and throw them.
// Below the heap the site is flat tournament-poster pages in Anton and Instrument Sans.
import { useRef, useState } from 'react';
import '@fontsource/anton/400.css';
import '@fontsource-variable/instrument-sans/wght.css';
import './pile.css';
import { ArrowUpRight } from 'lucide-react';
import { AWARDS, CHAPTERS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, STATS, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { still } from '@/lib/utils';
import { Pile, type PileRef } from './Pile';
import antonUrl from '@fontsource/anton/files/anton-latin-400-normal.woff2?url';

// Anton with its ascent trimmed to the caps, so tight poster leading never makes its line boxes collide.
if (typeof document !== 'undefined' && 'FontFace' in window) {
  const ff = new FontFace('Pile Anton', `url(${antonUrl}) format("woff2")`, { ascentOverride: '88%', descentOverride: '9%', lineGapOverride: '0%' });
  document.fonts.add(ff);
  ff.load().catch(() => { /* falls back to Anton */ });
}

const src = (p: string) => import.meta.env.BASE_URL + p;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; epigraph: { text: string; source: string }; pages: number };
const wess = RESEARCH[1];
const debateCh = CHAPTERS.find((c) => c.id === 'debate')!;
const NAV = [
  ['debate', 'Debate'],
  ['research', 'Research'],
  ['work', 'Work'],
  ['today', 'Today'],
  ['github', 'GitHub'],
  ['record', 'Record'],
  ['contact', 'Contact'],
] as const;

const Out = ({ href, children, className = 'pl-link' }: { href: string; children: React.ReactNode; className?: string }) => (
  <a className={className} href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">
    {children}
    <ArrowUpRight aria-hidden="true" className="pl-arrow" size={18} strokeWidth={2.25} />
  </a>
);

export default function PilePage() {
  useVersion('pile');
  const pile = useRef<PileRef>(null);
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const [pick, setPick] = useState(0);
  const note = notes[pick] ?? notes[0];
  const commits = gh.activity.slice(0, 7);

  return (
    <div className="v-pile">
      <a className="skip-x" href="#main">Skip to content</a>

      <header className="pl-hero">
        <div className="pl-band">
          <div className="pl-id">
            <h1 className="pl-name">{PERSON.name}</h1>
            <p className="pl-line">{PERSON.line}</p>
          </div>
          <div className="pl-side">
            <nav className="pl-nav" aria-label="Sections">
              <ul>
                {NAV.map(([id, label]) => (
                  <li key={id} className={'pl-nav-' + id}><a href={'#' + id}>{label}</a></li>
                ))}
              </ul>
            </nav>
            {!still && (
              <div className="pl-act">
                <p className="pl-hint">Pick one up and throw it.</p>
                <button type="button" className="pl-btn" onClick={() => pile.current?.drop()}>Drop them again</button>
              </div>
            )}
          </div>
        </div>
        <Pile ref={pile} />
      </header>

      <main id="main">
        {/* Debate: the two red tags again, still now, with their full text at display size. */}
        <section id="debate" className="pl-sec pl-debate" aria-labelledby="debate-h">
          <div className="pl-wrap">
            <div className="pl-debate-top">
              <h2 id="debate-h" className="pl-h2">{debateCh.title}</h2>
              <p className="pl-lede">{debateCh.body}</p>
            </div>
            <ol className="pl-wins">
              {DEBATE.wins.map((w, i) => (
                <li key={w.where} className="pl-win" style={{ ['--tilt' as string]: i ? '1.4deg' : '-1.8deg' }}>
                  <span className="pl-hole" />
                  <p className="pl-win-t">{w.title}</p>
                  <p className="pl-win-e">{w.event}</p>
                  <p className="pl-win-w">{w.where}, {w.when}</p>
                </li>
              ))}
            </ol>
            <div className="pl-next">
              <h3 className="pl-h3">Up next</h3>
              <ul>
                {DEBATE.next.map((n) => (
                  <li key={n.where}><span className="pl-next-w">{n.where}</span><span className="pl-next-e">{n.event}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="pl-sec pl-ink pl-team" aria-labelledby="team-h">
          <div className="pl-wrap pl-team-in">
            <div>
              <h2 id="team-h" className="pl-team-name">{DEBATE.team.name}</h2>
              <p className="pl-team-role">{DEBATE.team.role}</p>
            </div>
            <div className="pl-team-copy">
              <p className="pl-big">{DEBATE.team.line}</p>
              <p>{DEBATE.team.record}</p>
              <Out href={DEBATE.team.href}>{host(DEBATE.team.href)}</Out>
            </div>
          </div>
        </section>

        <section id="about" className="pl-sec pl-about" aria-labelledby="about-h">
          <div className="pl-wrap pl-about-in">
            <h2 id="about-h" className="pl-stack">
              {PERSON.short.map((s) => <span key={s}>{s}</span>)}
            </h2>
            <div className="pl-prose">
              {PERSON.about.map((p) => <p key={p.slice(0, 16)}>{p}</p>)}
              <p className="pl-aside">{PERSON.aside}</p>
            </div>
          </div>
        </section>

        <section id="research" className="pl-sec pl-research" aria-labelledby="research-h">
          <div className="pl-wrap">
            <h2 id="research-h" className="pl-h2 pl-paper-short">{paper.short}</h2>
            <div className="pl-paper">
              <div className="pl-paper-main">
                <p className="pl-paper-title">{paper.title}</p>
                <p className="pl-meta">{paper.status}. {paper.pages} pages. DOI {paper.doi}</p>
                <blockquote className="pl-epi">
                  <p>{paper.epigraph.text}</p>
                  <cite>{paper.epigraph.source}</cite>
                </blockquote>
                <p className="pl-abstract">{paper.abstract}</p>
                <ul className="pl-kw" aria-label="Keywords">
                  {paper.keywords.map((k) => <li key={k}>{k}</li>)}
                </ul>
              </div>
              <ul className="pl-paper-links">
                {paper.links.map((l) => (
                  <li key={l.label}><Out href={l.href} className="pl-biglink">{l.label}</Out></li>
                ))}
              </ul>
            </div>
            <article className="pl-wess">
              <h3 className="pl-h3">{wess.title}</h3>
              <p className="pl-meta">{wess.status}</p>
              <p>{wess.abstract}</p>
            </article>
          </div>
        </section>

        <section id="work" className="pl-sec pl-work" aria-labelledby="work-h">
          <div className="pl-wrap">
            <h2 id="work-h" className="pl-h2">Shipped</h2>
            <ol className="pl-rows">
              {WORK.map((w, i) => (
                <li key={w.slug} className={'pl-row' + (i % 2 ? ' is-flip' : '')}>
                  <div className="pl-shot">
                    <img src={src(w.img)} alt={`Screenshot of ${w.name}`} loading="lazy" width={1200} height={750} />
                  </div>
                  <div className="pl-row-text">
                    <span className="pl-chip">{w.kind}</span>
                    <h3 className="pl-row-name">{w.name}</h3>
                    <p className="pl-row-line">{w.line}</p>
                    <p className="pl-meta">{w.stack}</p>
                    {w.href ? <Out href={w.href}>{host(w.href)}</Out> : <p className="pl-meta pl-nolink">No public link.</p>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="today" className="pl-sec pl-ink pl-today" aria-labelledby="today-h">
          <div className="pl-wrap pl-today-in">
            <div className="pl-today-main" aria-live="polite">
              <h2 id="today-h" className="pl-today-h">{pick === 0 ? 'Today' : 'From the notes'}</h2>
              {note ? (
                <>
                  <p className="pl-date"><time dateTime={note.date}>{formatDate(note.date)}</time></p>
                  <div className="pl-note">{note.body.map((p) => <p key={p.slice(0, 20)}>{p}</p>)}</div>
                  {pick !== 0 && <button type="button" className="pl-btn pl-btn-ink" onClick={() => setPick(0)}>Back to the latest</button>}
                </>
              ) : (
                <>
                  <p className="pl-date is-wait">{loaded ? 'Nothing yet' : 'One moment'}</p>
                  <p className="pl-note">{loaded ? 'The daily note goes up here. Check back tomorrow.' : 'Fetching the latest note.'}</p>
                </>
              )}
            </div>
            {notes.length > 1 && (
              <div className="pl-earlier">
                <h3 className="pl-h3">Earlier notes</h3>
                <ol>
                  {notes.map((n, i) => (
                    <li key={n.date}>
                      <button type="button" aria-pressed={pick === i} onClick={() => setPick(i)}>
                        <time dateTime={n.date}>{formatDate(n.date, { day: 'numeric', month: 'short', year: 'numeric' })}</time>
                        <span>{n.body[0]}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </section>

        <section id="github" className="pl-sec pl-gh" aria-labelledby="gh-h">
          <div className="pl-wrap">
            <div className="pl-gh-top">
              <h2 id="gh-h" className="pl-h2">Live from GitHub</h2>
              <Out href={GITHUB.href}>{host(GITHUB.href)}</Out>
            </div>
            <div className={'pl-gh-grid' + (commits.length ? '' : ' is-repos')}>
              {commits.length > 0 && (
                <div>
                  <h3 className="pl-h3">Latest commits</h3>
                  <ol className="pl-commits">
                    {commits.map((c) => (
                      <li key={c.href}>
                        <a href={c.href} target="_blank" rel="noreferrer">
                          <span className="pl-c-msg">{c.message}</span>
                          <span className="pl-c-meta">{c.repo}, {ago(c.at)}</span>
                        </a>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              <div>
                <h3 className="pl-h3">Repositories</h3>
                <ol className="pl-repos">
                  {gh.repos.slice(0, commits.length ? 6 : 8).map((r) => (
                    <li key={r.name}>
                      <a href={r.href} target="_blank" rel="noreferrer">
                        <span className="pl-r-name">{r.name}</span>
                        {r.description && <span className="pl-r-desc">{r.description}</span>}
                        <span className="pl-r-lang">{r.language ?? 'Code'}{r.pushedAt ? `, pushed ${ago(r.pushedAt)}` : ''}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section id="now" className="pl-sec pl-now" aria-label="Now">
          <div className="pl-wrap">
            <p className="pl-status">{NOW.status}</p>
            <div className="pl-now-grid">
              <div>
                <h3 className="pl-h3b">{NOW.reading.title}</h3>
                <p>{NOW.reading.body}</p>
                <ul className="pl-kw">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
              <div>
                <h3 className="pl-h3b">{NOW.club.title}</h3>
                <p>{NOW.club.body}</p>
              </div>
            </div>
          </div>
        </section>

        <section id="record" className="pl-sec pl-record" aria-labelledby="record-h">
          <div className="pl-wrap">
            <h2 id="record-h" className="pl-h2">The record</h2>
            <div className="pl-record-grid">
              <div>
                <ol className="pl-honors">
                  {HONORS.map((h) => (
                    <li key={h.what} className={h.what.startsWith('Champion') ? 'is-red' : ''}>
                      <span className="pl-hn-what">{h.what}</span>
                      <span className="pl-hn-det">{h.detail}</span>
                    </li>
                  ))}
                </ol>
                <ul className="pl-stats">
                  {STATS.map((s) => <li key={s.label}><span>{s.to}{s.suffix}</span> {s.label}</li>)}
                </ul>
              </div>
              <ul className="pl-certs">
                {AWARDS.map((a) => (
                  <li key={a.site}>
                    <a href={a.href} target="_blank" rel="noreferrer">
                      <img src={src(a.img)} alt={`WD Awards certificate for ${a.site}`} loading="lazy" width={800} height={1130} />
                      <span className="pl-cert-site">{a.site}</span>
                      <span className="pl-meta">{a.note}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="off" className="pl-sec pl-off" aria-labelledby="off-h">
          <div className="pl-wrap">
            <h2 id="off-h" className="pl-h2 pl-h2-s">Off the record</h2>
            <div className="pl-off-grid">
              <div><h3 className="pl-h3">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="pl-h3">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="pl-h3">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="pl-h3">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider} {c.title}</b> {c.note}</li>)}</ul></div>
            </div>
          </div>
        </section>

        <section id="contact" className="pl-sec pl-contact" aria-labelledby="contact-h">
          <div className="pl-wrap">
            <h2 id="contact-h" className="pl-h3">Write to him</h2>
            <a className="pl-mail" href={LINKS[0].href!}>{LINKS[0].value}</a>
            <ul className="pl-links">
              {LINKS.slice(1).map((l) => (
                <li key={l.label}>
                  <span className="pl-l-label">{l.label}</span>
                  {l.href ? <Out href={l.href}>{l.value}</Out> : <span className="pl-l-val">{l.value}</span>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="pl-foot">
        <p className="pl-foot-name" aria-hidden="true">{PERSON.name}</p>
        <div className="pl-wrap pl-foot-in">
          <p>Draft 45 of the portfolio. Not the live site.</p>
          <p>The pile runs on matter-js, after the Gravity component from fancy (MIT).</p>
        </div>
      </footer>
    </div>
  );
}
