// 3D-эффекты: Патронусы и существа, финалы факультетов. three.js, модели из three.js и Khronos (см. README).
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

const TAU=Math.PI*2,rnd=(a,b)=>a+Math.random()*(b-a),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const easeIO=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,easeO=t=>1-Math.pow(1-t,3);
let renderer,scene,camera,canvas,clock,running=false,effects=[],ok=false,models={},mode='screen';

/* ---------- инициализация ---------- */
function init(){
  canvas=document.createElement('canvas');canvas.className='fx3d';document.body.appendChild(canvas);
  try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,premultipliedAlpha:true,powerPreference:'high-performance'})}catch(e){canvas.remove();return false}
  renderer.setPixelRatio(Math.min(innerWidth<700?1.25:1.75,devicePixelRatio||1));renderer.setClearColor(0x000000,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(38,1,.1,400);camera.position.set(0,2,16);camera.lookAt(0,1.4,0);
  try{const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(new RoomEnvironment(),.04).texture}catch(e){}
  scene.add(new THREE.AmbientLight(0xffffff,.25));const dl=new THREE.DirectionalLight(0xffffff,1.4);dl.position.set(4,8,6);scene.add(dl);
  clock=new THREE.Clock();resize();addEventListener('resize',resize);
  initParticles();return true;
}
function resize(){if(!renderer)return;const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
function setMode(m,glow){mode=m;canvas.classList.toggle('finale',m==='finale');canvas.style.setProperty('--g1',glow||'rgba(150,210,255,.95)')}

/* ---------- материалы ---------- */
function ghostMat(col,o={}){
  const m=new THREE.MeshStandardMaterial({color:0x000000,emissive:new THREE.Color(col),emissiveIntensity:o.ei||1.4,transparent:true,opacity:o.op??.9,depthWrite:true,side:THREE.FrontSide,roughness:1,metalness:0,envMapIntensity:0});
  const rim=new THREE.Color(o.rim||'#ffffff');m.userData.u={uT:{value:0}};
  m.onBeforeCompile=sh=>{sh.uniforms.uRim={value:rim};sh.uniforms.uCore={value:o.core??.32};sh.uniforms.uPow={value:o.pow??1.7};sh.uniforms.uT=m.userData.u.uT;
    sh.vertexShader='varying vec3 vOP;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvOP=position;');
    sh.fragmentShader='uniform vec3 uRim;uniform float uCore;uniform float uPow;uniform float uT;varying vec3 vOP;\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>',
    `#include <emissivemap_fragment>
     float fr=pow(1.0-abs(dot(normalize(vViewPosition),normal)),uPow);
     float flow=.75+.25*sin(vOP.y*.06+vOP.z*.025-uT*5.0)+.15*sin(vOP.x*.2+uT*3.0);
     totalEmissiveRadiance=mix(totalEmissiveRadiance*uCore*flow,uRim*1.7,fr)+totalEmissiveRadiance*fr*.5;`);};
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
const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);
function load(name){return new Promise((res,rej)=>loader.load('models/'+name+'.glb',g=>res(g),undefined,rej))}
async function preload(){const [h,p,f]=await Promise.all([load('Horse'),load('Parrot'),load('Fox')]);models={Horse:h,Parrot:p,Fox:f};
  for(const g of[h,p,f])g.scene.traverse(o=>{if(!o.isMesh)return;let geo=o.geometry;['uv','color','normal'].forEach(a=>geo.deleteAttribute(a));
    try{geo=mergeVertices(geo,1e-3)}catch(e){}geo.computeVertexNormals();o.geometry=geo});
  // ключевые точки лошади: кончик носа, уши, холка
  const hm=[];h.scene.traverse(o=>{if(o.isMesh)hm.push(o)});const m=hm[0],P=m.geometry.attributes.position;
  let ear=0,nose=0,wither=0,by=-1e9,bz=-1e9,bw=-1e9;
  for(let i=0;i<P.count;i++){const x=P.getX(i),y=P.getY(i),z=P.getZ(i);if(y>by){by=y;ear=i}}
  const ey=P.getY(ear);
  for(let i=0;i<P.count;i++){const y=P.getY(i),z=P.getZ(i);if(y>ey-70&&y<ey-20&&z>bz&&Math.abs(P.getX(i))<12){bz=z;nose=i}}
  for(let i=0;i<P.count;i++){const y=P.getY(i),z=P.getZ(i),x=P.getX(i);const s=y-Math.abs(z-25)*1.2-Math.abs(x)*2;if(z<70&&z>-40&&s>bw){bw=s;wither=i}}
  models.horseKeys={ear,nose,wither};
}
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
let ticking=false,pending=[];
function addEffect(e){if(ticking){pending.push(e);return e}effects.push(e);if(!running){running=true;canvas.style.display='block';clock.getDelta();requestAnimationFrame(tick)}return e}
function tick(){
  const dt=Math.min(window.__fxCap||.05,clock.getDelta());
  ticking=true;effects=effects.filter(e=>{const alive=e.update(dt);if(!alive&&e.dispose)e.dispose();return alive});ticking=false;if(pending.length){effects.push(...pending);pending=[]}
  stepParticles(dt);
  renderer.render(scene,camera);
  if(effects.length||anyParticles())requestAnimationFrame(tick);else{running=false;canvas.style.display='none';setMode('screen')}
}
function screenToWorld(x,y,z=0){const v=new THREE.Vector3(x/innerWidth*2-1,-(y/innerHeight)*2+1,.5).unproject(camera);const d=v.sub(camera.position).normalize();const t=(z-camera.position.z)/d.z;return camera.position.clone().addScaledVector(d,t)}

