/* نزول الخدمة: الخادم يطلب ينزل الخدمة الجاية، والمسؤول يوافق أو يعتذر.
   منفصل تمامًا عن "تسجيلي لخدمة الجمعة" (availability). الطلب بيتخزّن في service_requests بنوع 'نزول خدمة'. */
(function(){
const E=escapeHtml, TYPE='نزول خدمة';
const isAdmin=()=>currentProfile&&currentProfile.role==='admin', isServer=()=>currentProfile&&currentProfile.role==='server';
let mine=[],pend=[],loaded=false,nextS=null;

/* ---------- كارت الخدمة الجاية ---------- */
window.xJoinRender=function(s){nextS=s||null;paint()};
function paint(){
  const box=$('x-join');if(!box||!nextS)return;
  if(!loaded){box.innerHTML='';return}
  if(isAdmin()){
    const n=pend.length;
    box.innerHTML=`<p class="xj-say">${n?`📥 طلبات النزول المستنية ردّك: ${n}`:'مفيش طلبات نزول جديدة 🙏'}</p><div class="row-btns"><button class="btn" id="xj-adm" type="button">راجع طلبات النزول للخدمة</button></div>`;
    $('xj-adm').onclick=()=>window.xGo&&window.xGo('admin');return;
  }
  const r=mine.find(x=>x.service_id==nextS.id);
  if(!r){
    box.innerHTML=`<p class="xj-say">نفسك تنزل الخدمة دي؟ 🙏</p><div class="row-btns"><button class="btn" id="xj-go" type="button">🙋 عايز أنزل الخدمة دي</button></div><small>طلبك بيوصل للمسؤول، وهيرد عليك بالموافقة أو الاعتذار.</small><p class="xj-err" id="xj-m"></p>`;
    $('xj-go').onclick=send;
  }else if(r.status==='approved'){
    box.innerHTML=`<div class="xj-state ok">✅ اتوافق على نزولك الخدمة دي، ربنا يبارك خدمتك 🙏</div>`;
  }else if(r.status==='rejected'){
    box.innerHTML=`<div class="xj-state no">المسؤول اعتذر عن نزولك الخدمة دي المرة دي 🙏<br><small>لو محتاج توضيح كلّمه من «أرقام المسؤولين».</small></div>`;
  }else{
    box.innerHTML=`<div class="xj-state">⏳ طلبك وصل للمسؤول، مستنيين ردّه</div><div class="row-btns"><button class="btn xj-ghost" id="xj-x" type="button">إلغاء الطلب</button></div>`;
    $('xj-x').onclick=async()=>{if(!confirm('إلغاء طلب النزول للخدمة دي؟'))return;await db.from('service_requests').delete().eq('id',r.id).eq('status','pending');refreshData()};
  }
}
async function send(){
  const b=$('xj-go'),m=$('xj-m'),s=nextS;if(!b||!s)return;b.disabled=true;m.textContent='';
  const r=await db.from('service_requests').insert({user_id:currentUser.id,request_type:TYPE,service_id:s.id,details:`عايز أنزل «${s.title}» يوم ${dateText(s.service_date)}`});
  if(r.error&&r.error.code!=='23505'){b.disabled=false;m.textContent='تعذر إرسال الطلب: '+r.error.message;return}   // 23505 = الطلب اتبعت قبل كده
  await refreshData();
}

/* ---------- لوحة المسؤول (أول صفحة "إدارة الموقع والجدول") ---------- */
function panel(){
  if(!isAdmin()||!$('admin-panel'))return;
  let el=$('x-join-adm');
  if(!el){el=document.createElement('section');el.id='x-join-adm';el.className='panel pad stack';el.dataset.v='admin';$('admin-panel').before(el)}
  el.innerHTML=`<h2>🙋 طلبات النزول للخدمة${pend.length?` (${pend.length})`:''}</h2><p class="muted">خدام طلبوا ينزلوا خدمات معيّنة. الموافقة بتضيفهم على الخدمة في الجدول وبتوصلهم إشعار، والاعتذار بيوصلهم برضه.</p>`
   +(pend.map(r=>{const s=r.services||servicesCache.find(x=>x.id==r.service_id)||{},p=r.profiles||{};
     return `<article class="request-item"><div class="request-top"><strong>${E(p.full_name||p.email||'خادم')}</strong>${p.phone?`<a href="tel:${E(p.phone)}">${E(p.phone)}</a>`:''}</div><p>عايز ينزل: ${E(s.title||'—')}\n${dateText(s.service_date)} · ${E(t12(s.service_time))}</p><div class="request-controls"><button class="btn primary" type="button" data-xj="approved" data-id="${r.id}">موافقة ✓</button><button class="btn" type="button" data-xj="rejected" data-id="${r.id}">اعتذار</button></div></article>`}).join('')||'<p class="empty">مفيش طلبات نزول مستنية دلوقتي.</p>');
  el.querySelectorAll('[data-xj]').forEach(b=>b.onclick=()=>{b.parentElement.querySelectorAll('button').forEach(x=>x.disabled=true);decide(b.dataset.id,b.dataset.xj)});
}

/* القرار: موافقة = تتضاف على الخدمة (معتمد) + إشعار. اعتذار = إشعار. لو كانت موافقة وبعدين اترفضت بتتشال من الخدمة. */
async function decide(id,status){
  const q=await db.from('service_requests').select('id,user_id,service_id,status,profiles(full_name,email)').eq('id',id).maybeSingle(),r=q.data;
  if(!r){alert(q.error?q.error.message:'الطلب مش موجود.');return refreshData()}
  const u=await db.from('service_requests').update({status}).eq('id',id);if(u.error){alert(u.error.message);return refreshData()}
  const s=servicesCache.find(x=>x.id==r.service_id),nm=r.profiles?.full_name||r.profiles?.email||'خادم';
  if(status==='approved'){
    const ex=await db.from('service_assignees').select('id').eq('service_id',r.service_id).eq('user_id',r.user_id);
    const w=(ex.data||[]).length?await db.from('service_assignees').update({status:'approved'}).eq('service_id',r.service_id).eq('user_id',r.user_id)
      :await db.from('service_assignees').insert({service_id:r.service_id,user_id:r.user_id,name:nm,status:'approved'});
    if(w.error)alert('اتوافق على الطلب، بس تعذّرت إضافته للجدول: '+w.error.message);
  }else if(r.status==='approved'){
    await db.from('service_assignees').delete().eq('service_id',r.service_id).eq('user_id',r.user_id);
  }
  if(s&&status!=='pending')await db.from('notifications').insert({user_id:r.user_id,body:status==='approved'
    ?`تمت الموافقة على نزولك «${s.title}» يوم ${dateText(s.service_date)} الساعة ${t12(s.service_time)} 🙏 ربنا يبارك خدمتك`
    :`المسؤول اعتذر عن طلب نزولك «${s.title}» المرة دي 🙏`});
  refreshData();
}
// نفس القرار لو المسؤول ضغط من القايمة العامة لطلبات الأعضاء (app.js بيحط data-type على كل طلب)
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('#admin-requests [data-request]'),it=b&&b.closest('.request-item');
  if(!it||it.dataset.type!==TYPE)return;
  e.stopImmediatePropagation();e.preventDefault();decide(b.dataset.request,b.dataset.status);
},true);

/* ---------- تحميل البيانات بعد كل تحديث ---------- */
async function load(){
  if(!db||!currentUser||!currentProfile)return;
  if(!isServer()&&!isAdmin()){loaded=true;return}
  const [a,b]=await Promise.all([
    isServer()?db.from('service_requests').select('id,service_id,status,created_at').eq('user_id',currentUser.id).eq('request_type',TYPE).order('created_at',{ascending:false}):null,
    isAdmin()?db.from('service_requests').select('id,service_id,user_id,created_at,profiles(full_name,email,phone),services(title,service_date,service_time)').eq('request_type',TYPE).eq('status','pending').order('created_at',{ascending:true}):null]);
  mine=a?(a.data||[]):[];pend=b?(b.data||[]):[];loaded=true;
  paint();panel();
}
const orig=refreshData;
refreshData=async function(){await orig();await load()};
if(currentUser&&currentProfile)refreshData(); // لو app.js خلّص تحميل البيانات قبل تشغيل الإضافات
})();
