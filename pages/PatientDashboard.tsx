import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatWithHealthAssistant } from '../services/geminiService';
import { ChatMessage, PrescriptionItem } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

// ============ TYPES ============
interface HealthProfile {
  id: string;
  name: string;
  nameBn: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  bloodGroup: string;
  height: number;
  weight: number;
  profileImage: string;
  emergencyContact: { name: string; relation: string; phone: string };
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  familyHistory: { condition: string; relation: string }[];
}

interface BodyPartHealth {
  id: string;
  name: string;
  nameBn: string;
  status: 'ভালো' | 'সতর্ক' | 'সমস্যা';
  score: number;
  issues: string[];
  lastDoctor?: string;
  lastDate?: string;
}

interface ConsultationRecord {
  id: string;
  date: string;
  doctorId: string;
  doctorName: string;
  doctorImage: string;
  specialty: string;
  specialtyBn: string;
  diagnosis: string;
  diagnosisBn: string;
  prescription: PrescriptionItem[];
  bodyParts: string[];
}

// ============ MOCK DATA ============
const PATIENT: HealthProfile = {
  id: 'P-98234',
  name: 'Rahim Uddin',
  nameBn: 'রহিম উদ্দিন',
  phone: '০১৭১২-৩৪৫৬৭৮',
  dateOfBirth: '1993-05-15',
  gender: 'male',
  bloodGroup: 'A+',
  height: 175,
  weight: 72,
  profileImage: 'https://randomuser.me/api/portraits/men/32.jpg',
  emergencyContact: { name: 'করিম উদ্দিন', relation: 'ভাই', phone: '০১৮১২-৩৪৫৬৭৮' },
  allergies: ['পেনিসিলিন', 'ধুলাবালি'],
  chronicConditions: ['হালকা উচ্চ রক্তচাপ'],
  currentMedications: ['এমলোডিপিন ৫মিগ্রা'],
  familyHistory: [
    { condition: 'ডায়াবেটিস', relation: 'বাবা' },
    { condition: 'উচ্চ রক্তচাপ', relation: 'মা' },
    { condition: 'হৃদরোগ', relation: 'দাদা' },
  ],
};

const BODY_HEALTH: BodyPartHealth[] = [
  { id: 'head', name: 'Head', nameBn: 'মাথা', status: 'ভালো', score: 90, issues: [] },
  { id: 'heart', name: 'Heart', nameBn: 'হৃদযন্ত্র', status: 'সতর্ক', score: 78, issues: ['হালকা উচ্চ রক্তচাপ'], lastDoctor: 'ডা. আবুল কাশেম', lastDate: '২০ নভেম্বর ২০২৪' },
  { id: 'lungs', name: 'Lungs', nameBn: 'ফুসফুস', status: 'ভালো', score: 88, issues: [] },
  { id: 'stomach', name: 'Stomach', nameBn: 'পেট', status: 'ভালো', score: 85, issues: [] },
  { id: 'skin', name: 'Skin', nameBn: 'ত্বক', status: 'সতর্ক', score: 75, issues: ['এলার্জি'], lastDoctor: 'ডা. সারা রহমান', lastDate: '১৫ সেপ্টেম্বর ২০২৪' },
  { id: 'bones', name: 'Bones', nameBn: 'হাড়', status: 'ভালো', score: 82, issues: [] },
];

