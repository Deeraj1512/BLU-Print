"use strict";
/* ============================================================
   planner.js — v2: TOPIC-LEVEL timetable engine.
   Now every session says the exact topic to study.
   Rules built in:
   - Morning Deep Work = hardest due subject
   - Second slot = easiest due subject (hard→easy alternation)
   - Same-day revision repeats the morning topics
   ============================================================ */

function buildTemplate(startT, endT, target) {
  let t = toMin(startT);
  const end = toMin(endT);
  let remaining = target;
  const out = [];
  const LUNCH = 13 * 60, DINNER = 20 * 60;
  let lunch = false, dinner = false, block = 0;
  const blockLen = [150, 120, 120, 90, 90, 60];
  const breakLen = [30, 15, 20, 15, 15];

  while (t < end - 20 && remaining > 15) {
    if (!lunch && t >= LUNCH - 15) {
      out.push({ time: toTime(Math.max(t, LUNCH)), dur: 60, label: "Lunch + rest 🍛", kind: "meal" });
      t = Math.max(t, LUNCH) + 60; lunch = true; continue;
    }
    if (!dinner && t >= DINNER - 15) {
      out.push({ time: toTime(Math.max(t, DINNER)), dur: 45, label: "Dinner 🍽️", kind: "meal" });
      t = Math.max(t, DINNER) + 45; dinner = true; continue;
    }
    let dur = Math.min(remaining, blockLen[block] || 60, end - t);
    if (!lunch && t < LUNCH && t + dur > LUNCH) dur = LUNCH - t;
    if (!dinner && t < DINNER && t + dur > DINNER) dur = DINNER - t;
    if (dur < 25) {
      if (!lunch) { t = LUNCH; continue; }
      if (!dinner) { t = DINNER; continue; }
      break;
    }
    out.push({ time: toTime(t), dur: dur, label: "", kind: "study" });
    t += dur; remaining -= dur; block++;
    if (t < end - 25 && remaining > 15) {
      const b = breakLen[(block - 1) % breakLen.length];
      out.push({ time: toTime(t), dur: b, label: "Break ☕", kind: "break" });
      t += b;
    }
  }
  return out;
}

