"use strict";
/* ============================================================
   dbmci.js — Institute timetable loader (DBMCI "OTO" schedule).
   Source: institute PDF, 12-Sep-2026 → 17-Jan-2027, transcribed.
   Study blocks use YOUR day settings; T&D exams fixed 8 AM–12 PM.
   PDF corrections applied: Cumulative-5 → 31-12-2026, Grand Test 4
   → 22-11-2026, 07-Jan exam treated as Physiology, both Medicine
   Part-II exams kept as printed.
   ============================================================ */

const SUBJ_MAP={"OBG (Obst)":"Obstetrics & Gynaecology","OBG (Gyn)":"Obstetrics & Gynaecology",
  "PSM":"Community Medicine (PSM)","Bio Chemistry":"Biochemistry","Micro Biology":"Microbiology",
  "Derma":"Dermatology","Forensic Medicine":"Forensic Medicine (FMT)"};
function normSubj(s){return SUBJ_MAP[s]||s;}

const DBMCI_DAYS=[
  {d:"2026-09-12",t:"study",s:"Pharmacology",k:"General Pharmacology + Autonomic Nervous System (ANS)"},
  {d:"2026-09-13",t:"study",s:"Pharmacology",k:"Respiratory System + Kidney, GIT + Autacoids + Blood & Immunomodulator Drugs"},
  {d:"2026-09-14",t:"tdex",s:"Pharmacology",x:"Pharmacology Part - I Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM"},
  {d:"2026-09-15",t:"study",s:"Pharmacology",k:"Central & Peripheral Nervous System"},
  {d:"2026-09-16",t:"study",s:"Pharmacology",k:"Antimicrobial Drugs"},
  {d:"2026-09-17",t:"study",s:"Pharmacology",k:"Anticancer Drugs + Cardiovascular System (CVS) + Endocrine Pharmacology + Immunopharmacology"},
  {d:"2026-09-18",t:"tdex",s:"Pharmacology",x:"Pharmacology Part - II Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM"},
  {d:"2026-09-19",t:"study",s:"Radiology",k:"General Radiology"},
  {d:"2026-09-20",t:"study",s:"Radiology",k:"Nuclear Radiology + Obstetric Imaging + Musculoskeletal Radiology"},
  {d:"2026-09-21",t:"study",s:"Radiology",k:"Systemic Radiology — Neuro, Head & Neck, Thoracic & Cardiovascular, Abdominal, Genitourinary"},
  {d:"2026-09-22",t:"tdex",s:"Radiology",x:"Radiology Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM"},
  {d:"2026-09-23",t:"study",s:"Ophthalmology",k:"Anatomy & Development of Eye + Lens, Glaucoma (complete)"},
  {d:"2026-09-24",t:"study",s:"Ophthalmology",k:"Conjunctiva & Sclera + Uvea + Community Ophthalmology"},
  {d:"2026-09-25",t:"study",s:"Ophthalmology",k:"Retina (complete) + Neuro-Ophthalmology + Squint + Cornea"},
  {d:"2026-09-26",t:"tdex",s:"Ophthalmology",x:"Ophthalmology Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM"},
  {d:"2026-09-27",t:"study",s:"Paediatrics",k:"Normal Growth, Assessment, Puberty, Development (Motor, Language, Social), Breastfeeding, Severe Acute Malnutrition, Rickets, Scurvy, Normal Newborn Examination, SGA, Neonatal Reflexes"},
  {d:"2026-09-28",t:"studytest",s:"Paediatrics",k:"APGAR, Neonatal Resuscitation, Sepsis, Birth Asphyxia, Neonatal Seizures, Jaundice, Congenital Anomalies, Childhood Seizures, Cerebral Palsy, Meningitis, Foreign Body, RSV Bronchiolitis, Pneumonia, Asthma, Cystic Fibrosis",n:"Cumulative Test - 1 (Pharmacology + Radiology + Ophthalmology)"},
  {d:"2026-09-29",t:"study",s:"Paediatrics",k:"Fetal Circulation, Cyanotic & Acyanotic CHD, Rheumatic Fever, Kawasaki, Hypertrophic Pyloric Stenosis, Hirschsprung, Celiac, Diarrhea, Nephrotic/Nephritic, HUS, CAH, Thyroid Dysgenesis, Pubertal Disorders"},
  {d:"2026-09-30",t:"tdex",s:"Paediatrics",x:"Paediatrics Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM"},
  {d:"2026-10-01",t:"study",s:"ENT",k:"Ear / Throat"},
  {d:"2026-10-02",t:"study",s:"ENT",k:"Throat / Nose"},
  {d:"2026-10-03",t:"grand",n:"Grand Test - 1"},
  {d:"2026-10-04",t:"tdex",s:"ENT",x:"ENT Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM"},
  {d:"2026-10-05",t:"oneshot"},{d:"2026-10-06",t:"oneshot"},{d:"2026-10-07",t:"oneshot"},
  {d:"2026-10-08",t:"oneshot"},{d:"2026-10-09",t:"oneshot"},{d:"2026-10-10",t:"oneshot"},
  {d:"2026-10-11",t:"oneshot"},
  {d:"2026-10-12",t:"study",s:"PSM",k:"Concept of health and disease indicators, biomedical waste and international health"},
  {d:"2026-10-13",t:"study",s:"PSM",k:"Infectious disease, levels of prevention and vaccines"},
  {d:"2026-10-14",t:"tdex",s:"PSM",x:"PSM Part - I Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM"},
  {d:"2026-10-15",t:"study",s:"PSM",k:"Communicable disease, bio stats, NCD, MCH"},
  {d:"2026-10-16",t:"study",s:"PSM",k:"Environment, occupational health, health management and health care delivery, health education, disaster management"},
  {d:"2026-10-17",t:"grand",n:"Grand Test - 2"},
  {d:"2026-10-18",t:"tdex",s:"PSM",x:"PSM Part - II Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM"},
  {d:"2026-10-19",t:"study",s:"OBG (Obst)",k:"Gametogenesis, USG in Pregnancy, Antenatal Investigations, Amniotic Fluid, Physiological Changes in Pregnancy, Anaemia, Diabetes, HELLP Syndrome & Liver Disorders"},
  {d:"2026-10-20",t:"study",s:"OBG (Obst)",k:"Multifetal Pregnancy, Ectopic Pregnancy, Contracted Pelvis, Cephalopelvic Disproportion, Fetal Skull Diameters"},
  {d:"2026-10-21",t:"study",s:"OBG (Obst)",k:"Labor Terminology, Mechanism of Labor, Partograph, Leopold Maneuvers, Malpresentations, Postpartum Hemorrhage, Instrumental Deliveries, Cesarean Section"},
  {d:"2026-10-22",t:"tdexstudy",s:"OBG (Obst)",k:"Obstetrics Consolidation & CTG / Pelvimetry Images",x:"OBG Part - I Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM"},
  {d:"2026-10-23",t:"study",s:"OBG (Gyn)",k:"Reproductive Physiology, Menstrual Cycle, Gametogenesis, Ovarian Cycle, Corpus Luteum, Hirsutism, PCOS, Menopause, Prolactin Disorders, Senile Vaginitis, Asherman Syndrome"},
  {d:"2026-10-24",t:"study",s:"OBG (Gyn)",k:"OHSS, Prolactinoma, Sheehan Syndrome, Pituitary Apoplexy, Infertility Workup & ART, Pelvic Infections (PID, STIs), Pelvic Organ Prolapse"},
  {d:"2026-10-25",t:"cum",n:"Cumulative Test - 2 (Paediatrics + ENT + PSM)"},
  {d:"2026-10-26",t:"study",s:"OBG (Gyn)",k:"Endometriosis, Adenomyosis, Uterine Fibroids (FIGO), Endometrial Polyps, Hysteroscopy & Laparoscopy in Gynaecology, Cervical Lesions, Urinary Fistulae, Vulval Cancer, Müllerian Malformations, Disorders of Sexual Development"},
  {d:"2026-10-27",t:"tdexstudy",s:"OBG (Gyn)",k:"Vulval/Vaginal Cysts, Primary & Secondary Amenorrhea, Ovarian Tumors/Cancer, Endometrial Malignancies, Contraceptive Methods & Terminal Sterilization",x:"OBG Part - II Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM"},
  {d:"2026-10-28",t:"study",s:"Bio Chemistry",k:"Enzymes & Porphyrins"},
  {d:"2026-10-29",t:"study",s:"Bio Chemistry",k:"Heme Synthesis & Porphyria"},
  {d:"2026-10-30",t:"study",s:"Bio Chemistry",k:"Amino Acids & Proteins"},
  {d:"2026-10-31",t:"study",s:"Bio Chemistry",k:"Carbohydrates + Lipids + Glucose & Transporters"},
  {d:"2026-11-01",t:"inicet"},
  {d:"2026-11-02",t:"study",s:"Bio Chemistry",k:"Vitamins + Genetics + Molecular Genetics"},
  {d:"2026-11-03",t:"tdex",s:"Bio Chemistry",x:"Biochemistry Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM"},
  {d:"2026-11-04",t:"study",s:"Anatomy",k:"Head, Neck & Face"},
  {d:"2026-11-05",t:"study",s:"Anatomy",k:"Neuroanatomy"},
  {d:"2026-11-06",t:"gtrev"},
  {d:"2026-11-07",t:"gtrev"},
  {d:"2026-11-08",t:"grand",n:"Grand Test - 3"},
  {d:"2026-11-09",t:"gtreview"},
  {d:"2026-11-10",t:"tdex",s:"Anatomy",x:"Anatomy Part - I Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM"},
  {d:"2026-11-11",t:"study",s:"Anatomy",k:"Embryology"},
  {d:"2026-11-12",t:"study",s:"Anatomy",k:"Upper & Lower Limb"},
  {d:"2026-11-13",t:"study",s:"Anatomy",k:"Thorax, Abdomen & Perineum"},
  {d:"2026-11-14",t:"tdex",s:"Anatomy",x:"Anatomy Part - II Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM"},
  {d:"2026-11-15",t:"cum",n:"Cumulative Test - 3 (OBG + Biochemistry + Anatomy)"},
  {d:"2026-11-16",t:"study",s:"Pathology",k:"Cell Injury, Inflammation"},
  {d:"2026-11-17",t:"study",s:"Pathology",k:"Immune System, Neoplasia"},
  {d:"2026-11-18",t:"study",s:"Pathology",k:"Haematology"},
  {d:"2026-11-19",t:"tdex",s:"Pathology",x:"Pathology Part - I Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM"},
  {d:"2026-11-20",t:"study",s:"Pathology",k:"CVS, Skin, Lungs, Liver"},
  {d:"2026-11-21",t:"study",s:"Pathology",k:"Kidney, Endocrine, CNS"},
  {d:"2026-11-22",t:"grand",n:"Grand Test - 4"},
  {d:"2026-11-23",t:"tdex",s:"Pathology",x:"Pathology Part - II Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM"},
  {d:"2026-11-24",t:"study",s:"Surgery",k:"Trauma"},
  {d:"2026-11-25",t:"study",s:"Surgery",k:"Breast"},
  {d:"2026-11-26",t:"study",s:"Surgery",k:"Urology and hernia"},
  {d:"2026-11-27",t:"tdex",s:"Surgery",x:"Surgery Part - I Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM"},
  {d:"2026-11-28",t:"study",s:"Surgery",k:"GIT"},
  {d:"2026-11-29",t:"study",s:"Surgery",k:"Gen surgery"},
  {d:"2026-11-30",t:"study",s:"Surgery",k:"Glands + any surgery backlogs"},
  {d:"2026-12-01",t:"tdex",s:"Surgery",x:"Surgery Part - II Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM"},
  {d:"2026-12-02",t:"study",s:"Derma",k:"Intro, layers of skin, epidermal cells, Adnexal disorders, melanin disorders, skin cancers, facial skin lesions"},
  {d:"2026-12-03",t:"study",s:"Derma",k:"Mast cell disorder, woods lamp, DEJ disorders, immunofluorescence, scalp hair cycle, nail disorders, TB and leprosy"},
  {d:"2026-12-04",t:"study",s:"Derma",k:"STD, psoriasis, LP, infections, eczema, blistering disorder"},
  {d:"2026-12-05",t:"tdex",s:"Derma",x:"Derma Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM"},
  {d:"2026-12-06",t:"grand",n:"Grand Test - 5"},
  {d:"2026-12-07",t:"study",s:"Micro Biology",k:"General Microbiology & Immunology"},
  {d:"2026-12-08",t:"study",s:"Micro Biology",k:"Bacteriology"},
  {d:"2026-12-09",t:"cum",n:"Cumulative Test - 4 (Pathology + Surgery + Derma)"},
  {d:"2026-12-10",t:"tdex",s:"Micro Biology",x:"Micro Part - I Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM"},
  {d:"2026-12-11",t:"study",s:"Micro Biology",k:"Mycology"},
  {d:"2026-12-12",t:"study",s:"Micro Biology",k:"Virology"},
  {d:"2026-12-13",t:"study",s:"Micro Biology",k:"Parasitology"},
  {d:"2026-12-14",t:"tdex",s:"Micro Biology",x:"Micro Part - II Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM"},
  {d:"2026-12-15",t:"study",s:"Medicine",k:"Neurology"},
  {d:"2026-12-16",t:"study",s:"Medicine",k:"Neurology"},
  {d:"2026-12-17",t:"tdexstudy",s:"Medicine",k:"Endocrine",x:"Medicine Part - II Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM"},
  {d:"2026-12-18",t:"study",s:"Medicine",k:"CVS"},
  {d:"2026-12-19",t:"study",s:"Medicine",k:"Rheumatology"},
  {d:"2026-12-20",t:"grand",n:"Grand Test - 6"},
  {d:"2026-12-21",t:"tdexstudy",s:"Medicine",k:"GIT",x:"Medicine Part - II Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM"},
  {d:"2026-12-22",t:"study",s:"Medicine",k:"Respiratory"},
  {d:"2026-12-23",t:"study",s:"Medicine",k:"Endocrinology"},
  {d:"2026-12-24",t:"study",s:"Medicine",k:"Nephrology"},
  {d:"2026-12-25",t:"study",s:"Medicine",k:"Gastroenterology"},
  {d:"2026-12-26",t:"tdexstudy",s:"Medicine",k:"Medicine Revision (mixed high-yield)",x:"Medicine Part - III Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM"},
  {d:"2026-12-27",t:"study",s:"Forensic Medicine",k:"Identification, Medical Jurisprudence, Injuries"},
  {d:"2026-12-28",t:"study",s:"Forensic Medicine",k:"Asphyxia, Sexual Offences and Abortion, Childhood Violence, Infanticide and Starvation"},
  {d:"2026-12-29",t:"study",s:"Forensic Medicine",k:"Toxicology, Identification, Death, PM Changes"},
  {d:"2026-12-30",t:"tdex",s:"Forensic Medicine",x:"FMT Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM"},
  {d:"2026-12-31",t:"cum",n:"Cumulative Test - 5 (Microbiology + Medicine + F.M)"},
  {d:"2027-01-01",t:"study",s:"Anaesthesia",k:"Preoperative evaluation and monitoring, Airway management and resuscitation, Muscle relaxants, General anaesthesia, Local and regional anaesthesia"},
  {d:"2027-01-02",t:"study",s:"Anaesthesia",k:"Specific conditions, Complications of anaesthesia"},
  {d:"2027-01-03",t:"tdexgrand",s:"Anaesthesia",x:"Anaesthesia Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM",n:"Grand Test - 7"},
  {d:"2027-01-04",t:"study",s:"Physiology",k:"General + Nerve-Muscle Physiology + Exercise Physiology + Blood + Kidney"},
  {d:"2027-01-05",t:"study",s:"Physiology",k:"CVS, Respiratory, CNS"},
  {d:"2027-01-06",t:"study",s:"Physiology",k:"Endocrinology + Reproductive System, GIT & Kidney"},
  {d:"2027-01-07",t:"tdex",s:"Physiology",x:"Physiology Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM"},
  {d:"2027-01-08",t:"study",s:"Orthopaedics",k:"Fracture and its complications — Neck, Upper & Lower Limb"},
  {d:"2027-01-09",t:"study",s:"Orthopaedics",k:"Spine & Pelvis, Bone and Joint Infections"},
  {d:"2027-01-10",t:"study",s:"Orthopaedics",k:"Paediatric Orthopaedics, Metabolic Bone Diseases, Arthritis & Other Joint Disorders, Nerve Injuries"},
  {d:"2027-01-11",t:"study",s:"Orthopaedics",k:"Bone tumors, Instruments, Advanced Orthopaedics & Management"},
  {d:"2027-01-12",t:"tdex",s:"Orthopaedics",x:"Orthopaedics Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM"},
  {d:"2027-01-13",t:"study",s:"Psychiatry",k:"Facets of Clinical Psychiatry, Mood Disorders, Psychotic Disorders, Neuropsychiatry, Neurocognitive Disorders, Personality Disorders, Substance-Related Disorders, Neurosis"},
  {d:"2027-01-14",t:"study",s:"Psychiatry",k:"Psychiatric Emergencies, Specific Psychiatric Conditions, Sexuality, Child Psychiatry, Forensic Psychiatry"},
  {d:"2027-01-15",t:"cum",n:"Cumulative Test - 6 (Psychiatry + Orthopaedics + Physiology + Anaesthesia)"},
  {d:"2027-01-16",t:"tdex",s:"Psychiatry",x:"Psychiatry Exam (8 AM–12 PM) · Discussion on DBMCI ONE from 1 PM"},
  {d:"2027-01-17",t:"grand",n:"Grand Test - 8"}
];

