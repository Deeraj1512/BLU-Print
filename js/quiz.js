"use strict";
/* ============================================================
   quiz.js — Module 4: Quiz Engine.
   AI generates NEET PG-style MCQs (topic-based or from notes),
   practice/test modes, +4/-1 scoring, results -> Error Lab data.
   Data: state.quizzes (summaries), state.activeQuiz (resume),
         state.errors is created here too (shared with errors.js)
   ============================================================ */

const SECS_PER_Q = 60;               /* test mode: seconds per question (NEET pace) */
const REASON_LABELS = { concept: "🧠 Didn't know", forgot: "🌫 Forgot", silly: "🤦 Silly", misread: "👀 Misread" };

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function fmtSec(ms) { const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60; return h > 0 ? h + ":" + pad(m) + ":" + pad(ss) : pad(m) + ":" + pad(ss); }
function ensureQZ() {
  if (!state.quizzes) state.quizzes = [];
  if (!state.errors) state.errors = [];
  if (!state.cards) state.cards = [];
  if (!state.ai) state.ai = { key: "", model: "gemini-2.0-flash" };
}
function weakNum(subj) { const s = ((state.cfg && state.cfg.subjects) || []).find(x => x.name === subj); return s ? s.weak : 1; }
function weakestSubj() {
  const on = (state.cfg.subjects || []).filter(s => s.on);
  return on.slice().sort((a, b) => b.weak - a.weak || b.size - a.size)[0].name;
}

