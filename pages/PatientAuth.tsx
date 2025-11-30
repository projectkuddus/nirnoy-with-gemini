import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import LanguageToggle from '../components/LanguageToggle';

type AuthStep = 'phone' | 'otp' | 'register' | 'success';

// Test OTP bypass code
const TEST_OTP = '000000';

export const PatientAuth: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { checkPhone, loginPatient, registerPatient, user, isLoading: authLoading, isOnline } = useAuth();
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
  const [dobYear, setDobYear] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');
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
    login: isBn ? 'লগইন করুন' : 'Login',
    resend: isBn ? 'আবার পাঠান' : 'Resend',
    resendIn: isBn ? 'সেকেন্ড পর আবার পাঠাতে পারবেন' : 'seconds to resend',
    registerTitle: isBn ? 'প্রোফাইল তৈরি করুন' : 'Create Your Profile',
    registerSubtitle: isBn ? 'আপনার তথ্য দিন' : 'Fill in your details',
    nameLabel: isBn ? 'পুরো নাম *' : 'Full Name *',
    namePlaceholder: isBn ? 'আপনার নাম লিখুন' : 'Enter your name',
    genderLabel: isBn ? 'লিঙ্গ *' : 'Gender *',
    male: isBn ? 'পুরুষ' : 'Male',
    female: isBn ? 'মহিলা' : 'Female',
    dobLabel: isBn ? 'জন্ম তারিখ *' : 'Date of Birth *',
    bloodLabel: isBn ? 'রক্তের গ্রুপ' : 'Blood Group',
    emergencyLabel: isBn ? 'জরুরি যোগাযোগ' : 'Emergency Contact',
    emergencyPlaceholder: isBn ? 'পরিবারের কারো নম্বর' : 'Family member number',
    complete: isBn ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account',
    successTitle: isBn ? 'স্বাগতম! 🎉' : 'Welcome! 🎉',
    successSubtitle: isBn ? 'আপনার অ্যাকাউন্ট তৈরি হয়েছে' : 'Your account has been created',
    goToDashboard: isBn ? 'ড্যাশবোর্ডে যান' : 'Go to Dashboard',
    invalidPhone: isBn ? 'সঠিক মোবাইল নম্বর দিন' : 'Enter valid mobile number',
    invalidOtp: isBn ? 'সঠিক OTP দিন' : 'Enter valid OTP',
    back: isBn ? 'পিছনে' : 'Back',
    terms: isBn ? 'এগিয়ে গিয়ে আপনি আমাদের শর্তাবলী মেনে নিচ্ছেন' : 'By continuing, you agree to our Terms',
    welcomeBack: isBn ? 'স্বাগতম! আপনার অ্যাকাউন্ট পাওয়া গেছে।' : 'Welcome back! Your account was found.',
    newAccount: isBn ? 'নতুন অ্যাকাউন্ট তৈরি করতে OTP যাচাই করুন' : 'Verify OTP to create new account',
    testMode: isBn ? 'টেস্ট মোড: 000000 ব্যবহার করুন' : 'Test Mode: Use 000000 as OTP',
    yearLabel: isBn ? 'বছর' : 'Year',
    monthLabel: isBn ? 'মাস' : 'Month',
    dayLabel: isBn ? 'দিন' : 'Day',
    selectYear: isBn ? 'বছর' : 'Year',
    selectMonth: isBn ? 'মাস' : 'Month',
    selectDay: isBn ? 'দিন' : 'Day',
    offlineWarning: isBn ? 'আপনি অফলাইনে আছেন। ডেটা স্থানীয়ভাবে সংরক্ষিত হবে।' : 'You are offline. Data will be saved locally.',
    kidAccount: isBn ? '👶 এটি একটি শিশু অ্যাকাউন্ট (১২ বছরের কম)' : '👶 This is a kid account (under 12)',
  };

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/patient-dashboard');
    }
  }, [user, authLoading, navigate]);

  // Validate phone
  const isValidPhone = (p: string) => {
    const digits = p.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11;
  };

  // Handle phone submission
  const handlePhoneSubmit = async () => {
    console.log('[PatientAuth] handlePhoneSubmit called, phone:', phone);
    
    if (!isValidPhone(phone)) {
      setError(t.invalidPhone);
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      // Check if user exists
      const result = await checkPhone(phone);
      console.log('[PatientAuth] checkPhone result:', result);
      
      setIsNewUser(!result.exists);
      
      // Generate OTP for test mode
      const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(testOtp);
      
      setStep('otp');
      setCountdown(60);
    } catch (err: any) {
      console.error('[PatientAuth] Error:', err);
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

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Handle OTP verification
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpValue = otp.join('');
    
    if (otpValue.length !== 6) {
      setError(t.invalidOtp);
      return;
    }
    
    // Verify OTP (test mode: accept 000000 or generated OTP)
    if (otpValue !== TEST_OTP && otpValue !== generatedOtp) {
      setError(t.invalidOtp);
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      if (isNewUser) {
        // New user - go to registration
        setStep('register');
      } else {
        // Existing user - login directly
        const result = await loginPatient(phone);
        
        if (result.success) {
          setStep('success');
          setTimeout(() => navigate('/patient-dashboard'), 1500);
        } else {
          setError(result.error || 'Login failed');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
    
    setIsLoading(false);
  };

  // Handle registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !gender || !dateOfBirth) {
      setError(isBn ? 'সব প্রয়োজনীয় তথ্য দিন' : 'Please fill all required fields');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      const result = await registerPatient({
        phone,
        name,
        gender,
        dateOfBirth,
        bloodGroup: bloodGroup || undefined,
        emergencyContact: emergencyContact || undefined,
      });
      
      if (result.success) {
        setStep('success');
        setTimeout(() => navigate('/patient-dashboard'), 1500);
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
    
    setIsLoading(false);
  };

  // Resend OTP
  const handleResendOtp = () => {
    if (countdown > 0) return;
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(newOtp);
    setCountdown(60);
    setOtp(['', '', '', '', '', '']);
  };

  // Quick year selection
  const QuickYearButtons = () => (
    <div className="flex flex-wrap gap-1 mb-2">
      {[2020, 2010, 2000, 1990, 1980, 1970, 1960, 1950].map(year => (
        <button
          key={year}
          type="button"
          onClick={() => setDobYear(year.toString())}
          className={`px-2 py-1 text-xs rounded ${
            dobYear === year.toString()
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          {year}s
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
              ন
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Nirnoy</h1>
              <p className="text-xs text-blue-600">HEALTH SYNCHRONIZED</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-800"
            >
              {isBn ? 'হোম' : 'Home'}
            </button>
          </div>
        </div>
      </div>

      {/* Offline Warning */}
      {!isOnline && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-center">
          <span className="text-yellow-800 text-sm">⚠️ {t.offlineWarning}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Logo */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4">
                ন
              </div>
              <h2 className="text-2xl font-bold text-gray-800">{t.title}</h2>
              <p className="text-gray-500">{t.subtitle}</p>
            </div>

            {/* Phone Step */}
            {step === 'phone' && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-800">{t.phoneTitle}</h3>
                  <p className="text-sm text-gray-500">{t.phoneSubtitle}</p>
                </div>

                {/* Test Mode Notice */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <span className="text-green-700 text-sm">✓ {t.testMode}</span>
                </div>

                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-xl">🇧🇩</span>
                    <span className="text-gray-500">+880</span>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder={t.phonePlaceholder}
                    className="w-full pl-24 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                    maxLength={11}
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}

                <button
                  onClick={handlePhoneSubmit}
                  disabled={isLoading || !phone}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      {t.sendOtp} <span>→</span>
                    </>
                  )}
                </button>

                <p className="text-xs text-center text-gray-500">{t.terms}</p>

                <div className="text-center pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    {isBn ? 'ডাক্তার?' : 'Doctor?'}{' '}
                    <button
                      onClick={() => navigate('/doctor-registration')}
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      {isBn ? 'এখানে রেজিস্টার করুন' : 'Register here'}
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* OTP Step */}
            {step === 'otp' && (
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm"
                >
                  ← {t.back}
                </button>

                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-800">{t.otpTitle}</h3>
                  <p className="text-sm text-gray-500">{t.otpSubtitle}</p>
                  <p className="text-sm text-blue-600 mt-1">+880 {phone}</p>
                </div>

                {/* Show if existing user */}
                {!isNewUser && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <span className="text-green-700 text-sm">✓ {t.welcomeBack}</span>
                  </div>
                )}

                {/* Show if new user */}
                {isNewUser && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                    <span className="text-blue-700 text-sm">🆕 {t.newAccount}</span>
                  </div>
                )}

                {/* Test OTP Display */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                  <p className="text-yellow-800 text-sm">
                    <strong>Test OTP:</strong> {generatedOtp}
                  </p>
                  <p className="text-yellow-600 text-xs mt-1">{isBn ? 'অথবা 000000 ব্যবহার করুন' : 'Or use 000000'}</p>
                </div>

                {/* OTP Inputs */}
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
                      className="w-12 h-14 text-center text-xl font-bold border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ))}
                </div>

                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading || otp.join('').length !== 6}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    isNewUser ? t.verify : t.login
                  )}
                </button>

                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-sm text-gray-500">{countdown} {t.resendIn}</p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      {t.resend}
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Register Step */}
            {step === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <button
                  type="button"
                  onClick={() => setStep('otp')}
                  className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm"
                >
                  ← {t.back}
                </button>

                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-800">{t.registerTitle}</h3>
                  <p className="text-sm text-gray-500">{t.registerSubtitle}</p>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.nameLabel}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.namePlaceholder}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.genderLabel}</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setGender('male')}
                      className={`flex-1 py-3 rounded-xl border-2 transition-all ${
                        gender === 'male'
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      👨 {t.male}
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('female')}
                      className={`flex-1 py-3 rounded-xl border-2 transition-all ${
                        gender === 'female'
                          ? 'border-pink-600 bg-pink-50 text-pink-600'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      👩 {t.female}
                    </button>
                  </div>
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.dobLabel}</label>
                  <QuickYearButtons />
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={dobYear}
                      onChange={(e) => setDobYear(e.target.value)}
                      className="px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">{t.selectYear}</option>
                      {yearOptions.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    <select
                      value={dobMonth}
                      onChange={(e) => setDobMonth(e.target.value)}
                      className="px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">{t.selectMonth}</option>
                      {monthOptions.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    <select
                      value={dobDay}
                      onChange={(e) => setDobDay(e.target.value)}
                      className="px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">{t.selectDay}</option>
                      {dayOptions.map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                  {isKidAccount && (
                    <p className="text-sm text-orange-600 mt-1">{t.kidAccount}</p>
                  )}
                </div>

                {/* Blood Group */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.bloodLabel}</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{isBn ? 'নির্বাচন করুন' : 'Select'}</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                {/* Emergency Contact */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.emergencyLabel}</label>
                  <input
                    type="tel"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value.replace(/\D/g, ''))}
                    placeholder={t.emergencyPlaceholder}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxLength={11}
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-sm text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !name || !gender || !dateOfBirth}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    t.complete
                  )}
                </button>
              </form>
            )}

            {/* Success Step */}
            {step === 'success' && (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-4xl">✓</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">{t.successTitle}</h3>
                  <p className="text-gray-500">{t.successSubtitle}</p>
                </div>
                <button
                  onClick={() => navigate('/patient-dashboard')}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all"
                >
                  {t.goToDashboard}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientAuth;
