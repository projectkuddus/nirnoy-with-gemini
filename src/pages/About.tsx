import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

// Visual Infographic Component - Shows what Nirnoy does
const NirnoyInfographic: React.FC = () => {
  return (
    <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="5" r="1" fill="#3b82f6" />
          </pattern>
          <rect width="100" height="100" fill="url(#grid)" />
        </svg>
      </div>
      
      {/* Center - Nirnoy Logo/Hub */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
        <div className="relative">
          {/* Pulsing rings */}
          <div className="absolute inset-0 -m-4 bg-blue-400/20 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
          <div className="absolute inset-0 -m-8 bg-blue-300/10 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
          
          {/* Main hub */}
          <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-2xl flex items-center justify-center relative">
            <span className="text-white font-bold text-4xl">ন</span>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-white px-3 py-1 rounded-full shadow-lg">
              <span className="text-xs font-bold text-blue-600">নির্ণয়</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Left Side - Patients */}
      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 space-y-4">
        <div className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-lg animate-pulse" style={{ animationDuration: '3s' }}>
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">👨</span>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-800">রোগী</div>
            <div className="text-[10px] text-gray-500">Patient</div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-lg animate-pulse" style={{ animationDuration: '4s' }}>
          <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">👩</span>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-800">রোগী</div>
            <div className="text-[10px] text-gray-500">Patient</div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-lg animate-pulse" style={{ animationDuration: '5s' }}>
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">👴</span>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-800">রোগী</div>
            <div className="text-[10px] text-gray-500">Patient</div>
          </div>
        </div>
      </div>
      
      {/* Right Side - Doctors */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 space-y-4">
        <div className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-lg animate-pulse" style={{ animationDuration: '3.5s' }}>
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">👨‍⚕️</span>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-800">ডাক্তার</div>
            <div className="text-[10px] text-gray-500">Doctor</div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-lg animate-pulse" style={{ animationDuration: '4.5s' }}>
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">👩‍⚕️</span>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-800">ডাক্তার</div>
            <div className="text-[10px] text-gray-500">Doctor</div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-lg animate-pulse" style={{ animationDuration: '5.5s' }}>
          <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">🩺</span>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-800">বিশেষজ্ঞ</div>
            <div className="text-[10px] text-gray-500">Specialist</div>
          </div>
        </div>
      </div>
      
      {/* Connection Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 400 300">
        <path d="M100 80 Q200 80 200 150" stroke="#3b82f6" strokeWidth="2" fill="none" strokeDasharray="5,5" className="animate-pulse" />
        <path d="M100 150 L200 150" stroke="#3b82f6" strokeWidth="2" fill="none" strokeDasharray="5,5" className="animate-pulse" />
        <path d="M100 220 Q200 220 200 150" stroke="#3b82f6" strokeWidth="2" fill="none" strokeDasharray="5,5" className="animate-pulse" />
        <path d="M200 150 Q200 80 300 80" stroke="#6366f1" strokeWidth="2" fill="none" strokeDasharray="5,5" className="animate-pulse" />
        <path d="M200 150 L300 150" stroke="#6366f1" strokeWidth="2" fill="none" strokeDasharray="5,5" className="animate-pulse" />
        <path d="M200 150 Q200 220 300 220" stroke="#6366f1" strokeWidth="2" fill="none" strokeDasharray="5,5" className="animate-pulse" />
        <circle cx="200" cy="150" r="5" fill="#3b82f6" />
      </svg>
      
      {/* Top Features */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-4">
        <div className="bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className="text-xs font-bold text-gray-700">AI সহায়ক</span>
        </div>
        <div className="bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <span className="text-lg">📋</span>
          <span className="text-xs font-bold text-gray-700">ডিজিটাল রেকর্ড</span>
        </div>
        <div className="bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <span className="text-lg">📅</span>
          <span className="text-xs font-bold text-gray-700">অ্যাপয়েন্টমেন্ট</span>
        </div>
      </div>
      
      {/* Bottom Caption */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-full shadow-lg">
          <span className="text-sm font-bold">রোগী ↔ নির্ণয় ↔ ডাক্তার</span>
        </div>
        <p className="text-xs text-gray-600 mt-2">সংযুক্ত স্বাস্থ্যসেবা • Connected Healthcare</p>
      </div>
    </div>
  );
};

export const About: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <PageHeader showNav={true} showGetStarted={true} />
      
      {/* Hero */}
      <section className="relative pt-28 pb-20 bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h1 className="text-5xl font-bold mb-6">Revolutionizing Healthcare in Bangladesh</h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Nirnoy Care is bridging the gap between patients and doctors through intelligent, data-driven technology.
          </p>
        </div>
      </section>

      {/* Mission with Infographic */}
      <section className="py-20 container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
             <div className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4">Our Mission</div>
             <h2 className="text-3xl font-bold text-slate-800 mb-6">Making Quality Healthcare Accessible & Efficient</h2>
             <div className="space-y-4 text-slate-600 leading-relaxed">
               <p>
                 In Dhaka, millions of patients waste countless hours in waiting rooms, often for just a few minutes of consultation. Medical records are fragmented, paper-based, and easily lost.
               </p>
               <p>
                 <strong>Nirnoy Care</strong> was born from this frustration. We believe that healthcare should be synchronized, not chaotic. By leveraging AI and real-time data, we empower doctors to manage their practice efficiently and patients to take control of their health journey.
               </p>
             </div>
          </div>
          <div className="relative">
             <div className="absolute inset-0 bg-blue-500 rounded-2xl rotate-3 opacity-20"></div>
             <div className="relative z-10">
               <NirnoyInfographic />
             </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gradient-to-b from-white to-blue-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-800 mb-4">কিভাবে কাজ করে?</h2>
            <p className="text-slate-600">How Nirnoy Works</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { step: '১', icon: '📱', title: 'রেজিস্টার করুন', titleEn: 'Register', desc: 'মোবাইল নম্বর দিয়ে একাউন্ট খুলুন' },
              { step: '২', icon: '🤖', title: 'AI সহায়ক', titleEn: 'AI Assistant', desc: 'লক্ষণ বলুন, প্রাথমিক পরামর্শ পান' },
              { step: '৩', icon: '👨‍⚕️', title: 'ডাক্তার খুঁজুন', titleEn: 'Find Doctor', desc: '৫০০+ বিশেষজ্ঞ থেকে বাছাই করুন' },
              { step: '৪', icon: '📋', title: 'রেকর্ড সংরক্ষণ', titleEn: 'Save Records', desc: 'সব রিপোর্ট ও প্রেসক্রিপশন এক জায়গায়' },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100 text-center hover:shadow-xl transition-all hover:-translate-y-1">
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {item.step}
                  </div>
                  <div className="text-4xl mb-4 mt-2">{item.icon}</div>
                  <h3 className="font-bold text-lg text-slate-800">{item.title}</h3>
                  <p className="text-xs text-slate-500 mb-2">{item.titleEn}</p>
                  <p className="text-sm text-slate-600">{item.desc}</p>
                </div>
                {i < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-blue-400 text-2xl">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 bg-white border-y border-slate-100">
        <div className="container mx-auto px-4">
           <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-800">Why We Do It</h2>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 text-center hover:shadow-lg transition">
                 <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">👥</div>
                 <h3 className="text-xl font-bold mb-3">Patient Centric</h3>
                 <p className="text-slate-500 text-sm">We build every feature with the patient's convenience and well-being in mind.</p>
              </div>
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 text-center hover:shadow-lg transition">
                 <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">🧠</div>
                 <h3 className="text-xl font-bold mb-3">Data Driven</h3>
                 <p className="text-slate-500 text-sm">We use advanced AI to turn raw medical data into actionable health insights.</p>
              </div>
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 text-center hover:shadow-lg transition">
                 <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">🛡️</div>
                 <h3 className="text-xl font-bold mb-3">Trust & Privacy</h3>
                 <p className="text-slate-500 text-sm">Your health data is sacred. We protect it with enterprise-grade security.</p>
              </div>
           </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '৫০০+', label: 'ডাক্তার', labelEn: 'Doctors' },
              { value: '২৪/৭', label: 'AI সহায়ক', labelEn: 'AI Support' },
              { value: '১০০%', label: 'ক্লাউড সিকিউর', labelEn: 'Cloud Secure' },
              { value: '১ লক্ষ+', label: 'রোগী সেবা', labelEn: 'Patients Served' },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-4xl font-black mb-2">{stat.value}</div>
                <div className="font-medium">{stat.label}</div>
                <div className="text-blue-200 text-sm">{stat.labelEn}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center">
         <h2 className="text-3xl font-bold text-slate-800 mb-6">Ready to experience better healthcare?</h2>
         <div className="flex gap-4 justify-center flex-wrap">
           <button 
             onClick={() => navigate('/patient-auth')}
             className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 transition"
           >
              🚀 শুরু করুন
           </button>
           <button 
             onClick={() => navigate('/search')}
             className="bg-white border-2 border-blue-500 text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-xl font-bold text-lg transition"
           >
              👨‍⚕️ ডাক্তার খুঁজুন
           </button>
         </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 text-center text-sm">
         <p>&copy; 2025 Nirnoy Health Tech Ltd.</p>
      </footer>
    </div>
  );
};
