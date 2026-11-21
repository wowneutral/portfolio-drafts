// Draft 74, The plain. Base: React Bits ElasticSlider (MIT + Commons Clause), remixed in Dial.tsx into the one Presentation dial.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/newsreader/opsz.css';
import './plain.css';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { getLenis } from '@/lib/scroll';
import { still } from '@/lib/utils';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { Dial } from './Dial';

const BASE = import.meta.env.BASE_URL;
const KEY = 'plain:presentation';
const NAMES = ['Plain HTML', 'No scale', 'No display face', 'No colour', 'Full'];
const host = (href: string) => href.replace(/^https?:\/\//, '').replace(/\/$/, '');
const NAV = [['about', 'About'], ['debate', 'Debate'], ['research', 'Research'], ['work', 'Work'], ['today', 'Today'], ['github', 'GitHub'], ['record', 'Record'], ['contact', 'Contact']] as const;

function readStored(): number | null {
  try {
    const v = localStorage.getItem(KEY);
    return v !== null && /^[0-4]$/.test(v) ? Number(v) : null;
  } catch { return null; }
}

function Today() {
  const { notes, loaded } = useNotes();
  const [pick, setPick] = useState(0);
  const note = notes[pick];
  return (
    <section id="today" className="pl-sec pl-today" aria-labelledby="today-h">
      <h2 id="today-h" className="pl-h2">Today</h2>
      <div className="pl-today-g">
        {note ? (
          <article className="pl-note" aria-live="polite">
            <h3 className="pl-note-d"><time dateTime={note.date}>{formatDate(note.date)}</time></h3>
            {note.body.map((p, i) => <p key={i} className="pl-note-p">{p}</p>)}
          </article>
        ) : (
          <article className="pl-note">
            <h3 className="pl-note-d">{loaded ? 'No note yet' : 'Today'}</h3>
            <p className="pl-note-p">{loaded ? 'The daily note will appear here.' : 'Loading the latest note.'}</p>
          </article>
        )}
        {notes.length > 1 && (
          <div className="pl-earlier">
            <h3 className="pl-h3">Earlier notes</h3>
            <ul className="pl-earlier-l">
              {notes.map((n, i) => (
                <li key={n.date}>
                  <button type="button" className="pl-btn" aria-pressed={i === pick} onClick={() => setPick(i)}>
                    {formatDate(n.date, { day: 'numeric', month: 'short', year: 'numeric' })}
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

function GitHub() {
  const { repos, activity, commitsThisMonth, live } = useGitHub();
  return (
    <section id="github" className="pl-sec pl-gh pl-paper" aria-labelledby="gh-h">
      <h2 id="gh-h" className="pl-h2">Live from GitHub</h2>
      <p className="pl-gh-sub">
        {live && commitsThisMonth !== null ? `${commitsThisMonth} commits this month, as wowneutral.` : 'What he is building, as wowneutral.'}
      </p>
      <div className={'pl-gh-g' + (activity.length ? ' pl-gh-live' : '')}>
        {activity.length > 0 && (
          <div className="pl-commits">
            <h3 className="pl-h3">Recent commits</h3>
            <ol className="pl-commits-l">
              {activity.slice(0, 6).map((a) => (
                <li key={a.href}>
                  <a href={a.href} className="pl-commit">
                    <span className="pl-commit-r">{a.repo}</span>
                    <span className="pl-commit-m">{a.message}</span>
                    <span className="pl-commit-t">{ago(a.at)}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        )}
        <div className="pl-repos">
          <h3 className="pl-h3">Repositories</h3>
          <ul className="pl-repos-l">
            {repos.slice(0, 6).map((r) => (
              <li key={r.name} className="pl-repo">
                <a href={r.href} className="pl-repo-n">{r.name}</a>
                {r.description && <p className="pl-repo-d">{r.description}</p>}
                {r.language && <p className="pl-repo-l">{r.language}</p>}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="pl-gh-all"><a href={GITHUB.href}>{host(GITHUB.href)}</a></p>
    </section>
  );
}

export default function Plain() {
  useVersion('plain');
  const stored = useRef(readStored());
  const [p, setP] = useState<number>(() => stored.current ?? 4);
  const [touched, setTouched] = useState(stored.current !== null);
  const touchedRef = useRef(touched);
  touchedRef.current = touched;
  const anchor = useRef<{ el: Element; top: number } | null>(null);
  const pRef = useRef(p);
  pRef.current = p;

  // Each step is an instant swap; keep the line the reader was on where it was.
  const apply = (next: number) => {
    if (next === pRef.current) return;
    const els = document.querySelectorAll('#main :is(h1, h2, h3, p, li, figure)');
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.bottom > 72 && r.height > 0) { anchor.current = { el, top: r.top }; break; }
    }
    setP(next);
  };

  useLayoutEffect(() => {
    document.documentElement.dataset.p = String(p);
    const a = anchor.current;
    anchor.current = null;
    if (!a || window.scrollY < 8) return;
    const d = a.el.getBoundingClientRect().top - a.top;
    if (Math.abs(d) < 1) return;
    const y = Math.max(0, window.scrollY + d);
    const l = getLenis();
    l?.resize();
    if (l) l.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  }, [p]);

  // After useVersion has painted the page colour, follow the dial.
  useEffect(() => {
    const c = p === 4 ? '#10261f' : '#ffffff';
    document.documentElement.style.background = c;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', c);
  }, [p]);
  useEffect(() => () => { delete document.documentElement.dataset.p; }, []);

  const onDial = (v: number) => {
    setTouched(true);
    apply(v);
    try { localStorage.setItem(KEY, String(v)); } catch { /* storage blocked: the page still works */ }
  };

  // The ending: at Contact, an untouched dial turns itself to zero, one hard step at a time.
  const contact = useRef<HTMLElement>(null);
  useEffect(() => {
    if (still || !contact.current) return;
    let done = false;
    const timers: number[] = [];
    const io = new IntersectionObserver(([e]) => {
      if (done || !e.isIntersecting || touchedRef.current || pRef.current !== 4) return;
      done = true;
      io.disconnect();
      [3, 2, 1, 0].forEach((v, i) => timers.push(window.setTimeout(() => { if (!touchedRef.current) apply(v); }, 700 + i * 520)));
    }, { threshold: 0.4 });
    io.observe(contact.current);
    return () => { io.disconnect(); timers.forEach(clearTimeout); };
  }, []);

  const paper = RESEARCH[0];
  const wesso = RESEARCH[1];
  const team = DEBATE.team;

  return (
    <div className="v-plain" data-p={p}>
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="pl-strip">
        <Dial value={p} names={NAMES} onChange={onDial} label="Presentation" />
      </header>

      <main id="main">
        <section className="pl-hero" aria-labelledby="name-h">
          <h1 id="name-h" className="pl-name"><span className="pl-name-a">{PERSON.first}</span> <span className="pl-name-b">{PERSON.last}</span></h1>
          <ul className="pl-hero-wins" aria-label="This fall">
            {DEBATE.wins.map((w) => (
              <li key={w.where} className="pl-hw">
                <strong className="pl-hw-t">{w.title}</strong> <span className="pl-hw-e">{w.event}</span> <span className="pl-hw-w">{w.where}, {w.when}</span>
              </li>
            ))}
          </ul>
          <p className="pl-line">{PERSON.line}</p>
          <nav className="pl-nav" aria-label="Sections">
            <ul>
              {NAV.map(([id, label]) => <li key={id}><a href={'#' + id}>{label}</a></li>)}
            </ul>
          </nav>
        </section>

        <section id="about" className="pl-sec pl-about" aria-labelledby="about-h">
          <h2 id="about-h" className="pl-h2">About</h2>
          <div className="pl-about-g">
            <p className="pl-lead">{PERSON.about[0]}</p>
            <div className="pl-about-r">
              <p>{PERSON.about[1]}</p>
              <p className="pl-aside">{PERSON.aside}</p>
            </div>
          </div>
        </section>

        <section id="debate" className="pl-sec pl-debate" aria-labelledby="debate-h">
          <h2 id="debate-h" className="pl-h2">Debate</h2>
          <ul className="pl-champs">
            {DEBATE.wins.map((w) => (
              <li key={w.where} className="pl-champ">
                <strong className="pl-champ-t">{w.title}</strong>
                <span className="pl-champ-e">{w.event}</span>
                <span className="pl-champ-w">{w.where}</span>
                <span className="pl-champ-y">{w.when}</span>
              </li>
            ))}
          </ul>
          {p === 4 && !touched && <p className="pl-hint">Turn the dial.</p>}
          <div className="pl-debate-g">
            <div className="pl-next">
              <h3 className="pl-h3">Up next</h3>
              <ul className="pl-next-l">
                {DEBATE.next.map((n) => (
                  <li key={n.where}><span className="pl-next-e">{n.event}</span> <span className="pl-next-w">{n.where}</span></li>
                ))}
              </ul>
            </div>
            <div className="pl-team">
              <p className="pl-role">{team.role}</p>
              <h3 className="pl-team-n">{team.name}</h3>
              <p className="pl-team-l">{team.line}</p>
              <p className="pl-team-r">{team.record}</p>
              <p className="pl-team-a"><a href={team.href}>{host(team.href)}</a></p>
            </div>
          </div>
        </section>

        <section id="research" className="pl-sec pl-research pl-paper" aria-labelledby="research-h">
          <h2 id="research-h" className="pl-h2">Research</h2>
          <article className="pl-art" aria-labelledby="paper-h">
            <blockquote className="pl-epi">
              <p>{paper.epigraph!.text}</p>
              <footer><cite>{paper.epigraph!.source}</cite></footer>
            </blockquote>
            <h3 id="paper-h" className="pl-paper-t">{paper.title}</h3>
            <p className="pl-status">{paper.status}. {paper.pages} pages. DOI {paper.doi}</p>
            <div className="pl-art-g">
              <p className="pl-abs">{paper.abstract}</p>
              <div className="pl-art-r">
                <h4 className="pl-h4">Keywords</h4>
                <ul className="pl-kw">{paper.keywords!.map((k) => <li key={k}>{k}</li>)}</ul>
                <h4 className="pl-h4">Read it</h4>
                <ul className="pl-plinks">{paper.links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>
              </div>
            </div>
            <h4 className="pl-h4 pl-ladders-h">Three ladders</h4>
            <ol className="pl-ladders">
              {paper.ladders!.map((l) => (
                <li key={l.who} className="pl-ladder">
                  <span className="pl-ladder-w">{l.who}</span> <span className="pl-ladder-d">{l.when}</span> <span className="pl-ladder-s">{l.where}</span>
                </li>
              ))}
            </ol>
          </article>
          <article className="pl-wesso" aria-labelledby="wesso-h">
            <h3 id="wesso-h" className="pl-wesso-t">{wesso.title}</h3>
            <p className="pl-status">{wesso.status}</p>
            <p className="pl-wesso-a">{wesso.abstract}</p>
          </article>
        </section>

        <section id="work" className="pl-sec pl-work" aria-labelledby="work-h">
          <h2 id="work-h" className="pl-h2">Work</h2>
          <ul className="pl-spread">
            {WORK.map((w) => (
              <li key={w.slug} className={'pl-w pl-w-' + w.slug}>
                <figure className="pl-fig">
                  <img src={BASE + w.img} alt={`Screenshot of ${w.name}`} loading="lazy" width={1200} height={700} />
                  <figcaption className="pl-cap">
                    <h3 className="pl-w-n">{w.name}</h3>
                    <p className="pl-w-k">{w.kind}</p>
                    <p className="pl-w-l">{w.line}</p>
                    <p className="pl-w-s">{w.stack}</p>
                    {w.href ? <p className="pl-w-a"><a href={w.href}>{host(w.href)}</a></p> : <p className="pl-w-a">No public link</p>}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </section>

        <Today />
        <GitHub />

        <section id="now" className="pl-sec pl-now" aria-labelledby="now-h">
          <h2 id="now-h" className="pl-h2">Now</h2>
          <div className="pl-now-g">
            <div className="pl-now-c">
              <h3 className="pl-h3">{NOW.reading.title}</h3>
              <p>{NOW.reading.body}</p>
              <ul className="pl-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div className="pl-now-c">
              <h3 className="pl-h3">{NOW.club.title}</h3>
              <p>{NOW.club.body}</p>
            </div>
            <div className="pl-now-c">
              <h3 className="pl-h3">Status</h3>
              <p>{NOW.status}</p>
            </div>
          </div>
        </section>

        <section id="record" className="pl-sec pl-record pl-paper" aria-labelledby="record-h">
          <h2 id="record-h" className="pl-h2">Record</h2>
          <div className="pl-record-g">
            <ul className="pl-honors">
              {HONORS.map((h) => (
                <li key={h.what} className="pl-honor"><span className="pl-honor-w">{h.what}</span> <span className="pl-honor-d">{h.detail}</span></li>
              ))}
            </ul>
            <ul className="pl-awards">
              {AWARDS.map((a) => (
                <li key={a.href}>
                  <a href={a.href} className="pl-award">
                    <img src={BASE + a.img} alt={`WD Awards certificate for ${a.site}`} loading="lazy" width={720} height={1018} />
                    <span className="pl-award-s">{a.site}</span> <span className="pl-award-n">{a.note}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="off" className="pl-sec pl-off" aria-labelledby="off-h">
          <h2 id="off-h" className="pl-h2">Off the record</h2>
          <div className="pl-off-g">
            <div>
              <h3 className="pl-h3">Likes</h3>
              <ul className="pl-off-l">{LIKES.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
            <div>
              <h3 className="pl-h3">Dislikes</h3>
              <ul className="pl-off-l">{DISLIKES.map((x) => <li key={x} className={x.includes('presentation') ? 'pl-mine' : undefined}>{x}</li>)}</ul>
            </div>
            <div>
              <h3 className="pl-h3">Favourites</h3>
              <ul className="pl-off-l">{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
            <div>
              <h3 className="pl-h3">Courses</h3>
              <ul className="pl-off-l">{COURSES.map((c) => <li key={c.title}><strong>{c.provider} {c.title}</strong> <span>{c.note}</span></li>)}</ul>
            </div>
          </div>
        </section>

        <section id="contact" ref={contact} className="pl-sec pl-contact" aria-labelledby="contact-h">
          <h2 id="contact-h" className="pl-h2">Contact</h2>
          <p className="pl-mail"><a href={LINKS[0].href}>{LINKS[0].value}</a></p>
          <ul className="pl-links">
            {LINKS.slice(1).map((l) => (
              <li key={l.label}><span className="pl-links-k">{l.label}</span> {l.href ? <a href={l.href}>{l.value}</a> : <span>{l.value}</span>}</li>
            ))}
          </ul>
          <p className="pl-coda">Every word on this page survives the dial.</p>
        </section>
      </main>

      <footer className="pl-foot">
        <p>Draft 74 of the portfolio. Not the live site.</p>
        <p>The Presentation dial is adapted from the React Bits Elastic Slider.</p>
      </footer>
    </div>
  );
}
