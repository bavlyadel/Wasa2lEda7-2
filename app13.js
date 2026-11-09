/* v13: مدير المواسم — بيختار الموسم الحالي حسب التاريخ (بتوقيت القاهرة) ويطبّق ثيمه وخلفيته القبطية وبانره */
(function(){
const $=id=>document.getElementById(id);
const lsG=k=>{try{return localStorage.getItem(k)}catch{return null}},lsS=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch{}};
const cairoDay=()=>new Intl.DateTimeFormat('sv',{timeZone:'Africa/Cairo'}).format(new Date());
const inRange=(s,t)=>{if(!s.start||!s.end)return false;if(!s.yearly)return s.start<=t&&t<=s.end;const md=t.slice(5),a=s.start.slice(5),b=s.end.slice(5);return a<=b?(md>=a&&md<=b):(md>=a||md<=b)};
let cfg=null,preview=null,prevTimer=0,lastSig='';
try{cfg=JSON.parse(lsG('x-seasons')||'null')}catch{}
function current(){
  if(preview)return preview;
  if(!cfg||!cfg.on)return null;
  const m=(cfg.list||[]).find(s=>inRange(s,cairoDay()));if(m)return m;
  const a=cfg.annual;return a&&a.enabled?Object.assign({annual:true},a):null;
}
function userTheme(){const t=lsG('theme')||'dark';return t==='auto'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):t}
function banner(s,off){
  let b=$('x-season-ban');
  const want=s&&s.banner!==false&&!(s.annual&&!s.banner);
  if(!want){if(b)b.remove();return}
  const h=$('x-hero');if(!h)return;
  if(!b){b=document.createElement('div');b.id='x-season-ban';b.dataset.v='home';h.parentNode.insertBefore(b,h)}
  const sig=[s.name,s.icon,s.msg,off].join('|');if(b.dataset.sig===sig)return;b.dataset.sig=sig;
  const E=typeof escapeHtml==='function'?escapeHtml:x=>x;
  b.innerHTML=`<span class="ic">${E(s.icon||'🎊')}</span><div><h2>${E(s.name||'')}</h2><p>${E(s.msg||'')}</p></div><button class="btn ghost" type="button">${off?'🎨 رجّع ثيم الموسم':'إيقاف ثيم الموسم عندي'}</button>`;
  b.querySelector('button').onclick=()=>{lsS('x-season-off',off?null:'1');lastSig='';apply()};
}
function apply(){
  const s=current(),off=lsG('x-season-off')==='1',on=!!s&&!off,sig=(s?[s.name,s.theme,s.bg].join('|'):'-')+off+(preview?'p':'');
  document.body.classList.toggle('seasonal',on);
  if(sig!==lastSig){lastSig=sig;
    if(on){document.documentElement.dataset.theme=s.theme||userTheme();if(!preview)lsS('x-season-theme',s.theme||null)}
    else{if(!preview)lsS('x-season-theme',null);document.documentElement.dataset.theme=userTheme()}
    if(on&&s.bg&&s.bg!=='keep'){window.xBg&&xBg.suspend();window.cBg&&cBg.apply(s.bg==='none'?'':s.bg)}
    else{window.cBg&&cBg.stop();window.xBg&&xBg.restore()}
  }
  banner(s,off);
}
/* المستخدم غيّر الثيم بإيده = ما نفرضش ثيم الموسم عليه */
document.addEventListener('change',e=>{if(e.target&&e.target.id==='x-theme'){lsS('x-season-off','1');lastSig='';apply()}});
window.xSeasons={
  set(c){cfg=c;lsS('x-seasons',JSON.stringify(c));lastSig='';apply()},
  preview(s){preview=s;clearTimeout(prevTimer);if(s)prevTimer=setTimeout(()=>{preview=null;lastSig='';apply()},20000);lastSig='';apply()},
  current
};
apply();setInterval(apply,1500);   /* بيتأكد من البانر والتاريخ (خفيف: بيطبّق بس لو حاجة اتغيرت) */
let done=false;const t=setInterval(async()=>{
  if(done||typeof db==='undefined'||!db||typeof currentUser==='undefined'||!currentUser)return;done=true;clearInterval(t);
  try{const r=await db.from('app_settings').select('value').eq('key','seasons').maybeSingle();cfg=(r.data&&r.data.value)||null;lsS('x-seasons',cfg?JSON.stringify(cfg):null);lastSig='';apply()}catch{}
},700);
})();
