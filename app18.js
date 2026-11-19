/* v18: إلغاء خدمة لمدة (أسابيع / لحد تاريخ / مفتوح) + إعادة التفعيل */
(function(){
const E=x=>typeof escapeHtml==='function'?escapeHtml(x):String(x??'');
const ar=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
const dtxt=d=>typeof dateText==='function'?dateText(d):d;
const addDays=(iso,n)=>{const a=iso.split('-').map(Number),t=new Date(Date.UTC(a[0],a[1]-1,a[2]+n));return t.toISOString().slice(0,10)};
const step=s=>+s.repeat_days>0?+s.repeat_days:7;
const isAdm=()=>typeof currentProfile!=='undefined'&&currentProfile&&currentProfile.role==='admin';
const svc=id=>(window.xAllSvc||[]).find(s=>String(s.id)===String(id));
const dn=x=>Math.round(Date.parse(x+'T00:00:00Z')/864e5);
const resumeOf=(s,u)=>addDays(s.service_date,(Math.floor((dn(u)-dn(s.service_date))/step(s))+1)*step(s)); /* أول ميعاد بعد تاريخ الإلغاء */
window.xCxText=s=>s.cancel_forever?'لحد ما تتفعّل':'لحد '+dtxt(s.cancel_until)+' · بترجع '+dtxt(resumeOf(s,s.cancel_until));

function open(s){
  const d=document.createElement('dialog');d.className='x-dlg';document.body.appendChild(d);d.addEventListener('close',()=>d.remove());
  const W=[1,2,3,4,6,8,12];
  d.innerHTML=`<h3 style="margin-top:0">🚫 إلغاء «${E(s.title)}»</h3><p class="muted">الخدمة الجاية: ${E(dtxt(s.service_date))}. الإلغاء للخدمة دي بس، وبترجع لوحدها بعد المدة.</p>
  <div class="cx-modes">
   <label class="cx-o"><input type="radio" name="cxm" value="w" checked> عدد أسابيع:
     <span>${W.map(n=>`<button type="button" class="chip cx-w${n===1?' on':''}" data-w="${n}">${n===1?'الأسبوع ده بس':ar(n)+(n<=2?' أسبوع':' أسابيع')}</button>`).join('')}</span>
     <span class="muted" style="font-size:13px">أو رقم تاني: <input id="cx-wn" type="number" min="1" max="52" style="width:70px"></span></label>
   <label class="cx-o"><input type="radio" name="cxm" value="d"> لحد تاريخ: <input id="cx-d" type="date" min="${s.service_date}"></label>
   <label class="cx-o"><input type="radio" name="cxm" value="f"> لحد ما أرجّعها بنفسي</label>
  </div>
  <div id="cx-pv" class="x-box" style="margin:10px 0"></div>
  <label>السبب (اختياري)<input id="cx-r" maxlength="200" placeholder="مثلًا: إجازة نص السنة"></label>
  <div>${['إجازة','ظروف','أعياد','صيانة'].map(x=>`<button type="button" class="chip cx-rs">${x}</button>`).join('')}</div>
  <label class="chk" style="margin-top:8px"><input type="checkbox" id="cx-n" checked> بلّغ الخدام (إشعار + تيليجرام)</label>
  <div class="row-btns" style="margin-top:12px"><button class="btn primary" id="cx-go" type="button">🚫 تأكيد الإلغاء</button><button class="btn ghost" id="cx-x" type="button">تراجع</button></div>`;
  let weeks=1;const q=x=>d.querySelector(x),mode=()=>d.querySelector('[name=cxm]:checked').value;
  const calc=()=>{const m=mode();let u=null,list=[];
    if(m==='w'){const n=+q('#cx-wn').value||weeks;for(let k=0;k<n;k++)list.push(addDays(s.service_date,k*step(s)));u=list[list.length-1]}
    else if(m==='d'){u=q('#cx-d').value||null;if(u)for(let t=s.service_date;t<=u;t=addDays(t,step(s)))list.push(t)}
    return{m,u,list,n:m==='w'?(+q('#cx-wn').value||weeks):null}};
  const pv=()=>{const c=calc(),e=q('#cx-pv');
    if(c.m==='f')e.innerHTML='🚫 الخدمة هتفضل ملغاة لحد ما إنت تدوس «إعادة تفعيل».';
    else if(!c.u)e.innerHTML='<span class="muted">اختار تاريخ.</span>';
    else e.innerHTML=`🚫 هتتلغي: ${c.list.slice(0,6).map(x=>E(dtxt(x))).join('، ')}${c.list.length>6?' …(و'+ar(c.list.length-6)+' تانيين)':''}<div class="g" style="margin-top:6px">↩ وترجع: ${E(dtxt(resumeOf(s,c.u)))}</div>`};
  d.querySelectorAll('.cx-w').forEach(b=>b.onclick=()=>{weeks=+b.dataset.w;q('#cx-wn').value='';d.querySelectorAll('.cx-w').forEach(x=>x.classList.toggle('on',x===b));d.querySelector('[name=cxm][value=w]').checked=true;pv()});
  q('#cx-wn').oninput=()=>{d.querySelector('[name=cxm][value=w]').checked=true;d.querySelectorAll('.cx-w').forEach(x=>x.classList.remove('on'));pv()};
  q('#cx-d').oninput=()=>{d.querySelector('[name=cxm][value=d]').checked=true;pv()};
  d.querySelectorAll('[name=cxm]').forEach(r=>r.onchange=pv);
  d.querySelectorAll('.cx-rs').forEach(b=>b.onclick=()=>q('#cx-r').value=b.textContent);
  q('#cx-x').onclick=()=>d.close();
  q('#cx-go').onclick=async()=>{const c=calc();if(c.m==='d'&&!c.u)return alert('اختار التاريخ');if(c.m==='w'&&(c.n<1||c.n>52))return alert('عدد الأسابيع من ١ لـ ٥٢');
    const b=q('#cx-go');b.disabled=true;
    const r=await db.rpc('cancel_service',{p_id:String(s.id),p_weeks:c.m==='w'?c.n:null,p_until:c.m==='d'?c.u:null,p_forever:c.m==='f',p_reason:q('#cx-r').value||null,p_notify:q('#cx-n').checked});
    if(r.error){b.disabled=false;return alert(r.error.message)}d.close();if(typeof refreshData==='function')refreshData()};
  pv();d.showModal();
}
document.addEventListener('click',async e=>{
  const c=e.target.closest('[data-cx]'),r=e.target.closest('[data-rs]');
  if(c&&isAdm()){const s=svc(c.dataset.cx);if(s)open(s)}
  if(r&&isAdm()){const s=svc(r.dataset.rs);if(!s||!confirm(`إعادة تفعيل «${s.title}»؟ هتبقى في ميعادها ${dtxt(s.service_date)}.`))return;
    const x=await db.rpc('resume_service',{p_id:String(s.id),p_notify:true});if(x.error)return alert(x.error.message);if(typeof refreshData==='function')refreshData()}
});
})();
