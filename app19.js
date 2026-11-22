/* v19: تطبيق (PWA): تسجيل الـ service worker + زرار «ثبّت التطبيق» + تنبيه الأوفلاين + تنبيه نسخة جديدة */
(function(){
const $=id=>document.getElementById(id);
const lsG=k=>{try{return localStorage.getItem(k)}catch{return null}},lsS=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
const standalone=()=>matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: minimal-ui)').matches||navigator.standalone===true;
const ios=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
let dp=null;

/* ---- service worker + تنبيه نسخة جديدة ---- */
if('serviceWorker' in navigator){
  window.addEventListener('load',async()=>{
    try{
      const reg=await navigator.serviceWorker.register('sw.js');
      const had=!!navigator.serviceWorker.controller;
      reg.addEventListener('updatefound',()=>{const w=reg.installing;if(!w)return;w.addEventListener('statechange',()=>{if(w.state==='installed'&&had)toast('🔄 فيه نسخة جديدة من التطبيق','تحديث',()=>location.reload())})});
    }catch{}
  });
}

/* ---- toast صغير ---- */
function toast(msg,btn,fn){
  let t=$('x-toast');if(t)t.remove();
  t=document.createElement('div');t.id='x-toast';t.setAttribute('role','status');
  t.innerHTML=`<span></span>${btn?'<button type="button" class="btn primary"></button>':''}<button type="button" class="btn ghost" aria-label="إغلاق">✕</button>`;
  t.querySelector('span').textContent=msg;
  if(btn){const b=t.querySelector('.primary');b.textContent=btn;b.onclick=fn}
  t.querySelector('.ghost').onclick=()=>t.remove();document.body.appendChild(t);
}

/* ---- أوفلاين ---- */
function net(){let b=$('x-offline');
  if(navigator.onLine){if(b)b.remove();return}
  if(!b){b=document.createElement('div');b.id='x-offline';b.textContent='📴 مفيش إنترنت دلوقتي — اللي قدامك ممكن يكون قديم';document.body.appendChild(b)}}
addEventListener('online',net);addEventListener('offline',net);net();

/* ---- زرار التثبيت ---- */
function btn(){
  let b=$('x-install');
  if(standalone()||(!dp&&!ios)){if(b)b.remove();return}
  if(b)return;const bar=document.querySelector('.top-actions');if(!bar)return;
  b=document.createElement('button');b.id='x-install';b.type='button';b.className='btn ghost';b.textContent='📲 ثبّت التطبيق';
  b.onclick=async()=>{
    if(dp){dp.prompt();try{await dp.userChoice}catch{}dp=null;btn();return}
    iosHelp();
  };
  bar.prepend(b);
}
function iosHelp(){
  const d=document.createElement('dialog');d.className='x-dlg';
  d.innerHTML=`<h3 style="margin-top:0">📲 تثبيت التطبيق على الآيفون</h3>
   <ol style="line-height:2;padding-inline-start:20px"><li>افتح الموقع في <b>Safari</b> (مش من جوه تطبيق تاني).</li><li>اضغط زرار المشاركة <b>⬆️</b> تحت.</li><li>اختار <b>«إضافة إلى الشاشة الرئيسية»</b> (Add to Home Screen).</li><li>اضغط <b>إضافة</b>، وهتلاقي «وسائل إيضاح» بين تطبيقاتك.</li></ol>
   <div class="row-btns"><button class="btn primary" type="button">تمام</button></div>`;
  document.body.appendChild(d);d.addEventListener('close',()=>d.remove());d.querySelector('button').onclick=()=>d.close();d.showModal();
}
addEventListener('beforeinstallprompt',e=>{e.preventDefault();dp=e;btn()});
addEventListener('appinstalled',()=>{dp=null;const b=$('x-install');if(b)b.remove();toast('✅ اتثبّت التطبيق')});
setInterval(btn,1500);
})();
