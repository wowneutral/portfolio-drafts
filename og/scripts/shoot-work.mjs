// Screenshots of the live projects, for the work cards.
import { chromium } from "playwright";
const SITES = [
  ["mitez",      "https://mitez.org"],
  ["rogue",      "https://clauderogue.netlify.app"],
  ["lastseen",   "https://byrafi.netlify.app"],
  ["lastsearch", "https://lastsearch.netlify.app"],
  ["spread",     "https://wowneutral.github.io/spread/"],
];
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"],
});
for (const [name, url] of SITES) {
  const page = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  try {
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(6500);
    await page.screenshot({ path: `public/work/${name}.png` });
    console.log("ok  ", name, url);
  } catch (e) {
    console.log("FAIL", name, String(e).split("\n")[0].slice(0, 90));
  }
  await page.close();
}
await b.close();
