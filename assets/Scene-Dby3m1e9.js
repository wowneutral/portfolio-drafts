import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{n as t,t as n}from"./jsx-runtime-C3cWAN_r.js";import{c as r,t as i,u as a}from"./react-three-fiber.esm-DL1a9zZf.js";import{n as o}from"./three.module-CxBI3RDy.js";import{t as s}from"./Gltf-DwyL6eX4.js";import{o as c,r as l,s as u}from"./dist-C5Z9UMS6.js";import{t as d}from"./maath.esm-C0cxtfkh.js";import{n as f}from"./scroll-DVpCkw6r.js";import{E as p,Ga as m,ro as h,tr as g}from"./three.core-BF58tRDi.js";import{n as _,r as v}from"./stage-RPkPs4yA.js";var y=e(t()),b=({focus:e=0,size:t=25,samples:n=10},r)=>{let i=r?`unpackRGBAToDepth( texture2D( shadowMap, uv + offset ) )`:`texture2D( shadowMap, uv + offset ).r`;return`
#define PENUMBRA_FILTER_SIZE float(${t})
#define RGB_NOISE_FUNCTION(uv) (randRGB(uv))
vec3 randRGB(vec2 uv) {
  return vec3(
    fract(sin(dot(uv, vec2(12.75613, 38.12123))) * 13234.76575),
    fract(sin(dot(uv, vec2(19.45531, 58.46547))) * 43678.23431),
    fract(sin(dot(uv, vec2(23.67817, 78.23121))) * 93567.23423)
  );
}

vec3 lowPassRandRGB(vec2 uv) {
  // 3x3 convolution (average)
  // can be implemented as separable with an extra buffer for a total of 6 samples instead of 9
  vec3 result = vec3(0);
  result += RGB_NOISE_FUNCTION(uv + vec2(-1.0, -1.0));
  result += RGB_NOISE_FUNCTION(uv + vec2(-1.0,  0.0));
  result += RGB_NOISE_FUNCTION(uv + vec2(-1.0, +1.0));
  result += RGB_NOISE_FUNCTION(uv + vec2( 0.0, -1.0));
  result += RGB_NOISE_FUNCTION(uv + vec2( 0.0,  0.0));
  result += RGB_NOISE_FUNCTION(uv + vec2( 0.0, +1.0));
  result += RGB_NOISE_FUNCTION(uv + vec2(+1.0, -1.0));
  result += RGB_NOISE_FUNCTION(uv + vec2(+1.0,  0.0));
  result += RGB_NOISE_FUNCTION(uv + vec2(+1.0, +1.0));
  result *= 0.111111111; // 1.0 / 9.0
  return result;
}
vec3 highPassRandRGB(vec2 uv) {
  // by subtracting the low-pass signal from the original signal, we're being left with the high-pass signal
  // hp(x) = x - lp(x)
  return RGB_NOISE_FUNCTION(uv) - lowPassRandRGB(uv) + 0.5;
}


vec2 pcssVogelDiskSample(int sampleIndex, int sampleCount, float angle) {
  const float goldenAngle = 2.399963f; // radians
  float r = sqrt(float(sampleIndex) + 0.5f) / sqrt(float(sampleCount));
  float theta = float(sampleIndex) * goldenAngle + angle;
  float sine = sin(theta);
  float cosine = cos(theta);
  return vec2(cosine, sine) * r;
}
float penumbraSize( const in float zReceiver, const in float zBlocker ) { // Parallel plane estimation
  return (zReceiver - zBlocker) / zBlocker;
}
float findBlocker(sampler2D shadowMap, vec2 uv, float compare, float angle) {
  float texelSize = 1.0 / float(textureSize(shadowMap, 0).x);
  float blockerDepthSum = float(${e});
  float blockers = 0.0;

  int j = 0;
  vec2 offset = vec2(0.);
  float depth = 0.;

  #pragma unroll_loop_start
  for(int i = 0; i < ${n}; i ++) {
    offset = (pcssVogelDiskSample(j, ${n}, angle) * texelSize) * 2.0 * PENUMBRA_FILTER_SIZE;
    depth = ${i};
    if (depth < compare) {
      blockerDepthSum += depth;
      blockers++;
    }
    j++;
  }
  #pragma unroll_loop_end

  if (blockers > 0.0) {
    return blockerDepthSum / blockers;
  }
  return -1.0;
}

        
float vogelFilter(sampler2D shadowMap, vec2 uv, float zReceiver, float filterRadius, float angle) {
  float texelSize = 1.0 / float(textureSize(shadowMap, 0).x);
  float shadow = 0.0f;
  int j = 0;
  vec2 vogelSample = vec2(0.0);
  vec2 offset = vec2(0.0);
  #pragma unroll_loop_start
  for (int i = 0; i < ${n}; i++) {
    vogelSample = pcssVogelDiskSample(j, ${n}, angle) * texelSize;
    offset = vogelSample * (1.0 + filterRadius * float(${t}));
    shadow += step( zReceiver, ${i} );
    j++;
  }
  #pragma unroll_loop_end
  return shadow * 1.0 / ${n}.0;
}

float PCSS (sampler2D shadowMap, vec4 coords) {
  vec2 uv = coords.xy;
  float zReceiver = coords.z; // Assumed to be eye-space z in this code
  float angle = highPassRandRGB(gl_FragCoord.xy).r * PI2;
  float avgBlockerDepth = findBlocker(shadowMap, uv, zReceiver, angle);
  if (avgBlockerDepth == -1.0) {
    return 1.0;
  }
  float penumbraRatio = penumbraSize(zReceiver, avgBlockerDepth);
  return vogelFilter(shadowMap, uv, zReceiver, 1.25 * penumbraRatio, angle);
}`};function x(e,t,n){t.traverse(t=>{t.material&&(Array.isArray(t.material)?t.material:[t.material]).forEach(t=>{e.properties.remove(t),t.dispose==null||t.dispose(),t.needsUpdate=!0})}),e.info.programs.length=0,e.compile(t,n)}function S({focus:e=0,samples:t=10,size:n=25}){let r=a(e=>e.gl),i=a(e=>e.scene),s=a(e=>e.camera);return y.useEffect(()=>{let a=o.shadowmap_pars_fragment,c=!a.includes(`sampler2DShadow`),l=a.lastIndexOf(`float getShadow( sampler2D shadowMap`),u=a.indexOf(`if ( frustumTest ) {`,l)+20;if(l<0||u<20){console.warn(`[SoftShadows] Could not find injection point in shadow shader`);return}let d=r.shadowMap.type;c||(r.shadowMap.type=0);let f=a.slice(l,u).includes(`shadowIntensity`)?`return mix( 1.0, PCSS( shadowMap, shadowCoord ), shadowIntensity );`:`return PCSS( shadowMap, shadowCoord );`,p=(a.slice(0,u)+`
`+f+a.slice(u)).replace(`#ifdef USE_SHADOWMAP`,`#ifdef USE_SHADOWMAP
`+b({size:n,samples:t,focus:e},c));return o.shadowmap_pars_fragment=p,x(r,i,s),()=>{o.shadowmap_pars_fragment=a,r.shadowMap.type=d,x(r,i,s)}},[e,n,t]),null}var C=`
uniform float uCell;
float bayer2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
#define bayer4(a) (bayer2(0.5 * (a)) * 0.25 + bayer2(a))
#define bayer8(a) (bayer4(0.5 * (a)) * 0.25 + bayer2(a))
void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  // Ink is #0a0a0b through the exact sRGB curve (its linear toe), so the room meets the page's black with no seam.
  vec3 ink = vec3(0.003035, 0.003035, 0.003347), paper = pow(vec3(233.0, 229.0, 220.0) / 255.0, vec3(2.2));
  if (depth > 0.99999) { outputColor = vec4(ink, 1.0); return; }
  float lum = pow(clamp(dot(inputColor.rgb, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0), 1.0 / 2.2);
  lum = smoothstep(0.05, 0.97, lum);
  float th = bayer8(floor(uv * resolution / uCell));
  float on = step(th + 0.004, lum);
  outputColor = vec4(mix(ink, paper, on), 1.0);
}`,w=class extends c{constructor(){super(`DitherEffect`,C,{attributes:u.DEPTH,uniforms:new Map([[`uCell`,new m(2)]])})}},T=n(),E=`./bust/plato.glb`,D=2.6,O=.8,k=new h,A=new h(-3.4,4.2,-4.4),j=new h(.4,5.2,-6.2),M=new h,N=new h;function P(){let{scene:e}=s(E),t=(0,y.useRef)(null),n=(0,y.useRef)(null),{size:i,camera:o}=a();(0,y.useEffect)(()=>{n.current=document.querySelector(`.v-bust .live-tag`)},[]);let{model:c,front:l,base:u,half:m}=(0,y.useMemo)(()=>{let t=e;t.traverse(e=>{let t=e;if(t.isMesh){t.castShadow=!0,t.receiveShadow=!0;let e=t.material;e.envMapIntensity=0,e.side=0}}),t.position.set(0,0,0),t.scale.setScalar(1),t.updateMatrixWorld(!0);let n=new p().setFromObject(t),r=D/(n.max.y-n.min.y),i=n.getCenter(new h);t.scale.setScalar(r),t.position.set(-i.x*r,-i.y*r,-i.z*r);let a=(n.max.x-n.min.x)*r/2;return{model:t,front:(n.max.z-i.z)*r*.7,base:-2.6/2,half:a}},[e]);return(0,y.useEffect)(()=>{v.loaded=!0,v.onLoad?.()},[]),r((e,r)=>{let a=_(f.y);d.damp(v,`kick`,0,1.1,r);let s=Math.max(O,a.yaw+v.px*(Math.PI/10)*(a.light<1.5?1:.3)+v.kick);d.dampE(t.current.rotation,[v.py*.035,s,0],1.5,r);let c=t.current.rotation.y,p=g.clamp((Math.cos(c)+.1)/.35,0,1)*(v.capture||window.innerWidth<=820&&f.y>8?0:1),h=n.current;if(h&&(h.style.opacity=p.toFixed(3),h.style.visibility=p<.02?`hidden`:`visible`,p>0)){N.set(m*.3,u+.16,l).applyMatrix4(t.current.matrixWorld).project(o);let e=(N.x+1)/2*i.width,n=(1-N.y)/2*i.height,r=Math.min(1,i.height/820);h.style.transform=`translate3d(${e.toFixed(1)}px,${n.toFixed(1)}px,0) translate(-50%,-50%) perspective(700px) rotateY(${c.toFixed(4)}rad) scale(${r.toFixed(3)})`}}),(0,T.jsx)(`group`,{ref:t,children:(0,T.jsx)(`primitive`,{object:c})})}function F(){let e=(0,y.useRef)(null),t=(0,y.useRef)(null);return r((n,r)=>{let i=_(f.y);k.set(3.2+v.px*4,4.6+v.py*1.4,6);let a=i.light;a<=1?M.lerpVectors(k,A,a):M.lerpVectors(A,j,a-1),d.damp3(e.current.position,M,a>.05?.6:.2,r),e.current.target.position.set(0,.5,0),e.current.target.updateMatrixWorld(),d.damp(e.current,`intensity`,a>1.5?22:9.5,.8,r),d.damp(t.current,`intensity`,a>1.5?0:.25,.8,r)}),(0,T.jsxs)(T.Fragment,{children:[(0,T.jsx)(`spotLight`,{ref:e,position:[3,3.4,6.5],angle:.3,penumbra:.6,decay:0,intensity:9.5,castShadow:!0,"shadow-mapSize":1024,"shadow-bias":-4e-4,"shadow-normalBias":.02}),(0,T.jsx)(`pointLight`,{ref:t,position:[-6,-2,4],intensity:.25,decay:0})]})}function I(){let e=(0,y.useMemo)(()=>new w,[]);return r(()=>{e.uniforms.get(`uCell`).value=_(f.y).cell}),(0,T.jsx)(`primitive`,{object:e,dispose:null})}function L(){return(0,T.jsxs)(i,{dpr:1,shadows:{type:1},gl:{antialias:!1,powerPreference:`high-performance`},camera:{position:[0,.35,9],fov:30,near:.1,far:40},onCreated:({camera:e})=>e.lookAt(0,.05,0),style:{touchAction:`pan-y`},children:[(0,T.jsx)(`color`,{attach:`background`,args:[`#0a0a0b`]}),(0,T.jsx)(`fog`,{attach:`fog`,args:[`#0a0a0b`,8.5,13.5]}),(0,T.jsx)(S,{size:18,samples:8,focus:.6}),(0,T.jsx)(F,{}),(0,T.jsx)(y.Suspense,{fallback:null,children:(0,T.jsx)(P,{})}),(0,T.jsxs)(`mesh`,{"rotation-x":-Math.PI/2,position:[0,-2.6/2,0],receiveShadow:!0,children:[(0,T.jsx)(`circleGeometry`,{args:[6.5,96]}),(0,T.jsx)(`meshStandardMaterial`,{color:`#202020`,roughness:1})]}),(0,T.jsx)(l,{multisampling:0,children:(0,T.jsx)(I,{})})]})}s.preload(E);export{L as default};