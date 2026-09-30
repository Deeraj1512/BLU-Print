"use strict";
/* ============================================================
   aisettings.js — the dedicated AI page.
   Same storage fields as before (state.ai.key/model/provider +
   key2/model2/provider2), so existing saved keys keep working.
   ============================================================ */
(function(){
  if(!state)state={};
  aiNormalize();
  if(!state.ai.model)state.ai.model="";
  if(!state.ai.model2)state.ai.model2="";

  ["aiProv1","aiProv2"].forEach(function(id){
    $(id).innerHTML='<option value="auto">Auto-detect from key</option>'
      +Object.keys(AI_PROVIDERS).map(function(k){
        return '<option value="'+k+'">'+AI_PROVIDERS[k].label+"</option>";}).join("");
  });
  $("aiProv1").value=state.ai.provider||"auto";
  $("aiProv2").value=state.ai.provider2||"auto";
  $("aiKey1").value=state.ai.key||"";
  $("aiModel1").value=state.ai.model||"";
  $("aiKey2").value=state.ai.key2||"";
  $("aiModel2").value=state.ai.model2||"";

  function label(v){return v==="auto"?"Auto-detect":(AI_PROVIDERS[v]?AI_PROVIDERS[v].label:v);}
  function provOf(key,manual){return (manual&&manual!=="auto")?manual:aiDetect((key||"").trim());}
  function summary(){
    const p1=(state.ai.key||"").trim(),p2=(state.ai.key2||"").trim();
    if(!p1&&!p2){
      $("aiSummary").innerHTML='<p class="mini" style="margin-top:0">⚠ No key yet. Get a free key from any provider in the cheat-sheet below, paste it as Primary, then Save.</p>';return;
    }
    let h='<div class="rl"><span class="rk">Primary</span><span class="rv">'
      +(p1?label(provOf(p1,state.ai.provider)):"— not set")+'</span></div>'
      +'<div class="rl"><span class="rk">Backup</span><span class="rv">'
      +(p2?label(provOf(p2,state.ai.provider2)):"none — adding one is recommended")+'</span></div>'
      +'<p class="mini">If the primary is busy, the app retries, then automatically switches to the backup.</p>';
    $("aiSummary").innerHTML=h;
  }
  function provInfo(){
    $("provInfo").innerHTML='<table class="subject-table"><tr><th>Provider</th><th>Key starts with</th><th>Photos</th><th>PDF</th></tr>'
      +Object.keys(AI_PROVIDERS).map(function(k){
        const P=AI_PROVIDERS[k];
        const pre=k==="groq"?"gsk_":k==="github"?"ghp_":k==="openrouter"?"sk-or-":k==="cerebras"?"csk-":k==="gemini"?"AIza":"(pick manually)";
        return '<tr><td>'+P.label+'</td><td>'+pre+'</td><td>'+(P.images?"✅":"—")+'</td><td>'+(P.pdfs?"✅":"—")+'</td></tr>';
      }).join("")+'</table>';
  }
  $("saveBtn").onclick=function(){
    state.ai.key=$("aiKey1").value.trim();
    state.ai.model=$("aiModel1").value.trim();
    state.ai.provider=$("aiProv1").value;
    state.ai.key2=$("aiKey2").value.trim();
    state.ai.model2=$("aiModel2").value.trim();
    state.ai.provider2=$("aiProv2").value;
    save();
    $("aiStatus").textContent="Saved ✅";
    summary();
    $("backLinks").classList.remove("hidden");
  };
  async function testKey(which){
    const key=(which===2?$("aiKey2"):$("aiKey1")).value.trim();
    const model=(which===2?$("aiModel2"):$("aiModel1")).value.trim();
    const prov=which===2?$("aiProv2").value:$("aiProv1").value;
    if(!key){$("aiStatus").textContent="Paste the "+(which===2?"backup":"primary")+" key first.";return;}
    $("aiStatus").textContent="Testing "+(which===2?"backup":"primary")+" key…";
    const bk=state.ai.key,bm=state.ai.model,bp=state.ai.provider;
    state.ai.key=key;state.ai.model=model;state.ai.provider=prov;
    try{
      await aiGenerate([{text:"Reply with just: OK"}],0);
      $("aiStatus").textContent="✅ "+(which===2?"Backup":"Primary")+" key works — provider: "+label(provOf(key,prov));
    }catch(e){$("aiStatus").textContent="⚠ "+(e.message||e);}
    state.ai.key=bk;state.ai.model=bm;state.ai.provider=bp;
  }
  $("test1Btn").onclick=function(){testKey(1);};
  $("test2Btn").onclick=function(){testKey(2);};
  summary();provInfo();
})();