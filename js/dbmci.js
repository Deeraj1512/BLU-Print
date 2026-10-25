/* ============================================================
   BLU-Print — js/dbmci.js  (v3.1 — 2026-10-25)
   ------------------------------------------------------------
   College timetable module · DBMCI OTO Mentorship
   Source: "UPDATED REVISION SCHEDULE.pdf" (16 Oct 2026 - 16 Jan 2027, 93 days)
   Daily routine: handwritten schedule v3 (2026-10-25) — 6:00 wake → 22:30 lights out

   This is a "pure data + schedule builder" module used by Today/Calendar pages.
   To update the timetable, edit ONLY the DBMCI_DAYS array below.

   Changes vs v2:
   - Old data (BHATIA ERP 10: 2026-09-12 → 2027-01-17, 128 days) fully retired.
     The college's Updated Revision Schedule (published 2026-10-16) is now the
     single source of truth (93 days).
   - The new PDF is internally consistent — the three manual fixes that the old
     PDF needed (CT-5 → 12-31 / GT-4 → 11-22 / 01-07 = Physiology) no longer apply.
   - In the new PDF, Dec 17 and Dec 21 each appear twice (morning T&D exam + a
     new subject starting the same day). Merged into single days: exam +
     discussion in the morning, new subject starts in the afternoon.
   - Daily routine = handwritten v3: three study blocks at 9:00 / 13:30 / 17:30,
     backlog slot moved to 6:30, flashcards 20:30, PYQs + Error Lab 21:30,
     lights out 22:30. All labels in English, matching the handwritten sheet.
   - College exam days (T&D / GT / CTS / INICET): 8:00-12:00 exam + 13:00
     discussion automatically replace the morning slots.
   ============================================================ */

