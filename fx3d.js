// 3D-эффекты: Патронусы и существа, финалы факультетов. three.js, модели из three.js и Khronos (см. README).
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const TAU=Math.PI*2,rnd=(a,b)=>a+Math.random()*(b-a),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const easeIO=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,easeO=t=>1-Math.pow(1-t,3);
let renderer,scene,camera,canvas,clock,running=false,effects=[],ok=false,models={},mode='screen';

/* ---------- инициализация ---------- */
function init(){
  canvas=document.createElement('canvas');canvas.className='fx3d';document.body.appendChild(canvas);
  try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,premultipliedAlpha:true,powerPreference:'high-performance'})}catch(e){canvas.remove();return false}
  renderer.setPixelRatio(Math.min(1.5,devicePixelRatio||1));renderer.setClearColor(0x000000,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(38,1,.1,400);camera.position.set(0,2,16);camera.lookAt(0,1.4,0);
  scene.add(new THREE.AmbientLight(0xffffff,.35));const dl=new THREE.DirectionalLight(0xffffff,1.6);dl.position.set(4,8,6);scene.add(dl);scene.userData.dl=dl;
  clock=new THREE.Clock();resize();addEventListener('resize',resize);
  initParticles();return true;
}
function resize(){if(!renderer)return;const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
function setMode(m,glow){mode=m;canvas.classList.toggle('finale',m==='finale');canvas.style.setProperty('--g1',glow||'rgba(150,210,255,.95)')}

/* ---------- материалы ---------- */
function ghostMat(col,o={}){
  const m=new THREE.MeshStandardMaterial({color:0x000000,emissive:new THREE.Color(col),emissiveIntensity:o.ei||1.4,transparent:true,opacity:o.op??.92,depthWrite:o.dw??true,side:THREE.DoubleSide,vertexColors:false,roughness:1,metalness:0});
  const rim=new THREE.Color(o.rim||'#ffffff');
  m.onBeforeCompile=sh=>{sh.uniforms.uRim={value:rim};sh.uniforms.uCore={value:o.core??.35};sh.uniforms.uPow={value:o.pow??1.8};
    sh.fragmentShader='uniform vec3 uRim;uniform float uCore;uniform float uPow;\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>',
    `#include <emissivemap_fragment>
     float fr=pow(1.0-abs(dot(normalize(vViewPosition),normal)),uPow);
     totalEmissiveRadiance=mix(totalEmissiveRadiance*uCore,uRim*1.6,fr)+totalEmissiveRadiance*fr*.6;`);};
  return m;
}
function fireMat(){
  const m=new THREE.MeshStandardMaterial({color:0x000000,emissive:0xff7a1a,emissiveIntensity:1,side:THREE.DoubleSide,roughness:1});
  m.onBeforeCompile=sh=>{sh.uniforms.uT={value:0};m.userData.sh=sh;
    sh.vertexShader='varying vec3 vOP;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvOP=position;');
    sh.fragmentShader='uniform float uT;varying vec3 vOP;\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>',
    `#include <emissivemap_fragment>
     float fr=pow(1.0-abs(dot(normalize(vViewPosition),normal)),1.5);
     float n=sin(vOP.x*.15+uT*9.0)*sin(vOP.z*.12-uT*7.0)*.5+.5;
     vec3 hot=vec3(1.0,.93,.6),mid=vec3(1.0,.55,.12),red=vec3(.9,.18,.04);
     float k=clamp(fr*1.2+n*.35,0.0,1.0);
     totalEmissiveRadiance=mix(red,mix(mid,hot,smoothstep(.5,1.0,k)),smoothstep(0.0,.6,k))*(1.4+fr*1.8);`);};
  return m;
}

