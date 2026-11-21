// Draft 81, The reply. Built on chenglou/pretext's bubbles demo (MIT): every bubble is shrink-wrapped to
// its widest line and its height is known before paint, so when a reply arrives the thread above slides up
// by exactly that height. You text him; he answers only in his own words from content.ts.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import '@fontsource-variable/instrument-sans/wdth.css';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import './reply.css';
import { PERSON } from '@/content';
import { useVersion } from '@/lib/version';
import { useGitHub } from '@/lib/github';
import { formatDate, useNotes } from '@/lib/notes';
import { scrollToY } from '@/lib/scroll';
import { still } from '@/lib/utils';
import { fontsFor, gapBetween, lay, resetMeasure, type Bubble, type Geo, type Laid, type Fonts } from './model';
import { answer, FOOTER, match, MORE, note, OPENING, QUESTIONS, type Piece, type Topic } from './answers';

type Item = { key: string; p: Piece };
type Placed = { key: string; p: Piece; L?: Laid; h: number; gap: number };
const sideOf = (p: Piece) => (p.k === 'b' ? p.b.side : p.k);
const STAMP = (phone: boolean) => (phone ? 36 : 40);
const SAY_ROW = 44;

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function usePhone() {
  const q = '(max-width: 759px)';
  const [p, setP] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setP(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return p;
}

/** Fonts in, then measure: pretext reads canvas metrics, so it must wait for the same faces the CSS paints. */
function useFontsReady(sets: Fonts[]) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    const faces = [...new Set(sets.flatMap((F) => Object.values(F).map((f) => f.font)))];
    Promise.all(faces.map((f) => document.fonts.load(f).catch(() => null)))
      .then(() => document.fonts.ready)
      .then(() => { if (!live) return; resetMeasure(); setReady(true); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ready;
}

function Bub({ L, as: As = 'div', id }: { L: Laid; as?: 'div' | 'h2' | 'h3'; id?: string }) {
  const img = L.rows[0]?.k === 'img' ? L.rows[0] : null;
  return (
    <As id={id} className="rp-b" data-side={L.side} data-tone={L.tone} style={{ width: L.w, height: L.h }}>
      {img && (img.href ? (
        <a className="rp-img" href={img.href} target="_blank" rel="noreferrer" style={{ height: img.h }} tabIndex={-1} aria-hidden="true">
          <img src={img.src} alt="" width={img.w} height={img.h} loading="lazy" decoding="async" />
        </a>
      ) : (
        <span className="rp-img" style={{ height: img.h }}>
          <img src={img.src} alt={img.alt} width={img.w} height={img.h} loading="lazy" decoding="async" />
        </span>
      ))}
      <span className="rp-in" style={{ padding: `${L.py}px ${L.px}px` }}>
        {L.rows.map((r, i) => {
          if (r.k === 'img') return null;
          const style = { font: r.face.font, lineHeight: `${r.face.lh}px`, marginTop: r.mt, height: r.h };
          if (r.k === 'fit') return <span key={i} className="rp-r rp-fit" style={style}>{r.s}</span>;
          if (r.href) {
            const ext = /^https?:/.test(r.href);
            return (
              <span key={i} className="rp-r" style={style}>
                <a href={r.href} {...(ext ? { target: '_blank', rel: 'noreferrer' } : {})}>{r.s}</a>
              </span>
            );
          }
          return <span key={i} className="rp-r" style={style}>{r.s}</span>;
        })}
      </span>
    </As>
  );
}

function place(items: Item[], g: Geo, F: Fonts): Placed[] {
  let prev: ReturnType<typeof sideOf> | undefined;
  return items.map((it) => {
    const s = sideOf(it.p);
    const gap = gapBetween(prev, s, g.phone);
    prev = s;
    if (it.p.k === 'b') { const L = lay(it.p.b, g, F); return { ...it, L, h: L.h, gap }; }
    if (it.p.k === 'stamp') return { ...it, h: STAMP(g.phone), gap };
    return { ...it, h: it.p.opts.length * SAY_ROW, gap };
  });
}

function Say({ opts, onPick }: { opts: { label: string; act: string }[]; onPick: (label: string, act: string) => void }) {
  return (
    <span className="rp-say">
      {opts.map((o) => (
        <button key={o.act} type="button" className="rp-q" onClick={() => onPick(o.label, o.act)}>{o.label}</button>
      ))}
    </span>
  );
}

function AskForm({ id, onAsk }: { id: string; onAsk: (text: string) => void }) {
  const [v, setV] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = v.trim();
    if (!t) return;
    onAsk(t);
    setV('');
  };
  return (
    <form className="rp-form" onSubmit={submit}>
      <label className="sr-only-x" htmlFor={id}>Ask him something.</label>
      <input id={id} value={v} onChange={(e) => setV(e.target.value)} placeholder="Ask him something." autoComplete="off" enterKeyHint="send" maxLength={160} />
      <button type="submit" className="rp-send">Send</button>
    </form>
  );
}

let uid = 0;
const mk = (p: Piece): Item => ({ key: 'i' + uid++, p });
const you = (s: string): Piece => ({ k: 'b', b: { side: 'you', rows: [{ k: 't', f: 'body', s }] } });

export default function ReplyPage() {
  useVersion('reply');
  const gh = useGitHub();
  const { notes } = useNotes();
  const phone = usePhone();
  const F = useMemo(() => fontsFor(phone), [phone]);
  const FB = useMemo(() => fontsFor(phone, true), [phone]);
  const ready = useFontsReady([F, FB]);

  // ---------- the live thread ----------
  const [items, setItems] = useState<Item[]>(() => [mk({ k: 'stamp', s: 'Today' }), mk(you('Who are you?')), ...(still ? OPENING.map((b) => mk({ k: 'b', b })) : [])]);
  const [listRef, tw] = useWidth<HTMLDivElement>();
  const regionRef = useRef<HTMLDivElement>(null);
  const geo: Geo = { max: Math.round(Math.min(tw * (phone ? 0.88 : 0.8), 560)), full: tw, phone };
  const placed = useMemo(() => (tw ? place(items, geo, F) : []), [items, tw, phone, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  const pending = useRef<{ from: number } | null>(null);
  const qStart = useRef<number>(-1);
  const following = useRef(true);
  const queue = useRef<Piece[]>([]);
  const timer = useRef<number | null>(null);
  const earlier = useRef(1);
  const openingNow = useRef(false);
  const [asked, setAsked] = useState<string[]>([]);
  const count = useRef(items.length);
  count.current = items.length;

  const push = useCallback((ps: Piece[]) => {
    setItems((prev) => {
      pending.current = { from: pending.current ? Math.min(pending.current.from, prev.length) : prev.length };
      count.current = prev.length + ps.length;
      return [...prev, ...ps.map(mk)];
    });
  }, []);

  useLayoutEffect(() => {
    const s = pending.current;
    const list = listRef.current;
    if (!s || !list) return;
    pending.current = null;
    const kids = [...list.children] as HTMLElement[];
    let H = 0;
    for (let i = s.from; i < placed.length; i++) H += placed[i].h + placed[i].gap;
    let since = 0;
    for (let i = Math.max(0, qStart.current); i < placed.length; i++) since += placed[i].h + placed[i].gap;
    const region = regionRef.current;
    const room = phone ? window.innerHeight * 0.62 : (region?.clientHeight ?? 600) - 48;
    let slide = false;
    const row = phone ? document.getElementById('reply-row')?.getBoundingClientRect() : null;
    if (phone && following.current && row && (row.top > window.innerHeight || row.bottom < 0)) {
      // Asked from elsewhere on a phone: go to the question and let the answer arrive below it.
      following.current = false;
      const q = kids[qStart.current];
      if (q) scrollToY(q.getBoundingClientRect().top + window.scrollY - 90, still);
    }
    if (following.current && since <= room) {
      slide = true;
      if (!phone && region) region.scrollTop = region.scrollHeight;
      else if (phone && !openingNow.current) scrollToY(window.scrollY + H, true);
    } else if (following.current) {
      // The answer is taller than the view: stop following and leave the question at the top to read down from.
      following.current = false;
      const q = kids[qStart.current];
      if (!phone && region && q) region.scrollTop = Math.max(0, q.offsetTop - 16);
    }
    if (still) return;
    if (slide) {
      for (let i = 0; i < s.from && i < kids.length; i++)
        kids[i].animate([{ transform: `translateY(${H}px)` }, { transform: 'translateY(0)' }], { duration: 520, easing: 'cubic-bezier(.16,.84,.24,1)', composite: 'add' });
    }
    for (let i = s.from; i < kids.length; i++) kids[i].animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out', fill: 'backwards', delay: slide ? 90 : 0 });
  }, [placed]); // eslint-disable-line react-hooks/exhaustive-deps

  const drip = useCallback(() => {
    if (timer.current != null) return;
    const step = () => {
      const next = queue.current.shift();
      if (!next) { timer.current = null; return; }
      push([next]);
      timer.current = window.setTimeout(step, next.k === 'stamp' ? 160 : 300);
    };
    timer.current = window.setTimeout(step, 480);
  }, [push]);
  useEffect(() => () => { if (timer.current != null) clearTimeout(timer.current); }, []);

  // The authored opening: once the fonts are measured, his three words arrive one by one.
  const opened = useRef(still);
  useEffect(() => {
    if (opened.current || !ready || !tw) return;
    opened.current = true;
    qStart.current = 1;
    following.current = true;
    openingNow.current = true;
    queue.current = OPENING.map((b) => ({ k: 'b', b }) as Piece);
    drip();
  }, [ready, tw, drip]);

  const replyFor = useCallback((t: Topic | 'earlier' | null): Piece[] => {
    if (t === 'earlier') {
      const n = notes[earlier.current];
      earlier.current += 1;
      if (!n) return [];
      const out = note(n);
      if (notes[earlier.current]) out.push({ k: 'say', opts: [{ label: 'Earlier?', act: 'earlier' }] });
      return out;
    }
    if (!t) return [{ k: 'b', b: { side: 'him', rows: [{ k: 't', f: 'body', s: 'Try one of these.' }] } }, { k: 'say', opts: QUESTIONS.map((q) => ({ label: q.q, act: q.t })) }];
    const out = answer(t, gh, notes, { full: false });
    if (t === 'today' && notes.length > 1) { earlier.current = 1; out.push({ k: 'say', opts: [{ label: 'Earlier?', act: 'earlier' }] }); }
    if (t === 'reach') out.push({ k: 'b', b: { side: 'him', rows: [{ k: 't', f: 'meta', s: FOOTER }], tone: 'quiet' } });
    return out;
  }, [gh, notes]);

  const ask = useCallback((text: string, t: Topic | 'earlier' | null) => {
    openingNow.current = false;
    if (t && t !== 'earlier') setAsked((a) => (a.includes(t) ? a : [...a, t]));
    const rest = queue.current.splice(0);
    if (timer.current != null) { clearTimeout(timer.current); timer.current = null; }
    qStart.current = count.current + rest.length;
    following.current = true;
    push([...rest, you(text)]);
    const ps = replyFor(t);
    if (still) { push(ps); return; }
    queue.current = ps;
    drip();
  }, [push, replyFor, drip]);

  const pick = useCallback((label: string, act: string) => ask(label, act === 'earlier' ? 'earlier' : (act as Topic)), [ask]);
  const typed = useCallback((text: string) => ask(text, match(text)), [ask]);
  const typedFromEnd = useCallback((text: string) => {
    const row = document.getElementById('reply-row');
    const y = phone && row ? row.getBoundingClientRect().bottom + window.scrollY - window.innerHeight + 16 : 0;
    scrollToY(y, still);
    window.setTimeout(() => typed(text), still ? 0 : 1000);
  }, [phone, typed]);

  // ---------- the transcript ----------
  const [colRef, cw] = useWidth<HTMLDivElement>();
  const tgeo: Geo = { max: Math.round(Math.min(cw * (phone ? 0.9 : 0.72), 680)), full: cw, phone };
  const albumW = phone ? cw : Math.floor((cw - 20) / 2);
  const sections = useMemo(() => {
    if (!cw) return [];
    const order: [Topic, string, string][] = [
      ['who', MORE.who, 'about'],
      ['win', QUESTIONS[0].q, 'debate'],
      ['write', QUESTIONS[2].q, 'research'],
      ['build', QUESTIONS[3].q, 'work'],
      ['today', QUESTIONS[4].q, 'today'],
      ['record', MORE.record, 'record'],
      ['likes', MORE.likes, 'off-the-record'],
      ['reach', QUESTIONS[5].q, 'contact'],
    ];
    return order.map(([t, q, id]) => {
      let ps = answer(t, gh, notes, { full: true });
      if (t === 'today') ps = [...notes.slice(0, 7).flatMap((n, i) => note(n, i === 0)), ...ps];
      const head = lay({ side: 'you', rows: [{ k: 't', f: 'ask', s: q }], heading: true }, tgeo, FB);
      const body = ps.map((p) => {
        if (p.k !== 'b') return { p, L: null as Laid | null };
        let b: Bubble = p.b;
        if (p.group === 'work') b = { ...b, width: albumW };
        return { p, L: lay(b, tgeo, FB) };
      });
      return { t, id, q, head, body };
    });
  }, [cw, phone, ready, gh, notes]); // eslint-disable-line react-hooks/exhaustive-deps

  const foot = cw ? lay({ side: 'him', rows: [{ k: 't', f: 'meta', s: FOOTER }], tone: 'quiet' }, tgeo, FB) : null;

  return (
    <div className="v-reply">
      <a className="skip-x" href="#main">Skip to the conversation</a>
      <main id="main">
        <section className="rp-top" aria-labelledby="rp-name">
          <header className="rp-contact">
            <h1 id="rp-name" className="rp-name"><span>{PERSON.first}</span> <span>{PERSON.last}</span></h1>
            <p className="rp-line">{PERSON.line}</p>
            <div className="rp-alt">
              {notes[0] && <p><button type="button" className="rp-today" onClick={() => ask(QUESTIONS[4].q, 'today')}>Latest note, {formatDate(notes[0].date)}</button></p>}
              <p><a href="#transcript">Or read the whole transcript</a></p>
            </div>
          </header>
          <div className="rp-chat">
            <div ref={regionRef} className="rp-region" role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation with Armaan Seth" tabIndex={0} data-lenis-prevent>
              <div ref={listRef} className="rp-list">
                {tw === 0
                  ? items.map((it) => it.p.k === 'b' ? <div key={it.key} className="rp-it" data-side={it.p.b.side}><div className="rp-b" data-side={it.p.b.side} data-tone={it.p.b.tone}><span className="rp-in"><span className="rp-r">{(it.p.b.rows[0] as { s: string }).s}</span></span></div></div> : null)
                  : placed.map((it) => (
                    <div key={it.key} className="rp-it" data-side={sideOf(it.p)} style={{ height: it.h, marginTop: it.gap }}>
                      {it.L ? <Bub L={it.L} /> : it.p.k === 'stamp' ? <p className="rp-stamp">{it.p.s}</p> : it.p.k === 'say' ? <Say opts={it.p.opts} onPick={pick} /> : null}
                    </div>
                  ))}
              </div>
            </div>
            <div className="rp-reply" id="reply-row" role="group" aria-label="Ask him">
              <ul className="rp-qs">
                {QUESTIONS.map((q) => (
                  <li key={q.t}><button type="button" className="rp-q" data-asked={asked.includes(q.t) || undefined} onClick={() => ask(q.q, q.t)}>{q.q}</button></li>
                ))}
              </ul>
              <AskForm id="rp-ask" onAsk={typed} />
            </div>
          </div>
        </section>

        <section className="rp-script" id="transcript" aria-labelledby="rp-script-h">
          <div className="rp-script-head">
            <h2 id="rp-script-h">The transcript</h2>
            <p>Every answer on this page, in order, for reading straight through.</p>
          </div>
          <nav className="rp-toc" aria-label="Transcript">
            <ul>
              {sections.map((x) => <li key={x.id}><a href={`#${x.id}`}>{x.q}</a></li>)}
            </ul>
          </nav>
          <div ref={colRef} className="rp-col">
            {sections.map((s) => (
              <section key={s.t} className="rp-sec" id={s.id} data-topic={s.t} aria-labelledby={`h-${s.id}`}>
                <div className="rp-ask"><Bub L={s.head} as="h2" id={`h-${s.id}`} /></div>
                <div className="rp-ans">
                  {group(s.body).map((g, gi) => (
                    <div key={gi} className="rp-grp" data-group={g.group ?? 'none'}>
                      {g.list.map(({ p, L }, i) => L ? <Bub key={i} L={L} /> : p.k === 'stamp' ? <p key={i} className="rp-stamp">{p.s}</p> : null)}
                    </div>
                  ))}
                </div>
              </section>
            ))}
            <footer className="rp-end">
              <div className="rp-last">
                <p className="rp-last-h">Still something to ask?</p>
                <AskForm id="rp-ask-end" onAsk={typedFromEnd} />
              </div>
              {foot && <Bub L={foot} />}
              <p className="rp-colo">Bubbles measured with Pretext by Cheng Lou, MIT licence. Set in Instrument Sans and Newsreader.</p>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}

function group<T extends { p: Piece; L: Laid | null }>(list: T[]) {
  const out: { group?: string; list: T[] }[] = [];
  for (const x of list) {
    const g = x.p.k === 'b' ? x.p.group : undefined;
    const last = out[out.length - 1];
    if (last && g && last.group === g) last.list.push(x);
    else out.push({ group: g, list: [x] });
  }
  return out;
}
