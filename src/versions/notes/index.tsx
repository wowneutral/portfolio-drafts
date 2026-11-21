// Draft 58, The notes. His latest daily note on the top card of a deck of index cards; flick it to the
// back and the day before is under it. A second deck below holds prints of his work, and the page closes
// on a single card that turns over. Deck mechanics from React Bits Stack (see Stack.tsx).
import { useMemo, useRef, useState, type MouseEvent } from 'react';
import '@fontsource-variable/newsreader/standard.css';
import '@fontsource-variable/newsreader/standard-italic.css';
import '@fontsource-variable/familjen-grotesk/wght.css';
import { ArrowLeft, ArrowRight, ArrowUpRight, RotateCcw } from 'lucide-react';
import './Stack.css';
import './notes.css';
import { AWARDS, CHAPTERS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate, type Note } from '@/lib/notes';
import Stack, { type StackApi } from './Stack';

const src = (p: string) => import.meta.env.BASE_URL + p;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; ladders: { who: string; when: string; where: string }[]; epigraph: { text: string; source: string }; pages: number };
const wess = RESEARCH[1];
const debateTitle = CHAPTERS.find((c) => c.id === 'debate')!.title;

type DeckItem =
  | { kind: 'note'; note: Note; latest: boolean }
  | { kind: 'now'; which: 'reading' | 'club' };

const size = (n: number) => (n > 420 ? 's' : n > 210 ? 'm' : 'l');

function NoteCard({ item }: { item: DeckItem }) {
  if (item.kind === 'note') {
    const len = item.note.body.join(' ').length;
    return (
      <article className="nt-card" data-size={size(len)}>
        <header className="nt-card-head" data-ride>
          <span>{item.latest ? 'Latest note' : 'Earlier note'}</span>
          <time dateTime={item.note.date}>{formatDate(item.note.date)}</time>
        </header>
        <div className="nt-card-body" data-ride>
          {item.note.body.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </article>
    );
  }
  const r = NOW.reading;
  const c = NOW.club;
  return (
    <article className="nt-card nt-card-now" data-size="m">
      <header className="nt-card-head" data-ride>
        <span>Now</span>
        <span className="nt-card-tag">{item.which === 'reading' ? r.title : c.title}</span>
      </header>
      <div className="nt-card-body" data-ride>
        <p>{item.which === 'reading' ? r.body : c.body}</p>
        {item.which === 'reading' && (
          <ul className="nt-shelves">
            {r.shelves.map((s) => <li key={s}>{s}</li>)}
          </ul>
        )}
      </div>
    </article>
  );
}

function Print({ w }: { w: (typeof WORK)[number] }) {
  return (
    <figure className="nt-print">
      <img src={src(w.img)} alt={`${w.name}, a screenshot`} draggable={false} loading="lazy" />
      <figcaption data-ride>
        <span>{w.name}</span>
        <span>{w.kind}</span>
      </figcaption>
    </figure>
  );
}

function DeckButtons({ api, at, total, label }: { api: { current: StackApi | null }; at: number; total: number; label: string }) {
  return (
    <div className="nt-ctl">
      <button type="button" onClick={() => api.current?.prev()} aria-label={`Newer ${label}`}>
        <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.6} /> Newer
      </button>
      <span className="nt-count" aria-hidden="true">{at} of {total}</span>
      <button type="button" onClick={() => api.current?.next()} aria-label={`Earlier ${label}`}>
        Earlier <ArrowRight aria-hidden="true" size={18} strokeWidth={1.6} />
      </button>
    </div>
  );
}

