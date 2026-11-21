import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{n as t,t as n}from"./jsx-runtime-C3cWAN_r.js";import{a as r,c as i,o as a,t as o}from"./react-three-fiber.esm-Cy0dJUhA.js";import{n as s,t as c}from"./Lightformer-eA3VOYP9.js";import{t as l}from"./Image-DGMaGG5c.js";import{t as u}from"./extends-CvVTau-c.js";import{A as d,Ar as f,F as p,Ga as m,L as h,Qi as g,Rn as _,Wr as v,Yt as y,ar as b,bt as x,do as S,ea as C,io as w,ir as T,j as E,jt as D,kr as O,mr as k,no as A,ro as j,ta as M,to as N,tr as P,vt as ee}from"./three.core-BF58tRDi.js";import{t as F}from"./constants-CxkTOxBK.js";import{t as I}from"./Text-ICX0M3S4.js";import{t as L}from"./maath.esm-YnM7chiv.js";import{i as R}from"./content-Do9Hx9qB.js";import{t as z}from"./bodoni-moda-latin-500-normal-BCeqB0O8.js";import{t as B}from"./data-sYdAf2tD.js";var V=e(t());function H(e,t=`pointer`,n=`auto`,r=document.body){V.useEffect(()=>{if(e)return r.style.cursor=t,()=>void(r.style.cursor=n)},[e])}var U=class extends M{constructor(e=new A){super({uniforms:{inputBuffer:new m(null),depthBuffer:new m(null),resolution:new m(new A),texelSize:new m(new A),halfTexelSize:new m(new A),kernel:new m(0),scale:new m(1),cameraNear:new m(0),cameraFar:new m(1),minDepthThreshold:new m(0),maxDepthThreshold:new m(1),depthScale:new m(0),depthToBlurRatioBias:new m(.25)},fragmentShader:`#include <common>
        #include <dithering_pars_fragment>      
        uniform sampler2D inputBuffer;
        uniform sampler2D depthBuffer;
        uniform float cameraNear;
        uniform float cameraFar;
        uniform float minDepthThreshold;
        uniform float maxDepthThreshold;
        uniform float depthScale;
        uniform float depthToBlurRatioBias;
        varying vec2 vUv;
        varying vec2 vUv0;
        varying vec2 vUv1;
        varying vec2 vUv2;
        varying vec2 vUv3;

        void main() {
          float depthFactor = 0.0;
          
          #ifdef USE_DEPTH
            vec4 depth = texture2D(depthBuffer, vUv);
            depthFactor = smoothstep(minDepthThreshold, maxDepthThreshold, 1.0-(depth.r * depth.a));
            depthFactor *= depthScale;
            depthFactor = max(0.0, min(1.0, depthFactor + 0.25));
          #endif
          
          vec4 sum = texture2D(inputBuffer, mix(vUv0, vUv, depthFactor));
          sum += texture2D(inputBuffer, mix(vUv1, vUv, depthFactor));
          sum += texture2D(inputBuffer, mix(vUv2, vUv, depthFactor));
          sum += texture2D(inputBuffer, mix(vUv3, vUv, depthFactor));
          gl_FragColor = sum * 0.25 ;

          #include <dithering_fragment>
          #include <tonemapping_fragment>
          #include <${F>=154?`colorspace_fragment`:`encodings_fragment`}>
        }`,vertexShader:`uniform vec2 texelSize;
        uniform vec2 halfTexelSize;
        uniform float kernel;
        uniform float scale;
        varying vec2 vUv;
        varying vec2 vUv0;
        varying vec2 vUv1;
        varying vec2 vUv2;
        varying vec2 vUv3;

        void main() {
          vec2 uv = position.xy * 0.5 + 0.5;
          vUv = uv;

          vec2 dUv = (texelSize * vec2(kernel) + halfTexelSize) * scale;
          vUv0 = vec2(uv.x - dUv.x, uv.y + dUv.y);
          vUv1 = vec2(uv.x + dUv.x, uv.y + dUv.y);
          vUv2 = vec2(uv.x + dUv.x, uv.y - dUv.y);
          vUv3 = vec2(uv.x - dUv.x, uv.y - dUv.y);

          gl_Position = vec4(position.xy, 1.0, 1.0);
        }`,blending:0,depthWrite:!1,depthTest:!1}),this.toneMapped=!1,this.setTexelSize(e.x,e.y),this.kernel=new Float32Array([0,1,2,2,3])}setTexelSize(e,t){this.uniforms.texelSize.value.set(e,t),this.uniforms.halfTexelSize.value.set(e,t).multiplyScalar(.5)}setResolution(e){this.uniforms.resolution.value.copy(e)}},te=class{constructor({gl:e,resolution:t,width:n=500,height:r=500,minDepthThreshold:i=0,maxDepthThreshold:a=1,depthScale:o=0,depthToBlurRatioBias:s=.25}){this.renderToScreen=!1,this.renderTargetA=new S(t,t,{minFilter:_,magFilter:_,stencilBuffer:!1,depthBuffer:!1,type:y}),this.renderTargetB=this.renderTargetA.clone(),this.convolutionMaterial=new U,this.convolutionMaterial.setTexelSize(1/n,1/r),this.convolutionMaterial.setResolution(new A(n,r)),this.scene=new C,this.camera=new p,this.convolutionMaterial.uniforms.minDepthThreshold.value=i,this.convolutionMaterial.uniforms.maxDepthThreshold.value=a,this.convolutionMaterial.uniforms.depthScale.value=o,this.convolutionMaterial.uniforms.depthToBlurRatioBias.value=s,this.convolutionMaterial.defines.USE_DEPTH=o>0;let c=new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),l=new Float32Array([0,0,2,0,0,2]),u=new E;u.setAttribute(`position`,new d(c,3)),u.setAttribute(`uv`,new d(l,2)),this.screen=new b(u,this.convolutionMaterial),this.screen.frustumCulled=!1,this.scene.add(this.screen)}render(e,t,n){let r=this.scene,i=this.camera,a=this.renderTargetA,o=this.renderTargetB,s=this.convolutionMaterial,c=s.uniforms;c.depthBuffer.value=t.depthTexture;let l=s.kernel,u=t,d,f,p;for(f=0,p=l.length-1;f<p;++f)d=f&1?o:a,c.kernel.value=l[f],c.inputBuffer.value=u.texture,e.setRenderTarget(d),e.render(r,i),u=d;c.kernel.value=l[f],c.inputBuffer.value=u.texture,e.setRenderTarget(this.renderToScreen?null:n),e.render(r,i)}},ne=class extends k{constructor(e={}){super(e),this._tDepth={value:null},this._distortionMap={value:null},this._tDiffuse={value:null},this._tDiffuseBlur={value:null},this._textureMatrix={value:null},this._hasBlur={value:!1},this._mirror={value:0},this._mixBlur={value:0},this._blurStrength={value:.5},this._minDepthThreshold={value:.9},this._maxDepthThreshold={value:1},this._depthScale={value:0},this._depthToBlurRatioBias={value:.25},this._distortion={value:1},this._mixContrast={value:1},this.setValues(e)}onBeforeCompile(e){var t;(t=e.defines)!=null&&t.USE_UV||(e.defines.USE_UV=``),e.uniforms.hasBlur=this._hasBlur,e.uniforms.tDiffuse=this._tDiffuse,e.uniforms.tDepth=this._tDepth,e.uniforms.distortionMap=this._distortionMap,e.uniforms.tDiffuseBlur=this._tDiffuseBlur,e.uniforms.textureMatrix=this._textureMatrix,e.uniforms.mirror=this._mirror,e.uniforms.mixBlur=this._mixBlur,e.uniforms.mixStrength=this._blurStrength,e.uniforms.minDepthThreshold=this._minDepthThreshold,e.uniforms.maxDepthThreshold=this._maxDepthThreshold,e.uniforms.depthScale=this._depthScale,e.uniforms.depthToBlurRatioBias=this._depthToBlurRatioBias,e.uniforms.distortion=this._distortion,e.uniforms.mixContrast=this._mixContrast,e.vertexShader=`
        uniform mat4 textureMatrix;
        varying vec4 my_vUv;
      ${e.vertexShader}`,e.vertexShader=e.vertexShader.replace(`#include <project_vertex>`,`#include <project_vertex>
        my_vUv = textureMatrix * vec4( position, 1.0 );
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );`),e.fragmentShader=`
        uniform sampler2D tDiffuse;
        uniform sampler2D tDiffuseBlur;
        uniform sampler2D tDepth;
        uniform sampler2D distortionMap;
        uniform float distortion;
        uniform float cameraNear;
			  uniform float cameraFar;
        uniform bool hasBlur;
        uniform float mixBlur;
        uniform float mirror;
        uniform float mixStrength;
        uniform float minDepthThreshold;
        uniform float maxDepthThreshold;
        uniform float mixContrast;
        uniform float depthScale;
        uniform float depthToBlurRatioBias;
        varying vec4 my_vUv;
        ${e.fragmentShader}`,e.fragmentShader=e.fragmentShader.replace(`#include <emissivemap_fragment>`,`#include <emissivemap_fragment>

      float distortionFactor = 0.0;
      #ifdef USE_DISTORTION
        distortionFactor = texture2D(distortionMap, vUv).r * distortion;
      #endif

      vec4 new_vUv = my_vUv;
      new_vUv.x += distortionFactor;
      new_vUv.y += distortionFactor;

      vec4 base = texture2DProj(tDiffuse, new_vUv);
      vec4 blur = texture2DProj(tDiffuseBlur, new_vUv);

      vec4 merge = base;

      #ifdef USE_NORMALMAP
        vec2 normal_uv = vec2(0.0);
        vec4 normalColor = texture2D(normalMap, vUv * normalScale);
        vec3 my_normal = normalize( vec3( normalColor.r * 2.0 - 1.0, normalColor.b,  normalColor.g * 2.0 - 1.0 ) );
        vec3 coord = new_vUv.xyz / new_vUv.w;
        normal_uv = coord.xy + coord.z * my_normal.xz * 0.05;
        vec4 base_normal = texture2D(tDiffuse, normal_uv);
        vec4 blur_normal = texture2D(tDiffuseBlur, normal_uv);
        merge = base_normal;
        blur = blur_normal;
      #endif

      float depthFactor = 0.0001;
      float blurFactor = 0.0;

      #ifdef USE_DEPTH
        vec4 depth = texture2DProj(tDepth, new_vUv);
        depthFactor = smoothstep(minDepthThreshold, maxDepthThreshold, 1.0-(depth.r * depth.a));
        depthFactor *= depthScale;
        depthFactor = max(0.0001, min(1.0, depthFactor));

        #ifdef USE_BLUR
          blur = blur * min(1.0, depthFactor + depthToBlurRatioBias);
          merge = merge * min(1.0, depthFactor + 0.5);
        #else
          merge = merge * depthFactor;
        #endif

      #endif

      float reflectorRoughnessFactor = roughness;
      #ifdef USE_ROUGHNESSMAP
        vec4 reflectorTexelRoughness = texture2D( roughnessMap, vUv );
        reflectorRoughnessFactor *= reflectorTexelRoughness.g;
      #endif

      #ifdef USE_BLUR
        blurFactor = min(1.0, mixBlur * reflectorRoughnessFactor);
        merge = mix(merge, blur, blurFactor);
      #endif

      vec4 newMerge = vec4(0.0, 0.0, 0.0, 1.0);
      newMerge.r = (merge.r - 0.5) * mixContrast + 0.5;
      newMerge.g = (merge.g - 0.5) * mixContrast + 0.5;
      newMerge.b = (merge.b - 0.5) * mixContrast + 0.5;

      diffuseColor.rgb = diffuseColor.rgb * ((1.0 - min(1.0, mirror)) + newMerge.rgb * mixStrength);
      `)}get tDiffuse(){return this._tDiffuse.value}set tDiffuse(e){this._tDiffuse.value=e}get tDepth(){return this._tDepth.value}set tDepth(e){this._tDepth.value=e}get distortionMap(){return this._distortionMap.value}set distortionMap(e){this._distortionMap.value=e}get tDiffuseBlur(){return this._tDiffuseBlur.value}set tDiffuseBlur(e){this._tDiffuseBlur.value=e}get textureMatrix(){return this._textureMatrix.value}set textureMatrix(e){this._textureMatrix.value=e}get hasBlur(){return this._hasBlur.value}set hasBlur(e){this._hasBlur.value=e}get mirror(){return this._mirror.value}set mirror(e){this._mirror.value=e}get mixBlur(){return this._mixBlur.value}set mixBlur(e){this._mixBlur.value=e}get mixStrength(){return this._blurStrength.value}set mixStrength(e){this._blurStrength.value=e}get minDepthThreshold(){return this._minDepthThreshold.value}set minDepthThreshold(e){this._minDepthThreshold.value=e}get maxDepthThreshold(){return this._maxDepthThreshold.value}set maxDepthThreshold(e){this._maxDepthThreshold.value=e}get depthScale(){return this._depthScale.value}set depthScale(e){this._depthScale.value=e}get depthToBlurRatioBias(){return this._depthToBlurRatioBias.value}set depthToBlurRatioBias(e){this._depthToBlurRatioBias.value=e}get distortion(){return this._distortion.value}set distortion(e){this._distortion.value=e}get mixContrast(){return this._mixContrast.value}set mixContrast(e){this._mixContrast.value=e}},W=V.forwardRef(({mixBlur:e=0,mixStrength:t=1,resolution:n=256,blur:o=[0,0],minDepthThreshold:s=.9,maxDepthThreshold:c=1,depthScale:l=0,depthToBlurRatioBias:d=.25,mirror:p=0,distortion:m=1,mixContrast:h=1,distortionMap:g,reflectorOffset:v=0,...b},C)=>{r({MeshReflectorMaterialImpl:ne});let E=i(({gl:e})=>e),D=i(({camera:e})=>e),k=i(({scene:e})=>e);o=Array.isArray(o)?o:[o,o];let A=o[0]+o[1]>0,M=o[0],P=o[1],F=V.useRef(null);V.useImperativeHandle(C,()=>F.current,[]);let[I]=V.useState(()=>new f),[L]=V.useState(()=>new j),[R]=V.useState(()=>new j),[z]=V.useState(()=>new j),[B]=V.useState(()=>new T),[H]=V.useState(()=>new j(0,0,-1)),[U]=V.useState(()=>new w),[W]=V.useState(()=>new j),[G]=V.useState(()=>new j),[K]=V.useState(()=>new w),[q]=V.useState(()=>new T),[J]=V.useState(()=>new O),Y=V.useCallback(()=>{var e;let t=F.current.parent||((e=F.current)==null||(e=e.__r3f.parent)==null?void 0:e.object);if(!t||(R.setFromMatrixPosition(t.matrixWorld),z.setFromMatrixPosition(D.matrixWorld),B.extractRotation(t.matrixWorld),L.set(0,0,1),L.applyMatrix4(B),R.addScaledVector(L,v),W.subVectors(R,z),W.dot(L)>0))return;W.reflect(L).negate(),W.add(R),B.extractRotation(D.matrixWorld),H.set(0,0,-1),H.applyMatrix4(B),H.add(z),G.subVectors(R,H),G.reflect(L).negate(),G.add(R),J.position.copy(W),J.up.set(0,1,0),J.up.applyMatrix4(B),J.up.reflect(L),J.lookAt(G),J.far=D.far,J.updateMatrixWorld(),J.projectionMatrix.copy(D.projectionMatrix),q.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),q.multiply(J.projectionMatrix),q.multiply(J.matrixWorldInverse),q.multiply(t.matrixWorld),I.setFromNormalAndCoplanarPoint(L,R),I.applyMatrix4(J.matrixWorldInverse),U.set(I.normal.x,I.normal.y,I.normal.z,I.constant);let n=J.projectionMatrix;K.x=(Math.sign(U.x)+n.elements[8])/n.elements[0],K.y=(Math.sign(U.y)+n.elements[9])/n.elements[5],K.z=-1,K.w=(1+n.elements[10])/n.elements[14],U.multiplyScalar(2/U.dot(K)),n.elements[2]=U.x,n.elements[6]=U.y,n.elements[10]=U.z+1,n.elements[14]=U.w},[D,v]),[X,Z,Q,$]=V.useMemo(()=>{let r={minFilter:_,magFilter:_,type:y},i=new S(n,n,r);i.depthBuffer=!0,i.depthTexture=new x(n,n),i.depthTexture.format=ee,i.depthTexture.type=N;let a=new S(n,n,r);return[i,a,new te({gl:E,resolution:n,width:M,height:P,minDepthThreshold:s,maxDepthThreshold:c,depthScale:l,depthToBlurRatioBias:d}),{mirror:p,textureMatrix:q,mixBlur:e,tDiffuse:i.texture,tDepth:i.depthTexture,tDiffuseBlur:a.texture,hasBlur:A,mixStrength:t,minDepthThreshold:s,maxDepthThreshold:c,depthScale:l,depthToBlurRatioBias:d,distortion:m,distortionMap:g,mixContrast:h,"defines-USE_BLUR":A?``:void 0,"defines-USE_DEPTH":l>0?``:void 0,"defines-USE_DISTORTION":g?``:void 0}]},[E,M,P,q,n,p,A,e,t,s,c,l,d,m,g,h]);return a(()=>{var e;let t=F.current.parent||((e=F.current)==null||(e=e.__r3f.parent)==null?void 0:e.object);if(!t)return;t.visible=!1;let n=E.xr.enabled,r=E.shadowMap.autoUpdate;Y(),E.xr.enabled=!1,E.shadowMap.autoUpdate=!1,E.setRenderTarget(X),E.state.buffers.depth.setMask(!0),E.autoClear||E.clear(),E.render(k,J),A&&Q.render(E,X,Z),E.xr.enabled=n,E.shadowMap.autoUpdate=r,t.visible=!0,E.setRenderTarget(null)}),V.createElement(`meshReflectorMaterialImpl`,u({attach:`material`,key:`key`+$[`defines-USE_BLUR`]+$[`defines-USE_DEPTH`]+$[`defines-USE_DISTORTION`],ref:F},$,b))}),G=n(),K=`./`,q=55,J=`#f0b323`,Y=`#e9e5dc`;function X(e,t,n){let r=t,i=t/e;return i>n&&(i=n,r=n*e),{iw:r,ih:i,W:r/.85,H:i/.9}}function Z(){let e=[],t=X(.72,3,2.3),n=X(720/1018,2,1.5),r=t.W/2+.3,i=r+t.W/2+.56+n.W/2,a={4:{pos:[-i,1.3,-.86],rot:.22,...n},5:{pos:[-r,1.42,-1],rot:0,...t},6:{pos:[r,1.42,-1],rot:0,...t},7:{pos:[i,1.3,-.86],rot:-.22,...n}},o=i+n.W/2,s=.82,c=(e,t,n,r)=>{let i=X(r,1.5,.86),a=new j(e*Math.cos(s),0,Math.sin(s)),c=new j(e*(o+.3),n,-.7).addScaledVector(a,t);return{pos:[c.x,c.y,c.z],rot:-e*s,...i}},l=1.18,u=3.52;return B.forEach((t,n)=>{a[n]?e[n]=a[n]:n<4?e[n]=c(-1,n<2?u:l,n%2==0?1.86:.78,t.aspect):e[n]=c(1,n<10?l:u,n%2==0?1.86:.78,t.aspect)}),e}function Q(e){let t=(0,V.useMemo)(()=>{let e=document.createElement(`canvas`);e.width=720,e.height=1e3;let t=new h(e);return t.colorSpace=g,t.anisotropy=4,t},[]);return(0,V.useEffect)(()=>{let n=R.wins[e],r=()=>{let e=t.image.getContext(`2d`);e.fillStyle=`#ece7dc`,e.fillRect(0,0,720,1e3),e.fillStyle=`#121214`,e.textAlign=`center`,e.textBaseline=`alphabetic`,e.font=`700 150px "Bodoni Moda Variable", serif`,e.fillText(n.title,360,470,640),e.fillRect(320,545,80,3),e.font=`500 46px "Bodoni Moda Variable", serif`,e.fillText(n.event,360,650,640),e.font=`italic 500 46px "Bodoni Moda Variable", serif`,e.fillText(`${n.where}, ${n.when}`,360,720,640),t.needsUpdate=!0};r(),Promise.all([document.fonts.load(`700 150px "Bodoni Moda Variable"`),document.fonts.load(`italic 500 46px "Bodoni Moda Variable"`)]).then(r,r)},[e,t]),t}function $({i:e,w:t,h:n}){let r=Q(e);return(0,G.jsxs)(`mesh`,{raycast:()=>null,position:[0,0,.05],children:[(0,G.jsx)(`planeGeometry`,{args:[t,n]}),(0,G.jsx)(`meshBasicMaterial`,{map:r,toneMapped:!1})]})}function re({item:e,place:t,i:n,active:r,peek:i,pick:o,arrived:s}){let c=(0,V.useRef)(null),u=(0,V.useRef)(null),d=(0,V.useRef)(null),f=(0,V.useRef)(null),[p,m]=(0,V.useState)(!1),h=r===n;H(p);let g=p||i===n,{W:_,H:v,iw:y,ih:b}=t,x=_/2-.54,S=_/2+.07,C=n*.618%1;return a((e,t)=>{d.current&&(d.current.material.zoom=1.04+Math.sin(C*100+e.clock.elapsedTime/3)*.03);let n=!h&&g?.95:1;L.damp3(u.current.scale,[n,n,1],.1,t),L.dampC(c.current.color,h||g?J:Y,.12,t);let r=h&&s.current;L.damp(f.current.position,`x`,r?S:x,r?.28:.12,t),f.current.visible=f.current.position.x>x+.004}),(0,G.jsxs)(`group`,{position:t.pos,rotation:[0,t.rot,0],name:e.id,children:[(0,G.jsxs)(`mesh`,{name:e.id,onPointerOver:e=>{e.stopPropagation(),m(!0)},onPointerOut:()=>m(!1),onClick:e=>{e.stopPropagation(),o(h?null:n)},children:[(0,G.jsx)(`boxGeometry`,{args:[_,v,.05]}),(0,G.jsx)(`meshStandardMaterial`,{color:`#141416`,metalness:.5,roughness:.5,envMapIntensity:2})]}),(0,G.jsxs)(`mesh`,{raycast:()=>null,position:[0,0,.012],children:[(0,G.jsx)(`boxGeometry`,{args:[_*.9,v*.93,.04]}),(0,G.jsx)(`meshBasicMaterial`,{ref:c,color:Y,toneMapped:!1})]}),(0,G.jsx)(`group`,{ref:u,children:e.img?(0,G.jsx)(l,{ref:d,raycast:()=>null,url:K+e.img,scale:[y,b],position:[0,0,.05],toneMapped:!1}):(0,G.jsx)($,{i:e.idx,w:y,h:b})}),(0,G.jsxs)(`group`,{ref:f,position:[x,v/2-.02,-.04],visible:!1,children:[(0,G.jsx)(I,{font:z,fontSize:.05,color:J,anchorX:`left`,anchorY:`top`,letterSpacing:.04,children:e.n}),(0,G.jsx)(I,{font:z,fontSize:.055,color:`#eeebe4`,anchorX:`left`,anchorY:`top`,maxWidth:.44,lineHeight:1.15,position:[0,-.09,0],children:e.name})]})]})}function ie({places:e,active:t,phone:n,arrived:r}){let{size:o,camera:s}=i(),c=(0,V.useMemo)(()=>new j,[]),l=(0,V.useMemo)(()=>new v,[]),u=o.width/Math.max(1,o.height),d=(0,V.useMemo)(()=>{let t=new O(q,u,.1,100),r=[];e.forEach((e,t)=>{if(n?t<5||t>6:t<2||t>9)return;let i=new T().compose(new j(...e.pos),new v().setFromEuler(new D(0,e.rot,0)),new j(1,1,1));for(let[t,n]of[[-1,-1],[1,-1],[-1,1],[1,1]])r.push(new j(t*e.W/2,n*e.H/2,0).applyMatrix4(i))});let i=1.3;for(let e=1;e<30;e+=.05)if(t.position.set(0,i,e),t.updateMatrixWorld(),t.updateProjectionMatrix(),r.every(e=>{let r=e.clone().project(t);return Math.abs(r.x)<(n?.92:1)&&Math.abs(r.y)<.86&&r.z<1}))return new j(0,i,e);return new j(0,i,12)},[e,u,n]);(0,V.useEffect)(()=>{let r=e[t];if(!r){c.copy(d),l.identity();return}let i=Math.tan(P.degToRad(q/2)),a=n?.5:.62,o=Math.max((r.W+a)*1.08/2/(i*u),r.H*1.28/2/i),s=new T().compose(new j(...r.pos),new v().setFromEuler(new D(0,r.rot,0)),new j(1,1,1));c.set(a/2-.04,0,o).applyMatrix4(s),l.setFromEuler(new D(0,r.rot,0))},[t,e,d,n,u,c,l]);let f=(0,V.useRef)(!0),p=(0,V.useMemo)(()=>new j,[]),m=(0,V.useMemo)(()=>new v,[]),h=(0,V.useMemo)(()=>new D,[]);return a((e,i)=>{f.current&&=(e.camera.position.copy(d).add(new j(0,.25,1.6)),!1);let a=t<0&&!n?e.pointer.x:0;p.copy(c),p.x+=a*.45,p.y+=t<0&&!n?e.pointer.y*.12:0,m.setFromEuler(h.set(0,-a*.1,0)).premultiply(l),L.damp3(e.camera.position,p,.4,i),L.dampQ(e.camera.quaternion,m,.4,i),r.current=t>=0&&e.camera.position.distanceTo(c)<.06}),null}function ae({active:e,peek:t,pick:n,phone:r,running:i}){let a=(0,V.useMemo)(Z,[]),l=(0,V.useRef)(!1);return(0,G.jsxs)(o,{frameloop:i?`always`:`never`,dpr:[1,r?1.5:1.75],camera:{fov:q,position:[0,1.4,9],near:.1,far:60},gl:{antialias:!0},onPointerMissed:()=>n(null),"aria-hidden":`true`,children:[(0,G.jsx)(`color`,{attach:`background`,args:[`#121214`]}),(0,G.jsx)(`fog`,{attach:`fog`,args:[`#121214`,7,24]}),(0,G.jsxs)(V.Suspense,{fallback:null,children:[(0,G.jsx)(`group`,{children:B.map((r,i)=>(0,G.jsx)(re,{item:r,place:a[i],i,active:e,peek:t,pick:n,arrived:l},r.id))}),(0,G.jsxs)(`mesh`,{rotation:[-Math.PI/2,0,0],position:[0,0,0],children:[(0,G.jsx)(`planeGeometry`,{args:[50,50]}),(0,G.jsx)(W,{blur:[300,100],resolution:r?512:1024,mixBlur:1,mixStrength:60,roughness:1,depthScale:1.2,minDepthThreshold:.4,maxDepthThreshold:1.4,color:`#08080a`,metalness:.5})]}),(0,G.jsxs)(s,{resolution:256,frames:1,children:[(0,G.jsx)(c,{form:`rect`,intensity:2.4,color:`#e4ebff`,position:[0,7,1],"rotation-x":Math.PI/2,scale:[12,5,1]}),(0,G.jsx)(c,{form:`rect`,intensity:.7,color:`#f4efe6`,position:[-8,2,3],"rotation-y":Math.PI/2,scale:[3,6,1]}),(0,G.jsx)(c,{form:`rect`,intensity:.5,color:`#f4efe6`,position:[8,2,3],"rotation-y":-Math.PI/2,scale:[3,6,1]})]})]}),(0,G.jsx)(ie,{places:a,active:e,phone:r,arrived:l})]})}export{ae as default};