import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { chatWithHealthAssistant } from '../services/geminiService';
import { patientService, Medication, Quiz, QuizResponse, FoodScan } from '../services/patientService';
import { ChatMessage } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth, PatientProfile } from '../contexts/AuthContext';

// ============ TYPES ============
type TabType = 'home' | 'ai' | 'food' | 'meds' | 'doctors' | 'quiz' | 'feedback' | 'profile' | 'subscription';

// ============ SUBSCRIPTION TIERS ============
const SUBSCRIPTION_TIERS = {
  free: { name: 'Free', nameBn: 'ফ্রি', price: 0, features: ['Basic AI Chat', 'View Profile', '2 Quizzes/month'] },
  basic: { name: 'Basic', nameBn: 'বেসিক', price: 99, features: ['Unlimited AI Chat', 'Food Scanner', '10 Quizzes/month', 'Health Records'] },
  premium: { name: 'Premium', nameBn: 'প্রিমিয়াম', price: 299, features: ['Everything in Basic', 'Medication Reminders', 'Unlimited Quizzes', 'Priority Support', 'Family Sharing (2)'] },
  family: { name: 'Family', nameBn: 'ফ্যামিলি', price: 499, features: ['Everything in Premium', 'Up to 5 Family Members', 'Dedicated Health Manager', 'Emergency Hotline'] }
};

