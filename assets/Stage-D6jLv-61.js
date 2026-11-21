import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{n as t,t as n}from"./jsx-runtime-C3cWAN_r.js";import{Dr as r,U as i,Yt as a,ar as o,do as s,ea as c,io as l,jr as u,no as d,ro as f,ta as p}from"./three.core-BF58tRDi.js";import{c as m,t as h,u as g}from"./react-three-fiber.esm-DL1a9zZf.js";import{t as _}from"./ContactShadows-bYYzfokB.js";import{t as v}from"./Environment-CukB7wz4.js";import{t as y}from"./Lightformer-V5j-9NH1.js";import{t as b}from"./Gltf-DwyL6eX4.js";import{n as x,t as S}from"./store-C-RpCxLp.js";var C=e(t(),1),w=n(),T=`./study/apple.glb`,E=`#5b6b52`,D={open:{pos:[0,.085,.36],tgt:[0,.04,0],fov:30,cx:.28},about:{pos:[.17,.03,.19],tgt:[0,.045,0],fov:30,cx:.27},debate:{pos:[.04,.36,.1],tgt:[0,.03,0],fov:30,cx:.28},work:{pos:[-.2,.75,2.1],tgt:[0,.04,0],fov:20,cx:.105},research:{pos:[-.27,.09,.2],tgt:[0,.042,0],fov:28,cx:.28},today:{pos:[0,.05,.3],tgt:[0,.04,0],fov:30,cx:.28},record:{pos:[.24,.17,.25],tgt:[0,.035,0],fov:28,cx:.28},contact:{pos:[0,.46,.002],tgt:[0,.03,0],fov:30,cx:.28}},O=`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,k=`
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
`,A=`
  uniform sampler2D prev; uniform float decay; uniform float aspect; uniform float radius;
  uniform vec4 segs[8]; uniform int count;
  varying vec2 vUv;
  ${k}
  float seg(vec2 p, vec2 a, vec2 b){ vec2 pa = p-a, ba = b-a; float h = clamp(dot(pa,ba)/max(dot(ba,ba),1e-6), 0.0, 1.0); return length(pa - ba*h); }
  void main(){
    float m = max(texture2D(prev, vUv).r - decay, 0.0);
    vec2 p = vec2(vUv.x * aspect, vUv.y);
    float add = 0.0;
    for (int i = 0; i < 8; i++) {
      if (i >= count) break;
      vec4 s = segs[i];
      float d = seg(p, vec2(s.x*aspect, s.y), vec2(s.z*aspect, s.w));
      add = max(add, smoothstep(radius, radius*0.25, d));
    }
    // Bristle streaks: the rag drags unevenly.
    float bristle = 0.55 + 0.45 * vnoise(p * vec2(26.0, 90.0));
    m = clamp(max(m, add * (0.55 + 0.6 * bristle)), 0.0, 1.0);
    gl_FragColor = vec4(m, m, m, 1.0);
  }
