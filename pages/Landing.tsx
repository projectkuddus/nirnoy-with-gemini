import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { MOCK_DOCTORS } from '../data/mockData';
import Navbar from '../components/Navbar';
import HomeVoiceSection from '../components/HomeVoiceSection';


// Health Trivia Data - Changes every hour
const HEALTH_TRIVIA = [
  // AI & Future Health
  { icon: '🤖', category: 'AI Health', en: 'AI can detect diabetic retinopathy with 94% accuracy - faster than most specialists!', bn: 'AI ৯৪% নির্ভুলতায় ডায়াবেটিক রেটিনোপ্যাথি শনাক্ত করতে পারে!' },
  { icon: '🧬', category: 'Future', en: 'By 2030, AI will help diagnose 80% of diseases before symptoms appear.', bn: '২০৩০ সালে AI লক্ষণ দেখা দেওয়ার আগেই ৮০% রোগ নির্ণয় করবে।' },
  { icon: '📱', category: 'Digital Health', en: 'Your smartphone can now detect heart arrhythmias using just the camera!', bn: 'আপনার স্মার্টফোন ক্যামেরা দিয়েই হার্টের অনিয়ম ধরতে পারে!' },
  { icon: '🔬', category: 'Innovation', en: 'Nanobots smaller than blood cells will deliver medicine directly to tumors by 2035.', bn: '২০৩৫ সালে রক্তকণিকার চেয়ে ছোট ন্যানোবট সরাসরি টিউমারে ওষুধ পৌঁছাবে।' },
  
  // Bangladesh Health Facts
  { icon: '🇧🇩', category: 'Bangladesh', en: 'Bangladesh reduced child mortality by 73% since 1990 - a global success story!', bn: 'বাংলাদেশ ১৯৯০ থেকে শিশু মৃত্যু ৭৩% কমিয়েছে - বিশ্ব সাফল্য!' },
  { icon: '💉', category: 'Bangladesh', en: 'Bangladesh has one of the highest vaccination rates in South Asia at 98%!', bn: 'বাংলাদেশে টিকাদান হার দক্ষিণ এশিয়ায় সর্বোচ্চ - ৯৮%!' },
  { icon: '🏥', category: 'Healthcare', en: 'Bangladesh has 1 doctor per 1,581 people. Nirnoy is here to bridge this gap!', bn: 'বাংলাদেশে প্রতি ১,৫৮১ জনে ১ জন ডাক্তার। নির্ণয় এই ফারাক কমাতে এসেছে!' },
  
  // Fun Health Facts
  { icon: '❤️', category: 'Heart', en: 'Your heart beats about 100,000 times per day - that\'s 35 million times a year!', bn: 'আপনার হৃদপিণ্ড দিনে প্রায় ১ লক্ষ বার স্পন্দিত হয়!' },
  { icon: '🧠', category: 'Brain', en: 'Your brain uses 20% of your body\'s energy but is only 2% of your weight.', bn: 'মস্তিষ্ক শরীরের মাত্র ২% কিন্তু ২০% শক্তি খরচ করে!' },
  { icon: '😴', category: 'Sleep', en: 'During sleep, your brain cleans itself of toxins. 7-8 hours is essential!', bn: 'ঘুমের সময় মস্তিষ্ক বিষাক্ত পদার্থ পরিষ্কার করে। ৭-৮ ঘণ্টা ঘুম জরুরি!' },
  { icon: '🚶', category: 'Exercise', en: 'Walking 30 minutes daily reduces heart disease risk by 35%.', bn: 'প্রতিদিন ৩০ মিনিট হাঁটলে হৃদরোগের ঝুঁকি ৩৫% কমে!' },
  { icon: '💧', category: 'Hydration', en: 'Drinking 8 glasses of water daily can boost your metabolism by 30%.', bn: 'দিনে ৮ গ্লাস পানি বিপাক ক্রিয়া ৩০% বাড়ায়!' },
  { icon: '🥗', category: 'Nutrition', en: 'Eating colorful vegetables gives you different vitamins - eat the rainbow!', bn: 'রঙিন সবজি বিভিন্ন ভিটামিন দেয় - রংধনু খান!' },
  { icon: '😊', category: 'Mental Health', en: 'Laughing 15 minutes a day burns 40 calories and boosts immunity!', bn: 'দিনে ১৫ মিনিট হাসলে ৪০ ক্যালোরি খরচ হয় ও রোগ প্রতিরোধ বাড়ে!' },
  { icon: '🧘', category: 'Wellness', en: 'Just 10 minutes of meditation can reduce stress hormones by 25%.', bn: 'মাত্র ১০ মিনিট ধ্যান স্ট্রেস হরমোন ২৫% কমায়!' },
  
  // Surprising Facts
  { icon: '👁️', category: 'Eyes', en: 'Your eyes can distinguish about 10 million different colors!', bn: 'আপনার চোখ প্রায় ১ কোটি রঙ আলাদা করতে পারে!' },
  { icon: '🦷', category: 'Dental', en: 'Your teeth are as unique as your fingerprints - no two are alike!', bn: 'আপনার দাঁত আঙুলের ছাপের মতোই অনন্য!' },
  { icon: '🫁', category: 'Lungs', en: 'If you spread out your lungs, they would cover a tennis court!', bn: 'ফুসফুস ছড়িয়ে দিলে একটি টেনিস কোর্ট ঢেকে যাবে!' },
  { icon: '🩸', category: 'Blood', en: 'Your blood travels 19,000 km per day - almost halfway around Earth!', bn: 'রক্ত প্রতিদিন ১৯,০০০ কিমি ভ্রমণ করে - প্রায় অর্ধেক পৃথিবী!' },
  
  // Nirnoy Tips
  { icon: '💡', category: 'Tip', en: 'Regular health checkups can detect 90% of diseases early. Book with Nirnoy!', bn: 'নিয়মিত স্বাস্থ্য পরীক্ষায় ৯০% রোগ আগেই ধরা পড়ে। নির্ণয়ে বুক করুন!' },
  { icon: '📋', category: 'Tip', en: 'Keep your health records digital with Nirnoy - access anytime, anywhere!', bn: 'নির্ণয়ে স্বাস্থ্য রেকর্ড ডিজিটাল রাখুন - যেকোনো সময় দেখুন!' },
  { icon: '👨‍👩‍👧‍👦', category: 'Family', en: 'Add your family to Nirnoy - one app for everyone\'s health!', bn: 'পরিবারকে নির্ণয়ে যোগ করুন - সবার স্বাস্থ্য এক অ্যাপে!' },
];

