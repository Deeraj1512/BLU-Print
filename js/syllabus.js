"use strict";
/* syllabus.js — view & edit each subject's topic list */
(function () {
  const names = DEFAULT_SUBJECTS.map(s => s[0]);
  names.forEach(n => {
    const o = document.createElement("option");
    o.value = n; o.textContent = n;
    $("subjSelect").appendChild(o);
  });

  let curSub = names[0];
  let work = [];                       /* working copy being edited */

  const clone = a => a.map(t => [t[0], t[1]]);
  function load() {
    work = clone((state.topics && state.topics[curSub]) ? state.topics[curSub] : (TOPICS[curSub] || []));
  }
  function render() {
    $("subjSelect").value = curSub;
    $("topicList").innerHTML = work.map((t, i) =>
      '<div class="subj">'
      + '<input type="text" value="' + t[0].replace(/"/g, "&quot;") + '" data-i="' + i + '" class="tname" style="flex:1;padding:9px;border:1px solid var(--line);border-radius:8px">'
      + '<input type="number" min="1" max="9" value="' + t[1] + '" data-i="' + i + '" class="tw" style="width:64px;padding:9px;border:1px solid var(--line);border-radius:8px">'
      + '<button class="btn small ghost del" data-i="' + i + '">✕</button></div>'
    ).join("") + '<p class="mini">Total: ' + work.reduce((a, t) => a + (+t[1] || 1), 0) + ' deep-work sessions for this subject.</p>';

    document.querySelectorAll(".tname").forEach(el => el.oninput = () => { work[+el.dataset.i][0] = el.value; });
    document.querySelectorAll(".tw").forEach(el => el.oninput = () => { work[+el.dataset.i][1] = +el.value || 1; });
    document.querySelectorAll(".del").forEach(el => el.onclick = () => { work.splice(+el.dataset.i, 1); render(); });
  }

  $("subjSelect").onchange = () => { curSub = $("subjSelect").value; load(); render(); };
  $("addBtn").onclick = () => { work.push(["New topic", 1]); render(); };
  $("saveBtn").onclick = () => {
    state.topics = state.topics || {};
    state.topics[curSub] = work.filter(t => t[0].trim() !== "");
    save(); alert("Saved ✔  Now regenerate the plan (Edit Plan → Generate) to apply it.");
  };
  $("resetBtn").onclick = () => {
    if (!confirm("Restore the built-in topic list for " + curSub + "?")) return;
    if (state.topics) delete state.topics[curSub];
    save(); load(); render();
  };

  load(); render();
})();