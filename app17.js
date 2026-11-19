/* v17: تأكيد التكليف + تبديل/محتاج بديل + رصد النقص + التقويم الشهري + البحث السريع */
(function(){
const $=id=>document.getElementById(id);
const E=x=>typeof escapeHtml==='function'?escapeHtml(x):String(x??'');
const ar=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
const p2=n=>String(n).padStart(2,'0');
const cairo=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(x=>[x.type,x.value]));return{d:`${p.year}-${p.month}-${p.day}`,y:+p.year,m:+p.month,min:+p.hour*60+ +p.minute}};
const dnum=s=>{const a=s.split('-').map(Number);return Math.round(Date.UTC(a[0],a[1]-1,a[2])/864e5)};
const dtxt=d=>typeof dateText==='function'?dateText(d):d,ttxt=t=>typeof t12==='function'?t12((t||'').slice(0,5)):(t||'').slice(0,5);
const logged=()=>typeof db!=='undefined'&&db&&typeof currentUser!=='undefined'&&currentUser;
const role=()=>(typeof currentProfile!=='undefined'&&currentProfile&&currentProfile.role)||'';
const isAdm=()=>role()==='admin',isStaff=()=>role()==='admin'||role()==='server';
const SV=()=>(typeof servicesCache!=='undefined'&&servicesCache)||[];
const err=e=>alert((e&&e.message)||'حصل خطأ');
const rpc=async(n,a)=>{const r=await db.rpc(n,a||{});if(r.error){err(r.error);return false}return true};

/* ---------- مخزن مشترك لتكليفات الخدمات ---------- */
let asg=[],asgAt=0,asgBusy=false;
async function loadAsg(force){
  if(asgBusy||(!force&&Date.now()-asgAt<20000))return;asgBusy=true;
  try{let r=await db.from('service_assignees').select('service_id,user_id,name,status,seen_at');
    if(r.error)r=await db.from('service_assignees').select('service_id,user_id,name,status');
    asg=(r.data||[]).filter(x=>x.status==='approved');asgAt=Date.now()}catch{}asgBusy=false;
}
const today=()=>cairo().d;
const upcoming=s=>{if(!s.service_date)return false;const c=cairo();if(s.service_date>c.d)return true;if(s.service_date<c.d)return false;const t=(s.service_time||'00:00').split(':');return +t[0]*60+ +t[1]+120>c.min};

/* ---------- أماكن الأقسام في الرئيسية ---------- */
function place(el){ /* الترتيب: الخدمة الجاية ← تأكيد ← طلبات ← نقص */
  const ORD=['x-next','x-ack','x-req','x-short'],i=ORD.indexOf(el.id);let anchor=null;
  for(let k=i-1;k>=0&&!anchor;k--)anchor=$(ORD[k]);
  anchor=anchor||$('x-hero');if(anchor&&anchor.nextElementSibling!==el)anchor.after(el);
}
function section(id){let e=$(id);if(!e){e=document.createElement('div');e.id=id;e.dataset.v='home';e.className='x-box'}return e}

/* ---------- ١) تأكيد استلام التكليف (الخادم) ---------- */
function ackTick(){
  let e=$('x-ack');if(!logged()||!isStaff()||!$('x-hero')){if(e)e.remove();return}
  const mine=asg.filter(a=>a.user_id===currentUser.id&&a.seen_at===null&&'seen_at' in a);
  const L=mine.map(a=>SV().find(s=>String(s.id)===String(a.service_id))).filter(s=>s&&upcoming(s));
  if(!L.length){if(e)e.remove();return}
  e=section('x-ack');
  const sig=L.map(s=>s.id+s.service_date).join();if(e.dataset.sig!==sig){e.dataset.sig=sig;
    e.innerHTML=`<b>👍 تكليفات جديدة</b>`+L.map(s=>`<div class="x-it"><div><b>${E(s.title)}</b><div class="muted">${E(dtxt(s.service_date))} · ${E(ttxt(s.service_time))}${s.location?' · '+E(s.location):''}</div></div><button class="btn primary" data-ack="${E(s.id)}" type="button">👍 شفت التكليف</button></div>`).join('');
    e.querySelectorAll('[data-ack]').forEach(b=>b.onclick=async()=>{b.disabled=true;if(await rpc('ack_assignment',{p_service_id:String(b.dataset.ack)})){await loadAsg(true);ackTick()}else b.disabled=false})}
  place(e);
}

