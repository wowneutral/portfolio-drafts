// Draft 27, The caesura. The page is laid out like a long line of old Germanic verse: an empty channel
// runs down the middle, every heading straddles it as two half-lines, and the letters that alliterate
// across the gap are red. Point at, focus or tap a heading and a red line bridges the gap. At the end,
// the channel closes.
import { useRef, useState } from 'react';
import '@fontsource/gloock/400.css';
import '@fontsource-variable/bricolage-grotesque/index.css';
import './caesura.css';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub, ago } from '@/lib/github';
import { useNotes, formatDate } from '@/lib/notes';
import { gsap, useGSAP } from '@/lib/scroll';
import { still } from '@/lib/utils';
import { Long, Pair } from './Long';

const src = (p: string) => import.meta.env.BASE_URL + p;
const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; pages: number };
const wess = RESEARCH[1];
const comma = PERSON.line.indexOf('Skeptical,') + 'Skeptical,'.length;
const lineA = PERSON.line.slice(0, comma);
const lineB = PERSON.line.slice(comma + 1);
const colon = paper.title.indexOf(':') + 1;
const titleA = paper.title.slice(0, colon);
const titleB = paper.title.slice(colon + 1);

function Out({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return <a className={'lk' + (className ? ' ' + className : '')} href={href} target="_blank" rel="noreferrer">{children}</a>;
}

function Opening() {
  return (
    <header className="open">
      <Long as="h1" a={PERSON.first.toUpperCase()} b={PERSON.last.toUpperCase()} pairs={[]} size="name" close="load" />
      <span className="sr-only-x">{PERSON.name}</span>
      <Pair className="open-line" a={lineA} b={lineB} />
      <Pair className="open-hint" a={<p>Red letters rhyme across the gap.</p>} b={null} />
    </header>
  );
}

function About() {
  return (
    <section className="sec" aria-labelledby="about">
      <Long id="about" a="Mentorship" b="MITEZ" pairs={[[0, 0]]} />
      <Pair
        className="prose"
        a={<>{PERSON.about.map((p) => <p key={p.slice(0, 12)}>{p}</p>)}</>}
        b={<p className="aside">{PERSON.aside}</p>}
      />
    </section>
  );
}

function Debate() {
  const [w0, w1] = DEBATE.wins;
  const t = DEBATE.team;
  return (
    <section className="sec sec-debate" aria-labelledby="debate">
      <Long id="debate" a={w0.title} b={w1.title} pairs={[[0, 0]]} size="champ" close="scroll" />
      <Pair
        className="wins"
        a={<div className="win"><p className="win-ev">{w0.event}</p><p className="win-at">{w0.where}</p><p className="win-when">{w0.when}</p></div>}
        b={<div className="win"><p className="win-ev">{w1.event}</p><p className="win-at">{w1.where}</p><p className="win-when">{w1.when}</p></div>}
      />
      <div className="next">
        <Pair a={<h3 className="label">Up next</h3>} b={null} />
        <ul>
          {DEBATE.next.map((n) => <Pair as="li" key={n.where} a={n.event} b={n.where} className="next-row" />)}
        </ul>
      </div>
      <Long as="h3" id="skeptical" a={t.name} b="skeptics" pairs={[[0, 0], [1, 1]]} size="h3" />
      <Pair
        className="prose"
        a={<><p className="role">{t.role}</p><p>{t.line}</p></>}
        b={<><p>{t.record}</p><p><Out href={t.href}>{host(t.href)}</Out></p></>}
      />
    </section>
  );
}

function Research() {
  return (
    <section className="sec" aria-labelledby="research">
      <Long id="research" a="Language" b="ladder" pairs={[[0, 0]]} />
      <Pair className="ptitle" a={<p>{titleA}</p>} b={<p>{titleB}</p>} />
      <Pair
        className="prose"
        a={
          <>
            <p className="status">{paper.status}, {paper.pages} pages</p>
            <ul className="kw" aria-label="Keywords">{paper.keywords.map((k) => <li key={k}>{k}</li>)}</ul>
          </>
        }
        b={
          <>
            <p className="abstract">{paper.abstract}</p>
            <ul className="plinks">{paper.links.map((l) => <li key={l.label}><Out href={l.href}>{l.label}</Out></li>)}</ul>
          </>
        }
      />
      <Pair
        className="wess"
        a={<p className="wess-why">The reason for the gap down this page.</p>}
        b={<><h3 className="wess-t">{wess.title}</h3><p className="status">{wess.status}</p><p>{wess.abstract}</p></>}
      />
    </section>
  );
}

function Work() {
  return (
    <section className="sec" aria-labelledby="work">
      <Long id="work" a="Builder" b="built" pairs={[[0, 0]]} />
      <ol className="works">
        {WORK.map((w, i) => {
          const img = <img src={src(w.img)} alt={`${w.name}, screenshot`} loading="lazy" width={1200} height={700} />;
          const name = <><h3 className="w-name">{w.name}</h3><p className="w-kind">{w.kind}</p></>;
          const body = (
            <>
              <p>{w.line}</p>
              <p className="w-stack">{w.stack}</p>
              {w.href ? <p><Out href={w.href}>{host(w.href)}</Out></p> : <p className="w-none">No public link</p>}
            </>
          );
          const left = i % 2 === 0;
          return (
            <li key={w.slug} className={'w ' + (left ? 'w-l' : 'w-r')}>
              <div className="w-shot">{w.href ? <a href={w.href} target="_blank" rel="noreferrer" tabIndex={-1} aria-hidden="true">{img}</a> : img}</div>
              <Pair className="w-meta" a={left ? name : body} b={left ? body : name} />
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Today() {
  const { notes, loaded } = useNotes();
  const [open, setOpen] = useState<string | null>(null);
  const [latest, ...earlier] = notes;
  return (
    <section className="sec" aria-labelledby="today">
      <Long id="today" a="Now" b="note" pairs={[[0, 0]]} />
      {latest ? (
        <Pair
          className="note"
          a={<p className="note-date"><time dateTime={latest.date}>{formatDate(latest.date)}</time></p>}
          b={<div className="note-body">{latest.body.map((p, i) => <p key={i}>{p}</p>)}</div>}
        />
      ) : (
        <Pair className="note" a={<p className="note-date">Today</p>} b={<div className="note-body"><p>{loaded ? NOW.status : 'Fetching the latest note.'}</p></div>} />
      )}
      {earlier.length ? (
        <ol className="earlier" aria-label="Earlier notes">
          {earlier.map((n, i) => {
            const on = open === n.date;
            const btn = (
              <button type="button" className="e-btn" aria-expanded={on} aria-controls={'n-' + n.date} onClick={() => setOpen(on ? null : n.date)}>
                <time dateTime={n.date}>{formatDate(n.date)}</time>
                <span className="e-mark" aria-hidden="true">{on ? 'close' : 'open'}</span>
              </button>
            );
            const body = <div id={'n-' + n.date} className="e-body" hidden={!on}>{n.body.map((p, j) => <p key={j}>{p}</p>)}</div>;
            const left = i % 2 === 0;
            return <Pair as="li" key={n.date} className={'e-row' + (on ? ' on' : '')} a={left ? <>{btn}{body}</> : null} b={left ? null : <>{btn}{body}</>} />;
          })}
        </ol>
      ) : null}
    </section>
  );
}

function GitHub() {
  const gh = useGitHub();
  return (
    <section className="sec" aria-labelledby="github">
      <Long id="github" a="Commits" b="code" pairs={[[0, 0]]} />
      {gh.activity.length ? (
        <ul className="commits" aria-label="Recent commits">
          {gh.activity.slice(0, 6).map((c) => (
            <Pair as="li" key={c.href} className="c-row"
              a={<a className="c-msg" href={c.href} target="_blank" rel="noreferrer">{c.message}</a>}
              b={<p className="c-at"><span>{c.repo}</span> <span className="dim">{ago(c.at)}</span></p>} />
          ))}
        </ul>
      ) : null}
      <ul className="repos" aria-label="Repositories">
        {gh.repos.slice(0, 6).map((r) => (
          <Pair as="li" key={r.name} className="r-row"
            a={<a className="r-name" href={r.href} target="_blank" rel="noreferrer">{r.name}</a>}
            b={<p>{r.description ?? 'No description yet.'}{r.language ? <span className="dim"> {r.language}</span> : null}</p>} />
        ))}
      </ul>
      <Pair className="gh-link" a={null} b={<p><Out href={GITHUB.href}>{host(GITHUB.href)}</Out></p>} />
    </section>
  );
}

function Now() {
  return (
    <section className="sec" aria-labelledby="now">
      <Long id="now" a="Reading" b="ready" pairs={[[0, 0]]} />
      <Pair
        className="prose"
        a={<><h3 className="sub">{NOW.reading.title}</h3><p>{NOW.reading.body}</p><ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul></>}
        b={<><h3 className="sub">{NOW.club.title}</h3><p>{NOW.club.body}</p><p className="status-now">{NOW.status}</p></>}
      />
    </section>
  );
}

function Record() {
  return (
    <section className="sec" aria-labelledby="record">
      <Long id="record" a="Record" b="results" pairs={[[0, 0]]} />
      <ul className="honors">
        {HONORS.map((h) => <Pair as="li" key={h.what} className="h-row" a={h.what} b={h.detail} />)}
      </ul>
      <Pair
        className="certs"
        a={<a className="cert" href={AWARDS[0].href} target="_blank" rel="noreferrer"><img src={src(AWARDS[0].img)} alt={`Certificate: ${AWARDS[0].site}`} loading="lazy" width={720} height={1018} /><span>{AWARDS[0].note}</span></a>}
        b={<a className="cert" href={AWARDS[1].href} target="_blank" rel="noreferrer"><img src={src(AWARDS[1].img)} alt={`Certificate: ${AWARDS[1].site}`} loading="lazy" width={720} height={1018} /><span>{AWARDS[1].note}</span></a>}
      />
    </section>
  );
}

function Off() {
  return (
    <section className="sec" aria-labelledby="off">
      <Long id="off" a="Likes" b="loathes" pairs={[[0, 0]]} />
      <Pair
        className="lists"
        a={<><h3 className="label">Likes</h3><ul>{LIKES.map((l) => <li key={l}>{l}</li>)}</ul></>}
        b={<><h3 className="label">Dislikes</h3><ul>{DISLIKES.map((l) => <li key={l}>{l}</li>)}</ul></>}
      />
      <Pair
        className="lists"
        a={<><h3 className="label">Favourites</h3><ul>{FAVOURITES.map((l) => <li key={l}>{l}</li>)}</ul></>}
        b={<><h3 className="label">Courses</h3><ul>{COURSES.map((c) => <li key={c.title}><b>{c.provider} {c.title}.</b> {c.note}</li>)}</ul></>}
      />
    </section>
  );
}

function Contact() {
  return (
    <section className="sec sec-last" aria-labelledby="contact">
      <Long id="contact" a="Ask" b="Armaan" pairs={[[0, 0]]} />
      <ul className="links">
        {LINKS.map((l) => (
          <Pair as="li" key={l.label} className="l-row" a={l.label}
            b={l.href ? <a className="lk" href={l.href} {...(l.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>{l.value}</a> : <span>{l.value}</span>} />
        ))}
      </ul>
    </section>
  );
}

function Close() {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (still || !ref.current) return;
    const ps = ref.current.querySelectorAll('path');
    const tl = gsap.timeline({ scrollTrigger: { trigger: ref.current, start: 'top 85%', end: 'bottom 88%', scrub: 0.5 } });
    tl.fromTo([ps[0], ps[1]], { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', duration: 0.7 })
      .fromTo(ps[2], { strokeDashoffset: 1 }, { strokeDashoffset: 0, ease: 'none', duration: 0.3 })
      .fromTo(ref.current.querySelector('.close-dot'), { scale: 0 }, { scale: 1, ease: 'back.out(3)', duration: 0.12 });
  }, { scope: ref });
  return (
    <div className="close" ref={ref} aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M0,0 C0,40 50,40 50,72" pathLength={1} />
        <path d="M100,0 C100,40 50,40 50,72" pathLength={1} />
        <path d="M50,72 L50,100" pathLength={1} />
      </svg>
      <span className="close-dot" />
    </div>
  );
}

export default function Caesura() {
  useVersion('caesura');
  return (
    <div className="v-caesura">
      <a className="skip-x" href="#main">Skip to content</a>
      <div className="page">
        <div className="channel" aria-hidden="true" />
        <Opening />
        <main id="main">
          <About />
          <Debate />
          <Research />
          <Work />
          <Today />
          <GitHub />
          <Now />
          <Record />
          <Off />
          <Contact />
        </main>
      </div>
      <Close />
      <footer className="foot">
        <p>Draft 27 of the portfolio. Not the live site.</p>
        <p className="dim">Set in Gloock and Bricolage Grotesque.</p>
      </footer>
    </div>
  );
}
