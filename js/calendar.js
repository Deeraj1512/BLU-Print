"use strict";
/* ============================================================
   calendar.js — logic for calendar.html (browse the full plan)
   ============================================================ */
if (needPlan()) {
  const first = state.plan[0].date.slice(0, 7);
  const last = state.plan[state.plan.length - 1].date.slice(0, 7);
  const cur = todayStr().slice(0, 7);
  let view = (cur >= first && cur <= last) ? cur : first;   // "YYYY-MM"

  function renderCal() {
    $("monthLabel").textContent = pdate(view + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    $("prevBtn").disabled = view <= first;
    $("nextBtn").disabled = view >= last;

    const days = state.plan.filter(p => p.date.slice(0, 7) === view);
    let html = "";
    days.forEach(p => {
      const st = p.sessions.filter(s => s.kind === "study");
      const dn = st.filter(s => s.done || s.status === "moved").length;
      html += '<details class="card day"><summary><span class="tag p' + p.phase + '">' + p.tag + '</span>'
        + '<b class="cd">' + pdate(p.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) + '</b>'
        + '<span class="d" style="font-size:12px;color:var(--muted)">' + dn + '/' + st.length + '</span></summary>';
      p.sessions.forEach(s => {
        html += '<div class="sess ' + (s.kind === "study" && s.done ? "done" : "") + '">'
          + '<div class="t">' + s.time + '</div><div class="l">' + s.label + '</div>'
          + (s.dur ? '<div class="d">' + s.dur + ' min</div>' : '') + '</div>';
      });
      html += '</details>';
    });
    $("calBody").innerHTML = html || '<div class="card"><p class="mini">No planned days this month.</p></div>';
  }

  $("prevBtn").onclick = () => { const d = pdate(view + "-01"); d.setMonth(d.getMonth() - 1); view = dstr(d).slice(0, 7); renderCal(); };
  $("nextBtn").onclick = () => { const d = pdate(view + "-01"); d.setMonth(d.getMonth() + 1); view = dstr(d).slice(0, 7); renderCal(); };
  renderCal();
}