// Draft 91: the layers. Everything he built, taken apart: each project's screenshot on a slab, the
// real stack it runs on in slabs beneath, pulled apart as you scroll and closed as you leave.
// Built on fancy's CSSBox (danielpetho/fancy, MIT), see Box.tsx.
import { useEffect, useRef, useState } from 'react';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/newsreader/opsz.css';
import './layers.css';
import { ArrowUpRight } from 'lucide-react';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { coarse, still } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import Stack, { type Layer } from './Stack';
import Pile from './Pile';

const BASE = import.meta.env.BASE_URL;
const PAPER = RESEARCH[0];
const PRAYER = RESEARCH[1];
const SKEP = WORK[1];
const REST = WORK.filter((x) => x.slug !== 'skeptical');
const host = (href: string) => href.replace(/^https?:\/\//, '').replace(/\/$/, '');
const parts = (stack: string) => stack.split(/,\s*/);

type Open = (src: string, alt: string, from: DOMRect) => void;

const NAV = [['work', 'Work'], ['debate', 'Debate'], ['research', 'Research'], ['today', 'Today'], ['github', 'GitHub'], ['contact', 'Contact']] as const;

function workLayers(x: (typeof WORK)[number]): Layer[] {
  return [
    { img: BASE + x.img, alt: `${x.name} screenshot`, open: true, label: x.name },
    ...parts(x.stack).map((p) => ({ word: p, label: p })),
  ];
}

function Out({ href, children, className = '' }: { href: string; children: React.ReactNode; className?: string }) {
  return <a className={'lx-link ' + className} href={href} rel="noopener">{children}<ArrowUpRight aria-hidden="true" size={18} strokeWidth={1.6} /></a>;
}

/* The screenshot, opened flat: it grows from the slab it came from. */
function Viewer({ shot, close }: { shot: { src: string; alt: string; from: DOMRect } | null; close: () => void }) {
  const img = useRef<HTMLImageElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!shot) return;
    const opener = document.activeElement as HTMLElement | null;
    btn.current?.focus({ preventScroll: true });
    const el = img.current;
    if (el && !still) {
      const to = el.getBoundingClientRect();
      const f = shot.from;
      const sx = f.width / to.width, sy = f.height / to.height;
      const dx = f.left + f.width / 2 - (to.left + to.width / 2), dy = f.top + f.height / 2 - (to.top + to.height / 2);
      el.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
    }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); if (e.key === 'Tab') { e.preventDefault(); btn.current?.focus(); } };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); opener?.focus({ preventScroll: true }); };
  }, [shot, close]);
  if (!shot) return null;
  return (
    <div className="lx-view" role="dialog" aria-modal="true" aria-label={shot.alt} onClick={close}>
      <img ref={img} src={shot.src} alt={shot.alt} />
      <button ref={btn} type="button" className="lx-close" onClick={close}>Close</button>
    </div>
  );
}

