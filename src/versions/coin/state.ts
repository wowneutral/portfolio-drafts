// Shared between the page and the lazily loaded coin scene.
export type Face = 'aff' | 'neg';
export const C = {
  toss: null as null | ((power?: number) => void),
  busy: false,
};
