// Every reply on the page, built only from content.ts. Nothing here is written in his voice that is not his.
import { AWARDS, CHAPTERS, COURSES, DEBATE, DISLIKES, FAVOURITES, HONORS, LIKES, LINKS, NOW, PERSON, RESEARCH, STATS, WORK, GITHUB } from '@/content';
import { ago, type GitHubData } from '@/lib/github';
import { formatDate, type Note } from '@/lib/notes';
import type { Bubble, Row } from './model';

export type Topic = 'win' | 'coach' | 'write' | 'build' | 'today' | 'reach' | 'who' | 'record' | 'likes';
export const QUESTIONS: { t: Topic; q: string }[] = [
  { t: 'win', q: 'What did he win?' },
  { t: 'coach', q: 'What does he coach?' },
  { t: 'write', q: 'What did he write?' },
  { t: 'build', q: 'What has he built?' },
  { t: 'today', q: 'What is he up to today?' },
  { t: 'reach', q: 'How do I reach him?' },
];
// Questions the transcript asks that the reply row leaves to typing.
export const MORE: Record<'who' | 'record' | 'likes', string> = {
  who: 'Who is he?',
  record: 'What else has he won?',
  likes: 'What does he like?',
};

// Checked in this order; the first topic with a matching word answers.
const KEYS: [Topic, RegExp][] = [
  ['reach', /\b(reach|contact|e-?mail|mail|discord|talk|message|dm|links?)\b/],
  ['today', /\b(today|note|notes|now|read|reading|books?|literature|club|status|lately|doing|blog|up to|homework)\b/],
  ['record', /\b(awards?|honou?rs?|record|prizes?|wd|certificates?|stats?|toc|mun|fbla)\b/],
  ['write', /\b(write|wrote|written|paper|research|mauthner|wittgenstein|sextus|abstract|doi|scholar|zenodo|philarchive|wessobrunn|translat\w*|ladder|pyrrhon\w*|skepticism|language)\b/],
  ['coach', /\b(coach\w*|skeptical|team|scrims?|prep|students?)\b/],
  ['win', /\b(win|won|wins|winning|champion\w*|titles?|tournaments?|debate\w*|ld|lincoln|douglas|trophy|results?|next)\b/],
  ['build', /\b(build|built|builds|project\w*|work|github|code|coding|sites?|websites?|apps?|jarvis|mitez|spread|rogue|repos?|commits?|made|make|software|drafts?)\b/],
  ['likes', /\b(likes?|love|hates?|dislikes?|favou?rites?|tea|boba|water|movies?|films?|interstellar|laufey|music|courses?|class\w*|plato|fun)\b/],
  ['who', /\b(who|about|yourself|armaan|seth|bio|paint\w*|rifle|jrotc|age|old)\b/],
];

export function match(text: string): Topic | null {
  const s = ' ' + text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ') + ' ';
  for (const [t, re] of KEYS) if (re.test(s)) return t;
  return null;
}

