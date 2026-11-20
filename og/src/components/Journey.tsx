// The one-page journey, in two acts.
//
// ACT I — the flight. The scene is fixed behind everything; a tall scroll
// track turns scroll position into camera depth, and four chapters fade
// through as you pass their stations.
//
//   THE GATE. The camera moves at a bounded pace (MAX_RATE), so a flick of
//   the wheel used to send the document past the end of the track while the
//   camera was still flying — Act II began sliding up over an unfinished
//   flight, and the later chapters never got their moment. So the scroll
//   itself is now clamped: while the flight is running, the page may not be
//   scrolled more than LEAD ahead of where the camera actually is. Pushing
//   harder does not go faster. It is the same idea as a rail — you can set
//   the pace within limits, but you cannot skip the ride, and nothing can
//   ever be seen mid-transition.
//
// ACT II — the record. When the flight lands, the fog dissolves into ground
// and normal document flow takes over: a profile, a counted-up summary, a
// HORIZONTAL rail of work that travels sideways as you scroll down, then the
// results ledger, the research, the coursework, and the door.

import { Suspense, lazy, useCallback, useEffect, useRef } from "react";
import type { SylvaSceneApi } from "../shaders/sylva-living-world/SylvaImmersiveScene";

// The scene module carries ~770KB of inlined runtime and authored HTML as raw
// strings. Split out, so the loader paints instantly and the forest streams
// in behind it — absorbing that wait is the loader's whole job.
const SylvaImmersiveScene = lazy(async () => {
  const mod = await import("../shaders/sylva-living-world/SylvaImmersiveScene");
  return { default: mod.SylvaImmersiveScene };
});
import "../shaders/threeui-background.css";
import "./journey.css";
import Skeptic from "./Skeptic";
import Poll from "./Poll";
import Favourites from "./Favourites";
import Awards from "./Awards";
import Now from "./Now";
import Code from "./Code";
import {
  CHAPTERS, WORK, HONORS, STATS, COURSES, LIKES, DISLIKES, LINKS,
} from "../content";

const TRACK_VH = 820;

function visibility(p: number, from: number, to: number) {
  const half = (to - from) / 2;
  const c = (from + to) / 2;
  const edge = Math.max(0.0001, half * 0.6);
  const v = 1 - Math.min(1, Math.max(0, (Math.abs(p - c) - half * 0.4) / edge));
  return v * v * (3 - 2 * v);
}

