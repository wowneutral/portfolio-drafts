// Draft 91, the layers. One teardown drawing: a column of fancy CSSBox slabs (danielpetho/fancy, MIT)
// that scroll pulls apart and closes, with orange leader lines to labels that ride their slabs.
import { useEffect, useRef, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { gsap, scroll } from '@/lib/scroll';
import { clamp, damp, smooth, still } from '@/lib/utils';
import { Slab, useTurn } from './Box';

export type Layer = {
  /** One or two words printed large on a black slab. */
  word?: string;
  /** A picture on the slab's face. */
  img?: string;
  alt?: string;
  /** The label at the side, joined by a leader line. */
  label?: string;
  /** Anything else for the face. */
  node?: ReactNode;
  /** Clicking the face opens the picture flat. */
  open?: boolean;
  href?: string;
  tone?: 'ink' | 'paper' | 'orange';
};

type Props = {
  layers: Layer[];
  w: number;
  h: number;
  t?: number;
  gap?: number;
  rx?: number;
  ry?: number;
  /** 'scroll': open while the plate is centred. 'end': close and turn flat as the page ends. */
  mode?: 'scroll' | 'end';
  rail?: boolean;
  onOpen?: (src: string, alt: string, from: DOMRect) => void;
  className?: string;
  name: string;
};

export default function Stack({ layers, w, h, t = 12, gap = 96, rx = 30, ry = -20, mode = 'scroll', rail = true, onOpen, className = '', name }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const group = useRef<HTMLDivElement>(null);
  const floor = useRef<HTMLDivElement>(null);
  const lay = useRef<(HTMLDivElement | null)[]>([]);
  const anchors = useRef<(HTMLSpanElement | null)[]>([]);
  const labels = useRef<(HTMLLIElement | null)[]>([]);
  const lines = useRef<(SVGLineElement | null)[]>([]);
  const dots = useRef<(SVGCircleElement | null)[]>([]);
  const railRef = useRef<HTMLOListElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const perspRef = useRef<HTMLDivElement>(null);
  const turn = useTurn(rx, ry, mode === 'scroll' ? undefined : false);
  const n = layers.length;
  const hover = useRef(false);

  // Fit the drawing to its stage so slabs never run into the label rail at any width.
  useEffect(() => {
    const st = stageRef.current, pe = perspRef.current;
    if (!st || !pe) return;
    const fit = () => {
      const k = Math.min(1, st.clientWidth / (w * 1.3), st.clientHeight / (h * 0.95 + (n - 1) * (t + (mode === 'end' ? 0 : gap)) * 0.6 + 120));
      pe.style.setProperty('--k', k.toFixed(3));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(st);
    return () => ro.disconnect();
  }, [w, h, n, t, gap, mode]);

  useEffect(() => {
    let e = still ? (mode === 'end' ? 0 : 0.85) : mode === 'end' ? 1 : 0;
    let first = true;
    let born = false;
    let lift = 0;
    const tick = (_t: number, dms: number) => {
      const el = root.current;
      if (!el) return;
      const vh = window.innerHeight;
      const r = el.getBoundingClientRect();
      const near = r.bottom > -vh * 0.5 && r.top < vh * 1.5;
      if (!near && !first) return;
      let tgt: number;
      if (mode === 'end') tgt = clamp((scroll.max - scroll.y) / (vh * 0.85));
      else {
        const d = (r.top + r.height / 2 - vh / 2) / vh;
        tgt = smooth(clamp((0.62 - Math.abs(d)) / 0.4));
      }
      const dt = Math.min(0.05, dms / 1000);
      // An authored opening: every scroll stack starts shut and opens on its own the first time.
      if (!still) e = !born ? (mode === 'end' ? tgt : 0) : damp(e, tgt, 5, dt);
      born = true;
      first = false;
      lift = still ? 0 : damp(lift, hover.current ? 1 : 0, 9, dt);
      const step = t + e * gap;
      for (let i = 0; i < n; i++) {
        const L = lay.current[i];
        if (L) L.style.transform = `translateZ(${(((n - 1) / 2 - i) * step + (i === 0 ? lift * 34 : 0)).toFixed(2)}px)`;
      }
      if (floor.current) floor.current.style.transform = `translateZ(${(-((n - 1) / 2) * step - 34 - e * 46).toFixed(2)}px)`;
      if (mode === 'end' && group.current) group.current.style.transform = `rotateX(${(rx * e).toFixed(2)}deg) rotateY(${(ry * e).toFixed(2)}deg)`;
      el.classList.toggle('is-on', e > 0.45);
      el.classList.toggle('is-shut', e < 0.06);
      const rl = railRef.current;
      if (!rail || !rl || rl.offsetParent === null) return;
      const rr = rl.getBoundingClientRect();
      let prev = -1e9;
      for (let i = 0; i < n; i++) {
        const a = anchors.current[i];
        const lab = labels.current[i];
        if (!a || !lab) continue;
        const b = a.getBoundingClientRect();
        const ax = b.left - r.left, ay = b.top + b.height / 2 - r.top;
        const lh = lab.offsetHeight;
        let y = Math.max(ay, prev + lh + 10);
        prev = y;
        lab.style.transform = `translate3d(0, ${(y - lh / 2 - (rr.top - r.top)).toFixed(1)}px, 0)`;
        const ln = lines.current[i];
        const x2 = rr.left - r.left - 12;
        if (ln) { ln.setAttribute('x1', ax.toFixed(1)); ln.setAttribute('y1', ay.toFixed(1)); ln.setAttribute('x2', x2.toFixed(1)); ln.setAttribute('y2', y.toFixed(1)); }
        const dot = dots.current[i];
        if (dot) { dot.setAttribute('cx', ax.toFixed(1)); dot.setAttribute('cy', ay.toFixed(1)); }
      }
    };
    gsap.ticker.add(tick);
    const kick = () => { first = true; };
    window.addEventListener('resize', kick);
    return () => { gsap.ticker.remove(tick); window.removeEventListener('resize', kick); };
  }, [n, t, gap, mode, rx, ry, rail]);

  const face = (L: Layer) => {
    let inner: ReactNode = L.node ?? null;
    if (L.img) inner = <img src={L.img} alt={L.open || L.href ? L.alt ?? '' : ''} draggable={false} />;
    else if (L.word) inner = <span className="lx-word" aria-hidden="true" style={{ fontSize: Math.round(Math.max(20, Math.min(42, (w - 44) / (L.word.length * 0.74)))) }}>{L.word}</span>;
    if (L.open && L.img) {
      return (
        <button type="button" className="lx-open" aria-label={`Open the ${L.alt ?? 'picture'} flat`}
          onClick={(ev) => { if (turn.wasDrag()) return; onOpen?.(L.img!, L.alt ?? '', (ev.currentTarget as HTMLElement).getBoundingClientRect()); }}>
          {inner}
        </button>
      );
    }
    if (L.href) return <a className="lx-open" href={L.href} rel="noopener">{inner}</a>;
    return inner;
  };

  return (
    <div className={'lx-draw ' + className} ref={root} data-mode={mode}>
      <div ref={stageRef} className={'lx-stage' + (turn.enabled ? ' can-turn' : '')} onPointerDown={turn.onPointerDown} role="group" aria-label={name}
        onPointerEnter={(ev) => { if (ev.pointerType === 'mouse') hover.current = true; }} onPointerLeave={() => { hover.current = false; }}
        onFocus={() => { hover.current = true; }} onBlur={() => { hover.current = false; }}
        onKeyDown={(ev) => { const k = { ArrowLeft: [-40, 0], ArrowRight: [40, 0], ArrowUp: [0, 20], ArrowDown: [0, -20] }[ev.key]; if (k && mode === 'scroll') { ev.preventDefault(); turn.nudge(k[0], k[1]); } }}>
        <div className="lx-persp" ref={perspRef}>
          <motion.div className="lx-group" ref={group} style={mode === 'scroll' ? { transform: turn.transform } : undefined}>
            <div className="lx-floor" ref={floor} style={{ width: w * 1.25, height: h * 1.3, marginLeft: -w * 0.625, marginTop: -h * 0.65 }} />
            {layers.map((L, i) => (
              <div className="lx-layer" key={i} ref={(el) => { lay.current[i] = el; }} style={{ marginLeft: -w / 2, marginTop: -h / 2 }}>
                <Slab w={w} h={h} t={t} className={'is-' + (L.tone ?? (L.img ? 'pic' : 'ink')) + (i === 0 ? ' is-top' : '')}
                  front={<>{face(L)}<span className="lx-anchor" ref={(el) => { anchors.current[i] = el; }} /></>} />
              </div>
            ))}
          </motion.div>
        </div>
      </div>
      {rail && (
        <>
          <svg className="lx-leads" aria-hidden="true">
            {layers.map((L, i) => L.label ? <g key={i}><line ref={(el) => { lines.current[i] = el; }} /><circle r="3" ref={(el) => { dots.current[i] = el; }} /></g> : null)}
          </svg>
          <ol className="lx-rail" ref={railRef} aria-hidden="true">
            {layers.map((L, i) => L.label ? <li key={i} ref={(el) => { labels.current[i] = el; }}>{L.label}</li> : null)}
          </ol>
        </>
      )}
    </div>
  );
}
