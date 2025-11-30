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
  const [successMessage, setSuccessMessage] = useState('');
  
  // Registration fields
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Calculate date limits for DOB
  const today = new Date();
  const maxDate = today.toISOString().split('T')[0];
  const minDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate()).toISOString().split('T')[0];
  
  const isKidAccount = dateOfBirth ? (today.getFullYear() - new Date(dateOfBirth).getFullYear()) < 12 : false;

  // TEST MODE: Generated OTP for internal testing
  const [generatedOtp, setGeneratedOtp] = useState('');
  const TEST_BYPASS_CODE = '000000';

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user && user.role === 'PATIENT') {
      console.log('Already logged in, redirecting to dashboard');
      navigate('/patient-dashboard');
    }
  }, [user, authLoading, navigate]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">{isBn ? 'লোড হচ্ছে...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  const t = {
    title: isBn ? 'নির্ণয়তে স্বাগতম' : 'Welcome to Nirnoy',
    subtitle: isBn ? 'আপনার স্বাস্থ্য, আপনার হাতে' : 'Your health, in your hands',
    phoneTitle: isBn ? 'লগইন / রেজিস্টার' : 'Login / Register',
    phoneSubtitle: isBn ? 'মোবাইল নম্বর দিয়ে লগইন করুন অথবা নতুন অ্যাকাউন্ট খুলুন' : 'Login with mobile or create new account',
    phonePlaceholder: isBn ? '০১৭XXXXXXXX' : '01712345678',
    sendOtp: isBn ? 'OTP পাঠান' : 'Send OTP',
    otpTitle: isBn ? 'OTP যাচাই করুন' : 'Verify OTP',
    otpSubtitle: isBn ? '৬ সংখ্যার কোড দিন (টেস্ট মোড: 000000)' : 'Enter 6-digit code (Test mode: 000000)',
    verify: isBn ? 'যাচাই করুন' : 'Verify',
    resend: isBn ? 'আবার পাঠান' : 'Resend',
    resendIn: isBn ? 'সেকেন্ড পর আবার পাঠাতে পারবেন' : 'seconds to resend',
    registerTitle: isBn ? 'নতুন অ্যাকাউন্ট' : 'New Account',
    registerSubtitle: isBn ? 'এই নম্বরে কোনো অ্যাকাউন্ট নেই। প্রোফাইল তৈরি করুন।' : 'No account found. Create your profile.',
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
    successSubtitle: isBn ? 'সফলভাবে লগইন হয়েছে' : 'Successfully logged in',
    newAccountSuccess: isBn ? 'আপনার অ্যাকাউন্ট তৈরি হয়েছে' : 'Your account has been created',
    goToDashboard: isBn ? 'ড্যাশবোর্ডে যান' : 'Go to Dashboard',
    findDoctor: isBn ? 'ডাক্তার খুঁজুন' : 'Find Doctor',
    invalidPhone: isBn ? 'সঠিক মোবাইল নম্বর দিন' : 'Enter valid mobile number',
    invalidOtp: isBn ? 'সঠিক OTP দিন' : 'Enter valid OTP',
    back: isBn ? 'পিছনে' : 'Back',
    or: isBn ? 'অথবা' : 'or',
    terms: isBn ? 'এগিয়ে গিয়ে আপনি আমাদের শর্তাবলী মেনে নিচ্ছেন' : 'By continuing, you agree to our Terms & Conditions',
    existingUser: isBn ? 'স্বাগতম! আপনার অ্যাকাউন্ট পাওয়া গেছে।' : 'Welcome back! Account found.',
  };

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const isValidPhone = (p: string) => {
    const digits = p.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11;
  };

  const handlePhoneSubmit = async () => {
    if (!isValidPhone(phone)) {
      setError(t.invalidPhone);
      return;
    }
    setError('');
    setIsLoading(true);
    
    const result = await sendOTP(phone);
    
    if (result.success) {
      setGeneratedOtp(result.otp || '');
      setStep('otp');
      setCountdown(60);
    } else {
      setError(result.error || 'Failed to send OTP');
    }
    
    setIsLoading(false);
  };

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

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpSubmit = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setError(t.invalidOtp);
      return;
    }
    setError('');
    setIsLoading(true);
    
    const result = await verifyOTP(phone, otpValue);
    
    if (result.success) {
      if (result.isNewUser) {
        // New user - show registration
        setIsNewUser(true);
        setStep('register');
      } else {
        // Existing user - logged in successfully
        setSuccessMessage(t.existingUser);
        if (onLogin) onLogin('PATIENT');
        setStep('success');
      }
    } else {
      setError(result.error || 'Invalid OTP');
    }
    
    setIsLoading(false);
  };

  const handleRegister = async () => {
    if (!name.trim() || !gender || !dateOfBirth) {
      setError(isBn ? 'নাম, লিঙ্গ ও জন্ম তারিখ আবশ্যক' : 'Name, gender and date of birth required');
      return;
    }
    setError('');
    setIsLoading(true);
    
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
      isKidAccount,
    });
    
    if (result.success) {
      setSuccessMessage(t.newAccountSuccess);
      if (onLogin) onLogin('PATIENT');
      setStep('success');
    } else {
      setError(result.error || 'Registration failed');
    }
    
    setIsLoading(false);
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setIsLoading(true);
    const result = await sendOTP(phone);
    if (result.success) {
      setGeneratedOtp(result.otp || '');
    }
    setCountdown(60);
    setOtp(['', '', '', '', '', '']);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white font-bold text-lg">ন</div>
            <span className="font-bold text-xl text-slate-800">নির্ণয়</span>
          </button>
          <LanguageToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center pt-16 pb-8 px-4">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-6 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl">
                {step === 'success' ? '✅' : step === 'register' ? '📝' : '🔐'}
              </div>
              <h1 className="text-2xl font-bold">
                {step === 'phone' && t.phoneTitle}
                {step === 'otp' && t.otpTitle}
                {step === 'register' && t.registerTitle}
                {step === 'success' && t.successTitle}
              </h1>
              <p className="text-white/80 mt-1 text-sm">
                {step === 'phone' && t.phoneSubtitle}
                {step === 'otp' && t.otpSubtitle}
                {step === 'register' && t.registerSubtitle}
                {step === 'success' && (successMessage || t.successSubtitle)}
              </p>
            </div>

            {/* Body */}
            <div className="p-6">
              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm text-center">
                  {error}
                </div>
              )}

              {/* Phone Step */}
              {step === 'phone' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-600 mb-2 block">{isBn ? 'মোবাইল নম্বর' : 'Mobile Number'}</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🇧🇩 +88</span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handlePhoneSubmit()}
                        placeholder={t.phonePlaceholder}
                        className="w-full pl-20 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-lg"
                        autoFocus
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={handlePhoneSubmit}
                    disabled={isLoading || !phone}
                    className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-bold text-lg disabled:opacity-50 hover:shadow-lg transition"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {isBn ? 'অপেক্ষা করুন...' : 'Please wait...'}
                      </span>
                    ) : t.sendOtp}
                  </button>
                  
                  <p className="text-xs text-slate-400 text-center">{t.terms}</p>
                </div>
              )}

              {/* OTP Step */}
              {step === 'otp' && (
                <div className="space-y-4">
                  {/* Test Mode OTP Display */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                    <p className="text-xs text-amber-600 mb-1">🧪 টেস্ট মোড</p>
                    <p className="font-mono text-lg font-bold text-amber-800">{generatedOtp || TEST_BYPASS_CODE}</p>
                    <p className="text-xs text-amber-600 mt-1">{isBn ? 'অথবা 000000 দিন' : 'Or use 000000'}</p>
                  </div>
                  
                  <div className="flex justify-center gap-2">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-12 h-14 text-center text-xl font-bold border-2 border-slate-200 rounded-xl focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                      />
                    ))}
                  </div>
                  
                  <button
                    onClick={handleOtpSubmit}
                    disabled={isLoading || otp.join('').length !== 6}
                    className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-bold text-lg disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {isBn ? 'যাচাই হচ্ছে...' : 'Verifying...'}
                      </span>
                    ) : t.verify}
                  </button>
                  
                  <div className="flex items-center justify-between text-sm">
                    <button onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); }} className="text-slate-500 hover:text-slate-700">
                      ← {t.back}
                    </button>
                    <button
                      onClick={handleResendOtp}
                      disabled={countdown > 0}
                      className={countdown > 0 ? 'text-slate-400' : 'text-teal-600 hover:text-teal-700'}
                    >
                      {countdown > 0 ? `${countdown}s` : t.resend}
                    </button>
                  </div>
                </div>
              )}

              {/* Register Step */}
              {step === 'register' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-600 mb-1 block">{t.nameLabel}</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t.namePlaceholder}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                      autoFocus
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-slate-600 mb-1 block">{t.genderLabel}</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                      >
                        <option value="">{isBn ? 'নির্বাচন' : 'Select'}</option>
                        <option value="male">{t.male}</option>
                        <option value="female">{t.female}</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-slate-600 mb-1 block">{t.dobLabel}</label>
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        max={maxDate}
                        min={minDate}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>
                  </div>
                  
                  {isKidAccount && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700">
                      👶 {isBn ? 'এটি একটি শিশু অ্যাকাউন্ট হিসেবে চিহ্নিত হবে' : 'This will be marked as a kid account'}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-slate-600 mb-1 block">{t.bloodLabel}</label>
                      <select
                        value={bloodGroup}
                        onChange={(e) => setBloodGroup(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                      >
                        <option value="">{isBn ? 'নির্বাচন' : 'Select'}</option>
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-slate-600 mb-1 block">{t.emergencyLabel}</label>
                      <input
                        type="tel"
                        value={emergencyContact}
                        onChange={(e) => setEmergencyContact(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={handleRegister}
                    disabled={isLoading || !name || !gender || !dateOfBirth}
                    className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-bold text-lg disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {isBn ? 'তৈরি হচ্ছে...' : 'Creating...'}
                      </span>
                    ) : t.complete}
                  </button>
                  
                  <button onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); }} className="w-full text-sm text-slate-500 hover:text-slate-700">
                    ← {isBn ? 'অন্য নম্বর দিন' : 'Use different number'}
                  </button>
                </div>
              )}

              {/* Success Step */}
              {step === 'success' && (
                <div className="space-y-4 text-center">
                  <div className="text-5xl mb-4">🎉</div>
                  <p className="text-slate-600">{successMessage || t.successSubtitle}</p>
                  
                  <div className="space-y-3 pt-4">
                    <button
                      onClick={() => navigate('/patient-dashboard')}
                      className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-bold"
                    >
                      {t.goToDashboard}
                    </button>
                    <button
                      onClick={() => navigate('/search')}
                      className="w-full py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50"
                    >
                      {t.findDoctor}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Help Text */}
          <p className="text-center text-sm text-slate-500 mt-6">
            {isBn ? 'সমস্যা হচ্ছে? ' : 'Having trouble? '}
            <button onClick={() => navigate('/help')} className="text-teal-600 hover:underline">
              {isBn ? 'সাহায্য নিন' : 'Get help'}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
};

export default PatientAuth;
