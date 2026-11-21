// The one thread down the left margin: from his name, stitched to every section heading, to his email.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from '@/lib/scroll';
import { still } from '@/lib/utils';

type Geo = { h: number; gx: number; y0: number; y1: number; stitches: { y: number; x: number }[] };

export function Margin() {
  const [geo, setGeo] = useState<Geo | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const root = useRef<HTMLElement | null>(null);
  const main = useRef<SVGPathElement>(null);
  const stitchG = useRef<SVGGElement>(null);

  useLayoutEffect(() => {
    const r = svg.current!.parentElement as HTMLElement;
    root.current = r;
    const measure = () => {
      const box = r.getBoundingClientRect();
      const gx = parseFloat(getComputedStyle(r).getPropertyValue('--gx')) || 40;
      const at = (sel: string) => { const el = r.querySelector(sel); return el ? el.getBoundingClientRect() : null; };
      const s = at('[data-thread-start]'), e = at('[data-thread-end]');
      const stitches = [...r.querySelectorAll<HTMLElement>('[data-stitch]')].map((el) => {
        const b = el.getBoundingClientRect();
        const lh = parseFloat(getComputedStyle(el).lineHeight) || b.height;
        return { y: b.top - box.top + Math.min(b.height, lh) * 0.55, x: b.left - box.left - 12 };
      });
      setGeo({ h: r.scrollHeight, gx, y0: s ? s.top - box.top + s.height * 0.5 : 0, y1: e ? e.top - box.top : r.scrollHeight, stitches });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(r);
    document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!geo) return;
    const stitchEls = stitchG.current ? [...stitchG.current.children] as SVGPathElement[] : [];
    if (still) { main.current?.style.setProperty('stroke-dashoffset', '0'); stitchEls.forEach((p) => p.classList.add('on')); return; }
    const tick = () => {
      const r = root.current;
      if (!r) return;
      const top = r.getBoundingClientRect().top;
      const reach = -top + window.innerHeight * 0.82; // how far down the page the thread has been paid out
      const p = Math.min(1, Math.max(0, (reach - geo.y0) / (geo.y1 - geo.y0)));
      main.current?.style.setProperty('stroke-dashoffset', String(1 - p));
      geo.stitches.forEach((s, i) => stitchEls[i]?.classList.toggle('on', reach > s.y));
    };
    tick();
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [geo]);

  if (!geo) return <svg ref={svg} className="margin" width="1" height="1" aria-hidden="true" />;
  const { gx, y0, y1 } = geo;
  return (
    <svg ref={svg} className="margin" width="100%" height={geo.h} aria-hidden="true">
      <path ref={main} className="margin-main" d={`M${gx} ${y0}L${gx} ${y1}`} pathLength={1} />
      <circle className="knot" cx={gx} cy={y0} r={4.5} />
      <g ref={stitchG}>
        {geo.stitches.map((s, i) => (
          <path key={i} className="stitch" d={`M${gx} ${s.y - 10}Q${gx + 4} ${s.y + 3} ${(gx + s.x) / 2} ${s.y + 2}T${s.x} ${s.y}`} pathLength={1} />
        ))}
      </g>
    </svg>
  );
}
