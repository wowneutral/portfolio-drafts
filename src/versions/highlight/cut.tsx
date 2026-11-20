// The highlighter. <Ev> renders one run of evidence text: pre-chosen runs sweep yellow when it scrolls
// into view, and the visitor can drag across it to cut their own (saved in this browser only).
import { createElement, useEffect, useMemo, useRef, useState, useSyncExternalStore, type JSX } from 'react';
import { still } from '@/lib/utils';

type Range = [number, number];
const KEY = 'hl:cuts:v1';
let cuts: Record<string, Range[]> = {};
try { cuts = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { cuts = {}; }
const subs = new Set<() => void>();
const emit = () => {
  try { localStorage.setItem(KEY, JSON.stringify(cuts)); } catch { /* storage off: highlights last this visit */ }
  subs.forEach((f) => f());
};
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export const useCuts = () => useSyncExternalStore(subscribe, () => cuts);
export function clearAll() { cuts = {}; emit(); }
function addCut(id: string, r: Range) {
  const list = [...(cuts[id] ?? []), r].sort((a, b) => a[0] - b[0]);
  const merged: Range[] = [];
  for (const x of list) {
    const last = merged[merged.length - 1];
    if (last && x[0] <= last[1]) last[1] = Math.max(last[1], x[1]); else merged.push([x[0], x[1]]);
  }
  cuts = { ...cuts, [id]: merged };
  emit();
}
function clearCut(id: string) {
  if (!cuts[id]) return;
  const next = { ...cuts }; delete next[id]; cuts = next; emit();
}

/** Character offset of a screen point inside root, or null. */
function offsetAt(root: HTMLElement, x: number, y: number): number | null {
  const d = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
  let node: Node | null = null, off = 0;
  if (d.caretPositionFromPoint) { const p = d.caretPositionFromPoint(x, y); if (p) { node = p.offsetNode; off = p.offset; } }
  else if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); if (r) { node = r.startContainer; off = r.startOffset; } }
  if (!node || !root.contains(node)) return null;
  return textOffset(root, node, off);
}
function textOffset(root: HTMLElement, node: Node, off: number) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let sum = 0;
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n === node) return sum + off;
    sum += (n.textContent ?? '').length;
  }
  return node === root ? (off === 0 ? 0 : sum) : sum;
}
const isWord = (c: string | undefined) => !!c && /[\p{L}\p{N}'’\-]/u.test(c);
function snap(text: string, a: number, b: number): Range {
  let s = Math.min(a, b), e = Math.max(a, b);
  while (s > 0 && isWord(text[s - 1])) s--;
  while (e < text.length && isWord(text[e])) e++;
  while (s < e && text[s] === ' ') s++;
  while (e > s && text[e - 1] === ' ') e--;
  return [s, e];
}

/** Up to four words from the start of each capitalised run, or the opening words: how a note gets cut fresh. */
export function autoRuns(text: string): string[] {
  const out: string[] = [];
  const words = text.split(/\s+/);
  const cap = (w: string) => /^[A-Z0-9]/.test(w);
  let run: string[] = [];
  const flush = () => {
    while (run.length && !cap(run[run.length - 1])) run.pop();
    if (run.length >= 2) out.push(run.slice(0, 5).join(' ').replace(/[,.:;!?]+$/, ''));
    run = [];
  };
  for (const w of words) {
    if (cap(w)) { run.push(w); if (/[,.:;!?]$/.test(w)) flush(); }
    else if (run.length && /^(at|of|the|in)$/.test(w)) run.push(w);
    else flush();
  }
  flush();
  if (out.length < 2) {
    const first = text.split(/\s+/).slice(0, 4).join(' ').replace(/[,.:;!?]+$/, '');
    if (first && !out.some((o) => first.includes(o) || o.includes(first))) out.unshift(first);
  }
  return out;
}

type Active = { el: HTMLElement; n: number; max: number; done: () => void };
const active = new Set<Active>();
let raf = 0;
function tick() {
  raf = 0;
  const vh = window.innerHeight;
  for (const a of active) {
    const r = a.el.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (vh * 0.9 - r.top) / (vh * 0.4 + r.height * 0.55)));
    a.max = Math.max(a.max, p);
    a.el.querySelectorAll<HTMLElement>('mark.hl[data-ri]').forEach((m) => {
      const f = Math.min(1, Math.max(0, a.max * a.n - Number(m.dataset.ri)));
      m.style.backgroundSize = `${(f * 100).toFixed(1)}% 100%`;
    });
    if (a.max >= 1) { active.delete(a); a.done(); }
  }
  if (active.size) raf = requestAnimationFrame(tick);
}

type EvProps = { id: string; text: string; runs?: readonly string[]; as?: keyof JSX.IntrinsicElements; className?: string; delay?: number; on?: boolean };

