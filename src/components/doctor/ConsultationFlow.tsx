import React, { useState, useCallback, useRef, useEffect } from 'react';

// ============ TYPES ============
export interface SOAPNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface VitalSigns {
  bp: string;
  pulse: number | '';
  temp: number | '';
  respRate: number | '';
  spo2: number | '';
  weight: number | '';
  height: number | '';
}

export interface PatientIntake {
  chiefComplaint: string;
  chiefComplaintBn: string;
  duration: string;
  severity: 'Mild' | 'Moderate' | 'Severe';
  previousTreatment: string;
  symptoms: string[];
}

interface ConsultationTemplate {
  id: string;
  name: string;
  nameBn: string;
  condition: string;
  soap: Partial<SOAPNote>;
  vitals?: Partial<VitalSigns>;
}

interface ConsultationFlowProps {
  // Patient Info
  patientName: string;
  patientNameBn?: string;
  patientAge: number;
  patientGender: 'Male' | 'Female';
  patientBloodGroup?: string;
  patientConditions?: string[];
  patientAllergies?: string[];
  previousVisits?: number;
  
  // Initial data
  initialSOAP?: SOAPNote;
  initialVitals?: VitalSigns;
  initialIntake?: PatientIntake;
  
  // Callbacks
  onSOAPChange?: (soap: SOAPNote) => void;
  onVitalsChange?: (vitals: VitalSigns) => void;
  onIntakeChange?: (intake: PatientIntake) => void;
  onComplete?: (data: { soap: SOAPNote; vitals: VitalSigns; intake: PatientIntake }) => void;
}

// ============ CONSULTATION TEMPLATES ============
const CONSULTATION_TEMPLATES: ConsultationTemplate[] = [
  {
    id: 'hypertension',
    name: 'Hypertension Follow-up',
    nameBn: 'উচ্চ রক্তচাপ ফলো-আপ',
    condition: 'Hypertension',
    soap: {
      subjective: 'Patient presents for routine hypertension follow-up. Reports compliance with medications.',
      objective: 'Alert and oriented. Heart sounds normal, no murmurs. Peripheral pulses present.',
      assessment: 'Essential Hypertension - Controlled/Uncontrolled',
      plan: 'Continue current medications. Lifestyle modifications advised. Follow-up in 1 month.',
    },
  },
  {
    id: 'diabetes',
    name: 'Diabetes Follow-up',
    nameBn: 'ডায়াবেটিস ফলো-আপ',
    condition: 'Diabetes Type 2',
    soap: {
      subjective: 'Patient presents for diabetes management follow-up. Reports adherence to diet and medications.',
      objective: 'Alert. Feet examination: No ulcers, pulses present. BMI calculated.',
      assessment: 'Type 2 Diabetes Mellitus - Glycemic control assessment',
      plan: 'Continue current regimen. Check HbA1c if due. Dietitian referral if needed.',
    },
  },
  {
    id: 'chest-pain',
    name: 'Chest Pain Evaluation',
    nameBn: 'বুকে ব্যথা মূল্যায়ন',
    condition: 'Chest Pain',
    soap: {
      subjective: 'Patient reports chest pain. Onset:___, Duration:___, Character:___, Radiation:___, Associated symptoms:___',
      objective: 'Vitals stable/unstable. Heart sounds: ___. Lung sounds: ___. ECG: ___',
      assessment: 'Chest pain - Cardiac/Non-cardiac origin. DDx: ACS, GERD, MSK, Anxiety',
      plan: 'ECG stat. Cardiac enzymes if indicated. Cardiology referral if needed.',
    },
  },
  {
    id: 'fever',
    name: 'Fever Workup',
    nameBn: 'জ্বর পরীক্ষা',
    condition: 'Fever',
    soap: {
      subjective: 'Patient presents with fever for ___ days. Associated symptoms: ___. No travel history.',
      objective: 'Temp: ___°F. Throat: ___. Chest clear. Abdomen soft.',
      assessment: 'Fever - likely viral/bacterial origin. DDx: URTI, UTI, Dengue, Typhoid',
      plan: 'CBC, Dengue NS1/Ab, Urine R/M/E. Symptomatic treatment. Hydration advised.',
    },
  },
  {
    id: 'gastric',
    name: 'Gastric/Acidity',
    nameBn: 'গ্যাস্ট্রিক/অ্যাসিডিটি',
    condition: 'Dyspepsia',
    soap: {
      subjective: 'Patient reports epigastric discomfort, burning sensation. Worse after meals/empty stomach.',
      objective: 'Abdomen soft, mild epigastric tenderness. No organomegaly. Bowel sounds normal.',
      assessment: 'Functional Dyspepsia / GERD / Gastritis',
      plan: 'PPI trial for 2-4 weeks. Dietary modifications. Avoid NSAIDs, spicy food.',
    },
  },
  {
    id: 'headache',
    name: 'Headache Evaluation',
    nameBn: 'মাথাব্যথা মূল্যায়ন',
    condition: 'Headache',
    soap: {
      subjective: 'Patient reports headache. Type:___, Location:___, Duration:___, Triggers:___, Red flags:___',
      objective: 'Alert, oriented. Pupils equal. No focal neurological deficits. Fundoscopy: ___',
      assessment: 'Primary headache - Tension type / Migraine / Cluster',
      plan: 'Analgesics PRN. Headache diary. CT/MRI if red flags present.',
    },
  },
];

