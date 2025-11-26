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

// ============ SIMPLE BODY VISUALIZATION ============
const SimpleBodyMap: React.FC<{
  bodyHealth: BodyPartHealth[];
  selectedPart: string | null;
  onPartClick: (partId: string) => void;
}> = ({ bodyHealth, selectedPart, onPartClick }) => {
  
  const getColor = (partId: string) => {
    const part = bodyHealth.find(p => p.id === partId);
    if (!part) return '#e2e8f0';
    if (part.status === 'ভালো') return '#22c55e';
    if (part.status === 'সতর্ক') return '#f59e0b';
    return '#ef4444';
  };

  const parts = [
    { id: 'head', cx: 100, cy: 35, r: 25, label: 'মাথা' },
    { id: 'heart', cx: 100, cy: 95, r: 18, label: 'হৃদযন্ত্র' },
    { id: 'lungs', cx: 100, cy: 130, r: 20, label: 'ফুসফুস' },
    { id: 'stomach', cx: 100, cy: 170, r: 18, label: 'পেট' },
    { id: 'skin', cx: 45, cy: 150, r: 15, label: 'ত্বক' },
    { id: 'bones', cx: 100, cy: 240, r: 20, label: 'হাড়' },
  ];

  return (
    <div className="relative">
      <svg viewBox="0 0 200 300" className="w-full max-w-[200px] mx-auto">
        {/* Simple body outline */}
        <ellipse cx="100" cy="35" rx="28" ry="30" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
        <rect x="75" y="65" width="50" height="100" rx="10" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
        <rect x="50" y="70" width="20" height="70" rx="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
        <rect x="130" y="70" width="20" height="70" rx="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
        <rect x="80" y="165" width="18" height="90" rx="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
        <rect x="102" y="165" width="18" height="90" rx="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
        
        {/* Clickable health indicators */}
        {parts.map((part) => {
          const health = bodyHealth.find(p => p.id === part.id);
          const isSelected = selectedPart === part.id;
          const needsAttention = health?.status === 'সতর্ক' || health?.status === 'সমস্যা';
          
          return (
            <g key={part.id} onClick={() => onPartClick(part.id)} className="cursor-pointer">
              <circle
                cx={part.cx}
                cy={part.cy}
                r={part.r}
                fill={getColor(part.id)}
                stroke={isSelected ? '#0f172a' : 'white'}
                strokeWidth={isSelected ? 3 : 2}
                className={`transition-all hover:scale-110 ${needsAttention ? 'animate-pulse' : ''}`}
                style={{ transformOrigin: `${part.cx}px ${part.cy}px` }}
              />
              {health?.status !== 'ভালো' && (
                <text x={part.cx} y={part.cy + 4} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">!</text>
              )}
            </g>
          );
        })}
      </svg>
      
      {/* Legend */}
      <div className="flex justify-center gap-4 mt-4">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
          <span className="text-xs text-slate-600">ভালো</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500"></span>
          <span className="text-xs text-slate-600">সতর্ক</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <span className="text-xs text-slate-600">সমস্যা</span>
        </div>
      </div>
    </div>
  );
};

