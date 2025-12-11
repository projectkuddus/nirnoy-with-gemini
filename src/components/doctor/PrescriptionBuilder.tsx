import React, { useState, useMemo, useCallback } from 'react';
import { PrescriptionItem } from '../../types';
import { openPrescriptionWindow, PrescriptionData } from '../../utils/prescriptionPDF';

// ============ MEDICINE DATABASE (Bangladesh Common Medicines) ============
const MEDICINE_DATABASE = [
  // Pain & Fever
  { name: 'Paracetamol 500mg', category: 'Analgesic', genericName: 'Paracetamol' },
  { name: 'Napa 500mg', category: 'Analgesic', genericName: 'Paracetamol' },
  { name: 'Napa Extra', category: 'Analgesic', genericName: 'Paracetamol + Caffeine' },
  { name: 'Ace Plus', category: 'Analgesic', genericName: 'Paracetamol + Caffeine' },
  { name: 'Ibuprofen 400mg', category: 'NSAID', genericName: 'Ibuprofen' },
  { name: 'Diclofenac 50mg', category: 'NSAID', genericName: 'Diclofenac' },
  { name: 'Ketorolac 10mg', category: 'NSAID', genericName: 'Ketorolac' },
  { name: 'Tramadol 50mg', category: 'Opioid', genericName: 'Tramadol' },
  
  // Antibiotics
  { name: 'Amoxicillin 500mg', category: 'Antibiotic', genericName: 'Amoxicillin' },
  { name: 'Azithromycin 500mg', category: 'Antibiotic', genericName: 'Azithromycin' },
  { name: 'Zimax 500mg', category: 'Antibiotic', genericName: 'Azithromycin' },
  { name: 'Ciprofloxacin 500mg', category: 'Antibiotic', genericName: 'Ciprofloxacin' },
  { name: 'Levofloxacin 500mg', category: 'Antibiotic', genericName: 'Levofloxacin' },
  { name: 'Cefixime 200mg', category: 'Antibiotic', genericName: 'Cefixime' },
  { name: 'Ceftriaxone 1g', category: 'Antibiotic', genericName: 'Ceftriaxone' },
  { name: 'Metronidazole 400mg', category: 'Antibiotic', genericName: 'Metronidazole' },
  { name: 'Doxycycline 100mg', category: 'Antibiotic', genericName: 'Doxycycline' },
  
  // Cardiovascular
  { name: 'Amlodipine 5mg', category: 'Antihypertensive', genericName: 'Amlodipine' },
  { name: 'Amlodipine 10mg', category: 'Antihypertensive', genericName: 'Amlodipine' },
  { name: 'Losartan 50mg', category: 'ARB', genericName: 'Losartan' },
  { name: 'Telmisartan 40mg', category: 'ARB', genericName: 'Telmisartan' },
  { name: 'Atenolol 50mg', category: 'Beta Blocker', genericName: 'Atenolol' },
  { name: 'Bisoprolol 5mg', category: 'Beta Blocker', genericName: 'Bisoprolol' },
  { name: 'Metoprolol 50mg', category: 'Beta Blocker', genericName: 'Metoprolol' },
  { name: 'Aspirin 75mg', category: 'Antiplatelet', genericName: 'Aspirin' },
  { name: 'Clopidogrel 75mg', category: 'Antiplatelet', genericName: 'Clopidogrel' },
  { name: 'Atorvastatin 10mg', category: 'Statin', genericName: 'Atorvastatin' },
  { name: 'Rosuvastatin 10mg', category: 'Statin', genericName: 'Rosuvastatin' },
  
  // Diabetes
  { name: 'Metformin 500mg', category: 'Antidiabetic', genericName: 'Metformin' },
  { name: 'Metformin 850mg', category: 'Antidiabetic', genericName: 'Metformin' },
  { name: 'Glimepiride 2mg', category: 'Sulfonylurea', genericName: 'Glimepiride' },
  { name: 'Gliclazide 80mg', category: 'Sulfonylurea', genericName: 'Gliclazide' },
  { name: 'Sitagliptin 50mg', category: 'DPP4 Inhibitor', genericName: 'Sitagliptin' },
  { name: 'Linagliptin 5mg', category: 'DPP4 Inhibitor', genericName: 'Linagliptin' },
  { name: 'Empagliflozin 10mg', category: 'SGLT2 Inhibitor', genericName: 'Empagliflozin' },
  
  // Gastric
  { name: 'Omeprazole 20mg', category: 'PPI', genericName: 'Omeprazole' },
  { name: 'Esomeprazole 20mg', category: 'PPI', genericName: 'Esomeprazole' },
  { name: 'Pantoprazole 40mg', category: 'PPI', genericName: 'Pantoprazole' },
  { name: 'Ranitidine 150mg', category: 'H2 Blocker', genericName: 'Ranitidine' },
  { name: 'Famotidine 40mg', category: 'H2 Blocker', genericName: 'Famotidine' },
  { name: 'Antacid Suspension', category: 'Antacid', genericName: 'Al/Mg Hydroxide' },
  { name: 'Domperidone 10mg', category: 'Prokinetic', genericName: 'Domperidone' },
  
  // Respiratory
  { name: 'Salbutamol 2mg', category: 'Bronchodilator', genericName: 'Salbutamol' },
  { name: 'Salbutamol Inhaler', category: 'Bronchodilator', genericName: 'Salbutamol' },
  { name: 'Montelukast 10mg', category: 'LTRA', genericName: 'Montelukast' },
  { name: 'Fexofenadine 120mg', category: 'Antihistamine', genericName: 'Fexofenadine' },
  { name: 'Cetirizine 10mg', category: 'Antihistamine', genericName: 'Cetirizine' },
  { name: 'Loratadine 10mg', category: 'Antihistamine', genericName: 'Loratadine' },
  { name: 'Dextromethorphan Syrup', category: 'Antitussive', genericName: 'Dextromethorphan' },
  { name: 'Ambroxol Syrup', category: 'Mucolytic', genericName: 'Ambroxol' },
  
  // Vitamins & Supplements
  { name: 'Vitamin D3 40000 IU', category: 'Vitamin', genericName: 'Cholecalciferol' },
  { name: 'Vitamin B Complex', category: 'Vitamin', genericName: 'B-Complex' },
  { name: 'Iron + Folic Acid', category: 'Supplement', genericName: 'Ferrous Fumarate' },
  { name: 'Calcium + Vitamin D', category: 'Supplement', genericName: 'Calcium Carbonate' },
  { name: 'Zinc 20mg', category: 'Supplement', genericName: 'Zinc Sulfate' },
  
  // Psychiatric
  { name: 'Escitalopram 10mg', category: 'SSRI', genericName: 'Escitalopram' },
  { name: 'Sertraline 50mg', category: 'SSRI', genericName: 'Sertraline' },
  { name: 'Alprazolam 0.5mg', category: 'Benzodiazepine', genericName: 'Alprazolam' },
  { name: 'Clonazepam 0.5mg', category: 'Benzodiazepine', genericName: 'Clonazepam' },
];

