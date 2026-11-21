import { create } from 'zustand';

/** Which slice is open: the pointer or keyboard wins, otherwise the scroll position decides. */
export const useTiles = create<{ active: number; hover: number | null; setActive: (i: number) => void; setHover: (i: number | null) => void }>((set) => ({
  active: 0,
  hover: null,
  setActive: (active) => set((s) => (s.active === active ? s : { active })),
  setHover: (hover) => set({ hover }),
}));

/** Where each screenshot is cropped when its slice is narrow (x, y from the top left, 0 to 1). */
export const FOCAL: Record<string, [number, number]> = {
  mitez: [0.5, 0.62], skeptical: [0.73, 0.5], lastseen: [0.46, 0.5], lastsearch: [0.5, 0.42],
  spread: [0.1, 0.4], rogue: [0.5, 0.55], jarvis: [0.5, 0.5], drafts: [0.12, 0.5],
};
