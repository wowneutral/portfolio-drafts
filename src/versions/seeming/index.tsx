// Draft 87, The seeming. One switch, Says or Seems: every claim on the page is restated the way a Pyrrhonist
// reports, only what appears. The switch is remixed from React Bits Micro/RubberSegment (see Rubber.tsx).
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import '@fontsource/gloock/400.css';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import './seeming.css';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { getLenis } from '@/lib/scroll';
import { still } from '@/lib/utils';
import RubberSegment, { RubberAgree } from './Rubber';

type Voice = 'says' | 'seems';
const VoiceCtx = createContext<Voice>('says');
const KEY = 'seeming:voice';
const ITEMS = [
  { value: 'says', label: 'Says' },
  { value: 'seems', label: 'Seems' },
];

const src = (p: string) => import.meta.env.BASE_URL + p;
const host = (h: string) => h.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & {
  keywords: string[];
  ladders: { who: string; when: string; where: string }[];
  epigraph: { text: string; source: string };
  pages: number;
  doi: string;
};
const wess = RESEARCH[1];
const SHORT = PERSON.short.map((s) => s.replace(/\.$/, '').toLowerCase());
const ROLES = `a ${SHORT[0]}, ${SHORT[1]} and ${SHORT[2]}.`;

function readVoice(): Voice {
  try {
    return localStorage.getItem(KEY) === 'seems' ? 'seems' : 'says';
  } catch {
    return 'says';
  }
}

/** The verb in two voices. In Seems the changed words are violet; in Says the page is plain ink. */
function V({ s, m }: { s: string; m: string }) {
  const v = useContext(VoiceCtx);
  return v === 'seems' ? <span className="sm-c">{m}</span> : <>{s}</>;
}

/**
 * A claim, set in both voices in the same grid cell. The voice not in use is kept as an invisible ghost, so a flip
 * is one hard cut and the page never reflows.
 */
function Two({ as: Tag = 'p', className = '', id, children }: { as?: 'p' | 'h1' | 'h2' | 'h3'; className?: string; id?: string; children: ReactNode }) {
  const v = useContext(VoiceCtx);
  return (
    <Tag className={`sm-two ${className}`} id={id} data-anchor="">
      <span className="sm-v">{children}</span>
      <VoiceCtx.Provider value={v === 'says' ? 'seems' : 'says'}>
        <span className="sm-v sm-ghost" aria-hidden="true">
          {children}
        </span>
      </VoiceCtx.Provider>
    </Tag>
  );
}

/** His own words: never restated, always in quotation marks. */
function Q({ children, className = '', cite }: { children: ReactNode; className?: string; cite?: string }) {
  return (
    <figure className={`sm-q ${className}`}>
      <blockquote>{children}</blockquote>
      {cite && <figcaption>{cite}</figcaption>}
    </figure>
  );
}

function Switch({ voice, onVoice, size, className }: { voice: Voice; onVoice: (v: Voice) => void; size: 'lg' | 'xl' | 'hero'; className?: string }) {
  return (
    <RubberSegment
      items={ITEMS}
      value={voice}
      onChange={(v) => onVoice(v as Voice)}
      size={size}
      aria-label="Voice"
      className={className}
    />
  );
}

function Header({ voice, onVoice }: { voice: Voice; onVoice: (v: Voice) => void }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    let last = window.scrollY;
    const on = () => {
      const y = window.scrollY;
      const el = ref.current;
      if (!el) return;
      if (y < 160 || y < last - 4) el.dataset.out = 'no';
      else if (y > last + 4 && !el.contains(document.activeElement)) el.dataset.out = 'yes';
      last = y;
    };
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header ref={ref} className="sm-head" data-out="no" onFocus={() => ref.current && (ref.current.dataset.out = 'no')}>
      <a className="sm-brand" href="#top">
        {PERSON.name}
      </a>
      <nav className="sm-nav" aria-label="Sections">
        <a href="#debate">Debate</a>
        <a href="#work">Work</a>
        <a href="#research">Research</a>
        <a href="#today">Today</a>
        <a href="#contact">Contact</a>
      </nav>
      <Switch voice={voice} onVoice={onVoice} size="lg" className="sm-sw-head" />
    </header>
  );
}

