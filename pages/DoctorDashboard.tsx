import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { chatWithDoctorAssistant } from '../services/geminiService';
import { ChatMessage, PrescriptionItem } from '../types';

// ============ TYPES ============
interface PatientRecord {
  id: string;
  name: string;
  nameBn: string;
  age: number;
  gender: 'Male' | 'Female';
  phone: string;
  bloodGroup: string;
  profileImage: string;
  lastVisit: string;
  totalVisits: number;
  diagnosis: string;
  diagnosisBn: string;
  riskLevel: 'High' | 'Medium' | 'Low';
  conditions: string[];
  medications: string[];
  allergies: string[];
  familyHistory: { condition: string; relation: string }[];
  vitals: { date: string; bp: string; hr: number; weight: number }[];
  consultations: { date: string; diagnosis: string; notes: string; prescription: PrescriptionItem[] }[];
  aiSummary?: string;
}

interface TodayAppointment {
  id: string;
  patientId: string;
  patientName: string;
  patientImage: string;
  time: string;
  serial: number;
  type: 'New' | 'Follow-up' | 'Report';
  status: 'Waiting' | 'In-Progress' | 'Completed' | 'No-Show';
  chiefComplaint?: string;
}

interface DoctorStats {
  totalPatients: number;
  totalConsultations: number;
  thisMonthPatients: number;
  avgRating: number;
  totalDiagnoses: number;
  followUpRate: number;
}

// ============ MOCK DATA ============
const DOCTOR_PROFILE = {
  id: 'd1',
  name: 'Dr. Abul Kashem',
  nameBn: 'ডা. আবুল কাশেম',
  specialty: 'Cardiology',
  specialtyBn: 'হৃদরোগ বিশেষজ্ঞ',
  degrees: 'MBBS, FCPS (Cardiology), MD',
  image: 'https://randomuser.me/api/portraits/men/85.jpg',
  hospital: 'Square Hospital, Dhaka',
  experience: 15,
  bmdcNo: 'A-32145',
};

const DOCTOR_STATS: DoctorStats = {
  totalPatients: 2847,
  totalConsultations: 12453,
  thisMonthPatients: 156,
  avgRating: 4.8,
  totalDiagnoses: 45,
  followUpRate: 68,
};

