// Draft 13, The highlight. His life as a debate file, cut: pockets, hats, blocks and cards, each card a bold
// tag, a cite in small caps, and evidence highlighted down to the words you would read aloud. The visitor can
// cut too (drag across any text). The page ends by reading every highlight on it, in order.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import '@fontsource/carlito/400.css';
import '@fontsource/carlito/700.css';
import '@fontsource/carlito/400-italic.css';
import './highlight.css';
import { AWARDS, CHAPTERS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { Ev, autoRuns, clearAll, useCuts, useKeyCut } from './cut';

const src = (p: string) => import.meta.env.BASE_URL + p;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; ladders: { who: string; when: string; where: string }[]; epigraph: { text: string; source: string } };
const wess = RESEARCH[1];
const debateBody = CHAPTERS.find((c) => c.id === 'debate')!.body;
const coachBody = CHAPTERS.find((c) => c.id === 'coach')!.body;
// How each project line is cut: the words a debater would read aloud.
const WORK_RUNS: Record<string, string[]> = {
  mitez: ['Free mentorship', 'no cost'],
  skeptical: ['the prep drive', 'application portal'],
  lastseen: ['the interface does the telling', 'my favourite thing'],
  lastsearch: ['what a person types', 'nobody is watching'],
  spread: ['read at speed', 'turning into noise'],
  rogue: ['carry a build', 'where the seams show'],
  jarvis: ['actually runs my machine', 'text like a person'],
  drafts: ['A hundred different versions', 'a single idea'],
};
const STOP = /^(a|an|the|of|and|for|to|its|this|in)$/i;
function repoRun(d: string) {
  const w = d.replace(/[.,]/g, '').split(/\s+/).filter(Boolean);
  while (w.length && STOP.test(w[0])) w.shift();
  const r = w.slice(0, 3);
  while (r.length && STOP.test(r[r.length - 1])) r.pop();
  return r.join(' ');
}

type TagLevel = 'h2' | 'h3' | 'h4';
function Card({ id, tag, cite, k = 'Seth 26', tagRuns, level = 'h4', className, children, big }: { id: string; tag: string; cite: ReactNode; k?: string; tagRuns?: string[]; level?: TagLevel; className?: string; children?: ReactNode; big?: boolean }) {
  return (
    <article className={`card${className ? ' ' + className : ''}`}>
      <Ev as={level} id={id + ':tag'} text={tag} runs={tagRuns ?? []} className={big ? 'tag tag-big' : 'tag'} />
      <p className="cite">{k ? <b className="cite-k">{k}</b> : null}{cite}</p>
      {children}
    </article>
  );
}

function Pocket({ id, word, sub }: { id: string; word: string; sub: string }) {
  return (
    <header className="pocket" id={id}>
      <h2>{word}</h2>
      <p className="pocket-sub">{sub}</p>
    </header>
  );
}