// крылья из перьев (Абраксан, Пегас) и перепончатые (Фестрал)
// гибкое крыло: сетка, которая изгибается волной от плеча к кончику
function softWing(kind,len,col,rim){
  const NS=30,NC=12,bat=kind==='bat';const geo=new THREE.BufferGeometry();const pos=new Float32Array((NS+1)*(NC+1)*3),uv=new Float32Array((NS+1)*(NC+1)*2),idx=[];
  for(let i=0;i<=NS;i++)for(let j=0;j<=NC;j++){const k=i*(NC+1)+j;uv[k*2]=i/NS;uv[k*2+1]=j/NC;if(i<NS&&j<NC){const a=k,b=k+NC+1;idx.push(a,b,a+1,b,b+1,a+1)}}
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.setIndex(idx);
  const mat=bat?ghostMat('#0d1a20',{rim:'#a8fff0',core:.18,pow:1.4}):ghostMat(col,{rim,core:.45,pow:1.5});mat.side=THREE.DoubleSide;
  const mesh=new THREE.Mesh(geo,mat);mesh.frustumCulled=false;const g=new THREE.Group();g.add(mesh);
  const chord=s=>bat?len*(.46*Math.pow(1-s,.75)+.05)*(.72+.28*Math.abs(Math.cos(s*Math.PI*3.5))):len*(.34*(1-.45*s)+.06)*(.86+.14*(1-((s*11)%1)))*(s>.85?Math.sqrt(Math.max(.05,(1-s)/.15)):1);
  const sp=[];for(let i=0;i<=NS;i++)sp.push(new THREE.Vector2());
  function update(t,base,amp,w){let x=0,y=0;const ds=len/NS;
    for(let i=0;i<=NS;i++){const s=i/NS;sp[i].set(x,y);const th=base*(.4+.75*s)+amp*Math.sin(w*t-s*1.6)*(.45+.9*s);x+=Math.cos(th)*ds;y+=Math.sin(th)*ds}
    for(let i=0;i<=NS;i++){const s=i/NS,L=chord(s),zl=len*(.05-.16*s*s),n=i<NS?Math.atan2(sp[i+1].y-sp[i].y,sp[i+1].x-sp[i].x):Math.atan2(sp[i].y-sp[i-1].y,sp[i].x-sp[i-1].x);
      for(let j=0;j<=NC;j++){const c=j/NC,k=(i*(NC+1)+j)*3,sag=-Math.sin(c*Math.PI)*L*(bat?.12:.06)*(1+.4*Math.sin(w*t-s*2))+(bat?0:-c*c*L*.08);
        pos[k]=sp[i].x-Math.sin(n)*sag;pos[k+1]=sp[i].y+Math.cos(n)*sag;pos[k+2]=zl-c*L}}
    geo.attributes.position.needsUpdate=true;geo.computeVertexNormals()}
  update(0,.4,0,1);return {g,mat,update};
}
function featherWing(col,rim,len){
  const g=new THREE.Group(),inner=new THREE.Group(),outer=new THREE.Group();g.add(inner);inner.add(outer);outer.position.x=len*.45;
  const fs=new THREE.Shape();fs.moveTo(0,-.5);fs.quadraticCurveTo(.5,-.55,1,0);fs.quadraticCurveTo(.5,.55,0,.5);fs.lineTo(0,-.5);const fg=new THREE.ShapeGeometry(fs,8);
  const mat=ghostMat(col,{rim,core:.5,pow:1.3});mat.side=THREE.DoubleSide;
  for(let i=0;i<9;i++){const f=new THREE.Mesh(fg,mat);const L=len*(.35+i*.02),W=len*.07;f.scale.set(L,W,1);f.rotation.x=Math.PI/2;f.rotation.z=-.15-i*.11;f.position.set(len*.05*i,0,-len*.02*i);inner.add(f)}
  for(let i=0;i<10;i++){const f=new THREE.Mesh(fg,mat);const L=len*(.55-i*.025),W=len*.06;f.scale.set(L,W,1);f.rotation.x=Math.PI/2;f.rotation.z=.25-i*.13;f.position.set(len*.04*i,0,-len*.01*i);outer.add(f)}
  return {g,inner,outer,mat};
}
function batWing(len){
  const g=new THREE.Group(),inner=new THREE.Group(),outer=new THREE.Group();g.add(inner);inner.add(outer);outer.position.x=len*.42;
  const mem=ghostMat('#0b1218',{rim:'#a8fff0',core:.15,pow:1});mem.side=THREE.DoubleSide;mem.opacity=.85;
  const L=len;const s1=new THREE.Shape();s1.moveTo(0,.04*L);s1.lineTo(L*.43,.08*L);s1.lineTo(L*.43,-.36*L);s1.quadraticCurveTo(L*.3,-.3*L,L*.2,-.42*L);s1.quadraticCurveTo(L*.1,-.32*L,0,-.38*L);s1.lineTo(0,.04*L);
  const s2=new THREE.Shape();s2.moveTo(-.01*L,.08*L);s2.quadraticCurveTo(L*.3,.16*L,L*.6,.02*L);s2.quadraticCurveTo(L*.47,-.06*L,L*.5,-.16*L);s2.quadraticCurveTo(L*.36,-.14*L,L*.36,-.3*L);s2.quadraticCurveTo(L*.22,-.22*L,L*.18,-.4*L);s2.quadraticCurveTo(L*.08,-.3*L,-.01*L,-.36*L);s2.lineTo(-.01*L,.08*L);
  const m1=new THREE.Mesh(new THREE.ShapeGeometry(s1,12),mem),m2=new THREE.Mesh(new THREE.ShapeGeometry(s2,16),mem);m1.rotation.x=m2.rotation.x=Math.PI/2;inner.add(m1);outer.add(m2);
  const bone=new THREE.MeshBasicMaterial({color:0x9ffff0,transparent:true,opacity:.55});
  [[0,.06,.43,.08],[.43,.08,1.03,.1],[.43,.08,.93,-.08],[.43,.08,.79,-.3],[.43,.08,.6,-.4]].forEach(([x1,z1,x2,z2],k)=>{const a=new THREE.Vector3(x1*L,0,z1*L),b=new THREE.Vector3(x2*L,0,z2*L);const c=new THREE.Mesh(new THREE.CylinderGeometry(.006*L,.004*L,a.distanceTo(b),6),bone);c.position.copy(a).lerp(b,.5);c.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());if(k===0)inner.add(c);else{c.position.x-=.42*L;outer.add(c)}});
  return {g,inner,outer,mat:mem};
}
const GHOSTS={
  lynx:{n:'Рысь (Кингсли Бруствер)',model:'Lion',o:{sub:[0,38],strip:'ROOT',len:5.2,T:6,y:-2.2,z:-2,ts:1.9,bob:.03,bobF:6,roll:0}},
  eagleG:{n:'Орёл',model:'Eagle',o:{len:8,T:6,y:1.4,z:-2,bob:.5}},
};
const KINDS={
  horse:{n:'Лошадь (Джинни Уизли)',model:'Horse',len:8.5,col:'#9fd8ff',rim:'#f2fbff',ts:1.1},
  stag:{n:'Олень (Гарри Поттер)',model:'Horse',len:8.4,col:'#a8dcff',rim:'#f4fbff',ts:1.05,antlers:true},
  unicorn:{n:'Единорог',model:'Horse',len:8.2,col:'#eef4ff',rim:'#fff3c8',ts:1.05,horn:true},
  thestral:{n:'Фестрал',model:'Horse',len:8.6,col:'#16222e',rim:'#b8fff4',ts:.85,wings:'bat',core:.12,pow:1.1,fly:true},
  abraxan:{n:'Абраксанский крылатый конь',model:'Horse',len:9,col:'#ffd98a',rim:'#fff6dc',ts:.8,wings:'feather',fly:true},
  fox:{n:'Лис (Симус Финниган)',model:'Fox',len:6.4,col:'#a8dcff',rim:'#f0fbff',clip:'Run',ts:1},
  phoenix:{n:'Феникс',model:'Parrot',len:7.5,fire:true,ts:.8,bird:true},
};
let lastKind='';
function creature(kindKey,from,opt={}){
  const K={...KINDS[kindKey]};if(opt.len)K.len=opt.len;const mat=K.fire?fireMat():ghostMat(K.col,{rim:K.rim,core:K.core,pow:K.pow});
  const I=instance(K.model,mat,K.len);I.play(K.clip,K.ts);scene.add(I.pivot);
  const dir=opt.dirOverride||(from.x<innerWidth/2?1:-1);
  const start=screenToWorld(from.x,from.y,0),endX=dir*20,z0=0,z1=-4,y0=K.bird?.8:K.fly?1.2:-1.6;
  const keys=models.horseKeys,m=I.meshes[0],extras={};const v=new THREE.Vector3(),v2=new THREE.Vector3(),v3=new THREE.Vector3(),UP=new THREE.Vector3(0,1,0);
  if(K.horn){const hm=ghostMat('#ffe7a0',{rim:'#ffffff',core:.9,pow:1.2});const hg=new THREE.ConeGeometry(.07,1,24,1);hg.translate(0,.5,0);
    const pos=hg.attributes.position;for(let i=0;i<pos.count;i++){const y=pos.getY(i),a=Math.atan2(pos.getZ(i),pos.getX(i));const r=Math.hypot(pos.getX(i),pos.getZ(i))*(1+.25*Math.sin(a*2+y*40));pos.setX(i,Math.cos(a)*r);pos.setZ(i,Math.sin(a)*r)}hg.computeVertexNormals();
    extras.horn=new THREE.Mesh(hg,hm);extras.horn.scale.setScalar(.85/I.scale);m.add(extras.horn);extras.hm=hm}
  if(K.antlers){const am=ghostMat(K.col,{rim:'#ffffff',core:.6,pow:1.2});const ag=new THREE.Group();
    const tube=(pts,r0,r1)=>{const cu=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));const g=new THREE.TubeGeometry(cu,24,1,8,false);const P=g.attributes.position,n=g.attributes.normal;
      // сужение к кончику
      for(let i=0;i<P.count;i++){const seg=Math.floor(i/9)/24,c=cu.getPointAt(Math.min(1,seg));const r=r0+(r1-r0)*seg;P.setXYZ(i,c.x+(P.getX(i)-c.x)*r,c.y+(P.getY(i)-c.y)*r,c.z+(P.getZ(i)-c.z)*r)}g.computeVertexNormals();
      const tip=new THREE.SphereGeometry(r1,8,6);tip.translate(...pts[pts.length-1]);return [g,tip]};
    for(const s of[1,-1]){const beam=[[s*.06,0,0],[s*.32,.45,-.12],[s*.55,.95,-.22],[s*.66,1.45,-.12],[s*.62,1.9,.08]];
      const parts=[...tube(beam,.085,.03),...tube([[s*.2,.25,-.05],[s*.26,.45,.22],[s*.3,.62,.4]],.05,.02),...tube([[s*.5,.8,-.2],[s*.52,1.05,.08],[s*.5,1.25,.25]],.045,.02),...tube([[s*.64,1.35,-.14],[s*.8,1.65,-.18],[s*.9,1.9,-.1]],.04,.018)];
      for(const g of parts){const me=new THREE.Mesh(g,am);me.frustumCulled=false;ag.add(me)}
      const base=new THREE.SphereGeometry(.1,10,8);base.translate(s*.06,0,0);ag.add(new THREE.Mesh(base,am))}
    ag.scale.setScalar(.8/I.scale);m.add(ag);extras.ant=ag;extras.am=am}
  if(K.wings){for(const s of[1,-1]){const w=softWing(K.wings,200,K.col,K.rim);w.g.scale.set(s,1,1);m.add(w.g);(extras.wings=extras.wings||[]).push({...w,s})}}
  const T=opt.speedT||(K.fly?6:5.2);let t=0;
  return addEffect({update(dt){t+=dt;I.mixer.update(dt*(K.fly?.85:1));mat.userData.u&&(mat.userData.u.uT.value=t);if(mat.userData.sh)mat.userData.sh.uniforms.uT.value=t;
    const k=clamp(t/T,0,1),grow=easeO(clamp(t/.9,0,1));
    const x=start.x+(endX-start.x)*easeIO(k),z=z0+(z1-z0)*k,y=start.y+(y0-start.y)*easeO(clamp(t/1.1,0,1))+(K.bird||K.fly?Math.sin(t*2.2)*.5:0);
    I.pivot.position.set(x,y,z);I.pivot.rotation.y=dir>0?Math.PI/2:-Math.PI/2;if(K.bird||K.fly){I.pivot.rotation.z=Math.sin(t*2.2)*.08*dir;I.pivot.rotation.x=K.fly?-.08:0}
    I.pivot.scale.setScalar(.08+.92*grow);
    const fade=k<.06?k/.06:k>.88?(1-k)/.12:1;mat.opacity=(K.fire?1:.9)*fade;if(extras.hm)extras.hm.opacity=fade;
    if(extras.horn){morphVertex(m,keys.ear,v);morphVertex(m,keys.nose,v2);v3.subVectors(v2,v).normalize();
      extras.horn.position.copy(v).lerp(v2,.2);extras.horn.position.y-=13;const d=v3.clone().multiplyScalar(.8).add(UP.clone().multiplyScalar(1)).normalize();extras.horn.quaternion.setFromUnitVectors(UP,d)}
    if(extras.ant){morphVertex(m,keys.ear,v);morphVertex(m,keys.nose,v2);v3.subVectors(v2,v);extras.ant.position.copy(v).lerp(v2,.12);extras.ant.position.y-=9;extras.ant.rotation.set(0,Math.atan2(v3.x,v3.z),0,'YXZ');extras.ant.rotateX(-.25);extras.am.opacity=fade*.95;extras.am.userData.u&&(extras.am.userData.u.uT.value=t)}
    if(extras.wings){morphVertex(m,keys.wither,v);const fl=Math.sin(t*(K.wings==='bat'?5:4.2));
      for(const w of extras.wings){w.g.position.copy(v);w.g.position.y-=K.wings==='bat'?14:10;w.g.position.x+=w.s*4;w.g.rotation.y=.3;w.update(t,.32,.62,K.wings==='bat'?4.6:3.8);w.mat.opacity=fade*(K.wings==='bat'?.9:1);w.mat.userData.u&&(w.mat.userData.u.uT.value=t)}}
    const n=K.fire?14:6;for(let i=0;i<n;i++){randomVertexWorld(I,v);
      if(K.fire)emit(v,new THREE.Vector3(-dir*rnd(.5,2),rnd(.5,2.4),rnd(-.5,.5)),Math.random()<.4?'#fff1b0':'#ff8a2a',rnd(.25,.6),rnd(.6,1.4),{c2:'#ff2a0a',g:.6});
      else emit(v,new THREE.Vector3(-dir*rnd(.3,1.4),rnd(-.2,.6),rnd(-.4,.4)),K.horn&&Math.random()<.25?'#ffe9a8':K.wings==='bat'?'#9ffff0':kindKey==='abraxan'?'#ffe7a8':'#cfefff',rnd(.12,.3),rnd(.8,1.8))}
    if(extras.horn){extras.horn.getWorldPosition(v);v.add(new THREE.Vector3(0,.5,0));for(let i=0;i<3;i++)emit(v,new THREE.Vector3(rnd(-.5,.5),rnd(0,.8),rnd(-.5,.5)),'#fff2c0',rnd(.15,.35),rnd(.5,1))}
    return t<T},dispose(){scene.remove(I.pivot)}});
}
// вихрь появления у кончика палочки
function vortex(sx,sy,col){const c=screenToWorld(sx,sy,2);let t=0;return addEffect({update(dt){t+=dt;for(let i=0;i<10;i++){const a=t*9+i*.63,r=.4+t*1.2;emit(new THREE.Vector3(c.x+Math.cos(a)*r,c.y+Math.sin(a)*r*.6,c.z+Math.sin(a)*.3),new THREE.Vector3(-Math.sin(a)*2,Math.cos(a)*1.2+.8,0),col,rnd(.15,.35),rnd(.5,1))}return t<.9}})}

/* ---------- финалы ---------- */
let finaleBg=null;
function bgFor(col){canvas.style.setProperty('--g1',col)}
function camShake(t,amp){camera.position.x=Math.sin(t*53)*amp;camera.position.y=2+Math.cos(t*47)*amp}
function resetCam(){camera.position.set(0,2,16);camera.lookAt(0,1.4,0);camera.fov=38;camera.updateProjectionMatrix();scene.fog=null}

