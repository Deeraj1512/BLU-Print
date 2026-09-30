"use strict";
/* ============================================================
   ai.js v2 — Multi-provider AI layer with retry + FAILOVER.
   Provider auto-detected from the key prefix:
     AIza...  → Gemini   gsk_...  → Groq    ghp_/github_pat_ → GitHub
     sk-or-...→ OpenRouter   csk-...→ Cerebras  (no prefix → pick "Mistral" manually)
   Two keys supported: primary busy → backup is tried automatically.
   PDFs only on Gemini. Photos: Gemini/Groq/GitHub/OpenRouter.
   ============================================================ */

const AI_PROVIDERS = {
  gemini: { label: "Google Gemini", defModel: "gemini-2.0-flash", images: true, pdfs: true },
  groq: {
    label: "Groq", defModel: "llama-3.3-70b-versatile",
    visionModel: "meta-llama/llama-4-scout-17b-16e-instruct",
    url: "https://api.groq.com/openai/v1/chat/completions", images: true, pdfs: false
  },
  github: {
    label: "GitHub Models", defModel: "openai/gpt-4o-mini",
    url: "https://models.github.ai/inference/chat/completions", images: true, pdfs: false
  },
  openrouter: {
    label: "OpenRouter", defModel: "google/gemini-2.0-flash-exp:free",
    url: "https://openrouter.ai/api/v1/chat/completions", images: true, pdfs: false
  },
  cerebras: {
    label: "Cerebras", defModel: "llama-3.3-70b",
    url: "https://api.cerebras.ai/v1/chat/completions", images: false, pdfs: false
  },
  mistral: {
    label: "Mistral", defModel: "mistral-small-latest",
    url: "https://api.mistral.ai/v1/chat/completions", images: false, pdfs: false
  }
};
function aiDetect(key) {
  if (/^gsk_/.test(key)) return "groq";
  if (/^(ghp_|gho_|github_pat_)/.test(key)) return "github";
  if (/^sk-or-/.test(key)) return "openrouter";
  if (/^csk-/.test(key)) return "cerebras";
  return "gemini";
}
function aiSleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function aiErr(msg, sw) { const e = new Error(msg); if (sw) e.switch = true; return e; }
function aiNormalize() {
  if (!state.ai) state.ai = {};
  if (!state.ai.provider) state.ai.provider = "auto";
  if (state.ai.key2 === undefined) state.ai.key2 = "";
  if (state.ai.model2 === undefined) state.ai.model2 = "";
  if (!state.ai.provider2) state.ai.provider2 = "auto";
}

async function aiCall(entry, parts, temp) {
  const key = (entry.key || "").trim();
  if (!key) throw aiErr("no key", false);
  const prov = (entry.provider && entry.provider !== "auto") ? entry.provider : aiDetect(key);
  const P = AI_PROVIDERS[prov]; if (!P) throw aiErr("Unknown provider", false);
  let model = (entry.model || "").trim() || P.defModel;
  const hasImage = parts.some(p => p.inlineData && p.inlineData.mimeType.indexOf("image/") === 0);
  const hasPDF = parts.some(p => p.inlineData && p.inlineData.mimeType === "application/pdf");
  if (hasPDF && !P.pdfs) throw aiErr("PDF uploads only work with a Gemini key. With " + P.label + ": paste the text or send photos of the pages instead.", false);
  if (hasImage && !P.images) throw aiErr(P.label + " is text-only (no photos). Switching to the backup key if one is set…", true);
  if (prov !== "gemini" && prov !== "openrouter" && /^gemini/i.test(model)) model = P.defModel;
  if (prov === "groq" && hasImage && model.indexOf("scout") < 0 && model.indexOf("maverick") < 0) model = P.visionModel;
  const T = (temp == null ? 0.4 : temp);

  for (let a = 1; a <= 2; a++) {
    let res = null, d = null, networkFail = false;
    try {
      if (prov === "gemini") {
        res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model
          + ":generateContent?key=" + encodeURIComponent(key), {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: parts }],
            generationConfig: { temperature: T, responseMimeType: "application/json" }
          })
        });
        d = await res.json();
        if (res.ok) return (((d.candidates || [])[0] || { content: { parts: [] } }).content.parts || []).map(p => p.text || "").join("");
      } else {
        const content = parts.map(function (p) {
          if (p.text) return { type: "text", text: p.text };
          return { type: "image_url", image_url: { url: "data:" + p.inlineData.mimeType + ";base64," + p.inlineData.data } };
        });
        res = await fetch(P.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
          body: JSON.stringify({ model: model, messages: [{ role: "user", content: content }], temperature: T })
        });
        d = await res.json();
        if (res.ok) return ((((d.choices || [])[0] || {}).message || {}).content) || "";
      }
    } catch (e) { networkFail = true; }
    if (networkFail) {
      if (a === 2) throw aiErr("Network problem — check the internet connection.", true);
      await aiSleep(2500); continue;
    }
    const msg = (d && d.error && d.error.message) || (d && d.message) || ("API error " + res.status);
    const busy = res && (res.status === 429 || res.status === 500 || res.status === 503);
    if (busy || /overload|busy|unavailable|rate.?limit|capacity|too many/i.test(msg)) {
      if (a === 2) throw aiErr("Servers busy: " + msg, true);
      await aiSleep(2500); continue;
    }
    if (res && (res.status === 401 || res.status === 403)) throw aiErr("Key rejected: " + msg, true);
    throw aiErr(msg, false);
  }
}

async function aiGenerate(parts, temp) {
  aiNormalize();
  const list = [], p1 = (state.ai.key || "").trim(), p2 = (state.ai.key2 || "").trim();
  if (p1) list.push({ key: p1, model: state.ai.model, provider: state.ai.provider });
  if (p2 && p2 !== p1) list.push({ key: p2, model: state.ai.model2, provider: state.ai.provider2 });
  if (!list.length) throw aiErr("No AI key set — Cards page → ⚙️ AI settings.", false);
  let last = null;
  for (let i = 0; i < list.length; i++) {
    try { return await aiCall(list[i], parts, temp); }
    catch (e) { last = e; if (!e.switch) throw e; }
  }
  throw last || aiErr("AI call failed", false);
}