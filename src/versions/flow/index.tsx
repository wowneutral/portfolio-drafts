// Draft 4, The flow. His life laid out as a debate flow: one column per speech, blue arrows
// carrying each claim into the next column, and the two titles circled where the round was decided.
// Desktop: the sheet is one pinned horizontal run. Phone: the columns stack and the arrows run down the margin.
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import '@fontsource-variable/instrument-sans/wdth.css';
import '@fontsource/kalam/400.css';
import '@fontsource/kalam/700.css';
import './flow.css';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, STATS, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { gsap, ScrollTrigger, useGSAP, scrollToY } from '@/lib/scroll';
import { clamp, still } from '@/lib/utils';
import { Arrows, Mark, type Link } from './Arrows';

const WIDE = '(min-width: 1024px) and (min-height: 680px)';
const src = (p: string) => import.meta.env.BASE_URL + p;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/\/$/, '');
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { ladders: { who: string; when: string; where: string }[]; epigraph: { text: string; source: string }; keywords: string[] };
const wess = RESEARCH[1];
const sentences = (p: string) => p.split(/(?<=\.)\s+(?=[A-Z])/);
const [s0, s1, s2] = sentences(PERSON.about[0]);
const CLAIMS = ['debater', 'researcher', 'builder'];
const PAGE = 3;

type Hot = { id: string; n: number } | null;

