import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatWithHealthAssistant } from '../services/geminiService';
import { ChatMessage, VisitRecord, PrescriptionItem } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell } from 'recharts';

// ============ TYPES ============
interface HealthProfile {
  id: string;
  name: string;
  nameBn: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  bloodGroup: string;
  height: number; // cm
  weight: number; // kg
  profileImage: string;
  emergencyContact: { name: string; relation: string; phone: string };
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  insuranceInfo?: { provider: string; policyNo: string };
  joinedDate: string;
}

interface VitalRecord {
  date: string;
  bpSystolic: number;
  bpDiastolic: number;
  heartRate: number;
  weight: number;
  bloodSugar?: number;
  temperature?: number;
}

interface ConsultationRecord {
  id: string;
  date: string;
  doctorId: string;
  doctorName: string;
  doctorImage: string;
  specialty: string;
  chamberName: string;
  diagnosis: string;
  notes: string;
  prescription: PrescriptionItem[];
  reports?: { name: string; url: string; type: string }[];
  followUpDate?: string;
}

interface HealthScore {
  overall: number;
  categories: {
    name: string;
    nameBn: string;
    score: number;
    icon: string;
    color: string;
  }[];
}

// ============ MOCK DATA ============
const PATIENT_PROFILE: HealthProfile = {
  id: 'P-98234',
  name: 'Rahim Uddin',
  nameBn: 'রহিম উদ্দিন',
  email: 'rahim.uddin@gmail.com',
  phone: '+880 1712-345678',
  dateOfBirth: '1993-05-15',
  gender: 'male',
  bloodGroup: 'A+',
  height: 175,
  weight: 72,
  profileImage: 'https://randomuser.me/api/portraits/men/32.jpg',
  emergencyContact: { name: 'Karim Uddin', relation: 'Brother', phone: '+880 1812-345678' },
  allergies: ['Penicillin', 'Dust'],
  chronicConditions: ['Mild Hypertension'],
  currentMedications: ['Amlodipine 5mg'],
  insuranceInfo: { provider: 'Green Delta Insurance', policyNo: 'GD-2023-78543' },
  joinedDate: '2022-03-15',
};

const VITALS_HISTORY: VitalRecord[] = [
  { date: '2024-01', bpSystolic: 135, bpDiastolic: 88, heartRate: 78, weight: 75, bloodSugar: 110 },
  { date: '2024-03', bpSystolic: 130, bpDiastolic: 85, heartRate: 75, weight: 74, bloodSugar: 105 },
  { date: '2024-05', bpSystolic: 125, bpDiastolic: 82, heartRate: 72, weight: 73, bloodSugar: 100 },
  { date: '2024-07', bpSystolic: 122, bpDiastolic: 80, heartRate: 70, weight: 72.5, bloodSugar: 98 },
  { date: '2024-09', bpSystolic: 120, bpDiastolic: 78, heartRate: 68, weight: 72, bloodSugar: 95 },
  { date: '2024-11', bpSystolic: 118, bpDiastolic: 76, heartRate: 70, weight: 72, bloodSugar: 92 },
];

const CONSULTATIONS: ConsultationRecord[] = [
  {
    id: 'c1',
    date: '2024-11-20',
    doctorId: 'd1',
    doctorName: 'Dr. Abul Kashem',
    doctorImage: 'https://randomuser.me/api/portraits/men/85.jpg',
    specialty: 'Cardiology',
    chamberName: 'Square Hospital',
    diagnosis: 'Controlled Hypertension',
    notes: 'Blood pressure well controlled with current medication. Continue Amlodipine 5mg. Reduce salt intake further. Regular exercise advised.',
    prescription: [
      { medicine: 'Amlodipine 5mg', dosage: '0+0+1', duration: '90 Days', instruction: 'After dinner' },
      { medicine: 'Aspirin 75mg', dosage: '0+1+0', duration: '90 Days', instruction: 'After lunch' },
    ],
    followUpDate: '2025-02-20',
  },
  {
    id: 'c2',
    date: '2024-09-15',
    doctorId: 'd2',
    doctorName: 'Dr. Sarah Rahman',
    doctorImage: 'https://randomuser.me/api/portraits/women/65.jpg',
    specialty: 'Dermatology',
    chamberName: 'United Hospital',
    diagnosis: 'Contact Dermatitis',
    notes: 'Mild skin reaction due to new detergent. Recommended hypoallergenic products. Topical cream for 2 weeks.',
    prescription: [
      { medicine: 'Betnovate-N Cream', dosage: 'Apply 2x daily', duration: '14 Days', instruction: 'On affected area' },
      { medicine: 'Fexo 120mg', dosage: '0+0+1', duration: '7 Days', instruction: 'At night' },
    ],
  },
  {
    id: 'c3',
    date: '2024-06-10',
    doctorId: 'd3',
    doctorName: 'Dr. Mohammad Ali',
    doctorImage: 'https://randomuser.me/api/portraits/men/45.jpg',
    specialty: 'General Medicine',
    chamberName: 'Labaid Hospital',
    diagnosis: 'Seasonal Flu',
    notes: 'Viral infection with mild fever. Advised rest and fluids. No antibiotics needed.',
    prescription: [
      { medicine: 'Napa Extra', dosage: '1+1+1', duration: '5 Days', instruction: 'After meal' },
      { medicine: 'Orsaline-N', dosage: 'As needed', duration: '5 Days', instruction: 'For hydration' },
    ],
  },
];

