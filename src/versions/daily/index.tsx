// Draft 6, The daily. A tear-off day calendar: the latest note is the first leaf, under one huge date,
// in that weekday's colour. Tear it off for the day before. After the notes, every part of his life is a
// leaf with one huge number from content.ts or the live hooks; the number holds while the copy passes,
// then the bottom of the leaf peels up toward you and the next day's colour is underneath.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import '@fontsource/anton/400.css';
import '@fontsource-variable/schibsted-grotesk/wght.css';
import './daily.css';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, STATS, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes } from '@/lib/notes';
import { gsap, ScrollTrigger, useGSAP, scrollToY } from '@/lib/scroll';
import { still } from '@/lib/utils';
import { Tear } from './Tear';
import { colorAfter, colorOf, todayISO } from './days';

const src = (p: string) => import.meta.env.BASE_URL + p;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; epigraph: { text: string; source: string } };
const wess = RESEARCH[1];
const DESK = '(min-width: 900px)';

export default function DailyPage() {
  useVersion('daily');
  const root = useRef<HTMLDivElement>(null);
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const base = notes[0]?.date ?? todayISO();
  const c = (k: number) => colorAfter(base, k);

  // The page, the browser chrome and the overscroll all take the day's colour.
  useEffect(() => {
    const col = colorOf(todayISO());
    document.documentElement.style.background = col;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', col);
  }, []);

  // Each leaf's bottom flap peels up toward the reader as the boundary passes.
  useGSAP(() => {
    if (still) return;
    gsap.utils.toArray<HTMLElement>('.dl-flap').forEach((f) => {
      const shade = f.querySelector('.dl-shade');
      const tl = gsap.timeline({ scrollTrigger: { trigger: f, start: 'top 95%', end: 'top 22%', scrub: 0.7 } });
      tl.fromTo(f, { rotationX: 0 }, { rotationX: 128, transformPerspective: 1300, transformOrigin: '50% 0%', ease: 'power1.inOut', duration: 1 }, 0)
        .fromTo(shade, { opacity: 0 }, { opacity: 0.4, ease: 'power1.in', duration: 0.5 }, 0);
    });
    const t = setTimeout(() => ScrollTrigger.refresh(), 600);
    return () => clearTimeout(t);
  }, { scope: root, dependencies: [loaded] });

  const ghNum = gh.live && gh.commitsThisMonth !== null ? gh.commitsThisMonth : gh.repos.length;
  const ghLabel = gh.live && gh.commitsThisMonth !== null ? 'commits this month' : 'repositories, listed here';
  const commits = gh.activity.slice(0, 6);

  return (
    <div className="v-daily" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <main id="main">
        <Tear notes={notes} loaded={loaded} activity={gh.activity} />

        <Leaf id="about" color={c(1)} num="2023" label="the year I started debating" z={20}>
          <h2 className="dl-h">About</h2>
          <div className="dl-prose">{PERSON.about.map((p) => <p key={p.slice(0, 12)}>{p}</p>)}</div>
          <p className="dl-aside">{PERSON.aside}</p>
        </Leaf>

        <Leaf id="debate" color={c(2)} num="2" label="titles this fall" z={19} tall>
          <h2 className="dl-h">Debate</h2>
          <ol className="dl-wins">
            {DEBATE.wins.map((w) => (
              <li key={w.where}>
                <p className="dl-win-t">{w.title}</p>
                <p className="dl-win-e">{w.event}</p>
                <p className="dl-win-w">{w.where}, {w.when}</p>
              </li>
            ))}
          </ol>
          <div className="dl-next">
            <h3 className="dl-h3">Up next</h3>
            <ul>{DEBATE.next.map((n) => <li key={n.where}><span>{n.event}</span><span>{n.where}</span></li>)}</ul>
          </div>
        </Leaf>

        <Leaf id="skeptical" color={c(3)} num="1" label="first tournament as a team" z={18}>
          <h2 className="dl-h">{DEBATE.team.name}</h2>
          <p className="dl-role">{DEBATE.team.role}</p>
          <p className="dl-lead">{DEBATE.team.line}</p>
          <p className="dl-prose-p">{DEBATE.team.record}</p>
          <p className="dl-links"><a className="dl-a" href={DEBATE.team.href}>{host(DEBATE.team.href)}</a> <a className="dl-a" href={DEBATE.team.github}>The code on GitHub</a></p>
        </Leaf>

        <Leaf id="research" color={c(4)} num={String(paper.pages)} label="pages, open access" z={17} wide>
          <h2 className="dl-h dl-h-paper">{paper.title}</h2>
          <p className="dl-status">{paper.status}. DOI {paper.doi}</p>
          <blockquote className="dl-epi"><p>{paper.epigraph.text}</p><cite>{paper.epigraph.source}</cite></blockquote>
          <p className="dl-prose-p">{paper.abstract}</p>
          <ul className="dl-keys" aria-label="Keywords">{paper.keywords.map((k) => <li key={k}>{k}</li>)}</ul>
          <ul className="dl-paperlinks">{paper.links.map((l) => <li key={l.label}><a className="dl-a" href={l.href}>{l.label}</a></li>)}</ul>
          <div className="dl-wess">
            <h3 className="dl-h3">{wess.title}</h3>
            <p className="dl-sm-p">{wess.status}. {wess.abstract}</p>
          </div>
        </Leaf>

        <Work color={c(5)} />

        <Leaf id="github" color={c(6)} num={String(ghNum)} label={ghLabel} z={15} count>
          <h2 className="dl-h">Live from GitHub</h2>
          {commits.length > 0 && (
            <ol className="dl-commits" aria-label="Recent commits">
              {commits.map((a) => (
                <li key={a.href}><a href={a.href}><span className="dl-cm">{a.message}</span><span className="dl-cr">{a.repo}</span><span className="dl-ca">{ago(a.at)}</span></a></li>
              ))}
            </ol>
          )}
          <ul className="dl-repos" aria-label="Repositories">
            {gh.repos.slice(0, 6).map((r) => (
              <li key={r.name}>
                <a href={r.href}>
                  <span className="dl-rn">{r.name}</span>
                  {r.description && <span className="dl-rd">{r.description}</span>}
                  {r.language && <span className="dl-rl">{r.language}</span>}
                </a>
              </li>
            ))}
          </ul>
          <p className="dl-links"><a className="dl-a" href={GITHUB.href}>{host(GITHUB.href)}</a></p>
        </Leaf>

        <Leaf id="now" color={c(7)} num={String(NOW.reading.shelves.length)} label="shelves right now" z={14}>
          <h2 className="dl-h">Now</h2>
          <p className="dl-lead">{NOW.status}</p>
          <h3 className="dl-h3">{NOW.reading.title}</h3>
          <p className="dl-prose-p">{NOW.reading.body}</p>
          <ul className="dl-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
          <h3 className="dl-h3">{NOW.club.title}</h3>
          <p className="dl-prose-p">{NOW.club.body}</p>
        </Leaf>

        <Leaf id="record" color={c(8)} num={String(HONORS.length)} label="honours" z={13} wide>
          <h2 className="dl-h">Record</h2>
          <ol className="dl-honors">{HONORS.map((h) => <li key={h.what}><span>{h.what}</span><span>{h.detail}</span></li>)}</ol>
          <p className="dl-stats">{STATS.map((s) => <span key={s.label}><b>{s.to}{s.suffix}</b> {s.label.toLowerCase()}</span>)}</p>
          <ul className="dl-awards">
            {AWARDS.map((a) => (
              <li key={a.site}><a href={a.href}><img src={src(a.img)} alt={`WD Awards certificate for ${a.site}`} loading="lazy" width={600} height={848} /><span>{a.site}</span><span className="dl-sm">{a.note}</span></a></li>
            ))}
          </ul>
        </Leaf>

        <Leaf id="off" color={c(9)} num={String(LIKES.length)} label="things I like" z={12} wide>
          <h2 className="dl-h">Off the record</h2>
          <div className="dl-off">
            <List title="Likes" items={LIKES} />
            <List title="Dislikes" items={DISLIKES} />
            <List title="Favourites" items={FAVOURITES} />
            <div><h3 className="dl-h3">Courses</h3><ul className="dl-list">{COURSES.map((x) => <li key={x.title}>{x.provider}, {x.title}. {x.note}</li>)}</ul></div>
          </div>
        </Leaf>

        <Leaf id="contact" color={c(10)} num={String(PERSON.age)} label="years old" z={11} last>
          <h2 className="dl-h">Contact</h2>
          <ul className="dl-contact">
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="dl-cl">{l.label}</span>
                {l.href ? <a className="dl-a dl-cv" href={l.href}>{l.value}</a> : <span className="dl-cv">{l.value}</span>}
              </li>
            ))}
          </ul>
          <div className="dl-end">
            <p className="dl-tomorrow">Tomorrow this page is a different colour.</p>
            <p><a className="dl-a" href="#today">Back to today’s leaf</a></p>
          </div>
          <footer className="dl-footer"><p>Draft 6 of the portfolio. Not the live site.</p></footer>
        </Leaf>
      </main>
    </div>
  );
}