/* ---------- ٢+٦) أزرار «تبديل» و«محتاج بديل» على كارت الخدمة الجاية ---------- */
function dlg(html){const d=document.createElement('dialog');d.className='x-dlg';d.innerHTML=html;document.body.appendChild(d);d.addEventListener('close',()=>d.remove());d.showModal();return d}
async function swapDlg(s){
  const r=await db.rpc('staff_names');if(r.error)return err(r.error);
  const busy=new Set(asg.filter(a=>String(a.service_id)===String(s.id)).map(a=>a.user_id));
  const L=(r.data||[]).filter(p=>p.id!==currentUser.id&&!busy.has(p.id));
  const d=dlg(`<h3 style="margin-top:0">🔄 تبديل خدمة «${E(s.title)}»</h3><p class="muted">${E(dtxt(s.service_date))} · ${E(ttxt(s.service_time))}</p>
   <label>اختار زميل<select id="sw-to">${L.map(p=>`<option value="${p.id}">${E(p.full_name)}</option>`).join('')||'<option value="">مفيش خدام متاحين</option>'}</select></label>
   <label>السبب (اختياري)<input id="sw-r" maxlength="200" placeholder="مثلًا: عندي ظرف"></label>
   <p class="muted" style="font-size:13px">الزميل يوافق الأول، وبعدها المسؤول يعتمد.</p>
   <div class="row-btns"><button class="btn primary" id="sw-go" type="button">إرسال الطلب</button><button class="btn ghost" id="sw-x" type="button">إلغاء</button></div>`);
  d.querySelector('#sw-x').onclick=()=>d.close();
  d.querySelector('#sw-go').onclick=async()=>{const to=d.querySelector('#sw-to').value;if(!to)return;
    if(await rpc('request_swap',{p_service_id:String(s.id),p_to:to,p_reason:d.querySelector('#sw-r').value})){d.close();loadReq(true)}};
}
function coverDlg(s){
  const d=dlg(`<h3 style="margin-top:0">🆘 محتاج بديل في «${E(s.title)}»</h3><p class="muted">${E(dtxt(s.service_date))} · ${E(ttxt(s.service_time))}</p>
   <div>${['مسافر','ظرف طارئ','تعب'].map(x=>`<button type="button" class="chip x-rs">${x}</button>`).join('')}</div>
   <label>السبب (اختياري)<input id="cv-r" maxlength="200"></label>
   <p class="muted" style="font-size:13px">الإشعار هيوصل لكل الخدام المتاحين، وأول واحد يضغط «أنا هغطّي» يشيل الخدمة والمسؤول بيتبلّغ.</p>
   <div class="row-btns"><button class="btn primary" id="cv-go" type="button">🆘 اطلب بديل</button><button class="btn ghost" id="cv-x" type="button">إلغاء</button></div>`);
  d.querySelectorAll('.x-rs').forEach(b=>b.onclick=()=>d.querySelector('#cv-r').value=b.textContent);
  d.querySelector('#cv-x').onclick=()=>d.close();
  d.querySelector('#cv-go').onclick=async()=>{if(await rpc('request_cover',{p_service_id:String(s.id),p_reason:d.querySelector('#cv-r').value})){d.close();loadReq(true)}};
}
function actsTick(){
  const n=$('x-next');if(!n||!logged()||!isStaff())return;
  const s=SV().find(x=>String(x.id)===String(n.dataset.sid));if(!s)return;
  const busy=reqs.some(r=>String(r.service_id)===String(s.id)&&r.from_user===currentUser.id&&['open','pending_peer','pending_admin'].includes(r.status));
  let a=n.querySelector('.x-acts');const sig=s.id+'|'+busy;
  if(a&&a.dataset.sig===sig)return;if(a)a.remove();
  a=document.createElement('div');a.className='x-acts';a.dataset.sig=sig;
  a.innerHTML=busy?'<span class="tg">⏳ عندك طلب شغّال على الخدمة دي</span>':'<button class="btn ghost" data-a="sw" type="button">🔄 تبديل</button><button class="btn ghost" data-a="cv" type="button">🆘 محتاج بديل</button>';
  (n.querySelector('div:last-child')||n).appendChild(a);
  a.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>b.dataset.a==='sw'?swapDlg(s):coverDlg(s));
}

