// The one place type moves: sand falls out of the glass and heaps itself into "60+".
// Grains land bottom row first, so the figure fills the way a heap does. Once, then it stays.
import { useEffect, useRef, useState } from 'react';

const FONT = '"Bodoni Moda Variable", "Bodoni Moda", serif';
const GRAIN = '#3a2c1f';

export default function Pour({ text, label, moving }: { text: string; label: string; moving: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const [plain] = useState(() => !moving);

  useEffect(() => {
    if (plain) return;
    const wrap = box.current!, c = cv.current!;
    let raf = 0, started = false, done = false, t0 = 0;
    let pts: { x: number; y: number; t: number; f: number }[] = [];
    let W = 0, H = 0, dpr = 1, g = 3;

    const layout = async () => {
      try { await document.fonts.load(`700 200px ${FONT}`); } catch { /* fine */ }
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = wrap.clientWidth; H = Math.round(Math.min(300, Math.max(170, W * 0.5)));
      c.width = W * dpr; c.height = H * dpr; c.style.height = H + 'px';
      const off = document.createElement('canvas'); off.width = W; off.height = H;
      const x = off.getContext('2d')!;
      const fs = Math.round(H * 1.02);
      x.font = `700 ${fs}px ${FONT}`; x.textBaseline = 'alphabetic'; x.fillStyle = '#000'; x.strokeStyle = '#000'; x.lineWidth = Math.max(3, fs * 0.018); x.lineJoin = 'round';
      x.fillText(text, 4, H * 0.86); x.strokeText(text, 4, H * 0.86);
      const data = x.getImageData(0, 0, W, H).data;
      g = W < 500 ? 2.5 : 3;
      const out: { x: number; y: number; t: number; f: number }[] = [];
      for (let yy = 0; yy < H; yy += g) for (let xx = 0; xx < W; xx += g) {
        const px = Math.round(xx), py = Math.round(yy);
        if (data[(py * W + px) * 4 + 3] > 120) out.push({ x: px, y: py, t: 0, f: 0 });
      }
      // bottom first, with a little scatter, like a heap filling
      out.sort((a, b) => (b.y + Math.random() * 14) - (a.y + Math.random() * 14));
      const D = 2.6;
      out.forEach((p, i) => { p.t = (i / out.length) * D; p.f = Math.sqrt((2 * (p.y + 20)) / 2400); });
      pts = out;
    };

    const draw = (now: number) => {
      const ctx = c.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = GRAIN;
      const el = done ? Infinity : (now - t0) / 1000;
      let all = true;
      const s = g * 0.86;
      for (const p of pts) {
        const k = el - p.t;
        if (k <= 0) { all = false; continue; }
        if (k >= p.f) { ctx.fillRect(p.x, p.y, s, s); continue; }
        all = false;
        const u = k / p.f;
        ctx.fillRect(p.x, -20 + (p.y + 20) * u * u, s * 0.8, s * 1.4);
      }
      if (all) { done = true; return; }
      raf = requestAnimationFrame(draw);
    };

    const start = () => { if (started) return; started = true; t0 = performance.now(); raf = requestAnimationFrame(draw); };
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) start(); }, { threshold: 0.35 });
    let w0 = 0;
    const ro = new ResizeObserver(() => {
      if (wrap.clientWidth === w0) return; w0 = wrap.clientWidth;
      layout().then(() => { if (started) { if (done) draw(0); } });
    });
    layout().then(() => { io.observe(wrap); ro.observe(wrap); });
    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); };
  }, [plain, text]);

  return (
    <div className="hg-sixty">
      {plain ? (
        <p className="hg-sixty-type">{text}</p>
      ) : (
        <div ref={box} className="hg-sixty-box">
          <p className="sr-only-x">{text}</p>
          <canvas ref={cv} className="hg-sixty-cv" aria-hidden="true" />
        </div>
      )}
      <p className="hg-sixty-label">{label}</p>
    </div>
  );
}