/* ---------- day builders ---------- */
function dbmFill(tpl,labels){
  let i=0;
  return tpl.map(function(s){
    if(s.kind!=="study")return{time:s.time,dur:s.dur,label:s.label,kind:s.kind};
    const l=labels[i]||{subject:"",label:"🃏 Flashcards (due) + Error Lab"};
    i++;
    return{time:s.time,dur:s.dur,kind:"study",subject:l.subject||"",label:l.label,done:false};
  });
}
function dbmStudyLabels(raw,subj,topics,backlog){
  return[{subject:subj,label:"📖 DEEP WORK: "+raw+" — "+topics},
    {subject:subj,label:"📖 "+raw+" (cont.) — "+topics},
    {subject:subj,label:"📝 QBank: "+raw+" (Marrow / DBMCI ONE)"},
    {subject:subj,label:"🔁 Same-day revision: "+raw+" + flashcards"},
    backlog?{subject:"",label:"📥 Backlog catch-up: past institute days (Sept block first)"}
           :{subject:"",label:"🃏 Flashcards (due) + Error Lab"}];
}
function dbmTdexDay(cfg,subj,raw,examText,extraTopics,grandName){
  const tpl=buildTemplate(cfg.dayStart,cfg.dayEnd,cfg.hours*60),out=[];
  if(toMin(cfg.dayStart)<8*60)
    out.push({time:cfg.dayStart,dur:8*60-toMin(cfg.dayStart),kind:"study",subject:"",label:"🃏 Flashcard warm-up (due cards)",done:false});
  out.push({time:"08:00",dur:240,kind:"study",subject:subj,label:"🏫 T&D EXAM: "+examText,done:false});
  out.push({time:"12:00",dur:60,kind:"meal",label:"Lunch + rest 🍛"});
  out.push({time:"13:00",dur:120,kind:"study",subject:subj,label:"📺 Discussion on DBMCI ONE (from 1 PM): "+raw,done:false});
  out.push({time:"15:00",dur:30,kind:"break",label:"Break ☕"});
  if(grandName){
    out.push({time:"15:30",dur:210,kind:"study",subject:"",label:"🏆 "+grandName+" (200 Q, exam conditions)",done:false});
    out.push({time:"18:45",dur:30,kind:"break",label:"Break ☕"});
    out.push({time:"19:15",dur:75,kind:"study",subject:"",label:"🃏 Light: flashcards only",done:false});
  }else{
    const eve=tpl.filter(s=>s.kind==="study"&&toMin(s.time)>=15*60+30);
    const labels=extraTopics
      ?[{subject:subj,label:"📖 "+raw+" — "+extraTopics},
        {subject:subj,label:"📝 QBank + same-day revision: "+raw},
        {subject:"",label:"📥 Backlog catch-up + flashcards"}]
      :[{subject:subj,label:"🔁 Revise "+raw+" — fix what today's exam exposed"},
        {subject:"",label:"📥 Backlog catch-up + flashcards"},
        {subject:"",label:"🃏 Flashcards (due) + Error Lab"}];
    eve.forEach(function(s,i){out.push({time:s.time,dur:s.dur,kind:"study",subject:labels[i]?labels[i].subject:"",label:labels[i]?labels[i].label:"🃏 Flashcards (due)",done:false});});
  }
  if(toMin(cfg.dayEnd)>=20*60+45&&!out.some(o=>o.kind==="meal"&&o.label.indexOf("Dinner")>=0))
    out.push({time:"20:00",dur:45,kind:"meal",label:"Dinner 🍽️"});
  out.sort(function(a,b){return toMin(a.time)-toMin(b.time);});
  return out;
}
function dbmGrandLabels(n){return[{subject:"",label:"🏆 "+n+" (200 Q, exam conditions)"},
  {subject:"",label:"🏆 "+n+" (cont.)"},
  {subject:"",label:"🔍 "+n+" analysis — every wrong → Error Lab"},
  {subject:"",label:"🃏 Fix-cards + weak flashcards"},
  {subject:"",label:"📥 Backlog catch-up / light revision"}];}
