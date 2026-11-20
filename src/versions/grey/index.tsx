// Draft 37, The grey. Ten flat grounds step from paper to near-black, one per section, and the full stop
// after his name, a disc of one fixed grey, detaches and rides down beside you. On white it looks dark;
// on black it looks almost white. It never changes. Drag it onto another ground, or press Look again and
// a band of its own grey is drawn behind it, in its lane only, so it vanishes.
import { useEffect, useRef, useState } from 'react';
import '@fontsource-variable/instrument-sans/wdth.css';
import './grey.css';
import { AWARDS, CHAPTERS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { scrollToId } from '@/lib/scroll';
import { clamp, lerp, smooth, still } from '@/lib/utils';

const src = (p: string) => import.meta.env.BASE_URL + p;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[] };
const wess = RESEARCH[1];
// The ten grounds, measured: #111 passes 4.5:1 on 1 to 5, paper passes on 6 to 10.
const GROUNDS = ['#f6f5f1', '#e4e3de', '#d1d0cb', '#bdbcb7', '#a3a29e', '#656461', '#4d4c4a', '#383735', '#242322', '#111111'];
// Each screenshot sits on a mat of a different step, so the same kind of image reads differently.
const MATS = [0, 6, 3, 9, 1, 7, 4, 8];

function Out({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const ext = /^https?:/.test(href);
  return <a className={'lk' + (className ? ' ' + className : '')} href={href} {...(ext ? { target: '_blank', rel: 'noreferrer' } : {})}>{children}</a>;
}

const Seat = () => <div className="seat" aria-hidden="true" />;

/* ---------- the disc: one element, sprung through the page ---------- */

function useDisc(look: React.MutableRefObject<() => void>) {
  const root = useRef<HTMLDivElement>(null);
  const disc = useRef<HTMLButtonElement>(null);
  const band = useRef<HTMLDivElement>(null);
  const lane = useRef<HTMLDivElement>(null);
  const home = useRef<HTMLSpanElement>(null);
  const end = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const R = root.current!, Dk = disc.current!, B = band.current!, L = lane.current!, H = home.current!, E = end.current!;
    const steps = Array.from(R.querySelectorAll<HTMLElement>('[data-step]'));
    const heads = Array.from(R.querySelectorAll<HTMLElement>('.h2'));
    let x = NaN, y = NaN, vx = 0, vy = 0, off = 0, voff = 0, raf = 0;
    const drag = { on: false, id: -1, y0: 0, off0: 0, moved: false, suppress: false };
    let mode: 'home' | 'lane' | 'seat' = 'home';

    const rootTop = () => R.getBoundingClientRect().top + scrollY;
    const mid = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 + scrollY }; };
    const top = (el: Element) => el.getBoundingClientRect().top + scrollY;
    const phone = () => innerWidth <= 820;

    const current = (docY: number) => {
      let i = 0;
      steps.forEach((s, k) => { if (top(s) <= docY) i = k; });
      return i;
    };

    const target = () => {
      const vh = innerHeight, sy = scrollY, max = document.documentElement.scrollHeight - vh;
      const h = mid(H), e = mid(E);
      const te = smooth(clamp((sy - (max - vh * 0.6)) / (vh * 0.5)));
      let tx: number, ty: number;
      if (!phone()) {
        const t1 = smooth(clamp(sy / (vh * 0.5)));
        // It settles beside each heading as the heading passes the middle, then lets go.
        const line = sy + vh * 0.5;
        let near = Infinity;
        for (const el of heads) { const d = mid(el).y - line; if (Math.abs(d) < Math.abs(near)) near = d; }
        const a = Math.abs(near) / vh;
        const pull = a < 0.16 ? 1 : a > 0.34 ? 0 : 1 - smooth((a - 0.16) / 0.18);
        tx = lerp(h.x, L.offsetWidth / 2, t1);
        ty = lerp(h.y, line + (Number.isFinite(near) ? near * pull : 0), t1);
        mode = te > 0.5 || t1 < 0.5 ? 'home' : 'lane';
      } else {
        const s = steps[current(sy + vh * 0.55)];
        const seat = s.querySelector('.seat');
        if (seat) { const m = mid(seat); tx = 16 + Dk.offsetWidth / 2; ty = m.y; mode = 'seat'; }
        else { tx = h.x; ty = h.y; mode = 'home'; }
        if (te > 0.5) mode = 'home';
      }
      return { tx: lerp(tx, e.x, te), ty: lerp(ty, e.y, te) };
    };

    const frame = () => {
      const { tx, ty } = target();
      if (Number.isNaN(x) || still) { x = tx; y = ty; vx = vy = 0; }
      else {
        vx = (vx + (tx - x) * 0.13) * 0.72; vy = (vy + (ty - y) * 0.13) * 0.72;
        vx = clamp(vx, -180, 180); vy = clamp(vy, -180, 180);
        x += vx; y += vy;
      }
      if (!drag.on) {
        if (still) off = 0;
        else { voff = (voff + (0 - off) * 0.14) * 0.74; off += voff; if (Math.abs(off) < 0.05 && Math.abs(voff) < 0.05) off = voff = 0; }
      }
      const D = Dk.offsetWidth, rt = rootTop();
      Dk.style.transform = `translate3d(${(x - D / 2).toFixed(1)}px, ${(y + off - D / 2 - rt).toFixed(1)}px, 0)`;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    // Look again: a band of the disc's own grey behind it, in its lane only, for about two seconds.
    look.current = () => {
      const D = Dk.offsetWidth, rt = rootTop(), dy = y + off;
      let r: { l: number; t: number; w: number; h: number; ox: string; oy: string; axis: 'X' | 'Y' };
      if (mode === 'lane') {
        const s = steps[current(dy)];
        const st = top(s), sh = s.offsetHeight;
        r = { l: 0, t: st - rt, w: L.offsetWidth, h: sh, ox: '50%', oy: `${dy - st}px`, axis: 'Y' };
      } else if (mode === 'seat') {
        const seat = steps[current(dy)].querySelector('.seat') ?? steps[current(scrollY + innerHeight * 0.55)].querySelector('.seat')!;
        const sr = seat.getBoundingClientRect();
        r = { l: 0, t: sr.top + scrollY - rt, w: R.offsetWidth, h: sr.height, ox: `${x}px`, oy: '50%', axis: 'X' };
      } else {
        const l = x - D / 2 - 6;
        r = { l, t: dy - D / 2 - 12 - rt, w: R.offsetWidth - l, h: D + 24, ox: '0px', oy: '50%', axis: 'X' };
      }
      Object.assign(B.style, { left: r.l + 'px', top: r.t + 'px', width: r.w + 'px', height: r.h + 'px', transformOrigin: `${r.ox} ${r.oy}` });
      B.getAnimations().forEach((a) => a.cancel());
      const s0 = `scale${r.axis}(0)`, s1 = `scale${r.axis}(1)`;
      B.animate(
        still
          ? [{ opacity: 1 }, { opacity: 1, offset: 0.9 }, { opacity: 0 }]
          : [
            { transform: s0, opacity: 1, easing: 'cubic-bezier(.16,1,.3,1)' },
            { transform: s1, opacity: 1, offset: 0.2 },
            { transform: s1, opacity: 1, offset: 0.86, easing: 'ease-in' },
            { transform: s1, opacity: 0 },
          ],
        { duration: 2300 },
      );
    };

    const down = (e: PointerEvent) => {
      drag.on = true; drag.id = e.pointerId; drag.y0 = e.clientY; drag.off0 = off; drag.moved = false;
      Dk.setPointerCapture(e.pointerId); Dk.classList.add('held');
    };
    const move = (e: PointerEvent) => {
      if (!drag.on || e.pointerId !== drag.id) return;
      const d = e.clientY - drag.y0;
      if (Math.abs(d) > 5) drag.moved = true;
      const vh = innerHeight, base = y - scrollY;
      off = clamp(drag.off0 + d, 24 - base, vh - 24 - base);
    };
    const up = (e: PointerEvent) => {
      if (!drag.on || e.pointerId !== drag.id) return;
      drag.on = false; drag.suppress = drag.moved; Dk.classList.remove('held');
      try { Dk.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    };
    const click = (e: MouseEvent) => { if (drag.suppress) { drag.suppress = false; e.preventDefault(); return; } look.current(); };
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const i = current(y + 2);
      const j = clamp(i + (e.key === 'ArrowDown' ? 1 : -1), 0, steps.length - 1);
      if (j !== i) { scrollToId(steps[j].id); Dk.focus({ preventScroll: true }); }
    };
    Dk.addEventListener('pointerdown', down);
    Dk.addEventListener('pointermove', move);
    Dk.addEventListener('pointerup', up);
    Dk.addEventListener('pointercancel', up);
    Dk.addEventListener('click', click);
    Dk.addEventListener('keydown', key);
    return () => {
      cancelAnimationFrame(raf);
      Dk.removeEventListener('pointerdown', down);
      Dk.removeEventListener('pointermove', move);
      Dk.removeEventListener('pointerup', up);
      Dk.removeEventListener('pointercancel', up);
      Dk.removeEventListener('click', click);
      Dk.removeEventListener('keydown', key);
    };
  }, [look]);

  return { root, disc, band, lane, home, end };
}

