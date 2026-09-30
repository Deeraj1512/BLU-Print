"use strict";
/* ============================================================
   flashcards.js — Module 3.
   Import notes -> AI generates -> verify -> spaced repetition.
   Data stored in:
     state.cards  = all flashcards
     state.ai     = { key, model }  (Gemini API settings)
   ============================================================ */

/* ---------- tiny local helpers ---------- */
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function ivLabel(d) { if (d <= 0) return "today"; if (d === 1) return "1 day"; if (d < 30) return d + " days"; if (d < 360) return Math.round(d / 30) + " mo"; return "1 yr"; }

function ensureFC() {
  if (!state.cards) state.cards = [];
  if (!state.ai) state.ai = { key: "", model: "gemini-2.0-flash" };
}

/* ---------- scheduling (simplified SM-2) ----------
   iv    = current interval in days (0 = new/learning)
   ease  = how fast the interval grows (1.3 – 2.8)          */
function clampE(e) { return Math.min(2.8, Math.max(1.3, e)); }
function nextIv(card, r) {
  const iv = card.iv || 0, e = card.ease || 2.5;
  if (r === 0) return 0;
  if (iv < 1) return r === 1 ? 1 : r === 2 ? 2 : 3;
  if (r === 1) return Math.max(1, Math.round(iv * 1.2));
  if (r === 2) return Math.round(iv * e);
  return Math.round(iv * e * 1.3);
}
function rateCard(card, r) {
  const e = card.ease || 2.5;
  if (r === 0) { card.ease = clampE(e - 0.2); card.iv = 0; card.lapses = (card.lapses || 0) + 1; }
  else { card.ease = clampE(e + (r === 3 ? 0.15 : r === 1 ? -0.15 : 0)); card.iv = Math.min(365, nextIv(card, r)); }
  card.due = addDays(todayStr(), card.iv);
  card.seen = (card.seen || 0) + 1;
}

/* weak subjects first (reads the weakness set in Edit Plan) */
function weakOf(subj) {
  const s = ((state.cfg && state.cfg.subjects) || []).find(x => x.name === subj);
  return s ? s.weak : 1;
}
function dueCards(subjFilter) {
  const t = todayStr();
  return state.cards
    .filter(c => c.due <= t && (!subjFilter || c.subj === subjFilter))
    .sort((a, b) => weakOf(b.subj) - weakOf(a.subj) || (a.due < b.due ? -1 : a.due > b.due ? 1 : 0) || (a.iv || 0) - (b.iv || 0));
}

/* ---------- review session ---------- */
let Q = [], Qi = 0, flipped = false, sessionStats = null;
function startStudy(filter) {
  const all = dueCards(filter);
  if (!all.length) { alert("Nothing due" + (filter ? " in " + filter : "") + " right now 🎉"); return; }
  Q = all.slice(0, 80); Qi = 0; flipped = false;
  sessionStats = { total: 0, again: 0 };
  $("fcMain").classList.add("hidden");
  $("review").classList.remove("hidden");
  showCard();
}
function showCard() {
  flipped = false;
  const c = Q[Qi];
  $("rvSubj").textContent = c.subj + (c.topic ? " · " + c.topic : "");
  $("rvCount").textContent = (Qi + 1) + " / " + Q.length;
  $("rvBar").style.width = Math.round(Qi / Q.length * 100) + "%";
  $("rvImg").innerHTML = c.img ? '<img src="' + c.img + '" alt="card image">' : "";
  $("rvFront").textContent = c.front || "(look at the image)";
  $("rvBack").textContent = c.back;
  $("rvBack").classList.add("hidden");
  $("rvFront").classList.remove("hidden");
  $("flipBtn").classList.remove("hidden");
  $("rateRow").classList.add("hidden");
  $("rvDone").classList.add("hidden");
}
function doFlip() {
  if (!Q.length || Qi >= Q.length) return;
  flipped = true;
  $("rvFront").classList.add("hidden");
  $("rvBack").classList.remove("hidden");
  $("flipBtn").classList.add("hidden");
  const c = Q[Qi], row = $("rateRow"), labels = ["Again", "Hard", "Good", "Easy"];
  row.classList.remove("hidden");
  row.querySelectorAll(".rate").forEach((b, i) => {
    b.innerHTML = labels[i] + "<small>" + ivLabel(nextIv(c, i)) + "</small>";
  });
}
function answer(r) {
  const c = Q[Qi];
  rateCard(c, r);
  /* weekly-report log: one small aggregate entry per day */
  const rl = state.reviewLog = state.reviewLog || {};
  const rd = todayStr();
  rl[rd] = rl[rd] || { n: 0, again: 0 };
  rl[rd].n++; if (r === 0) rl[rd].again++;
  save();
  sessionStats.total++; if (r === 0) sessionStats.again++;
  if (r === 0) Q.push(c);          /* forgotten card returns later in this session */
  Qi++;
  if (Qi >= Q.length) finishStudy(); else showCard();
}
function finishStudy() {
  $("rvBar").style.width = Math.round(Qi / Math.max(Q.length, 1) * 100) + "%";
  $("rvFront").classList.add("hidden"); $("rvBack").classList.add("hidden");
  $("flipBtn").classList.add("hidden"); $("rateRow").classList.add("hidden");
  const acc = sessionStats.total ? Math.round((sessionStats.total - sessionStats.again) / sessionStats.total * 100) : 0;
  $("rvDone").innerHTML = '<h2>🎉 Session done!</h2>'
    + '<p class="mini">' + sessionStats.total + ' reviews · ' + sessionStats.again + ' to relearn · ' + acc + '% recalled</p>'
    + '<p class="mini">Cards you tapped "Again" will come back; the rest are scheduled into future days automatically.</p>'
    + '<button class="btn" id="rvBackBtn">Back to Cards</button>';
  $("rvDone").classList.remove("hidden");
  $("rvBackBtn").onclick = closeReview;
}
function closeReview() {
  $("review").classList.add("hidden");
  $("fcMain").classList.remove("hidden");
  Q = []; renderAll();
}

