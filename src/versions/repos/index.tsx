// Draft 97, The repos. Built on React Bits InfiniteMenu (MIT + Commons Clause): his GitHub repositories and the
// things he built as a sphere of printed discs you spin by hand; the column reads the disc at rest, and scrolling
// the page turns the sphere to the disc of whatever you are reading.
import { useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource-variable/schibsted-grotesk/index.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import './repos.css';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { formatDate, useNotes } from '@/lib/notes';
import { ScrollTrigger } from '@/lib/scroll';
import { still } from '@/lib/utils';
import Sphere, { type Disc, type SphereHandle } from './Sphere';
import { MONO, SANS, contactFace, paperFace, repoFace, todayFace, workFace } from './faces';

const BASE = import.meta.env.BASE_URL;
const PAPER = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; doi: string; pages: number; epigraph: { text: string; source: string } };
const WESSO = RESEARCH[1]!;
const GH_LINK = LINKS.find((l) => l.label === 'GitHub')!;
const MAIL = LINKS[0];
const DIMS: Record<string, [number, number]> = {
  mitez: [1200, 660], skeptical: [1200, 660], lastseen: [1200, 670], lastsearch: [1200, 692],
  spread: [1200, 660], rogue: [1200, 662], jarvis: [1200, 852], drafts: [1200, 766],
};

const FOCUS: Record<string, [number, number, number]> = { mitez: [0.5, 0.49, 4.6], spread: [0.1, 0.17, 3] };

type Link = { label: string; href: string };
type Entry = { key: string; title: string; line: string; meta: string[]; links: Link[] };

function hasWebGL() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}

function useWide() {
  const q = '(min-width: 1000px)';
  const [w, setW] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setW(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return w;
}

/** Canvas faces need the real fonts, so the discs wait for them (never longer than 2.5s). */
function useFonts() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    const t = window.setTimeout(() => live && setReady(true), 2500);
    Promise.all([`800 40px ${SANS}`, `700 40px ${SANS}`, `500 40px ${SANS}`, `500 40px ${MONO}`].map((f) => document.fonts.load(f).catch(() => null)))
      .then(() => document.fonts.ready)
      .then(() => live && setReady(true));
    return () => { live = false; window.clearTimeout(t); };
  }, []);
  return ready;
}

