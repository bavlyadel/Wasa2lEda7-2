/* v16: «دورك الجاي إمتى» (كارت لكل خادم) + «آية اليوم» (الأدمن بيكتب الآيات) */
(function(){
const $=id=>document.getElementById(id);
const E=x=>typeof escapeHtml==='function'?escapeHtml(x):String(x);
const lsG=k=>{try{return localStorage.getItem(k)}catch{return null}},lsS=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
const ar=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
const cairo=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(x=>[x.type,x.value]));return{d:`${p.year}-${p.month}-${p.day}`,m:+p.hour*60+ +p.minute}};
const dnum=s=>{const a=s.split('-').map(Number);return Math.round(Date.UTC(a[0],a[1]-1,a[2])/864e5)};
const DEF=[{t:'الرب نوري وخلاصي، ممن أخاف؟',r:'مزمور ٢٧ : ١'},{t:'أستطيع كل شيء في المسيح الذي يقويني',r:'فيلبي ٤ : ١٣'},{t:'الرب راعيّ فلا يعوزني شيء',r:'مزمور ٢٣ : ١'},{t:'تعالوا إليّ يا جميع المتعبين والثقيلي الأحمال وأنا أريحكم',r:'متى ١١ : ٢٨'},{t:'سراج لرجلي كلامك ونور لسبيلي',r:'مزمور ١١٩ : ١٠٥'}];

/* ---------- آية اليوم ---------- */
let vcfg={on:true,list:[]};try{const c=JSON.parse(lsG('x-verse')||'null');if(c)vcfg=c}catch{}
function verseTick(){
  let e=$('x-verse');const h=$('x-hero');
  if(!vcfg.on||!h||!currentUser){if(e)e.remove();return}
  const L=(vcfg.list||[]).filter(x=>x.t&&x.t.trim()).length?vcfg.list.filter(x=>x.t&&x.t.trim()):DEF;
  const v=L[((dnum(cairo().d)%L.length)+L.length)%L.length];
  if(!e){e=document.createElement('div');e.id='x-verse';e.dataset.v='home'}
  const c=$('x-cdate'),b=$('x-season-ban'),ref=c||b;
  if(ref){if(ref.nextElementSibling!==e)ref.after(e)}else if(e.nextElementSibling!==h)h.before(e);
  const sig=v.t+'|'+v.r;if(e.dataset.sig!==sig){e.dataset.sig=sig;e.innerHTML=`«${E(v.t)}»${v.r?`<small>${E(v.r)}</small>`:''}`}
}

/* ---------- دورك الجاي ---------- */
let mine=null,mineAt=0,att={};
async function loadMine(){
  if(Date.now()-mineAt<60000&&mine)return;mineAt=Date.now();
  try{const r=await db.from('service_assignees').select('service_id').eq('user_id',currentUser.id).eq('status','approved');mine=new Set((r.data||[]).map(x=>String(x.service_id)));
    const c=cairo(),a=await db.from('attendance').select('service_id,status').eq('user_id',currentUser.id).eq('service_date',c.d);att=Object.fromEntries((a.data||[]).map(x=>[String(x.service_id),x.status]))}catch{}
}
function pick(){
  if(!mine||typeof servicesCache==='undefined'||!servicesCache)return null;const c=cairo();
  const L=servicesCache.filter(s=>mine.has(String(s.id))&&s.service_date&&(s.service_date>c.d||(s.service_date===c.d&&(()=>{const t=(s.service_time||'00:00').split(':');return +t[0]*60+ +t[1]+120>c.m})())));
  return L.length?L[0]:null; /* servicesCache مترتب بالتاريخ والوقت */
}
function nextTick(){
  let e=$('x-next');const h=$('x-hero');
  if(!h||typeof currentUser==='undefined'||!currentUser){if(e)e.remove();return}
  const s=pick();if(!s){if(e)e.remove();return}
  const c=cairo(),days=dnum(s.service_date)-dnum(c.d);
  if(!e){e=document.createElement('div');e.id='x-next';e.dataset.v='home'}
  if(h.nextElementSibling!==e)h.after(e);e.dataset.sid=s.id;
  const big=days===0?['النهارده','w','']:days===1?['بكرة','w','']:days===2?['يومين','w','']:[ar(days),'','أيام'];
  const tm=typeof t12==='function'?t12((s.service_time||'').slice(0,5)):(s.service_time||'').slice(0,5);
  const dt=typeof dateText==='function'?dateText(s.service_date):s.service_date;
  const st=att[String(s.id)],tags=[];
  if(s.comm_shift||(s.comm_on&&s.comm_shift!==false&&0))tags.push('<span class="tg">🕊 فيها تناول</span>');
  if(days===0&&st)tags.push(`<span class="tg ok">${st==='late'?'⏱ اتسجّل متأخر':'✅ تم تسجيل حضورك'}</span>`);
  const sig=[s.id,s.service_date,s.service_time,s.location,s.title,days,st,s.comm_shift].join('|');
  if(e.dataset.sig!==sig){e.dataset.sig=sig;e.innerHTML=`<div class="cnt"><b class="${big[1]}">${big[0]}</b>${big[2]?`<small>${big[2]}</small>`:''}</div><div><div class="m">خدمتك الجاية</div><h3>${E(s.title||'')}</h3><div class="m">${E(dt)}${tm?' · '+E(tm):''}${s.location?' · '+E(s.location):''}</div>${tags.length?`<div class="tags">${tags.join('')}</div>`:''}</div>`}
}
setInterval(async()=>{if(typeof db==='undefined'||!db||typeof currentUser==='undefined'||!currentUser)return;await loadMine();nextTick();verseTick()},1500);

