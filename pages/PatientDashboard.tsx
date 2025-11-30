import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatWithHealthAssistant } from '../services/geminiService';
import { ChatMessage } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth, PatientProfile } from '../contexts/AuthContext';

// ============ TYPES ============
type TabType = 'home' | 'ai' | 'food' | 'meds' | 'doctors' | 'quiz' | 'feedback' | 'profile';

interface Quiz {
  id: string;
  title: string;
  titleBn: string;
  category: string;
  icon: string;
  duration: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  questions: number;
  completed?: boolean;
  score?: number;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  times: string[];
  startDate: string;
  endDate?: string;
  reminderEnabled: boolean;
  doctorName?: string;
}

// ============ QUIZ DATA ============
const QUIZZES: Quiz[] = [
  { id: 'personality', title: 'Personality Type', titleBn: 'ব্যক্তিত্বের ধরন', category: 'personality', icon: '🎭', duration: '10 min', frequency: 'yearly', questions: 20 },
  { id: 'emotional-iq', title: 'Emotional Intelligence', titleBn: 'আবেগীয় বুদ্ধিমত্তা', category: 'personality', icon: '🧠', duration: '8 min', frequency: 'monthly', questions: 15 },
  { id: 'mood', title: 'Mood Check', titleBn: 'মেজাজ পরীক্ষা', category: 'mental', icon: '😊', duration: '3 min', frequency: 'daily', questions: 5 },
  { id: 'anxiety', title: 'Anxiety Check', titleBn: 'উদ্বেগ পরীক্ষা', category: 'mental', icon: '😰', duration: '4 min', frequency: 'weekly', questions: 8 },
  { id: 'sleep', title: 'Sleep Quality', titleBn: 'ঘুমের মান', category: 'wellness', icon: '😴', duration: '4 min', frequency: 'weekly', questions: 8 },
  { id: 'stress', title: 'Stress Level', titleBn: 'চাপের মাত্রা', category: 'wellness', icon: '😓', duration: '4 min', frequency: 'weekly', questions: 8 },
];

