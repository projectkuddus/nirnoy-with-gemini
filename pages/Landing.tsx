import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

// ============ ANIMATED HEALTH GRAPHIC ============
const HealthGraphic: React.FC = () => (
  <div className="relative w-full max-w-md mx-auto">
    {/* Central Circle with Pulse */}
    <div className="relative w-64 h-64 mx-auto">
      {/* Outer rings */}
      <div className="absolute inset-0 border-2 border-blue-100 rounded-full animate-ping opacity-20"></div>
      <div className="absolute inset-4 border border-blue-200 rounded-full"></div>
      <div className="absolute inset-8 border border-blue-100 rounded-full"></div>
      
      {/* Center */}
      <div className="absolute inset-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-xl shadow-blue-500/30">
        <div className="text-center text-white">
          <i className="fas fa-heartbeat text-4xl mb-2"></i>
          <p className="text-xs font-bold uppercase tracking-wider">Nirnoy</p>
        </div>
      </div>

      {/* Floating Icons */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center border border-slate-100">
        <i className="fas fa-user-md text-blue-500 text-lg"></i>
      </div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center border border-slate-100">
        <i className="fas fa-calendar-check text-blue-500 text-lg"></i>
      </div>
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center border border-slate-100">
        <i className="fas fa-notes-medical text-blue-500 text-lg"></i>
      </div>
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center border border-slate-100">
        <i className="fas fa-clock text-blue-500 text-lg"></i>
      </div>
    </div>
  </div>
);

// ============ VOICE AGENT CARD ============
const VoiceAgentCard: React.FC<{
  agentNumber: 1 | 2;
  isActive: boolean;
  isSpeaking: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  disabled: boolean;
}> = ({ agentNumber, isActive, isSpeaking, onConnect, onDisconnect, disabled }) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  return (
    <div className={`relative bg-white rounded-2xl p-6 border-2 transition-all duration-300 ${
      isActive 
        ? 'border-blue-500 shadow-xl shadow-blue-500/10' 
        : disabled 
          ? 'border-slate-100 opacity-50' 
          : 'border-slate-200 hover:border-blue-300 hover:shadow-lg'
    }`}>
      {/* Active Indicator */}
      {isActive && (
        <div className="absolute top-3 right-3">
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
        </div>
      )}

      {/* Agent Icon */}
      <div className="w-20 h-20 mx-auto mb-4 relative">
        <div className={`absolute inset-0 rounded-full ${agentNumber === 1 ? 'bg-blue-100' : 'bg-slate-100'}`}></div>
        <div className="absolute inset-1 bg-white rounded-full flex items-center justify-center">
          <i className={`fas fa-headset text-3xl ${agentNumber === 1 ? 'text-blue-500' : 'text-slate-600'}`}></i>
        </div>
        {isActive && isSpeaking && (
          <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-30"></div>
        )}
      </div>

      <h3 className="text-lg font-bold text-slate-800 text-center mb-1">
        Nirnoy {agentNumber}
      </h3>
      <p className="text-sm text-slate-500 text-center mb-6">
        {isBn ? 'AI স্বাস্থ্য সহায়ক' : 'AI Health Assistant'}
      </p>

      {isActive ? (
        <div className="space-y-4">
          {/* Audio Visualizer */}
          <div className="h-12 bg-slate-50 rounded-xl flex items-center justify-center gap-1 px-4">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i} 
                className={`w-1 rounded-full transition-all duration-75 ${isSpeaking ? 'bg-blue-500' : 'bg-slate-300'}`}
                style={{ height: isSpeaking ? `${Math.max(20, Math.random() * 100)}%` : '20%' }}
              ></div>
            ))}
          </div>
          
          <p className="text-center text-sm text-blue-600 font-medium animate-pulse">
            <i className={isSpeaking ? "fas fa-volume-up mr-2" : "fas fa-microphone mr-2"}></i>
            {isBn ? 'কথা বলুন...' : 'Listening...'}
          </p>
          
          <button 
            onClick={onDisconnect}
            className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition flex items-center justify-center gap-2"
          >
            <i className="fas fa-phone-slash"></i>
            {isBn ? 'শেষ করুন' : 'End Call'}
          </button>
        </div>
      ) : (
        <button 
          onClick={onConnect}
          disabled={disabled}
          className={`w-full py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
            agentNumber === 1 
              ? 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-300' 
              : 'bg-slate-800 text-white hover:bg-slate-900 disabled:bg-slate-400'
          } disabled:cursor-not-allowed`}
        >
          <i className="fas fa-phone"></i>
          {isBn ? 'কথা বলুন' : 'Connect'}
        </button>
      )}
    </div>
  );
};

