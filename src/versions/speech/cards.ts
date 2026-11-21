// The eight argument cards. Every word on them comes from content.ts or is short framing.
import { CHAPTERS, DEBATE, RESEARCH, WORK } from '@/content';

export type CardId = 'fbk' | 'wildcat' | 'skeptical' | 'mitez' | 'paper' | 'wess' | 'builds' | 'today';
export type Card = { id: CardId; tag: string; sub: string };

const [w1, w2] = DEBATE.wins;

export const CARDS: Card[] = [
  { id: 'fbk', tag: `${w1.title}, ${w1.event}`, sub: `${w1.where}, ${w1.when}` },
  { id: 'wildcat', tag: `${w2.title}, ${w2.event}`, sub: `${w2.where}, ${w2.when}` },
  { id: 'skeptical', tag: DEBATE.team.name, sub: DEBATE.team.role },
  { id: 'mitez', tag: CHAPTERS[0].title, sub: 'Free mentorship for anyone who asks' },
  { id: 'paper', tag: 'The paper', sub: RESEARCH[0].short },
  { id: 'wess', tag: RESEARCH[1].short, sub: 'Translated from Old High German' },
  { id: 'builds', tag: 'What he builds', sub: `${WORK.length} projects, and his GitHub live` },
  { id: 'today', tag: 'Today', sub: 'His daily note' },
];

/** His own order, used until a visitor gives the speech: debate first. */
export const HIS_ORDER: CardId[] = ['fbk', 'wildcat', 'skeptical', 'today', 'paper', 'builds', 'mitez', 'wess'];

export const byId = (id: CardId) => CARDS.find((c) => c.id === id)!;
