// The name, drawn only by his commit messages. Path text per contour is fancy's text-along-path (MIT), remixed in PathText.tsx.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useScroll } from 'motion/react';
import { still } from '@/lib/utils';
import { NAME } from './name';
import { Loop, useThread, type Seg } from './PathText';

const S_AT = NAME.glyphs.findIndex((g) => g.ch === 'S');
const ARMAAN_W = 3220; // right edge of the N's outline, in font units
const SETH_W = NAME.width - NAME.glyphs[S_AT].x;
const PAD = 70;

export default function Name({ segs }: { segs: Seg[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [phone, setPhone] = useState(() => matchMedia('(max-width: 640px)').matches);
  useEffect(() => {
    const m = matchMedia('(max-width: 640px)');
    const on = () => setPhone(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);

  const { scrollYProgress } = useScroll({ target: wrap, offset: ['start start', 'end start'] });
  const extra = useRef(still ? 0 : -1500);
  const drive = useMemo(() => ({ progress: scrollYProgress, travel: 2400, extra }), [scrollYProgress]);
  const loops = useThread(svg, drive);

  // Authored opening: the thread runs into place. Then drag pulls it, with inertia.
  useEffect(() => {
    if (still) return;
    let raf = 0, v = 0, t0 = performance.now(), intro = true, down = false, lx = 0, lt = 0;
    const el = wrap.current!;
    const step = (now: number) => {
      if (intro) {
        const k = Math.min(1, (now - t0) / 1900);
        extra.current = -1500 * Math.pow(1 - k, 4) + base;
        if (k >= 1) intro = false;
      } else if (!down && Math.abs(v) > 0.05) {
        extra.current += v; v *= 0.95; base = extra.current;
      }
      raf = intro || (!down && Math.abs(v) > 0.05) ? requestAnimationFrame(step) : 0;
    };
    let base = 0;
    raf = requestAnimationFrame(step);
    const unit = () => (svg.current ? svg.current.viewBox.baseVal.width / svg.current.getBoundingClientRect().width : 4);
    const pd = (e: PointerEvent) => { down = true; intro = false; base = extra.current; lx = e.clientX; lt = performance.now(); v = 0; };
    const pm = (e: PointerEvent) => {
      if (!down) return;
      const dx = (e.clientX - lx) * unit() * 1.4; const now = performance.now();
      extra.current += dx; base = extra.current;
      v = dx / Math.max(1, (now - lt) / 16.7); lx = e.clientX; lt = now;
    };
    const pu = () => { if (!down) return; down = false; if (!raf) raf = requestAnimationFrame(step); };
    el.addEventListener('pointerdown', pd);
    window.addEventListener('pointermove', pm);
    window.addEventListener('pointerup', pu);
    window.addEventListener('pointercancel', pu);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerdown', pd);
      window.removeEventListener('pointermove', pm);
      window.removeEventListener('pointerup', pu);
      window.removeEventListener('pointercancel', pu);
    };
  }, []);

  const size = phone ? 52 : 60;
  const lineH = NAME.cap + 150;
  const vb = phone
    ? `${-PAD} ${-NAME.cap - PAD} ${Math.max(ARMAAN_W, SETH_W) + PAD * 2} ${NAME.cap + lineH + PAD * 2}`
    : `${-PAD} ${-NAME.cap - PAD} ${NAME.width + PAD * 2} ${NAME.cap + PAD * 2}`;

  let k = 0;
  return (
    <div ref={wrap} className="th-name" data-phone={phone || undefined}>
      <svg ref={svg} viewBox={vb} aria-hidden="true" focusable="false">
        {NAME.glyphs.map((g, gi) => {
          const second = gi >= S_AT;
          const tx = phone && second ? -NAME.glyphs[S_AT].x : 0;
          const ty = phone && second ? lineH : 0;
          return (
            <g key={gi} transform={`translate(${tx} ${ty})`}>
              {g.d.map((d, di) => {
                const n = k++;
                return <Loop key={di} id={`th-n${gi}-${di}`} d={d} segs={segs} size={size} from={n} phase={n * 173} loops={loops} refit={phone} />;
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
