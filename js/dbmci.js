"use strict";
/* ============================================================
   dbmci.js v2 — Institute loader + HER handwritten daily rhythm.
   Day skeleton (6:00 wake … 10:00 lights-out) is hard-coded from
   her own plan. Institute exams (8 AM–12 PM) + discussion (1 PM)
   replace morning sessions; evening keeps her rhythm.
   Backlog slot (6 PM) runs the September block until 31-Oct,
   then becomes weakest-subject time.
   Setup page date/time fields are IGNORED for this plan — only
   the exam date (countdown) is used. PDF corrections applied:
   Cumulative-5 → 31-12-2026, GT-4 → 22-11-2026, 07-Jan exam =
   Physiology, both Medicine Part-II exams kept.
   ============================================================ */

const SUBJ_MAP = {
  "OBG (Obst)": "Obstetrics & Gynaecology", "OBG (Gyn)": "Obstetrics & Gynaecology",
  "PSM": "Community Medicine (PSM)", "Bio Chemistry": "Biochemistry", "Micro Biology": "Microbiology",
  "Derma": "Dermatology", "Forensic Medicine": "Forensic Medicine (FMT)"
};
function normSubj(s) { return SUBJ_MAP[s] || s; }

const DBMCI_DAYS = [
  { d: "2026-09-12", t: "study", s: "Pharmacology", k: "General Pharmacology + Autonomic Nervous System (ANS)" },
  { d: "2026-09-13", t: "study", s: "Pharmacology", k: "Respiratory System + Kidney, GIT + Autacoids + Blood & Immunomodulator Drugs" },
  { d: "2026-09-14", t: "tdex", s: "Pharmacology", x: "Pharmacology Part - I Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM" },
  { d: "2026-09-15", t: "study", s: "Pharmacology", k: "Central & Peripheral Nervous System" },
  { d: "2026-09-16", t: "study", s: "Pharmacology", k: "Antimicrobial Drugs" },
  { d: "2026-09-17", t: "study", s: "Pharmacology", k: "Anticancer Drugs + Cardiovascular System (CVS) + Endocrine Pharmacology + Immunopharmacology" },
  { d: "2026-09-18", t: "tdex", s: "Pharmacology", x: "Pharmacology Part - II Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM" },
  { d: "2026-09-19", t: "study", s: "Radiology", k: "General Radiology" },
  { d: "2026-09-20", t: "study", s: "Radiology", k: "Nuclear Radiology + Obstetric Imaging + Musculoskeletal Radiology" },
  { d: "2026-09-21", t: "study", s: "Radiology", k: "Systemic Radiology — Neuro, Head & Neck, Thoracic & Cardiovascular, Abdominal, Genitourinary" },
  { d: "2026-09-22", t: "tdex", s: "Radiology", x: "Radiology Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM" },
  { d: "2026-09-23", t: "study", s: "Ophthalmology", k: "Anatomy & Development of Eye + Lens, Glaucoma (complete)" },
  { d: "2026-09-24", t: "study", s: "Ophthalmology", k: "Conjunctiva & Sclera + Uvea + Community Ophthalmology" },
  { d: "2026-09-25", t: "study", s: "Ophthalmology", k: "Retina (complete) + Neuro-Ophthalmology + Squint + Cornea" },
  { d: "2026-09-26", t: "tdex", s: "Ophthalmology", x: "Ophthalmology Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM" },
  { d: "2026-09-27", t: "study", s: "Paediatrics", k: "Normal Growth, Assessment, Puberty, Development (Motor, Language, Social), Breastfeeding, Severe Acute Malnutrition, Rickets, Scurvy, Normal Newborn Examination, SGA, Neonatal Reflexes" },
  { d: "2026-09-28", t: "studytest", s: "Paediatrics", k: "APGAR, Neonatal Resuscitation, Sepsis, Birth Asphyxia, Neonatal Seizures, Jaundice, Congenital Anomalies, Childhood Seizures, Cerebral Palsy, Meningitis, Foreign Body, RSV Bronchiolitis, Pneumonia, Asthma, Cystic Fibrosis", n: "Cumulative Test - 1 (Pharmacology + Radiology + Ophthalmology)" },
  { d: "2026-09-29", t: "study", s: "Paediatrics", k: "Fetal Circulation, Cyanotic & Acyanotic CHD, Rheumatic Fever, Kawasaki, Hypertrophic Pyloric Stenosis, Hirschsprung, Celiac, Diarrhea, Nephrotic/Nephritic, HUS, CAH, Thyroid Dysgenesis, Pubertal Disorders" },
  { d: "2026-09-30", t: "tdex", s: "Paediatrics", x: "Paediatrics Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM" },
  { d: "2026-10-01", t: "study", s: "ENT", k: "Ear / Throat" },
  { d: "2026-10-02", t: "study", s: "ENT", k: "Throat / Nose" },
  { d: "2026-10-03", t: "grand", n: "Grand Test - 1" },
  { d: "2026-10-04", t: "tdex", s: "ENT", x: "ENT Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM" },
  { d: "2026-10-05", t: "oneshot" }, { d: "2026-10-06", t: "oneshot" }, { d: "2026-10-07", t: "oneshot" },
  { d: "2026-10-08", t: "oneshot" }, { d: "2026-10-09", t: "oneshot" }, { d: "2026-10-10", t: "oneshot" },
  { d: "2026-10-11", t: "oneshot" },
  { d: "2026-10-12", t: "study", s: "PSM", k: "Concept of health and disease indicators, biomedical waste and international health" },
  { d: "2026-10-13", t: "study", s: "PSM", k: "Infectious disease, levels of prevention and vaccines" },
  { d: "2026-10-14", t: "tdex", s: "PSM", x: "PSM Part - I Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM" },
  { d: "2026-10-15", t: "study", s: "PSM", k: "Communicable disease, bio stats, NCD, MCH" },
  { d: "2026-10-16", t: "study", s: "PSM", k: "Environment, occupational health, health management and health care delivery, health education, disaster management" },
  { d: "2026-10-17", t: "grand", n: "Grand Test - 2" },
  { d: "2026-10-18", t: "tdex", s: "PSM", x: "PSM Part - II Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM" },
  { d: "2026-10-19", t: "study", s: "OBG (Obst)", k: "Gametogenesis, USG in Pregnancy, Antenatal Investigations, Amniotic Fluid, Physiological Changes in Pregnancy, Anaemia, Diabetes, HELLP Syndrome & Liver Disorders" },
  { d: "2026-10-20", t: "study", s: "OBG (Obst)", k: "Multifetal Pregnancy, Ectopic Pregnancy, Contracted Pelvis, Cephalopelvic Disproportion, Fetal Skull Diameters" },
  { d: "2026-10-21", t: "study", s: "OBG (Obst)", k: "Labor Terminology, Mechanism of Labor, Partograph, Leopold Maneuvers, Malpresentations, Postpartum Hemorrhage, Instrumental Deliveries, Cesarean Section" },
  { d: "2026-10-22", t: "tdexstudy", s: "OBG (Obst)", k: "Obstetrics Consolidation & CTG / Pelvimetry Images", x: "OBG Part - I Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM" },
  { d: "2026-10-23", t: "study", s: "OBG (Gyn)", k: "Reproductive Physiology, Menstrual Cycle, Gametogenesis, Ovarian Cycle, Corpus Luteum, Hirsutism, PCOS, Menopause, Prolactin Disorders, Senile Vaginitis, Asherman Syndrome" },
  { d: "2026-10-24", t: "study", s: "OBG (Gyn)", k: "OHSS, Prolactinoma, Sheehan Syndrome, Pituitary Apoplexy, Infertility Workup & ART, Pelvic Infections (PID, STIs), Pelvic Organ Prolapse" },
  { d: "2026-10-25", t: "cum", n: "Cumulative Test - 2 (Paediatrics + ENT + PSM)" },
  { d: "2026-10-26", t: "study", s: "OBG (Gyn)", k: "Endometriosis, Adenomyosis, Uterine Fibroids (FIGO), Endometrial Polyps, Hysteroscopy & Laparoscopy in Gynaecology, Cervical Lesions, Urinary Fistulae, Vulval Cancer, Müllerian Malformations, Disorders of Sexual Development" },
  { d: "2026-10-27", t: "tdexstudy", s: "OBG (Gyn)", k: "Vulval/Vaginal Cysts, Primary & Secondary Amenorrhea, Ovarian Tumors/Cancer, Endometrial Malignancies, Contraceptive Methods & Terminal Sterilization", x: "OBG Part - II Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM" },
  { d: "2026-10-28", t: "study", s: "Bio Chemistry", k: "Enzymes & Porphyrins" },
  { d: "2026-10-29", t: "study", s: "Bio Chemistry", k: "Heme Synthesis & Porphyria" },
  { d: "2026-10-30", t: "study", s: "Bio Chemistry", k: "Amino Acids & Proteins" },
  { d: "2026-10-31", t: "study", s: "Bio Chemistry", k: "Carbohydrates + Lipids + Glucose & Transporters" },
  { d: "2026-11-01", t: "inicet" },
  { d: "2026-11-02", t: "study", s: "Bio Chemistry", k: "Vitamins + Genetics + Molecular Genetics" },
  { d: "2026-11-03", t: "tdex", s: "Bio Chemistry", x: "Biochemistry Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM" },
  { d: "2026-11-04", t: "study", s: "Anatomy", k: "Head, Neck & Face" },
  { d: "2026-11-05", t: "study", s: "Anatomy", k: "Neuroanatomy" },
  { d: "2026-11-06", t: "gtrev" },
  { d: "2026-11-07", t: "gtrev" },
  { d: "2026-11-08", t: "grand", n: "Grand Test - 3" },
  { d: "2026-11-09", t: "gtreview" },
  { d: "2026-11-10", t: "tdex", s: "Anatomy", x: "Anatomy Part - I Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM" },
  { d: "2026-11-11", t: "study", s: "Anatomy", k: "Embryology" },
  { d: "2026-11-12", t: "study", s: "Anatomy", k: "Upper & Lower Limb" },
  { d: "2026-11-13", t: "study", s: "Anatomy", k: "Thorax, Abdomen & Perineum" },
  { d: "2026-11-14", t: "tdex", s: "Anatomy", x: "Anatomy Part - II Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM" },
  { d: "2026-11-15", t: "cum", n: "Cumulative Test - 3 (OBG + Biochemistry + Anatomy)" },
  { d: "2026-11-16", t: "study", s: "Pathology", k: "Cell Injury, Inflammation" },
  { d: "2026-11-17", t: "study", s: "Pathology", k: "Immune System, Neoplasia" },
  { d: "2026-11-18", t: "study", s: "Pathology", k: "Haematology" },
  { d: "2026-11-19", t: "tdex", s: "Pathology", x: "Pathology Part - I Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM" },
  { d: "2026-11-20", t: "study", s: "Pathology", k: "CVS, Skin, Lungs, Liver" },
  { d: "2026-11-21", t: "study", s: "Pathology", k: "Kidney, Endocrine, CNS" },
  { d: "2026-11-22", t: "grand", n: "Grand Test - 4" },
  { d: "2026-11-23", t: "tdex", s: "Pathology", x: "Pathology Part - II Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM" },
  { d: "2026-11-24", t: "study", s: "Surgery", k: "Trauma" },
  { d: "2026-11-25", t: "study", s: "Surgery", k: "Breast" },
  { d: "2026-11-26", t: "study", s: "Surgery", k: "Urology and hernia" },
  { d: "2026-11-27", t: "tdex", s: "Surgery", x: "Surgery Part - I Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM" },
  { d: "2026-11-28", t: "study", s: "Surgery", k: "GIT" },
  { d: "2026-11-29", t: "study", s: "Surgery", k: "Gen surgery" },
  { d: "2026-11-30", t: "study", s: "Surgery", k: "Glands + any surgery backlogs" },
  { d: "2026-12-01", t: "tdex", s: "Surgery", x: "Surgery Part - II Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM" },
  { d: "2026-12-02", t: "study", s: "Derma", k: "Intro, layers of skin, epidermal cells, Adnexal disorders, melanin disorders, skin cancers, facial skin lesions" },
  { d: "2026-12-03", t: "study", s: "Derma", k: "Mast cell disorder, woods lamp, DEJ disorders, immunofluorescence, scalp hair cycle, nail disorders, TB and leprosy" },
  { d: "2026-12-04", t: "study", s: "Derma", k: "STD, psoriasis, LP, infections, eczema, blistering disorder" },
  { d: "2026-12-05", t: "tdex", s: "Derma", x: "Derma Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM" },
  { d: "2026-12-06", t: "grand", n: "Grand Test - 5" },
  { d: "2026-12-07", t: "study", s: "Micro Biology", k: "General Microbiology & Immunology" },
  { d: "2026-12-08", t: "study", s: "Micro Biology", k: "Bacteriology" },
  { d: "2026-12-09", t: "cum", n: "Cumulative Test - 4 (Pathology + Surgery + Derma)" },
  { d: "2026-12-10", t: "tdex", s: "Micro Biology", x: "Micro Part - I Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM" },
  { d: "2026-12-11", t: "study", s: "Micro Biology", k: "Mycology" },
  { d: "2026-12-12", t: "study", s: "Micro Biology", k: "Virology" },
  { d: "2026-12-13", t: "study", s: "Micro Biology", k: "Parasitology" },
  { d: "2026-12-14", t: "tdex", s: "Micro Biology", x: "Micro Part - II Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM" },
  { d: "2026-12-15", t: "study", s: "Medicine", k: "Neurology" },
  { d: "2026-12-16", t: "study", s: "Medicine", k: "Neurology" },
  { d: "2026-12-17", t: "tdexstudy", s: "Medicine", k: "Endocrine", x: "Medicine Part - II Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM" },
  { d: "2026-12-18", t: "study", s: "Medicine", k: "CVS" },
  { d: "2026-12-19", t: "study", s: "Medicine", k: "Rheumatology" },
  { d: "2026-12-20", t: "grand", n: "Grand Test - 6" },
  { d: "2026-12-21", t: "tdexstudy", s: "Medicine", k: "GIT", x: "Medicine Part - II Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM" },
  { d: "2026-12-22", t: "study", s: "Medicine", k: "Respiratory" },
  { d: "2026-12-23", t: "study", s: "Medicine", k: "Endocrinology" },
  { d: "2026-12-24", t: "study", s: "Medicine", k: "Nephrology" },
  { d: "2026-12-25", t: "study", s: "Medicine", k: "Gastroenterology" },
  { d: "2026-12-26", t: "tdexstudy", s: "Medicine", k: "Medicine Revision (mixed high-yield)", x: "Medicine Part - III Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM" },
  { d: "2026-12-27", t: "study", s: "Forensic Medicine", k: "Identification, Medical Jurisprudence, Injuries" },
  { d: "2026-12-28", t: "study", s: "Forensic Medicine", k: "Asphyxia, Sexual Offences and Abortion, Childhood Violence, Infanticide and Starvation" },
  { d: "2026-12-29", t: "study", s: "Forensic Medicine", k: "Toxicology, Identification, Death, PM Changes" },
  { d: "2026-12-30", t: "tdex", s: "Forensic Medicine", x: "FMT Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM" },
  { d: "2026-12-31", t: "cum", n: "Cumulative Test - 5 (Microbiology + Medicine + F.M)" },
  { d: "2027-01-01", t: "study", s: "Anaesthesia", k: "Preoperative evaluation and monitoring, Airway management and resuscitation, Muscle relaxants, General anaesthesia, Local and regional anaesthesia" },
  { d: "2027-01-02", t: "study", s: "Anaesthesia", k: "Specific conditions, Complications of anaesthesia" },
  { d: "2027-01-03", t: "tdexgrand", s: "Anaesthesia", x: "Anaesthesia Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM", n: "Grand Test - 7" },
  { d: "2027-01-04", t: "study", s: "Physiology", k: "General + Nerve-Muscle Physiology + Exercise Physiology + Blood + Kidney" },
  { d: "2027-01-05", t: "study", s: "Physiology", k: "CVS, Respiratory, CNS" },
  { d: "2027-01-06", t: "study", s: "Physiology", k: "Endocrinology + Reproductive System, GIT & Kidney" },
  { d: "2027-01-07", t: "tdex", s: "Physiology", x: "Physiology Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM" },
  { d: "2027-01-08", t: "study", s: "Orthopaedics", k: "Fracture and its complications — Neck, Upper & Lower Limb" },
  { d: "2027-01-09", t: "study", s: "Orthopaedics", k: "Spine & Pelvis, Bone and Joint Infections" },
  { d: "2027-01-10", t: "study", s: "Orthopaedics", k: "Paediatric Orthopaedics, Metabolic Bone Diseases, Arthritis & Other Joint Disorders, Nerve Injuries" },
  { d: "2027-01-11", t: "study", s: "Orthopaedics", k: "Bone tumors, Instruments, Advanced Orthopaedics & Management" },
  { d: "2027-01-12", t: "tdex", s: "Orthopaedics", x: "Orthopaedics Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM" },
  { d: "2027-01-13", t: "study", s: "Psychiatry", k: "Facets of Clinical Psychiatry, Mood Disorders, Psychotic Disorders, Neuropsychiatry, Neurocognitive Disorders, Personality Disorders, Substance-Related Disorders, Neurosis" },
  { d: "2027-01-14", t: "study", s: "Psychiatry", k: "Psychiatric Emergencies, Specific Psychiatric Conditions, Sexuality, Child Psychiatry, Forensic Psychiatry" },
  { d: "2027-01-15", t: "cum", n: "Cumulative Test - 6 (Psychiatry + Orthopaedics + Physiology + Anaesthesia)" },
  { d: "2027-01-16", t: "tdex", s: "Psychiatry", x: "Psychiatry Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM" },
  { d: "2027-01-17", t: "grand", n: "Grand Test - 8" }
];