// ============ DOSAGE PRESETS ============
const DOSAGE_PRESETS = [
  { label: '১-০-০', value: '1-0-0', description: 'সকালে একবার' },
  { label: '০-০-১', value: '0-0-1', description: 'রাতে একবার' },
  { label: '১-০-১', value: '1-0-1', description: 'সকাল-রাত' },
  { label: '১-১-১', value: '1-1-1', description: 'তিনবেলা' },
  { label: '০-১-০', value: '0-1-0', description: 'দুপুরে একবার' },
  { label: '১-১-০', value: '1-1-0', description: 'সকাল-দুপুর' },
  { label: '০-১-১', value: '0-1-1', description: 'দুপুর-রাত' },
  { label: '১+১+১+১', value: '1+1+1+1', description: '৬ ঘণ্টা পর পর' },
  { label: 'SOS', value: 'SOS', description: 'প্রয়োজনে' },
  { label: 'STAT', value: 'STAT', description: 'এখনই' },
];

// ============ DURATION PRESETS ============
const DURATION_PRESETS = [
  { label: '৩ দিন', value: '3 days' },
  { label: '৫ দিন', value: '5 days' },
  { label: '৭ দিন', value: '7 days' },
  { label: '১০ দিন', value: '10 days' },
  { label: '১৪ দিন', value: '14 days' },
  { label: '১ মাস', value: '1 month' },
  { label: '২ মাস', value: '2 months' },
  { label: '৩ মাস', value: '3 months' },
  { label: 'চলমান', value: 'Continue' },
];

