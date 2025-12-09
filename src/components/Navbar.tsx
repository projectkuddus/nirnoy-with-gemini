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
    <header className="relative z-50 glass-strong border-b border-white/40">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <button onClick={() => navigate('/')} className="flex items-center gap-3 group">
          <div className="w-10 h-10 glass-card rounded-xl flex items-center justify-center border border-blue-200/40 group-hover:shadow-lg transition">
            <span className="text-blue-500 font-black text-lg">ন</span>
          </div>
          <div className="leading-tight text-left">
            <span className="font-black text-slate-700 text-lg tracking-tight">{t('brand.name')}</span>
            <span className="text-[10px] text-blue-500 font-semibold block -mt-0.5 tracking-widest uppercase">{t('brand.tagline')}</span>
          </div>
        </button>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          <button 
            onClick={() => navigate('/search')}
            className={`text-sm font-semibold transition px-3 py-1.5 rounded-lg ${isActive('/search') ? 'text-blue-600 glass-subtle' : 'text-slate-500 hover:text-slate-700 hover:glass-subtle'}`}
          >
            {t('nav.findDoctor')}
          </button>

          {userRole === UserRole.PATIENT && (
            <>
              <button 
                onClick={() => navigate('/patient-dashboard')}
                className={`text-sm font-semibold transition px-3 py-1.5 rounded-lg ${isActive('/my-health') || isActive('/patient-dashboard') ? 'text-blue-600 glass-subtle' : 'text-slate-500 hover:text-slate-700 hover:glass-subtle'}`}
              >
                {t('nav.myHealth')}
              </button>
              <button 
                onClick={() => navigate('/patient-dashboard')}
                className={`text-sm font-semibold transition px-3 py-1.5 rounded-lg ${isActive('/patient-dashboard') ? 'text-blue-600 glass-subtle' : 'text-slate-500 hover:text-slate-700 hover:glass-subtle'}`}
              >
                {t('nav.appointments')}
              </button>
            </>
          )}

          {userRole === UserRole.DOCTOR && (
            <button 
              onClick={() => navigate('/doctor-dashboard')}
              className={`text-sm font-semibold transition px-3 py-1.5 rounded-lg ${isActive('/doctor-dashboard') || isActive('/my-practice') ? 'text-blue-600 glass-subtle' : 'text-slate-500 hover:text-slate-700 hover:glass-subtle'}`}
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
                className="flex items-center gap-2 px-3 py-1.5 glass rounded-full hover:glass-strong transition border border-white/50"
              >
                <div className="w-6 h-6 glass-card rounded-full flex items-center justify-center text-blue-500 text-xs font-bold border border-blue-200/40">
                  {user.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <span className="text-sm font-medium text-slate-600 hidden sm:block max-w-[100px] truncate">
                  {user.name}
                </span>
              </button>
              <button 
                onClick={handleLogout}
                className="text-sm font-semibold text-slate-400 hover:text-red-500 transition p-2 rounded-lg hover:glass-subtle"
              >
                <i className="fas fa-sign-out-alt"></i>
              </button>
            </div>
          ) : (
            <button 
              onClick={() => navigate('/login')}
              className="px-4 py-2 btn-glass-primary rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition"
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