// Слизерин: огромная змея выползает из темноты, встаёт как кобра и бросается на зрителя
function scaleTextures(){
  const W=512,H=256,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  const hgt=new Float32Array(W*H);const rows=8,cols=16;
  for(let r=0;r<=rows;r++)for(let k=0;k<=cols;k++){const cx=(k+(r%2)*.5)/cols*W,cy=r/rows*H,rx=W/cols*.62,ry=H/rows*.78;
    for(let y=Math.floor(cy-ry);y<cy+ry;y++)for(let x=Math.floor(cx-rx);x<cx+rx;x++){const dx=(x-cx)/rx,dy=(y-cy)/ry;const d=dx*dx+dy*dy;if(d>=1)continue;const X=((x%W)+W)%W,Y=((y%H)+H)%H;const v=(1-d)*(1-.3*Math.max(0,-dy));hgt[Y*W+X]=Math.max(hgt[Y*W+X],v)}}
  const img=g.createImageData(W,H);for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;const l=hgt[y*W+((x-1+W)%W)],r_=hgt[y*W+((x+1)%W)],u=hgt[((y-1+H)%H)*W+x],d=hgt[((y+1)%H)*W+x];
    let nx=(l-r_)*3.5,ny=(u-d)*3.5,nz=1;const n=Math.hypot(nx,ny,nz);img.data[i*4]=(nx/n*.5+.5)*255;img.data[i*4+1]=(ny/n*.5+.5)*255;img.data[i*4+2]=(nz/n*.5+.5)*255;img.data[i*4+3]=255}
  g.putImageData(img,0,0);const nt=new THREE.CanvasTexture(c);nt.wrapS=nt.wrapT=THREE.RepeatWrapping;
  const c2=document.createElement('canvas');c2.width=W;c2.height=H;const g2=c2.getContext('2d');const im2=g2.createImageData(W,H);
  for(let i=0;i<W*H;i++){const v=hgt[i];const e=v<.12?0:1;im2.data[i*4]=im2.data[i*4+1]=im2.data[i*4+2]=Math.round((.35+.65*Math.min(1,v*1.6))*255*e+20*(1-e));im2.data[i*4+3]=255}
  g2.putImageData(im2,0,0);const at=new THREE.CanvasTexture(c2);at.wrapS=at.wrapT=THREE.RepeatWrapping;
  return {nt,at};
}
let SCALES=null;
function snakeFinale(){
  setMode('finale');bgFor('rgba(70,255,140,.22)');if(!SCALES)SCALES=scaleTextures();
  const SEG=420,RAD=36,L=58,HEAD=.055;
  const geo=new THREE.BufferGeometry();const pos=new Float32Array((SEG+1)*(RAD+1)*3),uv=new Float32Array((SEG+1)*(RAD+1)*2),idx=[];
  for(let i=0;i<SEG;i++)for(let j=0;j<RAD;j++){const a=i*(RAD+1)+j,b=a+RAD+1;idx.push(a,a+1,b,b,a+1,b+1)}
  for(let i=0;i<=SEG;i++)for(let j=0;j<=RAD;j++){uv[(i*(RAD+1)+j)*2]=i/SEG*L*3.2;uv[(i*(RAD+1)+j)*2+1]=j/RAD*4}
  geo.setIndex(idx);geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  const mat=new THREE.MeshPhysicalMaterial({color:0x2f7a3e,roughness:.38,metalness:.05,clearcoat:.8,clearcoatRoughness:.25,sheen:.4,sheenColor:new THREE.Color(0x7dffa8),normalMap:SCALES.nt,normalScale:new THREE.Vector2(1.1,1.1),aoMap:null,side:THREE.DoubleSide,envMapIntensity:.55});
  mat.onBeforeCompile=sh=>{sh.uniforms.tScale={value:SCALES.at};
    sh.vertexShader='varying vec2 vU;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvU=uv;');
    sh.fragmentShader='uniform sampler2D tScale;varying vec2 vU;\n'+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float s=texture2D(tScale,vU).r;float ring=fract(vU.y*.25);float belly=smoothstep(.16,.03,abs(ring-.75));
      float dorsal=smoothstep(.22,.0,abs(ring-.25));float dia=smoothstep(.32,.18,abs(fract(vU.x*.09+abs(ring-.25)*2.2)-.5))*dorsal;
      vec3 base=mix(vec3(.04,.14,.06),vec3(.09,.28,.11),dorsal*.7);base=mix(base,vec3(.01,.04,.02),dia*.9);base=mix(base,vec3(.55,.5,.28),belly);
      diffuseColor.rgb=base*(.45+.75*s);
      if(!gl_FrontFacing)diffuseColor.rgb=vec3(.62,.12,.16);`).replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      float fr=pow(1.0-abs(dot(normalize(vViewPosition),normal)),2.5);totalEmissiveRadiance+=vec3(.15,.7,.35)*fr*.3;`)};
  const body=new THREE.Mesh(geo,mat);body.frustumCulled=false;body.castShadow=true;scene.add(body);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.55}));ground.rotation.x=-Math.PI/2;ground.position.y=-2.55;ground.receiveShadow=true;scene.add(ground);
  const key=new THREE.DirectionalLight(0xfff3d6,2.2);key.position.set(6,14,10);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:1,far:60});scene.add(key);
  const rim=new THREE.DirectionalLight(0x6dff9e,2.6);rim.position.set(-8,6,-14);scene.add(rim);const hemi=new THREE.HemisphereLight(0x9fffc0,0x0a1a10,.6);scene.add(hemi);
  // глаза
  const eyeM=new THREE.MeshPhysicalMaterial({color:0xe8b020,emissive:0x5a3a00,roughness:.1,clearcoat:1,clearcoatRoughness:.02});
  const pupM=new THREE.MeshBasicMaterial({color:0x050505});
  const eyes=[0,1].map(()=>{const gg=new THREE.Group();const e=new THREE.Mesh(new THREE.SphereGeometry(.17,32,20),eyeM);const p=new THREE.Mesh(new THREE.SphereGeometry(.17,16,12),pupM);p.scale.set(.16,.85,.55);p.position.z=.07;gg.add(e,p);scene.add(gg);return gg});
  // клыки (изогнутые)
  const fangCurve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(0,0,0),new THREE.Vector3(0,-.25,.12),new THREE.Vector3(0,-.55,-.02));
  const fg=new THREE.TubeGeometry(fangCurve,12,.05,10,false);const fp=fg.attributes.position;for(let i=0;i<fp.count;i++){}
  const fangM=new THREE.MeshPhysicalMaterial({color:0xf6f1e2,roughness:.25,clearcoat:.6});
  const fangs=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.ConeGeometry(.075,.62,14),fangM);scene.add(m);return m});
  const tongueM=new THREE.MeshStandardMaterial({color:0xb81830,roughness:.4});
  const tongue=new THREE.Group();const t1=new THREE.Mesh(new THREE.CylinderGeometry(.016,.014,.7,8),tongueM);t1.position.y=.35;tongue.add(t1);
  [-1,1].forEach(s=>{const f=new THREE.Mesh(new THREE.CylinderGeometry(.013,.004,.25,6),tongueM);f.position.set(s*.04,.8,0);f.rotation.z=-s*.35;tongue.add(f)});scene.add(tongue);
  const Q=new THREE.Vector3(),N=new THREE.Vector3(),B=new THREE.Vector3(),UP=new THREE.Vector3(0,1,0),tmp=new THREE.Vector3(),hinge=new THREE.Vector3(),rot=new THREE.Quaternion();
  let t=0;const T=8.2;
  const strikeAt=5.3;
  const headPath=s=>{const p=new THREE.Vector3();const e=easeO(clamp(s/4,0,1));
    p.set(Math.sin(s*1.7)*5.5*(1-e*.85),-2.15+e*.1,-42+e*36);
    const rear=easeIO(clamp((s-3.7)/1.2,0,1));p.y+=rear*2.6;p.x*=1-rear*.95;p.z+=rear*.5;
    const sway=Math.sin(s*2.4)*.35*rear*(1-clamp((s-strikeAt)/.2,0,1));p.x+=sway;
    const st=clamp((s-strikeAt)/.32,0,1),back=clamp((s-6.9)/.8,0,1);const tgt=new THREE.Vector3(-.6,.5,3.6);p.lerp(tgt,easeIO(st)*(1-easeIO(back)*.55));return p};
  const spine=[];let lastHp=null;
  const prof=(u)=>{if(u<HEAD){const h=u/HEAD;const tip=Math.max(.03,Math.pow(Math.sin(Math.min(1,h/.38)*Math.PI*.5),.75));let rx=(.3+Math.sin(Math.min(1,h*1.35)*Math.PI*.5)*1.05)*tip,ry=(.2+Math.sin(Math.min(1,h*1.5)*Math.PI*.5)*.48)*tip;if(h>.78){const k=(h-.78)/.22;rx=rx*(1-k)+.78*k;ry=ry*(1-k)+.7*k}return [rx,ry]}
    if(u<.2){const k=(u-HEAD)/(.2-HEAD);return [.78+.32*Math.sin(k*Math.PI*.5),.7+.22*Math.sin(k*Math.PI*.5)]}
    if(u>.72){const k=(1-u)/.28;return [.06+1.04*Math.pow(k,.8),.05+.87*Math.pow(k,.8)]}return [1.1,.92]};
  return addEffect({update(dt){t+=dt;
    const hp=headPath(t);
    if(!lastHp||hp.distanceTo(lastHp)>.004){spine.unshift(hp.clone());lastHp=hp.clone()}else spine[0]=hp.clone();if(spine.length>6000)spine.pop();
    const pts=[hp];const step=L/SEG;spine[0]=hp.clone();
    {let need=step,prev=spine[0];for(let i=1;i<spine.length&&pts.length<=SEG;i++){const cur=spine[i];let seg=prev.distanceTo(cur);let from=prev.clone();
      while(seg>=need&&pts.length<=SEG){const p=from.clone().lerp(cur,need/seg);pts.push(p);seg-=need;from=p;need=step}need-=seg;prev=cur}}
    while(pts.length<=SEG){const n=pts.length;const l=pts[n-1].clone();l.z-=step*.98;l.x+=Math.cos((n*step)*.3)*step*.45;l.y+=(-2.15-l.y)*.05;pts.push(l)}
    const open=clamp((t-(strikeAt-.15))/.25,0,1)*(t>7.2?clamp((7.8-t)/.5,0,1):1);
    const hi=Math.round(HEAD*SEG*.78);hinge.copy(pts[hi]);const HN=new THREE.Vector3();
    const FN=[],FB=[],FQ=[];{let pn_=null;for(let i=SEG;i>=0;i--){const p=pts[i],pn=pts[Math.min(SEG,i+1)],pp=pts[Math.max(0,i-1)];const q=new THREE.Vector3().subVectors(pp,pn).normalize();let n;
        if(!pn_){n=new THREE.Vector3().crossVectors(q,UP);if(n.lengthSq()<1e-6)n.set(1,0,0);n.normalize()}else{n=pn_.clone().addScaledVector(q,-pn_.dot(q));if(n.lengthSq()<1e-8)n.set(1,0,0);n.normalize();
          const want=new THREE.Vector3().crossVectors(q,UP);if(want.lengthSq()>1e-4){want.normalize();n.lerp(want,.04).normalize()}}
        pn_=n;FN[i]=n;FQ[i]=q;FB[i]=new THREE.Vector3().crossVectors(n,q).normalize()}}
    for(let i=0;i<=SEG;i++){const p=pts[i];N.copy(FN[i]);Q.copy(FQ[i]);B.copy(FB[i]);
      const u=i/SEG;const [rx,ry]=prof(u);const head=u<HEAD;
      for(let j=0;j<=RAD;j++){const a=j/RAD*TAU;let cx=Math.cos(a),cy=Math.sin(a);
        let yy=cy*ry;if(head){yy=cy>0?cy*ry*(.85+.15*Math.abs(cx)):cy*ry;const eyeBump=Math.exp(-Math.pow((u/HEAD-.42)/.12,2))*Math.exp(-Math.pow((Math.abs(cx)-.62)/.25,2))*(cy>0?.22:0);yy+=eyeBump}
        tmp.set(p.x+N.x*cx*rx+B.x*yy,p.y+N.y*cx*rx+B.y*yy,p.z+N.z*cx*rx+B.z*yy);
        if(u<HEAD*.78&&open>0){const w=cy<0?-open*.32*Math.min(1,-cy*1.6):open*.1*Math.min(1,cy*1.6);rot.setFromAxisAngle(FN[hi],w);tmp.sub(hinge).applyQuaternion(rot).add(hinge)}
        const o=(i*(RAD+1)+j)*3;pos[o]=tmp.x;pos[o+1]=tmp.y;pos[o+2]=tmp.z}}
    geo.attributes.position.needsUpdate=true;geo.computeVertexNormals();
    // глаза, клыки, язык по каркасу головы
    const frame=(i)=>{N.copy(FN[i]);Q.copy(FQ[i]);B.copy(FB[i]);return pts[i]};
    let ep=frame(Math.round(HEAD*SEG*.42));const [erx,ery]=prof(HEAD*.42);
    eyes.forEach((g,k)=>{const s=k?-1:1;g.position.copy(ep).addScaledVector(N,s*erx*.86).addScaledVector(B,ery*.38);
      if(open>0){tmp.copy(g.position).sub(hinge).applyQuaternion(rot.setFromAxisAngle(FN[hi],open*.22)).add(hinge);g.position.copy(tmp)}
      g.lookAt(g.position.clone().addScaledVector(N,s).addScaledVector(Q,.7).addScaledVector(B,.2))});
    let fp2=frame(Math.round(HEAD*SEG*.14));const [frx]=prof(HEAD*.14);
    fangs.forEach((m,k)=>{const s=k?-1:1;m.position.copy(fp2).addScaledVector(N,s*frx*.55).addScaledVector(B,-.08);
      tmp.copy(m.position).sub(hinge).applyQuaternion(rot.setFromAxisAngle(FN[hi],open*.22)).add(hinge);m.position.copy(tmp).addScaledVector(B,-.3*open);
      m.quaternion.setFromUnitVectors(UP,B.clone().negate().addScaledVector(Q,.25).normalize());m.visible=open>.2;m.scale.setScalar(.6+.6*open)});
    const tp=frame(0);tongue.position.copy(tp).addScaledVector(Q,.1).addScaledVector(B,-.05);tongue.quaternion.setFromUnitVectors(UP,Q.clone().addScaledVector(B,-.15).normalize());
    const flick=Math.max(0,Math.sin(t*9))*(open<.1?1:0);tongue.scale.set(1,.2+flick*.9,1);tongue.visible=flick>.05;
    // камера
    const sideK=easeIO(clamp((t-3.6)/1.6,0,1));camera.fov=44;camera.updateProjectionMatrix();camera.position.set(4.2*sideK,.6+.4*sideK,10.5-1.2*sideK);camera.lookAt(-.4*sideK,-.4+clamp((t-3.7)/1.2,0,1)*1.2,-3+3*sideK);
    if(t>strikeAt+.2&&t<strikeAt+1.1){const a=(strikeAt+1.1-t)*.22;camera.position.x+=Math.sin(t*61)*a;camera.position.y+=Math.cos(t*53)*a}
    renderer.toneMappingExposure=(t>T-.7?clamp((T-t)/.7,0,1):Math.min(1,t/.8))*.95;
    if(t<4)for(let i=0;i<3;i++){const q=pts[Math.random()*SEG|0];emit(new THREE.Vector3(q.x+rnd(-1,1),-2.4,q.z+rnd(-1,1)),new THREE.Vector3(rnd(-.3,.3),rnd(.1,.4),rnd(-.3,.3)),'#3fae6a',rnd(.6,1.4),rnd(1.5,2.5),{drag:.99})}
    return t<T},dispose(){scene.remove(body,ground,key,rim,hemi,tongue,...eyes,...fangs);geo.dispose();renderer.toneMappingExposure=1;resetCam();}});
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
  const m=new THREE.MeshStandardMaterial({color:0x3a3a40,roughness:.85,emissive:0x080808,envMapIntensity:.25});
  m.onBeforeCompile=sh=>{sh.vertexShader='varying vec3 vBP;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBP=position;');
    sh.fragmentShader='varying vec3 vBP;\n'+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float head=smoothstep(28.0,40.0,vBP.z);float stripe=smoothstep(4.0,2.0,abs(vBP.x))*head;float cheek=smoothstep(7.0,10.0,abs(vBP.x))*head;
      float belly=smoothstep(30.0,18.0,vBP.y)*(1.0-head);
      diffuseColor.rgb=mix(vec3(.26,.26,.29),vec3(.07,.07,.08),belly);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.06,.06,.07),head);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.95,.94,.9),max(stripe,cheek));`).replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
      float fr=pow(1.0-abs(dot(normalize(vViewPosition),normal)),2.0);totalEmissiveRadiance+=vec3(1.0,.8,.3)*fr*1.2;`)};
  return m;
}
function badgerFinale(){
  setMode('finale');bgFor('rgba(255,210,90,.7)');const I=instance('Fox',badgerMat(),6.4);const run=I.play('Run',1.15);scene.add(I.pivot);
  I.root.traverse(b=>{if(b.isBone){if(/Tail/.test(b.name))b.scale.setScalar(b.name.includes('01')?.45:.6);if(/Spine/.test(b.name))b.scale.set(1.35,1,1.25);if(/Leg01|UpperArm/.test(b.name))b.scale.setScalar(.72)}});
  const lamp=new THREE.PointLight(0xffd36a,30,30);lamp.position.set(0,6,6);scene.add(lamp);const v=new THREE.Vector3();let t=0,switched=false;const T=7;
  return addEffect({update(dt){t+=dt;I.mixer.update(dt);
    I.root.traverse(b=>{if(b.isBone&&/Tail/.test(b.name))b.scale.setScalar(.5)});
    const a=easeO(clamp(t/3,0,1));I.pivot.position.set(-12*(1-a),-2.2,-18*(1-a)+.5);I.pivot.rotation.y=.6*(1-a)+.25;
    if(t>3.1&&!switched){switched=true;const s=I.play('Survey',1);run.crossFadeTo(s,.4,false)}
    if(t<3)for(let i=0;i<6;i++){emit(new THREE.Vector3(I.pivot.position.x+rnd(-1,1),-.7,I.pivot.position.z+rnd(-1,1)),new THREE.Vector3(rnd(-1,1),rnd(.5,1.5),rnd(-1,1)),'#c9a35a',rnd(.2,.5),rnd(.5,1),{g:-2})}
    for(let i=0;i<4;i++){randomVertexWorld(I,v);emit(v,new THREE.Vector3(rnd(-.4,.4),rnd(0,.8),rnd(-.4,.4)),'#ffd36a',rnd(.12,.3),rnd(.6,1.2))}
    renderer.toneMappingExposure=t>T-.6?clamp((T-t)/.6,0,1):Math.min(1,t/.5);return t<T},dispose(){scene.remove(I.pivot,lamp,finaleBg);finaleBg=null;renderer.toneMappingExposure=1;resetCam()}});
}

