// Draft 89, The edition. A daily broadsheet with one subject. The dateline is the date of his latest note, the lead is the
// two championships, the wire is his commits, and every column of body type is measured and set by pretext (chenglou/pretext,
// MIT; see Story.tsx, remixed from its editorial-engine demo), so the lines reflow live around any picture you drag.
import { useEffect, useRef, useState } from 'react';
import '@fontsource/old-standard-tt/400.css';
import '@fontsource/old-standard-tt/400-italic.css';
import '@fontsource/old-standard-tt/700.css';
import '@fontsource-variable/newsreader/wght.css';
import '@fontsource-variable/newsreader/wght-italic.css';
import './edition.css';
import { AWARDS, CHAPTERS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, STATS, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import Story, { fontsReady, type Fig, type Para, type Quote } from './Story';

const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; epigraph: { text: string; source: string }; ladders: { who: string; when: string; where: string }[]; pages: number };
const wess = RESEARCH[1];
const ch = (id: string) => CHAPTERS.find((c) => c.id === id)!;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const LONG = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } as const;
const byWork = (slug: string) => WORK.find((w) => w.slug === slug)!;

// ---------- the stories, every word from content.ts ----------
const LEAD: Para[] = [
  { text: ch('debate').body },
  { text: PERSON.about[0] },
  { text: `${ch('coach').body} ${DEBATE.team.line}` },
  { text: DEBATE.team.record },
];
const LEAD_FIGS: Fig[] = [
  { id: 'lead-skeptical', img: byWork('skeptical').img, alt: 'The Skeptical team site', cap: 'Skeptical', sub: DEBATE.team.role, href: DEBATE.team.href, x: 0.535, y: 0, w: 0.465, ratio: 660 / 1200, after: 1 },
];
const LEAD_Q: Quote[] = [
  { text: '“…an LD round is really an argument about ethics with a timer running.”', col: 0, y: 11, w: 1, side: 'l', after: 2 },
];

const WORK_PARAS: Para[] = [
  { text: `${ch('builds').body} ${PERSON.about[1]}` },
  ...WORK.map((w) => ({ head: w.name.toUpperCase(), text: `${w.kind}. ${w.line} ${w.stack}.` })),
];
// Where each picture sits on the spread (x and width as fractions of the story, y in body lines).
const SPOTS: Record<string, [number, number, number, number]> = {
  lastseen: [0.344, 0, 0.656, 0],
  mitez: [0, 10, 0.3125, 1],
  skeptical: [0, 33, 0.3125, 2],
  drafts: [0, 45, 0.3125, 8],
  lastsearch: [0.344, 21, 0.3125, 4],
  rogue: [0.344, 41, 0.3125, 6],
  spread: [0.6875, 26, 0.3125, 5],
  jarvis: [0.6875, 39, 0.3125, 7],
};
const [IW, IH] = [1200, { drafts: 766, jarvis: 852, lastsearch: 692, lastseen: 670, mitez: 660, rogue: 662, skeptical: 660, spread: 660 } as Record<string, number>];
const WORK_FIGS: Fig[] = WORK.map((w) => {
  const [x, y, wd] = SPOTS[w.slug];
  const after = WORK.indexOf(w) + 1;
  return { id: w.slug, img: w.img, alt: `${w.name}, ${w.kind.toLowerCase()}: a screenshot`, cap: `${w.name}, ${w.kind}`, sub: w.href ? host(w.href) : w.stack, href: w.href, x, y, w: wd, ratio: IH[w.slug] / IW, after };
});
const WORK_Q: Quote[] = [
  { text: '“Most of it exists because I wanted the thing to exist and nobody was going to make it for me.”', col: 2, y: 19, w: 1, side: 'l', after: 0 },
];

const RESEARCH_PARAS: Para[] = [
  { text: paper.abstract },
  { text: ch('research').body },
  ...paper.ladders.map((l) => ({ head: l.who.toUpperCase(), text: `${l.when}. ${l.where}.` })),
];
const RESEARCH_Q: Quote[] = [{ text: paper.epigraph.text, src: paper.epigraph.source, col: 1, y: 0, w: 1, side: 'l', after: 1 }];

