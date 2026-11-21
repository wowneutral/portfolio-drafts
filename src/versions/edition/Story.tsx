// Remixed from chenglou/pretext, pages/demos/editorial-engine.ts (MIT): measured multi-column body with cursor handoff,
// drop cap, pull quotes set into the flow and draggable obstacles the lines route around. The orbs became his pictures.
import { useEffect, useRef, type KeyboardEvent, type PointerEvent as RPointerEvent } from 'react';
import { layout, layoutNextLine, layoutWithLines, prepareWithSegments, type LayoutCursor, type PreparedTextWithSegments } from './pretext/layout';
import { carveTextLineSlots, type Interval } from './wrap';

export type Para = { text: string; head?: string };
export type Fig = {
  id: string; img: string; alt: string; cap: string; sub?: string; href?: string | null;
  /** left edge and width as fractions of the story width, top in body lines */
  x: number; y: number; w: number; ratio: number;
  /** phone: set inline after this paragraph */
  after: number;
};
export type Quote = { text: string; src?: string; col: number; y: number; w: number; side: 'l' | 'r'; after: number };

type Rect = { x: number; y: number; w: number; h: number };
type Line = { x: number; y: number; text: string; width: number; slot: number; last: boolean; head: string };

const BODY = 'Newsreader Variable';
const QUOTE = 'Old Standard TT';
const GAP = 40;
const CAP_H = 52; // caption block under each picture

export const fontsReady = (() => {
  let p: Promise<unknown> | null = null;
  return () => (p ??= Promise.all([
    document.fonts.load(`400 19px "${BODY}"`),
    document.fonts.load(`600 19px "${BODY}"`),
    document.fonts.load(`italic 400 24px "${QUOTE}"`),
    document.fonts.load(`700 40px "${QUOTE}"`),
    document.fonts.load(`400 40px "${QUOTE}"`),
  ]).then(() => document.fonts.ready).catch(() => null));
})();

function metrics(w: number, big: boolean) {
  const narrow = w < 620;
  const size = big ? (narrow ? 20 : 23) : (narrow ? 18 : 19);
  const lh = big ? (narrow ? 31 : 36) : (narrow ? 28 : 30);
  return { size, lh, font: `400 ${size}px "${BODY}"`, qsize: narrow ? 21 : 25, qlh: narrow ? 28 : 32 };
}

function ended(p: PreparedTextWithSegments, c: LayoutCursor) { return layoutNextLine(p, 1e7, c) === null; }