/* ============================================================
   HER DAILY RHYTHM — builders (times editable in plain sight)
   ============================================================ */
function st(t, d, l, subj) { return { time: t, dur: d, label: l, kind: "study", subject: subj || "", done: false }; }
function brk(t, d, l) { return { time: t, dur: d, label: l, kind: "break" }; }
function meal(t, d, l) { return { time: t, dur: d, label: l, kind: "meal" }; }
function life() {
  return [
    brk("06:00", 10, "⏰ Wake up + brush"),
    brk("06:10", 30, "🏃 Exercise"),
    brk("06:40", 40, "☀️ Bath, Pooja")];
}
function lightsOut() { return brk("22:00", 30, "😴 Lights out — phone in another room since 9:50"); }
function backSlot(backlog) {
  return st("18:00", 60, backlog
    ? "📥 Backlog catch-up — September block (Pharma → Radio → Ophth → Paed)"
    : "🎯 Weakest-subject slot — Surgery + its flashcards");
}
const ELAB = brk("15:00", 30, "🐛 Error Lab retests (10 min) + break");
const FAM = brk("17:20", 40, "💜 Break — family slot (DND off, they can talk)");
const CARDS = st("11:50", 30, "🃏 Flashcards — clear all due cards");
const LUNCH = meal("12:20", 40, "🍛 Lunch + walk 🚶");
const DIN = meal("19:30", 30, "🍽️ Dinner");
const RECALL = st("21:30", 30, "🐛 Recall + mark PYQ points — Error Lab (focus on errors)");

