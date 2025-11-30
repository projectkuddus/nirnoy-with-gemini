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
  const [initDelay, setInitDelay] = useState(true);
  
  // Give AuthContext time to load from localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('[PatientDashboard] Init delay complete');
      setInitDelay(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);
  
  // Debug logging
  useEffect(() => {
    console.log('[PatientDashboard] State:', { user: user?.name, role, isLoading, initDelay });
  }, [user, role, isLoading, initDelay]);
  
  // Redirect if not logged in (but wait for init)
  useEffect(() => {
    if (!initDelay && !isLoading && (!user || role !== 'patient')) {
      console.log('[PatientDashboard] Not authenticated, redirecting');
      navigate('/patient-auth', { replace: true });
    }
  }, [user, role, isLoading, initDelay, navigate]);
  
  // Show loading while checking auth
  if (isLoading || initDelay) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  
  // Still no user after delay - show redirect message
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
  
  // Profile editing
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: patientUser.name || '',
    emergencyContact: patientUser.emergencyContact || '',
    bloodGroup: patientUser.bloodGroup || '',
    chronicConditions: patientUser.chronicConditions?.join(', ') || '',
    allergies: patientUser.allergies?.join(', ') || '',
  });
  
  // Medications
  const [medications, setMedications] = useState<Medication[]>([]);
  const [showAddMed, setShowAddMed] = useState(false);
  
  // Quizzes
  const [completedQuizzes, setCompletedQuizzes] = useState<string[]>([]);
  
  // Feedback
  const [feedback, setFeedback] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  
  // Food scanner
  const [foodImage, setFoodImage] = useState<string | null>(null);
  const [foodAnalysis, setFoodAnalysis] = useState<string | null>(null);
  const [analyzingFood, setAnalyzingFood] = useState(false);

  // AI greeting
  useEffect(() => {
    if (messages.length === 0) {
      const greeting = isBn 
        ? `আসসালামু আলাইকুম ${patientUser.name}! আমি আপনার স্বাস্থ্য সহকারী। আজ আপনাকে কীভাবে সাহায্য করতে পারি?`
        : `Hello ${patientUser.name}! I'm your health assistant. How can I help you today?`;
      setMessages([{ role: 'assistant', content: greeting }]);
    }
  }, [patientUser.name, isBn]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle chat
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);
    
    try {
      const response = await chatWithHealthAssistant(userMessage, patientUser);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: isBn ? 'দুঃখিত, একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।' : 'Sorry, something went wrong. Please try again.' 
      }]);
    }
    
    setIsTyping(false);
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    if (onLogout) onLogout();
    navigate('/');
  };

  // Handle profile save
  const handleSaveProfile = async () => {
    const updates = {
      name: editForm.name,
      emergencyContact: editForm.emergencyContact,
      bloodGroup: editForm.bloodGroup,
      chronicConditions: editForm.chronicConditions.split(',').map(s => s.trim()).filter(Boolean),
      allergies: editForm.allergies.split(',').map(s => s.trim()).filter(Boolean),
    };
    
    await updateProfile(updates);
    setIsEditing(false);
  };

  // Handle food analysis
  const handleFoodUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setFoodImage(base64);
      setAnalyzingFood(true);
      
      try {
        const analysis = await chatWithHealthAssistant(
          `Analyze this food image for a patient with: ${patientUser.chronicConditions?.join(', ') || 'no known conditions'}. 
           Allergies: ${patientUser.allergies?.join(', ') || 'none'}. 
           Tell me if this food is safe and healthy for them.`,
          patientUser
        );
        setFoodAnalysis(analysis);
      } catch (error) {
        setFoodAnalysis(isBn ? 'বিশ্লেষণ করতে সমস্যা হয়েছে' : 'Failed to analyze');
      }
      
      setAnalyzingFood(false);
    };
    reader.readAsDataURL(file);
  };

  // Handle feedback
  const handleSubmitFeedback = () => {
    if (!feedback.trim()) return;
    
    // Save feedback to localStorage for admin
    const feedbacks = JSON.parse(localStorage.getItem('nirnoy_feedbacks') || '[]');
    feedbacks.push({
      id: Date.now().toString(),
      userId: patientUser.id,
      userName: patientUser.name,
      message: feedback,
      timestamp: new Date().toISOString(),
      status: 'pending'
    });
    localStorage.setItem('nirnoy_feedbacks', JSON.stringify(feedbacks));
    
    setFeedback('');
    setFeedbackSent(true);
    setTimeout(() => setFeedbackSent(false), 3000);
  };

  // Tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-6">
            {/* Welcome Card */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
              <h2 className="text-2xl font-bold mb-2">
                {isBn ? `স্বাগতম, ${patientUser.name}!` : `Welcome, ${patientUser.name}!`}
              </h2>
              <p className="opacity-90">
                {isBn ? 'আপনার স্বাস্থ্য ড্যাশবোর্ড' : 'Your health dashboard'}
              </p>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="text-3xl mb-2">🩺</div>
                <div className="text-sm text-gray-500">{isBn ? 'অ্যাপয়েন্টমেন্ট' : 'Appointments'}</div>
                <div className="text-xl font-bold">0</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="text-3xl mb-2">💊</div>
                <div className="text-sm text-gray-500">{isBn ? 'ওষুধ' : 'Medications'}</div>
                <div className="text-xl font-bold">{medications.length}</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="text-3xl mb-2">🎯</div>
                <div className="text-sm text-gray-500">{isBn ? 'কুইজ সম্পন্ন' : 'Quizzes Done'}</div>
                <div className="text-xl font-bold">{completedQuizzes.length}</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="text-3xl mb-2">⭐</div>
                <div className="text-sm text-gray-500">{isBn ? 'স্বাস্থ্য স্কোর' : 'Health Score'}</div>
                <div className="text-xl font-bold">85</div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="font-semibold mb-4">{isBn ? 'দ্রুত অ্যাকশন' : 'Quick Actions'}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button 
                  onClick={() => setActiveTab('ai')}
                  className="flex flex-col items-center p-4 rounded-xl bg-blue-50 hover:bg-blue-100 transition"
                >
                  <span className="text-2xl mb-2">🤖</span>
                  <span className="text-sm">{isBn ? 'AI সহকারী' : 'AI Assistant'}</span>
                </button>
                <button 
                  onClick={() => navigate('/doctors')}
                  className="flex flex-col items-center p-4 rounded-xl bg-green-50 hover:bg-green-100 transition"
                >
                  <span className="text-2xl mb-2">👨‍⚕️</span>
                  <span className="text-sm">{isBn ? 'ডাক্তার খুঁজুন' : 'Find Doctor'}</span>
                </button>
                <button 
                  onClick={() => setActiveTab('food')}
                  className="flex flex-col items-center p-4 rounded-xl bg-orange-50 hover:bg-orange-100 transition"
                >
                  <span className="text-2xl mb-2">🍽️</span>
                  <span className="text-sm">{isBn ? 'খাবার স্ক্যান' : 'Food Scan'}</span>
                </button>
                <button 
                  onClick={() => setActiveTab('quiz')}
                  className="flex flex-col items-center p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition"
                >
                  <span className="text-2xl mb-2">🧠</span>
                  <span className="text-sm">{isBn ? 'স্বাস্থ্য কুইজ' : 'Health Quiz'}</span>
                </button>
              </div>
            </div>
          </div>
        );
        
      case 'ai':
        return (
          <div className="bg-white rounded-xl shadow-sm border h-[calc(100vh-200px)] flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-semibold">{isBn ? 'AI স্বাস্থ্য সহকারী' : 'AI Health Assistant'}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
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
                  onChange={e => setChatInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder={isBn ? 'আপনার প্রশ্ন লিখুন...' : 'Type your question...'}
                  className="flex-1 border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || isTyping}
                  className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {isBn ? 'পাঠান' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        );
        
      case 'profile':
        return (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">{isBn ? 'আমার প্রোফাইল' : 'My Profile'}</h3>
              <button
                onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                {isEditing ? (isBn ? 'সংরক্ষণ করুন' : 'Save') : (isBn ? 'সম্পাদনা' : 'Edit')}
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">{isBn ? 'নাম' : 'Name'}</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                    className="w-full border rounded-lg px-4 py-2"
                  />
                ) : (
                  <p className="font-medium">{patientUser.name}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm text-gray-500 mb-1">{isBn ? 'ফোন' : 'Phone'}</label>
                <p className="font-medium">+880{patientUser.phone}</p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-500 mb-1">{isBn ? 'রক্তের গ্রুপ' : 'Blood Group'}</label>
                {isEditing ? (
                  <select
                    value={editForm.bloodGroup}
                    onChange={e => setEditForm({...editForm, bloodGroup: e.target.value})}
                    className="w-full border rounded-lg px-4 py-2"
                  >
                    <option value="">Select</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                ) : (
                  <p className="font-medium">{patientUser.bloodGroup || 'Not set'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm text-gray-500 mb-1">{isBn ? 'জরুরি যোগাযোগ' : 'Emergency Contact'}</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editForm.emergencyContact}
                    onChange={e => setEditForm({...editForm, emergencyContact: e.target.value})}
                    className="w-full border rounded-lg px-4 py-2"
                  />
                ) : (
                  <p className="font-medium">{patientUser.emergencyContact || 'Not set'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm text-gray-500 mb-1">{isBn ? 'দীর্ঘস্থায়ী রোগ' : 'Chronic Conditions'}</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.chronicConditions}
                    onChange={e => setEditForm({...editForm, chronicConditions: e.target.value})}
                    placeholder="Comma separated"
                    className="w-full border rounded-lg px-4 py-2"
                  />
                ) : (
                  <p className="font-medium">{patientUser.chronicConditions?.join(', ') || 'None'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm text-gray-500 mb-1">{isBn ? 'এলার্জি' : 'Allergies'}</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.allergies}
                    onChange={e => setEditForm({...editForm, allergies: e.target.value})}
                    placeholder="Comma separated"
                    className="w-full border rounded-lg px-4 py-2"
                  />
                ) : (
                  <p className="font-medium">{patientUser.allergies?.join(', ') || 'None'}</p>
                )}
              </div>
            </div>
          </div>
        );
        
      case 'feedback':
        return (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="text-xl font-semibold mb-4">{isBn ? 'মতামত দিন' : 'Give Feedback'}</h3>
            
            {feedbackSent ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <span className="text-2xl">✓</span>
                <p className="text-green-700 mt-2">{isBn ? 'ধন্যবাদ! আপনার মতামত পাঠানো হয়েছে।' : 'Thank you! Your feedback has been sent.'}</p>
              </div>
            ) : (
              <>
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder={isBn ? 'আপনার মতামত বা পরামর্শ লিখুন...' : 'Write your feedback or suggestions...'}
                  className="w-full border rounded-lg px-4 py-3 h-40 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSubmitFeedback}
                  disabled={!feedback.trim()}
                  className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {isBn ? 'পাঠান' : 'Submit'}
                </button>
              </>
            )}
          </div>
        );
        
      default:
        return (
          <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
            <p className="text-gray-500">{isBn ? 'শীঘ্রই আসছে...' : 'Coming soon...'}</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl font-bold">ন</span>
            </div>
            <div>
              <span className="font-bold text-xl">Nirnoy</span>
              <span className="text-xs text-blue-600 block">HEALTH SYNCHRONIZED</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden md:block">{patientUser.name}</span>
            <button
              onClick={handleLogout}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              {isBn ? 'লগআউট' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <aside className="md:w-64 flex-shrink-0">
            <nav className="bg-white rounded-xl shadow-sm border p-2 space-y-1">
              {[
                { id: 'home', icon: '🏠', label: isBn ? 'হোম' : 'Home' },
                { id: 'ai', icon: '🤖', label: isBn ? 'AI সহকারী' : 'AI Assistant' },
                { id: 'food', icon: '🍽️', label: isBn ? 'কী খাচ্ছি?' : 'Food Scanner' },
                { id: 'meds', icon: '💊', label: isBn ? 'ওষুধ' : 'Medications' },
                { id: 'doctors', icon: '👨‍⚕️', label: isBn ? 'আমার ডাক্তার' : 'My Doctors' },
                { id: 'quiz', icon: '🧠', label: isBn ? 'স্বাস্থ্য কুইজ' : 'Health Quiz' },
                { id: 'feedback', icon: '💬', label: isBn ? 'মতামত' : 'Feedback' },
                { id: 'profile', icon: '👤', label: isBn ? 'প্রোফাইল' : 'Profile' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as TabType)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    activeTab === item.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1">
            {renderTabContent()}
          </main>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
