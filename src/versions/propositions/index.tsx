// Draft 7: the propositions. His paper ends in the Tractatus, which is built from seven numbered
// propositions with decimal remarks beneath them. This page is built the same way: seven lines,
// and every number unfolds what it holds. The numbers are the whole interface.
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import '@fontsource-variable/eb-garamond/wght.css';
import '@fontsource-variable/eb-garamond/wght-italic.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './propositions.css';
import { AWARDS, COURSES, DEBATE, DISLIKES, FAVOURITES, GITHUB, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, STATS, WORK } from '@/content';
import { ago, useGitHub } from '@/lib/github';
import { formatDate, useNotes } from '@/lib/notes';
import { getLenis, scrollToY } from '@/lib/scroll';
import { still } from '@/lib/utils';
import { useVersion } from '@/lib/version';

const BASE = import.meta.env.BASE_URL;
const PAPER = RESEARCH[0], WESSO = RESEARCH[1];
const TOPS = ['1', '2', '3', '4', '5', '6', '7'];

/** A remark. `sub` always shows under the head; `body` and `kids` fold away. */
type R = { n: string; head: ReactNode; sub?: ReactNode; body?: ReactNode; kids?: R[]; fold?: boolean; cls?: string };

const parentOf = (n: string) => (n.includes('.') ? n.slice(0, -1).replace(/\.$/, '') : '');
const childNo = (p: string, i: number) => (p.includes('.') ? p + i : `${p}.${i}`);
const depthOf = (n: string) => (n.includes('.') ? n.split('.')[1].length : 0);
const kidsOf = (p: string, list: Omit<R, 'n'>[]): R[] => list.map((r, i) => ({ ...r, n: childNo(p, i + 1) }));

const Ext = ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
  <a className={className} href={href} rel="noopener">{children}</a>
);
const plain = (t: string) => t.replace(/\s*[\u2013\u2014]\s*/g, ', ');
const host = (href: string) => href.replace(/^https?:\/\//, '').replace(/\/$/, '');

// A damped spring, sampled into a CSS linear() easing so WAAPI can play it.
const SPRING = (() => {
  const z = 0.58, w = 13, pts: string[] = [];
  const wd = w * Math.sqrt(1 - z * z);
  for (let i = 0; i <= 48; i++) {
    const t = (i / 48) * 0.9;
    const x = 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
    pts.push(x.toFixed(4));
  }
  pts[pts.length - 1] = '1';
  return `linear(${pts.join(', ')})`;
})();
const ease = (() => { try { document.createElement('div').animate([], { easing: SPRING }); return SPRING; } catch { return 'cubic-bezier(0.2, 0.9, 0.25, 1.05)'; } })();
const OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
const instant = { v: false };

function unfold(el: HTMLElement, open: boolean) {
  el.getAnimations().forEach((a) => a.cancel());
  const rise = () => {
    const rows = el.querySelectorAll<HTMLElement>(':scope > .rm > .rm-row, :scope > .rm-b > *');
    rows.forEach((k, i) => k.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 760, delay: 50 + Math.min(i, 10) * 50, easing: ease, fill: 'backwards' }));
    el.querySelectorAll<HTMLElement>('.shot img').forEach((img) => {
      if (img.offsetParent) img.animate([{ clipPath: 'inset(0 0 100% 0)', transform: 'scale(1.04)' }, { clipPath: 'inset(0 0 0% 0)', transform: 'none' }], { duration: 1200, delay: 180, easing: OUT, fill: 'backwards' });
    });
  };
  if (still) { el.hidden = !open; instant.v = false; return; }
  if (instant.v) { instant.v = false; el.hidden = !open; if (open) rise(); return; }
  if (open) {
    el.hidden = false;
    const h = el.scrollHeight;
    el.style.overflow = 'clip';
    const a = el.animate([{ height: '0px' }, { height: `${h}px` }], { duration: 820, easing: ease });
    a.onfinish = a.oncancel = () => { el.style.overflow = ''; };
    rise();
  } else {
    const h = el.offsetHeight;
    el.style.overflow = 'clip';
    const a = el.animate([{ height: `${h}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 380, easing: 'cubic-bezier(0.5, 0, 0.2, 1)' });
    a.onfinish = () => { el.hidden = true; el.style.overflow = ''; };
  }
}

const Ctx = createContext<{ isOpen: (r: R) => boolean; toggle: (n: string) => void }>({ isOpen: () => false, toggle: () => {} });

function Remark({ r }: { r: R }) {
  const { isOpen, toggle } = useContext(Ctx);
  const d = depthOf(r.n);
  const foldable = !!(r.body || r.kids?.length);
  const open = foldable && isOpen(r);
  const fid = 'f' + r.n.replace(/\./g, '-');
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    if (!mounted.current) { mounted.current = true; el.hidden = !open; return; }
    unfold(el, open);
  }, [open]);
  const onRow = (e: React.MouseEvent) => {
    if (!foldable || (e.target as HTMLElement).closest('a,button')) return;
    if (window.getSelection()?.toString()) return;
    toggle(r.n);
  };
  return (
    <div className={`rm d${d}${foldable ? ' can' : ''}${open ? ' is-open' : ''}${r.cls ? ' ' + r.cls : ''}`} id={r.n} data-n={r.n}>
      <div className="rm-row" onClick={onRow}>
        {foldable ? (
          <button type="button" className="rm-n" aria-expanded={open} aria-controls={fid} aria-label={`${r.n} ${open ? 'fold' : 'unfold'}`} onClick={() => toggle(r.n)}>
            {r.n}
          </button>
        ) : (
          <a className="rm-n" href={`#${r.n}`}>{r.n}</a>
        )}
        <div className="rm-t">
          {r.head}
          {r.sub && <div className="rm-s">{r.sub}</div>}
        </div>
      </div>
      {foldable && (
        <div className="fold" id={fid} ref={ref}>
          {r.body && <div className="rm-b">{r.body}</div>}
          {r.kids?.map((k) => <Remark r={k} key={k.n} />)}
        </div>
      )}
    </div>
  );
}