/* ---------- AI generation ---------- */
const PROMPT_HEAD = 'You are an expert tutor preparing a doctor for the NEET PG exam (India). From the study material, create high-yield flashcards. Rules: front = precise question/cue, back = short self-contained answer; target drug of choice, most common cause, classic features, investigations, classifications, important numbers, imaging and instrument findings; include a mnemonic card where helpful; max ~35 words per side; no card depends on another; base cards ONLY on the actual content of the material. Return ONLY a JSON array of objects with keys "front" and "back".';
let proposed = [], propSubj = "", propTopic = "";

function abToB64(buf) {
  const bytes = new Uint8Array(buf); let bin = ""; const CH = 0x8000;
  for (let i = 0; i < bytes.length; i += CH)bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
  return btoa(bin);
}
function compressImage(file, maxDim, q) {
  return new Promise(function (res, rej) {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = function () {
      const sc = Math.min(1, maxDim / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL("image/jpeg", q));
    };
    img.onerror = rej; img.src = url;
  });
}
function parseCardList(txt) {
  let s = String(txt).trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const a = s.indexOf("["), b = s.lastIndexOf("]");
  if (a < 0 || b <= a) return [];
  let arr; try { arr = JSON.parse(s.slice(a, b + 1)); } catch (e) { return []; }
  return arr.filter(c => c && (c.front || c.question) && (c.back || c.answer))
    .map(c => ({ front: String(c.front || c.question).trim(), back: String(c.back || c.answer).trim(), accept: true }));
}

