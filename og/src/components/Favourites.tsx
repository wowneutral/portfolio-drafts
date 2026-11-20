// The favourites, as things rather than as a list of words.
//
// LAUFEY: three real Spotify players. Album art, a real preview, and the play
// counts for her. The site score ducks under whichever card is open and comes
// back on its own, so the music never actually stops.
//
// THE OBJECTS: five Sketchfab viewers, but only ever ONE mounted, and not
// until the section is on screen. Each viewer is a full WebGL context; five
// of them idling would cost more than the forest does. Autospin is on, so the
// selected object turns on its own.

import { useCallback, useEffect, useRef, useState } from "react";
import * as sound from "../lib/sound";
import { LAUFEY, MODELS } from "../content";
import { resolvePreview, type Preview } from "../lib/preview";
import "./favourites.css";

// Sketchfab viewer options. Several of these are ignored on free accounts;
// they degrade quietly rather than breaking the embed.
const VIEWER =
  "autostart=1&autospin=0.35&preload=0&transparent=1&ui_theme=dark" +
  "&ui_infos=0&ui_controls=1&ui_inspector=0&ui_annotations=0&ui_help=0" +
  "&ui_settings=0&ui_vr=0&ui_ar=0&ui_fullscreen=0&ui_stop=0&dnt=1";

// How long a taste is. Long enough to recognise it, short enough that the
// site score is only ever briefly out of the way.
const CLIP = 12;

function Laufey() {
  const [open, setOpen] = useState<number | null>(null);
  const [previews, setPreviews] = useState<Record<string, Preview | null>>({});
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef(0);

  // Resolve all three up front so pressing play is instant.
  useEffect(() => {
    let alive = true;
    (async () => {
      for (const t of LAUFEY) {
        const p = await resolvePreview(t.title, "Laufey");
        if (!alive) return;
        setPreviews((prev) => ({ ...prev, [t.title]: p }));
      }
    })();
    return () => { alive = false; };
  }, []);

  const stop = useCallback((fade = true) => {
    cancelAnimationFrame(rafRef.current);
    const a = audioRef.current;
    if (a) {
      if (fade) {
        // Ramp the element's own volume down; cutting a piano note dead is
        // more noticeable than the note itself.
        const from = a.volume;
        const t0 = performance.now();
        const down = () => {
          const k = Math.min(1, (performance.now() - t0) / 450);
          a.volume = from * (1 - k);
          if (k < 1) requestAnimationFrame(down);
          else { a.pause(); a.currentTime = 0; }
        };
        requestAnimationFrame(down);
      } else {
        a.pause();
        a.currentTime = 0;
      }
    }
    audioRef.current = null;
    setProgress(0);
    setOpen(null);
    sound.duck(false);
  }, []);

  // Whatever happens, the score comes back.
  useEffect(() => () => { cancelAnimationFrame(rafRef.current); sound.duck(false); }, []);

  const play = (i: number) => {
    if (open === i) { stop(); return; }
    stop(false);
    const t = LAUFEY[i];
    const pv = previews[t.title];
    if (!pv) { setOpen(i); return; } // no preview resolved: show the fallback

    const a = new Audio(pv.audio);
    a.volume = 0;
    audioRef.current = a;
    setOpen(i);
    sound.duck(true);
    void a.play().then(() => {
      const t0 = performance.now();
      const tick = () => {
        const el = (performance.now() - t0) / 1000;
        // Fade in over the first half second, out over the last.
        a.volume = Math.min(1, el / 0.5, Math.max(0, (CLIP - el) / 0.8));
        setProgress(Math.min(1, el / CLIP));
        if (el >= CLIP) { stop(false); return; }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }).catch(() => stop(false));
  };

  return (
    <div className="fav-block">
      <div className="fav-head">
        <span className="fav-tag">On repeat</span>
        <h3>Laufey</h3>
        <p>Press one. You get {CLIP} seconds, and the site music steps aside for it.</p>
      </div>
      <div className="tracks">
        {LAUFEY.map((t, i) => {
          const pv = previews[t.title];
          const playing = open === i && !!pv;
          return (
            <div className={`track${open === i ? " open" : ""}`} key={t.title}>
              <button type="button" data-sfx className="track-btn" onClick={() => play(i)}>
                <span className="track-art" aria-hidden="true">
                  {pv?.art ? <img src={pv.art} alt="" loading="lazy" /> : <span className="track-art-empty" />}
                  <span className={`track-icon${playing ? " playing" : ""}`} />
                </span>
                <span className="track-meta">
                  <span className="track-name">{t.title}</span>
                  <span className="track-sub">{pv ? pv.artist : "Laufey"}</span>
                </span>
                <span className="track-go" aria-hidden="true">
                  {playing ? `${Math.max(0, Math.ceil(CLIP * (1 - progress)))}s` : "play"}
                </span>
              </button>
              {playing ? (
                <span className="track-bar" aria-hidden="true">
                  <span style={{ transform: `scaleX(${progress})` }} />
                </span>
              ) : null}
              {open === i && !pv ? (
                // Only reached if Apple's search could not be read. The embed
                // is not as good, but it is better than a dead button.
                <iframe
                  className="track-embed"
                  title={t.title}
                  src={`https://open.spotify.com/embed/track/${t.id}?utm_source=generator&theme=0`}
                  width="100%"
                  height="80"
                  frameBorder="0"
                  loading="lazy"
                  allow="clipboard-write; encrypted-media"
                />
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="track-credit">Previews via Apple. Full songs on your service of choice.</p>
    </div>
  );
}

function Objects() {
  const [i, setI] = useState(0);
  const [live, setLive] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const active = MODELS[i];

  // Nothing loads until the section is actually approached.
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setLive(true); return; }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setLive(true); io.disconnect(); } },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="fav-block fav-objects" ref={hostRef}>
      <div className="fav-head">
        <span className="fav-tag">Things I like, as objects</span>
        <h3>Have a look</h3>
        <p>Pick one. Drag to turn it, scroll inside to zoom.</p>
      </div>

      <div className="obj-stage">
        {live ? (
          <iframe
            key={active.id}
            title={active.label}
            className="obj-frame"
            src={`https://sketchfab.com/models/${active.id}/embed?${VIEWER}`}
            frameBorder="0"
            allow="autoplay; fullscreen; xr-spatial-tracking"
            loading="lazy"
          />
        ) : (
          <div className="obj-idle" aria-hidden="true"><span /></div>
        )}
      </div>

      <div className="obj-tabs" role="tablist" aria-label="Objects">
        {MODELS.map((m, n) => (
          <button
            key={m.key}
            type="button"
            role="tab"
            data-sfx
            aria-selected={n === i}
            className={`obj-tab${n === i ? " on" : ""}`}
            onClick={() => setI(n)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <p className="obj-note">{active.note}</p>
      <p className="obj-credit">
        <a href={active.href} target="_blank" rel="noreferrer nofollow">{active.credit}</a>
        {" on Sketchfab"}
      </p>
    </div>
  );
}

export default function Favourites() {
  return (
    <div className="fav-blocks">
      <Laufey />
      <Objects />
    </div>
  );
}
