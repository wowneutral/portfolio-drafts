// Draft 78: the hold. Two answers about him run from your pointer; stop reaching and
// they come back side by side. The skeptic's suspension of judgement, done by hand.
import { useState } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/hanken-grotesk/wght.css';
import './hold.css';
import { PERSON, CHAPTERS, DEBATE, RESEARCH, WORK, HONORS, AWARDS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { coarse, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import HoldPair, { type Word } from './HoldPair';

const BASE = import.meta.env.BASE_URL;
const PAPER = RESEARCH[0];
const PRAYER = RESEARCH[1];
const first = (s: string) => s.slice(0, s.indexOf('.') + 1);
const rest = (s: string) => s.slice(s.indexOf('.') + 1).trim();
const ext = (href: string) => (href.startsWith('http') ? { rel: 'noopener' } : {});
const host = (href: string) => href.replace(/^https?:\/\//, '').replace(/\/$/, '');

const COACH = CHAPTERS.find((c) => c.id === 'coach')!.body;
const HALVES: [Word, Word] = [
  { label: 'Debate.', sub: first(PERSON.about[0]), target: 'about', name: 'debate' },
  { label: 'Building.', sub: first(PERSON.about[1]), target: 'building', name: 'building' },
];
const ROLES: [Word, Word] = [
  { label: 'Coach.', sub: DEBATE.team.role + '.', target: 'skeptical', name: 'coach' },
  { label: 'Competitor.', sub: COACH.slice(COACH.lastIndexOf('I still')), target: 'wins', name: 'competitor' },
];

const HINT = coarse ? 'Tap either. Then hold still.' : 'Reach for either.';
const NAV = [['about', 'About'], ['today', 'Today'], ['debate', 'Debate'], ['research', 'Research'], ['building', 'Building'], ['contact', 'Contact']] as const;

function Today() {
  const { notes, loaded } = useNotes();
  const [pick, setPick] = useState(0);
  const note = notes[pick];
  return (
    <section className="today" id="today" aria-labelledby="h-today">
      <div className="today-side">
        <h2 id="h-today" className="h2">Today</h2>
        <p className="quiet">The daily note.</p>
        {notes.length > 1 && (
          <ol className="dates" aria-label="Earlier notes">
            {notes.map((n, i) => (
              <li key={n.date}>
                <button type="button" aria-pressed={i === pick} onClick={() => setPick(i)}>
                  <span>{formatDate(n.date)}</span>{i === 0 && <span className="dl">latest</span>}
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
      <article className="note" aria-live="polite">
        {note ? (
          <>
            <p className="note-date"><time dateTime={note.date}>{formatDate(note.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></p>
            {note.body.map((p, i) => <p key={i} className="note-body">{p}</p>)}
          </>
        ) : (
          <p className="note-body note-wait">{loaded ? 'No note posted yet. Check back tomorrow.' : 'Fetching the latest note.'}</p>
        )}
      </article>
    </section>
  );
}

function GitHubLive() {
  const { repos, activity, commitsThisMonth, live } = useGitHub();
  return (
    <section className="gh" id="github" aria-labelledby="h-gh">
      <div className="gh-head">
        <h2 id="h-gh" className="h2">Live from GitHub</h2>
        <p className="quiet">
          {live && commitsThisMonth != null ? `${commitsThisMonth} commits this month, as of this visit.` : 'What he keeps in the open.'}{' '}
          <a className="ln" href={GITHUB.href} {...ext(GITHUB.href)}>github.com/{GITHUB.user}</a>
        </p>
      </div>
      {activity.length > 0 && (
        <ol className="commits" aria-label="Recent commits">
          {activity.slice(0, 6).map((c) => (
            <li key={c.href}>
              <a href={c.href} {...ext(c.href)}><span className="cm">{c.message}</span></a>
              <span className="cr">{c.repo}</span>
              <span className="ca">{ago(c.at)}</span>
            </li>
          ))}
        </ol>
      )}
      <ul className="repos" aria-label="Repositories">
        {repos.slice(0, 6).map((r) => (
          <li key={r.name}>
            <a href={r.href} {...ext(r.href)}>{r.name}</a>
            {r.description && <p>{r.description}</p>}
            {r.language && <span className="lang">{r.language}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Hold() {
  useVersion('hold');
  const [held, setHeld] = useState(still);
  const [held2, setHeld2] = useState(still);

  return (
    <div className="v-hold" data-held={held ? '' : undefined}>
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="top">
        <a className="mark" href="#main">Armaan Seth</a>
        <nav aria-label="Sections">
          <ul>{NAV.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}</ul>
        </nav>
      </header>

      <main id="main">
        <section className="hero" aria-labelledby="h-name">
          <div className="hero-name">
            <h1 id="h-name">{PERSON.name}</h1>
            <p className="line">{PERSON.line}</p>
          </div>
          <p className="ask">Which half is he?</p>
          <HoldPair words={HALVES} held={held} onHold={() => setHeld(true)} />
          <div className="verdict" aria-live="polite">
            {held ? (
              <><p>You stopped reaching for a verdict.</p><p>A skeptic holds back from saying either.</p></>
            ) : (
              <p className="hint">{HINT}</p>
            )}
          </div>
        </section>

        <section className="about" id="about" aria-labelledby="h-about">
          <h2 id="h-about" className="h2">About</h2>
          <div className="halves">
            <div className="half">
              <h3>Debate.</h3>
              <p className="lead">{first(PERSON.about[0])}</p>
              <p>{rest(PERSON.about[0])}</p>
            </div>
            <div className="half">
              <h3>Building.</h3>
              <p className="lead">{first(PERSON.about[1])}</p>
              <p>{rest(PERSON.about[1])}</p>
            </div>
          </div>
          <p className="aside">{PERSON.aside}</p>
        </section>

        <Today />

        <section className="debate" id="debate" aria-labelledby="h-debate" data-held={held2 ? '' : undefined}>
          <h2 id="h-debate" className="h2">Debate</h2>
          <p className="ask">Coach or competitor?</p>
          <HoldPair words={ROLES} held={held2} onHold={() => setHeld2(true)} />
          <div className="verdict" aria-live="polite">
            {held2 ? <p>Both, again.</p> : <p className="hint">{HINT}</p>}
          </div>

          <ul className="wins" id="wins" aria-label="Championships">
            {DEBATE.wins.map((w) => (
              <li key={w.where}>
                <p className="champ">{w.title}</p>
                <span className="rule" aria-hidden="true" />
                <p className="ev">{w.event}</p>
                <p className="wh">{w.where}, {w.when}</p>
              </li>
            ))}
          </ul>

          <div className="team" id="skeptical">
            <h3>{DEBATE.team.name}</h3>
            <div className="team-text">
              <p className="role">{DEBATE.team.role}</p>
              <p>{DEBATE.team.line}</p>
              <p>{DEBATE.team.record}</p>
              <a className="ln big" href={DEBATE.team.href} {...ext(DEBATE.team.href)}>{host(DEBATE.team.href)}</a>
            </div>
          </div>

          <div className="next">
            <h3>Up next</h3>
            <ul>
              {DEBATE.next.map((n) => <li key={n.where}><span className="nw">{n.where}</span><span className="ne">{n.event}</span></li>)}
            </ul>
          </div>
        </section>

        <section className="research" id="research" aria-labelledby="h-research">
          <h2 id="h-research" className="h2">Research</h2>
          <figure className="epi">
            <blockquote><p>{PAPER.epigraph!.text}</p></blockquote>
            <figcaption>{PAPER.epigraph!.source}</figcaption>
          </figure>
          <h3 className="paper-title">{PAPER.title}</h3>
          <p className="quiet">{PAPER.status}, {PAPER.pages} pages. DOI {PAPER.doi}</p>
          <p className="abstract">{PAPER.abstract}</p>
          <ul className="kw" aria-label="Keywords">{PAPER.keywords!.map((k) => <li key={k}>{k}</li>)}</ul>
          <div className="ladders">
            <h4>Three ladders</h4>
            <ol>
              {PAPER.ladders!.map((l) => (
                <li key={l.who}><span className="lw">{l.who}</span><span className="lt">{l.when}</span><span className="lp">{l.where}</span></li>
              ))}
            </ol>
          </div>
          <ul className="plinks" aria-label="Where the paper lives">
            {PAPER.links.map((l) => <li key={l.label}><a href={l.href} {...ext(l.href)}>{l.label}</a></li>)}
          </ul>
          <div className="prayer">
            <h3>{PRAYER.title}</h3>
            <p className="quiet">{PRAYER.status}</p>
            <p>{PRAYER.abstract}</p>
          </div>
        </section>

        <section className="building" id="building" aria-labelledby="h-building">
          <h2 id="h-building" className="h2">Building</h2>
          <ul className="spread">
            {WORK.map((w, i) => (
              <li key={w.slug} style={{ '--r': i + 1, '--c': (i % 2) + 1 } as React.CSSProperties}>
                <figure>
                  <div className="shot"><img src={BASE + w.img} alt={`Screenshot of ${w.name}`} width={1200} height={680} loading="lazy" /></div>
                  <figcaption>
                    <p className="wk">{w.kind}</p>
                    <h3>{w.name}</h3>
                    <p>{w.line}</p>
                    <p className="stack">{w.stack}</p>
                    {w.href && <a className="ln" href={w.href} {...ext(w.href)}>{host(w.href)}</a>}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </section>

        <GitHubLive />

        <section className="now" id="now" aria-labelledby="h-now">
          <h2 id="h-now" className="h2">Now</h2>
          <p className="status">{NOW.status}</p>
          <div className="now-cols">
            <div>
              <h3>{NOW.reading.title}</h3>
              <p>{NOW.reading.body}</p>
              <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <h3>{NOW.club.title}</h3>
              <p>{NOW.club.body}</p>
            </div>
          </div>
        </section>

        <section className="record" id="record" aria-labelledby="h-record">
          <h2 id="h-record" className="h2">Record</h2>
          <ol className="honors">
            {HONORS.map((h) => <li key={h.what}><span className="hw">{h.what}</span><span className="hd">{h.detail}</span></li>)}
          </ol>
          <ul className="certs">
            {AWARDS.map((a) => (
              <li key={a.site}>
                <a href={a.href} {...ext(a.href)}>
                  <img src={BASE + a.img} alt={`WD Awards certificate for ${a.site}`} width={720} height={1018} loading="lazy" />
                  <span className="cs">{a.site}</span>
                  <span className="cn">{a.note}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="off" id="off" aria-labelledby="h-off">
          <h2 id="h-off" className="h2">Off the record</h2>
          <div className="off-pair">
            <div><h3>Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
          </div>
          <div className="off-pair">
            <div><h3>Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider} {c.title}.</b> {c.note}</li>)}</ul></div>
          </div>
        </section>

        <section className="end" id="contact" aria-labelledby="h-end">
          <h2 id="h-end">Nothing left to decide.</h2>
          <ul className="links">
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="lk">{l.label}</span>
                {l.href ? <a href={l.href} {...ext(l.href)}>{l.value}</a> : <span className="lv">{l.value}</span>}
              </li>
            ))}
          </ul>
          <footer className="foot">
            <p>Draft 78 of the portfolio. Not the live site.</p>
            <p>{PERSON.name}, {PERSON.home}. Word motion adapted from DodgeField by React Bits (MIT and Commons Clause).</p>
          </footer>
        </section>
      </main>
    </div>
  );
}
