
import React from 'react';
import { UserRole } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface NavbarProps {
  role: UserRole;
  onLogout: () => void;
  navigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ role, onLogout, navigate }) => {
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-2">
              <i className="fas fa-heartbeat text-white"></i>
            </div>
            <span className="font-bold text-xl text-slate-800 tracking-tight">{t('nav.brand')}</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-6">
             {role === UserRole.GUEST && (
               <>
                <button onClick={() => navigate('/search')} className="text-slate-600 hover:text-primary font-medium">{t('nav.findDoctor')}</button>
                <button onClick={() => navigate('/login')} className="text-slate-600 hover:text-primary font-medium">{t('nav.forDoctors')}</button>
               </>
             )}
             {role === UserRole.PATIENT && (
               <>
                 <button onClick={() => navigate('/patient-dashboard')} className="text-slate-600 hover:text-primary font-medium">{t('nav.myDashboard')}</button>
                 <button onClick={() => navigate('/search')} className="text-slate-600 hover:text-primary font-medium">{t('nav.bookAppointment')}</button>
               </>
             )}
             {role === UserRole.DOCTOR && (
               <>
                <button onClick={() => navigate('/doctor-dashboard')} className="text-slate-600 hover:text-primary font-medium">{t('nav.myPractice')}</button>
                <button onClick={() => navigate('/search')} className="text-slate-600 hover:text-primary font-medium">{t('nav.findDoctor')}</button>
               </>
             )}
          </div>

          <div className="flex items-center space-x-3">
             {/* Language Toggle Button */}
             <button
               onClick={toggleLanguage}
               className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 hover:border-teal-400 hover:bg-teal-50 transition-all text-sm font-bold group"
               title={language === 'en' ? 'Switch to বাংলা' : 'Switch to English'}
             >
               <span className={`transition-colors ${language === 'bn' ? 'text-teal-600' : 'text-slate-400'}`}>বাং</span>
               <div className={`w-8 h-5 rounded-full p-0.5 transition-colors ${language === 'bn' ? 'bg-teal-500' : 'bg-slate-300'}`}>
                 <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${language === 'bn' ? 'translate-x-3' : 'translate-x-0'}`}></div>
               </div>
               <span className={`transition-colors ${language === 'en' ? 'text-teal-600' : 'text-slate-400'}`}>EN</span>
             </button>

             {role === UserRole.GUEST ? (
                <button 
                  onClick={() => navigate('/login')}
                  className="bg-primary hover:bg-secondary text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
                >
                  {t('nav.login')}
                </button>
             ) : (
               <div className="flex items-center gap-3">
                 <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center text-primary font-bold">
                   {role === UserRole.DOCTOR ? 'Dr' : 'Pt'}
                 </div>
                 <button 
                    onClick={onLogout}
                    className="text-sm text-red-500 hover:text-red-700 font-medium"
                 >
                   {t('nav.logout')}
                 </button>
               </div>
             )}
          </div>
        </div>
      </div>
    </nav>
  );
};
