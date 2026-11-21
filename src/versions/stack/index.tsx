// Draft 47, The stack. His five chapters arrive as big paper sheets that slide up over each other
// (fancy's StackingCards, remixed in ./Stack.tsx); the numbered edges of the buried sheets stay
// readable and take you back. After the stack, the same paper on the same dark desk.
import { useEffect, useRef, useState } from 'react';
import '@fontsource/dm-serif-display/400.css';
import '@fontsource/dm-serif-display/400-italic.css';
import '@fontsource-variable/hanken-grotesk/wght.css';
import './stack.css';
import { ArrowUpRight } from 'lucide-react';
import { AWARDS, CHAPTERS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, STATS, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { gsap, ScrollTrigger, scrollToId, scrollToY, useGSAP } from '@/lib/scroll';
import type { Note } from '@/lib/notes';
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

// One leaf of the daily pad: the day set huge, the note beside it.
const Leaf = ({ n, latest }: { n: Note; latest: boolean }) => (
  <>
    <p className="st-lday" aria-hidden="true">{formatDate(n.date, { day: 'numeric' })}</p>
    <div className="st-lbody">
      <p className="st-ndate"><time dateTime={n.date}>{formatDate(n.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></p>
      {n.body.map((p, i) => <p key={i} className="st-nbody">{p}</p>)}
      {latest && <p className="st-nlatest">Latest note</p>}
    </div>
  </>
);

// The honours, oldest at the back of the pile; the two titles are the sheet on top.
const PILE = HONORS.slice(2).reverse();
const TOPS = HONORS.slice(0, 2);
// How askew each chapter sheet lies before the stack is squared at the end: x, y, degrees.
const ASKEW = [[-26, -44, -2.4], [30, -33, 1.8], [-16, -22, -1.3], [20, -12, 1.5], [-10, -4, -0.7]];

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
  const [torn, setTorn] = useState<{ from: number; dir: 'off' | 'on' } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [pick, setPick] = useState(2);
  const job = WORK[pick];
  const note = notes[noteAt] ?? notes[0];
  const commits = gh.activity.slice(0, 6);
  const under = Math.min(Math.max(notes.length - 1 - noteAt, 0), 5);
  // Earlier tears the top leaf off the pad; newer lays the torn leaf back on.
  const turn = (to: number) => {
    if (to < 0 || to >= notes.length || to === noteAt) return;
    setTorn(still ? null : { from: noteAt, dir: to > noteAt ? 'off' : 'on' });
    setNoteAt(to);
  };

  // Two scrubbed moments, both made of sheets: the record pile settles as it arrives,
  // and at the end the five chapter sheets are squared into one neat stack.
  useGSAP(() => {
    if (still) return;
    const root = rootRef.current!;
    // Loose sheets sit lower the nearer the top they are, so the gaps only ever close and nothing passes over the heading.
    const pile = root.querySelectorAll<HTMLElement>('.st-ftab, .st-ftop');
    const step = window.innerWidth < 720 ? 8 : 16;
    pile.forEach((el, k) => {
      gsap.fromTo(el, { y: Math.min(k + 1, 9) * step }, { y: 0, ease: 'none', scrollTrigger: { trigger: root.querySelector('.st-file'), start: 'top 95%', end: 'top 40%', scrub: 0.6 } });
    });
    const sheets = root.querySelectorAll<HTMLElement>('[data-sq]');
    sheets.forEach((el, k) => {
      const [x, y, r] = ASKEW[k] ?? [0, 0, 0];
      const f = window.innerWidth < 720 ? 0.45 : 1;
      gsap.fromTo(el, { x: x * f, y, rotate: r * f }, { x: 0, y: 0, rotate: 0, ease: 'power1.out', scrollTrigger: { trigger: root.querySelector('.st-endpile'), start: 'top 95%', end: 'top 30%', scrub: 0.8 } });
    });
  }, { scope: rootRef });
  // Notes and GitHub arrive late and change the page's height: measure the scrubbed moments again.
  useEffect(() => { if (!still) ScrollTrigger.refresh(); }, [notes.length, gh.repos.length, commits.length]);

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
    <div className="v-stack" ref={rootRef}>
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
            <div className="st-pad">
              {Array.from({ length: under }, (_, k) => <div key={k} className="st-pedge" style={{ ['--k' as string]: k + 1 }} aria-hidden="true" />)}
              <div className="st-pback" aria-hidden="true" style={{ ['--k' as string]: under + 1 }} />
              {note ? (
                <article key={'n' + noteAt} className={'st-leaf' + (torn?.dir === 'on' ? ' is-landing' : '')} aria-live="polite" onAnimationEnd={() => setTorn(null)}>
                  <Leaf n={note} latest={noteAt === 0} />
                </article>
              ) : (
                <article className="st-leaf">
                  <div className="st-lbody">
                    <p className="st-ndate">{loaded ? 'Right now' : 'Today'}</p>
                    <p className="st-nbody">{NOW.status}</p>
                  </div>
                </article>
              )}
              {torn?.dir === 'off' && notes[torn.from] && (
                <div key={'t' + torn.from} className="st-leaf is-tearing" aria-hidden="true" onAnimationEnd={() => setTorn(null)}>
                  <Leaf n={notes[torn.from]} latest={torn.from === 0} />
                </div>
              )}
            </div>
            {notes.length > 1 && (
              <div className="st-turns">
                <button type="button" className="st-turn" disabled={noteAt >= notes.length - 1} onClick={() => turn(noteAt + 1)}>
                  <span className="st-pdate">Earlier note</span>
                  <span className="st-tday">{notes[noteAt + 1] ? formatDate(notes[noteAt + 1].date, { day: 'numeric', month: 'long' }) : 'Nothing older'}</span>
                </button>
                <button type="button" className="st-turn" disabled={noteAt === 0} onClick={() => turn(noteAt - 1)}>
                  <span className="st-pdate">Newer note</span>
                  <span className="st-tday">{notes[noteAt - 1] ? formatDate(notes[noteAt - 1].date, { day: 'numeric', month: 'long' }) : 'This is the latest'}</span>
                </button>
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
            <ol className="st-file" style={{ ['--n' as string]: PILE.length }}>
              {PILE.map((h, k) => (
                <li key={h.what} className="st-ftab" style={{ ['--k' as string]: k }}>
                  <span className="st-hw">{h.what}</span><span className="st-hd">{h.detail}</span>
                </li>
              ))}
              {TOPS.map((h) => (
                <li key={h.what} className="st-ftop">
                  <span className="st-ftw">{h.what.split(', ')[0]}</span>
                  <span className="st-fte">{h.what.split(', ')[1]}</span>
                  <span className="st-ftd">{h.detail}</span>
                </li>
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
          <div className="st-off4 st-loose">
            <div><h3 className="st-h3d">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="st-h3d">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="st-h3d">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="st-h3d">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><span className="st-strong">{c.provider} {c.title}</span><br />{c.note}</li>)}</ul></div>
          </div>
        </section>

        <section id="contact" className="st-sec st-end" aria-labelledby="h-contact">
          <div className="st-endpile">
            <ul className="st-again" aria-label="Back to a chapter">
              {ORDER.map((id, i) => (
                <li key={id} style={{ ['--k' as string]: i }} data-sq>
                  <button type="button" className="st-edge" onClick={() => goSheet(i)}>
                    <span className="st-no">{String(i + 1).padStart(2, '0')}</span>
                    <span className="st-elabel">{ch(id).label}</span>
                    <span className="st-etitle">{ch(id).title}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="st-last" data-sq>
              <p className="st-ltab"><span className="st-no">06</span> <span>Contact</span></p>
              <div className="st-lin">
                <h2 id="h-contact" className="st-lh">Write to him</h2>
                <ul className="st-links">
                  {LINKS.map((l) => (
                    <li key={l.label}>
                      <span className="st-ll">{l.label}</span>
                      {l.href ? <Out href={l.href} className="st-lv">{l.value}</Out> : <span className="st-lv st-lv-plain">{l.value}</span>}
                    </li>
                  ))}
                </ul>
                <div className="st-sign">
                  <p className="st-signn">{PERSON.name}</p>
                  <p className="st-signl">{PERSON.line}</p>
                </div>
              </div>
            </div>
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
