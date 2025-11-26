import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

// ============ FUTURISTIC VOICE AI SECTION ============
const VoiceAIHero: React.FC<{ onStartCall: (type: 'male' | 'female') => void; activeAgent: 'male' | 'female' | null }> = ({ onStartCall, activeAgent }) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  const [hoveredAgent, setHoveredAgent] = useState<'male' | 'female' | null>(null);

  // Get time-based greeting in Bangla
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'সুপ্রভাত';
    if (hour >= 12 && hour < 17) return 'শুভ দুপুর';
    if (hour >= 17 && hour < 20) return 'শুভ সন্ধ্যা';
    return 'শুভ রাত্রি';
  };

  return (
    <div className="relative">
      {/* Ambient Glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[500px] bg-gradient-to-br from-teal-500/20 via-cyan-500/10 to-purple-500/20 rounded-full blur-[100px] animate-pulse"></div>
      </div>

      <div className="relative z-10 text-center">
        {/* Greeting */}
        <div className="mb-6">
          <span className="text-lg text-slate-400 font-light">{getGreeting()}</span>
        </div>

        {/* Main Title */}
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">
          {isBn ? 'আপনার স্বাস্থ্য সহায়ক' : 'Your Health Assistant'}
        </h1>
        <p className="text-slate-400 text-lg md:text-xl max-w-lg mx-auto mb-12">
          {isBn 
            ? 'বাংলায় কথা বলুন, ডাক্তার খুঁজুন, অ্যাপয়েন্টমেন্ট নিন' 
            : 'Speak in Bangla, find doctors, book appointments'}
        </p>

        {/* Voice Agents */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
          {/* Male Agent - Yunus */}
          <button
            onClick={() => onStartCall('male')}
            onMouseEnter={() => setHoveredAgent('male')}
            onMouseLeave={() => setHoveredAgent(null)}
            disabled={activeAgent !== null}
            className={`group relative w-40 h-40 sm:w-48 sm:h-48 rounded-full transition-all duration-500 ${
              activeAgent === 'male' 
                ? 'scale-110 ring-4 ring-teal-400/50' 
                : activeAgent === 'female' 
                  ? 'opacity-30 scale-90' 
                  : 'hover:scale-105'
            }`}
          >
            {/* Outer Ring Animation */}
            <div className={`absolute inset-0 rounded-full border-2 border-teal-400/30 transition-all duration-500 ${hoveredAgent === 'male' || activeAgent === 'male' ? 'scale-110 opacity-100' : 'scale-100 opacity-0'}`}></div>
            <div className={`absolute inset-0 rounded-full border border-teal-400/20 transition-all duration-700 ${hoveredAgent === 'male' || activeAgent === 'male' ? 'scale-125 opacity-100' : 'scale-100 opacity-0'}`}></div>
            
            {/* Main Circle */}
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 flex items-center justify-center overflow-hidden">
              {/* Avatar */}
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-900/50 to-slate-900">
                <i className="fas fa-user text-5xl sm:text-6xl text-teal-400/80"></i>
              </div>
              
              {/* Active Indicator */}
              {activeAgent === 'male' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="flex gap-1">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="w-1 bg-teal-400 rounded-full animate-pulse" style={{ height: `${20 + Math.random() * 20}px`, animationDelay: `${i * 0.1}s` }}></div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Label */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <p className="font-bold text-white">ইউনুস</p>
              <p className="text-xs text-slate-500">Yunus</p>
            </div>
          </button>

          {/* Center Divider */}
          <div className="hidden sm:flex flex-col items-center gap-3 text-slate-600">
            <div className="w-px h-8 bg-gradient-to-b from-transparent via-slate-700 to-transparent"></div>
            <span className="text-xs font-bold uppercase tracking-wider">{isBn ? 'অথবা' : 'or'}</span>
            <div className="w-px h-8 bg-gradient-to-b from-transparent via-slate-700 to-transparent"></div>
          </div>

          {/* Female Agent - Arisha */}
          <button
            onClick={() => onStartCall('female')}
            onMouseEnter={() => setHoveredAgent('female')}
            onMouseLeave={() => setHoveredAgent(null)}
            disabled={activeAgent !== null}
            className={`group relative w-40 h-40 sm:w-48 sm:h-48 rounded-full transition-all duration-500 ${
              activeAgent === 'female' 
                ? 'scale-110 ring-4 ring-purple-400/50' 
                : activeAgent === 'male' 
                  ? 'opacity-30 scale-90' 
                  : 'hover:scale-105'
            }`}
          >
            {/* Outer Ring Animation */}
            <div className={`absolute inset-0 rounded-full border-2 border-purple-400/30 transition-all duration-500 ${hoveredAgent === 'female' || activeAgent === 'female' ? 'scale-110 opacity-100' : 'scale-100 opacity-0'}`}></div>
            <div className={`absolute inset-0 rounded-full border border-purple-400/20 transition-all duration-700 ${hoveredAgent === 'female' || activeAgent === 'female' ? 'scale-125 opacity-100' : 'scale-100 opacity-0'}`}></div>
            
            {/* Main Circle */}
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 flex items-center justify-center overflow-hidden">
              {/* Avatar */}
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-slate-900">
                <i className="fas fa-user text-5xl sm:text-6xl text-purple-400/80"></i>
              </div>
              
              {/* Active Indicator */}
              {activeAgent === 'female' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="flex gap-1">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="w-1 bg-purple-400 rounded-full animate-pulse" style={{ height: `${20 + Math.random() * 20}px`, animationDelay: `${i * 0.1}s` }}></div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Label */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <p className="font-bold text-white">আরিশা</p>
              <p className="text-xs text-slate-500">Arisha</p>
            </div>
          </button>
        </div>

        {/* Call to Action */}
        <div className="mt-16">
          {activeAgent ? (
            <p className="text-teal-400 font-medium animate-pulse flex items-center justify-center gap-2">
              <i className="fas fa-microphone"></i>
              {isBn ? 'কথা বলুন...' : 'Listening...'}
            </p>
          ) : (
            <p className="text-slate-500 text-sm">
              {isBn ? 'ক্লিক করে কথা বলা শুরু করুন' : 'Click to start speaking'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// ============ MAIN LANDING PAGE ============
export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const isBn = language === 'bn';
  const [activeAgent, setActiveAgent] = useState<'male' | 'female' | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Scroll handler for search bar visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowSearch(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleStartCall = (type: 'male' | 'female') => {
    // This would trigger the actual voice session
    // For now, we'll show a connected state
    setActiveAgent(type);
    // In real implementation, this would call the HomeVoiceSection's startSession
  };

  const quickActions = [
    { icon: 'fa-stethoscope', label: isBn ? 'ডাক্তার খুঁজুন' : 'Find Doctor', action: () => navigate('/search') },
    { icon: 'fa-calendar-check', label: isBn ? 'অ্যাপয়েন্টমেন্ট' : 'Appointments', action: () => navigate('/my-appointments') },
    { icon: 'fa-heartbeat', label: isBn ? 'আমার স্বাস্থ্য' : 'My Health', action: () => navigate('/my-health') },
    { icon: 'fa-user-md', label: isBn ? 'ডাক্তার লগইন' : 'Doctor Login', action: () => navigate('/login') },
  ];

  const stats = [
    { value: '২০০+', label: isBn ? 'বিশেষজ্ঞ ডাক্তার' : 'Expert Doctors' },
    { value: '১০,০০০+', label: isBn ? 'সন্তুষ্ট রোগী' : 'Happy Patients' },
    { value: '২৪/৭', label: isBn ? 'সেবা চালু' : 'Service Available' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] font-sans text-white overflow-x-hidden">
      
      {/* ============ HERO SECTION ============ */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-20">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-[#0a0a0f] to-[#0a0a0f]"></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>

        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex items-center justify-between z-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
              <span className="text-white font-bold text-lg">ন</span>
            </div>
            <span className="font-bold text-xl text-white">Nirnoy</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/patient-auth')} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition">
              {isBn ? 'লগইন' : 'Login'}
            </button>
            <button onClick={() => navigate('/search')} className="px-4 py-2 bg-white/10 backdrop-blur border border-white/10 rounded-lg text-sm font-medium text-white hover:bg-white/20 transition">
              {isBn ? 'ডাক্তার খুঁজুন' : 'Find Doctor'}
            </button>
          </div>
        </div>

        {/* Voice AI Hero */}
        <VoiceAIHero onStartCall={handleStartCall} activeAgent={activeAgent} />

        {/* Bottom Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-500 animate-bounce">
          <span className="text-xs font-medium">{isBn ? 'স্ক্রল করুন' : 'Scroll'}</span>
          <i className="fas fa-chevron-down"></i>
        </div>
      </section>

      {/* ============ QUICK ACTIONS ============ */}
      <section className="py-16 px-4 bg-gradient-to-b from-[#0a0a0f] to-slate-900/50">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={action.action}
                className="group p-6 bg-white/5 backdrop-blur border border-white/10 rounded-2xl hover:bg-white/10 hover:border-teal-500/30 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-teal-500/20 to-cyan-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <i className={`fas ${action.icon} text-teal-400 text-xl`}></i>
                </div>
                <p className="font-medium text-white text-sm">{action.label}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SEARCH SECTION ============ */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            {isBn ? 'সেরা ডাক্তার খুঁজুন' : 'Find the Best Doctor'}
          </h2>
          <p className="text-slate-400 mb-8">
            {isBn ? 'ঢাকার সেরা বিশেষজ্ঞ ডাক্তারদের সাথে অ্যাপয়েন্টমেন্ট নিন' : 'Book appointments with top specialists in Dhaka'}
          </p>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition"></div>
            <div className="relative bg-slate-900 border border-slate-700/50 rounded-2xl p-2 flex items-center gap-2">
              <div className="flex-1 flex items-center px-4">
                <i className="fas fa-search text-slate-500 mr-3"></i>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isBn ? 'ডাক্তার বা বিশেষত্ব খুঁজুন...' : 'Search doctor or specialty...'}
                  className="flex-1 bg-transparent outline-none text-white placeholder:text-slate-500 py-3"
                />
              </div>
              <button
                onClick={() => navigate('/search')}
                className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-teal-500/30 transition"
              >
                {isBn ? 'খুঁজুন' : 'Search'}
              </button>
            </div>
          </div>

          {/* Specialty Tags */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {[
              { en: 'Cardiology', bn: 'হৃদরোগ' },
              { en: 'Medicine', bn: 'মেডিসিন' },
              { en: 'Gynecology', bn: 'স্ত্রীরোগ' },
              { en: 'Pediatrics', bn: 'শিশুরোগ' },
              { en: 'Orthopedics', bn: 'হাড়' },
            ].map((spec, i) => (
              <button
                key={i}
                onClick={() => navigate('/search')}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-slate-400 hover:text-white hover:border-teal-500/50 transition"
              >
                {isBn ? spec.bn : spec.en}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ============ STATS ============ */}
      <section className="py-16 px-4 border-y border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-white mb-2">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              {isBn ? 'কেন নির্ণয়?' : 'Why Nirnoy?'}
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              {isBn 
                ? 'বাংলাদেশের জন্য তৈরি আধুনিক হেলথকেয়ার প্ল্যাটফর্ম' 
                : 'A modern healthcare platform built for Bangladesh'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1: Voice AI */}
            <div className="p-8 bg-gradient-to-br from-teal-500/10 to-transparent border border-teal-500/20 rounded-3xl">
              <div className="w-14 h-14 bg-teal-500/20 rounded-2xl flex items-center justify-center mb-6">
                <i className="fas fa-microphone text-2xl text-teal-400"></i>
              </div>
              <h3 className="text-xl font-bold mb-3">{isBn ? 'ভয়েস AI' : 'Voice AI'}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {isBn 
                  ? 'বাংলায় কথা বলুন, ডাক্তার খুঁজুন, অ্যাপয়েন্টমেন্ট বুক করুন - সব কিছু ভয়েসে' 
                  : 'Speak in Bangla, find doctors, book appointments - all by voice'}
              </p>
            </div>

            {/* Feature 2: Live Queue */}
            <div className="p-8 bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 rounded-3xl">
              <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6">
                <i className="fas fa-clock text-2xl text-purple-400"></i>
              </div>
              <h3 className="text-xl font-bold mb-3">{isBn ? 'লাইভ কিউ' : 'Live Queue'}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {isBn 
                  ? 'রিয়েল-টাইমে দেখুন আপনার সিরিয়াল কত দূরে, আর কতক্ষণ অপেক্ষা' 
                  : 'See your queue position in real-time, no more waiting in the dark'}
              </p>
            </div>

            {/* Feature 3: Health Record */}
            <div className="p-8 bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/20 rounded-3xl">
              <div className="w-14 h-14 bg-cyan-500/20 rounded-2xl flex items-center justify-center mb-6">
                <i className="fas fa-notes-medical text-2xl text-cyan-400"></i>
              </div>
              <h3 className="text-xl font-bold mb-3">{isBn ? 'হেলথ রেকর্ড' : 'Health Record'}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {isBn 
                  ? 'সব প্রেসক্রিপশন, রিপোর্ট এক জায়গায়। AI দিয়ে স্বাস্থ্য বুঝুন' 
                  : 'All prescriptions, reports in one place. Understand health with AI'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CTA FOR DOCTORS ============ */}
      <section className="py-20 px-4 bg-gradient-to-b from-slate-900/50 to-[#0a0a0f]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500/10 border border-teal-500/20 rounded-full mb-6">
            <i className="fas fa-user-md text-teal-400"></i>
            <span className="text-sm font-medium text-teal-400">{isBn ? 'ডাক্তারদের জন্য' : 'For Doctors'}</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {isBn ? 'আপনার প্র্যাকটিস আধুনিক করুন' : 'Modernize Your Practice'}
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto mb-10">
            {isBn 
              ? 'AI কপাইলট, স্মার্ট কিউ ম্যানেজমেন্ট, ডিজিটাল প্রেসক্রিপশন - সব এক প্ল্যাটফর্মে' 
              : 'AI copilot, smart queue management, digital prescriptions - all in one platform'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/doctor-registration')}
              className="px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-teal-500/30 transition flex items-center gap-2"
            >
              <i className="fas fa-plus"></i>
              {isBn ? 'রেজিস্টার করুন' : 'Register Now'}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition"
            >
              {isBn ? 'লগইন করুন' : 'Login'}
            </button>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="py-12 px-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">ন</span>
              </div>
              <div>
                <span className="font-bold text-white block">Nirnoy</span>
                <span className="text-xs text-slate-500">{isBn ? 'স্বাস্থ্যসেবা সহজ করি' : 'Making Healthcare Simple'}</span>
              </div>
            </div>

            <div className="flex gap-6 text-sm text-slate-500">
              <button onClick={() => navigate('/about')} className="hover:text-white transition">{isBn ? 'আমাদের সম্পর্কে' : 'About'}</button>
              <button onClick={() => navigate('/search')} className="hover:text-white transition">{isBn ? 'ডাক্তার' : 'Doctors'}</button>
              <button onClick={() => navigate('/privacy')} className="hover:text-white transition">{isBn ? 'গোপনীয়তা' : 'Privacy'}</button>
            </div>

            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition">
                <i className="fab fa-youtube"></i>
              </a>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/5 text-center text-xs text-slate-600">
            &copy; {new Date().getFullYear()} Nirnoy Care. {isBn ? 'সর্বস্বত্ব সংরক্ষিত' : 'All rights reserved'}.
          </div>
        </div>
      </footer>

      {/* ============ FLOATING SEARCH (on scroll) ============ */}
      {showSearch && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-white/5 p-4 animate-slide-down">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">ন</span>
              </div>
            </div>
            
            <div className="flex-1 flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2">
              <i className="fas fa-search text-slate-500 mr-3"></i>
              <input
                type="text"
                placeholder={isBn ? 'ডাক্তার খুঁজুন...' : 'Search doctors...'}
                className="flex-1 bg-transparent outline-none text-white placeholder:text-slate-500 text-sm"
              />
            </div>
            
            <button onClick={() => navigate('/search')} className="px-4 py-2 bg-teal-500 text-white font-medium rounded-lg text-sm hover:bg-teal-600 transition">
              {isBn ? 'খুঁজুন' : 'Search'}
            </button>
          </div>
        </div>
      )}

      {/* ============ STYLES ============ */}
      <style>{`
        @keyframes slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Landing;