const host = (h: string) => h.replace(/^https?:\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
const him = (rows: Row[], width: Bubble['width'] = 'tight'): Bubble => ({ side: 'him', rows, width });
const say = (...lines: string[]) => him(lines.map((s) => ({ k: 't', f: 'body', s }) as Row));
const src = (p: string) => import.meta.env.BASE_URL + p;

export const paper = RESEARCH[0] as (typeof RESEARCH)[0] & { keywords: string[]; epigraph: { text: string; source: string } };
const wess = RESEARCH[1];

export type Piece =
  | { k: 'b'; b: Bubble; group?: string }
  | { k: 'stamp'; s: string }
  | { k: 'say'; opts: { label: string; act: string }[] };
const B = (b: Bubble, group?: string): Piece => ({ k: 'b', b, group });

export const OPENING: Bubble[] = PERSON.short.map((s) => ({ side: 'him', rows: [{ k: 't', f: 'hero', s }], tone: 'hero' }));

export function skeptical(): Bubble {
  const t = DEBATE.team;
  return him([
    { k: 't', f: 'strong', s: t.name },
    { k: 't', f: 'meta', s: t.role, gap: 0 },
    { k: 't', f: 'body', s: t.line, gap: 10 },
    { k: 't', f: 'body', s: t.record, gap: 10 },
    { k: 't', f: 'body', s: host(t.href), href: t.href, gap: 10 },
  ], 'max');
}

export function answer(t: Topic, gh: GitHubData, notes: Note[], ctx: { full: boolean }): Piece[] {
  switch (t) {
    case 'win':
      return [
        ...DEBATE.wins.map((w) => B(him([
          { k: 'fit', s: w.title },
          { k: 't', f: 'champSub', s: w.event, gap: 12 },
          { k: 't', f: 'body', s: `${w.where}, ${w.when}`, gap: 2 },
        ], 'full'), 'wins')),
        B(skeptical()),
        B(him([{ k: 't', f: 'strong', s: 'Up next' }, ...DEBATE.next.map((n) => ({ k: 't', f: 'body', s: `${n.event}, ${n.where}` }) as Row)])),
      ];
    case 'coach':
      return [B(skeptical()), B(say(CHAPTERS[2].body))];
    case 'write':
      return [
        B(him([
          { k: 't', f: 'title', s: paper.title },
          { k: 't', f: 'meta', s: paper.status, gap: 6 },
        ], 'max')),
        B(him([{ k: 't', f: 'quote', s: paper.epigraph.text }, { k: 't', f: 'meta', s: paper.epigraph.source, gap: ctx.full ? 14 : 6 }], ctx.full ? 'full' : 'max')),
        B(him([{ k: 't', f: 'serif', s: paper.abstract }], 'max')),
        B(him([{ k: 't', f: 'meta', s: 'Keywords' }, { k: 't', f: 'body', s: paper.keywords.join(', '), gap: 2 }])),
        ...paper.links.map((l) => B(him([{ k: 't', f: 'body', s: l.label, href: l.href }]), 'links')),
        B(him([
          { k: 't', f: 'strong', s: wess.title },
          { k: 't', f: 'meta', s: wess.status, gap: 0 },
          { k: 't', f: 'serif', s: wess.abstract, gap: 10 },
        ], 'max')),
      ];
    case 'build': {
      const out: Piece[] = [B(say(CHAPTERS[4].body))];
      for (const w of WORK) {
        const rows: Row[] = [
          { k: 'img', src: src(w.img), ratio: 0.5625, alt: `${w.name}, a screenshot`, href: w.href ?? undefined },
          { k: 't', f: 'strong', s: w.name },
          { k: 't', f: 'meta', s: w.kind, gap: 0 },
          { k: 't', f: 'body', s: w.line, gap: 8 },
          { k: 't', f: 'meta', s: w.stack, gap: 8 },
        ];
        if (w.href) rows.push({ k: 't', f: 'body', s: host(w.href), href: w.href, gap: 6 });
        out.push(B(him(rows, ctx.full ? 'full' : 'max'), 'work'));
      }
      const commits = gh.activity.slice(0, ctx.full ? 8 : 5);
      if (commits.length) {
        out.push({ k: 'stamp', s: 'Lately on GitHub' });
        for (const c of commits) out.push(B(him([{ k: 't', f: 'body', s: c.message, href: c.href }, { k: 't', f: 'meta', s: `${c.repo}, ${ago(c.at)}`, gap: 0 }]), 'commits'));
      }
      out.push({ k: 'stamp', s: gh.live ? 'His repositories, live' : 'His repositories' });
      for (const r of gh.repos.slice(0, 6)) {
        const rows: Row[] = [{ k: 't', f: 'strong', s: r.name, href: r.href }];
        if (r.description) rows.push({ k: 't', f: 'body', s: r.description, gap: 2 });
        if (r.language) rows.push({ k: 't', f: 'meta', s: r.language, gap: 2 });
        out.push(B(him(rows), 'repos'));
      }
      out.push(B(him([{ k: 't', f: 'body', s: host(GITHUB.href), href: GITHUB.href }])));
      return out;
    }
    case 'today': {
      const out: Piece[] = [];
      const n = notes[0];
      if (n) out.push(...note(n));
      out.push(B(say(NOW.status)));
      out.push(B(him([{ k: 't', f: 'strong', s: NOW.reading.title }, { k: 't', f: 'body', s: NOW.reading.body }, { k: 't', f: 'meta', s: NOW.reading.shelves.join(', '), gap: 6 }])));
      out.push(B(him([{ k: 't', f: 'strong', s: NOW.club.title }, { k: 't', f: 'body', s: NOW.club.body }])));
      return out;
    }
    case 'reach':
      return LINKS.map((l) => B(him([{ k: 't', f: 'meta', s: l.label }, { k: 't', f: 'body', s: l.value, href: l.href ?? undefined, gap: 0 }]), 'links'));
    case 'who':
      return [...PERSON.about.map((p) => B(him([{ k: 't', f: 'serif', s: p }], 'max'))), B(say(PERSON.aside))];
    case 'record':
      return [
        B(him(HONORS.flatMap((h, i) => [{ k: 't', f: 'strong', s: h.what, gap: i ? 12 : 0 }, { k: 't', f: 'meta', s: h.detail, gap: 0 }] as Row[]), 'max')),
        ...AWARDS.map((a) => B(him([
          { k: 'img', src: src(a.img), ratio: 1018 / 720, alt: `Certificate: ${a.site}, ${a.note}`, href: a.href },
          { k: 't', f: 'strong', s: a.site, href: a.href },
          { k: 't', f: 'meta', s: a.note, gap: 0 },
        ], ctx.full ? 300 : 240), 'certs')),
        B(him(STATS.map((s) => ({ k: 't', f: 'body', s: `${s.to}${s.suffix} ${s.label}` }) as Row))),
      ];
    case 'likes':
      return [
        B(him([{ k: 't', f: 'strong', s: 'Likes' }, ...LIKES.map((s) => ({ k: 't', f: 'body', s }) as Row)])),
        B(him([{ k: 't', f: 'strong', s: 'Dislikes' }, ...DISLIKES.map((s) => ({ k: 't', f: 'body', s }) as Row)])),
        B(him([{ k: 't', f: 'strong', s: 'Favourites' }, ...FAVOURITES.map((s) => ({ k: 't', f: 'body', s }) as Row)])),
        B(him([{ k: 't', f: 'strong', s: 'Courses' }, ...COURSES.flatMap((c) => [{ k: 't', f: 'body', s: `${c.provider}, ${c.title}`, gap: 8 }, { k: 't', f: 'meta', s: c.note, gap: 0 }] as Row[])])),
      ];
  }
}

export function note(n: Note, lead = false): Piece[] {
  return [{ k: 'stamp', s: formatDate(n.date) }, ...n.body.map((p) => B(him([{ k: 't', f: lead ? 'note' : 'serif', s: p }], lead ? 'full' : 'max')))];
}

export const FOOTER = 'Draft 81 of the portfolio. Not the live site.';
