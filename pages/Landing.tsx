import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { UserRole } from '../types';
import { MOCK_DOCTORS } from '../data/mockData';
import HomeVoiceSection from '../components/HomeVoiceSection';

// ============ DEV LOGIN PANEL ============
const DevLoginPanel: React.FC<{ onDevLogin: (role: UserRole) => void }> = ({ onDevLogin }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-5 w-64 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold flex items-center gap-2">
              <i className="fas fa-code text-yellow-400"></i> Dev Mode
            </span>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition" aria-label="Close">
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="space-y-2">
            <button onClick={() => onDevLogin(UserRole.PATIENT)} className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg">
              <i className="fas fa-user"></i> Patient Login
            </button>
            <button onClick={() => onDevLogin(UserRole.DOCTOR)} className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg">
              <i className="fas fa-user-md"></i> Doctor Login
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setIsOpen(true)} className="w-12 h-12 bg-slate-900 hover:bg-slate-800 text-yellow-400 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 border border-slate-700" title="Dev Login">
          <i className="fas fa-code"></i>
        </button>
      )}
    </div>
  );
};

// ============ ANIMATED COUNTER ============
const AnimatedCounter: React.FC<{ end: number; suffix?: string; duration?: number }> = ({ end, suffix = '', duration = 2000 }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime: number;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration]);
  
  return <>{count}{suffix}</>;
};

// ============ LANGUAGE TOGGLE ============
const LanguageToggle: React.FC = () => {
  const { language, toggleLanguage } = useLanguage();
  
  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-sm font-semibold group"
      title={language === 'en' ? 'Switch to বাংলা' : 'Switch to English'}
    >
      <span className={`transition-colors ${language === 'bn' ? 'text-blue-600' : 'text-slate-400'}`}>বাং</span>
      <div className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 ${language === 'bn' ? 'bg-blue-500' : 'bg-slate-300'}`}>
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${language === 'bn' ? 'translate-x-4' : 'translate-x-0'}`}></div>
      </div>
      <span className={`transition-colors ${language === 'en' ? 'text-blue-600' : 'text-slate-400'}`}>EN</span>
    </button>
  );
};