const PATIENTS: PatientRecord[] = [
  {
    id: 'p1',
    name: 'Rahim Uddin',
    nameBn: 'রহিম উদ্দিন',
    age: 45,
    gender: 'Male',
    phone: '01712345678',
    bloodGroup: 'A+',
    profileImage: 'https://randomuser.me/api/portraits/men/32.jpg',
    lastVisit: '2024-11-20',
    totalVisits: 8,
    diagnosis: 'Hypertension',
    diagnosisBn: 'উচ্চ রক্তচাপ',
    riskLevel: 'High',
    conditions: ['Hypertension', 'Pre-diabetic'],
    medications: ['Amlodipine 5mg', 'Aspirin 75mg'],
    allergies: ['Penicillin'],
    familyHistory: [
      { condition: 'Heart Disease', relation: 'Father' },
      { condition: 'Diabetes', relation: 'Mother' },
      { condition: 'Stroke', relation: 'Grandfather' },
    ],
    vitals: [
      { date: '2024-01', bp: '145/92', hr: 82, weight: 78 },
      { date: '2024-03', bp: '140/88', hr: 78, weight: 77 },
      { date: '2024-05', bp: '135/85', hr: 75, weight: 76 },
      { date: '2024-07', bp: '130/82', hr: 72, weight: 75 },
      { date: '2024-09', bp: '125/80', hr: 70, weight: 74 },
      { date: '2024-11', bp: '120/78', hr: 68, weight: 73 },
    ],
    consultations: [
      { date: '2024-11-20', diagnosis: 'Controlled Hypertension', notes: 'BP well controlled. Continue current medication. Advised low salt diet.', prescription: [{ medicine: 'Amlodipine 5mg', dosage: '0+0+1', duration: '90 Days', instruction: 'After dinner' }] },
      { date: '2024-09-15', diagnosis: 'Hypertension Follow-up', notes: 'Slight improvement in BP. Weight loss appreciated. Continue same.', prescription: [] },
    ],
  },
  {
    id: 'p2',
    name: 'Fatima Begum',
    nameBn: 'ফাতিমা বেগম',
    age: 62,
    gender: 'Female',
    phone: '01823456789',
    bloodGroup: 'B+',
    profileImage: 'https://randomuser.me/api/portraits/women/45.jpg',
    lastVisit: '2024-11-18',
    totalVisits: 12,
    diagnosis: 'Ischemic Heart Disease',
    diagnosisBn: 'ইস্কেমিক হৃদরোগ',
    riskLevel: 'High',
    conditions: ['IHD', 'Diabetes Type 2', 'Hypertension'],
    medications: ['Metoprolol 50mg', 'Atorvastatin 20mg', 'Metformin 500mg'],
    allergies: [],
    familyHistory: [{ condition: 'Heart Attack', relation: 'Brother' }],
    vitals: [
      { date: '2024-05', bp: '150/95', hr: 88, weight: 68 },
      { date: '2024-08', bp: '140/88', hr: 82, weight: 67 },
      { date: '2024-11', bp: '135/85', hr: 78, weight: 66 },
    ],
    consultations: [
      { date: '2024-11-18', diagnosis: 'Stable IHD', notes: 'No chest pain. ECG normal. Continue medications.', prescription: [] },
    ],
  },
  {
    id: 'p3',
    name: 'Karim Ahmed',
    nameBn: 'করিম আহমেদ',
    age: 35,
    gender: 'Male',
    phone: '01934567890',
    bloodGroup: 'O+',
    profileImage: 'https://randomuser.me/api/portraits/men/52.jpg',
    lastVisit: '2024-11-25',
    totalVisits: 3,
    diagnosis: 'Arrhythmia',
    diagnosisBn: 'অনিয়মিত হৃদস্পন্দন',
    riskLevel: 'Medium',
    conditions: ['Arrhythmia'],
    medications: ['Propranolol 20mg'],
    allergies: ['Sulfa drugs'],
    familyHistory: [],
    vitals: [
      { date: '2024-10', bp: '125/80', hr: 95, weight: 70 },
      { date: '2024-11', bp: '122/78', hr: 85, weight: 70 },
    ],
    consultations: [
      { date: '2024-11-25', diagnosis: 'Improved Arrhythmia', notes: 'Palpitations reduced. Continue medication.', prescription: [] },
    ],
  },
];

const TODAY_APPOINTMENTS: TodayAppointment[] = [
  { id: 'a1', patientId: 'p1', patientName: 'রহিম উদ্দিন', patientImage: 'https://randomuser.me/api/portraits/men/32.jpg', time: '10:00 AM', serial: 1, type: 'Follow-up', status: 'Completed', chiefComplaint: 'BP checkup' },
  { id: 'a2', patientId: 'p2', patientName: 'ফাতিমা বেগম', patientImage: 'https://randomuser.me/api/portraits/women/45.jpg', time: '10:15 AM', serial: 2, type: 'Follow-up', status: 'In-Progress', chiefComplaint: 'Chest discomfort' },
  { id: 'a3', patientId: 'p3', patientName: 'করিম আহমেদ', patientImage: 'https://randomuser.me/api/portraits/men/52.jpg', time: '10:30 AM', serial: 3, type: 'Report', status: 'Waiting', chiefComplaint: 'ECG result' },
  { id: 'a4', patientId: 'p4', patientName: 'সুলতানা রাজিয়া', patientImage: 'https://randomuser.me/api/portraits/women/33.jpg', time: '10:45 AM', serial: 4, type: 'New', status: 'Waiting', chiefComplaint: 'Chest pain' },
  { id: 'a5', patientId: 'p5', patientName: 'মোহাম্মদ আলী', patientImage: 'https://randomuser.me/api/portraits/men/67.jpg', time: '11:00 AM', serial: 5, type: 'Follow-up', status: 'Waiting' },
];

const MONTHLY_DATA = [
  { month: 'Jun', patients: 120, revenue: 180000 },
  { month: 'Jul', patients: 135, revenue: 202500 },
  { month: 'Aug', patients: 128, revenue: 192000 },
  { month: 'Sep', patients: 145, revenue: 217500 },
  { month: 'Oct', patients: 152, revenue: 228000 },
  { month: 'Nov', patients: 156, revenue: 234000 },
];

