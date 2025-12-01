import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

type Step = 'phone' | 'otp' | 'register' | 'success';

export const PatientAuth: React.FC<{ onLogin?: () => void }> = ({ onLogin }) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';
  
  const navigate = useNavigate();
  const location = useLocation();
  const otpInputRef = useRef<HTMLInputElement>(null);
  const { checkPhone, loginPatient, registerPatient, user, role, isLoading: authLoading } = useAuth();
  
  // Form state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<Step>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isNewUser, setIsNewUser] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  
  // Registration fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');

  // Check if we're on the auth page (not already redirecting)
  const isOnAuthPage = location.pathname === '/patient-auth' || location.pathname === '/register';

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Normalize phone number
  const normalizePhone = (p: string): string => {
    let n = p.replace(/[^0-9]/g, '');
    if (n.startsWith('880')) n = n.substring(3);
    if (n.startsWith('0')) n = n.substring(1);
    return n;
  };

  // Handle Phone Submit
  const handlePhoneSubmit = async () => {
    const cleanPhone = normalizePhone(phone);
    
    if (cleanPhone.length < 10) {
      setError(isBn ? 'সঠিক মোবাইল নম্বর দিন' : 'Enter valid mobile number');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await checkPhone(cleanPhone);
      const userExists = result.exists && result.type === 'patient';
      setIsNewUser(!userExists);
      
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(newOtp);
      
      setStep('otp');
      setCountdown(60);
      setTimeout(() => otpInputRef.current?.focus(), 100);
    } catch (e: any) {
      setError(e.message || 'Error checking phone');
    }
    
    setLoading(false);
  };

  // Handle OTP Verification
  const handleVerifyOtp = async () => {
    if (otp !== generatedOtp && otp !== '000000') {
      setError(isBn ? 'ভুল OTP' : 'Wrong OTP');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const cleanPhone = normalizePhone(phone);
      
      if (isNewUser) {
        setStep('register');
        setLoading(false);
        return;
      }
      
      const result = await loginPatient(cleanPhone);
      
      if (result.success) {
        setStep('success');
        // Use window.location for clean navigation (no React re-render loop)
        setTimeout(() => {
          window.location.href = '/patient-dashboard';
        }, 300);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (e: any) {
      setError(e.message || 'Verification failed');
    }
    
    setLoading(false);
  };

  // Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError(isBn ? 'নাম দিন' : 'Enter name');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const cleanPhone = normalizePhone(phone);
      
      const result = await registerPatient({
        phone: cleanPhone,
        name: name.trim(),
        email: email.trim() || undefined,
        gender: gender || undefined,
        bloodGroup: bloodGroup || undefined
      });
      
      if (result.success) {
        setStep('success');
        // Use window.location for clean navigation
        setTimeout(() => {
          window.location.href = '/patient-dashboard';
        }, 300);
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (e: any) {
      setError(e.message || 'Registration failed');
    }
    
    setLoading(false);
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{isBn ? 'লোড হচ্ছে...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  // If user is already logged in and we're on auth page, redirect using window.location
  if (user && (role === 'patient' || role === 'PATIENT') && isOnAuthPage && step !== 'success') {
    // Use window.location to avoid React Router loop
    window.location.href = '/patient-dashboard';
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{isBn ? 'ড্যাশবোর্ডে যাচ্ছে...' : 'Going to dashboard...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center gap-2 cursor-pointer justify-center mb-4" onClick={() => navigate('/')}>
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">ন</span>
            </div>
            <span className="font-bold text-2xl text-gray-800">নির্ণয়</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            {step === 'register' ? (isBn ? 'রেজিস্ট্রেশন' : 'Registration') : (isBn ? 'লগইন' : 'Login')}
          </h1>
          <button onClick={() => navigate('/')} className="text-gray-500 hover:text-blue-600 text-sm mt-2">
            ← {isBn ? 'হোমে ফিরুন' : 'Back to Home'}
          </button>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Step: Phone */}
          {step === 'phone' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isBn ? 'মোবাইল নম্বর' : 'Mobile Number'}
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-4 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg text-gray-600 font-medium">
                    +880
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="1XXXXXXXXX"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    maxLength={11}
                    autoFocus
                  />
                </div>
              </div>

              <button
                onClick={handlePhoneSubmit}
                disabled={loading || phone.replace(/\D/g, '').length < 10}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-lg disabled:bg-gray-300 hover:bg-blue-700 transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    {isBn ? 'অপেক্ষা করুন...' : 'Please wait...'}
                  </span>
                ) : (
                  isBn ? 'OTP পাঠান' : 'Send OTP'
                )}
              </button>

              <div className="text-center text-sm text-gray-500">
                <p>{isBn ? 'ডাক্তার?' : 'Are you a doctor?'}</p>
                <button onClick={() => navigate('/doctor-registration')} className="text-blue-600 font-medium hover:underline">
                  {isBn ? 'এখানে রেজিস্টার করুন' : 'Register here'}
                </button>
              </div>
            </div>
          )}

          {/* Step: OTP */}
          {step === 'otp' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isBn ? 'OTP কোড' : 'OTP Code'}
                </label>
                <input
                  ref={otpInputRef}
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                />
                <p className="text-xs text-blue-600 mt-2 text-center">
                  🔑 Test: {generatedOtp} (or 000000)
                </p>
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-lg disabled:bg-gray-300 hover:bg-blue-700 transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    {isBn ? 'যাচাই হচ্ছে...' : 'Verifying...'}
                  </span>
                ) : (
                  isBn ? 'যাচাই করুন' : 'Verify'
                )}
              </button>

              <div className="flex justify-between items-center text-sm">
                <button onClick={() => setStep('phone')} className="text-gray-600 hover:text-blue-600">
                  ← {isBn ? 'পিছনে' : 'Back'}
                </button>
                {countdown > 0 ? (
                  <span className="text-gray-500">{countdown}s</span>
                ) : (
                  <button onClick={handlePhoneSubmit} className="text-blue-600 font-medium hover:underline">
                    {isBn ? 'আবার পাঠান' : 'Resend'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step: Register */}
          {step === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isBn ? 'আপনার নাম *' : 'Your Name *'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isBn ? 'নাম লিখুন' : 'Enter your name'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isBn ? 'ইমেইল (ঐচ্ছিক)' : 'Email (optional)'}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isBn ? 'লিঙ্গ' : 'Gender'}
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{isBn ? 'বাছাই করুন' : 'Select'}</option>
                    <option value="male">{isBn ? 'পুরুষ' : 'Male'}</option>
                    <option value="female">{isBn ? 'মহিলা' : 'Female'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isBn ? 'রক্তের গ্রুপ' : 'Blood Group'}
                  </label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{isBn ? 'বাছাই করুন' : 'Select'}</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-lg disabled:bg-gray-300 hover:bg-blue-700 transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    {isBn ? 'রেজিস্টার হচ্ছে...' : 'Registering...'}
                  </span>
                ) : (
                  isBn ? 'রেজিস্টার করুন' : 'Register'
                )}
              </button>

              <button type="button" onClick={() => setStep('otp')} className="w-full text-gray-600 text-sm hover:text-blue-600">
                ← {isBn ? 'পিছনে' : 'Back'}
              </button>
            </form>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">✓</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {isBn ? 'সফল!' : 'Success!'}
              </h2>
              <p className="text-gray-600 mb-4">
                {isBn ? 'ড্যাশবোর্ডে যাচ্ছেন...' : 'Redirecting...'}
              </p>
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          {isBn ? 'লগইন করে আপনি আমাদের ' : 'By logging in, you agree to our '}
          <button onClick={() => navigate('/terms')} className="text-blue-600 hover:underline">
            {isBn ? 'শর্তাবলী' : 'Terms'}
          </button>
          {isBn ? ' মেনে নিচ্ছেন' : ''}
        </p>
      </div>
    </div>
  );
};

export default PatientAuth;