function rhythmStudy(raw, subj, topics, backlog) {
  return [].concat(life(), [
    st("07:20", 120, "📖 S1 · DEEP WORK: " + raw + " — " + topics, subj),
    meal("09:20", 30, "🍳 Breakfast"),
    st("09:50", 120, "📖 S2 · " + raw + " (cont.) — " + topics, subj),
    CARDS, LUNCH,
    st("13:00", 120, "📝 S3 · QBank: " + raw + " — today's topics (Marrow / DBMCI ONE)", subj),
    ELAB,
    st("15:30", 110, "🔁 S4 · Same-day revision: " + raw + " + flashcards from today's notes", subj),
    FAM, backSlot(backlog),
    st("19:00", 30, "📝 Timed 10Q drill — today's topic (Quiz page)"),
    DIN,
    st("20:00", 90, "🔁 Revise TODAY'S topics + PYQs of those topics"),
    RECALL, lightsOut()]);
}
function rhythmTdex(raw, subj, examText, extraTopics, grandName, backlog) {
  const out = [].concat(life(), [
    st("07:20", 40, "🃏 Flashcard warm-up (pre-exam)"),
    st("08:00", 240, "🏫 T&D EXAM: " + examText, subj),
    meal("12:00", 60, "🍛 Lunch + rest"),
    st("13:00", 120, "📺 Discussion on DBMCI ONE (from 1 PM): " + raw, subj),
    ELAB]);
  if (grandName) {
    out.push(st("15:30", 210, "🏆 " + grandName + " (200 Q, exam conditions)"));
    out.push(brk("18:40", 20, "🧘 Short breather"));
    out.push(meal("19:00", 30, "🍽️ Dinner"));
    out.push(st("19:30", 120, "🔍 " + grandName + " analysis — every wrong → Error Lab"));
  } else {
    out.push(extraTopics
      ? st("15:30", 110, "📖 " + raw + " — " + extraTopics, subj)
      : st("15:30", 110, "🔁 Revise what today's exam exposed — " + raw, subj));
    out.push(FAM, backSlot(backlog));
    out.push(st("19:00", 30, "📝 Timed 10Q drill — " + raw + " (Quiz page)"));
    out.push(DIN);
    out.push(st("20:00", 90, extraTopics
      ? "🔁 Revise TODAY'S topics + PYQs"
      : "🔁 Revise what the exam exposed + PYQs"));
  }
  out.push(RECALL, lightsOut());
  return out;
}
function rhythmTestDay(icon, name, dur, opts) {
  opts = opts || {};
  const endT = toTime(toMin("08:00") + dur);
  return [].concat(life(), [
    st("07:20", 40, "🃏 Flashcard warm-up (pre-test)"),
    st("08:00", dur, icon + " " + name),
    brk(endT, 50, "🧪 Decompress — no studying"),
    CARDS, LUNCH,
    st("13:00", 120, "🔍 " + name + " — analysis → every wrong into Error Lab"),
    ELAB,
    st("15:30", 110, "🃏 Fix-cards + re-learn the weak topics the test exposed"),
    FAM,
    opts.light ? st("18:00", 60, "😴 Light hour — rest / easy backlog only") : backSlot(opts.backlog),
    st("19:00", 30, "📝 Timed 10Q drill — weakest topic from the analysis (Quiz page)"),
    DIN,
    st("20:00", 90, "🔁 Revise the topics the test exposed + PYQs"),
    RECALL, lightsOut()]);
}
function rhythmStudyTest(raw, subj, topics, name, backlog) {
  return [].concat(life(), [
    st("07:20", 40, "🃏 Flashcard warm-up (pre-test)"),
    st("08:00", 180, "🧪 " + name),
    brk("11:00", 50, "🧪 Decompress"),
    CARDS, LUNCH,
    st("13:00", 120, "📖 S3 · DEEP WORK: " + raw + " — " + topics, subj),
    ELAB,
    st("15:30", 110, "📝 S4 · QBank: " + raw + " + same-day revision", subj),
    FAM, backSlot(backlog),
    st("19:00", 30, "📝 Timed 10Q drill — " + raw + " (Quiz page)"),
    DIN,
    st("20:00", 90, "🔁 Revise TODAY'S topics + PYQs"),
    RECALL, lightsOut()]);
}
function rhythmOneShot(backlog) {
  return [].concat(life(), [
    st("07:20", 40, "🃏 Flashcards — clear due cards"),
    st("08:00", 240, "🎬 One Shot Session — attend & take notes (institute)"),
    LUNCH,
    st("13:00", 120, "🎬 One Shot Session (cont.) + consolidate notes"),
    ELAB,
    st("15:30", 110, "📝 QBank on today's session topics"),
    FAM, backSlot(backlog),
    st("19:00", 30, "📝 Timed 10Q drill — today's session topic (Quiz page)"),
    DIN,
    st("20:00", 90, "🔁 Revise today's session notes + PYQs"),
    RECALL, lightsOut()]);
}
function rhythmGtRev(backlog) {
  return [].concat(life(), [
    st("07:20", 120, "🔁 S1 · Grand Test revision — weakest subjects first"),
    meal("09:20", 30, "🍳 Breakfast"),
    st("09:50", 120, "🔁 S2 · GT revision (cont.) — mixed topics"),
    CARDS, LUNCH,
    st("13:00", 120, "📝 S3 · Mixed timed MCQs — 100 Q (Quiz page)"),
    ELAB,
    st("15:30", 110, "🃏 S4 · Flagged & weak flashcards + Error Lab"),
    FAM, backSlot(backlog),
    st("19:00", 30, "📝 Timed 10Q drill — weakest topic (Quiz page)"),
    DIN,
    st("20:00", 90, "🔁 Revise today's weak areas + PYQs"),
    RECALL, lightsOut()]);
}
function rhythmGtReview(backlog) {
  return [].concat(life(), [
    st("07:20", 120, "🔍 S1 · Grand Test review — analyse every wrong → Error Lab"),
    meal("09:20", 30, "🍳 Breakfast"),
    st("09:50", 120, "🔍 S2 · GT review (cont.) — re-learn exposed weak topics"),
    CARDS, LUNCH,
    st("13:00", 120, "🔁 S3 · Revise the topics the Grand Test exposed"),
    ELAB,
    st("15:30", 110, "🃏 S4 · Fix-cards + weak flashcards"),
    FAM, backSlot(backlog),
    st("19:00", 30, "📝 Timed 10Q drill — weakest topic (Quiz page)"),
    DIN,
    st("20:00", 90, "🔁 Revise exposed topics + PYQs"),
    RECALL, lightsOut()]);
}