async function doGenerate() {
  if (!state.ai.key) {
    alert("Add your free Gemini API key first — ⚙️ AI settings at the bottom of this page.");
    $("aiDet").open = true; return;
  }
  const subj = $("gSubj").value, topic = $("gTopic").value.trim(), n = +$("gCount").value;
  const f = $("gFile").files[0], typed = $("gText").value.trim();
  if (!f && !typed) { alert("Paste notes text OR choose a file first."); return; }
  $("genBtn").disabled = true;
  $("genStatus").innerHTML = '<span class="spin">⏳</span> Reading the notes and writing cards… (10–30 s)';
  try {
    const parts = []; let mediaNote = "", textMat = typed;
    if (f) {
      if (f.size > 12 * 1024 * 1024) throw new Error("File too big (max ~12 MB). Split the PDF or use a smaller photo.");
      if (f.type && f.type.indexOf("image/") === 0) {
        const du = await compressImage(f, 1024, 0.8);
        mediaNote = " The attached image is a photo of study notes — read it carefully (printed or neat handwriting) and make cards only from its real content.";
        parts.push({ inlineData: { mimeType: "image/jpeg", data: du.split(",")[1] } });
      } else if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
        mediaNote = " The attached PDF contains the study notes.";
        parts.push({ inlineData: { mimeType: "application/pdf", data: abToB64(await f.arrayBuffer()) } });
      } else if (/\.(txt|md)$/i.test(f.name) || (f.type || "").indexOf("text/") === 0) {
        textMat = (typed ? typed + "\n\n" : "") + await f.text();
      } else throw new Error("Unsupported file type. Use a photo, PDF or .txt — or paste the text.");
    }
    if (!mediaNote && !textMat) throw new Error("No material found — paste text or pick a file.");
    parts.unshift({
      text: PROMPT_HEAD + mediaNote + "\nCreate exactly " + n + " flashcards."
        + (topic ? " Topic focus: " + topic + "." : "")
        + (textMat ? "\n\nNOTES MATERIAL:\n" + textMat.slice(0, 150000) : "")
    });

    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/"
      + (state.ai.model || "gemini-2.0-flash") + ":generateContent?key=" + encodeURIComponent(state.ai.key), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: parts }],
        generationConfig: { temperature: 0.4, responseMimeType: "application/json" }
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error((data.error && data.error.message) || ("API error " + res.status));
    const txt = (((data.candidates || [])[0] || { content: { parts: [] } }).content.parts || []).map(p => p.text || "").join("");
    proposed = parseCardList(txt).slice(0, 40);
    if (!proposed.length) throw new Error("The AI returned no usable cards. Raw reply: " + txt.slice(0, 180));
    propSubj = subj; propTopic = topic;
    renderVerify();
    $("genStatus").textContent = "Done! " + proposed.length + " cards proposed — review them below. ✅";
    $("verifyCard").scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    let m = err.message || String(err);
    if (m.indexOf("Failed to fetch") >= 0) m = "Network problem — check the internet connection and try again.";
    $("genStatus").textContent = "⚠ " + m;
  }
  $("genBtn").disabled = false;
}

/* ---------- verify screen ---------- */
function renderVerify() {
  const n = proposed.filter(p => p.accept).length;
  $("verifyHead").textContent = n + " of " + proposed.length + " accepted — fix wording if needed, then add.";
  $("verifyCard").classList.remove("hidden");
  $("verifyList").innerHTML = proposed.map((p, i) =>
    '<div class="vcard' + (p.accept ? "" : " off") + '">'
    + '<textarea data-f="' + i + '">' + esc(p.front) + '</textarea>'
    + '<textarea data-b="' + i + '">' + esc(p.back) + '</textarea>'
    + '<div class="vrow"><button class="vbtn vyes" data-y="' + i + '">✔ Keep</button>'
    + '<button class="vbtn vno" data-n="' + i + '">✘ Drop</button></div></div>').join("");
  document.querySelectorAll('#verifyList textarea[data-f]').forEach(t => t.oninput = () => { proposed[+t.dataset.f].front = t.value; });
  document.querySelectorAll('#verifyList textarea[data-b]').forEach(t => t.oninput = () => { proposed[+t.dataset.b].back = t.value; });
  document.querySelectorAll('#verifyList [data-y]').forEach(b => b.onclick = () => { proposed[+b.dataset.y].accept = true; renderVerify(); });
  document.querySelectorAll('#verifyList [data-n]').forEach(b => b.onclick = () => { proposed[+b.dataset.n].accept = false; renderVerify(); });
}
function addAccepted() {
  const t = todayStr();
  const add = proposed.filter(p => p.accept && p.front && p.back);
  add.forEach(p => state.cards.push({
    id: uid(), subj: propSubj, topic: propTopic, front: p.front, back: p.back,
    img: "", ease: 2.5, iv: 0, due: t, lapses: 0, seen: 0, created: Date.now()
  }));
  save();
  proposed = []; $("verifyCard").classList.add("hidden");
  $("gText").value = ""; $("gFile").value = ""; $("gFileNote").textContent = "";
  $("genStatus").textContent = "Added " + add.length + " cards ✅ They are due now — tap Study.";
  renderAll();
}

