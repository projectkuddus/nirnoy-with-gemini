/**
 * NIRNOY PATIENT DASHBOARD - PRODUCTION READY
 * Clean UI with 60-30-10 color rule
 * Data persists forever - migrations only, no deletions
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth, PatientProfile } from '../contexts/AuthContext';

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
  const [feedbackCategory, setFeedbackCategory] = useState('general');
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
      const greeting = isBn 
        ? 'আসসালামু আলাইকুম ' + patientUser.name + '! আমি নির্ণয় এআই। আপনার স্বাস্থ্য সমস্যা বলুন, আমি সাহায্য করব এবং প্রয়োজনে নির্ণয়ের ডাক্তারদের কাছে অ্যাপয়েন্টমেন্ট নিতে সাহায্য করব।'
        : 'Hello ' + patientUser.name + '! I am Nirnoy AI. Tell me your health concerns, I will help and can book appointments with Nirnoy doctors if needed.';
      setMessages([{ role: 'assistant', content: greeting }]);
    }
  }, [patientUser, isBn, messages.length]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handlers
  const handleLogout = () => {
    logout();
    if (onLogout) onLogout();
    navigate('/', { replace: true });
  };

  // SMART AI - Only recommends Nirnoy
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isTyping) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);
    
    // Simulate AI thinking
    await new Promise(r => setTimeout(r, 1500));
    
    // Smart response based on keywords
    const msgLower = userMessage.toLowerCase();
    let response = '';
    
    if (msgLower.includes('headache') || msgLower.includes('মাথা') || msgLower.includes('ব্যথা')) {
      response = isBn 
        ? `${patientUser?.name}, মাথাব্যথার জন্য:\n\n✅ পরামর্শ:\n১. পর্যাপ্ত বিশ্রাম নিন\n২. প্রচুর পানি পান করুন\n৩. অন্ধকার ঘরে বিশ্রাম নিন\n\n💊 প্যারাসিটামল নিতে পারেন (৫০০mg)\n\n⚠️ যদি ২-৩ দিনে না কমে, নির্ণয়ের একজন নিউরোলজিস্টের সাথে অ্যাপয়েন্টমেন্ট নিন।\n\n👨‍⚕️ অ্যাপয়েন্টমেন্ট বুক করতে "ডাক্তার বুক করুন" বলুন।`
        : `${patientUser?.name}, for your headache:\n\n✅ Advice:\n1. Get adequate rest\n2. Stay hydrated\n3. Rest in a dark room\n\n💊 You can take Paracetamol (500mg)\n\n⚠️ If it persists for 2-3 days, book an appointment with a Nirnoy neurologist.\n\n👨‍⚕️ Say "book doctor" to schedule an appointment.`;
    } else if (msgLower.includes('fever') || msgLower.includes('জ্বর')) {
      response = isBn
        ? `${patientUser?.name}, জ্বরের জন্য:\n\n✅ পরামর্শ:\n১. প্রচুর পানি ও তরল খান\n২. হালকা কাপড় পরুন\n৩. বিশ্রাম নিন\n\n💊 প্যারাসিটামল নিতে পারেন\n\n⚠️ ১০২°F এর বেশি হলে বা ৩ দিনের বেশি থাকলে নির্ণয়ের একজন মেডিসিন বিশেষজ্ঞের সাথে দেখা করুন।\n\n👨‍⚕️ "ডাক্তার দেখান" বলুন অ্যাপয়েন্টমেন্টের জন্য।`
        : `${patientUser?.name}, for your fever:\n\n✅ Advice:\n1. Drink plenty of fluids\n2. Wear light clothing\n3. Rest well\n\n💊 You can take Paracetamol\n\n⚠️ If above 102°F or lasting more than 3 days, see a Nirnoy medicine specialist.\n\n👨‍⚕️ Say "see doctor" to book an appointment.`;
    } else if (msgLower.includes('doctor') || msgLower.includes('ডাক্তার') || msgLower.includes('book') || msgLower.includes('বুক')) {
      response = isBn
        ? `অবশ্যই! নির্ণয়তে আমাদের ৫০০+ বিশেষজ্ঞ ডাক্তার আছেন।\n\n🏥 ডাক্তার খুঁজতে:\n১. হোম পেজে যান\n২. "ডাক্তার খুঁজুন" এ ক্লিক করুন\n৩. বিশেষত্ব বা এলাকা দিয়ে খুঁজুন\n\n📅 অথবা সরাসরি অ্যাপয়েন্টমেন্ট পেজে যান।\n\nআপনার কোন ধরনের ডাক্তার দরকার?`
        : `Of course! Nirnoy has 500+ specialist doctors.\n\n🏥 To find a doctor:\n1. Go to Home page\n2. Click "Find Doctor"\n3. Search by specialty or area\n\n📅 Or go directly to Appointments page.\n\nWhat type of doctor do you need?`;
    } else if (msgLower.includes('stomach') || msgLower.includes('পেট') || msgLower.includes('digestion') || msgLower.includes('হজম')) {
      response = isBn
        ? `${patientUser?.name}, পেটের সমস্যার জন্য:\n\n✅ পরামর্শ:\n১. হালকা খাবার খান\n২. তেল-মশলা এড়িয়ে চলুন\n৩. প্রচুর পানি পান করুন\n\n💊 অ্যান্টাসিড নিতে পারেন\n\n⚠️ রক্ত গেলে বা তীব্র ব্যথা হলে জরুরি ভিত্তিতে নির্ণয়ের গ্যাস্ট্রোএন্টেরোলজিস্ট দেখান।\n\n👨‍⚕️ অ্যাপয়েন্টমেন্টের জন্য "ডাক্তার বুক করুন" বলুন।`
        : `${patientUser?.name}, for stomach issues:\n\n✅ Advice:\n1. Eat light meals\n2. Avoid oily/spicy food\n3. Stay hydrated\n\n💊 You can take antacids\n\n⚠️ If there's blood or severe pain, urgently see a Nirnoy gastroenterologist.\n\n👨‍⚕️ Say "book doctor" for an appointment.`;
    } else {
      response = isBn
        ? `ধন্যবাদ ${patientUser?.name}। আপনার সমস্যাটি বিস্তারিত বলুন। আমি সাহায্য করতে চাই।\n\nআপনি জিজ্ঞাসা করতে পারেন:\n• মাথা ব্যথা\n• জ্বর\n• পেটের সমস্যা\n• ডাক্তার খুঁজুন\n\n👨‍⚕️ যেকোনো সমস্যায় নির্ণয়ের ডাক্তারদের সাথে অ্যাপয়েন্টমেন্ট নিতে পারবেন।`
        : `Thank you ${patientUser?.name}. Please describe your problem in detail. I want to help.\n\nYou can ask about:\n• Headache\n• Fever\n• Stomach issues\n• Find a doctor\n\n👨‍⚕️ For any health concern, you can book appointments with Nirnoy doctors.`;
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
        setSaveMessage(isBn ? '✓ সংরক্ষিত' : '✓ Saved');
        setIsEditing(false);
      } else {
        setSaveMessage(isBn ? '✗ ব্যর্থ' : '✗ Failed');
      }
    } catch (e) {
      setSaveMessage(isBn ? '✗ ত্রুটি' : '✗ Error');
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

  const submitFeedback = async () => {
    if (!feedbackText.trim()) return;
    // Save to localStorage for now (will be Supabase)
    const feedbacks = JSON.parse(localStorage.getItem('nirnoy_feedbacks') || '[]');
    feedbacks.push({
      id: Date.now().toString(),
      userId: patientUser?.id,
      userName: patientUser?.name,
      category: feedbackCategory,
      message: feedbackText,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('nirnoy_feedbacks', JSON.stringify(feedbacks));
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
          <p className="text-gray-600">{isBn ? 'লোড হচ্ছে...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!patientUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{isBn ? 'লগইন পেজে যাচ্ছে...' : 'Redirecting...'}</p>
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
            <span className="text-2xl font-bold text-blue-600">{isBn ? 'নির্ণয়' : 'Nirnoy'}</span>
            <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-xs font-medium">
              {(patientUser.subscriptionTier || 'free').toUpperCase()}
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-gray-700 text-sm hidden sm:block">{patientUser.name}</span>
            <button onClick={handleLogout} className="text-red-500 hover:text-red-600 text-sm font-medium">
              {isBn ? 'লগআউট' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-4 overflow-x-auto">
            {[
              { id: 'home', icon: '🏠', label: isBn ? 'হোম' : 'Home' },
              { id: 'ai', icon: '🤖', label: isBn ? 'এআই সহকারী' : 'AI Assistant' },
              { id: 'quiz', icon: '🎯', label: isBn ? 'কুইজ' : 'Quiz' },
              { id: 'feedback', icon: '💬', label: isBn ? 'মতামত' : 'Feedback' },
              { id: 'profile', icon: '👤', label: isBn ? 'প্রোফাইল' : 'Profile' },
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
              <h1 className="text-xl font-semibold mb-1">{isBn ? 'স্বাগতম, ' + patientUser.name : 'Welcome, ' + patientUser.name}</h1>
              <p className="text-blue-100 text-sm">{isBn ? 'আপনার স্বাস্থ্য ড্যাশবোর্ড' : 'Your health dashboard'}</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: '❤️', value: patientUser.healthScore || 85, label: isBn ? 'স্বাস্থ্য স্কোর' : 'Health Score' },
                { icon: '🏆', value: patientUser.quizPoints || 0, label: isBn ? 'পয়েন্ট' : 'Points' },
                { icon: '🔥', value: patientUser.streakDays || 0, label: isBn ? 'স্ট্রিক' : 'Streak' },
                { icon: '📅', value: 0, label: isBn ? 'অ্যাপয়েন্টমেন্ট' : 'Appointments' },
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-2xl mb-1">{stat.icon}</div>
                  <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-4">{isBn ? 'দ্রুত অ্যাকশন' : 'Quick Actions'}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button onClick={() => setActiveTab('ai')} className="p-4 bg-gray-50 hover:bg-blue-50 rounded-lg text-center transition-colors">
                  <span className="text-2xl block mb-1">🤖</span>
                  <span className="text-xs text-gray-600">{isBn ? 'এআই সহকারী' : 'AI Assistant'}</span>
                </button>
                <Link to="/my-appointments" className="p-4 bg-gray-50 hover:bg-blue-50 rounded-lg text-center transition-colors">
                  <span className="text-2xl block mb-1">📅</span>
                  <span className="text-xs text-gray-600">{isBn ? 'অ্যাপয়েন্টমেন্ট' : 'Appointments'}</span>
                </Link>
                <button onClick={() => setActiveTab('quiz')} className="p-4 bg-gray-50 hover:bg-blue-50 rounded-lg text-center transition-colors">
                  <span className="text-2xl block mb-1">🎯</span>
                  <span className="text-xs text-gray-600">{isBn ? 'কুইজ খেলুন' : 'Play Quiz'}</span>
                </button>
                <button onClick={() => setActiveTab('feedback')} className="p-4 bg-gray-50 hover:bg-blue-50 rounded-lg text-center transition-colors">
                  <span className="text-2xl block mb-1">💬</span>
                  <span className="text-xs text-gray-600">{isBn ? 'মতামত দিন' : 'Give Feedback'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI ASSISTANT TAB */}
        {activeTab === 'ai' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-[calc(100vh-200px)] flex flex-col">
            <div className="bg-blue-600 p-4 text-white">
              <h2 className="font-semibold">{isBn ? '🤖 নির্ণয় এআই সহকারী' : '🤖 Nirnoy AI Assistant'}</h2>
              <p className="text-sm text-blue-100">{isBn ? 'আপনার স্বাস্থ্য সমস্যা বলুন' : 'Tell me your health concerns'}</p>
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
                  placeholder={isBn ? 'আপনার সমস্যা লিখুন...' : 'Describe your problem...'}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={isTyping}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isTyping || !chatInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-5 py-2 rounded-lg text-sm font-medium"
                >
                  {isBn ? 'পাঠান' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QUIZ TAB */}
        {activeTab === 'quiz' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">{isBn ? '🎯 স্বাস্থ্য কুইজ' : '🎯 Health Quiz'}</h2>
            
            {!currentQuiz ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                <div className="text-5xl mb-4">🎯</div>
                <h3 className="font-semibold text-gray-800 mb-2">{isBn ? 'দৈনিক স্বাস্থ্য কুইজ' : 'Daily Health Quiz'}</h3>
                <p className="text-gray-500 text-sm mb-4">{isBn ? 'আপনার স্বাস্থ্য সম্পর্কে জানুন এবং পয়েন্ট অর্জন করুন' : 'Learn about your health and earn points'}</p>
                <button onClick={startQuiz} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium">
                  {isBn ? 'কুইজ শুরু করুন' : 'Start Quiz'}
                </button>
              </div>
            ) : quizComplete ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="font-semibold text-gray-800 mb-2">{isBn ? 'কুইজ সম্পন্ন!' : 'Quiz Complete!'}</h3>
                <p className="text-3xl font-bold text-blue-600 mb-2">{quizScore}/{DAILY_QUIZ.length * 10}</p>
                <p className="text-gray-500 text-sm mb-4">{isBn ? 'পয়েন্ট অর্জিত' : 'Points earned'}</p>
                <button onClick={() => setCurrentQuiz(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium">
                  {isBn ? 'ফিরে যান' : 'Go Back'}
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="text-sm text-gray-500 mb-2">{isBn ? 'প্রশ্ন' : 'Question'} {quizIndex + 1}/{DAILY_QUIZ.length}</div>
                <h3 className="font-semibold text-gray-800 mb-4">{isBn ? currentQuiz[quizIndex].questionBn : currentQuiz[quizIndex].question}</h3>
                <div className="space-y-2">
                  {currentQuiz[quizIndex].options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => answerQuiz(opt.points)}
                      className="w-full text-left p-3 bg-gray-50 hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                    >
                      {isBn ? opt.textBn : opt.text}
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
            <h2 className="text-lg font-semibold text-gray-800">{isBn ? '💬 মতামত দিন' : '💬 Give Feedback'}</h2>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              {feedbackSent ? (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">✅</div>
                  <h3 className="font-semibold text-gray-800">{isBn ? 'ধন্যবাদ!' : 'Thank you!'}</h3>
                  <p className="text-gray-500 text-sm">{isBn ? 'আপনার মতামত পাঠানো হয়েছে' : 'Your feedback has been submitted'}</p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="text-sm text-gray-600 block mb-2">{isBn ? 'বিভাগ' : 'Category'}</label>
                    <select
                      value={feedbackCategory}
                      onChange={(e) => setFeedbackCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="general">{isBn ? 'সাধারণ' : 'General'}</option>
                      <option value="bug">{isBn ? 'সমস্যা রিপোর্ট' : 'Bug Report'}</option>
                      <option value="feature">{isBn ? 'নতুন ফিচার' : 'Feature Request'}</option>
                      <option value="complaint">{isBn ? 'অভিযোগ' : 'Complaint'}</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="text-sm text-gray-600 block mb-2">{isBn ? 'আপনার মতামত' : 'Your Feedback'}</label>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder={isBn ? 'আপনার মতামত লিখুন...' : 'Write your feedback...'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-32 resize-none"
                    />
                  </div>
                  <button
                    onClick={submitFeedback}
                    disabled={!feedbackText.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium"
                  >
                    {isBn ? 'পাঠান' : 'Submit'}
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
                  <h3 className="font-semibold text-gray-800">{isBn ? '💎 সাবস্ক্রিপশন' : '💎 Subscription'}</h3>
                  <p className="text-sm text-gray-500">{isBn ? 'বর্তমান প্ল্যান: ' : 'Current plan: '}<span className="font-medium text-blue-600">{(patientUser.subscriptionTier || 'free').toUpperCase()}</span></p>
                </div>
                <button onClick={() => setShowPricing(!showPricing)} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  {showPricing ? (isBn ? 'বন্ধ করুন' : 'Close') : (isBn ? 'প্ল্যান দেখুন' : 'View Plans')}
                </button>
              </div>
              
              {showPricing && (
                <div className="grid md:grid-cols-4 gap-3 pt-4 border-t border-gray-200">
                  {PLANS.map(plan => (
                    <div key={plan.id} className={'p-4 rounded-lg border-2 ' + (plan.popular ? 'border-blue-500 bg-blue-50' : 'border-gray-200')}>
                      {plan.popular && <div className="text-xs text-blue-600 font-medium mb-1">{isBn ? 'জনপ্রিয়' : 'Popular'}</div>}
                      <div className="font-semibold text-gray-800">{isBn ? plan.nameBn : plan.name}</div>
                      <div className="text-2xl font-bold text-gray-800">৳{isBn ? plan.priceBn : plan.price}<span className="text-sm font-normal text-gray-500">/{isBn ? 'মাস' : 'mo'}</span></div>
                      <ul className="mt-2 space-y-1">
                        {(isBn ? plan.featuresBn : plan.features).map((f, i) => (
                          <li key={i} className="text-xs text-gray-600">✓ {f}</li>
                        ))}
                      </ul>
                      <button className={'w-full mt-3 py-1.5 rounded text-sm font-medium ' + (
                        patientUser.subscriptionTier === plan.id 
                          ? 'bg-gray-100 text-gray-500 cursor-default' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      )}>
                        {patientUser.subscriptionTier === plan.id ? (isBn ? 'বর্তমান' : 'Current') : (isBn ? 'আপগ্রেড' : 'Upgrade')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-gray-800">{isBn ? '👤 প্রোফাইল' : '👤 Profile'}</h2>
                <div className="flex items-center gap-2">
                  {saveMessage && <span className={saveMessage.includes('✓') ? 'text-green-600 text-sm' : 'text-red-600 text-sm'}>{saveMessage}</span>}
                  {isEditing ? (
                    <>
                      <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded text-sm">{isBn ? 'বাতিল' : 'Cancel'}</button>
                      <button onClick={handleSaveProfile} disabled={saving} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm disabled:opacity-50">
                        {saving ? '...' : (isBn ? 'সংরক্ষণ' : 'Save')}
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setIsEditing(true)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">{isBn ? 'সম্পাদনা' : 'Edit'}</button>
                  )}
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-gray-500 uppercase">{isBn ? 'মৌলিক তথ্য' : 'Basic Info'}</h3>
                  {[
                    { key: 'name', label: isBn ? 'নাম' : 'Name', type: 'text' },
                    { key: 'phone', label: isBn ? 'ফোন' : 'Phone', readonly: true, value: patientUser.phone },
                    { key: 'email', label: isBn ? 'ইমেইল' : 'Email', type: 'email' },
                    { key: 'dateOfBirth', label: isBn ? 'জন্ম তারিখ' : 'DOB', type: 'date' },
                    { key: 'gender', label: isBn ? 'লিঙ্গ' : 'Gender', type: 'select', options: ['', 'male', 'female', 'other'] },
                    { key: 'bloodGroup', label: isBn ? 'রক্তের গ্রুপ' : 'Blood', type: 'select', options: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
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
                  <h3 className="text-xs font-medium text-gray-500 uppercase">{isBn ? 'স্বাস্থ্য তথ্য' : 'Health Info'}</h3>
                  {[
                    { key: 'heightCm', label: isBn ? 'উচ্চতা' : 'Height', type: 'number', suffix: 'cm' },
                    { key: 'weightKg', label: isBn ? 'ওজন' : 'Weight', type: 'number', suffix: 'kg' },
                    { key: 'chronicConditions', label: isBn ? 'রোগ' : 'Conditions', type: 'text' },
                    { key: 'allergies', label: isBn ? 'এলার্জি' : 'Allergies', type: 'text' },
                    { key: 'emergencyContactName', label: isBn ? 'জরুরি নাম' : 'Emergency', type: 'text' },
                    { key: 'emergencyContactPhone', label: isBn ? 'জরুরি ফোন' : 'Emg Phone', type: 'tel' },
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
