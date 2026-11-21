// Draft 68: the plinth. One white plinth in an empty gallery, one of his real things on it at a time,
// each with a museum label in his own words. Stage remixed from pmndrs/examples stage-presets-gltfjsx (MIT).
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/bodoni-moda/standard.css';
import '@fontsource-variable/bodoni-moda/standard-italic.css';
import '@fontsource-variable/instrument-sans/standard.css';
import './plinth.css';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, STATS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { stage, type Ex } from './store';

const Stage = lazy(() => import('./Stage'));
const BASE = import.meta.env.BASE_URL;
const ext = (href: string) => (href.startsWith('http') ? { rel: 'noopener' } : {});

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
const SHOOT = new URLSearchParams(location.search).get('shoot') as Ex | null;

const NAV: [string, string][] = [['debate', 'Debate'], ['research', 'Research'], ['work', 'Work'], ['github', 'GitHub'], ['today', 'Today'], ['now', 'Now'], ['record', 'Record'], ['contact', 'Contact']];

// His own words, cut out of content.ts rather than retyped.
const ROUND = (() => { const a = PERSON.about[0]; const i = a.indexOf('an LD round'); return i < 0 ? 'Lincoln Douglas' : a.slice(i, a.indexOf('.', i)); })();
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Still({ ex, alt }: { ex: Ex; alt: string }) {
  return <figure className="still"><img src={`${BASE}plinth/still-${ex}.jpg`} alt={alt} loading="lazy" width={900} height={840} /></figure>;
}

function Room({ id, ex, flat, alt, label, children, className }: { id: string; ex: Ex; flat: boolean; alt: string; label: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`room${className ? ' ' + className : ''}`} id={id} data-ex={ex} aria-labelledby={`h-${id}`}>
      {flat && ex !== 'empty' && ex !== 'name' && <Still ex={ex} alt={alt} />}
      <div className="label" aria-label={label} role="group">{children}</div>
    </section>
  );
}

