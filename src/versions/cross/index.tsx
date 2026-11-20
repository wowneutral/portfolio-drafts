// Draft 9: the cross. Cross-ex is where an LD round is won, and a skeptic's only real tool is the
// question. The page interrogates him: each section opens on one short question set enormous in
// Bodoni, built word by word by the scroll, and his own words answer it beneath in a calm column.
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/instrument-sans/wdth.css';
import './cross.css';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { ago, useGitHub } from '@/lib/github';
import { formatDate, useNotes } from '@/lib/notes';
import { gsap, scroll, scrollToId, useGSAP } from '@/lib/scroll';
import { clamp, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';

const BASE = import.meta.env.BASE_URL;
const PAPER = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; epigraph: { text: string; source: string }; ladders: { who: string; when: string; where: string }[] };
const WESSO = RESEARCH[1];
const weekday = (iso: string) => formatDate(iso, { weekday: 'long' });

/** A question, word by word, each word in its own mask so the scroll can lift it into place. */
function Words({ text }: { text: string }) {
  const body = text.replace(/\?$/, '');
  const words = body.split(' ');
  return (
    <>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="w">
            <span className="wi">
              {w}
              {i === words.length - 1 && <span className="qm">?</span>}
            </span>
          </span>
          {i < words.length - 1 ? ' ' : ''}
        </Fragment>
      ))}
    </>
  );
}

function Question({ text, id }: { text: string; id: string }) {
  return (
    <div className="qband" data-q>
      <h2 className="q" id={`${id}-q`}>
        <Words text={text} />
      </h2>
    </div>
  );
}

const Out = ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
  <a className={className ?? 'lk'} href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">
    {children}
  </a>
);

const Arrow = () => (
  <svg className="arr" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
  </svg>
);

/* ------------------------------------------------------------------ work */

