// Draft 91, the layers. A pile of thin fancy CSSBox slabs (danielpetho/fancy, MIT): one sheet per
// commit (or repo, or shelf), its words printed on the edge that faces you. Sheets drop on and settle.
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { still } from '@/lib/utils';
import { Slab, useTurn } from './Box';

type Props = { sheets: string[]; w: number; h: number; t?: number; rx?: number; ry?: number; name: string; className?: string; top?: string };

export default function Pile({ sheets, w, h, t = 30, rx = 56, ry = -22, name, className = '', top }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const turn = useTurn(rx, ry);
  const [seen, setSeen] = useState(still);
  useEffect(() => {
    if (still || !root.current) return;
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { setSeen(true); io.disconnect(); } }, { rootMargin: '0px 0px -20% 0px' });
    io.observe(root.current);
    return () => io.disconnect();
  }, []);
  const n = sheets.length;
  const key = sheets.join('|');
  return (
    <div className={'lx-pile ' + className + (seen ? ' is-seen' : '')} ref={root} style={{ ['--ph' as string]: `${n * t}px` }}>
      <div className={'lx-stage' + (turn.enabled ? ' can-turn' : '')} onPointerDown={turn.onPointerDown} role="group" aria-label={name}>
        <div className="lx-persp">
          <motion.div className="lx-group" style={{ transform: turn.transform }}>
            <div className="lx-floor" style={{ width: w * 1.3, height: h * 1.3, marginLeft: -w * 0.65, marginTop: -h * 0.65, transform: `translateZ(${(-n * t) / 2 - 30}px)` }} />
            {sheets.map((s, i) => (
              <div className="lx-layer" key={key + i} style={{ marginLeft: -w / 2, marginTop: -h / 2, transform: `translateZ(${((n - 1) / 2 - i) * t}px)` }}>
                <div className="lx-drop" style={{ animationDelay: `${(n - 1 - i) * 140}ms` }}>
                  <Slab w={w} h={h} t={t - 2} className={'is-sheet' + (i === 0 ? ' is-top' : '')}
                    front={i === 0 && top ? <span className="lx-word lx-pile-top" aria-hidden="true">{top}</span> : null}
                    edge={<span className="lx-edge" aria-hidden="true">{s}</span>} />
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
