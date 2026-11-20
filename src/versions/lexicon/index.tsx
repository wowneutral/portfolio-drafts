// Draft 33, The lexicon. His page as a small dictionary of his own words. Every entry is built from content.ts:
// a blue headword, a part of speech, numbered senses and "see" cross-references. The headword of the entry
// you are reading outdents into the margin (the one piece of type that moves); the thumb index and guide words
// on the fore-edge follow you down the book.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import '@fontsource-variable/eb-garamond/wght.css';
import '@fontsource-variable/eb-garamond/wght-italic.css';
import '@fontsource-variable/schibsted-grotesk/wght.css';
import './lexicon.css';
import { AWARDS, CHAPTERS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { isPhone } from '@/lib/utils';

const src = (p: string) => import.meta.env.BASE_URL + p;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; ladders: { who: string; when: string; where: string }[]; epigraph: { text: string; source: string }; pages: number };
const wess = RESEARCH[1];
const mitez = CHAPTERS.find((c) => c.id === 'mitez')!;

// The word list, alphabetical, as it runs down the page.
const WORDS: { id: string; word: string }[] = [
  { id: 'armaan-seth', word: 'Armaan Seth' },
  { id: 'build', word: 'build' },
  { id: 'champion', word: 'champion' },
  { id: 'commit', word: 'commit' },
  { id: 'contact', word: 'contact' },
  { id: 'courses', word: 'courses' },
  { id: 'dislikes', word: 'dislikes' },
  { id: 'favourites', word: 'favourites' },
  { id: 'honours', word: 'honours' },
  { id: 'ladder', word: 'ladder' },
  { id: 'likes', word: 'likes' },
  { id: 'mitez', word: 'MITEZ' },
  { id: 'next', word: 'next' },
  { id: 'note', word: 'note' },
  { id: 'now', word: 'now' },
  { id: 'paper', word: 'paper' },
  { id: 'repository', word: 'repository' },
  { id: 'skeptical', word: 'Skeptical' },
  { id: 'wessobrunn', word: 'Wessobrunn' },
];
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const firstFor = (L: string) => WORDS.find((w) => w.word[0].toUpperCase() === L);
const PAIRS = Array.from({ length: 13 }, (_, i) => [ALPHA[i * 2], ALPHA[i * 2 + 1]]);

const PLATE_H: Record<string, number> = { mitez: 660, skeptical: 660, lastseen: 670, lastsearch: 692, spread: 660, rogue: 662, jarvis: 852, drafts: 766 };

const KEYWORD_REF: Record<string, string> = {
  'linguistic skepticism': 'skeptical',
  Pyrrhonism: 'ladder-1',
  Sprachkritik: 'ladder-2',
  'Fritz Mauthner': 'ladder-2',
  'Ludwig Wittgenstein': 'ladder-3',
  'Sextus Empiricus': 'ladder-1',
};

