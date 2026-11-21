// Draft 65, the noun. One paragraph of the nouns of his life; the ones that name a real thing are in ink,
// and pointing at one brings that thing onto the stage beside it. Base: pmndrs/examples dbismut-furniture (MIT).
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import '@fontsource/schibsted-grotesk/400.css';
import '@fontsource/schibsted-grotesk/600.css';
import '@fontsource/schibsted-grotesk/800.css';
import './noun.css';
import { PERSON, DEBATE, RESEARCH, WORK, HONORS, AWARDS, NOW, LIKES, DISLIKES, FAVOURITES, COURSES, LINKS, GITHUB } from '@/content';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { scrollToId } from '@/lib/scroll';
import { coarse, isPhone } from '@/lib/utils';
import { useVersion } from '@/lib/version';
import type { Live, ThingId } from './things';

const Stage = lazy(() => import('./Stage'));
const Trophies = lazy(() => import('./Trophies'));
const BASE = import.meta.env.BASE_URL;
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { epigraph: { text: string; source: string }; keywords: string[]; pages: number; doi: string }, wess = RESEARCH[1];
const work = (slug: string) => WORK.find((w) => w.slug === slug)!;

type Noun = { w: string; to: string; thing?: ThingId; what?: string };
const NOUNS: Noun[] = [
  { w: 'Lincoln-Douglas', to: 'debate' },
  { w: DEBATE.wins[0].where, to: 'debate', thing: 'fbk', what: 'the championship, as heavy black type' },
  { w: DEBATE.wins[1].where, to: 'debate', thing: 'wildcat', what: 'the championship, as heavy black type' },
  { w: DEBATE.team.name, to: 'skeptical', thing: 'q', what: 'a red question mark' },
  { w: 'Mauthner', to: 'research' },
  { w: 'Wittgenstein', to: 'research' },
  { w: 'Sextus Empiricus', to: 'research' },
  { w: paper.short, to: 'research', thing: 'paper', what: 'the paper as fifteen bound sheets' },
  { w: wess.short, to: 'wessobrunn' },
  ...['mitez', 'lastseen', 'lastsearch', 'spread', 'rogue', 'jarvis'].map((s) => ({ w: work(s).name, to: 'w-' + s, thing: `print:${s}` as ThingId, what: 'a print of the screenshot' })),
  { w: 'GitHub', to: 'github', thing: 'github', what: 'a black block with the live count' },
  { w: 'Today', to: 'today', thing: 'today', what: 'a card with the latest note' },
  { w: 'Tea', to: 'off', thing: 'tea', what: 'a porcelain teacup' },
  { w: 'Laufey', to: 'off' },
  { w: 'Interstellar', to: 'off' },
  { w: 'Air rifle', to: 'about' },
  { w: 'Plato', to: 'off', thing: 'plato', what: 'his bust, seen from behind' },
  { w: PERSON.name, to: 'contact' },
];

