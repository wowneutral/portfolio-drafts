// Draft 70, The debt. Threads remixed from pmndrs/examples bezier-curves-and-nodes (MIT), see Graph.tsx.
import { useEffect, useRef, useState } from 'react';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource/schibsted-grotesk/500.css';
import '@fontsource/schibsted-grotesk/600.css';
import { CHAPTERS, PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { gsap, scroll } from '@/lib/scroll';
import { still, isPhone } from '@/lib/utils';
import { Graph, type GNode } from './Graph';
import { Margin } from './Margin';
import './debt.css';

const BASE = import.meta.env.BASE_URL;
const paper = RESEARCH[0];
const wess = RESEARCH[1];
const [aboutA, aboutB] = PERSON.about;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/\/$/, '');

/* The opening: his About as a small knot of words. Each fragment is quoted from PERSON.about. */
const frag = (src: string, f: string) => (src.includes(f) ? f : '');
const HERO: GNode[] = [
  { id: 'me', fx: 0.17, fy: 0.13, px: 0.5, py: 0.08, cls: 'n-me', children: <span className="w">{PERSON.first}</span> },
  { id: 'debate', fx: 0.6, fy: 0.15, px: 0.27, py: 0.32, children: <><span className="w">Debate</span><span className="f">{frag(aboutA, 'it took over')}</span></> },
  { id: 'phil', fx: 0.8, fy: 0.46, px: 0.3, py: 0.56, children: <><span className="w">Philosophy</span><span className="f">{frag(aboutA, 'an argument about ethics with a timer running')}</span></> },
  { id: 'research', fx: 0.66, fy: 0.83, px: 0.3, py: 0.84, children: <><span className="w">Research</span><span className="f">{frag(aboutA, 'how a skeptic can criticise language using language')}</span></> },
  { id: 'build', fx: 0.17, fy: 0.5, px: 0.74, py: 0.42, children: <><span className="w">Building</span><span className="f">{frag(aboutB, 'I wanted the thing to exist')}</span></> },
  { id: 'mitez', fx: 0.24, fy: 0.85, px: 0.72, py: 0.72, children: <><span className="w">MITEZ</span><span className="f">{frag(aboutB, 'the same instinct pointed at people')}</span></> },
];
const HERO_E: [string, string][] = [['me', 'debate'], ['debate', 'phil'], ['phil', 'research'], ['me', 'build'], ['build', 'mitez']];

const [w1, w2] = DEBATE.wins;
const win = (w: typeof w1) => <><span className="lab">{w.title}</span><span className="big">{w.where}</span><span className="sub">{w.event}, {w.when}</span></>;
const DEBATE_N: GNode[] = [
  { id: 'ld', fx: 0.5, fy: 0.47, px: 0.86, py: 0.5, cls: 'n-ld', children: <span className="w">Lincoln-Douglas</span> },
  { id: 'w1', fx: 0.22, fy: 0.2, px: 0.31, py: 0.15, cls: 'n-win', children: win(w1) },
  { id: 'w2', fx: 0.78, fy: 0.2, px: 0.31, py: 0.5, cls: 'n-win', children: win(w2) },
  { id: 'sk', fx: 0.5, fy: 0.84, px: 0.31, py: 0.86, cls: 'n-sk', children: <><span className="big">{DEBATE.team.name}</span><span className="sub">{DEBATE.team.role}</span></> },
];
const DEBATE_E: [string, string][] = [['ld', 'w1'], ['ld', 'w2'], ['ld', 'sk']];

const [sx, ma, wi] = paper.ladders!;
const EPI = paper.epigraph!;
const who = (l: typeof sx) => <><span className="big">{l.who}</span><span className="lab">{l.when}</span><span className="sub">{l.where}</span></>;
const PAPER_N: GNode[] = [
  { id: 'sx', fx: 0.2, fy: 0.87, px: 0.4, py: 0.1, cls: 'n-who', children: who(sx) },
  { id: 'ma', fx: 0.46, fy: 0.56, px: 0.6, py: 0.38, cls: 'n-who', children: who(ma) },
  { id: 'wi', fx: 0.76, fy: 0.18, px: 0.5, py: 0.76, cls: 'n-who n-wi', children: <>{who(wi)}<span className="epi">{EPI.text}</span><span className="src">{EPI.source}</span></> },
];
const PAPER_E: [string, string][] = [['sx', 'ma'], ['ma', 'wi']];

