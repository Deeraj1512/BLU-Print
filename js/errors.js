"use strict";
/* ============================================================
   errors.js — Module 4: Error Lab.
   Data: state.errors = [{id,date,subj,topic,q,options,answer,expl,
          chosen,reason,fixCardId,retestDue,resolved,timesWrong}]
   ============================================================ */

const RL={concept:"🧠 Didn't know",forgot:"🌫 Forgot",silly:"🤦 Silly",misread:"👀 Misread"};
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function weakNum(subj){const s=((state.cfg&&state.cfg.subjects)||[]).find(x=>x.name===subj);return s?s.weak:1;}
function rateFix(c){ /* nudge the paired fix flashcard forward/backward */
  if(!c)return;c.seen=(c.seen||0)+1;
}

/* ---------- stats ---------- */
function renderStats(){
  const t=todayStr();
  const open=state.errors.filter(e=>!e.resolved);
  const due=open.filter(e=>e.retestDue<=t).length;
  const week=state.errors.filter(e=>diffDays(e.date,t)>=0&&diffDays(e.date,t)<7).length;
  const lastweek=state.errors.filter(e=>diffDays(e.date,t)>=7&&diffDays(e.date,t)<14).length;
  const trend=lastweek===0&&week===0?"":lastweek===0?"<p class='mini'>📈 "+week+" new this week.</p>"
    :(week<=lastweek?"📉 "+week+" new this week vs "+lastweek+" last week. ":"📈 "+week+" new this week vs "+lastweek+". ")
    +(open.length?"<b>"+open.length+"</b> still open.":"All conquered! 🏆");
  const bySub={};open.forEach(e=>{bySub[e.subj]=(bySub[e.subj]||0)+1;});
  const chips=Object.keys(bySub).sort((a,b)=>bySub[b]-bySub[a]||weakNum(b)-weakNum(a)).slice(0,6)
    .map(s=>'<span class="fc-chip">'+esc(s)+' · '+bySub[s]+'</span>').join("");
  $("erStats").innerHTML='<div class="stat">'
    +'<div class="card"><b>'+open.length+'</b><span>open errors</span></div>'
    +'<div class="card"><b>'+due+'</b><span>due for retest</span></div>'
    +'<div class="card"><b>'+state.errors.filter(e=>e.resolved).length+'</b><span>conquered ✔</span></div></div>'
    +(trend||chips?'<div class="card">'+trend+(chips?'<div style="margin-top:8px">'+chips+'</div>':"")+'</div>':"");
  $("retestBanner").innerHTML=due
    ?'<div class="notice"><span>🔁 '+due+' error(s) ready for retest — prove you\'ve conquered them.</span>'
     +'<button class="btn small ghost" id="rtStart">Retest now</button></div>'
    :"";
  if(due)$("rtStart").onclick=startRetest;
}

/* ---------- list ---------- */
function renderList(){
  const sf=$("fSubj").value,rf=$("fReason").value,st=$("fStatus").value,t=todayStr();
  const list=state.errors
    .filter(e=>(!sf||e.subj===sf)&&(!rf||e.reason===rf)&&(st===""||st==="all"?true:st==="open"?!e.resolved:e.resolved))
    .sort((a,b)=>weakNum(b.subj)-weakNum(a.subj)||((a.retestDue<b.retestDue?-1:a.retestDue>b.retestDue?1:0)))
    .slice(0,120);
  $("erList").innerHTML=list.length?list.map(function(e){
    const isDue=!e.resolved&&e.retestDue<=t;
    return '<div class="erow'+(e.resolved?" res":"")+'">'
      +'<div class="etop"><span class="rc rc-'+e.reason+'">'+RL[e.reason]+'</span>'
      +'<span class="em">'+esc(e.subj)+(e.topic?" · "+esc(e.topic):"")+' · '+e.date
      +(e.timesWrong>1?' · <b>×'+e.timesWrong+' wrong</b>':"")+'</span></div>'
      +'<div class="eq">'+esc(e.q)+'</div>'
      +'<div class="ea">✅ '+esc(String.fromCharCode(65+e.answer)+". "+e.options[e.answer])+'</div>'
      +'<div class="em">Retest '+(e.resolved?"conquered ✔ "+(e.resolvedDate||""):(isDue?"<b>due today</b>":"on "+e.retestDue))+'</div>'
      +'<div class="ebut">'
      +(e.resolved?"":'<button class="minibtn" data-rt="'+e.id+'">🔁 Retest</button>'
        +'<button class="minibtn" data-rs="'+e.id+'">Mark conquered</button>')
      +'<button class="minibtn red" data-del="'+e.id+'">Delete</button></div></div>';
  }).join(""):'<p class="mini">Nothing here. Wrong answers from quizzes land here automatically.</p>';

  document.querySelectorAll("[data-rt]").forEach(b=>b.onclick=()=>startRetest([b.dataset.rt]));
  document.querySelectorAll("[data-rs]").forEach(b=>b.onclick=function(){
    const e=state.errors.find(x=>x.id===b.dataset.rs);
    e.resolved=true;e.resolvedDate=todayStr();save();renderAll();
  });
  document.querySelectorAll("[data-del]").forEach(b=>b.onclick=function(){
    if(!confirm("Delete this error entry? (Its fix flashcard stays in Cards.)"))return;
    state.errors=state.errors.filter(x=>x.id!==b.dataset.del);save();renderAll();
  });
}
function renderAll(){renderStats();renderList();}