export function Ev({ id, text, runs = [], as = 'p', className, delay = 0, on }: EvProps) {
  const ref = useRef<HTMLElement>(null);
  const all = useCuts();
  const mine = all[id];
  const [seen, setSeen] = useState(still);
  const [temp, setTemp] = useState<Range | null>(null);

  // The pen follows the scroll: each run fills in turn as the evidence rises through the screen, and stays.
  useEffect(() => {
    const el = ref.current;
    if (!el || seen || on !== undefined || !runs.length) return;
    const a: Active = { el, n: runs.length, max: 0, done: () => setSeen(true) };
    const io = new IntersectionObserver((es) => {
      for (const e of es) {
        if (e.isIntersecting) { active.add(a); if (!raf) raf = requestAnimationFrame(tick); } else active.delete(a);
      }
    });
    io.observe(el);
    return () => { io.disconnect(); active.delete(a); };
  }, [seen, on, runs.length]);

  // Per character: 1 = pre-chosen run, 2 = the visitor's cut. Then group into spans.
  const segs = useMemo(() => {
    const flag = new Uint8Array(text.length);
    const runIx = new Int16Array(text.length).fill(-1);
    let from = 0;
    runs.forEach((r, i) => {
      let at = text.indexOf(r, from);
      if (at < 0) at = text.indexOf(r);
      if (at < 0) return;
      for (let k = at; k < at + r.length; k++) { flag[k] |= 1; runIx[k] = i; }
      from = at + r.length;
    });
    for (const [a, b] of [...(mine ?? []), ...(temp ? [temp] : [])]) for (let k = Math.max(0, a); k < Math.min(text.length, b); k++) flag[k] |= 2;
    const out: { t: string; f: number; i: number }[] = [];
    for (let k = 0; k < text.length; k++) {
      const last = out[out.length - 1];
      const f = flag[k] & 1 ? 1 : flag[k] & 2 ? 2 : 0;
      const i = f === 1 ? runIx[k] : -1;
      if (last && last.f === f && last.i === i) last.t += text[k]; else out.push({ t: text[k], f, i });
    }
    return out;
  }, [text, runs, mine, temp]);

  // The runs as read aloud, for the ending.
  const read = useMemo(() => {
    const r: string[] = [];
    let cur = '';
    for (const s of segs) { if (s.f) cur += s.t; else { if (cur.trim()) r.push(cur.trim()); cur = ''; } }
    if (cur.trim()) r.push(cur.trim());
    return JSON.stringify(r);
  }, [segs]);

  const drag = useRef<{ x: number; y: number; a: number | null; live: boolean; pid: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !ref.current) return;
    drag.current = { x: e.clientX, y: e.clientY, a: offsetAt(ref.current, e.clientX, e.clientY), live: false, pid: e.pointerId };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current, el = ref.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.live) {
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.4 && d.a !== null) {
        d.live = true;
        try { el.setPointerCapture(d.pid); } catch { /* fine */ }
        el.classList.add('cutting');
      } else if (Math.abs(dy) > 14) { drag.current = null; return; } else return;
    }
    window.getSelection()?.removeAllRanges();
    const b = offsetAt(el, e.clientX, e.clientY);
    if (b !== null && d.a !== null) setTemp(snap(text, d.a, b));
  };
  const end = () => {
    const d = drag.current;
    ref.current?.classList.remove('cutting');
    drag.current = null;
    if (d?.live && temp && temp[1] > temp[0]) { addCut(id, temp); window.getSelection()?.removeAllRanges(); }
    setTemp(null);
  };
  const onDoubleClick = () => { if (mine) { clearCut(id); window.getSelection()?.removeAllRanges(); } };

  const lit = on ?? seen;
  let n = 0;
  return createElement(
    as,
    { ref, className: `ev${on === undefined ? ' scrub' : ''}${lit ? ' on' : ''}${className ? ' ' + className : ''}`, 'data-ev': id, 'data-read': read, onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end, onDoubleClick },
    segs.map((s, k) => s.f === 0
      ? s.t
      : <mark key={k} data-ri={s.f === 1 ? s.i : undefined} className={s.f === 1 ? 'hl' : 'hl me'} style={s.f === 1 ? { transitionDelay: `${delay + (s.i >= 0 ? n++ : 0) * 0.32}s` } as React.CSSProperties : undefined}>{s.t}</mark>),
  );
}

/** Keyboard cut: select text inside any evidence with the keyboard, then press H. */
export function useKeyCut() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'h' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t && /^(INPUT|TEXTAREA)$/.test(t.tagName)) return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) return;
      const r = sel.getRangeAt(0);
      const root = (r.startContainer.parentElement)?.closest<HTMLElement>('[data-ev]');
      if (!root || !root.contains(r.endContainer)) return;
      const a = textOffset(root, r.startContainer, r.startOffset), b = textOffset(root, r.endContainer, r.endOffset);
      const text = root.textContent ?? '';
      addCut(root.dataset.ev!, snap(text, a, b));
      sel.removeAllRanges();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
