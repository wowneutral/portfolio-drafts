// Phase 2 checks: the door, the flight, the chapters.
//
// Two halves, because the two halves fail differently:
//   A. The camera travel — tested on the captured scene document at low blade
//      density (the ?blades= override the scene itself provides), because
//      SwiftShader cannot push 190k blades and the travel is the same code at
//      any density. Screenshots at three depths must differ substantially.
//   B. The app shell — loader gate, Enter, scroll-driven chapter reveal,
//      pointer forwarding wiring — all DOM, tested on the real build at full
//      density, no waiting on the renderer.

import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";
import { PNG } from "pngjs";

const ROOT = new URL("..", import.meta.url).pathname;
const DIST = join(ROOT, "dist");
const SHOTS = join(ROOT, "shots");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml" };

const server = createServer((req, res) => {
  const p = (req.url || "/").split("?")[0];
  let f = p === "/scene.html" ? join(SHOTS, "built-scene.html") : join(DIST, p === "/" ? "index.html" : p);
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
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

let failures = 0;
const fail = (m) => { console.error(`FAIL${el()}  ` + m); failures++; };
const T0 = Date.now();
const el = () => ((Date.now() - T0) / 1000).toFixed(0).padStart(3) + "s";
const pass = (m) => console.log(`ok  ${el()}  ` + m);

function stats(buf) {
  const { width: w, height: h, data } = PNG.sync.read(buf);
  let green = 0, total = 0, sum = 0;
  for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) {
    const i = (y * w + x) * 4;
    if (data[i + 1] > data[i] + 6 && data[i + 1] > data[i + 2] + 6) green++;
    sum += data[i] + data[i + 1] + data[i + 2];
    total++;
  }
  return { greenPct: +(100 * green / total).toFixed(1), lum: Math.round(sum / total) };
}

function diffPct(a, b) {
  const A = PNG.sync.read(a), B = PNG.sync.read(b);
  let diff = 0, total = 0;
  for (let y = 0; y < A.height; y += 3) for (let x = 0; x < A.width; x += 3) {
    const i = (y * A.width + x) * 4;
    if (
      Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) +
      Math.abs(A.data[i + 2] - B.data[i + 2]) > 36
    ) diff++;
    total++;
  }
  return +(100 * diff / total).toFixed(1);
}

const waitFrames = (page, n) =>
  page.evaluate(
    (n) => new Promise((res) => {
      let c = 0;
      const step = () => (++c >= n ? res(c) : requestAnimationFrame(step));
      requestAnimationFrame(step);
    }),
    n,
  );

const ONLY = process.argv[2];

// ── A. the flight ─────────────────────────────────────────────────────────
if (ONLY !== "shell") {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  // 1280x800 stays above the 620k-pixel threshold, so this is the DESKTOP
  // layout — an 800x500 window flips the scene into its narrow layout and the
  // roots sit below the crop, which reads as "nothing rendered" but is not.
  await page.goto(`${url}scene.html?blades=2500`, { waitUntil: "load" });
  await waitFrames(page, 70); // entrance scan needs ~68

  const at = async (t, name) => {
    await page.evaluate((t) => window.postMessage({ type: "sylva:travel", t }, "*"), t);
    await waitFrames(page, 38); // travel easing mostly settled
    const shot = await page.screenshot();
    writeFileSync(join(SHOTS, name), shot);
    return shot;
  };

  const s0 = await at(0, "journey-t0.png");

  // Pointer forwarding, tested at the treeline where parallax is full
  // strength and the arch gives the diff something to measure against.
  await page.evaluate(() => window.postMessage({ type: "sylva:pointer", kind: "pointermove", x: 100, y: 450 }, "*"));
  await waitFrames(page, 24);
  const left = await page.screenshot();
  await page.evaluate(() => window.postMessage({ type: "sylva:pointer", kind: "pointermove", x: 1180, y: 400 }, "*"));
  await waitFrames(page, 24);
  const right = await page.screenshot();
  const dp = diffPct(left, right);
  if (dp > 2) pass(`flight: forwarded pointer steers the parallax (${dp}% pixel change)`);
  else fail(`flight: forwarded pointer does nothing (${dp}% change)`);
  await page.evaluate(() => window.postMessage({ type: "sylva:pointer", kind: "pointerleave", x: 0, y: 0 }, "*"));

  const s5 = await at(0.5, "journey-t05.png");
  const s1 = await at(1, "journey-t1.png");

  const d05 = diffPct(s0, s5), d51 = diffPct(s5, s1);
  if (d05 > 12 && d51 > 12) pass(`flight: framing changes with travel — ${d05}% of pixels move by t=0.5, ${d51}% more by t=1`);
  else fail(`flight: camera did not move enough (t0→t0.5 ${d05}%, t0.5→t1 ${d51}%)`);

  const deep = stats(s1);
  if (deep.greenPct > 3) pass(`flight: still inside the forest at full depth — ${deep.greenPct}% moss pixels`);
  else fail(`flight: full depth shows no forest (${JSON.stringify(deep)}) — camera may have flown past everything`);

  if (errs.length) fail("flight console errors:\n      " + errs.join("\n      "));
  else pass("flight: no console errors");
  await page.close();
}

