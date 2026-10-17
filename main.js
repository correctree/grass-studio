import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
const $=id=>document.getElementById(id);
const state={height:1,density:1,width:1,curve:0.5,variation:0.5,hue:0,saturation:1,brightness:1,roughness:.96,wind:.18,speed:1,direction:35,gust:0.35,turbulence:0.35,waveScale:1.0,audioGain:0,windColor:0.3,tiles:1,seed:20261017,directionVariation:45,speedVariation:35,changeInterval:6,smoothness:80,windSeed:16101};
const defaults={...state};
const ranges={height:[.45,2.3],density:[.1,1],width:[.4,2.5],curve:[0,1],variation:[0,1],hue:[-150,150],saturation:[0,2],brightness:[.3,1.7],roughness:[.2,1],wind:[0,.6],speed:[0,3],direction:[0,360],gust:[0,1],turbulence:[0,1],waveScale:[0.2,3],audioGain:[0,2],windColor:[0,1],tiles:[1,9],seed:[1,999999999],directionVariation:[0,180],speedVariation:[0,100],changeInterval:[1,30],smoothness:[0,100],windSeed:[1,999999999]};
const names=Object.keys(state).filter(k=>!['seed','windSeed'].includes(k));
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;$('app').appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0xb9d8ff);scene.fog=new THREE.Fog(0xb9d8ff,15,65);
const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.1,200);camera.position.set(6,4.5,7);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.target.set(0,.15,0);controls.maxPolarAngle=Math.PI*.49;
scene.add(new THREE.HemisphereLight(0xffffff,0x73935e,1.35));const sunlight=new THREE.DirectionalLight(0xffffff,1.35);sunlight.position.set(6,12,7);scene.add(sunlight);
let tilesRoot=new THREE.Group();scene.add(tilesRoot);let tileSource=null;let shaders=[];let materials=[];let meshCount=0;const clock=new THREE.Clock();
let audioLevel=0, audioContext=null, audioStream=null, analyser=null, audioData=null;
let micEnabled=false;
let windStartTime=0;
const palette=['#497c35','#528a39','#5b9241','#659b43','#76a64c','#83a951'].map(c=>new THREE.Color(c));
const groundColor=new THREE.Color('#37692e');
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
function updateLabels(){for(const key of names){const node=$(key);if(node) node.value=state[key];const value=$(key+'Val');if(value)value.textContent=key==='hue'?String(Math.round(state[key])):Number(state[key]).toFixed(2);} }
function paintMaterials(){for(let i=0;i<materials.length;i++){let m=materials[i];const base=palette[i];const hsl={};base.getHSL(hsl);m.color.setHSL((hsl.h+state.hue/360+1)%1,THREE.MathUtils.clamp(hsl.s*state.saturation,0,1),THREE.MathUtils.clamp(hsl.l*state.brightness,.02,.9));m.roughness=state.roughness;} }
function windMaterial(i){
 const m=new THREE.MeshStandardMaterial({color:palette[i],side:THREE.DoubleSide,roughness:state.roughness});
 m.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{
   uTime:{value:0},uWind:{value:state.wind},uSpeed:{value:state.speed},
   uDirection:{value:state.direction*Math.PI/180},uGust:{value:state.gust},
   uTurbulence:{value:state.turbulence},uWaveScale:{value:state.waveScale},
   uAudio:{value:0},uColorReact:{value:state.windColor}
  });
  m.userData.shader=shader;shaders.push(shader);
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
  uniform float uTime,uWind,uSpeed,uDirection,uGust,uTurbulence,uWaveScale,uAudio,uColorReact;
  varying float vWindExpression;
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
  vWindExpression=clamp(abs(oscillation)*strength*4.0,0.0,1.0);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
  varying float vWindExpression;
  uniform float uColorReact;
  `).replace('#include <color_fragment>',`#include <color_fragment>
  // Expressive mapping: stronger wind produces brighter / warmer highlights.
  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.73,0.92,0.46),vWindExpression*uColorReact*0.55);
  `);
 };
 m.customProgramCacheKey=()=> 'grass-160-naturalwind';
 materials.push(m);return m;
}
// Clip leaf polygons exactly at +/-2m so repeated tiles share a periodic boundary.
function clip(poly,axis,bound,greater){const result=[];for(let i=0;i<poly.length;i++){const a=poly[(i+poly.length-1)%poly.length],b=poly[i],aa=a[axis],bb=b[axis];const ia=greater?aa>=bound:aa<=bound,ib=greater?bb>=bound:bb<=bound;if(ia!==ib){const t=(bound-aa)/(bb-aa);result.push(a.map((v,k)=>v+(b[k]-v)*t));}if(ib)result.push(b);}return result;}
function createGeometry(){const arrays=palette.map(()=>[]);const r=randGen(state.seed),grid=85,step=4/grid;let blades=0,triangles=0;
 function triangle(pts,mi){const xs=pts.map(p=>p[0]),zs=pts.map(p=>p[2]);for(const sx of [-4,0,4]){if(Math.max(...xs)+sx< -2||Math.min(...xs)+sx>2)continue;for(const sz of [-4,0,4]){if(Math.max(...zs)+sz< -2||Math.min(...zs)+sz>2)continue;let polygon=pts.map(p=>[p[0]+sx,p[1],p[2]+sz]);for(const [axis,bound,greater] of [[0,-2,true],[0,2,false],[2,-2,true],[2,2,false]]){if(polygon.length<3)break;polygon=clip(polygon,axis,bound,greater);}for(let k=1;k<polygon.length-1;k++){const p=polygon[0],q=polygon[k],s=polygon[k+1];const len=new THREE.Vector3(...q).sub(new THREE.Vector3(...p)).cross(new THREE.Vector3(...s).sub(new THREE.Vector3(...p))).lengthSq();if(len<1e-14)continue;arrays[mi].push(...p,...q,...s);triangles++;}}}}
 for(let z=0;z<grid;z++)for(let x=0;x<grid;x++)for(let n=0;n<2;n++){
  if(r()>state.density)continue;
  const cx=-2+(x+.5+(r()-.5)*.92)*step,cz=-2+(z+.5+(r()-.5)*.92)*step;
  const h=(.085+(r()-.5)*.033*state.variation)*state.height;
  const w=(.012+(r()-.5)*.007*state.variation)*state.width;
  const theta=r()*Math.PI*2,ux=Math.cos(theta),uz=Math.sin(theta);const a=r()*Math.PI*2;
  const bend=state.curve*(.008+.03*r())*(.45+state.variation*.5);const dx=Math.cos(a)*bend,dz=Math.sin(a)*bend;
  const mi=Math.min(5,Math.floor(r()*6)),base=[cx,.002,cz];
  const l=[cx-ux*w*.5,.002,cz-uz*w*.5],rr=[cx+ux*w*.5,.002,cz+uz*w*.5];
  const lm=[cx-ux*w*.32+dx*.35,h*.57,cz-uz*w*.32+dz*.35],rm=[cx+ux*w*.32+dx*.35,h*.57,cz+uz*w*.32+dz*.35];
  const tip=[cx+dx,h,cz+dz];
  triangle([l,rr,rm],mi);triangle([l,rm,lm],mi);triangle([lm,rm,tip],mi);
  blades++;
 }
 return {arrays,blades,triangles};}
function disposeTile(){if(tileSource){tileSource.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}})}materials=[];shaders=[];}
function regenerate(){const started=performance.now();disposeTile();tileSource=new THREE.Group();tileSource.name='Grass_4m_Tile';const data=createGeometry();let verts=0;
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(4,4),new THREE.MeshStandardMaterial({color:groundColor,side:THREE.DoubleSide,roughness:1}));ground.rotation.x=-Math.PI/2;ground.name='Ground_4m';tileSource.add(ground);
 data.arrays.forEach((positions,i)=>{if(!positions.length)return;const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();const grass=new THREE.Mesh(geometry,windMaterial(i));grass.name='Grass_Palette_'+i;grass.frustumCulled=false;tileSource.add(grass);verts+=positions.length/3;});
 paintMaterials();rebuildTiles();meshCount=data.blades;
 $('msg').textContent=`再生成完了｜${data.blades.toLocaleString()}本｜${data.triangles.toLocaleString()}面｜${((performance.now()-started)/1000).toFixed(1)}秒`;
}
function rebuildTiles(){tilesRoot.clear();if(!tileSource)return;const count=Math.round(state.tiles),offset=(count-1)/2;for(let z=0;z<count;z++)for(let x=0;x<count;x++){const t=tileSource.clone(true);t.position.set((x-offset)*4,0,(z-offset)*4);tilesRoot.add(t);}controls.target.set(0,.15,0);}
let pending=null;function scheduleRebuild(){clearTimeout(pending);$('msg').textContent='形状を更新中…';pending=setTimeout(regenerate,150);}
for(const name of names){const el=$(name);if(!el)continue;el.addEventListener('input',()=>{state[name]=THREE.MathUtils.clamp(Number(el.value),...ranges[name]);updateLabels();if(['height','density','width','curve','variation'].includes(name))scheduleRebuild();else if(['hue','saturation','brightness','roughness'].includes(name))paintMaterials();else if(name==='tiles')rebuildTiles();});}
$('rebuild').addEventListener('click',regenerate);
$('windSeed').addEventListener('change', e => {state.windSeed = THREE.MathUtils.clamp(Math.floor(Number(e.target.value)||1),...ranges.windSeed);e.target.value=state.windSeed;windStartTime=clock.getElapsedTime();});
$('newWindSeed').addEventListener('click',()=>{state.windSeed=1+Math.floor(Math.random()*999999998);$('windSeed').value=state.windSeed;windStartTime=clock.getElapsedTime();});
$('restartWind').addEventListener('click',()=>{windStartTime=clock.getElapsedTime();});

function preset(){return {format:'nature-studio-preset',version:1,type:'grass',appVersion:'1.6.1',tileSizeMeters:4,parameters:{...state},export:{mesh:'static-glb',behavior:'json',dynamicAnimationInGLB:false}};}
function download(data,name,type){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
$('save').addEventListener('click',()=>download(JSON.stringify(preset(),null,2),'grass_studio_v1_6_1_stochastic_wind.json','application/json'));
$('load').addEventListener('change',async e=>{try{const o=JSON.parse(await e.target.files[0].text());if(o.format!=='nature-studio-preset'||o.type!=='grass')throw Error('対応していないJSON');for(const [k,v] of Object.entries(o.parameters||{}))if(k in state&&typeof v==='number'&&Number.isFinite(v))state[k]=THREE.MathUtils.clamp(v,...ranges[k]);state.tiles=Math.round(state.tiles);$('windSeed').value=state.windSeed;windStartTime=clock.getElapsedTime();updateLabels();regenerate();}catch(error){$('msg').textContent='読込エラー: '+error.message;}e.target.value='';});
$('reset').addEventListener('click',()=>{Object.assign(state,defaults);$('windSeed').value=state.windSeed;windStartTime=clock.getElapsedTime();updateLabels();regenerate();});
$('exportGLB').addEventListener('click',async()=>{const button=$('exportGLB');button.disabled=true;$('msg').textContent='GLBを生成中…';try{
 // Export a separate, static scene, not the animated shader materials or tiled preview.
 const exportScene=new THREE.Group();exportScene.name='Grass_4m_Export';tileSource.children.forEach(child=>{if(!child.isMesh)return;const m=child.clone();m.geometry=child.geometry;m.material=child.material.clone();m.material.onBeforeCompile=THREE.Material.prototype.onBeforeCompile;m.material.customProgramCacheKey=()=>'';m.material.userData={};m.material.side=THREE.DoubleSide;exportScene.add(m);});
 const output=await new GLTFExporter().parseAsync(exportScene,{binary:true,onlyVisible:true,trs:false});download(output,'grass_studio_v1_6_1_static.glb','model/gltf-binary');exportScene.traverse(o=>{if(o.isMesh)o.material.dispose();});$('msg').textContent='GLB保存完了（静止メッシュ、風はJSON設定）';
 }catch(e){console.error(e);$('msg').textContent='GLB出力エラー: '+e.message;}finally{button.disabled=false;}});
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
  shader.uniforms.uColorReact.value=state.windColor;
 }
 if($('micLevel'))$('micLevel').textContent=(audioLevel*100).toFixed(1);
 $('liveDirection').textContent=stochastic.directionDegrees.toFixed(1);
 $('liveSpeed').textContent=stochastic.speedScale.toFixed(2);
 $('windTime').textContent=windElapsed.toFixed(1);
 controls.update();renderer.render(scene,camera);
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
updateLabels();regenerate();