`,j=`
  uniform sampler2D inputBuffer; uniform vec2 texelSize; uniform float radius; uniform int sectorCount; uniform float aspect;
  varying vec2 vUv;
  ${k}
  vec3 src(vec2 uv){ return sqrt(max(texture2D(inputBuffer, uv).rgb, 0.0) / (1.0 + max(texture2D(inputBuffer, uv).rgb, 0.0))); }
  float luma(vec2 uv){ return dot(src(uv), vec3(0.299, 0.587, 0.114)); }
  vec3 structureTensor(vec2 uv){
    vec2 d = texelSize * max(1.0, radius * 0.5);
    float tl = luma(uv + vec2(-d.x, d.y)); float tc = luma(uv + vec2(0.0, d.y)); float tr = luma(uv + d);
    float ml = luma(uv - vec2(d.x, 0.0)); float mr = luma(uv + vec2(d.x, 0.0));
    float bl = luma(uv - d); float bc = luma(uv - vec2(0.0, d.y)); float br = luma(uv + vec2(d.x, -d.y));
    float gx = (tr + 2.0*mr + br) - (tl + 2.0*ml + bl);
    float gy = (tl + 2.0*tc + tr) - (bl + 2.0*bc + br);
    return vec3(gx*gx, gy*gy, gx*gy);
  }
  void main(){
    vec2 uv = vUv;
    vec3 stt = structureTensor(uv);
    float diff = stt.x - stt.y;
    float root = sqrt(diff*diff + 4.0*stt.z*stt.z);
    float anisotropy = root / (stt.x + stt.y + 1e-7);
    float phi = 0.5 * atan(2.0*stt.z, diff + 1e-7);
    float c = cos(phi), s = sin(phi);
    mat2 transform = mat2(c, s, -s, c) * mat2(1.0/(1.0+anisotropy), 0.0, 0.0, 1.0+anisotropy);
    int count = clamp(sectorCount, 2, 8);
    float sectorAngle = 6.28318531 / float(count);
    vec3 center = src(uv);
    vec3 colorSum = vec3(0.0); float weightSum = 0.0;
    for (int i = 0; i < 8; i++) {
      if (i >= count) break;
      vec3 sum = center; vec3 sumSq = center*center; float n = 1.0;
      for (float r = 1.0; r <= 8.0; r += 1.0) {
        if (r > radius) break;
        for (int k = 0; k < 3; k++) {
          float a = (float(i) + (float(k) + 0.5) / 3.0) * sectorAngle;
          vec2 offset = transform * (vec2(cos(a), sin(a)) * r) * texelSize;
          vec3 col = src(uv + offset);
          sum += col; sumSq += col*col; n += 1.0;
        }
      }
      vec3 mean = sum / n;
      vec3 variance = abs(sumSq / n - mean*mean);
      float weight = 1.0 / (1.0 + pow(255.0 * sqrt(variance.r + variance.g + variance.b), 4.0));
      colorSum += mean * weight; weightSum += weight;
    }
    vec3 g = colorSum / weightSum;
    // brush marks: streaks laid along the form (the tensor's direction), loose and diagonal where the ground is flat
    float ang = mix(0.75, phi + 1.5708, clamp(anisotropy * 3.0, 0.0, 1.0));
    vec2 q = vec2(uv.x * aspect, uv.y);
    q = mat2(cos(ang), sin(ang), -sin(ang), cos(ang)) * q;
    float marks = vnoise(q * vec2(34.0, 150.0)) * 0.65 + vnoise(q * vec2(9.0, 38.0)) * 0.35;
    g *= 1.0 + (marks - 0.5) * 0.11;
    // back to the linear scale the composite expects
    vec3 l = g*g; l = l / max(1.0 - l, 1e-3);
    gl_FragColor = vec4(l, 1.0);
  }
