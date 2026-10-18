import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const $=id=>document.getElementById(id);
const state={height:1,density:1,width:1,curve:0.5,variation:0.5,hue:0,saturation:1,brightness:1,roughness:.96,wind:.18,speed:1,direction:35,gust:0.35,turbulence:0.35,waveScale:1.0,audioGain:0,windColor:0.3,tiles:1,seed:20261017,directionVariation:45,speedVariation:35,changeInterval:6,smoothness:80,windSeed:16101,profile:0.65,tipRound:0,twist:0,cluster:0,opacity:1,emission:0,gradient:0.25,reactiveGlow:0.3,creativeMode:0,dynamicBend:0.35,audioMorph:0.50,morphFrequency:1.0,colorPulse:0.25,formMode:0,solidCount:450,solidScale:1,solidMotion:0.5,formAmplitude:0.6,patternScale:1.0,patternSharpness:0.5,paletteMode:0,paletteShift:0,paletteContrast:0.7,paletteFlow:0.35};
const defaults={...state};
const ranges={height:[.45,2.3],density:[.1,1],width:[.4,2.5],curve:[0,1],variation:[0,1],hue:[-150,150],saturation:[0,2],brightness:[.3,1.7],roughness:[.2,1],wind:[0,.6],speed:[0,3],direction:[0,360],gust:[0,1],turbulence:[0,1],waveScale:[0.2,3],audioGain:[0,2],windColor:[0,1],tiles:[1,9],seed:[1,999999999],directionVariation:[0,180],speedVariation:[0,100],changeInterval:[1,30],smoothness:[0,100],windSeed:[1,999999999],profile:[0,1],tipRound:[0,1],twist:[0,1],cluster:[0,1],opacity:[0.35,1],emission:[0,2],gradient:[0,1],reactiveGlow:[0,1],creativeMode:[0,1],dynamicBend:[0,1.5],audioMorph:[0,1.5],morphFrequency:[0.1,4],colorPulse:[0,1],formMode:[0,8],solidCount:[50,1200],solidScale:[0.25,3],solidMotion:[0,1.5],formAmplitude:[0,2],patternScale:[0.3,3],patternSharpness:[0,1],paletteMode:[0,3],paletteShift:[-180,180],paletteContrast:[0,1.5],paletteFlow:[0,1.5]};
const names=Object.keys(state).filter(k=>!['seed','windSeed','creativeMode','formMode','paletteMode'].includes(k));
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;$('app').appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0xb9d8ff);scene.fog=new THREE.Fog(0xb9d8ff,15,65);
const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.1,200);camera.position.set(6,4.5,7);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.target.set(0,.15,0);controls.maxPolarAngle=Math.PI*.49;
scene.add(new THREE.HemisphereLight(0xffffff,0x73935e,1.35));const sunlight=new THREE.DirectionalLight(0xffffff,1.35);sunlight.position.set(6,12,7);scene.add(sunlight);
let tilesRoot=new THREE.Group();scene.add(tilesRoot);let tileSource=null;let shaders=[];let materials=[];let meshCount=0;const clock=new THREE.Clock();
let audioLevel=0, audioContext=null, audioStream=null, analyser=null, audioData=null;
let micEnabled=false;
let windStartTime=0;
const FORM_MODES=['grass','bubble','wave','zigzag','spiral','bubble3d','spike3d','crystal3d','orbcluster'];
const PALETTE_MODES=['rainbow','duotone','tritone','pastel'];
const customPalette=['#285be5','#ff9bc9','#f2d35d'];
const solidForms=new Set(['bubble3d','spike3d','crystal3d','orbcluster']);
const palette=['#497c35','#528a39','#5b9241','#659b43','#76a64c','#83a951'].map(c=>new THREE.Color(c));
const groundColor=new THREE.Color('#37692e');
let groundMaterial=null, importedScene=null, importedName='', particleGroup=new THREE.Group(),particleMeshes=[],particleTransforms=[];
scene.add(particleGroup);
const particleState={count:300,scale:0.6,spread:4,height:0.2,motion:0.35,spin:0.45,seed:6314};
const behavior={mode:'float',strength:0.65,speed:1,audioSpread:0,colorSync:0.35,pointer:true};
const behaviorDefaults={...behavior};
const behaviorTarget=new THREE.Vector3(0,0.6,0);
const behaviorRay=new THREE.Raycaster();const behaviorPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-0.6);const pointerCoords=new THREE.Vector2();
function randGen(seed){let n=seed>>>0;return ()=>{n=(1664525*n+1013904223)>>>0;return n/4294967296;};}
// Stateless seeded stochastic wind: the same seed, parameters and elapsed time
// reproduce the same wind changes (apart from external audio input).
function hash01(seed, index, channel) {
 let x = (Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(seed | 0, 0x85ebca6b) ^ Math.imul(channel + 1, 0xc2b2ae35)) >>> 0;
 x ^= x >>> 16; x = Math.imul(x, 0x7feb352d) >>> 0;
 x ^= x >>> 15; x = Math.imul(x, 0x846ca68b) >>> 0;
 x ^= x >>> 16;
 return x / 4294967296;
}
function sampledWind(t) {
 const period = Math.max(1, state.changeInterval);
 const step = Math.floor(t / period);
 const f = (t / period) - step;
 // A cosine interpolation prevents abrupt jumps and keeps continuous derivatives.
 const curved = f * f * (3 - 2 * f);
 // SMOOTHNESS moves between linear and ease-in-out interpolation.
 const mix = THREE.MathUtils.lerp(f, curved, state.smoothness / 100);
 const directionOffset = THREE.MathUtils.lerp(
  2 * hash01(state.windSeed, step, 0) - 1,
  2 * hash01(state.windSeed, step + 1, 0) - 1, mix
 ) * state.directionVariation;
 const speedOffset = THREE.MathUtils.lerp(
  2 * hash01(state.windSeed, step, 1) - 1,
  2 * hash01(state.windSeed, step + 1, 1) - 1, mix
 ) * state.speedVariation / 100;
 return {
  directionDegrees: ((state.direction + directionOffset) % 360 + 360) % 360,
  directionOffset,
  speedScale: Math.max(0, 1 + speedOffset)
 };
}

