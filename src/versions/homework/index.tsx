// Draft 98, The homework. Base: roughjs (MIT, github.com/rough-stuff/rough), remixed in rough.tsx and charts.tsx into hand-ruled statistical charts of his own data on graph paper.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import '@fontsource-variable/schibsted-grotesk/wght.css';
import './homework.css';
import { useVersion } from '@/lib/version';
import { useGitHub, ago, type Activity } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, STATS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { Mark, Over, Rule, Tick, flat, g, pen, seedOf, RED, INK } from './rough';
import { DayBars, HBar, NoteStrip, Pie, Tally } from './charts';

const BASE = import.meta.env.BASE_URL;
const host = (href: string) => href.replace(/^mailto:/, '').replace(/^https?:\/\//, '').replace(/\/$/, '');
const ext = (href: string) => (href.startsWith('http') ? { rel: 'noopener' } : {});
const local = (t: string | number) => new Date(t).toLocaleDateString('en-CA');
const PAPER = RESEARCH[0];
const PRAYER = RESEARCH[1];

const NAV = [
  ['p1', 'Given'], ['p2', 'Debate'], ['p3', 'About'], ['p4', 'Today'], ['p5', 'Research'],
  ['p6', 'Work'], ['p7', 'GitHub'], ['p8', 'Record'], ['p9', 'Now'], ['p10', 'Off the record'],
] as const;

/** One problem on the sheet: its number in the margin, a few words of framing, then the work. */
function Problem({ n, title, children, className }: { n: number; title: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section id={'p' + n} className={'hw-prob ' + (className ?? '')} aria-labelledby={'p' + n + '-h'}>
      <p className="hw-num" aria-hidden="true">{n}</p>
      <div className="hw-work">
        <h2 id={'p' + n + '-h'} className="hw-h2"><span className="sr-only-x">Problem {n}. </span>{title}</h2>
        {children}
      </div>
    </section>
  );
}

/** Commits grouped by local day, from the first to the last day in the data (at most two weeks). */
function byDay(activity: Activity[]) {
  if (!activity.length) return [];
  const keys = activity.map((a) => local(a.at)).sort();
  const last = Date.parse(keys[keys.length - 1] + 'T12:00:00');
  const first = Math.max(Date.parse(keys[0] + 'T12:00:00'), last - 13 * 86400000);
  const out = [];
  for (let t = first; t <= last + 1000; t += 86400000) {
    const k = local(t);
    const d = new Date(t);
    out.push({
      iso: k,
      value: keys.filter((x) => x === k).length,
      label: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }),
      short: d.toLocaleDateString('en-GB', { day: 'numeric' }),
      long: d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
    });
  }
  return out;
}

function Stats({ ver }: { ver: string }) {
  const max = Math.max(...STATS.map((s) => s.to));
  return (
    <>
      <ol className="hw-stats">
        {STATS.map((s, i) => (
          <li key={s.label}>
            <span className="hw-stat-l">{s.label}</span>
            <HBar value={s.to} max={max} seed={s.label} ver={ver} />
            <span className="hw-stat-v">
              {i === STATS.length - 1 ? <Mark seed={seedOf('two' + ver)} pad={9}>{s.to}{s.suffix}</Mark> : <>{s.to}{s.suffix}</>}
            </span>
          </li>
        ))}
      </ol>
      <div className="sr-only-x sr-only"><table>
        <caption>Given</caption>
        <tbody>{STATS.map((s) => <tr key={s.label}><th scope="row">{s.label}</th><td>{s.to}{s.suffix}</td></tr>)}</tbody>
      </table></div>
    </>
  );
}

