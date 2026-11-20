import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
const DIST="/home/claude/portfolio/dist";
const T={".html":"text/html",".js":"text/javascript",".css":"text/css",".woff2":"font/woff2",".jpg":"image/jpeg"};
const server=createServer((req,res)=>{const p=(req.url||"/").split("?")[0];let f=join(DIST,p==="/"?"index.html":p);if(!existsSync(f)||!extname(f))f=join(DIST,"index.html");res.writeHead(200,{"content-type":T[extname(f)]??"application/octet-stream","access-control-allow-origin":"*"});res.end(readFileSync(f));});
await new Promise(r=>server.listen(0,r));
const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const page=await b.newPage({viewport:{width:1440,height:900}});
await page.goto(`http://127.0.0.1:${server.address().port}/?blades=400`,{waitUntil:"load"});
await page.locator(".loader-enter:not(:disabled)").waitFor({timeout:240000});
await page.locator(".loader-enter").click({ force: true, timeout: 120000 });
await page.waitForTimeout(1800);
// walk to each act2 section so the reveals actually fire
for (const [id,name] of [["story","a2-story"],["record","a2-record"],["shelf","a2-shelf"],["workshop","a2-workshop"],["door","a2-door"]]) {
  await page.evaluate((id)=>{
    const el=document.getElementById(id);
    const y=el.getBoundingClientRect().top+window.scrollY- 60;
    if(window.__lenis) window.__lenis.scrollTo(y,{immediate:true,force:true}); else window.scrollTo(0,y);
  },id);
  await page.waitForTimeout(1300);
  await page.screenshot({path:`shots/${name}.png`});
}
console.log("done");
await b.close();server.close();
