/* قايمة جانبية + فهرس الخدام + اعتماد الحسابات + إدارة فيديوهات الشرح + ضبط الموبايل */
(function(){
const $$=(s,r=document)=>[...r.querySelectorAll(s)], E=escapeHtml;
const role=()=>currentProfile&&currentProfile.role, isAdmin=()=>role()==='admin', isStaff=()=>role()==='admin'||role()==='server';
let dirOk=false,pendingN=0,view=sessionStorage.getItem('xview')||'home';

/* ---------- حقول التسجيل ---------- */
$$('.tab').forEach(b=>b.addEventListener('click',()=>{const s=b.dataset.tab==='signup';['service-field','keeper-field'].forEach(i=>$(i).classList.toggle('hidden',!s))}));
let t0=Date.now();$('auth-form').insertAdjacentHTML('beforeend','<input id="x-hp" class="x-hp" name="x_hp_field" tabindex="-1" autocomplete="off" aria-hidden="true">');
$$('.tab').forEach(b=>b.addEventListener('click',()=>{t0=Date.now()}));
document.addEventListener('submit',e=>{
  if(e.target.id!=='auth-form'||document.querySelector('.tab.active')?.dataset.tab!=='signup')return;
  if($('x-hp').value){e.preventDefault();e.stopImmediatePropagation();message('auth-message','تم إنشاء الحساب.');return}
  if(Date.now()-t0<3000){e.preventDefault();e.stopImmediatePropagation();message('auth-message','استنى ثواني وجرّب تاني.',true);return}
  const miss=[['full-name','الاسم الكامل'],['phone','رقم الموبايل'],['service-name','خادم بخدمة'],['service-keeper','أمين الخدمة']].filter(([i])=>!($(i).value||'').trim());
  if(miss.length){e.preventDefault();e.stopImmediatePropagation();message('auth-message','لازم تكمّل كل البيانات: '+miss.map(x=>x[1]).join('، '),true);$(miss[0][0]).focus()}
},true);
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
const bn=document.createElement('nav');bn.id='x-bnav';bn.className='hidden';document.body.append(bn);
const SHORT={home:'الرئيسية',requests:'طلباتي',directory:'الفهرس',contacts:'الأرقام'};
function buildBnav(){const ok=ITEMS.filter(shown).map(i=>i[0]),pick=['home','requests',ok.includes('directory')?'directory':'contacts'].filter(k=>ok.includes(k));
  bn.innerHTML=pick.map(k=>`<button type="button" class="${k===view?'on':''}" data-b="${k}"><span>${ITEMS.find(x=>x[0]===k)[1]}</span>${SHORT[k]}</button>`).join('')+'<button type="button" data-b="__menu"><span>☰</span>القايمة</button>';
  $$('[data-b]',bn).forEach(b=>b.onclick=()=>b.dataset.b==='__menu'?burger.click():go(b.dataset.b))}
function hero(){
  if(!currentProfile)return;let h=$('x-hero');
  if(!h){h=document.createElement('section');h.id='x-hero';h.dataset.v='home';const w=document.querySelector('#app-view .welcome-row');if(!w)return;w.after(h)}
  const c=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo'}).format(new Date());
  const s=(typeof servicesCache!=='undefined'?servicesCache:[]).filter(x=>x.service_date>=c).sort((a,b)=>(a.service_date+(a.service_time||'')).localeCompare(b.service_date+(b.service_time||'')))[0];
  const T=[['reg','✅','تسجيلي لجمعة'],['requests','📨','طلب جديد'],['tools','📦','الأدوات'],['directory','📇','الفهرس'],['secretariat','🏛','الأمانة العامة'],['contacts','📞','أرقام المسؤولين']].filter(([k])=>ITEMS.some(i=>i[0]===k&&shown(i)));
  h.innerHTML=(s&&isStaff()?`<div class="hero-card"><small>الخدمة الجاية</small><div class="hb">${E(s.title)}</div><div>${dateText(s.service_date)} · ${E(t12(s.service_time))}${s.location?' · '+E(s.location):''}</div>${isStaff()?'<div id="x-join" class="x-join"></div>':'<div class="row-btns"><button class="btn" id="hr-a">طلب جديد</button></div>'}</div>`:'')+`<div class="tiles">${T.map(([k,ic,t])=>`<button type="button" class="tile" data-tg="${k}"><b>${ic}</b>${t}</button>`).join('')}</div>`;
  $('hr-a')&&($('hr-a').onclick=()=>go('requests'));$$('[data-tg]',h).forEach(b=>b.onclick=()=>go(b.dataset.tg));
  if(s&&isStaff()&&window.xJoinRender)window.xJoinRender(s);   // زرار "عايز أنزل الخدمة دي" (app7.js)
}
const closeNav=()=>{nav.classList.remove('open');bg.classList.add('hidden')};
burger.onclick=()=>{nav.classList.toggle('open');bg.classList.toggle('hidden',!nav.classList.contains('open'))};
bg.onclick=closeNav;

const ALL=['member','server','admin'],STAFF=['server','admin'],ADM=['admin'];
const ITEMS=[
['home','📅','الرئيسية والجدول',ALL],
['reg','✅','تسجيلي لخدمة الجمعة',STAFF],
['requests','📨','طلباتي وطلب جديد',ALL],
['youth','🧑‍🤝‍🧑','التقديم للخدمة',ALL],
['complaints','💬','شكوى أو اقتراح',ALL],
['tools','📦','الأدوات والمخزن',STAFF],
['directory','📇','فهرس الخدام',ALL],
['secretariat','🏛','الأمانة العامة',ALL],
['contacts','📞','أرقام المسؤولين',ALL],
['video','▶️','فيديو الشرح',ALL],
['-','للمسؤول فقط','',ADM],
['approvals','🛡','اعتماد الحسابات',ADM],
['admin','⚙️','إدارة الموقع والجدول',ADM],
['settings','🎛','الفهرس والفيديو والقوايم',ADM]];
let menuCfg={};
const hiddenFor=(k,r)=>(menuCfg[k]||[]).includes(r)&&!(k==='settings'&&r==='admin');
const shown=i=>i[3].includes(role())&&!hiddenFor(i[0],role())&&(i[0]!=='directory'||dirOk);
function buildNav(){
  const ok=ITEMS.filter(shown);if(!ok.some(i=>i[0]===view))view=(ok.find(i=>i[0]!=='-')||['home'])[0];
  $('x-nav-list').innerHTML=ok.map(([k,ic,t])=>k==='-'?`<div class="x-sep">${ic}</div>`:`<button type="button" class="x-item ${k===view?'on':''}" data-v="${k}"><span>${ic}</span><span>${t}</span>${k==='approvals'&&pendingN?`<b class="x-badge">${pendingN}</b>`:''}</button>`).join('');
  $$('.x-item',nav).forEach(b=>b.onclick=()=>go(b.dataset.v));buildBnav();
}
window.xGo=go;
function go(v){view=v;try{sessionStorage.setItem('xview',v)}catch{}closeNav();buildNav();apply();if(v==='directory')loadDir();if(v==='secretariat')loadSec();if(v==='approvals')loadAppr();if(v==='settings')loadSet();scrollTo({top:0})}

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
const syncNav=()=>{const on=!$('app-view').classList.contains('hidden');nav.classList.toggle('hidden',!on);bn.classList.toggle('hidden',!on);document.body.classList.toggle('x-has-nav',on);if(!on)closeNav();if(on&&currentProfile){buildNav();sched()}};
new MutationObserver(syncNav).observe($('app-view'),{attributes:true,attributeFilter:['class']});

function ensure(id){let e=$(id);if(!e){e=document.createElement('section');e.id=id;e.className='panel pad stack';e.dataset.v={'x-dir':'directory','x-appr':'approvals','x-set':'settings','x-sec':'secretariat'}[id];$('app-view').insertBefore(e,document.querySelector('#app-view footer')||null)}return e}
const wa=p=>{let d=(p||'').replace(/\D/g,'');if(d.startsWith('0'))d='20'+d.slice(1);return 'https://wa.me/'+d};
const ct=p=>p.phone?`<div class="row-btns"><a class="btn" href="tel:${E(p.phone)}">اتصال</a><a class="btn ghost" href="${wa(p.phone)}" target="_blank" rel="noopener">واتساب</a></div>`:'';

/* ---------- فهرس الخدام ---------- */
let dirTab=0;
async function loadDir(){
  const el=ensure('x-dir'),r=await db.rpc('staff_directory');
  if(r.error){el.innerHTML='<h2>فهرس الخدام</h2><p class="empty">الفهرس غير متاح حاليًا.</p>';return}
  const d=r.data||[];let m=[];
  if(isAdmin()){m=(await db.rpc('members_directory')).data||[]}
  const tabs=isAdmin()?['الخدام','أعضاء الخدمات (للمسؤولين فقط)']:['الخدام'];if(dirTab>=tabs.length)dirTab=0;
  let body='';
  if(dirTab===0)body=`<div class="dir-grid">${d.map(p=>`<article class="request-item"><strong>${E(p.full_name||'—')}</strong>${p.role==='admin'?' <span class="status approved">مسؤول</span>':''}<p style="margin:6px 0 0">${p.service_name?'خادم بخدمة: '+E(p.service_name):''}${p.service_keeper?'<br>أمين الخدمة: '+E(p.service_keeper):''}</p>${ct(p)}</article>`).join('')||'<p class="empty">لا يوجد خدام في الفهرس.</p>'}</div>`;
  else{const g={};m.forEach(p=>{const k=(p.service_name||'').trim();(g[k]=g[k]||[]).push(p)});
    body=`<p class="muted">للمعرفة فقط، منفصل عن جدول الخدمات. التقسيم حسب اللي كتبه كل واحد في التسجيل.</p><div class="dir-grid">${Object.keys(g).sort().map(k=>`<div class="request-item"><div class="request-top"><strong>${E(k||'بدون خدمة')}</strong><span class="status">${g[k].length}</span></div>${g[k].map(p=>`<p style="margin:8px 0 0"><b>${E(p.full_name||'—')}</b> <span class="muted">${p.role==='server'?'(خادم)':'(عضو)'}</span>${p.service_keeper?'<br><span class="muted">أمين الخدمة: '+E(p.service_keeper)+'</span>':''}</p>${ct(p)}`).join('')}<div class="row-btns"><button class="btn ghost" data-rn="${E(k)}">تعديل اسم الخدمة</button></div></div>`).join('')||'<p class="empty">مفيش بيانات.</p>'}</div>`}
  el.innerHTML=`<h2>📇 فهرس الخدام</h2>${tabs.length>1?`<div class="row-btns">${tabs.map((t,i)=>`<button class="btn ${i===dirTab?'primary':'ghost'}" data-dt="${i}">${t}</button>`).join('')}</div>`:''}${body}`;
  $$('[data-dt]',el).forEach(b=>b.onclick=()=>{dirTab=+b.dataset.dt;loadDir()});
  $$('[data-rn]',el).forEach(b=>b.onclick=async()=>{const n=prompt('الاسم الجديد للخدمة (نفس الاسم لدمج خدمتين):',b.dataset.rn);if(n===null)return;const x=await db.rpc('rename_service',{p_old:b.dataset.rn,p_new:n});if(x.error)alert(x.error.message);else loadDir()});
}
async function loadSec(){
  const el=ensure('x-sec'),r=await db.from('secretariat').select('*').order('sort_order').order('created_at');
  if(r.error){el.innerHTML='<h2>🏛 الأمانة العامة</h2><p class="empty">غير متاح حاليًا.</p>';return}
  const d=r.data||[];
  el.innerHTML=`<h2>🏛 الأمانة العامة</h2><div class="dir-grid">${d.map(p=>`<article class="request-item"><strong>${E(p.name)}</strong><p style="margin:4px 0">${E(p.title)}</p>${ct(p)}${isAdmin()?`<div class="row-btns"><button class="btn ghost" data-se="${p.id}">تعديل</button><button class="btn ghost" data-sd="${p.id}">حذف</button></div>`:''}</article>`).join('')||'<p class="empty">لسه ما اتضافش حد.</p>'}</div>${isAdmin()?`<div class="request-item stack"><b>إضافة للأمانة</b><div class="two-col"><input id="se-n" placeholder="الاسم"><input id="se-t" placeholder="المنصب"></div><input id="se-p" placeholder="رقم التليفون (اختياري)" inputmode="tel"><button class="btn primary" id="se-add">إضافة</button></div>`:''}`;
  if(!isAdmin())return;
  $('se-add').onclick=async()=>{const n=$('se-n').value.trim(),t=$('se-t').value.trim();if(!n||!t)return alert('اكتب الاسم والمنصب');const x=await db.from('secretariat').insert({name:n,title:t,phone:$('se-p').value.trim()||null});if(x.error)alert(x.error.message);else loadSec()};
  $$('[data-sd]',el).forEach(b=>b.onclick=async()=>{if(confirm('حذف؟')){await db.from('secretariat').delete().eq('id',b.dataset.sd);loadSec()}});
  $$('[data-se]',el).forEach(b=>b.onclick=async()=>{const p=d.find(x=>x.id===b.dataset.se),n=prompt('الاسم',p.name);if(n===null)return;const t=prompt('المنصب',p.title);if(t===null)return;const ph=prompt('التليفون',p.phone||'');if(ph===null)return;const x=await db.from('secretariat').update({name:n.trim()||p.name,title:t.trim()||p.title,phone:ph.trim()||null}).eq('id',p.id);if(x.error)alert(x.error.message);else loadSec()});
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
  const dc=st.directory||{},aud=(k,t,on,ids)=>`<div class="request-item" data-aud="${k}"><label class="chk"><input type="checkbox" data-on ${on?'checked':''}> <b>إظهار الفهرس لـ ${t}</b></label><p class="muted" style="margin:6px 0">اختار الخدام اللي يظهروا لـ ${t}:</p>${(p.data||[]).map(x=>`<label class="chk"><input type="checkbox" data-who="${x.id}" ${ids.includes(x.id)?'checked':''}> ${E(x.full_name||x.email)}${x.role==='admin'?' (مسؤول)':''}</label>`).join('')}</div>`;
  el.innerHTML=`<h2>فهرس الخدام</h2><p class="muted">كل فئة بتشوف مجموعة مختلفة من الخدام. المسؤولين بيشوفوا الكل دايمًا.</p>${aud('servers','الخدام',dc.servers_on,dc.for_servers||[])}${aud('members','الأعضاء',dc.members_on,dc.for_members||[])}
  <hr style="border:0;border-top:1px solid var(--line);width:100%">
  <h2>فيديوهات الشرح</h2><p class="muted">ارفع فيديو (الحد الأقصى للملف في الخطة المجانية 50 ميجا) أو حط رابط فيديو مباشر (mp4). روابط يوتيوب ما بتشتغلش هنا.</p>
  ${GUIDES.map(([k,t,def])=>`<div class="request-item" data-g="${k}"><strong>${t}</strong><p class="muted" style="margin:6px 0">الحالي: ${E((st[k]&&st[k].url)||'الفيديو الافتراضي')}</p><input type="url" placeholder="https://…mp4" data-url><div class="row-btns"><button class="btn" data-save>حفظ الرابط</button><label class="btn ghost" style="cursor:pointer">رفع فيديو<input type="file" accept="video/*" hidden data-file></label><button class="btn ghost" data-reset>رجوع للافتراضي</button></div><p class="message" data-m></p></div>`).join('')}`;
  const RL=[['member','أعضاء'],['server','خدام'],['admin','مسؤولين']],cfg=(st.menu&&typeof st.menu==='object')?st.menu:{};
  el.insertAdjacentHTML('beforeend',`<hr style="border:0;border-top:1px solid var(--line);width:100%"><h2>ظهور القوايم</h2><p class="muted">شيل العلامة عشان تخفي القايمة عن الفئة دي. ده بيخفي البند من القايمة بس، وحماية البيانات نفسها بتفضل من السيرفر. قايمة الإعدادات دايمًا ظاهرة ليك كمسؤول.</p><div class="table-scroll"><table class="mm"><thead><tr><th>القايمة</th>${RL.map(r=>`<th>${r[1]}</th>`).join('')}</tr></thead><tbody>${ITEMS.filter(i=>i[0]!=='-').map(i=>`<tr><td>${i[1]} ${i[2]}</td>${RL.map(([r])=>{const can=i[3].includes(r),lock=i[0]==='settings'&&r==='admin',on=can&&(lock||!(cfg[i[0]]||[]).includes(r));return`<td><input type="checkbox" data-mk="${i[0]}" data-mr="${r}" ${on?'checked':''} ${!can||lock?'disabled':''}></td>`}).join('')}</tr>`).join('')}</tbody></table></div><p class="message" id="mm-msg"></p>`);
  $$('[data-mk]',el).forEach(c=>c.onchange=async()=>{const n={};$$('[data-mk]:not(:disabled)',el).forEach(x=>{if(!x.checked)(n[x.dataset.mk]=n[x.dataset.mk]||[]).push(x.dataset.mr)});
    const r=await db.rpc('set_setting',{p_key:'menu',p_value:n});message_($('mm-msg'),r.error?r.error.message:'تم الحفظ.',!!r.error);if(!r.error){menuCfg=n;buildNav()}});
  const sd=async()=>{const g=k=>{const b=el.querySelector(`[data-aud="${k}"]`);return{on:b.querySelector('[data-on]').checked,ids:[...b.querySelectorAll('[data-who]:checked')].map(x=>x.dataset.who)}},a=g('servers'),b=g('members');
    const r=await db.rpc('set_setting',{p_key:'directory',p_value:{servers_on:a.on,members_on:b.on,for_servers:a.ids,for_members:b.ids}});if(r.error)alert(r.error.message);else dirChanged()};
  $$('[data-aud] input',el).forEach(c=>c.onchange=sd);
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
  try{const ms=await db.from('app_settings').select('value').eq('key','menu').maybeSingle();menuCfg=(ms.data&&ms.data.value)||{}}catch{}
  saveSignup();dirOk=!!(await db.rpc('directory_access')).data;
  if(isAdmin()){const r=await db.from('profiles').select('id',{count:'exact',head:true}).eq('approved',false).eq('rejected',false);pendingN=r.count||0}
  buildNav();sched();
  hero();if(view==='directory')loadDir();if(view==='secretariat')loadSec();if(view==='approvals')loadAppr();if(view==='settings')loadSet();
};
syncNav();
})();
