// Draft 71, The aside. Built on the snag draft (lab/app/src/versions/snag): its text engine, remade for a pair of parentheses.
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/hanken-grotesk/index.css';
import './aside.css';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { coarse } from '@/lib/utils';
import { PERSON, CHAPTERS, DEBATE, RESEARCH, WORK, HONORS, AWARDS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import Aside from './Aside';

const BASE = import.meta.env.BASE_URL;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/\/$/, '');
const clean = (t: string) => t.replace(/\s*[\u2014\u2013]\s*/g, ', ').replace(/[()]/g, '');

const NAV = [
  ['about', 'About'],
  ['debate', 'Debate'],
  ['research', 'Research'],
  ['work', 'Work'],
  ['today', 'Today'],
  ['github', 'GitHub'],
  ['now', 'Now'],
  ['record', 'Record'],
  ['contact', 'Contact'],
] as const;

const paper = RESEARCH[0];
const wess = RESEARCH[1];
const epi = paper.epigraph!.text;
const cut = epi.indexOf(' (');
const epiHead = epi.slice(0, cut);
const epiAside = epi.slice(cut + 2, epi.lastIndexOf(')'));
const lastSeen = WORK.find((w) => w.slug === 'lastseen')!;
const lsCut = lastSeen.line.indexOf('. ') + 1;
const plato = DISLIKES.find((d) => d.startsWith('Plato'))!;
const coach = CHAPTERS.find((c) => c.id === 'coach')!.body;
const stillCompete = coach.slice(coach.lastIndexOf('I still'));
const debateTitle = CHAPTERS.find((c) => c.id === 'debate')!.title;

function Today() {
  const { notes, loaded } = useNotes();
  const [latest, ...earlier] = notes;
  if (!loaded) {
    return <p className="quiet" role="status">Opening today’s note.</p>;
  }
  if (!latest) {
    return (
      <Aside
        key="none"
        id="today"
        paras={[{ k: 'n0', cls: 'note', text: NOW.status }]}
        aside="No note yet today."
        asideCls="as-m"
        desk={{ a: 0.6, b: 0.9, top: 0, lines: 4 }}
        phone={{ a: 0.1, b: 0.9, top: 2, lines: 5 }}
        names={['Opening parenthesis round the date', 'Closing parenthesis round the date']}
      />
    );
  }
  return (
    <>
      <Aside
        key={latest.date}
        id="today"
        paras={latest.body.map((b, i) => ({ k: `n${i}`, cls: 'note', text: b }))}
        aside={formatDate(latest.date)}
        asideCls="as-date"
        desk={{ a: 0.66, b: 0.93, top: 0, lines: 4 }}
        phone={{ a: 0.12, b: 0.88, top: 0, lines: 4 }}
        names={['Opening parenthesis round the date', 'Closing parenthesis round the date']}
      />
      {earlier.length > 0 && (
        <details className="earlier">
          <summary>Earlier notes <span className="soft">({earlier.length})</span></summary>
          <ol>
            {earlier.map((n) => (
              <li key={n.date}>
                <time dateTime={n.date}>{formatDate(n.date)}</time>
                <div>{n.body.map((b, i) => <p key={i}>{b}</p>)}</div>
              </li>
            ))}
          </ol>
        </details>
      )}
    </>
  );
}

function GitHub() {
  const { repos, activity, commitsThisMonth, live } = useGitHub();
  const has = activity.length > 0;
  const text = has
    ? activity.map((a) => `${clean(a.message).replace(/\s*[.!]+$/, '')}, in ${a.repo}, ${ago(a.at)}.`).join(' ')
    : repos.map((r) => `${r.name}: ${clean(r.description ?? r.language ?? '').replace(/\.$/, '')}.`).join(' ');
  const held = has && commitsThisMonth != null ? `${commitsThisMonth} commits this month` : `${repos.length} public repositories`;
  return (
    <>
      <Aside
        key={`${live}-${activity.length}-${repos.length}`}
        id="github"
        paras={[{ k: 'g0', cls: 'run', text }]}
        aside={held}
        asideCls="as-num"
        desk={{ a: 0.5, b: 0.74, top: 0.5, lines: 4 }}
        phone={{ a: 0.14, b: 0.86, top: 0, lines: 4 }}
        names={['Opening parenthesis round the count', 'Closing parenthesis round the count']}
      />
      <ul className="repos">
        {repos.slice(0, 8).map((r) => (
          <li key={r.name}>
            <a href={r.href}>{r.name}</a>
            <span className="soft">{[r.language, has && r.description ? clean(r.description) : null].filter(Boolean).join('. ')}</span>
          </li>
        ))}
      </ul>
      <p className="more">
        <a href={GITHUB.href}>{host(GITHUB.href)}</a>
      </p>
    </>
  );
}

