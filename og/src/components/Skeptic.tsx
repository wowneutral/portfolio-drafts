// "I am the skeptic."
//
// Short, centred, one idea at a time. An apple sits in the middle; the claim
// about it sits underneath. Scroll and the apple comes apart into drifting
// particles, and the three deontic properties assemble IN ITS PLACE. Then they
// come apart too.
//
// Two mistakes this went through, both worth remembering:
//   - The answers accordion used to live inside this section, which is a tall
//     block with a sticky child. A normal sibling of a sticky element renders
//     at the top of that block, so it printed straight over the argument. It
//     is gone; a scroll piece should carry one idea, not a reading list.
//   - The particles must not disperse inside a box. The canvas spans the whole
//     stage and each particle carries its own drift, wobble and lifetime, so
//     the apple rises and thins like mist rather than sliding to a frame edge.

import { useEffect, useRef } from "react";
import "./skeptic.css";

const WORDS = ["obligation", "prohibition", "permissibility"];

type P = {
  x: number; y: number; r: number; c: string;
  dx: number; dy: number; wob: number; ph: number; d: number;
};

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** An apple in polar form: the dimple and the narrower base are what make it
 *  an apple rather than a circle, and `lean` keeps it from looking machined. */
function appleOutline(cx: number, cy: number, r: number) {
  const pts: [number, number][] = [];
  const N = 200;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const t = Math.cos(a);
    const dimple =
      0.3 * Math.exp(-Math.pow((a + Math.PI / 2) / 0.55, 2)) +
      0.3 * Math.exp(-Math.pow((a + Math.PI / 2 - Math.PI * 2) / 0.55, 2));
    const waist =
      1 + 0.16 * Math.pow(Math.max(0, t), 1.5) - 0.13 * Math.pow(Math.max(0, -t), 1.8);
    const lean = 1 + 0.035 * Math.sin(a + 0.7);
    const rad = r * waist * lean * (1 - dimple);
    pts.push([cx + Math.cos(a) * rad * 1.06, cy + Math.sin(a) * rad]);
  }
  const p = new Path2D();
  p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
  p.closePath();
  return p;
}

function paintApple(g: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const body = appleOutline(cx, cy, r);

  g.save();
  g.strokeStyle = "#4a3524";
  g.lineWidth = Math.max(2, r * 0.055);
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(cx + r * 0.02, cy - r * 0.72);
  g.quadraticCurveTo(cx + r * 0.1, cy - r * 1.06, cx + r * 0.03, cy - r * 1.24);
  g.stroke();
  g.restore();

  g.save();
  g.translate(cx + r * 0.06, cy - r * 1.06);
  g.rotate(-0.5);
  const leaf = g.createLinearGradient(0, 0, r * 0.62, -r * 0.2);
  leaf.addColorStop(0, "#4d6b32");
  leaf.addColorStop(1, "#86a75a");
  g.fillStyle = leaf;
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(r * 0.36, -r * 0.34, r * 0.66, -r * 0.12);
  g.quadraticCurveTo(r * 0.34, r * 0.06, 0, 0);
  g.fill();
  g.restore();

  const base = g.createRadialGradient(
    cx - r * 0.34, cy - r * 0.42, r * 0.06,
    cx + r * 0.06, cy + r * 0.1, r * 1.35,
  );
  base.addColorStop(0, "#ef6a5a");
  base.addColorStop(0.28, "#d63b34");
  base.addColorStop(0.62, "#a81f22");
  base.addColorStop(1, "#5c0d13");
  g.save();
  g.fillStyle = base;
  g.fill(body);
  g.clip(body);

  const vig = g.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.22);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(30,4,8,0.72)");
  g.fillStyle = vig;
  g.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);

  g.save();
  g.translate(cx - r * 0.38, cy - r * 0.44);
  g.rotate(-0.42);
  const spec = g.createRadialGradient(0, 0, 0, 0, 0, r * 0.34);
  spec.addColorStop(0, "rgba(255,246,235,0.82)");
  spec.addColorStop(0.5, "rgba(255,232,214,0.22)");
  spec.addColorStop(1, "rgba(255,232,214,0)");
  g.fillStyle = spec;
  g.beginPath();
  g.ellipse(0, 0, r * 0.3, r * 0.19, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
  g.restore();
}

