import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import LanguageToggle from '../components/LanguageToggle';

interface LoginProps {
  onLogin: (role: UserRole) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, isLoading } = useAuth();
  const isBn = language === 'bn';
  const [activeTab, setActiveTab] = useState<'patient' | 'doctor'>('patient');

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'PATIENT') {
        navigate('/patient-dashboard');
      } else if (user.role === 'DOCTOR') {
        navigate('/doctor-dashboard');
      }
    }
  }, [user, isLoading, navigate]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">{isBn ? 'লোড হচ্ছে...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  const handleContinue = () => {
    if (activeTab === 'patient') {
      navigate('/patient-auth');
    } else {
      navigate('/doctor-registration');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/30">
              <span className="text-white font-black text-lg">ন</span>
            </div>
            <div className="leading-tight text-left">
              <span className="font-black text-slate-900 text-lg tracking-tight">নির্ণয়</span>
              <span className="text-[10px] text-teal-600 font-semibold block -mt-0.5 tracking-widest uppercase">Health Synchronized</span>
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
                  ? 'bg-gradient-to-br from-teal-50 to-emerald-50 text-teal-600 border-b-2 border-teal-500' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
              onClick={() => setActiveTab('patient')}
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
              onClick={() => setActiveTab('doctor')}
            >
              <i className="fas fa-user-md mr-2"></i>
              {isBn ? 'ডাক্তার' : 'Doctor'}
            </button>
          </div>

          {/* Body */}
          <div className="p-8">
            <div className="text-center mb-8">
              <div className={`h-20 w-20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg ${
                activeTab === 'patient' 
                  ? 'bg-gradient-to-br from-teal-500 to-emerald-500 text-white' 
                  : 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white'
              }`}>
                <i className={`fas ${activeTab === 'patient' ? 'fa-user' : 'fa-user-md'}`}></i>
              </div>
              <h2 className="text-2xl font-black text-slate-800">
                {activeTab === 'patient' 
                  ? (isBn ? 'রোগী পোর্টাল' : 'Patient Portal')
                  : (isBn ? 'ডাক্তার পোর্টাল' : "Doctor's Portal")}
              </h2>
              <p className="text-slate-500 text-sm mt-2">
                {activeTab === 'patient' 
                  ? (isBn ? 'আপনার স্বাস্থ্য রেকর্ড ও AI সহকারী' : 'Your health records & AI assistant')
                  : (isBn ? 'আপনার প্র্যাক্টিস ও রোগীদের পরিচালনা' : 'Manage your practice & patients')}
              </p>
            </div>

            {/* Features */}
            <div className="space-y-3 mb-8">
              {activeTab === 'patient' ? (
                <>
                  <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-xl">
                    <span className="text-xl">🤖</span>
                    <span className="text-sm text-teal-800">{isBn ? 'AI স্বাস্থ্য সহকারী' : 'AI Health Assistant'}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-xl">
                    <span className="text-xl">📋</span>
                    <span className="text-sm text-teal-800">{isBn ? 'সম্পূর্ণ স্বাস্থ্য রেকর্ড' : 'Complete Health Records'}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-xl">
                    <span className="text-xl">👨‍⚕️</span>
                    <span className="text-sm text-teal-800">{isBn ? 'ডাক্তার অ্যাপয়েন্টমেন্ট' : 'Doctor Appointments'}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                    <span className="text-xl">🏥</span>
                    <span className="text-sm text-blue-800">{isBn ? 'রোগী ব্যবস্থাপনা' : 'Patient Management'}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                    <span className="text-xl">📅</span>
                    <span className="text-sm text-blue-800">{isBn ? 'অ্যাপয়েন্টমেন্ট সিস্টেম' : 'Appointment System'}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                    <span className="text-xl">💊</span>
                    <span className="text-sm text-blue-800">{isBn ? 'প্রেসক্রিপশন জেনারেটর' : 'Prescription Generator'}</span>
                  </div>
                </>
              )}
            </div>

            {/* Continue Button */}
            <button 
              onClick={handleContinue}
              className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] active:scale-95 text-lg ${
                activeTab === 'patient' 
                  ? 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-teal-500/30'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-blue-500/30'
              }`}
            >
              {activeTab === 'patient' 
                ? (isBn ? 'লগইন / রেজিস্টার করুন' : 'Login / Register')
                : (isBn ? 'ডাক্তার লগইন / রেজিস্টার' : 'Doctor Login / Register')}
            </button>

            {/* Info */}
            <div className="mt-6 text-center">
              <p className="text-xs text-slate-400">
                {isBn 
                  ? 'মোবাইল নম্বর দিয়ে লগইন করুন। নতুন হলে অ্যাকাউন্ট তৈরি হবে।' 
                  : 'Login with mobile number. New users will create an account.'}
              </p>
            </div>

            {/* Test Mode Info */}
            <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-xs text-amber-700 text-center">
                <span className="font-bold">🧪 {isBn ? 'টেস্ট মোড' : 'Test Mode'}:</span>{' '}
                {isBn ? 'OTP হিসেবে 000000 ব্যবহার করুন' : 'Use 000000 as OTP'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
