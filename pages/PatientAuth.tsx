import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import LanguageToggle from '../components/LanguageToggle';

type AuthStep = 'phone' | 'otp' | 'register' | 'success';

interface PatientAuthProps {
  onLogin?: (role: 'PATIENT') => void;
}

export const PatientAuth: React.FC<PatientAuthProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { sendOTP, verifyOTP, registerPatient, user, isLoading: authLoading } = useAuth();
  const isBn = language === 'bn';

  // State
  const [step, setStep] = useState<AuthStep>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [generatedOtp, setGeneratedOtp] = useState('');
  
  // Registration fields
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  // Default DOB to today (user will change to their actual birth date)
  const todayDate = new Date();
  const [dobYear, setDobYear] = useState(String(todayDate.getFullYear()));
  const [dobMonth, setDobMonth] = useState(String(todayDate.getMonth() + 1).padStart(2, '0'));
  const [dobDay, setDobDay] = useState(String(todayDate.getDate()).padStart(2, '0'));
  const [bloodGroup, setBloodGroup] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Calculate date limits for DOB
  const today = new Date();
  const currentYear = today.getFullYear();
  
  // Generate year options (from current year to 120 years ago)
  const yearOptions = Array.from({ length: 120 }, (_, i) => currentYear - i);
  
  // Generate month options
  const monthOptions = [
    { value: '01', label: isBn ? 'জানুয়ারি' : 'January' },
    { value: '02', label: isBn ? 'ফেব্রুয়ারি' : 'February' },
    { value: '03', label: isBn ? 'মার্চ' : 'March' },
    { value: '04', label: isBn ? 'এপ্রিল' : 'April' },
    { value: '05', label: isBn ? 'মে' : 'May' },
    { value: '06', label: isBn ? 'জুন' : 'June' },
    { value: '07', label: isBn ? 'জুলাই' : 'July' },
    { value: '08', label: isBn ? 'আগস্ট' : 'August' },
    { value: '09', label: isBn ? 'সেপ্টেম্বর' : 'September' },
    { value: '10', label: isBn ? 'অক্টোবর' : 'October' },
    { value: '11', label: isBn ? 'নভেম্বর' : 'November' },
    { value: '12', label: isBn ? 'ডিসেম্বর' : 'December' },
  ];
  
  // Generate day options based on selected month/year
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };
  
  const maxDays = dobYear && dobMonth 
    ? getDaysInMonth(parseInt(dobYear), parseInt(dobMonth)) 
    : 31;
  const dayOptions = Array.from({ length: maxDays }, (_, i) => String(i + 1).padStart(2, '0'));
  
  // Combine into dateOfBirth format
  const dateOfBirth = dobYear && dobMonth && dobDay 
    ? `${dobYear}-${dobMonth}-${dobDay}` 
    : '';
  
  // Check if user is under 12 (kid account)
  const isKidAccount = dobYear ? (currentYear - parseInt(dobYear)) < 12 : false;

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Translations
  const t = {
    title: isBn ? 'নির্ণয়তে স্বাগতম' : 'Welcome to Nirnoy',
    subtitle: isBn ? 'আপনার স্বাস্থ্য, আপনার হাতে' : 'Your health, in your hands',
    phoneTitle: isBn ? 'মোবাইল নম্বর দিন' : 'Enter Mobile Number',
    phoneSubtitle: isBn ? 'আমরা একটি OTP পাঠাব' : 'We will send you an OTP',
    phonePlaceholder: isBn ? '০১৭XXXXXXXX' : '01712345678',
    sendOtp: isBn ? 'OTP পাঠান' : 'Send OTP',
    otpTitle: isBn ? 'OTP যাচাই করুন' : 'Verify OTP',
    otpSubtitle: isBn ? 'আপনার মোবাইলে পাঠানো ৬ সংখ্যার কোড দিন' : 'Enter 6-digit code sent to your mobile',
    verify: isBn ? 'যাচাই করুন' : 'Verify',
    resend: isBn ? 'আবার পাঠান' : 'Resend',
    resendIn: isBn ? 'সেকেন্ড পর আবার পাঠাতে পারবেন' : 'seconds to resend',
    registerTitle: isBn ? 'প্রোফাইল তৈরি করুন' : 'Create Your Profile',
    registerSubtitle: isBn ? 'আপনার তথ্য দিন - এই অ্যাকাউন্ট আজীবনের জন্য' : 'Fill in your details - This account is for life',
    nameLabel: isBn ? 'পুরো নাম *' : 'Full Name *',
    namePlaceholder: isBn ? 'আপনার নাম লিখুন' : 'Enter your name',
    genderLabel: isBn ? 'লিঙ্গ *' : 'Gender *',
    male: isBn ? 'পুরুষ' : 'Male',
    female: isBn ? 'মহিলা' : 'Female',
    dobLabel: isBn ? 'জন্ম তারিখ *' : 'Date of Birth *',
    bloodLabel: isBn ? 'রক্তের গ্রুপ' : 'Blood Group',
    emergencyLabel: isBn ? 'জরুরি যোগাযোগ নম্বর' : 'Emergency Contact',
    emergencyPlaceholder: isBn ? 'পরিবারের কারো নম্বর' : 'Family member number',
    complete: isBn ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account',
    successTitle: isBn ? 'স্বাগতম! 🎉' : 'Welcome! 🎉',
    successSubtitle: isBn ? 'আপনার অ্যাকাউন্ট তৈরি হয়েছে' : 'Your account has been created',
    goToDashboard: isBn ? 'ড্যাশবোর্ডে যান' : 'Go to Dashboard',
    findDoctor: isBn ? 'ডাক্তার খুঁজুন' : 'Find Doctor',
    invalidPhone: isBn ? 'সঠিক মোবাইল নম্বর দিন' : 'Enter valid mobile number',
    invalidOtp: isBn ? 'সঠিক OTP দিন' : 'Enter valid OTP',
    back: isBn ? 'পিছনে' : 'Back',
    terms: isBn ? 'এগিয়ে গিয়ে আপনি আমাদের শর্তাবলী মেনে নিচ্ছেন' : 'By continuing, you agree to our Terms & Conditions',
    welcomeBonus: isBn ? '🎁 ১০০ ক্রেডিট বোনাস পাবেন!' : '🎁 Get 100 credits bonus!',
    lifeAccount: isBn ? '💚 এই অ্যাকাউন্ট আপনার আজীবনের স্বাস্থ্য সঙ্গী' : '💚 This account is your lifelong health companion',
  };

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user && user.role === 'PATIENT') {
      navigate('/patient-dashboard');
    }
  }, [user, authLoading, navigate]);

  // Validate phone
  const isValidPhone = (p: string) => {
    const digits = p.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11;
  };

  // Handle phone submission
  const handlePhoneSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    console.log('handlePhoneSubmit called, phone:', phone);
    
    if (!isValidPhone(phone)) {
      setError(t.invalidPhone);
      return;
    }
    setError('');
    setIsLoading(true);
    
    try {
      const result = await sendOTP(phone);
      console.log('sendOTP result:', result);
      
      if (result.success) {
        setGeneratedOtp(result.otp || '');
        setStep('otp');
        setCountdown(60);
      } else {
        setError(result.error || 'Failed to send OTP');
      }
    } catch (err: any) {
      console.error('sendOTP error:', err);
      setError(err.message || 'An error occurred');
    }
    
    setIsLoading(false);
  };

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6);
      const newOtp = [...otp];
      digits.split('').forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setOtp(newOtp);
      if (digits.length === 6) {
        otpRefs.current[5]?.focus();
      }
      return;
    }
    
    const newOtp = [...otp];
    newOtp[index] = value.replace(/\D/g, '');
    setOtp(newOtp);
    
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP backspace
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Handle OTP verification
  const handleOtpSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const otpValue = otp.join('');
    console.log('handleOtpSubmit called, otp:', otpValue);
    
    if (otpValue.length !== 6) {
      setError(t.invalidOtp);
      return;
    }
    setError('');
    setIsLoading(true);
    
    try {
      const result = await verifyOTP(phone, otpValue);
      console.log('verifyOTP result:', result);
      
      if (result.success) {
        if (result.isNewUser) {
          setIsNewUser(true);
          setStep('register');
        } else {
          // Existing user - logged in
          if (onLogin) onLogin('PATIENT');
          setStep('success');
        }
      } else {
        setError(result.error || 'Invalid OTP');
      }
    } catch (err: any) {
      console.error('verifyOTP error:', err);
      setError(err.message || 'An error occurred');
    }
    
    setIsLoading(false);
  };

  // Handle registration
  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    console.log('handleRegister called', { name, gender, dateOfBirth });
    
    if (!name.trim() || !gender || !dateOfBirth) {
      setError(isBn ? 'নাম, লিঙ্গ ও জন্ম তারিখ আবশ্যক' : 'Name, gender and date of birth required');
      return;
    }
    setError('');
    setIsLoading(true);
    
    try {
      const result = await registerPatient({
        phone,
        name: name.trim(),
        gender: gender as 'male' | 'female',
        dateOfBirth,
        bloodGroup: bloodGroup || undefined,
        emergencyContact: emergencyContact ? {
          name: '',
          relation: '',
          phone: emergencyContact,
        } : undefined,
      });
      
      console.log('registerPatient result:', result);
      
      if (result.success) {
        if (onLogin) onLogin('PATIENT');
        setStep('success');
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err: any) {
      console.error('registerPatient error:', err);
      setError(err.message || 'An error occurred');
    }
    
    setIsLoading(false);
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setIsLoading(true);
    
    const result = await sendOTP(phone);
    
    if (result.success) {
      setGeneratedOtp(result.otp || '');
      setCountdown(60);
      setOtp(['', '', '', '', '', '']);
    }
    
    setIsLoading(false);
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">{isBn ? 'লোড হচ্ছে...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <span className="text-white font-black text-lg">ন</span>
            </div>
            <div className="leading-tight text-left">
              <span className="font-black text-slate-900 text-lg tracking-tight">Nirnoy</span>
              <span className="text-[10px] text-blue-600 font-semibold block -mt-0.5 tracking-widest uppercase">Health Synchronized</span>
            </div>
          </button>
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <button onClick={() => navigate('/')} className="text-slate-600 hover:text-slate-900 font-medium">
              {isBn ? 'হোম' : 'Home'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center pt-24 pb-12 px-6">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/30">
              <span className="text-white font-black text-2xl">ন</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900">{t.title}</h1>
            <p className="text-slate-500 mt-1">{t.subtitle}</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
            {/* Phone Step */}
            {step === 'phone' && (
              <form onSubmit={handlePhoneSubmit} className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-900">{t.phoneTitle}</h2>
                  <p className="text-slate-500 text-sm mt-1">{t.phoneSubtitle}</p>
                </div>

                <div>
                  <div className="flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-3">
                    <span className="text-slate-400">🇧🇩</span>
                    <span className="text-slate-400 font-medium">+880</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 11)); setError(''); }}
                      placeholder={t.phonePlaceholder}
                      className="flex-1 bg-transparent text-white font-medium outline-none placeholder:text-slate-500"
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !phone}
                  className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {t.sendOtp}
                      <i className="fas fa-arrow-right"></i>
                    </>
                  )}
                </button>

                <p className="text-xs text-slate-400 text-center">{t.terms}</p>
              </form>
            )}

            {/* OTP Step */}
            {step === 'otp' && (
              <form onSubmit={handleOtpSubmit} className="space-y-6">
                <button type="button" onClick={() => setStep('phone')} className="text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1">
                  <i className="fas fa-arrow-left"></i> {t.back}
                </button>

                <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-900">{t.otpTitle}</h2>
                  <p className="text-slate-500 text-sm mt-1">{t.otpSubtitle}</p>
                  <p className="text-sm text-blue-600 font-medium mt-2">+880 {phone}</p>
                  
                  {/* TEST MODE: Show OTP */}
                  {generatedOtp && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-600 font-medium">🧪 টেস্ট মোড / Test Mode</p>
                      <p className="text-2xl font-bold text-amber-700 tracking-widest mt-1">{generatedOtp}</p>
                      <p className="text-xs text-amber-500 mt-1">
                        {isBn ? 'অথবা 000000 দিন' : 'Or use 000000'}
                      </p>
                    </div>
                  )}
                </div>

                {/* OTP Input */}
                <div className="flex justify-center gap-2">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-12 h-14 text-center text-xl font-bold border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition"
                    />
                  ))}
                </div>

                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading || otp.join('').length !== 6}
                  className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {t.verify}
                      <i className="fas fa-check"></i>
                    </>
                  )}
                </button>

                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-sm text-slate-400">{countdown} {t.resendIn}</p>
                  ) : (
                    <button type="button" onClick={handleResendOtp} className="text-sm text-blue-600 font-medium hover:underline">
                      {t.resend}
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Register Step */}
            {step === 'register' && (
              <form onSubmit={handleRegister} className="space-y-6">
                <button type="button" onClick={() => setStep('otp')} className="text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1">
                  <i className="fas fa-arrow-left"></i> {t.back}
                </button>

                <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-900">{t.registerTitle}</h2>
                  <p className="text-slate-500 text-sm mt-1">{t.registerSubtitle}</p>
                  <div className="mt-3 space-y-1">
                    <p className="text-sm text-green-600 font-medium">{t.welcomeBonus}</p>
                    <p className="text-xs text-blue-600">{t.lifeAccount}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.nameLabel}</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t.namePlaceholder}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.genderLabel}</label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setGender('male')}
                        className={`flex-1 py-3 rounded-xl border-2 font-medium transition ${
                          gender === 'male' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        👨 {t.male}
                      </button>
                      <button
                        type="button"
                        onClick={() => setGender('female')}
                        className={`flex-1 py-3 rounded-xl border-2 font-medium transition ${
                          gender === 'female' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        👩 {t.female}
                      </button>
                    </div>
                  </div>

                  {/* DOB - Modern Easy Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {t.dobLabel}
                      <span className="text-xs text-slate-400 ml-2">({isBn ? 'আপনার জন্ম তারিখ নির্বাচন করুন' : 'Select your birth date'})</span>
                    </label>
                    
                    {/* Quick Decade Buttons */}
                    <div className="mb-3">
                      <p className="text-xs text-slate-500 mb-2">{isBn ? 'দ্রুত বছর নির্বাচন:' : 'Quick year select:'}</p>
                      <div className="flex flex-wrap gap-1">
                        {[2020, 2010, 2000, 1990, 1980, 1970, 1960, 1950].map(decade => (
                          <button
                            key={decade}
                            type="button"
                            onClick={() => setDobYear(String(decade))}
                            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${
                              parseInt(dobYear) >= decade && parseInt(dobYear) < decade + 10
                                ? 'bg-blue-500 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {decade}s
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {/* Year - Number Input with arrows */}
                      <div className="relative">
                        <input
                          type="number"
                          value={dobYear}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (val >= 1900 && val <= currentYear) setDobYear(e.target.value);
                          }}
                          min="1900"
                          max={currentYear}
                          className="w-full px-3 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition text-sm font-bold text-center"
                          placeholder={isBn ? 'বছর' : 'Year'}
                        />
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col">
                          <button type="button" onClick={() => setDobYear(String(Math.min(currentYear, parseInt(dobYear || '2000') + 1)))} className="text-slate-400 hover:text-blue-500 text-xs px-1">▲</button>
                          <button type="button" onClick={() => setDobYear(String(Math.max(1900, parseInt(dobYear || '2000') - 1)))} className="text-slate-400 hover:text-blue-500 text-xs px-1">▼</button>
                        </div>
                      </div>
                      
                      {/* Month Dropdown */}
                      <select
                        value={dobMonth}
                        onChange={(e) => setDobMonth(e.target.value)}
                        className="px-2 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition text-sm font-medium"
                      >
                        {monthOptions.map(month => (
                          <option key={month.value} value={month.value}>{month.label}</option>
                        ))}
                      </select>
                      
                      {/* Day Dropdown */}
                      <select
                        value={dobDay}
                        onChange={(e) => setDobDay(e.target.value)}
                        className="px-2 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition text-sm font-medium"
                      >
                        {dayOptions.map(day => (
                          <option key={day} value={day}>{parseInt(day)}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Show selected date with age */}
                    {dateOfBirth && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-xl text-center">
                        <p className="text-sm text-slate-600">
                          📅 {new Date(dateOfBirth).toLocaleDateString(isBn ? 'bn-BD' : 'en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                        <p className="text-xs text-blue-600 font-medium mt-1">
                          {isBn ? `বয়স: ${currentYear - parseInt(dobYear)} বছর` : `Age: ${currentYear - parseInt(dobYear)} years`}
                        </p>
                      </div>
                    )}
                    
                    {isKidAccount && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-700 flex items-center gap-1">
                          <span>👶</span>
                          {isBn ? 'শিশু অ্যাকাউন্ট - অভিভাবক তত্ত্বাবধানে' : 'Kid Account - Under parental supervision'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Blood Group */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.bloodLabel}</label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition"
                    >
                      <option value="">{isBn ? 'নির্বাচন করুন' : 'Select'}</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>

                  {/* Emergency Contact */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.emergencyLabel}</label>
                    <input
                      type="tel"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      placeholder={t.emergencyPlaceholder}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !name || !gender || !dateOfBirth}
                  className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {t.complete}
                      <i className="fas fa-check-circle"></i>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Success Step */}
            {step === 'success' && (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-green-500/30">
                  <i className="fas fa-check text-white text-3xl"></i>
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{t.successTitle}</h2>
                  <p className="text-slate-500 mt-1">{t.successSubtitle}</p>
                  {user && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700 font-medium">👤 {user.name}</p>
                      <p className="text-xs text-blue-600">📱 {user.phone}</p>
                      <p className="text-xs text-blue-600">🆔 {user.id}</p>
                    </div>
                  )}
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 font-medium">🎁 +100 {isBn ? 'ক্রেডিট বোনাস!' : 'Credits Bonus!'}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/patient-dashboard')}
                    className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all flex items-center justify-center gap-2"
                  >
                    {t.goToDashboard}
                    <i className="fas fa-arrow-right"></i>
                  </button>
                  
                  <button
                    onClick={() => navigate('/search')}
                    className="w-full py-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    {t.findDoctor}
                    <i className="fas fa-search"></i>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Doctor Registration Link */}
          {step === 'phone' && (
            <div className="mt-6 text-center">
              <p className="text-slate-500">
                {isBn ? 'ডাক্তার?' : 'Doctor?'}{' '}
                <button onClick={() => navigate('/doctor-registration')} className="text-blue-600 font-semibold hover:underline">
                  {isBn ? 'এখানে রেজিস্টার করুন' : 'Register here'}
                </button>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PatientAuth;
