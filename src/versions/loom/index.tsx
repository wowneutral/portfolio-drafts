// Draft 18, The loom. A band of cloth runs down the page beside the copy, woven from his GitHub:
// one warp stripe per repository, a few shots of weft per commit (the commit's hash picks the weave),
// one indigo stripe per daily note, and the championships as the one wide indigo band.
// Every heading is woven into the cloth as jacquard lettering. The band unrolls as you read and ends at the selvage.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource-variable/big-shoulders-display';
import './loom.css';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, STATS, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { Band, Loom, startLoom } from './Band';
import { shotsFrom } from './weave';

const src = (p: string) => import.meta.env.BASE_URL + p;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; ladders: { who: string; when: string; where: string }[]; epigraph: { text: string; source: string } };
const wess = RESEARCH[1];

function Row({ id, word, title, children, start, end, pick, dep, className = '' }: {
  id: string; word: string[]; title: string; children: ReactNode; start?: boolean; end?: boolean;
  pick?: { onPick: (i: number) => void; selected: number }; dep?: unknown; className?: string;
}) {
  const sec = useRef<HTMLElement>(null);
  return (
    <section id={id} ref={sec} className={'lm-row ' + className} aria-labelledby={id + '-h'}>
      <Band word={word} sec={sec} start={start} end={end} pick={pick} dep={dep} />
      <div className="lm-copy">
        {id === 'top' ? <h1 id={id + '-h'} className="lm-h lm-h1">{title}</h1> : <h2 id={id + '-h'} className="lm-h">{title}</h2>}
        {children}
      </div>
    </section>
  );
}

