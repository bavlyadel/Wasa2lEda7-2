/* إضافات 2: الشكاوى، تقديم الشباب (قابل للإخفاء)، أدوات الخدمة */
(function(){
const E=escapeHtml, admin=()=>currentProfile&&currentProfile.role==='admin';
let tools=[];
async function youth(){
  if(!db)return;
  const open=(await db.from('site_settings').select('value').eq('key','youth_open').maybeSingle()).data?.value==='true';
  let b=$('x-youth');if(!b){b=document.createElement('section');b.id='x-youth';b.className='panel pad stack';$('auth-view').after(b)}
  b.classList.toggle('hidden',!open||!!currentUser);
  b.innerHTML=open?`<h2>تقديم للخدمة (للشباب)</h2><label>الاسم<input id="y-n"></label><div class="two-col"><label>التليفون<input id="y-p" type="tel"></label><label>السن<input id="y-a" type="number"></label></div><label>ملاحظات<input id="y-t"></label><button class="btn primary" id="y-s">إرسال الطلب</button><p id="y-m" class="message"></p>`:'';
  if(open)$('y-s').onclick=async()=>{if(!$('y-n').value||!$('y-p').value)return message('y-m','اكتب الاسم والتليفون.',true);
    const r=await db.from('youth_applications').insert({name:$('y-n').value,phone:$('y-p').value,age:+$('y-a').value||null,notes:$('y-t').value||null});
    message('y-m',r.error?r.error.message:'وصل طلبك، هنتواصل معاك.',!!r.error)};
  return open;
}
const o=refreshData;
refreshData=async function(){await o();await x3()};
youth();

async function x3(){
  if(!db||!currentUser)return;
  const open=await youth();
  tools=(await db.from('tools').select('*').order('name')).data||[];
  const sel=$('request-type');
  const onType=()=>{const c=sel.value==='اعتذار عن طلب';$('x-tool').classList.toggle('hidden',sel.value!=='طلب أدوات');$('x-cancel').classList.toggle('hidden',!c);$('request-details').required=!c;};
  if(!$('x-tool')){
    sel.insertAdjacentHTML('beforeend','<option value="طلب أدوات">طلب أدوات</option>');
    $('request-details').closest('label').insertAdjacentHTML('beforebegin','<div id="x-tool" class="two-col hidden"><label>الأداة<select id="t-id"></select></label><label>العدد<input id="t-q" type="number" min="1" value="1"></label></div><div id="x-cancel" class="hidden"><label>الطلب المراد إلغاؤه<select id="c-id"></select></label></div>');
    sel.onchange=onType;
  }
  const mem=!window.isStaff;
  const oc=[...sel.options].find(o=>o.value==='اعتذار عن طلب');
  if(mem&&!oc)sel.insertAdjacentHTML('beforeend','<option value="اعتذار عن طلب">اعتذار عن طلب</option>');
  if(!mem&&oc)oc.remove();
  [...sel.options].forEach(o=>{const h=mem&&(o.value==='تبديل خدمة'||o.value==='اعتذار عن خدمة');o.hidden=h;o.disabled=h});
  if(sel.selectedOptions[0]?.disabled)sel.value=[...sel.options].find(o=>!o.disabled).value;
  const pend=(await db.from('service_requests').select('id,request_type,details').eq('user_id',currentUser.id).eq('status','pending').order('created_at',{ascending:false})).data||[];
  $('c-id').innerHTML=pend.map(r=>`<option value="${r.id}">${E(r.request_type)} — ${E((r.details||'').slice(0,40))}</option>`).join('')||'<option value="">لا توجد طلبات معلّقة</option>';
  onType();
  $('t-id').innerHTML=tools.filter(t=>t.qty_available>0).map(t=>`<option value="${t.id}">${E(t.name)} (متاح ${t.qty_available})</option>`).join('')||'<option value="">لا يوجد متاح</option>';
  let box=$('x-p3');if(!box){box=document.createElement('div');box.id='x-p3';box.style.cssText='display:grid;gap:1rem;margin:1.2rem 0';$('admin-panel').before(box)}
  let h=`<section class="panel pad stack"><h2>شكوى أو اقتراح</h2><label>اكتب هنا<textarea id="cp-b" rows="3"></textarea></label><label class="chk"><input type="checkbox" id="cp-a"> إرسال بدون ذكر اسمي</label><button class="btn primary" id="cp-s">إرسال</button><p id="cp-m" class="message"></p></section>`;
  let cps=[],ys=[];
  if(admin()){
    cps=(await db.from('complaints').select('*').order('created_at',{ascending:false})).data||[];
    ys=(await db.from('youth_applications').select('*').order('created_at',{ascending:false})).data||[];
    h+=`<section class="panel pad"><h2>الشكاوى (${cps.length})</h2>${cps.map(c=>`<article class="request-item"><div class="request-top"><span>${E(c.name||'مجهول')}</span><span class="status ${c.status=='done'?'approved':'pending'}">${c.status=='done'?'تمت':'جديدة'}</span></div><p>${E(c.body)}</p><div class="row-btns">${c.status!='done'?`<button class="btn" data-cd="${c.id}">تمت المراجعة</button>`:''}<button class="btn ghost" data-cx="${c.id}">حذف</button></div></article>`).join('')||'<p class="empty">لا توجد شكاوى.</p>'}</section>
    <section class="panel pad"><h2>طلبات الشباب (${ys.length})</h2><button class="btn" id="y-tg">${open?'إخفاء النموذج عن الزوار':'إظهار النموذج للزوار'}</button>${ys.map(y=>`<article class="request-item"><div class="request-top"><span>${E(y.name)} ${y.age?`(${y.age})`:''}</span><a href="tel:${E(y.phone)}">${E(y.phone)}</a></div><p>${E(y.notes||'')}</p><button class="btn ghost" data-yx="${y.id}">حذف</button></article>`).join('')||'<p class="empty">لا توجد طلبات.</p>'}</section>
    <section class="panel pad stack"><h2>أدوات الخدمة</h2>${tools.map(t=>`<p data-t="${t.id}">${E(t.name)} — متاح <input class="tq" type="number" min="0" value="${t.qty_available}" style="width:70px"> من <input class="tt" type="number" min="0" value="${t.qty_total}" style="width:70px"> <button class="btn" data-ts="${t.id}">حفظ</button> <button class="btn ghost" data-td="${t.id}">حذف</button></p>`).join('')||'<p class="empty">لا توجد أدوات.</p>'}<div class="two-col"><input id="tn" placeholder="اسم الأداة"><input id="tc" type="number" min="0" placeholder="العدد"></div><button class="btn primary" id="ta">إضافة أداة</button></section>`;
  }
  box.innerHTML=h;
  $('cp-s').onclick=async()=>{const b=$('cp-b').value.trim();if(!b)return;const an=$('cp-a').checked;
    const r=await db.from('complaints').insert({user_id:an?null:currentUser.id,name:an?'مجهول':currentProfile.full_name,body:b});
    if(!r.error)$('cp-b').value='';message('cp-m',r.error?r.error.message:'وصلت للمسؤول.',!!r.error)};
  if(!admin())return;
  const go=async p=>{await p;refreshData()};
  box.querySelectorAll('[data-cd]').forEach(b=>b.onclick=()=>go(db.from('complaints').update({status:'done'}).eq('id',b.dataset.cd)));
  box.querySelectorAll('[data-cx]').forEach(b=>b.onclick=()=>go(db.from('complaints').delete().eq('id',b.dataset.cx)));
  box.querySelectorAll('[data-yx]').forEach(b=>b.onclick=()=>go(db.from('youth_applications').delete().eq('id',b.dataset.yx)));
  $('y-tg').onclick=()=>go(db.from('site_settings').upsert({key:'youth_open',value:String(!open)}));
  box.querySelectorAll('[data-ts]').forEach(b=>b.onclick=()=>{const p=b.parentElement;go(db.from('tools').update({qty_available:+p.querySelector('.tq').value,qty_total:+p.querySelector('.tt').value}).eq('id',b.dataset.ts))});
  box.querySelectorAll('[data-td]').forEach(b=>b.onclick=()=>confirm('حذف الأداة؟')&&go(db.from('tools').delete().eq('id',b.dataset.td)));
  $('ta').onclick=()=>{const n=$('tn').value.trim(),c=+$('tc').value||0;if(n)go(db.from('tools').insert({name:n,qty_total:c,qty_available:c}))};
}
// طلب الأدوات: بنعترض إرسال النموذج الأصلي ونضيف بيانات الأداة
document.addEventListener('submit',async e=>{
  if(e.target.id!=='request-form')return; e.stopImmediatePropagation();e.preventDefault();
  const type=$('request-type').value;
  if(type==='اعتذار عن طلب'){const id=$('c-id').value;if(!id)return message('request-message','اختر الطلب المراد إلغاؤه.',true);
    const r=await db.from('service_requests').delete().eq('id',id).select();
    if(r.error||!r.data||!r.data.length)return message('request-message',r.error?r.error.message:'تعذر إلغاء الطلب.',true);
    message('request-message','تم إلغاء الطلب.');refreshData();return}
  let det=$('request-details').value.trim(),tid=null,q=null;
  if(type==='طلب أدوات'){tid=$('t-id').value;q=+$('t-q').value||1;const t=tools.find(x=>x.id==tid);
    if(!t)return message('request-message','اختر أداة متاحة.',true);if(q>t.qty_available)return message('request-message','العدد أكبر من المتاح.',true);
    det+=`\n[الأداة: ${t.name} × ${q}]`}
  const r=await db.from('service_requests').insert({user_id:currentUser.id,request_type:type,service_id:$('request-service').value||null,details:det,tool_id:tid,tool_qty:q});
  if(r.error)message('request-message',r.error.message,true);else{$('request-details').value='';message('request-message','تم إرسال الطلب للمسؤول.');refreshData()}
},true);
if(currentUser)refreshData(); // لو app.js خلّص تحميل البيانات قبل تشغيل الإضافات
})();
