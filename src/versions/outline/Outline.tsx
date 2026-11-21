// Remixed from React Bits LineSidebar (MIT + Commons Clause): tick marks and labels that lean toward the pointer with a falloff curve, a marker on the active item, click to jump.
// Here the flat items become a four level outline (pocket, hat, block) that follows the scroll.
import { useCallback, useEffect, useRef } from 'react';
import { still } from '@/lib/utils';

export type Entry = { id: string; label: string; kids?: Entry[] };

const smooth = (p: number) => p * p * (3 - 2 * p);
const RADIUS = 92;
const TAU = 0.11; // the base component's 100ms smoothing, a touch heavier

type Props = {
  tree: Entry[];
  path: string[]; // active pocket, hat, block ids
  done: boolean; // reached the end of the file
  onJump?: () => void;
  sweep?: boolean; // lean once down the column when the page opens
};

export default function Outline({ tree, path, done, onJump, sweep }: Props) {
  const listRef = useRef<HTMLUListElement>(null);
  const els = useRef(new Map<string, HTMLLIElement>());
  const target = useRef(new Map<string, number>());
  const cur = useRef(new Map<string, number>());
  const raf = useRef<number | null>(null);
  const last = useRef(0);
  const pathRef = useRef(path);
  pathRef.current = path;

  const frame = useCallback((now: number) => {
    const dt = Math.min((now - last.current) / 1000, 0.05);
    last.current = now;
    const k = 1 - Math.exp(-dt / TAU);
    let moving = false;
    els.current.forEach((el, id) => {
      const on = pathRef.current.includes(id) ? 1 : 0;
      const t = Math.max(target.current.get(id) ?? 0, on);
      const c = cur.current.get(id) ?? 0;
      const n = c + (t - c) * k;
      const settled = Math.abs(t - n) < 0.0015;
      const v = settled ? t : n;
      cur.current.set(id, v);
      el.style.setProperty('--effect', v.toFixed(4));
      if (!settled) moving = true;
    });
    raf.current = moving ? requestAnimationFrame(frame) : null;
  }, []);

  const start = useCallback(() => {
    if (still) {
      els.current.forEach((el, id) => el.style.setProperty('--effect', pathRef.current.includes(id) ? '1' : '0'));
      return;
    }
    if (raf.current != null) cancelAnimationFrame(raf.current);
    last.current = performance.now();
    raf.current = requestAnimationFrame(frame);
  }, [frame]);

  const lean = useCallback((y: number) => {
    els.current.forEach((el, id) => {
      const r = el.firstElementChild!.getBoundingClientRect();
      const d = Math.abs(y - (r.top + r.height / 2));
      target.current.set(id, smooth(Math.max(0, 1 - d / RADIUS)));
    });
    start();
  }, [start]);

  const leave = useCallback(() => { target.current.clear(); start(); }, [start]);

  useEffect(() => { start(); }, [path.join('|'), start]); // eslint-disable-line react-hooks/exhaustive-deps

  // The authored opening: the lean passes once down the column, as if a hand ran down the file.
  useEffect(() => {
    if (!sweep || still) return;
    const list = listRef.current; if (!list) return;
    let id = 0; const t0 = performance.now() + 450;
    const run = (now: number) => {
      const p = (now - t0) / 1100;
      if (p < 0) { id = requestAnimationFrame(run); return; }
      if (p > 1) { leave(); return; }
      const r = list.getBoundingClientRect();
      lean(r.top + (1 - Math.pow(1 - p, 2)) * (r.height + RADIUS));
      id = requestAnimationFrame(run);
    };
    id = requestAnimationFrame(run);
    return () => cancelAnimationFrame(id);
  }, [sweep, lean, leave]);

  useEffect(() => () => { if (raf.current != null) cancelAnimationFrame(raf.current); }, []);

  const deepest = path[path.length - 1];
  const pocketAt = tree.findIndex((p) => p.id === path[0]);

  const item = (e: Entry, lv: number, i: number): React.ReactNode => {
    const open = path.includes(e.id);
    return (
      <li
        key={e.id}
        ref={(el) => { if (el) els.current.set(e.id, el); else els.current.delete(e.id); }}
        className={`ol-i ol-l${lv}${open ? ' is-on' : ''}${lv === 1 && i < pocketAt ? ' is-read' : ''}`}
      >
        <a href={`#${e.id}`} aria-current={deepest === e.id ? 'location' : undefined} onClick={onJump}>
          <span className="ol-mk" aria-hidden="true" />
          <span className="ol-lb">{e.label}</span>
        </a>
        {open && e.kids && e.kids.length > 0 && <ul>{e.kids.map((k, j) => item(k, lv + 1, j))}</ul>}
      </li>
    );
  };

  return (
    <div className="ol-tree">
      <ul ref={listRef} onPointerMove={(e) => lean(e.clientY)} onPointerLeave={leave}>
        {tree.map((p, i) => item(p, 1, i))}
      </ul>
      <span className={`ol-end${done ? ' is-on' : ''}`} aria-hidden="true" />
    </div>
  );
}