function List({ title, items }: { title: string; items: readonly string[] }) {
  return <div><h3 className="dl-h3">{title}</h3><ul className="dl-list">{items.map((x) => <li key={x}>{x}</li>)}</ul></div>;
}

function Leaf({ id, color, num, label, z, children, wide, tall, last, count }: { id: string; color: string; num: string; label: string; z: number; children: ReactNode; wide?: boolean; tall?: boolean; last?: boolean; count?: boolean }) {
  return (
    <section id={id} className={'dl-leaf' + (wide ? ' is-wide' : '') + (tall ? ' is-tall' : '') + (last ? ' is-last' : '')} style={{ '--c': color, zIndex: z } as CSSProperties} aria-labelledby={id + '-n'}>
      <div className="dl-sheet2">
        <div className="dl-perf" aria-hidden="true" />
        <div className="dl-grid">
          <div className="dl-numcol">
            <div className="dl-numwrap">
              {count ? <CountUp to={num} /> : <p className="dl-num" aria-hidden="true" style={{ '--len': num.length } as CSSProperties}>{num}</p>}
              <p className="dl-numlabel" id={id + '-n'}><span className="sr-only-x">{num} </span>{label}</p>
            </div>
          </div>
          <div className="dl-copy">{children}</div>
        </div>
      </div>
      {!last && <div className="dl-flap" aria-hidden="true"><div className="dl-face"><div className="dl-perf" /><div className="dl-shade" /></div><div className="dl-back" /></div>}
    </section>
  );
}

