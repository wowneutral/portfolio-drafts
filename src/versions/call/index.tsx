// Draft 24, The call. The last ten minutes of a tournament: results are read from the bottom of
// the list up. HONORS is read last to first, one honour per scroll step, each held alone at full
// size and then set into the growing list at the left, until the last two called are Champion.
// The only text motion on the page is that one: held, then shrunk and slid into its place.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import '@fontsource-variable/familjen-grotesk/wght.css';
import './call.css';
import { AWARDS, CHAPTERS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, STATS, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { gsap, ScrollTrigger, scrollToId, scrollToY } from '@/lib/scroll';
import { still } from '@/lib/utils';

const src = (p: string) => import.meta.env.BASE_URL + p;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; ladders: { who: string; when: string; where: string }[] };
const wess = RESEARCH[1];
const debate = CHAPTERS[1];

// The call order: the list read backwards. The last two are the titles.
const CALL = [...HONORS].reverse().map((h) => {
  const i = h.what.indexOf(', ');
  const head = i < 0 ? h.what : h.what.slice(0, i);
  const tail = i < 0 ? '' : h.what.slice(i + 2);
  const win = DEBATE.wins.find((w) => w.where === h.detail);
  return { ...h, head, tail, win, champ: !!win };
});
const N = CALL.length;
// Weight of each step in scroll units: the titles hold twice as long.
const W = CALL.map((c) => (c.champ ? 2 : 1));
const TOTAL = W.reduce((a, b) => a + b, 0);
const START = W.map((_, i) => W.slice(0, i).reduce((a, b) => a + b, 0));
const FIRST_TITLE = CALL.findIndex((c) => c.champ);
// Where each called line takes you once the call is over.
const GOTO = (c: (typeof CALL)[number]) =>
  c.champ || /Debate|Forum/.test(c.what) ? 'debate' : /Wessobrunn/.test(c.what) ? 'research' : /Website/.test(c.what) ? 'work' : 'record';

type Phase = 'pre' | 'on' | 'champ' | 'post';

function Line({ head, detail, id, as: As = 'h2' }: { head: string; detail?: string; id?: string; as?: 'h2' | 'h3' }) {
  return (
    <div className="cl-line">
      <As id={id} className="cl-line-head">{head}</As>
      {detail && <p className="cl-line-detail">{detail}</p>}
    </div>
  );
}

