"use strict";
/* ============================================================
   topics.js — the topic database.
   Format: [ "Topic name", weight ]
   weight = how many deep-work sessions (~2.5 hrs) the topic needs.
   Bigger number = more sessions. She can edit these numbers,
   or add/remove topics on the Syllabus page of the app.
   ============================================================ */

const TOPICS = {
  "Medicine": [
    ["Cardiology", 3], ["Respiratory system", 2], ["Gastroenterology & Hepatology", 2],
    ["Nephrology", 2], ["Neurology", 2], ["Endocrinology", 2], ["Haematology", 2],
    ["Infectious diseases", 2], ["Rheumatology", 1], ["Critical care", 1],
    ["Toxicology & poisoning", 1], ["Electrolytes & ECG basics", 1], ["Genetics & misc", 1]
  ],
  "Surgery": [
    ["GI & hepatobiliary surgery", 4], ["Urology", 3], ["Hernia & abdominal wall", 2],
    ["Breast", 2], ["Thyroid & endocrine surgery", 2], ["Vascular surgery", 2],
    ["Trauma & ATLS", 2], ["Wound healing & surgical fluids", 2],
    ["Head, neck & oral surgery", 2], ["Burns & plastic surgery", 1],
    ["Thoracic surgery", 1], ["Paediatric surgery", 1],
    ["Instruments, sutures & specimens", 1], ["Recent advances", 1]
  ],
  "Obstetrics & Gynaecology": [
    ["Complications of pregnancy", 3], ["Antenatal care & normal pregnancy", 2],
    ["Labour & abnormal labour", 2], ["Gynae infections & benign lesions", 2],
    ["Gynae malignancies", 2], ["Infertility & contraception", 2],
    ["Medical disorders in pregnancy", 1], ["Obstetric operations", 1],
    ["Reproductive endocrinology (PCOS etc.)", 1], ["Recent guidelines & trials", 1]
  ],
  "Pharmacology": [
    ["ANS drugs", 2], ["CNS drugs", 2], ["CVS drugs", 2], ["Antimicrobials", 2],
    ["General principles", 1], ["Antiprotozoal & anthelminthics", 1],
    ["Autacoids & NSAIDs", 1], ["Respiratory & GIT drugs", 1],
    ["Endocrine & uterine drugs", 1], ["Anticancer & immunosuppressants", 1],
    ["Antidotes & toxicology", 1], ["New drugs & recent advances", 1]
  ],
  "Pathology": [
    ["Cell injury, inflammation & healing", 2], ["Neoplasia", 2],
    ["Haematology (RBC & WBC disorders)", 2], ["Immunopathology", 1], ["Genetics", 1],
    ["Coagulation & transfusion", 1], ["CVS & respiratory pathology", 1],
    ["GIT, liver & pancreas", 1], ["Kidney & urinary tract", 1],
    ["Female genital & breast", 1], ["Endocrine, bone & skin", 1], ["CNS", 1], ["Infections", 1]
  ],
  "Community Medicine (PSM)": [
    ["Communicable diseases", 3], ["Epidemiology", 2], ["Biostatistics", 2],
    ["National health programs", 2], ["History & concepts", 1], ["Screening & tests", 1],
    ["Non-communicable diseases", 1], ["Nutrition", 1],
    ["Environment & occupational health", 1], ["Demography", 1], ["MCH & RCH", 1],
    ["Vaccines & cold chain", 1], ["Health management & ethics", 1]
  ],
  "Microbiology": [
    ["General microbiology & immunity", 2], ["Gram-negative bacteria", 2],
    ["Virology", 2], ["Parasitology", 2], ["Gram-positive bacteria", 1],
    ["Mycobacterium", 1], ["Spirochaetes & others", 1], ["Mycology", 1],
    ["Hospital-acquired infection & resistance", 1]
  ],
  "Paediatrics": [
    ["Newborn & neonatal jaundice", 2], ["Growth & development", 1],
    ["Nutrition & deficiency", 1], ["Respiratory illnesses", 1], ["Cardiology", 1],
    ["GIT & liver", 1], ["Neurology", 1], ["Haematology & oncology", 1],
    ["Nephrology & urology", 1], ["Genetics & metabolic", 1], ["Vaccines", 1],
    ["Paediatric emergencies", 1]
  ],
  "Anatomy": [
    ["Abdomen & pelvis", 2], ["Head & neck", 2], ["Neuroanatomy", 2],
    ["Upper limb", 1], ["Lower limb", 1], ["Thorax", 1], ["Embryology", 1],
    ["Histology", 1], ["Radiological & sectional anatomy", 1]
  ],
  "Physiology": [
    ["Cardiovascular", 2], ["Renal & acid-base", 2], ["CNS & special senses", 2],
    ["Nerve & muscle", 1], ["Blood", 1], ["Respiratory", 1], ["GIT", 1],
    ["Endocrinology", 1], ["Reproductive", 1]
  ],
  "Biochemistry": [
    ["Metabolism integration & energy", 2], ["Molecular biology", 2],
    ["Carbohydrates", 1], ["Lipids", 1], ["Proteins & enzymes", 1],
    ["Vitamins & minerals", 1], ["Nutrition", 1], ["Acid-base & electrolytes", 1],
    ["Immunology & cancer biochemistry", 1], ["Techniques", 1]
  ],
  "Forensic Medicine (FMT)": [
    ["Injuries & wounds", 2], ["Specific poisons", 2], ["Legal procedure & courts", 1],
    ["Identity & thanatology", 1], ["Asphyxial deaths", 1],
    ["Sexual offences & samples", 1], ["General toxicology", 1],
    ["Forensic psychiatry", 1], ["Starvation, infanticide & misc", 1]
  ],
  "ENT": [
    ["Ear", 3], ["Nose & paranasal sinuses", 2], ["Oral cavity & pharynx", 1],
    ["Larynx & stridor", 1], ["Head & neck tumours", 1], ["Recent advances", 1]
  ],
  "Ophthalmology": [
    ["Glaucoma", 2], ["Retina", 2], ["Optics & refraction", 1],
    ["Cornea & external eye", 1], ["Lens & cataract", 1], ["Uvea", 1],
    ["Neuro-ophthalmology", 1], ["Squint & paediatric", 1], ["Oculoplasty & trauma", 1]
  ],
  "Dermatology": [
    ["Bacterial, viral & fungal infections", 2], ["Eczema, psoriasis & papulosquamous", 1],
    ["Bullous disorders", 1], ["Leprosy", 1], ["STI & HIV", 1],
    ["Pigmentation, hair & nails", 1], ["Drug reactions & emergencies", 1],
    ["Treatment basics & misc", 1]
  ],
  "Psychiatry": [
    ["Schizophrenia & psychosis", 1], ["Mood disorders", 1], ["Anxiety, OCD & phobia", 1],
    ["Substance use", 1], ["Child & adolescent", 1], ["Organic & personality disorders", 1],
    ["Psychopharmacology & ECT", 1], ["Legal aspects", 1]
  ],
  "Radiology": [
    ["Basics & chest X-ray", 2], ["CT & MRI", 1], ["Ultrasound", 1],
    ["Contrast studies", 1], ["Interventional radiology", 1], ["Nuclear medicine", 1],
    ["Image-based high-yield signs", 1]
  ],
  "Anaesthesia": [
    ["General & local anaesthetic drugs", 2], ["Airway management", 2],
    ["Monitoring & positioning", 1], ["Regional anaesthesia", 1],
    ["CPR & resuscitation", 1], ["ICU basics", 1]
  ],
  "Orthopaedics": [
    ["Lower limb trauma", 2], ["Fracture basics & healing", 1], ["Upper limb trauma", 1],
    ["Spine injuries", 1], ["Bone & joint infections", 1], ["Bone tumours", 1],
    ["Nerve & hand injuries", 1], ["Congenital & metabolic bone disease", 1],
    ["Sports & misc", 1]
  ]
};

/* Planner uses this: her custom edits (state.topics) win over the built-in list */
function getTopics(name) {
  if (state && state.topics && state.topics[name]) return state.topics[name];
  return TOPICS[name] || [["High-yield topics", 2]];
}