function Today() {
  const { notes, loaded } = useNotes();
  const [pick, setPick] = useState(0);
  const note = notes[pick];
  const others = notes.map((n, i) => ({ n, i })).filter((x) => x.i !== pick);
  return (
    <div className="lx-today">
      <h2 id="today" className="lx-h2">Today</h2>
      <p className="lx-quiet">His daily note, newest on top.</p>
      <div className="lx-sheets">
        <article className="lx-sheet is-top" key={note?.date ?? 'wait'} aria-live="polite">
          {note ? (
            <>
              <p className="lx-date"><time dateTime={note.date}>{formatDate(note.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></p>
              {note.body.map((p, i) => <p className="lx-note" key={i}>{p}</p>)}
            </>
          ) : (
            <>
              <p className="lx-date">{loaded ? 'No note yet' : 'Fetching today'}</p>
              <p className="lx-note">{loaded ? NOW.status : 'The latest note is on its way to the top of the pile.'}</p>
            </>
          )}
        </article>
        {others.length > 0 && (
          <ol className="lx-under" aria-label="Earlier notes">
            {others.map(({ n, i }, k) => (
              <li key={n.date} style={{ ['--k' as string]: k }}>
                <button type="button" onClick={() => setPick(i)}>
                  <span>{formatDate(n.date)}</span>
                  <span className="lx-under-go">{i === 0 ? 'Latest' : 'Open'}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function GitHubPlate() {
  const gh = useGitHub();
  const commits = gh.activity.slice(0, 9);
  const sheets = commits.length ? commits.map((c) => c.message) : gh.repos.slice(0, 6).map((r) => r.name);
  return (
    <div className="lx-gh">
      <h2 id="github" className="lx-h2">Live from GitHub</h2>
      <p className="lx-quiet">{commits.length ? 'One sheet per commit, newest on top. The pile is taller on weeks he ships.' : 'One sheet per repository.'}</p>
      <Pile sheets={sheets} w={420} h={270} t={30} name="The commit pile" top="wowneutral" className="lx-gh-pile" />
      {commits.length > 0 && (
        <ol className="lx-commits" aria-label="Recent commits">
          {commits.map((c, i) => (
            <li key={c.href + i}>
              <a href={c.href} rel="noopener">{c.message}</a>
              <span>{c.repo} <span aria-hidden="true">/</span> {ago(c.at)}</span>
            </li>
          ))}
        </ol>
      )}
      <ul className="lx-repos" aria-label="Repositories">
        {gh.repos.slice(0, 6).map((r) => (
          <li key={r.name}>
            <a href={r.href} rel="noopener">{r.name}</a>
            {r.description && <p>{r.description}</p>}
            {r.language && <span>{r.language}</span>}
          </li>
        ))}
      </ul>
      <Out href={GITHUB.href}>github.com/{GITHUB.user}</Out>
    </div>
  );
}

export default function Layers() {
  useVersion('layers');
  const [shot, setShot] = useState<{ src: string; alt: string; from: DOMRect } | null>(null);
  const open: Open = (src, alt, from) => setShot({ src, alt, from });

  return (
    <div className="v-layers">
      <a className="skip-x" href="#main">Skip to content</a>
      <header className="lx-top">
        <a className="lx-mark" href="#top">Armaan Seth</a>
        <nav aria-label="Sections">
          <ul>{NAV.map(([id, label]) => <li key={id}><a href={'#' + id}>{label}</a></li>)}</ul>
        </nav>
      </header>

      <main id="main">
        {/* The opening: the Skeptical site, taken apart. */}
        <section className="lx-plate lx-hero" id="top" aria-labelledby="h-name">
          <div className="lx-copy">
            <h1 id="h-name" className="lx-name"><span>Armaan</span> <span>Seth</span></h1>
            <p className="lx-line">{PERSON.line}</p>
            <p className="lx-role">{DEBATE.team.role} of {DEBATE.team.name}</p>
            <div className="lx-caption">
              <p className="lx-kind">The drawing: {SKEP.name}, {SKEP.kind.toLowerCase()}</p>
              <p>{SKEP.line}</p>
              <Out href={SKEP.href}>{host(SKEP.href)}</Out>
            </div>
            <p className="lx-hint">{coarse ? 'Tap the screenshot to open it.' : 'Drag the drawing to turn it. Click the screenshot to open it.'}</p>
          </div>
          <Stack name={`${SKEP.name}, taken apart into its stack`} layers={workLayers(SKEP)} w={430} h={269} gap={100} onOpen={open} className="lx-hero-draw" />
        </section>

        <section className="lx-plate lx-debate" id="debate" aria-labelledby="h-debate">
          <div className="lx-copy">
            <h2 id="h-debate" className="lx-h2">Debate</h2>
            <ol className="lx-wins">
              {DEBATE.wins.map((w) => (
                <li key={w.where}>
                  <p className="lx-win">{w.title}</p>
                  <p className="lx-win-ev">{w.event}, {w.where}, {w.when}</p>
                </li>
              ))}
            </ol>
            <div className="lx-team">
              <h3 className="lx-h3">{DEBATE.team.name}</h3>
              <p className="lx-kind">{DEBATE.team.role}</p>
              <p>{DEBATE.team.line}</p>
              <p>{DEBATE.team.record}</p>
              <Out href={DEBATE.team.href}>{host(DEBATE.team.href)}</Out>
            </div>
            <div className="lx-next">
              <h3 className="lx-h4">Up next</h3>
              <ul>{DEBATE.next.map((x) => <li key={x.where}>{x.event}, {x.where}</li>)}</ul>
            </div>
          </div>
          <Stack name="Debate, as a stack: two championships on top of Skeptical" w={440} h={210} t={30} gap={118}
            layers={[
              ...DEBATE.wins.map((w) => ({ word: w.where, label: `Champion, ${w.event}`, tone: 'orange' as const })),
              { word: DEBATE.team.name, label: DEBATE.team.role },
            ]} />
        </section>

        <section className="lx-read" id="about" aria-labelledby="h-about">
          <h2 id="h-about" className="lx-h2">About</h2>
          <div className="lx-read-body">
            {PERSON.about.map((p) => <p key={p.slice(0, 12)}>{p}</p>)}
            <p className="lx-aside">{PERSON.aside}</p>
          </div>
        </section>

        <div id="work" className="lx-work-head">
          <h2 className="lx-h2">The work, taken apart</h2>
          <p className="lx-quiet">Each screenshot on top, the stack it really runs on beneath.</p>
          <ul className="lx-index" aria-label="Projects">
            <li><a href="#top">{SKEP.name}</a></li>
            {REST.map((x) => <li key={x.slug}><a href={'#w-' + x.slug}>{x.name}</a></li>)}
          </ul>
        </div>
        {REST.map((x, i) => (
          <section className="lx-plate lx-work" key={x.slug} id={'w-' + x.slug} aria-labelledby={'h-' + x.slug}>
            <div className="lx-copy">
              <h3 id={'h-' + x.slug} className="lx-h3 lx-big">{x.name}</h3>
              <p className="lx-kind">{x.kind}</p>
              <p>{x.line}</p>
              <p className="lx-built"><span>Built with</span> {x.stack}</p>
              {x.href && <Out href={x.href}>{host(x.href)}</Out>}
            </div>
            <Stack name={`${x.name}, taken apart into its stack`} layers={workLayers(x)} w={460} h={288} gap={104} ry={i % 2 ? 18 : -20} rx={i % 2 ? 26 : 30} onOpen={open} />
          </section>
        ))}

        <section className="lx-plate lx-research" id="research" aria-labelledby="h-research">
          <div className="lx-copy">
            <h2 id="h-research-k" className="lx-h2">Research</h2>
            <h3 id="h-research" className="lx-paper">{PAPER.title}</h3>
            <p className="lx-kind">{PAPER.status}, {PAPER.pages} pages, DOI {PAPER.doi}</p>
            <p>{PAPER.abstract}</p>
            <p className="lx-keys"><span>Keywords</span> {PAPER.keywords!.join(', ')}</p>
            <ul className="lx-paper-links">{PAPER.links.map((l) => <li key={l.label}><Out href={l.href}>{l.label}</Out></li>)}</ul>
            <div className="lx-prayer">
              <h3 className="lx-h4">{PRAYER.title}</h3>
              <p className="lx-kind">{PRAYER.status}</p>
              <p>{PRAYER.abstract}</p>
            </div>
          </div>
          <Stack name="The paper, as a stack: its title on top of the three ladders it traces" w={440} h={250} gap={92}
            layers={[
              { node: <span className="lx-title-face" aria-hidden="true">{PAPER.short}</span>, tone: 'paper', label: 'The paper' },
              ...PAPER.ladders!.map((l) => ({ word: l.who, label: `${l.who}, ${l.when}` })),
            ]} />
        </section>

        <section className="lx-daily" aria-label="Today, now, and Live from GitHub">
          <div className="lx-daily-l">
            <Today />
          <div className="lx-now" id="now">
            <div className="lx-now-copy">
              <h2 id="h-now" className="lx-h2">Now</h2>
              <p className="lx-status">{NOW.status}</p>
              <div className="lx-now-cols">
                <div>
                  <h3 className="lx-h4">{NOW.reading.title}</h3>
                  <p>{NOW.reading.body}</p>
                </div>
                <div>
                  <h3 className="lx-h4">{NOW.club.title}</h3>
                  <p>{NOW.club.body}</p>
                </div>
              </div>
            </div>
            <Pile sheets={[...NOW.reading.shelves]} w={330} h={220} t={40} rx={50} ry={-24} name="The reading pile, one sheet per shelf" className="lx-shelf" />
          </div>
          </div>
          <GitHubPlate />
        </section>


        <section className="lx-plate lx-record" id="record" aria-labelledby="h-record">
          <div className="lx-copy">
            <h2 id="h-record" className="lx-h2">Record</h2>
            <ol className="lx-honors">
              {HONORS.map((h) => <li key={h.what}><span>{h.what}</span><span>{h.detail}</span></li>)}
            </ol>
            <ul className="lx-awards">
              {AWARDS.map((a) => <li key={a.site}><Out href={a.href}>{a.site}</Out><span>{a.note}</span></li>)}
            </ul>
          </div>
          <Stack name="The two WD Awards certificates" w={250} h={350} t={8} gap={120} rx={26} ry={-24}
            layers={AWARDS.map((a) => ({ img: BASE + a.img, alt: `${a.site} certificate`, href: a.href, label: a.site }))} />
        </section>

        <section className="lx-off" aria-labelledby="h-off">
          <h2 id="h-off" className="lx-h2">Off the record</h2>
          <div className="lx-off-cols">
            <div><h3 className="lx-h4">Likes</h3><ul>{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="lx-h4">Dislikes</h3><ul>{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="lx-h4">Favourites</h3><ul>{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div><h3 className="lx-h4">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><strong>{c.provider} {c.title}</strong> {c.note}</li>)}</ul></div>
          </div>
        </section>

        {/* The ending: every layer closes into one, and it turns to face you. */}
        <section className="lx-end" id="contact" aria-labelledby="h-contact">
          <div className="lx-end-copy">
            <h2 id="h-contact" className="lx-h2">Contact</h2>
            <ul className="lx-links">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <span>{l.label}</span>
                  {l.href ? <a href={l.href} rel="noopener">{l.value}</a> : <span className="lx-plain">{l.value}</span>}
                </li>
              ))}
            </ul>
          </div>
          <Stack name="Every layer, closed into one" mode="end" rail={false} w={520} h={300} t={10} gap={70} rx={34} ry={-22}
            layers={[
              { node: <span className="lx-card"><span className="lx-card-name">Armaan Seth</span><a className="lx-card-mail" href="mailto:founder@mitez.org">founder@mitez.org</a></span>, tone: 'ink' },
              ...WORK.slice(0, 7).map((x) => ({ img: BASE + x.img })),
            ]} className="lx-end-draw" />
        </section>
      </main>

      <footer className="lx-foot">
        <p>Draft 91 of the portfolio. Not the live site.</p>
        <p>Slabs built on CSSBox from fancy by Daniel Petho, MIT licence.</p>
      </footer>
      <Viewer shot={shot} close={() => setShot(null)} />
    </div>
  );
}