/* تحميل إعداد الآية */
let done=false;const t0=setInterval(async()=>{
  if(done||typeof db==='undefined'||!db||typeof currentUser==='undefined'||!currentUser)return;done=true;clearInterval(t0);
  try{const r=await db.from('app_settings').select('value').eq('key','verse').maybeSingle();if(r.data&&r.data.value){vcfg=Object.assign({on:true,list:[]},r.data.value);lsS('x-verse',JSON.stringify(vcfg));const e=$('x-verse');if(e)e.dataset.sig='';verseTick()}}catch{}
},700);
window.xVerse={set(c){vcfg=c;lsS('x-verse',JSON.stringify(c));const e=$('x-verse');if(e)e.dataset.sig='';verseTick()}};

/* ---------- إعدادات المسؤول ---------- */
const isAdm=()=>typeof currentProfile!=='undefined'&&currentProfile&&currentProfile.role==='admin';
async function inject(el){
  if(!isAdm()||el.querySelector('#x-vs'))return;
  const r=await db.from('app_settings').select('value').eq('key','verse').maybeSingle();if(el.querySelector('#x-vs'))return;
  const st=Object.assign({on:true,list:[]},(r.data&&r.data.value)||{});st.list=Array.isArray(st.list)?st.list:[];
  const box=document.createElement('div');box.id='x-vs';box.className='stack';el.appendChild(box);
  const render=()=>{
    const L=st.list.length?st.list:DEF.map(x=>({...x}));st.list=L;
    box.innerHTML=`<hr style="border:0;border-top:1px solid var(--line);width:100%"><h2>📖 آية اليوم</h2>
    <p class="muted">آية صغيرة تحت التاريخ القبطي في الرئيسية، وبتتبدّل كل يوم بالترتيب. الآيات الجاهزة مبدئية، عدّلها أو امسحها واكتب آياتك.</p>
    <label class="chk"><input type="checkbox" id="vs-on" ${st.on?'checked':''}> إظهار آية اليوم</label>
    ${L.map((v,i)=>`<div class="vrow" data-i="${i}"><input data-f="t" value="${E(v.t||'')}" placeholder="نص الآية"><input class="r" data-f="r" value="${E(v.r||'')}" placeholder="مثلًا: مزمور ٢٣ : ١"><button class="btn" data-del="${i}" type="button">🗑</button></div>`).join('')}
    <div class="row-btns"><button class="btn ghost" id="vs-add" type="button">➕ إضافة آية</button><button class="btn primary" id="vs-save" type="button">حفظ</button></div><p class="message" id="vs-msg"></p>`;
    const pull=()=>{st.on=box.querySelector('#vs-on').checked;box.querySelectorAll('.vrow').forEach(r=>{const o=st.list[+r.dataset.i];r.querySelectorAll('[data-f]').forEach(x=>o[x.dataset.f]=x.value)})};
    box.querySelector('#vs-add').onclick=()=>{pull();st.list.push({t:'',r:''});render()};
    box.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{pull();st.list.splice(+b.dataset.del,1);render()});
    box.querySelector('#vs-save').onclick=async()=>{pull();const m=box.querySelector('#vs-msg');st.list=st.list.filter(v=>v.t.trim());
      const x=await db.rpc('set_setting',{p_key:'verse',p_value:st});if(x.error){m.textContent=x.error.message;m.classList.add('error');return}
      window.xVerse.set(JSON.parse(JSON.stringify(st)));render();box.querySelector('#vs-msg').textContent='تم الحفظ.'};
  };
  render();
}
setInterval(()=>{if(!isAdm())return;const s=$('x-set');if(s&&s.offsetParent)inject(s)},900);
})();
