// The row of stations along the sweep, the forks that stand on them, and the one strike() everything calls.
// No three.js here: the page, the still drawing and the scene all share it.

export type Kind = 'pair' | 'two' | 'one' | 'row' | 'end';
export type Fork = { station: number; x: number; z: number; len: number; scale: number; freq: number; base: number };
export type Station = { kind: Kind; vowels: string[]; x: number; z: number; forks: number[]; bases: { x: number; w: number; label: string }[] };

// First two resonances of each vowel (Hz), adult averages, rounded.
export const FORMANTS: Record<string, [number, number]> = {
  a: [750, 1250], e: [420, 2050], i: [280, 2250], u: [310, 870], 'ɛ': [580, 1800], o: [450, 800],
  'ɪ': [400, 1920], 'æ': [690, 1660], 'ɑ': [710, 1100], 'ɔ': [590, 880], 'ʊ': [450, 1030], 'ʌ': [640, 1190],
  'ə': [500, 1500], 'ø': [390, 1650], 'ɜ': [560, 1480], y: [280, 1800], 'œ': [520, 1430],
};

const STEP_X = 2.6;
const STEP_Z = -3.0;
export const TALL = 1.45;
export const SHORT = 0.98;

export function dayFreq(day: number) { return 330 * Math.pow(2, (day - 1) / 12); }
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];
export function repoFreq(repo: string) {
  let h = 0; for (const c of repo) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return SCALE[h % SCALE.length];
}

/** Build the row. `specs` is one entry per section: a vowel, two vowels, 'today' or 'row'. */
export function makeRow(specs: (string | string[])[], day: number, rowRepos: string[]) {
  const stations: Station[] = [];
  const forks: Fork[] = [];
  specs.forEach((spec, k) => {
    const x = k * STEP_X, z = k * STEP_Z;
    const st: Station = { kind: 'pair', vowels: [], x, z, forks: [], bases: [] };
    const add = (fx: number, len: number, scale: number, freq: number, base: number) => {
      st.forks.push(forks.length);
      forks.push({ station: k, x: x + fx, z, len, scale, freq, base });
    };
    if (spec === 'today') {
      st.kind = 'one';
      st.bases.push({ x: 0, w: 0.62, label: String(day) });
      add(0, 1.2, 1, dayFreq(day), 0);
    } else if (spec === 'row') {
      st.kind = 'row';
      const n = rowRepos.length, gap = 0.34;
      const w = n * gap + 0.2;
      st.bases.push({ x: 0, w, label: '' });
      rowRepos.forEach((r, i) => add(-w / 2 + 0.27 + i * gap, 0.62 + (i % 3) * 0.07, 0.62, repoFreq(r), 0));
    } else if (Array.isArray(spec)) {
      st.kind = 'two';
      st.vowels = spec;
      spec.forEach((v, j) => {
        const bx = (j - 0.5) * 1.6;
        st.bases.push({ x: bx, w: 1.2, label: v });
        add(bx - 0.3, TALL, 1, FORMANTS[v][0], j);
        add(bx + 0.3, SHORT, 1, FORMANTS[v][1], j);
      });
    } else {
      st.kind = k === specs.length - 1 ? 'end' : 'pair';
      st.vowels = [spec];
      st.bases.push({ x: 0, w: 1.2, label: spec });
      add(-0.3, TALL, 1, FORMANTS[spec][0], 0);
      add(0.3, SHORT, 1, FORMANTS[spec][1], 0);
    }
    stations.push(st);
  });
  return { stations, forks };
}

type Tone = typeof import('tone');

/** Shared, mutable state. Hits are read by the scene every frame. */
export const S = {
  hits: [] as { at: number; amp: number }[],
  now: () => performance.now() / 1000,
  sound: true,
  cur: 0,
  unlocked: false,
  forks: [] as Fork[],
  stations: [] as Station[],
  onStrike: (_station: number, _loud: boolean) => {},
  onSound: (_on: boolean) => {},
  tone: null as Tone | null,
  synth: null as InstanceType<Tone['PolySynth']> | null,
};

let loading: Promise<Tone> | null = null;
export function loadTone() {
  if (!loading) loading = import('tone').then((T) => { S.tone = T; return T; });
  return loading;
}

async function play(freqs: number[], loud: number) {
  if (!S.sound || !S.unlocked) return;
  const T = await loadTone();
  if (T.getContext().state !== 'running') await T.start();
  if (!S.synth) {
    S.synth = new T.PolySynth(T.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.004, decay: 3.6, sustain: 0, release: 1.2 },
    }).toDestination();
    S.synth.maxPolyphony = 32;
    S.synth.volume.value = -14;
  }
  S.synth.triggerAttackRelease(freqs, 3.6, undefined, Math.min(1, loud / Math.sqrt(freqs.length)));
}

/** Strike forks: by index list. `soft` arrivals are quieter and never move headings. */
export function strikeForks(idx: number[], opts: { soft?: boolean; loud?: number } = {}) {
  const t = S.now();
  const amp = opts.soft ? 0.45 : 1;
  for (const i of idx) S.hits[i] = { at: t, amp };
  void play(idx.map((i) => S.forks[i].freq), opts.loud ?? (opts.soft ? 0.35 : 0.8));
}

export function strikeStation(k: number, opts: { soft?: boolean; fork?: number } = {}) {
  const st = S.stations[k]; if (!st) return;
  if (st.kind === 'row') return; // the row is played in order, never all at once
  const idx = opts.fork != null ? [opts.fork] : st.forks;
  const chord = st.kind === 'two' && opts.fork == null;
  strikeForks(idx, { soft: opts.soft, loud: chord ? (opts.soft ? 0.5 : 1.6) : undefined });
  if (!opts.soft) S.onStrike(k, chord);
}

export function strikeBase(k: number) { strikeStation(k); }

/** Mark the first deliberate tap: sound may start from here on. */
export function unlock() {
  if (S.unlocked) return;
  S.unlocked = true;
  void loadTone().then((T) => T.start()).catch(() => {});
}
