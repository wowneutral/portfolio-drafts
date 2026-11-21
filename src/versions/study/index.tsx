// Draft 64: the study. One apple on an olive table, painted live like a quick oil sketch.
// The pointer wipes the paint and the photograph shows through; the paint closes back over it.
// Stage remixed from pmndrs/examples "kuwahara" (MIT); see Stage.tsx.
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/fraunces/opsz-italic.css';
import '@fontsource-variable/instrument-sans';
import './study.css';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB, CHAPTERS } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { scrollToId } from '@/lib/scroll';
import { coarse, isPhone, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import { st, type StopName } from './store';

const Stage = lazy(() => import('./Stage'));
const BASE = import.meta.env.BASE_URL;
const PAPER = RESEARCH[0] as (typeof RESEARCH)[0] & { epigraph: { text: string; source: string }; keywords: string[]; pages: number; doi: string };
const WESSO = RESEARCH[1];

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const Ext = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

const NAV: { id: string; label: string }[] = [
  { id: 'about', label: 'About' },
  { id: 'debate', label: 'Debate' },
  { id: 'work', label: 'Work' },
  { id: 'research', label: 'Research' },
  { id: 'today', label: 'Today' },
  { id: 'record', label: 'Record' },
  { id: 'contact', label: 'Contact' },
];

/** The two appearances of one apple, for no WebGL and reduced motion. */
function Diptych() {
  return (
    <div className="diptych">
      <figure>
        <img src={BASE + 'study/painted.jpg'} alt="The apple on the olive table, painted as a quick oil sketch." width={720} height={900} />
        <figcaption>Painted</figcaption>
      </figure>
      <figure>
        <img src={BASE + 'study/photo.jpg'} alt="The same apple on the same table, photographed." width={720} height={900} />
        <figcaption>Photographed</figcaption>
      </figure>
    </div>
  );
}

function Win({ end }: { end?: boolean }) {
  return <div className={end ? 'win end' : 'win'} aria-hidden="true" />;
}

export default function Study() {
  useVersion('study');
  const root = useRef<HTMLDivElement>(null);
  const [webgl] = useState(hasWebGL);
  const flat = still || !webgl;
  const { notes, loaded } = useNotes();
  const gh = useGitHub();
  const [latest, ...earlier] = notes;

  // Which section holds the camera, and (on phones) which window the apple sits in.
  useEffect(() => {
    const el = root.current;
    if (!el || flat) return;
    st.autoAt = still ? -1 : 0;
    let raf = 0;
    const read = () => {
      raf = 0;
      const vh = window.innerHeight;
      st.phone = isPhone();
      let stop = 'open' as StopName;
      el.querySelectorAll<HTMLElement>('[data-stop]').forEach((s) => {
        if (s.getBoundingClientRect().top < vh * 0.55) stop = s.dataset.stop as StopName;
      });
      if (stop !== st.stop) st.stop = stop;
      st.swap = stop === 'research' ? 1 : 0;
      st.keep = stop === 'contact';
      if (st.phone) {
        let best = -1, cy = st.cy;
        el.querySelectorAll<HTMLElement>('.win').forEach((w) => {
          const r = w.getBoundingClientRect();
          const vis = Math.min(r.bottom, vh) - Math.max(r.top, 0);
          if (vis > best) { best = vis; cy = (r.top + r.height / 2) / vh; }
        });
        st.cy = cy;
      }
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, [flat]);

  const go = (id: string) => (e: React.MouseEvent) => { e.preventDefault(); scrollToId(id); };
  const [lead, ...rest] = PAPER.abstract.split('? ');

  return (
    <div className={'v-study' + (flat ? ' is-flat' : '')} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      <div className="stage" aria-hidden={flat ? undefined : true}>
        {flat ? <Diptych /> : <Suspense fallback={null}><Stage /></Suspense>}
      </div>

      <main id="main">
        <Win />
        <section className="sheet open" data-stop="open" aria-labelledby="name">
          <h1 id="name"><span>Armaan</span> <span>Seth</span></h1>
          <p className="line">{PERSON.line}</p>
          <nav aria-label="Sections" className="toc">
            <ul>
              {NAV.map((n) => <li key={n.id}><a href={'#' + n.id} onClick={go(n.id)}>{n.label}</a></li>)}
            </ul>
          </nav>
          <p className="doubt">Two appearances of one apple, a painting and a photograph. The skeptics asked which one you ever see.</p>
          <p className="hint">{flat ? 'A study of one apple, twice.' : coarse ? 'Drag sideways across the apple to wipe the paint.' : 'Wipe the paint.'}</p>
        </section>

        <Win />
        <section className="sheet" id="about" data-stop="about" aria-labelledby="about-h">
          <h2 id="about-h">About</h2>
          {PERSON.about.map((p) => <p key={p.slice(0, 20)} className="body">{p}</p>)}
          <p className="aside">{PERSON.aside}</p>
        </section>

        <Win />
        <section className="sheet debate" id="debate" data-stop="debate" aria-labelledby="debate-h">
          <h2 id="debate-h">{CHAPTERS[1].title}</h2>
          <ol className="wins">
            {DEBATE.wins.map((w) => (
              <li key={w.where}>
                <p className="win-title">{w.title}</p>
                <p className="win-where">{w.where}</p>
                <p className="win-event">{w.event}, {w.when}</p>
              </li>
            ))}
          </ol>
          <div className="next">
            <h3>Up next</h3>
            <ul>
              {DEBATE.next.map((n) => <li key={n.where}><span className="n-where">{n.where}</span> <span className="n-event">{n.event}</span></li>)}
            </ul>
          </div>
          <div className="team">
            <h3 className="team-name">{DEBATE.team.name}</h3>
            <p className="team-role">{DEBATE.team.role}</p>
            <p className="body">{DEBATE.team.line}</p>
            <p className="body">{DEBATE.team.record}</p>
            <p className="links-row"><Ext href={DEBATE.team.href}>skeptical.pages.dev</Ext> <Ext href={DEBATE.team.github}>The team site on GitHub</Ext></p>
          </div>
        </section>

        <Win />
        <section className="sheet wide" id="work" data-stop="work" aria-labelledby="work-h">
          <h2 id="work-h">Work</h2>
          <p className="lede">Eight things he built, as prints. These ones are never painted.</p>
          <ul className="prints">
            {WORK.map((w) => (
              <li key={w.slug} className="print">
                <div className="mat">
                  <img src={BASE + w.img} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={750} />
                </div>
                <div className="cap">
                  <h3>{w.href ? <Ext href={w.href}>{w.name}</Ext> : w.name}</h3>
                  <p className="kind">{w.kind}</p>
                </div>
                <p className="body small">{w.line}</p>
                <p className="stack">{w.stack}</p>
              </li>
            ))}
          </ul>
        </section>

        <Win />
        <section className="sheet research" id="research" data-stop="research" aria-labelledby="research-h">
          <p className="swapnote">{flat ? 'Research' : 'Here the photograph rests, and your pointer lays the paint.'}</p>
          <h2 id="research-h" className="paper-title">{PAPER.title}</h2>
          <p className="status">{PAPER.status}, {PAPER.pages} pages. DOI {PAPER.doi}</p>
          <p className="question">{lead}?</p>
          <p className="body">{rest.join('? ')}</p>
          <blockquote className="epi">
            <p>{PAPER.epigraph.text}</p>
            <footer>{PAPER.epigraph.source}</footer>
          </blockquote>
          <h3 className="sub">Keywords</h3>
          <p className="keys">{PAPER.keywords.join(', ')}</p>
          <ul className="plinks">
            {PAPER.links.map((l) => <li key={l.label}><Ext href={l.href}>{l.label}</Ext></li>)}
          </ul>
          <div className="wesso">
            <h3>{WESSO.title}</h3>
            <p className="status">{WESSO.status}</p>
            <p className="body">{WESSO.abstract}</p>
          </div>
        </section>

        <Win />
        <section className="sheet today" id="today" data-stop="today" aria-labelledby="today-h">
          <h2 id="today-h">Today</h2>
          {latest ? (
            <article className="note">
              <p className="note-date"><time dateTime={latest.date}>{formatDate(latest.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></p>
              {latest.body.map((p, i) => <p key={i} className="note-body">{p}</p>)}
            </article>
          ) : (
            <p className="note-body quiet">{loaded ? 'No note yet today.' : 'Fetching the latest note.'}</p>
          )}
          {earlier.length > 0 && (
            <details className="earlier">
              <summary>Earlier notes ({earlier.length})</summary>
              <ol>
                {earlier.map((n) => (
                  <li key={n.date}>
                    <p className="note-date"><time dateTime={n.date}>{formatDate(n.date)}</time></p>
                    {n.body.map((p, i) => <p key={i} className="body small">{p}</p>)}
                  </li>
                ))}
              </ol>
            </details>
          )}

          <div className="gh">
            <h2 id="gh-h">Live from GitHub</h2>
            {gh.activity.length > 0 && (
              <>
                <h3 className="sub">Latest commits</h3>
                <ol className="commits">
                  {gh.activity.slice(0, 6).map((a) => (
                    <li key={a.href}>
                      <a href={a.href} rel="noopener"><span className="c-msg">{a.message}</span></a>
                      <span className="c-meta">{a.repo}, {ago(a.at)}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
            <h3 className="sub">{gh.live ? 'Repositories, most recently pushed' : 'Repositories'}</h3>
            <ul className="repos">
              {gh.repos.slice(0, 6).map((r) => (
                <li key={r.name}>
                  <a href={r.href} rel="noopener" className="r-name">{r.name}</a>
                  {r.description && <span className="r-desc">{r.description}</span>}
                  <span className="r-meta">{[r.language, r.pushedAt ? 'pushed ' + ago(r.pushedAt) : null].filter(Boolean).join(', ')}</span>
                </li>
              ))}
            </ul>
            <p className="links-row"><Ext href={GITHUB.href}>All of it at github.com/wowneutral</Ext></p>
          </div>
        </section>

        <Win />
        <section className="sheet record" id="record" data-stop="record" aria-labelledby="record-h">
          <h2 id="record-h">Now</h2>
          <div className="now">
            <div>
              <h3>{NOW.reading.title}</h3>
              <p className="body">{NOW.reading.body}</p>
              <p className="shelves">{NOW.reading.shelves.join(' / ')}</p>
            </div>
            <div>
              <h3>{NOW.club.title}</h3>
              <p className="body">{NOW.club.body}</p>
            </div>
            <p className="status-line">{NOW.status}</p>
          </div>

          <h2 className="h-gap">Record</h2>
          <ol className="honors">
            {HONORS.map((h) => <li key={h.what}><span className="h-what">{h.what}</span><span className="h-detail">{h.detail}</span></li>)}
          </ol>
          <ul className="certs">
            {AWARDS.map((a) => (
              <li key={a.site}>
                <a href={a.href} rel="noopener" className="cert">
                  <span className="mat"><img src={BASE + a.img} alt={`Certificate: ${a.site}, ${a.note}`} loading="lazy" width={600} height={850} /></span>
                  <span className="cert-name">{a.site}</span>
                  <span className="cert-note">{a.note}</span>
                </a>
              </li>
            ))}
          </ul>

          <h2 className="h-gap">Off the record</h2>
          <div className="off">
            <div><h3>Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3>Courses</h3><ul>{COURSES.map((c) => <li key={c.title}>{c.provider}, {c.title}: {c.note}</li>)}</ul></div>
          </div>
        </section>

        <Win />
        <section className="sheet contact" id="contact" data-stop="contact" aria-labelledby="contact-h">
          <h2 id="contact-h">Write to him</h2>
          <ul className="contacts">
            {LINKS.map((l) => (
              <li key={l.label}>
                <span className="l-label">{l.label}</span>
                {l.href ? <Ext href={l.href} className="l-value">{l.value}</Ext> : <span className="l-value">{l.value}</span>}
              </li>
            ))}
          </ul>
          <p className="closing">{flat ? 'Two appearances of one apple. The page never says which one is the apple.' : 'From up here, whatever you wipe now stays wiped.'}</p>
          <footer className="foot">
            <p>Draft 64 of the portfolio. Not the live site.</p>
            <p>The apple is food_apple_01 from Poly Haven, CC0. The oil pass is the Kuwahara effect from postprocessing, after the pmndrs kuwahara example, MIT.</p>
          </footer>
        </section>
        <Win end />
      </main>
    </div>
  );
}