export default function Propositions() {
  useVersion('propositions');
  const gh = useGitHub();
  const { notes, loaded } = useNotes();
  const [over, setOver] = useState<Map<string, boolean>>(() => new Map());
  const [cur, setCur] = useState('');
  const doc = useRef<HTMLDivElement>(null);
  const path = useRef<SVGPathElement>(null);

  const isOpen = useCallback((r: R) => over.get(r.n) ?? (depthOf(r.n) === 0 ? false : !r.fold), [over]);
  const toggle = useCallback((n: string) => {
    setOver((m) => {
      const t = new Map(m);
      const el = document.getElementById(n);
      const now = el ? el.classList.contains('is-open') : false;
      t.set(n, !now);
      if (!now) history.replaceState(null, '', `#${n}`);
      return t;
    });
  }, []);

  // ---------- the tree ----------
  const tree = useMemo<R[]>(() => {
    const latest = notes[0];
    const commits = gh.activity.slice(0, 9);
    const repos = gh.repos.slice(0, 9);
    const ghKids: Omit<R, 'n'>[] = [];
    if (commits.length) ghKids.push({
      head: <p className="lead">Recent commits{gh.commitsThisMonth != null ? <span className="mute">, {gh.commitsThisMonth} this month</span> : null}.</p>,
      kids: [],
    });
    ghKids.push({ head: <p className="lead">Repositories{gh.live ? <span className="mute">, by last push</span> : null}.</p> });
    ghKids.push({ head: <p className="lead"><Ext href={GITHUB.href}>All of it, at github.com/{GITHUB.user}.</Ext></p> });
    const ghNodes = kidsOf('5', ghKids);
    if (commits.length) {
      ghNodes[0].kids = kidsOf(ghNodes[0].n, commits.map((c) => ({
        head: <p><Ext href={c.href}>{plain(c.message)}</Ext></p>,
        sub: <p className="meta">{c.repo}<span aria-hidden="true">, </span>{ago(c.at)}</p>,
      })));
    }
    const repoNode = ghNodes[commits.length ? 1 : 0];
    repoNode.kids = kidsOf(repoNode.n, repos.map((r) => ({
      head: <p className="repo"><Ext href={r.href}>{r.name}</Ext></p>,
      sub: <p className="meta">{r.description ? <span className="desc">{plain(r.description)} </span> : null}{[r.language, r.pushedAt ? `pushed ${ago(r.pushedAt)}` : ''].filter(Boolean).join(', ')}</p>,
    })));

    const noteNodes: Omit<R, 'n'>[] = !loaded
      ? [{ head: <p className="lead mute">The note is on its way.</p> }]
      : notes.length === 0
        ? [{ head: <p className="lead">{NOW.status}</p> }]
        : notes.slice(0, 8).map((note, i) => ({
          head: <p className="date">{formatDate(note.date)}{i === 0 ? <span className="mute">, the latest</span> : null}</p>,
          fold: i > 0,
          cls: i === 0 ? 'note-now' : 'note-old',
          kids: [] as R[],
        }));
    const sixKids = kidsOf('6', noteNodes);
    if (loaded) notes.slice(0, 8).forEach((note, i) => {
      sixKids[i].kids = kidsOf(sixKids[i].n, note.body.slice(0, 9).map((p) => ({ head: <p className={i === 0 ? 'note-p' : ''}>{p}</p> })));
    });

    return [
      {
        n: '1', head: <><h1 className="top">Armaan Seth.</h1><p className="line">{PERSON.line}</p></>,
        kids: kidsOf('1', [
          { head: <p>{PERSON.about[0]}</p> },
          { head: <p>{PERSON.about[1]}</p>, kids: kidsOf('1.2', [{ head: <p>{PERSON.aside}</p> }]) },
          {
            head: <p className="lead">{NOW.status}</p>,
            kids: kidsOf('1.3', [
              { head: <p className="lead">{NOW.reading.title}.</p>, sub: <><p>{NOW.reading.body}</p><ul className="shelves">{NOW.reading.shelves.map((s) => <li key={s}>{s}</li>)}</ul></> },
              { head: <p className="lead">{NOW.club.title}.</p>, sub: <p>{NOW.club.body}</p> },
            ]),
          },
          {
            head: <p className="lead">Off the record.</p>, fold: true,
            kids: kidsOf('1.4', [
              { head: <p className="lead">Likes.</p>, sub: <ul className="plain">{LIKES.map((x) => <li key={x}>{x}</li>)}</ul> },
              { head: <p className="lead">Dislikes.</p>, sub: <ul className="plain">{DISLIKES.map((x) => <li key={x}>{x}</li>)}</ul> },
              { head: <p className="lead">Favourites.</p>, sub: <ul className="plain">{FAVOURITES.map((x) => <li key={x}>{x}</li>)}</ul> },
              { head: <p className="lead">Courses.</p>, sub: <ul className="plain">{COURSES.map((c) => <li key={c.title}><span className="em">{c.title}</span>, {c.provider}. <span className="mute">{c.note}</span></li>)}</ul> },
            ]),
          },
        ]),
      },
      {
        n: '2', head: <h2 className="top">Two titles this fall.</h2>,
        kids: kidsOf('2', [
          ...DEBATE.wins.map((w) => ({ cls: 'win', head: <p className="win-t">{w.title}.</p>, sub: <p className="win-e">{w.event}, <span className="em">{w.where}</span>, {w.when}.</p> })),
          {
            head: <p className="lead big">{DEBATE.team.name}. <span className="mute">{DEBATE.team.role}.</span></p>,
            kids: kidsOf('2.3', [
              { head: <p>{DEBATE.team.line}</p> },
              { head: <p>{DEBATE.team.record}</p> },
              { head: <p><Ext href={DEBATE.team.href}>{host(DEBATE.team.href)}</Ext></p> },
            ]),
          },
          {
            head: <p className="lead">Up next.</p>,
            kids: kidsOf('2.4', DEBATE.next.map((x) => ({ head: <p>{x.event}, <span className="em">{x.where}</span>.</p> }))),
          },
          {
            head: <p className="lead">The record.</p>,
            sub: <ul className="honors">{HONORS.map((h) => <li key={h.what}><span>{h.what}</span> <span className="mute">{h.detail}</span></li>)}</ul>,
            kids: kidsOf('2.5', [
              {
                head: <p className="lead">The two certificates.</p>,
                sub: <div className="certs">{AWARDS.map((a) => (
                  <Ext key={a.site} href={a.href} className="cert">
                    <img src={BASE + a.img} alt={`WD Awards certificate for ${a.site}`} width={720} height={1018} loading="lazy" />
                    <span className="cert-t">{a.site}</span>
                    <span className="mute">{a.note}</span>
                  </Ext>
                ))}</div>,
              },
              { head: <p>{STATS.map((s, i) => <span key={s.label}>{i ? ' ' : ''}<span className="fig">{s.to}{s.suffix}</span> {/^.[a-z]/.test(s.label) ? s.label[0].toLowerCase() + s.label.slice(1) : s.label}.</span>)}</p> },
            ]),
          },
        ]),
      },
      {
        n: '3', head: <h2 className="top">How a skeptic can criticise language using language.</h2>,
        kids: kidsOf('3', [
          {
            head: <p className="title">{PAPER.title}</p>, sub: <p className="meta">{PAPER.status}, {PAPER.pages} pages. DOI {PAPER.doi}</p>,
            kids: kidsOf('3.1', [
              { head: <p>{PAPER.abstract}</p> },
              { head: <blockquote className="epi"><p>{PAPER.epigraph!.text}</p><cite>{PAPER.epigraph!.source}</cite></blockquote> },
              { head: <ul className="kw">{PAPER.keywords!.map((k) => <li key={k}>{k}</li>)}</ul> },
              { head: <p className="lead">The ladder, three times.</p>, sub: <ol className="ladders">{PAPER.ladders!.map((l) => <li key={l.who}><span className="em">{l.who}</span>, {l.when}. <span className="mute">{l.where}</span></li>)}</ol> },
              { head: <p className="lead">Where it lives.</p>, sub: <ul className="where">{PAPER.links.map((l) => <li key={l.label}><Ext href={l.href}>{l.label}</Ext></li>)}</ul> },
            ]),
          },
          { head: <p className="title sm">{WESSO.title}</p>, sub: <><p className="meta">{WESSO.status}</p><p>{WESSO.abstract}</p></> },
        ]),
      },
      {
        n: '4', head: <h2 className="top">The other half is building.</h2>,
        kids: kidsOf('4', WORK.map((w, i) => ({
          fold: w.slug !== 'skeptical', cls: 'work',
          head: <p className="w-h"><span className="w-name">{w.name}</span> <span className="w-kind">{w.kind}</span></p>,
          body: <>
            <figure className="shot"><img src={BASE + w.img} alt={`${w.name}, a screenshot`} width={1200} height={680} loading="lazy" /></figure>
            <p className="w-line">{w.line}</p>
            <p className="meta">{w.stack}</p>
            {w.href ? <p className="w-go"><Ext href={w.href}>{host(w.href)}</Ext></p> : null}
          </>,
        }))),
      },
      { n: '5', head: <h2 className="top">Live from GitHub.</h2>, kids: ghNodes },
      {
        n: '6', head: <h2 className="top">Today.{latest ? <span className="top-d"> {formatDate(latest.date, { day: 'numeric', month: 'long' })}</span> : null}</h2>,
        kids: sixKids,
      },
      {
        n: '7', head: <h2 className="top">Where to find me.</h2>,
        kids: kidsOf('7', LINKS.map((l) => ({
          head: <p className="lk"><span className="lk-l">{l.label}</span> {l.href ? <a href={l.href} rel={l.href.startsWith('http') ? 'noopener' : undefined}>{l.value}</a> : <span>{l.value}</span>}</p>,
        }))),
      },
    ];
  }, [gh, notes, loaded]);

  // ---------- deep links: #3.11 opens the path to it ----------
  useEffect(() => {
    const go = () => {
      const n = decodeURIComponent(location.hash.slice(1));
      if (!/^[1-7](\.\d+)?$/.test(n)) return;
      setOver((m) => { const t = new Map(m); for (let c = n; c; c = parentOf(c)) t.set(c, true); return t; });
      instant.v = false;
      const tries = [140, 600];
      tries.forEach((ms) => setTimeout(() => {
        const el = document.getElementById(n); if (!el) return;
        getLenis()?.resize();
        scrollToY(el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.16, true);
      }, ms));
    };
    const t = setTimeout(go, 60);
    window.addEventListener('hashchange', go);
    return () => { clearTimeout(t); window.removeEventListener('hashchange', go); };
  }, []);

  // ---------- keep scrolling past the end: the next proposition opens ----------
  const overRef = useRef(over); overRef.current = over;
  const hoverTop = useRef('');
  const ctrRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let last = 0, ty = 0;
    const atEnd = () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 6;
    const next = () => {
      const o = overRef.current, none = !TOPS.some((x) => o.get(x));
      const after = TOPS.reduce((k, x, i) => (o.get(x) ? i : k), -1);
      const n = TOPS.slice(after + 1).find((x) => !o.get(x)) ?? TOPS.find((x) => !o.get(x)); if (!n) return;
      if (Date.now() - last < 1200 || (!none && !atEnd())) return;
      last = Date.now();
      instant.v = true;
      setOver((m) => new Map(m).set(n, true));
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const el = document.getElementById(n); if (!el) return;
        getLenis()?.resize();
        scrollToY(el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.1);
      }));
    };
    const onWheel = (e: WheelEvent) => { if (e.deltaY > 8) next(); };
    const onStart = (e: TouchEvent) => { ty = e.touches[0].clientY; };
    const onMove = (e: TouchEvent) => { if (ty - e.touches[0].clientY > 50) next(); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '*') { setOver((m) => { const t = new Map(m); TOPS.forEach((x) => t.set(x, true)); return t; }); return; }
      if (e.target !== document.body && e.target !== document.documentElement) return;
      if (['PageDown', 'ArrowDown', ' ', 'End'].includes(e.key)) next();
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel); window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove); window.removeEventListener('keydown', onKey);
    };
  }, []);

  // ---------- the number you are on: margin counter and red numeral ----------
  // On the closed page the big red numeral stands beside the line you point at (1 when idle).
  const pointAt = useCallback((n: string) => {
    hoverTop.current = n;
    document.querySelectorAll('.top-wrap > .rm > .rm-row > .rm-n.is-pt').forEach((x) => x.classList.remove('is-pt'));
    const big = ctrRef.current;
    if (!n) { if (big) big.style.transform = ''; return; }
    const num = document.getElementById(n)?.querySelector('.rm-n');
    num?.classList.add('is-pt');
    setCur(n);
    if (big && num) {
      big.style.transform = 'none';
      const a = num.getBoundingClientRect(), b = big.getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(big).fontSize) || 96;
      big.style.transform = `translateY(${(a.top + a.height / 2 - (b.top + parseFloat(getComputedStyle(big).paddingTop) + fs * 0.42)).toFixed(1)}px)`;
    }
  }, []);
  useEffect(() => { const t = setTimeout(() => { if (!TOPS.some((x) => overRef.current.get(x))) pointAt('1'); }, 1300); return () => clearTimeout(t); }, [pointAt]);
  useEffect(() => {
    let raf = 0, on: Element | null = null, shown = '';
    const run = () => {
      raf = 0;
      const root = doc.current; if (!root) return;
      const line = window.innerHeight * 0.36;
      let best: HTMLElement | null = null;
      for (const row of root.querySelectorAll<HTMLElement>('.rm-row')) {
        if (!row.offsetParent) continue;
        if (row.getBoundingClientRect().top < line) best = row; else break;
      }
      const anyOpen = TOPS.some((t) => overRef.current.get(t));
      if (!anyOpen && hoverTop.current) { shown = hoverTop.current; return; }
      if (anyOpen && hoverTop.current) pointAt('');
      const n = anyOpen && best && window.scrollY > 40 ? (best.parentElement as HTMLElement).dataset.n ?? '' : '';
      const num = best?.querySelector('.rm-n') ?? null;
      if (num !== on) { on?.classList.remove('is-on'); if (n) num?.classList.add('is-on'); on = n ? num : null; }
      if (n !== shown) { shown = n; setCur(n); }
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(run); };
    const onResize = () => { if (hoverTop.current && !TOPS.some((x) => overRef.current.get(x))) pointAt(hoverTop.current); kick(); };
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', onResize);
    const t = setInterval(kick, 700);
    kick();
    return () => { window.removeEventListener('scroll', kick); window.removeEventListener('resize', onResize); clearInterval(t); cancelAnimationFrame(raf); };
  }, [pointAt]);

  // ---------- hairline: from a remark back through every number above it ----------
  const draw = useCallback((n: string) => {
    const root = doc.current, p = path.current; if (!root || !p) return;
    root.querySelectorAll('.rm-n.is-anc').forEach((x) => x.classList.remove('is-anc'));
    if (!n || !n.includes('.')) { p.setAttribute('d', ''); return; }
    const box = root.getBoundingClientRect();
    const num = (x: string) => document.getElementById(x)?.querySelector(':scope > .rm-row > .rm-n') as HTMLElement | null;
    let d = '';
    for (let c = n; parentOf(c); c = parentOf(c)) {
      const pr = parentOf(c);
      const a = num(c), b = num(pr); if (!a || !b) break;
      b.classList.add('is-anc');
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const cx = ra.left - box.left - 6, cy = ra.top - box.top + ra.height / 2;
      const px = rb.left - box.left - 6, py = rb.top - box.top + rb.height / 2;
      const sx = Math.min(cx, px) - 12;
      d += `M${cx.toFixed(1)} ${cy.toFixed(1)}H${sx.toFixed(1)}V${py.toFixed(1)}H${px.toFixed(1)}`;
    }
    p.setAttribute('d', d);
    if (!still && d) p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 560, easing: OUT });
  }, []);
  const hot = useRef('');
  const enter = (e: React.SyntheticEvent) => {
    const rm = (e.target as HTMLElement).closest?.('.rm') as HTMLElement | null;
    const n = rm?.dataset.n ?? '';
    if (n === hot.current) return;
    hot.current = n; draw(n);
    if (n && !n.includes('.') && !TOPS.some((t) => over.get(t))) pointAt(n);
  };
  const leave = () => { hot.current = ''; draw(''); if (!TOPS.some((t) => over.get(t))) pointAt('1'); };

  // ---------- keyboard: arrows walk the tree ----------
  const onKey = (e: React.KeyboardEvent) => {
    const t = (e.target as HTMLElement).closest?.('.rm-n') as HTMLElement | null;
    const root = doc.current; if (!t || !root) return;
    const all = [...root.querySelectorAll<HTMLElement>('.rm-n')].filter((x) => x.offsetParent);
    const i = all.indexOf(t);
    const rm = t.closest('.rm') as HTMLElement, n = rm.dataset.n!;
    const open = rm.classList.contains('is-open'), can = rm.classList.contains('can');
    const focus = (el?: HTMLElement | null) => { if (el) { el.focus(); e.preventDefault(); } };
    if (e.key === 'ArrowDown') focus(all[i + 1]);
    else if (e.key === 'ArrowUp') focus(all[i - 1]);
    else if (e.key === 'Home') focus(all[0]);
    else if (e.key === 'End') focus(all[all.length - 1]);
    else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (can && !open) toggle(n);
      else if (open) focus(rm.querySelector<HTMLElement>(':scope > .fold > .rm > .rm-row > .rm-n'));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (open) toggle(n);
      else { const p = parentOf(n); if (p) focus(document.getElementById(p)?.querySelector<HTMLElement>(':scope > .rm-row > .rm-n')); }
    }
  };

  const anyOpen = TOPS.some((t) => over.get(t));
  const sevenOpen = !!over.get('7');

  return (
    <div className="v-propositions">
      <a className="skip-x" href="#main">Skip to the propositions</a>
      <div className="page">
        <aside className={`ctr${cur ? ' on' : ''}`} aria-hidden="true">
          <span className="ctr-n" ref={ctrRef}>{cur.split('').map((c, i) => <span key={`${cur.length}-${i}-${c}`} className="ctr-c" style={{ animationDelay: `${i * 40}ms` }}>{c}</span>)}</span>
        </aside>
        <main id="main" className="doc" ref={doc} onPointerOver={enter} onFocus={enter} onPointerLeave={leave} onKeyDown={onKey}>
          <svg className="hair" aria-hidden="true"><path ref={path} pathLength={1} /></svg>
          <Ctx.Provider value={{ isOpen, toggle }}>
            {tree.map((r, i) => (
              <div className="top-wrap" style={{ '--i': i } as React.CSSProperties} key={r.n}>
                <Remark r={r} />
              </div>
            ))}
          </Ctx.Provider>
          {!anyOpen && <p className="hint">Press a number, or keep scrolling.</p>}
        </main>
      </div>
      <footer className={`foot${sevenOpen ? ' end' : ''}`}>
        <p>Draft 7 of the portfolio. Not the live site.</p>
      </footer>
    </div>
  );
}