const [mail] = LINKS;
const END_N: GNode[] = [
  { id: 'pin', fx: 0, fy: 0, pin: true },
  { id: 'mail', fx: 0.4, fy: 0.58, px: 0.52, py: 0.62, href: mail.href, cls: 'n-mail', children: <span className="big">{mail.value}</span> },
];

const NAV = [['about', 'About'], ['debate', 'Debate'], ['research', 'Research'], ['work', 'Work'], ['today', 'Today'], ['github', 'GitHub'], ['now', 'Now'], ['record', 'Record'], ['contact', 'Contact']] as const;

/** Prints hang from the thread on two short strings and swing a little with the scroll and the pointer. */
function useSway(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (still) return;
    const els = [...root.current!.querySelectorAll<HTMLElement>('[data-sway]')];
    const st = els.map((el, i) => ({ el, a: 0, v: 0, k: 26 + (i % 3) * 5, s: i % 2 ? 1 : -0.8, vis: false, last: 0 }));
    const io = new IntersectionObserver((es) => es.forEach((e) => { const s = st.find((x) => x.el === e.target); if (s) s.vis = e.isIntersecting; }));
    const offs: (() => void)[] = [];
    st.forEach((s) => {
      io.observe(s.el);
      const move = (e: PointerEvent) => { s.v += Math.max(-30, Math.min(30, e.movementX)) * 0.006; };
      const tap = () => { s.v += 0.35 * s.s; };
      s.el.addEventListener('pointermove', move);
      s.el.addEventListener('pointerdown', tap);
      offs.push(() => { s.el.removeEventListener('pointermove', move); s.el.removeEventListener('pointerdown', tap); });
    });
    const tick = (_t: number, dms: number) => {
      const dt = Math.min(0.033, dms / 1000);
      for (const s of st) {
        if (!s.vis) continue;
        const drive = Math.max(-6, Math.min(6, scroll.v)) * 0.55 * s.s;
        s.v += (-s.k * s.a - 1.6 * s.v + drive) * dt;
        s.a = Math.max(-0.045, Math.min(0.045, s.a + s.v * dt));
        if (Math.abs(s.a - s.last) > 0.0002) { s.el.style.transform = `rotate(${s.a.toFixed(4)}rad)`; s.last = s.a; }
      }
    };
    gsap.ticker.add(tick);
    return () => { gsap.ticker.remove(tick); io.disconnect(); offs.forEach((f) => f()); };
  }, [root]);
}