const CONSULTATIONS: ConsultationRecord[] = [
  {
    id: 'c1',
    date: '2024-11-20',
    doctorId: 'd1',
    doctorName: 'ডা. আবুল কাশেম',
    doctorImage: 'https://randomuser.me/api/portraits/men/85.jpg',
    specialty: 'Cardiology',
    specialtyBn: 'হৃদরোগ বিশেষজ্ঞ',
    diagnosis: 'Controlled Hypertension',
    diagnosisBn: 'নিয়ন্ত্রিত উচ্চ রক্তচাপ',
    prescription: [
      { medicine: 'এমলোডিপিন ৫মিগ্রা', dosage: '০+০+১', duration: '৯০ দিন', instruction: 'রাতে খাবারের পর' },
    ],
    bodyParts: ['heart'],
  },
  {
    id: 'c2',
    date: '2024-09-15',
    doctorId: 'd2',
    doctorName: 'ডা. সারা রহমান',
    doctorImage: 'https://randomuser.me/api/portraits/women/65.jpg',
    specialty: 'Dermatology',
    specialtyBn: 'চর্মরোগ বিশেষজ্ঞ',
    diagnosis: 'Contact Dermatitis',
    diagnosisBn: 'ত্বকের এলার্জি',
    prescription: [
      { medicine: 'বেটনোভেট-এন ক্রিম', dosage: 'দিনে ২ বার', duration: '১৪ দিন', instruction: 'আক্রান্ত স্থানে' },
    ],
    bodyParts: ['skin'],
  },
];