/* ---------- частицы ---------- */
const PMAX=4000;let pGeo,pPts,pData=[],pHead=0;
function initParticles(){
  pGeo=new THREE.BufferGeometry();pGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(PMAX*3),3));pGeo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(PMAX*3),3));pGeo.setAttribute('size',new THREE.BufferAttribute(new Float32Array(PMAX),1));
  const tex=(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.3,'rgba(255,255,255,.6)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(c)})();
  const mat=new THREE.ShaderMaterial({uniforms:{map:{value:tex},scale:{value:innerHeight}},vertexShader:`attribute float size;attribute vec3 color;varying vec3 vC;uniform float scale;void main(){vC=color;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=size*scale/(-mv.z);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`uniform sampler2D map;varying vec3 vC;void main(){vec4 t=texture2D(map,gl_PointCoord);float b=max(max(vC.r,vC.g),vC.b);gl_FragColor=vec4(vC*t.a,t.a*b);}`,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  pPts=new THREE.Points(pGeo,mat);pPts.frustumCulled=false;scene.add(pPts);
  for(let i=0;i<PMAX;i++)pData.push({life:0});
}
const tmpC=new THREE.Color();
function emit(p,v,col,size,life,o={}){const d=pData[pHead];pHead=(pHead+1)%PMAX;d.p=p.clone();d.v=v.clone();d.c=new THREE.Color(col);d.c2=o.c2?new THREE.Color(o.c2):null;d.s=size;d.life=d.max=life;d.g=o.g||0;d.drag=o.drag??.98}
function stepParticles(dt){
  const P=pGeo.attributes.position.array,C=pGeo.attributes.color.array,S=pGeo.attributes.size.array;
  for(let i=0;i<PMAX;i++){const d=pData[i];if(d.life<=0){S[i]=0;continue}
    d.life-=dt;d.v.multiplyScalar(Math.pow(d.drag,dt*60));d.v.y+=d.g*dt;d.p.addScaledVector(d.v,dt);const k=Math.max(0,d.life/d.max);
    P[i*3]=d.p.x;P[i*3+1]=d.p.y;P[i*3+2]=d.p.z;tmpC.copy(d.c);if(d.c2)tmpC.lerp(d.c2,1-k);C[i*3]=tmpC.r*k;C[i*3+1]=tmpC.g*k;C[i*3+2]=tmpC.b*k;S[i]=d.s*(.4+.6*k)}
  pGeo.attributes.position.needsUpdate=pGeo.attributes.color.needsUpdate=pGeo.attributes.size.needsUpdate=true;pPts.material.uniforms.scale.value=innerHeight;
}
function anyParticles(){for(const d of pData)if(d.life>0)return true;return false}

/* ---------- модели ---------- */
const loader=new GLTFLoader();
function load(name){return new Promise((res,rej)=>loader.load('models/'+name+'.glb',g=>res(g),undefined,rej))}
async function preload(){const [h,p,f]=await Promise.all([load('Horse'),load('Parrot'),load('Fox')]);models={Horse:h,Parrot:p,Fox:f};for(const g of[h,p,f])g.scene.traverse(o=>{if(o.isMesh&&!o.geometry.attributes.normal)o.geometry.computeVertexNormals()})}
function instance(name,mat,len){
  const g=models[name];const root=name==='Fox'?SkeletonUtils.clone(g.scene):g.scene.clone(true);
  const meshes=[];root.traverse(o=>{if(o.isMesh){o.material=mat;o.frustumCulled=false;meshes.push(o)}});
  const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3()),s=len/Math.max(size.z,size.x);
  const pivot=new THREE.Group();root.scale.setScalar(s);const ctr=box.getCenter(new THREE.Vector3());root.position.set(-ctr.x*s,-box.min.y*s,-ctr.z*s);pivot.add(root);
  const mixer=new THREE.AnimationMixer(root);const clips=g.animations;
  return {pivot,root,meshes,mixer,clips,scale:s,play(nm,ts=1){const c=clips.find(c=>c.name===nm)||clips[0];const a=mixer.clipAction(c);a.timeScale=ts;a.play();return a}};
}
// позиция вершины морф-модели (для рога, крыльев)
function morphVertex(mesh,idx,out){
  const g=mesh.geometry,p=g.attributes.position,mt=g.morphAttributes.position,inf=mesh.morphTargetInfluences;
  out.set(p.getX(idx),p.getY(idx),p.getZ(idx));
  if(mt&&inf)for(let i=0;i<mt.length;i++){const w=inf[i];if(!w)continue;const a=mt[i];if(g.morphTargetsRelative)out.add(new THREE.Vector3(a.getX(idx),a.getY(idx),a.getZ(idx)).multiplyScalar(w));else out.lerp(new THREE.Vector3(a.getX(idx),a.getY(idx),a.getZ(idx)),w)}
  return out;
}
function pickVertex(mesh,score){const p=mesh.geometry.attributes.position;let best=0,bs=-1e9;for(let i=0;i<p.count;i++){const s=score(p.getX(i),p.getY(i),p.getZ(i));if(s>bs){bs=s;best=i}}return best}
function randomVertexWorld(inst,out){const m=inst.meshes[0],p=m.geometry.attributes.position,i=Math.random()*p.count|0;out.set(p.getX(i),p.getY(i),p.getZ(i));return m.localToWorld(out)}

/* ---------- эффекты ---------- */
function addEffect(e){effects.push(e);if(!running){running=true;canvas.style.display='block';clock.getDelta();requestAnimationFrame(tick)}return e}
function tick(){
  const dt=Math.min(window.__fxCap||.05,clock.getDelta());
  effects=effects.filter(e=>{const alive=e.update(dt);if(!alive&&e.dispose)e.dispose();return alive});
  stepParticles(dt);
  renderer.render(scene,camera);
  if(effects.length||anyParticles())requestAnimationFrame(tick);else{running=false;canvas.style.display='none';setMode('screen')}
}
function screenToWorld(x,y,z=0){const v=new THREE.Vector3(x/innerWidth*2-1,-(y/innerHeight)*2+1,.5).unproject(camera);const d=v.sub(camera.position).normalize();const t=(z-camera.position.z)/d.z;return camera.position.clone().addScaledVector(d,t)}

// Патронус / существо бежит из вихря у кончика палочки через весь экран
const KINDS={
  horse:{n:'Лошадь',model:'Horse',len:8.5,col:'#9fd8ff',rim:'#f2fbff',clip:null,ts:1.1},
  unicorn:{n:'Единорог',model:'Horse',len:8.2,col:'#e9f2ff',rim:'#fff7d6',ts:1.05,horn:true},
  thestral:{n:'Фестрал',model:'Horse',len:8.6,col:'#1c2a3a',rim:'#b8fff4',ts:.9,wings:true,core:.15,pow:1.2},
  fox:{n:'Лиса',model:'Fox',len:6.4,col:'#a8dcff',rim:'#f0fbff',clip:'Run',ts:1},
  phoenix:{n:'Феникс',model:'Parrot',len:7.5,fire:true,ts:.8,fly:true},
};
let lastKind='';
function creature(kindKey,from){
  const K=KINDS[kindKey];const mat=K.fire?fireMat():ghostMat(K.col,{rim:K.rim,core:K.core,pow:K.pow});
  const I=instance(K.model,mat,K.len);I.play(K.clip,K.ts);scene.add(I.pivot);
  const dir=from.x<innerWidth/2?1:-1;
  const start=screenToWorld(from.x,from.y,0),endX=dir*20,z0=0,z1=-4,y0=K.fly?.8:-1.6;
  const extras=[];
  if(K.horn){const m=I.meshes[0];const p=m.geometry.attributes.position;let zmax=-1e9;for(let i=0;i<p.count;i++)zmax=Math.max(zmax,p.getZ(i));const vi=pickVertex(m,(x,y,z)=>z);const ve=pickVertex(m,(x,y,z)=>z>zmax-70?y:-1e9);const horn=new THREE.Mesh(new THREE.ConeGeometry(.09/I.scale*1,1.1/I.scale,24),ghostMat('#ffe9a8',{rim:'#ffffff',core:.8}));horn.userData.vi=vi;horn.userData.ve=ve;m.add(horn);extras.push(horn)}
  if(K.wings){const m=I.meshes[0];const vi=pickVertex(m,(x,y,z)=>y*1.2-Math.abs(z-20)*.8);const sh=new THREE.Shape();sh.moveTo(0,0);sh.bezierCurveTo(30,60,90,90,160,70);sh.quadraticCurveTo(140,40,150,10);sh.quadraticCurveTo(120,20,110,-10);sh.quadraticCurveTo(85,5,70,-25);sh.quadraticCurveTo(50,-5,0,0);
    const wg=new THREE.ShapeGeometry(sh,24);const wm=ghostMat('#0e1820',{rim:'#b8fff4',core:.1,pow:1});for(const sgn of[1,-1]){const w=new THREE.Mesh(wg,wm);w.userData={vi,sgn};w.scale.set(sgn,1,1);m.add(w);extras.push(w)}}
  const v=new THREE.Vector3(),T=5.2;let t=0;
  return addEffect({update(dt){t+=dt;I.mixer.update(dt);if(mat.userData.sh)mat.userData.sh.uniforms.uT.value=t;
    const k=clamp(t/T,0,1),grow=easeO(clamp(t/.9,0,1));
    const x=start.x+(endX-start.x)*easeIO(k),z=z0+(z1-z0)*k,y=start.y+(y0-start.y)*easeO(clamp(t/1.1,0,1))+(K.fly?Math.sin(t*2.2)*.5:0);
    I.pivot.position.set(x,y,z);I.pivot.rotation.y=dir>0?Math.PI/2:-Math.PI/2;if(K.fly)I.pivot.rotation.z=Math.sin(t*2.2)*.12*dir;
    I.pivot.scale.setScalar(.08+.92*grow);
    const fade=k<.06?k/.06:k>.88?(1-k)/.12:1;mat.opacity=(K.fire?1:.92)*fade;
    const v2=new THREE.Vector3();for(const e of extras){const m=e.parent;morphVertex(m,e.userData.vi,v);if(e.userData.ve!=null){morphVertex(m,e.userData.ve,v2);v.lerp(v2,.62)}e.position.copy(v);
      if(e.userData.sgn){e.rotation.set(0,0,0);e.rotation.y=e.userData.sgn*1.2+Math.sin(t*6)*.5*e.userData.sgn;e.rotation.x=-.3}else{e.rotation.set(.75,0,0);e.position.y+=.32/I.scale;e.position.z+=.12/I.scale}}
    // искры
    const n=K.fire?14:6;for(let i=0;i<n;i++){randomVertexWorld(I,v);
      if(K.fire)emit(v,new THREE.Vector3(-dir*rnd(.5,2),rnd(.5,2.4),rnd(-.5,.5)),Math.random()<.4?'#fff1b0':'#ff8a2a',rnd(.25,.6),rnd(.6,1.4),{c2:'#ff2a0a',g:.6});
      else emit(v,new THREE.Vector3(-dir*rnd(.3,1.4),rnd(-.2,.6),rnd(-.4,.4)),K.horn&&Math.random()<.3?'#ffe9a8':K.wings?'#9ffff0':'#cfefff',rnd(.12,.3),rnd(.8,1.8))}
    if(K.horn&&extras[0]){extras[0].getWorldPosition(v);for(let i=0;i<3;i++)emit(v,new THREE.Vector3(rnd(-.6,.6),rnd(-.2,.8),rnd(-.6,.6)),'#fff2c0',rnd(.15,.35),rnd(.5,1))}
    return t<T},dispose(){scene.remove(I.pivot)}});
}
// вихрь появления у кончика палочки
function vortex(sx,sy,col){const c=screenToWorld(sx,sy,2);let t=0;return addEffect({update(dt){t+=dt;for(let i=0;i<10;i++){const a=t*9+i*.63,r=.4+t*1.2;emit(new THREE.Vector3(c.x+Math.cos(a)*r,c.y+Math.sin(a)*r*.6,c.z+Math.sin(a)*.3),new THREE.Vector3(-Math.sin(a)*2,Math.cos(a)*1.2+.8,0),col,rnd(.15,.35),rnd(.5,1))}return t<.9}})}

/* ---------- финалы ---------- */
let finaleBg=null;
function bgFor(col){canvas.style.setProperty('--g1',col)}
function camShake(t,amp){camera.position.x=Math.sin(t*53)*amp;camera.position.y=2+Math.cos(t*47)*amp}
function resetCam(){camera.position.set(0,2,16);camera.lookAt(0,1.4,0);camera.fov=38;camera.updateProjectionMatrix();scene.fog=null}

// Слизерин: огромная змея выползает из темноты, встаёт и бросается на зрителя
function snakeFinale(){
  setMode('finale');bgFor('rgba(80,255,150,.55)');
  const SEG=220,RAD=24,L=48,HEAD=.05;const geo=new THREE.BufferGeometry();const pos=new Float32Array((SEG+1)*(RAD+1)*3),uv=new Float32Array((SEG+1)*(RAD+1)*2),idx=[];
  for(let i=0;i<SEG;i++)for(let j=0;j<RAD;j++){const a=i*(RAD+1)+j,b=a+RAD+1;idx.push(a,a+1,b,b,a+1,b+1)}
  for(let i=0;i<=SEG;i++)for(let j=0;j<=RAD;j++){uv[(i*(RAD+1)+j)*2]=i/SEG*36;uv[(i*(RAD+1)+j)*2+1]=j/RAD}
  geo.setIndex(idx);geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  const mat=new THREE.MeshStandardMaterial({color:0x2a7a45,roughness:.32,metalness:.3,emissive:0x041a0c,side:THREE.DoubleSide});
  mat.onBeforeCompile=sh=>{sh.vertexShader='varying vec2 vUv2;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvUv2=uv;');
    sh.fragmentShader='varying vec2 vUv2;\n'+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec2 q=vec2(vUv2.x*1.0,vUv2.y*14.0);q.x+=mod(floor(q.y),2.0)*.5;vec2 f=fract(q)-.5;float sc=smoothstep(.55,.15,length(f*vec2(1.0,1.25)));
    float belly=smoothstep(.17,.02,abs(vUv2.y-.75));diffuseColor.rgb=mix(diffuseColor.rgb*.35,diffuseColor.rgb*1.3,sc);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.78,.74,.42),belly*.75);
    float dia=smoothstep(.15,.0,abs(fract(vUv2.x*.5+abs(vUv2.y-.25)*1.5)-.5))*smoothstep(.3,.0,abs(vUv2.y-.25));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.05,.12,.06),dia*.8);
    if(!gl_FrontFacing)diffuseColor.rgb=vec3(.55,.06,.1);`).replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    float fr=pow(1.0-abs(dot(normalize(vViewPosition),normal)),2.2);totalEmissiveRadiance+=vec3(.25,1.0,.5)*fr*1.1;if(!gl_FrontFacing)totalEmissiveRadiance+=vec3(.25,.0,.02);`)};
  const body=new THREE.Mesh(geo,mat);body.frustumCulled=false;scene.add(body);
  const eyeM=new THREE.MeshBasicMaterial({color:0xffd23a}),pupM=new THREE.MeshBasicMaterial({color:0x000000});
  const eyes=[1,-1].map(s=>{const g=new THREE.Group();const e=new THREE.Mesh(new THREE.SphereGeometry(.2,20,14),eyeM);const p=new THREE.Mesh(new THREE.SphereGeometry(.2,12,10),pupM);p.scale.set(.2,.9,.5);p.position.z=.1;g.add(e,p);scene.add(g);return g});
  const fangM=new THREE.MeshStandardMaterial({color:0xf4f1e6,roughness:.3,emissive:0x333333});
  const fangs=[1,-1].map(s=>{const m=new THREE.Mesh(new THREE.ConeGeometry(.09,.7,12),fangM);scene.add(m);return m});
  const tongue=new THREE.Mesh(new THREE.CylinderGeometry(.035,.015,1.3,8),new THREE.MeshBasicMaterial({color:0xd2203a}));scene.add(tongue);
  const keyL=new THREE.PointLight(0x7dffb0,60,40);scene.add(keyL);
  const Q=new THREE.Vector3(),N=new THREE.Vector3(),B=new THREE.Vector3(),UP=new THREE.Vector3(0,1,0),tmp=new THREE.Vector3(),hinge=new THREE.Vector3(),rot=new THREE.Quaternion();
  let t=0;const T=7.6,CAM=new THREE.Vector3(0,1.1,9);
  const headPath=s=>{const p=new THREE.Vector3();const e=easeO(clamp(s/3.6,0,1));
    p.set(Math.sin(s*1.9)*4.6*(1-e*.8),-1.7+e*.2,-36+e*31);
    const rear=easeO(clamp((s-3.4)/1.1,0,1));p.y+=rear*2.4;p.x*=1-rear*.9;
    const lunge=easeIO(clamp((s-5.1)/.42,0,1));const tgt=new THREE.Vector3(0,.6,4.4);p.lerp(tgt,lunge);return p};
  const spine=[];
  return addEffect({update(dt){t+=dt;
    const hp=headPath(t);spine.unshift(hp.clone());if(spine.length>3000)spine.pop();
    const pts=[hp];let acc=0;const step=L/SEG;
    for(let i=1;i<spine.length&&pts.length<=SEG;i++){acc+=spine[i].distanceTo(spine[i-1]);while(acc>=step&&pts.length<=SEG){pts.push(spine[i].clone());acc-=step}}
    while(pts.length<=SEG){const l=pts[pts.length-1].clone();l.z-=step;l.x+=Math.sin(pts.length*.1+t*3)*.18;l.y=-1.7;pts.push(l)}
    const open=clamp((t-4.7)/.5,0,1)*(t>6.8?clamp((7.3-t)/.4,0,1):1);
    // шарнир челюсти
    const hi=Math.round(HEAD*SEG*.7);hinge.copy(pts[hi]);
    for(let i=0;i<=SEG;i++){const p=pts[i],pn=pts[Math.min(SEG,i+1)],pp=pts[Math.max(0,i-1)];Q.subVectors(pp,pn).normalize();N.crossVectors(Q,UP).normalize();B.crossVectors(N,Q).normalize();
      const u=i/SEG;let rx,ry;
      if(u<HEAD){const h=u/HEAD;rx=.35+Math.sin(Math.min(1,h*1.25)*Math.PI*.5)*1.05;ry=.28+Math.sin(Math.min(1,h*1.4)*Math.PI*.5)*.5;if(h>.75){const k=(h-.75)/.25;rx=rx*(1-k)+.95*k;ry=ry*(1-k)+.8*k}}
      else if(u>.78){const k=(1-u)/.22;rx=.06+.89*k;ry=.06+.74*k}else{rx=.95;ry=.8}
      for(let j=0;j<=RAD;j++){const a=j/RAD*TAU,cx=Math.cos(a),cy=Math.sin(a);tmp.set(p.x+N.x*cx*rx+B.x*cy*ry,p.y+N.y*cx*rx+B.y*cy*ry,p.z+N.z*cx*rx+B.z*cy*ry);
        if(u<HEAD*.7&&cy<0&&open>0){rot.setFromAxisAngle(N,-open*.7);tmp.sub(hinge).applyQuaternion(rot).add(hinge)}
        if(u<HEAD*.7&&cy>=0&&open>0){rot.setFromAxisAngle(N,open*.25);tmp.sub(hinge).applyQuaternion(rot).add(hinge)}
        const o=(i*(RAD+1)+j)*3;pos[o]=tmp.x;pos[o+1]=tmp.y;pos[o+2]=tmp.z}}
    geo.attributes.position.needsUpdate=true;geo.computeVertexNormals();
    // глаза, клыки, язык
    const ei=Math.round(HEAD*SEG*.45),ep=pts[ei];Q.subVectors(pts[ei-1],pts[ei+1]).normalize();N.crossVectors(Q,UP).normalize();B.crossVectors(N,Q).normalize();
    eyes.forEach((g,k)=>{const s=k?-1:1;g.position.copy(ep).addScaledVector(N,s*.95).addScaledVector(B,.32);g.lookAt(g.position.clone().addScaledVector(N,s).addScaledVector(Q,.6));g.scale.setScalar(1.3)});
    const fi=Math.round(HEAD*SEG*.18),fp=pts[fi];
    fangs.forEach((m,k)=>{const s=k?-1:1;m.position.copy(fp).addScaledVector(N,s*.5).addScaledVector(B,-.1-open*.25);m.quaternion.setFromUnitVectors(UP,B.clone().negate());m.visible=open>.15;m.scale.setScalar(.5+open)});
    tongue.position.copy(pts[0]).addScaledVector(Q,.6);tongue.quaternion.setFromUnitVectors(UP,Q);tongue.visible=Math.sin(t*13)>.1&&open<.2;
    keyL.position.copy(hp).add(new THREE.Vector3(0,3,4));
    camera.position.copy(CAM);camera.fov=46;camera.updateProjectionMatrix();camera.lookAt(0,.3+clamp((t-3.4)/1.1,0,1)*.9,-3);
    if(t>5.35&&t<6.3)camShake(t,(6.3-t)*.25),camera.position.y+=1.1-2;
    renderer.toneMappingExposure=t>T-.6?clamp((T-t)/.6,0,1):Math.min(1,t/.6);
    return t<T},dispose(){scene.remove(body,keyL,tongue,...eyes,...fangs);geo.dispose();renderer.toneMappingExposure=1;resetCam();}});
}
// Гриффиндор: огненный феникс летит из глубины на зрителя и раскрывает крылья
function phoenixFinale(){
  setMode('finale');bgFor('rgba(255,150,40,.9)');const mat=fireMat();const I=instance('Parrot',mat,10);I.play(null,.75);scene.add(I.pivot);
  const L=new THREE.PointLight(0xff8a2a,60,40);scene.add(L);const v=new THREE.Vector3();let t=0;const T=7;
  return addEffect({update(dt){t+=dt;I.mixer.update(dt);mat.userData.sh&&(mat.userData.sh.uniforms.uT.value=t);
    const a=easeO(clamp(t/3.2,0,1));I.pivot.position.set(Math.sin(t*1.3)*2*(1-a),-2.6+Math.sin(t*2)*.3,-60+a*60);I.pivot.rotation.set(.25,0,Math.sin(t*1.3)*.2*(1-a));
    L.position.copy(I.pivot.position).add(new THREE.Vector3(0,2,3));
    for(let i=0;i<30;i++){randomVertexWorld(I,v);emit(v,new THREE.Vector3(rnd(-1,1),rnd(.5,3),rnd(-2,0)),Math.random()<.35?'#fff1b0':'#ff9a2a',rnd(.3,.8),rnd(.6,1.6),{c2:'#ff1a00',g:1})}
    if(t>3.2&&t<3.35){const bc=new THREE.Box3().setFromObject(I.pivot).getCenter(new THREE.Vector3());for(let i=0;i<400;i++){const d=new THREE.Vector3(rnd(-1,1),rnd(-1,1),rnd(-1,1)).normalize().multiplyScalar(rnd(4,14));emit(bc,d,Math.random()<.5?'#ffd27a':'#ff6a1a',rnd(.3,.9),rnd(1,2.2),{c2:'#ff1a00',drag:.95})}}
    renderer.toneMappingExposure=t>T-.6?clamp((T-t)/.6,0,1):Math.min(1,t/.5);
    return t<T},dispose(){scene.remove(I.pivot,L,finaleBg);finaleBg=null;renderer.toneMappingExposure=1;resetCam()}});
}
// Когтевран: орёл в бронзово-синем сиянии пикирует на зрителя
function eagleFinale(){
  setMode('finale');bgFor('rgba(140,190,255,.9)');const mat=ghostMat('#5f8fe8',{rim:'#f3d9a4',core:.45});const I=instance('Parrot',mat,10);I.play(null,.9);scene.add(I.pivot);
  const v=new THREE.Vector3();let t=0;const T=7;
  return addEffect({update(dt){t+=dt;I.mixer.update(dt);const a=easeIO(clamp(t/3.4,0,1));
    I.pivot.position.set(14*(1-a),12*(1-a)-2.6+Math.sin(t*2)*.3,-40*(1-a)+1);I.pivot.rotation.set(.3-.6*(1-a),-.6*(1-a),.4*(1-a));
    for(let i=0;i<10;i++){randomVertexWorld(I,v);emit(v,new THREE.Vector3(rnd(-.6,.6),rnd(-.6,.6),rnd(-1.5,0)),Math.random()<.5?'#f3d9a4':'#9fc4ff',rnd(.15,.4),rnd(.6,1.4))}
    renderer.toneMappingExposure=t>T-.6?clamp((T-t)/.6,0,1):Math.min(1,t/.5);return t<T},dispose(){scene.remove(I.pivot,finaleBg);finaleBg=null;renderer.toneMappingExposure=1;resetCam()}});
}
// Пуффендуй: барсук (короткий хвост, полосатая морда) выбегает к зрителю
function badgerMat(){
  const m=new THREE.MeshStandardMaterial({color:0x3a3a40,roughness:.8,emissive:0x111111});
  m.onBeforeCompile=sh=>{sh.vertexShader='varying vec3 vBP;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBP=position;');
    sh.fragmentShader='varying vec3 vBP;\n'+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float head=smoothstep(28.0,40.0,vBP.z);float stripe=smoothstep(4.0,2.0,abs(vBP.x))*head;float cheek=smoothstep(7.0,10.0,abs(vBP.x))*head;
      float belly=smoothstep(30.0,18.0,vBP.y)*(1.0-head);
      diffuseColor.rgb=mix(vec3(.42,.42,.46),vec3(.1,.1,.11),belly);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.06,.06,.07),head);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.95,.94,.9),max(stripe,cheek));`).replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      float fr=pow(1.0-abs(dot(normalize(vViewPosition),normal)),2.0);totalEmissiveRadiance+=vec3(1.0,.8,.3)*fr*1.2;`)};
  return m;
}
function badgerFinale(){
  setMode('finale');bgFor('rgba(255,210,90,.7)');const I=instance('Fox',badgerMat(),7.5);const run=I.play('Run',1.15);scene.add(I.pivot);
  I.root.traverse(b=>{if(b.isBone){if(/Tail/.test(b.name))b.scale.setScalar(b.name.includes('01')?.45:.6);if(/Spine/.test(b.name))b.scale.set(1.35,1,1.25);if(/Leg01|UpperArm/.test(b.name))b.scale.setScalar(.72)}});
  const lamp=new THREE.PointLight(0xffd36a,30,30);lamp.position.set(0,6,6);scene.add(lamp);const v=new THREE.Vector3();let t=0,switched=false;const T=7;
  return addEffect({update(dt){t+=dt;I.mixer.update(dt);
    I.root.traverse(b=>{if(b.isBone&&/Tail/.test(b.name))b.scale.setScalar(.5)});
    const a=easeO(clamp(t/3,0,1));I.pivot.position.set(-12*(1-a),-1.9,-18*(1-a)+3);I.pivot.rotation.y=.6*(1-a)+.25;
    if(t>3.1&&!switched){switched=true;const s=I.play('Survey',1);run.crossFadeTo(s,.4,false)}
    if(t<3)for(let i=0;i<6;i++){emit(new THREE.Vector3(I.pivot.position.x+rnd(-1,1),-.7,I.pivot.position.z+rnd(-1,1)),new THREE.Vector3(rnd(-1,1),rnd(.5,1.5),rnd(-1,1)),'#c9a35a',rnd(.2,.5),rnd(.5,1),{g:-2})}
    for(let i=0;i<4;i++){randomVertexWorld(I,v);emit(v,new THREE.Vector3(rnd(-.4,.4),rnd(0,.8),rnd(-.4,.4)),'#ffd36a',rnd(.12,.3),rnd(.6,1.2))}
    renderer.toneMappingExposure=t>T-.6?clamp((T-t)/.6,0,1):Math.min(1,t/.5);return t<T},dispose(){scene.remove(I.pivot,lamp,finaleBg);finaleBg=null;renderer.toneMappingExposure=1;resetCam()}});
}

/* ---------- публичное API ---------- */
const API={ready:false,
  patronus(){if(!API.ready)return false;const keys=Object.keys(KINDS).filter(k=>k!==lastKind);const k=keys[Math.random()*keys.length|0];lastKind=k;const K=KINDS[k];
    const dir=Math.random()<.5,wx=dir?innerWidth*.08:innerWidth*.92,wy=innerHeight*.96;
    if(typeof FX2!=='undefined'&&FX2.wandCast){FX2.showName(K.fire?'Феникс':'Экспекто патронум!');FX2.wandCast(wx,wy,dir,(tx,ty)=>{FX2.showName(K.fire?'Феникс':'Патронус: '+K.n);vortex(tx,ty,K.fire?'#ffb040':'#cfefff');creature(k,{x:tx,y:ty})})}
    else creature(k,{x:wx,y:innerHeight*.6});
    return true},
  creature(k){if(!API.ready)return false;creature(k,{x:innerWidth*.1,y:innerHeight*.7});return true},
  house(h,onDone){if(!API.ready)return null;const f={gryffindor:phoenixFinale,slytherin:snakeFinale,ravenclaw:eagleFinale,hufflepuff:badgerFinale}[h];if(!f)return null;const e=f();const d=e.dispose;e.dispose=()=>{d&&d();onDone&&onDone()};return e},
  stop(e){if(e)e.update=()=>false},
};
window.FX3D=API;API._dbg=()=>({scene,camera,effects,renderer,canvas});
if(init()){setMode('screen');canvas.style.display='none';preload().then(()=>{API.ready=true;window.dispatchEvent(new Event('fx3d-ready'))}).catch(e=>console.warn('fx3d models',e))}