`,M=`
  uniform sampler2D clean; uniform sampler2D paint; uniform sampler2D mask; uniform float swap; uniform float force; uniform float aspect; uniform vec2 px;
  varying vec2 vUv;
  ${k}
  void main(){
    float m = texture2D(mask, vUv).r;
    float n = vnoise(vec2(vUv.x*aspect, vUv.y) * 70.0) * 0.6 + vnoise(vec2(vUv.x*aspect, vUv.y) * 9.0) * 0.4;
    float w = smoothstep(0.18, 0.75, m + (n - 0.5) * 0.35);
    float photo = force >= 0.0 ? force : abs(swap - w);
    // impasto: light the paint's own relief so the strokes read as oil, not blur
    vec3 p0 = texture2D(paint, vUv).rgb;
    float l0 = dot(p0 / (1.0 + p0), vec3(0.299, 0.587, 0.114));
    vec3 pxx = texture2D(paint, vUv + vec2(px.x, 0.0)).rgb, pyy = texture2D(paint, vUv + vec2(0.0, px.y)).rgb;
    float lx = dot(pxx / (1.0 + pxx), vec3(0.299, 0.587, 0.114)), ly = dot(pyy / (1.0 + pyy), vec3(0.299, 0.587, 0.114));
    vec3 nrm = normalize(vec3((l0 - lx) * 16.0, (l0 - ly) * 16.0, 1.0));
    float relief = dot(nrm, normalize(vec3(-0.45, 0.55, 0.7))) - 0.7;
    float weave = vnoise(vUv * vec2(aspect, 1.0) * 420.0) - 0.5;
    vec3 painted = p0 * (1.0 + relief * 0.7 + weave * 0.04);
    vec3 col = mix(painted, texture2D(clean, vUv).rgb, photo);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;function N(){let{scene:e}=b(T,!1,!1);return(0,w.jsx)(`primitive`,{object:e,"rotation-y":.8})}function P(){let{gl:e,scene:t,camera:n,size:h,viewport:_}=g(),v=n,y=(0,C.useMemo)(()=>{let t=(e,t,n={})=>new s(e,t,{type:a,depthBuffer:!1,...n}),n=t(512,512),f=t(512,512),m=t(2,2,{depthBuffer:!0,samples:4}),h=t(2,2),g=new c,_=new r(-1,1,1,-1,0,1),v=new o(new u(2,2));v.frustumCulled=!1,g.add(v);let y=Array.from({length:8},()=>new l),b=new p({vertexShader:O,fragmentShader:A,uniforms:{prev:{value:null},decay:{value:0},aspect:{value:1},radius:{value:.07},segs:{value:y},count:{value:0}},depthTest:!1,depthWrite:!1,toneMapped:!1}),x=new p({vertexShader:O,fragmentShader:j,uniforms:{inputBuffer:{value:null},texelSize:{value:new d},radius:{value:8},sectorCount:{value:5},aspect:{value:1}},depthTest:!1,depthWrite:!1,toneMapped:!1}),S=new p({vertexShader:O,fragmentShader:M,uniforms:{clean:{value:null},paint:{value:null},mask:{value:null},swap:{value:0},force:{value:-1},aspect:{value:1},px:{value:new d}},depthTest:!1,depthWrite:!1}),C=e.getRenderTarget(),w=e.getClearColor(new i),T=e.getClearAlpha();return e.setRenderTarget(n),e.setClearColor(0,1),e.clear(),e.setRenderTarget(f),e.clear(),e.setRenderTarget(C),e.setClearColor(w,T),{maskA:n,maskB:f,sceneRT:m,halfRT:h,qs:g,qc:_,quad:v,segs:y,mask:b,kuwa:x,comp:S,cur:n,nxt:f,w:0,h:0}},[e]);(0,C.useEffect)(()=>()=>{[y.maskA,y.maskB,y.sceneRT,y.halfRT].forEach(e=>e.dispose()),[y.mask,y.kuwa,y.comp].forEach(e=>e.dispose())},[y]);let b=(0,C.useRef)({pos:new f(...D.open.pos),tgt:new f(...D.open.tgt),fov:30,cx:.28,cy:.5,swap:0,idle:0,frames:0,auto:-1,last:`open`,v:new f});return m((n,r)=>{let i=Math.min(r,.1),a=n.clock.elapsedTime,o=b.current,s=D[x.stop],c=h.width,l=h.height,u=x.phone,d=new f(...s.pos);u&&d.sub(new f(...s.tgt)).multiplyScalar(x.stop===`work`?.55:1.9).add(new f(...s.tgt));let p=o.pos.x+o.pos.y+o.pos.z+o.cx+o.cy+o.swap+o.fov;o.pos.x+=(d.x-o.pos.x)*(1-Math.exp(-2.4*i)),o.pos.y+=(d.y-o.pos.y)*(1-Math.exp(-2.4*i)),o.pos.z+=(d.z-o.pos.z)*(1-Math.exp(-2.4*i)),o.tgt.lerp(new f(...s.tgt),1-Math.exp(-2.4*i)),o.fov+=(s.fov-o.fov)*(1-Math.exp(-2.4*i));let m=u?.5:s.cx;o.cx+=(m-o.cx)*(1-Math.exp(-2.4*i)),o.cy=u?x.cy:o.cy+(.5-o.cy)*(1-Math.exp(-2.4*i)),o.swap+=(x.swap-o.swap)*(1-Math.exp(-3*i));let g=Math.abs(p-(o.pos.x+o.pos.y+o.pos.z+o.cx+o.cy+o.swap+o.fov))>1e-6;if(v.position.copy(o.pos),v.fov=o.fov,v.up.set(0,1,0),v.lookAt(o.tgt),v.setViewOffset(c,l,(.5-o.cx)*c,(.5-o.cy)*l,c,l),v.updateProjectionMatrix(),x.stop!==o.last&&(o.last=x.stop,x.autoAt>=0&&(o.auto=a+.5)),x.autoAt===-2&&(x.autoAt=-1,o.auto=a),o.auto>0&&a>=o.auto){let e=(a-o.auto)/.95,t=o.v.set(0,.04,0).project(v),n=t.x*.5+.5,r=t.y*.5+.5,i=l/c*(u?.34:.16),s=e=>1-(1-Math.min(1,e))**3,d=s(Math.max(0,e-.05)),f=s(e),p=e=>n+(e-.5)*i*2.2,m=e=>r+.06*Math.sin(e*Math.PI*1.3)-.03;S(p(d),m(d),p(f),m(f)),x.lastPaint=a,e>=1&&(o.auto=-1)}let _=x.segs.splice(0,8);_.length&&(x.lastPaint=a);let C=e.getPixelRatio(),w=Math.max(2,Math.floor(c*C)),T=Math.max(2,Math.floor(l*C)),E=w!==y.w||T!==y.h;E&&(y.w=w,y.h=T,y.sceneRT.setSize(w,T),y.halfRT.setSize(Math.ceil(w/2),Math.ceil(T/2)));let O=a-x.lastPaint<3.2||x.keep&&_.length>0;if(!g&&!O&&!E&&a>8&&x.force<0)return;o.frames++,y.segs.forEach((e,t)=>{let n=_[t];n&&e.set(n[0],n[1],n[2],n[3])}),y.mask.uniforms.prev.value=y.cur.texture,y.mask.uniforms.decay.value=x.keep?0:i*.42,y.mask.uniforms.aspect.value=c/l,y.mask.uniforms.radius.value=u?.06:.075,y.mask.uniforms.count.value=_.length,y.quad.material=y.mask,e.setRenderTarget(y.nxt),e.render(y.qs,y.qc),[y.cur,y.nxt]=[y.nxt,y.cur],e.setRenderTarget(y.sceneRT),e.render(t,v),y.kuwa.uniforms.inputBuffer.value=y.sceneRT.texture;let k=u?1.15:1.9;y.kuwa.uniforms.texelSize.value.set(k/y.halfRT.width,k/y.halfRT.height),y.kuwa.uniforms.aspect.value=c/l,y.quad.material=y.kuwa,e.setRenderTarget(y.halfRT),e.render(y.qs,y.qc),y.comp.uniforms.clean.value=y.sceneRT.texture,y.comp.uniforms.paint.value=y.halfRT.texture,y.comp.uniforms.mask.value=y.cur.texture,y.comp.uniforms.swap.value=o.swap,y.comp.uniforms.force.value=x.force,y.comp.uniforms.aspect.value=c/l,y.comp.uniforms.px.value.set(1/y.halfRT.width,1/y.halfRT.height),y.quad.material=y.comp,e.setRenderTarget(null),e.render(y.qs,y.qc),x.ready||(x.ready=!0,document.documentElement.dataset.studyReady=`1`,x.autoAt!==-1&&(o.auto=a+1.4))},1),null}function F(){let{gl:e}=g();return(0,C.useEffect)(()=>{let t=e.domElement,n=null,r=null,i=!1,a=e=>[e.clientX/window.innerWidth,1-e.clientY/window.innerHeight],o=e=>{let t=a(e);if(e.pointerType!==`mouse`){if(!r)return;if(!i){let t=Math.abs(e.clientX-r[0]),n=Math.abs(e.clientY-r[1]);if(t>8&&t>n*1.2)i=!0;else return}}n&&S(n[0],n[1],t[0],t[1]),n=t},s=e=>{r=[e.clientX,e.clientY],i=!1,n=e.pointerType===`mouse`?n:a(e)},c=()=>{r=null,i=!1,n=null},l=e=>{e.pointerType===`mouse`&&(n=null)};return t.addEventListener(`pointermove`,o),t.addEventListener(`pointerdown`,s),t.addEventListener(`pointerup`,c),t.addEventListener(`pointercancel`,c),t.addEventListener(`pointerleave`,l),()=>{t.removeEventListener(`pointermove`,o),t.removeEventListener(`pointerdown`,s),t.removeEventListener(`pointerup`,c),t.removeEventListener(`pointercancel`,c),t.removeEventListener(`pointerleave`,l)}},[e]),null}function I(){return(0,w.jsxs)(h,{className:`canvas`,dpr:[1,1.5],gl:{antialias:!1,powerPreference:`high-performance`},camera:{position:D.open.pos,fov:30,near:.01,far:10},onCreated:({gl:e})=>{e.toneMapping=4},children:[(0,w.jsx)(`color`,{attach:`background`,args:[E]}),(0,w.jsx)(`ambientLight`,{intensity:.45*Math.PI}),(0,w.jsx)(`directionalLight`,{position:[-.5,1,.6],intensity:Math.PI}),(0,w.jsxs)(C.Suspense,{fallback:null,children:[(0,w.jsxs)(v,{resolution:256,background:!1,children:[(0,w.jsx)(y,{form:`rect`,intensity:3.2,position:[-1.6,1.8,1.4],scale:[2.2,1.6,1],target:[0,0,0]}),(0,w.jsx)(y,{form:`rect`,intensity:1.4,position:[1.8,.9,-1.4],scale:[1.2,2,1],target:[0,0,0]}),(0,w.jsx)(y,{form:`rect`,intensity:.6,color:`#c9d4b8`,position:[0,-1.2,0],"rotation-x":Math.PI/2,scale:[4,4,1]}),(0,w.jsx)(y,{form:`circle`,intensity:2,position:[.6,2.2,1.2],scale:.6,target:[0,0,0]})]}),(0,w.jsx)(N,{}),(0,w.jsx)(_,{opacity:.55,scale:1.5,blur:1,far:.2,frames:60})]}),(0,w.jsx)(P,{}),(0,w.jsx)(F,{})]})}b.preload(T,!1,!1),window.__study=x;export{I as default};