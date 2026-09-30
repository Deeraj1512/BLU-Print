"use strict";
/* ============================================================
   report.js — Module 6: Weekly Report.
   Read-only dashboard over Mon→Sun windows + auto coaching.
   Reads: plan, focus, cards, reviewLog, quizzes, errors, mocks.
   Writes: nothing (except the header chip).
   ============================================================ */

function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function fmtMin(m){m=Math.round(m);if(m<60)return m+"m";const h=Math.floor(m/60),r=m%60;return h+"h"+(r?" "+r+"m":"");}
function mondayOf(ds){const d=pdate(ds);return addDays(ds,-((d.getDay()+6)%7));}
function inR(ds,a,b){return ds>=a&&ds<=b;}
function pctOf(a,b){return b?Math.round(a/b*100):0;}
function avgA(a){return a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):0;}
function scorePctM(m){return Math.max(0,Math.min(100,Math.round(m.score/Math.max(1,m.total*4)*100)));}
function weakOfName(n){const s=((state.cfg&&state.cfg.subjects)||[]).find(x=>x.name===n);return s?s.weak:1;}
function weakestName(){const on=((state.cfg&&state.cfg.subjects)||[]).filter(s=>s.on);
  return on.length?on.slice().sort((a,b)=>b.weak-a.weak||b.size-a.size)[0].name:"Surgery";}
const DAY_L=["M","T","W","T","F","S","S"];

/* trend arrow vs previous week (lowerBetter flips the colour logic) */
function tr(cur,prev,lowerBetter){
  if(prev===null||prev===undefined)return "";
  const d=cur-prev;
  if(d===0)return ' <span class="flat">→</span>';
  const good=lowerBetter?d<0:d>0;
  return ' <span class="'+(good?"up":"down")+'">'+(d>0?"▲":"▼")+Math.abs(d)+"</span>";
}