function paletteLerp(a,b,t){return new THREE.Color(a.r+(b.r-a.r)*t,a.g+(b.g-a.g)*t,a.b+(b.b-a.b)*t);}
function hsl(h,s,l){const c=new THREE.Color();c.setHSL((h%1+1)%1,THREE.MathUtils.clamp(s,0,1),THREE.MathUtils.clamp(l,0,1));return c;}
function mixWithWhite(color,amount){return paletteLerp(color,new THREE.Color(1,1,1),amount);}
function getActivePalette(){
 const shift=state.paletteShift/360;
 const contrast=state.paletteContrast;
 const mode=PALETTE_MODES[state.paletteMode] || 'rainbow';
 if(mode==='duotone'){
   const a=hsl(0.56+shift,0.55+0.25*contrast,0.35+0.05*contrast);
   const b=hsl(0.92+shift,0.75,0.66);
   return Array.from({length:6},(_,i)=>new THREE.Color(customPalette[i%2]));
 }
 if(mode==='tritone'){
   const a=hsl(0.12+shift,0.82,0.60);
   const b=hsl(0.52+shift,0.78,0.54);
   const c=hsl(0.84+shift,0.80,0.62);
   return Array.from({length:6},(_,i)=>new THREE.Color(customPalette[i%3]));
 }
 if(mode==='pastel'){
   const base=[hsl(0.92+shift,0.45,0.75),hsl(0.08+shift,0.48,0.80),hsl(0.18+shift,0.55,0.78),hsl(0.48+shift,0.40,0.76),hsl(0.62+shift,0.38,0.79),hsl(0.78+shift,0.36,0.80)];
   return base.map(c=>mixWithWhite(c,0.15+0.2*(1-Math.min(1,contrast))));
 }
 return Array.from({length:6},(_,i)=>hsl(shift+i/6,0.75+0.15*Math.min(1,contrast),0.48+0.08*Math.sin(i)));
}