export default function HighlightPage() {
  useVersion('highlight');
  useKeyCut();
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const [first, ...earlier] = notes;
  const [open, setOpen] = useState<string | null>(null);
  const cuts = useCuts();
  const anyCut = Object.keys(cuts).length > 0;

  return (
    <div className="v-highlight">
      <a className="skip-x" href="#main">Skip to the file</a>
      <main id="main">
        {/* ---------- The first card ---------- */}
        <section className="hero" aria-labelledby="name">
          <h1 id="name" className="hero-name"><Ev as="span" id="name" text={PERSON.name} runs={[PERSON.name]} delay={0.35} on={true} /></h1>
          <p className="cite hero-cite"><b className="cite-k">Seth 26</b>{PERSON.line}</p>
          <Ev id="about:0" className="ev-lead" text={PERSON.about[0]} delay={1.1} on={true}
            runs={['it took over', 'an argument about ethics', 'research of my own', 'a skeptic can criticise', 'language using language']} />
          <p className="hint">Drag across any line to cut it yourself. Double-click to clear.<span className="sr-only-x"> With a keyboard, select text and press H.</span></p>
        </section>

        <section className="about" aria-label="About">
          <Card id="about:1" level="h2" tag="The other half is building" tagRuns={['building']} cite={<>Armaan Seth, {PERSON.short.join(' ')}</>} className="about-a">
            <Ev id="about:1:ev" text={PERSON.about[1]} runs={['websites, tools', 'runs my desktop', 'nobody was going to make it', 'it should be free']} />
          </Card>
          <Card id="about:2" level="h2" tag="Also" cite={<>Armaan Seth, {PERSON.home}</>} className="about-b">
            <Ev id="about:2:ev" text={PERSON.aside} runs={['more than sixty students', 'I paint', 'JROTC air rifle']} />
          </Card>
        </section>

        {/* ---------- Debate ---------- */}
        <Pocket id="debate" word="Debate" sub="Two titles, the team, up next" />
        <h3 className="hat">{CHAPTERS.find((c) => c.id === 'debate')!.title}</h3>
        <div className="wins">
          {DEBATE.wins.map((w, i) => {
            const run = i === 0 ? ['Champion in Novice LD', 'Florida Blue Key'] : ['champion in Open LD', 'Wildcat Classic'];
            return (
              <article className="win" key={w.where}>
                <div className="win-top">
                  <Ev as="h4" id={`win:${i}:tag`} text={w.title} runs={[w.title]} className="win-tag" />
                  <p className="win-event">{w.event}<br />{w.where}</p>
                </div>
                <div className="win-foot">
                  <p className="cite"><b className="cite-k">Seth {w.when.slice(2)}</b>{w.where}, {w.when}. Armaan Seth, {w.event}</p>
                  <Ev id={`win:${i}:ev`} text={debateBody} runs={run} className="ev-mid" />
                </div>
              </article>
            );
          })}
        </div>

        <h3 className="hat">{DEBATE.team.name}</h3>
        <article className="team">
          <div className="team-l">
            <Ev as="h4" id="team:tag" text={DEBATE.team.role} runs={['head coach']} className="tag tag-big" />
            <p className="cite"><b className="cite-k">Seth 26</b>Armaan Seth, {DEBATE.team.name}, <a href={DEBATE.team.href}>{host(DEBATE.team.href)}</a></p>
            <a className="go" href={DEBATE.team.href}>Visit {host(DEBATE.team.href)}</a>
          </div>
          <div className="team-r">
            <Ev id="team:line" className="ev-mid" text={DEBATE.team.line} runs={['free, independent', 'Coaches who still compete', 'Middle school through varsity']} />
            <Ev id="team:record" className="ev-mid" text={DEBATE.team.record} runs={['a novice champion', 'top speaker']} />
            <Ev id="team:coach" text={coachBody} runs={['I still compete']} />
          </div>
        </article>

        <h3 className="hat hat-blk">Up next</h3>
        <div className="next">
          {DEBATE.next.map((n, i) => (
            <div className="next-row" key={n.where}>
              <Ev as="h4" id={`next:${i}`} text={n.where} runs={[]} className="blk" />
              <p className="next-event">{n.event}</p>
              <p className="next-empty" aria-hidden="true">Cards to come</p>
            </div>
          ))}
        </div>

        {/* ---------- Today ---------- */}
        <Pocket id="today" word="Today" sub="The daily card" />
        <div className="today">
          <div className="today-date" aria-hidden="true">
            <span className="today-day">{first ? formatDate(first.date, { day: 'numeric' }) : ' '}</span>
            <span className="today-month">{first ? formatDate(first.date, { month: 'long', year: 'numeric' }) : ' '}</span>
          </div>
          <div className="today-main">
            <h3 className="hat">{first ? 'The latest card' : 'Right now'}</h3>
            {first ? (
              <Card id={`note:${first.date}`} tag="Today" tagRuns={['Today']} k={`Seth ${first.date.slice(2, 4)}`} cite={<>Armaan Seth, <time dateTime={first.date}>{formatDate(first.date)}</time></>} className="note-now">
                {first.body.map((p, k) => <Ev key={k} id={`note:${first.date}:${k}`} className="ev-mid" text={p} runs={autoRuns(p)} />)}
              </Card>
            ) : (
              <Card id="note:status" tag={loaded ? 'Right now' : 'Pulling the latest card'} cite="Armaan Seth, right now" className="note-now">
                <Ev id="note:status:ev" className="ev-mid" text={NOW.status} runs={['getting ready', 'behind on stats homework']} />
              </Card>
            )}
            {earlier.length > 0 && (
              <div className="stack">
                <h4 className="stack-h">Earlier cards</h4>
                <ul>
                  {earlier.map((n) => {
                    const isOpen = open === n.date;
                    return (
                      <li key={n.date} className={`sheet${isOpen ? ' is-open' : ''}`}>
                        <button type="button" className="sheet-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : n.date)}>
                          <span className="sheet-date">{formatDate(n.date)}</span>
                          <span className="sheet-cue">{isOpen ? 'Fold' : 'Open'}</span>
                        </button>
                        {isOpen && (
                          <div className="sheet-body">
                            <p className="cite"><b className="cite-k">Seth {n.date.slice(2, 4)}</b>Armaan Seth, <time dateTime={n.date}>{formatDate(n.date)}</time></p>
                            {n.body.map((p, k) => <Ev key={k} id={`note:${n.date}:${k}`} text={p} runs={autoRuns(p)} on={true} />)}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* ---------- Research ---------- */}
        <Pocket id="research" word="Research" sub="One paper, one translation" />
        <h3 className="hat">The paper</h3>
        <article className="paper">
          <div className="paper-main">
            <Ev as="h4" id="paper:tag" text={paper.title} runs={['Not in Mauthner’s Sense']} className="paper-title" />
            <p className="cite"><b className="cite-k">Seth 26</b>Armaan Seth, {paper.status}, {paper.pages} pages. DOI {paper.doi}</p>
            <Ev id="paper:abstract" className="ev-lead" text={paper.abstract}
              runs={['argue that language fails', 'made in language', 'the ladder you climb', 'throw away', 'owes Mauthner far more']} />
            <p className="keys"><span className="keys-h">Keywords</span> {paper.keywords.join(', ')}</p>
          </div>
          <div className="paper-side">
            <h5 className="side-h">Where it lives</h5>
            <ul className="paper-links">
              {paper.links.map((l) => (
                <li key={l.label}><a href={l.href}><span className="pl-label">{l.label}</span><span className="pl-host">{host(l.href).replace(/\?.*$/, '')}</span></a></li>
              ))}
            </ul>
            <h5 className="side-h">Three ladders</h5>
            <ol className="ladders">
              {paper.ladders.map((l) => (
                <li key={l.who}><strong>{l.who}</strong><span className="cite">{l.when}. {l.where}</span></li>
              ))}
            </ol>
          </div>
        </article>
        <div className="paper-after">
          <Card id="epigraph" tag="The line it is named after" k="" cite={paper.epigraph.source} className="epi">
            <Ev id="epigraph:ev" className="ev-mid" text={paper.epigraph.text} runs={['but not at all in Mauthner’s sense']} />
          </Card>
          <Card id="wess" tag={wess.short} tagRuns={[]} k="Seth" cite={<>Armaan Seth, {wess.status}. {wess.title}</>} className="wess">
            <Ev id="wess:ev" text={wess.abstract} runs={['Old High German', 'so I made one']} />
          </Card>
        </div>

        {/* ---------- Work ---------- */}
        <Pocket id="work" word="Work" sub="The evidence is the screenshot" />
        <h3 className="hat">Shipped</h3>
        <div className="work">
          {WORK.map((w, i) => {
            const img = <img src={src(w.img)} alt={`Screenshot of ${w.name}`} loading="lazy" width={1200} height={700} />;
            return (
              <article className={`wk wk-${i}`} key={w.slug}>
                {w.href ? <a className="wk-shot" href={w.href} tabIndex={-1} aria-hidden="true">{img}</a> : <div className="wk-shot">{img}</div>}
                <h4 className="wk-name">{w.href ? <a href={w.href}>{w.name}</a> : w.name}</h4>
                <p className="cite">{w.kind}. {w.stack}{w.href ? <>. {host(w.href)}</> : null}</p>
                <Ev id={`work:${w.slug}`} text={w.line} runs={WORK_RUNS[w.slug] ?? []} />
              </article>
            );
          })}
        </div>

        {/* ---------- GitHub ---------- */}
        <Pocket id="github" word="GitHub" sub="Commits and repositories" />
        <h3 className="hat">Live from GitHub</h3>
        <div className="gh">
          <div className="gh-head">
            <a className="gh-link" href={GITHUB.href}>github.com/{GITHUB.user}</a>
            <p className="cite">
              {gh.live ? (gh.commitsThisMonth !== null ? <>Read live just now. {gh.commitsThisMonth} commits this month</> : <>Read live just now</>) : <>The repositories, cited from the file</>}
            </p>
          </div>
          {gh.activity.length > 0 && (
            <ul className="commits" aria-label="Recent commits">
              {gh.activity.slice(0, 9).map((c, k) => (
                <li key={c.href + k} className="commit">
                  <a href={c.href}>
                    <span className="commit-msg">{c.message}</span>
                    <span className="cite">{c.repo}, {ago(c.at)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          <ul className={`repos${gh.activity.length ? '' : ' repos-solo'}`} aria-label="Repositories">
            {gh.repos.slice(0, gh.activity.length ? 8 : 6).map((r) => (
              <li key={r.name} className="repo">
                <h4 className="repo-name"><a href={r.href}>{r.name}</a></h4>
                <p className="cite">{r.language ?? 'Code'}{r.pushedAt ? <>, pushed {ago(r.pushedAt)}</> : null}</p>
                {r.description ? <Ev id={`repo:${r.name}`} text={r.description} runs={[repoRun(r.description)]} /> : null}
              </li>
            ))}
          </ul>
        </div>

        {/* ---------- Now ---------- */}
        <Pocket id="now" word="Now" sub="Reading, starting, behind on" />
        <h3 className="hat">Lately</h3>
        <div className="now">
          <Card id="now:reading" tag={NOW.reading.title} tagRuns={['literature']} k="" cite={<>Shelves: {NOW.reading.shelves.join(', ')}</>} className="now-a" big>
            <Ev id="now:reading:ev" className="ev-lead" text={NOW.reading.body} runs={['absurdist fiction', 'queer literature', 'the skeptics']} />
          </Card>
          <Card id="now:club" tag={NOW.club.title} cite="Armaan Seth, in the works" className="now-b">
            <Ev id="now:club:ev" text={NOW.club.body} runs={['start a philosophy club']} />
          </Card>
          <Card id="now:status" tag="Status" cite="Armaan Seth, right now" className="now-c">
            <Ev id="now:status:ev" text={NOW.status} runs={['Isidore Newman and DSDS1', 'behind on stats homework']} />
          </Card>
        </div>

        {/* ---------- Record ---------- */}
        <Pocket id="record" word="Record" sub="Honours, and two certificates" />
        <div className="record">
          <div className="honors">
            <h3 className="hat">Honours</h3>
            <ul>
              {HONORS.map((h, i) => (
                <li key={h.what}>
                  <Ev as="span" id={`honor:${i}`} text={h.what} runs={i < 2 ? [h.what.split(',')[0]] : []} className="honor-what" />
                  <span className="cite">{h.detail}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="awards">
            <h3 className="hat">Certificates</h3>
            <div className="awards-row">
              {AWARDS.map((a) => (
                <a className="award" key={a.site} href={a.href}>
                  <img src={src(a.img)} alt={`WD Awards certificate for ${a.site}`} loading="lazy" width={720} height={1018} />
                  <span className="award-tag">{a.site}</span>
                  <span className="cite">{a.note}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ---------- Off the record ---------- */}
        <h2 className="hat hat-off" id="off">Off the record</h2>
        <div className="off">
          {[
            { h: 'Likes', items: LIKES as readonly string[] },
            { h: 'Dislikes', items: DISLIKES as readonly string[] },
            { h: 'Favourites', items: FAVOURITES as readonly string[] },
          ].map((g) => (
            <div className="off-col" key={g.h}>
              <h3 className="blk">{g.h}</h3>
              <ul>{g.items.map((t, k) => <li key={t}><Ev as="span" id={`off:${g.h}:${k}`} text={t} runs={t.startsWith('Plato') ? ['Terrible, terrible frameworks'] : []} /></li>)}</ul>
            </div>
          ))}
          <div className="off-col">
            <h3 className="blk">Courses</h3>
            <ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider}, {c.title}.</strong> {c.note}</li>)}</ul>
          </div>
        </div>

        {/* ---------- The ending ---------- */}
        <ReadAloud anyCut={anyCut} />

        <section className="contact" aria-labelledby="contact-h">
          <h2 className="hat" id="contact-h">Contact</h2>
          <ul>
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="cite">{l.label}</span>
                {l.href ? <a href={l.href}>{l.value}</a> : <span className="contact-plain">{l.value}</span>}
              </li>
            ))}
          </ul>
        </section>
      </main>
      <footer className="foot">
        <p>Draft 13 of the portfolio. Not the live site.</p>
        <p>Set in Carlito. Your highlights stay in this browser.</p>
        {anyCut && <button type="button" className="clear" onClick={clearAll}>Clear my highlights</button>}
      </footer>
    </div>
  );
}

/** Every highlighted run on the page, in order: the file as it would be read in a round. */
function ReadAloud({ anyCut }: { anyCut: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const cuts = useCuts();
  const [runs, setRuns] = useState<string[]>([]);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const read = () => {
      const all: string[] = [];
      document.querySelectorAll<HTMLElement>('.v-highlight [data-ev]').forEach((el) => {
        if (el.closest('.read')) return;
        try { all.push(...(JSON.parse(el.dataset.read || '[]') as string[])); } catch { /* skip */ }
      });
      setRuns(all);
    };
    const t = setTimeout(read, 60);
    const el = ref.current;
    const io = el ? new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { read(); setOn(true); } }, { rootMargin: '0px 0px -20% 0px' }) : null;
    if (el && io) io.observe(el);
    return () => { clearTimeout(t); io?.disconnect(); };
  }, [cuts]);
  const [at, setAt] = useState(-1);
  const total = runs.reduce((n, r) => n + r.split(/\s+/).filter(Boolean).length, 0);
  useEffect(() => {
    if (at < 0) return;
    if (at >= total) { const t = setTimeout(() => setAt(-1), 900); return () => clearTimeout(t); }
    const t = setTimeout(() => setAt((x) => (x < 0 ? x : x + 1)), 150);
    return () => clearTimeout(t);
  }, [at, total]);
  let w = 0;
  return (
    <section className={`read${on ? ' on' : ''}${at >= 0 ? ' playing' : ''}`} ref={ref} aria-labelledby="read-h">
      <div className="read-top">
        <h2 className="read-h" id="read-h">Read aloud</h2>
        <button type="button" className="spread" onClick={() => setAt(at >= 0 ? -1 : 0)} aria-pressed={at >= 0}>{at >= 0 ? 'Stop' : 'Read it at speed'}</button>
      </div>
      <p className="cite"><b className="cite-k">Seth 26</b>Every highlight on this page, in order. {total} words{anyCut ? ', yours included' : ''}.</p>
      <p className="read-text">
        {runs.map((r, k) => (
          <span key={k}>
            <mark className="hl" style={{ transitionDelay: `${Math.min(k * 0.035, 1.8)}s` }}>
              {r.split(/\s+/).filter(Boolean).map((word, j, arr) => {
                const i = w++;
                return <span key={j} className={i === at ? 'at' : i < at ? 'past' : undefined}>{word}{j < arr.length - 1 ? ' ' : ''}</span>;
              })}
            </mark>{' '}
          </span>
        ))}
      </p>
    </section>
  );
}
