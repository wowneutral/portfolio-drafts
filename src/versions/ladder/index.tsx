// Draft 3, The ladder. The page is the ladder from his paper: one rung per part of his life,
// climbed by scrolling or by pressing a rung, and thrown away at the top.
import { useEffect, useRef, useState } from 'react';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import './ladder.css';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, STATS, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { useRise } from '@/lib/motion';
import { still } from '@/lib/utils';
import { Ladder } from './Ladder';

const src = (p: string) => import.meta.env.BASE_URL + p;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/\/$/, '');
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { ladders: { who: string; when: string; where: string }[]; epigraph: { text: string; source: string }; keywords: string[] };
const wess = RESEARCH[1];

// Three small ladders, one per thinker. The last one is already falling.
function ThreeLadders() {
  const heights = [118, 150, 182];
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || still) return;
    el.classList.add('is-armed');
    const io = new IntersectionObserver(([e]) => el.classList.toggle('is-in', e.isIntersecting), { rootMargin: '0px 0px -30% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <ol className="lad-three" ref={ref}>
      {paper.ladders.map((l, i) => {
        const h = heights[i];
        const n = 4 + i * 2;
        return (
          <li key={l.who}>
            <svg viewBox="0 0 120 200" aria-hidden="true" className={i === 2 ? 'is-tip' : ''}>
              <g className="lad-tipg">
                <line x1="44" x2="44" y1={196 - h} y2="196" />
                <line x1="76" x2="76" y1={196 - h} y2="196" />
                {Array.from({ length: n }, (_, k) => {
                  const y = 196 - ((k + 0.6) * h) / n;
                  return <line key={k} x1="44" x2="76" y1={y} y2={y} />;
                })}
              </g>
              <line className="lad-ground" x1="8" x2="112" y1="197" y2="197" />
            </svg>
            <p className="lad-who">{l.who}</p>
            <p className="lad-when">{l.when}</p>
            <p className="lad-where2">{l.where}</p>
          </li>
        );
      })}
    </ol>
  );
}

