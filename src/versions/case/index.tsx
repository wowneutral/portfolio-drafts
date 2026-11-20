// Draft 29: the case. Every LD round runs on a case built the same way: a framework, numbered
// contentions with bold tags and lettered subpoints, and at the end the voters. This page is his.
// Type carries everything. The one text motion: each voter's tag grows, once, from body size to
// the biggest type on the page, the way a last speech makes one line enormous.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import { ArrowUpRight, ArrowDown, ArrowRight } from 'lucide-react';
import './case.css';
import { AWARDS, CHAPTERS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { ago, useGitHub } from '@/lib/github';
import { formatDate, useNotes } from '@/lib/notes';
import { scrollToId } from '@/lib/scroll';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';

const BASE = import.meta.env.BASE_URL;
const PAPER = RESEARCH[0], WESSO = RESEARCH[1];
const MITEZ = CHAPTERS.find((c) => c.id === 'mitez')!;
const clean = (t: string | null | undefined) => (t ?? '').replace(/\s*[–—]\s*/g, ', ');
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/\/$/, '');
const LETTER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// The parts of the case, in the order they are read. The outline in the rail follows these.
const PARTS = [
  { id: 'framework', label: 'Framework', tag: 'Judge him by the work.' },
  { id: 'c1', label: 'Contention one', tag: 'He debates.', n: '1' },
  { id: 'c2', label: 'Contention two', tag: 'He writes.', n: '2' },
  { id: 'c3', label: 'Contention three', tag: 'He builds.', n: '3' },
  { id: 'c4', label: 'Contention four', tag: 'He writes every day.', n: '4' },
  { id: 'underview', label: 'Underview', tag: 'Right now.' },
  { id: 'voters', label: 'Voters', tag: 'Two reasons to decide.' },
] as const;

function go(e: React.MouseEvent, id: string) {
  e.preventDefault();
  scrollToId(id, -24);
}

const Out = ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
  <a className={className ?? 'cv-out'} href={href} rel="noopener">
    <span>{children}</span>
    <ArrowUpRight aria-hidden="true" size={18} strokeWidth={2} />
  </a>
);

/** A contention (or framework, underview): its number line in oxblood, then the tag. */
function Part({ i, children }: { i: number; children: ReactNode }) {
  const p = PARTS[i];
  return (
    <section className="cv-part" id={p.id} data-part={i} aria-labelledby={`${p.id}-h`}>
      <h2 className="cv-h2" id={`${p.id}-h`} data-sp={`${i}||`}>
        <span className="cv-cn">{p.label}</span>
        <span className="cv-tag">{p.tag}</span>
      </h2>
      {children}
    </section>
  );
}

