import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatWithHealthAssistant } from '../services/geminiService';
import { ChatMessage } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth, PatientProfile, HealthRecord } from '../contexts/AuthContext';

// ============ TYPES ============
interface BodyPartHealth {
  id: string;
  name: string;
  nameBn: string;
  status: 'ভালো' | 'সতর্ক' | 'সমস্যা';
  score: number;
  issues: string[];
}

// ============ PROFILE EDIT MODAL ============
const ProfileEditModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user: PatientProfile;
  onSave: (data: Partial<PatientProfile>) => Promise<void>;
}> = ({ isOpen, onClose, user, onSave }) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    nameBn: user.nameBn || '',
    dateOfBirth: user.dateOfBirth || '',
    gender: user.gender || 'male',
    bloodGroup: user.bloodGroup || '',
    height: user.height || '',
    weight: user.weight || '',
    emergencyContactName: user.emergencyContact?.name || '',
    emergencyContactRelation: user.emergencyContact?.relation || '',
    emergencyContactPhone: user.emergencyContact?.phone || '',
    chronicConditions: user.chronicConditions?.join(', ') || '',
    allergies: user.allergies?.join(', ') || '',
  });
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      name: formData.name,
      nameBn: formData.nameBn || formData.name,
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender as 'male' | 'female' | 'other',
      bloodGroup: formData.bloodGroup,
      height: formData.height ? Number(formData.height) : undefined,
      weight: formData.weight ? Number(formData.weight) : undefined,
      emergencyContact: formData.emergencyContactPhone ? {
        name: formData.emergencyContactName,
        relation: formData.emergencyContactRelation,
        phone: formData.emergencyContactPhone
      } : undefined,
      chronicConditions: formData.chronicConditions.split(',').map(s => s.trim()).filter(Boolean),
      allergies: formData.allergies.split(',').map(s => s.trim()).filter(Boolean),
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">প্রোফাইল সম্পাদনা</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600">✕</button>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Basic Info */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-700 text-sm">ব্যক্তিগত তথ্য</h3>
            
            <div>
              <label className="text-xs text-slate-500 mb-1 block">নাম (ইংরেজি) *</label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Your Name" />
            </div>
            
            <div>
              <label className="text-xs text-slate-500 mb-1 block">নাম (বাংলা)</label>
              <input type="text" value={formData.nameBn} onChange={e => setFormData({...formData, nameBn: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="আপনার নাম" />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">জন্ম তারিখ *</label>
                <input type="date" value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} max={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">লিঙ্গ *</label>
                <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none">
                  <option value="male">পুরুষ</option>
                  <option value="female">মহিলা</option>
                  <option value="other">অন্যান্য</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">রক্তের গ্রুপ</label>
                <select value={formData.bloodGroup} onChange={e => setFormData({...formData, bloodGroup: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none">
                  <option value="">নির্বাচন করুন</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">উচ্চতা (সেমি)</label>
                <input type="number" value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="170" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">ওজন (কেজি)</label>
                <input type="number" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="70" />
              </div>
            </div>
          </div>
          
          {/* Medical Info */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="font-bold text-slate-700 text-sm">স্বাস্থ্য তথ্য</h3>
            
            <div>
              <label className="text-xs text-slate-500 mb-1 block">দীর্ঘমেয়াদী রোগ (কমা দিয়ে আলাদা করুন)</label>
              <input type="text" value={formData.chronicConditions} onChange={e => setFormData({...formData, chronicConditions: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="ডায়াবেটিস, উচ্চ রক্তচাপ" />
            </div>
            
            <div>
              <label className="text-xs text-slate-500 mb-1 block">এলার্জি (কমা দিয়ে আলাদা করুন)</label>
              <input type="text" value={formData.allergies} onChange={e => setFormData({...formData, allergies: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="পেনিসিলিন, ধুলাবালি" />
            </div>
          </div>
          
          {/* Emergency Contact */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <h3 className="font-bold text-slate-700 text-sm">জরুরি যোগাযোগ</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">নাম</label>
                <input type="text" value={formData.emergencyContactName} onChange={e => setFormData({...formData, emergencyContactName: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="নাম" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">সম্পর্ক</label>
                <input type="text" value={formData.emergencyContactRelation} onChange={e => setFormData({...formData, emergencyContactRelation: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="ভাই/বোন" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">ফোন নম্বর</label>
              <input type="tel" value={formData.emergencyContactPhone} onChange={e => setFormData({...formData, emergencyContactPhone: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none" placeholder="01XXXXXXXXX" />
            </div>
          </div>
        </div>
        
        <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-medium">বাতিল</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-teal-500 text-white rounded-xl font-bold disabled:opacity-50">
            {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============ HEALTH ASSISTANT AI ============
const buildHealthContext = (user: PatientProfile) => {
  const age = user.age || (user.dateOfBirth ? new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear() : 'অজানা');
  
  return `
রোগীর তথ্য:
- নাম: ${user.nameBn || user.name}
- বয়স: ${age} বছর
- লিঙ্গ: ${user.gender === 'male' ? 'পুরুষ' : user.gender === 'female' ? 'মহিলা' : 'অন্যান্য'}
- রক্তের গ্রুপ: ${user.bloodGroup || 'অজানা'}
- উচ্চতা: ${user.height ? user.height + ' সেমি' : 'অজানা'}
- ওজন: ${user.weight ? user.weight + ' কেজি' : 'অজানা'}

স্বাস্থ্য ইতিহাস:
- দীর্ঘমেয়াদী রোগ: ${user.chronicConditions?.length ? user.chronicConditions.join(', ') : 'নেই'}
- এলার্জি: ${user.allergies?.length ? user.allergies.join(', ') : 'নেই'}
- বর্তমান ওষুধ: ${user.currentMedications?.length ? user.currentMedications.map(m => typeof m === 'string' ? m : m.name).join(', ') : 'নেই'}
- পারিবারিক ইতিহাস: ${user.familyHistory?.length ? user.familyHistory.map(h => h.relation + ' - ' + h.condition).join(', ') : 'নেই'}

নির্দেশনা:
1. সংক্ষিপ্ত ও কার্যকর উত্তর দিন
2. গুরুতর লক্ষণ থাকলে সরাসরি ডাক্তার দেখাতে বলুন
3. প্রাথমিক পরামর্শ দিন, চূড়ান্ত রোগ নির্ণয় নয়
4. প্রয়োজনে কোন বিশেষজ্ঞ দেখাতে হবে বলুন
5. জরুরি লক্ষণ থাকলে ইমার্জেন্সিতে যেতে বলুন
`;
};

// ============ MAIN COMPONENT ============
interface PatientDashboardProps {
  onLogout?: () => void;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, logout, isLoading, updateProfile, addAIInsight } = useAuth();
  
  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'PATIENT')) {
      navigate('/patient-auth');
    }
  }, [user, isLoading, navigate]);
  
  // Show loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }
  
  if (!user || user.role !== 'PATIENT') return null;
  
  const patientUser = user as PatientProfile;
  const age = patientUser.age || (patientUser.dateOfBirth ? new Date().getFullYear() - new Date(patientUser.dateOfBirth).getFullYear() : 0);
  
  // State
  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'records' | 'profile'>('home');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Initial AI greeting based on profile completeness
  useEffect(() => {
    const greeting = patientUser.profileCompleteness < 50
      ? `আসসালামু আলাইকুম ${patientUser.nameBn || patientUser.name}! 👋\n\nআমি নির্ণয় - আপনার স্বাস্থ্য সহকারী।\n\n⚠️ আপনার প্রোফাইল ${patientUser.profileCompleteness}% সম্পূর্ণ।\n\nঅনুগ্রহ করে নিম্নলিখিত তথ্য যোগ করুন:\n${patientUser.missingFields?.map(f => '• ' + f).join('\n')}\n\n👆 প্রোফাইল ট্যাবে গিয়ে "সম্পাদনা" বাটনে ক্লিক করুন।`
      : `আসসালামু আলাইকুম ${patientUser.nameBn || patientUser.name}! 👋\n\nআমি নির্ণয় - আপনার স্বাস্থ্য সহকারী।\n\nকোনো স্বাস্থ্য সমস্যা থাকলে জানান। আমি সঠিক ডাক্তার খুঁজে দেব। 🩺`;
    
    setMessages([{ role: 'model', text: greeting, timestamp: Date.now() }]);
  }, [patientUser.profileCompleteness]);
  
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  
  // Calculate body health from conditions
  const bodyHealth = useMemo((): BodyPartHealth[] => {
    const conditions = patientUser.chronicConditions || [];
    const getStatus = (issues: string[]): 'ভালো' | 'সতর্ক' | 'সমস্যা' => {
      if (issues.length === 0) return 'ভালো';
      if (issues.length === 1) return 'সতর্ক';
      return 'সমস্যা';
    };
    
    const heartIssues = conditions.filter(c => 
      c.toLowerCase().includes('হৃদ') || c.toLowerCase().includes('heart') || 
      c.toLowerCase().includes('রক্তচাপ') || c.toLowerCase().includes('pressure')
    );
    
    const diabetesIssues = conditions.filter(c => 
      c.toLowerCase().includes('ডায়াবেটিস') || c.toLowerCase().includes('diabetes') ||
      c.toLowerCase().includes('সুগার') || c.toLowerCase().includes('sugar')
    );
    
    const lungIssues = conditions.filter(c => 
      c.toLowerCase().includes('ফুসফুস') || c.toLowerCase().includes('lung') ||
      c.toLowerCase().includes('শ্বাস') || c.toLowerCase().includes('asthma')
    );
    
    return [
      { id: 'heart', name: 'Heart', nameBn: 'হৃদযন্ত্র', status: getStatus(heartIssues), score: 100 - heartIssues.length * 20, issues: heartIssues },
      { id: 'lungs', name: 'Lungs', nameBn: 'ফুসফুস', status: getStatus(lungIssues), score: 100 - lungIssues.length * 20, issues: lungIssues },
      { id: 'stomach', name: 'Stomach', nameBn: 'পেট', status: getStatus(diabetesIssues), score: 100 - diabetesIssues.length * 20, issues: diabetesIssues },
    ];
  }, [patientUser.chronicConditions]);
  
  const overallScore = useMemo(() => {
    if (bodyHealth.length === 0) return 100;
    return Math.round(bodyHealth.reduce((sum, p) => sum + p.score, 0) / bodyHealth.length);
  }, [bodyHealth]);
  
  // Handle AI chat
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage, timestamp: Date.now() }]);
    setChatInput('');
    setIsTyping(true);
    
    try {
      const context = buildHealthContext(patientUser);
      const response = await chatWithHealthAssistant(
        context + '\n\nরোগীর প্রশ্ন: "' + userMessage + '"',
        messages.map(m => m.text),
        ''
      );
      
      setMessages(prev => [...prev, { role: 'model', text: response, timestamp: Date.now() }]);
      
      // Check if AI detected something important - add to insights
      if (response.includes('ডাক্তার') || response.includes('বিশেষজ্ঞ') || response.includes('জরুরি')) {
        await addAIInsight({
          insight: 'AI সহকারী ডাক্তার দেখানোর পরামর্শ দিয়েছে: ' + userMessage.substring(0, 50),
          category: 'recommendation',
          severity: response.includes('জরুরি') ? 'critical' : 'warning'
        });
      }
    } catch {
      setMessages(prev => [...prev, { role: 'model', text: 'দুঃখিত, সমস্যা হয়েছে। আবার চেষ্টা করুন। 🙏', timestamp: Date.now() }]);
    }
    
    setIsTyping(false);
  };
  
  const handleProfileSave = async (data: Partial<PatientProfile>) => {
    await updateProfile(data);
  };
  
  const handleLogout = () => {
    logout();
    if (onLogout) onLogout();
    navigate('/');
  };
  
  const tabs = [
    { id: 'home', label: 'হোম', emoji: '🏠' },
    { id: 'chat', label: 'AI সহকারী', emoji: '🤖' },
    { id: 'records', label: 'রেকর্ড', emoji: '📋' },
    { id: 'profile', label: 'প্রোফাইল', emoji: '👤' },
  ];
  
  // ============ RENDER HOME ============
  const renderHome = () => (
    <div className="space-y-5">
      {/* Profile Card */}
      <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <img 
            src={patientUser.profileImage || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(patientUser.name) + '&background=0d9488&color=fff&size=200'} 
            alt="" 
            className="w-14 h-14 rounded-xl border-2 border-white/30" 
          />
          <div className="flex-1">
            <p className="text-white/70 text-sm">আসসালামু আলাইকুম</p>
            <h1 className="text-xl font-bold">{patientUser.nameBn || patientUser.name}</h1>
            <p className="text-sm text-white/80">{age} বছর {patientUser.bloodGroup && '• ' + patientUser.bloodGroup}</p>
          </div>
          {patientUser.profileCompleteness < 100 && (
            <div className="bg-white/20 rounded-lg px-2 py-1">
              <span className="text-xs">{patientUser.profileCompleteness}%</span>
            </div>
          )}
        </div>
        
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="bg-white/15 rounded-xl p-2 text-center">
            <p className="text-xl font-bold">{overallScore}</p>
            <p className="text-xs text-white/70">স্কোর</p>
          </div>
          <div className="bg-white/15 rounded-xl p-2 text-center">
            <p className="text-xl font-bold">{patientUser.credits || 0}</p>
            <p className="text-xs text-white/70">ক্রেডিট</p>
          </div>
          <div className="bg-white/15 rounded-xl p-2 text-center">
            <p className="text-xl font-bold">{patientUser.streak || 0}</p>
            <p className="text-xs text-white/70">স্ট্রিক</p>
          </div>
        </div>
      </div>
      
      {/* Profile Incomplete Warning */}
      {patientUser.profileCompleteness < 100 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="font-bold text-amber-800 text-sm">প্রোফাইল অসম্পূর্ণ ({patientUser.profileCompleteness}%)</h3>
              <p className="text-xs text-amber-700 mt-1">
                অনুগ্রহ করে যোগ করুন: {patientUser.missingFields?.slice(0, 3).join(', ')}
              </p>
              <button onClick={() => { setActiveTab('profile'); setShowEditProfile(true); }} className="mt-2 text-xs font-bold text-amber-800 underline">
                এখনই সম্পূর্ণ করুন →
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Health Status */}
      {patientUser.chronicConditions && patientUser.chronicConditions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h2 className="font-bold text-slate-800 mb-3">🏥 স্বাস্থ্য অবস্থা</h2>
          <div className="space-y-2">
            {bodyHealth.map(part => (
              <div key={part.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
                <div className={`w-3 h-3 rounded-full ${part.status === 'ভালো' ? 'bg-emerald-500' : part.status === 'সতর্ক' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                <span className="flex-1 text-sm font-medium">{part.nameBn}</span>
                <span className="text-xs text-slate-500">{part.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setActiveTab('chat')} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-left hover:border-teal-200 transition">
          <span className="text-2xl">🤖</span>
          <h3 className="font-bold text-slate-800 mt-2 text-sm">AI সহকারী</h3>
          <p className="text-xs text-slate-500">সমস্যা জানান</p>
        </button>
        <button onClick={() => navigate('/search')} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-left hover:border-teal-200 transition">
          <span className="text-2xl">👨‍⚕️</span>
          <h3 className="font-bold text-slate-800 mt-2 text-sm">ডাক্তার খুঁজুন</h3>
          <p className="text-xs text-slate-500">অ্যাপয়েন্টমেন্ট</p>
        </button>
      </div>
      
      {/* Medications */}
      {patientUser.currentMedications && patientUser.currentMedications.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <h3 className="font-bold text-blue-800 text-sm mb-2">💊 বর্তমান ওষুধ</h3>
          <div className="flex flex-wrap gap-2">
            {patientUser.currentMedications.map((med, i) => (
              <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                {typeof med === 'string' ? med : med.name}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Allergies */}
      {patientUser.allergies && patientUser.allergies.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <h3 className="font-bold text-red-800 text-sm mb-2">⚠️ এলার্জি</h3>
          <div className="flex flex-wrap gap-2">
            {patientUser.allergies.map((allergy, i) => (
              <span key={i} className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">{allergy}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
  
  // ============ RENDER CHAT ============
  const renderChat = () => (
    <div className="flex flex-col h-[calc(100vh-180px)] lg:h-[calc(100vh-120px)]">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-500 rounded-t-xl p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">🤖</div>
          <div>
            <h3 className="font-bold">নির্ণয় AI সহকারী</h3>
            <p className="text-xs text-white/80">আপনার স্বাস্থ্য সমস্যা জানান</p>
          </div>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
              msg.role === 'user' 
                ? 'bg-teal-500 text-white rounded-tr-md' 
                : 'bg-slate-100 text-slate-800 rounded-tl-md'
            }`}>
              {msg.role === 'model' && <div className="text-xs text-teal-600 font-bold mb-1">🤖 নির্ণয়</div>}
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-md text-sm text-slate-500">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Quick Suggestions */}
      <div className="bg-white border-t border-slate-100 px-4 py-2">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['মাথা ব্যথা', 'বুকে ব্যথা', 'জ্বর', 'পেটে ব্যথা', 'শ্বাসকষ্ট'].map((q, i) => (
            <button key={i} onClick={() => setChatInput(q)} className="px-3 py-1.5 bg-slate-100 rounded-full text-xs whitespace-nowrap hover:bg-slate-200 transition">{q}</button>
          ))}
        </div>
      </div>
      
      {/* Input */}
      <div className="bg-white border-t border-slate-100 p-3 rounded-b-xl">
        <div className="flex gap-2">
          <input 
            type="text" 
            value={chatInput} 
            onChange={(e) => setChatInput(e.target.value)} 
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} 
            placeholder="আপনার সমস্যা লিখুন..." 
            className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none" 
          />
          <button onClick={handleSendMessage} disabled={isTyping || !chatInput.trim()} className="w-11 h-11 bg-teal-500 text-white rounded-xl disabled:opacity-50 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
  
  // ============ RENDER RECORDS ============
  const renderRecords = () => (
    <div className="space-y-4">
      <h2 className="font-bold text-slate-800">📋 স্বাস্থ্য রেকর্ড</h2>
      
      {/* AI Insights */}
      {patientUser.healthRecords?.aiInsights && patientUser.healthRecords.aiInsights.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
          <h3 className="font-bold text-slate-700 text-sm mb-3">🔔 AI পরামর্শ</h3>
          <div className="space-y-2">
            {patientUser.healthRecords.aiInsights.slice(-5).reverse().map((insight, i) => (
              <div key={i} className={`p-3 rounded-lg text-sm ${
                insight.severity === 'critical' ? 'bg-red-50 border border-red-100' :
                insight.severity === 'warning' ? 'bg-amber-50 border border-amber-100' :
                'bg-blue-50 border border-blue-100'
              }`}>
                <p className="text-slate-700">{insight.insight}</p>
                <p className="text-xs text-slate-400 mt-1">{new Date(insight.date).toLocaleDateString('bn-BD')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Consultations */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <h3 className="font-bold text-slate-700 text-sm mb-3">🩺 পরামর্শ ইতিহাস</h3>
        {patientUser.healthRecords?.consultations && patientUser.healthRecords.consultations.length > 0 ? (
          <div className="space-y-2">
            {patientUser.healthRecords.consultations.map((c, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{c.doctorName}</p>
                    <p className="text-xs text-slate-500">{c.specialty}</p>
                  </div>
                  <span className="text-xs text-slate-400">{new Date(c.date).toLocaleDateString('bn-BD')}</span>
                </div>
                <p className="text-sm text-slate-600 mt-2">{c.diagnosis}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-4">এখনো কোনো পরামর্শ নেই</p>
        )}
      </div>
      
      {/* Lab Reports */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <h3 className="font-bold text-slate-700 text-sm mb-3">🔬 ল্যাব রিপোর্ট</h3>
        {patientUser.healthRecords?.labReports && patientUser.healthRecords.labReports.length > 0 ? (
          <div className="space-y-2">
            {patientUser.healthRecords.labReports.map((r, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-lg">
                <div className="flex justify-between">
                  <span className="font-medium text-sm">{r.type}</span>
                  <span className="text-xs text-slate-400">{new Date(r.date).toLocaleDateString('bn-BD')}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-4">এখনো কোনো রিপোর্ট নেই</p>
        )}
      </div>
    </div>
  );
  
  // ============ RENDER PROFILE ============
  const renderProfile = () => (
    <div className="space-y-4">
      {/* Profile Header */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 text-center">
        <img 
          src={patientUser.profileImage || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(patientUser.name) + '&background=0d9488&color=fff&size=200'} 
          alt="" 
          className="w-20 h-20 rounded-full mx-auto border-4 border-teal-100" 
        />
        <h2 className="font-bold text-xl text-slate-800 mt-3">{patientUser.nameBn || patientUser.name}</h2>
        <p className="text-slate-500 text-sm">{patientUser.phone}</p>
        
        <div className="flex justify-center gap-3 mt-3">
          {patientUser.bloodGroup && <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold">{patientUser.bloodGroup}</span>}
          {age > 0 && <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm">{age} বছর</span>}
          {patientUser.gender && <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm">{patientUser.gender === 'male' ? 'পুরুষ' : patientUser.gender === 'female' ? 'মহিলা' : 'অন্যান্য'}</span>}
        </div>
        
        <button onClick={() => setShowEditProfile(true)} className="mt-4 px-6 py-2 bg-teal-500 text-white rounded-xl font-bold text-sm hover:bg-teal-600 transition">
          ✏️ সম্পাদনা করুন
        </button>
      </div>
      
      {/* Profile Completeness */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-700">প্রোফাইল সম্পূর্ণতা</span>
          <span className="text-sm font-bold text-teal-600">{patientUser.profileCompleteness || 0}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full">
          <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: (patientUser.profileCompleteness || 0) + '%' }}></div>
        </div>
        {patientUser.missingFields && patientUser.missingFields.length > 0 && (
          <p className="text-xs text-slate-500 mt-2">অনুপস্থিত: {patientUser.missingFields.join(', ')}</p>
        )}
      </div>
      
      {/* Personal Info */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-700 text-sm mb-3">ব্যক্তিগত তথ্য</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">উচ্চতা</span><span className="font-medium">{patientUser.height ? patientUser.height + ' সেমি' : '-'}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">ওজন</span><span className="font-medium">{patientUser.weight ? patientUser.weight + ' কেজি' : '-'}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">জন্ম তারিখ</span><span className="font-medium">{patientUser.dateOfBirth ? new Date(patientUser.dateOfBirth).toLocaleDateString('bn-BD') : '-'}</span></div>
        </div>
      </div>
      
      {/* Emergency Contact */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-700 text-sm mb-3">🚨 জরুরি যোগাযোগ</h3>
        {patientUser.emergencyContact ? (
          <div className="space-y-1 text-sm">
            <p className="font-medium">{patientUser.emergencyContact.name}</p>
            <p className="text-slate-500">{patientUser.emergencyContact.relation}</p>
            <p className="text-teal-600">{patientUser.emergencyContact.phone}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">জরুরি যোগাযোগ যোগ করুন</p>
        )}
      </div>
      
      {/* Subscription */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl p-4 text-white">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-white/70">সাবস্ক্রিপশন</p>
            <p className="font-bold text-lg capitalize">{patientUser.subscription?.tier || 'Free'}</p>
          </div>
          <button onClick={() => navigate('/pricing')} className="px-4 py-2 bg-white/20 rounded-lg text-sm font-bold hover:bg-white/30 transition">
            আপগ্রেড
          </button>
        </div>
      </div>
      
      {/* Logout */}
      <button onClick={handleLogout} className="w-full py-3 bg-red-500 text-white rounded-xl font-bold">
        লগআউট
      </button>
    </div>
  );
  
  // ============ MAIN LAYOUT ============
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Edit Profile Modal */}
      <ProfileEditModal 
        isOpen={showEditProfile} 
        onClose={() => setShowEditProfile(false)} 
        user={patientUser} 
        onSave={handleProfileSave} 
      />
      
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-slate-200 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <button onClick={() => navigate('/')} className="w-10 h-10 flex items-center justify-center">
            <i className="fas fa-arrow-left text-slate-600"></i>
          </button>
          <h1 className="font-bold text-slate-800">{tabs.find(t => t.id === activeTab)?.label}</h1>
          <button onClick={() => navigate('/search')} className="w-10 h-10 flex items-center justify-center">
            <i className="fas fa-search text-slate-600"></i>
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 pb-24 max-w-3xl mx-auto">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'chat' && renderChat()}
        {activeTab === 'records' && renderRecords()}
        {activeTab === 'profile' && renderProfile()}
      </div>
      
      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 z-50">
        <div className="flex max-w-3xl mx-auto">
          {tabs.map((t) => (
            <button 
              key={t.id} 
              onClick={() => setActiveTab(t.id as any)} 
              className={`flex-1 py-3 flex flex-col items-center gap-1 ${activeTab === t.id ? 'text-teal-600' : 'text-slate-400'}`}
            >
              <span className="text-lg">{t.emoji}</span>
              <span className="text-xs font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