/* ---------- публичное API ---------- */
// ---------- Золотой снитч ----------
function snitch(){
  const g=new THREE.Group();
  const gold=new THREE.MeshPhysicalMaterial({color:0xffc94a,metalness:1,roughness:.18,clearcoat:1,clearcoatRoughness:.05,emissive:0x4a2a00,envMapIntensity:1.6});
  const ball=new THREE.Mesh(new THREE.SphereGeometry(.42,48,32),gold);g.add(ball);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.42,.025,12,64),gold);ring.rotation.y=Math.PI/2;g.add(ring);
  const ring2=new THREE.Mesh(new THREE.TorusGeometry(.42,.02,12,64),gold);ring2.rotation.x=Math.PI/2;g.add(ring2);
  const ws=new THREE.Shape();ws.moveTo(0,0);ws.bezierCurveTo(.4,.5,1.4,.7,2.2,.5);ws.quadraticCurveTo(1.9,.3,2.1,.1);ws.quadraticCurveTo(1.7,.05,1.8,-.15);ws.quadraticCurveTo(1.3,-.1,1.3,-.3);ws.quadraticCurveTo(.7,-.15,0,0);
  const wg=new THREE.ShapeGeometry(ws,20);const wm=new THREE.MeshPhysicalMaterial({color:0xfff6dc,metalness:.3,roughness:.3,transmission:.4,transparent:true,opacity:.85,side:THREE.DoubleSide,emissive:0x3a3020,iridescence:.6});
  const wings=[1,-1].map(s=>{const p=new THREE.Group();const m=new THREE.Mesh(wg,wm);m.scale.set(.9,.9,.9);p.add(m);p.position.set(s*.38,.05,0);p.scale.x=s;g.add(p);return p});
  scene.add(g);const L=new THREE.PointLight(0xffd36a,8,8);scene.add(L);
  let t=0;const T=5.2;const v=new THREE.Vector3();
  // траектория: рывки с зависаниями
  const way=[];for(let i=0;i<7;i++)way.push(new THREE.Vector3(rnd(-7,7),rnd(-1.5,4),rnd(-4,4)));way[0].set(-14,rnd(0,3),0);way[6].set(14,rnd(0,3),-2);
  return addEffect({update(dt){t+=dt;const k=clamp(t/T,0,1)*6;const i=Math.min(5,Math.floor(k)),f=k-i;const e=f<.55?easeIO(f/.55):1;
    g.position.copy(way[i]).lerp(way[i+1],e);g.position.y+=Math.sin(t*9)*.08;
    const d=way[i+1].clone().sub(way[i]);g.rotation.y=Math.atan2(d.x,d.z)*.3;g.rotation.z=Math.sin(t*3)*.2;
    const fl=Math.sin(t*70)*.9;wings.forEach((w,j)=>{w.rotation.z=(j?-1:1)*(.35+fl*.6);w.rotation.y=(j?1:-1)*.2});
    L.position.copy(g.position);
    for(let n=0;n<4;n++){v.copy(g.position).add(new THREE.Vector3(rnd(-.2,.2),rnd(-.2,.2),rnd(-.2,.2)));emit(v,new THREE.Vector3(rnd(-.3,.3),rnd(-.3,.3),rnd(-.3,.3)),Math.random()<.5?'#fff2b0':'#ffc94a',rnd(.08,.2),rnd(.4,1))}
    return t<T},dispose(){scene.remove(g,L)}});
}
// ---------- Дементор (и Патронус, который его прогоняет) ----------
function dementor(){
  const g=new THREE.Group();const N=7;const strips=[];
  const cm=new THREE.MeshStandardMaterial({color:0x050608,roughness:1,side:THREE.DoubleSide,transparent:true,opacity:.95,envMapIntensity:0});
  cm.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\nfloat fr=pow(1.0-abs(dot(normalize(vViewPosition),normal)),1.6);totalEmissiveRadiance+=vec3(.25,.32,.4)*fr*.6;')};
  for(let i=0;i<N;i++){const geo=new THREE.PlaneGeometry(1,1,6,24);const m=new THREE.Mesh(geo,cm);m.userData={a:i/N*TAU,base:geo.attributes.position.array.slice(),len:rnd(4.5,6.5),w:rnd(.9,1.4)};g.add(m);strips.push(m)}
  const hood=new THREE.Mesh(new THREE.SphereGeometry(.75,24,18,0,TAU,0,Math.PI*.62),cm);hood.position.y=.3;hood.scale.set(1,1.25,1.1);g.add(hood);
  const faceM=new THREE.MeshBasicMaterial({color:0x000000,transparent:true});const face=new THREE.Mesh(new THREE.CircleGeometry(.45,24),faceM);face.position.set(0,.05,.62);g.add(face);
  const handM=new THREE.MeshStandardMaterial({color:0x3a3f44,roughness:.9,transparent:true});const hands=[1,-1].map(s=>{const h=new THREE.Mesh(new THREE.CylinderGeometry(.02,.05,1.2,6),handM);h.position.set(s*.9,-.6,.4);h.rotation.z=s*.9;g.add(h);return h});
  scene.add(g);const fog=document.createElement('div');fog.className='frost';document.body.appendChild(fog);
  let t=0;const T=6.4,v=new THREE.Vector3();let pat=null,dissolve=0;
  return addEffect({update(dt){t+=dt;
    const k=clamp(t/3.4,0,1);g.position.set(-10+easeO(k)*9,1.4+Math.sin(t*1.3)*.35,-2);g.rotation.y=.5+Math.sin(t*.7)*.2;
    for(const m of strips){const u=m.userData,p=m.geometry.attributes.position.array;for(let i=0;i<p.length;i+=3){const bx=u.base[i],by=u.base[i+1];const yy=(by-.5)*u.len;const sway=Math.sin(t*3+yy*1.3+u.a*2)*.35*(.5-by)+Math.sin(t*7+yy*3)*.06;const r=.55+(.5-by)*.9;
      p[i]=Math.cos(u.a)*r+bx*u.w*Math.cos(u.a+1.57)+sway;p[i+1]=yy+.3+(bx*bx)*.4;p[i+2]=Math.sin(u.a)*r+bx*u.w*Math.sin(u.a+1.57)+Math.cos(t*2.5+yy)*.25*(.5-by)}
      m.geometry.attributes.position.needsUpdate=true;m.geometry.computeVertexNormals()}
    hands.forEach((h,j)=>h.rotation.x=Math.sin(t*2+j)*.3);
    fog.style.opacity=String(Math.min(.85,t/1.5)*(1-dissolve));
    if(t<3.6)for(let i=0;i<3;i++)emit(new THREE.Vector3(g.position.x+rnd(-1.5,1.5),g.position.y-rnd(1,3),g.position.z+rnd(-1,1)),new THREE.Vector3(rnd(-.3,.3),-rnd(.1,.5),rnd(-.3,.3)),'#9fb8c8',rnd(.3,.7),rnd(1,2));
    if(t>2.6&&!pat){pat=creature('horse',{x:innerWidth*.92,y:innerHeight*.72},{dirOverride:-1,len:9,speedT:3.6});if(typeof FX2!=='undefined')FX2.showName('Экспекто патронум!')}
    if(t>3.7){dissolve=clamp((t-3.7)/1.2,0,1);cm.opacity=.95*(1-dissolve);faceM.opacity=handM.opacity=1-dissolve;g.scale.setScalar(1+dissolve*.4);
      for(let i=0;i<14*(1-dissolve);i++){v.copy(g.position).add(new THREE.Vector3(rnd(-1.5,1.5),rnd(-3,1),rnd(-1,1)));emit(v,new THREE.Vector3(rnd(-3,-.5),rnd(-.5,1.5),rnd(-1,1)),'#cfefff',rnd(.15,.4),rnd(.5,1.2))}}
    return t<T},dispose(){scene.remove(g);fog.remove()}});
}
// ---------- Заклинания ----------
const SPELLS={
  avada:{n:'Авада Кедавра!',col:'#3dff6a',core:'#d8ffd8',flash:'rgba(40,255,90,.55)'},
  expelliarmus:{n:'Экспеллиармус!',col:'#ff3a3a',core:'#ffe0d0',flash:'rgba(255,60,40,.35)'},
  stupefy:{n:'Остолбеней!',col:'#ff6a2a',core:'#fff0c0',flash:'rgba(255,120,40,.3)'},
  protego:{n:'Протего!',col:'#7cc8ff',core:'#ffffff',flash:'rgba(120,200,255,.3)',shield:true},
};
function spell(key){
  const S=SPELLS[key];const dir=Math.random()<.5?1:-1;
  const from=screenToWorld(dir>0?innerWidth*.06:innerWidth*.94,innerHeight*.9,0),to=screenToWorld(dir>0?innerWidth*.8:innerWidth*.2,innerHeight*rnd(.25,.45),-3);
  if(typeof FX2!=='undefined'){FX2.showName(S.n);FX2.wandCast(dir>0?innerWidth*.08:innerWidth*.92,innerHeight*.96,dir>0,()=>{})}
  const core=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,1,12,1,true),new THREE.MeshBasicMaterial({color:S.core,transparent:true}));
  const glow=new THREE.Mesh(new THREE.CylinderGeometry(.35,.35,1,16,1,true),new THREE.MeshBasicMaterial({color:S.col,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false}));
  const bolt=new THREE.Group();bolt.add(core,glow);scene.add(bolt);let shield=null;
  if(S.shield){shield=new THREE.Mesh(new THREE.SphereGeometry(2.6,48,32,0,TAU,0,Math.PI/2),ghostMat('#7cc8ff',{rim:'#ffffff',core:.05,pow:1.2}));shield.rotation.x=-Math.PI/2*dir;shield.rotation.z=Math.PI/2;shield.position.copy(to);shield.scale.setScalar(.01);scene.add(shield)}
  const flash=document.createElement('div');flash.className='spellflash';flash.style.background=`radial-gradient(circle at ${dir>0?80:20}% 35%,${S.flash},transparent 60%)`;document.body.appendChild(flash);
  let t=0;const T=2.6,v=new THREE.Vector3(),UP=new THREE.Vector3(0,1,0);let hit=false;
  return addEffect({update(dt){t+=dt;const k=clamp((t-.45)/.5,0,1);
    const head=from.clone().lerp(to,easeIO(k)),tail=from.clone().lerp(to,easeIO(clamp((t-.75)/.6,0,1)));
    const len=head.distanceTo(tail);bolt.visible=len>.05&&t<1.4;if(bolt.visible){bolt.position.copy(head).lerp(tail,.5);bolt.quaternion.setFromUnitVectors(UP,head.clone().sub(tail).normalize());bolt.scale.set(1+Math.sin(t*60)*.15,len,1+Math.sin(t*50)*.15)}
    if(k>0&&k<1)for(let i=0;i<10;i++){v.copy(tail).lerp(head,Math.random());emit(v,new THREE.Vector3(rnd(-.5,.5),rnd(-.5,.5),rnd(-.5,.5)),Math.random()<.4?S.core:S.col,rnd(.15,.4),rnd(.3,.8))}
    if(k>=1&&!hit){hit=true;flash.classList.add('on');for(let i=0;i<260;i++){const d=new THREE.Vector3(rnd(-1,1),rnd(-1,1),rnd(-1,1)).normalize().multiplyScalar(rnd(2,9));emit(to,d,Math.random()<.3?S.core:S.col,rnd(.2,.6),rnd(.6,1.4),{drag:.94})}}
    if(shield){const s=easeO(clamp((t-.75)/.4,0,1))*(t>2?clamp((T-t)/.6,0,1):1);shield.scale.setScalar(Math.max(.01,s));shield.material.opacity=.7*s;shield.material.userData.u.uT.value=t}
    return t<T},dispose(){scene.remove(bolt);if(shield)scene.remove(shield);flash.remove()}});
}

