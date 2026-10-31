/* إعداد: ضع بيانات مشروع Supabase في المتغيرين التاليين قبل النشر. */
const SUPABASE_URL = "https://buwomwgnuzepjosktten.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Fk_eyhSvOR4r1bJ76BB8Ow_fJK6JLsS";
const configured = !SUPABASE_URL.includes("YOUR_PROJECT") && !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");
const db = configured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
let currentUser = null, currentProfile = null, authMode = "login", servicesCache = [];

const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function message(id, text, error=false){ const el=$(id); el.textContent=text; el.classList.toggle("error",error); }
function setView(isIn){ $("pending-view")&&$("pending-view").classList.add("hidden"); $("auth-view").classList.toggle("hidden",isIn); $("app-view").classList.toggle("hidden",!isIn); $("logout").classList.toggle("hidden",!isIn); }
function setAuthMode(mode){ authMode=mode; document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===mode)); $("name-field").classList.toggle("hidden",mode!=="signup");$("phone-field").classList.toggle("hidden",mode!=="signup");$("forgot").classList.toggle("hidden",mode!=="login"); $("auth-submit").textContent=mode==="login"?"دخول":"إنشاء الحساب"; $("password").autocomplete=mode==="login"?"current-password":"new-password"; message("auth-message",""); }
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>setAuthMode(b.dataset.tab)));
function dateText(d){ if(!d)return "—"; try{return new Intl.DateTimeFormat("ar-EG",{year:"numeric",month:"short",day:"numeric"}).format(new Date(d+"T12:00:00"));}catch{return d;} }
function t12(t){ if(!t)return "—"; const m=String(t).match(/^(\d{1,2}):(\d{2})/); if(!m)return t; try{return new Intl.DateTimeFormat("ar-EG",{hour:"numeric",minute:"2-digit",hour12:true,timeZone:"UTC"}).format(new Date(Date.UTC(1970,0,1,+m[1],+m[2])));}catch{return t;} }
function statusText(s){return ({pending:"قيد المراجعة",approved:"تمت الموافقة",rejected:"مرفوض"})[s]||s;}
function statusClass(s){return ({pending:"pending",approved:"approved",rejected:"rejected"})[s]||"";}

async function init(){
  if(!configured){$("setup-notice").classList.remove("hidden");message("auth-message","الموقع جاهز للربط بقاعدة البيانات. أكمل خطوات README.",true);return;}
  const {data:{session}}=await db.auth.getSession();
  if(session) await loadApp(session.user);
  db.auth.onAuthStateChange(async (event,session)=>{if(session) await loadApp(session.user); else {currentUser=null;currentProfile=null;setView(false);$("user-label").textContent="";} if(event==="PASSWORD_RECOVERY") askNewPassword();});
}
$("auth-form").addEventListener("submit",async e=>{
  e.preventDefault(); if(!db){message("auth-message","أكمل إعداد Supabase أولًا حسب README.",true);return;}
  const email=$("email").value.trim(), password=$("password").value;
  $("auth-submit").disabled=true; message("auth-message","جارٍ المعالجة…");
  try{
    if(authMode==="signup"){
      const full_name=$("full-name").value.trim(); if(!full_name) throw new Error("اكتب اسمك الكامل.");
      const raw=$("phone").value.replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/\D/g,"").replace(/^(00)?20(?=1)/,"").replace(/^0/,"");if(!/^1[0125][0-9]{8}$/.test(raw)) throw new Error("اكتب رقم موبايل مصري صحيح (10 أرقام بعد +20).");const phone="+20"+raw;
      const {data,error}=await db.auth.signUp({email,password,options:{data:{full_name,phone,service_name:($("service-name").value||"").trim()||null,service_keeper:($("service-keeper").value||"").trim()||null}}}); if(error)throw error;
      message("auth-message","تم إنشاء الحساب. هيتراجع من المسؤولين خلال أقل من 24 ساعة"+(data.session?".":"، وراجع بريدك لتأكيده قبل تسجيل الدخول."));
    }else{const {error}=await db.auth.signInWithPassword({email,password});if(error)throw error;message("auth-message","تم تسجيل الدخول.");}
  }catch(err){message("auth-message",err.message||"حدث خطأ، حاول مرة أخرى.",true);}finally{$("auth-submit").disabled=false;}
});
$("logout").addEventListener("click",async()=>{if(db)await db.auth.signOut();});
$("refresh").addEventListener("click",()=>refreshData());

