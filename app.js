/* إعداد: ضع بيانات مشروع Supabase في المتغيرين التاليين قبل النشر. */
const SUPABASE_URL = "https://buwomwgnuzepjosktten.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Fk_eyhSvOR4r1bJ76BB8Ow_fJK6JLsS";
const configured = !SUPABASE_URL.includes("YOUR_PROJECT") && !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE");
const db = configured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
let currentUser = null, currentProfile = null, authMode = "login", servicesCache = [];

const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function message(id, text, error=false){ const el=$(id); el.textContent=text; el.classList.toggle("error",error); }
function setView(isIn){ $("auth-view").classList.toggle("hidden",isIn); $("app-view").classList.toggle("hidden",!isIn); $("logout").classList.toggle("hidden",!isIn); }
function setAuthMode(mode){ authMode=mode; document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===mode)); $("name-field").classList.toggle("hidden",mode!=="signup");$("phone-field").classList.toggle("hidden",mode!=="signup"); $("auth-submit").textContent=mode==="login"?"دخول":"إنشاء الحساب"; $("password").autocomplete=mode==="login"?"current-password":"new-password"; message("auth-message",""); }
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>setAuthMode(b.dataset.tab)));
function dateText(d){ if(!d)return "—"; try{return new Intl.DateTimeFormat("ar-EG",{year:"numeric",month:"short",day:"numeric"}).format(new Date(d+"T12:00:00"));}catch{return d;} }
function statusText(s){return ({pending:"قيد المراجعة",approved:"تمت الموافقة",rejected:"مرفوض"})[s]||s;}
function statusClass(s){return ({pending:"pending",approved:"approved",rejected:"rejected"})[s]||"";}

async function init(){
  if(!configured){$("setup-notice").classList.remove("hidden");message("auth-message","الموقع جاهز للربط بقاعدة البيانات. أكمل خطوات README.",true);return;}
  const {data:{session}}=await db.auth.getSession();
  if(session) await loadApp(session.user);
  db.auth.onAuthStateChange(async (_event,session)=>{if(session) await loadApp(session.user); else {currentUser=null;currentProfile=null;setView(false);$("user-label").textContent="";}});
}
$("auth-form").addEventListener("submit",async e=>{
  e.preventDefault(); if(!db){message("auth-message","أكمل إعداد Supabase أولًا حسب README.",true);return;}
  const email=$("email").value.trim(), password=$("password").value;
  $("auth-submit").disabled=true; message("auth-message","جارٍ المعالجة…");
  try{
    if(authMode==="signup"){
      const full_name=$("full-name").value.trim(); if(!full_name) throw new Error("اكتب اسمك الكامل.");
      const phone=$("phone").value.trim().replace(/[\s-]/g,"");if(!/^01[0125][0-9]{8}$/.test(phone)) throw new Error("اكتب رقم موبايل مصري صحيح (11 رقم).");
      const {data,error}=await db.auth.signUp({email,password,options:{data:{full_name,phone}}}); if(error)throw error;
      message("auth-message",data.session?"تم إنشاء الحساب.":"تم إنشاء الحساب. راجع بريدك لتأكيده قبل تسجيل الدخول.");
    }else{const {error}=await db.auth.signInWithPassword({email,password});if(error)throw error;message("auth-message","تم تسجيل الدخول.");}
  }catch(err){message("auth-message",err.message||"حدث خطأ، حاول مرة أخرى.",true);}finally{$("auth-submit").disabled=false;}
});
$("logout").addEventListener("click",async()=>{if(db)await db.auth.signOut();});
$("refresh").addEventListener("click",()=>refreshData());

