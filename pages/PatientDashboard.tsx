/**
 * NIRNOY PATIENT DASHBOARD - PRODUCTION v3
 * =========================================
 * Clean left sidebar, 60-30-10 color rule
 * Built for 1,000,000+ users
 * All data in Supabase - NO localStorage
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, PatientProfile } from '../contexts/AuthContext';
import { saveFeedback, getUserFeedbacks, FeedbackData } from '../components/FeedbackWidget';
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

// ============ COMPONENT ============
export const PatientDashboard: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { user, role, logout, isLoading, updateProfile } = useAuth();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Core state
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
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
  
  // Quiz state
  const [quizActive, setQuizActive] = useState(false);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  
  // Feedback state
  const [fbText, setFbText] = useState('');
  const [fbCat, setFbCat] = useState<'general' | 'bug' | 'feature' | 'complaint'>('general');
  const [fbSent, setFbSent] = useState(false);
  const [myFeedbacks, setMyFeedbacks] = useState<FeedbackData[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  
  // Doctor visits (mock for now, will be from Supabase)
  const [doctorVisits, setDoctorVisits] = useState<any[]>([]);
  
  const patientUser = useMemo(() => (user && role === 'patient') ? user as PatientProfile : null, [user, role]);

  // Health score calculation
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

  // Patient context for AI
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

  // Auth check
  useEffect(() => {
    if (!isLoading && (!user || role !== 'patient')) {
      navigate('/patient-auth', { replace: true });
    }
  }, [user, role, isLoading, navigate]);

  // Load profile into form
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

  // Initialize AI chat
  useEffect(() => {
    if (patientUser && messages.length === 0) {
      setMessages([{ 
        role: 'assistant', 
        content: `আসসালামু আলাইকুম ${patientUser.name}! 👋\n\nআমি নির্ণয় এআই। আপনার স্বাস্থ্য সমস্যা বলুন।`,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [patientUser, messages.length]);

  // Scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  
  // Focus input on AI tab
  useEffect(() => {
    if (activeTab === 'ai') setTimeout(() => inputRef.current?.focus(), 200);
  }, [activeTab]);

  // Load chat history
  const loadChatHistory = useCallback(async () => {
    if (!patientUser) return;
    try {
      const history = await aiChatService.getConversations(patientUser.id, 20);
      setChatHistory(history);
    } catch (e) { console.error('[Dashboard] Chat history error:', e); }
  }, [patientUser]);

  useEffect(() => {
    if (activeTab === 'ai') loadChatHistory();
  }, [activeTab, loadChatHistory]);

  const handleLogout = () => { logout(); onLogout?.(); navigate('/', { replace: true }); };

  // AI Chat
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
      
      // Save conversation
      if (patientUser) {
        const summary = msg.substring(0, 50);
        await aiChatService.saveConversation(patientUser.id, [...messages, { role: 'user', content: msg }, { role: 'assistant', content: reply }], summary);
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

  // Save profile
  const handleSaveProfile = async () => {
    if (!patientUser || !updateProfile) return;
    setSaving(true);
    setSaveMsg('');
    
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
      setSaveMsg('✅ সংরক্ষিত!');
      setIsEditing(false);
    } else {
      setSaveMsg('❌ ব্যর্থ');
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  // Submit feedback
  const submitFeedback = async () => {
    if (!fbText.trim() || !patientUser) return;
    await saveFeedback({
      id: Date.now().toString(), type: fbCat, mood: 'neutral', message: fbText,
      page: '/patient-dashboard', userAgent: navigator.userAgent, timestamp: new Date().toISOString(),
      userId: patientUser.id, userRole: 'patient', userName: patientUser.name, status: 'new'
    });
    setFbSent(true);
    setFbText('');
    setTimeout(() => setFbSent(false), 3000);
  };

  // Check if user has premium
  const isPremium = patientUser?.subscriptionTier === 'premium' || patientUser?.subscriptionTier === 'family';

  // Load user's feedbacks
  const loadMyFeedbacks = useCallback(async () => {
    if (!patientUser) return;
    setLoadingFeedbacks(true);
    try {
      const feedbacks = await getUserFeedbacks(patientUser.id);
      setMyFeedbacks(feedbacks);
      console.log('[Dashboard] Loaded', feedbacks.length, 'user feedbacks');
    } catch (e) {
      console.error('[Dashboard] Feedback load error:', e);
    }
    setLoadingFeedbacks(false);
  }, [patientUser]);

  // Load feedbacks when tab is active
  useEffect(() => {
    if (activeTab === 'feedback') loadMyFeedbacks();
  }, [activeTab, loadMyFeedbacks]);

  // Loading state
  if (isLoading || !patientUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* LEFT SIDEBAR - 60% Blue */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-blue-600 text-white flex flex-col transition-all duration-300 fixed h-full z-40`}>
        {/* Logo */}
        <div className="p-4 border-b border-blue-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold text-xl">ন</span>
            </div>
            {sidebarOpen && <span className="font-bold text-lg">নির্ণয়</span>}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                activeTab === item.id 
                  ? 'bg-blue-700 border-r-4 border-white' 
                  : 'hover:bg-blue-500'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && (
                <div className="flex-1">
                  <span className="block text-sm font-medium">{item.labelBn}</span>
                  {item.paid && !isPremium && (
                    <span className="text-xs text-blue-200">🔒 প্রিমিয়াম</span>
                  )}
                  {item.comingSoon && (
                    <span className="text-xs text-yellow-300">শীঘ্রই আসছে</span>
                  )}
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-blue-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="font-bold">{patientUser.name.charAt(0)}</span>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{patientUser.name}</p>
                <p className="text-xs text-blue-200">{isPremium ? '⭐ Premium' : 'Free'}</p>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button onClick={handleLogout} className="w-full mt-3 py-2 bg-blue-500 hover:bg-blue-400 rounded text-sm">
              লগআউট
            </button>
          )}
        </div>

        {/* Toggle */}
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white text-blue-600 rounded-full shadow flex items-center justify-center text-xs"
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </aside>

      {/* MAIN CONTENT - 30% White/Light, 10% Accent */}
      <main className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
        {/* Header */}
        <header className="bg-white border-b px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {NAV_ITEMS.find(n => n.id === activeTab)?.labelBn}
              </h1>
              <p className="text-sm text-gray-500">
                {NAV_ITEMS.find(n => n.id === activeTab)?.label}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">{patientUser.name}</p>
                <p className="text-xs text-gray-500">{patientUser.phone}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6">
          {/* HOME TAB */}
          {activeTab === 'home' && (
            <div className="space-y-6">
              {/* Health Score Card */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">স্বাস্থ্য স্কোর</h2>
                    <p className="text-blue-100">আপনার সামগ্রিক স্বাস্থ্য অবস্থা</p>
                  </div>
                  <div className="text-center">
                    <div className="text-5xl font-bold">{healthScore}</div>
                    <div className="text-sm text-blue-200">/100</div>
                  </div>
                </div>
                <div className="mt-4 bg-blue-500 rounded-full h-3">
                  <div className="bg-white rounded-full h-3 transition-all" style={{ width: `${healthScore}%` }}></div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: '📏', value: patientUser.heightCm ? `${patientUser.heightCm} cm` : '-', label: 'উচ্চতা' },
                  { icon: '⚖️', value: patientUser.weightKg ? `${patientUser.weightKg} kg` : '-', label: 'ওজন' },
                  { icon: '🩸', value: patientUser.bloodGroup || '-', label: 'রক্তের গ্রুপ' },
                  { icon: '🏆', value: patientUser.quizPoints || 0, label: 'পয়েন্ট' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 border">
                    <div className="text-2xl mb-2">{stat.icon}</div>
                    <div className="text-xl font-bold text-gray-800">{stat.value}</div>
                    <div className="text-sm text-gray-500">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Health Alerts */}
              {(patientUser.chronicConditions?.length || patientUser.allergies?.length) ? (
                <div className="bg-white rounded-xl p-4 border">
                  <h3 className="font-bold text-gray-800 mb-3">⚠️ স্বাস্থ্য সতর্কতা</h3>
                  <div className="flex flex-wrap gap-2">
                    {patientUser.chronicConditions?.map((c, i) => (
                      <span key={i} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">{c}</span>
                    ))}
                    {patientUser.allergies?.map((a, i) => (
                      <span key={i} className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">এলার্জি: {a}</span>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Profile Summary */}
              <div className="bg-white rounded-xl p-4 border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800">👤 প্রোফাইল</h3>
                  <button onClick={() => { setActiveTab('home'); setIsEditing(true); }} className="text-blue-600 text-sm">সম্পাদনা →</button>
                </div>
                {isEditing ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      { k: 'name', l: 'নাম' }, { k: 'email', l: 'ইমেইল' },
                      { k: 'dateOfBirth', l: 'জন্ম তারিখ', t: 'date' },
                      { k: 'gender', l: 'লিঙ্গ', sel: ['', 'male', 'female'] },
                      { k: 'bloodGroup', l: 'রক্তের গ্রুপ', sel: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
                      { k: 'heightCm', l: 'উচ্চতা (cm)', t: 'number' },
                      { k: 'weightKg', l: 'ওজন (kg)', t: 'number' },
                      { k: 'chronicConditions', l: 'দীর্ঘমেয়াদী রোগ' },
                      { k: 'allergies', l: 'এলার্জি' },
                    ].map(f => (
                      <div key={f.k}>
                        <label className="text-sm text-gray-600 block mb-1">{f.l}</label>
                        {f.sel ? (
                          <select value={(editForm as any)[f.k]} onChange={e => setEditForm({ ...editForm, [f.k]: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                            {f.sel.map(o => <option key={o} value={o}>{o || '-'}</option>)}
                          </select>
                        ) : (
                          <input type={f.t || 'text'} value={(editForm as any)[f.k]} onChange={e => setEditForm({ ...editForm, [f.k]: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                        )}
                      </div>
                    ))}
                    <div className="md:col-span-2 flex gap-2">
                      <button onClick={() => setIsEditing(false)} className="px-4 py-2 border rounded-lg">বাতিল</button>
                      <button onClick={handleSaveProfile} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                        {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ'}
                      </button>
                      {saveMsg && <span className="self-center text-sm">{saveMsg}</span>}
                    </div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-500">নাম:</span> <span className="font-medium">{patientUser.name}</span></div>
                    <div><span className="text-gray-500">ফোন:</span> <span className="font-medium">{patientUser.phone}</span></div>
                    <div><span className="text-gray-500">জন্ম:</span> <span className="font-medium">{patientUser.dateOfBirth || '-'}</span></div>
                    <div><span className="text-gray-500">লিঙ্গ:</span> <span className="font-medium">{patientUser.gender || '-'}</span></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DOCTORS TAB */}
          {activeTab === 'doctors' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 border">
                <h2 className="text-lg font-bold text-gray-800 mb-4">👨‍⚕️ আপনার ডাক্তার</h2>
                {doctorVisits.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">🏥</div>
                    <h3 className="text-lg font-medium text-gray-700">কোনো ডাক্তার ভিজিট নেই</h3>
                    <p className="text-gray-500 mt-2">আপনি যখন ডাক্তারের কাছে যাবেন, তাদের তথ্য এখানে দেখা যাবে।</p>
                    <button onClick={() => navigate('/doctors')} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg">
                      ডাক্তার খুঁজুন
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {doctorVisits.map((visit, i) => (
                      <div key={i} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-xl">👨‍⚕️</span>
                          </div>
                          <div>
                            <h4 className="font-medium">{visit.doctorName}</h4>
                            <p className="text-sm text-gray-500">{visit.specialty}</p>
                            <p className="text-xs text-gray-400">{visit.date}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI ASSISTANT TAB */}
          {activeTab === 'ai' && (
            <div className="bg-white rounded-xl border overflow-hidden h-[calc(100vh-200px)] flex flex-col">
              <div className="bg-blue-600 p-4 text-white">
                <h2 className="font-bold">🤖 নির্ণয় এআই সহায়ক</h2>
                <p className="text-sm text-blue-100">আপনার স্বাস্থ্য সমস্যা বলুন • Shift+Enter = নতুন লাইন</p>
              </div>
              
              {/* Chat History Button */}
              {chatHistory.length > 0 && (
                <div className="px-4 py-2 bg-gray-50 border-b">
                  <details className="text-sm">
                    <summary className="cursor-pointer text-blue-600">📜 পূর্ববর্তী কথোপকথন ({chatHistory.length})</summary>
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      {chatHistory.slice(0, 5).map((conv, i) => (
                        <button key={i} onClick={() => conv.messages && setMessages(conv.messages)} className="block w-full text-left p-2 bg-white rounded border text-xs hover:bg-blue-50">
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
                    <div className={`max-w-[75%] p-3 rounded-xl text-sm whitespace-pre-wrap ${
                      m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 p-3 rounded-xl text-sm animate-pulse">চিন্তা করছি...</div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              
              <div className="border-t p-4 flex gap-3">
                <textarea
                  ref={inputRef}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="আপনার সমস্যা লিখুন..."
                  className="flex-1 px-4 py-3 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  disabled={isTyping}
                />
                <button onClick={handleSend} disabled={isTyping || !chatInput.trim()} className="px-6 bg-blue-600 text-white rounded-xl disabled:bg-gray-300 self-end py-3">
                  পাঠান
                </button>
              </div>
            </div>
          )}

          {/* MEDICATION TAB */}
          {activeTab === 'medication' && (
            <div className="bg-white rounded-xl p-6 border">
              {isPremium ? (
                <div>
                  <h2 className="text-lg font-bold text-gray-800 mb-4">💊 ওষুধ রিমাইন্ডার</h2>
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">💊</div>
                    <h3 className="text-lg font-medium text-gray-700">শীঘ্রই আসছে</h3>
                    <p className="text-gray-500 mt-2">ওষুধ খাওয়ার সময় মনে করিয়ে দেবে</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">🔒</div>
                  <h3 className="text-lg font-medium text-gray-700">প্রিমিয়াম ফিচার</h3>
                  <p className="text-gray-500 mt-2">এই ফিচার ব্যবহার করতে প্রিমিয়াম সাবস্ক্রিপশন নিন</p>
                  <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg">আপগ্রেড করুন</button>
                </div>
              )}
            </div>
          )}

          {/* FOOD SCAN TAB */}
          {activeTab === 'food-scan' && (
            <div className="bg-white rounded-xl p-6 border">
              {isPremium ? (
                <div>
                  <h2 className="text-lg font-bold text-gray-800 mb-4">📷 কি খাচ্ছি?</h2>
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">📷</div>
                    <h3 className="text-lg font-medium text-gray-700">খাবারের ছবি তুলুন</h3>
                    <p className="text-gray-500 mt-2">এআই বলে দেবে এটা আপনার জন্য ভালো কিনা</p>
                    <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg">📷 ছবি তুলুন</button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">🔒</div>
                  <h3 className="text-lg font-medium text-gray-700">প্রিমিয়াম ফিচার</h3>
                  <p className="text-gray-500 mt-2">এই ফিচার ব্যবহার করতে প্রিমিয়াম সাবস্ক্রিপশন নিন</p>
                  <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg">আপগ্রেড করুন</button>
                </div>
              )}
            </div>
          )}

          {/* QUIZ TAB */}
          {activeTab === 'quiz' && (
            <div className="bg-white rounded-xl p-6 border">
              {isPremium ? (
                <div>
                  <h2 className="text-lg font-bold text-gray-800 mb-4">🎯 স্বাস্থ্য কুইজ</h2>
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">🎯</div>
                    <h3 className="text-lg font-medium text-gray-700">দৈনিক কুইজ</h3>
                    <p className="text-gray-500 mt-2">মজার প্রশ্নের মাধ্যমে স্বাস্থ্য জানুন</p>
                    <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg">শুরু করুন</button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">🔒</div>
                  <h3 className="text-lg font-medium text-gray-700">প্রিমিয়াম ফিচার</h3>
                  <p className="text-gray-500 mt-2">এই ফিচার ব্যবহার করতে প্রিমিয়াম সাবস্ক্রিপশন নিন</p>
                  <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg">আপগ্রেড করুন</button>
                </div>
              )}
            </div>
          )}

          {/* FOOD CHART TAB */}
          {activeTab === 'food-chart' && (
            <div className="bg-white rounded-xl p-6 border">
              {isPremium ? (
                <div>
                  <h2 className="text-lg font-bold text-gray-800 mb-4">🥗 কাস্টম খাদ্য তালিকা</h2>
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">🥗</div>
                    <h3 className="text-lg font-medium text-gray-700">আপনার জন্য বিশেষ খাদ্য তালিকা</h3>
                    <p className="text-gray-500 mt-2">আপনার স্বাস্থ্য অনুযায়ী তৈরি</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">🔒</div>
                  <h3 className="text-lg font-medium text-gray-700">প্রিমিয়াম ফিচার</h3>
                  <p className="text-gray-500 mt-2">এই ফিচার ব্যবহার করতে প্রিমিয়াম সাবস্ক্রিপশন নিন</p>
                  <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg">আপগ্রেড করুন</button>
                </div>
              )}
            </div>
          )}

          {/* INCENTIVES TAB */}
          {activeTab === 'incentives' && (
            <div className="bg-white rounded-xl p-6 border">
              <h2 className="text-lg font-bold text-gray-800 mb-4">🎁 পুরস্কার প্রোগ্রাম</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { icon: '🏆', title: 'দৈনিক চেক-ইন', desc: '১০ পয়েন্ট', done: false },
                  { icon: '💪', title: 'প্রোফাইল সম্পূর্ণ', desc: '৫০ পয়েন্ট', done: true },
                  { icon: '🎯', title: 'কুইজ খেলুন', desc: '২০ পয়েন্ট', done: false },
                ].map((reward, i) => (
                  <div key={i} className={`p-4 rounded-xl border-2 ${reward.done ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                    <div className="text-3xl mb-2">{reward.icon}</div>
                    <h3 className="font-medium">{reward.title}</h3>
                    <p className="text-sm text-gray-500">{reward.desc}</p>
                    {reward.done && <span className="text-green-600 text-sm">✓ সম্পন্ন</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ADVANCED AI TAB */}
          {activeTab === 'advanced-ai' && (
            <div className="bg-white rounded-xl p-6 border">
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🧠</div>
                <h3 className="text-lg font-medium text-gray-700">অ্যাডভান্সড এআই</h3>
                <p className="text-gray-500 mt-2">ভবিষ্যত স্বাস্থ্য পূর্বাভাস</p>
                <div className="mt-4 inline-block px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                  🚧 শীঘ্রই আসছে
                </div>
              </div>
            </div>
          )}

          {/* FEEDBACK TAB */}
          {activeTab === 'feedback' && (
            <div className="space-y-6">
              {/* Submit New Feedback */}
              <div className="bg-white rounded-xl p-6 border">
                <h2 className="text-lg font-bold text-gray-800 mb-4">💬 নতুন মতামত দিন</h2>
                {fbSent ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">✅</div>
                    <h3 className="font-medium text-gray-700">ধন্যবাদ!</h3>
                    <p className="text-gray-500 text-sm">আপনার মতামত পাঠানো হয়েছে</p>
                  </div>
                ) : (
                  <div className="max-w-lg">
                    <div className="mb-4">
                      <label className="text-sm text-gray-600 block mb-1">বিভাগ</label>
                      <select value={fbCat} onChange={e => setFbCat(e.target.value as any)} className="w-full px-4 py-2 border rounded-lg">
                        <option value="general">সাধারণ</option>
                        <option value="bug">সমস্যা রিপোর্ট</option>
                        <option value="feature">নতুন ফিচার</option>
                        <option value="complaint">অভিযোগ</option>
                      </select>
                    </div>
                    <div className="mb-4">
                      <label className="text-sm text-gray-600 block mb-1">আপনার মতামত</label>
                      <textarea value={fbText} onChange={e => setFbText(e.target.value)} placeholder="লিখুন..." className="w-full px-4 py-3 border rounded-lg h-24 resize-none" />
                    </div>
                    <button onClick={async () => { await submitFeedback(); loadMyFeedbacks(); }} disabled={!fbText.trim()} className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300">
                      পাঠান
                    </button>
                  </div>
                )}
              </div>

              {/* My Feedback History */}
              <div className="bg-white rounded-xl p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-800">📋 আমার মতামত ইতিহাস</h2>
                  <button onClick={loadMyFeedbacks} className="text-blue-600 text-sm hover:underline">
                    {loadingFeedbacks ? '...' : '🔄 রিফ্রেশ'}
                  </button>
                </div>
                
                {loadingFeedbacks ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-gray-500 mt-2 text-sm">লোড হচ্ছে...</p>
                  </div>
                ) : myFeedbacks.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-gray-500">কোনো মতামত পাঠাননি</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myFeedbacks.map((fb) => (
                      <div key={fb.id} className="p-4 bg-gray-50 rounded-lg border">
                        {/* Feedback Header */}
                        <div className="flex items-center justify-between mb-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            fb.type === 'bug' ? 'bg-red-100 text-red-700' :
                            fb.type === 'feature' ? 'bg-purple-100 text-purple-700' :
                            fb.type === 'complaint' ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {fb.type === 'bug' ? '🐛 সমস্যা' : 
                             fb.type === 'feature' ? '✨ ফিচার' : 
                             fb.type === 'complaint' ? '⚠️ অভিযোগ' : '💬 সাধারণ'}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            fb.status === 'resolved' ? 'bg-green-100 text-green-700' :
                            fb.status === 'reviewed' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-200 text-gray-600'
                          }`}>
                            {fb.status === 'resolved' ? '✅ সমাধান হয়েছে' :
                             fb.status === 'reviewed' ? '👀 দেখা হয়েছে' : '🕐 অপেক্ষায়'}
                          </span>
                        </div>
                        
                        {/* User's Message */}
                        <p className="text-gray-800 mb-2">{fb.message}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(fb.timestamp).toLocaleDateString('bn-BD', { 
                            year: 'numeric', month: 'long', day: 'numeric', 
                            hour: '2-digit', minute: '2-digit' 
                          })}
                        </p>
                        
                        {/* Admin Reply */}
                        {fb.adminReply && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-blue-600 font-medium text-sm">💬 নির্ণয় টিমের উত্তর:</span>
                            </div>
                            <p className="text-gray-700 text-sm">{fb.adminReply}</p>
                            {fb.adminRepliedAt && (
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(fb.adminRepliedAt).toLocaleDateString('bn-BD')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PatientDashboard;
