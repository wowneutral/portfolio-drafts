// Draft 99: the days. One wall of cards, packed like a masonry (Wall.tsx, after React Bits Masonry, MIT + Commons Clause):
// his latest note biggest at the top, the things he has done pinned around it, then every earlier note and every commit
// he pushes, newest first. The wall re-packs when a note or a commit arrives, when a card opens, and when it is resized.
import { useMemo, useState, type ReactNode } from 'react';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource-variable/instrument-sans';
import './days.css';
import { PERSON, CHAPTERS, DEBATE, RESEARCH, WORK, HONORS, AWARDS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate, type Note } from '@/lib/notes';
import { scrollToId, scrollToY } from '@/lib/scroll';
import { useVersion } from '@/lib/version';
import Wall, { type Brick } from './Wall';

const BASE = import.meta.env.BASE_URL;
const ext = (href: string) => (href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {});
const host = (href: string) => href.replace(/^https:\/\//, '').replace(/\/$/, '');
const clean = (s: string) => s.replace(/[–—]/g, '-');
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const MITEZ = CHAPTERS.find((c) => c.id === 'mitez')!;
const TITLES = CHAPTERS.find((c) => c.id === 'debate')!;
const PAPER = RESEARCH[0] as (typeof RESEARCH)[0] & { epigraph: { text: string; source: string }; keywords: string[]; pages: number; doi: string };
const WESSO = RESEARCH[1];
// Where each screenshot is cropped for a tall card, and how tall each card's picture is (height over width).
const FOCAL: Record<string, string> = { mitez: '50% 50%', skeptical: '70% 50%', lastseen: '46% 50%', lastsearch: '50% 42%', spread: '12% 40%', rogue: '50% 55%', jarvis: '50% 50%', drafts: '14% 50%' };
const TALL: Record<string, number> = { mitez: 0.78, skeptical: 1.3, lastseen: 1.42, lastsearch: 1.12, spread: 1.2, rogue: 1.36, jarvis: 1.18, drafts: 1.08 };

/** A card part that opens in place; the wall re-packs around it and the card itself stays where it is. */
function More({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const card = e.currentTarget.closest('article');
    setOpen((o) => !o);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const r = card?.getBoundingClientRect();
      if (r && (r.top < 0 || r.top > window.innerHeight * 0.7)) scrollToY(window.scrollY + r.top - 20);
    }));
  };
  return (
    <>
      <div id={id} className="more" hidden={!open}>{children}</div>
      <button type="button" className="open" aria-expanded={open} aria-controls={id} onClick={toggle}>
        {open ? 'Show less' : label}
      </button>
    </>
  );
}

function TodayCard({ note, loaded, today }: { note?: Note; loaded: boolean; today: string }) {
  const isToday = note?.date === today;
  return (
    <article id="today" className="c c-today" aria-busy={!loaded}>
      <h2 className="today-h">
        <span className="today-lab">{note ? (isToday ? 'Today' : 'Latest note') : 'Today'}</span>
        <time dateTime={note?.date ?? today}>{formatDate(note?.date ?? today)}</time>
      </h2>
      {note ? (
        <div className="today-body">{note.body.map((p, i) => <p key={i}>{p}</p>)}</div>
      ) : (
        <div className="today-body"><p>{NOW.status}</p></div>
      )}
      <p className="today-foot">
        <a href="#days" onClick={(e) => { e.preventDefault(); scrollToId('days', -24); }}>Earlier days</a>
        <span>A new card each time he writes.</span>
      </p>
    </article>
  );
}

function NoteCard({ note }: { note: Note }) {
  const long = note.body.join(' ').length > 240;
  const id = 'n-' + note.date;
  return (
    <article id={id} className="c c-note" aria-labelledby={id + '-h'}>
      <h3 id={id + '-h'} className="note-h"><time dateTime={note.date}>{formatDate(note.date)}</time></h3>
      {long ? (
        <>
          <p className="note-p">{note.body[0].length > 240 ? note.body[0].slice(0, note.body[0].lastIndexOf(' ', 220)) + '...' : note.body[0]}</p>
          <More id={id + '-more'} label="Read the whole day">{note.body.slice(note.body[0].length > 240 ? 0 : 1).map((p, i) => <p key={i} className="note-p">{p}</p>)}</More>
        </>
      ) : note.body.map((p, i) => <p key={i} className="note-p">{p}</p>)}
    </article>
  );
}

