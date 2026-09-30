"use strict";
/* ============================================================
   focus.js — Focus Studio.
   DND timer + interruption log + phone ritual.
   Data stored in:
     state.focus    = { log: [...], ritual: {yes,total} }
     state.activeFocus = the running session (survives refresh)
   ============================================================ */

/* ---------- data shape ---------- */
function ensureFocusData() {
  if (!state.focus) state.focus = { log: [], ritual: { yes: 0, total: 0 } };
  if (!state.focus.log) state.focus.log = [];
  if (!state.focus.ritual) state.focus.ritual = { yes: 0, total: 0 };
}

/* ---------- globals ---------- */
let A = null;            /* active session */
let tickId = null;
let wakeLock = null;
let AC = null;           /* audio */
let pending = null;      /* session waiting behind the ritual prompt */

/* ---------- small helpers ---------- */
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function fmtRemain(ms) {
  ms = Math.max(0, ms);
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return h > 0 ? h + ":" + pad(m) + ":" + pad(ss) : pad(m) + ":" + pad(ss);
}
function fmtClock(ms) { return new Date(ms).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }); }
function fmtMin(m) {
  m = Math.round(m); if (m < 60) return m + "m";
  const h = Math.floor(m / 60), r = m % 60; return h + "h" + (r ? " " + r + "m" : "");
}
/* focused time = elapsed − paused time (calculated from timestamps, so
   it stays correct even if the browser sleeps or tab is switched) */
function focusedMs(a) {
  const now = Date.now();
  return Math.max(0, now - a.startedAt - a.pausedTotal - (a.pausedAt ? now - a.pausedAt : 0));
}

/* ---------- audio chime (created on user tap, so it is allowed to play) ---------- */
function initAudio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
function chime() {
  if (!AC) return;
  try {
    const t = AC.currentTime;
    [0, 0.35, 0.7].forEach((off, i) => {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = "sine"; o.frequency.value = i === 2 ? 1046 : 784;
      g.gain.setValueAtTime(0.0001, t + off);
      g.gain.exponentialRampToValueAtTime(0.3, t + off + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.3);
      o.connect(g); g.connect(AC.destination);
      o.start(t + off); o.stop(t + off + 0.35);
    });
  } catch (e) {}
}

/* ---------- wake lock + fullscreen (best effort, safe to fail) ---------- */
async function lockScreen() { try { wakeLock = await navigator.wakeLock.request("screen"); } catch (e) {} }
async function releaseWake() { try { if (wakeLock) { wakeLock.release(); wakeLock = null; } } catch (e) {} }
function goFS() { try { if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); } catch (e) {} }
function exitFS() { try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {} }