export default function LoomPage() {
  useVersion('loom');
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const shots = useMemo(() => shotsFrom(gh.activity, gh.repos), [gh.activity, gh.repos]);
  const loom = useMemo(() => ({ shots, repos: gh.repos }), [shots, gh.repos]);
  const [pickAt, setPickAt] = useState(0);
  const [noteAt, setNoteAt] = useState(0);
  useEffect(() => startLoom(), []);

  const commits = gh.activity.slice(0, 8);
  const live = commits.length > 0;
  const note = notes[noteAt] ?? notes[0];

  return (
    <Loom.Provider value={loom}>
      <div className="v-loom">
        <a className="skip-x" href="#main">Skip to content</a>
        <main id="main">
          <Row id="top" word={['ARMAAN', 'SETH']} title={PERSON.name} start className="lm-open">
            <p className="lm-line">{PERSON.line}</p>
            <p className="lm-short">{PERSON.short.join(' ')}</p>
            <p className="lm-frame">The cloth beside is woven from his GitHub: a few picks of weft for every commit, one stripe of warp for every repository. Read on and it unrolls.</p>
            <p className="lm-today-link">
              <a href="#today">{notes[0] ? <>Today’s note, {formatDate(notes[0].date)}</> : <>Today’s note</>}</a>
            </p>
          </Row>

          <Row id="about" word={['ABOUT']} title="About">
            {PERSON.about.map((p) => <p key={p.slice(0, 12)} className="lm-body">{p}</p>)}
            <p className="lm-aside">{PERSON.aside}</p>
          </Row>

          <Row id="debate" word={['DEBATE']} title="Debate">
            <div className="lm-wins" data-weave="indigo">
              {DEBATE.wins.map((w) => (
                <div key={w.where} className="lm-win">
                  <p className="lm-champ">{w.title}</p>
                  <p className="lm-where">{w.where}</p>
                  <p className="lm-event">{w.event}, {w.when}</p>
                </div>
              ))}
            </div>
            <div className="lm-team">
              <h3 className="lm-h3">{DEBATE.team.name}</h3>
              <p className="lm-role">{DEBATE.team.role}</p>
              <p className="lm-body">{DEBATE.team.line}</p>
              <p className="lm-body lm-dim">{DEBATE.team.record}</p>
              <p><a className="lm-a" href={DEBATE.team.href}>{host(DEBATE.team.href)}</a></p>
            </div>
            <div className="lm-next" data-weave="rule">
              <h3 className="lm-h3">Up next</h3>
              <ul className="lm-pairs">
                {DEBATE.next.map((n) => <li key={n.where}><span className="lm-strong">{n.where}</span><span>{n.event}</span></li>)}
              </ul>
            </div>
          </Row>

          <Row id="research" word={['RESEARCH']} title="Research">
            <h3 className="lm-paper">{paper.title}</h3>
            <p className="lm-meta">{paper.status}, {paper.pages} pages</p>
            <p className="lm-lead">{paper.abstract}</p>
            <blockquote className="lm-quote" data-weave="rule">
              <p>{paper.epigraph.text}</p>
              <footer>{paper.epigraph.source}</footer>
            </blockquote>
            <ol className="lm-ladders" aria-label="The three ladders the paper traces">
              {paper.ladders.map((l) => <li key={l.who}><span className="lm-strong">{l.who}</span><span>{l.when}</span><span className="lm-dim">{l.where}</span></li>)}
            </ol>
            <ul className="lm-keys" aria-label="Keywords">
              {paper.keywords.map((k) => <li key={k}>{k}</li>)}
            </ul>
            <ul className="lm-links">
              {paper.links.map((l) => <li key={l.label}><a className="lm-a" href={l.href}>{l.label}</a></li>)}
            </ul>
            <div className="lm-wess" data-weave="rule">
              <h3 className="lm-h3">{wess.title}</h3>
              <p className="lm-meta">{wess.status}</p>
              <p className="lm-body">{wess.abstract}</p>
            </div>
          </Row>

          <Row id="work" word={['WORK']} title="Work" className="lm-workrow">
            {WORK.map((x) => (
              <article key={x.slug} className="lm-work" data-weave="rule" data-word={x.slug === 'drafts' ? 'ONE HUNDRED|DRAFTS' : x.name.toUpperCase()}>
                <figure className="lm-shot">
                  <img src={src(x.img)} alt={`Screenshot of ${x.name}`} width={1200} height={750} loading="lazy" />
                </figure>
                <div className="lm-wtext">
                  <h3 className="lm-h3">{x.name}</h3>
                  <p className="lm-meta">{x.kind}</p>
                  <p className="lm-body">{x.line}</p>
                  <p className="lm-stack">{x.stack}</p>
                  {x.href ? <p><a className="lm-a" href={x.href}>{host(x.href)}</a></p> : <p className="lm-stack">No public link.</p>}
                </div>
              </article>
            ))}
          </Row>

          <Row id="record" word={['RECORD']} title="Record">
            <ul className="lm-stats">
              {STATS.map((s) => <li key={s.label}><span className="lm-num">{s.to}{s.suffix}</span><span>{s.label}</span></li>)}
            </ul>
            <ol className="lm-honors">
              {HONORS.map((h) => <li key={h.what}><span className="lm-strong">{h.what}</span><span className="lm-dim">{h.detail}</span></li>)}
            </ol>
            <ul className="lm-awards" data-weave="rule">
              {AWARDS.map((a) => (
                <li key={a.site}>
                  <a href={a.href} className="lm-award">
                    <img src={src(a.img)} alt={`WD Awards certificate for ${a.site}`} loading="lazy" />
                    <span className="lm-strong">{a.site}</span>
                    <span className="lm-dim">{a.note}</span>
                  </a>
                </li>
              ))}
            </ul>
          </Row>

          <Row id="now" word={['NOW']} title="Now">
            <p className="lm-lead">{NOW.status}</p>
            <div className="lm-now" data-weave="rule">
              <h3 className="lm-h3">{NOW.reading.title}</h3>
              <p className="lm-body">{NOW.reading.body}</p>
              <ul className="lm-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div className="lm-now" data-weave="rule">
              <h3 className="lm-h3">{NOW.club.title}</h3>
              <p className="lm-body">{NOW.club.body}</p>
            </div>
          </Row>

          <Row id="aside" word={['ASIDES']} title="Off the record">
            <div className="lm-cols">
              <div><h3 className="lm-h4">Likes</h3><ul className="lm-plain">{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="lm-h4">Dislikes</h3><ul className="lm-plain">{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="lm-h4">Favourites</h3><ul className="lm-plain">{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="lm-h4">Courses</h3><ul className="lm-plain">{COURSES.map((c) => <li key={c.title}><span className="lm-strong">{c.provider} {c.title}</span> {c.note}</li>)}</ul></div>
            </div>
          </Row>

          <Row id="github" word={['GITHUB']} title="Live from GitHub" pick={{ onPick: setPickAt, selected: pickAt }} dep={live}>
            <p className="lm-lead">
              {live
                ? <>Each band of cloth here is one commit. Point at one, or tab to it and use the arrow keys.</>
                : <>Each band of cloth here is one repository, woven from its name. Point at one, or tab to it and use the arrow keys.</>}
            </p>
            {gh.live && gh.commitsThisMonth !== null && <p className="lm-meta">{gh.commitsThisMonth} commits pushed this month</p>}
            {live && (
              <ol className="lm-commits">
                {commits.map((c, i) => (
                  <li key={c.href + i} data-weave="group" data-shot={i} data-i={i} data-label={`${c.message}, ${c.repo}, ${ago(c.at)}`} className={pickAt === i ? 'is-on' : ''}>
                    <a className="lm-msg" href={c.href}>{c.message}</a>
                    <span className="lm-dim">{c.repo}, {ago(c.at)}</span>
                  </li>
                ))}
              </ol>
            )}
            <h3 className="lm-h4">Repositories</h3>
            <ul className="lm-repos">
              {gh.repos.slice(0, 8).map((r, i) => (
                <li key={r.name} {...(!live ? { 'data-weave': 'group', 'data-shot': i * 5, 'data-i': i, 'data-label': `${r.name}, ${r.language ?? ''}` } : {})} className={!live && pickAt === i ? 'is-on' : ''}>
                  <a className="lm-msg" href={r.href}>{r.name}</a>
                  {r.description && <span>{r.description}</span>}
                  <span className="lm-dim">{[r.language, r.pushedAt ? 'pushed ' + ago(r.pushedAt) : ''].filter(Boolean).join(', ')}</span>
                </li>
              ))}
            </ul>
            <p><a className="lm-a" href={GITHUB.href}>{host(GITHUB.href)}</a></p>
          </Row>

          <Row id="today" word={['TODAY']} title="Today" className="lm-todayrow" pick={{ onPick: setNoteAt, selected: noteAt }} dep={`${notes.length}:${noteAt}`}>
            {note ? (
              <article className="lm-note" data-weave="note" data-big aria-live="polite">
                <h3 className="lm-date">{formatDate(note.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h3>
                {note.body.map((p) => <p key={p.slice(0, 16)} className="lm-notebody">{p}</p>)}
              </article>
            ) : (
              <article className="lm-note">
                <h3 className="lm-date">{loaded ? 'No note yet today' : 'Fetching today’s note'}</h3>
                <p className="lm-notebody">{NOW.status}</p>
              </article>
            )}
            {notes.length > 1 && (
              <>
                <h3 className="lm-h4">Every note, one stripe each</h3>
                <ol className="lm-notes">
                  {notes.map((n, i) => (
                    <li key={n.date} data-weave="note" {...(i === noteAt ? { 'data-big': '' } : {})} data-i={i} data-label={`Note from ${formatDate(n.date)}`}>
                      <button type="button" className={'lm-noteb' + (i === noteAt ? ' is-on' : '')} aria-pressed={i === noteAt} onClick={() => setNoteAt(i)}>
                        <span className="lm-strong">{formatDate(n.date, { day: 'numeric', month: 'long' })}</span>
                        <span className="lm-dim">{n.body[0]}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </Row>

          <Row id="contact" word={['WRITE']} title="Contact" end>
            <ul className="lm-contact">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <span className="lm-meta">{l.label}</span>
                  {l.href ? <a className="lm-a" href={l.href}>{l.value}</a> : <span className="lm-strong">{l.value}</span>}
                </li>
              ))}
            </ul>
            <footer className="lm-foot">
              <p className="lm-lead">Today’s weaving stops here.</p>
              <p>Draft 18 of the portfolio. Not the live site.</p>
            </footer>
          </Row>
        </main>
      </div>
    </Loom.Provider>
  );
}
