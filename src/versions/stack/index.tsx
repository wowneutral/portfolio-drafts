// Draft 47, The stack. His five chapters arrive as big paper sheets that slide up over each other
// (fancy's StackingCards, remixed in ./Stack.tsx); the numbered edges of the buried sheets stay
// readable and take you back. After the stack, the same paper on the same dark desk.
import { useRef, useState } from 'react';
import '@fontsource/dm-serif-display/400.css';
import '@fontsource/dm-serif-display/400-italic.css';
import '@fontsource-variable/hanken-grotesk/wght.css';
import './stack.css';
import { ArrowUpRight } from 'lucide-react';
import { AWARDS, CHAPTERS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, STATS, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { scrollToId, scrollToY } from '@/lib/scroll';
import { still } from '@/lib/utils';
import StackingCards, { StackingCardItem } from './Stack';

const src = (p: string) => import.meta.env.BASE_URL + p;
const ch = (id: (typeof CHAPTERS)[number]['id']) => CHAPTERS.find((c) => c.id === id)!;
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[] };
const wess = RESEARCH[1];
const skep = WORK.find((w) => w.slug === 'skeptical')!;
const mitez = WORK.find((w) => w.slug === 'mitez')!;
const mentored = STATS[0];
const ORDER = ['debate', 'coach', 'mitez', 'research', 'builds'] as const;

const Out = ({ href, children, className = 'st-link' }: { href: string; children: React.ReactNode; className?: string }) => (
  <a className={className} href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">
    <span>{children}</span>
    <ArrowUpRight aria-hidden="true" className="st-arrow" size={18} strokeWidth={2} />
  </a>
);

const NAV = [
  ['about', 'About'],
  ['today', 'Today'],
  ['github', 'GitHub'],
  ['record', 'Record'],
  ['contact', 'Contact'],
] as const;

