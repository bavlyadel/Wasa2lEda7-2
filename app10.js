/* v7: إعدادات مربع «الخدمة الجاية» (للمسؤول): مرتبط بيوم الجمعة ولا لأ + مدة الخدمة */
(function(){
const isAdm=()=>currentProfile&&currentProfile.role==='admin';
const DUR=[[60,'ساعة'],[90,'ساعة ونص'],[120,'ساعتين'],[150,'ساعتين ونص'],[180,'٣ ساعات'],[240,'٤ ساعات']];
async function inject(el){
  if(!isAdm()||el.querySelector('#x-nc'))return;
  const r=await db.from('app_settings').select('value').eq('key','next_card').maybeSingle();
  if(el.querySelector('#x-nc'))return;
  const v=(r.data&&r.data.value)||{},dur=+v.duration||120,mode=v.mode||(v.friday_only?'friday_only':'all');
  const box=document.createElement('div');box.id='x-nc';box.className='stack';
  box.innerHTML=`<hr style="border:0;border-top:1px solid var(--line);width:100%"><h2>🟦 مربع «الخدمة الجاية»</h2>
  <p class="muted">المربع بيعرض أقرب خدمة لسه ما خلصتش، ولما تخلص بيعرض اللي بعدها لوحده. لو فيه خدمتين في نفس الميعاد الخادم بيشوفهم الاتنين ويختار اللي عايز ينزلها.</p>
  <label>الخدمات اللي تظهر في المربع<select id="nc-mode"><option value="all" ${mode==='all'?'selected':''}>كل الخدمات (كل الأيام)</option><option value="no_friday" ${mode==='no_friday'?'selected':''}>من غير خدمات الجمعة</option><option value="friday_only" ${mode==='friday_only'?'selected':''}>خدمات الجمعة بس</option></select></label>
  <label>الخدمة بتعتبر خلصت بعد ميعادها بـ<select id="nc-dur">${DUR.map(([k,t])=>`<option value="${k}" ${k===dur?'selected':''}>${t}</option>`).join('')}</select></label>
  <div class="row-btns"><button class="btn primary" id="nc-save" type="button">حفظ</button></div><p class="message" id="nc-msg"></p>`;
  el.appendChild(box);
  $('nc-save').onclick=async()=>{
    const x=await db.rpc('set_setting',{p_key:'next_card',p_value:{mode:$('nc-mode').value,duration:+$('nc-dur').value}});
    const m=$('nc-msg');m.textContent=x.error?x.error.message:'تم الحفظ.';m.classList.toggle('error',!!x.error);
    if(!x.error)refreshData();
  };
}
setInterval(()=>{if(typeof currentProfile==='undefined'||!currentProfile)return;const s=$('x-set');if(s&&s.offsetParent)inject(s)},700);
})();
