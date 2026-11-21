// Remixed from React Bits AnimatedList (/home/claude/lab/rb/src/ts-default/Components/AnimatedList, MIT + Commons Clause):
// its keyboard listbox (arrows, Home, End, Enter, onItemSelect), the selected-item scale and the spring-driven ring are kept;
// the items are his argument cards, and the scroll-entrance pop is gone (the words never animate).
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { Card } from './cards';

type Props = {
  items: Card[];
  onItemSelect: (card: Card) => void;
  label: string;
  sub: (c: Card) => string;
};

export default function CaseList({ items, onItemSelect, label, sub }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const placeRef = useRef<(snap: boolean) => void>(() => {});
  const [selected, setSelected] = useState(-1);
  const baseId = useId();
  const sel = selected >= items.length ? items.length - 1 : selected;

  // The ring is a damped spring (omega 30, zeta 0.78), integrated at 240 Hz, as in the original.
  useLayoutEffect(() => {
    const indicator = indicatorRef.current;
    if (!indicator) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const m = { y: 0, h: 0, vy: 0, vh: 0, ty: 0, th: 0, ready: false };
    let raf = 0;
    let last = 0;
    const write = () => {
      indicator.style.transform = `translate3d(0, ${m.y.toFixed(2)}px, 0)`;
      indicator.style.height = `${m.h.toFixed(2)}px`;
    };
    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      const omega = 30, zeta = 0.78;
      const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        m.vy += (omega * omega * (m.ty - m.y) - 2 * zeta * omega * m.vy) * h;
        m.vh += (omega * omega * (m.th - m.h) - 2 * zeta * omega * m.vh) * h;
        m.y += m.vy * h;
        m.h += m.vh * h;
      }
      const moving = Math.abs(m.ty - m.y) > 0.05 || Math.abs(m.th - m.h) > 0.05 || Math.abs(m.vy) + Math.abs(m.vh) > 0.5;
      if (!moving) { m.y = m.ty; m.h = m.th; m.vy = m.vh = 0; }
      write();
      if (moving) raf = requestAnimationFrame(frame);
    };
    placeRef.current = (snap: boolean) => {
      const item = itemRefs.current[selRef.current];
      if (!item) { indicator.style.opacity = '0'; m.ready = false; return; }
      indicator.style.opacity = '1';
      m.ty = item.offsetTop;
      m.th = item.offsetHeight;
      if (snap || reduced || !m.ready) {
        m.y = m.ty; m.h = m.th; m.vy = m.vh = 0; m.ready = true; write(); return;
      }
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    };
    const ro = new ResizeObserver(() => placeRef.current(true));
    if (viewportRef.current) ro.observe(viewportRef.current);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  const selRef = useRef(sel);
  selRef.current = sel;
  useEffect(() => { placeRef.current(false); }, [sel, items.length]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const count = items.length;
    if (!count) return;
    let next: number | null = null;
    if (e.key === 'ArrowDown') next = sel < 0 ? 0 : sel + 1;
    else if (e.key === 'ArrowUp') next = sel < 0 ? count - 1 : sel - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = count - 1;
    else if ((e.key === 'Enter' || e.key === ' ') && sel >= 0 && sel < count) {
      e.preventDefault();
      onItemSelect(items[sel]);
      return;
    }
    if (next === null) return;
    e.preventDefault();
    next = Math.min(count - 1, Math.max(0, next));
    setSelected(next);
    itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
  };

  itemRefs.current.length = items.length;

  return (
    <div
      ref={viewportRef}
      className="sp-list"
      role="listbox"
      tabIndex={0}
      aria-label={label}
      aria-activedescendant={sel >= 0 && sel < items.length ? `${baseId}-${sel}` : undefined}
      onKeyDown={onKey}
      onFocus={() => { if (sel < 0 && items.length) setSelected(0); }}
      onPointerLeave={() => setSelected(-1)}
    >
      {items.map((c, i) => (
        <div
          key={c.id}
          ref={(el) => { itemRefs.current[i] = el; }}
          id={`${baseId}-${i}`}
          className="sp-card"
          data-flip-id={c.id}
          role="option"
          aria-selected={i === sel}
          data-selected={i === sel ? '' : undefined}
          onPointerEnter={() => setSelected(i)}
          onClick={() => onItemSelect(c)}
        >
          <span className="sp-card-tag">{c.tag}</span>
          <span className="sp-card-sub">{sub(c)}</span>
        </div>
      ))}
      <span ref={indicatorRef} className="sp-ring" aria-hidden="true" />
    </div>
  );
}
