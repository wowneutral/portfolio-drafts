// Draft 50, The poster. A flat blue tournament poster of his two championships, set wall to wall in Archivo;
// the letters thicken and widen toward the pointer (remixed from fancy's VariableFontCursorProximity, MIT).
// Every section after it is another flat poster: one colour field, one face, real space.
import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import '@fontsource-variable/archivo/wdth.css';
import './poster.css';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { Row, useProximity } from './Prox';

const src = (p: string) => import.meta.env.BASE_URL + p;
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[] };
const wess = RESEARCH[1];
const NAV = [
  ['debate', 'Debate'], ['today', 'Today'], ['work', 'Work'], ['research', 'Research'],
  ['github', 'GitHub'], ['record', 'Record'], ['contact', 'Contact'],
] as const;

function usePhone() {
  const q = '(max-width: 760px)';
  const [m, set] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches);
  useLayoutEffect(() => {
    const mq = matchMedia(q);
    const on = () => set(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}

/** Static poster type, fitted to the width of its box (capped in vh so it never towers). */
function useFit(root: RefObject<HTMLElement | null>, deps: unknown[]) {
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    let raf = 0;
    const fit = () => {
      const items = [...el.querySelectorAll<HTMLElement>('.po-fit')];
      items.forEach((f) => { f.style.fontSize = '100px'; });
      const nat = items.map((f) => (f.firstElementChild as HTMLElement).getBoundingClientRect().width);
      items.forEach((f, i) => {
        const box = f.getBoundingClientRect().width;
        const cap = (+(f.dataset.cap ?? 30) / 100) * innerHeight;
        f.style.fontSize = Math.max(16, Math.min(cap, (box / Math.max(1, nat[i])) * 99)) + 'px';
      });
    };
    const run = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); };
    fit();
    document.fonts?.ready.then(run);
    const ro = new ResizeObserver(run);
    ro.observe(el);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

function Fit({ children, cap = 30, className = '', as: Tag = 'span' }: { children: ReactNode; cap?: number; className?: string; as?: 'span' | 'h2' | 'h3' | 'p' }) {
  return <Tag className={'po-fit ' + className} data-cap={cap}><span className="po-in">{children}</span></Tag>;
}

function Poster() {
  const ref = useRef<HTMLElement>(null);
  const phone = usePhone();
  useProximity(ref, [phone]);
  return (
    <header className="po-hero" ref={ref}>
      <div className="po-strip">
        <h1 className="po-name">{PERSON.name}</h1>
        <p className="po-line">{PERSON.line}</p>
        <nav className="po-nav" aria-label="Sections">
          {NAV.map(([id, label]) => <a key={id} href={'#' + id}>{label}</a>)}
        </nav>
      </div>
      <div className="po-wins">
        {DEBATE.wins.map((w) => {
          const [first, ...restWords] = w.event.split(' ');
          return (
            <p className="po-win" key={w.where}>
              <span className="sr-only-x">{`${w.title}, ${w.event}, ${w.where}, ${w.when}`}</span>
              <Row text={w.title} className="po-champ" cap={phone ? 12 : 27} />
              <Row text={first} className="po-ev po-ev1" cap={phone ? 8 : 14} />
              <Row text={restWords.join(' ')} className="po-ev" cap={phone ? 7 : 13} />
              <Row text={w.where} className="po-where" cap={phone ? 7 : 13} />
              <span className="po-year" aria-hidden="true">{w.when}</span>
            </p>
          );
        })}
      </div>
      <p className="po-hint" aria-hidden="true">{phone ? 'Touch the poster.' : 'Move across the poster.'}</p>
    </header>
  );
}

function Debate() {
  return (
    <section className="po-sec po-ink po-debate" id="debate" aria-labelledby="debate-h">
      <div className="po-team">
        <h2 id="debate-h" className="sr-only-x">Debate</h2>
        <p className="po-role">{DEBATE.team.role}</p>
        <Fit cap={34} className="po-teamname">{DEBATE.team.name}</Fit>
        <div className="po-cols">
          <p className="po-lede">{DEBATE.team.line}</p>
          <p className="po-body">{DEBATE.team.record}</p>
        </div>
        <a className="po-biglink" href={DEBATE.team.href}>skeptical.pages.dev</a>
      </div>
      <div className="po-next">
        <h3 className="po-h3">Up next</h3>
        <ol>
          {DEBATE.next.map((n) => (
            <li key={n.where}>
              <Fit cap={13} className="po-venue">{n.where}</Fit>
              <span className="po-event">{n.event}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Today() {
  const { notes, loaded } = useNotes();
  const [sel, setSel] = useState(0);
  const note = notes[sel] ?? notes[0];
  return (
    <section className="po-sec po-paper po-today" id="today" aria-labelledby="today-h">
      <div className="po-today-top">
        <h2 id="today-h" className="po-h2">Today</h2>
        <p className="po-sub">The daily note.</p>
      </div>
      {note ? (
        <article className="po-note" aria-live="polite">
          <p className="po-date">
            <time dateTime={note.date}>
              <span className="po-day">{formatDate(note.date, { day: 'numeric' })}</span>
              <span className="po-month">{formatDate(note.date, { month: 'long', year: 'numeric' })}</span>
            </time>
          </p>
          <div className="po-notebody">{note.body.map((b, i) => <p key={i}>{b}</p>)}</div>
        </article>
      ) : (
        <article className="po-note">
          <p className="po-date"><span className="po-day po-dayword">{loaded ? 'Now' : 'Today'}</span></p>
          <div className="po-notebody"><p>{loaded ? NOW.status : 'Opening the notebook.'}</p></div>
        </article>
      )}
      {notes.length > 1 && (
        <div className="po-earlier">
          <h3 className="po-h3">Earlier</h3>
          <ul>
            {notes.map((n, i) => (
              <li key={n.date}>
                <button type="button" aria-pressed={i === sel} onClick={() => setSel(i)}>
                  <time dateTime={n.date}>{formatDate(n.date)}</time>
                  <span>{n.body[0]}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function About() {
  return (
    <section className="po-sec po-blue po-about" id="about" aria-labelledby="about-h">
      <h2 id="about-h" className="po-short">
        {PERSON.short.map((s) => <Fit key={s} cap={16} className="po-shortw">{s}</Fit>)}
      </h2>
      <div className="po-aboutbody">
        {PERSON.about.map((p) => <p key={p.slice(0, 16)}>{p}</p>)}
        <p className="po-aside">{PERSON.aside}</p>
      </div>
    </section>
  );
}

function Work() {
  return (
    <section className="po-sec po-paper po-work" id="work" aria-labelledby="work-h">
      <h2 id="work-h" className="po-h2">Work</h2>
      <ul className="po-wall">
        {WORK.map((w) => (
          <li className="po-sheet" key={w.slug}>
            <Fit as="h3" cap={24} className="po-sheetname">{w.name}</Fit>
            <img src={src(w.img)} alt={`${w.name}, screenshot`} width={1200} height={660} loading="lazy" decoding="async" />
            <div className="po-sheetfoot">
              <p className="po-kind">{w.kind}</p>
              <p className="po-sheetline">{w.line}</p>
              <p className="po-stack">{w.stack}</p>
              {w.href && <a className="po-go" href={w.href}>Open {w.name}</a>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function GitHub() {
  const gh = useGitHub();
  const commits = gh.activity.slice(0, 7);
  return (
    <section className="po-sec po-ink po-gh" id="github" aria-labelledby="gh-h">
      <div className="po-ghhead">
        <h2 id="gh-h" className="po-h2">Live from GitHub</h2>
        <a className="po-biglink" href={GITHUB.href}>github.com/wowneutral</a>
      </div>
      {commits.length > 0 && (
        <div className="po-ghblock">
          <h3 className="po-h3">Latest commits</h3>
          <ol className="po-commits">
            {commits.map((c) => (
              <li key={c.href}>
                <a href={c.href}>
                  <span className="po-msg">{c.message}</span>
                  <span className="po-meta">{c.repo}, {ago(c.at)}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}
      <div className="po-ghblock">
        <h3 className="po-h3">Repositories</h3>
        <ol className={'po-repos' + (commits.length ? ' po-repos-sm' : '')}>
          {gh.repos.slice(0, 8).map((r) => (
            <li key={r.name}>
              <a href={r.href}>
                <span className="po-rname">{r.name}</span>
                <span className="po-rdesc">{r.description ?? 'No description yet.'}</span>
                {r.language && <span className="po-meta">{r.language}{r.pushedAt ? `, pushed ${ago(r.pushedAt)}` : ''}</span>}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Research() {
  return (
    <section className="po-sec po-paper po-research" id="research" aria-labelledby="re-h">
      <h2 id="re-h" className="sr-only-x">Research</h2>
      <div className="po-paperhead">
        <p className="po-status">{paper.status}, {paper.pages} pages</p>
        <h3 className="po-title">{paper.title}</h3>
      </div>
      <div className="po-paperbody">
        <p className="po-abstract">{paper.abstract}</p>
        <p className="po-keys"><span className="sr-only-x">Keywords: </span>{paper.keywords.join(' / ')}</p>
      </div>
      <ul className="po-plinks">
        {paper.links.map((l) => <li key={l.label}><a href={l.href}>{l.label}</a></li>)}
      </ul>
      <div className="po-wess">
        <h3 className="po-wtitle">{wess.title}</h3>
        <p className="po-status">{wess.status}</p>
        <p className="po-body">{wess.abstract}</p>
      </div>
    </section>
  );
}

function Now() {
  return (
    <section className="po-sec po-blue po-now" id="now" aria-labelledby="now-h">
      <h2 id="now-h" className="po-h2">Now</h2>
      <div className="po-reading">
        <h3 className="po-h3">{NOW.reading.title}</h3>
        <ul className="po-shelves">
          {NOW.reading.shelves.map((s) => <li key={s}><Fit cap={12}>{s}</Fit></li>)}
        </ul>
        <p className="po-body">{NOW.reading.body}</p>
      </div>
      <div className="po-nowside">
        <div>
          <h3 className="po-h3">{NOW.club.title}</h3>
          <p className="po-body">{NOW.club.body}</p>
        </div>
        <p className="po-statusline">{NOW.status}</p>
      </div>
    </section>
  );
}

function Record() {
  return (
    <section className="po-sec po-ink po-record" id="record" aria-labelledby="rec-h">
      <h2 id="rec-h" className="po-h2">Record</h2>
      <ol className="po-results">
        {HONORS.map((h) => (
          <li key={h.what}><span className="po-what">{h.what}</span><span className="po-detail">{h.detail}</span></li>
        ))}
      </ol>
      <ul className="po-certs">
        {AWARDS.map((a) => (
          <li key={a.site}>
            <a href={a.href}>
              <img src={src(a.img)} alt={`Certificate, ${a.site}`} width={720} height={1018} loading="lazy" decoding="async" />
              <span className="po-certname">{a.site}</span>
              <span className="po-meta">{a.note}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Off() {
  const cols: [string, readonly string[]][] = [['Likes', LIKES], ['Dislikes', DISLIKES], ['Favourites', FAVOURITES]];
  return (
    <section className="po-sec po-paper po-off" id="off" aria-labelledby="off-h">
      <h2 id="off-h" className="po-h2">Off the record</h2>
      <div className="po-offgrid">
        {cols.map(([t, items]) => (
          <div key={t}>
            <h3 className="po-h3">{t}</h3>
            <ul>{items.map((i) => <li key={i}>{i}</li>)}</ul>
          </div>
        ))}
        <div>
          <h3 className="po-h3">Courses</h3>
          <ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider}, {c.title}.</b> {c.note}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section className="po-sec po-blue po-contact" id="contact" aria-labelledby="ct-h">
      <h2 id="ct-h" className="po-h2">Contact</h2>
      <a className="po-mail" href={LINKS[0].href}><Fit cap={20}>{LINKS[0].value}</Fit></a>
      <ul className="po-links">
        {LINKS.slice(1).map((l) => (
          <li key={l.label}>
            <span className="po-meta">{l.label}</span>
            {l.href ? <a href={l.href}>{l.value}</a> : <span className="po-plain">{l.value}</span>}
          </li>
        ))}
      </ul>
      <footer className="po-foot">
        <p>Draft 50 of the portfolio. Not the live site.</p>
        <p>The weight effect is adapted from fancy by Daniel Petho (MIT). Set in Archivo.</p>
        <a href="#top">Back to the poster</a>
      </footer>
    </section>
  );
}

export default function PosterPage() {
  useVersion('poster');
  const root = useRef<HTMLDivElement>(null);
  const phone = usePhone();
  useFit(root, [phone]);
  return (
    <div className="v-poster" ref={root} id="top">
      <a className="skip-x" href="#main">Skip to content</a>
      <Poster />
      <main id="main">
        <Debate />
        <Today />
        <About />
        <Work />
        <GitHub />
        <Research />
        <Now />
        <Record />
        <Off />
        <Contact />
      </main>
    </div>
  );
}