/* ---------- collect all metrics for one Mon→Sun window ---------- */
function collect(a,b){
  const t=todayStr();
  const past=state.plan.filter(p=>inR(p.date,a,b)&&p.date<=t);   /* future days don't count yet */
  let planned=0,done=0;const perDay=[];
  for(let i=0;i<7;i++){
    const ds=addDays(a,i);
    const p=state.plan.find(x=>x.date===ds);
    if(p&&ds<=t){
      const st=p.sessions.filter(s=>s.kind==="study");
      const dn=st.filter(s=>s.done||s.status==="moved").length;
      planned+=st.length;done+=dn;perDay.push({planned:st.length,done:dn,future:false});
    }else perDay.push({planned:0,done:0,future:ds>t});
  }
  /* focus */
  const flog=((state.focus||{}).log||[]).filter(e=>inR(e.date,a,b));
  let focused=0,intN=0,lost=0,phoneYes=0;
  flog.forEach(e=>{focused+=e.focusedMin||0;(e.interruptions||[]).forEach(i=>{intN++;lost+=i.lostMin||0;});if(e.phoneAway)phoneYes++;});
  /* cards */
  const rl=state.reviewLog||{};
  let rev=0,again=0;
  Object.keys(rl).forEach(d=>{if(inR(d,a,b)){rev+=rl[d].n;again+=rl[d].again;}});
  let added=0;
  (state.cards||[]).forEach(c=>{if(c.created){const cd=dstr(new Date(c.created));if(inR(cd,a,b))added++;}});
  const col=(state.cards||[]).length;
  const dueNow=(state.cards||[]).filter(c=>c.due<=t).length;
  /* quizzes */
  const qz=(state.quizzes||[]).filter(q=>inR(q.date,a,b));
  let qQ=0,qC=0;qz.forEach(q=>{qQ+=q.correct+q.wrong;qC+=q.correct;});
  /* errors */
  const eNew=(state.errors||[]).filter(e=>inR(e.date,a,b));
  const eRes=(state.errors||[]).filter(e=>e.resolvedDate&&inR(e.resolvedDate,a,b));
  const eOpen=(state.errors||[]).filter(e=>!e.resolved);
  const eDue=eOpen.filter(e=>e.retestDue<=t).length;
  const reasons={};eNew.forEach(e=>{reasons[e.reason]=(reasons[e.reason]||0)+1;});
  /* mocks */
  const mocks=(state.mocks||[]).filter(m=>inR(m.date,a,b));
  const gAll=(state.mocks||[]).filter(m=>m.type==="grand");
  const gAvg=gAll.length?avgA(gAll.map(scorePctM)):null;
  const tgt=+((state.mockGoal||{}).marks)||400;
  const gap=gAvg===null?null:Math.max(0,Math.round((Math.round(tgt/8)-gAvg)*8));
  /* subjects touched (plan sessions only) */
  const sub={};
  past.forEach(p=>p.sessions.forEach(s=>{if(s.kind==="study"){const k=s.subject||"General";
    sub[k]=sub[k]||{p:0,d:0};sub[k].p++;if(s.done||s.status==="moved")sub[k].d++;}}));
  const subjArr=Object.keys(sub).map(k=>({k:k,p:sub[k].p,d:sub[k].d})).sort((x,y)=>y.p-x.p).slice(0,8);
  return {a:a,b:b,planned:planned,done:done,pct:pctOf(done,planned),missed:planned-done,perDay:perDay,
    fN:flog.length,focused:focused,intN:intN,lost:lost,phonePct:flog.length?Math.round(phoneYes/flog.length*100):null,
    avgSess:flog.length?Math.round(focused/flog.length):0,
    rev:rev,again:again,recall:rev?Math.round((rev-again)/rev*100):null,added:added,col:col,dueNow:dueNow,
    qN:qz.length,qQ:qQ,qAcc:qQ?Math.round(qC/qQ*100):null,
    eNew:eNew.length,eRes:eRes.length,eOpen:eOpen.length,eDue:eDue,reasons:reasons,
    mocks:mocks,gAvg:gAvg,gap:gap,subjArr:subjArr,weakest:weakestName()};
}

/* ---------- render helpers ---------- */
function row(k,v){return '<div class="rl"><span class="rk">'+k+'</span><span class="rv">'+v+'</span></div>';}
function dayStrip(perDay){
  let h='<div class="daystrip">';
  perDay.forEach(function(d,i){
    const pc=d.future?0:pctOf(d.done,d.planned);
    h+='<div class="ds-col" title="'+(d.planned?d.done+"/"+d.planned+" done":(d.future?"upcoming":"no plan"))+'">'
      +'<div class="ds-bar">'+(d.future?"":'<div class="ds-fill" style="height:'+pc+'%"></div>')+'</div>'
      +'<div class="ds-lab">'+DAY_L[i]+'</div></div>';
  });
  return h+'</div>';
}
function reasonChips(r){
  const L={concept:"🧠",forgot:"🌫",silly:"🤦",misread:"👀"};
  return Object.keys(r).filter(k=>r[k]>0).map(k=>'<span class="reason-chip">'+L[k]+" "+r[k]+"</span>").join("")
    ||'<span class="mini">—</span>';
}

