/**
 * NIRNOY PATIENT DASHBOARD - SIMPLIFIED FOR STABILITY
 * Handles 1000+ users with Supabase backend
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth, PatientProfile } from '../contexts/AuthContext';

// ============ MAIN COMPONENT ============
export const PatientDashboard: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, role, logout, isLoading } = useAuth();
  const isBn = language === 'bn';
  
  // State
  const [initDelay, setInitDelay] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'profile' | 'ai'>('home');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{role: string; content: string}[]>([]);
  
  // Safe user data with defaults
  const patientUser = useMemo(() => {
    if (user && role === 'patient') {
      return user as PatientProfile;
    }
    return null;
  }, [user, role]);

  // Init delay to let auth load
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('[Dashboard] Init delay complete');
      setInitDelay(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  
  // Redirect if not logged in
  useEffect(() => {
    if (!initDelay && !isLoading) {
      console.log('[Dashboard] Auth check:', { user: !!user, role, isLoading });
      if (!user || role !== 'patient') {
        console.log('[Dashboard] Not authenticated, redirecting');
        navigate('/patient-auth', { replace: true });
      }
    }
  }, [user, role, isLoading, initDelay, navigate]);

  // Welcome message
  useEffect(() => {
    if (patientUser && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: isBn 
          ? 'আসসালামু আলাইকুম ' + patientUser.name + '! আমি আপনার স্বাস্থ্য সহকারী।'
          : 'Hello ' + patientUser.name + '! I am your health assistant.'
      }]);
    }
  }, [patientUser, isBn, messages.length]);

  // Handle logout
  const handleLogout = () => {
    logout();
    if (onLogout) onLogout();
    navigate('/', { replace: true });
  };

  // Loading state
  if (isLoading || initDelay) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">{isBn ? 'লোড হচ্ছে...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!patientUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">{isBn ? 'লগইন পেজে যাচ্ছে...' : 'Redirecting to login...'}</p>
        </div>
      </div>
    );
  }

  // ============ RENDER ============
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-2xl font-bold text-blue-600">
              {isBn ? 'নির্ণয়' : 'Nirnoy'}
            </Link>
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
              {(patientUser.subscriptionTier || 'free').toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-700 font-medium hidden sm:block">
              {isBn ? 'স্বাগতম, ' + patientUser.name : 'Welcome, ' + patientUser.name}
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {isBn ? 'লগআউট' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2">
            {[
              { id: 'home', label: isBn ? '🏠 হোম' : '🏠 Home' },
              { id: 'ai', label: isBn ? '🤖 এআই সহকারী' : '🤖 AI Assistant' },
              { id: 'profile', label: isBn ? '👤 প্রোফাইল' : '👤 Profile' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ' + (
                  activeTab === tab.id 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Home Tab */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Welcome Card */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
              <h1 className="text-2xl font-bold mb-2">
                {isBn ? 'স্বাগতম, ' + patientUser.name + '!' : 'Welcome, ' + patientUser.name + '!'}
              </h1>
              <p className="opacity-90">
                {isBn 
                  ? 'আপনার স্বাস্থ্য ড্যাশবোর্ডে আপনাকে স্বাগতম।' 
                  : 'Welcome to your health dashboard.'}
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="text-3xl mb-2">❤️</div>
                <div className="text-2xl font-bold text-gray-800">{patientUser.healthScore || 85}</div>
                <div className="text-sm text-gray-500">{isBn ? 'স্বাস্থ্য স্কোর' : 'Health Score'}</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="text-3xl mb-2">🏆</div>
                <div className="text-2xl font-bold text-gray-800">{patientUser.quizPoints || 0}</div>
                <div className="text-sm text-gray-500">{isBn ? 'পয়েন্ট' : 'Points'}</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="text-3xl mb-2">🔥</div>
                <div className="text-2xl font-bold text-gray-800">{patientUser.streakDays || 0}</div>
                <div className="text-sm text-gray-500">{isBn ? 'দিনের স্ট্রিক' : 'Day Streak'}</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="text-3xl mb-2">📅</div>
                <div className="text-2xl font-bold text-gray-800">0</div>
                <div className="text-sm text-gray-500">{isBn ? 'অ্যাপয়েন্টমেন্ট' : 'Appointments'}</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                {isBn ? 'দ্রুত অ্যাকশন' : 'Quick Actions'}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link to="/doctors" className="flex flex-col items-center p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
                  <span className="text-3xl mb-2">👨‍⚕️</span>
                  <span className="text-sm font-medium text-gray-700">{isBn ? 'ডাক্তার খুঁজুন' : 'Find Doctor'}</span>
                </Link>
                <button onClick={() => setActiveTab('ai')} className="flex flex-col items-center p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors">
                  <span className="text-3xl mb-2">🤖</span>
                  <span className="text-sm font-medium text-gray-700">{isBn ? 'এআই সহকারী' : 'AI Assistant'}</span>
                </button>
                <Link to="/appointments" className="flex flex-col items-center p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors">
                  <span className="text-3xl mb-2">📅</span>
                  <span className="text-sm font-medium text-gray-700">{isBn ? 'অ্যাপয়েন্টমেন্ট' : 'Appointments'}</span>
                </Link>
                <button onClick={() => setActiveTab('profile')} className="flex flex-col items-center p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors">
                  <span className="text-3xl mb-2">👤</span>
                  <span className="text-sm font-medium text-gray-700">{isBn ? 'প্রোফাইল' : 'Profile'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Tab */}
        {activeTab === 'ai' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
              <h2 className="text-lg font-bold">{isBn ? '🤖 এআই স্বাস্থ্য সহকারী' : '🤖 AI Health Assistant'}</h2>
              <p className="text-sm opacity-90">{isBn ? 'আপনার স্বাস্থ্য সম্পর্কে জিজ্ঞাসা করুন' : 'Ask about your health'}</p>
            </div>
            
            {/* Chat Messages */}
            <div className="h-96 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={'flex ' + (msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={'max-w-[80%] p-3 rounded-xl ' + (
                    msg.role === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-800'
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Input */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={isBn ? 'আপনার প্রশ্ন লিখুন...' : 'Type your question...'}
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && chatInput.trim()) {
                      setMessages(prev => [...prev, { role: 'user', content: chatInput }]);
                      setChatInput('');
                      setTimeout(() => {
                        setMessages(prev => [...prev, { 
                          role: 'assistant', 
                          content: isBn 
                            ? 'আপনার প্রশ্নের জন্য ধন্যবাদ। আমি এখন আপনাকে সাহায্য করছি...' 
                            : 'Thank you for your question. Let me help you...'
                        }]);
                      }, 1000);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (chatInput.trim()) {
                      setMessages(prev => [...prev, { role: 'user', content: chatInput }]);
                      setChatInput('');
                      setTimeout(() => {
                        setMessages(prev => [...prev, { 
                          role: 'assistant', 
                          content: isBn 
                            ? 'আপনার প্রশ্নের জন্য ধন্যবাদ।' 
                            : 'Thank you for your question.'
                        }]);
                      }, 1000);
                    }
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  {isBn ? 'পাঠান' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              {isBn ? '👤 আমার প্রোফাইল' : '👤 My Profile'}
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700 border-b pb-2">{isBn ? 'মৌলিক তথ্য' : 'Basic Information'}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-500">{isBn ? 'নাম' : 'Name'}</label>
                    <p className="font-medium text-gray-800">{patientUser.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">{isBn ? 'ফোন' : 'Phone'}</label>
                    <p className="font-medium text-gray-800">{patientUser.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">{isBn ? 'ইমেইল' : 'Email'}</label>
                    <p className="font-medium text-gray-800">{patientUser.email || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">{isBn ? 'জন্ম তারিখ' : 'Date of Birth'}</label>
                    <p className="font-medium text-gray-800">{patientUser.dateOfBirth || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">{isBn ? 'লিঙ্গ' : 'Gender'}</label>
                    <p className="font-medium text-gray-800">{patientUser.gender || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">{isBn ? 'রক্তের গ্রুপ' : 'Blood Group'}</label>
                    <p className="font-medium text-gray-800">{patientUser.bloodGroup || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Health Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700 border-b pb-2">{isBn ? 'স্বাস্থ্য তথ্য' : 'Health Information'}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-500">{isBn ? 'উচ্চতা' : 'Height'}</label>
                    <p className="font-medium text-gray-800">{patientUser.heightCm ? patientUser.heightCm + ' cm' : '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">{isBn ? 'ওজন' : 'Weight'}</label>
                    <p className="font-medium text-gray-800">{patientUser.weightKg ? patientUser.weightKg + ' kg' : '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">{isBn ? 'দীর্ঘস্থায়ী রোগ' : 'Chronic Conditions'}</label>
                    <p className="font-medium text-gray-800">{(patientUser.chronicConditions || []).join(', ') || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">{isBn ? 'এলার্জি' : 'Allergies'}</label>
                    <p className="font-medium text-gray-800">{(patientUser.allergies || []).join(', ') || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold text-gray-700 mb-4">{isBn ? 'অ্যাকাউন্ট তথ্য' : 'Account Information'}</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <label className="text-sm text-blue-600">{isBn ? 'সাবস্ক্রিপশন' : 'Subscription'}</label>
                  <p className="font-bold text-blue-800">{(patientUser.subscriptionTier || 'free').toUpperCase()}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <label className="text-sm text-green-600">{isBn ? 'যাচাইকৃত' : 'Verified'}</label>
                  <p className="font-bold text-green-800">{patientUser.isVerified ? 'Yes' : 'No'}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <label className="text-sm text-purple-600">{isBn ? 'আইডি' : 'ID'}</label>
                  <p className="font-bold text-purple-800 text-xs truncate">{patientUser.id}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-8 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          2024 Nirnoy Health. {isBn ? 'সর্বস্বত্ব সংরক্ষিত।' : 'All rights reserved.'}
        </div>
      </footer>
    </div>
  );
};

export default PatientDashboard;