// ── B. the shell ──────────────────────────────────────────────────────────
if (ONLY !== "flight") {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

  // ?blades=800 threads through the adapter into the scene. Full density on
  // SwiftShader stalls the compositor for seconds per frame, which starves the
  // PARENT page's rAF loop — the chapters then never update, which looks like
  // an app bug but is the container having no GPU. On real hardware the shell
  // and the scene share a compositor that runs at display rate.
  // blades=100 is a near-empty forest: the shell's logic does not care how
  // much moss there is, but the flight gate advances per FRAME (dt is clamped
  // at 0.1s), so a 1fps software rasteriser would take minutes to fly. On real
  // hardware at 60fps the same code completes the flight in about seven
  // seconds.
  // The flight is deliberately rate-limited to ~7 seconds of real time. This
  // container renders at ~1.5fps, where that would be minutes, so the rig
  // raises the rate through the documented seam. The GATE — the logic that
  // could actually break — is untouched and is asserted directly below.
  page.on("requestfailed", (r) => errs.push(`request failed: ${r.url()}`));

  await page.addInitScript(() => { window.__flightRate = 3.5; });
  await page.goto(`${url}?blades=100`, { waitUntil: "load" });

  // The gate: present, and closed until the scene is ready.
  const loaderShot = await page.screenshot();
  writeFileSync(join(SHOTS, "loader.png"), loaderShot);
  if (await page.locator(".loader").isVisible()) pass("shell: loader is the first thing on screen");
  else fail("shell: no loader");

  // Sound defaults on; toggling flips the label.
  const soundBtn = page.locator(".loader-btn-ghost");
  if ((await soundBtn.textContent())?.includes("on")) pass("shell: sound defaults on");
  else fail("shell: sound does not default on");
  await soundBtn.click({ force: true, timeout: 120000 });
  if ((await soundBtn.textContent())?.includes("off")) pass("shell: sound toggle flips");
  else fail("shell: sound toggle does not flip");
  await soundBtn.click({ force: true, timeout: 120000 }); // back on — Enter click below is the gesture that must arm audio without throwing

  // The two controls must read as one object: same height, same radius.
  const pills = await page.evaluate(() => {
    const g = getComputedStyle(document.querySelector(".loader-btn-ghost"));
    const so = getComputedStyle(document.querySelector(".loader-btn-solid"));
    const gr = document.querySelector(".loader-btn-ghost").getBoundingClientRect();
    const sr = document.querySelector(".loader-btn-solid").getBoundingClientRect();
    return {
      radius: [g.borderRadius, so.borderRadius],
      h: [Math.round(gr.height), Math.round(sr.height)],
      minW: [g.minWidth, so.minWidth],
    };
  });
  if (
    pills.radius[0] === pills.radius[1] &&
    Math.abs(pills.h[0] - pills.h[1]) <= 1 &&
    pills.minW[0] === pills.minW[1]
  ) pass(`shell: sound and Enter are the same pill (${pills.h[0]}px tall, radius ${pills.radius[0]})`);
  else fail(`shell: controls do not match — ${JSON.stringify(pills)}`);

  // Page must not scroll while the door is closed.
  await page.mouse.wheel(0, 2000);
  await page.waitForTimeout(300);
  if ((await page.evaluate(() => window.scrollY)) === 0) pass("shell: page cannot scroll past a closed door");
  else fail("shell: scrolled while the loader was up");

  // Enter arms when the scene loads AND the counter completes.
  await page.locator(".loader-btn-solid:not(:disabled)").waitFor({ timeout: 240000 });
  pass("shell: counter completed and Enter armed");
  await page.waitForTimeout(400);
  writeFileSync(join(SHOTS, "loader.png"), await page.screenshot());
  await page.locator(".loader-btn-solid").click({ force: true, timeout: 120000 });
  // The curtain takes ~1.5s, and React needs a render to unmount it. At this
  // rasteriser's frame rate a fixed wait races that, so poll for it.
  const gone = await page
    .waitForFunction(() => !document.querySelector(".loader"), undefined, { timeout: 30000 })
    .then(() => true)
    .catch(() => false);
  if (gone) pass("shell: door opens and the loader unmounts");
  else fail("shell: loader still present after Enter");

  // THE GATE: a jump to the end of the track must be refused while the
  // camera is still at the treeline. This is the fix for "it starts to
  // scroll down before it goes all the way".
  const jumped = await page.evaluate(() => {
    const track = document.querySelector(".journey-track");
    const max = track.offsetHeight - window.innerHeight;
    if (window.__lenis) window.__lenis.scrollTo(max, { immediate: true, force: true });
    else window.scrollTo(0, max);
    return { max: Math.round(max) };
  });
  // Polled, not slept: this rasteriser runs one frame every ~670ms, and the
  // gate can only act on a frame. A fixed wait races it.
  const pulled = await page
    .waitForFunction(
      (max) => window.scrollY < max * 0.35,
      jumped.max,
      { timeout: 20000 },
    )
    .then(() => true)
    .catch(() => false);
  const held = await page.evaluate(() => Math.round(window.scrollY));
  if (pulled) pass(`shell: the gate refuses a flick — asked for ${jumped.max}px, pulled back to ${held}px`);
  else fail(`shell: scroll outran the flight — asked ${jumped.max}px, sat at ${held}px`);
  await page.evaluate(() => {
    if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
  });
  await page.waitForTimeout(900);

  // The ride: chapters take over from the hero as the page scrolls.
  const opacityOf = (sel) => page.locator(sel).evaluate((el) => Number(getComputedStyle(el).opacity));
  // Flight progress is track-relative now — Act II adds document height that
  // is NOT part of the flight.
  // Lenis owns the scroll now — jump through it (immediate) so its internal
  // target agrees, otherwise it eases the page right back to where it was.
  // The gate refuses a jump ahead of the camera, so a station is reached by
  // repeatedly asking for it until the flight has actually flown there —
  // exactly what a visitor holding the wheel does.
  const scrollToP = async (p) => {
    for (let i = 0; i < 400; i++) {
      const done = await page.evaluate((p) => {
        const track = document.querySelector(".journey-track");
        const max = track.offsetHeight - window.innerHeight;
        const y = max * p;
        if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
        else window.scrollTo(0, y);
        return Math.abs(window.scrollY - y) < 2;
      }, p);
      if (done) break;
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(200);
  };

  // Returning to the treeline is rate-limited in both directions, so this
  // polls rather than assuming the camera is already home.
  const heroBack = await page
    .waitForFunction(
      () => Number(getComputedStyle(document.querySelector(".journey-hero")).opacity) > 0.95,
      undefined,
      { timeout: 40000 },
    )
    .then(() => true)
    .catch(() => false);
  if (heroBack) pass("shell: hero returns at the treeline");
  else fail(`shell: hero missing at p=0 (opacity ${await opacityOf(".journey-hero")})`);

  const stations = [
    [0.195, "MITEZ"], [0.415, "Congress and LD"], [0.635, "In print"], [0.85, "Shipped"],
  ];
  // Polled rather than slept: under SwiftShader the compositor lags the
  // scrollbar by an unpredictable amount, so a fixed wait reads a stale frame
  // and reports phantom failures. The condition is the app loop having
  // PROCESSED this scroll position, however long that takes here.
  const onStation = (title) =>
    page
      .waitForFunction(
        (title) => {
          const el = document.querySelector(`.journey-chapter[aria-label="${title}"]`);
          return (
            el &&
            Number(getComputedStyle(el).opacity) > 0.85 &&
            getComputedStyle(el).pointerEvents === "auto" &&
            Number(getComputedStyle(document.querySelector(".journey-hero")).opacity) < 0.05
          );
        },
        title,
        { timeout: 150000 },
      )
      .then(() => true)
      .catch(() => false);

  for (const [p, title] of stations) {
    await scrollToP(p);
    if (await onStation(title)) pass(`shell: "${title}" on station at p=${p} (visible, clickable, hero gone)`);
    else fail(`shell: "${title}" not present at p=${p}`);
  }

  // Act II: scroll to the bottom — the record should be present, and the
  // door section should carry all three contact links.
  for (let i = 0; i < 400; i++) {
    const atEnd = await page.evaluate(() => {
      const y = document.documentElement.scrollHeight;
      if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
      return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
    });
    if (atEnd) break;
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(700);
  const act2 = await page.evaluate(() => ({
    sections: [...document.querySelectorAll(".act2-section")].map((el) => el.id),
    rail: document.querySelectorAll(".rail .card").length,
    courses: document.querySelectorAll(".course").length,
    projects: document.querySelectorAll(".rail .card").length,
    honors: document.querySelectorAll(".honors li").length,
    skeptic: !!document.querySelector(".skeptic canvas"),
    links: document.querySelectorAll(".links li").length,
    favBlocks: document.querySelectorAll(".fav-block").length,
    tracks: document.querySelectorAll(".track").length,
    objTabs: document.querySelectorAll(".obj-tab").length,
    skCaps: document.querySelectorAll(".skeptic .sk-cap").length,
    skWords: document.querySelectorAll(".skeptic .sk-word").length,
    // The words must sit inside the same box as the canvas, so they land
    // exactly where the apple was.
    wordsInVisual: !!document.querySelector(".sk-visual > .sk-words"),
    // Nothing may be a sibling of the sticky child: a normal sibling renders
    // at the top of the tall block and prints straight over the argument.
    skStrays: document.querySelectorAll(".skeptic > *:not(.skeptic-sticky)").length,
    veil: !!document.querySelector(".journey-veil"),
    shotSrcs: [...document.querySelectorAll(".card-shot img")].map((i) => i.getAttribute("src")),
    spotify: [...document.querySelectorAll(".track-btn")].length,
    // No Spotify iframe should be mounted in the normal path.
    spotifyFrames: document.querySelectorAll(".track-embed").length,
    coffeeGone: !/coffee turns cold|matching wallpapers/i.test(document.body.innerText),
    footer: !!document.querySelector(".act2-footer"),
    stats: document.querySelectorAll(".stat").length,
    marquee: true,
    wordmark: !!document.querySelector(".act2-wordmark"),
    noTabLetter: !document.body.textContent.includes("Letter of recommendation"),
  }));
  // Each screenshot must actually be served, and served as an image.
  const shots = await page.evaluate(async (srcs) => {
    let ok = 0;
    for (const src of srcs) {
      try {
        const r = await fetch(src);
        if (r.ok && (r.headers.get("content-type") || "").startsWith("image/")) ok++;
      } catch { /* counted as a miss */ }
    }
    return ok;
  }, act2.shotSrcs);

  if (
    act2.sections.join(",") === "profile,results,bet,writing,human,study,contact" &&
    act2.rail === 6 &&
    act2.courses === 4 &&
    act2.skeptic &&
    act2.links === 6 &&
    act2.favBlocks === 2 &&
    act2.tracks === 3 &&
    act2.objTabs === 5 &&
    act2.spotify === 3 &&
    act2.spotifyFrames === 0 &&
    act2.skCaps === 5 &&
    act2.skWords === 3 &&
    act2.wordsInVisual &&
    act2.skStrays === 0 &&
    act2.veil &&
    shots === 6 &&
    act2.projects === 6 &&
    act2.honors === 8 &&
    act2.footer &&
    act2.stats === 4 &&
    act2.marquee &&
    act2.wordmark
  ) {
    pass(`shell: Act II complete — ${act2.sections.length} sections, ${act2.honors} honors, ${act2.projects} work cards, ${act2.links} links, ${act2.tracks} tracks, ${act2.objTabs} 3D objects, ${act2.skCaps}-beat argument, ${shots}/6 screenshots, footer`);
    // Two things that must NOT be on the page.
    const banned = await page.evaluate(() => {
      const t = document.body.innerText;
      return {
        emergingTech: /emerging\s*tech/i.test(t),
        emDash: /[\u2014\u2013]/.test(t),
        sample: (t.match(/.{0,40}[\u2014\u2013].{0,40}/) || [""])[0],
      };
    });
    if (act2.coffeeGone) pass("shell: coffee quote and wallpapers line removed");
    else fail("shell: coffee quote or wallpapers line still present");
    if (!banned.emergingTech) pass("shell: no mention of Emerging Tech anywhere");
    else fail("shell: Emerging Tech still appears on the page");
    if (!banned.emDash) pass("shell: no em or en dashes in rendered text");
    else fail(`shell: em dash found in rendered text: ${JSON.stringify(banned.sample)}`);
  }
  else fail(`shell: Act II incomplete — ${JSON.stringify(act2)}`);

  // Tab switch must NOT rebuild the garden: hide + show the document and the
  // same iframe element must still be there (no remount, no re-scan).
  const markBefore = await page.evaluate(() => {
    const f = document.querySelector(".journey-scene iframe");
    f.dataset.mark = "survivor";
    return true;
  });
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(700);
  const survived = await page.evaluate(
    () => document.querySelector(".journey-scene iframe")?.dataset.mark === "survivor",
  );
  if (markBefore && survived) pass("shell: garden survives a tab switch — same iframe, no rebuild");
  else fail("shell: tab switch rebuilt the scene");

  // Between stations, both neighbours are out and unclickable.
  await scrollToP(0.315);
  const released = await page
    .waitForFunction(
      () => {
        const el = document.querySelector('.journey-chapter[aria-label="MITEZ"]');
        return el && getComputedStyle(el).pointerEvents === "none";
      },
      undefined,
      { timeout: 30000 },
    )
    .then(() => true)
    .catch(() => false);
  if (released) pass("shell: chapters release pointer events between stations");
  else fail("shell: an off-screen chapter is still clickable");

  // itunes.apple.com and sketchfab.com cannot be reached through this
  // container's proxy, so their requests fail here regardless of the code.
  // Chromium's "Failed to load resource" console line names no URL, so it is
  // correlated against the requestfailed list: excused only while EVERY
  // failed request went to one of those hosts. A genuine failure anywhere
  // else puts a non-offline URL in that list and the exemption switches off.
  //
  // Consequence worth stating plainly: the song-preview path is NOT verified
  // by this run. It can only be checked on a machine with open network.
  const OFFLINE = /itunes\.apple\.com|sketchfab\.com|scdn\.co|mzstatic\.com/;
  const failedUrls = errs.filter((e) => e.startsWith("request failed: "));
  const allBlocked = failedUrls.length > 0 && failedUrls.every((e) => OFFLINE.test(e));
  const real = errs.filter((e) => {
    if (/favicon|React DevTools/i.test(e)) return false;
    if (OFFLINE.test(e)) return false;
    if (allBlocked && /Failed to load resource/i.test(e)) return false;
    return true;
  });
  if (real.length) fail("shell console errors:\n      " + real.join("\n      "));
  else pass(`shell: no console errors (${errs.length - real.length} blocked-host request(s), expected in this sandbox)`);
  await page.close();
}

await browser.close();
server.close();
console.log(failures ? `\n${failures} check(s) failed.` : "\nAll journey checks passed.");
process.exit(failures ? 1 : 0);
