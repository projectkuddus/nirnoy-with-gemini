import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatWithHealthAssistant } from '../services/geminiService';
import { ChatMessage, PrescriptionItem } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth, PatientProfile } from '../contexts/AuthContext';

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
    prescription: [{ medicine: 'এমলোডিপিন ৫মিগ্রা', dosage: '০+০+১', duration: '৯০ দিন', instruction: 'রাতে খাবারের পর' }],
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
    prescription: [{ medicine: 'বেটনোভেট-এন ক্রিম', dosage: 'দিনে ২ বার', duration: '১৪ দিন', instruction: 'আক্রান্ত স্থানে' }],
    bodyParts: ['skin'],
  },
];

// ============ BODY VISUALIZATION ============
const ModernBodyMap: React.FC<{
  bodyHealth: BodyPartHealth[];
  selectedPart: string | null;
  onPartClick: (partId: string) => void;
}> = ({ bodyHealth, selectedPart, onPartClick }) => {
  const getStatusColor = (status: string) => {
    if (status === 'ভালো') return '#10b981';
    if (status === 'সতর্ক') return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="relative w-full max-w-[180px] mx-auto">
      <svg viewBox="0 0 100 200" className="w-full h-auto">
        <defs>
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
        </defs>
        
        {/* Body outline */}
        <ellipse cx="50" cy="22" rx="14" ry="16" fill="url(#bodyGrad)" stroke="#cbd5e1" />
        <rect x="44" y="36" width="12" height="10" rx="3" fill="url(#bodyGrad)" />
        <path d="M30 45 Q25 48 27 85 Q30 110 38 115 L62 115 Q70 110 73 85 Q75 48 70 45 Q55 42 50 42 Q45 42 30 45" fill="url(#bodyGrad)" stroke="#cbd5e1" />
        <path d="M28 48 Q18 52 15 80 L22 82 L28 50" fill="url(#bodyGrad)" stroke="#cbd5e1" />
        <path d="M72 48 Q82 52 85 80 L78 82 L72 50" fill="url(#bodyGrad)" stroke="#cbd5e1" />
        <path d="M38 112 L35 170 Q34 178 42 180 L48 178 L50 112" fill="url(#bodyGrad)" stroke="#cbd5e1" />
        <path d="M62 112 L65 170 Q66 178 58 180 L52 178 L50 112" fill="url(#bodyGrad)" stroke="#cbd5e1" />
        
        {/* Clickable organs */}
        {[
          { id: 'head', cx: 50, cy: 22, r: 10 },
          { id: 'heart', cx: 50, cy: 60, r: 8 },
          { id: 'lungs', cx: 50, cy: 72, r: 10 },
          { id: 'stomach', cx: 50, cy: 90, r: 8 },
          { id: 'skin', cx: 20, cy: 70, r: 6 },
          { id: 'bones', cx: 50, cy: 145, r: 8 },
        ].map((organ) => {
          const health = bodyHealth.find(p => p.id === organ.id);
          if (!health) return null;
          const isSelected = selectedPart === organ.id;
          const needsAttention = health.status !== 'ভালো';
          
          return (
            <circle
              key={organ.id}
              cx={organ.cx}
              cy={organ.cy}
              r={organ.r}
              fill={getStatusColor(health.status)}
              stroke={isSelected ? '#0f172a' : 'white'}
              strokeWidth={isSelected ? 2 : 1}
              opacity={isSelected ? 1 : 0.85}
              className={`cursor-pointer transition-all hover:opacity-100 ${needsAttention ? 'animate-pulse' : ''}`}
              onClick={() => onPartClick(organ.id)}
            />
          );
        })}
      </svg>
    </div>
  );
};

