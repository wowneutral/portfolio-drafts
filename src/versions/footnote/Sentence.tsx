// The one sentence and its notes. Sidenote markup follows tufte-css (github.com/edwardtufte/tufte-css, MIT);
// the toggle is new: pressing a number re-solves the margin so its note sits level with its line.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { PERSON } from '@/content';

export type NoteDef = { n: number; label: string; to: string; body: ReactNode };

// "Armaan Seth¹ is a debater,² researcher³ and builder.⁴ He founded MITEZ⁵ and is head coach of Skeptical,⁶ and he does not like being told to keep it short.⁷"
type Piece = string | { w: string; n: number };
export const SENTENCE: Piece[] = [
  { w: PERSON.name, n: 1 }, ' is a ', { w: 'debater,', n: 2 }, ' ', { w: 'researcher', n: 3 }, ' and ', { w: 'builder.', n: 4 },
  ' He founded ', { w: 'MITEZ', n: 5 }, ' and is head coach of ', { w: 'Skeptical,', n: 6 },
  ' and he does not like being told to keep it ', { w: 'short.', n: 7 },
];

const GAP = 20;

/** Place notes in the margin without collisions. The pinned one sits exactly on its line; the rest give way. */
function solve(lines: number[], h: number[], pin: number) {
  const n = lines.length;
  const y = lines.slice();
  if (pin < 0) {
    // At rest the notes wait stacked at the top of the margin, beside the first line.
    y[0] = lines[0];
    for (let i = 1; i < n; i++) y[i] = y[i - 1] + h[i - 1] + GAP;
    return y;
  }
  y[pin] = lines[pin];
  for (let i = pin - 1; i >= 0; i--) y[i] = Math.min(lines[i], y[i + 1] - h[i] - GAP);
  if (y[0] < 0) { y[0] = 0; for (let i = 1; i <= pin; i++) y[i] = Math.max(y[i], y[i - 1] + h[i - 1] + GAP); }
  for (let i = pin + 1; i < n; i++) y[i] = Math.max(lines[i], y[i - 1] + h[i - 1] + GAP);
  return y;
}

function usePhone() {
  const q = '(max-width: 760px)';
  const [phone, set] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q);
    const on = () => set(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return phone;
}

export function Sentence({
  id, notes, onOpen, read, end, tail,
}: {
  id: string;
  notes: NoteDef[];
  onOpen?: (n: number) => void;
  read?: Set<number>;
  end?: boolean;
  tail?: { w: string; n: number; lead: string };
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const phone = usePhone();
  const [pin, setPin] = useState<number>(-1);
  const [open, setOpen] = useState<Set<number>>(() => new Set(end ? [8] : []));

  const layout = useCallback(() => {
    const el = wrap.current;
    if (!el || phone) return;
    const top = el.getBoundingClientRect().top;
    const sn = [...el.querySelectorAll<HTMLElement>('.sn')];
    const lines = sn.map((s) => {
      const w = el.querySelector<HTMLElement>(`[data-w="${s.dataset.n}"]`)!;
      const r = w.getBoundingClientRect();
      return r.top - top + r.height * 0.24;
    });
    const h = sn.map((s) => s.offsetHeight);
    const at = sn.findIndex((s) => +s.dataset.n! === pin);
    const y = solve(lines, h, at);
    sn.forEach((s, i) => { s.style.transform = `translate3d(0, ${Math.round(y[i])}px, 0)`; });
    const bottom = Math.max(0, ...y.map((v, i) => v + h[i]));
    el.style.minHeight = bottom + 'px';
    requestAnimationFrame(() => sn.forEach((s) => s.classList.add('ready')));
  }, [phone, pin]);

  useLayoutEffect(() => {
    layout();
    if (phone && wrap.current) { wrap.current.style.minHeight = ''; }
  }, [layout, phone]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => layout());
    ro.observe(el);
    document.fonts?.ready.then(() => layout());
    return () => ro.disconnect();
  }, [layout]);

  const press = (n: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpen?.(n);
    if (phone) {
      setOpen((s) => { const t = new Set(s); if (t.has(n)) t.delete(n); else t.add(n); return t; });
    } else {
      setPin((p) => (p === n ? -1 : n));
    }
  };

  const byN = new Map(notes.map((x) => [x.n, x]));
  const word = (p: { w: string; n: number }) => {
    const note = byN.get(p.n);
    const isOpen = open.has(p.n);
    return (
      <span className="w" data-w={p.n} key={p.n}>
        {p.w}
        {note ? (
          <a
            id={`${id}-ref-${p.n}`}
            className={`ref${pin === p.n ? ' on' : ''}${read?.has(p.n) ? ' read' : ''}`}
            href={`#${id}-fn-${p.n}`}
            aria-label={`Note ${p.n}, ${note.label}`}
            aria-controls={`${id}-fn-${p.n}`}
            {...(phone ? { 'aria-expanded': isOpen } : {})}
            onClick={(e) => press(p.n, e)}
          >{p.n}</a>
        ) : (
          <a
            id={`${id}-ref-${p.n}`}
            className={`ref${read?.has(p.n) ? ' read' : ''}`}
            href={`#note-${p.n}`}
            aria-label={`Note ${p.n}${read?.has(p.n) ? ', opened' : ''}`}
          >{p.n}</a>
        )}
        {note && (
          <span className={`sn${pin === p.n ? ' on' : ''}${isOpen ? ' open' : ''}`} id={`${id}-fn-${p.n}`} data-n={p.n} role="note">
            <a className="sn-n" href={`#${id}-ref-${p.n}`} aria-label={`Back to number ${p.n}`}>{p.n}</a>
            {note.to ? <a className="sn-to" href={note.to}>{note.label}</a> : <i>{note.label}</i>}.<span className="sn-b"> {note.body}</span>
          </span>
        )}
      </span>
    );
  };

  return (
    <div className={`sentence-wrap${pin >= 0 ? ' has-on' : ''}`} ref={wrap} onKeyDown={(e) => { if (e.key === 'Escape') setPin(-1); }}>
      <p className="sentence">
        {SENTENCE.map((p, i) => (typeof p === 'string' ? <span key={'s' + i}>{p}</span> : word(p)))}
        {end && tail && <><span>{tail.lead}</span>{word(tail)}</>}
      </p>
    </div>
  );
}
