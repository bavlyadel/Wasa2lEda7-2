/* إضافات 2: الشكاوى، تقديم الشباب، طلب أدوات متعدد، المخزن، صور الاستلام والتسليم، ملاحظات المسؤولين */
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

/* ---------- نموذج الطلب ---------- */
function onType(){
  const t=$('request-type').value, tl=t==='طلب أدوات', c=t==='اعتذار عن طلب';
  $('x-tool').classList.toggle('hidden',!tl);
  $('x-cancel').classList.toggle('hidden',!c);
  $('request-details').required=!(tl||c);
}
function setupForm(){
  const sel=$('request-type');
  if(!$('x-tool')){
    sel.insertAdjacentHTML('beforeend','<option value="طلب أدوات">طلب أدوات</option><option value="اعتذار عن طلب">اعتذار عن طلب</option>');
    $('request-details').closest('label').insertAdjacentHTML('beforebegin',
      '<div id="x-tool" class="stack hidden"><b>اختار الأدوات والعدد</b><div id="t-list" class="stack"></div>'
     +'<div class="two-col"><label>تاريخ الخدمة<input id="t-d" type="date"></label><label>الساعة<input id="t-h" type="time"></label></div>'
     +'<p class="fineprint">لو اخترت «الخدمة» من القايمة فوق، موعدها بيتحدد تلقائي. الطلب لازم يتقدّم قبل الخدمة بـ 36 ساعة على الأقل، وإلا هيترفض تلقائيًا ويوصل للمسؤولين.</p></div>'
     +'<div id="x-cancel" class="hidden"><label>الطلب المراد إلغاؤه<select id="c-id"></select></label></div>');
    sel.onchange=onType;
  }
  const mem=!window.isStaff;
  [...sel.options].forEach(op=>{const h=mem&&(op.value==='تبديل خدمة'||op.value==='اعتذار عن خدمة');op.hidden=h;op.disabled=h});
  if(sel.selectedOptions[0]?.disabled)sel.value=[...sel.options].find(op=>!op.disabled).value;
}
function fillTools(){
  const keep=new Set([...document.querySelectorAll('#t-list .tl-c:checked')].map(c=>c.value));
  const ok=tools.filter(t=>t.qty_available===undefined||t.qty_available>0);
  $('t-list').innerHTML=ok.length?ok.map(t=>`<label class="chk"><input type="checkbox" class="tl-c" value="${t.id}" ${keep.has(t.id)?'checked':''}> <span style="flex:1">${E(t.name)}</span> <input type="number" class="tl-q" min="1" value="1" style="width:70px" aria-label="العدد"></label>`).join(''):'<p class="empty">لا توجد أدوات متاحة حاليًا.</p>';
}

