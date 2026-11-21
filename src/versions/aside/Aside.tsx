// One block of justified text with one pair of Bodoni parentheses standing in it. Drag and keyboard handling adapted from the snag draft.
import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import { gsap } from '@/lib/scroll';
import { still, isPhone } from '@/lib/utils';
import { OPEN, CLOSE, RATIO, pour, pourAside, type Pair, type Para, type Style, type Tok } from './flow';

export type Home = { a: number; b: number; top: number; lines: number };
export type BodyPara = { k: string; cls: string; text: string; as?: 'p' | 'span'; hide?: boolean; min?: number; just?: boolean };

function Words({ s }: { s: string }) {
  return (
    <>
      {s.split(/\s+/).filter(Boolean).map((w, i) => (
        <Fragment key={i}>
          <span className="tk">{w}</span>{' '}
        </Fragment>
      ))}
    </>
  );
}

type Props = {
  id: string;
  paras: BodyPara[];
  aside: string | { label: string; href: string };
  asideCls: string;
  desk: Home;
  phone: Home;
  /** Spring home on release (otherwise stay where dropped while the aside fits). */
  back?: boolean;
  /** Start wide apart and close round the aside when the block comes into view. */
  close?: boolean;
  /** Start shut, touching, and open to make room for the aside once the page is ready. */
  opening?: boolean;
  hideAside?: boolean;
  names?: [string, string];
  children?: ReactNode;
};

const margin = (s: number) => 8 + s * 0.035;