export default function CallPage() {
  useVersion('call');
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const latest = notes[0];

  const root = useRef<HTMLDivElement>(null);
  const callRef = useRef<HTMLElement>(null);
  const heldRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const flyer = useRef<HTMLElement | null>(null);
  const pending = useRef<{ clone: HTMLElement; rect: DOMRect; to: number } | null>(null);
  const stepRef = useRef(0);
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>('pre');
  const [sec, setSec] = useState('');

  // The spine marks the honours that belong to the section you are reading.
  useEffect(() => {
    const ids = ['debate', 'today', 'about', 'research', 'work', 'github', 'record', 'now', 'off', 'contact'];
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) setSec(e.target.id); }, { rootMargin: '-45% 0px -50% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Scroll position to step and phase. The section is sticky; ScrollTrigger reads it.
  useEffect(() => {
    if (still || !callRef.current) return;
    const el = callRef.current;
    const sync = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const range = Math.max(1, el.offsetHeight - vh);
      const u = (-r.top / range) * TOTAL;
      let s = 0;
      for (let i = 0; i < N; i++) if (u >= START[i]) s = i;
      const ph: Phase = r.top > 1 ? 'pre' : r.bottom < vh * 0.12 ? 'post' : CALL[s].champ ? 'champ' : 'on';
      setPhase(ph);
      const cur = stepRef.current;
      if (s !== cur) {
        if (flyer.current) { gsap.killTweensOf(flyer.current); flyer.current.remove(); flyer.current = null; }
        if (s === cur + 1 && !CALL[cur].champ && heldRef.current) {
          const rect = heldRef.current.getBoundingClientRect();
          const clone = heldRef.current.cloneNode(true) as HTMLElement;
          pending.current = { clone, rect, to: cur };
        } else pending.current = null;
        stepRef.current = s;
        setStep(s);
      }
    };
    const st = ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom top', onUpdate: sync, onRefresh: sync });
    sync();
    return () => st.kill();
  }, []);

  // The one text motion: the held honour shrinks and slides into its place in the list.
  useLayoutEffect(() => {
    const p = pending.current;
    pending.current = null;
    const list = listRef.current, held = heldRef.current, host = root.current;
    if (!p || !list || !held || !host) return;
    const what = list.querySelector<HTMLElement>(`[data-i="${p.to}"] .cl-called-what`);
    if (!what) return;
    const target = what.parentElement as HTMLElement;
    const t = what.getBoundingClientRect();
    const c = p.clone;
    c.setAttribute('aria-hidden', 'true');
    c.classList.add('cl-flyer');
    Object.assign(c.style, { left: p.rect.left + 'px', top: p.rect.top + 'px', width: p.rect.width + 'px', right: 'auto', bottom: 'auto', transform: 'none' });
    host.appendChild(c);
    flyer.current = c;
    const head = c.querySelector<HTMLElement>('.cl-held-head')!;
    const hr = head.getBoundingClientRect();
    const k = parseFloat(getComputedStyle(what).fontSize) / parseFloat(getComputedStyle(head).fontSize);
    gsap.set(target, { opacity: 0 });
    gsap.set(held, { opacity: 0 });
    const tl = gsap.timeline({ onComplete: () => { c.remove(); if (flyer.current === c) flyer.current = null; } });
    tl.to(c, { x: t.left - p.rect.left - (hr.left - p.rect.left) * k, y: t.top - p.rect.top - (hr.top - p.rect.top) * k, scale: k, duration: 0.85, ease: 'expo.inOut' }, 0.25)
      .to(c.querySelectorAll('.cl-held-tail, .cl-held-detail'), { opacity: 0, duration: 0.3, ease: 'none' }, 0.25)
      .to(c, { opacity: 0, duration: 0.18, ease: 'none' }, 0.95)
      .set(target, { opacity: 1 }, 0.95)
      .set(held, { opacity: 1 }, 1.25);
    return () => { tl.kill(); gsap.set([target, held], { opacity: 1 }); c.remove(); };
  }, [step]);

  const skip = useCallback(() => {
    const el = callRef.current;
    if (still || !el) { scrollToId('titles'); return; }
    const range = el.offsetHeight - window.innerHeight;
    scrollToY(el.getBoundingClientRect().top + window.scrollY + (START[FIRST_TITLE] / TOTAL) * range + 4);
  }, []);

  // Today: the newest note's date is called once, held at the width of the column, then settles.
  const dateRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const d = dateRef.current;
    if (still || !d || !latest) return;
    let tl: gsap.core.Timeline | null = null;
    const st = ScrollTrigger.create({
      trigger: d, start: 'top 72%', once: true,
      onEnter: () => {
        const col = d.parentElement!.getBoundingClientRect().width;
        const k = Math.min(2.2, (col * 0.98) / Math.max(1, d.getBoundingClientRect().width));
        if (k < 1.15) return;
        tl = gsap.timeline();
        tl.fromTo(d, { scale: k, x: 0 }, { scale: 1, duration: 1.0, ease: 'expo.inOut', delay: 1.1 });
      },
    });
    return () => { st.kill(); tl?.kill(); gsap.set(d, { clearProps: 'transform' }); };
  }, [latest]);

  // Work screenshots drift a little inside their frames as they pass: the objects move, not the text.
  useEffect(() => {
    if (still) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.cl-shot img').forEach((img) => {
        gsap.fromTo(img, { yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  const cur = CALL[step];
  const called = phase === 'post' ? N : step;

  return (
    <div ref={root} className={`v-call${still ? ' is-still' : ''}`} data-phase={phase} data-sec={phase === 'post' ? sec : ''}>
      <a className="skip-x" href="#main">Skip to content</a>

      {/* The called list. Desktop: a column at the left that stays as the page's spine. Phone: a strip above the stage during the call. */}
      {!still && (
        <nav className="cl-called" aria-label="Honours called so far">
          {called > 0 && <p className="cl-called-label">Called</p>}
          <ol ref={listRef}>
            {CALL.map((c, i) => (i < called ? (
              <li key={c.what} data-i={i} data-go={GOTO(c)} className={c.champ ? 'is-title' : undefined}>
                <a href={`#${GOTO(c)}`}>
                  <span className="cl-called-what">{c.what}</span>
                  <span className="cl-called-detail">{c.detail}</span>
                </a>
              </li>
            ) : null))}
          </ol>
        </nav>
      )}

      <main id="main">
        <header className="cl-open">
          <h1 className="cl-name">{PERSON.first} <br />{PERSON.last}</h1>
          <div className="cl-open-foot">
            <p className="cl-open-line">{PERSON.line}</p>
            <div className="cl-open-titles">
              <p className="cl-open-head">{debate.title}</p>
              <p className="cl-open-body">{debate.body}</p>
              <p className="cl-open-cue">
                <span>The results, read from the bottom.</span>
                <button type="button" className="cl-skip" onClick={skip}>Skip to the titles</button>
              </p>
            </div>
          </div>
        </header>

        {still ? (
          <section className="cl-still" aria-labelledby="call-h">
            <Line head="The call" detail="Honours, read from the bottom of the list" id="call-h" />
            <ol className="cl-still-list">
              {CALL.filter((c) => !c.champ).map((c) => (
                <li key={c.what}><span className="cl-still-what">{c.what}</span><span className="cl-still-detail">{c.detail}</span></li>
              ))}
            </ol>
            <ol className="cl-still-titles" id="titles">
              {CALL.filter((c) => c.champ).map((c) => (
                <li key={c.what}>
                  <span className="cl-champ-word">{c.head}</span>
                  <span className="cl-champ-event">{c.tail}</span>
                  <span className="cl-champ-where">{c.detail}{c.win ? `, ${c.win.when}` : ''}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : (
          <section ref={callRef} className="cl-call" aria-label="The call: honours read from the bottom of the list" style={{ height: `calc(${TOTAL} * var(--unit) + 100svh)` }}>
            <div className={`cl-stage${cur.champ ? ' is-champ' : ''}`}>
              <div ref={heldRef} className="cl-held" key={cur.what} aria-live="polite">
                {cur.champ ? (
                  <>
                    <p className="cl-held-head cl-champ-word">{cur.head}</p>
                    <p className="cl-held-tail cl-champ-event">{cur.tail}</p>
                    <p className="cl-held-detail cl-champ-where">{cur.detail}{cur.win ? `, ${cur.win.when}` : ''}</p>
                  </>
                ) : (
                  <>
                    <p className={`cl-held-head${cur.head.length > 14 ? ' is-long' : ''}`}>{cur.head}</p>
                    {cur.tail && <p className="cl-held-tail">{cur.tail}</p>}
                    <p className="cl-held-detail">{cur.detail}</p>
                  </>
                )}
              </div>
              <p className="cl-count" aria-hidden="true">{step + 1} of {N}</p>
            </div>
          </section>
        )}

        <div className="cl-body">
          {/* Debate */}
          <section id="debate" className="cl-sec" aria-labelledby="debate-h">
            <Line head={debate.title} detail={debate.label} id="debate-h" />
            <ol className="cl-wins">
              {DEBATE.wins.map((w) => (
                <li key={w.where}>
                  <p className="cl-win-title">{w.title}</p>
                  <dl className="cl-win-facts">
                    <div><dt>Event</dt><dd>{w.event}</dd></div>
                    <div><dt>Where</dt><dd>{w.where}</dd></div>
                    <div><dt>When</dt><dd>{w.when}</dd></div>
                  </dl>
                </li>
              ))}
            </ol>

            <article className="cl-team">
              <p className="cl-team-role">{DEBATE.team.role}</p>
              <h3 className="cl-team-name">{DEBATE.team.name}</h3>
              <p className="cl-team-line">{DEBATE.team.line}</p>
              <p className="cl-team-record">{DEBATE.team.record}</p>
              <p className="cl-links"><a href={DEBATE.team.href}>{host(DEBATE.team.href)}</a></p>
            </article>

            <div className="cl-next">
              <h3 className="cl-sub">Still to be called</h3>
              <ol>
                {DEBATE.next.map((n) => (
                  <li key={n.where}>
                    <span className="cl-next-event">{n.event}</span>
                    <span className="cl-next-where">{n.where}</span>
                    <span className="cl-next-blank" aria-hidden="true" />
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* Today */}
          <section id="today" className="cl-sec" aria-labelledby="today-h">
            <Line head="Today" detail="The daily note" id="today-h" />
            <div className="cl-today">
              <p ref={dateRef} className="cl-today-date">{latest ? formatDate(latest.date) : loaded ? 'Right now' : 'Today'}</p>
              <div className="cl-today-body">
                {latest ? latest.body.map((p, i) => <p key={i}>{p}</p>) : <p>{NOW.status}</p>}
              </div>
              {notes.length > 1 && (
                <div className="cl-earlier">
                  <h3 className="cl-sub">Earlier</h3>
                  {notes.slice(1, 12).map((n) => (
                    <details key={n.date} className="cl-note">
                      <summary>
                        <span className="cl-note-date">{formatDate(n.date)}</span>
                        <span className="cl-note-peek">{n.body[0]}</span>
                      </summary>
                      <div className="cl-note-body">{n.body.map((p, i) => <p key={i}>{p}</p>)}</div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* About */}
          <section id="about" className="cl-sec" aria-labelledby="about-h">
            <Line head={PERSON.name} detail={PERSON.short.join(' ')} id="about-h" />
            <div className="cl-about">
              {PERSON.about.map((p) => <p key={p.slice(0, 20)}>{p}</p>)}
              <p className="cl-aside">{PERSON.aside}</p>
            </div>
          </section>

          {/* Research */}
          <section id="research" className="cl-sec" aria-labelledby="research-h">
            <Line head="Research" detail={paper.status} id="research-h" />
            <article className="cl-paper">
              <h3 className="cl-paper-title">{paper.title}</h3>
              <p className="cl-paper-abstract">{paper.abstract}</p>
              <p className="cl-keys"><span className="cl-keys-label">Keywords</span> {paper.keywords.join(', ')}</p>
              <ol className="cl-sheet cl-ladders" aria-label="The three ladders the paper traces">
                {paper.ladders.map((l) => (
                  <li key={l.who}><span className="cl-sheet-l">{l.who}</span><span className="cl-lead" aria-hidden="true" /><span className="cl-sheet-r">{l.where}, {l.when}</span></li>
                ))}
              </ol>
              <p className="cl-links">{paper.links.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}</p>
            </article>
            <article className="cl-wess">
              <h3 className="cl-wess-title">{wess.title}</h3>
              <p className="cl-wess-status">{wess.status}</p>
              <p>{wess.abstract}</p>
            </article>
          </section>

          {/* Work */}
          <section id="work" className="cl-sec" aria-labelledby="work-h">
            <Line head={CHAPTERS[4].title} detail={`${WORK.length} things built`} id="work-h" />
            <ol className="cl-work">
              {WORK.map((w) => {
                const shot = <img src={src(w.img)} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={680} />;
                return (
                  <li key={w.slug} className="cl-entry">
                    <div className="cl-entry-line">
                      <h3 className="cl-entry-name">{w.name}</h3>
                      <p className="cl-entry-kind">{w.kind}</p>
                    </div>
                    {w.href ? <a className="cl-shot" href={w.href} tabIndex={-1} aria-hidden="true">{shot}</a> : <div className="cl-shot">{shot}</div>}
                    <div className="cl-entry-text">
                      <p className="cl-entry-desc">{w.line}</p>
                      <div className="cl-entry-meta">
                        <p className="cl-entry-stack">{w.stack}</p>
                        {w.href ? <a className="cl-go" href={w.href}>{host(w.href)}</a> : <p className="cl-entry-stack">Runs locally, no public link</p>}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Live from GitHub */}
          <section id="github" className="cl-sec" aria-labelledby="github-h">
            <Line head="Live from GitHub" detail={gh.live ? 'Latest pushes' : 'Repositories'} id="github-h" />
            {gh.activity.length > 0 && (
              <ol className="cl-sheet cl-commits">
                {gh.activity.slice(0, 8).map((a) => (
                  <li key={a.href}>
                    <a href={a.href}><span className="cl-sheet-l">{a.message}</span><span className="cl-lead" aria-hidden="true" /><span className="cl-sheet-r">{a.repo}, {ago(a.at)}</span></a>
                  </li>
                ))}
              </ol>
            )}
            <ol className="cl-sheet cl-repos">
              {gh.repos.slice(0, 8).map((r) => (
                <li key={r.name}>
                  <a href={r.href}>
                    <span className="cl-repo-name">{r.name}</span>
                    <span className="cl-repo-desc">{r.description ?? ''}</span>
                    <span className="cl-sheet-r">{r.language ?? ''}</span>
                  </a>
                </li>
              ))}
            </ol>
            <p className="cl-links"><a href={GITHUB.href}>{host(GITHUB.href)}</a></p>
          </section>

          {/* Record */}
          <section id="record" className="cl-sec" aria-labelledby="record-h">
            <Line head="Record" detail="Honours, top of the list first" id="record-h" />
            <ol className="cl-sheet cl-rec-list">
              {HONORS.map((h, i) => (
                <li key={h.what} className={i < 2 ? 'is-title' : undefined}><span className="cl-sheet-l">{h.what}</span><span className="cl-lead" aria-hidden="true" /><span className="cl-sheet-r">{h.detail}</span></li>
              ))}
            </ol>
            <div className="cl-certs">
              {AWARDS.map((a) => (
                <a key={a.href} className="cl-cert" href={a.href}>
                  <img src={src(a.img)} alt={`Certificate: ${a.site}, ${a.note}`} loading="lazy" width={720} height={1018} />
                  <span className="cl-cert-site">{a.site}</span>
                  <span className="cl-cert-note">{a.note}</span>
                </a>
              ))}
            </div>
            <ul className="cl-stats">
              {STATS.map((s) => (
                <li key={s.label}><span className="cl-stat-n">{s.to}{s.suffix}</span><span className="cl-stat-l">{s.label}</span></li>
              ))}
            </ul>
          </section>

          {/* Now */}
          <section id="now" className="cl-sec" aria-labelledby="now-h">
            <Line head="Now" detail="Lately" id="now-h" />
            <div className="cl-now">
              <article>
                <h3 className="cl-sub">{NOW.reading.title}</h3>
                <p>{NOW.reading.body}</p>
                <ul className="cl-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
              </article>
              <article>
                <h3 className="cl-sub">{NOW.club.title}</h3>
                <p>{NOW.club.body}</p>
              </article>
            </div>
          </section>

          {/* Off the record */}
          <section id="off" className="cl-sec" aria-labelledby="off-h">
            <Line head="Off the record" detail="Not results" id="off-h" />
            <div className="cl-off">
              {([['Likes', LIKES], ['Dislikes', DISLIKES], ['Favourites', FAVOURITES]] as const).map(([t, xs]) => (
                <div key={t}>
                  <h3 className="cl-sub">{t}</h3>
                  <ul>{xs.map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
              ))}
              <div>
                <h3 className="cl-sub">Courses</h3>
                <ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider}, {c.title}.</strong> {c.note}</li>)}</ul>
              </div>
            </div>
          </section>

          {/* Ending */}
          <section id="contact" className="cl-sec cl-end" aria-labelledby="contact-h">
            <Line head="Last call" detail="Contact" id="contact-h" />
            <p className="cl-status">{NOW.status}</p>
            <ul className="cl-sheet cl-contact">
              {LINKS.map((l) => (
                <li key={l.label}>
                  {l.href ? (
                    <a href={l.href}><span className="cl-sheet-l">{l.label}</span><span className="cl-lead" aria-hidden="true" /><span className="cl-sheet-r">{l.value}</span></a>
                  ) : (
                    <div className="cl-row"><span className="cl-sheet-l">{l.label}</span><span className="cl-lead" aria-hidden="true" /><span className="cl-sheet-r">{l.value}</span></div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <footer className="cl-foot">
            <p>Draft 24 of the portfolio. Not the live site.</p>
            <p>{PERSON.name}, {PERSON.home}. Set in Familjen Grotesk.</p>
          </footer>
        </div>
      </main>
    </div>
  );
}
