import { useEffect, useState } from "react";
import Lenis from "lenis";
import Journey from "./components/Journey";
import Loader from "./components/Loader";
import { attachUiSound } from "./lib/ui-sound";

declare global {
  interface Window {
    __lenis?: Lenis;
    /** Test seam: overrides the flight's max progress-per-second. */
    __flightRate?: number;
    /** Test seam: how far scroll may run ahead of the camera (0–1). */
    __flightLead?: number;
  }
}

export default function App() {
  const [entered, setEntered] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

  // Interface ticks, by delegation — one pair of listeners for every control
  // on the page, present and future.
  useEffect(() => attachUiSound(), []);

  // Lenis smooths the native scroll for the entire page — the flight AND the
  // record. The camera has its own speed governor on top of this; Lenis is
  // what makes the wheel feel like glide instead of steps everywhere.
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.85 });
    window.__lenis = lenis;
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      delete window.__lenis;
    };
  }, []);

  // The page must not scroll while the door is closed — a visitor who scrolls
  // during the loader would enter halfway down the flight. overflow:hidden is
  // not enough once Lenis owns the wheel, so the engine itself is stopped.
  useEffect(() => {
    document.documentElement.style.overflow = entered ? "" : "hidden";
    if (entered) {
      window.__lenis?.scrollTo(0, { immediate: true, force: true });
      window.scrollTo(0, 0);
      window.__lenis?.start();
    } else {
      window.__lenis?.stop();
    }
  }, [entered]);

  return (
    <>
      <Journey active={entered} onSceneReady={() => setSceneReady(true)} />
      <Loader ready={sceneReady} onEnter={() => setEntered(true)} />
    </>
  );
}
