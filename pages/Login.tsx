
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface LoginProps {
  onLogin: (role: UserRole) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';
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

  // Quick demo login
  const handleDemoLogin = (role: 'patient' | 'doctor') => {
    if (role === 'patient') {
      onLogin(UserRole.PATIENT);
    } else {
      onLogin(UserRole.DOCTOR);
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
            <i className="fas fa-user mr-2"></i>
            {isBn ? 'রোগী' : 'Patient'}
          </button>
          <button
            type="button"
            className={`flex-1 py-4 text-sm font-bold text-center transition-colors ${
              activeTab === 'doctor' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500' : 'text-slate-500 hover:bg-slate-50'
            }`}
            onClick={() => { setActiveTab('doctor'); setStep('phone'); }}
          >
            <i className="fas fa-user-md mr-2"></i>
            {isBn ? 'ডাক্তার' : 'Doctor'}
          </button>
        </div>

        {/* Body */}
        <div className="p-8">
          <div className="text-center mb-8">
             <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl ${
               activeTab === 'patient' ? 'bg-teal-100 text-teal-600' : 'bg-blue-100 text-blue-600'
             }`}>
               <i className={`fas ${activeTab === 'patient' ? 'fa-user' : 'fa-user-md'}`}></i>
             </div>
             <h2 className="text-2xl font-bold text-slate-800">
               {activeTab === 'patient' 
                 ? (isBn ? 'রোগী লগইন' : 'Patient Login')
                 : (isBn ? 'ডাক্তার পোর্টাল' : "Doctor's Portal")}
             </h2>
             <p className="text-slate-500 text-sm mt-2">
               {activeTab === 'patient' 
                 ? (isBn ? 'আপনার স্বাস্থ্য রেকর্ড ও অ্যাপয়েন্টমেন্ট দেখুন' : 'Access your health records & appointments')
                 : (isBn ? 'আপনার প্র্যাক্টিস ও রোগীদের পরিচালনা করুন' : 'Manage your practice & patients')}
             </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 'phone' ? (
              <div className="animate-fade-in">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                  {isBn ? 'মোবাইল নম্বর' : 'Mobile Number'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400">+880</span>
                  <input 
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    className="w-full pl-14 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
                    placeholder="01712345678"
                    required
                    autoFocus
                  />
                </div>
              </div>
            ) : (
               <div className="animate-fade-in">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                  {isBn ? 'OTP দিন' : 'Enter OTP'}
                </label>
                <input 
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none text-center tracking-widest text-xl font-bold"
                  placeholder="• • • • • •"
                  autoFocus
                  required
                />
                <p className="text-xs text-center text-slate-400 mt-2">
                  {isBn ? `+880 ${phone} তে OTP পাঠানো হয়েছে` : `OTP sent to +880 ${phone}`}
                </p>
              </div>
            )}

            <button 
              type="submit"
              className={`w-full font-bold py-3 rounded-xl shadow-lg transition-all transform active:scale-95 mt-4 ${
                activeTab === 'patient' 
                  ? 'bg-teal-500 hover:bg-teal-600 text-white shadow-teal-500/20'
                  : 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/20'
              }`}
            >
              {step === 'phone' ? (isBn ? 'OTP পাঠান' : 'Get OTP') : (isBn ? 'যাচাই করুন' : 'Verify & Login')}
            </button>
            
            {step === 'otp' && (
               <button 
                 type="button" 
                 onClick={() => setStep('phone')}
                 className="w-full text-slate-400 text-xs hover:text-slate-600"
               >
                 {isBn ? 'নম্বর পরিবর্তন করুন' : 'Change Number'}
               </button>
            )}
          </form>

          {/* Registration Links */}
          {activeTab === 'patient' && step === 'phone' && (
            <div className="mt-6 text-center">
              <p className="text-slate-500 text-sm">
                {isBn ? 'নতুন ব্যবহারকারী?' : 'New user?'}{' '}
                <button
                  type="button"
                  onClick={() => navigate('/patient-auth')}
                  className="text-teal-600 font-bold hover:text-teal-700 transition"
                >
                  {isBn ? 'রেজিস্টার করুন' : 'Register here'}
                </button>
              </p>
            </div>
          )}
          
          {activeTab === 'doctor' && step === 'phone' && (
            <div className="mt-6 text-center">
              <p className="text-slate-500 text-sm mb-2">
                {isBn ? 'নতুন ডাক্তার?' : 'New Doctor?'}
              </p>
              <button
                type="button"
                onClick={() => navigate('/doctor-registration')}
                className="text-blue-600 font-bold hover:text-blue-700 transition flex items-center justify-center gap-2 mx-auto"
              >
                <i className="fas fa-user-plus"></i>
                {isBn ? 'নির্ণয় কেয়ারে যোগ দিন' : 'Join Nirnoy Care'}
              </button>
            </div>
          )}

          {/* Demo Quick Login */}
          <div className="mt-8 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200">
            <p className="font-bold text-amber-800 text-sm mb-3 flex items-center gap-2">
              <i className="fas fa-bolt"></i>
              {isBn ? 'দ্রুত ডেমো লগইন' : 'Quick Demo Login'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('patient')}
                className="flex-1 py-2 px-3 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition flex items-center justify-center gap-2"
              >
                <i className="fas fa-user"></i>
                {isBn ? 'রোগী ডেমো' : 'Patient Demo'}
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('doctor')}
                className="flex-1 py-2 px-3 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition flex items-center justify-center gap-2"
              >
                <i className="fas fa-user-md"></i>
                {isBn ? 'ডাক্তার ডেমো' : 'Doctor Demo'}
              </button>
            </div>
            <p className="text-xs text-amber-700 mt-2 text-center">
              {isBn ? 'একটি ক্লিকেই সরাসরি ড্যাশবোর্ডে যান' : 'Go directly to dashboard with one click'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