function Hero({ voice, onVoice }: { voice: Voice; onVoice: (v: Voice) => void }) {
  return (
    <section className="sm-hero" id="top" aria-labelledby="sm-h1">
      <Two as="h1" id="sm-h1" className="sm-h1">
        {PERSON.name} <V s="is" m="appears to be" /> {ROLES}
      </Two>
      <div className="sm-hero-sw">
        <Switch voice={voice} onVoice={onVoice} size="hero" className="sm-sw-hero" />
        <p className="sm-hint">Speak like a skeptic.</p>
      </div>
      <Q className="sm-q-line">{PERSON.line}</Q>
      <nav className="sm-index" aria-label="On this page">
        <a href="#about">About</a>
        <a href="#debate">Debate</a>
        <a href="#work">Work</a>
        <a href="#github">GitHub</a>
        <a href="#research">Research</a>
        <a href="#today">Today</a>
        <a href="#record">Record</a>
        <a href="#contact">Contact</a>
      </nav>
    </section>
  );
}

function About() {
  return (
    <section className="sm-sec sm-about" id="about" aria-labelledby="sm-about-h">
      <Two as="h2" id="sm-about-h" className="sm-h2">
        He <V s="started" m="appears to have started" /> debating in 2023.
      </Two>
      <div className="sm-about-body">
        <Q className="sm-q-long">
          {PERSON.about.map((p) => (
            <p key={p.slice(0, 12)}>{p}</p>
          ))}
        </Q>
        <p className="sm-aside">{PERSON.aside}</p>
      </div>
    </section>
  );
}

