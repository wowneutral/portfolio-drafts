// The threshold. Every visitor crosses it once, and the click that crosses it
// does real work: it is the user gesture the browser requires before any
// audio may play. There is no way around that on any browser, which is why
// the sound decision lives here rather than after the door.

import { useEffect, useRef, useState } from "react";
import * as sound from "../lib/sound";
import "./loader.css";

export default function Loader({
  ready,
  onEnter,
}: {
  ready: boolean;
  onEnter: () => void;
}) {
  const [soundOn, setSoundOn] = useState(true);
  const [phase, setPhase] = useState<"loading" | "open" | "leaving" | "gone">("loading");
  const counterRef = useRef<HTMLSpanElement>(null);
  const count = useRef(0);
  const readyRef = useRef(ready);
  readyRef.current = ready;

  // The counter climbs on its own toward 92 and only real readiness lets it
  // finish — it reflects actual state, it just doesn't pretend to know
  // percentages the browser never reports.
  // Fetch and decode both pieces during the wait, so Enter never stalls.
  useEffect(() => { sound.preload(); }, []);

  useEffect(() => {
    let raf = 0;
    let done = false;
    const tick = () => {
      const target = readyRef.current ? 100 : 92;
      count.current += (target - count.current) * (readyRef.current ? 0.085 : 0.021);
      if (count.current > 99.4 && readyRef.current) count.current = 100;
      if (counterRef.current) {
        counterRef.current.textContent = String(Math.floor(count.current)).padStart(3, "0");
      }
      if (count.current >= 100 && !done) {
        done = true;
        setTimeout(() => setPhase((ph) => (ph === "loading" ? "open" : ph)), 350);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // The first pointer down anywhere on the loader is already a gesture — the
  // earliest legal moment audio can begin, so the intro piece is playing
  // well before the door opens.
  const armEarly = () => {
    if (soundOn) {
      sound.setOn(true);
      void sound.start();
    }
  };

  const toggleSound = () => {
    setSoundOn((s) => {
      const next = !s;
      sound.setOn(next);
      if (next) void sound.start(); // this very click is the unlocking gesture
      return next;
    });
  };

  const enter = () => {
    if (phase !== "open") return;
    sound.setOn(soundOn);
    if (soundOn) {
      void sound.start();
      void sound.crossToTheme(4); // intro dissolves into the site theme
    }
    setPhase("leaving");
    onEnter();
    setTimeout(() => setPhase("gone"), 1600);
  };

  if (phase === "gone") return null;

  return (
    <div className={`loader loader-${phase}`} onPointerDown={armEarly}>
      <div className="loader-frame" aria-hidden="true" />

      <p className="loader-mark" aria-hidden="true">Armaan Seth</p>

      <div className="loader-center">
        <h1 className="loader-name" aria-label="Armaan Seth">
          <span className="lname-line"><span style={{ animationDelay: "0.15s" }}>Armaan</span></span>
          <span className="lname-line"><span style={{ animationDelay: "0.28s" }}>Seth</span></span>
        </h1>
        <p className="loader-sub">a living world</p>

        <div className="loader-controls">
          <button
            type="button"
            data-sfx
            className={`loader-btn loader-btn-ghost${soundOn ? " is-on" : ""}`}
            aria-pressed={soundOn}
            onClick={toggleSound}
          >
            <span className={`loader-dot${soundOn ? " on" : ""}`} aria-hidden="true" />
            sound {soundOn ? "on" : "off"}
          </button>

          <button
            type="button"
            data-sfx
            className="loader-btn loader-btn-solid"
            disabled={phase !== "open"}
            onClick={enter}
          >
            {phase === "open" ? "Enter" : "loading"}
          </button>
        </div>
      </div>

      <div className="loader-foot" aria-hidden="true">
        <span className="loader-counter"><span ref={counterRef}>000</span></span>
        <span className="loader-hint">best with sound</span>
      </div>
    </div>
  );
}