(function () {
  'use strict';

  var VERSION = '3.1';
  var SCHEDULE_START = '2026-10-16';
  var SCHEDULE_END = '2027-01-16';
  /* NEET PG 2027 exam date (only used for the countdown — update this one
     line when the official date is announced) */
  var NEET_PG_DATE = '2027-06-15';

  /* ------------------------------------------------------------
     1) College schedule data (93 days) — THE ONLY DATA ZONE.
        Edit the timetable here and nowhere else.
     Fields: d=date (YYYY-MM-DD) | t=type | s=subject | top=topics | ex=exam name
     Types:  subject=study day | td=T&D exam | gt=Grand Test
             cts=Cumulative Test | inicet=INICET | catchup=college catch-up day
     ------------------------------------------------------------ */
  var DBMCI_DAYS = [
    { d: '2026-10-16', t: 'subject', s: 'PSM 2', top: 'Communicable disease, bio stats, NCD, MCH' },
    { d: '2026-10-17', t: 'gt', ex: 'Grand Test' },
    { d: '2026-10-18', t: 'subject', s: 'PSM 2', top: 'Environment, occupational health, health management and health care delivery, health education, disaster management' },
    { d: '2026-10-19', t: 'td', ex: 'T&D Exam – PSM 2' },
    { d: '2026-10-20', t: 'subject', s: 'OBG 1', top: 'Gametogenesis, USG in Pregnancy, Antenatal Investigations, Amniotic Fluid, Physiological Changes in Pregnancy, Anaemia, Diabetes, HELLP Syndrome & Liver Disorders' },
    { d: '2026-10-21', t: 'subject', s: 'OBG 1', top: 'Multifetal Pregnancy, Ectopic Pregnancy, Contracted Pelvis, Cephalopelvic Disproportion, Fetal Skull Diameters' },
    { d: '2026-10-22', t: 'subject', s: 'OBG 1', top: 'Labor Terminology, Mechanism of Labor, Partograph, Leopold Maneuvers, Malpresentations, Postpartum Hemorrhage, Instrumental Deliveries, Cesarean Section, Obstetrics Consolidation & CTG / Pelvimetry Images' },
    { d: '2026-10-23', t: 'td', ex: 'T&D Exam – OBG 1' },
    { d: '2026-10-24', t: 'subject', s: 'Gyne-1', top: 'Reproductive Physiology, Menstrual Cycle, Gametogenesis, Ovarian Cycle, Corpus Luteum, Hirsutism, PCOS, Menopause, Prolactin Disorders, Senile Vaginitis, Asherman Syndrome' },
    { d: '2026-10-25', t: 'subject', s: 'Gyne-1', top: 'OHSS, Prolactinoma, Sheehan Syndrome, Pituitary Apoplexy, Infertility Workup & ART, Pelvic Infections (PID, STIs), Pelvic Organ Prolapse, Endometriosis, Adenomyosis, Uterine Fibroids (FIGO), Endometrial Polyps, Hysteroscopy & Laparoscopy in Gynaecology, Cervical Lesions, Urinary Fistulae, Vulval Cancer, Mullerian Malformations, Disorders of Sexual Development' },
    { d: '2026-10-26', t: 'subject', s: 'Gyne-1', top: 'Vulval/Vaginal Cysts, Primary & Secondary Amenorrhea, Ovarian Tumors/Cancer, Endometrial Malignancies, Contraceptive Methods & Terminal Sterilization' },
    { d: '2026-10-27', t: 'td', ex: 'T&D Exam – Gyne' },
    { d: '2026-10-28', t: 'subject', s: 'Biochem', top: 'Enzymes & Porphyrins' },
    { d: '2026-10-29', t: 'subject', s: 'Biochem', top: 'Heme Synthesis & Porphyria' },
    { d: '2026-10-30', t: 'subject', s: 'Biochem', top: 'Amino Acids & Proteins' },
    { d: '2026-10-31', t: 'subject', s: 'Biochem', top: 'Carbohydrates + Lipids + Glucose & Transporters' },
    { d: '2026-11-01', t: 'inicet', ex: 'INICET Exam' },
    { d: '2026-11-02', t: 'subject', s: 'Biochem', top: 'Vitamins + Genetics + Molecular Genetics' },
    { d: '2026-11-03', t: 'td', ex: 'T&D Exam – Bio Chem' },
    { d: '2026-11-04', t: 'cts', ex: 'CTS (OBG + GYNE + BIOCHEM)' },
    { d: '2026-11-05', t: 'catchup' },
    { d: '2026-11-06', t: 'subject', s: 'Anatomy 1', top: 'Head, Neck & Face' },
    { d: '2026-11-07', t: 'subject', s: 'Anatomy 1', top: 'Head, Neck & Face' },
    { d: '2026-11-08', t: 'subject', s: 'Anatomy 1', top: 'Neuroanatomy' },
    { d: '2026-11-09', t: 'subject', s: 'Anatomy 1', top: 'Neuroanatomy' },
    { d: '2026-11-10', t: 'td', ex: 'T&D Exam – Anatomy 1' },
    { d: '2026-11-11', t: 'subject', s: 'Anatomy 2', top: 'Embryology' },
    { d: '2026-11-12', t: 'subject', s: 'Anatomy 2', top: 'Upper & Lower Limb' },
    { d: '2026-11-13', t: 'subject', s: 'Anatomy 2', top: 'Thorax, Abdomen & Perineum' },
    { d: '2026-11-14', t: 'td', ex: 'T&D Exam – Anatomy 2' },
    { d: '2026-11-15', t: 'gt', ex: 'Grand Test' },
    { d: '2026-11-16', t: 'subject', s: 'Pathology 1', top: 'Cell Injury, Inflammation' },
    { d: '2026-11-17', t: 'subject', s: 'Pathology 1', top: 'Immune System, Neoplasia' },
    { d: '2026-11-18', t: 'subject', s: 'Pathology 1', top: 'Haematology' },
    { d: '2026-11-19', t: 'td', ex: 'T&D Exam – Patho 1' },
    { d: '2026-11-20', t: 'subject', s: 'Pathology 2', top: 'CVS, Skin, Lungs, Liver' },
    { d: '2026-11-21', t: 'subject', s: 'Pathology 2', top: 'Kidney, Endocrine, CNS' },
    { d: '2026-11-22', t: 'subject', s: 'Pathology 2', top: 'SWT' },
    { d: '2026-11-23', t: 'td', ex: 'T&D Exam – Patho 2' },
    { d: '2026-11-24', t: 'subject', s: 'Surgery 1', top: 'Trauma' },
    { d: '2026-11-25', t: 'subject', s: 'Surgery 1', top: 'Breast' },
    { d: '2026-11-26', t: 'subject', s: 'Surgery 1', top: 'Urology and Hernia' },
    { d: '2026-11-27', t: 'td', ex: 'T&D Exam – Surgery 1' },
    { d: '2026-11-28', t: 'subject', s: 'Surgery 2', top: 'GIT' },
    { d: '2026-11-29', t: 'subject', s: 'Surgery 2', top: 'Gen Surgery' },
    { d: '2026-11-30', t: 'subject', s: 'Surgery 2', top: 'Glands + any surgery backlogs' },
    { d: '2026-12-01', t: 'td', ex: 'T&D Exam – Surgery 2' },
    { d: '2026-12-02', t: 'subject', s: 'Derma', top: 'Intro, layers of skin, epidermal cells, adnexal disorders, melanin disorder, skin cancers, facial skin lesion, slope is' },
    { d: '2026-12-03', t: 'subject', s: 'Derma', top: "Mast cell disorder, Wood's lamp, DEJ disorders, immunofluorescence, scalp hair cycle, nail disorders, TB and leprosy" },
    { d: '2026-12-04', t: 'subject', s: 'Derma', top: 'STD, psoriasis, LP, infections, eczema, blistering disorder' },
    { d: '2026-12-05', t: 'td', ex: 'T&D Exam – Derma' },
    { d: '2026-12-06', t: 'gt', ex: 'Grand Test' },
    { d: '2026-12-07', t: 'subject', s: 'Micro 1', top: 'Gen Micro and Immunology' },
    { d: '2026-12-08', t: 'subject', s: 'Micro 1', top: 'Bacteriology' },
    { d: '2026-12-09', t: 'td', ex: 'T&D Exam – Micro 1' },
    { d: '2026-12-10', t: 'subject', s: 'Micro 2', top: 'Mycology' },
    { d: '2026-12-11', t: 'subject', s: 'Micro 2', top: 'Virology' },
    { d: '2026-12-12', t: 'subject', s: 'Micro 2', top: 'Parasitology' },
    { d: '2026-12-13', t: 'td', ex: 'T&D Exam – Micro 2' },
    { d: '2026-12-14', t: 'subject', s: 'Medicine 1', top: 'Neurology' },
    { d: '2026-12-15', t: 'subject', s: 'Medicine 1', top: 'Neurology' },
    { d: '2026-12-16', t: 'subject', s: 'Medicine 1', top: 'Endocrine' },
    { d: '2026-12-17', t: 'td', ex: 'T&D Exam – Medicine 1', s: 'Medicine 2', top: 'CVS' },
    { d: '2026-12-18', t: 'subject', s: 'Medicine 2', top: 'Rheumatology' },
    { d: '2026-12-19', t: 'subject', s: 'Medicine 2', top: 'GIT' },
    { d: '2026-12-20', t: 'subject', s: 'Medicine 2', top: 'Respiratory' },
    { d: '2026-12-21', t: 'td', ex: 'T&D Exam – Medicine 2', s: 'Medicine 3', top: 'Endocrinology' },
    { d: '2026-12-22', t: 'subject', s: 'Medicine 3', top: 'Nephrology' },
    { d: '2026-12-23', t: 'subject', s: 'Medicine 3', top: 'Gastroenterology' },
    { d: '2026-12-24', t: 'td', ex: 'T&D Exam – Medicine 3' },
    { d: '2026-12-25', t: 'subject', s: 'Forensic Medicine', top: 'Identification, Medical Jurisprudence, Injuries' },
    { d: '2026-12-26', t: 'subject', s: 'Forensic Medicine', top: 'Asphyxia, Sexual Offences and Abortion, Childhood Violence, Infanticide and Starvation' },
    { d: '2026-12-27', t: 'subject', s: 'Forensic Medicine', top: 'Toxicology, Identification, Death, PM Changes' },
    { d: '2026-12-28', t: 'td', ex: 'T&D Exam' },
    { d: '2026-12-29', t: 'cts', ex: 'Cumulative Test - 5 (Micro + Medicine + F.M)' },
    { d: '2026-12-30', t: 'subject', s: 'Anaesthesia', top: 'Preoperative evaluation and monitoring, Airway management and resuscitation, Muscle relaxants, General anaesthesia, Local and regional anaesthesia' },
    { d: '2026-12-31', t: 'subject', s: 'Anaesthesia', top: 'Specific conditions, Complications of anaesthesia' },
    { d: '2027-01-01', t: 'td', ex: 'T&D Exam' },
    { d: '2027-01-02', t: 'gt', ex: 'Grand Test' },
    { d: '2027-01-03', t: 'subject', s: 'Physiology', top: 'General + Nerve Muscle Physiology + Exercise Physiology + Blood + Kidney' },
    { d: '2027-01-04', t: 'subject', s: 'Physiology', top: 'CVS, Respiratory, CNS' },
    { d: '2027-01-05', t: 'subject', s: 'Physiology', top: 'Endocrinology + Reproductive System, GIT & Kidney' },
    { d: '2027-01-06', t: 'td', ex: 'T&D Exam' },
    { d: '2027-01-07', t: 'subject', s: 'Orthopaedics', top: 'Fracture and its complications: Neck, Upper, Lower Limb' },
    { d: '2027-01-08', t: 'subject', s: 'Orthopaedics', top: 'Spine & Pelvis, Bone and Joint Infections' },
    { d: '2027-01-09', t: 'subject', s: 'Orthopaedics', top: 'Paediatric Orthopaedics, Metabolic Bone Diseases, Arthritis & Other Joint Disorders, Nerve Injuries' },
    { d: '2027-01-10', t: 'subject', s: 'Orthopaedics', top: 'Bone Tumors, Instruments, Advanced Orthopaedics & Management' },
    { d: '2027-01-11', t: 'td', ex: 'T&D Exam' },
    { d: '2027-01-12', t: 'subject', s: 'Psychiatry', top: 'Facets of Clinical Psychiatry, Mood Disorders, Psychotic Disorders, Neuropsychiatry, Neurocognitive Disorders, Personality Disorders, Substance-Related Disorders, Neurosis' },
    { d: '2027-01-13', t: 'subject', s: 'Psychiatry', top: 'Psychiatric Emergencies, Specific Psychiatric Conditions, Sexuality, Child Psychiatry, Forensic Psychiatry' },
    { d: '2027-01-14', t: 'td', ex: 'T&D Exam' },
    { d: '2027-01-15', t: 'cts', ex: 'CTS (PSY + Ortho + Phys + Anaesthesia)' },
    { d: '2027-01-16', t: 'gt', ex: 'Grand Test' }
  ];

  /* ------------------------------------------------------------
     2) Small utilities
     ------------------------------------------------------------ */
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function todayStr() {
    var t = new Date();
    return t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate());
  }

  /* Accepts: Date object / 'YYYY-MM-DD' / 'YYYY-M-D' / 'DD-MM-YYYY' */
  function normDate(x) {
    if (x === undefined || x === null) return todayStr();
    if (x instanceof Date && !isNaN(x)) {
      return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate());
    }
    if (typeof x === 'string') {
      var m = x.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (m) return m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]);
      var m2 = x.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
      if (m2) return m2[3] + '-' + pad(+m2[2]) + '-' + pad(+m2[1]);
    }
    return null;
  }

  var WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function weekdayOf(iso) {
    var p = iso.split('-');
    return WEEKDAYS[new Date(+p[0], +p[1] - 1, +p[2]).getDay()];
  }

  function diffDays(fromIso, toIso) {
    function ts(s) { var p = s.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
    return Math.round((ts(toIso) - ts(fromIso)) / 86400000);
  }

  var BY_DATE = {};
  DBMCI_DAYS.forEach(function (e) {
    BY_DATE[e.d] = e;
    /* Long field names too, so pages can read either style */
    e.date = e.d;
    e.type = e.t;
    if (e.s) e.subject = e.s;
    if (e.top) e.topics = e.top;
    if (e.ex) e.examName = e.ex;
    e.weekday = weekdayOf(e.d);
  });

  function isExamType(t) { return t === 'td' || t === 'gt' || t === 'cts' || t === 'inicet'; }

  /* For exam days: nearest earlier study-day subject (drives the pre-exam
     review & discussion-review hints) */
  function contextSubject(iso) {
    var idx = -1, i;
    for (i = 0; i < DBMCI_DAYS.length; i++) { if (DBMCI_DAYS[i].d === iso) { idx = i; break; } }
    if (idx < 0) return null;
    for (i = idx - 1; i >= 0; i--) {
      if (DBMCI_DAYS[i].t === 'subject') return DBMCI_DAYS[i].s;
    }
    return null;
  }

  /* Backlog slot: September backlog until Oct 31, then weakest subject */
  function backlogNote(iso) {
    return iso <= '2026-10-31'
      ? 'Clear September backlog — as much as you can'
      : 'Weakest subject (check the Stats page for your weakest)';
  }

  /* ------------------------------------------------------------
     3) Daily routine skeleton (handwritten v3, 2026-10-25)
        6:00 wake → study blocks 9:00/13:30/17:30 → flashcards 20:30
        → PYQs + Error Lab 21:30 → 22:30 lights out
     ------------------------------------------------------------ */
  function it(start, end, title, note, opts) {
    opts = opts || {};
    var tool = opts.tool || null;
    var HREF = { focus: 'focus.html', flashcards: 'flashcards.html', errors: 'errors.html', quiz: 'quiz.html' };
    return {
      start: start,
      end: end || '',
      time: end ? (start + '–' + end) : start,
      title: title,
      label: title,   /* compat alias */
      name: title,    /* compat alias */
      note: note || '',
      tool: tool,
      href: opts.href || (tool ? HREF[tool] || null : null),
      mins: opts.mins || 0,
      kind: opts.kind || null   /* 'exam' = slot taken by the college exam */
    };
  }

  /* Shared evening items (same across all day types) */
  function eveningItems() {
    return [
      it('19:30', '20:30', 'Break + Marrow Custom Module', "Marrow Custom Module; or the app's 10-question Quick Quiz instead"),
      it('20:30', '21:30', "Review Yesterday's Subject", "Due flashcards from yesterday's subject (SM-2 picks them for you)", { tool: 'flashcards', mins: 60 }),
      it('21:30', '22:30', 'PYQs + Revision', 'Quick 10 PYQs, then fix mistakes in the Error Lab', { tool: 'quiz', mins: 60 }),
      it('22:30', '', 'Lights Out', "Phone out of arm's reach")
    ];
  }

  /* Normal study day */
  function itemsNormal(day, iso) {
    var s = (day && day.s) ? day.s : 'Self-chosen subject (weakest first)';
    var top = (day && day.top) ? day.top : '';
    return [
      it('06:00', '06:30', 'Fresh Up', 'No phone — just get fresh'),
      it('06:30', '07:30', 'Backlog', backlogNote(iso), { tool: 'focus', mins: 60 }),
      it('07:30', '08:00', "Today's Subject Preview", "Skim today's subject & topics; write down 3 things to finish today"),
      it('08:00', '09:00', 'Breakfast', 'Eat well — long day ahead'),
      it('09:00', '12:30', 'Study Block 1 · ' + s, top || "Today's core topics", { tool: 'focus', mins: 210 }),
      it('12:30', '13:30', 'Lunch', 'Eat away from the desk; rest your eyes'),
      it('13:30', '16:30', 'Study Block 2 · ' + s, "Continue today's topics + Marrow videos", { tool: 'focus', mins: 180 }),
      it('16:30', '17:30', 'Break', 'Walk / snack / call family'),
      it('17:30', '19:30', 'Study Block 3 · ' + s, "Wrap up today's topics, do a set of MCQs", { tool: 'focus', mins: 120 })
    ].concat(eveningItems());
  }

  /* Exam days: T&D / Grand Test / CTS / INICET (8:00-12:00 exam + 13:00 discussion) */
  function itemsExam(day, iso) {
    var exName = day.ex || 'College Exam';
    var isGT = day.t === 'gt';
    var isCTS = day.t === 'cts';
    var isInicet = day.t === 'inicet';
    var ctx = contextSubject(iso);   /* subject the exam belongs to (nearest earlier study day) */

    /* Pre-exam rapid review */
    var preTitle = 'Pre-Exam Rapid Review';
    var preNote;
    if (isGT || isCTS || isInicet) {
      preNote = 'Formula sheets + your mistake log — one quick pass over all subjects';
    } else {
      preNote = (ctx ? ctx + ': ' : '') + 'mistakes & high-yield points only — no new topics';
    }

    /* Afternoon blocks assigned by day type */
    var pm1Title, pm1Note, pm2Title, pm2Note;
    if (day.s) {                       /* exam + new subject starts today (Dec 17 / Dec 21) */
      pm1Title = 'Study Block · ' + day.s;
      pm1Note = 'New subject starts: ' + (day.top || day.s);
      pm2Title = 'Study Block · ' + day.s;
      pm2Note = 'Continue ' + day.s;
    } else if (isGT || isCTS) {
      pm1Title = (isGT ? 'GT' : 'CTS') + ' Mistake Review';
      pm1Note = 'Go through every wrong answer; snap mistakes into the Error Lab';
      pm2Title = 'Weak Areas + Backlog';
      pm2Note = "Today's weak spots + earlier backlog topics";
    } else if (isInicet) {
      pm1Title = 'Rest / Light Review';
      pm1Note = 'Big exam done — rest first; skim mistakes if you feel like it';
      pm2Title = 'Weak Areas + Backlog';
      pm2Note = 'Weak areas exposed by INICET, or backlog topics';
    } else {
      pm1Title = 'Discussion Mistake Review' + (ctx ? ' · ' + ctx : '');
      pm1Note = 'Go one-by-one through what you got wrong in the 13:00 discussion';
      pm2Title = 'Weak Areas + Backlog';
      pm2Note = "Today's weak spots + backlog topics";
    }

    var head = [
      it('06:00', '06:30', 'Fresh Up', 'No phone — just get fresh'),
      it('06:30', '07:30', preTitle, preNote, { tool: 'focus', mins: 60 }),
      it('07:30', '08:00', 'Breakfast (early)', "Exam starts at 8 — don't be late"),
      it('08:00', '12:00', exName, 'Phone silent; skip unsure questions, guess strategically at the end (+4/−1)', { kind: 'exam' }),
      it('12:00', '13:00', 'Lunch + Relax', "Don't check answers after the exam — eat first")
    ];
    var discuss = isInicet
      ? [it('13:00', '14:30', 'Head Home & Rest', 'No discussion for INICET — head home, eat, decompress')]
      : [it('13:00', '14:30', 'Test & Discussion Session', exName + ' discussion — mark every question you got wrong')];

    return head.concat(discuss, [
      it('14:30', '16:30', pm1Title, pm1Note, { tool: 'focus', mins: 120 }),
      it('16:30', '17:30', 'Break', 'Walk / snack / call family'),
      it('17:30', '19:30', pm2Title, pm2Note, { tool: 'focus', mins: 120 })
    ], eveningItems());
  }

  /* College Catch-up Day (Nov 5): full day of backlog clearing */
  function itemsCatchup(iso) {
    return [
      it('06:00', '06:30', 'Fresh Up', 'No phone — just get fresh'),
      it('06:30', '07:30', 'Backlog', backlogNote(iso), { tool: 'focus', mins: 60 }),
      it('07:30', '08:00', "Today's Plan", 'College gave a full catch-up day — list your 3 most painful backlog topics'),
      it('08:00', '09:00', 'Breakfast', 'Eat well — long day ahead'),
      it('09:00', '12:30', 'Study Block 1 · Backlog Clearing', 'Clear the most painful backlog topics first', { tool: 'focus', mins: 210 }),
      it('12:30', '13:30', 'Lunch', 'Eat away from the desk; rest your eyes'),
      it('13:30', '16:30', 'Study Block 2 · Weakest Subject', 'Your weakest subject on Stats — main attack today', { tool: 'focus', mins: 180 }),
      it('16:30', '17:30', 'Break', 'Walk / snack / call family'),
      it('17:30', '19:30', 'Study Block 3 · Weak-Area MCQs', 'Test yourself with an MCQ set on weak areas', { tool: 'focus', mins: 120 })
    ].concat(eveningItems());
  }

  /* ------------------------------------------------------------
     4) Public API: a date in → the full day plan out
     ------------------------------------------------------------ */
  function getDay(x) {
    var iso = normDate(x);
    if (!iso) return null;
    var day = BY_DATE[iso];
    if (!day) return null;
    return {
      date: iso, weekday: day.weekday, type: day.t,
      subject: day.s || null, topics: day.top || '', examName: day.ex || null,
      raw: day
    };
  }

  function getDayPlan(x) {
    var iso = normDate(x);
    if (!iso) return null;
    var day = BY_DATE[iso];
    var items, title, subtitle, type;

    if (day && day.t === 'catchup') {
      type = 'catchup';
      title = 'Catch-up Day';
      subtitle = 'College catch-up day — clear backlog all day';
      items = itemsCatchup(iso);
    } else if (day && isExamType(day.t)) {
      type = day.t;
      title = day.ex;
      subtitle = day.t === 'gt' ? 'Grand Test day — 8:00 exam · 13:00 discussion'
        : day.t === 'cts' ? 'Cumulative Test day — 8:00 exam · 13:00 discussion'
          : day.t === 'inicet' ? 'INICET — the real thing. Go get it'
            : 'T&D exam day — 8:00 exam · 13:00 discussion';
      items = itemsExam(day, iso);
    } else if (day) {
      type = 'subject';
      title = day.s;
      subtitle = day.top || '';
      items = itemsNormal(day, iso);
    } else {
      /* Dates outside the college schedule: generic self-study plan */
      type = 'self';
      title = 'Self-Study';
      subtitle = 'Outside the college schedule — your own pace, weakest subject first';
      items = itemsNormal(null, iso);
    }

    var focusMins = 0;
    items.forEach(function (m) { if (m.tool === 'focus') focusMins += m.mins; });

    return {
      date: iso,
      weekday: weekdayOf(iso),
      type: type,
      inRange: !!day,
      title: title,
      subject: (day && day.s) ? day.s : null,
      topics: (day && day.top) ? day.top : '',
      exam: (day && day.ex) ? { name: day.ex, time: '08:00–12:00' } : null,
      subtitle: subtitle,
      items: items,
      focusMins: focusMins,
      source: 'dbmci v' + VERSION
    };
  }

  /* Next college exam (T&D/GT/CTS/INICET), for countdowns */
  function nextExam(x) {
    var iso = normDate(x);
    for (var i = 0; i < DBMCI_DAYS.length; i++) {
      var e = DBMCI_DAYS[i];
      if (isExamType(e.t) && e.d >= iso) {
        return { date: e.d, name: e.ex, type: e.t, days: diffDays(iso, e.d) };
      }
    }
    return null;
  }

  /* Countdown: NEET PG + next college exam */
  function countdown(x) {
    var iso = normDate(x);
    return {
      date: iso,
      neet: { date: NEET_PG_DATE, days: diffDays(iso, NEET_PG_DATE) },
      nextExam: nextExam(iso),
      scheduleEnd: { date: SCHEDULE_END, days: diffDays(iso, SCHEDULE_END) }
    };
  }

  function isInRange(x) {
    var iso = normDate(x);
    return !!BY_DATE[iso];
  }

  /* ------------------------------------------------------------
     5) Exports (multiple aliases so old & new pages both work)
     ------------------------------------------------------------ */
  var API = {
    VERSION: VERSION,
    START: SCHEDULE_START,
    END: SCHEDULE_END,
    NEET_PG_DATE: NEET_PG_DATE,
    DAYS: DBMCI_DAYS,
    getDay: getDay,
    getDayPlan: getDayPlan,
    buildDay: getDayPlan,
    getSchedule: getDayPlan,
    planFor: getDayPlan,
    today: function () { return getDayPlan(null); },
    nextExam: nextExam,
    countdown: countdown,
    isInRange: isInRange
  };

  window.DBMCI_DAYS = DBMCI_DAYS;                 /* raw array (legacy name kept) */
  window.DBMCI = API;                             /* main API object */

  /* Global function aliases (compat with different call styles) */
  window.DBMCI_getDay = getDay;
  window.DBMCI_getDayPlan = getDayPlan;
  window.DBMCI_getSchedule = getDayPlan;
  window.DBMCI_buildDay = getDayPlan;
  window.DBMCI_nextExam = nextExam;
  window.DBMCI_countdown = countdown;
  window.DBMCI_VERSION = VERSION;
})();