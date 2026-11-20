// Draft 28, The crumple. Every part of the page arrives as a crumpled draft on a cool grey floor.
// Pull a ball open and it flattens, creases and all, into that part of his life. Only the two
// championships land flat. The copy never moves; it sits in its own calm field beside the floor.
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/newsreader/opsz.css';
import './crumple.css';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { still } from '@/lib/utils';
import { BLUE, DISPLAY, INK, S, fit, paper, printHeading, setOpen, wrap, type Sheet } from './floor';

const Floor = lazy(() => import('./Floor'));
const src = (p: string) => import.meta.env.BASE_URL + p;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const paperRes = RESEARCH[0];
const wess = RESEARCH[1];

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

// Section order on the floor (and on the page).
const SEC = { hero: 0, today: 1, debate: 2, about: 3, research: 4, work: 5, github: 5 + WORK.length, now: 6 + WORK.length, record: 7 + WORK.length, off: 8 + WORK.length, contact: 9 + WORK.length };
const spot = (k: number) => ({ x: Math.sin(k * 1.9) * 1.15, z: k * 3.8 + (k > 2 ? 2.4 : 0) });
const yaw = (k: number, i = 0) => Math.sin(k * 3.7 + i * 2.3) * 0.32;
const A4 = { w: 2.1, h: 2.97, r: 0.7 };

/** The pristine print: CHAMPION in the one blue, nothing crumpled about it. */
const champion = (w: (typeof DEBATE.wins)[number]) => (g: CanvasRenderingContext2D, W: number, H: number) => {
  paper(g, W, H);
  const m = W * 0.1;
  g.fillStyle = BLUE; g.textBaseline = 'top';
  const s = fit(g, w.title.toUpperCase(), W - m * 2, W * 0.2);
  g.fillText(w.title.toUpperCase(), m, H * 0.14);
  g.fillRect(m, H * 0.14 + s * 1.15, W - m * 2, Math.max(2, W * 0.006));
  g.font = `700 ${Math.round(W * 0.062)}px ${DISPLAY}`;
  let y = wrap(g, w.event, m, H * 0.14 + s * 1.15 + H * 0.05, W - m * 2, W * 0.075);
  g.font = `500 ${Math.round(W * 0.05)}px ${DISPLAY}`;
  y = wrap(g, w.where, m, y + H * 0.02, W - m * 2, W * 0.065);
  g.font = `800 ${Math.round(W * 0.16)}px ${DISPLAY}`;
  g.fillText(w.when, m, H - m - W * 0.16);
  void y;
};

const slip = (title: string, line: string) => (g: CanvasRenderingContext2D, W: number, H: number) => {
  paper(g, W, H);
  const m = W * 0.08;
  g.fillStyle = INK; g.textBaseline = 'top';
  fit(g, title, W - m * 2, W * 0.13);
  g.fillText(title, m, m);
  g.font = `500 ${Math.round(W * 0.06)}px ${DISPLAY}`;
  wrap(g, line, m, m + W * 0.2, W - m * 2, W * 0.08, 3);
};

const noteSheet = (date: string, body: string, ink = INK) => (g: CanvasRenderingContext2D, W: number, H: number) => {
  paper(g, W, H);
  const m = W * 0.1;
  g.fillStyle = ink; g.textBaseline = 'top';
  const s = fit(g, 'TODAY', W - m * 2, W * 0.24);
  g.fillText('TODAY', m, H * 0.1);
  g.font = `600 ${Math.round(W * 0.06)}px ${DISPLAY}`;
  g.fillText(date, m, H * 0.1 + s * 1.05);
  g.fillRect(m, H * 0.1 + s * 1.05 + W * 0.1, W - m * 2, Math.max(1, W * 0.004));
  g.font = `400 ${Math.round(W * 0.046)}px "Newsreader Variable", serif`;
  wrap(g, body, m, H * 0.1 + s * 1.05 + W * 0.15, W - m * 2, W * 0.064, 9);
};

const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

