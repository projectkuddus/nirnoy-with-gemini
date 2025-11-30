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
  // Personality & Mental Health
  { id: 'personality', title: 'Personality Type', titleBn: 'ব্যক্তিত্বের ধরন', category: 'personality', icon: '🎭', duration: '10 min', frequency: 'yearly', questions: 20 },
  { id: 'emotional-iq', title: 'Emotional Intelligence', titleBn: 'আবেগীয় বুদ্ধিমত্তা', category: 'personality', icon: '🧠', duration: '8 min', frequency: 'monthly', questions: 15 },
  { id: 'temperament', title: 'Temperament Type', titleBn: 'মেজাজের ধরন', category: 'personality', icon: '🌡️', duration: '5 min', frequency: 'monthly', questions: 12 },
  { id: 'extraversion', title: 'Extraversion/Introversion', titleBn: 'বহির্মুখী/অন্তর্মুখী', category: 'personality', icon: '👥', duration: '5 min', frequency: 'yearly', questions: 10 },
  { id: 'love-language', title: 'Love Language', titleBn: 'ভালোবাসার ভাষা', category: 'relationships', icon: '💕', duration: '6 min', frequency: 'yearly', questions: 15 },
  
  // Mental Health Screening
  { id: 'mood', title: 'Mood Check', titleBn: 'মেজাজ পরীক্ষা', category: 'mental', icon: '😊', duration: '3 min', frequency: 'daily', questions: 5 },
  { id: 'loneliness', title: 'Loneliness Scale', titleBn: 'একাকীত্ব মাপকাঠি', category: 'mental', icon: '🌙', duration: '5 min', frequency: 'weekly', questions: 10 },
  { id: 'anxiety', title: 'Anxiety Check', titleBn: 'উদ্বেগ পরীক্ষা', category: 'mental', icon: '😰', duration: '4 min', frequency: 'weekly', questions: 8 },
  { id: 'imposter', title: 'Imposter Syndrome', titleBn: 'ইম্পোস্টার সিনড্রোম', category: 'mental', icon: '🎪', duration: '6 min', frequency: 'monthly', questions: 12 },
  { id: 'procrastination', title: 'Procrastination Style', titleBn: 'গড়িমসি ধরন', category: 'mental', icon: '⏰', duration: '5 min', frequency: 'monthly', questions: 10 },
  
  // ADHD & Autism Screening
  { id: 'adhd', title: 'ADHD Self-Report', titleBn: 'ADHD স্ব-মূল্যায়ন', category: 'screening', icon: '🎯', duration: '8 min', frequency: 'yearly', questions: 18 },
  { id: 'autism', title: 'Autistic Traits', titleBn: 'অটিস্টিক বৈশিষ্ট্য', category: 'screening', icon: '🧩', duration: '10 min', frequency: 'yearly', questions: 20 },
  
  // Relationships & Trauma
  { id: 'attachment', title: 'Attachment Style', titleBn: 'সংযুক্তি ধরন', category: 'relationships', icon: '🔗', duration: '7 min', frequency: 'yearly', questions: 15 },
  { id: 'childhood', title: 'Childhood Trauma', titleBn: 'শৈশব ট্রমা', category: 'trauma', icon: '👶', duration: '10 min', frequency: 'yearly', questions: 20 },
  { id: 'relationship-trauma', title: 'Past Relationship Trauma', titleBn: 'অতীত সম্পর্কের ট্রমা', category: 'trauma', icon: '💔', duration: '8 min', frequency: 'yearly', questions: 15 },
  { id: 'gaslighting', title: 'Gaslighting Experience', titleBn: 'গ্যাসলাইটিং অভিজ্ঞতা', category: 'trauma', icon: '🔥', duration: '6 min', frequency: 'yearly', questions: 12 },
  { id: 'toxic-family', title: 'Family Dynamics', titleBn: 'পারিবারিক গতিশীলতা', category: 'relationships', icon: '👨‍👩‍👧', duration: '8 min', frequency: 'yearly', questions: 15 },
  
  // Dark Traits & Self-Awareness
  { id: 'narcissism', title: 'Narcissism Level', titleBn: 'আত্মপ্রেম মাত্রা', category: 'dark', icon: '🪞', duration: '6 min', frequency: 'yearly', questions: 12 },
  { id: 'empathy', title: 'Empathy Level', titleBn: 'সহানুভূতি মাত্রা', category: 'personality', icon: '🤝', duration: '5 min', frequency: 'monthly', questions: 10 },
  { id: 'manipulation', title: 'Manipulation Tendency', titleBn: 'কারসাজি প্রবণতা', category: 'dark', icon: '🎭', duration: '6 min', frequency: 'yearly', questions: 12 },
  { id: 'anger', title: 'Anger Management', titleBn: 'রাগ নিয়ন্ত্রণ', category: 'mental', icon: '😤', duration: '5 min', frequency: 'monthly', questions: 10 },
  
  // Lifestyle & Wellness
  { id: 'body-image', title: 'Body Image', titleBn: 'শরীরের ধারণা', category: 'wellness', icon: '🪞', duration: '5 min', frequency: 'monthly', questions: 10 },
  { id: 'internet-addiction', title: 'Internet Addiction', titleBn: 'ইন্টারনেট আসক্তি', category: 'wellness', icon: '📱', duration: '5 min', frequency: 'weekly', questions: 10 },
  { id: 'sleep', title: 'Sleep Quality', titleBn: 'ঘুমের মান', category: 'wellness', icon: '😴', duration: '4 min', frequency: 'weekly', questions: 8 },
  { id: 'stress', title: 'Stress Level', titleBn: 'চাপের মাত্রা', category: 'wellness', icon: '😓', duration: '4 min', frequency: 'weekly', questions: 8 },
  
  // Career & Growth
  { id: 'career', title: 'Career Guidance', titleBn: 'ক্যারিয়ার গাইডেন্স', category: 'career', icon: '💼', duration: '10 min', frequency: 'yearly', questions: 20 },
  { id: 'charisma', title: 'Charisma Level', titleBn: 'ক্যারিশমা মাত্রা', category: 'career', icon: '✨', duration: '5 min', frequency: 'monthly', questions: 10 },
  { id: 'excellence', title: 'Pursuit of Excellence', titleBn: 'শ্রেষ্ঠত্বের সাধনা', category: 'career', icon: '🏆', duration: '6 min', frequency: 'monthly', questions: 12 },
];

