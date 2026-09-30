"use strict";
/* ============================================================
   backup.js — logic for backup.html (save / restore / reset)
   ============================================================ */

/* Show what data currently exists */
if (state && state.plan) {
  $("infoBody").innerHTML = '<p class="mini" style="margin-top:0">📋 Plan: <b>' + state.plan.length
    + '</b> days · Exam: <b>' + state.cfg.examDate + '</b></p>';
} else {
  $("infoBody").innerHTML = '<p class="mini" style="margin-top:0">No plan yet — open <a href="setup.html">Setup</a> first.</p>';
}

/* Export: download all data as a small file */
 $("expBtn").onclick = function () {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(state)], { type: "application/json" }));
  a.download = "neetpg-backup-" + todayStr() + ".json";
  a.click();
};

/* Import: restore from a backup file */
 $("impFile").onchange = function (e) {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = function () {
    try {
      const data = JSON.parse(r.result);
      if (!data.plan || !data.cfg) throw 0;
      state = data; if (!state.extras) state.extras = {};
      save(); alert("Restored ✔"); location.href = "index.html";
    } catch (err) { alert("That file is not a valid backup."); }
  };
  r.readAsText(f);
};

/* Danger zone: delete everything */
 $("resetBtn").onclick = function () {
  if (!confirm("This deletes EVERYTHING (plan + all ticks). Sure?")) return;
  if (!confirm("Really sure? Take a backup first!")) return;
  localStorage.removeItem(APP_KEY);
  location.href = "setup.html";
};