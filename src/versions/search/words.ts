// The fixed list the field can find. Every big word is a title from content.ts.
import { CHAPTERS, GITHUB, NOW, PERSON, RESEARCH } from '@/content';

export type Hit = { id: string; word: string; big: string; bigPhone?: string; alias: string[] };

const debate = CHAPTERS.find((c) => c.id === 'debate')!.title;
const builds = CHAPTERS.find((c) => c.id === 'builds')!.title;

export const HITS: Hit[] = [
  { id: 'about', word: 'about', big: PERSON.short[0], alias: ['armaan seth', 'armaan', 'seth', 'about', 'me', 'who'] },
  { id: 'debate', word: 'debate', big: 'Two titles\nthis fall', alias: ['debate', 'lincoln douglas', 'ld', 'skeptical', 'coach', 'champion', 'tournament', 'titles'] },
  { id: 'research', word: 'research', big: 'Not in\nMauthner’s Sense', bigPhone: 'Not in\nMauthner’s\nSense', alias: ['research', 'paper', 'wittgenstein', 'mauthner', 'philosophy', 'pyrrhonism', 'sextus', 'wessobrunn', 'doi'] },
  { id: 'work', word: 'work', big: builds, alias: ['work', 'projects', 'shipped', 'build', 'mitez', 'last search', 'last seen', 'spread', 'rogue', 'jarvis', 'drafts'] },
  { id: 'github', word: 'github', big: GITHUB.user, alias: ['github', 'code', 'commits', 'repos', 'git', 'wowneutral'] },
  { id: 'today', word: 'today', big: 'Today', alias: ['today', 'note', 'notes', 'blog', 'daily'] },
  { id: 'reading', word: 'reading', big: 'Getting into\nliterature', alias: ['reading', 'books', 'literature', 'now', 'club', 'absurdist', 'queer'] },
  { id: 'record', word: 'record', big: 'Record', alias: ['record', 'honors', 'honours', 'awards', 'certificates'] },
  { id: 'off', word: 'off the record', big: 'Off the\nrecord', alias: ['off the record', 'likes', 'dislikes', 'favourites', 'favorites', 'courses', 'plato', 'laufey'] },
  { id: 'contact', word: 'contact', big: 'Contact', alias: ['contact', 'email', 'mail', 'discord', 'links'] },
];

export const SUGGEST = ['debate', 'research', 'work', 'github', 'today', 'reading', 'contact'].map((w) => HITS.find((h) => h.word === w)!);

/** A prefix match against the fixed list only; never free text, never a request. */
export function find(raw: string): Hit | null {
  const q = raw.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9 ]/g, '');
  if (q.length < 2) return null;
  for (const h of HITS) if (h.alias.includes(q)) return h;
  for (const h of HITS) if (h.alias.some((a) => a.startsWith(q) || (q.startsWith(a + ' ') && a.length > 2))) return h;
  return null;
}

export const FIRST = HITS[0];
export const NAME_TYPED = PERSON.name.toLowerCase();
export const READING = NOW.reading;
export const PAPER = RESEARCH[0];