/* ---------- manual / image cards ---------- */
let mImgData = "";
async function mImgPicked() {
  const f = $("mImg").files[0]; if (!f) return;
  try { mImgData = await compressImage(f, 640, 0.72); $("fcImgPrev").innerHTML = '<img src="' + mImgData + '">'; }
  catch (e) { alert("Could not read that image."); }
}
function saveManual() {
  const front = $("mFront").value.trim(), back = $("mBack").value.trim();
  if (!front && !mImgData) { alert("Add a question (or an image) on the front."); return; }
  if (!back) { alert("Add the answer on the back."); return; }
  state.cards.push({
    id: uid(), subj: $("mSubj").value, topic: $("mTopic").value.trim(), front: front, back: back,
    img: mImgData, ease: 2.5, iv: 0, due: todayStr(), lapses: 0, seen: 0, created: Date.now()
  });
  save();
  $("mFront").value = ""; $("mBack").value = ""; $("mTopic").value = ""; $("mImg").value = "";
  mImgData = ""; $("fcImgPrev").innerHTML = "";
  renderAll(); alert("Card saved ✅");
}

/* ---------- browse & edit ---------- */
let editingId = null;
function renderBrowse() {
  $("colCount").textContent = state.cards.length;
  const q = $("bSearch").value.toLowerCase(), sf = $("bSubj").value;
  const list = state.cards
    .filter(c => (!sf || c.subj === sf) && (!q || ((c.front + " " + c.back + " " + (c.topic || "")).toLowerCase().indexOf(q) >= 0)))
    .slice(0, 100);
  $("browseList").innerHTML = list.length ? list.map(function (c) {
    if (c.id === editingId) return '<div class="brow">'
      + '<textarea id="eF" rows="2" style="width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;background:#fafbff">' + esc(c.front) + '</textarea>'
      + '<textarea id="eB" rows="2" style="width:100%;padding:9px;border:1px solid var(--line);border-radius:8px;background:#fafbff;margin-top:4px">' + esc(c.back) + '</textarea>'
      + '<div class="bm"><button class="minibtn" data-save="' + c.id + '">💾 Save</button><button class="minibtn" data-cancel="1">Cancel</button></div></div>';
    return '<div class="brow"><div class="bf">' + esc(c.front || "(image card)") + '</div><div class="bb">' + esc(c.back) + '</div>'
      + (c.img ? '<img src="' + c.img + '" style="max-width:110px;border-radius:8px;margin-top:4px;display:block">' : "")
      + '<div class="bm"><span>' + esc(c.subj) + (c.topic ? " · " + esc(c.topic) : "") + '</span><span>due ' + c.due + '</span>'
      + '<button class="minibtn" data-edit="' + c.id + '">Edit</button>'
      + '<button class="minibtn red" data-del="' + c.id + '">Delete</button></div></div>';
  }).join("") : '<p class="mini">No cards match.</p>';

  document.querySelectorAll('#browseList [data-edit]').forEach(b => b.onclick = () => { editingId = b.dataset.edit; renderBrowse(); });
  document.querySelectorAll('#browseList [data-cancel]').forEach(b => b.onclick = () => { editingId = null; renderBrowse(); });
  document.querySelectorAll('#browseList [data-save]').forEach(b => b.onclick = function () {
    const c = state.cards.find(x => x.id === b.dataset.save);
    if (c) { c.front = $("eF").value; c.back = $("eB").value; save(); }
    editingId = null; renderAll();
  });
  document.querySelectorAll('#browseList [data-del]').forEach(b => b.onclick = function () {
    if (!confirm("Delete this card forever?")) return;
    state.cards = state.cards.filter(x => x.id !== b.dataset.del);
    save(); renderAll();
  });
}