function Out({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const ext = /^https?:/.test(href);
  return (
    <a className={className ?? 'out'} href={href} {...(ext ? { target: '_blank', rel: 'noreferrer' } : {})}>
      {children}
      {ext && (
        <svg className="arr" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 9 9 3M4.5 3H9v4.5" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
      )}
    </a>
  );
}

function See({ refs }: { refs: [string, string][] }) {
  return (
    <p className="see">
      <i>see</i>{' '}
      {refs.map(([id, w], i) => (
        <span key={id}>
          <a className="xref" href={'#' + id}>{w}</a>
          {i < refs.length - 1 ? ', ' : ''}
        </span>
      ))}
    </p>
  );
}

function Entry({ id, word, pos, label, big, children }: { id: string; word: string; pos: string; label?: string; big?: boolean; children: ReactNode }) {
  return (
    <article className={'entry' + (big ? ' is-big' : '')} id={id} data-word={word} aria-labelledby={id + '-h'}>
      <div className="hw-row">
        <h2 className="hw" id={id + '-h'}>
          <span className="hw-w">{word}</span> <span className="pos">{pos}</span>
        </h2>
        {label && <p className="usage">{label}</p>}
      </div>
      <div className="body">{children}</div>
    </article>
  );
}

function Sense({ n, id, children, className }: { n: number; id?: string; children: ReactNode; className?: string }) {
  return (
    <li className={'sense' + (className ? ' ' + className : '')} id={id}>
      <span className="sn">
        {n}
        <svg className="pen" viewBox="0 0 60 44" aria-hidden="true"><path pathLength={1} d="M38 6C22 2 6 10 6 23s14 18 27 17 22-8 21-19C53 11 43 5 30 6" /></svg>
      </span>
      <div className="st">{children}</div>
    </li>
  );
}

export default function LexiconPage() {
  useVersion('lexicon', { anchorOffset: typeof window !== 'undefined' && isPhone() ? -72 : -40 });
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const [latest, ...earlier] = notes;
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState('');
  const [guide, setGuide] = useState<[string, string]>(['Armaan Seth', 'Armaan Seth']);
  const [arrived, setArrived] = useState('');
  const [sheet, setSheet] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const sheetBtn = useRef<HTMLButtonElement>(null);
  const sheetFirst = useRef<HTMLAnchorElement>(null);

  // Which entry you are reading, and the first and last headword on screen.
  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const els = [...(root.current?.querySelectorAll<HTMLElement>('.entry') ?? [])];
      const H = window.innerHeight;
      const top = isPhone() ? 56 : 0;
      let on = '';
      const seen: string[] = [];
      for (const el of els) {
        const r = el.getBoundingClientRect();
        const h = (el.firstElementChild as HTMLElement).getBoundingClientRect().top;
        if (h <= H * 0.42 && r.bottom > 0) on = el.id;
        if (r.bottom > top + 24 && r.top < H - 24) seen.push(el.dataset.word!);
      }
      for (const el of els) el.classList.toggle('is-on', el.id === on);
      setActive(on);
      if (seen.length) setGuide((g) => (g[0] === seen[0] && g[1] === seen[seen.length - 1] ? g : [seen[0], seen[seen.length - 1]]));
      else setGuide((g) => (g[0] === 'Armaan Seth' && g[1] === 'Armaan Seth' ? g : ['Armaan Seth', 'Armaan Seth']));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, []);

  // Following a cross-reference draws a pen ring round the sense it lands on.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      setArrived(a.getAttribute('href')!.slice(1));
      setSheet(false);
    };
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, []);

  // Phone index sheet: focus in, Escape out, focus back.
  useEffect(() => {
    if (!sheet) return;
    sheetFirst.current?.focus();
    const btn = sheetBtn.current;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheet(false); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); btn?.focus({ preventScroll: true }); };
  }, [sheet]);

  useEffect(() => {
    root.current?.querySelectorAll('[data-arrived]').forEach((n) => n.removeAttribute('data-arrived'));
    if (arrived) document.getElementById(arrived)?.setAttribute('data-arrived', '');
  }, [arrived]);

  const letter = (WORDS.find((w) => w.id === active)?.word[0] ?? 'A').toUpperCase();
  const commits = gh.activity.slice(0, 6);

  return (
    <div className="v-lexicon" ref={root}>
      <a className="skip-x" href="#main">Skip to the entries</a>

      {/* Fore-edge: guide words and thumb index (desktop). */}
      <aside className="rail" aria-label="Thumb index">
        <p className="guide" aria-hidden="true"><span>{guide[0]}</span><span>{guide[1]}</span></p>
        <nav className="thumbs" aria-label="Letters">
          {PAIRS.map((pair) => (
            <div key={pair[0]} className={'tab' + (pair.includes(letter) ? ' is-here' : '')}>
              {pair.map((L) => {
                const w = firstFor(L);
                return w ? (
                  <a key={L} href={'#' + w.id} className="th" aria-label={`${L}: ${w.word}`}>{L}</a>
                ) : (
                  <span key={L} className="th is-empty">{L}</span>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Running head (phone). */}
      <header className="head">
        <p className="head-g" aria-hidden="true"><span>{guide[0]}</span><span>{guide[1]}</span></p>
        <button ref={sheetBtn} className="head-b" aria-label="Open the thumb index" aria-expanded={sheet} onClick={() => setSheet(true)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4.5h11M4 12h11M4 19.5h11" stroke="currentColor" strokeWidth="1.4" /><rect x="15" y="2.5" width="5" height="4" rx="1" fill="currentColor" /><rect x="15" y="10" width="5" height="4" rx="1" fill="currentColor" /><rect x="15" y="17.5" width="5" height="4" rx="1" fill="currentColor" /></svg>
        </button>
      </header>
      {sheet && (
        <div className="sheet" role="dialog" aria-modal="true" aria-label="Thumb index">
          <button className="sheet-x" aria-label="Close the thumb index" onClick={() => setSheet(false)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.7" /></svg>
          </button>
          <div className="sheet-l">
            {ALPHA.map((L, i) => {
              const w = firstFor(L);
              return w ? (
                <a key={L} ref={i === 0 ? sheetFirst : undefined} href={'#' + w.id} className={'sl' + (L === letter ? ' is-here' : '')}>
                  <b>{L}</b><span>{w.word}</span>
                </a>
              ) : (
                <span key={L} className="sl is-empty"><b>{L}</b></span>
              );
            })}
          </div>
        </div>
      )}

      <main id="main" className="book">
        {/* ---------- Title page ---------- */}
        <section className="title" id="top" aria-labelledby="name">
          <p className="t-over sc">A small dictionary of his own words</p>
          <h1 id="name" className="t-name">{PERSON.name}</h1>
          <p className="t-line">{PERSON.line}</p>
          <p className="t-short sc">{PERSON.short.join(' ')}</p>
          <p className="t-spec">
            <a href="#champion" className="t-hw">champion</a> <i className="t-pos">n.</i>{' '}
            {DEBATE.wins.map((w, i) => (
              <span key={w.where}><b className="t-n">{i + 1}</b> {w.event}, {w.where}, {w.when}. </span>
            ))}
            <i>see</i> <a className="xref" href="#skeptical">Skeptical</a>
          </p>
          <nav className="t-list" aria-label="Entries">
            <ol>
              {WORDS.map((w) => (
                <li key={w.id}><a href={'#' + w.id}>{w.word}</a></li>
              ))}
            </ol>
          </nav>
        </section>

        {/* ---------- A ---------- */}
        <Entry id="armaan-seth" word="Armaan Seth" pos="n." >
          <ol className="senses">
            <Sense n={1}><p>{PERSON.about[0]}</p></Sense>
            <Sense n={2}><p>{PERSON.about[1]}</p></Sense>
            <Sense n={3}><p>{PERSON.aside}</p></Sense>
          </ol>
          <See refs={[['champion', 'champion'], ['skeptical', 'Skeptical'], ['mitez', 'MITEZ'], ['paper', 'paper'], ['build', 'build']]} />
        </Entry>

        {/* ---------- B ---------- */}
        <Entry id="build" word="build" pos="v.">
          <ol className="senses plates">
            {WORK.map((w, i) => (
              <Sense key={w.slug} n={i + 1} id={'build-' + (i + 1)} className="work">
                <h3 className="w-name">{w.name} <i className="w-kind">{w.kind}</i></h3>
                <p className="w-line">{w.line}</p>
                <p className="w-meta"><span className="sc">{w.stack}</span>{w.href && <Out href={w.href}>{host(w.href)}</Out>}</p>
                <figure className="plate">
                  {w.href ? (
                    <a href={w.href} target="_blank" rel="noreferrer" className="plate-f" aria-label={`${w.name}, opens ${host(w.href)}`}>
                      <img src={src(w.img)} alt={`Screenshot of ${w.name}`} loading="lazy" width={1200} height={PLATE_H[w.slug]} />
                    </a>
                  ) : (
                    <span className="plate-f"><img src={src(w.img)} alt={`Screenshot of ${w.name}`} loading="lazy" width={1200} height={PLATE_H[w.slug]} /></span>
                  )}
                  <figcaption><span className="sc">Plate {i + 1}</span> {w.name}</figcaption>
                </figure>
              </Sense>
            ))}
          </ol>
          <See refs={[['mitez', 'MITEZ'], ['skeptical', 'Skeptical'], ['repository', 'repository']]} />
        </Entry>

        {/* ---------- C ---------- */}
        <Entry id="champion" word="champion" pos="n." big>
          <ol className="senses champ">
            {DEBATE.wins.map((w, i) => (
              <Sense key={w.where} n={i + 1} id={'champion-' + (i + 1)}>
                <p className="c-event">{w.event}</p>
                <p className="c-where sc">{w.where}, {w.when}</p>
              </Sense>
            ))}
          </ol>
          <See refs={[['skeptical', 'Skeptical'], ['next', 'next'], ['honours', 'honours']]} />
        </Entry>

        <Entry id="commit" word="commit" pos="n." label={gh.live && gh.commitsThisMonth != null ? `${gh.commitsThisMonth} pushed this month` : undefined}>
          {commits.length ? (
            <ol className="senses live">
              {commits.map((c, i) => (
                <Sense key={c.href + i} n={i + 1}>
                  <p><Out href={c.href} className="plain">{c.message}</Out></p>
                  <p className="sc meta">{c.repo}, {ago(c.at)}</p>
                </Sense>
              ))}
            </ol>
          ) : (
            <ol className="senses live">
              <Sense n={1}>
                <p>Read live from GitHub, which is out of reach right now. Every commit is at <Out href={GITHUB.href}>{host(GITHUB.href)}</Out></p>
              </Sense>
            </ol>
          )}
          <See refs={[['repository', 'repository'], ['build', 'build']]} />
        </Entry>

        <Entry id="contact" word="contact" pos="n.">
          <ol className="senses contact">
            {LINKS.map((l, i) => (
              <Sense key={l.label} n={i + 1}>
                <p><i className="lab">{l.label}</i> {l.href ? <Out href={l.href}>{l.value}</Out> : <span className="val">{l.value}</span>}</p>
              </Sense>
            ))}
          </ol>
        </Entry>

        <Entry id="courses" word="courses" pos="n. pl.">
          <ol className="senses">
            {COURSES.map((c, i) => (
              <Sense key={c.title} n={i + 1}>
                <p><b className="b">{c.title}</b> <span className="sc">{c.provider}</span> {c.note}</p>
              </Sense>
            ))}
          </ol>
        </Entry>

        {/* ---------- D, F ---------- */}
        <Entry id="dislikes" word="dislikes" pos="n. pl.">
          <ol className="senses short">
            {DISLIKES.map((d, i) => <Sense key={d} n={i + 1}><p>{d}</p></Sense>)}
          </ol>
          <See refs={[['likes', 'likes']]} />
        </Entry>

        <Entry id="favourites" word="favourites" pos="n. pl.">
          <ol className="senses short">
            {FAVOURITES.map((d, i) => <Sense key={d} n={i + 1}><p>{d}</p></Sense>)}
          </ol>
        </Entry>

        {/* ---------- H ---------- */}
        <Entry id="honours" word="honours" pos="n. pl.">
          <ol className="senses honours">
            {HONORS.map((h, i) => (
              <Sense key={h.what} n={i + 1}>
                <p>{h.what} <span className="sc">{h.detail}</span></p>
              </Sense>
            ))}
          </ol>
          <div className="certs">
            {AWARDS.map((a, i) => (
              <figure className="plate cert" key={a.site}>
                <a href={a.href} target="_blank" rel="noreferrer" className="plate-f" aria-label={`${a.site}, certificate, opens wdawards.com`}>
                  <img src={src(a.img)} alt={`Certificate for ${a.site}`} loading="lazy" width={720} height={1018} />
                </a>
                <figcaption><span className="sc">Plate {WORK.length + i + 1}</span> {a.site}. <i>{a.note}</i></figcaption>
              </figure>
            ))}
          </div>
          <See refs={[['champion', 'champion'], ['wessobrunn', 'Wessobrunn']]} />
        </Entry>

        {/* ---------- L ---------- */}
        <Entry id="ladder" word="ladder" pos="n.">
          <ol className="senses">
            {paper.ladders.map((l, i) => (
              <Sense key={l.who} n={i + 1} id={'ladder-' + (i + 1)}>
                <p><b className="b">{l.who}</b>, {l.when}. <i>{l.where}</i></p>
              </Sense>
            ))}
          </ol>
          <See refs={[['paper', 'paper']]} />
        </Entry>

        <Entry id="likes" word="likes" pos="n. pl.">
          <ol className="senses short">
            {LIKES.map((d, i) => <Sense key={d} n={i + 1}><p>{d}</p></Sense>)}
          </ol>
          <See refs={[['dislikes', 'dislikes'], ['favourites', 'favourites']]} />
        </Entry>

        {/* ---------- M, N ---------- */}
        <Entry id="mitez" word="MITEZ" pos="n.">
          <ol className="senses">
            <Sense n={1}><p>{mitez.body}</p><p className="w-meta"><Out href={WORK[0].href!}>{host(WORK[0].href!)}</Out></p></Sense>
          </ol>
          <See refs={[['build-1', 'build 1'], ['honours', 'honours']]} />
        </Entry>

        <Entry id="next" word="next" pos="adj.">
          <ol className="senses nexts">
            {DEBATE.next.map((n, i) => (
              <Sense key={n.where} n={i + 1}>
                <p className="n-event">{n.event}</p>
                <p className="sc">{n.where}</p>
              </Sense>
            ))}
          </ol>
          <See refs={[['champion', 'champion'], ['now', 'now']]} />
        </Entry>

        <Entry id="note" word="note" pos="n.">
          <ol className="senses notes">
            {latest ? (
              <Sense n={1} className="today">
                <p className="sc n-date"><time dateTime={latest.date}>{formatDate(latest.date)}</time></p>
                {latest.body.map((p, i) => <p key={i} className="n-body">{p}</p>)}
              </Sense>
            ) : (
              <Sense n={1} className="today">
                <p className="sc n-date">{loaded ? 'Today' : 'Turning to today'}</p>
                <p className="n-body n-wait">{loaded ? 'No note has been written yet today.' : 'The note for today is on its way.'}</p>
              </Sense>
            )}
            {earlier.map((n, i) => {
              const isOpen = !!open[n.date];
              return (
                <Sense key={n.date} n={i + 2} className={'fold' + (isOpen ? ' is-open' : '')}>
                  <button className="fold-b" aria-expanded={isOpen} aria-controls={'note-' + n.date} onClick={() => setOpen((o) => ({ ...o, [n.date]: !o[n.date] }))}>
                    <span className="sc"><time dateTime={n.date}>{formatDate(n.date)}</time></span>
                    <span className="fold-t">{n.body[0]}</span>
                    <svg className="fold-i" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
                  </button>
                  <div className="fold-p" id={'note-' + n.date}>
                    <div>{n.body.map((p, j) => <p key={j}>{p}</p>)}</div>
                  </div>
                </Sense>
              );
            })}
          </ol>
          <See refs={[['now', 'now'], ['commit', 'commit']]} />
        </Entry>

        <Entry id="now" word="now" pos="adv.">
          <ol className="senses">
            <Sense n={1}><p>{NOW.status}</p></Sense>
            <Sense n={2}>
              <p><b className="b">{NOW.reading.title}.</b> {NOW.reading.body}</p>
              <p className="shelves">{NOW.reading.shelves.map((s) => <span key={s} className="sc">{s}</span>)}</p>
            </Sense>
            <Sense n={3}><p><b className="b">{NOW.club.title}.</b> {NOW.club.body}</p></Sense>
          </ol>
          <See refs={[['next', 'next'], ['note', 'note']]} />
        </Entry>

        {/* ---------- P, R ---------- */}
        <Entry id="paper" word="paper" pos="n.">
          <ol className="senses">
            <Sense n={1} className="paper">
              <p className="p-title">{paper.title}</p>
              <p className="sc meta">{paper.status}, {paper.pages} pages, DOI {paper.doi}</p>
              <p className="p-abs">{paper.abstract}</p>
              <p className="see kw">
                <i>see also</i>{' '}
                {paper.keywords.map((k, i) => (
                  <span key={k}><a className="xref" href={'#' + KEYWORD_REF[k]}>{k}</a>{i < paper.keywords.length - 1 ? ', ' : ''}</span>
                ))}
              </p>
              <ul className="p-links">
                {paper.links.map((l) => <li key={l.label}><Out href={l.href}>{l.label}</Out></li>)}
              </ul>
            </Sense>
          </ol>
          <See refs={[['ladder', 'ladder'], ['wessobrunn', 'Wessobrunn']]} />
        </Entry>

        <Entry id="repository" word="repository" pos="n.">
          <ol className="senses repos">
            {gh.repos.slice(0, 8).map((r, i) => (
              <Sense key={r.name} n={i + 1}>
                <p><Out href={r.href} className="b repo">{r.name}</Out>{r.description ? ' ' + r.description : ''}</p>
                <p className="sc meta">{[r.language, r.pushedAt ? ago(r.pushedAt) : ''].filter(Boolean).join(', ')}</p>
              </Sense>
            ))}
          </ol>
          <p className="see"><i>all at</i> <Out href={GITHUB.href}>{host(GITHUB.href)}</Out></p>
        </Entry>

        {/* ---------- S ---------- */}
        <Entry id="skeptical" word="Skeptical" pos="n." label={DEBATE.team.role}>
          <ol className="senses">
            <Sense n={1}><p className="sk-line">{DEBATE.team.line}</p></Sense>
            <Sense n={2}><p>{DEBATE.team.record}</p></Sense>
          </ol>
          <p className="w-meta"><Out href={DEBATE.team.href}>{host(DEBATE.team.href)}</Out></p>
          <See refs={[['champion', 'champion'], ['build-2', 'build 2'], ['next', 'next']]} />
        </Entry>

        {/* ---------- W ---------- */}
        <Entry id="wessobrunn" word="Wessobrunn" pos="n.">
          <ol className="senses">
            <Sense n={1}>
              <p className="p-title w">{wess.title}</p>
              <p className="sc meta">{wess.status}</p>
              <p>{wess.abstract}</p>
            </Sense>
          </ol>
          <See refs={[['paper', 'paper'], ['honours', 'honours']]} />
        </Entry>

        {/* ---------- End matter ---------- */}
        <section className="end" aria-label="End matter">
          <blockquote className="epi">
            <p>{paper.epigraph.text}</p>
            <footer className="sc">{paper.epigraph.source}</footer>
          </blockquote>
          <p className="end-nav">
            <a className="xref" href="#contact">contact</a>
            <a className="xref" href="#top">back to the title page</a>
          </p>
        </section>
      </main>
      <footer className="colophon">
        <p>Draft 33 of the portfolio. Not the live site.</p>
      </footer>
    </div>
  );
}
