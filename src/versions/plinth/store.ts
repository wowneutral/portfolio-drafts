// Shared, mutable state between the labels (DOM) and the plinth (WebGL). Never React state per frame.
export type Ex = 'apple' | 'watch' | 'paper' | 'prints' | 'slips' | 'tea' | 'sphere' | 'certs' | 'empty' | 'name';

export const NAMES: Record<Ex, string> = {
  apple: 'SKEPTICISM', watch: 'DEBATE', paper: 'RESEARCH', prints: 'WORK', slips: 'GITHUB',
  tea: 'TODAY', sphere: 'NOW', certs: 'RECORD', empty: 'OFF THE RECORD', name: 'ARMAAN SETH',
};

export const stage = {
  want: 'apple' as Ex,
  near: new Set<Ex>(['apple']),
  work: 0, // index of the print on top of the work stack
  cert: 0,
  slips: [] as { repo: string; text: string }[],
  hover: false,
  onPrint: null as null | ((which: 'prints' | 'certs') => void),
};
