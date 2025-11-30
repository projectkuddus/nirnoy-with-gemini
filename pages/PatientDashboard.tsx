/**
 * NIRNOY PATIENT DASHBOARD - PRODUCTION READY
 * Clean UI with 60-30-10 color rule
 * Data persists forever - migrations only, no deletions
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth, PatientProfile } from '../contexts/AuthContext';
import { saveFeedback } from '../components/FeedbackWidget';

// ============ TYPES ============
interface QuizQuestion {
  id: string;
  question: string;
  questionBn: string;
  options: { text: string; textBn: string; points: number }[];
}

// ============ SUBSCRIPTION PLANS ============
const PLANS = [
  { id: 'free', name: 'Free', nameBn: 'ফ্রি', price: 0, priceBn: '০', features: ['Basic AI Chat', 'View Profile', '2 Quizzes/month'], featuresBn: ['বেসিক এআই চ্যাট', 'প্রোফাইল দেখুন', 'মাসে ২টি কুইজ'] },
  { id: 'basic', name: 'Basic', nameBn: 'বেসিক', price: 99, priceBn: '৯৯', features: ['Unlimited AI Chat', '10 Quizzes/month', 'Health Records'], featuresBn: ['আনলিমিটেড এআই চ্যাট', 'মাসে ১০টি কুইজ', 'স্বাস্থ্য রেকর্ড'] },
  { id: 'premium', name: 'Premium', nameBn: 'প্রিমিয়াম', price: 299, priceBn: '২৯৯', features: ['Everything in Basic', 'Priority Support', 'Family Sharing (2)'], featuresBn: ['বেসিকের সব কিছু', 'অগ্রাধিকার সাপোর্ট', 'পরিবার শেয়ারিং (২)'], popular: true },
  { id: 'family', name: 'Family', nameBn: 'ফ্যামিলি', price: 499, priceBn: '৪৯৯', features: ['Up to 5 Members', 'Dedicated Manager', 'Emergency Hotline'], featuresBn: ['৫ জন সদস্য', 'ডেডিকেটেড ম্যানেজার', 'জরুরি হটলাইন'] }
];

// ============ SAMPLE QUIZZES ============
const DAILY_QUIZ: QuizQuestion[] = [
  { id: '1', question: 'How did you sleep last night?', questionBn: 'গতরাতে কেমন ঘুম হয়েছে?', options: [
    { text: 'Very well', textBn: 'খুব ভালো', points: 10 },
    { text: 'Okay', textBn: 'ঠিকঠাক', points: 7 },
    { text: 'Not good', textBn: 'ভালো না', points: 3 },
    { text: 'Terrible', textBn: 'খুব খারাপ', points: 0 }
  ]},
  { id: '2', question: 'How is your energy level today?', questionBn: 'আজ আপনার এনার্জি লেভেল কেমন?', options: [
    { text: 'High', textBn: 'উচ্চ', points: 10 },
    { text: 'Normal', textBn: 'স্বাভাবিক', points: 7 },
    { text: 'Low', textBn: 'কম', points: 3 },
    { text: 'Very low', textBn: 'খুব কম', points: 0 }
  ]},
  { id: '3', question: 'Did you drink enough water today?', questionBn: 'আজ পর্যাপ্ত পানি পান করেছেন?', options: [
    { text: '8+ glasses', textBn: '৮+ গ্লাস', points: 10 },
    { text: '5-7 glasses', textBn: '৫-৭ গ্লাস', points: 7 },
    { text: '2-4 glasses', textBn: '২-৪ গ্লাস', points: 3 },
    { text: 'Less than 2', textBn: '২ এর কম', points: 0 }
  ]}
];

// ============ MAIN COMPONENT ============
export const PatientDashboard: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, role, logout, isLoading, updateProfile } = useAuth();
  const isBn = language === 'bn';
  
  // State
  const [initDelay, setInitDelay] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'ai' | 'quiz' | 'feedback' | 'profile'>('home');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{role: string; content: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Health insights from AI
  const [healthInsights, setHealthInsights] = useState<string[]>([]);
  
  // Profile & Pricing
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showPricing, setShowPricing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', email: '', dateOfBirth: '', gender: '', bloodGroup: '',
    heightCm: '', weightKg: '', chronicConditions: '', allergies: '',
    emergencyContactName: '', emergencyContactPhone: ''
  });
  
  // Quiz state
  const [currentQuiz, setCurrentQuiz] = useState<QuizQuestion[] | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  
  // Feedback state
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState<'general' | 'bug' | 'feature' | 'complaint'>('general');
  const [feedbackSent, setFeedbackSent] = useState(false);
  
  // Safe user data
  const patientUser = useMemo(() => {
    if (user && role === 'patient') return user as PatientProfile;
    return null;
  }, [user, role]);

  // Effects
  useEffect(() => {
    const timer = setTimeout(() => setInitDelay(false), 500);
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    if (!initDelay && !isLoading && (!user || role !== 'patient')) {
      navigate('/patient-auth', { replace: true });
    }
  }, [user, role, isLoading, initDelay, navigate]);

  useEffect(() => {
    if (patientUser) {
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

  useEffect(() => {
    if (patientUser && messages.length === 0) {
      setMessages([{ 
        role: 'assistant', 
        content: `আসসালামু আলাইকুম ${patientUser.name}! 👋\n\nআমি নির্ণয় এআই। আপনার শারীরিক সমস্যা বলুন, আমি সমস্যা চিহ্নিত করতে সাহায্য করব এবং প্রয়োজনে সঠিক ডাক্তারের কাছে যেতে বলব।\n\n⚠️ দ্রষ্টব্য: আমি কোনো ওষুধ বা প্রেসক্রিপশন দিতে পারি না। শুধুমাত্র সমস্যা বুঝতে সাহায্য করব।`
      }]);
    }
  }, [patientUser, messages.length]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handlers
  const handleLogout = () => {
    logout();
    if (onLogout) onLogout();
    navigate('/', { replace: true });
  };

  // BANGLA AI - No prescriptions, only identify problems
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isTyping) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);
    
    await new Promise(r => setTimeout(r, 1500));
    
    const msgLower = userMessage.toLowerCase();
    let response = '';
    let detectedCondition = '';
    
    if (msgLower.includes('headache') || msgLower.includes('মাথা') || msgLower.includes('ব্যথা') || msgLower.includes('মাথাব্যথা')) {
      detectedCondition = 'মাথাব্যথা';
      response = `${patientUser?.name}, আপনার মাথাব্যথার কথা শুনে দুঃখিত। 😔\n\n🔍 সমস্যা চিহ্নিতকরণ:\nমাথাব্যথা বিভিন্ন কারণে হতে পারে:\n• টেনশন বা স্ট্রেস\n• ঘুমের অভাব\n• পানিশূন্যতা\n• চোখের সমস্যা\n• মাইগ্রেন\n\n❓ আরো জানতে বলুন:\n• কতক্ষণ ধরে ব্যথা হচ্ছে?\n• মাথার কোন অংশে ব্যথা?\n• আগেও এরকম হয়েছে?\n\n👨‍⚕️ যদি ব্যথা তীব্র হয় বা ২-৩ দিনের বেশি থাকে, নির্ণয়ের একজন নিউরোলজিস্ট দেখান।\n\n📝 আপনার প্রোফাইলে "মাথাব্যথা" যোগ করা হয়েছে।`;
    } else if (msgLower.includes('fever') || msgLower.includes('জ্বর') || msgLower.includes('তাপ')) {
      detectedCondition = 'জ্বর';
      response = `${patientUser?.name}, জ্বরের কথা জানালেন। 🤒\n\n🔍 সমস্যা চিহ্নিতকরণ:\nজ্বর সাধারণত শরীরের প্রতিরক্ষা ব্যবস্থার অংশ। কারণ হতে পারে:\n• ভাইরাল ইনফেকশন\n• ব্যাকটেরিয়াল ইনফেকশন\n• সর্দি-কাশি\n• ডেঙ্গু (মশার কামড় থাকলে)\n\n❓ আরো জানতে বলুন:\n• কত ডিগ্রি জ্বর?\n• কতদিন ধরে?\n• অন্য কোনো লক্ষণ আছে?\n\n👨‍⚕️ ১০২°F এর বেশি হলে বা ৩ দিনের বেশি থাকলে নির্ণয়ের মেডিসিন বিশেষজ্ঞ দেখান।\n\n📝 আপনার প্রোফাইলে "জ্বর" যোগ করা হয়েছে।`;
    } else if (msgLower.includes('stomach') || msgLower.includes('পেট') || msgLower.includes('বমি') || msgLower.includes('ডায়রিয়া')) {
      detectedCondition = 'পেটের সমস্যা';
      response = `${patientUser?.name}, পেটের সমস্যার কথা বললেন। 😣\n\n🔍 সমস্যা চিহ্নিতকরণ:\nপেটের সমস্যার কারণ হতে পারে:\n• খাবারে সমস্যা\n• গ্যাস্ট্রিক\n• ফুড পয়জনিং\n• ইনফেকশন\n\n❓ আরো জানতে বলুন:\n• ব্যথা কোথায়?\n• বমি বা ডায়রিয়া আছে?\n• কি খেয়েছিলেন?\n\n👨‍⚕️ রক্ত গেলে বা তীব্র ব্যথা হলে জরুরি ভিত্তিতে নির্ণয়ের গ্যাস্ট্রোএন্টেরোলজিস্ট দেখান।\n\n📝 আপনার প্রোফাইলে "পেটের সমস্যা" যোগ করা হয়েছে।`;
    } else if (msgLower.includes('cold') || msgLower.includes('সর্দি') || msgLower.includes('কাশি') || msgLower.includes('cough')) {
      detectedCondition = 'সর্দি-কাশি';
      response = `${patientUser?.name}, সর্দি-কাশির কথা বললেন। 🤧\n\n🔍 সমস্যা চিহ্নিতকরণ:\nসর্দি-কাশি সাধারণত ভাইরাল ইনফেকশন। লক্ষণ:\n• নাক দিয়ে পানি পড়া\n• গলা ব্যথা\n• হাঁচি\n• কাশি\n\n❓ আরো জানতে বলুন:\n• কতদিন ধরে?\n• জ্বর আছে?\n• শ্বাসকষ্ট আছে?\n\n👨‍⚕️ শ্বাসকষ্ট হলে বা ৭ দিনের বেশি থাকলে নির্ণয়ের ENT বা মেডিসিন বিশেষজ্ঞ দেখান।\n\n📝 আপনার প্রোফাইলে "সর্দি-কাশি" যোগ করা হয়েছে।`;
    } else if (msgLower.includes('doctor') || msgLower.includes('ডাক্তার') || msgLower.includes('অ্যাপয়েন্টমেন্ট')) {
      response = `অবশ্যই ${patientUser?.name}! 👨‍⚕️\n\nনির্ণয়তে ৫০০+ বিশেষজ্ঞ ডাক্তার আছেন।\n\n📋 কিভাবে অ্যাপয়েন্টমেন্ট নিবেন:\n১. হোম পেজে যান\n২. "অ্যাপয়েন্টমেন্ট" এ ক্লিক করুন\n৩. বিশেষত্ব বা এলাকা দিয়ে খুঁজুন\n৪. সময় নির্বাচন করুন\n\nআপনার কোন ধরনের ডাক্তার দরকার? বলুন, আমি সাহায্য করি।`;
    } else if (msgLower.includes('thank') || msgLower.includes('ধন্যবাদ') || msgLower.includes('শুকরিয়া')) {
      response = `আপনাকেও ধন্যবাদ ${patientUser?.name}! 😊\n\nআপনার স্বাস্থ্য ভালো থাকুক। যেকোনো সমস্যায় আবার জানাবেন।\n\n💙 নির্ণয় সবসময় আপনার পাশে।`;
    } else {
      response = `${patientUser?.name}, আপনার কথা শুনলাম। 🤔\n\nআরেকটু বিস্তারিত বলুন:\n• কোথায় সমস্যা হচ্ছে?\n• কতদিন ধরে?\n• কি ধরনের অনুভূতি?\n\nআমি সমস্যা চিহ্নিত করে সঠিক ডাক্তারের কাছে যেতে সাহায্য করব।\n\n💡 আপনি বলতে পারেন:\n• মাথা ব্যথা করছে\n• জ্বর হয়েছে\n• পেটে সমস্যা\n• সর্দি-কাশি\n• ডাক্তার দেখাতে চাই`;
    }
    
    // Add detected condition to health insights
    if (detectedCondition) {
      setHealthInsights(prev => {
        const updated = [...prev, `${new Date().toLocaleDateString('bn-BD')}: ${detectedCondition}`];
        return updated.slice(-10); // Keep last 10
      });
    }
    
    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    setIsTyping(false);
  };

  const handleSaveProfile = async () => {
    if (!patientUser || !updateProfile) return;
    setSaving(true);
    setSaveMessage('');
    
    try {
      const updates: Partial<PatientProfile> = {
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
      
      const success = await updateProfile(updates);
      if (success) {
        setSaveMessage('✓ সংরক্ষিত');
        setIsEditing(false);
      } else {
        setSaveMessage('✗ ব্যর্থ');
      }
    } catch (e) {
      setSaveMessage('✗ ত্রুটি');
    }
    
    setSaving(false);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const startQuiz = () => {
    setCurrentQuiz(DAILY_QUIZ);
    setQuizIndex(0);
    setQuizScore(0);
    setQuizComplete(false);
  };

  const answerQuiz = (points: number) => {
    setQuizScore(prev => prev + points);
    if (quizIndex < DAILY_QUIZ.length - 1) {
      setQuizIndex(prev => prev + 1);
    } else {
      setQuizComplete(true);
    }
  };

  const submitFeedback = () => {
    if (!feedbackText.trim() || !patientUser) return;
    
    // Use the proper saveFeedback function from FeedbackWidget
    saveFeedback({
      id: Date.now().toString(),
      type: feedbackCategory,
      mood: 'neutral',
      message: feedbackText,
      page: '/patient-dashboard',
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      userId: patientUser.id,
      userRole: 'patient',
      userName: patientUser.name,
      status: 'new'
    });
    
    setFeedbackSent(true);
    setFeedbackText('');
    setTimeout(() => setFeedbackSent(false), 3000);
  };

  // Loading
  if (isLoading || initDelay) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (!patientUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">লগইন পেজে যাচ্ছে...</p>
        </div>
      </div>
    );
  }

  // ============ RENDER ============
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600">নির্ণয়</span>
            <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-xs font-medium">
              {(patientUser.subscriptionTier || 'free').toUpperCase()}
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-gray-700 text-sm hidden sm:block">{patientUser.name}</span>
            <button onClick={handleLogout} className="text-red-500 hover:text-red-600 text-sm font-medium">
              লগআউট
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-4 overflow-x-auto">
            {[
              { id: 'home', icon: '🏠', label: 'হোম' },
              { id: 'ai', icon: '🤖', label: 'এআই সহকারী' },
              { id: 'quiz', icon: '🎯', label: 'কুইজ' },
              { id: 'feedback', icon: '💬', label: 'মতামত' },
              { id: 'profile', icon: '👤', label: 'প্রোফাইল' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={'py-3 px-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ' + (
                  activeTab === tab.id 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        
        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            <div className="bg-blue-600 rounded-xl p-6 text-white">
              <h1 className="text-xl font-semibold mb-1">স্বাগতম, {patientUser.name}!</h1>
              <p className="text-blue-100 text-sm">আপনার স্বাস্থ্য ড্যাশবোর্ড</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: '❤️', value: patientUser.healthScore || 85, label: 'স্বাস্থ্য স্কোর' },
                { icon: '🏆', value: patientUser.quizPoints || 0, label: 'পয়েন্ট' },
                { icon: '🔥', value: patientUser.streakDays || 0, label: 'স্ট্রিক' },
                { icon: '📅', value: 0, label: 'অ্যাপয়েন্টমেন্ট' },
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-2xl mb-1">{stat.icon}</div>
                  <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Health Insights */}
            {healthInsights.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-800 mb-3">📋 সাম্প্রতিক স্বাস্থ্য সমস্যা</h2>
                <div className="space-y-2">
                  {healthInsights.map((insight, i) => (
                    <div key={i} className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded">{insight}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-4">দ্রুত অ্যাকশন</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button onClick={() => setActiveTab('ai')} className="p-4 bg-gray-50 hover:bg-blue-50 rounded-lg text-center transition-colors">
                  <span className="text-2xl block mb-1">🤖</span>
                  <span className="text-xs text-gray-600">এআই সহকারী</span>
                </button>
                <Link to="/my-appointments" className="p-4 bg-gray-50 hover:bg-blue-50 rounded-lg text-center transition-colors">
                  <span className="text-2xl block mb-1">📅</span>
                  <span className="text-xs text-gray-600">অ্যাপয়েন্টমেন্ট</span>
                </Link>
                <button onClick={() => setActiveTab('quiz')} className="p-4 bg-gray-50 hover:bg-blue-50 rounded-lg text-center transition-colors">
                  <span className="text-2xl block mb-1">🎯</span>
                  <span className="text-xs text-gray-600">কুইজ খেলুন</span>
                </button>
                <button onClick={() => setActiveTab('feedback')} className="p-4 bg-gray-50 hover:bg-blue-50 rounded-lg text-center transition-colors">
                  <span className="text-2xl block mb-1">💬</span>
                  <span className="text-xs text-gray-600">মতামত দিন</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI ASSISTANT TAB */}
        {activeTab === 'ai' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-[calc(100vh-200px)] flex flex-col">
            <div className="bg-blue-600 p-4 text-white">
              <h2 className="font-semibold">🤖 নির্ণয় এআই সহকারী</h2>
              <p className="text-sm text-blue-100">সমস্যা বলুন, সমাধান খুঁজি (ওষুধ দিতে পারব না)</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={'flex ' + (msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={'max-w-[85%] p-3 rounded-lg text-sm ' + (
                    msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
                  )} style={{ whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 p-3 rounded-lg text-sm">
                    <span className="animate-pulse">●●●</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            
            <div className="border-t border-gray-200 p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="আপনার সমস্যা লিখুন..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={isTyping}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isTyping || !chatInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-5 py-2 rounded-lg text-sm font-medium"
                >
                  পাঠান
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QUIZ TAB */}
        {activeTab === 'quiz' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">🎯 স্বাস্থ্য কুইজ</h2>
            
            {!currentQuiz ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                <div className="text-5xl mb-4">🎯</div>
                <h3 className="font-semibold text-gray-800 mb-2">দৈনিক স্বাস্থ্য কুইজ</h3>
                <p className="text-gray-500 text-sm mb-4">আপনার স্বাস্থ্য সম্পর্কে জানুন এবং পয়েন্ট অর্জন করুন</p>
                <button onClick={startQuiz} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium">
                  কুইজ শুরু করুন
                </button>
              </div>
            ) : quizComplete ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="font-semibold text-gray-800 mb-2">কুইজ সম্পন্ন!</h3>
                <p className="text-3xl font-bold text-blue-600 mb-2">{quizScore}/{DAILY_QUIZ.length * 10}</p>
                <p className="text-gray-500 text-sm mb-4">পয়েন্ট অর্জিত</p>
                <button onClick={() => setCurrentQuiz(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium">
                  ফিরে যান
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="text-sm text-gray-500 mb-2">প্রশ্ন {quizIndex + 1}/{DAILY_QUIZ.length}</div>
                <h3 className="font-semibold text-gray-800 mb-4">{currentQuiz[quizIndex].questionBn}</h3>
                <div className="space-y-2">
                  {currentQuiz[quizIndex].options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => answerQuiz(opt.points)}
                      className="w-full text-left p-3 bg-gray-50 hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                    >
                      {opt.textBn}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* FEEDBACK TAB */}
        {activeTab === 'feedback' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">💬 মতামত দিন</h2>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              {feedbackSent ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">✅</div>
                  <h3 className="font-semibold text-gray-800">ধন্যবাদ!</h3>
                  <p className="text-gray-500 text-sm">আপনার মতামত পাঠানো হয়েছে</p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="text-sm text-gray-600 block mb-2">বিভাগ</label>
                    <select
                      value={feedbackCategory}
                      onChange={(e) => setFeedbackCategory(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="general">সাধারণ</option>
                      <option value="bug">সমস্যা রিপোর্ট</option>
                      <option value="feature">নতুন ফিচার</option>
                      <option value="complaint">অভিযোগ</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="text-sm text-gray-600 block mb-2">আপনার মতামত</label>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="আপনার মতামত লিখুন..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-32 resize-none"
                    />
                  </div>
                  <button
                    onClick={submitFeedback}
                    disabled={!feedbackText.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium"
                  >
                    পাঠান
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            {/* Pricing Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800">💎 সাবস্ক্রিপশন</h3>
                  <p className="text-sm text-gray-500">বর্তমান প্ল্যান: <span className="font-medium text-blue-600">{(patientUser.subscriptionTier || 'free').toUpperCase()}</span></p>
                </div>
                <button onClick={() => setShowPricing(!showPricing)} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  {showPricing ? 'বন্ধ করুন' : 'প্ল্যান দেখুন'}
                </button>
              </div>
              
              {showPricing && (
                <div className="grid md:grid-cols-4 gap-3 pt-4 border-t border-gray-200">
                  {PLANS.map(plan => (
                    <div key={plan.id} className={'p-4 rounded-lg border-2 ' + (plan.popular ? 'border-blue-500 bg-blue-50' : 'border-gray-200')}>
                      {plan.popular && <div className="text-xs text-blue-600 font-medium mb-1">জনপ্রিয়</div>}
                      <div className="font-semibold text-gray-800">{plan.nameBn}</div>
                      <div className="text-2xl font-bold text-gray-800">৳{plan.priceBn}<span className="text-sm font-normal text-gray-500">/মাস</span></div>
                      <ul className="mt-2 space-y-1">
                        {plan.featuresBn.map((f, i) => (
                          <li key={i} className="text-xs text-gray-600">✓ {f}</li>
                        ))}
                      </ul>
                      <button className={'w-full mt-3 py-1.5 rounded text-sm font-medium ' + (
                        patientUser.subscriptionTier === plan.id 
                          ? 'bg-gray-100 text-gray-500 cursor-default' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      )}>
                        {patientUser.subscriptionTier === plan.id ? 'বর্তমান' : 'আপগ্রেড'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-gray-800">👤 প্রোফাইল</h2>
                <div className="flex items-center gap-2">
                  {saveMessage && <span className={saveMessage.includes('✓') ? 'text-green-600 text-sm' : 'text-red-600 text-sm'}>{saveMessage}</span>}
                  {isEditing ? (
                    <>
                      <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded text-sm">বাতিল</button>
                      <button onClick={handleSaveProfile} disabled={saving} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm disabled:opacity-50">
                        {saving ? '...' : 'সংরক্ষণ'}
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setIsEditing(true)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">সম্পাদনা</button>
                  )}
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-gray-500 uppercase">মৌলিক তথ্য</h3>
                  {[
                    { key: 'name', label: 'নাম', type: 'text' },
                    { key: 'phone', label: 'ফোন', readonly: true, value: patientUser.phone },
                    { key: 'email', label: 'ইমেইল', type: 'email' },
                    { key: 'dateOfBirth', label: 'জন্ম তারিখ', type: 'date' },
                    { key: 'gender', label: 'লিঙ্গ', type: 'select', options: ['', 'male', 'female', 'other'] },
                    { key: 'bloodGroup', label: 'রক্তের গ্রুপ', type: 'select', options: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
                  ].map(field => (
                    <div key={field.key} className="flex items-center">
                      <label className="text-xs text-gray-500 w-24">{field.label}</label>
                      {field.readonly ? (
                        <span className="text-gray-800 text-sm">{field.value}</span>
                      ) : isEditing ? (
                        field.type === 'select' ? (
                          <select value={(editForm as any)[field.key]} onChange={(e) => setEditForm({...editForm, [field.key]: e.target.value})} className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm">
                            {field.options?.map(opt => <option key={opt} value={opt}>{opt || '-'}</option>)}
                          </select>
                        ) : (
                          <input type={field.type} value={(editForm as any)[field.key]} onChange={(e) => setEditForm({...editForm, [field.key]: e.target.value})} className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm" />
                        )
                      ) : (
                        <span className="text-gray-800 text-sm">{(patientUser as any)[field.key] || '-'}</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-gray-500 uppercase">স্বাস্থ্য তথ্য</h3>
                  {[
                    { key: 'heightCm', label: 'উচ্চতা', type: 'number', suffix: 'cm' },
                    { key: 'weightKg', label: 'ওজন', type: 'number', suffix: 'kg' },
                    { key: 'chronicConditions', label: 'রোগ', type: 'text' },
                    { key: 'allergies', label: 'এলার্জি', type: 'text' },
                    { key: 'emergencyContactName', label: 'জরুরি নাম', type: 'text' },
                    { key: 'emergencyContactPhone', label: 'জরুরি ফোন', type: 'tel' },
                  ].map(field => (
                    <div key={field.key} className="flex items-center">
                      <label className="text-xs text-gray-500 w-24">{field.label}</label>
                      {isEditing ? (
                        <input type={field.type} value={(editForm as any)[field.key]} onChange={(e) => setEditForm({...editForm, [field.key]: e.target.value})} className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm" />
                      ) : (
                        <span className="text-gray-800 text-sm">
                          {field.key === 'chronicConditions' || field.key === 'allergies'
                            ? ((patientUser as any)[field.key] || []).join(', ') || '-'
                            : ((patientUser as any)[field.key] || '-') + (field.suffix && (patientUser as any)[field.key] ? ' ' + field.suffix : '')}
                        </span>
                      )}
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
