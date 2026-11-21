// What the page tells the scene: where each section starts (in scroll pixels) and how far Plato has turned there.
export type Key = { y: number; yaw: number; light: number; cell: number };
export const stage = { keys: [] as Key[], px: -1.2, py: 0, loaded: false, onLoad: null as null | (() => void), capture: false, kick: 0 };

/** Yaw is radians away from the visitor (0 faces you), light 0 = key from the front, 1 = rim, 2 = from behind. */
export const PLAN: Record<string, Omit<Key, 'y'>> = {
  top: { yaw: 0.9, light: 0, cell: 2 },
  about: { yaw: 1.2, light: 0, cell: 2 },
  debate: { yaw: 1.57, light: 0.2, cell: 2 },
  research: { yaw: 2.3, light: 1, cell: 4 },
  work: { yaw: 2.42, light: 0.7, cell: 3 },
  today: { yaw: 2.55, light: 0.6, cell: 2 },
  github: { yaw: 2.65, light: 0.6, cell: 2 },
  now: { yaw: 2.75, light: 0.7, cell: 2 },
  record: { yaw: 2.85, light: 0.8, cell: 2 },
  off: { yaw: 2.95, light: 1, cell: 2 },
  contact: { yaw: 3.1416, light: 2, cell: 3 },
};

export function sample(y: number) {
  const k = stage.keys;
  if (!k.length) return { yaw: PLAN.top.yaw, light: 0, cell: 2 };
  if (y <= k[0].y) return k[0];
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i], b = k[i + 1];
    if (y < b.y) {
      const t = (y - a.y) / Math.max(1, b.y - a.y), s = t * t * (3 - 2 * t);
      return { yaw: a.yaw + (b.yaw - a.yaw) * s, light: a.light + (b.light - a.light) * s, cell: s < 0.5 ? a.cell : b.cell };
    }
  }
  return k[k.length - 1];
}
