import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
const DIST="/home/claude/portfolio/dist";
const T={".html":"text/html",".js":"text/javascript",".css":"text/css",".woff2":"font/woff2",".mp3":"audio/mpeg",".png":"image/png",".jpg":"image/jpeg"};
const server=createServer((req,res)=>{const p=(req.url||"/").split("?")[0];let f=join(DIST,p==="/"?"index.html":p);if(!existsSync(f)||!extname(f))f=join(DIST,"index.html");res.writeHead(200,{"content-type":T[extname(f)]??"application/octet-stream","access-control-allow-origin":"*"});res.end(readFileSync(f));});
await new Promise(r=>server.listen(0,r));
const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const page=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
await page.addInitScript(()=>{window.__flightRate=6;window.__flightLead=6;});
await page.goto(`http://127.0.0.1:${server.address().port}/?blades=60`,{waitUntil:"load"});
await page.locator(".loader-btn-solid:not(:disabled)").waitFor({timeout:240000});
await page.locator(".loader-btn-solid").click({force:true,timeout:120000});
await page.waitForTimeout(2500);
const at=async(q,name)=>{
  for(let i=0;i<12;i++){
    await page.evaluate(q=>{const o=document.querySelector(".skeptic");
      const y=o.getBoundingClientRect().top+window.scrollY+(o.offsetHeight-window.innerHeight)*q;
      window.__lenis?window.__lenis.scrollTo(y,{immediate:true,force:true}):window.scrollTo(0,y);},q);
    await page.waitForTimeout(320);
  }
  await page.waitForTimeout(900);
  await page.screenshot({path:`shots/${name}.png`});
};
await at(0.08,"m-sk-a"); await at(0.55,"m-sk-b");
console.log("ok");
await b.close();server.close();
