// The row of volumes, left to right in the order the page reads, and the little
// shared state the scene reads every frame (never React state per frame).
import { WORK, NOW } from '@/content';
import type { Repo, Activity } from '@/lib/github';

export type Cloth = 'green' | 'black' | 'card' | 'paint' | 'board';
export type Book = {
  id: string;           // the DOM section it opens
  label: string;        // what is stamped on the spine (a section name, never a title)
  foot?: string;        // a second, smaller line at the foot of the spine
  w: number; h: number; d: number;
  cloth: Cloth;
  x: number;            // centre, filled in by layout()
  across?: boolean;     // lettering runs across (short bookends) instead of down
  repo?: string;
};

const G = 0.035; // the gap between volumes

const WORD: Record<string, string> = { drafts: 'One hundred drafts' };
const WW = [0.6, 0.5, 0.46, 0.44, 0.4, 0.42, 0.52, 0.62];
const WH = [2.42, 2.3, 2.2, 2.24, 2.1, 2.16, 2.36, 2.6];

export function layout(repos: Repo[], activity: Activity[]): Book[] {
  const rows: Omit<Book, 'x'>[] = [
    { id: 'about', label: 'About', w: 0.62, h: 2.36, d: 1.5, cloth: 'green' },
    { id: 'fbk', label: 'Champion', foot: 'Florida Blue Key', w: 0.68, h: 2.96, d: 1.56, cloth: 'black' },
    { id: 'wildcat', label: 'Champion', foot: 'Wildcat Classic', w: 0.68, h: 2.96, d: 1.56, cloth: 'black' },
    { id: 'skeptical', label: 'Skeptical', w: 0.76, h: 2.5, d: 1.5, cloth: 'green' },
    { id: 'research', label: 'Research', w: 0.2, h: 2.24, d: 1.4, cloth: 'card' },
    { id: 'wessobrunn', label: 'Wessobrunn', w: 0.42, h: 2.04, d: 1.36, cloth: 'green' },
    ...WORK.map((p, i) => ({ id: 'w-' + p.slug, label: WORD[p.slug] ?? p.name, w: WW[i], h: WH[i], d: 1.46, cloth: 'green' as Cloth })),
    { id: 'today', label: 'Today', w: 0.5, h: 2.3, d: 1.46, cloth: 'green' },
    ...NOW.reading.shelves.map((s, i) => ({ id: i === 1 ? 'now' : 'now-' + i, label: s, w: 0.92, h: 1.02, d: 1.2, cloth: 'paint' as Cloth, across: true })),
    { id: 'record', label: 'Record', w: 0.66, h: 2.46, d: 1.5, cloth: 'green' },
    { id: 'off', label: 'Off the record', w: 0.5, h: 2.2, d: 1.44, cloth: 'green' },
  ];
  // Slim notebooks, one per repo, each as thick as its share of the recent commits.
  const shown = repos.slice(0, 6);
  const count = (r: Repo) => activity.filter((a) => a.repo === r.name).length;
  const total = shown.reduce((s, r) => s + count(r), 0);
  for (const r of shown) {
    const share = total ? count(r) / total : 1 / shown.length;
    rows.push({ id: 'github', repo: r.name, label: r.name, w: 0.13 + share * 0.9, h: 1.92, d: 1.2, cloth: 'board' });
  }
  rows.push({ id: 'contact', label: 'Contact', w: 0.64, h: 2.5, d: 1.5, cloth: 'green' });
  let x = 0;
  return rows.map((b) => { const out = { ...b, x: x + b.w / 2 }; x += b.w + G; return out; });
}

export const shelfLength = (books: Book[]) => { const l = books[books.length - 1]; return l.x + l.w / 2; };

/** Read by the scene each frame; written by the page. */
export const st = {
  focus: 0,            // fractional x the camera should look at
  active: [] as string[], // section ids whose volume is tipped out
  hover: -1,
  push: { t0: -10, dir: 1 },  // dir 1: pushed from the left end, the row leans right
  sheet: false,        // the loose sheet in Today is drawn up
  repo: '' as string,  // the notebook that is open
  pull: 0,             // 0..1, the camera pulling back at the end
  stuck: 0,            // 0..1, the band has scrolled up to its reading height
  now: 0,
};

export function pushRow(dir: 1 | -1) { st.push = { t0: st.now, dir }; }
