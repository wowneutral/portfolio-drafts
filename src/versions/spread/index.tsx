// Draft 16, The spread. In circuit LD, spreading is reading at speed; he built Spread to drill it.
// The page is read to you one word at a time on a reading point (recognition letter in red), then
// each part is set down beneath in a calm column. Scroll faster to read faster; hold to stop.
import { useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource/anton/400.css';
import '@fontsource-variable/instrument-sans/wght.css';
import './spread.css';
import { AWARDS, CHAPTERS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, STATS, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { scrollToY } from '@/lib/scroll';
import { Band, ctrl, lead, Orp, toks, Words, type BandHandle, type Tok } from './Band';

const src = (p: string) => import.meta.env.BASE_URL + p;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; ladders: { who: string; when: string; where: string }[]; epigraph: { text: string; source: string } };
const wess = RESEARCH[1];
const HOLD = 1500;

const OPEN: Tok[] = [PERSON.first, PERSON.last, ...PERSON.short];
const DEB: Tok[] = [
  ...toks(CHAPTERS[1].title + '.'),
  { w: 'Champion.', hold: HOLD }, ...toks(`${DEBATE.wins[0].where}.`),
  { w: 'Champion.', hold: HOLD }, ...toks(`${DEBATE.wins[1].where}.`),
  { w: 'Champion.', hold: HOLD },
];
const TEAM: Tok[] = [...toks(DEBATE.team.role + '.'), DEBATE.team.name + '.'];
const STAT_T: Tok[] = STATS.flatMap((s) => toks(`${s.to}${s.suffix} ${s.label.toLowerCase()}.`));
const workToks = (w: (typeof WORK)[number]): Tok[] => (w.slug === 'spread' ? [...toks(w.line), { w: w.name + '.', hold: 900 }] : [...toks(w.kind + '.'), ...toks(w.name + '.')]);

export default function SpreadPage() {
  useVersion('spread');
  const root = useRef<HTMLDivElement>(null);
  const today = useRef<BandHandle>(null);
  const todayWrap = useRef<HTMLDivElement>(null);
  const ending = useRef<BandHandle>(null);
  const aboutT = useRef<HTMLDivElement>(null);
  const resT = useRef<HTMLParagraphElement>(null);
  const noteT = useRef<HTMLElement>(null);
  const nowT = useRef<HTMLParagraphElement>(null);
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const [held, setHeld] = useState(false);
  const latest = notes[0];

  const noteToks = useMemo<Tok[]>(() => (latest ? toks(latest.body.join(' ')) : ['Today.']), [latest]);
  const ghToks = useMemo<Tok[]>(
    () => (gh.activity.length ? gh.activity.flatMap((a) => toks(a.message)) : gh.repos.flatMap((r) => [r.name + '.', ...toks(r.description ?? '')])),
    [gh.activity, gh.repos],
  );
  const whole = useMemo<Tok[]>(() => [
    ...OPEN, ...toks(lead(PERSON.about[0])), ...DEB, ...TEAM, ...toks(lead(paper.abstract)),
    ...WORK.flatMap((w) => toks(w.name + '.')), ...noteToks, ...toks(NOW.status), PERSON.first, PERSON.last + '.',
  ], [noteToks]);

  // Press and hold anywhere stops on the current word; Space toggles. Touch waits for a still press, so scrolling never pauses.
  useEffect(() => {
    let timer = 0, x = 0, y = 0;
    const sync = () => setHeld(ctrl.held || ctrl.toggled);
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('a,button')) return;
      x = e.clientX; y = e.clientY;
      if (e.pointerType === 'mouse') { ctrl.held = true; sync(); }
      else timer = window.setTimeout(() => { ctrl.held = true; sync(); }, 260);
    };
    const move = (e: PointerEvent) => { if (timer && Math.hypot(e.clientX - x, e.clientY - y) > 10) { clearTimeout(timer); timer = 0; } };
    const up = () => { clearTimeout(timer); timer = 0; if (ctrl.held) { ctrl.held = false; sync(); } };
    const key = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || (e.target as HTMLElement).closest('a,button,input,textarea')) return;
      e.preventDefault();
      ctrl.toggled = !ctrl.toggled; sync();
    };
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); window.removeEventListener('keydown', key);
      ctrl.held = ctrl.toggled = false;
    };
  }, []);

  const replay = (body: string[], own = false) => {
    const el = todayWrap.current;
    if (el) scrollToY(el.getBoundingClientRect().top + window.scrollY - 24);
    ctrl.toggled = false; setHeld(ctrl.held);
    today.current?.play(toks(body.join(' ')), 240, own);
  };

  return (
    <div className={`v-spread${held ? ' is-held' : ''}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>

      <header className="sp-open">
        <Band tokens={OPEN} wpm={150} size="xl" auto="load" delay={700} rest={PERSON.first} />
        <div className="sp-set">
          <h1>{PERSON.name}</h1>
          <p className="sp-line">{PERSON.line}</p>
          <p className="sp-hint">Scroll faster to read faster.</p>
        </div>
      </header>

      <main id="main">
        <section className="sp-sec" id="about" aria-labelledby="h-about">
          <Band tokens={toks(lead(PERSON.about[0]))} wpm={300} track={aboutT} />
          <div className="sp-col">
            <h2 id="h-about">About</h2>
            <div className="sp-body sp-about" ref={aboutT}>
              <p><Words text={lead(PERSON.about[0])} />{PERSON.about[0].slice(lead(PERSON.about[0]).length)}</p>
              <p>{PERSON.about[1]}</p>
              <p className="sp-aside">{PERSON.aside}</p>
            </div>
          </div>
        </section>

        <section className="sp-sec" id="debate" aria-labelledby="h-debate">
          <Band tokens={DEB} wpm={200} />
          <div className="sp-col sp-wide">
            <h2 id="h-debate">Debate</h2>
            <div className="sp-body">
              <ol className="sp-wins">
                {DEBATE.wins.map((w) => (
                  <li key={w.where}>
                    <span className="sp-big"><Orp w={w.title} /></span>
                    <span className="sp-ev">{w.event}</span>
                    <span className="sp-where">{w.where}</span>
                    <span className="sp-when">{w.when}</span>
                  </li>
                ))}
              </ol>
              <div className="sp-next">
                <h3>Up next</h3>
                <ul>
                  {DEBATE.next.map((n) => <li key={n.where}><span>{n.event}</span><span>{n.where}</span></li>)}
                </ul>
              </div>
              <p className="sp-drill"><a href="#work-spread">{WORK[4].name}</a>. {WORK[4].line}</p>
            </div>
          </div>
          <div className="sp-sub">
            <Band tokens={TEAM} wpm={260} size="m" />
            <div className="sp-col">
              <h3 className="sp-h2like"><Orp w={DEBATE.team.name} /></h3>
              <div className="sp-body sp-team">
                <p className="sp-role">{DEBATE.team.role}</p>
                <p className="sp-lede">{DEBATE.team.line}</p>
                <p>{DEBATE.team.record}</p>
                <a className="sp-go" href={DEBATE.team.href}>{host(DEBATE.team.href)}</a>
              </div>
            </div>
          </div>
        </section>

        <section className="sp-sec" id="research" aria-labelledby="h-research">
          <Band tokens={toks(lead(paper.abstract))} wpm={280} track={resT} />
          <div className="sp-col">
            <h2 id="h-research">Research</h2>
            <div className="sp-body">
              <p className="sp-title">{paper.title}</p>
              <p className="sp-meta">{paper.status}. {paper.pages} pages. DOI {paper.doi}</p>
              <p className="sp-lede" ref={resT}><Words text={lead(paper.abstract)} />{paper.abstract.slice(lead(paper.abstract).length)}</p>
              <blockquote className="sp-epi"><p>{paper.epigraph.text}</p><cite>{paper.epigraph.source}</cite></blockquote>
              <ol className="sp-ladders">
                {paper.ladders.map((l) => <li key={l.who}><span className="sp-who">{l.who}</span><span>{l.when}</span><span>{l.where}</span></li>)}
              </ol>
              <p className="sp-kw"><span className="sr-only-x">Keywords: </span>{paper.keywords.join(' / ')}</p>
              <ul className="sp-links">
                {paper.links.map((l) => <li key={l.label}><a href={l.href}>{l.label}</a></li>)}
              </ul>
              <div className="sp-wess">
                <h3>{wess.title}</h3>
                <p className="sp-meta">{wess.status}</p>
                <p>{wess.abstract}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="sp-sec sp-worksec" id="work" aria-labelledby="h-work">
          <div className="sp-col sp-colhead"><h2 id="h-work">Work</h2></div>
          {WORK.map((w, k) => (
            <article className={`sp-work${k % 2 ? ' is-r' : ''}`} id={`work-${w.slug}`} key={w.slug} aria-labelledby={`w-${w.slug}`}>
              <Band tokens={workToks(w)} wpm={w.slug === 'spread' ? 260 : 220} size="m" />
              <div className="sp-wrow">
                <figure className="sp-shot">
                  {w.href ? (
                    <a href={w.href} tabIndex={-1} aria-hidden="true"><img src={src(w.img)} alt="" loading="lazy" width={1200} height={750} /></a>
                  ) : <img src={src(w.img)} alt="" loading="lazy" width={1200} height={750} />}
                </figure>
                <div className="sp-wmeta">
                  <h3 id={`w-${w.slug}`}><Orp w={w.name} /></h3>
                  <p className="sp-kind">{w.kind}</p>
                  <p>{w.line}</p>
                  <p className="sp-stack">{w.stack}</p>
                  {w.href ? <a className="sp-go" href={w.href}>{host(w.href)}</a> : <p className="sp-stack">No public link.</p>}
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="sp-sec" id="github" aria-labelledby="h-gh">
          <Band tokens={ghToks} wpm={600} />
          <div className="sp-col">
            <h2 id="h-gh">Live from GitHub</h2>
            <div className="sp-body">
              {gh.activity.length > 0 && (
                <ol className="sp-commits">
                  {gh.activity.slice(0, 8).map((a) => (
                    <li key={a.href}><a href={a.href}>{a.message}</a><span>{a.repo}</span><span>{ago(a.at)}</span></li>
                  ))}
                </ol>
              )}
              <ul className="sp-repos">
                {gh.repos.slice(0, 8).map((r) => (
                  <li key={r.name}>
                    <a href={r.href}>{r.name}</a>
                    <span>{r.description ?? ''}</span>
                    <span className="sp-lang">{r.language ?? ''}</span>
                  </li>
                ))}
              </ul>
              <a className="sp-go" href={GITHUB.href}>{host(GITHUB.href)}</a>
            </div>
          </div>
        </section>

        <section className="sp-sec" id="today" aria-labelledby="h-today">
          <div ref={todayWrap}><Band ref={today} tokens={noteToks} wpm={200} track={noteT} /></div>
          <div className="sp-col">
            <h2 id="h-today">Today</h2>
            <div className="sp-body" aria-live="polite">
              {latest ? (
                <article className="sp-note" ref={noteT}>
                  <p className="sp-date"><time dateTime={latest.date}><Orp w={formatDate(latest.date)} /></time></p>
                  {latest.body.map((p, k) => <p className="sp-lede" key={p.slice(0, 16)}><Words text={p} from={latest.body.slice(0, k).reduce((n, q) => n + toks(q).length, 0)} /></p>)}
                </article>
              ) : (
                <article className="sp-note">
                  <p className="sp-date">{loaded ? 'No note yet' : 'Opening the notebook'}</p>
                  <p className="sp-lede">{NOW.status}</p>
                </article>
              )}
              {notes.length > 1 && (
                <div className="sp-earlier">
                  <h3>Earlier</h3>
                  <ol>
                    {notes.slice(1, 12).map((n) => (
                      <li key={n.date}>
                        <time dateTime={n.date}>{formatDate(n.date, { day: 'numeric', month: 'short' })}</time>
                        <p>{n.body.join(' ')}</p>
                        <button type="button" onClick={() => replay(n.body)}>Spread it<span className="sr-only-x">, the note from {formatDate(n.date)}</span></button>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {latest && <button type="button" className="sp-again" onClick={() => replay(latest.body, true)}>Spread today again</button>}
            </div>
          </div>
        </section>

        <section className="sp-sec" id="now" aria-labelledby="h-now">
          <Band tokens={toks(NOW.status)} wpm={300} size="m" track={nowT} />
          <div className="sp-col">
            <h2 id="h-now">Now</h2>
            <div className="sp-body sp-now">
              <div>
                <h3>{NOW.reading.title}</h3>
                <p>{NOW.reading.body}</p>
                <ul className="sp-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
              <div>
                <h3>{NOW.club.title}</h3>
                <p>{NOW.club.body}</p>
              </div>
              <p className="sp-status" ref={nowT}><Words text={NOW.status} /></p>
            </div>
          </div>
        </section>

        <section className="sp-sec" id="record" aria-labelledby="h-record">
          <Band tokens={STAT_T} wpm={300} />
          <div className="sp-col">
            <h2 id="h-record">Record</h2>
            <div className="sp-body">
              <ul className="sp-stats">
                {STATS.map((s) => <li key={s.label}><span className="sp-num">{s.to}{s.suffix}</span><span>{s.label}</span></li>)}
              </ul>
              <ol className="sp-honors">
                {HONORS.map((h) => <li key={h.what}><span>{h.what}</span><span>{h.detail}</span></li>)}
              </ol>
              <ul className="sp-awards">
                {AWARDS.map((a) => (
                  <li key={a.site}>
                    <a href={a.href}>
                      <img src={src(a.img)} alt={`Certificate: ${a.site}`} loading="lazy" width={600} height={850} />
                      <span className="sp-aw">{a.site}</span>
                      <span className="sp-meta">{a.note}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="sp-sec sp-off" id="off" aria-labelledby="h-off">
          <div className="sp-col">
            <h2 id="h-off">Off the record</h2>
            <div className="sp-body sp-offgrid">
              <div><h3>Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3>Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3>Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider} {c.title}</strong> {c.note}</li>)}</ul></div>
            </div>
          </div>
        </section>

        <section className="sp-sec" id="contact" aria-labelledby="h-contact">
          <div className="sp-col">
            <h2 id="h-contact">Contact</h2>
            <ul className="sp-body sp-contact">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <span className="sp-meta">{l.label}</span>
                  {l.href ? <a href={l.href}>{l.value}</a> : <span className="sp-val">{l.value}</span>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="sp-end">
        <Band ref={ending} tokens={[PERSON.first, PERSON.last + '.']} wpm={140} size="xl" rest={PERSON.last + '.'} />
        <div className="sp-col sp-foot">
          <button type="button" className="sp-again" onClick={() => ending.current?.play(whole, 600)}>Spread the whole page</button>
          <p>Draft 16 of the portfolio. Not the live site.</p>
          <p className="sp-meta">Set in Anton and Instrument Sans.</p>
        </div>
      </footer>
    </div>
  );
}
