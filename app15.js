/* v14: كارت التاريخ القبطي في الرئيسية + مناسبات يضيفها المسؤول (بالتاريخ القبطي، بتتكرر كل سنة) + تفعيل/إيقاف */
(function(){
const $=id=>document.getElementById(id);
const E=x=>typeof escapeHtml==='function'?escapeHtml(x):String(x);
const lsG=k=>{try{return localStorage.getItem(k)}catch{return null}},lsS=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch{}};
const CROSS='<svg class="cr" viewBox="-.5 -.5 1 1"><path fill="currentColor" d="M-.09,-.09L-.09,-.36L-.19,-.36L-.19,-.47L-.04,-.47L0,-.42L.04,-.47L.19,-.47L.19,-.36L.09,-.36L.09,-.09L.36,-.09L.36,-.19L.47,-.19L.47,-.04L.42,0L.47,.04L.47,.19L.36,.19L.36,.09L.09,.09L.09,.36L.19,.36L.19,.47L.04,.47L0,.42L-.04,.47L-.19,.47L-.19,.36L-.09,.36L-.09,.09L-.36,.09L-.36,.19L-.47,.19L-.47,.04L-.42,0L-.47,-.04L-.47,-.19L-.36,-.19L-.36,-.09Z"/></svg>';
const DAYS=['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'],GM=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const ar=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
const today=()=>new Intl.DateTimeFormat('sv',{timeZone:'Africa/Cairo'}).format(new Date()).split('-').map(Number);
let cfg={on:true,occasions:[]};
try{const c=JSON.parse(lsG('x-cdate')||'null');if(c)cfg=c}catch{}
const extraMap=()=>Object.fromEntries((cfg.occasions||[]).filter(o=>o.name).map(o=>[o.d+'-'+o.m,o.name]));
function html(y,m,d){
  const i=xCoptic.info({y,m,d},extraMap()),dt=new Date(Date.UTC(y,m-1,d));
  return `${CROSS}<div><div class="big">${ar(i.d)} ${i.month} ${ar(i.y)}</div><div class="gr">${DAYS[dt.getUTCDay()]} ${ar(d)} ${GM[m-1]} ${ar(y)}</div>${i.occasion?`<div class="oc">✨ ${E(i.occasion)}</div>`:''}${!i.occasion&&i.next?`<div class="nx">⏳ ${E(i.next.name)} بعد ${ar(i.next.days)} يوم</div>`:''}</div>`;
}
function tick(){
  let c=$('x-cdate');const h=$('x-hero');
  if(!cfg.on||!h||!window.xCoptic){if(c)c.remove();return}
  if(!c){c=document.createElement('div');c.id='x-cdate';c.dataset.v='home'}
  const b=$('x-season-ban');                       /* الترتيب: بانر الموسم ثم التاريخ ثم باقي الرئيسية */
  if(b){if(b.nextElementSibling!==c)b.after(c)}else if(c.nextElementSibling!==h)h.before(c);
  const t=today(),sig=t.join('-')+JSON.stringify(cfg.occasions||[]);
  if(c.dataset.sig!==sig){c.dataset.sig=sig;c.innerHTML=html(...t)}
}
setInterval(tick,1000);
window.xCdate={set(c){cfg=c;lsS('x-cdate',JSON.stringify(c));const e=$('x-cdate');if(e)e.dataset.sig='';tick()}};
let done=false;const t0=setInterval(async()=>{
  if(done||typeof db==='undefined'||!db||typeof currentUser==='undefined'||!currentUser)return;done=true;clearInterval(t0);
  try{const r=await db.from('app_settings').select('value').eq('key','coptic_date').maybeSingle();if(r.data&&r.data.value){cfg=Object.assign({on:true,occasions:[]},r.data.value);lsS('x-cdate',JSON.stringify(cfg));const e=$('x-cdate');if(e)e.dataset.sig='';tick()}}catch{}
},700);

/* ---------- إعدادات المسؤول ---------- */
const isAdm=()=>typeof currentProfile!=='undefined'&&currentProfile&&currentProfile.role==='admin';
async function inject(el){
  if(!isAdm()||el.querySelector('#x-cds'))return;
  const r=await db.from('app_settings').select('value').eq('key','coptic_date').maybeSingle();if(el.querySelector('#x-cds'))return;
  const st=Object.assign({on:true,occasions:[]},(r.data&&r.data.value)||{});st.occasions=Array.isArray(st.occasions)?st.occasions:[];
  const box=document.createElement('div');box.id='x-cds';box.className='stack';el.appendChild(box);
  const row=(o,i)=>`<div class="two-col" data-i="${i}" style="align-items:end"><label>اليوم<select data-f="d">${Array.from({length:30},(_,k)=>`<option value="${k+1}" ${+o.d===k+1?'selected':''}>${ar(k+1)}</option>`).join('')}</select></label><label>الشهر<select data-f="m">${xCoptic.MONTHS.map((n,k)=>`<option value="${k+1}" ${+o.m===k+1?'selected':''}>${n}</option>`).join('')}</select></label><label style="grid-column:1/-1">المناسبة<input data-f="name" value="${E(o.name||'')}" placeholder="مثلًا: عيد شفيع الكنيسة"></label><button class="btn" data-del="${i}" type="button" style="grid-column:1/-1">🗑 حذف</button></div>`;
  const render=()=>{box.innerHTML=`<hr style="border:0;border-top:1px solid var(--line);width:100%"><h2>📅 التاريخ القبطي</h2>
   <p class="muted">كارت في الرئيسية بيعرض التاريخ القبطي وأقرب مناسبة. الأعياد الثابتة (النيروز، الصليب، الميلاد، الغطاس، البشارة، بداية صوم الميلاد) جاهزة، وتقدر تضيف مناسباتك بالتاريخ القبطي وبتتكرر كل سنة.</p>
   <label class="chk"><input type="checkbox" id="cd-on" ${st.on?'checked':''}> إظهار كارت التاريخ القبطي في الرئيسية</label>
   <b>مناسباتي</b><div class="stack">${st.occasions.map(row).join('')||'<p class="muted">مفيش مناسبات مضافة.</p>'}</div>
   <div class="row-btns"><button class="btn ghost" id="cd-add" type="button">➕ إضافة مناسبة</button><button class="btn primary" id="cd-save" type="button">حفظ</button></div><p class="message" id="cd-msg"></p>`;
   const pull=()=>{st.on=box.querySelector('#cd-on').checked;box.querySelectorAll('[data-i]').forEach(r=>{const o=st.occasions[+r.dataset.i];r.querySelectorAll('[data-f]').forEach(x=>o[x.dataset.f]=x.dataset.f==='name'?x.value:+x.value)})};
   box.querySelector('#cd-add').onclick=()=>{pull();st.occasions.push({d:1,m:1,name:''});render()};
   box.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{pull();st.occasions.splice(+b.dataset.del,1);render()});
   box.querySelector('#cd-save').onclick=async()=>{pull();const m=box.querySelector('#cd-msg');st.occasions=st.occasions.filter(o=>o.name.trim());
     const x=await db.rpc('set_setting',{p_key:'coptic_date',p_value:st});m.textContent=x.error?x.error.message:'تم الحفظ.';m.classList.toggle('error',!!x.error);if(!x.error){window.xCdate.set(JSON.parse(JSON.stringify(st)));render();box.querySelector('#cd-msg').textContent='تم الحفظ.'}}};
  render();
}
setInterval(()=>{if(!isAdm())return;const s=$('x-set');if(s&&s.offsetParent)inject(s)},900);
})();
