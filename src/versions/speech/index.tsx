// Draft 77, The speech. His sentence, done by the visitor: an argument about what matters with a timer running.
// One minute on the clock, eight argument cards (a remix of React Bits AnimatedList, see CaseList.tsx). A card you
// read slides into your speech (GSAP Flip); at zero the unread ones slide into Dropped in one move, and the page
// below is laid out in the order you read them. The words on the cards never animate; only the cards move.
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import '@fontsource-variable/instrument-sans/wght.css';
import '@fontsource-variable/big-shoulders-display';
import './speech.css';
import { Flip } from 'gsap/Flip';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, STATS, WORK, CHAPTERS } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate, type Note } from '@/lib/notes';
import { gsap, scrollToY } from '@/lib/scroll';
import { still } from '@/lib/utils';
import CaseList from './CaseList';
import { CARDS, HIS_ORDER, byId, type Card, type CardId } from './cards';

gsap.registerPlugin(Flip);

const SECONDS = 60;
const src = (p: string) => import.meta.env.BASE_URL + p;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; epigraph: { text: string; source: string }; ladders: { who: string; when: string; where: string }[] };
const wess = RESEARCH[1];
const sentence = 'an LD round is really an argument about ethics with a timer running.';

type Phase = 'idle' | 'running' | 'paused' | 'done';
type Mark = { state: 'case' | 'read' | 'dropped'; at?: number; n?: number };
type Marks = Record<CardId, Mark>;

const fresh = (): Marks => Object.fromEntries(CARDS.map((c) => [c.id, { state: 'case' }])) as Marks;
const clockText = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const stampText = (at: number) => `read at ${clockText(at)}`;

/** The speech order: read cards by when they were read, then the dropped ones in his order. */
const speechOrder = (m: Marks): CardId[] => {
  const read = CARDS.filter((c) => m[c.id].state === 'read').sort((a, b) => m[a.id].n! - m[b.id].n!).map((c) => c.id);
  return [...read, ...HIS_ORDER.filter((id) => !read.includes(id))];
};

/** "#speech=fbk-41.paper-33" restores a given speech, so it can be sent to a friend. */
const fromHash = (): Marks | null => {
  const h = decodeURIComponent(location.hash);
  if (!h.startsWith('#speech=')) return null;
  const m = fresh();
  let n = 0;
  for (const part of h.slice(8).split('.')) {
    const [id, at] = part.split('-');
    if (id in m && Number.isFinite(+at)) m[id as CardId] = { state: 'read', at: Math.max(0, Math.min(SECONDS, +at)), n: ++n };
  }
  if (!n) return null;
  for (const c of CARDS) if (m[c.id].state === 'case') m[c.id] = { state: 'dropped' };
  return m;
};

