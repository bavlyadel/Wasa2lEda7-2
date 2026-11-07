/* أنيميشن اللوجو: لما تدوس عليه يلف لفتين ويطلع منه زهرة نجوم وحلقات ملوّنة، وبعدين يرجع مكانه بنطّة */
(function(){
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
document.addEventListener('click',e=>{const el=e.target.closest&&e.target.closest('.brand-mark,.wl');if(el)spin(el)});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('.brand-mark,.wl'))spin(e.target)});
})();
