/* v20: تبديل الخدمة ونزول الخدمة من نموذج «طلب جديد» — للخدام فقط (الأعضاء والمسؤول من غير أي تغيير).
   - خادم مكلّف بخدمة قادمة: «تبديل خدمة» = يختار خدمته والخدمة اللي عايز يروحها، والمسؤول لما يوافق بيتنقل في الجدول (rpc request_move / decide_move).
   - خادم مش مكلّف: «تبديل خدمة» بتتبدّل بـ «نزول خدمة» (نفس نظام طلبات النزول الموجود). */
(function(){
const E=escapeHtml,$=id=>document.getElementById(id),MV='تبديل خدمة',JN='نزول خدمة';
const isSrv=()=>!!(currentProfile&&currentProfile.role==='server'&&currentUser);
const isAdm=()=>!!(currentProfile&&currentProfile.role==='admin');
const today=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Africa/Cairo'});
const msg=(t,err)=>{try{message('request-message',t,err)}catch{const m=$('request-message');if(m){m.textContent=t;m.className='message'+(err?' error':'')}}};
let asg=[],joined=new Set(),loaded=false,sig='';
const lbl=s=>`${s.title} — ${dateText(s.service_date)}${s.service_time?' · '+t12(s.service_time):''}`;
const up=()=>(servicesCache||[]).filter(s=>String(s.service_date)>=today());

async function load(){
  if(!db||!isSrv())return;
  try{
    const [a,j]=await Promise.all([
      db.from('service_assignees').select('service_id,status').eq('user_id',currentUser.id),
      db.from('service_requests').select('service_id,status').eq('user_id',currentUser.id).eq('request_type',JN).in('status',['pending','approved'])]);
    asg=(a.data||[]).map(x=>({id:String(x.service_id),status:x.status}));
    joined=new Set((j.data||[]).map(x=>String(x.service_id)));loaded=true;
  }catch(e){console.error('x20',e)}
}
function ensureBlocks(){
  if($('x-mv'))return;const lab=$('request-details')&&$('request-details').closest('label');if(!lab)return;
  lab.insertAdjacentHTML('beforebegin',
   '<div id="x-mv" class="stack hidden"><label>خدمتك اللي عايز تسيبها<select id="x-mv-from"></select></label>'
  +'<label>الخدمة اللي عايز تروحها بداله<select id="x-mv-to"></select></label>'
  +'<p class="fineprint">الطلب بيروح للمسؤول، ولما يوافق بتتنقل من خدمتك للخدمة الجديدة في الجدول وبيوصلك إشعار. اكتب السبب في «التفاصيل» لو حابب.</p></div>'
  +'<div id="x-jn" class="stack hidden"><label>الخدمة اللي عايز تنزلها<select id="x-jn-sel"></select></label>'
  +'<p class="fineprint">طلبك بيوصل للمسؤول، ولما يوافق بتتضاف على الخدمة في الجدول.</p></div>');
}
function fill(){
  const mine=up().filter(s=>asg.some(a=>a.id===String(s.id)&&a.status==='approved'));
  const taken=new Set(asg.map(a=>a.id));
  const targets=up().filter(s=>!taken.has(String(s.id)));
  const joinable=targets.filter(s=>!joined.has(String(s.id)));
  const key=[mine,targets,joinable].map(l=>l.map(s=>s.id).join(',')).join('|');
  if(key!==sig){
    sig=key;
    const keep=['x-mv-from','x-mv-to','x-jn-sel'].map(i=>$(i)&&$(i).value);
    $('x-mv-from').innerHTML=mine.map(s=>`<option value="${s.id}">${E(lbl(s))}</option>`).join('');
    $('x-mv-to').innerHTML=(targets.length?'<option value="">اختار الخدمة…</option>':'<option value="">مفيش خدمات تانية متاحة</option>')+targets.filter(s=>!mine.some(m=>m.id===s.id)).map(s=>`<option value="${s.id}">${E(lbl(s))}</option>`).join('');
    $('x-jn-sel').innerHTML=joinable.length?joinable.map(s=>`<option value="${s.id}">${E(lbl(s))}</option>`).join(''):'<option value="">مفيش خدمات متاحة للنزول</option>';
    ['x-mv-from','x-mv-to','x-jn-sel'].forEach((i,k)=>{if(keep[k]&&[...$(i).options].some(o=>o.value===keep[k]))$(i).value=keep[k]});
  }
  return mine.length>0;
}
function setup(){
  const sel=$('request-type');if(!sel||!loaded||!isSrv())return;
  ensureBlocks();if(!$('x-mv'))return;
  const hasA=fill();
  let jn=[...sel.options].find(o=>o.value===JN);
  if(!jn){sel.insertAdjacentHTML('beforeend',`<option value="${JN}">${JN}</option>`);jn=[...sel.options].find(o=>o.value===JN)}
  const mv=[...sel.options].find(o=>o.value===MV);
  if(mv){mv.hidden=mv.disabled=!hasA}
  jn.hidden=jn.disabled=hasA;
  if(sel.selectedOptions[0]&&sel.selectedOptions[0].disabled)sel.value=(!jn.disabled?JN:[...sel.options].find(o=>!o.disabled).value);
  change();
}
function change(){
  const sel=$('request-type');if(!sel||!$('x-mv')||!isSrv())return;
  const t=sel.value,mv=t===MV,jn=t===JN;
  $('x-mv').classList.toggle('hidden',!mv);$('x-jn').classList.toggle('hidden',!jn);
  const sl=$('request-service')&&$('request-service').closest('label');if(sl)sl.classList.toggle('hidden',mv||jn);
  if(mv||jn)$('request-details').required=false;
}
document.addEventListener('change',e=>{if(e.target&&e.target.id==='request-type')change()});

/* إرسال الطلب (قبل معالج app3 بتاع باقي الأنواع) */
window.addEventListener('submit',async e=>{
  if(!e.target||e.target.id!=='request-form'||!isSrv())return;
  const t=$('request-type').value;if((t!==MV&&t!==JN)||!$('x-mv'))return;
  e.stopImmediatePropagation();e.preventDefault();
  const btn=e.target.querySelector('button[type=submit]');if(btn)btn.disabled=true;
  try{
    const note=$('request-details').value.trim();
    if(t===MV){
      const from=$('x-mv-from').value,to=$('x-mv-to').value;
      if(!from)return msg('إنت مش مكلّف بخدمة تبدّلها.',true);
      if(!to)return msg('اختار الخدمة اللي عايز تروحها.',true);
      const r=await db.rpc('request_move',{p_from:String(from),p_to:String(to),p_reason:note||null});
      if(r.error)return msg(/request_move|schema cache/i.test(r.error.message)?'الميزة دي لسه متفعّلتش، كلّم المسؤول.':r.error.message,true);
    }else{
      const id=$('x-jn-sel').value,s=(servicesCache||[]).find(x=>String(x.id)===String(id));
      if(!s)return msg('اختار الخدمة اللي عايز تنزلها.',true);
      const r=await db.from('service_requests').insert({user_id:currentUser.id,request_type:JN,service_id:s.id,details:`عايز أنزل «${s.title}» يوم ${dateText(s.service_date)}`+(note?'\n'+note:'')});
      if(r.error&&r.error.code!=='23505')return msg(r.error.message,true);
    }
    $('request-details').value='';msg('تم إرسال الطلب للمسؤول.');
    await refreshData();
  }finally{if(btn)btn.disabled=false}
},true);

/* قرار المسؤول على طلب «تبديل خدمة»: لو الطلب نقل حقيقي بينفّذ في الجدول، ولو طلب عادي قديم بيتحدّث زي الأول */
document.addEventListener('click',async e=>{
  const b=e.target.closest&&e.target.closest('#admin-requests [data-request]'),it=b&&b.closest('.request-item');
  if(!it||it.dataset.type!==MV||!isAdm())return;
  e.stopImmediatePropagation();e.preventDefault();b.disabled=true;
  const id=b.dataset.request,st=b.dataset.status;
  const r=await db.rpc('decide_move',{p_id:id,p_status:st});
  if(r.error&&!/decide_move|schema cache|does not exist/i.test(r.error.message)){alert(r.error.message);return refreshData()}
  if(r.error||r.data===false){const u=await db.from('service_requests').update({status:st}).eq('id',id);if(u.error)alert(u.error.message)}
  refreshData();
},true);

const orig=refreshData;
refreshData=async function(){await orig();await load();setup()};
if(currentUser&&currentProfile)refreshData();
})();
