// Does the scene actually draw, and do its lifecycle paths behave?
//
// THREE THINGS THIS FILE LEARNED THE HARD WAY, all worth keeping written down.
//
// 1. Do not readPixels the scene's canvas. The renderer runs with the default
//    preserveDrawingBuffer:false, so a readPixels landing outside the scene's
//    own rAF gets a buffer the compositor has already taken, and comes back
//    cleared. It reports a perfectly flat canvas over a scene that is
//    rendering correctly. Screenshot instead: that is what a visitor sees.
//
// 2. Do not wait in seconds. The entrance is a survey pulse over SCAN_DUR =
//    3.4 authored seconds advanced by dt clamped to 0.05 per frame, so it
//    needs ~68 FRAMES however slow the renderer is — and until it lands,
//    every blade beyond the scan radius is discarded in the fragment shader.
//    Waiting 20 wall-clock seconds on a software rasteriser samples a nearly
//    empty frame and looks exactly like a broken scene. Wait on frames.
//
// 3. Do not render 190,000 blades under SwiftShader. It runs at well under
//    1fps, so the ~68 frames the entrance needs take minutes per case. The
//    scene has an authored ?blades= override, but srcDoc has no query string,
//    so the document is captured to a file first (capture-document.mjs) and
//    driven from there. Density is the ONE thing dialled down; every shader,
//    material, uniform and code path is the same.
//
// Nothing here is a frame-rate measurement. There is no GPU in this container.

import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { PNG } from "pngjs";

const ROOT = new URL("..", import.meta.url).pathname;
const DIST = join(ROOT, "dist");
const SHOTS = join(ROOT, "shots");
mkdirSync(SHOTS, { recursive: true });
const saveShot = (buf, name) => writeFileSync(join(SHOTS, name), buf);

const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".woff2": "font/woff2", ".svg": "image/svg+xml",
};

// Serves dist/ at the root and the captured scene document at /scene.html,
// with the font reachable from both, mirroring public/_headers so the harness
// runs under the same CORS conditions as the deployed site.
function serve(dir, extra = {}) {
  const server = createServer((req, res) => {
    const p = (req.url || "/").split("?")[0];
    let f = extra[p] ?? join(dir, p === "/" ? "index.html" : p);
    if (!existsSync(f) || !extname(f)) f = join(dir, "index.html");
    res.writeHead(200, {
      "content-type": TYPES[extname(f)] ?? "application/octet-stream",
      "access-control-allow-origin": "*",
    });
    res.end(readFileSync(f));
  });
  return new Promise((r) => server.listen(0, () => r({ server, port: server.address().port })));
}

const { server, port } = await serve(DIST, {
  "/scene.html": join(SHOTS, "built-scene.html"),
});
const url = `http://127.0.0.1:${port}/`;

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

let failures = 0;
const fail = (m) => { console.error("FAIL  " + m); failures++; };
const pass = (m) => console.log("ok    " + m);