function StillSheet() {
  return (
    <svg className="cr-still" viewBox="0 0 420 560" role="img" aria-label="A sheet of paper, opened out flat with its creases still showing, printed with his name">
      <polygon points="52,48 384,40 392,520 44,528" fill="#121314" opacity="0.1" transform="translate(10 12)" />
      <polygon points="52,48 384,40 392,520 44,528" fill="#f7f7f4" />
      <polygon points="52,48 230,44 180,300 48,262" fill="#000" opacity="0.035" />
      <polygon points="230,44 384,40 388,210 180,300" fill="#fff" opacity="0.5" />
      <polygon points="48,262 180,300 250,528 44,528" fill="#000" opacity="0.05" />
      <polygon points="180,300 388,210 392,520 250,528" fill="#000" opacity="0.02" />
      <g stroke="#121314" strokeOpacity="0.12" fill="none"><path d="M230 44 L180 300 L250 528" /><path d="M48 262 L180 300 L388 210" /><path d="M120 120 L300 380" strokeOpacity="0.06" /></g>
      <text x="84" y="132" fontFamily={DISPLAY} fontWeight="800" fontSize="66" fill="#121314" style={{ fontStretch: '112.5%' }}>ARMAAN</text>
      <text x="84" y="196" fontFamily={DISPLAY} fontWeight="800" fontSize="66" fill="#121314" style={{ fontStretch: '112.5%' }}>SETH</text>
      <rect x="84" y="216" width="270" height="2" fill="#121314" />
    </svg>
  );
}