function Work() {
  const [i, setI] = useState(0);
  const item = WORK[i];
  const frame = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) { first.current = false; return; }
    if (still) return;
    gsap.fromTo(frame.current, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'expo.out' });
    gsap.fromTo(text.current!.children, { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.05 });
  }, [i]);
  const next = () => setI((i + 1) % WORK.length);
  return (
    <div className="work">
      <div className="wk-stage">
        <div className="wk-frame" ref={frame}>
          <img src={BASE + item.img} alt={`${item.name}, a screenshot`} width={1200} height={660} />
        </div>
        <div className="wk-text" ref={text} aria-live="polite">
          <p className="wk-kind">{item.kind}</p>
          <h3 className="wk-name">{item.name}</h3>
          <p className="wk-line">{item.line}</p>
          <p className="wk-stack">{item.stack}</p>
          {item.href ? (
            <Out href={item.href} className="lk wk-go">
              {item.href.replace(/^https:\/\//, '').replace(/\/$/, '')} <Arrow />
            </Out>
          ) : (
            <p className="wk-local">Local, so there is nothing to link.</p>
          )}
        </div>
      </div>
      <div className="wk-nav">
        <button type="button" className="next" onClick={next}>
          Next question <Arrow />
        </button>
        <ul className="wk-list" aria-label="Every project">
          {WORK.map((w, k) => (
            <li key={w.slug}>
              <button type="button" className="wk-pick" aria-current={k === i ? 'true' : undefined} onClick={() => setI(k)}>
                {w.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- github */

function Shipping() {
  const { repos, activity, live } = useGitHub();
  const lines = activity.slice(0, 6);
  return (
    <div className="ans gh">
      {lines.length > 0 ? (
        <>
          <p className="lead">In his own commit messages, lately:</p>
          <ol className="said">
            {lines.map((a) => (
              <li key={a.href}>
                <a href={a.href} target="_blank" rel="noreferrer" className="said-a">
                  <span className="said-m">{a.message}</span>
                  <span className="said-meta">{a.repo}, {ago(a.at)}</span>
                </a>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="lead">The answer is in the open. These are the repositories he is working in:</p>
      )}
      <ul className="repos">
        {repos.slice(0, live ? 6 : 4).map((r) => (
          <li key={r.name}>
            <a href={r.href} target="_blank" rel="noreferrer" className="repo">
              <span className="repo-n">{r.name}</span>
              {r.description && <span className="repo-d">{r.description}</span>}
              <span className="repo-l">{[r.language, r.pushedAt ? `pushed ${ago(r.pushedAt)}` : null].filter(Boolean).join(', ')}</span>
            </a>
          </li>
        ))}
      </ul>
      <Out href={GITHUB.href} className="lk big-lk">
        All of it at github.com/{GITHUB.user} <Arrow />
      </Out>
    </div>
  );
}

/* ----------------------------------------------------------------- today */

function Today({ notes, loaded }: { notes: { date: string; body: string[] }[]; loaded: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const latest = notes[0];
  const earlier = notes.slice(1, 8);
  if (!latest) {
    return (
      <div className="ans today">
        <p className="note-b">{NOW.status}</p>
        <p className="note-d">{loaded ? 'From his status line' : 'Fetching the latest note'}</p>
      </div>
    );
  }
  return (
    <div className="ans today">
      <div className="note">
        {latest.body.map((p, k) => <p className="note-b" key={k}>{p}</p>)}
        <p className="note-d"><time dateTime={latest.date}>{formatDate(latest.date)}</time></p>
      </div>
      {earlier.length > 0 && (
        <ul className="earlier">
          {earlier.map((n) => {
            const on = open === n.date;
            return (
              <li key={n.date}>
                <button type="button" className="ask" aria-expanded={on} aria-controls={`n-${n.date}`} onClick={() => setOpen(on ? null : n.date)}>
                  <span className="ask-q">And on {weekday(n.date)}<span className="qm-s">?</span></span>
                  <span className="ask-d">{formatDate(n.date, { day: 'numeric', month: 'long' })}</span>
                </button>
                <div className="ask-a" id={`n-${n.date}`} hidden={!on}>
                  {n.body.map((p, k) => <p key={k}>{p}</p>)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- ask */

// The visitor's turn to cross-examine: a typed question is matched to the section that answers it.
const TOPICS: [string, string[]][] = [
  ['won', ['win', 'won', 'champ', 'title', 'tournament', 'trophy', 'blue key', 'fbk', 'wildcat', 'debate', 'ld', 'lincoln', 'next', 'newman', 'dsds']],
  ['coach', ['coach', 'team', 'skeptical', 'teach', 'student', 'novice', 'scrim']],
  ['wrote', ['paper', 'write', 'wrote', 'research', 'wittgenstein', 'mauthner', 'sextus', 'language', 'skeptic', 'ladder', 'translat', 'wessobrunn', 'german', 'doi', 'publish', 'philosophy']],
  ['built', ['build', 'built', 'make', 'made', 'project', 'site', 'website', 'app', 'jarvis', 'mitez', 'spread', 'rogue', 'last seen', 'last search', 'draft']],
  ['shipping', ['github', 'code', 'commit', 'repo', 'ship', 'program', 'working on']],
  ['today', ['today', 'note', 'blog', 'say', 'said', 'latest', 'daily', 'new']],
  ['now', ['read', 'book', 'lit', 'club', 'now', 'fiction', 'queer', 'absurd', 'homework', 'busy']],
  ['record', ['award', 'honor', 'honour', 'record', 'prize', 'certificate', 'mun', 'fbla', 'toc']],
  ['off', ['like', 'hate', 'dislike', 'favourite', 'favorite', 'tea', 'boba', 'laufey', 'interstellar', 'plato', 'course', 'rifle', 'paint', 'water', 'fun']],
  ['reach', ['contact', 'email', 'reach', 'discord', 'talk', 'message', 'touch', 'mail']],
  ['does', ['do', 'about', 'start', 'why', 'mentor', 'hobby']],
  ['who', ['who', 'name', 'armaan', 'age', 'old']],
];

function Ask() {
  const [v, setV] = useState('');
  const [miss, setMiss] = useState<string | null>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = ' ' + v.toLowerCase().replace(/[^a-z0-9 ]/g, ' ') + ' ';
    if (!t.trim()) return;
    const hit = TOPICS.find(([, words]) => words.some((w) => (w.length <= 3 ? t.includes(` ${w} `) : t.includes(w))));
    if (!hit) { setMiss(v); return; }
    setMiss(null);
    scrollToId(hit[0]);
  };
  return (
    <form className="askf" onSubmit={submit}>
      <label htmlFor="ask-in" className="askf-l">Your turn. Ask him anything<span className="qm-s">?</span></label>
      <div className="askf-row">
        <input id="ask-in" className="askf-in" value={v} onChange={(e) => { setV(e.target.value); setMiss(null); }} placeholder="Did he win at Wildcat" autoComplete="off" spellCheck={false} />
        <button type="submit" className="next">Ask <Arrow /></button>
      </div>
      <p className="askf-m" role="status">
        {miss !== null ? 'Nothing on the record answers that. Try the debate, the paper, or the code.' : ''}
      </p>
    </form>
  );
}

/* ------------------------------------------------------------------ page */

/** A later question is built by the scroll, word by word, then lifts away as its answer arrives. */
function build(band: HTMLElement) {
  // Each word rises out of its mask; it only becomes solid once it has nearly landed, so a word
  // still travelling never sits on the line below it.
  const tl = gsap.timeline({ scrollTrigger: { trigger: band, start: 'top 92%', end: 'top 30%', scrub: 0.5 } });
  band.querySelectorAll('.wi').forEach((w, i) => {
    tl.fromTo(w, { yPercent: 108 }, { yPercent: 0, duration: 1, ease: 'power2.out' }, i * 0.22)
      .fromTo(w, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'none' }, i * 0.22 + 0.62);
  });
  gsap.fromTo(band.querySelector('.q'), { yPercent: 0, opacity: 1 }, {
    yPercent: -35, opacity: 0, ease: 'none', immediateRender: false,
    scrollTrigger: { trigger: band, start: 'bottom 34%', end: 'bottom 2%', scrub: 0.5 },
  });
}

export default function Cross() {
  useVersion('cross');
  const root = useRef<HTMLDivElement>(null);
  const { notes, loaded } = useNotes();
  const day = notes[0] ? weekday(notes[0].date) : null;
  const todayQ = day ? `What did he say on ${day}?` : 'What did he say today?';

  const QS = useMemo(() => [
    { id: 'who', q: 'Who is he?' },
    { id: 'does', q: 'What does he actually do?' },
    { id: 'won', q: 'Has he won anything?' },
    { id: 'coach', q: 'Who does he coach?' },
    { id: 'wrote', q: 'What did he write?' },
    { id: 'built', q: 'What has he built?' },
    { id: 'shipping', q: 'What is he shipping?' },
    { id: 'today', q: todayQ },
    { id: 'now', q: 'What is he up to now?' },
    { id: 'record', q: 'Anything else on the record?' },
    { id: 'off', q: 'And off the record?' },
    { id: 'reach', q: 'How do I reach him?' },
  ], [todayQ]);

  const [cur, setCur] = useState('who');
  const [sheet, setSheet] = useState(false);
  const fab = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Which question is being answered: the last section whose top has crossed the middle of the screen.
  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const mid = innerHeight * 0.55;
      let id = QS[0].id;
      for (const s of QS) { const el = document.getElementById(s.id); if (el && el.getBoundingClientRect().top <= mid) id = s.id; }
      setCur(id);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(read); };
    window.addEventListener('scroll', on, { passive: true });
    read();
    return () => { window.removeEventListener('scroll', on); cancelAnimationFrame(raf); };
  }, [QS]);

  // The phone index: Escape closes it, focus goes in and comes back.
  useEffect(() => {
    if (!sheet) return;
    sheetRef.current?.querySelector<HTMLElement>('a')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheet(false); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); fab.current?.focus(); };
  }, [sheet]);

  useGSAP(() => {
    if (still || !root.current) return;
    const r = root.current;

    // The opening: the first question builds itself, then the answer rises.
    gsap.timeline({ delay: 0.35 })
      .from('.open .wi', { yPercent: 108, duration: 1.2, ease: 'expo.out', stagger: 0.12 })
      .from('.open .rise', { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1 }, '-=0.6');

    gsap.utils.toArray<HTMLElement>('.qband', r).forEach((band) => { if (!band.closest('.open, #today')) build(band); });

    // Answers rise into their column.
    gsap.utils.toArray<HTMLElement>('[data-rise]', r).forEach((el) => {
      gsap.from(el, { y: 34, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });

    // "Yes." lands.
    gsap.fromTo('.yes-w', { scale: 0.42, yPercent: 18 }, {
      scale: 1, yPercent: 0, ease: 'none',
      scrollTrigger: { trigger: '.yes', start: 'top 95%', end: 'center 55%', scrub: 0.5 },
    });
    // Each championship is unveiled from the floor up.
    gsap.utils.toArray<HTMLElement>('.champ-w', r).forEach((el) => {
      gsap.fromTo(el, { yPercent: 100 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: el.closest('.plate'), start: 'top 85%', end: 'top 25%', scrub: 0.5 } });
    });

    // The ending: the last question mark falls off and a full stop takes its place.
    gsap.timeline({ scrollTrigger: { trigger: '.end', start: 'top 80%', end: 'center 50%', scrub: 0.6 } })
      .to('.end-q', { rotate: 38, yPercent: 40, opacity: 0, ease: 'power1.in' })
      .fromTo('.end-dot', { yPercent: -160, opacity: 0 }, { yPercent: 0, opacity: 1, ease: 'bounce.out' }, 0.35);

    // Every question mark hangs like a hook and swings against the scroll, with weight.
    let a = 0, va = 0, px = 0;
    const onMove = (e: PointerEvent) => { px = (e.clientX / innerWidth - 0.5) * 2; };
    window.addEventListener('pointermove', onMove, { passive: true });
    const tick = () => {
      const target = clamp(-scroll.v * 7 + px * 11, -20, 20);
      va += (target - a) * 0.06; va *= 0.86; a += va;
      if (Math.abs(a) < 0.02 && Math.abs(va) < 0.02) return;
      r.querySelectorAll<HTMLElement>('.qm').forEach((m) => { m.style.transform = `rotate(${a.toFixed(2)}deg)`; });
    };
    gsap.ticker.add(tick);
    return () => { gsap.ticker.remove(tick); window.removeEventListener('pointermove', onMove); };
  }, { scope: root });

  // Today's question changes with the note's weekday, so it is built on its own.
  useGSAP(() => {
    if (still || !root.current) return;
    const band = root.current.querySelector<HTMLElement>('#today .qband');
    if (band) build(band);
  }, { scope: root, dependencies: [todayQ], revertOnUpdate: true });

  const Index = ({ onPick }: { onPick?: () => void }) => (
    <ol className="idx">
      {QS.map((s) => (
        <li key={s.id}>
          <a href={`#${s.id}`} aria-current={cur === s.id ? 'true' : undefined} onClick={onPick}>
            {s.q.replace(/\?$/, '')}<span className="qm-s">?</span>
          </a>
        </li>
      ))}
    </ol>
  );

  const q = (id: string) => QS.find((s) => s.id === id)!.q;

  return (
    <div className="v-cross" ref={root}>
      <a className="skip-x" href="#main">Skip to the answers</a>

      <nav className="rail" aria-label="Questions">
        <Index />
      </nav>

      <button ref={fab} type="button" className="fab" aria-label="All the questions" aria-expanded={sheet} onClick={() => setSheet(true)}>
        <span aria-hidden="true">?</span>
      </button>
      {sheet && (
        <div className="sheet" ref={sheetRef} role="dialog" aria-modal="true" aria-label="All the questions">
          <button type="button" className="sheet-x" onClick={() => setSheet(false)}>Close</button>
          <Index onPick={() => setSheet(false)} />
        </div>
      )}

      <main id="main" className="main">
        {/* Who is he? */}
        <section id="who" className="sec open">
          <div className="qband">
            <p className="q q-open" aria-hidden="true"><Words text={q('who')} /></p>
          </div>
          <div className="ans">
            <h1 className="name rise">{PERSON.name}</h1>
            <p className="line rise">{PERSON.line}</p>
            <p className="short rise">{PERSON.short.join(' ')}</p>
          </div>
        </section>

        {/* What does he actually do? */}
        <section id="does" className="sec" aria-labelledby="does-q">
          <Question id="does" text={q('does')} />
          <div className="ans col">
            {PERSON.about.map((p, k) => <p className="body" data-rise key={k}>{p}</p>)}
            <p className="aside" data-rise>{PERSON.aside}</p>
          </div>
        </section>

        {/* Has he won anything? */}
        <section id="won" className="sec" aria-labelledby="won-q">
          <Question id="won" text={q('won')} />
          <p className="yes"><span className="yes-w">Yes.</span></p>
          {DEBATE.wins.map((w, k) => (
            <div className={`plate ${k % 2 ? 'plate-r' : ''}`} key={w.where}>
              <div className="champ-m">
                <h3 className="champ"><span className="champ-w">{w.title}</span></h3>
              </div>
              <div className="champ-d">
                <p className="champ-e">{w.event}</p>
                <p className="champ-p">{w.where}, {w.when}</p>
              </div>
            </div>
          ))}
          <div className="ans next-up" data-rise>
            <h3 className="sub">Up next</h3>
            <ul className="nx">
              {DEBATE.next.map((n) => (
                <li key={n.where}><span className="nx-w">{n.where}</span><span className="nx-e">{n.event}</span></li>
              ))}
            </ul>
          </div>
        </section>

        {/* Who does he coach? */}
        <section id="coach" className="sec" aria-labelledby="coach-q">
          <Question id="coach" text={q('coach')} />
          <div className="ans team">
            <div className="team-h" data-rise>
              <h3 className="team-n">{DEBATE.team.name}</h3>
              <p className="team-r">{DEBATE.team.role}</p>
            </div>
            <div className="team-b" data-rise>
              <p className="body">{DEBATE.team.line}</p>
              <p className="body">{DEBATE.team.record}</p>
              <p className="links">
                <Out href={DEBATE.team.href}>skeptical.pages.dev <Arrow /></Out>
                <Out href={DEBATE.team.github}>The code, on GitHub <Arrow /></Out>
              </p>
            </div>
          </div>
        </section>

        {/* What did he write? */}
        <section id="wrote" className="sec" aria-labelledby="wrote-q">
          <Question id="wrote" text={q('wrote')} />
          <div className="ans paper">
            <h3 className="p-title" data-rise>{PAPER.title}</h3>
            <p className="p-status" data-rise>{PAPER.status}, {PAPER.pages} pages. DOI {PAPER.doi}</p>
            <div className="p-grid">
              <div className="p-main" data-rise>
                <p className="body big">{PAPER.abstract}</p>
                <ul className="kw" aria-label="Keywords">
                  {PAPER.keywords.map((k) => <li key={k}>{k}</li>)}
                </ul>
                <p className="links">
                  {PAPER.links.map((l) => <Out key={l.label} href={l.href}>{l.label} <Arrow /></Out>)}
                </p>
              </div>
              <div className="p-side" data-rise>
                <blockquote className="epi">
                  <p>{PAPER.epigraph.text}</p>
                  <footer>{PAPER.epigraph.source}</footer>
                </blockquote>
                <h4 className="sub">Three ladders, one image</h4>
                <ol className="ladders">
                  {PAPER.ladders.map((l) => (
                    <li key={l.who}><span className="l-who">{l.who}</span><span className="l-meta">{l.when}. {l.where}</span></li>
                  ))}
                </ol>
              </div>
            </div>
            <div className="wesso" data-rise>
              <h4 className="w-title">{WESSO.title}</h4>
              <p className="body">{WESSO.abstract}</p>
              <p className="p-status">{WESSO.status}</p>
            </div>
          </div>
        </section>

        {/* What has he built? */}
        <section id="built" className="sec" aria-labelledby="built-q">
          <Question id="built" text={q('built')} />
          <Work />
        </section>

        {/* What is he shipping? */}
        <section id="shipping" className="sec" aria-labelledby="shipping-q">
          <Question id="shipping" text={q('shipping')} />
          <Shipping />
        </section>

        {/* What did he say on <day>? */}
        <section id="today" className="sec" aria-labelledby="today-q">
          <Question id="today" text={q('today')} key={todayQ} />
          <Today notes={notes} loaded={loaded} />
        </section>

        {/* What is he up to now? */}
        <section id="now" className="sec" aria-labelledby="now-q">
          <Question id="now" text={q('now')} />
          <div className="ans nowa">
            <div className="shelves" data-rise>
              <h3 className="subq">What is he reading<span className="qm-s">?</span></h3>
              <p className="sub">{NOW.reading.title}</p>
              <ul className="shelf">
                {NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}
              </ul>
              <p className="body">{NOW.reading.body}</p>
            </div>
            <div className="club" data-rise>
              <h3 className="subq">And the club<span className="qm-s">?</span></h3>
              <p className="sub">{NOW.club.title}</p>
              <p className="body">{NOW.club.body}</p>
              <p className="status">{NOW.status}</p>
            </div>
          </div>
        </section>

        {/* Anything else on the record? */}
        <section id="record" className="sec" aria-labelledby="record-q">
          <Question id="record" text={q('record')} />
          <div className="ans rec">
            <ol className="honors">
              {HONORS.map((h) => (
                <li key={h.what} data-rise><span className="h-w">{h.what}</span><span className="h-d">{h.detail}</span></li>
              ))}
            </ol>
            <div className="certs">
              {AWARDS.map((a) => (
                <a key={a.site} className="cert" href={a.href} target="_blank" rel="noreferrer" data-rise>
                  <img src={BASE + a.img} alt={`The certificate for ${a.site}`} width={720} height={1018} loading="lazy" />
                  <span className="cert-s">{a.site}</span>
                  <span className="cert-n">{a.note}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* And off the record? */}
        <section id="off" className="sec" aria-labelledby="off-q">
          <Question id="off" text={q('off')} />
          <div className="ans offr">
            {([['What does he like', LIKES], ['And dislike', DISLIKES], ['Favourites', FAVOURITES]] as const).map(([t, list]) => (
              <div key={t} className="off-c" data-rise>
                <h3 className="subq">{t}<span className="qm-s">?</span></h3>
                <ul>{list.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
            ))}
            <div className="off-c" data-rise>
              <h3 className="subq">Which courses<span className="qm-s">?</span></h3>
              <ul>{COURSES.map((c) => <li key={c.title}><span className="c-t">{c.provider} {c.title}</span> {c.note}</li>)}</ul>
            </div>
          </div>
        </section>

        {/* How do I reach him? */}
        <section id="reach" className="sec" aria-labelledby="reach-q">
          <Question id="reach" text={q('reach')} />
          <ul className="ans reach">
            {LINKS.map((l) => (
              <li key={l.label} data-rise>
                <span className="r-l">{l.label}</span>
                {l.href ? <Out href={l.href} className="lk r-v">{l.value}</Out> : <span className="r-v">{l.value}</span>}
              </li>
            ))}
          </ul>
        </section>

        <Ask />

        <div className="end">
          <p className="end-t">
            No further questions<span className="slot" aria-hidden="true"><span className="end-q">?</span><span className="end-dot">.</span></span>
            <span className="sr-only-x">.</span>
          </p>
        </div>
      </main>

      <footer className="foot">
        <p>Draft 9 of the portfolio. Not the live site.</p>
        <p>Set in Bodoni Moda and Instrument Sans.</p>
      </footer>
    </div>
  );
}
