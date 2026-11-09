/* v11: الخلفيات المتحركة — المسؤول بيختار من الإعدادات أنهي واحدة تشتغل (أو بدون خلفية) */
(function(){
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,dpr=Math.min(devicePixelRatio||1,2);
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const LIST=[['none','بدون خلفية'],['aurora','🌌 أورورا (بقع ضوء هادية)'],['stars','✨ شبكة نجوم (بتتجاوب مع الماوس)'],['waves','🌊 موجات ناعمة'],['bubbles','🫧 فقاعات طايرة'],['fireflies','🌟 يراعات منوّرة']];
const rgba=(c,a)=>{c=(c||'#8eb0ff').trim();if(c[0]!=='#')return c;let h=c.slice(1);if(h.length===3)h=h.replace(/./g,'$&$&');return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${a})`};
const R=(a,b)=>a+Math.random()*(b-a);

const FX={
 stars(ctx,e){let P=[];return{
  resize(){const n=Math.round(Math.min(130,e.W*e.H/8000));P=Array.from({length:n},()=>({x:R(0,e.W),y:R(0,e.H),vx:R(-.17,.17),vy:R(-.17,.17),r:R(1.4,3.6),c:Math.floor(R(0,3))}))},
  frame(){const L=Math.min(150,Math.max(100,e.W/8));
   for(const p of P){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>e.W)p.vx*=-1;if(p.y<0||p.y>e.H)p.vy*=-1;const dx=p.x-e.mx,dy=p.y-e.my,d=Math.hypot(dx,dy);if(d<130){p.x+=dx/d*.9;p.y+=dy/d*.9}}
   ctx.lineWidth=1.4;
   for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){const a=P[i],b=P[j],d=Math.hypot(a.x-b.x,a.y-b.y);if(d<L){ctx.globalAlpha=(1-d/L)*.75;ctx.strokeStyle=e.cols[a.c];ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}}
   for(const p of P){ctx.globalAlpha=1;ctx.fillStyle=e.cols[p.c];ctx.shadowColor=e.cols[p.c];ctx.shadowBlur=14;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill()}
   ctx.shadowBlur=0;ctx.globalAlpha=1}}},
 waves(ctx,e){const W4=[[.55,26,.0042,.30,0,.16],[-.8,34,.0030,.22,1,.18],[1.1,22,.0058,.15,2,.16],[-.4,40,.0024,.08,0,.20]];return{frame(){
  const g=ctx.createRadialGradient(e.W*.5,e.H*1.05,0,e.W*.5,e.H*1.05,e.H*.9);g.addColorStop(0,rgba(e.cols[0],.22));g.addColorStop(1,rgba(e.cols[0],0));ctx.fillStyle=g;ctx.fillRect(0,0,e.W,e.H);
  for(const [sp,amp,k,pos,ci,al] of W4){const base=e.H*(1-pos);ctx.beginPath();ctx.moveTo(0,e.H);
   for(let x=0;x<=e.W;x+=8)ctx.lineTo(x,base+Math.sin(x*k+e.t*sp)*amp+Math.sin(x*k*2.3-e.t*sp*.7)*amp*.35);
   ctx.lineTo(e.W,e.H);ctx.closePath();const f=ctx.createLinearGradient(0,base-amp,0,e.H);f.addColorStop(0,rgba(e.cols[ci],al*1.8));f.addColorStop(1,rgba(e.cols[ci],al*.3));ctx.fillStyle=f;ctx.fill()}}}},
 bubbles(ctx,e){let B=[];const mk=(y)=>({x:R(0,e.W),y:y??R(0,e.H),r:R(6,34),vy:R(.25,.8),ph:R(0,7),sw:R(8,26),c:Math.floor(R(0,3))});return{
  resize(){B=Array.from({length:Math.round(Math.min(34,e.W/32))},()=>mk())},
  frame(){for(const b of B){b.y-=b.vy;if(b.y<-b.r*2){Object.assign(b,mk(e.H+b.r*2))}
   const x=b.x+Math.sin(e.t*.8+b.ph)*b.sw,g=ctx.createRadialGradient(x-b.r*.35,b.y-b.r*.35,b.r*.1,x,b.y,b.r);
   g.addColorStop(0,rgba(e.cols[b.c],.34));g.addColorStop(.7,rgba(e.cols[b.c],.10));g.addColorStop(1,rgba(e.cols[b.c],.04));
   ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,b.y,b.r,0,7);ctx.fill();ctx.strokeStyle=rgba(e.cols[b.c],.55);ctx.lineWidth=1.2;ctx.stroke();
   ctx.fillStyle='rgba(255,255,255,.45)';ctx.beginPath();ctx.arc(x-b.r*.38,b.y-b.r*.38,b.r*.14,0,7);ctx.fill()}}}},
 fireflies(ctx,e){let F=[];return{
  resize(){F=Array.from({length:Math.round(Math.min(60,e.W*e.H/16000))},()=>({x:R(0,e.W),y:R(0,e.H),a:R(0,6.3),sp:R(.25,.7),ph:R(0,7),r:R(2,4.5),c:Math.floor(R(0,3))}))},
  frame(){for(const f of F){f.a+=Math.sin(e.t*.6+f.ph)*.05;f.x+=Math.cos(f.a)*f.sp;f.y+=Math.sin(f.a)*f.sp;
   if(f.x<-20)f.x=e.W+20;if(f.x>e.W+20)f.x=-20;if(f.y<-20)f.y=e.H+20;if(f.y>e.H+20)f.y=-20;
   const al=.25+.75*(.5+.5*Math.sin(e.t*2.2+f.ph)),g=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r*7);
   g.addColorStop(0,rgba(e.cols[f.c],.8*al));g.addColorStop(.25,rgba(e.cols[f.c],.28*al));g.addColorStop(1,rgba(e.cols[f.c],0));
   ctx.fillStyle=g;ctx.beginPath();ctx.arc(f.x,f.y,f.r*7,0,7);ctx.fill();ctx.fillStyle=rgba('#ffffff',.9*al);ctx.beginPath();ctx.arc(f.x,f.y,f.r*.45,0,7);ctx.fill()}}}}
};

let cur=null,curMode=null,want=null,suspended=false;
function stop(){if(cur){cur();cur=null}}
function apply(mode){
  want=mode;if(suspended)return;
  if(mode===curMode)return;curMode=mode;stop();
  if(mode==='aurora'){const d=document.createElement('div');d.className='x-bg';d.innerHTML='<i></i><i></i><i></i>';document.body.prepend(d);cur=()=>d.remove();return}
  if(!FX[mode])return;
  const cv=document.createElement('canvas');cv.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none';document.body.prepend(cv);
  const ctx=cv.getContext('2d'),e={W:0,H:0,mx:-999,my:-999,t:0,cols:[]};
  const th=()=>{e.cols=[css('--accent')||'#8eb0ff',css('--blue')||'#5c8dff',css('--blue2')||'#5bd6ad']},fx=FX[mode](ctx,e);
  const size=()=>{e.W=innerWidth;e.H=innerHeight;cv.width=e.W*dpr;cv.height=e.H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);fx.resize&&fx.resize()};
  let raf=0,alive=true;
  const loop=()=>{if(!alive)return;ctx.clearRect(0,0,e.W,e.H);fx.frame();e.t+=.022;if(!reduce&&!document.hidden)raf=requestAnimationFrame(loop)};
  const pm=ev=>{e.mx=ev.clientX;e.my=ev.clientY},pl=()=>{e.mx=e.my=-999},vis=()=>{if(!document.hidden&&!reduce){cancelAnimationFrame(raf);raf=requestAnimationFrame(loop)}};
  addEventListener('resize',size);addEventListener('pointermove',pm);addEventListener('pointerleave',pl);document.addEventListener('visibilitychange',vis);
  const mo=new MutationObserver(()=>{th();if(reduce)loop()});mo.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  th();size();loop();
  cur=()=>{alive=false;cancelAnimationFrame(raf);removeEventListener('resize',size);removeEventListener('pointermove',pm);removeEventListener('pointerleave',pl);document.removeEventListener('visibilitychange',vis);mo.disconnect();cv.remove()};
}
window.xBg={list:LIST,apply,suspend(){suspended=true;curMode=null;stop()},restore(){if(!suspended)return;suspended=false;curMode=null;apply(want||lsGet()||'aurora')}};
const lsGet=()=>{try{return localStorage.getItem('x-bg')}catch{return null}},lsSet=m=>{try{localStorage.setItem('x-bg',m)}catch{}};
apply(lsGet()||'aurora');          // أول ما الصفحة تفتح (آخر اختيار متخزّن في المتصفح)
let synced=false;
const t=setInterval(async()=>{                              // بعد الدخول: بنجيب اختيار المسؤول من السيرفر
  if(synced||typeof db==='undefined'||!db||typeof currentUser==='undefined'||!currentUser)return;synced=true;clearInterval(t);
  try{const r=await db.from('app_settings').select('value').eq('key','background').maybeSingle(),m=(r.data&&r.data.value&&r.data.value.mode)||'aurora';lsSet(m);apply(m)}catch{}
},600);
})();
