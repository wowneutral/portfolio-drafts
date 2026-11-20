// Draft 22, The concordance. His whole site is a corpus and the concordance (keyword in context) is its only
// interface: press any word and every line that uses it slides sideways until the word sits on one axis.
import { useMemo, useState } from 'react';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource-variable/hanken-grotesk/wght.css';
import './concordance.css';
import { AWARDS, CHAPTERS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { CorpusCtx, Kwic, Slide, Words } from './Kwic';
import { concord, liveEntries, longestWord, staticEntries, stem, topWord } from './corpus';

const src = (p: string) => import.meta.env.BASE_URL + p;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; ladders: { who: string; when: string; where: string }[]; epigraph: { text: string; source: string } };
const wess = RESEARCH[1];
const ch = (id: string) => CHAPTERS.find((c) => c.id === id)!;
const STATIC = staticEntries();
const preset = (word: string) => concord(STATIC, stem(word));

function Head({ id, word, children }: { id: string; word: string; children?: React.ReactNode }) {
  return (
    <header className="sec-head">
      <h2 id={id + '-h'}>{word}</h2>
      {children}
    </header>
  );
}

export default function ConcordancePage() {
  useVersion('concordance');
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const corpus = useMemo(() => [...STATIC, ...liveEntries(notes, gh.activity, gh.repos)], [notes, gh.activity, gh.repos]);
  const [latest, ...earlier] = notes;
  const [openNote, setOpenNote] = useState<string | null>(null);

  // Section openers.
  const skeptic = useMemo(() => preset('skeptic'), []);
  const champion = useMemo(() => preset('champion'), []);
  const language = useMemo(() => preset('language'), []);
  const built = useMemo(() => preset('build'), []);
  const free = useMemo(() => preset('free'), []);
  const stillRows = useMemo(() => preset('still'), []);
  const today = useMemo(() => {
    const w = latest ? longestWord(latest.body) : null;
    return w ? { word: w.word.toLowerCase(), rows: concord(corpus, w.key) } : null;
  }, [latest, corpus]);
  const github = useMemo(() => {
    const week = Date.now() - 7 * 864e5;
    const recent = gh.activity.filter((a) => new Date(a.at).getTime() > week);
    const msgs = (recent.length ? recent : gh.activity).map((a) => a.message);
    if (msgs.length) {
      const t = topWord(msgs);
      if (t) return { word: t.word, rows: concord(msgs.map((text) => ({ text, src: 'github', where: 'Commits' })), t.key), from: 'commits' };
    }
    const desc = gh.repos.map((r) => r.description ?? '').filter(Boolean);
    const t = topWord(desc);
    return t ? { word: t.word, rows: concord(desc.map((text) => ({ text, src: 'github', where: 'Repos' })), t.key), from: 'repos' } : null;
  }, [gh.activity, gh.repos]);

  return (
    <CorpusCtx.Provider value={corpus}>
      <div className="v-concordance">
        <a className="skip-x" href="#main">Skip to the page</a>
        <main id="main">
          {/* ---------- Opening ---------- */}
          <section id="top" className="open" aria-labelledby="name">
            <h1 id="name" className="name"><span>Armaan</span> <span>Seth</span></h1>
            <Words id="line" text={PERSON.line} className="line" />
            <p className="hint">Press any word.</p>
            <div className="open-k">
              <Slide word="skeptic" rows={skeptic} max={8} />
            </div>
          </section>

          {/* ---------- About ---------- */}
          <section id="about" className="sec about" aria-labelledby="about-h">
            <Head id="about" word="About" />
            <div className="col">
              <Words id="about0" text={PERSON.about[0]} className="lead" />
              <Words id="about1" text={PERSON.about[1]} className="body" />
              <Words id="aside" text={PERSON.aside} className="aside" />
            </div>
          </section>

          {/* ---------- Today ---------- */}
          <section id="today" className="sec today" aria-labelledby="today-h">
            <Head id="today" word="Today" />
            <div className="today-k">
              {today ? <Kwic word={today.word} rows={today.rows} max={6} /> : loaded ? null : <div className="k-wait" aria-hidden="true" />}
            </div>
            {latest ? (
              <article className="note">
                <p className="note-date"><time dateTime={latest.date}>{formatDate(latest.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></p>
                <Words id="note-latest" text={latest.body} className="note-body" />
              </article>
            ) : (
              <article className="note">
                <p className="note-date">{loaded ? 'No note yet today' : 'The note is on its way'}</p>
                <p className="note-body quiet">{loaded ? 'Nothing posted yet. Check back tomorrow.' : ' '}</p>
              </article>
            )}
            {earlier.length ? (
              <div className="earlier">
                <h3 className="small-h">Earlier notes</h3>
                <ol>
                  {earlier.map((n) => {
                    const o = openNote === n.date;
                    return (
                      <li key={n.date} className={o ? 'en open' : 'en'}>
                        <button type="button" className="en-btn" aria-expanded={o} onClick={() => setOpenNote(o ? null : n.date)}>
                          <time dateTime={n.date}>{formatDate(n.date)}</time>
                          <span className="en-first">{n.body[0]}</span>
                        </button>
                        {o ? <Words id={'note-' + n.date} text={n.body} className="en-body" /> : null}
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : null}
          </section>

          {/* ---------- Debate ---------- */}
          <section id="debate" className="sec debate" aria-labelledby="debate-h">
            <Head id="debate" word="Debate" />
            <Kwic word="champion" rows={champion} max={8} />
            <div className="wins">
              {DEBATE.wins.map((w) => (
                <article key={w.where} className="win">
                  <h3 className="win-t">{w.title}</h3>
                  <p className="win-e">{w.event}</p>
                  <p className="win-w">{w.where}<span className="win-y">{w.when}</span></p>
                </article>
              ))}
            </div>
            <div className="col">
              <Words id="debate-body" text={ch('debate').body} className="body" />
            </div>
            <div className="team">
              <div className="team-name">
                <h3>{DEBATE.team.name}</h3>
                <p className="role">{DEBATE.team.role}</p>
              </div>
              <div className="team-text">
                <Words id="team-line" text={DEBATE.team.line} className="lead" />
                <Words id="team-record" text={DEBATE.team.record} className="body" />
                <a className="go" href={DEBATE.team.href}>{host(DEBATE.team.href)}</a>
              </div>
            </div>
            <div className="next">
              <h3 className="small-h">Up next</h3>
              <ul>
                {DEBATE.next.map((n) => (
                  <li key={n.where}><span className="next-w">{n.where}</span><span className="next-e">{n.event}</span></li>
                ))}
              </ul>
            </div>
          </section>

          {/* ---------- MITEZ and Skeptical ---------- */}
          <section id="free" className="sec free" aria-labelledby="free-h">
            <Head id="free" word="Free" />
            <Kwic word="free" rows={free} max={8} />
            <div className="pair">
              <div>
                <h3 className="pair-h">{ch('mitez').title}</h3>
                <Words id="mitez" text={ch('mitez').body} className="body" />
                <a className="go" href="https://mitez.org">mitez.org</a>
              </div>
              <div>
                <h3 className="pair-h">{ch('coach').title}</h3>
                <Words id="coach" text={ch('coach').body} className="body" />
                <a className="go" href={DEBATE.team.href}>{host(DEBATE.team.href)}</a>
              </div>
            </div>
          </section>

          {/* ---------- Research ---------- */}
          <section id="research" className="sec research" aria-labelledby="research-h">
            <Head id="research" word="Research" />
            <Kwic word="language" rows={language} max={8} />
            <div className="col research-lede"><Words id="research-body" text={ch('research').body} className="lead" /></div>
            <article className="paper">
              <h3 className="paper-t">{paper.title}</h3>
              <p className="paper-s">{paper.status}, {paper.pages} pages, DOI {paper.doi}</p>
              <Words id="abstract" text={paper.abstract} className="lead" />
              <Words id="kw" text={paper.keywords.join(', ')} className="keys" />
              <ol className="ladders">
                {paper.ladders.map((l) => (
                  <li key={l.who}><span className="l-who">{l.who}</span><span className="l-when">{l.when}</span><span className="l-where">{l.where}</span></li>
                ))}
              </ol>
              <ul className="paper-links">
                {paper.links.map((l) => <li key={l.label}><a href={l.href}>{l.label}</a></li>)}
              </ul>
            </article>
            <article className="wess">
              <h3>{wess.title}</h3>
              <p className="paper-s">{wess.status}</p>
              <Words id="wess" text={wess.abstract} className="body" />
            </article>
          </section>

          {/* ---------- Work ---------- */}
          <section id="work" className="sec work" aria-labelledby="work-h">
            <Head id="work" word="Work" />
            <Kwic word="built" rows={built} max={8} />
            <div className="col"><Words id="builds" text={ch('builds').body} className="lead" /></div>
            <ol className="projects">
              {WORK.map((w, i) => (
                <li key={w.slug} className={i % 2 ? 'proj flip' : 'proj'}>
                  <figure className="shot">
                    {w.href ? (
                      <a href={w.href} tabIndex={-1} aria-hidden="true"><img src={src(w.img)} alt="" loading="lazy" width={1200} height={680} /></a>
                    ) : (
                      <img src={src(w.img)} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={680} />
                    )}
                  </figure>
                  <div className="proj-text">
                    <h3 className="proj-name">{w.name}</h3>
                    <p className="proj-kind">{w.kind}</p>
                    <Words id={'w-' + w.slug} text={w.line} className="body" />
                    <p className="proj-stack">{w.stack}</p>
                    {w.href ? <a className="go" href={w.href}>{host(w.href)}</a> : <p className="proj-stack nolink">No public link</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* ---------- GitHub ---------- */}
          <section id="github" className="sec github" aria-labelledby="github-h">
            <Head id="github" word="Live from GitHub" />
            {github ? <Kwic word={github.word} rows={github.rows} max={6} label={github.from === 'commits' ? `${github.rows.length} ${github.rows.length === 1 ? 'use' : 'uses'} in recent commits` : `${github.rows.length} uses in his repos`} /> : null}
            {gh.activity.length ? (
              <div className="commits">
                <h3 className="small-h">Recent commits</h3>
                <ol>
                  {gh.activity.slice(0, 8).map((a, i) => (
                    <li key={a.href + i}>
                      <a href={a.href}>
                        <span className="c-msg">{a.message}</span>
                        <span className="c-meta">{a.repo}, {ago(a.at)}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            <div className="repos">
              <h3 className="small-h">Repositories</h3>
              <ol>
                {gh.repos.slice(0, 8).map((r) => (
                  <li key={r.name}>
                    <a href={r.href}>
                      <span className="r-name">{r.name}</span>
                      <span className="r-desc">{r.description ?? 'No description.'}</span>
                      <span className="r-lang">{[r.language, r.pushedAt ? 'pushed ' + ago(r.pushedAt) : ''].filter(Boolean).join(', ')}</span>
                    </a>
                  </li>
                ))}
              </ol>
              <a className="go" href={GITHUB.href}>{host(GITHUB.href)}</a>
            </div>
          </section>

          {/* ---------- Now ---------- */}
          <section id="now" className="sec now" aria-labelledby="now-h">
            <Head id="now" word="Now" />
            <div className="now-grid">
              <div>
                <h3 className="pair-h">{NOW.reading.title}</h3>
                <Words id="reading" text={NOW.reading.body} className="body" />
                <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
              <div>
                <h3 className="pair-h">{NOW.club.title}</h3>
                <Words id="club" text={NOW.club.body} className="body" />
              </div>
            </div>
            <div className="col"><Words id="status" text={NOW.status} className="lead status" /></div>
          </section>

          {/* ---------- Record ---------- */}
          <section id="record" className="sec record" aria-labelledby="record-h">
            <Head id="record" word="Record" />
            <ol className="axis-list">
              {HONORS.map((h) => (
                <li key={h.what}><span className="ax-l">{h.what}</span><span className="ax-r">{h.detail}</span></li>
              ))}
            </ol>
            <div className="certs">
              {AWARDS.map((a) => (
                <a key={a.site} className="cert" href={a.href}>
                  <img src={src(a.img)} alt={`Certificate, ${a.site}`} loading="lazy" width={720} height={1018} />
                  <span className="cert-t">{a.site}</span>
                  <span className="cert-n">{a.note}</span>
                </a>
              ))}
            </div>
          </section>

          {/* ---------- Off the record ---------- */}
          <section id="off" className="sec off" aria-labelledby="off-h">
            <Head id="off" word="Off the record" />
            <div className="off-grid">
              <div>
                <h3 className="small-h">Likes</h3>
                <ul>{LIKES.map((l, i) => <li key={l}><Words id={'like' + i} text={l} as="div" /></li>)}</ul>
              </div>
              <div>
                <h3 className="small-h">Dislikes</h3>
                <ul>{DISLIKES.map((l, i) => <li key={l}><Words id={'dis' + i} text={l} as="div" /></li>)}</ul>
              </div>
              <div>
                <h3 className="small-h">Favourites</h3>
                <ul>{FAVOURITES.map((l, i) => <li key={l}><Words id={'fav' + i} text={l} as="div" /></li>)}</ul>
              </div>
              <div>
                <h3 className="small-h">Courses</h3>
                <ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider} {c.title}.</b> {c.note}</li>)}</ul>
              </div>
            </div>
          </section>

          {/* ---------- Contact ---------- */}
          <section id="contact" className="sec contact" aria-labelledby="contact-h">
            <Head id="contact" word="Contact" />
            <ul className="axis-list links">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <span className="ax-l">{l.label}</span>
                  {l.href ? <a className="ax-r" href={l.href}>{l.value}</a> : <span className="ax-r">{l.value}</span>}
                </li>
              ))}
            </ul>
          </section>

          {/* ---------- Ending ---------- */}
          <section className="end" aria-label="Ending">
            <Kwic word="still" rows={stillRows} max={8} />
            <Words id="short" text={PERSON.short.join(' ')} className="last" />
          </section>
        </main>
        <footer className="foot">
          <p>Draft 22 of the portfolio. Not the live site.</p>
          <p>Set in Newsreader and Hanken Grotesk.</p>
        </footer>
      </div>
    </CorpusCtx.Provider>
  );
}
