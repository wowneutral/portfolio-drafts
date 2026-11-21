// A frame of type round an image or a word: one rounded path, its text sliding as the box passes through the screen.
// The path text is fancy's text-along-path (MIT), remixed in PathText.tsx.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useScroll } from 'motion/react';
import { still } from '@/lib/utils';
import { Loop, roundRect, useThread, type Seg } from './PathText';

export default function Frame({ id, segs, size = 13, gap = 9, radius = 14, travel = 0.6, className, children }: {
  id: string; segs: Seg[]; size?: number; gap?: number; radius?: number; travel?: number; className?: string; children: React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [dim, setDim] = useState({ w: 0, h: 0, x: 0, y: 0, iw: 0, ih: 0 });
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      const b = box.current!.getBoundingClientRect(), i = inner.current!.getBoundingClientRect();
      setDim({ w: Math.round(b.width), h: Math.round(b.height), x: Math.round(i.left - b.left), y: Math.round(i.top - b.top), iw: Math.round(i.width), ih: Math.round(i.height) });
    });
    ro.observe(box.current!); ro.observe(inner.current!);
    return () => ro.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({ target: box, offset: ['start end', 'end start'] });
  const per = 2 * (dim.iw + dim.ih);
  const extra = useRef(0);
  const drive = useMemo(() => ({ progress: scrollYProgress, travel: per * travel, extra }), [scrollYProgress, per, travel]);
  const loops = useThread(svg, drive, 0.5);

  // Pointer over the frame pulls its thread forward a little faster.
  useEffect(() => {
    if (still) return;
    const el = box.current!; let raf = 0, v = 0, over = false;
    const step = () => { v += ((over ? 2.2 : 0) - v) * 0.06; extra.current += v; raf = over || Math.abs(v) > 0.02 ? requestAnimationFrame(step) : 0; };
    const en = () => { over = true; if (!raf) raf = requestAnimationFrame(step); };
    const lv = () => { over = false; };
    el.addEventListener('pointerenter', en); el.addEventListener('pointerleave', lv);
    return () => { cancelAnimationFrame(raf); el.removeEventListener('pointerenter', en); el.removeEventListener('pointerleave', lv); };
  }, []);

  const d = dim.iw ? roundRect(dim.x - gap, dim.y - gap, dim.iw + gap * 2, dim.ih + gap * 2, radius) : '';
  return (
    <div ref={box} className={'th-frame' + (className ? ' ' + className : '')}>
      <div ref={inner} className="th-frame-in">{children}</div>
      {dim.w > 0 && (
        <svg ref={svg} className="th-frame-svg" width={dim.w} height={dim.h} viewBox={`0 0 ${dim.w} ${dim.h}`} aria-hidden="true" focusable="false">
          <Loop id={id} d={d} segs={segs} size={size} loops={loops} refit={dim.iw * 10000 + dim.ih} />
        </svg>
      )}
    </div>
  );
}
