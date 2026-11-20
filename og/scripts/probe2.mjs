import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
const DIST="/home/claude/portfolio/dist";
const T={".html":"text/html",".js":"text/javascript",".css":"text/css",".woff2":"font/woff2",".jpg":"image/jpeg",".mp3":"audio/mpeg"};
const server=createServer((req,res)=>{const p=(req.url||"/").split("?")[0];let f=join(DIST,p==="/"?"index.html":p);if(!existsSync(f)||!extname(f))f=join(DIST,"index.html");res.writeHead(200,{"content-type":T[extname(f)]??"application/octet-stream","access-control-allow-origin":"*"});res.end(readFileSync(f));});
await new Promise(r=>server.listen(0,r));
const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--autoplay-policy=no-user-gesture-required"]});
const page=await b.newPage({viewport:{width:1280,height:800}});
page.on("pageerror",e=>console.log("PAGEERR:",String(e)));
page.on("console",m=>{if(m.type()==="error")console.log("ERR:",m.text())});
await page.goto(`http://127.0.0.1:${server.address().port}/?blades=100`,{waitUntil:"load"});
await page.locator(".loader-btn-solid:not(:disabled)").waitFor({timeout:240000});
await page.locator(".loader-btn-solid").click({ force: true, timeout: 120000 });
await page.waitForTimeout(1800);
const t0=Date.now();
for (let i=0;i<40;i++){
  const st=await page.evaluate(()=>{
    const track=document.querySelector(".journey-track");
    const max=track.offsetHeight-window.innerHeight;
    const y=max*0.5;
    if(window.__lenis) window.__lenis.scrollTo(y,{immediate:true,force:true}); else window.scrollTo(0,y);
    return {want:Math.round(y), y:Math.round(window.scrollY), max:Math.round(max)};
  });
  if(i%8===0) console.log(`${((Date.now()-t0)/1000).toFixed(1)}s`, JSON.stringify(st));
  await page.waitForTimeout(250);
}
// measure real fps of the parent page
const fps=await page.evaluate(()=>new Promise(r=>{let n=0;const t=performance.now();const s=()=>{n++;performance.now()-t<2000?requestAnimationFrame(s):r(n/2)};requestAnimationFrame(s)}));
console.log("parent fps:",fps.toFixed(1));
await b.close();server.close();
