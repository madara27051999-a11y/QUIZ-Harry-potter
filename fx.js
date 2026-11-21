// Анимации: пролёт Патронуса и животное факультета-победителя. Своя графика.
const PATRONI={
stag:{n:'Олень',d:`<path d="M30 78C28 70 32 62 40 60c20-6 52-4 72-6 6-2 10-8 14-16l6-12c2-4 6-6 10-4l8 4c4 2 6 6 2 8l-8 2c-4 2-6 8-8 16-2 10-6 18-12 22l2 26 4 24h-6l-6-24-4-20c-10 4-26 4-38 2l-6 22 4 24h-6l-6-22-2-20c-8 0-14-2-18-2l-2 22 4 24h-6l-6-24z"/><path d="M138 22c-4-10-10-16-18-20m10 10c-4-4-8-4-12-2m24 12c4-10 10-16 18-18m-10 8c4-4 8-4 12-2M126 6c-2-4-1-8 2-10m28 6c2-4 6-6 8-6" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M30 70l-8-6 4 10z"/>`},
otter:{n:'Выдра',d:`<path d="M10 92c20-2 34-8 50-14 20-8 50-12 80-8 10-6 20-8 28-4s10 12 4 16c-6 4-16 4-22 4l-4 10h-6l-2-8c-18 4-38 4-52 2l-4 8h-6l-2-8C50 92 30 96 10 96z"/><path d="M158 64l4-6 4 6z"/>`},
hare:{n:'Заяц',d:`<path d="M40 96c-10-4-12-12-4-16 14-10 44-18 68-16 12-6 20-10 28-8l2-26c0-8 6-8 8 0v22l6-24c2-8 8-6 6 2l-6 28c8 4 12 12 8 18-6 4-14 4-20 4-6 8-12 14-20 18l14 10-4 4-22-10c-14 2-34 2-48 0l-26 12-4-4 18-12z"/><circle cx="32" cy="84" r="7"/>`},
horse:{n:'Лошадь',d:`<path d="M24 70c16-12 46-14 76-12h18c6-10 12-20 20-26 6-4 14-4 20 0l12 10c4 4 2 8-4 8l-10-2c-6 6-10 14-16 20-4 8-10 14-16 16l14 18 12 4-2 6-16-4-18-18c-14 2-34 2-48 0l-16 16-10 18-6-2 8-20 4-14c-8-2-16-6-20-10-8 8-16 20-20 28l-4-2c6-14 12-24 22-32z"/><path d="M136 34c-6 2-12 8-16 16m12-20c-6 4-10 10-12 16" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>`},
dog:{n:'Пёс',d:`<path d="M30 84c0-12 10-18 24-18h56c4-8 10-16 18-18l4-8 6 8c8 0 16 6 20 12 2 6-2 8-8 8l-10 2c-4 6-8 10-12 14l2 26h-6l-4-22H70l-6 22h-6l-2-24c-8 0-16 0-22-2-6-6-12-14-14-24l4-2c4 8 6 16 6 26z"/>`},
swan:{n:'Лебедь',d:`<path d="M30 96c16 18 104 20 132 2 8-6 6-14-4-14l-24 2c-10-14-30-22-52-20-22 2-38 14-52 30z"/><path d="M150 88c-6-16-12-30-8-44 4-12 16-14 20-6l14 4-12 4c-6 0-8 10-6 22 2 10 4 16 2 22z"/><path d="M58 82c8-34 40-52 76-48-24 8-40 22-48 42z" opacity=".85"/>`},

cat:{n:'Кошка',d:`<path d="M30 80c0-10 10-16 26-16h56c4-8 8-14 14-14l2-10 6 8 6-8 2 12c8 4 10 14 4 20-4 4-10 6-16 6l-2 26h-6l-4-22H68l-6 22h-6l-2-24c-10 0-18-2-22-4-8-6-14-20-10-36l4 2c-2 14 2 28 4 38z"/>`},
phoenix:{n:'Феникс',d:`<path d="M100 60C82 36 52 30 30 40c18 0 32 8 40 20-16-6-32 0-40 10 16-2 30 0 40 8-10 2-18 10-22 20 14-8 30-10 44-6z"/><path d="M100 60c18-24 48-30 70-20-18 0-32 8-40 20 16-6 32 0 40 10-16-2-30 0-40 8 10 2 18 10 22 20-14-8-30-10-44-6z"/><path d="M100 54c8 0 10 10 6 20l-6 22-6-22c-4-10-2-20 6-20z"/><path d="M100 94c-6 12-16 24-28 34m28-34c6 12 16 24 28 34m-28-34v40" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>`}
};
const HOUSE_FX={
gryffindor:{animal:'Лев',color:'#b3262f',light:'#ffb347'},
slytherin:{animal:'Змея',color:'#1d7a4c',light:'#8be3a8'},
ravenclaw:{animal:'Орёл',color:'#2557a7',light:'#9cc3ff'},
hufflepuff:{animal:'Барсук',color:'#d89a1d',light:'#ffe08a'}
};
function lionSVG(){
  let mane='';for(let r=0;r<2;r++)for(let i=0;i<16;i++){const a=(i+r*.5)/16*Math.PI*2,R=r?58:72,x=100+Math.cos(a)*R,y=104+Math.sin(a)*R;mane+=`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${r?20:24}" ry="${r?26:30}" transform="rotate(${(a*57.3+90).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${r?'#d9782a':'#a84a18'}"/>`}
  return `<svg viewBox="-10 0 220 220" class="hx-svg lion"><g class="mane">${mane}<circle cx="100" cy="104" r="56" fill="#c8641e"/></g>
  <g class="face"><path d="M62 70c-6-14 0-24 12-22 6 2 8 8 8 14M138 70c6-14 0-24-12-22-6 2-8 8-8 14" fill="#e8a64a"/><path d="M100 50c26 0 42 18 42 44 0 18-6 30-16 40-8 8-16 14-26 14s-18-6-26-14c-10-10-16-22-16-40 0-26 16-44 42-44z" fill="#f2bf5e"/>
  <path d="M80 92q8-6 14 0M106 92q6-6 14 0" stroke="#3a1a08" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M88 112h24l-12 12z" fill="#3a1a08"/><path d="M100 124v8m-10 4q10 8 20 0" stroke="#3a1a08" stroke-width="4" fill="none" stroke-linecap="round"/>
  <g class="jaw"><path d="M86 136q14 16 28 0q-2 12-14 14q-12-2-14-14z" fill="#7a1a10"/></g></g></svg>`;
}
function eagleSVG(){
  const wing=`<path d="M100 92C84 70 56 56 14 54c10 6 16 10 20 14-10 0-18 2-24 6 12 2 20 6 24 10-8 2-14 6-16 12 12-2 22-2 30 2-4 4-6 8-6 14 14-8 30-10 44-8z" fill="#c9d9ff"/>`;
  return `<svg viewBox="0 0 200 200" class="hx-svg eagle"><g class="wl">${wing}</g><g transform="translate(200 0) scale(-1 1)"><g class="wr">${wing}</g></g>
  <path d="M100 70c12 0 16 12 14 26l-4 40 10 24h-40l10-24-4-40c-2-14 2-26 14-26z" fill="#3d5f9c"/><path d="M100 46c12 0 20 8 20 18 0 6-2 10-6 12l-14 4-14-4c-4-2-6-6-6-12 0-10 8-18 20-18z" fill="#f4f7ff"/>
  <path d="M112 60l16 6-12 8z" fill="#f2c25e"/><circle cx="106" cy="58" r="3" fill="#10203f"/><path d="M84 160l-8 14m16-14v16m16-16 8 14" stroke="#f2c25e" stroke-width="5" stroke-linecap="round"/></svg>`;
}
function badgerSVG(){
  return `<svg viewBox="0 0 200 140" class="hx-svg badger"><g class="bb"><path d="M20 100c0-20 20-30 50-32h50c20 0 32 6 42 14l22 10c4 2 2 6-2 6h-22c-4 6-10 8-16 8l2 12h-8l-4-10H64l-4 12h-8v-12c-16 0-30 0-32-8z" fill="#3a3a44"/>
  <path d="M124 70c14-2 30 4 40 14l20 10c-8 0-16-2-24-6-10-6-22-10-36-12z" fill="#f4f1ea"/><path d="M118 76c10 0 24 6 34 14" stroke="#f4f1ea" stroke-width="4" fill="none" opacity=".6"/>
  <circle cx="150" cy="80" r="3" fill="#111"/><circle cx="184" cy="96" r="4" fill="#111"/><path d="M128 66l6-8 6 8z" fill="#3a3a44"/><path d="M30 90c20-8 50-10 80-8" stroke="#6a6a76" stroke-width="3" fill="none"/></g></svg>`;
}
function snakeSVG(){
  return `<svg viewBox="0 0 400 160" class="hx-svg snake"><path id="snk" d="" fill="none" stroke="#1d7a4c" stroke-width="26" stroke-linecap="round"/><path id="snk2" d="" fill="none" stroke="#8be3a8" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 14" opacity=".8"/>
  <g id="snh"><ellipse cx="0" cy="0" rx="24" ry="17" fill="#1d7a4c"/><circle cx="8" cy="-6" r="3.5" fill="#f2c25e"/><path d="M22 2l14 2-4 3 6 3-16-3" stroke="#d33" stroke-width="2.5" fill="none" stroke-linecap="round"/></g></svg>`;
}

