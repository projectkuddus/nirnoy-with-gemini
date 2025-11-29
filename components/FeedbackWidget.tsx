import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { UserRole } from '../types';

// ============ TYPES ============
type FeedbackType = 'bug' | 'feature' | 'general' | 'doctor' | 'complaint';
type FeedbackMood = 'happy' | 'neutral' | 'sad';

interface FeedbackData {
  id: string;
  type: FeedbackType;
  mood: FeedbackMood;
  message: string;
  email?: string;
  phone?: string;
  page: string;
  userAgent: string;
  timestamp: string;
  userId?: string;
  userRole?: string;
  userName?: string;
  status: 'new' | 'reviewed' | 'resolved';
}

// ============ FEEDBACK STORAGE - EXPORTED ============
const FEEDBACK_STORAGE_KEY = 'nirnoy_feedbacks';

export function getFeedbacks(): FeedbackData[] {
  const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveFeedback(feedback: FeedbackData): void {
  const feedbacks = getFeedbacks();
  feedbacks.unshift(feedback);
  localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(feedbacks.slice(0, 100)));
}

export function updateFeedbackStatus(id: string, status: FeedbackData['status']): void {
  const feedbacks = getFeedbacks();
  const index = feedbacks.findIndex(f => f.id === id);
  if (index !== -1) {
    feedbacks[index].status = status;
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(feedbacks));
  }
}