// ---------- Русалка (в стиле Патронуса) ----------
function mermaid(){
  const L=3.6,SEG=140,RAD=28;const mat=ghostMat('#8ff3ff',{rim:'#f2ffff',core:.3,pow:1.6});mat.side=THREE.DoubleSide;
  const geo=new THREE.BufferGeometry();const pos=new Float32Array((SEG+1)*(RAD+1)*3),idx=[];
  for(let i=0;i<SEG;i++)for(let j=0;j<RAD;j++){const a=i*(RAD+1)+j,b=a+RAD+1;idx.push(a,a+1,b,b,a+1,b+1)}
  geo.setIndex(idx);geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const body=new THREE.Mesh(geo,mat);body.frustumCulled=false;
  const g=new THREE.Group();g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),mat);head.scale.set(.15,.17,.13);g.add(head);
  // профиль: ширина (z) и высота (y) по длине тела, u=0 — шея, u=1 — кончик хвоста
  const prof=u=>{const sm=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
    let w=.06+.16*sm(0,.06,u)-.07*sm(.1,.22,u)+.07*sm(.22,.32,u)-.05*sm(.34,.6,u)-.1*sm(.6,.97,u);
    let h=.05+.17*sm(0,.07,u)-.06*sm(.13,.23,u)+.06*sm(.23,.33,u)-.07*sm(.34,.62,u)-.11*sm(.62,.97,u);
    return [Math.max(.012,w),Math.max(.012,h)]};
  // хвостовой плавник
  const fs=new THREE.Shape();fs.moveTo(0,0);fs.bezierCurveTo(.25,.12,.55,.42,.75,.6);fs.quadraticCurveTo(.5,.3,.62,0);fs.quadraticCurveTo(.5,-.3,.75,-.6);fs.bezierCurveTo(.55,-.42,.25,-.12,0,0);
  const fluke=new THREE.Mesh(new THREE.ShapeGeometry(fs,24),mat);fluke.rotation.x=Math.PI/2;const fg=new THREE.Group();fg.add(fluke);g.add(fg);
  // волосы
  const hair=[];for(let k=0;k<9;k++){const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(),new THREE.Vector3(-.3,0,0),new THREE.Vector3(-.6,0,0),new THREE.Vector3(-.9,0,0)]),20,.022,6,false),mat);m.userData.k=k;g.add(m);hair.push(m)}
  // руки
  const arms=[1,-1].map(s=>{const m=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(),new THREE.Vector3(.3,0,0),new THREE.Vector3(.6,0,0)]),16,.035,8,false),mat);m.userData.s=s;g.add(m);return m});
  scene.add(g);
  const spine=u=>new THREE.Vector3(-u*L,0,0);
  let t=0;const T=6.4,dir=Math.random()<.5?1:-1,y0=rnd(-.5,1.2);const UP=new THREE.Vector3(0,1,0),P=[],TN=[];const v=new THREE.Vector3();
  return addEffect({update(dt){t+=dt;mat.userData.u.uT.value=t;
    const w=t*5.2;
    // волна дельфиньего удара: амплитуда растёт к хвосту
    for(let i=0;i<=SEG;i++){const u=i/SEG;const p=P[i]||(P[i]=new THREE.Vector3());p.set(-u*L,Math.sin(u*5.2-w)*(.03+.42*u*u)+Math.sin(w*.5)*.05,0)}
    for(let i=0;i<=SEG;i++){const a=P[Math.max(0,i-1)],b=P[Math.min(SEG,i+1)];TN[i]=(TN[i]||new THREE.Vector3()).subVectors(a,b).normalize()}
    for(let i=0;i<=SEG;i++){const u=i/SEG,[wz,hy]=prof(u),p=P[i],q=TN[i];const n=new THREE.Vector3(-q.y,q.x,0);
      for(let j=0;j<=RAD;j++){const an=j/RAD*TAU;const o=(i*(RAD+1)+j)*3;const cy=Math.sin(an)*hy,cz=Math.cos(an)*wz;pos[o]=p.x+n.x*cy;pos[o+1]=p.y+n.y*cy;pos[o+2]=cz}}
    geo.attributes.position.needsUpdate=true;geo.computeVertexNormals();
    head.position.set(.16,P[0].y+.04,0);head.rotation.z=Math.sin(w-.3)*.1;
    const e=P[SEG],q=TN[SEG];fg.position.copy(e);fg.rotation.set(0,0,Math.atan2(-q.y,-q.x));fluke.scale.setScalar(1.05);
    hair.forEach(m=>{const k=m.userData.k;const pts=[];for(let s=0;s<6;s++){const d=s/5;pts.push(new THREE.Vector3(.2-d*1.7,P[0].y+.16+d*.1+Math.sin(w*.8-d*3+k)*.16*d,(k-4)*.025*(1+d*3)+Math.cos(w*.6-d*2+k)*.1*d))}
      m.geometry.dispose();m.geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),16,.02*(1-.3*(k%3)/3),6,false)});
    arms.forEach(m=>{const s=m.userData.s;const sh=P[Math.round(SEG*.1)];const sw=Math.sin(w*.5+s)*.25;const pts=[new THREE.Vector3(sh.x,sh.y+.1,s*.16),new THREE.Vector3(sh.x+.38,sh.y+.24+sw*.2,s*.2),new THREE.Vector3(sh.x+.8,sh.y+.18+sw*.35,s*.12),new THREE.Vector3(sh.x+1.05,sh.y+.1+sw*.4,s*.05)];
      m.geometry.dispose();m.geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),16,.04,8,false)});
    const k=clamp(t/T,0,1),x=(-18+36*easeIO(k))*dir;g.position.set(x,y0+Math.sin(t*1.3)*.5,-1);g.rotation.y=dir>0?0:Math.PI;g.rotation.z=Math.sin(t*1.3)*.08*dir;g.scale.setScalar(2.4);
    const fade=k<.08?k/.08:k>.88?(1-k)/.12:1;mat.opacity=.9*fade;
    for(let i=0;i<3;i++){v.set(x-dir*rnd(1,5),g.position.y+rnd(-.6,.4),-1+rnd(-.5,.5));emit(v,new THREE.Vector3(rnd(-.2,.2),rnd(.6,1.4),0),'#cffcff',rnd(.08,.22),rnd(1,2.2),{g:.3,drag:.99})}
    return t<T},dispose(){scene.remove(g)}});
}

