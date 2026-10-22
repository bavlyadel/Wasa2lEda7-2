/* إضافات: تعديل الخدمات، أكتر من خادم، تكرار، تناول، تسجيل المواعيد، توزيع تلقائي، إشعارات، أرقام المسؤولين */
(function(){
// إضافة حقول (عدد الخدام / التكرار / جمعة التناول) داخل نموذج إضافة خدمة
(function addFields(){
  const notesLabel = document.querySelector('#service-notes')?.closest('label');
  if(!notesLabel || document.getElementById('service-needed')) return;
  const wrap=document.createElement('div'); wrap.className='two-col';
  wrap.innerHTML=`<label>عدد الخدام المطلوب<input id="service-needed" type="number" min="1" value="1"></label><label>تتكرر كل (يوم، اتركه فاضي لو مرة واحدة)<input id="service-repeat" type="number" min="0" placeholder="7 = أسبوعي"></label>`;
  notesLabel.before(wrap);
  const commLabel=document.createElement('label'); commLabel.innerHTML='جمعة التناول (١-٤، اتركه فاضي لو مش جمعة تناول)<input id="service-comm" type="number" min="1" max="4">';
  notesLabel.before(commLabel);
  const form=document.getElementById('service-form');
  form?.addEventListener('submit',async function(e){
    e.stopImmediatePropagation(); e.preventDefault();
    let assignee_id=null,assignee_name=null; const email=document.getElementById('service-assignee').value.trim();
    if(email){const {data,error}=await db.rpc('lookup_member_by_email',{member_email:email});
      if(error||!data||!data.length){message('service-message','لم يتم العثور على حساب بهذا البريد. تأكد أن العضو أنشأ حسابًا.',true);return;}
      assignee_id=data[0].id;assignee_name=data[0].full_name||email;}
    const payload={title:document.getElementById('service-title').value.trim(),service_date:document.getElementById('service-date').value,service_time:document.getElementById('service-time').value,location:document.getElementById('service-location').value.trim(),assignee_id,assignee_name,notes:document.getElementById('service-notes').value.trim()||null,created_by:currentUser.id,
      needed:+document.getElementById('service-needed').value||1, repeat_days:+document.getElementById('service-repeat').value||null, communion_n:+document.getElementById('service-comm').value||null};
    const {error}=await db.from('services').insert(payload);
    if(error){message('service-message',error.message,true);return;}
    form.reset(); document.getElementById('service-needed').value='1'; message('service-message','تمت إضافة الخدمة إلى الجدول.'); await refreshData();
  }, true);
})();

const iso=d=>d.toLocaleDateString('sv'), E=escapeHtml, admin=()=>currentProfile&&currentProfile.role==='admin';
const nextFri=()=>{const d=new Date();d.setDate(d.getDate()+(5-d.getDay()+7)%7);return iso(d)};
let A=[],M=[],V=[];
// اللوجوهات
const bm=document.querySelector('.brand-mark');
if(bm)bm.outerHTML='<img src="assets/logo-wasael.png" alt="وسائل إيضاح">';
document.querySelector('.top-actions')?.insertAdjacentHTML('afterbegin','<img src="assets/logo-church.png" alt="الكنيسة"><span id="x-bell"></span>');

const orig=refreshData;
refreshData=async function(){ if(db&&currentUser)await db.rpc('roll_services'); await orig(); await extras(); };

async function extras(){
  if(!db||!currentUser)return; const T=nextFri();
  const [a,c,n,v]=await Promise.all([
    db.from('service_assignees').select('*'),
    db.from('contacts').select('*').order('name'),
    db.from('notifications').select('*').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(20),
    db.from('availability').select('*').eq('week_date',T)]);
  A=a.data||[];V=v.data||[];
  if(admin()){M=(await db.from('profiles').select('id,full_name,email')).data||[];}
  table();bell(n.data||[]);panels(c.data||[],T);
}
function table(){
  $('stat-mine').textContent=A.filter(x=>x.user_id===currentUser.id).length;
  if(!servicesCache.length)return;
  $('services-body').innerHTML=servicesCache.map(s=>{
    const names=A.filter(x=>x.service_id==s.id).map(x=>E(x.name)+(x.status=='draft'?' <small>(مسودة)</small>':'')).join('، ')||'—';
    const o=Math.ceil(+s.service_date.slice(8,10)/7);
    const comm=s.communion_n?(s.communion_n==o?' <span class="status approved">تناول</span>':` <small>(جمعة التناول ${s.communion_n})</small>`):'';
    return `<tr><td><strong>${E(s.title)}</strong>${comm}</td><td>${dateText(s.service_date)}</td><td>${E((s.service_time||'').slice(0,5)||'—')}</td><td>${E(s.location)}</td><td>${names}</td><td>${E(s.notes||'—')}${admin()?` <button class="btn ghost" data-edit="${s.id}">تعديل</button>`:''}</td></tr>`}).join('');
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
 function panels(contacts,T){
  let box=$('x-panels');
  if(!box){box=document.createElement('div');box.id='x-panels';$('admin-panel').before(box)}
  if(!window.isStaff){box.classList.add('hidden');box.innerHTML='';return}
  box.classList.remove('hidden');
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
  for(const x of d){const s=svs.find(s=>s.id==x.service_id);if(x.user_id)await notify([x.user_id],`تم تكليفك بخدمة ${s.title} يوم ${dateText(s.service_date)} الساعة ${(s.service_time||'').slice(0,5)}`)}
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
