"use strict";
/* ============================================================
   setup.js — logic for setup.html (the plan creator)
   ============================================================ */

/* Build the 19 subject rows (prefill from old settings if they exist) */
(function () {
  const cfgS = state && state.cfg ? state.cfg.subjects : null;
  DEFAULT_SUBJECTS.forEach((s, i) => {
    const row = document.createElement("div");
    row.className = "subj";
    const on = cfgS ? cfgS[i].on : true;
    const wk = cfgS ? cfgS[i].weak : s[2];
    row.innerHTML = '<input type="checkbox" ' + (on ? "checked" : "") + '>'
      + '<span class="nm">' + s[0] + '</span><span class="sz">size ' + s[1] + '</span>'
      + '<select>' + [1, 2, 3, 4, 5].map(w =>
          '<option value="' + w + '"' + (wk === w ? " selected" : "") + '>weak ' + w + '</option>').join("")
      + '</select>';
    $("subjectList").appendChild(row);
  });
})();

/* Prefill the form */
if (state && state.cfg) {
  $("examDate").value = state.cfg.examDate;
  $("dayStart").value = state.cfg.dayStart;
  $("dayEnd").value = state.cfg.dayEnd;
  $("hours").value = state.cfg.hours;
  $("lightSunday").checked = state.cfg.lightSunday;
} else {
  const d = new Date(); d.setMonth(7);              // default: August
  if (d < new Date()) d.setFullYear(d.getFullYear() + 1);
  $("examDate").value = dstr(d);
  $("examDate").min = todayStr();
}

 $("genBtn").onclick = function () {
  if (state && state.plan &&
      !confirm("Regenerating replaces the old plan and clears all ticks. Take a backup first if needed. Continue?")) return;

  const boxes = document.querySelectorAll("#subjectList input[type=checkbox]");
  const sels = document.querySelectorAll("#subjectList select");
  const cfg = {
    examDate: $("examDate").value,
    dayStart: $("dayStart").value || "07:00",
    dayEnd: $("dayEnd").value || "22:00",
    hours: Math.min(14, Math.max(4, +$("hours").value || 9)),
    lightSunday: $("lightSunday").checked,
    subjects: DEFAULT_SUBJECTS.map((s, i) =>
      ({ name: s[0], size: s[1], weak: +sels[i].value, on: boxes[i].checked }))
  };

  if (!cfg.examDate) { alert("Please set the exam date."); return; }
  if (!cfg.subjects.some(s => s.on)) { alert("Select at least one subject."); return; }
  if (diffDays(todayStr(), cfg.examDate) < 7) { alert("Exam date must be at least 7 days ahead."); return; }

  state = generatePlan(cfg);
  save();
  alert("Plan created ✅  " + state.plan.length + " days scheduled.");
  location.href = "index.html";
};