export default function Debt() {
  useVersion('debt');
  const root = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(isPhone);
  const { notes, loaded } = useNotes();
  const gh = useGitHub();
  const [sel, setSel] = useState(0);
  useSway(root);

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  const note = notes[Math.min(sel, Math.max(0, notes.length - 1))];
  const rows: (typeof WORK[number])[][] = [];
  for (let i = 0; i < WORK.length; i += phone ? 1 : 2) rows.push(WORK.slice(i, i + (phone ? 1 : 2)) as any);

  return (
    <div className="v-debt" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <Margin />

      <header className="top">
        <nav aria-label="Sections" className="nav">
          <ul>{NAV.map(([id, l]) => <li key={id}><a href={`#${id}`}>{l}</a></li>)}</ul>
        </nav>
      </header>

      <main id="main">
        <section className="hero" aria-labelledby="name">
          <div className="hero-copy">
            <h1 id="name" data-thread-start>{PERSON.first}<br />{PERSON.last}</h1>
            <p className="line">{PERSON.line}</p>
            <p className="short">{PERSON.short.join(' ')}</p>
            <p className="hint" aria-hidden="true">Pull any word. It comes back.</p>
          </div>
          <Graph className="g-hero" label="How one thing led to another: drag the words" nodes={HERO} edges={HERO_E} phone={phone} openFrom="me" />
        </section>

        <section id="about" className="sec about" aria-labelledby="h-about">
          <h2 id="h-about" data-stitch>About</h2>
          <div className="about-body">
            {PERSON.about.map((p) => <p key={p.slice(0, 12)}>{p}</p>)}
            <p className="aside">{PERSON.aside}</p>
          </div>
        </section>

        <section id="debate" className="sec debate" aria-labelledby="h-debate">
          <h2 id="h-debate" data-stitch>Debate</h2>
          <p className="lede">{CHAPTERS[1].title}, both in Lincoln-Douglas.</p>
          <Graph className="g-debate" label="Lincoln-Douglas, tied to two championships and to Skeptical" nodes={DEBATE_N} edges={DEBATE_E} phone={phone} />
          <div className="debate-below">
            <div className="team">
              <h3>{DEBATE.team.name}, <span>{DEBATE.team.role.toLowerCase()}</span></h3>
              <p>{DEBATE.team.line}</p>
              <p className="muted">{DEBATE.team.record}</p>
              <a className="go" href={DEBATE.team.href}>{host(DEBATE.team.href)}</a>
            </div>
            <div className="next">
              <h3>Up next</h3>
              <ul>{DEBATE.next.map((n) => <li key={n.where}><span className="where">{n.where}</span><span className="ev">{n.event}</span></li>)}</ul>
            </div>
          </div>
        </section>

        <section id="research" className="sec research" aria-labelledby="h-research">
          <h2 id="h-research" data-stitch>Research</h2>
          <div className="research-grid">
            <div className="paper-field">
              <Graph className="g-paper" label="Sextus Empiricus, Fritz Mauthner and Ludwig Wittgenstein, tied in time order" nodes={PAPER_N} edges={PAPER_E} phone={phone} />
              <p className="hint">Pull Wittgenstein away from Mauthner. The thread holds.</p>
            </div>
            <div className="paper">
              <p className="status">{paper.status}, {paper.pages} pages</p>
              <h3>{paper.title}</h3>
              <p>{paper.abstract}</p>
              <ul className="kw" aria-label="Keywords">{paper.keywords!.map((k) => <li key={k}>{k}</li>)}</ul>
              <ul className="plinks">{paper.links.map((l) => <li key={l.label}><a href={l.href}>{l.label}</a></li>)}</ul>
            </div>
          </div>
          <div className="wess">
            <h3>{wess.title}</h3>
            <p>{wess.abstract}</p>
            <p className="muted">{wess.status}</p>
          </div>
        </section>

        <section id="work" className="sec work" aria-labelledby="h-work">
          <h2 id="h-work" data-stitch>Work</h2>
          {rows.map((row, ri) => (
            <div className="work-row" key={ri}>
              {row.map((w) => (
                <article className="work-item" key={w.slug}>
                  <div className="hang" data-sway>
                    <i className="str l" /><i className="str r" />
                    <img src={BASE + w.img} alt={`${w.name}, a screenshot`} loading={ri < 1 ? 'eager' : 'lazy'} width={1200} height={750} />
                  </div>
                  <div className="work-text">
                    <p className="lab">{w.kind}</p>
                    <h3>{w.name}</h3>
                    <p>{w.line}</p>
                    <p className="stack">{w.stack}</p>
                    {w.href ? <a className="go" href={w.href}>{host(w.href)}</a> : <p className="go off">Not public</p>}
                  </div>
                </article>
              ))}
            </div>
          ))}
        </section>

        <section id="today" className="sec today" aria-labelledby="h-today">
          <h2 id="h-today" data-stitch>Today</h2>
          <div className="today-grid">
            <article className="note" aria-live="polite">
              {!loaded ? <p className="note-date">Fetching today&rsquo;s note</p> : note ? (
                <>
                  <p className="lab">{sel === 0 ? 'Latest note' : 'From the notes'}</p>
                  <p className="note-date"><time dateTime={note.date}>{formatDate(note.date)}</time></p>
                  {note.body.map((p, i) => <p key={i} className="note-p">{p}</p>)}
                </>
              ) : <><p className="note-date">No note yet</p><p className="note-p">Nothing posted yet. Check back tomorrow.</p></>}
            </article>
            {notes.length > 1 ? (
              <nav className="notes" aria-label="Earlier notes">
                <h3>Every note</h3>
                <ul>
                  {notes.map((n, i) => (
                    <li key={n.date}>
                      <button type="button" aria-pressed={sel === i} onClick={() => setSel(i)}>
                        <span>{formatDate(n.date, { day: 'numeric', month: 'long' })}</span>
                        <span className="peek">{n.body[0]}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
          </div>
        </section>

        <section id="github" className="sec github" aria-labelledby="h-github">
          <h2 id="h-github" data-stitch>Live from GitHub</h2>
          <div className={gh.activity.length ? 'gh-grid' : 'gh-grid solo'}>
            {gh.activity.length ? (
              <div className="commits">
                <h3>Latest commits</h3>
                <ol>
                  {gh.activity.slice(0, 6).map((a) => (
                    <li key={a.href}><a href={a.href}><span className="msg">{a.message}</span><span className="meta">{a.repo}, {ago(a.at)}</span></a></li>
                  ))}
                </ol>
              </div>
            ) : null}
            <div className="repos">
              <h3>{gh.live ? 'Pushed to most recently' : 'Repositories'}</h3>
              <ul>
                {gh.repos.slice(0, 6).map((r) => (
                  <li key={r.name}><a href={r.href}><span className="rn">{r.name}</span>{r.description ? <span className="rd">{r.description}</span> : null}<span className="rl">{[r.language, r.pushedAt ? ago(r.pushedAt) : ''].filter(Boolean).join(', ')}</span></a></li>
                ))}
              </ul>
              <a className="go" href={GITHUB.href}>{host(GITHUB.href)}</a>
            </div>
          </div>
        </section>

        <section id="now" className="sec now" aria-labelledby="h-now">
          <h2 id="h-now" data-stitch>Now</h2>
          <p className="status-line">{NOW.status}</p>
          <div className="now-grid">
            <div>
              <h3>{NOW.reading.title}</h3>
              <p>{NOW.reading.body}</p>
              <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <h3>{NOW.club.title}</h3>
              <p>{NOW.club.body}</p>
            </div>
          </div>
        </section>

        <section id="record" className="sec record" aria-labelledby="h-record">
          <h2 id="h-record" data-stitch>Record</h2>
          <div className="record-grid">
            <ol className="honors">
              {HONORS.map((h) => <li key={h.what}><span className="what">{h.what}</span><span className="det">{h.detail}</span></li>)}
            </ol>
            <div className="awards">
              {AWARDS.map((a) => (
                <figure key={a.site} className="award">
                  <div className="hang tall" data-sway>
                    <i className="str l" /><i className="str r" />
                    <img src={BASE + a.img} alt={`Certificate for ${a.site}`} loading="lazy" width={720} height={1018} />
                  </div>
                  <figcaption><a href={a.href}>{a.site}</a><span>{a.note}</span></figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section id="off" className="sec off" aria-labelledby="h-off">
          <h2 id="h-off" data-stitch>Off the record</h2>
          <div className="off-grid">
            <div><h3>Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider}, {c.title}.</strong> {c.note}</li>)}</ul></div>
          </div>
        </section>

        <section id="contact" className="sec contact" aria-labelledby="h-contact">
          <h2 id="h-contact" data-stitch>Contact</h2>
          <p className="lede">The thread from his name ends here. Pull it.</p>
          <div data-thread-end className="end-wrap">
            <Graph className="g-end" label="His email, at the end of the thread" nodes={END_N} edges={[['pin', 'mail']]} phone={phone} />
          </div>
          <ul className="links">
            {LINKS.slice(1).map((l) => <li key={l.label}><span className="lab">{l.label}</span>{l.href ? <a href={l.href}>{l.value}</a> : <span className="val">{l.value}</span>}</li>)}
          </ul>
        </section>
      </main>

      <footer className="foot">
        <p>Draft 70 of the portfolio. Not the live site.</p>
        <p className="muted">The threads are remixed from the pmndrs bezier-curves-and-nodes example (MIT). Set in Newsreader and Schibsted Grotesk.</p>
      </footer>
    </div>
  );
}
