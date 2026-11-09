/* التاريخ القبطي: تحويل حسابي من الميلادي (بتوقيت القاهرة) */
(function(){
const MONTHS=['توت','بابه','هاتور','كيهك','طوبه','أمشير','برمهات','برمودة','بشنس','بئونة','أبيب','مسرى','النسيء'];
const EPOCH=103605;                                   // RD لأول توت سنة ١ للشهداء
const rdOf=(y,m,d)=>Math.floor(Date.UTC(y,m-1,d)/86400000)+719163;
const fromCoptic=(y,m,d)=>EPOCH-1+365*(y-1)+Math.floor(y/4)+30*(m-1)+d;
function toCoptic(y,m,d){const f=rdOf(y,m,d),cy=Math.floor((4*(f-EPOCH)+1463)/1461),cm=Math.floor((f-fromCoptic(cy,1,1))/30)+1,cd=f-fromCoptic(cy,cm,1)+1;return{y:cy,m:cm,d:cd,month:MONTHS[cm-1]}}
/* مناسبات ثابتة متأكد منها بس (التاريخ القبطي ← الاسم). المسؤول يقدر يضيف مناسباته من الإعدادات. */
const FEASTS={'1-1':'عيد النيروز (رأس السنة القبطية)','17-1':'عيد الصليب المجيد','29-4':'عيد الميلاد المجيد','11-5':'عيد الغطاس المجيد','29-7':'عيد البشارة','16-3':'بداية صوم الميلاد'};
function info(g,extra){const t=toCoptic(g.y,g.m,g.d),k=t.d+'-'+t.m;
  let occ=(extra&&extra[k])||FEASTS[k]||'';
  // أقرب مناسبة جاية (لحد ٦٠ يوم) من القايمة الثابتة
  let next=null;for(let i=1;i<=60&&!next;i++){const u=new Date(Date.UTC(g.y,g.m-1,g.d+i)),c=toCoptic(u.getUTCFullYear(),u.getUTCMonth()+1,u.getUTCDate()),kk=c.d+'-'+c.m;
    if(FEASTS[kk])next={days:i,name:FEASTS[kk]}}
  return Object.assign(t,{occasion:occ,next})}
window.xCoptic={toCoptic,info,MONTHS};
})();
