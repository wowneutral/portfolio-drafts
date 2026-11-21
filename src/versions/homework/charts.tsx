// Charts for draft 98, drawn with roughjs (MIT, github.com/rough-stuff/rough) as a student would rule them on graph paper. Every value comes from the live hooks or content.ts.
import { useMemo, useRef, type CSSProperties } from 'react';
import { flat, g, hatch, pen, Paths, RED, INK, useInk, useWidth, seedOf, type Shape } from './rough';

/** A bar chart by day, for his commits. Bars answer when pressed. */
export function DayBars({ days, ver, sel, onSel }: {
  days: { iso: string; long: string; label: string; short: string; value: number }[]; ver: string; sel: number; onSel: (i: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const w = useWidth(ref);
  const ink = useInk(ref, ver);
  const narrow = w < 520;
  const H = narrow ? 250 : 300, top = 40, bottom = 46, left = 4;
  const n = days.length;
  const slot = n ? (w - left - 8) / n : 0;
  const max = Math.max(1, ...days.map((d) => d.value));
  const every = slot < 30 ? 2 : 1;
  const plot = H - top - bottom;
  const shapes = useMemo<Shape[]>(() => {
    if (!w) return [];
    const ax = flat(
      g.line(left, H - bottom, w - 2, H - bottom, pen(seedOf(ver + 'x'), { stroke: INK, strokeWidth: 1.6 })),
      g.line(left, top - 18, left, H - bottom, pen(seedOf(ver + 'y'), { stroke: INK, strokeWidth: 1.6 })),
    );
    const bars = days.flatMap((d, i) => {
      if (!d.value) return [];
      const bw = Math.max(10, slot * 0.58), x = left + slot * i + (slot - bw) / 2, h = (d.value / max) * plot;
      return flat(g.rectangle(x, H - bottom - h, bw, h, hatch(seedOf(ver + d.iso), { hachureGap: bw < 24 ? 4 : 5 })));
    });
    return [...ax, ...bars];
  }, [w, ver, days, slot, max, plot, H]);
  const ring = useMemo<Shape[]>(() => {
    if (!w || sel < 0 || !days[sel]) return [];
    const d = days[sel], cx = left + slot * (sel + 0.5), y = H - bottom - (d.value / max) * plot - 16;
    return flat(g.ellipse(cx, y, 40, 30, pen(seedOf(ver + 'sel' + sel), { stroke: RED, strokeWidth: 2 })));
  }, [w, sel, ver, days, slot, max, plot, H]);
  return (
    <div className="hw-chart" ref={ref}>
      {w > 0 && (
        <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} aria-hidden="true" className={ink}>
          <Paths shapes={shapes} step={90} />
          <g className="hw-sel"><Paths shapes={ring} /></g>
          {days.map((d, i) => {
            const cx = left + slot * (i + 0.5);
            const y = H - bottom - (d.value / max) * plot;
            return (
              <g key={d.iso}>
                <text x={cx} y={y - 9} textAnchor="middle" className="hw-val">{d.value}</text>
                {i % every === 0 && <text x={cx} y={H - bottom + 22} textAnchor="middle" className="hw-axis">{narrow ? d.short : d.label}</text>}
              </g>
            );
          })}
        </svg>
      )}
      {w > 0 && days.map((d, i) => (
        <button key={d.iso} type="button" className="hw-hit" aria-pressed={sel === i} onClick={() => onSel(sel === i ? -1 : i)}
          style={{ left: left + slot * i, width: slot, top: 0, height: H } as CSSProperties}>
          <span className="sr-only-x sr-only">{d.long}: {d.value} {d.value === 1 ? 'commit' : 'commits'}</span>
        </button>
      ))}
    </div>
  );
}

/** One horizontal hachured bar, scaled against the largest value in its chart. */
export function HBar({ value, max, seed, ver }: { value: number; max: number; seed: string; ver: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const w = useWidth(ref);
  const ink = useInk(ref, ver);
  const H = 48;
  const len = Math.max(8, (value / max) * (w - 4));
  const shapes = useMemo(() => (w ? flat(g.rectangle(2, 4, len, H - 8, hatch(seedOf(ver + seed), { hachureGap: 6 }))) : []), [w, len, seed, ver]);
  return (
    <div className="hw-hbar" ref={ref} aria-hidden="true">
      {w > 0 && <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} className={ink}><Paths shapes={shapes} /></svg>}
    </div>
  );
}

/** Tally marks in fives, struck through. */
export function Tally({ n, seed, h = 34 }: { n: number; seed: string; h?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const ink = useInk(ref, seed + n);
  const groups = Math.ceil(n / 5);
  const k8 = h / 34 * 8, gw = k8 * 5.75;
  const W = Math.max(12, groups * gw), H = h;
  const shapes = useMemo(() => {
    const out: Shape[] = [];
    for (let i = 0; i < n; i++) {
      const gi = Math.floor(i / 5), k = i % 5, x0 = gi * gw + 4, sw = h > 40 ? 3 : 1.8;
      if (k < 4) out.push(...flat(g.line(x0 + k * k8, 4, x0 + k * k8 + 1, H - 4, pen(seedOf(seed + i), { strokeWidth: sw, stroke: INK }))));
      else out.push(...flat(g.line(x0 - 4, H - 8, x0 + k8 * 3.8, 8, pen(seedOf(seed + i), { strokeWidth: sw, stroke: INK }))));
    }
    return out;
  }, [n, seed, h, gw, k8]);
  return (
    <span className="hw-tally" ref={ref} aria-hidden="true">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className={ink}><Paths shapes={shapes} step={110} /></svg>
    </span>
  );
}

const DAY = 86400000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const at = (d: string) => Date.parse(d + 'T12:00:00Z');

/** His notes as dots on a dated line. Dots open their note. With no notes, one open circle on today. */
export function NoteStrip({ dates, sel, onSel, today, label }: { dates: string[]; sel: number; onSel: (i: number) => void; today: string; label: (d: string) => string }) {
  const ref = useRef<HTMLDivElement>(null);
  const w = useWidth(ref);
  const ver = dates.join(',') || 'none';
  const ink = useInk(ref, ver);
  const narrow = w < 520;
  const end = Math.max(at(today), ...dates.map(at));
  const start = Math.min(end - (narrow ? 9 : 13) * DAY, ...dates.map(at));
  const span = Math.max(1, Math.round((end - start) / DAY));
  const H = 96, pad = 22, y = 40;
  const X = (d: string) => pad + ((at(d) - start) / DAY / span) * (w - pad * 2);
  const step = Math.max(1, Math.ceil((span * (narrow ? 52 : 62)) / Math.max(1, w)));
  const ticks = Array.from({ length: span + 1 }, (_, i) => iso(start + i * DAY));
  const shapes = useMemo(() => {
    if (!w) return [];
    const out: Shape[] = flat(g.line(pad - 12, y, w - pad + 12, y, pen(seedOf('strip' + w), { stroke: INK, strokeWidth: 1.5 })));
    ticks.forEach((d, i) => { if (i % step === 0) out.push(...flat(g.line(X(d), y - 6, X(d), y + 6, pen(seedOf('t' + d), { strokeWidth: 1.2 })))); });
    if (!dates.length) out.push(...flat(g.circle(X(today), y, 22, pen(seedOf('open'), { stroke: RED, strokeWidth: 2 }))));
    dates.forEach((d) => out.push(...flat(g.circle(X(d), y, 20, pen(seedOf('dot' + d), { stroke: INK, fill: INK, fillStyle: 'solid', strokeWidth: 1.2 })))));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, ver, step, span, today]);
  const ring = useMemo(() => (w && sel >= 0 && dates[sel] ? flat(g.ellipse(X(dates[sel]), y, 38, 34, pen(seedOf('ring' + dates[sel]), { stroke: RED, strokeWidth: 2.2 }))) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [w, sel, ver, span]);
  const gap = dates.length > 1 ? Math.min(...dates.slice(1).map((d, i) => Math.abs(X(dates[i]) - X(d)))) : 44;
  const bw = Math.max(20, Math.min(44, gap));
  return (
    <div className="hw-strip" ref={ref}>
      {w > 0 && (
        <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} aria-hidden="true" className={ink}>
          <Paths shapes={shapes} step={60} />
          <g className="hw-sel"><Paths shapes={ring} /></g>
          {ticks.map((d, i) => (i % step === 0 ? <text key={d} x={X(d)} y={y + 30} textAnchor="middle" className="hw-axis">{label(d)}</text> : null))}
        </svg>
      )}
      {w > 0 && dates.map((d, i) => (
        <button key={d} type="button" className="hw-hit hw-dot" aria-pressed={sel === i} onClick={() => onSel(i)} style={{ left: X(d) - bw / 2, width: bw, top: y - 22, height: 44 }}>
          <span className="sr-only-x sr-only">Note of {d}</span>
        </button>
      ))}
    </div>
  );
}

/** A pie chart, hachured slice by slice, each slice labelled outside its edge. */
export function Pie({ slices, ver }: { slices: { label: string; value: number }[]; ver: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const w = useWidth(ref);
  const ink = useInk(ref, ver + slices.map((s) => s.label + s.value).join());
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  const narrow = w < 420;
  const R = Math.min(narrow ? 92 : 120, Math.max(60, w / 2 - 110));
  const cy = R + 40, H = R * 2 + 80 + (narrow ? slices.length * 28 : 0), cx = narrow ? R + 24 : w / 2;
  const rowY = (i: number) => cy + R + 44 + i * 28;
  const angles = useMemo(() => {
    let a = -Math.PI / 2;
    return slices.map((s) => { const start = a; a += (s.value / total) * Math.PI * 2; return { start, stop: a }; });
  }, [slices, total]);
  const shapes = useMemo(() => {
    if (!w) return [];
    const out: Shape[] = [];
    slices.forEach((s, i) => {
      const { start, stop } = angles[i];
      const o = hatch(seedOf(ver + s.label), { hachureAngle: [-50, 40, 0, 90][i % 4], hachureGap: 6 + (i % 3) * 2, stroke: INK, strokeWidth: 1.6 });
      out.push(...flat(slices.length === 1 ? g.circle(cx, cy, R * 2, o) : g.arc(cx, cy, R * 2, R * 2, start, stop, true, o)));
      if (narrow) out.push(...flat(g.rectangle(6, rowY(i) - 14, 18, 16, { ...o, hachureGap: 4 })));
    });
    return out;
  }, [w, slices, angles, ver, cx, cy, R, narrow]);
  return (
    <div className="hw-chart hw-pie" ref={ref}>
      {w > 0 && (
        <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} aria-hidden="true" className={ink}>
          <Paths shapes={shapes} step={200} />
          {narrow && slices.map((s, i) => <text key={s.label} x={34} y={rowY(i)} className="hw-val hw-pie-l">{s.label}, {s.value} of {total}</text>)}
          {!narrow && slices.map((s, i) => {
            const m = (angles[i].start + angles[i].stop) / 2;
            const x = cx + Math.cos(m) * (R + 18), y = cy + Math.sin(m) * (R + 18);
            const anchor = Math.cos(m) > 0.2 ? 'start' : Math.cos(m) < -0.2 ? 'end' : 'middle';
            return (
              <text key={s.label} x={x} y={y + (Math.sin(m) > 0.3 ? 14 : Math.sin(m) < -0.3 ? -4 : 5)} textAnchor={anchor} className="hw-val hw-pie-l">
                {s.label}, {s.value} of {total}
              </text>
            );
          })}
        </svg>
      )}
    </div>
  );
}
