"use strict";
/* ============================================================
   ai.js — Multi-provider AI layer with automatic retry.
   Provider is detected from the API key itself:
     AIza...            → Google Gemini
     gsk_...            → Groq
     ghp_ / github_pat_ → GitHub Models
     sk-or-...          → OpenRouter
   Text + photos work everywhere. PDFs only on Gemini.
   Busy/rate-limited calls retry up to 3 times automatically.
   ============================================================ */

const AI_PROVIDERS = {
  gemini:     { defModel:"gemini-2.0-flash" },
  groq:       { defModel:"llama-3.3-70b-versatile",
                visionModel:"meta-llama/llama-4-scout-17b-16e-instruct",
                url:"https://api.groq.com/openai/v1/chat/completions" },
  github:     { defModel:"openai/gpt-4o-mini",
                url:"https://models.github.ai/inference/chat/completions" },
  openrouter: { defModel:"google/gemini-2.0-flash-exp:free",
                url:"https://openrouter.ai/api/v1/chat/completions" }
};
function aiDetect(key){
  if(/^gsk_/.test(key))return"groq";
  if(/^(ghp_|gho_|github_pat_)/.test(key))return"github";
  if(/^sk-or-/.test(key))return"openrouter";
  return"gemini";
}
function aiSleep(ms){return new Promise(function(r){setTimeout(r,ms);});}

async function aiGenerate(parts,temp){
  const key=((state.ai&&state.ai.key)||"").trim();
  if(!key)throw new Error("No AI key set — Cards page → ⚙️ AI settings.");
  const prov=aiDetect(key),P=AI_PROVIDERS[prov];
  let model=((state.ai&&state.ai.model)||"").trim()||P.defModel;
  const T=(temp==null?0.4:temp);
  const hasImage=parts.some(p=>p.inlineData&&p.inlineData.mimeType.indexOf("image/")===0);
  const hasPDF=parts.some(p=>p.inlineData&&p.inlineData.mimeType==="application/pdf");

  if(prov!=="gemini"&&hasPDF)
    throw new Error("PDF uploads only work with a Gemini key. With this provider: paste the text, or send photos of the pages.");
  if(prov!=="gemini"&&/^gemini/i.test(model))model=P.defModel;   /* old Gemini model name saved → use this provider's default */
  if(prov==="groq"&&hasImage&&model.indexOf("scout")<0&&model.indexOf("maverick")<0)model=P.visionModel;

  if(prov==="gemini"){
    const url="https://generativelanguage.googleapis.com/v1beta/models/"+model
      +":generateContent?key="+encodeURIComponent(key);
    for(let a=1;a<=3;a++){
      let res=null,d=null;
      try{
        res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({contents:[{role:"user",parts:parts}],
            generationConfig:{temperature:T,responseMimeType:"application/json"}})});
        d=await res.json();
      }catch(e){}
      if(res&&res.ok)
        return (((d.candidates||[])[0]||{content:{parts:[]}}).content.parts||[]).map(p=>p.text||"").join("");
      const msg=(d&&d.error&&d.error.message)||"Network error";
      const busy=(res&&(res.status===429||res.status===500||res.status===503))||/overload|busy|unavailable|rate/i.test(msg);
      if(!busy||a===3)
        throw new Error(busy?"Google's servers are overloaded right now. Try again in a few minutes — or paste a free Groq/GitHub key in AI settings (works instantly).":msg);
      await aiSleep(3000*a);
    }
  }

  /* OpenAI-compatible providers (Groq / GitHub Models / OpenRouter) */
  const content=parts.map(function(p){
    if(p.text)return{type:"text",text:p.text};
    return{type:"image_url",image_url:{url:"data:"+p.inlineData.mimeType+";base64,"+p.inlineData.data}};
  });
  for(let a=1;a<=3;a++){
    let res=null,d=null;
    try{
      res=await fetch(P.url,{method:"POST",
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},
        body:JSON.stringify({model:model,messages:[{role:"user",content:content}],temperature:T})});
      d=await res.json();
    }catch(e){}
    if(res&&res.ok)return((((d.choices||[])[0]||{}).message||{}).content)||"";
    const msg=(d&&d.error&&d.error.message)||(d&&d.message)||"Network error";
    const busy=res&&(res.status===429||res.status===503);
    if(!busy||a===3)throw new Error(msg);
    await aiSleep(3000*a);
  }
}