/* إشعارات الموبايل (Web Push) */
(function(){
const VAPID_PUBLIC="BMa7_J4BkESXZZyn8Lq3INyRxo0lKN_wAfK3l9zx21SmX-hmCHcydfM9NBgCyLWNJHmVsFVmFvx9dxI-xT5f-rg";
const ok='serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
const ios=/iphone|ipad|ipod/i.test(navigator.userAgent), standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
const b64=s=>{const p='='.repeat((4-s.length%4)%4),r=atob((s+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(r,c=>c.charCodeAt(0))};
const ab=buf=>btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
document.querySelector('.top-actions')?.querySelector('#x-bell')?.insertAdjacentHTML('afterend','<span id="x-push"></span>');

// عند تسجيل الخروج نفصل الجهاز عن الحساب عشان إشعارات الحساب القديم ما توصلش
if(typeof db!=='undefined'&&db){const so=db.auth.signOut.bind(db.auth);
  db.auth.signOut=async(...a)=>{try{const s=await reg();const sub=s&&await s.pushManager.getSubscription();if(sub)await db.rpc('remove_push_sub',{p_endpoint:sub.endpoint})}catch{}return so(...a)}}

const reg=async()=>{if(!ok)return null;try{return await navigator.serviceWorker.register('sw.js')}catch{return null}};
async function save(sub){const j=sub.toJSON();return db.rpc('save_push_sub',{p_endpoint:j.endpoint,p_p256dh:j.keys.p256dh,p_auth:j.keys.auth})}
async function enable(){
  const msg=$('x-push-msg');
  try{
    const perm=await Notification.requestPermission();
    if(perm!=='granted'){if(msg)msg.textContent='لازم تسمح بالإشعارات من إعدادات المتصفح.';return}
    const r=await reg();await navigator.serviceWorker.ready;
    let sub=await r.pushManager.getSubscription();
    if(!sub)sub=await r.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(VAPID_PUBLIC)});
    const e=(await save(sub)).error;if(e)throw e;
    render(true);
  }catch(err){if(msg)msg.textContent='تعذر التفعيل: '+(err.message||err)}
}
async function disable(){
  try{const r=await reg();const sub=r&&await r.pushManager.getSubscription();
    if(sub){await db.rpc('remove_push_sub',{p_endpoint:sub.endpoint});await sub.unsubscribe()}}catch{}
  render(false);
}
function render(on){
  const el=$('x-push');if(!el)return;
  if(!ok||(ios&&!standalone)){
    el.innerHTML=ios&&!standalone?'<button class="btn ghost" id="x-push-help" type="button">📲 إشعارات الموبايل</button>':'';
    const h=$('x-push-help');if(h)h.onclick=()=>alert('على الآيفون: افتح الموقع في Safari، اضغط زرار المشاركة ثم "إضافة إلى الشاشة الرئيسية"، افتح الموقع من الأيقونة الجديدة، وبعدها فعّل الإشعارات من نفس الزرار.');
    return;
  }
  el.innerHTML=on?'<button class="btn ghost" id="x-push-off" type="button" title="إيقاف إشعارات الموبايل">📲 شغالة ✓</button>':'<button class="btn" id="x-push-on" type="button">📲 فعّل إشعارات الموبايل</button><small id="x-push-msg" class="muted"></small>';
  const a=$('x-push-on'),c=$('x-push-off');if(a)a.onclick=enable;if(c)c.onclick=()=>{if(confirm('إيقاف إشعارات الموبايل على الجهاز ده؟'))disable()};
}
async function init(){
  if(!currentUser)return;
  if(!ok){render(false);return}
  if(ios&&!standalone){render(false);return}
  let on=false;
  if(Notification.permission==='granted'){
    const r=await reg();const sub=r&&await r.pushManager.getSubscription();
    if(sub){on=!(await save(sub)).error}   // نربط الجهاز بالحساب الحالي
  }
  render(on);
}

// فيديوهات الشرح جوه الموقع: للأعضاء وللخدام (المسؤول يشوف الاتنين)
function guides(){
  if(!currentProfile||$('x-guides'))return;
  const r=currentProfile.role,list=[];
  if(r==='member'||r==='admin')list.push(['شرح استخدام الموقع للأعضاء','assets/member-guide.mp4?v=1']);
  if(r==='server'||r==='admin')list.push(['شرح استخدام الموقع للخدام','assets/server-guide.mp4?v=1']);
  if(!list.length)return;
  const box=document.createElement('section');box.id='x-guides';box.className='panel pad stack';
  box.innerHTML=list.map(([t,src])=>`<details><summary style="cursor:pointer;font-weight:700">▶ ${t} (فيديو)</summary><video controls preload="none" playsinline style="width:100%;max-width:900px;margin-top:.8rem;border-radius:12px" src="${src}"></video></details>`).join('');
  document.querySelector('#app-view .welcome-row')?.after(box);
}
const orig=refreshData;let done=null;
refreshData=async function(){await orig();guides();if(done!==(currentUser&&currentUser.id)){done=currentUser&&currentUser.id;await init()}else if(!$('x-push')?.innerHTML)render(false)};
if(currentUser)refreshData(); // لو app.js خلّص تحميل البيانات قبل تشغيل الإضافات
})();