// ============ MAIN COMPONENT ============
interface PatientDashboardProps {
  onLogout?: () => void;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, logout, isLoading } = useAuth();
  const isBn = true;
  
  // Debug: Log user state
  console.log('PatientDashboard - user:', user);
  console.log('PatientDashboard - isLoading:', isLoading);
  
  // Redirect if not logged in (after loading completes)
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'PATIENT')) {
      console.log('Redirecting to patient-auth - no valid patient user');
      navigate('/patient-auth');
    }
  }, [user, isLoading, navigate]);
  
  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }
  
  // If no user after loading, show nothing (will redirect)
  if (!user || user.role !== 'PATIENT') {
    return null;
  }
  
  // Use real user data - NO FALLBACK TO DEMO DATA
  const patientData = {
    id: user.id,
    name: user.name,
    nameBn: user.nameBn || user.name,
    phone: user.phone,
    dateOfBirth: (user as PatientProfile).dateOfBirth || '1990-01-01',
    gender: (user as PatientProfile).gender || 'male',
    bloodGroup: (user as PatientProfile).bloodGroup || 'O+',
    height: (user as PatientProfile).height || 170,
    weight: (user as PatientProfile).weight || 70,
    profileImage: user.profileImage || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=3b82f6&color=fff&size=200',
    emergencyContact: (user as PatientProfile).emergencyContact || { name: '', relation: '', phone: '' },
    allergies: (user as PatientProfile).allergies || [],
    chronicConditions: (user as PatientProfile).chronicConditions || [],
    currentMedications: (user as PatientProfile).currentMedications || [],
    familyHistory: (user as PatientProfile).familyHistory || [],
    healthScore: (user as PatientProfile).healthScore || 50,
    credits: (user as PatientProfile).credits || 0,
    badges: (user as PatientProfile).badges || [],
    streak: (user as PatientProfile).streak || 0,
    subscription: (user as PatientProfile).subscription || { tier: 'free', features: [] },
  };
  
  const [activeTab, setActiveTab] = useState<'home' | 'doctors' | 'chat' | 'profile'>('home');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: `আসসালামু আলাইকুম ${patientData.nameBn}! 👋\n\nআমি নির্ণয় - আপনার স্বাস্থ্য সহকারী।\n\n📊 সারসংক্ষেপ:\n• সামগ্রিক: ভালো ✅\n• হৃদযন্ত্র: নজরদারি ⚠️\n\nকোথাও সমস্যা হচ্ছে? 🩺`, timestamp: Date.now() }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null);
  const [bodyHealth, setBodyHealth] = useState<BodyPartHealth[]>(BODY_HEALTH);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const overallScore = useMemo(() => Math.round(bodyHealth.reduce((sum, p) => sum + p.score, 0) / bodyHealth.length), [bodyHealth]);
  const age = new Date().getFullYear() - new Date(patientData.dateOfBirth).getFullYear();

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const buildContext = () => `রোগী: ${patientData.nameBn}, ${age} বছর\nসমস্যা: ${patientData.chronicConditions.join(', ')}\nপরিবার: ${patientData.familyHistory.map(h => `${h.relation}-${h.condition}`).join(', ')}\nনির্দেশ: সহজ বাংলায় উত্তর দিন।`;

  const handleBodyPartClick = (partId: string) => {
    setSelectedBodyPart(partId);
    const part = bodyHealth.find(p => p.id === partId);
    if (part) {
      let msg = `📍 **${part.nameBn}**\n\n${part.status === 'ভালো' ? '✅ ভালো আছে' : `⚠️ ${part.issues.join(', ')}`}`;
      if (part.lastDoctor) msg += `\n\n🩺 ${part.lastDoctor} (${part.lastDate})`;
      setMessages(prev => [...prev, { role: 'model', text: msg, timestamp: Date.now() }]);
      setActiveTab('chat');
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: chatInput, timestamp: Date.now() }]);
    setChatInput('');
    setIsTyping(true);
    try {
      const resp = await chatWithHealthAssistant(`${buildContext()}\n\nবার্তা: "${chatInput}"`, messages.map(m => m.text), '');
      setMessages(prev => [...prev, { role: 'model', text: resp, timestamp: Date.now() }]);
    } catch {
      setMessages(prev => [...prev, { role: 'model', text: 'দুঃখিত, সমস্যা হয়েছে। 🙏', timestamp: Date.now() }]);
    }
    setIsTyping(false);
  };

  const tabs = [
    { id: 'home', icon: 'fa-home', label: 'হোম', emoji: '🏠' },
    { id: 'chat', icon: 'fa-robot', label: 'AI সহকারী', emoji: '🤖' },
    { id: 'doctors', icon: 'fa-user-md', label: 'ডাক্তার', emoji: '👨‍⚕️' },
    { id: 'profile', icon: 'fa-user', label: 'প্রোফাইল', emoji: '👤' },
  ];

  // ============ RENDER SECTIONS ============
  const renderHome = () => (
    <div className="space-y-5">
      {/* Profile Card */}
      <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <img src={patientData.profileImage} alt="" className="w-14 h-14 rounded-xl border-2 border-white/30" />
          <div>
            <p className="text-white/70 text-sm">আসসালামু আলাইকুম</p>
            <h1 className="text-xl font-bold">{patientData.nameBn}</h1>
            <p className="text-sm text-white/80">{age} বছর • {patientData.bloodGroup}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[{ v: overallScore, l: 'স্কোর' }, { v: CONSULTATIONS.length, l: 'পরামর্শ' }, { v: bodyHealth.filter(p => p.status === 'ভালো').length, l: 'ভালো' }].map((s, i) => (
            <div key={i} className="bg-white/15 rounded-xl p-2 text-center">
              <p className="text-xl font-bold">{s.v}</p>
              <p className="text-xs text-white/70">{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Body Map */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">🏥 শরীরের অবস্থা</h2>
        <ModernBodyMap bodyHealth={bodyHealth} selectedPart={selectedBodyPart} onPartClick={handleBodyPartClick} />
        <div className="flex justify-center gap-4 mt-4 text-xs">
          {[{ c: 'bg-emerald-500', l: 'ভালো' }, { c: 'bg-amber-500', l: 'সতর্ক' }, { c: 'bg-red-500', l: 'সমস্যা' }].map((s, i) => (
            <div key={i} className="flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded-full ${s.c}`}></span>{s.l}</div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      <div className="space-y-3">
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 flex items-start gap-3">
          <span className="text-xl">👨‍👩‍👧‍👦</span>
          <div><h3 className="font-bold text-purple-900 text-sm">পারিবারিক ইতিহাস</h3><p className="text-xs text-purple-700 mt-1">{patientData.familyHistory.map(h => `${h.relation}: ${h.condition}`).join(' • ')}</p></div>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
          <span className="text-xl">💊</span>
          <div><h3 className="font-bold text-blue-900 text-sm">বর্তমান ওষুধ</h3><p className="text-xs text-blue-700 mt-1">{patientData.currentMedications.join(', ')}</p></div>
        </div>
      </div>

      <button onClick={() => setActiveTab('chat')} className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white p-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
        🤖 নির্ণয় AI এর সাথে কথা বলুন
      </button>
    </div>
  );

  const renderDoctors = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h2 className="font-bold text-slate-800">আমার ডাক্তারগণ</h2><button onClick={() => navigate('/search')} className="text-sm text-teal-600 font-bold">+ নতুন</button></div>
      {CONSULTATIONS.map((c) => (
        <div key={c.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <img src={c.doctorImage} alt="" className="w-12 h-12 rounded-xl" />
            <div className="flex-1"><h3 className="font-bold text-slate-800">{c.doctorName}</h3><p className="text-sm text-slate-500">{c.specialtyBn}</p></div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 mb-3 text-sm"><strong>রোগ:</strong> {c.diagnosisBn}</div>
          <button onClick={() => navigate(`/doctors/${c.doctorId}`)} className="w-full py-2 bg-teal-500 text-white rounded-lg font-medium text-sm">আবার বুক করুন</button>
        </div>
      ))}
    </div>
  );

  const renderChat = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-teal-500 text-white rounded-tr-md' : 'bg-white text-slate-800 rounded-tl-md border border-slate-100'}`}>
              {msg.role === 'model' && <div className="text-xs text-teal-600 font-bold mb-1">🤖 নির্ণয়</div>}
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {isTyping && <div className="flex justify-start"><div className="bg-white p-3 rounded-2xl rounded-tl-md border border-slate-100 text-sm text-slate-500">চিন্তা করছি...</div></div>}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex-shrink-0 bg-white border-t border-slate-100 p-3 -mx-4 -mb-4 lg:-mx-6 lg:-mb-6">
        <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
          {['মাথা ব্যথা', 'বুকে ব্যথা', 'জ্বর', 'ক্লান্তি'].map((q, i) => (
            <button key={i} onClick={() => setChatInput(q)} className="px-3 py-1.5 bg-slate-100 rounded-full text-xs whitespace-nowrap">{q}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="আপনার সমস্যা লিখুন..." className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
          <button onClick={handleSendMessage} disabled={isTyping || !chatInput.trim()} className="w-11 h-11 bg-teal-500 text-white rounded-xl disabled:opacity-50">➤</button>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 text-center">
        <img src={patientData.profileImage} alt="" className="w-20 h-20 rounded-full mx-auto border-4 border-teal-100" />
        <h2 className="font-bold text-xl text-slate-800 mt-3">{patientData.nameBn}</h2>
        <p className="text-slate-500">ID: {patientData.id}</p>
        <div className="flex justify-center gap-4 mt-3 text-sm">
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full font-bold">{patientData.bloodGroup}</span>
          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full">{age} বছর</span>
        </div>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-3">
        {[{ l: 'ফোন', v: patientData.phone }, { l: 'উচ্চতা', v: `${patientData.height} সেমি` }, { l: 'ওজন', v: `${patientData.weight} কেজি` }].map((r, i) => (
          <div key={i} className="flex justify-between text-sm"><span className="text-slate-500">{r.l}</span><span className="font-medium">{r.v}</span></div>
        ))}
      </div>
      <div className="bg-red-50 rounded-xl p-4 border border-red-100">
        <h3 className="font-bold text-red-800 text-sm mb-2">⚠️ এলার্জি</h3>
        <div className="flex gap-2">{patientData.allergies.map((a, i) => <span key={i} className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">{a}</span>)}</div>
      </div>
    </div>
  );

  // ============ MAIN LAYOUT ============
  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col h-screen sticky top-0">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <img src={patientData.profileImage} alt="" className="w-12 h-12 rounded-xl" />
            <div><h3 className="font-bold text-slate-800">{patientData.nameBn}</h3><p className="text-xs text-slate-500">ID: {patientData.id}</p></div>
          </div>
        </div>
        <div className="p-4 mx-4 mt-4 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-100">
          <div className="flex justify-between items-center"><span className="text-xs font-bold text-teal-700">স্বাস্থ্য স্কোর</span><span className="text-2xl font-bold text-teal-600">{overallScore}</span></div>
          <div className="mt-2 h-2 bg-teal-200 rounded-full"><div className="h-full bg-teal-500 rounded-full" style={{ width: `${overallScore}%` }}></div></div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-medium transition ${activeTab === t.id ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'}`}>
              <span className="text-lg">{t.emoji}</span>{t.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button onClick={() => { onLogout?.(); navigate('/'); }} className="w-full text-left px-4 py-2 text-sm text-slate-500 hover:text-slate-700 flex items-center gap-2"><i className="fas fa-sign-out-alt"></i>লগআউট</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-lg border-b border-slate-200 px-4 py-3 sticky top-0 z-40 lg:hidden">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate('/')} className="w-10 h-10 flex items-center justify-center"><i className="fas fa-arrow-left text-slate-600"></i></button>
            <h1 className="font-bold text-slate-800">{tabs.find(t => t.id === activeTab)?.label}</h1>
            <button className="w-10 h-10 flex items-center justify-center"><i className="fas fa-cog text-slate-600"></i></button>
          </div>
        </div>
        
        {/* Desktop Header */}
        <div className="hidden lg:flex bg-white border-b border-slate-200 px-6 py-4 items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">{tabs.find(t => t.id === activeTab)?.label}</h1>
          <button onClick={() => navigate('/search')} className="px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-bold hover:bg-teal-600 transition">+ নতুন অ্যাপয়েন্টমেন্ট</button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6 overflow-y-auto">
          <div className="max-w-3xl mx-auto lg:mx-0">
            {activeTab === 'home' && renderHome()}
            {activeTab === 'doctors' && renderDoctors()}
            {activeTab === 'chat' && <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 lg:p-6 h-[calc(100vh-200px)] lg:h-[calc(100vh-150px)]">{renderChat()}</div>}
            {activeTab === 'profile' && renderProfile()}
          </div>
        </div>

        {/* Mobile Bottom Nav */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 z-50">
          <div className="flex">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex-1 py-3 flex flex-col items-center gap-1 ${activeTab === t.id ? 'text-teal-600' : 'text-slate-400'}`}>
                <span className="text-lg">{t.emoji}</span><span className="text-xs font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
