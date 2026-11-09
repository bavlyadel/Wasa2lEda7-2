/* v13: أنيميشنز اللوجو (٣) + اختيار المسؤول */
/* أنيميشن اللوجو: لما تدوس عليه يلف لفتين ويطلع منه زهرة نجوم وحلقات ملوّنة، وبعدين يرجع مكانه بنطّة */
const A_stars=(function(){
if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
let busy=false;
const css=getComputedStyle(document.documentElement);
function burst(cx,cy,S,layer){
  const cols=['--accent','--blue','--green'].map(v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#8eb0ff');
  const mk=(c,kf,opt)=>{const d=document.createElement('div');d.style.cssText=c;layer.appendChild(d);return d.animate(kf,opt)};
  [0,160].forEach((delay,i)=>mk(`position:absolute;left:${cx}px;top:${cy}px;width:${S}px;height:${S}px;margin:${-S/2}px 0 0 ${-S/2}px;border-radius:50%;border:3px solid ${cols[i]}`,
    [{transform:'scale(.8)',opacity:.9},{transform:'scale(3.6)',opacity:0}],{duration:900,delay,easing:'cubic-bezier(.2,.7,.2,1)',fill:'both'}));
  const N=24;
  for(let i=0;i<N;i++){
    const ang=i/N*Math.PI*2,far=i%2===0,dist=S*(far?1.9:1.25),size=far?14:9,col=cols[i%3];
    mk(`position:absolute;left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;margin:${-size/2}px 0 0 ${-size/2}px;background:${col};clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%);filter:drop-shadow(0 0 6px ${col})`,
      [{transform:'translate(0,0) rotate(0) scale(.2)',opacity:1},
       {transform:`translate(${Math.cos(ang+.35)*dist*.55}px,${Math.sin(ang+.35)*dist*.55}px) rotate(180deg) scale(1.2)`,opacity:1,offset:.45},
       {transform:`translate(${Math.cos(ang+.7)*dist}px,${Math.sin(ang+.7)*dist}px) rotate(360deg) scale(.1)`,opacity:0}],
      {duration:1300,delay:i*12,easing:'cubic-bezier(.15,.7,.25,1)',fill:'both'});
  }
}
/* اللوجو بيطلع لنص الشاشة، يلف لفتين وتطلع منه الزهرة، وبعدين يرجع مكانه */
function spin(el){
  if(busy)return;busy=true;
  const r=el.getBoundingClientRect(),S=Math.max(r.width,r.height),vw=innerWidth,vh=innerHeight;
  const layer=document.createElement('div');layer.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:99998;overflow:hidden';document.body.appendChild(layer);
  const clone=el.cloneNode(true);clone.removeAttribute('id');clone.style.cssText+=`;position:absolute;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;margin:0;transform-origin:center`;
  layer.appendChild(clone);el.style.visibility='hidden';
  const dx=vw/2-(r.left+r.width/2),dy=vh/2-(r.top+r.height/2),glow=(css.getPropertyValue('--accent').trim()||'#8eb0ff');
  const T=(x,y,rot,sc)=>`translate(${x}px,${y}px) rotate(${rot}deg) scale(${sc})`;
  const a=clone.animate([
    {transform:T(0,0,0,1),filter:'brightness(1)'},
    {transform:T(dx,dy,360,3),filter:`brightness(1.4) drop-shadow(0 0 18px ${glow})`,offset:.38,easing:'ease-out'},
    {transform:T(dx,dy,1080,3.4),filter:`brightness(1.6) drop-shadow(0 0 26px ${glow})`,offset:.62,easing:'cubic-bezier(.5,0,.3,1)'},
    {transform:T(0,0,1440,1),filter:'brightness(1)'}],
    {duration:2000,easing:'ease-in-out',fill:'forwards'});
  setTimeout(()=>burst(vw/2,vh/2,S*3,layer),620);
  a.onfinish=a.oncancel=()=>{layer.remove();el.style.visibility='';busy=false};
}
return spin;
})();
/* أنيميشن ٢: اللوجو يطلع لنص الشاشة ويقلب زي العملة (٣ قلبات)، وحواليه نقط منوّرة بتدور في ٣ مدارات، وبعدين موجة وهو يرجع مكانه */
const A_coin=(function(){
if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
let busy=false;
const cv=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
function orbits(cx,cy,S,layer){
  const cols=[cv('--accent')||'#8eb0ff',cv('--blue')||'#5c8dff',cv('--green')||'#5bd6ad'];
  [[1.5,-1,0],[2.0,1,.3],[2.5,-1,.6]].forEach(([k,dir,del],ri)=>{
    const R=S*k,n=10;
    const ring=document.createElement('div');
    ring.style.cssText=`position:absolute;left:${cx}px;top:${cy}px;width:${R*2}px;height:${R*2}px;margin:${-R}px 0 0 ${-R}px;border-radius:50%;border:1px dashed ${cols[ri]}66`;
    layer.appendChild(ring);
    ring.animate([{opacity:0,transform:'scale(.3)'},{opacity:1,transform:'scale(1)',offset:.25},{opacity:1,transform:'scale(1)',offset:.75},{opacity:0,transform:'scale(1.6)'}],{duration:1900,delay:del*300,fill:'both',easing:'ease-out'});
    const spinner=document.createElement('div');
    spinner.style.cssText=`position:absolute;left:${cx}px;top:${cy}px;width:0;height:0`;layer.appendChild(spinner);
    for(let i=0;i<n;i++){
      const a=i/n*Math.PI*2,d=document.createElement('div'),sz=ri===1?9:7;
      d.style.cssText=`position:absolute;left:${Math.cos(a)*R-sz/2}px;top:${Math.sin(a)*R-sz/2}px;width:${sz}px;height:${sz}px;border-radius:50%;background:${cols[ri]};box-shadow:0 0 10px 2px ${cols[ri]}`;
      spinner.appendChild(d);
    }
    spinner.animate([{transform:'rotate(0) scale(.3)',opacity:0},{transform:`rotate(${dir*180}deg) scale(1)`,opacity:1,offset:.3},{transform:`rotate(${dir*540}deg) scale(1)`,opacity:1,offset:.75},{transform:`rotate(${dir*720}deg) scale(.1)`,opacity:0}],{duration:1900,delay:del*300,fill:'both',easing:'cubic-bezier(.4,0,.3,1)'});
  });
}
function shock(cx,cy,S,layer){
  const c=cv('--accent')||'#8eb0ff';
  [0,120].forEach(dl=>{const d=document.createElement('div');d.style.cssText=`position:absolute;left:${cx}px;top:${cy}px;width:${S}px;height:${S}px;margin:${-S/2}px 0 0 ${-S/2}px;border-radius:50%;border:4px solid ${c};box-shadow:0 0 30px ${c}`;layer.appendChild(d);
    d.animate([{transform:'scale(.7)',opacity:.9},{transform:'scale(6)',opacity:0}],{duration:800,delay:dl,easing:'cubic-bezier(.1,.6,.2,1)',fill:'both'})});
}
function flip(el){
  if(busy)return;busy=true;
  const r=el.getBoundingClientRect(),S=Math.max(r.width,r.height),vw=innerWidth,vh=innerHeight;
  const layer=document.createElement('div');layer.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:99998;overflow:hidden;perspective:900px';document.body.appendChild(layer);
  const clone=el.cloneNode(true);clone.removeAttribute('id');clone.style.cssText+=`;position:absolute;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;margin:0;transform-style:preserve-3d;backface-visibility:visible`;
  layer.appendChild(clone);el.style.visibility='hidden';
  const dx=vw/2-(r.left+r.width/2),dy=vh/2-(r.top+r.height/2),g=cv('--accent')||'#8eb0ff';
  const T=(x,y,ry,sc)=>`translate(${x}px,${y}px) rotateY(${ry}deg) scale(${sc})`;
  const a=clone.animate([
    {transform:T(0,0,0,1),filter:'brightness(1)'},
    {transform:T(dx,dy,180,2.6),filter:`brightness(1.3) drop-shadow(0 0 16px ${g})`,offset:.22,easing:'ease-out'},
    {transform:T(dx,dy,1260,3.3),filter:`brightness(1.7) drop-shadow(0 0 30px ${g})`,offset:.7,easing:'cubic-bezier(.3,.1,.3,1)'},
    {transform:T(dx,dy,1440,3.6),filter:`brightness(2) drop-shadow(0 0 40px ${g})`,offset:.78},
    {transform:T(0,0,1440,1),filter:'brightness(1)'}],
    {duration:2300,easing:'ease-in-out',fill:'forwards'});
  setTimeout(()=>orbits(vw/2,vh/2,S*1.6,layer),380);
  setTimeout(()=>shock(vw/2,vh/2,S*1.6,layer),1780);
  a.onfinish=a.oncancel=()=>{layer.remove();el.style.visibility='';busy=false};
}
return flip;
})();
/* أنيميشن اللوجو: لما تدوس عليه يلف لفتين ويطلع منه زهرة نجوم وحلقات ملوّنة، وبعدين يرجع مكانه بنطّة */
const A_cross=(function(){
if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
let busy=false;
const css=getComputedStyle(document.documentElement);
function burst(cx,cy,S,layer){
  const cols=['--accent','--blue','--accent'].map(v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#8eb0ff');
  const mk=(c,kf,opt)=>{const d=document.createElement('div');d.style.cssText=c;layer.appendChild(d);return d.animate(kf,opt)};
  [0,160].forEach((delay,i)=>mk(`position:absolute;left:${cx}px;top:${cy}px;width:${S}px;height:${S}px;margin:${-S/2}px 0 0 ${-S/2}px;border-radius:50%;border:3px solid ${cols[i]}`,
    [{transform:'scale(.8)',opacity:.9},{transform:'scale(3.6)',opacity:0}],{duration:900,delay,easing:'cubic-bezier(.2,.7,.2,1)',fill:'both'}));
  const N=24;
  for(let i=0;i<N;i++){
    const ang=i/N*Math.PI*2,far=i%2===0,dist=S*(far?1.9:1.25),size=far?20:13,col=cols[i%3];
    mk(`position:absolute;left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;margin:${-size/2}px 0 0 ${-size/2}px;background:${col};clip-path:polygon(41.0% 41.0%,41.0% 14.0%,31.0% 14.0%,31.0% 3.0%,46.0% 3.0%,50.0% 8.0%,54.0% 3.0%,69.0% 3.0%,69.0% 14.0%,59.0% 14.0%,59.0% 41.0%,59.0% 41.0%,86.0% 41.0%,86.0% 31.0%,97.0% 31.0%,97.0% 46.0%,92.0% 50.0%,97.0% 54.0%,97.0% 69.0%,86.0% 69.0%,86.0% 59.0%,59.0% 59.0%,59.0% 59.0%,59.0% 86.0%,69.0% 86.0%,69.0% 97.0%,54.0% 97.0%,50.0% 92.0%,46.0% 97.0%,31.0% 97.0%,31.0% 86.0%,41.0% 86.0%,41.0% 59.0%,41.0% 59.0%,14.0% 59.0%,14.0% 69.0%,3.0% 69.0%,3.0% 54.0%,8.0% 50.0%,3.0% 46.0%,3.0% 31.0%,14.0% 31.0%,14.0% 41.0%,41.0% 41.0%);filter:drop-shadow(0 0 6px ${col})`,
      [{transform:'translate(0,0) rotate(0) scale(.2)',opacity:1},
       {transform:`translate(${Math.cos(ang+.35)*dist*.55}px,${Math.sin(ang+.35)*dist*.55}px) rotate(180deg) scale(1.2)`,opacity:1,offset:.45},
       {transform:`translate(${Math.cos(ang+.7)*dist}px,${Math.sin(ang+.7)*dist}px) rotate(360deg) scale(.1)`,opacity:0}],
      {duration:1300,delay:i*12,easing:'cubic-bezier(.15,.7,.25,1)',fill:'both'});
  }
}
/* اللوجو بيطلع لنص الشاشة، يلف لفتين وتطلع منه الزهرة، وبعدين يرجع مكانه */
function spin(el){
  if(busy)return;busy=true;
  const r=el.getBoundingClientRect(),S=Math.max(r.width,r.height),vw=innerWidth,vh=innerHeight;
  const layer=document.createElement('div');layer.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:99998;overflow:hidden';document.body.appendChild(layer);
  const clone=el.cloneNode(true);clone.removeAttribute('id');clone.style.cssText+=`;position:absolute;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;margin:0;transform-origin:center`;
  layer.appendChild(clone);el.style.visibility='hidden';
  const dx=vw/2-(r.left+r.width/2),dy=vh/2-(r.top+r.height/2),glow=(css.getPropertyValue('--accent').trim()||'#8eb0ff');
  const T=(x,y,rot,sc)=>`translate(${x}px,${y}px) rotate(${rot}deg) scale(${sc})`;
  const a=clone.animate([
    {transform:T(0,0,0,1),filter:'brightness(1)'},
    {transform:T(dx,dy,360,3),filter:`brightness(1.4) drop-shadow(0 0 18px ${glow})`,offset:.38,easing:'ease-out'},
    {transform:T(dx,dy,1080,3.4),filter:`brightness(1.6) drop-shadow(0 0 26px ${glow})`,offset:.62,easing:'cubic-bezier(.5,0,.3,1)'},
    {transform:T(0,0,1440,1),filter:'brightness(1)'}],
    {duration:2000,easing:'ease-in-out',fill:'forwards'});
  setTimeout(()=>burst(vw/2,vh/2,S*3,layer),620);
  a.onfinish=a.oncancel=()=>{layer.remove();el.style.visibility='';busy=false};
}
return spin;
})();

/* ---------- اختيار أنيميشن اللوجو (المسؤول بيختار من الإعدادات) ---------- */
(function(){
const MODES={stars:A_stars,coin:A_coin,cross:A_cross};
const lsG=()=>{try{return localStorage.getItem('x-logo')}catch{return null}},lsS=m=>{try{localStorage.setItem('x-logo',m)}catch{}};
let mode=lsG()||'stars';
document.addEventListener('click',e=>{const el=e.target.closest&&e.target.closest('.brand-mark,.wl');if(!el)return;const f=MODES[mode];if(f)f(el)});
window.xLogo={list:[['none','بدون أنيميشن'],['stars','⭐ زهرة نجوم'],['coin','🪙 قلبة عملة ومدارات'],['cross','✝️ صلبان قبطية']],set:m=>{mode=m},get:()=>mode};
let done=false;const t=setInterval(async()=>{
  if(done||typeof db==='undefined'||!db||typeof currentUser==='undefined'||!currentUser)return;done=true;clearInterval(t);
  try{const r=await db.from('app_settings').select('value').eq('key','logo_anim').maybeSingle(),m=(r.data&&r.data.value&&r.data.value.mode)||'stars';mode=m;lsS(m)}catch{}
},700);
})();