function dbmCumLabels(n){return[{subject:"",label:"🧪 "+n+" (exam conditions)"},
  {subject:"",label:"🧪 "+n+" (cont.)"},
  {subject:"",label:"🔍 Analysis → Error Lab"},
  {subject:"",label:"📥 Backlog catch-up + flashcards"},
  {subject:"",label:"🃏 Flashcards (due)"}];}
function dbmStudyTestLabels(raw,subj,topics,n,backlog){return[
  {subject:"",label:"🧪 "+n+" (exam conditions)"},
  {subject:"",label:"🧪 "+n+" (cont.)/review"},
  {subject:subj,label:"📖 DEEP WORK: "+raw+" — "+topics},
  {subject:subj,label:"📝 QBank: "+raw+" + same-day revision"},
  backlog?{subject:"",label:"📥 Backlog catch-up"}:{subject:"",label:"🃏 Flashcards (due) + Error Lab"}];}
function dbmGtRevLabels(){return[{subject:"",label:"🔁 Grand Test revision — weakest subjects first"},
  {subject:"",label:"📝 Mixed timed MCQs (100 Q)"},
  {subject:"",label:"🃏 Flagged & weak flashcards"},
  {subject:"",label:"📥 Backlog catch-up"},
  {subject:"",label:"😴 Early wind-down + flashcards (due)"}];}
