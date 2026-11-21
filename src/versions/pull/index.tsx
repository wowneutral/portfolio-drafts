// Draft 48, The pull. His name sits in a loose field of his own likes and dislikes (matter-js, after Fancy's cursor attractor):
// the likes crowd toward the pointer, the dislikes slide away. That is the only type that moves. The rest is calm paper.
import { useRef, useState, type PointerEvent as RPE } from 'react';
import '@fontsource-variable/syne';
import '@fontsource-variable/hanken-grotesk';
import './pull.css';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { scrollToId } from '@/lib/scroll';
import { still, coarse } from '@/lib/utils';
import Field, { type FieldApi } from './Field';

const src = (p: string) => import.meta.env.BASE_URL + p;
const paper = RESEARCH[0];
const wess = RESEARCH[1];
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const NAV = [['debate', 'Debate'], ['research', 'Research'], ['work', 'Work'], ['today', 'Today'], ['github', 'GitHub'], ['contact', 'Contact']] as const;

/** A screenshot that leans a few pixels toward the pointer: the pull, in miniature. */
function Lean({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: RPE<HTMLDivElement>) => {
    if (still || e.pointerType !== 'mouse') return;
    const r = ref.current!.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    ref.current!.style.setProperty('--lx', `${(x * 18).toFixed(1)}px`);
    ref.current!.style.setProperty('--ly', `${(y * 14).toFixed(1)}px`);
  };
  const leave = () => { ref.current!.style.setProperty('--lx', '0px'); ref.current!.style.setProperty('--ly', '0px'); };
  return <div className="p-lean" ref={ref} onPointerMove={move} onPointerLeave={leave}>{children}</div>;
}