/* ============================================================
   Loader
   ============================================================ */
function loadDBMCIPlan() {
  const examDate = $("examDate").value;
  if (!examDate) { alert("Set your NEET PG exam date in the form first — the ⚡ countdown uses it."); return; }
  if (!confirm("Load the DBMCI institute timetable (12 Sep 2026 → 17 Jan 2027),\nwrapped in your daily rhythm (6:00 wake → 10:00 lights-out)?\n\nThis REPLACES the current plan and clears all ticks. Take a Backup first if needed.")) return;
  const cfg = (state && state.cfg) ? state.cfg : {
    subjects: DEFAULT_SUBJECTS.map(s => ({ name: s[0], size: s[1], weak: s[2], on: true })), lightSunday: false
  };
  cfg.examDate = examDate; cfg.lightSunday = false;
  const today = todayStr(), plan = []; let pastDays = 0;
  DBMCI_DAYS.forEach(function (e) {
    const raw = e.s || "", subj = normSubj(raw), backlog = e.d <= "2026-10-31";
    let sessions, tag, phase;
    if (e.t === "study") { phase = 2; tag = "Study · " + raw; sessions = rhythmStudy(raw, subj, e.k, backlog); }
    else if (e.t === "tdex") { phase = 1; tag = "T&D Exam"; sessions = rhythmTdex(raw, subj, e.x, null, null, backlog); }
    else if (e.t === "tdexstudy") { phase = 1; tag = "Exam + Study"; sessions = rhythmTdex(raw, subj, e.x, e.k, null, backlog); }
    else if (e.t === "tdexgrand") { phase = 1; tag = "Exam + Grand Test"; sessions = rhythmTdex(raw, subj, e.x, null, e.n, false); }
    else if (e.t === "grand") { phase = 3; tag = e.n; sessions = rhythmTestDay("🏆", e.n + " (200 Q, exam conditions)", 210, { backlog: backlog }); }
    else if (e.t === "cum") { phase = 3; tag = e.n; sessions = rhythmTestDay("🧪", e.n, 180, { backlog: backlog }); }
    else if (e.t === "studytest") { phase = 3; tag = "Study + Test"; sessions = rhythmStudyTest(raw, subj, e.k, e.n, backlog); }
    else if (e.t === "gtrev") { phase = 3; tag = "GT Revision Day"; sessions = rhythmGtRev(backlog); }
    else if (e.t === "gtreview") { phase = 3; tag = "GT Review"; sessions = rhythmGtReview(backlog); }
    else if (e.t === "oneshot") { phase = 2; tag = "One Shot Session"; sessions = rhythmOneShot(backlog); }
    else { phase = 3; tag = "INI-CET Exam"; sessions = rhythmTestDay("🧪", "INI-CET — real exam, full conditions", 180, { light: true }); }
    plan.push({ date: e.d, phase: phase, tag: tag, sessions: sessions });
    if (e.d < today) pastDays++;
  });
  if (!state) state = {};
  state.cfg = cfg; state.plan = plan; state.extras = state.extras || {};
  save();
  alert("Institute timetable loaded ✅\n" + plan.length + " days (12 Sep 2026 → 17 Jan 2027), each following your daily rhythm.\n"
    + pastDays + " past day(s) are catch-up — clear them with Reflow (3/day) + the 6 PM backlog slot until 31 Oct.");
  location.href = "index.html";
}
document.getElementById("dbmciBtn").onclick = loadDBMCIPlan;