// ---------- Карта Мародёров (модель Saandy, CC BY 4.0) в карточке вопроса ----------
let mapGltf=null,mapLoading=null;
function loadMap(){if(mapGltf)return Promise.resolve(mapGltf);if(!mapLoading)mapLoading=new Promise((res,rej)=>loader.load('models/MaraudersMap.glb?v=1',g=>{mapGltf=g;res(g)},undefined,rej));return mapLoading}
async function mapInto(el){
  const g=await loadMap();if(!el.isConnected)return;
  const cv=document.createElement('canvas');cv.className='mapcv';el.appendChild(cv);
  let r;try{r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true})}catch(e){cv.remove();return}
  r.setPixelRatio(Math.min(2,devicePixelRatio||1));r.setClearColor(0,0);r.toneMapping=THREE.ACESFilmicToneMapping;r.outputColorSpace=THREE.SRGBColorSpace;
  const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(30,1,.01,1000);
  sc.add(new THREE.HemisphereLight(0xfff3dc,0x8a6a48,1.6));sc.add(new THREE.AmbientLight(0xfff0d8,.9));const camL=new THREE.DirectionalLight(0xfff2dc,1.6);sc.add(camL);const key=new THREE.DirectionalLight(0xffe6b8,2.2);key.position.set(2,5,4);sc.add(key);const warm=new THREE.PointLight(0xffb060,0,0);sc.add(warm);
  try{const pm=new THREE.PMREMGenerator(r);sc.environment=pm.fromScene(new RoomEnvironment(),.04).texture}catch(e){}
  const root=SkeletonUtils.clone(g.scene);root.traverse(o=>{if(o.isMesh){o.frustumCulled=false;if(o.material){o.material.side=THREE.DoubleSide;o.material.envMapIntensity=.4}}});sc.add(root);
  const mixer=new THREE.AnimationMixer(root);const act=mixer.clipAction(g.animations[0]);act.setLoop(THREE.LoopOnce);act.clampWhenFinished=true;act.play();
  // кадр по раскрытой карте
  mixer.setTime(g.animations[0].duration-.01);root.updateMatrixWorld(true);const box=new THREE.Box3(),bv=new THREE.Vector3();
  root.traverse(o=>{if(o.isSkinnedMesh){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i+=7){bv.fromBufferAttribute(p,i);o.applyBoneTransform(i,bv);bv.applyMatrix4(o.matrixWorld);box.expandByPoint(bv)}}});
  if(box.isEmpty())box.setFromObject(root);
  mixer.setTime(0);root.updateMatrixWorld(true);const box0=new THREE.Box3();root.traverse(o=>{if(o.isSkinnedMesh){const p=o.geometry.attributes.position;for(let i=0;i<p.count;i+=7){bv.fromBufferAttribute(p,i);o.applyBoneTransform(i,bv);bv.applyMatrix4(o.matrixWorld);box0.expandByPoint(bv)}}});
  const c0=box0.getCenter(new THREE.Vector3()),s0=box0.getSize(new THREE.Vector3());const ctr=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());act.reset();act.play();mixer.setTime(0);
  const rad=Math.max(size.x,size.y,size.z)*.55;
  // искры-чернила
  const N=160,pg=new THREE.BufferGeometry(),pp=new Float32Array(N*3),pl=[];for(let i=0;i<N;i++)pl.push({life:0});pg.setAttribute('position',new THREE.BufferAttribute(pp,3));
  const pt=new THREE.Points(pg,new THREE.PointsMaterial({color:0xffd38a,size:rad*.025,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));sc.add(pt);
  const clk=new THREE.Clock();let t=0;
  const resize=()=>{const w=el.clientWidth||300,h=el.clientHeight||200;r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()};resize();
  const ro=new ResizeObserver(resize);ro.observe(el);
  const loop=()=>{if(!el.isConnected){ro.disconnect();r.dispose();return}
    const dt=Math.min(.05,clk.getDelta());t+=dt;mixer.update(dt*.85);
    const k=Math.min(1,t/5.5),e=1-Math.pow(1-k,3);
    const hf=Math.atan(Math.tan(cam.fov*Math.PI/360)*cam.aspect);const fit=Math.max(size.x*.5/Math.tan(hf),size.z*.5/Math.tan(cam.fov*Math.PI/360));
    const fit0=Math.max(s0.x*.5/Math.tan(hf),s0.z*.5/Math.tan(cam.fov*Math.PI/360))*2.2;const d=fit0+(fit*1.12-fit0)*e;const C=c0.clone().lerp(ctr,e);
    const az=-.35+.35*e+Math.sin(t*.4)*.05*e,el_=1.35-.25*e;
    cam.position.set(C.x+Math.sin(az)*Math.cos(el_)*d,C.y+Math.sin(el_)*d,C.z+Math.cos(az)*Math.cos(el_)*d);cam.lookAt(C);camL.position.copy(cam.position);
    warm.intensity=k<1?0:0;
    for(let i=0;i<N;i++){const p=pl[i];if(p.life<=0&&Math.random()<.05*e){p.life=1+Math.random();p.x=ctr.x+(Math.random()-.5)*size.x*.9;p.z=ctr.z+(Math.random()-.5)*size.z*.9;p.y=box.max.y*.6}
      if(p.life>0){p.life-=dt;p.y+=dt*rad*.06}pp[i*3]=p.life>0?p.x:1e6;pp[i*3+1]=p.y||0;pp[i*3+2]=p.z||0}
    pg.attributes.position.needsUpdate=true;
    r.render(sc,cam);requestAnimationFrame(loop)};
  el.classList.add('live');loop();
}

// ===== Модели из Sketchfab (авторы — в подписи на главном экране) =====
const MODEL_CACHE={};
function getModel(name){if(!MODEL_CACHE[name])MODEL_CACHE[name]=new Promise((res,rej)=>loader.load('models/'+name+'.glb?v=20',res,undefined,rej));return MODEL_CACHE[name]}
function skinBox(root){root.updateMatrixWorld(true);const b=new THREE.Box3(),v=new THREE.Vector3();
  root.traverse(o=>{if(o.isSkinnedMesh){const p=o.geometry.attributes.position,st=Math.max(1,Math.floor(p.count/2500));for(let i=0;i<p.count;i+=st){v.fromBufferAttribute(p,i);o.applyBoneTransform(i,v);v.applyMatrix4(o.matrixWorld);b.expandByPoint(v)}}else if(o.isMesh)b.expandByObject(o)});return b}