/** This month in the side column: every day he wrote or shipped is set dark, underlined, and jumps to its card. */
function Month({ notes, activity, today, last }: { notes: Note[]; activity: { at: string }[]; today: string; last: string }) {
  const latest = notes[0]?.date ?? today;
  const [y, m] = (latest > today ? latest : today).split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const count = new Date(y, m, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const wrote = new Set(notes.map((n) => n.date));
  const shipped = new Set(activity.map((a) => iso(new Date(a.at))));
  const days = Array.from({ length: count }, (_, i) => iso(new Date(y, m - 1, i + 1)));
  const target = (d: string) => (d === notes[0]?.date ? 'today' : wrote.has(d) ? 'n-' + d : 'c-' + d);
  return (
    <div className="month">
      <div className="month-top">
        <h2 className="month-h">{formatDate(days[0], { month: 'long', year: 'numeric' })}</h2>
        {last && <p className="month-last">Last commit {last}</p>}
      </div>
      <p className="month-w" aria-hidden="true">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}</p>
      <ol className="month-g" style={{ ['--lead' as string]: lead + 1 }}>
        {days.map((d, i) => {
          const n = i + 1;
          const kind = wrote.has(d) ? 'note' : shipped.has(d) ? 'code' : '';
          const label = `${formatDate(d, { day: 'numeric', month: 'long' })}${wrote.has(d) ? ', a note' : ''}${shipped.has(d) ? ', commits' : ''}`;
          return (
            <li key={d} data-k={kind || undefined} data-today={d === today || undefined}>
              {kind ? (
                <a href={'#' + target(d)} aria-label={label} onClick={(e) => { e.preventDefault(); scrollToId(target(d), -24); }}>{n}</a>
              ) : <span aria-hidden="true">{n}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function Days() {
  useVersion('days', { anchorOffset: -24 });
  const { notes, loaded } = useNotes();
  const gh = useGitHub();
  const [only, setOnly] = useState(false);
  const now = new Date();
  const today = iso(now);
  const tomorrow = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const latest = notes[0];
  const lastCommit = gh.activity[0];

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const pinned = !['today', 'days', 'contact'].includes(id);
    if (only && pinned) { setOnly(false); setTimeout(() => scrollToId(id, -24), 80); } else scrollToId(id, -24);
  };

  const items = useMemo<Brick[]>(() => {
    const pinned: Brick[] = [
      { id: 'debate', span: 2, node: (
        <article id="debate" className="c c-debate">
          <h2 className="c-t">{TITLES.title}</h2>
          <ul className="wins">
            {DEBATE.wins.map((w) => (
              <li key={w.where}>
                <p className="win-big">{w.title}</p>
                <p className="win-ev">{w.event}</p>
                <p className="win-at">{w.where}, {w.when}</p>
              </li>
            ))}
          </ul>
          <h3 className="c-s">Up next</h3>
          <ul className="nexts">
            {DEBATE.next.map((n) => <li key={n.where}><span>{n.event}</span><span>{n.where}</span></li>)}
          </ul>
        </article>
      ) },
      { id: 'skeptical', span: 1, node: (
        <article id="skeptical" className="c c-team">
          <h2 className="c-t">{DEBATE.team.name}</h2>
          <p className="role">{DEBATE.team.role}</p>
          <p>{DEBATE.team.line}</p>
          <p className="quiet">{DEBATE.team.record}</p>
          <p className="go"><a href={DEBATE.team.href} {...ext(DEBATE.team.href)}>{host(DEBATE.team.href)}</a></p>
        </article>
      ) },
      { id: 'about', span: 2, node: (
        <article id="about" className="c c-about">
          <h2 className="c-t">About</h2>
          {PERSON.about.map((p, i) => <p key={i}>{p}</p>)}
          <p className="quiet">{PERSON.aside}</p>
        </article>
      ) },
      { id: 'research', span: 2, node: (
        <article id="research" className="c c-paper">
          <h2 className="paper-t">{PAPER.title}</h2>
          <p className="quiet">{PAPER.status}, {PAPER.pages} pages. DOI {PAPER.doi}</p>
          <blockquote className="epi"><p>{PAPER.epigraph.text}</p><footer>{PAPER.epigraph.source}</footer></blockquote>
          <p>{PAPER.abstract}</p>
          <p className="keys"><span>Keywords</span> {PAPER.keywords.join(', ')}</p>
          <ul className="plinks">
            {PAPER.links.map((l) => <li key={l.label}><a href={l.href} {...ext(l.href)}>{l.label}</a></li>)}
          </ul>
        </article>
      ) },
      { id: 'mitez', span: 1, node: (
        <article id="mitez" className="c c-mitez">
          <h2 className="c-t">{MITEZ.title}</h2>
          <p>{MITEZ.body}</p>
          <p className="go"><a href="https://mitez.org" {...ext('https://mitez.org')}>mitez.org</a></p>
        </article>
      ) },
      { id: 'wesso', span: 1, node: (
        <article id="wessobrunn" className="c c-wesso">
          <h2 className="c-t c-t-s">{WESSO.title}</h2>
          <p className="quiet">{WESSO.status}</p>
          <p>{WESSO.abstract}</p>
        </article>
      ) },
      { id: 'now', span: 1, node: (
        <article id="now" className="c c-now">
          <h2 className="c-s">Now</h2>
          <p className="now-line">{NOW.status}</p>
        </article>
      ) },
      { id: 'reading', span: 1, node: (
        <article id="reading" className="c c-read">
          <h2 className="c-t c-t-s">{NOW.reading.title}</h2>
          <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
          <p className="quiet">{NOW.reading.body}</p>
        </article>
      ) },
      { id: 'club', span: 1, node: (
        <article id="club" className="c c-club">
          <h2 className="c-t c-t-s">{NOW.club.title}</h2>
          <p>{NOW.club.body}</p>
        </article>
      ) },
      { id: 'github', span: 1, node: (
        <article id="github" className="c c-repos">
          <h2 className="c-t c-t-s">On GitHub</h2>
          {gh.live && gh.commitsThisMonth != null && <p className="quiet">{gh.commitsThisMonth} commits this month</p>}
          <ul className="repos">
            {gh.repos.slice(0, 6).map((r) => (
              <li key={r.name}>
                <a href={r.href} {...ext(r.href)}>{r.name}</a>
                {r.description && <span>{clean(r.description)}</span>}
                <span className="quiet">{r.language ?? 'Repository'}{r.pushedAt ? `, pushed ${ago(r.pushedAt)}` : ''}</span>
              </li>
            ))}
          </ul>
          <p className="go"><a href={GITHUB.href} {...ext(GITHUB.href)}>github.com/{GITHUB.user}</a></p>
        </article>
      ) },
      { id: 'record', span: 1, node: (
        <article id="record" className="c c-record">
          <h2 className="c-t c-t-s">Record</h2>
          <ul className="honors">{HONORS.slice(0, 5).map((h) => <li key={h.what}><span>{h.what}</span><span className="quiet">{h.detail}</span></li>)}</ul>
          <More id="record-more" label="The rest of the record">
            <ul className="honors">{HONORS.slice(5).map((h) => <li key={h.what}><span>{h.what}</span><span className="quiet">{h.detail}</span></li>)}</ul>
          </More>
        </article>
      ) },
      { id: 'awards', span: 2, node: (
        <article id="awards" className="c c-awards">
          <h2 className="c-t c-t-s">Two WD Awards Favourites</h2>
          <ul className="certs">
            {AWARDS.map((a) => (
              <li key={a.site}>
                <a href={a.href} {...ext(a.href)}>
                  <img src={BASE + a.img} alt={`Certificate: ${a.site}, ${a.note}`} width={720} height={1018} loading="lazy" decoding="async" />
                  <span className="cert-n">{a.site}</span>
                  <span className="quiet">{a.note}</span>
                </a>
              </li>
            ))}
          </ul>
        </article>
      ) },
      { id: 'off', span: 1, node: (
        <article id="off" className="c c-off">
          <h2 className="c-t c-t-s">Off the record</h2>
          <h3 className="c-s">Likes</h3>
          <ul className="dots">{LIKES.map((l) => <li key={l}>{l}</li>)}</ul>
          <More id="off-more" label="Dislikes, favourites, courses">
            <h3 className="c-s">Dislikes</h3>
            <ul className="dots">{DISLIKES.map((l) => <li key={l}>{l}</li>)}</ul>
            <h3 className="c-s">Favourites</h3>
            <ul className="dots">{FAVOURITES.map((l) => <li key={l}>{l}</li>)}</ul>
            <h3 className="c-s">Courses</h3>
            <ul className="dots">{COURSES.map((c) => <li key={c.title}>{c.provider} {c.title}: {c.note}</li>)}</ul>
          </More>
        </article>
      ) },
    ];

    const work: Brick[] = [
      { id: 'work-h', span: 9, cls: 'brk', node: <div className="row" id="work"><h2>Work</h2><p>What he has built, one card each.</p></div> },
      ...WORK.map((w): Brick => ({ id: 'w-' + w.slug, span: 1, lean: true, node: (
        <article className="c c-work" aria-labelledby={'w-' + w.slug + '-h'}>
          <div className="shot" style={{ '--tall': TALL[w.slug] } as React.CSSProperties}>
            <img src={BASE + w.img} alt={`${w.name}, a screenshot`} style={{ objectPosition: FOCAL[w.slug] }} loading="lazy" decoding="async" />
          </div>
          <div className="strip">
            <h3 id={'w-' + w.slug + '-h'} className="w-name">{w.name}</h3>
            <p className="w-kind">{w.kind}</p>
            <p className="w-line">{w.line}</p>
            <p className="w-stack">{w.stack}</p>
            {w.href ? <p className="go"><a href={w.href} {...ext(w.href)}>{host(w.href)}</a></p> : <p className="go quiet">Runs on his own machine, no public link</p>}
          </div>
        </article>
      ) })),
    ];

    // The dated cards: earlier notes and commits, newest first by time.
    const dated = [
      ...notes.slice(1).map((n) => ({ t: new Date(n.date + 'T12:00:00').getTime(), b: { id: 'n-' + n.date, span: 1, node: <NoteCard note={n} /> } as Brick })),
      ...gh.activity.map((a, i) => ({ t: new Date(a.at).getTime(), b: { id: 'g-' + a.href, span: 1, cls: 'ink', node: (
        <article id={gh.activity.findIndex((x) => iso(new Date(x.at)) === iso(new Date(a.at))) === i ? 'c-' + iso(new Date(a.at)) : undefined} className="c c-commit">
          <h3 className="cm-msg"><a href={a.href} {...ext(a.href)}>{clean(a.message)}</a></h3>
          <p className="cm-at"><span>{a.repo}</span><span>{ago(a.at)}</span></p>
        </article>
      ) } as Brick })),
    ].sort((a, b) => b.t - a.t).map((d) => d.b);

    const days: Brick[] = [
      { id: 'days-h', span: 9, cls: 'brk', node: <div className="row" id="days"><h2>The days</h2><p>Notes and commits, newest first.</p></div> },
      ...dated,
      { id: 'next', span: 2, cls: 'slot', node: (
        <article className="c c-next" aria-labelledby="next-h">
          <h3 id="next-h" className="next-lab">Next note</h3>
          <p className="next-date"><time dateTime={tomorrow}>{formatDate(tomorrow)}</time></p>
          <p className="quiet">This space is kept for it. Tomorrow begins in {Math.max(1, Math.ceil((new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime()) / 3600e3))} hours.</p>
        </article>
      ) },
      { id: 'contact', span: 1, node: (
        <article id="contact" className="c c-contact">
          <h3 className="c-t c-t-s">Contact</h3>
          <ul className="links">
            {LINKS.map((l) => (
              <li key={l.label}><span className="quiet">{l.label}</span>{l.href ? <a href={l.href} {...ext(l.href)}>{l.value}</a> : <span>{l.value}</span>}</li>
            ))}
          </ul>
        </article>
      ) },
    ];

    pinned.forEach((b) => { b.drag = true; });
    const head: Brick = { id: 'today', span: 2, cls: 'lead', node: <TodayCard note={latest} loaded={loaded} today={today} /> };
    return only ? [head, ...days] : [head, ...pinned, ...work, ...days];
  }, [notes, loaded, gh, only, today, tomorrow, latest]);

  return (
    <div className="v-days">
      <a className="skip-x" href="#main">Skip to the wall</a>
      <div className="frame">
        <header className="side">
          <div className="side-in">
            <h1 className="name"><span>Armaan</span> <span>Seth</span></h1>
            <p className="line">{PERSON.line}</p>
            <nav aria-label="On this wall">
              <ul className="nav">
                {[['today', 'Today'], ['debate', 'Debate'], ['research', 'Research'], ['work', 'Work'], ['github', 'GitHub'], ['days', 'The days'], ['contact', 'Contact']].map(([id, t]) => (
                  <li key={id}><a href={'#' + id} onClick={go(id)}>{t}</a></li>
                ))}
              </ul>
            </nav>
            <div className="show" role="group" aria-label="Show on the wall">
              <button type="button" aria-pressed={!only} onClick={() => setOnly(false)}>Everything</button>
              <button type="button" aria-pressed={only} onClick={() => setOnly(true)}>Only the days</button>
            </div>
            <p className="hint">Drag a pinned card and the wall makes room.</p>
            <Month notes={notes} activity={gh.activity} today={today} last={lastCommit ? ago(lastCommit.at) : ''} />
          </div>
        </header>
        <main id="main" className="main">
          <Wall items={items} label={only ? 'His days, newest first' : 'The wall: pinned cards, his work, then his days, newest first'} />
          <footer className="foot">
            <p>Draft 99 of the portfolio. Not the live site.</p>
            <p className="quiet">Wall packing after the React Bits Masonry component. Set in Newsreader and Instrument Sans.</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
