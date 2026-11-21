// Draft 79: the why. The skeptic's oldest weapon, the demand for a reason behind every reason, pressed on his own life.
// Every answer is his own sentence from content.ts. Step mechanics remixed from the React Bits Stepper (see Chain.tsx).
import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';
import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/fraunces/full-italic.css';
import '@fontsource-variable/instrument-sans/index.css';
import './why.css';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { ago, useGitHub } from '@/lib/github';
import { formatDate, useNotes } from '@/lib/notes';
import { gsap, scrollToId, scrollToY, ScrollTrigger } from '@/lib/scroll';
import { still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import Chain, { depthVar } from './Chain';
import meta from './meta';

const BASE = import.meta.env.BASE_URL;
const PAPER = RESEARCH[0] as (typeof RESEARCH)[0] & { epigraph: { text: string; source: string }; keywords: string[]; ladders: { who: string; when: string; where: string }[] };
const WESSO = RESEARCH[1];
const sentences = (t: string) => t.split(/(?<=[.?])\s+/);
const A0 = sentences(PERSON.about[0]);
const A1 = sentences(PERSON.about[1]);
const HERO = [
  { ask: 'Why?', text: `${A0[0]} ${A0[1]}` },
  { ask: 'Why?', text: A0[2] },
  { ask: 'Why?', text: sentences(PAPER.abstract)[0] },
];
const BUILD = [
  { ask: 'Why?', text: A1[2] },
  { ask: 'Why free?', text: A1[3] },
];
const host = (href: string) => href.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const OFFSET = [0, 1, 2, 1, 0, 1, 2, 1];

/** One step of the page: a mark in the left column, the content indented to its depth. */
function Row({ d = 0, as: As = 'div', className = '', children, id }: { d?: number; as?: ElementType; className?: string; children: ReactNode; id?: string }) {
  return (
    <As className={`rw ${className}`} style={depthVar(d)} id={id}>
      <span className="tick" aria-hidden="true" />
      <div className="rw-b">{children}</div>
    </As>
  );
}

function Debate() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (still || !ref.current) return;
    const rail = ref.current.querySelector('.dv-rail');
    const tw = gsap.fromTo(rail, { scaleY: 0.04 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top 75%', end: 'bottom 70%', scrub: 0.6 } });
    return () => { tw.scrollTrigger?.kill(); tw.kill(); };
  }, []);
  const t = DEBATE.team;
  return (
    <section id="debate" className="dv" ref={ref} aria-labelledby="debate-h">
      <span className="dv-rail" aria-hidden="true" />
      <div className="wrap">
        <Row><h2 id="debate-h" className="h2">Why does he coach?</h2></Row>
        {DEBATE.wins.map((w, i) => (
          <Row key={w.where} d={i} className="win">
            <h3 className="champ">{w.title}</h3>
            <p className="win-m">
              <span>{w.event}</span>
              <span>{w.where}</span>
              <span>{w.when}</span>
            </p>
          </Row>
        ))}
        <Row d={2} className="team">
          <p className="lab">{t.role}</p>
          <h3 className="team-n">{t.name}</h3>
          <p className="txt">{t.line}</p>
          <p className="txt mute">{t.record}</p>
          <a className="go" href={t.href} rel="noopener">{host(t.href)}</a>
        </Row>
        <Row d={3} className="next">
          <h3 className="lab">Up next</h3>
          <ul>
            {DEBATE.next.map((n) => (
              <li key={n.where}><span className="next-w">{n.where}</span> <span className="mute">{n.event}</span></li>
            ))}
          </ul>
        </Row>
      </div>
    </section>
  );
}

function Research() {
  return (
    <section id="research" className="sec" aria-labelledby="research-h">
      <div className="wrap">
        <Row><h2 id="research-h" className="h2">The paper</h2></Row>
        <Row>
          <h3 className="r-title">{PAPER.title}</h3>
          <p className="lab">{PAPER.status}, {PAPER.pages} pages, DOI {PAPER.doi}</p>
        </Row>
        <Row d={1}>
          <blockquote className="epi">
            <p>{PAPER.epigraph.text}</p>
            <footer className="lab">{PAPER.epigraph.source}</footer>
          </blockquote>
        </Row>
        <Row d={1}>
          <p className="txt big">{PAPER.abstract}</p>
          <ul className="kw" aria-label="Keywords">{PAPER.keywords.map((k) => <li key={k}>{k}</li>)}</ul>
        </Row>
        <div className="ladders">
          <Row d={1}><h4 className="lab">The ladder, three times</h4></Row>
          {PAPER.ladders.map((l, i) => (
            <Row key={l.who} d={1 + i} className="ld">
              <p className="ld-w">{l.who}</p>
              <p className="mute">{l.when}. {l.where}</p>
            </Row>
          ))}
        </div>
        <Row d={1}>
          <ul className="plinks">
            {PAPER.links.map((l) => <li key={l.label}><a href={l.href} rel="noopener">{l.label}</a></li>)}
          </ul>
        </Row>
        <Row d={2} className="wesso">
          <h3 className="h3">{WESSO.title}</h3>
          <p className="lab">{WESSO.status}</p>
          <p className="txt">{WESSO.abstract}</p>
        </Row>
      </div>
    </section>
  );
}

