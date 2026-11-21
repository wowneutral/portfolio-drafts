// Draft 67: the seam. After pmndrs/examples "landing-page" (MIT): its split editorial underlay
// (a dark field of thin condensed type beside a pale field with one jumbo phrase) and one object
// floating over the split, here the Skeptical question mark, run down the whole page.
import { createContext, lazy, Suspense, useContext, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/big-shoulders-display';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import './seam.css';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { gsap } from '@/lib/scroll';
import { clamp, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import GLYPH from './mark.json';
import { mark } from './store';
import { FLOOR, HEIGHT, VIEW_H } from './geom';

const Mark = lazy(() => import('./Mark'));
const BASE = import.meta.env.BASE_URL;
const PAPER = RESEARCH[0];
const PRAYER = RESEARCH[1];
const WEB = new Set([2, 8]);
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/\/$/, '');
const ext = (h: string) => (h.startsWith('http') ? { rel: 'noopener' } : {});
const [BUILD_LEAD, ...BUILD_REST] = PERSON.about[1].split(/(?<=\.)\s/);
const [ROLE_A, ROLE_B] = (() => { const i = DEBATE.team.role.indexOf(' head'); return [DEBATE.team.role.slice(0, i), DEBATE.team.role.slice(i + 1)]; })();

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** The mark as flat type, for no WebGL or reduced motion. */
function Flat() {
  const g = GLYPH.glyphs[0];
  return (
    <svg className="flatq" viewBox="0 -880 500 900" aria-hidden="true" focusable="false">
      <path d={g.d} />
    </svg>
  );
}

const FlatCtx = createContext(false);

/** One row of the page: a dark half, the seam channel, a pale half. */
function Row({ id, className = '', l, r, ch, land, labelledBy }: { id?: string; className?: string; l: React.ReactNode; r: React.ReactNode; ch?: React.ReactNode; land?: boolean; labelledBy?: string }) {
  const flat = useContext(FlatCtx);
  return (
    <section id={id} className={'row ' + className} aria-labelledby={labelledBy}>
      <div className="half l">{l}</div>
      <div className="ch" data-land={land ? '' : undefined}>{ch ?? (flat ? <Flat /> : null)}</div>
      <div className="half r">{r}</div>
    </section>
  );
}

function Print({ w, big }: { w: (typeof WORK)[number]; big?: boolean }) {
  return (
    <figure className={'print' + (big ? ' big' : '')}>
      <div className="plate">
        <img src={BASE + w.img} alt={`${w.name}, a screenshot`} loading={big ? 'eager' : 'lazy'} decoding="async" width={1200} height={750} />
      </div>
      <figcaption>
        <div className="cap-top">
          <h3>{w.name}</h3>
          <p className="kind">{w.kind}</p>
        </div>
        <p className="line">{w.line}</p>
        <p className="stack">{w.stack}</p>
        {w.href ? <a className="go" href={w.href} {...ext(w.href)}>{host(w.href)}</a> : <p className="stack">No public link.</p>}
      </figcaption>
    </figure>
  );
}

export default function Seam() {
  useVersion('seam');
  const [webgl] = useState(hasWebGL);
  const flat = still || !webgl;
  const { notes, loaded } = useNotes();
  const gh = useGitHub();
  const [pick, setPick] = useState(0);
  const dark = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [vw, setVw] = useState(() => document.documentElement.clientWidth);
  const phone = vw <= 820;
  const note = notes[Math.min(pick, Math.max(0, notes.length - 1))];

  useEffect(() => {
    const on = () => setVw(document.documentElement.clientWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // The seam: pointer or focus in a half slides the seam toward the other half; the mark follows it,
  // floats in the channel, and lands on the floors set into the page.
  useEffect(() => {
    if (flat) return;
    let target = 0, s = 0, fy = NaN, vy = 0, slot: Element | null = null, last = performance.now();
    const fine = matchMedia('(pointer: fine)').matches;
    const aim = (x: number, gain = 1) => { const W = window.innerWidth; target = clamp(((W / 2 - x) / (W / 2)) * gain, -1, 1); };
    const onMove = (e: PointerEvent) => { if (e.pointerType === 'mouse' || !fine) aim(e.clientX, 1.25); };
    const onLeave = () => { target = 0; };
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || !el.getBoundingClientRect || el.closest('.knock')) return;
      const r = el.getBoundingClientRect(); aim(r.left + r.width / 2, 1.6);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('focusin', onFocus);
    const tick = () => {
      const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
      const W = document.documentElement.clientWidth, H = window.innerHeight, ph = W <= 820;
      const end = document.getElementById('contact');
      const locked = ph || (!!end && end.getBoundingClientRect().top < H * 0.95);
      s += ((locked ? 0 : target) - s) * (1 - Math.exp(-5 * dt));
      mark.lean = s;
      const sx = s * 0.04 * W;
      if (dark.current) dark.current.style.transform = `scaleX(${(W / 2 + sx) / (W / 2)})`;
      const el = wrap.current; if (!el) return;
      const f = ph ? 1 : clamp(W / 1440, 0.72, 1.2), CW = ph ? 130 : Math.round(300 * f), CH = ph ? 160 : Math.round(420 * f), k = CH / VIEW_H, floorOff = CH / 2 - FLOOR * k;
      let goal: number;
      if (ph) {
        let best: Element | null = null, bd = Infinity, by = 0;
        document.querySelectorAll('.v-seam .ch:not(.none)').forEach((c) => {
          const r = c.getBoundingClientRect(), m = r.top + r.height / 2;
          if (m < H * 0.1 || m > H * 0.9) return;
          const d = Math.abs(m - H * 0.5); if (d < bd) { bd = d; best = c; by = m; }
        });
        mark.land = true;
        mark.show = best ? 1 : 0;
        if (best && best !== slot) { slot = best; fy = by; vy = 0; mark.pop = true; }
        goal = best ? by : fy;
      } else {
        let floor = NaN;
        document.querySelectorAll('.v-seam [data-land]').forEach((c) => {
          const b = c.getBoundingClientRect().bottom;
          if (b > H * 0.22 && b < H * 0.9) floor = b;
        });
        mark.land = !Number.isNaN(floor); mark.show = 1;
        goal = mark.land ? floor : H * 0.5 + (HEIGHT / 2 + 0.19) * k;
      }
      if (Number.isNaN(fy)) fy = goal;
      vy += ((goal - fy) * 210 - vy * 29) * dt; fy += vy * dt;
      const x = ph ? W / 2 - CW / 2 : W / 2 + sx * 0.15 - CW / 2;
      el.style.transform = `translate3d(${x}px,${fy - floorOff}px,0)`;
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('focusin', onFocus);
    };
  }, [flat]);

  const knock = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const from = e.clientX === 0 && e.clientY === 0 ? (Math.random() < 0.5 ? -1 : 1) : (e.clientX < r.left + r.width / 2 ? -1 : 1);
    mark.kick = from;
  };

  const f = phone ? 1 : clamp(vw / 1440, 0.72, 1.2);
  const CW = phone ? 130 : Math.round(300 * f), CH = phone ? 160 : Math.round(420 * f), k = CH / VIEW_H, floorOff = CH / 2 - FLOOR * k;
  const mh = HEIGHT * k, mw = mh * 0.56;
  const q = flat ? <Flat /> : null;

  return (
    <FlatCtx.Provider value={flat}>
    <div className="v-seam" data-flat={flat ? '' : undefined}>
      <a className="skip-x" href="#main">Skip to content</a>
      <div className="field" aria-hidden="true"><div className="dark" ref={dark} /></div>

      {!flat && (
        <div className="mark" ref={wrap} style={{ width: CW, height: CH }}>
          <Suspense fallback={null}><Mark low={phone} /></Suspense>
          <button
            type="button"
            className="knock"
            aria-label="Knock the question mark over"
            onClick={knock}
            style={{ left: CW / 2 - mw / 2 - 8, top: floorOff - mh - (phone ? 6 : 0.28 * k), width: mw + 16, height: mh + (phone ? 6 : 0.28 * k) }}
          />
        </div>
      )}

      <nav className="row top" aria-label="Sections">
        <ul className="half l">
          <li><a href="#debate">Debate</a></li>
          <li><a href="#research">Research</a></li>
          <li><a href="#today">Today</a></li>
          <li><a href="#record">Record</a></li>
        </ul>
        <div className="ch none" />
        <ul className="half r">
          <li><a href="#work">Work</a></li>
          <li><a href="#github">GitHub</a></li>
          <li><a href="#now">Now</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
      </nav>

      <main id="main">
        <h1 className="row name cross">
          <span className="half l"><span className="w">{PERSON.first}</span></span>{' '}
          <span className="ch">{q}</span>
          <span className="half r"><span className="w">{PERSON.last}</span></span>
        </h1>

        <Row
          className="about"
          ch={q}
          l={<>
            <p className="thin">{PERSON.about[0]}</p>
            <span className="sub" />
          </>}
          r={<>
            <p className="jumbo">{BUILD_LEAD}</p>
            <p className="body">{BUILD_REST.join(' ')}</p>
          </>}
        />
        <Row
          className="intro"
                    l={<p className="role">{PERSON.line}</p>}
          r={<>
            <p className="short">{PERSON.short.join(' ')}</p>
            <p className="body small">{PERSON.aside}</p>
          </>}
        />

        {/* The set piece: the mark lands on the line where the two halves meet. */}
        <Row
          id="debate"
          className="debate"
          labelledBy="h-debate"
          l={<>
            <h2 id="h-debate" className="head">Debate</h2>
            <ul className="wins">
              {DEBATE.wins.map((w) => (
                <li key={w.where}>
                  <p className="champ">{w.title}</p>
                  <p className="body">{w.event}, {w.where}, {w.when}</p>
                </li>
              ))}
            </ul>
            <h3 className="sub-h">Up next</h3>
            <ul className="next">
              {DEBATE.next.map((n) => <li key={n.where}><span className="nx-where">{n.where}</span> <span className="nx-ev">{n.event}</span></li>)}
            </ul>
          </>}
          r={<>
            <h2 className="head">{DEBATE.team.name}</h2>
            <Print w={WORK[1]} big />
          </>}
        />
        <div className="row cross role-line">
          <p className="half l"><span className="w">{ROLE_A}</span></p>{' '}
          <div className="ch" data-land="">{q}</div>
          <p className="half r"><span className="w">{ROLE_B}</span></p>
        </div>
        <Row
          className="team"
                    l={<p className="body lead">{DEBATE.team.line}</p>}
          r={<>
            <p className="body">{DEBATE.team.record}</p>
            <a className="go" href={DEBATE.team.href} {...ext(DEBATE.team.href)}>{host(DEBATE.team.href)}</a>
          </>}
        />

        <Row
          id="research"
          className="paper"
          labelledBy="h-research"
          l={<div className="stick">
            <h2 id="h-research" className="head">Research</h2>
            <p className="ptitle">{PAPER.title}</p>
            <p className="meta">{PAPER.status}, {PAPER.pages} pages</p>
            <p className="body">{PAPER.abstract}</p>
            <ul className="keys" aria-label="Keywords">
              {PAPER.keywords!.map((k) => <li key={k}>{k}</li>)}
            </ul>
            <ul className="plinks">
              {PAPER.links.map((x) => <li key={x.label}><a href={x.href} {...ext(x.href)}>{x.label}</a></li>)}
            </ul>
          </div>}
          r={<>
            <h2 id="work" className="head">Work</h2>
            {WORK.slice(0, 4).map((w) => <Print key={w.slug} w={w} />)}
          </>}
        />
        <Row
          className="paper two"
          l={<div className="stick">
            <blockquote className="epi">
              <p>{PAPER.epigraph!.text}</p>
              <footer>{PAPER.epigraph!.source}</footer>
            </blockquote>
            <h3 className="sub-h">Three ladders, climbed and thrown away</h3>
            <ol className="ladders">
              {PAPER.ladders!.map((x) => (
                <li key={x.who}><span className="who">{x.who}</span><span className="meta">{x.when}. {x.where}</span></li>
              ))}
            </ol>
            <h3 className="ptitle sm">{PRAYER.title}</h3>
            <p className="meta">{PRAYER.status}</p>
            <p className="body">{PRAYER.abstract}</p>
          </div>}
          r={<>{WORK.slice(4).map((w) => <Print key={w.slug} w={w} />)}</>}
        />

        <Row
          id="today"
          className="daily"
          labelledBy="h-today"
          l={<>
            <h2 id="h-today" className="head">Today</h2>
            <p className="frame">What he wrote</p>
            {note ? (
              <article className="note" aria-live="polite">
                <p className="date"><time dateTime={note.date}>{formatDate(note.date)}</time></p>
                {note.body.map((p, i) => <p key={i} className="body big">{p}</p>)}
              </article>
            ) : (
              <p className="body big">{loaded ? 'No note posted yet. Check back tomorrow.' : 'Fetching the latest note.'}</p>
            )}
            {notes.length > 1 && (
              <div className="earlier">
                <h3 className="sub-h">Earlier notes</h3>
                <ul>
                  {notes.slice(0, 10).map((n, i) => (
                    <li key={n.date}>
                      <button type="button" aria-pressed={i === pick} onClick={() => setPick(i)}>
                        {formatDate(n.date, { day: 'numeric', month: 'short' })}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>}
          r={<>
            <h2 id="github" className="head">Live from GitHub</h2>
            <p className="frame">What he pushed</p>
            {gh.activity.length > 0 && (
              <ol className="commits">
                {gh.activity.slice(0, 5).map((a, i) => (
                  <li key={i}>
                    <a href={a.href} {...ext(a.href)}>{a.message}</a>
                    <span className="meta">{a.repo}, {ago(a.at)}</span>
                  </li>
                ))}
              </ol>
            )}
            <ul className="repos">
              {gh.repos.slice(0, 6).map((r) => (
                <li key={r.name}>
                  <a href={r.href} {...ext(r.href)}>{r.name}</a>
                  {r.description && <p className="body">{r.description}</p>}
                  <p className="meta">{r.language ?? 'Code'}{r.pushedAt ? `, pushed ${ago(r.pushedAt)}` : ''}</p>
                </li>
              ))}
            </ul>
            <a className="go" href={GITHUB.href} {...ext(GITHUB.href)}>{host(GITHUB.href)}</a>
          </>}
        />

        <Row
          id="record"
          className="record"
          labelledBy="h-record"
          l={<>
            <h2 id="h-record" className="head">Record</h2>
            <p className="frame">Arguing, speaking, writing</p>
            <ul className="ledger">
              {HONORS.map((h, i) => (WEB.has(i) ? null : (
                <li key={h.what}><span className="what">{h.what}</span><span className="meta">{h.detail}</span></li>
              )))}
            </ul>
          </>}
          r={<>
            <h3 className="head">Building</h3>
            <ul className="ledger big">
              {HONORS.map((h, i) => (WEB.has(i) ? (
                <li key={h.what}><span className="what">{h.what}</span><span className="meta">{h.detail}</span></li>
              ) : null))}
            </ul>
            <div className="certs">
              {AWARDS.map((a) => (
                <a key={a.site} className="cert" href={a.href} {...ext(a.href)}>
                  <img src={BASE + a.img} alt={`Certificate for ${a.site}`} loading="lazy" decoding="async" width={720} height={1018} />
                  <span className="what">{a.site}</span>
                  <span className="meta">{a.note}</span>
                </a>
              ))}
            </div>
          </>}
        />

        <Row
          id="now"
          className="now"
          labelledBy="h-now"
          l={<>
            <h2 id="h-now" className="head">Now</h2>
            <p className="status">{NOW.status}</p>
            <h3 className="sub-h">{NOW.reading.title}</h3>
            <p className="body">{NOW.reading.body}</p>
            <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            <h3 className="sub-h">{NOW.club.title}</h3>
            <p className="body">{NOW.club.body}</p>
          </>}
          r={<>
            <h2 className="head">Off the record</h2>
            <div className="off">
              <div><h3 className="sub-h">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="sub-h">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="sub-h">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="sub-h">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider}, {c.title}.</b> {c.note}</li>)}</ul></div>
            </div>
          </>}
        />

        {/* The ending: the halves close on the seam and meet on his whole name. */}
        <section id="contact" className="end" aria-labelledby="h-contact">
          <h2 id="h-contact" className="sr-only-x">Contact</h2>
          <p className="row cross closing">
            <span className="half l"><span className="w">{PERSON.first}</span></span>{' '}
            <span className="ch none" />
            <span className="half r"><span className="w">{PERSON.last}</span></span>
          </p>
          <div className="row links">
            <ul className="half l">
              {LINKS.slice(0, 2).concat(LINKS.slice(6)).map((x) => (
                <li key={x.label}><span className="meta">{x.label}</span>{x.href ? <a href={x.href}>{x.value}</a> : <span className="val">{x.value}</span>}</li>
              ))}
            </ul>
            <div className="ch" data-land="">{q}</div>
            <ul className="half r">
              {LINKS.slice(2, 6).map((x) => (
                <li key={x.label}><span className="meta">{x.label}</span><a href={x.href!} {...ext(x.href!)}>{x.value}</a></li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="row foot">
        <p className="half l">Draft 67 of the portfolio. Not the live site.</p>
        <div className="ch none" />
        <p className="half r">Staging after the pmndrs landing-page example (MIT). Set in Big Shoulders Display and Newsreader.</p>
      </footer>
    </div>
    </FlatCtx.Provider>
  );
}