/** A lettered subpoint, hung in the indent. */
function Sub({ part, at, tag, children, wide }: { part: number; at: number; tag: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className={'cv-sub' + (wide ? ' is-wide' : '')} data-sp={`${part}|${LETTER[at]}|${typeof tag === 'string' ? tag : ''}`}>
      <h3 className="cv-h3"><span className="cv-sl">{LETTER[at]}</span>{' '}{tag}</h3>
      <div className="cv-ev">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ the signpost rail */

function Rail() {
  const [at, setAt] = useState({ part: 0, sub: '', tag: '' });
  const listRef = useRef<HTMLOListElement>(null);
  const [mark, setMark] = useState({ y: 0, h: 0 });

  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const line = innerHeight * 0.34;
      let best: HTMLElement | null = null;
      document.querySelectorAll<HTMLElement>('.v-case [data-sp]').forEach((el) => { if (el.getBoundingClientRect().top < line) best = el; });
      if (!best) { setAt((a) => (a.part === 0 && !a.sub ? a : { part: 0, sub: '', tag: '' })); return; }
      const [p, s, t] = (best as HTMLElement).dataset.sp!.split('|');
      const part = +p;
      setAt((a) => (a.part === part && a.sub === s && a.tag === t ? a : { part, sub: s, tag: t }));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    addEventListener('scroll', on, { passive: true });
    addEventListener('resize', on);
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, []);

  useLayoutEffect(() => {
    const li = listRef.current?.children[at.part] as HTMLElement | undefined;
    if (li) setMark({ y: li.offsetTop, h: li.offsetHeight });
  }, [at.part]);

  const p = PARTS[at.part];
  return (
    <aside className="cv-rail" aria-label="Where you are in the case">
      <div className="cv-rail-in">
        <p className="cv-sign">
          <span className="cv-sign-part">{p.label}</span>
          <span className="cv-sign-sub">{at.sub ? `Subpoint ${at.sub}` : p.tag}</span>
          <span className="cv-sign-tag">{at.sub ? at.tag || ' ' : ' '}</span>
        </p>
        <nav aria-label="Case outline">
          <ol className="cv-flow" ref={listRef}>
            {PARTS.map((q, i) => (
              <li key={q.id} className={i < at.part ? 'is-done' : i === at.part ? 'is-now' : ''}>
                <a href={`#${q.id}`} onClick={(e) => go(e, q.id)} aria-current={i === at.part ? 'location' : undefined}>
                  <span className="cv-flow-n">{'n' in q ? q.n : ''}</span>
                  <span>{q.label}</span>
                  {i < at.part && <ArrowRight className="cv-flow-x" aria-hidden="true" size={15} strokeWidth={2.4} />}
                </a>
              </li>
            ))}
            <li className="cv-flow-mark" aria-hidden="true" style={{ transform: `translateY(${mark.y}px)`, height: mark.h }} />
          </ol>
        </nav>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ live from GitHub */

function GitHubEvidence() {
  const gh = useGitHub();
  const commits = gh.activity.slice(0, 6);
  return (
    <>
      {commits.length > 0 && (
        <ol className="cv-gh-commits">
          {commits.map((c, i) => (
            <li key={c.href + i}>
              <a href={c.href} rel="noopener" className="cv-gh-msg">{clean(c.message)}</a>
              <span className="cv-cite">{c.repo}, {ago(c.at)}</span>
            </li>
          ))}
        </ol>
      )}
      <ol className="cv-gh-repos" aria-label="Repositories">
        {gh.repos.slice(0, 6).map((r) => (
          <li key={r.name}>
            <a href={r.href} rel="noopener" className="cv-gh-name">{r.name}</a>
            {r.description && <p>{clean(r.description)}</p>}
            <span className="cv-cite">
              {[r.language, r.pushedAt ? `pushed ${ago(r.pushedAt)}` : ''].filter(Boolean).join(', ') || 'Repository'}
            </span>
          </li>
        ))}
      </ol>
      <p className="cv-gh-foot">
        <Out href={GITHUB.href}>{host(GITHUB.href)}</Out>
        <span className="cv-gh-state">{gh.live ? (gh.commitsThisMonth ? `${gh.commitsThisMonth} commits this month, read live` : 'Read live from GitHub') : 'His public repositories'}</span>
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ today */

function Today() {
  const { notes, loaded } = useNotes();
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const latest = notes[0];
  const earlier = notes.slice(1, 12);
  const flip = (d: string) => setOpen((s) => { const n = new Set(s); n.has(d) ? n.delete(d) : n.add(d); return n; });

  return (
    <>
      <div className="cv-sub cv-today" data-sp="4|A|Today.">
        <h3 className="cv-h3"><span className="cv-sl">A</span>{' '}Today.</h3>
        <div className="cv-ev">
          {latest ? (
            <article className="cv-note">
              <p className="cv-note-date"><time dateTime={latest.date}>{formatDate(latest.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></p>
              {latest.body.map((b, i) => <p key={i} className="cv-note-body">{clean(b)}</p>)}
            </article>
          ) : (
            <article className="cv-note">
              <p className="cv-note-date">{loaded ? 'The standing note' : 'Today'}</p>
              <p className="cv-note-body">{NOW.status}</p>
            </article>
          )}
        </div>
      </div>
      {earlier.length > 0 && (
        <ol className="cv-earlier">
          {earlier.map((n, i) => {
            const isOpen = open.has(n.date);
            const id = `note-${n.date}`;
            return (
              <li key={n.date} className={'cv-sub cv-old' + (isOpen ? ' is-open' : '')} data-sp={`4|${LETTER[i + 1]}|${formatDate(n.date)}`}>
                <h3 className="cv-h3">
                  <button type="button" className="cv-old-btn" aria-expanded={isOpen} aria-controls={id} onClick={() => flip(n.date)}>
                    <span className="cv-sl">{LETTER[i + 1]}</span>
                    <span className="cv-old-date">{formatDate(n.date)}</span>
                    <span className="cv-old-act">{isOpen ? 'Close' : 'Read'}</span>
                  </button>
                </h3>
                <div className="cv-old-body" id={id} inert={!isOpen}>
                  <div className="cv-ev">{n.body.map((b, j) => <p key={j}>{clean(b)}</p>)}</div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}

/* fit */
/** Set a line of display type to fill its column exactly, capped by a share of the viewport height. */
function useFit(ref: React.RefObject<HTMLElement | null>, vh: number) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.fontSize = '100px';
      const w = Math.max(...[...el.children].map((c) => (c as HTMLElement).offsetWidth));
      const room = el.clientWidth;
      if (!w || !room) return;
      el.style.fontSize = Math.min((room / w) * 100 * 0.995, innerHeight * vh) + 'px';
    };
    fit();
    document.fonts?.ready.then(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(el.parentElement!);
    return () => ro.disconnect();
  }, [ref, vh]);
}

/* ------------------------------------------------------------------ a voter: the one text motion */

function Voter({ n, lines, sub }: { n: string; lines: string[]; sub: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useFit(ref, 0.34);
  useEffect(() => {
    const el = ref.current;
    if (!el || still) return;
    if (el.getBoundingClientRect().top < innerHeight * 0.9) return; // already in view: leave it whole
    const s0 = 18 / parseFloat(getComputedStyle(el).fontSize);
    el.style.transform = `scale(${s0})`;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const a = el.animate([{ transform: `scale(${s0})` }, { transform: 'scale(1)' }], { duration: 1500, delay: 250, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' });
      a.onfinish = () => { el.style.transform = ''; a.cancel(); };
    }, { rootMargin: '0px 0px -30% 0px' });
    io.observe(el);
    return () => { io.disconnect(); el.style.transform = ''; };
  }, []);
  return (
    <li className="cv-voter">
      <p className="cv-voter-n">{n}</p>
      <p className="cv-voter-tag" ref={ref}>{(isPhone() ? lines.flatMap((l) => l.split(/(?<=,) /)) : lines).map((l, i) => <span key={i}>{l}</span>)}</p>
      <p className="cv-voter-sub">{sub}</p>
    </li>
  );
}

/* ------------------------------------------------------------------ the ballot: the visitor decides */

const BKEY = 'case:ballot';
function Ballot() {
  const [vote, setVote] = useState<'' | 'aff' | 'neg'>(() => { try { return (localStorage.getItem(BKEY) as 'aff' | 'neg') || ''; } catch { return ''; } });
  const [nudge, setNudge] = useState(0);
  const cast = (v: 'aff' | 'neg') => {
    if (v === 'neg') { setNudge((n) => n + 1); }
    setVote(v);
    try { localStorage.setItem(BKEY, v); } catch { /* storage off: fine */ }
  };
  return (
    <section className="cv-ballot-wrap" aria-labelledby="ballot-h">
      <div className={'cv-ballot' + (vote ? ` is-${vote}` : '')}>
        <h2 className="cv-ballot-h" id="ballot-h">Your ballot</h2>
        <dl className="cv-ballot-rows">
          <div><dt>Affirmative</dt><dd>{PERSON.name}</dd></div>
          <div><dt>Reasons</dt><dd>Voter one and voter two</dd></div>
        </dl>
        <p className="cv-ballot-q" id="ballot-q">Circle the winner.</p>
        <div className="cv-ballot-pick" role="group" aria-labelledby="ballot-q">
          {(['aff', 'neg'] as const).map((v) => (
            <button key={v} type="button" className={'cv-pick cv-pick-' + v} aria-pressed={vote === v} onClick={() => cast(v)}>
              <span className="cv-pick-w">{v === 'aff' ? 'Aff' : 'Neg'}</span>
              <svg className="cv-ring" viewBox="0 0 200 110" aria-hidden="true" key={v === 'neg' ? nudge : 0}>
                <path d="M106 8 C 40 4, 6 30, 10 60 C 14 92, 70 104, 120 100 C 172 96, 196 70, 190 44 C 184 18, 140 6, 92 12" pathLength={1} />
              </svg>
            </button>
          ))}
        </div>
        <p className="cv-ballot-said" aria-live="polite">
          {vote === 'aff' ? 'Signed. The affirmative thanks the judge.' : vote === 'neg' ? 'Noted. The case is still standing.' : ' '}
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ the page */

export default function Case() {
  useVersion('case');
  const nameRef = useRef<HTMLHeadingElement>(null);
  useFit(nameRef, 0.42);

  return (
    <div className="v-case">
      <a className="skip-x" href="#main">Skip to the case</a>

      <header className="cv-open">
        <p className="cv-res"><span>Resolved:</span> read the whole case before you decide.</p>
        <h1 className="cv-name" ref={nameRef}><span className="cv-nm"><span>Armaan</span> <span>Seth</span></span></h1>
        <div className="cv-open-row">
          <div className="cv-open-left">
            <p className="cv-line">{PERSON.line}</p>
            <p className="cv-affirm">I affirm.</p>
          </div>
          <nav className="cv-road" aria-label="Roadmap">
            <p className="cv-road-h">The roadmap</p>
            <ol>
              {PARTS.map((q) => (
                <li key={q.id}>
                  <a href={`#${q.id}`} onClick={(e) => go(e, q.id)}>
                    <span className="cv-road-n">{'n' in q ? q.n : ''}</span>
                    <span className="cv-road-l">{'n' in q ? q.tag : q.label}</span>
                    <ArrowDown aria-hidden="true" size={18} strokeWidth={2} />
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </header>

      <div className="cv-body">
        <Rail />
        <main id="main" className="cv-main">
          <Part i={0}>
            <div className="cv-ev cv-framework">
              {PERSON.about.map((p, i) => <p key={i} className={i === 0 ? 'cv-lede' : ''}>{p}</p>)}
              <p className="cv-aside">{PERSON.aside}</p>
            </div>
          </Part>

          <Part i={1}>
            <Sub part={1} at={0} tag="Two titles.">
              <ol className="cv-wins">
                {DEBATE.wins.map((w) => (
                  <li key={w.where}>
                    <p className="cv-win-t">{w.title}</p>
                    <p className="cv-win-e">{w.event}</p>
                    <p className="cv-win-w">{w.where}, {w.when}</p>
                  </li>
                ))}
              </ol>
            </Sub>
            <Sub part={1} at={1} tag="He coaches.">
              <p className="cv-team"><span className="cv-team-n">{DEBATE.team.name}</span><span className="cv-team-r">{DEBATE.team.role}</span></p>
              <p>{DEBATE.team.line}</p>
              <p className="cv-record">{DEBATE.team.record}</p>
              <p className="cv-links"><Out href={DEBATE.team.href}>{host(DEBATE.team.href)}</Out></p>
            </Sub>
            <Sub part={1} at={2} tag="Next rounds.">
              <ol className="cv-next">
                {DEBATE.next.map((x) => (
                  <li key={x.where}><span className="cv-next-w">{x.where}</span><span className="cv-next-e">{x.event}</span></li>
                ))}
              </ol>
            </Sub>
          </Part>

          <Part i={2}>
            <Sub part={2} at={0} tag="The paper.">
              <p className="cv-paper-t">{PAPER.title}</p>
              <p className="cv-paper-s">{PAPER.status}, {PAPER.pages} pages. DOI {PAPER.doi}</p>
              <p className="cv-abstract">{PAPER.abstract}</p>
              <p className="cv-kw"><span className="cv-kw-h">Keywords</span> {(PAPER.keywords ?? []).join(', ')}</p>
              <ul className="cv-links cv-paper-links">
                {PAPER.links.map((l) => <li key={l.label}><Out href={l.href}>{l.label}</Out></li>)}
              </ul>
            </Sub>
            <Sub part={2} at={1} tag="The translation.">
              <p className="cv-wesso-t">{WESSO.title}</p>
              <p>{WESSO.abstract}</p>
              <p className="cv-paper-s">{WESSO.status}</p>
            </Sub>
          </Part>

          <Part i={3}>
            <Sub part={3} at={0} tag="The nonprofit.">
              <p className="cv-lede">{MITEZ.body}</p>
            </Sub>
            <Sub part={3} at={1} tag="The work." wide>
              <ol className="cv-work">
                {WORK.map((w, i) => (
                  <li key={w.slug} className="cv-job">
                    <div className="cv-job-txt">
                      <p className="cv-job-n" aria-hidden="true">{i + 1}</p>
                      <h4 className="cv-job-name">{w.name}</h4>
                      <p className="cv-job-kind">{w.kind}</p>
                      <p className="cv-job-line">{w.line}</p>
                      <p className="cv-job-stack">{w.stack}</p>
                      {w.href ? <Out href={w.href}>{host(w.href)}</Out> : <p className="cv-job-none">No public link</p>}
                    </div>
                    <figure className="cv-job-img">
                      {w.href ? (
                        <a href={w.href} rel="noopener" tabIndex={-1} aria-hidden="true"><img src={BASE + w.img} alt="" loading="lazy" width={1200} height={700} /></a>
                      ) : (
                        <img src={BASE + w.img} alt={`${w.name}, screenshot`} loading="lazy" width={1200} height={700} />
                      )}
                    </figure>
                  </li>
                ))}
              </ol>
            </Sub>
            <Sub part={3} at={2} tag="Live from GitHub.">
              <GitHubEvidence />
            </Sub>
          </Part>

          <Part i={4}>
            <Today />
          </Part>

          <Part i={5}>
            <Sub part={5} at={0} tag="Reading.">
              <p className="cv-lede">{NOW.reading.body}</p>
              <ul className="cv-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </Sub>
            <Sub part={5} at={1} tag="A club.">
              <p className="cv-lede">{NOW.club.body}</p>
            </Sub>
            <Sub part={5} at={2} tag="The status.">
              <p className="cv-lede">{NOW.status}</p>
            </Sub>
            <Sub part={5} at={3} tag="Off the record." wide>
              <div className="cv-otr">
                <div><h4>Likes</h4><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
                <div><h4>Dislikes</h4><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
                <div><h4>Favourites</h4><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
                <div><h4>Courses</h4><ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider}, {c.title}.</strong> {c.note}</li>)}</ul></div>
              </div>
            </Sub>
          </Part>
        </main>
      </div>

      <section className="cv-voters" id="voters" aria-labelledby="voters-h" data-part={6}>
        <h2 className="cv-h2" id="voters-h" data-sp="6||">
          <span className="cv-cn">Voters</span>
          <span className="cv-tag">Two reasons to decide.</span>
        </h2>
        <ol className="cv-voter-list">
          <Voter n="Voter one" lines={['Champion, Novice', 'Lincoln-Douglas.']} sub={`${DEBATE.wins[0].where}, ${DEBATE.wins[0].when}.`} />
          <Voter n="Voter two" lines={['Champion, Open', 'Lincoln-Douglas.']} sub={`${DEBATE.wins[1].where}, ${DEBATE.wins[1].when}.`} />
        </ol>
      </section>

      <Ballot />

      <section className="cv-cites" aria-labelledby="cites-h">
        <h2 className="cv-h2 cv-h2-s" id="cites-h"><span className="cv-cn">Cites</span><span className="cv-tag">The record.</span></h2>
        <div className="cv-cites-grid">
          <ol className="cv-honors">
            {HONORS.map((h, i) => (
              <li key={h.what}><span className="cv-honor-n" aria-hidden="true">{i + 1}</span><span className="cv-honor-w">{h.what}</span><span className="cv-honor-d">{h.detail}</span></li>
            ))}
          </ol>
          <ul className="cv-awards">
            {AWARDS.map((a) => (
              <li key={a.site}>
                <a href={a.href} rel="noopener">
                  <img src={BASE + a.img} alt={`Certificate, ${a.site}`} loading="lazy" width={720} height={1018} />
                  <span className="cv-award-s">{a.site}</span>
                  <span className="cv-award-n">{a.note}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="cv-contact" aria-labelledby="contact-h">
        <h2 className="cv-h2 cv-h2-s" id="contact-h"><span className="cv-cn">Contact</span><span className="cv-tag">Cross-ex is open.</span></h2>
        <ul className="cv-links-list">
          {LINKS.map((l) => (
            <li key={l.label}>
              <span className="cv-ll">{l.label}</span>
              {l.href ? <a href={l.href} rel="noopener">{l.value}</a> : <span className="cv-lv">{l.value}</span>}
            </li>
          ))}
        </ul>
        <p className="cv-end"><span>That is the case.</span> <span className="cv-end-a">I affirm.</span></p>
      </section>

      <footer className="cv-foot">
        <p>Draft 29 of the portfolio. Not the live site.</p>
        <p>Set in Archivo and Newsreader.</p>
      </footer>
    </div>
  );
}
