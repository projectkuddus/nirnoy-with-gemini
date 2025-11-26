import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';

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
      if (activeTab === 'patient') {
        onLogin(UserRole.PATIENT);
      } else {
        onLogin(UserRole.DOCTOR);
      }
    }
  };

  const handleDemoLogin = (role: 'patient' | 'doctor') => {
    if (role === 'patient') {
      onLogin(UserRole.PATIENT);
    } else {
      onLogin(UserRole.DOCTOR);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-white font-black text-lg">ন</span>
            </div>
            <div className="leading-tight">
              <span className="font-black text-slate-900 text-lg tracking-tight">Nirnoy</span>
              <span className="text-[10px] text-blue-600 font-semibold block -mt-0.5 tracking-widest uppercase">Health Synchronized</span>
            </div>
          </button>
          
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <button onClick={() => navigate('/')} className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition">
              {isBn ? 'হোম' : 'Home'}
            </button>
          </div>
        </div>
      </header>

      <div className="pt-24 pb-12 px-4 flex items-center justify-center min-h-screen">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
          {/* Header Tabs */}
          <div className="flex border-b border-slate-100">
            <button
              type="button"
              className={`flex-1 py-4 text-sm font-bold text-center transition-all ${
                activeTab === 'patient' 
                  ? 'bg-gradient-to-br from-teal-50 to-cyan-50 text-teal-600 border-b-2 border-teal-500' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
              onClick={() => { setActiveTab('patient'); setStep('phone'); }}
            >
              <i className="fas fa-user mr-2"></i>
              {isBn ? 'রোগী' : 'Patient'}
            </button>
            <button
              type="button"
              className={`flex-1 py-4 text-sm font-bold text-center transition-all ${
                activeTab === 'doctor' 
                  ? 'bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 border-b-2 border-blue-500' 
                  : 'text-slate-500 hover:bg-slate-50'
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
              <div className={`h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl shadow-lg ${
                activeTab === 'patient' 
                  ? 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white' 
                  : 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white'
              }`}>
                <i className={`fas ${activeTab === 'patient' ? 'fa-user' : 'fa-user-md'}`}></i>
              </div>
              <h2 className="text-2xl font-black text-slate-800">
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

            <form onSubmit={handleSubmit} className="space-y-5">
              {step === 'phone' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                    {isBn ? 'মোবাইল নম্বর' : 'Mobile Number'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">+880</span>
                    <input 
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      className="w-full pl-16 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      placeholder="01712345678"
                      required
                      autoFocus
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                    {isBn ? 'OTP দিন' : 'Enter OTP'}
                  </label>
                  <input 
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center tracking-widest text-xl font-bold"
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
                className={`w-full font-bold py-3.5 rounded-xl shadow-lg transition-all transform active:scale-95 ${
                  activeTab === 'patient' 
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-teal-500/30'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-blue-500/30'
                }`}
              >
                {step === 'phone' ? (isBn ? 'OTP পাঠান' : 'Get OTP') : (isBn ? 'যাচাই করুন' : 'Verify & Login')}
              </button>
              
              {step === 'otp' && (
                <button 
                  type="button" 
                  onClick={() => setStep('phone')}
                  className="w-full text-slate-400 text-sm hover:text-slate-600 transition"
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
                  className="flex-1 py-2.5 px-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-sm font-medium rounded-xl hover:from-teal-600 hover:to-cyan-600 transition flex items-center justify-center gap-2 shadow-lg"
                >
                  <i className="fas fa-user"></i>
                  {isBn ? 'রোগী ডেমো' : 'Patient Demo'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin('doctor')}
                  className="flex-1 py-2.5 px-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-medium rounded-xl hover:from-blue-600 hover:to-indigo-600 transition flex items-center justify-center gap-2 shadow-lg"
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
    </div>
  );
};
