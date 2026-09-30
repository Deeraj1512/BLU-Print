"use strict";
/* ============================================================
   mock.js — Module 5: Mock Arena.
   Logs external test results (Marrow/PrepLadder/etc.) and turns
   them into trends, subject radar and negative-marking analysis.
   Data: state.mocks = [...], state.mockGoal = { marks }
   ============================================================ */

function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function ensureMK(){
  if(!state.mocks)state.mocks=[];
  if(!state.mockGoal)state.mockGoal={marks:400};
}
function maxScore(m){return m.total*4;}
function scorePct(m){return Math.max(0,Math.min(100,Math.round(m.score/maxScore(m)*100)));}
function attempted(m){return m.correct+m.wrong;}
function accAttempted(m){return attempted(m)?Math.round(m.correct/attempted(m)*100):0;}
function attemptRate(m){return m.total?Math.round(attempted(m)/m.total*100):0;}
function sumWrong(list){return list.reduce((a,m)=>a+m.wrong,0);}
function weakOfName(subj){const s=((state.cfg&&state.cfg.subjects)||[]).find(x=>x.name===subj);return s?s.weak:1;}
function chrono(){return state.mocks.slice().sort((a,b)=>a.date===b.date?(a.created||0)-(b.created||0):(a.date<b.date?-1:1));}
function avgArr(a){return a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):0;}

/* ---------- grand-mock-today integration ---------- */
function todayGrandMock(){
  if(!state.plan)return null;
  const day=state.plan.find(p=>p.date===todayStr());
  if(!day)return null;
  for(let i=0;i<day.sessions.length;i++){
    const s=day.sessions[i];
    if(s.kind==="study"&&s.label&&s.label.indexOf("GRAND MOCK")>=0&&!s.done)return{idx:i,sess:s};
  }
  return null;
}
function renderNotice(){
  const gm=todayGrandMock();
  $("gmNotice").innerHTML=gm
    ?'<div class="notice"><span>🏆 Your plan has a Grand Mock scheduled today. Take it on your QBank platform, then log it here.</span>'
     +'<button class="btn small ghost" id="gmDone">✓ Mark done in Today</button></div>'
    :"";
  if(gm)$("gmDone").onclick=function(){
    state.plan.find(p=>p.date===todayStr()).sessions[gm.idx].done=true;
    save();renderNotice();
  };
}

/* ---------- form ---------- */
let editingId=null;
function setType(){
  const ty=$("mType").value;
  $("mSubjRow").style.display=ty==="subject"?"":"none";
  $("mTotal").value=ty==="grand"?200:100;
  autoScore();
}
function autoScore(){
  const c=Math.round(+$("mCorrect").value||0),w=Math.round(+$("mWrong").value||0);
  $("mScore").value=c*4-w;
}
function clearForm(){
  editingId=null;
  $("mSaveBtn").textContent="💾 Save test";
  $("mCancelEdit").classList.add("hidden");
  $("mType").value="grand";setType();
  $("mDate").value=todayStr();
  $("mPlatform").value="";$("mMins").value="";
  $("mCorrect").value=0;$("mWrong").value=0;$("mScore").value=0;
  $("mNotes").value="";$("mStatus").textContent="";
}
function startEdit(id){
  const m=state.mocks.find(x=>x.id===id);if(!m)return;
  editingId=id;
  $("mType").value=m.type;setType();
  $("mDate").value=m.date;
  if(m.type==="subject")$("mSubj").value=m.subj;
  $("mPlatform").value=m.platform==="—"?"":m.platform;
  $("mTotal").value=m.total;
  $("mCorrect").value=m.correct;$("mWrong").value=m.wrong;$("mScore").value=m.score;
  $("mMins").value=m.minutes||"";$("mNotes").value=m.notes||"";
  $("mSaveBtn").textContent="💾 Update test";
  $("mCancelEdit").classList.remove("hidden");
  window.scrollTo({top:0,behavior:"smooth"});
}
function saveEntry(){
  const ty=$("mType").value;
  const date=$("mDate").value||todayStr();
  const total=Math.round(+$("mTotal").value||0);
  const correct=Math.round(+$("mCorrect").value||0);
  const wrong=Math.round(+$("mWrong").value||0);
  const subj=ty==="subject"?$("mSubj").value:"";
  if(diffDays(date,todayStr())<0){alert("That date is in the future.");return;}
  if(total<1){alert("Total questions must be at least 1.");return;}
  if(correct<0||wrong<0||correct+wrong>total){alert("Correct + Wrong cannot exceed Total.");return;}
  const skipped=Math.max(0,total-correct-wrong);
  const score=Math.round(+$("mScore").value||0);
  const mins=$("mMins").value?Math.round(+$("mMins").value):0;
  const notes=$("mNotes").value.trim();
  const platform=$("mPlatform").value.trim()||"—";
  if(editingId){
    const m=state.mocks.find(x=>x.id===editingId);
    if(m)Object.assign(m,{date:date,platform:platform,type:ty,subj:subj,total:total,
      correct:correct,wrong:wrong,skipped:skipped,score:score,minutes:mins,notes:notes});
    $("mStatus").textContent="Updated ✅";
  }else{
    state.mocks.push({id:uid(),created:Date.now(),date:date,platform:platform,type:ty,subj:subj,
      total:total,correct:correct,wrong:wrong,skipped:skipped,score:score,minutes:mins,notes:notes});
    $("mStatus").textContent="Saved ✅";
    if(ty==="grand"&&date===todayStr()){
      const gm=todayGrandMock();
      if(gm){
        state.plan.find(p=>p.date===todayStr()).sessions[gm.idx].done=true;
        $("mStatus").textContent="Saved ✅ and ticked off in Today 🏆";
      }
    }
  }
  save();clearForm();renderAll();
}

