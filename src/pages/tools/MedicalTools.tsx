import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Modal,
  Input,
  TextArea,
  Select,
  EmptyState,
  Badge,
  Tabs,
  Tooltip,
  Chip,
  ProgressBar,
} from '@/components/UI';
import { useAppStore } from '@/store/useAppStore';
import { Notebook } from 'lucide-react';
import { useLanguageStore } from '@/store/useLanguageStore';
import {
  summarizeText,
  extractKeyIdeas,
  extractTerminology,
  generateMCQs,
  generateFlashcards,
  explainSimply,
} from '@/utils/ai-helpers';
import type { Flashcard, MedicalNote } from '@/types';

// =============================================================================
// Types
// =============================================================================

interface DiseaseInfo {
  name: string;
  symptoms: string[];
  causes: string[];
  treatment: string[];
  description: string;
}

interface DrugInfo {
  name: string;
  drugClass: string;
  indications: string[];
  sideEffects: string[];
  contraindications: string[];
}

interface LabValue {
  name: string;
  category: string;
  unit: string;
  normalRange: string;
  criticalHigh: string;
}

interface FlashcardDeck {
  id: string;
  name: string;
  icon: React.ReactNode;
  cards: { front: string; back: string }[];
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

// =============================================================================
// Disease Database (40 diseases)
// =============================================================================

const DISEASES: Record<string, DiseaseInfo> = {
  'Diabetes Type 2': {
    name: 'Diabetes Mellitus Type 2',
    symptoms: ['Polyuria', 'Polydipsia', 'Polyphagia', 'Fatigue', 'Blurred vision', 'Slow wound healing', 'Tingling in hands/feet'],
    causes: ['Insulin resistance', 'Genetic predisposition', 'Obesity', 'Sedentary lifestyle', 'Age over 45', 'PCOS'],
    treatment: ['Metformin', 'Lifestyle modifications', 'Diet control', 'Regular exercise', 'Sulfonylureas', 'Insulin therapy if needed'],
    description: 'A chronic metabolic disorder characterized by high blood glucose levels due to insulin resistance and relative insulin deficiency.',
  },
  'Hypertension': {
    name: 'Hypertension',
    symptoms: ['Often asymptomatic', 'Headache', 'Dizziness', 'Blurred vision', 'Nosebleeds', 'Shortness of breath'],
    causes: ['High sodium intake', 'Obesity', 'Stress', 'Genetics', 'Lack of exercise', 'Excessive alcohol'],
    treatment: ['ACE inhibitors', 'ARBs', 'Calcium channel blockers', 'Thiazide diuretics', 'Dietary changes', 'Regular exercise'],
    description: 'A chronic medical condition where blood pressure in the arteries is persistently elevated.',
  },
  'Asthma': {
    name: 'Asthma',
    symptoms: ['Wheezing', 'Shortness of breath', 'Chest tightness', 'Coughing at night', 'Exercise intolerance'],
    causes: ['Allergens', 'Air pollution', 'Respiratory infections', 'Cold air', 'Exercise', 'Stress'],
    treatment: ['Inhaled corticosteroids', 'Short-acting beta agonists (Albuterol)', 'Leukotriene modifiers', 'Long-acting beta agonists', 'Avoidance of triggers'],
    description: 'A chronic inflammatory disease of the airways causing reversible airflow obstruction.',
  },
  'Pneumonia': {
    name: 'Pneumonia',
    symptoms: ['Productive cough', 'Fever and chills', 'Dyspnea', 'Pleuritic chest pain', 'Fatigue', 'Confusion in elderly'],
    causes: ['Bacterial infection (Streptococcus pneumoniae)', 'Viral infection', 'Fungal infection', 'Aspiration'],
    treatment: ['Antibiotics (Amoxicillin, Azithromycin)', 'Antivirals if viral', 'Oxygen therapy', 'IV fluids', 'Chest physiotherapy'],
    description: 'An infection that inflames air sacs in one or both lungs, which may fill with fluid or pus.',
  },
  'MI': {
    name: 'Myocardial Infarction',
    symptoms: ['Crushing chest pain', 'Pain radiating to left arm/jaw', 'Diaphoresis', 'Nausea/vomiting', 'Shortness of breath', 'Palpitations'],
    causes: ['Coronary artery occlusion (atherosclerosis)', 'Thrombus formation', 'Coronary vasospasm', 'Embolism'],
    treatment: ['Aspirin', 'PCI (angioplasty/stenting)', 'Thrombolytics', 'Beta-blockers', 'ACE inhibitors', 'Statins', 'Oxygen'],
    description: 'Death of myocardial tissue due to prolonged ischemia of the heart muscle, usually from blockage of a coronary artery.',
  },
  'Stroke': {
    name: 'Stroke',
    symptoms: ['Sudden facial drooping', 'Arm weakness', 'Speech difficulty (FAST)', 'Visual disturbances', 'Severe headache', 'Loss of coordination'],
    causes: ['Ischemic: thrombosis or embolism', 'Hemorrhagic: ruptured blood vessel', 'Hypertension', 'Atrial fibrillation', 'Atherosclerosis'],
    treatment: ['Ischemic: tPA (within 4.5 hrs)', 'Mechanical thrombectomy', 'Antiplatelet therapy', 'Hemorrhagic: blood pressure control', 'Surgical intervention', 'Rehabilitation'],
    description: 'A medical emergency where blood supply to part of the brain is interrupted or reduced, causing brain cell death.',
  },
  'COPD': {
    name: 'COPD',
    symptoms: ['Chronic cough', 'Sputum production', 'Dyspnea on exertion', 'Wheezing', 'Chest tightness', 'Fatigue'],
    causes: ['Smoking (primary)', 'Occupational dust/fumes', 'Alpha-1 antitrypsin deficiency', 'Air pollution'],
    treatment: ['Smoking cessation', 'Inhaled bronchodilators', 'Inhaled corticosteroids', 'Pulmonary rehabilitation', 'Oxygen therapy'],
    description: 'A group of progressive lung diseases including emphysema and chronic bronchitis, characterized by airflow limitation.',
  },
  'Heart Failure': {
    name: 'Heart Failure',
    symptoms: ['Dyspnea', 'Orthopnea', 'Peripheral edema', 'Fatigue', 'Exercise intolerance', 'Weight gain', 'JVD'],
    causes: ['Coronary artery disease', 'Hypertension', 'Cardiomyopathy', 'Valvular heart disease', 'Myocarditis'],
    treatment: ['ACE inhibitors/ARBs', 'Beta-blockers', 'Diuretics', 'Aldosterone antagonists', 'Digoxin', 'Sodium restriction', 'Device therapy'],
    description: 'A chronic condition where the heart cannot pump blood efficiently enough to meet the body needs.',
  },
  'AFib': {
    name: 'Atrial Fibrillation',
    symptoms: ['Palpitations', 'Irregular pulse', 'Dyspnea', 'Fatigue', 'Dizziness', 'Chest discomfort'],
    causes: ['Hypertension', 'Valvular disease', 'Hyperthyroidism', 'Alcohol excess', 'Obstructive sleep apnea', 'Age'],
    treatment: ['Rate control (Beta-blockers, CCBs)', 'Rhythm control (Amiodarone)', 'Anticoagulation (Warfarin, DOACs)', 'Cardioversion', 'Catheter ablation'],
    description: 'The most common cardiac arrhythmia characterized by rapid and irregular atrial activation.',
  },
  'DVT': {
    name: 'Deep Vein Thrombosis',
    symptoms: ['Unilateral leg swelling', 'Pain/tenderness', 'Warmth', 'Redness', 'Dilated veins'],
    causes: ['Venous stasis', 'Hypercoagulability', 'Endothelial injury', 'Immobility', 'Surgery', 'Cancer'],
    treatment: ['Anticoagulation (Heparin then Warfarin)', 'DOACs', 'Compression stockings', 'Thrombolysis in severe cases', 'IVC filter if contraindication'],
    description: 'Formation of a blood clot in a deep vein, usually in the legs, which can be life-threatening if the clot embolizes to the lungs.',
  },
  'PE': {
    name: 'Pulmonary Embolism',
    symptoms: ['Sudden dyspnea', 'Pleuritic chest pain', 'Tachycardia', 'Hemoptysis', 'Hypoxia', 'Anxiety'],
    causes: ['DVT embolization', 'Immobility', 'Hypercoagulable states', 'Surgery', 'Cancer', 'Oral contraceptives'],
    treatment: ['Anticoagulation', 'Thrombolysis for massive PE', 'Embolectomy', 'IVC filter', 'Oxygen support', 'Hemodynamic support'],
    description: 'A blockage in one of the pulmonary arteries in the lungs, usually from blood clots that travel from the legs.',
  },
  'GERD': {
    name: 'GERD',
    symptoms: ['Heartburn', 'Regurgitation', 'Dysphagia', 'Chronic cough', 'Laryngitis', 'Chest pain'],
    causes: ['Lower esophageal sphincter dysfunction', 'Obesity', 'Hiatal hernia', 'Pregnancy', 'Smoking'],
    treatment: ['PPIs (Omeprazole)', 'H2 blockers', 'Lifestyle modifications', 'Dietary changes', 'Antacids', 'Surgery in refractory cases'],
    description: 'A chronic digestive disease where stomach acid frequently flows back into the esophagus, irritating its lining.',
  },
  'Hepatitis': {
    name: 'Hepatitis',
    symptoms: ['Jaundice', 'Fatigue', 'Abdominal pain', 'Nausea', 'Dark urine', 'Pale stools', 'Fever'],
    causes: ['Viral (A, B, C, D, E)', 'Alcohol', 'Autoimmune', 'Drug-induced', 'Toxins'],
    treatment: ['Hepatitis A: Supportive care', 'Hepatitis B: Antivirals (Tenofovir)', 'Hepatitis C: DAAs (Sofosbuvir)', 'Avoid hepatotoxins', 'Vaccination'],
    description: 'Inflammation of the liver, most commonly caused by a viral infection, but also by alcohol, toxins, or autoimmune conditions.',
  },
  'Cirrhosis': {
    name: 'Cirrhosis',
    symptoms: ['Fatigue', 'Jaundice', 'Ascites', 'Peripheral edema', 'Easy bruising', 'Hepatic encephalopathy', 'Spider angiomata'],
    causes: ['Chronic alcoholism', 'Chronic hepatitis B/C', 'NAFLD', 'Autoimmune hepatitis', 'Biliary diseases'],
    treatment: ['Treat underlying cause', 'Diuretics for ascites', 'Lactulose for encephalopathy', 'Beta-blockers for portal hypertension', 'Liver transplant'],
    description: 'Late-stage scarring (fibrosis) of the liver caused by various liver diseases and conditions.',
  },
  'CKD': {
    name: 'Chronic Kidney Disease',
    symptoms: ['Fatigue', 'Peripheral edema', 'Nocturia', 'Nausea', 'Pruritus', 'Muscle cramps', 'Anorexia'],
    causes: ['Diabetes mellitus', 'Hypertension', 'Glomerulonephritis', 'Polycystic kidney disease', 'Obstructive uropathy'],
    treatment: ['ACE inhibitors/ARBs', 'Blood sugar control', 'Dietary modifications (low protein, low sodium)', 'Phosphate binders', 'Dialysis', 'Kidney transplant'],
    description: 'A gradual loss of kidney function over time, leading to waste accumulation in the body.',
  },
  'UTI': {
    name: 'Urinary Tract Infection',
    symptoms: ['Dysuria', 'Frequency', 'Urgency', 'Suprapubic pain', 'Hematuria', 'Foul-smelling urine'],
    causes: ['E. coli (most common)', 'Klebsiella', 'Staphylococcus saprophyticus', 'Sexual activity', 'Female anatomy', 'Catheterization'],
    treatment: ['Nitrofurantoin', 'Trimethoprim-sulfamethoxazole', 'Ciprofloxacin', 'Increase fluid intake', 'Phenazopyridine for symptoms'],
    description: 'An infection in any part of the urinary system, most commonly the bladder and urethra.',
  },
  'Meningitis': {
    name: 'Meningitis',
    symptoms: ['Severe headache', 'Neck stiffness (nuchal rigidity)', 'Fever', 'Photophobia', 'Nausea/vomiting', 'Altered mental status', 'Kernig/Brudzinski signs'],
    causes: ['Bacterial (Neisseria meningitidis, S. pneumoniae)', 'Viral', 'Fungal', 'Parasitic'],
    treatment: ['Empiric antibiotics (Ceftriaxone + Vancomycin)', 'Dexamethasone', 'Acyclovir if viral suspected', 'Supportive care', 'Isolation precautions'],
    description: 'Inflammation of the meninges (protective membranes covering the brain and spinal cord), usually due to infection.',
  },
  'Sepsis': {
    name: 'Sepsis',
    symptoms: ['Fever or hypothermia', 'Tachycardia', 'Tachypnea', 'Altered mental status', 'Hypotension', 'Warm/flushed skin', 'Oliguria'],
    causes: ['Bacterial infection (most common)', 'Fungal infection', 'Viral infection', 'Post-surgical', 'Immunocompromised'],
    treatment: ['Broad-spectrum antibiotics', 'IV fluid resuscitation', 'Vasopressors', 'Source control', 'Organ support', 'Corticosteroids in refractory shock'],
    description: 'A life-threatening condition where the body response to infection causes damage to its own tissues and organs.',
  },
  'Anemia': {
    name: 'Anemia',
    symptoms: ['Fatigue', 'Pallor', 'Dyspnea on exertion', 'Tachycardia', 'Dizziness', 'Cold extremities'],
    causes: ['Iron deficiency', 'Vitamin B12/folate deficiency', 'Chronic disease', 'Hemolysis', 'Blood loss', 'Bone marrow failure'],
    treatment: ['Iron supplementation', 'Vitamin B12/folate', 'EPO stimulating agents', 'Blood transfusion', 'Treat underlying cause'],
    description: 'A condition in which the blood lacks enough healthy red blood cells or hemoglobin to carry adequate oxygen to tissues.',
  },
  'Hyperthyroidism': {
    name: 'Hyperthyroidism',
    symptoms: ['Weight loss', 'Heat intolerance', 'Palpitations', 'Tremor', 'Anxiety', 'Exophthalmos', 'Diarrhea'],
    causes: ["Graves' disease", 'Toxic multinodular goiter', 'Toxic adenoma', 'Thyroiditis', 'Excess iodine'],
    treatment: ['Methimazole', 'Propylthiouracil', 'Radioactive iodine ablation', 'Beta-blockers for symptoms', 'Thyroidectomy'],
    description: 'A condition of excess thyroid hormone production leading to a hypermetabolic state.',
  },
  'Hypothyroidism': {
    name: 'Hypothyroidism',
    symptoms: ['Weight gain', 'Cold intolerance', 'Fatigue', 'Constipation', 'Dry skin', 'Bradycardia', 'Depression'],
    causes: ["Hashimoto's thyroiditis", 'Iodine deficiency', 'Post-thyroidectomy', 'Post-radioactive iodine', 'Pituitary disorders'],
    treatment: ['Levothyroxine replacement', 'Dose monitoring with TSH', 'Lifelong therapy in most cases'],
    description: 'A condition where the thyroid gland does not produce enough thyroid hormones, leading to a hypometabolic state.',
  },
  'Diabetes Type 1': {
    name: 'Diabetes Mellitus Type 1',
    symptoms: ['Polyuria', 'Polydipsia', 'Weight loss', 'Fatigue', 'Blurred vision', 'DKA presentation possible'],
    causes: ['Autoimmune destruction of beta cells', 'Genetic predisposition', 'Environmental triggers'],
    treatment: ['Insulin therapy (basal-bolus)', 'Carbohydrate counting', 'Continuous glucose monitoring', 'Regular exercise', 'Diabetic education'],
    description: 'An autoimmune condition where the pancreas produces little or no insulin due to destruction of pancreatic beta cells.',
  },
  'DKA': {
    name: 'Diabetic Ketoacidosis',
    symptoms: ['Kussmaul breathing', 'Fruity breath odor', 'Nausea/vomiting', 'Abdominal pain', 'Dehydration', 'Altered consciousness'],
    causes: ['Insulin deficiency', 'Infection', 'Non-compliance with insulin', 'New-onset diabetes'],
    treatment: ['IV normal saline', 'Insulin infusion', 'Potassium replacement', 'Treat precipitating factor', 'Monitor glucose and electrolytes'],
    description: 'A serious complication of diabetes where the body produces excess blood ketones, making the blood acidic.',
  },
  'Pancreatitis': {
    name: 'Pancreatitis',
    symptoms: ['Severe epigastric pain radiating to back', 'Nausea/vomiting', 'Fever', 'Tachycardia', 'Abdominal tenderness'],
    causes: ['Gallstones', 'Alcohol abuse', 'Hypertriglyceridemia', 'Medications', 'ERCP', 'Autoimmune'],
    treatment: ['NPO initially', 'IV fluid resuscitation', 'Pain management', 'Nutritional support', 'Treat underlying cause', 'Antibiotics if infected'],
    description: 'Inflammation of the pancreas that can be acute or chronic, ranging from mild to life-threatening.',
  },
  'Cholecystitis': {
    name: 'Cholecystitis',
    symptoms: ['RUQ pain', 'Pain after fatty meals', 'Nausea/vomiting', 'Fever', "Murphy's sign positive"],
    causes: ['Gallstones (90%)', 'Biliary sludge', 'Infection', 'Ischemia'],
    treatment: ['NPO', 'IV fluids', 'Antibiotics', 'Pain management', 'Laparoscopic cholecystectomy'],
    description: 'Inflammation of the gallbladder, usually caused by gallstone obstruction of the cystic duct.',
  },
  'Appendicitis': {
    name: 'Appendicitis',
    symptoms: ['Periumbilical pain migrating to RLQ', 'Anorexia', 'Nausea/vomiting', 'Fever', 'Rebound tenderness', 'Rovsing/Psoas/Obturator signs'],
    causes: ['Obstruction of appendiceal lumen', 'Fecalith', 'Lymphoid hyperplasia', 'Tumors'],
    treatment: ['Appendectomy (laparoscopic)', 'IV antibiotics', 'IV fluids', 'NPO', 'Appendectomy is the definitive treatment'],
    description: 'Inflammation of the vermiform appendix, the most common cause of acute abdomen requiring surgery.',
  },
  'RA': {
    name: 'Rheumatoid Arthritis',
    symptoms: ['Symmetric joint swelling', 'Morning stiffness >30 min', 'Small joint involvement', 'Fatigue', 'Rheumatoid nodules'],
    causes: ['Autoimmune (anti-CCP, RF positive)', 'Genetic (HLA-DR4)', 'Environmental triggers', 'Smoking increases risk'],
    treatment: ['Methotrexate (first-line DMARD)', 'Biologics (TNF inhibitors)', 'Corticosteroids', 'Physical therapy', 'NSAIDs for symptoms'],
    description: 'A chronic autoimmune inflammatory disorder primarily affecting the synovial joints, causing progressive joint destruction.',
  },
  'SLE': {
    name: 'Systemic Lupus Erythematosus',
    symptoms: ['Malar rash', 'Arthritis', 'Serositis', 'Renal involvement', 'Fatigue', 'Photosensitivity', 'Oral ulcers'],
    causes: ['Autoimmune', 'Genetic predisposition', 'Hormonal factors', 'UV exposure', 'Infections'],
    treatment: ['Hydroxychloroquine (all patients)', 'Corticosteroids', 'Immunosuppressants (Mycophenolate)', 'Belimumab', 'Sun protection'],
    description: 'A chronic systemic autoimmune disease that can affect virtually any organ system.',
  },
  'Gout': {
    name: 'Gout',
    symptoms: ['Acute joint pain (usually 1st MTP)', 'Redness and swelling', 'Warmth', 'Tophi in chronic cases', 'Limited range of motion'],
    causes: ['Hyperuricemia', 'Diet (red meat, alcohol, shellfish)', 'Obesity', 'Diuretics', 'Renal insufficiency'],
    treatment: ['Colchicine (acute)', 'NSAIDs (acute)', 'Allopurinol/Febuxostat (chronic)', 'Dietary modifications', 'Corticosteroids'],
    description: 'An inflammatory arthritis caused by deposition of monosodium urate crystals in joints due to hyperuricemia.',
  },
  'Osteoporosis': {
    name: 'Osteoporosis',
    symptoms: ['Often asymptomatic until fracture', 'Back pain', 'Loss of height', 'Kyphosis', 'Fragility fractures'],
    causes: ['Aging', 'Postmenopausal estrogen decline', 'Low calcium/vitamin D', 'Sedentary lifestyle', 'Steroid use', 'Hyperparathyroidism'],
    treatment: ['Bisphosphonates (Alendronate)', 'Calcium + Vitamin D supplementation', 'Weight-bearing exercise', 'Denosumab', 'Teriparatide'],
    description: 'A condition characterized by decreased bone density and increased fragility, leading to a higher risk of fractures.',
  },
  'Depression': {
    name: 'Major Depressive Disorder',
    symptoms: ['Persistent sad mood', 'Anhedonia', 'Weight changes', 'Sleep disturbances', 'Fatigue', 'Feelings of worthlessness', 'Suicidal ideation'],
    causes: ['Neurotransmitter imbalance (serotonin, NE, dopamine)', 'Genetic factors', 'Stressful life events', 'Medical conditions'],
    treatment: ['SSRIs (Sertraline, Fluoxetine)', 'SNRIs', 'CBT', 'Exercise', 'Psychotherapy', 'ECT in refractory cases'],
    description: 'A mood disorder causing persistent feelings of sadness and loss of interest that interfere with daily functioning.',
  },
  'Anxiety': {
    name: 'Generalized Anxiety Disorder',
    symptoms: ['Excessive worry', 'Restlessness', 'Fatigue', 'Difficulty concentrating', 'Muscle tension', 'Sleep disturbances', 'Irritability'],
    causes: ['Genetic predisposition', 'Neurochemical imbalances', 'Environmental stressors', 'Personality factors'],
    treatment: ['SSRIs/SNRIs (first-line)', 'Buspirone', 'CBT', 'Relaxation techniques', 'Avoid benzodiazepines long-term'],
    description: 'A chronic anxiety disorder characterized by excessive, uncontrollable worry about various aspects of life.',
  },
  'Bipolar': {
    name: 'Bipolar Disorder',
    symptoms: ['Manic episodes (euphoria, grandiosity, decreased sleep)', 'Depressive episodes', 'Rapid cycling', 'Impaired functioning'],
    causes: ['Genetic factors', 'Neurochemical imbalances', 'Stress', 'Sleep disruption'],
    treatment: ['Mood stabilizers (Lithium, Valproate)', 'Atypical antipsychotics', 'Psychotherapy', 'Avoid antidepressants alone'],
    description: 'A mental health condition marked by extreme mood swings including manic/hypomanic episodes and depressive episodes.',
  },
  "Alzheimer's": {
    name: "Alzheimer's Disease",
    symptoms: ['Progressive memory loss', 'Disorientation', 'Language difficulties', 'Behavioral changes', 'Loss of ADLs', 'Wandering'],
    causes: ['Amyloid-beta plaques', 'Neurofibrillary tangles', 'Age', 'Genetic factors (APOE4)', 'Cardiovascular risk factors'],
    treatment: ['Cholinesterase inhibitors (Donepezil)', 'Memantine', 'Supportive care', 'Cognitive stimulation', 'Caregiver support'],
    description: 'A progressive neurodegenerative disease and the most common cause of dementia.',
  },
  "Parkinson's": {
    name: "Parkinson's Disease",
    symptoms: ['Resting tremor', 'Bradykinesia', 'Rigidity', 'Postural instability', 'Shuffling gait', 'Masked facies'],
    causes: ['Loss of dopaminergic neurons in substantia nigra', 'Alpha-synuclein aggregation', 'Age', 'Genetics', 'Environmental toxins'],
    treatment: ['Levodopa/Carbidopa (first-line)', 'Dopamine agonists', 'MAO-B inhibitors', 'Anticholinergics', 'Deep brain stimulation'],
    description: 'A progressive neurodegenerative disorder affecting movement, characterized by tremor, rigidity, bradykinesia, and postural instability.',
  },
  'Epilepsy': {
    name: 'Epilepsy',
    symptoms: ['Recurrent seizures', 'Loss of awareness', 'Muscle jerking', 'Staring spells', 'Sensory disturbances', 'Post-ictal confusion'],
    causes: ['Genetic factors', 'Brain injury', 'Infections', 'Tumors', 'Stroke', 'Developmental disorders'],
    treatment: ['Antiepileptic drugs (Levetiracetam, Valproate)', 'Ketogenic diet', 'Vagus nerve stimulation', 'Epilepsy surgery', 'Seizure precautions'],
    description: 'A neurological disorder characterized by recurrent, unprovoked seizures due to abnormal electrical activity in the brain.',
  },
  'Migraine': {
    name: 'Migraine',
    symptoms: ['Unilateral throbbing headache', 'Photophobia and phonophobia', 'Nausea/vomiting', 'Aura (visual)', 'Duration 4-72 hours'],
    causes: ['Genetic predisposition', 'Stress', 'Hormonal changes', 'Certain foods', 'Sleep changes', 'Sensory stimuli'],
    treatment: ['Triptans (Sumatriptan)', 'NSAIDs', 'Anti-emetics', 'Preventive: Beta-blockers, Antidepressants, Anticonvulsants', 'CGRP inhibitors'],
    description: 'A neurological condition characterized by recurrent moderate to severe headaches, often with associated symptoms.',
  },
  'Leukemia': {
    name: 'Leukemia',
    symptoms: ['Fatigue', 'Frequent infections', 'Easy bruising/bleeding', 'Weight loss', 'Night sweats', 'Bone pain', 'Pallor'],
    causes: ['Unknown in many cases', 'Genetic mutations', 'Radiation exposure', 'Chemical exposure (benzene)', 'Viral factors (HTLV-1)'],
    treatment: ['Chemotherapy', 'Targeted therapy', 'Immunotherapy', 'Stem cell transplantation', 'Radiation therapy', 'Supportive care'],
    description: 'A group of cancers affecting blood and bone marrow, characterized by overproduction of abnormal white blood cells.',
  },
  'Lymphoma': {
    name: 'Lymphoma',
    symptoms: ['Painless lymphadenopathy', 'B symptoms (fever, night sweats, weight loss)', 'Fatigue', 'Pruritus', 'Hepatosplenomegaly'],
    causes: ['Unknown in many cases', 'EBV infection', 'HIV', 'Immunosuppression', 'Genetic factors'],
    treatment: ['Chemotherapy (ABVD for Hodgkin)', 'Radiation', 'Immunotherapy', 'Stem cell transplant', 'CAR-T cell therapy'],
    description: 'A group of blood cancers that develop in the lymphatic system, classified as Hodgkin or Non-Hodgkin lymphoma.',
  },
  'Hyperlipidemia': {
    name: 'Hyperlipidemia',
    symptoms: ['Usually asymptomatic', 'Xanthelasma', 'Corneal arcus', 'Tendon xanthomas', 'Pancreatitis (severe hypertriglyceridemia)'],
    causes: ['Diet high in saturated fats', 'Obesity', 'Genetic (familial hyperlipidemia)', 'Hypothyroidism', 'Diabetes', 'Sedentary lifestyle'],
    treatment: ['Statin therapy', 'Dietary modifications', 'Exercise', 'Fibrates for triglycerides', 'Ezetimibe', 'PCSK9 inhibitors'],
    description: 'Elevated levels of lipids (cholesterol and/or triglycerides) in the blood, increasing cardiovascular disease risk.',
  },
};

// =============================================================================
// Drug Database (25 drugs)
// =============================================================================

const DRUGS: Record<string, DrugInfo> = {
  Aspirin: {
    name: 'Aspirin',
    drugClass: 'NSAID / Antiplatelet',
    indications: ['Pain relief', 'Fever reduction', 'Anti-inflammatory', 'Cardiovascular prevention', 'Post-MI prevention'],
    sideEffects: ['GI bleeding', 'Stomach ulcers', 'Tinnitus', 'Increased bruising', 'Reye syndrome in children'],
    contraindications: ['Active peptic ulcer', 'Bleeding disorders', 'Children with viral illness (Reye syndrome)', 'Severe hepatic impairment', 'Third trimester pregnancy'],
  },
  Ibuprofen: {
    name: 'Ibuprofen',
    drugClass: 'NSAID',
    indications: ['Pain relief', 'Fever reduction', 'Anti-inflammatory', 'Arthritis', 'Menstrual cramps'],
    sideEffects: ['GI upset', 'GI bleeding', 'Renal impairment', 'Cardiovascular risk', 'Hypertension'],
    contraindications: ['Active GI bleeding', 'Severe renal impairment', 'NSAID hypersensitivity', 'Third trimester pregnancy', 'Post-CABG surgery'],
  },
  Metformin: {
    name: 'Metformin',
    drugClass: 'Biguanide (Antidiabetic)',
    indications: ['Type 2 Diabetes Mellitus', 'PCOS', 'Prediabetes', 'Off-label: weight management'],
    sideEffects: ['GI disturbance (nausea, diarrhea)', 'Lactic acidosis (rare but serious)', 'Vitamin B12 deficiency', 'Metallic taste'],
    contraindications: ['Severe renal impairment (eGFR <30)', 'Metabolic acidosis', 'Hepatic impairment', 'Excessive alcohol use', 'IV contrast administration'],
  },
  Lisinopril: {
    name: 'Lisinopril',
    drugClass: 'ACE Inhibitor',
    indications: ['Hypertension', 'Heart failure', 'Post-MI', 'Diabetic nephropathy', 'Proteinuria reduction'],
    sideEffects: ['Dry cough', 'Hyperkalemia', 'Angioedema', 'Hypotension', 'Dizziness', 'Renal impairment'],
    contraindications: ['History of angioedema', 'Pregnancy', 'Bilateral renal artery stenosis', 'Hyperkalemia', 'Concurrent aliskiren use'],
  },
  Amlodipine: {
    name: 'Amlodipine',
    drugClass: 'Calcium Channel Blocker',
    indications: ['Hypertension', 'Angina pectoris', 'Coronary artery disease', 'Vasospastic angina'],
    sideEffects: ['Peripheral edema', 'Flushing', 'Headache', 'Dizziness', 'Fatigue', 'Palpitations'],
    contraindications: ['Severe hypotension', 'Cardiogenic shock', 'Severe aortic stenosis', 'Hepatic impairment'],
  },
  Metoprolol: {
    name: 'Metoprolol',
    drugClass: 'Beta-1 Blocker',
    indications: ['Hypertension', 'Angina', 'Heart failure', 'Post-MI', 'Arrhythmias', 'Migraine prevention'],
    sideEffects: ['Bradycardia', 'Fatigue', 'Cold extremities', 'Bronchospasm', 'Depression', 'Sexual dysfunction'],
    contraindications: ['Severe bradycardia', 'Heart block (2nd/3rd degree)', 'Cardiogenic shock', 'Decompensated HF', 'Severe asthma/COPD'],
  },
  Atorvastatin: {
    name: 'Atorvastatin',
    drugClass: 'Statin (HMG-CoA Reductase Inhibitor)',
    indications: ['Hyperlipidemia', 'Cardiovascular prevention', 'Post-MI/stroke', 'Familial hypercholesterolemia'],
    sideEffects: ['Myopathy/myalgia', 'Hepatotoxicity', 'GI upset', 'Headache', 'Increased diabetes risk', 'Rhabdomyolysis (rare)'],
    contraindications: ['Active liver disease', 'Pregnancy', 'Breastfeeding', 'Concurrent cyclosporine use', 'Unexplained persistent transaminase elevations'],
  },
  Omeprazole: {
    name: 'Omeprazole',
    drugClass: 'Proton Pump Inhibitor',
    indications: ['GERD', 'Peptic ulcer disease', 'H. pylori eradication (combination)', 'Zollinger-Ellison syndrome', 'NSAID-induced ulcer prophylaxis'],
    sideEffects: ['Headache', 'Diarrhea', 'Vitamin B12 deficiency', 'Hypomagnesemia', 'Bone fracture risk (long-term)', 'Clostridium difficile infection'],
    contraindications: ['Hypersensitivity to PPIs', 'Concurrent rilpivirine use', 'Long-term use should be reassessed'],
  },
  Amoxicillin: {
    name: 'Amoxicillin',
    drugClass: 'Penicillin Antibiotic',
    indications: ['Upper respiratory infections', 'Otitis media', 'UTI', 'H. pylori eradication', 'Dental infections', 'Community-acquired pneumonia'],
    sideEffects: ['GI upset', 'Diarrhea', 'Skin rash', 'Allergic reactions (anaphylaxis rare)', 'C. difficile colitis'],
    contraindications: ['Penicillin hypersensitivity', 'History of amoxicillin-associated cholestatic jaundice/hepatic dysfunction', 'Infectious mononucleosis (rash risk)'],
  },
  Azithromycin: {
    name: 'Azithromycin',
    drugClass: 'Macrolide Antibiotic',
    indications: ['Community-acquired pneumonia', 'Bronchitis', 'Pharyngitis', 'Chlamydia', 'Traveler\'s diarrhea', 'Sinusitis'],
    sideEffects: ['GI upset', 'Diarrhea', 'QT prolongation', 'Hepatotoxicity', 'Ototoxicity (rare)', 'Cardiac arrhythmias'],
    contraindications: ['Macrolide hypersensitivity', 'Severe hepatic impairment', 'Concurrent QT-prolonging drugs', 'History of cholestatic jaundice with macrolides'],
  },
  Ciprofloxacin: {
    name: 'Ciprofloxacin',
    drugClass: 'Fluoroquinolone Antibiotic',
    indications: ['UTI', 'Complicated infections', 'Bone/joint infections', 'Anthrax prophylaxis', 'Infectious diarrhea'],
    sideEffects: ['Tendon rupture/tendinitis', 'QT prolongation', 'Peripheral neuropathy', 'CNS effects', 'GI upset', 'Phototoxicity'],
    contraindications: ['Fluoroquinolone hypersensitivity', 'Concurrent tizanidine', 'Myasthenia gravis', 'Aortic aneurysm risk', 'QT prolongation'],
  },
  Prednisone: {
    name: 'Prednisone',
    drugClass: 'Corticosteroid',
    indications: ['Inflammatory conditions', 'Autoimmune diseases', 'Allergic reactions', 'Asthma exacerbations', 'Organ transplant rejection prevention'],
    sideEffects: ['Hyperglycemia', 'Weight gain', 'Osteoporosis', 'Immunosuppression', 'Adrenal suppression', 'Cushing syndrome', 'GI upset'],
    contraindications: ['Systemic fungal infections', 'Live vaccines during immunosuppression', 'Uncontrolled hypertension', 'Active PUD'],
  },
  Levothyroxine: {
    name: 'Levothyroxine',
    drugClass: 'Thyroid Hormone Replacement',
    indications: ['Hypothyroidism', 'TSH suppression (thyroid cancer)', 'Myxedema coma', 'Tertiary hypothyroidism'],
    sideEffects: ['Overdose: palpitations, tremor, weight loss', 'Insomnia', 'Anxiety', 'Tachycardia', 'Heat intolerance'],
    contraindications: ['Thyrotoxicosis', 'Uncorrected adrenal insufficiency', 'Acute MI', 'Hypersensitivity to levothyroxine'],
  },
  Warfarin: {
    name: 'Warfarin',
    drugClass: 'Vitamin K Antagonist (Anticoagulant)',
    indications: ['DVT/PE treatment and prevention', 'Atrial fibrillation (stroke prevention)', 'Mechanical heart valve', 'Antiphospholipid syndrome'],
    sideEffects: ['Bleeding', 'Skin necrosis', 'Purple toe syndrome', 'Teratogenic effects', 'Drug-food interactions'],
    contraindications: ['Active bleeding', 'Pregnancy', 'Severe liver disease', 'Recent surgery', 'Uncontrolled hypertension'],
  },
  Clopidogrel: {
    name: 'Clopidogrel',
    drugClass: 'Antiplatelet (P2Y12 Inhibitor)',
    indications: ['Acute coronary syndrome', 'Post-stent placement', 'Post-MI', 'Ischemic stroke prevention', 'Peripheral arterial disease'],
    sideEffects: ['Bleeding', 'Bruising', 'GI upset', 'TTP (rare)', 'Neutropenia (rare)'],
    contraindications: ['Active pathological bleeding', 'Severe hepatic impairment', 'CYP2C19 poor metabolizers (reduced efficacy)'],
  },
  Furosemide: {
    name: 'Furosemide',
    drugClass: 'Loop Diuretic',
    indications: ['Heart failure (edema)', 'Pulmonary edema', 'Hypertension', 'Ascites', 'Nephrotic syndrome', 'Hypercalcemia'],
    sideEffects: ['Hypokalemia', 'Dehydration', 'Hypotension', 'Ototoxicity', 'Hyperuricemia', 'Metabolic alkalosis'],
    contraindications: ['Anuria', 'Hepatic coma', 'Severe electrolyte depletion', 'Sulfonamide allergy', 'Pregnancy'],
  },
  Albuterol: {
    name: 'Albuterol',
    drugClass: 'Short-Acting Beta-2 Agonist (SABA)',
    indications: ['Acute asthma', 'COPD bronchospasm', 'Exercise-induced bronchospasm', 'Hyperkalemia (acute management)'],
    sideEffects: ['Tachycardia', 'Tremor', 'Hypokalemia', 'Palpitations', 'Headache', 'Throat irritation'],
    contraindications: ['Hypersensitivity to albuterol', 'Use with caution in thyrotoxicosis, diabetes, cardiovascular disease'],
  },
  Sertraline: {
    name: 'Sertraline',
    drugClass: 'SSRI (Selective Serotonin Reuptake Inhibitor)',
    indications: ['Major depressive disorder', 'Generalized anxiety', 'Panic disorder', 'OCD', 'PTSD', 'Social anxiety'],
    sideEffects: ['Nausea', 'Diarrhea', 'Sexual dysfunction', 'Insomnia', 'Dizziness', 'Serotonin syndrome (with other serotonergic drugs)', 'Suicidal ideation (youth)'],
    contraindications: ['Concurrent MAOIs (within 14 days)', 'Pimozide use', 'Concurrent use with disulfiram'],
  },
  Diazepam: {
    name: 'Diazepam',
    drugClass: 'Benzodiazepine',
    indications: ['Anxiety', 'Seizures (status epilepticus)', 'Muscle spasm', 'Alcohol withdrawal', 'Sedation', 'Alcohol withdrawal'],
    sideEffects: ['Sedation', 'Respiratory depression', 'Dependence/tolerance', 'Ataxia', 'Paradoxical agitation', 'Amnesia'],
    contraindications: ['Severe respiratory insufficiency', 'Sleep apnea', 'Myasthenia gravis', 'Acute narrow-angle glaucoma', 'Pregnancy'],
  },
  Morphine: {
    name: 'Morphine',
    drugClass: 'Opioid Analgesic',
    indications: ['Severe pain', 'Post-surgical pain', 'Cancer pain', 'Acute MI', 'Palliative care'],
    sideEffects: ['Respiratory depression', 'Constipation', 'Nausea/vomiting', 'Sedation', 'Pruritus', 'Urinary retention', 'Tolerance/dependence'],
    contraindications: ['Respiratory depression', 'Paralytic ileus', 'Severe asthma', 'Head injury (raised ICP)', 'Concurrent MAOIs'],
  },
  Cetirizine: {
    name: 'Cetirizine',
    drugClass: 'Second-Generation Antihistamine (H1 Blocker)',
    indications: ['Allergic rhinitis', 'Urticaria', 'Chronic idiopathic urticaria', 'Allergic conjunctivitis', 'Atopic dermatitis'],
    sideEffects: ['Drowsiness', 'Dry mouth', 'Fatigue', 'Headache', 'Less sedating than first-gen antihistamines'],
    contraindications: ['Hypersensitivity to cetirizine or hydroxyzine', 'Severe renal impairment (dose adjustment needed)'],
  },
  Epinephrine: {
    name: 'Epinephrine (Adrenaline)',
    drugClass: 'Catecholamine / Sympathomimetic',
    indications: ['Anaphylaxis', 'Cardiac arrest', 'Severe asthma (refractory)', 'Local hemostasis', 'Symptomatic bradycardia'],
    sideEffects: ['Tachycardia', 'Hypertension', 'Arrhythmias', 'Tremor', 'Anxiety', 'Myocardial ischemia'],
    contraindications: ['Narrow-angle glaucoma', 'Use during second stage of labor', 'Concurrent halogenated anesthetics (arrhythmia risk)'],
  },
  Insulin: {
    name: 'Insulin (Regular/Human)',
    drugClass: 'Antidiabetic (Insulin)',
    indications: ['Type 1 Diabetes', 'DKA', 'Gestational diabetes', 'Type 2 DM (inadequate control)', 'Hyperkalemia management'],
    sideEffects: ['Hypoglycemia', 'Lipodystrophy at injection site', 'Weight gain', 'Hypokalemia', 'Anaphylaxis (rare)'],
    contraindications: ['Hypoglycemia', 'Hypersensitivity to insulin formulations'],
  },
  Heparin: {
    name: 'Heparin (Unfractionated)',
    drugClass: 'Anticoagulant',
    indications: ['DVT/PE treatment', 'ACS', 'Cardiopulmonary bypass', 'Prevention of clotting in IV lines', 'DIC management'],
    sideEffects: ['Bleeding', 'HIT (heparin-induced thrombocytopenia)', 'Osteoporosis (long-term)', 'Hyperkalemia', 'Skin necrosis'],
    contraindications: ['Active bleeding', 'HIT history', 'Severe thrombocytopenia', 'Uncontrolled hypertension', 'Recent surgery'],
  },
  Doxycycline: {
    name: 'Doxycycline',
    drugClass: 'Tetracycline Antibiotic',
    indications: ['Community-acquired pneumonia', 'Lyme disease', 'Malaria prophylaxis', 'Acne vulgaris', 'Chlamydia', 'MRSA skin infections'],
    sideEffects: ['Photosensitivity', 'Esophageal irritation', 'GI upset', 'Tooth discoloration in children', 'Vaginal candidiasis'],
    contraindications: ['Pregnancy', 'Children under 8', 'Hepatic impairment', 'Concurrent warfarin (increased INR)'],
  },
};

// =============================================================================
// Lab Values (40 tests)
// =============================================================================

const LAB_VALUES: LabValue[] = [
  { name: 'WBC', category: 'Hematology', unit: 'K/uL', normalRange: '4.5 - 11.0', criticalHigh: '>30.0' },
  { name: 'RBC', category: 'Hematology', unit: 'M/uL', normalRange: '4.5 - 5.5 (M) / 4.0 - 5.0 (F)', criticalHigh: '>6.0' },
  { name: 'Hgb', category: 'Hematology', unit: 'g/dL', normalRange: '13.5 - 17.5 (M) / 12.0 - 16.0 (F)', criticalHigh: '>20.0' },
  { name: 'Hct', category: 'Hematology', unit: '%', normalRange: '38.3 - 48.6 (M) / 35.5 - 44.9 (F)', criticalHigh: '>54.0' },
  { name: 'Plt', category: 'Hematology', unit: 'K/uL', normalRange: '150 - 400', criticalHigh: '>1000' },
  { name: 'Na', category: 'Chemistry', unit: 'mEq/L', normalRange: '136 - 145', criticalHigh: '>160' },
  { name: 'K', category: 'Chemistry', unit: 'mEq/L', normalRange: '3.5 - 5.0', criticalHigh: '>6.5' },
  { name: 'Cl', category: 'Chemistry', unit: 'mEq/L', normalRange: '98 - 106', criticalHigh: '>115' },
  { name: 'CO2', category: 'Chemistry', unit: 'mEq/L', normalRange: '23 - 29', criticalHigh: '>40' },
  { name: 'BUN', category: 'Renal', unit: 'mg/dL', normalRange: '7 - 20', criticalHigh: '>100' },
  { name: 'Cr', category: 'Renal', unit: 'mg/dL', normalRange: '0.6 - 1.2', criticalHigh: '>10.0' },
  { name: 'Glucose', category: 'Chemistry', unit: 'mg/dL', normalRange: '70 - 100 (fasting)', criticalHigh: '>500' },
  { name: 'Ca', category: 'Chemistry', unit: 'mg/dL', normalRange: '8.5 - 10.5', criticalHigh: '>14.0' },
  { name: 'ALT', category: 'Hepatic', unit: 'U/L', normalRange: '7 - 56', criticalHigh: '>1000' },
  { name: 'AST', category: 'Hepatic', unit: 'U/L', normalRange: '10 - 40', criticalHigh: '>1000' },
  { name: 'ALP', category: 'Hepatic', unit: 'U/L', normalRange: '44 - 147', criticalHigh: '>500' },
  { name: 'Bilirubin', category: 'Hepatic', unit: 'mg/dL', normalRange: '0.1 - 1.2', criticalHigh: '>20.0' },
  { name: 'Albumin', category: 'Hepatic', unit: 'g/dL', normalRange: '3.5 - 5.5', criticalHigh: '<1.5 (critical low)' },
  { name: 'TSH', category: 'Endocrine', unit: 'mIU/L', normalRange: '0.4 - 4.0', criticalHigh: '>100' },
  { name: 'HbA1c', category: 'Endocrine', unit: '%', normalRange: '<5.7 (normal) / 5.7-6.4 (prediabetes)', criticalHigh: '>12.0' },
  { name: 'Troponin', category: 'Cardiac', unit: 'ng/mL', normalRange: '<0.04', criticalHigh: '>10.0' },
  { name: 'BNP', category: 'Cardiac', unit: 'pg/mL', normalRange: '<100', criticalHigh: '>4000' },
  { name: 'PT', category: 'Coagulation', unit: 'seconds', normalRange: '11 - 13.5', criticalHigh: '>100' },
  { name: 'PTT', category: 'Coagulation', unit: 'seconds', normalRange: '25 - 35', criticalHigh: '>80' },
  { name: 'INR', category: 'Coagulation', unit: 'ratio', normalRange: '0.8 - 1.1', criticalHigh: '>10.0' },
  { name: 'Total Cholesterol', category: 'Lipid Panel', unit: 'mg/dL', normalRange: '<200 (desirable)', criticalHigh: '>400' },
  { name: 'LDL', category: 'Lipid Panel', unit: 'mg/dL', normalRange: '<100 (optimal)', criticalHigh: '>190' },
  { name: 'HDL', category: 'Lipid Panel', unit: 'mg/dL', normalRange: '>40 (M) / >50 (F)', criticalHigh: '<20 (critical low)' },
  { name: 'Triglycerides', category: 'Lipid Panel', unit: 'mg/dL', normalRange: '<150', criticalHigh: '>1000' },
  { name: 'Mg', category: 'Chemistry', unit: 'mg/dL', normalRange: '1.7 - 2.2', criticalHigh: '>4.0' },
  { name: 'Phos', category: 'Chemistry', unit: 'mg/dL', normalRange: '2.5 - 4.5', criticalHigh: '>10.0' },
  { name: 'Uric Acid', category: 'Chemistry', unit: 'mg/dL', normalRange: '3.4 - 7.0 (M) / 2.4 - 6.0 (F)', criticalHigh: '>12.0' },
  { name: 'Amylase', category: 'Pancreatic', unit: 'U/L', normalRange: '28 - 100', criticalHigh: '>1000' },
  { name: 'Lipase', category: 'Pancreatic', unit: 'U/L', normalRange: '0 - 160', criticalHigh: '>1000' },
  { name: 'Lactate', category: 'Critical Care', unit: 'mmol/L', normalRange: '0.5 - 2.2', criticalHigh: '>10.0' },
  { name: 'Iron', category: 'Hematology', unit: 'mcg/dL', normalRange: '60 - 170', criticalHigh: '>400' },
  { name: 'Ferritin', category: 'Hematology', unit: 'ng/mL', normalRange: '20 - 250 (M) / 10 - 120 (F)', criticalHigh: '>1000' },
  { name: 'Vitamin D', category: 'Endocrine', unit: 'ng/mL', normalRange: '30 - 100', criticalHigh: '>150' },
  { name: 'Folate', category: 'Hematology', unit: 'ng/mL', normalRange: '2.7 - 17.0', criticalHigh: 'N/A (elevated levels not clinically critical)' },
  { name: 'B12', category: 'Hematology', unit: 'pg/mL', normalRange: '200 - 900', criticalHigh: '>2000' },
  { name: 'Cortisol', category: 'Endocrine', unit: 'mcg/dL', normalRange: '5 - 25 (AM)', criticalHigh: '>50' },
];

// =============================================================================
// Flashcard Decks (25 cards across 5 decks)
// =============================================================================

const BUILT_IN_DECKS: FlashcardDeck[] = [
  {
    id: 'cardiovascular',
    name: 'Cardiovascular',
    icon: '🫀',
    cards: [
      { front: 'What is a normal resting heart rate?', back: '60-100 beats per minute (bpm). Athletes may have lower rates (40-60 bpm).' },
      { front: 'What are the BP categories (ACC/AHA)?', back: 'Normal: <120/<80 | Elevated: 120-129/<80 | Stage 1 HTN: 130-139/80-89 | Stage 2 HTN: ≥140/≥90 | Hypertensive crisis: >180/>120' },
      { front: 'What are the classic symptoms of MI (STEMI)?', back: 'Crushing substernal chest pain radiating to left arm/jaw, diaphoresis, nausea/vomiting, dyspnea, palpitations, sense of impending doom.' },
      { front: 'What are the stages of Heart Failure (ACC/AHA)?', back: 'Stage A: At risk, no symptoms | Stage B: Structural disease, no symptoms | Stage C: Structural disease with symptoms | Stage D: Refractory HF requiring advanced interventions' },
      { front: 'Name 5 common cardiac arrhythmias', back: '1. Atrial fibrillation 2. Atrial flutter 3. Ventricular tachycardia 4. Ventricular fibrillation 5. Supraventricular tachycardia (SVT)' },
    ],
  },
  {
    id: 'respiratory',
    name: 'Respiratory',
    icon: '🫁',
    cards: [
      { front: 'What are the normal lung volumes and capacities?', back: 'Tidal Volume: ~500mL | Inspiratory Reserve: ~3000mL | Expiratory Reserve: ~1100mL | Residual Volume: ~1200mL | Vital Capacity: ~4600mL | Total Lung Capacity: ~6000mL' },
      { front: 'What are the 4 types of pneumonia classification?', back: '1. Community-Acquired (CAP) 2. Hospital-Acquired (HAP) 3. Ventilator-Associated (VAP) 4. Aspiration pneumonia. Also by pathogen: bacterial, viral, fungal.' },
      { front: 'How do COPD and Asthma differ?', back: 'Asthma: Reversible, early onset, atopy common, eosinophilic, variable airflow limitation. COPD: Irreversible/progressive, late onset, smoking history, neutrophilic, persistent airflow limitation.' },
      { front: 'What are the classic signs of Pulmonary Embolism?', back: 'Sudden dyspnea, pleuritic chest pain, tachycardia, tachypnea, hemoptysis, hypoxia, anxiety. Signs of DVT in legs. RV strain on ECG (S1Q3T3).' },
      { front: 'What are the types of Respiratory Failure?', back: 'Type I (Hypoxemic): Low PaO2 (<60mmHg), normal/low PaCO2. Type II (Hypercapnic): High PaCO2 (>50mmHg) with/without hypoxemia. Most common cause of Type II is COPD.' },
    ],
  },
  {
    id: 'neuro',
    name: 'Neurology',
    icon: '🧠',
    cards: [
      { front: 'List the 12 Cranial Nerves (mnemonic: "Oh Oh Oh, To Touch And Feel Very Good Velvet, AH!")', back: 'I-Olfactory, II-Optic, III-Oculomotor, IV-Trochlear, V-Trigeminal, VI-Abducens, VII-Facial, VIII-Vestibulocochlear, IX-Glossopharyngeal, X-Vagus, XI-Accessory, XII-Hypoglossal' },
      { front: 'What does the FAST acronym mean in Stroke?', back: 'F-Face drooping | A-Arm weakness | S-Speech difficulty | T-Time to call emergency. Additional: BE-FAST adds Balance and Eyes.' },
      { front: 'What is the Glasgow Coma Scale (GCS)?', back: 'Eye Opening (1-4) + Verbal Response (1-5) + Motor Response (1-6) = 3-15. Mild: 13-15, Moderate: 9-12, Severe: 3-8.' },
      { front: 'What is the classic meningitis triad?', back: '1. Fever 2. Nuchal rigidity (neck stiffness) 3. Altered mental status. Also: headache, photophobia, nausea/vomiting, positive Kernig and Brudzinski signs.' },
      { front: 'What are the main seizure types?', back: 'Focal (partial): Simple (aware) or Complex (impaired awareness). Generalized: Tonic-clonic, Absence, Myoclonic, Atonic, Tonic, Clonic. Also: Status epilepticus (prolonged seizure).' },
    ],
  },
  {
    id: 'pharmacology',
    name: 'Pharmacology',
    icon: '💊',
    cards: [
      { front: 'What are the main Beta Blocker classes and uses?', back: 'Cardioselective (Metoprolol, Atenolol) - prefer beta-1. Non-selective (Propranolol) - beta-1 + beta-2. With ISA (Pindolol). Uses: HTN, angina, HF, arrhythmias, migraine prevention.' },
      { front: 'Name the 5 main antibiotic classes', back: '1. Beta-lactams (penicillins, cephalosporins) 2. Macrolides (azithromycin) 3. Fluoroquinolones (ciprofloxacin) 4. Tetracyclines (doxycycline) 5. Aminoglycosides (gentamicin)' },
      { front: 'What are the main anticoagulant classes?', back: '1. Heparin (UFH) / LMWH (Enoxaparin) - indirect Xa/IIa inhibitors 2. Warfarin - Vit K antagonist 3. DOACs: Rivaroxaban, Apixaban (Xa) | Dabigatran (IIa) 4. Fondaparinux (Xa only)' },
      { front: 'How do NSAIDs work and what are the risks?', back: 'Mechanism: COX-1/COX-2 inhibitors → decreased prostaglandin synthesis. Risks: GI bleeding (COX-1 protection lost), renal impairment, cardiovascular risk, platelet dysfunction, bronchospasm in aspirin-sensitive asthmatics.' },
      { front: 'What are ACE Inhibitors and their key features?', back: 'Mechanism: Block ACE → decreased angiotensin II → vasodilation + decreased aldosterone. Side effects: Dry cough, hyperkalemia, angioedema, teratogenic. Examples: Lisinopril, Enalapril, Ramipril.' },
    ],
  },
  {
    id: 'general',
    name: 'General Medicine',
    icon: '⚕️',
    cards: [
      { front: 'What are normal adult vital signs?', back: 'HR: 60-100 bpm | BP: <120/<80 mmHg | RR: 12-20 breaths/min | Temp: 36.1-37.2°C (97-99°F) | SpO2: 95-100% | Pain: 0-10 scale' },
      { front: 'What are the BMI categories (WHO)?', back: 'Underweight: <18.5 | Normal: 18.5-24.9 | Overweight: 25-29.9 | Obese Class I: 30-34.9 | Obese Class II: 35-39.9 | Obese Class III: ≥40' },
      { front: 'How do you assess dehydration severity?', back: 'Mild (3-5%): Thirst, slightly dry mucous membranes | Moderate (6-9%): Tachycardia, decreased skin turgor, oliguria, sunken eyes | Severe (>10%): Hypotension, altered consciousness, no urine output, shock.' },
      { front: 'What are the 4 types of shock?', back: '1. Hypovolemic: blood/fluid loss 2. Cardiogenic: pump failure 3. Distributive: vasodilation (sepsis, anaphylaxis, neurogenic) 4. Obstructive: physical obstruction (tension pneumothorax, PE, tamponade)' },
      { front: 'What are the Acid-Base disorders and their compensation?', back: 'Metabolic Acidosis: ↓pH, ↓HCO3-, compensate with ↑RR | Metabolic Alkalosis: ↑pH, ↑HCO3-, compensate with ↓RR | Respiratory Acidosis: ↓pH, ↑PCO2, compensate with ↑HCO3- | Respiratory Alkalosis: ↑pH, ↓PCO2, compensate with ↓HCO3-' },
    ],
  },
];

// =============================================================================
// Flashcard Storage Helpers
// =============================================================================

const FLASHCARD_STORAGE_KEY = 'morven-medical-flashcards';
const NOTE_STORAGE_KEY = 'morven-medical-notes';

function loadCustomFlashcards(): Flashcard[] {
  try {
    const saved = localStorage.getItem(FLASHCARD_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveCustomFlashcards(cards: Flashcard[]) {
  try {
    localStorage.setItem(FLASHCARD_STORAGE_KEY, JSON.stringify(cards));
  } catch { /* noop */ }
}

function loadMedicalNotes(): MedicalNote[] {
  try {
    const saved = localStorage.getItem(NOTE_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveMedicalNotes(notes: MedicalNote[]) {
  try {
    localStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify(notes));
  } catch { /* noop */ }
}

// =============================================================================
// Animations
// =============================================================================

const fadeIn = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 }, transition: { duration: 0.3 } };
const staggerContainer = { animate: { transition: { staggerChildren: 0.05 } } };
const staggerItem = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

// =============================================================================
// Main Export
// =============================================================================

interface MedicalToolPageProps {
  toolId: string;
}

export function MedicalToolPage({ toolId }: MedicalToolPageProps) {
  switch (toolId) {
    case 'medical-summarizer':
      return <MedicalSummarizer />;
    case 'medical-flashcards':
      return <MedicalFlashcards />;
    case 'medical-mcq':
      return <MedicalMCQ />;
    case 'disease-explain':
      return <DiseaseExplain />;
    case 'disease-compare':
      return <DiseaseCompare />;
    case 'drug-summary':
      return <DrugSummary />;
    case 'lab-values':
      return <LabValuesTool />;
    case 'medical-notes':
      return <MedicalNotesTool />;
    default:
      return (
        <EmptyState
          icon={<span className="text-4xl">⚕️</span>}
          title="Tool Not Found"
          description="This medical tool is not available yet."
        />
      );
  }
}

// =============================================================================
// 1. Medical Summarizer
// =============================================================================

function MedicalSummarizer() {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [summary, setSummary] = useState('');
  const [keyIdeas, setKeyIdeas] = useState<string[]>([]);
  const [terminology, setTerminology] = useState<{ term: string; definition: string }[]>([]);
  const [simplified, setSimplified] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const { addNotification } = useAppStore();

  const handleProcess = useCallback(() => {
    if (!input.trim()) {
      addNotification('Please enter some medical text to process.', 'warning');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      try {
        const s = summarizeText(input);
        const k = extractKeyIdeas(input);
        const term = extractTerminology(input);
        const simp = explainSimply(input);
        setSummary(s);
        setKeyIdeas(k);
        setTerminology(term);
        setSimplified(simp);
        addNotification('Text processed successfully!', 'success');
      } catch {
        addNotification('Error processing text.', 'error');
      } finally {
        setLoading(false);
      }
    }, 400);
  }, [input, addNotification]);

  const tabs = [
    { id: 'summary', label: t('Summary', 'Summary') },
    { id: 'key-ideas', label: t('Key Ideas', 'Key Ideas') },
    { id: 'terminology', label: t('Terminology', 'Terminology') },
    { id: 'simplified', label: t('Simplified', 'Simplified') },
  ];

  const hasResult = summary || keyIdeas.length > 0;

  return (
    <motion.div {...fadeIn} className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-2 dark:text-white">{t('Medical Text Summarizer', 'Medical Text Summarizer')}</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">{t('Paste medical text to generate a summary, key ideas, terminology, and a simplified explanation.', 'Paste medical text to generate a summary, key ideas, terminology, and a simplified explanation.')}</p>
        <TextArea
          value={input}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
          placeholder={t('Paste medical text here...', 'Paste medical text here...')}
          rows={10}
          className="mb-4"
        />
        <Button onClick={handleProcess} disabled={loading || !input.trim()} className="w-full sm:w-auto">
          {loading ? t('Processing...', 'Processing...') : t('Process Text', 'Process Text')}
        </Button>
      </Card>

      {loading && (
        <Card className="p-6">
          <div className="flex items-center justify-center gap-3 py-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-500 dark:text-gray-400">{t('Analyzing medical text...', 'Analyzing medical text...')}</span>
          </div>
        </Card>
      )}

      <AnimatePresence>
        {hasResult && !loading && (
          <motion.div {...fadeIn}>
            <Card className="p-6">
              <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

              <div className="mt-4">
                {activeTab === 'summary' && summary && (
                  <motion.div {...fadeIn}>
                    <h3 className="text-lg font-semibold mb-2 dark:text-white">{t('Summary', 'Summary')}</h3>
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{summary}</p>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'key-ideas' && keyIdeas.length > 0 && (
                  <motion.div {...fadeIn}>
                    <h3 className="text-lg font-semibold mb-2 dark:text-white">{t('Key Ideas', 'Key Ideas')}</h3>
                    <div className="space-y-2">
                      {keyIdeas.map((idea, i) => (
                        <div key={i} className="flex items-start gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                          <Badge variant="success" className="mt-0.5 shrink-0">{i + 1}</Badge>
                          <span className="text-gray-700 dark:text-gray-300">{idea}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'terminology' && terminology.length > 0 && (
                  <motion.div {...fadeIn}>
                    <h3 className="text-lg font-semibold mb-2 dark:text-white">{t('Medical Terminology', 'Medical Terminology')}</h3>
                    <div className="space-y-2">
                      {terminology.map((item, i) => (
                        <div key={i} className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                          <span className="font-semibold text-purple-700 dark:text-purple-300">{item.term}</span>
                          <span className="text-gray-500 dark:text-gray-400 mx-2">—</span>
                          <span className="text-gray-700 dark:text-gray-300">{item.definition}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'simplified' && simplified && (
                  <motion.div {...fadeIn}>
                    <h3 className="text-lg font-semibold mb-2 dark:text-white">{t('Simplified Explanation', 'Simplified Explanation')}</h3>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{simplified}</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// =============================================================================
// 2. Medical Flashcards
// =============================================================================

type FlashcardMode = 'decks' | 'study' | 'create';

function MedicalFlashcards() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<FlashcardMode>('decks');
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);
  const [studyIndex, setStudyIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyCards, setStudyCards] = useState<{ front: string; back: string }[]>([]);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newDeck, setNewDeck] = useState('Custom');
  const [customCards, setCustomCards] = useState<Flashcard[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const { addNotification, flashcards, addFlashcard, deleteFlashcard } = useAppStore();
  const { language } = useLanguageStore();

  useEffect(() => {
    setCustomCards(loadCustomFlashcards());
  }, []);

  useEffect(() => {
    saveCustomFlashcards(customCards);
  }, [customCards]);

  const allDecks = useMemo(() => {
    const customDeck: FlashcardDeck = {
      id: 'custom',
      name: 'Custom',
      icon: <Notebook className="w-8 h-8 text-blue-500" />,
      cards: customCards.map((c) => ({ front: c.front, back: c.back })),
    };
    return [...BUILT_IN_DECKS, customDeck];
  }, [customCards]);

  const startStudy = useCallback((deckId: string) => {
    const deck = allDecks.find((d) => d.id === deckId);
    if (!deck || deck.cards.length === 0) {
      addNotification('This deck has no cards.', 'warning');
      return;
    }
    setSelectedDeck(deckId);
    setStudyCards(deck.cards);
    setStudyIndex(0);
    setIsFlipped(false);
    setShowAnswer(false);
    setMasteredCount(0);
    setReviewCount(0);
    setMode('study');
  }, [allDecks, addNotification]);

  const nextCard = useCallback(() => {
    setIsFlipped(false);
    setShowAnswer(false);
    if (studyIndex < studyCards.length - 1) {
      setStudyIndex((p) => p + 1);
    } else {
      addNotification(`Study session complete! Mastered ${masteredCount} of ${studyCards.length} cards.`, 'success');
      setMode('decks');
    }
  }, [studyIndex, studyCards.length, masteredCount, addNotification]);

  const handleMastered = useCallback(() => {
    setMasteredCount((p) => p + 1);
    nextCard();
  }, [nextCard]);

  const handleReviewLater = useCallback(() => {
    setReviewCount((p) => p + 1);
    nextCard();
  }, [nextCard]);

  const handleAddCard = useCallback(() => {
    if (!newFront.trim() || !newBack.trim()) {
      addNotification('Please fill in both front and back.', 'warning');
      return;
    }
    addFlashcard(newFront.trim(), newBack.trim(), newDeck);
    setCustomCards((prev) => [
      ...prev,
      {
        id: `card-${Date.now()}`,
        front: newFront.trim(),
        back: newBack.trim(),
        deck: newDeck,
        difficulty: 'medium',
        nextReview: Date.now(),
        reviewCount: 0,
        createdAt: Date.now(),
      },
    ]);
    setNewFront('');
    setNewBack('');
    addNotification('Flashcard created!', 'success');
  }, [newFront, newBack, newDeck, addFlashcard, addNotification]);

  const handleDeleteCard = useCallback((id: string) => {
    deleteFlashcard(id);
    setCustomCards((prev) => prev.filter((c) => c.id !== id));
    addNotification('Flashcard deleted.', 'info');
  }, [deleteFlashcard, addNotification]);

  if (mode === 'study' && studyCards.length > 0) {
    const card = studyCards[studyIndex];
    return (
      <motion.div {...fadeIn} className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setMode('decks')}>← {t('Back to Decks', 'Back to Decks')}</Button>
          <span className="text-sm text-gray-500 dark:text-gray-400">{studyIndex + 1} / {studyCards.length}</span>
        </div>

        <ProgressBar
          value={((studyIndex + 1) / studyCards.length) * 100}
          className="h-2"
        />

        <div className="flex justify-center" style={{ perspective: '1000px' }}>
          <motion.div
            className="w-full max-w-lg cursor-pointer"
            onClick={() => setIsFlipped(!isFlipped)}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.5 }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <Card className="p-8 min-h-[280px] flex items-center justify-center">
              <div
                className="text-center"
                style={{ backfaceVisibility: 'hidden', transform: isFlipped ? 'rotateY(180deg)' : 'none' }}
              >
                {isFlipped ? (
                  <p className="text-lg text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{card.back}</p>
                ) : (
                  <p className="text-xl font-semibold text-gray-900 dark:text-white whitespace-pre-wrap">{card.front}</p>
                )}
              </div>
            </Card>
          </motion.div>
        </div>

        <p className="text-center text-sm text-gray-400 dark:text-gray-500">
          {isFlipped ? t('Card flipped - rate your confidence', 'Card flipped - rate your confidence') : t('Click card to reveal answer', 'Click card to reveal answer')}
        </p>

        {isFlipped && (
          <motion.div {...fadeIn} className="flex justify-center gap-4">
            <Button variant="danger" onClick={handleReviewLater} className="px-6">
              {t('Review Again', 'Review Again')}
            </Button>
            <Button variant="primary" onClick={handleMastered} className="px-6">
              {t('Mastered!', 'Mastered!')}
            </Button>
          </motion.div>
        )}

        <div className="flex justify-center gap-4 text-sm">
          <Chip variant="success" label={`${t('Mastered', 'Mastered')}: ${masteredCount}`} />
          <Chip variant="warning" label={`${t('Review', 'Review')}: ${reviewCount}`} />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div {...fadeIn} className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant={mode === 'decks' ? 'primary' : 'ghost'} onClick={() => setMode('decks')}>
          {t('Decks', 'Decks')}
        </Button>
        <Button variant={mode === 'create' ? 'primary' : 'ghost'} onClick={() => setMode('create')}>
          {t('Create Card', 'Create Card')}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'create' && (
          <motion.div key="create" {...fadeIn}>
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4 dark:text-white">{t('Create New Flashcard', 'Create New Flashcard')}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('Front (Question)', 'Front (Question)')}</label>
                  <TextArea
                    value={newFront}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewFront(e.target.value)}
                    placeholder={t('Enter the question or prompt...', 'Enter the question or prompt...')}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('Back (Answer)', 'Back (Answer)')}</label>
                  <TextArea
                    value={newBack}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewBack(e.target.value)}
                    placeholder={t('Enter the answer or explanation...', 'Enter the answer or explanation...')}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('Deck', 'Deck')}</label>
                  <Input
                    value={newDeck}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDeck(e.target.value)}
                    placeholder="Custom"
                  />
                </div>
                <Button onClick={handleAddCard} className="w-full sm:w-auto">{t('Add Flashcard', 'Add Flashcard')}</Button>
              </div>
            </Card>

            {customCards.length > 0 && (
              <Card className="p-6 mt-4">
                <h3 className="text-lg font-bold mb-4 dark:text-white">{t('Your Custom Cards ({count})', { count: customCards.length, defaultValue: `Your Custom Cards (${customCards.length})` })}</h3>
                <div className="space-y-2">
                  {customCards.map((card) => (
                    <div key={card.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate dark:text-white">{card.front}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{card.back}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteCard(card.id)} className="ms-2 text-red-500">
                        ✕
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </motion.div>
        )}

        {mode === 'decks' && (
          <motion.div key="decks" {...fadeIn}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allDecks.map((deck) => (
                <motion.div key={deck.id} variants={staggerItem}>
                  <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => startStudy(deck.id)}>
                    <div className="text-3xl mb-3">{deck.icon}</div>
                    <h3 className="text-lg font-bold dark:text-white">{deck.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {deck.cards.length} {t('cards', 'cards')}
                    </p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// =============================================================================
// 3. Medical MCQ
// =============================================================================

function MedicalMCQ() {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const { addNotification } = useAppStore();

  const handleGenerate = useCallback(() => {
    if (!input.trim()) {
      addNotification('Please enter some text to generate questions.', 'warning');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      try {
        const mcqs = generateMCQs(input, 5);
        if (mcqs.length === 0) {
          addNotification('Could not generate questions. Try different text.', 'warning');
          setLoading(false);
          return;
        }
        setQuestions(mcqs);
        setCurrentQ(0);
        setSelected(null);
        setAnswers(new Array(mcqs.length).fill(null));
        setQuizStarted(true);
        setShowResult(false);
        addNotification(`Generated ${mcqs.length} questions!`, 'success');
      } catch {
        addNotification('Error generating questions.', 'error');
      } finally {
        setLoading(false);
      }
    }, 500);
  }, [input, addNotification]);

  const handleSelect = useCallback((optionIndex: number) => {
    if (selected !== null) return;
    setSelected(optionIndex);
    setAnswers((prev) => {
      const next = [...prev];
      next[currentQ] = optionIndex;
      return next;
    });
  }, [selected, currentQ]);

  const handleNext = useCallback(() => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((p) => p + 1);
      setSelected(null);
    } else {
      setShowResult(true);
    }
  }, [currentQ, questions.length]);

  const score = useMemo(() => {
    return questions.reduce((acc, q, i) => (answers[i] === q.correct ? acc + 1 : acc), 0);
  }, [questions, answers]);

  const reset = useCallback(() => {
    setQuizStarted(false);
    setQuestions([]);
    setCurrentQ(0);
    setSelected(null);
    setAnswers([]);
    setShowResult(false);
  }, []);

  if (quizStarted && questions.length > 0 && showResult) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <motion.div {...fadeIn} className="space-y-6">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4 dark:text-white">{t('Quiz Complete!', 'Quiz Complete!')}</h2>
          <div className="text-6xl font-bold mb-4">
            <span className={pct >= 70 ? 'text-green-500' : pct >= 50 ? 'text-yellow-500' : 'text-red-500'}>
              {score}/{questions.length}
            </span>
          </div>
          <p className="text-lg text-gray-500 dark:text-gray-400 mb-2">{pct}% {t('correct', 'correct')}</p>
          <ProgressBar value={pct} color={pct >= 70 ? 'success' : pct >= 50 ? 'warning' : 'danger'} className="h-3 max-w-md mx-auto mb-6" />

          <div className="space-y-3 text-left max-w-2xl mx-auto mb-6">
            {questions.map((q, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border ${
                  answers[i] === q.correct
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                }`}
              >
                <p className="font-medium text-sm dark:text-white">{i + 1}. {q.question}</p>
                <p className="text-xs mt-1 dark:text-gray-300">
                  {t('Your answer', 'Your answer')}: {q.options[answers[i] ?? 0]}
                  {answers[i] !== q.correct && (
                    <span className="ms-2 text-green-600 dark:text-green-400">| {t('Correct', 'Correct')}: {q.options[q.correct]}</span>
                  )}
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-3">
            <Button onClick={reset}>{t('New Quiz', 'New Quiz')}</Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  if (quizStarted && questions.length > 0) {
    const q = questions[currentQ];
    const isCorrect = selected === q.correct;
    return (
      <motion.div {...fadeIn} className="space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('Question', 'Question')} {currentQ + 1} / {questions.length}
          </span>
          <ProgressBar value={((currentQ + 1) / questions.length) * 100} className="w-1/2 h-2" />
        </div>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">{q.question}</h3>
          <div className="space-y-3">
            {q.options.map((opt, i) => {
              let borderClass = 'border-gray-200 dark:border-gray-700 hover:border-blue-400';
              if (selected !== null) {
                if (i === q.correct) borderClass = 'border-green-500 bg-green-50 dark:bg-green-900/20';
                else if (i === selected) borderClass = 'border-red-500 bg-red-50 dark:bg-red-900/20';
                else borderClass = 'border-gray-200 dark:border-gray-700 opacity-50';
              }
              return (
                <motion.button
                  key={i}
                  whileHover={selected === null ? { scale: 1.01 } : {}}
                  whileTap={selected === null ? { scale: 0.99 } : {}}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${borderClass}`}
                  onClick={() => handleSelect(i)}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-bold dark:text-white">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="dark:text-gray-200">{opt}</span>
                    {selected !== null && i === q.correct && <span className="ms-auto text-green-500">✓</span>}
                    {selected !== null && i === selected && i !== q.correct && <span className="ms-auto text-red-500">✕</span>}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {selected !== null && (
            <motion.div {...fadeIn} className="mt-4 flex justify-end">
              <Button onClick={handleNext}>
                {currentQ < questions.length - 1 ? t('Next Question', 'Next Question') : t('See Results', 'See Results')}
              </Button>
            </motion.div>
          )}
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div {...fadeIn} className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-2 dark:text-white">{t('Medical MCQ Generator', 'Medical MCQ Generator')}</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">{t('Paste medical text and generate interactive multiple-choice questions for study.', 'Paste medical text and generate interactive multiple-choice questions for study.')}</p>
        <TextArea
          value={input}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
          placeholder={t('Paste medical text here to generate quiz questions...', 'Paste medical text here to generate quiz questions...')}
          rows={10}
          className="mb-4"
        />
        <Button onClick={handleGenerate} disabled={loading || !input.trim()} className="w-full sm:w-auto">
          {loading ? t('Generating...', 'Generating...') : t('Generate Quiz', 'Generate Quiz')}
        </Button>
      </Card>
    </motion.div>
  );
}

// =============================================================================
// 4. Disease Explain
// =============================================================================

function DiseaseExplain() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedDisease, setSelectedDisease] = useState<string | null>(null);

  const filteredDiseases = useMemo(() => {
    if (!search.trim()) return Object.keys(DISEASES);
    const q = search.toLowerCase();
    return Object.keys(DISEASES).filter(
      (k) =>
        DISEASES[k].name.toLowerCase().includes(q) ||
        k.toLowerCase().includes(q) ||
        DISEASES[k].description.toLowerCase().includes(q)
    );
  }, [search]);

  const disease = selectedDisease ? DISEASES[selectedDisease] : null;

  return (
    <motion.div {...fadeIn} className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-2 dark:text-white">{t('Disease Encyclopedia', 'Disease Encyclopedia')}</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">{t('Search and learn about medical diseases, their symptoms, causes, and treatments.', 'Search and learn about medical diseases, their symptoms, causes, and treatments.')}</p>
        <Input
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setSelectedDisease(null); }}
          placeholder={t('Search diseases...', 'Search diseases...')}
        />
      </Card>

      {!selectedDisease && (
        <motion.div {...fadeIn}>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{filteredDiseases.length} {t('diseases found', 'diseases found')}</p>
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredDiseases.map((key) => (
              <motion.div key={key} variants={staggerItem}>
                <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedDisease(key)}>
                  <h3 className="font-semibold dark:text-white">{DISEASES[key].name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{DISEASES[key].description}</p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}

      <AnimatePresence>
        {disease && (
          <motion.div {...fadeIn} className="space-y-4">
            <Button variant="ghost" onClick={() => setSelectedDisease(null)} className="mb-2">
              ← {t('Back to list', 'Back to list')}
            </Button>
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-3 dark:text-white">{disease.name}</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">{disease.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <h3 className="font-bold text-red-700 dark:text-red-300 mb-2">🩺 {t('Symptoms', 'Symptoms')}</h3>
                  <ul className="space-y-1">
                    {disease.symptoms.map((s, i) => (
                      <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-1">
                        <span className="text-red-400 mt-1">•</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <h3 className="font-bold text-amber-700 dark:text-amber-300 mb-2">⚡ {t('Causes', 'Causes')}</h3>
                  <ul className="space-y-1">
                    {disease.causes.map((c, i) => (
                      <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-1">
                        <span className="text-amber-400 mt-1">•</span> {c}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                  <h3 className="font-bold text-green-700 dark:text-green-300 mb-2">💊 {t('Treatment', 'Treatment')}</h3>
                  <ul className="space-y-1">
                    {disease.treatment.map((tr, i) => (
                      <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-1">
                        <span className="text-green-400 mt-1">•</span> {tr}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// =============================================================================
// 5. Disease Compare
// =============================================================================

function DiseaseCompare() {
  const { t } = useTranslation();
  const [disease1, setDisease1] = useState('');
  const [disease2, setDisease2] = useState('');

  const diseaseOptions = useMemo(
    () => Object.keys(DISEASES).map((k) => ({ value: k, label: DISEASES[k].name })),
    []
  );

  const d1 = disease1 ? DISEASES[disease1] : null;
  const d2 = disease2 ? DISEASES[disease2] : null;

  return (
    <motion.div {...fadeIn} className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-2 dark:text-white">{t('Disease Comparison', 'Disease Comparison')}</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">{t('Select two diseases to compare their symptoms, causes, and treatments side by side.', 'Select two diseases to compare their symptoms, causes, and treatments side by side.')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('Disease 1', 'Disease 1')}</label>
            <Select
              value={disease1}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDisease1(e.target.value)}
              options={[{ value: '', label: t('Select disease...', 'Select disease...') }, ...diseaseOptions]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('Disease 2', 'Disease 2')}</label>
            <Select
              value={disease2}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDisease2(e.target.value)}
              options={[{ value: '', label: t('Select disease...', 'Select disease...') }, ...diseaseOptions]}
            />
          </div>
        </div>
      </Card>

      {d1 && d2 && (
        <motion.div {...fadeIn}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[d1, d2].map((d, idx) => (
              <Card key={idx} className="p-6">
                <h3 className="text-xl font-bold mb-3 dark:text-white">{d.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{d.description}</p>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-red-600 dark:text-red-400 mb-1">🩺 {t('Symptoms', 'Symptoms')}</h4>
                    <div className="flex flex-wrap gap-1">
                      {d.symptoms.map((s, i) => (
                        <Chip key={i} variant="danger" className="text-xs" label={s} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-1">⚡ {t('Causes', 'Causes')}</h4>
                    <div className="flex flex-wrap gap-1">
                      {d.causes.map((c, i) => (
                        <Chip key={i} variant="warning" className="text-xs" label={c} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-green-600 dark:text-green-400 mb-1">💊 {t('Treatment', 'Treatment')}</h4>
                    <div className="flex flex-wrap gap-1">
                      {d.treatment.map((tr, i) => (
                        <Chip key={i} variant="success" className="text-xs" label={tr} />
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-6 mt-4">
            <h3 className="text-lg font-bold mb-3 dark:text-white">{t('Comparison Summary', 'Comparison Summary')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-2 ps-0 dark:text-gray-300">{t('Feature', 'Feature')}</th>
                    <th className="text-left py-2 dark:text-gray-300">{d1.name}</th>
                    <th className="text-left py-2 pe-0 dark:text-gray-300">{d2.name}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b dark:border-gray-700">
                    <td className="py-2 ps-0 font-medium dark:text-gray-300">{t('Symptom Count', 'Symptom Count')}</td>
                    <td className="py-2 dark:text-gray-400">{d1.symptoms.length}</td>
                    <td className="py-2 pe-0 dark:text-gray-400">{d2.symptoms.length}</td>
                  </tr>
                  <tr className="border-b dark:border-gray-700">
                    <td className="py-2 ps-0 font-medium dark:text-gray-300">{t('Cause Count', 'Cause Count')}</td>
                    <td className="py-2 dark:text-gray-400">{d1.causes.length}</td>
                    <td className="py-2 pe-0 dark:text-gray-400">{d2.causes.length}</td>
                  </tr>
                  <tr>
                    <td className="py-2 ps-0 font-medium dark:text-gray-300">{t('Treatment Options', 'Treatment Options')}</td>
                    <td className="py-2 dark:text-gray-400">{d1.treatment.length}</td>
                    <td className="py-2 pe-0 dark:text-gray-400">{d2.treatment.length}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

// =============================================================================
// 6. Drug Summary
// =============================================================================

function DrugSummary() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedDrug, setSelectedDrug] = useState<string | null>(null);

  const filteredDrugs = useMemo(() => {
    if (!search.trim()) return Object.keys(DRUGS);
    const q = search.toLowerCase();
    return Object.keys(DRUGS).filter(
      (k) =>
        DRUGS[k].name.toLowerCase().includes(q) ||
        k.toLowerCase().includes(q) ||
        DRUGS[k].drugClass.toLowerCase().includes(q)
    );
  }, [search]);

  const drug = selectedDrug ? DRUGS[selectedDrug] : null;

  return (
    <motion.div {...fadeIn} className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-2 dark:text-white">{t('Drug Reference', 'Drug Reference')}</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">{t('Search drugs to learn about their class, indications, side effects, and contraindications.', 'Search drugs to learn about their class, indications, side effects, and contraindications.')}</p>
        <Input
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setSelectedDrug(null); }}
          placeholder={t('Search drugs by name or class...', 'Search drugs by name or class...')}
        />
      </Card>

      {!selectedDrug && (
        <motion.div {...fadeIn}>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{filteredDrugs.length} {t('drugs found', 'drugs found')}</p>
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredDrugs.map((key) => (
              <motion.div key={key} variants={staggerItem}>
                <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedDrug(key)}>
                  <h3 className="font-semibold dark:text-white">{DRUGS[key].name}</h3>
                  <Badge variant="info" className="mt-1">{DRUGS[key].drugClass}</Badge>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}

      <AnimatePresence>
        {drug && (
          <motion.div {...fadeIn}>
            <Button variant="ghost" onClick={() => setSelectedDrug(null)} className="mb-2">
              ← {t('Back to list', 'Back to list')}
            </Button>
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-1 dark:text-white">{drug.name}</h2>
              <Badge variant="info" className="mb-4">{drug.drugClass}</Badge>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <h3 className="font-bold text-blue-700 dark:text-blue-300 mb-2">📋 {t('Indications', 'Indications')}</h3>
                  <ul className="space-y-1">
                    {drug.indications.map((ind, i) => (
                      <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-1">
                        <span className="text-blue-400 mt-1">•</span> {ind}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                  <h3 className="font-bold text-amber-700 dark:text-amber-300 mb-2">⚠️ {t('Side Effects', 'Side Effects')}</h3>
                  <ul className="space-y-1">
                    {drug.sideEffects.map((se, i) => (
                      <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-1">
                        <span className="text-amber-400 mt-1">•</span> {se}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <h3 className="font-bold text-red-700 dark:text-red-300 mb-2">🚫 {t('Contraindications', 'Contraindications')}</h3>
                  <ul className="space-y-1">
                    {drug.contraindications.map((ci, i) => (
                      <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-1">
                        <span className="text-red-400 mt-1">•</span> {ci}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// =============================================================================
// 7. Lab Values
// =============================================================================

const LAB_CATEGORIES = ['All', ...Array.from(new Set(LAB_VALUES.map((l) => l.category)))];

const CATEGORY_COLORS: Record<string, string> = {
  Hematology: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  Chemistry: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  Renal: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  Hepatic: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  Endocrine: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  Cardiac: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  Coagulation: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  'Lipid Panel': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  Pancreatic: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'Critical Care': 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
};

function LabValuesTool() {
  const { t } = useTranslation();
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let vals = LAB_VALUES;
    if (category !== 'All') vals = vals.filter((v) => v.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      vals = vals.filter((v) => v.name.toLowerCase().includes(q) || v.category.toLowerCase().includes(q));
    }
    return vals;
  }, [category, search]);

  return (
    <motion.div {...fadeIn} className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-2 dark:text-white">{t('Laboratory Reference Values', 'Laboratory Reference Values')}</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">{t('Comprehensive table of common laboratory test reference ranges and critical values.', 'Comprehensive table of common laboratory test reference ranges and critical values.')}</p>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder={t('Search tests...', 'Search tests...')}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {LAB_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                category === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                <th className="text-left py-3 px-4 font-semibold dark:text-gray-300">{t('Test', 'Test')}</th>
                <th className="text-left py-3 px-4 font-semibold dark:text-gray-300">{t('Category', 'Category')}</th>
                <th className="text-left py-3 px-4 font-semibold dark:text-gray-300">{t('Unit', 'Unit')}</th>
                <th className="text-left py-3 px-4 font-semibold dark:text-gray-300">{t('Normal Range', 'Normal Range')}</th>
                <th className="text-left py-3 px-4 font-semibold dark:text-gray-300">{t('Critical Value', 'Critical Value')}</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((lab, i) => (
                  <motion.tr
                    key={lab.name}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium dark:text-white">{lab.name}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[lab.category] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {lab.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 dark:text-gray-400">{lab.unit}</td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{lab.normalRange}</td>
                    <td className="py-3 px-4">
                      <span className="text-red-600 dark:text-red-400 font-medium">{lab.criticalHigh}</span>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-8 text-center text-gray-400 dark:text-gray-500">
            {t('No lab values found matching your criteria.', 'No lab values found matching your criteria.')}
          </div>
        )}
      </Card>
    </motion.div>
  );
}

// =============================================================================
// 8. Medical Notes
// =============================================================================

const NOTE_TEMPLATES = [
  {
    id: 'soap',
    name: 'SOAP Note',
    template: `SUBJECTIVE:\nChief Complaint: \nHistory of Present Illness: \nReview of Systems: \n\nOBJECTIVE:\nVital Signs: \nPhysical Examination: \nLab/Diagnostic Results: \n\nASSESSMENT:\n1. \n2. \n3. \n\nPLAN:\n1. \n2. \n3. `,
  },
  {
    id: 'hp',
    name: 'History & Physical',
    template: `PATIENT HISTORY\n\nChief Complaint: \n\nHistory of Present Illness:\nOnset: \nLocation: \nDuration: \nCharacter: \nAggravating/Alleviating factors: \nRadiation: \nTiming: \nSeverity: \n\nPast Medical History: \nPast Surgical History: \nMedications: \nAllergies: \nFamily History: \nSocial History: \n\nREVIEW OF SYSTEMS:\nGeneral: \nHEENT: \nCardiovascular: \nRespiratory: \nGI: \nGU: \nMSK: \nNeuro: \nPsych: \n\nPHYSICAL EXAMINATION:\nVitals: \nGeneral: \nHEENT: \nNeck: \nChest/Lungs: \nHeart: \nAbdomen: \nExtremities: \nNeuro: \n\nASSESSMENT & PLAN:\n `,
  },
  {
    id: 'progress',
    name: 'Progress Note',
    template: `DATE: ${new Date().toLocaleDateString()}\n\nSUBJECTIVE:\nPatient reports: \nSymptoms: \n\nOBJECTIVE:\nVitals: \nExam findings: \nNew results: \n\nASSESSMENT:\nCondition: \nResponse to treatment: \n\nPLAN:\n1. \n2. \n3. \nDisposition: `,
  },
  {
    id: 'discharge',
    name: 'Discharge Summary',
    template: `ADMISSION DATE: \nDISCHARGE DATE: \n\nADMITTING DIAGNOSIS: \nDISCHARGE DIAGNOSIS: \n\nHISTORY OF PRESENT ILLNESS:\n\nHOSPITAL COURSE:\n\nPROCEDURES PERFORMED:\n\nCONDITION AT DISCHARGE:\n\nDISCHARGE MEDICATIONS:\n1. \n2. \n3. \n\nFOLLOW-UP:\n- PCP: \n- Specialist: \n\nDISCHARGE INSTRUCTIONS:\nActivity: \nDiet: \nWarning signs: `,
  },
];

function MedicalNotesTool() {
  const { t } = useTranslation();
  const [notes, setNotes] = useState<MedicalNote[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('SOAP');
  const [isCreating, setIsCreating] = useState(false);
  const [templateModal, setTemplateModal] = useState(false);
  const { addNotification } = useAppStore();

  useEffect(() => {
    setNotes(loadMedicalNotes());
  }, []);

  useEffect(() => {
    saveMedicalNotes(notes);
  }, [notes]);

  const startCreate = useCallback(() => {
    setIsCreating(true);
    setEditingId(null);
    setEditTitle('');
    setEditContent('');
    setEditCategory('SOAP');
  }, []);

  const startEdit = useCallback((note: MedicalNote) => {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditCategory(note.category);
    setIsCreating(true);
  }, []);

  const saveNote = useCallback(() => {
    if (!editTitle.trim() || !editContent.trim()) {
      addNotification('Please fill in both title and content.', 'warning');
      return;
    }

    if (editingId) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === editingId
            ? { ...n, title: editTitle.trim(), content: editContent.trim(), category: editCategory, updatedAt: Date.now() }
            : n
        )
      );
      addNotification('Note updated!', 'success');
    } else {
      const newNote: MedicalNote = {
        id: `note-${Date.now()}`,
        title: editTitle.trim(),
        content: editContent.trim(),
        category: editCategory,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setNotes((prev) => [newNote, ...prev]);
      addNotification('Note created!', 'success');
    }
    setIsCreating(false);
    setEditingId(null);
  }, [editTitle, editContent, editCategory, editingId, addNotification]);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    addNotification('Note deleted.', 'info');
  }, [addNotification]);

  const applyTemplate = useCallback((templateId: string) => {
    const tmpl = NOTE_TEMPLATES.find((t) => t.id === templateId);
    if (tmpl) {
      setEditContent(tmpl.template);
      setEditCategory(tmpl.id.toUpperCase());
    }
    setTemplateModal(false);
  }, []);

  if (isCreating) {
    return (
      <motion.div {...fadeIn} className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => { setIsCreating(false); setEditingId(null); }}>← {t('Back', 'Back')}</Button>
          <h2 className="text-xl font-bold dark:text-white">
            {editingId ? t('Edit Note', 'Edit Note') : t('New Note', 'New Note')}
          </h2>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('Title', 'Title')}</label>
              <Input
                value={editTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTitle(e.target.value)}
                placeholder={t('Note title...', 'Note title...')}
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('Category', 'Category')}</label>
                <Select
                  value={editCategory}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditCategory(e.target.value)}
                  options={[
                    { value: 'SOAP', label: 'SOAP' },
                    { value: 'HP', label: 'H&P' },
                    { value: 'Progress', label: 'Progress' },
                    { value: 'Discharge', label: 'Discharge' },
                    { value: 'Other', label: 'Other' },
                  ]}
                />
              </div>
              {!editingId && (
                <div className="pt-5">
                  <Button variant="ghost" onClick={() => setTemplateModal(true)}>
                    📋 {t('Use Template', 'Use Template')}
                  </Button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('Content', 'Content')}</label>
              <TextArea
                value={editContent}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditContent(e.target.value)}
                placeholder={t('Write your note here...', 'Write your note here...')}
                rows={20}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={saveNote} className="px-6">
                {editingId ? t('Update Note', 'Update Note') : t('Save Note', 'Save Note')}
              </Button>
              <Button variant="ghost" onClick={() => { setIsCreating(false); setEditingId(null); }}>
                {t('Cancel', 'Cancel')}
              </Button>
            </div>
          </div>
        </Card>

        <Modal open={templateModal} onClose={() => setTemplateModal(false)} title={t('Select Template', 'Select Template')}>
          <div className="space-y-3">
            {NOTE_TEMPLATES.map((tmpl) => (
              <Card key={tmpl.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => applyTemplate(tmpl.id)}>
                <h4 className="font-semibold dark:text-white">{tmpl.name}</h4>
                <p className="text-xs text-gray-400 mt-1 dark:text-gray-500">{tmpl.template.substring(0, 80)}...</p>
              </Card>
            ))}
          </div>
        </Modal>
      </motion.div>
    );
  }

  return (
    <motion.div {...fadeIn} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold dark:text-white">{t('Medical Notes', 'Medical Notes')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('Create and manage clinical notes with templates (SOAP, H&P, Progress, Discharge).', 'Create and manage clinical notes with templates (SOAP, H&P, Progress, Discharge).')}</p>
        </div>
        <Button onClick={startCreate}>+ {t('New Note', 'New Note')}</Button>
      </div>

      {notes.length === 0 ? (
        <EmptyState
          icon={<span className="text-4xl">📝</span>}
          title={t('No Notes Yet', 'No Notes Yet')}
          description={t('Create your first medical note using our professional templates.', 'Create your first medical note using our professional templates.')}
        />
      ) : (
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
          {notes.map((note) => (
            <motion.div key={note.id} variants={staggerItem}>
              <Card className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold dark:text-white">{note.title}</h3>
                      <Badge variant="info">{note.category}</Badge>
                    </div>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mb-2">
                      {new Date(note.updatedAt).toLocaleDateString()} {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap line-clamp-3 font-mono">{note.content}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(note)}>{t('Edit', 'Edit')}</Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteNote(note.id)} className="text-red-500">✕</Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