// The live number rolls up from zero the first time its leaf comes in.
function CountUp({ to }: { to: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useGSAP(() => {
    const el = ref.current;
    const n = +to;
    if (!el || still || !Number.isFinite(n)) return;
    const o = { v: 0 };
    el.textContent = '0';
    const tw = gsap.to(o, { v: n, duration: 1.4, ease: 'power3.out', paused: true, onUpdate: () => { el.textContent = String(Math.round(o.v)); } });
    const st = ScrollTrigger.create({ trigger: el, start: 'top 80%', once: true, onEnter: () => tw.play() });
    return () => { st.kill(); tw.kill(); el.textContent = to; };
  }, { dependencies: [to] });
  return <p className="dl-num" aria-hidden="true" ref={ref} style={{ '--len': to.length } as CSSProperties}>{to}</p>;
}

// Work: one pinned leaf on wide screens; the number counts 01 to 08 as the screenshots change.
function Work({ color }: { color: string }) {
  const run = useRef<HTMLElement>(null);
  const [at, setAt] = useState(0);
  const [desk, setDesk] = useState(() => typeof window !== 'undefined' && !still && window.matchMedia(DESK).matches);
  useEffect(() => {
    const mq = window.matchMedia(DESK);
    const on = () => setDesk(!still && mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  useGSAP(() => {
    if (!desk || !run.current) return;
    const st = ScrollTrigger.create({
      trigger: run.current, start: 'top top', end: 'bottom bottom',
      onUpdate: (s) => setAt(Math.min(WORK.length - 1, Math.floor(s.progress * WORK.length))),
    });
    return () => st.kill();
  }, { dependencies: [desk] });

  const jump = (i: number) => {
    const el = run.current;
    if (!el || !desk) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - window.innerHeight;
    scrollToY(top + span * ((i + 0.5) / WORK.length), true);
    setAt(i);
  };

  const w = WORK[at];
  return (
    <section id="work" ref={run} className={'dl-leaf dl-work' + (desk ? ' is-run' : '')} style={{ '--c': color, zIndex: 16, '--n': WORK.length } as CSSProperties} aria-labelledby="work-h">
      <div className="dl-sheet2">
        <div className="dl-perf" aria-hidden="true" />
        {desk ? (
          <div className="dl-workframe">
            <div className="dl-numcol">
              <div className="dl-numwrap">
                <p className="dl-num" aria-hidden="true" style={{ '--len': 2 } as CSSProperties} key={w.n}>{w.n}</p>
                <p className="dl-numlabel">of {WORK[WORK.length - 1].n}</p>
              </div>
            </div>
            <div className="dl-workcopy">
              <h2 className="dl-h" id="work-h">Work</h2>
              <ol className="dl-works">
                {WORK.map((x, i) => (
                  <li key={x.slug} className={i === at ? 'is-on' : ''} aria-current={i === at ? 'true' : undefined}>
                    <figure className="dl-shot"><img src={src(x.img)} alt={`Screenshot of ${x.name}`} width={1200} height={750} loading={i < 2 ? 'eager' : 'lazy'} /></figure>
                    <div className="dl-wtext">
                      <p className="dl-wk">{x.kind}</p>
                      <h3 className="dl-wn">{x.name}</h3>
                      <p className="dl-wl">{x.line}</p>
                      <p className="dl-ws">{x.stack}</p>
                      {x.href ? <a className="dl-a" href={x.href} onFocus={() => jump(i)}>{host(x.href)}</a> : <p className="dl-ws">No public link.</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : (
          <div className="dl-workphone">
            <div className="dl-numwrap">
              <p className="dl-num" aria-hidden="true" style={{ '--len': 2 } as CSSProperties}>{WORK[WORK.length - 1].n}</p>
              <p className="dl-numlabel">things I built</p>
            </div>
            <h2 className="dl-h" id="work-h">Work</h2>
            <ol className="dl-pworks">
              {WORK.map((x) => (
                <li key={x.slug}>
                  <img src={src(x.img)} alt={`Screenshot of ${x.name}`} width={1200} height={750} loading="lazy" />
                  <p className="dl-wk"><span>{x.n}</span> {x.kind}</p>
                  <h3 className="dl-wn">{x.name}</h3>
                  <p className="dl-wl">{x.line}</p>
                  <p className="dl-ws">{x.stack}</p>
                  {x.href ? <a className="dl-a" href={x.href}>{host(x.href)}</a> : <p className="dl-ws">No public link.</p>}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
      <div className="dl-flap" aria-hidden="true"><div className="dl-face"><div className="dl-perf" /><div className="dl-shade" /></div><div className="dl-back" /></div>
    </section>
  );
}
