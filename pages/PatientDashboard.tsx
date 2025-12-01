/**
 * NIRNOY PATIENT DASHBOARD - PRODUCTION v4
 * =========================================
 * Apple Health-inspired design
 * Clean left sidebar, 60-30-10 color rule
 * Built for 1,000,000+ users
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, PatientProfile } from '../contexts/AuthContext';
import { saveFeedback } from '../components/FeedbackWidget';
import { chatWithHealthAssistant } from '../services/geminiService';
import { aiChatService, authService } from '../services/supabaseAuth';

// ============ TYPES ============
type TabId = 'home' | 'doctors' | 'ai' | 'medication' | 'food-scan' | 'quiz' | 'food-chart' | 'incentives' | 'advanced-ai' | 'feedback';

interface NavItem {
  id: TabId;
  icon: string;
  label: string;
  labelBn: string;
  paid?: boolean;
  comingSoon?: boolean;
}

// ============ NAVIGATION CONFIG ============
const NAV_ITEMS: NavItem[] = [
  { id: 'home', icon: '🏠', label: 'Home', labelBn: 'হোম' },
  { id: 'doctors', icon: '👨‍⚕️', label: 'Doctors', labelBn: 'ডাক্তার' },
  { id: 'ai', icon: '🤖', label: 'AI Assistant', labelBn: 'এআই সহায়ক' },
  { id: 'medication', icon: '💊', label: 'Medication', labelBn: 'ওষুধ রিমাইন্ডার', paid: true },
  { id: 'food-scan', icon: '📷', label: 'Ki Khacchi', labelBn: 'কি খাচ্ছি', paid: true },
  { id: 'quiz', icon: '🎯', label: 'Health Quiz', labelBn: 'স্বাস্থ্য কুইজ', paid: true },
  { id: 'food-chart', icon: '🥗', label: 'Food Chart', labelBn: 'খাদ্য তালিকা', paid: true },
  { id: 'incentives', icon: '🎁', label: 'Rewards', labelBn: 'পুরস্কার' },
  { id: 'advanced-ai', icon: '🧠', label: 'Advanced AI', labelBn: 'অ্যাডভান্সড এআই', paid: true, comingSoon: true },
  { id: 'feedback', icon: '💬', label: 'Feedback', labelBn: 'মতামত' },
];

// Pricing plans
const PLANS = [
  { id: 'free', name: 'Free', nameBn: 'ফ্রি', price: 0, features: ['Basic AI Chat', 'Profile'], featuresBn: ['বেসিক এআই', 'প্রোফাইল'] },
  { id: 'basic', name: 'Basic', nameBn: 'বেসিক', price: 99, features: ['Unlimited AI', 'Health Records'], featuresBn: ['আনলিমিটেড এআই', 'স্বাস্থ্য রেকর্ড'] },
  { id: 'premium', name: 'Premium', nameBn: 'প্রিমিয়াম', price: 299, features: ['All Features', 'Priority Support'], featuresBn: ['সব ফিচার', 'অগ্রাধিকার'], popular: true },
  { id: 'family', name: 'Family', nameBn: 'ফ্যামিলি', price: 499, features: ['5 Members', 'Emergency Line'], featuresBn: ['৫ সদস্য', 'জরুরি লাইন'] }
];

// ============ COMPONENT ============
export const PatientDashboard: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { user, role, logout, isLoading, updateProfile } = useAuth();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showPricing, setShowPricing] = useState(false);
  
  // AI Chat state
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{role: string; content: string; timestamp?: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Profile state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [editForm, setEditForm] = useState({ name: '', email: '', dateOfBirth: '', gender: '', bloodGroup: '', heightCm: '', weightKg: '', chronicConditions: '', allergies: '', emergencyContactName: '', emergencyContactPhone: '' });
  
  // Feedback state
  const [fbText, setFbText] = useState('');
  const [fbCat, setFbCat] = useState<'general' | 'bug' | 'feature' | 'complaint'>('general');
  const [fbSent, setFbSent] = useState(false);
  
  const [doctorVisits] = useState<any[]>([]);
  
  const patientUser = useMemo(() => (user && role === 'patient') ? user as PatientProfile : null, [user, role]);

  // Health calculations
  const healthScore = useMemo(() => {
    if (!patientUser) return 75;
    let score = 75;
    if (patientUser.heightCm && patientUser.weightKg) {
      const bmi = patientUser.weightKg / Math.pow(patientUser.heightCm / 100, 2);
      if (bmi >= 18.5 && bmi <= 24.9) score += 10;
      else if (bmi < 18.5 || bmi > 30) score -= 10;
    }
    if (patientUser.chronicConditions?.length) score -= patientUser.chronicConditions.length * 5;
    if (patientUser.allergies?.length) score -= patientUser.allergies.length * 2;
    return Math.max(20, Math.min(100, score));
  }, [patientUser]);

  const bmi = useMemo(() => {
    if (!patientUser?.heightCm || !patientUser?.weightKg) return null;
    return (patientUser.weightKg / Math.pow(patientUser.heightCm / 100, 2)).toFixed(1);
  }, [patientUser]);

  const bmiCategory = useMemo(() => {
    if (!bmi) return null;
    const b = parseFloat(bmi);
    if (b < 18.5) return { label: 'কম ওজন', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    if (b < 25) return { label: 'স্বাভাবিক', color: 'text-green-600', bg: 'bg-green-100' };
    if (b < 30) return { label: 'অতিরিক্ত ওজন', color: 'text-orange-600', bg: 'bg-orange-100' };
    return { label: 'স্থূলতা', color: 'text-red-600', bg: 'bg-red-100' };
  }, [bmi]);

  const patientContext = useMemo(() => {
    if (!patientUser) return '';
    const parts = [`Name: ${patientUser.name}`];
    if (patientUser.gender) parts.push(`Gender: ${patientUser.gender}`);
    if (patientUser.dateOfBirth) parts.push(`DOB: ${patientUser.dateOfBirth}`);
    if (patientUser.bloodGroup) parts.push(`Blood: ${patientUser.bloodGroup}`);
    if (patientUser.chronicConditions?.length) parts.push(`Conditions: ${patientUser.chronicConditions.join(', ')}`);
    if (patientUser.allergies?.length) parts.push(`Allergies: ${patientUser.allergies.join(', ')}`);
    if (patientUser.heightCm) parts.push(`Height: ${patientUser.heightCm}cm`);
    if (patientUser.weightKg) parts.push(`Weight: ${patientUser.weightKg}kg`);
    return parts.join(', ');
  }, [patientUser]);

  useEffect(() => {
    if (!isLoading && (!user || role !== 'patient')) {
      navigate('/patient-auth', { replace: true });
    }
  }, [user, role, isLoading, navigate]);

  useEffect(() => {
    if (patientUser) {
      setEditForm({
        name: patientUser.name || '', email: patientUser.email || '', dateOfBirth: patientUser.dateOfBirth || '',
        gender: patientUser.gender || '', bloodGroup: patientUser.bloodGroup || '',
        heightCm: patientUser.heightCm ? String(patientUser.heightCm) : '', 
        weightKg: patientUser.weightKg ? String(patientUser.weightKg) : '',
        chronicConditions: (patientUser.chronicConditions || []).join(', '), 
        allergies: (patientUser.allergies || []).join(', '),
        emergencyContactName: patientUser.emergencyContactName || '', 
        emergencyContactPhone: patientUser.emergencyContactPhone || ''
      });
    }
  }, [patientUser]);

  useEffect(() => {
    if (patientUser && messages.length === 0) {
      setMessages([{ role: 'assistant', content: `আসসালামু আলাইকুম ${patientUser.name}! 👋\n\nআমি নির্ণয় এআই। আপনার স্বাস্থ্য সমস্যা বলুন।`, timestamp: new Date().toISOString() }]);
    }
  }, [patientUser, messages.length]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (activeTab === 'ai') setTimeout(() => inputRef.current?.focus(), 200); }, [activeTab]);

  const loadChatHistory = useCallback(async () => {
    if (!patientUser) return;
    try {
      const history = await aiChatService.getConversations(patientUser.id, 20);
      setChatHistory(history);
    } catch (e) { console.error('[Dashboard] Chat history error:', e); }
  }, [patientUser]);

  useEffect(() => { if (activeTab === 'ai') loadChatHistory(); }, [activeTab, loadChatHistory]);

  const handleLogout = () => { logout(); onLogout?.(); navigate('/', { replace: true }); };

  const handleSend = async () => {
    if (!chatInput.trim() || isTyping) return;
    const msg = chatInput.trim();
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg, timestamp: new Date().toISOString() }]);
    setIsTyping(true);
    
    try {
      const prevContext = await aiChatService.getLatestMessages(patientUser?.id || '');
      const allHistory = [...prevContext, ...messages].map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`);
      const reply = await chatWithHealthAssistant(msg, allHistory, patientContext);
      setMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: new Date().toISOString() }]);
      
      if (patientUser) {
        await aiChatService.saveConversation(patientUser.id, [...messages, { role: 'user', content: msg }, { role: 'assistant', content: reply }], msg.substring(0, 50));
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'দুঃখিত, সমস্যা হয়েছে। আবার চেষ্টা করুন।', timestamp: new Date().toISOString() }]);
    }
    setIsTyping(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleSaveProfile = async () => {
    if (!patientUser || !updateProfile) return;
    setSaving(true); setSaveMsg('');
    
    const updates = {
      name: editForm.name, email: editForm.email || undefined, dateOfBirth: editForm.dateOfBirth || undefined,
      gender: editForm.gender as any || undefined, bloodGroup: editForm.bloodGroup || undefined,
      heightCm: editForm.heightCm ? parseInt(editForm.heightCm) : undefined,
      weightKg: editForm.weightKg ? parseFloat(editForm.weightKg) : undefined,
      chronicConditions: editForm.chronicConditions ? editForm.chronicConditions.split(',').map(s => s.trim()).filter(Boolean) : [],
      allergies: editForm.allergies ? editForm.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
      emergencyContactName: editForm.emergencyContactName || undefined,
      emergencyContactPhone: editForm.emergencyContactPhone || undefined
    };
    
    const success = await updateProfile(updates);
    if (success) {
      await authService.refreshPatientData(patientUser.id);
      setSaveMsg('✅ সংরক্ষিত!'); setIsEditing(false);
    } else { setSaveMsg('❌ ব্যর্থ'); }
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const submitFeedback = async () => {
    if (!fbText.trim() || !patientUser) return;
    await saveFeedback({
      id: Date.now().toString(), type: fbCat, mood: 'neutral', message: fbText,
      page: '/patient-dashboard', userAgent: navigator.userAgent, timestamp: new Date().toISOString(),
      userId: patientUser.id, userRole: 'patient', userName: patientUser.name, status: 'new'
    });
    setFbSent(true); setFbText('');
    setTimeout(() => setFbSent(false), 3000);
  };

  const isPremium = patientUser?.subscriptionTier === 'premium' || patientUser?.subscriptionTier === 'family';

  if (isLoading || !patientUser) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  // Health ring component (Apple-style)
  const HealthRing = ({ value, max, color, size = 120, label }: { value: number; max: number; color: string; size?: number; label: string }) => {
    const percentage = (value / max) * 100;
    const circumference = 2 * Math.PI * 40;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    
    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{value}</span>
          <span className="text-xs text-gray-500">{label}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* LEFT SIDEBAR */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gradient-to-b from-blue-600 to-blue-700 text-white flex flex-col transition-all duration-300 fixed h-full z-40`}>
        <div className="p-4 border-b border-blue-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-blue-600 font-bold text-xl">ন</span>
            </div>
            {sidebarOpen && <span className="font-bold text-lg">নির্ণয়</span>}
          </div>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${activeTab === item.id ? 'bg-white/20 border-r-4 border-white' : 'hover:bg-white/10'}`}>
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && (
                <div className="flex-1">
                  <span className="block text-sm font-medium">{item.labelBn}</span>
                  {item.paid && !isPremium && <span className="text-xs text-blue-200">🔒 প্রিমিয়াম</span>}
                  {item.comingSoon && <span className="text-xs text-yellow-300">শীঘ্রই আসছে</span>}
                </div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-blue-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="font-bold">{patientUser.name.charAt(0)}</span>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{patientUser.name}</p>
                <p className="text-xs text-blue-200">{isPremium ? '⭐ Premium' : 'Free'}</p>
              </div>
            )}
          </div>
          {sidebarOpen && <button onClick={handleLogout} className="w-full mt-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors">লগআউট</button>}
        </div>

        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="absolute -right-3 top-20 w-6 h-6 bg-white text-blue-600 rounded-full shadow-lg flex items-center justify-center text-xs font-bold">
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
        <header className="bg-white/80 backdrop-blur-lg border-b px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">{NAV_ITEMS.find(n => n.id === activeTab)?.labelBn}</h1>
              <p className="text-sm text-gray-500">{NAV_ITEMS.find(n => n.id === activeTab)?.label}</p>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setShowPricing(true)} className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm rounded-full shadow-md hover:shadow-lg transition-shadow">
                {isPremium ? '⭐ Premium' : '🚀 আপগ্রেড'}
              </button>
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* HOME TAB - Apple Health Style */}
          {activeTab === 'home' && (
            <div className="space-y-6">
              {/* Health Summary Card */}
              <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">আজকের স্বাস্থ্য</p>
                    <h2 className="text-3xl font-bold mt-1">হ্যালো, {patientUser.name.split(' ')[0]}!</h2>
                    <p className="text-blue-100 mt-2 text-sm">আপনার স্বাস্থ্য স্কোর চমৎকার</p>
                  </div>
                  <HealthRing value={healthScore} max={100} color="#ffffff" size={100} label="/100" />
                </div>
              </div>

              {/* Health Metrics Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* BMI Card */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="text-purple-600">⚖️</span>
                    </div>
                    <span className="text-sm font-medium text-gray-600">BMI</span>
                  </div>
                  {bmi ? (
                    <>
                      <p className="text-2xl font-bold text-gray-800">{bmi}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${bmiCategory?.bg} ${bmiCategory?.color}`}>{bmiCategory?.label}</span>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400">তথ্য দিন</p>
                  )}
                </div>

                {/* Height Card */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-green-600">📏</span>
                    </div>
                    <span className="text-sm font-medium text-gray-600">উচ্চতা</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{patientUser.heightCm || '-'}</p>
                  <span className="text-xs text-gray-400">সেন্টিমিটার</span>
                </div>

                {/* Weight Card */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <span className="text-orange-600">🏋️</span>
                    </div>
                    <span className="text-sm font-medium text-gray-600">ওজন</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{patientUser.weightKg || '-'}</p>
                  <span className="text-xs text-gray-400">কেজি</span>
                </div>

                {/* Blood Group Card */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <span className="text-red-600">🩸</span>
                    </div>
                    <span className="text-sm font-medium text-gray-600">রক্তের গ্রুপ</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{patientUser.bloodGroup || '-'}</p>
                  <span className="text-xs text-gray-400">Blood Type</span>
                </div>
              </div>

              {/* Health Alerts */}
              {(patientUser.chronicConditions?.length || patientUser.allergies?.length) ? (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200">
                  <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center text-sm">⚠️</span>
                    স্বাস্থ্য সতর্কতা
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {patientUser.chronicConditions?.map((c, i) => (
                      <span key={i} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-medium">{c}</span>
                    ))}
                    {patientUser.allergies?.map((a, i) => (
                      <span key={i} className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">🤧 {a}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Quick Actions */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: '🤖', label: 'এআই সাহায্য', tab: 'ai' as TabId, color: 'from-blue-400 to-blue-600' },
                  { icon: '👨‍⚕️', label: 'ডাক্তার', tab: 'doctors' as TabId, color: 'from-green-400 to-green-600' },
                  { icon: '📷', label: 'কি খাচ্ছি', tab: 'food-scan' as TabId, color: 'from-purple-400 to-purple-600' },
                  { icon: '🎁', label: 'পুরস্কার', tab: 'incentives' as TabId, color: 'from-pink-400 to-pink-600' },
                ].map((action, i) => (
                  <button key={i} onClick={() => setActiveTab(action.tab)}
                    className={`bg-gradient-to-br ${action.color} rounded-2xl p-4 text-white shadow-lg hover:shadow-xl transition-shadow`}>
                    <span className="text-3xl block mb-2">{action.icon}</span>
                    <span className="text-sm font-medium">{action.label}</span>
                  </button>
                ))}
              </div>

              {/* Profile Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">👤</span>
                    প্রোফাইল
                  </h3>
                  <button onClick={() => setIsEditing(!isEditing)} className="text-blue-600 text-sm font-medium hover:underline">
                    {isEditing ? 'বাতিল' : 'সম্পাদনা'}
                  </button>
                </div>
                
                {isEditing ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      { k: 'name', l: 'নাম', t: 'text' }, { k: 'email', l: 'ইমেইল', t: 'email' },
                      { k: 'dateOfBirth', l: 'জন্ম তারিখ', t: 'date' },
                      { k: 'gender', l: 'লিঙ্গ', sel: ['', 'male', 'female'] },
                      { k: 'bloodGroup', l: 'রক্ত', sel: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
                      { k: 'heightCm', l: 'উচ্চতা (cm)', t: 'number' },
                      { k: 'weightKg', l: 'ওজন (kg)', t: 'number' },
                      { k: 'chronicConditions', l: 'রোগ (কমা দিয়ে)', t: 'text' },
                      { k: 'allergies', l: 'এলার্জি (কমা দিয়ে)', t: 'text' },
                    ].map(f => (
                      <div key={f.k}>
                        <label className="text-sm text-gray-600 block mb-1">{f.l}</label>
                        {f.sel ? (
                          <select value={(editForm as any)[f.k]} onChange={e => setEditForm({ ...editForm, [f.k]: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            {f.sel.map(o => <option key={o} value={o}>{o || 'নির্বাচন করুন'}</option>)}
                          </select>
                        ) : (
                          <input type={f.t || 'text'} value={(editForm as any)[f.k]} onChange={e => setEditForm({ ...editForm, [f.k]: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        )}
                      </div>
                    ))}
                    <div className="md:col-span-2 flex gap-3">
                      <button onClick={handleSaveProfile} disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors">
                        {saving ? 'সংরক্ষণ হচ্ছে...' : '💾 সংরক্ষণ'}
                      </button>
                      {saveMsg && <span className="self-center text-sm font-medium">{saveMsg}</span>}
                    </div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      { l: 'নাম', v: patientUser.name },
                      { l: 'ফোন', v: patientUser.phone },
                      { l: 'জন্ম', v: patientUser.dateOfBirth || '-' },
                      { l: 'লিঙ্গ', v: patientUser.gender === 'male' ? 'পুরুষ' : patientUser.gender === 'female' ? 'মহিলা' : '-' },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-500">{item.l}</span>
                        <span className="font-medium text-gray-800">{item.v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DOCTORS TAB */}
          {activeTab === 'doctors' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">👨‍⚕️</span>
                  আপনার ডাক্তার
                </h2>
                {doctorVisits.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-4xl">🏥</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-700">কোনো ডাক্তার ভিজিট নেই</h3>
                    <p className="text-gray-500 mt-2">ডাক্তারের কাছে গেলে তথ্য এখানে দেখা যাবে</p>
                    <button onClick={() => navigate('/doctor-search')} className="mt-4 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
                      ডাক্তার খুঁজুন
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {doctorVisits.map((visit, i) => (
                      <div key={i} className="p-4 bg-gray-50 rounded-xl flex items-center gap-4 hover:bg-gray-100 transition-colors cursor-pointer">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl">👨‍⚕️</div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">{visit.doctorName}</h4>
                          <p className="text-sm text-gray-500">{visit.specialty} • {visit.date}</p>
                        </div>
                        <span className="text-gray-400">→</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI ASSISTANT TAB */}
          {activeTab === 'ai' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-[calc(100vh-200px)] flex flex-col">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
                <h2 className="font-bold flex items-center gap-2">🤖 নির্ণয় এআই সহায়ক</h2>
                <p className="text-sm text-blue-100">Shift+Enter = নতুন লাইন</p>
              </div>
              
              {chatHistory.length > 0 && (
                <div className="px-4 py-2 bg-gray-50 border-b">
                  <details className="text-sm">
                    <summary className="cursor-pointer text-blue-600 font-medium">📜 পূর্ববর্তী কথোপকথন ({chatHistory.length})</summary>
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      {chatHistory.slice(0, 5).map((conv, i) => (
                        <button key={i} onClick={() => conv.messages && setMessages(conv.messages)} className="block w-full text-left p-2 bg-white rounded-lg border text-xs hover:bg-blue-50 transition-colors">
                          {conv.summary || 'কথোপকথন'} - {new Date(conv.created_at).toLocaleDateString('bn-BD')}
                        </button>
                      ))}
                    </div>
                  </details>
                </div>
              )}
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] p-3 rounded-2xl text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-md' : 'bg-gray-100 text-gray-800 rounded-bl-md'}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {isTyping && <div className="flex justify-start"><div className="bg-gray-100 p-3 rounded-2xl rounded-bl-md text-sm animate-pulse">চিন্তা করছি...</div></div>}
                <div ref={chatEndRef} />
              </div>
              
              <div className="border-t p-4 flex gap-3">
                <textarea ref={inputRef} value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="আপনার সমস্যা লিখুন..." className="flex-1 px-4 py-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={2} disabled={isTyping} />
                <button onClick={handleSend} disabled={isTyping || !chatInput.trim()} className="px-6 bg-blue-600 text-white rounded-xl disabled:bg-gray-300 self-end py-3 font-medium hover:bg-blue-700 transition-colors">পাঠান</button>
              </div>
            </div>
          )}

          {/* PAID FEATURE TABS */}
          {['medication', 'food-scan', 'quiz', 'food-chart'].includes(activeTab) && (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              {isPremium ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">{NAV_ITEMS.find(n => n.id === activeTab)?.icon}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">{NAV_ITEMS.find(n => n.id === activeTab)?.labelBn}</h3>
                  <p className="text-gray-500 mt-2">শীঘ্রই আসছে</p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">🔒</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800">প্রিমিয়াম ফিচার</h3>
                  <p className="text-gray-500 mt-2">এই ফিচার ব্যবহার করতে প্রিমিয়াম নিন</p>
                  <button onClick={() => setShowPricing(true)} className="mt-4 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition-shadow">
                    🚀 আপগ্রেড করুন
                  </button>
                </div>
              )}
            </div>
          )}

          {/* INCENTIVES TAB */}
          {activeTab === 'incentives' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
                <h2 className="text-xl font-bold mb-2">🎁 পুরস্কার প্রোগ্রাম</h2>
                <p className="text-pink-100">পয়েন্ট অর্জন করুন, পুরস্কার জিতুন!</p>
                <div className="mt-4 text-3xl font-bold">{patientUser.quizPoints || 0} পয়েন্ট</div>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { icon: '🏆', title: 'দৈনিক চেক-ইন', desc: '১০ পয়েন্ট', done: false },
                  { icon: '💪', title: 'প্রোফাইল সম্পূর্ণ', desc: '৫০ পয়েন্ট', done: !!(patientUser.heightCm && patientUser.weightKg) },
                  { icon: '🎯', title: 'কুইজ খেলুন', desc: '২০ পয়েন্ট', done: false },
                ].map((r, i) => (
                  <div key={i} className={`bg-white p-5 rounded-2xl border-2 transition-all ${r.done ? 'border-green-400 bg-green-50' : 'border-gray-100 hover:border-blue-200'}`}>
                    <div className="text-3xl mb-3">{r.icon}</div>
                    <h3 className="font-bold text-gray-800">{r.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{r.desc}</p>
                    {r.done && <span className="inline-block mt-2 text-green-600 text-sm font-medium">✓ সম্পন্ন</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ADVANCED AI TAB */}
          {activeTab === 'advanced-ai' && (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl">🧠</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800">অ্যাডভান্সড এআই</h3>
              <p className="text-gray-500 mt-2 max-w-md mx-auto">আপনার সমস্ত ডেটা বিশ্লেষণ করে ভবিষ্যত স্বাস্থ্য পূর্বাভাস দেবে</p>
              <div className="mt-6 inline-block px-5 py-2 bg-yellow-100 text-yellow-700 rounded-full font-medium">🚧 শীঘ্রই আসছে</div>
            </div>
          )}

          {/* FEEDBACK TAB */}
          {activeTab === 'feedback' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">💬</span>
                মতামত দিন
              </h2>
              {fbSent ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">✅</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">ধন্যবাদ!</h3>
                  <p className="text-gray-500">আপনার মতামত পাঠানো হয়েছে</p>
                </div>
              ) : (
                <div className="max-w-lg">
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 block mb-2">বিভাগ</label>
                    <select value={fbCat} onChange={e => setFbCat(e.target.value as any)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="general">সাধারণ</option>
                      <option value="bug">সমস্যা রিপোর্ট</option>
                      <option value="feature">নতুন ফিচার</option>
                      <option value="complaint">অভিযোগ</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 block mb-2">আপনার মতামত</label>
                    <textarea value={fbText} onChange={e => setFbText(e.target.value)} placeholder="লিখুন..." className="w-full px-4 py-3 border border-gray-200 rounded-xl h-32 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <button onClick={submitFeedback} disabled={!fbText.trim()} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium disabled:bg-gray-300 hover:bg-blue-700 transition-colors">
                    পাঠান
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* PRICING MODAL */}
      {showPricing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPricing(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">প্ল্যান বেছে নিন</h2>
              <button onClick={() => setShowPricing(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200">✕</button>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              {PLANS.map(plan => (
                <div key={plan.id} className={`p-5 rounded-2xl border-2 transition-all ${plan.popular ? 'border-blue-500 bg-blue-50 shadow-lg' : 'border-gray-200 hover:border-blue-300'}`}>
                  {plan.popular && <div className="text-xs font-bold text-blue-600 mb-2">⭐ জনপ্রিয়</div>}
                  <h3 className="font-bold text-lg text-gray-800">{plan.nameBn}</h3>
                  <div className="text-2xl font-bold text-gray-800 mt-2">৳{plan.price}<span className="text-sm font-normal text-gray-500">/মাস</span></div>
                  <ul className="mt-4 space-y-2">
                    {plan.featuresBn.map((f, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="text-green-500">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <button className={`w-full mt-4 py-2 rounded-xl font-medium transition-colors ${
                    patientUser.subscriptionTier === plan.id 
                      ? 'bg-gray-100 text-gray-500 cursor-default' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}>
                    {patientUser.subscriptionTier === plan.id ? 'বর্তমান' : 'নির্বাচন'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;
