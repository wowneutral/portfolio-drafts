// The corpus: every string on the page, cut into tokens with light stemming, so any word can be lined up
// with every other place it is used (keyword in context).
import { AWARDS, CHAPTERS, COURSES, DEBATE, DISLIKES, FAVOURITES, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, WORK } from '@/content';
import type { Activity, Repo } from '@/lib/github';
import type { Note } from '@/lib/notes';

export type Entry = { text: string; src: string; where: string };
export type Row = { left: string; kw: string; right: string; src: string; where: string; id: string };

export const WORD = /[A-Za-zÀ-ɏ0-9]+(?:[’'-][A-Za-zÀ-ɏ0-9]+)*/g;

const IRREGULAR: Record<string, string> = { built: 'build', builder: 'build', builders: 'build', made: 'make', won: 'win', wrote: 'write', written: 'write' };

export function stem(raw: string) {
  let w = raw.toLowerCase().replace(/[’']s$/, '').replace(/[’']/g, '');
  if (w.startsWith('skeptic')) return 'skeptic';
  if (IRREGULAR[w]) return IRREGULAR[w];
  if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith('ies')) w = w.slice(0, -3) + 'y';
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  if (w.length > 4 && w.endsWith('e')) w = w.slice(0, -1);
  return w;
}

const STOP = new Set('a an the of and or for to in on at by with from as is are was be been it its this that these those i me my we our you your he his she her they them their not no but so if then than too very just only also into out up down over about after before more most some any all each every one two do does did done have has had will would can could should there here what which who whom when where why how own same such still while'.split(' ').map(stem));
export const isStop = (s: string) => STOP.has(s) || s.length < 3;

// Every string of the page and the section it lives in.
export function staticEntries(): Entry[] {
  const p = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; ladders: { who: string; when: string; where: string }[]; epigraph: { text: string; source: string } };
  const w = RESEARCH[1];
  const ch = (id: string) => CHAPTERS.find((c) => c.id === id)!.body;
  const e: Entry[] = [];
  const add = (src: string, where: string, ...texts: string[]) => texts.forEach((text) => e.push({ text, src, where }));
  add('top', 'Opening', PERSON.line, PERSON.short.join(' '));
  add('about', 'About', ...PERSON.about, PERSON.aside);
  add('debate', 'Debate', ch('debate'), ...DEBATE.wins.map((x) => `${x.title}, ${x.event}, ${x.where}, ${x.when}`), DEBATE.team.role, DEBATE.team.line, DEBATE.team.record, ...DEBATE.next.map((x) => `${x.event}, ${x.where}`));
  add('free', 'Free', ch('mitez'), ch('coach'));
  add('research', 'Research', p.title, ch('research'), p.abstract, p.keywords.join(', '), p.epigraph.text, ...p.ladders.map((l) => `${l.who}, ${l.where}`), w.title, w.abstract);
  add('work', 'Work', ch('builds'), ...WORK.map((x) => x.line), ...WORK.map((x) => `${x.name}, ${x.kind}, ${x.stack}`));
  add('now', 'Now', NOW.reading.title, NOW.reading.body, NOW.club.title, NOW.club.body, NOW.status);
  add('record', 'Record', ...HONORS.map((h) => `${h.what}, ${h.detail}`), ...AWARDS.map((a) => `${a.site}, ${a.note}`));
  add('off', 'Off the record', ...LIKES, ...DISLIKES, ...FAVOURITES, ...COURSES.map((c) => `${c.title}: ${c.note}`));
  add('contact', 'Contact', ...LINKS.map((l) => `${l.label}: ${l.value}`));
  return e;
}

export function liveEntries(notes: Note[], activity: Activity[], repos: Repo[]): Entry[] {
  const e: Entry[] = [];
  notes.forEach((n) => n.body.forEach((text) => e.push({ text, src: 'today', where: 'Today' })));
  activity.forEach((a) => e.push({ text: a.message, src: 'github', where: 'GitHub' }));
  repos.forEach((r) => r.description && e.push({ text: r.description, src: 'github', where: 'GitHub' }));
  return e;
}

/** Every use of `key` (a stem) across the entries, with up to `span` words either side. */
export function concord(entries: Entry[], key: string, span = 10): Row[] {
  const rows: Row[] = [];
  const seen = new Set<string>();
  entries.forEach((en, ei) => {
    const toks = [...en.text.matchAll(WORD)];
    toks.forEach((m, i) => {
      if (stem(m[0]) !== key) return;
      const start = toks[Math.max(0, i - span)].index!;
      const lo = i - span <= 0 ? 0 : start;
      const endTok = toks[Math.min(toks.length - 1, i + span)];
      const hi = i + span >= toks.length - 1 ? en.text.length : endTok.index! + endTok[0].length;
      const left = en.text.slice(lo, m.index!);
      const right = en.text.slice(m.index! + m[0].length, hi);
      const sig = (left + m[0] + right).toLowerCase();
      if (seen.has(sig)) return;
      seen.add(sig);
      rows.push({ left, kw: m[0], right, src: en.src, where: en.where, id: `${ei}:${i}` });
    });
  });
  return rows;
}

/** The most used content word in a set of strings (ties go to the longer word). */
export function topWord(texts: string[]): { key: string; word: string } | null {
  const count = new Map<string, { n: number; word: string }>();
  texts.forEach((t) => [...t.matchAll(WORD)].forEach((m) => {
    const s = stem(m[0]);
    if (isStop(s) || /^\d+$/.test(s)) return;
    const c = count.get(s);
    if (c) c.n++; else count.set(s, { n: 1, word: m[0].toLowerCase() });
  }));
  let best: { key: string; word: string; n: number } | null = null;
  count.forEach((v, k) => { if (!best || v.n > best.n || (v.n === best.n && k.length > best.key.length)) best = { key: k, word: v.word, n: v.n }; });
  return best;
}

/** The longest word in a note. */
export function longestWord(texts: string[]): { key: string; word: string } | null {
  let best = '';
  texts.forEach((t) => [...t.matchAll(WORD)].forEach((m) => { if (m[0].length > best.length && !/^\d/.test(m[0])) best = m[0]; }));
  return best ? { key: stem(best), word: best } : null;
}
