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
