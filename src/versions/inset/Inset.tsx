// Remixed from MediaBetweenText in fancy (github.com/danielpetho/fancy, MIT): media that opens in the gap between two parts of a line, on hover or in view.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ElementType, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { still } from '@/lib/utils';

/** One thing that opens between two words. `w` and `h` are in em of the line it sits in. */
export type Media = { src?: string; alt?: string; node?: ReactNode; href?: string; w: number; h?: number; key?: string };
export type Part = string | Media | Media[];

const PAD = 0.24; // the opened gap brings its own word space

/** Split a sentence after the words named, and put the media there: gaps('I make websites, tools', [['websites,', img]]). */
export function gaps(sentence: string, at: [string, Media | Media[]][]): Part[] {
  const out: Part[] = [];
  let rest = sentence;
  for (const [word, media] of at) {
    const i = rest.indexOf(word);
    if (i < 0) continue;
    out.push(rest.slice(0, i + word.length), media);
    rest = rest.slice(i + word.length);
  }
  out.push(rest);
  return out;
}

/** Split after the nth word. */
export function afterWord(sentence: string, n: number, media: Media | Media[]): Part[] {
  const words = sentence.split(' ');
  if (words.length < 2) return [sentence, media];
  const k = Math.max(1, Math.min(n, words.length - 1));
  return [words.slice(0, k).join(' '), media, ' ' + words.slice(k).join(' ')];
}

const width = (m: Media | Media[]) => (Array.isArray(m) ? m.reduce((s, x) => s + x.w, 0) + 0.12 * (m.length - 1) : m.w) + PAD;

type Props = {
  as?: ElementType;
  parts: Part[];
  className?: string;
  id?: string;
  /** 'view' opens while the line crosses the middle of the screen, or on hover and focus. 'load' opens shortly after mount. */
  trigger?: 'view' | 'load';
  delay?: number;
};

export function Inset({ as: Tag = 'p', parts, className = '', id, trigger = 'view', delay = 0 }: Props) {
  const root = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const [hover, setHover] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [minH, setMinH] = useState<number | undefined>(undefined);
  const open = still || hover || (trigger === 'load' ? loaded : inView);

  // Fixed line box: measure the sentence with every gap open, so the copy below never jumps.
  const measure = useCallback(() => {
    const el = root.current;
    if (!el) return;
    const g = [...el.querySelectorAll<HTMLElement>('.in-gap')];
    const was = g.map((x) => x.style.width);
    g.forEach((x) => (x.style.width = x.dataset.w + 'em'));
    el.style.minHeight = '';
    const a = el.getBoundingClientRect().height;
    g.forEach((x) => (x.style.width = '0px'));
    const b = el.getBoundingClientRect().height;
    g.forEach((x, i) => (x.style.width = was[i]));
    setMinH(Math.ceil(Math.max(a, b)));
  }, []);

  useLayoutEffect(() => { measure(); }, [measure, parts]);
  useEffect(() => {
    let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    addEventListener('resize', on);
    document.fonts?.ready.then(on);
    return () => { removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, [measure]);

  useEffect(() => {
    if (trigger === 'load') {
      const t = setTimeout(() => setLoaded(true), delay);
      return () => clearTimeout(t);
    }
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: '-24% 0px -24% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [trigger, delay]);

  const spring = still ? { duration: 0 } : { type: 'spring' as const, duration: 1.05, bounce: 0, delay: open ? 0.05 : 0 };

  return (
    <Tag
      ref={root}
      id={id}
      className={'in-line ' + className + (open ? ' is-open' : '')}
      style={minH ? { minHeight: minH } : undefined}
      onPointerEnter={(e: React.PointerEvent) => e.pointerType === 'mouse' && setHover(true)}
      onPointerLeave={(e: React.PointerEvent) => e.pointerType === 'mouse' && setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={(e: React.FocusEvent) => { if (!root.current?.contains(e.relatedTarget as Node)) setHover(false); }}
    >
      {parts.map((p, i) => {
        if (typeof p === 'string') {
          // The word before a gap and the gap never part across a line break.
          const next = parts[i + 1];
          const text = p;
          if (!next || typeof next === 'string') return <span key={i}>{text}</span>;
          const k = text.lastIndexOf(' ');
          return <span key={i}>{text.slice(0, k + 1)}</span>;
        }
        const before = parts[i - 1];
        const word = typeof before === 'string' ? before.slice(before.lastIndexOf(' ') + 1) : '';
        const list = Array.isArray(p) ? p : [p];
        const w = width(p);
        const decorative = list.every((m) => !m.src && !m.href);
        return (
          <span key={i + (list[0].key ?? list[0].src ?? '')} className="in-glue">{word}<motion.span
            className="in-gap"
            data-w={w.toFixed(3)}
            aria-hidden={decorative ? true : undefined}
            initial={{ width: still ? `${w}em` : '0em' }}
            animate={{ width: open ? `${w}em` : '0em' }}
            transition={spring}
            style={{ '--ih': `${list[0].h ?? 0.9}em` } as React.CSSProperties}
          >
            <span className="in-media">
              {list.map((m, j) => {
                const inner = m.src ? <img src={m.src} alt={m.alt ?? ''} width={Math.round(m.w * 100)} height={Math.round((m.h ?? 0.9) * 100)} draggable={false} /> : m.node;
                return m.href ? (
                  <a key={j} className="in-cell" href={m.href} target="_blank" rel="noreferrer" style={{ width: m.w + 'em' }}>{inner}</a>
                ) : (
                  <span key={j} className="in-cell" style={{ width: m.w + 'em' }}>{inner}</span>
                );
              })}
            </span>
          </motion.span></span>
        );
      })}
    </Tag>
  );
}
