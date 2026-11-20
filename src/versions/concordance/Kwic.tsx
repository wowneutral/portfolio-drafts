// The concordance itself, and the pressable text that opens one.
import { createContext, useContext, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { create } from 'zustand';
import { scrollToId, scrollToY } from '@/lib/scroll';
import { still } from '@/lib/utils';
import { WORD, concord, stem, type Entry, type Row } from './corpus';

// The whole corpus, shared with every pressable paragraph.
export const CorpusCtx = createContext<Entry[]>([]);

// One pressed concordance open at a time, anywhere on the page.
type Open = { at: string; key: string; word: string } | null;
export const useOpen = create<{ open: Open; set: (o: Open) => void }>((set) => ({ open: null, set: (open) => set({ open }) }));

const SLIDE = 900;
const norm = (t: string) => t.replace(/\s+/g, ' ').trim();

/** Take the reader to the very paragraph a line came from, and mark the word there for a moment. */
function goTo(r: Row) {
  const sec = document.getElementById(r.src);
  const needle = norm(r.left.slice(-28) + r.kw + r.right.slice(0, 28));
  const hit = sec ? [...sec.querySelectorAll<HTMLElement>('.words, p, li, h3')].find((el) => !el.closest('.kwic') && norm(el.textContent ?? '').includes(needle)) : null;
  if (!hit) { scrollToId(r.src, -24); return; }
  scrollToY(hit.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3);
  const word = [...hit.querySelectorAll<HTMLElement>('.w')].find((w) => w.textContent === r.kw);
  const mark = word ?? hit;
  mark.classList.add('found');
  setTimeout(() => mark.classList.remove('found'), 2600);
  (word ?? hit).focus({ preventScroll: true });
}

/** Rows lined up on the keyword. `aligned` false puts every line back at its reading position. */
export function Kwic({ word, rows, aligned = true, max = 8, reserve = 0, label }: { word: string; rows: Row[]; aligned?: boolean; max?: number; reserve?: number; label?: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const uid = useId();
  const [shift, setShift] = useState<number[]>([]);
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, max);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const field = el.querySelector<HTMLElement>('.k-field');
      if (!field) return;
      const axis = field.clientWidth * 0.5;
      setShift([...el.querySelectorAll<HTMLElement>('.k-kw')].map((k) => Math.round(axis - k.offsetLeft)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [shown.length, rows]);

  return (
    <div className="kwic" ref={box} style={reserve ? { minHeight: `calc(${reserve} * var(--row) + 3.2rem)` } : undefined}>
      <p className="k-head">
        <span className="k-word">{word}</span>
        <span className="k-count">{label ?? `${rows.length} ${rows.length === 1 ? 'use' : 'uses'}`}</span>
      </p>
      <ol className="k-rows">
        {shown.map((r, i) => (
          <li key={r.id} className="k-row">
            <span className="k-where" aria-hidden="true" id={uid + i}>{r.where}</span>
            <a className="k-field" aria-describedby={uid + i} href={'#' + r.src} onClick={(e) => { e.preventDefault(); goTo(r); }}>
              <span className="k-line" style={{ transform: `translateX(${aligned ? shift[i] ?? 0 : 0}px)`, transitionDelay: still ? '0ms' : `${i * 28}ms` }}>
                <span className="k-l">{r.left}</span><span className="k-kw">{r.kw}</span><span className="k-r">{r.right}</span>
              </span>
            </a>
          </li>
        ))}
      </ol>
      {rows.length > max ? (
        <button type="button" className="k-more" onClick={() => setAll((a) => !a)} aria-expanded={all}>
          {all ? 'Fewer lines' : `All ${rows.length} lines`}
        </button>
      ) : null}
    </div>
  );
}

/** A concordance that slides into line once, a beat after it mounts (the opening, and every press). */
export function Slide({ word, rows, closing, max, label }: { word: string; rows: Row[]; closing?: boolean; max?: number; label?: ReactNode }) {
  const [on, setOn] = useState(still);
  useLayoutEffect(() => {
    if (still) return;
    const t = setTimeout(() => setOn(true), 380);
    return () => clearTimeout(t);
  }, []);
  return <div className="slide"><Kwic word={word} rows={rows} aligned={on && !closing} max={max} label={label} /></div>;
}

/**
 * Pressable text. Every word is a button (one tab stop per block, arrow keys move between words, Enter presses).
 * Pressing opens that word's concordance directly under the block, in the flow.
 */
export function Words({ id, text, as: Tag = 'p', className, after }: { id: string; text: string | string[]; as?: 'p' | 'div' | 'span' | 'h3' | 'li'; className?: string; after?: ReactNode }) {
  const corpus = useContext(CorpusCtx);
  const { open, set } = useOpen();
  const mine = open && open.at === id ? open : null;
  const [closing, setClosing] = useState<Open>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const parts = useMemo(() => (Array.isArray(text) ? text : [text]).map(split), [text]);
  const shown = mine ?? closing;

  const press = (word: string) => {
    const key = stem(word);
    if (mine && mine.key === key) {
      // Press again: the lines slide home, then the concordance closes.
      setClosing(mine);
      set(null);
      setTimeout(() => setClosing(null), still ? 0 : SLIDE + 200);
      return;
    }
    setClosing(null);
    setRows(concord(corpus, key));
    set({ at: id, key, word });
  };

  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
    const list = [...(e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('.w')];
    const i = list.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : Math.max(0, Math.min(list.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)));
    list.forEach((b, k) => (b.tabIndex = k === j ? 0 : -1));
    list[j].focus();
  };

  let first = true;
  const words = (bits: Bit[]) => bits.map((b, i) => {
    if (!b.w) return <span key={i}>{b.t}</span>;
    const k = stem(b.t);
    const tab = first ? 0 : -1;
    first = false;
    const on = shown && shown.key === k && !closing;
    return (
      <span key={i} role="button" className={on ? 'w on' : 'w'} tabIndex={tab} aria-pressed={!!on}
        onClick={() => press(b.t)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); press(b.t); } }}>{b.t}</span>
    );
  });

  return (
    <>
      {Tag === 'span' ? (
        <span className={cn2('words', className)} onKeyDown={onKey}>{words(parts[0])}</span>
      ) : parts.length > 1 ? (
        <div className={cn2('words', className)} onKeyDown={onKey}>{parts.map((p, i) => <p key={i}>{words(p)}</p>)}</div>
      ) : (
        <Tag className={cn2('words', className)} onKeyDown={onKey}>{words(parts[0])}</Tag>
      )}
      {after}
      {Tag !== 'span' && shown ? (
        <Wide>
          <Slide key={shown.key} word={shown.word.toLowerCase()} rows={rows} closing={!!closing} max={10} />
        </Wide>
      ) : null}
    </>
  );
}

/** An opened concordance breaks out of a narrow text column to the full measure of the page, when the column stands alone. */
function Wide({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [st, setSt] = useState<CSSProperties>({});
  useLayoutEffect(() => {
    const el = ref.current!;
    const fit = () => {
      const parent = el.parentElement!;
      const main = el.closest('main');
      if (!main || !parent.closest('.col, .note, .paper, .wess, .earlier')) { setSt({}); return; }
      const cs = getComputedStyle(main);
      const mr = main.getBoundingClientRect();
      const left = mr.left + parseFloat(cs.paddingLeft);
      const width = mr.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      setSt({ marginLeft: Math.round(left - parent.getBoundingClientRect().left), width: Math.round(width) });
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return <div ref={ref} className="pressed" style={st}>{children}</div>;
}

type Bit = { t: string; w: boolean };
function split(text: string): Bit[] {
  const out: Bit[] = [];
  let last = 0;
  for (const m of text.matchAll(WORD)) {
    if (m.index! > last) out.push({ t: text.slice(last, m.index), w: false });
    out.push({ t: m[0], w: true });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ t: text.slice(last), w: false });
  return out;
}
const cn2 = (a: string, b?: string) => (b ? a + ' ' + b : a);