const HEALTH_SCORE: HealthScore = {
  overall: 82,
  categories: [
    { name: 'Heart Health', nameBn: 'হৃদযন্ত্র', score: 78, icon: 'fa-heart', color: '#ef4444' },
    { name: 'Weight', nameBn: 'ওজন', score: 85, icon: 'fa-weight', color: '#10b981' },
    { name: 'Blood Sugar', nameBn: 'রক্তে শর্করা', score: 88, icon: 'fa-tint', color: '#6366f1' },
    { name: 'Activity', nameBn: 'কার্যকলাপ', score: 72, icon: 'fa-running', color: '#f59e0b' },
    { name: 'Sleep', nameBn: 'ঘুম', score: 80, icon: 'fa-moon', color: '#8b5cf6' },
    { name: 'Mental Health', nameBn: 'মানসিক স্বাস্থ্য', score: 85, icon: 'fa-brain', color: '#14b8a6' },
  ],
};

const RADAR_DATA = HEALTH_SCORE.categories.map(c => ({
  subject: c.name,
  score: c.score,
  fullMark: 100,
}));

// ============ COMPONENT ============
export const PatientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';
  
  // State
  const [activeTab, setActiveTab] = useState<'overview' | 'doctors' | 'reports' | 'chat' | 'profile'>('overview');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      role: 'model', 
      text: isBn 
        ? 'আসসালামু আলাইকুম রহিম ভাই! আমি আপনার ব্যক্তিগত স্বাস্থ্য সহকারী নির্ণয়। আপনার রক্তচাপ গত ৬ মাসে অনেক ভালো হয়েছে! আজ কিভাবে সাহায্য করতে পারি?'
        : 'Hello Rahim! I\'m Nirnoy, your personal health assistant. Great news - your blood pressure has improved significantly over the last 6 months! How can I help you today?',
      timestamp: Date.now() 
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [expandedConsultation, setExpandedConsultation] = useState<string | null>(null);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Translations
  const t = {
    healthNotebook: isBn ? 'স্বাস্থ্য নোটবুক' : 'Health Notebook',
    overview: isBn ? 'সারসংক্ষেপ' : 'Overview',
    myDoctors: isBn ? 'আমার ডাক্তারগণ' : 'My Doctors',
    reports: isBn ? 'রিপোর্ট' : 'Reports',
    aiAssistant: isBn ? 'এআই সহকারী' : 'AI Assistant',
    profile: isBn ? 'প্রোফাইল' : 'Profile',
    healthScore: isBn ? 'স্বাস্থ্য স্কোর' : 'Health Score',
    aiInsights: isBn ? 'এআই বিশ্লেষণ' : 'AI Insights',
    positivetrends: isBn ? 'ইতিবাচক প্রবণতা' : 'Positive Trends',
    areasToWatch: isBn ? 'সতর্ক থাকুন' : 'Areas to Watch',
    vitalTrends: isBn ? 'ভাইটাল ট্রেন্ড' : 'Vital Trends',
    bloodPressure: isBn ? 'রক্তচাপ' : 'Blood Pressure',
    weight: isBn ? 'ওজন' : 'Weight',
    heartRate: isBn ? 'হার্ট রেট' : 'Heart Rate',
    bloodSugar: isBn ? 'ব্লাড সুগার' : 'Blood Sugar',
    recentConsultations: isBn ? 'সাম্প্রতিক পরামর্শ' : 'Recent Consultations',
    viewAll: isBn ? 'সব দেখুন' : 'View All',
    bookNew: isBn ? 'নতুন বুক করুন' : 'Book New',
    consultationHistory: isBn ? 'পরামর্শের ইতিহাস' : 'Consultation History',
    diagnosis: isBn ? 'রোগ নির্ণয়' : 'Diagnosis',
    prescription: isBn ? 'প্রেসক্রিপশন' : 'Prescription',
    clinicalNotes: isBn ? 'ক্লিনিক্যাল নোট' : 'Clinical Notes',
    followUp: isBn ? 'ফলো-আপ' : 'Follow-up',
    downloadReport: isBn ? 'রিপোর্ট ডাউনলোড' : 'Download Report',
    explainWithAI: isBn ? 'এআই দিয়ে বুঝুন' : 'Explain with AI',
    askAnything: isBn ? 'যেকোনো প্রশ্ন করুন...' : 'Ask me anything about your health...',
    analyzing: isBn ? 'বিশ্লেষণ করছি...' : 'Analyzing...',
    personalInfo: isBn ? 'ব্যক্তিগত তথ্য' : 'Personal Information',
    healthInfo: isBn ? 'স্বাস্থ্য তথ্য' : 'Health Information',
    emergency: isBn ? 'জরুরি যোগাযোগ' : 'Emergency Contact',
    allergies: isBn ? 'এলার্জি' : 'Allergies',
    conditions: isBn ? 'দীর্ঘমেয়াদী রোগ' : 'Chronic Conditions',
    medications: isBn ? 'বর্তমান ওষুধ' : 'Current Medications',
    familyComingSoon: isBn ? 'শীঘ্রই আসছে: নির্ণয় ফ্যামিলি' : 'Coming Soon: Nirnoy Family',
    familyDesc: isBn ? 'পরিবারের সবাইকে যুক্ত করুন এবং সবার স্বাস্থ্য এক জায়গায় দেখুন' : 'Add your family members and manage everyone\'s health in one place',
    quickActions: isBn ? 'দ্রুত কার্যক্রম' : 'Quick Actions',
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg: ChatMessage = { role: 'user', text: chatInput, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    // Build patient context for AI
    const context = `
      Patient: ${PATIENT_PROFILE.name}, Age: ${new Date().getFullYear() - new Date(PATIENT_PROFILE.dateOfBirth).getFullYear()}, Gender: ${PATIENT_PROFILE.gender}
      Blood Group: ${PATIENT_PROFILE.bloodGroup}, Height: ${PATIENT_PROFILE.height}cm, Weight: ${PATIENT_PROFILE.weight}kg
      BMI: ${(PATIENT_PROFILE.weight / Math.pow(PATIENT_PROFILE.height / 100, 2)).toFixed(1)}
      Chronic Conditions: ${PATIENT_PROFILE.chronicConditions.join(', ')}
      Current Medications: ${PATIENT_PROFILE.currentMedications.join(', ')}
      Allergies: ${PATIENT_PROFILE.allergies.join(', ')}
      Latest Vitals: BP ${VITALS_HISTORY[VITALS_HISTORY.length - 1].bpSystolic}/${VITALS_HISTORY[VITALS_HISTORY.length - 1].bpDiastolic}, HR ${VITALS_HISTORY[VITALS_HISTORY.length - 1].heartRate}
      Recent Diagnoses: ${CONSULTATIONS.slice(0, 3).map(c => c.diagnosis).join(', ')}
      Health Score: ${HEALTH_SCORE.overall}/100
    `;

    try {
      const responseText = await chatWithHealthAssistant(userMsg.text, messages.map(m => m.text), context);
      const modelMsg: ChatMessage = { role: 'model', text: responseText, timestamp: Date.now() };
      setMessages(prev => [...prev, modelMsg]);
    } catch {
      const errorMsg: ChatMessage = { 
        role: 'model', 
        text: isBn ? 'দুঃখিত, একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।' : 'Sorry, there was an issue. Please try again.', 
        timestamp: Date.now() 
      };
      setMessages(prev => [...prev, errorMsg]);
    }
    setIsTyping(false);
  };

  // Calculate age
  const age = new Date().getFullYear() - new Date(PATIENT_PROFILE.dateOfBirth).getFullYear();
  const bmi = (PATIENT_PROFILE.weight / Math.pow(PATIENT_PROFILE.height / 100, 2)).toFixed(1);

  // ============ RENDER SECTIONS ============

  const renderHealthScoreCard = () => (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 flex flex-col lg:flex-row items-center gap-6">
        {/* Score Circle */}
        <div className="relative">
          <svg className="w-32 h-32 transform -rotate-90">
            <circle cx="64" cy="64" r="56" stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="none" />
            <circle 
              cx="64" cy="64" r="56" 
              stroke="url(#scoreGradient)" 
              strokeWidth="12" 
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${(HEALTH_SCORE.overall / 100) * 352} 352`}
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#14b8a6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold">{HEALTH_SCORE.overall}</span>
            <span className="text-xs text-slate-400">/100</span>
          </div>
        </div>

        {/* Category Scores */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {HEALTH_SCORE.categories.map((cat) => (
            <div key={cat.name} className="bg-white/5 backdrop-blur rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <i className={`fas ${cat.icon} text-xs`} style={{ color: cat.color }}></i>
                <span className="text-xs text-slate-300">{isBn ? cat.nameBn : cat.name}</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-xl font-bold">{cat.score}</span>
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${cat.score}%`, backgroundColor: cat.color }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAIInsights = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
        <h4 className="text-sm font-bold text-emerald-700 mb-3 flex items-center gap-2">
          <i className="fas fa-arrow-trend-up"></i> {t.positivetrends}
        </h4>
        <ul className="space-y-2 text-sm text-emerald-700">
          <li className="flex items-start gap-2">
            <i className="fas fa-check-circle mt-0.5 text-emerald-500"></i>
            {isBn ? 'রক্তচাপ গত ৬ মাসে 135/88 থেকে 118/76 এ নেমে এসেছে' : 'Blood pressure improved from 135/88 to 118/76 over 6 months'}
          </li>
          <li className="flex items-start gap-2">
            <i className="fas fa-check-circle mt-0.5 text-emerald-500"></i>
            {isBn ? 'ওজন স্থিতিশীল আছে (72 kg)' : 'Weight stable at 72 kg (healthy BMI)'}
          </li>
          <li className="flex items-start gap-2">
            <i className="fas fa-check-circle mt-0.5 text-emerald-500"></i>
            {isBn ? 'ব্লাড সুগার স্বাভাবিক পর্যায়ে (92 mg/dL)' : 'Blood sugar in normal range (92 mg/dL)'}
          </li>
        </ul>
      </div>
      
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
        <h4 className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-2">
          <i className="fas fa-exclamation-triangle"></i> {t.areasToWatch}
        </h4>
        <ul className="space-y-2 text-sm text-amber-700">
          <li className="flex items-start gap-2">
            <i className="fas fa-info-circle mt-0.5 text-amber-500"></i>
            {isBn ? 'ফলো-আপ অ্যাপয়েন্টমেন্ট (20 ফেব্রুয়ারি) মনে রাখুন' : 'Follow-up appointment scheduled for Feb 20'}
          </li>
          <li className="flex items-start gap-2">
            <i className="fas fa-info-circle mt-0.5 text-amber-500"></i>
            {isBn ? 'মৌসুমী এলার্জির সময় (মে মাস) সতর্ক থাকুন' : 'Seasonal allergy watch (May) - dermatitis history'}
          </li>
          <li className="flex items-start gap-2">
            <i className="fas fa-info-circle mt-0.5 text-amber-500"></i>
            {isBn ? 'দৈনিক হাঁটা বাড়ানো উচিত (Activity Score: 72)' : 'Daily walking needs improvement (Activity Score: 72)'}
          </li>
        </ul>
      </div>
    </div>
  );

  const renderVitalCharts = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
        <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <i className="fas fa-heartbeat text-red-500"></i> {t.bloodPressure}
        </h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={VITALS_HISTORY}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis domain={[60, 150]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Line type="monotone" dataKey="bpSystolic" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} name="Systolic" />
              <Line type="monotone" dataKey="bpDiastolic" stroke="#94a3b8" strokeWidth={2} dot={false} name="Diastolic" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-2 text-xs text-slate-500">
          <span><span className="inline-block w-3 h-0.5 bg-red-500 mr-1"></span> Systolic</span>
          <span><span className="inline-block w-3 h-0.5 bg-slate-400 mr-1"></span> Diastolic</span>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
        <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <i className="fas fa-weight text-purple-500"></i> {t.weight} & {t.heartRate}
        </h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={VITALS_HISTORY}>
              <defs>
                <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis yAxisId="left" domain={[65, 80]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" domain={[60, 90]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Area yAxisId="left" type="monotone" dataKey="weight" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorWeight)" strokeWidth={2} name="Weight (kg)" />
              <Line yAxisId="right" type="monotone" dataKey="heartRate" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} name="Heart Rate" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{isBn ? 'স্বাগতম, রহিম!' : 'Welcome, Rahim!'}</h1>
          <p className="text-slate-500 text-sm">{isBn ? 'আপনার স্বাস্থ্য সারাংশ দেখুন' : 'Here\'s your health summary'}</p>
        </div>
        <button 
          onClick={() => navigate('/search')} 
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold hover:bg-teal-700 transition flex items-center gap-2"
        >
          <i className="fas fa-calendar-plus"></i> {t.bookNew}
        </button>
      </div>

      {/* Health Score */}
      <div>
        <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">{t.healthScore}</h3>
        {renderHealthScoreCard()}
      </div>

      {/* AI Insights */}
      <div>
        <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
          <i className="fas fa-sparkles text-amber-500"></i> {t.aiInsights}
        </h3>
        {renderAIInsights()}
      </div>

      {/* Vital Trends */}
      <div>
        <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">{t.vitalTrends}</h3>
        {renderVitalCharts()}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t.bloodPressure, value: '118/76', unit: 'mmHg', icon: 'fa-heartbeat', color: 'text-red-500', bgColor: 'bg-red-50' },
          { label: t.weight, value: PATIENT_PROFILE.weight.toString(), unit: 'kg', icon: 'fa-weight', color: 'text-purple-500', bgColor: 'bg-purple-50' },
          { label: 'BMI', value: bmi, unit: '', icon: 'fa-calculator', color: 'text-teal-500', bgColor: 'bg-teal-50' },
          { label: t.bloodSugar, value: '92', unit: 'mg/dL', icon: 'fa-tint', color: 'text-blue-500', bgColor: 'bg-blue-50' },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bgColor} rounded-xl p-4 border border-slate-100`}>
            <div className="flex items-center gap-2 mb-2">
              <i className={`fas ${stat.icon} ${stat.color}`}></i>
              <span className="text-xs text-slate-500">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stat.value}<span className="text-sm font-normal text-slate-400 ml-1">{stat.unit}</span></p>
          </div>
        ))}
      </div>

      {/* Recent Consultations Preview */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-slate-500 uppercase">{t.recentConsultations}</h3>
          <button onClick={() => setActiveTab('doctors')} className="text-sm text-teal-600 font-bold hover:underline">{t.viewAll}</button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {CONSULTATIONS.slice(0, 2).map((c) => (
            <div key={c.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition">
              <img src={c.doctorImage} alt={c.doctorName} className="w-12 h-12 rounded-full object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800">{c.doctorName}</p>
                <p className="text-xs text-slate-500">{c.specialty} • {c.chamberName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-700">{c.diagnosis}</p>
                <p className="text-xs text-slate-400">{new Date(c.date).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coming Soon: Family */}
      <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 text-9xl">
          <i className="fas fa-users"></i>
        </div>
        <div className="relative z-10">
          <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-bold mb-3 inline-block">
            {isBn ? 'শীঘ্রই আসছে' : 'Coming Soon'}
          </span>
          <h3 className="text-xl font-bold mb-2">{isBn ? 'নির্ণয় ফ্যামিলি' : 'Nirnoy Family'}</h3>
          <p className="text-white/80 text-sm">{t.familyDesc}</p>
        </div>
      </div>
    </div>
  );

  const renderDoctors = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t.myDoctors}</h1>
          <p className="text-slate-500 text-sm">{isBn ? 'আপনার সকল পরামর্শের ইতিহাস' : 'Your complete consultation history'}</p>
        </div>
      </div>

      {/* Doctor Cards */}
      <div className="space-y-4">
        {CONSULTATIONS.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div 
              onClick={() => setExpandedConsultation(expandedConsultation === c.id ? null : c.id)}
              className="p-4 cursor-pointer hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-4">
                <img src={c.doctorImage} alt={c.doctorName} className="w-14 h-14 rounded-xl object-cover border-2 border-slate-100" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800">{c.doctorName}</h3>
                    {c.followUpDate && new Date(c.followUpDate) > new Date() && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                        {isBn ? 'ফলো-আপ' : 'Follow-up'}: {new Date(c.followUpDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{c.specialty}</p>
                  <p className="text-xs text-slate-400">{c.chamberName}</p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 text-sm font-medium rounded-full">{c.diagnosis}</span>
                  <p className="text-xs text-slate-400 mt-1">{new Date(c.date).toLocaleDateString()}</p>
                </div>
                <i className={`fas fa-chevron-down text-slate-400 transition-transform ${expandedConsultation === c.id ? 'rotate-180' : ''}`}></i>
              </div>
            </div>

            {expandedConsultation === c.id && (
              <div className="p-4 border-t border-slate-100 bg-slate-50 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Clinical Notes */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{t.clinicalNotes}</h4>
                    <p className="text-sm text-slate-700 bg-white p-3 rounded-lg border border-slate-200">{c.notes}</p>
                  </div>

                  {/* Prescription */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{t.prescription}</h4>
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 text-xs text-slate-500">
                          <tr>
                            <th className="p-2 text-left">{isBn ? 'ওষুধ' : 'Medicine'}</th>
                            <th className="p-2 text-left">{isBn ? 'ডোজ' : 'Dose'}</th>
                            <th className="p-2 text-left">{isBn ? 'মেয়াদ' : 'Duration'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {c.prescription.map((p, i) => (
                            <tr key={i}>
                              <td className="p-2 font-medium text-slate-700">{p.medicine}</td>
                              <td className="p-2 font-mono text-xs text-slate-600">{p.dosage}</td>
                              <td className="p-2 text-slate-500">{p.duration}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-200">
                  <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 border border-slate-300 bg-white rounded-lg hover:bg-slate-50 transition">
                    <i className="fas fa-file-download"></i> {t.downloadReport}
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setChatInput(isBn ? `${c.doctorName} এর ${c.diagnosis} রোগ নির্ণয়টি ব্যাখ্যা করুন` : `Explain my ${c.diagnosis} diagnosis from ${c.doctorName}`);
                      setActiveTab('chat');
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-purple-700 border border-purple-200 bg-purple-50 rounded-lg hover:bg-purple-100 transition"
                  >
                    <i className="fas fa-sparkles"></i> {t.explainWithAI}
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/doctors/${c.doctorId}`);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition"
                  >
                    <i className="fas fa-calendar-plus"></i> {isBn ? 'আবার বুক করুন' : 'Book Again'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t.reports}</h1>
        <p className="text-slate-500 text-sm">{isBn ? 'আপনার সকল মেডিকেল রিপোর্ট' : 'All your medical reports'}</p>
      </div>

      {/* Report Categories */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { name: isBn ? 'রক্ত পরীক্ষা' : 'Blood Tests', icon: 'fa-vial', count: 8, color: 'bg-red-50 text-red-600' },
          { name: isBn ? 'এক্স-রে/ইমেজিং' : 'X-Ray/Imaging', icon: 'fa-x-ray', count: 3, color: 'bg-blue-50 text-blue-600' },
          { name: isBn ? 'প্রেসক্রিপশন' : 'Prescriptions', icon: 'fa-prescription', count: 12, color: 'bg-green-50 text-green-600' },
          { name: isBn ? 'অন্যান্য' : 'Others', icon: 'fa-file-medical', count: 5, color: 'bg-purple-50 text-purple-600' },
        ].map((cat) => (
          <div key={cat.name} className={`${cat.color} rounded-xl p-4 cursor-pointer hover:shadow-md transition`}>
            <i className={`fas ${cat.icon} text-2xl mb-2`}></i>
            <p className="font-bold">{cat.name}</p>
            <p className="text-sm opacity-70">{cat.count} {isBn ? 'টি ফাইল' : 'files'}</p>
          </div>
        ))}
      </div>

      {/* Recent Reports List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-700">{isBn ? 'সাম্প্রতিক রিপোর্ট' : 'Recent Reports'}</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {[
            { name: 'Complete Blood Count (CBC)', date: '2024-11-15', type: 'Blood Test', status: 'Normal' },
            { name: 'Lipid Profile', date: '2024-11-15', type: 'Blood Test', status: 'Borderline' },
            { name: 'ECG Report', date: '2024-11-10', type: 'Cardiac', status: 'Normal' },
            { name: 'Chest X-Ray', date: '2024-09-20', type: 'Imaging', status: 'Normal' },
          ].map((report, i) => (
            <div key={i} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition cursor-pointer">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                <i className="fas fa-file-medical-alt"></i>
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-800">{report.name}</p>
                <p className="text-xs text-slate-500">{report.type} • {new Date(report.date).toLocaleDateString()}</p>
              </div>
              <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                report.status === 'Normal' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {report.status}
              </span>
              <button className="p-2 text-slate-400 hover:text-teal-600 transition">
                <i className="fas fa-download"></i>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Upload Button */}
      <button className="w-full p-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-teal-500 hover:text-teal-600 transition flex items-center justify-center gap-2">
        <i className="fas fa-cloud-upload-alt"></i>
        {isBn ? 'নতুন রিপোর্ট আপলোড করুন' : 'Upload New Report'}
      </button>
    </div>
  );

  const renderChat = () => (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden animate-fade-in">
      {/* Chat Header */}
      <div className="flex-shrink-0 p-4 border-b border-slate-100 bg-gradient-to-r from-teal-600 to-teal-500 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <i className="fas fa-robot"></i>
            </div>
            <div>
              <h3 className="font-bold">{isBn ? 'নির্ণয় হেলথ এআই' : 'Nirnoy Health AI'}</h3>
              <p className="text-xs text-white/80">{isBn ? 'আপনার ব্যক্তিগত স্বাস্থ্য সহকারী' : 'Your personal health assistant'}</p>
            </div>
          </div>
          <button 
            onClick={() => setMessages([{ role: 'model', text: isBn ? 'নতুন কথোপকথন শুরু! কিভাবে সাহায্য করতে পারি?' : 'New conversation started! How can I help?', timestamp: Date.now() }])}
            className="text-xs bg-white/20 px-3 py-1 rounded-full hover:bg-white/30 transition"
          >
            {isBn ? 'রিসেট' : 'Reset'}
          </button>
        </div>
      </div>

      {/* Quick Suggestions */}
      <div className="flex-shrink-0 p-3 border-b border-slate-100 bg-slate-50 overflow-x-auto">
        <div className="flex gap-2">
          {[
            isBn ? 'আমার রক্তচাপ কেমন?' : 'How is my blood pressure?',
            isBn ? 'ওষুধ সম্পর্কে জানতে চাই' : 'Tell me about my medications',
            isBn ? 'ওজন কমানোর টিপস' : 'Weight loss tips',
          ].map((suggestion) => (
            <button 
              key={suggestion}
              onClick={() => { setChatInput(suggestion); }}
              className="flex-shrink-0 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs text-slate-600 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 transition"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-teal-600 text-white rounded-tr-none' 
                : 'bg-slate-100 text-slate-800 rounded-tl-none'
            }`}>
              {msg.role === 'model' && (
                <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
                  <i className="fas fa-robot"></i>
                  <span>{isBn ? 'নির্ণয় এআই' : 'Nirnoy AI'}</span>
                </div>
              )}
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-none text-slate-500 text-sm flex items-center gap-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span>{t.analyzing}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-slate-100 bg-white">
        <div className="flex gap-3">
          <input 
            type="text" 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={t.askAnything}
            className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
          />
          <button 
            onClick={handleSendMessage}
            disabled={isTyping || !chatInput.trim()}
            className="px-5 bg-teal-600 rounded-xl text-white hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-2xl p-6 text-white">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            <img 
              src={PATIENT_PROFILE.profileImage} 
              alt={PATIENT_PROFILE.name} 
              className="w-24 h-24 rounded-full object-cover border-4 border-white/30"
            />
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full text-teal-600 shadow-lg flex items-center justify-center">
              <i className="fas fa-camera text-xs"></i>
            </button>
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold">{isBn ? PATIENT_PROFILE.nameBn : PATIENT_PROFILE.name}</h1>
            <p className="text-white/80">ID: {PATIENT_PROFILE.id}</p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
              <span className="px-2 py-1 bg-white/20 rounded-full text-xs">{PATIENT_PROFILE.bloodGroup}</span>
              <span className="px-2 py-1 bg-white/20 rounded-full text-xs">{age} {isBn ? 'বছর' : 'years'}</span>
              <span className="px-2 py-1 bg-white/20 rounded-full text-xs">{PATIENT_PROFILE.gender === 'male' ? (isBn ? 'পুরুষ' : 'Male') : (isBn ? 'মহিলা' : 'Female')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <i className="fas fa-user text-teal-500"></i> {t.personalInfo}
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">{isBn ? 'ফোন' : 'Phone'}</span>
              <span className="font-medium text-slate-700">{PATIENT_PROFILE.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{isBn ? 'ইমেইল' : 'Email'}</span>
              <span className="font-medium text-slate-700">{PATIENT_PROFILE.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{isBn ? 'জন্ম তারিখ' : 'Date of Birth'}</span>
              <span className="font-medium text-slate-700">{new Date(PATIENT_PROFILE.dateOfBirth).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{isBn ? 'যোগদান' : 'Member Since'}</span>
              <span className="font-medium text-slate-700">{new Date(PATIENT_PROFILE.joinedDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Health Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <i className="fas fa-heartbeat text-red-500"></i> {t.healthInfo}
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">{isBn ? 'রক্তের গ্রুপ' : 'Blood Group'}</span>
              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-bold">{PATIENT_PROFILE.bloodGroup}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{isBn ? 'উচ্চতা' : 'Height'}</span>
              <span className="font-medium text-slate-700">{PATIENT_PROFILE.height} cm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{isBn ? 'ওজন' : 'Weight'}</span>
              <span className="font-medium text-slate-700">{PATIENT_PROFILE.weight} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">BMI</span>
              <span className="font-medium text-slate-700">{bmi} <span className="text-xs text-green-600">(Normal)</span></span>
            </div>
          </div>
        </div>

        {/* Allergies & Conditions */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <i className="fas fa-exclamation-triangle text-amber-500"></i> {t.allergies} & {t.conditions}
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold mb-2">{t.allergies}</p>
              <div className="flex flex-wrap gap-2">
                {PATIENT_PROFILE.allergies.map((a) => (
                  <span key={a} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium">{a}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase font-bold mb-2">{t.conditions}</p>
              <div className="flex flex-wrap gap-2">
                {PATIENT_PROFILE.chronicConditions.map((c) => (
                  <span key={c} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">{c}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Current Medications */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <i className="fas fa-pills text-purple-500"></i> {t.medications}
          </h3>
          <div className="space-y-2">
            {PATIENT_PROFILE.currentMedications.map((m) => (
              <div key={m} className="flex items-center gap-3 p-2 bg-purple-50 rounded-lg">
                <i className="fas fa-capsules text-purple-500"></i>
                <span className="text-sm font-medium text-purple-800">{m}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 md:col-span-2">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <i className="fas fa-phone-alt text-green-500"></i> {t.emergency}
          </h3>
          <div className="flex items-center gap-4 bg-green-50 rounded-xl p-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
              <i className="fas fa-user"></i>
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-800">{PATIENT_PROFILE.emergencyContact.name}</p>
              <p className="text-sm text-slate-500">{PATIENT_PROFILE.emergencyContact.relation}</p>
            </div>
            <a href={`tel:${PATIENT_PROFILE.emergencyContact.phone}`} className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition">
              <i className="fas fa-phone mr-2"></i>{PATIENT_PROFILE.emergencyContact.phone}
            </a>
          </div>
        </div>
      </div>

      {/* Edit Button */}
      <button className="w-full p-4 bg-slate-100 rounded-xl text-slate-600 font-bold hover:bg-slate-200 transition flex items-center justify-center gap-2">
        <i className="fas fa-edit"></i> {isBn ? 'প্রোফাইল এডিট করুন' : 'Edit Profile'}
      </button>
    </div>
  );

  // ============ MAIN RENDER ============
  const tabs = [
    { id: 'overview', label: t.overview, icon: 'fa-home' },
    { id: 'doctors', label: t.myDoctors, icon: 'fa-user-md' },
    { id: 'reports', label: t.reports, icon: 'fa-file-medical' },
    { id: 'chat', label: t.aiAssistant, icon: 'fa-robot' },
    { id: 'profile', label: t.profile, icon: 'fa-user' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Desktop */}
      <div className="w-64 bg-white border-r border-slate-200 hidden lg:flex flex-col flex-shrink-0 h-screen sticky top-0">
        {/* Profile Mini */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <img src={PATIENT_PROFILE.profileImage} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-slate-100" />
            <div className="min-w-0">
              <h3 className="font-bold text-slate-800 truncate">{isBn ? PATIENT_PROFILE.nameBn : PATIENT_PROFILE.name}</h3>
              <p className="text-xs text-slate-500">ID: {PATIENT_PROFILE.id}</p>
            </div>
          </div>
        </div>

        {/* Health Score Mini */}
        <div className="p-4 mx-4 mt-4 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-700">{t.healthScore}</span>
            <span className="text-2xl font-bold text-teal-600">{HEALTH_SCORE.overall}</span>
          </div>
          <div className="mt-2 h-2 bg-teal-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full" style={{ width: `${HEALTH_SCORE.overall}%` }}></div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {tabs.map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-medium transition ${
                activeTab === tab.id 
                  ? 'bg-teal-50 text-teal-700 border border-teal-100' 
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <i className={`fas ${tab.icon} w-5 text-center`}></i> 
              {tab.label}
              {tab.id === 'chat' && (
                <span className="ml-auto w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={() => navigate('/')}
            className="w-full text-left px-4 py-2 text-sm text-slate-500 hover:text-slate-700 flex items-center gap-3"
          >
            <i className="fas fa-sign-out-alt"></i> {isBn ? 'লগআউট' : 'Logout'}
          </button>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 safe-area-pb">
        <div className="flex justify-around py-2">
          {tabs.map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center gap-1 px-3 py-2 ${
                activeTab === tab.id ? 'text-teal-600' : 'text-slate-400'
              }`}
            >
              <i className={`fas ${tab.icon} text-lg`}></i>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'doctors' && renderDoctors()}
          {activeTab === 'reports' && renderReports()}
          {activeTab === 'chat' && renderChat()}
          {activeTab === 'profile' && renderProfile()}
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