async function prep(name,len,opt={}){
  const g=await getModel(name);const root=SkeletonUtils.clone(g.scene);
  root.traverse(o=>{if(o.isMesh){o.frustumCulled=false;if(opt.mat)o.material=opt.mat;else if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{m.transparent=true;m.depthWrite=true})}}});
  const mixer=new THREE.AnimationMixer(root);let clips=g.animations;
  if(opt.sub||opt.strip)clips=clips.map(c0=>{let c=c0.clone();if(opt.strip)c.tracks=c.tracks.filter(tr=>!(tr.name.includes(opt.strip)&&tr.name.endsWith('.position')));if(opt.sub)c=THREE.AnimationUtils.subclip(c,c.name,opt.sub[0],opt.sub[1],30);return c});
  const ci=opt.clip==null?0:(typeof opt.clip==='number'?opt.clip:clips.findIndex(c=>c.name.includes(opt.clip)));
  const act=clips[ci]?mixer.clipAction(clips[ci]):null;if(act){act.timeScale=opt.ts||1;act.play()}mixer.update(.001);
  const b=skinBox(root),sz=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());const s=len/Math.max(opt.byHeight?sz.y:Math.max(sz.x,sz.z),1e-6);
  root.scale.multiplyScalar(s);root.position.set(-c.x*s,-b.min.y*s,-c.z*s);
  const pivot=new THREE.Group();pivot.add(root);scene.add(pivot);
  const mats=[];root.traverse(o=>{if(o.isMesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(!mats.includes(m))mats.push(m)})});
  return {pivot,root,mixer,clips,act,mats,size:sz.multiplyScalar(s),
    fade(a){for(const m of mats){m.opacity=a;m.transparent=a<.999||!!m.userData.u}},
    play(nm,ts=1,fadeT=.4){const c2=clips.find(c=>c.name.includes(nm));if(!c2)return;const a2=mixer.clipAction(c2);a2.timeScale=ts;a2.reset().play();if(this.act&&this.act!==a2)this.act.crossFadeTo(a2,fadeT,false);this.act=a2},
    sample(out){const ms=[];root.traverse(o=>{if(o.isSkinnedMesh)ms.push(o)});const o=ms[Math.random()*ms.length|0];if(!o)return pivot.getWorldPosition(out);const p=o.geometry.attributes.position,i=Math.random()*p.count|0;out.fromBufferAttribute(p,i);o.applyBoneTransform(i,out);return out.applyMatrix4(o.matrixWorld)},
    dispose(){scene.remove(pivot)}};
}
const V3=()=>new THREE.Vector3();
// ---- пролёт существа через экран ----
function flyAcross(name,o){
  let I=null,t=0;const T=o.T||6,dir=Math.random()<.5?1:-1,y0=o.y??1.2;const v=V3();setMode('screen',o.glow||'rgba(0,0,0,0)');
  prep(name,o.len,{clip:o.clip,ts:o.ts,mat:o.mat,sub:o.sub,strip:o.strip}).then(x=>{I=x}).catch(e=>console.warn(name,e));
  return addEffect({update(dt){if(!I)return t<15;t+=dt;I.mixer.update(dt);
    const k=clamp(t/T,0,1),e=k;const x=-dir*(o.from||17)+dir*(o.from||17)*2*e;
    I.pivot.position.set(x,y0+Math.sin(t*(o.bobF||1.6))*(o.bob??.5),o.z??-2);I.pivot.rotation.set(o.pitch||0,dir>0?Math.PI/2:-Math.PI/2,Math.sin(t*1.6)*(o.roll??.06)*dir);
    I.fade(Math.min(1,k/.06,(1-k)/.08)*(o.op||1));if(o.mat&&o.mat.userData.u)o.mat.userData.u.uT.value=t;
    if(o.trail)for(let i=0;i<o.trail;i++){I.sample(v);o.fire?emit(v,new THREE.Vector3(-dir*rnd(.5,2),rnd(.4,2.2),rnd(-.5,.5)),Math.random()<.4?'#fff1b0':'#ff8a2a',rnd(.25,.6),rnd(.5,1.2),{c2:'#ff2a0a',g:.6}):emit(v,new THREE.Vector3(-dir*rnd(.2,1),rnd(-.2,.4),rnd(-.3,.3)),o.spark||'#cfefff',rnd(.1,.25),rnd(.5,1.2))}
    return t<T},dispose(){I&&I.dispose()}});
}
// ---- стая корнуэльских пикси ----
function pixies(){
  setMode('screen','rgba(80,160,255,.6)');const N=innerWidth<700?5:8,P=[];let t=0;const T=6.5,v=V3();
  for(let i=0;i<N;i++)prep('Pixie',rnd(1.9,2.6),{byHeight:true,clip:i%3?'anim051':'anim040',ts:rnd(1.2,1.8)}).then(x=>{x.o={ph:rnd(0,TAU),y:rnd(-1.5,3.5),z:rnd(-4,3),sp:rnd(.8,1.3),d:rnd(0,.9)};P.push(x)});
  try{if(window.__hpqSound!==false&&typeof FX2!=='undefined'){}}catch(e){}
  return addEffect({update(dt){t+=dt;for(const I of P){const o=I.o;I.mixer.update(dt);const u=clamp((t-o.d)/(T-1.2),0,1);
      const x=-15+30*u+Math.sin(t*2.3*o.sp+o.ph)*2.2,y=o.y+Math.sin(t*3.1*o.sp+o.ph)*1.2,z=o.z+Math.cos(t*1.7+o.ph)*1.5;
      I.pivot.position.set(x,y,z);I.pivot.rotation.set(Math.sin(t*4+o.ph)*.25,Math.PI/2+Math.sin(t*2+o.ph)*.9,Math.sin(t*3+o.ph)*.3);I.fade(Math.min(1,u/.05,(1-u)/.08,1));
      if(Math.random()<.5){I.sample(v);emit(v,new THREE.Vector3(rnd(-.5,.5),rnd(-.3,.5),rnd(-.5,.5)),'#9fd4ff',rnd(.08,.18),rnd(.4,.8))}}
    return t<T},dispose(){P.forEach(I=>I.dispose())}});
}
// ---- снитч (модель) ----
function snitchModel(){
  let I=null,t=0;const T=5.4,v=V3();setMode('screen','rgba(255,210,90,.7)');
  const way=[];for(let i=0;i<7;i++)way.push(new THREE.Vector3(rnd(-7,7),rnd(-1.5,4),rnd(-4,4)));way[0].set(-15,rnd(0,3),0);way[6].set(15,rnd(0,3),-2);
  prep('Snitch',3.6,{ts:1}).then(x=>{I=x}).catch(e=>console.warn(e));
  return addEffect({update(dt){if(!I)return t<15;t+=dt;I.mixer.update(dt);const k=clamp(t/T,0,1)*6;const i=Math.min(5,Math.floor(k)),f=k-i;const e=f<.55?easeIO(f/.55):1;
    I.pivot.position.copy(way[i]).lerp(way[i+1],e);I.pivot.position.y+=Math.sin(t*9)*.06;const d=way[i+1].clone().sub(way[i]);I.pivot.rotation.set(0,Math.atan2(d.x,d.z)*.25,Math.sin(t*3)*.15);
    I.fade(Math.min(1,t/.3,(T-t)/.3));for(let n=0;n<3;n++){v.copy(I.pivot.position).add(new THREE.Vector3(rnd(-.15,.15),.35+rnd(-.1,.1),rnd(-.15,.15)));emit(v,new THREE.Vector3(rnd(-.3,.3),rnd(-.3,.3),rnd(-.3,.3)),Math.random()<.5?'#fff2b0':'#ffc94a',rnd(.06,.16),rnd(.3,.8))}
    return t<T},dispose(){I&&I.dispose()}});
}
// ---- финалы факультетов на моделях ----
function finaleBase(glow,T,setup,step){setMode('finale',glow);let I=null,t=0,dead=false;const ext={};
  setup(ext).then(x=>{I=x}).catch(e=>{console.warn(e);dead=true});
  return addEffect({update(dt){if(dead)return false;if(!I)return t<12;t+=dt;I.mixer.update(dt);step(I,t,dt,ext);renderer.toneMappingExposure=Math.min(1,t/.6,(T-t)/.7)*1.05;return t<T},
    dispose(){I&&I.dispose();(ext.extra||[]).forEach(o=>scene.remove(o));renderer.toneMappingExposure=1;resetCam()}});
}
function lionFinale(){const v=V3();
  return finaleBase('rgba(255,170,60,.85)',7.2,async ext=>{const L=new THREE.PointLight(0xff9a3a,80,40),D=new THREE.DirectionalLight(0xfff0d0,2.4),H=new THREE.HemisphereLight(0xffe0b0,0x301008,1.1);D.position.set(-4,8,6);scene.add(L,D,H);ext.L=L;ext.extra=[L,D,H];
      return prep('Lion',7,{clip:0,ts:1.05,mat:new THREE.MeshStandardMaterial({color:0xe0a848,metalness:.65,roughness:.32,emissive:0x6a2600,emissiveIntensity:.8,transparent:true})})},
    (I,t,dt,ext)=>{camera.position.set(0,1.6,12);camera.fov=42;camera.updateProjectionMatrix();camera.lookAt(0,1.6,0);
      const a=clamp(t/6.6,0,1);const P0=new THREE.Vector3(-22,-2,-30),P1=new THREE.Vector3(14,-2,4);const y=Math.max(0,Math.sin(clamp((t-3.2)/1,0,1)*Math.PI))*2.6;
      I.pivot.position.copy(P0).lerp(P1,a);I.pivot.position.y+=y;I.pivot.rotation.set(-Math.sin(clamp((t-3.2)/1,0,1)*Math.PI)*.25,Math.atan2(P1.x-P0.x,P1.z-P0.z),0);
      ext.L.position.copy(I.pivot.position).add(new THREE.Vector3(0,3,3));
      for(let i=0;i<10;i++){I.sample(v);emit(v,new THREE.Vector3(rnd(-1,1),rnd(.5,2.5),rnd(-2,-.5)),Math.random()<.35?'#fff1b0':'#ff9a2a',rnd(.2,.5),rnd(.5,1.2),{c2:'#ff2a0a',g:.8})}
      if(t>3.6&&t<3.72)for(let i=0;i<300;i++){const d=new THREE.Vector3(rnd(-1,1),rnd(-1,1),rnd(-1,1)).normalize().multiplyScalar(rnd(4,12));emit(I.pivot.position.clone().add(new THREE.Vector3(0,2,0)),d,Math.random()<.5?'#ffd27a':'#ff6a1a',rnd(.3,.8),rnd(1,2),{c2:'#ff1a00',drag:.95})}});
}
function snakeModelFinale(){const v=V3();
  return finaleBase('rgba(60,255,140,.35)',7.6,async ext=>{const L=new THREE.PointLight(0x7dffb0,40,30),D=new THREE.DirectionalLight(0xffffff,1.6);D.position.set(3,8,6);scene.add(L,D);ext.L=L;ext.extra=[L,D];return prep('Snake',11,{clip:0,ts:1.6})},
    (I,t,dt,ext)=>{camera.position.set(0,1.3,9);camera.fov=48;camera.updateProjectionMatrix();camera.lookAt(0,-.2,-4);
      const a=easeO(clamp(t/5.2,0,1));I.pivot.position.set(Math.sin(t*1.1)*1.4*(1-a),-1.6,-46+a*30);I.pivot.rotation.set(0,Math.sin(t*1.1)*.25*(1-a),0);
      ext.L.position.copy(I.pivot.position).add(new THREE.Vector3(0,2.5,4));
      if(t<5)for(let i=0;i<3;i++){I.sample(v);emit(new THREE.Vector3(v.x,-1.5,v.z),new THREE.Vector3(rnd(-.3,.3),rnd(.1,.5),rnd(-.3,.3)),'#3fae6a',rnd(.3,.7),rnd(1,2))}
});
}
function eagleModelFinale(){const v=V3();
  return finaleBase('rgba(140,190,255,.7)',7,async ext=>{const D=new THREE.DirectionalLight(0xfff0dc,2);D.position.set(2,8,8);scene.add(D);ext.extra=[D];return prep('Eagle',9,{clip:0,ts:1})},
    (I,t)=>{camera.position.set(0,1,12);camera.fov=42;camera.updateProjectionMatrix();camera.lookAt(0,1,0);
      const a=easeIO(clamp(t/4.5,0,1));I.pivot.position.set(16*(1-a),12*(1-a)-1,-50*(1-a)+1);I.pivot.rotation.set(.35*(1-a),.5*(1-a),.3*(1-a));
      if(t>4.5){I.pivot.position.z+=(t-4.5)*6;I.pivot.position.y+=(t-4.5)*2}
      for(let i=0;i<6;i++){I.sample(v);emit(v,new THREE.Vector3(rnd(-.6,.6),rnd(-.6,.6),rnd(-1.5,0)),Math.random()<.5?'#f3d9a4':'#9fc4ff',rnd(.12,.3),rnd(.5,1.2))}});
}
function badgerModelFinale(){const v=V3();let sw=false;
  return finaleBase('rgba(255,210,90,.5)',7.2,async ext=>{const D=new THREE.DirectionalLight(0xfff0dc,2.2);D.position.set(3,8,6);const L=new THREE.PointLight(0xffd36a,30,30);L.position.set(0,5,6);scene.add(D,L);ext.extra=[D,L];return prep('Badger',4.6,{clip:'Walk',ts:1.25})},
    (I,t)=>{camera.position.set(0,1.4,10);camera.fov=42;camera.updateProjectionMatrix();camera.lookAt(0,.6,0);
      const a=easeO(clamp(t/3.6,0,1));I.pivot.position.set(-8*(1-a)+.5,-1.8,-30*(1-a)-3);I.pivot.rotation.set(0,.5*(1-a)+.15,0);
      if(t>3.5&&!sw){sw=true;I.play('Idle',1,.6)}
      if(t<3.4)for(let i=0;i<4;i++)emit(new THREE.Vector3(I.pivot.position.x+rnd(-1,1),-1.7,I.pivot.position.z+rnd(-1,1)),new THREE.Vector3(rnd(-1,1),rnd(.5,1.4),rnd(-1,1)),'#c9a35a',rnd(.2,.5),rnd(.5,1),{g:-2});
      if(Math.random()<.4){I.sample(v);emit(v,new THREE.Vector3(rnd(-.4,.4),rnd(0,.8),rnd(-.4,.4)),'#ffd36a',rnd(.1,.25),rnd(.6,1.2))}});
}
// ---- Кубок-трофей в лобби ----
// ---- мини-сцена с моделью внутри элемента (кубок в лобби, дракон у вопроса) ----
async function miniStage(el,name,o={}){
  const g=await getModel(name);if(!el.isConnected)return;const cv=document.createElement('canvas');cv.className='mapcv';el.appendChild(cv);
  let r;try{r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true})}catch(e){cv.remove();return}
  r.setPixelRatio(Math.min(2,devicePixelRatio||1));r.setClearColor(0,0);r.toneMapping=THREE.ACESFilmicToneMapping;r.outputColorSpace=THREE.SRGBColorSpace;
  const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(30,1,.01,1000);try{sc.environment=new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(),.04).texture}catch(e){}
  sc.add(new THREE.HemisphereLight(0xdfe8ff,0x302040,o.hemi??1.2));const k=new THREE.DirectionalLight(0xffffff,o.key??2.2);k.position.set(2,4,3);sc.add(k);
  const rim=new THREE.DirectionalLight(o.rimCol??0x88c8ff,o.rim??1.5);rim.position.set(-3,2,-4);sc.add(rim);
  const root=SkeletonUtils.clone(g.scene);root.traverse(x=>{if(x.isMesh)x.frustumCulled=false});
  const mixer=new THREE.AnimationMixer(root);const clip=typeof o.clip==='string'?g.animations.find(c=>c.name.includes(o.clip)):g.animations[o.clip||0];if(clip&&clip.duration>.05){const a=mixer.clipAction(clip);a.timeScale=o.ts||1;a.play()}mixer.update(.001);
  // нормализуем размер: высота/габарит = 1, центр в нуле
  const b=skinBox(root),sz=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3());const s=1/Math.max(sz.x,sz.y,sz.z);
  root.scale.setScalar(s);root.position.set(-c.x*s,-c.y*s,-c.z*s);const W=sz.x*s,H=sz.y*s,D=sz.z*s;
  const pivot=new THREE.Group();pivot.add(root);sc.add(pivot);
  const R=Math.hypot(W,H,D)/2;
  let extra=null;if(o.sparks){const N=120,pg=new THREE.BufferGeometry(),pp=new Float32Array(N*3),pd=[];for(let i=0;i<N;i++)pd.push({l:0});pg.setAttribute('position',new THREE.BufferAttribute(pp,3));
    sc.add(new THREE.Points(pg,new THREE.PointsMaterial({color:0x8fd0ff,size:H*.03,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false})));const bl=new THREE.PointLight(0x6fb8ff,2,H*1.5);bl.position.set(0,H*.3,0);sc.add(bl);
    extra=(dt,t)=>{bl.intensity=2+Math.sin(t*9)*.6;for(let i=0;i<N;i++){const p=pd[i];if(p.l<=0&&Math.random()<.12){p.l=.5+Math.random()*.6;p.x=(Math.random()-.5)*W*.45;p.z=(Math.random()-.5)*D*.45;p.y=H*.36}
      if(p.l>0){p.l-=dt;p.y+=dt*H*.4;p.x*=.98;p.z*=.98}pp[i*3]=p.l>0?p.x:1e6;pp[i*3+1]=p.y||0;pp[i*3+2]=p.z||0}pg.attributes.position.needsUpdate=true}}
  const resize=()=>{const w=el.clientWidth||200,h=el.clientHeight||200;r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();
    const fitH=(o.fitH??H*.5)/Math.tan(cam.fov*Math.PI/360),fitW=(o.fitW??R)/(Math.tan(cam.fov*Math.PI/360)*cam.aspect);const d=Math.max(fitH,fitW)+R*.5;
    cam.position.set(0,d*(o.camUp??0),d);cam.lookAt(0,0,0)};resize();const ro=new ResizeObserver(resize);ro.observe(el);
  const clk=new THREE.Clock();let t=0;
  const loop=()=>{if(!el.isConnected){ro.disconnect();r.dispose();return}const dt=Math.min(.05,clk.getDelta());t+=dt;mixer.update(dt);
    pivot.rotation.y=o.spin?t*o.spin:(o.yaw??0)+Math.sin(t*.35)*(o.sway??.5);pivot.position.y=Math.sin(t*1.2)*H*(o.bob??.02);
    if(o.hop){const ph=(t%2.2)/2.2;if(ph>.62){const k=(ph-.62)/.38;pivot.position.y+=Math.sin(k*Math.PI)*H*.55;pivot.rotation.z=Math.sin(k*Math.PI*6)*.12*(1-k);pivot.rotation.x=-Math.sin(k*Math.PI)*.25;pivot.scale.setScalar(1)}else{pivot.rotation.z=Math.sin(t*40)*.015;pivot.rotation.x=0;const sq=ph<.5?0:Math.sin((ph-.5)/.12*Math.PI)*.08;pivot.scale.set(1+sq,1-sq,1+sq)}}extra&&extra(dt,t);
    if(o.fadeIn)cv.style.opacity=Math.min(1,t/o.fadeIn);r.render(sc,cam);requestAnimationFrame(loop)};
  el.classList.add('live');loop();
}
function trophyInto(el){return miniStage(el,'Cup',{spin:.5,sparks:true,fitH:.56,bob:.015})}
const STAGE={
  Dragon:{yaw:-.7,sway:.45,ts:.8,fitH:.36,fitW:.4,camUp:.15,rim:2.2,rimCol:0xff9a5a,bob:.03,fadeIn:.8},
  IceDragon:{yaw:-.7,sway:.45,ts:.8,fitH:.36,fitW:.4,camUp:.15,rim:2.2,rimCol:0x9fd0ff,bob:.03,fadeIn:.8},
  Prowler:{clip:'Walk',ts:.7,yaw:-.9,sway:.5,fitH:.33,fitW:.38,camUp:.25,rim:2.2,rimCol:0xff9a5a,bob:0,fadeIn:.8},
  Train:{yaw:-1.05,sway:.3,fitH:.3,fitW:.36,camUp:.12,rim:1.6,rimCol:0xffd08a,bob:.004,fadeIn:.8},
  Quidditch:{clip:2,yaw:-1.3,sway:.45,fitH:.36,fitW:.36,camUp:.05,rim:2,rimCol:0xffd36a,bob:.05,fadeIn:.8},
  MonsterBook:{yaw:.35,sway:.35,fitH:.42,fitW:.42,camUp:.55,rim:1.8,rimCol:0xa0ff9a,bob:0,hop:true,fadeIn:.6}};