/* ---------- sections ---------- */

function Opening({ home, onLook }: { home: React.RefObject<HTMLSpanElement | null>; onLook: () => void }) {
  return (
    <header className="open">
      <nav className="nav" aria-label="Sections">
        <ul>
          {[['today', 'Today'], ['work', 'Work'], ['research', 'Research'], ['now', 'Now'], ['github', 'GitHub'], ['record', 'Record'], ['debate', 'Debate'], ['contact', 'Contact']].map(([id, label]) => (
            <li key={id}><a className="lk" href={'#' + id} onClick={(e) => { e.preventDefault(); scrollToId(id); }}>{label}</a></li>
          ))}
        </ul>
      </nav>
      <h1 className="name">
        {PERSON.first} <br />{PERSON.last}<span className="home" ref={home} aria-hidden="true" />
      </h1>
      <div className="open-foot">
        <p className="open-line">{PERSON.line}</p>
        <div className="open-side">
          <p className="open-say">The dot never changes.</p>
          <button type="button" className="again" onClick={onLook}>Look again</button>
          <a className="lk open-wins" href="#debate" onClick={(e) => { e.preventDefault(); scrollToId('debate'); }}>{CHAPTERS[1].title}</a>
        </div>
      </div>
    </header>
  );
}

function About() {
  return (
    <section className="about" id="about" aria-labelledby="h-about">
      <h2 id="h-about" className="h2">About</h2>
      <div className="about-cols">
        {PERSON.about.map((p) => <p key={p.slice(0, 16)}>{p}</p>)}
      </div>
      <p className="about-aside">{PERSON.aside}</p>
    </section>
  );
}

