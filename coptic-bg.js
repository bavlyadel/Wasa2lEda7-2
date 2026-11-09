/* خلفيات قبطية للمواسم (بتشتغل مع المواسم بس): سنوي، صوم، آلام، قيامة، ميلاد. بتقف لو "تقليل الحركة" مفعّل */
(function(){
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,dpr=Math.min(devicePixelRatio||1,2);
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const rgba=(c,a)=>{c=(c||'#e3b658').trim();if(c[0]!=='#')return c;let h=c.slice(1);if(h.length===3)h=h.replace(/./g,'$&$&');return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${a})`};
const R=(a,b)=>a+Math.random()*(b-a);
/* الصليب القبطي: أذرع متساوية، كل ذراع نهايته عريضة وفي نصها فتحة */
const CROSS=(()=>{const a=.09,arm=[[-a,-a],[-a,-.36],[-.19,-.36],[-.19,-.47],[-.04,-.47],[0,-.42],[.04,-.47],[.19,-.47],[.19,-.36],[a,-.36],[a,-a]],p=new Path2D(),pts=[];
  for(let r=0;r<4;r++){const c=Math.cos(r*Math.PI/2),s=Math.sin(r*Math.PI/2);for(const [x,y] of arm)pts.push([x*c-y*s,x*s+y*c])}
  pts.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));p.closePath();
  const q=new Path2D();q.arc(0,0,.045,0,7);return{p,q}})();
function cross(ctx,x,y,size,rot,fill,alpha,ring){ctx.save();ctx.translate(x,y);ctx.rotate(rot||0);ctx.scale(size,size);ctx.globalAlpha=alpha;ctx.fillStyle=fill;ctx.fill(CROSS.p);
  if(ring){ctx.globalCompositeOperation='destination-out';ctx.globalAlpha=1;ctx.fill(CROSS.q)}ctx.restore()}
function star8(ctx,x,y,r,fill,alpha){ctx.save();ctx.translate(x,y);ctx.globalAlpha=alpha;ctx.fillStyle=fill;ctx.beginPath();for(let i=0;i<16;i++){const a=i*Math.PI/8-Math.PI/2,rr=i%2?r*.42:r;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}ctx.closePath();ctx.fill();ctx.restore()}
const GOLD='#e3b658';

const FX={
 annual(ctx,e){return{frame(){const T=Math.max(78,Math.min(e.W,e.H)/7),off=(e.t*7)%T;
   for(let r=-1;r<e.H/T+2;r++)for(let c=-1;c<e.W/T+2;c++){const x=c*T+(r%2?T/2:0)+off,y=r*T+off*.6,al=.08+.07*Math.sin(e.t*.9+(c+r)*.7);cross(ctx,x,y,T*.36,0,e.cols[0],al,true)}
   const g=ctx.createLinearGradient(0,e.H-90,0,e.H);g.addColorStop(0,rgba(e.cols[0],0));g.addColorStop(1,rgba(e.cols[0],.16));ctx.fillStyle=g;ctx.fillRect(0,e.H-90,e.W,90);ctx.globalAlpha=1}}},
 lent(ctx,e){let W_=[];return{
  resize(){W_=Array.from({length:14},()=>({x:R(0,e.W),y:R(e.H*.5,e.H+80),r:R(36,80),v:R(.25,.6),ph:R(0,7)}))},
  frame(){const m=Math.min(e.W,e.H),cx=e.W/2,cy=e.H*.5;
   cross(ctx,cx,cy,m*.85,0,e.cols[0],.07,true);
   ctx.lineWidth=1.5;[.52,.66,.82].forEach((k,i)=>{ctx.globalAlpha=.30-i*.06;ctx.strokeStyle=e.cols[0];ctx.setLineDash([10+i*6,14]);ctx.lineDashOffset=-e.t*(24+i*10)*(i%2?-1:1);ctx.beginPath();ctx.arc(cx,cy,m*k,0,7);ctx.stroke()});ctx.setLineDash([]);
   for(const w of W_){w.y-=w.v;if(w.y<-w.r){w.y=e.H+w.r;w.x=R(0,e.W)}const x=w.x+Math.sin(e.t*.7+w.ph)*28,g=ctx.createRadialGradient(x,w.y,0,x,w.y,w.r);g.addColorStop(0,'rgba(255,255,255,.10)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.globalAlpha=1;ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,w.y,w.r,0,7);ctx.fill()}ctx.globalAlpha=1}}},
 holy(ctx,e){return{frame(){const m=Math.min(e.W,e.H),cx=e.W/2,cy=e.H*.46,p=.5+.5*Math.sin(e.t*.9);
   const g=ctx.createRadialGradient(cx,cy,0,cx,cy,m*.8);g.addColorStop(0,`rgba(170,30,40,${.20+.10*p})`);g.addColorStop(1,'rgba(170,30,40,0)');ctx.fillStyle=g;ctx.fillRect(0,0,e.W,e.H);
   cross(ctx,cx,cy,m*.8,0,'#c9aeb1',.10+.05*p,true);
   const n=Math.max(5,Math.round(e.W/130));
   for(let i=0;i<n;i++){const x=(i+.5)*e.W/n,y=e.H-26,fl=.75+.25*Math.sin(e.t*7+i*2.3)*Math.sin(e.t*3.1+i),h=22*fl;
     ctx.globalAlpha=.55;ctx.fillStyle='#d9ccb8';ctx.fillRect(x-5,y,10,26);
     const gl=ctx.createRadialGradient(x,y-10,0,x,y-10,52);gl.addColorStop(0,`rgba(255,170,70,${.35*fl})`);gl.addColorStop(1,'rgba(255,170,70,0)');ctx.globalAlpha=1;ctx.fillStyle=gl;ctx.beginPath();ctx.arc(x,y-10,52,0,7);ctx.fill();
     ctx.fillStyle='#ffb347';ctx.beginPath();ctx.ellipse(x,y-h/2-2,5.5,h/2+3,0,0,7);ctx.fill();ctx.fillStyle='#fff3c4';ctx.beginPath();ctx.ellipse(x,y-h/2+1,2.6,h/3,0,0,7);ctx.fill()}
   ctx.globalAlpha=1}}},
 easter(ctx,e){let S=[];return{
  resize(){S=Array.from({length:46},()=>({x:R(0,e.W),y:R(0,e.H),v:R(.3,.9),r:R(3,8),ph:R(0,7)}))},
  frame(){const cx=e.W/2,cy=e.H*.3,m=Math.min(e.W,e.H),L=Math.hypot(e.W,e.H);
   ctx.save();ctx.translate(cx,cy);ctx.rotate(e.t*.05);for(let i=0;i<28;i+=2){const a0=i/28*Math.PI*2,a1=(i+1)/28*Math.PI*2,g=ctx.createRadialGradient(0,0,0,0,0,L*.8);g.addColorStop(0,rgba(GOLD,.30));g.addColorStop(1,rgba(GOLD,0));ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,L,a0,a1);ctx.closePath();ctx.fill()}ctx.restore();
   const g=ctx.createRadialGradient(cx,cy,0,cx,cy,m*.4);g.addColorStop(0,rgba('#fff2c0',.55));g.addColorStop(1,rgba(GOLD,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,m*.4,0,7);ctx.fill();
   cross(ctx,cx,cy,m*.3,0,GOLD,.55,true);
   for(const s of S){s.y-=s.v;if(s.y<-10){s.y=e.H+10;s.x=R(0,e.W)}const al=.3+.7*(.5+.5*Math.sin(e.t*3+s.ph));star8(ctx,s.x,s.y,s.r,GOLD,al*.75)}ctx.globalAlpha=1}}},
 nativity(ctx,e){let F=[];return{
  resize(){F=Array.from({length:48},()=>({x:R(0,e.W),y:R(0,e.H),v:R(.25,.7),r:R(7,17),ph:R(0,7),rot:R(0,6)}))},
  frame(){const cx=e.W/2,cy=e.H*.2,m=Math.min(e.W,e.H),p=.5+.5*Math.sin(e.t*1.4);
   const g=ctx.createRadialGradient(cx,cy,0,cx,cy,m*.5);g.addColorStop(0,rgba('#fff2c0',.45+.2*p));g.addColorStop(1,rgba(GOLD,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,m*.5,0,7);ctx.fill();
   ctx.save();ctx.translate(cx,cy);ctx.rotate(Math.sin(e.t*.3)*.08);ctx.fillStyle=rgba(GOLD,.35);ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(0,m*.9);ctx.lineTo(8,0);ctx.fill();ctx.restore();   /* شعاع النجمة */
   star8(ctx,cx,cy,m*.13+p*6,GOLD,.9);star8(ctx,cx,cy,m*.07,'#fff7d6',.95);
   for(const f of F){f.y+=f.v;f.rot+=.004;if(f.y>e.H+20){f.y=-20;f.x=R(0,e.W)}cross(ctx,f.x+Math.sin(e.t*.8+f.ph)*22,f.y,f.r*2.4,f.rot,'#ffffff',.30,false)}ctx.globalAlpha=1}}}
};
let cur=null,curMode=null;
function stop(){if(cur){cur();cur=null}}
function apply(mode){
  if(mode===curMode)return;curMode=mode;stop();if(!FX[mode])return;
  const cv=document.createElement('canvas');cv.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none';document.body.prepend(cv);
  const ctx=cv.getContext('2d'),e={W:0,H:0,t:0,cols:[]},th=()=>{e.cols=[css('--accent')||GOLD]},fx=FX[mode](ctx,e);
  const size=()=>{e.W=innerWidth;e.H=innerHeight;cv.width=e.W*dpr;cv.height=e.H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);fx.resize&&fx.resize()};
  let raf=0,alive=true;
  const loop=()=>{if(!alive)return;ctx.clearRect(0,0,e.W,e.H);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;fx.frame();e.t+=.022;if(!reduce&&!document.hidden)raf=requestAnimationFrame(loop)};
  const vis=()=>{if(!document.hidden&&!reduce){cancelAnimationFrame(raf);raf=requestAnimationFrame(loop)}};
  addEventListener('resize',size);document.addEventListener('visibilitychange',vis);
  const mo=new MutationObserver(()=>{th();if(reduce)loop()});mo.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  th();size();loop();
  cur=()=>{alive=false;cancelAnimationFrame(raf);removeEventListener('resize',size);document.removeEventListener('visibilitychange',vis);mo.disconnect();cv.remove()};
}
window.cBg={modes:Object.keys(FX),apply,stop:()=>{curMode=null;stop()}};
})();