/* ---------- الطلبات (تبديل/بديل) ---------- */
let reqs=[],reqAt=0;
async function loadReq(force){
  if(!force&&Date.now()-reqAt<15000)return;reqAt=Date.now();
  try{const r=await db.from('swap_requests').select('*').in('status',['open','pending_peer','pending_admin']).order('created_at',{ascending:false});if(!r.error)reqs=r.data||[]}catch{}
  reqTick(true);
}
const ST={open:'⏳ مستني حد يغطّي',pending_peer:'⏳ مستني ردّ الزميل',pending_admin:'⏳ مستني اعتماد المسؤول'};
function reqTick(force){
  let e=$('x-req');if(!logged()||!isStaff()||!$('x-hero')){if(e)e.remove();return}
  const me=currentUser.id,live=r=>!r.service_date||r.service_date>=today();
  const items=[];
  reqs.filter(live).forEach(r=>{
    const what=`«${E(r.service_title||'')}» ${E(dtxt(r.service_date))}`;
    if(r.kind==='swap'&&r.status==='pending_peer'&&r.to_user===me)items.push({k:r.id+r.status,h:`🔄 <b>${E(r.from_name)}</b> بيطلب تبديل خدمته ${what}${r.reason?`<div class="muted">السبب: ${E(r.reason)}</div>`:''}`,b:[['respond_swap','موافق','primary',{p_id:r.id,p_accept:true}],['respond_swap','اعتذر','ghost',{p_id:r.id,p_accept:false}]]});
    else if(r.kind==='cover'&&r.status==='open'&&r.from_user!==me&&!asg.some(a=>String(a.service_id)===String(r.service_id)&&a.user_id===me))items.push({k:r.id+r.status,h:`🆘 <b>${E(r.from_name)}</b> محتاج بديل في ${what}${r.reason?`<div class="muted">السبب: ${E(r.reason)}</div>`:''}`,b:[['take_cover','🙋 أنا هغطّي','primary',{p_id:r.id}]]});
    else if(r.from_user===me)items.push({k:r.id+r.status,h:`${r.kind==='swap'?'🔄 طلب تبديل':'🆘 طلب بديل'} ${what}${r.to_name?' مع <b>'+E(r.to_name)+'</b>':''}<div class="muted">${ST[r.status]||''}</div>`,b:[['cancel_request','إلغاء الطلب','ghost',{p_id:r.id}]]});
    if(isAdm()&&r.kind==='swap'&&r.status==='pending_admin')items.push({k:r.id+r.status+'a',h:`🛡 تبديل محتاج اعتمادك: <b>${E(r.from_name)}</b> ⇄ <b>${E(r.to_name)}</b> ${what}`,b:[['admin_decide_swap','✅ اعتماد','primary',{p_id:r.id,p_ok:true}],['admin_decide_swap','❌ رفض','ghost',{p_id:r.id,p_ok:false}]]});
  });
  if(!items.length){if(e)e.remove();return}
  e=section('x-req');const sig=items.map(i=>i.k).join();
  if(force||e.dataset.sig!==sig){e.dataset.sig=sig;
    e.innerHTML=`<b>🔁 الطلبات</b>`+items.map((i,x)=>`<div class="x-it"><div>${i.h}</div><div class="row-btns">${i.b.map((b,y)=>`<button class="btn ${b[2]}" data-i="${x}.${y}" type="button">${b[1]}</button>`).join('')}</div></div>`).join('');
    e.querySelectorAll('[data-i]').forEach(btn=>btn.onclick=async()=>{const[x,y]=btn.dataset.i.split('.').map(Number),b=items[x].b[y];
      btn.disabled=true;const ok=await rpc(b[0],b[3]);if(ok){await loadAsg(true);if(typeof refreshData==='function')refreshData();await loadReq(true)}else btn.disabled=false})}
  place(e);
}

/* ---------- ٥) رصد النقص (للمسؤول) ---------- */
function shortTick(){
  let e=$('x-short');if(!logged()||!isAdm()||!$('x-hero')){if(e)e.remove();return}
  const c=cairo(),lim=dnum(c.d)+2;
  const L=SV().filter(s=>s.service_date&&upcoming(s)&&dnum(s.service_date)<=lim).map(s=>{
    const names=asg.filter(a=>String(a.service_id)===String(s.id)).map(a=>a.name),need=+s.needed||0;return{s,names,miss:need-names.length,need}}).filter(x=>x.need>0&&x.miss>0);
  if(!L.length){if(e)e.remove();return}
  e=section('x-short');e.classList.add('warn');
  const sig=L.map(x=>x.s.id+x.s.service_date+x.names.length).join();
  if(e.dataset.sig!==sig){e.dataset.sig=sig;
    e.innerHTML=`<b>⚠ خدمات ناقصة (خلال يومين)</b>`+L.map(x=>`<div class="x-it"><div><b>${E(x.s.title)}</b> · ${E(dtxt(x.s.service_date))} ${E(ttxt(x.s.service_time))}<div class="muted">مطلوب ${ar(x.need)}، متسجّل ${ar(x.names.length)}${x.names.length?': '+E(x.names.join('، ')):''}</div></div><button class="btn primary" data-vol="${E(x.s.id)}" type="button">📢 اطلب متطوعين</button></div>`).join('');
    e.querySelectorAll('[data-vol]').forEach(b=>b.onclick=async()=>{b.disabled=true;const r=await db.rpc('request_volunteers',{p_service_id:String(b.dataset.vol)});if(r.error){err(r.error);b.disabled=false}else b.textContent='✅ اتبعت لـ '+ar(r.data||0)+' خادم'})}
  place(e);
}

