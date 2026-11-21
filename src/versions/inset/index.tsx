// Draft 46, The inset. His own sentences, set huge in Gloock; between two of their words the line opens
// and the thing the sentence is about appears in the gap, pushing the rest of the line along.
// The gap is fancy's MediaBetweenText (MIT), remixed in ./Inset.tsx. The words themselves never move.
import { useState, type ReactNode } from 'react';
import '@fontsource/gloock/400.css';
import '@fontsource-variable/schibsted-grotesk/wght.css';
import './inset.css';
import { AWARDS, CHAPTERS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { Inset, gaps, afterWord, type Media } from './Inset';

const src = (p: string) => import.meta.env.BASE_URL + p;
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; ladders: { who: string; when: string; where: string }[]; epigraph: { text: string; source: string }; pages: number };
const wess = RESEARCH[1];
const firstSentence = (s: string) => (s.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? s).trim();
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/\/$/, '');

// Screenshot media sized in em of the line: height h, width from the image's own proportions.
const shot = (slug: string, h: number, alt: string): Media => {
  const ratio: Record<string, number> = { mitez: 1200 / 660, skeptical: 1200 / 660, lastseen: 1200 / 670, lastsearch: 1200 / 692, spread: 1200 / 660, rogue: 1200 / 662, jarvis: 1200 / 852, drafts: 1200 / 766 };
  return { src: src(`work/${slug}.jpg`), alt, h, w: +(h * (ratio[slug] ?? 1.7)).toFixed(3) };
};

// The hero sentence, taken whole from his About.
const heroSentence = PERSON.about[1].split('. ')[1] + '.';
const debateLine = firstSentence(CHAPTERS[1].body);
const coachLine = firstSentence(CHAPTERS[2].body);
const endLine = CHAPTERS[4].body.slice(firstSentence(CHAPTERS[4].body).length).trim();
const wd = HONORS[2];

// Where in each project's own line its screenshot opens.
const WORK_CUT: Record<string, number> = { mitez: 2, skeptical: 5, lastseen: 3, lastsearch: 3, spread: 3, rogue: 5, jarvis: 3, drafts: 4 };
// Repositories that have a picture of the thing they build.
const REPO_SHOT: Record<string, string> = { skeptical: 'skeptical', 'skeptical-draft2': 'drafts', spread: 'spread' };

const Ladder = (
  <svg className="in-ladder" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round">
      <path d="M17 60 L33 4" /><path d="M35 60 L51 4" />
      <path d="M20.5 48 L38.5 48" /><path d="M24 36 L42 36" /><path d="M27.4 24 L45.4 24" /><path d="M30.8 12 L48.8 12" />
    </g>
  </svg>
);

function Sec({ id, label, children, className = '', heading }: { id: string; label: string; children: ReactNode; className?: string; heading?: boolean }) {
  return (
    <section id={id} className={'in-sec ' + className} aria-labelledby={id + '-h'}>
      {heading ? <h2 id={id + '-h'} className="in-rail">{label}</h2> : <p className="in-rail">{label}</p>}
      <div className="in-body">{children}</div>
    </section>
  );
}