/* ---------- main render ---------- */
function renderWeek(){
  const m=collect(weekStart,addDays(weekStart,6));
  const p=collect(addDays(weekStart,-7),addDays(weekStart,-1));
  const t=todayStr();
  const lab=pdate(weekStart).toLocaleDateString("en-IN",{day:"numeric",month:"short"})+" → "
    +pdate(addDays(weekStart,6)).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
  $("wLabel").textContent="Week of "+lab;
  $("wNote").textContent=(t>=weekStart&&t<=addDays(weekStart,6))
    ?"This week is in progress — numbers update live. Full picture on Sunday."
    :"Completed week — the numbers are final.";

  $("bigStats").innerHTML='<div class="stat">'
    +'<div class="card"><b>'+m.pct+'%</b><span>plan done</span></div>'
    +'<div class="card"><b>'+fmtMin(m.focused)+'</b><span>focused</span></div>'
    +'<div class="card"><b>🔥 '+streak()+'</b><span>streak</span></div>'
    +'<div class="card"><b>'+(m.recall===null?"—":m.recall+"%")+'</b><span>card recall</span></div></div>';

  /* plan */
  $("planBody").innerHTML=(m.planned===0
    ?'<p class="mini">No plan sessions in this window.</p>'
    :row("Sessions done",m.done+" / "+m.planned+" ("+m.pct+"%)"+tr(m.pct,p.pct,false))
    +row("Missed sessions",m.missed===0?"none 🎉":m.missed+" (use Reflow on Today)")
    +dayStrip(m.perDay));

  /* focus */
  $("focusBody").innerHTML=(m.fN===0
    ?'<p class="mini">No Focus sessions logged this week. Even reading with the DND screen on counts — start it from the Focus page.</p>'
    :row("Focused time",fmtMin(m.focused)+tr(m.focused,p.focused,false))
    +row("Sessions",m.fN+" ("+fmtMin(m.avgSess)+" avg)")
    +row("Interruptions",m.intN+tr(m.intN,p.intN,true)+" · ~"+fmtMin(m.lost)+" lost")
    +row("Phone stayed away",(m.phonePct===null?"—":m.phonePct+"%"+tr(m.phonePct,p.phonePct,false))));

  /* cards */
  $("cardsBody").innerHTML=(m.col===0
    ?'<p class="mini">No flashcards yet — import notes on the Cards page.</p>'
    :row("Reviewed",m.rev===0?"0 — the forgetting clock is running":m.rev+tr(m.rev,p.rev,false))
    +row("Recall",(m.recall===null?"— (review cards to start tracking)":m.recall+"% ("+m.again+' "Again")'))
    +row("New cards added",m.added)
    +row("Due now",m.dueNow)
    +row("Collection",m.col));

  /* practice + errors */
  $("prBody").innerHTML=row("Quizzes taken",m.qN===0?"0":m.qN+" · "+m.qQ+" Qs · "+(m.qAcc===null?"—":m.qAcc+"% acc"))
    +row("Errors: new",m.eNew)
    +row("Errors: conquered",m.eRes===0?"0":m.eRes+" ✔")
    +row("Errors: open / due",m.eOpen+" open · "+m.eDue+" due for retest")
    +'<div style="margin-top:8px"><span class="rk" style="font-size:12px;color:var(--muted)">This week\'s mistake mix:</span> '+reasonChips(m.reasons)+'</div>');

  /* mocks */
  let mh=m.mocks.length
    ?m.mocks.map(x=>'<div class="rl"><span class="rk">'+pdate(x.date).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})
      +" · "+esc(x.platform)+(x.subj?" · "+esc(x.subj):" · grand")+'</span><span class="rv">'+x.score+"/"+x.total*4+" ("+scorePctM(x)+'%)</span></div>').join("")
    :'<p class="mini">No tests logged this week.</p>';
  mh+=row("Target gap",(m.gAvg===null?"log a grand mock to track":m.gap===0?"at target 🏆":m.gap+" marks to find (target "+Math.round(((+state.mockGoal.marks)||400)/8)+"%)"));
  $("mockBody").innerHTML=mh;

  /* subjects */
  $("subjBody").innerHTML=(m.subjArr.length
    ?m.subjArr.map(function(s){
      const cls=s.d===0?"zero":(s.d>=s.p?"full":"part");
      const star=s.k===m.weakest?" ⭐":"";
      return '<span class="schip '+cls+'">'+esc(s.k)+star+" "+s.d+"/"+s.p+"</span>";
    }).join("")+'<p class="mini">⭐ = her weakest subject. Green = fully done · amber = partial · red = untouched.</p>'
    :'<p class="mini">No study sessions in this window.</p>');

  renderCoaching(m,p);
  window._reportText=buildText(m);
}

