import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageToggle from './LanguageToggle';

interface PageHeaderProps {
  title?: string;
  showNav?: boolean;
  showGetStarted?: boolean;
  showBack?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ 
  title,
  showNav = false, 
  showGetStarted = false,
  showBack = false,
}) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBack && (
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition">
              <i className="fas fa-arrow-left text-slate-600"></i>
            </button>
          )}
          <button onClick={() => navigate('/')} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-white font-black text-lg">ন</span>
            </div>
            <div className="leading-tight text-left">
              <span className="font-black text-slate-900 text-lg tracking-tight">Nirnoy</span>
              <span className="text-[10px] text-blue-600 font-semibold block -mt-0.5 tracking-widest uppercase">Health Synchronized</span>
            </div>
          </button>
          {title && (
            <div className="hidden md:block pl-4 border-l border-slate-200">
              <span className="font-bold text-slate-800">{title}</span>
            </div>
          )}
        </div>
        
        {showNav && (
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => navigate('/search')} className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition">
              {isBn ? 'ডাক্তার' : 'Doctors'}
            </button>
            <button onClick={() => navigate('/patient-dashboard')} className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition">
              {isBn ? 'অ্যাপয়েন্টমেন্ট' : 'Appointments'}
            </button>
            <button onClick={() => navigate('/about')} className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition">
              {isBn ? 'সম্পর্কে' : 'About'}
            </button>
          </nav>
        )}

        <div className="flex items-center gap-3">
          <LanguageToggle />
          {showGetStarted ? (
            <button onClick={() => navigate('/patient-auth')} className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-bold rounded-xl hover:from-blue-600 hover:to-indigo-600 transition shadow-lg shadow-blue-500/25">
              {isBn ? 'শুরু করুন' : 'Get Started'}
            </button>
          ) : (
            <button onClick={() => navigate('/login')} className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition">
              {isBn ? 'লগইন' : 'Login'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default PageHeader;