/* ---------- الصفحة ---------- */
async function x3(){
  if(!db||!currentUser)return;
  const open=await youth(), isAdm=admin();
  tools=isAdm?((await db.from('tools').select('*').order('name')).data||[]):((await db.rpc('list_tools')).data||[]);
  setupForm();fillTools();
  const pend=(await db.from('service_requests').select('id,request_type,details').eq('user_id',currentUser.id).eq('status','pending').order('created_at',{ascending:false})).data||[];
  $('c-id').innerHTML=pend.map(r=>`<option value="${r.id}">${E(r.request_type)} — ${E((r.details||'').slice(0,40))}</option>`).join('')||'<option value="">لا توجد طلبات معلّقة</option>';
  onType();

  let box=$('x-p3');if(!box){box=document.createElement('div');box.id='x-p3';box.style.cssText='display:grid;gap:1rem;margin:1.2rem 0';$('admin-panel').before(box)}
  let h=`<section class="panel pad stack"><h2>شكوى أو اقتراح</h2><label>اكتب هنا<textarea id="cp-b" rows="3"></textarea></label><label class="chk"><input type="checkbox" id="cp-a"> إرسال بدون ذكر اسمي</label><button class="btn primary" id="cp-s">إرسال</button><p id="cp-m" class="message"></p></section>`;
  let cps=[],ys=[],reqs=[],photos=[],tphotos=[],notes=[],staff=[],urls={};
  const delivered=r=>!!r.returned_at;
  if(isAdm){
    cps=(await db.from('complaints').select('*').order('created_at',{ascending:false})).data||[];
    ys=(await db.from('youth_applications').select('*').order('created_at',{ascending:false})).data||[];
    reqs=(await db.from('service_requests').select('id,status,details,needed_at,created_at,tool_items,user_id,handler_id,picked_up_at,returned_at,profiles(full_name,phone)').not('tool_items','is',null).order('created_at',{ascending:false})).data||[];
    photos=(await db.from('request_photos').select('*').order('created_at')).data||[];
    notes=(await db.from('request_notes').select('*').order('created_at')).data||[];
    tphotos=(await db.from('tool_photos').select('*').order('created_at')).data||[];
    staff=(await db.from('profiles').select('id,full_name,email,role').in('role',['server','admin'])).data||[];
    const allp=[...photos,...tphotos].map(p=>p.path);
    if(allp.length){const s=await db.storage.from('tool-photos').createSignedUrls(allp,3600);(s.data||[]).forEach(x=>{if(x.signedUrl)urls[x.path]=x.signedUrl})}

    const thumbs=(rid,ph)=>photos.filter(p=>p.request_id===rid&&p.phase===ph).map(p=>`<span><a href="${urls[p.path]||'#'}" target="_blank" rel="noopener"><img src="${urls[p.path]||''}" alt="" style="width:84px;height:84px;object-fit:cover;border-radius:8px;margin:2px"></a><button class="btn ghost" data-pd="${p.id}" data-pp="${E(p.path)}" style="padding:2px 6px" title="حذف الصورة">×</button></span>`).join('')||'<small class="muted">لا يوجد</small>';
    const nameOf=id=>(staff.find(x=>x.id===id)||{}).full_name;
    const thumb=p=>`<span style="display:inline-block;text-align:center"><a href="${urls[p.path]||'#'}" target="_blank" rel="noopener"><img src="${urls[p.path]||''}" alt="" style="width:84px;height:84px;object-fit:cover;border-radius:8px;margin:2px"></a><small class="muted" style="display:block">${E(fmtDT(p.created_at))}</small><button class="btn ghost" data-pd="${p.id}" data-pp="${E(p.path)}" style="padding:2px 6px" title="حذف الصورة">×</button></span>`;
    const grp=(r,ph)=>{
      const L=photos.filter(p=>p.request_id===r.id&&p.phase===ph),mem=L.filter(p=>p.user_id===r.user_id),oth=L.filter(p=>p.user_id!==r.user_id);
      const ids=[...new Set([...(r.handler_id?[r.handler_id]:[]),...oth.map(p=>p.user_id)])];
      return `<small class="muted">من العضو</small><div>${mem.map(thumb).join('')||'<small class="muted">لا يوجد</small>'}</div>`+ids.map(u=>`<small class="muted">من ${E(nameOf(u)||'الخادم/المسؤول')}${u===r.handler_id?' (المكلّف)':''}</small><div>${oth.filter(p=>p.user_id===u).map(thumb).join('')||'<small class="muted">لا يوجد</small>'}</div>`).join('');
    };
    const nb=rid=>`<div class="stack" style="gap:6px">${notes.filter(n=>(n.request_id||'')===(rid||'')).map(n=>`<p style="margin:0">📝 ${E(n.body)} <button class="btn ghost" data-nd="${n.id}" style="padding:2px 8px">حذف</button></p>`).join('')}<div class="two-col"><input class="nt" placeholder="اكتب ملاحظة…"><button class="btn" data-na="${rid||''}">إضافة</button></div></div>`;
    const hand=reqs.filter(r=>r.status==='approved'||photos.some(p=>p.request_id===r.id)), doneN=hand.filter(delivered).length;
    h+=`<section class="panel pad stack"><h2>استلام وتسليم الأدوات (${hand.length})</h2><p class="muted">كل واحد (العضو أو الخادم المكلّف) بيشوف صوره هو بس، وانت بتشوف الاتنين. زرار «تم الاستلام» و«تم التسليم» بيسجّل الوقت، والتسليم بيرجّع الأدوات للمخزن مرة واحدة بس.</p>${doneN?`<div class="row-btns"><button class="btn ghost" id="hd-all">🗑 حذف كل اللي اتسلم (${doneN})</button></div>`:''}${hand.map(r=>`<article class="request-item"><div class="request-top"><span>${E(r.profiles?.full_name||'عضو')}${r.profiles?.phone?' · '+E(r.profiles.phone):''}</span><span class="status ${statusClass(r.status)}">${statusText(r.status)}</span></div><p>${E((r.tool_items||[]).map(i=>i.name+' × '+i.qty).join('، '))}${r.needed_at?'\nموعد الخدمة: '+E(new Date(r.needed_at).toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'})):''}</p><p class="muted">📥 الاستلام: ${r.picked_up_at?E(fmtDT(r.picked_up_at)):'لسه'} · 📤 التسليم: ${r.returned_at?E(fmtDT(r.returned_at)):'لسه'}</p><label>الخادم المكلّف بالاستلام والتسليم<select data-hh="${r.id}"><option value="">— بدون تكليف —</option>${staff.map(x=>`<option value="${x.id}" ${x.id===r.handler_id?'selected':''}>${E(x.full_name||x.email)}</option>`).join('')}</select></label><div class="row-btns">${!r.returned_at&&!r.picked_up_at?`<button class="btn" data-hp="${r.id}">✅ تم الاستلام</button>`:''}${r.returned_at?'<span class="status approved">راجعة للمخزن ✅</span>':`<button class="btn primary" data-hr="${r.id}">✅ تم التسليم (ترجع للمخزن)</button>`}</div><b>قبل الاستلام</b>${grp(r,'before')}<b>عند التسليم</b>${grp(r,'after')}<div class="row-btns">${['before','after'].map(ph=>`<label class="btn" style="cursor:pointer">📷 رفع صورة ${ph==='before'?'قبل الاستلام':'عند التسليم'}<input type="file" accept="image/*" multiple hidden data-aph="${ph}" data-rid="${r.id}"></label>`).join('')}<span class="muted" data-apm></span></div><b>ملاحظات</b>${nb(r.id)}<div class="row-btns"><button class="btn ghost" data-hd="${r.id}">🗑 ${delivered(r)?'حذف (تم الاستلام والتسليم)':'حذف السجل'}</button></div></article>`).join('')||'<p class="empty">لا توجد أدوات مستلمة حاليًا.</p>'}</section>`;
    h+=`<section class="panel pad stack"><h2>ملاحظات المسؤولين</h2>${nb('')}</section>`;

    const sm={good:0,maint:0,broken:0,avail:0};
    tools.forEach(t=>{const m=t.qty_maintenance||0,b=t.qty_broken||0;sm.maint+=m;sm.broken+=b;sm.good+=Math.max(0,t.qty_total-m-b);sm.avail+=t.qty_available});
    const g3='display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:12px';
    const tth=tid=>tphotos.filter(p=>p.tool_id===tid).map(p=>`<span><a href="${urls[p.path]||'#'}" target="_blank" rel="noopener"><img src="${urls[p.path]||''}" alt="" style="width:84px;height:84px;object-fit:cover;border-radius:8px;margin:2px"></a><button class="btn ghost" data-tpd="${p.id}" data-tpp="${E(p.path)}" style="padding:2px 6px" title="حذف الصورة">×</button></span>`).join('')||'<small class="muted">لا توجد صور</small>';
    h+=`<section class="panel pad stack"><h2>المخزن</h2><p class="muted">${tools.length} صنف — سليم ${sm.good} · محتاج صيانة ${sm.maint} · بايظ ${sm.broken} · المتاح للطلب دلوقتي ${sm.avail}. اللي بايظ أو محتاج صيانة بيتخصم من المتاح تلقائيًا. الأعداد والصور دي للمسؤولين فقط.</p>${tools.map(t=>{const m=t.qty_maintenance||0,b=t.qty_broken||0,g=Math.max(0,t.qty_total-m-b);return `<div class="request-item" data-t="${t.id}"><div class="request-top"><strong>${E(t.name)}</strong><span class="status ${t.qty_available>0?'approved':'rejected'}">متاح للطلب: ${t.qty_available} من ${t.qty_total}</span></div><div style="${g3}"><label>سليم (شامل المستلَم)<input class="tg" type="number" min="0" value="${g}"></label><label>محتاج صيانة<input class="tm" type="number" min="0" value="${m}"></label><label>بايظ<input class="tb" type="number" min="0" value="${b}"></label></div><label>العيب / ملاحظة الصيانة<input class="tf" value="${E(t.fault_note||'')}" placeholder="مثال: الكابل مقطوع"></label><div><b>صور العيب</b><div>${tth(t.id)}</div><div class="row-btns"><label class="btn" style="cursor:pointer">📷 رفع صور<input type="file" accept="image/*" multiple hidden data-tph="${t.id}"></label><span class="muted" data-tpm></span></div></div><div class="row-btns"><button class="btn" data-ts="${t.id}">حفظ</button><button class="btn ghost" data-td="${t.id}">حذف</button></div></div>`}).join('')||'<p class="empty">المخزن فاضي.</p>'}<h3>إضافة أداة</h3><label>اسم الأداة<input id="tn"></label><div style="${g3}"><label>سليم<input id="tg" type="number" min="0" value="0"></label><label>محتاج صيانة<input id="tm2" type="number" min="0" value="0"></label><label>بايظ<input id="tb2" type="number" min="0" value="0"></label></div><label>العيب (اختياري)<input id="tfn"></label><button class="btn primary" id="ta">إضافة أداة</button></section>`;

    h+=`<section class="panel pad"><h2>الشكاوى (${cps.length})</h2>${cps.map(c=>`<article class="request-item"><div class="request-top"><span>${E(c.name||'مجهول')}</span><span class="status ${c.status=='done'?'approved':'pending'}">${c.status=='done'?'تمت':'جديدة'}</span></div><p>${E(c.body)}</p><div class="row-btns">${c.status!='done'?`<button class="btn" data-cd="${c.id}">تمت المراجعة</button>`:''}<button class="btn ghost" data-cx="${c.id}">حذف</button></div></article>`).join('')||'<p class="empty">لا توجد شكاوى.</p>'}</section>
    <section class="panel pad"><h2>طلبات الشباب (${ys.length})</h2><button class="btn" id="y-tg">${open?'إخفاء النموذج عن الزوار':'إظهار النموذج للزوار'}</button>${ys.map(y=>`<article class="request-item"><div class="request-top"><span>${E(y.name)} ${y.age?`(${y.age})`:''}</span><a href="tel:${E(y.phone)}">${E(y.phone)}</a></div><p>${E(y.notes||'')}</p><button class="btn ghost" data-yx="${y.id}">حذف</button></article>`).join('')||'<p class="empty">لا توجد طلبات.</p>'}</section>`;
  }
  let mine=[],mu={},isHandler=!isAdm&&currentProfile.role==='server';
  if(isHandler){
    const tasks=(await db.rpc('list_handler_tasks')).data||[];
    if(tasks.length){
      mine=(await db.from('request_photos').select('id,request_id,phase,path,created_at').eq('user_id',currentUser.id).in('request_id',tasks.map(t=>t.id))).data||[];
      if(mine.length){const sg=await db.storage.from('tool-photos').createSignedUrls(mine.map(p=>p.path),3600);(sg.data||[]).forEach(x=>{if(x.signedUrl)mu[x.path]=x.signedUrl})}
    }
    h=`<section class="panel pad stack"><h2>مهام الاستلام والتسليم المكلّف بيها (${tasks.length})</h2><p class="muted">صورك هنا بتظهر ليك وللمسؤول بس.</p>${tasks.map(t=>`<article class="request-item"><div class="request-top"><span>${E(t.member_name||'عضو')}${t.member_phone?` · <a href="tel:${E(t.member_phone)}">${E(t.member_phone)}</a>`:''}</span><span class="status ${t.returned_at?'approved':'pending'}">${t.returned_at?'اتسلمت':'لسه'}</span></div><p>${E((t.tool_items||[]).map(i=>i.name+' × '+i.qty).join('، '))}${t.service_title?'\nالخدمة: '+E(t.service_title):''}${t.needed_at?'\nموعد الخدمة: '+E(fmtDT(t.needed_at)):''}</p><p class="muted">📥 الاستلام: ${t.picked_up_at?E(fmtDT(t.picked_up_at)):'لسه'} · 📤 التسليم: ${t.returned_at?E(fmtDT(t.returned_at)):'لسه'}</p><b>قبل الاستلام</b><div>${myThumbs(mine,mu,t.id,'before')}</div><b>عند التسليم</b><div>${myThumbs(mine,mu,t.id,'after')}</div><div class="row-btns">${['before','after'].map(ph=>`<label class="btn" style="cursor:pointer">📷 ${ph==='before'?'صورة قبل الاستلام':'صورة عند التسليم'}<input type="file" accept="image/*" capture="environment" multiple hidden data-hph="${ph}" data-hrid="${t.id}"></label>`).join('')}<span class="muted" data-apm></span></div><div class="row-btns">${!t.returned_at&&!t.picked_up_at?`<button class="btn" data-hp="${t.id}">✅ تم الاستلام</button>`:''}${t.returned_at?'':`<button class="btn primary" data-hr="${t.id}">✅ تم التسليم (ترجع للمخزن)</button>`}</div></article>`).join('')||'<p class="empty">مفيش مهام مكلّف بيها دلوقتي.</p>'}</section>`+h;
  }
  box.innerHTML=h;
  $('cp-s').onclick=async()=>{const b=$('cp-b').value.trim();if(!b)return;const an=$('cp-a').checked;
    const r=await db.from('complaints').insert({user_id:an?null:currentUser.id,name:an?'مجهول':currentProfile.full_name,body:b});
    if(!r.error)$('cp-b').value='';message('cp-m',r.error?r.error.message:'وصلت للمسؤول.',!!r.error)};
  const goH=async p=>{const r=await p;if(r&&r.error)alert(r.error.message);refreshData()};
  box.querySelectorAll('[data-hp]').forEach(b=>b.onclick=()=>goH(db.rpc('mark_handover',{rid:b.dataset.hp,phase:'pickup'})));
  box.querySelectorAll('[data-hr]').forEach(b=>b.onclick=()=>confirm('تأكيد: الأدوات رجعت فعلًا؟ هتتحسب راجعة للمخزن ومينفعش تتراجع.')&&goH(db.rpc('mark_handover',{rid:b.dataset.hr,phase:'return'})));
  box.querySelectorAll('[data-hph]').forEach(inp=>inp.onchange=()=>upload(inp.dataset.hrid,inp.dataset.hph,[...inp.files],inp.closest('article').querySelector('[data-apm]')));
  if(!isAdm)return;

  const go=async p=>{const r=await p;if(r&&r.error)alert(r.error.message);refreshData()};
  box.querySelectorAll('[data-cd]').forEach(b=>b.onclick=()=>go(db.from('complaints').update({status:'done'}).eq('id',b.dataset.cd)));
  box.querySelectorAll('[data-cx]').forEach(b=>b.onclick=()=>go(db.from('complaints').delete().eq('id',b.dataset.cx)));
  box.querySelectorAll('[data-yx]').forEach(b=>b.onclick=()=>go(db.from('youth_applications').delete().eq('id',b.dataset.yx)));
  box.querySelectorAll('[data-hh]').forEach(sel=>sel.onchange=()=>go(db.rpc('assign_handler',{rid:sel.dataset.hh,hid:sel.value||null})));
  $('y-tg').onclick=()=>go(db.from('site_settings').upsert({key:'youth_open',value:String(!open)}));
  // حذف سجلات الاستلام والتسليم: لو الأدوات لسه خارجة، deleteRequests بتسأل لو عايز ترجّعها للمخزن
  box.querySelectorAll('[data-hd]').forEach(b=>b.onclick=async()=>{
    const r=reqs.find(x=>x.id===b.dataset.hd);if(!r)return;
    if(!confirm('حذف السجل ده نهائيًا مع صوره وملاحظاته؟'))return;
    await deleteRequests([r.id]);refreshData()});
  box.querySelectorAll('[data-aph]').forEach(inp=>inp.onchange=()=>upload(inp.dataset.rid,inp.dataset.aph,[...inp.files],inp.closest('article').querySelector('[data-apm]')));
  $('hd-all')?.addEventListener('click',async()=>{
    const list=reqs.filter(r=>(r.status==='approved'||photos.some(p=>p.request_id===r.id))&&delivered(r));
    if(!list.length||!confirm(`حذف ${list.length} سجل تم استلامه وتسليمه نهائيًا مع صوره وملاحظاته؟`))return;
    await deleteRequests(list.map(r=>r.id));refreshData()});
  box.querySelectorAll('[data-na]').forEach(b=>b.onclick=()=>{const v=b.parentElement.querySelector('.nt').value.trim();if(v)go(db.from('request_notes').insert({request_id:b.dataset.na||null,body:v}))});
  box.querySelectorAll('[data-nd]').forEach(b=>b.onclick=()=>go(db.from('request_notes').delete().eq('id',b.dataset.nd)));
  box.querySelectorAll('[data-pd]').forEach(b=>b.onclick=()=>confirm('حذف الصورة؟')&&go((async()=>{await db.storage.from('tool-photos').remove([b.dataset.pp]);return db.from('request_photos').delete().eq('id',b.dataset.pd)})()));
  const nv=(p,c)=>Math.max(0,+p.querySelector(c).value||0);
  box.querySelectorAll('[data-ts]').forEach(b=>b.onclick=()=>{const p=b.closest('[data-t]'),g=nv(p,'.tg'),m=nv(p,'.tm'),x=nv(p,'.tb');go(db.from('tools').update({qty_total:g+m+x,qty_maintenance:m,qty_broken:x,fault_note:p.querySelector('.tf').value.trim()||null}).eq('id',b.dataset.ts))});
  box.querySelectorAll('[data-td]').forEach(b=>b.onclick=()=>confirm('حذف الأداة وصورها؟')&&go((async()=>{const ps=tphotos.filter(p=>p.tool_id===b.dataset.td).map(p=>p.path);if(ps.length)await db.storage.from('tool-photos').remove(ps);return db.from('tools').delete().eq('id',b.dataset.td)})()));
  box.querySelectorAll('[data-tph]').forEach(inp=>inp.onchange=()=>uploadTool(inp.dataset.tph,[...inp.files],inp.closest('[data-t]').querySelector('[data-tpm]')));
  box.querySelectorAll('[data-tpd]').forEach(b=>b.onclick=()=>confirm('حذف الصورة؟')&&go((async()=>{await db.storage.from('tool-photos').remove([b.dataset.tpp]);return db.from('tool_photos').delete().eq('id',b.dataset.tpd)})()));
  $('ta').onclick=()=>{const n=$('tn').value.trim(),g=Math.max(0,+$('tg').value||0),m=Math.max(0,+$('tm2').value||0),x=Math.max(0,+$('tb2').value||0);if(n)go(db.from('tools').insert({name:n,qty_total:g+m+x,qty_available:g,qty_maintenance:m,qty_broken:x,fault_note:$('tfn').value.trim()||null}))};
}

/* ---------- صور قبل الاستلام وعند التسليم (صاحب الطلب فقط) ---------- */
function shrink(file){return new Promise((res,rej)=>{const img=new Image(),u=URL.createObjectURL(file);
  img.onload=()=>{const k=Math.min(1,1280/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);c.toBlob(b=>b?res(b):rej(new Error('تعذر معالجة الصورة')),'image/jpeg',.8)};
  img.onerror=()=>rej(new Error('ملف الصورة غير صالح'));img.src=u})}
async function upload(rid,ph,files,pm){
  let ok=0;
  for(const f of files){
    try{pm.textContent='جارٍ الرفع…';const b=await shrink(f),path=`${currentUser.id}/${rid}/${ph}-${Date.now()}-${ok}.jpg`;
      const up=await db.storage.from('tool-photos').upload(path,b,{contentType:'image/jpeg'});if(up.error)throw up.error;
      const ins=await db.from('request_photos').insert({request_id:rid,phase:ph,path});if(ins.error)throw ins.error;ok++;
    }catch(err){pm.textContent='فشل الرفع: '+(err.message||err);return}
  }
  pm.textContent=`تم رفع ${ok} صورة وبعتت للمسؤولين.`;
  setTimeout(()=>(admin()||currentProfile.role==='server')?refreshData():loadRequests(),1500);
}
function myThumbs(list,urls,rid,ph){
  return list.filter(p=>String(p.request_id)===String(rid)&&p.phase===ph&&urls[p.path]).map(p=>`<span style="display:inline-block;text-align:center"><a href="${urls[p.path]}" target="_blank" rel="noopener"><img src="${urls[p.path]}" alt="" style="width:84px;height:84px;object-fit:cover;border-radius:8px;margin:2px"></a><small class="muted" style="display:block">${E(fmtDT(p.created_at))}</small></span>`).join('')||'<small class="muted">لا يوجد</small>';
}
async function adminPhotos(){
  const items=[...document.querySelectorAll('#admin-requests .request-item[data-tool="1"]')];
  if(!items.length)return;
  const ph=await db.from('request_photos').select('*').order('created_at');
  if(ph.error||!ph.data||!ph.data.length)return;
  const s=await db.storage.from('tool-photos').createSignedUrls(ph.data.map(p=>p.path),3600),urls={};
  (s.data||[]).forEach(x=>{if(x.signedUrl)urls[x.path]=x.signedUrl});
  items.forEach(it=>{
    if(it.querySelector('.adm-photos'))return;
    const mine=ph.data.filter(p=>p.request_id===it.dataset.rid);if(!mine.length)return;
    const th=k=>mine.filter(p=>p.phase===k).map(p=>urls[p.path]?`<a href="${urls[p.path]}" target="_blank" rel="noopener"><img src="${urls[p.path]}" alt="" style="width:84px;height:84px;object-fit:cover;border-radius:8px;margin:2px"></a>`:'<small class="muted">تعذر عرض الصورة</small>').join('')||'<small class="muted">لا يوجد</small>';
    const d=document.createElement('div');d.className='adm-photos';
    d.innerHTML=`<b>📷 قبل الاستلام</b><div>${th('before')}</div><b>📷 عند التسليم</b><div>${th('after')}</div>`;
    const c=it.querySelector('.request-controls');c?it.insertBefore(d,c):it.append(d);
  });
}
async function uploadTool(tid,files,pm){
  let ok=0;
  for(const f of files){
    try{pm.textContent='جارٍ الرفع…';const b=await shrink(f),path=`${currentUser.id}/tools/${tid}/${Date.now()}-${ok}.jpg`;
      const up=await db.storage.from('tool-photos').upload(path,b,{contentType:'image/jpeg'});if(up.error)throw up.error;
      const ins=await db.from('tool_photos').insert({tool_id:tid,path});if(ins.error)throw ins.error;ok++;
    }catch(err){pm.textContent='فشل الرفع: '+(err.message||err);return}
  }
  pm.textContent=`تم رفع ${ok} صورة.`;setTimeout(()=>refreshData(),1200);
}
window.onRequestsRendered=async function(){
  if(!db||!currentUser)return;
  if(admin())adminPhotos();
  const items=[...document.querySelectorAll('#my-requests .request-item[data-tool="1"][data-status="approved"]')];
  if(!items.length)return;
  const rows=(await db.from('request_photos').select('id,request_id,phase,path,created_at').eq('user_id',currentUser.id)).data||[],mu={};
  if(rows.length){const sg=await db.storage.from('tool-photos').createSignedUrls(rows.map(p=>p.path),3600);(sg.data||[]).forEach(x=>{if(x.signedUrl)mu[x.path]=x.signedUrl})}
  items.forEach(it=>{
    if(it.querySelector('.photo-ctl'))return; // الدالة ممكن تشتغل مرتين مع بعض: ما نكررش الأزرار
    const rid=it.dataset.rid,cnt=ph=>rows.filter(r=>r.request_id===rid&&r.phase===ph).length;
    const box=document.createElement('div');box.className='row-btns photo-ctl';
    box.innerHTML=['before','after'].map(ph=>`<label class="btn" style="cursor:pointer">${ph==='before'?'📷 صورة قبل الاستلام':'📷 صورة عند التسليم'} (${cnt(ph)})<input type="file" accept="image/*" capture="environment" multiple hidden data-ph="${ph}"></label>`).join('')+'<span class="muted" data-pm></span>';
    it.append(box);
    const tw=document.createElement('div');tw.innerHTML=`<b>صور قبل الاستلام</b><div>${myThumbs(rows,mu,rid,'before')}</div><b>صور عند التسليم</b><div>${myThumbs(rows,mu,rid,'after')}</div>`;it.append(tw);
    box.querySelectorAll('input[type=file]').forEach(inp=>inp.onchange=()=>upload(rid,inp.dataset.ph,[...inp.files],box.querySelector('[data-pm]')));
  });
};

/* ---------- إرسال الطلب ---------- */
document.addEventListener('submit',async e=>{
  if(e.target.id!=='request-form')return; e.stopImmediatePropagation();e.preventDefault();
  const type=$('request-type').value, msg=(t,err)=>message('request-message',t,err), svc=$('request-service').value||null;
  if(type==='اعتذار عن طلب'){
    const id=$('c-id').value;if(!id)return msg('اختار الطلب المراد إلغاؤه.',true);
    const r=await db.from('service_requests').delete().eq('id',id).select();
    if(r.error||!r.data||!r.data.length)return msg(r.error?r.error.message:'تعذر إلغاء الطلب.',true);
    msg('تم إلغاء الطلب.');refreshData();return;
  }
  let det=$('request-details').value.trim(),items=null,needed=null;
  if(type==='طلب أدوات'){
    items=[...document.querySelectorAll('#t-list .tl-c:checked')].map(c=>{const t=tools.find(x=>x.id==c.value);return{id:t.id,name:t.name,qty:Math.max(1,+c.closest('label').querySelector('.tl-q').value||1)}});
    if(!items.length)return msg('اختار أداة واحدة على الأقل.',true);
    const s=svc&&servicesCache.find(x=>x.id==svc);
    const d=s?s.service_date:$('t-d').value, hh=s?(s.service_time||'').slice(0,5):$('t-h').value;
    if(!d||!hh)return msg('حدد تاريخ وساعة الخدمة، أو اختار الخدمة من القايمة.',true);
    needed=new Date(d+'T'+hh).toISOString();
    det=(det?det+'\n':'')+'[الأدوات: '+items.map(i=>i.name+' × '+i.qty).join('، ')+']';
  }else if(!det)return msg('اكتب التفاصيل.',true);
  const r=await db.from('service_requests').insert({user_id:currentUser.id,request_type:type,service_id:svc,details:det,tool_items:items,needed_at:needed}).select('id,status,reject_reason').single();
  if(r.error)return msg(r.error.message,true);
  $('request-details').value='';document.querySelectorAll('#t-list .tl-c').forEach(c=>c.checked=false);
  if(r.data&&r.data.status==='rejected')msg('اتأخرت في الطلب، فاترفض تلقائيًا. لازم تطلب قبل الخدمة بـ 36 ساعة على الأقل، ولو في حاجة طارئة كلّم المسؤولين (أرقامهم موجودة في الموقع).',true);
  else msg('تم إرسال الطلب للمسؤول.');
  refreshData();
},true);
if(currentUser)refreshData(); // لو app.js خلّص تحميل البيانات قبل تشغيل الإضافات
})();

// فيديو شرح إنشاء الحساب في صفحة الدخول (غيّر الفيديو بوضع ملف جديد بنفس الاسم في assets وزوّد رقم v)
(function(){const c=document.querySelector('.auth-card');if(c&&!document.getElementById('x-guide'))c.insertAdjacentHTML('beforeend','<details id="x-guide" style="margin-top:1rem"><summary style="cursor:pointer;font-weight:700">▶ شاهد شرح إنشاء الحساب (فيديو قصير)</summary><video controls playsinline preload="none" style="width:100%;max-width:340px;margin:.8rem auto 0;display:block;border-radius:12px" src="assets/signup-guide.mp4?v=3"></video></details>')})();
