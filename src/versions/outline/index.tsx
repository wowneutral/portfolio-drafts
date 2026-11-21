// Draft 92: the outline. His life set as a debater's speech doc: pockets, hats, blocks and tags,
// with the outline (after React Bits LineSidebar) always at the left. "Tags only" folds the file to its tags with GSAP Flip.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import './outline.css';
import { PERSON, CHAPTERS, DEBATE, RESEARCH, WORK, HONORS, AWARDS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate, type Note } from '@/lib/notes';
import { gsap, getLenis } from '@/lib/scroll';
import { Flip } from 'gsap/Flip';
import { still, cn } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import Outline, { type Entry } from './Outline';

gsap.registerPlugin(Flip);
const BASE = import.meta.env.BASE_URL;
const PAPER = RESEARCH[0] as (typeof RESEARCH)[0] & { epigraph: { text: string; source: string }; keywords: string[] };
const WESS = RESEARCH[1];

// First sentence of a passage, and the rest. Used to set a tag above its body.
function split(s: string): [string, string] {
  const m = s.match(/^(.+?[.?!])\s+(.+)$/);
  return m ? [m[1], m[2]] : [s, ''];
}
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/\/$/, '');

type Doc = { tags: boolean; open: Set<string>; press: (id: string) => void };
const DocCtx = createContext<Doc>({ tags: false, open: new Set(), press: () => {} });
const PCtx = createContext({ p: '', h: '' });

function Pocket({ id, label, children, top }: { id: string; label: string; children: React.ReactNode; top?: boolean }) {
  const H = top ? 'h1' : 'h2';
  return (
    <PCtx.Provider value={{ p: id, h: '' }}>
      <section className={cn('ol-pk', `ol-pk-${id}`)} aria-labelledby={id}>
        <H id={id} className="ol-pocket" data-ol data-p={id}><span className="ol-pf">{label}</span></H>
        {children}
      </section>
    </PCtx.Provider>
  );
}

function Hat({ id, label, children, className }: { id: string; label: React.ReactNode; children: React.ReactNode; className?: string }) {
  const { p } = useContext(PCtx);
  return (
    <PCtx.Provider value={{ p, h: id }}>
      <section className={cn('ol-ht', className)} aria-labelledby={id}>
        <h3 id={id} className="ol-hat" data-ol data-p={p} data-h={id}>{label}</h3>
        {children}
      </section>
    </PCtx.Provider>
  );
}

function Block({ id, label, aside, children, className }: { id: string; label: React.ReactNode; aside?: string; children: React.ReactNode; className?: string }) {
  const { p, h } = useContext(PCtx);
  return (
    <div className={cn('ol-bk', className)}>
      <h4 id={id} className="ol-block" data-ol data-p={p} data-h={h} data-b={id}>
        {label}{aside && <span className="ol-bk-aside">{aside}</span>}
      </h4>
      {children}
    </div>
  );
}

function Tag({ id, lv, text, children, big, keep }: { id: string; lv: 3 | 4 | 5; text: React.ReactNode; children?: React.ReactNode; big?: boolean; keep?: boolean }) {
  const { tags, open, press } = useContext(DocCtx);
  const H = `h${lv}` as 'h3' | 'h4' | 'h5';
  const on = open.has(id);
  return (
    <div className={cn('ol-card', on && 'is-open', big && 'is-big', keep && 'is-keep')}>
      <H className="ol-tag" data-tag={id}>
        {tags && children ? (
          <button type="button" className="ol-tb" aria-expanded={on} onClick={() => press(id)}>{text}</button>
        ) : text}
      </H>
      {children && <div className="ol-body">{children}</div>}
    </div>
  );
}

const Out = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
  <a className={cn('ol-a', className)} href={href} rel="noopener">{children}</a>
);

