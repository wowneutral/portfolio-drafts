import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{t}from"./extends-CvVTau-c.js";import{U as n,no as r}from"./three.core-BF58tRDi.js";import{n as i}from"./jsx-runtime-C3cWAN_r.js";import{s as a,u as o}from"./react-three-fiber.esm-DL1a9zZf.js";import{t as s}from"./shaderMaterial-CFiosO_P.js";import{t as c}from"./Texture-Co6y3QFr.js";import{t as l}from"./constants-C-UhYjcR.js";var u=e(i()),d=s({color:new n(`white`),scale:new r(1,1),imageBounds:new r(1,1),resolution:1024,map:null,zoom:1,radius:0,grayscale:0,opacity:1},`
  varying vec2 vUv;
  varying vec2 vPos;
  void main() {
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.);
    vUv = uv;
    vPos = position.xy;
  }
`,`
  // mostly from https://gist.github.com/statico/df64c5d167362ecf7b34fca0b1459a44
  varying vec2 vUv;
  varying vec2 vPos;
  uniform vec2 scale;
  uniform vec2 imageBounds;
  uniform float resolution;
  uniform vec3 color;
  uniform sampler2D map;
  uniform float radius;
  uniform float zoom;
  uniform float grayscale;
  uniform float opacity;
  const vec3 luma = vec3(.299, 0.587, 0.114);
  vec4 toGrayscale(vec4 color, float intensity) {
    return vec4(mix(color.rgb, vec3(dot(color.rgb, luma)), intensity), color.a);
  }
  vec2 aspect(vec2 size) {
    return size / min(size.x, size.y);
  }
  
  const float PI = 3.14159265;
    
  // from https://iquilezles.org/articles/distfunctions
  float udRoundBox( vec2 p, vec2 b, float r ) {
    return length(max(abs(p)-b+r,0.0))-r;
  }

  void main() {
    vec2 s = aspect(scale);
    vec2 i = aspect(imageBounds);
    float rs = s.x / s.y;
    float ri = i.x / i.y;
    vec2 new = rs < ri ? vec2(i.x * s.y / i.y, s.y) : vec2(s.x, i.y * s.x / i.x);
    vec2 offset = (rs < ri ? vec2((new.x - s.x) / 2.0, 0.0) : vec2(0.0, (new.y - s.y) / 2.0)) / new;
    vec2 uv = vUv * s / new + offset;
    vec2 zUv = (uv - vec2(0.5, 0.5)) / zoom + vec2(0.5, 0.5);

    vec2 res = vec2(scale * resolution);
    vec2 halfRes = 0.5 * res;
    float b = udRoundBox(vUv.xy * res - halfRes, halfRes, resolution * radius);    
	  vec3 a = mix(vec3(1.0,0.0,0.0), vec3(0.0,0.0,0.0), smoothstep(0.0, 1.0, b));
    gl_FragColor = toGrayscale(texture2D(map, zUv) * vec4(color, opacity * a), grayscale);
    
    #include <tonemapping_fragment>
    #include <${l>=154?`colorspace_fragment`:`encodings_fragment`}>
  }
`),f=u.forwardRef(({children:e,color:n,segments:r=1,scale:i=1,zoom:s=1,grayscale:c=0,opacity:l=1,radius:f=0,texture:p,toneMapped:m,transparent:h,side:g,..._},v)=>{a({ImageMaterial:d});let y=u.useRef(null),b=o(e=>e.size),x=Array.isArray(i)?[i[0],i[1]]:[i,i],S=[p.image.width,p.image.height],C=Math.max(b.width,b.height);return u.useImperativeHandle(v,()=>y.current,[]),u.useLayoutEffect(()=>{y.current.geometry.parameters&&y.current.material.scale.set(x[0]*y.current.geometry.parameters.width,x[1]*y.current.geometry.parameters.height)},[x[0],x[1]]),u.createElement(`mesh`,t({ref:y,scale:Array.isArray(i)?[...i,1]:i},_),u.createElement(`planeGeometry`,{args:[1,1,r,r]}),u.createElement(`imageMaterial`,{color:n,map:p,zoom:s,grayscale:c,opacity:l,scale:x,imageBounds:S,resolution:C,radius:f,toneMapped:m,transparent:h,side:g,key:d.key}),e)}),p=u.forwardRef(({url:e,...n},r)=>{let i=c(e);return u.createElement(f,t({},n,{texture:i,ref:r}))}),m=u.forwardRef(({url:e,...n},r)=>u.createElement(f,t({},n,{ref:r}))),h=u.forwardRef((e,n)=>{if(e.url)return u.createElement(p,t({},e,{ref:n}));if(e.texture)return u.createElement(m,t({},e,{ref:n}));throw Error(`<Image /> requires a url or texture`)});export{h as t};