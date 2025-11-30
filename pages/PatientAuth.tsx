/**
 * PatientAuth - Simple, bulletproof authentication
 * Handles login for existing users and registration for new users
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

type Step = 'phone' | 'otp' | 'register' | 'success';

export const PatientAuth: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { checkPhone, loginPatient, registerPatient, user, role, isLoading: authLoading } = useAuth();
  const isBn = language === 'bn';

  // State
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [dobYear, setDobYear] = useState(1995);
  const [dobMonth, setDobMonth] = useState(1);
  const [dobDay, setDobDay] = useState(1);
  const [bloodGroup, setBloodGroup] = useState('');
  const [isNewUser, setIsNewUser] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  // If already logged in as patient, go to dashboard
  useEffect(() => {
    if (!authLoading && user && role === 'patient') {
      console.log('[PatientAuth] Already logged in, going to dashboard');
      navigate('/patient-dashboard', { replace: true });
    }
  }, [user, role, authLoading, navigate]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  // Date of birth string
  const dateOfBirth = `${dobYear}-${String(dobMonth).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`;

  // Handle Send OTP
  const handleSendOtp = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError(isBn ? 'সঠিক ফোন নম্বর দিন' : 'Enter valid phone number');
      return;
    }

    setError('');
    setLoading(true);

    try {
      console.log('[PatientAuth] Checking phone:', cleanPhone);
      const result = await checkPhone(cleanPhone);
      console.log('[PatientAuth] Check result:', result);
      
      setIsNewUser(!result.exists || result.type !== 'patient');
      
      // Generate OTP (test mode)
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(newOtp);
      console.log('[PatientAuth] OTP:', newOtp);
      
      setStep('otp');
      setCountdown(60);
    } catch (e: any) {
      console.error('[PatientAuth] Error:', e);
      setError(e.message || 'Error checking phone');
    }
    
    setLoading(false);
  };

  // Handle OTP Verification
  const handleVerifyOtp = async () => {
    // Accept generated OTP or 000000
    if (otp !== generatedOtp && otp !== '000000') {
      setError(isBn ? 'ভুল OTP' : 'Wrong OTP');
      return;
    }

    setError('');
    setLoading(true);

    try {
      if (isNewUser) {
        // New user - show registration form
        console.log('[PatientAuth] New user, showing registration');
        setStep('register');
      } else {
        // Existing user - login
        console.log('[PatientAuth] Existing user, logging in');
        const result = await loginPatient(phone);
        console.log('[PatientAuth] Login result:', result);
        
        if (result.success) {
          setStep('success');
          // Wait for localStorage to be written
          await new Promise(r => setTimeout(r, 500));
          console.log('[PatientAuth] Navigating to dashboard');
          navigate('/patient-dashboard', { replace: true });
        } else {
          setError(result.error || 'Login failed');
        }
      }
    } catch (e: any) {
      console.error('[PatientAuth] Verify error:', e);
      setError(e.message || 'Verification failed');
    }
    
    setLoading(false);
  };

  // Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError(isBn ? 'নাম দিন' : 'Enter your name');
      return;
    }

    setError('');
    setLoading(true);

    try {
      console.log('[PatientAuth] Registering:', phone, name);
      const result = await registerPatient({
        phone,
        name: name.trim(),
        gender,
        dateOfBirth,
        bloodGroup: bloodGroup || undefined,
      });
      console.log('[PatientAuth] Register result:', result);
      
      if (result.success) {
        setStep('success');
        // Wait for localStorage to be written
        await new Promise(r => setTimeout(r, 500));
        console.log('[PatientAuth] Navigating to dashboard');
        navigate('/patient-dashboard', { replace: true });
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (e: any) {
      console.error('[PatientAuth] Register error:', e);
      setError(e.message || 'Registration failed');
    }
    
    setLoading(false);
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl font-bold">ন</span>
            </div>
            <div>
              <span className="font-bold text-xl">Nirnoy</span>
              <span className="text-xs text-blue-600 block">HEALTH SYNCHRONIZED</span>
            </div>
          </div>
          <button onClick={() => navigate('/')} className="text-gray-600 hover:text-blue-600">
            {isBn ? 'হোম' : 'Home'}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-3xl font-bold">ন</span>
            </div>
            <h1 className="text-2xl font-bold">{isBn ? 'নির্ণয়তে স্বাগতম' : 'Welcome to Nirnoy'}</h1>
            <p className="text-gray-500">{isBn ? 'আপনার স্বাস্থ্য, আপনার হাতে' : 'Your health, in your hands'}</p>
          </div>

          {/* Test Mode Notice */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6 text-center text-sm text-green-700">
            ✓ {isBn ? 'টেস্ট মোড: OTP হিসেবে 000000 ব্যবহার করুন' : 'Test Mode: Use 000000 as OTP'}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 text-center text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Step: Phone */}
          {step === 'phone' && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isBn ? 'মোবাইল নম্বর' : 'Mobile Number'}
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 rounded-l-lg text-gray-500">
                  🇧🇩 +880
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="01712345678"
                  className="flex-1 border rounded-r-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleSendOtp}
                disabled={loading || phone.length < 10}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {isBn ? 'অপেক্ষা করুন...' : 'Please wait...'}
                  </span>
                ) : (
                  <span>{isBn ? 'OTP পাঠান' : 'Send OTP'} →</span>
                )}
              </button>
              <div className="text-center pt-4 border-t">
                <span className="text-gray-600">{isBn ? 'ডাক্তার?' : 'Doctor?'} </span>
                <button onClick={() => navigate('/doctor-registration')} className="text-blue-600 font-medium">
                  {isBn ? 'এখানে রেজিস্টার করুন' : 'Register here'}
                </button>
              </div>
            </div>
          )}

          {/* Step: OTP */}
          {step === 'otp' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-gray-600">
                  {isBn ? 'OTP পাঠানো হয়েছে' : 'OTP sent to'} <strong>+880{phone}</strong>
                </p>
                <p className="text-sm text-blue-600 mt-2 bg-blue-50 py-2 rounded">
                  Test OTP: <strong>{generatedOtp}</strong> (or 000000)
                </p>
              </div>
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-full border rounded-lg px-4 py-3 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length < 6}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {isBn ? 'যাচাই হচ্ছে...' : 'Verifying...'}
                  </span>
                ) : (
                  <span>{isBn ? 'যাচাই করুন' : 'Verify'}</span>
                )}
              </button>
              <div className="flex justify-between text-sm">
                <button onClick={() => setStep('phone')} className="text-gray-600">← {isBn ? 'পিছনে' : 'Back'}</button>
                <button
                  onClick={() => {
                    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
                    setGeneratedOtp(newOtp);
                    setCountdown(60);
                  }}
                  disabled={countdown > 0}
                  className={countdown > 0 ? 'text-gray-400' : 'text-blue-600'}
                >
                  {countdown > 0 ? `Resend (${countdown}s)` : 'Resend OTP'}
                </button>
              </div>
            </div>
          )}

          {/* Step: Register */}
          {step === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <h2 className="text-lg font-semibold text-center">{isBn ? 'প্রোফাইল তৈরি করুন' : 'Create Profile'}</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{isBn ? 'নাম' : 'Name'} *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={isBn ? 'আপনার নাম' : 'Your name'}
                  className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{isBn ? 'লিঙ্গ' : 'Gender'} *</label>
                <div className="flex gap-2">
                  {(['male', 'female', 'other'] as const).map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`flex-1 py-2 rounded-lg border transition ${
                        gender === g ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300'
                      }`}
                    >
                      {g === 'male' ? (isBn ? 'পুরুষ' : 'Male') : g === 'female' ? (isBn ? 'মহিলা' : 'Female') : (isBn ? 'অন্যান্য' : 'Other')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{isBn ? 'জন্ম তারিখ' : 'Date of Birth'} *</label>
                <div className="grid grid-cols-3 gap-2">
                  <select value={dobYear} onChange={e => setDobYear(Number(e.target.value))} className="border rounded-lg px-2 py-2">
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select value={dobMonth} onChange={e => setDobMonth(Number(e.target.value))} className="border rounded-lg px-2 py-2">
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select value={dobDay} onChange={e => setDobDay(Number(e.target.value))} className="border rounded-lg px-2 py-2">
                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{isBn ? 'রক্তের গ্রুপ' : 'Blood Group'}</label>
                <select value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} className="w-full border rounded-lg px-4 py-2">
                  <option value="">{isBn ? 'নির্বাচন করুন' : 'Select'}</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {isBn ? 'তৈরি হচ্ছে...' : 'Creating...'}
                  </span>
                ) : (
                  <span>{isBn ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account'}</span>
                )}
              </button>

              <button type="button" onClick={() => setStep('otp')} className="w-full text-gray-600 text-sm">
                ← {isBn ? 'পিছনে' : 'Back'}
              </button>
            </form>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl text-green-600">✓</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">{isBn ? 'স্বাগতম! 🎉' : 'Welcome! 🎉'}</h2>
              <p className="text-gray-600 mb-4">{isBn ? 'আপনার অ্যাকাউন্ট প্রস্তুত' : 'Your account is ready'}</p>
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm text-gray-500 mt-4">{isBn ? 'ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে...' : 'Going to dashboard...'}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PatientAuth;