/* ---------- auto coaching ---------- */
function renderCoaching(m,p){
  const wins=[],slips=[];
  if(m.planned>0&&m.pct>=80)wins.push("Completed "+m.pct+"% of planned sessions ("+m.done+"/"+m.planned+").");
  if(m.fN>0&&m.intN<p.intN)wins.push("Interruptions down: "+p.intN+" → "+m.intN+". The DND screen is working.");
  if(m.focused>=(state.cfg.hours*60*7*0.7))wins.push("Focused "+fmtMin(m.focused)+" this week — on track with the plan's target.");
  if(m.eRes>0&&m.eRes>=m.eNew)wins.push("Conquered "+m.eRes+" error(s) — more than the "+m.eNew+" new ones. The bug count is shrinking.");
  if(m.recall!==null&&m.rev>=20&&m.recall>=85)wins.push("Card recall at "+m.recall+"% — memory is consolidating properly.");
  if(m.mocks.length)wins.push("Logged "+m.mocks.length+" test(s) — the data loop is alive.");
  if(m.planned>0&&m.pct<60)slips.push("Only "+m.pct+"% of sessions done — "+m.missed+" missed.");
  if(m.fN>0&&m.intN>p.intN)slips.push("Interruptions up: "+p.intN+" → "+m.intN+" (~"+fmtMin(m.lost)+" lost).");
  if(m.phonePct!==null&&m.phonePct<60)slips.push("Phone was away in only "+m.phonePct+"% of sessions.");
  if(m.col>=20&&m.rev===0)slips.push("Zero flashcard reviews this week — forgetting is free-running.");
  if(m.dueNow>=30)slips.push(m.dueNow+" cards piled up as due — a 15-minute drill clears the worst.");
  if(m.eDue>0)slips.push(m.eDue+" error retest(s) overdue — unproven errors are still alive.");
  if(m.mocks.length===0)slips.push("No test logged this week — trends go stale without data.");
  const wSub=m.subjArr.find(s=>s.k===m.weakest);
  if(wSub&&wSub.p>0&&wSub.d<2)slips.push("Weakest subject ("+m.weakest+") got only "+wSub.d+" completed session(s).");

  $("winBody").innerHTML=wins.length?wins.map(w=>'<div class="win"><div>'+esc(w)+'</div></div>').join("")
    :'<p class="mini">Nothing to celebrate yet — wins appear as the week fills with data.</p>';
  $("slipBody").innerHTML=slips.length?slips.map(s=>'<div class="slip"><div>'+esc(s)+'</div></div>').join("")
    :'<p class="mini">Nothing slipped. Rare and excellent 🌟</p>';

  const acts=[];
  if(m.eDue>0)acts.push({text:"Clear the "+m.eDue+" error retest(s) — about 10 minutes.",link:{href:"errors.html",label:"Errors"}});
  if(m.dueNow>0)acts.push({text:"Flashcard drill daily — "+m.dueNow+" due, weakest subject first.",link:{href:"flashcards.html",label:"Cards"}});
  if(m.missed>0)acts.push({text:"Carry missed sessions forward with Reflow instead of feeling behind.",link:{href:"index.html",label:"Today"}});
  if(m.mocks.length===0)acts.push({text:"Log this week's QBank/platform test(s) — 30 seconds each.",link:{href:"mock.html",label:"Mocks"}});
  if(m.phonePct!==null&&m.phonePct<70)acts.push({text:"Ritual fix: phone in another room before every Focus session — push it above 90%.",link:{href:"focus.html",label:"Focus"}});
  if(wSub&&wSub.p>0&&wSub.d<2)acts.push({text:"Keep "+m.weakest+" in the morning Deep Work slot; raise its topic weights if needed.",link:{href:"syllabus.html",label:"Syllabus"}});
  acts.push({text:"Sunday call: send the copied report, pick ONE fix, agree on it. That's the whole meeting. 💜",link:null});
  $("actBody").innerHTML=acts.slice(0,6).map(function(a,i){
    return '<div class="act" data-n="'+(i+1)+')"><div>'+esc(a.text)
      +(a.link?' <a href="'+a.link.href+'">'+a.link.label+' →</a>':"")+"</div></div>";
  }).join("");
}