export default function NotesPage() {
  useVersion('notes');
  const { notes, loaded } = useNotes();
  const gh = useGitHub();

  const deck = useMemo<DeckItem[]>(() => {
    const d: DeckItem[] = notes.map((note, i) => ({ kind: 'note', note, latest: i === 0 }));
    if (d.length < 3) d.push({ kind: 'now', which: 'reading' }, { kind: 'now', which: 'club' });
    return d;
  }, [notes]);

  const noteApi = useRef<StackApi | null>(null);
  const workApi = useRef<StackApi | null>(null);
  const [noteTop, setNoteTop] = useState(0);
  const [workTop, setWorkTop] = useState(0);
  const [turned, setTurned] = useState(false);
  const w = WORK[workTop];
  const topItem = deck[noteTop] ?? deck[0];
  const said = topItem?.kind === 'note' ? `Note from ${formatDate(topItem.note.date)}` : topItem ? `Now: ${topItem.which === 'reading' ? NOW.reading.title : NOW.club.title}` : '';

  const flip = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('a,button')) return;
    setTurned((t) => !t);
  };

  return (
    <div className="v-notes">
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="nt-top">
        <a className="nt-mark" href="#main">Armaan Seth</a>
        <nav aria-label="Sections">
          <ul>
            <li><a href="#debate">Debate</a></li>
            <li><a href="#work">Work</a></li>
            <li><a href="#research">Research</a></li>
            <li><a href="#github">GitHub</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </nav>
      </header>

      <main id="main">
        {/* Opening: his name beside today's note */}
        <section className="nt-hero" aria-labelledby="nt-name">
          <div className="nt-intro">
            <h1 id="nt-name">{PERSON.first}<br />{PERSON.last}</h1>
            <p className="nt-line">{PERSON.line}</p>
            <p className="nt-status">{NOW.status}</p>
          </div>
          <div className="nt-deckwrap" aria-labelledby="nt-today">
            <h2 id="nt-today" className="sr-only-x">Today</h2>
            <div className="nt-deck">
              {loaded ? (
                <Stack
                  key="notes"
                  api={noteApi}
                  label="Daily notes, newest on top"
                  layout="pile"
                  cards={deck.map((it, i) => <NoteCard key={i} item={it} />)}
                  visible={Math.min(deck.length, 5)}
                  spread={0.46}
                  depth={0.3}
                  radius={6}
                  tilt={14}
                  threshold={110}
                  exit={[1, -0.18]}
                  sendToBackOnClick
                  onChange={setNoteTop}
                />
              ) : (
                <div className="nt-wait" aria-hidden="true"><span /><span /><div className="nt-card" /></div>
              )}
            </div>
            <DeckButtons api={noteApi} at={noteTop + 1} total={deck.length} label="note" />
            <p className="nt-hint">Flick the card away for the day before.</p>
            <p className="nt-sr sr-only" role="status">{loaded ? said : 'Loading the latest note'}</p>
          </div>
        </section>

        {/* The plain record of every note, and what is on his desk now */}
        <section className="nt-ledger" aria-labelledby="nt-all">
          <div className="nt-allnotes">
            <h2 id="nt-all">Every note so far</h2>
            {loaded && notes.length === 0 && <p className="nt-quiet">The first note goes up soon.</p>}
            <ol>
              {notes.map((n) => (
                <li key={n.date}>
                  <time dateTime={n.date}>{formatDate(n.date)}</time>
                  <div>{n.body.map((p, i) => <p key={i}>{p}</p>)}</div>
                </li>
              ))}
            </ol>
          </div>
          <div className="nt-now">
            <h2>Now</h2>
            <h3>{NOW.reading.title}</h3>
            <p>{NOW.reading.body}</p>
            <ul className="nt-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            <h3>{NOW.club.title}</h3>
            <p>{NOW.club.body}</p>
          </div>
        </section>

        {/* Debate: the two championships at display size */}
        <section id="debate" className="nt-debate" aria-labelledby="nt-debate-h">
          <h2 id="nt-debate-h">{debateTitle}</h2>
          <ol className="nt-wins">
            {DEBATE.wins.map((win) => (
              <li key={win.where}>
                <p className="nt-win-title">{win.title}</p>
                <p className="nt-win-event">{win.event}</p>
                <p className="nt-win-where">{win.where}, {win.when}</p>
              </li>
            ))}
          </ol>
          <div className="nt-team">
            <div>
              <h3>{DEBATE.team.name}</h3>
              <p className="nt-role">{DEBATE.team.role}</p>
              <p>{DEBATE.team.line}</p>
              <p>{DEBATE.team.record}</p>
              <a className="nt-link" href={DEBATE.team.href}>{host(DEBATE.team.href)} <ArrowUpRight aria-hidden="true" size={18} strokeWidth={1.6} /></a>
            </div>
            <div className="nt-next">
              <h3>Up next</h3>
              <ul>
                {DEBATE.next.map((n) => (
                  <li key={n.where}><span>{n.where}</span><span>{n.event}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="nt-about" aria-labelledby="nt-about-h">
          <h2 id="nt-about-h">About</h2>
          <div className="nt-about-body">
            {PERSON.about.map((p) => <p key={p.slice(0, 12)}>{p}</p>)}
            <p className="nt-aside">{PERSON.aside}</p>
          </div>
        </section>

        {/* Work: the second deck, prints of everything he has built */}
        <section id="work" className="nt-work" aria-labelledby="nt-work-h">
          <h2 id="nt-work-h">Things I have built</h2>
          <div className="nt-work-grid">
            <div className="nt-workdeck">
              <div className="nt-printdeck">
                <Stack
                  api={workApi}
                  label="Prints of his projects"
                  layout="pile"
                  cards={WORK.map((x) => <Print key={x.slug} w={x} />)}
                  visible={6}
                  spread={0.42}
                  depth={0.25}
                  radius={3}
                  tilt={12}
                  threshold={110}
                  exit={[-1, -0.12]}
                  sendToBackOnClick
                  onChange={setWorkTop}
                />
              </div>
              <DeckButtons api={workApi} at={workTop + 1} total={WORK.length} label="project" />
            </div>
            <div className="nt-workcopy" aria-live="polite">
              <p className="nt-kind">{w.kind}</p>
              <h3>{w.name}</h3>
              <p className="nt-workline">{w.line}</p>
              <p className="nt-stack"><span className="nt-sr sr-only">Built with </span>{w.stack}</p>
              {w.href ? (
                <a className="nt-link" href={w.href}>{host(w.href)} <ArrowUpRight aria-hidden="true" size={18} strokeWidth={1.6} /></a>
              ) : (
                <p className="nt-quiet">No public link.</p>
              )}
            </div>
          </div>
          <ol className="nt-index" aria-label="All projects">
            {WORK.map((x, i) => (
              <li key={x.slug} data-on={i === workTop ? '' : undefined}>
                <button type="button" onClick={() => workApi.current?.goTo(i)} aria-current={i === workTop ? 'true' : undefined}>{x.name}</button>
                <span className="nt-index-kind">{x.kind}</span>
                <span className="nt-index-stack">{x.stack}</span>
                <span className="nt-sr sr-only">{x.line}</span>
                {x.href ? <a href={x.href} aria-label={`${x.name}, ${host(x.href)}`}>{host(x.href).split('/')[0]}</a> : <span className="nt-index-none">No link</span>}
              </li>
            ))}
          </ol>
        </section>

        {/* Research: set like a title page */}
        <section id="research" className="nt-research" aria-labelledby="nt-research-h">
          <h2 id="nt-research-h">Research</h2>
          <article className="nt-paper">
            <p className="nt-paper-status">{paper.status}, {paper.pages} pages</p>
            <h3>{paper.title}</h3>
            <p className="nt-abstract">{paper.abstract}</p>
            <p className="nt-keys"><span>Keywords</span> {paper.keywords.join(' / ')}</p>
            <ul className="nt-paperlinks">
              {paper.links.map((l) => (
                <li key={l.label}><a href={l.href}>{l.label} <ArrowUpRight aria-hidden="true" size={18} strokeWidth={1.6} /></a></li>
              ))}
            </ul>
            <ol className="nt-ladders" aria-label="The three ladders the paper traces">
              {paper.ladders.map((l) => (
                <li key={l.who}>
                  <span className="nt-l-who">{l.who}</span>
                  <span className="nt-l-when">{l.when}</span>
                  <span className="nt-l-where">{l.where}</span>
                </li>
              ))}
            </ol>
            <blockquote className="nt-epi">
              <p>{paper.epigraph.text}</p>
              <footer>{paper.epigraph.source}</footer>
            </blockquote>
          </article>
          <article className="nt-wess">
            <h3>{wess.title}</h3>
            <p className="nt-paper-status">{wess.status}</p>
            <p>{wess.abstract}</p>
          </article>
        </section>

        {/* Live from GitHub */}
        <section id="github" className="nt-gh" aria-labelledby="nt-gh-h">
          <div className="nt-gh-head">
            <h2 id="nt-gh-h">Live from GitHub</h2>
            <a className="nt-link" href={GITHUB.href}>{host(GITHUB.href)} <ArrowUpRight aria-hidden="true" size={18} strokeWidth={1.6} /></a>
          </div>
          {gh.activity.length > 0 && (
            <div className="nt-gh-block">
              <h3>Latest commits</h3>
              <ul className="nt-rows">
                {gh.activity.slice(0, 6).map((a) => (
                  <li key={a.href}>
                    <a href={a.href}>{a.message}</a>
                    <span>{a.repo}</span>
                    <span>{ago(a.at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="nt-gh-block">
            <h3>{gh.live ? 'Repositories, most recently pushed first' : 'Repositories'}</h3>
            <ul className="nt-rows nt-repos">
              {gh.repos.slice(0, 8).map((r) => (
                <li key={r.name}>
                  <a href={r.href}>{r.name}</a>
                  <span>{r.description ?? ''}</span>
                  <span>{[r.language, r.pushedAt ? ago(r.pushedAt) : ''].filter(Boolean).join(', ')}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Record */}
        <section className="nt-record" aria-labelledby="nt-record-h">
          <h2 id="nt-record-h">Record</h2>
          <div className="nt-record-grid">
            <ol className="nt-honors">
              {HONORS.map((h) => (
                <li key={h.what}><span>{h.what}</span><span>{h.detail}</span></li>
              ))}
            </ol>
            <ul className="nt-awards">
              {AWARDS.map((a) => (
                <li key={a.site}>
                  <a href={a.href}>
                    <img src={src(a.img)} alt={`WD Awards certificate for ${a.site}`} loading="lazy" />
                    <span className="nt-award-site">{a.site}</span>
                    <span className="nt-award-note">{a.note}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Off the record */}
        <section className="nt-off" aria-labelledby="nt-off-h">
          <h2 id="nt-off-h">Off the record</h2>
          <div className="nt-off-grid">
            <div><h3>Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider}, {c.title}.</strong> {c.note}</li>)}</ul></div>
          </div>
        </section>

        {/* The ending: one card on the desk that turns over */}
        <section id="contact" className="nt-contact" aria-labelledby="nt-contact-h">
          <h2 id="nt-contact-h">Write to me</h2>
          <div className="nt-last" data-turned={turned ? '' : undefined} onClick={flip}>
            <div className="nt-last-in">
              <div className="nt-last-face nt-last-front" aria-hidden={turned ? true : undefined} inert={turned}>
                <ul>
                  {LINKS.map((l) => (
                    <li key={l.label}>
                      <span>{l.label}</span>
                      {l.href ? <a href={l.href}>{l.value}</a> : <span className="nt-plain">{l.value}</span>}
                    </li>
                  ))}
                </ul>
                <button type="button" className="nt-turn" onClick={() => setTurned(true)}>
                  Turn over <RotateCcw aria-hidden="true" size={16} strokeWidth={1.6} />
                </button>
              </div>
              <div className="nt-last-face nt-last-back" aria-hidden={turned ? undefined : true} inert={!turned}>
                <p>Draft 58 of the portfolio.<br />Not the live site.</p>
                <button type="button" className="nt-turn" onClick={() => setTurned(false)}>
                  Turn back <RotateCcw aria-hidden="true" size={16} strokeWidth={1.6} />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="nt-foot">
        <p>Draft 58 of the portfolio. Not the live site.</p>
        <p>The decks are built on the Stack component from React Bits.</p>
      </footer>
    </div>
  );
}
