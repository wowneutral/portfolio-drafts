// Draft 57: the posters. His eight builds, printed as tall paper posters, fly up a column beside a numbered index.
// The poster column is a remix of React Bits FlyingPosters (MIT + Commons Clause); see Posters.tsx.
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/hanken-grotesk/index.css';
import './posters.css';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB, CHAPTERS } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { gsap, ScrollTrigger, scrollToId } from '@/lib/scroll';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import type { PosterItem } from './Posters';

const Posters = lazy(() => import('./Posters'));
const BASE = import.meta.env.BASE_URL;

const ITEMS: PosterItem[] = [
  ...WORK.map((w) => ({ image: BASE + w.img, name: w.name, n: w.n, kind: w.kind })),
  ...AWARDS.map((a) => ({ image: BASE + a.img, name: a.site, n: 'WD Awards', kind: 'Favourite', cert: true })),
];
const WORK_ITEMS = ITEMS.slice(0, WORK.length);

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}

const host = (href: string) => href.replace(/^https?:\/\//, '').replace(/\/$/, '');
const ext = (href: string) => (href.startsWith('http') ? { rel: 'noopener' } : {});

/** A poster as paper in the DOM: the still version, and the one in each spread. */
function Poster({ item, alt, land = false }: { item: PosterItem; alt: string; land?: boolean }) {
  return (
    <div className={'pd' + (item.cert ? ' pd-cert' : '') + (land ? ' land' : '')}>
      <div className="pd-in">
      <div className="pd-top" aria-hidden="true"><span className="pd-n">{item.n}</span><span>{item.kind}</span></div>
      <img src={item.image} alt={alt} loading="lazy" decoding="async" width={item.cert ? 720 : 1200} height={item.cert ? 1018 : 1071} />
      <div className="pd-foot" aria-hidden="true"><span className="pd-rule" /><span className="pd-name" style={{ ['--fs' as string]: Math.min(18, 84 / (item.name.length * 0.52)) + 'cqw' }}>{item.name}</span></div>
      </div>
    </div>
  );
}

export default function PostersPage() {
  useVersion('posters');
  const root = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  const moving = webgl && !still;
  const [focus, setFocus] = useState<number | null>(null);
  const [center, setCenter] = useState(-1);
  const { notes, loaded } = useNotes();
  const gh = useGitHub();
  const spreadEls = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // Where the work column should be: a continuous poster index that rests on each spread while you read it.
  const follow = useCallback(() => {
    const els = spreadEls.current;
    if (!els.length) return 0;
    const half = window.innerHeight / 2;
    const mids = els.map((el) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2 - half; });
    if (mids[0] >= 0) return -1;
    for (let i = 0; i < mids.length - 1; i++) {
      if (mids[i] <= 0 && mids[i + 1] > 0) {
        const fr = -mids[i] / (mids[i + 1] - mids[i]);
        const t = Math.min(1, Math.max(0, (fr - 0.22) / 0.56));
        return i - 1 + t * t * (3 - 2 * t);
      }
    }
    return mids.length - 2;
  }, []);

  // Posters in the DOM land flat as they arrive (phone spreads, the still column is exempt, and the two certificates).
  useEffect(() => {
    if (still) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.v-posters .land').forEach((el, i) => {
        gsap.fromTo(el, { yPercent: 18, rotateX: 26, rotateZ: el.dataset.tilt ? Number(el.dataset.tilt) : (i % 2 ? 2 : -2) }, {
          yPercent: 0, rotateX: 0, rotateZ: 0, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 45%', scrub: 0.6 },
        });
      });
    }, root);
    const t = setTimeout(() => ScrollTrigger.refresh(), 600);
    return () => { clearTimeout(t); ctx.revert(); };
  }, [phone, moving]);

  const go = (i: number) => {
    const w = WORK[i];
    if (w) scrollToId('w-' + w.slug); else scrollToId('record');
  };

  const latest = notes[0];
  const earlier = notes.slice(1);
  const showCol = moving && !phone;

  return (
    <div className={'v-posters' + (moving ? ' is-moving' : ' is-still')} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>

      <header className="hero" id="top">
        <div className="hero-l">
          <nav className="topnav" aria-label="Sections">
            <a href="#debate">Debate</a><a href="#work">Work</a><a href="#today">Today</a><a href="#github">GitHub</a><a href="#research">Research</a><a href="#record">Record</a><a href="#contact">Contact</a>
          </nav>
          <h1 className="name">{PERSON.first} <span>{PERSON.last}</span></h1>
          <p className="line">{PERSON.line}</p>
          {phone && (
            <div className="band">
              {moving ? (
                <Suspense fallback={null}>
                  <Posters items={ITEMS} horizontal fit={0.92} speed={26} pageScroll={0.5} onItemClick={go} onCenter={setCenter} />
                </Suspense>
              ) : (
                <ul className="still-band" aria-label="Posters">{ITEMS.map((it, i) => <li key={i}><Poster item={it} alt="" /></li>)}</ul>
              )}
            </div>
          )}
          <nav className="index" aria-label="Projects">
            <ol>
              {WORK.map((w, i) => (
                <li key={w.slug}>
                  <a href={'#w-' + w.slug} className={center === i ? 'on' : undefined}
                    onMouseEnter={() => setFocus(i)} onMouseLeave={() => setFocus(null)} onFocus={() => setFocus(i)} onBlur={() => setFocus(null)}>
                    <span className="ix-n">{w.n}</span><span className="ix-name">{w.name}</span><span className="ix-kind">{w.kind}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
        {!phone && (
          <div className="hero-r">
            {moving ? (
              <Suspense fallback={null}>
                <Posters items={ITEMS} fit={0.72} speed={22} pageScroll={0.9} focus={focus} onItemClick={go} onCenter={setCenter} className="col" />
              </Suspense>
            ) : (
              <ul className="still-col">{ITEMS.map((it, i) => <li key={i}><Poster item={it} alt="" /></li>)}</ul>
            )}
          </div>
        )}
      </header>

      <main id="main">
        <section className="debate" id="debate" aria-labelledby="debate-h">
          <div className="debate-in">
            <h2 id="debate-h">{CHAPTERS[1].title}</h2>
            <div className="wins">
              {DEBATE.wins.map((w) => (
                <article className="win" key={w.where}>
                  <p className="win-t">{w.title}</p>
                  <h3 className="win-e">{w.event}</h3>
                  <p className="win-w">{w.where}, {w.when}</p>
                </article>
              ))}
            </div>
            <div className="team">
              <div className="team-a">
                <h3>{DEBATE.team.name}</h3>
                <p className="role">{DEBATE.team.role}</p>
              </div>
              <div className="team-b">
                <p>{DEBATE.team.line}</p>
                <p>{DEBATE.team.record}</p>
                <a className="go" href={DEBATE.team.href} rel="noopener">{host(DEBATE.team.href)}</a>
              </div>
              <div className="team-c">
                <h3>Up next</h3>
                <ul>{DEBATE.next.map((n) => <li key={n.where}><b>{n.where}</b><span>{n.event}</span></li>)}</ul>
              </div>
            </div>
          </div>
        </section>

        <section className={'work' + (showCol ? ' has-col' : '')} id="work" aria-labelledby="work-h">
          {showCol && (
            <div className="work-col">
              <div className="work-col-in">
                <Suspense fallback={null}>
                  <Posters items={WORK_ITEMS} fit={0.84} follow={follow} scrollEase={0.08} />
                </Suspense>
              </div>
            </div>
          )}
          <div className="work-intro" ref={(el) => { if (el) spreadEls.current[0] = el; }}>
            <h2 id="work-h">The work</h2>
            <p>{CHAPTERS[4].body}</p>
          </div>
          {WORK.map((w, i) => (
            <article className="spread" id={'w-' + w.slug} key={w.slug} ref={(el) => { if (el) spreadEls.current[i + 1] = el; }} aria-labelledby={'wh-' + w.slug}>
              <div className="sp-copy">
                <p className="sp-n">{w.n}</p>
                <h3 id={'wh-' + w.slug}>{w.name}</h3>
                <p className="sp-kind">{w.kind}</p>
                <p className="sp-line">{w.line}</p>
                <p className="sp-stack"><span>Built with</span> {w.stack}</p>
                {w.href ? <a className="go" href={w.href} rel="noopener">{host(w.href)}</a> : <p className="nolink">No public link. It lives on his machine.</p>}
              </div>
              <figure className="sp-fig">
                <Poster item={ITEMS[i]} alt={`${w.name}: a screenshot`} land={phone && !still} />
              </figure>
            </article>
          ))}
        </section>

        <section className="today" id="today" aria-labelledby="today-h">
          <div className="sheet today-sheet">
            <div className="today-head">
              <h2 id="today-h">Today</h2>
              <p className="today-date">{latest ? <time dateTime={latest.date}>{formatDate(latest.date)}</time> : loaded ? 'The daily note' : 'Fetching the note'}</p>
            </div>
            {latest ? (
              <div className="today-body">{latest.body.map((p, i) => <p key={i}>{p}</p>)}</div>
            ) : (
              <div className="today-body is-wait"><p>{loaded ? 'Nothing posted yet. The first note goes up here.' : 'The latest note is on its way.'}</p></div>
            )}
            {earlier.length > 0 && (
              <details className="earlier">
                <summary>Earlier notes <span>{earlier.length}</span></summary>
                <ol>
                  {earlier.map((n) => (
                    <li key={n.date}><time dateTime={n.date}>{formatDate(n.date)}</time><div>{n.body.map((p, i) => <p key={i}>{p}</p>)}</div></li>
                  ))}
                </ol>
              </details>
            )}
          </div>
        </section>

        <section className="github" id="github" aria-labelledby="gh-h">
          <div className="sheet gh-sheet">
            <div className="gh-head">
              <h2 id="gh-h">Live from GitHub</h2>
              <a className="go" href={GITHUB.href} rel="noopener">{host(GITHUB.href)}</a>
            </div>
            <div className={'gh-cols' + (gh.activity.length ? '' : ' only-repos')}>
              {gh.activity.length > 0 && (
                <div className="gh-commits">
                  <h3>Latest commits</h3>
                  <ol>
                    {gh.activity.slice(0, 7).map((a, i) => (
                      <li key={i}><a href={a.href} rel="noopener"><span className="c-msg">{a.message}</span><span className="c-meta">{a.repo}, {ago(a.at)}</span></a></li>
                    ))}
                  </ol>
                </div>
              )}
              <div className="gh-repos">
                <h3>{gh.live ? 'Recently pushed' : 'Repositories'}</h3>
                <ol>
                  {gh.repos.slice(0, 6).map((r) => (
                    <li key={r.name}><a href={r.href} rel="noopener"><span className="r-name">{r.name}</span>{r.description && <span className="r-desc">{r.description}</span>}{r.language && <span className="r-lang">{r.language}</span>}</a></li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section className="research" id="research" aria-labelledby="paper-h">
          <div className="paper-sheet">
            <p className="ps-status">{RESEARCH[0].status}</p>
            <h2 id="paper-h">{RESEARCH[0].title}</h2>
            <blockquote><p>{RESEARCH[0].epigraph!.text}</p><cite>{RESEARCH[0].epigraph!.source}</cite></blockquote>
          </div>
          <div className="paper-copy">
            <h3>Abstract</h3>
            <p className="abstract">{RESEARCH[0].abstract}</p>
            <ul className="kw" aria-label="Keywords">{RESEARCH[0].keywords!.map((k) => <li key={k}>{k}</li>)}</ul>
            <ul className="plinks">{RESEARCH[0].links.map((l) => <li key={l.label}><a href={l.href} rel="noopener">{l.label}</a></li>)}</ul>
            <div className="wess">
              <h3>{RESEARCH[1]!.title}</h3>
              <p>{RESEARCH[1]!.abstract}</p>
              <p className="wess-s">{RESEARCH[1]!.status}</p>
            </div>
          </div>
        </section>

        <section className="about" id="about" aria-labelledby="about-h">
          <div className="about-a">
            <h2 id="about-h">About</h2>
            {PERSON.about.map((p, i) => <p key={i}>{p}</p>)}
            <p className="aside">{PERSON.aside}</p>
          </div>
          <div className="about-b">
            <h2>Now</h2>
            <h3>{NOW.reading.title}</h3>
            <p>{NOW.reading.body}</p>
            <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            <h3>{NOW.club.title}</h3>
            <p>{NOW.club.body}</p>
            <p className="status">{NOW.status}</p>
          </div>
        </section>

        <section className="off" aria-labelledby="off-h">
          <h2 id="off-h">Off the record</h2>
          <div className="off-cols">
            <div><h3>Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider} {c.title}</b> {c.note}</li>)}</ul></div>
          </div>
        </section>

        <section className="record" id="record" aria-labelledby="record-h">
          <div className="rec-top">
            <h2 id="record-h">Record</h2>
            <ol className="honors">{HONORS.map((h) => <li key={h.what}><span className="h-what">{h.what}</span><span className="h-det">{h.detail}</span></li>)}</ol>
          </div>
          <div className="certs">
            {AWARDS.map((a, i) => (
              <a className="cert" key={a.site} href={a.href} rel="noopener">
                <div className={'cert-paper' + (still ? '' : ' land')} data-tilt={i ? 3 : -3}>
                  <Poster item={ITEMS[WORK.length + i]} alt={`WD Awards certificate for ${a.site}`} />
                </div>
                <span className="cert-cap"><b>{a.site}</b> {a.note}</span>
              </a>
            ))}
          </div>
        </section>
      </main>

      <footer className="contact" id="contact" aria-labelledby="contact-h">
        <h2 id="contact-h">Contact</h2>
        <ul className="links">
          {LINKS.map((l) => (
            <li key={l.label}><span className="l-label">{l.label}</span>{l.href ? <a href={l.href} {...ext(l.href)}>{l.value}</a> : <span className="l-val">{l.value}</span>}</li>
          ))}
        </ul>
        <p className="colophon">Draft 57 of the portfolio. Not the live site. Poster column remixed from React Bits FlyingPosters. Set in Fraunces and Hanken Grotesk.</p>
      </footer>
    </div>
  );
}
