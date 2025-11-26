import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

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

export default LanguageToggle;

