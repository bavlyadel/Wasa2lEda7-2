/* قايمة جانبية + فهرس الخدام + اعتماد الحسابات + إدارة فيديوهات الشرح + ضبط الموبايل */
(function(){
const $$=(s,r=document)=>[...r.querySelectorAll(s)], E=escapeHtml;
const role=()=>currentProfile&&currentProfile.role, isAdmin=()=>role()==='admin', isStaff=()=>role()==='admin'||role()==='server';
let dirOk=false,pendingN=0,view=sessionStorage.getItem('xview')||'home';

/* ---------- حقول التسجيل ---------- */
$$('.tab').forEach(b=>b.addEventListener('click',()=>{const s=b.dataset.tab==='signup';['service-field','keeper-field'].forEach(i=>$(i).classList.toggle('hidden',!s))}));
$('pending-logout')?.addEventListener('click',async()=>{if(db)await db.auth.signOut()});
async function saveSignup(){
  if(!db||!currentUser)return;const m=currentUser.user_metadata||{};if(!(m.service_name||m.service_keeper))return;
  const k='si-'+currentUser.id;try{if(localStorage.getItem(k))return}catch{}
  const r=await db.rpc('save_signup_info',{p_service:m.service_name||'',p_keeper:m.service_keeper||''});
  if(!r.error)try{localStorage.setItem(k,'1')}catch{}
}
window.xPending=saveSignup;

/* ---------- الهيدر واللوجوهات ---------- */
const burger=document.createElement('button');burger.id='x-burger';burger.type='button';burger.className='btn ghost';burger.setAttribute('aria-label','القايمة');burger.textContent='☰';
document.querySelector('.brand')?.prepend(burger);
const wr=document.querySelector('.welcome-row');
if(wr){wr.insertAdjacentHTML('afterbegin','<img class="wl" src="assets/logo-wasael.png" alt="">');wr.insertAdjacentHTML('beforeend','<img class="wl" src="assets/logo-church.png" alt="">')}

/* ---------- القايمة الجانبية ---------- */
const nav=document.createElement('aside');nav.id='x-nav';nav.className='x-nav hidden';
nav.innerHTML='<div id="x-nav-list"></div><div class="x-nav-foot" id="x-nav-foot"></div>';
const bg=document.createElement('div');bg.id='x-nav-bg';bg.className='hidden';
document.body.append(nav,bg);
const foot=$('x-nav-foot');
['user-label','x-push','logout'].forEach(i=>{const el=$(i)||document.getElementById(i);if(el)foot.append(el)});
const closeNav=()=>{nav.classList.remove('open');bg.classList.add('hidden')};
burger.onclick=()=>{nav.classList.toggle('open');bg.classList.toggle('hidden',!nav.classList.contains('open'))};
bg.onclick=closeNav;

const ITEMS=[
['home','📅','الرئيسية والجدول',()=>true],
['reg','✅','تسجيلي لخدمة الجمعة',()=>isStaff()],
['requests','📨','طلباتي وطلب جديد',()=>true],
['youth','🧑‍🤝‍🧑','التقديم للخدمة',()=>true],
['complaints','💬','شكوى أو اقتراح',()=>true],
['tools','📦','الأدوات والمخزن',()=>isStaff()],
['directory','📇','فهرس الخدام',()=>dirOk],
['contacts','📞','أرقام المسؤولين',()=>true],
['video','▶️','فيديو الشرح',()=>true],
['-','للمسؤول فقط','',()=>isAdmin()],
['approvals','🛡','اعتماد الحسابات',()=>isAdmin()],
['admin','⚙️','إدارة الموقع والجدول',()=>isAdmin()],
['settings','🎛','الفهرس والفيديو',()=>isAdmin()]];
function buildNav(){
  const ok=ITEMS.filter(i=>i[3]());if(!ok.some(i=>i[0]===view))view='home';
  $('x-nav-list').innerHTML=ok.map(([k,ic,t])=>k==='-'?`<div class="x-sep">${ic}</div>`:`<button type="button" class="x-item ${k===view?'on':''}" data-v="${k}"><span>${ic}</span><span>${t}</span>${k==='approvals'&&pendingN?`<b class="x-badge">${pendingN}</b>`:''}</button>`).join('');
  $$('.x-item',nav).forEach(b=>b.onclick=()=>go(b.dataset.v));
}
function go(v){view=v;try{sessionStorage.setItem('xview',v)}catch{}closeNav();buildNav();apply();if(v==='directory')loadDir();if(v==='approvals')loadAppr();if(v==='settings')loadSet();scrollTo({top:0})}

/* ---------- تقسيم الصفحة لأقسام ---------- */
const BY_ID={'x-guides':'video','stats':'home','services-heading':'home','services-panel':'home','admin-panel':'admin'};
const RULES=[['تسجيلي','reg'],['أرقام','contacts'],['إدارة جدول','admin'],['الشكاوى','complaints'],['شكوى','complaints'],['ملاحظات','complaints'],['تقديم للخدمة','youth'],['طلبات الشباب','youth'],['المخزن','tools'],['استلام وتسليم','tools'],['تكليفاتي','tools']];
function classify(el){
  if(el.dataset.v)return el.dataset.v;if(BY_ID[el.id])return BY_ID[el.id];
  if(el.classList.contains('welcome-row'))return 'home';if(el.classList.contains('member-grid'))return 'requests';
  const t=(el.querySelector('h2,summary')?.textContent||'');for(const[k,v]of RULES)if(t.includes(k))return v;return 'home';
}
let raf=0;function apply(){
  const app=$('app-view');if(!app||app.classList.contains('hidden'))return;
  [...app.children,...($('x-panels')?.children||[]),...($('x-p3')?.children||[])].forEach(el=>{
    if(['x-panels','x-p3'].includes(el.id)||el.tagName==='FOOTER')return;
    el.classList.toggle('xv-off',classify(el)!==view)});
  const L=['الخدمة','التاريخ','الميعاد','المكان','المكلّف','ملاحظات','جمعة التناول'];
  $$('#services-body tr').forEach(tr=>[...tr.children].forEach((td,i)=>{if(!td.classList.contains('empty'))td.dataset.label=L[i]||''}));
}
const sched=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(apply)};
new MutationObserver(sched).observe($('app-view'),{childList:true,subtree:true});
const syncNav=()=>{const on=!$('app-view').classList.contains('hidden');nav.classList.toggle('hidden',!on);document.body.classList.toggle('x-has-nav',on);if(!on)closeNav();if(on&&currentProfile){buildNav();sched()}};
new MutationObserver(syncNav).observe($('app-view'),{attributes:true,attributeFilter:['class']});

function ensure(id){let e=$(id);if(!e){e=document.createElement('section');e.id=id;e.className='panel pad stack';e.dataset.v={'x-dir':'directory','x-appr':'approvals','x-set':'settings'}[id];$('app-view').insertBefore(e,document.querySelector('#app-view footer')||null)}return e}
const wa=p=>'https://wa.me/'+(p||'').replace(/\D/g,'').replace(/^0/,'2');

/* ---------- فهرس الخدام ---------- */
async function loadDir(){
  const el=ensure('x-dir'),r=await db.rpc('staff_directory');
  if(r.error){el.innerHTML='<h2>فهرس الخدام</h2><p class="empty">الفهرس غير متاح حاليًا.</p>';return}
  const d=r.data||[];
  el.innerHTML=`<h2>فهرس الخدام (${d.length})</h2><div class="dir-grid">${d.map(p=>`<article class="request-item"><strong>${E(p.full_name||'—')}</strong>${p.role==='admin'?' <span class="status approved">مسؤول</span>':''}<p style="margin:6px 0 0">${p.service_name?'خادم بخدمة: '+E(p.service_name):''}${p.service_keeper?'<br>أمين الخدمة: '+E(p.service_keeper):''}</p>${p.phone?`<div class="row-btns"><a class="btn" href="tel:${E(p.phone)}">اتصال</a><a class="btn ghost" href="${wa(p.phone)}" target="_blank" rel="noopener">واتساب</a></div>`:''}</article>`).join('')||'<p class="empty">لا يوجد خدام في الفهرس.</p>'}</div>`;
}

/* ---------- اعتماد الحسابات ---------- */
async function loadAppr(){
  const el=ensure('x-appr'),r=await db.from('profiles').select('id,full_name,email,phone,service_name,service_keeper,rejected,role').eq('approved',false);
  if(r.error){el.innerHTML='<h2>اعتماد الحسابات</h2><p class="message error">'+E(r.error.message)+'</p>';return}
  const d=r.data||[];pendingN=d.filter(x=>!x.rejected).length;buildNav();
  el.innerHTML=`<h2>اعتماد الحسابات (${pendingN} بانتظار المراجعة)</h2><div class="request-list">${d.map(p=>`<article class="request-item"><div class="request-top"><strong>${E(p.full_name||p.email)}</strong><span class="status ${p.rejected?'rejected':'pending'}">${p.rejected?'مرفوض':'بانتظار المراجعة'}</span></div><p>${E(p.email||'')}${p.phone?' · '+E(p.phone):''}${p.service_name?'\nخادم بخدمة: '+E(p.service_name):''}${p.service_keeper?'\nأمين الخدمة: '+E(p.service_keeper):''}</p><div class="request-controls"><button class="btn primary" data-ok="${p.id}">اعتماد</button>${p.rejected?'':`<button class="btn" data-no="${p.id}">رفض</button>`}</div></article>`).join('')||'<p class="empty">مفيش حسابات بانتظار المراجعة.</p>'}</div>`;
  const act=(id,ok)=>async()=>{const x=await db.rpc('approve_profile',{p_id:id,p_ok:ok});if(x.error)return alert(x.error.message);loadAppr()};
  $$('[data-ok]',el).forEach(b=>b.onclick=act(b.dataset.ok,true));$$('[data-no]',el).forEach(b=>b.onclick=()=>confirm('رفض الحساب ده؟')&&act(b.dataset.no,false)());
}

/* ---------- إعدادات الفهرس والفيديو ---------- */
const GUIDES=[['guide_member','فيديو شرح الأعضاء','assets/member-guide.mp4'],['guide_server','فيديو شرح الخدام','assets/server-guide.mp4']];
async function loadSet(){
  const el=ensure('x-set');
  const [s,p]=await Promise.all([db.from('app_settings').select('key,value'),db.from('profiles').select('id,full_name,email,role,in_directory').in('role',['server','admin']).eq('approved',true)]);
  const st=Object.fromEntries((s.data||[]).map(r=>[r.key,r.value])),dir=st.directory||{};
  el.innerHTML=`<h2>فهرس الخدام</h2>
  <label class="chk"><input type="checkbox" id="s-en" ${dir.enabled?'checked':''}> إظهار الفهرس للخدام</label>
  <label class="chk"><input type="checkbox" id="s-mem" ${dir.members?'checked':''}> إظهاره للأعضاء كمان</label>
  <p class="muted">المسؤولين بيشوفوا الفهرس دايمًا. اختار مين يظهر فيه:</p>
  ${(p.data||[]).map(x=>`<label class="chk"><input type="checkbox" data-ind="${x.id}" ${x.in_directory?'checked':''}> ${E(x.full_name||x.email)} ${x.role==='admin'?'(مسؤول)':''}</label>`).join('')}
  <hr style="border:0;border-top:1px solid var(--line);width:100%">
  <h2>فيديوهات الشرح</h2><p class="muted">ارفع فيديو (الحد الأقصى للملف في الخطة المجانية 50 ميجا) أو حط رابط فيديو مباشر (mp4). روابط يوتيوب ما بتشتغلش هنا.</p>
  ${GUIDES.map(([k,t,def])=>`<div class="request-item" data-g="${k}"><strong>${t}</strong><p class="muted" style="margin:6px 0">الحالي: ${E((st[k]&&st[k].url)||'الفيديو الافتراضي')}</p><input type="url" placeholder="https://…mp4" data-url><div class="row-btns"><button class="btn" data-save>حفظ الرابط</button><label class="btn ghost" style="cursor:pointer">رفع فيديو<input type="file" accept="video/*" hidden data-file></label><button class="btn ghost" data-reset>رجوع للافتراضي</button></div><p class="message" data-m></p></div>`).join('')}`;
  const sd=async()=>{const r=await db.rpc('set_setting',{p_key:'directory',p_value:{enabled:$('s-en').checked,members:$('s-mem').checked}});if(r.error)alert(r.error.message);else dirChanged()};
  $('s-en').onchange=sd;$('s-mem').onchange=sd;
  $$('[data-ind]',el).forEach(c=>c.onchange=async()=>{const r=await db.rpc('set_in_directory',{p_id:c.dataset.ind,p_val:c.checked});if(r.error)alert(r.error.message)});
  $$('[data-g]',el).forEach(g=>{const k=g.dataset.g,m=g.querySelector('[data-m]');
    const save=async url=>{const r=await db.rpc('set_setting',{p_key:k,p_value:url?{url}:{}});message_(m,r.error?r.error.message:'تم الحفظ.',!!r.error);if(!r.error){$('x-guides')?.remove();refreshData();loadSet()}};
    g.querySelector('[data-save]').onclick=()=>{const u=g.querySelector('[data-url]').value.trim();if(!/^https:\/\//.test(u))return message_(m,'اكتب رابط يبدأ بـ https://',true);save(u)};
    g.querySelector('[data-reset]').onclick=()=>save('');
    g.querySelector('[data-file]').onchange=async e=>{const f=e.target.files[0];if(!f)return;message_(m,'جارٍ الرفع…');
      const path=`${k}-${Date.now()}.${(f.name.split('.').pop()||'mp4').toLowerCase()}`;
      const up=await db.storage.from('guides').upload(path,f,{contentType:f.type,upsert:true});
      if(up.error)return message_(m,'تعذر الرفع: '+up.error.message,true);
      save(db.storage.from('guides').getPublicUrl(path).data.publicUrl)};
  });
}
function message_(el,t,err){el.textContent=t;el.classList.toggle('error',!!err)}
async function dirChanged(){dirOk=!!(await db.rpc('directory_access')).data;buildNav()}

/* ---------- بعد كل تحديث للبيانات ---------- */
const orig=refreshData;
refreshData=async function(){
  await orig();if(!currentProfile)return;
  saveSignup();dirOk=!!(await db.rpc('directory_access')).data;
  if(isAdmin()){const r=await db.from('profiles').select('id',{count:'exact',head:true}).eq('approved',false).eq('rejected',false);pendingN=r.count||0}
  buildNav();sched();
  if(view==='directory')loadDir();if(view==='approvals')loadAppr();if(view==='settings')loadSet();
};
syncNav();
})();
