// Remixed from React Bits FlyingPosters (MIT + Commons Clause, /home/claude/lab/rb/src/ts-default/Components/FlyingPosters).
// Kept: the instanced WebGL2 column of planes, the atlas, the eased scroll with velocity lean, the per-poster click hit test,
// render-only-on-screen. Changed: one column, posters composed as printed paper (margin, screenshot, name at the foot),
// a gentle drum curve instead of the flip, page scroll and a "focus" or "follow" target instead of wheel and drag,
// and a horizontal mode for the phone band.
import { useEffect, useRef } from 'react';

export type PosterItem = { image: string; name: string; n: string; kind: string; cert?: boolean };

type Props = {
  items: PosterItem[];
  /** Poster width as a share of the column's cross size. */
  fit?: number;
  horizontal?: boolean;
  /** Pixels per second of slow drift (0 for none). */
  speed?: number;
  /** How far the posters travel per pixel of page scroll. */
  pageScroll?: number;
  /** Item to bring to the middle, or null. */
  focus?: number | null;
  /** Continuous item index to sit in the middle (read on scroll). */
  follow?: () => number;
  scrollEase?: number;
  onItemClick?: (index: number) => void;
  onCenter?: (index: number) => void;
  className?: string;
};

const VERTEX = `#version 300 es
in vec2 aPosition;
in vec2 aPoster;
uniform mat4 uProjection;
uniform float uCamera;
uniform vec2 uPoster;
uniform float uSpacing;
uniform float uLoop;
uniform float uScroll;
uniform float uDir;
uniform float uHorizontal;
uniform float uRadius;
uniform float uLean;
uniform float uBend;
out vec2 vUv;
out float vItem;
out float vVis;

void main() {
  // slot order runs down the column (or right along the band), so a rising scroll brings the next poster in
  float s = uDir * (mod(uLoop - (aPoster.x + 0.5) * uSpacing + uScroll, uLoop) - uLoop * 0.5);
  vec2 p = aPosition * uPoster;
  bool hz = uHorizontal > 0.5;
  float la = hz ? p.x : p.y;
  float c = hz ? p.y : p.x;
  float halfC = 0.5 * (hz ? uPoster.y : uPoster.x);
  float a = la + s;
  // the column is a slow drum: posters flatten in the middle and roll away at the ends
  float th = a / uRadius;
  float along = uRadius * sin(th);
  float z = uRadius * (cos(th) - 1.0);
  // with speed the paper catches the air: a low belly across, and a lean back
  float k = c / halfC;
  z += uBend * halfC * (1.0 - k * k);
  z += uLean * la;
  vec3 world = hz ? vec3(along, c, z) : vec3(c, along, z);
  gl_Position = uProjection * vec4(world.xy, world.z - uCamera, 1.0);
  vUv = aPosition + 0.5;
  vItem = aPoster.y;
  vVis = 1.0 - smoothstep(1.25, 1.45, abs(th));
}`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D uAtlas;
uniform vec2 uCells;
uniform vec2 uInset;
uniform float uReveal;
in vec2 vUv;
in float vItem;
in float vVis;
out vec4 outColor;

