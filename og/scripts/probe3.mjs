import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
const DIST="/home/claude/portfolio/dist";
const T={".html":"text/html",".js":"text/javascript",".css":"text/css",".woff2":"font/woff2",".jpg":"image/jpeg",".mp3":"audio/mpeg"};
const server=createServer((req,res)=>{const p=(req.url||"/").split("?")[0];let f=join(DIST,p==="/"?"index.html":p);if(!existsSync(f)||!extname(f))f=join(DIST,"index.html");res.writeHead(200,{"content-type":T[extname(f)]??"application/octet-stream","access-control-allow-origin":"*"});res.end(readFileSync(f));});
await new Promise(r=>server.listen(0,r));
const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const page=await b.newPage({viewport:{width:1440,height:900}});
page.on("pageerror",e=>console.log("PAGEERR:",String(e).slice(0,200)));
page.on("console",m=>{const t=m.text(); if(m.type()==="error"||t.startsWith("[dbg]")) console.log(m.type(),t.slice(0,200))});
await page.addInitScript(()=>{ window.__flightRate = 3.5; });
await page.goto(`http://127.0.0.1:${server.address().port}/?blades=100`,{waitUntil:"load"});
await page.locator(".loader-btn-solid:not(:disabled)").waitFor({timeout:240000});
await page.locator(".loader-btn-solid").click({ force: true, timeout: 120000 });
await page.waitForTimeout(2000);
console.log("lenis?", await page.evaluate(()=>!!window.__lenis), "rate", await page.evaluate(()=>window.__flightRate));
await page.evaluate(()=>{
  const track=document.querySelector(".journey-track");
  const max=track.offsetHeight-window.innerHeight;
  window.__lenis ? window.__lenis.scrollTo(max,{immediate:true,force:true}) : window.scrollTo(0,max);
});
for (let i=0;i<10;i++){
  await page.waitForTimeout(500);
  const st = await page.evaluate(()=>{
    const track=document.querySelector(".journey-track");
    return { y: Math.round(window.scrollY), max: Math.round(track.offsetHeight-window.innerHeight),
             heroOp: getComputedStyle(document.querySelector(".journey-hero")).opacity,
             ch0: getComputedStyle(document.querySelector('.journey-chapter[aria-label="MITEZ"]')).opacity };
  });
  console.log(i, JSON.stringify(st));
}
await b.close();server.close();
