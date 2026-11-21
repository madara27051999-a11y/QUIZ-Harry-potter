// Живые анимированные животные на canvas: бег, полёт, ползание. Своя графика.
const FX2=(()=>{
const TAU=Math.PI*2;
let cv=null,c=null,mc=null,sc=null,sx=null,W=0,H=0,DPR=1,items=[],parts=[],raf=0;
function ensure(){if(cv)return;cv=document.createElement('canvas');cv.className='fx2';document.body.appendChild(cv);mc=cv.getContext('2d');c=mc;sc=document.createElement('canvas');sx=sc.getContext('2d');resize();addEventListener('resize',resize)}
function resize(){if(!cv)return;DPR=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;sc.width=W*DPR;sc.height=H*DPR}
const ell=(x,y,rx,ry,r)=>{c.beginPath();c.ellipse(x,y,rx,ry,r||0,0,TAU);c.fill()};
const seg=(x1,y1,x2,y2,w)=>{c.lineWidth=w;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()};
const poly=(pts)=>{c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.fill()};
const curve=(pts,w)=>{c.lineWidth=w;c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length-1;i++){const mx=(pts[i][0]+pts[i+1][0])/2,my=(pts[i][1]+pts[i+1][1])/2;c.quadraticCurveTo(pts[i][0],pts[i][1],mx,my)}const l=pts[pts.length-1];c.lineTo(l[0],l[1]);c.stroke()};

/* ---------- четвероногие ---------- */
function leg(x,y,a1,a2,l1,l2,w1,w2,paw){
  const kx=x+Math.sin(a1)*l1,ky=y+Math.cos(a1)*l1,fx=kx+Math.sin(a2)*l2,fy=ky+Math.cos(a2)*l2;
  seg(x,y,kx,ky,w1);seg(kx,ky,fx,fy,w2);if(paw)ell(fx+paw*.4,fy,paw,paw*.6);
}
function quad(P){
  return (ph,st,col,far)=>{
    const a=ph*TAU,run=1-st;
    const bob=-Math.abs(Math.sin(a))*P.bob*run, pitch=Math.sin(a)*P.pitch*run;
    c.save();c.translate(0,bob);c.rotate(pitch);
    const L=(fl,side)=>{
      const front=fl==='f',p=P.ph[fl+side],aa=(ph+p)*TAU,hip=front?P.fh:P.hh,len=front?P.fl:P.hl;
      let a1,a2;
      if(front){a1=P.fa*Math.sin(aa)*run+.05;a2=a1-P.fk*Math.max(0,Math.cos(aa))*run}
      else{a1=(P.ha*Math.sin(aa)-.12)*run+st*.08;a2=a1+(-.35-P.hk*Math.max(0,Math.cos(aa)))*run+st*-.1+(P.hock||0)}
      leg(hip[0]+(side==='2'?-3:0),hip[1],a1,a2,len[0],len[1],len[2],len[3],P.paw);
    };
    c.fillStyle=c.strokeStyle=far;L('h','2');L('f','2');
    c.fillStyle=c.strokeStyle=col;
    P.tail&&P.tail(ph,st);
    for(const e of P.torso)ell(e[0],e[1],e[2],e[3],e[4]);
    c.save();c.translate(P.neck[0],P.neck[1]);c.rotate((P.nod||.05)*Math.sin(a*2)*run+(P.headUp||0)*st);P.head(ph,st,col,far);c.restore();
    L('h','1');L('f','1');
    c.restore();
  };
}
const PH_GALLOP={h1:0,h2:.07,f1:.5,f2:.57},PH_BOUND={h1:0,h2:.03,f1:.42,f2:.48};
const SPECIES={
stag:{name:'Олень',k:'quad',cycle:560,draw:quad({ph:PH_GALLOP,bob:7,pitch:.06,
  torso:[[0,0,58,22],[36,2,28,26,-.2],[-40,-2,28,25]],fh:[40,14],hh:[-44,10],fl:[34,44,11,6],hl:[38,46,14,6],fa:.6,fk:1.3,ha:.55,hk:.9,paw:4,
  neck:[48,-10],nod:.06,headUp:-.15,
  head:(ph,st,col)=>{seg(0,0,26,-44,20);c.save();c.translate(30,-50);c.rotate(.35);ell(6,0,17,10);ell(20,4,9,6);c.restore();
    poly([[18,-58],[10,-72],[24,-60]]);c.lineWidth=4;c.lineCap='round';
    curve([[26,-58],[20,-80],[8,-96],[-6,-104]],4);seg(17,-81,30,-92,3.5);seg(10,-93,14,-110,3.5);seg(1,-99,-2,-114,3);
    curve([[30,-58],[30,-82],[22,-100],[14,-112]],3.5);seg(29,-80,42,-88,3);},
  tail:(ph)=>{poly([[-64,-14],[-74,-26+Math.sin(ph*TAU)*3],[-60,-20]])}})},
horse:{name:'Лошадь',k:'quad',cycle:600,draw:quad({ph:PH_GALLOP,bob:8,pitch:.07,
  torso:[[0,0,64,25],[40,0,30,28,-.2],[-44,-2,32,28]],fh:[44,16],hh:[-48,12],fl:[36,46,13,7],hl:[40,48,16,7],fa:.65,fk:1.4,ha:.6,hk:1,paw:5,
  neck:[52,-10],nod:.08,headUp:-.1,
  head:(ph,st)=>{c.lineCap='round';seg(0,0,30,-42,26);c.save();c.translate(36,-44);c.rotate(.75);ell(10,0,22,11);ell(28,0,10,9);c.restore();poly([[26,-54],[24,-70],[34,-56]]);
    const w=Math.sin(ph*TAU)*4;for(let i=0;i<5;i++)curve([[4+i*6,-8-i*8],[-8+i*6+w,-6-i*8],[-18+i*5-w,-2-i*7]],4)},
  tail:(ph)=>{const w=Math.sin(ph*TAU*2);c.lineCap='round';for(let k=-1;k<=1;k++)curve([[-70,-14],[-90,-10+k*4+w*5],[-108,0+k*6-w*6],[-122,6+k*7+w*7]],6-Math.abs(k)*2)}})},
dog:{name:'Пёс',k:'quad',cycle:420,draw:quad({ph:PH_GALLOP,bob:6,pitch:.08,
  torso:[[0,0,46,18],[28,2,22,20],[-30,0,22,19]],fh:[32,10],hh:[-34,8],fl:[22,24,10,6],hl:[24,26,12,6],fa:.7,fk:1.3,ha:.6,hk:1,paw:5,
  neck:[38,-8],
  head:()=>{seg(0,0,12,-16,18);ell(20,-22,16,13);ell(36,-18,11,7);ell(46,-19,3.5,3.5);poly([[12,-30],[8,-48],[22,-34]]);poly([[22,-32],[26,-48],[30,-30]])},
  tail:(ph)=>{c.lineCap='round';curve([[-44,-10],[-56,-24],[-54,-40+Math.sin(ph*TAU*2)*4]],7)}})},
wolf:{name:'Волк',k:'quad',cycle:500,draw:quad({ph:PH_GALLOP,bob:6,pitch:.06,
  torso:[[0,0,56,20],[34,0,26,24,-.2],[-38,-2,24,21]],fh:[38,12],hh:[-42,8],fl:[30,34,11,6],hl:[32,36,13,6],fa:.65,fk:1.3,ha:.55,hk:1,paw:5,
  neck:[44,-8],
  head:()=>{seg(0,0,18,-16,22);ell(26,-20,17,13);poly([[34,-26],[66,-18],[64,-12],[34,-10]]);poly([[16,-30],[14,-50],[28,-32]]);poly([[26,-32],[32,-50],[36,-28]])},
  tail:(ph)=>{c.lineCap='round';const w=Math.sin(ph*TAU)*5;curve([[-52,-8],[-72,-4+w],[-92,2-w]],12);curve([[-80,0],[-96,4-w]],8)}})},
cat:{name:'Кошка',k:'quad',cycle:460,draw:quad({ph:PH_GALLOP,bob:6,pitch:.1,
  torso:[[0,0,48,16],[30,0,20,18],[-30,-1,22,18]],fh:[34,10],hh:[-34,8],fl:[22,26,9,5],hl:[24,28,11,5],fa:.75,fk:1.3,ha:.65,hk:1.1,paw:4,
  neck:[40,-6],
  head:()=>{seg(0,0,10,-12,16);ell(18,-16,14,12);ell(30,-12,7,5);poly([[8,-24],[8,-42],[20,-28]]);poly([[18,-28],[26,-42],[28,-24]])},
  tail:(ph)=>{c.lineCap='round';const w=Math.sin(ph*TAU)*8;curve([[-46,-8],[-66,-20],[-80,-40+w],[-76,-58-w]],6)}})},
hare:{name:'Заяц',k:'quad',cycle:520,draw:quad({ph:PH_BOUND,bob:14,pitch:.2,
  torso:[[0,0,40,18,-.1],[-24,-4,26,24],[24,4,16,16]],fh:[26,14],hh:[-28,8],fl:[18,20,8,5],hl:[28,34,13,6],fa:.9,fk:1,ha:.9,hk:1.4,paw:6,hock:-.3,
  neck:[32,-6],
  head:(ph)=>{ell(12,-8,15,12);ell(24,-4,7,6);const w=Math.sin(ph*TAU)*.15;c.save();c.translate(6,-16);c.rotate(-1.15+w);ell(0,-20,5,20);c.restore();c.save();c.translate(2,-16);c.rotate(-1.35+w);ell(0,-18,4.5,18);c.restore()},
  tail:()=>{ell(-48,-12,8,8)}})},
otter:{name:'Выдра',k:'quad',cycle:480,draw:quad({ph:PH_BOUND,bob:7,pitch:.12,
  torso:[[0,0,58,15],[34,2,20,15],[-30,0,24,17]],fh:[34,10],hh:[-34,10],fl:[12,10,9,6],hl:[14,12,11,7],fa:.9,fk:.8,ha:.9,hk:.8,paw:5,
  neck:[44,-2],
  head:()=>{ell(14,-4,16,12);ell(28,0,8,7);ell(6,-14,4,4)},
  tail:(ph)=>{c.lineCap='round';const w=Math.sin(ph*TAU)*6;curve([[-50,-2],[-74,2+w],[-100,6-w]],12);curve([[-90,4],[-110,8+w]],6)}})},
lion:{name:'Лев',k:'quad',cycle:600,draw:quad({ph:PH_GALLOP,bob:7,pitch:.06,
  torso:[[0,0,62,24],[36,2,30,28,-.2],[-42,-2,28,25]],fh:[40,16],hh:[-44,12],fl:[34,36,15,9],hl:[36,40,17,9],fa:.6,fk:1.3,ha:.55,hk:1,paw:7,
  neck:[50,-12],nod:.06,headUp:-.25,
  head:(ph,st,col,far)=>{c.save();c.fillStyle=far;for(let i=0;i<14;i++){const an=i/14*TAU;ell(14+Math.cos(an)*30,-12+Math.sin(an)*32,16,12,an)}c.restore();
    ell(14,-12,34,36);c.fillStyle=col;ell(30,-16,18,15);ell(46,-10,12,10);poly([[20,-30],[16,-44],[30,-34]]);
    c.save();c.fillStyle='rgba(20,10,0,.55)';ell(34,-22,2.6,2.6);ell(55,-12,3.5,3);if(st>.5){c.fillStyle='rgba(60,10,0,.6)';ell(46,0,7,4*Math.min(1,Math.max(0,Math.sin((performance.now()/1000-ROAR_T)*2))))}c.restore()},
  tail:(ph)=>{c.lineCap='round';const w=Math.sin(ph*TAU)*8;curve([[-66,-10],[-86,-14+w],[-104,-4-w],[-116,-14+w]],6);ell(-118,-15+w,8,6)}})},
badger:{name:'Барсук',k:'quad',cycle:380,draw:quad({ph:PH_GALLOP,bob:3,pitch:.03,
  torso:[[0,0,62,16],[-40,-2,38,18],[30,2,24,15]],fh:[38,8],hh:[-42,8],fl:[16,16,13,10],hl:[16,16,14,10],fa:.8,fk:.7,ha:.8,hk:.7,paw:7,
  neck:[50,4],nod:.04,
  head:(ph,st,col,far)=>{poly([[-8,-16],[22,-14],[46,-2],[62,4],[46,10],[20,12],[-6,12]]);ell(62,4,5,4);ell(6,-16,7,6);ell(18,-15,5,5);
    c.save();c.fillStyle='rgba(25,18,8,.6)';poly([[2,-10],[24,-8],[54,1],[26,-2],[2,-2]]);poly([[4,4],[26,4],[54,4],[26,8],[4,10]]);ell(32,-4,2.6,2.2);c.restore();
    for(let k=0;k<7;k++){poly([[-74+k*16,10],[-69+k*16,19],[-64+k*16,10]])}},
  tail:()=>{poly([[-74,-6],[-98,-2],[-76,6]])}})},

/* ---------- птицы ---------- */
swan:{name:'Лебедь',k:'bird',cycle:900,draw:bird({body:[[0,0,46,18,-.05],[-26,2,24,16]],wing:{x:6,y:-10,len:96,w:30,feathers:7},
  head:(ph)=>{c.lineCap='round';curve([[36,-6],[56,-20],[50,-48],[58,-68],[74,-70]],9);ell(74,-70,9,7);poly([[80,-72],[96,-66],[80,-64]])},
  tail:()=>{poly([[-48,-4],[-64,-12],[-58,4]])}})},
phoenix:{name:'Феникс',k:'bird',cycle:760,draw:bird({body:[[0,0,32,15,-.1]],wing:{x:4,y:-8,len:110,w:34,feathers:9},
  head:(ph)=>{seg(24,-4,40,-16,12);ell(44,-18,11,9);poly([[52,-20],[64,-14],[52,-12]]);for(let i=0;i<3;i++)curve([[38,-24],[30-i*4,-38-i*2],[22-i*7,-44-i*3]],3)},
  tail:(ph)=>{c.lineCap='round';for(let i=0;i<5;i++){const w=Math.sin(ph*TAU+i)*10;curve([[-28,2],[-70,4+i*6+w],[-120,10+i*10-w],[-170,20+i*12+w]],6-i*.8)}}})},
eagleSide:{name:'Орёл',k:'bird',cycle:820,draw:bird({body:[[0,0,40,17,-.1]],wing:{x:6,y:-8,len:118,w:40,feathers:7,fingers:true},
  head:()=>{seg(28,-6,40,-14,16);ell(46,-16,13,11);poly([[54,-22],[70,-14],[62,-6],[56,-10]])},
  tail:()=>{poly([[-36,-4],[-70,-14],[-74,4],[-36,8]])}})},
eagle:{name:'Орёл',k:'front',cycle:700,draw:(ph,st,col,far)=>{
  const fl=Math.sin(ph*TAU)*(1-st*.6);
  const wing=(dir)=>{c.save();c.scale(dir,1);c.translate(14,-26);c.rotate(-.25+fl*.45);
    for(let i=0;i<9;i++){const t=i/8,an=-.95+t*1.2,len=120+(1-Math.abs(t-.35))*30;c.save();c.rotate(an);ell(len*.55,0,len*.5,9+4*(1-t),0);c.restore()}
    ell(40,6,46,22,-.35);c.restore()};
  c.fillStyle=far;wing(-1);wing(1);c.fillStyle=col;wing(-1);wing(1);
  ell(0,0,24,46);ell(2,-40,19,17);poly([[12,-50],[38,-42],[34,-30],[24,-34],[14,-30]]);
  c.save();c.fillStyle='rgba(10,20,50,.65)';ell(10,-44,3.5,3.5);poly([[30,-36],[38,-42],[36,-32]]);c.restore();
  poly([[-14,40],[0,82],[14,40]]);poly([[-22,44],[-30,78],[-6,46]]);poly([[22,44],[30,78],[6,46]]);
  c.strokeStyle=col;c.lineCap='round';seg(-8,40,-12,60,5);seg(8,40,12,60,5);}},
};
let ROAR_T=0;let RINGS=[];
function bird(P){
  return (ph,st,col,far)=>{
    const a=ph*TAU,fl=Math.sin(a)*(1-st*.7);
    const W_=(color,off)=>{c.fillStyle=c.strokeStyle=color;c.save();c.translate(P.wing.x+off,P.wing.y);c.rotate(-1.35+fl*1.05);
      const L=P.wing.len,w=P.wing.w;poly([[0,-6],[L*.5,-w*.55],[L,-w*.25],[L*.95,0],[L*.5,w*.25],[0,10]]);
      for(let i=0;i<P.wing.feathers;i++){const t=i/(P.wing.feathers-1);ell(L*(.45+t*.5),w*(.2-t*.1),P.wing.fingers&&t>.6?14:20,6,.25+t*.25)}
      c.restore()};
    W_(far,-6);
    c.fillStyle=c.strokeStyle=col;P.tail&&P.tail(ph,st);for(const e of P.body)ell(e[0],e[1],e[2],e[3],e[4]);P.head(ph,st);
    W_(col,0);
  };
}
/* ---------- змея ---------- */
function snakeDraw(t,len,col){
  const pts=[];for(let i=0;i<=60;i++){const u=i/60,x=-u*len,y=Math.sin(u*9-t*7)*26*Math.min(1,u*3+.2);pts.push([x,y])}
  c.fillStyle=col;for(let i=pts.length-1;i>=0;i--){const r=4+16*Math.sin(Math.min(1,(1-i/60)*1.3+.05)*Math.PI*.5)*(i<4?1.1:1);ell(pts[i][0],pts[i][1],r,r)}
  const h=pts[0],h2=pts[2],an=Math.atan2(h[1]-h2[1],h[0]-h2[0]);
  c.save();c.translate(h[0],h[1]);c.rotate(an);ell(10,0,22,15);c.fillStyle='rgba(10,30,15,.7)';ell(14,-7,3.5,3);ell(14,7,3.5,3);
  if(Math.sin(t*9)>.2){c.strokeStyle=col;c.lineWidth=2.5;c.lineCap='round';c.beginPath();c.moveTo(30,0);c.lineTo(46,0);c.lineTo(52,-5);c.moveTo(46,0);c.lineTo(52,5);c.stroke()}
  c.restore();
}
/* ---------- двигатель ---------- */
const sprites={};
function sprite(col){if(sprites[col])return sprites[col];const s=document.createElement('canvas');s.width=s.height=64;const g=s.getContext('2d');const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'#fff');gr.addColorStop(.25,col);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);return sprites[col]=s}
function emit(o){parts.push(Object.assign({vx:0,vy:0,g:0,r:3,life:1,max:1,col:'#dff3ff',drag:.985},o))}
function renderItem(it,s,ph,now){
  const k_=s.s,bw=(it.bw||330)*k_,bh=(it.bh||250)*k_,w=Math.ceil(bw*2*DPR),h=Math.ceil(bh*2*DPR);
  if(!it.lc){it.lc=document.createElement('canvas');it.lx=it.lc.getContext('2d');it.gc=document.createElement('canvas');it.gx=it.gc.getContext('2d')}
  if(it.lc.width!==w||it.lc.height!==h){it.lc.width=w;it.lc.height=h;it.gc.width=Math.max(1,w>>2);it.gc.height=Math.max(1,h>>2)}
  c=it.lx;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,w,h);c.setTransform(DPR,0,0,DPR,0,0);c.save();c.translate(bw,bh+(it.oy||0)*k_);c.scale(k_*(s.flip?-1:1),k_);c.lineCap='round';c.lineJoin='round';
  if(it.sp.k==='snake')snakeDraw((now-it.t0)/1000,it.len||300,it.col);else it.sp.draw(ph,s.st||0,it.col,it.far);
  c.restore();
  const g=it.gx;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,it.gc.width,it.gc.height);g.filter='blur(4px)';g.drawImage(it.lc,0,0,it.gc.width,it.gc.height);g.drawImage(it.gc,0,0);g.filter='none';
  c=mc;c.save();c.setTransform(1,0,0,1,0,0);const X=(s.x-bw)*DPR,Y=(s.y-bh)*DPR,a=(s.a==null?1:s.a)*(it.alpha||1);
  c.globalCompositeOperation='lighter';c.globalAlpha=a*.85;c.drawImage(it.gc,X,Y,w,h);c.globalAlpha=a*.5;c.drawImage(it.gc,X-w*.03,Y-h*.03,w*1.06,h*1.06);
  c.globalCompositeOperation='source-over';c.globalAlpha=a*(it.sharp||.92);c.drawImage(it.lc,X,Y);c.restore();
}
let lastT=0;
function loop(now){
  const dt=Math.min(50,now-(lastT||now))/16.67;lastT=now;
  c=mc;c.setTransform(DPR,0,0,DPR,0,0);c.clearRect(0,0,W,H);
  for(const L of LIGHTS){const a=L.a();if(a<=0)continue;const gr=c.createRadialGradient(L.x(),L.y(),0,L.x(),L.y(),L.r);gr.addColorStop(0,L.col);gr.addColorStop(1,'rgba(0,0,0,0)');c.globalCompositeOperation='lighter';c.globalAlpha=a;c.fillStyle=gr;c.fillRect(0,0,W,H)}
  c.globalAlpha=1;c.globalCompositeOperation='source-over';
  for(const it of items){
    const t=(now-it.t0)/it.dur;if(t>=1){it.dead=true;it.onDone&&it.onDone();continue}if(t<0)continue;
    if(it.custom){it.custom(t,now,dt);continue}
    const s=it.pos(t,now);const ph=((now-it.t0)/it.sp.cycle)%1;
    renderItem(it,s,ph,now);
    if(it.trail)it.trail(s,t,dt);
  }
  c=mc;c.setTransform(DPR,0,0,DPR,0,0);c.globalCompositeOperation='lighter';
  for(const p of parts){p.life-=dt/60;p.vx*=p.drag;p.vy*=p.drag;p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;const a=Math.max(0,p.life/p.max);c.globalAlpha=a;const r=p.r*(p.grow?1+(1-a)*p.grow:1)*2.4;c.drawImage(sprite(p.col),p.x-r,p.y-r,r*2,r*2)}
  c.globalAlpha=1;parts=parts.filter(p=>p.life>0);
  for(const r of RINGS){const t=(now-r.t0)/1100;if(t<0||t>1)continue;c.globalAlpha=(1-t)*.8;c.strokeStyle=r.col;c.lineWidth=10*(1-t)+1;c.beginPath();c.arc(r.x,r.y,40+t*Math.max(W,H)*.45,0,TAU);c.stroke()}
  c.globalAlpha=1;c.globalCompositeOperation='source-over';RINGS=RINGS.filter(r=>now-r.t0<1100);
  items=items.filter(i=>!i.dead);LIGHTS=LIGHTS.filter(l=>!l.dead());
  if(items.length||parts.length||RINGS.length||LIGHTS.length)raf=requestAnimationFrame(loop);else{raf=0;lastT=0;c.clearRect(0,0,W,H)}
}
let LIGHTS=[];
function scr(){return sc}
function start(it){ensure();it.t0=performance.now()+(it.delay||0);items.push(it);if(!raf){lastT=0;raf=requestAnimationFrame(loop)}return it}
const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const PAT=['stag','otter','hare','horse','dog','swan','cat','wolf'];let last='';
/* палочка: вспышка и серебряный вихрь, из которого рождается Патронус */
function wandCast(x,y,dir,done){
  const ang=dir?-.75:-Math.PI+.75,len=Math.min(W,H)*.32,tipX=x+Math.cos(ang)*len,tipY=y+Math.sin(ang)*len;
  start({dur:1300,custom:(t,now,dt)=>{
    c=mc;c.save();c.setTransform(DPR,0,0,DPR,0,0);const a=Math.min(1,t*5)*(t>.85?(1-t)/.15:1);c.globalAlpha=a;
    c.translate(x,y);c.rotate(ang);const gr=c.createLinearGradient(0,0,len,0);gr.addColorStop(0,'#3a2412');gr.addColorStop(.35,'#6b4423');gr.addColorStop(1,'#a8784a');
    c.fillStyle=gr;c.beginPath();c.moveTo(0,-9);c.lineTo(len,-3);c.lineTo(len,3);c.lineTo(0,9);c.closePath();c.fill();
    c.fillStyle='#2a180a';for(let i=0;i<4;i++){c.beginPath();c.ellipse(len*.06+i*12,0,4,10-i,0,0,TAU);c.fill()}
    c.restore();
    const pulse=t>.15?Math.min(1,(t-.15)*3):0;
    if(pulse){c.save();c.setTransform(DPR,0,0,DPR,0,0);c.globalCompositeOperation='lighter';c.globalAlpha=pulse*a;const R=40+Math.sin(now/60)*6+pulse*30;c.drawImage(sprite('#bfe6ff'),tipX-R,tipY-R,R*2,R*2);c.restore()}
    if(t>.2&&t<.8)for(let i=0;i<5*dt;i++){const sp=t*14+i,rr=10+Math.random()*30;emit({x:tipX+Math.cos(sp)*rr,y:tipY+Math.sin(sp)*rr,vx:(dir?1:-1)*(2+Math.random()*4)+Math.cos(sp)*1.5,vy:-1.5-Math.random()*2.5+Math.sin(sp)*1.5,r:2+Math.random()*3,life:1.1,max:1.1,col:'#cfeeff',drag:.97})}
    if(t>.45&&!this_fired){this_fired=true;done(tipX,tipY)}
  }});
  let this_fired=false;
}
function patronus(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  ensure();
  if(Math.random()<.3)return phoenixFire();
  const opts=PAT.filter(k=>k!==last);const k=opts[Math.random()*opts.length|0];last=k;const sp=SPECIES[k];
  const dir=Math.random()<.5,base=Math.min(W/700,H/420)*(sp.k==='bird'?1.1:1.2);
  const wx=dir?W*.08:W*.92,wy=H*.96;
  showName('Экспекто патронум!');
  wandCast(wx,wy,dir,(tx,ty)=>{
    showName('Патронус: '+sp.name,true);
    const yEnd=H*(.42+Math.random()*.12),D=4200;
    start({sp,dur:D,col:'#e9f7ff',far:'#9cc6e6',bw:sp.k==='bird'?300:260,bh:sp.k==='bird'?220:190,
      pos:(t)=>{const e=ease(t),grow=Math.min(1,t/.18);
        const x0=tx,x1=dir?W*1.25:-W*.25,u=Math.min(1,t/.35),y=ty+(yEnd-ty)*(1-Math.pow(1-u,3))+(sp.k==='bird'?Math.sin(t*TAU*1.3)*H*.04*u:0);
        const x=x0+(x1-x0)*e;return {x,y,s:base*(.2+.8*(1-Math.pow(1-grow,3))),flip:!dir,a:Math.min(1,t/.08)*(t>.85?(1-t)/.15:1)}},
      trail:(s,t,dt)=>{for(let i=0;i<2*dt;i++)emit({x:s.x-(dir?1:-1)*(40+Math.random()*90)*s.s,y:s.y+(Math.random()-.4)*80*s.s,vx:(Math.random()-.5)*.8,vy:-Math.random()*.8,r:1.5+Math.random()*3,life:1.4,max:1.4,col:'#cfeeff'})}});
  });
}
function phoenixFire(){
  const sp=SPECIES.phoenix,dir=Math.random()<.5,sc=Math.min(W/600,H/380)*1.3,D=5200,y0=H*.34;
  showName('Феникс',true);
  let cur={x:-999,y:-999};
  LIGHTS.push({x:()=>cur.x,y:()=>cur.y,r:Math.max(W,H)*.55,col:'rgba(255,140,40,.55)',a:()=>cur.a||0,dead:()=>!it.dead?false:true});
  const it=start({sp,dur:D,col:'#ffe08a',far:'#ff8a2a',sharp:.95,bw:340,bh:240,
    pos:(t)=>{const e=ease(t);const x=dir?-W*.25+e*W*1.5:W*1.25-e*W*1.5;const y=y0+Math.sin(t*TAU*.9)*H*.08;const a=Math.min(1,t/.1)*(t>.88?(1-t)/.12:1);cur={x,y,a};return {x,y,s:sc,flip:!dir,a}},
    trail:(s,t,dt)=>{for(let i=0;i<4*dt;i++){const hot=Math.random();emit({x:s.x-(dir?1:-1)*(30+Math.random()*170)*s.s,y:s.y+(10+Math.random()*60)*s.s,vx:(Math.random()-.5)*1.2,vy:-.6-Math.random()*1.8,g:-.01,r:2+Math.random()*4,life:1.6,max:1.6,col:hot<.3?'#fff2b0':hot<.7?'#ffb040':'#ff5a1a',grow:.6})}}});
  fireSound();
}
let nameEl=null;
function showName(n,keep){if(!nameEl){nameEl=document.createElement('div');nameEl.className='fx2-name';document.body.appendChild(nameEl)}nameEl.textContent=n;nameEl.classList.remove('on');void nameEl.offsetWidth;nameEl.classList.add('on')}
/* искры (правильный ответ и т.д.) */
function burst(x,y,col,n){ensure();for(let i=0;i<(n||60);i++){const a=Math.random()*TAU,v=2+Math.random()*7;emit({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-2,g:.08,r:2+Math.random()*3.5,life:1.2+Math.random()*.6,max:1.8,col:Math.random()<.3?'#ffffff':col,drag:.96})}if(!raf){lastT=0;raf=requestAnimationFrame(loop)}}
function fireSound(){try{if(window.__hpqSound===false)return;const a=new (window.AudioContext||window.webkitAudioContext)(),n=a.sampleRate*3,b=a.createBuffer(1,n,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.sin(Math.PI*i/n)*(.5+.5*Math.random());const s=a.createBufferSource();s.buffer=b;const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=900;const g=a.createGain();g.gain.value=.35;s.connect(f).connect(g).connect(a.destination);s.start();
  [523,784,1046,1318].forEach((fr,i)=>{const o=a.createOscillator(),gg=a.createGain(),t=a.currentTime+.4+i*.35;o.type='sine';o.frequency.value=fr;gg.gain.setValueAtTime(.0001,t);gg.gain.exponentialRampToValueAtTime(.06,t+.1);gg.gain.exponentialRampToValueAtTime(.0001,t+1.4);o.connect(gg).connect(a.destination);o.start(t);o.stop(t+1.5)})}catch(e){}}
function house(h,color,glow){
  ensure();const key={gryffindor:'lion',slytherin:'snake',ravenclaw:'eagle',hufflepuff:'badger'}[h];
  const sp=key==='snake'?{k:'snake',cycle:1000}:SPECIES[key];
  const sc=Math.min(W/560,H/380)*(key==='badger'?1.2:key==='eagle'?.95:1.05);
  const cx_=W/2,cy=H*.38,ENTER=1700;
  ROAR_T=performance.now()/1000+2;let it_roared=false;
  return start({sp,dur:6400,col:color,far:shade(color),bw:key==='snake'?420:300,bh:key==='eagle'?260:220,len:340,
    trail:(s,t,dt)=>{if(t<.35)for(let i=0;i<3*dt;i++)emit({x:s.x+(Math.random()-.5)*160*s.s,y:s.y+(Math.random()-.3)*90*s.s,vx:(Math.random()-.5)*1.5,vy:-Math.random()*1.5,r:2+Math.random()*3,life:1.3,max:1.3,col:glow})},
    pos:(t,now)=>{const ms=t*6400,e=Math.min(1,ms/ENTER),ease=1-Math.pow(1-e,3),st=Math.min(1,Math.max(0,(ms-ENTER+300)/500));
      if(key==='eagle')return {x:cx_+(1-ease)*W*.6,y:H*.52-(1-ease)*H*.7+Math.sin(ms/500)*8*st,s:sc*(.5+.5*ease),st:st*.5};
      if(key==='snake')return {x:cx_+120*sc-(1-ease)*W*.8,y:cy+40,s:sc,st};
      const breath=Math.sin(ms/400)*2*st;if(key==='lion'&&ms>2000&&!it_roared){it_roared=true;for(let r=0;r<3;r++)RINGS.push({x:cx_+55*sc,y:cy+10*sc,t0:performance.now()+r*220,col:glow})}return {x:-W*.3+(cx_+W*.3)*ease,y:cy+30*sc+breath,s:sc,st}}});
}
function shade(hex){const n=parseInt(hex.slice(1),16),r=n>>16,g=n>>8&255,b=n&255,f=.7;return `rgb(${r*f|0},${g*f|0},${b*f|0})`}
function stop(it){if(it)it.dead=true}
function drawAt(key,x,y,s,ph,st,col,far){ensure();c=mc;const sp=key==='snake'?{k:'snake'}:SPECIES[key];c.setTransform(DPR,0,0,DPR,0,0);c.save();c.translate(x,y);c.scale(s,s);c.lineCap='round';c.lineJoin='round';c.shadowColor='#7cc4ff';c.shadowBlur=12;
  if(key==='snake')snakeDraw(ph*2,300,col);else sp.draw(ph,st,col,far);c.restore()}
/* ---------- заклинания-молнии ---------- */
function boltPath(x1,y1,x2,y2,disp,depth){let pts=[[x1,y1],[x2,y2]];for(let d=0;d<depth;d++){const np=[pts[0]];for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;const o=(Math.random()-.5)*disp;np.push([mx-dy/l*o,my+dx/l*o],b)}pts=np;disp*=.55}return pts}
function strokePath(pts,upto){c.beginPath();const n=Math.max(2,Math.floor(pts.length*upto));c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<n;i++)c.lineTo(pts[i][0],pts[i][1]);c.stroke();return pts[n-1]}
function spellBolt(o){
  // o: {x1,y1,x2,y2,col,core,jag,dur,branches,width,onHit}
  ensure();let paths=null,last=0,hit=false;const D=o.dur||1400;
  const L=Math.hypot(o.x2-o.x1,o.y2-o.y1);
  return start({dur:D,custom:(t,now,dt)=>{
    if(!paths||now-last>55){last=now;paths=[boltPath(o.x1,o.y1,o.x2,o.y2,L*(o.jag??.22),8)];
      for(let b=0;b<(o.branches??4);b++){const main=paths[0],i=Math.floor(main.length*(.2+Math.random()*.6)),p=main[i];const ang=Math.atan2(o.y2-o.y1,o.x2-o.x1)+(Math.random()-.5)*1.6,len=L*(.1+Math.random()*.2);paths.push(boltPath(p[0],p[1],p[0]+Math.cos(ang)*len,p[1]+Math.sin(ang)*len,len*.4,6))}}
    const grow=Math.min(1,t/.12),fade=t<.7?1:Math.max(0,(1-t)/.3),flick=.75+.25*Math.random();
    c=mc;c.save();c.setTransform(DPR,0,0,DPR,0,0);c.globalCompositeOperation='lighter';c.lineCap='round';c.lineJoin='round';
    paths.forEach((p,k)=>{const w=(k?.45:1)*(o.width||1);
      c.globalAlpha=.16*fade*flick;c.strokeStyle=o.col;c.lineWidth=34*w;strokePath(p,grow);
      c.globalAlpha=.45*fade*flick;c.lineWidth=12*w;c.shadowColor=o.col;c.shadowBlur=30;strokePath(p,grow);c.shadowBlur=0;
      c.globalAlpha=.95*fade;c.strokeStyle=o.core;c.lineWidth=3.2*w;const end=strokePath(p,grow);
      if(k===0&&grow<1){c.globalAlpha=1;const R=40;c.drawImage(sprite(o.col),end[0]-R,end[1]-R,R*2,R*2)}});
    // свечение на концах
    const R1=(60+Math.random()*20)*fade;c.globalAlpha=.9*fade;c.drawImage(sprite(o.col),o.x1-R1,o.y1-R1,R1*2,R1*2);
    if(grow>=1){const R2=(130+Math.random()*40)*fade;c.drawImage(sprite(o.col),o.x2-R2,o.y2-R2,R2*2,R2*2)}
    c.restore();
    if(grow>=1&&!hit){hit=true;o.onHit&&o.onHit();for(let i=0;i<120;i++){const a=Math.random()*TAU,v=2+Math.random()*9;emit({x:o.x2,y:o.y2,vx:Math.cos(a)*v,vy:Math.sin(a)*v,g:.05,r:2+Math.random()*3,life:1+Math.random()*.8,max:1.8,col:Math.random()<.35?o.core:o.col,drag:.95})}}
    if(fade>0)for(let i=0;i<2;i++){const p=paths[0][Math.random()*paths[0].length|0];emit({x:p[0],y:p[1],vx:(Math.random()-.5)*1.5,vy:-Math.random()*1.5,r:1.5+Math.random()*2,life:.8,max:.8,col:o.col})}
  }});
}
function thunder(col){try{if(window.__hpqSound===false)return;const a=fxAC(),n=a.sampleRate*2.2,b=a.createBuffer(1,n,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++){const k=i/n;d[i]=(Math.random()*2-1)*(k<.03?1:Math.pow(1-k,2.2))}
  const s=a.createBufferSource();s.buffer=b;const f=a.createBiquadFilter();f.type='lowpass';const t=a.currentTime;f.frequency.setValueAtTime(5000,t);f.frequency.exponentialRampToValueAtTime(180,t+1.8);const g=a.createGain();g.gain.value=.7;s.connect(f).connect(g).connect(a.destination);s.start();
  const o=a.createOscillator(),og=a.createGain();o.type='sine';o.frequency.setValueAtTime(70,t);o.frequency.exponentialRampToValueAtTime(30,t+1.2);og.gain.setValueAtTime(.5,t);og.gain.exponentialRampToValueAtTime(.001,t+1.4);o.connect(og).connect(a.destination);o.start(t);o.stop(t+1.5)}catch(e){}}
