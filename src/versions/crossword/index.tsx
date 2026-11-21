// Draft 95, The crossword. Grid placement from Michael Wehar's Crossword-Layout-Generator (MIT); cell focus,
// arrow and Tab movement, direction toggle and completion checks adapted from JaredReisinger/react-crossword (MIT).
// A real puzzle whose answers are his life. Solve or reveal a word and the page takes you to that part of him.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import './crossword.css';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { scrollToId } from '@/lib/scroll';
import { ACROSS, ALL_CELLS, COLS, DOWN, GRID, ROWS, WORDS, byId, cellsOf, key, type Dir, type Word } from './puzzle';

const src = (p: string) => import.meta.env.BASE_URL + p;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; ladders: { who: string; when: string; where: string }[]; epigraph: { text: string; source: string } };
const wess = RESEARCH[1];
const ORDER = [...ACROSS, ...DOWN];
const STORE = 'crossword:v95';

/* ---------- state ---------- */

type Ctx = {
  guess: Record<string, string>;
  setCells: (cells: [number, number][], letters: string[]) => void;
  active: { r: number; c: number; dir: Dir };
  activeWord: Word;
  select: (r: number, c: number, dir?: Dir, focus?: boolean) => void;
  focusTick: number;
  solved: (w: Word) => boolean;
  reveal: (w: Word) => void;
  revealAll: () => void;
  phone: boolean;
  wave: boolean;
};
const C = createContext<Ctx>(null!);
const use = () => useContext(C);

function usePuzzle(): Ctx {
  const [guess, setGuess] = useState<Record<string, string>>(() => {
    // A first visit starts with one answer already in, his team, as the worked example.
    const sk = WORDS.find((w) => w.answer === 'SKEPTICAL')!;
    const example = Object.fromEntries(cellsOf(sk).map(([r, c], i) => [key(r, c), sk.answer[i]]));
    try { const saved = localStorage.getItem(STORE); return saved ? JSON.parse(saved) : example; } catch { return example; }
  });
  const first = WORDS.find((w) => w.answer === 'SKEPTICAL')!;
  const [active, setActive] = useState({ r: first.row, c: first.col, dir: 'across' as Dir });
  const [focusTick, setTick] = useState(0);
  const [wave, setWave] = useState(false);
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 760px)');
    const on = () => setPhone(mq.matches);
    on(); mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(guess)); } catch { /* storage off */ } }, [guess]);

  const setCells = useCallback((cells: [number, number][], letters: string[]) => {
    setGuess((g) => { const n = { ...g }; cells.forEach(([r, c], i) => { if (letters[i]) n[key(r, c)] = letters[i]; else delete n[key(r, c)]; }); return n; });
  }, []);
  const select = useCallback((r: number, c: number, dir?: Dir, focus = true) => {
    const cell = GRID[r]?.[c];
    if (!cell) return;
    setActive((a) => {
      let d = dir ?? a.dir;
      if (!cell[d]) d = d === 'across' ? 'down' : 'across';
      return { r, c, dir: d };
    });
    if (focus) setTick((t) => t + 1);
  }, []);
  const cell = GRID[active.r][active.c]!;
  const activeWord = byId[cell[active.dir] ?? cell.across ?? cell.down!];
  const solved = useCallback((w: Word) => cellsOf(w).every(([r, c], i) => guess[key(r, c)] === w.answer[i]), [guess]);
  const reveal = useCallback((w: Word) => setCells(cellsOf(w), [...w.answer]), [setCells]);
  const revealAll = useCallback(() => {
    setWave(true);
    setGuess(Object.fromEntries(ALL_CELLS.map((x) => [key(x.r, x.c), x.letter])));
  }, []);
  return { guess, setCells, active, activeWord, select, focusTick, solved, reveal, revealAll, phone, wave };
}

/* ---------- square lettering ---------- */