$("forgot").addEventListener("click",async()=>{
  if(!db)return;const email=$("email").value.trim();
  if(!email){message("auth-message","اكتب بريدك الإلكتروني في الخانة فوق الأول، وبعدين اضغط «نسيت كلمة السر؟».",true);return;}
  const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
  message("auth-message",error?error.message:"لو الإيميل ده مسجّل هيوصلك رابط لتغيير كلمة السر. راجع الـ Spam كمان.",!!error);
});
function askNewPassword(){
  if(document.getElementById("pw-dlg"))return;
  const d=document.createElement("dialog");d.id="pw-dlg";
  d.innerHTML=`<form class="stack" id="pw-form"><h3>اكتب كلمة سر جديدة</h3><label>كلمة السر الجديدة<input id="pw-new" type="password" minlength="8" required autocomplete="new-password" placeholder="٨ أحرف على الأقل"></label><p id="pw-msg" class="message"></p><div class="row-btns"><button class="btn primary" type="submit">حفظ</button><button class="btn ghost" type="button" id="pw-x">إلغاء</button></div></form>`;
  document.body.append(d);
  d.querySelector("#pw-x").onclick=()=>{d.close();d.remove();};
  d.querySelector("#pw-form").onsubmit=async e=>{
    e.preventDefault();
    const {error}=await db.auth.updateUser({password:d.querySelector("#pw-new").value});
    if(error){message("pw-msg",error.message,true);return;}
    message("pw-msg","تم تغيير كلمة السر.");setTimeout(()=>{d.close();d.remove();},1200);
  };
  d.showModal();
}
function communionText(s){
  if(!s.communion_n)return "—";
  const o=Math.ceil(+String(s.service_date).slice(8,10)/7);
  return s.communion_n==o?"✔ جمعة التناول":`جمعة التناول: الجمعة ${s.communion_n} من الشهر`;
}
function reqExtra(r){
  let t="";
  if(r.needed_at)t+=`\nموعد الخدمة: ${new Date(r.needed_at).toLocaleString("ar-EG",{dateStyle:"medium",timeStyle:"short"})}`;
  if(r.picked_at)t+=`\n📦 تم الاستلام: ${new Date(r.picked_at).toLocaleString("ar-EG",{dateStyle:"medium",timeStyle:"short"})}`;
  if(r.returned_at)t+=`\n✅ تم إرجاع الأدوات للمخزن: ${new Date(r.returned_at).toLocaleString("ar-EG",{dateStyle:"medium",timeStyle:"short"})}`;
  if(r.reject_reason)t+=`\n⚠️ ${r.reject_reason}`;
  return t;
}
async function deleteRequests(ids){
  if(!ids.length)return;
  const {data:ph}=await db.from("request_photos").select("path").in("request_id",ids);
  if(ph&&ph.length)await db.storage.from("tool-photos").remove(ph.map(p=>p.path));
  const {error}=await db.from("service_requests").delete().in("id",ids);
  if(error)alert(error.message);
}
async function loadApp(user){
  currentUser=user;
  const {data:profile,error}=await db.from("profiles").select("id,full_name,role,phone,approved,rejected").eq("id",user.id).maybeSingle();
  if(error){console.error(error);return;}
  currentProfile=profile||{id:user.id,full_name:user.user_metadata?.full_name||user.email,role:"member"};
  if(currentProfile.approved===false){setView(false);$("auth-view").classList.add("hidden");$("pending-view").classList.remove("hidden");$("pending-title").textContent=currentProfile.rejected?"تم رفض طلب الانضمام":"حسابك بانتظار المراجعة";$("pending-text").textContent=currentProfile.rejected?"تواصل مع المسؤولين لو فاكر إن ده حصل بالغلط.":"تم إنشاء حسابك، وهيتراجع من المسؤولين خلال أقل من 24 ساعة. هتقدر تدخل الموقع بعد الاعتماد.";if(window.xPending)window.xPending();return;}
  setView(true); $("user-label").textContent=currentProfile.full_name||user.email;
  $("greeting").textContent="أهلاً، "+(currentProfile.full_name||"بك");
  const admin=currentProfile.role==="admin";
  const isStaff=admin||currentProfile.role==="server";
  window.isStaff=isStaff;
  $("role-badge").textContent=admin?"مسؤول":(currentProfile.role==="server"?"خادم":"عضو");
  $("admin-panel").classList.toggle("hidden",!admin);
  $("services-heading").classList.toggle("hidden",!isStaff);
  $("services-panel").classList.toggle("hidden",!isStaff);
  $("stat-card-upcoming").classList.toggle("hidden",!isStaff);
  $("stat-card-mine").classList.toggle("hidden",!isStaff);
  $("stats").style.gridTemplateColumns=isStaff?"":"1fr";
  askPhone();
  await refreshData();
}
function askPhone(){
  if(currentProfile.phone||document.getElementById("phone-dlg"))return;
  const d=document.createElement("dialog");d.id="phone-dlg";
  d.innerHTML=`<form class="stack" id="phone-form"><h3>أضف رقم موبايلك</h3><p class="muted">محتاجين رقمك عشان نقدر نتواصل معاك. هتسجله مرة واحدة بس.</p><label>رقم الموبايل<input id="phone-new" type="tel" inputmode="numeric" placeholder="01012345678" required></label><p id="phone-msg" class="message"></p><div class="row-btns"><button class="btn primary" type="submit">حفظ</button><button class="btn ghost" type="button" id="phone-out">تسجيل الخروج</button></div></form>`;
  document.body.append(d);
  d.addEventListener("cancel",e=>e.preventDefault());
  d.querySelector("#phone-out").onclick=()=>{d.close();d.remove();db.auth.signOut();};
  d.querySelector("#phone-form").onsubmit=async e=>{
    e.preventDefault();
    const phone=d.querySelector("#phone-new").value.trim().replace(/[\s-]/g,"");
    if(!/^01[0125][0-9]{8}$/.test(phone)){message("phone-msg","اكتب رقم موبايل مصري صحيح (11 رقم).",true);return;}
    const {error}=await db.from("profiles").update({phone}).eq("id",currentUser.id);
    if(error){message("phone-msg",error.message,true);return;}
    currentProfile.phone=phone;d.close();d.remove();
  };
  d.showModal();
}
async function refreshData(){
  if(!db||!currentUser)return;
  const {data:services,error}=await db.from("services").select("*").order("service_date",{ascending:true}).order("service_time",{ascending:true});
  if(error){$("services-body").innerHTML=`<tr><td colspan="7" class="empty">تعذر تحميل الجدول: ${escapeHtml(error.message)}</td></tr>`;return;}
  servicesCache=(services||[]).slice().sort((a,b)=>(a.service_date+(a.service_time||"")).localeCompare(b.service_date+(b.service_time||"")));
  const upcoming=servicesCache.filter(s=>s.service_date>=new Date().toISOString().slice(0,10));
  $("stat-upcoming").textContent=upcoming.length;
  $("stat-mine").textContent=servicesCache.filter(s=>s.assignee_id===currentUser.id).length;
  $("services-body").innerHTML=servicesCache.length?servicesCache.map(s=>`<tr><td><strong>${escapeHtml(s.title)}</strong></td><td>${dateText(s.service_date)}</td><td>${escapeHtml(t12(s.service_time))}</td><td>${escapeHtml(s.location)}</td><td>${escapeHtml(s.assignee_name||"—")}</td><td>${escapeHtml(s.notes||"—")}</td><td>${escapeHtml(communionText(s))}</td></tr>`).join(""):`<tr><td colspan="7" class="empty">لا توجد خدمات مضافة حتى الآن.</td></tr>`;
  $("request-service").innerHTML='<option value="">بدون تحديد خدمة</option>'+servicesCache.map(s=>`<option value="${s.id}">${escapeHtml(s.title)} — ${dateText(s.service_date)}</option>`).join("");
  await loadRequests();
}
async function loadRequests(){
  const {data:mine,error}=await db.from("service_requests").select("id,request_type,details,status,created_at,service_id,tool_items,needed_at,reject_reason,picked_at,returned_at,services(title)").eq("user_id",currentUser.id).order("created_at",{ascending:false});
  if(error){console.error(error);return;}
  $("stat-requests").textContent=(mine||[]).filter(r=>r.status==="pending").length;
  $("my-requests").innerHTML=mine?.length?mine.map(r=>`<article class="request-item" data-rid="${r.id}" data-tool="${r.tool_items?1:0}" data-status="${r.status}"><div class="request-top"><span>${escapeHtml(r.request_type)}</span><span class="status ${statusClass(r.status)}">${statusText(r.status)}</span></div><p>${escapeHtml(r.services?.title?`الخدمة: ${r.services.title}\n`:"")}${escapeHtml(r.details)}${escapeHtml(reqExtra(r))}</p></article>`).join(""):'<p class="empty">لا توجد طلبات بعد.</p>';
  if(currentProfile.role==="admin"){
    const {data:all,error:adminErr}=await db.from("service_requests").select("id,request_type,details,status,created_at,user_id,service_id,tool_items,needed_at,reject_reason,picked_at,returned_at,profiles(full_name,email,phone),services(title)").order("created_at",{ascending:false});
    if(adminErr){$("admin-requests").innerHTML=`<p class="empty">${escapeHtml(adminErr.message)}</p>`;return;}
    $("admin-requests").innerHTML=(all?.some(r=>r.status!=="pending")?`<div class="row-btns"><button class="btn ghost" id="del-done">حذف كل الطلبات المنتهية (الموافق عليها والمرفوضة)</button></div>`:"")+(all?.length?all.map(r=>`<article class="request-item" data-rid="${r.id}" data-tool="${r.tool_items?1:0}"><div class="request-top"><span>${escapeHtml(r.request_type)} · ${escapeHtml(r.profiles?.full_name||r.profiles?.email||"عضو")}${r.profiles?.phone?" · "+escapeHtml(r.profiles.phone):""}</span><span class="status ${statusClass(r.status)}">${statusText(r.status)}</span></div><p>${escapeHtml(r.services?.title?`الخدمة: ${r.services.title}\n`:"")}${escapeHtml(r.details)}${escapeHtml(reqExtra(r))}</p><div class="request-controls">${r.status!=="approved"?`<button class="btn" data-request="${r.id}" data-status="approved">موافقة</button>`:""}${r.status!=="rejected"?`<button class="btn" data-request="${r.id}" data-status="rejected">رفض</button>`:""}${r.status!=="pending"?`<button class="btn ghost" data-request="${r.id}" data-status="pending">إعادة للانتظار</button>`:""}<button class="btn ghost" data-del="${r.id}">حذف</button></div></article>`).join(""):'<p class="empty">لا توجد طلبات من الأعضاء.</p>');
    $("admin-requests").querySelectorAll("[data-del]").forEach(b=>b.addEventListener("click",async()=>{if(!confirm("حذف الطلب نهائيًا؟"))return;await deleteRequests([b.dataset.del]);await refreshData();}));
    $("del-done")?.addEventListener("click",async()=>{const ids=all.filter(r=>r.status!=="pending").map(r=>r.id);if(!confirm(`حذف ${ids.length} طلب منتهي نهائيًا؟`))return;await deleteRequests(ids);await refreshData();});
    $("admin-requests").querySelectorAll("[data-request]").forEach(b=>b.addEventListener("click",async()=>{const {error}=await db.from("service_requests").update({status:b.dataset.status}).eq("id",b.dataset.request);if(error)alert(error.message);else await loadRequests();}));
  }
  if(window.onRequestsRendered)window.onRequestsRendered();
}
$("request-form").addEventListener("submit",async e=>{
  e.preventDefault();if(!db)return;const payload={user_id:currentUser.id,request_type:$("request-type").value,service_id:$("request-service").value||null,details:$("request-details").value.trim()};
  const {error}=await db.from("service_requests").insert(payload);if(error)message("request-message",error.message,true);else{$("request-details").value="";message("request-message","تم إرسال الطلب للمسؤول.");await refreshData();}
});
$("service-form").addEventListener("submit",async e=>{
  e.preventDefault();if(!db)return;
  let assignee_id=null,assignee_name=null;const email=$("service-assignee").value.trim();
  if(email){const {data,error}=await db.rpc("lookup_member_by_email",{member_email:email});if(error||!data||!data.length){message("service-message","لم يتم العثور على حساب بهذا البريد. لازم يكون الحساب موجود بدور خادم أو مسؤول.",true);return;}assignee_id=data[0].id;assignee_name=data[0].full_name||email;}
  const payload={title:$("service-title").value.trim(),service_date:$("service-date").value,service_time:$("service-time").value,location:$("service-location").value.trim(),assignee_id,assignee_name,notes:$("service-notes").value.trim()||null,created_by:currentUser.id};
  const {error}=await db.from("services").insert(payload);if(error){message("service-message",error.message,true);return;}
  $("service-form").reset();message("service-message","تمت إضافة الخدمة إلى الجدول.");await refreshData();
});
init();
