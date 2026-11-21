// Grid laid out once with Michael Wehar's Crossword-Layout-Generator (MIT, layout_generator.js), saved to layout.json; numbering and clue model after JaredReisinger/react-crossword (MIT).
import layout from './layout.json';

export type Dir = 'across' | 'down';
export type Word = { id: string; answer: string; dir: Dir; row: number; col: number; num: number; clue: string; to: string; label: string };
export type Cell = { r: number; c: number; letter: string; num?: number; across?: string; down?: string };

// Every clue is his own wording from content.ts, with a blank and the enumeration.
const CLUES: Record<string, { clue: string; to: string; label: string }> = {
  SKEPTICAL: { clue: 'A free, independent Lincoln-Douglas team. Founder and head coach', to: 'debate', label: 'Debate' },
  WILDCAT: { clue: '___ Classic: Champion, Open Lincoln-Douglas', to: 'debate', label: 'Debate' },
  DEBATE: { clue: '___, obviously', to: 'debate', label: 'Debate' },
  MAUTHNER: { clue: 'Not in ___’s Sense', to: 'research', label: 'Research' },
  LADDER: { clue: 'I follow one image, the ___ you climb and then throw away', to: 'research', label: 'Research' },
  WESSOBRUNN: { clue: 'The ___ Prayer: translation and commentary', to: 'research', label: 'Research' },
  MITEZ: { clue: 'Free mentorship for anyone who asks', to: 'work', label: 'Work' },
  SPREAD: { clue: 'A drill tool for learning to read at speed without turning into noise', to: 'github', label: 'GitHub' },
  JARVIS: { clue: 'A desktop assistant that actually runs my machine', to: 'github', label: 'GitHub' },
  ROGUE: { clue: 'How far can an AI carry a build on its own, and where do the seams show', to: 'github', label: 'GitHub' },
  PLATO: { clue: 'Terrible, terrible frameworks', to: 'off', label: 'Off the record' },
  OOLONG: { clue: '___ milk tea with boba, every single time', to: 'off', label: 'Off the record' },
  JUSTICE: { clue: 'Sandel’s course. The one that started it.', to: 'off', label: 'Off the record' },
};

export const ROWS: number = layout.rows;
export const COLS: number = layout.cols;

const raw = layout.words as { answer: string; dir: Dir; row: number; col: number }[];

// Standard numbering: scan rows, number each cell that starts a word.
const starts = new Map<string, number>();
{
  let n = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (raw.some((w) => w.row === r && w.col === c)) starts.set(`${r},${c}`, ++n);
}

export const WORDS: Word[] = raw
  .map((w) => {
    const num = starts.get(`${w.row},${w.col}`)!;
    return { ...w, num, id: `${num}${w.dir === 'across' ? 'a' : 'd'}`, ...CLUES[w.answer] };
  })
  .sort((a, b) => a.num - b.num);

export const ACROSS = WORDS.filter((w) => w.dir === 'across');
export const DOWN = WORDS.filter((w) => w.dir === 'down');

export const GRID: (Cell | null)[][] = Array.from({ length: ROWS }, (_, r) => Array.from({ length: COLS }, () => null as Cell | null).map((_, c) => {
  let cell: Cell | null = null;
  for (const w of WORDS) {
    const k = cellsOf(w).findIndex(([rr, cc]) => rr === r && cc === c);
    if (k < 0) continue;
    cell ??= { r, c, letter: w.answer[k] };
    cell[w.dir] = w.id;
    if (k === 0) cell.num = w.num;
  }
  return cell;
}));

export function cellsOf(w: { row: number; col: number; dir: Dir; answer: string }): [number, number][] {
  return Array.from(w.answer, (_, k) => (w.dir === 'across' ? [w.row, w.col + k] : [w.row + k, w.col]) as [number, number]);
}

export const byId = Object.fromEntries(WORDS.map((w) => [w.id, w])) as Record<string, Word>;
export const key = (r: number, c: number) => `${r},${c}`;
export const ALL_CELLS = GRID.flat().filter(Boolean) as Cell[];