function hasWebGL() {
  if (new URLSearchParams(location.search).has('flat')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const Ext = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
  <a className={className} href={href} rel={href.startsWith('http') ? 'noopener' : undefined}>{children}</a>
);

export default function Noun() {
  useVersion('noun');
  const root = useRef<HTMLDivElement>(null);
  const band = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(isPhone);
  const [webgl] = useState(hasWebGL);
  const [active, setActive] = useState(1);
  const [seen, setSeen] = useState<Set<number>>(() => new Set([1]));
  const [section, setSection] = useState<ThingId | null>(null);
  const [bandIn, setBandIn] = useState(false);
  const [stageOut, setStageOut] = useState(false);
  const { notes, loaded } = useNotes();
  const gh = useGitHub();
  const [latest, ...earlier] = notes;

  useEffect(() => {
    const on = () => setPhone(isPhone());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  // Which thing the stage holds below the opening: the [data-thing] block across the reading line.
  useEffect(() => {
    const el = root.current; if (!el) return;
    let raf = 0;
    const pick = () => {
      raf = 0;
      const vh = window.innerHeight, line = isPhone() ? vh * 0.62 : vh * 0.5;
      let got: ThingId | null = null;
      for (const s of el.querySelectorAll<HTMLElement>('[data-thing]')) {
        const r = s.getBoundingClientRect();
        if (r.top <= line && r.bottom > line) got = s.dataset.thing as ThingId;
      }
      setSection(got);
      const b = band.current?.getBoundingClientRect();
      const inBand = !!b && b.bottom > 0 && b.top < vh;
      setBandIn(inBand);
      setStageOut(!!b && b.top < vh * 0.88 && b.bottom > vh * (isPhone() ? 0.38 : 0.1));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(pick); };
    pick();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, []);

  const point = (i: number) => {
    setActive(i);
    setSeen((s) => (s.has(i) ? s : new Set(s).add(i)));
  };
  const go = (e: React.MouseEvent, i: number) => {
    // On touch, the first tap shows the thing; the second follows the word to its section.
    if (coarse && active !== i) { e.preventDefault(); point(i); return; }
    e.preventDefault();
    scrollToId(NOUNS[i].to, phone ? -Math.round(window.innerHeight * 0.36) : 0);
  };

  const live: Live = useMemo(() => ({
    count: gh.commitsThisMonth ?? gh.repos.length,
    countLabel: gh.commitsThisMonth != null ? 'commits this month' : 'repositories',
    noteDate: latest ? formatDate(latest.date) : '',
    noteLine: latest?.body[0] ?? (loaded ? 'No note yet.' : ''),
  }), [gh, latest, loaded]);

  const heroThing: ThingId = NOUNS[active].thing ?? 'none';
  const want: ThingId = section ?? heroThing;
  const flat = !webgl;

  return (
    <div className={`v-noun${phone ? ' is-phone' : ''}${flat ? ' is-flat' : ''}${stageOut ? ' stage-out' : ''}`} ref={root}>
      <a className="skip-x" href="#main">Skip to content</a>
      {!flat && (
        <div className="stage" aria-hidden="true">
          <Suspense fallback={null}><Stage want={want} live={live} phone={phone} paused={stageOut} /></Suspense>
        </div>
      )}

      <main id="main">
        <header className="open" id="top">
          <h1 className="name">{PERSON.name}</h1>
          <p className="line">{PERSON.line}</p>
          <nav className="nouns" aria-label="The nouns, each one a section">
            {NOUNS.map((n, i) => (
              <a key={n.w} href={'#' + n.to}
                className={`${n.thing ? 'lit' : 'dim'}${i === active ? ' on' : ''}`}
                onPointerEnter={(e) => { if (e.pointerType === 'mouse') point(i); }}
                onFocus={() => point(i)}
                onClick={(e) => go(e, i)}
                aria-describedby={n.what ? 'what-' + i : undefined}
              >{n.w}.</a>
            )).flatMap((el, i) => (i ? [' ', el] : [el]))}
          </nav>
          <div hidden>{NOUNS.map((n, i) => n.what && <span key={i} id={'what-' + i}>Shows {n.what}.</span>)}</div>
          <p className="hint">{flat ? 'Every word opens its section.' : coarse ? 'Tap a word in ink, then tap again to go there.' : 'Point at a word in ink. Click to go there.'}</p>
        </header>

        <section id="debate" className="debate" aria-labelledby="h-debate">
          <h2 id="h-debate" className="noun col">Lincoln-Douglas.</h2>
          <div className="setpiece" ref={band}>
          <div className="band" aria-hidden="true">
            {!flat && <Suspense fallback={null}><Trophies phone={phone} paused={!bandIn} /></Suspense>}
          </div>
          <ol className="wins">
            {DEBATE.wins.map((w) => (
              <li key={w.where}>
                <p className="champ">{w.title}</p>
                <p className="event">{w.event}</p>
                <p className="where">{w.where}, {w.when}</p>
              </li>
            ))}
          </ol>
          </div>
          <div className="col next" data-thing="wildcat">
            <h3 className="small">Up next</h3>
            <ul className="rows">
              {DEBATE.next.map((n) => <li key={n.where}><b>{n.where}</b><span>{n.event}</span></li>)}
            </ul>
          </div>
        </section>

        <section id="skeptical" className="col sec" data-thing="q" aria-labelledby="h-skep">
          <h2 id="h-skep" className="noun">{DEBATE.team.name}.</h2>
          <p className="role">{DEBATE.team.role}</p>
          <p className="lede">{DEBATE.team.line}</p>
          <p className="body">{DEBATE.team.record}</p>
          <Ext className="go" href={DEBATE.team.href}>skeptical.pages.dev</Ext>
        </section>

        <section id="about" className="col sec" data-thing="q" aria-labelledby="h-about">
          <h2 id="h-about" className="noun">{PERSON.short.join(' ')}</h2>
          {PERSON.about.map((p) => <p key={p.slice(0, 16)} className="body">{p}</p>)}
          <p className="body soft">{PERSON.aside}</p>
        </section>

        <section id="research" className="col sec" data-thing="paper" aria-labelledby="h-paper">
          <h2 id="h-paper" className="noun">{paper.short}.</h2>
          <p className="title">{paper.title}</p>
          <p className="meta">{paper.status}, {paper.pages} pages</p>
          <p className="lede">{paper.abstract}</p>
          <figure className="epi">
            <blockquote>{paper.epigraph.text}</blockquote>
            <figcaption>{paper.epigraph.source}</figcaption>
          </figure>
          <h3 className="small">Keywords</h3>
          <p className="keys">{paper.keywords.join(', ')}</p>
          <ul className="links">
            {paper.links.map((l) => <li key={l.label}><Ext href={l.href}>{l.label}</Ext></li>)}
          </ul>
          <div className="wess" id="wessobrunn">
            <h3 className="sub">{wess.short}.</h3>
            <p className="meta">{wess.title}. {wess.status}.</p>
            <p className="body">{wess.abstract}</p>
          </div>
        </section>

        <section id="work" className="work" aria-labelledby="h-work">
          <h2 id="h-work" className="sr-only-x">Work</h2>
          {WORK.map((w) => (
            <article key={w.slug} id={'w-' + w.slug} className="col piece" data-thing={`print:${w.slug}`} aria-labelledby={'h-' + w.slug}>
              <h3 id={'h-' + w.slug} className="noun">{w.name}.</h3>
              <p className="role">{w.kind}</p>
              {w.href ? (
                <a className="shot" href={w.href} rel="noopener"><img src={BASE + w.img} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={680} /></a>
              ) : (
                <div className="shot"><img src={BASE + w.img} alt={`${w.name}, a screenshot`} loading="lazy" width={1200} height={680} /></div>
              )}
              <p className="body">{w.line}</p>
              <p className="meta">{w.stack}</p>
              {w.href ? <Ext className="go" href={w.href}>{w.href.replace(/^https:\/\//, '').replace(/\/$/, '')}</Ext> : <p className="meta">No public link.</p>}
            </article>
          ))}
        </section>

        <section id="github" className="col sec" data-thing="github" aria-labelledby="h-gh">
          <h2 id="h-gh" className="noun">GitHub.</h2>
          <p className="count"><b>{live.count}</b> {live.countLabel}{gh.live ? ', live from GitHub' : ''}</p>
          {gh.activity.length > 0 && (
            <>
              <h3 className="small">Recent commits</h3>
              <ul className="rows commits">
                {gh.activity.slice(0, 6).map((a) => (
                  <li key={a.href}><a href={a.href} rel="noopener"><b>{a.message}</b><span>{a.repo}, {ago(a.at)}</span></a></li>
                ))}
              </ul>
            </>
          )}
          <h3 className="small">Repositories</h3>
          <ul className="rows repos">
            {gh.repos.slice(0, 8).map((r) => (
              <li key={r.name}><a href={r.href} rel="noopener"><b>{r.name}</b><span>{r.description ?? 'No description.'}{r.language ? `, ${r.language}` : ''}</span></a></li>
            ))}
          </ul>
          <Ext className="go" href={GITHUB.href}>github.com/{GITHUB.user}</Ext>
        </section>

        <section id="today" className="col sec" data-thing="today" aria-labelledby="h-today">
          <h2 id="h-today" className="noun">Today.</h2>
          {latest ? (
            <article className="note">
              <p className="date"><time dateTime={latest.date}>{formatDate(latest.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time></p>
              {latest.body.map((p, i) => <p key={i} className={i === 0 ? 'lede' : 'body'}>{p}</p>)}
            </article>
          ) : (
            <p className="lede soft">{loaded ? 'No note yet. Check back tomorrow.' : 'Fetching the latest note.'}</p>
          )}
          {earlier.length > 0 && (
            <details className="earlier">
              <summary>Earlier notes, {earlier.length}</summary>
              <ol>
                {earlier.map((n) => (
                  <li key={n.date}><p className="date"><time dateTime={n.date}>{formatDate(n.date)}</time></p>{n.body.map((p, i) => <p key={i} className="body">{p}</p>)}</li>
                ))}
              </ol>
            </details>
          )}
        </section>

        <section id="now" className="col sec" data-thing="today" aria-labelledby="h-now">
          <h2 id="h-now" className="noun">Now.</h2>
          <p className="lede">{NOW.status}</p>
          <div className="pair">
            <div>
              <h3 className="sub">{NOW.reading.title}</h3>
              <p className="body">{NOW.reading.body}</p>
              <ul className="shelf">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
            <div>
              <h3 className="sub">{NOW.club.title}</h3>
              <p className="body">{NOW.club.body}</p>
            </div>
          </div>
        </section>

        <section id="record" className="col sec" data-thing="fbk" aria-labelledby="h-rec">
          <h2 id="h-rec" className="noun">The record.</h2>
          <ol className="honors">
            {HONORS.map((h) => <li key={h.what}><b>{h.what}</b><span>{h.detail}</span></li>)}
          </ol>
          <div className="certs">
            {AWARDS.map((a) => (
              <a key={a.site} href={a.href} rel="noopener" className="cert">
                <img src={BASE + a.img} alt={`Certificate, ${a.site}`} loading="lazy" width={720} height={1018} />
                <span><b>{a.site}</b>{a.note}</span>
              </a>
            ))}
          </div>
        </section>

        <section id="off" className="col sec" aria-labelledby="h-off">
          <h2 id="h-off" className="noun">Off the record.</h2>
          <div className="pair">
            <div data-thing="tea"><h3 className="sub">Favourites</h3><ul className="plain">{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div data-thing="tea"><h3 className="sub">Likes</h3><ul className="plain">{LIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div data-thing="plato"><h3 className="sub">Dislikes</h3><ul className="plain">{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul></div>
            <div data-thing="plato"><h3 className="sub">Courses</h3><ul className="plain">{COURSES.map((c) => <li key={c.title}><b>{c.provider}, {c.title}.</b> {c.note}</li>)}</ul></div>
          </div>
        </section>

        <section id="contact" className="col sec end" data-thing="self" aria-labelledby="h-contact">
          <h2 id="h-contact" className="sr-only-x">Contact</h2>
          <p className="again" aria-label="The nouns again, the ones you pointed at in ink">
            {NOUNS.map((n, i) => <span key={n.w} className={i === NOUNS.length - 1 || seen.has(i) ? 'inked' : undefined}>{n.w}. </span>)}
          </p>
          <ul className="contact">
            {LINKS.map((l) => (
              <li key={l.label}><span className="k">{l.label}</span>{l.href ? <Ext href={l.href}>{l.value}</Ext> : <span className="v">{l.value}</span>}</li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="col foot">
        <p>Draft 65 of the portfolio. Not the live site.</p>
        <p>Built on the dbismut furniture example from pmndrs/examples (MIT). Teacup from the Khronos glTF Sample Assets, by Polyhaven and Eric Chadwick (CC0). “Plato / Platon” by rjordanb2026, CC BY 4.0. GitHub mark from primer/octicons (MIT).</p>
        <p><a href="#top" onClick={(e) => { e.preventDefault(); scrollToId('top'); }}>Back to the nouns</a></p>
      </footer>
    </div>
  );
}