// ============ MAIN COMPONENT ============
export const PatientDashboard: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, role, logout, isLoading, updateProfile } = useAuth();
  
  // Debug logging
  useEffect(() => {
    console.log('[PatientDashboard] State:', { user: user?.name, role, isLoading });
  }, [user, role, isLoading]);
  
  // Redirect if not logged in
  useEffect(() => {
    console.log('[PatientDashboard] Checking auth:', { isLoading, hasUser: !!user, role });
    if (!isLoading && (!user || role !== 'patient')) {
      console.log('[PatientDashboard] Redirecting to patient-auth');
      navigate('/patient-auth', { replace: true });
    }
  }, [user, role, isLoading, navigate]);
  
  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Show message while redirecting (instead of blank)
  if (!user || role !== 'patient') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }
  
  const patientUser = user as PatientProfile;
  
  // State
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isBn = language === 'bn';

  // Initialize AI greeting
  useEffect(() => {
    const greeting = isBn 
      ? `আসসালামু আলাইকুম ${patientUser.name || 'User'}! আমি আপনার স্বাস্থ্য সহকারী। কিভাবে সাহায্য করতে পারি?`
      : `Hello ${patientUser.name || 'User'}! I'm your health assistant. How can I help you today?`;
    setMessages([{ role: 'model', text: greeting, timestamp: Date.now() }]);
  }, [patientUser.name, isBn]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isTyping) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage, timestamp: Date.now() }]);
    setIsTyping(true);
    
    try {
      const response = await chatWithHealthAssistant(userMessage, patientUser, messages);
      setMessages(prev => [...prev, { role: 'model', text: response, timestamp: Date.now() }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: isBn ? 'দুঃখিত, সমস্যা হয়েছে।' : 'Sorry, something went wrong.', timestamp: Date.now() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleLogout = () => {
    logout();
    onLogout?.();
    navigate('/');
  };

  // Tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-6">
            {/* Welcome Card */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                  {patientUser.gender === 'female' ? '👩' : '👨'}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{isBn ? 'স্বাগতম' : 'Welcome'}, {patientUser.name || 'User'}!</h2>
                  <p className="text-blue-100">{isBn ? 'প্রিমিয়াম সদস্য' : 'Premium Member'} ⭐</p>
                </div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: '🤖', label: isBn ? 'AI সহকারী' : 'AI Assistant', tab: 'ai' as TabType },
                { icon: '🍽️', label: isBn ? 'খাবার স্ক্যান' : 'Food Scanner', tab: 'food' as TabType },
                { icon: '💊', label: isBn ? 'ওষুধ' : 'Medications', tab: 'meds' as TabType },
                { icon: '🧠', label: isBn ? 'কুইজ' : 'Health Quiz', tab: 'quiz' as TabType },
              ].map((action, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(action.tab)}
                  className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all text-center"
                >
                  <div className="text-3xl mb-2">{action.icon}</div>
                  <div className="text-sm font-medium text-gray-700">{action.label}</div>
                </button>
              ))}
            </div>
            
            {/* Find Doctor CTA */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-lg mb-2">{isBn ? 'ডাক্তার খুঁজুন' : 'Find a Doctor'}</h3>
              <p className="text-gray-600 text-sm mb-4">{isBn ? '৫০০+ বিশেষজ্ঞ ডাক্তার' : '500+ specialist doctors available'}</p>
              <button 
                onClick={() => navigate('/doctors')}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                {isBn ? 'ডাক্তার দেখুন' : 'Browse Doctors'}
              </button>
            </div>
          </div>
        );
        
      case 'ai':
        return (
          <div className="bg-white rounded-xl shadow-sm h-[calc(100vh-200px)] flex flex-col">
            <div className="p-4 border-b bg-blue-600 text-white rounded-t-xl">
              <h3 className="font-semibold">🤖 {isBn ? 'AI স্বাস্থ্য সহকারী' : 'AI Health Assistant'}</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl ${
                    msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-3 rounded-2xl">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={isBn ? 'আপনার প্রশ্ন লিখুন...' : 'Type your question...'}
                  className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isTyping || !chatInput.trim()}
                  className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 disabled:opacity-50"
                >
                  {isBn ? 'পাঠান' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        );
        
      case 'profile':
        return (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-lg mb-4">{isBn ? 'আমার প্রোফাইল' : 'My Profile'}</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                  {patientUser.gender === 'female' ? '👩' : '👨'}
                </div>
                <div>
                  <h4 className="font-semibold text-lg">{patientUser.name || 'User'}</h4>
                  <p className="text-gray-600">{patientUser.phone}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">{isBn ? 'লিঙ্গ' : 'Gender'}</p>
                  <p className="font-medium">{patientUser.gender || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">{isBn ? 'রক্তের গ্রুপ' : 'Blood Group'}</p>
                  <p className="font-medium">{patientUser.bloodGroup || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">{isBn ? 'জন্ম তারিখ' : 'Date of Birth'}</p>
                  <p className="font-medium">{patientUser.dateOfBirth || '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">{isBn ? 'সাবস্ক্রিপশন' : 'Subscription'}</p>
                  <p className="font-medium text-blue-600">{patientUser.subscriptionTier || 'Premium'} ⭐</p>
                </div>
              </div>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="bg-white rounded-xl p-8 shadow-sm text-center">
            <div className="text-4xl mb-4">🚧</div>
            <h3 className="font-semibold text-lg mb-2">{isBn ? 'শীঘ্রই আসছে' : 'Coming Soon'}</h3>
            <p className="text-gray-600">{isBn ? 'এই ফিচারটি শীঘ্রই চালু হবে' : 'This feature will be available soon'}</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💙</span>
            <span className="font-bold text-xl text-blue-600">Nirnoy</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-600 hover:text-red-600 transition-colors"
          >
            {isBn ? 'লগআউট' : 'Logout'}
          </button>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {renderTabContent()}
      </main>
      
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-around py-2">
            {[
              { id: 'home' as TabType, icon: '🏠', label: isBn ? 'হোম' : 'Home' },
              { id: 'ai' as TabType, icon: '🤖', label: 'AI' },
              { id: 'quiz' as TabType, icon: '🧠', label: isBn ? 'কুইজ' : 'Quiz' },
              { id: 'profile' as TabType, icon: '👤', label: isBn ? 'প্রোফাইল' : 'Profile' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
                  activeTab === tab.id ? 'text-blue-600 bg-blue-50' : 'text-gray-500'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="text-xs mt-1">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default PatientDashboard;
