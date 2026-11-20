import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
const DIST="/home/claude/portfolio/dist";
const server=createServer((req,res)=>{const p=(req.url||"/").split("?")[0];let f=join(DIST,p==="/"?"index.html":p);if(!existsSync(f)||!extname(f))f=join(DIST,"index.html");res.writeHead(200,{"content-type":{".html":"text/html",".js":"text/javascript",".css":"text/css",".woff2":"font/woff2",".jpg":"image/jpeg"}[extname(f)]??"application/octet-stream","access-control-allow-origin":"*"});res.end(readFileSync(f));});
await new Promise(r=>server.listen(0,r));
const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const page=await b.newPage({viewport:{width:1440,height:900}});
page.on("console",m=>{if(m.type()==="error")console.log("ERR:",m.text())});
page.on("pageerror",e=>console.log("PAGEERR:",String(e)));
await page.goto(`http://127.0.0.1:${server.address().port}/?blades=2500`,{waitUntil:"load"});
await page.locator(".loader-enter:not(:disabled)").waitFor({timeout:120000});
await page.locator(".loader-enter").click();
await page.waitForTimeout(1700);
await page.waitForTimeout(400);
await page.screenshot({path:"shots/site-hero.png"});
const shots=[[0.215,"site-mitez.png"],[0.405,"site-debate.png"],[0.96,"site-contact.png"]];
for (const [p,name] of shots) {
  await page.evaluate(p=>{const max=document.documentElement.scrollHeight-window.innerHeight;window.scrollTo(0,max*p);},p);
  await page.waitForFunction(()=>{
    const els=[...document.querySelectorAll(".journey-chapter")];
    return els.some(el=>Number(getComputedStyle(el).opacity)>0.95);
  },undefined,{timeout:60000}).catch(()=>{});
  // let the camera easing settle too
  await page.evaluate(()=>new Promise(r=>{let c=0;const s=()=>(++c>=40?r(1):requestAnimationFrame(s));requestAnimationFrame(s)}));
  await page.screenshot({path:"shots/"+name});
  console.log("shot",name);
}
await b.close();server.close();