export default function Crumple() {
  useVersion('crumple');
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const [gl] = useState(() => !still && hasWebGL() && !/flat/.test(location.search));
  const [phone] = useState(() => window.innerWidth <= 820);
  const [heroOpen, setHeroOpen] = useState(false);
  const [top, setTop] = useState(true);
  const [lit, setLit] = useState(-1);
  const [sel, setSel] = useState(0);
  const commits = gh.activity;
  const rows = commits.length ? commits.slice(0, 10) : [];
  const slips = rows.length ? rows.map((c) => ({ t: c.repo, l: c.message })) : gh.repos.slice(0, 8).map((r) => ({ t: r.name, l: r.description ?? '' }));
  const earlier = notes.slice(1, 5);

  useEffect(() => { S.heroOpen = setHeroOpen; return () => { S.heroOpen = () => {}; S.lit = () => {}; S.note = () => {}; }; }, []);
  useEffect(() => {
    const on = () => setTop(window.scrollY < window.innerHeight * 0.45);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => { if (import.meta.env.DEV) (window as unknown as { __crumple: typeof S }).__crumple = S; }, []);

  const slipKey = slips.map((s) => s.t + s.l).join('|');
  const noteKey = notes.map((n) => n.date).join('|');
  const sheets = useMemo<Sheet[]>(() => {
    const out: Sheet[] = [];
    let layer = 0;
    const add = (s: Omit<Sheet, 'layer'>) => { out.push({ ...s, layer: (layer++ % 7) * 0.0025 }); };
    const at = (k: number) => spot(k);
    let p = at(SEC.hero);
    add({ id: 'hero', sec: SEC.hero, ...p, yaw: -0.12, ...A4, main: true, print: printHeading([PERSON.first.toUpperCase(), PERSON.last.toUpperCase()], PERSON.line) });

    p = at(SEC.today);
    const latest = notes[0];
    add({ id: 'today', sec: SEC.today, ...p, yaw: 0.07, ...A4, fresh: true, main: true, print: latest ? noteSheet(formatDate(latest.date), latest.body[0] ?? '') : printHeading(['TODAY']), tap: () => S.note(0) });
    earlier.forEach((n, i) => add({
      id: 'note-' + n.date, sec: SEC.today, x: p.x + (i % 2 ? 2.35 : -2.35), z: p.z - 0.9 + Math.floor(i / 2) * 1.7, yaw: yaw(SEC.today, i), w: 1.7, h: 2.4, r: 0.48,
      print: noteSheet(formatDate(n.date), n.body[0] ?? ''), tap: () => S.note(i + 1),
    }));

    p = at(SEC.debate);
    DEBATE.wins.forEach((w, i) => add({ id: 'win-' + i, sec: SEC.debate, x: p.x + (i ? 1.22 : -1.22), z: p.z + (i ? 0.25 : -0.2), yaw: i ? 0.07 : -0.05, ...A4, pristine: true, main: i === 0, print: champion(w) }));
    add({ id: 'skeptical', sec: SEC.debate, x: p.x + 0.3, z: p.z + 3.1, yaw: 0.24, ...A4, auto: true, print: printHeading([DEBATE.team.name.toUpperCase()], DEBATE.team.role) });
    DEBATE.next.forEach((n, i) => add({ id: 'next-' + i, sec: SEC.debate, x: p.x + (i ? 2.6 : -2.3), z: p.z + 2.7 + i * 0.6, yaw: yaw(SEC.debate, i), w: 1.7, h: 2.4, r: 0.5, locked: true, print: printHeading(['UP', 'NEXT'], n.where) }));

    p = at(SEC.about);
    add({ id: 'about', sec: SEC.about, ...p, yaw: yaw(SEC.about), ...A4, auto: true, main: true, print: printHeading(['ABOUT'], PERSON.short.join(' ')) });

    p = at(SEC.research);
    add({ id: 'paper', sec: SEC.research, ...p, yaw: yaw(SEC.research), ...A4, auto: true, main: true, print: printHeading(['NOT IN', 'MAUTHNER’S', 'SENSE'], paperRes.status) });
    add({ id: 'wess', sec: SEC.research, x: p.x + 2.0, z: p.z + 1.5, yaw: 0.3, w: 1.5, h: 2.1, r: 0.45, print: printHeading(['WESSO', 'BRUNN'], wess.status) });

    WORK.forEach((w, i) => {
      const k = SEC.work + i; const q = at(k);
      add({ id: 'work-' + w.slug, sec: k, ...q, yaw: yaw(k), ...A4, auto: true, main: true, img: w.img, print: printHeading([w.name.toUpperCase()], w.kind) });
    });

    p = at(SEC.github);
    slips.forEach((s, i) => add({
      id: 'slip-' + i + '-' + s.t, sec: SEC.github, x: p.x - 1.9 + (i % 4) * 1.3 + Math.sin(i * 5.1) * 0.2, z: p.z - 1.1 + Math.floor(i / 4) * 1.15 + Math.cos(i * 3.3) * 0.18,
      yaw: Math.sin(i * 2.9) * 0.7, w: 1.2, h: 0.8, r: 0.28, main: i === 0, print: slip(s.t, s.l), tap: () => S.lit(i),
    }));

    p = at(SEC.now);
    add({ id: 'now', sec: SEC.now, ...p, yaw: yaw(SEC.now), ...A4, auto: true, main: true, print: printHeading(['NOW'], NOW.reading.title) });

    p = at(SEC.record);
    AWARDS.forEach((a, i) => add({ id: 'award-' + i, sec: SEC.record, x: p.x + (i ? 1.2 : -1.2), z: p.z + i * 0.5, yaw: i ? 0.12 : -0.1, ...A4, auto: true, main: i === 0, img: a.img, print: printHeading([a.site.toUpperCase()], a.note) }));

    p = at(SEC.off);
    add({ id: 'off', sec: SEC.off, ...p, yaw: yaw(SEC.off), ...A4, auto: true, main: true, print: printHeading(['OFF THE', 'RECORD']) });

    p = at(SEC.contact);
    add({ id: 'contact', sec: SEC.contact, ...p, yaw: yaw(SEC.contact), ...A4, auto: true, main: true, print: printHeading(['WRITE', 'TO ME'], LINKS[0].value) });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slipKey, noteKey]);

  // The page and the floor agree on which earlier note and which slip are open.
  const pickNote = (i: number) => {
    setSel(i);
    earlier.forEach((n, j) => setOpen('note-' + n.date, j + 1 === i));
  };
  const light = (i: number) => {
    setLit(i);
    sheets.filter((s) => s.sec === SEC.github).forEach((s, j) => setOpen(s.id, j === i));
  };

  // a slip or an earlier note opened on the floor closes the others and lights its row
  useEffect(() => {
    S.lit = (i: number) => { setLit(i); sheets.filter((s) => s.sec === SEC.github).forEach((s, j) => { if (j !== i) setOpen(s.id, false); }); };
    S.note = (i: number) => { setSel(i); earlier.forEach((n, j) => { if (j + 1 !== i) setOpen('note-' + n.date, false); }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheets]);

  const shown = notes[sel] ?? notes[0];
  const workSec = (i: number) => SEC.work + i;

  return (
    <div className={`v-crumple${gl ? '' : ' is-still'}`}>
      <a className="skip-x" href="#main">Skip to content</a>
      <div className="cr-wrap">
        <div className="cr-band">
          {gl ? (
            <>
              <Suspense fallback={<div className="cr-wait" />}><Floor sheets={sheets} phone={phone} /></Suspense>
              <button type="button" className="cr-key" aria-label="Open or crumple the sheet for this part of the page" onClick={() => S.toggle?.()} />
              <p className={`cr-pull${top ? '' : ' is-off'}`} aria-hidden="true">{heroOpen ? 'Press it twice to crumple it.' : 'Pull it open.'}</p>
            </>
          ) : <StillSheet />}
        </div>

        <main id="main" className="cr-copy">
          <section className="cr-sec cr-hero" data-sec>
            <h1 className="cr-name"><span>{PERSON.first}</span> <span>{PERSON.last}</span></h1>
            <p className="cr-line">{PERSON.line}</p>
            <p className="cr-short">{PERSON.short.map((w) => <span key={w}>{w}</span>)}</p>
          </section>

          <section className="cr-sec cr-today" data-sec id="today" aria-labelledby="h-today">
            <h2 id="h-today" className="cr-h">Today</h2>
            {!loaded ? (
              <p className="cr-quiet">Smoothing out today’s note.</p>
            ) : shown ? (
              <>
                <article className="cr-note" aria-live="polite">
                  <p className="cr-date"><time dateTime={shown.date}>{formatDate(shown.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time>{shown.date === localToday() && <span className="cr-fresh">Written today</span>}</p>
                  {shown.body.map((t, i) => <p key={i} className="cr-note-body">{t}</p>)}
                </article>
                {notes.length > 1 && (
                  <div className="cr-earlier">
                    <h3 className="cr-k">Earlier notes</h3>
                    <ul>
                      {notes.slice(0, 5).map((n, i) => (
                        <li key={n.date}>
                          <button type="button" className={i === sel ? 'is-on' : ''} aria-pressed={i === sel} onClick={() => pickNote(i)}>
                            {i === 0 ? 'Latest, ' : ''}{formatDate(n.date)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="cr-quiet">The first note is still a draft. Check back tomorrow.</p>
            )}
          </section>

          <section className="cr-sec cr-debate" data-sec id="debate" aria-labelledby="h-debate">
            <h2 id="h-debate" className="cr-h">Debate</h2>
            <div className="cr-wins">
              {DEBATE.wins.map((w) => (
                <div className="cr-win" key={w.where}>
                  <p className="cr-win-t">{w.title}</p>
                  <p className="cr-win-e">{w.event}</p>
                  <p className="cr-win-w">{w.where}, {w.when}</p>
                </div>
              ))}
            </div>
            <div className="cr-team">
              <h3 className="cr-h3">{DEBATE.team.name}</h3>
              <p className="cr-role">{DEBATE.team.role}</p>
              <p>{DEBATE.team.line}</p>
              <p className="cr-dim">{DEBATE.team.record}</p>
              <a className="cr-link" href={DEBATE.team.href}>{host(DEBATE.team.href)}</a>
            </div>
            <div className="cr-next">
              <h3 className="cr-k">Up next, still crumpled</h3>
              <ul>{DEBATE.next.map((n) => <li key={n.where}><span className="cr-next-w">{n.where}</span><span className="cr-dim">{n.event}</span></li>)}</ul>
            </div>
          </section>

          <section className="cr-sec cr-about" data-sec id="about" aria-labelledby="h-about">
            <h2 id="h-about" className="cr-h">About</h2>
            {PERSON.about.map((t, i) => <p key={i} className={i === 0 ? 'cr-lead' : ''}>{t}</p>)}
            <p className="cr-dim">{PERSON.aside}</p>
          </section>

          <section className="cr-sec cr-research" data-sec id="research" aria-labelledby="h-research">
            <h2 id="h-research" className="cr-h">Research</h2>
            <h3 className="cr-title">{paperRes.title}</h3>
            <p className="cr-dim">{paperRes.status}, {paperRes.pages} pages</p>
            <p>{paperRes.abstract}</p>
            <ul className="cr-keys" aria-label="Keywords">{(paperRes.keywords ?? []).map((k) => <li key={k}>{k}</li>)}</ul>
            <ul className="cr-links">{paperRes.links.map((l) => <li key={l.label}><a className="cr-link" href={l.href}>{l.label}</a></li>)}</ul>
            <div className="cr-wess">
              <h3 className="cr-h3">{wess.title}</h3>
              <p className="cr-dim">{wess.status}</p>
              <p>{wess.abstract}</p>
            </div>
          </section>

          {WORK.map((w, i) => (
            <section key={w.slug} className="cr-sec cr-work" data-sec id={i === 0 ? 'work' : undefined} aria-labelledby={'h-w-' + w.slug} data-n={workSec(i)}>
              {i === 0 && <h2 className="cr-h">Work</h2>}
              <figure className="cr-shot">
                <img src={src(w.img)} alt={`${w.name}, a screenshot`} width={1200} height={750} loading={i < 2 ? 'eager' : 'lazy'} />
              </figure>
              <h3 id={'h-w-' + w.slug} className="cr-h3">{w.name}</h3>
              <p className="cr-role">{w.kind}</p>
              <p>{w.line}</p>
              <p className="cr-dim">{w.stack}</p>
              {w.href ? <a className="cr-link" href={w.href}>{host(w.href)}</a> : <p className="cr-dim">No public link.</p>}
            </section>
          ))}

          <section className="cr-sec cr-gh" data-sec id="github" aria-labelledby="h-gh">
            <h2 id="h-gh" className="cr-h">Live from GitHub</h2>
            {rows.length > 0 && (
              <>
                <h3 className="cr-k">Latest commits</h3>
                <ol className="cr-commits">
                  {rows.map((c, i) => (
                    <li key={c.href + i} className={lit === i ? 'is-lit' : ''}>
                      <a href={c.href} onMouseEnter={() => light(i)} onFocus={() => light(i)}>
                        <span className="cr-msg">{c.message}</span>
                        <span className="cr-meta">{c.repo}, {ago(c.at)}</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </>
            )}
            <h3 className="cr-k">{gh.live ? 'Repositories, most recently pushed' : 'Repositories'}</h3>
            <ul className="cr-repos">
              {gh.repos.slice(0, 8).map((r, i) => (
                <li key={r.name} className={!rows.length && lit === i ? 'is-lit' : ''}>
                  <a href={r.href} onMouseEnter={() => { if (!rows.length) light(i); }} onFocus={() => { if (!rows.length) light(i); }}>
                    <span className="cr-repo">{r.name}</span>
                    {r.description && <span className="cr-meta">{r.description}</span>}
                    <span className="cr-lang">{[r.language, r.pushedAt ? 'pushed ' + ago(r.pushedAt) : ''].filter(Boolean).join(', ')}</span>
                  </a>
                </li>
              ))}
            </ul>
            <a className="cr-link" href={GITHUB.href}>{host(GITHUB.href)}</a>
          </section>

          <section className="cr-sec cr-now" data-sec id="now" aria-labelledby="h-now">
            <h2 id="h-now" className="cr-h">Now</h2>
            <p className="cr-status">{NOW.status}</p>
            <h3 className="cr-h3">{NOW.reading.title}</h3>
            <p>{NOW.reading.body}</p>
            <ul className="cr-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            <h3 className="cr-h3">{NOW.club.title}</h3>
            <p>{NOW.club.body}</p>
          </section>

          <section className="cr-sec cr-record" data-sec id="record" aria-labelledby="h-record">
            <h2 id="h-record" className="cr-h">Record</h2>
            <ul className="cr-honors">{HONORS.map((h) => <li key={h.what}><span>{h.what}</span><span className="cr-dim">{h.detail}</span></li>)}</ul>
            <div className="cr-awards">
              {AWARDS.map((a) => (
                <a key={a.site} href={a.href} className="cr-award">
                  <img src={src(a.img)} alt={`Certificate: ${a.site}`} loading="lazy" width={600} height={848} />
                  <span className="cr-award-t">{a.site}</span>
                  <span className="cr-dim">{a.note}</span>
                </a>
              ))}
            </div>
          </section>

          <section className="cr-sec cr-off" data-sec id="off" aria-labelledby="h-off">
            <h2 id="h-off" className="cr-h">Off the record</h2>
            <div className="cr-cols">
              <div><h3 className="cr-k">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="cr-k">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="cr-k">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="cr-k">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}>{c.provider}, {c.title}: {c.note}</li>)}</ul></div>
            </div>
          </section>

          <section className="cr-sec cr-contact" data-sec id="contact" aria-labelledby="h-contact">
            <h2 id="h-contact" className="cr-h">Write to me</h2>
            <ul className="cr-contacts">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <span className="cr-dim">{l.label}</span>
                  {l.href ? <a className="cr-link" href={l.href}>{l.value}</a> : <span>{l.value}</span>}
                </li>
              ))}
            </ul>
            <footer className="cr-foot">
              <p>Draft 28 of the portfolio. Not the live site.</p>
              <p className="cr-dim">Every sheet on the floor is a draft. This one made it.</p>
            </footer>
          </section>
        </main>
      </div>
    </div>
  );
}
