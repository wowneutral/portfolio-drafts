// Draft 36: the resin. His name in clear resin, lying on a floor that is his GitHub calendar.
// The 3D scene is remixed from pmndrs/examples "inter-epoxy-resin" (MIT); see Scene.tsx.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource-variable/hanken-grotesk/wght.css';
import './resin.css';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { litDays, WEEKS, type Day } from './calendar';
import { turn } from './turn';

const Scene = lazy(() => import('./Scene'));
const BASE = import.meta.env.BASE_URL;
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; ladders: { who: string; when: string; where: string }[]; epigraph: { text: string; source: string } };
const wess = RESEARCH[1];

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const Ext = ({ href, className, children, label }: { href: string; className?: string; children: React.ReactNode; label?: string }) => (
  <a className={className} href={href} aria-label={label} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

/** True while the element is within a screen of the viewport, so a canvas can stop or unmount. */
function useNear<T extends HTMLElement>(margin = '25%') {
  const ref = useRef<T>(null);
  const [near, set] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => set(e.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return [ref, near] as const;
}

/** The printed version of the floor: the same twenty weeks as CSS cells. */
function Floor({ days, hot, label }: { days: Day[]; hot: string | null; label: string }) {
  const at = new Map(days.map((d) => [d.col * 7 + d.row, d]));
  return (
    <div className="floor" role="img" aria-label={label}>
      {Array.from({ length: WEEKS * 7 }, (_, i) => {
        const d = at.get(i);
        const cls = d ? (d.commits.length >= 2 ? 'c2' : 'c1') : '';
        return <span key={i} className={cls + (d && d.key === hot ? ' up' : '')} />;
      })}
    </div>
  );
}

export default function Resin() {
  useVersion('resin');
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  const flat = still || !webgl;
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const days = useMemo(() => litDays(gh.activity), [gh.activity]);
  const [hot, setHot] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const hero = useRef<HTMLElement>(null);
  const [heroRef, heroNear] = useNear<HTMLDivElement>('10%');
  const [topRef, topNear] = useNear<HTMLDivElement>('30%');

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // Scroll turns the camera: three-quarter view at the top, straight overhead by the end of the pin.
  useEffect(() => {
    const on = () => {
      const el = hero.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const span = phone ? window.innerHeight * 0.55 : r.height - window.innerHeight;
      turn.p = Math.min(1, Math.max(0, -r.top / Math.max(1, span)));
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); };
  }, [phone]);

  const pickedDay = days.find((d) => d.key === picked);
  const floorLabel = days.length
    ? `A calendar of the last ${WEEKS} weeks with ${days.length} days of commits marked.`
    : `A calendar grid of the last ${WEEKS} weeks.`;
  const latest = notes[0];
  const earlier = notes.slice(1);

  return (
    <div className="v-resin">
      <a className="skip-x" href="#main">Skip to content</a>

      <header className="hero" ref={hero}>
        <div className="pin">
          <div className="col">
            <h1 className="who">Armaan Seth</h1>
            <p className="line">{PERSON.line}</p>
            <p className="short">{PERSON.short.map((w) => <span key={w}>{w}</span>)}</p>
            <nav className="index" aria-label="Sections">
              <a href="#debate">Debate</a>
              <a href="#today">Today</a>
              <a href="#github">GitHub</a>
              <a href="#work">Work</a>
              <a href="#research">Research</a>
              <a href="#record">Record</a>
              <a href="#contact">Contact</a>
            </nav>
            <p className="picked" aria-live="polite">
              {pickedDay ? <>
                {formatDate(pickedDay.key, { day: 'numeric', month: 'long' })}: {pickedDay.commits.length} {pickedDay.commits.length === 1 ? 'commit' : 'commits'}. <a href="#github">See them</a>
              </> : null}
            </p>
          </div>
          <div className="stage" ref={heroRef}>
            {flat ? (
              <div className="flat">
                <p className="flatname" aria-hidden="true">armaan seth</p>
                <Floor days={days} hot={picked} label={floorLabel} />
              </div>
            ) : (
              <Suspense fallback={<div className="stage-wait" />}>
                <Scene mode="hero" phone={phone} days={days} hot={hot} picked={picked} onPick={setPicked} live={heroNear} />
              </Suspense>
            )}
          </div>
        </div>
      </header>

      <main id="main">
        <section className="sec about" aria-labelledby="h-about">
          <h2 id="h-about" className="tag">About</h2>
          <div className="about-body">
            {PERSON.about.map((p) => <p key={p.slice(0, 12)}>{p}</p>)}
            <p className="aside">{PERSON.aside}</p>
          </div>
        </section>

        <section className="sec debate" id="debate" aria-labelledby="h-debate">
          <h2 id="h-debate" className="tag">Debate</h2>
          <div className="wins">
            {DEBATE.wins.map((w) => (
              <article className="win" key={w.where}>
                <h3 className="win-title">{w.title}</h3>
                <p className="win-event">{w.event}</p>
                <p className="win-where">{w.where}</p>
                <p className="win-when">{w.when}</p>
              </article>
            ))}
          </div>
          <div className="team">
            <p className="team-role">{DEBATE.team.role}</p>
            <h3 className="team-name"><Ext href={DEBATE.team.href}>{DEBATE.team.name}</Ext></h3>
            <p className="team-line">{DEBATE.team.line}</p>
            <p className="team-record">{DEBATE.team.record}</p>
            <Ext className="go" href={DEBATE.team.href}>skeptical.pages.dev</Ext>
          </div>
          <div className="next">
            <h3 className="sub">Up next</h3>
            <ul>
              {DEBATE.next.map((n) => <li key={n.where}><span className="next-where">{n.where}</span><span className="next-event">{n.event}</span></li>)}
            </ul>
          </div>
        </section>

        <section className="sec today" id="today" aria-labelledby="h-today">
          <h2 id="h-today" className="tag">Today</h2>
          {latest ? (
            <article className="note">
              <p className="note-day" aria-hidden="true">{formatDate(latest.date, { day: 'numeric' })}</p>
              <div className="note-text">
                <h3 className="note-date"><time dateTime={latest.date}>{formatDate(latest.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></h3>
                {latest.body.map((p) => <p key={p.slice(0, 16)}>{p}</p>)}
              </div>
            </article>
          ) : (
            <p className="note-wait">{loaded ? 'No note has been posted yet.' : 'Opening the notebook.'}</p>
          )}
          {earlier.length > 0 && (
            <div className="earlier">
              <h3 className="sub">Earlier notes</h3>
              {earlier.map((n) => (
                <details key={n.date}>
                  <summary><time dateTime={n.date}>{formatDate(n.date)}</time><span className="peek">{n.body[0]}</span></summary>
                  {n.body.map((p) => <p key={p.slice(0, 16)}>{p}</p>)}
                </details>
              ))}
            </div>
          )}
        </section>

        <section className="sec github" id="github" aria-labelledby="h-github">
          <h2 id="h-github" className="tag">Live from GitHub</h2>
          <div className="gh">
            <div className="gh-stage" ref={topRef}>
              <div className="gh-box">
                <div className="floorbox"><Floor days={days} hot={hot ?? picked} label={floorLabel} /></div>
                {!flat && topNear && (
                  <div className="gh-canvas">
                    <Suspense fallback={null}>
                      <Scene mode="top" phone={phone} days={days} hot={hot} picked={picked} onPick={setPicked} live />
                    </Suspense>
                  </div>
                )}
              </div>
              <p className="gh-key">Twenty weeks, newest on the right. {days.length ? 'Orange squares are days he pushed code.' : 'Days he pushes code fill in orange.'}</p>
            </div>
            <div className="gh-list">
              {gh.commitsThisMonth !== null && (
                <p className="gh-count"><strong>{gh.commitsThisMonth}</strong> {gh.commitsThisMonth === 1 ? 'commit' : 'commits'} this month</p>
              )}
              {gh.activity.length > 0 && (
                <>
                  <h3 className="sub">Recent commits</h3>
                  <ol className="commits">
                    {gh.activity.map((a, i) => {
                      const d = days.find((x) => x.commits.includes(a));
                      const key = d?.key ?? null;
                      return (
                        <li key={a.href + i} className={key && key === picked ? 'on' : undefined}>
                          <a href={a.href} rel="noopener" onPointerEnter={() => setHot(key)} onPointerLeave={() => setHot(null)} onFocus={() => setHot(key)} onBlur={() => setHot(null)}>
                            <span className={'sw ' + (d ? (d.commits.length >= 2 ? 'c2' : 'c1') : '')} aria-hidden="true" />
                            <span className="msg">{a.message}</span>
                            <span className="meta">{a.repo}, {ago(a.at)}</span>
                          </a>
                        </li>
                      );
                    })}
                  </ol>
                </>
              )}
              <h3 className="sub">Repositories</h3>
              <ul className="repos">
                {gh.repos.slice(0, 6).map((r) => (
                  <li key={r.name}>
                    <a href={r.href} rel="noopener"><span className="repo-name">{r.name}</span>{r.language && <span className="meta">{r.language}</span>}</a>
                    {r.description && <p>{r.description}</p>}
                  </li>
                ))}
              </ul>
              <Ext className="go" href={GITHUB.href}>github.com/{GITHUB.user}</Ext>
            </div>
          </div>
        </section>

        <section className="sec work" id="work" aria-labelledby="h-work">
          <h2 id="h-work" className="tag">Work</h2>
          <div className="prints">
            {WORK.map((w) => (
              <article className="print" key={w.slug}>
                <div className="frame">
                  <img src={BASE + w.img} alt={`${w.name}, a screenshot`} loading="lazy" decoding="async" width={1200} height={680} />
                </div>
                <div className="cap">
                  <h3>{w.href ? <Ext href={w.href}>{w.name}</Ext> : w.name}</h3>
                  <p className="kind">{w.kind}</p>
                  <p className="wline">{w.line}</p>
                  <p className="stack">{w.stack}</p>
                  {w.href ? <Ext className="go" href={w.href}>{w.href.replace(/^https:\/\//, '').replace(/\/$/, '')}</Ext> : null}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="sec research" id="research" aria-labelledby="h-research">
          <h2 id="h-research" className="tag">Research</h2>
          <article className="paper">
            <p className="status">{paper.status}, {paper.pages} pages</p>
            <h3 className="paper-title">{paper.title}</h3>
            <p className="abstract">{paper.abstract}</p>
            <ul className="keys" aria-label="Keywords">{paper.keywords.map((k) => <li key={k}>{k}</li>)}</ul>
            <ul className="plinks">
              {paper.links.map((l) => <li key={l.label}><Ext href={l.href}>{l.label}</Ext></li>)}
            </ul>
            <figure className="epi">
              <blockquote>{paper.epigraph.text}</blockquote>
              <figcaption>{paper.epigraph.source}</figcaption>
            </figure>
            <ol className="ladders" aria-label="The three ladders the paper follows">
              {paper.ladders.map((l) => <li key={l.who}><span className="lw">{l.who}</span><span>{l.when}</span><span>{l.where}</span></li>)}
            </ol>
          </article>
          <article className="wess">
            <h3>{wess.title}</h3>
            <p className="status">{wess.status}</p>
            <p>{wess.abstract}</p>
          </article>
        </section>

        <section className="sec now" aria-labelledby="h-now">
          <h2 id="h-now" className="tag">Now</h2>
          <div className="now-grid">
            <div>
              <h3>{NOW.reading.title}</h3>
              <p>{NOW.reading.body}</p>
              <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <h3>{NOW.club.title}</h3>
              <p>{NOW.club.body}</p>
            </div>
            <p className="status-line">{NOW.status}</p>
          </div>
        </section>

        <section className="sec record" id="record" aria-labelledby="h-record">
          <h2 id="h-record" className="tag">Record</h2>
          <ul className="honors">
            {HONORS.map((h) => <li key={h.what}><span>{h.what}</span><span className="meta">{h.detail}</span></li>)}
          </ul>
          <div className="awards">
            {AWARDS.map((a) => (
              <a className="award" key={a.site} href={a.href} rel="noopener">
                <img src={BASE + a.img} alt={`WD Awards certificate for ${a.site}`} loading="lazy" decoding="async" width={720} height={1018} />
                <span className="award-site">{a.site}</span>
                <span className="meta">{a.note}</span>
              </a>
            ))}
          </div>
        </section>

        <section className="sec off" aria-labelledby="h-off">
          <h2 id="h-off" className="tag">Off the record</h2>
          <div className="off-grid">
            <div><h3>Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider}, {c.title}.</strong> {c.note}</li>)}</ul></div>
          </div>
        </section>

        <section className="sec contact" id="contact" aria-labelledby="h-contact">
          <h2 id="h-contact" className="tag">Contact</h2>
          <ul className="links">
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="meta">{l.label}</span>
                {l.href ? <Ext href={l.href}>{l.value}</Ext> : <span className="plain">{l.value}</span>}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer>
      <div className="coda">
        <p className="flatname" aria-hidden="true">armaan seth</p>
        <Floor days={days} hot={picked} label={floorLabel} />
      </div>

      <div className="foot">
        <p>Draft 36 of the portfolio. Not the live site.</p>
        <p>The resin type, light and grid are remixed from the pmndrs examples (inter epoxy resin, MIT). Set in Inter and Hanken Grotesk.</p>
      </div>
      </footer>
    </div>
  );
}
