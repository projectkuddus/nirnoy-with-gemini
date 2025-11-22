
import React from 'react';
import { UserRole } from '../types';

interface NavbarProps {
  role: UserRole;
  onLogout: () => void;
  navigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ role, onLogout, navigate }) => {
  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-2">
              <i className="fas fa-heartbeat text-white"></i>
            </div>
            <span className="font-bold text-xl text-slate-800 tracking-tight">Nirnoy Care</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-6">
             {role === UserRole.GUEST && (
               <>
                <button onClick={() => navigate('/search')} className="text-slate-600 hover:text-primary font-medium">Find a Doctor</button>
                <button onClick={() => navigate('/login')} className="text-slate-600 hover:text-primary font-medium">For Doctors</button>
               </>
             )}
             {role === UserRole.PATIENT && (
               <>
                 <button onClick={() => navigate('/patient-dashboard')} className="text-slate-600 hover:text-primary font-medium">My Dashboard</button>
                 <button onClick={() => navigate('/search')} className="text-slate-600 hover:text-primary font-medium">Book Appointment</button>
               </>
             )}
             {role === UserRole.DOCTOR && (
               <>
                <button onClick={() => navigate('/doctor-dashboard')} className="text-slate-600 hover:text-primary font-medium">My Practice</button>
                <button onClick={() => navigate('/search')} className="text-slate-600 hover:text-primary font-medium">Find a Doctor</button>
               </>
             )}
          </div>

          <div className="flex items-center space-x-4">
             {role === UserRole.GUEST ? (
                <button 
                  onClick={() => navigate('/login')}
                  className="bg-primary hover:bg-secondary text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
                >
                  Login / Signup
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
                   Logout
                 </button>
               </div>
             )}
          </div>
        </div>
      </div>
    </nav>
  );
};