function Debate({ voice, onVoice }: { voice: Voice; onVoice: (v: Voice) => void }) {
  const t = DEBATE.team;
  return (
    <section className="sm-sec sm-debate" id="debate" aria-labelledby="sm-debate-h">
      <div className="sm-debate-top">
        <Two as="h2" id="sm-debate-h" className="sm-h2 sm-both">
          <V s="He" m="It appears that he" /> won both.
        </Two>
        <div className="sm-debate-sw">
          <Switch voice={voice} onVoice={onVoice} size="xl" />
          <p className="sm-hint">A title is a record, not a claim.</p>
        </div>
      </div>
      <ol className="sm-wins">
        {DEBATE.wins.map((w) => (
          <li key={w.where} className="sm-win">
            <p className="sm-win-title">{w.title}</p>
            <p className="sm-win-event">{w.event}</p>
            <p className="sm-win-where">
              {w.where}, {w.when}
            </p>
          </li>
        ))}
      </ol>

      <div className="sm-team">
        <div className="sm-team-name">
          <h3 className="sm-team-h">{t.name}</h3>
          <p className="sm-label">{t.role}</p>
        </div>
        <div className="sm-team-body">
          <Two className="sm-claim">
            He <V s="founded" m="appears to have founded" /> {t.name}, and <V s="coaches" m="appears to coach" /> it.
          </Two>
          <Q>{t.line}</Q>
          <p className="sm-record-line">{t.record}</p>
          <a className="sm-go" href={t.href}>
            {host(t.href)}
          </a>
        </div>
      </div>

      <div className="sm-next">
        <Two as="h3" className="sm-h3">
          Up next, he <V s="is getting" m="appears to be getting" /> ready for these.
        </Two>
        <ul className="sm-next-list">
          {DEBATE.next.map((n) => (
            <li key={n.where}>
              <span className="sm-next-where">{n.where}</span>
              <span className="sm-next-event">{n.event}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const WORK_CLAIM: Record<string, [string, string, string]> = {
  mitez: ['designed, built and deployed', 'appears to have designed, built and deployed', 'the site for his nonprofit.'],
  skeptical: ['built', 'appears to have built', 'the site for the team he coaches.'],
  lastseen: ['told', 'appears to have told', 'a short story as a website.'],
  lastsearch: ['told', 'appears to have told', 'a second story in the same spirit.'],
  spread: ['built', 'appears to have built', 'a drill tool for his own practice.'],
  rogue: ['tested', 'appears to have tested', 'how far an AI can carry a build.'],
  jarvis: ['built', 'appears to have built', 'a desktop assistant that runs his machine.'],
  drafts: ['built', 'appears to have built', 'a hundred versions of one site.'],
};

function Work() {
  return (
    <section className="sm-sec sm-work" id="work" aria-labelledby="sm-work-h">
      <Two as="h2" id="sm-work-h" className="sm-h2">
        He <V s="makes" m="appears to make" /> websites, tools and software.
      </Two>
      <ol className="sm-spreads">
        {WORK.map((w, i) => {
          const c = WORK_CLAIM[w.slug];
          const img = <img src={src(w.img)} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={660} />;
          return (
            <li key={w.slug} className={`sm-spread ${i % 2 ? 'is-r' : ''}`}>
              {w.href ? (
                <a className="sm-shot" href={w.href} tabIndex={-1} aria-hidden="true">
                  {img}
                </a>
              ) : (
                <div className="sm-shot">{img}</div>
              )}
              <div className="sm-spread-text">
                <p className="sm-label">{w.kind}</p>
                <h3 className="sm-work-name">{w.name}</h3>
                <Two className="sm-claim">
                  He <V s={c[0]} m={c[1]} /> {c[2]}
                </Two>
                <Q>{w.line}</Q>
                <p className="sm-stack">{w.stack}</p>
                {w.href && (
                  <a className="sm-go" href={w.href}>
                    {host(w.href)}
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function GitHub() {
  const { repos, activity, live } = useGitHub();
  const rows = activity.slice(0, 7);
  return (
    <section className="sm-sec sm-gh" id="github" aria-labelledby="sm-gh-h">
      <Two as="h2" id="sm-gh-h" className="sm-h2">
        Live from GitHub, he <V s="is" m="appears to be" /> pushing to these.
      </Two>
      <div className={`sm-gh-grid ${rows.length ? '' : 'is-quiet'}`}>
        {rows.length > 0 && (
          <div className="sm-commits">
            <h3 className="sm-label">Latest commits</h3>
            <ol>
              {rows.map((a) => (
                <li key={a.href}>
                  <a href={a.href}>{a.message}</a>
                  <span className="sm-commit-meta">
                    {a.repo}, {ago(a.at)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
        <div className="sm-repos">
          <h3 className="sm-label">{live ? 'Repositories, most recent first' : 'Repositories'}</h3>
          <ol>
            {repos.slice(0, rows.length ? 6 : 4).map((r) => (
              <li key={r.name}>
                <a className="sm-repo" href={r.href}>
                  {r.name}
                </a>
                {r.description && <span className="sm-repo-d">{r.description}</span>}
                {r.language && <span className="sm-repo-l">{r.language}</span>}
              </li>
            ))}
          </ol>
          <a className="sm-go" href={GITHUB.href}>
            {host(GITHUB.href)}
          </a>
        </div>
      </div>
    </section>
  );
}

function Research() {
  const [rung, setRung] = useState('2');
  const ladders = paper.ladders;
  const items = ladders.map((l, i) => ({ value: String(i), label: l.who.split(' ')[i === 0 ? 0 : 1] }));
  return (
    <section className="sm-sec sm-research" id="research" aria-labelledby="sm-res-h">
      <Two as="h2" id="sm-res-h" className="sm-h2">
        He <V s="wrote" m="appears to have written" /> a paper on how a skeptic can criticise language using language.
      </Two>
      <div className="sm-paper">
        <h3 className="sm-paper-title">{paper.title}</h3>
        <p className="sm-paper-meta">
          {paper.status}. {paper.pages} pages. DOI {paper.doi}
        </p>
      </div>
      <figure className="sm-epi">
        <blockquote>{paper.epigraph.text}</blockquote>
        <figcaption>{paper.epigraph.source}</figcaption>
      </figure>
      <div className="sm-abs">
        <Q cite="The abstract">{paper.abstract}</Q>
        <div className="sm-kw">
          <h4 className="sm-label">Keywords</h4>
          <ul>
            {paper.keywords.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="sm-ladder">
        <div className="sm-ladder-head">
          <Two as="h3" className="sm-h3">
            The paper <V s="follows" m="appears to follow" /> one ladder through three writers.
          </Two>
          <RubberSegment items={items} value={rung} onChange={setRung} size="xl" equalSlots={false} aria-label="Ladder" className="sm-sw-ladder" />
        </div>
        <ol className="sm-rungs" reversed>
          {ladders
            .map((l, i) => ({ l, i }))
            .reverse()
            .map(({ l, i }) => (
              <li key={l.who} className={`sm-rung ${String(i) === rung ? 'is-on' : ''}`}>
                <span className="sm-rung-when">{l.when}</span>
                <span className="sm-rung-who">{l.who}</span>
                <span className="sm-rung-where">{l.where}</span>
              </li>
            ))}
        </ol>
      </div>

      <ul className="sm-paper-links">
        {paper.links.map((l) => (
          <li key={l.href}>
            <a href={l.href}>{l.label}</a>
          </li>
        ))}
      </ul>

      <div className="sm-wess">
        <Two as="h3" className="sm-h3">
          He <V s="translated" m="appears to have translated" /> one of the earliest surviving poems in Old High German.
        </Two>
        <div>
          <p className="sm-wess-title">{wess.title}</p>
          <p className="sm-label">{wess.status}</p>
          <Q>{wess.abstract}</Q>
        </div>
      </div>
    </section>
  );
}

function Today() {
  const { notes, loaded } = useNotes();
  const [pick, setPick] = useState(0);
  const note = notes[pick] ?? notes[0];
  return (
    <section className="sm-sec sm-today" id="today" aria-labelledby="sm-today-h">
      <Two as="h2" id="sm-today-h" className="sm-h2">
        Today, he <V s="writes" m="appears to write" /> a note. Every day.
      </Two>
      <div className="sm-today-grid">
        {note ? (
          <article className="sm-note" aria-live="polite">
            <p className="sm-note-date">
              <time dateTime={note.date}>{formatDate(note.date)}</time>
            </p>
            <Q className="sm-q-note">
              {note.body.map((p) => (
                <p key={p.slice(0, 16)}>{p}</p>
              ))}
            </Q>
          </article>
        ) : (
          <article className="sm-note">
            <p className="sm-note-date">{loaded ? 'No note yet today' : 'Today'}</p>
            <p className="sm-note-wait">{loaded ? 'The next one goes up here.' : 'Opening the notebook.'}</p>
          </article>
        )}
        {notes.length > 1 && (
          <div className="sm-dates">
            <h3 className="sm-label">Every note</h3>
            <ul>
              {notes.map((n, i) => (
                <li key={n.date}>
                  <button type="button" aria-pressed={i === pick} onClick={() => setPick(i)}>
                    {formatDate(n.date)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function Now() {
  return (
    <section className="sm-sec sm-now" id="now" aria-labelledby="sm-now-h">
      <Two as="h2" id="sm-now-h" className="sm-h2">
        Right now he <V s="is getting" m="appears to be getting" /> into literature.
      </Two>
      <ul className="sm-shelves" aria-label="Shelves">
        {NOW.reading.shelves.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <div className="sm-now-grid">
        <Q>{NOW.reading.body}</Q>
        <div>
          <Two as="h3" className="sm-h3 sm-h3-s">
            He <V s="is starting" m="appears to be starting" /> a philosophy club.
          </Two>
          <Q>{NOW.club.body}</Q>
        </div>
        <Q className="sm-status">{NOW.status}</Q>
      </div>
    </section>
  );
}

function Record() {
  return (
    <section className="sm-sec sm-record" id="record" aria-labelledby="sm-rec-h">
      <Two as="h2" id="sm-rec-h" className="sm-h2">
        On the record, he <V s="has been" m="appears to have been" /> recognised for these.
      </Two>
      <div className="sm-record-grid">
        <ol className="sm-honors">
          {HONORS.map((h) => (
            <li key={h.what}>
              <span className="sm-honor">{h.what}</span>
              <span className="sm-honor-d">{h.detail}</span>
            </li>
          ))}
        </ol>
        <ul className="sm-certs">
          {AWARDS.map((a) => (
            <li key={a.href}>
              <a href={a.href} className="sm-cert">
                <img src={src(a.img)} alt={`Certificate for ${a.site}`} loading="lazy" width={720} height={1018} />
                <span className="sm-cert-site">{a.site}</span>
                <span className="sm-cert-note">{a.note}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Off() {
  return (
    <section className="sm-sec sm-off" id="off" aria-labelledby="sm-off-h">
      <h2 className="sm-h2" id="sm-off-h">
        Off the record.
      </h2>
      <div className="sm-off-grid">
        <div>
          <Two as="h3" className="sm-h3 sm-h3-s">
            He <V s="likes" m="appears to like" />
          </Two>
          <ul>
            {LIKES.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div>
          <Two as="h3" className="sm-h3 sm-h3-s">
            He <V s="dislikes" m="appears to dislike" />
          </Two>
          <ul>
            {DISLIKES.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div>
          <Two as="h3" className="sm-h3 sm-h3-s">
            His favourites <V s="are" m="appear to be" />
          </Two>
          <ul>
            {FAVOURITES.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div>
          <Two as="h3" className="sm-h3 sm-h3-s">
            He <V s="has taken" m="appears to have taken" />
          </Two>
          <ul>
            {COURSES.map((c) => (
              <li key={c.title}>
                {c.provider}, {c.title}. <span className="sm-dim">{c.note}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Contact() {
  const ref = useRef<HTMLDivElement>(null);
  const [agree, setAgree] = useState(still);
  useEffect(() => {
    if (still || !ref.current) return;
    const io = new IntersectionObserver(([e]) => setAgree(e.isIntersecting), { threshold: 0.6 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <section className="sm-sec sm-contact" id="contact" aria-labelledby="sm-contact-h">
      <div className="sm-agree" ref={ref}>
        <RubberAgree items={['Says', 'Seems']} on={agree} size="hero" className="sm-sw-agree" />
        <p className="sm-hint">Here both voices say the same thing.</p>
      </div>
      <h2 className="sm-write" id="sm-contact-h">
        Write to him.
      </h2>
      <ul className="sm-links">
        {LINKS.map((l) => (
          <li key={l.label}>
            <span className="sm-label">{l.label}</span>
            {l.href ? <a href={l.href}>{l.value}</a> : <span className="sm-link-plain">{l.value}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Seeming() {
  useVersion('seeming', { anchorOffset: -72 });
  const [voice, setVoice] = useState<Voice>(readVoice);
  const hold = useRef<{ el: Element; top: number } | null>(null);

  const onVoice = (next: Voice) => {
    // Keep the reader's place: remember the claim nearest the top of the view.
    const head = 70;
    const el = [...document.querySelectorAll('.v-seeming [data-anchor]')].find((e) => e.getBoundingClientRect().bottom > head);
    hold.current = el ? { el, top: el.getBoundingClientRect().top } : null;
    setVoice(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* storage blocked: the page still works, in Says next time */
    }
  };

  useLayoutEffect(() => {
    const h = hold.current;
    hold.current = null;
    if (!h) return;
    const d = h.el.getBoundingClientRect().top - h.top;
    if (Math.abs(d) < 1) return;
    const y = window.scrollY + d;
    const l = getLenis();
    if (l) l.scrollTo(y, { immediate: true });
    else window.scrollTo(0, y);
  }, [voice]);

  return (
    <VoiceCtx.Provider value={voice}>
      <div className="v-seeming" data-voice={voice}>
        <a className="skip-x" href="#main">
          Skip to content
        </a>
        <Header voice={voice} onVoice={onVoice} />
        <main id="main">
          <Hero voice={voice} onVoice={onVoice} />
          <About />
          <Debate voice={voice} onVoice={onVoice} />
          <Work />
          <GitHub />
          <Research />
          <Today />
          <Now />
          <Record />
          <Off />
          <Contact />
        </main>
        <footer className="sm-foot">
          <p>Draft 87 of the portfolio. Not the live site.</p>
          <p>The switch is remixed from React Bits RubberSegment.</p>
        </footer>
      </div>
    </VoiceCtx.Provider>
  );
}
