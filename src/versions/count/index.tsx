// Draft 59: the count. One giant Bodoni numeral in the left column rolls, like an
// odometer, to each section's number as the section crosses the middle of the
// screen. Every number is one of his: from content.ts, useGitHub() or useNotes().
// The numeral is the React Bits Counter (see Odometer.tsx), driven by scroll.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/archivo/wdth.css';
import './count.css';
import { PERSON, CHAPTERS, DEBATE, RESEARCH, WORK, HONORS, AWARDS, STATS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { useVersion } from '@/lib/version';
import Odometer from './Odometer';

const BASE = import.meta.env.BASE_URL;
const PAPER = RESEARCH[0];
const EPI = PAPER.epigraph!;
const PAGES = PAPER.pages ?? 0;
const LADDERS = PAPER.ladders ?? [];
const KEYWORDS = PAPER.keywords ?? [];
const WESSO = RESEARCH[1];
const MITEZ = CHAPTERS.find((c) => c.id === 'mitez')!;
const TWO = CHAPTERS.find((c) => c.id === 'debate')!;
const yearOf = (s: string) => Number((s.match(/\d+/) ?? ['0'])[0]);
const PAPER_YEAR = yearOf(PAPER.status);
const MENTORED = STATS[0];
const TITLES = STATS[2];
const FIRST = DEBATE.team.record.split(':')[0];

const NOGROUP = { useGrouping: false } as const;

const NAV = [['debate', 'Debate'], ['research', 'Research'], ['work', 'Work'], ['github', 'GitHub'], ['today', 'Today'], ['contact', 'Contact']] as const;

type Stop = { n: number; plus: boolean; label: string };

const Ext = ({ href, className, children }: { href: string; className?: string; children: ReactNode }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

function usePhone() {
  const q = '(max-width: 820px)';
  const [phone, set] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => set(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return phone;
}

/** The section's own number. On desktop plain text (the column carries the motion); on phones a large odometer that rolls once as it enters. */
function Num({ n, plus, phone }: { n: number; plus?: boolean; phone: boolean }) {
  if (!phone) return <span className="hn">{n}{plus && <span className="plus">+</span>}</span>;
  const d = String(n).length;
  const size = d >= 4 ? '24vw' : d === 3 ? '32vw' : d === 2 ? '50vw' : '78vw';
  return (
    <span className="hn hn-big">
      <span className="sr-only-x">{n}{plus ? '+' : ''}</span>
      <span aria-hidden="true" className="hn-row">
        <Odometer value={n} format={NOGROUP} fontSize={size} duration={1.1} bounce={0.14} stagger={0.07} fade={0.18} />
        {plus && <span className="p-draw" style={{ fontSize: size }} />}
      </span>
    </span>
  );
}

function Head({ n, plus, label, phone, as: H = 'h2' }: { n?: number; plus?: boolean; label: ReactNode; phone: boolean; as?: 'h2' | 'h3' }) {
  return (
    <H className={'count-row' + (H === 'h3' ? ' is-sub' : '')}>
      {n !== undefined && <Num n={n} plus={plus} phone={phone} />}
      <span className="cl">{label}</span>
    </H>
  );
}

/** The giant numeral. Sits in its own sticky column; scales (transform only) so one digit fills the column and 2026 still fits. */
function Giant({ stop }: { stop: Stop }) {
  const box = useRef<HTMLDivElement>(null);
  const meas = useRef<HTMLSpanElement>(null);
  const [F, setF] = useState(600);
  const [s, setS] = useState(1);
  const text = String(stop.n) + (stop.plus ? '+' : '');
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      const h = el.clientHeight, w = el.clientWidth;
      const f = Math.round(h * 1.06);
      setF(f);
      const m = meas.current;
      if (!m) return;
      m.style.fontSize = f + 'px';
      const tw = m.getBoundingClientRect().width || 1;
      setS(Math.min(1, w / tw));
    };
    fit();
    document.fonts?.ready?.then(fit).catch(() => {});
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);
  return (
    <div className="giant" aria-hidden="true">
      <div className="g-box" ref={box}>
        <div className="g-scale" style={{ transform: `scale(${s})`, fontSize: F }}>
          <Odometer value={stop.n} format={NOGROUP} fontSize={F} duration={1.05} bounce={0.16} stagger={0.07} fade={0.12} />
          <span className={'g-plus p-draw' + (stop.plus ? ' is-on' : '')} />
        </div>
        <span className="g-meas" ref={meas}>{stop.n}{stop.plus && <span className="g-plus-m" />}</span>
      </div>
      <p className="g-label">{stop.label}</p>
    </div>
  );
}

export default function Count() {
  useVersion('count');
  const phone = usePhone();
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const [stop, setStop] = useState<Stop>({ n: TITLES.to, plus: false, label: TITLES.label });
  const [on, setOn] = useState<string>('');

  const commits = gh.commitsThisMonth && gh.commitsThisMonth > 0 ? gh.commitsThisMonth : 0;
  const ghN = commits || gh.repos.length;
  const ghLabel = commits ? 'Commits this month, live' : 'Repositories on GitHub';
  const latest = notes[0];
  const day = latest ? Number(latest.date.slice(8, 10)) : undefined;
  const month = latest ? formatDate(latest.date, { month: 'long', year: 'numeric' }) : '';

  const tally: { id: string; n: number; plus?: boolean; label: string }[] = [
    { id: 'debate', n: TITLES.to, label: TITLES.label },
    { id: 'team', n: 1, label: FIRST },
    { id: 'about', n: MENTORED.to, plus: true, label: MENTORED.label },
    { id: 'research', n: PAGES, label: 'Pages in his paper' },
    { id: 'work', n: WORK.length, label: 'Things he has built' },
    { id: 'github', n: ghN, label: ghLabel },
    ...(day !== undefined ? [{ id: 'today', n: day as number, label: month }] : []),
    { id: 'now', n: NOW.reading.shelves.length, label: 'Shelves he is reading from' },
    { id: 'record', n: HONORS.length, label: 'Honours on his record' },
    { id: 'off', n: LIKES.length, label: 'Things he likes' },
  ];

  // Change value only when a counted block crosses the middle of the screen.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      const mid = innerHeight * 0.5;
      const all = [...el.querySelectorAll<HTMLElement>('[data-n]')];
      if (!all.length) return;
      let c = all[0];
      for (const s of all) if (s.getBoundingClientRect().top <= mid) c = s;
      const next: Stop = { n: Number(c.dataset.n), plus: c.dataset.plus === '1', label: c.dataset.label ?? '' };
      setStop((p) => (p.n === next.n && p.plus === next.plus && p.label === next.label ? p : next));
      setOn(c.id);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    return () => { removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, [ghN, day, phone]);

  const cls = (id: string, base: string) => base + (on === id ? ' is-on' : '');

  return (
    <div className="v-count" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="mast">
        <h1 className="mast-name">{PERSON.name}</h1>
        <p className="mast-line">{PERSON.line}</p>
        <nav className="mast-nav" aria-label="Sections">
          <ul>
            {NAV.map(([id, label]) => <li key={id}><a href={'#' + id}>{label}</a></li>)}
          </ul>
        </nav>
      </header>

      <div className="frame">
        {!phone && <Giant stop={stop} />}

        <div className="col">
        <main id="main">
          {/* 2: the two titles */}
          <section id="debate" className="stop s-debate" data-n={TITLES.to} data-label={TITLES.label} aria-labelledby="h-debate">
            <div id="h-debate"><Head n={TITLES.to} label={TITLES.label} phone={phone} /></div>
            <p className="display">{TWO.title}</p>
            <ol className="wins">
              {DEBATE.wins.map((w) => (
                <li key={w.where} className="win">
                  <span className="w-title">{w.title}</span>
                  <span className="w-event">{w.event}</span>
                  <span className="w-where">{w.where}, {w.when}</span>
                </li>
              ))}
            </ol>
            <div className="next">
              <h3 className="next-h">Up next</h3>
              <ul>
                {DEBATE.next.map((x) => <li key={x.where}><span>{x.event}</span> at {x.where}</li>)}
              </ul>
            </div>
          </section>

          {/* 1: Skeptical's first tournament */}
          <section id="team" className="stop s-team" data-n={1} data-label={FIRST} aria-labelledby="h-team">
            <div id="h-team"><Head n={1} label={FIRST} phone={phone} /></div>
            <p className="team-name">{DEBATE.team.name}</p>
            <p className="role">{DEBATE.team.role}</p>
            <p className="body">{DEBATE.team.line}</p>
            <p className="record">{DEBATE.team.record}</p>
            <Ext className="go" href={DEBATE.team.href}>skeptical.pages.dev</Ext>
          </section>

          {/* 60+: mentored, about, MITEZ */}
          <section id="about" className="stop s-about" data-n={MENTORED.to} data-plus="1" data-label={MENTORED.label} aria-labelledby="h-about">
            <div id="h-about"><Head n={MENTORED.to} plus label={MENTORED.label} phone={phone} /></div>
            <div className="about">
              {PERSON.about.map((p) => <p key={p.slice(0, 20)} className="body">{p}</p>)}
              <p className="aside">{PERSON.aside}</p>
            </div>
            <div className="mitez">
              <h3 className="sub-h">{MITEZ.title}</h3>
              <p className="body">{MITEZ.body}</p>
              <Ext className="go" href="https://mitez.org">mitez.org</Ext>
            </div>
          </section>

          {/* 15: the paper, then its ladder of dates */}
          <section id="research" className="stop s-research" data-n={PAGES} data-label="Pages in his paper" aria-labelledby="h-research">
            <div id="h-research"><Head n={PAGES} label="Pages in his paper" phone={phone} /></div>
            <p className="display">{PAPER.short}</p>
            <blockquote className="epi">
              <p>{EPI.text}</p>
              <cite>{EPI.source}</cite>
            </blockquote>
            <p className="body lead-in">The paper follows one ladder through three writers.</p>

            <ol className="ladder">
              {LADDERS.map((l) => (
                <li key={l.who} id={'rung-' + yearOf(l.when)} className={cls('rung-' + yearOf(l.when), 'rung')} data-n={yearOf(l.when)} data-label={l.when}>
                  <Head as="h3" n={phone ? yearOf(l.when) : undefined} label={l.who} phone={phone} />
                  <p className="r-when">{l.when}</p>
                  <p className="r-where">{l.where}</p>
                </li>
              ))}
            </ol>

            <article id="paper" className={cls('paper', 'paper')} data-n={PAPER_YEAR} data-label={PAPER.status}>
              <Head as="h3" n={phone ? PAPER_YEAR : undefined} label={PAPER.status} phone={phone} />
              <h4 className="p-title">{PAPER.title}</h4>
              <p className="body">{PAPER.abstract}</p>
              <ul className="kw" aria-label="Keywords">
                {KEYWORDS.map((k) => <li key={k}>{k}</li>)}
              </ul>
              <ul className="p-links">
                {PAPER.links.map((l) => <li key={l.label}><Ext href={l.href}>{l.label}</Ext></li>)}
              </ul>
              <p className="doi">DOI {PAPER.doi}</p>
              <div className="wesso">
                <h4 className="sub-h">{WESSO.title}</h4>
                <p className="w-status">{WESSO.status}</p>
                <p className="body">{WESSO.abstract}</p>
              </div>
            </article>
          </section>

          {/* 8: the things he has built */}
          <section id="work" className="stop s-work" data-n={WORK.length} data-label="Things he has built" aria-labelledby="h-work">
            <div id="h-work"><Head n={WORK.length} label="Things he has built" phone={phone} /></div>
            <ul className="spread">
              {WORK.map((w) => (
                <li key={w.slug} className="piece">
                  {w.href ? (
                    <Ext className="p-img" href={w.href}><img src={BASE + w.img} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={750} /></Ext>
                  ) : (
                    <span className="p-img"><img src={BASE + w.img} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={750} /></span>
                  )}
                  <h3 className="p-name">{w.name}</h3>
                  <p className="p-kind">{w.kind}</p>
                  <p className="p-line">{w.line}</p>
                  <p className="p-stack">{w.stack}</p>
                  {w.href ? <Ext className="go" href={w.href}>{w.href.replace(/^https:\/\//, '').replace(/\/$/, '')}</Ext> : <p className="p-none">No public link</p>}
                </li>
              ))}
            </ul>
          </section>

          {/* GitHub: commits this month, or the repos */}
          <section id="github" className="stop s-gh" data-n={ghN} data-label={ghLabel} aria-labelledby="h-gh">
            <div id="h-gh"><Head n={ghN} label={ghLabel} phone={phone} /></div>
            {gh.activity.length > 0 && (
              <ol className="commits">
                {gh.activity.slice(0, 6).map((a) => (
                  <li key={a.href}>
                    <a className="c-msg" href={a.href} rel="noopener">{a.message}</a>
                    <span className="c-meta">{a.repo}, {ago(a.at)}</span>
                  </li>
                ))}
              </ol>
            )}
            <ul className="repos">
              {gh.repos.slice(0, 8).map((r) => (
                <li key={r.name}>
                  <a className="r-name" href={r.href} rel="noopener">{r.name}</a>
                  {r.description && <p className="r-desc">{r.description}</p>}
                  {r.language && <p className="r-lang">{r.language}</p>}
                </li>
              ))}
            </ul>
            <Ext className="go" href={GITHUB.href}>github.com/{GITHUB.user}</Ext>
          </section>

          {/* Today: the day of the month of his latest note */}
          <section id="today" className="stop s-today" {...(day !== undefined ? { 'data-n': day, 'data-label': month } : {})} aria-labelledby="h-today">
            <div id="h-today"><Head n={day} label={<>Today{latest ? <>, {formatDate(latest.date)}</> : null}</>} phone={phone} /></div>
            {!loaded && <p className="note note-wait">The latest note is loading.</p>}
            {loaded && !latest && <p className="note">{NOW.status}</p>}
            {latest && (
              <div className="note">
                {latest.body.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
              </div>
            )}
            {notes.length > 1 && (
              <div className="earlier">
                <button type="button" className="toggle" aria-expanded={open} aria-controls="earlier-list" onClick={() => setOpen((o) => !o)}>
                  <span>{open ? 'Hide earlier notes' : `Earlier notes (${notes.length - 1})`}</span>
                  <span className="t-mark" aria-hidden="true" />
                </button>
                <ol id="earlier-list" className="e-list" hidden={!open}>
                  {notes.slice(1).map((n) => (
                    <li key={n.date}>
                      <time dateTime={n.date}>{formatDate(n.date)}</time>
                      {n.body.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>

          {/* 3: the shelves he is reading from, the club, right now */}
          <section id="now" className="stop s-now" data-n={NOW.reading.shelves.length} data-label="Shelves he is reading from" aria-labelledby="h-now">
            <div id="h-now"><Head n={NOW.reading.shelves.length} label="Shelves he is reading from" phone={phone} /></div>
            <p className="display">{NOW.reading.title}</p>
            <p className="body">{NOW.reading.body}</p>
            <ul className="shelves">
              {NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}
            </ul>
            <h3 className="sub-h">{NOW.club.title}</h3>
            <p className="body">{NOW.club.body}</p>
            <p className="status">{NOW.status}</p>
          </section>

          {/* 10: honours */}
          <section id="record" className="stop s-record" data-n={HONORS.length} data-label="Honours on his record" aria-labelledby="h-record">
            <div id="h-record"><Head n={HONORS.length} label="Honours on his record" phone={phone} /></div>
            <ol className="honours">
              {HONORS.map((h, i) => (
                <li key={h.what}>
                  <span className="h-i" aria-hidden="true">{i + 1}</span>
                  <span className="h-what">{h.what}</span>
                  <span className="h-detail">{h.detail}</span>
                </li>
              ))}
            </ol>
            <ul className="certs">
              {AWARDS.map((a) => (
                <li key={a.site}>
                  <Ext className="cert" href={a.href}>
                    <img src={BASE + a.img} alt={`Certificate: ${a.site}, ${a.note}`} loading="lazy" width={800} height={1130} />
                    <span className="c-site">{a.site}</span>
                    <span className="c-note">{a.note}</span>
                  </Ext>
                </li>
              ))}
            </ul>
          </section>

          {/* 7: off the record */}
          <section id="off" className="stop s-off" data-n={LIKES.length} data-label="Things he likes" aria-labelledby="h-off">
            <div id="h-off"><Head n={LIKES.length} label="Things he likes, off the record" phone={phone} /></div>
            <div className="off">
              <div><h3 className="off-h">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="off-h">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="off-h">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="off-h">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider}, {c.title}.</b> {c.note}</li>)}</ul></div>
            </div>
          </section>

          {/* 14: the ending */}
          <section id="contact" className="stop s-end" data-n={PERSON.age} data-label="Years old" aria-labelledby="h-end">
            <div id="h-end"><Head n={PERSON.age} label="Years old" phone={phone} /></div>
            <p className="end-name">{PERSON.name}</p>
            <p className="end-line">All of the above, at fourteen.</p>
            <ol className="tally" aria-label="The count, from the top">
              {tally.map((t) => (
                <li key={t.id}>
                  <a href={'#' + t.id}><span className="t-n">{t.n}{t.plus && <span className="plus">+</span>}</span><span className="t-l">{t.label}</span></a>
                </li>
              ))}
            </ol>
            <ul className="links">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <span className="l-label">{l.label}</span>
                  {l.href ? <Ext className="l-val" href={l.href}>{l.value}</Ext> : <span className="l-val is-plain">{l.value}</span>}
                </li>
              ))}
            </ul>
          </section>
        </main>
        <footer className="foot">
          <p>Draft 59 of the portfolio. Not the live site.</p>
          <p>The rolling numeral is built on the Counter component from React Bits. Set in Bodoni Moda and Archivo.</p>
        </footer>
        </div>
      </div>
    </div>
  );
}
