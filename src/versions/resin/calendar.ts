// The floor of the resin scene: twenty weeks of his GitHub days, newest week on the right.
import type { Activity } from '@/lib/github';

export const WEEKS = 20;
export type Day = { key: string; col: number; row: number; commits: Activity[] };

const pad = (n: number) => String(n).padStart(2, '0');
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Only days with at least one real commit from useGitHub(); nothing else is drawn. */
export function litDays(activity: Activity[], now = new Date()): Day[] {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - now.getDay()));
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - (WEEKS * 7 - 1));
  const by = new Map<string, Day>();
  for (const a of activity) {
    const t = new Date(a.at);
    if (Number.isNaN(t.getTime())) continue;
    const d = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    if (d < start || d > end) continue;
    const key = dayKey(d);
    const i = Math.round((d.getTime() - start.getTime()) / 86400000);
    const day = by.get(key) ?? { key, col: Math.floor(i / 7), row: i % 7, commits: [] };
    day.commits.push(a);
    by.set(key, day);
  }
  return [...by.values()].sort((a, b) => b.key.localeCompare(a.key));
}
