/* v13: إعدادات المسؤول — المواسم + أنيميشن اللوجو */
(function(){
const isAdm=()=>currentProfile&&currentProfile.role==='admin',E=escapeHtml;
const THEMES=[['dark','🌙 داكن'],['light','☀️ فاتح'],['emerald','🌿 زمردي'],['royal','👑 ملكي'],['sunset','🌇 غروب'],['ocean','🌊 محيط'],['violet','🔮 بنفسجي'],['rose','🌸 وردي'],['graphite','🖤 جرافيت'],['sand','🏜 رملي'],['coptic','🕯 ذهبي قبطي'],['martyr','🩸 عنابي'],['olive','🌿 زيتوني'],['sky','☁️ سماوي'],['ivory','🤍 عاجي']];
const BGS=[['keep','زي الخلفية العادية (من الإعدادات)'],['none','بدون خلفية'],['annual','✝️ قبطي: صلبان هادية (السنوي)'],['lent','✝️ قبطي: صوم (صليب وهالات وبخور)'],['holy','✝️ قبطي: آلام (صليب وشموع)'],['easter','✝️ قبطي: قيامة (أشعة ذهبية)'],['nativity','✝️ قبطي: ميلاد (نجمة وصلبان نازلة)'],['aurora','🌌 أورورا'],['stars','✨ شبكة نجوم'],['waves','🌊 موجات'],['bubbles','🫧 فقاعات'],['fireflies','🌟 يراعات']];
const PRESETS=[
 {name:'صوم الميلاد',icon:'🌙',start:'2026-11-25',end:'2027-01-06',yearly:true,msg:'صوم الميلاد المبارك. ربنا يقبل صومكم 🙏',theme:'violet',bg:'lent',banner:true},
 {name:'عيد الميلاد المجيد',icon:'⭐',start:'2027-01-07',end:'2027-01-19',yearly:true,msg:'ميلاد مجيد! كل سنة وإنتم طيبين 🎄',theme:'royal',bg:'nativity',banner:true},
 {name:'الصوم الكبير',icon:'✝️',start:'2027-03-08',end:'2027-04-24',yearly:false,msg:'صوم مبارك. ربنا يقبل صومكم وخدمتكم 🙏',theme:'violet',bg:'lent',banner:true},
 {name:'أسبوع الآلام',icon:'🕯️',start:'2027-04-25',end:'2027-05-01',yearly:false,msg:'أسبوع الآلام. اذكرونا في صلواتكم 🙏',theme:'martyr',bg:'holy',banner:true},
 {name:'عيد القيامة المجيد',icon:'🌅',start:'2027-05-02',end:'2027-06-20',yearly:false,msg:'المسيح قام! بالحقيقة قام 🎉',theme:'ivory',bg:'easter',banner:true}];
const opt=(arr,v)=>arr.map(([k,t])=>`<option value="${k}" ${k===v?'selected':''}>${t}</option>`).join('');
let st=null;
function seasonForm(s,i){return `<details class="season-card" data-i="${i}"><summary>${E(s.icon||'🎊')} ${E(s.name||'موسم جديد')} <small class="muted">${s.start||''} ← ${s.end||''}${s.yearly?' (كل سنة)':''}</small></summary>
  <div class="two-col"><label>الاسم<input data-f="name" value="${E(s.name||'')}"></label><label>الأيقونة<input data-f="icon" value="${E(s.icon||'')}" maxlength="4"></label></div>
  <div class="two-col"><label>من<input data-f="start" type="date" value="${s.start||''}"></label><label>إلى<input data-f="end" type="date" value="${s.end||''}"></label></div>
  <label class="chk"><input data-f="yearly" type="checkbox" ${s.yearly?'checked':''}> يتكرر كل سنة في نفس اليوم والشهر (للأعياد الثابتة زي الميلاد). سيبه مقفول للمواسم المتحركة زي الصوم والقيامة وظبّط تواريخها كل سنة.</label>
  <label>الرسالة<input data-f="msg" value="${E(s.msg||'')}"></label>
  <div class="two-col"><label>الثيم<select data-f="theme">${opt(THEMES,s.theme)}</select></label><label>الخلفية<select data-f="bg">${opt(BGS,s.bg||'keep')}</select></label></div>
  <label class="chk"><input data-f="banner" type="checkbox" ${s.banner!==false?'checked':''}> إظهار بانر الموسم في الرئيسية</label>
  <div class="row-btns"><button class="btn ghost" data-a="prev" type="button">👁 جرّبه (٢٠ ثانية)</button><button class="btn ghost" data-a="up" type="button">▲</button><button class="btn ghost" data-a="down" type="button">▼</button><button class="btn" data-a="del" type="button">🗑 حذف</button></div></details>`}
function render(box){
  const a=st.annual;
  box.innerHTML=`<hr style="border:0;border-top:1px solid var(--line);width:100%"><h2>🎊 المواسم</h2>
  <p class="muted">لما تفعّل المواسم، الموقع بيغيّر ثيمه وخلفيته القبطية وبانر الترحيب لوحده حسب التاريخ، ويرجع لوضعه العادي أول ما الموسم يخلص. لو موسمين اتداخلوا، اللي فوق في القايمة هو اللي بيظهر. كل عضو يقدر يوقف ثيم الموسم عنده من البانر.</p>
  <label class="chk"><input type="checkbox" id="ss-on" ${st.on?'checked':''}> <b>تفعيل المواسم</b> (لو مقفول، الموقع زي ما هو من غير أي موسم)</label>
  <details class="season-card" id="ss-annual" open><summary>🕊️ السنوي — الأيام العادية <small class="muted">(بيشتغل لما مفيش موسم تاني)</small></summary>
   <label class="chk"><input type="checkbox" data-a2="enabled" ${a.enabled?'checked':''}> تفعيل السنوي</label>
   <div class="two-col"><label>الاسم<input data-a2="name" value="${E(a.name||'')}"></label><label>الأيقونة<input data-a2="icon" value="${E(a.icon||'')}" maxlength="4"></label></div>
   <label>الرسالة<input data-a2="msg" value="${E(a.msg||'')}"></label>
   <div class="two-col"><label>الثيم<select data-a2="theme">${opt(THEMES,a.theme)}</select></label><label>الخلفية<select data-a2="bg">${opt(BGS,a.bg||'annual')}</select></label></div>
   <label class="chk"><input type="checkbox" data-a2="banner" ${a.banner?'checked':''}> إظهار بانر في الرئيسية (مقفول عادةً في الأيام العادية)</label>
   <div class="row-btns"><button class="btn ghost" data-a="prevA" type="button">👁 جرّبه (٢٠ ثانية)</button></div></details>
  <b>المواسم</b>
  <div class="stack">${st.list.map(seasonForm).join('')||'<p class="muted">مفيش مواسم لسه.</p>'}</div>
  <div class="row-btns"><button class="btn ghost" id="ss-add" type="button">➕ إضافة موسم</button><button class="btn ghost" id="ss-pre" type="button">📥 مواسم جاهزة (تواريخ تقريبية)</button><button class="btn primary" id="ss-save" type="button">حفظ المواسم</button></div><p class="message" id="ss-msg"></p>`;
  wire(box);
}
function pull(box){
  box.querySelectorAll('.season-card[data-i]').forEach(c=>{const s=st.list[+c.dataset.i];c.querySelectorAll('[data-f]').forEach(x=>{s[x.dataset.f]=x.type==='checkbox'?x.checked:x.value})});
  box.querySelectorAll('[data-a2]').forEach(x=>{st.annual[x.dataset.a2]=x.type==='checkbox'?x.checked:x.value});
  st.on=box.querySelector('#ss-on').checked;
}
function wire(box){
  const rerender=()=>{pull(box);render(box)};
  box.querySelector('#ss-add').onclick=()=>{pull(box);st.list.push({name:'موسم جديد',icon:'🎊',start:'',end:'',yearly:false,msg:'',theme:'coptic',bg:'annual',banner:true});render(box);box.querySelector('.season-card[data-i]:last-of-type')}
  box.querySelector('#ss-pre').onclick=()=>{if(st.list.length&&!confirm('ده هيستبدل المواسم الحالية بالمواسم الجاهزة. متأكد؟'))return;pull(box);st.list=PRESETS.map(x=>({...x}));render(box);const m=box.querySelector('#ss-msg');m.textContent='اتضافت. راجع التواريخ (الأعياد المتحركة بتتغير كل سنة) وبعدين اضغط حفظ.';m.classList.remove('error')};
  box.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{
    const c=b.closest('.season-card'),a=b.dataset.a;pull(box);
    if(a==='prevA'){window.xSeasons.preview(Object.assign({annual:true},st.annual,{banner:true}));return}
    const i=+c.dataset.i;
    if(a==='prev')window.xSeasons.preview(st.list[i]);
    else if(a==='del'){if(confirm('حذف الموسم؟')){st.list.splice(i,1);render(box)}}
    else if(a==='up'&&i>0){[st.list[i-1],st.list[i]]=[st.list[i],st.list[i-1]];render(box)}
    else if(a==='down'&&i<st.list.length-1){[st.list[i+1],st.list[i]]=[st.list[i],st.list[i+1]];render(box)}
  });
  box.querySelector('#ss-save').onclick=async()=>{
    pull(box);const m=box.querySelector('#ss-msg');
    const bad=st.list.find(s=>!s.name||!s.start||!s.end||s.end<s.start&&!s.yearly);
    if(bad){m.textContent='موسم «'+(bad.name||'بدون اسم')+'» ناقص: لازم اسم وتاريخ بداية ونهاية (والنهاية بعد البداية).';m.classList.add('error');return}
    const x=await db.rpc('set_setting',{p_key:'seasons',p_value:st});
    m.textContent=x.error?x.error.message:'تم الحفظ.';m.classList.toggle('error',!!x.error);
    if(!x.error){window.xSeasons.preview(null);window.xSeasons.set(JSON.parse(JSON.stringify(st)))}
  };
}
async function inject(el){
  if(!isAdm()||el.querySelector('#x-ss'))return;
  const [r,l]=await Promise.all([db.from('app_settings').select('value').eq('key','seasons').maybeSingle(),db.from('app_settings').select('value').eq('key','logo_anim').maybeSingle()]);
  if(el.querySelector('#x-ss'))return;
  const v=(r.data&&r.data.value)||{};
  st={on:!!v.on,annual:Object.assign({enabled:true,name:'السنوي — الأيام العادية',icon:'🕊️',msg:'خدمة مباركة. ربنا يبارك أيامكم 🙏',theme:'coptic',bg:'annual',banner:false},v.annual||{}),list:Array.isArray(v.list)?v.list:[]};
  const box=document.createElement('div');box.id='x-ss';box.className='stack';
  const lm=(l.data&&l.data.value&&l.data.value.mode)||'stars';
  box.insertAdjacentHTML('beforeend',`<hr style="border:0;border-top:1px solid var(--line);width:100%"><h2>🎬 أنيميشن اللوجو</h2>
   <p class="muted">بيشتغل لما حد يدوس على اللوجو. جرّبه بنفسك قبل الحفظ.</p>
   <label>الأنيميشن<select id="lg-sel">${window.xLogo?window.xLogo.list.map(([k,t])=>`<option value="${k}" ${k===lm?'selected':''}>${t}</option>`).join(''):''}</select></label>
   <div class="row-btns"><button class="btn primary" id="lg-save" type="button">حفظ</button></div><p class="message" id="lg-msg"></p><div id="x-ss-seasons" class="stack"></div>`);
  el.appendChild(box);
  const sel=box.querySelector('#lg-sel');sel.onchange=()=>window.xLogo&&window.xLogo.set(sel.value);
  box.querySelector('#lg-save').onclick=async()=>{const x=await db.rpc('set_setting',{p_key:'logo_anim',p_value:{mode:sel.value}}),m=box.querySelector('#lg-msg');m.textContent=x.error?x.error.message:'تم الحفظ.';m.classList.toggle('error',!!x.error);if(!x.error){try{localStorage.setItem('x-logo',sel.value)}catch{}}};
  render(box.querySelector('#x-ss-seasons'));
}
setInterval(()=>{if(typeof currentProfile==='undefined'||!currentProfile)return;const s=$('x-set');if(s&&s.offsetParent)inject(s)},800);
function $(id){return document.getElementById(id)}
})();