// ============ SYMPTOM PRESETS ============
const SYMPTOM_PRESETS = [
  'জ্বর', 'মাথাব্যথা', 'বুকে ব্যথা', 'শ্বাসকষ্ট', 'বমি', 'পেটে ব্যথা',
  'ডায়রিয়া', 'কাশি', 'গলা ব্যথা', 'দুর্বলতা', 'মাথা ঘোরা', 'বুক ধড়ফড়',
];

// ============ CONSULTATION FLOW COMPONENT ============
export const ConsultationFlow: React.FC<ConsultationFlowProps> = ({
  patientName,
  patientNameBn,
  patientAge,
  patientGender,
  patientBloodGroup,
  patientConditions = [],
  patientAllergies = [],
  previousVisits = 0,
  initialSOAP,
  initialVitals,
  initialIntake,
  onSOAPChange,
  onVitalsChange,
  onIntakeChange,
  onComplete,
}) => {
  // State
  const [activeStep, setActiveStep] = useState<'intake' | 'vitals' | 'soap' | 'summary'>('intake');
  const [intake, setIntake] = useState<PatientIntake>(initialIntake || {
    chiefComplaint: '',
    chiefComplaintBn: '',
    duration: '',
    severity: 'Moderate',
    previousTreatment: '',
    symptoms: [],
  });
  const [vitals, setVitals] = useState<VitalSigns>(initialVitals || {
    bp: '',
    pulse: '',
    temp: '',
    respRate: '',
    spo2: '',
    weight: '',
    height: '',
  });
  const [soap, setSOAP] = useState<SOAPNote>(initialSOAP || {
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  });
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingField, setRecordingField] = useState<keyof SOAPNote | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'bn-BD'; // Bengali

      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        
        if (recordingField && event.results[event.resultIndex].isFinal) {
          setSOAP(prev => ({
            ...prev,
            [recordingField]: prev[recordingField] + (prev[recordingField] ? ' ' : '') + transcript,
          }));
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        setRecordingField(null);
      };
    }
  }, [recordingField]);

  // Toggle voice recording
  const toggleRecording = useCallback((field: keyof SOAPNote) => {
    if (!recognitionRef.current) {
      alert('আপনার ব্রাউজার স্পিচ রেকগনিশন সাপোর্ট করে না');
      return;
    }

    if (isRecording && recordingField === field) {
      recognitionRef.current.stop();
      setIsRecording(false);
      setRecordingField(null);
    } else {
      if (isRecording) {
        recognitionRef.current.stop();
      }
      setRecordingField(field);
      recognitionRef.current.start();
      setIsRecording(true);
    }
  }, [isRecording, recordingField]);

  // Apply template
  const applyTemplate = useCallback((template: ConsultationTemplate) => {
    setSOAP(prev => ({
      ...prev,
      ...template.soap,
    }));
    if (template.vitals) {
      setVitals(prev => ({
        ...prev,
        ...template.vitals,
      }));
    }
    setActiveStep('soap');
  }, []);

  // Toggle symptom
  const toggleSymptom = useCallback((symptom: string) => {
    setIntake(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter(s => s !== symptom)
        : [...prev.symptoms, symptom],
    }));
  }, []);

  // Calculate BMI
  const bmi = vitals.weight && vitals.height 
    ? (Number(vitals.weight) / Math.pow(Number(vitals.height) / 100, 2)).toFixed(1)
    : null;

  // Handle complete
  const handleComplete = useCallback(() => {
    if (onComplete) {
      onComplete({ soap, vitals, intake });
    }
  }, [soap, vitals, intake, onComplete]);

  // Notify parent of changes
  useEffect(() => {
    if (onSOAPChange) onSOAPChange(soap);
  }, [soap, onSOAPChange]);

  useEffect(() => {
    if (onVitalsChange) onVitalsChange(vitals);
  }, [vitals, onVitalsChange]);

  useEffect(() => {
    if (onIntakeChange) onIntakeChange(intake);
  }, [intake, onIntakeChange]);

  // Step indicator
  const steps = [
    { id: 'intake', label: 'ইনটেক', icon: '📝' },
    { id: 'vitals', label: 'ভাইটাল', icon: '💓' },
    { id: 'soap', label: 'SOAP নোট', icon: '📋' },
    { id: 'summary', label: 'সারাংশ', icon: '✅' },
  ];

  return (
    <div className="space-y-6">
      {/* Patient Header */}
      <div className="glass-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
            {patientGender === 'Male' ? '👨' : '👩'}
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{patientNameBn || patientName}</h3>
            <p className="text-sm text-slate-500">
              {patientAge} বছর • {patientGender === 'Male' ? 'পুরুষ' : 'মহিলা'}
              {patientBloodGroup && ` • ${patientBloodGroup}`}
              {previousVisits > 0 && ` • ${previousVisits} বার ভিজিট`}
            </p>
          </div>
        </div>
        
        {/* Alerts */}
        <div className="flex gap-2">
          {patientConditions.length > 0 && (
            <div className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
              🩺 {patientConditions.slice(0, 2).join(', ')}
            </div>
          )}
          {patientAllergies.length > 0 && (
            <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
              ⚠️ {patientAllergies.join(', ')}
            </div>
          )}
        </div>
      </div>

      {/* Step Indicator */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => (
            <React.Fragment key={step.id}>
              <button
                onClick={() => setActiveStep(step.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  activeStep === step.id
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{step.icon}</span>
                <span className="font-medium">{step.label}</span>
              </button>
              {idx < steps.length - 1 && (
                <div className="flex-1 h-0.5 bg-slate-200 mx-2"></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {activeStep === 'intake' && (
        <div className="glass-card p-6 space-y-6">
          <h3 className="font-bold text-slate-800 text-lg">📝 রোগীর সমস্যা (Chief Complaint)</h3>
          
          {/* Chief Complaint */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">মূল সমস্যা (English)</label>
              <input
                type="text"
                value={intake.chiefComplaint}
                onChange={(e) => setIntake(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                placeholder="e.g., Chest pain for 2 days"
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">মূল সমস্যা (বাংলায়)</label>
              <input
                type="text"
                value={intake.chiefComplaintBn}
                onChange={(e) => setIntake(prev => ({ ...prev, chiefComplaintBn: e.target.value }))}
                placeholder="যেমন: ২ দিন ধরে বুকে ব্যথা"
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          {/* Duration & Severity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">সময়কাল</label>
              <input
                type="text"
                value={intake.duration}
                onChange={(e) => setIntake(prev => ({ ...prev, duration: e.target.value }))}
                placeholder="যেমন: ২ দিন, ১ সপ্তাহ"
                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">তীব্রতা</label>
              <div className="flex gap-2">
                {(['Mild', 'Moderate', 'Severe'] as const).map(severity => (
                  <button
                    key={severity}
                    onClick={() => setIntake(prev => ({ ...prev, severity }))}
                    className={`flex-1 py-3 rounded-lg font-medium transition ${
                      intake.severity === severity
                        ? severity === 'Mild' ? 'bg-green-500 text-white'
                          : severity === 'Moderate' ? 'bg-amber-500 text-white'
                          : 'bg-red-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {severity === 'Mild' ? '🟢 হালকা' : severity === 'Moderate' ? '🟡 মাঝারি' : '🔴 তীব্র'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Symptoms */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">সহযোগী লক্ষণ</label>
            <div className="flex flex-wrap gap-2">
              {SYMPTOM_PRESETS.map(symptom => (
                <button
                  key={symptom}
                  onClick={() => toggleSymptom(symptom)}
                  className={`px-4 py-2 rounded-full text-sm transition ${
                    intake.symptoms.includes(symptom)
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {symptom}
                </button>
              ))}
            </div>
          </div>

          {/* Previous Treatment */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">পূর্ববর্তী চিকিৎসা</label>
            <textarea
              value={intake.previousTreatment}
              onChange={(e) => setIntake(prev => ({ ...prev, previousTreatment: e.target.value }))}
              placeholder="এর আগে কোনো চিকিৎসা নিয়েছেন কি?"
              rows={2}
              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300 resize-none"
            />
          </div>

          <button
            onClick={() => setActiveStep('vitals')}
            className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition"
          >
            পরবর্তী: ভাইটাল সাইন →
          </button>
        </div>
      )}

      {activeStep === 'vitals' && (
        <div className="glass-card p-6 space-y-6">
          <h3 className="font-bold text-slate-800 text-lg">💓 ভাইটাল সাইনস</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Blood Pressure */}
            <div className="glass-subtle p-4 rounded-xl">
              <label className="block text-xs text-slate-500 mb-1">রক্তচাপ (BP)</label>
              <input
                type="text"
                value={vitals.bp}
                onChange={(e) => setVitals(prev => ({ ...prev, bp: e.target.value }))}
                placeholder="120/80"
                className="w-full p-2 text-center text-lg font-bold border-0 bg-transparent focus:ring-0"
              />
              <div className="text-xs text-center text-slate-400">mmHg</div>
            </div>

            {/* Pulse */}
            <div className="glass-subtle p-4 rounded-xl">
              <label className="block text-xs text-slate-500 mb-1">পালস (HR)</label>
              <input
                type="number"
                value={vitals.pulse}
                onChange={(e) => setVitals(prev => ({ ...prev, pulse: e.target.value ? Number(e.target.value) : '' }))}
                placeholder="72"
                className="w-full p-2 text-center text-lg font-bold border-0 bg-transparent focus:ring-0"
              />
              <div className="text-xs text-center text-slate-400">bpm</div>
            </div>

            {/* Temperature */}
            <div className="glass-subtle p-4 rounded-xl">
              <label className="block text-xs text-slate-500 mb-1">তাপমাত্রা</label>
              <input
                type="number"
                step="0.1"
                value={vitals.temp}
                onChange={(e) => setVitals(prev => ({ ...prev, temp: e.target.value ? Number(e.target.value) : '' }))}
                placeholder="98.6"
                className="w-full p-2 text-center text-lg font-bold border-0 bg-transparent focus:ring-0"
              />
              <div className="text-xs text-center text-slate-400">°F</div>
            </div>

            {/* SpO2 */}
            <div className="glass-subtle p-4 rounded-xl">
              <label className="block text-xs text-slate-500 mb-1">SpO2</label>
              <input
                type="number"
                value={vitals.spo2}
                onChange={(e) => setVitals(prev => ({ ...prev, spo2: e.target.value ? Number(e.target.value) : '' }))}
                placeholder="98"
                className="w-full p-2 text-center text-lg font-bold border-0 bg-transparent focus:ring-0"
              />
              <div className="text-xs text-center text-slate-400">%</div>
            </div>

            {/* Respiratory Rate */}
            <div className="glass-subtle p-4 rounded-xl">
              <label className="block text-xs text-slate-500 mb-1">শ্বাস-প্রশ্বাস</label>
              <input
                type="number"
                value={vitals.respRate}
                onChange={(e) => setVitals(prev => ({ ...prev, respRate: e.target.value ? Number(e.target.value) : '' }))}
                placeholder="16"
                className="w-full p-2 text-center text-lg font-bold border-0 bg-transparent focus:ring-0"
              />
              <div className="text-xs text-center text-slate-400">/min</div>
            </div>

            {/* Weight */}
            <div className="glass-subtle p-4 rounded-xl">
              <label className="block text-xs text-slate-500 mb-1">ওজন</label>
              <input
                type="number"
                step="0.1"
                value={vitals.weight}
                onChange={(e) => setVitals(prev => ({ ...prev, weight: e.target.value ? Number(e.target.value) : '' }))}
                placeholder="70"
                className="w-full p-2 text-center text-lg font-bold border-0 bg-transparent focus:ring-0"
              />
              <div className="text-xs text-center text-slate-400">kg</div>
            </div>

            {/* Height */}
            <div className="glass-subtle p-4 rounded-xl">
              <label className="block text-xs text-slate-500 mb-1">উচ্চতা</label>
              <input
                type="number"
                value={vitals.height}
                onChange={(e) => setVitals(prev => ({ ...prev, height: e.target.value ? Number(e.target.value) : '' }))}
                placeholder="170"
                className="w-full p-2 text-center text-lg font-bold border-0 bg-transparent focus:ring-0"
              />
              <div className="text-xs text-center text-slate-400">cm</div>
            </div>

            {/* BMI */}
            <div className="glass-subtle p-4 rounded-xl bg-blue-50">
              <label className="block text-xs text-slate-500 mb-1">BMI</label>
              <div className="text-center text-lg font-bold text-blue-600">
                {bmi || '-'}
              </div>
              <div className="text-xs text-center text-slate-400">kg/m²</div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setActiveStep('intake')}
              className="flex-1 py-3 glass-subtle text-slate-600 rounded-xl font-medium hover:bg-slate-100 transition"
            >
              ← পূর্ববর্তী
            </button>
            <button
              onClick={() => setActiveStep('soap')}
              className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition"
            >
              পরবর্তী: SOAP নোট →
            </button>
          </div>
        </div>
      )}

      {activeStep === 'soap' && (
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-lg">📋 SOAP নোট</h3>
            
            {/* Templates */}
            <select
              onChange={(e) => {
                const template = CONSULTATION_TEMPLATES.find(t => t.id === e.target.value);
                if (template) applyTemplate(template);
                e.target.value = '';
              }}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="">টেমপ্লেট থেকে লোড করুন...</option>
              {CONSULTATION_TEMPLATES.map(t => (
                <option key={t.id} value={t.id}>{t.nameBn}</option>
              ))}
            </select>
          </div>

          {/* SOAP Fields */}
          {([
            { key: 'subjective', label: 'Subjective', labelBn: 'রোগীর বর্ণনা', color: 'blue' },
            { key: 'objective', label: 'Objective', labelBn: 'পরীক্ষা-নিরীক্ষা', color: 'green' },
            { key: 'assessment', label: 'Assessment', labelBn: 'মূল্যায়ন', color: 'yellow' },
            { key: 'plan', label: 'Plan', labelBn: 'চিকিৎসা পরিকল্পনা', color: 'purple' },
          ] as const).map(field => (
            <div key={field.key}>
              <div className="flex items-center justify-between mb-2">
                <label className={`flex items-center gap-2 text-sm font-bold text-${field.color}-600`}>
                  <span className={`w-6 h-6 bg-${field.color}-100 rounded flex items-center justify-center`}>
                    {field.label.charAt(0)}
                  </span>
                  {field.label} ({field.labelBn})
                </label>
                <button
                  onClick={() => toggleRecording(field.key)}
                  className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 transition ${
                    isRecording && recordingField === field.key
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {isRecording && recordingField === field.key ? '🔴 রেকর্ডিং...' : '🎤 ডিক্টেট'}
                </button>
              </div>
              <textarea
                value={soap[field.key]}
                onChange={(e) => setSOAP(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={`${field.labelBn} লিখুন...`}
                rows={3}
                className="w-full p-4 border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          ))}

          <div className="flex gap-4">
            <button
              onClick={() => setActiveStep('vitals')}
              className="flex-1 py-3 glass-subtle text-slate-600 rounded-xl font-medium hover:bg-slate-100 transition"
            >
              ← পূর্ববর্তী
            </button>
            <button
              onClick={() => setActiveStep('summary')}
              className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition"
            >
              পরবর্তী: সারাংশ →
            </button>
          </div>
        </div>
      )}

      {activeStep === 'summary' && (
        <div className="glass-card p-6 space-y-6">
          <h3 className="font-bold text-slate-800 text-lg">✅ কনসাল্টেশন সারাংশ</h3>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chief Complaint */}
            <div className="glass-subtle p-4 rounded-xl">
              <h4 className="font-medium text-slate-700 mb-2">📝 মূল সমস্যা</h4>
              <p className="text-slate-600">{intake.chiefComplaintBn || intake.chiefComplaint || '-'}</p>
              <p className="text-sm text-slate-500 mt-1">সময়কাল: {intake.duration || '-'} | তীব্রতা: {intake.severity}</p>
            </div>

            {/* Vitals Summary */}
            <div className="glass-subtle p-4 rounded-xl">
              <h4 className="font-medium text-slate-700 mb-2">💓 ভাইটাল সাইনস</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div><span className="text-slate-400">BP:</span> {vitals.bp || '-'}</div>
                <div><span className="text-slate-400">HR:</span> {vitals.pulse || '-'}</div>
                <div><span className="text-slate-400">Temp:</span> {vitals.temp || '-'}°F</div>
                <div><span className="text-slate-400">SpO2:</span> {vitals.spo2 || '-'}%</div>
                <div><span className="text-slate-400">Wt:</span> {vitals.weight || '-'}kg</div>
                <div><span className="text-slate-400">BMI:</span> {bmi || '-'}</div>
              </div>
            </div>
          </div>

          {/* SOAP Summary */}
          <div className="space-y-3">
            {[
              { key: 'subjective', label: 'S - Subjective', bg: 'bg-blue-50', text: 'text-blue-700' },
              { key: 'objective', label: 'O - Objective', bg: 'bg-green-50', text: 'text-green-700' },
              { key: 'assessment', label: 'A - Assessment', bg: 'bg-yellow-50', text: 'text-yellow-700' },
              { key: 'plan', label: 'P - Plan', bg: 'bg-purple-50', text: 'text-purple-700' },
            ].map(field => (
              <div key={field.key} className={`p-4 rounded-xl ${field.bg}`}>
                <h4 className={`font-medium ${field.text} mb-1`}>{field.label}</h4>
                <p className="text-slate-700">{soap[field.key as keyof SOAPNote] || '-'}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setActiveStep('soap')}
              className="flex-1 py-3 glass-subtle text-slate-600 rounded-xl font-medium hover:bg-slate-100 transition"
            >
              ← সম্পাদনা করুন
            </button>
            <button
              onClick={handleComplete}
              className="flex-1 py-3 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition"
            >
              ✅ সম্পন্ন করুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsultationFlow;

