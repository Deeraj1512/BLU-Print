"use strict";
/* ============================================================
   today.js — logic for index.html (the Today screen)
   ============================================================ */

/* ---------- data helpers ---------- */
function backlog() {
  const t = todayStr(), out = [];
  state.plan.forEach(p => {
    if (p.date < t) p.sessions.forEach((s, i) => {
      if (s.kind === "study" && !s.done && s.status !== "moved")
        out.push({ date: p.date, idx: i, label: s.label });
    });
  });
  return out;
}

function toggleDay(date, idx) {
  state.plan.find(p => p.date === date).sessions[idx].done =
    !state.plan.find(p => p.date === date).sessions[idx].done;
  save(); renderToday();
}
function toggleExtra(idx) {
  const x = state.extras[todayStr()][idx];
  x.done = !x.done; save(); renderToday();
}
function reflow() {                       /* carry up to 3 missed sessions into today */
  const b = backlog(); if (!b.length) return;
  const t = todayStr();
  state.extras[t] = state.extras[t] || [];
  b.slice(0, 3).forEach(item => {
    state.plan.find(p => p.date === item.date).sessions[item.idx].status = "moved";
    state.extras[t].push({ time: "↩", dur: 0, label: "Carry-forward: " + item.label, kind: "study", done: false });
  });
  save(); renderToday();
}

/* ---------- render ---------- */
function renderToday() {
  const t = todayStr(), day = state.plan.find(p => p.date === t);
  const examIn = diffDays(t, state.cfg.examDate);
  $("hchip").textContent = examIn === 0 ? "Exam day! 🍀" : examIn < 0 ? "Complete ✅" : "⚡ " + examIn + " days to exam";

  if (examIn < 0) { $("todayBody").innerHTML = '<div class="card"><h2>Exam completed! 🎉</h2></div>'; return; }
  if (!day) { $("todayBody").innerHTML = '<div class="card"><h2>No plan for today</h2><p class="mini">Plan may have expired. <a href="setup.html">Regenerate it</a>.</p></div>'; return; }

  const phaseName = { 1: "Phase 1 · First Reading", 2: "Phase 2 · Revision", 3: "Phase 3 · Final Sprint" }[day.phase];
  const dateStr = pdate(t).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
  const study = day.sessions.filter(s => s.kind === "study");
  const doneN = study.filter(s => s.done || s.status === "moved").length;
  const pct = study.length ? Math.round(doneN / study.length * 100) : 0;
  const extras = state.extras[t] || [];
  const bl = backlog();

  let html = '<div class="stat">'
    + '<div class="card"><b>🔥 ' + streak() + '</b><span>day streak</span></div>'
    + '<div class="card"><b>' + doneN + '/' + study.length + '</b><span>sessions done</span></div>'
    + '<div class="card"><b>' + examIn + '</b><span>days left</span></div></div>';

  if (isSunday(t)) {
    let pl = 0, dn = 0;
    for (let i = 0; i < 7; i++) {
      const p = state.plan.find(x => x.date === addDays(t, -i));
      if (p) { const s = p.sessions.filter(x => x.kind === "study"); pl += s.length; dn += s.filter(x => x.done || x.status === "moved").length; }
    }
    html += '<div class="card"><h2>📊 Sunday Review</h2><div class="pbar"><div style="width:' + Math.round(dn / Math.max(pl, 1) * 100) + '%"></div></div>'
      + '<p class="mini">This week: ' + dn + ' of ' + pl + ' sessions (' + Math.round(dn / Math.max(pl, 1) * 100) + '%). Review it with your brother — <a href="report.html">open the full Report →</a> then rest. 💜</p></div>';
  }
  if (bl.length) html += '<div class="notice"><span>📋 ' + bl.length + ' past session(s) not done. Carry up to 3 into today?</span>'
    + '<button class="btn small ghost" onclick="reflow()">Reflow</button></div>';

  html += '<div class="card"><span class="tag p' + day.phase + '">' + phaseName + '</span>'
    + '<div style="font-size:18px;font-weight:700">' + dateStr + '</div>'
    + '<div class="pbar"><div style="width:' + pct + '%"></div></div></div>';

  html += '<div class="card">';
  extras.forEach((s, i) => {
    html += '<div class="sess ' + (s.done ? "done" : "") + '" onclick="toggleExtra(' + i + ')">'
      + '<div class="box">' + (s.done ? "✓" : "") + '</div><div class="t">' + s.time + '</div><div class="l">' + s.label + '</div></div>';
  });
  day.sessions.forEach((s, i) => {
    if (s.kind === "study" && s.status === "moved") return;
    if (s.kind === "meal" || s.kind === "break") {
      html += '<div class="sess ' + s.kind + '"><div class="t">' + s.time + '</div><div class="l">' + s.label + '</div><div class="d">' + s.dur + ' min</div></div>';
    } else {
      html += '<div class="sess ' + (s.done ? "done" : "") + '" onclick="toggleDay(\'' + t + '\',' + i + ')">'
        + '<div class="box">' + (s.done ? "✓" : "") + '</div><div class="t">' + s.time + '</div><div class="l">' + s.label + '</div><div class="d">' + s.dur + ' min</div></div>';
    }
  });
  html += '</div><p class="mini">💡 Same time slots every day — the routine becomes automatic. Tap a session to tick it.</p>';
  $("todayBody").innerHTML = html;
}

/* ---------- start ---------- */
if (needPlan()) renderToday();