// ============ MODERN BODY VISUALIZATION ============
const ModernBodyMap: React.FC<{
  bodyHealth: BodyPartHealth[];
  selectedPart: string | null;
  onPartClick: (partId: string) => void;
}> = ({ bodyHealth, selectedPart, onPartClick }) => {
  
  const getStatusColor = (status: string) => {
    if (status === 'ভালো') return { fill: '#10b981', glow: '#34d399' };
    if (status === 'সতর্ক') return { fill: '#f59e0b', glow: '#fbbf24' };
    return { fill: '#ef4444', glow: '#f87171' };
  };

  const bodyParts = [
    { id: 'head', path: 'M50 8 C50 8 35 10 32 28 C30 40 35 55 50 58 C65 55 70 40 68 28 C65 10 50 8 50 8', labelY: 33 },
    { id: 'heart', path: 'M42 75 C38 70 30 72 30 82 C30 92 42 102 50 108 C58 102 70 92 70 82 C70 72 62 70 58 75 C54 80 46 80 42 75', labelY: 90 },
    { id: 'lungs', path: 'M25 72 Q20 75 20 95 Q20 115 30 120 L40 118 L40 75 Z M75 72 Q80 75 80 95 Q80 115 70 120 L60 118 L60 75 Z', labelY: 95 },
    { id: 'stomach', path: 'M35 125 Q30 130 32 150 Q35 165 50 168 Q65 165 68 150 Q70 130 65 125 Z', labelY: 147 },
    { id: 'skin', path: 'M15 70 L15 140 Q15 150 25 150 L30 148 L30 72 L25 70 Z M85 70 L85 140 Q85 150 75 150 L70 148 L70 72 L75 70 Z', labelY: 110 },
    { id: 'bones', path: 'M38 175 L35 240 Q34 250 42 252 L48 250 L50 175 Z M62 175 L65 240 Q66 250 58 252 L52 250 L50 175 Z', labelY: 215 },
  ];

  return (
    <div className="relative w-full aspect-[1/1.4] max-w-xs mx-auto">
      <svg viewBox="0 0 100 270" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15"/>
          </filter>
        </defs>

        {/* Body silhouette background */}
        <g filter="url(#shadow)">
          {/* Head */}
          <ellipse cx="50" cy="33" rx="18" ry="22" fill="url(#bodyGradient)" />
          {/* Neck */}
          <rect x="43" y="52" width="14" height="15" rx="4" fill="url(#bodyGradient)" />
          {/* Torso */}
          <path d="M25 65 Q20 70 22 130 Q25 170 35 175 L65 175 Q75 170 78 130 Q80 70 75 65 Q60 60 50 60 Q40 60 25 65" fill="url(#bodyGradient)" />
          {/* Arms */}
          <path d="M22 70 Q10 75 8 120 Q6 145 15 150 Q22 152 25 148 L28 75 Z" fill="url(#bodyGradient)" />
          <path d="M78 70 Q90 75 92 120 Q94 145 85 150 Q78 152 75 148 L72 75 Z" fill="url(#bodyGradient)" />
          {/* Legs */}
          <path d="M35 172 L32 245 Q31 258 42 260 L48 258 L50 172 Z" fill="url(#bodyGradient)" />
          <path d="M65 172 L68 245 Q69 258 58 260 L52 258 L50 172 Z" fill="url(#bodyGradient)" />
        </g>

        {/* Interactive health indicators */}
        {bodyParts.map((part) => {
          const health = bodyHealth.find(p => p.id === part.id);
          if (!health) return null;
          
          const colors = getStatusColor(health.status);
          const isSelected = selectedPart === part.id;
          const needsAttention = health.status !== 'ভালো';
          
          return (
            <g 
              key={part.id} 
              onClick={() => onPartClick(part.id)} 
              className="cursor-pointer"
              style={{ transition: 'all 0.3s ease' }}
            >
              <path
                d={part.path}
                fill={colors.fill}
                opacity={isSelected ? 1 : 0.85}
                filter={isSelected ? 'url(#glow)' : undefined}
                stroke={isSelected ? '#0f172a' : 'white'}
                strokeWidth={isSelected ? 2 : 1}
                className={`transition-all duration-300 hover:opacity-100 ${needsAttention ? 'animate-pulse' : ''}`}
              />
              {/* Status indicator dot */}
              {needsAttention && (
                <circle
                  cx={part.id === 'skin' ? 85 : 50}
                  cy={part.labelY - 15}
                  r="4"
                  fill="white"
                  stroke={colors.fill}
                  strokeWidth="2"
                  className="animate-ping"
                  style={{ animationDuration: '2s' }}
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating labels */}
      <div className="absolute inset-0 pointer-events-none">
        {bodyParts.map((part) => {
          const health = bodyHealth.find(p => p.id === part.id);
          if (!health) return null;
          
          const isSelected = selectedPart === part.id;
          const yPercent = (part.labelY / 270) * 100;
          const xPercent = part.id === 'skin' ? 92 : 50;
          
          return isSelected ? (
            <div
              key={part.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
              style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
            >
              <div className="bg-slate-900 text-white text-xs px-2 py-1 rounded-lg shadow-lg whitespace-nowrap animate-fade-in">
                {health.nameBn}
              </div>
            </div>
          ) : null;
        })}
      </div>
    </div>
  );
};

// ============ MAIN COMPONENT ============
export const PatientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  
  const isBn = true;
  
  // State
  const [activeTab, setActiveTab] = useState<'home' | 'doctors' | 'chat'>('home');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      role: 'model', 
      text: `আসসালামু আলাইকুম ${PATIENT.nameBn}! 👋

আমি নির্ণয় - আপনার ব্যক্তিগত স্বাস্থ্য সহকারী।

📊 আপনার স্বাস্থ্যের সারসংক্ষেপ:
• সামগ্রিক অবস্থা: ভালো ✅
• হৃদযন্ত্র: নজরদারিতে আছে ⚠️
• পরিবারে ডায়াবেটিস ও হৃদরোগের ইতিহাস আছে

কোথাও অসুবিধা হচ্ছে? আমাকে জানান। 🩺`,
      timestamp: Date.now() 
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null);
  const [bodyHealth, setBodyHealth] = useState<BodyPartHealth[]>(BODY_HEALTH);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const overallScore = useMemo(() => {
    return Math.round(bodyHealth.reduce((sum, p) => sum + p.score, 0) / bodyHealth.length);
  }, [bodyHealth]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const buildPatientContext = () => {
    const age = new Date().getFullYear() - new Date(PATIENT.dateOfBirth).getFullYear();
    const bmi = (PATIENT.weight / Math.pow(PATIENT.height / 100, 2)).toFixed(1);
    
    return `
রোগীর তথ্য:
- নাম: ${PATIENT.nameBn}, বয়স: ${age} বছর
- রক্তের গ্রুপ: ${PATIENT.bloodGroup}, BMI: ${bmi}
- বর্তমান সমস্যা: ${PATIENT.chronicConditions.join(', ')}
- ওষুধ: ${PATIENT.currentMedications.join(', ')}
- এলার্জি: ${PATIENT.allergies.join(', ')}
- পারিবারিক ইতিহাস: ${PATIENT.familyHistory.map(h => `${h.relation} - ${h.condition}`).join(', ')}

শরীরের অবস্থা:
${bodyHealth.map(p => `${p.nameBn}: ${p.status}${p.issues.length > 0 ? ` (${p.issues.join(', ')})` : ''}`).join('\n')}

${selectedBodyPart ? `নির্বাচিত অংশ: ${bodyHealth.find(p => p.id === selectedBodyPart)?.nameBn}` : ''}

নির্দেশনা: সহজ বাংলায়, বন্ধুত্বপূর্ণভাবে উত্তর দিন। প্রয়োজনে বিশেষজ্ঞ ডাক্তার সাজেস্ট করুন।
`;
  };

  const handleBodyPartClick = (partId: string) => {
    setSelectedBodyPart(partId);
    const part = bodyHealth.find(p => p.id === partId);
    if (part) {
      let message = `📍 **${part.nameBn}**\n\n`;
      
      if (part.status === 'ভালো') {
        message += `✅ এই অংশ ভালো আছে।\n`;
      } else {
        message += `⚠️ ${part.issues.join(', ')}\n`;
        if (part.lastDoctor) {
          message += `\n🩺 সর্বশেষ দেখিয়েছেন: ${part.lastDoctor}\n📅 ${part.lastDate}\n`;
        }
      }
      
      const relatedHistory = PATIENT.familyHistory.filter(h => {
        if (partId === 'heart' && (h.condition.includes('হৃদ') || h.condition.includes('রক্তচাপ'))) return true;
        if (partId === 'stomach' && h.condition.includes('ডায়াবেটিস')) return true;
        return false;
      });
      
      if (relatedHistory.length > 0) {
        message += `\n👨‍👩‍👧 পারিবারিক সতর্কতা:\n`;
        relatedHistory.forEach(h => {
          message += `• ${h.relation}ের ${h.condition}\n`;
        });
      }
      
      message += `\nএই বিষয়ে কিছু জানতে চান?`;
      
      setMessages(prev => [...prev, { role: 'model', text: message, timestamp: Date.now() }]);
      setActiveTab('chat');
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg: ChatMessage = { role: 'user', text: chatInput, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    
    if (chatInput.includes('মাথা') && chatInput.includes('ব্যথা')) {
      setBodyHealth(prev => prev.map(p => 
        p.id === 'head' ? { ...p, status: 'সতর্ক' as const, issues: ['মাথা ব্যথা'] } : p
      ));
    }
    if (chatInput.includes('বুক') && (chatInput.includes('ব্যথা') || chatInput.includes('চাপ'))) {
      setBodyHealth(prev => prev.map(p => 
        p.id === 'heart' ? { ...p, status: 'সমস্যা' as const, issues: [...p.issues, 'বুকে ব্যথা'] } : p
      ));
    }
    
    setChatInput('');
    setIsTyping(true);

    try {
      const smartPrompt = `${buildPatientContext()}\n\nরোগীর বার্তা: "${chatInput}"\n\nসহজ বাংলায় উত্তর দিন:`;
      const responseText = await chatWithHealthAssistant(smartPrompt, messages.map(m => m.text), '');
      setMessages(prev => [...prev, { role: 'model', text: responseText, timestamp: Date.now() }]);
    } catch {
      setMessages(prev => [...prev, { role: 'model', text: 'দুঃখিত, সমস্যা হয়েছে। আবার চেষ্টা করুন। 🙏', timestamp: Date.now() }]);
    }
    setIsTyping(false);
  };

  const age = new Date().getFullYear() - new Date(PATIENT.dateOfBirth).getFullYear();

  const quickActions = [
    { text: 'মাথা ব্যথা', icon: '🤕' },
    { text: 'বুকে ব্যথা', icon: '💓' },
    { text: 'জ্বর', icon: '🤒' },
    { text: 'ক্লান্তি', icon: '😫' },
    { text: 'ওষুধ', icon: '💊' },
  ];

  // ============ RENDER HOME ============
  const renderHome = () => (
    <div className="space-y-5">
      {/* Profile Card */}
      <div className="bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600 rounded-3xl p-5 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img src={PATIENT.profileImage} alt="" className="w-16 h-16 rounded-2xl border-2 border-white/30 shadow-lg" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white"></div>
          </div>
          <div className="flex-1">
            <p className="text-white/70 text-sm">আসসালামু আলাইকুম</p>
            <h1 className="text-xl font-bold">{PATIENT.nameBn}</h1>
            <p className="text-sm text-white/80">{age} বছর • {PATIENT.bloodGroup}</p>
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-white/15 backdrop-blur rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold">{overallScore}</p>
            <p className="text-xs text-white/70">স্কোর</p>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold">{CONSULTATIONS.length}</p>
            <p className="text-xs text-white/70">পরামর্শ</p>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-2xl p-3 text-center">
            <p className="text-2xl font-bold">{bodyHealth.filter(p => p.status === 'ভালো').length}</p>
            <p className="text-xs text-white/70">ভালো</p>
          </div>
        </div>
      </div>

      {/* Body Map Card */}
      <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="w-8 h-8 bg-teal-100 rounded-xl flex items-center justify-center">🏥</span>
            শরীরের অবস্থা
          </h2>
          <p className="text-sm text-slate-500 mt-1">সমস্যাযুক্ত অংশে ট্যাপ করুন</p>
        </div>
        
        <div className="p-5">
          <ModernBodyMap 
            bodyHealth={bodyHealth}
            selectedPart={selectedBodyPart}
            onPartClick={handleBodyPartClick}
          />
        </div>
        
        {/* Status Legend */}
        <div className="px-5 pb-5">
          <div className="flex justify-center gap-6 bg-slate-50 rounded-2xl p-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span className="text-xs text-slate-600 font-medium">ভালো</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span className="text-xs text-slate-600 font-medium">সতর্ক</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-xs text-slate-600 font-medium">সমস্যা</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Health Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {bodyHealth.filter(p => p.status !== 'ভালো').map((part) => (
          <button
            key={part.id}
            onClick={() => handleBodyPartClick(part.id)}
            className="bg-white rounded-2xl p-4 text-left shadow-sm border border-slate-100 hover:shadow-md transition"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2 h-2 rounded-full ${part.status === 'সতর্ক' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
              <span className="font-bold text-slate-800">{part.nameBn}</span>
            </div>
            <p className="text-xs text-slate-500">{part.issues[0]}</p>
          </button>
        ))}
      </div>
      
      {/* Alerts */}
      <div className="space-y-3">
        <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-100 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">👨‍👩‍👧‍👦</span>
            <div>
              <h3 className="font-bold text-purple-900">পারিবারিক ইতিহাস</h3>
              <p className="text-sm text-purple-700 mt-1">
                {PATIENT.familyHistory.map(h => `${h.relation}: ${h.condition}`).join(' • ')}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💊</span>
            <div>
              <h3 className="font-bold text-blue-900">বর্তমান ওষুধ</h3>
              <p className="text-sm text-blue-700 mt-1">{PATIENT.currentMedications.join(', ')}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* AI Chat Button */}
      <button
        onClick={() => setActiveTab('chat')}
        className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white p-4 rounded-2xl font-bold shadow-lg hover:shadow-xl transition flex items-center justify-center gap-3"
      >
        <span className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">🤖</span>
        <span>নির্ণয় AI এর সাথে কথা বলুন</span>
      </button>
    </div>
  );

  // ============ RENDER DOCTORS ============
  const renderDoctors = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">আমার ডাক্তারগণ</h2>
        <button onClick={() => navigate('/search')} className="text-sm text-teal-600 font-bold">+ নতুন</button>
      </div>
      
      {CONSULTATIONS.map((c) => (
        <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <img src={c.doctorImage} alt="" className="w-14 h-14 rounded-xl" />
            <div className="flex-1">
              <h3 className="font-bold text-slate-800">{c.doctorName}</h3>
              <p className="text-sm text-slate-500">{c.specialtyBn}</p>
            </div>
            <span className="text-xs text-slate-400">{new Date(c.date).toLocaleDateString('bn-BD')}</span>
          </div>
          
          <div className="bg-slate-50 rounded-xl p-3 mb-3">
            <p className="text-sm text-slate-700"><strong>রোগ:</strong> {c.diagnosisBn}</p>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => navigate(`/doctors/${c.doctorId}`)}
              className="flex-1 py-2.5 bg-teal-500 text-white rounded-xl font-medium hover:bg-teal-600 transition text-sm"
            >
              আবার বুক করুন
            </button>
            <button className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition">
              <i className="fas fa-phone"></i>
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  // ============ RENDER CHAT ============
  const renderChat = () => (
    <div className="flex flex-col h-[calc(100vh-160px)] bg-white rounded-3xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-teal-500 to-emerald-500 p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">🤖</div>
          <div>
            <h2 className="font-bold">নির্ণয় স্বাস্থ্য সহকারী</h2>
            <p className="text-sm text-white/80">আপনার AI ডাক্তার সহকারী</p>
          </div>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
              msg.role === 'user' 
                ? 'bg-teal-500 text-white rounded-tr-md' 
                : 'bg-white text-slate-800 rounded-tl-md'
            }`}>
              {msg.role === 'model' && (
                <div className="flex items-center gap-2 mb-2 text-xs text-teal-600 font-bold">🤖 নির্ণয়</div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-2xl rounded-tl-md shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}></span>
                  ))}
                </span>
                <span className="text-sm text-slate-500">চিন্তা করছি...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Quick Actions */}
      <div className="flex-shrink-0 bg-white border-t border-slate-100 p-3 overflow-x-auto">
        <div className="flex gap-2">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => setChatInput(action.text)}
              className="flex-shrink-0 px-4 py-2 bg-slate-100 hover:bg-teal-50 rounded-xl text-sm font-medium text-slate-700 transition whitespace-nowrap"
            >
              {action.icon} {action.text}
            </button>
          ))}
        </div>
      </div>
      
      {/* Input */}
      <div className="flex-shrink-0 bg-white p-4 border-t border-slate-100">
        <div className="flex gap-3">
          <input 
            type="text" 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="আপনার সমস্যা লিখুন..."
            className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition"
          />
          <button 
            onClick={handleSendMessage}
            disabled={isTyping || !chatInput.trim()}
            className="w-12 h-12 bg-teal-500 text-white rounded-xl font-bold hover:bg-teal-600 transition disabled:opacity-50 flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  // ============ MAIN LAYOUT ============
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-slate-200 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/')} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition">
            <i className="fas fa-arrow-left text-slate-600"></i>
          </button>
          <h1 className="font-bold text-slate-800 text-lg">
            {activeTab === 'home' ? 'আমার স্বাস্থ্য' : activeTab === 'doctors' ? 'আমার ডাক্তার' : 'স্বাস্থ্য সহকারী'}
          </h1>
          <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition">
            <i className="fas fa-cog text-slate-600"></i>
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-lg mx-auto p-4 pb-28">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'doctors' && renderDoctors()}
        {activeTab === 'chat' && renderChat()}
      </div>
      
      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 z-50 safe-area-pb">
        <div className="max-w-lg mx-auto flex">
          {[
            { id: 'home', icon: '🏠', label: 'হোম' },
            { id: 'chat', icon: '🤖', label: 'AI সহকারী' },
            { id: 'doctors', icon: '👨‍⚕️', label: 'ডাক্তার' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-4 flex flex-col items-center gap-1 transition ${
                activeTab === tab.id ? 'text-teal-600' : 'text-slate-400'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
