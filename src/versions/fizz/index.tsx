// Draft 25, The fizz. A tall glass of sparkling water, never still. Every stream of bubbles is one of his commits,
// the daily note decides the pour, and the date decides plain, lime or lemon. Scroll and the camera sinks from the
// rim to the base (where the two championships fizz), then rides the bubbles back up and steps out of the glass.
import { Suspense, lazy, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import '@fontsource-variable/familjen-grotesk';
import '@fontsource-variable/jetbrains-mono';
import './fizz.css';
import { AWARDS, CHAPTERS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago, type Activity } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { still, isPhone } from '@/lib/utils';
import { F, hash, nucleus, type Stream } from './store';
import Still from './Still';

const Scene = lazy(() => import('./Scene'));
const src = (p: string) => import.meta.env.BASE_URL + p;
const paper = RESEARCH[0];
const wess = RESEARCH[1];
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const SPARKLING = FAVOURITES.find((f) => f.startsWith('Sparkling')) ?? FAVOURITES[2];
const OTHER_FAVS = FAVOURITES.filter((f) => f !== SPARKLING);
const FLAVOUR = ['plain', 'lime', 'lemon'] as const;

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
const dayNum = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 86400000); };
const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** The commit list. Its one motion: a new commit enters at the top and pushes the older rows down a place, with a short spring. */
function Commits({ items: all, arrive, lit, light }: { items: Activity[]; arrive: boolean; lit: string; light: (r: string) => void }) {
  const ref = useRef<HTMLOListElement>(null);
  const tops = useRef(new Map<string, number>());
  // When the feed arrives while you are here, the newest commit lands a moment later, on top of the others.
  const [items, setItems] = useState(() => (arrive && !still && all.length > 1 ? all.slice(1) : all));
  useEffect(() => {
    if (items === all) return;
    const t = setTimeout(() => setItems(all), 900);
    return () => clearTimeout(t);
  }, [all, items]);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const rows = [...el.querySelectorAll<HTMLLIElement>('li[data-k]')];
    const prev = tops.current;
    const had = prev.size > 0;
    const next = new Map<string, number>();
    rows.forEach((li) => next.set(li.dataset.k!, li.offsetTop));
    if (had && !still) {
      rows.forEach((li) => {
        const k = li.dataset.k!, was = prev.get(k), now = next.get(k)!;
        const from = was === undefined ? -li.offsetHeight : was - now;
        if (!from) return;
        li.animate([{ transform: `translateY(${from}px)` }, { transform: 'translateY(0)' }], { duration: 520, easing: 'cubic-bezier(.34,1.25,.6,1)' });
      });
    }
    tops.current = next;
  }, [items]);
  return (
    <ol className="fz-commits" ref={ref}>
      {items.map((c) => (
        <li key={c.href} data-k={c.href} className={lit === c.repo ? 'is-lit' : ''}
          onPointerEnter={() => light(c.repo)} onPointerLeave={() => light('')} onFocus={() => light(c.repo)} onBlur={() => light('')}>
          <span className="fz-dot" aria-hidden="true" />
          <a href={c.href} className="fz-msg">{c.message || 'Commit'}</a>
          <span className="fz-meta"><span className="fz-mono">{c.repo}</span> <span className="fz-ago">{ago(c.at)}</span></span>
        </li>
      ))}
    </ol>
  );
}