function dragonInto(el){const n=el.dataset.dragon||'Dragon';return miniStage(el,n,STAGE[n]||STAGE.Dragon)}
// ---- Хогвартс-экспресс проезжает ----
function trainPass(){let I=null,t=0;const T=8.5,dir=window.__trainDir||(Math.random()<.5?1:-1),v=V3();setMode('screen','rgba(255,200,120,.25)');
  const D=new THREE.DirectionalLight(0xfff0dc,2.2);D.position.set(3,6,8);const Hm=new THREE.HemisphereLight(0xcfd8ff,0x302030,1);scene.add(D,Hm);
  prep('Train',17,{clip:0,ts:2}).then(x=>{I=x}).catch(e=>console.warn(e));
  return addEffect({update(dt){if(!I)return t<15;t+=dt;I.mixer.update(dt);const k=t/T;const x=dir*(-26+52*k);
    I.pivot.position.set(x,-4.3+Math.sin(t*14)*.015,-2);I.pivot.rotation.set(0,dir>0?Math.PI/2:-Math.PI/2,0);I.fade(Math.min(1,k/.04,(1-k)/.04));
    // дым из трубы: передняя часть паровоза (локальная +z) сверху
    v.set(0,I.size.y*.98,I.size.z*.34*(I.front||1));v.applyAxisAngle(new THREE.Vector3(0,1,0),I.pivot.rotation.y).add(I.pivot.position);
    for(let i=0;i<3;i++)emit(v.clone().add(new THREE.Vector3(rnd(-.15,.15),0,rnd(-.15,.15))),new THREE.Vector3(-dir*rnd(1.5,3),rnd(1.5,3),rnd(-.4,.4)),Math.random()<.5?'#d9dde6':'#a9b0bd',rnd(1,2.2),rnd(1.4,2.4),{drag:.97,g:.4});
    if(Math.random()<.5)emit(new THREE.Vector3(x+rnd(-6,6),-4.3,-2+rnd(-.6,.6)),new THREE.Vector3(rnd(-.5,.5),rnd(.2,.6),0),'#ffb35a',rnd(.08,.16),rnd(.3,.6));
    return t<T},dispose(){I&&I.dispose();scene.remove(D,Hm)}});
}
// ---- Гарри на метле гонится за снитчем ----
function quidditchChase(){let H=null,S=null,t=0;const T=6.2,dir=Math.random()<.5?1:-1,v=V3();setMode('screen','rgba(255,210,90,.5)');
  const D=new THREE.DirectionalLight(0xfff0dc,2.2);D.position.set(2,6,8);const Hm=new THREE.HemisphereLight(0xdfe8ff,0x302040,1.1);scene.add(D,Hm);
  prep('Quidditch',5.6,{byHeight:false,clip:2,ts:1}).then(x=>{H=x}).catch(e=>console.warn(e));prep('Snitch',2.2,{}).then(x=>{S=x}).catch(e=>console.warn(e));
  const path=k=>new THREE.Vector3(dir*(-18+36*k),1.2+Math.sin(k*TAU*1.3)*2.2,-1+Math.sin(k*TAU*.7)*2);
  return addEffect({update(dt){if(!H||!S)return t<15;t+=dt;H.mixer.update(dt);S.mixer.update(dt);const k=t/T;
    const ps=path(Math.min(1.2,k+.16)),ph=path(k);S.pivot.position.copy(ps).add(new THREE.Vector3(0,Math.sin(t*9)*.15,0));
    H.pivot.position.copy(ph);const d=path(k+.01).sub(ph);H.pivot.rotation.set(0,Math.atan2(d.x,d.z)+(H.yawFix||0),-Math.atan2(d.y,Math.abs(d.x))*.6*dir);
    H.fade(Math.min(1,k/.05,(1-k)/.06));S.fade(Math.min(1,k/.05,(1-k)/.06));
    for(let i=0;i<2;i++){v.copy(S.pivot.position);emit(v,new THREE.Vector3(rnd(-.3,.3),rnd(-.3,.3),rnd(-.3,.3)),Math.random()<.5?'#fff2b0':'#ffc94a',rnd(.06,.16),rnd(.3,.7))}
    if(Math.random()<.6){H.sample(v);emit(v,new THREE.Vector3(-dir*rnd(.5,1.5),rnd(-.2,.3),rnd(-.3,.3)),'#ffcf7a',rnd(.08,.2),rnd(.4,.9))}
    return t<T},dispose(){H&&H.dispose();S&&S.dispose();scene.remove(D,Hm)}});
}
// ---- пауки перебегают ----
function spiders(){const P=[];let t=0;const T=5.5,dir=Math.random()<.5?1:-1;setMode('screen','rgba(0,0,0,0)');
  const D=new THREE.DirectionalLight(0xfff0dc,2);D.position.set(2,8,6);const Hm=new THREE.HemisphereLight(0xdfe8ff,0x302040,1.2);scene.add(D,Hm);
  const N=innerWidth<700?5:9;
  for(let i=0;i<N;i++)prep('Spider',i===0?6:rnd(2.8,4.2),{clip:'Run',ts:rnd(1.6,2.4)}).then(x=>{x.mats.forEach(m=>{if(m.color&&!m.userData.tint){m.userData.tint=1;m.color.multiplyScalar(.42)}});x.o={y:-3.25+rnd(-.2,.5),z:rnd(-3,4),d:rnd(0,1.6),sp:rnd(.85,1.25),w:rnd(0,TAU)};P.push(x)}).catch(e=>console.warn(e));
  return addEffect({update(dt){t+=dt;for(const I of P){const o=I.o;I.mixer.update(dt);const k=clamp((t-o.d)/(T-1.8)*o.sp,0,1);
      const x=dir*(-17+34*k),z=o.z+Math.sin(t*2+o.w)*.6;I.pivot.position.set(x,o.y,z);I.pivot.rotation.set(0,(dir>0?Math.PI/2:-Math.PI/2)+(I.yawFix||0)+Math.sin(t*3+o.w)*.15,0);I.fade(k>0&&k<1?1:0)}
    return t<T},dispose(){P.forEach(I=>I.dispose());scene.remove(D,Hm)}});
}

const API={ready:false,
  patronus(){if(!API.ready)return false;const keys=[...Object.keys(KINDS).filter(k=>k!=='phoenix'),...Object.keys(GHOSTS)].filter(k=>k!==lastKind);const k=keys[Math.random()*keys.length|0];lastKind=k;if(GHOSTS[k]){const G=GHOSTS[k];const dir=Math.random()<.5,wx=dir?innerWidth*.08:innerWidth*.92,wy=innerHeight*.96;
      if(typeof FX2!=='undefined'&&FX2.wandCast){FX2.showName('Экспекто патронум!');FX2.wandCast(wx,wy,dir,(tx,ty)=>{FX2.showName('Патронус: '+G.n);vortex(tx,ty,'#cfefff');flyAcross(G.model,{...G.o,mat:ghostMat(G.col||'#a8dcff',{rim:'#f4fbff',core:.5,pow:1.3}),trail:5,spark:'#cfefff',glow:'rgba(150,210,255,.95)',op:.9})})}else flyAcross(G.model,{...G.o,mat:ghostMat('#a8dcff',{rim:'#f4fbff',core:.5,pow:1.3}),trail:5});return true}
    const K=KINDS[k];
    const dir=Math.random()<.5,wx=dir?innerWidth*.08:innerWidth*.92,wy=innerHeight*.96;
    if(typeof FX2!=='undefined'&&FX2.wandCast){FX2.showName(K.fire?'Феникс':'Экспекто патронум!');FX2.wandCast(wx,wy,dir,(tx,ty)=>{FX2.showName(K.fire?'Феникс':'Патронус: '+K.n);vortex(tx,ty,K.fire?'#ffb040':'#cfefff');creature(k,{x:tx,y:ty})})}
    else creature(k,{x:wx,y:innerHeight*.6});
    return true},
  transition(){if(!API.ready)return false;const N=(s)=>{if(typeof FX2!=='undefined')FX2.showName(s)};const has2=typeof FX2!=='undefined';
    const pool=[['pixies',14],['phoenix',12],['chase',5],['snitch',8],['keys',has2?8:0],['spell',has2?16:0],['patronus',37]];
    let pick='patronus';for(let tries=0;tries<8;tries++){let r=Math.random()*pool.reduce((a,b)=>a+b[1],0);for(const [k,w] of pool){if((r-=w)<0){pick=k;break}}if(pick!==API.lastT)break}
    if(pick==='spell'){const ks=['avada','expelliarmus','incendio','leviosa'].filter(k=>k!==API.lastSpell);const s=ks[Math.random()*ks.length|0];API.lastSpell=s;if(API.lastT==='spell'&&API.lastSpell===s)pick='patronus';else{API.lastT='spell';FX2.castSpell(s);return true}}
    API.lastT=pick;
    if(pick==='pixies'){N('Корнуэльские пикси');pixies();return true}
    if(pick==='phoenix'){N('Феникс');flyAcross('Phoenix',{len:6,T:6.5,y:1.8,trail:10,fire:true,glow:'rgba(255,140,40,.8)'});return true}
    if(pick==='chase'){N('Квиддич');quidditchChase();return true}
    if(pick==='snitch'){N('Золотой снитч');snitchModel();return true}
    if(pick==='keys'){FX2.flyingKeys();return true}
    return API.patronus()},
  ghost(k){const G=GHOSTS[k];flyAcross(G.model,{...G.o,mat:ghostMat(G.col||'#a8dcff',{rim:'#f4fbff',core:.5,pow:1.3}),trail:5,spark:'#cfefff',glow:'rgba(150,210,255,.95)',op:.9})},
  pixies(){pixies()},train(){trainPass()},chase(){quidditchChase()},spiders(){spiders()},phoenix(){flyAcross('Phoenix',{len:6,T:6.5,y:1.8,trail:10,fire:true,glow:'rgba(255,140,40,.8)'})},iceDragon(){flyAcross('IceDragon',{len:15,T:7,y:0,z:-6,bob:.8,bobF:1,trail:3,spark:'#bfe6ff',glow:'rgba(150,200,255,.35)'})},dragon(){flyAcross('Dragon',{len:13,T:7,y:-.5,z:-6,bob:.6,glow:'rgba(0,0,0,0)'})},snitchM(){snitchModel()},
  trophyInto(el){trophyInto(el).catch(e=>console.warn('cup',e))},dragonInto(el){dragonInto(el).catch(e=>console.warn('dragon',e))},
  clear(){for(const e of effects)e.update=()=>false;for(const d of pData)d.life=0;document.querySelectorAll('.frost,.spellflash').forEach(x=>x.remove())},
  mapInto(el){mapInto(el).catch(e=>console.warn('map',e))},
  snitch(){if(API.ready)snitch()},mermaid(){if(API.ready)mermaid()},dementor(){if(API.ready)dementor()},spell(k){if(typeof FX2!=='undefined'&&FX2.castSpell)FX2.castSpell(k||'avada')},
  creature(k){if(!API.ready)return false;creature(k,{x:innerWidth*.1,y:innerHeight*.7});return true},
  house(h,onDone){if(!API.ready)return null;const f={gryffindor:lionFinale,slytherin:snakeModelFinale,ravenclaw:eagleModelFinale,hufflepuff:badgerModelFinale}[h];if(!f)return null;const e=f();const d=e.dispose;e.dispose=()=>{d&&d();onDone&&onDone()};return e},
  stop(e){if(e)e.update=()=>false},
};
window.FX3D=API;API._dbg=()=>({scene,camera,effects,renderer,canvas});
if(init()){setMode('screen');canvas.style.display='none';preload().then(()=>{API.ready=true;window.dispatchEvent(new Event('fx3d-ready'));setTimeout(()=>['Spider','Snitch','Pixie','Phoenix'].forEach(n=>getModel(n).catch(()=>{})),2500)}).catch(e=>console.warn('fx3d models',e))}