// Get trivia based on hour (changes every hour)
const getCurrentTrivia = () => {
  const hour = new Date().getHours();
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const index = (dayOfYear * 24 + hour) % HEALTH_TRIVIA.length;
  return HEALTH_TRIVIA[index];
};

// Trivia Strip Component
const HealthTriviaStrip: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [trivia, setTrivia] = useState(getCurrentTrivia());
  const [isAnimating, setIsAnimating] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const isBn = language === 'bn';
  
  // Update trivia every hour automatically
  useEffect(() => {
    const interval = setInterval(() => {
      refreshTrivia();
    }, 3600000); // 1 hour
    return () => clearInterval(interval);
  }, []);
  
  // Refresh trivia with animation
  const refreshTrivia = () => {
    setIsAnimating(true);
    setClickCount(prev => prev + 1);
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * HEALTH_TRIVIA.length);
      setTrivia(HEALTH_TRIVIA[randomIndex]);
      setIsAnimating(false);
    }, 300);
  };
  
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 border-b border-slate-700/50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Fun Icon with bounce animation */}
          <div 
            className={`text-4xl cursor-pointer transition-transform hover:scale-125 ${isAnimating ? 'animate-bounce' : ''}`}
            onClick={refreshTrivia}
          >
            {trivia.icon}
          </div>
          
          {/* Content */}
          <div className={`flex-1 transition-all duration-300 ${isAnimating ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold">
                💡 {isBn ? 'জানেন কি?' : 'Did You Know?'}
              </span>
              <span className="text-slate-500 text-xs">
                #{clickCount + 1} • {trivia.category}
              </span>
            </div>
            <p className="text-white text-sm md:text-base font-medium">
              {isBn ? trivia.bn : trivia.en}
            </p>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button 
              onClick={refreshTrivia}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all group border border-white/10"
              title={isBn ? 'আরেকটি দেখুন' : 'Show another'}
            >
              <i className={`fas fa-dice text-blue-400 group-hover:text-blue-300 transition-transform ${isAnimating ? 'animate-spin' : 'group-hover:rotate-12'}`}></i>
            </button>
            <button 
              onClick={() => navigate('/patient-auth')}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-bold rounded-lg hover:from-blue-600 hover:to-indigo-600 transition shadow-lg shadow-blue-500/25"
            >
              <i className="fas fa-user-plus"></i>
              {isBn ? 'যোগ দিন' : 'Join Free'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Animated Counter
const AnimatedCounter: React.FC<{ end: number; suffix?: string }> = ({ end, suffix = '' }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / 2000, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end]);
  
  return <>{count}{suffix}</>;
};

// Specialty Card - Compact Design
const SpecialtyCard: React.FC<{
  name: string;
  nameBn: string;
  icon: string;
  color: string;
  count: number;
  onClick: () => void;
}> = ({ name, nameBn, icon, color, count, onClick }) => {
  const { language } = useLanguage();
  
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center justify-center bg-white rounded-xl p-3 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-lg transition-all duration-200 aspect-square"
    >
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110"
        style={{ backgroundColor: `${color}15` }}
      >
        <i className={`fas ${icon} text-lg`} style={{ color }}></i>
      </div>
      <h3 className="font-semibold text-slate-800 text-xs text-center leading-tight">{language === 'bn' ? nameBn : name}</h3>
      <p className="text-[10px] text-slate-400 mt-0.5">{count}+</p>
    </button>
  );
};

interface LandingProps {
  onLogin?: (role: UserRole) => void;
  userRole?: UserRole;
  onLogout?: () => void;
}

export const Landing: React.FC<LandingProps> = ({ onLogin, userRole: propUserRole, onLogout }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const userRole = propUserRole || (user?.role === 'PATIENT' ? UserRole.PATIENT : user?.role === 'DOCTOR' ? UserRole.DOCTOR : UserRole.GUEST);
  
  const handleLogout = () => {
    logout();
    if (onLogout) onLogout();
  };
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const isBn = language === 'bn';

  const totalDoctors = MOCK_DOCTORS.length;
  const specialtyCounts: Record<string, number> = {};
  MOCK_DOCTORS.forEach(d => d.specialties.forEach(s => { specialtyCounts[s] = (specialtyCounts[s] || 0) + 1; }));

  const specialties = [
    { name: 'Medicine', nameBn: 'মেডিসিন', icon: 'fa-stethoscope', color: '#3b82f6' },
    { name: 'Cardiology', nameBn: 'হৃদরোগ', icon: 'fa-heartbeat', color: '#ef4444' },
    { name: 'Gynaecology', nameBn: 'স্ত্রীরোগ', icon: 'fa-venus', color: '#ec4899' },
    { name: 'Paediatrics', nameBn: 'শিশুরোগ', icon: 'fa-baby', color: '#06b6d4' },
    { name: 'Orthopedics', nameBn: 'হাড়', icon: 'fa-bone', color: '#f97316' },
    { name: 'Dermatology', nameBn: 'চর্ম', icon: 'fa-allergies', color: '#8b5cf6' },
    { name: 'ENT', nameBn: 'নাক-কান-গলা', icon: 'fa-head-side-cough', color: '#14b8a6' },
    { name: 'Eye', nameBn: 'চক্ষু', icon: 'fa-eye', color: '#6366f1' },
    { name: 'Neurology', nameBn: 'স্নায়ু', icon: 'fa-brain', color: '#a855f7' },
    { name: 'Psychiatry', nameBn: 'মানসিক', icon: 'fa-head-side-virus', color: '#0ea5e9' },
    { name: 'Gastro', nameBn: 'পেট', icon: 'fa-stomach', color: '#22c55e' },
    { name: 'Nephrology', nameBn: 'কিডনি', icon: 'fa-kidneys', color: '#dc2626' },
    { name: 'Pulmonology', nameBn: 'ফুসফুস', icon: 'fa-lungs', color: '#0891b2' },
    { name: 'Endocrine', nameBn: 'হরমোন', icon: 'fa-disease', color: '#7c3aed' },
    { name: 'Oncology', nameBn: 'ক্যান্সার', icon: 'fa-ribbon', color: '#be185d' },
    { name: 'Surgery', nameBn: 'সার্জারি', icon: 'fa-scalpel', color: '#059669' },
    { name: 'Urology', nameBn: 'মূত্র', icon: 'fa-venus-mars', color: '#d97706' },
    { name: 'Dental', nameBn: 'দাঁত', icon: 'fa-tooth', color: '#2563eb' },
    { name: 'Physiotherapy', nameBn: 'ফিজিও', icon: 'fa-person-walking', color: '#16a34a' },
    { name: 'Nutrition', nameBn: 'পুষ্টি', icon: 'fa-apple-whole', color: '#84cc16' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Health Trivia Strip - Topmost of Page (Fixed at very top) */}
      <HealthTriviaStrip />
      
      {/* Navbar - Below Trivia Strip (Fixed, positioned below trivia) */}
      <Navbar userRole={userRole} onLogout={handleLogout} />

      {/* Hero Section - Adjusted padding for fixed navbar + trivia */}
      <section className="pt-32 pb-16 px-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  {isBn ? 'ঢাকা জুড়ে সক্রিয়' : 'Active Across Dhaka'}
                </div>
                
                <h1 className="text-5xl lg:text-6xl font-black text-slate-900 leading-tight">
                  {t('hero.title1')}<br />
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{t('hero.title2')}</span>
                </h1>
                
                <p className="text-lg text-slate-600 max-w-xl">{t('hero.subtitle')}</p>
              </div>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="flex gap-3">
                <div className="flex-1 relative">
                  <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('hero.searchPlaceholder')}
                    className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition text-slate-800"
                  />
                </div>
                <button
                  type="submit"
                  className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-2xl hover:from-blue-600 hover:to-indigo-600 transition shadow-lg shadow-blue-500/25"
                >
                  {t('hero.search')}
                </button>
              </form>

              {/* Quick Stats */}
              <div className="flex gap-8">
                <div>
                  <p className="text-3xl font-black text-slate-900"><AnimatedCounter end={totalDoctors} suffix="+" /></p>
                  <p className="text-sm text-slate-500">{isBn ? 'বিশেষজ্ঞ ডাক্তার' : 'Expert Doctors'}</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-slate-900"><AnimatedCounter end={50000} suffix="+" /></p>
                  <p className="text-sm text-slate-500">{isBn ? 'সন্তুষ্ট রোগী' : 'Happy Patients'}</p>
                </div>
                <div>
                  <p className="text-3xl font-black text-blue-600">24/7</p>
                  <p className="text-sm text-slate-500">{isBn ? 'AI সাপোর্ট' : 'AI Support'}</p>
                </div>
              </div>
            </div>

            {/* Right - Voice Agent */}
            <div className="hidden lg:block">
              <HomeVoiceSection />
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Voice Section */}
      <section className="lg:hidden px-6 py-8">
        <HomeVoiceSection />
      </section>

      {/* Specialties Section */}
      <section className="py-12 px-6 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-slate-900">{isBn ? 'বিশেষত্ব দেখুন' : 'Browse by Specialty'}</h2>
              <p className="text-slate-500 mt-1">{isBn ? 'আপনার প্রয়োজন অনুযায়ী ডাক্তার খুঁজুন' : 'Find doctors by your needs'}</p>
            </div>
            <button
              onClick={() => navigate('/search')}
              className="text-blue-600 font-semibold hover:text-blue-700 transition flex items-center gap-2"
            >
              {isBn ? 'সব দেখুন' : 'View All'} <i className="fas fa-arrow-right"></i>
            </button>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-10 gap-2">
            {specialties.map(spec => (
              <SpecialtyCard
                key={spec.name}
                {...spec}
                count={specialtyCounts[spec.name] || 0}
                onClick={() => navigate(`/search?specialty=${encodeURIComponent(spec.name)}`)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-white mb-4">{isBn ? 'কেন নির্ণয়?' : 'Why Nirnoy?'}</h2>
            <p className="text-slate-400">{isBn ? 'আধুনিক স্বাস্থ্যসেবার জন্য আধুনিক সমাধান' : 'Modern solutions for modern healthcare'}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: 'fa-microphone-alt', title: isBn ? 'ভয়েস বুকিং' : 'Voice Booking', desc: isBn ? 'বাংলায় কথা বলে অ্যাপয়েন্টমেন্ট নিন' : 'Book appointments by speaking in Bangla', color: 'from-blue-500 to-indigo-500' },
              { icon: 'fa-users', title: isBn ? 'পারিবারিক স্বাস্থ্য' : 'Family Health', desc: isBn ? 'পুরো পরিবারের স্বাস্থ্য এক জায়গায়' : 'Manage your entire family health', color: 'from-pink-500 to-rose-500' },
              { icon: 'fa-clipboard-list', title: isBn ? 'চিকিৎসা ইতিহাস' : 'Treatment History', desc: isBn ? 'পরিবারের চিকিৎসা আর হারাবেন না' : 'Never lose track of your family\'s treatment again', color: 'from-green-500 to-emerald-500' },
              { icon: 'fa-brain', title: isBn ? 'AI হেলথ ব্রেইন' : 'AI Health Brain', desc: isBn ? 'আপনার স্বাস্থ্যের সম্পূর্ণ চিত্র' : 'Complete picture of your health', color: 'from-amber-500 to-orange-500' },
              { icon: 'fa-clock', title: isBn ? 'লাইভ কিউ' : 'Live Queue', desc: isBn ? 'রিয়েল-টাইম সিরিয়াল ট্র্যাকিং' : 'Real-time serial tracking', color: 'from-blue-500 to-indigo-500' },
              { icon: 'fa-file-medical', title: isBn ? 'ডিজিটাল রেকর্ড' : 'Digital Records', desc: isBn ? 'সব রিপোর্ট ও প্রেসক্রিপশন এক জায়গায়' : 'All reports & prescriptions in one place', color: 'from-purple-500 to-violet-500' },
              { icon: 'fa-bell', title: isBn ? 'স্মার্ট এলার্ট' : 'Smart Alerts', desc: isBn ? 'SMS ও পুশ নোটিফিকেশন' : 'SMS & push notifications', color: 'from-indigo-500 to-purple-500' },
            ].map((feature, i) => (
              <div key={i} className="bg-white/5 backdrop-blur rounded-2xl p-6 border border-white/10 hover:border-white/20 transition group">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
                  <i className={`fas ${feature.icon} text-white text-lg`}></i>
                </div>
                <h3 className="font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-6">
            {isBn ? 'আজই শুরু করুন' : 'Get Started Today'}
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            {isBn 
              ? 'বিনামূল্যে অ্যাকাউন্ট খুলুন এবং বাংলাদেশের সেরা ডাক্তারদের সাথে যুক্ত হন।'
              : 'Create a free account and connect with the best doctors in Bangladesh.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/patient-auth')}
              className="px-8 py-4 bg-white text-blue-600 font-bold rounded-2xl hover:bg-blue-50 transition shadow-xl"
            >
              {isBn ? 'রোগী হিসেবে যোগ দিন' : 'Join as Patient'}
            </button>
            <button
              onClick={() => navigate('/doctor-registration')}
              className="px-8 py-4 bg-white/10 text-white font-bold rounded-2xl hover:bg-white/20 transition border border-white/30"
            >
              {isBn ? 'ডাক্তার হিসেবে যোগ দিন' : 'Join as Doctor'}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-black">ন</span>
              </div>
              <div>
                <span className="font-black text-white">{t('brand.name')}</span>
                <span className="text-slate-400 text-sm block">{t('brand.tagline')}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-6 justify-center">
              <button onClick={() => navigate('/about')} className="text-slate-400 hover:text-white transition text-sm">{t('footer.about')}</button>
              <button onClick={() => navigate('/pricing')} className="text-slate-400 hover:text-white transition text-sm">{isBn ? 'মূল্য' : 'Pricing'}</button>
              <button onClick={() => navigate('/help')} className="text-slate-400 hover:text-white transition text-sm">{isBn ? 'সাহায্য' : 'Help'}</button>
              <button onClick={() => navigate('/free-care')} className="text-slate-400 hover:text-white transition text-sm">{isBn ? 'ফ্রি কেয়ার' : 'Free Care'}</button>
              <button onClick={() => navigate('/privacy')} className="text-slate-400 hover:text-white transition text-sm">{t('footer.privacy')}</button>
              <a href="mailto:hello@nirnoy.ai" className="text-slate-400 hover:text-white transition text-sm">{t('footer.contact')}</a>
            </div>
            
            <p className="text-slate-500 text-sm">{t('footer.copyright')}</p>
          </div>
        </div>
      </footer>

      {/* Dev Login Panel */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-4 w-56 border border-slate-700">
            <p className="text-xs font-bold text-yellow-400 mb-3 flex items-center gap-2">
              <i className="fas fa-code"></i> Dev Mode
            </p>
            <div className="space-y-2">
              <button onClick={() => navigate("/patient-auth")} className="w-full py-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl text-sm font-bold">
                Patient Login
              </button>
              <button onClick={() => navigate("/doctor-registration")} className="w-full py-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl text-sm font-bold">
                Doctor Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;

