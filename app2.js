/* إضافات: تعديل الخدمات، أكتر من خادم، تكرار، تناول، تسجيل المواعيد، توزيع تلقائي، إشعارات، أرقام المسؤولين */
(function(){
const iso=d=>d.toLocaleDateString('sv'), E=escapeHtml, admin=()=>currentProfile&&currentProfile.role==='admin';
// توقيت القاهرة: الجمعة الجاية، وباب التسجيل بيتقفل الأربع الساعة 12 ظهرًا
const cairo=()=>{const f=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23',weekday:'short'}).formatToParts(new Date());const g=t=>f.find(x=>x.type===t).value;return{y:+g('year'),m:+g('month'),d:+g('day'),h:+g('hour'),dow:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(g('weekday'))}};
const nextFri=()=>{const c=cairo(),k=(5-c.dow+7)%7;return new Date(Date.UTC(c.y,c.m-1,c.d+k)).toISOString().slice(0,10)};
const regOpen=()=>{const c=cairo(),k=(5-c.dow+7)%7;return k>2||(k===2&&c.h<12)};
// الخدمة بتخلص: الخدام بيتشالوا من الجدول تاني يوم الساعة 12 ظهرًا (توقيت القاهرة)
const expired=s=>{if(!s)return false;const c=cairo(),p=n=>String(n).padStart(2,'0'),today=`${c.y}-${p(c.m)}-${p(c.d)}`,nx=new Date(Date.UTC(+s.service_date.slice(0,4),+s.service_date.slice(5,7)-1,+s.service_date.slice(8,10)+1)).toISOString().slice(0,10);return today>nx||(today===nx&&c.h>=12)};
window.xExpired=expired;
let A=[],M=[],V=[];
// اللوجوهات
const bm=document.querySelector('.brand-mark');
if(bm)bm.outerHTML='<img src="assets/logo-wasael.png" alt="وسائل إيضاح">';
document.querySelector('.top-actions')?.insertAdjacentHTML('afterbegin','<img src="assets/logo-church.png" alt="الكنيسة"><span id="x-bell"></span>');

const orig=refreshData;
refreshData=async function(){ if(db&&currentUser){await db.rpc('clear_past_assignees');await db.rpc('roll_services')} await orig(); await extras(); };

async function extras(){
  if(!db||!currentUser)return; const T=nextFri();
  const [a,c,n,v]=await Promise.all([
    db.from('service_assignees').select('*'),
    db.from('contacts').select('*').order('name'),
    db.from('notifications').select('*').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(20),
    db.from('availability').select('*').eq('week_date',T)]);
  A=(a.data||[]).filter(x=>!expired(servicesCache.find(s=>s.id==x.service_id)));V=v.data||[];
  if(admin()){M=(await db.from('profiles').select('id,full_name,email,role').in('role',['server','admin'])).data||[];}
  table();bell(n.data||[]);panels(c.data||[],T);
}
function table(){
  $('stat-mine').textContent=A.filter(x=>x.user_id===currentUser.id).length;
  const hr=document.querySelector('#services-panel thead tr');if(hr&&hr.children.length<7)hr.insertAdjacentHTML('beforeend','<th>جمعة التناول</th>');
  if(admin()&&!$('reset-assign')){const rb=document.createElement('button');rb.id='reset-assign';rb.className='btn ghost';rb.textContent='تفضية الخدام من الجدول';rb.onclick=async()=>{
    if(!servicesCache.length)return alert('مفيش خدمات في الجدول.');
    if(!confirm('هتشيل كل الخدام من كل الخدمات في الجدول (المعتمدين والمسودة). الخدمات نفسها هتفضل زي ما هي. متأكد؟'))return;
    const r=await db.from('service_assignees').delete().in('service_id',servicesCache.map(s=>s.id));
    if(r.error)return alert(r.error.message);refreshData()};$('refresh').before(rb)}
  if(!servicesCache.length)return;
  $('services-body').innerHTML=servicesCache.slice().sort((a,b)=>(a.service_date+(a.service_time||'')).localeCompare(b.service_date+(b.service_time||''))).map(s=>{
    const names=A.filter(x=>x.service_id==s.id).map(x=>E(x.name)+(x.status=='draft'?' <small>(مسودة)</small>':'')).join('، ')||'—';
    const o=Math.ceil(+s.service_date.slice(8,10)/7);
    const comm=s.communion_n&&s.communion_n==o?' <span class="status approved">تناول</span>':'';
    return `<tr><td><strong>${E(s.title)}</strong>${comm}</td><td>${dateText(s.service_date)}</td><td>${E(t12(s.service_time))}</td><td>${E(s.location)}</td><td>${names}</td><td>${E(s.notes||'—')}${admin()?` <button class="btn ghost" data-edit="${s.id}">تعديل</button>`:''}</td><td>${E(communionText(s))}</td></tr>`}).join('');
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(b.dataset.edit));
}
function bell(n){
  const u=n.filter(x=>!x.read).length;
  $('x-bell').innerHTML=`<details class="bell"><summary>🔔 ${u?`<b>${u}</b>`:''}</summary><div class="bell-list">${n.map(x=>`<p>${E(x.body)}</p>`).join('')||'<p>لا توجد إشعارات.</p>'}</div></details>`;
  $('x-bell').querySelector('details').ontoggle=async e=>{if(e.target.open&&u)await db.from('notifications').update({read:true}).eq('user_id',currentUser.id).eq('read',false)};
}
const notify=(ids,body)=>ids.length?db.from('notifications').insert(ids.map(user_id=>({user_id,body}))):null;

function panels(contacts,T){
  let box=$('x-panels');
  if(!box){box=document.createElement('div');box.id='x-panels';$('admin-panel').before(box)}
  const mine=V.find(x=>x.user_id===currentUser.id)||{}, svs=servicesCache.filter(s=>s.service_date==T);
  const open=regOpen()||admin();
  const closedHtml=`<section class="panel pad stack"><h2>تسجيلي لجمعة ${dateText(T)}</h2><p class="message error" style="font-size:14px;line-height:1.9">اتأخرت عن الحد المسموح للتسجيل في جدول الجمعة (آخر ميعاد الأربع الساعة 12 ظهرًا). وتتعوّض الجمعة اللي جاية بإذن المسيح 🙏</p><p class="muted">${mine.user_id?(mine.coming?'تسجيلك الحالي: نازل':'تسجيلك الحالي: معذور'):'ما سجّلتش للجمعة دي.'}</p></section>`;
  let h='';
  if(window.isStaff)h+=open?`<section class="panel pad stack"><h2>تسجيلي لجمعة ${dateText(T)}</h2><p class="muted">آخر ميعاد للتسجيل: الأربع الساعة 12 ظهرًا.</p>
  <label>هتنزل؟<select id="av-c"><option value="1">نازل</option><option value="0">معذور</option></select></label>
  <div id="av-extra" class="stack"><div class="two-col"><label>فاضي من<input id="av-f" type="time"></label><label>لحد<input id="av-t" type="time"></label></div>
  <label>خدمة بترشحها<select id="av-s"><option value="">أي خدمة</option>${svs.map(s=>`<option value="${s.id}">${E(s.title)} — ${E(t12(s.service_time))}</option>`).join('')}</select></label></div>
  <label>ملاحظة<input id="av-n"></label><button class="btn primary" id="av-save">حفظ</button><p id="av-m" class="message"></p></section>`:closedHtml;
  h+=`<section class="panel pad"><h2>أرقام المسؤولين</h2>${contacts.map(c=>`<p>${E(c.name)}: <a href="tel:${E(c.phone)}">${E(c.phone)}</a> · <a href="https://wa.me/${E(c.phone.replace(/\D/g,''))}">واتساب</a>${admin()?` <button class="btn ghost" data-delc="${c.id}">حذف</button>`:''}</p>`).join('')||'<p class="empty">لا توجد أرقام.</p>'}
  ${admin()?'<div class="two-col"><input id="c-n" placeholder="الاسم"><input id="c-p" placeholder="رقم التليفون"></div><button class="btn" id="c-add">إضافة رقم</button>':''}</section>`;
  if(admin())h+=`<section class="panel pad"><h2>إدارة جدول ${dateText(T)}</h2><div class="row-btns"><button class="btn primary" id="auto">توزيع تلقائي (مسودة)</button><button class="btn" id="appr">اعتماد الجدول وإشعار الخدام</button><button class="btn ghost" id="clr-draft">تصفية المسودة</button></div>
  <h3>المسجّلين (${V.length})</h3>${V.map(v=>`<p>${E(v.name)} — ${v.coming?`${t12(v.from_time)} → ${t12(v.to_time)}`:'معذور'} ${E(v.note||'')}</p>`).join('')||'<p class="empty">لسه محدش سجّل.</p>'}</section>`;
  box.innerHTML=h;
  if(window.isStaff&&open){
  $('av-c').value=mine.coming===false?'0':'1';$('av-f').value=(mine.from_time||'').slice(0,5);$('av-t').value=(mine.to_time||'').slice(0,5);$('av-s').value=mine.suggested_service||'';$('av-n').value=mine.note||'';
  const tg=()=>$('av-extra').classList.toggle('hidden',$('av-c').value==='0');$('av-c').onchange=tg;tg();
  $('av-save').onclick=async()=>{const r=await db.from('availability').upsert({user_id:currentUser.id,name:currentProfile.full_name||currentUser.email,week_date:T,coming:$('av-c').value=='1',from_time:$('av-c').value=='1'?($('av-f').value||null):null,to_time:$('av-c').value=='1'?($('av-t').value||null):null,suggested_service:$('av-c').value=='1'?($('av-s').value||null):null,note:$('av-n').value||null},{onConflict:'user_id,week_date'});message('av-m',r.error?r.error.message:'تم الحفظ.',!!r.error)};
  }
  if(admin()){
    $('c-add').onclick=async()=>{if($('c-n').value&&$('c-p').value){await db.from('contacts').insert({name:$('c-n').value,phone:$('c-p').value});refreshData()}};
    box.querySelectorAll('[data-delc]').forEach(b=>b.onclick=async()=>{await db.from('contacts').delete().eq('id',b.dataset.delc);refreshData()});
    $('auto').onclick=()=>auto(T,svs);$('clr-draft').onclick=async()=>{
      const n=A.filter(x=>x.status=='draft').length;if(!n)return alert('مفيش مسودة.');
      if(!confirm(`هتتمسح المسودة (${n} تكليف). التكليفات المعتمدة مش هتتأثر. متأكد؟`))return;
      const r=await db.from('service_assignees').delete().eq('status','draft');if(r.error)return alert(r.error.message);refreshData()};$('appr').onclick=()=>approve(svs);
  }
}
async function auto(T,svs){
  const ok=V.filter(v=>v.coming), load={}, busy={}, mins=t=>{const[h,m]=t.split(':');return h*60+ +m};
  const rows=[];
  for(const s of svs.slice().sort((a,b)=>(a.service_time||'').localeCompare(b.service_time||''))){
    const have=A.filter(x=>x.service_id==s.id&&x.status=='approved').length, t=mins(s.service_time||'00:00');
    const c=ok.filter(v=>(!v.from_time||mins(v.from_time)<=t)&&(!v.to_time||t<=mins(v.to_time))&&!(busy[v.user_id]||[]).some(b=>Math.abs(b-t)<90))
      .sort((a,b)=>((b.suggested_service==s.id)-(a.suggested_service==s.id))||((load[a.user_id]||0)-(load[b.user_id]||0)));
    c.slice(0,Math.max(0,(s.needed||1)-have)).forEach(v=>{rows.push({service_id:s.id,user_id:v.user_id,name:v.name,status:'draft'});load[v.user_id]=(load[v.user_id]||0)+1;(busy[v.user_id]=busy[v.user_id]||[]).push(t)});
  }
  await db.from('service_assignees').delete().eq('status','draft').in('service_id',svs.map(s=>s.id));
  if(rows.length)await db.from('service_assignees').insert(rows);
  alert(`تم توزيع ${rows.length} خادم كمسودة. راجعها وعدّلها بزرار "تعديل" ثم اعتمدها.`);refreshData();
}
async function approve(svs){
  const d=A.filter(x=>x.status=='draft'&&svs.some(s=>s.id==x.service_id));
  if(!d.length)return alert('مفيش مسودة للاعتماد.');
  await db.from('service_assignees').update({status:'approved'}).in('id',d.map(x=>x.id));
  for(const x of d){const s=svs.find(s=>s.id==x.service_id);if(x.user_id)await notify([x.user_id],`تم تكليفك بخدمة ${s.title} يوم ${dateText(s.service_date)} الساعة ${t12(s.service_time)}`)}
  alert('تم اعتماد الجدول وإشعار الخدام.');refreshData();
}
function edit(id){
  const s=servicesCache.find(x=>x.id==id), cur=A.filter(x=>x.service_id==id);
  let d=$('x-dlg');if(!d){d=document.createElement('dialog');d.id='x-dlg';document.body.append(d)}
  d.innerHTML=`<div class="stack"><h3>تعديل الخدمة</h3>
  <label>الاسم<input id="e-t" value="${E(s.title)}"></label>
  <div class="two-col"><label>التاريخ<input id="e-d" type="date" value="${s.service_date}"></label><label>الميعاد<input id="e-h" type="time" value="${(s.service_time||'').slice(0,5)}"></label></div>
  <label>المكان<input id="e-l" value="${E(s.location)}"></label>
  <div class="two-col"><label>عدد الخدام المطلوب<input id="e-need" type="number" min="1" value="${s.needed||1}"></label><label>تتكرر كل (يوم)<input id="e-rep" type="number" min="0" placeholder="7 = أسبوعي" value="${s.repeat_days||''}"></label></div>
  <label>جمعة التناول (1-4)<input id="e-com" type="number" min="0" max="4" value="${s.communion_n||''}"></label>
  <label>ملاحظات<input id="e-n" value="${E(s.notes||'')}"></label>
  <b>الخدام</b>${M.map(m=>`<label class="chk"><input type="checkbox" value="${m.id}" ${cur.some(x=>x.user_id==m.id)?'checked':''}> ${E(m.full_name||m.email)}</label>`).join('')}
  <label>أسماء من غير حساب (اسم في كل سطر)<textarea id="e-x" rows="2">${E(cur.filter(x=>!x.user_id).map(x=>x.name).join('\n'))}</textarea></label>
  <div class="row-btns"><button class="btn primary" id="e-save">حفظ</button><button class="btn ghost" id="e-close">إلغاء</button><button class="btn" id="e-del">حذف الخدمة</button></div></div>`;
  d.showModal();$('e-close').onclick=()=>d.close();
  $('e-del').onclick=async()=>{if(confirm('حذف الخدمة نهائيًا؟')){await db.from('services').delete().eq('id',id);d.close();refreshData()}};
  $('e-save').onclick=async()=>{
    const p={title:$('e-t').value.trim(),service_date:$('e-d').value,service_time:$('e-h').value,location:$('e-l').value.trim(),notes:$('e-n').value.trim()||null,needed:+$('e-need').value||1,repeat_days:+$('e-rep').value||null,communion_n:+$('e-com').value||null};
    const r=await db.from('services').update(p).eq('id',id);if(r.error)return alert(r.error.message);
    const st=cur.length&&cur.every(x=>x.status=='draft')?'draft':'approved';
    const ids=[...d.querySelectorAll('input[type=checkbox]:checked')].map(c=>c.value), nm=u=>{const m=M.find(m=>m.id==u);return m.full_name||m.email};
    const rows=ids.map(u=>({service_id:id,user_id:u,name:nm(u),status:st})).concat($('e-x').value.split('\n').map(x=>x.trim()).filter(Boolean).map(name=>({service_id:id,name,status:st})));
    await db.from('service_assignees').delete().eq('service_id',id);
    if(rows.length)await db.from('service_assignees').insert(rows);
    if(st=='approved')await notify(ids.filter(u=>!cur.some(x=>x.user_id==u)),`تم تكليفك بخدمة ${p.title} يوم ${dateText(p.service_date)}`);
    d.close();refreshData();
  };
}
})();