function analyse(buffer) {
  const { width: w, height: h, data } = PNG.sync.read(buffer);
  const seen = new Set();
  let green = 0, total = 0;
  for (let y = 0; y < h; y += 4) {
    for (let x = 0; x < w; x += 4) {
      const i = (y * w + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      seen.add((r >> 3) + "," + (g >> 3) + "," + (b >> 3));
      if (g > r + 6 && g > b + 6) green++;   // moss leads green; the fog does not
      total++;
    }
  }
  return { w, h, distinct: seen.size, greenPct: +(100 * green / total).toFixed(1) };
}

async function waitFrames(target, n, budgetMs = 240000) {
  return target.evaluate(
    ([n, budget]) =>
      new Promise((resolve) => {
        let count = 0;
        const t0 = performance.now();
        const step = () => {
          count++;
          if (count >= n || performance.now() - t0 > budget) {
            resolve({ frames: count, ms: Math.round(performance.now() - t0) });
          } else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }),
    [n, budgetMs],
  );
}

async function sceneFrame(page, tries = 40) {
  for (let i = 0; i < tries; i++) {
    const f = page.frames().find((f) => f !== page.mainFrame());
    if (f && (await f.evaluate(() => !!document.getElementById("scene")).catch(() => false))) return f;
    await page.waitForTimeout(400);
  }
  return null;
}

const BLADES = 9000;         // ~5% of authored density; finishes in seconds
const SETTLED = 100;         // entrance needs ~68 frames, this leaves the tail

// ============================================ the scene renders (low density)
for (const c of [
  { name: "desktop", vp: { width: 1440, height: 900 }, shot: "scene-desktop.png" },
  { name: "mobile", vp: { width: 390, height: 844 }, dsf: 3, mobile: true, shot: "scene-mobile.png" },
]) {
  const ctx = await browser.newContext({
    viewport: c.vp, deviceScaleFactor: c.dsf, isMobile: c.mobile, hasTouch: c.mobile,
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

  await page.goto(`${url}scene.html?blades=${BLADES}`, { waitUntil: "load" });
  const t = await waitFrames(page, SETTLED);
  const shot = await page.screenshot();
  saveShot(shot, c.shot);
  const a = analyse(shot);

  if (a.distinct < 200) fail(`${c.name}: image is flat — ${a.distinct} distinct colours`);
  else pass(`${c.name}: rendered — ${a.distinct} distinct colours, ${a.greenPct}% moss pixels, ${t.frames} frames in ${t.ms}ms`);
  if (a.greenPct < 3) fail(`${c.name}: no moss field — ${a.greenPct}% green-leading pixels`);

  const backing = await page.evaluate(() => {
    const el = document.getElementById("scene");
    return { w: el.width, cssW: el.clientWidth, dpr: window.devicePixelRatio };
  });
  if (c.mobile) {
    const expected = Math.round(backing.cssW * Math.min(backing.dpr, 1.6));
    if (backing.w <= expected + 2)
      pass(`mobile: pixel ratio capped — backing ${backing.w}px for ${backing.cssW}css at dpr ${backing.dpr} (uncapped would be ${backing.cssW * backing.dpr})`);
    else fail(`mobile: pixel ratio NOT capped — backing ${backing.w}px, expected <= ${expected}`);
  }

  const real = errs.filter((e) => !/favicon|React DevTools/i.test(e));
  if (real.length) fail(`${c.name} console errors:\n      ` + real.join("\n      "));
  else pass(`${c.name}: no console errors`);
  await ctx.close();
}

// ================================================== reduced motion, in the app
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(`${url}scene.html?blades=${BLADES}`, { waitUntil: "load" });
  await page.waitForTimeout(8000);
  const b1 = await page.screenshot();
  saveShot(b1, "scene-reduced.png");
  const a = analyse(b1);
  if (a.distinct < 200 || a.greenPct < 3) fail(`reduced motion: still frame did not draw — ${JSON.stringify(a)}`);
  else pass(`reduced motion: authored still frame drawn — ${a.distinct} colours, ${a.greenPct}% moss`);
  await page.waitForTimeout(2500);
  const b2 = await page.screenshot();
  if (Buffer.compare(b1, b2) === 0) pass("reduced motion: frame is static (two shots 2.5s apart are byte-identical)");
  else fail("reduced motion: the scene is still animating under prefers-reduced-motion");
  await ctx.close();
}

// ================================================ the app mounts and tears down
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("requestfailed", (r) => errs.push(`request failed: ${r.url()} — ${r.failure()?.errorText}`));

  await page.goto(url, { waitUntil: "load" });
  const frame = await sceneFrame(page);
  if (!frame) fail("app: scene iframe never appeared");
  else {
    pass("app: scene chunk loaded and iframe mounted");
    const sandbox = await page.evaluate(() => {
      const f = document.querySelector("iframe");
      return { sandbox: f.getAttribute("sandbox"), hasSrc: f.hasAttribute("src"), srcdoc: !!f.srcdoc };
    });
    if (sandbox.sandbox === "allow-scripts" && sandbox.srcdoc && !sandbox.hasSrc)
      pass("app: iframe is srcDoc under sandbox=allow-scripts — opaque origin, no same-origin reach, no network of its own");
    else fail(`app: iframe is not sandboxed as expected — ${JSON.stringify(sandbox)}`);

    const before = page.frames().length;
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(1200);
    const after = page.frames().length;
    if (after < before)
      pass(`app: iframe torn down on tab hide (${before} -> ${after} frames) — the GL context, every buffer and all blades go with it`);
    else fail(`app: iframe survived tab hide (${before} -> ${after})`);

    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { value: false, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    if (await sceneFrame(page, 20)) pass("app: scene remounts when the tab returns");
    else fail("app: scene did not come back");
  }

  const real = errs.filter((e) => !/favicon|React DevTools/i.test(e));
  if (real.length) fail("app console/network errors:\n      " + real.join("\n      "));
  else pass("app: no console or network errors");
  await ctx.close();
}

await browser.close();
server.close();
console.log(failures ? `\n${failures} check(s) failed.` : "\nAll scene checks passed.");
process.exit(failures ? 1 : 0);
