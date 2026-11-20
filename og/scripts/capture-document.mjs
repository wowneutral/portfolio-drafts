// Pulls the exact scene document the adapter builds out of a running page and
// writes it to shots/built-scene.html.
//
// Why bother: the document only exists as a srcDoc string inside a sandboxed,
// opaque-origin iframe, so nothing can inspect it in place. Written to disk it
// becomes a real URL, which means (a) it can be diffed against the authored
// source to prove exactly what the adapter changed, and (b) it honours the
// scene's own ?blades= override, so the render can be exercised at a density a
// software rasteriser can actually finish.

import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DIST = join(ROOT, "dist");
const OUT = join(ROOT, "shots");
mkdirSync(OUT, { recursive: true });

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer((req, res) => {
  const p = (req.url || "/").split("?")[0];
  let f = join(DIST, p === "/" ? "index.html" : p);
  if (!existsSync(f) || !extname(f)) f = join(DIST, "index.html");
  res.writeHead(200, {
    "content-type": TYPES[extname(f)] ?? "application/octet-stream",
    "access-control-allow-origin": "*",
  });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, r));
const url = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: "load" });

let frame = null;
for (let i = 0; i < 40 && !frame; i++) {
  const f = page.frames().find((f) => f !== page.mainFrame());
  if (f && (await f.evaluate(() => !!document.getElementById("scene")).catch(() => false))) frame = f;
  else await page.waitForTimeout(500);
}
if (!frame) { console.error("no scene frame"); process.exit(1); }

const doc = await frame.evaluate(() => "<!DOCTYPE html>\n" + document.documentElement.outerHTML);
writeFileSync(join(OUT, "built-scene.html"), doc);
console.log(`built-scene.html written: ${Buffer.byteLength(doc)} bytes`);

// What did the adapter actually change? Answer it in facts, not adjectives.
const authored = readFileSync(
  join(ROOT, "src/shaders/sylva-living-world/sources/inner-green-3d.html"),
  "utf8",
);
const report = {
  authoredBytes: Buffer.byteLength(authored),
  builtBytes: Buffer.byteLength(doc),
  runtimeInlined: doc.includes("data-threeui-three-runtime"),
  remoteScriptTagGone: !doc.includes('src="inner-green-assets/three.min.js"'),
  sceneOnlyStyle: doc.includes("data-threeui-sylva-scene"),
  canvasPresent: /<canvas[^>]+id="scene"/.test(doc),
  // Everything the scene-only mode is supposed to have stripped.
  dockGone: !/class="dock"/.test(doc),
  cardsGone: !/card-ecostove\.jpg/.test(doc),
  liquidMetalGone: !/liquid-metal-(play|explore)\.html/.test(doc),
  headlineGone: !/Into the living world<\/h1>/.test(doc),
};
console.log(JSON.stringify(report, null, 2));
const bad = Object.entries(report).filter(([k, v]) => typeof v === "boolean" && !v);
if (bad.length) {
  console.error("adapter did not isolate cleanly: " + bad.map(([k]) => k).join(", "));
  process.exit(1);
}
await browser.close();
server.close();
