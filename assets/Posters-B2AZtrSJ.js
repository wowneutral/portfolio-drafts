import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{n as t,t as n}from"./jsx-runtime-C3cWAN_r.js";var r=e(t(),1),i=n(),a=`#version 300 es
in vec2 aPosition;
in vec2 aPoster;
uniform mat4 uProjection;
uniform float uCamera;
uniform vec2 uPoster;
uniform float uSpacing;
uniform float uLoop;
uniform float uScroll;
uniform float uDir;
uniform float uHorizontal;
uniform float uRadius;
uniform float uLean;
uniform float uBend;
out vec2 vUv;
out float vItem;
out float vVis;

void main() {
  // slot order runs down the column (or right along the band), so a rising scroll brings the next poster in
  float s = uDir * (mod(uLoop - (aPoster.x + 0.5) * uSpacing + uScroll, uLoop) - uLoop * 0.5);
  vec2 p = aPosition * uPoster;
  bool hz = uHorizontal > 0.5;
  float la = hz ? p.x : p.y;
  float c = hz ? p.y : p.x;
  float halfC = 0.5 * (hz ? uPoster.y : uPoster.x);
  float a = la + s;
  // the column is a slow drum: posters flatten in the middle and roll away at the ends
  float th = a / uRadius;
  float along = uRadius * sin(th);
  float z = uRadius * (cos(th) - 1.0);
  // with speed the paper catches the air: a low belly across, and a lean back
  float k = c / halfC;
  z += uBend * halfC * (1.0 - k * k);
  z += uLean * la;
  vec3 world = hz ? vec3(along, c, z) : vec3(c, along, z);
  gl_Position = uProjection * vec4(world.xy, world.z - uCamera, 1.0);
  vUv = aPosition + 0.5;
  vItem = aPoster.y;
  vVis = 1.0 - smoothstep(1.25, 1.45, abs(th));
}`,o=`#version 300 es
precision highp float;
uniform sampler2D uAtlas;
uniform vec2 uCells;
uniform vec2 uInset;
uniform float uReveal;
in vec2 vUv;
in float vItem;
in float vVis;
out vec4 outColor;

void main() {
  vec2 cell = vec2(mod(vItem, uCells.x), floor(vItem / uCells.x));
  vec2 local = vec2(vUv.x, 1.0 - vUv.y);
  vec4 sampled = texture(uAtlas, (cell + uInset + local * (1.0 - 2.0 * uInset)) / uCells);
  float alpha = sampled.a * uReveal * vVis;
  if (alpha < 0.002) discard;
  outColor = vec4(sampled.rgb * alpha, alpha);
}`,s=.7,c=45*Math.PI/180,l=24,u=`#fbfaf7`,d=`#141414`,f=`#5a3fc0`,p=(e,t,n)=>Math.min(n,Math.max(t,e)),m=(e,t,n)=>{let r=e.createShader(t);return r?(e.shaderSource(r,n),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS)?r:(e.deleteShader(r),null)):null};function h(e,t,n,r,i,a,o){let s=a*.075;e.fillStyle=u,e.fillRect(r,i,a,o),e.textBaseline=`alphabetic`,e.fillStyle=f,e.font=`600 ${a*.05}px "Hanken Grotesk Variable", sans-serif`,e.textAlign=`left`,e.fillText(t.n,r+s,i+s+a*.04),e.fillStyle=d,e.textAlign=`right`,e.fillText(t.kind.toUpperCase(),r+a-s,i+s+a*.04);let c=i+s+a*.085,l=a-2*s,p=t.cert?o-(c-i)-s-a*.24:l/1.12;if(n&&n.naturalWidth){if(t.cert){let t=Math.min(l/n.naturalWidth,p/n.naturalHeight),i=n.naturalWidth*t,o=n.naturalHeight*t;e.drawImage(n,r+(a-i)/2,c+(p-o)/2,i,o)}else{let t=l/p,i=n.naturalWidth,a=n.naturalHeight;i/a>t?i=a*t:a=i/t,e.drawImage(n,0,0,i,a,r+s,c,l,p)}}else e.fillStyle=`#e6e2d9`,e.fillRect(r+s,c,l,p);e.fillStyle=d,e.textAlign=`left`;let m=a*.2;e.font=`600 ${m}px "Fraunces Variable", serif`;let h=e.measureText(t.name).width;h>l&&(m*=l/h,e.font=`600 ${m}px "Fraunces Variable", serif`),e.fillText(t.name,r+s-m*.03,i+o-s-a*.02),e.fillStyle=d,e.fillRect(r+s,i+o-s-a*.02-m*.95-a*.03,l,Math.max(1,a*.004))}function g({items:e,fit:t=.8,horizontal:n=!1,speed:u=0,pageScroll:d=0,focus:f=null,follow:g,scrollEase:_=.06,onItemClick:v,onCenter:y,className:b}){let x=(0,r.useRef)(null),S=(0,r.useRef)(null),C=(0,r.useRef)({speed:u,pageScroll:d,focus:f,follow:g,scrollEase:_,onItemClick:v,onCenter:y,fit:t,horizontal:n});C.current={speed:u,pageScroll:d,focus:f,follow:g,scrollEase:_,onItemClick:v,onCenter:y,fit:t,horizontal:n};let w=(0,r.useRef)(()=>{});return(0,r.useEffect)(()=>{let t=x.current,n=S.current,r=n?.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!0});if(!t||!n||!r)return;let i=m(r,r.VERTEX_SHADER,a),u=m(r,r.FRAGMENT_SHADER,o),d=r.createProgram();if(!i||!u||!d||(r.attachShader(d,i),r.attachShader(d,u),r.linkProgram(d),!r.getProgramParameter(d,r.LINK_STATUS)))return;r.useProgram(d);let f={};for(let e of[`uProjection`,`uCamera`,`uPoster`,`uSpacing`,`uLoop`,`uScroll`,`uDir`,`uHorizontal`,`uRadius`,`uLean`,`uBend`,`uAtlas`,`uCells`,`uInset`,`uReveal`])f[e]=r.getUniformLocation(d,e);let g=[],_=[];for(let e=0;e<=l;e++)for(let t=0;t<=l;t++)g.push(t/l-.5,e/l-.5);for(let e=0;e<l;e++)for(let t=0;t<l;t++){let n=e*25+t;_.push(n+l+1,n,n+l+2,n,n+1,n+l+2)}let v=r.createVertexArray();r.bindVertexArray(v);let y=r.createBuffer();r.bindBuffer(r.ARRAY_BUFFER,y),r.bufferData(r.ARRAY_BUFFER,new Float32Array(g),r.STATIC_DRAW);let b=r.getAttribLocation(d,`aPosition`);r.enableVertexAttribArray(b),r.vertexAttribPointer(b,2,r.FLOAT,!1,0,0);let T=r.createBuffer();r.bindBuffer(r.ELEMENT_ARRAY_BUFFER,T),r.bufferData(r.ELEMENT_ARRAY_BUFFER,new Uint16Array(_),r.STATIC_DRAW);let E=r.createBuffer();r.bindBuffer(r.ARRAY_BUFFER,E);let D=r.getAttribLocation(d,`aPoster`);r.enableVertexAttribArray(D),r.vertexAttribPointer(D,2,r.FLOAT,!1,0,0),r.vertexAttribDivisor(D,1),r.bindVertexArray(null);let O=r.createTexture();r.activeTexture(r.TEXTURE0),r.bindTexture(r.TEXTURE_2D,O),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_S,r.CLAMP_TO_EDGE),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_T,r.CLAMP_TO_EDGE),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MIN_FILTER,r.LINEAR),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MAG_FILTER,r.LINEAR),r.texImage2D(r.TEXTURE_2D,0,r.RGBA,1,1,0,r.RGBA,r.UNSIGNED_BYTE,new Uint8Array([0,0,0,0])),r.uniform1i(f.uAtlas,0);let k=e.length,A=Math.ceil(Math.sqrt(k)),j=Math.ceil(k/A),M=Math.round(600/s),N=document.createElement(`canvas`);N.width=A*600,N.height=j*M;let P=e.map(()=>null),F=!1,I=()=>{let t=N.getContext(`2d`);t&&(e.forEach((e,n)=>h(t,e,P[n],n%A*600,Math.floor(n/A)*M,600,M)),F=!0)},ee=()=>{F=!1,r.activeTexture(r.TEXTURE0),r.bindTexture(r.TEXTURE_2D,O),r.texImage2D(r.TEXTURE_2D,0,r.RGBA,r.RGBA,r.UNSIGNED_BYTE,N)},L=window.matchMedia?.(`(prefers-reduced-motion: reduce)`).matches??!1,R={w:1,h:1,dpr:1,pw:1,ph:1,spacing:1,slots:k,loop:1,scroll:0,target:0,velocity:0,lean:0,bend:0,reveal:0,pageY:window.scrollY,center:-1,loaded:0},z=0,B=0,V=!0,H=!0,U=()=>C.current.horizontal?-1:1,te=()=>{let e=C.current,t=e.horizontal?R.h:R.w,n=e.horizontal?R.w:R.h;e.horizontal?(R.ph=t*e.fit,R.pw=R.ph*s):(R.pw=t*e.fit,R.ph=R.pw/s);let i=e.horizontal?R.pw:R.ph;R.spacing=i+(e.horizontal?i*.12:Math.max(40,i*.1));let a=Math.ceil((n*1.6+i*2)/R.spacing);R.slots=k*Math.max(1,Math.ceil(a/k)),R.loop=R.slots*R.spacing;let o=new Float32Array(R.slots*2);for(let e=0;e<R.slots;e++)o.set([e,e%k],e*2);r.bindBuffer(r.ARRAY_BUFFER,E),r.bufferData(r.ARRAY_BUFFER,o,r.STATIC_DRAW)},W=(e,t)=>{let n=R.loop-(e+.5)*R.spacing+t;return U()*((n%R.loop+R.loop)%R.loop-R.loop/2)},G=e=>{let t=(e+.5)*R.spacing-R.loop/2;return t+R.loop*Math.round((R.target-t)/R.loop)},K=()=>(C.current.horizontal?R.w:R.h)*1.15,q=(e,t)=>{let r=n.getBoundingClientRect(),i=e-r.left-r.width/2,a=r.height/2-(t-r.top),o=C.current.horizontal,s=o?i:a;if(Math.abs(o?a:i)>(o?R.ph:R.pw)/2)return-1;let c=K();for(let e=0;e<R.slots;e++){let t=W(e,R.scroll);if(Math.abs(t/c)>1.3)continue;let n=(o?R.pw:R.ph)/2,r=c*Math.sin((t-n)/c),i=c*Math.sin((t+n)/c);if(s>=r&&s<=i)return e%k}return-1},J=()=>{let e=R.w/R.h,t=1/Math.tan(c/2),i=R.h/(2*Math.tan(c/2)),a=i*4,o=new Float32Array(16);o[0]=t/e,o[5]=t,o[10]=(a+1)/(1-a),o[11]=-1,o[14]=2*a*1/(1-a),r.viewport(0,0,n.width,n.height),r.clearColor(0,0,0,0),r.clear(r.COLOR_BUFFER_BIT),r.disable(r.DEPTH_TEST),r.enable(r.BLEND),r.blendFunc(r.ONE,r.ONE_MINUS_SRC_ALPHA),r.useProgram(d),r.uniformMatrix4fv(f.uProjection,!1,o),r.uniform1f(f.uCamera,i),r.uniform2f(f.uPoster,R.pw,R.ph),r.uniform1f(f.uSpacing,R.spacing),r.uniform1f(f.uLoop,R.loop),r.uniform1f(f.uScroll,R.scroll),r.uniform1f(f.uDir,U()),r.uniform1f(f.uHorizontal,+!!C.current.horizontal),r.uniform1f(f.uRadius,K()),r.uniform1f(f.uLean,R.lean),r.uniform1f(f.uBend,R.bend),r.uniform2f(f.uCells,A,j),r.uniform2f(f.uInset,1/600,1/M),r.uniform1f(f.uReveal,R.reveal),r.activeTexture(r.TEXTURE0),r.bindTexture(r.TEXTURE_2D,O),r.bindVertexArray(v),r.drawElementsInstanced(r.TRIANGLES,_.length,r.UNSIGNED_SHORT,0,R.slots),r.bindVertexArray(null)},Y=e=>{if(z=0,!H||!V)return;let t=C.current,n=B?Math.min(.05,(e-B)/1e3):1/60;B=e,F&&ee(),R.reveal=Math.min(1,R.reveal+n/(L?.01:.7)),t.focus==null?!L&&t.speed&&!document.hidden&&(R.target+=t.speed*n):R.target=G(t.focus);let r=R.scroll;R.scroll+=(R.target-R.scroll)*(1-(1-t.scrollEase)**(n*60)),R.velocity+=((R.scroll-r)/n-R.velocity)*(1-Math.exp(-n*8));let i=L?0:R.velocity;R.lean+=(p(-U()*i*7e-5,-.22,.22)-R.lean)*(1-Math.exp(-n*6)),R.bend+=(p(Math.abs(i)*3e-5,0,.06)-R.bend)*(1-Math.exp(-n*6)),J();let a=-1,o=1/0;for(let e=0;e<R.slots;e++){let t=Math.abs(W(e,R.scroll));t<o&&(o=t,a=e%k)}a!==R.center&&(R.center=a,t.onCenter?.(a)),t.speed!==0&&t.focus==null&&!L||Math.abs(R.target-R.scroll)>.05||Math.abs(R.lean)>5e-4||R.bend>5e-4||R.reveal<1||F?z=requestAnimationFrame(Y):B=0},X=()=>{!z&&H&&V&&(z=requestAnimationFrame(Y))};w.current=X;let Z=()=>{let e=C.current,t=window.scrollY;e.follow?R.target=G(e.follow()):e.pageScroll&&e.focus==null&&(R.target+=(t-R.pageY)*e.pageScroll),R.pageY=t,X()},Q={x:0,y:0,t:0},$=e=>{Q.x=e.clientX,Q.y=e.clientY,Q.t=performance.now()},ne=e=>{if(!(Math.hypot(e.clientX-Q.x,e.clientY-Q.y)<6&&performance.now()-Q.t<450))return;let t=q(e.clientX,e.clientY);t>=0&&C.current.onItemClick?.(t)},re=e=>{n.style.cursor=C.current.onItemClick&&q(e.clientX,e.clientY)>=0?`pointer`:`default`},ie=()=>{R.dpr=Math.min(window.devicePixelRatio||1,2),R.w=Math.max(1,t.clientWidth),R.h=Math.max(1,t.clientHeight),n.width=Math.round(R.w*R.dpr),n.height=Math.round(R.h*R.dpr),te(),C.current.follow&&(R.target=G(C.current.follow()),R.scroll=R.target),J(),X()};I();let ae=Promise.all([document.fonts.load(`600 40px "Fraunces Variable"`),document.fonts.load(`600 20px "Hanken Grotesk Variable"`)]).catch(()=>null);e.forEach((e,t)=>{let n=new Image;n.decoding=`async`,n.onload=()=>{H&&(P[t]=n,ae.then(()=>{H&&(I(),X())}))},n.src=e.image}),ae.then(()=>{H&&(I(),X())}),n.addEventListener(`pointerdown`,$),n.addEventListener(`pointerup`,ne),n.addEventListener(`pointermove`,re),window.addEventListener(`scroll`,Z,{passive:!0});let oe=new ResizeObserver(ie);oe.observe(t);let se=new IntersectionObserver(e=>{V=e.some(e=>e.isIntersecting),V&&(B=0,X())});return se.observe(t),ie(),()=>{H=!1,cancelAnimationFrame(z),n.removeEventListener(`pointerdown`,$),n.removeEventListener(`pointerup`,ne),n.removeEventListener(`pointermove`,re),window.removeEventListener(`scroll`,Z),oe.disconnect(),se.disconnect(),r.deleteTexture(O),r.deleteBuffer(y),r.deleteBuffer(T),r.deleteBuffer(E),r.deleteVertexArray(v),r.deleteProgram(d),r.deleteShader(i),r.deleteShader(u)}},[n]),(0,r.useEffect)(()=>{w.current()},[f]),(0,i.jsx)(`div`,{ref:x,className:`fp`+(b?` `+b:``),"aria-hidden":`true`,children:(0,i.jsx)(`canvas`,{ref:S,className:`fp-canvas`})})}export{g as default};