function Squares({ text, size = 'h', filled = true, label }: { text: string; size?: 'h' | 'm' | 's'; filled?: boolean; label?: string }) {
  const words = text.toUpperCase().split(' ');
  const n = Math.max(...words.map((w) => w.length), text.length <= 12 ? text.length : 0);
  return (
    <span className={`sq sq-${size}`} style={{ ['--n' as string]: n }} aria-hidden={label ? undefined : true}>
      {label && <span className="sr-only-x">{label}</span>}
      <span className="sq-run" aria-hidden="true">
        {words.map((w, i) => (
          <span className="sq-word" key={i}>
            {[...w].map((ch, j) => <span className="sq-c" key={j}>{filled ? <span className="land">{ch}</span> : null}</span>)}
          </span>
        ))}
      </span>
    </span>
  );
}

function Head({ id, word, label }: { id: string; word: string; label: string }) {
  const { select, solved } = use();
  const refs = WORDS.filter((w) => w.to === id);
  return (
    <div className="head">
      <h2 id={`${id}-h`}><Squares text={word} label={label} /></h2>
      {refs.length > 0 && (
        <p className="refs">
          <span>In the grid:</span>
          {refs.map((w) => (
            <button type="button" key={w.id} className={solved(w) ? 'done' : ''} onClick={() => { select(w.row, w.col, w.dir, false); scrollToId('puzzle'); }}>
              {w.num} {w.dir}{solved(w) ? `, ${w.answer}` : ''}
            </button>
          ))}
        </p>
      )}
    </div>
  );
}

/* ---------- the grid ---------- */

function Grid() {
  const { guess, setCells, active, activeWord, select, focusTick, phone, wave } = use();
  const refs = useRef<Record<string, HTMLInputElement | null>>({});
  const live = useMemo(() => new Set(cellsOf(activeWord).map(([r, c]) => key(r, c))), [activeWord]);

  useEffect(() => {
    if (!focusTick || phone) return;
    refs.current[key(active.r, active.c)]?.focus({ preventScroll: true });
  }, [focusTick, active.r, active.c, phone]);

  const step = (dr: number, dc: number) => {
    let r = active.r + dr, c = active.c + dc;
    while (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      if (GRID[r][c]) return select(r, c, dr ? 'down' : 'across');
      r += dr; c += dc;
    }
  };
  const inWord = (delta: number) => {
    const cells = cellsOf(activeWord);
    const i = cells.findIndex(([r, c]) => r === active.r && c === active.c);
    const j = i + delta;
    if (j >= 0 && j < cells.length) select(cells[j][0], cells[j][1], activeWord.dir);
  };
  const typeAt = (ch: string) => {
    setCells([[active.r, active.c]], [ch.toUpperCase()]);
    inWord(1);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    let handled = true;
    if (k === 'ArrowUp') step(-1, 0);
    else if (k === 'ArrowDown') step(1, 0);
    else if (k === 'ArrowLeft') step(0, -1);
    else if (k === 'ArrowRight') step(0, 1);
    else if (k === ' ') select(active.r, active.c, active.dir === 'across' ? 'down' : 'across');
    else if (k === 'Tab') {
      const i = ORDER.findIndex((w) => w.id === activeWord.id) + (e.shiftKey ? -1 : 1);
      if (i < 0 || i >= ORDER.length) handled = false;
      else select(ORDER[i].row, ORDER[i].col, ORDER[i].dir);
    } else if (k === 'Backspace') {
      if (guess[key(active.r, active.c)]) setCells([[active.r, active.c]], ['']);
      else {
        const cells = cellsOf(activeWord);
        const i = cells.findIndex(([r, c]) => r === active.r && c === active.c);
        if (i > 0) { setCells([cells[i - 1]], ['']); select(cells[i - 1][0], cells[i - 1][1], activeWord.dir); }
      }
    } else if (k === 'Delete') setCells([[active.r, active.c]], ['']);
    else if (k === 'Home' || k === 'End') {
      const cells = cellsOf(activeWord); const [r, c] = k === 'Home' ? cells[0] : cells[cells.length - 1];
      select(r, c, activeWord.dir);
    } else if (/^[a-zA-Z]$/.test(k)) typeAt(k);
    else handled = false;
    if (handled) e.preventDefault();
  };

  return (
    <div className="grid-x" style={{ ['--rows' as string]: ROWS, ['--cols' as string]: COLS }} role="group" aria-label="Crossword grid">
      {GRID.flat().map((cell, i) => {
        if (!cell) return <span className="cell dark" key={i} aria-hidden="true" />;
        const k = key(cell.r, cell.c);
        const g = guess[k] ?? '';
        const here = active.r === cell.r && active.c === cell.c;
        const w = byId[(here ? cell[active.dir] : undefined) ?? cell.across ?? cell.down!];
        const pos = cellsOf(w).findIndex(([r, c]) => r === cell.r && c === cell.c) + 1;
        return (
          <span className={`cell${live.has(k) ? ' live' : ''}${here ? ' here' : ''}`} key={i}>
            {cell.num && <span className="num" aria-hidden="true">{cell.num}</span>}
            {g && <span className="land" key={g + (wave ? 'w' : '')} aria-hidden="true" style={wave ? { animationDelay: `${(cell.r + cell.c) * 28}ms` } : undefined}>{g}</span>}
            <input
              ref={(el) => { refs.current[k] = el; }}
              value={g}
              readOnly={phone}
              inputMode={phone ? 'none' : 'text'}
              tabIndex={here ? 0 : -1}
              autoComplete="off" autoCapitalize="characters" spellCheck={false}
              aria-label={`${w.num} ${w.dir}, letter ${pos} of ${w.answer.length}: ${w.clue}`}
              onKeyDown={onKey}
              onChange={(e) => { const v = e.target.value.replace(/[^a-z]/gi, ''); if (v) typeAt(v.slice(-1)); }}
              onMouseDown={(e) => {
                if (phone) return;
                e.preventDefault();
                if (here) select(cell.r, cell.c, active.dir === 'across' ? 'down' : 'across');
                else select(cell.r, cell.c);
              }}
              onClick={() => { if (phone) { select(cell.r, cell.c, here ? (active.dir === 'across' ? 'down' : 'across') : undefined, false); requestAnimationFrame(() => document.getElementById('row-' + (byId[(here ? cell[active.dir === 'across' ? 'down' : 'across'] : undefined) ?? cell[active.dir] ?? cell.across ?? cell.down!]?.id))?.querySelector('input')?.focus()); } }}
              onFocus={() => { if (!here && !phone) select(cell.r, cell.c, undefined, false); }}
            />
          </span>
        );
      })}
    </div>
  );
}