/* ---------- summary + target ---------- */
function renderSummary(){
  const ms=state.mocks;
  if(!ms.length){
    $("sumCards").innerHTML='<div class="card"><h2>🏟️ Mock Arena</h2><p class="mini" style="margin-top:4px">No tests logged yet. Log every QBank/Marrow test here — this page turns them into trends, a weak-subject radar and negative-marking analysis.</p></div>';
    return;
  }
  const pcts=ms.map(scorePct);
  const best=Math.max.apply(null,pcts);
  const neg=sumWrong(ms);
  $("sumCards").innerHTML='<div class="stat">'
    +'<div class="card"><b>'+ms.length+'</b><span>tests logged</span></div>'
    +'<div class="card"><b>'+best+'%</b><span>best score</span></div>'
    +'<div class="card"><b>'+avgArr(pcts)+'%</b><span>avg score</span></div>'
    +'<div class="card"><b>−'+neg+'</b><span>marks lost to wrongs</span></div></div>';
}
function renderTarget(){
  const tgt=+state.mockGoal.marks||400;
  const g=chrono().filter(m=>m.type==="grand");
  let inner='<div class="row2"><div><label>🎯 Target marks (NEET PG max = 200 Q × 4 = 800)</label>'
    +'<input type="number" id="gTgt" value="'+tgt+'" min="50" max="800"></div>'
    +'<div style="align-self:end"><button class="btn small ghost" id="gSave">Save target</button></div></div>';
  if(g.length){
    const tgtPct=Math.round(tgt/8);
    const gavg=avgArr(g.map(scorePct));
    const gap=tgtPct-gavg;
    if(gap<=0)inner+='<p class="mini" style="margin-bottom:0">🏆 Grand-mock average <b>'+gavg+'%</b> — at or above target ('+tgtPct+'%). Protect it: keep the flashcards and Error Lab running.</p>';
    else inner+='<p class="mini" style="margin-bottom:0">Grand-mock average <b>'+gavg+'%</b> vs target <b>'+tgtPct+'%</b> → <b>'+Math.round(gap*8)+' marks</b> to find. Halving your wrong answers across mocks alone is worth ~'+Math.round(sumWrong(g)/2)+' marks — that is what Error Lab + fix cards are for.</p>';
  }else inner+='<p class="mini" style="margin-bottom:0">Log a grand mock to track the gap to this target.</p>';
  $("targetCard").innerHTML='<div class="card"><h2>🎯 Target tracker</h2>'+inner+'</div>';
  $("gSave").onclick=function(){
    const v=Math.round(+$("gTgt").value||0);
    if(v<50||v>800){alert("Enter marks between 50 and 800.");return;}
    state.mockGoal={marks:v};save();renderAll();
  };
}