export default function SpeechPage() {
  useVersion('speech');
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const heroRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [marks, setMarks] = useState<Marks>(fresh);
  const [phase, setPhase] = useState<Phase>('idle');
  const [left, setLeft] = useState(SECONDS);
  const [order, setOrder] = useState<CardId[]>(HIS_ORDER);
  const [ordered, setOrdered] = useState(false);
  const [say, setSay] = useState('');
  const endAt = useRef(0);
  const remain = useRef(SECONDS * 1000);
  const cardFlip = useRef<Flip.FlipState | null>(null);
  const pageFlip = useRef<Flip.FlipState | null>(null);
  const pending = useRef<Marks | null>(null);
  const said = useRef<Set<number>>(new Set());
  const marksRef = useRef(marks);
  marksRef.current = marks;

  // A shared speech in the hash comes back as given, with no motion.
  useEffect(() => {
    const m = fromHash();
    if (!m) return;
    setMarks(m);
    setPhase('done');
    setLeft(0);
    setOrder(speechOrder(m));
    setOrdered(true);
  }, []);

  const grabCards = () => { cardFlip.current = Flip.getState(heroRef.current!.querySelectorAll('[data-flip-id]')); };

  /** One Flip of the section list. Runs at Time, or later when the reader comes back up to the clock. */
  const applyOrder = useCallback((m: Marks) => {
    pending.current = null;
    if (bodyRef.current) pageFlip.current = Flip.getState(bodyRef.current.querySelectorAll(':scope > [data-sec]'));
    setOrder(speechOrder(m));
    setOrdered(true);
    const read = speechOrder(m).filter((id) => m[id].state === 'read');
    history.replaceState(null, '', read.length ? `#speech=${read.map((id) => `${id}-${m[id].at}`).join('.')}` : location.pathname);
  }, []);

  const heroInView = () => {
    const r = heroRef.current?.getBoundingClientRect();
    return !!r && r.bottom > innerHeight * 0.35;
  };

  const finish = useCallback((m: Marks) => {
    grabCards();
    const next = { ...m };
    for (const c of CARDS) if (next[c.id].state === 'case') next[c.id] = { state: 'dropped' };
    setMarks(next);
    setPhase('done');
    setSay('Time.');
    if (heroInView()) applyOrder(next);
    else pending.current = next;
  }, [applyOrder]);

  // The clock. It counts even with reduced motion: it is information.
  useEffect(() => {
    if (phase !== 'running') return;
    endAt.current = performance.now() + remain.current;
    const tick = () => {
      const ms = Math.max(0, endAt.current - performance.now());
      remain.current = ms;
      const s = Math.ceil(ms / 1000);
      setLeft(s);
      for (const mark of [30, 10]) if (s <= mark && s > 0 && !said.current.has(mark)) { said.current.add(mark); setSay(`${mark} seconds left.`); }
      if (ms <= 0) finish(marksRef.current);
    };
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [phase, finish]);

  // Flip the cards (and, at Time, the sections) from where they were to where React put them.
  useLayoutEffect(() => {
    const dur = still ? 0 : 1;
    if (cardFlip.current) {
      const st = cardFlip.current;
      cardFlip.current = null;
      Flip.from(st, { targets: heroRef.current!.querySelectorAll('[data-flip-id]'), duration: 0.72 * dur, ease: 'power3.inOut', absolute: true, stagger: still ? 0 : 0.035, zIndex: 5 });
    }
    if (pageFlip.current) {
      const st = pageFlip.current;
      pageFlip.current = null;
      Flip.from(st, { targets: bodyRef.current!.querySelectorAll(':scope > [data-sec]'), duration: 0.9 * dur, ease: 'power3.inOut' });
    }
  }, [marks, order]);

  // If Time came while they were reading below, the order changes only once they are back at the clock.
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && pending.current) applyOrder(pending.current); }, { threshold: 0.4 });
    io.observe(hero);
    return () => io.disconnect();
  }, [applyOrder]);

  const start = () => {
    said.current = new Set();
    remain.current = SECONDS * 1000;
    setLeft(SECONDS);
    setPhase('running');
    setSay('Clock started. One minute.');
  };

  const read = (c: Card) => {
    if (phase === 'done' || marks[c.id].state !== 'case') return;
    if (phase === 'idle') start();
    const at = phase === 'idle' ? SECONDS : Math.ceil(remain.current / 1000);
    const n = Object.values(marks).filter((m) => m.state === 'read').length + 1;
    const next = { ...marks, [c.id]: { state: 'read', at, n } } as Marks;
    if (n === CARDS.length) { finish(next); return; }
    grabCards();
    setMarks(next);
  };

  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(location.href).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2400); }).catch(() => {});
  };

  const again = () => {
    grabCards();
    setMarks(fresh());
    setPhase('idle');
    setLeft(SECONDS);
    remain.current = SECONDS * 1000;
    pending.current = null;
    setSay('');
    history.replaceState(null, '', location.pathname);
    scrollToY(0);
  };

  const inCase = CARDS.filter((c) => marks[c.id].state === 'case');
  const spoken = CARDS.filter((c) => marks[c.id].state === 'read').sort((a, b) => marks[a.id].n! - marks[b.id].n!);
  const dropped = HIS_ORDER.map(byId).filter((c) => marks[c.id].state === 'dropped');
  const latest = notes[0] as Note | undefined;
  const sub = (c: Card) => (c.id === 'today' && latest ? formatDate(latest.date) : c.sub);
  const firstDropped = ordered ? order.find((id) => marks[id].state === 'dropped') : undefined;
  const anyRead = order.some((id) => marks[id].state === 'read');

  const stamp = (id: CardId) => {
    const m = marks[id];
    if (!ordered) return null;
    if (m.state === 'read') return <p className="sp-stamp is-read">{stampText(m.at!)}</p>;
    if (m.state === 'dropped') return <p className="sp-stamp">Dropped, still true</p>;
    return null;
  };

  const clockBig = phase === 'done' ? 'Time.' : clockText(left);

  return (
    <div className="v-speech" data-phase={phase}>
      <a className="skip-x" href="#main">Skip to content</a>
      <p className="sr-only-x" aria-live="polite" role="status">{say}</p>

      <header className="sp-hero" ref={heroRef as React.RefObject<HTMLElement>}>
        <div className="sp-top">
          <div className="sp-who">
            <h1 className="sp-name">{PERSON.name}</h1>
            <p className="sp-line">{PERSON.line}</p>
            <figure className="sp-sentence">
              <blockquote><p>{sentence}</p></blockquote>
              <figcaption>Armaan, on why Lincoln-Douglas</figcaption>
            </figure>
          </div>

          <div className="sp-clockwrap">
            <div className="sp-clock">
              <p className="sp-barcount" aria-hidden="true">{spoken.length} read</p>
              <p className="sp-time" role="timer" aria-label={phase === 'done' ? 'Time.' : `${left} seconds left`}>{clockBig}</p>
              <div className="sp-controls">
                {phase === 'idle' && (
                  <button type="button" className="sp-btn is-main" onClick={start}>
                    <span className="sp-btn-a">Start.</span> <span className="sp-btn-b">You have one minute to argue for him.</span>
                  </button>
                )}
                {phase === 'running' && <button type="button" className="sp-btn" onClick={() => setPhase('paused')}>Pause</button>}
                {phase === 'paused' && <button type="button" className="sp-btn is-main" onClick={() => setPhase('running')}>Resume</button>}
                {phase === 'done' && <button type="button" className="sp-btn" onClick={again}>Give it again</button>}
                <p className="sp-hint">
                  {phase === 'idle' && 'Read a card to put it in your speech.'}
                  {phase === 'running' && 'Read what matters most first.'}
                  {phase === 'paused' && 'Paused. You can still read cards.'}
                  {phase === 'done' && (anyRead ? 'The page below follows your speech.' : 'Nothing read. The page keeps his order.')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="sp-desk">
          <section className="sp-col sp-case" aria-labelledby="h-case">
            {phase === 'done' ? (
              <>
                <h2 id="h-case" className="sp-colhead">Dropped <span>still true, still on the page</span></h2>
                {dropped.length ? (
                  <ul className="sp-said-list">
                    {dropped.map((c) => (
                      <li key={c.id} className="sp-card is-dropped" data-flip-id={c.id}>
                        <span className="sp-card-tag">{c.tag}</span>
                        <span className="sp-card-sub">{sub(c)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="sp-empty">Nothing dropped. You read every card.</p>
                )}
              </>
            ) : (
              <>
                <h2 id="h-case" className="sp-colhead">The case <span>{inCase.length} unread</span></h2>
                {inCase.length ? (
                  <CaseList items={inCase} onItemSelect={read} label="Argument cards. Arrow keys to move, Enter to read." sub={sub} />
                ) : (
                  <p className="sp-empty">All read.</p>
                )}
              </>
            )}
          </section>

          <section className="sp-col sp-said" aria-labelledby="h-said">
            <h2 id="h-said" className="sp-colhead">Your speech <span>{spoken.length} read</span></h2>
            <ol className="sp-said-list">
              {spoken.map((c) => (
                <li key={c.id} className="sp-card is-read" data-flip-id={c.id}>
                  <span className="sp-card-n">{marks[c.id].n}</span>
                  <span className="sp-card-tag">{c.tag}</span>
                  <span className="sp-card-at">{stampText(marks[c.id].at!)}</span>
                </li>
              ))}
              {Array.from({ length: CARDS.length - spoken.length - dropped.length }, (_, i) => (
                <li key={`slot-${i}`} className="sp-slot" aria-hidden="true"><span>{spoken.length + i + 1}</span></li>
              ))}
            </ol>
          </section>
        </div>
      </header>

      <nav className="sp-index" aria-label="Running order">
        <h2 className="sp-colhead">{ordered ? (anyRead ? 'The page, in your order' : 'The page, in his order') : 'The page, in his order'}</h2>
        <ol>
          {order.map((id) => (
            <li key={id} className={marks[id].state === 'read' && ordered ? 'is-read' : marks[id].state === 'dropped' && ordered ? 'is-dropped' : undefined}>
              <a href={`#s-${id}`}>{byId(id).tag}</a>
              {ordered && marks[id].state === 'read' && <span>{clockText(marks[id].at!)}</span>}
            </li>
          ))}
          <li className="is-fixed"><a href="#about">About</a></li>
          <li className="is-fixed"><a href="#now">Now</a></li>
          <li className="is-fixed"><a href="#record">Record</a></li>
          <li className="is-fixed"><a href="#contact">Contact</a></li>
        </ol>
      </nav>

      <main id="main" className="sp-main">
        <div className="sp-body" ref={bodyRef}>
          {order.map((id) => (
            <Fragment key={id}>
              {id === firstDropped && anyRead && (
                <h2 className="sp-divider" data-sec="divider">Dropped, still true</h2>
              )}
              <section id={`s-${id}`} className={`sp-sec sp-sec-${id}`} data-sec={id} aria-labelledby={`h-${id}`}>
                <div className="sp-sechead is-card" data-state={ordered ? marks[id].state : 'his'}>
                  {ordered && marks[id].state === 'read' && <span className="sp-sec-n" aria-hidden="true">{marks[id].n}</span>}
                  <h2 id={`h-${id}`} className={`sp-sectag${id === 'fbk' || id === 'wildcat' ? ' is-win' : ''}`}>{byId(id).tag}</h2>
                  {stamp(id)}
                </div>
                <Section id={id} gh={gh} notes={notes} loaded={loaded} />
              </section>
            </Fragment>
          ))}
        </div>

        <section id="about" className="sp-sec sp-fixed" aria-labelledby="h-about">
          <div className="sp-sechead"><h2 id="h-about" className="sp-sectag">About</h2></div>
          <div className="sp-about">
            {PERSON.about.map((p) => <p key={p.slice(0, 20)}>{p}</p>)}
            <p className="sp-aside">{PERSON.aside}</p>
          </div>
        </section>

        <section id="now" className="sp-sec sp-fixed" aria-labelledby="h-now">
          <div className="sp-sechead"><h2 id="h-now" className="sp-sectag">Now</h2></div>
          <p className="sp-status">{NOW.status}</p>
          <div className="sp-now">
            <div>
              <h3>{NOW.reading.title}</h3>
              <p>{NOW.reading.body}</p>
              <ul className="sp-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <h3>{NOW.club.title}</h3>
              <p>{NOW.club.body}</p>
            </div>
          </div>
        </section>

        <section id="record" className="sp-sec sp-fixed" aria-labelledby="h-record">
          <div className="sp-sechead"><h2 id="h-record" className="sp-sectag">Record</h2></div>
          <div className="sp-record">
            <ol className="sp-honors">
              {HONORS.map((h) => <li key={h.what}><span>{h.what}</span><span>{h.detail}</span></li>)}
            </ol>
            <div className="sp-certs">
              {AWARDS.map((a) => (
                <a key={a.site} className="sp-cert" href={a.href} target="_blank" rel="noreferrer">
                  <img src={src(a.img)} alt={`Certificate: ${a.site}`} loading="lazy" width={600} height={848} />
                  <span className="sp-cert-site">{a.site}</span>
                  <span className="sp-cert-note">{a.note}</span>
                </a>
              ))}
            </div>
          </div>
          <dl className="sp-stats">
            {STATS.map((s) => <div key={s.label}><dt>{s.label}</dt><dd>{s.to}{s.suffix}</dd></div>)}
          </dl>
        </section>

        <section id="off" className="sp-sec sp-fixed sp-off" aria-labelledby="h-off">
          <div className="sp-sechead"><h2 id="h-off" className="sp-sectag">Off the record</h2></div>
          <div className="sp-offgrid">
            <div><h3>Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider}, {c.title}.</b> {c.note}</li>)}</ul></div>
          </div>
        </section>
      </main>

      <footer id="contact" className="sp-end">
        <p className="sp-end-time" aria-hidden="true">Time.</p>
        {ordered && anyRead && (
          <div className="sp-recap">
            <p className="sp-recap-h">Your speech, as given</p>
            <ol>
              {spoken.map((c) => <li key={c.id}><span>{marks[c.id].n}</span>{c.tag}<em>{clockText(marks[c.id].at!)}</em></li>)}
            </ol>
            <button type="button" className="sp-btn" onClick={copy}>{copied ? 'Link copied' : 'Copy the link to this speech'}</button>
          </div>
        )}
        <h2 className="sp-end-h">That was the speech. Here is how to reach him.</h2>
        <ul className="sp-links">
          {LINKS.map((l) => (
            <li key={l.label}>
              <span className="sp-links-l">{l.label}</span>
              {l.href ? <a href={l.href} {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>{l.value}</a> : <span className="sp-links-v">{l.value}</span>}
            </li>
          ))}
        </ul>
        <button type="button" className="sp-btn is-main sp-again" onClick={again}>Give it again</button>
        <p className="sp-colophon">Draft 77 of the portfolio. Not the live site. The card list is remixed from React Bits AnimatedList; the cards move with GSAP Flip.</p>
      </footer>
    </div>
  );
}

type SecProps = { id: CardId; gh: ReturnType<typeof useGitHub>; notes: Note[]; loaded: boolean };

function Section({ id, gh, notes, loaded }: SecProps) {
  if (id === 'fbk' || id === 'wildcat') {
    const w = DEBATE.wins[id === 'fbk' ? 0 : 1];
    return (
      <div className="sp-win">
        <p className="sp-win-line"><span>{w.where}</span><span>{w.when}</span></p>
        {id === 'wildcat' && (
          <div className="sp-next">
            <h3>Up next</h3>
            <ul>{DEBATE.next.map((n) => <li key={n.where}><span>{n.where}</span><span>{n.event}</span></li>)}</ul>
          </div>
        )}
        {id === 'fbk' && <p className="sp-calm">{CHAPTERS[1].body}</p>}
      </div>
    );
  }
  if (id === 'skeptical') {
    const t = DEBATE.team;
    return (
      <div className="sp-two">
        <p className="sp-role">{t.role}</p>
        <div className="sp-calm">
          <p className="sp-lead">{t.line}</p>
          <p>{t.record}</p>
          <p className="sp-out"><a href={t.href} target="_blank" rel="noreferrer">{host(t.href)}</a> <a href={t.github} target="_blank" rel="noreferrer">The code, on GitHub</a></p>
        </div>
      </div>
    );
  }
  if (id === 'mitez') {
    const w = WORK[0];
    return (
      <div className="sp-two">
        <p className="sp-role">{STATS[0].to}{STATS[0].suffix} <span>{STATS[0].label.toLowerCase()}</span></p>
        <div className="sp-calm">
          <p className="sp-lead">{CHAPTERS[0].body}</p>
          <p>{PERSON.about[1].split('. ').slice(-1)[0]}</p>
          <p className="sp-out"><a href={w.href!} target="_blank" rel="noreferrer">{host(w.href!)}</a></p>
        </div>
      </div>
    );
  }
  if (id === 'paper') {
    return (
      <div className="sp-paper">
        <figure className="sp-epi"><blockquote><p>{paper.epigraph.text}</p></blockquote><figcaption>{paper.epigraph.source}</figcaption></figure>
        <h3 className="sp-paper-title">{paper.title}</h3>
        <p className="sp-paper-status">{paper.status}, {paper.pages} pages. DOI {paper.doi}</p>
        <div className="sp-paper-grid">
          <div className="sp-calm">
            <h4>Abstract</h4>
            <p className="sp-lead">{paper.abstract}</p>
            <h4>Keywords</h4>
            <p>{paper.keywords.join(', ')}</p>
          </div>
          <div>
            <h4>The ladder, three times</h4>
            <ol className="sp-ladders">
              {paper.ladders.map((l) => <li key={l.who}><b>{l.who}</b><span>{l.when}</span><span>{l.where}</span></li>)}
            </ol>
            <h4>Read it</h4>
            <ul className="sp-paperlinks">
              {paper.links.map((l) => <li key={l.label}><a href={l.href} target="_blank" rel="noreferrer">{l.label}</a></li>)}
            </ul>
          </div>
        </div>
      </div>
    );
  }
  if (id === 'wess') {
    return (
      <div className="sp-two">
        <p className="sp-role">{wess.status}</p>
        <div className="sp-calm">
          <h3 className="sp-h3">{wess.title}</h3>
          <p>{wess.abstract}</p>
        </div>
      </div>
    );
  }
  if (id === 'builds') {
    const commits = gh.activity.slice(0, 6);
    return (
      <div className="sp-builds">
        <p className="sp-calm sp-lead">{CHAPTERS[4].body}</p>
        <div className="sp-work">
          {WORK.map((w) => (
            <figure key={w.slug} className="sp-fig">
              <div className="sp-shot"><img src={src(w.img)} alt={`Screenshot of ${w.name}`} loading="lazy" width={1200} height={750} /></div>
              <figcaption>
                <h3>{w.name}</h3>
                <p className="sp-kind">{w.kind} <span>{w.stack}</span></p>
                <p>{w.line}</p>
                {w.href ? <a href={w.href} target="_blank" rel="noreferrer">{host(w.href)}</a> : <p className="sp-nolink">Runs on his own desktop, no public link.</p>}
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="sp-gh">
          <div className="sp-gh-head">
            <h3>Live from GitHub</h3>
            <p>{gh.live ? (gh.commitsThisMonth !== null ? `${gh.commitsThisMonth} commits pushed this month.` : 'Fetched just now.') : 'Repositories he keeps in the open.'} <a href={GITHUB.href} target="_blank" rel="noreferrer">{host(GITHUB.href)}</a></p>
          </div>
          <div className="sp-gh-grid">
            {commits.length > 0 && (
              <div>
                <h4>Recent commits</h4>
                <ol className="sp-commits">
                  {commits.map((c) => (
                    <li key={c.href}>
                      <a href={c.href} target="_blank" rel="noreferrer">{c.message}</a>
                      <span>{c.repo}, {ago(c.at)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <div>
              <h4>Repositories</h4>
              <ul className="sp-repos">
                {gh.repos.slice(0, 8).map((r) => (
                  <li key={r.name}>
                    <a href={r.href} target="_blank" rel="noreferrer">{r.name}</a>
                    {r.description && <p>{r.description}</p>}
                    {r.language && <span>{r.language}{r.pushedAt ? `, pushed ${ago(r.pushedAt)}` : ''}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }
  // Today
  const [latest, ...earlier] = notes;
  return (
    <div className="sp-today">
      {latest ? (
        <article className="sp-note">
          <h3 className="sp-note-date"><time dateTime={latest.date}>{formatDate(latest.date)}</time></h3>
          {latest.body.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
        </article>
      ) : (
        <p className="sp-note-wait">{loaded ? 'No note posted yet. Check back tomorrow.' : 'Fetching today’s note.'}</p>
      )}
      {earlier.length > 0 && (
        <div className="sp-earlier">
          <h4>Earlier notes</h4>
          {earlier.map((n) => (
            <details key={n.date}>
              <summary><time dateTime={n.date}>{formatDate(n.date)}</time><span>{n.body[0].slice(0, 70)}{n.body[0].length > 70 ? '…' : ''}</span></summary>
              {n.body.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