export default function Fizz() {
  useVersion('fizz');
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const [gl] = useState(() => !still && hasWebGL() && !/flat/.test(location.search));
  const [phone] = useState(() => isPhone() || window.innerWidth <= 820);
  const [lit, setLit] = useState('');
  const [run, setRun] = useState(true);
  const band = useRef<HTMLDivElement>(null);
  const arrived = useRef(!gh.live);

  const today = localToday();
  const slice = (((dayNum(today) % 3) + 3) % 3) as 0 | 1 | 2;
  const latest = notes[0];
  const days = latest ? Math.max(0, dayNum(today) - dayNum(latest.date)) : -1;
  const fresh = days < 0 ? 0.55 : days === 0 ? 1 : Math.max(0.35, 1 - 0.16 * days);
  const crown = days === 0 ? (phone ? 24 : 48) : days === 1 ? (phone ? 10 : 18) : 0;
  const pour = !loaded ? 'Pouring.' : days < 0 ? 'Still fizzing.' : days === 0 ? 'Poured today.' : days === 1 ? 'Poured yesterday. Still brisk.' : `Poured ${days} days ago. Still fizzing.`;

  const streams = useMemo<Stream[]>(() => {
    if (gh.activity.length) {
      const now = Date.now();
      return gh.activity.map((c, i) => {
        const n = nucleus(c.repo), j = hash(c.href) - 0.5;
        const hours = Math.max(0, (now - new Date(c.at).getTime()) / 3600000);
        return { repo: c.repo, x: n.x + j * 0.06, z: n.z + (hash(c.href + i) - 0.5) * 0.06, rate: 0.7 + 4.3 * Math.exp(-hours / 72) };
      });
    }
    return gh.repos.map((r) => ({ repo: r.name, ...nucleus(r.name), rate: 3.2 }));
  }, [gh.activity, gh.repos]);

  useEffect(() => { F.onLit = setLit; return () => { F.onLit = () => {}; F.lit = ''; F.win = -1; }; }, []);
  useEffect(() => {
    const el = band.current; if (!el || !gl) return;
    const io = new IntersectionObserver(([e]) => setRun(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [gl]);

  const light = (repo: string) => { F.lit = repo; setLit(repo); };
  const win = (i: number) => { F.win = i; };
  const recent = gh.activity;

  return (
    <div className={`v-fizz${gl ? '' : ' is-still'}`}>
      <a className="skip-x" href="#main">Skip to content</a>
      <div className="fz-wrap">
        <div className="fz-band" ref={band}>
          {gl ? (
            <>
              <Suspense fallback={<Still slice={slice} />}>
                <Scene streams={streams} fresh={fresh} crown={crown} slice={slice} phone={phone} run={run} />
              </Suspense>
              <button
                type="button" className="fz-tap" aria-label="Release a burst of bubbles"
                onClick={(e) => { if (e.detail === 0) F.bursts++; }}
                onKeyDown={(e) => { if (e.key === 'ArrowLeft') { e.preventDefault(); F.nudge -= 1; } if (e.key === 'ArrowRight') { e.preventDefault(); F.nudge += 1; } }}
              />
            </>
          ) : <Still slice={slice} />}
        </div>

        <main id="main" className="fz-copy">
          <section className="fz-sec fz-hero" data-pose="hero">
            <h1 className="fz-name">{PERSON.name}</h1>
            <p className="fz-line">{PERSON.line}</p>
            <p className="fz-never">Never still.</p>
            <p className="fz-hint">{gl ? 'The bubbles are live from GitHub. Tap the glass, or drag it.' : 'The bubbles are live from GitHub.'}</p>
          </section>

          <section className="fz-sec fz-today" data-pose="0.03" id="today" aria-labelledby="h-today">
            <h2 id="h-today" className="fz-h">Today</h2>
            <p className="fz-pour">{pour}</p>
            {!loaded ? (
              <p className="fz-note-body fz-wait">The note is being poured.</p>
            ) : latest ? (
              <>
                <article className="fz-note">
                  <p className="fz-date"><time dateTime={latest.date}>{formatDate(latest.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></p>
                  {latest.body.map((p, i) => <p key={i} className="fz-note-body">{p}</p>)}
                </article>
                {notes.length > 1 && (
                  <div className="fz-earlier">
                    <h3 className="fz-k">Earlier pours</h3>
                    {notes.slice(1, 12).map((n) => (
                      <details key={n.date}>
                        <summary><time dateTime={n.date}>{formatDate(n.date)}</time><span className="fz-peek">{n.body[0]}</span></summary>
                        {n.body.map((p, i) => <p key={i}>{p}</p>)}
                      </details>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="fz-note-body">No note yet today. The glass keeps fizzing anyway.</p>
            )}
          </section>

          <section className="fz-sec" data-pose="0.5" aria-labelledby="h-about">
            <h2 id="h-about" className="fz-h">About</h2>
            {PERSON.about.map((p, i) => <p key={i} className={i === 0 ? 'fz-lede' : 'fz-p'}>{p}</p>)}
            <p className="fz-aside">{PERSON.aside}</p>
          </section>

          <section className="fz-sec fz-debate" data-pose="1" id="debate" aria-labelledby="h-debate">
            <h2 id="h-debate" className="fz-h">Debate</h2>
            <p className="fz-sub">{CHAPTERS.find((c) => c.id === 'debate')?.title}. At the base, where every stream starts.</p>
            <ol className="fz-wins">
              {DEBATE.wins.map((w, i) => (
                <li key={w.where} tabIndex={0} onPointerEnter={() => win(i)} onPointerLeave={() => win(-1)} onFocus={() => win(i)} onBlur={() => win(-1)}>
                  <span className="fz-stream fz-win-stream" aria-hidden="true"><i /><i /><i /><i /><i /></span>
                  <span className="fz-champ">{w.title}</span>
                  <span className="fz-event">{w.event}</span>
                  <span className="fz-where">{w.where}, {w.when}</span>
                </li>
              ))}
            </ol>
            <div className="fz-team">
              <h3 className="fz-team-name">{DEBATE.team.name}</h3>
              <p className="fz-role">{DEBATE.team.role}</p>
              <p className="fz-p">{DEBATE.team.line}</p>
              <p className="fz-p fz-dim">{DEBATE.team.record}</p>
              <p><a className="fz-link" href={DEBATE.team.href}>{host(DEBATE.team.href)}</a></p>
            </div>
            <div className="fz-next">
              <h3 className="fz-k">Up next</h3>
              <ul>{DEBATE.next.map((n) => <li key={n.where}><span>{n.where}</span> <span className="fz-dim">{n.event}</span></li>)}</ul>
            </div>
          </section>

          <section className="fz-sec fz-gh" data-pose="0.9" id="github" aria-labelledby="h-gh">
            <h2 id="h-gh" className="fz-h">Live from GitHub</h2>
            <p className="fz-sub">
              {recent.length
                ? `Each stream in the glass is one of these commits${gh.commitsThisMonth != null ? `, ${gh.commitsThisMonth} this month` : ''}. The newer, the faster.`
                : 'Each repo fizzes from its own place on the base.'}
            </p>
            {recent.length > 0 && <Commits items={recent} arrive={arrived.current} lit={lit} light={light} />}
            <ul className="fz-repos">
              {gh.repos.slice(0, 8).map((r) => (
                <li key={r.name} className={lit === r.name ? 'is-lit' : ''}
                  onPointerEnter={() => light(r.name)} onPointerLeave={() => light('')} onFocus={() => light(r.name)} onBlur={() => light('')}>
                  <span className="fz-stream" aria-hidden="true"><i /><i /><i /></span>
                  <a href={r.href} className="fz-repo">{r.name}</a>
                  <span className="fz-desc">{r.description ?? ''}</span>
                  <span className="fz-lang fz-mono">{r.language ?? ''}{r.pushedAt ? `, ${ago(r.pushedAt)}` : ''}</span>
                </li>
              ))}
            </ul>
            <p><a className="fz-link" href={GITHUB.href}>{host(GITHUB.href)}</a></p>
          </section>

          {WORK.map((w, i) => (
            <section key={w.slug} className="fz-sec fz-work" data-pose={(0.8 - i * 0.075).toFixed(3)} aria-labelledby={`h-w-${w.slug}`}>
              {i === 0 && <h2 className="fz-h">Work</h2>}
              <figure className="fz-shot"><img src={src(w.img)} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={750} /></figure>
              <div className="fz-work-text">
                <h3 id={`h-w-${w.slug}`} className="fz-work-name">{w.name}</h3>
                <p className="fz-kind">{w.kind}</p>
                <p className="fz-p">{w.line}</p>
                <p className="fz-stack fz-mono">{w.stack}</p>
                {w.href ? <p><a className="fz-link" href={w.href}>{host(w.href)}</a></p> : <p className="fz-dim">No public link.</p>}
              </div>
            </section>
          ))}

          <section className="fz-sec fz-research" data-pose="0.16" id="research" aria-labelledby="h-research">
            <h2 id="h-research" className="fz-h">Research</h2>
            <h3 className="fz-paper">{paper.title}</h3>
            <p className="fz-dim">{paper.status}{'pages' in paper ? `, ${paper.pages} pages` : ''}</p>
            <p className="fz-lede">{paper.abstract}</p>
            <ul className="fz-keys">{(paper.keywords ?? []).map((k) => <li key={k}>{k}</li>)}</ul>
            <ul className="fz-links">{paper.links.map((l) => <li key={l.label}><a className="fz-link" href={l.href}>{l.label}</a></li>)}</ul>
            <div className="fz-wess">
              <h3 className="fz-team-name">{wess.title}</h3>
              <p className="fz-dim">{wess.status}</p>
              <p className="fz-p">{wess.abstract}</p>
            </div>
          </section>

          <section className="fz-sec" data-pose="0.07" aria-labelledby="h-now">
            <h2 id="h-now" className="fz-h">Now</h2>
            <p className="fz-lede">{NOW.status}</p>
            <div className="fz-cols">
              <div>
                <h3 className="fz-k">{NOW.reading.title}</h3>
                <p className="fz-p">{NOW.reading.body}</p>
                <ul className="fz-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
              <div>
                <h3 className="fz-k">{NOW.club.title}</h3>
                <p className="fz-p">{NOW.club.body}</p>
              </div>
            </div>
          </section>

          <section className="fz-sec fz-record" data-pose="0" aria-labelledby="h-record">
            <h2 id="h-record" className="fz-h">Record</h2>
            <ul className="fz-honors">{HONORS.map((h) => <li key={h.what}><span>{h.what}</span><span className="fz-dim">{h.detail}</span></li>)}</ul>
            <div className="fz-awards">
              {AWARDS.map((a) => (
                <a key={a.site} href={a.href} className="fz-award">
                  <img src={src(a.img)} alt={`Certificate: ${a.site}, ${a.note}`} loading="lazy" width={600} height={850} />
                  <span>{a.site}</span>
                  <span className="fz-dim">{a.note}</span>
                </a>
              ))}
            </div>
          </section>

          <section className="fz-sec fz-end" data-pose="out" aria-labelledby="h-off">
            <p className="fz-sparkle">{SPARKLING}</p>
            <p className="fz-todays">Today the glass is {FLAVOUR[slice]}.</p>
            <h2 id="h-off" className="fz-h">Off the record</h2>
            <div className="fz-off">
              <div><h3 className="fz-k">Likes</h3><ul>{LIKES.map((l) => <li key={l}>{l}</li>)}</ul></div>
              <div><h3 className="fz-k">Dislikes</h3><ul>{DISLIKES.map((l) => <li key={l}>{l}</li>)}</ul></div>
              <div><h3 className="fz-k">Also favourites</h3><ul>{OTHER_FAVS.map((l) => <li key={l}>{l}</li>)}</ul></div>
              <div><h3 className="fz-k">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><span>{c.provider}, {c.title}</span> <span className="fz-dim">{c.note}</span></li>)}</ul></div>
            </div>
            <h2 className="fz-h fz-contact-h">Contact</h2>
            <ul className="fz-contact">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <span className="fz-dim">{l.label}</span>
                  {l.href ? <a className="fz-link" href={l.href}>{l.value}</a> : <span>{l.value}</span>}
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>
      <footer className="fz-foot">
        <p>Draft 25 of the portfolio. Not the live site.</p>
        <p className="fz-dim">Glass, water and bubbles drawn live in the browser. Bubbles from github.com/wowneutral.</p>
      </footer>
    </div>
  );
}