/* ---------- charts (hand-drawn SVG, no libraries) ---------- */
function chartSVG(vals,opts){
  if(!vals.length)return'<p class="mini">No data yet.</p>';
  const W=560,H=150,P=24,n=vals.length;
  const X=i=>n===1?W/2:P+(W-2*P)*i/(n-1);
  const Y=v=>H-P-(Math.max(0,Math.min(100,v))/100)*(H-2*P);
  let g="";
  [0,25,50,75,100].forEach(v=>{
    g+='<line x1="'+P+'" y1="'+Y(v)+'" x2="'+(W-P)+'" y2="'+Y(v)+'" stroke="#e5e9f2" stroke-width="1"/>'
      +'<text x="4" y="'+(Y(v)+4)+'" font-size="10" fill="#68708a">'+v+'</text>';
  });
  if(opts.target!=null){
    const y=Y(opts.target);
    g+='<line x1="'+P+'" y1="'+y+'" x2="'+(W-P)+'" y2="'+y+'" stroke="#dc2626" stroke-dasharray="5 4" stroke-width="1.5"/>'
      +'<text x="'+(W-52)+'" y="'+(y-4)+'" font-size="10" fill="#dc2626">target</text>';
  }
  const pts=vals.map((v,i)=>X(i)+","+Y(v)).join(" ");
  const line=n>1?'<polyline points="'+pts+'" fill="none" stroke="'+opts.color+'" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>':"";
  const dots=vals.map((v,i)=>'<circle cx="'+X(i)+'" cy="'+Y(v)+'" r="3.2" fill="'+opts.color+'"/>').join("");
  return'<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img">'+g+line+dots+'</svg>';
}
function renderCharts(){
  const ms=chrono();
  const tgtPct=Math.round((+state.mockGoal.marks||400)/8);
  $("chartScore").innerHTML=ms.length
    ?chartSVG(ms.map(scorePct),{color:"#16a34a",target:tgtPct})
    :'<p class="mini">Log tests to see the trend.</p>';
  $("chartAcc").innerHTML=ms.length
    ?chartSVG(ms.map(accAttempted),{color:"#4f46e5",target:null})
    :'<p class="mini">Log tests to see accuracy.</p>';
}

/* ---------- subject radar ---------- */
function renderSubjects(){
  const agg={};
  state.mocks.forEach(m=>{
    if(m.type!=="subject"||!m.subj)return;
    const r=agg[m.subj]=agg[m.subj]||{n:0,acc:0,pct:0};
    r.n++;r.acc+=accAttempted(m);r.pct+=scorePct(m);
  });
  const keys=Object.keys(agg);
  if(!keys.length){
    $("subjTable").innerHTML='<p class="mini">No subject tests logged yet. After each QBank subject test, log it here — this table becomes your weak-subject radar.</p>';
    return;
  }
  const rows=keys.map(k=>({k:k,n:agg[k].n,acc:Math.round(agg[k].acc/agg[k].n),pct:Math.round(agg[k].pct/agg[k].n)}))
    .sort((a,b)=>a.acc-b.acc);
  $("subjTable").innerHTML='<table class="mk"><tr><th>Subject</th><th>Tests</th><th>Accuracy (attempted)</th><th>Score %</th></tr>'
    +rows.map(r=>{
      const w=weakOfName(r.k);
      const cls=r.acc<50?"a-low":r.acc<65?"a-mid":"a-hi";
      return '<tr><td>'+esc(r.k)+(w>=4?' <span class="em">· weak '+w+'</span>':"")+'</td><td>'+r.n+'</td>'
        +'<td class="'+cls+'">'+r.acc+'%</td>'
        +'<td><div class="bar"><div style="width:'+Math.min(100,r.pct)+'%"></div></div></td></tr>';
    }).join("")+'</table>'
    +'<p class="mini">Sorted weakest-first. Red &lt;50% · amber &lt;65% · green ≥65%. Low bars here = raise that subject\'s weight on the Syllabus page.</p>';
}

