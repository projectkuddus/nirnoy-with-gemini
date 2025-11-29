import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { UserRole } from '../types';
import { MOCK_DOCTORS } from '../data/mockData';
import Navbar from '../components/Navbar';
import HomeVoiceSection from '../components/HomeVoiceSection';

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
      className="group flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-md transition-all duration-200"
    >
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
        style={{ backgroundColor: `${color}15` }}
      >
        <i className={`fas ${icon} text-base`} style={{ color }}></i>
      </div>
      <div className="text-left min-w-0">
        <h3 className="font-semibold text-slate-800 text-sm truncate">{language === 'bn' ? nameBn : name}</h3>
        <p className="text-xs text-slate-400">{count} {language === 'bn' ? 'ডাক্তার' : 'doctors'}</p>
      </div>
    </button>
  );
};

interface LandingProps {
  onLogin: (role: UserRole) => void;
  userRole: UserRole;
  onLogout: () => void;
}

export const Landing: React.FC<LandingProps> = ({ onLogin, userRole, onLogout }) => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const isBn = language === 'bn';

  const totalDoctors = MOCK_DOCTORS.length;
  const specialtyCounts: Record<string, number> = {};
  MOCK_DOCTORS.forEach(d => d.specialties.forEach(s => { specialtyCounts[s] = (specialtyCounts[s] || 0) + 1; }));

  const specialties = [
    { name: 'Internal Medicine', nameBn: 'মেডিসিন', icon: 'fa-stethoscope', color: '#3b82f6' },
    { name: 'Cardiology', nameBn: 'হৃদরোগ', icon: 'fa-heartbeat', color: '#ef4444' },
    { name: 'Gynaecology & Obstetrics', nameBn: 'স্ত্রীরোগ', icon: 'fa-venus', color: '#ec4899' },
    { name: 'Paediatrics', nameBn: 'শিশুরোগ', icon: 'fa-baby', color: '#06b6d4' },
    { name: 'Orthopedics', nameBn: 'হাড় ও জোড়া', icon: 'fa-bone', color: '#f97316' },
    { name: 'Dermatology', nameBn: 'চর্মরোগ', icon: 'fa-allergies', color: '#8b5cf6' },
    { name: 'ENT', nameBn: 'নাক-কান-গলা', icon: 'fa-head-side-cough', color: '#14b8a6' },
    { name: 'Eye (Ophthalmology)', nameBn: 'চক্ষু', icon: 'fa-eye', color: '#6366f1' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar userRole={userRole} onLogout={onLogout} />

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
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
                  <p className="text-3xl font-black text-green-600">24/7</p>
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

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3">
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
              { icon: 'fa-brain', title: isBn ? 'AI হেলথ ব্রেইন' : 'AI Health Brain', desc: isBn ? 'আপনার স্বাস্থ্যের সম্পূর্ণ চিত্র' : 'Complete picture of your health', color: 'from-amber-500 to-orange-500' },
              { icon: 'fa-clock', title: isBn ? 'লাইভ কিউ' : 'Live Queue', desc: isBn ? 'রিয়েল-টাইম সিরিয়াল ট্র্যাকিং' : 'Real-time serial tracking', color: 'from-green-500 to-emerald-500' },
              { icon: 'fa-file-medical', title: isBn ? 'ডিজিটাল রেকর্ড' : 'Digital Records', desc: isBn ? 'সব রিপোর্ট ও প্রেসক্রিপশন এক জায়গায়' : 'All reports & prescriptions in one place', color: 'from-purple-500 to-violet-500' },
              { icon: 'fa-bell', title: isBn ? 'স্মার্ট এলার্ট' : 'Smart Alerts', desc: isBn ? 'SMS ও পুশ নোটিফিকেশন' : 'SMS & push notifications', color: 'from-cyan-500 to-teal-500' },
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
              <button onClick={() => onLogin(UserRole.PATIENT)} className="w-full py-2 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl text-sm font-bold">
                Patient Login
              </button>
              <button onClick={() => onLogin(UserRole.DOCTOR)} className="w-full py-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl text-sm font-bold">
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