export default function StackPage() {
  useVersion('stack');
  const stackRef = useRef<HTMLDivElement>(null);
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const [noteAt, setNoteAt] = useState(0);
  const [pick, setPick] = useState(2);
  const job = WORK[pick];
  const note = notes[noteAt] ?? notes[0];
  const commits = gh.activity.slice(0, 6);

  // Bring a buried sheet back: scroll to the moment it arrived on the stack.
  const goSheet = (i: number) => {
    const el = stackRef.current;
    if (!el) return;
    const item = el.querySelectorAll<HTMLElement>('.st-item')[i];
    if (still) { item.scrollIntoView(); return; }
    const top = el.getBoundingClientRect().top + window.scrollY;
    scrollToY(top + i * item.offsetHeight);
  };

  const Tab = ({ i }: { i: number }) => {
    const c = ch(ORDER[i]);
    return (
      <button type="button" className="st-tab" onClick={() => goSheet(i)}>
        <span className="st-no">{String(i + 1).padStart(2, '0')}</span>
        <span className="st-tlabel">{c.label}</span>
        <span className="st-ttitle">{c.title}</span>
      </button>
    );
  };

  const go = (id: string) => (e: React.MouseEvent) => { e.preventDefault(); scrollToId(id); };

  return (
    <div className="v-stack">
      <a className="skip-x" href="#main">Skip to content</a>

      <header className="st-head">
        <div className="st-id">
          <h1 className="st-name">{PERSON.name}</h1>
          <p className="st-line">{PERSON.line}</p>
        </div>
        <nav className="st-nav" aria-label="Sections">
          <ul>
            {NAV.map(([id, label]) => (
              <li key={id}><a href={'#' + id} onClick={go(id)}>{label}</a></li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main">
        <StackingCards className="st-stack" totalCards={5}>
          <div ref={stackRef} className="st-stackin">
            {/* 01 Debate */}
            <StackingCardItem index={0} className="st-item">
              <section className="st-sheet st-s0" data-sheet aria-labelledby="h-debate">
                <Tab i={0} />
                <div className="st-body">
                  <h2 id="h-debate" className="st-h2" data-f>{ch('debate').title}</h2>
                  <ul className="st-wins">
                    {DEBATE.wins.map((w) => (
                      <li key={w.where} className="st-win" data-f>
                        <p className="st-win-t">{w.title}</p>
                        <p className="st-win-e">{w.event}</p>
                        <p className="st-win-w">{w.where}, {w.when}</p>
                      </li>
                    ))}
                  </ul>
                  <div className="st-foot0">
                    <p className="st-copy st-hide-s" data-f>{ch('debate').body}</p>
                    <div className="st-next" data-f>
                      <h3 className="st-h3">Up next</h3>
                      <ul>
                        {DEBATE.next.map((n) => (
                          <li key={n.where}><span className="st-strong">{n.where}</span> <span>{n.event}</span></li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </section>
            </StackingCardItem>

            {/* 02 Coaching */}
            <StackingCardItem index={1} className="st-item">
              <section className="st-sheet st-s1" data-sheet aria-labelledby="h-coach">
                <Tab i={1} />
                <div className="st-body st-split">
                  <div className="st-col">
                    <h2 id="h-coach" className="st-h2" data-f>{DEBATE.team.name}</h2>
                    <p className="st-role" data-f>{DEBATE.team.role}</p>
                    <p className="st-copy" data-f>{DEBATE.team.line}</p>
                    <p className="st-copy st-quiet" data-f>{DEBATE.team.record}</p>
                    <p data-f><Out href={DEBATE.team.href}>skeptical.pages.dev</Out></p>
                  </div>
                  <figure className="st-shot" data-f>
                    <img src={src(skep.img)} alt="The Skeptical team site" loading="lazy" />
                  </figure>
                </div>
              </section>
            </StackingCardItem>

            {/* 03 Nonprofit */}
            <StackingCardItem index={2} className="st-item">
              <section className="st-sheet st-s2" data-sheet aria-labelledby="h-mitez">
                <Tab i={2} />
                <div className="st-body st-split st-flip">
                  <div className="st-big" data-f>
                    <p className="st-bign">{mentored.to}{mentored.suffix}</p>
                    <p className="st-bigl">{mentored.label}</p>
                  </div>
                  <div className="st-col">
                    <h2 id="h-mitez" className="st-h2" data-f>{ch('mitez').title}</h2>
                    <p className="st-copy st-lead" data-f>{ch('mitez').body}</p>
                    <p className="st-copy st-quiet" data-f>{mitez.line}</p>
                    <div className="st-mshot" data-f>
                      <img src={src(mitez.img)} alt="The opening screen of mitez.org" loading="lazy" />
                      <Out href={mitez.href}>mitez.org</Out>
                    </div>
                  </div>
                </div>
              </section>
            </StackingCardItem>

            {/* 04 Research */}
            <StackingCardItem index={3} className="st-item">
              <section className="st-sheet st-s3" data-sheet aria-labelledby="h-research">
                <Tab i={3} />
                <div className="st-body st-paper">
                  <div className="st-col">
                    <h2 id="h-research" className="st-h2" data-f>{ch('research').title}</h2>
                    <p className="st-ptitle" data-f>{paper.title}</p>
                    <p className="st-status" data-f>{paper.status}</p>
                    <ul className="st-plinks" data-f>
                      {paper.links.map((l) => <li key={l.label}><Out href={l.href}>{l.label}</Out></li>)}
                    </ul>
                  </div>
                  <div className="st-col">
                    <h3 className="st-h3" data-f>Abstract</h3>
                    <p className="st-copy" data-f>{paper.abstract}</p>
                    <ul className="st-kw" aria-label="Keywords" data-f>
                      {paper.keywords.map((k) => <li key={k}>{k}</li>)}
                    </ul>
                    <div className="st-wess" data-f>
                      <h3 className="st-wt">{wess.title}</h3>
                      <p className="st-status">{wess.status}</p>
                      <p className="st-copy st-quiet st-hide-s">{wess.abstract}</p>
                    </div>
                  </div>
                </div>
              </section>
            </StackingCardItem>

            {/* 05 Building */}
            <StackingCardItem index={4} className="st-item">
              <section className="st-sheet st-s4" data-sheet aria-labelledby="h-builds">
                <Tab i={4} />
                <div className="st-body st-builds">
                  <div className="st-btop">
                    <div className="st-col">
                      <h2 id="h-builds" className="st-h2">{ch('builds').title}</h2>
                      <p className="st-copy st-hide-s">{ch('builds').body}</p>
                    </div>
                    <div className="st-job" aria-live="polite">
                      <p className="st-jobk"><span className="st-no">{job.n}</span> {job.kind}</p>
                      <h3 className="st-jobn">{job.name}</h3>
                      <p className="st-copy">{job.line}</p>
                      <p className="st-jobs">{job.stack}</p>
                      {job.href ? <Out href={job.href}>{job.href.replace(/^https:\/\//, '').replace(/\/$/, '')}</Out> : <p className="st-jobs st-private">No public link</p>}
                    </div>
                  </div>
                  <ul className="st-strip">
                    {WORK.map((w, i) => (
                      <li key={w.slug}>
                        <button type="button" className="st-thumb" aria-pressed={i === pick} onClick={() => setPick(i)} onMouseEnter={() => setPick(i)} onFocus={() => setPick(i)}>
                          <img src={src(w.img)} alt="" loading="lazy" />
                          <span className="st-thumbn">{w.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </StackingCardItem>
            {!still && <div className="st-rest" aria-hidden="true" />}
          </div>
        </StackingCards>

        {/* After the stack: the same paper on the same desk. */}
        <section id="about" className="st-sec st-about" aria-labelledby="h-about">
          <h2 id="h-about" className="st-h2d">About</h2>
          <div className="st-aboutp">
            {PERSON.about.map((p) => <p key={p.slice(0, 12)}>{p}</p>)}
            <p className="st-aside">{PERSON.aside}</p>
          </div>
        </section>

        <section id="today" className="st-sec st-today" aria-labelledby="h-today">
          <div className="st-dhead">
            <h2 id="h-today" className="st-h2d">Today</h2>
            <p className="st-dsub">His daily note, newest on top.</p>
          </div>
          <div className="st-desk">
            <article className="st-note" aria-live="polite">
              {note ? (
                <>
                  <p className="st-ndate"><time dateTime={note.date}>{formatDate(note.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></p>
                  {note.body.map((p, i) => <p key={i} className="st-nbody">{p}</p>)}
                  {noteAt === 0 && <p className="st-nlatest">Latest note</p>}
                </>
              ) : (
                <>
                  <p className="st-ndate">{loaded ? 'Right now' : 'Today'}</p>
                  <p className="st-nbody">{NOW.status}</p>
                </>
              )}
            </article>
            {notes.length > 1 && (
              <div className="st-pile">
                <h3 className="st-h3d">Earlier notes</h3>
                <ul>
                  {notes.map((n, i) => (
                    <li key={n.date} style={{ ['--k' as string]: i }}>
                      <button type="button" className="st-pnote" aria-pressed={i === noteAt} onClick={() => setNoteAt(i)}>
                        <span className="st-pdate">{formatDate(n.date, { day: 'numeric', month: 'short' })}</span>
                        <span className="st-pfirst">{n.body[0]}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        <section id="github" className="st-sec st-gh" aria-labelledby="h-gh">
          <div className="st-dhead">
            <h2 id="h-gh" className="st-h2d">Live from GitHub</h2>
            <p className="st-dsub">{gh.live ? 'Read from GitHub as you opened this page.' : 'What he keeps in the open.'}</p>
          </div>
          <div className={'st-ghgrid' + (commits.length ? '' : ' is-quiet')}>
            {commits.length > 0 && (
              <div className="st-ledger">
                <h3 className="st-h3">Recent commits</h3>
                <ol>
                  {commits.map((c) => (
                    <li key={c.href}>
                      <a href={c.href} target="_blank" rel="noreferrer" className="st-commit">
                        <span className="st-cmsg">{c.message}</span>
                        <span className="st-cmeta">{c.repo}, {ago(c.at)}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <div className="st-repos">
              <h3 className="st-h3d">Repositories</h3>
              <ul>
                {gh.repos.slice(0, 6).map((r) => (
                  <li key={r.name}>
                    <a href={r.href} target="_blank" rel="noreferrer" className="st-repo">
                      <span className="st-rname">{r.name}</span>
                      {r.description && <span className="st-rdesc">{r.description}</span>}
                      {r.language && <span className="st-rlang">{r.language}</span>}
                    </a>
                  </li>
                ))}
              </ul>
              <p><Out href={GITHUB.href} className="st-link st-link-d">github.com/{GITHUB.user}</Out></p>
            </div>
          </div>
        </section>

        <section id="now" className="st-sec st-now" aria-labelledby="h-now">
          <h2 id="h-now" className="st-h2d">Now</h2>
          <div className="st-now3">
            <div>
              <h3 className="st-h3d">{NOW.reading.title}</h3>
              <p>{NOW.reading.body}</p>
              <ul className="st-shelves">
                {NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
            <div>
              <h3 className="st-h3d">{NOW.club.title}</h3>
              <p>{NOW.club.body}</p>
            </div>
            <div>
              <h3 className="st-h3d">Status</h3>
              <p>{NOW.status}</p>
            </div>
          </div>
        </section>

        <section id="record" className="st-sec st-record" aria-labelledby="h-record">
          <h2 id="h-record" className="st-h2d">Record</h2>
          <div className="st-recgrid">
            <ol className="st-honors">
              {HONORS.map((h) => (
                <li key={h.what}><span className="st-hw">{h.what}</span><span className="st-hd">{h.detail}</span></li>
              ))}
            </ol>
            <div className="st-awards">
              <ul className="st-certs">
                {AWARDS.map((a) => (
                  <li key={a.site}>
                    <a href={a.href} target="_blank" rel="noreferrer" className="st-cert">
                      <img src={src(a.img)} alt={`WD Awards certificate for ${a.site}`} loading="lazy" />
                      <span className="st-certn">{a.site}</span>
                      <span className="st-certd">{a.note}</span>
                    </a>
                  </li>
                ))}
              </ul>
              <ul className="st-stats">
                {STATS.map((s) => (
                  <li key={s.label}><span className="st-statn">{s.to}{s.suffix}</span><span>{s.label}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="st-sec st-off" aria-labelledby="h-off">
          <h2 id="h-off" className="st-h2d st-h2s">Off the record</h2>
          <div className="st-off4">
            <div><h3 className="st-h3d">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="st-h3d">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="st-h3d">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="st-h3d">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><span className="st-strong">{c.provider} {c.title}</span><br />{c.note}</li>)}</ul></div>
          </div>
        </section>

        <section id="contact" className="st-sec st-contact" aria-labelledby="h-contact">
          <h2 id="h-contact" className="st-h2d">Write to him</h2>
          <ul className="st-links">
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="st-ll">{l.label}</span>
                {l.href ? <Out href={l.href} className="st-lv">{l.value}</Out> : <span className="st-lv st-lv-plain">{l.value}</span>}
              </li>
            ))}
          </ul>
          <div className="st-again">
            <h3 className="st-h3d">Back to a chapter</h3>
            <ul>
              {ORDER.map((id, i) => (
                <li key={id} style={{ ['--k' as string]: i }}>
                  <button type="button" className="st-edge" onClick={() => goSheet(i)}>
                    <span className="st-no">{String(i + 1).padStart(2, '0')}</span>
                    <span>{ch(id).title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="st-footer">
        <p>Draft 47 of the portfolio. Not the live site.</p>
        <p>The stacking cards are remixed from StackingCards by Khoa Phan, in fancy by Daniel Petho (MIT licence).</p>
      </footer>
    </div>
  );
}
