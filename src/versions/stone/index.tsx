// Draft 20, The stone. A heavy terracotta stone at the foot of a white slope. Push it up and it rolls back
// down. Scroll and it drops, landing by landing, one section per landing; on the debate landing the slope
// has two notches, the two championships, the only places where it stays.
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/instrument-sans';
import './stone.css';
import { AWARDS, CHAPTERS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { still } from '@/lib/utils';
import { S, makeLevels, type LevelKind } from './plan';

const Scene = lazy(() => import('./Scene'));
const src = (p: string) => import.meta.env.BASE_URL + p;
const paper = RESEARCH[0];
const wess = RESEARCH[1];
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');

const KINDS: LevelKind[] = ['hero', 'today', 'plain', 'plain', 'debate', 'plain', ...WORK.map(() => 'plain' as LevelKind), 'github', 'plain', 'plain', 'end'];
const DEBATE_AT = KINDS.indexOf('debate');

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** The page without WebGL or with reduced motion: the stone at the foot of the slope, still. */
function Still() {
  return (
    <svg className="st-still" viewBox="0 0 600 560" role="img" aria-label="A terracotta stone resting at the foot of a white slope">
      <path d="M40 470 L560 470 L560 300 Z" fill="#000" opacity="0.06" transform="translate(16 18)" />
      <path d="M150 420 L560 300 L560 326 L150 446 Z" fill="#d9d6cf" />
      <path d="M150 420 L560 300 L572 304 L162 424 Z" fill="#fbfaf7" />
      <path d="M38 420 L150 420 L150 446 L38 446 Z" fill="#d9d6cf" />
      <path d="M38 416 L162 416 L150 420 L38 420 Z" fill="#fbfaf7" />
      <rect x="22" y="392" width="16" height="54" fill="#d4d1ca" />
      <ellipse cx="78" cy="419" rx="34" ry="5" fill="#1f160f" opacity="0.18" />
      <circle cx="78" cy="381" r="38" fill="#b54a2a" />
      <path d="M58 360 a28 28 0 0 1 22 -10" stroke="#e7a98f" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

export default function Stone() {
  useVersion('stone');
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const [gl] = useState(() => !still && hasWebGL() && !/flat/.test(location.search));
  const [held, setHeld] = useState(-1);
  const levels = useMemo(() => makeLevels(KINDS), []);
  const latest = notes[0];
  const isToday = !!latest && latest.date === localToday();
  const commits = gh.activity;
  const pebbles = useMemo(
    () => (commits.length ? commits.map((c) => 0.13 + (c.message.length % 7) * 0.012) : gh.repos.map((r) => 0.15 + (r.name.length % 5) * 0.015)).slice(0, 14),
    [commits, gh.repos],
  );

  useEffect(() => { S.todayUp = isToday; }, [isToday]);
  // For the test scripts only.
  useEffect(() => { if (import.meta.env.DEV) (window as unknown as { __stone: typeof S }).__stone = S; }, []);
  useEffect(() => { S.onHeld = setHeld; S.held = -1; S.touched = false; return () => { S.onHeld = () => {}; }; }, []);

  // Hold Space on the first screen (or on the push button) to push.
  useEffect(() => {
    const ok = (e: KeyboardEvent) => e.code === 'Space' && (document.activeElement === document.body || (document.activeElement as HTMLElement)?.classList.contains('st-push')) && (window.scrollY < window.innerHeight * 0.6 || (document.activeElement as HTMLElement)?.classList.contains('st-push'));
    const down = (e: KeyboardEvent) => { if (!gl || !ok(e)) return; e.preventDefault(); S.push = true; S.touched = true; };
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') S.push = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); S.push = false; };
  }, [gl]);

  const setIn = (i: number) => {
    S.touched = true;
    if (S.place) S.place(DEBATE_AT, i); else setHeld(i);
  };
  const hold = (on: boolean) => { S.push = on; if (on) S.touched = true; };

  return (
    <div className={`v-stone${gl ? '' : ' is-still'}`}>
      <a className="skip-x" href="#main">Skip to content</a>
      <div className="st-wrap">
        <div className="st-scene">
          {gl ? (
            <>
              <Suspense fallback={<Still />}><Scene levels={levels} pebbles={pebbles} /></Suspense>
              <button
                className="st-push" type="button" aria-label="Hold to push"
                onPointerDown={() => hold(true)} onPointerUp={() => hold(false)} onPointerLeave={() => hold(false)} onPointerCancel={() => hold(false)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); hold(true); } }} onKeyUp={(e) => { if (e.key === 'Enter') hold(false); }}
                onBlur={() => hold(false)} onContextMenu={(e) => e.preventDefault()}
              />
            </>
          ) : <Still />}
        </div>

        <main id="main" className="st-copy">
          <section className="st-sec st-hero" data-level>
            <h1 className="st-name"><span>{PERSON.first}</span> <span>{PERSON.last}</span></h1>
            <p className="st-line">{PERSON.line}</p>
            <p className="st-short">{PERSON.short.map((w) => <span key={w}>{w}</span>)}</p>
            {gl && <p className="st-hint"><span className="for-fine">Drag the stone uphill, or hold Space.</span><span className="for-touch">Drag the stone uphill with your thumb.</span></p>}
          </section>

          <section className="st-sec st-today" data-level id="today" aria-labelledby="h-today">
            <h2 id="h-today" className="st-h">Today</h2>
            {!loaded ? (
              <p className="st-wait">The note is on its way down.</p>
            ) : latest ? (
              <>
                <article className="st-note">
                  <p className="st-note-date"><time dateTime={latest.date}>{formatDate(latest.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time>{isToday && <span className="st-fresh">Written today</span>}</p>
                  {latest.body.map((p, i) => <p key={i} className="st-note-body">{p}</p>)}
                </article>
                {notes.length > 1 && (
                  <div className="st-earlier">
                    <h3 className="st-k">Earlier</h3>
                    <ul>
                      {notes.slice(1).map((n) => (
                        <li key={n.date}>
                          <details>
                            <summary><time dateTime={n.date}>{formatDate(n.date)}</time></summary>
                            {n.body.map((p, i) => <p key={i}>{p}</p>)}
                          </details>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="st-wait">No note today yet. The stone waits at the foot.</p>
            )}
          </section>

          <section className="st-sec" data-level id="about" aria-labelledby="h-about">
            <h2 id="h-about" className="st-h">About</h2>
            {PERSON.about.map((p, i) => <p key={i} className={i === 0 ? 'st-lede' : 'st-p'}>{p}</p>)}
            <p className="st-aside">{PERSON.aside}</p>
          </section>

          <section className="st-sec" data-level id="now" aria-labelledby="h-now">
            <h2 id="h-now" className="st-h">Now</h2>
            <div className="st-now">
              <h3 className="st-t">{NOW.reading.title}</h3>
              <p className="st-p">{NOW.reading.body}</p>
              <ul className="st-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div className="st-now">
              <h3 className="st-t">{NOW.club.title}</h3>
              <p className="st-p">{NOW.club.body}</p>
            </div>
            <p className="st-status">{NOW.status}</p>
          </section>

          <section className="st-sec st-debate" data-level id="debate" aria-labelledby="h-debate">
            <h2 id="h-debate" className="st-h">{CHAPTERS[1].title}</h2>
            <p className="st-hint">Two notches in the slope. Push it into one and it stays.</p>
            <ol className="st-wins">
              {DEBATE.wins.map((w, i) => (
                <li key={w.where}>
                  <button type="button" className="st-win" aria-pressed={held === i} onClick={() => setIn(i)}>
                    <span className="st-mark" aria-hidden="true" />
                    <span className="st-win-where">{w.where}</span>
                    <span className="st-win-ev"><b>{w.title}</b>, {w.event}, {w.when}</span>
                  </button>
                </li>
              ))}
            </ol>
            <div className="st-team">
              <h3 className="st-t st-team-name">{DEBATE.team.name}</h3>
              <p className="st-k">{DEBATE.team.role}</p>
              <p className="st-p">{DEBATE.team.line}</p>
              <p className="st-p st-dim">{DEBATE.team.record}</p>
              <p className="st-links"><a href={DEBATE.team.href}>{host(DEBATE.team.href)}</a><a href={DEBATE.team.github}>The code</a></p>
            </div>
            <div className="st-next">
              <h3 className="st-k">Up next, further up the slope</h3>
              <ul>{DEBATE.next.map((n) => <li key={n.where}><span className="st-next-where">{n.where}</span><span className="st-dim">{n.event}</span></li>)}</ul>
            </div>
          </section>

          <section className="st-sec st-research" data-level id="research" aria-labelledby="h-research">
            <h2 id="h-research" className="st-h">Research</h2>
            <h3 className="st-paper">{paper.title}</h3>
            <p className="st-k">{paper.status}, {paper.pages} pages, DOI {paper.doi}</p>
            <p className="st-lede">{paper.abstract}</p>
            <ul className="st-keys">{(paper.keywords ?? []).map((k) => <li key={k}>{k}</li>)}</ul>
            <p className="st-links">{paper.links.map((l) => <a key={l.label} href={l.href}>{l.label}</a>)}</p>
            <div className="st-wess">
              <h3 className="st-t">{wess.title}</h3>
              <p className="st-k">{wess.status}</p>
              <p className="st-p">{wess.abstract}</p>
            </div>
          </section>

          {WORK.map((w, i) => (
            <section key={w.slug} className="st-sec st-work" data-level id={i === 0 ? 'work' : undefined} aria-labelledby={`h-${w.slug}`}>
              {i === 0 && <h2 className="st-h">Work</h2>}
              <figure className="st-print">
                <img src={src(w.img)} alt={`${w.name}, a screenshot`} width={1200} height={680} loading="lazy" decoding="async" />
              </figure>
              <div className="st-work-text">
                <h3 id={`h-${w.slug}`} className="st-t st-work-name">{w.name}</h3>
                <p className="st-k">{w.kind}</p>
                <p className="st-p">{w.line}</p>
                <p className="st-dim st-stack">{w.stack}</p>
                {w.href ? <p className="st-links"><a href={w.href}>{host(w.href)}</a></p> : <p className="st-dim st-stack">No public link.</p>}
              </div>
            </section>
          ))}

          <section className="st-sec st-gh" data-level id="github" aria-labelledby="h-gh">
            <h2 id="h-gh" className="st-h">Live from GitHub</h2>
            <p className="st-hint">{commits.length ? 'One pebble on the landing for each recent commit.' : 'One pebble on the landing for each repository.'}</p>
            {gh.commitsThisMonth != null && gh.commitsThisMonth > 0 && <p className="st-count"><span>{gh.commitsThisMonth}</span> commits this month</p>}
            {commits.length > 0 && (
              <ol className="st-commits">
                {commits.slice(0, 8).map((c, i) => (
                  <li key={c.href + i}>
                    <a href={c.href}><span className="st-msg">{c.message}</span><span className="st-dim">{c.repo}, {ago(c.at)}</span></a>
                  </li>
                ))}
              </ol>
            )}
            <ul className="st-repos">
              {gh.repos.slice(0, 8).map((r) => (
                <li key={r.name}>
                  <a href={r.href}>
                    <span className="st-repo">{r.name}</span>
                    {r.description && <span className="st-p">{r.description}</span>}
                    <span className="st-dim">{[r.language, r.pushedAt ? `pushed ${ago(r.pushedAt)}` : ''].filter(Boolean).join(', ')}</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="st-links"><a href={GITHUB.href}>{host(GITHUB.href)}</a></p>
          </section>

          <section className="st-sec st-record" data-level id="record" aria-labelledby="h-record">
            <h2 id="h-record" className="st-h">Record</h2>
            <ul className="st-honors">{HONORS.map((h) => <li key={h.what}><span>{h.what}</span><span className="st-dim">{h.detail}</span></li>)}</ul>
            <div className="st-awards">
              {AWARDS.map((a) => (
                <a key={a.site} href={a.href} className="st-award">
                  <img src={src(a.img)} alt={`Certificate: ${a.site}`} width={720} height={1018} loading="lazy" decoding="async" />
                  <span>{a.site}</span><span className="st-dim">{a.note}</span>
                </a>
              ))}
            </div>
          </section>

          <section className="st-sec st-off" data-level id="off" aria-labelledby="h-off">
            <h2 id="h-off" className="st-h">Off the record</h2>
            <div className="st-cols">
              <div><h3 className="st-k">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="st-k">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="st-k">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="st-k">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><span>{c.provider}, {c.title}</span><span className="st-dim">{c.note}</span></li>)}</ul></div>
            </div>
          </section>

          <section className="st-sec st-end" data-level id="contact" aria-labelledby="h-contact">
            <h2 id="h-contact" className="st-h st-end-h">The stone is at the bottom. Write to him.</h2>
            <ul className="st-contact">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <span className="st-k">{l.label}</span>
                  {l.href ? <a href={l.href}>{l.value}</a> : <span className="st-val">{l.value}</span>}
                </li>
              ))}
            </ul>
            <footer className="st-foot">
              <p>Draft 20 of the portfolio. Not the live site.</p>
              <p className="st-dim">Set in Fraunces and Instrument Sans. The stone is simulated with Rapier.</p>
            </footer>
          </section>
        </main>
      </div>
    </div>
  );
}