/* A row of big squares bound to one answer (the phone entry row, and the paper's title). */
function AnswerRow({ w, id, label }: { w: Word; id?: string; label: string }) {
  const { guess, setCells, wave } = use();
  const cells = cellsOf(w);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const put = (i: number, ch: string) => { setCells([cells[i]], [ch]); };
  const onKey = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    const k = e.key;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (k === 'ArrowLeft' && i > 0) { refs.current[i - 1]?.focus(); e.preventDefault(); }
    else if (k === 'ArrowRight' && i < cells.length - 1) { refs.current[i + 1]?.focus(); e.preventDefault(); }
    else if (k === 'Backspace') {
      e.preventDefault();
      if (guess[key(...cells[i])]) put(i, '');
      else if (i > 0) { put(i - 1, ''); refs.current[i - 1]?.focus(); }
    } else if (/^[a-zA-Z]$/.test(k)) {
      e.preventDefault(); put(i, k.toUpperCase());
      refs.current[Math.min(i + 1, cells.length - 1)]?.focus();
    }
  };
  return (
    <span className="row-x" id={id} role="group" aria-label={label}>
      {cells.map(([r, c], i) => {
        const g = guess[key(r, c)] ?? '';
        return (
          <span className="big" key={i}>
            {g && <span className="land" key={g + (wave ? 'w' : '')} aria-hidden="true">{g}</span>}
            <input
              ref={(el) => { refs.current[i] = el; }}
              value={g}
              autoComplete="off" autoCapitalize="characters" spellCheck={false}
              aria-label={`${label}, letter ${i + 1} of ${cells.length}`}
              onKeyDown={onKey(i)}
              onChange={(e) => {
                const v = e.target.value.replace(/[^a-z]/gi, '').toUpperCase();
                if (!v) return;
                put(i, v.slice(-1));
                refs.current[Math.min(i + 1, cells.length - 1)]?.focus();
              }}
            />
          </span>
        );
      })}
    </span>
  );
}

