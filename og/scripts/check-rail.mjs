// The horizontal act, and the audio assets.
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";
const ROOT="/home/claude/portfolio", DIST=join(ROOT,"dist");
const T={".html":"text/html",".js":"text/javascript",".css":"text/css",".woff2":"font/woff2",".jpg":"image/jpeg",".mp3":"audio/mpeg"};
const server=createServer((req,res)=>{const p=(req.url||"/").split("?")[0];let f=join(DIST,p==="/"?"index.html":p);if(!existsSync(f)||!extname(f))f=join(DIST,"index.html");res.writeHead(200,{"content-type":T[extname(f)]??"application/octet-stream","access-control-allow-origin":"*"});res.end(readFileSync(f));});
await new Promise(r=>server.listen(0,r));
const url=`http://127.0.0.1:${server.address().port}/`;
const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
let fails=0; const pass=m=>console.log("ok    "+m); const fail=m=>{console.error("FAIL  "+m);fails++};
const page=await b.newPage({viewport:{width:1440,height:900}});
const errs=[]; page.on("pageerror",e=>errs.push(String(e)));
page.on("console",m=>{const t=m.text(); if(t.startsWith("[dbg]"))console.log("   ",t); else if(m.type()==="error")errs.push(t)});
const failed=[]; page.on("requestfailed",r=>failed.push(r.url()));
const audio=[]; page.on("response",r=>{if(r.url().includes("/audio/")) audio.push([r.url().split("/").pop(), r.status()])});

// This file tests the RAIL, not the gate (check-journey.mjs asserts the gate
// directly). On a 1.5fps software rasteriser the real gate needs ~22s of
// flight before Act II is even reachable, so it is opened here.
await page.addInitScript(()=>{ window.__flightRate = 6; window.__flightLead = 6; });
await page.goto(`${url}?blades=100`,{waitUntil:"load"});
await page.locator(".loader-btn-solid:not(:disabled)").waitFor({timeout:240000});
await page.locator(".loader-btn-solid").click({ force: true, timeout: 120000 });
await page.waitForTimeout(2500);
// audio: both pieces must be served, and the intro must actually be playing
if (audio.some(a=>a[0]==="intro.mp3" && a[1]<400)) pass(`audio: intro.mp3 served (${audio.map(a=>a.join(":")).join(", ")})`);
else fail(`audio: intro.mp3 not fetched — saw ${JSON.stringify(audio)}`);

// Fly to the end. The ask and the READ must be separate calls: reading
// scrollY in the same evaluate that sets it always returns the value just
// written, so the loop would "finish" the flight instantly without flying it.
for(let i=0;i<400;i++){
  await page.evaluate(()=>{
    const t=document.querySelector(".journey-track");
    const max=t.offsetHeight-window.innerHeight;
    window.__lenis? window.__lenis.scrollTo(max,{immediate:true,force:true}) : window.scrollTo(0,max);
  });
  await page.waitForTimeout(90);
  const done=await page.evaluate(()=>{
    const t=document.querySelector(".journey-track");
    return window.scrollY >= t.offsetHeight-window.innerHeight-2;
  });
  if(done) break;
}
await page.waitForTimeout(600);
if (audio.some(a=>a[0]==="theme.mp3" && a[1]<400)) pass("audio: theme.mp3 served for the crossfade");
else fail(`audio: theme.mp3 never fetched — ${JSON.stringify(audio)}`);

// the rail: sample translateX at three points through its own scroll span
// Re-measure and re-target until the scroll actually settles. The rail's
// document position moves after the first scroll (sections above it finish
// laying out), so a target computed once goes stale and the sample lands at
// the wrong fraction. Converging on a freshly measured target each pass is
// what makes this stable.
const at = async (q,name) => {
  for (let i=0;i<16;i++){
    const moved = await page.evaluate((q)=>{
      const o=document.querySelector(".rail-outer");
      const span=Math.max(1,o.offsetHeight-window.innerHeight);
      const top=o.getBoundingClientRect().top+window.scrollY;
      const target=top+span*q;
      const before=window.scrollY;
      window.__lenis? window.__lenis.scrollTo(target,{immediate:true,force:true}) : window.scrollTo(0,target);
      return Math.abs(before-target)>2;
    },q);
    await page.waitForTimeout(420);
    if(!moved) break;
  }
  await page.waitForFunction(()=>{
    const el=document.querySelector(".rail-sticky");
    return el && Math.abs(el.getBoundingClientRect().top)<=2;
  },undefined,{timeout:20000}).catch(()=>{});
  await page.waitForTimeout(600);
  const st = await page.evaluate(()=>{
    const r=document.querySelector(".rail");
    const m=new DOMMatrixReadOnly(getComputedStyle(r).transform);
    const fill=document.querySelector(".rail-fill");
    const o=document.querySelector(".rail-outer");
    return { x: Math.round(m.m41),
             fill: new DOMMatrixReadOnly(getComputedStyle(fill).transform).a.toFixed(2),
             sticky: Math.round(document.querySelector(".rail-sticky").getBoundingClientRect().top),
             rp: +(((window.scrollY-(o.getBoundingClientRect().top+window.scrollY))/(o.offsetHeight-window.innerHeight))).toFixed(2) };
  });
  if(name) writeFileSync(join(ROOT,"shots",name), await page.screenshot());
  return st;
};
const a=await at(0,"rail-0.png"), m=await at(0.5,"rail-mid.png"), z=await at(1,"rail-end.png");
console.log("  rail samples:", JSON.stringify([a,m,z]));
if (a.x===0 && m.x < -200 && z.x < m.x - 200) pass(`rail: travels sideways — x ${a.x} → ${m.x} → ${z.x}px`);
else fail(`rail: did not travel — ${JSON.stringify([a.x,m.x,z.x])}`);
if (Math.abs(a.sticky)<=3 && Math.abs(m.sticky)<=3) pass("rail: viewport stays pinned while it travels");
else fail(`rail: sticky broke — tops ${a.sticky}, ${m.sticky}`);
if (Number(z.fill)>0.95) pass(`rail: progress bar completes (scaleX ${z.fill})`);
else fail(`rail: progress bar at ${z.fill} at the end`);

// Same exemption as check-journey: these hosts are unreachable through this
// container's proxy, so their requests fail here whatever the code does.
const OFFLINE=/itunes\.apple\.com|sketchfab\.com|scdn\.co|mzstatic\.com/;
const allBlocked = failed.length>0 && failed.every(u=>OFFLINE.test(u));
const real=[...errs, ...failed.map(u=>"request failed: "+u)].filter(e=>{
  if(/favicon|DevTools/i.test(e)) return false;
  if(OFFLINE.test(e)) return false;
  if(allBlocked && /Failed to load resource/i.test(e)) return false;
  return true;
});
if(real.length) fail("console/network:\n      "+real.join("\n      "));
else pass(`no console or network errors (${failed.length} blocked-host request(s), expected)`);
await b.close(); server.close();
console.log(fails?`\n${fails} failed.`:"\nRail and audio checks passed.");
process.exit(fails?1:0);