export default function Aside({ id, paras, aside, asideCls, desk, phone, back, close, opening, hideAside, names }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const pa = useRef<HTMLButtonElement>(null);
  const pb = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = box.current!;
    const bA = pa.current!;
    const bB = pb.current!;
    let alive = true;
    let W = 0;
    let H = 0;
    let ph = false;
    let body: Para[] = [];
    let aTok: Tok[] = [];
    let aSt: Style;
    let all: Tok[] = [];
    let s = 100;
    let home = { ax: 0, bx: 0, y: 0 };
    // live state
    const S = { ax: 0, bx: 0, y: 0, vax: 0, vbx: 0, vy: 0 };
    const T = { ax: 0, bx: 0, y: 0 };
    let drag: null | { who: 'a' | 'b'; dx: number; dy: number; id: number } = null;
    let fits = true;
    let ready = false;
    let opened = !close || still;
    const last = { ax: NaN, bx: NaN, y: NaN };

    const style = (cls: string, min: number, just: boolean, gapK: number): Style => {
      const pr = document.createElement('span');
      pr.className = `tk ${cls}`;
      pr.style.visibility = 'hidden';
      pr.textContent = 'n n';
      el.appendChild(pr);
      const a = pr.getBoundingClientRect().width;
      pr.textContent = 'nn';
      const b = pr.getBoundingClientRect().width;
      const cs = getComputedStyle(pr);
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4;
      pr.remove();
      return { lh, sp: Math.max(3, a - b), min, gap: lh * gapK, just };
    };

    const bounds = () => {
      const pw = RATIO * s;
      const lo = pw / 2;
      const hi = W - pw / 2;
      return { pw, lo, hi, minGap: pw * 0.92 };
    };

    const measure = () => {
      W = el.clientWidth;
      ph = isPhone();
      const h = ph ? phone : desk;
      const tks = (q: string) => Array.from(el.querySelectorAll<HTMLElement>(q)).map((t) => ({ el: t, w: t.getBoundingClientRect().width, x: 0, y: 0, px: NaN, py: NaN, on: false, pon: true }) as Tok);
      body = paras.map((p) => {
        const st = style(p.cls, p.min ?? (ph ? 2 : 3), (p.just ?? true) && !ph, 0.55);
        return { toks: tks(`[data-p="${p.k}"] .tk`), st };
      });
      aSt = style(asideCls, 1, false, 0);
      aTok = tks('[data-p="aside"] .tk');
      all = [...body.flatMap((b) => b.toks), ...aTok];
      const lh0 = body[0]?.st.lh ?? aSt.lh;
      s = h.lines * lh0;
      const w = RATIO * s;
      home = { ax: h.a * W, bx: h.b * W, y: h.top * lh0 + s / 2 };
      home.ax = Math.max(w / 2, home.ax);
      home.bx = Math.min(W - w / 2, home.bx);
      const svgW = Math.round(w);
      const svgH = Math.round(s);
      for (const btn of [bA, bB]) {
        const svg = btn.querySelector('svg')!;
        svg.setAttribute('width', String(svgW));
        svg.setAttribute('height', String(svgH));
      }
      // rest height
      const restPair: Pair = { a: { x: home.ax, y: home.y, s }, b: { x: home.bx, y: home.y, s } };
      const bottom = pour(body, 0, W, 0, restPair, margin(s));
      H = Math.ceil(Math.max(bottom, home.y + s / 2) + (ph ? 8 : 12));
      el.style.height = H + 'px';
      T.ax = home.ax;
      T.bx = home.bx;
      T.y = home.y;
      if (!ready || still) {
        S.ax = opened ? home.ax : w / 2;
        S.bx = opened ? home.bx : W - w / 2;
        S.y = home.y;
        if (!opened) {
          T.ax = S.ax;
          T.bx = S.bx;
        }
        if (opening && !still) {
          const c = (home.ax + home.bx) / 2;
          const g = w * 0.92;
          S.ax = T.ax = c - g / 2;
          S.bx = T.bx = c + g / 2;
        }
      }
      last.ax = NaN;
      lay();
    };

    const lay = () => {
      const P: Pair = { a: { x: S.ax, y: S.y, s }, b: { x: S.bx, y: S.y, s } };
      const m = margin(s);
      const bottom = pour(body, 0, W, 0, P, m);
      fits = pourAside(aTok, aSt, P, Math.max(6, m * 0.6));
      const need = Math.ceil(Math.max(bottom, S.y + s / 2) + 8);
      if (need > H) {
        H = need;
        el.style.height = H + 'px';
      }
      for (const tk of all) {
        if (tk.x !== tk.px || tk.y !== tk.py) {
          tk.el.style.transform = `translate3d(${tk.x.toFixed(1)}px,${tk.y.toFixed(1)}px,0)`;
          tk.px = tk.x;
          tk.py = tk.y;
        }
        if (tk.on !== tk.pon) {
          tk.el.classList.toggle('off', !tk.on);
          tk.pon = tk.on;
        }
      }
      const pw = RATIO * s;
      bA.style.transform = `translate3d(${(S.ax - pw / 2).toFixed(1)}px,${(S.y - s / 2).toFixed(1)}px,0)`;
      bB.style.transform = `translate3d(${(S.bx - pw / 2).toFixed(1)}px,${(S.y - s / 2).toFixed(1)}px,0)`;
    };

    const clampT = () => {
      const { lo, hi, minGap } = bounds();
      T.ax = Math.max(lo, Math.min(hi - minGap, T.ax));
      T.bx = Math.max(T.ax + minGap, Math.min(hi, T.bx));
      T.y = Math.max(s / 2, Math.min(Math.max(s / 2, H - s / 2), T.y));
    };

    const tick = (_t: number, dms: number) => {
      if (!alive || !ready) return;
      const dt = Math.min(0.04, dms / 1000);
      if (still) {
        S.ax = T.ax;
        S.bx = T.bx;
        S.y = T.y;
      } else {
        const k = drag ? 420 : 150;
        const d = drag ? 34 : 15;
        S.vax += ((T.ax - S.ax) * k - S.vax * d) * dt;
        S.vbx += ((T.bx - S.bx) * k - S.vbx * d) * dt;
        S.vy += ((T.y - S.y) * k - S.vy * d) * dt;
        S.ax += S.vax * dt;
        S.bx += S.vbx * dt;
        S.y += S.vy * dt;
        // the ink never crosses: the two bodies meet and stop
        const { minGap } = bounds();
        if (S.bx - S.ax < minGap) {
          const c = (S.ax + S.bx) / 2;
          S.ax = c - minGap / 2;
          S.bx = c + minGap / 2;
          S.vax = Math.min(0, S.vax);
          S.vbx = Math.max(0, S.vbx);
        }
      }
      if (Math.abs(S.ax - last.ax) + Math.abs(S.bx - last.bx) + Math.abs(S.y - last.y) > 0.04 || last.ax !== last.ax) {
        last.ax = S.ax;
        last.bx = S.bx;
        last.y = S.y;
        lay();
        el.classList.toggle('squeezed', !fits);
      }
    };

    // the engine only runs while its block is on screen
    let on = false;
    const io = new IntersectionObserver(
      ([e]) => {
        const vis = e.isIntersecting;
        if (vis && !on) gsap.ticker.add(tick);
        if (!vis && on) gsap.ticker.remove(tick);
        on = vis;
        if (vis && !opened && e.intersectionRatio > 0.5 && ready) {
          opened = true;
          window.setTimeout(() => {
            T.ax = home.ax;
            T.bx = home.bx;
          }, 260);
        }
      },
      { threshold: [0, 0.55] },
    );
    io.observe(el);

    const settle = () => {
      if (back || !fits) {
        T.ax = home.ax;
        T.bx = home.bx;
        T.y = home.y;
      } else {
        T.ax = S.ax;
        T.bx = S.bx;
        T.y = S.y;
      }
    };

    const down = (who: 'a' | 'b') => (e: PointerEvent) => {
      if (e.button !== 0) return;
      const btn = who === 'a' ? bA : bB;
      btn.setPointerCapture(e.pointerId);
      const r = el.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      drag = { who, dx: px - (who === 'a' ? S.ax : S.bx), dy: py - S.y, id: e.pointerId };
      opened = true;
      btn.classList.add('up');
      el.classList.add('held');
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - drag.dx;
      if (drag.who === 'a') T.ax = x;
      else T.bx = x;
      if (!ph) T.y = e.clientY - r.top - drag.dy;
      clampT();
    };
    const up = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      (drag.who === 'a' ? bA : bB).classList.remove('up');
      el.classList.remove('held');
      drag = null;
      settle();
    };
    const key = (who: 'a' | 'b') => (e: KeyboardEvent) => {
      const step = e.shiftKey ? 80 : 24;
      const d = ({ ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] } as Record<string, number[]>)[e.key];
      if (e.key === 'Escape' || e.key === 'Home') {
        e.preventDefault();
        T.ax = home.ax;
        T.bx = home.bx;
        T.y = home.y;
        return;
      }
      if (!d) return;
      if (ph && d[1]) return;
      e.preventDefault();
      opened = true;
      if (who === 'a') T.ax += d[0];
      else T.bx += d[0];
      T.y += d[1];
      clampT();
      if (back) {
        window.clearTimeout(kb);
        kb = window.setTimeout(settle, 1400);
      }
    };
    let kb = 0;
    const dA = down('a');
    const dB = down('b');
    const kA = key('a');
    const kB = key('b');
    bA.addEventListener('pointerdown', dA);
    bB.addEventListener('pointerdown', dB);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    bA.addEventListener('keydown', kA);
    bB.addEventListener('keydown', kB);

    let lastW = 0;
    let rz = 0;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (!ready || Math.abs(w - lastW) < 1) return;
      lastW = w;
      window.clearTimeout(rz);
      rz = window.setTimeout(() => alive && measure(), 120);
    });
    ro.observe(el);

    (async () => {
      try {
        await Promise.all([
          document.fonts.load('900 100px "Bodoni Moda Variable"'),
          document.fonts.load('400 30px "Bodoni Moda Variable"'),
          document.fonts.load('italic 400 30px "Bodoni Moda Variable"'),
        ]);
        await document.fonts.ready;
      } catch {
        /* whatever loaded */
      }
      if (!alive) return;
      lastW = el.clientWidth;
      measure();
      ready = true;
      el.classList.add('ready');
      if (opening && !still) {
        window.setTimeout(() => {
          if (drag) return;
          T.ax = home.ax;
          T.bx = home.bx;
        }, 520);
      }
      if (on && !opened && close) {
        opened = true;
        window.setTimeout(() => {
          T.ax = home.ax;
          T.bx = home.bx;
        }, 400);
      }
    })();

    return () => {
      alive = false;
      io.disconnect();
      ro.disconnect();
      gsap.ticker.remove(tick);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.clearTimeout(rz);
      window.clearTimeout(kb);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [na, nb] = names ?? ['Opening parenthesis', 'Closing parenthesis'];
  return (
    <div className="fl" ref={box} data-fl={id}>
      {paras.map((p) => {
        const Tag = p.as ?? 'p';
        return (
          <Tag key={p.k} data-p={p.k} className={`pp ${p.cls}`} aria-hidden={p.hide || undefined}>
            <Words s={p.text} />
          </Tag>
        );
      })}
      <p data-p="aside" className={`pp asd ${asideCls}`} aria-hidden={hideAside || undefined}>
        <span className="sr-only-x">Aside: </span>
        {typeof aside === 'string' ? (
          <Words s={aside} />
        ) : (
          <a className="tk lk" href={aside.href}>{aside.label}</a>
        )}
      </p>
      <button ref={pa} type="button" className="pr" aria-label={`${na}. Arrow keys move it.`}>
        <svg viewBox={`${-OPEN.w / 2} ${-OPEN.h / 2} ${OPEN.w} ${OPEN.h}`} aria-hidden="true" focusable="false">
          <path d={OPEN.d} />
        </svg>
      </button>
      <button ref={pb} type="button" className="pr" aria-label={`${nb}. Arrow keys move it.`}>
        <svg viewBox={`${-CLOSE.w / 2} ${-CLOSE.h / 2} ${CLOSE.w} ${CLOSE.h}`} aria-hidden="true" focusable="false">
          <path d={CLOSE.d} />
        </svg>
      </button>
    </div>
  );
}
