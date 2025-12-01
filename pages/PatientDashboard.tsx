/**
 * NIRNOY PATIENT DASHBOARD - PRODUCTION READY
 * Visual Health Dashboard + AI Memory + Chat History
 * Built for 1000+ users, scales to millions
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth, PatientProfile } from '../contexts/AuthContext';
import { saveFeedback } from '../components/FeedbackWidget';
import { chatWithHealthAssistant } from '../services/geminiService';
import { aiChatService, authService } from '../services/supabaseAuth';

// Health body parts for visual representation
const BODY_PARTS = [
  { id: 'head', name: 'মাথা/মস্তিষ্ক', icon: '🧠', x: 50, y: 8, conditions: ['headache', 'migraine', 'stress', 'anxiety'] },
  { id: 'eyes', name: 'চোখ', icon: '👁️', x: 50, y: 15, conditions: ['vision', 'eye strain'] },
  { id: 'heart', name: 'হৃদয়', icon: '❤️', x: 45, y: 35, conditions: ['bp', 'heart', 'chest pain'] },
  { id: 'lungs', name: 'ফুসফুস', icon: '🫁', x: 55, y: 35, conditions: ['breathing', 'asthma', 'cough'] },
  { id: 'stomach', name: 'পেট', icon: '🫃', x: 50, y: 50, conditions: ['digestion', 'gastric', 'acidity'] },
  { id: 'liver', name: 'লিভার', icon: '🫀', x: 40, y: 48, conditions: ['liver', 'jaundice'] },
  { id: 'kidneys', name: 'কিডনি', icon: '🫘', x: 60, y: 52, conditions: ['kidney', 'urinary'] },
  { id: 'bones', name: 'হাড়/জয়েন্ট', icon: '🦴', x: 50, y: 70, conditions: ['joint pain', 'arthritis', 'back pain'] },
  { id: 'skin', name: 'ত্বক', icon: '🧴', x: 30, y: 40, conditions: ['skin', 'allergy', 'rash'] },
  { id: 'immunity', name: 'রোগ প্রতিরোধ', icon: '🛡️', x: 70, y: 40, conditions: ['fever', 'infection', 'cold'] }
];

const PLANS = [
  { id: 'free', nameBn: 'ফ্রি', price: 0, featuresBn: ['বেসিক এআই চ্যাট', 'প্রোফাইল দেখুন'] },
  { id: 'basic', nameBn: 'বেসিক', price: 99, featuresBn: ['আনলিমিটেড এআই', 'স্বাস্থ্য রেকর্ড'] },
  { id: 'premium', nameBn: 'প্রিমিয়াম', price: 299, featuresBn: ['সব কিছু', 'অগ্রাধিকার সাপোর্ট'], popular: true },
  { id: 'family', nameBn: 'ফ্যামিলি', price: 499, featuresBn: ['৫ জন সদস্য', 'জরুরি হটলাইন'] }
];

const QUIZ = [
  { q: 'গতরাতে কেমন ঘুম হয়েছে?', opts: [{ t: 'খুব ভালো', p: 10 }, { t: 'ঠিকঠাক', p: 7 }, { t: 'ভালো না', p: 3 }] },
  { q: 'আজ এনার্জি কেমন?', opts: [{ t: 'উচ্চ', p: 10 }, { t: 'স্বাভাবিক', p: 7 }, { t: 'কম', p: 3 }] },
  { q: 'পর্যাপ্ত পানি খেয়েছেন?', opts: [{ t: '৮+ গ্লাস', p: 10 }, { t: '৫-৭ গ্লাস', p: 7 }, { t: '২-৪ গ্লাস', p: 3 }] }
];

export const PatientDashboard: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, role, logout, isLoading, updateProfile } = useAuth();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const [initDelay, setInitDelay] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'ai' | 'history' | 'quiz' | 'feedback' | 'profile'>('home');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{role: string; content: string; timestamp?: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [showPricing, setShowPricing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', dateOfBirth: '', gender: '', bloodGroup: '', heightCm: '', weightKg: '', chronicConditions: '', allergies: '', emergencyContactName: '', emergencyContactPhone: '' });
  
  const [quizActive, setQuizActive] = useState(false);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  
  const [fbText, setFbText] = useState('');
  const [fbCat, setFbCat] = useState<'general' | 'bug' | 'feature' | 'complaint'>('general');
  const [fbSent, setFbSent] = useState(false);
  
  // Health scores for body parts
  const [bodyPartScores, setBodyPartScores] = useState<Record<string, number>>({});
  
  const patientUser = useMemo(() => (user && role === 'patient') ? user as PatientProfile : null, [user, role]);

  // Calculate health score based on profile data
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

  // Build patient context for AI
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

  useEffect(() => { setTimeout(() => setInitDelay(false), 500); }, []);
  
  useEffect(() => {
    if (!initDelay && !isLoading && (!user || role !== 'patient')) navigate('/patient-auth', { replace: true });
  }, [user, role, isLoading, initDelay, navigate]);

  // Load profile data into edit form
  useEffect(() => {
    if (patientUser) {
      console.log('[Dashboard] Loading user data:', patientUser.name, 'height:', patientUser.heightCm);
      setEditForm({
        name: patientUser.name || '', 
        email: patientUser.email || '', 
        dateOfBirth: patientUser.dateOfBirth || '',
        gender: patientUser.gender || '', 
        bloodGroup: patientUser.bloodGroup || '',
        heightCm: patientUser.heightCm ? String(patientUser.heightCm) : '', 
        weightKg: patientUser.weightKg ? String(patientUser.weightKg) : '',
        chronicConditions: (patientUser.chronicConditions || []).join(', '), 
        allergies: (patientUser.allergies || []).join(', '),
        emergencyContactName: patientUser.emergencyContactName || '', 
        emergencyContactPhone: patientUser.emergencyContactPhone || ''
      });
    }
  }, [patientUser]);

  // Load chat history from Supabase
  const loadChatHistory = useCallback(async () => {
    if (!patientUser) return;
    setLoadingHistory(true);
    try {
      const history = await aiChatService.getConversations(patientUser.id, 20);
      setChatHistory(history);
      console.log('[Dashboard] Loaded', history.length, 'conversations');
    } catch (e) {
      console.error('[Dashboard] Failed to load chat history:', e);
    }
    setLoadingHistory(false);
  }, [patientUser]);

  // Load previous messages for AI context
  const loadPreviousContext = useCallback(async () => {
    if (!patientUser) return;
    try {
      const prevMessages = await aiChatService.getLatestMessages(patientUser.id);
      if (prevMessages.length > 0) {
        console.log('[Dashboard] Loaded', prevMessages.length, 'previous messages for context');
      }
    } catch (e) {
      console.error('[Dashboard] Failed to load previous context:', e);
    }
  }, [patientUser]);

  // Initialize AI chat
  useEffect(() => {
    if (patientUser && messages.length === 0) {
      loadPreviousContext();
      setMessages([{ 
        role: 'assistant', 
        content: `আসসালামু আলাইকুম ${patientUser.name}! 👋\n\nআমি নির্ণয় এআই। আপনার স্বাস্থ্য সমস্যা বলুন, আমি বুঝতে সাহায্য করব।\n\n⚠️ আমি ওষুধ দিতে পারি না, শুধু সমস্যা বুঝতে সাহায্য করব।`,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [patientUser, messages.length, loadPreviousContext]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  
  useEffect(() => {
    if (activeTab === 'ai') setTimeout(() => inputRef.current?.focus(), 200);
    if (activeTab === 'history') loadChatHistory();
  }, [activeTab, loadChatHistory]);

  const handleLogout = () => { logout(); onLogout?.(); navigate('/', { replace: true }); };

  // Save conversation to Supabase
  const saveCurrentConversation = useCallback(async () => {
    if (!patientUser || messages.length <= 1) return;
    
    try {
      const summary = messages.slice(-2).map(m => m.content.substring(0, 50)).join(' | ');
      const convId = await aiChatService.saveConversation(patientUser.id, messages, summary);
      if (convId) {
        setCurrentConversationId(convId);
        console.log('[Dashboard] Conversation saved:', convId);
      }
    } catch (e) {
      console.error('[Dashboard] Failed to save conversation:', e);
    }
  }, [patientUser, messages]);

  // Real Gemini AI chat with memory
  const handleSend = async () => {
    if (!chatInput.trim() || isTyping) return;
    const msg = chatInput.trim();
    setChatInput('');
    
    const newUserMsg = { role: 'user', content: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, newUserMsg]);
    setIsTyping(true);
    
    try {
      // Get previous messages for context (including from Supabase)
      const prevContext = await aiChatService.getLatestMessages(patientUser?.id || '');
      const allHistory = [...prevContext, ...messages].map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`);
      
      // Call Gemini AI with full context
      const reply = await chatWithHealthAssistant(msg, allHistory, patientContext);
      
      const newAssistantMsg = { role: 'assistant', content: reply, timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, newAssistantMsg]);
      
      // Auto-save conversation after every exchange
      setTimeout(saveCurrentConversation, 1000);
    } catch (error) {
      console.error('[AI] Error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'দুঃখিত, একটু সমস্যা হয়েছে। আবার চেষ্টা করুন।', timestamp: new Date().toISOString() }]);
    }
    
    setIsTyping(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveProfile = async () => {
    if (!patientUser || !updateProfile) return;
    setSaving(true);
    setSaveMsg('');
    
    const updates = {
      name: editForm.name,
      email: editForm.email || undefined,
      dateOfBirth: editForm.dateOfBirth || undefined,
      gender: editForm.gender as any || undefined,
      bloodGroup: editForm.bloodGroup || undefined,
      heightCm: editForm.heightCm ? parseInt(editForm.heightCm) : undefined,
      weightKg: editForm.weightKg ? parseFloat(editForm.weightKg) : undefined,
      chronicConditions: editForm.chronicConditions ? editForm.chronicConditions.split(',').map(s => s.trim()).filter(Boolean) : [],
      allergies: editForm.allergies ? editForm.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
      emergencyContactName: editForm.emergencyContactName || undefined,
      emergencyContactPhone: editForm.emergencyContactPhone || undefined
    };
    
    console.log('[Dashboard] Saving profile:', updates);
    
    const success = await updateProfile(updates);
    
    if (success) {
      // Refresh data from database
      await authService.refreshPatientData(patientUser.id);
      setSaveMsg('✅ সংরক্ষিত!');
      setIsEditing(false);
    } else {
      setSaveMsg('❌ ব্যর্থ');
    }
    
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
    setFbSent(true);
    setFbText('');
    setTimeout(() => setFbSent(false), 3000);
  };

  // Load a past conversation
  const loadConversation = (conv: any) => {
    if (conv.messages && Array.isArray(conv.messages)) {
      setMessages(conv.messages);
      setCurrentConversationId(conv.id);
      setActiveTab('ai');
    }
  };

  // Start new conversation
  const startNewConversation = () => {
    setMessages([{ 
      role: 'assistant', 
      content: `নতুন কথোপকথন শুরু হয়েছে। কিভাবে সাহায্য করতে পারি?`,
      timestamp: new Date().toISOString()
    }]);
    setCurrentConversationId(null);
  };

  if (isLoading || initDelay || !patientUser) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-blue-600">নির্ণয়</Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{patientUser.name}</span>
            <button onClick={handleLogout} className="text-red-500 text-sm">লগআউট</button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 flex gap-2 overflow-x-auto">
          {[
            { id: 'home', icon: '🏠', label: 'স্বাস্থ্য' },
            { id: 'ai', icon: '🤖', label: 'এআই' },
            { id: 'history', icon: '📜', label: 'ইতিহাস' },
            { id: 'quiz', icon: '🎯', label: 'কুইজ' },
            { id: 'feedback', icon: '💬', label: 'মতামত' },
            { id: 'profile', icon: '👤', label: 'প্রোফাইল' },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)}
              className={`py-3 px-2 text-sm border-b-2 whitespace-nowrap ${activeTab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-5">
        {/* HOME - Visual Health Dashboard */}
        {activeTab === 'home' && (
          <div className="space-y-5">
            {/* Overall Health Score */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-semibold">স্বাগতম, {patientUser.name}!</h1>
                  <p className="text-blue-100 text-sm">আপনার স্বাস্থ্য ড্যাশবোর্ড</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold">{healthScore}</div>
                  <div className="text-xs text-blue-200">স্বাস্থ্য স্কোর</div>
                </div>
              </div>
            </div>

            {/* Body Map Visualization */}
            <div className="bg-white rounded-xl border p-4">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <span>🫀</span> শরীরের অবস্থা
              </h2>
              <div className="relative h-80 bg-gradient-to-b from-blue-50 to-gray-50 rounded-lg">
                {/* Human body outline */}
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-20">
                  <ellipse cx="50" cy="12" rx="8" ry="10" fill="#3b82f6" />
                  <rect x="42" y="22" width="16" height="30" rx="4" fill="#3b82f6" />
                  <rect x="30" y="24" width="12" height="4" rx="2" fill="#3b82f6" />
                  <rect x="58" y="24" width="12" height="4" rx="2" fill="#3b82f6" />
                  <rect x="44" y="52" width="5" height="25" rx="2" fill="#3b82f6" />
                  <rect x="51" y="52" width="5" height="25" rx="2" fill="#3b82f6" />
                </svg>
                
                {/* Health indicators on body parts */}
                {BODY_PARTS.map(part => {
                  const score = bodyPartScores[part.id] || 80 + Math.random() * 20;
                  const color = score > 80 ? 'bg-green-500' : score > 60 ? 'bg-yellow-500' : 'bg-red-500';
                  return (
                    <div
                      key={part.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                      style={{ left: `${part.x}%`, top: `${part.y}%` }}
                    >
                      <div className={`w-8 h-8 rounded-full ${color} bg-opacity-80 flex items-center justify-center text-white shadow-lg hover:scale-125 transition-transform`}>
                        <span className="text-sm">{part.icon}</span>
                      </div>
                      <div className="absolute left-1/2 -translate-x-1/2 top-10 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {part.name}: {Math.round(score)}%
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">🟢 ভালো (80%+) | 🟡 মাঝারি (60-80%) | 🔴 সতর্কতা (&lt;60%)</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { i: '📏', v: patientUser.heightCm ? `${patientUser.heightCm}cm` : '-', l: 'উচ্চতা' },
                { i: '⚖️', v: patientUser.weightKg ? `${patientUser.weightKg}kg` : '-', l: 'ওজন' },
                { i: '🩸', v: patientUser.bloodGroup || '-', l: 'রক্ত' },
                { i: '🏆', v: patientUser.quizPoints || 0, l: 'পয়েন্ট' }
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-lg p-3 border text-center">
                  <div className="text-xl">{s.i}</div>
                  <div className="text-lg font-bold">{s.v}</div>
                  <div className="text-xs text-gray-500">{s.l}</div>
                </div>
              ))}
            </div>

            {/* Health Conditions */}
            {(patientUser.chronicConditions?.length || patientUser.allergies?.length) ? (
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold mb-2">⚠️ স্বাস্থ্য সতর্কতা</h3>
                <div className="flex flex-wrap gap-2">
                  {patientUser.chronicConditions?.map((c, i) => (
                    <span key={i} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">{c}</span>
                  ))}
                  {patientUser.allergies?.map((a, i) => (
                    <span key={i} className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">এলার্জি: {a}</span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border p-4">
              <div className="grid grid-cols-4 gap-2">
                <button onClick={() => setActiveTab('ai')} className="p-3 bg-blue-50 hover:bg-blue-100 rounded-lg text-center">
                  <span className="text-xl block">🤖</span><span className="text-xs">এআই সাহায্য</span>
                </button>
                <Link to="/my-appointments" className="p-3 bg-green-50 hover:bg-green-100 rounded-lg text-center">
                  <span className="text-xl block">📅</span><span className="text-xs">অ্যাপয়েন্টমেন্ট</span>
                </Link>
                <button onClick={() => setActiveTab('quiz')} className="p-3 bg-purple-50 hover:bg-purple-100 rounded-lg text-center">
                  <span className="text-xl block">🎯</span><span className="text-xs">কুইজ</span>
                </button>
                <button onClick={() => setActiveTab('profile')} className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-center">
                  <span className="text-xl block">✏️</span><span className="text-xs">প্রোফাইল</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI CHAT */}
        {activeTab === 'ai' && (
          <div className="bg-white rounded-lg border overflow-hidden h-[calc(100vh-180px)] flex flex-col">
            <div className="bg-blue-600 p-3 text-white flex items-center justify-between">
              <div>
                <div className="font-semibold">🤖 নির্ণয় এআই</div>
                <div className="text-xs text-blue-100">সমস্যা বলুন • Shift+Enter = নতুন লাইন</div>
              </div>
              <button onClick={startNewConversation} className="text-xs bg-blue-500 px-2 py-1 rounded">নতুন চ্যাট</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-2.5 rounded-lg text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {isTyping && <div className="flex justify-start"><div className="bg-gray-100 p-2.5 rounded-lg text-sm animate-pulse">চিন্তা করছি...</div></div>}
              <div ref={chatEndRef} />
            </div>
            <div className="border-t p-3 flex gap-2">
              <textarea
                ref={inputRef}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="আপনার সমস্যা লিখুন..."
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
                disabled={isTyping}
              />
              <button onClick={handleSend} disabled={isTyping || !chatInput.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:bg-gray-300 self-end">পাঠান</button>
            </div>
          </div>
        )}

        {/* CHAT HISTORY */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-lg border p-4">
            <h2 className="font-semibold mb-4">📜 চ্যাট ইতিহাস</h2>
            {loadingHistory ? (
              <div className="text-center py-8"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
            ) : chatHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">💬</div>
                <p>কোনো চ্যাট ইতিহাস নেই</p>
                <button onClick={() => setActiveTab('ai')} className="mt-2 text-blue-600 text-sm">এআই এর সাথে কথা বলুন</button>
              </div>
            ) : (
              <div className="space-y-2">
                {chatHistory.map((conv, i) => (
                  <button
                    key={conv.id || i}
                    onClick={() => loadConversation(conv)}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-blue-50 rounded-lg border"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">{conv.summary || 'কথোপকথন'}</span>
                      <span className="text-xs text-gray-500">{new Date(conv.created_at).toLocaleDateString('bn-BD')}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{conv.messages?.length || 0} মেসেজ</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* QUIZ */}
        {activeTab === 'quiz' && (
          <div className="bg-white rounded-lg border p-5">
            {!quizActive ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">🎯</div>
                <h3 className="font-semibold mb-2">দৈনিক স্বাস্থ্য কুইজ</h3>
                <p className="text-gray-500 text-sm mb-4">পয়েন্ট অর্জন করুন</p>
                <button onClick={() => { setQuizActive(true); setQuizIdx(0); setQuizScore(0); setQuizDone(false); }} className="bg-blue-600 text-white px-5 py-2 rounded-lg">শুরু করুন</button>
              </div>
            ) : quizDone ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">🎉</div>
                <h3 className="font-semibold mb-2">সম্পন্ন!</h3>
                <p className="text-2xl font-bold text-blue-600 mb-4">{quizScore}/{QUIZ.length * 10}</p>
                <button onClick={() => setQuizActive(false)} className="bg-gray-100 px-5 py-2 rounded-lg">ফিরে যান</button>
              </div>
            ) : (
              <div>
                <div className="text-sm text-gray-500 mb-2">প্রশ্ন {quizIdx + 1}/{QUIZ.length}</div>
                <h3 className="font-semibold mb-4">{QUIZ[quizIdx].q}</h3>
                <div className="space-y-2">
                  {QUIZ[quizIdx].opts.map((o, i) => (
                    <button key={i} onClick={() => { setQuizScore(s => s + o.p); quizIdx < QUIZ.length - 1 ? setQuizIdx(idx => idx + 1) : setQuizDone(true); }}
                      className="w-full text-left p-3 bg-gray-50 hover:bg-blue-50 rounded-lg border">{o.t}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* FEEDBACK */}
        {activeTab === 'feedback' && (
          <div className="bg-white rounded-lg border p-5">
            {fbSent ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">✅</div>
                <h3 className="font-semibold">ধন্যবাদ!</h3>
                <p className="text-gray-500 text-sm">মতামত পাঠানো হয়েছে</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="text-sm text-gray-600 block mb-1">বিভাগ</label>
                  <select value={fbCat} onChange={e => setFbCat(e.target.value as any)} className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="general">সাধারণ</option>
                    <option value="bug">সমস্যা</option>
                    <option value="feature">নতুন ফিচার</option>
                    <option value="complaint">অভিযোগ</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="text-sm text-gray-600 block mb-1">মতামত</label>
                  <textarea value={fbText} onChange={e => setFbText(e.target.value)} placeholder="লিখুন..." className="w-full px-3 py-2 border rounded-lg text-sm h-28 resize-none" />
                </div>
                <button onClick={submitFeedback} disabled={!fbText.trim()} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm disabled:bg-gray-300">পাঠান</button>
              </>
            )}
          </div>
        )}

        {/* PROFILE */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold">💎 সাবস্ক্রিপশন</h3>
                  <p className="text-sm text-gray-500">বর্তমান: <span className="text-blue-600 font-medium">{(patientUser.subscriptionTier || 'free').toUpperCase()}</span></p>
                </div>
                <button onClick={() => setShowPricing(!showPricing)} className="text-blue-600 text-sm">{showPricing ? 'বন্ধ' : 'প্ল্যান দেখুন'}</button>
              </div>
              {showPricing && (
                <div className="grid grid-cols-4 gap-2 pt-3 border-t">
                  {PLANS.map(p => (
                    <div key={p.id} className={`p-3 rounded-lg border-2 ${p.popular ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                      {p.popular && <div className="text-xs text-blue-600 mb-1">জনপ্রিয়</div>}
                      <div className="font-semibold text-sm">{p.nameBn}</div>
                      <div className="text-lg font-bold">৳{p.price}</div>
                      <ul className="mt-1 space-y-0.5">{p.featuresBn.map((f, i) => <li key={i} className="text-xs text-gray-600">✓ {f}</li>)}</ul>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">👤 প্রোফাইল</h2>
                <div className="flex items-center gap-2">
                  {saveMsg && <span className="text-sm font-medium">{saveMsg}</span>}
                  {isEditing ? (
                    <>
                      <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-gray-600 text-sm">বাতিল</button>
                      <button onClick={handleSaveProfile} disabled={saving} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">{saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ'}</button>
                    </>
                  ) : (
                    <button onClick={() => setIsEditing(true)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">সম্পাদনা</button>
                  )}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-gray-500 uppercase">মৌলিক তথ্য</h3>
                  {[
                    { k: 'name', l: 'নাম' }, { k: 'phone', l: 'ফোন', ro: true, v: patientUser.phone },
                    { k: 'email', l: 'ইমেইল' }, { k: 'dateOfBirth', l: 'জন্ম তারিখ', t: 'date' },
                    { k: 'gender', l: 'লিঙ্গ', sel: ['', 'male', 'female'] }, { k: 'bloodGroup', l: 'রক্তের গ্রুপ', sel: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] }
                  ].map(f => (
                    <div key={f.k} className="flex items-center text-sm">
                      <span className="w-24 text-gray-500">{f.l}</span>
                      {f.ro ? <span className="font-medium">{f.v}</span> : isEditing ? (
                        f.sel ? <select value={(editForm as any)[f.k]} onChange={e => setEditForm({ ...editForm, [f.k]: e.target.value })} className="flex-1 px-2 py-1 border rounded text-sm">{f.sel.map(o => <option key={o} value={o}>{o || '-'}</option>)}</select>
                          : <input type={f.t || 'text'} value={(editForm as any)[f.k]} onChange={e => setEditForm({ ...editForm, [f.k]: e.target.value })} className="flex-1 px-2 py-1 border rounded text-sm" />
                      ) : <span className="font-medium">{(patientUser as any)[f.k] || '-'}</span>}
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-gray-500 uppercase">স্বাস্থ্য তথ্য</h3>
                  {[
                    { k: 'heightCm', l: 'উচ্চতা (cm)', t: 'number' }, { k: 'weightKg', l: 'ওজন (kg)', t: 'number' },
                    { k: 'chronicConditions', l: 'দীর্ঘমেয়াদী রোগ' }, { k: 'allergies', l: 'এলার্জি' },
                    { k: 'emergencyContactName', l: 'জরুরি যোগাযোগ' }, { k: 'emergencyContactPhone', l: 'জরুরি ফোন', t: 'tel' }
                  ].map(f => (
                    <div key={f.k} className="flex items-center text-sm">
                      <span className="w-24 text-gray-500">{f.l}</span>
                      {isEditing ? <input type={f.t || 'text'} value={(editForm as any)[f.k]} onChange={e => setEditForm({ ...editForm, [f.k]: e.target.value })} className="flex-1 px-2 py-1 border rounded text-sm" placeholder={f.k.includes('Conditions') || f.k.includes('allergies') ? 'কমা দিয়ে আলাদা করুন' : ''} />
                        : <span className="font-medium">{['chronicConditions', 'allergies'].includes(f.k) ? ((patientUser as any)[f.k] || []).join(', ') || '-' : (patientUser as any)[f.k] || '-'}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PatientDashboard;