const RECORD_PARAS: Para[] = HONORS.map((h) => ({ text: `${h.what}. ${h.detail}.` }));
const RECORD_FIGS: Fig[] = AWARDS.map((a, i) => ({
  id: a.img, img: a.img, alt: `WD Awards certificate for ${a.site}`, cap: a.site, sub: a.note, href: a.href,
  x: i ? 0.8 : 0.57, y: i ? 2 : 0, w: 0.2, ratio: 1018 / 720, after: i ? 7 : 2,
}));

const two = (w: number) => (w > 760 ? 2 : 1);
const three = (w: number) => (w > 1060 ? 3 : w > 700 ? 2 : 1);

// ---------- pieces ----------
function Masthead({ small = false, as: Tag = 'h1' }: { small?: boolean; as?: 'h1' | 'p' }) {
  const box = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const fit = () => {
      const b = box.current, w = word.current; if (!b || !w) return;
      w.style.fontSize = '100px';
      const natural = w.getBoundingClientRect().width;
      if (natural) w.style.fontSize = `${Math.floor((b.clientWidth / natural) * 100 * 0.995 * 10) / 10}px`;
    };
    let alive = true;
    fontsReady().then(() => alive && fit());
    const ro = new ResizeObserver(fit); if (box.current) ro.observe(box.current);
    return () => { alive = false; ro.disconnect(); };
  }, []);
  return (
    <div className={small ? 'ed-mast is-small' : 'ed-mast'} ref={box}>
      <Tag className="ed-mast-name"><span ref={word}>{PERSON.name}</span></Tag>
    </div>
  );
}

function Folio({ name, date }: { name: string; date: string }) {
  return (
    <div className="ed-folio" aria-hidden="true">
      <span>{name}</span>
      <span>{PERSON.name}</span>
      <span>{date}</span>
    </div>
  );
}

function Wire() {
  const gh = useGitHub();
  const items = gh.activity.slice(0, 10);
  return (
    <aside className="ed-wire" aria-labelledby="wire-h">
      <h2 id="wire-h" className="ed-wire-h">On the wire</h2>
      <p className="ed-wire-sub">Live from GitHub</p>
      {items.length > 0 && (
        <ol className="ed-wire-list">
          {items.map((a, i) => (
            <li key={a.href + i}>
              <a href={a.href} target="_blank" rel="noreferrer">
                <span className="ed-wire-msg">{a.message}</span>
                <span className="ed-wire-meta">{a.repo}, {ago(a.at)}</span>
              </a>
            </li>
          ))}
        </ol>
      )}
      <h3 className="ed-wire-h3">{items.length ? 'Repositories' : 'In the repositories'}</h3>
      <ul className="ed-wire-list is-repos">
        {gh.repos.slice(0, items.length ? 4 : 6).map((r) => (
          <li key={r.name}>
            <a href={r.href} target="_blank" rel="noreferrer">
              <span className="ed-wire-msg">{r.name}</span>
              {r.description && <span className="ed-wire-desc">{r.description}</span>}
              <span className="ed-wire-meta">{[r.language, r.pushedAt ? ago(r.pushedAt) : ''].filter(Boolean).join(', ')}</span>
            </a>
          </li>
        ))}
      </ul>
      <a className="ed-more" href={GITHUB.href} target="_blank" rel="noreferrer">{host(GITHUB.href)}</a>
    </aside>
  );
}

