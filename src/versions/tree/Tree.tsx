// The opening: PERSON.line drawn as a syntax tree. Every node is on a spring;
// leaves are doors into the page. Positions are written straight to the DOM per frame.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { still } from '@/lib/utils';
import { scrollToId } from '@/lib/scroll';

type N = { id: string; parent?: string; label?: string; word?: string; role?: number };
type P = N & { x: number; y: number; fs?: number };

export const ROLE_IDS = ['mitez', 'skeptical', 'debate', 'research', 'work'];

// The parse. NP coordination of five NPs; the first two take a PP complement.
const WIDE: N[] = [
  { id: 'r', label: 'NP' },
  { id: 'c0', parent: 'r', label: 'NP', role: 0 },
  { id: 'n0', parent: 'c0', label: 'N', role: 0 },
  { id: 'p0', parent: 'c0', label: 'PP', role: 0 },
  { id: 'q0', parent: 'p0', label: 'P', role: 0 },
  { id: 'm0', parent: 'p0', label: 'NP', role: 0 },
  { id: 'c1', parent: 'r', label: 'NP', role: 1 },
  { id: 'n1', parent: 'c1', label: 'N', role: 1 },
  { id: 'p1', parent: 'c1', label: 'PP', role: 1 },
  { id: 'q1', parent: 'p1', label: 'P', role: 1 },
  { id: 'm1', parent: 'p1', label: 'NP', role: 1 },
  { id: 'c2', parent: 'r', label: 'NP', role: 2 },
  { id: 'n2', parent: 'c2', label: 'N', role: 2 },
  { id: 'c3', parent: 'r', label: 'NP', role: 3 },
  { id: 'n3', parent: 'c3', label: 'N', role: 3 },
  { id: 'c4', parent: 'r', label: 'NP', role: 4 },
  { id: 'n4', parent: 'c4', label: 'N', role: 4 },
  { id: 'w0a', parent: 'n0', word: 'Founder', role: 0 },
  { id: 'w0b', parent: 'q0', word: 'of', role: 0 },
  { id: 'w0c', parent: 'm0', word: 'MITEZ', role: 0 },
  { id: 'w1a', parent: 'n1', word: 'head coach', role: 1 },
  { id: 'w1b', parent: 'q1', word: 'of', role: 1 },
  { id: 'w1c', parent: 'm1', word: 'Skeptical', role: 1 },
  { id: 'w2', parent: 'n2', word: 'debater', role: 2 },
  { id: 'w3', parent: 'n3', word: 'researcher', role: 3 },
  { id: 'w4', parent: 'n4', word: 'developer', role: 4 },
];
const DEPTH: Record<string, number> = { r: 0, c: 1, n: 2, p: 2, q: 3, m: 3 };

// On a phone the tree stands up: root at the top, one row per conjunct, each phrase as a triangle leaf.
const TALL: N[] = [
  { id: 'r', label: 'NP' },
  ...['Founder of MITEZ', 'head coach of Skeptical', 'debater', 'researcher', 'developer'].flatMap((w, i) => [
    { id: 'c' + i, parent: 'r', label: 'NP', role: i },
    { id: 'w' + i, parent: 'c' + i, word: w, role: i },
  ]),
];

function layout(w: number): { nodes: P[]; h: number; tall: boolean } {
  if (w < 700) {
    const row = 66, top = 18;
    const nodes = TALL.map((n) => {
      if (n.id === 'r') return { ...n, x: 22, y: top };
      const i = n.role!;
      const y = top + 58 + i * row;
      return n.word ? { ...n, x: 112, y: y + 7, fs: 25 } : { ...n, x: 70, y };
    });
    return { nodes, h: top + 58 + 4 * row + 40, tall: true };
  }
  const leaves = WIDE.filter((n) => n.word);
  const units = leaves.map((l) => l.word!.length * 0.55 + 4.2);
  const total = units.reduce((a, b) => a + b, 0);
  const pad = 30;
  const per = (w - pad * 2) / total;
  const fs = Math.min(40, Math.max(19, per * 1.8));
  const h = Math.min(540, Math.max(380, w * 0.36));
  const dy = (h - 90) / 4;
  const pos: Record<string, P> = {};
  let acc = pad;
  leaves.forEach((l, i) => { const x = acc + (units[i] * per) / 2; acc += units[i] * per; pos[l.id] = { ...l, x, y: h - 34, fs }; });
  // internal nodes centred over their children, deepest first
  const internal = WIDE.filter((n) => !n.word).sort((a, b) => DEPTH[b.id[0]] - DEPTH[a.id[0]]);
  for (const n of internal) {
    const kids = WIDE.filter((k) => k.parent === n.id).map((k) => pos[k.id]);
    const x = kids.reduce((a, k) => a + k.x, 0) / kids.length;
    pos[n.id] = { ...n, x, y: 22 + DEPTH[n.id[0]] * dy };
  }
  return { nodes: WIDE.map((n) => pos[n.id]), h, tall: false };
}