/* ---------- متابعة التكليفات (إعدادات المسؤول) ---------- */
async function injectTrack(el){
  if(!isAdm()||el.querySelector('#x-trk'))return;
  const box=document.createElement('div');box.id='x-trk';box.className='stack';el.appendChild(box);
  const draw=async()=>{await loadAsg(true);
    const L=SV().filter(upcoming).slice(0,12).map(s=>({s,a:asg.filter(a=>String(a.service_id)===String(s.id)&&a.user_id)})).filter(x=>x.a.length);
    const un=L.reduce((n,x)=>n+x.a.filter(a=>a.seen_at===null&&'seen_at' in a).length,0);
    box.innerHTML=`<hr style="border:0;border-top:1px solid var(--line);width:100%"><h2>👍 متابعة التكليفات</h2><p class="muted">مين شاف تكليفه ومين لسه.</p>`+
     (L.map(x=>`<div class="x-it" style="display:block"><b>${E(x.s.title)}</b> <span class="muted">${E(dtxt(x.s.service_date))}</span><div>${x.a.map(a=>`<span class="chip">${a.seen_at?'✅':'⏳'} ${E(a.name)}</span>`).join('')}</div></div>`).join('')||'<p class="muted">مفيش تكليفات حاليًا.</p>')+
     `<div class="row-btns"><button class="btn primary" id="trk-rm" type="button" ${un?'':'disabled'}>🔔 ذكّر اللي لسه (${ar(un)})</button><button class="btn ghost" id="trk-rf" type="button">تحديث</button></div><p class="message" id="trk-m"></p>`;
    box.querySelector('#trk-rf').onclick=draw;
    box.querySelector('#trk-rm').onclick=async()=>{const r=await db.rpc('remind_unseen');box.querySelector('#trk-m').textContent=r.error?r.error.message:`اتبعت تذكير لـ ${ar(r.data||0)} خادم.`}};
  draw();
}
setInterval(()=>{if(!isAdm())return;const s=$('x-set');if(s&&s.offsetParent)injectTrack(s)},900);

