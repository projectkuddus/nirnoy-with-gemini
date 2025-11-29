import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageToggle from '../components/LanguageToggle';

type AuthStep = 'phone' | 'otp' | 'register' | 'success';

interface PatientAuthProps {
  onLogin?: (role: 'PATIENT') => void;
}

export const PatientAuth: React.FC<PatientAuthProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  // State
  const [step, setStep] = useState<AuthStep>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  
  // Registration fields
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // TEST MODE: Generated OTP for internal testing
  const [generatedOtp, setGeneratedOtp] = useState('');
  const TEST_BYPASS_CODE = '000000'; // Universal bypass for internal team

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
    registerSubtitle: isBn ? 'আপনার তথ্য দিন' : 'Fill in your details',
    nameLabel: isBn ? 'পুরো নাম *' : 'Full Name *',
    namePlaceholder: isBn ? 'আপনার নাম লিখুন' : 'Enter your name',
    genderLabel: isBn ? 'লিঙ্গ *' : 'Gender *',
    male: isBn ? 'পুরুষ' : 'Male',
    female: isBn ? 'মহিলা' : 'Female',
    dobLabel: isBn ? 'জন্ম তারিখ' : 'Date of Birth',
    bloodLabel: isBn ? 'রক্তের গ্রুপ' : 'Blood Group',
    emergencyLabel: isBn ? 'জরুরি যোগাযোগ নম্বর' : 'Emergency Contact',
    emergencyPlaceholder: isBn ? 'পরিবারের কারো নম্বর' : 'Family member number',
    complete: isBn ? 'সম্পন্ন করুন' : 'Complete Registration',
    successTitle: isBn ? 'স্বাগতম! 🎉' : 'Welcome! 🎉',
    successSubtitle: isBn ? 'আপনার অ্যাকাউন্ট তৈরি হয়েছে' : 'Your account has been created',
    goToDashboard: isBn ? 'ড্যাশবোর্ডে যান' : 'Go to Dashboard',
    findDoctor: isBn ? 'ডাক্তার খুঁজুন' : 'Find Doctor',
    invalidPhone: isBn ? 'সঠিক মোবাইল নম্বর দিন' : 'Enter valid mobile number',
    invalidOtp: isBn ? 'সঠিক OTP দিন' : 'Enter valid OTP',
    back: isBn ? 'পিছনে' : 'Back',
    or: isBn ? 'অথবা' : 'or',
    terms: isBn ? 'এগিয়ে গিয়ে আপনি আমাদের শর্তাবলী মেনে নিচ্ছেন' : 'By continuing, you agree to our Terms & Conditions',
  };

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Validate phone
  const isValidPhone = (p: string) => {
    const digits = p.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11;
  };

  // Handle phone submission
  const handlePhoneSubmit = async () => {
    if (!isValidPhone(phone)) {
      setError(t.invalidPhone);
      return;
    }
    setError('');
    setIsLoading(true);
    
    // Generate test OTP
    const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(testOtp);
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Check if user exists (for demo, new users have numbers ending in 0-4)
    const lastDigit = parseInt(phone.slice(-1));
    setIsNewUser(lastDigit >= 0 && lastDigit <= 4);
    setStep('otp');
    setCountdown(60);
    setIsLoading(false);
  };

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
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
    
    // Auto-focus next
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
  const handleOtpSubmit = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setError(t.invalidOtp);
      return;
    }
    setError('');
    setIsLoading(true);
    
    await new Promise(r => setTimeout(r, 1500));
    
    // Verify OTP: Accept generated OTP or bypass code (000000)
    if (otpValue !== generatedOtp && otpValue !== TEST_BYPASS_CODE) {
      setError(isBn ? 'ভুল OTP। আবার চেষ্টা করুন।' : 'Wrong OTP. Please try again.');
      setIsLoading(false);
      return;
    }
    
    if (isNewUser) {
      setStep('register');
    } else {
      // Existing user - save phone for now, name will be fetched from backend
      localStorage.setItem('nirnoy_user', JSON.stringify({ phone, name: 'ব্যবহারকারী' }));
      setStep('success');
    }
    setIsLoading(false);
  };

  // Handle registration
  const handleRegister = async () => {
    if (!name.trim() || !gender) {
      setError(isBn ? 'নাম ও লিঙ্গ আবশ্যক' : 'Name and gender required');
      return;
    }
    setError('');
    setIsLoading(true);
    
    await new Promise(r => setTimeout(r, 1500));
    
    // In real app: Save user to backend
    localStorage.setItem('nirnoy_user', JSON.stringify({ name, phone, gender }));
    setStep('success');
    setIsLoading(false);
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setCountdown(60);
    setOtp(['', '', '', '', '', '']);
    setIsLoading(false);
  };

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
          
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <button onClick={() => navigate('/')} className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition">
              {isBn ? 'হোম' : 'Home'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 pt-24">
        <div className="w-full max-w-md">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/30">
              <span className="text-white text-3xl font-black">ন</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">{t.title}</h1>
            <p className="text-slate-500">{t.subtitle}</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-100">
            
            {/* Step: Phone */}
            {step === 'phone' && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-800">{t.phoneTitle}</h2>
                  <p className="text-sm text-slate-500 mt-1">{t.phoneSubtitle}</p>
                </div>

                <div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">🇧🇩 +880</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 11)); setError(''); }}
                      placeholder={t.phonePlaceholder}
                      className="w-full pl-24 pr-4 py-4 border-2 border-slate-200 rounded-xl text-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition"
                      autoFocus
                    />
                  </div>
                  {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>

                <button
                  onClick={handlePhoneSubmit}
                  disabled={isLoading || !phone}
                  className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <><i className="fas fa-spinner fa-spin"></i> {isBn ? 'অপেক্ষা করুন...' : 'Please wait...'}</>
                  ) : (
                    <>{t.sendOtp} <i className="fas fa-arrow-right"></i></>
                  )}
                </button>

                <p className="text-xs text-center text-slate-400">{t.terms}</p>
              </div>
            )}

            {/* Step: OTP */}
            {step === 'otp' && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-800">{t.otpTitle}</h2>
                  <p className="text-sm text-slate-500 mt-1">{t.otpSubtitle}</p>
                  <p className="text-sm text-blue-600 font-medium mt-2">+880 {phone}</p>
                  
                  {/* TEST MODE: Show OTP for internal testing */}
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
                      className="w-12 h-14 text-center text-2xl font-bold border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition"
                      autoFocus={i === 0}
                      aria-label={`OTP digit ${i + 1}`}
                      title={`OTP digit ${i + 1}`}
                    />
                  ))}
                </div>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <button
                  onClick={handleOtpSubmit}
                  disabled={isLoading || otp.join('').length !== 6}
                  className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <><i className="fas fa-spinner fa-spin"></i> {isBn ? 'যাচাই করা হচ্ছে...' : 'Verifying...'}</>
                  ) : (
                    <>{t.verify} <i className="fas fa-check"></i></>
                  )}
                </button>

                {/* Resend */}
                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-sm text-slate-400">{countdown} {t.resendIn}</p>
                  ) : (
                    <button onClick={handleResendOtp} disabled={isLoading} className="text-sm text-blue-600 font-medium hover:underline">
                      {t.resend}
                    </button>
                  )}
                </div>

                <button onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); }} className="w-full text-center text-sm text-slate-500 hover:text-slate-700">
                  ← {isBn ? 'নম্বর পরিবর্তন করুন' : 'Change number'}
                </button>
              </div>
            )}

            {/* Step: Register */}
            {step === 'register' && (
              <div className="space-y-5">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-800">{t.registerTitle}</h2>
                  <p className="text-sm text-slate-500 mt-1">{t.registerSubtitle}</p>
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
                      {(['male', 'female'] as const).map((g) => (
                        <button
                          key={g}
                          onClick={() => setGender(g)}
                          className={`flex-1 py-3 rounded-xl border-2 font-medium transition ${
                            gender === g ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {g === 'male' ? '👨 ' : '👩 '}{g === 'male' ? t.male : t.female}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* DOB */}
                  <div>
                    <label htmlFor="dob" className="block text-sm font-medium text-slate-700 mb-1">{t.dobLabel}</label>
                    <input
                      id="dob"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition"
                      title="Date of Birth"
                    />
                  </div>

                  {/* Blood Group */}
                  <div>
                    <label htmlFor="bloodGroup" className="block text-sm font-medium text-slate-700 mb-1">{t.bloodLabel}</label>
                    <select
                      id="bloodGroup"
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none transition bg-white"
                      title="Blood Group"
                    >
                      <option value="">{isBn ? 'নির্বাচন করুন' : 'Select'}</option>
                      {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
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

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <button
                  onClick={handleRegister}
                  disabled={isLoading}
                  className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <><i className="fas fa-spinner fa-spin"></i> {isBn ? 'তৈরি হচ্ছে...' : 'Creating...'}</>
                  ) : (
                    <>{t.complete} <i className="fas fa-check"></i></>
                  )}
                </button>
              </div>
            )}

            {/* Step: Success */}
            {step === 'success' && (
              <div className="text-center space-y-6 py-4">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg animate-bounce">
                  <i className="fas fa-check text-white text-3xl"></i>
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">{t.successTitle}</h2>
                  <p className="text-slate-500 mt-1">{t.successSubtitle}</p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      if (onLogin) onLogin('PATIENT');
                      navigate('/patient-dashboard');
                    }}
                    className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-heartbeat"></i> {t.goToDashboard}
                  </button>
                  <button
                    onClick={() => {
                      if (onLogin) onLogin('PATIENT');
                      navigate('/search');
                    }}
                    className="w-full py-4 border-2 border-blue-500 text-blue-600 rounded-xl font-bold text-lg hover:bg-blue-50 transition flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-search"></i> {t.findDoctor}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Alternative Login */}
          {step === 'phone' && (
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                {isBn ? 'ডাক্তার?' : 'Are you a Doctor?'}{' '}
                <button onClick={() => navigate('/doctor-register')} className="text-blue-600 font-medium hover:underline">
                  {isBn ? 'এখানে রেজিস্টার করুন' : 'Register here'}
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientAuth;