// ============ PROFILE EDIT MODAL ============
const ProfileEditModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user: PatientProfile;
  onSave: (data: Partial<PatientProfile>) => Promise<void>;
}> = ({ isOpen, onClose, user, onSave }) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    nameBn: user.nameBn || '',
    dateOfBirth: user.dateOfBirth || '',
    gender: user.gender || 'male',
    bloodGroup: user.bloodGroup || '',
    height: user.height || '',
    weight: user.weight || '',
    emergencyContactName: user.emergencyContact?.name || '',
    emergencyContactRelation: user.emergencyContact?.relation || '',
    emergencyContactPhone: user.emergencyContact?.phone || '',
    chronicConditions: user.chronicConditions?.join(', ') || '',
    allergies: user.allergies?.join(', ') || '',
  });
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      name: formData.name,
      nameBn: formData.nameBn || formData.name,
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender as 'male' | 'female' | 'other',
      bloodGroup: formData.bloodGroup,
      height: formData.height ? Number(formData.height) : undefined,
      weight: formData.weight ? Number(formData.weight) : undefined,
      emergencyContact: formData.emergencyContactPhone ? {
        name: formData.emergencyContactName,
        relation: formData.emergencyContactRelation,
        phone: formData.emergencyContactPhone
      } : undefined,
      chronicConditions: formData.chronicConditions.split(',').map(s => s.trim()).filter(Boolean),
      allergies: formData.allergies.split(',').map(s => s.trim()).filter(Boolean),
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">প্রোফাইল সম্পাদনা</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600">✕</button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">নাম (ইংরেজি)</label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">নাম (বাংলা)</label>
              <input type="text" value={formData.nameBn} onChange={e => setFormData({...formData, nameBn: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">জন্ম তারিখ</label>
              <input type="date" value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} max={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">লিঙ্গ</label>
              <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                <option value="male">পুরুষ</option>
                <option value="female">মহিলা</option>
                <option value="other">অন্যান্য</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">রক্তের গ্রুপ</label>
              <select value={formData.bloodGroup} onChange={e => setFormData({...formData, bloodGroup: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
                <option value="">নির্বাচন</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">উচ্চতা (সেমি)</label>
              <input type="number" value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">ওজন (কেজি)</label>
              <input type="number" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
          </div>
          
          <div>
            <label className="text-xs text-slate-500 mb-1 block">দীর্ঘমেয়াদী রোগ</label>
            <input type="text" value={formData.chronicConditions} onChange={e => setFormData({...formData, chronicConditions: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="কমা দিয়ে আলাদা করুন" />
          </div>
          
          <div>
            <label className="text-xs text-slate-500 mb-1 block">এলার্জি</label>
            <input type="text" value={formData.allergies} onChange={e => setFormData({...formData, allergies: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="কমা দিয়ে আলাদা করুন" />
          </div>
          
          <div className="pt-2 border-t">
            <h4 className="text-sm font-bold text-slate-700 mb-2">জরুরি যোগাযোগ</h4>
            <div className="grid grid-cols-3 gap-2">
              <input type="text" value={formData.emergencyContactName} onChange={e => setFormData({...formData, emergencyContactName: e.target.value})} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="নাম" />
              <input type="text" value={formData.emergencyContactRelation} onChange={e => setFormData({...formData, emergencyContactRelation: e.target.value})} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="সম্পর্ক" />
              <input type="tel" value={formData.emergencyContactPhone} onChange={e => setFormData({...formData, emergencyContactPhone: e.target.value})} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="ফোন" />
            </div>
          </div>
        </div>
        
        <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-medium">বাতিল</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50">
            {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============ MAIN COMPONENT ============
export const PatientDashboard: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, logout, isLoading, updateProfile, addAIInsight } = useAuth();
  
  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'PATIENT')) {
      navigate('/patient-auth');
    }
  }, [user, isLoading, navigate]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!user || user.role !== 'PATIENT') return null;
  
  const patientUser = user as PatientProfile;
  const age = patientUser.age || (patientUser.dateOfBirth ? new Date().getFullYear() - new Date(patientUser.dateOfBirth).getFullYear() : 0);
  
  // State
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedQuizCategory, setSelectedQuizCategory] = useState<string>('all');
  const [medications, setMedications] = useState<Medication[]>([]);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [foodImage, setFoodImage] = useState<string | null>(null);
  const [foodAnalysis, setFoodAnalysis] = useState<string | null>(null);
  const [analyzingFood, setAnalyzingFood] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Initial AI greeting
  useEffect(() => {
    const greeting = `আসসালামু আলাইকুম ${patientUser.nameBn || patientUser.name}! 👋

আমি নির্ণয় AI - আপনার ব্যক্তিগত স্বাস্থ্য সহকারী।

আমি আপনাকে সাহায্য করতে পারি:
• 🩺 সমস্যা অনুযায়ী সঠিক ডাক্তার খুঁজতে
• 💊 ওষুধ ও চিকিৎসা সম্পর্কে জানতে
• 🏥 জরুরি লক্ষণ চিনতে
• 📋 স্বাস্থ্য পরামর্শ পেতে

কিভাবে সাহায্য করতে পারি?`;
    
    setMessages([{ role: 'model', text: greeting, timestamp: Date.now() }]);
  }, [patientUser.name, patientUser.nameBn]);
  
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  
  // Build health context for AI
  const buildHealthContext = () => {
    return `
রোগীর তথ্য:
- নাম: ${patientUser.nameBn || patientUser.name}
- বয়স: ${age} বছর
- লিঙ্গ: ${patientUser.gender === 'male' ? 'পুরুষ' : patientUser.gender === 'female' ? 'মহিলা' : 'অন্যান্য'}
- রক্তের গ্রুপ: ${patientUser.bloodGroup || 'অজানা'}
- দীর্ঘমেয়াদী রোগ: ${patientUser.chronicConditions?.length ? patientUser.chronicConditions.join(', ') : 'নেই'}
- এলার্জি: ${patientUser.allergies?.length ? patientUser.allergies.join(', ') : 'নেই'}
- বর্তমান ওষুধ: ${patientUser.currentMedications?.length ? patientUser.currentMedications.map(m => typeof m === 'string' ? m : m.name).join(', ') : 'নেই'}

নির্দেশনা:
1. রোগী যদি ডাক্তার খুঁজতে চায়, তাহলে সমস্যা অনুযায়ী সঠিক বিশেষজ্ঞ (Cardiologist, Neurologist, etc.) সাজেস্ট করুন এবং বলুন "আপনি 'ডাক্তার খুঁজুন' বাটনে ক্লিক করে [বিশেষত্ব] বিশেষজ্ঞ খুঁজতে পারেন"
2. জরুরি লক্ষণ থাকলে (বুকে ব্যথা, শ্বাসকষ্ট, অজ্ঞান) সরাসরি ইমার্জেন্সিতে যেতে বলুন
3. সংক্ষিপ্ত, কার্যকর উত্তর দিন
4. প্রয়োজনে টেস্ট বা পরীক্ষার পরামর্শ দিন
5. বাংলায় উত্তর দিন
`;
  };
  
  // Handle AI chat
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage, timestamp: Date.now() }]);
    setChatInput('');
    setIsTyping(true);
    
    try {
      const context = buildHealthContext();
      const response = await chatWithHealthAssistant(
        context + '\n\nরোগীর প্রশ্ন: "' + userMessage + '"',
        messages.map(m => m.text),
        ''
      );
      
      setMessages(prev => [...prev, { role: 'model', text: response, timestamp: Date.now() }]);
      
      // Save important insights
      if (response.includes('ডাক্তার') || response.includes('বিশেষজ্ঞ') || response.includes('জরুরি') || response.includes('ইমার্জেন্সি')) {
        await addAIInsight({
          insight: userMessage.substring(0, 100),
          category: 'health_query',
          severity: response.includes('জরুরি') || response.includes('ইমার্জেন্সি') ? 'critical' : 'info'
        });
      }
    } catch {
      setMessages(prev => [...prev, { role: 'model', text: 'দুঃখিত, সমস্যা হয়েছে। আবার চেষ্টা করুন।', timestamp: Date.now() }]);
    }
    
    setIsTyping(false);
  };
  
  // Handle food image upload
  const handleFoodUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target?.result as string;
      setFoodImage(imageData);
      setAnalyzingFood(true);
      setFoodAnalysis(null);
      
      // Simulate AI analysis (in real app, send to Gemini Vision API)
      setTimeout(() => {
        const conditions = patientUser.chronicConditions || [];
        const allergies = patientUser.allergies || [];
        
        let analysis = `🍽️ **খাবার বিশ্লেষণ**\n\n`;
        
        if (conditions.some(c => c.toLowerCase().includes('ডায়াবেটিস') || c.toLowerCase().includes('diabetes'))) {
          analysis += `⚠️ **ডায়াবেটিস সতর্কতা**: চিনি ও কার্বোহাইড্রেট সমৃদ্ধ খাবার এড়িয়ে চলুন।\n\n`;
        }
        
        if (conditions.some(c => c.toLowerCase().includes('রক্তচাপ') || c.toLowerCase().includes('pressure'))) {
          analysis += `⚠️ **রক্তচাপ সতর্কতা**: লবণ কম খান।\n\n`;
        }
        
        analysis += `✅ **সাধারণ পরামর্শ**:\n`;
        analysis += `• প্রক্রিয়াজাত খাবার এড়িয়ে চলুন\n`;
        analysis += `• তাজা শাকসবজি ও ফল খান\n`;
        analysis += `• পর্যাপ্ত পানি পান করুন\n`;
        analysis += `• ভাজাপোড়া কম খান\n\n`;
        analysis += `📌 বিস্তারিত জানতে AI সহকারীকে জিজ্ঞাসা করুন।`;
        
        setFoodAnalysis(analysis);
        setAnalyzingFood(false);
      }, 2000);
    };
    reader.readAsDataURL(file);
  };
  
  // Handle feedback submission
  const handleFeedbackSubmit = () => {
    if (!feedbackText.trim()) return;
    
    // Save feedback to localStorage (in real app, send to backend)
    const feedbacks = JSON.parse(localStorage.getItem('nirnoy_feedbacks') || '[]');
    feedbacks.push({
      id: Date.now().toString(),
      userId: patientUser.id,
      userName: patientUser.name,
      userPhone: patientUser.phone,
      feedback: feedbackText,
      date: new Date().toISOString(),
      status: 'pending'
    });
    localStorage.setItem('nirnoy_feedbacks', JSON.stringify(feedbacks));
    
    setFeedbackSubmitted(true);
    setFeedbackText('');
    setTimeout(() => setFeedbackSubmitted(false), 3000);
  };
  
  const handleProfileSave = async (data: Partial<PatientProfile>) => {
    await updateProfile(data);
  };
  
  const handleLogout = () => {
    logout();
    if (onLogout) onLogout();
    navigate('/');
  };
  
  // Tabs configuration
  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'home', label: 'হোম', icon: '🏠' },
    { id: 'ai', label: 'AI', icon: '🤖' },
    { id: 'food', label: 'খাবার', icon: '🍽️' },
    { id: 'meds', label: 'ওষুধ', icon: '💊' },
    { id: 'doctors', label: 'ডাক্তার', icon: '👨‍⚕️' },
    { id: 'quiz', label: 'কুইজ', icon: '🎮' },
    { id: 'feedback', label: 'মতামত', icon: '💬' },
    { id: 'profile', label: 'প্রোফাইল', icon: '👤' },
  ];
  
  // Quiz categories
  const quizCategories = [
    { id: 'all', label: 'সব', icon: '📚' },
    { id: 'personality', label: 'ব্যক্তিত্ব', icon: '🎭' },
    { id: 'mental', label: 'মানসিক', icon: '🧠' },
    { id: 'relationships', label: 'সম্পর্ক', icon: '💕' },
    { id: 'trauma', label: 'ট্রমা', icon: '💔' },
    { id: 'wellness', label: 'সুস্থতা', icon: '🌟' },
    { id: 'career', label: 'ক্যারিয়ার', icon: '💼' },
  ];
  
  const filteredQuizzes = selectedQuizCategory === 'all' 
    ? QUIZZES 
    : QUIZZES.filter(q => q.category === selectedQuizCategory);
  
  // ============ RENDER HOME ============
  const renderHome = () => (
    <div className="space-y-6">
      {/* Welcome Header - Clean & Minimal */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isBn ? 'স্বাগতম' : 'Welcome back'}, {patientUser.name?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isBn ? 'আপনার স্বাস্থ্যের সারসংক্ষেপ' : 'Your health at a glance'}
          </p>
        </div>
        <span className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs font-bold rounded-full shadow-sm">
          👑 PREMIUM
        </span>
      </div>
      
      {/* Stats Cards - Clean Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-xs">{isBn ? 'স্কোর' : 'Score'}</span>
            <span className="text-green-500 text-xs">↗ +5%</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{patientUser.healthScore || 85}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-xs">{isBn ? 'অ্যাপয়েন্টমেন্ট' : 'Appointments'}</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">0</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-xs">{isBn ? 'কুইজ' : 'Quizzes'}</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">0</p>
        </div>
      </div>
      
      {/* Profile Card - Minimal Dark */}
      <div className="bg-slate-900 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-4">
          <img 
            src={patientUser.profileImage || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(patientUser.name || 'U') + '&background=3b82f6&color=fff'} 
            alt="" 
            className="w-14 h-14 rounded-xl" 
          />
          <div className="flex-1">
            <h2 className="font-bold">{patientUser.nameBn || patientUser.name}</h2>
            <p className="text-sm text-slate-400">{age} {isBn ? 'বছর' : 'yrs'} {patientUser.bloodGroup && '• ' + patientUser.bloodGroup}</p>
          </div>
          <button onClick={() => setActiveTab('profile')} className="p-2 bg-white/10 rounded-lg hover:bg-white/20">
            <i className="fas fa-pen text-xs"></i>
          </button>
        </div>
      </div>
      
      {/* Quick Actions - Cleaner */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: '🤖', label: isBn ? 'AI' : 'AI', tab: 'ai' as TabType },
          { icon: '🍽️', label: isBn ? 'খাবার' : 'Food', tab: 'food' as TabType },
          { icon: '💊', label: isBn ? 'ওষুধ' : 'Meds', tab: 'meds' as TabType },
          { icon: '🎮', label: isBn ? 'কুইজ' : 'Quiz', tab: 'quiz' as TabType },
        ].map((item, i) => (
          <button key={i} onClick={() => setActiveTab(item.tab)} className="bg-white rounded-xl p-4 border border-slate-100 text-center hover:border-blue-200 hover:shadow-md transition">
            <span className="text-2xl block">{item.icon}</span>
            <p className="text-xs text-slate-600 mt-2 font-medium">{item.label}</p>
          </button>
        ))}
      </div>
      
      {/* Health Alerts - Cleaner */}
      {patientUser.chronicConditions && patientUser.chronicConditions.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <h3 className="font-semibold text-amber-800 text-sm mb-2">⚠️ {isBn ? 'স্বাস্থ্য সতর্কতা' : 'Health Alerts'}</h3>
          <div className="flex flex-wrap gap-2">
            {patientUser.chronicConditions.map((c, i) => (
              <span key={i} className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs">{c}</span>
            ))}
          </div>
        </div>
      )}
      
      {/* Find Doctor CTA - Cleaner */}
      <button onClick={() => navigate('/search')} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl font-semibold transition flex items-center justify-center gap-2">
        <i className="fas fa-search"></i>
        {isBn ? 'ডাক্তার খুঁজুন' : 'Find a Doctor'}
      </button>
    </div>
  );
  // ============ RENDER AI ASSISTANT ============
  const renderAI = () => (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* Chat Header */}
      <div className="bg-slate-900 rounded-t-xl p-3 text-white flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">🤖</div>
        <div>
          <h3 className="font-bold">নির্ণয় AI সহকারী</h3>
          <p className="text-xs text-white/80">সমস্যা বলুন, ডাক্তার খুঁজে দেব</p>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
              msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-md' : 'bg-white text-slate-800 rounded-tl-md shadow-sm'
            }`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-2xl rounded-tl-md shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Quick Actions */}
      <div className="bg-white border-t border-slate-100 px-3 py-2">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['ডাক্তার খুঁজুন', 'মাথা ব্যথা', 'বুকে ব্যথা', 'জ্বর', 'পেটে ব্যথা'].map((q, i) => (
            <button key={i} onClick={() => setChatInput(q)} className="px-3 py-1.5 bg-slate-50 rounded-full text-xs whitespace-nowrap hover:bg-slate-200">{q}</button>
          ))}
        </div>
      </div>
      
      {/* Input */}
      <div className="bg-white border-t border-slate-100 p-3 rounded-b-xl flex gap-2">
        <input 
          type="text" 
          value={chatInput} 
          onChange={(e) => setChatInput(e.target.value)} 
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} 
          placeholder="সমস্যা লিখুন বা ডাক্তার খুঁজুন..." 
          className="flex-1 bg-slate-50 rounded-xl px-4 py-3 text-sm outline-none" 
        />
        <button onClick={handleSendMessage} disabled={isTyping || !chatInput.trim()} className="w-11 h-11 bg-blue-600 text-white rounded-xl disabled:opacity-50 flex items-center justify-center">
          ➤
        </button>
      </div>
    </div>
  );
  
  // ============ RENDER FOOD SCANNER ============
  const renderFood = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-800">🍽️ কি খাচ্ছি?</h2>
        <p className="text-sm text-slate-500">খাবারের ছবি তুলুন, AI বিশ্লেষণ করবে</p>
      </div>
      
      {/* Upload Area */}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/50 transition"
      >
        {foodImage ? (
          <img src={foodImage} alt="Food" className="max-h-48 mx-auto rounded-xl" />
        ) : (
          <>
            <div className="text-5xl mb-3">📷</div>
            <p className="text-slate-600 font-medium">ছবি আপলোড করুন</p>
            <p className="text-xs text-slate-400 mt-1">ট্যাপ করুন বা ড্র্যাগ করুন</p>
          </>
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFoodUpload} className="hidden" />
      
      {/* Analysis Result */}
      {analyzingFood && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-center">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-600">বিশ্লেষণ করা হচ্ছে...</p>
        </div>
      )}
      
      {foodAnalysis && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <p className="whitespace-pre-wrap text-sm text-slate-700">{foodAnalysis}</p>
        </div>
      )}
      
      {/* Health Tips */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
        <h3 className="font-bold text-green-800 text-sm mb-2">🥗 স্বাস্থ্যকর খাবার টিপস</h3>
        <ul className="text-xs text-green-700 space-y-1">
          <li>• প্রতিদিন ৫ রকম শাকসবজি ও ফল খান</li>
          <li>• প্রক্রিয়াজাত খাবার এড়িয়ে চলুন</li>
          <li>• পর্যাপ্ত পানি পান করুন (২-৩ লিটার)</li>
          <li>• রাতে হালকা খাবার খান</li>
        </ul>
      </div>
    </div>
  );
  
  // ============ RENDER MEDICATIONS ============
  const renderMeds = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">💊 ওষুধ ব্যবস্থাপনা</h2>
        <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold">+ যোগ করুন</button>
      </div>
      
      {/* Current Medications */}
      {patientUser.currentMedications && patientUser.currentMedications.length > 0 ? (
        <div className="space-y-3">
          {patientUser.currentMedications.map((med, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-800">{typeof med === 'string' ? med : med.name}</h3>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">সক্রিয়</span>
              </div>
              {typeof med !== 'string' && (
                <div className="text-sm text-slate-500">
                  <p>{med.dosage} • {med.frequency}</p>
                </div>
              )}
              <div className="flex gap-2 mt-3">
                <button className="flex-1 py-2 bg-teal-50 text-teal-700 rounded-lg text-xs font-medium">✓ খেয়েছি</button>
                <button className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-lg text-xs font-medium">⏰ রিমাইন্ডার</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100 text-center">
          <div className="text-4xl mb-3">💊</div>
          <h3 className="font-bold text-slate-800 mb-1">কোনো ওষুধ নেই</h3>
          <p className="text-sm text-slate-500">ডাক্তারের প্রেসক্রিপশন থেকে ওষুধ যোগ করুন</p>
        </div>
      )}
      
      {/* Reminder Settings */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <h3 className="font-bold text-blue-800 text-sm mb-2">⏰ রিমাইন্ডার সেটিংস</h3>
        <p className="text-xs text-blue-700 mb-3">SMS বা নোটিফিকেশনে ওষুধ খাওয়ার মনে করিয়ে দেবে</p>
        <div className="flex gap-2">
          <button className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold">📱 SMS চালু করুন</button>
          <button className="flex-1 py-2 bg-white text-blue-700 rounded-lg text-xs font-medium border border-blue-200">🔔 নোটিফিকেশন</button>
        </div>
      </div>
    </div>
  );
  
  // ============ RENDER DOCTORS ============
  const renderDoctors = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">👨‍⚕️ আমার ডাক্তারগণ</h2>
        <button onClick={() => navigate('/search')} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold">+ নতুন</button>
      </div>
      
      {patientUser.healthRecords?.consultations && patientUser.healthRecords.consultations.length > 0 ? (
        <div className="space-y-3">
          {patientUser.healthRecords.consultations.map((c, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-xl">👨‍⚕️</div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800">{c.doctorName}</h3>
                  <p className="text-sm text-slate-500">{c.specialty}</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-2 text-sm text-slate-600 mb-2">
                <strong>রোগ:</strong> {c.diagnosis}
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">আবার বুক করুন</button>
                <button className="py-2 px-3 bg-slate-50 text-slate-600 rounded-lg text-xs">📋 প্রেসক্রিপশন</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100 text-center">
          <div className="text-5xl mb-3">👨‍⚕️</div>
          <h3 className="font-bold text-slate-800 mb-1">এখনো কোনো ডাক্তার নেই</h3>
          <p className="text-sm text-slate-500 mb-4">ডাক্তার খুঁজুন এবং অ্যাপয়েন্টমেন্ট নিন</p>
          <button onClick={() => navigate('/search')} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold">ডাক্তার খুঁজুন</button>
        </div>
      )}
    </div>
  );
  
  // ============ RENDER QUIZZES ============
  const renderQuiz = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-800">🎮 স্বাস্থ্য কুইজ</h2>
        <p className="text-sm text-slate-500">মজার কুইজে নিজেকে জানুন</p>
      </div>
      
      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {quizCategories.map(cat => (
          <button 
            key={cat.id}
            onClick={() => setSelectedQuizCategory(cat.id)}
            className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap flex items-center gap-1 ${
              selectedQuizCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            <span>{cat.icon}</span> {cat.label}
          </button>
        ))}
      </div>
      
      {/* Quiz Grid */}
      <div className="grid grid-cols-2 gap-3">
        {filteredQuizzes.map(quiz => (
          <button key={quiz.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 text-left hover:border-blue-200 transition">
            <div className="text-3xl mb-2">{quiz.icon}</div>
            <h3 className="font-bold text-slate-800 text-sm">{quiz.titleBn}</h3>
            <p className="text-xs text-slate-500 mt-1">{quiz.duration} • {quiz.questions} প্রশ্ন</p>
            <div className="flex items-center gap-1 mt-2">
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                quiz.frequency === 'daily' ? 'bg-green-100 text-green-700' :
                quiz.frequency === 'weekly' ? 'bg-blue-100 text-blue-700' :
                quiz.frequency === 'monthly' ? 'bg-purple-100 text-purple-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {quiz.frequency === 'daily' ? 'দৈনিক' : quiz.frequency === 'weekly' ? 'সাপ্তাহিক' : quiz.frequency === 'monthly' ? 'মাসিক' : 'বার্ষিক'}
              </span>
            </div>
          </button>
        ))}
      </div>
      
      {/* Quiz Benefits */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
        <h3 className="font-bold text-purple-800 text-sm mb-2">🎯 কুইজের সুবিধা</h3>
        <ul className="text-xs text-purple-700 space-y-1">
          <li>• নিজের মানসিক স্বাস্থ্য বুঝুন</li>
          <li>• ব্যক্তিত্ব ও আচরণ বিশ্লেষণ</li>
          <li>• AI ব্যক্তিগত পরামর্শ পান</li>
          <li>• প্রতিদিন নতুন কিছু শিখুন</li>
        </ul>
      </div>
    </div>
  );
  
  // ============ RENDER FEEDBACK ============
  const renderFeedback = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-800">💬 মতামত দিন</h2>
        <p className="text-sm text-slate-500">আপনার পরামর্শ আমাদের উন্নতিতে সাহায্য করবে</p>
      </div>
      
      {feedbackSubmitted ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="font-bold text-green-800">ধন্যবাদ!</h3>
          <p className="text-sm text-green-700">আপনার মতামত পাঠানো হয়েছে</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <textarea 
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="আপনার মতামত বা পরামর্শ লিখুন..."
              className="w-full h-32 p-3 border border-slate-200 rounded-xl text-sm resize-none outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button 
              onClick={handleFeedbackSubmit}
              disabled={!feedbackText.trim()}
              className="w-full mt-3 py-3 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50"
            >
              পাঠান
            </button>
          </div>
          
          {/* Quick Feedback Options */}
          <div className="space-y-2">
            <p className="text-sm text-slate-600 font-medium">দ্রুত মতামত:</p>
            {[
              'অ্যাপটি খুব ভালো লেগেছে!',
              'আরো ফিচার চাই',
              'কিছু সমস্যা হচ্ছে',
              'UI উন্নত করুন',
            ].map((option, i) => (
              <button 
                key={i}
                onClick={() => setFeedbackText(option)}
                className="w-full p-3 bg-slate-50 rounded-xl text-left text-sm text-slate-700 hover:bg-slate-50 transition"
              >
                {option}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
  
  // ============ RENDER PROFILE ============
  const renderProfile = () => (
    <div className="space-y-4">
      {/* Profile Header */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 text-center">
        <img 
          src={patientUser.profileImage || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(patientUser.name) + '&background=0d9488&color=fff'} 
          alt="" 
          className="w-20 h-20 rounded-full mx-auto border-4 border-teal-100" 
        />
        <h2 className="font-bold text-xl text-slate-800 mt-3">{patientUser.nameBn || patientUser.name}</h2>
        <p className="text-slate-500 text-sm">{patientUser.phone}</p>
        
        <div className="flex justify-center gap-2 mt-3 flex-wrap">
          {patientUser.bloodGroup && <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold">{patientUser.bloodGroup}</span>}
          {age > 0 && <span className="px-3 py-1 bg-slate-50 text-slate-600 rounded-full text-sm">{age} বছর</span>}
          <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-bold">👑 Premium</span>
        </div>
        
        <button onClick={() => setShowEditProfile(true)} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm">
          ✏️ সম্পাদনা
        </button>
      </div>
      
      {/* Profile Info */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 space-y-3">
        <h3 className="font-bold text-slate-700 text-sm">📋 ব্যক্তিগত তথ্য</h3>
        {[
          { l: 'উচ্চতা', v: patientUser.height ? patientUser.height + ' সেমি' : '-' },
          { l: 'ওজন', v: patientUser.weight ? patientUser.weight + ' কেজি' : '-' },
          { l: 'জন্ম তারিখ', v: patientUser.dateOfBirth ? new Date(patientUser.dateOfBirth).toLocaleDateString('bn-BD') : '-' },
        ].map((r, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-slate-500">{r.l}</span>
            <span className="font-medium">{r.v}</span>
          </div>
        ))}
      </div>
      
      {/* Emergency Contact */}
      {patientUser.emergencyContact && (
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <h3 className="font-bold text-red-800 text-sm mb-2">🚨 জরুরি যোগাযোগ</h3>
          <p className="text-sm text-red-700">{patientUser.emergencyContact.name} ({patientUser.emergencyContact.relation})</p>
          <p className="text-sm text-red-600 font-medium">{patientUser.emergencyContact.phone}</p>
        </div>
      )}
      
      {/* Logout */}
      <button onClick={handleLogout} className="w-full py-3 bg-red-500 text-white rounded-xl font-bold">
        লগআউট
      </button>
    </div>
  );
  
  // ============ MAIN LAYOUT ============
  return (
    <div className="min-h-screen bg-slate-50">
      <ProfileEditModal isOpen={showEditProfile} onClose={() => setShowEditProfile(false)} user={patientUser} onSave={handleProfileSave} />
      
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <button onClick={() => navigate('/')} className="w-10 h-10 flex items-center justify-center">
            <i className="fas fa-arrow-left text-slate-600"></i>
          </button>
          <h1 className="font-bold text-slate-800">{tabs.find(t => t.id === activeTab)?.label}</h1>
          <div className="w-10 h-10"></div>
        </div>
      </div>
      
      {/* Tab Bar (Scrollable) */}
      <div className="bg-white border-b border-slate-200 px-2 py-2 sticky top-14 z-30">
        <div className="flex gap-1 overflow-x-auto max-w-3xl mx-auto">
          {tabs.map((t) => (
            <button 
              key={t.id} 
              onClick={() => setActiveTab(t.id)} 
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1 ${
                activeTab === t.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 pb-8 max-w-3xl mx-auto">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'ai' && renderAI()}
        {activeTab === 'food' && renderFood()}
        {activeTab === 'meds' && renderMeds()}
        {activeTab === 'doctors' && renderDoctors()}
        {activeTab === 'quiz' && renderQuiz()}
        {activeTab === 'feedback' && renderFeedback()}
        {activeTab === 'profile' && renderProfile()}
      </div>
    </div>
  );
};

export default PatientDashboard;
