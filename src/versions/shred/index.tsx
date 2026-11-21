// Draft 86, The shred. Built on React Bits Micro/Shredder (MIT + Commons Clause), see Shredder.tsx.
// His paper asks how you can attack language using language: feed his question through the slot and it comes out in strips, still asking.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowUpRight } from 'lucide-react';
import '@fontsource-variable/oswald';
import '@fontsource-variable/newsreader';
import '@fontsource-variable/newsreader/wght-italic.css';
import './shred.css';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK, CHAPTERS } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import Shredder, { type Cut } from './Shredder';
import { fonts, lay, texture, COBALT, type Spec } from './paper';

const src = (p: string) => import.meta.env.BASE_URL + p;
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { epigraph: { text: string; source: string }; keywords: string[]; ladders: { who: string; when: string; where: string }[]; pages: number };
const wess = RESEARCH[1];
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/\/$/, '');
const QUESTION = paper.abstract.split('?')[0] + '?';
const DEBATE_TITLE = CHAPTERS.find((c) => c.id === 'debate')!.title;
const NAV = [['debate', 'Debate'], ['research', 'Paper'], ['work', 'Work'], ['today', 'Today'], ['contact', 'Contact']] as const;

const Q: Spec = { id: 'question', label: 'From the abstract', big: QUESTION, foot: `${PERSON.name}, ${paper.short}`, text: QUESTION };
const LADDERS: Spec[] = paper.ladders.map((l, i) => ({
  id: `ladder-${i}`,
  label: `The ladder, ${['first', 'second', 'third'][i]}`,
  big: l.who,
  display: true,
  lines: [l.when, l.where],
  foot: paper.short,
  text: `${l.who}, ${l.when}, ${l.where}`,
}));
const ALL = [Q, ...LADDERS];

// Every sheet cut during the visit, for the closing tray.
const cuts = new Map<string, Cut>();
const subs = new Set<() => void>();
let version = 0;
const addCut = (c: Cut) => {
  cuts.set(c.id, c);
  version += 1;
  subs.forEach((f) => f());
};
const useCuts = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => version,
  );

const Out = ({ href, children, className = 'sh-link' }: { href: string; children: React.ReactNode; className?: string }) => (
  <a className={className} href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">
    {children}
    <ArrowUpRight aria-hidden="true" size={18} strokeWidth={2} />
  </a>
);