async function loadApp(user){
  currentUser=user;
  const {data:profile,error}=await db.from("profiles").select("id,full_name,role,phone").eq("id",user.id).maybeSingle();
  if(error){console.error(error);return;}
  currentProfile=profile||{id:user.id,full_name:user.user_metadata?.full_name||user.email,role:"member"};
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
  const {data:services,error}=await db.from("services").select("id,title,service_date,service_time,location,notes,assignee_id,assignee_name").order("service_date",{ascending:true});
  if(error){$("services-body").innerHTML=`<tr><td colspan="6" class="empty">تعذر تحميل الجدول: ${escapeHtml(error.message)}</td></tr>`;return;}
  servicesCache=services||[];
  const upcoming=servicesCache.filter(s=>s.service_date>=new Date().toISOString().slice(0,10));
  $("stat-upcoming").textContent=upcoming.length;
  $("stat-mine").textContent=servicesCache.filter(s=>s.assignee_id===currentUser.id).length;
  $("services-body").innerHTML=servicesCache.length?servicesCache.map(s=>`<tr><td><strong>${escapeHtml(s.title)}</strong></td><td>${dateText(s.service_date)}</td><td>${escapeHtml((s.service_time||"").slice(0,5)||"—")}</td><td>${escapeHtml(s.location)}</td><td>${escapeHtml(s.assignee_name||"—")}</td><td>${escapeHtml(s.notes||"—")}</td></tr>`).join(""):`<tr><td colspan="6" class="empty">لا توجد خدمات مضافة حتى الآن.</td></tr>`;
  $("request-service").innerHTML='<option value="">بدون تحديد خدمة</option>'+servicesCache.map(s=>`<option value="${s.id}">${escapeHtml(s.title)} — ${dateText(s.service_date)}</option>`).join("");
  await loadRequests();
}
async function loadRequests(){
  const {data:mine,error}=await db.from("service_requests").select("id,request_type,details,status,created_at,service_id,services(title)").eq("user_id",currentUser.id).order("created_at",{ascending:false});
  if(error){console.error(error);return;}
  $("stat-requests").textContent=(mine||[]).filter(r=>r.status==="pending").length;
  $("my-requests").innerHTML=mine?.length?mine.map(r=>`<article class="request-item"><div class="request-top"><span>${escapeHtml(r.request_type)}</span><span class="status ${statusClass(r.status)}">${statusText(r.status)}</span></div><p>${escapeHtml(r.services?.title?`الخدمة: ${r.services.title}\n`:"")}${escapeHtml(r.details)}</p></article>`).join(""):'<p class="empty">لا توجد طلبات بعد.</p>';
  if(currentProfile.role==="admin"){
    const {data:all,error:adminErr}=await db.from("service_requests").select("id,request_type,details,status,created_at,user_id,service_id,profiles(full_name,email,phone),services(title)").order("created_at",{ascending:false});
    if(adminErr){$("admin-requests").innerHTML=`<p class="empty">${escapeHtml(adminErr.message)}</p>`;return;}
    $("admin-requests").innerHTML=all?.length?all.map(r=>`<article class="request-item"><div class="request-top"><span>${escapeHtml(r.request_type)} · ${escapeHtml(r.profiles?.full_name||r.profiles?.email||"عضو")}${r.profiles?.phone?" · "+escapeHtml(r.profiles.phone):""}</span><span class="status ${statusClass(r.status)}">${statusText(r.status)}</span></div><p>${escapeHtml(r.services?.title?`الخدمة: ${r.services.title}\n`:"")}${escapeHtml(r.details)}</p><div class="request-controls">${r.status!=="approved"?`<button class="btn" data-request="${r.id}" data-status="approved">موافقة</button>`:""}${r.status!=="rejected"?`<button class="btn" data-request="${r.id}" data-status="rejected">رفض</button>`:""}${r.status!=="pending"?`<button class="btn ghost" data-request="${r.id}" data-status="pending">إعادة للانتظار</button>`:""}</div></article>`).join(""):'<p class="empty">لا توجد طلبات من الأعضاء.</p>';
    $("admin-requests").querySelectorAll("[data-request]").forEach(b=>b.addEventListener("click",async()=>{const {error}=await db.from("service_requests").update({status:b.dataset.status}).eq("id",b.dataset.request);if(error)alert(error.message);else await loadRequests();}));
  }
}
$("request-form").addEventListener("submit",async e=>{
  e.preventDefault();if(!db)return;const payload={user_id:currentUser.id,request_type:$("request-type").value,service_id:$("request-service").value||null,details:$("request-details").value.trim()};
  const {error}=await db.from("service_requests").insert(payload);if(error)message("request-message",error.message,true);else{$("request-details").value="";message("request-message","تم إرسال الطلب للمسؤول.");await refreshData();}
});
$("service-form").addEventListener("submit",async e=>{
  e.preventDefault();if(!db)return;
  let assignee_id=null,assignee_name=null;const email=$("service-assignee").value.trim();
  if(email){const {data,error}=await db.rpc("lookup_member_by_email",{member_email:email});if(error||!data||!data.length){message("service-message","لم يتم العثور على حساب بهذا البريد. تأكد أن العضو أنشأ حسابًا.",true);return;}assignee_id=data[0].id;assignee_name=data[0].full_name||email;}
  const payload={title:$("service-title").value.trim(),service_date:$("service-date").value,service_time:$("service-time").value,location:$("service-location").value.trim(),assignee_id,assignee_name,notes:$("service-notes").value.trim()||null,created_by:currentUser.id};
  const {error}=await db.from("services").insert(payload);if(error){message("service-message",error.message,true);return;}
  $("service-form").reset();message("service-message","تمت إضافة الخدمة إلى الجدول.");await refreshData();
});
init();