const host = (href: string) => href.replace(/^https?:\/\//, '').replace(/\/$/, '');

export default function Repos() {
  useVersion('repos');
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const fonts = useFonts();
  const wide = useWide();
  const [gl] = useState(hasWebGL);
  const flat = still || !gl;
  const sphere = useRef<SphereHandle>(null);
  const [past, setPast] = useState(false);
  const [open, setOpen] = useState(false);
  const latest = notes[0];

  // The repositories on the sphere: skeptical first (it is the team), at most eight.
  const repos = useMemo(() => {
    const list = [...gh.repos];
    const i = list.findIndex((r) => r.name === 'skeptical');
    if (i > 0) list.unshift(...list.splice(i, 1));
    return list.slice(0, 8);
  }, [gh.repos]);
  const newest = (name: string) => gh.activity.find((a) => a.repo === name);

  const entries = useMemo<Entry[]>(() => {
    const now = new Date();
    const r: Entry[] = repos.map((repo) => {
      const c = newest(repo.name);
      const meta = [repo.language ?? '', c ? `Last commit ${ago(c.at)}` : repo.pushedAt ? `Last push ${ago(repo.pushedAt)}` : ''].filter(Boolean);
      return { key: 'repo:' + repo.name, title: repo.name, line: repo.description ?? (c ? c.message : ''), meta, links: [{ label: 'Open on GitHub', href: repo.href }] };
    });
    const w: Entry[] = WORK.map((x) => ({ key: 'work:' + x.slug, title: x.name, line: x.line, meta: [x.kind, x.stack], links: x.href ? [{ label: 'Visit ' + host(x.href), href: x.href }] : [] }));
    const extra: Entry[] = [
      { key: 'today', title: 'Today', line: latest ? latest.body[0] : '', meta: [latest ? 'Note of ' + formatDate(latest.date) : now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })], links: [{ label: 'Read the note', href: '#today' }] },
      { key: 'paper', title: PAPER.short, line: PAPER.abstract.split('?')[0] + '?', meta: [PAPER.status, 'DOI ' + PAPER.doi], links: [{ label: 'Read the paper', href: PAPER.links[0].href }] },
      { key: 'contact', title: 'Contact', line: 'Write, or read the code.', meta: [], links: [{ label: GH_LINK.value, href: GH_LINK.href }, { label: MAIL.value, href: MAIL.href! }] },
    ];
    // Repositories and projects alternate, the three printed discs fall between them.
    const out: Entry[] = [];
    const n = Math.max(r.length, w.length);
    for (let i = 0; i < n; i++) {
      if (r[i]) out.push(r[i]);
      if (w[i]) out.push(w[i]);
      if (i === 1) out.push(extra[0]);
      if (i === 3) out.push(extra[1]);
      if (i === 5) out.push(extra[2]);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repos, gh.activity, latest]);
  const byKey = useMemo(() => new Map(entries.map((e) => [e.key, e])), [entries]);

  const discs = useMemo<Disc[]>(() => {
    const now = new Date();
    return entries.map((e) => {
      if (e.key.startsWith('repo:')) {
        const repo = repos.find((x) => 'repo:' + x.name === e.key)!;
        const c = newest(repo.name);
        return { key: e.key, paint: repoFace({ name: repo.name, language: repo.language, note: c ? c.message : repo.description, when: c ? ago(c.at) : repo.pushedAt ? ago(repo.pushedAt) : null }) };
      }
      if (e.key.startsWith('work:')) {
        const x = WORK.find((y) => 'work:' + y.slug === e.key)!;
        return { key: e.key, paint: workFace({ src: BASE + x.img, name: x.name, kind: x.kind, focus: FOCUS[x.slug] }) };
      }
      if (e.key === 'today')
        return { key: e.key, paint: todayFace({ day: String(now.getDate()), month: now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), latest: latest ? 'Latest note ' + formatDate(latest.date, { day: 'numeric', month: 'short' }) : null }) };
      if (e.key === 'paper') return { key: e.key, paint: paperFace({ title: PAPER.short, status: PAPER.status, doi: PAPER.doi }) };
      return { key: e.key, paint: contactFace({ github: GH_LINK.value, email: MAIL.value }) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  const [rest, setRest] = useState('repo:skeptical');
  const [workRest, setWorkRest] = useState('work:mitez');
  const [moving, setMoving] = useState(false);
  const shown = byKey.get(rest) ?? entries[0];
  const shownWork = byKey.get(workRest) ?? entries[1];

  const go = (key: string) => {
    if (flat) setRest(key);
    else sphere.current?.rotateTo(key);
  };

  // Each section names its disc; reaching it turns the sphere there. Only where the sphere is pinned.
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!wide) return;
    const els = [...(root.current?.querySelectorAll<HTMLElement>('[data-disc]') ?? [])];
    const st = els.map((el) => {
      const key = el.dataset.disc!;
      const fire = () => (el.dataset.release && !flat ? sphere.current?.release(key) : go(key));
      return ScrollTrigger.create({ trigger: el, start: 'top 55%', end: 'bottom 55%', onEnter: fire, onEnterBack: fire });
    });
    const hero = ScrollTrigger.create({ trigger: '#top', start: 'top top', end: 'bottom 40%', onLeave: () => setPast(true), onEnterBack: () => setPast(false) });
    return () => { st.forEach((s) => s.kill()); hero.kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wide, flat, fonts]);
  useEffect(() => { const t = setTimeout(() => ScrollTrigger.refresh(), 200); return () => clearTimeout(t); }, [loaded, open, gh.live]);

  const restBlock = (e: Entry | undefined, big: boolean) =>
    e && (
      <div className={big ? 'rest' : 'rest rest-s'} data-moving={moving || undefined}>
        <p className="rest-name">{e.title}.</p>
        {e.line && <p className="rest-line">{e.line}</p>}
        {e.meta.length > 0 && <p className="rest-meta">{e.meta.join('. ')}.</p>}
        {e.links.length > 0 && (
          <p className="rest-links">
            {e.links.map((l) => (
              <a key={l.href} href={l.href} {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>{l.label}</a>
            ))}
          </p>
        )}
      </div>
    );

  const flatGrid = (active: string, pick: (k: string) => void) => (
    <ul className="flat" aria-label="Every disc">
      {entries.map((e) => {
        const w = e.key.startsWith('work:') ? WORK.find((x) => 'work:' + x.slug === e.key) : null;
        return (
          <li key={e.key}>
            <button type="button" className="fd" aria-pressed={active === e.key} onClick={() => pick(e.key)} data-img={w ? '' : undefined}>
              {w && <img src={BASE + w.img} alt="" loading="lazy" />}
              <span>{e.title}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  const drag = wide ? 'Drag the sphere. It settles on one disc, and this column reads it.' : 'Swipe across the sphere to spin it.';
  const ready = fonts && discs.length > 0;
  const heroSphere = ready && (
    <Sphere ref={sphere} discs={discs} label="Sphere of repositories and projects; arrow keys turn it" onRest={setRest} onMoving={setMoving} className={wide ? 'sph-wide' : 'sph-band'} zoom={wide ? 1.18 : 1.5} />
  );

  return (
    <div className="v-repos" ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <div className="pg">
        <main id="main" className="col">
          <header id="top" className="hero" data-disc="repo:skeptical">
            {!wide && <div className="band">{flat ? flatGrid(rest, setRest) : heroSphere}</div>}
            <nav className="nav" aria-label="Sections">
              {[['debate', 'Debate'], ['research', 'Research'], ['work', 'Work'], ['github', 'GitHub'], ['today', 'Today'], ['contact', 'Contact']].map(([id, l]) => (
                <a key={id} href={'#' + id}>{l}</a>
              ))}
            </nav>
            <h1 className="name">{PERSON.name}</h1>
            <p className="who">{PERSON.line}</p>
            {restBlock(shown, true)}
            <p className="hint">{flat ? 'Pick a disc and this column reads it.' : drag}</p>
          </header>

          <section id="about" className="sec about" data-disc="work:mitez" aria-labelledby="h-about">
            <h2 id="h-about">About</h2>
            {PERSON.about.map((p) => <p key={p.slice(0, 12)} className="lead">{p}</p>)}
            <p className="aside">{PERSON.aside}</p>
          </section>

          <section id="debate" className="sec debate" data-disc="repo:skeptical" aria-labelledby="h-debate">
            <h2 id="h-debate">Two championships</h2>
            <ol className="wins">
              {DEBATE.wins.map((w) => (
                <li key={w.where}>
                  <p className="win-t">{w.title}, {w.event}</p>
                  <p className="win-w">{w.where}</p>
                  <p className="win-y">{w.when}</p>
                </li>
              ))}
            </ol>
            <div className="team">
              <h3>{DEBATE.team.name}</h3>
              <p className="role">{DEBATE.team.role}</p>
              <p>{DEBATE.team.line}</p>
              <p className="rec">{DEBATE.team.record}</p>
              <p className="go"><a href={DEBATE.team.href} target="_blank" rel="noreferrer">{host(DEBATE.team.href)}</a><a href={DEBATE.team.github} target="_blank" rel="noreferrer">The repository</a></p>
            </div>
            <div className="next">
              <h3>Up next</h3>
              <ul>
                {DEBATE.next.map((n) => <li key={n.where}><span className="nx-w">{n.where}</span><span className="nx-e">{n.event}</span></li>)}
              </ul>
            </div>
          </section>

          <section id="today" className="sec today" data-disc="today" aria-labelledby="h-today">
            <h2 id="h-today">Today</h2>
            {!loaded && <p className="t-date">Opening today’s note.</p>}
            {loaded && !latest && <p className="t-date">No note yet.</p>}
            {latest && (
              <article className="t-note">
                <p className="t-date"><time dateTime={latest.date}>{formatDate(latest.date)}</time></p>
                {latest.body.map((p) => <p key={p.slice(0, 16)} className="t-body">{p}</p>)}
              </article>
            )}
            {notes.length > 1 && (
              <div className="earlier">
                <button type="button" aria-expanded={open} aria-controls="earlier" onClick={() => setOpen((o) => !o)}>
                  {open ? 'Close the earlier notes' : `Earlier notes, ${notes.length - 1}`}
                </button>
                {open && (
                  <ol id="earlier">
                    {notes.slice(1).map((n) => (
                      <li key={n.date}><time dateTime={n.date}>{formatDate(n.date)}</time>{n.body.map((p) => <p key={p.slice(0, 16)}>{p}</p>)}</li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </section>

          <section id="research" className="sec research" data-disc="paper" aria-labelledby="h-research">
            <h2 id="h-research">Research</h2>
            <p className="r-status">{PAPER.status}, {PAPER.pages} pages</p>
            <h3 className="r-title">{PAPER.title}</h3>
            <p className="lead">{PAPER.abstract}</p>
            <p className="r-keys"><span className="sr-only-x">Keywords: </span>{PAPER.keywords.join(' / ')}</p>
            <ul className="r-links">
              {PAPER.links.map((l) => <li key={l.href}><a href={l.href} target="_blank" rel="noreferrer">{l.label}</a></li>)}
            </ul>
            <blockquote className="r-epi"><p>{PAPER.epigraph.text}</p><cite>{PAPER.epigraph.source}</cite></blockquote>
            <div className="wesso">
              <h3>{WESSO.title}</h3>
              <p className="r-status">{WESSO.status}</p>
              <p>{WESSO.abstract}</p>
            </div>
          </section>

          <section id="work" className="sec work" aria-labelledby="h-work">
            <h2 id="h-work">Work</h2>
            <p className="w-intro">Eight things he built. Each one turns the sphere to its disc as you reach it.</p>
            {!wide && (
              <div className="band band-w">
                {flat ? flatGrid(workRest, setWorkRest) : ready && <Sphere discs={discs} label="Second view of the sphere" onRest={setWorkRest} className="sph-band" zoom={1.5} start="work:mitez" />}
                {restBlock(shownWork, false)}
              </div>
            )}
            {WORK.map((w) => (
              <article key={w.slug} className="wk" data-disc={'work:' + w.slug} aria-labelledby={'w-' + w.slug}>
                <img src={BASE + w.img} alt={`${w.name}, a screenshot`} width={DIMS[w.slug][0]} height={DIMS[w.slug][1]} loading="lazy" />
                <h3 id={'w-' + w.slug}>{w.name}</h3>
                <p className="wk-k">{w.kind}. {w.stack}.</p>
                <p className="wk-l">{w.line}</p>
                {w.href ? <a className="wk-a" href={w.href} target="_blank" rel="noreferrer">Visit {host(w.href)}</a> : <p className="wk-n">No public link.</p>}
              </article>
            ))}
          </section>

          <section id="github" className="sec github" data-disc={'repo:' + (repos[0]?.name ?? 'skeptical')} aria-labelledby="h-gh">
            <h2 id="h-gh">Live from GitHub</h2>
            <p className="gh-src">{gh.live ? 'Read from GitHub as this page opened.' : 'As listed on GitHub.'} Point at a repository and the sphere turns to it.</p>
            {gh.activity.length > 0 && (
              <ol className="commits" aria-label="Recent commits">
                {gh.activity.map((a) => (
                  <li key={a.href}>
                    <a href={a.href} target="_blank" rel="noreferrer">{a.message}</a>
                    <span className="c-r">{a.repo}</span>
                    <span className="c-t">{ago(a.at)}</span>
                  </li>
                ))}
              </ol>
            )}
            <ul className="repos">
              {gh.repos.map((r) => (
                <li key={r.name} onPointerEnter={() => go('repo:' + r.name)} onFocus={() => go('repo:' + r.name)}>
                  <a href={r.href} target="_blank" rel="noreferrer" className="rp-n">{r.name}</a>
                  {r.description && <p className="rp-d">{r.description}</p>}
                  <p className="rp-m">{r.language && <span className="dot">{r.language}</span>}{r.pushedAt && <span>pushed {ago(r.pushedAt)}</span>}</p>
                </li>
              ))}
            </ul>
            <a className="gh-all" href={GITHUB.href} target="_blank" rel="noreferrer">Everything on github.com/{GITHUB.user}</a>
          </section>

          <section id="now" className="sec now" aria-labelledby="h-now">
            <h2 id="h-now">Now</h2>
            <p className="lead">{NOW.status}</p>
            <div className="now-g">
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

          <section id="record" className="sec record" aria-labelledby="h-rec">
            <h2 id="h-rec">Record</h2>
            <ul className="honors">
              {HONORS.map((h) => <li key={h.what}><span className="h-w">{h.what}</span><span className="h-d">{h.detail}</span></li>)}
            </ul>
            <div className="certs">
              {AWARDS.map((a) => (
                <a key={a.href} href={a.href} target="_blank" rel="noreferrer" className="cert">
                  <img src={BASE + a.img} alt={`Certificate, ${a.site}`} loading="lazy" width={600} height={848} />
                  <span className="cert-s">{a.site}</span>
                  <span className="cert-n">{a.note}</span>
                </a>
              ))}
            </div>
          </section>

          <section id="off" className="sec off" aria-labelledby="h-off">
            <h2 id="h-off">Off the record</h2>
            <div className="off-g">
              <div><h3>Likes</h3><ul>{LIKES.map((l) => <li key={l}>{l}</li>)}</ul></div>
              <div><h3>Dislikes</h3><ul>{DISLIKES.map((l) => <li key={l}>{l}</li>)}</ul></div>
              <div><h3>Favourites</h3><ul>{FAVOURITES.map((l) => <li key={l}>{l}</li>)}</ul></div>
              <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}>{c.provider} {c.title}: {c.note}</li>)}</ul></div>
            </div>
          </section>

          <section id="contact" className="sec contact" data-disc="contact" data-release="1" aria-labelledby="h-contact">
            <h2 id="h-contact">Contact</h2>
            <ul className="links">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <span className="l-l">{l.label}</span>
                  {l.href ? <a href={l.href} {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>{l.value}</a> : <span className="l-v">{l.value}</span>}
                </li>
              ))}
            </ul>
            {wide && !flat && <button type="button" className="again" onClick={() => sphere.current?.release('contact')}>Spin it once more</button>}
          </section>
        </main>

        {wide && (
          <aside className="side" aria-label="The sphere">
            <div className="stage">
              {flat ? flatGrid(rest, setRest) : heroSphere}
              <div className="cap">
                {past && shown && (
                  <p><span className="cap-t">{shown.title}</span>{shown.links[0] && <a href={shown.links[0].href} {...(shown.links[0].href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>{shown.links[0].label}</a>}</p>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
      <footer className="foot">
        <p>Draft 97 of the portfolio. Not the live site.</p>
        <p>The sphere is built on InfiniteMenu from React Bits.</p>
        <a href="#top">Back to the top</a>
      </footer>
    </div>
  );
}