export default function OutlinePage() {
  const phone = typeof window !== 'undefined' && window.innerWidth < 1000;
  useVersion('outline', { anchorOffset: phone ? -76 : -28 });
  const { notes, loaded } = useNotes();
  const gh = useGitHub();
  const [tags, setTags] = useState(false);
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [path, setPath] = useState<string[]>(['armaan']);
  const [done, setDone] = useState(false);
  const [sheet, setSheet] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  const latest: Note | undefined = notes[0];
  const earlier = notes.slice(1, 7);
  const commits = gh.activity.slice(0, 5);
  const repos = gh.repos.slice(0, 6);

  // The outline itself: pockets, their hats, the hats' blocks. Ids match the headings below.
  const tree: Entry[] = useMemo(() => [
    { id: 'armaan', label: PERSON.name },
    { id: 'today', label: 'Today', kids: [
      { id: 'today-latest', label: latest ? formatDate(latest.date) : 'The latest' },
      ...(earlier.length ? [{ id: 'today-earlier', label: 'Earlier notes', kids: earlier.map((n) => ({ id: `note-${n.date}`, label: formatDate(n.date, { day: 'numeric', month: 'long' }) })) }] : []),
    ] },
    { id: 'debate', label: 'Debate', kids: [
      { id: 'debate-titles', label: CHAPTERS[1].title, kids: [
        ...DEBATE.wins.map((w, i) => ({ id: `win-${i}`, label: w.where })),
        { id: 'debate-season', label: 'The season' },
      ] },
    ] },
    { id: 'coaching', label: 'Coaching', kids: [
      { id: 'coach-skeptical', label: DEBATE.team.name, kids: [{ id: 'coach-role', label: DEBATE.team.role }, { id: 'coach-record', label: 'The record' }] },
    ] },
    { id: 'research', label: 'Research', kids: [
      { id: 'res-paper', label: PAPER.short, kids: [{ id: 'res-abstract', label: 'Abstract' }, { id: 'res-keywords', label: 'Keywords' }, { id: 'res-read', label: 'Where to read it' }] },
      { id: 'res-wess', label: WESS.short },
    ] },
    { id: 'building', label: 'Building', kids: [
      { id: 'build-shipped', label: CHAPTERS[4].title, kids: WORK.map((w) => ({ id: `w-${w.slug}`, label: w.name })) },
      { id: 'build-github', label: 'Live from GitHub', kids: [
        ...(commits.length ? [{ id: 'gh-commits', label: 'Recent commits' }] : []),
        ...repos.map((r) => ({ id: `r-${r.name}`, label: r.name })),
      ] },
    ] },
    { id: 'now', label: 'Now', kids: [
      { id: 'now-reading', label: NOW.reading.title }, { id: 'now-club', label: NOW.club.title }, { id: 'now-status', label: 'Right now' },
    ] },
    { id: 'record', label: 'Record', kids: [{ id: 'rec-honors', label: 'Honors' }, { id: 'rec-awards', label: 'Awards' }] },
    { id: 'off', label: 'Off the record', kids: [
      { id: 'off-likes', label: 'Likes' }, { id: 'off-dislikes', label: 'Dislikes' }, { id: 'off-favs', label: 'Favourites' }, { id: 'off-courses', label: 'Courses' },
    ] },
    { id: 'next', label: 'Up next', kids: DEBATE.next.map((n, i) => ({ id: `next-${i}`, label: n.where })) },
    { id: 'contact', label: 'Contact' },
  ], [latest, earlier.map((n) => n.date).join(), commits.length, repos.map((r) => r.name).join()]); // eslint-disable-line react-hooks/exhaustive-deps

  // Which heading the reader is under: the last one past a line a quarter down the screen.
  const track = useCallback(() => {
    const hs = root.current?.querySelectorAll<HTMLElement>('[data-ol]');
    if (!hs) return;
    const line = window.innerHeight * 0.28;
    let at: HTMLElement | null = null;
    for (const h of hs) {
      if (!h.offsetParent) continue;
      if (h.getBoundingClientRect().top <= line) at = h; else break;
    }
    const d = at?.dataset;
    const next = d ? [d.p!, d.h, d.b].filter(Boolean) as string[] : ['armaan'];
    setPath((old) => (old.join('|') === next.join('|') ? old : next));
    const end = document.documentElement.scrollHeight - window.innerHeight - window.scrollY < 40;
    setDone(end || d?.p === 'contact');
  }, []);

  useEffect(() => {
    const hs = root.current?.querySelectorAll('[data-ol]');
    if (!hs) return;
    const io = new IntersectionObserver(track, { rootMargin: '0px 0px -72% 0px', threshold: [0, 1] });
    hs.forEach((h) => io.observe(h));
    const foot = root.current?.querySelector('.ol-foot');
    if (foot) io.observe(foot);
    let f = 0;
    const onScroll = () => { if (!f) f = requestAnimationFrame(() => { f = 0; track(); }); };
    window.addEventListener('scroll', onScroll, { passive: true });
    track();
    return () => { io.disconnect(); window.removeEventListener('scroll', onScroll); cancelAnimationFrame(f); };
  }, [track, tree, tags]);

  // Fold or unfold the file, keeping the reader's place: the tag nearest the top of the screen stays put.
  const flipTo = useCallback((change: () => void) => {
    const el = root.current; if (!el) return;
    const targets = [...el.querySelectorAll<HTMLElement>('.ol-tag, .ol-pf')].filter((t) => t.offsetParent);
    let anchor: HTMLElement | null = null; let best = Infinity;
    for (const t of targets) {
      const top = t.getBoundingClientRect().top;
      const d = Math.abs(top - window.innerHeight * 0.2);
      if (top > -40 && d < best) { best = d; anchor = t; }
    }
    const a0 = anchor?.getBoundingClientRect().top ?? 0;
    const state = still ? null : Flip.getState(targets);
    flushSync(change);
    const lenis = getLenis();
    lenis?.resize();
    if (anchor && anchor.offsetParent) {
      const y = Math.max(0, window.scrollY + anchor.getBoundingClientRect().top - a0);
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
      window.scrollTo(0, y);
    }
    if (state) {
      const tg = targets.filter((t) => t.offsetParent);
      Flip.from(state, { targets: tg.filter((t) => t.classList.contains('ol-tag')), duration: 0.85, ease: 'expo.inOut', simple: true });
      Flip.from(state, { targets: tg.filter((t) => t.classList.contains('ol-pf')), duration: 0.85, ease: 'expo.inOut', scale: true, simple: true });
    }
    requestAnimationFrame(track);
  }, [track]);

  const setMode = useCallback((t: boolean) => {
    flipTo(() => { setTags(t); setOpen(new Set()); });
  }, [flipTo]);
  const press = useCallback((id: string) => {
    flipTo(() => setOpen((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; }));
  }, [flipTo]);

  // Phone sheet: Escape closes, focus moves in and back.
  const sheetRef = useRef<HTMLDivElement>(null);
  const barBtn = useRef<HTMLButtonElement>(null);
  const jumped = useRef(false);
  const jump = () => { jumped.current = true; getLenis()?.start(); setSheet(false); };
  useEffect(() => {
    if (!sheet) return;
    getLenis()?.stop();
    sheetRef.current?.querySelector<HTMLElement>('button, a')?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSheet(false);
      if (e.key !== 'Tab' || !sheetRef.current) return;
      const f = [...sheetRef.current.querySelectorAll<HTMLElement>('button, a[href]')];
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('keydown', key); getLenis()?.start();
      if (!jumped.current) barBtn.current?.focus({ preventScroll: true });
      jumped.current = false;
    };
  }, [sheet]);

  const pocket = tree.find((p) => p.id === path[0]);
  const hat = pocket?.kids?.find((h) => h.id === path[1]);
  const doc = useMemo(() => ({ tags, open, press }), [tags, open, press]);

  const toggle = (
    <div className="ol-mode" role="group" aria-label="View">
      <button type="button" aria-pressed={!tags} onClick={() => tags && setMode(false)}>Full text</button>
      <button type="button" aria-pressed={tags} onClick={() => !tags && setMode(true)}>Tags only</button>
    </div>
  );

  return (
    <div ref={root} className={cn('v-outline', tags && 'is-tags')}>
      <a className="skip-x" href="#main">Skip to the file</a>

      <nav className="ol-nav" aria-label="Outline">
        {toggle}
        <Outline tree={tags ? tree.map((p) => ({ id: p.id, label: p.label })) : tree} path={path} done={done} sweep />
      </nav>

      <header className="ol-bar">
        <button ref={barBtn} type="button" className="ol-bar-btn" aria-expanded={sheet} aria-controls="ol-sheet"
          aria-label={`Outline. You are in ${pocket?.label ?? PERSON.name}${hat ? `, ${hat.label}` : ''}`} onClick={() => setSheet(true)}>
          <span className="ol-bar-at" aria-hidden="true">
            <span className="ol-bar-p">{pocket?.label ?? PERSON.name}</span>
            {hat && <span className="ol-bar-h">{hat.label}</span>}
          </span>
          <span className="ol-bar-o" aria-hidden="true">Outline</span>
        </button>
      </header>

      {sheet && (
        <div id="ol-sheet" ref={sheetRef} className="ol-sheet" role="dialog" aria-modal="true" aria-label="Outline" data-lenis-prevent>
          <div className="ol-sheet-top">
            {toggle}
            <button type="button" className="ol-close" onClick={() => setSheet(false)}>Close</button>
          </div>
          <ul className="ol-sheet-list">
            {tree.map((p) => (
              <li key={p.id} className={cn(path[0] === p.id && 'is-on')}>
                <a href={`#${p.id}`} aria-current={path[0] === p.id && !path[1] ? 'location' : undefined} onClick={jump}>{p.label}</a>
                {p.kids && !tags && (
                  <ul>{p.kids.map((h) => (
                    <li key={h.id} className={cn(path[1] === h.id && 'is-on')}>
                      <a href={`#${h.id}`} aria-current={path[1] === h.id ? 'location' : undefined} onClick={jump}>{h.label}</a>
                    </li>
                  ))}</ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <DocCtx.Provider value={doc}>
        <main id="main" className="ol-main" tabIndex={-1}>
          <Pocket id="armaan" label={PERSON.name} top>
            <div className="ol-card is-lead is-keep">
              <p className="ol-tag ol-lead">{PERSON.line}</p>
              <div className="ol-body">
                {PERSON.about.map((p) => <p key={p.slice(0, 20)}>{p}</p>)}
                <p className="ol-aside">{PERSON.aside}</p>
              </div>
            </div>
          </Pocket>

          <Pocket id="today" label="Today">
            {latest ? (
              <Hat id="today-latest" label={<time dateTime={latest.date}>{formatDate(latest.date)}</time>} className="ol-today">
                <Tag id="t-latest" lv={4} text={split(latest.body[0])[0]} keep>
                  {split(latest.body[0])[1] && <p>{split(latest.body[0])[1]}</p>}
                  {latest.body.slice(1).map((p) => <p key={p.slice(0, 24)}>{p}</p>)}
                </Tag>
              </Hat>
            ) : (
              <Hat id="today-latest" label="The latest" className="ol-today">
                <Tag id="t-latest" lv={4} text={NOW.status} keep>
                  <p className="ol-meta">{loaded ? 'The daily note goes up here.' : 'Fetching the newest note.'}</p>
                </Tag>
              </Hat>
            )}
            {earlier.length > 0 && (
              <Hat id="today-earlier" label="Earlier notes">
                {earlier.map((n) => (
                  <Block key={n.date} id={`note-${n.date}`} label={<time dateTime={n.date}>{formatDate(n.date)}</time>} className="ol-note">
                    <div className="ol-body">{n.body.map((p) => <p key={p.slice(0, 24)}>{p}</p>)}</div>
                  </Block>
                ))}
              </Hat>
            )}
          </Pocket>

          <Pocket id="debate" label="Debate">
            <Hat id="debate-titles" label={CHAPTERS[1].title}>
              {DEBATE.wins.map((w, i) => (
                <Block key={w.where} id={`win-${i}`} label={w.where} aside={w.when} className="ol-win">
                  <Tag id={`t-win-${i}`} lv={5} text={`${w.title}, ${w.event}.`} big>
                    <p className="ol-meta">{w.title} in {w.event} at {w.where}, {w.when}.</p>
                  </Tag>
                </Block>
              ))}
              <Block id="debate-season" label="The season">
                <Tag id="t-season" lv={5} text="Lincoln Douglas is where I actually live.">
                  <p>{CHAPTERS[1].body}</p>
                </Tag>
              </Block>
            </Hat>
          </Pocket>

          <Pocket id="coaching" label="Coaching">
            <Hat id="coach-skeptical" label={DEBATE.team.name}>
              <Block id="coach-role" label={DEBATE.team.role}>
                <Tag id="t-coach" lv={5} text={`${DEBATE.team.role}, ${DEBATE.team.name}.`}>
                  <p>{DEBATE.team.line}</p>
                  <p><Out href={DEBATE.team.href}>{host(DEBATE.team.href)}</Out></p>
                </Tag>
              </Block>
              <Block id="coach-record" label="The record">
                <Tag id="t-record" lv={5} text={`${split(DEBATE.team.record.replace(':', '.'))[0]}`}>
                  <p>{DEBATE.team.record}</p>
                </Tag>
              </Block>
            </Hat>
          </Pocket>

          <Pocket id="research" label="Research">
            <Hat id="res-paper" label={PAPER.title} className="ol-paper">
              <p className="ol-meta ol-status">{PAPER.status}. {PAPER.pages} pages. DOI {PAPER.doi}</p>
              <Block id="res-abstract" label="Abstract">
                <Tag id="t-abstract" lv={5} text={split(PAPER.abstract)[0]}>
                  <p>{split(PAPER.abstract)[1]}</p>
                  <blockquote className="ol-epi">
                    <p>{PAPER.epigraph.text}</p>
                    <footer>{PAPER.epigraph.source}</footer>
                  </blockquote>
                </Tag>
              </Block>
              <Block id="res-keywords" label="Keywords">
                <ul className="ol-kw ol-body">{PAPER.keywords.map((k) => <li key={k}>{k}</li>)}</ul>
              </Block>
              <Block id="res-read" label="Where to read it">
                <ul className="ol-links ol-body">
                  {PAPER.links.map((l) => <li key={l.label}><Out href={l.href}>{l.label}</Out></li>)}
                </ul>
              </Block>
            </Hat>
            <Hat id="res-wess" label={WESS.short} className="ol-wess">
              <Tag id="t-wess" lv={4} text={split(WESS.abstract)[0]}>
                <p>{split(WESS.abstract)[1]}</p>
                <p className="ol-meta">{WESS.title}. {WESS.status}.</p>
              </Tag>
            </Hat>
          </Pocket>

          <Pocket id="building" label="Building">
            <Hat id="build-shipped" label={CHAPTERS[4].title}>
              {WORK.map((w) => {
                const [t, rest] = split(w.line);
                return (
                  <Block key={w.slug} id={`w-${w.slug}`} label={w.name} aside={w.kind} className="ol-work">
                    <figure className="ol-shot ol-body">
                      {w.href ? (
                        <a href={w.href} rel="noopener" tabIndex={-1} aria-hidden="true">
                          <img src={BASE + w.img} alt="" width={1200} height={680} loading="lazy" decoding="async" />
                        </a>
                      ) : (
                        <img src={BASE + w.img} alt="" width={1200} height={680} loading="lazy" decoding="async" />
                      )}
                    </figure>
                    <Tag id={`t-${w.slug}`} lv={5} text={t}>
                      {rest && <p>{rest}</p>}
                      <p className="ol-meta">
                        <span>{w.stack}</span>
                        {w.href ? <Out href={w.href}>{host(w.href)}</Out> : <span>No public link.</span>}
                      </p>
                    </Tag>
                  </Block>
                );
              })}
            </Hat>
            <Hat id="build-github" label="Live from GitHub" className="ol-gh">
              {commits.length > 0 && (
                <Block id="gh-commits" label="Recent commits" aside={gh.commitsThisMonth != null ? `${gh.commitsThisMonth} this month` : undefined}>
                  {commits.map((c, i) => (
                    <Tag key={c.href + i} id={`t-c${i}`} lv={5} text={c.message} keep>
                      <p className="ol-meta"><Out href={c.href}>{c.repo}</Out><span>{ago(c.at)}</span></p>
                    </Tag>
                  ))}
                </Block>
              )}
              {repos.map((r) => (
                <Block key={r.name} id={`r-${r.name}`} label={<Out href={r.href}>{r.name}</Out>} aside={r.language ?? undefined} className="ol-repo">
                  <Tag id={`t-r-${r.name}`} lv={5} text={r.description ?? 'No description yet.'}>
                    <p className="ol-meta">{r.pushedAt ? <span>Pushed {ago(r.pushedAt)}</span> : <span>Public repository</span>}<Out href={r.href}>{host(r.href)}</Out></p>
                  </Tag>
                </Block>
              ))}
              <p className="ol-more ol-body"><Out href={GITHUB.href}>Everything else, at {host(GITHUB.href)}</Out></p>
            </Hat>
          </Pocket>

          <Pocket id="now" label="Now">
            <Hat id="now-reading" label={NOW.reading.title}>
              <Tag id="t-reading" lv={4} text={NOW.reading.body}>
                <ul className="ol-kw">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
              </Tag>
            </Hat>
            <Hat id="now-club" label={NOW.club.title}>
              <Tag id="t-club" lv={4} text={NOW.club.body} keep />
            </Hat>
            <Hat id="now-status" label="Right now">
              <Tag id="t-status" lv={4} text={NOW.status} keep />
            </Hat>
          </Pocket>

          <Pocket id="record" label="Record">
            <Hat id="rec-honors" label="Honors">
              <Tag id="t-honors" lv={4} text="The record, newest first.">
                <ol className="ol-honors">
                  {HONORS.map((h) => <li key={h.what}><span className="ol-hw">{h.what}</span><span className="ol-hd">{h.detail}</span></li>)}
                </ol>
              </Tag>
            </Hat>
            <Hat id="rec-awards" label="Awards">
              <Tag id="t-awards" lv={4} text={`${HONORS[2].what}.`}>
                <ul className="ol-certs">
                  {AWARDS.map((a) => (
                    <li key={a.site}>
                      <a className="ol-cert" href={a.href} rel="noopener">
                        <img src={BASE + a.img} alt={`Certificate: ${a.site}`} width={720} height={1018} loading="lazy" decoding="async" />
                        <span className="ol-cert-t">{a.site}</span>
                        <span className="ol-cert-n">{a.note}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </Tag>
            </Hat>
          </Pocket>

          <Pocket id="off" label="Off the record">
            <div className="ol-offgrid">
              <Hat id="off-likes" label="Likes"><ul className="ol-list ol-body">{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></Hat>
              <Hat id="off-dislikes" label="Dislikes"><ul className="ol-list ol-body">{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></Hat>
              <Hat id="off-favs" label="Favourites"><ul className="ol-list ol-body">{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></Hat>
              <Hat id="off-courses" label="Courses">
                <ul className="ol-list ol-body">{COURSES.map((c) => <li key={c.title}><strong>{c.provider}, {c.title}.</strong> {c.note}</li>)}</ul>
              </Hat>
            </div>
          </Pocket>

          <Pocket id="next" label="Up next">
            {DEBATE.next.map((n, i) => (
              <Hat key={n.where} id={`next-${i}`} label={n.where} className="ol-next">
                <div className="ol-card is-keep">
                  <h4 className="ol-tag" data-tag={`t-next-${i}`}>{n.event}.</h4>
                  <div className="ol-blank" aria-hidden="true"><span className="ol-caret" /></div>
                </div>
              </Hat>
            ))}
          </Pocket>

          <Pocket id="contact" label="Contact">
            <ul className="ol-contact">
              {LINKS.map((l) => (
                <li key={l.label} className="ol-card is-keep">
                  <span className="ol-cl">{l.label}</span>
                  {l.href ? <a className="ol-tag ol-cv" href={l.href} rel={l.href.startsWith('http') ? 'noopener' : undefined}>{l.value}</a> : <span className="ol-tag ol-cv">{l.value}</span>}
                </li>
              ))}
            </ul>
          </Pocket>

          <footer className="ol-foot">
            <p>Draft 92 of the portfolio. Not the live site.</p>
            <p>The outline column is remixed from LineSidebar by React Bits. Set in Archivo and Newsreader.</p>
          </footer>
        </main>
      </DocCtx.Provider>
    </div>
  );
}
