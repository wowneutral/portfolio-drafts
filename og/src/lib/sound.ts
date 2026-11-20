// The score.
//
// Two pieces cut from one continuous recording:
//   intro.mp3   plays under the loading screen
//   theme.mp3   the site loop, cut so its own tail crossfades over its head
//
// DECODED BUFFERS, NOT <audio> ELEMENTS. The first version routed two
// HTMLAudioElements through createMediaElementSource, and on a reload their
// play() promises were rejected by autoplay policy even though the click that
// triggered them was a real gesture. The interface ticks kept working because
// oscillators need no element permission, which is exactly the symptom: sound
// effects fine, music silent. Fetching and decoding into AudioBufferSource
// nodes removes the element from the picture entirely, and has two bonuses —
// looping is sample-accurate rather than approximate, and the whole score is
// under one AudioContext that a single resume() unlocks.

let ctx: AudioContext | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let introSrc: AudioBufferSourceNode | null = null;
let themeSrc: AudioBufferSourceNode | null = null;
let introGain: GainNode | null = null;
let themeGain: GainNode | null = null;
let buffers: { intro?: AudioBuffer; theme?: AudioBuffer } = {};
let crossed = false;
let wantOn = true;

const MUSIC_LEVEL = 0.42;
const SFX_LEVEL = 0.3;

function graph() {
  if (ctx) return ctx;
  ctx = new AudioContext();
  musicBus = ctx.createGain();
  musicBus.gain.value = wantOn ? MUSIC_LEVEL : 0.0001;
  musicBus.connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = wantOn ? SFX_LEVEL : 0.0001;
  sfxBus.connect(ctx.destination);
  introGain = ctx.createGain();
  themeGain = ctx.createGain();
  introGain.gain.value = 1;
  themeGain.gain.value = 0.0001;
  introGain.connect(musicBus);
  themeGain.connect(musicBus);
  return ctx;
}

// The two pieces load INDEPENDENTLY. They used to share one Promise.all, which
// meant the 58-second intro could not start until the 162-second theme had also
// finished downloading and decoding. On a warm cache that was invisible. On a
// cold one (a first visit, a private window) it was the whole loading screen
// in silence, because the piece written to play under the loading screen was
// waiting on a file it does not need.
let loadingIntro: Promise<void> | null = null;
let loadingTheme: Promise<void> | null = null;

async function grab(url: string, priority?: "high") {
  const c = graph();
  // The intro is what you hear first, so it is hinted high. The theme is left
  // at the default rather than hinted low: it is the piece you actually listen
  // to for the whole visit, and deprioritising it behind six screenshots would
  // trade a visible problem for an audible one.
  const res = await fetch(url, priority ? ({ priority } as RequestInit) : undefined);
  return c.decodeAudioData(await res.arrayBuffer());
}

function loadIntro() {
  loadingIntro ??= grab(import.meta.env.BASE_URL + "audio/intro.mp3", "high").then((b) => { buffers.intro = b; });
  return loadingIntro;
}

function loadTheme() {
  loadingTheme ??= grab(import.meta.env.BASE_URL + "audio/theme.mp3").then((b) => { buffers.theme = b; });
  return loadingTheme;
}

/** Warm both decodes early so Enter never waits on a network round trip. */
export function preload() {
  void loadIntro().catch(() => {});
  void loadTheme().catch(() => {});
}

function play(buf: AudioBuffer, out: GainNode) {
  const src = graph().createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.connect(out);
  src.start();
  return src;
}

/** Start the loading-screen piece. Must be reached from a user gesture. */
export async function start() {
  const c = graph();
  if (c.state === "suspended") await c.resume();
  // crossed is re-checked after every await: Enter can land while the intro is
  // still decoding, and starting the intro after that point would play the
  // loading-screen piece over a site that has already opened.
  if (!crossed) {
    await loadIntro();
    if (!crossed && !introSrc && buffers.intro) introSrc = play(buffers.intro, introGain!);
  }
  if (crossed) {
    await loadTheme();
    if (!themeSrc && buffers.theme) themeSrc = play(buffers.theme, themeGain!);
  }
  applyLevels();
}

/** Cross the threshold: intro out, theme in, over `seconds`. */
export async function crossToTheme(seconds = 4) {
  if (crossed) return;
  crossed = true;
  const c = graph();
  if (c.state === "suspended") await c.resume();
  await loadTheme();
  if (!themeSrc && buffers.theme) themeSrc = play(buffers.theme, themeGain!);
  const t = c.currentTime;
  for (const [g, to] of [
    [introGain!, 0.0001],
    [themeGain!, 1],
  ] as const) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t);
    g.gain.exponentialRampToValueAtTime(to, t + seconds);
  }
  setTimeout(() => {
    try { introSrc?.stop(); } catch { /* already stopped */ }
    introSrc = null;
  }, seconds * 1000 + 500);
}

// ── ducking ───────────────────────────────────────────────────────────────
// The site score never stops. When something else wants to be heard (a song
// preview), the music drops under it and comes back on its own afterwards.
let ducked = false;

export function duck(on: boolean) {
  ducked = on;
  if (ctx) applyLevels();
}

export function setOn(on: boolean) {
  wantOn = on;
  if (ctx) applyLevels();
}

export function isOn() {
  return wantOn;
}

function applyLevels() {
  if (!ctx || !musicBus || !sfxBus) return;
  const t = ctx.currentTime;
  for (const [node, level, duckable] of [
    [musicBus, MUSIC_LEVEL, true],
    [sfxBus, SFX_LEVEL, false],
  ] as const) {
    const want = !wantOn ? 0.0001 : duckable && ducked ? level * 0.1 : level;
    node.gain.cancelScheduledValues(t);
    node.gain.setValueAtTime(Math.max(0.0001, node.gain.value), t);
    // Down fast enough to get out of the way, back slowly enough that the
    // return is not itself an event.
    node.gain.exponentialRampToValueAtTime(want, t + (want < node.gain.value ? 0.5 : 2.2));
  }
}

// ── interface ticks ───────────────────────────────────────────────────────
// Chosen in tools/sound-tester.html. Swap the two exported voices to change
// them; nothing else needs to know.

function bell(f: number, peak: number, decay: number, lp: number, at = 0) {
  if (!ctx || !sfxBus || ctx.state !== "running") return;
  const c = ctx, t = c.currentTime + at;
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(f, t);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  const filt = c.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.value = lp;
  osc.connect(g).connect(filt).connect(sfxBus);
  osc.start(t);
  osc.stop(t + decay + 0.08);
}

/**
 * Hover: muted marimba. A soft mallet on wood — the fundamental plus a
 * whisper of its octave, both low-passed so there is no edge to it.
 * (Chosen from tools/sound-tester.html, H06.)
 */
export function hover() {
  bell(660, 0.06, 0.16, 1800);
  bell(1320, 0.018, 0.1, 2600, 0.003);
}

/**
 * Click: glass tap. A fingernail on a glass rim — bright, precise, and a
 * deliberate contrast with the hover's warmth, so the two never blur into
 * each other. (Tester H04, with a little more tail so it reads as a
 * confirmation rather than a hover.)
 */
export function click() {
  bell(2100, 0.055, 0.16, 6000);
  bell(3150, 0.022, 0.12, 7000, 0.004);
}
