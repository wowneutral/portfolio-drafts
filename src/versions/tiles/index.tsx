// Draft 44: the tiles. His eight projects hang as tall grey slices (after pmndrs/examples horizontal-tiles, MIT);
// the one you point at, or the one the scroll reaches, opens wide in colour. The slice is the page's one shape.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/big-shoulders-display';
import '@fontsource-variable/instrument-sans';
import './tiles.css';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago, type GitHubData } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { gsap, ScrollTrigger, scrollToId, useGSAP } from '@/lib/scroll';
import { clamp, coarse, isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { FOCAL, useTiles } from './store';

const Strip = lazy(() => import('./Strip'));
const BASE = import.meta.env.BASE_URL;
const N = WORK.length;

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const host = (href: string) => href.replace(/^https:\/\//, '').replace(/\/$/, '');
const ext = (href: string) => (href.startsWith('http') ? { rel: 'noopener' } : {});
const jump = (i: number) => scrollToId('p-' + WORK[i].slug);
const SIZE: Record<string, [number, number]> = { drafts: [1200, 766], jarvis: [1200, 852], lastsearch: [1200, 692], lastseen: [1200, 670], mitez: [1200, 660], rogue: [1200, 662], skeptical: [1200, 660], spread: [1200, 660] };
const pos = (slug: string) => { const [x, y] = FOCAL[slug]; return `${x * 100}% ${y * 100}%`; };

/** The open project's line. When it changes, the next one pushes it out sideways. */
function OpenName({ i }: { i: number }) {
  const [shown, setShown] = useState({ cur: i, prev: -1, dir: 1 });
  useEffect(() => {
    setShown((s) => (s.cur === i ? s : { cur: i, prev: still ? -1 : s.cur, dir: i > s.cur ? 1 : -1 }));
    const id = setTimeout(() => setShown((s) => (s.prev < 0 ? s : { ...s, prev: -1 })), 700);
    return () => clearTimeout(id);
  }, [i]);
  const line = (k: number, cls: string, onEnd?: () => void) => {
    const w = WORK[k];
    return (
      <p key={k + cls} className={'nm ' + cls} aria-hidden={cls.includes('out') || undefined} onAnimationEnd={onEnd}>
        <span className="nm-n">{w.n}</span>
        <span className="nm-name">{w.name}</span>
        <span className="nm-kind">{w.kind}</span>
      </p>
    );
  };
  const d = shown.dir > 0 ? 'r' : 'l';
  return (
    <div className="nmbox" aria-live="polite">
      {shown.prev >= 0 && line(shown.prev, 'out-' + d, () => setShown((s) => ({ ...s, prev: -1 })))}
      {line(shown.cur, shown.prev >= 0 ? 'in-' + d : '')}
    </div>
  );
}

/** One tick per recent commit (the newest tallest); with none, one per repo. */
function Ticks({ gh, big }: { gh: GitHubData; big?: boolean }) {
  const items = gh.activity.length ? gh.activity.map((a) => a.at) : GITHUB.repos.map(() => '');
  const n = items.length;
  const step = big ? (n > 6 ? 18 : 34) : 9;
  const H = big ? 150 : 34;
  return (
    <svg className={big ? 'ticks big' : 'ticks'} width={(n - 1) * step + 4} height={H} viewBox={`0 0 ${(n - 1) * step + 4} ${H}`} aria-hidden="true" focusable="false">
      {items.map((_, i) => {
        const h = H * (0.32 + 0.68 * (1 - i / Math.max(1, n)));
        return <rect key={i} x={i * step} y={H - h} width={big ? 4 : i === 0 ? 2 : 1} height={h} className={i === 0 ? 'new' : undefined} style={{ animationDelay: `${0.4 + i * 0.04}s` }} />;
      })}
    </svg>
  );
}

/** The slices as plain images: the phone's vertical stack, and the page without WebGL or with reduced motion. */
function FlatStrip({ open, setOpen, touch }: { open: number; setOpen: (i: number) => void; touch: boolean }) {
  return (
    <ul className="flat" aria-label="Projects">
      {WORK.map((w, i) => (
        <li key={w.slug} className={i === open ? 'on' : undefined}>
          <button
            type="button"
            aria-label={`${w.n} ${w.name}, ${w.kind}${i === open || !touch ? ', go to project' : ', open'}`}
            onMouseEnter={touch ? undefined : () => setOpen(i)}
            onFocus={touch ? undefined : () => setOpen(i)}
            onClick={() => (i === open || !touch ? jump(i) : setOpen(i))}
          >
            <img src={BASE + w.img} alt="" style={{ objectPosition: pos(w.slug) }} loading={i < 3 ? 'eager' : 'lazy'} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function Opening({ webgl, phone, gh }: { webgl: boolean; phone: boolean; gh: GitHubData }) {
  const pin = useRef<HTMLElement>(null);
  const { active, hover, setActive, setHover } = useTiles();
  const [running, setRunning] = useState(true);
  const open = hover ?? active;
  const three = webgl && !phone;

  // On arrival the debate team's slice stands open; the first scroll hands the strip to the walk through all eight.
  useEffect(() => {
    setHover(1);
    if (phone || !three) return;
    let idle = true;
    const off = () => { if (idle && window.scrollY > 24) { idle = false; if (useTiles.getState().hover === 1) setHover(null); } };
    window.addEventListener('scroll', off, { passive: true });
    return () => window.removeEventListener('scroll', off);
  }, [phone, three, setHover]);

  // The scroll through the pinned section opens each project in turn.
  useEffect(() => {
    if (!three) return;
    const tick = () => {
      const el = pin.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, r.height - window.innerHeight));
      setActive(Math.round(p * (N - 1)));
    };
    gsap.ticker.add(tick);
    const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting), { rootMargin: '80px' });
    if (pin.current) io.observe(pin.current);
    return () => { gsap.ticker.remove(tick); io.disconnect(); };
  }, [three, setActive]);

  const last = gh.activity[0];
  return (
    <section ref={pin} className={three ? 'opening pinned' : 'opening'} aria-labelledby="who">
      <div className="stage">
        <header className="top">
          <h1 id="who">{PERSON.name}</h1>
          <p className="line">{PERSON.line}</p>
          <nav className="nav" aria-label="Sections">
            <a href="#debate">Debate</a>
            <a href="#work">Work</a>
            <a href="#research">Research</a>
            <a href="#github">GitHub</a>
            <a href="#today">Today</a>
            <a href="#contact">Contact</a>
          </nav>
        </header>
        {three ? (
          <div className="strip" aria-hidden="true">
            <Suspense fallback={null}>
              <Strip running={running} onJump={jump} />
            </Suspense>
          </div>
        ) : (
          <FlatStrip open={open} setOpen={(i) => setHover(i)} touch={phone || coarse} />
        )}
        <div className="under">
          <a className="tickrow" href="#github" aria-label={last ? `Latest commit ${ago(last.at)}, live from GitHub` : `${GITHUB.repos.length} repositories, live from GitHub`}>
            <Ticks gh={gh} />
            <span>{last ? `last commit ${ago(last.at)}` : `${GITHUB.repos.length} repositories`}</span>
          </a>
          <div className="namerow">
            <OpenName i={open} />
            {three && (
              <ul className="mirror" aria-label="Projects">
                {WORK.map((w, i) => (
                  <li key={w.slug}>
                    <button
                      type="button"
                      className={i === open ? 'on' : undefined}
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(i)}
                      onBlur={() => setHover(null)}
                      onClick={() => jump(i)}
                    >
                      <span>{w.n}</span> {w.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Project({ w, i }: { w: (typeof WORK)[number]; i: number }) {
  return (
    <article id={'p-' + w.slug} className={i % 2 ? 'proj flip' : 'proj'} aria-labelledby={'h-' + w.slug}>
      <figure className="shot">
        <div className="cut">
          <img src={BASE + w.img} alt={`${w.name}, a screenshot`} loading="lazy" width={SIZE[w.slug][0]} height={SIZE[w.slug][1]} />
        </div>
      </figure>
      <div className="ptext">
        <p className="pn">{w.n}</p>
        <h3 id={'h-' + w.slug}>{w.name}</h3>
        <p className="pkind">{w.kind}</p>
        <p className="pline">{w.line}</p>
        <p className="pstack">{w.stack}</p>
        {w.href ? (
          <a className="go" href={w.href} {...ext(w.href)}>{host(w.href)}</a>
        ) : (
          <p className="go none">No public link</p>
        )}
      </div>
    </article>
  );
}

function Today() {
  const { notes, loaded } = useNotes();
  const [open, setOpen] = useState(0);
  if (!loaded || !notes.length) {
    return (
      <div className="notes">
        <article className="note on">
          <p className="ndate">{loaded ? 'No note yet' : 'Fetching today'}</p>
          <p className="nbody">{loaded ? 'The next note lands here. Check back tomorrow.' : 'The latest note is on its way.'}</p>
        </article>
      </div>
    );
  }
  return (
    <div className="notes">
      {notes.slice(0, 8).map((n, i) =>
        i === open ? (
          <article key={n.date} className="note on" aria-labelledby={'d-' + n.date}>
            <h3 className="ndate" id={'d-' + n.date}>
              <time dateTime={n.date}>{formatDate(n.date)}</time>
              {i === 0 && <span className="latest">Latest</span>}
            </h3>
            {n.body.map((p, k) => <p key={k} className="nbody">{p}</p>)}
          </article>
        ) : (
          <article key={n.date} className="note">
            <h3 className="nshut">
              <button type="button" onClick={() => setOpen(i)}>
                <span className="sr-only-x">Open the note from </span>
                <time dateTime={n.date}>{formatDate(n.date, { day: 'numeric', month: 'short' })}</time>
              </button>
            </h3>
          </article>
        ),
      )}
    </div>
  );
}

function Certificates() {
  const [open, setOpen] = useState(0);
  return (
    <div className="certs">
      <ul className="cstrip">
        {AWARDS.map((a, i) => (
          <li key={a.site} className={i === open ? 'on' : undefined}>
            <a href={a.href} rel="noopener" onMouseEnter={() => setOpen(i)} onFocus={() => setOpen(i)}>
              <img src={BASE + a.img} alt={`The WD Awards certificate for ${a.site}`} loading="lazy" width={720} height={1018} />
            </a>
          </li>
        ))}
      </ul>
      <ul className="ccap">
        {AWARDS.map((a, i) => (
          <li key={a.site} className={i === open ? 'on' : undefined}>
            <span className="cs">{a.site}</span>
            <span>{a.note}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Tiles() {
  useVersion('tiles');
  const root = useRef<HTMLDivElement>(null);
  const [webgl] = useState(() => hasWebGL() && !still);
  const [phone, setPhone] = useState(isPhone);
  const gh = useGitHub();
  const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; ladders: { who: string; when: string; where: string }[]; epigraph: { text: string; source: string }; pages: number };
  const wess = RESEARCH[1];

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // Each project's screenshot opens from a narrow grey slice to full colour as it arrives.
  useGSAP(() => {
    if (still) return;
    gsap.utils.toArray<HTMLElement>('.v-tiles .shot .cut').forEach((el) => {
      gsap.fromTo(el,
        { clipPath: 'inset(0% 41% 0% 41%)', filter: 'grayscale(1) brightness(0.7)' },
        { clipPath: 'inset(0% 0% 0% 0%)', filter: 'grayscale(0) brightness(1)', ease: 'none', scrollTrigger: { trigger: el, start: 'top 92%', end: 'top 38%', scrub: 0.6 } },
      );
    });
    const id = setTimeout(() => ScrollTrigger.refresh(), 900);
    return () => clearTimeout(id);
  }, { scope: root, dependencies: [phone] });

  return (
    <div className="v-tiles" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <main id="main">
        <Opening webgl={webgl} phone={phone} gh={gh} />

        <section className="about wrap" aria-labelledby="h-about">
          <h2 id="h-about">About</h2>
          <div className="atext">
            {PERSON.about.map((p) => <p key={p.slice(0, 12)}>{p}</p>)}
            <p className="aside">{PERSON.aside}</p>
          </div>
        </section>

        <section id="debate" className="debate" aria-labelledby="h-debate">
          <div className="wrap">
            <h2 id="h-debate">Debate</h2>
            <ul className="wins">
              {DEBATE.wins.map((w) => (
                <li key={w.where}>
                  <p className="champ">{w.title}</p>
                  <p className="wev">{w.event}</p>
                  <p className="wwh">{w.where}, {w.when}</p>
                </li>
              ))}
            </ul>
            <div className="team">
              <div className="tmain">
                <p className="role">{DEBATE.team.role}</p>
                <h3>{DEBATE.team.name}</h3>
                <p className="tline">{DEBATE.team.line}</p>
                <p className="trec">{DEBATE.team.record}</p>
                <a className="dl" href={DEBATE.team.href} rel="noopener">{host(DEBATE.team.href)}</a>
              </div>
              <div className="next">
                <h3>Up next</h3>
                <ul>
                  {DEBATE.next.map((n) => (
                    <li key={n.where}><span className="nw">{n.where}</span><span>{n.event}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="work" className="work" aria-labelledby="h-work">
          <div className="wrap"><h2 id="h-work">Work</h2></div>
          {WORK.map((w, i) => <Project key={w.slug} w={w} i={i} />)}
        </section>

        <section id="research" className="research wrap" aria-labelledby="h-research">
          <h2 id="h-research">Research</h2>
          <div className="paper">
            <p className="pstat">{paper.status}, {paper.pages} pages</p>
            <h3 className="ptitle">{paper.title}</h3>
            <p className="abs">{paper.abstract}</p>
            <p className="kw"><span className="sr-only-x">Keywords: </span>{paper.keywords.join(' / ')}</p>
            <ol className="ladders" aria-label="The three ladders the paper follows">
              {paper.ladders.map((l) => (
                <li key={l.who}><span className="lw">{l.who}</span><span>{l.when}</span><span className="lp">{l.where}</span></li>
              ))}
            </ol>
            <blockquote className="epi"><p>{paper.epigraph.text}</p><cite>{paper.epigraph.source}</cite></blockquote>
            <ul className="plinks">
              {paper.links.map((l) => <li key={l.label}><a href={l.href} rel="noopener">{l.label}</a></li>)}
            </ul>
          </div>
          <div className="wess">
            <h3>{wess.title}</h3>
            <p className="pstat">{wess.status}</p>
            <p>{wess.abstract}</p>
          </div>
        </section>

        <section id="github" className="github wrap" aria-labelledby="h-github">
          <h2 id="h-github">Live from GitHub</h2>
          <div className="ghtop">
            <Ticks gh={gh} big />
            <p className="ghsum">
              {gh.activity.length ? `${gh.activity.length} recent commits, newest first` : `${gh.repos.length} repositories`}
              <a href={GITHUB.href} rel="noopener">github.com/{GITHUB.user}</a>
            </p>
          </div>
          {gh.activity.length > 0 && (
            <ol className="commits" aria-label="Recent commits">
              {gh.activity.map((a, i) => (
                <li key={a.href + i}>
                  <a href={a.href} rel="noopener">{a.message}</a>
                  <span className="cr">{a.repo}</span>
                  <span className="ca">{ago(a.at)}</span>
                </li>
              ))}
            </ol>
          )}
          <ul className="repos" aria-label="Repositories">
            {gh.repos.slice(0, 8).map((r) => (
              <li key={r.name}>
                <a href={r.href} rel="noopener">{r.name}</a>
                <p>{r.description ?? 'No description yet'}</p>
                <span className="lang">{r.language ?? ''}{r.pushedAt ? ` · ${ago(r.pushedAt)}` : ''}</span>
              </li>
            ))}
          </ul>
        </section>

        <section id="today" className="today wrap" aria-labelledby="h-today">
          <h2 id="h-today">Today</h2>
          <Today />
        </section>

        <section className="now wrap" aria-labelledby="h-now">
          <h2 id="h-now">Now</h2>
          <div className="nowcols">
            <div>
              <h3>{NOW.reading.title}</h3>
              <p>{NOW.reading.body}</p>
              <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <h3>{NOW.club.title}</h3>
              <p>{NOW.club.body}</p>
            </div>
            <div>
              <h3>Status</h3>
              <p>{NOW.status}</p>
            </div>
          </div>
        </section>

        <section className="record wrap" aria-labelledby="h-record">
          <h2 id="h-record">Record</h2>
          <div className="recgrid">
            <ol className="honors">
              {HONORS.map((h) => <li key={h.what}><span className="hw">{h.what}</span><span className="hd">{h.detail}</span></li>)}
            </ol>
            <Certificates />
          </div>
        </section>

        <section className="off wrap" aria-labelledby="h-off">
          <h2 id="h-off">Off the record</h2>
          <div className="offcols">
            <div><h3>Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><span className="cp">{c.provider}, {c.title}</span> {c.note}</li>)}</ul></div>
          </div>
        </section>

        <section id="contact" className="contact wrap" aria-labelledby="h-contact">
          <h2 id="h-contact">Contact</h2>
          <ul className="links">
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="ll">{l.label}</span>
                {l.href ? <a href={l.href} {...ext(l.href)}>{l.value}</a> : <span className="lv">{l.value}</span>}
              </li>
            ))}
          </ul>
          <nav className="coda" aria-label="The eight projects again">
            <ul>
              {WORK.map((w) => (
                <li key={w.slug}>
                  <a href={'#p-' + w.slug} aria-label={`${w.n} ${w.name}`}>
                    <img src={BASE + w.img} alt="" loading="lazy" style={{ objectPosition: pos(w.slug) }} />
                  </a>
                </li>
              ))}
            </ul>
            <a className="totop" href="#who">Back to the strip</a>
          </nav>
        </section>
      </main>
      <footer className="foot wrap">
        <p>Draft 44 of the portfolio. Not the live site.</p>
        <p>The strip is remixed from the horizontal tiles example by pmndrs (MIT).</p>
      </footer>
    </div>
  );
}
