import React, { useState } from 'react';
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
            <button onClick={() => onDevLogin(UserRole.PATIENT)} className="w-full py-3 bg-teal-500 hover:bg-teal-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition">
              <i className="fas fa-user"></i> Patient Login
            </button>
            <button onClick={() => onDevLogin(UserRole.DOCTOR)} className="w-full py-3 bg-blue-500 hover:bg-blue-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition">
              <i className="fas fa-user-md"></i> Doctor Login
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setIsOpen(true)} className="w-12 h-12 bg-slate-900 hover:bg-slate-800 text-yellow-400 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105 border border-slate-700" title="Dev Login">
          <i className="fas fa-code"></i>
        </button>
      )}
    </div>
  );
};

// ============ FEATURED DOCTORS CAROUSEL ============
const FeaturedDoctors: React.FC = () => {
  const navigate = useNavigate();
  const featured = MOCK_DOCTORS.slice(0, 6);
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {featured.map((doc) => (
        <button
          key={doc.id}
          onClick={() => navigate(`/doctor/${doc.id}`)}
          className="bg-white rounded-2xl p-4 border border-slate-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 text-left group"
        >
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center overflow-hidden">
            {doc.profileImage ? (
              <img src={doc.profileImage} alt={doc.name} className="w-full h-full object-cover" />
            ) : (
              <i className="fas fa-user-md text-2xl text-blue-400"></i>
            )}
          </div>
          <h4 className="font-bold text-slate-800 text-sm text-center truncate group-hover:text-blue-600 transition">
            {doc.name.replace('Dr. ', '')}
          </h4>
          <p className="text-xs text-slate-500 text-center truncate">{doc.specialties[0]}</p>
          <div className="mt-2 flex items-center justify-center gap-1">
            <i className="fas fa-star text-amber-400 text-xs"></i>
            <span className="text-xs text-slate-600">{doc.rating}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

// ============ SPECIALTY GRID ============
const SpecialtyGrid: React.FC = () => {
  const navigate = useNavigate();
  const specialties = [
    { name: 'Medicine', bn: 'মেডিসিন', icon: 'fa-stethoscope', color: 'blue' },
    { name: 'Cardiology', bn: 'হৃদরোগ', icon: 'fa-heartbeat', color: 'red' },
    { name: 'Gynaecology', bn: 'স্ত্রীরোগ', icon: 'fa-venus', color: 'pink' },
    { name: 'Paediatrics', bn: 'শিশুরোগ', icon: 'fa-baby', color: 'cyan' },
    { name: 'Orthopedics', bn: 'হাড়', icon: 'fa-bone', color: 'orange' },
    { name: 'Dermatology', bn: 'চর্ম', icon: 'fa-allergies', color: 'purple' },
    { name: 'ENT', bn: 'নাক-কান-গলা', icon: 'fa-head-side-cough', color: 'teal' },
    { name: 'Eye', bn: 'চোখ', icon: 'fa-eye', color: 'indigo' },
  ];

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
    red: 'bg-red-50 text-red-600 group-hover:bg-red-100',
    pink: 'bg-pink-50 text-pink-600 group-hover:bg-pink-100',
    cyan: 'bg-cyan-50 text-cyan-600 group-hover:bg-cyan-100',
    orange: 'bg-orange-50 text-orange-600 group-hover:bg-orange-100',
    purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-100',
    teal: 'bg-teal-50 text-teal-600 group-hover:bg-teal-100',
    indigo: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100',
  };

  return (
    <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
      {specialties.map((spec) => (
        <button
          key={spec.name}
          onClick={() => navigate('/search')}
          className="group p-4 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all duration-300 text-center"
        >
          <div className={`w-12 h-12 mx-auto mb-2 rounded-xl flex items-center justify-center transition ${colorClasses[spec.color]}`}>
            <i className={`fas ${spec.icon}`}></i>
          </div>
          <p className="text-xs font-medium text-slate-700 truncate">{spec.bn}</p>
        </button>
      ))}
    </div>
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

  const totalDoctors = MOCK_DOCTORS.length;
  const totalSpecialties = [...new Set(MOCK_DOCTORS.flatMap(d => d.specialties))].length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/search');
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
    <div className="min-h-screen bg-slate-50 font-sans antialiased">
      
      {/* ============ HEADER ============ */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-white font-black text-lg">ন</span>
            </div>
            <div className="leading-tight">
              <span className="font-black text-slate-900 text-lg">Nirnoy</span>
              <span className="text-[10px] text-slate-400 block -mt-0.5 tracking-wider uppercase">Health Synchronized</span>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => navigate('/search')} className="text-sm font-medium text-slate-600 hover:text-blue-600 transition">
              {isBn ? 'ডাক্তার' : 'Doctors'}
            </button>
            <button onClick={() => navigate('/my-appointments')} className="text-sm font-medium text-slate-600 hover:text-blue-600 transition">
              {isBn ? 'অ্যাপয়েন্টমেন্ট' : 'Appointments'}
            </button>
            <button onClick={() => navigate('/my-health')} className="text-sm font-medium text-slate-600 hover:text-blue-600 transition">
              {isBn ? 'আমার স্বাস্থ্য' : 'My Health'}
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition">
              {isBn ? 'লগইন' : 'Login'}
            </button>
            <button onClick={() => navigate('/patient-auth')} className="px-5 py-2.5 bg-blue-500 text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition shadow-lg shadow-blue-500/20">
              {isBn ? 'শুরু করুন' : 'Get Started'}
            </button>
          </div>
        </div>
      </header>

      {/* ============ HERO SECTION ============ */}
      <section className="pt-24 pb-16 px-6 bg-gradient-to-b from-white via-white to-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-8">
            {/* Left Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full mb-6">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-blue-700">
                  {totalDoctors}+ ডাক্তার • {totalSpecialties}+ বিশেষত্ব
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 mb-6 leading-[1.1]">
                {isBn ? (
                  <>বাংলাদেশের<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">স্মার্ট হেলথকেয়ার</span></>
                ) : (
                  <>Bangladesh's<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Smart Healthcare</span></>
                )}
              </h1>
              
              <p className="text-lg text-slate-600 mb-8 max-w-lg leading-relaxed">
                {isBn 
                  ? 'ঢাকার সেরা ডাক্তারদের খুঁজুন, অ্যাপয়েন্টমেন্ট বুক করুন, লাইভ কিউ ট্র্যাক করুন — সব এক জায়গায়।' 
                  : 'Find the best doctors in Dhaka, book appointments, track live queue — all in one place.'}
              </p>

              {/* Search */}
              <form onSubmit={handleSearch} className="mb-6">
                <div className="flex items-center bg-white border-2 border-slate-200 rounded-2xl p-2 focus-within:border-blue-400 focus-within:shadow-lg focus-within:shadow-blue-500/10 transition-all">
                  <div className="flex items-center flex-1 px-4">
                    <i className="fas fa-search text-slate-400 mr-3"></i>
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={isBn ? 'ডাক্তার, বিশেষত্ব বা হাসপাতাল খুঁজুন...' : 'Search doctor, specialty or hospital...'}
                      className="flex-1 bg-transparent outline-none text-slate-800 placeholder:text-slate-400 py-2"
                    />
                  </div>
                  <button type="submit" className="px-8 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition shadow-lg shadow-blue-500/20">
                    {isBn ? 'খুঁজুন' : 'Search'}
                  </button>
                </div>
              </form>

              {/* Quick Stats */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <i className="fas fa-check-circle text-green-600"></i>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">১০,০০০+</p>
                    <p className="text-xs text-slate-500">সন্তুষ্ট রোগী</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <i className="fas fa-clock text-blue-600"></i>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">২৪/৭</p>
                    <p className="text-xs text-slate-500">সার্ভিস চালু</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <i className="fas fa-star text-amber-600"></i>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">৪.৯</p>
                    <p className="text-xs text-slate-500">গড় রেটিং</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Hero Image/Graphic */}
            <div className="hidden lg:block relative">
              <div className="relative w-full aspect-square max-w-lg mx-auto">
                {/* Background circles */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-cyan-50 rounded-full opacity-50"></div>
                <div className="absolute inset-8 bg-gradient-to-br from-blue-50 to-white rounded-full"></div>
                
                {/* Center content */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/30 rotate-3">
                      <span className="text-white font-black text-5xl">ন</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800">NIRNOY</h3>
                    <p className="text-sm text-slate-500">Health Synchronized</p>
                  </div>
                </div>

                {/* Floating elements */}
                <div className="absolute top-8 right-8 w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center animate-bounce" style={{ animationDuration: '3s' }}>
                  <i className="fas fa-user-md text-2xl text-blue-500"></i>
                </div>
                <div className="absolute bottom-16 left-4 w-14 h-14 bg-white rounded-2xl shadow-xl flex items-center justify-center animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>
                  <i className="fas fa-calendar-check text-xl text-green-500"></i>
                </div>
                <div className="absolute top-1/3 left-0 w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center animate-bounce" style={{ animationDuration: '2s', animationDelay: '1s' }}>
                  <i className="fas fa-heartbeat text-lg text-red-500"></i>
                </div>
                <div className="absolute bottom-8 right-16 w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center animate-bounce" style={{ animationDuration: '2.8s', animationDelay: '0.3s' }}>
                  <i className="fas fa-pills text-lg text-purple-500"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ SPECIALTY SECTION ============ */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-slate-900">{isBn ? 'বিশেষত্ব অনুযায়ী খুঁজুন' : 'Browse by Specialty'}</h2>
              <p className="text-slate-500 text-sm mt-1">{isBn ? 'আপনার প্রয়োজন অনুযায়ী ডাক্তার বেছে নিন' : 'Choose doctors based on your needs'}</p>
            </div>
            <button onClick={() => navigate('/search')} className="text-blue-600 font-semibold text-sm hover:text-blue-700 transition flex items-center gap-2">
              {isBn ? 'সব দেখুন' : 'View All'} <i className="fas fa-arrow-right"></i>
            </button>
          </div>
          <SpecialtyGrid />
        </div>
      </section>

      {/* ============ VOICE SECTION ============ */}
      <HomeVoiceSection />

      {/* ============ FEATURED DOCTORS ============ */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-slate-900">{isBn ? 'জনপ্রিয় ডাক্তার' : 'Popular Doctors'}</h2>
              <p className="text-slate-500 text-sm mt-1">{isBn ? 'সর্বাধিক রেটিং প্রাপ্ত ডাক্তারগণ' : 'Top rated doctors on our platform'}</p>
            </div>
            <button onClick={() => navigate('/search')} className="text-blue-600 font-semibold text-sm hover:text-blue-700 transition flex items-center gap-2">
              {isBn ? 'সব দেখুন' : 'View All'} <i className="fas fa-arrow-right"></i>
            </button>
          </div>
          <FeaturedDoctors />
        </div>
      </section>

      {/* ============ FEATURES SECTION ============ */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-slate-900 mb-3">{isBn ? 'কেন নির্ণয়?' : 'Why Nirnoy?'}</h2>
            <p className="text-slate-500 max-w-lg mx-auto">{isBn ? 'আধুনিক প্রযুক্তি দিয়ে স্বাস্থ্যসেবা সহজ করছি' : 'Making healthcare simple with modern technology'}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: 'fa-microphone', title: isBn ? 'ভয়েস বুকিং' : 'Voice Booking', desc: isBn ? 'বাংলায় কথা বলে অ্যাপয়েন্টমেন্ট নিন' : 'Book by speaking in Bangla', color: 'blue' },
              { icon: 'fa-clock', title: isBn ? 'লাইভ কিউ' : 'Live Queue', desc: isBn ? 'রিয়েল-টাইম সিরিয়াল ট্র্যাকিং' : 'Real-time serial tracking', color: 'green' },
              { icon: 'fa-file-medical', title: isBn ? 'ডিজিটাল রেকর্ড' : 'Digital Records', desc: isBn ? 'সব রিপোর্ট ও প্রেসক্রিপশন এক জায়গায়' : 'All reports in one place', color: 'purple' },
              { icon: 'fa-bell', title: isBn ? 'স্মার্ট এলার্ট' : 'Smart Alerts', desc: isBn ? 'SMS ও পুশ নোটিফিকেশন' : 'SMS & push notifications', color: 'orange' },
            ].map((f, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl border border-slate-100 hover:shadow-xl hover:border-slate-200 transition-all duration-300 group">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition ${
                  f.color === 'blue' ? 'bg-blue-100 text-blue-600 group-hover:bg-blue-500 group-hover:text-white' :
                  f.color === 'green' ? 'bg-green-100 text-green-600 group-hover:bg-green-500 group-hover:text-white' :
                  f.color === 'purple' ? 'bg-purple-100 text-purple-600 group-hover:bg-purple-500 group-hover:text-white' :
                  'bg-orange-100 text-orange-600 group-hover:bg-orange-500 group-hover:text-white'
                }`}>
                  <i className={`fas ${f.icon} text-xl`}></i>
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA SECTION ============ */}
      <section className="py-20 px-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* For Patients */}
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-full mb-5">
                <i className="fas fa-user text-blue-400"></i>
                <span className="text-sm font-medium text-blue-300">{isBn ? 'রোগীদের জন্য' : 'For Patients'}</span>
              </div>
              <h3 className="text-2xl font-black text-white mb-4">{isBn ? 'আজই শুরু করুন' : 'Start Today'}</h3>
              <p className="text-slate-400 mb-6">{isBn ? 'বিনামূল্যে অ্যাকাউন্ট খুলুন, ডাক্তার খুঁজুন, অ্যাপয়েন্টমেন্ট নিন।' : 'Create free account, find doctors, book appointments.'}</p>
              <button onClick={() => navigate('/patient-auth')} className="px-8 py-4 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition shadow-lg shadow-blue-500/30">
                {isBn ? 'অ্যাকাউন্ট খুলুন' : 'Create Account'}
              </button>
            </div>

            {/* For Doctors */}
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full mb-5">
                <i className="fas fa-user-md text-purple-400"></i>
                <span className="text-sm font-medium text-purple-300">{isBn ? 'ডাক্তারদের জন্য' : 'For Doctors'}</span>
              </div>
              <h3 className="text-2xl font-black text-white mb-4">{isBn ? 'প্র্যাকটিস ডিজিটাল করুন' : 'Digitize Practice'}</h3>
              <p className="text-slate-400 mb-6">{isBn ? 'AI কপাইলট, স্মার্ট কিউ, ডিজিটাল প্রেসক্রিপশন।' : 'AI copilot, smart queue, digital prescriptions.'}</p>
              <button onClick={() => navigate('/doctor-registration')} className="px-8 py-4 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition">
                {isBn ? 'রেজিস্টার করুন' : 'Register Now'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="py-16 px-6 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-black text-lg">ন</span>
                </div>
                <div>
                  <span className="font-black text-slate-900 block">Nirnoy</span>
                  <span className="text-xs text-slate-400">Health Synchronized</span>
                </div>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                {isBn ? 'বাংলাদেশের প্রথম AI-পাওয়ার্ড হেলথকেয়ার প্ল্যাটফর্ম।' : "Bangladesh's first AI-powered healthcare platform."}
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-bold text-slate-900 mb-4">{isBn ? 'প্ল্যাটফর্ম' : 'Platform'}</h4>
              <div className="space-y-3">
                <button onClick={() => navigate('/search')} className="block text-sm text-slate-500 hover:text-blue-600 transition">{isBn ? 'ডাক্তার খুঁজুন' : 'Find Doctors'}</button>
                <button onClick={() => navigate('/my-appointments')} className="block text-sm text-slate-500 hover:text-blue-600 transition">{isBn ? 'অ্যাপয়েন্টমেন্ট' : 'Appointments'}</button>
                <button onClick={() => navigate('/my-health')} className="block text-sm text-slate-500 hover:text-blue-600 transition">{isBn ? 'হেলথ রেকর্ড' : 'Health Records'}</button>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-4">{isBn ? 'কোম্পানি' : 'Company'}</h4>
              <div className="space-y-3">
                <button className="block text-sm text-slate-500 hover:text-blue-600 transition">{isBn ? 'আমাদের সম্পর্কে' : 'About Us'}</button>
                <button className="block text-sm text-slate-500 hover:text-blue-600 transition">{isBn ? 'যোগাযোগ' : 'Contact'}</button>
                <button className="block text-sm text-slate-500 hover:text-blue-600 transition">{isBn ? 'ক্যারিয়ার' : 'Careers'}</button>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-4">{isBn ? 'যোগাযোগ' : 'Contact'}</h4>
              <div className="space-y-3 text-sm text-slate-500">
                <p><i className="fas fa-envelope mr-2 text-blue-500"></i>hello@nirnoy.care</p>
                <p><i className="fas fa-phone mr-2 text-blue-500"></i>+880 1XXX-XXXXXX</p>
                <p><i className="fas fa-map-marker-alt mr-2 text-blue-500"></i>Dhaka, Bangladesh</p>
              </div>
              <div className="flex gap-3 mt-4">
                <a href="#" className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 hover:bg-blue-500 hover:text-white transition" aria-label="Facebook">
                  <i className="fab fa-facebook-f"></i>
                </a>
                <a href="#" className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 hover:bg-red-500 hover:text-white transition" aria-label="YouTube">
                  <i className="fab fa-youtube"></i>
                </a>
                <a href="#" className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 hover:bg-pink-500 hover:text-white transition" aria-label="Instagram">
                  <i className="fab fa-instagram"></i>
                </a>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-400">
              &copy; {new Date().getFullYear()} Nirnoy Care. {isBn ? 'সর্বস্বত্ব সংরক্ষিত' : 'All rights reserved'}.
            </p>
            <div className="flex gap-6 text-sm text-slate-400">
              <button className="hover:text-slate-600 transition">{isBn ? 'গোপনীয়তা নীতি' : 'Privacy Policy'}</button>
              <button className="hover:text-slate-600 transition">{isBn ? 'শর্তাবলী' : 'Terms of Service'}</button>
            </div>
          </div>
        </div>
      </footer>

      <DevLoginPanel onDevLogin={handleDevLogin} />
    </div>
  );
};

export default Landing;