/* ---------- start / pause / interrupt / end ---------- */
function startFlow(topic, min, ref) {
  if (A) return;                       /* one session at a time */
  pending = { topic: topic, min: min, ref: ref || null };
  $("ritual").classList.remove("hidden");
}
function begin(phoneWithMe) {
  $("ritual").classList.add("hidden");
  A = {
    topic: pending.topic, plannedMin: pending.min,
    startedAt: Date.now(), pausedAt: null, pausedTotal: 0,
    ref: pending.ref, phoneAway: !phoneWithMe, interruptions: []
  };
  pending = null;
  state.focus.ritual.total++;
  if (!phoneWithMe) state.focus.ritual.yes++;
  state.activeFocus = A; save();
  initAudio(); goFS(); lockScreen();
  window.onbeforeunload = function () { return "A focus session is running."; };
  showDND(); startTicking();
}
function togglePause() {
  if (!A) return;
  if (A.pausedAt) { A.pausedTotal += Date.now() - A.pausedAt; A.pausedAt = null; $("pauseBtn").textContent = "⏸ Pause"; }
  else { A.pausedAt = Date.now(); $("pauseBtn").textContent = "▶ Resume"; }
  save(); updateDND();
}
function finalize(completed) {
  if (!A) return;
  const a = A; A = null;
  if (tickId) { clearInterval(tickId); tickId = null; }
  const entry = {
    date: todayStr(), startedAt: a.startedAt, endedAt: Date.now(),
    plannedMin: a.plannedMin, focusedMin: Math.round(focusedMs(a) / 60000),
    topic: a.topic, ref: a.ref, phoneAway: a.phoneAway,
    interruptions: a.interruptions, completed: completed
  };
  state.focus.log.push(entry);
  if (state.focus.log.length > 300) state.focus.log = state.focus.log.slice(-300);

  /* if this was a planned session, tick it off in Today */
  if (a.ref) {
    const day = state.plan.find(p => p.date === a.ref.date);
    if (day && day.sessions[a.ref.idx]) day.sessions[a.ref.idx].done = true;
  }
  state.activeFocus = null; save();
  releaseWake(); exitFS();
  window.onbeforeunload = null;
  $("dnd").classList.add("hidden");
  $("studio").classList.remove("hidden");
  renderStudio(); showDone(entry);
  if (completed) chime();
}
function showDone(e) {
  const lost = e.interruptions.reduce((a, i) => a + i.lostMin, 0);
  $("doneBody").innerHTML =
    '<h2>' + (e.completed ? "🎉 Session complete!" : "■ Session ended") + '</h2>'
    + '<p class="mini" style="margin-top:6px">⏱ Focused: <b>' + fmtMin(e.focusedMin) + '</b> of ' + e.plannedMin + ' min planned</p>'
    + '<p class="mini">🔔 Interruptions: <b>' + e.interruptions.length + '</b> (' + lost + ' min lost)</p>'
    + (e.ref ? '<p class="mini">✅ Ticked off in Today — nice!</p>' : '')
    + '<p class="mini">' + (e.completed ? "Take your break, then hit the next session. 💪" : "Every minute counts. Next one, fully? 💪") + '</p>';
  $("doneCard").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- DND screen ---------- */
function showDND() {
  $("studio").classList.add("hidden");
  $("doneCard").classList.add("hidden");
  $("dnd").classList.remove("hidden");
  $("dndTopic").textContent = A.topic;
  updateDND();
}
function updateDND() {
  if (!A) return;
  const rem = A.plannedMin * 60000 - focusedMs(A);
  $("dndTime").textContent = fmtRemain(rem);
  if (A.pausedAt) { $("dndUntil").textContent = "Paused — timer frozen"; $("dndPause").classList.remove("hidden"); }
  else { $("dndUntil").textContent = "Studying until " + fmtClock(Date.now() + rem); $("dndPause").classList.add("hidden"); }
}
function startTicking() {
  if (tickId) clearInterval(tickId);
  tickId = setInterval(function () {
    if (!A) return;
    if (A.plannedMin * 60000 - focusedMs(A) <= 0) { finalize(true); return; }
    updateDND();
  }, 500);
}

/* ---------- studio rendering ---------- */
function weekStats(from, to) {          /* e.g. (0,7) = last 7 days */
  const o = { sessions: 0, focused: 0, int: 0, lost: 0 };
  state.focus.log.forEach(function (e) {
    const ago = diffDays(e.date, todayStr());
    if (ago >= from && ago < to) {
      o.sessions++; o.focused += e.focusedMin || 0;
      (e.interruptions || []).forEach(function (i) { o.int++; o.lost += i.lostMin || 0; });
    }
  });
  return o;
}
function renderWeek() {
  const tw = weekStats(0, 7), lw = weekStats(7, 14);
  const r = state.focus.ritual;
  const pct = r.total ? Math.round(r.yes / r.total * 100) : 0;
  let trend;
  if (lw.int > 0 || tw.int > 0) {
    const d = tw.int - lw.int;
    trend = d <= 0
      ? '<p class="mini trend-down">📉 ' + Math.abs(d) + ' fewer interruptions than last week. It\'s working — keep the screen visible!</p>'
      : '<p class="mini trend-up">📈 ' + d + ' more interruptions than last week. Keep the DND screen where family can see it.</p>';
  } else {
    trend = '<p class="mini">No interruptions logged yet. When someone pulls you into a chat, tap "✋ I was interrupted" — seeing the pattern is how we shrink it.</p>';
  }
  $("weekStats").innerHTML =
    '<div class="stat">'
    + '<div class="card"><b>' + fmtMin(tw.focused) + '</b><span>focused · 7 days</span></div>'
    + '<div class="card"><b>' + tw.int + '</b><span>interruptions</span></div>'
    + '<div class="card"><b>' + tw.lost + 'm</b><span>time lost</span></div>'
    + '</div>'
    + '<div class="card">' + trend
    + '<p class="mini" style="margin-bottom:0">📱 Phone stayed away in <b>' + pct + '%</b> of ' + r.total + ' session(s).</p></div>';
}
function renderSessList() {
  const t = todayStr();
  const day = state.plan.find(p => p.date === t);
  let html = "";
  if (!day || !day.sessions.some(s => s.kind === "study" && s.status !== "moved")) {
    html = '<p class="mini" style="margin-top:0">No planned study sessions today (rest day). Use a custom sprint below — or enjoy the break! 🌿</p>';
  } else {
    html = '<p class="mini" style="margin-top:0">' + pdate(t).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" }) + ' — tap ▶ when you sit down.</p>';
    day.sessions.forEach(function (s, i) {
      if (s.kind !== "study" || s.status === "moved") return;
      html += '<div class="fsess"><div class="t">' + s.time + '</div><div class="l">' + esc(s.label)
        + '<div style="font-size:11px;color:var(--muted)">' + s.dur + ' min</div></div>'
        + (s.done ? '<button class="playbtn done">✓</button>'
                  : '<button class="playbtn" data-idx="' + i + '">▶ Start</button>')
        + '</div>';
    });
  }
  $("sessList").innerHTML = html;
  document.querySelectorAll("#sessList [data-idx]").forEach(function (b) {
    b.onclick = function () {
      const idx = +b.dataset.idx, s = day.sessions[idx];
      startFlow(s.label, s.dur, { date: t, idx: idx });
    };
  });
}
function renderRecent() {
  const list = state.focus.log.slice(-8).reverse();
  $("recentList").innerHTML = list.length ? list.map(function (e) {
    const d = e.date === todayStr() ? "Today" : pdate(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const lost = (e.interruptions || []).reduce((a, i) => a + (i.lostMin || 0), 0);
    return '<div class="fsess"><div class="t">' + d + '</div><div class="l">' + esc(e.topic)
      + '<div style="font-size:11px;color:var(--muted)">' + fmtMin(e.focusedMin) + ' focused · 🔔 '
      + (e.interruptions || []).length + ' (' + lost + 'm lost) · ' + (e.completed ? "✅" : "ended early") + '</div></div></div>';
  }).join("") : '<p class="mini" style="margin-top:0">No sessions yet. Your history appears here.</p>';
}
function renderStudio() { renderWeek(); renderSessList(); renderRecent(); }

/* ---------- boot ---------- */
if (needPlan()) {
  ensureFocusData();
  $("hchip").textContent = "⚡ " + diffDays(todayStr(), state.cfg.examDate) + " days to exam";

  /* static buttons */
  document.querySelectorAll(".sprintBtn").forEach(b => b.onclick = () => startFlow("Custom focus sprint", +b.dataset.min, null));
  $("ritYes").onclick = function () { begin(false); };   /* phone away = yes */
  $("ritNo").onclick  = function () { begin(true);  };   /* starting anyway  */
  $("pauseBtn").onclick = togglePause;
  $("endBtn").onclick = function () { if (A && confirm("End this session early?")) finalize(false); };
  $("intBtn").onclick = function () { if (A && !A.pausedAt) $("intChoose").classList.remove("hidden"); };
  $("intCancel").onclick = function () { $("intChoose").classList.add("hidden"); };
  document.querySelectorAll(".intOpt").forEach(function (b) {
    b.onclick = function () {
      if (A) { A.interruptions.push({ at: Date.now(), lostMin: +b.dataset.min }); save(); }
      $("intChoose").classList.add("hidden");
    };
  });
  $("doneOk").onclick = function () { $("doneCard").classList.add("hidden"); };

  /* keep time correct + re-lock screen when she comes back to the tab */
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && A) { updateDND(); if (!A.pausedAt) lockScreen(); }
  });

  /* resume a running session after a refresh or accidental close */
  if (state.activeFocus) {
    A = state.activeFocus;
    if (A.plannedMin * 60000 - focusedMs(A) <= 0) finalize(true);
    else { showDND(); startTicking(); }
  }
  if (!A) renderStudio();
}