export default function Story({ paras, figs = [], quotes = [], cols, cap = false, big = false, ragged = false, label }: {
  paras: Para[]; figs?: Fig[]; quotes?: Quote[]; cols: (w: number) => number; cap?: boolean; big?: boolean; ragged?: boolean; label: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const linesEl = useRef<HTMLDivElement>(null);
  const capEl = useRef<HTMLSpanElement>(null);
  const figEls = useRef<(HTMLElement | null)[]>([]);
  const qEls = useRef<(HTMLQuoteElement | null)[]>([]);
  const api = useRef<{ pos: { x: number; y: number }[]; relayout: (drag?: boolean) => void; geo: () => { W: number; H0: number; rects: Rect[]; qrects: Rect[]; inline: boolean; capR: Rect | null } } | null>(null);

  useEffect(() => {
    const el = box.current!, linesBox = linesEl.current!;
    let alive = true;
    const pos = figs.map((f) => ({ x: f.x, y: -1 }));
    let prepFont = '', preps: PreparedTextWithSegments[] = [], qpreps: PreparedTextWithSegments[] = [];
    let H = 0, W = 0, H0 = 1, lastW = -1;
    let rects: Rect[] = [], qrects: Rect[] = [], inline = false, capR: Rect | null = null;
    const nodes: HTMLSpanElement[] = [];
    let shown: Line[] = [];

    function prep(m: ReturnType<typeof metrics>) {
      if (m.font === prepFont) return;
      prepFont = m.font;
      preps = paras.map((p) => prepareWithSegments(p.head ? `${p.head} ${p.text}` : p.text, m.font));
      qpreps = quotes.map((q) => prepareWithSegments(q.text, `italic 400 ${m.qsize}px "${QUOTE}"`));
    }

    function capRect(m: ReturnType<typeof metrics>): Rect | null {
      if (!cap || !capEl.current) return null;
      const cw = capEl.current.getBoundingClientRect().width;
      return { x: 0, y: 0, w: Math.ceil(cw) + 12, h: m.lh * 3 };
    }

    // One pass of the flow: fill column after column, handing the cursor on. Returns the lines and whether it all fit.
    function flow(n: number, colW: number, Hmax: number, m: ReturnType<typeof metrics>, obst: Rect[], placeInline: boolean) {
      const lines: Line[] = [];
      let pi = 0, cur: LayoutCursor = cap ? { segmentIndex: 0, graphemeIndex: 1 } : { segmentIndex: 0, graphemeIndex: 0 };
      let fresh = true, bottom = 0;
      const inl: Rect[] = [];
      const iq: Rect[] = [];
      const minSlot = Math.max(120, colW * 0.3);
      for (let c = 0; c < n && pi < paras.length; c++) {
        const x0 = c * (colW + GAP);
        let y = 0;
        while (pi < paras.length && y + m.lh <= Hmax) {
          if (fresh && placeInline) {
            figs.forEach((f, i) => {
              if (f.after !== pi - 1) return;
              const h = Math.round(colW * f.ratio) + CAP_H;
              inl[i] = { x: x0, y: y + (y ? Math.round(m.lh * 0.4) : 0), w: colW, h };
              y = inl[i].y + h + Math.round(m.lh * 0.8);
            });
            quotes.forEach((q, i) => {
              if (q.after !== pi - 1) return;
              const ql = layoutWithLines(qpreps[i], colW - 8, m.qlh).lines.length;
              const h = ql * m.qlh + 30 + (q.src ? 26 : 0);
              iq[i] = { x: x0, y: y + Math.round(m.lh * 0.3), w: colW, h };
              y = iq[i].y + h + Math.round(m.lh * 0.7);
            });
          }
          if (fresh && paras[pi].head && y > 0) y += Math.round(m.lh * 0.6);
          const top = y, bot = y + m.lh;
          const blocked: Interval[] = [];
          for (const r of obst) if (bot > r.y && top < r.y + r.h) blocked.push({ left: r.x, right: r.x + r.w });
          const slots = carveTextLineSlots({ left: x0, right: x0 + colW }, blocked, minSlot).sort((a, b) => a.left - b.left);
          for (const s of slots) {
            const indent = fresh && pi > 0 && !paras[pi].head ? Math.round(m.size * 1.1) : 0;
            const sw = s.right - s.left - indent;
            const line = layoutNextLine(preps[pi], sw, cur);
            if (!line) { pi++; fresh = true; cur = { segmentIndex: 0, graphemeIndex: 0 }; break; }
            const isEnd = ended(preps[pi], line.end);
            lines.push({ x: Math.round(s.left + indent), y, text: line.text.replace(/\s+$/, ''), width: line.width, slot: sw, last: isEnd, head: fresh ? paras[pi].head ?? '' : '' });
            fresh = false;
            cur = line.end;
            if (isEnd) { pi++; fresh = true; cur = { segmentIndex: 0, graphemeIndex: 0 }; break; }
          }
          y += m.lh;
          bottom = Math.max(bottom, y);
        }
      }
      if (placeInline) {
        let y = bottom;
        figs.forEach((f, i) => {
          if (inl[i]) return;
          const h = Math.round(colW * f.ratio) + CAP_H;
          inl[i] = { x: 0, y: y + Math.round(m.lh * 0.6), w: colW, h };
          y = inl[i].y + h;
          bottom = y;
        });
      }
      return { lines, done: pi >= paras.length, bottom, inl, iq };
    }

    function figRect(i: number, colW: number): Rect {
      const f = figs[i];
      const w = Math.min(W, Math.round(f.w * W));
      const h = Math.round(w * f.ratio) + CAP_H;
      const x = Math.round(Math.max(0, Math.min(W - w, pos[i].x * W)));
      const y = Math.round(Math.max(0, pos[i].y));
      void colW;
      return { x, y, w, h };
    }

    function quoteRect(i: number, colW: number, m: ReturnType<typeof metrics>): Rect {
      const q = quotes[i];
      const w = Math.round(colW * q.w);
      const ql = layoutWithLines(qpreps[i], w - 8, m.qlh).lines.length;
      const h = ql * m.qlh + 30 + (q.src ? 26 : 0);
      const cx = q.col * (colW + GAP);
      return { x: q.side === 'r' ? cx + colW - w : cx, y: Math.round(q.y * m.lh), w, h };
    }

    const PADX = 22, PADY = 12;
    const grow = (r: Rect): Rect => ({ x: r.x - PADX, y: r.y - PADY, w: r.w + PADX * 2, h: r.h + PADY * 2 + 6 });

    function paint(lines: Line[], m: ReturnType<typeof metrics>) {
      while (nodes.length < lines.length) { const s = document.createElement('span'); s.className = 'st-ln'; linesBox.appendChild(s); nodes.push(s); }
      while (nodes.length > lines.length) nodes.pop()!.remove();
      for (let i = 0; i < lines.length; i++) {
        const L = lines[i], o = shown[i], s = nodes[i];
        if (!o || o.text !== L.text || o.head !== L.head) {
          s.textContent = '';
          if (L.head && L.text.startsWith(L.head)) {
            const b = document.createElement('strong'); b.className = 'st-rh'; b.textContent = L.head; s.append(b, L.text.slice(L.head.length));
          } else s.textContent = L.text;
        }
        const spaces = (L.text.match(/ /g) || []).length;
        const extra = L.slot - L.width;
        const ws = !ragged && !L.last && spaces > 2 && extra > 0 && extra < L.slot * 0.16 ? extra / spaces : 0;
        if (!o || o.x !== L.x || o.y !== L.y || o.slot !== L.slot || o.width !== L.width) {
          s.style.transform = `translate(${L.x}px, ${L.y}px)`;
          s.style.wordSpacing = ws ? `${ws.toFixed(2)}px` : '';
        }
        s.style.font = m.font; s.style.lineHeight = `${m.lh}px`;
      }
      shown = lines;
    }

    function place(m: ReturnType<typeof metrics>, colW: number) {
      rects.forEach((r, i) => {
        const e = figEls.current[i]; if (!e) return;
        e.style.transform = `translate(${r.x}px, ${r.y}px)`; e.style.width = `${r.w}px`;
      });
      qrects.forEach((r, i) => {
        const e = qEls.current[i]; if (!e) return;
        e.style.transform = `translate(${r.x}px, ${r.y}px)`; e.style.width = `${r.w}px`; e.style.height = `${r.h}px`;
        const ls = layoutWithLines(qpreps[i], r.w - 8, m.qlh).lines;
        const body = e.querySelector('.st-qt') as HTMLElement;
        if (body && body.childElementCount !== ls.length || body.dataset.w !== String(r.w)) {
          body.textContent = ''; body.dataset.w = String(r.w);
          ls.forEach((l) => { const s = document.createElement('span'); s.className = 'st-ql'; s.textContent = l.text.replace(/\s+$/, ''); s.style.font = `italic 400 ${m.qsize}px "${QUOTE}"`; s.style.lineHeight = `${m.qlh}px`; body.appendChild(s); });
        }
      });
      void colW;
    }

    function relayout(drag = false) {
      if (!alive) return;
      W = Math.round(el.clientWidth);
      if (!W) return;
      const m = metrics(window.innerWidth, big);
      prep(m);
      pos.forEach((p, i) => { if (p.y < 0) p.y = figs[i].y * m.lh; });
      const n = Math.max(1, cols(W));
      const colW = Math.floor((W - GAP * (n - 1)) / n);
      inline = n === 1 && W < 700;
      el.classList.toggle('is-inline', inline);
      const cr = capRect(m);
      capR = cr;
      if (capEl.current) { capEl.current.style.fontSize = `${m.lh * 3 - 6}px`; capEl.current.style.lineHeight = `${m.lh * 3 - 6}px`; }
      if (inline) {
        const r = flow(1, colW, 1e7, m, cr ? [cr] : [], true);
        rects = figs.map((_, i) => r.inl[i] ?? { x: 0, y: 0, w: colW, h: 0 });
        qrects = quotes.map((_, i) => r.iq[i] ?? { x: 0, y: 0, w: colW, h: 0 });
        H = r.bottom;
        paint(r.lines, m); place(m, colW);
        el.style.height = `${H}px`;
        return;
      }
      if (W !== lastW || !drag) {
        let total = 0;
        for (const p of preps) total += layout(p, colW, m.lh).lineCount;
        H0 = Math.max(m.lh * 6, (total * m.lh) / n);
      }
      rects = figs.map((_, i) => figRect(i, colW));
      qrects = quotes.map((_, i) => quoteRect(i, colW, m));
      const obst = [...(cr ? [cr] : []), ...rects.map(grow), ...qrects.map((q) => ({ x: q.x - 16, y: q.y - 6, w: q.w + 32, h: q.h + 12 }))];
      const floor = Math.max(...rects.map((r) => r.y + r.h), ...qrects.map((r) => r.y + r.h), m.lh * 3);
      const bands = (h: number) => Math.ceil(h / m.lh) * m.lh;
      let res;
      if (drag && W === lastW && H) {
        let h = Math.max(H, bands(floor));
        res = flow(n, colW, h, m, obst, false);
        for (let k = 0; !res.done && k < 400; k++) { h += m.lh; res = flow(n, colW, h, m, obst, false); }
        H = h;
      } else {
        let lo = Math.max(bands(floor), bands(H0 * 0.6)), hi = lo * 4 + m.lh * 40;
        while (lo < hi) {
          const mid = bands((lo + hi) / 2 - m.lh / 2);
          if (flow(n, colW, mid, m, obst, false).done) hi = mid; else lo = mid + m.lh;
        }
        H = lo;
        res = flow(n, colW, H, m, obst, false);
      }
      lastW = W;
      paint(res.lines, m); place(m, colW);
      el.style.height = `${Math.max(H, floor)}px`;
    }

    api.current = { pos, relayout, geo: () => ({ W, H0, rects, qrects, inline, capR }) };
    let raf = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => relayout()); });
    fontsReady().then(() => { if (!alive) return; relayout(); ro.observe(el); });
    return () => { alive = false; ro.disconnect(); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dragging a picture: the lines reflow every frame around its new rectangle.
  const drag = useRef<{ i: number; sx: number; sy: number; ox: number; oy: number; tx: number; ty: number; moved: boolean; raf: number } | null>(null);
  // While a picture is held, it chases the pointer every frame, shoving neighbours, and the columns reflow behind it.
  const tick = () => {
    const d = drag.current; if (!d) return;
    const r = moveTo(d.i, d.tx, d.ty);
    api.current?.relayout(true);
    d.raf = r === 'more' ? requestAnimationFrame(tick) : 0;
  };
  const hit = (a: Rect, b: Rect) => a.x < b.x + b.w + 16 && a.x + a.w + 16 > b.x && a.y < b.y + b.h + 16 && a.y + a.h + 16 > b.y;
  // Where each picture is right now (positions change between frames, rectangles only on relayout).
  const now = () => {
    const a = api.current!; const g = a.geo();
    return g.rects.map((r, j) => ({ ...r, x: Math.round(a.pos[j].x * g.W), y: Math.round(a.pos[j].y) }));
  };
  const fixed = (r: Rect) => { const g = api.current!.geo(); return g.qrects.every((o) => !hit(r, o)) && (!g.capR || !hit(r, g.capR)); };
  const free = (i: number, r: Rect, rs: Rect[], skip: number[] = []) => fixed(r) && rs.every((o, j) => j === i || skip.includes(j) || !hit(r, o));
  const moveTo = (i: number, px: number, py: number) => {
    const a = api.current!; const g = a.geo(); const rs = now(); const r = rs[i];
    const nx = Math.round(Math.max(0, Math.min(g.W - r.w, px))), ny = Math.round(Math.max(0, py));
    const set = (j: number, x: number, y: number) => { a.pos[j] = { x: x / g.W, y }; return true; };
    const T = { ...r, x: nx, y: ny };
    if (free(i, T, rs)) return set(i, nx, ny);
    // Shove: the pictures in the way move on by the same step, if they have room.
    const sx = nx - r.x, sy = ny - r.y;
    const len = Math.hypot(sx, sy), k = len > 36 ? 36 / len : 1;
    const S = { ...r, x: Math.round(r.x + sx * k), y: Math.round(r.y + sy * k) };
    const inWay = rs.map((o, j) => (j !== i && hit(S, o) ? j : -1)).filter((j) => j >= 0);
    if (fixed(S) && inWay.length) {
      const qx = S.x - r.x, qy = S.y - r.y;
      const moved = inWay.map((j) => ({ j, x: Math.round(Math.max(0, Math.min(g.W - rs[j].w, rs[j].x + qx))), y: Math.max(0, rs[j].y + qy) }));
      const ok = moved.every((m) => { const B = { ...rs[m.j], x: m.x, y: m.y }; return !hit(B, S) && free(m.j, B, rs, [i, ...inWay]); });
      if (ok) { moved.forEach((m) => set(m.j, m.x, m.y)); set(i, S.x, S.y); return 'more'; }
    }
    for (const c of [{ x: nx, y: r.y }, { x: r.x, y: ny }]) if (free(i, { ...r, ...c }, rs)) return set(i, c.x, c.y);
    // Still blocked: slide as far along the way as the page allows, so the picture stops against its neighbour.
    let lo = 0, hi = 1;
    for (let k = 0; k < 9; k++) { const t = (lo + hi) / 2; if (free(i, { ...r, x: r.x + sx * t, y: r.y + sy * t }, rs)) lo = t; else hi = t; }
    if (lo > 0.01) return set(i, Math.round(r.x + sx * lo), Math.round(r.y + sy * lo));
    return false;
  };
  const onDown = (i: number) => (e: RPointerEvent<HTMLElement>) => {
    const a = api.current; if (!a || a.geo().inline || e.button !== 0) return;
    const r = now()[i];
    drag.current = { i, sx: e.clientX, sy: e.clientY, ox: r.x, oy: r.y, tx: r.x, ty: r.y, moved: false, raf: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: RPointerEvent<HTMLElement>) => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && dx * dx + dy * dy < 36) return;
    if (!d.moved) { d.moved = true; figEls.current[d.i]?.classList.add('is-held'); }
    d.tx = d.ox + dx; d.ty = d.oy + dy;
    if (!d.raf) d.raf = requestAnimationFrame(tick);
  };
  const onUp = (e: RPointerEvent<HTMLElement>) => {
    const d = drag.current; if (!d) return;
    drag.current = null;
    figEls.current[d.i]?.classList.remove('is-held');
    if (d.moved) {
      cancelAnimationFrame(d.raf);
      api.current?.relayout(true);
      const el = e.currentTarget as HTMLElement;
      el.dataset.dragged = '1';
      setTimeout(() => { delete el.dataset.dragged; }, 0);
    }
  };
  const onKey = (i: number) => (e: KeyboardEvent<HTMLElement>) => {
    const a = api.current; if (!a || a.geo().inline) return;
    const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!k) return;
    e.preventDefault();
    const step = e.shiftKey ? 96 : 24; const r = now()[i];
    if (moveTo(i, r.x + k[0] * step, r.y + k[1] * step)) a.relayout(true);
  };
  const onClick = (e: React.MouseEvent<HTMLElement>) => { if ((e.currentTarget as HTMLElement).dataset.dragged) e.preventDefault(); };

  const src = (p: string) => import.meta.env.BASE_URL + p;
  return (
    <div className="st" ref={box} role="group" aria-label={label}>
      {cap && <span className="st-cap" ref={capEl} aria-hidden="true">{paras[0].text[0]}</span>}
      {cap && <span className="sr-only">{paras[0].text[0]}</span>}
      <div className="st-lines" ref={linesEl} />
      {quotes.map((q, i) => (
        <blockquote key={i} className="st-q" ref={(e) => { qEls.current[i] = e; }}>
          <p className="st-qt" aria-hidden="true" />
          <span className="sr-only">{q.text}</span>
          {q.src && <cite className="st-qs">{q.src}</cite>}
        </blockquote>
      ))}
      {figs.map((f, i) => {
        const inner = (
          <>
            <img src={src(f.img)} alt={f.alt} draggable={false} loading="lazy" decoding="async" style={{ aspectRatio: `${1 / f.ratio}` }} />
            <span className="st-fc"><b>{f.cap}</b>{f.sub && <span>{f.sub}</span>}</span>
          </>
        );
        const common = {
          className: 'st-fig', ref: (e: HTMLElement | null) => { figEls.current[i] = e; },
          onPointerDown: onDown(i), onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp, onKeyDown: onKey(i), onClick,
        };
        return f.href
          ? <a key={f.id} {...common} href={f.href} target="_blank" rel="noreferrer" draggable={false}>{inner}</a>
          : <button key={f.id} type="button" {...common}>{inner}</button>;
      })}
    </div>
  );
}
