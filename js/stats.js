"use strict";
/* ============================================================
   stats.js — logic for stats.html (progress report)
   ============================================================ */
if (needPlan()) {
  const t = todayStr();
  $("hchip").textContent = "⚡ " + diffDays(t, state.cfg.examDate) + " days to exam";

  /* collect every study session ever planned */
  const all = [];
  state.plan.forEach(p => p.sessions.forEach(s => {
    if (s.kind === "study") all.push({ subject: s.subject, dur: s.dur || 0, done: !!(s.done || s.status === "moved") });
  }));
  const done = all.filter(s => s.done);
  const hours = Math.round(done.reduce((a, s) => a + s.dur, 0) / 60);
  const pct = all.length ? Math.round(done.length / all.length * 100) : 0;

  /* per-subject table */
  const bySub = {};
  all.forEach(s => { const k = s.subject || "General / Mixed"; bySub[k] = bySub[k] || { p: 0, d: 0 }; bySub[k].p++; if (s.done) bySub[k].d++; });
  const rows = Object.keys(bySub).sort((a, b) => bySub[b].p - bySub[a].p).map(k => {
    const o = bySub[k], pc = Math.round(o.d / o.p * 100);
    return '<tr><td>' + k + '</td><td>' + o.d + '/' + o.p + '</td>'
      + '<td><div class="bar"><div style="width:' + pc + '%"></div></div></td><td>' + pc + '%</td></tr>';
  }).join("");

  /* last 7 days */
  let wk = "";
  for (let i = 6; i >= 0; i--) {
    const d = addDays(t, -i);
    const p = state.plan.find(x => x.date === d);
    const st = p ? p.sessions.filter(x => x.kind === "study") : [];
    const dn = st.filter(x => x.done || x.status === "moved").length;
    const pc = st.length ? Math.round(dn / st.length * 100) : 0;
    wk += '<tr><td>' + pdate(d).toLocaleDateString("en-IN", { weekday: "short" }) + '</td>'
      + '<td><div class="bar"><div style="width:' + pc + '%"></div></div></td>'
      + '<td>' + (st.length ? dn + '/' + st.length : "—") + '</td></tr>';
  }

  $("statsBody").innerHTML =
    '<div class="stat">'
    + '<div class="card"><b>🔥 ' + streak() + '</b><span>day streak</span></div>'
    + '<div class="card"><b>' + hours + 'h</b><span>studied</span></div>'
    + '<div class="card"><b>' + pct + '%</b><span>of plan done</span></div></div>'
    + '<div class="card"><h2>📚 Subject progress</h2><table class="subject-table">'
    + '<tr><th>Subject</th><th>Done</th><th></th><th>%</th></tr>' + rows + '</table></div>'
    + '<div class="card"><h2>🗓️ Last 7 days</h2><table class="subject-table">' + wk + '</table>'
    + '<p class="mini">Every Sunday, open this page together and talk through the numbers.</p></div>';
}