function updateLabels(){for(const key of names){const node=$(key);if(node) node.value=state[key];const value=$(key+'Val');if(value)value.textContent=(key==='hue'||key==='paletteShift')?String(Math.round(state[key])):Number(state[key]).toFixed(2);} }
function paintMaterials(){const active=getActivePalette();for(let i=0;i<materials.length;i++){let m=materials[i];const base=active[i%active.length];const hslv={};base.getHSL(hslv);m.color.setHSL((hslv.h+state.hue/360+1)%1,THREE.MathUtils.clamp(hslv.s*state.saturation,0,1),THREE.MathUtils.clamp(hslv.l*state.brightness,.02,.93));m.roughness=state.roughness;m.transparent=state.opacity<0.999;m.opacity=state.opacity;m.depthWrite=state.opacity>=0.999;m.emissive.copy(m.color).multiplyScalar(state.emission*0.23);} }
function windMaterial(i){
 const m=new THREE.MeshStandardMaterial({color:palette[i],side:THREE.DoubleSide,roughness:state.roughness});
 m.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{
   uTime:{value:0},uWind:{value:state.wind},uSpeed:{value:state.speed},
   uDirection:{value:state.direction*Math.PI/180},uGust:{value:state.gust},
   uTurbulence:{value:state.turbulence},uWaveScale:{value:state.waveScale},
   uAudio:{value:0},uDynamicBend:{value:state.dynamicBend},uAudioMorph:{value:state.audioMorph},uMorphFrequency:{value:state.morphFrequency},uColorPulse:{value:state.colorPulse},uPaletteFlow:{value:state.paletteFlow},uColorReact:{value:state.windColor},uGradient:{value:state.gradient},uReactGlow:{value:state.reactiveGlow},uEmission:{value:state.emission}
  });
  m.userData.shader=shader;shaders.push(shader);
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
  uniform float uTime,uWind,uSpeed,uDirection,uGust,uTurbulence,uWaveScale,uAudio,uColorReact;
  uniform float uDynamicBend,uAudioMorph,uMorphFrequency,uColorPulse,uPaletteFlow;
  varying float vDynamicExpression;
  varying float vWindExpression;
  varying float vBladeHeight;
  `).replace('#include <begin_vertex>',`#include <begin_vertex>
  float weight=pow(smoothstep(0.004,0.13,position.y),1.6);
  vec2 worldXZ=(modelMatrix*vec4(position,1.0)).xz;
  vec2 axis=vec2(cos(uDirection),sin(uDirection));
  float along=dot(worldXZ,axis);
  float across=dot(worldXZ,vec2(-axis.y,axis.x));
  float elapsed=uTime*max(uSpeed,0.0);
  float wave=sin(along*2.9*uWaveScale-elapsed*2.4);
  float crosswave=sin(across*4.1*uWaveScale+elapsed*1.35);
  float turbulence=sin(worldXZ.x*9.1+worldXZ.y*3.3+elapsed*5.7)*sin(worldXZ.y*7.3-elapsed*3.9);
  float gustShape=pow(0.5+0.5*sin(elapsed*0.8+sin(elapsed*0.21)),5.0);
  float oscillation=0.55*wave+0.18*crosswave+uTurbulence*0.3*turbulence;
  float strength=uWind*(1.0+uGust*1.7*gustShape)+uAudio;
  // Bending follows wind direction; roots stay fixed.
  transformed.x+=axis.x*strength*oscillation*weight;
  transformed.z+=axis.y*strength*oscillation*weight;
  // v1.6.3: animate the blade silhouette, not only its rigid swaying.
  // The roots remain fixed while upper parts curl and widen rhythmically.
  float motionPhase = elapsed*uMorphFrequency*2.1 + dot(worldXZ,vec2(3.7,5.3));
  float dynamicPulse = sin(motionPhase)*0.5+0.5;
  float morph = (uDynamicBend*dynamicPulse + uAudioMorph*uAudio*3.0);
  vec2 sideAxis=vec2(-axis.y,axis.x);
  transformed.xz += sideAxis * (0.025*morph*weight*sin(motionPhase+position.y*8.0));
  transformed.y += 0.018*morph*weight*sin(motionPhase*0.75+position.y*9.0);
  vDynamicExpression = clamp(morph*0.5 + uColorPulse*dynamicPulse,0.0,1.0);
  vWindExpression=clamp(abs(oscillation)*strength*4.0,0.0,1.0);
  vBladeHeight=clamp(position.y/0.16,0.,1.);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
  varying float vWindExpression;
  uniform float uColorReact,uGradient,uReactGlow,uEmission,uColorPulse,uPaletteFlow,uTime;
  varying float vDynamicExpression;
  varying float vBladeHeight;
  `).replace('#include <color_fragment>',`#include <color_fragment>
  // Expressive mapping: stronger wind produces brighter / warmer highlights.
  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.73,0.92,0.46),vWindExpression*uColorReact*0.55);
  diffuseColor.rgb *= mix(0.7+0.3*vBladeHeight,1.0,uGradient);
  diffuseColor.rgb += vec3(0.1,0.28,0.07)*vWindExpression*uReactGlow*0.5;
  vec3 spectrum = 0.5 + 0.5*cos(vec3(0.0,2.1,4.2) + (vBladeHeight*6.2831 + uTime*0.7)*uPaletteFlow);
  diffuseColor.rgb=mix(diffuseColor.rgb,spectrum,vDynamicExpression*uColorPulse*0.6);
  `);
 };
 m.customProgramCacheKey=()=> 'grass-164-generative-form-color';
 materials.push(m);return m;
}
// Clip leaf polygons exactly at +/-2m so repeated tiles share a periodic boundary.
function clip(poly,axis,bound,greater){const result=[];for(let i=0;i<poly.length;i++){const a=poly[(i+poly.length-1)%poly.length],b=poly[i],aa=a[axis],bb=b[axis];const ia=greater?aa>=bound:aa<=bound,ib=greater?bb>=bound:bb<=bound;if(ia!==ib){const t=(bound-aa)/(bb-aa);result.push(a.map((v,k)=>v+(b[k]-v)*t));}if(ib)result.push(b);}return result;}
function createGeometry(){
 const arrays=getActivePalette().map(()=>[]),r=randGen(state.seed),grid=85,step=4/grid;
 let blades=0,triangles=0;
 function triangle(pts,mi){const xs=pts.map(p=>p[0]),zs=pts.map(p=>p[2]);
  for(const sx of [-4,0,4]){if(Math.max(...xs)+sx< -2||Math.min(...xs)+sx>2)continue;
   for(const sz of [-4,0,4]){if(Math.max(...zs)+sz< -2||Math.min(...zs)+sz>2)continue;
    let polygon=pts.map(p=>[p[0]+sx,p[1],p[2]+sz]);
    for(const [axis,bound,greater] of [[0,-2,true],[0,2,false],[2,-2,true],[2,2,false]]){
     if(polygon.length<3)break;polygon=clip(polygon,axis,bound,greater);
    }
    for(let k=1;k<polygon.length-1;k++){
     const p=polygon[0],q=polygon[k],u=polygon[k+1];
     const ab=new THREE.Vector3(...q).sub(new THREE.Vector3(...p));
     const ac=new THREE.Vector3(...u).sub(new THREE.Vector3(...p));
     if(ab.cross(ac).lengthSq()<1e-14)continue;
     arrays[mi].push(...p,...q,...u);triangles++;
    }
   }
  }
 }
 const form = FORM_MODES[state.formMode] || 'grass';
 for(let z=0;z<grid;z++)for(let x=0;x<grid;x++)for(let n=0;n<2;n++){
  if(r()>state.density)continue;
  let cx=-2+(x+.5+(r()-.5)*.92)*step;
  let cz=-2+(z+.5+(r()-.5)*.92)*step;
  const groupSize=3,gi=Math.floor(x/groupSize),gj=Math.floor(z/groupSize);
  const cxGroup=-2+(gi*groupSize+1.5)*step;
  const czGroup=-2+(gj*groupSize+1.5)*step;
  cx=THREE.MathUtils.lerp(cx,cxGroup+(r()-.5)*step*.7,state.cluster*.78);
  cz=THREE.MathUtils.lerp(cz,czGroup+(r()-.5)*step*.7,state.cluster*.78);
  const h=(.085+(r()-.5)*.033*state.variation)*state.height;
  const baseWidth=(.012+(r()-.5)*.007*state.variation)*state.width;
  const theta=r()*Math.PI*2;
  const bendAngle=r()*Math.PI*2;
  const bend=state.curve*(.008+.03*r())*(.45+state.variation*.5);
  const dx=Math.cos(bendAngle)*bend,dz=Math.sin(bendAngle)*bend;
  const twistSign=r()<.5?-1:1;
  const mi=Math.min(5,Math.floor(r()*6));
  const segments=6;
  let previousL=null,previousR=null;
  for(let i=0;i<=segments;i++){
   const t=i/segments;
   const offset=t*t;
   let angle=theta+twistSign*state.twist*Math.PI*1.8*t;
   let localX=0, localZ=0;
   let widthMul=1;
   let y = .002 + h*t;
   const amp=state.formAmplitude;
   const scale=state.patternScale;
   const sharp=state.patternSharpness;
   if(form==='bubble'){
    const bubble=Math.pow(Math.sin(Math.PI*t), 0.4+1.8*(1-sharp));
    widthMul = 0.55 + amp*1.7*bubble;
    y = .002 + h*(0.12 + 0.88*t);
    localX += Math.cos(theta)*0.008*amp*Math.sin(2*Math.PI*t*scale);
    localZ += Math.sin(theta)*0.008*amp*Math.sin(2*Math.PI*t*scale);
   } else if(form==='wave'){
    const wave=Math.sin((t*2.0-0.2)*Math.PI*scale + theta*2.0);
    localX += Math.cos(theta+Math.PI/2)*0.05*amp*wave;
    localZ += Math.sin(theta+Math.PI/2)*0.05*amp*wave;
    widthMul = 0.7 + 0.9*Math.abs(wave)*amp + 0.4*state.profile;
    y = .002 + h*t + 0.015*amp*Math.sin(t*Math.PI*scale*2.0);
   } else if(form==='zigzag'){
    const phase=t*segments*scale;
    const tri=(2/Math.PI)*Math.asin(Math.sin(phase*Math.PI));
    localX += Math.cos(theta+Math.PI/2)*0.035*amp*tri;
    localZ += Math.sin(theta+Math.PI/2)*0.035*amp*tri;
    widthMul = 0.55 + amp*(0.55+0.8*Math.abs(tri));
    angle += tri*sharp*1.4;
   } else if(form==='spiral'){
    const radius=0.008 + 0.03*amp*t;
    const phi=theta + t*Math.PI*(2.0+3.5*scale);
    localX += Math.cos(phi)*radius;
    localZ += Math.sin(phi)*radius;
    angle = phi + Math.PI/2;
    widthMul = 0.55 + 0.55*amp*(0.5+0.5*Math.sin(phi*2.0));
   } else {
    widthMul = 1 + 0.2*amp*Math.sin(Math.PI*t);
   }
   const ux=Math.cos(angle),uz=Math.sin(angle);
   const broaden=state.profile*Math.sin(Math.PI*t)*.7;
   const endFactor=i===segments?THREE.MathUtils.lerp(1,0.24,state.tipRound):1;
   const hw=Math.max(.00002,baseWidth*.5*(1-t+broaden)*endFactor*widthMul);
   const center=[cx+dx*offset+localX,y,cz+dz*offset+localZ];
   const left=[center[0]-ux*hw,center[1],center[2]-uz*hw];
   const right=[center[0]+ux*hw,center[1],center[2]+uz*hw];
   if(previousL){triangle([previousL,previousR,right],mi);triangle([previousL,right,left],mi);}
   previousL=left;previousR=right;
  }
  blades++;
 }
 return {arrays,blades,triangles};
}

function createSolidGeometry(){
 const arrays=Array.from({length:6},()=>[]);
 const r=randGen(state.seed);
 const form=FORM_MODES[state.formMode];
 const primitives=[];
 if(form==='bubble3d') primitives.push(new THREE.IcosahedronGeometry(1,1));
 if(form==='spike3d') primitives.push(new THREE.ConeGeometry(1,2.4,5,1));
 if(form==='crystal3d') primitives.push(new THREE.OctahedronGeometry(1,0));
 if(form==='orbcluster') primitives.push(new THREE.IcosahedronGeometry(1,0));
 const source=primitives[0].toNonIndexed?.() || primitives[0];
 // Most Three.js primitives already use non-indexed geometries.
 const geometry=source.index?source.toNonIndexed():source;
 const a=geometry.getAttribute('position');
 let faces=0;
 const tmp=new THREE.Vector3();
 const count=Math.floor(state.solidCount*state.density);
 function append(tri,mi){
  const xs=tri.map(p=>p[0]),zs=tri.map(p=>p[2]);
  for(const sx of [-4,0,4]){
   if(Math.max(...xs)+sx < -2||Math.min(...xs)+sx > 2)continue;
   for(const sz of [-4,0,4]){
    if(Math.max(...zs)+sz < -2||Math.min(...zs)+sz > 2)continue;
    let polygon=tri.map(p=>[p[0]+sx,p[1],p[2]+sz]);
    for(const [axis,bound,greater] of [[0,-2,true],[0,2,false],[2,-2,true],[2,2,false]]){
     if(polygon.length<3)break;
     polygon=clip(polygon,axis,bound,greater);
    }
    for(let j=1;j<polygon.length-1;j++){
     const p=polygon[0],q=polygon[j],u=polygon[j+1];
     const v1=new THREE.Vector3(...q).sub(new THREE.Vector3(...p));
     const v2=new THREE.Vector3(...u).sub(new THREE.Vector3(...p));
     if(v1.cross(v2).lengthSq()<1e-14)continue;
     arrays[mi].push(...p,...q,...u);faces++;
    }
   }
  }
 }
 for(let k=0;k<count;k++){
   const cx=-2+r()*4,cz=-2+r()*4;
   const height=(0.07+0.065*r())*state.height*state.solidScale;
   const scale=height*(0.35+state.formAmplitude*0.65);
   const radius=scale*(form==='spike3d'?0.35:0.52);
   const angle=r()*Math.PI*2;
   const mi=Math.min(5,Math.floor(r()*6));
   const copies=form==='orbcluster'?3:1;
   for(let j=0;j<copies;j++){
    const cxj=cx+(j?Math.cos(angle+j*2.1)*radius*0.9:0);
    const czj=cz+(j?Math.sin(angle+j*2.1)*radius*0.9:0);
    const subscale=j?0.58:1;
    const baseY=form==='spike3d'?height*0.65:height*0.62;
    const q=new THREE.Quaternion().setFromEuler(new THREE.Euler((r()-.5)*.45,angle,(r()-.5)*.4));
    for(let t=0;t<a.count;t+=3){
     const triangle=[];
     for(let v=0;v<3;v++){
      tmp.fromBufferAttribute(a,t+v);
      tmp.x*=radius*subscale;tmp.z*=radius*subscale;tmp.y*=height*subscale*(form==='spike3d'?0.5:0.48);
      tmp.applyQuaternion(q);
      triangle.push([cxj+tmp.x,Math.max(0.004,baseY*subscale+tmp.y),czj+tmp.z]);
     }
     append(triangle,mi);
    }
   }
  }
 geometry.dispose();
 return {arrays,blades:count,triangles:faces};
}
function disposeTile(){if(tileSource){tileSource.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}})}materials=[];shaders=[];}
function regenerate(){const started=performance.now();disposeTile();tileSource=new THREE.Group();tileSource.name='Grass_4m_Tile';const data=solidForms.has(FORM_MODES[state.formMode])?createSolidGeometry():createGeometry();let verts=0;
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(4,4),new THREE.MeshStandardMaterial({color:groundColor,side:THREE.DoubleSide,roughness:1}));groundMaterial=ground.material;ground.rotation.x=-Math.PI/2;ground.name='Ground_4m';tileSource.add(ground);
 data.arrays.forEach((positions,i)=>{if(!positions.length)return;const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();const grass=new THREE.Mesh(geometry,windMaterial(i));grass.name='Grass_Palette_'+i;grass.frustumCulled=false;tileSource.add(grass);verts+=positions.length/3;});
 paintMaterials();rebuildTiles();meshCount=data.blades;
 $('msg').textContent=`再生成完了｜${data.blades.toLocaleString()}本｜${data.triangles.toLocaleString()}面｜${((performance.now()-started)/1000).toFixed(1)}秒`;
}
const visibility={showDefault:true,showCustom:true,showGround:true};
function applyVisibility(){
  tilesRoot.traverse(o=>{
    if(!o.isMesh)return;
    o.visible=o.name==='Ground_4m'?visibility.showGround:visibility.showDefault;
  });
  particleGroup.visible=visibility.showCustom;
  for(const key of Object.keys(visibility))$(key).checked=visibility[key];
}
for(const key of Object.keys(visibility))$(key).addEventListener('change',e=>{visibility[key]=e.target.checked;applyVisibility();});
$('customOnly').addEventListener('click',()=>{Object.assign(visibility,{showDefault:false,showCustom:true,showGround:true});applyVisibility();});
$('showAll').addEventListener('click',()=>{Object.assign(visibility,{showDefault:true,showCustom:true,showGround:true});applyVisibility();});
function rebuildTiles(){tilesRoot.clear();if(!tileSource)return;const count=Math.round(state.tiles),offset=(count-1)/2;for(let z=0;z<count;z++)for(let x=0;x<count;x++){const t=tileSource.clone(true);t.position.set((x-offset)*4,0,(z-offset)*4);tilesRoot.add(t);}controls.target.set(0,.15,0);applyVisibility();}
let pending=null;function scheduleRebuild(){clearTimeout(pending);$('msg').textContent='形状を更新中…';pending=setTimeout(regenerate,150);}
for(const name of names){const el=$(name);if(!el)continue;el.addEventListener('input',()=>{state[name]=THREE.MathUtils.clamp(Number(el.value),...ranges[name]);updateLabels();if(['height','density','width','curve','variation','profile','tipRound','twist','cluster','formAmplitude','patternScale','patternSharpness','solidCount','solidScale','solidMotion'].includes(name))scheduleRebuild();else if(['hue','saturation','brightness','roughness','opacity','emission','gradient','reactiveGlow','paletteShift','paletteContrast','paletteFlow'].includes(name))paintMaterials();else if(name==='tiles')rebuildTiles();});}
$('rebuild').addEventListener('click',regenerate);
function updateMode(){const creative=state.creativeMode===1;$('creativeMode').value=creative?'creative':'realistic';$('modeInfo').textContent=creative?'CREATIVE: 発光・ねじれ・透明感を自由に編集':'REALISTIC: 自然な芝生から編集';}
function updateGenerativeMode(){const mode=FORM_MODES[state.formMode]||'grass';$('formMode').value=mode;const info={grass:'GRASS: 芝生ベースの形状',bubble:'BUBBLE: 水玉・粒のような膨らみ',wave:'WAVE: 波型・リボン状のうねり',zigzag:'ZIGZAG: ギザギザ・稲妻のようなエッジ',spiral:'SPIRAL: らせん状の回転'}; $('formInfo').textContent=info[mode]||mode.toUpperCase()+': 立体メッシュ';}
function updatePaletteMode(){const mode=PALETTE_MODES[state.paletteMode]||'rainbow';$('paletteMode').value=mode;const info={rainbow:'RAINBOW: 多彩な連続色',duotone:'DUOTONE: 2色によるコーディネート',tritone:'TRITONE: 3色のハーモニー',pastel:'PASTEL: 柔らかなトーン'}; $('paletteInfo').textContent=info[mode]||'';}
function refreshColorInputs(){for(let i=0;i<3;i++){const el=$('customColor'+i);if(el)el.value=customPalette[i];}}
for(let i=0;i<3;i++)$('customColor'+i).addEventListener('input', e=>{customPalette[i]=e.target.value;paintMaterials();});
refreshColorInputs();
$('formMode').addEventListener('change',e=>{state.formMode=Math.max(0,FORM_MODES.indexOf(e.target.value));updateGenerativeMode();updateLabels();regenerate();});
$('paletteMode').addEventListener('change',e=>{state.paletteMode=Math.max(0,PALETTE_MODES.indexOf(e.target.value));updatePaletteMode();updateLabels();paintMaterials();});
$('creativeMode').addEventListener('change',e=>{
 state.creativeMode=e.target.value==='creative'?1:0;
 if(state.creativeMode){Object.assign(state,{profile:.9,twist:.45,cluster:.4,emission:.6,reactiveGlow:.6,gradient:.8,opacity:.9});}
 else {Object.assign(state,{profile:.65,twist:0,cluster:0,emission:0,reactiveGlow:.3,gradient:.25,opacity:1});}
 updateMode();updateGenerativeMode();updatePaletteMode();updateLabels();regenerate();
});

$('windSeed').addEventListener('change', e => {state.windSeed = THREE.MathUtils.clamp(Math.floor(Number(e.target.value)||1),...ranges.windSeed);e.target.value=state.windSeed;windStartTime=clock.getElapsedTime();});
$('newWindSeed').addEventListener('click',()=>{state.windSeed=1+Math.floor(Math.random()*999999998);$('windSeed').value=state.windSeed;windStartTime=clock.getElapsedTime();});
$('restartWind').addEventListener('click',()=>{windStartTime=clock.getElapsedTime();});

function preset(){return {format:'nature-studio-preset',version:1,type:'grass',appVersion:'1.6.7',tileSizeMeters:4,parameters:{...state},customPalette:[...customPalette],groundColor:'#'+groundColor.getHexString(),particleSettings:{...particleState},particleSource:importedName||null,visibility:{...visibility},behavior:{...behavior},export:{mesh:'static-glb',behavior:'json',dynamicAnimationInGLB:false}};}
function download(data,name,type){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
$('save').addEventListener('click',()=>download(JSON.stringify(preset(),null,2),'grass_studio_v1_6_7_behavior.json','application/json'));
$('load').addEventListener('change',async e=>{try{const o=JSON.parse(await e.target.files[0].text());if(o.format!=='nature-studio-preset'||o.type!=='grass')throw Error('対応していないJSON');for(const [k,v] of Object.entries(o.parameters||{}))if(k in state&&typeof v==='number'&&Number.isFinite(v))state[k]=THREE.MathUtils.clamp(v,...ranges[k]);state.tiles=Math.round(state.tiles);if(o.behavior && typeof o.behavior==='object'){for(const k of Object.keys(behavior))if(typeof o.behavior[k]===typeof behavior[k])behavior[k]=o.behavior[k];updateBehaviorUI();}if(o.visibility)for(const k of Object.keys(visibility))if(typeof o.visibility[k]==='boolean')visibility[k]=o.visibility[k];if(o.groundColor && /^#[0-9a-fA-F]{6}$/.test(o.groundColor))setGround(o.groundColor);if(o.particleSettings)for(const k of particleNames)if(Number.isFinite(o.particleSettings[k]))particleState[k]=o.particleSettings[k];particleUI();if(importedScene)rebuildParticles();
 if(Array.isArray(o.customPalette))for(let i=0;i<3;i++)if(/^#[0-9a-fA-F]{6}$/.test(o.customPalette[i]||''))customPalette[i]=o.customPalette[i];
 refreshColorInputs();$('windSeed').value=state.windSeed;windStartTime=clock.getElapsedTime();updateMode();updateGenerativeMode();updatePaletteMode();updateLabels();regenerate();}catch(error){$('msg').textContent='読込エラー: '+error.message;}e.target.value='';});
$('reset').addEventListener('click',()=>{Object.assign(state,defaults);Object.assign(behavior,behaviorDefaults);updateBehaviorUI();Object.assign(visibility,{showDefault:true,showCustom:true,showGround:true});setGround('#37692e');Object.assign(particleState,{count:300,scale:0.6,spread:4,height:0.2,motion:0.35,spin:0.45,seed:6314});particleUI();if(importedScene)rebuildParticles();customPalette.splice(0,3,'#285be5','#ff9bc9','#f2d35d');refreshColorInputs();$('windSeed').value=state.windSeed;windStartTime=clock.getElapsedTime();updateMode();updateGenerativeMode();updatePaletteMode();updateLabels();regenerate();});
$('exportGLB').addEventListener('click',async()=>{const button=$('exportGLB');button.disabled=true;$('msg').textContent='GLBを生成中…';try{
 // Export a separate, static scene, not the animated shader materials or tiled preview.
 const exportScene=new THREE.Group();exportScene.name='Grass_4m_Export';tileSource.children.forEach(child=>{if(!child.isMesh)return;if(child.name==='Ground_4m'?!visibility.showGround:!visibility.showDefault)return;const m=child.clone();m.geometry=child.geometry;m.material=child.material.clone();m.material.onBeforeCompile=THREE.Material.prototype.onBeforeCompile;m.material.customProgramCacheKey=()=>'';m.material.userData={};m.material.side=THREE.DoubleSide;exportScene.add(m);});
 for(const mesh of (visibility.showCustom?particleMeshes:[])){const clone=mesh.clone();clone.geometry=mesh.geometry;clone.material=mesh.material.clone();exportScene.add(clone);}
 const output=await new GLTFExporter().parseAsync(exportScene,{binary:true,onlyVisible:true,trs:false});download(output,'grass_studio_v1_6_7_static.glb','model/gltf-binary');exportScene.traverse(o=>{if(o.isMesh)o.material.dispose();});$('msg').textContent='GLB保存完了（静止形状・基本材質。動的変化はJSONで保存）';
 }catch(e){console.error(e);$('msg').textContent='GLB出力エラー: '+e.message;}finally{button.disabled=false;}});

function setGround(hex){groundColor.set(hex);if(groundMaterial)groundMaterial.color.copy(groundColor);$('groundColor').value='#'+groundColor.getHexString();}
$('groundColor').addEventListener('input',e=>setGround(e.target.value));
const particleNames=['count','scale','spread','height','motion','spin'];
function particleUI(){for(const key of particleNames){const el=$('particle'+key);el.value=particleState[key];const val=$('particle'+key+'Val');if(val)val.textContent=Number(particleState[key]).toFixed(key==='count'?0:2);}}
particleUI();
const dummy=new THREE.Object3D();
function clearParticles(){for(const inst of particleMeshes){particleGroup.remove(inst);inst.geometry.dispose();inst.material.dispose();}particleMeshes=[];particleTransforms=[];}
function rebuildParticles(){clearParticles();if(!importedScene)return;
 importedScene.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(importedScene);if(box.isEmpty())return;
 const center=box.getCenter(new THREE.Vector3()), sz=box.getSize(new THREE.Vector3()), norm=1/Math.max(sz.x,sz.y,sz.z,1e-6);
 const rng=randGen(particleState.seed),cnt=particleState.count;
 for(let i=0;i<cnt;i++)particleTransforms.push({x:(rng()-.5)*particleState.spread,z:(rng()-.5)*particleState.spread,y:particleState.height+rng()*particleState.height,phase:rng()*Math.PI*2,rot:rng()*Math.PI*2,scale:particleState.scale*(0.65+rng()*0.7)});
 const source=[]; importedScene.traverse(o=>{if(o.isMesh)source.push(o);});
 for(const o of source){const geometry=o.geometry.clone();geometry.applyMatrix4(o.matrixWorld);geometry.translate(-center.x,-center.y,-center.z);geometry.scale(norm,norm,norm);
  const mats=Array.isArray(o.material)?o.material:o.material?[o.material]:[];
  let mat=(mats[0]||new THREE.MeshStandardMaterial({color:0xffffff})).clone();mat.side=THREE.DoubleSide;
  const inst=new THREE.InstancedMesh(geometry,mat,cnt);inst.frustumCulled=false;inst.name='CustomGLB_Particles';inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);inst.userData.baseColor=mat.color.clone();particleGroup.add(inst);particleMeshes.push(inst);
 }
 updateParticles(0);applyVisibility();
 $('msg').textContent=`独自GLB配置完了：${cnt}個 / ${particleMeshes.length}メッシュ種`;
}
function updateParticles(t){if(!particleMeshes.length)return;
 const speed=behavior.speed,amount=behavior.strength;
 const swarmCenter=new THREE.Vector3(Math.sin(t*0.23*speed)*particleState.spread*.22,0.7+Math.sin(t*.32*speed)*0.4,Math.cos(t*.18*speed)*particleState.spread*.22);
 const target=behavior.pointer?behaviorTarget:swarmCenter;
 const audioExpansion=Math.min(4,audioLevel*state.audioGain*behavior.audioSpread*6);
 
 for(let i=0;i<particleTransforms.length;i++){
  const a=particleTransforms[i],m=particleState.motion;
  const wobbleX=Math.sin(t*0.7*speed+a.phase)*m*.15;
  const wobbleY=Math.sin(t*1.8*speed+a.phase)*m*.28;
  const wobbleZ=Math.cos(t*.75*speed+a.phase)*m*.15;
  let px=a.x+wobbleX,py=a.y+wobbleY,pz=a.z+wobbleZ;
  const vx=a.x-target.x,vy=a.y-target.y,vz=a.z-target.z;
  const norm=Math.max(.001,Math.hypot(vx,vy,vz));
  const ease=Math.min(1,amount*.55);
  if(behavior.mode==='attract'){
   px=THREE.MathUtils.lerp(px,target.x+Math.cos(a.phase+t*.35*speed)*(.15+norm*.07),ease);
   py=THREE.MathUtils.lerp(py,target.y+Math.sin(a.phase+t*.4*speed)*.28,ease);
   pz=THREE.MathUtils.lerp(pz,target.z+Math.sin(a.phase+t*.35*speed)*(.15+norm*.07),ease);
  } else if(behavior.mode==='repel'){
   px+=(vx/norm)*amount*1.15;py+=(vy/norm)*amount*.65;pz+=(vz/norm)*amount*1.15;
  } else if(behavior.mode==='swarm'){
   const orbit=a.phase+t*(.35+.4*speed),rr=.25+norm*(.25+.12*Math.sin(t*.5+a.phase));
   px=THREE.MathUtils.lerp(px,swarmCenter.x+Math.cos(orbit)*rr,ease);
   py=THREE.MathUtils.lerp(py,swarmCenter.y+Math.sin(orbit*1.45)*rr*.55,ease);
   pz=THREE.MathUtils.lerp(pz,swarmCenter.z+Math.sin(orbit)*rr,ease);
  }
  // Microphone may widen the entire cloud regardless of behavior mode.
  px+=vx/norm*audioExpansion;py+=vy/norm*audioExpansion*.5;pz+=vz/norm*audioExpansion;
  dummy.position.set(px,py,pz);
  dummy.rotation.set(Math.sin(t*.6*speed+a.phase)*m*.12,a.rot+t*particleState.spin*.5,Math.cos(t*.8*speed+a.phase)*m*.12);
  dummy.scale.setScalar(a.scale*(1+Math.min(.5,audioExpansion*.08)));dummy.updateMatrix();for(const mesh of particleMeshes)mesh.setMatrixAt(i,dummy.matrix);
 }
 for(const mesh of particleMeshes){mesh.instanceMatrix.needsUpdate=true;
  if(mesh.material.color){const pulse=Math.min(1,behavior.colorSync*(.5+.5*Math.sin(t*speed*2))*0.4+audioExpansion*.04);mesh.material.color.copy(mesh.userData.baseColor||mesh.material.color).lerp(new THREE.Color('#66dbec'),pulse);}}

}
$('glbInput').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;
 try{const url=URL.createObjectURL(file);try{const gltf=await new GLTFLoader().loadAsync(url);importedScene=gltf.scene;importedName=file.name;rebuildParticles();}finally{URL.revokeObjectURL(url);}}
 catch(err){console.error(err);$('msg').textContent='GLB読込エラー：'+err.message;}e.target.value='';
});
for(const key of particleNames){$('particle'+key).addEventListener('input',e=>{particleState[key]=Number(e.target.value);particleUI();if(['count','scale','spread','height'].includes(key))rebuildParticles();});}
$('particleClear').addEventListener('click',()=>{clearParticles();importedScene=null;importedName='';$('msg').textContent='独自GLBを解除しました';});


function updateBehaviorUI(){ $('behaviorMode').value=behavior.mode;for(const [key,field] of [['strength','behaviorStrength'],['speed','behaviorSpeed'],['audioSpread','audioSpread'],['colorSync','behaviorColor']]){const el=$(field);el.value=behavior[key];const v=$(field+'Val');if(v)v.textContent=Number(behavior[key]).toFixed(2);} $('pointerInteract').checked=behavior.pointer;}
$('behaviorMode').addEventListener('change',e=>behavior.mode=e.target.value);
for(const [key,field] of [['strength','behaviorStrength'],['speed','behaviorSpeed'],['audioSpread','audioSpread'],['colorSync','behaviorColor']])$(field).addEventListener('input',e=>{behavior[key]=Number(e.target.value);updateBehaviorUI();});
$('pointerInteract').addEventListener('change',e=>behavior.pointer=e.target.checked);
$('behaviorReset').addEventListener('click',()=>{Object.assign(behavior,behaviorDefaults);behaviorTarget.set(0,.6,0);updateBehaviorUI();});
renderer.domElement.addEventListener('pointerdown',e=>{
 if(!behavior.pointer)return;
 const rect=renderer.domElement.getBoundingClientRect();pointerCoords.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
 behaviorRay.setFromCamera(pointerCoords,camera);behaviorRay.ray.intersectPlane(behaviorPlane,behaviorTarget);
});
updateBehaviorUI();

window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
renderer.setAnimationLoop(()=>{
 const t=clock.getElapsedTime();
 const windElapsed = Math.max(0, t-windStartTime);
 const stochastic=sampledWind(windElapsed);
 if(micEnabled&&analyser&&audioData){
  analyser.getByteTimeDomainData(audioData);let total=0;
  for(let i=0;i<audioData.length;i++){const v=(audioData[i]-128)/128;total+=v*v;}
  const rms=Math.sqrt(total/audioData.length);
  audioLevel=audioLevel*0.84+rms*0.16;
 } else audioLevel*=0.88;
 for(const shader of shaders){
  shader.uniforms.uTime.value=windElapsed;shader.uniforms.uWind.value=state.wind*stochastic.speedScale;
  shader.uniforms.uSpeed.value=state.speed;shader.uniforms.uDirection.value=stochastic.directionDegrees*Math.PI/180;
  shader.uniforms.uGust.value=state.gust;shader.uniforms.uTurbulence.value=state.turbulence;
  shader.uniforms.uWaveScale.value=state.waveScale;
  shader.uniforms.uAudio.value=Math.min(0.55,audioLevel*state.audioGain*2.5);
  shader.uniforms.uDynamicBend.value=state.dynamicBend*(solidForms.has(FORM_MODES[state.formMode])?state.solidMotion:1);
  shader.uniforms.uAudioMorph.value=state.audioMorph;
  shader.uniforms.uMorphFrequency.value=state.morphFrequency;
  shader.uniforms.uColorPulse.value=state.colorPulse;
  shader.uniforms.uPaletteFlow.value=state.paletteFlow;
  shader.uniforms.uColorReact.value=state.windColor;
  shader.uniforms.uGradient.value=state.gradient;shader.uniforms.uReactGlow.value=state.reactiveGlow;shader.uniforms.uEmission.value=state.emission;
 }
 if($('micLevel'))$('micLevel').textContent=(audioLevel*100).toFixed(1);
 $('liveDirection').textContent=stochastic.directionDegrees.toFixed(1);
 $('liveSpeed').textContent=stochastic.speedScale.toFixed(2);
 $('windTime').textContent=windElapsed.toFixed(1);
 updateParticles(windElapsed);controls.update();renderer.render(scene,camera);
});
async function toggleMicrophone(){
 if(micEnabled){
  micEnabled=false;if(audioStream){audioStream.getTracks().forEach(t=>t.stop());audioStream=null;}
  if(audioContext){await audioContext.close();audioContext=null;}
  analyser=null;audioData=null;$('micToggle').textContent='MIC ON';return;
 }
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw Error('マイク入力に対応していない環境です。HTTPSかlocalhostを使用してください。');
  audioStream=await navigator.mediaDevices.getUserMedia({audio:true});
  audioContext=new (window.AudioContext||window.webkitAudioContext)();
  const source=audioContext.createMediaStreamSource(audioStream);
  analyser=audioContext.createAnalyser();analyser.fftSize=1024;
  source.connect(analyser);audioData=new Uint8Array(analyser.fftSize);
  micEnabled=true;$('micToggle').textContent='MIC OFF';$('msg').textContent='マイク入力開始';
 }catch(e){$('msg').textContent='マイク起動不可: '+e.message;micEnabled=false;
  if(audioStream){audioStream.getTracks().forEach(t=>t.stop());audioStream=null;}}
}
$('micToggle').addEventListener('click',toggleMicrophone);
updateMode();updateGenerativeMode();updatePaletteMode();updateLabels();regenerate();
