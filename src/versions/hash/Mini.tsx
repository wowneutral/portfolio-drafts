// A tiny drawing of the first screen a seed sets: a few ink rectangles on a sheet.
import { PLACES } from './deck';
import type { Band, Layout } from './deck';

const Y: Record<Band, number> = { t: 8, m: 30, b: 52 };

export function Mini({ lay, className }: { lay: Layout; className?: string }) {
  const p = PLACES[lay.place];
  const x = (c: number) => 6 + (c - 1) * 9;
  const w = (s: number) => s * 9 - 1.6;
  const h = p.lines === 2 ? 15 : 9;
  const nameY = p.name.band === 'b' ? 70 - h : p.name.band === 'm' ? 40 - h / 2 : 8;
  const bars = (c: number, s: number, y: number, n: number) =>
    Array.from({ length: n }, (_, i) => <rect key={i} x={x(c)} y={y + i * 3.2} width={w(s) * (i === n - 1 ? 0.6 : 1)} height="1.4" />);
  return (
    <svg className={'mini ' + (className ?? '')} viewBox="0 0 120 80" aria-hidden="true" focusable="false">
      <rect className="mini-sheet" x="0.5" y="0.5" width="119" height="79" />
      <g className="mini-ink">
        {lay.v ? <rect x="6" y="6" width="9" height="68" /> : <rect x={x(p.name.c)} y={nameY} width={w(p.name.s)} height={h} />}
        {bars(lay.v ? Math.max(p.note.c, 3) : p.note.c, lay.v ? Math.min(p.note.s, 13 - Math.max(p.note.c, 3)) : p.note.s, p.note.band === p.name.band && !lay.v ? (p.name.band === 'b' ? 56 : p.name.band === 'm' ? 34 : 9) : Y[p.note.band] + (p.note.band === 'b' ? 8 : 0), 4)}
        {bars(lay.v ? Math.max(p.colo.c, 3) : p.colo.c, Math.min(p.colo.s, 3), p.colo.band === p.name.band && !lay.v ? (p.name.band === 'b' ? 64 : 12) : Y[p.colo.band] + (p.colo.band === 'b' ? 14 : 0), 2)}
      </g>
    </svg>
  );
}