export default function Homework() {
  useVersion('homework');
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const days = useMemo(() => byDay(gh.activity), [gh.activity]);
  const live = days.length > 0;
  const ver = gh.live ? 'live' + gh.activity.length + (gh.activity[0]?.at ?? '') : 'start';
  const total = days.reduce((a, d) => a + d.value, 0);
  const [bar, setBar] = useState(-1);
  const [pick, setPick] = useState(0);
  useEffect(() => { setPick(0); }, [notes.length]);
  const today = local(Date.now());
  const note = notes[pick];
  const tallies = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of gh.activity) m.set(a.repo, (m.get(a.repo) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [gh.activity]);

  const langs = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of gh.repos) { const k = r.language ?? 'Unlisted'; m.set(k, (m.get(k) ?? 0) + 1); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
  }, [gh.repos]);
  const status = NOW.status;
  const joke = 'behind on stats homework';
  const ji = status.indexOf(joke);

  return (
    <div className="v-homework">
      <a className="skip-x" href="#main">Skip to the work</a>
      <main id="main" className="hw-sheet">
        <header className="hw-head">
          <div className="hw-name">
            <span className="hw-label" aria-hidden="true">Name:</span>
            <h1>{PERSON.name}</h1>
          </div>
          <div className="hw-head-l hw-panel">
            <p className="hw-line">{PERSON.line}</p>
            <p className="hw-status">
              {ji >= 0 ? <>{status.slice(0, ji)}<Mark seed={11} kind="under" pad={4} delay={500}>{joke}</Mark>{status.slice(ji + joke.length)}</> : status}
            </p>
            <nav className="hw-nav" aria-label="Problems">
              <p className="hw-nav-l">Do problems 1 to 10, then check the answer.</p>
              <ol>
                {NAV.map(([id, label], i) => <li key={id}><a href={'#' + id}><span className="hw-nav-n">{i + 1}</span> {label}</a></li>)}
                <li><a href="#answer"><span className="hw-nav-n">=</span> Answer</a></li>
              </ol>
            </nav>
          </div>

          <section id="p1" className="hw-p1" aria-labelledby="p1-h">
            <p className="hw-num" aria-hidden="true">1</p>
            <div className="hw-work">
              {live ? (
                <>
                  <h2 id="p1-h" className="hw-h2"><span className="sr-only-x">Problem 1. </span>Find his commits by day.</h2>
                  <DayBars days={days} ver={ver} sel={bar} onSel={setBar} />
                  <p className="hw-read" aria-live="polite">{bar >= 0 && days[bar] ? `${days[bar].long}: ${days[bar].value} ${days[bar].value === 1 ? 'commit' : 'commits'}.` : 'Press a bar to read it.'}</p>
                  <p className="hw-answer">Total: <Mark seed={seedOf('total' + ver)} pad={10} twice>{total}</Mark> commits, live from GitHub</p>
                  <div className="sr-only-x sr-only"><table>
                    <caption>Commits by day</caption>
                    <tbody>{days.map((d) => <tr key={d.iso}><th scope="row">{d.long}</th><td>{d.value}</td></tr>)}</tbody>
                  </table></div>
                </>
              ) : (
                <>
                  <h2 id="p1-h" className="hw-h2"><span className="sr-only-x">Problem 1. </span>Given:</h2>
                  <Stats ver={ver} />
                  <p className="hw-answer">Find: {STATS[2].label}.</p>
                  <p className="hw-answer hw-answer-b">Both titles are worked in <a className="hw-a" href="#p2">problem 2</a>.</p>
                </>
              )}
            </div>
          </section>
        </header>

        <Problem n={2} title="Given: two tournaments." className="hw-debate">
          <div className="hw-wins">
            {DEBATE.wins.map((w, i) => (
              <article key={w.where} className="hw-win">
                <p className="hw-champ"><Mark seed={seedOf('champ' + i)} twice pad={14} delay={i * 450}>{w.title}</Mark></p>
                <h3 className="hw-win-ev">{w.event}</h3>
                <p className="hw-win-at">{w.where}, {w.when}</p>
              </article>
            ))}
          </div>
          <div className="hw-team">
            <div className="hw-panel">
              <h3 className="hw-h3">{DEBATE.team.name}</h3>
              <p className="hw-role">{DEBATE.team.role}</p>
              <p>{DEBATE.team.line}</p>
              <p>{DEBATE.team.record}</p>
              <p><a className="hw-a" href={DEBATE.team.href} {...ext(DEBATE.team.href)}>{host(DEBATE.team.href)}</a></p>
            </div>
            <div className="hw-panel hw-next">
              <h3 className="hw-h3">Up next</h3>
              <ol>
                {DEBATE.next.map((x) => <li key={x.where}><span className="hw-next-w">{x.where}</span><span>{x.event}</span><Rule seed={seedOf(x.where)} /></li>)}
              </ol>
            </div>
          </div>
        </Problem>

        <Problem n={3} title="Show your work." className="hw-about">
          <div className="hw-cols">
            <div className="hw-panel hw-prose">
              {PERSON.about.map((p) => <p key={p.slice(0, 20)}>{p}</p>)}
              <p className="hw-aside">{PERSON.aside}</p>
            </div>
            {live && (
              <div className="hw-given">
                <h3 className="hw-h3">Given:</h3>
                <Stats ver={ver} />
              </div>
            )}
          </div>
        </Problem>

        <Problem n={4} title="Plot his notes by date." className="hw-today">
          <NoteStrip dates={notes.map((n) => n.date)} sel={pick} onSel={setPick} today={today} label={(d) => formatDate(d, { day: 'numeric', month: 'short' })} />
          <div className="hw-note hw-panel" aria-live="polite">
            {note ? (
              <>
                <h3 className="hw-note-d">{note.date === today ? 'Today, ' : ''}{formatDate(note.date)}</h3>
                {note.body.map((p, i) => <p key={i}>{p}</p>)}
                {notes.length > 1 && (
                  <div className="hw-earlier">
                    <p className="hw-earlier-l">{notes.length} notes on the line. Press a dot, or:</p>
                    <ol>
                      {notes.map((n, i) => (
                        <li key={n.date}><button type="button" className="hw-btn" aria-pressed={i === pick} onClick={() => setPick(i)}>{formatDate(n.date)}</button></li>
                      ))}
                    </ol>
                  </div>
                )}
              </>
            ) : (
              <>
                <h3 className="hw-note-d">{formatDate(today)}</h3>
                <p>{loaded ? NOW.status : 'Fetching the latest note.'}</p>
              </>
            )}
          </div>
          <div className="sr-only-x sr-only"><table>
            <caption>Notes by date</caption>
            <tbody>{notes.map((n) => <tr key={n.date}><th scope="row">{formatDate(n.date)}</th><td>{n.body.join(' ')}</td></tr>)}</tbody>
          </table></div>
        </Problem>

        <Problem n={5} title="Read and summarise." className="hw-research">
          <article className="hw-paper">
            <div className="hw-panel hw-prose">
              <p className="hw-paper-s">{PAPER.status}</p>
              <h3 className="hw-paper-t">{PAPER.title}</h3>
              <p>{PAPER.abstract}</p>
              <p className="hw-kw"><span className="hw-kw-l">Keywords:</span> {(PAPER.keywords ?? []).join(', ')}</p>
              <ul className="hw-links">
                {PAPER.links.map((l) => <li key={l.label}><a className="hw-a" href={l.href} {...ext(l.href)}>{l.label}</a></li>)}
              </ul>
            </div>
            <p className="hw-pages"><Mark seed={seedOf('pages')} pad={16} twice><span className="hw-pages-n">{PAPER.pages}</span></Mark><span className="hw-pages-l">pages</span></p>
          </article>
          <aside className="hw-prayer hw-panel" aria-labelledby="prayer-h">
            <h3 id="prayer-h" className="hw-h3">{PRAYER.title}</h3>
            <p className="hw-paper-s">{PRAYER.status}</p>
            <p>{PRAYER.abstract}</p>
          </aside>
        </Problem>

        <Problem n={6} title="Label each figure." className="hw-figs-p">
          <ol className="hw-figs">
            {WORK.map((w, i) => {
              const img = (
                <span className="hw-fig-img">
                  <img src={BASE + w.img} alt={`Screenshot of ${w.name}`} loading="lazy" width={1200} height={750} />
                  <Over seed={'fig' + w.slug} draw={(W, H) => flat(g.rectangle(-5, -5, W + 10, H + 10, pen(seedOf('fig' + w.slug), { stroke: INK, strokeWidth: 1.4, roughness: 0.7 })))} />
                </span>
              );
              return (
                <li key={w.slug} className={'hw-fig hw-fig-' + (i % 4)}>
                  <figure>
                    {w.href ? <a href={w.href} {...ext(w.href)} className="hw-fig-a" tabIndex={-1} aria-hidden="true">{img}</a> : img}
                    <figcaption className="hw-panel">
                      <p className="hw-fig-n">Fig. {i + 1}. {w.kind}</p>
                      <h3 className="hw-fig-t">{w.href ? <a className="hw-a hw-a-plain" href={w.href} {...ext(w.href)}>{w.name}</a> : w.name}</h3>
                      <p>{w.line}</p>
                      <p className="hw-stack">{w.stack}</p>
                      {w.href ? <p><a className="hw-a" href={w.href} {...ext(w.href)}>{host(w.href)}</a></p> : <p className="hw-stack">No public link.</p>}
                    </figcaption>
                  </figure>
                </li>
              );
            })}
          </ol>
        </Problem>

        <Problem n={7} title={live ? 'Find what he shipped.' : 'List what he keeps on GitHub.'} className="hw-gh">
          {gh.activity.length > 0 && (
            <div className="hw-line-wrap">
              <p className="hw-sub">His {gh.activity.length} most recent commits, newest first{gh.commitsThisMonth != null ? <>; <Mark seed={seedOf('month' + ver)} pad={7}>{gh.commitsThisMonth}</Mark> this month</> : null}.</p>
              <ol className="hw-commits">
                <Over className="hw-axisline" seed={'axis' + ver} draw={(_w, h) => flat(g.line(10, 4, 10, h - 4, pen(seedOf('axis' + ver), { stroke: INK, strokeWidth: 1.6 })))} />
                {gh.activity.map((a, i) => {
                  const d = local(a.at);
                  const newDay = i === 0 || local(gh.activity[i - 1].at) !== d;
                  return (
                    <li key={a.href + i} className={'hw-commit' + (newDay ? ' hw-commit-day' : '')}>
                      <span className="hw-commit-d">{newDay ? formatDate(d, { day: 'numeric', month: 'short' }) : ''}</span>
                      <span className="hw-commit-dot" aria-hidden="true"><Over seed={'c' + a.href} draw={() => flat(g.circle(10, 12, 12, pen(seedOf('c' + a.href), { stroke: INK, fill: INK, fillStyle: 'solid' })))} /></span>
                      <span className="hw-commit-m">
                        <a className="hw-a hw-a-plain" href={a.href} rel="noopener">{a.message || 'Commit'}</a>
                        <span className="hw-commit-r">{a.repo}, {ago(a.at)}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
              <h3 className="hw-h3">Tally by repository</h3>
              <ul className="hw-tallies">
                {tallies.map(([r, n]) => <li key={r}><span className="hw-tal-r">{r}</span><Tally n={n} seed={'tal' + r} /><span className="hw-tal-n">{n}</span></li>)}
              </ul>
            </div>
          )}
          <div className="hw-gh-sum">
            <div className="hw-count">
              <p className="hw-sub">Count the repositories:</p>
              <p className="hw-count-row"><Tally n={gh.repos.length} seed="repos" h={64} /><span aria-hidden="true">=</span><Mark seed={seedOf('repos' + gh.repos.length)} pad={9}>{gh.repos.length}</Mark></p>
            </div>
            <div className="hw-langs">
              <p className="hw-sub">Sort them by language:</p>
              <Pie slices={langs} ver={ver} />
              <div className="sr-only-x sr-only"><table>
                <caption>Repositories by language</caption>
                <tbody>{langs.map((l) => <tr key={l.label}><th scope="row">{l.label}</th><td>{l.value} of {gh.repos.length}</td></tr>)}</tbody>
              </table></div>
            </div>
          </div>
          <ol className="hw-repos">
            {gh.repos.map((r, i) => (
              <li key={r.name}>
                <span className="hw-repo-i" aria-hidden="true">{i + 1}.</span>
                <div className="hw-panel">
                  <h3 className="hw-repo-n"><a className="hw-a hw-a-plain" href={r.href} rel="noopener">{r.name}</a></h3>
                  {r.description && <p>{r.description}</p>}
                  <p className="hw-stack">{[r.language, r.pushedAt ? 'pushed ' + ago(r.pushedAt) : null].filter(Boolean).join(', ')}</p>
                </div>
                <Rule seed={seedOf('repo' + r.name)} />
              </li>
            ))}
          </ol>
          <p className="hw-more"><a className="hw-a" href={GITHUB.href} rel="noopener">All of it at {host(GITHUB.href)}</a></p>
        </Problem>

        <Problem n={8} title="Tabulate the record." className="hw-record">
          <div className="hw-cols hw-cols-rec">
            <ol className="hw-honors hw-panel">
              {HONORS.map((h) => (
                <li key={h.what}>
                  <span className="hw-hon-t">{h.what.startsWith('Champion') && <Tick seed={seedOf('t' + h.what)} size={26} />}</span>
                  <span className="hw-hon-w">{h.what}</span>
                  <span className="hw-hon-d">{h.detail}</span>
                  <Rule seed={seedOf(h.what)} />
                </li>
              ))}
            </ol>
            <ul className="hw-awards">
              {AWARDS.map((a, i) => (
                <li key={a.site}>
                  <a href={a.href} rel="noopener" className="hw-award">
                    <span className="hw-fig-img">
                      <img src={BASE + a.img} alt={`Certificate for ${a.site}`} loading="lazy" width={800} height={1130} />
                      <Over seed={'aw' + i} draw={(W, H) => flat(g.rectangle(-5, -5, W + 10, H + 10, pen(seedOf('aw' + i), { stroke: INK, strokeWidth: 1.4, roughness: 0.7 })))} />
                    </span>
                    <span className="hw-award-c hw-panel"><span className="hw-fig-n">{a.site}</span><span>{a.note}</span></span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Problem>

        <Problem n={9} title="Show where he is now." className="hw-now">
          <div className="hw-now-g">
            <div className="hw-panel">
              <h3 className="hw-h3">{NOW.reading.title}</h3>
              <p>{NOW.reading.body}</p>
              <ul className="hw-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div className="hw-panel">
              <h3 className="hw-h3">{NOW.club.title}</h3>
              <p>{NOW.club.body}</p>
            </div>
            <div className="hw-panel">
              <h3 className="hw-h3">Status</h3>
              <p>{NOW.status}</p>
            </div>
          </div>
        </Problem>

        <Problem n={10} title="Sort into two columns." className="hw-off">
          <div className="hw-t">
            <Over seed="tchart" draw={(W, H) => flat(
              g.line(0, 58, W, 58, pen(seedOf('t1'), { stroke: INK, strokeWidth: 1.6 })),
              g.line(W / 2, 12, W / 2, H - 6, pen(seedOf('t2'), { stroke: INK, strokeWidth: 1.6 })),
            )} />
            <div className="hw-t-c">
              <h3 className="hw-h3">Likes</h3>
              <ul>{LIKES.map((l) => <li key={l}>{l}</li>)}</ul>
            </div>
            <div className="hw-t-c">
              <h3 className="hw-h3">Dislikes</h3>
              <ul>{DISLIKES.map((l) => <li key={l}>{l}</li>)}</ul>
            </div>
          </div>
          <div className="hw-cols hw-extra">
            <div className="hw-panel">
              <h3 className="hw-h3">Favourites</h3>
              <ul className="hw-list">{FAVOURITES.map((l) => <li key={l}>{l}</li>)}</ul>
            </div>
            <div className="hw-panel">
              <h3 className="hw-h3">Courses</h3>
              <ul className="hw-list">{COURSES.map((c) => <li key={c.title}><strong>{c.provider}, {c.title}.</strong> {c.note}</li>)}</ul>
            </div>
          </div>
        </Problem>

        <section id="answer" className="hw-final" aria-labelledby="answer-h">
          <div className="hw-num hw-num-tick"><Tick seed={98} size={64} /></div>
          <div className="hw-work">
            <div className="hw-box">
              <Over className="hw-box-pen" seed="answerbox" draw={(W, H) => flat(
                g.rectangle(4, 4, W - 8, H - 8, pen(seedOf('box1'), { stroke: RED, strokeWidth: 2.2, roughness: 0.8, disableMultiStroke: false })),
              )} />
              <h2 id="answer-h" className="hw-h2 hw-answer-h">Answer</h2>
              <p className="hw-answer-line">Write to {PERSON.first}.</p>
              <ul className="hw-contact">
                {LINKS.map((l) => (
                  <li key={l.label}>
                    <span className="hw-c-l">{l.label}</span>
                    {l.href ? <a className="hw-a" href={l.href} {...ext(l.href)}>{l.value}</a> : <span className="hw-c-v">{l.value}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
      <footer className="hw-foot">
        <p>Draft 98 of the portfolio. Not the live site.</p>
        <p>Every chart is drawn with roughjs (MIT) from his own data. Set in Schibsted Grotesk.</p>
      </footer>
    </div>
  );
}