// Where each word sits while the line is still just a sentence, before it parses itself.
const PUNCT: Record<string, string> = { w0c: ',', w1c: ',', w2: ',', w3: ',', w4: '.' };
function sentence(nodes: P[], w: number, h: number) {
  const leaves = nodes.filter((n) => n.word);
  const fs = leaves[0]?.fs ?? 30;
  const ctx = document.createElement('canvas').getContext('2d');
  if (ctx) ctx.font = `${fs}px "Newsreader Variable", Georgia, serif`;
  const m = (t: string) => (ctx ? ctx.measureText(t).width : t.length * fs * 0.5);
  const cw = m(','), sp = fs * 0.27;
  const widths = leaves.map((l) => m(l.word!) + (PUNCT[l.id] ? cw : 0));
  const total = widths.reduce((a, b) => a + b, 0) + sp * (leaves.length - 1);
  let x = (w - total) / 2;
  const at: Record<string, { x: number; y: number; px: number }> = {};
  leaves.forEach((l, i) => { const ww = m(l.word!); at[l.id] = { x: x + ww / 2, y: h * 0.42, px: x + ww }; x += widths[i] + sp; });
  return at;
}

type Body = { ox: number; oy: number; vx: number; vy: number };

export default function Tree({ lit, setLit }: { lit: number; setLit: (i: number) => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [w, setW] = useState(0);
  const [drawn, setDrawn] = useState(still);
  const { nodes, h, tall } = layout(w || 1200);
  const bodies = useRef<Record<string, Body>>({});
  const drag = useRef<{ id: string; gx: number; gy: number; moved: number } | null>(null);
  const raf = useRef(0);
  const kick = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    const el = wrap.current!;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const hold = useRef<Record<string, number>>({});
  const parsed = useRef(false);

  // The physics: each node springs to rest; a dragged node pulls its neighbours a little, like wire.
  useEffect(() => {
    const B = bodies.current;
    nodes.forEach((n) => { B[n.id] ??= { ox: 0, oy: 0, vx: 0, vy: 0 }; });
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const nbrs: Record<string, string[]> = {};
    nodes.forEach((n) => { nbrs[n.id] = []; });
    nodes.forEach((n) => { if (n.parent) { nbrs[n.id].push(n.parent); nbrs[n.parent].push(n.id); } });
    const root = svg.current!;
    const gEls: Record<string, SVGGElement | null> = {};
    const lEls: Record<string, SVGLineElement | null> = {};
    nodes.forEach((n) => { gEls[n.id] = root.querySelector(`[data-n="${n.id}"]`); lEls[n.id] = root.querySelector(`[data-e="${n.id}"]`); });
    const trunk = tall ? root.querySelector<SVGLineElement>('[data-e="trunk"]') : null;
    const gap = (n: P, up: boolean) => (n.word ? (up ? -(n.fs ?? 24) * 0.92 : 0) : up ? -11 : 9);
    const paint = () => {
      for (const n of nodes) {
        const b = B[n.id];
        gEls[n.id]?.setAttribute('transform', `translate(${(n.x + b.ox).toFixed(2)} ${(n.y + b.oy).toFixed(2)})`);
        if (n.parent) {
          const p = byId[n.parent], pb = B[n.parent], l = lEls[n.id];
          if (!l) continue;
          const tallLeaf = tall && n.word;
          const tallNode = tall && !n.word && n.parent === 'r';
          l.setAttribute('x1', String(p.x + pb.ox + (tallLeaf ? 16 : 0)));
          l.setAttribute('y1', String(tallNode ? n.y + b.oy : p.y + pb.oy + (tallLeaf ? 0 : 9)));
          l.setAttribute('x2', String(n.x + b.ox + (tallLeaf ? -8 : tallNode ? -19 : 0)));
          l.setAttribute('y2', String(n.y + b.oy + (tallLeaf ? -6 : tallNode ? 0 : gap(n, true))));
        }
      }
      if (trunk) {
        const r = byId.r, rb = B.r, end = byId.c4, eb = B.c4;
        trunk.setAttribute('x1', String(r.x + rb.ox)); trunk.setAttribute('y1', String(r.y + rb.oy + 11));
        trunk.setAttribute('x2', String(r.x + rb.ox)); trunk.setAttribute('y2', String(end.y + eb.oy));
      }
    };
    // The opening: the line sits as a sentence, then each word drops into its place in the tree.
    let timer = 0;
    if (!parsed.current && w > 0) {
      parsed.current = true;
      if (!tall && !still) {
        const at = sentence(nodes, w, h);
        const t0 = performance.now() + 1500;
        nodes.filter((n) => n.word).forEach((n, i) => {
          Object.assign(B[n.id], { ox: at[n.id].x - n.x, oy: at[n.id].y - n.y, vx: 0, vy: 0 });
          hold.current[n.id] = t0 + i * 85;
        });
        timer = window.setTimeout(() => { setDrawn(true); kick.current(); }, 1500);
      } else if (!still) timer = window.setTimeout(() => setDrawn(true), 200);
    }
    let last = performance.now();
    const step = (t: number) => {
      const dt = Math.min(1 / 30, (t - last) / 1000); last = t;
      let energy = 0;
      for (const n of nodes) {
        const b = B[n.id];
        if (drag.current?.id === n.id) continue;
        if ((hold.current[n.id] ?? 0) > performance.now()) { energy += 1; continue; }
        let tx = 0, ty = 0;
        const ns = nbrs[n.id];
        for (const m of ns) { tx += B[m].ox; ty += B[m].oy; }
        tx = (tx / ns.length) * 0.42; ty = (ty / ns.length) * 0.42;
        const k = 210, c = 13;
        b.vx += ((tx - b.ox) * k - b.vx * c) * dt;
        b.vy += ((ty - b.oy) * k - b.vy * c) * dt;
        b.ox += b.vx * dt; b.oy += b.vy * dt;
        energy += Math.abs(b.vx) + Math.abs(b.vy) + Math.abs(b.ox) + Math.abs(b.oy);
      }
      paint();
      if (energy > 0.05 || drag.current) raf.current = requestAnimationFrame(step);
      else { for (const n of nodes) Object.assign(B[n.id], { ox: 0, oy: 0, vx: 0, vy: 0 }); paint(); raf.current = 0; }
    };
    kick.current = () => { if (!raf.current) { last = performance.now(); raf.current = requestAnimationFrame(step); } };
    paint();
    return () => { clearTimeout(timer); cancelAnimationFrame(raf.current); raf.current = 0; };
  }, [w]); // eslint-disable-line react-hooks/exhaustive-deps

  const local = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const down = (e: React.PointerEvent, n: P) => {
    if (e.button !== 0) return;
    const p = local(e), b = bodies.current[n.id];
    drag.current = { id: n.id, gx: p.x - (n.x + b.ox), gy: p.y - (n.y + b.oy), moved: 0 };
    svg.current!.setPointerCapture(e.pointerId);
    if (n.role !== undefined) setLit(n.role);
    kick.current();
  };
  const prev = useRef<{ x: number; y: number; t: number } | null>(null);
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) {
      if (e.pointerType !== 'mouse' || still) return;
      const p = local(e), t = performance.now(), q = prev.current;
      prev.current = { ...p, t };
      if (!q || t - q.t > 80) return;
      const vx = (p.x - q.x) / Math.max(8, t - q.t), vy = (p.y - q.y) / Math.max(8, t - q.t);
      let hit = false;
      for (const n of nodes) {
        const b = bodies.current[n.id];
        const dist = Math.hypot(n.x + b.ox - p.x, n.y + b.oy - p.y - (n.word ? -(n.fs ?? 24) * 0.35 : 0));
        if (dist < 46) { const f = (1 - dist / 46) * 260; b.vx += vx * f; b.vy += vy * f; hit = true; }
      }
      if (hit) kick.current();
      return;
    }
    const n = nodes.find((x) => x.id === d.id)!; const p = local(e); const b = bodies.current[d.id];
    let ox = p.x - d.gx - n.x, oy = p.y - d.gy - n.y;
    const len = Math.hypot(ox, oy), max = 150;
    if (len > max) { ox *= max / len; oy *= max / len; } // the wire is taut, not infinite
    b.vx = (ox - b.ox) * 30; b.vy = (oy - b.oy) * 30;
    b.ox = ox; b.oy = oy; d.moved = Math.max(d.moved, len);
  };
  const up = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    drag.current = null;
    try { svg.current!.releasePointerCapture(e.pointerId); } catch { /* fine */ }
    const n = nodes.find((x) => x.id === d.id)!;
    if (d.moved < 6 && n.role !== undefined && n.word) scrollToId(ROLE_IDS[n.role]);
    kick.current();
  };
  const key = (e: React.KeyboardEvent, n: P) => {
    const dir: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const v = dir[e.key];
    if (v) { e.preventDefault(); const b = bodies.current[n.id]; b.vx += v[0] * 900; b.vy += v[1] * 900; kick.current(); }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (n.role !== undefined) scrollToId(ROLE_IDS[n.role]); }
  };

  return (
    <div ref={wrap} className={'tr-wrap' + (tall ? ' is-tall' : '')}>
      <svg
        ref={svg}
        className={'tr-svg' + (drawn ? ' is-drawn' : '')}
        width={w || 1200}
        height={h}
        viewBox={`0 0 ${w || 1200} ${h}`}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        role="group"
        aria-label="A syntax tree of the sentence: Founder of MITEZ, head coach of Skeptical, debater, researcher, developer."
      >
        {tall && <line data-e="trunk" pathLength={1} className="tr-edge" style={{ transitionDelay: '0.15s, 0s' }} />}
        {nodes.filter((n) => n.parent).map((n) => {
          const depth = n.word ? 4 : DEPTH[n.id[0]] ?? 1;
          return (
            <line
              key={'e' + n.id}
              data-e={n.id}
              pathLength={1}
              className={'tr-edge' + (n.role === lit ? ' is-lit' : '')}
              style={{ transitionDelay: `${0.15 + depth * 0.22}s, 0s` }}
            />
          );
        })}
        {!tall && !drawn && w > 0 && (() => {
          const at = sentence(nodes, w, h);
          return Object.keys(PUNCT).map((id) => (
            <text key={id} className="tr-punct" x={at[id].px} y={at[id].y} style={{ fontSize: nodes.find((n) => n.id === id)?.fs }} aria-hidden="true">{PUNCT[id]}</text>
          ));
        })()}
        {nodes.map((n) => {
          const depth = n.word ? 4 : DEPTH[n.id[0]] ?? 1;
          const cls = 'tr-node' + (n.word ? ' tr-leaf' : ' tr-label') + (n.role === lit ? ' is-lit' : '');
          if (n.word) {
            return (
              <g
                key={n.id}
                data-n={n.id}
                className={cls}
                tabIndex={0}
                role="link"
                aria-label={`${n.word}: go to ${ROLE_IDS[n.role!]}`}
                onPointerDown={(e) => down(e, n)}
                onPointerEnter={() => setLit(n.role!)}
                onFocus={() => setLit(n.role!)}
                onKeyDown={(e) => key(e, n)}
                style={{ transitionDelay: `${0.2 + depth * 0.22}s` }}
              >
                <rect className="tr-hit" x={tall ? -8 : -(n.word.length * (n.fs ?? 24) * 0.3 + 12)} y={-(n.fs ?? 24) * 1.1} width={tall ? (n.word.length * (n.fs ?? 24) * 0.47 + 18) : n.word.length * (n.fs ?? 24) * 0.6 + 24} height={(n.fs ?? 24) * 1.6} />
                <text textAnchor={tall ? 'start' : 'middle'} style={{ fontSize: n.fs }} aria-hidden="true">{n.word}</text>
              </g>
            );
          }
          return (
            <g key={n.id} data-n={n.id} className={cls} onPointerDown={(e) => down(e, n)} onPointerEnter={() => n.role !== undefined && setLit(n.role)} style={{ transitionDelay: `${depth * 0.22}s` }} aria-hidden="true">
              <rect className="tr-hit" x={-22} y={-22} width={44} height={44} />
              <text textAnchor="middle" dy="0.35em">{n.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