/* مُختار وقت بنظام 12 ساعة (ساعة : دقيقة ص/م) بدل خانة الوقت الأصلية اللي بتتبع إعدادات الموبايل */
(function(){
const proto=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
const AR=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
function twelve(inp){
  if(inp.dataset.t12)return;inp.dataset.t12='1';
  const req=inp.required;inp.required=false;inp.style.display='none';
  const wrap=document.createElement('span');wrap.className='t12';wrap.style.cssText='display:flex;gap:6px;align-items:center;direction:rtl';
  const mk=(opts,first)=>{const s=document.createElement('select');s.style.cssText='flex:1;min-width:0;width:auto';s.innerHTML=`<option value="">${first}</option>`+opts.map(([v,t])=>`<option value="${v}">${t}</option>`).join('');return s};
  const h=mk([...Array(12)].map((_,i)=>[i+1,AR(i+1)]),'ساعة'),m=mk([...Array(12)].map((_,i)=>[i*5,AR(String(i*5).padStart(2,'0'))]),'دقيقة'),
        ap=mk([['AM','ص'],['PM','م']],'ص/م');
  h.required=req;h.setAttribute('aria-label','الساعة');m.setAttribute('aria-label','الدقيقة');ap.setAttribute('aria-label','صباحًا أو مساءً');
  wrap.append(h,m,ap);inp.after(wrap);
  const read=()=>proto.get.call(inp);
  function show(v){
    const mt=/^(\d{1,2}):(\d{2})/.exec(v||'');
    if(!mt){h.value=m.value=ap.value='';return}
    let H=+mt[1],M=+mt[2];ap.value=H>=12?'PM':'AM';H=H%12||12;h.value=H;
    if(![...m.options].some(o=>o.value==String(M))){const o=document.createElement('option');o.value=M;o.textContent=AR(String(M).padStart(2,'0'));m.append(o)}
    m.value=M;
  }
  function push(){
    let v='';
    if(h.value&&ap.value){let H=+h.value%12;if(ap.value==='PM')H+=12;v=String(H).padStart(2,'0')+':'+String(+(m.value||0)).padStart(2,'0')}
    proto.set.call(inp,v);inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}));
  }
  [h,m,ap].forEach(s=>s.addEventListener('change',push));
  Object.defineProperty(inp,'value',{get(){return read()},set(v){proto.set.call(inp,v);show(v)},configurable:true});
  show(read());
}
const scan=()=>document.querySelectorAll('input[type=time]').forEach(twelve);
new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});scan();
})();
