/**
 * NIRNOY PATIENT DASHBOARD - PRODUCTION READY
 * Clean UI with 60-30-10 color rule
 * 60% White/Light Gray, 30% Blue, 10% Accent colors
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth, PatientProfile } from '../contexts/AuthContext';
import { chatWithHealthAssistant } from '../services/geminiService';

// ============ TYPES ============
interface ConsultedDoctor {
  id: string;
  name: string;
  specialty: string;
  lastVisit: string;
  totalVisits: number;
  prescriptions: { date: string; diagnosis: string; medicines: string[] }[];
}

// ============ MOCK DATA (will be from Supabase later) ============
const MOCK_CONSULTED_DOCTORS: ConsultedDoctor[] = [];

// ============ MAIN COMPONENT ============
export const PatientDashboard: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, role, logout, isLoading, updateProfile } = useAuth();
  const isBn = language === 'bn';
  
  // State
  const [initDelay, setInitDelay] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'ai' | 'doctors' | 'profile'>('home');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{role: string; content: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Profile editing state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [editForm, setEditForm] = useState({
    name: '', email: '', dateOfBirth: '', gender: '', bloodGroup: '',
    heightCm: '', weightKg: '', chronicConditions: '', allergies: '',
    emergencyContactName: '', emergencyContactPhone: ''
  });
  
  // My Doctors state
  const [consultedDoctors] = useState<ConsultedDoctor[]>(MOCK_CONSULTED_DOCTORS);
  const [selectedDoctor, setSelectedDoctor] = useState<ConsultedDoctor | null>(null);
  
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
        ? 'আসসালামু আলাইকুম ' + patientUser.name + '! আমি নির্ণয় এআই। আপনার স্বাস্থ্য সম্পর্কে যেকোনো প্রশ্ন করুন - মাথাব্যথা, জ্বর, পেটের সমস্যা, বা অন্য কিছু।'
        : 'Hello ' + patientUser.name + '! I am Nirnoy AI. Ask me anything about your health - headaches, fever, stomach issues, or anything else.';
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

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isTyping) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);
    
    try {
      // Build context from patient profile
      const context = patientUser ? {
        name: patientUser.name,
        age: patientUser.dateOfBirth ? Math.floor((Date.now() - new Date(patientUser.dateOfBirth).getTime()) / 31557600000) : undefined,
        gender: patientUser.gender,
        bloodGroup: patientUser.bloodGroup,
        chronicConditions: patientUser.chronicConditions,
        allergies: patientUser.allergies
      } : {};
      
      const response = await chatWithHealthAssistant(userMessage, messages.map(m => m.role + ": " + m.content), JSON.stringify(context));
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: isBn 
          ? 'দুঃখিত, একটি সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
          : 'Sorry, something went wrong. Please try again.'
      }]);
    }
    
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
      {/* Header - Clean white with blue accent */}
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

      {/* Navigation - Simple tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-6">
            {[
              { id: 'home', icon: '🏠', label: isBn ? 'হোম' : 'Home' },
              { id: 'ai', icon: '🤖', label: isBn ? 'এআই সহকারী' : 'AI Assistant' },
              { id: 'doctors', icon: '👨‍⚕️', label: isBn ? 'আমার ডাক্তার' : 'My Doctors' },
              { id: 'profile', icon: '👤', label: isBn ? 'প্রোফাইল' : 'Profile' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={'py-3 px-1 text-sm font-medium border-b-2 transition-colors ' + (
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
            {/* Welcome */}
            <div className="bg-blue-600 rounded-xl p-6 text-white">
              <h1 className="text-xl font-semibold mb-1">
                {isBn ? 'স্বাগতম, ' + patientUser.name : 'Welcome, ' + patientUser.name}
              </h1>
              <p className="text-blue-100 text-sm">
                {isBn ? 'আপনার স্বাস্থ্য ড্যাশবোর্ড' : 'Your health dashboard'}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: '❤️', value: patientUser.healthScore || 85, label: isBn ? 'স্বাস্থ্য স্কোর' : 'Health Score' },
                { icon: '🏆', value: patientUser.quizPoints || 0, label: isBn ? 'পয়েন্ট' : 'Points' },
                { icon: '👨‍⚕️', value: consultedDoctors.length, label: isBn ? 'ডাক্তার' : 'Doctors' },
                { icon: '📅', value: 0, label: isBn ? 'অ্যাপয়েন্টমেন্ট' : 'Appointments' },
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-2xl mb-1">{stat.icon}</div>
                  <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-800 mb-4">{isBn ? 'দ্রুত অ্যাকশন' : 'Quick Actions'}</h2>
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => setActiveTab('ai')} className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-center transition-colors">
                  <span className="text-2xl block mb-1">🤖</span>
                  <span className="text-xs text-gray-600">{isBn ? 'এআই সহকারী' : 'AI Assistant'}</span>
                </button>
                <Link to="/my-appointments" className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-center transition-colors">
                  <span className="text-2xl block mb-1">📅</span>
                  <span className="text-xs text-gray-600">{isBn ? 'অ্যাপয়েন্টমেন্ট' : 'Appointments'}</span>
                </Link>
                <button onClick={() => setActiveTab('doctors')} className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-center transition-colors">
                  <span className="text-2xl block mb-1">👨‍⚕️</span>
                  <span className="text-xs text-gray-600">{isBn ? 'আমার ডাক্তার' : 'My Doctors'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI ASSISTANT TAB */}
        {activeTab === 'ai' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-[calc(100vh-200px)] flex flex-col">
            {/* Header */}
            <div className="bg-blue-600 p-4 text-white">
              <h2 className="font-semibold">{isBn ? '🤖 নির্ণয় এআই সহকারী' : '🤖 Nirnoy AI Assistant'}</h2>
              <p className="text-sm text-blue-100">{isBn ? 'আপনার স্বাস্থ্য বিষয়ে জিজ্ঞাসা করুন' : 'Ask about your health concerns'}</p>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={'flex ' + (msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={'max-w-[85%] p-3 rounded-lg text-sm ' + (
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-800'
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
            
            {/* Input */}
            <div className="border-t border-gray-200 p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={isBn ? 'আপনার সমস্যা লিখুন... (যেমন: মাথা ব্যথা করছে)' : 'Describe your problem... (e.g., I have a headache)'}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={isTyping}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isTyping || !chatInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {isBn ? 'পাঠান' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MY DOCTORS TAB */}
        {activeTab === 'doctors' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                {isBn ? '👨‍⚕️ আমার ডাক্তারগণ' : '👨‍⚕️ My Doctors'}
              </h2>
              <Link to="/doctor-search" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                {isBn ? '+ নতুন ডাক্তার খুঁজুন' : '+ Find New Doctor'}
              </Link>
            </div>

            {consultedDoctors.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="text-4xl mb-3">👨‍⚕️</div>
                <h3 className="font-medium text-gray-800 mb-1">
                  {isBn ? 'কোনো ডাক্তার নেই' : 'No doctors yet'}
                </h3>
                <p className="text-gray-500 text-sm mb-4">
                  {isBn ? 'আপনি এখনো কোনো ডাক্তারের সাথে পরামর্শ করেননি।' : 'You haven\'t consulted any doctors yet.'}
                </p>
                <Link to="/doctor-search" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  {isBn ? 'ডাক্তার খুঁজুন' : 'Find a Doctor'}
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {consultedDoctors.map(doc => (
                  <div 
                    key={doc.id} 
                    onClick={() => setSelectedDoctor(doc)}
                    className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                        {doc.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-800">{doc.name}</h3>
                        <p className="text-sm text-gray-500">{doc.specialty}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-800">{doc.totalVisits} {isBn ? 'টি ভিজিট' : 'visits'}</div>
                        <div className="text-xs text-gray-500">{isBn ? 'সর্বশেষ: ' : 'Last: '}{doc.lastVisit}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Doctor Detail Modal */}
            {selectedDoctor && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
                  <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">{selectedDoctor.name}</h3>
                    <button onClick={() => setSelectedDoctor(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div>
                      <span className="text-sm text-gray-500">{isBn ? 'বিশেষত্ব' : 'Specialty'}</span>
                      <p className="font-medium">{selectedDoctor.specialty}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">{isBn ? 'মোট ভিজিট' : 'Total Visits'}</span>
                      <p className="font-medium">{selectedDoctor.totalVisits}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">{isBn ? 'প্রেসক্রিপশন' : 'Prescriptions'}</span>
                      {selectedDoctor.prescriptions.length === 0 ? (
                        <p className="text-gray-400 text-sm">{isBn ? 'কোনো প্রেসক্রিপশন নেই' : 'No prescriptions'}</p>
                      ) : (
                        <div className="space-y-2 mt-2">
                          {selectedDoctor.prescriptions.map((rx, i) => (
                            <div key={i} className="bg-gray-50 p-3 rounded-lg text-sm">
                              <div className="font-medium">{rx.date}</div>
                              <div className="text-gray-600">{rx.diagnosis}</div>
                              <div className="text-gray-500 text-xs mt-1">{rx.medicines.join(', ')}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-800">{isBn ? 'আমার প্রোফাইল' : 'My Profile'}</h2>
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
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{isBn ? 'মৌলিক তথ্য' : 'Basic Info'}</h3>
                {[
                  { key: 'name', label: isBn ? 'নাম' : 'Name', type: 'text' },
                  { key: 'phone', label: isBn ? 'ফোন' : 'Phone', type: 'text', readonly: true, value: patientUser.phone },
                  { key: 'email', label: isBn ? 'ইমেইল' : 'Email', type: 'email' },
                  { key: 'dateOfBirth', label: isBn ? 'জন্ম তারিখ' : 'Date of Birth', type: 'date' },
                  { key: 'gender', label: isBn ? 'লিঙ্গ' : 'Gender', type: 'select', options: ['', 'male', 'female', 'other'] },
                  { key: 'bloodGroup', label: isBn ? 'রক্তের গ্রুপ' : 'Blood Group', type: 'select', options: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
                ].map(field => (
                  <div key={field.key}>
                    <label className="text-xs text-gray-500">{field.label}</label>
                    {field.readonly ? (
                      <p className="text-gray-800">{field.value}</p>
                    ) : isEditing ? (
                      field.type === 'select' ? (
                        <select
                          value={(editForm as any)[field.key]}
                          onChange={(e) => setEditForm({...editForm, [field.key]: e.target.value})}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                        >
                          {field.options?.map(opt => <option key={opt} value={opt}>{opt || (isBn ? 'নির্বাচন করুন' : 'Select')}</option>)}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          value={(editForm as any)[field.key]}
                          onChange={(e) => setEditForm({...editForm, [field.key]: e.target.value})}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                        />
                      )
                    ) : (
                      <p className="text-gray-800">{(patientUser as any)[field.key] || '-'}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Health Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{isBn ? 'স্বাস্থ্য তথ্য' : 'Health Info'}</h3>
                {[
                  { key: 'heightCm', label: isBn ? 'উচ্চতা (সেমি)' : 'Height (cm)', type: 'number' },
                  { key: 'weightKg', label: isBn ? 'ওজন (কেজি)' : 'Weight (kg)', type: 'number' },
                  { key: 'chronicConditions', label: isBn ? 'দীর্ঘস্থায়ী রোগ' : 'Chronic Conditions', type: 'text', placeholder: isBn ? 'কমা দিয়ে আলাদা করুন' : 'Separate with commas' },
                  { key: 'allergies', label: isBn ? 'এলার্জি' : 'Allergies', type: 'text', placeholder: isBn ? 'কমা দিয়ে আলাদা করুন' : 'Separate with commas' },
                  { key: 'emergencyContactName', label: isBn ? 'জরুরি যোগাযোগ (নাম)' : 'Emergency Contact (Name)', type: 'text' },
                  { key: 'emergencyContactPhone', label: isBn ? 'জরুরি যোগাযোগ (ফোন)' : 'Emergency Contact (Phone)', type: 'tel' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="text-xs text-gray-500">{field.label}</label>
                    {isEditing ? (
                      <input
                        type={field.type}
                        value={(editForm as any)[field.key]}
                        onChange={(e) => setEditForm({...editForm, [field.key]: e.target.value})}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-800">
                        {field.key === 'chronicConditions' || field.key === 'allergies'
                          ? ((patientUser as any)[field.key] || []).join(', ') || '-'
                          : (patientUser as any)[field.key] || '-'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Account Info */}
            <div className="mt-6 pt-5 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">{isBn ? 'অ্যাকাউন্ট' : 'Account'}</h3>
              <div className="flex gap-4 text-sm">
                <div className="bg-blue-50 px-3 py-2 rounded">
                  <span className="text-blue-600">{isBn ? 'সাবস্ক্রিপশন: ' : 'Plan: '}</span>
                  <span className="font-medium text-blue-800">{(patientUser.subscriptionTier || 'free').toUpperCase()}</span>
                </div>
                <div className="bg-gray-50 px-3 py-2 rounded">
                  <span className="text-gray-600">{isBn ? 'আইডি: ' : 'ID: '}</span>
                  <span className="font-mono text-xs text-gray-800">{patientUser.id.slice(0, 8)}...</span>
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
