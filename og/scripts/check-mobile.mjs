// The mobile pass.
//
// Checks the two things that actually break a phone layout and cannot be seen
// from a desktop window: horizontal overflow (which turns the whole page into
// a sideways-sliding mess) and elements that run off or overlap at 390px.
// Also walks every section and screenshots it, so the result can be looked at
// rather than only asserted.

import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DIST = join(ROOT, "dist");
const SHOTS = join(ROOT, "shots");
mkdirSync(SHOTS, { recursive: true });
const T = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css",
            ".woff2":"font/woff2", ".mp3":"audio/mpeg", ".png":"image/png", ".jpg":"image/jpeg" };

const server = createServer((req, res) => {
  const p = (req.url || "/").split("?")[0];
  let f = join(DIST, p === "/" ? "index.html" : p);
  if (!existsSync(f) || !extname(f)) f = join(DIST, "index.html");
  res.writeHead(200, { "content-type": T[extname(f)] ?? "application/octet-stream",
                       "access-control-allow-origin": "*" });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, r));
const url = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"],
});

let fails = 0;
const pass = (m) => console.log("ok    " + m);
const fail = (m) => { console.error("FAIL  " + m); fails++; };

const DEVICES = [
  { name: "iPhone SE", w: 375, h: 667, dsf: 2 },
  { name: "iPhone 14", w: 390, h: 844, dsf: 3 },
  { name: "iPad mini", w: 768, h: 1024, dsf: 2 },
];

for (const d of DEVICES) {
  const ctx = await browser.newContext({
    viewport: { width: d.w, height: d.h },
    deviceScaleFactor: d.dsf,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("requestfailed", (r) => errs.push(`request failed: ${r.url()}`));

  await page.addInitScript(() => { window.__flightRate = 6; window.__flightLead = 6; });
  await page.goto(`${url}?blades=60`, { waitUntil: "load" });
  await page.locator(".loader-btn-solid:not(:disabled)").waitFor({ timeout: 240000 });

  // The gate before the door: the loader must fit without scrolling.
  const loaderFits = await page.evaluate(() =>
    document.documentElement.scrollWidth <= window.innerWidth + 1);
  if (loaderFits) pass(`${d.name}: loader fits the viewport`);
  else fail(`${d.name}: loader overflows sideways`);
  if (d.w === 390) await page.screenshot({ path: join(SHOTS, "m-loader.png") });

  await page.locator(".loader-btn-solid").click({ force: true, timeout: 120000 });
  await page.waitForTimeout(2500);

  // Walk every section and check overflow at each stop, because a layout can
  // be fine at the top and burst open three sections down.
  const stops = ["#profile", "#skeptic", "#work", "#results", "#bet", "#writing", "#human", "#study", "#contact"];
  let worst = { over: 0, at: "top", els: [] };

  const overflowAt = async (label) => {
    const r = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const bad = [];
      for (const el of document.querySelectorAll("body *")) {
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.height === 0) continue;
        // Only elements that stick out to the RIGHT matter: those are what
        // create a horizontal scrollbar. The rail is exempt by design.
        if (b.right > vw + 2 && !el.closest(".rail") && !el.closest(".journey-scene")) {
          bad.push(`${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ")[0]} +${Math.round(b.right - vw)}px`);
        }
      }
      return { scrollW: document.documentElement.scrollWidth, vw, bad: bad.slice(0, 6) };
    });
    const over = r.scrollW - r.vw;
    if (over > worst.over) worst = { over, at: label, els: r.bad };
    return r;
  };

  await overflowAt("top");
  for (const sel of stops) {
    const ok = await page.evaluate((sel) => {
      const e = document.querySelector(sel);
      if (!e) return false;
      const y = e.getBoundingClientRect().top + window.scrollY;
      if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
      return true;
    }, sel);
    if (!ok) { fail(`${d.name}: section ${sel} missing`); continue; }
    await page.waitForTimeout(500);
    await overflowAt(sel);
    if (d.w === 390 && ["#skeptic", "#human", "#contact"].includes(sel)) {
      await page.screenshot({ path: join(SHOTS, `m${sel.replace("#", "-")}.png`) });
    }
  }

  if (worst.over <= 2) pass(`${d.name}: no horizontal overflow anywhere`);
  else fail(`${d.name}: page is ${worst.over}px too wide at ${worst.at} :: ${worst.els.join(", ") || "no single element"}`);

  // Tap targets. Judged only on STANDALONE controls: an inline link inside a
  // sentence is sized by its line height, and forcing it to 44px would wreck
  // the paragraph it lives in. Buttons and block-level links have no such
  // excuse.
  const small = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("button, a[href]")) {
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      const disp = getComputedStyle(el).display;
      const inlineInProse = disp === "inline" && !!el.closest("p, li, dd, span");
      if (inlineInProse) continue;
      if (b.height < 40) {
        out.push(`${el.tagName.toLowerCase()}.${(el.className||"").toString().split(" ")[0]} ${Math.round(b.height)}px`);
      }
    }
    return [...new Set(out)].slice(0, 8);
  });
  if (!small.length) pass(`${d.name}: every standalone control is at least 40px tall`);
  else fail(`${d.name}: controls too small to tap :: ${small.join(", ")}`);

  const OFFLINE = /itunes\.apple\.com|sketchfab\.com|scdn\.co|mzstatic\.com/;
  const failed = errs.filter((e) => e.startsWith("request failed: "));
  const allBlocked = failed.length > 0 && failed.every((e) => OFFLINE.test(e));
  const real = errs.filter((e) => {
    if (/favicon|DevTools/i.test(e)) return false;
    if (OFFLINE.test(e)) return false;
    if (allBlocked && /Failed to load resource/i.test(e)) return false;
    return true;
  });
  if (real.length) fail(`${d.name} console:\n      ` + real.join("\n      "));
  else pass(`${d.name}: no console errors`);

  await ctx.close();
}

await browser.close();
server.close();
console.log(fails ? `\n${fails} mobile check(s) failed.` : "\nMobile checks passed.");
process.exit(fails ? 1 : 0);
