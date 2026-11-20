// The twelve works on the wall, left to right, in the order the arrow keys walk them.
import { AWARDS, DEBATE, WORK } from '@/content';

export type Item = {
  id: string;            // hash route, e.g. work/mitez
  n: string;             // wall number, 01 to 12
  kind: 'work' | 'award' | 'win';
  idx: number;           // index into WORK, AWARDS or DEBATE.wins
  name: string;          // the wall label's name
  img?: string;          // public path, for work and award
  aspect: number;        // width / height of the picture
};

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const ASPECT: Record<string, number> = { mitez: 1200 / 660, skeptical: 1200 / 660, lastseen: 1200 / 670, lastsearch: 1200 / 692, spread: 1200 / 660, rogue: 1200 / 662, jarvis: 1200 / 852, drafts: 1200 / 766 };

const work = (i: number): Omit<Item, 'n'> => ({ id: 'work/' + WORK[i].slug, kind: 'work', idx: i, name: WORK[i].name, img: WORK[i].img, aspect: ASPECT[WORK[i].slug] ?? 1.8 });
const award = (i: number): Omit<Item, 'n'> => ({ id: 'award/' + slugify(AWARDS[i].site), kind: 'award', idx: i, name: AWARDS[i].site, img: AWARDS[i].img, aspect: 720 / 1018 });
const win = (i: number): Omit<Item, 'n'> => ({ id: 'win/' + slugify(DEBATE.wins[i].where), kind: 'win', idx: i, name: `${DEBATE.wins[i].title}, ${DEBATE.wins[i].where}`, aspect: 0.72 });

export const ITEMS: Item[] = [work(0), work(1), work(2), work(3), award(0), win(0), win(1), award(1), work(4), work(5), work(6), work(7)]
  .map((it, i) => ({ ...it, n: String(i + 1).padStart(2, '0') }));

export const byId = (id: string | null) => ITEMS.findIndex((x) => x.id === id);

/** "#/work/mitez" to "work/mitez"; anything else is the room itself. */
export const fromHash = (h: string) => { const id = h.replace(/^#\/?/, ''); return byId(id) >= 0 ? id : null; };
