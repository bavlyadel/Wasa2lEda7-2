/* v5: إشعارات إجبارية + تذكير المكلّفين (إعداداته في صفحة الإعدادات) + حذف طلبات الحسابات */
(function(){
const $$q=(s,r=document)=>r.querySelector(s);
const isAdm=()=>currentProfile&&currentProfile.role==='admin';
let required=true;

/* ---------- 1) الإشعارات إجبارية ---------- */
async function pushState(){
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent),st=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  const ok='serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
  if(ios&&!st)return 'ios';
  if(!ok)return 'unsupported';
  if(Notification.permission==='denied')return 'denied';
  if(Notification.permission!=='granted')return 'default';
  try{const r=await navigator.serviceWorker.getRegistration();const s=r&&await r.pushManager.getSubscription();return s?'ok':'default'}catch{return 'default'}
}
const TXT={
  default:['لازم تفعّل إشعارات الموبايل عشان توصلك التكليفات والردود والتذكيرات. اضغط الزرار واختار «سماح».','🔔 فعّل الإشعارات الآن'],
  denied:['الإشعارات متقفلة للموقع ده في المتصفح. افتح إعدادات المتصفح ← إعدادات الموقع ← الإشعارات ← اختار «سماح»، وبعدها حدّث الصفحة.','🔄 حدّثت الإعدادات، حدّث الصفحة'],
  ios:['على الآيفون: افتح الموقع في Safari، اضغط زرار المشاركة ثم «إضافة إلى الشاشة الرئيسية»، افتح الموقع من الأيقونة الجديدة، وبعدها فعّل الإشعارات.',null],
  unsupported:['المتصفح ده مش بيدعم الإشعارات. افتح الموقع من Chrome (أندرويد) أو Safari (آيفون) وجرّب تاني.',null]
};
function clearGate(){const g=$('x-pushgate');if(g)g.remove();document.body.style.overflow=''}
function showGate(s){
  let g=$('x-pushgate');
  if(g&&g.dataset.s===s)return;
  if(!g){g=document.createElement('div');g.id='x-pushgate';g.style.cssText='position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(5,8,20,.9);backdrop-filter:blur(6px);overflow:auto';document.body.appendChild(g)}
  g.dataset.s=s;document.body.style.overflow='hidden';
  const [m,b]=TXT[s]||TXT.default;
  g.innerHTML=`<div class="panel pad stack" style="max-width:460px;text-align:center"><h2>🔔 الإشعارات إجبارية</h2><p>${m}</p>${b?`<button class="btn primary" id="x-pg-go" type="button">${b}</button>`:''}<small class="muted" id="x-pg-msg"></small><button class="btn ghost" id="x-pg-out" type="button">تسجيل الخروج</button></div>`;
  const go=$('x-pg-go');
  if(go)go.onclick=()=>{
    if(s==='denied')return location.reload();
    const on=$('x-push-on');
    if(on)on.click();else $('x-pg-msg').textContent='استنى لحظة وجرّب تاني.';
  };
  $('x-pg-out').onclick=()=>{const o=$('logout');if(o)o.click()};
}
async function tick(){
  if(typeof currentUser==='undefined'||!currentUser||!currentProfile||currentProfile.approved===false||!required){clearGate();return}
  const s=await pushState();
  if(s==='ok')clearGate();else showGate(s);
}
async function loadReq(){
  try{const r=await db.from('app_settings').select('value').eq('key','push_required').maybeSingle();required=!(r.data&&r.data.value&&r.data.value.on===false)}catch{}
}

/* ---------- 2) تشغيل التذكير التلقائي (لو pg_cron مش متفعّل، الموقع بيشغّله كل 10 دقايق على الأكتر) ---------- */
async function remind(){
  if(!currentUser||!currentProfile)return;
  const k='x-rem-last',n=Date.now();let l=0;
  try{l=+localStorage.getItem(k)||0}catch{}
  if(n-l<600000)return;
  try{localStorage.setItem(k,String(n))}catch{}
  try{await db.rpc('send_reminders',{p_force:false})}catch{}
  try{await db.rpc('send_reg_reminders',{p_force:false})}catch{}
}

/* ---------- 3) صفحة الإعدادات: التذكير + إجبار الإشعارات ---------- */
const HRS=[[1,'كل ساعة'],[3,'كل ٣ ساعات'],[6,'كل ٦ ساعات'],[12,'كل ١٢ ساعة'],[24,'كل يوم'],[48,'كل يومين'],[72,'كل ٣ أيام']];
const DAYS=[[1,'يوم'],[2,'يومين'],[3,'٣ أيام'],[5,'٥ أيام'],[7,'أسبوع'],[14,'أسبوعين']];
async function injectSet(el){
  if(!isAdm()||el.querySelector('#x-rem'))return;
  el.dataset.xr='1';
  const s=await db.from('app_settings').select('key,value').in('key',['reminder','push_required','reg_reminder']);
  if(el.querySelector('#x-rem'))return;
  const st=Object.fromEntries((s.data||[]).map(r=>[r.key,r.value])),r=st.reminder||{},rg=st.reg_reminder||{},req=!(st.push_required&&st.push_required.on===false);
  const opt=(a,v)=>a.map(([k,t])=>`<option value="${k}" ${k==v?'selected':''}>${t}</option>`).join('');
  const last=r.last_run?new Date(r.last_run).toLocaleString('ar-EG'):'لسه محصلش';
  const box=document.createElement('div');box.id='x-rem';box.className='stack';
  box.innerHTML=`<hr style="border:0;border-top:1px solid var(--line);width:100%"><h2>⏰ تذكير المكلّفين بالخدمة</h2>
  <p class="muted">بيوصل إشعار لكل خادم مكلّف بخدمة قريبة، وبيتكرر كل فترة إنت بتحددها لحد ما تعدّي الخدمة.</p>
  <label class="chk"><input type="checkbox" id="rm-on" ${r.on?'checked':''}> تفعيل التذكير التلقائي</label>
  <div class="two-col"><label>التكرار<select id="rm-h">${opt(HRS,r.hours||24)}</select></label><label>للخدمات اللي في خلال<select id="rm-d">${opt(DAYS,r.days||7)}</select></label></div>
  <div class="row-btns"><button class="btn primary" id="rm-save" type="button">حفظ</button><button class="btn" id="rm-now" type="button">🔔 ذكّر المكلّفين دلوقتي</button></div>
  <p class="muted" id="rm-last">آخر تذكير تلقائي: ${last}</p><p class="message" id="rm-msg"></p>
  <hr style="border:0;border-top:1px solid var(--line);width:100%"><h2>📝 تذكير تسجيل الجمعة</h2>
  <p class="muted">بيفكّر الخدام اللي لسه ما سجّلوش في «تسجيلي لجمعة» كل فترة، وبس وباب التسجيل مفتوح (لحد الأربع ١٢ ظهرًا).</p>
  <label class="chk"><input type="checkbox" id="rg-on" ${rg.on?'checked':''}> تفعيل التذكير التلقائي</label>
  <label>التكرار<select id="rg-h">${opt(HRS,rg.hours||12)}</select></label>
  <div class="row-btns"><button class="btn primary" id="rg-save" type="button">حفظ</button><button class="btn" id="rg-now" type="button">🔔 ذكّر اللي ما سجّلوش دلوقتي</button></div>
  <p class="muted">آخر تذكير تلقائي: ${rg.last_run?new Date(rg.last_run).toLocaleString('ar-EG'):'لسه محصلش'}</p><p class="message" id="rg-msg"></p>
  <hr style="border:0;border-top:1px solid var(--line);width:100%"><h2>🔔 الإشعارات الإجبارية</h2>
  <label class="chk"><input type="checkbox" id="pr-on" ${req?'checked':''}> إجبار كل المستخدمين على تفعيل إشعارات الموبايل قبل استخدام الموقع</label><p class="message" id="pr-msg"></p>`;
  el.appendChild(box);
  const say=(id,t,e)=>{const m=$(id);m.textContent=t;m.classList.toggle('error',!!e)};
  $('rm-save').onclick=async()=>{const x=await db.rpc('set_reminder',{p_on:$('rm-on').checked,p_hours:+$('rm-h').value,p_days:+$('rm-d').value});say('rm-msg',x.error?x.error.message:'تم الحفظ.',!!x.error)};
  $('rm-now').onclick=async()=>{
    if(!confirm('إرسال تذكير فوري لكل المكلّفين بخدمات الفترة دي؟'))return;
    const x=await db.rpc('send_reminders',{p_force:true});
    say('rm-msg',x.error?x.error.message:(x.data?`تم إرسال ${x.data} تذكير.`:'مفيش مكلّفين بخدمات في الفترة دي.'),!!x.error)};
  $('rg-save').onclick=async()=>{const x=await db.rpc('set_reg_reminder',{p_on:$('rg-on').checked,p_hours:+$('rg-h').value});say('rg-msg',x.error?x.error.message:'تم الحفظ.',!!x.error)};
  $('rg-now').onclick=async()=>{
    if(!confirm('إرسال تذكير فوري لكل الخدام اللي لسه ما سجّلوش؟'))return;
    const x=await db.rpc('send_reg_reminders',{p_force:true});
    say('rg-msg',x.error?x.error.message:(x.data?`تم إرسال ${x.data} تذكير.`:'الكل مسجّل، مفيش حد يتذكّر.'),!!x.error)};
  $('pr-on').onchange=async e=>{const x=await db.rpc('set_setting',{p_key:'push_required',p_value:{on:e.target.checked}});
    say('pr-msg',x.error?x.error.message:'تم الحفظ.',!!x.error);if(!x.error){required=e.target.checked;tick()}else e.target.checked=!e.target.checked};
}

/* ---------- 4) اعتماد الحسابات: زرار حذف ---------- */
function injectAppr(el){
  if(!isAdm())return;
  el.querySelectorAll('article.request-item').forEach(a=>{
    if(a.querySelector('[data-xdel]'))return;
    const ok=a.querySelector('[data-ok]');if(!ok)return;
    const b=document.createElement('button');b.className='btn ghost';b.type='button';b.dataset.xdel=ok.dataset.ok;b.textContent='🗑 حذف';
    ok.parentElement.appendChild(b);
    b.onclick=async()=>{
      if(!confirm('حذف طلب الحساب ده نهائيًا؟ الحساب هيتمسح بالكامل، وصاحبه يقدر يسجّل من جديد بنفس الإيميل.'))return;
      b.disabled=true;const x=await db.rpc('delete_account_request',{p_id:b.dataset.xdel});
      if(x.error){b.disabled=false;return alert(x.error.message)}
      refreshData();
    };
  });
  const n=el.querySelectorAll('.status.rejected').length,bulk=el.querySelector('#x-del-rej');
  if(n&&!bulk){
    const d=document.createElement('div');d.id='x-del-rej';d.className='row-btns';
    d.innerHTML=`<button class="btn" type="button">🗑 حذف كل المرفوضة (${n})</button>`;
    el.querySelector('h2')?.after(d);
    d.firstChild.onclick=async()=>{
      if(!confirm(`حذف ${n} حساب مرفوض نهائيًا؟`))return;
      const x=await db.rpc('delete_rejected_accounts');if(x.error)return alert(x.error.message);refreshData();
    };
  }else if(!n&&bulk)bulk.remove();
}

setInterval(()=>{
  if(typeof currentProfile==='undefined'||!currentProfile)return;
  const a=$('x-appr');if(a&&a.offsetParent)injectAppr(a);
  const s=$('x-set');if(s&&s.offsetParent)injectSet(s);
},700);
setInterval(tick,2500);

const orig=refreshData;
refreshData=async function(){await orig();await loadReq();tick();remind()};
if(typeof currentUser!=='undefined'&&currentUser)refreshData();
})();
