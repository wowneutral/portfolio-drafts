// Draft 31: the hash. Every commit he pushes has an ID that will never repeat. The page takes the
// first seven characters of the latest one and uses them to pick from a deck of hand-set
// compositions: where his name sits, which way it runs, the type scale, the grid and which section
// leads. Step back through his commits and the page sets itself the way it looked after each.
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import '@fontsource-variable/bricolage-grotesque/index.css';
import './hash.css';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { ago, useGitHub } from '@/lib/github';
import { formatDate, useNotes } from '@/lib/notes';
import { scrollToY } from '@/lib/scroll';
import { useVersion } from '@/lib/version';
import { decode, fnv, RATIOS, shaOf } from './deck';
import type { Layout, Lead } from './deck';
import { Hero } from './Hero';
import type { Step } from './Hero';
import { Mini } from './Mini';

const BASE = import.meta.env.BASE_URL;
const PAPER = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[] };
const WESSO = RESEARCH[1];
const FONT = '"Bricolage Grotesque Variable", sans-serif';

const Out = ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
  <a className={className ?? 'lk'} href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noreferrer">{children}</a>
);

const Sec = ({ id, title, children, className }: { id: string; title: string; children: ReactNode; className?: string }) => (
  <section id={id} className={'sec ' + (className ?? '')} aria-labelledby={id + '-h'}>
    <h2 id={id + '-h'} className="sh">{title}</h2>
    <div className="sb">{children}</div>
  </section>
);

