// Live GitHub activity for wowneutral, fetched in the visitor's browser (no token,
// 60 requests an hour per visitor, cached for ten minutes in sessionStorage).
// If GitHub is unreachable the hook keeps returning the static list in content.ts,
// so a version never shows an empty or broken block.
import { useEffect, useState } from 'react';
import { GITHUB } from '@/content';

export type Repo = { name: string; description: string | null; language: string | null; href: string; stars?: number; pushedAt?: string };
export type Activity = { repo: string; message: string; at: string; href: string };
export type GitHubData = { repos: Repo[]; activity: Activity[]; commitsThisMonth: number | null; live: boolean };

const KEY = 'gh:wowneutral:v1';
const FALLBACK: GitHubData = { repos: GITHUB.repos.map((r) => ({ ...r })), activity: [], commitsThisMonth: null, live: false };

function readCache(): GitHubData | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const { t, d } = JSON.parse(raw);
    return Date.now() - t < 10 * 60 * 1000 ? d : null;
  } catch { return null; }
}

async function load(): Promise<GitHubData> {
  const api = 'https://api.github.com/users/' + GITHUB.user;
  const [reposRes, eventsRes] = await Promise.all([
    fetch(`${api}/repos?sort=pushed&per_page=12`),
    fetch(`${api}/events/public?per_page=60`),
  ]);
  if (!reposRes.ok) throw new Error('repos ' + reposRes.status);
  const repos = ((await reposRes.json()) as any[])
    .filter((r) => !r.fork)
    .map((r) => ({ name: r.name, description: r.description, language: r.language, href: r.html_url, stars: r.stargazers_count, pushedAt: r.pushed_at }));
  const events = eventsRes.ok ? ((await eventsRes.json()) as any[]) : [];
  const month = new Date().toISOString().slice(0, 7);
  let commitsThisMonth = 0;
  const activity: Activity[] = [];
  for (const e of events) {
    if (e.type !== 'PushEvent') continue;
    const commits = e.payload?.commits ?? [];
    if (String(e.created_at).startsWith(month)) commitsThisMonth += e.payload?.size ?? commits.length;
    for (const c of commits) {
      activity.push({
        repo: String(e.repo?.name ?? '').replace(/^[^/]+\//, ''),
        message: String(c.message ?? '').split('\n')[0],
        at: e.created_at,
        href: `https://github.com/${e.repo?.name}/commit/${c.sha}`,
      });
    }
  }
  return { repos: repos.length ? repos : FALLBACK.repos, activity: activity.slice(0, 12), commitsThisMonth: events.length ? commitsThisMonth : null, live: true };
}

export function useGitHub(): GitHubData {
  const [data, set] = useState<GitHubData>(() => readCache() ?? FALLBACK);
  useEffect(() => {
    if (data.live) return;
    let alive = true;
    load()
      .then((d) => {
        if (!alive) return;
        set(d);
        try { sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), d })); } catch { /* storage off: fine */ }
      })
      .catch(() => { /* offline or rate limited: keep the fallback */ });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return data;
}

/** "3 hours ago" style, for activity rows. */
export function ago(iso: string) {
  const sec = (new Date(iso).getTime() - Date.now()) / 1000;
  if (!Number.isFinite(sec)) return '';
  const units: [Intl.RelativeTimeFormatUnit, number][] = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [u, n] of units) if (Math.abs(sec) >= n) return rtf.format(Math.round(sec / n), u);
  return 'just now';
}