/* ---------- insights ---------- */
function renderInsights(){
  const ms=chrono();
  if(ms.length<2){$("insList").innerHTML='<p class="mini">Insights appear after 2+ logged tests.</p>';return;}
  const pcts=ms.map(scorePct);
  const last3=pcts.slice(-3),prev3=pcts.slice(-6,-3);
  const lines=[];
  if(prev3.length){
    const d=avgArr(last3)-avgArr(prev3);
    lines.push(d>=0
      ?"📈 Trend up: last tests average "+avgArr(last3)+"% vs "+avgArr(prev3)+"% before — the plan is working."
      :"📉 Dip: last tests average "+avgArr(last3)+"% vs "+avgArr(prev3)+"% before. Check the Error Lab for repeating topics before adding more pages.");
  }
  const gm=ms.filter(m=>m.type==="grand");
  if(gm.length){
    lines.push("Grand mocks: ~"+avgArr(gm.map(attemptRate))+"% of questions attempted, "+avgArr(gm.map(accAttempted))+"% accuracy on attempted. With +4/−1, accuracy above 20% is net-positive — the enemy is not attempting too much, it is the wrongs you can convert.");
    lines.push("Best grand mock so far: "+Math.max.apply(null,gm.map(scorePct))+"%. Next one: beat it by ~5%.");
  }
  const neg=sumWrong(ms);
  if(neg)lines.push("Negative-marking bill so far: "+neg+" wrong answers = "+neg+" marks. Most NEET PG marks are lost to 'forgot' and 'silly' — exactly the reasons the Error Lab tracks.");
  $("insList").innerHTML=lines.map(l=>'<div class="ins">'+l+'</div>').join("");
}

/* ---------- history ---------- */
function renderHistory(){
  const list=state.mocks.slice().reverse();
  $("histList").innerHTML=list.length?list.map(function(m){
    const d=pdate(m.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"});
    return '<div class="mrow"><div class="mtop"><div><span class="typechip tc-'+m.type+'">'+(m.type==="grand"?"GRAND":"SUBJECT")+'</span>'
      +'<b>'+d+'</b> · '+esc(m.platform)+(m.subj?" · "+esc(m.subj):"")+'</div>'
      +'<div class="msc">'+m.score+' / '+(m.total*4)+' <span class="em">('+scorePct(m)+'%)</span></div></div>'
      +'<div class="mnote">'+m.correct+' ✓ · '+m.wrong+' ✗ · '+m.skipped+' skipped'
      +(m.minutes?" · "+m.minutes+" min":"")+(m.notes?" · "+esc(m.notes):"")+'</div>'
      +'<div class="ebut"><button class="minibtn" data-me="'+m.id+'">Edit</button>'
      +'<button class="minibtn red" data-md="'+m.id+'">Delete</button></div></div>';
  }).join(""):'<p class="mini" style="margin-top:0">Nothing logged yet.</p>';
  document.querySelectorAll("[data-me]").forEach(b=>b.onclick=()=>startEdit(b.dataset.me));
  document.querySelectorAll("[data-md]").forEach(b=>b.onclick=function(){
    if(!confirm("Delete this logged test?"))return;
    state.mocks=state.mocks.filter(x=>x.id!==b.dataset.md);
    save();renderAll();
  });
}

function renderAll(){
  renderNotice();renderSummary();renderTarget();
  renderCharts();renderSubjects();renderInsights();renderHistory();
}

/* ---------- boot ---------- */
if(needPlan()){
  ensureMK();
  $("hchip").textContent="⚡ "+diffDays(todayStr(),state.cfg.examDate)+" days to exam";
  DEFAULT_SUBJECTS.forEach(s=>{
    const o=document.createElement("option");
    o.value=s[0];o.textContent=s[0];$("mSubj").appendChild(o);
  });
  $("mType").onchange=setType;
  $("mCorrect").oninput=autoScore;
  $("mWrong").oninput=autoScore;
  $("mSaveBtn").onclick=saveEntry;
  $("mCancelEdit").onclick=clearForm;
  clearForm();
  renderAll();
}