/** The width of the name at 1px, so it can be set to fill exactly the columns it is given. */
function measure() {
  const c = document.createElement('canvas').getContext('2d');
  if (!c) return null;
  c.font = `800 100px ${FONT}`;
  (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '-4px';
  const one = c.measureText(`${PERSON.first} ${PERSON.last}`).width / 100;
  const two = Math.max(c.measureText(PERSON.first).width, c.measureText(PERSON.last).width) / 100;
  return { one: one * 1.03, two: two * 1.03 };
}

function useWide() {
  const q = '(min-width: 900px)';
  const [w, set] = useState(() => typeof window !== 'undefined' && matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q);
    const f = () => set(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return w;
}

export default function Hash() {
  useVersion('hash');
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const wide = useWide();
  const [idx, setIdx] = useState(0);
  const [em, setEm] = useState({ one: 5.4, two: 3.3 });
  const [probe, setProbe] = useState<string | null>(null);

  // Up to twelve steps back: his commits, or, when GitHub cannot be reached, the last twelve days.
  const steps: Step[] = useMemo(() => {
    const forced = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('seed') : null;
    let list: Step[];
    if (gh.activity.length) {
      list = gh.activity.slice(0, 12).map((a) => ({ seed: shaOf(a.href), label: shaOf(a.href), href: a.href, message: a.message, repo: a.repo, at: a.at }));
    } else {
      const names = gh.repos.map((r) => r.name).join(',');
      list = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(Date.now() - i * 864e5);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return { seed: fnv(iso + '|' + names), label: i === 0 ? 'today’s date' : formatDate(iso, { day: 'numeric', month: 'long' }), date: iso };
      });
    }
    if (forced && /^[0-9a-f]{7}$/i.test(forced)) list[0] = { ...list[0], seed: forced.toLowerCase(), label: 'forced', href: undefined };
    return list;
  }, [gh.activity, gh.repos]);

  const i = Math.min(idx, steps.length - 1);
  const step = steps[i];
  const lay: Layout = decode(probe ?? step.seed);
  const vertical = lay.v && wide;
  const r = RATIOS[lay.ratio];

  const go = useCallback((d: number) => setIdx((x) => Math.max(0, Math.min(steps.length - 1, x + d))), [steps.length]);
  const setTo = (n: number) => {
    scrollToY(0);
    window.setTimeout(() => setIdx(n), 650);
  };

  // Arrow keys step through the commits, unless something that wants arrows has focus.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || t.closest('input,textarea,select,[contenteditable]')) return;
      if (e.key === 'ArrowLeft') { go(1); }
      else if (e.key === 'ArrowRight') { go(-1); }
    };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [go]);

  // Once the face is in: size the name to its columns, then glide it in from the previous commit's place.
  useEffect(() => {
    let live = true;
    const fonts = document.fonts;
    Promise.all([fonts?.load(`800 100px ${FONT}`), fonts?.ready]).catch(() => null).then(() => {
      if (!live) return;
      const m = measure();
      if (m) setEm(m);
      if (steps.length > 1) setProbe(steps[1].seed);
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLayoutEffect(() => { if (probe) setProbe(null); }, [probe]);

  const scale = useMemo(() => {
    const cap = [0, 100, 8.5, 10, 13, 14, 15, 15, 15];
    const s = (k: number) => `min(${(19 * r ** k).toFixed(1)}px, ${cap[k]}vw)`;
    return { '--s1': s(1), '--s2': s(2), '--s3': s(3), '--s4': s(4), '--s5': s(5), '--s6': s(6), '--s7': s(7), '--s8': s(8) } as CSSProperties;
  }, [r]);

  const sections: Record<Lead | 'about' | 'notebook' | 'now' | 'record' | 'off', ReactNode> = {
    debate: (
      <Sec id="debate" title="Debate" key="debate">
        <ol className="wins">
          {DEBATE.wins.map((w) => (
            <li key={w.where} className="win">
              <p className="win-t">{w.title}</p>
              <p className="win-d"><span>{w.event}</span><span>{w.where}</span><span>{w.when}</span></p>
            </li>
          ))}
        </ol>
        <div className="team">
          <div className="team-a">
            <h3 className="team-n">{DEBATE.team.name}</h3>
            <p className="team-r">{DEBATE.team.role}</p>
          </div>
          <div className="team-b">
            <p>{DEBATE.team.line}</p>
            <p className="mute">{DEBATE.team.record}</p>
            <p><Out href={DEBATE.team.href}>skeptical.pages.dev</Out></p>
          </div>
        </div>
        <div className="next">
          <h3 className="next-h">Up next</h3>
          <ul>
            {DEBATE.next.map((n) => (
              <li key={n.where}><span className="next-w">{n.where}</span><span className="mute">{n.event}</span></li>
            ))}
          </ul>
        </div>
      </Sec>
    ),
    about: (
      <Sec id="about" title="About" key="about">
        <div className="about">
          {PERSON.about.map((p, k) => <p key={k}>{p}</p>)}
          <p className="mute aside">{PERSON.aside}</p>
        </div>
      </Sec>
    ),
    research: (
      <Sec id="research" title="Research" key="research">
        <article className="paper">
          <h3 className="paper-t">{PAPER.title}</h3>
          <p className="paper-s mute">{PAPER.status}</p>
          <p className="paper-a">{PAPER.abstract}</p>
          <ul className="kw" aria-label="Keywords">
            {PAPER.keywords.map((k) => <li key={k}>{k}</li>)}
          </ul>
          <ul className="plinks">
            {PAPER.links.map((l) => <li key={l.label}><Out href={l.href}>{l.label}</Out></li>)}
          </ul>
        </article>
        <article className="wesso">
          <h3 className="wesso-t">{WESSO.title}</h3>
          <p className="mute">{WESSO.status}</p>
          <p>{WESSO.abstract}</p>
        </article>
      </Sec>
    ),
    work: (
      <Sec id="work" title="Work" key="work">
        <ul className="works">
          {WORK.map((w) => {
            const body = (
              <>
                <span className="wk-img"><img src={BASE + w.img} alt={`${w.name}, screenshot`} loading="lazy" width={1200} height={750} /></span>
                <span className="wk-txt">
                  <span className="wk-n">{w.name}</span>
                  <span className="wk-k">{w.kind}</span>
                  <span className="wk-l">{w.line}</span>
                  <span className="wk-s mute">{w.stack}</span>
                </span>
              </>
            );
            return (
              <li key={w.slug} className="wk">
                {w.href ? <a className="wk-a" href={w.href} target="_blank" rel="noreferrer">{body}</a> : <div className="wk-a is-off">{body}</div>}
              </li>
            );
          })}
        </ul>
      </Sec>
    ),
    log: (
      <Sec id="log" title="The log" key="log">
        {gh.activity.length ? (
          <ol className="log">
            {steps.map((s, k) => (
              <li key={s.seed + k} className={'lg' + (k === i ? ' is-on' : '')}>
                <a className="sha lg-sha" href={s.href} target="_blank" rel="noreferrer" aria-label={`commit ${s.seed}`}>{s.seed}</a>
                <span className="lg-m">{s.message}</span>
                <span className="lg-r mute">{s.repo}, {s.at ? ago(s.at) : ''}</span>
                <button type="button" className="lg-b" onClick={() => setTo(k)} aria-pressed={k === i} aria-label={`Set the page from ${s.seed}`}>
                  <Mini lay={decode(s.seed)} />
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <div className="days">
            <p className="days-p">GitHub could not be reached from here, so each of the last twelve days sets its own page. Pick one.</p>
            <ol className="days-g">
              {steps.map((s, k) => (
                <li key={s.seed + k}>
                  <button type="button" className={'day' + (k === i ? ' is-on' : '')} onClick={() => setTo(k)} aria-pressed={k === i}>
                    <Mini lay={decode(s.seed)} />
                    <span className="day-l">{s.date ? formatDate(s.date, { day: 'numeric', month: 'short' }) : s.label}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}
        <div className="repos">
          <h3 className="repos-h">Repositories</h3>
          <ul>
            {gh.repos.slice(0, 8).map((rp) => (
              <li key={rp.name}>
                <a className="rp" href={rp.href} target="_blank" rel="noreferrer">
                  <span className="rp-n">{rp.name}</span>
                  <span className="rp-d">{rp.description ?? ''}</span>
                  <span className="rp-l mute">{rp.language ?? ''}{rp.pushedAt ? `, pushed ${ago(rp.pushedAt)}` : ''}</span>
                </a>
              </li>
            ))}
          </ul>
          <p><Out href={GITHUB.href}>github.com/{GITHUB.user}</Out></p>
        </div>
      </Sec>
    ),
    notebook: <Notebook key="notebook" notes={notes} loaded={loaded} />,
    now: (
      <Sec id="now" title="Now" key="now">
        <div className="now">
          <div className="now-r">
            <h3 className="now-h">{NOW.reading.title}</h3>
            <p>{NOW.reading.body}</p>
            <ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
          <div className="now-c">
            <h3 className="now-h">{NOW.club.title}</h3>
            <p>{NOW.club.body}</p>
          </div>
          <p className="now-s">{NOW.status}</p>
        </div>
      </Sec>
    ),
    record: (
      <Sec id="record" title="Record" key="record">
        <ul className="hon">
          {HONORS.map((h) => <li key={h.what}><span className="hon-w">{h.what}</span><span className="mute">{h.detail}</span></li>)}
        </ul>
        <ul className="awards">
          {AWARDS.map((a) => (
            <li key={a.site}>
              <a className="aw" href={a.href} target="_blank" rel="noreferrer">
                <img src={BASE + a.img} alt={`Certificate for ${a.site}`} loading="lazy" width={600} height={850} />
                <span className="aw-n">{a.site}</span>
                <span className="mute">{a.note}</span>
              </a>
            </li>
          ))}
        </ul>
      </Sec>
    ),
    off: (
      <Sec id="off" title="Off the record" key="off">
        <div className="off">
          <div><h3 className="off-h">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <div><h3 className="off-h">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <div><h3 className="off-h">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <div><h3 className="off-h">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider}, {c.title}.</strong> {c.note}</li>)}</ul></div>
        </div>
      </Sec>
    ),
  };

  const canon: (keyof typeof sections)[] = ['debate', 'about', 'research', 'work', 'log', 'notebook', 'now', 'record', 'off'];
  const order = [lay.lead, ...canon.filter((k) => k !== lay.lead)];

  return (
    <div className="v-hash" data-g={lay.grid} style={scale}>
      <a className="skip-x" href="#main">Skip to content</a>
      <Hero lay={lay} vertical={vertical} em={em} step={step} idx={i} total={steps.length} go={go} note={notes[0]} loaded={loaded} probe={!!probe} />
      <main id="main" tabIndex={-1}>
        {order.map((k) => sections[k])}
        <Sec id="contact" title="Contact">
          <ul className="links">
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="ln-l mute">{l.label}</span>
                {l.href ? <Out href={l.href} className="ln-v">{l.value}</Out> : <span className="ln-v">{l.value}</span>}
              </li>
            ))}
          </ul>
        </Sec>
      </main>
      <footer className="end">
        <div className="end-a">
          <Mini lay={lay} className="mini-big" />
        </div>
        <div className="end-b">
          <p className="end-t">
            {i === 0
              ? gh.activity.length ? 'This page was set by his latest commit. The next one sets it again.' : 'This page was set by today’s date. Tomorrow sets it again.'
              : 'You are looking at an older setting of this page.'}
          </p>
          {i > 0 ? <button type="button" className="end-btn" onClick={() => setTo(0)}>Set it from the latest</button> : null}
          <p className="end-f mute">Draft 31 of the portfolio. Not the live site. Set in Bricolage Grotesque.</p>
        </div>
      </footer>
    </div>
  );
}

function Notebook({ notes, loaded }: { notes: { date: string; body: string[] }[]; loaded: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Sec id="notebook" title="Notebook">
      {!loaded ? <p className="mute">Fetching the notes.</p> : !notes.length ? <p className="mute">No notes yet.</p> : (
        <ol className="nb">
          {notes.map((n, k) => {
            const on = open === n.date;
            return (
              <li key={n.date} className={'nb-i' + (on ? ' is-open' : '')}>
                <button type="button" className="nb-b" aria-expanded={on} aria-controls={'nb-' + n.date} onClick={() => setOpen(on ? null : n.date)}>
                  <span className="nb-d">{formatDate(n.date)}</span>
                  <span className="nb-x mute">{k === 0 ? 'On the first screen' : on ? 'Close' : 'Open'}</span>
                </button>
                <div id={'nb-' + n.date} className="nb-body" hidden={!on}>
                  {n.body.map((p, j) => <p key={j}>{p}</p>)}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Sec>
  );
}
