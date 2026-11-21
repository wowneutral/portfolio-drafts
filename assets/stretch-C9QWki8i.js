import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{n as t,t as n}from"./jsx-runtime-C3cWAN_r.js";import{t as r}from"./createLucideIcon-CTMyR_01.js";import{t as i}from"./arrow-up-right-BWg-MKsd.js";/* empty css             *//* empty css                       */import{a,c as o,d as s,f as c,g as l,i as u,l as d,o as f,p,r as m,s as h,t as g,u as _}from"./content-Do9Hx9qB.js";import{t as v}from"./version-BlCZFW3J.js";import{n as y,t as b}from"./github-D_t9GUTT.js";import{n as x,t as S}from"./notes-Dhr7Eb-u.js";import{c as C}from"./utils-DXhd7Sog.js";var w={name:`chevron-down`,size:24,node:[[`path`,{d:`m6 9 6 6 6-6`,key:`qrunsl`}]]};w.node;var T=r(w),E=e(t(),1),D=n(),O=`#version 300 es
in vec2 aPosition;
in vec2 aRest;
in vec4 aStrain;
in vec3 aDent;
uniform vec2 uViewport;
uniform vec2 uOffset;
out vec2 vRest;
out vec4 vStrain;
out vec3 vDent;
void main() {
  vRest = aRest;
  vStrain = aStrain;
  vDent = aDent;
  vec2 clip = (aPosition + uOffset) / uViewport * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`,k=`#version 300 es
precision highp float;
in vec2 vRest;
in vec4 vStrain;
in vec3 vDent;
uniform sampler2D uField;
uniform vec3 uShadowColor;
uniform float uShadow;
uniform vec4 uParts[64];
uniform float uClock;

float arrival(float delay) {
  float t = max(uClock - delay, 0.0);
  float omega = 15.0;
  float zeta = 0.38;
  float damped = omega * sqrt(1.0 - zeta * zeta);
  return 1.0 - exp(-zeta * omega * t) * (cos(damped * t) + zeta * omega / damped * sin(damped * t));
}

float owner(vec2 rest) {
  ivec2 size = textureSize(uField, 0);
  ivec2 texel = clamp(ivec2(rest * vec2(size)), ivec2(0), size - 1);
  return floor(texelFetch(uField, texel, 0).w + 0.5);
}

vec3 settle(vec2 rest) {
  if (uClock > 9.0) return vec3(rest, 1.0);
  float id = owner(rest);
  if (id < 0.5 || id > 64.5) return vec3(rest, 1.0);
  vec4 part = uParts[int(id) - 1];
  float presence = arrival(part.z);
  float size = max(mix(0.5, 1.0, presence), 0.05);
  vec2 moved = part.xy + (rest - part.xy) / size;
  return vec3(moved, presence * step(abs(owner(moved) - id), 0.5));
}
out vec4 outColor;
void main() {
  vec3 arrived = settle(vRest);
  float shade = texture(uField, arrived.xy).z * uShadow * clamp(arrived.z, 0.0, 1.0) * (1.0 - 0.35 * clamp(vDent.x, 0.0, 1.0));
  outColor = vec4(uShadowColor * shade, shade);
}`,A=`#version 300 es
precision highp float;
in vec2 vRest;
in vec4 vStrain;
in vec3 vDent;
uniform sampler2D uField;
uniform sampler2D uSlope;
uniform sampler2D uPaint;
uniform vec3 uColor;
uniform float uPaintMix;
uniform float uMaterial;
uniform float uLight;
uniform float uInflate;
uniform mat3 uTurn;
uniform vec4 uParts[64];
uniform float uClock;
out vec4 outColor;

float arrival(float delay) {
  float t = max(uClock - delay, 0.0);
  float omega = 15.0;
  float zeta = 0.38;
  float damped = omega * sqrt(1.0 - zeta * zeta);
  return 1.0 - exp(-zeta * omega * t) * (cos(damped * t) + zeta * omega / damped * sin(damped * t));
}

float owner(vec2 rest) {
  ivec2 size = textureSize(uField, 0);
  ivec2 texel = clamp(ivec2(rest * vec2(size)), ivec2(0), size - 1);
  return floor(texelFetch(uField, texel, 0).w + 0.5);
}

vec3 settle(vec2 rest) {
  if (uClock > 9.0) return vec3(rest, 1.0);
  float id = owner(rest);
  if (id < 0.5 || id > 64.5) return vec3(rest, 1.0);
  vec4 part = uParts[int(id) - 1];
  float presence = arrival(part.z);
  float size = max(mix(0.5, 1.0, presence), 0.05);
  vec2 moved = part.xy + (rest - part.xy) / size;
  return vec3(moved, presence * step(abs(owner(moved) - id), 0.5));
}
vec4 cubic(float v) {
  vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
  vec4 s = n * n * n;
  float x = s.x;
  float y = s.y - 4.0 * s.x;
  float z = s.z - 4.0 * s.y + 6.0 * s.x;
  return vec4(x, y, z, 6.0 - x - y - z) / 6.0;
}

vec2 smoothSlope(vec2 uv) {
  vec2 size = vec2(textureSize(uSlope, 0));
  vec2 cell = uv * size - 0.5;
  vec2 f = fract(cell);
  cell -= f;
  vec4 xc = cubic(f.x);
  vec4 yc = cubic(f.y);
  vec4 corner = cell.xxyy + vec2(-0.5, 1.5).xyxy;
  vec4 sum = vec4(xc.xz + xc.yw, yc.xz + yc.yw);
  vec4 offset = (corner + vec4(xc.yw, yc.yw) / sum) / size.xxyy;
  vec2 a = texture(uSlope, offset.xz).xy;
  vec2 b = texture(uSlope, offset.yz).xy;
  vec2 c = texture(uSlope, offset.xw).xy;
  vec2 d = texture(uSlope, offset.yw).xy;
  float sx = sum.x / (sum.x + sum.y);
  float sy = sum.z / (sum.z + sum.w);
  return mix(mix(d, c, sx), mix(b, a, sx), sy);
}

float panel(vec3 r, vec3 center, vec2 size, float soft) {
  vec3 forward = normalize(center);
  vec3 side = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
  vec3 lift = cross(forward, side);
  float facing = dot(r, forward);
  vec2 local = vec2(dot(r, side), dot(r, lift)) / max(facing, 0.1);
  vec2 q = abs(local) - size;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  return smoothstep(soft, -soft, d) * smoothstep(0.05, 0.3, facing);
}

vec3 studio(vec3 r, float blur) {
  float y = r.y;
  vec3 skyLow = mix(vec3(0.92, 0.95, 1.0), vec3(1.0), uLight);
  vec3 skyHigh = mix(vec3(0.1, 0.11, 0.14), vec3(0.62, 0.64, 0.7), uLight);
  vec3 groundNear = mix(vec3(0.12, 0.11, 0.1), vec3(0.3, 0.29, 0.28), uLight);
  vec3 groundFar = mix(vec3(0.005), vec3(0.1), uLight);
  vec3 sky = mix(skyLow, skyHigh, smoothstep(0.0, 0.75, y));
  vec3 ground = mix(groundNear, groundFar, smoothstep(0.0, -0.4, y));
  float edge = 0.004 + blur;
  vec3 c = mix(ground, sky, smoothstep(-edge, edge, y));
  float glow = 0.035 + blur;
  c += vec3(2.2) * exp(-pow((y - 0.02) / glow, 2.0)) * (0.035 / glow);
  c += vec3(7.0) * panel(r, vec3(-0.55, 0.55, 0.62), vec2(0.36, 0.2), 0.025 + blur);
  c += vec3(4.5) * panel(r, vec3(0.9, 0.18, 0.4), vec2(0.045, 0.85), 0.01 + blur) * (0.045 / (0.045 + blur));
  c += vec3(3.2) * panel(r, vec3(-0.95, 0.1, 0.32), vec2(0.035, 0.7), 0.01 + blur) * (0.035 / (0.035 + blur));
  c += vec3(2.4) * panel(r, vec3(0.0, 0.92, 0.38), vec2(1.1, 0.045), 0.01 + blur) * (0.045 / (0.045 + blur));
  return c;
}

vec3 tone(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec3 arrived = settle(vRest);
  vec2 rest = arrived.xy;
  float presence = arrived.z;
  vec4 field = texture(uField, rest);
  float edge = field.y;
  float edgeWidth = max(fwidth(edge), 0.0001);
  if (edge < -3.0 * edgeWidth || presence <= 0.001) discard;
  float cover = clamp(edge / edgeWidth + 0.5, 0.0, 1.0);

  vec2 slope = smoothSlope(rest);
  mat2 strain = mat2(vStrain.xy, vStrain.zw);
  float area = max(determinant(strain), 0.2);
  float lift = uInflate * presence * inversesqrt(area);
  float keep = clamp(1.0 - vDent.x, 0.15, 1.6);
  vec2 restGradient = (slope * keep - field.x * vDent.yz) * lift;
  vec2 gradient = inverse(transpose(strain)) * restGradient;
  vec3 normal = normalize(vec3(-gradient.x, gradient.y, 1.0));
  float depth = field.x * keep * lift;

  vec3 turned = uTurn * normal;
  vec3 reflected = uTurn * reflect(vec3(0.0, 0.0, -1.0), normal);
  float footprint = length(fwidth(reflected));
  float facing = max(normal.z, 0.0);
  float fresnel = pow(1.0 - facing, 5.0);
  vec3 lightDir = normalize(vec3(-0.5, 0.62, 0.62));
  float wrap = max((dot(turned, lightDir) + 0.45) / 1.45, 0.0);
  float key = max(dot(turned, lightDir), 0.0);
  float occlusion = mix(0.55, 1.0, smoothstep(0.0, 12.0, depth));

  vec3 paint = texture(uPaint, rest).rgb;
  vec3 base = mix(uColor, paint, uPaintMix);
  vec3 color;
  if (uMaterial < 0.5) {
    vec3 env = studio(reflected, 0.04 + footprint * 0.6);
    float reflectance = 0.045 + 0.955 * fresnel;
    vec3 deep = base * base * 0.55;
    vec3 body = mix(deep, base * 1.08, wrap) * occlusion;
    body += base * pow(1.0 - facing, 2.0) * 0.18;
    color = body * (1.0 - reflectance) + tone(env * reflectance * 0.9);
  } else if (uMaterial < 1.5) {
    vec3 env = studio(reflected, footprint * 0.6);
    vec3 tint = mix(vec3(1.0), base, 0.6) * 0.92;
    vec3 reflectance = tint + (1.0 - tint) * fresnel;
    color = tone(env * reflectance * mix(0.55, 1.0, occlusion) * 1.1);
  } else if (uMaterial < 2.5) {
    vec3 env = studio(reflected, 0.03 + footprint * 0.6);
    float core = smoothstep(0.0, 1.0, facing);
    vec3 glow = mix(base * base * 0.35, min(base * 1.45 + 0.08, vec3(1.0)), core * core);
    vec3 body = glow * mix(0.7, 1.0, occlusion) + base * wrap * 0.18;
    float reflectance = 0.03 + 0.97 * fresnel;
    color = body * (1.0 - reflectance) + tone(env * reflectance * 0.85);
  } else {
    vec3 env = studio(reflected, 0.35 + footprint * 0.6);
    vec3 body = base * (0.3 + 0.7 * wrap) * mix(0.68, 1.0, occlusion);
    body += base * key * 0.12;
    color = body + tone(env * (0.012 + 0.18 * fresnel)) * 0.5;
  }
  float alpha = cover * smoothstep(0.0, 0.18, presence);
  outColor = vec4(color * alpha, alpha);
}`,j={balloon:0,chrome:1,jelly:2,clay:3},ee=960,te=5200,M=1/480,N=(e,t,n)=>Math.min(n,Math.max(t,e)),P=(e,t,n)=>{let r=e.createShader(t);return r?(e.shaderSource(r,n),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS)?r:(e.deleteShader(r),null)):null},F=(e,t)=>{let n=P(e,e.VERTEX_SHADER,O),r=P(e,e.FRAGMENT_SHADER,t),i=e.createProgram();return!n||!r||!i?null:(e.attachShader(i,n),e.attachShader(i,r),e.bindAttribLocation(i,0,`aPosition`),e.bindAttribLocation(i,1,`aRest`),e.bindAttribLocation(i,2,`aStrain`),e.bindAttribLocation(i,3,`aDent`),e.linkProgram(i),e.deleteShader(n),e.deleteShader(r),e.getProgramParameter(i,e.LINK_STATUS)?i:(e.deleteProgram(i),null))},ne=(e,t,n)=>{let r={};for(let i of n)r[i]=e.getUniformLocation(t,i);return r},I=(e,t,n,r,i)=>{let a=0;r[0]=0,i[0]=-1/0,i[1]=1/0;for(let n=1;n<t;n++){let t=(e[n]+n*n-(e[r[a]]+r[a]*r[a]))/(2*n-2*r[a]);for(;t<=i[a];)a--,t=(e[n]+n*n-(e[r[a]]+r[a]*r[a]))/(2*n-2*r[a]);a++,r[a]=n,i[a]=t,i[a+1]=1/0}a=0;for(let o=0;o<t;o++){for(;i[a+1]<o;)a++;n[o]=(o-r[a])*(o-r[a])+e[r[a]]}},re=(e,t,n)=>{let r=Math.max(t,n),i=new Float64Array(r),a=new Float64Array(r),o=new Int32Array(r),s=new Float64Array(r+1);for(let r=0;r<t;r++){for(let a=0;a<n;a++)i[a]=e[a*t+r];I(i,n,a,o,s);for(let i=0;i<n;i++)e[i*t+r]=a[i]}for(let r=0;r<n;r++){for(let n=0;n<t;n++)i[n]=e[r*t+n];I(i,t,a,o,s);for(let n=0;n<t;n++)e[r*t+n]=Math.sqrt(a[n])}return e},ie=(e,t,n)=>{let r=new Float64Array(t*n),i=new Int32Array(t*n);for(let a=0;a<t;a++){let o=-1;for(let s=0;s<n;s++){let n=s*t+a;e[n]&&(o=s),i[n]=o,r[n]=o>=0?(s-o)*(s-o):0x56bc75e2d63100000}o=-1;for(let s=n-1;s>=0;s--){let n=s*t+a;e[n]&&(o=s),o>=0&&(o-s)*(o-s)<r[n]&&(r[n]=(o-s)*(o-s),i[n]=o)}}let a=new Float32Array(t*n),o=new Float64Array(t),s=new Int32Array(t),c=new Float64Array(t+1);for(let l=0;l<n;l++){for(let e=0;e<t;e++)o[e]=r[l*t+e];let n=0;s[0]=0,c[0]=-1/0,c[1]=1/0;for(let e=1;e<t;e++){let t=(o[e]+e*e-(o[s[n]]+s[n]*s[n]))/(2*e-2*s[n]);for(;t<=c[n];)n--,t=(o[e]+e*e-(o[s[n]]+s[n]*s[n]))/(2*e-2*s[n]);n++,s[n]=e,c[n]=t,c[n+1]=1/0}n=0;for(let r=0;r<t;r++){for(;c[n+1]<r;)n++;let o=s[n],u=i[l*t+o];a[l*t+r]=u>=0?e[u*t+o]:0}}return a},ae=(e,t,n)=>{let r=[{width:t,height:n,mask:e}];for(;Math.max(r[r.length-1].width,r[r.length-1].height)>48;){let e=r[r.length-1],t=Math.ceil(e.width/2),n=Math.ceil(e.height/2),i=new Float32Array(t*n);for(let r=0;r<n;r++)for(let n=0;n<t;n++){let a=0,o=0;for(let t=0;t<2;t++)for(let i=0;i<2;i++){let s=n*2+i,c=r*2+t;s<e.width&&c<e.height&&(a+=e.mask[c*e.width+s],o++)}i[r*t+n]=a/o}r.push({width:t,height:n,mask:i})}let i=null;for(let e=r.length-1;e>=0;e--){let{width:t,height:n,mask:a}=r[e],o=new Float32Array(t*n);if(i){let a=r[e+1].width,s=r[e+1].height;for(let e=0;e<n;e++)for(let n=0;n<t;n++){let r=N((n+.5)/2-.5,0,a-1),c=N((e+.5)/2-.5,0,s-1),l=Math.floor(r),u=Math.floor(c),d=Math.min(a-1,l+1),f=Math.min(s-1,u+1),p=r-l,m=c-u,h=i[u*a+l]*(1-p)+i[u*a+d]*p,g=i[f*a+l]*(1-p)+i[f*a+d]*p;o[e*t+n]=h*(1-m)+g*m}}let s=4**e,c=e===r.length-1?300:60;for(let e=0;e<c;e++)for(let e=0;e<n;e++)for(let r=0;r<t;r++){let i=e*t+r;if(a[i]<.5){o[i]=0;continue}let c=r>0?o[i-1]:0,l=r<t-1?o[i+1]:0,u=e>0?o[i-t]:0,d=e<n-1?o[i+t]:0;o[i]+=((c+l+u+d+s)*.25-o[i])*1.85}i=o}return i},L=(e,t,n,r)=>{let i=Math.max(1,Math.round(r)),a=i/2.5,o=[],s=0;for(let e=-i;e<=i;e++){let t=Math.exp(-(e*e)/(2*a*a));o.push(t),s+=t}for(let e=0;e<o.length;e++)o[e]/=s;let c=new Float32Array(t*n),l=new Float32Array(t*n);for(let r=0;r<n;r++)for(let n=0;n<t;n++){let a=0;for(let s=-i;s<=i;s++)a+=e[r*t+N(n+s,0,t-1)]*o[s+i];c[r*t+n]=a}for(let e=0;e<n;e++)for(let r=0;r<t;r++){let a=0;for(let s=-i;s<=i;s++)a+=c[N(e+s,0,n-1)*t+r]*o[s+i];l[e*t+r]=a}return l},R=({text:e=`Squish`,src:t=``,fontFamily:n=`system-ui, sans-serif`,fontWeight:r=900,color:i=`#3b5bff`,imageColors:a=!0,material:o=`balloon`,inflate:s=1,stiffness:c=.5,wobble:l=.6,grabRadius:u=70,stretch:d=.5,press:f=.5,shadow:p=.5,intro:m=!0,theme:h=`dark`,dpr:g,fontSize:_,lineHeight:v=.92,onReady:y,handle:b,className:x=``,style:S,...C})=>{let w=(0,E.useRef)(y);w.current=y;let T=(0,E.useRef)(null),O=(0,E.useRef)(null),P=(0,E.useRef)(null),I=(0,E.useRef)(null),R={text:String(e),src:String(t||``),fontFamily:String(n),fontWeight:r,color:String(i),imageColors:a,material:j[o]??0,inflate:N(s,.1,3),stiffness:N(c,0,1),wobble:N(l,0,1),grabRadius:N(u,10,400),stretch:N(d,0,1),press:N(f,0,1),shadow:N(p,0,1),intro:m,light:h===`light`,dpr:g,fontSize:_,lineHeight:v},z=(0,E.useRef)(R);z.current=R;let B=`${R.text}|${R.src}|${R.fontFamily}|${R.fontWeight}|${_}`,V=(0,E.useRef)(B);return(0,E.useEffect)(()=>{let e=T.current,t=O.current,n=t?.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1});if(!e||!t||!n)return;let r=F(n,A),i=F(n,k);if(!r||!i)return;let a=ne(n,r,[`uViewport`,`uOffset`,`uField`,`uPaint`,`uSlope`,`uColor`,`uPaintMix`,`uMaterial`,`uLight`,`uInflate`,`uTurn`,`uClock`,`uParts`]),o=ne(n,i,[`uViewport`,`uOffset`,`uField`,`uShadowColor`,`uShadow`,`uClock`,`uParts`]),s=n.createTexture(),c=n.createTexture(),l=n.createTexture();for(let e of[s,c,l])n.bindTexture(n.TEXTURE_2D,e),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.LINEAR),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE),n.texImage2D(n.TEXTURE_2D,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,new Uint8Array(4));let u=n.createVertexArray(),d=n.createBuffer(),f=n.createBuffer(),p=n.createBuffer();n.bindVertexArray(u),n.bindBuffer(n.ARRAY_BUFFER,d),n.enableVertexAttribArray(1),n.vertexAttribPointer(1,2,n.FLOAT,!1,0,0),n.bindBuffer(n.ARRAY_BUFFER,f),n.enableVertexAttribArray(0),n.vertexAttribPointer(0,2,n.FLOAT,!1,36,0),n.enableVertexAttribArray(2),n.vertexAttribPointer(2,4,n.FLOAT,!1,36,8),n.enableVertexAttribArray(3),n.vertexAttribPointer(3,3,n.FLOAT,!1,36,24),n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,p),n.bindVertexArray(null);let m=document.createElement(`canvas`).getContext(`2d`,{willReadFrequently:!0}),h=window.matchMedia?.(`(prefers-reduced-motion: reduce)`).matches??!1,g=new Float32Array(256),_=new Float32Array([1,0,0,0,1,0,0,0,1]),v={cols:0,rows:0,spacing:1,count:0,indices:0,restX:new Float32Array,restY:new Float32Array,x:new Float32Array,y:new Float32Array,vx:new Float32Array,vy:new Float32Array,dent:new Float32Array,dentV:new Float32Array,grip:new Float32Array,gripX:new Float32Array,gripY:new Float32Array,active:new Uint8Array,neighbors:new Int32Array,dynamic:new Float32Array,anchorX:new Float32Array,anchorY:new Float32Array,indexType:n.UNSIGNED_SHORT,activeCount:0,width:1,height:1},y={width:1,height:1,ready:!1,fieldWidth:1,fieldHeight:1,fieldScale:1,sdf:new Float32Array,parts:[],clock:z.current.intro&&!h?0:10,colorKey:``,color:[.31,.42,1],pointer:{x:0,y:0,inside:!1,down:!1,startX:0,startY:0,startTime:0,dragging:!1},hover:{x:0,y:0,vx:0,vy:0,power:0},turn:{x:0,y:0,vx:0,vy:0},accumulator:0,energy:1,buildToken:0},x=0,S=0,C=!0,E=!0,D=0,j=e=>{if(!m||!e)return[.31,.42,1];m.fillStyle=`#000000`,m.fillStyle=/^[0-9a-f]{3,8}$/i.test(e)?`#${e}`:e,m.fillRect(0,0,1,1);let[t,n,r]=m.getImageData(0,0,1,1).data;return[t/255,n/255,r/255]},R=(e,t)=>{let n=N(Math.round(e*y.fieldScale),0,y.fieldWidth-1),r=N(Math.round(t*y.fieldScale),0,y.fieldHeight-1);return y.sdf[r*y.fieldWidth+n]||-1e6},B=()=>{let{width:e,height:t}=y,r=Math.max(7,Math.sqrt(e*t/te)),i=Math.ceil(e/r)+1,a=Math.ceil(t/r)+1,o=i*a,s=e/(i-1),c=t/(a-1);v.cols=i,v.rows=a,v.width=e,v.height=t,v.spacing=(s+c)/2,v.count=o,v.restX=new Float32Array(o),v.restY=new Float32Array(o),v.x=new Float32Array(o),v.y=new Float32Array(o),v.vx=new Float32Array(o),v.vy=new Float32Array(o),v.dent=new Float32Array(o),v.dentV=new Float32Array(o),v.grip=new Float32Array(o),v.gripX=new Float32Array(o),v.gripY=new Float32Array(o),v.active=new Uint8Array(o),v.dynamic=new Float32Array(o*9);let l=new Float32Array(o*2),u=-2.5*v.spacing;for(let n=0;n<a;n++)for(let r=0;r<i;r++){let a=n*i+r,o=r*s,d=n*c;v.restX[a]=o,v.restY[a]=d,v.x[a]=o,v.y[a]=d,l[a*2]=o/e,l[a*2+1]=d/t,v.active[a]=y.ready&&R(o,d)>u?1:0}let f=new Int32Array(o*8).fill(-1),m=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];for(let e=0;e<a;e++)for(let t=0;t<i;t++){let n=e*i+t;v.active[n]&&m.forEach(([r,o],s)=>{let c=t+r,l=e+o;if(c<0||l<0||c>=i||l>=a)return;let u=l*i+c;v.active[u]&&(f[n*8+s]=u)})}v.neighbors=f,v.activeCount=v.active.reduce((e,t)=>e+t,0);let h=-(Math.min(e,t)*.14+v.spacing*3),g=new Uint8Array(o);for(let e=0;e<o;e++)g[e]=y.ready&&R(v.restX[e],v.restY[e])>h?1:0;let _=[];for(let e=0;e<a-1;e++)for(let t=0;t<i-1;t++){let n=e*i+t,r=n+1,a=n+i,o=a+1;(g[n]||g[r]||g[a]||g[o])&&_.push(n,a,r,r,a,o)}let b=o>65535?new Uint32Array(_):new Uint16Array(_);v.indexType=o>65535?n.UNSIGNED_INT:n.UNSIGNED_SHORT,v.indices=_.length,n.bindBuffer(n.ARRAY_BUFFER,d),n.bufferData(n.ARRAY_BUFFER,l,n.STATIC_DRAW),n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,p),n.bufferData(n.ELEMENT_ARRAY_BUFFER,b,n.STATIC_DRAW),V()},V=()=>{let{cols:e,rows:t,x:r,y:i,dent:a,dynamic:o,spacing:s}=v,c=v.width/Math.max(1,e-1),l=v.height/Math.max(1,t-1);for(let n=0;n<t;n++)for(let u=0;u<e;u++){let d=n*e+u,f=u>0?d-1:d,p=u<e-1?d+1:d,m=n>0?d-e:d,h=n<t-1?d+e:d,g=(p-f)*c||s,_=(h-m)/e*l||s,v=d*9;o[v]=r[d],o[v+1]=i[d],o[v+2]=(r[p]-r[f])/g,o[v+3]=(i[p]-i[f])/g,o[v+4]=(r[h]-r[m])/_,o[v+5]=(i[h]-i[m])/_,o[v+6]=a[d],o[v+7]=(a[p]-a[f])/g,o[v+8]=(a[h]-a[m])/_}n.bindBuffer(n.ARRAY_BUFFER,f),n.bufferData(n.ARRAY_BUFFER,o,n.DYNAMIC_DRAW)},H=async()=>{let e=z.current,t=++y.buildToken,{width:r,height:i}=y,a=Math.min(1,ee/Math.max(r,i)),o=Math.max(8,Math.round(r*a)),u=Math.max(8,Math.round(i*a)),d=document.createElement(`canvas`);d.width=o,d.height=u;let f=d.getContext(`2d`,{willReadFrequently:!0});if(!f)return;let p=!1;if(e.src){let n=new Image;n.crossOrigin=`anonymous`,n.decoding=`async`,n.src=e.src;try{await n.decode()}catch{return}if(t!==y.buildToken)return;let r=Math.min(o*.78/n.naturalWidth,u*.74/n.naturalHeight),i=n.naturalWidth*r,a=n.naturalHeight*r;f.drawImage(n,(o-i)/2,(u-a)/2,i,a),p=!0}else{let n=e.fontFamily,r=e.fontWeight;if(document.fonts&&await document.fonts.load(`${r} 100px ${n}`).catch(()=>null),t!==y.buildToken)return;let i=e.text.split(`
`);f.font=`${r} 100px ${n}`;let s=1,c=0,l=0;for(let e of i){let t=f.measureText(e||` `);s=Math.max(s,t.actualBoundingBoxLeft+t.actualBoundingBoxRight),c=Math.max(c,t.actualBoundingBoxAscent),l=Math.max(l,t.actualBoundingBoxDescent)}let d=100*e.lineHeight,m=c+l+d*(i.length-1),h=e.fontSize?e.fontSize*a:Math.min(o*.8/s,u*.7/m)*100;f.font=`${r} ${h}px ${n}`,f.fillStyle=`#ffffff`,f.textAlign=`center`,f.textBaseline=`alphabetic`;let g=h/100,_=(u-m*g)/2+c*g;i.forEach((e,t)=>{let n=f.measureText(e||` `),r=(n.actualBoundingBoxLeft-n.actualBoundingBoxRight)/2;f.fillText(e,o/2+r,_+t*d*g)}),p=!0}if(!p||t!==y.buildToken)return;let m=f.getImageData(0,0,o,u).data,h=o*u,_=new Float32Array(h),v=new Float64Array(h),b=new Float64Array(h);for(let e=0;e<h;e++){let t=m[e*4+3]/255;_[e]=t,v[e]=t>.5?1e10:0,b[e]=t>.5?0:1e10}re(v,o,u),re(b,o,u);let x=new Float32Array(h),S=new Float32Array(h);for(let e=0;e<h;e++)x[e]=+(_[e]>.5),S[e]=_[e]>.02&&_[e]<.98?_[e]-.5:v[e]>0?v[e]-.5:.5-b[e];let C=new Int32Array(h),T=[],E=new Int32Array(h);for(let e=0;e<h;e++){if(!x[e]||C[e])continue;let t=T.length+1,n=0,r=0,i=0,s=0,c=1/0;for(E[r++]=e,C[e]=t;n<r;){let e=E[n++],a=e%o,l=(e-a)/o;i+=a,s+=l,a<c&&(c=a),a>0&&x[e-1]&&!C[e-1]&&(C[e-1]=t,E[r++]=e-1),a<o-1&&x[e+1]&&!C[e+1]&&(C[e+1]=t,E[r++]=e+1),l>0&&x[e-o]&&!C[e-o]&&(C[e-o]=t,E[r++]=e-o),l<u-1&&x[e+o]&&!C[e+o]&&(C[e+o]=t,E[r++]=e+o)}T.push({x:i/r/a,y:s/r/a,left:c,size:r,delay:0})}let D=[...T].sort((e,t)=>e.left-t.left),O=D.length>1?Math.min(.07,.5/(D.length-1)):0;D.forEach((e,t)=>{e.delay=t*O});let k=T.length<=64?ie(C,o,u):new Float32Array(h),A=L(ae(x,o,u),o,u,2),j=L(S,o,u,2),te=L(x,o,u,Math.max(4,Math.min(o,u)*.045)),M=new Float32Array(h*4),N=new Float32Array(h),P=new Float32Array(h);for(let e=0;e<h;e++){let t=j[e]/a;N[e]=t,P[e]=Math.sqrt(Math.max(0,2*A[e]))/a,M[e*4]=P[e],M[e*4+1]=t,M[e*4+2]=te[e],M[e*4+3]=k[e]}let F=new Float32Array(h*2);for(let e=0;e<u;e++)for(let t=0;t<o;t++){let n=e*o+t,r=(P[e*o+Math.min(o-1,t+1)]-P[e*o+Math.max(0,t-1)])*.5*a,i=(P[Math.min(u-1,e+1)*o+t]-P[Math.max(0,e-1)*o+t])*.5*a,s=Math.hypot(r,i);s>7&&(r*=7/s,i*=7/s),F[n*2]=r,F[n*2+1]=i}n.bindTexture(n.TEXTURE_2D,s),n.texImage2D(n.TEXTURE_2D,0,n.RGBA16F,o,u,0,n.RGBA,n.FLOAT,M),n.bindTexture(n.TEXTURE_2D,l),n.texImage2D(n.TEXTURE_2D,0,n.RG16F,o,u,0,n.RG,n.FLOAT,F),n.bindTexture(n.TEXTURE_2D,c),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),n.texImage2D(n.TEXTURE_2D,0,n.RGBA,n.RGBA,n.UNSIGNED_BYTE,d),y.fieldWidth=o,y.fieldHeight=u,y.fieldScale=a,y.sdf=N,y.parts=T,g.fill(0),T.slice(0,64).forEach((e,t)=>{g[t*4]=e.x/r,g[t*4+1]=e.y/i,g[t*4+2]=e.delay}),y.ready=!0,B(),X(),w.current?.()},oe=(e,t)=>{let{count:n,x:r,y:i,vx:a,vy:o,restX:s,restY:c,dent:l,dentV:u,active:d,neighbors:f,grip:p,gripX:m,gripY:g,spacing:_}=v,b=.4+t.stiffness*1.2,x=350*b*b,S=x*(52/Math.sqrt(b)/_)**2,C=h?.8:.5-t.wobble*.42,w=2*C*Math.sqrt(x),T=x*1.4,E=T*(18/_)**2,D=2*(C+.06)*Math.sqrt(T),O=x*30,k=1.2*Math.sqrt(O),A=y.pointer.dragging?0:10,j=y.hover,ee=t.grabRadius*.32,te=1/(2*ee*ee),M=j.power*t.press,P=y.pointer.dragging?1.6:1,F=0;for(let t=0;t<n;t++){if(!d[t])continue;let n=r[t]-s[t],h=i[t]-c[t],v=-x*n-w*a[t],y=-x*h-w*o[t],b=-T*l[t]-D*u[t],C=t*8;for(let e=0;e<8;e++){let a=f[C+e];if(a<0)continue;let o=e<4?1:.5;v+=S*o*(r[a]-s[a]-n),y+=S*o*(i[a]-c[a]-h),b+=E*o*(l[a]-l[t])}if(M>.001){let e=r[t]-j.x,n=i[t]-j.y,a=Math.exp(-(e*e+n*n)*te);b+=T*2.6*P*M*a,v+=(x*.3*e+A*j.vx)*M*a,y+=(x*.3*n+A*j.vy)*M*a}p[t]>0&&(v+=p[t]*(O*(m[t]-r[t])-k*a[t]),y+=p[t]*(O*(g[t]-i[t])-k*o[t])),a[t]+=v*e,o[t]+=y*e,u[t]+=b*e,F+=Math.abs(a[t])+Math.abs(o[t])+Math.abs(u[t])*_}for(let t=0;t<n;t++)d[t]&&(r[t]+=a[t]*e,i[t]+=o[t]*e,l[t]=N(l[t]+u[t]*e,-.6,.85));return F},U=e=>{let{pointer:t}=y,{count:n,grip:r,gripX:i,gripY:a}=v;if(!t.dragging)return;let o=Math.max(30,Math.min(y.width*.45,y.height*(.12+e.stretch*.4))),s=t.x-t.startX,c=t.y-t.startY,l=Math.hypot(s,c),u=l>0?o*Math.tanh(l/o)/l:0;for(let e=0;e<n;e++)r[e]<=0||(i[e]=v.anchorX[e]+s*u,a[e]=v.anchorY[e]+c*u)},se=(e,t,n)=>{let{count:r,x:i,y:a,grip:o,active:s}=v,c=n.grabRadius*.3,l=1/(2*c*c);v.anchorX=new Float32Array(r),v.anchorY=new Float32Array(r);let u=0;for(let n=0;n<r;n++){if(!s[n])continue;let r=i[n]-e,c=a[n]-t,d=Math.exp(-(r*r+c*c)*l);o[n]=d>.03?d:0,v.anchorX[n]=i[n],v.anchorY[n]=a[n],u+=o[n]}return u>0},ce=()=>{v.grip.fill(0),y.pointer.dragging=!1},W=(e,t,n)=>{let{count:r,x:i,y:a,vx:o,vy:s,dentV:c,active:l}=v,u=n.grabRadius,d=1/(2*u*u),f=.4+n.press;for(let n=0;n<r;n++){if(!l[n])continue;let r=i[n]-e,u=a[n]-t,p=Math.exp(-(r*r+u*u)*d);c[n]+=9*f*p,o[n]+=r*9*f*p,s[n]+=u*9*f*p}},G=(e,t)=>{let{cols:n,rows:r,x:i,y:a,active:o,spacing:s}=v,c=1/0,l=-1,u=Math.ceil(80/s),d=N(Math.round(e/(v.width/Math.max(1,n-1))),0,n-1),f=N(Math.round(t/(v.height/Math.max(1,r-1))),0,r-1);for(let s=Math.max(0,f-u);s<=Math.min(r-1,f+u);s++)for(let r=Math.max(0,d-u);r<=Math.min(n-1,d+u);r++){let u=s*n+r;if(!o[u])continue;let d=Math.hypot(i[u]-e,a[u]-t);d<c&&(c=d,l=u)}return l<0?!1:R(v.restX[l]+(e-i[l]),v.restY[l]+(t-a[l]))>-4},K=!1,q=()=>{let n=z.current,r=Math.max(1,e.clientWidth),i=Math.max(1,e.clientHeight),a=Math.min(n.dpr||window.devicePixelRatio||1,2);if(t.width=Math.max(1,Math.round(r*a)),t.height=Math.max(1,Math.round(i*a)),r!==y.width||i!==y.height){let e=!y.ready&&!y.buildToken;y.width=r,y.height=i,window.clearTimeout(D),e?H():D=window.setTimeout(H,160)}},J=()=>{K=!0,X()},Y=()=>{let e=z.current,d=e.color;if(d!==y.colorKey&&(y.colorKey=d,y.color=j(e.color)),n.viewport(0,0,t.width,t.height),n.clearColor(0,0,0,0),n.clear(n.COLOR_BUFFER_BIT),!y.ready||!v.indices)return;if(n.enable(n.BLEND),n.blendFunc(n.ONE,n.ONE_MINUS_SRC_ALPHA),n.bindVertexArray(u),n.activeTexture(n.TEXTURE0),n.bindTexture(n.TEXTURE_2D,s),n.activeTexture(n.TEXTURE1),n.bindTexture(n.TEXTURE_2D,c),n.activeTexture(n.TEXTURE2),n.bindTexture(n.TEXTURE_2D,l),e.shadow>0){n.useProgram(i),n.uniform2f(o.uViewport,v.width,v.height);let t=Math.min(v.width,v.height)*.035*e.inflate;n.uniform2f(o.uOffset,t*.25,t),n.uniform1i(o.uField,0),e.light?n.uniform3f(o.uShadowColor,.3,.2,0):n.uniform3f(o.uShadowColor,0,0,0),n.uniform1f(o.uShadow,e.shadow*(e.light?.55:.7)),n.uniform1f(o.uClock,y.clock),n.uniform4fv(o.uParts,g),n.drawElements(n.TRIANGLES,v.indices,v.indexType,0)}n.useProgram(r),n.uniform2f(a.uViewport,v.width,v.height),n.uniform2f(a.uOffset,0,0),n.uniform1i(a.uField,0),n.uniform1i(a.uPaint,1),n.uniform1i(a.uSlope,2);let f=y.turn.x,p=y.turn.y,m=Math.cos(f),h=Math.sin(f),b=Math.cos(p),x=Math.sin(p);_[0]=m,_[1]=h*x,_[2]=-h*b,_[3]=0,_[4]=b,_[5]=x,_[6]=h,_[7]=-m*x,_[8]=m*b,n.uniformMatrix3fv(a.uTurn,!1,_),n.uniform3f(a.uColor,y.color[0],y.color[1],y.color[2]),n.uniform1f(a.uPaintMix,e.src&&e.imageColors?1:0),n.uniform1f(a.uMaterial,e.material),n.uniform1f(a.uLight,+!!e.light),n.uniform1f(a.uInflate,e.inflate),n.uniform1f(a.uClock,y.clock),n.uniform4fv(a.uParts,g),n.drawElements(n.TRIANGLES,v.indices,v.indexType,0),n.bindVertexArray(null)},le=e=>{if(x=0,K&&(K=!1,q()),!E||!C||document.hidden)return;let t=z.current,n=S?Math.min(.05,(e-S)/1e3):1/60;S=e,h||!t.intro?y.clock=10:y.ready&&y.clock<10&&(y.clock=y.clock+n>1.8?10:y.clock+n);let r=y.hover,i=y.pointer,a=y.ready&&(i.dragging||i.inside&&!i.down&&G(i.x,i.y)),o=1-Math.exp(-n/.05),s=r.x+(i.x-r.x)*o,c=r.y+(i.y-r.y)*o,l=1-Math.exp(-n/.04);r.vx+=((s-r.x)/Math.max(n,.001)-r.vx)*l,r.vy+=((c-r.y)/Math.max(n,.001)-r.vy)*l,r.x=s,r.y=c;let u=+!!a;r.power+=(u-r.power)*(1-Math.exp(-n/(a?.12:.25)));let d=y.turn,f=i.inside&&!h?(i.x/Math.max(1,v.width)-.5)*.7:0,p=i.inside&&!h?(i.y/Math.max(1,v.height)-.5)*.4:0;d.vx+=(28*(f-d.x)-10*d.vx)*n,d.vy+=(28*(p-d.y)-10*d.vy)*n,d.x+=d.vx*n,d.y+=d.vy*n;let m=Math.abs(f-d.x)>5e-4||Math.abs(p-d.y)>5e-4||Math.abs(d.vx)>.001||Math.abs(d.vy)>.001,g=0,_=Z;if(_&&y.ready){let t=Math.min(1,(e-_.t0)/_.ms),n=Math.sin(Math.PI*Math.min(1,t*1.25)*.5);y.pointer.x=_.x+_.dx*n,y.pointer.y=_.y+_.dy*n,t>=1&&(Z=null,ce())}if(y.ready){U(t),y.accumulator+=n;let e=0;for(;y.accumulator>=M&&e<40;)g=oe(M,t),y.accumulator-=M,e++;e===40&&(y.accumulator=0),V()}y.energy=g,Y(),!y.ready||y.clock<10||Math.abs(u-r.power)>.002||m||Math.hypot(i.x-r.x,i.y-r.y)>.1||i.dragging||g>.05*Math.max(1,v.activeCount)?x=requestAnimationFrame(le):S=0},X=()=>{!x&&E&&C&&!document.hidden&&(x=requestAnimationFrame(le))},Z=null;b&&(b.current={tug:(e,t,n,r,i)=>{if(!y.ready||y.pointer.down||h)return;let a=e*y.width,o=t*y.height;y.pointer.startX=a,y.pointer.startY=o,y.pointer.x=a,y.pointer.y=o,y.pointer.inside=!1,y.pointer.dragging=se(a,o,z.current),y.pointer.dragging&&(Z={x:a,y:o,dx:n,dy:r,ms:i,t0:performance.now()},X())}});let Q=t=>{let n=e.getBoundingClientRect();y.pointer.x=t.clientX-n.left,y.pointer.y=t.clientY-n.top,y.pointer.inside=y.pointer.x>=0&&y.pointer.y>=0&&y.pointer.x<=n.width&&y.pointer.y<=n.height},ue=e=>{Z||(Q(e),X())},de=t=>{if(Q(t),!y.ready||!G(y.pointer.x,y.pointer.y))return;let n=z.current;y.pointer.down=!0,y.pointer.startX=y.pointer.x,y.pointer.startY=y.pointer.y,y.pointer.startTime=performance.now(),y.pointer.dragging=se(y.pointer.x,y.pointer.y,n),e.setPointerCapture?.(t.pointerId),X()},$=e=>{if(!y.pointer.down)return;Q(e);let t=z.current,n=Math.hypot(y.pointer.x-y.pointer.startX,y.pointer.y-y.pointer.startY),r=performance.now()-y.pointer.startTime<260;ce(),n<8&&r&&W(y.pointer.x,y.pointer.y,t),y.pointer.down=!1,X()},fe=()=>{y.pointer.inside=!1,X()},pe=()=>{S=0,X()},me=new ResizeObserver(J);me.observe(e);let he=new IntersectionObserver(e=>{C=e.some(e=>e.isIntersecting),C&&(S=0,X())});return he.observe(e),e.addEventListener(`pointerdown`,de),window.addEventListener(`pointermove`,ue,{passive:!0}),window.addEventListener(`pointerup`,$),window.addEventListener(`pointercancel`,$),e.addEventListener(`pointerleave`,fe),document.addEventListener(`visibilitychange`,pe),J(),I.current=()=>{y.ready=!1,y.clock=z.current.intro&&!h?0:10,H()},P.current=()=>{x||Y(),X()},()=>{E=!1,y.buildToken++,cancelAnimationFrame(x),window.clearTimeout(D),P.current=null,I.current=null,me.disconnect(),he.disconnect(),e.removeEventListener(`pointerdown`,de),window.removeEventListener(`pointermove`,ue),window.removeEventListener(`pointerup`,$),window.removeEventListener(`pointercancel`,$),e.removeEventListener(`pointerleave`,fe),document.removeEventListener(`visibilitychange`,pe),n.deleteBuffer(d),n.deleteBuffer(f),n.deleteBuffer(p),n.deleteVertexArray(u),n.deleteTexture(s),n.deleteTexture(c),n.deleteTexture(l),n.deleteProgram(r),n.deleteProgram(i)}},[]),(0,E.useEffect)(()=>{V.current!==B&&(V.current=B,I.current?.())},[B]),(0,E.useEffect)(()=>{P.current?.()}),(0,D.jsx)(`div`,{ref:T,className:`elastic-mesh${x?` ${x}`:``}`,style:S,"aria-hidden":`true`,...C,children:(0,D.jsx)(`canvas`,{ref:O,className:`elastic-mesh-canvas`,"aria-hidden":`true`})})},z=`"Archivo Variable", "Archivo", sans-serif`,B=.9,V=`900 condensed`;function H(){if(typeof document>`u`)return!1;try{return!!document.createElement(`canvas`).getContext(`webgl2`)}catch{return!1}}var oe=H()&&!C,U=null;function se(e){return U??=document.createElement(`canvas`).getContext(`2d`),U?(U.font=`${V} 100px ${z}`,U.measureText(e).width):e.length*70}function ce(e,t){if(!t)return[e.join(` `)];let n=[],r=0;for(let i of t)n.push(e.slice(r,r+i).join(` `)),r+=i;return r<e.length&&n.push(e.slice(r).join(` `)),n}function W({text:e,as:t=`h2`,id:n,split:r,phoneSplit:i,max:a=420,tug:o,room:s=.42,handleRef:c,onGrab:l}){let u=(0,E.useRef)(null),d=(0,E.useRef)(null),f=c??d,[p,m]=(0,E.useState)(0),[h,g]=(0,E.useState)(!1),[_,v]=(0,E.useState)(!1),[y,b]=(0,E.useState)(!1),x=(0,E.useRef)(!1);(0,E.useLayoutEffect)(()=>{let e=u.current;m(e.clientWidth);let t=new ResizeObserver(()=>m(e.clientWidth));return t.observe(e),()=>t.disconnect()},[]),(0,E.useEffect)(()=>{let e=!0;return(document.fonts?.load(`${V} 100px ${z}`)??Promise.resolve()).catch(()=>null).then(()=>{e&&g(!0)}),()=>{e=!1}},[]),(0,E.useEffect)(()=>{if(!oe)return;let e=new IntersectionObserver(t=>{t.some(e=>e.isIntersecting)&&(v(!0),e.disconnect())},{rootMargin:`40% 0px`});return e.observe(u.current),()=>e.disconnect()},[]),(0,E.useEffect)(()=>{if(!y||!o||x.current)return;let e=u.current,t=()=>{if(x.current)return;x.current=!0;let t=e.clientHeight;o===`load`?f.current?.tug(.86,.52,Math.min(240,e.clientWidth*.14),t*.16,1100):f.current?.tug(.78,.6,0,t*.42,1700)};if(o===`load`){let e=window.setTimeout(t,650);return()=>window.clearTimeout(e)}let n=new IntersectionObserver(e=>{e.some(e=>e.intersectionRatio>.6)&&(n.disconnect(),window.setTimeout(t,250))},{threshold:[0,.6,1]});return n.observe(e),()=>n.disconnect()},[y,o]);let S=p>0&&p<640,C=ce(e.toUpperCase().split(` `),S?i??r:r),w=Math.max(0,p),T=h||p?Math.max(...C.map(se)):1,O=p?Math.min(a,Math.floor(w*.97*100/T)):0,k=Math.max(40,O*s),A=O?Math.round(C.length*O*B+k*2):void 0;return(0,D.jsxs)(`div`,{ref:u,className:`s-band${y?` is-live`:``}`,style:{height:A},onPointerDown:y&&l?l:void 0,children:[(0,D.jsx)(t,{id:n,className:`s-word`,style:O?{fontSize:O,lineHeight:B}:void 0,children:C.map((e,t)=>(0,D.jsx)(`span`,{className:`s-wline`,children:e},t))}),oe&&_&&h&&O>0&&(0,D.jsx)(R,{className:`s-mesh`,text:C.join(`
`),fontFamily:z,fontWeight:V,fontSize:O,lineHeight:B,color:`#141414`,material:`balloon`,theme:`light`,inflate:.85,stiffness:.42,wobble:.68,grabRadius:Math.min(400,Math.max(60,O*.95)),stretch:.85,press:.3,shadow:.7,intro:!1,dpr:Math.min(2,window.devicePixelRatio||1),onReady:()=>b(!0),handle:f})]})}var G=e=>`./`+e,K=p[0],q=p[1],J=a[3],Y=e=>e.replace(/^https?:\/\//,``).replace(/\/$/,``),le=[[`debate`,`Debate`],[`research`,`Research`],[`work`,`Work`],[`today`,`Today`],[`github`,`GitHub`],[`about`,`About`],[`contact`,`Contact`]];function X(){let{notes:e,loaded:t}=x(),n=e[0],r=e.slice(1);return(0,D.jsxs)(`section`,{className:`s-sec s-today`,id:`today`,"aria-labelledby":`today-h`,children:[(0,D.jsx)(W,{text:`Today`,id:`today-h`,max:300}),(0,D.jsxs)(`div`,{className:`s-field s-note-field`,children:[t?n?(0,D.jsxs)(`article`,{className:`s-note`,children:[(0,D.jsx)(`p`,{className:`s-note-date`,children:(0,D.jsx)(`time`,{dateTime:n.date,children:S(n.date)})}),n.body.map((e,t)=>(0,D.jsx)(`p`,{className:`s-note-body`,children:e},t))]}):(0,D.jsx)(`p`,{className:`s-note-body`,children:`No note posted yet.`}):(0,D.jsx)(`p`,{className:`s-note-wait`,role:`status`,children:`Opening today’s note`}),r.length>0&&(0,D.jsxs)(`div`,{className:`s-earlier`,children:[(0,D.jsx)(`h3`,{className:`s-h3`,children:`Earlier notes`}),(0,D.jsx)(`ul`,{className:`s-earlier-list`,children:r.map(e=>(0,D.jsx)(`li`,{children:(0,D.jsxs)(`details`,{className:`s-det`,children:[(0,D.jsxs)(`summary`,{children:[(0,D.jsx)(`time`,{dateTime:e.date,children:S(e.date)}),(0,D.jsx)(T,{"aria-hidden":`true`,className:`s-chev`,size:22,strokeWidth:2.25})]}),(0,D.jsx)(`div`,{className:`s-det-body`,children:e.body.map((e,t)=>(0,D.jsx)(`p`,{children:e},t))})]})},e.date))})]})]})]})}function Z(){let{repos:e,activity:t,live:n}=y(),r=t.slice(0,6);return(0,D.jsx)(`section`,{className:`s-sec s-gh`,id:`github`,"aria-labelledby":`gh-h`,children:(0,D.jsxs)(`div`,{className:`s-field s-gh-field`,children:[(0,D.jsxs)(`div`,{className:`s-gh-head`,children:[(0,D.jsx)(`h2`,{id:`gh-h`,className:`s-h2`,children:`Live from GitHub`}),(0,D.jsxs)(`a`,{className:`s-link`,href:h.href,children:[`github.com/`,h.user,(0,D.jsx)(i,{"aria-hidden":`true`,size:20})]})]}),(0,D.jsxs)(`div`,{className:`s-gh-cols${r.length?``:` is-solo`}`,children:[r.length>0&&(0,D.jsxs)(`div`,{children:[(0,D.jsx)(`h3`,{className:`s-h3`,children:`Latest commits`}),(0,D.jsx)(`ol`,{className:`s-commits`,children:r.map((e,t)=>(0,D.jsxs)(`li`,{children:[(0,D.jsx)(`a`,{href:e.href,className:`s-commit-msg`,children:e.message}),(0,D.jsxs)(`span`,{className:`s-commit-meta`,children:[e.repo,`, `,b(e.at)]})]},e.href+t))})]}),(0,D.jsxs)(`div`,{children:[(0,D.jsx)(`h3`,{className:`s-h3`,children:n?`Pushed to most recently`:`Repositories`}),(0,D.jsx)(`ul`,{className:`s-repos`,children:e.slice(0,6).map(e=>(0,D.jsxs)(`li`,{children:[(0,D.jsx)(`a`,{href:e.href,className:`s-repo-name`,children:e.name}),e.description&&(0,D.jsx)(`span`,{className:`s-repo-desc`,children:e.description}),e.language&&(0,D.jsx)(`span`,{className:`s-repo-lang`,children:e.language})]},e.name))})]})]})]})})}function Q(){v(`stretch`);let e=[(0,E.useRef)(null),(0,E.useRef)(null)],t=t=>{let n=e[1-t].current;n&&window.setTimeout(()=>n.tug(.5,t===0?.3:.7,0,t===0?-110:110,1e3),140)};return(0,D.jsxs)(`div`,{className:`v-stretch`,children:[(0,D.jsx)(`a`,{className:`skip-x`,href:`#main`,children:`Skip to content`}),(0,D.jsxs)(`header`,{className:`s-top`,children:[(0,D.jsx)(`a`,{href:`#main`,className:`s-mark`,children:`Armaan Seth`}),(0,D.jsx)(`nav`,{"aria-label":`Sections`,children:(0,D.jsx)(`ul`,{className:`s-nav`,children:le.map(([e,t])=>(0,D.jsx)(`li`,{children:(0,D.jsx)(`a`,{href:`#${e}`,children:t})},e))})})]}),(0,D.jsxs)(`main`,{id:`main`,children:[(0,D.jsxs)(`section`,{className:`s-hero`,"aria-labelledby":`name-h`,children:[(0,D.jsx)(W,{text:c.name,as:`h1`,id:`name-h`,phoneSplit:[1,1],tug:`load`,room:.7}),(0,D.jsxs)(`div`,{className:`s-field s-intro`,children:[(0,D.jsx)(`p`,{className:`s-lede`,children:c.line}),(0,D.jsxs)(`p`,{className:`s-dislike`,children:[`One thing he dislikes: `,J,`. `,(0,D.jsx)(`strong`,{children:`Pull.`})]})]})]}),(0,D.jsxs)(`section`,{className:`s-sec s-debate`,id:`debate`,"aria-labelledby":`debate-h`,children:[(0,D.jsx)(`h2`,{id:`debate-h`,className:`sr-only-x`,children:`Debate`}),u.wins.map((n,r)=>(0,D.jsxs)(`div`,{className:`s-win`,children:[(0,D.jsx)(W,{text:n.title,as:`h3`,max:280,room:.55,handleRef:e[r],onGrab:()=>t(r)}),(0,D.jsxs)(`p`,{className:`s-field s-win-line`,children:[(0,D.jsx)(`span`,{className:`s-win-event`,children:n.event}),(0,D.jsxs)(`span`,{className:`s-win-where`,children:[n.where,`, `,n.when]})]})]},n.where)),(0,D.jsxs)(`div`,{className:`s-team`,children:[(0,D.jsxs)(`article`,{className:`s-field s-team-field`,children:[(0,D.jsx)(`p`,{className:`s-role`,children:u.team.role}),(0,D.jsx)(`h3`,{className:`s-h2`,children:u.team.name}),(0,D.jsx)(`p`,{className:`s-body-lg`,children:u.team.line}),(0,D.jsx)(`p`,{className:`s-body`,children:u.team.record}),(0,D.jsxs)(`p`,{className:`s-links-row`,children:[(0,D.jsxs)(`a`,{className:`s-link`,href:u.team.href,children:[Y(u.team.href),(0,D.jsx)(i,{"aria-hidden":`true`,size:20})]}),(0,D.jsxs)(`a`,{className:`s-link`,href:u.team.github,children:[`The code`,(0,D.jsx)(i,{"aria-hidden":`true`,size:20})]})]})]}),(0,D.jsxs)(`div`,{className:`s-next`,children:[(0,D.jsx)(`h3`,{className:`s-h3`,children:`Up next`}),(0,D.jsx)(`ul`,{children:u.next.map(e=>(0,D.jsxs)(`li`,{children:[(0,D.jsx)(`span`,{className:`s-next-where`,children:e.where}),(0,D.jsx)(`span`,{className:`s-next-event`,children:e.event})]},e.where))})]})]})]}),(0,D.jsxs)(`section`,{className:`s-sec s-research`,id:`research`,"aria-labelledby":`paper-h`,children:[(0,D.jsx)(W,{text:K.short,id:`paper-h`,split:[2,2],phoneSplit:[2,1,1],max:240}),(0,D.jsxs)(`div`,{className:`s-field s-paper`,children:[(0,D.jsx)(`p`,{className:`s-paper-title`,children:K.title}),(0,D.jsxs)(`p`,{className:`s-paper-status`,children:[K.status,`, `,K.pages,` pages`]}),(0,D.jsxs)(`blockquote`,{className:`s-epi`,children:[(0,D.jsx)(`p`,{children:K.epigraph.text}),(0,D.jsx)(`footer`,{children:K.epigraph.source})]}),(0,D.jsx)(`p`,{className:`s-body-lg s-abstract`,children:K.abstract}),(0,D.jsx)(`h3`,{className:`s-h3`,children:`Keywords`}),(0,D.jsx)(`p`,{className:`s-keys`,children:K.keywords.join(`, `)}),(0,D.jsx)(`p`,{className:`s-links-row`,children:K.links.map(e=>(0,D.jsxs)(`a`,{className:`s-link`,href:e.href,children:[e.label,(0,D.jsx)(i,{"aria-hidden":`true`,size:20})]},e.label))})]}),(0,D.jsxs)(`div`,{className:`s-ladders`,children:[(0,D.jsx)(`h3`,{className:`s-h3 s-ladders-h`,children:`The three ladders`}),(0,D.jsx)(`ol`,{children:K.ladders.map((e,t)=>(0,D.jsxs)(`li`,{className:`s-field s-rung`,style:{"--i":t},children:[(0,D.jsx)(`span`,{className:`s-rung-who`,children:e.who}),(0,D.jsx)(`span`,{className:`s-rung-when`,children:e.when}),(0,D.jsx)(`span`,{className:`s-rung-where`,children:e.where})]},e.who))})]}),(0,D.jsxs)(`div`,{className:`s-field s-wess`,children:[(0,D.jsx)(`h3`,{className:`s-h3`,children:q.short}),(0,D.jsxs)(`p`,{className:`s-body`,children:[q.title,`. `,q.status,`.`]}),(0,D.jsx)(`p`,{className:`s-body`,children:q.abstract})]})]}),(0,D.jsxs)(`section`,{className:`s-sec s-work`,id:`work`,"aria-labelledby":`work-h`,children:[(0,D.jsx)(`h2`,{id:`work-h`,className:`s-h2 s-work-h`,children:`The work`}),(0,D.jsx)(`ul`,{className:`s-works`,children:l.map(e=>(0,D.jsxs)(`li`,{className:`s-field s-wk s-wk-${e.slug}`,children:[(0,D.jsx)(`div`,{className:`s-shot`,children:(0,D.jsx)(`img`,{src:G(e.img),alt:`${e.name}, screenshot`,loading:`lazy`,width:1200,height:680})}),(0,D.jsxs)(`div`,{className:`s-wk-text`,children:[(0,D.jsx)(`h3`,{className:`s-wk-name`,children:e.name}),(0,D.jsx)(`p`,{className:`s-wk-kind`,children:e.kind}),(0,D.jsx)(`p`,{className:`s-body`,children:e.line}),(0,D.jsx)(`p`,{className:`s-wk-stack`,children:e.stack}),e.href?(0,D.jsxs)(`a`,{className:`s-link`,href:e.href,children:[Y(e.href),(0,D.jsx)(i,{"aria-hidden":`true`,size:20})]}):(0,D.jsx)(`p`,{className:`s-wk-private`,children:`No public link`})]})]},e.slug))})]}),(0,D.jsx)(X,{}),(0,D.jsx)(Z,{}),(0,D.jsxs)(`section`,{className:`s-sec s-about`,id:`about`,"aria-labelledby":`about-h`,children:[(0,D.jsxs)(`div`,{className:`s-field s-about-main`,children:[(0,D.jsx)(`h2`,{id:`about-h`,className:`s-h2`,children:`About`}),c.about.map((e,t)=>(0,D.jsx)(`p`,{className:`s-body-lg`,children:e},t)),(0,D.jsx)(`p`,{className:`s-body s-aside`,children:c.aside})]}),(0,D.jsxs)(`div`,{className:`s-field s-now`,children:[(0,D.jsx)(`h3`,{className:`s-h3`,children:`Now`}),(0,D.jsx)(`p`,{className:`s-now-t`,children:s.reading.title}),(0,D.jsx)(`p`,{className:`s-body`,children:s.reading.body}),(0,D.jsx)(`ul`,{className:`s-shelves`,children:s.reading.shelves.map(e=>(0,D.jsx)(`li`,{children:e},e))}),(0,D.jsx)(`p`,{className:`s-now-t`,children:s.club.title}),(0,D.jsx)(`p`,{className:`s-body`,children:s.club.body}),(0,D.jsx)(`p`,{className:`s-body s-status`,children:s.status})]})]}),(0,D.jsxs)(`section`,{className:`s-sec s-record`,"aria-labelledby":`record-h`,children:[(0,D.jsxs)(`div`,{className:`s-field s-record-field`,children:[(0,D.jsx)(`h2`,{id:`record-h`,className:`s-h2`,children:`Record`}),(0,D.jsx)(`ul`,{className:`s-honors`,children:o.map(e=>(0,D.jsxs)(`li`,{children:[(0,D.jsx)(`span`,{className:`s-honor`,children:e.what}),(0,D.jsx)(`span`,{className:`s-honor-d`,children:e.detail})]},e.what))})]}),(0,D.jsx)(`ul`,{className:`s-awards`,children:g.map(e=>(0,D.jsx)(`li`,{children:(0,D.jsxs)(`a`,{href:e.href,className:`s-award`,children:[(0,D.jsx)(`img`,{src:G(e.img),alt:`WD Awards certificate for ${e.site}`,loading:`lazy`,width:720,height:1018}),(0,D.jsx)(`span`,{className:`s-award-site`,children:e.site}),(0,D.jsx)(`span`,{className:`s-award-note`,children:e.note})]})},e.site))})]}),(0,D.jsxs)(`section`,{className:`s-sec s-off`,"aria-labelledby":`off-h`,children:[(0,D.jsx)(`h2`,{id:`off-h`,className:`s-h2`,children:`Off the record`}),(0,D.jsxs)(`div`,{className:`s-off-cols`,children:[(0,D.jsxs)(`div`,{className:`s-field`,children:[(0,D.jsx)(`h3`,{className:`s-h3`,children:`Likes`}),(0,D.jsx)(`ul`,{children:d.map(e=>(0,D.jsx)(`li`,{children:e},e))})]}),(0,D.jsxs)(`div`,{className:`s-field`,children:[(0,D.jsx)(`h3`,{className:`s-h3`,children:`Dislikes`}),(0,D.jsx)(`ul`,{children:a.map(e=>(0,D.jsx)(`li`,{children:e},e))})]}),(0,D.jsxs)(`div`,{className:`s-field`,children:[(0,D.jsx)(`h3`,{className:`s-h3`,children:`Favourites`}),(0,D.jsx)(`ul`,{children:f.map(e=>(0,D.jsx)(`li`,{children:e},e))})]}),(0,D.jsxs)(`div`,{className:`s-field`,children:[(0,D.jsx)(`h3`,{className:`s-h3`,children:`Courses`}),(0,D.jsx)(`ul`,{children:m.map(e=>(0,D.jsxs)(`li`,{children:[(0,D.jsxs)(`strong`,{children:[e.provider,` `,e.title]}),` `,e.note]},e.title))})]})]})]}),(0,D.jsxs)(`section`,{className:`s-sec s-end`,id:`contact`,"aria-labelledby":`end-h`,children:[(0,D.jsx)(W,{text:J,id:`end-h`,split:[3,3],phoneSplit:[2,2,2],max:220,tug:`arrive`,room:.6}),(0,D.jsx)(`ul`,{className:`s-contact`,children:_.map(e=>(0,D.jsxs)(`li`,{children:[(0,D.jsx)(`span`,{className:`s-c-label`,children:e.label}),e.href?(0,D.jsx)(`a`,{className:`s-c-val`,href:e.href,children:e.value}):(0,D.jsx)(`span`,{className:`s-c-val`,children:e.value})]},e.label))})]})]}),(0,D.jsxs)(`footer`,{className:`s-foot`,children:[(0,D.jsx)(`p`,{children:`Draft 85 of the portfolio. Not the live site.`}),(0,D.jsx)(`p`,{children:`Rubber type adapted from React Bits ElasticMesh. Set in Archivo and Hanken Grotesk.`})]})]})}export{Q as default};