// ============ SPECIALTY CARD ============
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
      className="group relative bg-white rounded-2xl p-5 border border-slate-100 hover:border-transparent hover:shadow-xl transition-all duration-300 overflow-hidden"
    >
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(135deg, ${color}08, ${color}03)` }}
      />
      
      <div className="relative z-10">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
          style={{ backgroundColor: `${color}15` }}
        >
          <i className={`fas ${icon} text-lg`} style={{ color }}></i>
        </div>
        
        <h3 className="font-bold text-slate-800 mb-1 text-sm group-hover:text-slate-900 transition">
          {language === 'bn' ? nameBn : name}
        </h3>
        <p className="text-xs text-slate-400">
          {count} {language === 'bn' ? 'ডাক্তার' : 'doctors'}
        </p>
      </div>
    </button>
  );
};

// ============ MAIN LANDING PAGE ============
interface LandingProps {
  onDevLogin?: (role: UserRole) => void;
}

export const Landing: React.FC<LandingProps> = ({ onDevLogin }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [searchQuery, setSearchQuery] = useState('');

  // Stats
  const totalDoctors = MOCK_DOCTORS.length;
  const specialtyCounts: Record<string, number> = {};
  MOCK_DOCTORS.forEach(d => d.specialties.forEach(s => { specialtyCounts[s] = (specialtyCounts[s] || 0) + 1; }));
  const totalSpecialties = Object.keys(specialtyCounts).length;

  // Specialties with metadata
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

  const handleSpecialtyClick = (specialty: string) => {
    navigate(`/search?specialty=${encodeURIComponent(specialty)}`);
  };

  const handleDevLogin = (role: UserRole) => {
    if (onDevLogin) {
      onDevLogin(role);
    } else {
      localStorage.setItem('nirnoy_role', role);
      navigate(role === UserRole.PATIENT ? '/patient-dashboard' : '/doctor-dashboard');
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans antialiased overflow-x-hidden">
      
      {/* ============ HEADER ============ */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <span className="text-white font-black text-lg">ন</span>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <div className="leading-tight">
              <span className="font-black text-slate-900 text-lg tracking-tight">Nirnoy</span>
              <span className="text-[10px] text-blue-600 font-semibold block -mt-0.5 tracking-widest uppercase">Health Synchronized</span>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => navigate('/search')} className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition">
              {isBn ? 'ডাক্তার' : 'Doctors'}
            </button>
            <button onClick={() => navigate('/my-appointments')} className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition">
              {isBn ? 'অ্যাপয়েন্টমেন্ট' : 'Appointments'}
            </button>
            <button onClick={() => navigate('/about')} className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition">
              {isBn ? 'সম্পর্কে' : 'About'}
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            <button onClick={() => navigate('/login')} className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition">
              {isBn ? 'লগইন' : 'Login'}
            </button>
            <button onClick={() => navigate('/patient-auth')} className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-bold rounded-xl hover:from-blue-600 hover:to-indigo-600 transition shadow-lg shadow-blue-500/25">
              {isBn ? 'শুরু করুন' : 'Get Started'}
            </button>
          </div>
        </div>
      </header>

      {/* ============ HERO SECTION ============ */}
      <section className="relative pt-32 pb-16 px-6 overflow-hidden">
        {/* High-tech background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-3xl"></div>
          <div className="absolute top-40 right-20 w-[400px] h-[400px] bg-indigo-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-1/3 w-[300px] h-[300px] bg-cyan-400/10 rounded-full blur-3xl"></div>
          
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-full mb-8">
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold border-2 border-white">ন</div>
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] border-2 border-white"><i className="fas fa-check"></i></div>
              </div>
              <span className="text-sm font-bold text-blue-700">
                <AnimatedCounter end={totalDoctors} suffix="+" /> {isBn ? 'ভেরিফাইড ডাক্তার' : 'Verified Doctors'}
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 mb-6 leading-[1.05] tracking-tight">
              {isBn ? (
                <>
                  বাংলাদেশের
                  <span className="relative mx-3 inline-block">
                    <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">স্মার্ট</span>
                    <svg className="absolute -bottom-2 left-0 w-full h-3" viewBox="0 0 200 12" fill="none">
                      <path d="M2 10C50 2 150 2 198 10" stroke="url(#gradient)" strokeWidth="4" strokeLinecap="round"/>
                      <defs>
                        <linearGradient id="gradient" x1="0" y1="0" x2="200" y2="0">
                          <stop stopColor="#3b82f6"/>
                          <stop offset="1" stopColor="#8b5cf6"/>
                        </linearGradient>
                      </defs>
                    </svg>
                  </span>
                  <br/>হেলথকেয়ার
                </>
              ) : (
                <>
                  Bangladesh's
                  <span className="relative mx-3 inline-block">
                    <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">Smart</span>
                    <svg className="absolute -bottom-2 left-0 w-full h-3" viewBox="0 0 200 12" fill="none">
                      <path d="M2 10C50 2 150 2 198 10" stroke="url(#gradient2)" strokeWidth="4" strokeLinecap="round"/>
                      <defs>
                        <linearGradient id="gradient2" x1="0" y1="0" x2="200" y2="0">
                          <stop stopColor="#3b82f6"/>
                          <stop offset="1" stopColor="#8b5cf6"/>
                        </linearGradient>
                      </defs>
                    </svg>
                  </span>
                  <br/>Healthcare
                </>
              )}
            </h1>
            
            <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              {isBn 
                ? 'ঢাকার সেরা ডাক্তার খুঁজুন, ভয়েসে অ্যাপয়েন্টমেন্ট নিন, লাইভ কিউ ট্র্যাক করুন — সব AI দিয়ে।' 
                : 'Find the best doctors in Dhaka, book by voice, track live queue — all powered by AI.'}
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-10">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur-xl opacity-20"></div>
                <div className="relative bg-white rounded-2xl p-2 shadow-2xl shadow-slate-200/50 border border-slate-100 flex">
                  <div className="flex items-center flex-1 px-4">
                    <i className="fas fa-search text-slate-400 mr-3 text-lg"></i>
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={isBn ? 'ডাক্তার, বিশেষত্ব বা হাসপাতাল খুঁজুন...' : 'Search doctor, specialty or hospital...'}
                      className="flex-1 bg-transparent outline-none text-slate-800 placeholder:text-slate-400 py-3 text-lg"
                    />
                  </div>
                  <button type="submit" className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-600 transition shadow-lg text-lg">
                    {isBn ? 'খুঁজুন' : 'Search'}
                  </button>
                </div>
              </div>
            </form>

            {/* Quick Stats */}
            <div className="flex items-center justify-center gap-8 md:gap-16">
              {[
                { value: totalDoctors, suffix: '+', label: isBn ? 'ডাক্তার' : 'Doctors' },
                { value: totalSpecialties, suffix: '+', label: isBn ? 'বিশেষত্ব' : 'Specialties' },
                { value: 10000, suffix: '+', label: isBn ? 'রোগী' : 'Patients' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <p className="text-3xl md:text-4xl font-black text-slate-800">
                    <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ SPECIALTIES SECTION ============ */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-blue-600 font-bold text-sm uppercase tracking-wider mb-2">
                {isBn ? 'বিশেষত্ব' : 'Specialties'}
              </p>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900">
                {isBn ? 'বিশেষত্ব অনুযায়ী খুঁজুন' : 'Browse by Specialty'}
              </h2>
            </div>
            <button 
              onClick={() => navigate('/search')}
              className="hidden md:flex items-center gap-2 text-blue-600 font-bold hover:text-blue-700 transition group"
            >
              {isBn ? 'সব দেখুন' : 'View All'}
              <i className="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {specialties.map((spec) => (
              <SpecialtyCard
                key={spec.name}
                name={spec.name}
                nameBn={spec.nameBn}
                icon={spec.icon}
                color={spec.color}
                count={specialtyCounts[spec.name] || 0}
                onClick={() => handleSpecialtyClick(spec.name)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ============ VOICE SECTION ============ */}
      <HomeVoiceSection />

      {/* ============ NIRNOY VISION SECTION ============ */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-blue-600 font-bold text-sm uppercase tracking-wider mb-3">
              {isBn ? 'নির্ণয়ের দর্শন' : 'The Nirnoy Vision'}
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">
              {isBn ? 'স্বাস্থ্যসেবার নতুন যুগ' : 'A New Era of Healthcare'}
            </h2>
          </div>

          {/* Vision Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              { 
                icon: 'fa-network-wired', 
                title: isBn ? 'স্বাস্থ্য সিঙ্ক্রোনাইজড' : 'Health Synchronized',
                desc: isBn ? 'আপনার সব স্বাস্থ্য তথ্য এক জায়গায় — ডাক্তার, রিপোর্ট, প্রেসক্রিপশন, ইতিহাস।' : 'All your health data in one place — doctors, reports, prescriptions, history.',
                gradient: 'from-blue-500 to-indigo-600'
              },
              { 
                icon: 'fa-brain', 
                title: isBn ? 'AI-পাওয়ার্ড' : 'AI-Powered',
                desc: isBn ? 'Nree, আমাদের ২৪/৭ AI সহকারী, বাংলায় কথা বলে আপনাকে সাহায্য করে।' : 'Nree, our 24/7 AI assistant, helps you in Bangla.',
                gradient: 'from-purple-500 to-pink-600'
              },
              { 
                icon: 'fa-users', 
                title: isBn ? 'সবার জন্য' : 'For Everyone',
                desc: isBn ? 'সহজ, সাশ্রয়ী, এবং সবার জন্য সহজলভ্য স্বাস্থ্যসেবা।' : 'Simple, affordable, and accessible healthcare for all.',
                gradient: 'from-green-500 to-emerald-600'
              },
            ].map((vision, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 border border-slate-100 shadow-lg hover:shadow-xl transition-all duration-300 group">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${vision.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <i className={`fas ${vision.icon} text-2xl text-white`}></i>
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-3">{vision.title}</h3>
                <p className="text-slate-600 leading-relaxed">{vision.desc}</p>
              </div>
            ))}
          </div>

          {/* Core Values */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-12 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10">
              <div className="text-center mb-10">
                <h3 className="text-2xl md:text-3xl font-black mb-3">
                  {isBn ? 'আমাদের মূল্যবোধ' : 'Our Core Values'}
                </h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: 'fa-heart', title: isBn ? 'সহানুভূতি' : 'Empathy', color: 'from-red-400 to-pink-500' },
                  { icon: 'fa-shield-alt', title: isBn ? 'নিরাপত্তা' : 'Security', color: 'from-blue-400 to-cyan-500' },
                  { icon: 'fa-lightbulb', title: isBn ? 'নবাচার' : 'Innovation', color: 'from-yellow-400 to-orange-500' },
                  { icon: 'fa-handshake', title: isBn ? 'বিশ্বাস' : 'Trust', color: 'from-green-400 to-emerald-500' },
                ].map((value, i) => (
                  <div key={i} className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${value.color} flex items-center justify-center mb-4`}>
                      <i className={`fas ${value.icon} text-xl text-white`}></i>
                    </div>
                    <h4 className="font-bold text-lg">{value.title}</h4>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FEATURES SECTION ============ */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">
              {isBn ? 'কেন নির্ণয়?' : 'Why Nirnoy?'}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: 'fa-microphone', title: isBn ? 'ভয়েস বুকিং' : 'Voice Booking', desc: isBn ? 'বাংলায় কথা বলে অ্যাপয়েন্টমেন্ট নিন' : 'Book appointments by speaking Bangla', gradient: 'from-blue-400 to-cyan-400' },
              { icon: 'fa-clock', title: isBn ? 'লাইভ কিউ' : 'Live Queue', desc: isBn ? 'রিয়েল-টাইম সিরিয়াল ট্র্যাকিং' : 'Real-time serial tracking', gradient: 'from-green-400 to-emerald-400' },
              { icon: 'fa-file-medical', title: isBn ? 'ডিজিটাল রেকর্ড' : 'Digital Records', desc: isBn ? 'সব রিপোর্ট ও প্রেসক্রিপশন এক জায়গায়' : 'All reports in one place', gradient: 'from-purple-400 to-pink-400' },
              { icon: 'fa-robot', title: isBn ? 'AI সহায়তা' : 'AI Assistant', desc: isBn ? '২৪/৭ স্বাস্থ্য সহায়ক' : '24/7 health assistant', gradient: 'from-orange-400 to-red-400' },
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 border border-slate-100 hover:shadow-xl hover:border-slate-200 transition-all duration-300 group">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <i className={`fas ${f.icon} text-xl text-white`}></i>
                </div>
                <h3 className="font-bold text-xl mb-3">{f.title}</h3>
                <p className="text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA SECTION ============ */}
      <section className="py-20 px-6 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-40 h-40 border border-white/30 rounded-full"></div>
          <div className="absolute bottom-10 right-10 w-60 h-60 border border-white/20 rounded-full"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-black mb-6">
            {isBn ? 'আজই শুরু করুন' : 'Start Today'}
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            {isBn 
              ? 'বিনামূল্যে অ্যাকাউন্ট খুলুন এবং বাংলাদেশের সেরা ডাক্তারদের সাথে যুক্ত হন।' 
              : 'Create a free account and connect with the best doctors in Bangladesh.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/patient-auth')}
              className="px-10 py-5 bg-white text-blue-600 font-black text-lg rounded-2xl hover:bg-slate-100 transition shadow-2xl"
            >
              <i className="fas fa-user mr-2"></i>
              {isBn ? 'রোগী হিসেবে যোগ দিন' : 'Join as Patient'}
            </button>
            <button
              onClick={() => navigate('/doctor-registration')}
              className="px-10 py-5 bg-white/10 border-2 border-white/30 text-white font-bold text-lg rounded-2xl hover:bg-white/20 transition"
            >
              <i className="fas fa-user-md mr-2"></i>
              {isBn ? 'ডাক্তার হিসেবে যোগ দিন' : 'Join as Doctor'}
            </button>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="py-16 px-6 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-black text-xl">ন</span>
                </div>
                <div>
                  <span className="font-black text-xl block">Nirnoy</span>
                  <span className="text-xs text-slate-400">Health Synchronized</span>
                </div>
              </div>
              <p className="text-slate-400 leading-relaxed text-sm">
                {isBn ? 'বাংলাদেশের প্রথম AI-পাওয়ার্ড হেলথকেয়ার প্ল্যাটফর্ম।' : "Bangladesh's first AI-powered healthcare platform."}
              </p>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">{isBn ? 'প্ল্যাটফর্ম' : 'Platform'}</h4>
              <div className="space-y-4">
                <button onClick={() => navigate('/search')} className="block text-slate-400 hover:text-white transition text-sm">{isBn ? 'ডাক্তার খুঁজুন' : 'Find Doctors'}</button>
                <button onClick={() => navigate('/my-appointments')} className="block text-slate-400 hover:text-white transition text-sm">{isBn ? 'অ্যাপয়েন্টমেন্ট' : 'Appointments'}</button>
                <button onClick={() => navigate('/my-health')} className="block text-slate-400 hover:text-white transition text-sm">{isBn ? 'হেলথ রেকর্ড' : 'Health Records'}</button>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">{isBn ? 'কোম্পানি' : 'Company'}</h4>
              <div className="space-y-4">
                <button onClick={() => navigate('/about')} className="block text-slate-400 hover:text-white transition text-sm">{isBn ? 'আমাদের সম্পর্কে' : 'About Us'}</button>
                <button className="block text-slate-400 hover:text-white transition text-sm">{isBn ? 'ক্যারিয়ার' : 'Careers'}</button>
                <button onClick={() => navigate('/privacy')} className="block text-slate-400 hover:text-white transition text-sm">{isBn ? 'গোপনীয়তা' : 'Privacy'}</button>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6">{isBn ? 'যোগাযোগ' : 'Contact'}</h4>
              <div className="space-y-4 text-slate-400 text-sm">
                <p><i className="fas fa-envelope mr-3 text-blue-400"></i>hello@nirnoy.care</p>
                <p><i className="fas fa-phone mr-3 text-blue-400"></i>+880 1XXX-XXXXXX</p>
                <p><i className="fas fa-map-marker-alt mr-3 text-blue-400"></i>Dhaka, Bangladesh</p>
              </div>
              <div className="flex gap-3 mt-6">
                <a href="#" className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-blue-500 transition" aria-label="Facebook">
                  <i className="fab fa-facebook-f"></i>
                </a>
                <a href="#" className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-red-500 transition" aria-label="YouTube">
                  <i className="fab fa-youtube"></i>
                </a>
                <a href="#" className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-pink-500 transition" aria-label="Instagram">
                  <i className="fab fa-instagram"></i>
                </a>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm">
              &copy; {new Date().getFullYear()} Nirnoy Care. {isBn ? 'সর্বস্বত্ব সংরক্ষিত' : 'All rights reserved'}.
            </p>
            <div className="flex gap-6 text-sm text-slate-500">
              <button onClick={() => navigate('/privacy')} className="hover:text-white transition">{isBn ? 'গোপনীয়তা নীতি' : 'Privacy Policy'}</button>
              <button className="hover:text-white transition">{isBn ? 'শর্তাবলী' : 'Terms of Service'}</button>
            </div>
          </div>
        </div>
      </footer>

      <DevLoginPanel onDevLogin={handleDevLogin} />
    </div>
  );
};

export default Landing;