function Building() {
  const [d, setD] = useState(0);
  return (
    <section id="building" className="sec" aria-labelledby="building-h">
      <div className="wrap">
        <Row><h2 id="building-h" className="h2">Building</h2></Row>
        <Chain id="build" size="body" level={3} depth={d} setDepth={setD} answers={BUILD} claim={<p className="ch-a">{A1[0]} {A1[1]}</p>} />
        <ul className="works">
          {WORK.map((w, i) => (
            <li key={w.slug} className="wk" style={{ '--o': OFFSET[i] } as CSSProperties}>
              <div className="wk-img">
                <img src={BASE + w.img} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={680} />
              </div>
              <div className="wk-t">
                <p className="lab">{w.kind}</p>
                <h3 className="h3">{w.name}</h3>
                <p className="txt">{w.line}</p>
                <p className="mute small">{w.stack}</p>
                {w.href && <a className="go" href={w.href} rel="noopener">{host(w.href)}</a>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function GitHub() {
  const gh = useGitHub();
  const commits = gh.activity.slice(0, 6);
  return (
    <section id="github" className="sec" aria-labelledby="github-h">
      <div className="wrap">
        <Row>
          <h2 id="github-h" className="h2">Live from GitHub</h2>
          <p className="mute">
            {gh.live && gh.commitsThisMonth !== null ? `${gh.commitsThisMonth} commits pushed this month. ` : ''}
            Where the building happens, in public.
          </p>
        </Row>
        <div className={`gh ${commits.length ? 'gh-two' : ''}`}>
          <ul className="repos">
            {gh.repos.slice(0, 6).map((r) => (
              <Row key={r.name} as="li" d={1} className="repo">
                <a className="repo-n" href={r.href} rel="noopener">{r.name}</a>
                {r.description && <p className="txt">{r.description}</p>}
                <p className="mute small">{[r.language, r.pushedAt ? `pushed ${ago(r.pushedAt)}` : ''].filter(Boolean).join(', ')}</p>
              </Row>
            ))}
          </ul>
          {commits.length > 0 && (
            <div className="commits">
              <Row d={1}><h3 className="lab">Latest commits</h3></Row>
              <ul>
                {commits.map((c) => (
                  <Row key={c.href} as="li" d={2} className="cm it">
                    <a href={c.href} rel="noopener" className="cm-m">{c.message}</a>
                    <p className="mute small">{c.repo}, {ago(c.at)}</p>
                  </Row>
                ))}
              </ul>
            </div>
          )}
        </div>
        <Row d={1}><a className="go" href={GITHUB.href} rel="noopener">{host(GITHUB.href)}</a></Row>
      </div>
    </section>
  );
}

function Today() {
  const { notes, loaded } = useNotes();
  const [sel, setSel] = useState(0);
  const note = notes[sel];
  return (
    <section id="today" className="sec" aria-labelledby="today-h">
      <div className="wrap">
        <Row><h2 id="today-h" className="h2">Today</h2></Row>
        <div className="today">
          <Row d={1} className="note">
            {!loaded ? (
              <p className="note-d">Fetching today&rsquo;s note</p>
            ) : note ? (
              <>
                <p className="note-d"><time dateTime={note.date}>{formatDate(note.date)}</time>{sel === 0 ? ', the latest' : ''}</p>
                <div aria-live="polite">{note.body.map((p, i) => <p key={i} className="note-b">{p}</p>)}</div>
              </>
            ) : (
              <>
                <p className="note-d">No note posted yet</p>
                <p className="note-b">{NOW.status}</p>
              </>
            )}
          </Row>
          {notes.length > 1 && (
            <Row d={1} className="earlier">
              <h3 className="lab">Every note</h3>
              <ul>
                {notes.slice(0, 12).map((n, i) => (
                  <li key={n.date}>
                    <button type="button" aria-pressed={i === sel} onClick={() => setSel(i)}>
                      {formatDate(n.date)}
                    </button>
                  </li>
                ))}
              </ul>
            </Row>
          )}
        </div>
      </div>
    </section>
  );
}

function Contact({ round }: { round: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(still);
  useEffect(() => {
    if (still || !ref.current) return;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { threshold: 0.6 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <section id="contact" className="sec end" aria-labelledby="contact-h">
      <div className="wrap">
        <Row><h2 id="contact-h" className="h2">Contact</h2></Row>
        <div className="end-g">
          <div className="circ" ref={ref} data-on={on ? '' : undefined} aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => <span key={i} style={{ '--i': i } as CSSProperties} />)}
          </div>
          <ul className="links">
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="lab">{l.label}</span>
                {l.href ? <a href={l.href} rel="noopener">{l.value}</a> : <span className="lv">{l.value}</span>}
              </li>
            ))}
          </ul>
        </div>
        <div className="end-why">
          <button type="button" className="why" onClick={round}>Why?</button>
          <p className="mute">Back to the first claim, and round again.</p>
        </div>
      </div>
    </section>
  );
}

export default function Why() {
  useVersion('why');
  const [depth, setDepth] = useState(0);
  const whyRef = useRef<HTMLButtonElement>(null);
  const round = () => {
    setDepth(0);
    scrollToY(0, still);
    setTimeout(() => whyRef.current?.focus({ preventScroll: true }), 60);
  };
  useEffect(() => { ScrollTrigger.refresh(); }, [depth]);

  const exits = (
    <>
      <p className="ch-a">His reasons run out here.</p>
      <div className="exits">
        <button type="button" onClick={() => scrollToId('research')}>Stop here.</button>
        <button type="button" onClick={() => { setDepth(0); setTimeout(() => whyRef.current?.focus({ preventScroll: true }), 60); }}>Go round again.</button>
        <button type="button" onClick={() => scrollToId('debate')}>Keep asking.</button>
      </div>
    </>
  );

  return (
    <div className="v-why">
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="top wrap">
        <nav aria-label="Sections">
          <ul>
            {[['about', 'About'], ['debate', 'Debate'], ['research', 'Research'], ['building', 'Building'], ['today', 'Today'], ['contact', 'Contact']].map(([id, label]) => (
              <li key={id}><a href={`#${id}`}>{label}</a></li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main">
        <section className="hero" aria-labelledby="name">
          <div className="wrap">
            <h1 id="name" className="name">{PERSON.name}</h1>
            <Chain id="why" size="hero" level={2} depth={depth} setDepth={setDepth} answers={HERO} end={exits} whyRef={whyRef} claim={<p className="claim">{PERSON.line}</p>} />
          </div>
        </section>

        <section id="about" className="sec" aria-labelledby="about-h">
          <div className="wrap">
            <Row><h2 id="about-h" className="h2">In his own words</h2></Row>
            <Row d={1}><p className="txt big">{PERSON.about[0]}</p></Row>
            <Row d={2}><p className="txt big">{PERSON.about[1]}</p></Row>
            <Row d={3}><p className="txt mute">{PERSON.aside}</p></Row>
          </div>
        </section>

        <Debate />
        <Research />
        <Building />
        <GitHub />
        <Today />

        <section id="now" className="sec" aria-labelledby="now-h">
          <div className="wrap">
            <Row><h2 id="now-h" className="h2">Now</h2></Row>
            <Row d={1}><p className="status">{NOW.status}</p></Row>
            <div className="now-g">
              <Row d={1}>
                <h3 className="h3">{NOW.reading.title}</h3>
                <p className="txt">{NOW.reading.body}</p>
                <ul className="shelves">
                  {NOW.reading.shelves.map((s, i) => <li key={s} style={{ '--i': i } as CSSProperties}>{s}</li>)}
                </ul>
              </Row>
              <Row d={1}>
                <h3 className="h3">{NOW.club.title}</h3>
                <p className="txt">{NOW.club.body}</p>
              </Row>
            </div>
          </div>
        </section>

        <section id="record" className="sec" aria-labelledby="record-h">
          <div className="wrap">
            <Row><h2 id="record-h" className="h2">Record</h2></Row>
            <div className="rec">
              <ul className="honors">
                {HONORS.map((h, i) => (
                  <Row key={h.what} as="li" d={i < 2 ? 1 : 2} className="hon it">
                    <p className="hon-w">{h.what}</p>
                    <p className="mute small">{h.detail}</p>
                  </Row>
                ))}
              </ul>
              <ul className="certs">
                {AWARDS.map((a) => (
                  <li key={a.site}>
                    <a href={a.href} rel="noopener">
                      <img src={BASE + a.img} alt={`Certificate: ${a.site}`} loading="lazy" width={720} height={1018} />
                      <span className="cert-n">{a.site}</span>
                      <span className="mute small">{a.note}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="off" className="sec" aria-labelledby="off-h">
          <div className="wrap">
            <Row><h2 id="off-h" className="h2">Off the record</h2></Row>
            <div className="off">
              {([['Likes', LIKES], ['Dislikes', DISLIKES], ['Favourites', FAVOURITES]] as const).map(([t, list]) => (
                <div key={t} className="off-c">
                  <Row d={1}><h3 className="lab">{t}</h3></Row>
                  <ul>{list.map((x) => <Row key={x} as="li" d={2} className="it"><p className="txt">{x}</p></Row>)}</ul>
                </div>
              ))}
              <div className="off-c">
                <Row d={1}><h3 className="lab">Courses</h3></Row>
                <ul>
                  {COURSES.map((c) => (
                    <Row key={c.title} as="li" d={2} className="it">
                      <p className="txt">{c.provider} {c.title}</p>
                      <p className="mute small">{c.note}</p>
                    </Row>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <Contact round={round} />
      </main>
      <footer className="ft wrap">
        <p>Draft {meta.n} of the portfolio. Not the live site.</p>
        <p className="mute">Step mechanics adapted from the React Bits Stepper. Set in Fraunces and Instrument Sans.</p>
      </footer>
    </div>
  );
}
