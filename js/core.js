"use strict";
/* ============================================================
   core.js — shared helpers + data storage.
   Loaded FIRST on every page. Do not rename this file.
   All her data lives in the browser under APP_KEY.
   ============================================================ */

const APP_KEY = "neetpg_v1";

/* ---------- tiny date/time helpers ---------- */
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, "0");
const dstr = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const pdate = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d, 12); };
const addDays = (s, n) => { const d = pdate(s); d.setDate(d.getDate() + n); return dstr(d); };
const diffDays = (a, b) => Math.round((pdate(b) - pdate(a)) / 864e5);
const toMin = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const toTime = m => pad(Math.floor(m / 60)) + ":" + pad(m % 60);
const isSunday = s => pdate(s).getDay() === 0;
const todayStr = () => dstr(new Date());

/* ---------- the database (browser storage) ---------- */
let state = null;
try { state = JSON.parse(localStorage.getItem(APP_KEY) || "null"); } catch (e) { state = null; }
if (state && !state.extras) state.extras = {};   // safety for old backups
function save() { localStorage.setItem(APP_KEY, JSON.stringify(state)); }

/* If no plan exists yet, replace the page with a welcome and stop */
function needPlan() {
  if (state && state.plan) return true;
  document.body.innerHTML =
    '<main><div class="card"><h2>👋 Welcome!</h2>' +
    '<p class="mini">Your study plan is not created yet.</p>' +
    '<a class="btn" style="text-align:center;text-decoration:none" href="setup.html">Create my study plan →</a></div></main>';
  return false;
}

/* ---------- study streak (used by Today + Stats) ---------- */
function streak() {
  if (!state || !state.plan) return 0;
  let s = 0, d = todayStr();
  for (let i = 0; i < 400; i++) {
    const day = state.plan.find(p => p.date === d);
    if (!day) break;
    const st = day.sessions.filter(x => x.kind === "study");
    const done = st.filter(x => x.done || x.status === "moved").length;
    const hit = i === 0 ? done > 0 : (st.length > 0 && done >= Math.ceil(st.length * 0.5));
    if (hit) s++; else if (i > 0) break;
    d = addDays(d, -1);
  }
  return s;
}

/* ---------- the 19 NEET PG subjects ----------
   [name, size (how big the subject is), default weakness 1–5]
   Surgery is preset to weakness 5 = weakest (her problem subject). */
const DEFAULT_SUBJECTS = [
  ["Medicine", 5, 3], ["Surgery", 5, 5], ["Obstetrics & Gynaecology", 4, 3],
  ["Pharmacology", 3.5, 2], ["Pathology", 3.5, 2], ["Community Medicine (PSM)", 3, 2],
  ["Microbiology", 2.5, 2], ["Paediatrics", 2.5, 2], ["Anatomy", 2.5, 2],
  ["Physiology", 2, 2], ["Biochemistry", 2, 2], ["Forensic Medicine (FMT)", 2, 2],
  ["ENT", 2, 2], ["Ophthalmology", 2, 2], ["Dermatology", 1.5, 2],
  ["Psychiatry", 1.5, 2], ["Radiology", 1.5, 2], ["Anaesthesia", 1.5, 2],
  ["Orthopaedics", 1.5, 2]
];

/* ============================================================
   Module 7 — Sidebar navigation v2 (appended to core.js).
   Builds the topbar + collapsible dark sidebar on EVERY page.
   v2 fix: fully self-contained — no longer depends on any
   function defined by page scripts (that crash stopped the
   sidebar from appearing on some pages).
   ============================================================ */
(function () {
  const E = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const NAV = [
    ["index.html", "Today", "🏠"],
    ["focus.html", "Focus", "🎯"],
    ["flashcards.html", "Cards", "🃏"],
    ["quiz.html", "Quiz", "📝"],
    ["errors.html", "Errors", "🐛"],
    ["mock.html", "Mocks", "🏟"],
    ["ai.html", "AI", "🤖"],
    ["calendar.html", "Calendar", "📅"],
    ["stats.html", "Stats", "📊"],
    ["report.html", "Report", "📋"],
    ["syllabus.html", "Syllabus", "📚"],
    ["backup.html", "Backup", "💾"],
    ["setup.html", "Edit Plan", "⚙️"]
  ];

  function build() {
    /* capture the countdown text from the old header chip, then remove old chrome */
    const oldChip = document.getElementById("hchip");
    let chipText = oldChip ? oldChip.textContent.trim() : "";
    if (!chipText && state && state.cfg && state.cfg.examDate) {
      const dl = diffDays(todayStr(), state.cfg.examDate);
      chipText = dl >= 0 ? "⚡ " + dl + " days to exam" : "Complete ✅";
    }

    /* brand: tab icon + blue phone browser bar */
    const fav = document.createElement("link");
    fav.rel = "icon"; fav.type = "image/svg+xml"; fav.href = "favicon.svg";
    document.head.appendChild(fav);
    const th = document.createElement("meta");
    th.name = "theme-color"; th.content = "#4f46e5";
    document.head.appendChild(th);

    document.querySelectorAll("header").forEach(h => h.remove());
    document.querySelectorAll("nav.nav").forEach(n => n.remove());

    const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();

    /* ---- topbar: logo left · chip + toggle right ---- */
    const bar = document.createElement("header");
    bar.id = "topbar";
    bar.innerHTML =
      '<div class="tb-logo">🩺</div>'
      + '<div class="tb-title"><b>BLU-Print</b><span>One app. One goal.</span></div>'
      + '<span class="chip" id="hchip">' + E(chipText) + '</span>'
      + '<button class="tb-toggle" id="navToggle" aria-label="Open menu" title="Menu">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">'
      + '<rect x="3" y="4" width="18" height="16" rx="3"/><line x1="15" y1="4" x2="15" y2="20"/></svg>'
      + '</button>';

    /* ---- drawer: slides from the right ---- */
    const sb = document.createElement("aside");
    sb.id = "sidebar";
    sb.innerHTML =
      '<div class="sb-head"><b>MENU</b><button class="sb-close" id="sbClose" aria-label="Close menu">✕</button></div>'
      + '<nav class="sb-links">' + NAV.map(l =>
        '<a href="' + l[0] + '"' + (page === l[0] ? ' class="active"' : '') + '>'
        + '<span class="ic">' + l[2] + '</span>' + l[1] + '</a>').join("")
      + '</nav>'
      + '<div class="sb-foot">One app. One goal. 🩺<br>Everything she needs, nothing she doesn\u2019t.</div>';

    const bd = document.createElement("div");
    bd.id = "backdrop";

    document.body.insertBefore(bar, document.body.firstChild);
    document.body.appendChild(bd);
    document.body.appendChild(sb);

    const setOpen = v => {
      sb.classList.toggle("open", v);
      bd.classList.toggle("show", v);
      document.body.classList.toggle("navopen", v);
    };
    document.getElementById("navToggle").onclick = () => setOpen(!sb.classList.contains("open"));
    document.getElementById("sbClose").onclick = () => setOpen(false);
    bd.onclick = () => setOpen(false);
    document.addEventListener("keydown", e => { if (e.key === "Escape") setOpen(false); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();