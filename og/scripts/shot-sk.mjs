import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
const DIST="/home/claude/portfolio/dist";
const T={".html":"text/html",".js":"text/javascript",".css":"text/css",".woff2":"font/woff2",".jpg":"image/jpeg",".mp3":"audio/mpeg",".png":"image/png"};
const server=createServer((req,res)=>{const p=(req.url||"/").split("?")[0];let f=join(DIST,p==="/"?"index.html":p);if(!existsSync(f)||!extname(f))f=join(DIST,"index.html");res.writeHead(200,{"content-type":T[extname(f)]??"application/octet-stream"});res.end(readFileSync(f));});
await new Promise(r=>server.listen(0,r));
const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const page=await b.newPage({viewport:{width:1440,height:900}});
await page.addInitScript(()=>{window.__flightRate=6;window.__flightLead=6;});
await page.goto(`http://127.0.0.1:${server.address().port}/?blades=60`,{waitUntil:"load"});
await page.locator(".loader-btn-solid:not(:disabled)").waitFor({timeout:240000});
await page.locator(".loader-btn-solid").click({force:true,timeout:120000});
await page.waitForTimeout(2500);
// Converge on a fresh target each pass: positions shift as Act II lays out.
const at=async(q,name)=>{
  for(let i=0;i<10;i++){
    const moved=await page.evaluate(q=>{
      const o=document.querySelector(".skeptic");
      const span=Math.max(1,o.offsetHeight-window.innerHeight);
      const target=o.getBoundingClientRect().top+window.scrollY+span*q;
      const before=window.scrollY;
      window.__lenis?window.__lenis.scrollTo(target,{immediate:true,force:true}):window.scrollTo(0,target);
      return Math.abs(before-target)>2;
    },q);
    await page.waitForTimeout(420);
    if(!moved) break;
  }
  await page.waitForTimeout(900);
  await page.screenshot({path:`shots/${name}.png`});
  console.log(name,"bg",await page.evaluate(()=>getComputedStyle(document.querySelector(".skeptic")).backgroundColor));
};
await at(0.10,"sk-1"); await at(0.32,"sk-2"); await at(0.55,"sk-3"); await at(0.95,"sk-4");
await b.close();server.close();
