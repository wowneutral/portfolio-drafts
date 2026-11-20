import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
const DIST = "/home/claude/portfolio/dist/";
const T = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css" };
const server = createServer((req,res)=>{
  const p=(req.url||"/").split("?")[0];
  let f=join(DIST,p==="/"?"index.html":p);
  if(!existsSync(f)) f=join(DIST,"index.html");
  res.writeHead(200,{"content-type":T[extname(f)]??"application/octet-stream"});
  res.end(readFileSync(f));
});
await new Promise(r=>server.listen(0,r));
const url=`http://127.0.0.1:${server.address().port}/`;
const b = await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]});
const p = await b.newPage({viewport:{width:1440,height:900}});
await p.goto(url,{waitUntil:"load"});
await p.waitForTimeout(20000);
await p.screenshot({path:"/home/claude/shots/sylva-desktop.png"});
console.log("shot taken");
await b.close(); server.close();