export default function Skeptic() {
  const outerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const capRefs = useRef<(HTMLElement | null)[]>([]);
  const wordsRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const outer = outerRef.current;
    const canvas = canvasRef.current;
    if (!outer || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let particles: P[] = [];
    let W = 0, H = 0, cx = 0, cy = 0, rr = 0;
    let lastQ = -1;
    // Cached so the frame loop never reads layout, which would force a
    // synchronous reflow on every single frame.
    let top = 0, span = 1;

    const measure = () => {
      top = outer.getBoundingClientRect().top + window.scrollY;
      span = Math.max(1, outer.offsetHeight - window.innerHeight);
    };

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      rr = Math.min(W, H) * 0.21;
      cx = W * 0.5;
      cy = H * 0.5;

      const off = document.createElement("canvas");
      off.width = W;
      off.height = H;
      const o = off.getContext("2d");
      if (!o) return;
      paintApple(o, cx, cy, rr);

      const img = o.getImageData(0, 0, W, H).data;
      const rand = rng(20260824);
      const step = W > 900 ? 3 : 4;
      const next: P[] = [];
      for (let y = 0; y < H; y += step) {
        for (let x = 0; x < W; x += step) {
          const i = (y * W + x) * 4;
          if (img[i + 3] < 140) continue;
          next.push({
            x, y,
            r: step * (0.72 + rand() * 0.22),
            c: `rgb(${img[i]},${img[i + 1]},${img[i + 2]})`,
            dx: (rand() - 0.5) * 0.85,
            dy: -0.45 - rand() * 1.35,
            wob: 0.4 + rand() * 1.5,
            ph: rand() * Math.PI * 2,
            d: rand() * 0.5,
          });
        }
      }
      particles = next;
      lastQ = -1;
      measure();
    };

    build();
    const ro = new ResizeObserver(build);
    ro.observe(canvas);
    window.addEventListener("resize", measure);

    // Five beats. Short, non-overlapping, one idea each.
    const BANDS: [number, number][] = [
      [0.02, 0.22],
      [0.26, 0.44],
      [0.48, 0.66],
      [0.70, 0.86],
      [0.89, 1.01],
    ];
    const FADE = 0.035;

    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const p = Math.min(1, Math.max(0, (window.scrollY - top) / span));
      const q = reduced ? 0 : Math.min(1, Math.max(0, (p - 0.2) / 0.2));

      if (q !== lastQ) {
        lastQ = q;
        ctx.clearRect(0, 0, W, H);
        if (q <= 0) {
          paintApple(ctx, cx, cy, rr);
        } else {
          if (q < 0.34) {
            ctx.save();
            ctx.globalAlpha = 1 - q / 0.34;
            paintApple(ctx, cx, cy, rr);
            ctx.restore();
          }
          const reach = Math.min(W, H) * 0.8;
          for (let i = 0; i < particles.length; i++) {
            const pt = particles[i];
            const local = Math.min(1, Math.max(0, (q - pt.d) / (1 - pt.d)));
            if (local >= 1) continue;
            const e = local * local;
            const sway = Math.sin(pt.ph + local * 5.2) * pt.wob * e * 26;
            ctx.globalAlpha = Math.min(1, q / 0.34) * (1 - local) * (1 - local * 0.35);
            ctx.fillStyle = pt.c;
            ctx.beginPath();
            ctx.arc(
              pt.x + pt.dx * e * reach + sway,
              pt.y + pt.dy * e * reach,
              Math.max(0.35, pt.r * (1 - local * 0.55)),
              0, Math.PI * 2,
            );
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      }

      BANDS.forEach(([a, b], i) => {
        const el = capRefs.current[i];
        if (!el) return;
        const v = Math.min(
          Math.min(1, Math.max(0, (p - a) / FADE)),
          1 - Math.min(1, Math.max(0, (p - (b - FADE)) / FADE)),
        );
        el.style.opacity = String(v);
        el.style.transform = `translateY(${(1 - v) * 14}px)`;
        el.style.visibility = v > 0.01 ? "visible" : "hidden";
      });

      // The properties arrive where the apple was, then leave the same way.
      const inW = Math.min(1, Math.max(0, (p - 0.44) / 0.06));
      const outW = Math.min(1, Math.max(0, (p - 0.68) / 0.1));
      if (wordsRef.current) {
        wordsRef.current.style.opacity = String(inW);
        wordsRef.current.style.visibility = inW > 0.01 ? "visible" : "hidden";
      }
      wordRefs.current.forEach((el, i) => {
        if (!el) return;
        el.style.setProperty("--gone", String(reduced ? 0 : Math.min(1, Math.max(0, (outW - i * 0.14) / 0.6))));
      });
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <section className="skeptic" ref={outerRef} id="skeptic" aria-label="What skepticism is">
      <div className="skeptic-sticky">
        <p className="sec-label skeptic-label">The position</p>

        <div className="sk-visual">
          <canvas ref={canvasRef} className="skeptic-canvas" aria-hidden="true" />
          {/* Sits exactly where the apple was. */}
          <div className="sk-words" ref={wordsRef}>
            {WORDS.map((w, i) => (
              <span className="sk-word" key={w} ref={(el) => { wordRefs.current[i] = el; }}>
                {w.split("").map((ch, j) => (
                  <span key={j} style={{ ["--i" as string]: j, ["--n" as string]: w.length }}>
                    {ch}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>

        <div className="sk-caption">
          <p className="sk-cap" ref={(el) => { capRefs.current[0] = el; }}>
            <q>I have an apple in my hand.</q>
            <span>Said while holding nothing.</span>
          </p>
          <p className="sk-cap" ref={(el) => { capRefs.current[1] = el; }}>
            <q>Nothing is wrong with that sentence.</q>
            <span>It is just false. The thing it needs is not there.</span>
          </p>
          <p className="sk-cap" ref={(el) => { capRefs.current[2] = el; }}>
            <q>Moral language has three of these.</q>
            <span>Every moral claim says one of them attaches to an act.</span>
          </p>
          <p className="sk-cap" ref={(el) => { capRefs.current[3] = el; }}>
            <q>None of them are out there either.</q>
            <span>A fact that moves you just by being seen would be unlike anything else that exists.</span>
          </p>
          <p className="sk-cap sk-cap-final" ref={(el) => { capRefs.current[4] = el; }}>
            <q>So every moral claim asserts an apple.</q>
            <span>Permissibility negates. So I negate. <i aria-hidden="true">&gt;:)</i></span>
          </p>
        </div>
      </div>
    </section>
  );
}