// ============ INSTRUCTION PRESETS ============
const INSTRUCTION_PRESETS = [
  { label: 'খাবার পরে', value: 'After meal', valueBn: 'খাবার পরে' },
  { label: 'খাবার আগে', value: 'Before meal', valueBn: 'খাবার আগে' },
  { label: 'খালি পেটে', value: 'Empty stomach', valueBn: 'খালি পেটে সকালে' },
  { label: 'ঘুমানোর আগে', value: 'Before sleep', valueBn: 'রাতে ঘুমানোর আগে' },
  { label: 'পানির সাথে', value: 'With water', valueBn: 'এক গ্লাস পানির সাথে' },
  { label: 'দুধের সাথে', value: 'With milk', valueBn: 'দুধের সাথে' },
];

// ============ TYPES ============
interface Medicine {
  id: string;
  medicine: string;
  dosage: string;
  duration: string;
  instruction: string;
}

interface PrescriptionTemplate {
  id: string;
  name: string;
  diagnosis: string;
  medicines: Medicine[];
  advice: string[];
}

interface PrescriptionBuilderProps {
  // Doctor Info
  doctorName: string;
  doctorNameBn?: string;
  doctorDegrees: string;
  doctorSpecialty: string;
  doctorBmdcNo: string;
  chamberName: string;
  chamberAddress: string;
  chamberPhone?: string;
  
  // Patient Info
  patientName: string;
  patientNameBn?: string;
  patientAge: number;
  patientGender: string;
  patientPhone?: string;
  patientId?: string;
  patientAllergies?: string[];
  
  // Callbacks
  onSave?: (prescription: PrescriptionData) => void;
  onClose?: () => void;
  
  // Initial data
  initialDiagnosis?: string;
  initialMedicines?: PrescriptionItem[];
}

