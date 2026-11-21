// Draft 55: the thread. His name is drawn only by his own commit messages, running round the outline of every
// letter of ARMAAN SETH (Anton) and sliding along it as you scroll. The path text is fancy's text-along-path
// (danielpetho/fancy, MIT), remixed in PathText.tsx. The same device frames the work and, at the end, his email.
import { useMemo, useState } from 'react';
import '@fontsource/anton/400.css';
import '@fontsource-variable/instrument-sans/wght.css';
import './thread.css';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { useVersion } from '@/lib/version';
import Name from './Name';
import Frame from './Frame';
import type { Seg } from './PathText';

const BASE = import.meta.env.BASE_URL;
const PAPER = RESEARCH[0] as (typeof RESEARCH)[0] & { epigraph: { text: string; source: string }; keywords: string[] };
const WESSO = RESEARCH[1];
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/\/$/, '');
const ext = (h: string) => (h.startsWith('http') ? { rel: 'noopener' } : {});

const NAV = [
  ['debate', 'Debate'], ['work', 'Work'], ['research', 'Research'], ['github', 'GitHub'], ['today', 'Today'], ['contact', 'Contact'],
] as const;

export default function Thread() {
  useVersion('thread');
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const [more, setMore] = useState(false);

  const commits = gh.activity;
  const segs: Seg[] = useMemo(
    () => (commits.length
      ? commits.map((a, i) => ({ text: `${a.message} · ${a.repo} · ${ago(a.at)}`, hot: i === 0 }))
      : GITHUB.repos.map((r, i) => ({ text: `${r.name} · ${r.description}`, hot: i === 0 }))),
    [commits],
  );
  const latest = notes[0];
  const noteSegs: Seg[] = useMemo(
    () => (latest ? [{ text: latest.body.join(' '), hot: false }, { text: formatDate(latest.date), hot: true }] : [{ text: NOW.status }]),
    [latest],
  );

  return (
    <div className="v-thread">
      <a className="skip-x" href="#main">Skip to content</a>

      <header className="th-hero" id="top">
        <nav className="th-nav" aria-label="Sections">
          <a className="th-home" href="#top">Armaan Seth</a>
          <ul>{NAV.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}</ul>
        </nav>
        <h1 className="th-h1">
          <span className="sr-only-x">{PERSON.name}</span>
          <Name segs={segs} />
        </h1>
        <div className="th-under">
          <p className="th-line">{PERSON.line}</p>
          <p className="th-note">
            {commits.length
              ? <>Drawn in my latest commits. Newest, in red: <span className="th-red">{commits[0].message}</span>, {commits[0].repo}, {ago(commits[0].at)}.</>
              : <>Drawn in my repositories. In red: <span className="th-red">{GITHUB.repos[0].name}</span>.</>}
            <span className="th-drag"> Drag across the name to pull the thread.</span>
          </p>
        </div>
      </header>

      <main id="main">
        <section className="th-sec th-debate" id="debate" aria-labelledby="debate-h">
          <h2 id="debate-h" className="th-h2">Debate</h2>
          <ol className="th-wins">
            {DEBATE.wins.map((w) => (
              <li key={w.where}>
                <p className="th-champ">{w.title}</p>
                <p className="th-event">{w.event}</p>
                <p className="th-where">{w.where}, {w.when}</p>
              </li>
            ))}
          </ol>
          <div className="th-team">
            <div className="th-team-main">
              <h3 className="th-h3">{DEBATE.team.name}</h3>
              <p className="th-role">{DEBATE.team.role}</p>
              <p>{DEBATE.team.line}</p>
              <p className="th-record">{DEBATE.team.record}</p>
              <a className="th-link" href={DEBATE.team.href} {...ext(DEBATE.team.href)}>{host(DEBATE.team.href)}</a>
            </div>
            <div className="th-next">
              <h3 className="th-h4">Up next</h3>
              <ul>{DEBATE.next.map((n) => <li key={n.where}><strong>{n.where}</strong><span>{n.event}</span></li>)}</ul>
            </div>
          </div>
        </section>

        <section className="th-sec th-about" aria-labelledby="about-h">
          <h2 id="about-h" className="th-h2">About</h2>
          <div className="th-about-body">
            {PERSON.about.map((p, i) => <p key={i} className={i === 0 ? 'th-lede' : undefined}>{p}</p>)}
            <p className="th-aside">{PERSON.aside}</p>
          </div>
        </section>

        <section className="th-sec th-work" id="work" aria-labelledby="work-h">
          <h2 id="work-h" className="th-h2">Work</h2>
          <div className="th-works">
            {WORK.map((w, i) => (
              <article key={w.slug} className="th-piece" data-side={i % 2 ? 'r' : 'l'}>
                <Frame id={`th-w-${w.slug}`} segs={[{ text: w.line }, { text: w.stack, hot: true }]} className="th-shot">
                  <img src={BASE + w.img} alt={`${w.name}, screenshot`} loading="lazy" width={1200} height={700} />
                </Frame>
                <div className="th-piece-text">
                  <h3 className="th-h3">{w.name}</h3>
                  <p className="th-kind">{w.kind}</p>
                  <p>{w.line}</p>
                  <p className="th-stack">{w.stack}</p>
                  {w.href ? <a className="th-link" href={w.href} {...ext(w.href)}>{host(w.href)}</a> : <p className="th-stack">No public link</p>}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="th-sec th-research" id="research" aria-labelledby="research-h">
          <h2 id="research-h" className="th-h2">Research</h2>
          <div className="th-paper">
            <div className="th-paper-main">
              <p className="th-kind">{PAPER.status}</p>
              <h3 className="th-title">{PAPER.title}</h3>
              <figure className="th-epi">
                <blockquote><p>{PAPER.epigraph.text}</p></blockquote>
                <figcaption>{PAPER.epigraph.source}</figcaption>
              </figure>
              <p className="th-abstract">{PAPER.abstract}</p>
              <h4 className="th-h4">Keywords</h4>
              <ul className="th-keys">{PAPER.keywords.map((k) => <li key={k}>{k}</li>)}</ul>
              <ul className="th-paper-links">
                {PAPER.links.map((l) => <li key={l.label}><a href={l.href} {...ext(l.href)}>{l.label}</a></li>)}
              </ul>
            </div>
            <aside className="th-wesso" aria-labelledby="wesso-h">
              <p className="th-kind">{WESSO.status}</p>
              <h3 id="wesso-h" className="th-h4 th-wesso-h">{WESSO.title}</h3>
              <p>{WESSO.abstract}</p>
            </aside>
          </div>
        </section>

        <section className="th-sec th-gh" id="github" aria-labelledby="gh-h">
          <h2 id="gh-h" className="th-h2">Live from GitHub</h2>
          <div className="th-gh-grid" data-live={commits.length ? 'yes' : 'no'}>
            {commits.length > 0 && (
              <div className="th-log">
                <h3 className="th-h4">Latest commits</h3>
                <ol>
                  {commits.map((c, i) => (
                    <li key={c.href + i} className={i === 0 ? 'is-new' : undefined}>
                      <a href={c.href} rel="noopener">{c.message}</a>
                      <span>{c.repo} · {ago(c.at)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <div className="th-repos">
              <h3 className="th-h4">Repositories</h3>
              <ul>
                {gh.repos.slice(0, commits.length ? 6 : 4).map((r) => (
                  <li key={r.name}>
                    <a href={r.href} rel="noopener" className="th-repo">{r.name}</a>
                    {r.description && <p>{r.description}</p>}
                    {r.language && <span className="th-stack">{r.language}{r.pushedAt ? ` · pushed ${ago(r.pushedAt)}` : ''}</span>}
                  </li>
                ))}
              </ul>
              <a className="th-link" href={GITHUB.href} rel="noopener">{host(GITHUB.href)}</a>
            </div>
          </div>
        </section>

        <section className="th-today" id="today" aria-labelledby="today-h">
          <div className="th-band">
            <h2 id="today-h" className="th-band-h">
              <span className="th-band-k">Today</span>
              <span className="th-band-d">{latest ? formatDate(latest.date) : loaded ? 'Right now' : 'Today'}</span>
            </h2>
          </div>
          <div className="th-sec th-today-body" aria-live="polite">
            {latest ? latest.body.map((p, i) => <p key={i} className="th-today-p">{p}</p>)
              : <p className="th-today-p">{loaded ? NOW.status : 'Fetching the latest note.'}</p>}
            {notes.length > 1 && (
              <div className="th-earlier">
                <button type="button" className="th-more" aria-expanded={more} aria-controls="th-earlier-list" onClick={() => setMore((m) => !m)}>
                  {more ? 'Hide earlier notes' : `Earlier notes (${notes.length - 1})`}
                </button>
                <ol id="th-earlier-list" className="th-notes" hidden={!more}>
                  {notes.slice(1).map((n) => (
                    <li key={n.date}>
                      <time dateTime={n.date}>{formatDate(n.date)}</time>
                      <div>{n.body.map((p, i) => <p key={i}>{p}</p>)}</div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </section>

        <section className="th-sec th-now" aria-labelledby="now-h">
          <h2 id="now-h" className="th-h2">Now</h2>
          <div className="th-now-grid">
            <div>
              <h3 className="th-h4">{NOW.reading.title}</h3>
              <p>{NOW.reading.body}</p>
              <ul className="th-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <h3 className="th-h4">{NOW.club.title}</h3>
              <p>{NOW.club.body}</p>
            </div>
            <div>
              <h3 className="th-h4">Status</h3>
              <p>{NOW.status}</p>
            </div>
          </div>
        </section>

        <section className="th-sec th-record" aria-labelledby="record-h">
          <h2 id="record-h" className="th-h2">Record</h2>
          <div className="th-record-grid">
            <ol className="th-honors">
              {HONORS.map((h) => <li key={h.what}><span>{h.what}</span><span className="th-stack">{h.detail}</span></li>)}
            </ol>
            <ul className="th-awards">
              {AWARDS.map((a) => (
                <li key={a.site}>
                  <a href={a.href} rel="noopener">
                    <img src={BASE + a.img} alt={`WD Awards certificate, ${a.site}`} loading="lazy" width={720} height={1018} />
                    <span className="th-award-t">{a.site}</span>
                    <span className="th-stack">{a.note}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="th-sec th-off" aria-labelledby="off-h">
          <h2 id="off-h" className="th-h2">Off the record</h2>
          <div className="th-off-grid">
            <div><h3 className="th-h4">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="th-h4">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="th-h4">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="th-h4">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider} {c.title}</strong> {c.note}</li>)}</ul></div>
          </div>
        </section>

        <section className="th-contact" id="contact" aria-labelledby="contact-h">
          <h2 id="contact-h" className="th-h2 th-contact-h">Write to me</h2>
          <Frame id="th-mail" segs={noteSegs} size={15} gap={14} radius={22} travel={0.9} className="th-mailframe">
            <a className="th-mail" href={LINKS[0].href}>{LINKS[0].value}</a>
          </Frame>
          <p className="th-mail-note">{latest ? `Framed by my latest note, ${formatDate(latest.date)}.` : 'Framed by what I am up to right now.'}</p>
          <ul className="th-links">
            {LINKS.slice(1).map((l) => (
              <li key={l.label}>
                <span className="th-kind">{l.label}</span>
                {l.href ? <a href={l.href} {...ext(l.href)}>{l.value}</a> : <span className="th-val">{l.value}</span>}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="th-foot">
        <p>Draft 55 of the portfolio. Not the live site.</p>
        <p>Path type remixed from fancy's text along path (MIT). Set in Anton and Instrument Sans.</p>
        <a className="th-link" href="#top">Back to the name</a>
      </footer>
    </div>
  );
}
