import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{n as t,t as n}from"./jsx-runtime-C3cWAN_r.js";/* empty css             */import{t as r}from"./gsap-Dm7UF3sG.js";/* empty css                    *//* empty css            *//* empty css            */import{a as i,c as a,d as o,f as s,g as c,i as l,l as u,n as d,o as f,p,r as m,s as h,t as g,u as ee}from"./content-Do9Hx9qB.js";import{t as te}from"./version-BlCZFW3J.js";import{n as ne,t as re}from"./github-D_t9GUTT.js";import{n as ie,t as ae}from"./notes-Dhr7Eb-u.js";import{n as _}from"./scroll-DVpCkw6r.js";import{a as oe,c as v}from"./utils-DXhd7Sog.js";import{c as se,t as y,u as b}from"./react-three-fiber.esm-DL1a9zZf.js";import{t as x}from"./extends-CvVTau-c.js";import{E as S,Lt as ce,U as le,Ur as ue,an as de,ar as fe,fa as pe,io as C,ir as me,jn as he,mo as ge,no as _e,on as w,pn as T,qa as ve,ro as E,ta as ye,tr as be}from"./three.core-BF58tRDi.js";import{r as xe}from"./three.module-CxBI3RDy.js";import{t as Se}from"./constants-BqlKFZjA.js";var Ce=Se>=125?`uv1`:`uv2`,we=new S,D=new E,O=class extends de{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type=`LineSegmentsGeometry`,this.setIndex([0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5]),this.setAttribute(`position`,new ce([-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],3)),this.setAttribute(`uv`,new ce([-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],2))}applyMatrix4(e){let t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return t!==void 0&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new w(t,6,1);return this.setAttribute(`instanceStart`,new T(n,3,0)),this.setAttribute(`instanceEnd`,new T(n,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e,t=3){let n;e instanceof Float32Array?n=e:Array.isArray(e)&&(n=new Float32Array(e));let r=new w(n,t*2,1);return this.setAttribute(`instanceColorStart`,new T(r,t,0)),this.setAttribute(`instanceColorEnd`,new T(r,t,t)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new ge(e.geometry)),this}fromLineSegments(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new S);let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;e!==void 0&&t!==void 0&&(this.boundingBox.setFromBufferAttribute(e),we.setFromBufferAttribute(t),this.boundingBox.union(we))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new pe),this.boundingBox===null&&this.computeBoundingBox();let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(e!==void 0&&t!==void 0){let n=this.boundingSphere.center;this.boundingBox.getCenter(n);let r=0;for(let i=0,a=e.count;i<a;i++)D.fromBufferAttribute(e,i),r=Math.max(r,n.distanceToSquared(D)),D.fromBufferAttribute(t,i),r=Math.max(r,n.distanceToSquared(D));this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error(`THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.`,this)}}toJSON(){}applyMatrix(e){return console.warn(`THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4().`),this.applyMatrix4(e)}},Te=class extends O{constructor(){super(),this.isLineGeometry=!0,this.type=`LineGeometry`}setPositions(e){let t=e.length-3,n=new Float32Array(2*t);for(let r=0;r<t;r+=3)n[2*r]=e[r],n[2*r+1]=e[r+1],n[2*r+2]=e[r+2],n[2*r+3]=e[r+3],n[2*r+4]=e[r+4],n[2*r+5]=e[r+5];return super.setPositions(n),this}setColors(e,t=3){let n=e.length-t,r=new Float32Array(2*n);if(t===3)for(let i=0;i<n;i+=t)r[2*i]=e[i],r[2*i+1]=e[i+1],r[2*i+2]=e[i+2],r[2*i+3]=e[i+3],r[2*i+4]=e[i+4],r[2*i+5]=e[i+5];else for(let i=0;i<n;i+=t)r[2*i]=e[i],r[2*i+1]=e[i+1],r[2*i+2]=e[i+2],r[2*i+3]=e[i+3],r[2*i+4]=e[i+4],r[2*i+5]=e[i+5],r[2*i+6]=e[i+6],r[2*i+7]=e[i+7];return super.setColors(r,t),this}fromLine(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}},k=class extends ye{constructor(e){super({type:`LineMaterial`,uniforms:ve.clone(ve.merge([xe.common,xe.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new _e(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
				#include <common>
				#include <fog_pars_vertex>
				#include <logdepthbuf_pars_vertex>
				#include <clipping_planes_pars_vertex>

				uniform float linewidth;
				uniform vec2 resolution;

				attribute vec3 instanceStart;
				attribute vec3 instanceEnd;

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
						attribute vec4 instanceColorStart;
						attribute vec4 instanceColorEnd;
					#else
						varying vec3 vLineColor;
						attribute vec3 instanceColorStart;
						attribute vec3 instanceColorEnd;
					#endif
				#endif

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#ifdef USE_DASH

					uniform float dashScale;
					attribute float instanceDistanceStart;
					attribute float instanceDistanceEnd;
					varying float vLineDistance;

				#endif

				void trimSegment( const in vec4 start, inout vec4 end ) {

					// trim end segment so it terminates between the camera plane and the near plane

					// conservative estimate of the near plane
					float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
					float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
					float nearEstimate = - 0.5 * b / a;

					float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

					end.xyz = mix( start.xyz, end.xyz, alpha );

				}

				void main() {

					#ifdef USE_COLOR

						vLineColor = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

					#endif

					#ifdef USE_DASH

						vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
						vUv = uv;

					#endif

					float aspect = resolution.x / resolution.y;

					// camera space
					vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
					vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

					#ifdef WORLD_UNITS

						worldStart = start.xyz;
						worldEnd = end.xyz;

					#else

						vUv = uv;

					#endif

					// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
					// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
					// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
					// perhaps there is a more elegant solution -- WestLangley

					bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

					if ( perspective ) {

						if ( start.z < 0.0 && end.z >= 0.0 ) {

							trimSegment( start, end );

						} else if ( end.z < 0.0 && start.z >= 0.0 ) {

							trimSegment( end, start );

						}

					}

					// clip space
					vec4 clipStart = projectionMatrix * start;
					vec4 clipEnd = projectionMatrix * end;

					// ndc space
					vec3 ndcStart = clipStart.xyz / clipStart.w;
					vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

					// direction
					vec2 dir = ndcEnd.xy - ndcStart.xy;

					// account for clip-space aspect ratio
					dir.x *= aspect;
					dir = normalize( dir );

					#ifdef WORLD_UNITS

						// get the offset direction as perpendicular to the view vector
						vec3 worldDir = normalize( end.xyz - start.xyz );
						vec3 offset;
						if ( position.y < 0.5 ) {

							offset = normalize( cross( start.xyz, worldDir ) );

						} else {

							offset = normalize( cross( end.xyz, worldDir ) );

						}

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						float forwardOffset = dot( worldDir, vec3( 0.0, 0.0, 1.0 ) );

						// don't extend the line if we're rendering dashes because we
						// won't be rendering the endcaps
						#ifndef USE_DASH

							// extend the line bounds to encompass  endcaps
							start.xyz += - worldDir * linewidth * 0.5;
							end.xyz += worldDir * linewidth * 0.5;

							// shift the position of the quad so it hugs the forward edge of the line
							offset.xy -= dir * forwardOffset;
							offset.z += 0.5;

						#endif

						// endcaps
						if ( position.y > 1.0 || position.y < 0.0 ) {

							offset.xy += dir * 2.0 * forwardOffset;

						}

						// adjust for linewidth
						offset *= linewidth * 0.5;

						// set the world position
						worldPos = ( position.y < 0.5 ) ? start : end;
						worldPos.xyz += offset;

						// project the worldpos
						vec4 clip = projectionMatrix * worldPos;

						// shift the depth of the projected points so the line
						// segments overlap neatly
						vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
						clip.z = clipPose.z * clip.w;

					#else

						vec2 offset = vec2( dir.y, - dir.x );
						// undo aspect ratio adjustment
						dir.x /= aspect;
						offset.x /= aspect;

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						// endcaps
						if ( position.y < 0.0 ) {

							offset += - dir;

						} else if ( position.y > 1.0 ) {

							offset += dir;

						}

						// adjust for linewidth
						offset *= linewidth;

						// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
						offset /= resolution.y;

						// select end
						vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

						// back to clip space
						offset *= clip.w;

						clip.xy += offset;

					#endif

					gl_Position = clip;

					vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

					#include <logdepthbuf_vertex>
					#include <clipping_planes_vertex>
					#include <fog_vertex>

				}
			`,fragmentShader:`
				uniform vec3 diffuse;
				uniform float opacity;
				uniform float linewidth;

				#ifdef USE_DASH

					uniform float dashOffset;
					uniform float dashSize;
					uniform float gapSize;

				#endif

				varying float vLineDistance;

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#include <common>
				#include <fog_pars_fragment>
				#include <logdepthbuf_pars_fragment>
				#include <clipping_planes_pars_fragment>

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
					#else
						varying vec3 vLineColor;
					#endif
				#endif

				vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

					float mua;
					float mub;

					vec3 p13 = p1 - p3;
					vec3 p43 = p4 - p3;

					vec3 p21 = p2 - p1;

					float d1343 = dot( p13, p43 );
					float d4321 = dot( p43, p21 );
					float d1321 = dot( p13, p21 );
					float d4343 = dot( p43, p43 );
					float d2121 = dot( p21, p21 );

					float denom = d2121 * d4343 - d4321 * d4321;

					float numer = d1343 * d4321 - d1321 * d4343;

					mua = numer / denom;
					mua = clamp( mua, 0.0, 1.0 );
					mub = ( d1343 + d4321 * ( mua ) ) / d4343;
					mub = clamp( mub, 0.0, 1.0 );

					return vec2( mua, mub );

				}

				void main() {

					#include <clipping_planes_fragment>

					#ifdef USE_DASH

						if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

						if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

					#endif

					float alpha = opacity;

					#ifdef WORLD_UNITS

						// Find the closest points on the view ray and the line segment
						vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
						vec3 lineDir = worldEnd - worldStart;
						vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

						vec3 p1 = worldStart + lineDir * params.x;
						vec3 p2 = rayEnd * params.y;
						vec3 delta = p1 - p2;
						float len = length( delta );
						float norm = len / linewidth;

						#ifndef USE_DASH

							#ifdef USE_ALPHA_TO_COVERAGE

								float dnorm = fwidth( norm );
								alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

							#else

								if ( norm > 0.5 ) {

									discard;

								}

							#endif

						#endif

					#else

						#ifdef USE_ALPHA_TO_COVERAGE

							// artifacts appear on some hardware if a derivative is taken within a conditional
							float a = vUv.x;
							float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
							float len2 = a * a + b * b;
							float dlen = fwidth( len2 );

							if ( abs( vUv.y ) > 1.0 ) {

								alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

							}

						#else

							if ( abs( vUv.y ) > 1.0 ) {

								float a = vUv.x;
								float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
								float len2 = a * a + b * b;

								if ( len2 > 1.0 ) discard;

							}

						#endif

					#endif

					vec4 diffuseColor = vec4( diffuse, alpha );
					#ifdef USE_COLOR
						#ifdef USE_LINE_COLOR_ALPHA
							diffuseColor *= vLineColor;
						#else
							diffuseColor.rgb *= vLineColor;
						#endif
					#endif

					#include <logdepthbuf_fragment>

					gl_FragColor = diffuseColor;

					#include <tonemapping_fragment>
					#include <${Se>=154?`colorspace_fragment`:`encodings_fragment`}>
					#include <fog_fragment>
					#include <premultiplied_alpha_fragment>

				}
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA=`1`:delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(e){this.uniforms.diffuse.value=e}},worldUnits:{enumerable:!0,get:function(){return`WORLD_UNITS`in this.defines},set:function(e){e===!0?this.defines.WORLD_UNITS=``:delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(e){this.uniforms.linewidth.value=e}},dashed:{enumerable:!0,get:function(){return`USE_DASH`in this.defines},set(e){!!e!=`USE_DASH`in this.defines&&(this.needsUpdate=!0),e===!0?this.defines.USE_DASH=``:delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(e){this.uniforms.dashScale.value=e}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(e){this.uniforms.dashSize.value=e}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(e){this.uniforms.dashOffset.value=e}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(e){this.uniforms.gapSize.value=e}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(e){this.uniforms.opacity.value=e}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(e){this.uniforms.resolution.value.copy(e)}},alphaToCoverage:{enumerable:!0,get:function(){return`USE_ALPHA_TO_COVERAGE`in this.defines},set:function(e){!!e!=`USE_ALPHA_TO_COVERAGE`in this.defines&&(this.needsUpdate=!0),e===!0?(this.defines.USE_ALPHA_TO_COVERAGE=``,this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(e)}},A=new C,Ee=new E,De=new E,j=new C,M=new C,N=new C,P=new E,F=new me,I=new he,Oe=new E,L=new S,R=new pe,z=new C,B,V;function ke(e,t,n){return z.set(0,0,-t,1).applyMatrix4(e.projectionMatrix),z.multiplyScalar(1/z.w),z.x=V/n.width,z.y=V/n.height,z.applyMatrix4(e.projectionMatrixInverse),z.multiplyScalar(1/z.w),Math.abs(Math.max(z.x,z.y))}function Ae(e,t){let n=e.matrixWorld,r=e.geometry,i=r.attributes.instanceStart,a=r.attributes.instanceEnd,o=Math.min(r.instanceCount,i.count);for(let r=0,s=o;r<s;r++){I.start.fromBufferAttribute(i,r),I.end.fromBufferAttribute(a,r),I.applyMatrix4(n);let o=new E,s=new E;B.distanceSqToSegment(I.start,I.end,s,o),s.distanceTo(o)<V*.5&&t.push({point:s,pointOnLine:o,distance:B.origin.distanceTo(s),object:e,face:null,faceIndex:r,uv:null,[Ce]:null})}}function je(e,t,n){let r=t.projectionMatrix,i=e.material.resolution,a=e.matrixWorld,o=e.geometry,s=o.attributes.instanceStart,c=o.attributes.instanceEnd,l=Math.min(o.instanceCount,s.count),u=-t.near;B.at(1,N),N.w=1,N.applyMatrix4(t.matrixWorldInverse),N.applyMatrix4(r),N.multiplyScalar(1/N.w),N.x*=i.x/2,N.y*=i.y/2,N.z=0,P.copy(N),F.multiplyMatrices(t.matrixWorldInverse,a);for(let t=0,o=l;t<o;t++){if(j.fromBufferAttribute(s,t),M.fromBufferAttribute(c,t),j.w=1,M.w=1,j.applyMatrix4(F),M.applyMatrix4(F),j.z>u&&M.z>u)continue;if(j.z>u){let e=j.z-M.z,t=(j.z-u)/e;j.lerp(M,t)}else if(M.z>u){let e=M.z-j.z,t=(M.z-u)/e;M.lerp(j,t)}j.applyMatrix4(r),M.applyMatrix4(r),j.multiplyScalar(1/j.w),M.multiplyScalar(1/M.w),j.x*=i.x/2,j.y*=i.y/2,M.x*=i.x/2,M.y*=i.y/2,I.start.copy(j),I.start.z=0,I.end.copy(M),I.end.z=0;let o=I.closestPointToPointParameter(P,!0);I.at(o,Oe);let l=be.lerp(j.z,M.z,o),d=l>=-1&&l<=1,f=P.distanceTo(Oe)<V*.5;if(d&&f){I.start.fromBufferAttribute(s,t),I.end.fromBufferAttribute(c,t),I.start.applyMatrix4(a),I.end.applyMatrix4(a);let r=new E,i=new E;B.distanceSqToSegment(I.start,I.end,i,r),n.push({point:i,pointOnLine:r,distance:B.origin.distanceTo(i),object:e,face:null,faceIndex:t,uv:null,[Ce]:null})}}}var Me=class extends fe{constructor(e=new O,t=new k({color:Math.random()*16777215})){super(e,t),this.isLineSegments2=!0,this.type=`LineSegments2`}computeLineDistances(){let e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,r=new Float32Array(2*t.count);for(let e=0,i=0,a=t.count;e<a;e++,i+=2)Ee.fromBufferAttribute(t,e),De.fromBufferAttribute(n,e),r[i]=i===0?0:r[i-1],r[i+1]=r[i]+Ee.distanceTo(De);let i=new w(r,2,1);return e.setAttribute(`instanceDistanceStart`,new T(i,1,0)),e.setAttribute(`instanceDistanceEnd`,new T(i,1,1)),this}raycast(e,t){let n=this.material.worldUnits,r=e.camera;r===null&&!n&&console.error(`LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.`);let i=e.params.Line2===void 0?0:e.params.Line2.threshold||0;B=e.ray;let a=this.matrixWorld,o=this.geometry,s=this.material;V=s.linewidth+i,o.boundingSphere===null&&o.computeBoundingSphere(),R.copy(o.boundingSphere).applyMatrix4(a);let c;if(c=n?V*.5:ke(r,Math.max(r.near,R.distanceToPoint(B.origin)),s.resolution),R.radius+=c,B.intersectsSphere(R)===!1)return;o.boundingBox===null&&o.computeBoundingBox(),L.copy(o.boundingBox).applyMatrix4(a);let l;l=n?V*.5:ke(r,Math.max(r.near,L.distanceToPoint(B.origin)),s.resolution),L.expandByScalar(l),B.intersectsBox(L)!==!1&&(n?Ae(this,t):je(this,r,t))}onBeforeRender(e){let t=this.material.uniforms;t&&t.resolution&&(e.getViewport(A),this.material.uniforms.resolution.value.set(A.z,A.w))}},Ne=class extends Me{constructor(e=new Te,t=new k({color:Math.random()*16777215})){super(e,t),this.isLine2=!0,this.type=`Line2`}},H=e(t()),Pe=H.forwardRef(function({points:e,color:t=16777215,vertexColors:n,linewidth:r,lineWidth:i,segments:a,dashed:o,...s},c){var l;let u=b(e=>e.size),d=H.useMemo(()=>a?new Me:new Ne,[a]),[f]=H.useState(()=>new k),p=(n==null||(l=n[0])==null?void 0:l.length)===4?4:3,m=H.useMemo(()=>{let r=a?new O:new Te,i=e.map(e=>{let t=Array.isArray(e);return e instanceof E||e instanceof C?[e.x,e.y,e.z]:e instanceof _e?[e.x,e.y,0]:t&&e.length===3?[e[0],e[1],e[2]]:t&&e.length===2?[e[0],e[1],0]:e});if(r.setPositions(i.flat()),n){t=16777215;let e=n.map(e=>e instanceof le?e.toArray():e);r.setColors(e.flat(),p)}return r},[e,a,n,p]);return H.useLayoutEffect(()=>{d.computeLineDistances()},[e,d]),H.useLayoutEffect(()=>{o?f.defines.USE_DASH=``:delete f.defines.USE_DASH,f.needsUpdate=!0},[o,f]),H.useEffect(()=>()=>{m.dispose(),f.dispose()},[m]),H.createElement(`primitive`,x({object:d,ref:c},s),H.createElement(`primitive`,{object:m,attach:`geometry`}),H.createElement(`primitive`,x({object:f,attach:`material`,color:t,vertexColors:!!n,resolution:[u.width,u.height],linewidth:r??i??1,dashed:o,transparent:p===4},s)))}),Fe=new E,Ie=H.forwardRef(function({start:e=[0,0,0],end:t=[0,0,0],mid:n,segments:r=20,...i},a){let o=H.useRef(null);H.useImperativeHandle(a,()=>o.current);let[s]=H.useState(()=>new ue(void 0,void 0,void 0)),c=H.useCallback((e,t,n,r=20)=>(e instanceof E?s.v0.copy(e):s.v0.set(...e),t instanceof E?s.v2.copy(t):s.v2.set(...t),n instanceof E?s.v1.copy(n):Array.isArray(n)?s.v1.set(...n):s.v1.copy(s.v0.clone().add(s.v2.clone().sub(s.v0)).add(Fe.set(0,s.v0.y-s.v2.y,0))),s.getPoints(r)),[]);H.useLayoutEffect(()=>{o.current.setPoints=(e,t,n)=>{let r=c(e,t,n);o.current.geometry&&o.current.geometry.setPositions(r.map(e=>e.toArray()).flat())}},[]);let l=H.useMemo(()=>c(e,t,n,r),[e,t,n,r]);return H.createElement(Pe,x({ref:o,points:l},i))}),U=n(),W=110,Le=2*Math.sqrt(W)*(v?1:.62),G=700,Re=2*Math.sqrt(G)*.92,K=70,ze=2*Math.sqrt(K)*(v?1:.5),Be=46,Ve=class{bodies=new Map;edges=[];W=1;H=1;raf=0;last=0;visible=!0;onFrame=null;constructor(e,t){for(let t of e)this.bodies.set(t.id,{id:t.id,pin:!!t.pin,bx:0,by:0,hx:0,hy:0,x:0,y:0,vx:0,vy:0,w:0,h:0,drag:!1,tx:0,ty:0,held:!1,kx:0,ky:0,el:null});this.edges=t.map(([e,t])=>({a:this.bodies.get(e),b:this.bodies.get(t),rest:1,mx:0,my:0,vx:0,vy:0,seeded:!1}))}layout(e,t,n,r,i){this.W=e.clientWidth,this.H=e.clientHeight;for(let e of t){let t=this.bodies.get(e.id),r=n&&e.px!==void 0?e.px:e.fx,i=n&&e.py!==void 0?e.py:e.fy;t.w=t.el?t.el.offsetWidth:0,t.h=t.el?t.el.offsetHeight:0,t.bx=r*this.W,t.by=i*this.H,t.hx=this.clampX(t,t.bx),t.hy=this.clampY(t,t.by),t.x=t.hx,t.y=t.hy,t.vx=t.vy=0,t.held=!1,t.drag=!1}for(let e of this.edges)e.rest=Math.hypot(e.a.hx-e.b.hx,e.a.hy-e.b.hy),e.seeded=!1;let a=i?this.bodies.get(i):null;if(r&&a&&!v)for(let e of this.bodies.values())e!==a&&!e.pin&&(e.x=e.hx+(a.hx-e.hx)*.42,e.y=e.hy+(a.hy-e.hy)*.42);for(let e of this.edges)this.seedMid(e);this.paint(),this.wake()}clampX(e,t){if(e.pin)return t;let n=e.w/2+4;return Math.min(this.W-n,Math.max(n,t))}clampY(e,t){if(e.pin)return t;let n=e.h/2+4;return Math.min(this.H-n,Math.max(n,t))}midTarget(e){let t=Math.hypot(e.a.x-e.b.x,e.a.y-e.b.y),n=2*(5+Math.max(0,e.rest*1.04+24-t)*.4);return[(e.a.x+e.b.x)/2,(e.a.y+e.b.y)/2+n]}tip(e,t,n){if(e.pin)return[e.x,e.y];let r=t-e.x,i=n-e.y,a=e.w/2-4,o=e.h/2,s=Math.min(a/(Math.abs(r)||1e-6),o/(Math.abs(i)||1e-6));return s>=1?[e.x,e.y]:[e.x+r*s,e.y+i*s]}ends(e){let[t,n]=this.tip(e.a,e.b.x,e.b.y),[r,i]=this.tip(e.b,e.a.x,e.a.y);return[t,n,r,i,e.mx,e.my]}seedMid(e){let[t,n]=this.midTarget(e);e.mx=t,e.my=n,e.vx=e.vy=0,e.seeded=!0}wake(){!this.raf&&this.visible&&(this.last=performance.now(),this.raf=requestAnimationFrame(this.tick))}stop(){cancelAnimationFrame(this.raf),this.raf=0}tick=e=>{this.raf=0;let t=Math.min(1/30,Math.max(.001,(e-this.last)/1e3));this.last=e;let n=this.step(t/2)|this.step(t/2);this.paint(),n&&(this.raf=requestAnimationFrame(this.tick))};step(e){let t=0,n=new Map;for(let e of this.edges){let t=e.b.x-e.a.x,r=e.b.y-e.a.y,i=Math.hypot(t,r)||1,a=e.rest*1.2+50;if(i>a){let o=Be*(i-a),s=t/i,c=r/i,l=n.get(e.a)??[0,0],u=n.get(e.b)??[0,0];l[0]+=o*s,l[1]+=o*c,u[0]-=o*s,u[1]-=o*c,n.set(e.a,l),n.set(e.b,u)}}for(let r of this.bodies.values()){if(r.pin)continue;let i,a;if(r.drag)i=G*(r.tx-r.x)-Re*r.vx,a=G*(r.ty-r.y)-Re*r.vy;else{let e=r.held?r.kx:r.hx,t=r.held?r.ky:r.hy,o=r.held?[0,0]:n.get(r)??[0,0];i=W*(e-r.x)-Le*r.vx+o[0],a=W*(t-r.y)-Le*r.vy+o[1]}r.vx+=i*e,r.vy+=a*e,r.x+=r.vx*e,r.y+=r.vy*e;let o=this.clampX(r,r.x),s=this.clampY(r,r.y);o!==r.x&&(r.x=o,r.vx*=-.2),s!==r.y&&(r.y=s,r.vy*=-.2);let c=r.drag?r.tx:r.held?r.kx:r.hx,l=r.drag?r.ty:r.held?r.ky:r.hy;r.drag||Math.abs(r.vx)+Math.abs(r.vy)>1.5||Math.abs(c-r.x)+Math.abs(l-r.y)>.4?t=1:(r.x=this.clampX(r,c),r.y=this.clampY(r,l),r.vx=r.vy=0)}for(let n of this.edges){let[r,i]=this.midTarget(n);n.vx+=(K*(r-n.mx)-ze*n.vx)*e,n.vy+=(K*(i-n.my)-ze*n.vy)*e,n.mx+=n.vx*e,n.my+=n.vy*e,(Math.abs(n.vx)+Math.abs(n.vy)>1||Math.abs(r-n.mx)+Math.abs(i-n.my)>.4)&&(t=1)}return t}paint(){for(let e of this.bodies.values())e.el&&!e.pin&&(e.el.style.transform=`translate3d(${(e.x-e.bx).toFixed(2)}px, ${(e.y-e.by).toFixed(2)}px, 0)`);this.onFrame?.()}};function He(){if(new URLSearchParams(location.search).has(`flat`))return!1;try{let e=document.createElement(`canvas`);return!!(e.getContext(`webgl2`)||e.getContext(`webgl`))}catch{return!1}}var Ue=typeof window<`u`&&He(),We=`#c0392b`;function Ge({sim:e}){let t=(0,H.useRef)([]),n=(0,H.useRef)([]),{invalidate:r}=b();return(0,H.useEffect)(()=>{let t=e.onFrame,n=()=>{t?.(),r()};return e.onFrame=n,r(),()=>{e.onFrame===n&&(e.onFrame=t)}},[e,r]),se(()=>{let r=e.W/2,i=e.H/2;e.edges.forEach((a,o)=>{let[s,c,l,u,d,f]=e.ends(a),p=[s-r,i-c,0],m=[l-r,i-u,0],h=[d-r,i-f,0];t.current[o]?.setPoints(p,m,h),n.current[o]?.setPoints([p[0]+2,p[1]-4,-1],[m[0]+2,m[1]-4,-1],[h[0]+3,h[1]-7,-1])})}),(0,U.jsx)(U.Fragment,{children:e.edges.map((e,r)=>(0,U.jsxs)(`group`,{children:[(0,U.jsx)(Ie,{ref:e=>{n.current[r]=e},start:[0,0,-1],end:[1,0,-1],color:`#171612`,lineWidth:2.6,transparent:!0,opacity:.1,segments:40}),(0,U.jsx)(Ie,{ref:e=>{t.current[r]=e},start:[0,0,0],end:[1,0,0],color:We,lineWidth:2.1,segments:40})]},r))})}function Ke({sim:e}){let t=(0,H.useRef)(null);return(0,H.useEffect)(()=>{let n=e.onFrame,r=()=>{n?.();let r=t.current?.children;r&&e.edges.forEach((t,n)=>{let[i,a,o,s,c,l]=e.ends(t);r[n*2]?.setAttribute(`d`,`M${i+2} ${a+4}Q${c+3} ${l+7} ${o+2} ${s+4}`),r[n*2+1]?.setAttribute(`d`,`M${i} ${a}Q${c} ${l} ${o} ${s}`)})};return e.onFrame=r,r(),()=>{e.onFrame===r&&(e.onFrame=n)}},[e]),(0,U.jsx)(`svg`,{className:`threads-svg`,"aria-hidden":`true`,children:(0,U.jsx)(`g`,{ref:t,children:e.edges.map((e,t)=>[(0,U.jsx)(`path`,{d:`M0 0`,stroke:`#171612`,strokeOpacity:.1,strokeWidth:2.6,fill:`none`},`s`+t),(0,U.jsx)(`path`,{d:`M0 0`,stroke:We,strokeWidth:2.1,fill:`none`,strokeLinecap:`round`},`t`+t)])})})}function q({nodes:e,edges:t,phone:n,className:r,label:i,openFrom:a}){let o=(0,H.useRef)(null),[s]=(0,H.useState)(()=>new Ve(e,t)),[c,l]=(0,H.useState)(!1),[u,d]=(0,H.useState)(!1),f=(0,H.useRef)(!0);(0,H.useLayoutEffect)(()=>{let t=o.current,r=()=>{s.layout(t,e,n,f.current,a),f.current=!1};r();let i=new ResizeObserver(()=>{(Math.abs(t.clientWidth-s.W)>1||Math.abs(t.clientHeight-s.H)>1)&&r()});return i.observe(t),document.fonts?.ready.then(()=>{t.isConnected&&s.layout(t,e,n,!1)}),()=>{i.disconnect(),s.stop()}},[s,n]),(0,H.useEffect)(()=>{let e=new IntersectionObserver(([e])=>{s.visible=e.isIntersecting,e.isIntersecting?(l(!0),s.wake()):s.stop()},{rootMargin:`300px 0px`});return e.observe(o.current),()=>e.disconnect()},[s]);let p=(0,H.useRef)({id:``,sx:0,sy:0,ox:0,oy:0,moved:!1,suppress:``}),m=e=>{let t=o.current.getBoundingClientRect();return[e.clientX-t.left,e.clientY-t.top]},h=e=>{let t=s.bodies.get(e.id);return{ref:e=>{t.el=e},onPointerDown:n=>{if(n.button!==0)return;n.currentTarget.setPointerCapture(n.pointerId);let[r,i]=m(n);p.current={id:e.id,sx:r,sy:i,ox:r-t.x,oy:i-t.y,moved:!1,suppress:``},t.drag=!0,t.held=!1,t.tx=t.x,t.ty=t.y,o.current.dataset.dragging=e.id,s.wake()},onPointerMove:e=>{if(!t.drag)return;let[n,r]=m(e),i=p.current;Math.hypot(n-i.sx,r-i.sy)>5&&(i.moved=!0),t.tx=n-i.ox,t.ty=r-i.oy,s.wake()},onPointerUp:()=>{t.drag&&(t.drag=!1,p.current.moved&&(p.current.suppress=e.id),delete o.current.dataset.dragging,s.wake())},onPointerCancel:()=>{t.drag=!1,delete o.current.dataset.dragging,s.wake()},onClick:n=>{p.current.suppress===e.id?(n.preventDefault(),p.current.suppress=``):e.href||(t.vy-=v?0:320,t.vx+=v?0:(Math.random()-.5)*120,s.wake())},onKeyDown:e=>{let n=e.shiftKey?72:28,r={ArrowLeft:[-n,0],ArrowRight:[n,0],ArrowUp:[0,-n],ArrowDown:[0,n]};r[e.key]?(e.preventDefault(),t.held||(t.held=!0,t.kx=t.x,t.ky=t.y),t.kx=s.clampX(t,t.kx+r[e.key][0]),t.ky=s.clampY(t,t.ky+r[e.key][1]),s.wake()):e.key===`Escape`&&t.held&&(t.held=!1,s.wake())},onBlur:()=>{t.held&&(t.held=!1,s.wake())}}},g=`${r}-hint`;return(0,U.jsxs)(`div`,{className:`field ${r}`,ref:o,role:`group`,"aria-label":i,children:[Ue&&c?(0,U.jsx)(y,{className:`threads-gl`,orthographic:!0,flat:!0,frameloop:`demand`,dpr:[1,2],camera:{zoom:1,position:[0,0,100],near:.1,far:1e3},style:{position:`absolute`,inset:0,pointerEvents:`none`},gl:{alpha:!0,antialias:!0},onCreated:()=>setTimeout(()=>d(!0),120),"aria-hidden":`true`,children:(0,U.jsx)(Ge,{sim:s})}):null,u?null:(0,U.jsx)(Ke,{sim:s}),(0,U.jsx)(`span`,{id:g,className:`sr-only-x`,children:`Drag it, or use the arrow keys. Escape sends it home.`}),e.map(e=>{let t=n&&e.px!==void 0?e.px:e.fx,r=n&&e.py!==void 0?e.py:e.fy,i={left:`${t*100}%`,top:`${r*100}%`};if(e.pin)return(0,U.jsx)(`span`,{className:`pin`,"aria-hidden":`true`,style:i,ref:t=>{s.bodies.get(e.id).el=t}},e.id);let a=h(e);return e.href?(0,U.jsx)(`a`,{href:e.href,className:`node ${e.cls??``}`,style:i,"aria-describedby":g,draggable:!1,...a,children:e.children},e.id):(0,U.jsx)(`button`,{type:`button`,className:`node ${e.cls??``}`,style:i,"aria-describedby":g,...a,children:e.children},e.id)})]})}function qe(){let[e,t]=(0,H.useState)(null),n=(0,H.useRef)(null),i=(0,H.useRef)(null),a=(0,H.useRef)(null),o=(0,H.useRef)(null);if((0,H.useLayoutEffect)(()=>{let e=n.current.parentElement;i.current=e;let r=()=>{let n=e.getBoundingClientRect(),r=parseFloat(getComputedStyle(e).getPropertyValue(`--gx`))||40,i=t=>{let n=e.querySelector(t);return n?n.getBoundingClientRect():null},a=i(`[data-thread-start]`),o=i(`[data-thread-end]`),s=[...e.querySelectorAll(`[data-stitch]`)].map(e=>{let t=e.getBoundingClientRect(),r=parseFloat(getComputedStyle(e).lineHeight)||t.height;return{y:t.top-n.top+Math.min(t.height,r)*.55,x:t.left-n.left-12}});t({h:e.scrollHeight,gx:r,y0:a?a.top-n.top+a.height*.5:0,y1:o?o.top-n.top:e.scrollHeight,stitches:s})};r();let a=new ResizeObserver(r);return a.observe(e),document.fonts?.ready.then(r),()=>a.disconnect()},[]),(0,H.useEffect)(()=>{if(!e)return;let t=o.current?[...o.current.children]:[];if(v){a.current?.style.setProperty(`stroke-dashoffset`,`0`),t.forEach(e=>e.classList.add(`on`));return}let n=()=>{let n=i.current;if(!n)return;let r=-n.getBoundingClientRect().top+window.innerHeight*.82,o=Math.min(1,Math.max(0,(r-e.y0)/(e.y1-e.y0)));a.current?.style.setProperty(`stroke-dashoffset`,String(1-o)),e.stitches.forEach((e,n)=>t[n]?.classList.toggle(`on`,r>e.y))};return n(),r.ticker.add(n),()=>r.ticker.remove(n)},[e]),!e)return(0,U.jsx)(`svg`,{ref:n,className:`margin`,width:`1`,height:`1`,"aria-hidden":`true`});let{gx:s,y0:c,y1:l}=e;return(0,U.jsxs)(`svg`,{ref:n,className:`margin`,width:`100%`,height:e.h,"aria-hidden":`true`,children:[(0,U.jsx)(`path`,{ref:a,className:`margin-main`,d:`M${s} ${c}L${s} ${l}`,pathLength:1}),(0,U.jsx)(`circle`,{className:`knot`,cx:s,cy:c,r:4.5}),(0,U.jsx)(`g`,{ref:o,children:e.stitches.map((e,t)=>(0,U.jsx)(`path`,{className:`stitch`,d:`M${s} ${e.y-10}Q${s+4} ${e.y+3} ${(s+e.x)/2} ${e.y+2}T${e.x} ${e.y}`,pathLength:1},t))})]})}var Je=`./`,J=p[0],Y=p[1],[X,Ye]=s.about,Z=e=>e.replace(/^https?:\/\//,``).replace(/\/$/,``),Q=(e,t)=>e.includes(t)?t:``,Xe=[{id:`me`,fx:.17,fy:.13,px:.5,py:.08,cls:`n-me`,children:(0,U.jsx)(`span`,{className:`w`,children:s.first})},{id:`debate`,fx:.6,fy:.15,px:.27,py:.32,children:(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`span`,{className:`w`,children:`Debate`}),(0,U.jsx)(`span`,{className:`f`,children:Q(X,`it took over`)})]})},{id:`phil`,fx:.8,fy:.46,px:.3,py:.56,children:(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`span`,{className:`w`,children:`Philosophy`}),(0,U.jsx)(`span`,{className:`f`,children:Q(X,`an argument about ethics with a timer running`)})]})},{id:`research`,fx:.66,fy:.83,px:.3,py:.84,children:(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`span`,{className:`w`,children:`Research`}),(0,U.jsx)(`span`,{className:`f`,children:Q(X,`how a skeptic can criticise language using language`)})]})},{id:`build`,fx:.17,fy:.5,px:.74,py:.42,children:(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`span`,{className:`w`,children:`Building`}),(0,U.jsx)(`span`,{className:`f`,children:Q(Ye,`I wanted the thing to exist`)})]})},{id:`mitez`,fx:.24,fy:.85,px:.72,py:.72,children:(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`span`,{className:`w`,children:`MITEZ`}),(0,U.jsx)(`span`,{className:`f`,children:Q(Ye,`the same instinct pointed at people`)})]})}],Ze=[[`me`,`debate`],[`debate`,`phil`],[`phil`,`research`],[`me`,`build`],[`build`,`mitez`]],[Qe,$e]=l.wins,et=e=>(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`span`,{className:`lab`,children:e.title}),(0,U.jsx)(`span`,{className:`big`,children:e.where}),(0,U.jsxs)(`span`,{className:`sub`,children:[e.event,`, `,e.when]})]}),tt=[{id:`ld`,fx:.5,fy:.47,px:.86,py:.5,cls:`n-ld`,children:(0,U.jsx)(`span`,{className:`w`,children:`Lincoln-Douglas`})},{id:`w1`,fx:.22,fy:.2,px:.31,py:.15,cls:`n-win`,children:et(Qe)},{id:`w2`,fx:.78,fy:.2,px:.31,py:.5,cls:`n-win`,children:et($e)},{id:`sk`,fx:.5,fy:.84,px:.31,py:.86,cls:`n-sk`,children:(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`span`,{className:`big`,children:l.team.name}),(0,U.jsx)(`span`,{className:`sub`,children:l.team.role})]})}],nt=[[`ld`,`w1`],[`ld`,`w2`],[`ld`,`sk`]],[rt,it,at]=J.ladders,ot=J.epigraph,$=e=>(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`span`,{className:`big`,children:e.who}),(0,U.jsx)(`span`,{className:`lab`,children:e.when}),(0,U.jsx)(`span`,{className:`sub`,children:e.where})]}),st=[{id:`sx`,fx:.2,fy:.87,px:.4,py:.1,cls:`n-who`,children:$(rt)},{id:`ma`,fx:.46,fy:.56,px:.6,py:.38,cls:`n-who`,children:$(it)},{id:`wi`,fx:.76,fy:.18,px:.5,py:.76,cls:`n-who n-wi`,children:(0,U.jsxs)(U.Fragment,{children:[$(at),(0,U.jsx)(`span`,{className:`epi`,children:ot.text}),(0,U.jsx)(`span`,{className:`src`,children:ot.source})]})}],ct=[[`sx`,`ma`],[`ma`,`wi`]],[lt]=ee,ut=[{id:`pin`,fx:0,fy:0,pin:!0},{id:`mail`,fx:.4,fy:.58,px:.52,py:.62,href:lt.href,cls:`n-mail`,children:(0,U.jsx)(`span`,{className:`big`,children:lt.value})}],dt=[[`about`,`About`],[`debate`,`Debate`],[`research`,`Research`],[`work`,`Work`],[`today`,`Today`],[`github`,`GitHub`],[`now`,`Now`],[`record`,`Record`],[`contact`,`Contact`]];function ft(e){(0,H.useEffect)(()=>{if(v)return;let t=[...e.current.querySelectorAll(`[data-sway]`)].map((e,t)=>({el:e,a:0,v:0,k:26+t%3*5,s:t%2?1:-.8,vis:!1,last:0})),n=new IntersectionObserver(e=>e.forEach(e=>{let n=t.find(t=>t.el===e.target);n&&(n.vis=e.isIntersecting)})),i=[];t.forEach(e=>{n.observe(e.el);let t=t=>{e.v+=Math.max(-30,Math.min(30,t.movementX))*.006},r=()=>{e.v+=.35*e.s};e.el.addEventListener(`pointermove`,t),e.el.addEventListener(`pointerdown`,r),i.push(()=>{e.el.removeEventListener(`pointermove`,t),e.el.removeEventListener(`pointerdown`,r)})});let a=(e,n)=>{let r=Math.min(.033,n/1e3);for(let e of t){if(!e.vis)continue;let t=Math.max(-6,Math.min(6,_.v))*.55*e.s;e.v+=(-e.k*e.a-1.6*e.v+t)*r,e.a=Math.max(-.045,Math.min(.045,e.a+e.v*r)),Math.abs(e.a-e.last)>2e-4&&(e.el.style.transform=`rotate(${e.a.toFixed(4)}rad)`,e.last=e.a)}};return r.ticker.add(a),()=>{r.ticker.remove(a),n.disconnect(),i.forEach(e=>e())}},[e])}function pt(){te(`debt`);let e=(0,H.useRef)(null),[t,n]=(0,H.useState)(oe),{notes:r,loaded:p}=ie(),_=ne(),[v,se]=(0,H.useState)(0);ft(e),(0,H.useEffect)(()=>{let e=()=>n(oe());return window.addEventListener(`resize`,e),()=>window.removeEventListener(`resize`,e)},[]);let y=r[Math.min(v,Math.max(0,r.length-1))],b=[];for(let e=0;e<c.length;e+=t?1:2)b.push(c.slice(e,e+(t?1:2)));return(0,U.jsxs)(`div`,{className:`v-debt`,ref:e,children:[(0,U.jsx)(`a`,{className:`skip-x`,href:`#main`,children:`Skip to content`}),(0,U.jsx)(qe,{}),(0,U.jsx)(`header`,{className:`top`,children:(0,U.jsx)(`nav`,{"aria-label":`Sections`,className:`nav`,children:(0,U.jsx)(`ul`,{children:dt.map(([e,t])=>(0,U.jsx)(`li`,{children:(0,U.jsx)(`a`,{href:`#${e}`,children:t})},e))})})}),(0,U.jsxs)(`main`,{id:`main`,children:[(0,U.jsxs)(`section`,{className:`hero`,"aria-labelledby":`name`,children:[(0,U.jsxs)(`div`,{className:`hero-copy`,children:[(0,U.jsxs)(`h1`,{id:`name`,"data-thread-start":!0,children:[s.first,(0,U.jsx)(`br`,{}),s.last]}),(0,U.jsx)(`p`,{className:`line`,children:s.line}),(0,U.jsx)(`p`,{className:`short`,children:s.short.join(` `)}),(0,U.jsx)(`p`,{className:`hint`,"aria-hidden":`true`,children:`Pull any word. It comes back.`})]}),(0,U.jsx)(q,{className:`g-hero`,label:`How one thing led to another: drag the words`,nodes:Xe,edges:Ze,phone:t,openFrom:`me`})]}),(0,U.jsxs)(`section`,{id:`about`,className:`sec about`,"aria-labelledby":`h-about`,children:[(0,U.jsx)(`h2`,{id:`h-about`,"data-stitch":!0,children:`About`}),(0,U.jsxs)(`div`,{className:`about-body`,children:[s.about.map(e=>(0,U.jsx)(`p`,{children:e},e.slice(0,12))),(0,U.jsx)(`p`,{className:`aside`,children:s.aside})]})]}),(0,U.jsxs)(`section`,{id:`debate`,className:`sec debate`,"aria-labelledby":`h-debate`,children:[(0,U.jsx)(`h2`,{id:`h-debate`,"data-stitch":!0,children:`Debate`}),(0,U.jsxs)(`p`,{className:`lede`,children:[d[1].title,`, both in Lincoln-Douglas.`]}),(0,U.jsx)(q,{className:`g-debate`,label:`Lincoln-Douglas, tied to two championships and to Skeptical`,nodes:tt,edges:nt,phone:t}),(0,U.jsxs)(`div`,{className:`debate-below`,children:[(0,U.jsxs)(`div`,{className:`team`,children:[(0,U.jsxs)(`h3`,{children:[l.team.name,`, `,(0,U.jsx)(`span`,{children:l.team.role.toLowerCase()})]}),(0,U.jsx)(`p`,{children:l.team.line}),(0,U.jsx)(`p`,{className:`muted`,children:l.team.record}),(0,U.jsx)(`a`,{className:`go`,href:l.team.href,children:Z(l.team.href)})]}),(0,U.jsxs)(`div`,{className:`next`,children:[(0,U.jsx)(`h3`,{children:`Up next`}),(0,U.jsx)(`ul`,{children:l.next.map(e=>(0,U.jsxs)(`li`,{children:[(0,U.jsx)(`span`,{className:`where`,children:e.where}),(0,U.jsx)(`span`,{className:`ev`,children:e.event})]},e.where))})]})]})]}),(0,U.jsxs)(`section`,{id:`research`,className:`sec research`,"aria-labelledby":`h-research`,children:[(0,U.jsx)(`h2`,{id:`h-research`,"data-stitch":!0,children:`Research`}),(0,U.jsxs)(`div`,{className:`research-grid`,children:[(0,U.jsxs)(`div`,{className:`paper-field`,children:[(0,U.jsx)(q,{className:`g-paper`,label:`Sextus Empiricus, Fritz Mauthner and Ludwig Wittgenstein, tied in time order`,nodes:st,edges:ct,phone:t}),(0,U.jsx)(`p`,{className:`hint`,children:`Pull Wittgenstein away from Mauthner. The thread holds.`})]}),(0,U.jsxs)(`div`,{className:`paper`,children:[(0,U.jsxs)(`p`,{className:`status`,children:[J.status,`, `,J.pages,` pages`]}),(0,U.jsx)(`h3`,{children:J.title}),(0,U.jsx)(`p`,{children:J.abstract}),(0,U.jsx)(`ul`,{className:`kw`,"aria-label":`Keywords`,children:J.keywords.map(e=>(0,U.jsx)(`li`,{children:e},e))}),(0,U.jsx)(`ul`,{className:`plinks`,children:J.links.map(e=>(0,U.jsx)(`li`,{children:(0,U.jsx)(`a`,{href:e.href,children:e.label})},e.label))})]})]}),(0,U.jsxs)(`div`,{className:`wess`,children:[(0,U.jsx)(`h3`,{children:Y.title}),(0,U.jsx)(`p`,{children:Y.abstract}),(0,U.jsx)(`p`,{className:`muted`,children:Y.status})]})]}),(0,U.jsxs)(`section`,{id:`work`,className:`sec work`,"aria-labelledby":`h-work`,children:[(0,U.jsx)(`h2`,{id:`h-work`,"data-stitch":!0,children:`Work`}),b.map((e,t)=>(0,U.jsx)(`div`,{className:`work-row`,children:e.map(e=>(0,U.jsxs)(`article`,{className:`work-item`,children:[(0,U.jsxs)(`div`,{className:`hang`,"data-sway":!0,children:[(0,U.jsx)(`i`,{className:`str l`}),(0,U.jsx)(`i`,{className:`str r`}),(0,U.jsx)(`img`,{src:Je+e.img,alt:`${e.name}, a screenshot`,loading:t<1?`eager`:`lazy`,width:1200,height:750})]}),(0,U.jsxs)(`div`,{className:`work-text`,children:[(0,U.jsx)(`p`,{className:`lab`,children:e.kind}),(0,U.jsx)(`h3`,{children:e.name}),(0,U.jsx)(`p`,{children:e.line}),(0,U.jsx)(`p`,{className:`stack`,children:e.stack}),e.href?(0,U.jsx)(`a`,{className:`go`,href:e.href,children:Z(e.href)}):(0,U.jsx)(`p`,{className:`go off`,children:`Not public`})]})]},e.slug))},t))]}),(0,U.jsxs)(`section`,{id:`today`,className:`sec today`,"aria-labelledby":`h-today`,children:[(0,U.jsx)(`h2`,{id:`h-today`,"data-stitch":!0,children:`Today`}),(0,U.jsxs)(`div`,{className:`today-grid`,children:[(0,U.jsx)(`article`,{className:`note`,"aria-live":`polite`,children:p?y?(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`p`,{className:`lab`,children:v===0?`Latest note`:`From the notes`}),(0,U.jsx)(`p`,{className:`note-date`,children:(0,U.jsx)(`time`,{dateTime:y.date,children:ae(y.date)})}),y.body.map((e,t)=>(0,U.jsx)(`p`,{className:`note-p`,children:e},t))]}):(0,U.jsxs)(U.Fragment,{children:[(0,U.jsx)(`p`,{className:`note-date`,children:`No note yet`}),(0,U.jsx)(`p`,{className:`note-p`,children:`Nothing posted yet. Check back tomorrow.`})]}):(0,U.jsx)(`p`,{className:`note-date`,children:`Fetching today’s note`})}),r.length>1?(0,U.jsxs)(`nav`,{className:`notes`,"aria-label":`Earlier notes`,children:[(0,U.jsx)(`h3`,{children:`Every note`}),(0,U.jsx)(`ul`,{children:r.map((e,t)=>(0,U.jsx)(`li`,{children:(0,U.jsxs)(`button`,{type:`button`,"aria-pressed":v===t,onClick:()=>se(t),children:[(0,U.jsx)(`span`,{children:ae(e.date,{day:`numeric`,month:`long`})}),(0,U.jsx)(`span`,{className:`peek`,children:e.body[0]})]})},e.date))})]}):null]})]}),(0,U.jsxs)(`section`,{id:`github`,className:`sec github`,"aria-labelledby":`h-github`,children:[(0,U.jsx)(`h2`,{id:`h-github`,"data-stitch":!0,children:`Live from GitHub`}),(0,U.jsxs)(`div`,{className:_.activity.length?`gh-grid`:`gh-grid solo`,children:[_.activity.length?(0,U.jsxs)(`div`,{className:`commits`,children:[(0,U.jsx)(`h3`,{children:`Latest commits`}),(0,U.jsx)(`ol`,{children:_.activity.slice(0,6).map(e=>(0,U.jsx)(`li`,{children:(0,U.jsxs)(`a`,{href:e.href,children:[(0,U.jsx)(`span`,{className:`msg`,children:e.message}),(0,U.jsxs)(`span`,{className:`meta`,children:[e.repo,`, `,re(e.at)]})]})},e.href))})]}):null,(0,U.jsxs)(`div`,{className:`repos`,children:[(0,U.jsx)(`h3`,{children:_.live?`Pushed to most recently`:`Repositories`}),(0,U.jsx)(`ul`,{children:_.repos.slice(0,6).map(e=>(0,U.jsx)(`li`,{children:(0,U.jsxs)(`a`,{href:e.href,children:[(0,U.jsx)(`span`,{className:`rn`,children:e.name}),e.description?(0,U.jsx)(`span`,{className:`rd`,children:e.description}):null,(0,U.jsx)(`span`,{className:`rl`,children:[e.language,e.pushedAt?re(e.pushedAt):``].filter(Boolean).join(`, `)})]})},e.name))}),(0,U.jsx)(`a`,{className:`go`,href:h.href,children:Z(h.href)})]})]})]}),(0,U.jsxs)(`section`,{id:`now`,className:`sec now`,"aria-labelledby":`h-now`,children:[(0,U.jsx)(`h2`,{id:`h-now`,"data-stitch":!0,children:`Now`}),(0,U.jsx)(`p`,{className:`status-line`,children:o.status}),(0,U.jsxs)(`div`,{className:`now-grid`,children:[(0,U.jsxs)(`div`,{children:[(0,U.jsx)(`h3`,{children:o.reading.title}),(0,U.jsx)(`p`,{children:o.reading.body}),(0,U.jsx)(`ul`,{className:`shelves`,children:o.reading.shelves.map(e=>(0,U.jsx)(`li`,{children:e},e))})]}),(0,U.jsxs)(`div`,{children:[(0,U.jsx)(`h3`,{children:o.club.title}),(0,U.jsx)(`p`,{children:o.club.body})]})]})]}),(0,U.jsxs)(`section`,{id:`record`,className:`sec record`,"aria-labelledby":`h-record`,children:[(0,U.jsx)(`h2`,{id:`h-record`,"data-stitch":!0,children:`Record`}),(0,U.jsxs)(`div`,{className:`record-grid`,children:[(0,U.jsx)(`ol`,{className:`honors`,children:a.map(e=>(0,U.jsxs)(`li`,{children:[(0,U.jsx)(`span`,{className:`what`,children:e.what}),(0,U.jsx)(`span`,{className:`det`,children:e.detail})]},e.what))}),(0,U.jsx)(`div`,{className:`awards`,children:g.map(e=>(0,U.jsxs)(`figure`,{className:`award`,children:[(0,U.jsxs)(`div`,{className:`hang tall`,"data-sway":!0,children:[(0,U.jsx)(`i`,{className:`str l`}),(0,U.jsx)(`i`,{className:`str r`}),(0,U.jsx)(`img`,{src:Je+e.img,alt:`Certificate for ${e.site}`,loading:`lazy`,width:720,height:1018})]}),(0,U.jsxs)(`figcaption`,{children:[(0,U.jsx)(`a`,{href:e.href,children:e.site}),(0,U.jsx)(`span`,{children:e.note})]})]},e.site))})]})]}),(0,U.jsxs)(`section`,{id:`off`,className:`sec off`,"aria-labelledby":`h-off`,children:[(0,U.jsx)(`h2`,{id:`h-off`,"data-stitch":!0,children:`Off the record`}),(0,U.jsxs)(`div`,{className:`off-grid`,children:[(0,U.jsxs)(`div`,{children:[(0,U.jsx)(`h3`,{children:`Likes`}),(0,U.jsx)(`ul`,{children:u.map(e=>(0,U.jsx)(`li`,{children:e},e))})]}),(0,U.jsxs)(`div`,{children:[(0,U.jsx)(`h3`,{children:`Dislikes`}),(0,U.jsx)(`ul`,{children:i.map(e=>(0,U.jsx)(`li`,{children:e},e))})]}),(0,U.jsxs)(`div`,{children:[(0,U.jsx)(`h3`,{children:`Favourites`}),(0,U.jsx)(`ul`,{children:f.map(e=>(0,U.jsx)(`li`,{children:e},e))})]}),(0,U.jsxs)(`div`,{children:[(0,U.jsx)(`h3`,{children:`Courses`}),(0,U.jsx)(`ul`,{children:m.map(e=>(0,U.jsxs)(`li`,{children:[(0,U.jsxs)(`strong`,{children:[e.provider,`, `,e.title,`.`]}),` `,e.note]},e.title))})]})]})]}),(0,U.jsxs)(`section`,{id:`contact`,className:`sec contact`,"aria-labelledby":`h-contact`,children:[(0,U.jsx)(`h2`,{id:`h-contact`,"data-stitch":!0,children:`Contact`}),(0,U.jsx)(`p`,{className:`lede`,children:`The thread from his name ends here. Pull it.`}),(0,U.jsx)(`div`,{"data-thread-end":!0,className:`end-wrap`,children:(0,U.jsx)(q,{className:`g-end`,label:`His email, at the end of the thread`,nodes:ut,edges:[[`pin`,`mail`]],phone:t})}),(0,U.jsx)(`ul`,{className:`links`,children:ee.slice(1).map(e=>(0,U.jsxs)(`li`,{children:[(0,U.jsx)(`span`,{className:`lab`,children:e.label}),e.href?(0,U.jsx)(`a`,{href:e.href,children:e.value}):(0,U.jsx)(`span`,{className:`val`,children:e.value})]},e.label))})]})]}),(0,U.jsxs)(`footer`,{className:`foot`,children:[(0,U.jsx)(`p`,{children:`Draft 70 of the portfolio. Not the live site.`}),(0,U.jsx)(`p`,{className:`muted`,children:`The threads are remixed from the pmndrs bezier-curves-and-nodes example (MIT). Set in Newsreader and Schibsted Grotesk.`})]})]})}export{pt as default};