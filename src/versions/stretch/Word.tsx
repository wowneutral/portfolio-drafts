// A big rubber word: a real DOM heading, with React Bits ElasticMesh (adapted, see ElasticMesh.tsx) drawn over it at the same size.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { still } from '@/lib/utils';
import ElasticMesh, { type ElasticHandle } from './ElasticMesh';

const FAMILY = '"Archivo Variable", "Archivo", sans-serif';
const LH = 0.9;
const WEIGHT = '900 condensed'; // Archivo's width axis at 75%: taller rubber, more to grab

function hasWebGL2() {
  if (typeof document === 'undefined') return false;
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}
const webgl = hasWebGL2();
const elastic = webgl && !still;

let probe: CanvasRenderingContext2D | null = null;
function widthAt100(line: string) {
  probe ??= document.createElement('canvas').getContext('2d');
  if (!probe) return line.length * 70;
  probe.font = `${WEIGHT} 100px ${FAMILY}`;
  return probe.measureText(line).width;
}

/** Group words into lines: split [2, 1] makes the first two words one line and the next word another. */
function group(words: string[], split?: number[]) {
  if (!split) return [words.join(' ')];
  const out: string[] = [];
  let i = 0;
  for (const n of split) { out.push(words.slice(i, i + n).join(' ')); i += n; }
  if (i < words.length) out.push(words.slice(i).join(' '));
  return out;
}

type Props = {
  text: string;
  as?: 'h1' | 'h2' | 'h3';
  id?: string;
  split?: number[];
  phoneSplit?: number[];
  max?: number;
  /** Self-pull: 'load' tugs once when ready, 'arrive' tugs once when the band is mostly in view. */
  tug?: 'load' | 'arrive';
  /** Empty space above and below the word, as a share of its size: room to pull. */
  room?: number;
  /** Exposes the rubber's tug handle to a partner word. */
  handleRef?: { current: ElasticHandle | null };
  /** Called when someone grabs this word. */
  onGrab?: () => void;
};

export default function Word({ text, as: Tag = 'h2', id, split, phoneSplit, max = 420, tug, room = 0.42, handleRef, onGrab }: Props) {
  const band = useRef<HTMLDivElement>(null);
  const ownHandle = useRef<ElasticHandle | null>(null);
  const handle = handleRef ?? ownHandle;
  const [w, setW] = useState(0);
  const [fontsOk, setFontsOk] = useState(false);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);
  const tugged = useRef(false);

  useLayoutEffect(() => {
    const el = band.current!;
    setW(el.clientWidth);
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let live = true;
    (document.fonts?.load(`${WEIGHT} 100px ${FAMILY}`) ?? Promise.resolve()).catch(() => null).then(() => { if (live) setFontsOk(true); });
    return () => { live = false; };
  }, []);

  // Mount the canvas only once the band comes near; ElasticMesh itself stops drawing when it leaves the screen.
  useEffect(() => {
    if (!elastic) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); } }, { rootMargin: '40% 0px' });
    io.observe(band.current!);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!ready || !tug || tugged.current) return;
    const el = band.current!;
    const pull = () => {
      if (tugged.current) return;
      tugged.current = true;
      const h = el.clientHeight;
      if (tug === 'load') handle.current?.tug(0.86, 0.52, Math.min(240, el.clientWidth * 0.14), h * 0.16, 1100);
      else handle.current?.tug(0.78, 0.6, 0, h * 0.42, 1700);
    };
    if (tug === 'load') { const t = window.setTimeout(pull, 650); return () => window.clearTimeout(t); }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.intersectionRatio > 0.6)) { io.disconnect(); window.setTimeout(pull, 250); } }, { threshold: [0, 0.6, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, [ready, tug]);

  const phone = w > 0 && w < 640;
  const words = text.toUpperCase().split(' ');
  const lines = group(words, phone ? phoneSplit ?? split : split);
  const inner = Math.max(0, w);
  const widest = fontsOk || w ? Math.max(...lines.map(widthAt100)) : 1;
  const size = w ? Math.min(max, Math.floor((inner * 0.97 * 100) / widest)) : 0;
  const pad = Math.max(40, size * room);
  const height = size ? Math.round(lines.length * size * LH + pad * 2) : undefined;

  return (
    <div ref={band} className={`s-band${ready ? ' is-live' : ''}`} style={{ height }} onPointerDown={ready && onGrab ? onGrab : undefined}>
      <Tag id={id} className="s-word" style={size ? { fontSize: size, lineHeight: LH } : undefined}>
        {lines.map((l, i) => <span key={i} className="s-wline">{l}</span>)}
      </Tag>
      {elastic && near && fontsOk && size > 0 && (
        <ElasticMesh
          className="s-mesh"
          text={lines.join('\n')}
          fontFamily={FAMILY}
          fontWeight={WEIGHT}
          fontSize={size}
          lineHeight={LH}
          color="#141414"
          material="balloon"
          theme="light"
          inflate={0.85}
          stiffness={0.42}
          wobble={0.68}
          grabRadius={Math.min(400, Math.max(60, size * 0.95))}
          stretch={0.85}
          press={0.3}
          shadow={0.7}
          intro={false}
          dpr={Math.min(2, window.devicePixelRatio || 1)}
          onReady={() => setReady(true)}
          handle={handle}
        />
      )}
    </div>
  );
}