// ============ MAIN LANDING PAGE ============
export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAgent, setActiveAgent] = useState<1 | 2 | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Simulate speaking animation
  useEffect(() => {
    if (activeAgent) {
      const interval = setInterval(() => {
        setIsSpeaking(prev => !prev);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [activeAgent]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/search');
  };

  const stats = [
    { value: '200+', label: isBn ? 'বিশেষজ্ঞ ডাক্তার' : 'Expert Doctors' },
    { value: '10,000+', label: isBn ? 'সন্তুষ্ট রোগী' : 'Happy Patients' },
    { value: '24/7', label: isBn ? 'সার্ভিস চালু' : 'Service Available' },
  ];

  const features = [
    { icon: 'fa-microphone', title: isBn ? 'ভয়েস বুকিং' : 'Voice Booking', desc: isBn ? 'বাংলায় কথা বলে বুকিং করুন' : 'Book by speaking in Bangla' },
    { icon: 'fa-clock', title: isBn ? 'লাইভ কিউ' : 'Live Queue', desc: isBn ? 'রিয়েল-টাইম সিরিয়াল দেখুন' : 'Real-time queue tracking' },
    { icon: 'fa-notes-medical', title: isBn ? 'হেলথ রেকর্ড' : 'Health Record', desc: isBn ? 'সব রেকর্ড এক জায়গায়' : 'All records in one place' },
    { icon: 'fa-bell', title: isBn ? 'স্মার্ট নোটিফিকেশন' : 'Smart Alerts', desc: isBn ? 'SMS ও পুশ নোটিফিকেশন' : 'SMS & push notifications' },
  ];

  return (
    <div className="min-h-screen bg-white font-sans">
      
      {/* ============ HEADER ============ */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">ন</span>
            </div>
            <span className="font-bold text-xl text-slate-800">Nirnoy</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/patient-auth')} className="text-sm font-medium text-slate-600 hover:text-slate-800 transition">
              {isBn ? 'লগইন' : 'Login'}
            </button>
            <button onClick={() => navigate('/search')} className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition">
              {isBn ? 'ডাক্তার খুঁজুন' : 'Find Doctor'}
            </button>
          </div>
        </div>
      </header>

      {/* ============ HERO SECTION ============ */}
      <section className="pt-28 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full mb-6">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  {isBn ? 'বাংলাদেশের জন্য' : 'Built for Bangladesh'}
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
                {isBn ? (
                  <>স্বাস্থ্যসেবা <br/><span className="text-blue-500">সহজ করি</span></>
                ) : (
                  <>Healthcare <br/><span className="text-blue-500">Made Simple</span></>
                )}
              </h1>

              <p className="text-lg text-slate-600 mb-8 max-w-lg">
                {isBn 
                  ? 'ঢাকার সেরা ডাক্তারদের খুঁজুন, অ্যাপয়েন্টমেন্ট বুক করুন, লাইভ কিউ ট্র্যাক করুন - সব এক জায়গায়।' 
                  : 'Find the best doctors in Dhaka, book appointments, track live queue - all in one place.'}
              </p>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="relative mb-8">
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-2 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100 transition">
                  <div className="flex items-center flex-1 px-3">
                    <i className="fas fa-search text-slate-400 mr-3"></i>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={isBn ? 'ডাক্তার বা বিশেষত্ব খুঁজুন...' : 'Search doctor or specialty...'}
                      className="flex-1 bg-transparent outline-none text-slate-800 placeholder:text-slate-400 py-2"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition"
                  >
                    {isBn ? 'খুঁজুন' : 'Search'}
                  </button>
                </div>
              </form>

              {/* Quick Specialty Tags */}
              <div className="flex flex-wrap gap-2">
                {[
                  { en: 'Cardiology', bn: 'হৃদরোগ' },
                  { en: 'Medicine', bn: 'মেডিসিন' },
                  { en: 'Gynecology', bn: 'স্ত্রীরোগ' },
                  { en: 'Pediatrics', bn: 'শিশুরোগ' },
                ].map((spec, i) => (
                  <button
                    key={i}
                    onClick={() => navigate('/search')}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:border-blue-400 hover:text-blue-600 transition"
                  >
                    {isBn ? spec.bn : spec.en}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Health Graphic */}
            <div className="hidden lg:block">
              <HealthGraphic />
            </div>
          </div>
        </div>
      </section>

      {/* ============ STATS BAR ============ */}
      <section className="py-8 bg-slate-50 border-y border-slate-100">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-3 gap-8 text-center">
            {stats.map((stat, i) => (
              <div key={i}>
                <p className="text-2xl md:text-3xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ VOICE BOOKING SECTION ============ */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full mb-4">
              <i className="fas fa-phone-volume text-blue-500"></i>
              <span className="text-sm font-bold text-blue-600">24/7 • {isBn ? 'বিনামূল্যে' : 'No Charge'}</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              {isBn ? 'কথা বলে অ্যাপয়েন্টমেন্ট নিন' : 'Book by Talking to Our Agents'}
            </h2>
            <p className="text-slate-600 max-w-xl mx-auto">
              {isBn 
                ? 'বাংলায় কথা বলুন আমাদের AI এজেন্টের সাথে। ডাক্তার খুঁজুন, প্রশ্ন করুন, অ্যাপয়েন্টমেন্ট বুক করুন - সব ভয়েসে।' 
                : 'Speak in Bangla with our AI agents. Find doctors, ask questions, book appointments - all by voice.'}
            </p>
          </div>

          {/* Voice Agent Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <VoiceAgentCard
              agentNumber={1}
              isActive={activeAgent === 1}
              isSpeaking={isSpeaking}
              onConnect={() => setActiveAgent(1)}
              onDisconnect={() => setActiveAgent(null)}
              disabled={activeAgent === 2}
            />
            <VoiceAgentCard
              agentNumber={2}
              isActive={activeAgent === 2}
              isSpeaking={isSpeaking}
              onConnect={() => setActiveAgent(2)}
              onDisconnect={() => setActiveAgent(null)}
              disabled={activeAgent === 1}
            />
          </div>

          {/* Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
              <i className="fas fa-info-circle"></i>
              {isBn 
                ? 'দুটি এজেন্টের কাজ একই। যেকোনো একটি বেছে নিন।' 
                : 'Both agents have same capabilities. Choose any one.'}
            </p>
          </div>
        </div>
      </section>

      {/* ============ FEATURES SECTION ============ */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              {isBn ? 'কেন নির্ণয়?' : 'Why Nirnoy?'}
            </h2>
            <p className="text-slate-600">
              {isBn ? 'আধুনিক স্বাস্থ্যসেবার জন্য আধুনিক সমাধান' : 'Modern solutions for modern healthcare'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 hover:shadow-lg transition">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                  <i className={`fas ${feature.icon} text-blue-500 text-xl`}></i>
                </div>
                <h3 className="font-bold text-slate-800 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ QUICK ACTIONS ============ */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: 'fa-stethoscope', label: isBn ? 'ডাক্তার খুঁজুন' : 'Find Doctor', path: '/search', color: 'blue' },
              { icon: 'fa-calendar-check', label: isBn ? 'আমার অ্যাপয়েন্টমেন্ট' : 'My Appointments', path: '/my-appointments', color: 'slate' },
              { icon: 'fa-heartbeat', label: isBn ? 'আমার স্বাস্থ্য' : 'My Health', path: '/my-health', color: 'blue' },
              { icon: 'fa-user-md', label: isBn ? 'ডাক্তার লগইন' : 'Doctor Login', path: '/login', color: 'slate' },
            ].map((action, i) => (
              <button
                key={i}
                onClick={() => navigate(action.path)}
                className={`p-6 rounded-2xl border transition-all hover:shadow-lg ${
                  action.color === 'blue' 
                    ? 'bg-blue-50 border-blue-100 hover:border-blue-200' 
                    : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                  action.color === 'blue' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-white'
                }`}>
                  <i className={`fas ${action.icon} text-xl`}></i>
                </div>
                <p className="font-medium text-slate-800 text-sm">{action.label}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA FOR DOCTORS ============ */}
      <section className="py-20 px-4 bg-slate-900">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-6">
            <i className="fas fa-user-md text-blue-400"></i>
            <span className="text-sm font-medium text-white/80">{isBn ? 'ডাক্তারদের জন্য' : 'For Doctors'}</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            {isBn ? 'আপনার প্র্যাকটিস ডিজিটাল করুন' : 'Digitize Your Practice'}
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto mb-8">
            {isBn 
              ? 'AI কপাইলট, স্মার্ট কিউ ম্যানেজমেন্ট, ডিজিটাল প্রেসক্রিপশন - সব এক প্ল্যাটফর্মে।' 
              : 'AI copilot, smart queue management, digital prescriptions - all in one platform.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/doctor-registration')}
              className="px-8 py-4 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition flex items-center gap-2"
            >
              <i className="fas fa-plus"></i>
              {isBn ? 'রেজিস্টার করুন' : 'Register Now'}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-white/10 border border-white/20 text-white font-medium rounded-xl hover:bg-white/20 transition"
            >
              {isBn ? 'লগইন করুন' : 'Login'}
            </button>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="py-12 px-4 bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">ন</span>
              </div>
              <div>
                <span className="font-bold text-slate-800 block">Nirnoy</span>
                <span className="text-xs text-slate-500">{isBn ? 'স্বাস্থ্যসেবা সহজ করি' : 'Healthcare Made Simple'}</span>
              </div>
            </div>

            <div className="flex gap-6 text-sm text-slate-500">
              <button onClick={() => navigate('/about')} className="hover:text-slate-800 transition">{isBn ? 'আমাদের সম্পর্কে' : 'About'}</button>
              <button onClick={() => navigate('/search')} className="hover:text-slate-800 transition">{isBn ? 'ডাক্তার' : 'Doctors'}</button>
              <button onClick={() => navigate('/privacy')} className="hover:text-slate-800 transition">{isBn ? 'গোপনীয়তা' : 'Privacy'}</button>
            </div>

            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-blue-50 hover:text-blue-500 transition" aria-label="Facebook">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#" className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-500 transition" aria-label="YouTube">
                <i className="fab fa-youtube"></i>
              </a>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100 text-center text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Nirnoy Care. {isBn ? 'সর্বস্বত্ব সংরক্ষিত' : 'All rights reserved'}.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
