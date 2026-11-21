// Remixed from codrops/LoopScrolling (MIT, js/index.js): Lenis infinite scroll, the first section cloned after the last, scrubbed scaleY squash at the seam.
// Draft 83, the loop. His season is a loop (win, then the next tournament; a note, then tomorrow's),
// so the page has no end: past the footer his name stretches open again with Up next waiting.
import { useEffect, useRef, useState } from 'react';
import '@fontsource-variable/syne/wght.css';
import '@fontsource-variable/newsreader/opsz.css';
import './loop.css';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, STATS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB, CHAPTERS } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { gsap, ScrollTrigger, getLenis, scrollToId } from '@/lib/scroll';
import { coarse, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';

const BASE = import.meta.env.BASE_URL;
const ext = (href: string) => (href.startsWith('http') ? { rel: 'noopener', target: '_blank' } : {});

const INDEX = [
  { id: 'top', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'debate', label: 'Debate' },
  { id: 'research', label: 'Research' },
  { id: 'work', label: 'Work' },
  { id: 'today', label: 'Today' },
  { id: 'github', label: 'GitHub' },
  { id: 'now', label: 'Now' },
  { id: 'record', label: 'Record' },
  { id: 'off', label: 'Off the record' },
  { id: 'contact', label: 'Contact' },
];

// Long addresses break before the @ or after a slash, never mid-word.
const brk = (v: string) => v.split(/(?=@)|(?<=\/)/).flatMap((part, i) => (i ? [<wbr key={i} />, part] : [part]));

const mitez = CHAPTERS.find((c) => c.id === 'mitez')!;
const paper = RESEARCH[0];
const wess = RESEARCH[1];

function Opening({ clone = false }: { clone?: boolean }) {
  const Name = clone ? 'p' : 'h1';
  return (
    <div className="lp-open-in">
      <div className="lp-top">
        <Name className="lp-name">
          <span>{PERSON.first}</span> <span>{PERSON.last}</span>
        </Name>
        <p className="lp-line">{PERSON.line}</p>
      </div>
      <ul className="lp-wins">
        {DEBATE.wins.map((w) => (
          <li key={w.where}>{w.title}, {w.event}, {w.where}.</li>
        ))}
        <li className="lp-next">Up next: {DEBATE.next.map((n) => n.where).join(', ')}.</li>
      </ul>
    </div>
  );
}

function Today() {
  const { notes, loaded } = useNotes();
  const [open, setOpen] = useState<string | null>(null);
  const [latest, ...earlier] = notes;
  return (
    <section className="lp-sec lp-today" id="today" aria-labelledby="today-h" data-sec="today">
      <h2 className="lp-h" id="today-h">Today</h2>
      {latest ? (
        <article className="lp-note">
          <p className="lp-note-date"><time dateTime={latest.date}>{formatDate(latest.date)}</time></p>
          <div className="lp-note-body">{latest.body.map((p, i) => <p key={i}>{p}</p>)}</div>
        </article>
      ) : (
        <article className="lp-note">
          <p className="lp-note-date">{loaded ? 'Nothing posted yet' : 'Today'}</p>
          <div className="lp-note-body"><p>{loaded ? 'The daily note lives here. Check back tomorrow.' : 'Fetching the latest note.'}</p></div>
        </article>
      )}
      {earlier.length > 0 && (
        <div className="lp-earlier">
          <h3 className="lp-sub">Earlier</h3>
          <ul>
            {earlier.map((n) => {
              const on = open === n.date;
              return (
                <li key={n.date} className={on ? 'is-open' : undefined}>
                  <button type="button" className="lp-earlier-btn" aria-expanded={on} aria-controls={`note-${n.date}`} onClick={() => setOpen(on ? null : n.date)}>
                    <time dateTime={n.date}>{formatDate(n.date)}</time>
                    <span className="lp-earlier-mark" aria-hidden="true">{on ? 'Close' : 'Read'}</span>
                  </button>
                  <div id={`note-${n.date}`} className="lp-earlier-body" hidden={!on}>
                    {n.body.map((p, i) => <p key={i}>{p}</p>)}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <p className="lp-loopline">A new note, then tomorrow&rsquo;s.</p>
    </section>
  );
}

function GitHubSec() {
  const gh = useGitHub();
  return (
    <section className="lp-sec lp-gh" id="github" aria-labelledby="gh-h" data-sec="github">
      <h2 className="lp-h" id="gh-h">Live from GitHub</h2>
      <div className="lp-gh-grid">
        {gh.activity.length > 0 && (
          <div className="lp-commits">
            <h3 className="lp-sub">Latest commits</h3>
            <ol>
              {gh.activity.slice(0, 6).map((a) => (
                <li key={a.href}>
                  <a href={a.href} {...ext(a.href)}>
                    <span className="lp-commit-msg">{a.message}</span>
                    <span className="lp-commit-meta">{a.repo}, {ago(a.at)}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        )}
        <div className="lp-repos">
          <h3 className="lp-sub">{gh.live ? 'Recently pushed' : 'Repositories'}</h3>
          <ul>
            {gh.repos.slice(0, 6).map((r) => (
              <li key={r.name}>
                <a href={r.href} {...ext(r.href)}>
                  <span className="lp-repo-name">{r.name}</span>
                  {r.description && <span className="lp-repo-desc">{r.description}</span>}
                  <span className="lp-repo-meta">{[r.language, r.pushedAt ? `pushed ${ago(r.pushedAt)}` : null].filter(Boolean).join(', ')}</span>
                </a>
              </li>
            ))}
          </ul>
          <a className="lp-more" href={GITHUB.href} {...ext(GITHUB.href)}>Everything at github.com/{GITHUB.user}</a>
        </div>
      </div>
    </section>
  );
}

export default function Loop() {
  useVersion('loop');
  const root = useRef<HTMLDivElement>(null);
  const [lap, setLap] = useState(1);
  const [cur, setCur] = useState('top');
  const [sheet, setSheet] = useState(false);
  const [tucked, setTucked] = useState(false);

  // On a phone the index button steps out of the way while you read downward and returns when you scroll back.
  useEffect(() => {
    if (still) return;
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 12) return;
      setTucked(y > last && y > 300);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // The loop itself: the shared Lenis goes infinite for this route only, and the seam is scrubbed.
  useEffect(() => {
    if (still) return;
    const lenis = getLenis();
    const el = root.current!;
    const first = el.querySelector<HTMLElement>('.lp-open')!;
    const clone = el.querySelector<HTMLElement>('.lp-clone')!;
    const ctx = gsap.context(() => {
      gsap.set(first, { transformOrigin: '50% 100%' });
      gsap.fromTo(first, { scaleY: 1 }, { scaleY: 0, ease: 'none', scrollTrigger: { trigger: first, start: 'top top', end: 'bottom top', scrub: true, fastScrollEnd: true } });
      gsap.set(clone, { transformOrigin: '50% 0%' });
      gsap.fromTo(clone, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: clone, start: 'top bottom', end: 'top top', scrub: true, fastScrollEnd: true } });
      // The flip book: each screenshot squashes from its bottom edge as it leaves the top.
      el.querySelectorAll<HTMLElement>('.lp-shot').forEach((img) => {
        gsap.set(img, { transformOrigin: '50% 100%' });
        gsap.fromTo(img, { scaleY: 1 }, { scaleY: 0, ease: 'none', scrollTrigger: { trigger: img.parentElement!, start: 'top top', end: 'bottom top', scrub: true } });
      });
    }, el);
    let prev = 0;
    const onScroll = (l: { scroll: number; limit: number; direction: number; isScrolling: unknown }) => {
      if (l.isScrolling === 'smooth' && l.direction > 0 && prev > l.limit * 0.8 && l.scroll < l.limit * 0.2) setLap((n) => n + 1);
      prev = l.scroll;
    };
    if (lenis) {
      lenis.options.infinite = true;
      if (coarse) lenis.options.syncTouch = true;
      lenis.on('scroll', onScroll);
    }
    const t = setTimeout(() => ScrollTrigger.refresh(), 600);
    return () => {
      clearTimeout(t);
      if (lenis) { lenis.options.infinite = false; lenis.options.syncTouch = false; lenis.off('scroll', onScroll); }
      ctx.revert();
    };
  }, []);

  // End lands on Contact and Home on the first screen, never on the clone.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input,textarea,[contenteditable]')) return;
      if (e.key === 'End') { e.preventDefault(); scrollToId('contact'); }
      else if (e.key === 'Home') { e.preventDefault(); scrollToId('top'); }
      else if (e.key === 'Escape') setSheet(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // The index follows the reader.
  useEffect(() => {
    const secs = [...root.current!.querySelectorAll<HTMLElement>('[data-sec]')];
    const io = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) setCur((e.target as HTMLElement).dataset.sec!);
    }, { rootMargin: '-48% 0px -48% 0px' });
    secs.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSheet(false);
    scrollToId(id);
  };

  return (
    <div className="v-loop" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>

      <button type="button" className={`lp-toggle${tucked && !sheet ? ' is-tucked' : ''}`} onFocus={() => setTucked(false)} aria-expanded={sheet} aria-controls="lp-rail" aria-label={sheet ? 'Close the index' : 'Open the index'} onClick={() => setSheet((s) => !s)}>
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path d="M24 8a16 16 0 1 1 -15.2 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M5 13.5 8.8 19.4 14.6 15.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {sheet ? <path d="M19 19 29 29M29 19 19 29" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /> : <text x="24" y="29.5" textAnchor="middle" className="lp-toggle-n">{lap}</text>}
        </svg>
      </button>

      <aside className={`lp-rail${sheet ? ' is-open' : ''}`} id="lp-rail">
        <nav aria-label="Sections">
          <ol className="lp-index">
            {INDEX.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} aria-current={cur === s.id ? 'true' : undefined} onClick={go(s.id)}>{s.label}</a>
              </li>
            ))}
          </ol>
        </nav>
        <p className="lp-lap" aria-hidden="true">{still ? 'one lap' : <>lap <b>{lap}</b></>}</p>
      </aside>

      <main id="main" className="lp-main">
        <section className="lp-open" id="top" data-sec="top" aria-label="Armaan Seth">
          <Opening />
        </section>

        <section className="lp-sec lp-about" id="about" aria-labelledby="about-h" data-sec="about">
          <h2 className="lp-h" id="about-h">About</h2>
          <div className="lp-about-cols">
            {PERSON.about.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <p className="lp-aside">{PERSON.aside}</p>
          <figure className="lp-bleed">
            <img src={BASE + WORK[0].img} alt="The MITEZ website" width={1200} height={660} loading="lazy" />
          </figure>
          <div className="lp-bleed-copy">
            <h3 className="lp-title">{mitez.title}</h3>
            <p>{mitez.body}</p>
            <a className="lp-go" href={WORK[0].href!} {...ext(WORK[0].href!)}>mitez.org</a>
          </div>
        </section>

        <section className="lp-sec lp-debate" id="debate" aria-labelledby="debate-h" data-sec="debate">
          <h2 className="lp-h" id="debate-h">Debate</h2>
          <ol className="lp-titles">
            {DEBATE.wins.map((w) => (
              <li key={w.where}>
                <span className="lp-t-title">{w.title}</span>
                <span className="lp-t-event">{w.event}</span>
                <span className="lp-t-where">{w.where}, {w.when}</span>
              </li>
            ))}
          </ol>
          <div className="lp-upnext">
            <h3 className="lp-sub lp-amber">Up next</h3>
            <ul>
              {DEBATE.next.map((n) => (
                <li key={n.where}><span className="lp-un-where">{n.where}</span> <span className="lp-un-event">{n.event}</span></li>
              ))}
            </ul>
          </div>
          <div className="lp-team">
            <figure className="lp-bleed">
              <img src={BASE + WORK[1].img} alt="The Skeptical team website" width={1200} height={660} loading="lazy" />
            </figure>
            <div className="lp-bleed-copy">
              <h3 className="lp-title">{DEBATE.team.name}</h3>
              <p className="lp-role">{DEBATE.team.role}</p>
              <p>{DEBATE.team.line}</p>
              <p className="lp-record">{DEBATE.team.record}</p>
              <a className="lp-go" href={DEBATE.team.href} {...ext(DEBATE.team.href)}>skeptical.pages.dev</a>
            </div>
          </div>
        </section>

        <section className="lp-sec lp-research" id="research" aria-labelledby="research-h" data-sec="research">
          <h2 className="lp-h" id="research-h">Research</h2>
          <p className="lp-status">{paper.status}, {paper.pages} pages</p>
          <h3 className="lp-paper">{paper.title}</h3>
          <div className="lp-read">
            <p className="lp-abstract">{paper.abstract}</p>
            <blockquote className="lp-epi">
              <p>{paper.epigraph!.text}</p>
              <cite>{paper.epigraph!.source}</cite>
            </blockquote>
            <p className="lp-keys"><span className="lp-sub-in">Keywords</span> {paper.keywords!.join(', ')}</p>
            <ul className="lp-plinks">
              {paper.links.map((l) => <li key={l.label}><a href={l.href} {...ext(l.href)}>{l.label}</a></li>)}
            </ul>
          </div>
          <div className="lp-wess">
            <h3 className="lp-title-s">{wess.title}</h3>
            <p className="lp-status">{wess.status}</p>
            <p>{wess.abstract}</p>
          </div>
        </section>

        <section className="lp-work" id="work" aria-labelledby="work-h" data-sec="work">
          <div className="lp-sec lp-work-head">
            <h2 className="lp-h" id="work-h">Work</h2>
          </div>
          <ol className="lp-pages">
            {WORK.map((w) => (
              <li className="lp-page" key={w.slug}>
                <div className="lp-shot-frame">
                  <img className="lp-shot" src={BASE + w.img} alt={`The ${w.name} project`} width={1200} height={700} loading="lazy" />
                </div>
                <div className="lp-page-copy">
                  <h3 className="lp-page-name">{w.name}</h3>
                  <div className="lp-page-text">
                    <p className="lp-page-kind">{w.kind}</p>
                    <p>{w.line}</p>
                    <p className="lp-page-stack">{w.stack}</p>
                    {w.href ? <a className="lp-go" href={w.href} {...ext(w.href)}>Open {w.name}</a> : <p className="lp-page-stack">No public link</p>}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <Today />
        <GitHubSec />

        <section className="lp-sec lp-now" id="now" aria-labelledby="now-h" data-sec="now">
          <h2 className="lp-h" id="now-h">Now</h2>
          <p className="lp-status-big">{NOW.status}</p>
          <div className="lp-now-cols">
            <div>
              <h3 className="lp-title-s">{NOW.reading.title}</h3>
              <p>{NOW.reading.body}</p>
              <ul className="lp-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <h3 className="lp-title-s">{NOW.club.title}</h3>
              <p>{NOW.club.body}</p>
            </div>
          </div>
        </section>

        <section className="lp-sec lp-record" id="record" aria-labelledby="record-h" data-sec="record">
          <h2 className="lp-h" id="record-h">Record</h2>
          <p className="lp-stats">
            {STATS.map((s) => (
              <span key={s.label}><b>{s.to}{s.suffix}</b> {s.label}</span>
            ))}
          </p>
          <ol className="lp-honors">
            {HONORS.map((h) => (
              <li key={h.what}><span className="lp-h-what">{h.what}</span><span className="lp-h-detail">{h.detail}</span></li>
            ))}
          </ol>
          <div className="lp-awards">
            {AWARDS.map((a) => (
              <a key={a.site} href={a.href} {...ext(a.href)} className="lp-award">
                <img src={BASE + a.img} alt={`WD Awards certificate for ${a.site}`} width={720} height={1018} loading="lazy" />
                <span className="lp-award-site">{a.site}</span>
                <span className="lp-award-note">{a.note}</span>
              </a>
            ))}
          </div>
        </section>

        <section className="lp-sec lp-off" id="off" aria-labelledby="off-h" data-sec="off">
          <h2 className="lp-h" id="off-h">Off the record</h2>
          <div className="lp-off-cols">
            <div><h3 className="lp-sub">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="lp-sub">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="lp-sub">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="lp-sub">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider}, {c.title}.</b> {c.note}</li>)}</ul></div>
          </div>
        </section>

        <section className="lp-sec lp-contact" id="contact" aria-labelledby="contact-h" data-sec="contact">
          <h2 className="lp-h" id="contact-h">Contact</h2>
          <ul className="lp-links">
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="lp-l-label">{l.label}</span>
                {l.href ? <a className="lp-l-value" href={l.href} {...ext(l.href)}>{brk(l.value)}</a> : <span className="lp-l-value">{l.value}</span>}
              </li>
            ))}
          </ul>
        </section>

        <footer className="lp-foot">
          <p>Draft 83 of the portfolio. Not the live site.</p>
          <p>Loop scrolling after Codrops LoopScrolling (MIT).</p>
          {still ? (
            <a className="lp-back" href="#top" onClick={go('top')}>Back to the start</a>
          ) : (
            <p className="lp-keep">Keep going. It starts again.</p>
          )}
        </footer>

        {!still && (
          <div className="lp-open lp-clone" aria-hidden="true" inert data-sec="top">
            <Opening clone />
          </div>
        )}
      </main>
    </div>
  );
}
