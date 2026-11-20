// Draft 12, The weight. The live data is the typography: his name is set in Archivo variable, its weight
// from the last seven days of commits, its width from how recently he wrote a note. Drag it back through
// thirty days. Every section below is set by the same rule; the two championships are the only type set at
// the maximum, every day.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';
import '@fontsource-variable/archivo/wdth.css';
import './weight.css';
import { ArrowUpRight } from 'lucide-react';
import { AWARDS, CHAPTERS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate, type Note } from '@/lib/notes';
import { clamp, lerp, still, cn } from '@/lib/utils';
import { lastDays, measure, recencyWeight, settingsFor, useWidth, widthFromLength, type Setting } from './type';

const src = (p: string) => import.meta.env.BASE_URL + p;
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; epigraph: { text: string; source: string } };
const wess = RESEARCH[1];
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const FULL: Setting = { w: 900, d: 125 };
const WORDS = ['ARMAAN', 'SETH'];
const dayLabel = (iso: string) => formatDate(iso, { weekday: 'long', day: 'numeric', month: 'long' });

/** Text sized so that, set at `at`, it exactly fills its box. */
function Fit({ text, at, max = 600, upper, as = 'div', className, style, children }: { text: string; at: Setting; max?: number; upper?: boolean; as?: ElementType; className?: string; style?: CSSProperties; children?: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const w = useWidth(ref);
  const size = w ? Math.min(max, (w / measure(text, at, upper)) * 100 * 0.985) : undefined;
  const Tag = as;
  return (
    <Tag ref={ref} className={cn('wt-fit', className)}>
      <span style={{ fontSize: size, ...style }}>{children ?? text}</span>
    </Tag>
  );
}

/** A column of words all set to one measure by the width axis alone. */
function Justified({ words, weight = 560, className }: { words: readonly string[]; weight?: number; className?: string }) {
  const ref = useRef<HTMLUListElement>(null);
  const w = useWidth(ref);
  const f = clamp(w / 9, 24, 52);
  return (
    <ul ref={ref} className={cn('wt-just', className)}>
      {words.map((t) => {
        let d = 100, size = f;
        if (w) {
          const a = (measure(t, { w: weight, d: 62 }) * f) / 100, b = (measure(t, { w: weight, d: 125 }) * f) / 100;
          if (b <= w) d = 125;
          else if (a >= w) { d = 62; size = (f * w) / a; }
          else d = 62 + ((w - a) / (b - a)) * 63;
        }
        return <li key={t} style={{ fontSize: size, fontWeight: weight, fontStretch: d.toFixed(1) + '%' }}>{t}</li>;
      })}
    </ul>
  );
}

/** A heading that eases from hairline to its own weight as it enters. */
function H2({ children, w = 820, d = 100, id }: { children: ReactNode; w?: number; d?: number; id?: string }) {
  return <h2 id={id} className="wt-h2" data-ease="" style={{ '--w': w, '--d': d + '%' } as CSSProperties}>{children}</h2>;
}

function Hero({ settings, days }: { settings: Setting[]; days: string[] }) {
  const box = useRef<HTMLDivElement>(null);
  const lines = useRef<HTMLSpanElement[]>([]);
  const read = useRef<HTMLSpanElement>(null);
  const slider = useRef<HTMLDivElement>(null);
  const width = useWidth(box);
  const [vh, setVh] = useState(() => window.innerHeight);
  useEffect(() => { const r = () => setVh(window.innerHeight); addEventListener('resize', r); return () => removeEventListener('resize', r); }, []);
  const geo = useRef({ width, vh, key: '' }); geo.current.width = width; geo.current.vh = vh; geo.current.key = '';

  const S = useRef(settings); S.current = settings;
  const st = useRef({ p: 0, v: 0, held: false, w: 100, d: settings[0]?.d ?? 100, x0: 0, p0: 0, txt: '' });

  useEffect(() => {
    let raf = 0, t0 = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
      const s = st.current, set = S.current;
      if (!s.held) {
        if (still) { s.p = 0; s.v = 0; }
        else { s.v += (-70 * s.p - 13 * s.v) * dt; s.p += s.v * dt; if (Math.abs(s.p) < 0.003 && Math.abs(s.v) < 0.02) { s.p = 0; s.v = 0; } }
      }
      const pp = clamp(s.p, 0, set.length - 1), i = Math.floor(pp), f = pp - i;
      const a = set[i], b = set[Math.min(i + 1, set.length - 1)];
      const tw = lerp(a.w, b.w, f), td = lerp(a.d, b.d, f);
      const k = still ? 1 : 1 - Math.exp(-dt * (s.held ? 11 : 2.4));
      s.w += (tw - s.w) * k; s.d += (td - s.d) * k;
      // Each line fills the width at the current setting; together they never take more than ~60% of the screen.
      const g = geo.current, key = `${s.w.toFixed(1)}|${s.d.toFixed(2)}|${g.width}|${g.vh}`;
      if (g.width && key !== g.key) {
        g.key = key;
        const set1 = { w: s.w, d: s.d };
        const f = WORDS.map((t) => (g.width / measure(t, set1, true)) * 100 * 0.985);
        const cap = Math.max(0.3, (g.vh * (g.width < 600 ? 0.5 : 0.64)) / (0.96 * (f[0] + f[1])));
        lines.current.forEach((el, j) => { if (!el) return; el.style.fontWeight = s.w.toFixed(1); el.style.fontStretch = s.d.toFixed(2) + '%'; el.style.fontSize = Math.min(f[j], f[j] * cap).toFixed(1) + 'px'; });
      }
      const day = days[Math.round(pp)];
      const txt = `${dayLabel(day)}, set at weight ${Math.round(s.w)}, width ${Math.round(s.d)}`;
      if (txt !== s.txt && read.current) {
        s.txt = txt; read.current.textContent = txt;
        slider.current?.setAttribute('aria-valuenow', String(Math.round(pp)));
        slider.current?.setAttribute('aria-valuetext', dayLabel(day));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [days]);

  const step = () => Math.max(14, (box.current?.clientWidth ?? 600) / 34);
  const go = (to: number) => { const s = st.current; s.held = true; s.v = 0; s.p = clamp(to, 0, days.length - 1); };

  return (
    <header className="wt-hero">
      <div className="wt-name" ref={box}>
        <h1>
          <span className="wt-line" ref={(e) => { if (e) lines.current[0] = e; }}>Armaan</span>
          <span className="wt-line" ref={(e) => { if (e) lines.current[1] = e; }}>Seth</span>
        </h1>
        <div
          ref={slider}
          className="wt-scrub"
          role="slider"
          tabIndex={0}
          aria-label="The name as it was set on each of the last thirty days"
          aria-valuemin={0}
          aria-valuemax={days.length - 1}
          aria-valuenow={0}
          aria-orientation="horizontal"
          onPointerDown={(e) => { const s = st.current; s.held = true; s.v = 0; s.x0 = e.clientX; s.p0 = s.p; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => { const s = st.current; if (!s.held || !(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return; s.p = clamp(s.p0 + (s.x0 - e.clientX) / step(), 0, days.length - 1); }}
          onPointerUp={() => { st.current.held = false; }}
          onPointerCancel={() => { st.current.held = false; }}
          onBlur={() => { st.current.held = false; }}
          onKeyDown={(e) => {
            const s = st.current, r = Math.round(s.p);
            const map: Record<string, number> = { ArrowLeft: r + 1, ArrowDown: r + 1, ArrowRight: r - 1, ArrowUp: r - 1, PageDown: r + 7, PageUp: r - 7, Home: 0, End: days.length - 1 };
            if (e.key in map) { e.preventDefault(); go(map[e.key]); }
            else if (e.key === 'Escape' || e.key === 'Enter') s.held = false;
          }}
        />
      </div>
      <ul className="wt-short">{PERSON.short.map((t) => <li key={t}>{t}</li>)}</ul>
      <div className="wt-under">
        <p className="wt-line-p">{PERSON.line}</p>
        <div className="wt-why">
          <p>Heavier on weeks he ships, wider on days he writes. Drag it back a month.</p>
          <p className="wt-live" aria-live="off"><span ref={read}>{dayLabel(days[0])}</span></p>
        </div>
      </div>
    </header>
  );
}

/** Thirty glyphs, one per day, oldest on the left: the type is the chart. */
function Strip({ settings, days }: { settings: Setting[]; days: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const w = useWidth(ref);
  const n = w && w < 600 ? 15 : 30;
  const run = settings.slice(0, n).reverse();
  const total = w ? run.reduce((t, s) => t + measure('A', s, true), 0) : 0;
  const size = total ? Math.min(150, (w / total) * 100 * 0.9) : 48;
  return (
    <figure className="wt-strip" ref={ref}>
      <div className="wt-strip-row" aria-hidden="true" style={{ fontSize: size }}>
        {run.map((s, i) => <span key={i} style={{ fontWeight: s.w, fontStretch: s.d + '%' }}>A</span>)}
      </div>
      <figcaption>
        <span>{formatDate(days[n - 1], { day: 'numeric', month: 'long' })}</span>
        <span className="wt-live">Today</span>
      </figcaption>
    </figure>
  );
}

function Today({ notes, loaded }: { notes: Note[]; loaded: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const latest = notes[0];
  const earlier = notes.slice(1, 13);
  const len = (n: Note) => n.body.join(' ').length;
  return (
    <section className="wt-sec wt-today" aria-labelledby="h-today">
      <H2 id="h-today" w={860} d={latest ? widthFromLength(len(latest)) : 100}>Today</H2>
      <div className="wt-today-grid">
        <article className="wt-note" aria-live="polite">
          {latest ? (
            <>
              <h3 className="wt-note-date" style={{ fontStretch: widthFromLength(len(latest)) + '%' }}>
                <time dateTime={latest.date}>{formatDate(latest.date)}</time>
              </h3>
              {latest.body.map((p, i) => <p key={i}>{p}</p>)}
            </>
          ) : (
            <>
              <h3 className="wt-note-date wt-wait" style={{ fontStretch: '100%' }}>{formatDate(lastDays(1)[0])}</h3>
              <p>{loaded ? 'Nothing posted yet today. The name above narrows a step for every day without a note.' : 'Fetching today’s note.'}</p>
            </>
          )}
        </article>
        <div className="wt-earlier">
          <h3 className="wt-small-h">Earlier notes</h3>
          {earlier.length ? (
            <ul>
              {earlier.map((n) => {
                const on = open === n.date;
                return (
                  <li key={n.date}>
                    <button type="button" aria-expanded={on} onClick={() => setOpen(on ? null : n.date)} style={{ fontStretch: widthFromLength(len(n)) + '%' }}>
                      <time dateTime={n.date}>{formatDate(n.date, { day: 'numeric', month: 'long' })}</time>
                    </button>
                    {on && <div className="wt-earlier-body">{n.body.map((p, i) => <p key={i}>{p}</p>)}</div>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="wt-mute">{loaded ? 'The first note is the one on the left.' : 'Loading.'}</p>
          )}
        </div>
      </div>
    </section>
  );
}

function GitHubSection() {
  const gh = useGitHub();
  const commits = gh.activity.slice(0, 8);
  const FALL = [820, 640, 460, 300, 220, 180];
  const span = 120;
  return (
    <section className="wt-sec wt-gh" aria-labelledby="h-gh">
      <H2 id="h-gh" w={760}>Live from GitHub</H2>
      <p className="wt-lede">{gh.live ? 'Each name is heavier the more recently it was pushed.' : 'What he keeps in the open, heaviest first.'}</p>
      {commits.length > 0 && (
        <ol className="wt-commits">
          {commits.map((c, i) => (
            <li key={c.href + i}>
              <a href={c.href} style={{ fontWeight: recencyWeight(c.at, 30, 400) }}>{c.message || 'Commit'}</a>
              <span className="wt-c-repo">{c.repo}</span>
              <span className="wt-live">{ago(c.at)}</span>
            </li>
          ))}
        </ol>
      )}
      <ul className="wt-repos">
        {gh.repos.slice(0, 6).map((r, i) => {
          const w = gh.live && r.pushedAt ? recencyWeight(r.pushedAt, span) : FALL[i] ?? 200;
          return (
            <li key={r.name}>
              <a className="wt-repo-name" href={r.href} style={{ fontWeight: w }}>
                <Fit text={r.name} at={{ w: 900, d: 100 }} max={112} as="span" className="wt-repo-fit" />
              </a>
              <div className="wt-repo-meta">
                {r.description && <p>{r.description}</p>}
                <p className="wt-mute">
                  {r.language}
                  {gh.live && r.pushedAt && <> <span className="wt-live">pushed {ago(r.pushedAt)}</span></>}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <a className="wt-more" href={GITHUB.href}>Everything at {host(GITHUB.href)} <ArrowUpRight aria-hidden="true" size={22} strokeWidth={1.6} /></a>
    </section>
  );
}

export default function WeightPage() {
  useVersion('weight');
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const days = useMemo(() => lastDays(30), []);
  const settings = useMemo(() => settingsFor(days, gh.live ? gh.activity : [], notes), [days, gh, notes]);
  const root = useRef<HTMLDivElement>(null);

  // Headings ease in by weight. Content is visible from the start; only the weight moves.
  useEffect(() => {
    if (still) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.setAttribute('data-in', ''); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
    root.current?.querySelectorAll('[data-ease]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className={cn('v-weight', still && 'wt-still')} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <Hero settings={settings} days={days} />
      <main id="main">
        <section className="wt-sec wt-debate" aria-labelledby="h-debate">
          <H2 id="h-debate" w={820}>{CHAPTERS[1].title}</H2>
          <p className="wt-lede">The only type here set at full weight and full width, whatever the week.</p>
          <ol className="wt-wins">
            {DEBATE.wins.map((w) => (
              <li key={w.where}>
                <Fit text={w.where} at={FULL} upper as="h3" className="wt-win" max={260} />
                <p className="wt-win-meta"><strong>{w.title}</strong>, {w.event}, {w.when}</p>
              </li>
            ))}
          </ol>
          <div className="wt-next">
            <h3 className="wt-small-h">Up next</h3>
            <p className="wt-mute wt-next-why">Set at a hairline until they happen.</p>
            <ul>
              {DEBATE.next.map((n) => (
                <li key={n.where}><span className="wt-next-where">{n.where}</span><span className="wt-next-ev">{n.event}</span></li>
              ))}
            </ul>
          </div>
          <div className="wt-team">
            <Fit text={DEBATE.team.name} at={{ w: 760, d: 100 }} as="h3" className="wt-team-name" max={220} />
            <div className="wt-team-copy">
              <p className="wt-role">{DEBATE.team.role}</p>
              <p>{DEBATE.team.line}</p>
              <p className="wt-record">{DEBATE.team.record}</p>
              <a className="wt-link" href={DEBATE.team.href}>{host(DEBATE.team.href)} <ArrowUpRight aria-hidden="true" size={20} strokeWidth={1.6} /></a>
            </div>
          </div>
        </section>

        <section className="wt-sec wt-about" aria-labelledby="h-about">
          <H2 id="h-about" w={700}>About</H2>
          <div className="wt-about-copy">
            {PERSON.about.map((p, i) => <p key={i}>{p}</p>)}
            <p className="wt-aside">{PERSON.aside}</p>
          </div>
        </section>

        <Today notes={notes} loaded={loaded} />

        <GitHubSection />

        <section className="wt-sec wt-research" aria-labelledby="h-research">
          <H2 id="h-research" w={780}>Research</H2>
          <div className="wt-res-grid">
            <div className="wt-res-main">
              <h3 className="wt-paper-title">{paper.title}</h3>
              <p className="wt-mute">{paper.status}, {paper.pages} pages, DOI {paper.doi}</p>
              <blockquote className="wt-epi"><p>{paper.epigraph.text}</p><cite>{paper.epigraph.source}</cite></blockquote>
              <p className="wt-abstract">{paper.abstract}</p>
              <ul className="wt-res-links">
                {paper.links.map((l) => <li key={l.label}><a href={l.href}>{l.label} <ArrowUpRight aria-hidden="true" size={20} strokeWidth={1.6} /></a></li>)}
              </ul>
            </div>
            <div className="wt-res-side">
              <h3 className="wt-small-h">Keywords, set to one measure</h3>
              <Justified words={paper.keywords} weight={620} />
            </div>
          </div>
          <div className="wt-wess">
            <h3>{wess.title}</h3>
            <p className="wt-mute">{wess.status}</p>
            <p>{wess.abstract}</p>
          </div>
        </section>

        <section className="wt-sec wt-work" aria-labelledby="h-work">
          <H2 id="h-work" w={880}>Work</H2>
          <p className="wt-lede">Point at a name and it takes on weight.</p>
          <ol className="wt-work-list">
            {WORK.map((w, i) => (
              <li key={w.slug} className={cn('wt-work-row', i % 2 === 1 && 'wt-flip')}>
                <div className="wt-work-copy">
                  <h3 className="wt-work-name-h">
                    {w.href ? (
                      <a href={w.href} className="wt-work-name"><Fit text={w.name} at={{ w: 900, d: 100 }} as="span" max={150} /></a>
                    ) : (
                      <span className="wt-work-name" tabIndex={0}><Fit text={w.name} at={{ w: 900, d: 100 }} as="span" max={150} /></span>
                    )}
                  </h3>
                  <p className="wt-work-kind">{w.kind}</p>
                  <p>{w.line}</p>
                  <p className="wt-mute">{w.stack}</p>
                  {w.href ? <a className="wt-link" href={w.href}>{host(w.href)} <ArrowUpRight aria-hidden="true" size={20} strokeWidth={1.6} /></a> : <p className="wt-mute">No public link.</p>}
                </div>
                <figure className="wt-shot">
                  <img src={src(w.img)} alt={`${w.name}, screenshot`} loading="lazy" decoding="async" width={1200} height={750} />
                </figure>
              </li>
            ))}
          </ol>
        </section>

        <section className="wt-sec wt-now" aria-labelledby="h-now">
          <H2 id="h-now" w={640}>Now</H2>
          <p className="wt-status">{NOW.status}</p>
          <div className="wt-now-grid">
            <div>
              <h3>{NOW.reading.title}</h3>
              <p>{NOW.reading.body}</p>
              <Justified words={NOW.reading.shelves} weight={480} className="wt-shelves" />
            </div>
            <div>
              <h3>{NOW.club.title}</h3>
              <p>{NOW.club.body}</p>
            </div>
          </div>
        </section>

        <section className="wt-sec wt-record" aria-labelledby="h-record">
          <H2 id="h-record" w={800}>Record</H2>
          <ol className="wt-honors">
            {HONORS.map((h, i) => (
              <li key={h.what} className={i < 2 ? 'wt-max' : undefined}>
                <span className="wt-h-what">{h.what}</span>
                <span className="wt-h-detail">{h.detail}</span>
              </li>
            ))}
          </ol>
          <ul className="wt-awards">
            {AWARDS.map((a) => (
              <li key={a.site}>
                <a href={a.href}>
                  <img src={src(a.img)} alt={`Certificate for ${a.site}`} loading="lazy" decoding="async" />
                  <span className="wt-aw-site">{a.site}</span>
                  <span className="wt-mute">{a.note}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="wt-sec wt-off" aria-labelledby="h-off">
          <H2 id="h-off" w={520} d={80}>Off the record</H2>
          <div className="wt-off-grid">
            <div><h3>Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider}, {c.title}.</strong> {c.note}</li>)}</ul></div>
          </div>
        </section>

        <section className="wt-sec wt-end" aria-labelledby="h-end">
          <H2 id="h-end" w={900} d={settings[0].d}>Come back tomorrow. It will be set differently.</H2>
          <Strip settings={settings} days={days} />
          <ul className="wt-contact">
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="wt-c-label">{l.label}</span>
                {l.href ? <a href={l.href}>{l.value}</a> : <span className="wt-c-val">{l.value}</span>}
              </li>
            ))}
          </ul>
        </section>
      </main>
      <footer className="wt-foot">
        <p>Draft 12 of the portfolio. Not the live site.</p>
        <p className="wt-mute">Set in Archivo, by Omnibus-Type.</p>
      </footer>
    </div>
  );
}