function Today() {
  const { notes, loaded } = useNotes();
  const [open, setOpen] = useState<string | null>(null);
  const [first, ...rest] = notes;
  return (
    <section className="st s2 today" id="today" data-step aria-labelledby="h-today">
      <Seat />
      <div className="today-in">
        <div className="today-main">
          <h2 id="h-today" className="h2">Today</h2>
          {first ? (
            <article className="note">
              <p className="note-date"><time dateTime={first.date}>{formatDate(first.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></p>
              {first.body.map((p, i) => <p key={i} className="note-body">{p}</p>)}
            </article>
          ) : (
            <article className="note">
              <p className="note-date">{loaded ? 'No note posted yet' : 'Fetching the latest note'}</p>
              <p className="note-body">{NOW.status}</p>
            </article>
          )}
        </div>
        <div className="today-list">
          <h3 className="h3s">Earlier</h3>
          {rest.length ? (
            <ul>
              {rest.map((n) => {
                const on = open === n.date;
                return (
                  <li key={n.date} className={on ? 'on' : ''}>
                    <button type="button" className="note-row" aria-expanded={on} onClick={() => setOpen(on ? null : n.date)}>
                      <span className="mark" aria-hidden="true" />
                      <span className="note-row-d"><time dateTime={n.date}>{formatDate(n.date)}</time></span>
                      <span className="note-row-p">{on ? 'Close' : n.body[0]}</span>
                    </button>
                    {on && <div className="note-full">{n.body.map((p, i) => <p key={i}>{p}</p>)}</div>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="note-empty">{loaded ? 'Every note will stay here, newest first.' : 'Earlier notes load with today’s.'}</p>
          )}
        </div>
      </div>
    </section>
  );
}

function Work() {
  return (
    <section className="st s3 work" id="work" data-step aria-labelledby="h-work">
      <Seat />
      <h2 id="h-work" className="h2 h2-big">Work</h2>
      <ol className="work-list">
        {WORK.map((w, i) => {
          const g = MATS[i];
          return (
            <li key={w.slug} className={'job job-' + (i % 3)}>
              <figure className="plate" style={{ background: GROUNDS[g] }}>
                <img src={src(w.img)} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={750} />
              </figure>
              <div className="job-text">
                <p className="job-kind">{w.kind}</p>
                <h3 className="job-name">{w.name}</h3>
                <p className="job-line">{w.line}</p>
                <p className="job-stack">{w.stack}</p>
                {w.href && <p className="job-link"><Out href={w.href}>{host(w.href)}</Out></p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Research() {
  return (
    <section className="st s4 research" id="research" data-step aria-labelledby="h-research">
      <Seat />
      <h2 id="h-research" className="h2">Research</h2>
      <article className="paper">
        <h3 className="paper-title">{paper.title}</h3>
        <p className="paper-status">{paper.status}</p>
        <div className="paper-body">
          <p className="paper-abs">{paper.abstract}</p>
          <div className="paper-keys">
            <h4 className="h3s">Keywords</h4>
            <ul>{paper.keywords.map((k) => <li key={k}><span className="mark" aria-hidden="true" />{k}</li>)}</ul>
          </div>
        </div>
        <ul className="paper-links">
          {paper.links.map((l) => <li key={l.label}><Out href={l.href}>{l.label}</Out></li>)}
        </ul>
      </article>
      <article className="wess">
        <h3 className="wess-title">{wess.title}</h3>
        <p className="paper-status">{wess.status}</p>
        <p>{wess.abstract}</p>
      </article>
    </section>
  );
}

function Now() {
  return (
    <section className="st s5 now" id="now" data-step aria-labelledby="h-now">
      <Seat />
      <h2 id="h-now" className="h2">Now</h2>
      <div className="now-grid">
        <div className="now-read">
          <h3 className="now-h">{NOW.reading.title}</h3>
          <p>{NOW.reading.body}</p>
          <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
        <div className="now-club">
          <h3 className="now-h">{NOW.club.title}</h3>
          <p>{NOW.club.body}</p>
        </div>
        <p className="now-status">{NOW.status}</p>
      </div>
    </section>
  );
}

function GitHub() {
  const { repos, activity, commitsThisMonth, live } = useGitHub();
  return (
    <section className="st s6 gh" id="github" data-step aria-labelledby="h-gh">
      <Seat />
      <div className="gh-head">
        <h2 id="h-gh" className="h2">Live from GitHub</h2>
        <p className="gh-sub">
          {live && commitsThisMonth != null ? `${commitsThisMonth} commits this month. ` : ''}
          <Out href={GITHUB.href}>{host(GITHUB.href)}</Out>
        </p>
      </div>
      <div className={'gh-in' + (activity.length ? '' : ' gh-only')}>
        {activity.length > 0 && (
          <div className="gh-commits">
            <h3 className="h3s">Recent commits</h3>
            <ul>
              {activity.slice(0, 8).map((a, i) => (
                <li key={a.href + i}>
                  <a className="commit" href={a.href} target="_blank" rel="noreferrer">
                    <span className="mark" aria-hidden="true" />
                    <span className="commit-m">{a.message}</span>
                    <span className="commit-r">{a.repo}, {ago(a.at)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="gh-repos">
          <h3 className="h3s">Repositories</h3>
          <ul>
            {repos.slice(0, 8).map((r) => (
              <li key={r.name}>
                <a className="repo" href={r.href} target="_blank" rel="noreferrer">
                  <span className="mark" aria-hidden="true" />
                  <span className="repo-n">{r.name}</span>
                  {r.description && <span className="repo-d">{r.description}</span>}
                  {r.language && <span className="repo-l">{r.language}</span>}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Record() {
  return (
    <section className="st s7 record" id="record" data-step aria-labelledby="h-record">
      <Seat />
      <h2 id="h-record" className="h2">Record</h2>
      <div className="record-in">
        <ol className="honors">
          {HONORS.map((h) => (
            <li key={h.what}><span className="hon-w">{h.what}</span><span className="hon-d">{h.detail}</span></li>
          ))}
        </ol>
        <ul className="awards">
          {AWARDS.map((a) => (
            <li key={a.site}>
              <a className="award" href={a.href} target="_blank" rel="noreferrer">
                <img src={src(a.img)} alt={`Certificate, ${a.site}`} loading="lazy" width={600} height={850} />
                <span className="award-s">{a.site}</span>
                <span className="award-n">{a.note}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Off() {
  return (
    <section className="st s8 off" id="off" data-step aria-labelledby="h-off">
      <Seat />
      <h2 id="h-off" className="h2">Off the record</h2>
      <div className="off-grid">
        <div><h3 className="h3s">Likes</h3><ul>{LIKES.map((l) => <li key={l}>{l}</li>)}</ul></div>
        <div><h3 className="h3s">Dislikes</h3><ul>{DISLIKES.map((l) => <li key={l}>{l}</li>)}</ul></div>
        <div><h3 className="h3s">Favourites</h3><ul>{FAVOURITES.map((l) => <li key={l}>{l}</li>)}</ul></div>
        <div><h3 className="h3s">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider}, {c.title}.</strong> {c.note}</li>)}</ul></div>
      </div>
    </section>
  );
}

function Debate() {
  const t = DEBATE.team;
  return (
    <section className="st s9 debate" id="debate" data-step aria-labelledby="h-debate">
      <Seat />
      <h2 id="h-debate" className="h2">Debate</h2>
      <ul className="wins">
        {DEBATE.wins.map((w) => (
          <li key={w.where} className="win">
            <p className="win-t">{w.title}</p>
            <p className="win-e">{w.event}</p>
            <p className="win-w">{w.where}, {w.when}</p>
          </li>
        ))}
      </ul>
      <div className="debate-low">
        <article className="team">
          <h3 className="team-n">{t.name}</h3>
          <p className="team-role">{t.role}</p>
          <p>{t.line}</p>
          <p>{t.record}</p>
          <p><Out href={t.href}>{host(t.href)}</Out></p>
        </article>
        <div className="next">
          <h3 className="h3s">Up next</h3>
          <ul>{DEBATE.next.map((n) => <li key={n.where}><span className="next-w">{n.where}</span><span className="next-e">{n.event}</span></li>)}</ul>
        </div>
      </div>
    </section>
  );
}

function Contact({ end, onLook }: { end: React.RefObject<HTMLSpanElement | null>; onLook: () => void }) {
  return (
    <section className="st s10 contact" id="contact" data-step aria-labelledby="h-contact">
      <Seat />
      <h2 id="h-contact" className="h2">Contact</h2>
      <ul className="links">
        {LINKS.map((l) => (
          <li key={l.label}>
            <span className="link-l">{l.label}</span>
            {l.href ? <Out href={l.href} className="link-v">{l.value}</Out> : <span className="link-v">{l.value}</span>}
          </li>
        ))}
      </ul>
      <div className="close">
        <p className="close-name" aria-hidden="true">{PERSON.first}<br />{PERSON.last}<span className="home" ref={end} /></p>
        <div className="close-side">
          <button type="button" className="again" onClick={onLook}>Look again</button>
        </div>
      </div>
      <footer className="foot">
        <p>Draft 37 of the portfolio. Not the live site.</p>
        <p><a className="lk" href="#top" onClick={(e) => { e.preventDefault(); scrollToId(''); }}>Back to the white</a></p>
      </footer>
    </section>
  );
}

export default function Grey() {
  useVersion('grey');
  const look = useRef<() => void>(() => {});
  const { root, disc, band, lane, home, end } = useDisc(look);
  const onLook = () => look.current();
  return (
    <div className="v-grey" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <div className="lane" ref={lane} aria-hidden="true" />
      <div className="band" ref={band} aria-hidden="true" />
      <button type="button" className="disc" ref={disc} aria-label="The grey dot. Press to look again, drag it, or use the arrow keys to move between steps." />
      <main id="main">
        <div className="st s1" id="top" data-step>
          <Opening home={home} onLook={onLook} />
          <About />
        </div>
        <Today />
        <Work />
        <Research />
        <Now />
        <GitHub />
        <Record />
        <Off />
        <Debate />
        <Contact end={end} onLook={onLook} />
      </main>
    </div>
  );
}
