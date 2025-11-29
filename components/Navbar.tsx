import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { UserRole } from '../types';
import LanguageToggle from './LanguageToggle';

interface NavbarProps {
  userRole: UserRole;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ userRole, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => navigate('/')} className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <span className="text-white font-black text-lg">ন</span>
          </div>
          <div className="leading-tight text-left">
            <span className="font-black text-slate-900 text-lg tracking-tight">{t('brand.name')}</span>
            <span className="text-[10px] text-blue-600 font-semibold block -mt-0.5 tracking-widest uppercase">{t('brand.tagline')}</span>
          </div>
        </button>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          <button 
            onClick={() => navigate('/search')}
            className={`text-sm font-semibold transition ${isActive('/search') ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
          >
            {t('nav.findDoctor')}
          </button>

          {userRole === UserRole.PATIENT && (
            <>
              <button 
                onClick={() => navigate('/my-health')}
                className={`text-sm font-semibold transition ${isActive('/my-health') || isActive('/patient-dashboard') ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {t('nav.myHealth')}
              </button>
              <button 
                onClick={() => navigate('/family')}
                className={`text-sm font-semibold transition ${isActive('/family') ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {t('nav.family')}
              </button>
              <button 
                onClick={() => navigate('/my-appointments')}
                className={`text-sm font-semibold transition ${isActive('/my-appointments') ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {t('nav.appointments')}
              </button>
            </>
          )}

          {userRole === UserRole.DOCTOR && (
            <button 
              onClick={() => navigate('/doctor-dashboard')}
              className={`text-sm font-semibold transition ${isActive('/doctor-dashboard') ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {t('nav.myPractice')}
            </button>
          )}

          {userRole === UserRole.GUEST && (
            <button 
              onClick={() => navigate('/login')}
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              {t('nav.forDoctors')}
            </button>
          )}
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          <LanguageToggle />
          
          {userRole === UserRole.GUEST ? (
            <button
              onClick={() => navigate('/patient-auth')}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-bold rounded-xl hover:from-blue-600 hover:to-indigo-600 transition shadow-lg shadow-blue-500/25"
            >
              {t('nav.getStarted')}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                <i className={`fas ${userRole === UserRole.DOCTOR ? 'fa-user-md' : 'fa-user'} text-blue-600`}></i>
              </div>
              <button
                onClick={onLogout}
                className="text-sm font-semibold text-red-500 hover:text-red-600 transition"
              >
                {t('nav.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;