/* ---------- retest runner ---------- */
let RTq=[],RTi=0;
function startRetest(onlyIds){
  const t=todayStr();
  RTq=state.errors.filter(e=>!e.resolved&&e.retestDue<=t&&(!onlyIds||onlyIds.indexOf(e.id)>=0));
  if(!RTq.length){alert("Nothing due for retest.");return;}
  RTi=0;$("rtOverlay").classList.remove("hidden");serveRT();
}
function serveRT(){
  const e=RTq[RTi];
  /* shuffle served options */
  const idx=[0,1,2,3];for(let i=3;i>0;i--){const j=Math.floor(Math.random()*(i+1));const x=idx[i];idx[i]=idx[j];idx[j]=x;}
  e._serve=idx;
  $("rtBody").innerHTML='<h2>🔁 Retest '+(RTi+1)+' / '+RTq.length+'</h2>'
    +'<p class="mini">'+esc(e.subj)+(e.topic?" · "+esc(e.topic):"")+(e.timesWrong>1?' · <b>wrong ×'+e.timesWrong+'</b>':"")+'</p>'
    +'<div class="eq" style="margin:8px 0">'+esc(e.q)+'</div>'
    +idx.map((oi,k)=>'<button class="intOpt" data-k="'+k+'">'+String.fromCharCode(65+k)+". "+esc(e.options[oi])+'</button>').join("")
    +'<div id="rtFb"></div><button class="cancel" id="rtQuit">quit retest</button>';
  document.querySelectorAll("#rtBody .intOpt").forEach(b=>b.onclick=function(){answerRT(+b.dataset.k);});
  $("rtQuit").onclick=()=>{$("rtOverlay").classList.add("hidden");renderAll();};
}
function answerRT(k){
  const e=RTq[RTi],picked=e._serve[k],right=picked===e.answer;
  document.querySelectorAll("#rtBody .intOpt").forEach((b,bi)=>{
    b.disabled=true;
    if(e._serve[bi]===e.answer)b.style.background="#dcfce7",b.style.color="#15803d";
    else if(bi===k)b.style.background="#fee2e2",b.style.color="#b91c1c";
  });
  const fix=state.cards.find(c=>c.id===e.fixCardId);
  if(right){
    e.resolved=true;e.resolvedDate=todayStr();
    if(fix){fix.iv=Math.max(1,Math.round((fix.iv||1)*2));fix.due=addDays(todayStr(),fix.iv);} /* push its card further out */
    $("rtFb").innerHTML='<p class="mini" style="color:#15803d;font-weight:700">✅ Conquered! It stays dead.</p>';
  }else{
    e.timesWrong++;e.chosen=picked;e.retestDue=addDays(todayStr(),7);
    if(fix)fix.due=todayStr();                                    /* card comes back today */
    $("rtFb").innerHTML='<p class="mini" style="color:#b91c1c">❌ Not yet. Correct: '
      +esc(String.fromCharCode(65+e.answer)+". "+e.options[e.answer])
      +'. Comes back in 7 days — and its flashcard is due TODAY.</p>'+(e.expl?'<p class="mini">'+esc(e.expl)+'</p>':"");
  }
  save();
  const btn=document.createElement("button");btn.className="intOpt";btn.textContent=RTi<RTq.length-1?"Next →":"Finish";
  btn.onclick=function(){RTi++;if(RTi<RTq.length)serveRT();else{$("rtOverlay").classList.add("hidden");renderAll();}};
  $("rtFb").appendChild(btn);
}

/* ---------- boot ---------- */
if(needPlan()){
  if(!state.errors)state.errors=[];
  $("hchip").textContent="⚡ "+diffDays(todayStr(),state.cfg.examDate)+" days to exam";
  DEFAULT_SUBJECTS.forEach(s=>{const o=document.createElement("option");o.value=s[0];o.textContent=s[0];$("fSubj").appendChild(o);});
  $("fSubj").onchange=renderList;$("fReason").onchange=renderList;$("fStatus").onchange=renderList;
  renderAll();
}