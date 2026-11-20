import { useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { View } from '@react-three/drei';
import '@fontsource/anton/400.css';
import '@fontsource-variable/newsreader/opsz.css';
import './cave.css';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { still } from '@/lib/utils';
import {
  PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, STATS, NOW, COURSES, LIKES, DISLIKES, FAVOURITES, LINKS, GITHUB,
} from '@/content';
import { Wall } from './Wall';

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
const base = import.meta.env.BASE_URL;

function Work({ gl }: { gl: boolean }) {
  const [i, setI] = useState(0);
  const w = WORK[i];
  return (
    <section className="cv-sec" id="work" aria-labelledby="work-h">
      <Wall word={w.name.toUpperCase()} seed={505} label="Work" gl={gl} recast />
      <div className="cv-field">
        <h2 id="work-h" className="cv-h">Work</h2>
        <ol className="cv-steps" aria-label="Projects">
          {WORK.map((x, j) => (
            <li key={x.slug}>
              <button type="button" aria-pressed={j === i} onClick={() => setI(j)}>{x.name}</button>
            </li>
          ))}
        </ol>
        <article className="cv-proj" aria-live="polite">
          <figure className="cv-shot">
            <img src={base + w.img} alt={`${w.name}, a screenshot`} width={1200} height={750} />
          </figure>
          <div className="cv-projtext">
            <p className="cv-kind">{w.kind}</p>
            <h3 className="cv-projname">{w.name}</h3>
            <p className="cv-body">{w.line}</p>
            <p className="cv-meta">{w.stack}</p>
            {w.href ? <a className="cv-link" href={w.href}>Visit {w.name}</a> : <p className="cv-meta">Runs locally, no link.</p>}
            <div className="cv-stepnav">
              <button type="button" onClick={() => setI((i + WORK.length - 1) % WORK.length)}>Previous</button>
              <button type="button" onClick={() => setI((i + 1) % WORK.length)}>Next</button>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function GitHub({ gl }: { gl: boolean }) {
  const { repos, activity, live } = useGitHub();
  const word = (activity[0]?.repo || GITHUB.user).toUpperCase();
  return (
    <section className="cv-sec" id="github" aria-labelledby="gh-h">
      <Wall word={word} seed={606} label="Live from GitHub" gl={gl} recast />
      <div className="cv-field cv-two">
        <div>
          <h2 id="gh-h" className="cv-h">Live from GitHub</h2>
          <p className="cv-body cv-lede">The shadow above is cut from the name of the {activity.length ? 'repository he pushed to last' : 'account he builds in'}.</p>
          <a className="cv-link" href={GITHUB.href}>github.com/{GITHUB.user}</a>
        </div>
        <div>
          {activity.length > 0 && (
            <>
              <h3 className="cv-h3">Latest commits</h3>
              <ul className="cv-ledger">
                {activity.slice(0, 6).map((a, j) => (
                  <li key={a.href + j}>
                    <a href={a.href}><span className="cv-msg">{a.message}</span><span className="cv-meta">{a.repo}, {ago(a.at)}</span></a>
                  </li>
                ))}
              </ul>
            </>
          )}
          <h3 className="cv-h3">{live ? 'Repositories, latest push first' : 'Repositories'}</h3>
          <ul className="cv-ledger">
            {repos.slice(0, 6).map((r) => (
              <li key={r.name}>
                <a href={r.href}>
                  <span className="cv-msg">{r.name}</span>
                  <span className="cv-meta">{[r.description?.replace(/\.$/, ''), r.language].filter(Boolean).join('. ')}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Today({ gl }: { gl: boolean }) {
  const { notes, loaded } = useNotes();
  const now = new Date();
  const day = String(now.getDate());
  const seed = now.getFullYear() * 400 + now.getMonth() * 32 + now.getDate();
  const [latest, ...rest] = notes;
  return (
    <section className="cv-sec" id="today" aria-labelledby="today-h">
      <Wall word={day} seed={seed} label="Today" gl={gl} />
      <div className="cv-field cv-today">
        <h2 id="today-h" className="cv-h">Today</h2>
        {latest ? (
          <article className="cv-note">
            <p className="cv-date"><time dateTime={latest.date}>{formatDate(latest.date)}</time></p>
            {latest.body.map((p, j) => <p key={j} className="cv-notebody">{p}</p>)}
          </article>
        ) : (
          <article className="cv-note">
            <p className="cv-date">{formatDate(now.toISOString().slice(0, 10))}</p>
            <p className="cv-notebody">{loaded ? 'No note yet today. The wall above changes every morning anyway.' : 'Fetching the latest note.'}</p>
          </article>
        )}
        {rest.length > 0 && (
          <div className="cv-earlier">
            <h3 className="cv-h3">Earlier notes</h3>
            {rest.map((n) => (
              <details key={n.date}>
                <summary><time dateTime={n.date}>{formatDate(n.date)}</time></summary>
                {n.body.map((p, j) => <p key={j} className="cv-body">{p}</p>)}
              </details>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function Cave() {
  useVersion('cave');
  const root = useRef<HTMLDivElement>(null);
  const [gl] = useState(() => !still && hasWebGL() && !/flat/.test(location.search));
  const paper = RESEARCH[0], wess = RESEARCH[1];
  return (
    <div className="v-cave" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <main id="main" className="cv-main">
        {gl && (
          <Canvas
            className="cv-gl"
            shadows={{ type: THREE.PCFShadowMap }}
            dpr={[1, 1.6]}
            gl={{ alpha: true, antialias: true }}
            style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: -1 }}
          >
            <View.Port />
          </Canvas>
        )}
        <section className="cv-sec cv-open" aria-labelledby="name-h">
          <Wall word={PERSON.name.toUpperCase()} seed={101} label="Name" gl={gl} auto />
          <div className="cv-field cv-intro">
            <h1 id="name-h" className="cv-name">{PERSON.name}</h1>
            <p className="cv-line">{PERSON.line}</p>
            <p className="cv-hint">{gl ? 'Drag the light. The name only holds from one place.' : PERSON.short.join(' ')}</p>
          </div>
        </section>

        <section className="cv-sec cv-plain" id="about" aria-labelledby="about-h">
          <div className="cv-field cv-about">
            <h2 id="about-h" className="cv-h">About</h2>
            <div className="cv-cols">
              {PERSON.about.map((p, j) => <p key={j} className="cv-body">{p}</p>)}
            </div>
            <p className="cv-aside">{PERSON.aside}</p>
          </div>
        </section>

        <section className="cv-sec" id="debate" aria-labelledby="debate-h">
          <h2 id="debate-h" className="cv-h cv-pad">Debate</h2>
          <div className="cv-pair">
            {DEBATE.wins.map((w, j) => (
              <div key={w.where} className="cv-win">
                <Wall word={w.title.toUpperCase()} seed={202 + j * 17} label={`${w.title}, ${w.where}`} gl={gl} half />
                <div className="cv-wintext">
                  <p className="cv-wintitle">{w.title}</p>
                  <p className="cv-winevent">{w.event}</p>
                  <p className="cv-meta cv-winwhere">{w.where}, {w.when}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="cv-field cv-two cv-team">
            <div>
              <h3 className="cv-teamname">{DEBATE.team.name}</h3>
              <p className="cv-kind">{DEBATE.team.role}</p>
              <p className="cv-body">{DEBATE.team.line}</p>
              <p className="cv-body">{DEBATE.team.record}</p>
              <a className="cv-link" href={DEBATE.team.href}>skeptical.pages.dev</a>
            </div>
            <div>
              <h3 className="cv-h3">Up next</h3>
              <ul className="cv-ledger cv-static">
                {DEBATE.next.map((n) => (
                  <li key={n.where}><span className="cv-msg">{n.where}</span><span className="cv-meta">{n.event}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="cv-sec" id="research" aria-labelledby="research-h">
          <Wall word="LADDER" seed={303} label="Research" gl={gl} />
          <div className="cv-field cv-research">
            <h2 id="research-h" className="cv-h">Research</h2>
            <div className="cv-paper">
              <h3 className="cv-title">{paper.title}</h3>
              <p className="cv-meta">{paper.status}</p>
              <p className="cv-abstract">{paper.abstract}</p>
              <ul className="cv-keys" aria-label="Keywords">
                {(paper.keywords ?? []).map((k) => <li key={k}>{k}</li>)}
              </ul>
              <ul className="cv-links">
                {paper.links.map((l) => <li key={l.href}><a className="cv-link" href={l.href}>{l.label}</a></li>)}
              </ul>
            </div>
            <div className="cv-wess">
              <h3 className="cv-h3">{wess.title}</h3>
              <p className="cv-meta">{wess.status}</p>
              <p className="cv-body">{wess.abstract}</p>
            </div>
          </div>
        </section>

        <Work gl={gl} />
        <GitHub gl={gl} />
        <Today gl={gl} />

        <section className="cv-sec cv-plain" id="now" aria-labelledby="now-h">
          <div className="cv-field">
            <h2 id="now-h" className="cv-h">Now</h2>
            <p className="cv-status">{NOW.status}</p>
            <div className="cv-three">
              <div>
                <h3 className="cv-h3">{NOW.reading.title}</h3>
                <p className="cv-body">{NOW.reading.body}</p>
                <ul className="cv-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
              <div>
                <h3 className="cv-h3">{NOW.club.title}</h3>
                <p className="cv-body">{NOW.club.body}</p>
              </div>
              <div>
                <h3 className="cv-h3">In numbers</h3>
                <ul className="cv-stats">
                  {STATS.map((s) => <li key={s.label}><span className="cv-num">{s.to}{s.suffix}</span><span className="cv-meta">{s.label}</span></li>)}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="cv-sec cv-plain" id="record" aria-labelledby="record-h">
          <div className="cv-field cv-two">
            <div>
              <h2 id="record-h" className="cv-h">Record</h2>
              <ul className="cv-ledger cv-static">
                {HONORS.map((h) => <li key={h.what}><span className="cv-msg">{h.what}</span><span className="cv-meta">{h.detail}</span></li>)}
              </ul>
            </div>
            <div className="cv-certs">
              {AWARDS.map((a) => (
                <a key={a.href} className="cv-cert" href={a.href}>
                  <img src={base + a.img} alt={`Certificate: ${a.site}, ${a.note}`} width={600} height={850} loading="lazy" />
                  <span className="cv-msg">{a.site}</span>
                  <span className="cv-meta">{a.note}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="cv-sec cv-plain" id="off" aria-labelledby="off-h">
          <div className="cv-field">
            <h2 id="off-h" className="cv-h">Off the record</h2>
            <div className="cv-four">
              <div><h3 className="cv-h3">Likes</h3><ul className="cv-list">{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="cv-h3">Dislikes</h3><ul className="cv-list">{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="cv-h3">Favourites</h3><ul className="cv-list">{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="cv-h3">Courses</h3><ul className="cv-list">{COURSES.map((x) => <li key={x.title}><strong>{x.provider}, {x.title}.</strong> {x.note}</li>)}</ul></div>
            </div>
          </div>
        </section>

        <section className="cv-sec" id="contact" aria-labelledby="contact-h">
          <Wall word="?" seed={909} label="The last wall" gl={gl} />
          <div className="cv-field cv-contact">
            <h2 id="contact-h" className="cv-h">Contact</h2>
            <ul className="cv-contacts">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <span className="cv-meta">{l.label}</span>
                  {l.href ? <a href={l.href}>{l.value}</a> : <span className="cv-plainval">{l.value}</span>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <footer className="cv-foot">
        <p>Draft 30 of the portfolio. Not the live site.</p>
        <p>Set in Anton and Newsreader. Every shadow is cast live by one light.</p>
      </footer>
    </div>
  );
}