export default function FlowPage() {
  useVersion('flow');
  const root = useRef<HTMLDivElement>(null);
  const run = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLDivElement>(null);
  const st = useRef<{ t: ScrollTrigger; dist: () => number } | null>(null);
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(WIDE).matches);
  const [hot, setHot] = useState<Hot>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const commits = gh.activity.slice(0, 7);
  const repos = gh.repos.slice(0, commits.length ? 6 : 6);
  const latest = notes[0];
  const earlier = notes.slice(1);
  const pages = Math.max(1, Math.ceil(earlier.length / PAGE));
  const shown = earlier.slice(page * PAGE, page * PAGE + PAGE);
  const stamp = `${wide}-${commits.length}-${repos.length}-${notes.length}-${page}`;

  const links = useMemo<Link[]>(() => [
    { from: 'debater', to: 'case-debate' },
    { from: 'researcher', to: 'case-research' },
    { from: 'builder', to: 'case-build' },
    { from: 'case-debate', to: 'win-0' },
    { from: 'case-debate', to: 'win-1' },
    { from: 'case-research', to: 'paper' },
    { from: 'lad-0', to: 'lad-1' },
    { from: 'lad-1', to: 'lad-2' },
    { from: 'case-build', to: 'w-mitez' },
    { from: 'team', to: 'w-skeptical' },
    ...(commits.length ? commits.map((_, i) => ({ from: 'w-drafts', to: `gh-${i}` })) : repos.map((_, i) => ({ from: 'w-drafts', to: `repo-${i}` }))),
    { from: 'repos', to: 'today' },
  ], [commits.length, repos.length]);
  const backLinks = useMemo<Link[]>(() => [{ from: 'h-wd', to: 'cert-0' }, { from: 'h-wd', to: 'cert-1' }], []);

  // The pinned sideways run, desktop only.
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(WIDE, () => {
      const t = track.current!;
      const dist = () => Math.max(0, t.scrollWidth - window.innerWidth);
      const tw = gsap.to(t, { x: () => -dist(), ease: 'none' });
      const trig = ScrollTrigger.create({ trigger: run.current, start: 'top top', end: () => '+=' + Math.round(dist() * 0.62), pin: true, scrub: still ? true : 0.5, animation: tw, invalidateOnRefresh: true, anticipatePin: 1 });
      st.current = { t: trig, dist };
      return () => { st.current = null; };
    });
    return () => mm.revert();
  }, { scope: root });

  useEffect(() => { const id = setTimeout(() => ScrollTrigger.refresh(), 120); return () => clearTimeout(id); }, [stamp]);

  // Bring any element into view: along the run on desktop, down the page on phones.
  const bring = useCallback((el: Element, immediate = false) => {
    const r = el.getBoundingClientRect();
    const s = st.current;
    if (s && track.current?.contains(el)) {
      const x = r.left - track.current.getBoundingClientRect().left;
      const d = s.dist() || 1;
      const tx = clamp(x - 160, 0, d);
      scrollToY(s.t.start + (tx / d) * (s.t.end - s.t.start), immediate);
    } else if (r.top < 60 || r.bottom > window.innerHeight - 60) {
      scrollToY(window.scrollY + r.top - window.innerHeight * 0.3, immediate);
    }
  }, []);

  // Keyboard focus inside the run moves the sheet to it.
  useEffect(() => {
    const t = track.current;
    if (!t) return;
    const on = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      const r = el.getBoundingClientRect();
      if (st.current && (r.left < 0 || r.right > window.innerWidth)) bring(el, true);
    };
    t.addEventListener('focusin', on);
    return () => t.removeEventListener('focusin', on);
  }, [bring]);

  // A pressed claim: its arrows redraw, its targets lift, and the sheet follows the thread.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    el.querySelectorAll('.is-lift').forEach((n) => n.classList.remove('is-lift'));
    if (!hot) return;
    const targets = links.filter((l) => l.from === hot.id).map((l) => el.querySelector(`[data-c="${l.to}"]`)).filter(Boolean) as Element[];
    targets.forEach((n) => (n.closest('[data-box]') ?? n).classList.add('is-lift'));
    const first = targets[0];
    if (!first) return;
    // Wait for the scrubbed sheet to settle before deciding whether the thread runs off screen.
    const id = setTimeout(() => {
      const r = first.getBoundingClientRect();
      if (r.left > window.innerWidth - 120 || r.right < 0 || r.top > window.innerHeight - 80 || r.bottom < 0) bring(first);
    }, 650);
    return () => clearTimeout(id);
  }, [hot, links, bring]);

  useEffect(() => {
    const k = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') setHot(null); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const press = (id: string) => setHot((h) => (h?.id === id && !still ? null : { id, n: (h?.n ?? 0) + 1 }));
  const C = ({ id, children }: { id: string; children: ReactNode }) => (
    <span
      key={id}
      role="button" tabIndex={0} data-c={id} aria-pressed={hot?.id === id}
      className="fl-claim"
      onClick={() => press(id)}
      onKeyDown={(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); press(id); } }}
    >{children}</span>
  );

  return (
    <div className="v-flow" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <main id="main">
        <div className="fl-run" ref={run}>
          <div className="fl-track" ref={track}>
            <Arrows root={track} links={links} mode={wide ? 'x' : 'y'} stamp={stamp} hot={hot} />

            {/* 1AC: the name, and three claims already carried off the edge of the sheet */}
            <header className="fl-col fl-c-name" data-col="0">
              <p className="fl-head" aria-hidden="true">1AC</p>
              <h1 className="fl-name"><span>{PERSON.first}</span> <span>{PERSON.last}</span></h1>
              <ol className="fl-short">
                {PERSON.short.map((s, i) => <li key={s}>{C({ id: CLAIMS[i], children: <>{s}</> })}</li>)}
              </ol>
              <p className="fl-line">{PERSON.line}</p>
              <p className="fl-hint">Press any claim to retrace its arrows.</p>
            </header>

            {/* The case: About, split where each thread leaves it */}
            <section className="fl-col fl-c-case" data-col="1" aria-labelledby="h-case">
              <h2 className="fl-head" id="h-case">the case</h2>
              <p className="fl-lead" data-box="">{C({ id: 'case-debate', children: <>{s0} {s1}</> })} {C({ id: 'case-research', children: <>{s2}</> })}</p>
              <p className="fl-body" data-box="">{C({ id: 'case-build', children: <>{PERSON.about[1]}</> })}</p>
              <p className="fl-aside">{PERSON.aside}</p>
            </section>

            {/* The decision: both titles circled */}
            <section className="fl-col fl-c-dec" data-col="2" aria-labelledby="h-dec">
              <h2 className="fl-head" id="h-dec">the decision</h2>
              <div className="fl-dec">
                <div className="fl-wins">
                  {DEBATE.wins.map((w, i) => (
                    <div className="fl-win" key={w.where} data-box="">
                      <h3 className="fl-wt" data-c={`win-${i}`}>
                        <span className="fl-wword">{w.title}<Mark kind="loop" seed={11 + i * 7} pad={i ? 26 : 22} /></span>
                      </h3>
                      <p className="fl-wwhere">{w.where}</p>
                      <p className="fl-wevent">{w.event}, {w.when}</p>
                    </div>
                  ))}
                </div>
                <div className="fl-team" data-box="">
                  <p className="fl-role">{DEBATE.team.role}</p>
                  <h3 className="fl-tname">{C({ id: 'team', children: <>{DEBATE.team.name}</> })}</h3>
                  <p className="fl-body">{DEBATE.team.line}</p>
                  <p className="fl-body fl-muted">{DEBATE.team.record}</p>
                  <p><a className="fl-a" href={DEBATE.team.href}>{host(DEBATE.team.href)}</a></p>
                  <div className="fl-next">
                    <Mark kind="dash" seed={41} pad={14} />
                    <h4 className="fl-label">next round</h4>
                    <ul>
                      {DEBATE.next.map((n) => <li key={n.where}><b>{n.where}</b><span>{n.event}</span></li>)}
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* The paper */}
            <section className="fl-col fl-c-paper" data-col="3" aria-labelledby="h-paper">
              <h2 className="fl-head" id="h-paper">the paper</h2>
              <div className="fl-paper">
                <div className="fl-pl" data-box="">
                  <p className="fl-role">{paper.status}</p>
                  <h3 className="fl-ptitle" data-c="paper">{paper.title}</h3>
                  <p className="fl-lead fl-abs">{paper.abstract}</p>
                  <ol className="fl-ladders" aria-label="The three ladders the paper follows">
                    {paper.ladders.map((l, i) => (
                      <li key={l.who} data-c={`lad-${i}`} data-box="">
                        <b>{l.who}</b>
                        <span className="fl-lwhen">{l.when}</span>
                        <span className="fl-lwhere">{l.where}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="fl-pr">
                  <blockquote className="fl-epi">
                    <p>{paper.epigraph.text}</p>
                    <cite>{paper.epigraph.source}</cite>
                  </blockquote>
                  <h4 className="fl-label">keywords</h4>
                  <ul className="fl-keys">{paper.keywords.map((k) => <li key={k}>{k}</li>)}</ul>
                  <h4 className="fl-label">read it</h4>
                  <ul className="fl-plinks">{paper.links.map((l) => <li key={l.label}><a className="fl-a" href={l.href}>{l.label}</a></li>)}</ul>
                  <div className="fl-wess">
                    <h4 className="fl-wtitle">{wess.title}</h4>
                    <p className="fl-role">{wess.status}</p>
                    <p className="fl-body">{wess.abstract}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* The builds */}
            <section className="fl-col fl-c-work" data-col="4" aria-labelledby="h-work">
              <h2 className="fl-head" id="h-work">the builds</h2>
              <div className="fl-work">
                {WORK.map((w) => (
                  <article className="fl-card" key={w.slug} data-box="">
                    {w.href ? (
                      <a className="fl-img" href={w.href} tabIndex={-1} aria-hidden="true"><img src={src(w.img)} alt="" loading="lazy" width={1200} height={750} /></a>
                    ) : (
                      <span className="fl-img"><img src={src(w.img)} alt="" loading="lazy" width={1200} height={750} /></span>
                    )}
                    <p className="fl-kind">{w.kind}</p>
                    <h3 className="fl-wname">{C({ id: `w-${w.slug}`, children: <>{w.name}</> })}</h3>
                    <p className="fl-wline">{w.line}</p>
                    <p className="fl-stack">{w.stack}</p>
                    {w.href ? <p><a className="fl-a" href={w.href}>{host(w.href)}</a></p> : null}
                  </article>
                ))}
              </div>
            </section>

            {/* Extensions: live from GitHub */}
            <section className="fl-col fl-c-gh" data-col="5" aria-labelledby="h-gh">
              <h2 className="fl-head" id="h-gh">extensions</h2>
              <div className={`fl-gh${commits.length ? ' has-commits' : ''}`}>
                {commits.length > 0 && (
                  <div className="fl-commits">
                    <h3 className="fl-ghh">Live from GitHub</h3>
                    <p className="fl-role">{gh.commitsThisMonth != null ? `${gh.commitsThisMonth} commits this month` : 'Latest commits'}</p>
                    <ol>
                      {commits.map((a, i) => (
                        <li key={a.href} data-c={`gh-${i}`}>
                          <a className="fl-cmsg" href={a.href}>{a.message}</a>
                          <span className="fl-cmeta">{a.repo}, {ago(a.at)}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                <div className="fl-repos" data-c="repos" data-box="">
                  {!commits.length && <h3 className="fl-ghh">Live from GitHub</h3>}
                  <p className="fl-role">Repositories</p>
                  <ul>
                    {repos.map((r, i) => (
                      <li key={r.name} data-c={`repo-${i}`}>
                        <a className="fl-rname" href={r.href}>{r.name}</a>
                        <span className="fl-rdesc">{r.description || 'No description yet.'}</span>
                        <span className="fl-cmeta">{[r.language, r.pushedAt ? ago(r.pushedAt) : null].filter(Boolean).join(', ')}</span>
                      </li>
                    ))}
                  </ul>
                  <p><a className="fl-a" href={GITHUB.href}>{host(GITHUB.href)}</a></p>
                </div>
              </div>
            </section>

            {/* Today: always the rightmost thing on the sheet */}
            <section className="fl-col fl-c-today" data-col="6" id="today" aria-labelledby="h-today">
              <h2 className="fl-head" id="h-today">today</h2>
              <article className="fl-latest" data-box="">
                {latest ? (
                  <>
                    <p className="fl-date" data-c="today" key={latest.date}><time dateTime={latest.date}>{formatDate(latest.date, { weekday: 'long', day: 'numeric', month: 'long' })}</time></p>
                    {latest.body.map((p, k) => <p key={k} className="fl-note">{p}</p>)}
                  </>
                ) : (
                  <>
                    <p className="fl-date" data-c="today">{loaded ? 'Right now' : 'Today'}</p>
                    <p className="fl-note">{NOW.status}</p>
                  </>
                )}
              </article>
              {earlier.length > 0 && (
                <div className="fl-earlier">
                  <h3 className="fl-label">earlier</h3>
                  <ol>
                    {shown.map((n) => (
                      <li key={n.date}>
                        <time dateTime={n.date}>{formatDate(n.date)}</time>
                        {n.body.map((p, k) => <p key={k}>{p}</p>)}
                      </li>
                    ))}
                  </ol>
                  {pages > 1 && (
                    <div className="fl-pager">
                      <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Newer</button>
                      <button type="button" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>Older</button>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* The back of the flow */}
        <div className="fl-back" ref={back}>
          <Arrows root={back} links={backLinks} mode={wide ? 'x' : 'y'} stamp={stamp} hot={null} />
          <section className="fl-bcol fl-c-ballot" data-col="0" aria-labelledby="h-ballot">
            <h2 className="fl-head" id="h-ballot">the ballot</h2>
            <div className="fl-ballot">
              <div className="fl-honors-wrap">
                <ol className="fl-honors">
                  {HONORS.map((h) => (
                    <li key={h.what} data-box={h.what.startsWith('WD') ? '' : undefined}>
                      {h.what.startsWith('WD') ? <span data-c="h-wd">{h.what}</span> : <span>{h.what}</span>}
                      <span className="fl-hd">{h.detail}</span>
                    </li>
                  ))}
                </ol>
                <ul className="fl-stats">
                  {STATS.map((s) => <li key={s.label}><b>{s.to}{s.suffix}</b><span>{s.label}</span></li>)}
                </ul>
              </div>
              <div className="fl-certs">
                {AWARDS.map((a, i) => (
                  <a key={a.href} href={a.href} className="fl-cert" data-c={`cert-${i}`} data-box="">
                    <img src={src(a.img)} alt={`Certificate: ${a.site}`} loading="lazy" width={720} height={1018} />
                    <span className="fl-cs">{a.site}</span>
                    <span className="fl-cn">{a.note}</span>
                  </a>
                ))}
              </div>
            </div>
          </section>

          <section className="fl-bcol fl-c-now" aria-labelledby="h-now">
            <h2 className="fl-head" id="h-now">now</h2>
            <p className="fl-status">{NOW.status}</p>
            <h3 className="fl-subh">{NOW.reading.title}</h3>
            <p className="fl-body">{NOW.reading.body}</p>
            <ul className="fl-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            <h3 className="fl-subh">{NOW.club.title}</h3>
            <p className="fl-body">{NOW.club.body}</p>
          </section>

          <section className="fl-bcol fl-c-off" aria-labelledby="h-off">
            <h2 className="fl-head" id="h-off">off the record</h2>
            <div className="fl-four">
              <div><h3 className="fl-subh">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="fl-subh">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="fl-subh">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3 className="fl-subh">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider} {c.title}</b> {c.note}</li>)}</ul></div>
            </div>
          </section>

          <section className="fl-bcol fl-c-you" aria-labelledby="h-you">
            <div className="fl-you">
              <Mark kind="dash" seed={77} pad={0} />
              <h2 className="fl-head" id="h-you">your speech</h2>
              <p className="fl-yourturn">Your turn.</p>
              <ul className="fl-links">
                {LINKS.map((l) => (
                  <li key={l.label}>
                    <span className="fl-ll">{l.label}</span>
                    {l.href ? <a className="fl-a" href={l.href}>{l.value}</a> : <span className="fl-lv">{l.value}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </main>

      <footer className="fl-foot">
        <p className="fl-fname">{PERSON.name}</p>
        <p>Draft 4 of the portfolio. Not the live site.</p>
        <p className="fl-muted">Set in Instrument Sans and Kalam. Arrows drawn with Rough.js.</p>
      </footer>
    </div>
  );
}