const DIAGNOSIS_DATA = [
  { name: 'Hypertension', value: 35, color: '#ef4444' },
  { name: 'IHD', value: 25, color: '#f59e0b' },
  { name: 'Arrhythmia', value: 20, color: '#8b5cf6' },
  { name: 'Heart Failure', value: 12, color: '#3b82f6' },
  { name: 'Others', value: 8, color: '#94a3b8' },
];

// ============ COMPONENTS ============
interface DoctorDashboardProps {
  onLogout: () => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  
  // State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'patients' | 'today' | 'consult' | 'analytics'>('dashboard');
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [patientAIChat, setPatientAIChat] = useState<ChatMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [prescription, setPrescription] = useState<PrescriptionItem[]>([]);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [todayAppointments, setTodayAppointments] = useState(TODAY_APPOINTMENTS);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [patientAIChat]);

  // Build AI context for patient
  const buildPatientContext = (patient: PatientRecord) => `
Patient: ${patient.name}, ${patient.age} years, ${patient.gender}
Blood Group: ${patient.bloodGroup}
Risk Level: ${patient.riskLevel}
Current Conditions: ${patient.conditions.join(', ')}
Current Medications: ${patient.medications.join(', ')}
Allergies: ${patient.allergies.join(', ') || 'None'}
Family History: ${patient.familyHistory.map(h => `${h.relation}: ${h.condition}`).join(', ') || 'None'}
Total Visits: ${patient.totalVisits}
Latest Vitals: BP ${patient.vitals[patient.vitals.length - 1]?.bp}, HR ${patient.vitals[patient.vitals.length - 1]?.hr}
Recent Consultations: ${patient.consultations.slice(0, 3).map(c => `${c.date}: ${c.diagnosis}`).join('; ')}

Instructions: You are assisting Dr. ${DOCTOR_PROFILE.name}, a ${DOCTOR_PROFILE.specialty} specialist. 
Provide clinical insights, pattern analysis, and treatment suggestions based on patient history.
Consider family history for hereditary patterns. Be concise and professional.
`;

  const handlePatientAIChat = async () => {
    if (!aiInput.trim() || !selectedPatient) return;
    
    const userMsg: ChatMessage = { role: 'user', text: aiInput, timestamp: Date.now() };
    setPatientAIChat(prev => [...prev, userMsg]);
    setAiInput('');
    setIsAiThinking(true);

    try {
      const context = buildPatientContext(selectedPatient);
      const response = await chatWithDoctorAssistant(`${context}\n\nDoctor's Query: "${aiInput}"`, patientAIChat.map(m => m.text));
      setPatientAIChat(prev => [...prev, { role: 'model', text: response, timestamp: Date.now() }]);
    } catch {
      setPatientAIChat(prev => [...prev, { role: 'model', text: 'Sorry, there was an error. Please try again.', timestamp: Date.now() }]);
    }
    setIsAiThinking(false);
  };

  const openPatientProfile = (patient: PatientRecord) => {
    setSelectedPatient(patient);
    setPatientAIChat([{
      role: 'model',
      text: `📋 **Patient Summary: ${patient.name}**

**Risk Level:** ${patient.riskLevel === 'High' ? '🔴 High' : patient.riskLevel === 'Medium' ? '🟡 Medium' : '🟢 Low'}

**Current Status:**
${patient.conditions.map(c => `• ${c}`).join('\n')}

**Key Observations:**
• ${patient.totalVisits} visits total, last on ${patient.lastVisit}
• BP trend: ${patient.vitals.length > 1 ? 'Improving ↓' : 'Stable'}
${patient.familyHistory.length > 0 ? `• Family history of ${patient.familyHistory.map(h => h.condition).join(', ')}` : ''}
${patient.allergies.length > 0 ? `• ⚠️ Allergic to: ${patient.allergies.join(', ')}` : ''}

How can I help you with this patient, Doctor?`,
      timestamp: Date.now(),
    }]);
    setPrescription([]);
    setClinicalNotes('');
    setDiagnosis('');
    setActiveTab('consult');
  };

  const addMedicine = () => {
    setPrescription(prev => [...prev, { medicine: '', dosage: '', duration: '', instruction: '' }]);
  };

  const updateMedicine = (index: number, field: keyof PrescriptionItem, value: string) => {
    setPrescription(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const removeMedicine = (index: number) => {
    setPrescription(prev => prev.filter((_, i) => i !== index));
  };

  const sendPrescription = () => {
    if (!selectedPatient) return;
    // In real app, this would save to database and send to patient
    alert(`Prescription sent to ${selectedPatient.name}!\n\nDiagnosis: ${diagnosis}\n\nMedicines:\n${prescription.map(p => `• ${p.medicine} - ${p.dosage}`).join('\n')}`);
    setShowPrescriptionModal(false);
    
    // Update appointment status
    setTodayAppointments(prev => prev.map(a => 
      a.patientId === selectedPatient.id ? { ...a, status: 'Completed' as const } : a
    ));
  };

  const startConsultation = (appointment: TodayAppointment) => {
    const patient = PATIENTS.find(p => p.id === appointment.patientId);
    if (patient) {
      setTodayAppointments(prev => prev.map(a => 
        a.id === appointment.id ? { ...a, status: 'In-Progress' as const } : a
      ));
      openPatientProfile(patient);
    }
  };

  // ============ RENDER DASHBOARD ============
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Welcome back, {DOCTOR_PROFILE.nameBn}</h1>
          <p className="text-slate-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setActiveTab('today')} className="px-4 py-2 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition flex items-center gap-2">
            <i className="fas fa-calendar-check"></i>
            <span className="hidden sm:inline">Today's Queue</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">{todayAppointments.filter(a => a.status === 'Waiting').length}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Patients', value: DOCTOR_STATS.totalPatients.toLocaleString(), icon: 'fa-users', color: 'from-blue-500 to-blue-600', change: '+12 this week' },
          { label: 'Consultations', value: DOCTOR_STATS.totalConsultations.toLocaleString(), icon: 'fa-stethoscope', color: 'from-teal-500 to-emerald-600', change: '+156 this month' },
          { label: 'This Month', value: DOCTOR_STATS.thisMonthPatients, icon: 'fa-calendar', color: 'from-purple-500 to-violet-600', change: '↑ 8% vs last' },
          { label: 'Rating', value: DOCTOR_STATS.avgRating, icon: 'fa-star', color: 'from-amber-500 to-orange-600', change: '245 reviews' },
        ].map((stat, i) => (
          <div key={i} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-5 text-white shadow-lg`}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <i className={`fas ${stat.icon}`}></i>
              </div>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">{stat.change}</span>
            </div>
            <p className="text-3xl font-bold">{stat.value}</p>
            <p className="text-sm text-white/80">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <i className="fas fa-chart-line text-teal-500"></i> Monthly Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MONTHLY_DATA}>
                <defs>
                  <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="patients" stroke="#14b8a6" strokeWidth={2} fill="url(#colorPatients)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Diagnosis Distribution */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <i className="fas fa-chart-pie text-purple-500"></i> Diagnoses
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={DIAGNOSIS_DATA} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={2}>
                  {DIAGNOSIS_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {DIAGNOSIS_DATA.slice(0, 4).map((d, i) => (
              <span key={i} className="text-xs flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></span>
                {d.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Today's Queue Preview */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <i className="fas fa-clipboard-list text-blue-500"></i> Today's Appointments
          </h3>
          <button onClick={() => setActiveTab('today')} className="text-sm text-teal-600 font-medium hover:underline">View All →</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {todayAppointments.slice(0, 6).map((apt) => (
            <div key={apt.id} className={`p-3 rounded-xl border ${apt.status === 'In-Progress' ? 'border-teal-200 bg-teal-50' : apt.status === 'Completed' ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white'} flex items-center gap-3`}>
              <img src={apt.patientImage} alt="" className="w-10 h-10 rounded-lg" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 text-sm truncate">{apt.patientName}</p>
                <p className="text-xs text-slate-500">{apt.time} • #{apt.serial}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                apt.status === 'In-Progress' ? 'bg-teal-100 text-teal-700' :
                apt.status === 'Completed' ? 'bg-slate-200 text-slate-600' :
                apt.status === 'Waiting' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {apt.status === 'In-Progress' ? '🔵' : apt.status === 'Completed' ? '✓' : apt.status === 'Waiting' ? '⏳' : '✗'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* High Risk Patients */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-5 border border-red-100">
        <h3 className="font-bold text-red-800 mb-4 flex items-center gap-2">
          <i className="fas fa-exclamation-triangle text-red-500"></i> High Risk Patients Requiring Attention
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PATIENTS.filter(p => p.riskLevel === 'High').map((p) => (
            <button key={p.id} onClick={() => openPatientProfile(p)} className="bg-white p-4 rounded-xl border border-red-100 flex items-center gap-4 hover:shadow-md transition text-left">
              <img src={p.profileImage} alt="" className="w-12 h-12 rounded-xl" />
              <div className="flex-1">
                <p className="font-bold text-slate-800">{p.nameBn}</p>
                <p className="text-sm text-slate-500">{p.diagnosisBn}</p>
                <p className="text-xs text-red-600 mt-1">Last visit: {p.lastVisit}</p>
              </div>
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">High Risk</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ============ RENDER TODAY'S QUEUE ============
  const renderTodayQueue = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Today's Queue</h2>
        <div className="flex gap-2">
          {['All', 'Waiting', 'In-Progress', 'Completed'].map((f) => (
            <button key={f} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${f === 'All' ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Serial</th>
              <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Patient</th>
              <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Time</th>
              <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Type</th>
              <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Chief Complaint</th>
              <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
              <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {todayAppointments.map((apt) => (
              <tr key={apt.id} className={apt.status === 'In-Progress' ? 'bg-teal-50' : ''}>
                <td className="p-4"><span className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-700">{apt.serial}</span></td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <img src={apt.patientImage} alt="" className="w-10 h-10 rounded-lg" />
                    <span className="font-medium text-slate-800">{apt.patientName}</span>
                  </div>
                </td>
                <td className="p-4 text-slate-600">{apt.time}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    apt.type === 'New' ? 'bg-blue-100 text-blue-700' :
                    apt.type === 'Follow-up' ? 'bg-purple-100 text-purple-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>{apt.type}</span>
                </td>
                <td className="p-4 text-slate-600 text-sm">{apt.chiefComplaint || '-'}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    apt.status === 'In-Progress' ? 'bg-teal-100 text-teal-700' :
                    apt.status === 'Completed' ? 'bg-green-100 text-green-700' :
                    apt.status === 'Waiting' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>{apt.status}</span>
                </td>
                <td className="p-4">
                  {apt.status === 'Waiting' && (
                    <button onClick={() => startConsultation(apt)} className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition">
                      Start Consult
                    </button>
                  )}
                  {apt.status === 'In-Progress' && (
                    <button onClick={() => { const p = PATIENTS.find(p => p.id === apt.patientId); if (p) openPatientProfile(p); }} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition">
                      Continue
                    </button>
                  )}
                  {apt.status === 'Completed' && (
                    <span className="text-green-600 text-sm">✓ Done</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============ RENDER PATIENTS LIST ============
  const renderPatients = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">All Patients</h2>
        <div className="flex gap-2">
          <input type="text" placeholder="Search patients..." className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PATIENTS.map((p) => (
          <button key={p.id} onClick={() => openPatientProfile(p)} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-left hover:shadow-md transition">
            <div className="flex items-center gap-3 mb-3">
              <img src={p.profileImage} alt="" className="w-12 h-12 rounded-xl" />
              <div className="flex-1">
                <h3 className="font-bold text-slate-800">{p.nameBn}</h3>
                <p className="text-sm text-slate-500">{p.age} yrs • {p.gender} • {p.bloodGroup}</p>
              </div>
              <span className={`w-3 h-3 rounded-full ${p.riskLevel === 'High' ? 'bg-red-500' : p.riskLevel === 'Medium' ? 'bg-amber-500' : 'bg-green-500'}`}></span>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 mb-3">
              <p className="text-sm text-slate-700"><strong>Diagnosis:</strong> {p.diagnosisBn}</p>
              <p className="text-xs text-slate-500 mt-1">Last visit: {p.lastVisit} • {p.totalVisits} total visits</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {p.conditions.slice(0, 2).map((c, i) => (
                <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{c}</span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ============ RENDER CONSULTATION ============
  const renderConsultation = () => {
    if (!selectedPatient) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <i className="fas fa-user-md text-6xl text-slate-200 mb-4"></i>
            <p className="text-slate-500">Select a patient from Today's Queue or Patients list to start consultation</p>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
        {/* Patient Info & AI */}
        <div className="lg:col-span-2 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Patient Header */}
          <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src={selectedPatient.profileImage} alt="" className="w-14 h-14 rounded-xl" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-lg text-slate-800">{selectedPatient.nameBn}</h2>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      selectedPatient.riskLevel === 'High' ? 'bg-red-100 text-red-700' :
                      selectedPatient.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>{selectedPatient.riskLevel} Risk</span>
                  </div>
                  <p className="text-sm text-slate-500">{selectedPatient.age} yrs • {selectedPatient.gender} • {selectedPatient.bloodGroup} • {selectedPatient.phone}</p>
                </div>
              </div>
              <button onClick={() => setShowPrescriptionModal(true)} className="px-4 py-2 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition flex items-center gap-2">
                <i className="fas fa-prescription"></i> Write Prescription
              </button>
            </div>

            {/* Quick Info Pills */}
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedPatient.conditions.map((c, i) => <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">{c}</span>)}
              {selectedPatient.allergies.map((a, i) => <span key={i} className="px-2 py-1 bg-red-50 text-red-700 rounded-full text-xs">⚠️ {a}</span>)}
            </div>
          </div>

          {/* AI Chat */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {patientAIChat.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-sm ${
                  msg.role === 'user' ? 'bg-slate-800 text-white rounded-tr-md' : 'bg-white text-slate-800 rounded-tl-md border border-slate-200 shadow-sm'
                }`}>
                  {msg.role === 'model' && <div className="text-xs text-teal-600 font-bold mb-2 flex items-center gap-1"><i className="fas fa-robot"></i> Nirnoy Copilot</div>}
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
            {isAiThinking && (
              <div className="flex justify-start">
                <div className="bg-white p-4 rounded-2xl rounded-tl-md border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <i className="fas fa-circle-notch fa-spin"></i>
                    <span className="text-sm">Analyzing patient data...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatRef} />
          </div>

          {/* AI Input */}
          <div className="p-4 border-t border-slate-100 bg-white">
            <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
              {['Summarize history', 'Treatment options', 'Drug interactions', 'Family risk analysis', 'Prognosis'].map((q, i) => (
                <button key={i} onClick={() => setAiInput(q)} className="px-3 py-1.5 bg-slate-100 hover:bg-teal-50 rounded-lg text-xs font-medium whitespace-nowrap">{q}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handlePatientAIChat()}
                placeholder="Ask AI about this patient..."
                className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
              <button onClick={handlePatientAIChat} disabled={isAiThinking} className="px-5 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition disabled:opacity-50">
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Vitals & History */}
        <div className="space-y-4 overflow-y-auto">
          {/* Vitals Chart */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-3 text-sm">BP Trend</h3>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selectedPatient.vitals}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[60, 160]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="hr" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Family History */}
          {selectedPatient.familyHistory.length > 0 && (
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
              <h3 className="font-bold text-purple-800 mb-2 text-sm flex items-center gap-2">
                <i className="fas fa-users"></i> Family History
              </h3>
              <div className="space-y-1">
                {selectedPatient.familyHistory.map((h, i) => (
                  <p key={i} className="text-sm text-purple-700">• {h.relation}: {h.condition}</p>
                ))}
              </div>
            </div>
          )}

          {/* Recent Consultations */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-3 text-sm">Recent Consultations</h3>
            <div className="space-y-3">
              {selectedPatient.consultations.map((c, i) => (
                <div key={i} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-slate-800 text-sm">{c.diagnosis}</span>
                    <span className="text-xs text-slate-500">{c.date}</span>
                  </div>
                  <p className="text-xs text-slate-600">{c.notes}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Current Medications */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <h3 className="font-bold text-blue-800 mb-2 text-sm flex items-center gap-2">
              <i className="fas fa-pills"></i> Current Medications
            </h3>
            <div className="space-y-1">
              {selectedPatient.medications.map((m, i) => (
                <p key={i} className="text-sm text-blue-700">• {m}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============ PRESCRIPTION MODAL ============
  const renderPrescriptionModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-500 to-emerald-500 text-white">
          <h2 className="font-bold text-lg">Write Prescription</h2>
          <button onClick={() => setShowPrescriptionModal(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition flex items-center justify-center">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Patient Info */}
          <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
            <img src={selectedPatient?.profileImage} alt="" className="w-10 h-10 rounded-lg" />
            <div>
              <p className="font-bold text-slate-800">{selectedPatient?.nameBn}</p>
              <p className="text-xs text-slate-500">{selectedPatient?.age} yrs • {selectedPatient?.bloodGroup}</p>
            </div>
          </div>

          {/* Diagnosis */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Diagnosis</label>
            <input 
              type="text" 
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Enter diagnosis..."
              className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          {/* Clinical Notes */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Clinical Notes</label>
            <textarea 
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Enter clinical observations..."
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none resize-none"
            />
          </div>

          {/* Medicines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-slate-700">Medicines</label>
              <button onClick={addMedicine} className="text-sm text-teal-600 font-medium hover:underline">+ Add Medicine</button>
            </div>
            
            <div className="space-y-3">
              {prescription.map((p, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-3 relative">
                  <button onClick={() => removeMedicine(i)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500">
                    <i className="fas fa-times"></i>
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Medicine name" value={p.medicine} onChange={(e) => updateMedicine(i, 'medicine', e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    <input type="text" placeholder="Dosage (e.g. 1+0+1)" value={p.dosage} onChange={(e) => updateMedicine(i, 'dosage', e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    <input type="text" placeholder="Duration" value={p.duration} onChange={(e) => updateMedicine(i, 'duration', e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    <input type="text" placeholder="Instructions" value={p.instruction} onChange={(e) => updateMedicine(i, 'instruction', e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              ))}
              
              {prescription.length === 0 && (
                <p className="text-center text-slate-400 py-4">Click "Add Medicine" to add prescription</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex gap-3">
          <button onClick={() => setShowPrescriptionModal(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition">Cancel</button>
          <button onClick={sendPrescription} disabled={!diagnosis.trim()} className="flex-1 py-2.5 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
            <i className="fas fa-paper-plane"></i> Send to Patient
          </button>
        </div>
      </div>
    </div>
  );

  // ============ SIDEBAR ITEMS ============
  const sidebarItems = [
    { id: 'dashboard', icon: 'fa-th-large', label: 'Dashboard' },
    { id: 'today', icon: 'fa-calendar-check', label: "Today's Queue", badge: todayAppointments.filter(a => a.status === 'Waiting').length },
    { id: 'patients', icon: 'fa-users', label: 'All Patients' },
    { id: 'consult', icon: 'fa-stethoscope', label: 'Consultation' },
    { id: 'analytics', icon: 'fa-chart-bar', label: 'Analytics' },
  ];

  // ============ MAIN LAYOUT ============
  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <div className="hidden lg:flex w-64 bg-slate-900 flex-col h-screen sticky top-0">
        {/* Doctor Profile */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <img src={DOCTOR_PROFILE.image} alt="" className="w-12 h-12 rounded-xl border-2 border-teal-500" />
            <div>
              <h3 className="font-bold text-white text-sm">{DOCTOR_PROFILE.nameBn}</h3>
              <p className="text-xs text-slate-400">{DOCTOR_PROFILE.specialtyBn}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${
                activeTab === item.id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <i className={`fas ${item.icon} w-5 text-center ${activeTab === item.id ? 'text-teal-400' : ''}`}></i>
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              {item.badge ? <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{item.badge}</span> : null}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-800">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-red-400 transition">
            <i className="fas fa-sign-out-alt"></i>
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-slate-800 capitalize">{activeTab === 'today' ? "Today's Queue" : activeTab}</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-400 hover:text-slate-600">
              <i className="fas fa-bell text-lg"></i>
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <img src={DOCTOR_PROFILE.image} alt="" className="w-9 h-9 rounded-lg" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'today' && renderTodayQueue()}
          {activeTab === 'patients' && renderPatients()}
          {activeTab === 'consult' && renderConsultation()}
          {activeTab === 'analytics' && renderDashboard()}
        </div>
      </div>

      {/* Prescription Modal */}
      {showPrescriptionModal && selectedPatient && renderPrescriptionModal()}

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-50">
        <div className="flex">
          {sidebarItems.slice(0, 4).map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex-1 py-3 flex flex-col items-center gap-1 ${activeTab === item.id ? 'text-teal-400' : 'text-slate-500'}`}
            >
              <i className={`fas ${item.icon}`}></i>
              <span className="text-[10px]">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
