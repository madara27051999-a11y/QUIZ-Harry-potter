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
function loop(){
  const now=performance.now();c.setTransform(DPR,0,0,DPR,0,0);c.clearRect(0,0,W,H);
  for(const p of parts){p.life-=1/60;p.x+=p.vx;p.y+=p.vy;p.vy+=.02;c.globalAlpha=Math.max(0,p.life/p.max)*.9;c.fillStyle=p.col;c.beginPath();c.arc(p.x,p.y,p.r,0,TAU);c.fill()}
  c.globalAlpha=1;parts=parts.filter(p=>p.life>0);
  for(const r of RINGS){const t=(now-r.t0)/1100;if(t<0||t>1)continue;c.globalAlpha=(1-t)*.8;c.strokeStyle=r.col;c.lineWidth=8*(1-t)+1;c.beginPath();c.arc(r.x,r.y,40+t*Math.max(W,H)*.45,0,TAU);c.stroke()}
  c.globalAlpha=1;RINGS=RINGS.filter(r=>now-r.t0<1100);
  for(const it of items){
    const t=(now-it.t0)/it.dur;if(t>=1&&!it.hold){it.dead=true;it.onDone&&it.onDone();continue}
    const s=it.pos(Math.min(t,1),now);const k_=s.s;
    const ph=((now-it.t0)/it.sp.cycle)%1;
    c=sx;c.setTransform(DPR,0,0,DPR,0,0);c.clearRect(0,0,W,H);c.save();c.translate(s.x,s.y);c.scale(k_*(s.flip?-1:1),k_);c.lineCap='round';c.lineJoin='round';
    if(it.sp.k==='snake')snakeDraw((now-it.t0)/1000,it.len||300,it.col);
    else it.sp.draw(ph,s.st||0,it.col,it.far);
    c.restore();c=mc;
    c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha=it.alpha||1;c.shadowColor=it.glow;c.shadowBlur=26*DPR;c.drawImage(scr(),0,0);c.shadowBlur=60*DPR;c.globalAlpha=(it.alpha||1)*.35;c.drawImage(scr(),0,0);c.restore();
    if(Math.random()<.9)for(let k=0;k<2;k++)parts.push({x:s.x-(60+Math.random()*80)*k_*(s.flip?-1:1),y:s.y+(Math.random()-.5)*70*k_,vx:(Math.random()-.5)*.6,vy:-Math.random()*.6,r:1+Math.random()*2.6,life:1.2,max:1.2,col:it.spark});
  }
  items=items.filter(i=>!i.dead);
  if(items.length||parts.length||RINGS.length)raf=requestAnimationFrame(loop);else{raf=0;c.clearRect(0,0,W,H)}
}
function scr(){return sc}
function start(it){ensure();it.t0=performance.now();items.push(it);if(!raf)raf=requestAnimationFrame(loop);return it}
const PAT=['stag','otter','hare','horse','dog','swan','cat','phoenix','wolf'];let last='';
function patronus(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  ensure();const opts=PAT.filter(k=>k!==last);const k=opts[Math.random()*opts.length|0];last=k;const sp=SPECIES[k];
  const sc=Math.min(W/700,H/420)*(sp.k==='bird'?1.1:1.25);const y0=H*(.5+Math.random()*.15),dir=Math.random()<.5;
  start({sp,dur:3400,col:'#e4f5ff',far:'#9cc6e6',glow:'#7cc4ff',spark:'#dff3ff',
    pos:(t)=>{const e=t;const x=dir?-.25*W+e*1.5*W:1.25*W-e*1.5*W;const y=y0+(sp.k==='bird'?Math.sin(t*TAU*1.2)*H*.05-t*H*.1:0);return {x,y,s:sc,flip:!dir}}});
  showName(sp.name);
}
let nameEl=null;
function showName(n){if(!nameEl){nameEl=document.createElement('div');nameEl.className='fx2-name';document.body.appendChild(nameEl)}nameEl.textContent='Патронус: '+n;nameEl.classList.remove('on');void nameEl.offsetWidth;nameEl.classList.add('on')}
function house(h,color,glow){
  ensure();const key={gryffindor:'lion',slytherin:'snake',ravenclaw:'eagle',hufflepuff:'badger'}[h];
  const sp=key==='snake'?{k:'snake',cycle:1000}:SPECIES[key];
  const sc=Math.min(W/560,H/380)*(key==='badger'?1.2:key==='eagle'?.95:1.05);
  const cx_=W/2,cy=H*.38,ENTER=1700;
  ROAR_T=performance.now()/1000+2;let it_roared=false;
  return start({sp,dur:6400,hold:false,col:color,far:shade(color),glow,spark:glow,len:340,
    pos:(t,now)=>{const ms=t*6400,e=Math.min(1,ms/ENTER),ease=1-Math.pow(1-e,3),st=Math.min(1,Math.max(0,(ms-ENTER+300)/500));
      if(key==='eagle')return {x:cx_+(1-ease)*W*.6,y:H*.52-(1-ease)*H*.7+Math.sin(ms/500)*8*st,s:sc*(.5+.5*ease),st:st*.5};
      if(key==='snake')return {x:cx_+120*sc-(1-ease)*W*.8,y:cy+40,s:sc,st};
      const breath=Math.sin(ms/400)*2*st;if(key==='lion'&&ms>2000&&!it_roared){it_roared=true;for(let r=0;r<3;r++)RINGS.push({x:cx_+55*sc,y:cy+10*sc,t0:performance.now()+r*220,col:glow})}return {x:-W*.3+(cx_+W*.3)*ease,y:cy+30*sc+breath,s:sc,st}}});
}
function shade(hex){const n=parseInt(hex.slice(1),16),r=n>>16,g=n>>8&255,b=n&255,f=.7;return `rgb(${r*f|0},${g*f|0},${b*f|0})`}
function stop(it){if(it)it.dead=true}
function drawAt(key,x,y,s,ph,st,col,far){ensure();c=mc;const sp=key==='snake'?{k:'snake'}:SPECIES[key];c.setTransform(DPR,0,0,DPR,0,0);c.save();c.translate(x,y);c.scale(s,s);c.lineCap='round';c.lineJoin='round';c.shadowColor='#7cc4ff';c.shadowBlur=12;
  if(key==='snake')snakeDraw(ph*2,300,col);else sp.draw(ph,st,col,far);c.restore()}
return {patronus,house,stop,drawAt,SPECIES};
})();
