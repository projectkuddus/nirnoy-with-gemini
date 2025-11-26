
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeVoiceSection } from '../components/HomeVoiceSection';
import { useLanguage } from '../contexts/LanguageContext';

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { t, language } = useLanguage();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/search');
  };

  // Smooth scroll to features
  const scrollToFeatures = () => {
    const element = document.getElementById('features');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Specialty tags with translations
  const specialtyTags = [
    { key: 'spec.cardiology', en: 'Cardiology' },
    { key: 'spec.neurology', en: 'Neurology' },
    { key: 'spec.orthopedics', en: 'Orthopedics' },
    { key: 'spec.medicine', en: 'Medicine' },
    { key: 'spec.dermatology', en: 'Dermatology' },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans selection:bg-teal-500/20 selection:text-teal-900">
      
      {/* --- Hero Section --- */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Abstract Background Blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full overflow-hidden -z-10 pointer-events-none">
           <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-teal-400/20 rounded-full mix-blend-multiply filter blur-[100px] animate-blob opacity-70"></div>
           <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-400/20 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000 opacity-70"></div>
           <div className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-purple-400/20 rounded-full mix-blend-multiply filter blur-[100px] animate-blob animation-delay-4000 opacity-70"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 border border-white/60 shadow-sm backdrop-blur-xl mb-8 hover:scale-105 transition-transform cursor-default group">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-[11px] font-bold text-slate-600 tracking-widest uppercase group-hover:text-teal-700 transition-colors">{t('hero.badge')}</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-8xl font-bold text-slate-900 mb-8 tracking-tight leading-[1.1]">
            {t('hero.title1')} <br className="md:hidden" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 animate-gradient-x">{t('hero.title2')}</span>
          </h1>
          
          <p className="text-lg md:text-2xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
            {t('hero.subtitle')}
          </p>

          {/* Search Command Center */}
          <div className="max-w-3xl mx-auto relative z-20">
            <form onSubmit={handleSearch} className="relative group">
               <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-500 via-blue-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
               <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 flex flex-col md:flex-row p-2 items-center gap-2 transition-all">
                  
                  <div className="flex-1 w-full flex items-center px-4 h-16">
                     <i className="fas fa-search text-slate-400 text-xl mr-4 group-focus-within:text-teal-500 transition-colors"></i>
                     <input 
                        type="text" 
                        className="w-full h-full outline-none text-lg text-slate-800 placeholder:text-slate-400 bg-transparent font-medium"
                        placeholder={t('hero.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                     />
                  </div>

                  <div className="hidden md:block w-px h-10 bg-slate-200"></div>

                  <div className="w-full md:w-auto flex items-center px-4 h-16 md:border-none border-t border-slate-100">
                     <i className="fas fa-map-marker-alt text-slate-400 text-xl mr-3 group-focus-within:text-teal-500 transition-colors"></i>
                     <select className="h-full outline-none bg-transparent text-slate-600 font-bold cursor-pointer hover:text-slate-800 transition">
                        <option>{t('common.dhaka')}</option>
                        <option>{t('common.chittagong')}</option>
                     </select>
                  </div>

                  <button type="submit" className="w-full md:w-auto bg-slate-900 hover:bg-black text-white h-14 px-8 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-teal-500/30 flex items-center justify-center gap-2 group/btn">
                     <span>{t('hero.find')}</span>
                     <i className="fas fa-arrow-right text-sm transform -rotate-45 group-hover/btn:rotate-0 transition-transform"></i>
                  </button>
               </div>
            </form>
            
            {/* Quick Chips */}
            <div className="mt-8 flex flex-wrap justify-center gap-3 opacity-80">
               {specialtyTags.map((tag) => (
                  <button 
                    key={tag.key}
                    onClick={() => navigate('/search')}
                    className="px-4 py-1.5 rounded-full bg-white border border-slate-200 text-slate-500 text-xs font-bold hover:border-teal-400 hover:text-teal-600 hover:shadow-md transition-all transform hover:-translate-y-0.5"
                  >
                     {t(tag.key)}
                  </button>
               ))}
            </div>
          </div>
        </div>
      </section>

      {/* --- VOICE AGENT SECTION --- */}
      <HomeVoiceSection />

      {/* --- Bento Grid Features --- */}
      <section id="features" className="py-20 container mx-auto px-4">
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(220px,auto)]">
            
            {/* Box 1: Verified Doctors */}
            <div className="md:col-span-2 bg-white rounded-[2rem] p-10 border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-teal-100/50 transition-all duration-500 relative overflow-hidden group cursor-pointer" onClick={() => navigate('/search')}>
               <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                     <div className="inline-flex items-center justify-center h-14 w-14 bg-blue-50 rounded-2xl text-blue-600 text-2xl mb-6 group-hover:scale-110 transition-transform duration-500">
                        <i className="fas fa-user-md"></i>
                     </div>
                     <h3 className="text-3xl font-bold text-slate-800 mb-3">{t('features.topSpecialists')}</h3>
                     <p className="text-slate-500 text-lg max-w-md leading-relaxed">
                        {t('features.topSpecialistsDesc')}
                     </p>
                  </div>
                  <div className="mt-8 flex items-center gap-2 text-blue-600 font-bold group-hover:translate-x-2 transition-transform">
                     {t('features.bookAppointment')} <i className="fas fa-arrow-right"></i>
                  </div>
               </div>
               
               {/* Abstract UI Illustration */}
               <div className="absolute right-[-40px] top-[20%] w-64 opacity-80 group-hover:opacity-100 group-hover:translate-x-[-10px] transition-all duration-700">
                  <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-lg transform rotate-[-6deg]">
                     <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-full bg-slate-200"></div>
                        <div className="h-3 w-24 bg-slate-200 rounded"></div>
                     </div>
                     <div className="space-y-2">
                        <div className="h-2 w-full bg-slate-100 rounded"></div>
                        <div className="h-2 w-5/6 bg-slate-100 rounded"></div>
                     </div>
                  </div>
                  <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-lg transform rotate-[3deg] translate-y-[-20px] translate-x-[20px] z-10 relative">
                     <div className="flex items-center justify-between mb-2">
                        <div className="h-3 w-16 bg-teal-100 rounded"></div>
                        <div className="h-4 w-4 bg-green-100 rounded-full"></div>
                     </div>
                     <div className="h-2 w-full bg-slate-100 rounded"></div>
                  </div>
               </div>
            </div>

            {/* Box 2: AI Notebook */}
            <div className="bg-slate-900 rounded-[2rem] p-10 border border-slate-800 shadow-2xl relative overflow-hidden group text-white cursor-default">
               <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                     <div className="h-14 w-14 bg-teal-500/20 rounded-2xl flex items-center justify-center text-teal-400 text-2xl mb-6 border border-teal-500/30 group-hover:rotate-12 transition-transform duration-500">
                        <i className="fas fa-brain"></i>
                     </div>
                     <h3 className="text-2xl font-bold mb-3">{t('features.healthIntelligence')}</h3>
                     <p className="text-slate-400 text-sm leading-relaxed">
                        {t('features.healthIntelligenceDesc')}
                     </p>
                  </div>
                  <div className="mt-4 bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 backdrop-blur-sm">
                     <div className="flex items-center gap-2 mb-2">
                        <i className="fas fa-sparkles text-yellow-400 text-xs"></i>
                        <span className="text-[10px] font-bold text-slate-300 uppercase">Insight</span>
                     </div>
                     <p className="text-xs text-slate-300 italic">{language === 'bn' ? '"আপনার BP ট্রেন্ড উন্নতি হচ্ছে..."' : '"Your BP trend is improving..."'}</p>
                  </div>
               </div>
               <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-teal-500 rounded-full blur-[80px] opacity-20 group-hover:opacity-30 transition duration-500"></div>
            </div>

            {/* Box 3: Live Queue */}
            <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-[2rem] p-10 shadow-xl shadow-teal-500/20 relative overflow-hidden group text-white flex flex-col justify-between cursor-default">
               <div className="relative z-10">
                  <div className="h-14 w-14 bg-white/20 rounded-2xl flex items-center justify-center text-white text-2xl mb-6 backdrop-blur-md border border-white/30">
                     <i className="fas fa-clock"></i>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{t('features.liveQueue')}</h3>
                  <p className="text-teal-50 text-sm opacity-90">
                     {t('features.liveQueueDesc')}
                  </p>
               </div>
               
               <div className="mt-6 relative">
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
                     <div className="flex justify-between items-end">
                        <div>
                           <p className="text-[10px] uppercase font-bold text-teal-100 mb-1">{t('features.currentSerial')}</p>
                           <p className="text-4xl font-bold">12</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] uppercase font-bold text-teal-100 mb-1">{t('features.yourSerial')}</p>
                           <p className="text-xl font-bold opacity-70">18</p>
                        </div>
                     </div>
                     <div className="w-full bg-black/20 h-1 mt-3 rounded-full overflow-hidden">
                        <div className="bg-white h-full w-2/3 rounded-full animate-pulse"></div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Box 4: The Process (Full Width) */}
            <div className="md:col-span-2 bg-[#F8FAFC] rounded-[2rem] p-10 border border-slate-200 shadow-sm hover:shadow-lg transition-shadow duration-300 flex items-center relative overflow-hidden">
               <div className="relative z-10 max-w-lg">
                  <h3 className="text-2xl font-bold text-slate-800 mb-3">{t('features.seamlessExperience')}</h3>
                  <p className="text-slate-500 mb-6">
                     {t('features.seamlessExperienceDesc')}
                  </p>
                  <div className="flex items-center gap-4">
                     <div className="flex -space-x-3">
                        {[1,2,3,4].map(i => (
                           <div key={i} className="h-10 w-10 rounded-full bg-white border-2 border-slate-100 shadow-sm flex items-center justify-center text-xs font-bold text-slate-600">
                              <i className="fas fa-check text-teal-500"></i>
                           </div>
                        ))}
                     </div>
                     <span className="text-sm font-bold text-slate-600">10k+ {t('features.appointmentsBooked')}</span>
                  </div>
               </div>
               <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-white via-transparent to-transparent pointer-events-none"></div>
               <i className="fas fa-check-circle absolute right-[-20px] bottom-[-40px] text-[200px] text-slate-200/50 -z-0"></i>
            </div>
         </div>
      </section>

      {/* --- CTA for Doctors --- */}
      <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
         <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-slate-900 via-transparent to-slate-900 z-0"></div>
         
         <div className="container mx-auto px-4 relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-16">
               <div className="max-w-xl">
                  <div className="inline-block bg-teal-900/50 border border-teal-700/50 rounded-lg px-3 py-1 mb-6">
                     <span className="text-teal-400 font-bold tracking-widest uppercase text-[10px]">{t('cta.forProfessionals')}</span>
                  </div>
                  <h2 className="text-5xl font-bold mb-6 leading-tight">
                     {t('cta.title1')} <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-400">{t('cta.title2')}</span>
                  </h2>
                  <p className="text-slate-400 text-lg mb-10 leading-relaxed">
                     {t('cta.description')}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                     <button onClick={() => navigate('/login')} className="bg-teal-500 hover:bg-teal-400 text-slate-900 px-8 py-4 rounded-xl font-bold transition shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)]">
                        {t('cta.joinAsDoctor')}
                     </button>
                     <button onClick={scrollToFeatures} className="px-8 py-4 rounded-xl font-bold border border-slate-700 hover:bg-slate-800 transition text-slate-300">
                        {t('cta.viewFeatures')}
                     </button>
                  </div>
               </div>
               
               {/* Visual Mockup Representation */}
               <div className="relative w-full md:w-1/2 max-w-lg aspect-square hidden md:block">
                  <div className="absolute inset-0 bg-gradient-to-tr from-teal-500 to-purple-500 rounded-full opacity-20 blur-[100px] animate-pulse"></div>
                  
                  {/* Dashboard Card 1 */}
                  <div className="absolute top-10 left-0 w-64 bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-2xl p-5 shadow-2xl transform rotate-[-6deg] hover:rotate-0 transition duration-500 z-10">
                     <div className="flex items-center justify-between mb-4">
                        <div className="h-8 w-8 bg-teal-500 rounded-lg flex items-center justify-center"><i className="fas fa-users"></i></div>
                        <span className="text-xs font-bold text-slate-400">{language === 'bn' ? 'দৈনিক ট্রাফিক' : 'Daily Traffic'}</span>
                     </div>
                     <div className="text-3xl font-bold mb-1">42 <span className="text-sm font-normal text-slate-500">{language === 'bn' ? 'রোগী' : 'Patients'}</span></div>
                     <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden mt-2">
                        <div className="h-full w-3/4 bg-teal-500 rounded-full"></div>
                     </div>
                  </div>

                  {/* Dashboard Card 2 */}
                  <div className="absolute bottom-10 right-0 w-72 bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-2xl p-5 shadow-2xl transform rotate-[3deg] hover:rotate-0 transition duration-500 z-20">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="h-8 w-8 bg-purple-500 rounded-lg flex items-center justify-center"><i className="fas fa-robot"></i></div>
                        <span className="text-xs font-bold text-slate-400">{language === 'bn' ? 'AI সহকারী' : 'AI Assistant'}</span>
                     </div>
                     <div className="space-y-2">
                        <div className="bg-slate-700/50 p-2 rounded text-[10px] text-slate-300">
                           {language === 'bn' ? '"ইতিহাসের উপর ভিত্তি করে, রোগীর লক্ষণ দেখা যাচ্ছে..."' : '"Based on history, patient shows signs of..."'}
                        </div>
                        <div className="bg-slate-700/50 p-2 rounded text-[10px] text-slate-300 opacity-60">
                           {language === 'bn' ? '"ওষুধের মিথস্ক্রিয়া সতর্কতা সনাক্ত হয়েছে..."' : '"Drug interaction warning detected..."'}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* --- Footer --- */}
      <footer className="bg-[#FAFAFA] border-t border-slate-200 py-16">
         <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl flex items-center justify-center text-white shadow-lg">
                     <i className="fas fa-heartbeat"></i>
                  </div>
                  <div>
                     <span className="font-bold text-xl text-slate-900 block leading-none">{t('nav.brand')}</span>
                     <span className="text-[10px] font-bold text-teal-600 tracking-widest uppercase">{t('footer.tagline')}</span>
                  </div>
               </div>
               <div className="flex gap-8 text-sm font-bold text-slate-500">
                  <button onClick={() => navigate('/about')} className="hover:text-slate-900 transition">{t('footer.about')}</button>
                  <button onClick={() => navigate('/search')} className="hover:text-slate-900 transition">{t('footer.doctors')}</button>
                  <button onClick={() => navigate('/privacy')} className="hover:text-slate-900 transition">{t('footer.privacy')}</button>
                  <button onClick={() => navigate('/')} className="hover:text-slate-900 transition">{t('footer.contact')}</button>
               </div>
               <div className="flex gap-4">
                  <a href="#" className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-100 hover:shadow-md transition-all">
                     <i className="fab fa-facebook-f"></i>
                  </a>
                  <a href="#" className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-400 hover:border-blue-100 hover:shadow-md transition-all">
                     <i className="fab fa-twitter"></i>
                  </a>
               </div>
            </div>
            <div className="text-center mt-12 text-slate-400 text-xs">
               &copy; {new Date().getFullYear()} {t('footer.copyright')}
            </div>
         </div>
      </footer>

      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-gradient-x {
            background-size: 200% 200%;
            animation: gradient-x 3s ease infinite;
        }
        @keyframes gradient-x {
            0% { background-position: 0% 50% }
            50% { background-position: 100% 50% }
            100% { background-position: 0% 50% }
        }
      `}</style>
    </div>
  );
};
