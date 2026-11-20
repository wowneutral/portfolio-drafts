// The rule of the page: data in, a weight and a width out.
import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import type { Activity } from '@/lib/github';
import type { Note } from '@/lib/notes';

export const FONT = "'Archivo Variable', 'Archivo', system-ui, sans-serif";
export type Setting = { w: number; d: number };
export const MIDDLE: Setting = { w: 560, d: 100 };
const DAY = 86400000;

/** Local calendar date as yyyy-mm-dd. */
export const isoOf = (t: number | string | Date) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dayDiff = (a: string, b: string) => Math.round((new Date(a + 'T12:00:00').getTime() - new Date(b + 'T12:00:00').getTime()) / DAY);

/** The last thirty days, today first. */
export function lastDays(n = 30) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => isoOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 12)));
}

/** Weight from commits in the seven days ending on each day; width from days since the last note. */
export function settingsFor(days: string[], activity: Activity[], notes: Note[]): Setting[] {
  const per = new Map<string, number>();
  for (const a of activity) { const k = isoOf(a.at); per.set(k, (per.get(k) ?? 0) + 1); }
  const hasGit = activity.length > 0;
  return days.map((day) => {
    let w = MIDDLE.w;
    if (hasGit) {
      let n = 0;
      for (let k = 0; k < 7; k++) n += per.get(isoOf(new Date(day + 'T12:00:00').getTime() - k * DAY)) ?? 0;
      w = Math.round(100 + 800 * (1 - Math.exp(-n / 4)));
    }
    let d = MIDDLE.d;
    if (notes.length) {
      const last = notes.find((x) => x.date <= day);
      d = last ? Math.max(62, 125 - dayDiff(day, last.date) * 9) : 62;
    }
    return { w, d };
  });
}

/** Repos and commits: heavier the more recently they moved. */
export const recencyWeight = (iso: string | undefined, spanDays: number, lo = 160) => {
  if (!iso) return 500;
  const days = Math.max(0, (Date.now() - new Date(iso).getTime()) / DAY);
  return Math.round(900 - Math.min(1, Math.log1p(days) / Math.log1p(spanDays)) * (900 - lo));
};

/** A note's heading width from its length. */
export const widthFromLength = (len: number) => Math.round(62 + Math.min(1, len / 420) * 63);

let probe: HTMLSpanElement | null = null;
/** Width of a run of text at 100px in a given setting. */
export function measure(text: string, s: Setting, upper = false) {
  if (!probe) {
    probe = document.createElement('span');
    probe.setAttribute('aria-hidden', 'true');
    Object.assign(probe.style, { position: 'fixed', left: '0', top: '0', whiteSpace: 'nowrap', fontSize: '16px', fontFamily: FONT, visibility: 'hidden', pointerEvents: 'none', letterSpacing: '0' });
    document.body.appendChild(probe);
  }
  probe.style.fontWeight = String(s.w);
  probe.style.fontStretch = s.d + '%';
  probe.style.textTransform = upper ? 'uppercase' : 'none';
  probe.textContent = text;
  return probe.getBoundingClientRect().width * 6.25;
}

/** Re-run when the box resizes or the font arrives. */
export function useWidth(ref: RefObject<HTMLElement | null>) {
  const [w, set] = useState(0);
  const [, fontTick] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => set(el.clientWidth));
    ro.observe(el); set(el.clientWidth);
    return () => ro.disconnect();
  }, [ref]);
  useEffect(() => { document.fonts?.ready.then(() => fontTick((t) => t + 1)); }, []);
  return w;
}