// ============ MAIN COMPONENT ============
export const PatientDashboard: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, role, logout, isLoading, updateProfile } = useAuth();
  const isBn = language === 'bn';
  
  // Safe user data
  const patientUser: PatientProfile = useMemo(() => {
    if (user && role === 'patient') return user as PatientProfile;
    return {
      id: '', phone: '', name: 'Loading...',
      subscriptionTier: 'free' as const, isVerified: false, createdAt: '', updatedAt: ''
    };
  }, [user, role]);

  // Get patient ID for Supabase queries
  const patientId = patientUser.id;
  
  // ============ ALL HOOKS ============
  const [initDelay, setInitDelay] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  
  // AI Chat
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Profile
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', email: '', dateOfBirth: '', gender: '', bloodGroup: '',
    heightCm: '', weightKg: '', chronicConditions: '', allergies: '',
    emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: ''
  });
  const [profileSaving, setProfileSaving] = useState(false);
  
  // Medications
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medsLoading, setMedsLoading] = useState(false);
  const [showAddMed, setShowAddMed] = useState(false);
  const [newMed, setNewMed] = useState({ name: '', dosage: '', frequency: '', prescribedBy: '', notes: '' });
  
  // Quizzes
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizResponses, setQuizResponses] = useState<QuizResponse[]>([]);
  const [quizzesLoading, setQuizzesLoading] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});
  
  // Food Scanner
  const [foodImage, setFoodImage] = useState<string | null>(null);
  const [foodAnalysis, setFoodAnalysis] = useState<string | null>(null);
  const [analyzingFood, setAnalyzingFood] = useState(false);
  const [foodHistory, setFoodHistory] = useState<FoodScan[]>([]);
  
  // Feedback
  const [feedback, setFeedback] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState('general');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackSending, setFeedbackSending] = useState(false);

  // ============ EFFECTS ============
  
  // Init delay
  useEffect(() => {
    const timer = setTimeout(() => setInitDelay(false), 300);
    return () => clearTimeout(timer);
  }, []);
  
  // Redirect if not logged in
  useEffect(() => {
    if (!initDelay && !isLoading && (!user || role !== 'patient')) {
      navigate('/patient-auth', { replace: true });
    }
  }, [user, role, isLoading, initDelay, navigate]);
  
  // Update edit form when user changes
  useEffect(() => {
    if (patientUser.id) {
      setEditForm({
        name: patientUser.name || '',
        email: patientUser.email || '',
        dateOfBirth: patientUser.dateOfBirth || '',
        gender: patientUser.gender || '',
        bloodGroup: patientUser.bloodGroup || '',
        heightCm: patientUser.heightCm?.toString() || '',
        weightKg: patientUser.weightKg?.toString() || '',
        chronicConditions: patientUser.chronicConditions?.join(', ') || '',
        allergies: patientUser.allergies?.join(', ') || '',
        emergencyContactName: patientUser.emergencyContactName || '',
        emergencyContactPhone: patientUser.emergencyContactPhone || '',
        emergencyContactRelation: patientUser.emergencyContactRelation || ''
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

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load medications
  const loadMedications = useCallback(async () => {
    if (!patientId) return;
    setMedsLoading(true);
    try {
      const meds = await patientService.getMedications(patientId);
      setMedications(meds);
    } catch (e) {
      console.error('Failed to load medications:', e);
    }
    setMedsLoading(false);
  }, [patientId]);

  // Load quizzes
  const loadQuizzes = useCallback(async () => {
    setQuizzesLoading(true);
    try {
      const isPremium = patientUser.subscriptionTier !== 'free';
      const [quizList, responses] = await Promise.all([
        patientService.getQuizzes(isPremium ? undefined : false),
        patientId ? patientService.getQuizResponses(patientId) : Promise.resolve([])
      ]);
      setQuizzes(quizList);
      setQuizResponses(responses);
    } catch (e) {
      console.error('Failed to load quizzes:', e);
    }
    setQuizzesLoading(false);
  }, [patientId, patientUser.subscriptionTier]);

  // Load food history
  const loadFoodHistory = useCallback(async () => {
    if (!patientId) return;
    try {
      const history = await patientService.getFoodScans(patientId, 10);
      setFoodHistory(history);
    } catch (e) {
      console.error('Failed to load food history:', e);
    }
  }, [patientId]);

  // Load data on tab change
  useEffect(() => {
    if (activeTab === 'meds') loadMedications();
    if (activeTab === 'quiz') loadQuizzes();
    if (activeTab === 'food') loadFoodHistory();
  }, [activeTab, loadMedications, loadQuizzes, loadFoodHistory]);

  // ============ EARLY RETURNS ============
  if (isLoading || initDelay) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">{isBn ? 'লোড হচ্ছে...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }
  
  if (!user || role !== 'patient') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{isBn ? 'লগইনে যাচ্ছে...' : 'Redirecting to login...'}</p>
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
      
      // Save conversation to Supabase
      if (patientId) {
        await patientService.saveAIConversation(patientId, [...messages, { role: 'user', content: userMessage }, { role: 'assistant', content: response }]);
      }
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
    setProfileSaving(true);
    try {
      const updates = {
        name: editForm.name,
        email: editForm.email,
        dateOfBirth: editForm.dateOfBirth,
        gender: editForm.gender,
        bloodGroup: editForm.bloodGroup,
        heightCm: editForm.heightCm ? parseInt(editForm.heightCm) : undefined,
        weightKg: editForm.weightKg ? parseFloat(editForm.weightKg) : undefined,
        chronicConditions: editForm.chronicConditions.split(',').map(s => s.trim()).filter(Boolean),
        allergies: editForm.allergies.split(',').map(s => s.trim()).filter(Boolean),
        emergencyContactName: editForm.emergencyContactName,
        emergencyContactPhone: editForm.emergencyContactPhone,
        emergencyContactRelation: editForm.emergencyContactRelation
      };
      
      await updateProfile(updates);
      if (patientUser.id) {
        await patientService.updatePatientProfile(patientUser.id, updates);
      }
      setIsEditing(false);
    } catch (e) {
      console.error('Failed to save profile:', e);
    }
    setProfileSaving(false);
  };

  const handleAddMedication = async () => {
    if (!newMed.name || !newMed.dosage || !newMed.frequency || !patientId) return;
    
    const med = await patientService.addMedication(patientId, {
      name: newMed.name,
      dosage: newMed.dosage,
      frequency: newMed.frequency,
      prescribedBy: newMed.prescribedBy,
      notes: newMed.notes,
      timesPerDay: 1,
      timeSlots: [],
      startDate: new Date().toISOString().split('T')[0],
      isActive: true,
      reminderEnabled: true
    });
    
    if (med) {
      setMedications(prev => [med, ...prev]);
      setNewMed({ name: '', dosage: '', frequency: '', prescribedBy: '', notes: '' });
      setShowAddMed(false);
    }
  };

  const handleDeleteMedication = async (medId: string) => {
    if (await patientService.deleteMedication(medId)) {
      setMedications(prev => prev.filter(m => m.id !== medId));
    }
  };

  const handleToggleMedReminder = async (med: Medication) => {
    if (await patientService.updateMedication(med.id, { reminderEnabled: !med.reminderEnabled })) {
      setMedications(prev => prev.map(m => m.id === med.id ? { ...m, reminderEnabled: !m.reminderEnabled } : m));
    }
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
        const prompt = `Analyze this food image for a patient with: ${patientUser.chronicConditions?.join(', ') || 'no known conditions'}. Allergies: ${patientUser.allergies?.join(', ') || 'none'}. Tell me if this food is safe and healthy for them. List any warnings.`;
        const analysis = await chatWithHealthAssistant(prompt, patientUser);
        setFoodAnalysis(analysis);
        
        // Save to Supabase
        if (patientId) {
          await patientService.saveFoodScan(patientId, {
            imageUrl: base64.substring(0, 100) + '...', // Don't store full base64
            analysisResult: analysis,
            healthWarnings: [],
            isSafe: !analysis.toLowerCase().includes('avoid') && !analysis.toLowerCase().includes('warning')
          });
          loadFoodHistory();
        }
      } catch (error) {
        setFoodAnalysis(isBn ? 'বিশ্লেষণ করতে সমস্যা হয়েছে' : 'Failed to analyze');
      }
      setAnalyzingFood(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.trim() || !patientUser.id) return;
    setFeedbackSending(true);
    
    const success = await patientService.submitFeedback(patientUser.id, patientUser.name, {
      category: feedbackCategory,
      message: feedback
    });
    
    if (success) {
      setFeedback('');
      setFeedbackSent(true);
      setTimeout(() => setFeedbackSent(false), 3000);
    }
    setFeedbackSending(false);
  };

  const handleStartQuiz = async (quiz: Quiz) => {
    const fullQuiz = await patientService.getQuizWithQuestions(quiz.id);
    if (fullQuiz) {
      setActiveQuiz(fullQuiz);
      setQuizAnswers({});
    }
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuiz || !patientId) return;
    
    const score = Object.keys(quizAnswers).length;
    const maxScore = activeQuiz.questions?.length || 0;
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    
    await patientService.submitQuizResponse(patientId, {
      quizId: activeQuiz.id,
      answers: Object.entries(quizAnswers).map(([qId, answer]) => ({ questionId: qId, answer })),
      score,
      maxScore,
      percentage,
      insights: `Completed ${activeQuiz.title} with ${percentage.toFixed(0)}% score`
    });
    
    setActiveQuiz(null);
    setQuizAnswers({});
    loadQuizzes();
  };

  // Calculate BMI
  const bmi = useMemo(() => {
    const h = patientUser.heightCm;
    const w = patientUser.weightKg;
    if (h && w && h > 0) {
      return (w / ((h / 100) ** 2)).toFixed(1);
    }
    return null;
  }, [patientUser.heightCm, patientUser.weightKg]);

  const tierInfo = SUBSCRIPTION_TIERS[patientUser.subscriptionTier || 'free'];

  // ============ TAB CONTENT ============
  const renderTabContent = () => {
    switch (activeTab) {
      // HOME TAB
      case 'home':
        return (
          <div className="space-y-6">
            {/* Welcome Card */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">
                    {isBn ? `স্বাগতম, ${patientUser.name}!` : `Welcome, ${patientUser.name}!`}
                  </h2>
                  <p className="opacity-90 text-sm">
                    {isBn ? 'আজ আপনাকে কীভাবে সাহায্য করতে পারি?' : 'How can we help you today?'}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    tierInfo.name === 'Free' ? 'bg-white/20' : 'bg-yellow-400 text-yellow-900'
                  }`}>
                    {isBn ? tierInfo.nameBn : tierInfo.name}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { id: 'ai', icon: '🤖', label: isBn ? 'AI সহকারী' : 'AI Assistant', color: 'bg-purple-50 hover:bg-purple-100' },
                { id: 'food', icon: '🍽️', label: isBn ? 'কী খাচ্ছি?' : 'Food Scanner', color: 'bg-green-50 hover:bg-green-100' },
                { id: 'meds', icon: '💊', label: isBn ? 'ওষুধ' : 'Medications', color: 'bg-red-50 hover:bg-red-100' },
                { id: 'quiz', icon: '🎯', label: isBn ? 'কুইজ' : 'Health Quiz', color: 'bg-yellow-50 hover:bg-yellow-100' },
              ].map(item => (
                <button 
                  key={item.id}
                  onClick={() => setActiveTab(item.id as TabType)} 
                  className={`${item.color} p-4 rounded-xl shadow-sm transition-all text-center border border-gray-100`}
                >
                  <span className="text-3xl">{item.icon}</span>
                  <p className="mt-2 text-sm font-medium text-gray-700">{item.label}</p>
                </button>
              ))}
            </div>

            {/* Health Summary */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold mb-4 text-gray-800">{isBn ? 'স্বাস্থ্য সারসংক্ষেপ' : 'Health Summary'}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl text-center">
                  <p className="text-xs text-gray-500 mb-1">{isBn ? 'রক্তের গ্রুপ' : 'Blood Group'}</p>
                  <p className="font-bold text-xl text-blue-600">{patientUser.bloodGroup || '—'}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-xl text-center">
                  <p className="text-xs text-gray-500 mb-1">BMI</p>
                  <p className="font-bold text-xl text-green-600">{bmi || '—'}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl text-center">
                  <p className="text-xs text-gray-500 mb-1">{isBn ? 'কুইজ পয়েন্ট' : 'Quiz Points'}</p>
                  <p className="font-bold text-xl text-purple-600">{patientUser.quizPoints || 0}</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-xl text-center">
                  <p className="text-xs text-gray-500 mb-1">{isBn ? 'স্ট্রিক' : 'Streak'}</p>
                  <p className="font-bold text-xl text-orange-600">{patientUser.streakDays || 0} 🔥</p>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 gap-4">
              <Link to="/search" className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-blue-300 transition-colors">
                <span className="text-2xl">👨‍⚕️</span>
                <p className="mt-2 font-medium text-gray-700">{isBn ? 'ডাক্তার খুঁজুন' : 'Find Doctors'}</p>
              </Link>
              <button onClick={() => setActiveTab('feedback')} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-blue-300 transition-colors text-left">
                <span className="text-2xl">💬</span>
                <p className="mt-2 font-medium text-gray-700">{isBn ? 'মতামত দিন' : 'Give Feedback'}</p>
              </button>
            </div>
          </div>
        );

      // AI CHAT TAB
      case 'ai':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-[calc(100vh-220px)] flex flex-col">
            <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <h3 className="font-semibold text-gray-800">{isBn ? '🤖 স্বাস্থ্য সহকারী' : '🤖 Health Assistant'}</h3>
              <p className="text-xs text-gray-500">{isBn ? 'আপনার ব্যক্তিগত AI স্বাস্থ্য পরামর্শদাতা' : 'Your personal AI health advisor'}</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-md' 
                      : 'bg-gray-100 text-gray-800 rounded-bl-md'
                  }`}>
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-4 rounded-2xl rounded-bl-md">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            
            <div className="p-4 border-t bg-gray-50">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={isBn ? 'আপনার প্রশ্ন লিখুন...' : 'Type your question...'}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || isTyping}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isBn ? 'পাঠান' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        );

      // FOOD SCANNER TAB
      case 'food':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold mb-2 text-gray-800">{isBn ? '🍽️ কী খাচ্ছি? - খাবার বিশ্লেষক' : '🍽️ Food Scanner'}</h3>
              <p className="text-gray-500 text-sm mb-4">
                {isBn 
                  ? 'আপনার খাবারের ছবি আপলোড করুন এবং জানুন এটি আপনার স্বাস্থ্যের জন্য উপযুক্ত কিনা।'
                  : 'Upload a photo of your food to analyze if it\'s suitable for your health.'}
              </p>
              
              <label className="block w-full p-8 border-2 border-dashed border-gray-300 rounded-xl text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                <input type="file" accept="image/*" onChange={handleFoodUpload} className="hidden" />
                <span className="text-5xl">📷</span>
                <p className="mt-3 text-gray-600 font-medium">{isBn ? 'ছবি আপলোড করুন' : 'Upload Image'}</p>
                <p className="text-xs text-gray-400 mt-1">{isBn ? 'JPG, PNG সমর্থিত' : 'JPG, PNG supported'}</p>
              </label>
              
              {foodImage && (
                <div className="mt-4">
                  <img src={foodImage} alt="Food" className="w-full max-h-64 object-cover rounded-xl" />
                </div>
              )}
              
              {analyzingFood && (
                <div className="mt-4 text-center p-6 bg-blue-50 rounded-xl">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="mt-3 text-blue-600 font-medium">{isBn ? 'বিশ্লেষণ করা হচ্ছে...' : 'Analyzing...'}</p>
                </div>
              )}
              
              {foodAnalysis && (
                <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-2">{isBn ? '📊 বিশ্লেষণ ফলাফল:' : '📊 Analysis Result:'}</h4>
                  <p className="text-gray-700 whitespace-pre-wrap text-sm">{foodAnalysis}</p>
                </div>
              )}
            </div>

            {/* Food History */}
            {foodHistory.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold mb-4 text-gray-800">{isBn ? '📜 আগের স্ক্যান' : '📜 Scan History'}</h3>
                <div className="space-y-3">
                  {foodHistory.slice(0, 5).map(scan => (
                    <div key={scan.id} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{scan.analysisResult?.substring(0, 50)}...</p>
                        <p className="text-xs text-gray-400">{new Date(scan.scannedAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${scan.isSafe ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {scan.isSafe ? '✓ Safe' : '⚠️ Warning'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      // MEDICATIONS TAB
      case 'meds':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800">{isBn ? '💊 ওষুধ ব্যবস্থাপনা' : '💊 Medication Management'}</h3>
                  <p className="text-xs text-gray-500">{isBn ? 'আপনার ওষুধের তালিকা ও রিমাইন্ডার' : 'Your medications and reminders'}</p>
                </div>
                <button 
                  onClick={() => setShowAddMed(!showAddMed)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  {showAddMed ? (isBn ? '✕ বাতিল' : '✕ Cancel') : (isBn ? '+ যোগ করুন' : '+ Add')}
                </button>
              </div>
              
              {/* Add Medication Form */}
              {showAddMed && (
                <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <h4 className="font-medium mb-3 text-blue-800">{isBn ? 'নতুন ওষুধ যোগ করুন' : 'Add New Medication'}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder={isBn ? 'ওষুধের নাম *' : 'Medication Name *'}
                      value={newMed.name}
                      onChange={(e) => setNewMed({...newMed, name: e.target.value})}
                      className="px-3 py-2 border rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder={isBn ? 'ডোজ (যেমন: 500mg) *' : 'Dosage (e.g., 500mg) *'}
                      value={newMed.dosage}
                      onChange={(e) => setNewMed({...newMed, dosage: e.target.value})}
                      className="px-3 py-2 border rounded-lg text-sm"
                    />
                    <select
                      value={newMed.frequency}
                      onChange={(e) => setNewMed({...newMed, frequency: e.target.value})}
                      className="px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="">{isBn ? 'কত বার *' : 'Frequency *'}</option>
                      <option value="once_daily">{isBn ? 'দিনে ১ বার' : 'Once daily'}</option>
                      <option value="twice_daily">{isBn ? 'দিনে ২ বার' : 'Twice daily'}</option>
                      <option value="thrice_daily">{isBn ? 'দিনে ৩ বার' : 'Three times daily'}</option>
                      <option value="as_needed">{isBn ? 'প্রয়োজনে' : 'As needed'}</option>
                    </select>
                    <input
                      type="text"
                      placeholder={isBn ? 'ডাক্তারের নাম' : 'Prescribed by'}
                      value={newMed.prescribedBy}
                      onChange={(e) => setNewMed({...newMed, prescribedBy: e.target.value})}
                      className="px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <textarea
                    placeholder={isBn ? 'নোট (ঐচ্ছিক)' : 'Notes (optional)'}
                    value={newMed.notes}
                    onChange={(e) => setNewMed({...newMed, notes: e.target.value})}
                    className="w-full mt-3 px-3 py-2 border rounded-lg text-sm"
                    rows={2}
                  />
                  <button
                    onClick={handleAddMedication}
                    disabled={!newMed.name || !newMed.dosage || !newMed.frequency}
                    className="mt-3 w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isBn ? 'সংরক্ষণ করুন' : 'Save Medication'}
                  </button>
                </div>
              )}
              
              {/* Medications List */}
              {medsLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              ) : medications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-4xl">💊</span>
                  <p className="mt-2">{isBn ? 'কোনো ওষুধ যোগ করা হয়নি' : 'No medications added yet'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {medications.map(med => (
                    <div key={med.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{med.name}</p>
                          <p className="text-sm text-gray-600">{med.dosage} • {med.frequency.replace('_', ' ')}</p>
                          {med.prescribedBy && <p className="text-xs text-gray-400 mt-1">By: {med.prescribedBy}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleMedReminder(med)}
                            className={`p-2 rounded-lg ${med.reminderEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}
                            title={med.reminderEnabled ? 'Reminder ON' : 'Reminder OFF'}
                          >
                            {med.reminderEnabled ? '🔔' : '🔕'}
                          </button>
                          <button
                            onClick={() => handleDeleteMedication(med.id)}
                            className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      // QUIZ TAB
      case 'quiz':
        // If taking a quiz
        if (activeQuiz) {
          return (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-semibold text-gray-800">{activeQuiz.icon} {isBn ? activeQuiz.titleBn : activeQuiz.title}</h3>
                  <p className="text-xs text-gray-500">{activeQuiz.questions?.length || 0} {isBn ? 'টি প্রশ্ন' : 'questions'}</p>
                </div>
                <button onClick={() => setActiveQuiz(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              
              <div className="space-y-6">
                {activeQuiz.questions?.map((q, idx) => (
                  <div key={q.id} className="p-4 bg-gray-50 rounded-xl">
                    <p className="font-medium mb-3">{idx + 1}. {isBn && q.questionTextBn ? q.questionTextBn : q.questionText}</p>
                    <div className="space-y-2">
                      {q.options.map((opt: any, optIdx: number) => (
                        <label key={optIdx} className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-blue-50 border border-gray-200">
                          <input
                            type={q.questionType === 'multiple' ? 'checkbox' : 'radio'}
                            name={`q_${q.id}`}
                            checked={quizAnswers[q.id] === opt.value}
                            onChange={() => setQuizAnswers({...quizAnswers, [q.id]: opt.value})}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">{isBn && opt.labelBn ? opt.labelBn : opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={handleSubmitQuiz}
                className="mt-6 w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
              >
                {isBn ? 'জমা দিন' : 'Submit Quiz'}
              </button>
            </div>
          );
        }

        // Quiz list
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold mb-2 text-gray-800">{isBn ? '🎯 স্বাস্থ্য কুইজ' : '🎯 Health Quizzes'}</h3>
              <p className="text-gray-500 text-sm mb-4">
                {isBn ? 'এই কুইজগুলো আপনার সামগ্রিক স্বাস্থ্য বুঝতে সাহায্য করবে।' : 'These quizzes help understand your overall health.'}
              </p>
              
              {quizzesLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {quizzes.map(quiz => {
                    const completed = quizResponses.some(r => r.quizId === quiz.id);
                    const locked = quiz.isPremium && patientUser.subscriptionTier === 'free';
                    
                    return (
                      <div 
                        key={quiz.id} 
                        className={`p-4 border rounded-xl transition-all ${
                          locked ? 'bg-gray-50 opacity-60' : 'hover:border-blue-400 hover:shadow-md cursor-pointer'
                        }`}
                        onClick={() => !locked && handleStartQuiz(quiz)}
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-3xl">{quiz.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-800">{isBn && quiz.titleBn ? quiz.titleBn : quiz.title}</p>
                              {quiz.isPremium && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">Premium</span>}
                            </div>
                            <p className="text-sm text-gray-500">{quiz.durationMinutes} min • {quiz.pointsReward} pts</p>
                          </div>
                          <div>
                            {locked ? (
                              <span className="text-2xl">🔒</span>
                            ) : completed ? (
                              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">✓ Done</span>
                            ) : (
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">{quiz.frequency}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );

      // FEEDBACK TAB
      case 'feedback':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold mb-2 text-gray-800">{isBn ? '💬 মতামত দিন' : '💬 Give Feedback'}</h3>
              <p className="text-gray-500 text-sm mb-4">
                {isBn ? 'আপনার মতামত আমাদের উন্নতিতে সাহায্য করবে।' : 'Your feedback helps us improve.'}
              </p>
              
              {feedbackSent ? (
                <div className="text-center py-8 bg-green-50 rounded-xl">
                  <span className="text-5xl">✅</span>
                  <p className="mt-3 text-green-700 font-medium">{isBn ? 'ধন্যবাদ! আপনার মতামত পাঠানো হয়েছে।' : 'Thank you! Your feedback has been submitted.'}</p>
                </div>
              ) : (
                <>
                  <select
                    value={feedbackCategory}
                    onChange={(e) => setFeedbackCategory(e.target.value)}
                    className="w-full px-4 py-3 border rounded-xl mb-4 text-sm"
                  >
                    <option value="general">{isBn ? 'সাধারণ মতামত' : 'General Feedback'}</option>
                    <option value="bug">{isBn ? 'বাগ রিপোর্ট' : 'Bug Report'}</option>
                    <option value="feature">{isBn ? 'নতুন ফিচার অনুরোধ' : 'Feature Request'}</option>
                    <option value="complaint">{isBn ? 'অভিযোগ' : 'Complaint'}</option>
                    <option value="praise">{isBn ? 'প্রশংসা' : 'Praise'}</option>
                  </select>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder={isBn ? 'আপনার মতামত বা পরামর্শ লিখুন...' : 'Write your feedback or suggestions...'}
                    className="w-full h-32 p-4 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    onClick={handleSubmitFeedback}
                    disabled={!feedback.trim() || feedbackSending}
                    className="mt-4 w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium"
                  >
                    {feedbackSending ? (isBn ? 'পাঠানো হচ্ছে...' : 'Sending...') : (isBn ? 'পাঠান' : 'Submit')}
                  </button>
                </>
              )}
            </div>
          </div>
        );

      // SUBSCRIPTION TAB
      case 'subscription':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
              <h3 className="font-semibold mb-2">{isBn ? 'আপনার সাবস্ক্রিপশন' : 'Your Subscription'}</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{isBn ? tierInfo.nameBn : tierInfo.name}</p>
                  <p className="text-sm opacity-80">৳{tierInfo.price}/month</p>
                </div>
                {tierInfo.name !== 'Family' && (
                  <button className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium text-sm">
                    {isBn ? 'আপগ্রেড করুন' : 'Upgrade'}
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-4">
              {Object.entries(SUBSCRIPTION_TIERS).map(([key, tier]) => (
                <div 
                  key={key} 
                  className={`bg-white rounded-xl p-6 border-2 ${
                    patientUser.subscriptionTier === key ? 'border-blue-500' : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-lg">{isBn ? tier.nameBn : tier.name}</h4>
                      <p className="text-2xl font-bold text-blue-600">৳{tier.price}<span className="text-sm text-gray-400">/mo</span></p>
                    </div>
                    {patientUser.subscriptionTier === key && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">Current</span>
                    )}
                  </div>
                  <ul className="space-y-2">
                    {tier.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="text-green-500">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        );

      // PROFILE TAB
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-gray-800">{isBn ? '👤 আমার প্রোফাইল' : '👤 My Profile'}</h3>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50"
                >
                  {isEditing ? (isBn ? 'বাতিল' : 'Cancel') : (isBn ? 'সম্পাদনা' : 'Edit')}
                </button>
              </div>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">{isBn ? 'নাম' : 'Name'}</label>
                      <input type="text" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">{isBn ? 'ইমেইল' : 'Email'}</label>
                      <input type="email" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">{isBn ? 'জন্ম তারিখ' : 'Date of Birth'}</label>
                      <input type="date" value={editForm.dateOfBirth} onChange={(e) => setEditForm({...editForm, dateOfBirth: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">{isBn ? 'লিঙ্গ' : 'Gender'}</label>
                      <select value={editForm.gender} onChange={(e) => setEditForm({...editForm, gender: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                        <option value="">Select</option>
                        <option value="male">{isBn ? 'পুরুষ' : 'Male'}</option>
                        <option value="female">{isBn ? 'মহিলা' : 'Female'}</option>
                        <option value="other">{isBn ? 'অন্যান্য' : 'Other'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">{isBn ? 'রক্তের গ্রুপ' : 'Blood Group'}</label>
                      <select value={editForm.bloodGroup} onChange={(e) => setEditForm({...editForm, bloodGroup: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
                        <option value="">Select</option>
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">{isBn ? 'উচ্চতা (সেমি)' : 'Height (cm)'}</label>
                      <input type="number" value={editForm.heightCm} onChange={(e) => setEditForm({...editForm, heightCm: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">{isBn ? 'ওজন (কেজি)' : 'Weight (kg)'}</label>
                      <input type="number" step="0.1" value={editForm.weightKg} onChange={(e) => setEditForm({...editForm, weightKg: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">{isBn ? 'দীর্ঘস্থায়ী রোগ' : 'Chronic Conditions'}</label>
                    <input type="text" value={editForm.chronicConditions} onChange={(e) => setEditForm({...editForm, chronicConditions: e.target.value})} placeholder="Comma separated" className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">{isBn ? 'এলার্জি' : 'Allergies'}</label>
                    <input type="text" value={editForm.allergies} onChange={(e) => setEditForm({...editForm, allergies: e.target.value})} placeholder="Comma separated" className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-3 text-gray-700">{isBn ? 'জরুরি যোগাযোগ' : 'Emergency Contact'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input type="text" value={editForm.emergencyContactName} onChange={(e) => setEditForm({...editForm, emergencyContactName: e.target.value})} placeholder={isBn ? 'নাম' : 'Name'} className="px-4 py-2 border rounded-lg" />
                      <input type="text" value={editForm.emergencyContactPhone} onChange={(e) => setEditForm({...editForm, emergencyContactPhone: e.target.value})} placeholder={isBn ? 'ফোন' : 'Phone'} className="px-4 py-2 border rounded-lg" />
                      <select value={editForm.emergencyContactRelation} onChange={(e) => setEditForm({...editForm, emergencyContactRelation: e.target.value})} className="px-4 py-2 border rounded-lg">
                        <option value="">{isBn ? 'সম্পর্ক' : 'Relation'}</option>
                        <option value="spouse">{isBn ? 'স্বামী/স্ত্রী' : 'Spouse'}</option>
                        <option value="parent">{isBn ? 'বাবা/মা' : 'Parent'}</option>
                        <option value="sibling">{isBn ? 'ভাই/বোন' : 'Sibling'}</option>
                        <option value="child">{isBn ? 'সন্তান' : 'Child'}</option>
                        <option value="friend">{isBn ? 'বন্ধু' : 'Friend'}</option>
                        <option value="other">{isBn ? 'অন্যান্য' : 'Other'}</option>
                      </select>
                    </div>
                  </div>
                  
                  <button onClick={handleSaveProfile} disabled={profileSaving} className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium">
                    {profileSaving ? (isBn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (isBn ? 'সংরক্ষণ করুন' : 'Save Changes')}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Profile Header */}
                  <div className="flex items-center gap-4 pb-4 border-b">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-3xl text-white font-bold">
                      {patientUser.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-bold text-xl text-gray-800">{patientUser.name}</p>
                      <p className="text-gray-500">+880{patientUser.phone}</p>
                      <span className={`inline-block mt-1 px-3 py-1 text-xs rounded-full ${
                        tierInfo.name === 'Free' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {isBn ? tierInfo.nameBn : tierInfo.name}
                      </span>
                    </div>
                  </div>
                  
                  {/* Profile Details */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { label: isBn ? 'রক্তের গ্রুপ' : 'Blood Group', value: patientUser.bloodGroup, icon: '🩸' },
                      { label: isBn ? 'লিঙ্গ' : 'Gender', value: patientUser.gender, icon: '👤' },
                      { label: isBn ? 'জন্ম তারিখ' : 'DOB', value: patientUser.dateOfBirth, icon: '🎂' },
                      { label: isBn ? 'উচ্চতা' : 'Height', value: patientUser.heightCm ? `${patientUser.heightCm} cm` : null, icon: '📏' },
                      { label: isBn ? 'ওজন' : 'Weight', value: patientUser.weightKg ? `${patientUser.weightKg} kg` : null, icon: '⚖️' },
                      { label: 'BMI', value: bmi, icon: '📊' },
                    ].map((item, i) => (
                      <div key={i} className="p-4 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">{item.icon} {item.label}</p>
                        <p className="font-semibold text-gray-800">{item.value || '—'}</p>
                      </div>
                    ))}
                  </div>
                  
                  {/* Medical Info */}
                  <div className="space-y-3">
                    <div className="p-4 bg-red-50 rounded-xl">
                      <p className="text-xs text-red-600 mb-1">⚠️ {isBn ? 'দীর্ঘস্থায়ী রোগ' : 'Chronic Conditions'}</p>
                      <p className="font-medium text-gray-800">{patientUser.chronicConditions?.join(', ') || 'None'}</p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-xl">
                      <p className="text-xs text-yellow-600 mb-1">🤧 {isBn ? 'এলার্জি' : 'Allergies'}</p>
                      <p className="font-medium text-gray-800">{patientUser.allergies?.join(', ') || 'None'}</p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <p className="text-xs text-blue-600 mb-1">🆘 {isBn ? 'জরুরি যোগাযোগ' : 'Emergency Contact'}</p>
                      <p className="font-medium text-gray-800">
                        {patientUser.emergencyContactName 
                          ? `${patientUser.emergencyContactName} (${patientUser.emergencyContactRelation}) - ${patientUser.emergencyContactPhone}`
                          : 'Not set'}
                      </p>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-sm sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600">নির্ণয়</span>
          </Link>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveTab('subscription')}
              className={`hidden md:flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                tierInfo.name === 'Free' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {isBn ? tierInfo.nameBn : tierInfo.name}
            </button>
            <span className="text-sm text-gray-600 hidden md:block">{patientUser.name}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium"
            >
              {isBn ? 'লগআউট' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        {renderTabContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 shadow-lg z-50">
        <div className="max-w-4xl mx-auto px-2 py-2 flex justify-around">
          {[
            { id: 'home', icon: '🏠', label: isBn ? 'হোম' : 'Home' },
            { id: 'ai', icon: '🤖', label: 'AI' },
            { id: 'meds', icon: '💊', label: isBn ? 'ওষুধ' : 'Meds' },
            { id: 'quiz', icon: '🎯', label: isBn ? 'কুইজ' : 'Quiz' },
            { id: 'profile', icon: '👤', label: isBn ? 'প্রোফাইল' : 'Profile' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex flex-col items-center py-2 px-4 rounded-xl transition-all ${
                activeTab === tab.id 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs mt-1 font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default PatientDashboard;
