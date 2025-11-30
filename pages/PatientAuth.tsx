import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import LanguageToggle from '../components/LanguageToggle';

type AuthStep = 'phone' | 'otp' | 'register' | 'success';

export const PatientAuth: React.FC = () => {
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
  const [dobYear, setDobYear] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  const today = new Date();
  const currentYear = today.getFullYear();
  const yearOptions = Array.from({ length: 120 }, (_, i) => currentYear - i);
  
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
  
  const getDaysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
  const maxDays = dobYear && dobMonth ? getDaysInMonth(parseInt(dobYear), parseInt(dobMonth)) : 31;
  const dayOptions = Array.from({ length: maxDays }, (_, i) => String(i + 1).padStart(2, '0'));
  const dateOfBirth = dobYear && dobMonth && dobDay ? `${dobYear}-${dobMonth}-${dobDay}` : '';
  const isKidAccount = dobYear ? (currentYear - parseInt(dobYear)) < 12 : false;

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

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
    terms: isBn ? 'এগিয়ে গিয়ে আপনি আমাদের শর্তাবলী মেনে নিচ্ছেন' : 'By continuing, you agree to our Terms',
  };

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  useEffect(() => {
    if (!authLoading && user && user.role === 'PATIENT') {
      navigate('/patient-dashboard');
    }
  }, [user, authLoading, navigate]);

  // MAIN FIX: Direct click handler, no form submit
  const handleSendOTP = async () => {
    console.log('[PatientAuth] handleSendOTP clicked, phone:', phone);
    
    if (phone.length < 10) {
      setError(t.invalidPhone);
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      const result = await sendOTP(phone);
      console.log('[PatientAuth] sendOTP result:', result);
      
      if (result.success) {
        setGeneratedOtp(result.otp || '');
        setStep('otp');
        setCountdown(60);
      } else {
        setError(result.error || 'Failed to send OTP');
      }
    } catch (err: any) {
      console.error('[PatientAuth] Error:', err);
      setError(err.message || 'An error occurred');
    }
    
    setIsLoading(false);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6);
      const newOtp = [...otp];
      digits.split('').forEach((d, i) => { if (i < 6) newOtp[i] = d; });
      setOtp(newOtp);
      if (digits.length === 6) otpRefs.current[5]?.focus();
      return;
    }
    const newOtp = [...otp];
    newOtp[index] = value.replace(/\D/g, '');
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleVerifyOTP = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) { setError(t.invalidOtp); return; }
    
    setError('');
    setIsLoading(true);
    
    try {
      const result = await verifyOTP(phone, otpValue);
      if (result.success) {
        setIsNewUser(result.isNewUser);
        if (result.isNewUser) {
          setStep('register');
        } else {
          setStep('success');
          setTimeout(() => navigate('/patient-dashboard'), 1500);
        }
      } else {
        setError(result.error || 'OTP verification failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
    setIsLoading(false);
  };

  const handleRegister = async () => {
    if (!name || !gender || !dateOfBirth) {
      setError(isBn ? 'সব প্রয়োজনীয় তথ্য দিন' : 'Please fill all required fields');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      const result = await registerPatient({
        phone, name, gender, dateOfBirth,
        bloodGroup: bloodGroup || undefined,
        emergencyContact: emergencyContact || undefined,
        isKidAccount,
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

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setIsLoading(true);
    try {
      const result = await sendOTP(phone);
      if (result.success) {
        setGeneratedOtp(result.otp || '');
        setCountdown(60);
        setError('');
      } else {
        setError(result.error || 'Failed to resend');
      }
    } catch (err: any) {
      setError(err.message || 'Error');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">ন</div>
            <div>
              <span className="font-bold text-slate-900">Nirnoy</span>
              <span className="text-xs text-blue-500 block">HEALTH SYNCHRONIZED</span>
            </div>
          </button>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <button onClick={() => navigate('/')} className="text-slate-600 hover:text-slate-900 text-sm font-medium">
              {isBn ? 'হোম' : 'Home'}
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex items-center justify-center min-h-[calc(100vh-64px)] p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-500 rounded-2xl flex items-center justify-center text-white font-bold text-4xl mx-auto mb-4 shadow-lg shadow-blue-500/30">ন</div>
            <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
            <p className="text-slate-500">{t.subtitle}</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
            
            {/* PHONE STEP */}
            {step === 'phone' && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-900">{t.phoneTitle}</h2>
                  <p className="text-slate-500 text-sm mt-1">{t.phoneSubtitle}</p>
                </div>

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

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                {/* Test Mode */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                  <p className="text-yellow-800 text-sm font-medium">
                    🧪 {isBn ? 'টেস্ট মোড: OTP হিসেবে 000000 ব্যবহার করুন' : 'Test Mode: Use 000000 as OTP'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={isLoading || phone.length < 10}
                  className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>{t.sendOtp} →</>
                  )}
                </button>

                <p className="text-xs text-slate-400 text-center">{t.terms}</p>
              </div>
            )}

            {/* OTP STEP */}
            {step === 'otp' && (
              <div className="space-y-6">
                <button type="button" onClick={() => setStep('phone')} className="text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1">
                  ← {t.back}
                </button>

                <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-900">{t.otpTitle}</h2>
                  <p className="text-slate-500 text-sm mt-1">{t.otpSubtitle}</p>
                  <p className="text-blue-500 text-sm mt-2 font-medium">+880 {phone}</p>
                </div>

                {generatedOtp && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                    <p className="text-yellow-800 text-sm">
                      🔐 {isBn ? 'টেস্ট OTP:' : 'Test OTP:'} <span className="font-bold text-lg">{generatedOtp}</span>
                    </p>
                    <p className="text-yellow-600 text-xs mt-1">{isBn ? 'অথবা 000000 ব্যবহার করুন' : 'Or use 000000'}</p>
                  </div>
                )}

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
                      className="w-12 h-14 text-center text-xl font-bold bg-slate-100 rounded-lg border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none"
                    />
                  ))}
                </div>

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <button
                  type="button"
                  onClick={handleVerifyOTP}
                  disabled={isLoading || otp.join('').length !== 6}
                  className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>{t.verify} ✓</>}
                </button>

                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-slate-400 text-sm">{countdown} {t.resendIn}</p>
                  ) : (
                    <button type="button" onClick={handleResendOtp} className="text-blue-500 hover:text-blue-600 text-sm font-medium">{t.resend}</button>
                  )}
                </div>
              </div>
            )}

            {/* REGISTER STEP */}
            {step === 'register' && (
              <div className="space-y-6">
                <button type="button" onClick={() => setStep('otp')} className="text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1">
                  ← {t.back}
                </button>

                <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-900">{t.registerTitle}</h2>
                  <p className="text-slate-500 text-sm mt-1">{t.registerSubtitle}</p>
                  {isKidAccount && (
                    <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                      👶 {isBn ? 'শিশু অ্যাকাউন্ট' : 'Kid Account'}
                    </div>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t.nameLabel}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.namePlaceholder}
                    className="w-full px-4 py-3 bg-slate-100 rounded-xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t.genderLabel}</label>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setGender('male')}
                      className={`flex-1 py-3 rounded-xl border-2 font-medium transition-all ${gender === 'male' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-600'}`}>
                      👨 {t.male}
                    </button>
                    <button type="button" onClick={() => setGender('female')}
                      className={`flex-1 py-3 rounded-xl border-2 font-medium transition-all ${gender === 'female' ? 'border-pink-500 bg-pink-50 text-pink-600' : 'border-slate-200 text-slate-600'}`}>
                      👩 {t.female}
                    </button>
                  </div>
                </div>

                {/* DOB */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t.dobLabel}</label>
                  <div className="grid grid-cols-3 gap-2">
                    <select value={dobYear} onChange={(e) => setDobYear(e.target.value)} className="px-3 py-3 bg-slate-100 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none text-sm">
                      <option value="">{isBn ? 'বছর' : 'Year'}</option>
                      {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select value={dobMonth} onChange={(e) => setDobMonth(e.target.value)} className="px-3 py-3 bg-slate-100 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none text-sm">
                      <option value="">{isBn ? 'মাস' : 'Month'}</option>
                      {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <select value={dobDay} onChange={(e) => setDobDay(e.target.value)} className="px-3 py-3 bg-slate-100 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none text-sm">
                      <option value="">{isBn ? 'দিন' : 'Day'}</option>
                      {dayOptions.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                {/* Blood Group */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t.bloodLabel}</label>
                  <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} className="w-full px-4 py-3 bg-slate-100 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none">
                    <option value="">{isBn ? 'নির্বাচন করুন' : 'Select'}</option>
                    <option value="A+">A+</option><option value="A-">A-</option>
                    <option value="B+">B+</option><option value="B-">B-</option>
                    <option value="O+">O+</option><option value="O-">O-</option>
                    <option value="AB+">AB+</option><option value="AB-">AB-</option>
                  </select>
                </div>

                {/* Emergency */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t.emergencyLabel}</label>
                  <input
                    type="tel"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder={t.emergencyPlaceholder}
                    className="w-full px-4 py-3 bg-slate-100 rounded-xl border-2 border-transparent focus:border-blue-500 outline-none"
                  />
                </div>

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={isLoading || !name || !gender || !dateOfBirth}
                  className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>{t.complete} ✓</>}
                </button>
              </div>
            )}

            {/* SUCCESS STEP */}
            {step === 'success' && (
              <div className="text-center space-y-6 py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-3xl">✓</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{t.successTitle}</h2>
                  <p className="text-slate-500 mt-2">{t.successSubtitle}</p>
                </div>
                <button onClick={() => navigate('/patient-dashboard')}
                  className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all">
                  {t.goToDashboard} →
                </button>
              </div>
            )}
          </div>

          {/* Doctor Link */}
          {step === 'phone' && (
            <div className="mt-6 text-center">
              <p className="text-slate-500">
                {isBn ? 'ডাক্তার?' : 'Doctor?'}{' '}
                <button onClick={() => navigate('/doctor-registration')} className="text-blue-500 hover:text-blue-600 font-medium underline">
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