// ============ PRESCRIPTION BUILDER COMPONENT ============
export const PrescriptionBuilder: React.FC<PrescriptionBuilderProps> = ({
  doctorName,
  doctorNameBn,
  doctorDegrees,
  doctorSpecialty,
  doctorBmdcNo,
  chamberName,
  chamberAddress,
  chamberPhone,
  patientName,
  patientNameBn,
  patientAge,
  patientGender,
  patientPhone,
  patientId,
  patientAllergies = [],
  onSave,
  onClose,
  initialDiagnosis = '',
  initialMedicines = [],
}) => {
  // State
  const [diagnosis, setDiagnosis] = useState(initialDiagnosis);
  const [diagnosisBn, setDiagnosisBn] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>(
    initialMedicines.map((m, i) => ({
      id: `med-${i}`,
      medicine: m.medicine || m.name || '',
      dosage: m.dosage || '',
      duration: m.duration || '',
      instruction: m.instruction || m.instructions || '',
    }))
  );
  const [advice, setAdvice] = useState<string[]>([]);
  const [newAdvice, setNewAdvice] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [referral, setReferral] = useState('');
  
  // Medicine input state
  const [searchMedicine, setSearchMedicine] = useState('');
  const [showMedicineDropdown, setShowMedicineDropdown] = useState(false);
  const [selectedMedicineIndex, setSelectedMedicineIndex] = useState<number | null>(null);
  
  // Template state
  const [templates, setTemplates] = useState<PrescriptionTemplate[]>([]);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  // Filter medicines based on search
  const filteredMedicines = useMemo(() => {
    if (!searchMedicine) return [];
    const query = searchMedicine.toLowerCase();
    return MEDICINE_DATABASE.filter(m => 
      m.name.toLowerCase().includes(query) ||
      m.genericName.toLowerCase().includes(query) ||
      m.category.toLowerCase().includes(query)
    ).slice(0, 10);
  }, [searchMedicine]);

  // Add medicine
  const addMedicine = useCallback((medicineName?: string) => {
    const newMedicine: Medicine = {
      id: `med-${Date.now()}`,
      medicine: medicineName || '',
      dosage: '1-0-1',
      duration: '7 days',
      instruction: 'After meal',
    };
    setMedicines(prev => [...prev, newMedicine]);
    setSearchMedicine('');
    setShowMedicineDropdown(false);
  }, []);

  // Update medicine
  const updateMedicine = useCallback((id: string, field: keyof Medicine, value: string) => {
    setMedicines(prev => prev.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  }, []);

  // Remove medicine
  const removeMedicine = useCallback((id: string) => {
    setMedicines(prev => prev.filter(m => m.id !== id));
  }, []);

  // Move medicine up/down
  const moveMedicine = useCallback((index: number, direction: 'up' | 'down') => {
    setMedicines(prev => {
      const newList = [...prev];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= newList.length) return prev;
      [newList[index], newList[newIndex]] = [newList[newIndex], newList[index]];
      return newList;
    });
  }, []);

  // Add advice
  const addAdviceItem = useCallback(() => {
    if (newAdvice.trim()) {
      setAdvice(prev => [...prev, newAdvice.trim()]);
      setNewAdvice('');
    }
  }, [newAdvice]);

  // Remove advice
  const removeAdvice = useCallback((index: number) => {
    setAdvice(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Common advice presets
  const advicePresets = [
    'প্রচুর পানি পান করুন',
    'পর্যাপ্ত বিশ্রাম নিন',
    'তৈলাক্ত খাবার বর্জন করুন',
    'নিয়মিত হাঁটুন',
    'ধূমপান বর্জন করুন',
    'লবণ কম খান',
    'চিনি কম খান',
    'সবুজ শাকসবজি খান',
    'সময়মতো ওষুধ খান',
  ];

  // Check for allergy warnings
  const allergyWarnings = useMemo(() => {
    const warnings: string[] = [];
    medicines.forEach(med => {
      patientAllergies.forEach(allergy => {
        if (med.medicine.toLowerCase().includes(allergy.toLowerCase())) {
          warnings.push(`⚠️ সতর্কতা: ${med.medicine} - রোগীর ${allergy} এলার্জি আছে!`);
        }
      });
    });
    return warnings;
  }, [medicines, patientAllergies]);

  // Generate prescription
  const generatePrescription = useCallback((): PrescriptionData => {
    return {
      doctorName,
      doctorNameBn,
      doctorDegrees,
      doctorSpecialty,
      doctorBmdcNo,
      chamberName,
      chamberAddress,
      chamberPhone,
      patientName: patientNameBn || patientName,
      patientAge,
      patientGender,
      patientPhone,
      patientId,
      date: new Date().toLocaleDateString('bn-BD'),
      diagnosis,
      diagnosisBn,
      clinicalNotes,
      medicines: medicines.map(m => ({
        medicine: m.medicine,
        name: m.medicine,
        dosage: m.dosage,
        frequency: m.dosage,
        duration: m.duration,
        instruction: m.instruction,
        instructions: m.instruction,
      })),
      advice,
      followUpDate,
      referral,
    };
  }, [
    doctorName, doctorNameBn, doctorDegrees, doctorSpecialty, doctorBmdcNo,
    chamberName, chamberAddress, chamberPhone,
    patientName, patientNameBn, patientAge, patientGender, patientPhone, patientId,
    diagnosis, diagnosisBn, clinicalNotes, medicines, advice, followUpDate, referral
  ]);

  // Preview prescription
  const handlePreview = useCallback(() => {
    const prescription = generatePrescription();
    openPrescriptionWindow(prescription);
  }, [generatePrescription]);

  // Save prescription
  const handleSave = useCallback(() => {
    const prescription = generatePrescription();
    if (onSave) {
      onSave(prescription);
    }
  }, [generatePrescription, onSave]);

  // Save as template
  const saveAsTemplate = useCallback(() => {
    if (templateName.trim()) {
      const newTemplate: PrescriptionTemplate = {
        id: `template-${Date.now()}`,
        name: templateName.trim(),
        diagnosis,
        medicines,
        advice,
      };
      setTemplates(prev => [...prev, newTemplate]);
      setTemplateName('');
      setShowSaveTemplate(false);
      // In real app, save to localStorage or database
      localStorage.setItem('prescriptionTemplates', JSON.stringify([...templates, newTemplate]));
    }
  }, [templateName, diagnosis, medicines, advice, templates]);

  // Load template
  const loadTemplate = useCallback((template: PrescriptionTemplate) => {
    setDiagnosis(template.diagnosis);
    setMedicines(template.medicines);
    setAdvice(template.advice);
    setShowTemplates(false);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">প্রেসক্রিপশন তৈরি করুন</h2>
          <p className="text-slate-500">রোগী: {patientNameBn || patientName} ({patientAge} বছর, {patientGender === 'Male' ? 'পুরুষ' : 'মহিলা'})</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplates(true)}
            className="px-4 py-2 glass-subtle text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            📋 টেমপ্লেট
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 glass-subtle text-slate-600 rounded-lg hover:bg-slate-100 transition"
            >
              ✕ বন্ধ
            </button>
          )}
        </div>
      </div>

      {/* Allergy Warnings */}
      {patientAllergies.length > 0 && (
        <div className="glass-card p-4 border-l-4 border-red-400 bg-red-50/50">
          <h3 className="font-semibold text-red-700 mb-2">⚠️ এলার্জি সতর্কতা</h3>
          <div className="flex flex-wrap gap-2">
            {patientAllergies.map((allergy, idx) => (
              <span key={idx} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                {allergy}
              </span>
            ))}
          </div>
          {allergyWarnings.length > 0 && (
            <div className="mt-3 space-y-1">
              {allergyWarnings.map((warning, idx) => (
                <p key={idx} className="text-red-600 font-medium">{warning}</p>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Diagnosis & Medicines */}
        <div className="lg:col-span-2 space-y-6">
          {/* Diagnosis */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
              🔍 রোগ নির্ণয় / Diagnosis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">English</label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g., Hypertension, Diabetes Type 2"
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">বাংলায়</label>
                <input
                  type="text"
                  value={diagnosisBn}
                  onChange={(e) => setDiagnosisBn(e.target.value)}
                  placeholder="যেমন: উচ্চ রক্তচাপ, ডায়াবেটিস"
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm text-slate-600 mb-1">ক্লিনিক্যাল নোট (ঐচ্ছিক)</label>
              <textarea
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="পরীক্ষার ফলাফল, পর্যবেক্ষণ..."
                rows={2}
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300 resize-none"
              />
            </div>
          </div>

          {/* Medicines */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <span className="text-2xl text-teal-600">℞</span> ওষুধের তালিকা
              </h3>
              <span className="text-sm text-slate-500">{medicines.length} টি ওষুধ</span>
            </div>

            {/* Add Medicine */}
            <div className="relative mb-4">
              <input
                type="text"
                value={searchMedicine}
                onChange={(e) => {
                  setSearchMedicine(e.target.value);
                  setShowMedicineDropdown(true);
                }}
                onFocus={() => setShowMedicineDropdown(true)}
                placeholder="ওষুধ খুঁজুন বা নাম লিখুন..."
                className="w-full p-3 pr-12 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-300"
              />
              <button
                onClick={() => addMedicine(searchMedicine)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-teal-500 text-white rounded-lg text-sm hover:bg-teal-600"
              >
                + যোগ
              </button>

              {/* Medicine Dropdown */}
              {showMedicineDropdown && filteredMedicines.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredMedicines.map((med, idx) => (
                    <button
                      key={idx}
                      onClick={() => addMedicine(med.name)}
                      className="w-full px-4 py-3 text-left hover:bg-teal-50 transition flex justify-between items-center"
                    >
                      <div>
                        <div className="font-medium text-slate-700">{med.name}</div>
                        <div className="text-xs text-slate-500">{med.genericName} • {med.category}</div>
                      </div>
                      <span className="text-teal-500">+</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Medicine List */}
            <div className="space-y-3">
              {medicines.map((med, index) => (
                <div key={med.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveMedicine(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveMedicine(index, 'down')}
                        disabled={index === medicines.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                      >
                        ▼
                      </button>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                      {/* Medicine Name */}
                      <div className="md:col-span-2">
                        <label className="block text-xs text-slate-500 mb-1">ওষুধ</label>
                        <input
                          type="text"
                          value={med.medicine}
                          onChange={(e) => updateMedicine(med.id, 'medicine', e.target.value)}
                          className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                        />
                      </div>

                      {/* Dosage */}
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">মাত্রা</label>
                        <select
                          value={med.dosage}
                          onChange={(e) => updateMedicine(med.id, 'dosage', e.target.value)}
                          className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                        >
                          {DOSAGE_PRESETS.map(d => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Duration */}
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">সময়কাল</label>
                        <select
                          value={med.duration}
                          onChange={(e) => updateMedicine(med.id, 'duration', e.target.value)}
                          className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                        >
                          {DURATION_PRESETS.map(d => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={() => removeMedicine(med.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      🗑️
                    </button>
                  </div>

                  {/* Instruction */}
                  <div className="mt-3 ml-8">
                    <label className="block text-xs text-slate-500 mb-1">নির্দেশনা</label>
                    <div className="flex gap-2 flex-wrap">
                      {INSTRUCTION_PRESETS.map(inst => (
                        <button
                          key={inst.value}
                          onClick={() => updateMedicine(med.id, 'instruction', inst.valueBn)}
                          className={`px-3 py-1 rounded-full text-sm transition ${
                            med.instruction === inst.valueBn
                              ? 'bg-teal-500 text-white'
                              : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-300'
                          }`}
                        >
                          {inst.label}
                        </button>
                      ))}
                      <input
                        type="text"
                        value={med.instruction}
                        onChange={(e) => updateMedicine(med.id, 'instruction', e.target.value)}
                        placeholder="কাস্টম নির্দেশনা..."
                        className="flex-1 min-w-[150px] p-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {medicines.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <div className="text-4xl mb-2">💊</div>
                  <p>কোনো ওষুধ যোগ করা হয়নি</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Advice & Actions */}
        <div className="space-y-6">
          {/* Advice */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-slate-700 mb-4">📋 পরামর্শ</h3>
            
            {/* Quick Add */}
            <div className="flex flex-wrap gap-2 mb-4">
              {advicePresets.slice(0, 6).map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => setAdvice(prev => prev.includes(preset) ? prev : [...prev, preset])}
                  disabled={advice.includes(preset)}
                  className={`px-3 py-1 rounded-full text-xs transition ${
                    advice.includes(preset)
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Custom Advice */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newAdvice}
                onChange={(e) => setNewAdvice(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addAdviceItem()}
                placeholder="কাস্টম পরামর্শ..."
                className="flex-1 p-2 border border-slate-200 rounded-lg text-sm"
              />
              <button
                onClick={addAdviceItem}
                className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
              >
                +
              </button>
            </div>

            {/* Advice List */}
            <div className="space-y-2">
              {advice.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                  <span className="text-green-600">✓</span>
                  <span className="flex-1 text-sm text-slate-700">{item}</span>
                  <button
                    onClick={() => removeAdvice(idx)}
                    className="text-red-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Follow-up & Referral */}
          <div className="glass-card p-6">
            <h3 className="font-semibold text-slate-700 mb-4">📅 ফলো-আপ</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">পরবর্তী ভিজিটের তারিখ</label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">রেফার (যদি প্রয়োজন)</label>
                <input
                  type="text"
                  value={referral}
                  onChange={(e) => setReferral(e.target.value)}
                  placeholder="বিশেষজ্ঞের নাম বা হাসপাতাল..."
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="glass-card p-6 space-y-3">
            <button
              onClick={handlePreview}
              className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition flex items-center justify-center gap-2"
            >
              👁️ প্রিভিউ ও প্রিন্ট
            </button>
            
            <button
              onClick={handleSave}
              className="w-full py-3 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition flex items-center justify-center gap-2"
            >
              💾 সেভ করুন
            </button>

            <button
              onClick={() => setShowSaveTemplate(true)}
              className="w-full py-3 glass-subtle text-slate-600 rounded-xl font-medium hover:bg-slate-100 transition flex items-center justify-center gap-2"
            >
              📋 টেমপ্লেট হিসেবে সেভ
            </button>
          </div>
        </div>
      </div>

      {/* Save Template Modal */}
      {showSaveTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-strong rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-slate-800 mb-4">টেমপ্লেট সেভ করুন</h3>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="টেমপ্লেটের নাম..."
              className="w-full p-3 border border-slate-200 rounded-lg mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveTemplate(false)}
                className="flex-1 py-2 glass-subtle text-slate-600 rounded-lg"
              >
                বাতিল
              </button>
              <button
                onClick={saveAsTemplate}
                className="flex-1 py-2 bg-teal-500 text-white rounded-lg"
              >
                সেভ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-strong rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">টেমপ্লেট লোড করুন</h3>
              <button onClick={() => setShowTemplates(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <div className="overflow-y-auto max-h-[60vh] space-y-2">
              {templates.length > 0 ? (
                templates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => loadTemplate(template)}
                    className="w-full p-4 text-left glass-subtle rounded-xl hover:bg-teal-50 transition"
                  >
                    <div className="font-medium text-slate-700">{template.name}</div>
                    <div className="text-sm text-slate-500">{template.diagnosis} • {template.medicines.length} ওষুধ</div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <p>কোনো টেমপ্লেট নেই</p>
                  <p className="text-sm">প্রথমে একটি প্রেসক্রিপশন তৈরি করে টেমপ্লেট হিসেবে সেভ করুন</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrescriptionBuilder;