export default function Plinth() {
  const [phone, setPhone] = useState(isPhone);
  useVersion('plinth', { anchorOffset: phone ? Math.round(window.innerHeight * 0.44) : 0 });
  const [webgl] = useState(hasWebGL);
  const flat = (still || !webgl) && !SHOOT;
  const root = useRef<HTMLDivElement>(null);
  const { notes, loaded } = useNotes();
  const gh = useGitHub();
  const [work, setWork] = useState(0);
  const [cert, setCert] = useState(0);
  const [latest, ...earlier] = notes;

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  const nextWork = useCallback(() => setWork((w) => (w + 1) % WORK.length), []);
  const nextCert = useCallback(() => setCert((c) => (c + 1) % AWARDS.length), []);
  useEffect(() => {
    stage.onPrint = (which) => (which === 'prints' ? nextWork() : nextCert());
    return () => { stage.onPrint = null; };
  }, [nextWork, nextCert]);

  // The slips on the plinth: recent commits, or the repos when GitHub is out of reach.
  const slips = gh.activity.length
    ? gh.activity.slice(0, 7).map((a) => ({ repo: a.repo.replace(/^wowneutral\//, ''), text: a.message.split('\n')[0] }))
    : gh.repos.slice(0, 6).map((r) => ({ repo: r.name, text: r.description ?? r.name }));

  // Which exhibit stands on the plinth: the label crossing the reading line.
  useEffect(() => {
    const el = root.current; if (!el || flat || SHOOT) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      const vh = window.innerHeight, ph = isPhone();
      const probe = ph ? vh * 0.44 + (vh * 0.56) * 0.35 : vh * 0.52;
      let want: Ex = 'apple';
      el.querySelectorAll<HTMLElement>('[data-ex]').forEach((s) => {
        const r = s.getBoundingClientRect();
        if (r.top <= probe) want = s.dataset.ex as Ex;
        if (r.top < vh * 2.6 && r.bottom > -vh) stage.near.add(s.dataset.ex as Ex);
      });
      stage.want = want;
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, [flat]);

  if (SHOOT) {
    return (
      <div className="v-plinth is-shoot">
        <main id="main"><h1 className="sr-only-x">{PERSON.name}</h1></main>
        <div className="shoot"><Suspense fallback={null}><Stage phone={false} work={0} cert={0} slips={slips} fixed={SHOOT} /></Suspense></div>
      </div>
    );
  }

  const paper = RESEARCH[0], wess = RESEARCH[1];
  const w = WORK[work];
  const a = AWARDS[cert];

  return (
    <div className={`v-plinth${flat ? ' is-flat' : ''}${phone ? ' is-phone' : ''}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <div className="hall">
        {!flat && (
          <div className="stagecol" aria-hidden="true">
            <div className="stage"><Suspense fallback={null}><Stage phone={phone} work={work} cert={cert} slips={slips} /></Suspense></div>
          </div>
        )}
        <main id="main" className="labels">
          {/* The opening: the apple, and his name above its label. */}
          <section className="room hero" id="top" data-ex="apple" aria-labelledby="h-top">
            {flat && <Still ex="apple" alt="A red apple on a white plinth." />}
            <div className="lead">
              <nav className="nav" aria-label="Sections">
                {NAV.map(([id, t]) => <a key={id} href={`#${id}`}>{t}</a>)}
              </nav>
              <h1 className="who"><span>{PERSON.first}</span> <span>{PERSON.last}</span></h1>
              <p className="wholine">{PERSON.line}</p>
            </div>
            <div className="label" role="group" aria-labelledby="h-top">
              <h2 className="title" id="h-top"><i className="dot" aria-hidden="true" />{cap(LIKES[2])}</h2>
              <p className="by">{PERSON.short.join(' ')}</p>
              {PERSON.about.map((p) => <p key={p.slice(0, 24)} className="body">{p}</p>)}
              <p className="body soft">{PERSON.aside}</p>
            </div>
          </section>

          <Room id="debate" ex="watch" flat={flat} alt="A white chronograph lying on a white plinth." label="Debate">
            <h2 className="title" id="h-debate"><i className="dot" aria-hidden="true" />{cap(ROUND)}</h2>
            <p className="by">Debate</p>
            <ol className="wins">
              {DEBATE.wins.map((x) => (
                <li key={x.where}>
                  <p className="champ">{x.title}</p>
                  <p className="event">{x.event}</p>
                  <p className="fact">{x.where}, {x.when}</p>
                </li>
              ))}
            </ol>
            <div className="part">
              <h3 className="sub">{DEBATE.team.name}</h3>
              <p className="fact strong">{DEBATE.team.role}</p>
              <p className="body">{DEBATE.team.line}</p>
              <p className="body soft">{DEBATE.team.record}</p>
              <a className="go" href={DEBATE.team.href} {...ext(DEBATE.team.href)}>skeptical.pages.dev</a>
            </div>
            <div className="part">
              <h3 className="sub small">Up next</h3>
              <ul className="rows">
                {DEBATE.next.map((n) => <li key={n.where}><span>{n.where}</span><span className="soft">{n.event}</span></li>)}
              </ul>
            </div>
          </Room>

          <Room id="research" ex="paper" flat={flat} alt="A bound stack of fifteen sheets, the paper's title on the cover." label="Research">
            <h2 className="title long" id="h-research"><i className="dot" aria-hidden="true" />{paper.title}</h2>
            <p className="by">{paper.status}. {paper.pages} pages. DOI {paper.doi}</p>
            <p className="body">{paper.abstract}</p>
            <p className="fact"><span className="k">Keywords</span> {(paper.keywords ?? []).join(', ')}</p>
            <ul className="links">
              {paper.links.map((l) => <li key={l.href}><a className="go" href={l.href} {...ext(l.href)}>{l.label}</a></li>)}
            </ul>
            <div className="part">
              <h3 className="sub">{wess.title}</h3>
              <p className="fact strong">{wess.status}</p>
              <p className="body soft">{wess.abstract}</p>
            </div>
          </Room>

          <section className="room work" id="work" data-ex="prints" aria-labelledby="h-work">
            {flat ? (
              <div className="label" role="group" aria-labelledby="h-work">
                <h2 className="title" id="h-work"><i className="dot" aria-hidden="true" />Work</h2>
                <ol className="flatwork">
                  {WORK.map((x) => (
                    <li key={x.slug}>
                      <img src={BASE + x.img} alt={`${x.name}, a screenshot.`} loading="lazy" width={1200} height={700} />
                      <h3 className="sub">{x.name}</h3>
                      <p className="fact strong">{x.kind}</p>
                      <p className="body">{x.line}</p>
                      <p className="fact">{x.stack}</p>
                      {x.href ? <a className="go" href={x.href} {...ext(x.href)}>{x.href.replace(/^https:\/\//, '').replace(/\/$/, '')}</a> : <p className="fact soft">No public link.</p>}
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div className="label" role="group" aria-labelledby="h-work">
                <h2 className="count" id="h-work">Work, print {work + 1} of {WORK.length}</h2>
                <h3 className="title" key={w.slug}><i className="dot" aria-hidden="true" />{w.name}</h3>
                <p className="by">{w.kind}</p>
                <p className="body">{w.line}</p>
                <p className="fact">{w.stack}</p>
                {w.href ? <a className="go" href={w.href} {...ext(w.href)}>{w.href.replace(/^https:\/\//, '').replace(/\/$/, '')}</a> : <p className="fact soft">No public link.</p>}
                <button type="button" className="next" onClick={nextWork}>Next print</button>
                <ol className="index">
                  {WORK.map((x, i) => (
                    <li key={x.slug}>
                      <button type="button" aria-current={i === work ? 'true' : undefined} onClick={() => setWork(i)}>
                        <span className="n">{x.n}</span>{x.name}
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>

          <Room id="github" ex="slips" flat={flat} alt="A neat stack of paper slips, the top one printed with a commit message." label="Live from GitHub">
            <h2 className="title" id="h-github"><i className="dot" aria-hidden="true" />Live from GitHub</h2>
            <p className="by">{gh.live && gh.commitsThisMonth != null ? `${gh.commitsThisMonth} commits this month` : 'What he is building, in public'}</p>
            {gh.activity.length > 0 && (
              <ul className="commits">
                {gh.activity.slice(0, 6).map((c) => (
                  <li key={c.href + c.at}>
                    <a href={c.href} {...ext(c.href)}><span className="msg">{c.message.split('\n')[0]}</span></a>
                    <span className="fact">{c.repo.replace(/^wowneutral\//, '')}, {ago(c.at)}</span>
                  </li>
                ))}
              </ul>
            )}
            <ul className="repos">
              {gh.repos.slice(0, 6).map((r) => (
                <li key={r.name}>
                  <a href={r.href} {...ext(r.href)}>{r.name}</a>
                  {r.description && <p className="body soft">{r.description}</p>}
                  {r.language && <p className="fact">{r.language}</p>}
                </li>
              ))}
            </ul>
            <a className="go" href={GITHUB.href} {...ext(GITHUB.href)}>github.com/{GITHUB.user}</a>
          </Room>

          <Room id="today" ex="tea" flat={flat} alt="A white porcelain teacup on its saucer, on a white plinth." label="Today">
            <h2 className="title" id="h-today"><i className="dot" aria-hidden="true" />Today</h2>
            {latest ? (
              <>
                <p className="by"><time dateTime={latest.date}>{formatDate(latest.date)}</time></p>
                {latest.body.map((p, i) => <p key={i} className="body note">{p}</p>)}
              </>
            ) : (
              <p className="by">{loaded ? 'No note yet. Check back tomorrow.' : 'The note is on its way.'}</p>
            )}
            <p className="fact tea">{FAVOURITES[3]}.</p>
            {earlier.length > 0 && (
              <details className="earlier">
                <summary>Earlier notes <span className="soft">({earlier.length})</span></summary>
                <ol>
                  {earlier.map((n) => (
                    <li key={n.date}>
                      <p className="fact strong"><time dateTime={n.date}>{formatDate(n.date)}</time></p>
                      {n.body.map((p, i) => <p key={i} className="body">{p}</p>)}
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </Room>

          <Room id="now" ex="sphere" flat={flat} alt="An armillary sphere from 1771, brass rings around a small globe, on a white plinth." label="Now">
            <h2 className="title" id="h-now"><i className="dot" aria-hidden="true" />{NOW.club.title}</h2>
            <p className="by">{NOW.club.body}</p>
            <div className="part">
              <h3 className="sub">{NOW.reading.title}</h3>
              <p className="body">{NOW.reading.body}</p>
              <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <p className="body soft">{NOW.status}</p>
          </Room>

          <Room id="record" ex="certs" flat={flat} alt="Two award certificates standing on a white plinth." label="The record">
            <h2 className="title" id="h-record"><i className="dot" aria-hidden="true" />The record</h2>
            <ul className="stats">{STATS.map((s) => <li key={s.label}><b>{s.to}{s.suffix}</b> {s.label}</li>)}</ul>
            <ol className="honors">
              {HONORS.map((h) => <li key={h.what}><span>{h.what}</span><span className="fact">{h.detail}</span></li>)}
            </ol>
            <div className="part certs">
              {AWARDS.map((x) => (
                <a key={x.href} className="cert" href={x.href} {...ext(x.href)}>
                  <img src={BASE + x.img} alt={`Certificate: ${x.site}, ${x.note}.`} loading="lazy" width={720} height={1018} />
                  <span className="sub small">{x.site}</span>
                  <span className="fact">{x.note}</span>
                </a>
              ))}
            </div>
            {!flat && <button type="button" className="next" onClick={nextCert}>Turn to {AWARDS[(cert + 1) % AWARDS.length].site}</button>}
            <p className="sr-only-x" aria-live="polite">On the plinth: {a.site}</p>
          </Room>

          <Room id="off" ex="empty" flat={flat} alt="" label="Off the record">
            <h2 className="title" id="h-off"><i className="dot" aria-hidden="true" />{DISLIKES[1]}.</h2>
            <p className="by">Off the record. This plinth stays empty.</p>
            <div className="cols">
              <div><h3 className="sub small">Likes</h3><ul className="plain">{LIKES.map((x) => <li key={x}>{cap(x)}</li>)}</ul></div>
              <div><h3 className="sub small">Dislikes</h3><ul className="plain">{DISLIKES.map((x) => <li key={x}>{cap(x)}</li>)}</ul></div>
              <div><h3 className="sub small">Favourites</h3><ul className="plain">{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="sub small">Courses</h3><ul className="plain">{COURSES.map((c) => <li key={c.title}><b>{c.provider}, {c.title}.</b> {c.note}</li>)}</ul></div>
            </div>
          </Room>

          <Room id="contact" ex="name" flat={flat} alt="" label="Contact" className="last">
            <h2 className="title big" id="h-contact"><i className="dot" aria-hidden="true" />{PERSON.name}</h2>
            <p className="by">{PERSON.line}</p>
            <ul className="contact">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <span className="fact">{l.label}</span>
                  {l.href ? <a href={l.href} {...ext(l.href)}>{l.value}</a> : <span>{l.value}</span>}
                </li>
              ))}
            </ul>
          </Room>
        </main>
      </div>
      <footer className="foot">
        <p>Draft 68 of the portfolio. Not the live site.</p>
        <p className="credits">
          Models: apple “food_apple_01”, Poly Haven, CC0. “Chronograph Watch Mudmaster” by graphiccompressor, CC BY 4.0, via the Khronos glTF Sample Assets. Teacup, Khronos glTF Sample Assets, CC0. “Armillary sphere (1771)” by Franciszek Słupski, Jagiellonian University Museum, digitised by the Małopolska Institute of Culture, CC BY 4.0. Staging after the pmndrs stage presets example, MIT.
        </p>
      </footer>
    </div>
  );
}