/* ---------- overview ---------- */
function renderOverview() {
  const t = todayStr();
  const due = state.cards.filter(c => c.due <= t);
  const fresh = state.cards.filter(c => !c.seen).length;
  let html = '<div class="stat">'
    + '<div class="card"><b>' + due.length + '</b><span>due now</span></div>'
    + '<div class="card"><b>' + fresh + '</b><span>not seen yet</span></div>'
    + '<div class="card"><b>' + state.cards.length + '</b><span>collection</span></div></div>';
  if (!state.cards.length) {
    html += '<div class="card"><h2>👋 Start her collection</h2><p class="mini">Import the professor\'s latest notes above → AI makes the cards → she verifies them (first revision!) → then "Study". Surgery first, as decided. 💪</p></div>';
  } else {
    html += '<button class="btn" id="studyAllBtn">▶ Study now (' + due.length + ' due)</button>';
    const groups = {};
    due.forEach(c => { groups[c.subj] = (groups[c.subj] || 0) + 1; });
    const chips = Object.keys(groups).sort((a, b) => weakOf(b) - weakOf(a)).map(s =>
      '<span class="fc-chip">' + esc(s) + ' · ' + groups[s] + ' <button data-study="' + esc(s) + '">▶</button></span>').join("");
    if (chips) html += '<div class="card"><h2>🎯 By subject (weak first)</h2>' + chips
      + '<p class="mini">The daily drill: clear Surgery\'s cards every day, even on a busy day.</p></div>';
  }
  $("overview").innerHTML = html;
  const sb = $("studyAllBtn"); if (sb) sb.onclick = () => startStudy(null);
  document.querySelectorAll("#overview [data-study]").forEach(b => b.onclick = () => startStudy(b.dataset.study));
  $("hchip").textContent = due.length ? ("🃏 " + due.length + " due") : "🃏 all caught up";
}
function renderAll() { renderOverview(); renderBrowse(); renderStoreInfo(); }
function renderStoreInfo() {
  const kb = Math.round((localStorage.getItem(APP_KEY) || "").length / 1024);
  $("storeInfo").textContent = "Storage used: ~" + kb + " KB of ~5000 KB (image cards use the most).";
}

/* ---------- AI settings ---------- */
function aiSave() {
  state.ai.key = $("aiKey").value.trim();
  state.ai.model = $("aiModel").value.trim() || "gemini-2.0-flash";
  save(); $("aiStatus").textContent = "Saved ✅"; renderStoreInfo();
}
async function aiTest() {
  const k = $("aiKey").value.trim(), m = $("aiModel").value.trim() || "gemini-2.0-flash";
  if (!k) { $("aiStatus").textContent = "Paste the key first."; return; }
  $("aiStatus").textContent = "Testing…";
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + m + ":generateContent?key=" + encodeURIComponent(k), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Reply with just: OK" }] }] })
    });
    const d = await res.json();
    $("aiStatus").textContent = res.ok ? "Key works ✅" : "⚠ " + ((d.error && d.error.message) || ("error " + res.status));
  } catch (e) { $("aiStatus").textContent = "⚠ Network error."; }
}

/* ---------- boot ---------- */
if (needPlan()) {
  ensureFC();
  DEFAULT_SUBJECTS.forEach(function (s) {
    ["gSubj", "mSubj"].forEach(function (id) {
      const o = document.createElement("option"); o.value = s[0]; o.textContent = s[0]; $(id).appendChild(o);
    });
    const ob = document.createElement("option"); ob.value = s[0]; ob.textContent = s[0]; $("bSubj").appendChild(ob);
  });
  $("aiKey").value = state.ai.key;
  $("aiModel").value = state.ai.model;
  $("gSubj").value = "Surgery";   /* the daily priority, pre-selected */
  $("mSubj").value = "Surgery";

  $("genBtn").onclick = doGenerate;
  $("gFile").onchange = () => { const f = $("gFile").files[0]; $("gFileNote").textContent = f ? ("Selected: " + f.name) : ""; };
  $("allYes").onclick = () => { proposed.forEach(p => p.accept = true); renderVerify(); };
  $("allNo").onclick = () => { proposed.forEach(p => p.accept = false); renderVerify(); };
  $("addBtn").onclick = addAccepted;
  $("mImg").onchange = mImgPicked;
  $("mSave").onclick = saveManual;
  $("bSearch").oninput = renderBrowse;
  $("bSubj").onchange = renderBrowse;
  $("aiSave").onclick = aiSave;
  $("aiTest").onclick = aiTest;
  $("flipBtn").onclick = doFlip;
  $("quitBtn").onclick = finishStudy;
  document.querySelectorAll("#rateRow .rate").forEach(b => b.onclick = () => answer(+b.dataset.r));

  /* keyboard: Space/Enter = flip, 1–4 = rate */
  document.addEventListener("keydown", function (e) {
    if ($("review").classList.contains("hidden")) return;
    if (!flipped && (e.code === "Space" || e.code === "Enter")) { e.preventDefault(); doFlip(); }
    else if (flipped && /^Digit[1-4]$/.test(e.code)) { answer(+e.code.slice(4) - 1); }
  });

  renderAll();
}