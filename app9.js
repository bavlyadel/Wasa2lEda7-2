/* v6: الحضور والغياب + إضافة الخدمات للتقويم (.ics) */
(function(){
const E=escapeHtml,adm=()=>currentProfile&&currentProfile.role==='admin',staff=()=>currentProfile&&['server','admin'].includes(currentProfile.role);
const cairoDate=()=>new Intl.DateTimeFormat('sv',{timeZone:'Africa/Cairo'}).format(new Date());
const AR={present:'حاضر',late:'متأخر',absent:'غايب'},CLS={present:'approved',late:'pending',absent:'rejected'};
let cfgCache=null;
async function getCfg(force){
  if(cfgCache&&!force)return cfgCache;
  let v={};try{const r=await db.from('app_settings').select('value').eq('key','attendance').maybeSingle();v=(r.data&&r.data.value)||{}}catch{}
  return cfgCache={on:v.on!==false,self:v.self!==false};
}

/* ---------- إضافة للتقويم (.ics) ---------- */
function offMin(y,m,d,H,M){
  const g=Date.UTC(y,m-1,d,H,M);
  const f=new Intl.DateTimeFormat('en-US',{timeZone:'Africa/Cairo',hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).formatToParts(new Date(g));
  const p=t=>+f.find(x=>x.type===t).value;
  return Math.round((Date.UTC(p('year'),p('month')-1,p('day'),p('hour'),p('minute'))-g)/60000);
}
function cairoUtc(ds,ts){
  const [y,m,d]=ds.split('-').map(Number),[H,M]=(ts||'00:00').split(':').map(Number);
  return new Date(Date.UTC(y,m-1,d,H,M)-offMin(y,m,d,H,M)*60000);
}
const stamp=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
const esc=t=>String(t==null?'':t).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
function buildIcs(list){
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Wasael Idah//Services//AR','CALSCALE:GREGORIAN','X-WR-CALNAME:خدمات وسائل إيضاح'];
  list.forEach(s=>{
    const t=(s.service_time||'').slice(0,5);
    L.push('BEGIN:VEVENT','UID:svc-'+s.id+'-'+s.service_date+'@wasael','DTSTAMP:'+stamp(new Date()));
    if(t){const st=cairoUtc(s.service_date,t);L.push('DTSTART:'+stamp(st),'DTEND:'+stamp(new Date(st.getTime()+2*3600e3)))}
    else{const n=new Date(Date.UTC(+s.service_date.slice(0,4),+s.service_date.slice(5,7)-1,+s.service_date.slice(8,10)+1));
      L.push('DTSTART;VALUE=DATE:'+s.service_date.replace(/-/g,''),'DTEND;VALUE=DATE:'+n.toISOString().slice(0,10).replace(/-/g,''))}
    L.push('SUMMARY:'+esc('خدمة: '+s.title));
    if(s.location)L.push('LOCATION:'+esc(s.location));
    if(s.notes)L.push('DESCRIPTION:'+esc(s.notes));
    ['-PT1H','-P1D'].forEach(tr=>L.push('BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+esc('تذكير بخدمة '+s.title),'TRIGGER:'+tr,'END:VALARM'));
    L.push('END:VEVENT');
  });
  L.push('END:VCALENDAR');return L.join('\r\n');
}
function download(name,text,type){
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:type||'text/calendar;charset=utf-8'}));
  a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);
}
const upcoming=()=>{const t=cairoDate();return servicesCache.filter(s=>s.service_date>=t&&!(window.xExpired&&window.xExpired(s)))};
async function exportIcs(mine){
  let list=upcoming();
  if(mine){
    const r=await db.from('service_assignees').select('service_id').eq('user_id',currentUser.id).eq('status','approved');
    const ids=new Set((r.data||[]).map(x=>String(x.service_id)));list=list.filter(s=>ids.has(String(s.id)));
  }
  if(!list.length)return alert(mine?'مفيش خدمات قادمة إنت مكلّف بيها.':'مفيش خدمات قادمة في الجدول.');
  download(mine?'my-services.ics':'services.ics',buildIcs(list));
}
function injectIcs(){
  if(!currentProfile||currentProfile.approved===false)return;
  const dl=$('x-dl');if(!dl||!dl.offsetParent)return;
  const row=dl.parentElement;
  if(!$('x-ics-all')){const b=document.createElement('button');b.id='x-ics-all';b.type='button';b.className='btn ghost';b.textContent='📅 ضيف الجدول للتقويم';b.onclick=()=>exportIcs(false);row.appendChild(b)}
  if(staff()&&!$('x-ics-me')){const b=document.createElement('button');b.id='x-ics-me';b.type='button';b.className='btn ghost';b.textContent='📅 ضيف خدماتي للتقويم';b.onclick=()=>exportIcs(true);row.appendChild(b)}
}

/* ---------- الخادم يسجّل حضوره (يوم الخدمة بس) ---------- */
async function checkin(){
  const old=$('x-checkin'),rm=()=>{if(old)old.remove()};
  if(!currentUser||!currentProfile||currentProfile.approved===false||!staff())return rm();
  const cfg=await getCfg(true),today=cairoDate(),todays=servicesCache.filter(s=>s.service_date===today);
  if(!cfg.on||!cfg.self||!todays.length)return rm();
  const [a,t]=await Promise.all([
    db.from('service_assignees').select('service_id').eq('user_id',currentUser.id).eq('status','approved'),
    db.from('attendance').select('service_id,status').eq('user_id',currentUser.id).eq('service_date',today)]);
  const ids=new Set((a.data||[]).map(x=>String(x.service_id))),done=Object.fromEntries((t.data||[]).map(x=>[String(x.service_id),x.status]));
  const list=todays.filter(s=>ids.has(String(s.id)));
  if(!list.length)return rm();
  const sec=old||document.createElement('section');sec.id='x-checkin';sec.className='panel pad stack';sec.dataset.v='home';
  sec.innerHTML=`<h2>📍 حضور النهاردة</h2>`+list.map(s=>{
    const st=done[String(s.id)],tm=(s.service_time||'').slice(0,5);
    return `<div class="row-btns" style="align-items:center;justify-content:space-between"><div><b>${E(s.title)}</b><div class="muted">${tm?'الساعة '+E(tm):''}${s.location?' · '+E(s.location):''}</div></div>`+
      (st?`<span class="status ${CLS[st]}">${st==='late'?'⏱ اتسجّل متأخر':'✅ تم تسجيل حضورك'}</span>`:`<button class="btn primary" data-ci="${E(s.id)}" type="button">سجّلت حضوري</button>`)+`</div>`}).join('')+`<p class="message" id="x-ci-msg"></p>`;
  if(!old){const ref=$('x-hero')||$('stats');ref?ref.after(sec):$('app-view').prepend(sec)}
  sec.querySelectorAll('[data-ci]').forEach(b=>b.onclick=async()=>{
    b.disabled=true;const r=await db.rpc('attendance_checkin',{p_service_id:String(b.dataset.ci)});
    if(r.error){b.disabled=false;const m=$('x-ci-msg');m.textContent=r.error.message;m.classList.add('error')}else checkin();
  });
}

/* ---------- صفحة الحضور والغياب (للمسؤول) ---------- */
let tab='day',selDate=null,selMonth=null;
const tabs=()=>`<div class="row-btns"><button class="btn ${tab==='day'?'primary':'ghost'}" data-t="day" type="button">تسجيل الحضور</button><button class="btn ${tab==='month'?'primary':'ghost'}" data-t="month" type="button">تقرير الشهر</button></div>`;
window.xLoadAtt=async function(){
  if(!adm())return;
  const el=xEnsure('x-att');selDate=selDate||cairoDate();selMonth=selMonth||cairoDate().slice(0,7);
  const cfg=await getCfg(true);
  const head=`<h2>🧾 الحضور والغياب</h2>
  <div class="request-item stack"><label class="chk"><input type="checkbox" id="at-on" ${cfg.on?'checked':''}> تفعيل تسجيل الحضور</label>
  <label class="chk"><input type="checkbox" id="at-self" ${cfg.self?'checked':''}> الخادم يسجّل حضوره بنفسه (لو مقفول: إنت بس اللي بتسجّل من هنا)</label>
  <p class="message" id="at-msg"></p></div>`+tabs();
  el.innerHTML=head+'<div id="at-body"><p class="muted">جاري التحميل…</p></div>';
  const save=async()=>{const r=await db.rpc('set_attendance_cfg',{p_on:$('at-on').checked,p_self:$('at-self').checked});
    const m=$('at-msg');m.textContent=r.error?r.error.message:'تم الحفظ.';m.classList.toggle('error',!!r.error);if(!r.error)cfgCache=null};
  $('at-on').onchange=save;$('at-self').onchange=save;
  el.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{tab=b.dataset.t;window.xLoadAtt()});
  if(tab==='day')await dayView($('at-body'));else await monthView($('at-body'));
};
async function dayView(box){
  const dates=[...new Set(servicesCache.map(s=>s.service_date))].filter(d=>d<=cairoDate()||upcoming().some(s=>s.service_date===d)).sort().slice(-4);
  const [a,t]=await Promise.all([db.from('service_assignees').select('service_id,user_id,name,status'),db.from('attendance').select('*').eq('service_date',selDate)]);
  const att={};(t.data||[]).forEach(x=>att[String(x.service_id)+'|'+x.user_id]=x.status);
  const svcs=servicesCache.filter(s=>s.service_date===selDate);
  box.innerHTML=`<div class="stack"><label>تاريخ الخدمة<input type="date" id="at-date" value="${selDate}"></label>
  <div class="row-btns">${dates.map(d=>`<button class="btn ghost" data-d="${d}" type="button">${d.slice(8)}/${d.slice(5,7)}</button>`).join('')}</div></div>`+
  (svcs.length?svcs.map(s=>{
    const as=(a.data||[]).filter(x=>String(x.service_id)===String(s.id)&&x.status==='approved');
    return `<article class="request-item stack"><b>${E(s.title)}</b><div class="muted">${E((s.service_time||'').slice(0,5))} ${E(s.location||'')}</div>`+
      (as.length?as.map(x=>{const st=att[String(s.id)+'|'+x.user_id];
        return `<div class="row-btns" style="align-items:center;justify-content:space-between"><span>${E(x.name||'—')} ${st?`<span class="status ${CLS[st]}">${AR[st]}</span>`:''}</span>`+
        (x.user_id?`<span class="row-btns">${['present','late','absent'].map(k=>`<button class="btn ${st===k?'primary':'ghost'}" data-m="${k}" data-s="${E(s.id)}" data-u="${x.user_id}" type="button">${AR[k]}</button>`).join('')}${st?`<button class="btn ghost" data-m="clear" data-s="${E(s.id)}" data-u="${x.user_id}" type="button">↩</button>`:''}</span>`:'<small class="muted">من غير حساب</small>')+`</div>`}).join(''):'<p class="muted">مفيش مكلّفين بالخدمة دي.</p>')+`</article>`}).join(''):'<p class="muted">مفيش خدمات في اليوم ده.</p>');
  $('at-date').onchange=e=>{selDate=e.target.value||selDate;window.xLoadAtt()};
  box.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{selDate=b.dataset.d;window.xLoadAtt()});
  box.querySelectorAll('[data-m]').forEach(b=>b.onclick=async()=>{
    b.disabled=true;const r=await db.rpc('attendance_mark',{p_service_id:String(b.dataset.s),p_date:selDate,p_user:b.dataset.u,p_status:b.dataset.m==='clear'?null:b.dataset.m});
    if(r.error){b.disabled=false;return alert(r.error.message)}window.xLoadAtt();
  });
}
async function monthView(box){
  const r=await db.from('attendance').select('user_id,name,status,service_date').gte('service_date',selMonth+'-01').lte('service_date',selMonth+'-31');
  const m={};(r.data||[]).forEach(x=>{const o=m[x.user_id]=m[x.user_id]||{name:x.name||'—',present:0,late:0,absent:0};o[x.status]++});
  const rows=Object.values(m).sort((a,b)=>a.name.localeCompare(b.name,'ar')).map(o=>{const n=o.present+o.late+o.absent;return{...o,n,pct:n?Math.round((o.present+o.late)*100/n):0}});
  box.innerHTML=`<label>الشهر<input type="month" id="at-month" value="${selMonth}"></label>`+(rows.length?
   `<div class="table-scroll"><table><thead><tr><th>الخادم</th><th>حاضر</th><th>متأخر</th><th>غايب</th><th>الالتزام</th></tr></thead><tbody>${rows.map(o=>`<tr><td>${E(o.name)}</td><td>${o.present}</td><td>${o.late}</td><td>${o.absent}</td><td>${o.pct}%</td></tr>`).join('')}</tbody></table></div><div class="row-btns"><button class="btn" id="at-csv" type="button">⬇️ تنزيل Excel (CSV)</button></div>`:'<p class="muted">مفيش حضور متسجّل في الشهر ده.</p>');
  $('at-month').onchange=e=>{selMonth=e.target.value||selMonth;window.xLoadAtt()};
  const c=$('at-csv');if(c)c.onclick=()=>download('attendance-'+selMonth+'.csv','\ufeff'+['الخادم,حاضر,متأخر,غايب,الالتزام %'].concat(rows.map(o=>[`"${o.name.replace(/"/g,'""')}"`,o.present,o.late,o.absent,o.pct].join(','))).join('\r\n'),'text/csv;charset=utf-8');
}

setInterval(()=>{if(typeof currentProfile!=='undefined'&&currentProfile)injectIcs()},900);
const orig=refreshData;
refreshData=async function(){await orig();try{await checkin()}catch{}};
if(typeof currentUser!=='undefined'&&currentUser)refreshData();
})();