function dbmGtReviewLabels(){return[{subject:"",label:"🔍 Grand Test review — analyse every wrong → Error Lab"},
  {subject:"",label:"🔁 Revise the topics the Grand Test exposed"},
  {subject:"",label:"🃏 Fix-cards from analysis"},
  {subject:"",label:"📥 Backlog catch-up / light revision"},
  {subject:"",label:"🃏 Flashcards (due)"}];}
function dbmOneShotLabels(){return[{subject:"",label:"🎬 One Shot Session — attend & take notes (institute)"},
  {subject:"",label:"🎬 One Shot Session (cont.) + consolidate notes"},
  {subject:"",label:"📝 QBank on today's session topics"},
  {subject:"",label:"📥 Backlog catch-up: Sept block (Pharma / Radio / Ophth / Paed)"},
  {subject:"",label:"🃏 Flashcards (due)"}];}
function dbmInicetLabels(){return[{subject:"",label:"🧪 INI-CET EXAM — real exam, full conditions"},
  {subject:"",label:"🔍 Post-exam analysis → Error Lab"},
  {subject:"",label:"🃏 Flashcards (weak only)"},
  {subject:"",label:"😴 Light evening — recover"}];}

/* ---------- loader ---------- */
function loadDBMCIPlan(){
  const examDate=$("examDate").value,dayStart=$("dayStart").value||"07:00",
        dayEnd=$("dayEnd").value||"22:00",hours=Math.min(14,Math.max(4,+$("hours").value||9));
  if(!examDate){alert("Set your NEET PG exam date in the form first — the ⚡ countdown uses it.");return;}
  if(!confirm("Load the DBMCI institute timetable (12 Sep 2026 → 17 Jan 2027)?\n\nThis REPLACES the current plan and clears all ticks. Take a Backup first if needed."))return;
  const cfg=(state&&state.cfg)?state.cfg:{
    subjects:DEFAULT_SUBJECTS.map(s=>({name:s[0],size:s[1],weak:s[2],on:true})),lightSunday:false};
  cfg.examDate=examDate;cfg.dayStart=dayStart;cfg.dayEnd=dayEnd;cfg.hours=hours;cfg.lightSunday=false;
  const tpl=buildTemplate(dayStart,dayEnd,hours*60);
  const today=todayStr(),plan=[];let pastDays=0;
  DBMCI_DAYS.forEach(function(e){
    const subj=normSubj(e.s||""),raw=e.s||"",backlog=e.d<="2026-10-31";
    let sessions,tag,phase;
    if(e.t==="study"){phase=2;tag="Study · "+raw;sessions=dbmFill(tpl,dbmStudyLabels(raw,subj,e.k,backlog));}
    else if(e.t==="tdex"){phase=1;tag="T&D Exam";sessions=dbmTdexDay(cfg,subj,raw,e.x,null,null);}
    else if(e.t==="tdexstudy"){phase=1;tag="Exam + Study";sessions=dbmTdexDay(cfg,subj,raw,e.x,e.k,null);}
    else if(e.t==="tdexgrand"){phase=1;tag="Exam + Grand Test";sessions=dbmTdexDay(cfg,subj,raw,e.x,null,e.n);}
    else if(e.t==="grand"){phase=3;tag=e.n;sessions=dbmFill(tpl,dbmGrandLabels(e.n));}
    else if(e.t==="cum"){phase=3;tag=e.n;sessions=dbmFill(tpl,dbmCumLabels(e.n));}
    else if(e.t==="studytest"){phase=3;tag="Study + Test";sessions=dbmFill(tpl,dbmStudyTestLabels(raw,subj,e.k,e.n,backlog));}
    else if(e.t==="gtrev"){phase=3;tag="GT Revision Day";sessions=dbmFill(tpl,dbmGtRevLabels());}
    else if(e.t==="gtreview"){phase=3;tag="GT Review";sessions=dbmFill(tpl,dbmGtReviewLabels());}
    else if(e.t==="oneshot"){phase=2;tag="One Shot Session";sessions=dbmFill(tpl,dbmOneShotLabels());}
    else{phase=3;tag="INI-CET Exam";sessions=dbmFill(tpl,dbmInicetLabels());}
    plan.push({date:e.d,phase:phase,tag:tag,sessions:sessions});
    if(e.d<today)pastDays++;
  });
  if(!state)state={};
  state.cfg=cfg;state.plan=plan;state.extras=state.extras||{};
  save();
  alert("Institute timetable loaded ✅\n"+plan.length+" days (12 Sep 2026 → 17 Jan 2027).\n"
    +pastDays+" past day(s) are now catch-up backlog — clear them gradually with Reflow (3/day) + the daily Backlog catch-up block.");
  location.href="index.html";
}
document.getElementById("dbmciBtn").onclick=loadDBMCIPlan;