function ClueList({ title, words }: { title: string; words: Word[] }) {
  const { activeWord, select, solved, reveal, phone } = use();
  return (
    <div className="clues">
      <h3>{title}</h3>
      <ol>
        {words.map((w) => {
          const on = w.id === activeWord.id;
          const done = solved(w);
          return (
            <li key={w.id} className={`${on ? 'on' : ''}${done ? ' done' : ''}`}>
              <button type="button" className="clue" aria-pressed={on} onClick={() => {
                select(w.row, w.col, w.dir, !phone);
                if (phone) requestAnimationFrame(() => document.getElementById('row-' + w.id)?.querySelector('input')?.focus());
              }}>
                <span className="cn">{w.num}</span>
                <span className="ct"><span className="ul">{w.clue}</span> <span className="en">({w.answer.length})</span></span>
              </button>
              {on && (
                <div className="acts">
                  {phone && <AnswerRow w={w} id={'row-' + w.id} label={`${w.num} ${w.dir}`} />}
                  <span className="act-line">
                    {!done && <button type="button" className="act" onClick={() => reveal(w)}>Reveal</button>}
                    {done && <button type="button" className="act go" onClick={() => scrollToId(w.to)}>Read about it: {w.label}</button>}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------- page ---------- */

const NAV = [['today', 'Today'], ['debate', 'Debate'], ['research', 'Research'], ['work', 'Work'], ['github', 'GitHub'], ['now', 'Now'], ['record', 'Record'], ['contact', 'Contact']] as const;

export default function Crossword() {
  useVersion('crossword');
  const p = usePuzzle();
  const { notes, loaded } = useNotes();
  const gh = useGitHub();
  const total = WORDS.filter((w) => p.solved(w)).length;
  const all = total === WORDS.length;
  const mauthner = WORDS.find((w) => w.answer === 'MAUTHNER')!;
  const [latest, ...earlier] = notes;

  return (
    <C.Provider value={p}>
      <div className="v-crossword">
        <a className="skip-x" href="#main">Skip to content</a>
        <header className="mast">
          <div className="mast-id">
            <h1>{PERSON.name}</h1>
            <p className="line">{PERSON.line}</p>
          </div>
          <nav aria-label="Sections">
            <ul>{NAV.map(([id, l]) => <li key={id}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); scrollToId(id); }}>{l}</a></li>)}</ul>
          </nav>
        </header>

        <main id="main">
          <section className="puzzle" id="puzzle" aria-labelledby="puzzle-h">
            <h2 id="puzzle-h" className="sr-only-x">The crossword</h2>
            <div className="board">
              <Grid />
              <p className="tally" aria-live="polite">{all ? 'Every answer is in.' : `${total} of ${WORDS.length} solved. Every answer is a part of him; the sections below are open either way.`}</p>
            </div>
            <div className="lists">
              <ClueList title="Across" words={ACROSS} />
              <ClueList title="Down" words={DOWN} />
            </div>
          </section>

          <section id="today" className="sec today" aria-labelledby="today-h">
            <Head id="today" word="Today" label="Today" />
            {latest ? (
              <div className="note">
                <p className="note-date"><time dateTime={latest.date}>{formatDate(latest.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></p>
                <div className="note-body">{latest.body.map((b, i) => <p key={i}>{b}</p>)}</div>
                {earlier.length > 0 && (
                  <details className="earlier">
                    <summary>Earlier notes ({earlier.length})</summary>
                    <ol>{earlier.map((n) => <li key={n.date}><time dateTime={n.date}>{formatDate(n.date)}</time><div>{n.body.map((b, i) => <p key={i}>{b}</p>)}</div></li>)}</ol>
                  </details>
                )}
              </div>
            ) : (
              <div className="note">
                <p className="note-date">{loaded ? 'No note yet today' : 'Today’s note'}</p>
                <div className="note-body"><p>{NOW.status}</p></div>
              </div>
            )}
          </section>

          <section id="about" className="sec about" aria-labelledby="about-h">
            <Head id="about" word="About" label="About" />
            <div className="about-body">
              {PERSON.about.map((t, i) => <p key={i} className={i === 0 ? 'lead' : ''}>{t}</p>)}
              <p className="aside">{PERSON.aside}</p>
            </div>
          </section>

          <section id="debate" className="sec debate" aria-labelledby="debate-h">
            <Head id="debate" word="Debate" label="Debate" />
            <ul className="wins">
              {DEBATE.wins.map((w) => (
                <li key={w.where}>
                  <p className="win-t">{w.title}</p>
                  <p className="win-e">{w.event}</p>
                  <p className="win-w">{w.where}, {w.when}</p>
                </li>
              ))}
            </ul>
            <div className="team">
              <h3><Squares text={DEBATE.team.name} size="m" label={DEBATE.team.name} /></h3>
              <div className="team-body">
                <p className="role">{DEBATE.team.role}</p>
                <p>{DEBATE.team.line}</p>
                <p>{DEBATE.team.record}</p>
                <p><a className="go-link" href={DEBATE.team.href}>{host(DEBATE.team.href)}</a></p>
              </div>
            </div>
            <div className="next">
              <h3>Up next</h3>
              <ul>{DEBATE.next.map((n) => <li key={n.where}><span className="nx-w">{n.where}</span><span className="nx-e">{n.event}</span></li>)}</ul>
            </div>
          </section>

          <section id="research" className="sec research" aria-labelledby="research-h">
            <Head id="research" word="Research" label="Research" />
            <h3 className="sr-only-x">{paper.title}</h3>
            <p className={`ptitle${p.solved(mauthner) ? ' done' : ''}`}>
              <span aria-hidden="true">“Not in </span>
              <AnswerRow w={mauthner} label="Fill the name in the paper’s title" />
              <span aria-hidden="true">’s Sense”: Wittgenstein, Mauthner, and the Pyrrhonian Critique of Language</span>
            </p>
            {!p.solved(mauthner) && <p className="hint"><button type="button" className="act" onClick={() => p.reveal(mauthner)}>Reveal the name</button></p>}
            <div className="paper">
              <div className="abs">
                <p className="status">{paper.status}, {paper.pages} pages</p>
                <p className="abstract">{paper.abstract}</p>
                <p className="kw"><span className="kw-l">Keywords</span> {paper.keywords.join(' · ')}</p>
                <ul className="plinks">{paper.links.map((l) => <li key={l.label}><a href={l.href}>{l.label}</a></li>)}</ul>
                <p className="cite">{paper.title}. DOI {paper.doi}.</p>
              </div>
              <ol className="ladders" aria-label="The three ladders the paper follows">
                {paper.ladders.map((l) => (
                  <li key={l.who}><span className="lw">{l.who}</span><span className="lm">{l.when}</span><span className="lm">{l.where}</span></li>
                ))}
              </ol>
            </div>
            <blockquote className="epi"><p>{paper.epigraph.text}</p><cite>{paper.epigraph.source}</cite></blockquote>
            <div className="wess">
              <h3><Squares text="Wessobrunn" size="s" label={wess.title} /></h3>
              <div><p className="status">{wess.title}. {wess.status}.</p><p>{wess.abstract}</p></div>
            </div>
          </section>

          <section id="work" className="sec work" aria-labelledby="work-h">
            <Head id="work" word="Work" label="Work" />
            <ol className="works">
              {WORK.map((w, i) => (
                <li key={w.slug} className={i % 2 ? 'flip' : ''}>
                  <h3 className="w-name"><Squares text={w.name} size="m" label={w.name} /></h3>
                  <div className="w-row">
                    <figure className="shot">{w.href ? <a href={w.href} tabIndex={-1} aria-hidden="true"><img src={src(w.img)} alt="" loading="lazy" /></a> : <img src={src(w.img)} alt="" loading="lazy" />}</figure>
                    <div className="w-text">
                      <p className="w-kind">{w.kind}</p>
                      <p className="w-line">{w.line}</p>
                      <p className="w-stack">{w.stack}</p>
                      {w.href ? <p><a className="go-link" href={w.href}>{host(w.href)}</a></p> : <p className="w-stack">Runs on his own machine. No public link.</p>}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section id="github" className="sec github" aria-labelledby="github-h">
            <Head id="github" word="GitHub" label="Live from GitHub" />
            <p className="gh-sub">Live from GitHub, as <a className="go-link" href={GITHUB.href}>{host(GITHUB.href)}</a>{gh.commitsThisMonth != null ? `. ${gh.commitsThisMonth} commits this month.` : '.'}</p>
            <div className={`gh-cols${gh.activity.length ? '' : ' solo'}`}>
              <div>
                <h3>Repositories</h3>
                <ol className="repos">
                  {gh.repos.slice(0, 8).map((r) => (
                    <li key={r.name}>
                      <a href={r.href}>
                        <Squares text={r.name.replace(/-/g, ' ')} size="s" />
                        <span className="sr-only-x">{r.name}</span>
                        <span className="r-d">{r.description ?? 'No description yet.'} <span className="en">({r.name.split('-').map((x) => x.length).join('-')})</span></span>
                        {r.language && <span className="r-l">{r.language}{r.pushedAt ? `, pushed ${ago(r.pushedAt)}` : ''}</span>}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
              {gh.activity.length > 0 && (
                <div>
                  <h3>Recent commits</h3>
                  <ol className="commits">
                    {gh.activity.slice(0, 8).map((a, i) => (
                      <li key={a.href + i}><a href={a.href}><span className="cm">{a.message}</span><span className="r-l">{a.repo}, {ago(a.at)}</span></a></li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </section>

          <section id="now" className="sec now" aria-labelledby="now-h">
            <Head id="now" word="Now" label="Now" />
            <div className="now-cols">
              <div><h3>{NOW.reading.title}</h3><p>{NOW.reading.body}</p><ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul></div>
              <div><h3>{NOW.club.title}</h3><p>{NOW.club.body}</p></div>
              <div><h3>Status</h3><p>{NOW.status}</p></div>
            </div>
          </section>

          <section id="record" className="sec record" aria-labelledby="record-h">
            <Head id="record" word="Record" label="Record" />
            <div className="rec">
              <ol className="honors">{HONORS.map((h, i) => <li key={h.what}><span className="cn">{i + 1}</span><span><span className="h-w">{h.what}</span> <span className="h-d">{h.detail}</span></span></li>)}</ol>
              <ul className="awards">{AWARDS.map((a) => <li key={a.site}><a href={a.href}><img src={src(a.img)} alt={`Certificate: ${a.site}`} loading="lazy" /><span className="a-s">{a.site}</span><span className="a-n">{a.note}</span></a></li>)}</ul>
            </div>
          </section>

          <section id="off" className="sec off" aria-labelledby="off-h">
            <Head id="off" word="Off the record" label="Off the record" />
            <div className="off-cols">
              <div><h3>Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3>Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3>Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h3>Courses</h3><ul>{COURSES.map((x) => <li key={x.title}><b>{x.provider} {x.title}</b> {x.note}</li>)}</ul></div>
            </div>
          </section>

          <section id="contact" className={`sec ending${all ? ' all' : ''}`} aria-labelledby="contact-h">
            <div className="fin">
              <div className="fin-name"><Squares text={PERSON.name} size="m" filled={all} /></div>
              <div className="mini" aria-hidden="true" style={{ ['--cols' as string]: COLS }}>
                {GRID.flat().map((cell, i) => cell
                  ? <span className="m" key={i}>{p.guess[key(cell.r, cell.c)] && <span className="land" key={p.guess[key(cell.r, cell.c)] + (p.wave ? 'w' : '')} style={p.wave ? { animationDelay: `${(cell.r + cell.c) * 28}ms` } : undefined}>{p.guess[key(cell.r, cell.c)]}</span>}</span>
                  : <span className="m dark" key={i} />)}
              </div>
              <p className="fin-line">{all ? 'Solved. Every square filled.' : `${WORDS.length - total} answers still open.`}</p>
              {!all && <p><button type="button" className="act big-act" onClick={p.revealAll}>Reveal all</button></p>}
            </div>
            <div className="contact">
              <h2 id="contact-h">Contact</h2>
              <ul className="links">
                {LINKS.map((l) => <li key={l.label}><span className="l-l">{l.label}</span>{l.href ? <a href={l.href}>{l.value}</a> : <span className="l-v">{l.value}</span>}</li>)}
              </ul>
            </div>
          </section>
        </main>

        <footer className="foot">
          <p>Draft 95 of the portfolio. Not the live site.</p>
          <p>Grid laid out with Crossword-Layout-Generator by Michael Wehar; entry after react-crossword by Jared Reisinger. Both MIT.</p>
        </footer>
      </div>
    </C.Provider>
  );
}
