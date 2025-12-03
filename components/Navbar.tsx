import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import LanguageToggle from './LanguageToggle';

interface NavbarProps {
  userRole?: UserRole;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ userRole: propUserRole, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { user, logout, isAuthenticated } = useAuth();
  
  // Determine user role from AuthContext or props
  const userRole = propUserRole || (user?.role === 'PATIENT' ? UserRole.PATIENT : user?.role === 'DOCTOR' ? UserRole.DOCTOR : UserRole.GUEST);

  const handleLogout = () => {
    logout();
    if (onLogout) onLogout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => navigate('/')} className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
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
                onClick={() => navigate('/patient-dashboard')}
                className={`text-sm font-semibold transition ${isActive('/my-health') || isActive('/patient-dashboard') ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {t('nav.myHealth')}
              </button>
              <button 
                onClick={() => navigate('/patient-dashboard')}
                className={`text-sm font-semibold transition ${isActive('/patient-dashboard') ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {t('nav.appointments')}
              </button>
            </>
          )}

          {userRole === UserRole.DOCTOR && (
            <button 
              onClick={() => navigate('/doctor-dashboard')}
              className={`text-sm font-semibold transition ${isActive('/doctor-dashboard') || isActive('/my-practice') ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {t('nav.myPractice')}
            </button>
          )}
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          <LanguageToggle />
          
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate(user.role === 'DOCTOR' ? '/doctor-dashboard' : '/patient-dashboard')}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full hover:bg-slate-200 transition"
              >
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {user.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <span className="text-sm font-medium text-slate-700 hidden sm:block max-w-[100px] truncate">
                  {user.name}
                </span>
              </button>
              <button 
                onClick={handleLogout}
                className="text-sm font-semibold text-slate-500 hover:text-red-600 transition"
              >
                <i className="fas fa-sign-out-alt"></i>
              </button>
            </div>
          ) : (
            <button 
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 hover:shadow-xl transition"
            >
              {t('nav.login')}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