// ============ COMPONENT ============
export const FeedbackWidget: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [isExpanded, setIsExpanded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
  const [mood, setMood] = useState<FeedbackMood | null>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Hide on certain pages
  const hiddenPages = ['/admin', '/doctor-dashboard', '/patient-dashboard'];
  const shouldHide = hiddenPages.some(page => location.pathname.startsWith(page));

  // Check if user is logged in
  const userRole = localStorage.getItem('nirnoy_role') as UserRole | null;
  const userData = JSON.parse(localStorage.getItem('nirnoy_user') || '{}');
  const isLoggedIn = userRole && userRole !== UserRole.GUEST;

  // Auto-collapse after delay
  useEffect(() => {
    if (isExpanded && !isOpen) {
      const timer = setTimeout(() => setIsExpanded(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, isOpen]);

  const t = {
    title: isBn ? 'মতামত' : 'Feedback',
    subtitle: isBn ? 'আপনার মতামত দিন' : 'Share your thoughts',
    howFeeling: isBn ? 'আপনার অভিজ্ঞতা কেমন?' : 'How was your experience?',
    happy: isBn ? 'ভালো' : 'Great',
    neutral: isBn ? 'ঠিকঠাক' : 'Okay',
    sad: isBn ? 'খারাপ' : 'Poor',
    whatType: isBn ? 'কি ধরনের মতামত?' : 'Feedback type',
    bug: isBn ? 'সমস্যা' : 'Bug',
    feature: isBn ? 'ফিচার' : 'Feature',
    general: isBn ? 'সাধারণ' : 'General',
    doctor: isBn ? 'ডাক্তার' : 'Doctor',
    complaint: isBn ? 'অভিযোগ' : 'Complaint',
    tellMore: isBn ? 'বিস্তারিত' : 'Details',
    placeholder: isBn ? 'আপনার মতামত লিখুন...' : 'Write your feedback...',
    submit: isBn ? 'পাঠান' : 'Submit',
    submitting: isBn ? 'পাঠানো হচ্ছে...' : 'Sending...',
    thanks: isBn ? 'ধন্যবাদ!' : 'Thanks!',
    thanksMessage: isBn ? 'আপনার মতামত পেয়েছি' : 'We received your feedback',
    loginRequired: isBn ? 'লগইন করুন' : 'Login Required',
    loginMessage: isBn ? 'মতামত দিতে লগইন করুন' : 'Please login to submit feedback',
    loginBtn: isBn ? 'লগইন' : 'Login',
  };

  const feedbackTypes: { type: FeedbackType; label: string; emoji: string }[] = [
    { type: 'general', label: t.general, emoji: '💬' },
    { type: 'bug', label: t.bug, emoji: '🐛' },
    { type: 'feature', label: t.feature, emoji: '💡' },
    { type: 'doctor', label: t.doctor, emoji: '👨‍⚕️' },
    { type: 'complaint', label: t.complaint, emoji: '😤' },
  ];

  const handleOpen = () => {
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
    } else {
      setIsOpen(true);
      setIsExpanded(false);
    }
  };

  const handleSubmit = async () => {
    if (!message.trim() || !isLoggedIn) return;
    setIsSubmitting(true);

    const feedbackData: FeedbackData = {
      id: 'fb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      type: feedbackType,
      mood: mood || 'neutral',
      message: message.trim(),
      email: userData.email,
      phone: userData.phone,
      page: window.location.pathname,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      userId: userData.id || userData.phone,
      userRole: userRole || undefined,
      userName: userData.name,
      status: 'new',
    };

    try {
      saveFeedback(feedbackData);
      setSubmitted(true);
    } catch (error) {
      console.error('Failed to save feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setMood(null);
    setFeedbackType('general');
    setMessage('');
    setSubmitted(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setShowLoginPrompt(false);
    setTimeout(resetForm, 300);
  };

  if (shouldHide) return null;

  return (
    <>
      {/* Floating Button - Bottom Right */}
      <div className="fixed bottom-24 right-4 z-30 flex items-center">
        <div className={`transition-all duration-300 mr-2 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}>
          <button onClick={handleOpen} className="px-3 py-2 bg-slate-800/90 backdrop-blur-sm text-white text-sm rounded-lg shadow-lg hover:bg-slate-700 transition whitespace-nowrap">
            {t.subtitle}
          </button>
        </div>
        <button
          onClick={() => isExpanded ? handleOpen() : setIsExpanded(true)}
          onMouseEnter={() => setIsExpanded(true)}
          className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      </div>

      {/* Login Prompt */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={handleClose}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-5 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">{t.loginRequired}</h3>
            <p className="text-slate-500 text-sm mb-4">{t.loginMessage}</p>
            <div className="flex gap-2">
              <button onClick={handleClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 transition text-sm">
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
              <button onClick={() => { handleClose(); navigate('/login'); }} className="flex-1 py-2.5 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition text-sm">
                {t.loginBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {isOpen && isLoggedIn && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={handleClose}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {submitted ? (
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">{t.thanks}</h3>
                <p className="text-slate-500 text-sm mb-4">{t.thanksMessage}</p>
                <button onClick={handleClose} className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition text-sm">
                  {isBn ? 'বন্ধ করুন' : 'Close'}
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <span className="font-bold text-slate-800">{t.title}</span>
                  </div>
                  <button onClick={handleClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  {step === 1 ? (
                    <>
                      <div>
                        <p className="text-sm text-slate-500 mb-2">{t.howFeeling}</p>
                        <div className="flex gap-2">
                          {[
                            { m: 'happy' as FeedbackMood, emoji: '😊', label: t.happy },
                            { m: 'neutral' as FeedbackMood, emoji: '😐', label: t.neutral },
                            { m: 'sad' as FeedbackMood, emoji: '😞', label: t.sad },
                          ].map((item) => (
                            <button key={item.m} onClick={() => setMood(item.m)} className={`flex-1 py-3 rounded-xl border-2 transition text-center ${mood === item.m ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:border-slate-300'}`}>
                              <span className="text-2xl block mb-1">{item.emoji}</span>
                              <span className="text-xs text-slate-600">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 mb-2">{t.whatType}</p>
                        <div className="flex flex-wrap gap-2">
                          {feedbackTypes.map((item) => (
                            <button key={item.type} onClick={() => setFeedbackType(item.type)} className={`px-3 py-1.5 rounded-lg text-sm transition ${feedbackType === item.type ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                              {item.emoji} {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => setStep(2)} disabled={!mood} className="w-full py-2.5 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition disabled:opacity-50 text-sm">
                        {isBn ? 'পরবর্তী' : 'Next'}
                      </button>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <button onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <p className="text-sm text-slate-500">{t.tellMore}</p>
                        </div>
                        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t.placeholder} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-purple-500 outline-none transition resize-none text-sm" autoFocus />
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg text-xs text-slate-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>{userData.name || userData.phone || userRole}</span>
                      </div>
                      <button onClick={handleSubmit} disabled={!message.trim() || isSubmitting} className="w-full py-2.5 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition disabled:opacity-50 text-sm flex items-center justify-center gap-2">
                        {isSubmitting ? t.submitting : t.submit}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackWidget;