export default function AsidePage() {
  useVersion('aside');
  const hint = coarse ? 'Slide either parenthesis sideways.' : 'Drag either parenthesis.';

  return (
    <div className="v-aside">
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="top">
        <nav aria-label="Sections">
          <ul>
            {NAV.map(([id, label]) => (
              <li key={id}><a href={`#${id}`}>{label}</a></li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main">
        <section className="hero" id="about" aria-labelledby="name">
          <h1 id="name">{PERSON.name}</h1>
          <p className="line">{PERSON.line}</p>
          <Aside
            id="about"
            paras={PERSON.about.map((t, i) => ({ k: `a${i}`, cls: 'big', text: t }))}
            aside={PERSON.aside}
            asideCls="as-l"
            opening
            desk={{ a: 0.43, b: 0.73, top: 1, lines: 8 }}
            phone={{ a: 0.1, b: 0.9, top: 3, lines: 8 }}
          />
          <p className="hint">{hint}</p>
        </section>

        <section className="sec debate" id="debate" aria-labelledby="h-debate">
          <h2 id="h-debate">Debate</h2>
          <p className="lede">{debateTitle}</p>
          <div className="wins">
            {DEBATE.wins.map((w) => (
              <article key={w.where} className="win">
                <h3>{w.title}</h3>
                <p className="ev">{w.event}</p>
                <p className="where">{w.where}, {w.when}</p>
              </article>
            ))}
          </div>

          <div className="team">
            <div className="team-head">
              <h3>{DEBATE.team.name}</h3>
              <p className="role">{DEBATE.team.role}</p>
            </div>
            <Aside
              id="team"
              paras={[
                { k: 't0', cls: 'mid', text: DEBATE.team.line },
                { k: 't1', cls: 'mid', text: DEBATE.team.record },
              ]}
              aside={stillCompete}
              asideCls="as-m"
              desk={{ a: 0.7, b: 0.97, top: 0, lines: 5 }}
              phone={{ a: 0.12, b: 0.88, top: 3, lines: 3 }}
            />
            <p className="more"><a href={DEBATE.team.href}>{host(DEBATE.team.href)}</a></p>
          </div>

          <div className="next">
            <h3>Up next</h3>
            <ul>
              {DEBATE.next.map((n) => (
                <li key={n.where}><span className="nx-ev">{n.event}</span> <span className="soft">at</span> <span className="nx-w">{n.where}</span></li>
              ))}
            </ul>
          </div>
        </section>

        <section className="sec research" id="research" aria-labelledby="h-research">
          <h2 id="h-research">Research</h2>
          <h3 className="title">{paper.title}</h3>
          <p className="meta">{paper.status}. {paper.pages} pages.</p>
          <blockquote className="sr-only-x">
            <p>{epi}</p>
            <footer>{paper.epigraph!.source}</footer>
          </blockquote>
          <Aside
            id="epigraph"
            paras={[
              { k: 'e0', cls: 'epi', text: epiHead, hide: true, min: 1, just: false },
              { k: 'e1', cls: 'src', text: paper.epigraph!.source, hide: true, min: 1, just: false },
              { k: 'e2', cls: 'mid', text: paper.abstract },
            ]}
            aside={epiAside}
            asideCls="as-epi"
            hideAside
            back
            desk={{ a: 0.6, b: 0.97, top: 0, lines: 4.6 }}
            phone={{ a: 0.12, b: 0.88, top: 3.2, lines: 2.6 }}
            names={['The opening parenthesis of the quote', 'The closing parenthesis of the quote']}
          />
          <p className="hint">{coarse ? 'Push them together. Let go.' : 'Push them together until they meet. Let go.'}</p>
          <div className="paper-foot">
            <ul className="kw" aria-label="Keywords">
              {paper.keywords!.map((k) => <li key={k}>{k}</li>)}
            </ul>
            <ul className="plinks">
              {paper.links.map((l) => (
                <li key={l.href}><a href={l.href}>{l.label}</a></li>
              ))}
            </ul>
          </div>
          <div className="wess">
            <h3>{wess.title}</h3>
            <p className="meta">{wess.status}</p>
            <p>{wess.abstract}</p>
          </div>
        </section>

        <section className="sec work" id="work" aria-labelledby="h-work">
          <h2 id="h-work">Work</h2>
          {WORK.map((w) => (
            <article key={w.slug} className="item">
              <div className="band">
                <h3>{w.name}</h3>
                <div className="info">
                  <p className="kind">{w.kind}</p>
                  {w.slug === 'lastseen' ? (
                    <Aside
                      id="lastseen"
                      paras={[{ k: 'l0', cls: 'mid', text: lastSeen.line.slice(0, lsCut) }]}
                      aside={lastSeen.line.slice(lsCut + 1)}
                      asideCls="as-m"
                      desk={{ a: 0.56, b: 0.96, top: 0, lines: 4 }}
                      phone={{ a: 0.1, b: 0.9, top: 2, lines: 3 }}
                    />
                  ) : (
                    <p className="wline">{w.line}</p>
                  )}
                  <p className="stack">{w.stack}</p>
                  {w.href ? (
                    <p className="more"><a href={w.href}>{host(w.href)}</a></p>
                  ) : (
                    <p className="more soft">No public link.</p>
                  )}
                </div>
              </div>
              <figure>
                <img src={BASE + w.img} alt={`${w.name}, screenshot`} loading="lazy" width={1200} height={750} />
              </figure>
            </article>
          ))}
        </section>

        <section className="sec today" id="today" aria-labelledby="h-today">
          <h2 id="h-today">Today</h2>
          <Today />
        </section>

        <section className="sec gh" id="github" aria-labelledby="h-gh">
          <h2 id="h-gh">Live from GitHub</h2>
          <GitHub />
        </section>

        <section className="sec now" id="now" aria-labelledby="h-now">
          <h2 id="h-now">Now</h2>
          <h3>{NOW.reading.title}</h3>
          <ul className="shelves">
            {NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}
          </ul>
          <Aside
            id="now"
            paras={[
              { k: 'r0', cls: 'mid', text: NOW.reading.body },
              { k: 'r1', cls: 'mid', text: `${NOW.club.title}. ${NOW.club.body}` },
            ]}
            aside={NOW.status}
            asideCls="as-m"
            desk={{ a: 0.03, b: 0.36, top: 0, lines: 5 }}
            phone={{ a: 0.08, b: 0.92, top: 4, lines: 6 }}
          />
        </section>

        <section className="sec record" id="record" aria-labelledby="h-record">
          <h2 id="h-record">Record</h2>
          <ol className="honors">
            {HONORS.map((h) => (
              <li key={h.what}>
                <span className="hw">{h.what}</span>
                <span className="soft">{h.detail}</span>
              </li>
            ))}
          </ol>
          <div className="awards">
            {AWARDS.map((a) => (
              <a key={a.site} href={a.href} className="award">
                <img src={BASE + a.img} alt={`Certificate: ${a.site}`} loading="lazy" width={600} height={848} />
                <span className="aw-site">{a.site}</span>
                <span className="soft">{a.note}</span>
              </a>
            ))}
          </div>
        </section>

        <section className="sec off" id="off" aria-labelledby="h-off">
          <h2 id="h-off">Off the record</h2>
          <Aside
            id="off"
            paras={[
              { k: 'o0', cls: 'mid', text: `Likes: ${LIKES.join('; ')}.` },
              { k: 'o1', cls: 'mid', text: `Not a fan of: ${DISLIKES.filter((d) => d !== plato).join('; ')}.` },
              { k: 'o2', cls: 'mid', text: `Favourites: ${FAVOURITES.map((f) => f.replace(/\.$/, '')).join('; ')}.` },
              { k: 'o3', cls: 'mid', text: `Courses: ${COURSES.map((c) => `${c.provider} ${c.title}, ${c.note.replace(/\.$/, '')}`).join('; ')}.` },
            ]}
            aside={`${plato}.`}
            asideCls="as-m"
            desk={{ a: 0.66, b: 0.97, top: 2, lines: 6 }}
            phone={{ a: 0.1, b: 0.9, top: 6, lines: 4 }}
          />
        </section>

        <section className="sec contact" id="contact" aria-labelledby="h-contact">
          <h2 id="h-contact">Contact</h2>
          <Aside
            id="contact"
            paras={[]}
            aside={{ label: LINKS[0].value, href: LINKS[0].href! }}
            asideCls="as-mail"
            close
            desk={{ a: 0.27, b: 0.73, top: 0, lines: 3 }}
            phone={{ a: 0.07, b: 0.93, top: 0, lines: 2.6 }}
            names={['Opening parenthesis round the email', 'Closing parenthesis round the email']}
          />
          <ul className="links">
            {LINKS.slice(1).map((l) => (
              <li key={l.label}>
                <span className="soft">{l.label}</span>
                {l.href ? <a href={l.href}>{l.value}</a> : <span>{l.value}</span>}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="foot">
        <p>Draft 71 of the portfolio. Not the live site.</p>
        <p className="soft">Set in Bodoni Moda and Hanken Grotesk. The text engine is carried over from the snag draft.</p>
      </footer>
    </div>
  );
}
