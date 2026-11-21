// Draft 85, The stretch. He does not like being told to keep it short, so his name is made of rubber.
// The big words are React Bits ElasticMesh (adapted in ElasticMesh.tsx) over real DOM headings; everything else sits still.
import { useRef } from 'react';
import { ChevronDown, ArrowUpRight } from 'lucide-react';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/hanken-grotesk';
import './stretch.css';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import Word from './Word';
import type { ElasticHandle } from './ElasticMesh';

const src = (p: string) => import.meta.env.BASE_URL + p;
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { epigraph: { text: string; source: string }; keywords: string[]; ladders: { who: string; when: string; where: string }[]; pages: number };
const wess = RESEARCH[1];
const SHORT = DISLIKES[3];
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/\/$/, '');
const NAV = [['debate', 'Debate'], ['research', 'Research'], ['work', 'Work'], ['today', 'Today'], ['github', 'GitHub'], ['about', 'About'], ['contact', 'Contact']] as const;

function Today() {
  const { notes, loaded } = useNotes();
  const latest = notes[0];
  const earlier = notes.slice(1);
  return (
    <section className="s-sec s-today" id="today" aria-labelledby="today-h">
      <Word text="Today" id="today-h" max={300} />
      <div className="s-field s-note-field">
        {!loaded ? (
          <p className="s-note-wait" role="status">Opening today’s note</p>
        ) : !latest ? (
          <p className="s-note-body">No note posted yet.</p>
        ) : (
          <article className="s-note">
            <p className="s-note-date"><time dateTime={latest.date}>{formatDate(latest.date)}</time></p>
            {latest.body.map((p, i) => <p key={i} className="s-note-body">{p}</p>)}
          </article>
        )}
        {earlier.length > 0 && (
          <div className="s-earlier">
            <h3 className="s-h3">Earlier notes</h3>
            <ul className="s-earlier-list">
              {earlier.map((n) => (
                <li key={n.date}>
                  <details className="s-det">
                    <summary>
                      <time dateTime={n.date}>{formatDate(n.date)}</time>
                      <ChevronDown aria-hidden="true" className="s-chev" size={22} strokeWidth={2.25} />
                    </summary>
                    <div className="s-det-body">{n.body.map((p, i) => <p key={i}>{p}</p>)}</div>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function GitHub() {
  const { repos, activity, live } = useGitHub();
  const commits = activity.slice(0, 6);
  return (
    <section className="s-sec s-gh" id="github" aria-labelledby="gh-h">
      <div className="s-field s-gh-field">
        <div className="s-gh-head">
          <h2 id="gh-h" className="s-h2">Live from GitHub</h2>
          <a className="s-link" href={GITHUB.href}>github.com/{GITHUB.user}<ArrowUpRight aria-hidden="true" size={20} /></a>
        </div>
        <div className={`s-gh-cols${commits.length ? '' : ' is-solo'}`}>
          {commits.length > 0 && (
            <div>
              <h3 className="s-h3">Latest commits</h3>
              <ol className="s-commits">
                {commits.map((c, i) => (
                  <li key={c.href + i}>
                    <a href={c.href} className="s-commit-msg">{c.message}</a>
                    <span className="s-commit-meta">{c.repo}, {ago(c.at)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div>
            <h3 className="s-h3">{live ? 'Pushed to most recently' : 'Repositories'}</h3>
            <ul className="s-repos">
              {repos.slice(0, 6).map((r) => (
                <li key={r.name}>
                  <a href={r.href} className="s-repo-name">{r.name}</a>
                  {r.description && <span className="s-repo-desc">{r.description}</span>}
                  {r.language && <span className="s-repo-lang">{r.language}</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Stretch() {
  useVersion('stretch');
  // The two championships answer each other: pull one and the other reaches toward it.
  const pair = [useRef<ElasticHandle | null>(null), useRef<ElasticHandle | null>(null)];
  const answer = (i: number) => {
    const other = pair[1 - i].current;
    if (!other) return;
    window.setTimeout(() => other.tug(0.5, i === 0 ? 0.3 : 0.7, 0, i === 0 ? -110 : 110, 1000), 140);
  };
  return (
    <div className="v-stretch">
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="s-top">
        <a href="#main" className="s-mark">Armaan Seth</a>
        <nav aria-label="Sections">
          <ul className="s-nav">
            {NAV.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}
          </ul>
        </nav>
      </header>

      <main id="main">
        <section className="s-hero" aria-labelledby="name-h">
          <Word text={PERSON.name} as="h1" id="name-h" phoneSplit={[1, 1]} tug="load" room={0.7} />
          <div className="s-field s-intro">
            <p className="s-lede">{PERSON.line}</p>
            <p className="s-dislike">One thing he dislikes: {SHORT}. <strong>Pull.</strong></p>
          </div>
        </section>

        <section className="s-sec s-debate" id="debate" aria-labelledby="debate-h">
          <h2 id="debate-h" className="sr-only-x">Debate</h2>
          {DEBATE.wins.map((w, i) => (
            <div className="s-win" key={w.where}>
              <Word text={w.title} as="h3" max={280} room={0.55} handleRef={pair[i]} onGrab={() => answer(i)} />
              <p className="s-field s-win-line">
                <span className="s-win-event">{w.event}</span>
                <span className="s-win-where">{w.where}, {w.when}</span>
              </p>
            </div>
          ))}
          <div className="s-team">
            <article className="s-field s-team-field">
              <p className="s-role">{DEBATE.team.role}</p>
              <h3 className="s-h2">{DEBATE.team.name}</h3>
              <p className="s-body-lg">{DEBATE.team.line}</p>
              <p className="s-body">{DEBATE.team.record}</p>
              <p className="s-links-row">
                <a className="s-link" href={DEBATE.team.href}>{host(DEBATE.team.href)}<ArrowUpRight aria-hidden="true" size={20} /></a>
                <a className="s-link" href={DEBATE.team.github}>The code<ArrowUpRight aria-hidden="true" size={20} /></a>
              </p>
            </article>
            <div className="s-next">
              <h3 className="s-h3">Up next</h3>
              <ul>
                {DEBATE.next.map((n) => (
                  <li key={n.where}><span className="s-next-where">{n.where}</span><span className="s-next-event">{n.event}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="s-sec s-research" id="research" aria-labelledby="paper-h">
          <Word text={paper.short} id="paper-h" split={[2, 2]} phoneSplit={[2, 1, 1]} max={240} />
          <div className="s-field s-paper">
            <p className="s-paper-title">{paper.title}</p>
            <p className="s-paper-status">{paper.status}, {paper.pages} pages</p>
            <blockquote className="s-epi">
              <p>{paper.epigraph.text}</p>
              <footer>{paper.epigraph.source}</footer>
            </blockquote>
            <p className="s-body-lg s-abstract">{paper.abstract}</p>
            <h3 className="s-h3">Keywords</h3>
            <p className="s-keys">{paper.keywords.join(', ')}</p>
            <p className="s-links-row">
              {paper.links.map((l) => <a key={l.label} className="s-link" href={l.href}>{l.label}<ArrowUpRight aria-hidden="true" size={20} /></a>)}
            </p>
          </div>
          <div className="s-ladders">
            <h3 className="s-h3 s-ladders-h">The three ladders</h3>
            <ol>
              {paper.ladders.map((l, i) => (
                <li key={l.who} className="s-field s-rung" style={{ ['--i' as string]: i }}>
                  <span className="s-rung-who">{l.who}</span>
                  <span className="s-rung-when">{l.when}</span>
                  <span className="s-rung-where">{l.where}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="s-field s-wess">
            <h3 className="s-h3">{wess.short}</h3>
            <p className="s-body">{wess.title}. {wess.status}.</p>
            <p className="s-body">{wess.abstract}</p>
          </div>
        </section>

        <section className="s-sec s-work" id="work" aria-labelledby="work-h">
          <h2 id="work-h" className="s-h2 s-work-h">The work</h2>
          <ul className="s-works">
            {WORK.map((w) => (
              <li key={w.slug} className={`s-field s-wk s-wk-${w.slug}`}>
                <div className="s-shot"><img src={src(w.img)} alt={`${w.name}, screenshot`} loading="lazy" width={1200} height={680} /></div>
                <div className="s-wk-text">
                  <h3 className="s-wk-name">{w.name}</h3>
                  <p className="s-wk-kind">{w.kind}</p>
                  <p className="s-body">{w.line}</p>
                  <p className="s-wk-stack">{w.stack}</p>
                  {w.href ? (
                    <a className="s-link" href={w.href}>{host(w.href)}<ArrowUpRight aria-hidden="true" size={20} /></a>
                  ) : (
                    <p className="s-wk-private">No public link</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <Today />
        <GitHub />

        <section className="s-sec s-about" id="about" aria-labelledby="about-h">
          <div className="s-field s-about-main">
            <h2 id="about-h" className="s-h2">About</h2>
            {PERSON.about.map((p, i) => <p key={i} className="s-body-lg">{p}</p>)}
            <p className="s-body s-aside">{PERSON.aside}</p>
          </div>
          <div className="s-field s-now">
            <h3 className="s-h3">Now</h3>
            <p className="s-now-t">{NOW.reading.title}</p>
            <p className="s-body">{NOW.reading.body}</p>
            <ul className="s-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            <p className="s-now-t">{NOW.club.title}</p>
            <p className="s-body">{NOW.club.body}</p>
            <p className="s-body s-status">{NOW.status}</p>
          </div>
        </section>

        <section className="s-sec s-record" aria-labelledby="record-h">
          <div className="s-field s-record-field">
            <h2 id="record-h" className="s-h2">Record</h2>
            <ul className="s-honors">
              {HONORS.map((h) => <li key={h.what}><span className="s-honor">{h.what}</span><span className="s-honor-d">{h.detail}</span></li>)}
            </ul>
          </div>
          <ul className="s-awards">
            {AWARDS.map((a) => (
              <li key={a.site}>
                <a href={a.href} className="s-award">
                  <img src={src(a.img)} alt={`WD Awards certificate for ${a.site}`} loading="lazy" width={720} height={1018} />
                  <span className="s-award-site">{a.site}</span>
                  <span className="s-award-note">{a.note}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="s-sec s-off" aria-labelledby="off-h">
          <h2 id="off-h" className="s-h2">Off the record</h2>
          <div className="s-off-cols">
            <div className="s-field"><h3 className="s-h3">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div className="s-field"><h3 className="s-h3">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div className="s-field"><h3 className="s-h3">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div className="s-field"><h3 className="s-h3">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider} {c.title}</strong> {c.note}</li>)}</ul></div>
          </div>
        </section>

        <section className="s-sec s-end" id="contact" aria-labelledby="end-h">
          <Word text={SHORT} id="end-h" split={[3, 3]} phoneSplit={[2, 2, 2]} max={220} tug="arrive" room={0.6} />
          <ul className="s-contact">
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="s-c-label">{l.label}</span>
                {l.href ? <a className="s-c-val" href={l.href}>{l.value}</a> : <span className="s-c-val">{l.value}</span>}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="s-foot">
        <p>Draft 85 of the portfolio. Not the live site.</p>
        <p>Rubber type adapted from React Bits ElasticMesh. Set in Archivo and Hanken Grotesk.</p>
      </footer>
    </div>
  );
}
