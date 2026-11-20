// The social preview card: a real frame of the site, not a mockup.
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
const DIST="/home/claude/portfolio/dist";
const T={".html":"text/html",".js":"text/javascript",".css":"text/css",".woff2":"font/woff2",".mp3":"audio/mpeg",".png":"image/png",".jpg":"image/jpeg"};
const server=createServer((req,res)=>{const p=(req.url||"/").split("?")[0];let f=join(DIST,p==="/"?"index.html":p);if(!existsSync(f)||!extname(f))f=join(DIST,"index.html");res.writeHead(200,{"content-type":T[extname(f)]??"application/octet-stream","access-control-allow-origin":"*"});res.end(readFileSync(f));});
await new Promise(r=>server.listen(0,r));
const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]});
const page=await b.newPage({viewport:{width:1200,height:630}});
await page.goto(`http://127.0.0.1:${server.address().port}/?blades=9000`,{waitUntil:"load"});
await page.locator(".loader-btn-solid:not(:disabled)").waitFor({timeout:240000});
await page.locator(".loader-btn-solid").click({force:true,timeout:120000});
// Let the scene finish its entrance scan, then the hero settle.
await page.evaluate(()=>new Promise(r=>{let n=0;const s=()=>(++n>=110?r(1):requestAnimationFrame(s));requestAnimationFrame(s)}));
await page.waitForTimeout(2500);
await page.screenshot({path:"public/og.png"});
console.log("captured");
await b.close();server.close();
