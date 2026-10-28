/* ثيمات + مشاركة الجدول كصورة */
(function(){
const TH=[['dark','🌙 داكن'],['light','☀️ فاتح'],['emerald','🌿 زمردي'],['royal','👑 ملكي'],['sunset','🌇 غروب'],['auto','🖥 تلقائي']];
const get=()=>{try{return localStorage.getItem('theme')||'dark'}catch{return'dark'}};
function apply(t){const r=t==='auto'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):t;document.documentElement.dataset.theme=r;const m=document.querySelector('meta[name=theme-color]');if(m)m.content=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()||'#111827'}
const ta=document.querySelector('.top-actions');
if(ta){ta.insertAdjacentHTML('afterbegin',`<select id="x-theme" aria-label="الثيم">${TH.map(([v,n])=>`<option value="${v}">${n}</option>`).join('')}</select>`);
  const s=document.getElementById('x-theme');s.value=get();s.onchange=()=>{try{localStorage.setItem('theme',s.value)}catch{}apply(s.value)}}
apply(get());
matchMedia('(prefers-color-scheme: light)').addEventListener?.('change',()=>{if(get()==='auto')apply('auto')});

/* ---------- صورة الجدول ---------- */
const todayCairo=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo'}).format(new Date());
const loadImg=src=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src});
const longDate=d=>new Intl.DateTimeFormat('ar-EG',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(d+'T12:00:00'));
function wrap(c,text,w){const out=[];String(text||'').split('\n').forEach(p=>{let cur='';p.split(/\s+/).filter(Boolean).forEach(word=>{const t=cur?cur+' '+word:word;if(c.measureText(t).width>w&&cur){out.push(cur);cur=word}else cur=t});out.push(cur||'')});return out.length?out:['—']}
async function build(){
  const T=todayCairo(),svs=servicesCache.filter(s=>s.service_date>=T);
  if(!svs.length){alert('مفيش خدمات جاية في الجدول.');return null}
  const as=(await db.from('service_assignees').select('service_id,name,status').eq('status','approved')).data||[];
  try{await document.fonts.load('700 26px Cairo')}catch{}
  const [lw,lc]=await Promise.all([loadImg('assets/logo-wasael.png'),loadImg('assets/logo-church.png')]);
  const F='Cairo, Tahoma, sans-serif',W=1240,S=2,X0=W-40,col=[.22,.12,.2,.28,.18].map(x=>x*(W-80));
  const heads=['الخدمة','الميعاد','المكان','المكلّفون','ملاحظات'];
  const cv=document.createElement('canvas'),c=cv.getContext('2d');c.font=`600 24px ${F}`;
  const items=[];let y=190,last='';
  for(const s of svs){
    if(s.service_date!==last){last=s.service_date;items.push({k:'d',y,t:longDate(s.service_date)});y+=64;items.push({k:'h',y});y+=52}
    const cells=[s.title,t12(s.service_time),s.location,as.filter(a=>a.service_id==s.id).map(a=>a.name).join('\n')||'—',[s.notes,String(communionText(s)).startsWith('✔')?'✔ جمعة التناول':''].filter(Boolean).join('\n')||'—'];
    const lines=cells.map((t,i)=>wrap(c,t,col[i]-28)),h=Math.max(...lines.map(l=>l.length))*36+28;
    items.push({k:'r',y,h,lines});y+=h;
  }
  const H=y+90;cv.width=W*S;cv.height=H*S;c.scale(S,S);c.direction='rtl';c.textAlign='right';c.textBaseline='top';
  const cs=getComputedStyle(document.documentElement);
  c.fillStyle='#ffffff';c.fillRect(0,0,W,H);
  const g=c.createLinearGradient(0,0,W,0);g.addColorStop(0,'#14233c');g.addColorStop(1,'#3166e8');c.fillStyle=g;c.fillRect(0,0,W,150);
  const lh=96;if(lw){const w=lw.width*lh/lw.height;c.drawImage(lw,X0-w,27,w,lh)}if(lc){const w=lc.width*lh/lc.height;c.drawImage(lc,40,27,w,lh)}
  c.textAlign='center';c.fillStyle='#fff';c.font=`800 42px ${F}`;c.fillText('وسائل إيضاح',W/2,34);c.font=`600 26px ${F}`;c.fillStyle='#cfe0ff';c.fillText('جدول الخدمات',W/2,92);
  c.textAlign='right';let n=0;
  for(const it of items){
    if(it.k==='d'){c.fillStyle='#14233c';c.font=`800 30px ${F}`;c.fillText('📅 '+it.t,X0,it.y+10);c.fillStyle='#3166e8';c.fillRect(40,it.y+54,W-80,3)}
    else if(it.k==='h'){c.fillStyle='#eef3fb';c.fillRect(40,it.y,W-80,48);c.fillStyle='#34425f';c.font=`700 22px ${F}`;let x=X0;heads.forEach((t,i)=>{c.fillText(t,x-16,it.y+10);x-=col[i]});n=0}
    else{c.fillStyle=n++%2?'#f6f8fc':'#ffffff';c.fillRect(40,it.y,W-80,it.h);c.fillStyle='#16213a';let x=X0;it.lines.forEach((ls,i)=>{c.font=`${i===0?700:500} 24px ${F}`;ls.forEach((t,j)=>c.fillText(t,x-16,it.y+14+j*36));x-=col[i]});c.fillStyle='#dde4f0';c.fillRect(40,it.y+it.h-1,W-80,1)}
  }
  c.textAlign='center';c.fillStyle='#5f6e8a';c.font=`500 20px ${F}`;c.fillText('كنيسة الملاك ميخائيل والأنبا شنودة بعياد بك',W/2,H-56);
  return new Promise(r=>cv.toBlob(r,'image/png'));
}
async function run(share){
  const b=document.getElementById(share?'x-share':'x-dl');b.disabled=true;
  try{const blob=await build();if(!blob)return;const f=new File([blob],'جدول-الخدمات.png',{type:'image/png'});
    if(share&&navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:'جدول الخدمات'});return}catch(e){if(e.name==='AbortError')return}}
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='جدول-الخدمات.png';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  }catch(e){alert('تعذر عمل الصورة: '+(e.message||e))}finally{b.disabled=false}
}
const rf=document.getElementById('refresh');
if(rf){const w=document.createElement('div');w.className='row-btns';w.style.margin='0';w.innerHTML='<button id="x-share" class="btn" type="button">📤 مشاركة الجدول</button><button id="x-dl" class="btn ghost" type="button">🖼 تنزيل كصورة</button>';rf.before(w);w.append(rf);
  document.getElementById('x-share').onclick=()=>run(true);document.getElementById('x-dl').onclick=()=>run(false)}
})();