function Column({ date }: { date: string }) {
  const { notes, loaded } = useNotes();
  const [open, setOpen] = useState<string | null>(null);
  const latest = notes[0];
  const paras: Para[] = (latest ? latest.body : [NOW.status]).map((t) => ({ text: t }));
  const short = paras.reduce((n, p) => n + p.text.length, 0) < 900;
  return (
    <section id="column" className="ed-page" aria-labelledby="column-h">
      <Folio name="The column" date={date} />
      <div className="ed-colgrid">
        <article className="ed-column">
          <h2 id="column-h" className="ed-hl is-2">The column</h2>
          <p className="ed-byline"><span>By {PERSON.name}</span><time dateTime={latest?.date ?? todayISO()}>{formatDate(latest?.date ?? todayISO(), LONG)}</time></p>
          {loaded || latest ? <div className={short ? 'ed-note is-short' : 'ed-note'}><Story key={latest?.date ?? 'none'} paras={paras} cols={short ? () => 1 : two} cap big label="The latest note" /></div> : <p className="ed-wait">{NOW.status}</p>}
          {notes.length > 1 && (
            <div className="ed-earlier">
              <h3 className="ed-sub">Earlier editions</h3>
              <ul>
                {notes.slice(1, 15).map((n) => (
                  <li key={n.date}>
                    <button type="button" aria-expanded={open === n.date} onClick={() => setOpen(open === n.date ? null : n.date)}>
                      <span>{formatDate(n.date, LONG)}</span>
                      <span aria-hidden="true">{open === n.date ? 'Close' : 'Read'}</span>
                    </button>
                    {open === n.date && <div className="ed-earlier-body">{n.body.map((p, i) => <p key={i}>{p}</p>)}</div>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>
        <aside className="ed-now" aria-labelledby="now-h">
          <h3 id="now-h" className="ed-sub">Now</h3>
          <h4 className="ed-now-t">{NOW.reading.title}</h4>
          <p>{NOW.reading.body}</p>
          <ul className="ed-shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
          <h4 className="ed-now-t">{NOW.club.title}</h4>
          <p>{NOW.club.body}</p>
          <p className="ed-status">{NOW.status}</p>
        </aside>
      </div>
    </section>
  );
}

export default function EditionPage() {
  useVersion('edition');
  const { notes } = useNotes();
  const date = formatDate(notes[0]?.date ?? todayISO(), LONG);
  const [w1, w2] = DEBATE.wins;
  return (
    <div className="v-edition">
      <a className="skip-x" href="#main">Skip to the paper</a>
      <header className="ed-wrap ed-head">
        <div className="ed-top">
          <span>{date}</span>
          <span className="ed-top-c">{PERSON.home}</span>
          <span className="ed-top-r">{PERSON.short.join(' ')}</span>
        </div>
        <Masthead />
        <div className="ed-redrule" aria-hidden="true" />
        <p className="ed-line">{PERSON.line}</p>
        <nav className="ed-inside" aria-label="Inside this edition">
          <span className="ed-inside-l">Inside</span>
          <a href="#column">The column</a>
          <a href="#work">The work</a>
          <a href="#research">Research</a>
          <a href="#record">The record</a>
          <a href="#back">Back page</a>
        </nav>
      </header>

      <main id="main" className="ed-wrap">
        <section id="front" className="ed-front" aria-labelledby="lead-h">
          <article className="ed-lead">
            <p className="ed-kicker">{ch('debate').label}</p>
            <h2 id="lead-h" className="ed-hl">{ch('debate').title}</h2>
            <div className="ed-stand">
              {[w1, w2].map((w) => (
                <p key={w.where}>
                  <span className="ed-stand-t">{w.title}</span>
                  <span className="ed-stand-e">{w.event}</span>
                  <span className="ed-stand-w">{w.where}, {w.when}</span>
                </p>
              ))}
            </div>
            <Story paras={LEAD} figs={LEAD_FIGS} quotes={LEAD_Q} cols={two} cap label="The lead story" />
            <div className="ed-coach">
              <p><strong>{DEBATE.team.name}</strong> <span>{DEBATE.team.role}</span></p>
              <a href={DEBATE.team.href} target="_blank" rel="noreferrer">{host(DEBATE.team.href)}</a>
              <a href="#next">Up next: the back page</a>
            </div>
          </article>
          <Wire />
        </section>

        <Column date={date} />

        <section id="work" className="ed-page ed-spread" aria-labelledby="work-h">
          <Folio name="Centre spread" date={date} />
          <div className="ed-spread-head">
            <h2 id="work-h" className="ed-hl is-2">{ch('builds').title}</h2>
            <p className="ed-hint">Drag any picture and the columns make room. Click one to open it.</p>
          </div>
          <Story paras={WORK_PARAS} figs={WORK_FIGS} quotes={WORK_Q} cols={three} cap label="The work, eight projects" />
        </section>

        <section id="research" className="ed-page" aria-labelledby="research-h">
          <Folio name="Research" date={date} />
          <div className="ed-res">
            <div className="ed-res-main">
              <p className="ed-kicker">{ch('research').label}, {paper.status}</p>
              <h2 id="research-h" className="ed-hl is-paper">{paper.title}</h2>
              <p className="ed-keys">{paper.keywords.join(' · ')}</p>
              <ul className="ed-res-links">
                {paper.links.map((l) => <li key={l.label}><a href={l.href} target="_blank" rel="noreferrer"><span>{l.label}</span>{l.label === 'DOI' ? paper.doi : host(l.href)}</a></li>)}
              </ul>
              <Story paras={RESEARCH_PARAS} quotes={RESEARCH_Q} cols={two} cap big label="The paper" />
            </div>
            <aside className="ed-wess" aria-labelledby="wess-h">
              <h3 id="wess-h" className="ed-wess-t">{wess.title}</h3>
              <p className="ed-wess-s">{wess.status}</p>
              <p>{wess.abstract}</p>
              <p className="ed-wess-s">{paper.pages} pages, {paper.short}</p>
            </aside>
          </div>
        </section>

        <section id="record" className="ed-page" aria-labelledby="record-h">
          <Folio name="The record" date={date} />
          <h2 id="record-h" className="ed-hl is-2">The record</h2>
          <dl className="ed-stats">
            {STATS.map((s) => <div key={s.label}><dt>{s.label}</dt><dd>{s.to}{s.suffix}</dd></div>)}
          </dl>
          <Story paras={RECORD_PARAS} figs={RECORD_FIGS} cols={() => 1} ragged label="Honours" />
          <div className="ed-off" aria-labelledby="off-h">
            <h3 id="off-h" className="ed-sub">Off the record</h3>
            <p className="ed-aside">{PERSON.aside}</p>
            <div className="ed-off-cols">
              <div><h4>Likes</h4><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h4>Dislikes</h4><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h4>Favourites</h4><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><h4>Courses</h4><ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider}, {c.title}.</b> {c.note}</li>)}</ul></div>
            </div>
          </div>
        </section>

        <section id="back" className="ed-page ed-back" aria-labelledby="back-h">
          <Folio name="Back page" date={date} />
          <div className="ed-back-grid">
            <div id="next" className="ed-next">
              <h2 id="back-h" className="ed-kicker is-big">Up next</h2>
              {DEBATE.next.map((n) => (
                <p key={n.where}><span className="ed-next-w">{n.where}</span><span className="ed-next-e">{n.event}</span></p>
              ))}
            </div>
            <div className="ed-contact">
              <h3 className="ed-sub">Contact</h3>
              <ul>
                {LINKS.map((l) => (
                  <li key={l.label}>
                    <span>{l.label}</span>
                    {l.href ? <a href={l.href} {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>{l.value}</a> : <b>{l.value}</b>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="ed-wrap ed-foot">
        <div className="ed-redrule" aria-hidden="true" />
        <Masthead small as="p" />
        <p className="ed-thised">This edition: {date}</p>
        <p className="ed-nexted">Next edition: his next note.</p>
        <p className="ed-colophon">Draft 89 of the portfolio. Not the live site. Every line of body type is measured and set with pretext by Cheng Lou and contributors, MIT licence. Set in Old Standard TT and Newsreader.</p>
      </footer>
    </div>
  );
}