function Today() {
  const { notes, loaded } = useNotes();
  const [pick, setPick] = useState(0);
  const note = notes[pick];
  return (
    <section className="p-sec p-today" id="today" aria-labelledby="today-h">
      <h2 className="p-h2" id="today-h">Today</h2>
      <div className="p-body">
        {!loaded ? (
          <p className="p-wait" role="status">Fetching the latest note</p>
        ) : !note ? (
          <p className="p-big">No note yet. Check back tomorrow.</p>
        ) : (
          <div className="p-today-grid">
            <article className="p-note" aria-live="polite">
              <p className="p-note-date"><time dateTime={note.date}>{formatDate(note.date)}</time>{pick === 0 && <span className="p-latest">Latest</span>}</p>
              {note.body.map((p, k) => <p key={k} className="p-note-p">{p}</p>)}
            </article>
            {notes.length > 1 && (
              <nav className="p-earlier" aria-label="Earlier notes">
                <h3 className="p-h3">Every note</h3>
                <ol>
                  {notes.map((n, k) => (
                    <li key={n.date}>
                      <button type="button" className="p-ebtn" aria-current={k === pick ? 'true' : undefined} onClick={() => setPick(k)}>
                        <time dateTime={n.date}>{formatDate(n.date, { day: 'numeric', month: 'short' })}</time>
                        <span>{n.body[0]}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function GitHubBlock() {
  const { repos, activity, live } = useGitHub();
  return (
    <section className="p-sec p-gh" id="github" aria-labelledby="gh-h">
      <h2 className="p-h2" id="gh-h">Live from GitHub</h2>
      <div className="p-body">
        <p className="p-ghlink"><a href={GITHUB.href}>github.com/<wbr />{GITHUB.user}</a></p>
        {activity.length > 0 && (
          <div className="p-commits">
            <h3 className="p-h3">Latest commits</h3>
            <ol>
              {activity.slice(0, 6).map((a) => (
                <li key={a.href}>
                  <a href={a.href} className="p-commit">
                    <span className="p-cmsg">{a.message}</span>
                    <span className="p-crepo">{a.repo}</span>
                    <time className="p-cago" dateTime={a.at}>{ago(a.at)}</time>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        )}
        <div className="p-repos">
          <h3 className="p-h3">{live ? 'Recently pushed' : 'Repositories'}</h3>
          <ul>
            {repos.slice(0, 6).map((r) => (
              <li key={r.name}>
                <a href={r.href} className="p-repo">
                  <span className="p-rname">{r.name}</span>
                  <span className="p-rdesc">{r.description ?? 'No description yet.'}</span>
                  <span className="p-rlang">{[r.language, r.pushedAt ? `pushed ${ago(r.pushedAt)}` : null].filter(Boolean).join(', ')}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default function Pull() {
  useVersion('pull');
  const field = useRef<FieldApi | null>(null);
  const back = () => { scrollToId('top'); window.setTimeout(() => field.current?.flick(), still ? 0 : 900); };

  return (
    <div className="v-pull">
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="p-top" id="top">
        <p className="p-home">{PERSON.home}</p>
        <nav aria-label="Sections">
          <ul>{NAV.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}</ul>
        </nav>
      </header>

      <main id="main">
        <section className="p-hero" aria-label="Introduction">
          <Field api={field} />
          <div className="p-lists">
            <p className="p-hint">{coarse ? 'Touch and hold the field.' : 'Move through the field.'} What he loves comes closer. What he can’t stand keeps its distance.</p>
            <div>
              <h2 className="p-lh">Likes</h2>
              <ul className="p-ll">{LIKES.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
            <div>
              <h2 className="p-lh">Dislikes</h2>
              <ul className="p-ll is-out">{DISLIKES.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
          </div>
        </section>

        <section className="p-sec p-debate" id="debate" aria-labelledby="debate-h">
          <h2 className="p-h2" id="debate-h">Debate</h2>
          <div className="p-wins">
            {DEBATE.wins.map((w) => (
              <div className="p-win" key={w.where}>
                <p className="p-champ">{w.title}</p>
                <p className="p-wmeta"><span>{w.event}</span><span>{w.where}</span><span>{w.when}</span></p>
              </div>
            ))}
          </div>
          <div className="p-body p-team">
            <div className="p-team-head">
              <h3 className="p-teamname">{DEBATE.team.name}</h3>
              <p className="p-role">{DEBATE.team.role}</p>
            </div>
            <div className="p-team-text">
              <p className="p-lead">{DEBATE.team.line}</p>
              <p>{DEBATE.team.record}</p>
              <p><a className="p-a" href={DEBATE.team.href}>{host(DEBATE.team.href)}</a></p>
            </div>
          </div>
          <div className="p-body p-next">
            <h3 className="p-h3">Up next</h3>
            <ul>{DEBATE.next.map((n) => <li key={n.where}><span className="p-nwhere">{n.where}</span><span>{n.event}</span></li>)}</ul>
          </div>
        </section>

        <section className="p-sec p-about" id="about" aria-labelledby="about-h">
          <h2 className="p-h2" id="about-h">About</h2>
          <div className="p-body">
            <p className="p-short">{PERSON.short.join(' ')}</p>
            <div className="p-cols">{PERSON.about.map((p, k) => <p key={k}>{p}</p>)}</div>
            <p className="p-aside">{PERSON.aside}</p>
          </div>
        </section>

        <section className="p-sec p-research" id="research" aria-labelledby="research-h">
          <h2 className="p-h2" id="research-h">Research</h2>
          <div className="p-body">
            <blockquote className="p-epi">
              <p>{paper.epigraph!.text}</p>
              <footer>{paper.epigraph!.source}</footer>
            </blockquote>
            <div className="p-paper">
              <h3 className="p-ptitle">{paper.title}</h3>
              <p className="p-status">{paper.status}, {paper.pages} pages</p>
              <p className="p-abs">{paper.abstract}</p>
              <ul className="p-keys" aria-label="Keywords">{paper.keywords!.map((k) => <li key={k}>{k}</li>)}</ul>
              <ul className="p-plinks">{paper.links.map((l) => <li key={l.label}><a className="p-a" href={l.href}>{l.label}</a></li>)}</ul>
            </div>
            <div className="p-wess">
              <h3 className="p-h3">{wess.title}</h3>
              <p>{wess.abstract}</p>
              <p className="p-status">{wess.status}</p>
            </div>
          </div>
        </section>

        <section className="p-sec p-work" id="work" aria-labelledby="work-h">
          <h2 className="p-h2" id="work-h">Work</h2>
          <ol className="p-sheet">
            {WORK.map((w) => {
              const img = <img src={src(w.img)} alt={`Screenshot of ${w.name}`} loading="lazy" width={1200} height={750} />;
              return (
                <li key={w.slug} className="p-item">
                  <Lean>{w.href ? <a href={w.href} className="p-shot" tabIndex={-1} aria-hidden="true">{img}</a> : <div className="p-shot">{img}</div>}</Lean>
                  <div className="p-cap">
                    <h3 className="p-wname">{w.href ? <a href={w.href}>{w.name}</a> : w.name}</h3>
                    <p className="p-kind">{w.kind}</p>
                    <p className="p-wline">{w.line}</p>
                    <p className="p-stack">{w.stack}{w.href ? <>, <span className="p-host">{host(w.href)}</span></> : null}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <Today />
        <GitHubBlock />

        <section className="p-sec p-now" id="now" aria-labelledby="now-h">
          <h2 className="p-h2" id="now-h">Now</h2>
          <div className="p-body">
            <p className="p-status-now">{NOW.status}</p>
            <div className="p-now-grid">
              <div>
                <h3 className="p-h3b">{NOW.reading.title}</h3>
                <p>{NOW.reading.body}</p>
                <ul className="p-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
              <div>
                <h3 className="p-h3b">{NOW.club.title}</h3>
                <p>{NOW.club.body}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="p-sec p-record" id="record" aria-labelledby="record-h">
          <h2 className="p-h2" id="record-h">Record</h2>
          <div className="p-body">
            <ul className="p-honors">{HONORS.map((h) => <li key={h.what}><span className="p-hw">{h.what}</span><span className="p-hd">{h.detail}</span></li>)}</ul>
            <ul className="p-awards">
              {AWARDS.map((a) => (
                <li key={a.site}>
                  <a href={a.href} className="p-award">
                    <Lean><img src={src(a.img)} alt={`Certificate: ${a.site}, ${a.note}`} loading="lazy" width={720} height={1018} /></Lean>
                    <span className="p-asite">{a.site}</span>
                    <span className="p-anote">{a.note}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="p-sec p-off" id="off" aria-labelledby="off-h">
          <h2 className="p-h2" id="off-h">Off the record</h2>
          <div className="p-body p-off-grid">
            <div>
              <h3 className="p-h3">Favourites</h3>
              <ul className="p-favs">{FAVOURITES.map((f) => <li key={f}>{f}</li>)}</ul>
            </div>
            <div>
              <h3 className="p-h3">Courses</h3>
              <ul className="p-courses">{COURSES.map((c) => <li key={c.title}><span className="p-cprov">{c.provider}</span><span className="p-ctitle">{c.title}</span><span className="p-cnote">{c.note}</span></li>)}</ul>
            </div>
          </div>
        </section>

        <section className="p-sec p-contact" id="contact" aria-labelledby="contact-h">
          <h2 className="p-h2" id="contact-h">Contact</h2>
          <div className="p-body">
            <p className="p-mail"><a href={LINKS[0].href!}>{LINKS[0].value.split('@')[0]}@<wbr />{LINKS[0].value.split('@')[1]}</a></p>
            <ul className="p-links">
              {LINKS.slice(1).map((l) => (
                <li key={l.label}>
                  <span className="p-llab">{l.label}</span>
                  {l.href ? <a className="p-a" href={l.href}>{l.value}</a> : <span>{l.value}</span>}
                </li>
              ))}
            </ul>
            <button type="button" className="p-back" onClick={back}>Back to the pull</button>
          </div>
        </section>
      </main>

      <footer className="p-foot">
        <p>Draft 48 of the portfolio. Not the live site.</p>
        <p>Field physics after Fancy’s cursor attractor (MIT), with matter-js.</p>
      </footer>
    </div>
  );
}