function generatePlan(cfg) {
  const subs = cfg.subjects.filter(s => s.on);
  const today = todayStr();
  const total = diffDays(today, cfg.examDate);
  const p1 = Math.max(1, Math.round(total * 0.5));
  const p2 = Math.max(1, Math.round(total * 0.3));

  subs.forEach(s => s.units = s.size * (1 + (s.weak - 1) * 0.15));
  const base = subs.map(s => s.units);
  let remaining = base.slice();
  let lastSeen = subs.map(() => -999);
  let dayIdx = 0;

  /* topic queues — each study block consumes one unit of a topic's weight */
  const queues = subs.map(s => {
    const list = getTopics(s.name).map(t => ({ name: t[0], left: Math.max(1, Math.round(t[1] || 1)) }));
    return { list: list, pos: 0 };
  });
  const revPtr = subs.map(() => 0);

  const tpl = buildTemplate(cfg.dayStart, cfg.dayEnd, cfg.hours * 60);
  const tplSun = buildTemplate(cfg.dayStart, cfg.dayEnd, Math.round(cfg.hours * 60 * 0.4));
  const weakest = subs.slice().sort((a, b) => b.weak - a.weak || b.size - a.size)[0].name;

  const pick = (excl, rate) => {
    let bi = -1, bp = -1e9;
    subs.forEach((s, i) => {
      if (i === excl) return;
      const since = Math.min(30, dayIdx - lastSeen[i]);
      const p = remaining[i] * (1 + rate * Math.max(since, 0));
      if (p > bp) { bp = p; bi = i; }
    });
    return bi;
  };

  /* HARD-EASY RULE: second slot prefers the easiest due subject */
  const pickEasy = (excl) => {
    let bi = -1, bp = -1e9;
    subs.forEach((s, i) => {
      if (i === excl || remaining[i] <= 0.2) return;
      const since = Math.min(30, dayIdx - lastSeen[i]);
      const p = (6 - s.weak) * 10 + since;
      if (p > bp) { bp = p; bi = i; }
    });
    return bi;
  };

  /* next topic for subject i — consumes one block of its weight */
  const nextTopic = (si) => {
    const q = queues[si];
    if (q.pos < q.list.length) {
      const t = q.list[q.pos];
      const nm = t.name;
      t.left--;
      if (t.left <= 0) q.pos++;
      return nm;
    }
    return null;
  };

  /* next n topics for revision (wraps around for 2nd cycle) */
  const revChunk = (si, n) => {
    const list = queues[si].list;
    if (!list.length) return "high-yield topics";
    const names = [];
    for (let k = 0; k < n; k++) { names.push(list[revPtr[si] % list.length].name); revPtr[si]++; }
    return names.join(", ");
  };

  const mapStudy = (T, fn) => {
    const study = T.filter(s => s.kind === "study");
    return T.map(s => s.kind !== "study" ? { ...s } : { ...s, ...fn(study.indexOf(s)) });
  };

  const plan = [];
  for (let d = 0; d < total; d++) {
    const date = addDays(today, d);
    const phase = d < p1 ? 1 : d < p1 + p2 ? 2 : 3;
    const light = cfg.lightSunday && isSunday(date);
    const T = light ? tplSun : tpl;
    let tag, sessions;

    if (d >= total - 2) {
      tag = "Exam Eve";
      sessions = mapStudy(T, i => ({
        subject: "", label: [
          "Light revision: weakest topics + one-liners",
          "Flashcards (flagged cards)",
          "Rest early. Sleep well 😴"
        ][i] || "Stay calm"
      }));

    } else if (light) {
      tag = "Weekly Review";
      sessions = mapStudy(T, i => ({
        subject: "", label: [
          "Clear backlog + missed topics",
          "Flashcards due today",
          "Weekly self-test (50 Q, timed)",
          "Error Lab: review this week's mistakes"
        ][i] || "Light review"
      }));

    } else if (phase === 1) {
      tag = "First Reading";
      const mi = pick(-1, 0.15); remaining[mi] -= 1; lastSeen[mi] = dayIdx;
      let ei = pickEasy(mi);
      if (ei < 0) ei = pick(mi, 0.15);
      const si = ei;
      if (si >= 0) { remaining[si] -= 0.5; lastSeen[si] = dayIdx; }
      if (remaining.every(r => r <= 0.2)) remaining = base.map(u => u * 0.5);

      const main = subs[mi].name;
      const second = si >= 0 ? subs[si].name : main;
      const tA = nextTopic(mi);
      const tB = si >= 0 ? nextTopic(si) : null;

      const gen = [
        () => ({ subject: main, label: tA ? "Deep Work: " + main + " — " + tA : "Deep Work: " + main + " (2nd pass: weak areas)" }),
        () => (si >= 0 ? { subject: second, label: tB ? "Study: " + second + " — " + tB : "Study: " + second }
          : { subject: main, label: "QBank: " + main }),
        () => ({ subject: main, label: "QBank: " + main + (tA ? " — " + tA : "") + " MCQs" }),
        () => ({ subject: "", label: "Same-day revision: " + (tA || main) + " + " + (tB || second) + " + flashcards" }),
        () => ({ subject: weakest, label: "One-liners: " + weakest })
      ];
      sessions = mapStudy(T, i => gen[i] ? gen[i]() : { subject: "", label: "Flashcards + Error Lab" });

    } else if (phase === 2) {
      tag = "Revision 1";
      const i0 = pick(-1, 0.2); remaining[i0] -= 0.5; lastSeen[i0] = dayIdx;
      if (remaining.every(r => r <= 0.1)) remaining = base.map(u => u * 0.5);
      const x = subs[i0].name;

      const gen = [
        () => ({ subject: x, label: "Rapid Revision: " + x + " — " + revChunk(i0, 3) }),
        () => ({ subject: x, label: "Rapid Revision: " + x + " — " + revChunk(i0, 3) }),
        () => ({ subject: x, label: "Subject test: " + x + " (timed MCQs)" }),
        () => ({ subject: "", label: "Flashcards due + Error Lab" }),
        () => ({ subject: weakest, label: "One-liners: " + weakest })
      ];
      sessions = mapStudy(T, i => gen[i] ? gen[i]() : { subject: "", label: "Flashcards due" });

    } else {
      tag = "Final Sprint";
      if (d % 4 === 3) {
        const st = toMin(cfg.dayStart);
        sessions = [
          { time: toTime(st), dur: 210, label: "🏆 GRAND MOCK (200 Q, 3.5 hrs)", kind: "study", subject: "", done: false },
          { time: toTime(st + 240), dur: 30, label: "Break", kind: "break" },
          { time: toTime(st + 270), dur: 120, label: "Mock analysis + Error Lab", kind: "study", subject: "", done: false },
          { time: toTime(st + 420), dur: 60, label: "Lunch", kind: "meal" },
          { time: toTime(st + 480), dur: 90, label: "Flashcards: weak cards only", kind: "study", subject: "", done: false }
        ];
        plan.push({ date, phase, tag, sessions }); dayIdx++; continue;
      }
      const i0 = pick(-1, 0.2); remaining[i0] -= 0.3; lastSeen[i0] = dayIdx;
      const x = subs[i0].name;

      const gen = [
        () => ({ subject: x, label: "Grand Revision: " + x + " — " + revChunk(i0, 2) }),
        () => ({ subject: x, label: "Grand Revision: " + x + " + MCQs — " + revChunk(i0, 2) }),
        () => ({ subject: "", label: "Mixed 100 MCQs (timed)" }),
        () => ({ subject: "", label: "Flashcards (weak only)" }),
        () => ({ subject: weakest, label: "One-liners: " + weakest })
      ];
      sessions = mapStudy(T, i => gen[i] ? gen[i]() : { subject: "", label: "Flashcards (weak only)" });
    }

    sessions.forEach(s => { if (s.kind === "study" && s.done === undefined) s.done = false; });
    plan.push({ date, phase, tag, sessions });
    dayIdx++;
  }
  return { cfg, plan, extras: {} };
}