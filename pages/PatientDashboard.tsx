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
  const isBn = language === 'bn';
  
  // Safe user data - use defaults if user is null
  const patientUser: PatientProfile = useMemo(() => {
    if (user && role === 'patient') {
      return user as PatientProfile;
    }
    // Return safe defaults
    return {
      id: '',
      phone: '',
      name: 'Loading...',
      subscriptionTier: 'free' as const,
      isVerified: false,
      createdAt: '',
      updatedAt: ''
    };
  }, [user, role]);
  
  // ============ ALL HOOKS MUST BE BEFORE ANY RETURNS ============
  const [initDelay, setInitDelay] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Profile editing
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    emergencyContact: '',
    bloodGroup: '',
    chronicConditions: '',
    allergies: '',
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

  // Init delay effect
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('[PatientDashboard] Init delay complete');
      setInitDelay(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);
  
  // Debug logging
  useEffect(() => {
    console.log('[PatientDashboard] State:', { userName: user?.name, role, isLoading, initDelay });
  }, [user, role, isLoading, initDelay]);
  
  // Redirect if not logged in (but wait for init)
  useEffect(() => {
    if (!initDelay && !isLoading && (!user || role !== 'patient')) {
      console.log('[PatientDashboard] Not authenticated, redirecting');
      navigate('/patient-auth', { replace: true });
    }
  }, [user, role, isLoading, initDelay, navigate]);
  
  // Update edit form when user changes
  useEffect(() => {
    if (patientUser.id) {
      setEditForm({
        name: patientUser.name || '',
        emergencyContact: patientUser.emergencyContact || '',
        bloodGroup: patientUser.bloodGroup || '',
        chronicConditions: patientUser.chronicConditions?.join(', ') || '',
        allergies: patientUser.allergies?.join(', ') || '',
      });
    }
  }, [patientUser]);

  // AI greeting
  useEffect(() => {
    if (messages.length === 0 && patientUser.id) {
      const greeting = isBn 
        ? `আসসালামু আলাইকুম ${patientUser.name}! আমি আপনার স্বাস্থ্য সহকারী। আজ আপনাকে কীভাবে সাহায্য করতে পারি?`
        : `Hello ${patientUser.name}! I'm your health assistant. How can I help you today?`;
      setMessages([{ role: 'assistant', content: greeting }]);
    }
  }, [patientUser.id, patientUser.name, isBn, messages.length]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ============ NOW EARLY RETURNS ARE SAFE ============
  
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

  // ============ HANDLERS ============
  
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

  const handleLogout = () => {
    logout();
    if (onLogout) onLogout();
    navigate('/');
  };

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

  const handleSubmitFeedback = () => {
    if (!feedback.trim()) return;
    
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

  // ============ TAB CONTENT ============
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
                {isBn ? 'আজ আপনাকে কীভাবে সাহায্য করতে পারি?' : 'How can we help you today?'}
              </p>
            </div>
            
            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button onClick={() => setActiveTab('ai')} className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all text-center">
                <span className="text-3xl">🤖</span>
                <p className="mt-2 text-sm font-medium">{isBn ? 'AI সহকারী' : 'AI Assistant'}</p>
              </button>
              <button onClick={() => setActiveTab('food')} className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all text-center">
                <span className="text-3xl">🍽️</span>
                <p className="mt-2 text-sm font-medium">{isBn ? 'কী খাচ্ছি?' : 'Food Scanner'}</p>
              </button>
              <button onClick={() => setActiveTab('meds')} className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all text-center">
                <span className="text-3xl">💊</span>
                <p className="mt-2 text-sm font-medium">{isBn ? 'ওষুধ' : 'Medications'}</p>
              </button>
              <button onClick={() => setActiveTab('quiz')} className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all text-center">
                <span className="text-3xl">🎯</span>
                <p className="mt-2 text-sm font-medium">{isBn ? 'কুইজ' : 'Health Quiz'}</p>
              </button>
            </div>

            {/* Health Summary */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold mb-4">{isBn ? 'স্বাস্থ্য সারসংক্ষেপ' : 'Health Summary'}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-500">{isBn ? 'রক্তের গ্রুপ' : 'Blood Group'}</p>
                  <p className="font-medium">{patientUser.bloodGroup || 'Not set'}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-gray-500">{isBn ? 'সাবস্ক্রিপশন' : 'Subscription'}</p>
                  <p className="font-medium capitalize">{patientUser.subscriptionTier}</p>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'ai':
        return (
          <div className="bg-white rounded-xl shadow-sm h-[calc(100vh-200px)] flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b">
              <h3 className="font-semibold">{isBn ? 'স্বাস্থ্য সহকারী' : 'Health Assistant'}</h3>
            </div>
            
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-xl ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-3 rounded-xl">
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
            
            {/* Chat Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={isBn ? 'আপনার প্রশ্ন লিখুন...' : 'Type your question...'}
                  className="flex-1 px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMessage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                >
                  {isBn ? 'পাঠান' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        );
        
      case 'food':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold mb-4">{isBn ? 'কী খাচ্ছি? - খাবার বিশ্লেষক' : 'Food Scanner'}</h3>
              <p className="text-gray-600 mb-4">
                {isBn 
                  ? 'আপনার খাবারের ছবি আপলোড করুন এবং জানুন এটি আপনার স্বাস্থ্যের জন্য উপযুক্ত কিনা।'
                  : 'Upload a photo of your food to analyze if it\'s suitable for your health.'}
              </p>
              
              <label className="block w-full p-8 border-2 border-dashed border-gray-300 rounded-xl text-center cursor-pointer hover:border-blue-500 transition-colors">
                <input type="file" accept="image/*" onChange={handleFoodUpload} className="hidden" />
                <span className="text-4xl">📷</span>
                <p className="mt-2 text-gray-600">{isBn ? 'ছবি আপলোড করুন' : 'Upload Image'}</p>
              </label>
              
              {foodImage && (
                <div className="mt-4">
                  <img src={foodImage} alt="Food" className="w-full max-h-64 object-cover rounded-xl" />
                </div>
              )}
              
              {analyzingFood && (
                <div className="mt-4 text-center">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="mt-2 text-gray-600">{isBn ? 'বিশ্লেষণ করা হচ্ছে...' : 'Analyzing...'}</p>
                </div>
              )}
              
              {foodAnalysis && (
                <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                  <h4 className="font-medium mb-2">{isBn ? 'বিশ্লেষণ ফলাফল:' : 'Analysis Result:'}</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{foodAnalysis}</p>
                </div>
              )}
            </div>
          </div>
        );
        
      case 'meds':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">{isBn ? 'ওষুধ ব্যবস্থাপনা' : 'Medication Management'}</h3>
                <button 
                  onClick={() => setShowAddMed(!showAddMed)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                >
                  {isBn ? '+ যোগ করুন' : '+ Add'}
                </button>
              </div>
              
              {medications.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  {isBn ? 'কোনো ওষুধ যোগ করা হয়নি' : 'No medications added yet'}
                </p>
              ) : (
                <div className="space-y-3">
                  {medications.map(med => (
                    <div key={med.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium">{med.name}</p>
                          <p className="text-sm text-gray-500">{med.dosage} - {med.frequency}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded ${med.reminderEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                          {med.reminderEnabled ? '🔔' : '🔕'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
        
      case 'quiz':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold mb-4">{isBn ? 'স্বাস্থ্য কুইজ' : 'Health Quizzes'}</h3>
              <p className="text-gray-600 mb-4">
                {isBn 
                  ? 'এই কুইজগুলো আপনার সামগ্রিক স্বাস্থ্য বুঝতে সাহায্য করবে।'
                  : 'These quizzes help understand your overall health.'}
              </p>
              
              <div className="grid gap-4">
                {QUIZZES.map(quiz => (
                  <div key={quiz.id} className="p-4 border rounded-xl hover:border-blue-500 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{quiz.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium">{isBn ? quiz.titleBn : quiz.title}</p>
                        <p className="text-sm text-gray-500">{quiz.duration} • {quiz.questions} questions</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        completedQuizzes.includes(quiz.id) ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {completedQuizzes.includes(quiz.id) ? '✓ Done' : quiz.frequency}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
        
      case 'feedback':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold mb-4">{isBn ? 'মতামত দিন' : 'Give Feedback'}</h3>
              
              {feedbackSent ? (
                <div className="text-center py-8">
                  <span className="text-4xl">✅</span>
                  <p className="mt-2 text-green-600">{isBn ? 'ধন্যবাদ! আপনার মতামত পাঠানো হয়েছে।' : 'Thank you! Your feedback has been submitted.'}</p>
                </div>
              ) : (
                <>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder={isBn ? 'আপনার মতামত বা পরামর্শ লিখুন...' : 'Write your feedback or suggestions...'}
                    className="w-full h-32 p-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSubmitFeedback}
                    className="mt-4 w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                  >
                    {isBn ? 'পাঠান' : 'Submit'}
                  </button>
                </>
              )}
            </div>
          </div>
        );
        
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold">{isBn ? 'আমার প্রোফাইল' : 'My Profile'}</h3>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg text-sm"
                >
                  {isEditing ? (isBn ? 'বাতিল' : 'Cancel') : (isBn ? 'সম্পাদনা' : 'Edit')}
                </button>
              </div>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">{isBn ? 'নাম' : 'Name'}</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">{isBn ? 'রক্তের গ্রুপ' : 'Blood Group'}</label>
                    <select
                      value={editForm.bloodGroup}
                      onChange={(e) => setEditForm({...editForm, bloodGroup: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg"
                    >
                      <option value="">Select</option>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">{isBn ? 'জরুরি যোগাযোগ' : 'Emergency Contact'}</label>
                    <input
                      type="text"
                      value={editForm.emergencyContact}
                      onChange={(e) => setEditForm({...editForm, emergencyContact: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">{isBn ? 'দীর্ঘস্থায়ী রোগ' : 'Chronic Conditions'}</label>
                    <input
                      type="text"
                      value={editForm.chronicConditions}
                      onChange={(e) => setEditForm({...editForm, chronicConditions: e.target.value})}
                      placeholder="Comma separated"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">{isBn ? 'এলার্জি' : 'Allergies'}</label>
                    <input
                      type="text"
                      value={editForm.allergies}
                      onChange={(e) => setEditForm({...editForm, allergies: e.target.value})}
                      placeholder="Comma separated"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <button
                    onClick={handleSaveProfile}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                  >
                    {isBn ? 'সংরক্ষণ করুন' : 'Save Changes'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 pb-4 border-b">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                      👤
                    </div>
                    <div>
                      <p className="font-medium text-lg">{patientUser.name}</p>
                      <p className="text-gray-500">+880{patientUser.phone}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">{isBn ? 'রক্তের গ্রুপ' : 'Blood Group'}</p>
                      <p className="font-medium">{patientUser.bloodGroup || 'Not set'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500">{isBn ? 'জরুরি যোগাযোগ' : 'Emergency'}</p>
                      <p className="font-medium">{patientUser.emergencyContact || 'Not set'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                      <p className="text-xs text-gray-500">{isBn ? 'দীর্ঘস্থায়ী রোগ' : 'Chronic Conditions'}</p>
                      <p className="font-medium">{patientUser.chronicConditions?.join(', ') || 'None'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                      <p className="text-xs text-gray-500">{isBn ? 'এলার্জি' : 'Allergies'}</p>
                      <p className="font-medium">{patientUser.allergies?.join(', ') || 'None'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  // ============ MAIN RENDER ============
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-blue-600">নির্ণয়</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden md:block">{patientUser.name}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
            >
              {isBn ? 'লগআউট' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {renderTabContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto px-2 py-2 flex justify-around">
          {[
            { id: 'home', icon: '🏠', label: isBn ? 'হোম' : 'Home' },
            { id: 'ai', icon: '🤖', label: isBn ? 'AI' : 'AI' },
            { id: 'meds', icon: '💊', label: isBn ? 'ওষুধ' : 'Meds' },
            { id: 'quiz', icon: '🎯', label: isBn ? 'কুইজ' : 'Quiz' },
            { id: 'profile', icon: '👤', label: isBn ? 'প্রোফাইল' : 'Profile' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                activeTab === tab.id 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs mt-1">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default PatientDashboard;