/* ---------- звук ---------- */
let fxCtx=null;const fxOn=()=>window.__hpqSound!==false;
function fxAC(){fxCtx=fxCtx||new (window.AudioContext||window.webkitAudioContext)();return fxCtx}
function fxBeep(f,d,type,vol,delay){try{const a=fxAC(),o=a.createOscillator(),g=a.createGain(),t=a.currentTime+(delay||0);o.type=type||'sine';o.frequency.value=f;g.gain.setValueAtTime(vol||.1,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(a.destination);o.start(t);o.stop(t+d+.02)}catch(e){}}
/* ---------- пролёт Патронуса ---------- */
let fxLayer=null;
function fxRoot(){if(!fxLayer){fxLayer=document.createElement('div');fxLayer.className='fx';document.body.appendChild(fxLayer)}return fxLayer}
let lastPat='';
function patronusFlyOld(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const keys=Object.keys(PATRONI).filter(k=>k!==lastPat);const k=keys[Math.random()*keys.length|0];lastPat=k;
  const el=document.createElement('div');el.className='patronus';
  el.innerHTML=`<svg viewBox="0 0 200 140" fill="currentColor">${PATRONI[k].d}</svg><span>${PATRONI[k].n}</span>`;
  const up=Math.random()<.5;el.style.setProperty('--y0',(up?62:22)+'vh');el.style.setProperty('--y1',(up?18:56)+'vh');
  fxRoot().appendChild(el);whoosh();
  const t0=performance.now(),D=2600;
  const trail=()=>{const t=performance.now()-t0;if(t>D){return}
    const r=el.getBoundingClientRect();for(let i=0;i<3;i++){const s=document.createElement('i');s.className='spark';s.style.left=(r.left+r.width*(.1+Math.random()*.3))+'px';s.style.top=(r.top+r.height*(.25+Math.random()*.6))+'px';fxRoot().appendChild(s);setTimeout(()=>s.remove(),1300)}
    requestAnimationFrame(trail)};
  requestAnimationFrame(trail);
  setTimeout(()=>el.remove(),D+100);
}
function whoosh(){try{if(!fxOn())return;const actx=fxAC();const n=actx.sampleRate*1.6,b=actx.createBuffer(1,n,actx.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.sin(Math.PI*i/n);
  const src=actx.createBufferSource();src.buffer=b;const f=actx.createBiquadFilter();f.type='bandpass';f.Q.value=3;const t=actx.currentTime;f.frequency.setValueAtTime(300,t);f.frequency.exponentialRampToValueAtTime(2400,t+.8);f.frequency.exponentialRampToValueAtTime(500,t+1.6);
  const g=actx.createGain();g.gain.value=.25;src.connect(f).connect(g).connect(actx.destination);src.start();[1318,1760,2093].forEach((fr,i)=>fxBeep(fr,.6,'sine',.03,.3+i*.15))}catch(e){}}

/* ---------- животное факультета ---------- */
function houseReveal(house,name){
  const H=HOUSE_FX[house];if(!H)return;
  const ov=document.createElement('div');ov.className='hx hx-'+house;ov.style.setProperty('--hc',H.color);ov.style.setProperty('--hl',H.light);
  const art='';
  ov.innerHTML=`<div class="hx-rays"></div><div class="hx-stage">${art}</div><div class="hx-text"><small>Кубок факультетов</small><b>${name}</b></div>`;
  document.body.appendChild(ov);
  const ANIM={gryffindor:['#f6c768','#ff9a3c'],slytherin:['#5fd394','#2fbf73'],ravenclaw:['#cfe0ff','#6fa8ff'],hufflepuff:['#f3d77c','#ffcf4a']}[house];
  let closed=false;const it3=(window.FX3D&&FX3D.ready)?FX3D.house(house,()=>close()):null;if(it3)ov.classList.add('hx-3d');
  const it=(!it3&&typeof FX2!=='undefined')?FX2.house(house,ANIM[0],ANIM[1]):null;
  roar(house);
  const close=()=>{if(closed)return;closed=true;if(it)FX2.stop(it);if(it3)FX3D.stop(it3);ov.classList.add('out');setTimeout(()=>ov.remove(),900)};
  ov.addEventListener('click',close);setTimeout(close,it3?15000:6500);
}
function runSnake(ov){
  const p=ov.querySelector('#snk'),p2=ov.querySelector('#snk2'),h=ov.querySelector('#snh');const t0=performance.now();
  const step=()=>{if(!ov.isConnected)return;const t=(performance.now()-t0)/1000;const head=Math.min(330,-60+t*190);
    let d='';for(let x=head-300;x<=head;x+=6){const amp=26*Math.min(1,(head-x)/60+.25);const y=80+Math.sin(x/34-t*6)*amp;d+=(d?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}
    p.setAttribute('d',d);p2.setAttribute('d',d);const yh=80+Math.sin(head/34-t*6)*26*.25,yb=80+Math.sin((head-6)/34-t*6)*26*.35;
    h.setAttribute('transform',`translate(${head+10} ${yh}) rotate(${Math.atan2(yh-yb,6)*57})`);requestAnimationFrame(step)};
  step();
}
function roar(house){try{if(!fxOn())return;const actx=fxAC();const t=actx.currentTime;
  if(house==='gryffindor'){const o=actx.createOscillator(),g=actx.createGain(),f=actx.createBiquadFilter();o.type='sawtooth';o.frequency.setValueAtTime(90,t);o.frequency.linearRampToValueAtTime(140,t+.4);o.frequency.linearRampToValueAtTime(70,t+1.4);f.type='lowpass';f.frequency.value=700;g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.3,t+.2);g.gain.exponentialRampToValueAtTime(.001,t+1.5);o.connect(f).connect(g).connect(actx.destination);o.start(t);o.stop(t+1.6)}
  else if(house==='slytherin'){const n=actx.sampleRate*1.4,b=actx.createBuffer(1,n,actx.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);const s=actx.createBufferSource();s.buffer=b;const f=actx.createBiquadFilter();f.type='highpass';f.frequency.value=4000;const g=actx.createGain();g.gain.value=.25;s.connect(f).connect(g).connect(actx.destination);s.start()}
  else if(house==='ravenclaw'){const o=actx.createOscillator(),g=actx.createGain();o.type='triangle';o.frequency.setValueAtTime(2200,t);o.frequency.exponentialRampToValueAtTime(1300,t+.6);g.gain.setValueAtTime(.12,t);g.gain.exponentialRampToValueAtTime(.001,t+.7);o.connect(g).connect(actx.destination);o.start(t);o.stop(t+.8)}
  else{[0,.18,.36].forEach(dl=>fxBeep(220,.12,'square',.06,dl))}
}catch(e){}}

function patronusFly(){if(window.FX3D&&FX3D.ready&&FX3D.transition())return;if(typeof FX2!=='undefined')FX2.patronus()}
