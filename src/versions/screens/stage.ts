// Shared state between the page and the heap. Per-frame values live in `stage` (read in useFrame);
// discrete choices (which commit, which work) live in the zustand store.
import { create } from 'zustand';

export type Stop = 'hero' | 'github' | 'today' | 'about' | 'work' | 'record' | 'now' | 'contact';
export const stage = { stop: 'hero' as Stop, stopAt: 0, px: 0, py: 0 };

export type Entry = { label: string; message: string };
type Store = {
  entries: Entry[];
  repos: string[];
  note: { date: string; text: string } | null;
  idx: number;
  work: number;
  hover: number | null;
  push: () => void;
  setWork: (i: number) => void;
  setHover: (i: number | null) => void;
};

export const useStore = create<Store>((set) => ({
  entries: [],
  repos: [],
  note: null,
  idx: 0,
  work: 0,
  hover: null,
  push: () => set((s) => ({ idx: s.idx + 1 })),
  setWork: (work) => set({ work }),
  setHover: (hover) => set({ hover }),
}));