/* ---------- ٩) التقويم الشهري ---------- */
const MN=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],COL=['#3166e8','#1f9d77','#b98a1a','#a855c7','#d1495b','#2a9fb8'];
let cm=null,csel=null;
const colOf=t=>{let h=0;for(const ch of String(t||''))h=(h*31+ch.charCodeAt(0))>>>0;return COL[h%COL.length]};
function monthEvents(y,m){
  const map={},last=new Date(Date.UTC(y,m,0)).getUTCDate();
  (window.xAllSvc||SV()).forEach(s=>{if(!s.service_date)return;const base=dnum(s.service_date),rep=+s.repeat_days||0;
    for(let d=1;d<=last;d++){const ds=`${y}-${p2(m)}-${p2(d)}`,n=dnum(ds);let ev=null;
      if(n===base)ev={s,real:true,time:s.service_time,loc:s.location,comm:!!s.comm_shift};
      else if(rep>0&&n>base&&(n-base)%rep===0){
        const dow=new Date(Date.UTC(y,m-1,d)).getUTCDay(),ord=Math.ceil(d/7),hit=s.comm_on&&dow===5&&(s.comm_ordinals||[]).includes(ord);
        const ot=s._ot!==undefined?s._ot:s.service_time,ol=s._ol!==undefined?s._ol:s.location;
        ev={s,real:false,time:hit&&s.comm_time?s.comm_time:ot,loc:hit&&s.comm_location?s.comm_location:ol,comm:!!hit}}
      if(ev){ev.cx=!!(s.cancel_forever||(s.cancel_until&&ds<=s.cancel_until));(map[d]=map[d]||[]).push(ev)}}});
  return map;
}
function renderCal(){
  const el=$('x-cal');if(!el)return;const c=cairo();if(!cm)cm={y:c.y,m:c.m};
  const ev=monthEvents(cm.y,cm.m),first=new Date(Date.UTC(cm.y,cm.m-1,1)).getUTCDay(),last=new Date(Date.UTC(cm.y,cm.m,0)).getUTCDate(),isNow=cm.y===c.y&&cm.m===c.m;
  if(csel===null||csel>last)csel=isNow?+c.d.slice(8):1;
  let g=['س','ح','ن','ث','ر','خ','ج'].map(x=>`<div class="muted cal-h">${x}</div>`).join('')+'<div></div>'.repeat((first+1)%7);
  for(let d=1;d<=last;d++){const L=ev[d]||[];g+=`<button type="button" class="cal-c ${isNow&&d===+c.d.slice(8)?'now':''} ${d===csel?'sel':''}" data-d="${d}"><span>${ar(d)}</span>${L.slice(0,3).map(x=>`<i class="${x.real?'':'prj'}${x.cx?' cxd':''}" style="background:${colOf(x.s.title)}">${x.cx?'🚫 ':''}${E(x.s.title)}</i>`).join('')}${L.length>3?`<small>+${ar(L.length-3)}</small>`:''}</button>`}
  const names=s=>asg.filter(a=>String(a.service_id)===String(s.id)).map(a=>a.name).join('، ');
  const D=ev[csel]||[];
  el.innerHTML=`<div class="row-btns" style="justify-content:space-between;align-items:center"><h2 style="margin:0">📆 ${MN[cm.m-1]} ${ar(cm.y)}</h2><span class="row-btns"><button class="btn ghost" id="cal-p" type="button">▶</button><button class="btn ghost" id="cal-t" type="button">النهارده</button><button class="btn ghost" id="cal-n" type="button">◀</button></span></div>
   <div class="cal-g">${g}</div>
   <div class="x-box"><b>${ar(csel)} ${MN[cm.m-1]}</b>${D.length?D.map(x=>`<div class="x-it" style="display:block"><span class="dot" style="background:${colOf(x.s.title)}"></span><b>${E(x.s.title)}</b> ${x.cx?'<span class="tg" style="color:var(--red)">🚫 ملغاة</span>':''}${x.comm?'<span class="tg">🕊 تناول</span>':''}${x.real?'':' <span class="muted">(متوقعة)</span>'}<div class="muted">${E(ttxt(x.time))}${x.loc?' · '+E(x.loc):''}${x.real&&names(x.s)?' · '+E(names(x.s)):''}</div></div>`).join(''):'<p class="muted" style="margin:6px 0 0">مفيش خدمات في اليوم ده.</p>'}</div>
   <p class="muted" style="font-size:12px">الخدمات الأسبوعية المتوقعة بتظهر باهتة، وأسماء الخدام بتظهر للخدمة الحالية بس.</p>`;
  el.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{csel=+b.dataset.d;renderCal()});
  const mv=k=>{cm.m+=k;if(cm.m>12){cm.m=1;cm.y++}if(cm.m<1){cm.m=12;cm.y--}csel=null;renderCal()};
  el.querySelector('#cal-p').onclick=()=>mv(-1);el.querySelector('#cal-n').onclick=()=>mv(1);
  el.querySelector('#cal-t').onclick=()=>{cm=null;csel=null;renderCal()};
}
window.xLoadCal=async function(){if(!window.xEnsure)return;window.xEnsure('x-cal');await loadAsg(true);renderCal()};