export default function Ladder3() {
  useVersion('ladder');
  const root = useRef<HTMLDivElement>(null);
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const [open, setOpen] = useState<string | null>(null);
  useRise(root);
  const latest = notes[0];
  const earlier = notes.slice(1).reverse(); // oldest lowest, so the newest sits highest
  const stamp = `${notes.length}-${gh.activity.length}-${gh.repos.length}-${open}`;

  return (
    <div className="v-ladder" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <div className="lad-page" id="main">
        <div className="lad-railbox" aria-hidden="true" />
        <Ladder page={root} stamp={stamp} />

        {/* The foot of the ladder */}
        <header className="lad-foot" id="foot">
          <h1 className="lad-name">
            <span className="lad-n1">{PERSON.first}</span>
            <span className="lad-n2">
              <span className="lad-n2w">{PERSON.last}</span>
              <span className="lad-line">
                <span className="lad-linep">{PERSON.line}</span>
                {latest && <a className="lad-today-link" href="#today">Today’s note, {formatDate(latest.date, { day: 'numeric', month: 'long' })}</a>}
              </span>
            </span>
          </h1>
        </header>

        <main>
          {/* Debate: two double rungs */}
          {DEBATE.wins.map((w, i) => (
            <section key={w.where} id={i ? 'wildcat' : 'fbk'} className={`lad-sec lad-win ${i ? 'is-b' : 'is-a'}`}>
              <h2 className="lad-champ" data-rung={w.where} data-kind="double">{w.title}<span className="sr-only-x">, {w.where}</span></h2>
              <p className="lad-place" data-rise>{w.where}</p>
              <p className="lad-event" data-rise>{w.event}, {w.when}</p>
            </section>
          ))}

          <section id="skeptical" className="lad-sec lad-team">
            <h2 className="lad-h" data-rung="Skeptical">{DEBATE.team.name}</h2>
            <p className="lad-role">{DEBATE.team.role}</p>
            <div className="lad-cols">
              <div>
                <p className="lad-lead">{DEBATE.team.line}</p>
                <p className="lad-body">{DEBATE.team.record}</p>
                <p className="lad-links"><a href={DEBATE.team.href}>{host(DEBATE.team.href)}</a></p>
              </div>
              <div className="lad-next">
                <h3 className="lad-h3">Up next</h3>
                <ul>
                  {DEBATE.next.map((n) => <li key={n.where}><span className="lad-nw">{n.where}</span><span className="lad-ne">{n.event}</span></li>)}
                </ul>
              </div>
            </div>
          </section>

          <section id="about" className="lad-sec lad-about">
            <h2 className="lad-h" data-rung="About">{PERSON.short.join(' ')}</h2>
            <div className="lad-about-body">
              <p className="lad-lead" data-rise>{PERSON.about[0]}</p>
              <p className="lad-body" data-rise>{PERSON.about[1]}</p>
              <p className="lad-aside" data-rise>{PERSON.aside}</p>
            </div>
          </section>

          {/* Research: the widest rung */}
          <section id="research" className="lad-sec lad-research">
            <div className="lad-widebar" data-wide="1" data-rung="Research" data-kind="wide" />
            <ThreeLadders />
            <blockquote className="lad-epi">
              <p>{paper.epigraph.text}</p>
              <cite>{paper.epigraph.source}</cite>
            </blockquote>
            <h2 className="lad-title">{paper.title}</h2>
            <p className="lad-role">{paper.status}</p>
            <p className="lad-lead lad-abs">{paper.abstract}</p>
            <ul className="lad-keys" aria-label="Keywords">
              {paper.keywords.map((k) => <li key={k}>{k}</li>)}
            </ul>
            <ul className="lad-plinks">
              {paper.links.map((l) => <li key={l.label}><a href={l.href}>{l.label}</a></li>)}
            </ul>
            <div className="lad-wess">
              <h3 className="lad-h3" data-rung="Wessobrunn" data-kind="small">{wess.title}</h3>
              <p className="lad-role">{wess.status}</p>
              <p className="lad-body">{wess.abstract}</p>
            </div>
          </section>

          {/* Work: prints hung from their rungs */}
          <section id="work" className="lad-sec lad-work">
            <h2 className="lad-h" data-rung="Work">Work</h2>
            {WORK.map((w, i) => (
              <article key={w.slug} id={`w-${w.slug}`} className={`lad-print ${i % 2 ? 'is-r' : 'is-l'}`} data-hang="1">
                <span className="lad-anchor" data-rung={w.name} data-kind="small" data-go={`w-${w.slug}`} />
                <figure>
                  {w.href ? (
                    <a href={w.href} className="lad-img" tabIndex={-1} aria-hidden="true"><img src={src(w.img)} alt="" loading="lazy" width={1200} height={680} /></a>
                  ) : (
                    <span className="lad-img"><img src={src(w.img)} alt="" loading="lazy" width={1200} height={680} /></span>
                  )}
                </figure>
                <div className="lad-ptext">
                  <p className="lad-kind">{w.kind}</p>
                  <h3 className="lad-pname">{w.name}</h3>
                  <p className="lad-body">{w.line}</p>
                  <p className="lad-stack">{w.stack}</p>
                  {w.href && <p className="lad-links"><a href={w.href}>{host(w.href)}</a></p>}
                </div>
              </article>
            ))}
          </section>

          {/* Live from GitHub: notches cut into the rails */}
          <section id="github" className="lad-sec lad-gh">
            <h2 className="lad-h" data-rung="GitHub">Live from GitHub</h2>
            <p className="lad-role">
              {gh.live ? (gh.commitsThisMonth != null ? `${gh.commitsThisMonth} commits this month, fetched just now from` : 'Fetched just now from') : 'Repositories, from'}
              {' '}<a href={GITHUB.href}>{host(GITHUB.href)}</a>
            </p>
            {gh.activity.length > 0 && (
              <ol className="lad-commits">
                {gh.activity.map((a) => (
                  <li key={a.href} data-notch="1">
                    <a href={a.href} className="lad-cmsg">{a.message}</a>
                    <span className="lad-cmeta">{a.repo}, {ago(a.at)}</span>
                  </li>
                ))}
              </ol>
            )}
            <div id="repos" className="lad-repos">
              <h3 className="lad-h3" data-rung="Repositories" data-kind="small">Repositories</h3>
              <ul>
                {gh.repos.slice(0, 8).map((r) => (
                  <li key={r.name}>
                    <a href={r.href} className="lad-rname">{r.name}</a>
                    <span className="lad-rdesc">{r.description || 'No description yet.'}</span>
                    <span className="lad-rlang">{[r.language, r.pushedAt ? ago(r.pushedAt) : null].filter(Boolean).join(', ')}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section id="record" className="lad-sec lad-record">
            <h2 className="lad-h" data-rung="Record">Record</h2>
            <ol className="lad-honors">
              {HONORS.map((h) => <li key={h.what} data-rise><span className="lad-hw">{h.what}</span><span className="lad-hd">{h.detail}</span></li>)}
            </ol>
            <ul className="lad-stats">
              {STATS.map((s) => <li key={s.label}><span className="lad-sn">{s.to}{s.suffix}</span><span className="lad-sl">{s.label}</span></li>)}
            </ul>
            <div className="lad-awards">
              {AWARDS.map((a) => (
                <a key={a.href} href={a.href} className="lad-award">
                  <img src={src(a.img)} alt={`Certificate: ${a.site}`} loading="lazy" width={720} height={1018} />
                  <span className="lad-aw1">{a.site}</span>
                  <span className="lad-aw2">{a.note}</span>
                </a>
              ))}
            </div>
          </section>

          <section id="now" className="lad-sec lad-now">
            <h2 className="lad-h" data-rung="Now">Now</h2>
            <p className="lad-status">{NOW.status}</p>
            <div className="lad-cols">
              <div>
                <h3 className="lad-h3">{NOW.reading.title}</h3>
                <p className="lad-body">{NOW.reading.body}</p>
                <ul className="lad-shelves">
                  {NOW.reading.shelves.map((s) => <li key={s}><span>{s}</span></li>)}
                </ul>
              </div>
              <div>
                <h3 className="lad-h3">{NOW.club.title}</h3>
                <p className="lad-body">{NOW.club.body}</p>
              </div>
            </div>
          </section>

          <section id="off" className="lad-sec lad-off">
            <h2 className="lad-h" data-rung="Off the record">Off the record</h2>
            <div className="lad-four">
              <div><h3 className="lad-h3">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="lad-h3">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="lad-h3">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="lad-h3">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider} {c.title}</strong> {c.note}</li>)}</ul></div>
            </div>
          </section>

          {/* Today: the top of the ladder, one rung per note */}
          <section id="notes" className="lad-sec lad-notes">
            {earlier.length > 0 && (
              <div className="lad-earlier">
                <p className="lad-elabel">Earlier notes</p>
                <ol>
                  {earlier.map((n) => {
                    const on = open === n.date;
                    return (
                      <li key={n.date} id={`n-${n.date}`}>
                        <button type="button" className="lad-nbtn" aria-expanded={on} onClick={() => setOpen(on ? null : n.date)} data-rung={formatDate(n.date, { day: 'numeric', month: 'short' })} data-kind="note" data-go={`n-${n.date}`}>
                          <span className="lad-ndate">{formatDate(n.date)}</span>
                          <span className="lad-nfirst">{n.body[0]}</span>
                        </button>
                        {on && <div className="lad-nbody">{n.body.map((p, k) => <p key={k}>{p}</p>)}</div>}
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
            <div id="today" className="lad-today">
              <h2 className="lad-h" data-rung="Today" data-go="today">Today</h2>
              {latest ? (
                <article className="lad-latest">
                  <p className="lad-ldate"><time dateTime={latest.date}>{formatDate(latest.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></p>
                  {latest.body.map((p, k) => <p key={k} className="lad-lbody">{p}</p>)}
                </article>
              ) : (
                <article className="lad-latest">
                  <p className="lad-ldate">{loaded ? 'The latest' : 'Reading the latest note'}</p>
                  <p className="lad-lbody">{NOW.status}</p>
                </article>
              )}
            </div>
          </section>

          <section id="contact" className="lad-sec lad-contact">
            <h2 className="lad-h" data-rung="Contact">Contact</h2>
            <ul className="lad-clinks">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <span className="lad-cl">{l.label}</span>
                  {l.href ? <a href={l.href} className="lad-cv">{l.value}</a> : <span className="lad-cv">{l.value}</span>}
                </li>
              ))}
            </ul>
          </section>

          <section id="top" className="lad-sec lad-top">
            <p className="lad-throwline" data-rung="Throw it away" data-kind="top" data-go="top">Now throw the ladder away.</p>
          </section>
        </main>

        <footer className="lad-colophon">
          <p className="lad-cname">{PERSON.name}</p>
          <p>Draft 3 of the portfolio. Not the live site.</p>
          <p className="lad-credit">Set in Archivo and Newsreader. The ladder is from his paper, {paper.short}.</p>
        </footer>
      </div>
    </div>
  );
}