/* ---------- shareable text ---------- */
function buildText(m){
  const L=[];
  L.push("📋 WEEKLY REPORT — "+pdate(m.a).toLocaleDateString("en-IN",{day:"numeric",month:"short"})+" → "
    +pdate(m.b).toLocaleDateString("en-IN",{day:"numeric",month:"short"})+" · ⚡ "
    +diffDays(todayStr(),state.cfg.examDate)+" days to exam");
  L.push("✅ Plan: "+m.done+"/"+m.planned+" sessions ("+m.pct+"%) · 🔥 streak "+streak());
  L.push("⏱ Focused: "+fmtMin(m.focused)+(m.fN?" across "+m.fN+" sessions":"")
    +(m.intN!==null?" · 🔔 "+m.intN+" interruptions (~"+fmtMin(m.lost)+")":"")
    +(m.phonePct!==null?" · 📱 away "+m.phonePct+"%":""));
  L.push("🃏 Cards: "+m.rev+" reviewed"+(m.recall===null?"":" · "+m.recall+"% recall")+" · +"+m.added+" new · "+m.dueNow+" due");
  L.push("📝 Quizzes: "+m.qN+" · 🐛 Errors: +"+m.eNew+" / "+m.eRes+" conquered / "+m.eOpen+" open ("+m.eDue+" due)");
  L.push("🏟 Mocks: "+m.mocks.length+" logged"
    +(m.gAvg===null?"":" · grand avg "+m.gAvg+"%"+(m.gap>0?" · "+m.gap+" marks to target":" · at target 🏆")));
  const acts=document.querySelectorAll("#actBody .act");
  if(acts.length){L.push("NEXT WEEK:");acts.forEach(function(a,i){
    L.push((i+1)+") "+a.textContent.replace(/ →$/,"").trim());});}
  return L.join("\n");
}
function copyText(t){
  if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(t);
  return new Promise(function(res,rej){
    const ta=document.createElement("textarea");ta.value=t;document.body.appendChild(ta);ta.select();
    try{document.execCommand("copy");res();}catch(e){rej(e);}
    document.body.removeChild(ta);
  });
}

/* ---------- boot & week navigation ---------- */
let weekStart=null;
if(needPlan()){
  $("hchip").textContent="⚡ "+diffDays(todayStr(),state.cfg.examDate)+" days to exam";
  weekStart=mondayOf(todayStr());
  const firstMonday=mondayOf(state.plan[0].date);
  $("wPrev").onclick=function(){
    const c=addDays(weekStart,-7);
    if(c>=firstMonday){weekStart=c;renderWeek();}
  };
  $("wNext").onclick=function(){
    const c=addDays(weekStart,7);
    if(c<=mondayOf(todayStr())){weekStart=c;renderWeek();}
  };
  $("copyBtn").onclick=function(){
    copyText(window._reportText||"").then(function(){
      $("shStatus").textContent="Copied ✅ — paste it to your brother on WhatsApp.";
    }).catch(function(){$("shStatus").textContent="Copy failed — select and copy manually.";});
  };
  $("shareBtn").onclick=function(){
    if(navigator.share){navigator.share({title:"Weekly study report",text:window._reportText||""}).catch(function(){});}
    else $("shStatus").textContent="Sharing not supported here — use 📋 Copy instead.";
  };
  renderWeek();
}