function Hero() {
  const [cut, setCut] = useState(false);
  return (
    <section className="sh-hero" aria-labelledby="sh-name">
      <div className="sh-hero-text">
        <h1 id="sh-name" className="sh-name">
          <span>Armaan</span> <span>Seth</span>
        </h1>
        <p className="sh-line">{PERSON.line}</p>
        <div className="sh-after" aria-live="polite">
          {!cut ? (
            <p className="sh-cue">Feed it in.</p>
          ) : (
            <>
              <p className="sh-still">You cut it to pieces.</p>
              <p className="sh-still">It is still asking.</p>
              <a className="sh-link" href="#research">The paper that asks it</a>
            </>
          )}
        </div>
      </div>
      <div className="sh-hero-stage">
        <p className="sr-only-x">{Q.text}</p>
        <Shredder
          specs={[Q]}
          tray="single"
          label="Feed the sheet in"
          onShred={(c) => {
            addCut(c);
            setCut(true);
          }}
        />
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="sh-sec sh-about" id="about" aria-labelledby="about-h">
      <h2 id="about-h" className="sh-h2">About</h2>
      <div className="sh-sheet-flat sh-about-sheet">
        {PERSON.about.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <p className="sh-aside">{PERSON.aside}</p>
    </section>
  );
}

function Debate() {
  const t = DEBATE.team;
  return (
    <section className="sh-sec sh-debate" id="debate" aria-labelledby="debate-h">
      <h2 id="debate-h" className="sh-h2">{DEBATE_TITLE}</h2>
      <div className="sh-wins">
        {DEBATE.wins.map((w, i) => (
          <article key={w.where} className={`sh-sheet-flat sh-win sh-tilt-${i}`}>
            <p className="sh-win-when">{w.when}</p>
            <h3 className="sh-win-title">{w.title}</h3>
            <p className="sh-win-event">{w.event}</p>
            <p className="sh-win-where">{w.where}</p>
          </article>
        ))}
      </div>
      <div className="sh-team-row">
        <article className="sh-sheet-flat sh-team">
          <p className="sh-small">{t.role}</p>
          <h3 className="sh-team-name">{t.name}</h3>
          <p className="sh-team-line">{t.line}</p>
          <p className="sh-team-record">{t.record}</p>
          <Out href={t.href}>{host(t.href)}</Out>
        </article>
        <div className="sh-next">
          <h3 className="sh-h3">Up next</h3>
          <ul>
            {DEBATE.next.map((n) => (
              <li key={n.where}>
                <span className="sh-next-where">{n.where}</span>
                <span className="sh-next-event">{n.event}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Research() {
  const [n, setN] = useState(0);
  return (
    <section className="sh-sec sh-research" id="research" aria-labelledby="research-h">
      <p className="sh-small">{paper.status}, {paper.pages} pages</p>
      <h2 id="research-h" className="sh-paper-title">{paper.title}</h2>
      <blockquote className="sh-epigraph">
        <p>{paper.epigraph.text}</p>
        <footer>{paper.epigraph.source}</footer>
      </blockquote>
      <p className="sh-cue sh-cue-ladder">{n < 3 ? 'Three ladders. Feed them through, one at a time.' : 'All three ladders cut. The paper is still standing.'}</p>
      <div className="sr-only-x">
        {LADDERS.map((l) => (
          <p key={l.id}>{l.text}</p>
        ))}
        {n < 1 && <p>{paper.abstract}</p>}
        {n < 2 && <p>Keywords: {paper.keywords.join(', ')}</p>}
      </div>
      <Shredder specs={LADDERS} tray="ladder" label="Feed this ladder in" onShred={(c, k) => { addCut(c); setN(k + 1); }} className="sh-ladder-stage" />
      <div className="sh-parts">
        <div className="sh-part">
          {n >= 1 && (
            <>
              <h3 className="sh-h3">Abstract</h3>
              <p>{paper.abstract}</p>
            </>
          )}
        </div>
        <div className="sh-part">
          {n >= 2 && (
            <>
              <h3 className="sh-h3">Keywords</h3>
              <ul className="sh-keys">
                {paper.keywords.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div className="sh-part">
          <h3 className="sh-h3">Read it</h3>
          <ul className="sh-paper-links">
            {paper.links.map((l) => (
              <li key={l.href}>
                <Out href={l.href}>{l.label}</Out>
              </li>
            ))}
          </ul>
          <p className="sh-doi">DOI {paper.doi}</p>
        </div>
      </div>
      <article className="sh-sheet-flat sh-wess">
        <p className="sh-small">{wess.status}</p>
        <h3 className="sh-wess-title">{wess.title}</h3>
        <p>{wess.abstract}</p>
      </article>
    </section>
  );
}

function Work() {
  return (
    <section className="sh-sec sh-work" id="work" aria-labelledby="work-h">
      <h2 id="work-h" className="sh-h2">Built</h2>
      <ul className="sh-spread">
        {WORK.map((w, i) => (
          <li key={w.slug} className={`sh-sheet-flat sh-print sh-p${i % 4}`}>
            <img src={src(w.img)} alt={`${w.name}, screenshot`} width={1200} height={750} loading="lazy" decoding="async" />
            <div className="sh-print-text">
              <p className="sh-small">{w.kind}</p>
              <h3 className="sh-print-name">{w.name}</h3>
              <p>{w.line}</p>
              <p className="sh-stack">{w.stack}</p>
              {w.href ? <Out href={w.href}>{host(w.href)}</Out> : <p className="sh-stack">No public link</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Today() {
  const { notes, loaded } = useNotes();
  const [open, setOpen] = useState<string | null>(null);
  const latest = notes[0];
  const earlier = notes.slice(1, 9);
  return (
    <section className="sh-today" id="today" aria-labelledby="today-h">
      <h2 id="today-h" className="sh-h2">Today</h2>
      <article className="sh-sheet-flat sh-note">
        {!loaded ? (
          <p className="sh-note-wait">Today’s note is on its way.</p>
        ) : latest ? (
          <>
            <p className="sh-note-date"><time dateTime={latest.date}>{formatDate(latest.date)}</time></p>
            {latest.body.map((p, i) => (
              <p key={i} className="sh-note-body">{p}</p>
            ))}
          </>
        ) : (
          <p className="sh-note-body">{NOW.status}</p>
        )}
      </article>
      {earlier.length > 0 && (
        <ul className="sh-earlier" aria-label="Earlier notes">
          {earlier.map((n) => {
            const on = open === n.date;
            return (
              <li key={n.date} className="sh-sheet-flat sh-old">
                <button type="button" className="sh-old-btn" aria-expanded={on} onClick={() => setOpen(on ? null : n.date)}>
                  <time dateTime={n.date}>{formatDate(n.date)}</time>
                  <span aria-hidden="true">{on ? 'Close' : 'Open'}</span>
                </button>
                {on && <div className="sh-old-body">{n.body.map((p, i) => <p key={i}>{p}</p>)}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function GitHub() {
  const { repos, activity } = useGitHub();
  return (
    <section className="sh-gh" id="github" aria-labelledby="gh-h">
      <h2 id="gh-h" className="sh-h2">Live from GitHub</h2>
      <div className="sh-sheet-flat sh-roll">
        {activity.length > 0 && (
          <>
            <h3 className="sh-h3">Latest commits</h3>
            <ul className="sh-commits">
              {activity.slice(0, 6).map((a) => (
                <li key={a.href}>
                  <a href={a.href} target="_blank" rel="noreferrer" className="sh-commit">{a.message}</a>
                  <span className="sh-commit-meta">{a.repo}, {ago(a.at)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        <h3 className="sh-h3">Repositories</h3>
        <ul className="sh-repos">
          {repos.slice(0, 6).map((r) => (
            <li key={r.name}>
              <a href={r.href} target="_blank" rel="noreferrer" className="sh-repo">{r.name}</a>
              {r.description && <p>{r.description}</p>}
              {r.language && <span className="sh-commit-meta">{r.language}</span>}
            </li>
          ))}
        </ul>
        <Out href={GITHUB.href}>{host(GITHUB.href)}</Out>
      </div>
    </section>
  );
}

function Now() {
  return (
    <section className="sh-sec sh-now" id="now" aria-labelledby="now-h">
      <h2 id="now-h" className="sh-h2">Now</h2>
      <p className="sh-status">{NOW.status}</p>
      <div className="sh-now-grid">
        <div>
          <h3 className="sh-h3">{NOW.reading.title}</h3>
          <p>{NOW.reading.body}</p>
          <ul className="sh-shelves">
            {NOW.reading.shelves.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="sh-h3">{NOW.club.title}</h3>
          <p>{NOW.club.body}</p>
        </div>
      </div>
    </section>
  );
}

function Record() {
  return (
    <section className="sh-sec sh-record" id="record" aria-labelledby="record-h">
      <h2 id="record-h" className="sh-h2">Record</h2>
      <div className="sh-record-grid">
        <ol className="sh-sheet-flat sh-honors">
          {HONORS.map((h) => (
            <li key={h.what}>
              <span>{h.what}</span>
              <span className="sh-honor-d">{h.detail}</span>
            </li>
          ))}
        </ol>
        <div className="sh-certs">
          {AWARDS.map((a, i) => (
            <a key={a.href} href={a.href} target="_blank" rel="noreferrer" className={`sh-cert sh-tilt-${i}`}>
              <img src={src(a.img)} alt={`Certificate, ${a.site}`} width={600} height={850} loading="lazy" />
              <span className="sh-cert-cap">{a.site}<br /><span>{a.note}</span></span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function Off() {
  const cols = [['Likes', LIKES], ['Dislikes', DISLIKES], ['Favourites', FAVOURITES]] as const;
  return (
    <section className="sh-sec sh-off" id="off" aria-labelledby="off-h">
      <h2 id="off-h" className="sh-h2">Off the record</h2>
      <div className="sh-off-grid">
        {cols.map(([t, list]) => (
          <div key={t}>
            <h3 className="sh-h3">{t}</h3>
            <ul>
              {list.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h3 className="sh-h3">Courses</h3>
          <ul>
            {COURSES.map((c) => (
              <li key={c.title}>
                <strong>{c.provider} {c.title}</strong>. {c.note}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** The closing tray: every sheet, cut ones as their strips, uncut ones whole. */
function Tray() {
  const v = useCuts();
  const ref = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const el = box.current!;
    const ro = new ResizeObserver(() => setW(el.offsetWidth));
    ro.observe(el);
    fonts().then(() => setOk(true));
    return () => ro.disconnect();
  }, []);
  const narrow = w < 560;
  const GAPU = 30;
  const unitW = narrow ? 640 : 960;
  const k = w / unitW;
  type Block = { spec: Spec; x: number; y: number; bw: number; bh: number; l: ReturnType<typeof lay>; cut?: Cut };
  const blocks: Block[] = [];
  if (ok && w) {
    const size = (spec: Spec, bw: number, sc: number) => {
      const l = lay(spec, bw, sc);
      const cut = cuts.get(spec.id);
      const bh = cut ? (cut.H * bw) / (cut.W + 3 * (cut.strips.length - 1)) : l.H;
      return { l, cut, bh };
    };
    const qw = narrow ? unitW : 780;
    const q = size(Q, qw, 1);
    blocks.push({ spec: Q, x: (unitW - qw) / 2, y: 0, bw: qw, ...q });
    let y = q.bh + GAPU;
    if (narrow) {
      LADDERS.forEach((sp) => {
        const b = size(sp, unitW, 1.2);
        blocks.push({ spec: sp, x: 0, y, bw: unitW, ...b });
        y += b.bh + GAPU;
      });
    } else {
      const lw = 300;
      const row = LADDERS.map((sp) => size(sp, lw, 0.86));
      row.forEach((b, i) => blocks.push({ spec: LADDERS[i], x: (unitW - (lw * 3 + GAPU * 2)) / 2 + i * (lw + GAPU), y, bw: lw, ...b }));
    }
  }
  const h = blocks.length ? Math.ceil(k * blocks.reduce((a, b) => Math.max(a, b.y + b.bh), 0) + 16) : 0;
  useEffect(() => {
    const c = ref.current;
    if (!c || !blocks.length || !w) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.ceil(w * dpr);
    c.height = Math.ceil(h * dpr);
    const ctx = c.getContext('2d')!;
    for (const { x, y, bw, l, cut } of blocks) {
      ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0);
      ctx.translate(x, y + 4);
      if (!cut) {
        ctx.save();
        ctx.shadowColor = 'rgba(18,18,18,0.14)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;
        ctx.fillStyle = '#fcfcfa';
        ctx.fillRect(0, 0, l.W, l.H);
        ctx.restore();
        const t = texture(l, dpr * k * 1.2);
        ctx.drawImage(t, 0, 0, l.W, l.H);
        continue;
      }
      const f = bw / (cut.W + 3 * (cut.strips.length - 1));
      ctx.scale(f, f);
      cut.strips.forEach((p, i) => {
        ctx.save();
        ctx.translate(p.x + i * 3 + p.w / 2, p.dy);
        ctx.rotate(-p.th);
        ctx.shadowColor = 'rgba(18,18,18,0.16)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = '#fcfcfa';
        ctx.fillRect(-p.w / 2, 0, p.w, cut.H);
        ctx.shadowColor = 'transparent';
        ctx.drawImage(cut.tex, p.x * cut.ts, 0, p.w * cut.ts, cut.H * cut.ts, -p.w / 2, 0, p.w, cut.H);
        ctx.fillStyle = COBALT;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(-p.w / 2, 0, 1, cut.H);
        ctx.fillRect(p.w / 2 - 1, 0, 1, cut.H);
        ctx.globalAlpha = 1;
        ctx.restore();
      });
    }
  });
  const n = ALL.filter((s) => cuts.has(s.id)).length;
  return (
    <div className="sh-final" ref={box}>
      <canvas ref={ref} className="sh-final-canvas" style={{ height: h }} aria-hidden="true" data-v={v} />
      <p className="sh-final-line">{n === 0 ? 'Nothing cut yet. Every sheet is still whole, and still asking.' : n === ALL.length ? 'Everything you cut on the way down. It still reads.' : 'What you cut on the way down, beside what you left whole. It all still reads.'}</p>
    </div>
  );
}

function Contact() {
  return (
    <section className="sh-sec sh-contact" id="contact" aria-labelledby="contact-h">
      <h2 id="contact-h" className="sh-h2">Contact</h2>
      <div className="sh-contact-grid">
        <Tray />
        <div className="sh-sheet-flat sh-card">
          <h3 className="sh-card-name">{PERSON.name}</h3>
          <ul className="sh-contacts">
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="sh-small">{l.label}</span>
                {l.href ? <Out href={l.href} className="sh-contact-link">{l.value}</Out> : <span className="sh-contact-plain">{l.value}</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default function ShredPage() {
  useVersion('shred');
  return (
    <div className="v-shred">
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="sh-top">
        <a href="#main" className="sh-mark">A. Seth</a>
        <nav aria-label="Sections">
          <ul>
            {NAV.map(([id, l]) => (
              <li key={id}>
                <a href={`#${id}`}>{l}</a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main">
        <Hero />
        <About />
        <Debate />
        <Research />
        <Work />
        <div className="sh-sec sh-daily">
          <Today />
          <GitHub />
        </div>
        <Now />
        <Record />
        <Off />
        <Contact />
      </main>
      <footer className="sh-foot">
        <p>Draft 86 of the portfolio. Not the live site.</p>
        <p>The feed is adapted from the Shredder in React Bits. Set in Oswald and Newsreader.</p>
      </footer>
    </div>
  );
}
