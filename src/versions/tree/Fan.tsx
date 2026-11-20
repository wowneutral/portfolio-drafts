// A branch: one node and the leaves that hang from it, drawn the way a linguist draws them.
// Lines are SVG in a stretched viewBox, so they always meet the centre of each column.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { still } from '@/lib/utils';
import { ROLE_IDS } from './Tree';

export function useIn<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, set] = useState(still);
  useEffect(() => {
    if (still || !ref.current) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { set(true); io.disconnect(); } }, { rootMargin: '0px 0px -12% 0px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
}

type FanProps = {
  node?: ReactNode;
  kids: ReactNode[];
  lit?: number[];
  dashed?: number[];
  from?: number;
  className?: string;
  tall?: number;
};

export function Fan({ node, kids, lit = [], dashed = [], from = 50, className = '', tall = 64 }: FanProps) {
  const [ref, inView] = useIn<HTMLDivElement>();
  const n = kids.length;
  return (
    <div ref={ref} className={'fan ' + className + (inView ? ' is-in' : '')} style={{ ['--n' as string]: n }}>
      {node !== undefined && <div className="fan-node" style={{ left: from + '%' }}>{node}</div>}
      <svg className="fan-lines" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height: tall }} aria-hidden="true">
        {kids.map((_, i) => (
          <line
            key={i}
            x1={from}
            y1={0}
            x2={((i + 0.5) / n) * 100}
            y2={100}
            vectorEffect="non-scaling-stroke"
            className={(lit.includes(i) ? 'is-lit' : '') + (dashed.includes(i) ? ' is-dashed' : '')}
          />
        ))}
      </svg>
      <ul className="fan-kids">
        {kids.map((k, i) => (
          <li key={i} className={(lit.includes(i) ? 'is-lit' : '') + (dashed.includes(i) ? ' is-dashed' : '')}>{k}</li>
        ))}
      </ul>
    </div>
  );
}

const ROLES = ['Founder of MITEZ', 'head coach of Skeptical', 'debater', 'researcher', 'developer'];

/** The section header: the five conjuncts again, small, with this section's branch lit and drawn down to its title. */
export function Bough({ role, extra, title, id }: { role?: number; extra?: string; title: ReactNode; id: string }) {
  const [ref, inView] = useIn<HTMLDivElement>();
  const kids = extra ? [...ROLES, extra] : ROLES;
  const n = kids.length;
  const at = role ?? n - 1;
  const x = ((at + 0.5) / n) * 100;
  return (
    <header ref={ref} className={'bough' + (inView ? ' is-in' : '')} style={{ ['--n' as string]: n }}>
      <div className="bough-root" aria-hidden="true">NP</div>
      <svg className="bough-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {kids.map((_, i) => (
          <line key={i} x1={50} y1={0} x2={((i + 0.5) / n) * 100} y2={100} vectorEffect="non-scaling-stroke" className={i === at ? 'is-lit' : ''} />
        ))}
      </svg>
      <ol className="bough-kids" aria-hidden="true">
        {kids.map((k, i) => (
          <li key={i} className={(i === at ? 'is-lit' : '') + (i === 5 ? ' is-extra' : '')}>
            {i < 5 ? <a href={'#' + ROLE_IDS[i]} tabIndex={-1}>{k}</a> : <span>{k}</span>}
          </li>
        ))}
      </ol>
      <svg className="bough-drop" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <line x1={x} y1={0} x2={50} y2={100} vectorEffect="non-scaling-stroke" className="is-lit" />
      </svg>
      <h2 className="bough-title" id={id + '-h'}>{title}</h2>
    </header>
  );
}