/* ---------- ١٠) البحث السريع ---------- */
function searchBtn(){
  if($('x-sbtn')||!logged())return;const bar=document.querySelector('.top-actions');if(!bar)return;
  const b=document.createElement('button');b.id='x-sbtn';b.type='button';b.className='btn ghost';b.textContent='🔍';b.title='بحث';b.onclick=openSearch;bar.prepend(b);
}
async function openSearch(){
  await loadAsg(true);
  const d=dlg(`<div class="row-btns" style="align-items:center"><span style="font-size:20px">🔍</span><input id="q-i" placeholder="ابحث عن خدمة أو خادم…" style="flex:1" autocomplete="off"><button class="btn ghost" id="q-x" type="button">✕</button></div><div id="q-r" style="margin-top:10px"></div>`);
  const inp=d.querySelector('#q-i'),res=d.querySelector('#q-r');d.querySelector('#q-x').onclick=()=>d.close();inp.focus();
  const norm=s=>String(s||'').replace(/[ً-ْـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').toLowerCase();
  const run=()=>{const q=norm(inp.value.trim());if(!q){res.innerHTML='<p class="muted">اكتب اسم خدمة أو خادم.</p>';return}
    const sv=SV().filter(s=>norm(s.title).includes(q)||norm(s.location).includes(q));
    const by={};asg.forEach(a=>{if(norm(a.name).includes(q)){const s=SV().find(s=>String(s.id)===String(a.service_id));if(s)(by[a.name]=by[a.name]||[]).push(s)}});
    const ppl=Object.keys(by);
    res.innerHTML=(ppl.length?`<div class="muted" style="font-size:13px">خدام</div>`+ppl.map(n=>`<div class="x-it" style="display:block">👤 <b>${E(n)}</b>${by[n].map(s=>`<div class="muted">${E(s.title)} · ${E(dtxt(s.service_date))} ${E(ttxt(s.service_time))}</div>`).join('')}</div>`).join(''):'')+
      (sv.length?`<div class="muted" style="font-size:13px;margin-top:6px">خدمات</div>`+sv.map(s=>`<div class="x-it" style="display:block">📋 <b>${E(s.title)}</b><div class="muted">${E(dtxt(s.service_date))} · ${E(ttxt(s.service_time))}${s.location?' · '+E(s.location):''}</div></div>`).join(''):'')||'<p class="muted">مفيش نتايج.</p>'};
  inp.oninput=run;run();
}

/* ---------- تشغيل ---------- */
/* ---------- إشعار النقص التلقائي: pg_cron لو متاح، وإلا الموقع بيشغّله كل ١٠ دقايق لما المسؤول يفتحه ---------- */
let lastSh=0;async function shortCron(){if(!isAdm()||Date.now()-lastSh<6e5)return;lastSh=Date.now();try{await db.rpc('notify_shortage',{p_force:false})}catch{}}
async function injectShort(el){
  if(!isAdm()||el.querySelector('#x-shs'))return;
  const r=await db.from('app_settings').select('value').eq('key','shortage').maybeSingle();if(el.querySelector('#x-shs'))return;
  const st=Object.assign({on:true,days:2},(r.data&&r.data.value)||{});
  const box=document.createElement('div');box.id='x-shs';box.className='stack';el.appendChild(box);
  box.innerHTML=`<hr style="border:0;border-top:1px solid var(--line);width:100%"><h2>⚠ إشعار نقص الخدمات</h2><p class="muted">لو خدمة عدد المسجّلين فيها أقل من «المطلوب»، المسؤولين بيوصلهم إشعار (مرة واحدة لكل حالة نقص). الخدمة اللي مفيهاش «المطلوب» مش بتتحسب.</p>
   <label class="chk"><input type="checkbox" id="sh-on" ${st.on?'checked':''}> تفعيل الإشعار</label>
   <label>قبل الخدمة بكام يوم<select id="sh-d">${[0,1,2,3,5,7].map(n=>`<option value="${n}" ${+st.days===n?'selected':''}>${n===0?'يوم الخدمة بس':ar(n)+' '+(n<=2?'يوم':'أيام')}</option>`).join('')}</select></label>
   <div class="row-btns"><button class="btn primary" id="sh-s" type="button">حفظ</button><button class="btn ghost" id="sh-n" type="button">افحص دلوقتي</button></div><p class="message" id="sh-m"></p>`;
  const m=box.querySelector('#sh-m');
  box.querySelector('#sh-s').onclick=async()=>{const v={on:box.querySelector('#sh-on').checked,days:+box.querySelector('#sh-d').value};const x=await db.rpc('set_setting',{p_key:'shortage',p_value:v});m.textContent=x.error?x.error.message:'تم الحفظ.'};
  box.querySelector('#sh-n').onclick=async()=>{const x=await db.rpc('notify_shortage',{p_force:true});m.textContent=x.error?x.error.message:(x.data?`اتبعت ${ar(x.data)} إشعار.`:'مفيش نقص جديد يتبلّغ عنه.')};
}
setInterval(()=>{if(!isAdm())return;const s=$('x-set');if(s&&s.offsetParent)injectShort(s)},900);

setInterval(async()=>{if(!logged())return;for(const f of [searchBtn,loadAsg,loadReq,ackTick,reqTick,shortTick,actsTick,shortCron]){try{await f()}catch(e){console.error('x17',f.name,e)}}},2000);
})();