void main() {
  vec2 cell = vec2(mod(vItem, uCells.x), floor(vItem / uCells.x));
  vec2 local = vec2(vUv.x, 1.0 - vUv.y);
  vec4 sampled = texture(uAtlas, (cell + uInset + local * (1.0 - 2.0 * uInset)) / uCells);
  float alpha = sampled.a * uReveal * vVis;
  if (alpha < 0.002) discard;
  outColor = vec4(sampled.rgb * alpha, alpha);
}`;

const ASPECT = 0.7; // poster width / height
const FOV = (45 * Math.PI) / 180;
const GRID = 24;
const PAPER = '#fbfaf7';
const INK = '#141414';
const VIOLET = '#5a3fc0';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const compile = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
};

/** Prints one poster into a cell: paper, number and kind, the image, the name at the foot. */
function printPoster(ctx: CanvasRenderingContext2D, item: PosterItem, img: HTMLImageElement | null, x: number, y: number, w: number, h: number) {
  const m = w * 0.075;
  ctx.fillStyle = PAPER;
  ctx.fillRect(x, y, w, h);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = VIOLET;
  ctx.font = `600 ${w * 0.05}px "Hanken Grotesk Variable", sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(item.n, x + m, y + m + w * 0.04);
  ctx.fillStyle = INK;
  ctx.textAlign = 'right';
  ctx.fillText(item.kind.toUpperCase(), x + w - m, y + m + w * 0.04);
  const top = y + m + w * 0.085;
  const iw = w - 2 * m;
  const ih = item.cert ? h - (top - y) - m - w * 0.24 : iw / 1.12;
  if (img && img.naturalWidth) {
    if (item.cert) {
      const scale = Math.min(iw / img.naturalWidth, ih / img.naturalHeight);
      const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
      ctx.drawImage(img, x + (w - dw) / 2, top + (ih - dh) / 2, dw, dh);
    } else {
      const ar = iw / ih;
      let sw = img.naturalWidth, sh = img.naturalHeight;
      if (sw / sh > ar) sw = sh * ar; else sh = sw / ar;
      ctx.drawImage(img, 0, 0, sw, sh, x + m, top, iw, ih);
    }
  } else {
    ctx.fillStyle = '#e6e2d9';
    ctx.fillRect(x + m, top, iw, ih);
  }
  // the name, printed as large as the margin allows
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  let size = w * 0.2;
  ctx.font = `600 ${size}px "Fraunces Variable", serif`;
  const tw = ctx.measureText(item.name).width;
  if (tw > iw) { size *= iw / tw; ctx.font = `600 ${size}px "Fraunces Variable", serif`; }
  ctx.fillText(item.name, x + m - size * 0.03, y + h - m - w * 0.02);
  ctx.fillStyle = INK;
  ctx.fillRect(x + m, y + h - m - w * 0.02 - size * 0.95 - w * 0.03, iw, Math.max(1, w * 0.004));
}