export default function Journey({
  active,
  onSceneReady,
}: {
  active: boolean;
  onSceneReady: () => void;
}) {
  const api = useRef<SylvaSceneApi | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const act2Ref = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const touchRef = useRef<HTMLParagraphElement>(null);
  const chapterRefs = useRef<(HTMLElement | null)[]>([]);
  const railOuterRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const railFillRef = useRef<HTMLSpanElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);

  // Called by the scene once it has actually rendered. Safety net: lift it
  // anyway after four seconds, so a scene that never reports cannot leave the
  // page behind a permanent panel.
  const liftVeil = useCallback(() => {
    veilRef.current?.classList.add("lifted");
  }, []);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(liftVeil, 7000);
    return () => clearTimeout(t);
  }, [active, liftVeil]);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let cur = 0;
    let paused = false;
    let lastT = performance.now();
    let desired = window.scrollY;
    let lastIntent = window.scrollY;
    let lastSent = -1;
    const lastV: number[] = [];

    // Layout, measured rarely. Reading these inside the frame loop forces a
    // reflow every frame; caching them is the single biggest smoothness win
    // in this file.
    let max = 1, docMax = 1, railTop = 0, railSpan = 1, railTravel = 0;
    const measure = () => {
      const trackH = trackRef.current?.offsetHeight ?? 0;
      max = Math.max(1, trackH - window.innerHeight);
      docMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const outer = railOuterRef.current;
      const rail = railRef.current;
      if (outer && rail) {
        railTop = outer.getBoundingClientRect().top + window.scrollY;
        railSpan = Math.max(1, outer.offsetHeight - window.innerHeight);
        railTravel = Math.max(0, rail.scrollWidth - window.innerWidth);
      }
    };
    measure();
    // Act II lays out lazily (images, reveals), so remeasure for a while after
    // entry and whenever the window changes.
    const settle = [250, 800, 1800, 3500].map((ms) => setTimeout(measure, ms));
    const ro = new ResizeObserver(measure);
    if (act2Ref.current) ro.observe(act2Ref.current);
    window.addEventListener("resize", measure);

    // Maximum flight speed, in progress-per-second: the flight takes at
    // least ~7s however hard you scroll. Time-based, so the pace is identical
    // at 30fps and 144fps. window.__flightRate is a test seam — the headless
    // rig runs on a software rasteriser at ~1.5fps, where a real-time flight
    // would take minutes.
    const MAX_RATE = window.__flightRate ?? 0.30;
    // How far the page may be scrolled ahead of the camera, as a fraction of
    // the track. Small enough that the flight always looks resolved.
    //
    // This — not MAX_RATE — is what bounds the flight on a slow machine: the
    // page advances at most LEAD per frame, so at 1.5fps (this project's
    // headless rig) the flight takes ~22s no matter what MAX_RATE says.
    // __flightLead is the matching test seam; the gate itself is asserted
    // directly in scripts/check-journey.mjs.
    const LEAD = window.__flightLead ?? 0.07;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const now = performance.now();
      // Clamped at 0.25 rather than 0.1: the clamp is there to stop a tab
      // returning from the background jumping the camera, but too tight a
      // clamp silently slows the whole flight on a machine under 10fps —
      // the pace becomes per-frame instead of per-second.
      const dt = Math.min(0.25, (now - lastT) / 1000);
      lastT = now;

      // ── the gate ────────────────────────────────────────────────────
      // The flight cannot be skipped, but a flick must not stop dead either.
      //
      // Lenis's targetScroll is where the user has ASKED to be, before any
      // easing. That intent is remembered in `desired`; the page is then
      // placed at min(desired, allowed), where `allowed` is only ever a hair
      // (LEAD) ahead of the camera. So a hard flick becomes a smooth guided
      // ride: the page keeps advancing on its own, at the flight's pace,
      // until it reaches wherever you asked for. Scrolling back is instant —
      // only going forward is rationed.
      const lenis = window.__lenis;
      const intent = lenis ? lenis.targetScroll : window.scrollY;
      if (Math.abs(intent - lastIntent) > 0.5) desired = intent;
      lastIntent = intent;

      const allowed = cur < 0.992 ? (cur + LEAD) * max : Infinity;
      const y = Math.max(0, Math.min(desired, allowed, docMax));
      // Only correct when the correction is worth a frame. Re-targeting Lenis
      // every single frame fights its own animation loop, and that fight is
      // what made the flight feel notchy rather than smooth.
      if (Math.abs(window.scrollY - y) > 3) {
        if (lenis) {
          lenis.scrollTo(y, { immediate: true, force: true });
          lastIntent = y; // our own write is not user input
        } else {
          window.scrollTo(0, y);
        }
      }

      const target = Math.min(1, Math.max(0, window.scrollY / max));
      const k = 1 - Math.exp(-4.5 * dt);
      let step = (target - cur) * k;
      const ceil = MAX_RATE * dt;
      if (step > ceil) step = ceil;
      if (step < -ceil) step = -ceil;
      cur += step;
      if (Math.abs(target - cur) < 0.0004) cur = target;
      const p = cur;

      // The scene renders only while it can be seen.
      const covered = window.scrollY > max + window.innerHeight * 0.25;
      if (covered !== paused) {
        paused = covered;
        api.current?.pause(covered);
      }

      // postMessage into a cross-origin frame is not free. Only send when the
      // value has actually moved enough for the camera to care.
      if (Math.abs(p - lastSent) > 0.0004) {
        lastSent = p;
        api.current?.setTravel(p);
      }

      if (heroRef.current) {
        const v = 1 - Math.min(1, Math.max(0, (p - 0.02) / 0.07));
        heroRef.current.style.opacity = String(v);
        heroRef.current.style.transform = `translateY(${(1 - v) * -34}px)`;
        heroRef.current.style.visibility = v > 0.001 ? "visible" : "hidden";
      }
      if (cueRef.current) {
        cueRef.current.style.opacity = String(1 - Math.min(1, p / 0.025));
      }
      if (touchRef.current) {
        // Appears just after the hero has settled, gone before the first
        // chapter arrives.
        const v = Math.min(1, Math.max(0, (p - 0.015) / 0.02)) *
          (1 - Math.min(1, Math.max(0, (p - 0.075) / 0.025)));
        touchRef.current.style.opacity = String(v);
      }

      CHAPTERS.forEach((ch, i) => {
        const el = chapterRefs.current[i];
        if (!el) return;
        const v = visibility(p, ch.from, ch.to);
        // Rounded, and skipped entirely when unchanged. Writing the same
        // value every frame still invalidates style on every frame.
        const vr = Math.round(v * 1000) / 1000;
        if (lastV[i] === vr) return;
        lastV[i] = vr;
        el.style.opacity = String(vr);
        const dir = p < (ch.from + ch.to) / 2 ? 1 : -1;
        el.style.transform = `translateX(var(--cx, 0px)) translateY(${((1 - vr) * 22 * dir).toFixed(2)}px)`;
        el.style.visibility = vr > 0.001 ? "visible" : "hidden";
        el.style.pointerEvents = vr > 0.4 ? "auto" : "none";
      });

      // ── the horizontal rail ─────────────────────────────────────────
      // A tall outer section holds a sticky viewport; scrolling through that
      // height slides the rail sideways. Scroll down, travel right.
      const rail = railRef.current;
      if (rail) {
        // railTop comes from getBoundingClientRect + scrollY, NOT offsetTop:
        // .act2 is position:relative, so it is the offsetParent and offsetTop
        // would be measured from IT, putting the origin thousands of pixels
        // out and making the rail look like it never moves.
        const rp = Math.min(1, Math.max(0, (window.scrollY - railTop) / railSpan));
        rail.style.transform = `translate3d(${-(rp * railTravel).toFixed(1)}px,0,0)`;
        if (railFillRef.current) railFillRef.current.style.transform = `scaleX(${rp.toFixed(4)})`;
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      settle.forEach(clearTimeout);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [active]);

  // Pointer forwarding: the iframe is pointer-events:none so the page can
  // scroll — the bridge inside the frame re-dispatches these, so the moss
  // still parts under a cursor it technically never saw.
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      api.current?.pointer("pointermove", e.clientX, e.clientY);
    };
    const leave = () => api.current?.pointer("pointerleave", 0, 0);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerleave", leave, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerleave", leave);
    };
  }, []);

  // Reveals, and the counted-up figures. Both run off one observer so the
  // numbers start climbing exactly when their row is first seen.
  useEffect(() => {
    const root = act2Ref.current;
    if (!root) return;
    const els = root.querySelectorAll("[data-reveal], [data-count]");
    if (typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.classList.add("in");
          io.unobserve(el);
          const to = Number(el.dataset.count);
          if (!Number.isNaN(to) && el.dataset.count !== undefined) {
            const t0 = performance.now();
            const dur = 1100;
            const tick = () => {
              const q = Math.min(1, (performance.now() - t0) / dur);
              const eased = 1 - Math.pow(1 - q, 3);
              el.textContent = String(Math.round(to * eased));
              if (q < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -5% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div className="journey-scene" aria-hidden={!active}>
        <Suspense fallback={null}>
          <SylvaImmersiveScene
            apiRef={api}
            onReady={onSceneReady}
            onPainted={liftVeil}
          />
        </Suspense>
        {/* Between the curtain lifting and the scene's first frames there was
            a beat of flat ground colour. This holds the loader's own colour
            over it and dissolves only once the frame says it has drawn. */}
        <div className="journey-veil" ref={veilRef} aria-hidden="true" />
      </div>

      <div
        className="journey-track"
        ref={trackRef}
        style={{ height: `${TRACK_VH}vh` }}
        aria-hidden="true"
      />

      <div className={`journey-hero${active ? " entered" : ""}`} ref={heroRef}>
        <h1>
          <span className="hero-line"><span>Armaan</span></span>
          <span className="hero-line"><span>Seth</span></span>
        </h1>
        <p>Founder · Debater · Researcher · Developer</p>
      </div>
      <div className="journey-cue" ref={cueRef} aria-hidden="true">
        <span>scroll in</span>
        <i />
      </div>
      {/* The moss really does part under the cursor. Nobody discovers that
          on their own, so the page says it once and then never again. */}
      <p className="journey-touch" ref={touchRef} aria-hidden="true">
        move your cursor. go on, feel the grass
      </p>

      {CHAPTERS.map((ch, i) => (
        <section
          key={ch.id}
          ref={(el) => { chapterRefs.current[i] = el; }}
          className={`journey-chapter side-${ch.side}`}
          aria-label={ch.title}
        >
          <p className="ch-label">{ch.label}</p>
          <h2>{ch.title}</h2>
          <p>{ch.body}</p>
        </section>
      ))}

      {/* ══════════════════════════ ACT II ═══════════════════════════════ */}
      <div className="act2" ref={act2Ref}>
        <div className="act2-grid" aria-hidden="true" />
        <div className="act2-fog" aria-hidden="true" />

        {/* profile */}
        <section className="act2-section" id="profile" data-num="05">
          <div className="act2-wrap">
            <p className="sec-label" data-reveal>Who</p>
            <h2 className="act2-h" data-reveal>
              I am fourteen, I live in Gainesville, and I have never once been
              accused of having a normal hobby.
            </h2>
            <div className="act2-cols">
              <p data-reveal>
                I started debating in 2023 and it took over. Lincoln Douglas
                especially, because an LD round is really an argument about
                ethics with a timer running. That pulled me into philosophy,
                which pulled me into research of my own: a paper on how a
                skeptic can criticise language using language.
              </p>
              <p data-reveal>
                The other half is building. I make websites, tools, and an
                assistant that runs my desktop. Most of it exists because I
                wanted the thing to exist and nobody was going to make it for
                me. MITEZ is the same instinct pointed at people: mentorship
                costs the mentor time and nothing else, so it should be free.
              </p>
            </div>
            <p className="act2-aside" data-reveal>
              Also: I have mentored more than sixty students, I paint when
              there is time, and I shoot JROTC air rifle for fun.
            </p>
            <p className="status" data-reveal>
              <span className="status-dot" aria-hidden="true" />
              Right now: getting ready for Isidore Newman and DSDS1, and behind on stats homework.
            </p>
          </div>
        </section>

        <Now />

        {/* figures */}
        <section className="act2-stats" aria-label="Summary">
          {STATS.map((st, i) => (
            <div className="stat" key={st.label} data-reveal style={{ transitionDelay: `${i * 80}ms` }}>
              <span className="stat-n"><span data-count={st.to}>0</span>{st.suffix}</span>
              <span className="stat-label">{st.label}</span>
            </div>
          ))}
        </section>

        {/* the argument */}
        <Skeptic />

        {/* work, travelling sideways */}
        <section
          className="rail-outer"
          ref={railOuterRef}
          id="work"
          style={{ height: `${WORK.length * 78 + 100}vh` }}
          aria-label="Selected work"
        >
          <div className="rail-sticky">
            <div className="rail-head">
              <p className="sec-label">Things I built</p>
              <span className="rail-hint" aria-hidden="true">keep scrolling, it goes sideways</span>
            </div>

            <div className="rail" ref={railRef}>
              {WORK.map((w) => {
                const Card = w.href ? "a" : "div";
                return (
                  <Card
                    className={`card${w.href ? "" : " card-nolink"}`}
                    key={w.name}
                    {...(w.href ? { href: w.href, target: "_blank", rel: "noreferrer", "data-sfx": true } : {})}
                  >
                    <div className="card-shot" aria-hidden="true">
                      <img src={w.img} alt="" decoding="async" onError={(e) => {
                        (e.currentTarget.parentElement as HTMLElement).classList.add("card-shot-empty");
                      }} />
                      <span className="card-shot-fallback">{w.name}</span>
                    </div>
                    <div className="card-body">
                      <div className="card-top">
                        <span className="card-n">{w.n}</span>
                        <span className="card-kind">{w.kind}</span>
                      </div>
                      <h3 className="card-name">{w.name}</h3>
                      <p className="card-line">{w.line}</p>
                      <div className="card-foot">
                        <span className="card-stack">{w.stack}</span>
                        <span className={`card-go${w.href ? "" : " card-go-muted"}`}>
                          {w.href ? (w.href.replace(/^https?:\/\//, "").replace(/\/$/, "")) : "not on the web"}
                          {w.href ? <span aria-hidden="true"> ↗</span> : null}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
              <div className="rail-end">
                <span className="rail-end-h">Still building</span>
                <p>
                  I am always making more. If you have an idea you want built,
                  or you just want to send me one, I would genuinely like that.
                </p>
                <a href="mailto:armaan.seth2011@gmail.com" data-sfx className="rail-end-cta">
                  Send me one <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>

            <div className="rail-bar" aria-hidden="true">
              <span className="rail-fill" ref={railFillRef} />
            </div>
          </div>
        </section>

        <Code />

        {/* record */}
        <section className="act2-section" id="results" data-num="08">
          <div className="act2-wrap">
            <p className="sec-label" data-reveal>Record</p>
            <h2 className="act2-h" data-reveal>The ones worth listing.</h2>
            <ul className="honors">
              {HONORS.map((h, i) => (
                <li key={h.what} data-reveal style={{ transitionDelay: `${Math.min(i * 45, 320)}ms` }}>
                  <span className="honor-what">{h.what}</span>
                  <span className="honor-detail">{h.detail}</span>
                </li>
              ))}
            </ul>
            <Awards />
            <p className="act2-aside" data-reveal>
              There are more. They are mostly fourth places, and nobody has
              ever been moved by a fourth place.
            </p>
          </div>
        </section>

        {/* the bet */}
        <section className="act2-section bet" id="bet" data-num="09">
          <div className="act2-wrap">
            <p className="sec-label" data-reveal>An ongoing dispute</p>
            <h2 className="act2-h" data-reveal>
              Most Congress TOC bids by the end of the year.
            </h2>
            <div className="score" data-reveal>
              <div className="score-side">
                <span className="score-who">Me</span>
                <span className="score-n">0</span>
              </div>
              <span className="score-v" aria-hidden="true">vs</span>
              <div className="score-side">
                <span className="score-who">My friend</span>
                <span className="score-n">0</span>
              </div>
            </div>
            <p className="score-note" data-reveal>
              Nothing has happened yet. This number is updated by hand, which
              is the only honest way to keep score.
            </p>
          </div>
        </section>

        {/* research */}
        <section className="act2-section" id="research" data-num="10">
          <div className="act2-wrap">
            <p className="sec-label" data-reveal>Research</p>
            <h2 className="act2-h" data-reveal>Climbing the skeptic's ladder.</h2>
            <div className="books">
              <article className="book" data-reveal>
                <p className="book-status is-out">Open access · 2026</p>
                <h3>&ldquo;Not in Mauthner&rsquo;s Sense&rdquo;: Wittgenstein, Mauthner, and the Pyrrhonian Critique of Language</h3>
                <p>
                  How can a skeptic argue that language fails when the
                  argument has to be made in language? I follow one image, the
                  ladder you climb and then throw away, through Sextus
                  Empiricus, Fritz Mauthner and the Tractatus, and argue that
                  Wittgenstein owes Mauthner far more than he admits.
                </p>
                <dl className="book-meta">
                  <div><dt>DOI</dt><dd><a href="https://doi.org/10.5281/zenodo.23652238" target="_blank" rel="noreferrer">10.5281/zenodo.23652238</a></dd></div>
                  <div><dt>Read it</dt><dd><a href="https://philarchive.org/rec/SETTOQ" target="_blank" rel="noreferrer">PhilArchive</a> · <a href="https://zenodo.org/records/23652238" target="_blank" rel="noreferrer">Zenodo</a></dd></div>
                  <div><dt>Indexed</dt><dd><a href="https://scholar.google.com/citations?user=LKoj8VwAAAAJ" target="_blank" rel="noreferrer">Google Scholar</a></dd></div>
                </dl>
              </article>
              <article className="book" data-reveal>
                <p className="book-status is-out">On SSRN</p>
                <h3>The Wessobrunn Prayer: translation and commentary</h3>
                <p>
                  A modern English translation of one of the earliest surviving
                  poems in Old High German, from the late 8th century, with
                  commentary. Full modern translations were hard to find, so I
                  made one.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* get to know me */}
        <section className="act2-section" id="human" data-num="11">
          <div className="act2-wrap">
            <p className="sec-label" data-reveal>Off the record</p>
            <h2 className="act2-h" data-reveal>The parts that are not a résumé.</h2>

            <div className="likes">
              <div className="likes-col" data-reveal>
                <h3 className="likes-h">Things I like</h3>
                <ul>{LIKES.map((l) => <li key={l}>{l}</li>)}</ul>
              </div>
              <div className="likes-col likes-col-bad" data-reveal style={{ transitionDelay: "90ms" }}>
                <h3 className="likes-h">Things I do not</h3>
                <ul>{DISLIKES.map((l) => <li key={l}>{l}</li>)}</ul>
              </div>
            </div>

            <Favourites />

            <div className="poll-wrap" data-reveal><Poll /></div>

            <p className="act2-aside" data-reveal>
              On Plato: who is actually still running Plato? Terrible, terrible
              frameworks.
            </p>
          </div>
        </section>

        {/* coursework */}
        <section className="act2-section" id="study" data-num="12">
          <div className="act2-wrap">
            <p className="sec-label" data-reveal>Extra credit</p>
            <h2 className="act2-h" data-reveal>Courses I took because I wanted to.</h2>
            <div className="courses">
              {COURSES.map((c, i) => (
                <div className="course" key={c.title + c.provider} data-reveal style={{ transitionDelay: `${i * 70}ms` }}>
                  <span className="course-provider">{c.provider}</span>
                  <span className="course-title">{c.title}</span>
                  <span className="course-note">{c.note}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* contact */}
        <section className="act2-section act2-door" id="contact" data-num="13">
          <div className="act2-wrap">
            <p className="sec-label" data-reveal>Say something</p>
            <h2 className="act2-h" data-reveal>Every way to reach me.</h2>
            <ul className="links" data-reveal>
              {LINKS.map((l) => (
                <li key={l.label}>
                  <span className="link-k">{l.label}</span>
                  {l.href ? (
                    <a href={l.href} target={l.href.startsWith("http") ? "_blank" : undefined}
                       rel={l.href.startsWith("http") ? "noreferrer" : undefined} data-sfx>
                      {l.value}<span aria-hidden="true"> ↗</span>
                    </a>
                  ) : (
                    <span className="link-plain">{l.value}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <p className="act2-wordmark" aria-hidden="true">Armaan&nbsp;Seth</p>
          <footer className="act2-footer">
            <span>© {new Date().getFullYear()} Armaan Seth. Built by me, on purpose.</span>
            <span>
              Forest: Sylva by{" "}
              <a href="https://threeui.com" target="_blank" rel="noreferrer">ThreeUI</a>, MIT
            </span>
          </footer>
        </section>
      </div>
    </>
  );
}
