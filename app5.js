/* إضافات 5: تكليف خادم بتسليم/استلام الأدوات + صور من الخادم ومن العضو (كل واحد يشوف بتاعته، والمسؤول يشوف الاتنين) */
(function(){
const E=escapeHtml, admin=()=>currentProfile&&currentProfile.role==='admin', B='handover-photos';
const ST={delivery:'عند التسليم',return:'عند الاستلام (الإرجاع)'}, SD={servant:'الخادم',member:'العضو'};
const o=refreshData;refreshData=async function(){await o();await ho()};
const shrink=f=>new Promise(r=>{const i=new Image();i.onload=()=>{const k=Math.min(1,1280/Math.max(i.width,i.height)),c=document.createElement('canvas');c.width=i.width*k;c.height=i.height*k;c.getContext('2d').drawImage(i,0,0,c.width,c.height);c.toBlob(r,'image/jpeg',.8)};i.src=URL.createObjectURL(f)});
async function ho(){
  if(!db||!currentUser)return;
  const H=(await db.from('handovers').select('*').order('created_at',{ascending:false})).data||[];
  const P=(await db.from('handover_photos').select('*').order('created_at')).data||[];
  const M=admin()?((await db.from('profiles').select('id,full_name,email')).data||[]):[];
  let box=$('x-ho');if(!box){box=document.createElement('section');box.id='x-ho';box.className='panel pad stack';$('admin-panel').before(box)}
  box.classList.toggle('hidden',!H.length&&!admin());if(!H.length&&!admin())return;
  const U={};await Promise.all(P.map(async p=>{const r=await db.storage.from(B).createSignedUrl(p.path,3600);U[p.id]=r.data&&r.data.signedUrl}));
  const opts=M.map(m=>`<option value="${m.id}">${E(m.full_name||m.email)}</option>`).join('');
  box.innerHTML='<h2>تسليم واستلام الأدوات</h2>'+H.map(h=>{
    const side=h.servant_id===currentUser.id?'servant':h.member_id===currentUser.id?'member':null;
    const who=admin()?`الخادم: ${E(h.servant_name||'')} · العضو: ${E(h.member_name||'')}`:side==='servant'?'إنت الخادم المكلّف بالتسليم والاستلام':'إنت المستلم';
    return `<article class="request-item"><div class="request-top"><b>${E(h.title)}</b>${admin()?`<button class="btn ghost" data-hd="${h.id}">حذف</button>`:''}</div><p class="muted">${who}</p>`+['delivery','return'].map(st=>`<div><b>${ST[st]}</b><div class="row-btns">${P.filter(p=>p.handover_id==h.id&&p.stage==st).map(p=>`<figure style="margin:0;text-align:center"><a href="${U[p.id]||'#'}" target="_blank"><img src="${U[p.id]||''}" alt="" style="width:96px;height:96px;object-fit:cover;border-radius:10px"></a><small>${SD[p.side]}</small></figure>`).join('')||'<span class="muted">لا توجد صور</span>'}</div>${side?`<label class="btn ghost">+ إضافة صورة<input type="file" accept="image/*" capture="environment" hidden data-up="${h.id}|${side}|${st}"></label>`:''}</div>`).join('')+'</article>'}).join('')
  +(admin()?`<div class="stack"><h3>تكليف جديد</h3><label>الوصف (الأدوات)<input id="h-t" placeholder="مثال: ٢ ميكروفون"></label><label>العضو المستلم<select id="h-m">${opts}</select></label><label>الخادم المكلّف<select id="h-s">${opts}</select></label><button class="btn primary" id="h-add">إضافة</button></div>`:'');
  const nm=id=>{const m=M.find(x=>x.id==id);return m?(m.full_name||m.email):''};
  if(admin()){
    $('h-add').onclick=async()=>{const t=$('h-t').value.trim();if(!t)return;const r=await db.from('handovers').insert({title:t,member_id:$('h-m').value,servant_id:$('h-s').value,member_name:nm($('h-m').value),servant_name:nm($('h-s').value)});if(r.error)alert(r.error.message);else refreshData()};
    box.querySelectorAll('[data-hd]').forEach(b=>b.onclick=async()=>{if(confirm('حذف التكليف وصوره؟')){await db.from('handovers').delete().eq('id',b.dataset.hd);refreshData()}});
  }
  box.querySelectorAll('[data-up]').forEach(inp=>inp.onchange=async()=>{
    const f=inp.files[0];if(!f)return;const [hid,side,stage]=inp.dataset.up.split('|'),path=`${currentUser.id}/${hid}/${stage}-${Date.now()}.jpg`;
    const up=await db.storage.from(B).upload(path,await shrink(f),{contentType:'image/jpeg'});if(up.error)return alert(up.error.message);
    const r=await db.from('handover_photos').insert({handover_id:hid,side,stage,path});if(r.error)alert(r.error.message);else refreshData()});
}
if(currentUser)refreshData();
})();