export default function Posters({ items, fit = 0.8, horizontal = false, speed = 0, pageScroll = 0, focus = null, follow, scrollEase = 0.06, onItemClick, onCenter, className }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ speed, pageScroll, focus, follow, scrollEase, onItemClick, onCenter, fit, horizontal });
  live.current = { speed, pageScroll, focus, follow, scrollEase, onItemClick, onCenter, fit, horizontal };
  const wakeRef = useRef<() => void>(() => {});

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true });
    if (!root || !canvas || !gl) return undefined;
    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return undefined;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return undefined;
    gl.useProgram(program);
    const U: Record<string, WebGLUniformLocation | null> = {};
    for (const n of ['uProjection', 'uCamera', 'uPoster', 'uSpacing', 'uLoop', 'uScroll', 'uDir', 'uHorizontal', 'uRadius', 'uLean', 'uBend', 'uAtlas', 'uCells', 'uInset', 'uReveal']) U[n] = gl.getUniformLocation(program, n);

    const positions: number[] = [];
    const indices: number[] = [];
    for (let y = 0; y <= GRID; y++) for (let x = 0; x <= GRID; x++) positions.push(x / GRID - 0.5, y / GRID - 0.5);
    for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
      const i = y * (GRID + 1) + x;
      indices.push(i + GRID + 1, i, i + GRID + 2, i, i + 1, i + GRID + 2);
    }
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    const pl = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(pl);
    gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    const posterBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posterBuffer);
    const pp = gl.getAttribLocation(program, 'aPoster');
    gl.enableVertexAttribArray(pp);
    gl.vertexAttribPointer(pp, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(pp, 1);
    gl.bindVertexArray(null);

    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    gl.uniform1i(U.uAtlas, 0);

    const total = items.length;
    const cols = Math.ceil(Math.sqrt(total));
    const rows = Math.ceil(total / cols);
    const cw = 600, ch = Math.round(cw / ASPECT);
    const atlas = document.createElement('canvas');
    atlas.width = cols * cw;
    atlas.height = rows * ch;
    const images: (HTMLImageElement | null)[] = items.map(() => null);
    let dirty = false;
    const paint = () => {
      const ctx = atlas.getContext('2d');
      if (!ctx) return;
      items.forEach((it, i) => printPoster(ctx, it, images[i], (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch));
      dirty = true;
    };
    const upload = () => {
      dirty = false;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    };

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const st = { w: 1, h: 1, dpr: 1, pw: 1, ph: 1, spacing: 1, slots: total, loop: 1, scroll: 0, target: 0, velocity: 0, lean: 0, bend: 0, reveal: 0, pageY: window.scrollY, center: -1, loaded: 0 };
    let raf = 0, last = 0, visible = true, alive = true;
    const dir = () => (live.current.horizontal ? -1 : 1);

    const layout = () => {
      const s = live.current;
      const cross = s.horizontal ? st.h : st.w;
      const along = s.horizontal ? st.w : st.h;
      if (s.horizontal) { st.ph = cross * s.fit; st.pw = st.ph * ASPECT; } else { st.pw = cross * s.fit; st.ph = st.pw / ASPECT; }
      const size = s.horizontal ? st.pw : st.ph;
      st.spacing = size + (s.horizontal ? size * 0.12 : Math.max(40, size * 0.1));
      const need = Math.ceil((along * 1.6 + size * 2) / st.spacing);
      st.slots = total * Math.max(1, Math.ceil(need / total));
      st.loop = st.slots * st.spacing;
      const data = new Float32Array(st.slots * 2);
      for (let i = 0; i < st.slots; i++) data.set([i, i % total], i * 2);
      gl.bindBuffer(gl.ARRAY_BUFFER, posterBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    };

    const slotOffset = (slot: number, scroll: number) => {
      const raw = st.loop - (slot + 0.5) * st.spacing + scroll;
      return dir() * ((((raw % st.loop) + st.loop) % st.loop) - st.loop / 2);
    };
    /** The scroll value that puts continuous item index f in the middle, nearest the current target. */
    const scrollFor = (f: number) => {
      const want = (f + 0.5) * st.spacing - st.loop / 2;
      return want + st.loop * Math.round((st.target - want) / st.loop);
    };
    const radius = () => (live.current.horizontal ? st.w : st.h) * 1.15;

    const posterAt = (cx: number, cy: number) => {
      const rect = canvas.getBoundingClientRect();
      const x = cx - rect.left - rect.width / 2;
      const y = rect.height / 2 - (cy - rect.top);
      const hz = live.current.horizontal;
      const a = hz ? x : y, c = hz ? y : x;
      if (Math.abs(c) > (hz ? st.ph : st.pw) / 2) return -1;
      const R = radius();
      for (let slot = 0; slot < st.slots; slot++) {
        const s = slotOffset(slot, st.scroll);
        if (Math.abs(s / R) > 1.3) continue;
        const half = (hz ? st.pw : st.ph) / 2;
        const lo = R * Math.sin((s - half) / R), hi = R * Math.sin((s + half) / R);
        if (a >= lo && a <= hi) return slot % total;
      }
      return -1;
    };

    const render = () => {
      const aspect = st.w / st.h;
      const f = 1 / Math.tan(FOV / 2);
      const distance = st.h / (2 * Math.tan(FOV / 2));
      const near = 1, far = distance * 4;
      const proj = new Float32Array(16);
      proj[0] = f / aspect; proj[5] = f; proj[10] = (far + near) / (near - far); proj[11] = -1; proj[14] = (2 * far * near) / (near - far);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(program);
      gl.uniformMatrix4fv(U.uProjection, false, proj);
      gl.uniform1f(U.uCamera, distance);
      gl.uniform2f(U.uPoster, st.pw, st.ph);
      gl.uniform1f(U.uSpacing, st.spacing);
      gl.uniform1f(U.uLoop, st.loop);
      gl.uniform1f(U.uScroll, st.scroll);
      gl.uniform1f(U.uDir, dir());
      gl.uniform1f(U.uHorizontal, live.current.horizontal ? 1 : 0);
      gl.uniform1f(U.uRadius, radius());
      gl.uniform1f(U.uLean, st.lean);
      gl.uniform1f(U.uBend, st.bend);
      gl.uniform2f(U.uCells, cols, rows);
      gl.uniform2f(U.uInset, 1 / cw, 1 / ch);
      gl.uniform1f(U.uReveal, st.reveal);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.bindVertexArray(vao);
      gl.drawElementsInstanced(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0, st.slots);
      gl.bindVertexArray(null);
    };

    const frame = (now: number) => {
      raf = 0;
      if (!alive || !visible) return;
      const s = live.current;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      if (dirty) upload();
      st.reveal = Math.min(1, st.reveal + dt / (reduce ? 0.01 : 0.7));
      if (s.focus != null) st.target = scrollFor(s.focus);
      else if (!reduce && s.speed && !document.hidden) st.target += s.speed * dt;
      const previous = st.scroll;
      st.scroll += (st.target - st.scroll) * (1 - Math.pow(1 - s.scrollEase, dt * 60));
      st.velocity += ((st.scroll - previous) / dt - st.velocity) * (1 - Math.exp(-dt * 8));
      const v = reduce ? 0 : st.velocity;
      st.lean += (clamp(-dir() * v * 0.00007, -0.22, 0.22) - st.lean) * (1 - Math.exp(-dt * 6));
      st.bend += (clamp(Math.abs(v) * 0.00003, 0, 0.06) - st.bend) * (1 - Math.exp(-dt * 6));
      render();
      // which poster sits in the middle
      let best = -1, bd = Infinity;
      for (let slot = 0; slot < st.slots; slot++) { const d = Math.abs(slotOffset(slot, st.scroll)); if (d < bd) { bd = d; best = slot % total; } }
      if (best !== st.center) { st.center = best; s.onCenter?.(best); }
      const busy = (s.speed !== 0 && s.focus == null && !reduce) || Math.abs(st.target - st.scroll) > 0.05 || Math.abs(st.lean) > 0.0005 || st.bend > 0.0005 || st.reveal < 1 || dirty;
      if (busy) raf = requestAnimationFrame(frame);
      else last = 0;
    };
    const wake = () => { if (raf || !alive || !visible) return; raf = requestAnimationFrame(frame); };
    wakeRef.current = wake;

    const onScroll = () => {
      const s = live.current;
      const y = window.scrollY;
      if (s.follow) st.target = scrollFor(s.follow());
      else if (s.pageScroll && s.focus == null) st.target += (y - st.pageY) * s.pageScroll;
      st.pageY = y;
      wake();
    };
    const down = { x: 0, y: 0, t: 0 };
    const onDown = (e: PointerEvent) => { down.x = e.clientX; down.y = e.clientY; down.t = performance.now(); };
    const onUp = (e: PointerEvent) => {
      const tap = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6 && performance.now() - down.t < 450;
      if (!tap) return;
      const i = posterAt(e.clientX, e.clientY);
      if (i >= 0) live.current.onItemClick?.(i);
    };
    const onMove = (e: PointerEvent) => { canvas.style.cursor = live.current.onItemClick && posterAt(e.clientX, e.clientY) >= 0 ? 'pointer' : 'default'; };

    const resize = () => {
      st.dpr = Math.min(window.devicePixelRatio || 1, 2);
      st.w = Math.max(1, root.clientWidth);
      st.h = Math.max(1, root.clientHeight);
      canvas.width = Math.round(st.w * st.dpr);
      canvas.height = Math.round(st.h * st.dpr);
      layout();
      if (live.current.follow) { st.target = scrollFor(live.current.follow()); st.scroll = st.target; }
      render();
      wake();
    };

    paint();
    const fontsReady = Promise.all([
      document.fonts.load('600 40px "Fraunces Variable"'),
      document.fonts.load('600 20px "Hanken Grotesk Variable"'),
    ]).catch(() => null);
    items.forEach((it, i) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => { if (!alive) return; images[i] = image; fontsReady.then(() => { if (alive) { paint(); wake(); } }); };
      image.src = it.image;
    });
    fontsReady.then(() => { if (alive) { paint(); wake(); } });

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointermove', onMove);
    window.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(resize);
    ro.observe(root);
    const io = new IntersectionObserver((entries) => {
      visible = entries.some((en) => en.isIntersecting);
      if (visible) { last = 0; wake(); }
    });
    io.observe(root);
    resize();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
      ro.disconnect();
      io.disconnect();
      gl.deleteTexture(texture);
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(indexBuffer);
      gl.deleteBuffer(posterBuffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
    // the item list is fixed for the life of the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horizontal]);

  useEffect(() => { wakeRef.current(); }, [focus]);

  return (
    <div ref={rootRef} className={'fp' + (className ? ' ' + className : '')} aria-hidden="true">
      <canvas ref={canvasRef} className="fp-canvas" />
    </div>
  );
}