function Today() {
  const { notes, loaded } = useNotes();
  const [at, setAt] = useState(0);
  const note = notes[at] ?? notes[0];
  if (!note) {
    return (
      <>
        <h2 id="today-h" className="in-open">{loaded ? NOW.status : 'Today'}</h2>
        <p className="in-note-wait">{loaded ? 'The next note goes up here.' : 'Opening today’s note.'}</p>
      </>
    );
  }
  const lead = firstSentence(note.body[0]);
  const restOfFirst = note.body[0].slice(lead.length).trim();
  const num: Media = {
    key: note.date,
    w: 2.3, h: 0.86,
    node: (
      <span className="in-num">
        {formatDate(note.date, { day: '2-digit' })}<i>.</i>{formatDate(note.date, { month: '2-digit' })}
      </span>
    ),
  };
  return (
    <>
      <div className="in-swap"><Inset key={note.date} as="h2" id="today-h" className="in-open" parts={afterWord(lead, 3, num)} /></div>
      <div className="in-cols">
        <div className="in-text">
          <p className="in-date"><time dateTime={note.date}>{formatDate(note.date)}</time>{at === 0 ? ', the latest note' : ''}</p>
          {restOfFirst && <p>{restOfFirst}</p>}
          {note.body.slice(1).map((p, i) => <p key={i}>{p}</p>)}
        </div>
        {notes.length > 1 && (
          <div className="in-side">
            <h3 className="in-h3">Every note</h3>
            <ul className="in-notes">
              {notes.map((n, i) => (
                <li key={n.date}>
                  <button type="button" aria-pressed={i === at} onClick={() => setAt(i)}>
                    <time dateTime={n.date}>{formatDate(n.date, { day: 'numeric', month: 'short' })}</time>
                    <span>{firstSentence(n.body[0])}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}

function GitHubLive() {
  const gh = useGitHub();
  const [pick, setPick] = useState<number | null>(null);
  const commits = gh.activity.slice(0, 6);
  const repo = pick !== null ? gh.repos[pick] : null;
  const head = commits[0];
  const line = repo ? repo.description || repo.name : head ? head.message : gh.repos[0]?.description || gh.repos[0]?.name || GITHUB.user;
  const about = repo ? repo.name : head ? head.repo : gh.repos[0]?.name;
  const pic = about ? REPO_SHOT[about] : undefined;
  const parts = pic ? afterWord(line, 2, { ...shot(pic, 0.86, `The ${about} project`), key: line }) : [line];
  return (
    <>
      <div className="in-swap in-swap--code"><Inset key={line} as="h2" id="github-h" className="in-open in-open--code" parts={parts} /></div>
      <p className="in-date">
        {repo || !head ? (
          <>From <a href={(repo ?? gh.repos[0])?.href ?? GITHUB.href}>{about}</a>{(repo ?? gh.repos[0])?.language ? `, written in ${(repo ?? gh.repos[0])!.language}` : ''}</>
        ) : (
          <>Committed to <a href={head.href}>{head.repo}</a>, {ago(head.at)}</>
        )}
      </p>
      <div className={'in-cols in-cols--gh' + (commits.length > 1 ? '' : ' is-solo')}>
        {commits.length > 1 && (
          <div>
            <h3 className="in-h3">Recent commits</h3>
            <ul className="in-rows">
              {commits.slice(1).map((c, i) => (
                <li key={i}><a href={c.href}><span className="in-rows-main">{c.message}</span><span className="in-rows-sub">{c.repo}, {ago(c.at)}</span></a></li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <h3 className="in-h3">Repositories</h3>
          <ul className="in-rows" onPointerLeave={() => setPick(null)}>
            {gh.repos.slice(0, 8).map((r, i) => (
              <li key={r.name}>
                <a href={r.href} onPointerEnter={() => setPick(i)} onFocus={() => setPick(i)} aria-current={pick === i ? 'true' : undefined}>
                  <span className="in-rows-main">{r.name}</span>
                  <span className="in-rows-sub">{[r.description?.replace(/\.$/, ''), r.language].filter(Boolean).join('. ')}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="in-more"><a href={GITHUB.href}>All of it on GitHub, {host(GITHUB.href)}</a></p>
        </div>
      </div>
    </>
  );
}

export default function InsetPage() {
  useVersion('inset');
  return (
    <div className="v-inset">
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="in-top">
        <div className="in-id">
          <h1 className="in-name">{PERSON.name}</h1>
          <p className="in-tag">{PERSON.line}</p>
        </div>
        <nav className="in-nav" aria-label="Sections">
          <ul>
            {[['debate', 'Debate'], ['research', 'Research'], ['work', 'Work'], ['today', 'Today'], ['github', 'GitHub'], ['record', 'Record'], ['contact', 'Contact']].map(([id, l]) => (
              <li key={id}><a href={'#' + id}>{l}</a></li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main">
        <section className="in-hero" aria-label="Introduction">
          <Inset
            className="in-hero-line"
            trigger="load"
            delay={650}
            parts={gaps(heroSentence, [
              ['websites,', shot('drafts', 0.86, 'A wall of website drafts he built')],
              ['assistant', shot('jarvis', 0.86, 'JARVIS, the desktop assistant')],
            ])}
          />
        </section>

        <Sec id="about" label="About" heading>
          <div className="in-text in-text--about">
            {PERSON.about.map((p, i) => <p key={i}>{p}</p>)}
            <p className="in-aside">{PERSON.aside}</p>
          </div>
        </Sec>

        <Sec id="debate" label={CHAPTERS[1].label} className="in-sec--debate">
          <h2 id="debate-h" className="in-open in-open--win">{debateLine}</h2>
          <ol className="in-wins">
            {DEBATE.wins.map((w) => (
              <li key={w.where}>
                <p className="in-win-t">{w.title}</p>
                <p className="in-win-e">{w.event}</p>
                <p className="in-win-w">{w.where}, {w.when}</p>
              </li>
            ))}
          </ol>
          <div className="in-next">
            <h3 className="in-h3">Up next</h3>
            <ul>
              {DEBATE.next.map((n) => <li key={n.where}><span>{n.event}</span> <span className="in-next-at">at {n.where}</span></li>)}
            </ul>
          </div>
        </Sec>

        <Sec id="coaching" label={CHAPTERS[2].label}>
          <Inset as="h2" id="coaching-h" className="in-open" parts={gaps(coachLine, [['Skeptical,', shot('skeptical', 0.86, 'The Skeptical team website')]])} />
          <div className="in-cols">
            <div className="in-text">
              <p className="in-role">{DEBATE.team.role}</p>
              <p>{DEBATE.team.line}</p>
              <p>{DEBATE.team.record}</p>
            </div>
            <div className="in-side">
              <p className="in-more in-more--big"><a href={DEBATE.team.href}>{host(DEBATE.team.href)}</a></p>
            </div>
          </div>
        </Sec>

        <Sec id="research" label={CHAPTERS[3].label}>
          <Inset as="h2" id="research-h" className="in-open in-open--paper" parts={gaps(paper.title, [['Sense”:', { node: Ladder, w: 0.92, h: 1.04 }]])} />
          <blockquote className="in-epi">
            <p>{paper.epigraph.text}</p>
            <footer>{paper.epigraph.source}</footer>
          </blockquote>
          <div className="in-cols">
            <div className="in-text">
              <p className="in-date">{paper.status}, {paper.pages} pages</p>
              <p>{paper.abstract}</p>
              <ul className="in-keys" aria-label="Keywords">{paper.keywords.map((k) => <li key={k}>{k}</li>)}</ul>
              <ul className="in-links">{paper.links.map((l) => <li key={l.label}><a href={l.href}>{l.label}</a></li>)}</ul>
            </div>
            <div className="in-side">
              <h3 className="in-h3">The three ladders</h3>
              <ol className="in-ladders">
                {paper.ladders.map((l) => <li key={l.who}><span className="in-rows-main">{l.who}, {l.when}</span><span className="in-rows-sub">{l.where}</span></li>)}
              </ol>
            </div>
          </div>
          <div className="in-wess">
            <h3 className="in-wess-t">{wess.title}</h3>
            <p className="in-date">{wess.status}</p>
            <p>{wess.abstract}</p>
          </div>
        </Sec>

        <Sec id="work" label="Work" heading>
          <ol className="in-work">
            {WORK.map((w) => (
              <li key={w.slug} className="in-proj">
                <h3 className="in-proj-name">{w.name}</h3>
                <Inset className="in-proj-line" parts={afterWord(w.line, WORK_CUT[w.slug] ?? 3, shot(w.slug, 2, `${w.name}, screenshot`))} />
                <dl className="in-meta">
                  <div><dt>Kind</dt><dd>{w.kind}</dd></div>
                  <div><dt>Built with</dt><dd>{w.stack}</dd></div>
                  <div><dt>Link</dt><dd>{w.href ? <a href={w.href}>{host(w.href)}</a> : 'No public link'}</dd></div>
                </dl>
              </li>
            ))}
          </ol>
        </Sec>

        <Sec id="today" label="Today">
          <Today />
        </Sec>

        <Sec id="github" label="Live from GitHub">
          <GitHubLive />
        </Sec>

        <Sec id="record" label="Record">
          <Inset
            as="h2"
            id="record-h"
            className="in-open"
            parts={gaps(wd.what, [['Favourite,', AWARDS.map((a) => ({ src: src(a.img), alt: `${a.site} certificate, ${a.note}`, href: a.href, h: 1.2, w: +(1.2 * 720 / 1018).toFixed(3) }))]])}
          />
          <p className="in-date">{wd.detail}. Certificates: {AWARDS.map((a, i) => <span key={a.site}>{i ? ' and ' : ''}<a href={a.href}>{a.site}</a></span>)}</p>
          <ol className="in-honors">
            {HONORS.map((h) => <li key={h.what}><span className="in-rows-main">{h.what}</span><span className="in-rows-sub">{h.detail}</span></li>)}
          </ol>
        </Sec>

        <Sec id="now" label="Now">
          <h2 id="now-h" className="in-open">{NOW.status}</h2>
          <div className="in-cols in-cols--three">
            <div>
              <h3 className="in-h3">{NOW.reading.title}</h3>
              <p>{NOW.reading.body}</p>
              <ul className="in-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <h3 className="in-h3">{NOW.club.title}</h3>
              <p>{NOW.club.body}</p>
            </div>
          </div>
        </Sec>

        <Sec id="off" label="Off the record" className="in-sec--off" heading>
          <div className="in-off">
            <div><h3 className="in-h3">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="in-h3">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="in-h3">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="in-h3">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider}, {c.title}.</strong> {c.note}</li>)}</ul></div>
          </div>
        </Sec>

        <Sec id="contact" label="Contact" className="in-sec--end">
          <Inset
            as="h2"
            id="contact-h"
            className="in-open in-open--end"
            parts={gaps(endLine, [['page', { src: src('thumbs/inset.jpg'), alt: 'This page, as you first saw it', h: 0.86, w: 1.376 }]])}
          />
          <ul className="in-contact">
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="in-contact-l">{l.label}</span>
                {l.href ? <a href={l.href}>{l.value}</a> : <span className="in-contact-v">{l.value}</span>}
              </li>
            ))}
          </ul>
        </Sec>
      </main>

      <footer className="in-foot">
        <p>Draft 46 of the portfolio. Not the live site.</p>
        <p>The opening gaps are built on MediaBetweenText from fancy, MIT licence. Set in Gloock and Schibsted Grotesk.</p>
      </footer>
    </div>
  );
}