// ============ MAIN COMPONENT ============
export const PatientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  
  // Always use Bangla for chat, but allow toggle for UI
  const isBn = true; // Force Bangla for this smart assistant
  
  // State
  const [activeTab, setActiveTab] = useState<'home' | 'doctors' | 'chat'>('home');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      role: 'model', 
      text: `আসসালামু আলাইকুম ${PATIENT.nameBn}! 👋

আমি নির্ণয় - আপনার ব্যক্তিগত স্বাস্থ্য সহকারী।

আপনার স্বাস্থ্যের বর্তমান অবস্থা দেখছি:
✅ সামগ্রিক স্বাস্থ্য: ভালো
⚠️ হৃদযন্ত্র: হালকা উচ্চ রক্তচাপ (নিয়ন্ত্রণে আছে)
⚠️ ত্বক: এলার্জি ইতিহাস আছে

আপনার পরিবারে ডায়াবেটিস ও হৃদরোগের ইতিহাস আছে, তাই নিয়মিত চেকআপ জরুরি।

শরীরে কোনো সমস্যা অনুভব করছেন? আমাকে বলুন। 🩺`,
      timestamp: Date.now() 
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null);
  const [bodyHealth, setBodyHealth] = useState<BodyPartHealth[]>(BODY_HEALTH);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Calculate health score
  const overallScore = useMemo(() => {
    return Math.round(bodyHealth.reduce((sum, p) => sum + p.score, 0) / bodyHealth.length);
  }, [bodyHealth]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Build comprehensive patient context for AI
  const buildPatientContext = () => {
    const age = new Date().getFullYear() - new Date(PATIENT.dateOfBirth).getFullYear();
    const bmi = (PATIENT.weight / Math.pow(PATIENT.height / 100, 2)).toFixed(1);
    
    return `
রোগীর তথ্য:
- নাম: ${PATIENT.nameBn}
- বয়স: ${age} বছর
- লিঙ্গ: ${PATIENT.gender === 'male' ? 'পুরুষ' : 'মহিলা'}
- রক্তের গ্রুপ: ${PATIENT.bloodGroup}
- উচ্চতা: ${PATIENT.height} সেমি, ওজন: ${PATIENT.weight} কেজি (BMI: ${bmi})

বর্তমান স্বাস্থ্য সমস্যা:
${PATIENT.chronicConditions.map(c => `- ${c}`).join('\n')}

বর্তমান ওষুধ:
${PATIENT.currentMedications.map(m => `- ${m}`).join('\n')}

এলার্জি:
${PATIENT.allergies.map(a => `- ${a}`).join('\n')}

পারিবারিক রোগের ইতিহাস (গুরুত্বপূর্ণ):
${PATIENT.familyHistory.map(h => `- ${h.relation}: ${h.condition}`).join('\n')}

শরীরের বর্তমান অবস্থা:
${bodyHealth.map(p => `- ${p.nameBn}: ${p.status} (স্কোর: ${p.score}/100)${p.issues.length > 0 ? ` - সমস্যা: ${p.issues.join(', ')}` : ''}`).join('\n')}

সাম্প্রতিক ডাক্তার পরামর্শ:
${CONSULTATIONS.map(c => `- ${c.diagnosisBn} (${c.doctorName}, ${new Date(c.date).toLocaleDateString('bn-BD')})`).join('\n')}

${selectedBodyPart ? `বর্তমানে নির্বাচিত অংশ: ${bodyHealth.find(p => p.id === selectedBodyPart)?.nameBn}` : ''}

নির্দেশনা:
- সবসময় সহজ বাংলায় উত্তর দিন
- পারিবারিক ইতিহাস মাথায় রেখে পরামর্শ দিন
- সমস্যা গুরুতর মনে হলে নির্দিষ্ট বিশেষজ্ঞ ডাক্তার সাজেস্ট করুন
- রোগীর ইতিহাসের সাথে নতুন সমস্যার সম্পর্ক খুঁজুন
- সহানুভূতিশীল ও বন্ধুত্বপূর্ণ ভাষায় কথা বলুন
`;
  };

  // Handle body part click
  const handleBodyPartClick = (partId: string) => {
    setSelectedBodyPart(partId);
    const part = bodyHealth.find(p => p.id === partId);
    if (part) {
      let message = `📍 **${part.nameBn}**\n\n`;
      
      if (part.status === 'ভালো') {
        message += `✅ অবস্থা: ভালো আছে\n\n`;
      } else if (part.status === 'সতর্ক') {
        message += `⚠️ অবস্থা: সতর্কতা প্রয়োজন\n`;
        message += `সমস্যা: ${part.issues.join(', ')}\n\n`;
      } else {
        message += `🔴 অবস্থা: মনোযোগ দরকার\n`;
        message += `সমস্যা: ${part.issues.join(', ')}\n\n`;
      }
      
      if (part.lastDoctor) {
        message += `সর্বশেষ দেখিয়েছেন: ${part.lastDoctor}\nতারিখ: ${part.lastDate}\n\n`;
      }
      
      // Add family history connection
      const relatedFamilyHistory = PATIENT.familyHistory.filter(h => {
        if (partId === 'heart' && (h.condition.includes('হৃদ') || h.condition.includes('রক্তচাপ'))) return true;
        if (partId === 'stomach' && h.condition.includes('ডায়াবেটিস')) return true;
        return false;
      });
      
      if (relatedFamilyHistory.length > 0) {
        message += `⚡ পারিবারিক ইতিহাস:\n`;
        relatedFamilyHistory.forEach(h => {
          message += `• ${h.relation}ের ${h.condition} ছিল\n`;
        });
        message += `\nএই কারণে নিয়মিত চেকআপ করা উচিত।\n`;
      }
      
      message += `\nএই অংশ নিয়ে কোনো প্রশ্ন আছে?`;
      
      const newMessage: ChatMessage = {
        role: 'model',
        text: message,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, newMessage]);
      setActiveTab('chat');
    }
  };

  // Handle chat
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg: ChatMessage = { role: 'user', text: chatInput, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    
    // Detect symptoms and body parts
    const symptomKeywords = ['ব্যথা', 'যন্ত্রণা', 'সমস্যা', 'অসুস্থ', 'জ্বর', 'কাশি', 'মাথা', 'বুক', 'পেট', 'গলা', 'চুলকানি', 'ক্লান্তি', 'ঘুম', 'খাওয়া'];
    const hasSymptom = symptomKeywords.some(k => chatInput.includes(k));
    
    // Update body health based on symptoms mentioned
    if (chatInput.includes('মাথা') && (chatInput.includes('ব্যথা') || chatInput.includes('যন্ত্রণা'))) {
      setBodyHealth(prev => prev.map(p => 
        p.id === 'head' ? { ...p, status: 'সতর্ক' as const, issues: [...p.issues, 'মাথা ব্যথা অনুভব'] } : p
      ));
    }
    if (chatInput.includes('বুক') && (chatInput.includes('ব্যথা') || chatInput.includes('চাপ'))) {
      setBodyHealth(prev => prev.map(p => 
        p.id === 'heart' ? { ...p, status: 'সমস্যা' as const, issues: [...p.issues, 'বুকে ব্যথা/চাপ'] } : p
      ));
    }
    
    setChatInput('');
    setIsTyping(true);

    try {
      // Build smart prompt for AI
      const smartPrompt = `
${buildPatientContext()}

রোগীর বার্তা: "${chatInput}"

${hasSymptom ? `
গুরুত্বপূর্ণ: রোগী শারীরিক সমস্যার কথা বলছেন।
- সমস্যাটি বুঝে সহানুভূতি দেখান
- পারিবারিক ইতিহাসের সাথে সম্পর্ক খুঁজুন
- প্রয়োজনে উপযুক্ত বিশেষজ্ঞ ডাক্তার সাজেস্ট করুন
- জরুরি হলে দ্রুত ডাক্তার দেখাতে বলুন
- ইমোজি ব্যবহার করে বন্ধুত্বপূর্ণ করুন
` : ''}

সহজ বাংলায় উত্তর দিন:`;

      const responseText = await chatWithHealthAssistant(smartPrompt, messages.map(m => m.text), '');
      
      const modelMsg: ChatMessage = { role: 'model', text: responseText, timestamp: Date.now() };
      setMessages(prev => [...prev, modelMsg]);
    } catch {
      const errorMsg: ChatMessage = { 
        role: 'model', 
        text: 'দুঃখিত, একটু সমস্যা হয়েছে। আবার চেষ্টা করুন। 🙏', 
        timestamp: Date.now() 
      };
      setMessages(prev => [...prev, errorMsg]);
    }
    setIsTyping(false);
  };

  const age = new Date().getFullYear() - new Date(PATIENT.dateOfBirth).getFullYear();

  // Quick action buttons for common queries
  const quickActions = [
    { text: 'মাথা ব্যথা হচ্ছে', icon: '🤕' },
    { text: 'বুকে চাপ অনুভব', icon: '💓' },
    { text: 'ঘুম ভালো হচ্ছে না', icon: '😴' },
    { text: 'ক্লান্তি লাগছে', icon: '😫' },
    { text: 'ওষুধ সম্পর্কে জানতে চাই', icon: '💊' },
  ];

  // ============ RENDER HOME ============
  const renderHome = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-500 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-4">
          <img src={PATIENT.profileImage} alt="" className="w-16 h-16 rounded-full border-3 border-white/30" />
          <div>
            <p className="text-white/80 text-sm">আসসালামু আলাইকুম</p>
            <h1 className="text-xl font-bold">{PATIENT.nameBn}</h1>
            <p className="text-sm text-white/80">{age} বছর • {PATIENT.bloodGroup} • {PATIENT.phone}</p>
          </div>
        </div>
        
        {/* Health Score */}
        <div className="mt-4 flex items-center justify-between bg-white/10 rounded-xl p-3">
          <div>
            <p className="text-sm text-white/80">সামগ্রিক স্বাস্থ্য</p>
            <p className="text-2xl font-bold">{overallScore >= 80 ? 'ভালো ✅' : overallScore >= 60 ? 'মোটামুটি ⚠️' : 'সমস্যা আছে 🔴'}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{overallScore}</p>
            <p className="text-xs text-white/60">/১০০</p>
          </div>
        </div>
      </div>
      
      {/* Body Map Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
          <span className="text-2xl">🏥</span> শরীরের অবস্থা
        </h2>
        <p className="text-sm text-slate-500 mb-4">যে অংশে সমস্যা সেখানে ট্যাপ করুন</p>
        
        <SimpleBodyMap 
          bodyHealth={bodyHealth}
          selectedPart={selectedBodyPart}
          onPartClick={handleBodyPartClick}
        />
        
        {/* Body Part List */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {bodyHealth.map((part) => (
            <button
              key={part.id}
              onClick={() => handleBodyPartClick(part.id)}
              className={`p-3 rounded-xl text-left transition ${
                part.status === 'ভালো' ? 'bg-green-50 border border-green-100' :
                part.status === 'সতর্ক' ? 'bg-amber-50 border border-amber-100' :
                'bg-red-50 border border-red-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-800">{part.nameBn}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  part.status === 'ভালো' ? 'bg-green-100 text-green-700' :
                  part.status === 'সতর্ক' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {part.status}
                </span>
              </div>
              {part.issues.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">{part.issues[0]}</p>
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Important Alerts */}
      <div className="space-y-3">
        {/* Family History Alert */}
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
          <h3 className="font-bold text-purple-800 flex items-center gap-2">
            <span className="text-xl">👨‍👩‍👧‍👦</span> পারিবারিক ইতিহাস
          </h3>
          <p className="text-sm text-purple-600 mt-1">
            আপনার পরিবারে {PATIENT.familyHistory.map(h => h.condition).join(', ')} এর ইতিহাস আছে। নিয়মিত চেকআপ করুন।
          </p>
        </div>
        
        {/* Medication Reminder */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <h3 className="font-bold text-blue-800 flex items-center gap-2">
            <span className="text-xl">💊</span> বর্তমান ওষুধ
          </h3>
          <div className="mt-2 space-y-2">
            {PATIENT.currentMedications.map((med, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-blue-700">
                <span>•</span> {med}
              </div>
            ))}
          </div>
        </div>
        
        {/* Allergy Warning */}
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <h3 className="font-bold text-red-800 flex items-center gap-2">
            <span className="text-xl">⚠️</span> এলার্জি সতর্কতা
          </h3>
          <p className="text-sm text-red-600 mt-1">
            {PATIENT.allergies.join(', ')} থেকে দূরে থাকুন
          </p>
        </div>
      </div>
      
      {/* Quick Chat Button */}
      <button
        onClick={() => setActiveTab('chat')}
        className="w-full bg-gradient-to-r from-teal-600 to-teal-500 text-white p-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition flex items-center justify-center gap-3"
      >
        <span className="text-2xl">🤖</span>
        নির্ণয় AI এর সাথে কথা বলুন
      </button>
    </div>
  );

  // ============ RENDER DOCTORS ============
  const renderDoctors = () => (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <span className="text-2xl">👨‍⚕️</span> আমার ডাক্তারগণ
      </h2>
      
      {CONSULTATIONS.map((c) => (
        <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <img src={c.doctorImage} alt="" className="w-12 h-12 rounded-full" />
            <div className="flex-1">
              <h3 className="font-bold text-slate-800">{c.doctorName}</h3>
              <p className="text-sm text-slate-500">{c.specialtyBn}</p>
            </div>
            <span className="px-2 py-1 bg-slate-100 rounded-full text-xs text-slate-600">
              {new Date(c.date).toLocaleDateString('bn-BD')}
            </span>
          </div>
          
          <div className="bg-slate-50 rounded-lg p-3 mb-3">
            <p className="text-sm text-slate-600"><strong>রোগ নির্ণয়:</strong> {c.diagnosisBn}</p>
          </div>
          
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase">প্রেসক্রিপশন:</p>
            {c.prescription.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-blue-50 rounded-lg p-2">
                <span className="font-medium text-blue-800">{p.medicine}</span>
                <span className="text-blue-600">{p.dosage}</span>
              </div>
            ))}
          </div>
          
          <button 
            onClick={() => navigate(`/doctors/${c.doctorId}`)}
            className="w-full mt-3 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition"
          >
            আবার অ্যাপয়েন্টমেন্ট নিন
          </button>
        </div>
      ))}
      
      <button 
        onClick={() => navigate('/search')}
        className="w-full py-3 border-2 border-dashed border-teal-300 text-teal-600 rounded-xl font-bold hover:bg-teal-50 transition"
      >
        ➕ নতুন ডাক্তার খুঁজুন
      </button>
    </div>
  );

  // ============ RENDER CHAT ============
  const renderChat = () => (
    <div className="flex flex-col h-[calc(100vh-180px)] animate-fade-in">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-t-xl p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl">
            🤖
          </div>
          <div>
            <h2 className="font-bold text-lg">নির্ণয় স্বাস্থ্য সহকারী</h2>
            <p className="text-sm text-white/80">আপনার ব্যক্তিগত AI ডাক্তার সহকারী</p>
          </div>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl ${
              msg.role === 'user' 
                ? 'bg-teal-600 text-white rounded-tr-md' 
                : 'bg-white text-slate-800 rounded-tl-md border border-slate-200 shadow-sm'
            }`}>
              {msg.role === 'model' && (
                <div className="flex items-center gap-2 mb-2 text-xs text-teal-600 font-bold">
                  <span>🤖</span> নির্ণয়
                </div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-2xl rounded-tl-md border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                  <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                </div>
                <span>চিন্তা করছি...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Quick Actions */}
      <div className="bg-white border-t border-slate-200 p-2 overflow-x-auto">
        <div className="flex gap-2">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => setChatInput(action.text)}
              className="flex-shrink-0 px-3 py-2 bg-slate-100 hover:bg-teal-50 rounded-full text-sm text-slate-700 transition whitespace-nowrap"
            >
              <span className="mr-1">{action.icon}</span> {action.text}
            </button>
          ))}
        </div>
      </div>
      
      {/* Input */}
      <div className="bg-white p-4 border-t border-slate-200 rounded-b-xl">
        <div className="flex gap-2">
          <input 
            type="text" 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="আপনার সমস্যা লিখুন..."
            className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
          />
          <button 
            onClick={handleSendMessage}
            disabled={isTyping || !chatInput.trim()}
            className="px-5 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );

  // ============ MAIN LAYOUT ============
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Simple Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate('/')} className="text-slate-600">
            <i className="fas fa-arrow-left text-lg"></i>
          </button>
          <h1 className="font-bold text-slate-800">
            {activeTab === 'home' ? 'আমার স্বাস্থ্য' : activeTab === 'doctors' ? 'আমার ডাক্তার' : 'স্বাস্থ্য সহকারী'}
          </h1>
          <button className="text-slate-600">
            <i className="fas fa-ellipsis-v text-lg"></i>
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-lg mx-auto p-4 pb-24">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'doctors' && renderDoctors()}
        {activeTab === 'chat' && renderChat()}
      </div>
      
      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
        <div className="max-w-lg mx-auto flex">
          {[
            { id: 'home', icon: '🏠', label: 'হোম' },
            { id: 'chat', icon: '🤖', label: 'AI সহকারী' },
            { id: 'doctors', icon: '👨‍⚕️', label: 'ডাক্তার' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 flex flex-col items-center gap-1 transition ${
                activeTab === tab.id ? 'text-teal-600' : 'text-slate-400'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
              {activeTab === tab.id && <div className="w-1 h-1 bg-teal-600 rounded-full"></div>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
