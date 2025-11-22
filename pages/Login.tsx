
import React, { useState } from 'react';
import { UserRole } from '../types';

interface LoginProps {
  onLogin: (role: UserRole) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<'patient' | 'doctor'>('patient');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'phone') {
      if (phone.length > 0) setStep('otp');
    } else {
      // Simulate Verification
      if (activeTab === 'patient') {
        onLogin(UserRole.PATIENT);
      } else {
        onLogin(UserRole.DOCTOR);
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="flex border-b border-slate-100">
          <button
            type="button"
            className={`flex-1 py-4 text-sm font-bold text-center transition-colors ${
              activeTab === 'patient' ? 'bg-teal-50 text-primary border-b-2 border-primary' : 'text-slate-500 hover:bg-slate-50'
            }`}
            onClick={() => { setActiveTab('patient'); setStep('phone'); }}
          >
            Patient Login
          </button>
          <button
            type="button"
            className={`flex-1 py-4 text-sm font-bold text-center transition-colors ${
              activeTab === 'doctor' ? 'bg-teal-50 text-primary border-b-2 border-primary' : 'text-slate-500 hover:bg-slate-50'
            }`}
            onClick={() => { setActiveTab('doctor'); setStep('phone'); }}
          >
            Doctor Login
          </button>
        </div>

        {/* Body */}
        <div className="p-8">
          <div className="text-center mb-8">
             <div className="h-16 w-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl text-primary">
               <i className={`fas ${activeTab === 'patient' ? 'fa-user' : 'fa-user-md'}`}></i>
             </div>
             <h2 className="text-2xl font-bold text-slate-800">
               {activeTab === 'patient' ? 'Welcome Back' : 'Doctor\'s Portal'}
             </h2>
             <p className="text-slate-500 text-sm mt-2">
               {activeTab === 'patient' 
                 ? 'Access your prescriptions, appointments, and history.' 
                 : 'Manage your practice, chambers, and patients.'}
             </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 'phone' ? (
              <div className="animate-fade-in">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Mobile Number</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400">+880</span>
                  <input 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-14 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                    placeholder="1XXXXXXXXX"
                    required
                    autoFocus
                  />
                </div>
              </div>
            ) : (
               <div className="animate-fade-in">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Enter OTP</label>
                <input 
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none text-center tracking-widest text-xl font-bold"
                  placeholder="• • • •"
                  autoFocus
                  required
                />
                <p className="text-xs text-center text-slate-400 mt-2">OTP sent to +880 {phone}</p>
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-primary hover:bg-secondary text-white font-bold py-3 rounded-xl shadow-lg shadow-teal-500/20 transition-all transform active:scale-95 mt-4"
            >
              {step === 'phone' ? 'Get OTP' : 'Verify & Login'}
            </button>
            
            {step === 'otp' && (
               <button 
                 type="button" 
                 onClick={() => setStep('phone')}
                 className="w-full text-slate-400 text-xs hover:text-slate-600"
               >
                 Change Number
               </button>
            )}
          </form>

          {/* Demo Hints */}
          <div className="mt-8 p-3 bg-yellow-50 rounded-lg border border-yellow-100 text-xs text-yellow-800">
            <p className="font-bold mb-1"><i className="fas fa-info-circle mr-1"></i> Demo Credentials:</p>
            <p>Use any number. OTP is not checked.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
