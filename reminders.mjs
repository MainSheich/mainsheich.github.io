// שליחת תזכורות יום לפני בקשה. רץ אוטומטית ב-GitHub Actions (ראו reminders.yml)
const KEY='AIzaSyA5-ySBUkH4ZO9ZqMsc3MCgrbo_17u8HfA',PROJECT='employee-vacations-3a755';
const BASE='https://firestore.googleapis.com/v1/projects/'+PROJECT+'/databases/(default)/documents';
const MAIL_FROM='ab63187881@gmail.com',MAIL_TO='aa63187881@gmail.com';
const EJ={service:'service_lnwmdw9',template:'template_mk2vhtr',publicKey:'edHZJcWruFB4Ulcgh',privateKey:process.env.EMAILJS_PRIVATE_KEY};
const APP_URL=process.env.APP_URL||'';
let AUTH={};
async function signIn(){
  if(!process.env.BOT_EMAIL||!process.env.BOT_PASSWORD){console.log('no bot account configured - running unauthenticated');return}
  const r=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='+KEY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:process.env.BOT_EMAIL,password:process.env.BOT_PASSWORD,returnSecureToken:true})});
  if(!r.ok)throw new Error('bot sign-in failed '+r.status+' '+await r.text());
  AUTH={Authorization:'Bearer '+(await r.json()).idToken};
}
const F=(u,o={})=>fetch(u,Object.assign({},o,{headers:Object.assign({},o.headers||{},AUTH)}));
const NOW=process.env.NOW_ISO?new Date(process.env.NOW_ISO):new Date();
const T={vac:'חופשה',late:'הגעה מאוחרת',early:'יציאה מוקדמת'};
const WD=['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
const kd=k=>{const p=k.split('-').map(Number);return new Date(p[0],p[1]-1,p[2],12)};
const desc=r=>T[r.type]+(r.time?' ('+(r.type==='late'?'מגיע ב־':'יוצא ב־')+r.time+')':'');
let users=[],reqs=[],covers=[];
const tm2=t=>{const p=t.split(':').map(Number);return p[0]*60+p[1]};
const m2t=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
const ALT0={'חן':'2026-11-10'};
const altOf=u=>u.alt!==undefined?(u.alt||''):(ALT0[u.name]||'');
const altOn=(u,k)=>{const a=altOf(u);if(!a)return true;const w=Math.floor(Math.round((kd(k)-kd(a))/864e5)/7);return ((w%2)+2)%2===0};
const shOf=(u,k)=>kd(k).getDay()<=4&&altOn(u,k)?(u.shifts||[]).map(x=>x.split('-').map(tm2)):[];
const rng=l=>l.map(x=>m2t(x[0])+'–'+m2t(x[1])).join(' ו־');
const fromTo=l=>l.map(x=>'משעה '+m2t(x[0])+' עד '+m2t(x[1])).join(' וגם ');
function absOf(r,u){
  const o=[];
  shOf(u,r.date).forEach(([a,b])=>{
    if(r.type==='vac')o.push([a,b]);
    else{const t=tm2(r.time);if(r.type==='late'){if(t>a)o.push([a,Math.min(t,b)])}else if(t<b)o.push([Math.max(t,a),b])}
  });
  return o;
}
function missingOf(r){const u=users.find(x=>x.id===r.uid);return u?rng(absOf(r,u)):''}
function analyze(d){
  const day=users.map(u=>({u:u,sh:shOf(u,d.date)})).filter(x=>x.sh.length);
  const me2=users.find(x=>x.id===d.uid),missing=me2?absOf(d,me2):[],viol=[];
  if(!day.length)return{missing:missing,viol:viol};
  const ab={};
  reqs.filter(x=>x.date===d.date&&x.id!==d.rid).concat([d]).forEach(r=>{const u=users.find(x=>x.id===r.uid);if(u)(ab[u.id]=ab[u.id]||[]).push(...absOf(r,u))});
  const pts=new Set([1080]);
  day.forEach(x=>x.sh.forEach(([a,b])=>{pts.add(a);pts.add(b)}));
  Object.values(ab).forEach(l=>l.forEach(([a,b])=>{pts.add(a);pts.add(b)}));
  covers.filter(c=>c.date===d.date).forEach(c=>{pts.add(tm2(c.from));pts.add(tm2(c.to))});
  const P=[...pts].sort((a,b)=>a-b),all=[].concat(...day.map(x=>x.sh)),lo=Math.min(...all.map(x=>x[0])),hi=Math.max(...all.map(x=>x[1]));
  for(let i=0;i<P.length-1;i++){
    const a=P[i],b=P[i+1];if(a<lo||b>hi)continue;
    const need=a>=1080?3:2;
    const have=day.filter(x=>x.sh.some(([s1,e1])=>s1<=a&&e1>=b)&&!(ab[x.u.id]||[]).some(([s1,e1])=>s1<=a&&e1>=b)).length+covers.filter(c=>c.date===d.date&&tm2(c.from)<=a&&tm2(c.to)>=b).length;
    if(have<need){const l=viol[viol.length-1];if(l&&l[1]===a&&l[2]===have&&l[3]===need)l[1]=b;else viol.push([a,b,have,need])}
  }
  return{missing:missing,viol:viol};
}
const violText=an=>an.viol.map(([a,b,h,n])=>m2t(a)+'–'+m2t(b)+' ('+h+' עובדים במקום '+n+')').join(', ');
function alertText(an){const p=[];if(an.missing.length)p.push('חסר עובד '+fromTo(an.missing));if(an.viol.length)p.push('חריגה מדרישת הכיסוי: '+violText(an));return p.join(' · ')}

const val=v=>('stringValue' in v)?v.stringValue:('integerValue' in v)?Number(v.integerValue):('doubleValue' in v)?v.doubleValue:('booleanValue' in v)?v.booleanValue:('arrayValue' in v)?(v.arrayValue.values||[]).map(val):('mapValue' in v)?obj(v.mapValue.fields||{}):null;
const obj=f=>Object.fromEntries(Object.entries(f).map(([k,v])=>[k,val(v)]));
async function list(c){
  let out=[],tok='';
  do{
    const r=await F(BASE+'/'+c+'?pageSize=300&key='+KEY+(tok?'&pageToken='+tok:''));
    if(!r.ok)throw new Error('read '+c+' failed '+r.status);
    const j=await r.json();
    (j.documents||[]).forEach(d=>out.push(Object.assign({id:d.name.split('/').pop(),updateTime:d.updateTime},obj(d.fields||{}))));
    tok=j.nextPageToken||'';
  }while(tok);
  return out;
}
const ilStr=ms=>new Date(ms).toLocaleString('sv-SE',{timeZone:'Asia/Jerusalem'}).replace(' ','T').slice(0,16);
const prevDay=k=>{const d=new Date(k+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10)};
async function claim(r){
  const u=BASE+'/requests/'+r.id+'?updateMask.fieldPaths=reminded&currentDocument.updateTime='+encodeURIComponent(r.updateTime)+'&key='+KEY;
  const res=await F(u,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields:{reminded:{booleanValue:true}}})});
  return res.ok;
}
async function addMessage(m){
  const f={};
  Object.entries(m).forEach(([k,v])=>{f[k]=typeof v==='boolean'?{booleanValue:v}:typeof v==='number'?{integerValue:String(v)}:{stringValue:String(v)}});
  const res=await F(BASE+'/messages?key='+KEY,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields:f})});
  if(!res.ok)throw new Error('message failed '+res.status);
}
async function sendMail(d,an){
  const day=kd(d.date).toLocaleDateString('he-IL'),noteText=d.note||'אין הערות',typeDesc=desc(d);
  const shT=an.missing.length?'חסר עובד '+fromTo(an.missing):'לא נקבעו שעות עבודה ליום זה';
  const exT=an.viol.length?'⚠ חריגה מדרישת הכיסוי: '+violText(an):'אין חריגה מדרישת הכיסוי (לפחות 2 עובדים, ומשעה 18:00 לפחות 3)';
  const body='בקשה מעובד: '+d.name+'\nסוג הבקשה: '+typeDesc+'\nתאריך: '+day+(d.note?'\nסיבה / הערות: '+d.note:'');
  const res=await fetch('https://api.emailjs.com/api/v1.0/email/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
    service_id:EJ.service,template_id:EJ.template,user_id:EJ.publicKey,accessToken:EJ.privateKey,
    template_params:{from_name:d.name,from_email:MAIL_FROM,reply_to:MAIL_FROM,to_email:MAIL_TO,to_name:'מנהל',
      start_date:'יום '+WD[kd(d.date).getDay()]+', '+day,day_name:'יום '+WD[kd(d.date).getDay()],end_date:day,
      subject:'תזכורת למחר – בקשה מעובד – '+d.name,message:body,request_type:typeDesc,type_name:T[d.type],request_time:d.time||'כל היום',
      shortage:shT,exception:exT,type:typeDesc,note:noteText,reason:noteText,title:'תזכורת למחר',app_url:APP_URL}})});
  if(!res.ok)throw new Error('emailjs '+res.status+' '+await res.text());
}
async function main(){
  await signIn();
  users=await list('users');reqs=await list('requests');covers=await list('covers');
  const boss=users.find(u=>u.role==='manager');
  if(!boss){console.log('no manager');return}
  const nowIL=ilStr(NOW.getTime());
  for(const r of reqs){
    if(r.reminded)continue;
    const due=prevDay(r.date)+'T14:30';
    if(!(nowIL>=due&&nowIL<r.date+'T23:59'&&ilStr(r.ts)<due))continue;
    if(!(await claim(r))){console.log('already claimed',r.id);continue}
    const d=Object.assign({},r,{rid:r.id}),an=analyze(d);
    const text='תזכורת למחר: '+r.name+' – '+desc(r)+' · '+r.date;
    await addMessage({to:boss.id,rid:r.id,text:text,alert:alertText(an),reminder:true,ts:Date.now(),read:false});
    try{await sendMail(d,an);console.log('sent reminder',r.id)}catch(e){console.error('mail failed',e.message)}
  }
}
main().catch(e=>{console.error(e);process.exit(1)});