/* ---------- AI plumbing (same pattern as flashcards.js) ---------- */
const PROMPT_HEAD = 'You are an expert NEET PG (India) exam coach writing practice MCQs. Style: single best answer with exactly 4 options; ~60% short clinical vignettes, ~40% direct high-yield fact questions; distractors plausible and of the same category. Rules: each question self-contained; no repeated facts within the set; correct answer unambiguous and a well-established, stable fact (avoid controversial/evolving management); explanation 2-3 sentences; "point" = one-line high-yield takeaway. Return ONLY a JSON array of objects with keys "q", "options" (4 strings), "answer" (0-based index of the correct option), "explanation", "point".';
function abToB64(buf) { const b = new Uint8Array(buf); let s = ""; const CH = 0x8000; for (let i = 0; i < b.length; i += CH)s += String.fromCharCode.apply(null, b.subarray(i, i + CH)); return btoa(s); }
function compressImage(file, maxDim, q) { return new Promise(function (res, rej) { const img = new Image(), url = URL.createObjectURL(file); img.onload = function () { const sc = Math.min(1, maxDim / Math.max(img.width, img.height)); const c = document.createElement("canvas"); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", q)); }; img.onerror = rej; img.src = url; }); }
function parseMCQs(txt) {
  let s = String(txt).trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const a = s.indexOf("["), b = s.lastIndexOf("]"); if (a < 0 || b <= a) return [];
  let arr; try { arr = JSON.parse(s.slice(a, b + 1)); } catch (e) { return []; }
  const seen = {}; const out = [];
  arr.forEach(m => {
    if (!m || !m.q || !Array.isArray(m.options) || m.options.length !== 4) return;
    if (!(m.answer >= 0 && m.answer <= 3)) return;
    const key = String(m.q).toLowerCase().replace(/\W+/g, "").slice(0, 80);
    if (seen[key]) return; seen[key] = 1;
    /* shuffle options so the answer isn't always in the same position */
    const idx = [0, 1, 2, 3]; for (let i = 3; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    out.push({
      q: String(m.q).trim(), options: idx.map(k => String(m.options[k]).trim()),
      answer: idx.indexOf(m.answer), explanation: String(m.explanation || "").trim(), point: String(m.point || "").trim()
    });
  });
  return out;
}
async function callAI(parts) {
  return aiGenerate(parts, 0.35);
}
async function buildParts(subj, topic, n, notesText, file) {
  const parts = []; let mediaNote = "", textMat = notesText || "";
  if (file) {
    if (file.size > 12 * 1024 * 1024) throw new Error("File too big (max ~12 MB).");
    if (file.type && file.type.indexOf("image/") === 0) {
      mediaNote = " The attached image is a photo of study notes — write questions ONLY from its real content.";
      parts.push({ inlineData: { mimeType: "image/jpeg", data: (await compressImage(file, 1024, 0.8)).split(",")[1] } });
    } else if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
      mediaNote = " The attached PDF contains the study notes — write questions ONLY from its real content.";
      parts.push({ inlineData: { mimeType: "application/pdf", data: abToB64(await file.arrayBuffer()) } });
    } else if (/\.(txt|md)$/i.test(file.name) || (file.type || "").indexOf("text/") === 0) {
      textMat = (textMat ? textMat + "\n\n" : "") + await file.text();
    } else throw new Error("Unsupported file. Use photo, PDF or .txt — or paste text.");
  }
  parts.unshift({
    text: PROMPT_HEAD + mediaNote
      + "\nSubject: " + subj + ". Topic focus: " + (topic || "whole syllabus, mixed high-yield topics") + "."
      + "\nCreate exactly " + n + " questions. Mix difficulty: ~30% easy recall, 50% standard, 20% tricky."
      + "\nVariation seed: " + Math.random().toString(36).slice(2, 8)
      + (textMat ? "\n\nNOTES MATERIAL (base questions on this):\n" + textMat.slice(0, 150000) : "")
  });
  return parts;
}

/* ---------- start a quiz ---------- */
function startQuiz(subj, topic, mode, questions) {
  if (!questions.length) throw new Error("No usable questions came back.");
  const qz = {
    id: uid(), subj: subj, topic: topic, mode: mode, created: Date.now(), startedAt: Date.now(),
    questions: questions, answers: questions.map(() => null), idx: 0, done: false,
    endsAt: mode === "test" ? Date.now() + questions.length * SECS_PER_Q * 1000 : null
  };
  state.activeQuiz = qz; save();
  openScreen();
}
async function generate(src) {
  const pre = src === "drill" ? $("dStatus") : $("nStatus");
  if (!state.ai.key) { alert("Add your free Gemini API key first — Cards page → ⚙️ AI settings."); location.href = "flashcards.html"; return; }
  try {
    let subj, topic, mode, n, notes = "", file = null;
    if (src === "drill") {
      subj = $("dSubj").value; topic = $("dTopic").value; mode = $("dMode").value; n = +$("dCount").value;
    } else {
      subj = $("nSubj").value; topic = $("nTopic").value.trim(); mode = $("nMode").value; n = +$("nCount").value;
      notes = $("nText").value.trim(); file = $("nFile").files[0];
      if (!file && !notes) { alert("Paste notes text OR choose a file first."); return; }
    }
    pre.innerHTML = '<span class="spin">⏳</span> Writing ' + n + ' questions… (15–40 s)';
    const txt = await callAI(await buildParts(subj, topic, n, notes, file));
    const qs = parseMCQs(txt);
    if (!qs.length) throw new Error("No usable questions in the AI reply. Try again.");
    pre.textContent = "Ready — " + qs.length + " questions. 🚀";
    startQuiz(subj, topic, mode, qs);
  } catch (err) {
    let m = err.message || String(err);
    if (m.indexOf("Failed to fetch") >= 0) m = "Network problem — check the internet and retry.";
    pre.textContent = "⚠ " + m;
  }
}

/* ---------- quiz screen ---------- */
let T = null;
function openScreen() {
  $("qzMain").classList.add("hidden"); $("qzResults").classList.add("hidden");
  $("qzScreen").classList.remove("hidden");
  const q = state.activeQuiz;
  $("qzTitle").textContent = q.subj + (q.topic ? " · " + q.topic : " · mixed");
  $("qzSub").textContent = q.mode === "test" ? "TEST · +4/−1" : "PRACTICE";
  if (T) clearInterval(T);
  T = setInterval(tick, 500); tick();
  renderQ();
}
function tick() {
  const q = state.activeQuiz; if (!q) return;
  if (q.mode === "test") {
    const rem = q.endsAt - Date.now();
    $("qzTimer").textContent = "⏱ " + fmtSec(rem);
    $("qzTimer").classList.toggle("urgent", rem < 60000);
    if (rem <= 0) finishQuiz(true);
  } else {
    $("qzTimer").textContent = "⏱ " + fmtSec(Date.now() - q.startedAt);
  }
  const ansN = q.answers.filter(a => a !== null).length;
  $("qzScore").textContent = q.mode === "test" ? ("✍ " + ansN + "/" + q.questions.length) : ("⭐ +" + scoreOf(q));
}
function scoreOf(q) { let c = 0, w = 0; q.answers.forEach((a, i) => { if (a === q.questions[i].answer) c++; else if (a !== null) w++; }); return c * 4 - w; }
function renderQ() {
  const q = state.activeQuiz; if (!q) return;
  const i = q.idx, qu = q.questions[i];
  $("qzNum").textContent = "Question " + (i + 1) + " of " + q.questions.length + (q.mode === "practice" && q.answers[i] !== null ? " · answered" : "");
  $("qzQ").textContent = qu.q;
  $("qzBar").style.width = Math.round(i / q.questions.length * 100) + "%";
  const box = $("qzOpts"); box.innerHTML = "";
  const answered = q.answers[i];
  qu.options.forEach(function (op, oi) {
    const b = document.createElement("button"); b.className = "opt"; b.textContent = String.fromCharCode(65 + oi) + ".  " + op;
    if (q.mode === "practice") {
      if (answered !== null) {
        b.disabled = true;
        if (oi === qu.answer) b.classList.add("good");
        else if (oi === answered) b.classList.add("bad");
      } else b.onclick = function () { q.answers[i] = oi; save(); renderQ(); tick(); };
    } else {
      if (answered === oi) b.classList.add("sel");
      b.onclick = function () { q.answers[i] = oi; save(); renderQ(); tick(); };
    }
    box.appendChild(b);
  });
  /* practice: explanation right after answering */
  const ex = $("qzExpl");
  if (q.mode === "practice" && answered !== null) {
    const right = answered === qu.answer;
    ex.innerHTML = '<div class="exhead">' + (right ? "✅ Correct! (+4)" : "❌ Wrong — correct answer: "
      + String.fromCharCode(65 + qu.answer) + ". " + esc(qu.options[qu.answer])) + '</div>'
      + '<p class="expt">' + esc(qu.explanation) + '</p>' + (qu.point ? '<p class="exp">💡 ' + esc(qu.point) + '</p>' : "");
    ex.classList.remove("hidden");
  } else ex.classList.add("hidden");
  /* footer buttons */
  $("prevBtn").style.visibility = q.mode === "test" && i > 0 ? "visible" : "hidden";
  $("nextBtn").style.visibility = q.mode === "test" && i < q.questions.length - 1 ? "visible" : "hidden";
  $("submitBtn").classList.toggle("hidden", q.mode !== "test");
  renderPalette();
}
function renderPalette() {
  const q = state.activeQuiz, pal = $("palette");
  if (q.mode !== "test") { pal.classList.add("hidden"); $("palBtn").style.display = "none"; return; }
  $("palBtn").style.display = "";
  if (pal.classList.contains("hidden")) return;
  pal.innerHTML = q.questions.map((_, i) => {
    const cls = q.answers[i] !== null ? "pa ans" : "pa" + (i === q.idx ? " cur" : "");
    return '<button class="' + cls + '" data-p="' + i + '">' + (i + 1) + '</button>';
  }).join("");
  pal.querySelectorAll("[data-p]").forEach(b => b.onclick = function () { state.activeQuiz.idx = +b.dataset.p; save(); renderQ(); });
}

/* ---------- finish & results ---------- */
function finishQuiz(auto) {
  const q = state.activeQuiz; if (!q) return;
  if (!auto && q.mode === "test" && !confirm("Submit the test and see results?")) return;
  if (T) { clearInterval(T); T = null; }
  let c = 0, w = 0, s = 0;
  q.answers.forEach((a, i) => { if (a === q.questions[i].answer) c++; else if (a !== null) w++; else s++; });
  const score = c * 4 - w;
  state.quizzes.push({
    date: todayStr(), subj: q.subj, topic: q.topic, mode: q.mode, total: q.questions.length,
    correct: c, wrong: w, skipped: s, score: score, pct: Math.round(c / Math.max(1, c + w) * 100)
  });
  if (state.quizzes.length > 50) state.quizzes = state.quizzes.slice(-50);
  q.done = true; save();                      /* keep questions for the results view */
  showResults(q, { correct: c, wrong: w, skipped: s, score: score }); wireResults(q);
  state.activeQuiz = null; save();
}
function showResults(q, tot) {
  $("qzScreen").classList.add("hidden");
  $("qzMain").classList.add("hidden");
  $("qzResults").classList.remove("hidden");
  const max = q.questions.length * 4;
  $("resSummary").innerHTML = '<div class="stat">'
    + '<div class="card"><b>' + tot.score + '</b><span>score (max ' + max + ')</span></div>'
    + '<div class="card"><b>' + tot.correct + '/' + q.questions.length + '</b><span>correct</span></div>'
    + '<div class="card"><b>' + Math.round(tot.correct / Math.max(1, tot.correct + tot.wrong) * 100) + '%</b><span>accuracy</span></div></div>'
    + '<div class="card"><h2>' + (tot.score >= Math.round(max * 0.6) ? "🎉 Strong set!" : "💪 Every mistake here is a mark saved in the real exam.") + '</h2>'
    + '<p class="mini">' + (q.mode === "test" ? "Time: " + fmtSec(Date.now() - q.startedAt) + " for " + q.questions.length + " questions (" + SECS_PER_Q + "s each allowed)." : "Practice mode — no time pressure.") + '</p></div>';
  window.lastRows = q.questions.map(function (qu, i) {
    const a = q.answers[i];
    return { i: i, status: a === null ? "skip" : (a === qu.answer ? "right" : "wrong"), chosen: a, ex: false, reason: "concept" };
  });
  $("saveErrCard").classList.toggle("hidden", !tot.wrong);
  $("resList").innerHTML = q.questions.map(function (qu, i) {
    const r = window.lastRows[i], a = r.chosen;
    let html = '<div class="rrow ' + r.status + '"><div class="rq"><b>Q' + (i + 1) + '.</b> ' + esc(qu.q) + '</div>';
    if (r.status !== "right") {
      html += '<div class="ra">Your answer: ' + (a === null ? "— skipped —" : esc(String.fromCharCode(65 + a) + ". " + qu.options[a]))
        + ' &nbsp;·&nbsp; ✅ Correct: ' + esc(String.fromCharCode(65 + qu.answer) + ". " + qu.options[qu.answer]) + '</div>';
    }
    html += '<div class="re">' + esc(qu.explanation) + (qu.point ? ' <span class="exp">💡 ' + esc(qu.point) + '</span>' : "") + '</div>';
    if (r.status === "wrong") {
      html += '<div class="seg">' + Object.keys(REASON_LABELS).map(k =>
        '<button class="sg' + (r.reason === k ? " on" : "") + '" data-r="' + i + '" data-k="' + k + '">' + REASON_LABELS[k] + '</button>').join("")
        + '<button class="sg skipq" data-x="' + i + '">✕ skip this one</button></div>';
    }
    return html + '</div>';
  }).join("");
  document.querySelectorAll(".sg[data-r]").forEach(b => b.onclick = function () {
    window.lastRows[+b.dataset.r].reason = b.dataset.k;
    document.querySelectorAll('.sg[data-r="' + b.dataset.r + '"]').forEach(x => x.classList.remove("on"));
    b.classList.add("on");
  });
  document.querySelectorAll(".skipq").forEach(b => b.onclick = function () {
    window.lastRows[+b.dataset.x].ex = true; b.closest(".seg").style.display = "none";
  });
}
function sendErrors() {
  const q = state.quizzes ? null : null;   /* questions come from the results payload */
  const rows = (window.lastRows || []).filter(r => r.status === "wrong" && !r.ex);
  if (!rows.length) { alert("Nothing to send."); return; }
  const qu = window.lastQuizQ, t = todayStr(); let n = 0;
  rows.forEach(function (r) {
    const qu2 = qu[r.i];
    const fix = {
      id: uid(), subj: qu2.ssubj, topic: qu2.stopic, front: qu2.q, back: qu2.options[qu2.answer] + (qu2.point ? " 💡 " + qu2.point : ""),
      img: "", ease: 2.5, iv: 0, due: addDays(t, 3), lapses: 0, seen: 0, created: Date.now(), from: "error"
    };
    state.cards.push(fix);
    state.errors.push({
      id: uid(), created: Date.now(), date: t, subj: qu2.ssubj, topic: qu2.stopic, q: qu2.q,
      options: qu2.options, answer: qu2.answer, expl: qu2.explanation, chosen: r.chosen, reason: r.reason,
      fixCardId: fix.id, retestDue: addDays(t, 3), resolved: false, timesWrong: 1
    });
    n++;
  });
  save();
  $("sendErrBtn").disabled = true; $("sendErrBtn").textContent = "✅ " + n + " sent to Error Lab";
  alert(n + " errors saved.\nFix flashcards appear in Cards in 3 days.\nRetest these questions in Error Lab.");
}
function wireResults(qz) {
  window.lastQuizQ = qz.questions.map(x => ({
    q: x.q, options: x.options, answer: x.answer, explanation: x.explanation, point: x.point,
    ssubj: qz.subj, stopic: qz.topic
  }));
  $("sendErrBtn").disabled = false; $("sendErrBtn").textContent = "📥 Send all to Error Lab";
  $("sendErrBtn").onclick = sendErrors;
  $("resDone").onclick = function () { $("qzResults").classList.add("hidden"); $("qzMain").classList.remove("hidden"); renderMain(); };
}

/* ---------- main page ---------- */
function renderMain() {
  const due = state.errors.filter(e => !e.resolved && e.retestDue <= todayStr()).length;
  $("dueHint").innerHTML = due ? '<div class="notice"><span>🔁 ' + due + ' error retest(s) due today</span>'
    + '<a class="btn small ghost" style="text-decoration:none" href="errors.html">Open Error Lab</a></div>' : "";
  const h = state.quizzes.slice(-8).reverse();
  $("histList").innerHTML = h.length ? h.map(x => '<div class="fsess"><div class="t">' + x.date.slice(5) + '</div><div class="l">'
    + esc(x.subj) + (x.topic ? " · " + esc(x.topic) : " · mixed") + '<div style="font-size:11px;color:var(--muted)">' + x.mode
    + ' · ' + x.correct + '/' + x.total + ' · score ' + x.score + ' (' + x.pct + '% acc)</div></div></div>').join("")
    : '<p class="mini" style="margin-top:0">No quizzes yet — run a drill above.</p>';
}
function fillSubjects(sel) {
  DEFAULT_SUBJECTS.forEach(s => { const o = document.createElement("option"); o.value = s[0]; o.textContent = s[0]; sel.appendChild(o); });
}

/* ---------- boot ---------- */
if (needPlan()) {
  ensureQZ();
  $("hchip").textContent = "⚡ " + diffDays(todayStr(), state.cfg.examDate) + " days to exam";
  ["dSubj", "nSubj"].forEach(id => fillSubjects($(id)));
  $("dSubj").value = weakestSubj();
  fillTopics();
  $("dSubj").onchange = fillTopics;
  function fillTopics() {
    const s = $("dSubj").value, sel = $("dTopic"); sel.innerHTML = "";
    const o = document.createElement("option"); o.value = ""; o.textContent = "Whole subject (mixed topics)"; sel.appendChild(o);
    getTopics(s).forEach(t => { const op = document.createElement("option"); op.value = t[0]; op.textContent = t[0]; sel.appendChild(op); });
  }
  $("weakBtn").onclick = function () {
    $("dSubj").value = weakestSubj(); fillTopics();
    $("dCount").value = "10"; $("dMode").value = "practice"; generate("drill");
  };
  $("dStart").onclick = () => generate("drill");
  $("nStart").onclick = () => generate("notes");
  $("nFile").onchange = () => { const f = $("nFile").files[0]; $("nFileNote").textContent = f ? ("Selected: " + f.name) : ""; };
  $("prevBtn").onclick = function () { const q = state.activeQuiz; if (q.idx > 0) { q.idx--; save(); renderQ(); } };
  $("nextBtn").onclick = function () { const q = state.activeQuiz; if (q.idx < q.questions.length - 1) { q.idx++; save(); renderQ(); } };
  $("palBtn").onclick = function () { $("palette").classList.toggle("hidden"); renderPalette(); };
  $("submitBtn").onclick = () => finishQuiz(false);
  $("qzExit").onclick = function () {
    if (confirm("Exit the quiz? Answered questions so far will be lost (refresh instead to resume).")) {
      if (T) clearInterval(T); state.activeQuiz = null; save();
      $("qzScreen").classList.add("hidden"); $("qzMain").classList.remove("hidden"); renderMain();
    }
  };
  renderMain();
  /* resume a quiz in progress (refresh-safe) */
  if (state.activeQuiz && !state.activeQuiz.done) {
    startQuizResume();
  }
  function startQuizResume() {
    const q = state.activeQuiz;
    if (q.mode === "test" && q.endsAt - Date.now() <= 0) { finishQuiz(true); return; }
    /* rebuild the results wiring in case it was refreshed mid-test */
    openScreen();
  }
}