const SPELL2={
  avada:{n:'Авада Кедавра!',col:'#2dff5a',core:'#eaffef',flash:'rgba(40,255,90,.6)',jag:.24,branches:5,width:1.25,shake:14},
  expelliarmus:{n:'Экспеллиармус!',col:'#ff3030',core:'#fff0e8',flash:'rgba(255,50,40,.35)',jag:.08,branches:1,width:1,shake:6},
  stupefy:{n:'Остолбеней!',col:'#ff5a1a',core:'#fff3d0',flash:'rgba(255,110,40,.3)',jag:.12,branches:2,width:.9,shake:5},
};
function castSpell(key){
  const S=SPELL2[key]||SPELL2.avada;ensure();const dir=Math.random()<.5;
  const wx=dir?W*.08:W*.92,wy=H*.96;showName(S.n);
  wandCast(wx,wy,dir,(tx,ty)=>{
    const x2=dir?W*(.72+Math.random()*.15):W*(.13+Math.random()*.15),y2=H*(.22+Math.random()*.2);
    if(key==='avada'||key==='stupefy'||key==='expelliarmus')thunder();
    spellBolt({x1:tx,y1:ty,x2,y2,col:S.col,core:S.core,jag:S.jag,branches:S.branches,width:S.width,dur:key==='avada'?1500:1100,onHit:()=>{
      const fl=document.createElement('div');fl.className='spellflash on';fl.style.background=`radial-gradient(circle at ${x2/W*100}% ${y2/H*100}%,${S.flash},transparent 65%)`;document.body.appendChild(fl);setTimeout(()=>fl.remove(),1100);
      const app=document.getElementById('app');if(app&&!matchMedia('(prefers-reduced-motion: reduce)').matches){app.animate([{transform:'translate(0,0)'},{transform:`translate(${S.shake}px,${-S.shake*.6}px)`},{transform:`translate(${-S.shake*.8}px,${S.shake*.5}px)`},{transform:`translate(${S.shake*.4}px,${S.shake*.3}px)`},{transform:'translate(0,0)'}],{duration:420,easing:'ease-out'})}
    }});
  });
}

return {patronus,phoenixFire,house,stop,drawAt,burst,SPECIES,wandCast,showName,castSpell};
})();
